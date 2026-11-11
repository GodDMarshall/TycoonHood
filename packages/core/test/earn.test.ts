import { describe, it, expect, beforeAll } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "@tycoonhood/db";
import { AFFILIATE_HOLD_DAYS, AFFILIATE_RATE_BPS, MIN_PAYOUT_CENTS } from "@tycoonhood/config";
import {
  AffiliateService,
  EmailNotVerifiedError,
  AlreadyAffiliateError,
  HoldPeriodError,
  PayoutError,
  AFFILIATE_CODE_PATTERN,
  commissionAmount,
} from "../src/earn";
import { createTestUser, uid } from "./helpers";

const earn = new AffiliateService(prisma);
const DAY = 86_400_000;
let admin: { id: string };

async function verifiedUser() {
  const u = await createTestUser();
  return prisma.user.update({ where: { id: u.id }, data: { emailVerified: new Date() } });
}

const upi = () => `t${uid().replace(/-/g, "").slice(0, 12)}@okbank`;

async function approvedAffiliate(upiId = upi()) {
  const u = await verifiedUser();
  const p = await earn.register(u.id, { channels: "YouTube channel about training", payoutMethod: { type: "UPI", upiId }, acceptTerms: true });
  await earn.approve(admin.id, p.id);
  return { user: u, profile: (await prisma.affiliateProfile.findUniqueOrThrow({ where: { id: p.id } })) };
}

async function paidOrder(buyerId: string, code: string | null, totalFiatCents: number, discountCents = 0, fiatCurrency = "INR") {
  return prisma.order.create({
    data: { userId: buyerId, status: "PAID", totalFiatCents, discountCents, fiatCurrency, affiliateCode: code, paymentProvider: "test" },
  });
}

/** An APPROVED commission of exactly `amountCents` (rate applied backwards). */
async function approvedCommission(affiliate: { profile: { id: string; code: string } }, amountCents: number) {
  const buyer = await createTestUser();
  // Age the buyer so the new-account check never fires on these fixtures.
  await prisma.user.update({ where: { id: buyer.id }, data: { createdAt: new Date(Date.now() - 30 * DAY) } });
  const base = Math.ceil((amountCents * 10_000) / AFFILIATE_RATE_BPS);
  const order = await paidOrder(buyer.id, affiliate.profile.code, base);
  await earn.onOrderPaid(order.id);
  const c = await prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } });
  await prisma.commission.update({ where: { id: c.id }, data: { holdUntil: new Date(Date.now() - 1000) } });
  return earn.approveCommission(admin.id, c.id);
}

beforeAll(async () => {
  admin = await createTestUser();
});

describe("registration", () => {
  it("requires a verified email", async () => {
    const u = await createTestUser();
    await expect(
      earn.register(u.id, { channels: "Instagram", payoutMethod: { type: "UPI", upiId: upi() }, acceptTerms: true })
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);
    expect(await prisma.affiliateProfile.findUnique({ where: { userId: u.id } })).toBeNull();
  });

  it("creates a PENDING profile with a short unambiguous code, once", async () => {
    const u = await verifiedUser();
    const p = await earn.register(u.id, { channels: "Newsletter", payoutMethod: { type: "UPI", upiId: upi() }, acceptTerms: true });
    expect(p.status).toBe("PENDING");
    expect(p.code).toMatch(AFFILIATE_CODE_PATTERN);
    expect(p.code).not.toMatch(/[O0I1L]/);
    await expect(
      earn.register(u.id, { channels: "Again", payoutMethod: { type: "UPI", upiId: upi() }, acceptTerms: true })
    ).rejects.toBeInstanceOf(AlreadyAffiliateError);
  });

  it("requires accepting the terms and a valid payout method", async () => {
    const u = await verifiedUser();
    await expect(earn.register(u.id, { channels: "X", payoutMethod: { type: "UPI", upiId: upi() }, acceptTerms: false })).rejects.toThrow(/Terms/);
    await expect(earn.register(u.id, { channels: "Blog", payoutMethod: { type: "UPI", upiId: "not-a-upi" }, acceptTerms: true })).rejects.toThrow(/UPI/);
    await expect(
      earn.register(u.id, { channels: "Blog", payoutMethod: { type: "BANK", accountName: "A B", accountNumber: "12", ifsc: "HDFC0001234" }, acceptTerms: true })
    ).rejects.toThrow(/account number/);
  });

  it("gives every affiliate a unique code", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const u = await verifiedUser();
      const p = await earn.register(u.id, { channels: "Podcast", payoutMethod: { type: "UPI", upiId: upi() }, acceptTerms: true });
      codes.add(p.code);
    }
    expect(codes.size).toBe(12);
  });

  it("approval promotes the member to CREATOR, audits and notifies", async () => {
    const { user, profile } = await approvedAffiliate();
    expect(profile.status).toBe("APPROVED");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("CREATOR");
    expect(await prisma.auditLog.count({ where: { action: "affiliate.approve", targetId: profile.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: user.id, type: "EARNINGS" } })).toBeGreaterThan(0);
  });

  it("rejection needs a reason", async () => {
    const u = await verifiedUser();
    const p = await earn.register(u.id, { channels: "Forum", payoutMethod: { type: "UPI", upiId: upi() }, acceptTerms: true });
    await expect(earn.reject(admin.id, p.id, "  ")).rejects.toThrow(/reason/);
    const r = await earn.reject(admin.id, p.id, "No channels given");
    expect(r.status).toBe("REJECTED");
    expect(r.statusReason).toBe("No channels given");
  });
});

describe("clicks", () => {
  it("records one click per visitor per affiliate per 24h, never the raw IP", async () => {
    const { profile } = await approvedAffiliate();
    const ip = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const v = { ip, userAgent: "Mozilla/5.0 test", landingPath: "/store", referrer: "https://example.com" };

    expect((await earn.recordClick(profile.code, v)).recorded).toBe(true);
    expect((await earn.recordClick(profile.code.toLowerCase(), v)).recorded).toBe(false);
    expect((await earn.recordClick(profile.code, { ...v, ip: "10.9.9.9" })).recorded).toBe(true);

    const rows = await prisma.affiliateClick.findMany({ where: { affiliateId: profile.id } });
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.visitorHash).toMatch(/^[0-9a-f]{64}$/);
      expect(r.visitorHash).not.toContain(ip);
    }

    // A day later the same visitor counts again.
    const later = new AffiliateService(prisma, () => new Date(Date.now() + DAY + 60_000));
    expect((await later.recordClick(profile.code, v)).recorded).toBe(true);
  });

  it("ignores unknown and non-approved codes", async () => {
    expect((await earn.recordClick("ZZZZZZZ", { ip: "1.1.1.1", userAgent: "x", landingPath: "/" })).recorded).toBe(false);
    expect((await earn.recordClick("../etc", { ip: "1.1.1.1", userAgent: "x", landingPath: "/" })).recorded).toBe(false);
    const u = await verifiedUser();
    const p = await earn.register(u.id, { channels: "Pending", payoutMethod: { type: "UPI", upiId: upi() }, acceptTerms: true });
    expect((await earn.recordClick(p.code, { ip: "1.1.1.1", userAgent: "x", landingPath: "/" })).recorded).toBe(false);
  });
});

describe("commissions", () => {
  it("computes base = amount charged (after discount) at the configured rate, held for the refund window", async () => {
    const aff = await approvedAffiliate();
    const buyer = await createTestUser();
    await prisma.user.update({ where: { id: buyer.id }, data: { createdAt: new Date(Date.now() - DAY) } });
    const order = await paidOrder(buyer.id, aff.profile.code, 225_000, 24_900); // ₹2,499 − ₹249 coupon = ₹2,250 charged
    const before = Date.now();
    await earn.onOrderPaid(order.id);

    const c = await prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(c.status).toBe("PENDING");
    expect(c.baseCents).toBe(225_000);
    expect(c.rateBps).toBe(AFFILIATE_RATE_BPS);
    expect(c.amountCents).toBe(commissionAmount(225_000, AFFILIATE_RATE_BPS));
    expect(c.amountCents).toBe(22_500); // 10% of ₹2,250
    expect(c.currency).toBe("INR");
    expect(c.reason).toBeNull();
    const hold = c.holdUntil.getTime() - before;
    expect(hold).toBeGreaterThanOrEqual(AFFILIATE_HOLD_DAYS * DAY - 5_000);
    expect(hold).toBeLessThanOrEqual(AFFILIATE_HOLD_DAYS * DAY + 5_000);
  });

  it("is idempotent: calling onOrderPaid twice creates one commission", async () => {
    const aff = await approvedAffiliate();
    const buyer = await createTestUser();
    const order = await paidOrder(buyer.id, aff.profile.code, 100_000);
    await Promise.all([earn.onOrderPaid(order.id), earn.onOrderPaid(order.id)]);
    await earn.onOrderPaid(order.id);
    expect(await prisma.commission.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("blocks self-purchase, unknown codes, unapproved affiliates, zero-value and non-INR orders", async () => {
    const aff = await approvedAffiliate();
    const self = await paidOrder(aff.user.id, aff.profile.code, 100_000);
    await earn.onOrderPaid(self.id);
    expect(await prisma.commission.count({ where: { orderId: self.id } })).toBe(0);

    const buyer = await createTestUser();
    const unknown = await paidOrder(buyer.id, "QQQQQQQ", 100_000);
    const free = await paidOrder(buyer.id, aff.profile.code, 0);
    const usd = await paidOrder(buyer.id, aff.profile.code, 100_000, 0, "USD");
    const pendingOrder = await prisma.order.create({ data: { userId: buyer.id, status: "PENDING", totalFiatCents: 100_000, fiatCurrency: "INR", affiliateCode: aff.profile.code } });
    for (const o of [unknown, free, usd, pendingOrder]) await earn.onOrderPaid(o.id);
    expect(await prisma.commission.count({ where: { orderId: { in: [unknown.id, free.id, usd.id, pendingOrder.id] } } })).toBe(0);

    await earn.suspend(admin.id, aff.profile.id, "Spam");
    const afterSuspend = await paidOrder(buyer.id, aff.profile.code, 100_000);
    await earn.onOrderPaid(afterSuspend.id);
    expect(await prisma.commission.count({ where: { orderId: afterSuspend.id } })).toBe(0);
  });

  it("never throws into the checkout path", async () => {
    await expect(earn.onOrderPaid("does-not-exist")).resolves.toBeUndefined();
    await expect(earn.onOrderRefunded("does-not-exist")).resolves.toBeUndefined();
  });

  it("enforces the hold period and the order's state on approval", async () => {
    const aff = await approvedAffiliate();
    const buyer = await createTestUser();
    const order = await paidOrder(buyer.id, aff.profile.code, 100_000);
    await earn.onOrderPaid(order.id);
    const c = await prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } });

    await expect(earn.approveCommission(admin.id, c.id)).rejects.toBeInstanceOf(HoldPeriodError);
    const day13 = new AffiliateService(prisma, () => new Date(Date.now() + (AFFILIATE_HOLD_DAYS - 1) * DAY));
    await expect(day13.approveCommission(admin.id, c.id)).rejects.toBeInstanceOf(HoldPeriodError);

    const afterHold = new AffiliateService(prisma, () => new Date(Date.now() + AFFILIATE_HOLD_DAYS * DAY + 60_000));
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    await expect(afterHold.approveCommission(admin.id, c.id)).rejects.toThrow(/cancelled/);
    await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
    const approved = await afterHold.approveCommission(admin.id, c.id);
    expect(approved.status).toBe("APPROVED");
    expect(await prisma.auditLog.count({ where: { action: "commission.approve", targetId: c.id } })).toBe(1);
  });

  it("rejection needs a reason the member can see", async () => {
    const aff = await approvedAffiliate();
    const buyer = await createTestUser();
    const order = await paidOrder(buyer.id, aff.profile.code, 100_000);
    await earn.onOrderPaid(order.id);
    const c = await prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } });
    await expect(earn.rejectCommission(admin.id, c.id, "")).rejects.toThrow(/reason/);
    const r = await earn.rejectCommission(admin.id, c.id, "Coupon site traffic");
    expect(r.status).toBe("REJECTED");
    expect(r.reason).toBe("Coupon site traffic");
  });

  it("reverses on refund; a paid commission is reversed with a clawback note", async () => {
    const aff = await approvedAffiliate();
    const buyer = await createTestUser();
    const pending = await paidOrder(buyer.id, aff.profile.code, 100_000);
    await earn.onOrderPaid(pending.id);
    await prisma.order.update({ where: { id: pending.id }, data: { status: "REFUNDED" } });
    await earn.onOrderRefunded(pending.id);
    const r1 = await prisma.commission.findUniqueOrThrow({ where: { orderId: pending.id } });
    expect(r1.status).toBe("REVERSED");
    expect(r1.reason).toBe("order refunded");

    const c = await approvedCommission(aff, 60_000);
    await prisma.commission.update({ where: { id: c.id }, data: { status: "PAID" } });
    await earn.onOrderRefunded(c.orderId);
    const r2 = await prisma.commission.findUniqueOrThrow({ where: { id: c.id } });
    expect(r2.status).toBe("REVERSED");
    expect(r2.reason).toMatch(/clawback is manual/);
  });

  it("flags a payout method shared by two affiliates", async () => {
    const shared = upi();
    const a1 = await approvedAffiliate(shared);
    await approvedAffiliate(shared);
    const buyer = await createTestUser();
    await prisma.user.update({ where: { id: buyer.id }, data: { createdAt: new Date(Date.now() - DAY) } });
    const order = await paidOrder(buyer.id, a1.profile.code, 100_000);
    await earn.onOrderPaid(order.id);
    const c = await prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(c.status).toBe("PENDING");
    expect(c.reason).toMatch(/^flagged: .*payout method shared/);
  });

  it("flags a brand-new buyer account on the affiliate's own device", async () => {
    const aff = await approvedAffiliate();
    const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const ua = `Mozilla/5.0 fraud-${uid()}`;
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
    await prisma.session.create({ data: { sessionToken: uid(), userId: aff.user.id, expires: new Date(Date.now() + DAY), userAgent: ua, ipHash } });
    await earn.recordClick(aff.profile.code, { ip, userAgent: ua, landingPath: "/store" });
    const buyer = await createTestUser(); // created just now
    await prisma.session.create({ data: { sessionToken: uid(), userId: buyer.id, expires: new Date(Date.now() + DAY), userAgent: ua, ipHash } });
    const order = await paidOrder(buyer.id, aff.profile.code, 100_000);
    await earn.onOrderPaid(order.id);
    const c = await prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(c.reason).toMatch(/^flagged: .*own device/);
  });
});

describe("payouts", () => {
  it("enforces the minimum", async () => {
    const aff = await approvedAffiliate();
    await approvedCommission(aff, MIN_PAYOUT_CENTS - 100);
    await expect(earn.requestPayout(aff.user.id)).rejects.toBeInstanceOf(PayoutError);
  });

  it("attaches approved commissions, allows one open request, and rejection returns them", async () => {
    const aff = await approvedAffiliate();
    await approvedCommission(aff, 30_000);
    await approvedCommission(aff, 30_000);
    const p = await earn.requestPayout(aff.user.id);
    expect(p.status).toBe("REQUESTED");
    expect(p.amountCents).toBe(60_000);
    expect(await prisma.commission.count({ where: { payoutId: p.id } })).toBe(2);

    await approvedCommission(aff, 60_000);
    await expect(earn.requestPayout(aff.user.id)).rejects.toThrow(/in progress/);

    const rejected = await earn.rejectPayout(admin.id, p.id, "UPI ID bounced");
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.reason).toBe("UPI ID bounced");
    const back = await prisma.commission.findMany({ where: { affiliateId: aff.profile.id } });
    expect(back.every((c) => c.status === "APPROVED" && c.payoutId === null)).toBe(true);

    const summary = await earn.summary(aff.user.id);
    expect(summary!.availableCents).toBe(120_000);
    expect(summary!.canRequestPayout).toBe(true);
  });

  it("approve then mark paid (reference required) pays every attached commission", async () => {
    const aff = await approvedAffiliate();
    await approvedCommission(aff, 55_000);
    const p = await earn.requestPayout(aff.user.id);
    await expect(earn.markPayoutPaid(admin.id, p.id, "UTR1")).rejects.toThrow(/requested/); // must be approved first
    await earn.approvePayout(admin.id, p.id);
    await expect(earn.markPayoutPaid(admin.id, p.id, " ")).rejects.toThrow(/reference/);
    const paid = await earn.markPayoutPaid(admin.id, p.id, "UTR123456789");
    expect(paid.status).toBe("PAID");
    expect(paid.reference).toBe("UTR123456789");
    expect(paid.paidAt).not.toBeNull();
    const cs = await prisma.commission.findMany({ where: { payoutId: p.id } });
    expect(cs.every((c) => c.status === "PAID")).toBe(true);
    const actions = (await prisma.auditLog.findMany({ where: { targetId: p.id } })).map((a) => a.action).sort();
    expect(actions).toEqual(["payout.approve", "payout.paid", "payout.request"]);

    const s = await earn.summary(aff.user.id);
    expect(s!.totals.paid).toBe(55_000);
    expect(s!.availableCents).toBe(0);
    expect(s!.conversions).toBe(1);
  });

  it("only one of two parallel requests succeeds", async () => {
    const aff = await approvedAffiliate();
    await approvedCommission(aff, 70_000);
    const results = await Promise.allSettled([earn.requestPayout(aff.user.id), earn.requestPayout(aff.user.id)]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(PayoutError);
    expect(await prisma.payoutRequest.count({ where: { affiliateId: aff.profile.id } })).toBe(1);
  });

  it("a refund while in an open payout takes the commission out of it", async () => {
    const aff = await approvedAffiliate();
    const keep = await approvedCommission(aff, 50_000);
    const refunded = await approvedCommission(aff, 20_000);
    const p = await earn.requestPayout(aff.user.id);
    expect(p.amountCents).toBe(70_000);
    await prisma.order.update({ where: { id: refunded.orderId }, data: { status: "REFUNDED" } });
    await earn.onOrderRefunded(refunded.orderId);
    const after = await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id }, include: { commissions: true } });
    expect(after.amountCents).toBe(50_000);
    expect(after.commissions.map((c) => c.id)).toEqual([keep.id]);
  });
});
