/**
 * THE AFFILIATE PROGRAMME (spec section E).
 *
 * Money, not THC. Every amount is INR minor units (paise). This is a separate
 * system from growth/referrals.ts, which pays THC when an invited member
 * finishes a lesson; nothing here touches the THC ledger.
 *
 * The rules, stated once:
 *   · a commission exists only because a real order was PAID with a fiat value
 *   · signups, clicks and recruiting other affiliates pay nothing
 *   · nobody earns on their own purchase
 *   · every commission waits out the refund window (holdUntil), then a person
 *     approves it; a refund reverses it
 *   · a payout is requested by the member, approved and paid by a person, and
 *     every one of those steps is in the audit log
 *
 * The shop calls onOrderPaid/onOrderRefunded (the EarnHooks contract). Those
 * two never throw: attribution failing must never break a checkout.
 */
import { createHash, getRandomValues } from "node:crypto";
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { AffiliateStatus, CommissionStatus, OrderStatus, PayoutStatus, PrismaClient, RefundStatus } from "@tycoonhood/db";
import { AFFILIATE_HOLD_DAYS, AFFILIATE_RATE_BPS, MIN_PAYOUT_CENTS } from "@tycoonhood/config";
import { promoteTo } from "../auth/permissions";
import { AuditService } from "../platform/audit";
import { notify } from "../platform/notify";
import type { EarnHooks } from "./hooks";

// ───────────────────────────────────────────────────────── errors

export class EarnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EarnError";
  }
}
export class EmailNotVerifiedError extends EarnError {
  constructor() {
    super("Verify your email address before applying.");
    this.name = "EmailNotVerifiedError";
  }
}
export class AlreadyAffiliateError extends EarnError {
  constructor(message = "You have already applied.") {
    super(message);
    this.name = "AlreadyAffiliateError";
  }
}
export class AffiliateNotFoundError extends EarnError {
  constructor(message = "No affiliate profile found.") {
    super(message);
    this.name = "AffiliateNotFoundError";
  }
}
export class InvalidStateError extends EarnError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStateError";
  }
}
export class HoldPeriodError extends EarnError {
  constructor(public readonly holdUntil: Date) {
    super(`This commission is in its refund window until ${holdUntil.toISOString().slice(0, 10)}.`);
    this.name = "HoldPeriodError";
  }
}
export class PayoutError extends EarnError {
  constructor(message: string) {
    super(message);
    this.name = "PayoutError";
  }
}

// ───────────────────────────────────────────────────────── types

export type PayoutMethodInput =
  | { type: "UPI"; upiId: string }
  | { type: "BANK"; accountName: string; accountNumber: string; ifsc: string; bankName?: string };

export type StoredPayoutMethod = PayoutMethodInput & {
  /** SHA-256 of the normalised destination, used only to spot two affiliates paying out to one account. */
  fingerprint: string;
};

export type RegisterInput = {
  channels: string;
  payoutMethod: PayoutMethodInput;
  acceptTerms: boolean;
};

export type ClickInput = {
  ip: string | null | undefined;
  userAgent: string | null | undefined;
  landingPath: string;
  referrer?: string | null;
};

const OPEN_PAYOUT: PayoutStatus[] = ["REQUESTED", "APPROVED"];
/** Refund requests still waiting for a decision. */
const OPEN_REFUND: RefundStatus[] = ["REQUESTED", "APPROVED"];
/** A refund request on the order is waiting for a decision. */
const REFUND_OPEN: Prisma.OrderWhereInput = { refundRequests: { some: { status: { in: OPEN_REFUND } } } };
/** An approved commission may go into a payout only while its order still stands. */
const ORDER_STANDS: Prisma.OrderWhereInput = {
  status: { in: ["PAID", "FULFILLED"] },
  refundRequests: { none: { status: { in: OPEN_REFUND } } },
};
const DAY_MS = 86_400_000;
const NEW_ACCOUNT_MS = 10 * 60_000;
const href = "/earnings";

// ───────────────────────────────────────────────────────── helpers

/** Unambiguous alphabet: no O/0, no I/1/L. Codes get read aloud and retyped. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 7;
export const AFFILIATE_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6,8}$/;

function mintCode(len = CODE_LEN): string {
  const bytes = new Uint8Array(len);
  getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * The salt for visitor hashes. Set AFFILIATE_HASH_SECRET in production. If it
 * is missing we derive one from DATABASE_URL, which is secret and stable per
 * deployment, rather than fall back to a constant anyone can read in the repo.
 */
function hashSecret(): string {
  return process.env.AFFILIATE_HASH_SECRET || sha256(`affiliate-visitor|${process.env.DATABASE_URL ?? ""}`);
}

/**
 * The IP is reduced to the same 32-char SHA-256 prefix that sessions store
 * (auth/session.ts), so a click and a signed-in session can be compared
 * without either table ever holding a raw IP.
 */
export function ipKey(ip: string | null | undefined): string {
  return ip ? sha256(ip).slice(0, 32) : "";
}

function dayOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** sha256(ip + ua + YYYY-MM-DD + secret). Never the raw IP. */
export function visitorHash(ipHash: string, userAgent: string | null | undefined, day: Date): string {
  return sha256(`${ipHash}|${(userAgent ?? "").slice(0, 400)}|${dayOf(day)}|${hashSecret()}`);
}

function clean(s: string | null | undefined, max: number): string {
  return (s ?? "").trim().slice(0, max);
}

function normalisePayoutMethod(m: PayoutMethodInput): StoredPayoutMethod {
  if (!m || (m.type !== "UPI" && m.type !== "BANK")) throw new EarnError("Choose UPI or bank transfer for payouts.");
  if (m.type === "UPI") {
    const upiId = clean(m.upiId, 256).toLowerCase();
    if (!/^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,63}$/.test(upiId)) throw new EarnError("Enter a valid UPI ID, like name@bank.");
    return { type: "UPI", upiId, fingerprint: sha256(`UPI|${upiId}`) };
  }
  const accountName = clean(m.accountName, 120);
  const accountNumber = clean(m.accountNumber, 40).replace(/\s+/g, "");
  const ifsc = clean(m.ifsc, 20).toUpperCase();
  const bankName = clean(m.bankName, 120) || undefined;
  if (accountName.length < 2) throw new EarnError("Enter the name on the bank account.");
  if (!/^\d{9,18}$/.test(accountNumber)) throw new EarnError("Enter a valid account number (9 to 18 digits).");
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new EarnError("Enter a valid IFSC code, like HDFC0001234.");
  return {
    type: "BANK",
    accountName,
    accountNumber,
    ifsc,
    ...(bankName ? { bankName } : {}),
    fingerprint: sha256(`BANK|${ifsc}|${accountNumber}`),
  };
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export function commissionAmount(baseCents: number, rateBps: number): number {
  return Math.floor((baseCents * rateBps) / 10_000);
}

/** ₹1,234.50 — for notification text. Pages format their own. */
export function inr(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** What a payout must show before it may be approved or marked paid. */
export type PayoutCheck = {
  amountCents: number;
  affiliate: { status: AffiliateStatus };
  commissions: {
    amountCents: number;
    status: CommissionStatus;
    /** payments: the order's test-mode payments (PAYOUT_CHECK selects only those). */
    order: { status: OrderStatus; refundRequests: { status: RefundStatus }[]; payments: { mode: string }[] };
  }[];
};

/**
 * Why a payout cannot be approved or marked paid right now, or null.
 * movePayout enforces it; the admin queue uses it to hide the buttons.
 */
export function payoutBlocker(p: PayoutCheck): string | null {
  if (p.affiliate.status !== "APPROVED") {
    return `This affiliate is ${p.affiliate.status.toLowerCase()}. Decline the payout, or reinstate the affiliate first.`;
  }
  if (p.commissions.some((c) => c.order.refundRequests.some((r) => OPEN_REFUND.includes(r.status)))) {
    return "A refund request is open on an order in this payout. Decide the refund first.";
  }
  if (p.commissions.some((c) => c.order.status !== "PAID" && c.order.status !== "FULFILLED")) {
    return "An order in this payout was refunded. Reverse its commission first.";
  }
  // A test-mode payment moved no money; its commission may predate approveCommission's check.
  if (p.commissions.some((c) => c.order.payments.some((pay) => pay.mode === "TEST"))) {
    return "An order in this payout was paid in test mode, so no real money was charged. Decline the payout, then reject that commission.";
  }
  const sum = p.commissions.reduce((s, c) => s + c.amountCents, 0);
  if (p.commissions.some((c) => c.status !== "APPROVED") || sum !== p.amountCents) {
    return "The commissions in this payout do not add up to its amount. Decline it, and the member can request again.";
  }
  return null;
}

/** The part of a payout that payoutBlocker reads. */
const PAYOUT_CHECK = {
  affiliate: true,
  commissions: {
    select: {
      amountCents: true,
      status: true,
      order: {
        select: {
          status: true,
          refundRequests: { where: { status: { in: OPEN_REFUND } }, select: { status: true } },
          payments: { where: { mode: "TEST", status: { in: ["CAPTURED", "REFUNDED"] } }, select: { mode: true } },
        },
      },
    },
  },
} satisfies Prisma.PayoutRequestInclude;

// ───────────────────────────────────────────────────────── service

export class AffiliateService implements EarnHooks {
  private readonly audit: AuditService;

  constructor(
    private readonly db: PrismaClient = defaultPrisma,
    private readonly now: () => Date = () => new Date()
  ) {
    this.audit = new AuditService(db);
  }

  // ─────────────────────────────── membership

  async profileFor(userId: string) {
    return this.db.affiliateProfile.findUnique({ where: { userId } });
  }

  /**
   * Apply to the programme. The application is PENDING until an admin
   * reviews it; a rejected applicant may apply again with new details.
   */
  async register(userId: string, input: RegisterInput) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new EarnError("Account not found.");
    if (!user.emailVerified) throw new EmailNotVerifiedError();
    if (input.acceptTerms !== true) throw new EarnError("Accept the Affiliate & Referral Terms to apply.");

    const channels = clean(input.channels, 1000);
    if (channels.length < 3) throw new EarnError("Tell us where you plan to share your link.");
    const payoutMethod = normalisePayoutMethod(input.payoutMethod);

    const existing = await this.profileFor(userId);
    if (existing) {
      if (existing.status !== "REJECTED") {
        throw new AlreadyAffiliateError(
          existing.status === "SUSPENDED" ? "Your affiliate account is suspended." : "You have already applied."
        );
      }
      const reapplied = await this.db.affiliateProfile.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          channels,
          payoutMethod,
          termsAcceptedAt: this.now(),
          statusReason: null,
          reviewedAt: null,
        },
      });
      await this.audit.log({ actorId: userId, action: "affiliate.apply", targetType: "AffiliateProfile", targetId: existing.id, meta: { reapply: true } });
      return reapplied;
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const profile = await this.db.affiliateProfile.create({
          data: { userId, code: mintCode(), channels, payoutMethod, termsAcceptedAt: this.now() },
        });
        await this.audit.log({ actorId: userId, action: "affiliate.apply", targetType: "AffiliateProfile", targetId: profile.id });
        return profile;
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
        // Either the code collided (mint another) or a second request from the
        // same member won the race on userId (report that).
        if (await this.profileFor(userId)) throw new AlreadyAffiliateError();
      }
    }
    throw new EarnError("Could not allocate an affiliate code. Try again.");
  }

  async approve(adminId: string, affiliateId: string) {
    return this.db.$transaction(async (tx) => {
      const a = await tx.affiliateProfile.findUnique({ where: { id: affiliateId }, include: { user: true } });
      if (!a) throw new AffiliateNotFoundError();
      if (a.status !== "PENDING" && a.status !== "SUSPENDED") throw new InvalidStateError(`Cannot approve an application that is ${a.status.toLowerCase()}.`);
      const updated = await tx.affiliateProfile.update({
        where: { id: a.id },
        data: { status: "APPROVED", statusReason: null, reviewedAt: this.now() },
      });
      const role = promoteTo(a.user.role, "CREATOR");
      if (role !== a.user.role) await tx.user.update({ where: { id: a.userId }, data: { role } });
      await this.audit.log({ actorId: adminId, action: "affiliate.approve", targetType: "AffiliateProfile", targetId: a.id, meta: { from: a.status } }, tx);
      await notify(
        a.userId,
        "EARNINGS",
        a.status === "SUSPENDED" ? "Your affiliate account is active again" : "You're approved as an affiliate",
        "Your referral link is ready on the Earnings page. Commissions are earned only on paid orders.",
        { href },
        tx
      );
      return updated;
    });
  }

  async reject(adminId: string, affiliateId: string, reason: string) {
    return this.review(adminId, affiliateId, reason, "REJECTED", ["PENDING"], "affiliate.reject", "Your affiliate application was not approved");
  }

  async suspend(adminId: string, affiliateId: string, reason: string) {
    return this.review(adminId, affiliateId, reason, "SUSPENDED", ["APPROVED"], "affiliate.suspend", "Your affiliate account is suspended");
  }

  private async review(
    adminId: string,
    affiliateId: string,
    reason: string,
    to: AffiliateStatus,
    from: AffiliateStatus[],
    action: string,
    title: string
  ) {
    const why = clean(reason, 500);
    if (!why) throw new EarnError("Give a reason. The member is shown it.");
    return this.db.$transaction(async (tx) => {
      const a = await tx.affiliateProfile.findUnique({ where: { id: affiliateId } });
      if (!a) throw new AffiliateNotFoundError();
      if (!from.includes(a.status)) throw new InvalidStateError(`This affiliate is ${a.status.toLowerCase()}.`);
      const updated = await tx.affiliateProfile.update({
        where: { id: a.id },
        data: { status: to, statusReason: why, reviewedAt: this.now() },
      });
      await this.audit.log({ actorId: adminId, action, targetType: "AffiliateProfile", targetId: a.id, meta: { reason: why } }, tx);
      await notify(a.userId, "EARNINGS", title, `Reason: ${why}`, { href }, tx);
      return updated;
    });
  }

  // ─────────────────────────────── clicks

  /**
   * Record a click on /r/[code]. Unknown or non-approved codes are ignored.
   * At most one click per visitor per affiliate per 24 hours. The visitor
   * hash rotates daily, so yesterday's hash is checked too.
   */
  async recordClick(code: string, input: ClickInput): Promise<{ recorded: boolean; affiliateId: string | null }> {
    const c = clean(code, 16).toUpperCase();
    if (!AFFILIATE_CODE_PATTERN.test(c)) return { recorded: false, affiliateId: null };
    const a = await this.db.affiliateProfile.findUnique({ where: { code: c }, select: { id: true, status: true } });
    if (!a || a.status !== "APPROVED") return { recorded: false, affiliateId: null };

    const now = this.now();
    const ip = ipKey(input.ip);
    const today = visitorHash(ip, input.userAgent, now);
    const yesterday = visitorHash(ip, input.userAgent, new Date(now.getTime() - DAY_MS));

    const recorded = await this.db.$transaction(async (tx) => {
      // Serialise concurrent clicks from one visitor on one link.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`aff-click|${a.id}|${today}`}))`;
      const recent = await tx.affiliateClick.findFirst({
        where: {
          affiliateId: a.id,
          visitorHash: { in: [today, yesterday] },
          createdAt: { gt: new Date(now.getTime() - DAY_MS) },
        },
        select: { id: true },
      });
      if (recent) return false;
      await tx.affiliateClick.create({
        data: {
          affiliateId: a.id,
          visitorHash: today,
          landingPath: clean(input.landingPath, 500) || "/",
          referrer: clean(input.referrer, 500) || null,
          createdAt: now,
        },
      });
      return true;
    });
    return { recorded, affiliateId: a.id };
  }

  // ─────────────────────────────── order hooks (EarnHooks)

  async onOrderPaid(orderId: string): Promise<void> {
    try {
      await this.attribute(orderId);
    } catch (e) {
      await this.hookFailed("commission.attribute_failed", orderId, e);
    }
  }

  async onOrderRefunded(orderId: string): Promise<void> {
    try {
      await this.reverseFor(orderId);
    } catch (e) {
      // The admin earn page lists refunded orders whose commission still stands.
      await this.hookFailed("commission.reverse_failed", orderId, e);
    }
  }

  /**
   * A hook never throws into the shop, but a failure is not only logged: it
   * goes in the audit log, written after the failed transaction rolled back.
   */
  private async hookFailed(action: string, orderId: string, e: unknown) {
    console.error(`[earn] ${action} for order ${orderId}`, e);
    try {
      const error = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      await this.audit.log({ actorId: null, action, targetType: "order", targetId: orderId, meta: { error } });
    } catch (auditError) {
      console.error(`[earn] could not audit ${action} for order ${orderId}`, auditError);
    }
  }

  private async attribute(orderId: string) {
    const order = await this.db.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order || !order.affiliateCode) return;
    if (order.status !== "PAID" && order.status !== "FULFILLED") return;
    // The programme pays in INR. Without an exchange rate we will not invent
    // one, so an order in another currency earns nothing.
    if (order.fiatCurrency.toUpperCase() !== "INR") return;
    if (order.totalFiatCents <= 0) return;

    const code = order.affiliateCode.trim().toUpperCase();
    const affiliate = await this.db.affiliateProfile.findUnique({ where: { code } });
    if (!affiliate || affiliate.status !== "APPROVED") return;
    if (affiliate.userId === order.userId) return; // nobody earns on their own purchase

    const existing = await this.db.commission.findUnique({ where: { orderId } });
    if (existing) return;

    // Order.totalFiatCents is what the buyer was charged: the discount is already
    // taken off (discountCents is kept only as a record). Shipping is not charged separately.
    const baseCents = Math.max(0, order.totalFiatCents);
    if (baseCents <= 0) return;
    const rateBps = AFFILIATE_RATE_BPS;
    const amountCents = commissionAmount(baseCents, rateBps);
    if (amountCents <= 0) return;

    const flags = await this.fraudFlags(affiliate, order);
    // A test-mode payment (sandbox, or Razorpay test keys) moved no real money:
    // the commission is still recorded so the flow can be checked end to end,
    // but it carries a flag so nobody approves a real payout for it.
    const testPaid = await this.db.payment.findFirst({ where: { orderId, status: "CAPTURED", mode: "TEST" }, select: { id: true } });
    if (testPaid) flags.push("test-mode payment — no real money was charged; do not pay out");
    const now = this.now();

    try {
      await this.db.$transaction(async (tx) => {
        const c = await tx.commission.create({
          data: {
            affiliateId: affiliate.id,
            orderId,
            baseCents,
            rateBps,
            amountCents,
            currency: "INR",
            status: "PENDING",
            reason: flags.length ? `flagged: ${flags.join("; ")}` : null,
            holdUntil: new Date(now.getTime() + AFFILIATE_HOLD_DAYS * DAY_MS),
          },
        });
        await this.audit.log(
          { actorId: null, action: "commission.create", targetType: "Commission", targetId: c.id, meta: { orderId, baseCents, rateBps, amountCents, flags } },
          tx
        );
        await notify(
          affiliate.userId,
          "EARNINGS",
          `A paid order used your link: ${inr(amountCents)} pending`,
          `It is held for ${AFFILIATE_HOLD_DAYS} days in case of a refund, then reviewed.`,
          { href },
          tx
        );
      });
    } catch (e) {
      if (isUniqueViolation(e)) return; // a concurrent call created it first
      throw e;
    }
  }

  /**
   * Reasons an admin should look at a commission before approving it. The
   * commission is still created; the flag only routes it for review.
   */
  private async fraudFlags(
    affiliate: { id: string; userId: string; payoutMethod: Prisma.JsonValue },
    order: { createdAt: Date; userId: string; user: { createdAt: Date } }
  ): Promise<string[]> {
    const flags: string[] = [];
    const paidAt = this.now();

    // 1. A brand-new buyer account on the affiliate's own device: the buyer was
    //    created < 10 minutes before buying, and one of the buyer's sessions
    //    hashes to the same visitor as one of this affiliate's link clicks that
    //    also matches the affiliate's own sessions.
    if (paidAt.getTime() - order.user.createdAt.getTime() < NEW_ACCOUNT_MS) {
      const since = new Date(paidAt.getTime() - 2 * DAY_MS);
      const [buyerSessions, ownSessions, clicks] = await Promise.all([
        this.db.session.findMany({ where: { userId: order.userId, createdAt: { gte: since } }, select: { ipHash: true, userAgent: true, createdAt: true } }),
        this.db.session.findMany({ where: { userId: affiliate.userId, createdAt: { gte: since } }, select: { ipHash: true, userAgent: true, createdAt: true } }),
        this.db.affiliateClick.findMany({ where: { affiliateId: affiliate.id, createdAt: { gte: since } }, select: { visitorHash: true } }),
      ]);
      const hashes = (rows: { ipHash: string | null; userAgent: string | null; createdAt: Date }[]) =>
        new Set(rows.filter((s) => s.ipHash).map((s) => visitorHash(s.ipHash!, s.userAgent, s.createdAt)));
      const buyer = hashes(buyerSessions);
      const own = hashes(ownSessions);
      const clicked = new Set(clicks.map((c) => c.visitorHash));
      const shared = [...buyer].some((h) => own.has(h) && clicked.has(h));
      if (shared) flags.push("new buyer account on the affiliate's own device");
    }

    // 2. Another affiliate pays out to the same account.
    const fp = (affiliate.payoutMethod as { fingerprint?: string } | null)?.fingerprint;
    if (fp) {
      const twin = await this.db.affiliateProfile.findFirst({
        where: { id: { not: affiliate.id }, payoutMethod: { path: ["fingerprint"], equals: fp } },
        select: { id: true },
      });
      if (twin) flags.push("payout method shared with another affiliate");
    }
    return flags;
  }

  /**
   * Reverses the commission on a refunded order. The rows are locked first,
   * in the order requestPayout and movePayout use (affiliate, payout,
   * commission), and their statuses are read again under the locks, so a
   * payout being paid at the same moment is either paid first (and this
   * records a manual clawback) or sees the commission gone.
   *
   * A commission in an open payout comes out of it. If that leaves nothing,
   * or less than the minimum payout, the request is closed instead of lowered
   * and its other commissions go back to be requested again.
   */
  private async reverseFor(orderId: string, actorId: string | null = null) {
    // The affiliate never changes, so it can be read before locking.
    const found = await this.db.commission.findUnique({ where: { orderId }, select: { id: true, affiliateId: true } });
    if (!found) return;
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AffiliateProfile" WHERE id = ${found.affiliateId} FOR UPDATE`;
      // Every write to payoutId holds the affiliate lock, so this read is stable.
      const { payoutId } = await tx.commission.findUniqueOrThrow({ where: { id: found.id }, select: { payoutId: true } });
      if (payoutId) await tx.$queryRaw`SELECT id FROM "PayoutRequest" WHERE id = ${payoutId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Commission" WHERE id = ${found.id} FOR UPDATE`;
      const c = await tx.commission.findUniqueOrThrow({ where: { id: found.id }, include: { affiliate: true, payout: true } });
      if (c.status === "REVERSED" || c.status === "REJECTED") return;
      const now = this.now();

      if (c.status === "PAID") {
        const n = await tx.commission.updateMany({
          where: { id: c.id, status: "PAID" },
          data: { status: "REVERSED", reason: "order refunded after this commission was paid — clawback is manual", reviewedAt: now },
        });
        if (n.count !== 1) throw new InvalidStateError("This commission changed while it was being reversed.");
        await this.audit.log(
          { actorId, action: "commission.reverse", targetType: "Commission", targetId: c.id, meta: { orderId, afterPayout: true, payoutId: c.payoutId, amountCents: c.amountCents } },
          tx
        );
        await notify(c.affiliate.userId, "EARNINGS", "A paid commission's order was refunded", `${inr(c.amountCents)} was already paid out. We will contact you about it.`, { href }, tx);
        return;
      }

      // PENDING or APPROVED. If it sits in an open payout request, take it out
      // so the request never pays for a refunded order.
      const payout = c.payout && OPEN_PAYOUT.includes(c.payout.status) ? c.payout : null;
      const n = await tx.commission.updateMany({
        where: { id: c.id, status: c.status, payoutId: c.payoutId },
        data: { status: "REVERSED", reason: "order refunded", reviewedAt: now, ...(payout ? { payoutId: null } : {}) },
      });
      if (n.count !== 1) throw new InvalidStateError("This commission changed while it was being reversed.");

      let closed: string | null = null;
      if (payout) {
        const left = payout.amountCents - c.amountCents;
        if (left >= MIN_PAYOUT_CENTS) {
          await tx.payoutRequest.update({ where: { id: payout.id }, data: { amountCents: left } });
        } else {
          // Lowering it would leave nothing to pay, or less than anyone may request.
          closed = left <= 0 ? "Every commission in it was refunded." : `A refund took it below the ${inr(MIN_PAYOUT_CENTS)} minimum.`;
          await tx.payoutRequest.update({ where: { id: payout.id }, data: { status: "REJECTED", reason: closed, reviewedAt: now } });
          // Back to the pool, as when a payout is declined.
          const back = await tx.commission.updateMany({ where: { payoutId: payout.id, status: "APPROVED" }, data: { payoutId: null } });
          await this.audit.log(
            { actorId, action: "payout.close", targetType: "PayoutRequest", targetId: payout.id, meta: { reason: closed, from: payout.status, amountCents: payout.amountCents, orderId, commissionId: c.id, returned: back.count } },
            tx
          );
        }
      }
      await this.audit.log(
        { actorId, action: "commission.reverse", targetType: "Commission", targetId: c.id, meta: { orderId, from: c.status, detachedFromPayout: payout?.id ?? null, payoutClosed: closed !== null } },
        tx
      );
      await notify(c.affiliate.userId, "EARNINGS", "A commission was reversed", `The order was refunded, so its ${inr(c.amountCents)} commission no longer applies.`, { href }, tx);
      if (closed) {
        await notify(
          c.affiliate.userId,
          "EARNINGS",
          "Payout request closed",
          `${closed} Any approved commissions left in it are available to request again.`,
          { href },
          tx
        );
      }
    });
  }

  // ─────────────────────────────── admin: commissions

  async approveCommission(adminId: string, commissionId: string) {
    return this.db.$transaction(async (tx) => {
      const c = await tx.commission.findUnique({ where: { id: commissionId }, include: { order: true, affiliate: true } });
      if (!c) throw new EarnError("Commission not found.");
      if (c.status !== "PENDING") throw new InvalidStateError(`This commission is ${c.status.toLowerCase()}.`);
      // A test-mode payment (sandbox, or Razorpay test keys) moved no money, so
      // there is nothing to share. The flag set at creation is not enough on its own.
      const testPaid = await tx.payment.count({ where: { orderId: c.orderId, mode: "TEST", status: { in: ["CAPTURED", "REFUNDED"] } } });
      if (testPaid > 0) throw new InvalidStateError("This order was paid in test mode, so no real money was charged. Reject this commission instead.");
      if (this.now() < c.holdUntil) throw new HoldPeriodError(c.holdUntil);
      if (c.order.status !== "PAID" && c.order.status !== "FULFILLED") {
        throw new InvalidStateError(`The order is ${c.order.status.toLowerCase()}, so this commission cannot be approved.`);
      }
      // A suspended affiliate is not paid until reinstated, and a refund still being
      // decided would reverse the commission: approved now, it could be paid out first.
      if (c.affiliate.status !== "APPROVED") {
        throw new InvalidStateError(`This affiliate is ${c.affiliate.status.toLowerCase()}, so this commission cannot be approved.`);
      }
      if ((await tx.refundRequest.count({ where: { orderId: c.orderId, status: { in: OPEN_REFUND } } })) > 0) {
        throw new InvalidStateError("A refund request is open on this order. Decide the refund first.");
      }
      const n = await tx.commission.updateMany({
        where: { id: c.id, status: "PENDING" },
        data: { status: "APPROVED", reviewedAt: this.now() },
      });
      if (n.count !== 1) throw new InvalidStateError("This commission changed while you were looking at it.");
      await this.audit.log({ actorId: adminId, action: "commission.approve", targetType: "Commission", targetId: c.id, meta: { amountCents: c.amountCents, flagged: c.reason } }, tx);
      await notify(c.affiliate.userId, "EARNINGS", `Commission approved: ${inr(c.amountCents)}`, "It counts toward your next payout.", { href }, tx);
      return tx.commission.findUniqueOrThrow({ where: { id: c.id } });
    });
  }

  async rejectCommission(adminId: string, commissionId: string, reason: string) {
    const why = clean(reason, 500);
    if (!why) throw new EarnError("Give a reason. The member is shown it.");
    return this.db.$transaction(async (tx) => {
      const c = await tx.commission.findUnique({ where: { id: commissionId }, include: { affiliate: true } });
      if (!c) throw new EarnError("Commission not found.");
      if (c.status !== "PENDING" && c.status !== "APPROVED") throw new InvalidStateError(`This commission is ${c.status.toLowerCase()}.`);
      if (c.payoutId) throw new InvalidStateError("This commission is part of a payout request. Reject the payout first.");
      const n = await tx.commission.updateMany({
        where: { id: c.id, status: c.status, payoutId: null },
        data: { status: "REJECTED", reason: why, reviewedAt: this.now() },
      });
      if (n.count !== 1) throw new InvalidStateError("This commission changed while you were looking at it.");
      await this.audit.log({ actorId: adminId, action: "commission.reject", targetType: "Commission", targetId: c.id, meta: { reason: why, from: c.status } }, tx);
      await notify(c.affiliate.userId, "EARNINGS", "A commission was rejected", `Reason: ${why}`, { href }, tx);
      return tx.commission.findUniqueOrThrow({ where: { id: c.id } });
    });
  }

  /**
   * Runs the refund reversal again for a commission whose order was refunded
   * but which still stands (listUnreversed). Errors reach the admin this time.
   */
  async reverseRefunded(adminId: string, commissionId: string) {
    const c = await this.db.commission.findUnique({ where: { id: commissionId }, include: { order: { select: { status: true } } } });
    if (!c) throw new EarnError("Commission not found.");
    if (c.order.status !== "REFUNDED") throw new InvalidStateError(`The order is ${c.order.status.toLowerCase()}, not refunded.`);
    await this.reverseFor(c.orderId, adminId);
    return this.db.commission.findUniqueOrThrow({ where: { id: c.id } });
  }

  // ─────────────────────────────── payouts

  /**
   * Ask for everything approved and not yet in a payout. One open request at
   * a time; the affiliate row is locked so two clicks cannot both succeed.
   */
  async requestPayout(userId: string) {
    return this.db.$transaction(async (tx) => {
      const a = await tx.affiliateProfile.findUnique({ where: { userId } });
      if (!a) throw new AffiliateNotFoundError();
      await tx.$queryRaw`SELECT id FROM "AffiliateProfile" WHERE id = ${a.id} FOR UPDATE`;
      if (a.status !== "APPROVED") throw new PayoutError("Only an approved affiliate can request a payout.");
      if (!a.payoutMethod) throw new PayoutError("Add a payout method first.");

      const open = await tx.payoutRequest.findFirst({ where: { affiliateId: a.id, status: { in: OPEN_PAYOUT } }, select: { id: true } });
      if (open) throw new PayoutError("You already have a payout request in progress.");

      // A commission whose order has a refund request waiting stays out until it is decided.
      const ready = await tx.commission.findMany({
        where: { affiliateId: a.id, status: "APPROVED", payoutId: null, currency: "INR", order: ORDER_STANDS },
        select: { id: true, amountCents: true },
      });
      const amountCents = ready.reduce((s, c) => s + c.amountCents, 0);
      if (amountCents < MIN_PAYOUT_CENTS) {
        throw new PayoutError(`The minimum payout is ${inr(MIN_PAYOUT_CENTS)}. You have ${inr(amountCents)} available.`);
      }

      const payout = await tx.payoutRequest.create({
        data: { affiliateId: a.id, amountCents, currency: "INR", status: "REQUESTED", method: a.payoutMethod as Prisma.InputJsonValue },
      });
      const attached = await tx.commission.updateMany({
        where: { id: { in: ready.map((c) => c.id) }, status: "APPROVED", payoutId: null },
        data: { payoutId: payout.id },
      });
      if (attached.count !== ready.length) throw new PayoutError("Your commissions changed while requesting. Try again.");

      await this.audit.log({ actorId: userId, action: "payout.request", targetType: "PayoutRequest", targetId: payout.id, meta: { amountCents, commissions: ready.length } }, tx);
      await notify(userId, "EARNINGS", `Payout requested: ${inr(amountCents)}`, "An admin reviews payout requests by hand. You will be told when it is paid.", { href }, tx);
      return payout;
    });
  }

  async approvePayout(adminId: string, payoutId: string) {
    return this.movePayout(adminId, payoutId, ["REQUESTED"], "APPROVED", "payout.approve", {}, (p) => [
      `Payout approved: ${inr(p.amountCents)}`,
      "It will be sent to your payout method shortly.",
    ]);
  }

  async markPayoutPaid(adminId: string, payoutId: string, reference: string) {
    const ref = clean(reference, 200);
    if (!ref) throw new EarnError("Enter the payment reference (UTR or transaction ID).");
    return this.movePayout(adminId, payoutId, ["APPROVED"], "PAID", "payout.paid", { reference: ref }, (p) => [
      `Payout sent: ${inr(p.amountCents)}`,
      `Reference: ${ref}`,
    ]);
  }

  async rejectPayout(adminId: string, payoutId: string, reason: string) {
    const why = clean(reason, 500);
    if (!why) throw new EarnError("Give a reason. The member is shown it.");
    return this.movePayout(adminId, payoutId, ["REQUESTED", "APPROVED"], "REJECTED", "payout.reject", { reason: why }, () => [
      "Payout request declined",
      `Reason: ${why}. Your approved commissions are available to request again.`,
    ]);
  }

  private async movePayout(
    adminId: string,
    payoutId: string,
    from: PayoutStatus[],
    to: PayoutStatus,
    action: string,
    extra: { reference?: string; reason?: string },
    message: (p: { amountCents: number }) => [string, string]
  ) {
    // The affiliate never changes, so it can be read before locking.
    const found = await this.db.payoutRequest.findUnique({ where: { id: payoutId }, select: { affiliateId: true } });
    if (!found) throw new EarnError("Payout request not found.");
    return this.db.$transaction(async (tx) => {
      // The lock order of requestPayout and reverseFor: a refund reversing one of
      // these commissions waits for this move, or this move sees it done.
      await tx.$queryRaw`SELECT id FROM "AffiliateProfile" WHERE id = ${found.affiliateId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "PayoutRequest" WHERE id = ${payoutId} FOR UPDATE`;
      const p = await tx.payoutRequest.findUniqueOrThrow({ where: { id: payoutId }, include: PAYOUT_CHECK });
      if (!from.includes(p.status)) throw new InvalidStateError(`This payout is ${p.status.toLowerCase()}.`);
      if (to === "APPROVED" || to === "PAID") {
        const blocked = payoutBlocker(p);
        if (blocked) throw new InvalidStateError(blocked);
      }
      const now = this.now();
      const n = await tx.payoutRequest.updateMany({
        where: { id: p.id, status: p.status },
        data: {
          status: to,
          reviewedAt: now,
          ...(to === "PAID" ? { paidAt: now, reference: extra.reference } : {}),
          ...(to === "REJECTED" ? { reason: extra.reason } : {}),
        },
      });
      if (n.count !== 1) throw new InvalidStateError("This payout changed while you were looking at it.");

      if (to === "PAID") {
        await tx.commission.updateMany({ where: { payoutId: p.id, status: "APPROVED" }, data: { status: "PAID" } });
      } else if (to === "REJECTED") {
        // Back to the pool: still APPROVED, free to be requested again.
        await tx.commission.updateMany({ where: { payoutId: p.id, status: "APPROVED" }, data: { payoutId: null } });
      }

      await this.audit.log({ actorId: adminId, action, targetType: "PayoutRequest", targetId: p.id, meta: { amountCents: p.amountCents, from: p.status, ...extra } }, tx);
      const [title, body] = message(p);
      await notify(p.affiliate.userId, "EARNINGS", title, body, { href }, tx);
      return tx.payoutRequest.findUniqueOrThrow({ where: { id: p.id } });
    });
  }

  // ─────────────────────────────── member read models

  /** Everything the Earnings page shows. Null when the member has not applied. */
  async summary(userId: string) {
    const a = await this.profileFor(userId);
    if (!a) return null;
    const since = new Date(this.now().getTime() - 30 * DAY_MS);
    const [clicks30d, clicksAll, byStatus, available, held, inPayout, openPayout] = await Promise.all([
      this.db.affiliateClick.count({ where: { affiliateId: a.id, createdAt: { gte: since } } }),
      this.db.affiliateClick.count({ where: { affiliateId: a.id } }),
      this.db.commission.groupBy({ by: ["status"], where: { affiliateId: a.id }, _sum: { amountCents: true }, _count: { _all: true } }),
      // The same rule as requestPayout, so the button never offers more than it can request.
      this.db.commission.aggregate({ where: { affiliateId: a.id, status: "APPROVED", payoutId: null, currency: "INR", order: ORDER_STANDS }, _sum: { amountCents: true } }),
      this.db.commission.aggregate({ where: { affiliateId: a.id, status: "APPROVED", payoutId: null, order: REFUND_OPEN }, _sum: { amountCents: true } }),
      this.db.commission.aggregate({ where: { affiliateId: a.id, status: "APPROVED", payoutId: { not: null } }, _sum: { amountCents: true } }),
      this.db.payoutRequest.findFirst({ where: { affiliateId: a.id, status: { in: OPEN_PAYOUT } }, orderBy: { createdAt: "desc" } }),
    ]);
    const total = (s: CommissionStatus) => byStatus.find((r) => r.status === s)?._sum.amountCents ?? 0;
    const count = (s: CommissionStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
    const availableCents = available._sum.amountCents ?? 0;
    return {
      profile: a,
      clicks30d,
      clicksAll,
      /** Paid orders attributed to the link, whatever happened to them afterwards. */
      conversions: byStatus.reduce((s, r) => s + r._count._all, 0),
      totals: {
        pending: total("PENDING"),
        approved: total("APPROVED"),
        paid: total("PAID"),
        rejected: total("REJECTED"),
        reversed: total("REVERSED"),
      },
      counts: {
        pending: count("PENDING"),
        approved: count("APPROVED"),
        paid: count("PAID"),
        rejected: count("REJECTED"),
        reversed: count("REVERSED"),
      },
      availableCents,
      /** Approved, but on hold while a refund request on the order is decided. */
      heldCents: held._sum.amountCents ?? 0,
      inPayoutCents: inPayout._sum.amountCents ?? 0,
      minPayoutCents: MIN_PAYOUT_CENTS,
      openPayout,
      canRequestPayout: a.status === "APPROVED" && !openPayout && availableCents >= MIN_PAYOUT_CENTS,
    };
  }

  async commissionsFor(userId: string, take = 50) {
    const a = await this.profileFor(userId);
    if (!a) return [];
    return this.db.commission.findMany({
      where: { affiliateId: a.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 200),
      select: {
        id: true, baseCents: true, rateBps: true, amountCents: true, currency: true, status: true,
        reason: true, holdUntil: true, createdAt: true, reviewedAt: true, payoutId: true,
        order: { select: { id: true, createdAt: true } },
      },
    });
  }

  async payoutsFor(userId: string, take = 50) {
    const a = await this.profileFor(userId);
    if (!a) return [];
    return this.db.payoutRequest.findMany({
      where: { affiliateId: a.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 200),
      select: { id: true, amountCents: true, currency: true, status: true, reference: true, reason: true, createdAt: true, paidAt: true, _count: { select: { commissions: true } } },
    });
  }

  // ─────────────────────────────── admin read models

  async listAffiliates(opts: { status?: AffiliateStatus; take?: number; skip?: number } = {}) {
    const where = opts.status ? { status: opts.status } : {};
    const [rows, total] = await Promise.all([
      this.db.affiliateProfile.findMany({
        where,
        orderBy: { createdAt: opts.status === "PENDING" ? "asc" : "desc" },
        take: Math.min(opts.take ?? 50, 200),
        skip: opts.skip ?? 0,
        include: {
          user: { select: { email: true, emailVerified: true, createdAt: true, profile: { select: { username: true, displayName: true } } } },
          _count: { select: { clicks: true, commissions: true } },
        },
      }),
      this.db.affiliateProfile.count({ where }),
    ]);
    return { rows, total };
  }

  async listCommissions(opts: { status?: CommissionStatus; flagged?: boolean; affiliateId?: string; take?: number; skip?: number } = {}) {
    const where: Prisma.CommissionWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.affiliateId ? { affiliateId: opts.affiliateId } : {}),
      ...(opts.flagged ? { reason: { startsWith: "flagged:" } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.commission.findMany({
        where,
        orderBy: { createdAt: opts.status === "PENDING" ? "asc" : "desc" },
        take: Math.min(opts.take ?? 50, 200),
        skip: opts.skip ?? 0,
        include: {
          affiliate: { select: { code: true, status: true, user: { select: { email: true, profile: { select: { username: true } } } } } },
          order: {
            select: {
              id: true, status: true, createdAt: true, totalFiatCents: true, discountCents: true, fiatCurrency: true, user: { select: { email: true } },
              refundRequests: { where: { status: { in: OPEN_REFUND } }, select: { id: true, status: true } },
            },
          },
        },
      }),
      this.db.commission.count({ where }),
    ]);
    return { rows, total };
  }

  /**
   * Commissions still standing on a refunded order: the reversal failed (the
   * audit log has commission.reverse_failed, the latest is attached) or never
   * ran. The admin earn page shows them until each is reversed.
   */
  async listUnreversed(take = 50) {
    const rows = await this.db.commission.findMany({
      where: { status: { in: ["PENDING", "APPROVED", "PAID"] }, order: { status: "REFUNDED" } },
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 200),
      include: { affiliate: { select: { code: true, user: { select: { email: true } } } } },
    });
    const failures = rows.length
      ? await this.db.auditLog.findMany({
          where: { action: "commission.reverse_failed", targetType: "order", targetId: { in: rows.map((r) => r.orderId) } },
          orderBy: { createdAt: "desc" },
          select: { targetId: true, meta: true, createdAt: true },
        })
      : [];
    return rows.map((r) => {
      const failure = failures.find((f) => f.targetId === r.orderId);
      const error = (failure?.meta as { error?: unknown } | null)?.error;
      return { ...r, lastFailure: failure ? { at: failure.createdAt, error: typeof error === "string" ? error : null } : null };
    });
  }

  async listPayouts(opts: { status?: PayoutStatus; take?: number; skip?: number } = {}) {
    const where = opts.status ? { status: opts.status } : {};
    const [rows, total] = await Promise.all([
      this.db.payoutRequest.findMany({
        where,
        orderBy: { createdAt: opts.status === "REQUESTED" ? "asc" : "desc" },
        take: Math.min(opts.take ?? 50, 200),
        skip: opts.skip ?? 0,
        include: {
          ...PAYOUT_CHECK,
          affiliate: { select: { code: true, status: true, user: { select: { email: true, profile: { select: { username: true } } } } } },
          _count: { select: { commissions: true } },
        },
      }),
      this.db.payoutRequest.count({ where }),
    ]);
    return { rows, total };
  }
}

export const affiliates = new AffiliateService();
