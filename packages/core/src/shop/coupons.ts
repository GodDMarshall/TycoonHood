/**
 * COUPONS — rupee rail only. A THC price is an amount of someone's time
 * (DR-13); discounting it would quietly change the house exchange rate.
 *
 * Validation is a read; redemption is a write that happens inside the same
 * transaction as the order, through a guarded UPDATE on redeemedCount, so
 * two buyers racing for the last redemption cannot both win. The per-member
 * limit is serialised with a transaction-scoped advisory lock on
 * (coupon, member), so the same member double-submitting cannot exceed it.
 *
 * A redemption whose order is cancelled (abandoned, replaced, or expired
 * unpaid) is released again — an unpaid order should not burn somebody's code.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { Coupon, Prisma, PrismaClient } from "@tycoonhood/db";
import { CouponError } from "./errors";
import { formatInr, MIN_INR_CHARGE_PAISE } from "./pricing";

export type CouponCheck =
  | { ok: true; coupon: Coupon; discountCents: number }
  | { ok: false; reason: string };

export const COUPON_CODE_RE = /^[A-Z0-9_-]{3,32}$/;
export const normaliseCode = (code: string) => code.trim().toUpperCase();

/**
 * Pure: the discount a coupon gives on a subtotal. Percent rounds down to the
 * paisa; an amount is capped at the subtotal; the remaining charge is never
 * pushed below ₹1 (Razorpay's minimum).
 */
export function discountFor(
  coupon: Pick<Coupon, "percentOff" | "amountOffCents">,
  subtotalCents: number
): number {
  let d = 0;
  if (coupon.percentOff != null) d = Math.floor((subtotalCents * coupon.percentOff) / 100);
  else if (coupon.amountOffCents != null) d = coupon.amountOffCents;
  const ceiling = Math.max(0, subtotalCents - MIN_INR_CHARGE_PAISE);
  return Math.max(0, Math.min(d, ceiling));
}

/** Pure: the rules that need no database. */
export function checkCouponRules(
  coupon: Pick<Coupon, "active" | "startsAt" | "endsAt" | "minSubtotalCents" | "maxRedemptions" | "redeemedCount">,
  subtotalCents: number,
  now: Date
): string | null {
  if (!coupon.active) return "This code is not active.";
  if (coupon.startsAt && now < coupon.startsAt) return "This code is not valid yet.";
  if (coupon.endsAt && now > coupon.endsAt) return "This code has expired.";
  if (subtotalCents < coupon.minSubtotalCents) {
    return `This code needs a subtotal of at least ${formatInr(coupon.minSubtotalCents)}.`;
  }
  if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions) {
    return "This code has been fully used.";
  }
  return null;
}

export interface CouponInput {
  code: string;
  description?: string | null;
  percentOff?: number | null;
  amountOffCents?: number | null;
  minSubtotalCents?: number;
  maxRedemptions?: number | null;
  perUserLimit?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  active?: boolean;
}

export function validateCouponInput(input: CouponInput): string | null {
  const code = normaliseCode(input.code);
  if (!COUPON_CODE_RE.test(code)) return "Code: 3–32 characters, letters, digits, - or _.";
  const hasPct = input.percentOff != null;
  const hasAmt = input.amountOffCents != null;
  if (hasPct === hasAmt) return "Give either a percentage or an amount off — exactly one.";
  if (hasPct && (!Number.isInteger(input.percentOff) || input.percentOff! < 1 || input.percentOff! > 100))
    return "Percentage must be a whole number from 1 to 100.";
  if (hasAmt && (!Number.isInteger(input.amountOffCents) || input.amountOffCents! < 1))
    return "Amount off must be a positive whole number of paise.";
  if (input.minSubtotalCents != null && (!Number.isInteger(input.minSubtotalCents) || input.minSubtotalCents < 0))
    return "Minimum subtotal must be zero or more.";
  if (input.maxRedemptions != null && (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1))
    return "Maximum redemptions must be at least 1 (or empty for no limit).";
  if (input.perUserLimit != null && (!Number.isInteger(input.perUserLimit) || input.perUserLimit < 1))
    return "Per-member limit must be at least 1.";
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) return "The end date must be after the start.";
  return null;
}

export class CouponService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Read-only check, used for the preview at checkout. */
  async validate(code: string, userId: string, subtotalCents: number, now = new Date()): Promise<CouponCheck> {
    const c = normaliseCode(code);
    if (!c) return { ok: false, reason: "Enter a code." };
    const coupon = await this.db.coupon.findUnique({ where: { code: c } });
    if (!coupon) return { ok: false, reason: "That code does not exist." };
    const rule = checkCouponRules(coupon, subtotalCents, now);
    if (rule) return { ok: false, reason: rule };
    const used = await this.db.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.perUserLimit) return { ok: false, reason: "You have already used this code." };
    const discountCents = discountFor(coupon, subtotalCents);
    if (discountCents <= 0) return { ok: false, reason: "This code takes nothing off this order." };
    return { ok: true, coupon, discountCents };
  }

  /**
   * Redeems inside the caller's transaction (the one that creates the order).
   * Re-checks every rule against the locked state; throws CouponError when the
   * code can no longer be used, which rolls the order back with it.
   */
  async redeemInTx(
    tx: Prisma.TransactionClient,
    args: { code: string; userId: string; orderId: string; subtotalCents: number; now?: Date }
  ): Promise<{ couponId: string; code: string; discountCents: number }> {
    const now = args.now ?? new Date();
    const code = normaliseCode(args.code);
    const coupon = await tx.coupon.findUnique({ where: { code } });
    if (!coupon) throw new CouponError("That code does not exist.");
    // Serialise this member's redemptions of this coupon for the rest of the transaction.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`coupon:${coupon.id}:${args.userId}`}))`;
    const rule = checkCouponRules({ ...coupon, maxRedemptions: null }, args.subtotalCents, now);
    if (rule) throw new CouponError(rule);
    const used = await tx.couponRedemption.count({ where: { couponId: coupon.id, userId: args.userId } });
    if (used >= coupon.perUserLimit) throw new CouponError("You have already used this code.");
    const discountCents = discountFor(coupon, args.subtotalCents);
    if (discountCents <= 0) throw new CouponError("This code takes nothing off this order.");

    // The guarded increment: the cap is enforced by the row lock, not by the read above.
    const affected = await tx.$executeRaw`
      UPDATE "Coupon" SET "redeemedCount" = "redeemedCount" + 1, "updatedAt" = NOW()
      WHERE "id" = ${coupon.id} AND "active" = true
        AND ("maxRedemptions" IS NULL OR "redeemedCount" < "maxRedemptions")`;
    if (affected === 0) throw new CouponError("This code has been fully used.");

    await tx.couponRedemption.create({ data: { couponId: coupon.id, userId: args.userId, orderId: args.orderId } });
    return { couponId: coupon.id, code, discountCents };
  }

  /** Gives a redemption back (order cancelled before payment). Idempotent. */
  async release(orderId: string) {
    await this.db.$transaction(async (tx) => {
      const r = await tx.couponRedemption.findUnique({ where: { orderId } });
      if (!r) return;
      await tx.couponRedemption.delete({ where: { id: r.id } });
      await tx.$executeRaw`
        UPDATE "Coupon" SET "redeemedCount" = GREATEST("redeemedCount" - 1, 0), "updatedAt" = NOW()
        WHERE "id" = ${r.couponId}`;
    });
  }

  // ---- admin ----

  async list() {
    return this.db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { redemptions: true } } } });
  }

  async create(input: CouponInput) {
    const err = validateCouponInput(input);
    if (err) throw new CouponError(err);
    const code = normaliseCode(input.code);
    if (await this.db.coupon.findUnique({ where: { code } })) throw new CouponError("That code already exists.");
    return this.db.coupon.create({
      data: {
        code,
        description: input.description?.trim() || null,
        percentOff: input.percentOff ?? null,
        amountOffCents: input.amountOffCents ?? null,
        minSubtotalCents: input.minSubtotalCents ?? 0,
        maxRedemptions: input.maxRedemptions ?? null,
        perUserLimit: input.perUserLimit ?? 1,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        // New coupons start inactive unless the admin says otherwise.
        active: input.active ?? false,
      },
    });
  }

  async setActive(id: string, active: boolean) {
    return this.db.coupon.update({ where: { id }, data: { active } });
  }
}

export const coupons = new CouponService();
