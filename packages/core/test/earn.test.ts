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
  payoutBlocker,
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

/** The buyer asks for a refund on this order (the request stays open until decided). */
async function openRefundRequest(orderId: string) {
  const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  return prisma.refundRequest.create({ data: { orderId, userId: o.userId, reason: "Arrived damaged, please refund" } });
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

  it("refuses to approve a commission on an order paid in test mode", async () => {
    const aff = await approvedAffiliate();
    const buyer = await createTestUser();
    await prisma.user.update({ where: { id: buyer.id }, data: { createdAt: new Date(Date.now() - 30 * DAY) } });
    const afterHold = new AffiliateService(prisma, () => new Date(Date.now() + AFFILIATE_HOLD_DAYS * DAY + 60_000));
    const withPayment = async (mode: "TEST" | "LIVE", provider = "razorpay") => {
      const order = await paidOrder(buyer.id, aff.profile.code, 100_000);
      await prisma.payment.create({
        data: { orderId: order.id, provider, mode, status: "CAPTURED", providerOrderId: `order_${uid()}`, amountCents: 100_000, currency: "INR" },
      });
      await earn.onOrderPaid(order.id);
      return prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } });
    };

    // Razorpay test keys, the sandbox, and a test payment later marked refunded.
    const rzpTest = await withPayment("TEST");
    const sandbox = await withPayment("TEST", "sandbox");
    const refunded = await withPayment("TEST");
    await prisma.payment.updateMany({ where: { orderId: refunded.orderId }, data: { status: "REFUNDED" } });
    for (const c of [rzpTest, sandbox, refunded]) {
      expect(c.reason).toMatch(/test-mode payment/);
      await expect(afterHold.approveCommission(admin.id, c.id)).rejects.toThrow(/paid in test mode/);
      expect((await prisma.commission.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("PENDING");
    }
    expect(await prisma.auditLog.count({ where: { action: "commission.approve", targetId: { in: [rzpTest.id, sandbox.id, refunded.id] } } })).toBe(0);
    // It can still be rejected, which is what the message asks for.
    expect((await earn.rejectCommission(admin.id, rzpTest.id, "Test-mode order")).status).toBe("REJECTED");

    // A live payment is approved as before.
    const live = await withPayment("LIVE");
    expect(live.reason).toBeNull();
    expect((await afterHold.approveCommission(admin.id, live.id)).status).toBe("APPROVED");
  });

  it("refuses approval while a refund request is open on the order, or while the affiliate is suspended", async () => {
    const aff = await approvedAffiliate();
    const buyer = await createTestUser();
    await prisma.user.update({ where: { id: buyer.id }, data: { createdAt: new Date(Date.now() - 30 * DAY) } });
    const order = await paidOrder(buyer.id, aff.profile.code, 100_000);
    await earn.onOrderPaid(order.id);
    const c = await prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } });
    const afterHold = new AffiliateService(prisma, () => new Date(Date.now() + AFFILIATE_HOLD_DAYS * DAY + 60_000));

    // The buyer asked on day 13; on day 14 the hold has passed and the request is still open.
    const req = await openRefundRequest(order.id);
    await expect(afterHold.approveCommission(admin.id, c.id)).rejects.toThrow(/refund request is open/);
    await prisma.refundRequest.update({ where: { id: req.id }, data: { status: "APPROVED" } }); // being refunded now
    await expect(afterHold.approveCommission(admin.id, c.id)).rejects.toThrow(/refund request is open/);
    // The admin queue shows it.
    const row = (await earn.listCommissions({ affiliateId: aff.profile.id })).rows.find((r) => r.id === c.id)!;
    expect(row.order.refundRequests.map((r) => r.status)).toEqual(["APPROVED"]);
    expect(row.affiliate.status).toBe("APPROVED");

    // Declined, so the order stands; but a suspended affiliate's commission waits.
    await prisma.refundRequest.update({ where: { id: req.id }, data: { status: "REJECTED" } });
    await earn.suspend(admin.id, aff.profile.id, "Under review");
    await expect(afterHold.approveCommission(admin.id, c.id)).rejects.toThrow(/affiliate is suspended/);
    expect((await earn.listCommissions({ affiliateId: aff.profile.id })).rows.find((r) => r.id === c.id)).toMatchObject({
      affiliate: { status: "SUSPENDED" },
      order: { refundRequests: [] },
    });
    expect((await prisma.commission.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("PENDING");
    expect(await prisma.auditLog.count({ where: { action: "commission.approve", targetId: c.id } })).toBe(0);

    await earn.approve(admin.id, aff.profile.id); // reinstated
    expect((await afterHold.approveCommission(admin.id, c.id)).status).toBe("APPROVED");
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

  it("a payout request leaves out a commission whose order has a refund request open, and the summary says so", async () => {
    const aff = await approvedAffiliate();
    const kept = await approvedCommission(aff, 60_000);
    const held = await approvedCommission(aff, 55_000);
    const req = await openRefundRequest(held.orderId);
    expect(await earn.summary(aff.user.id)).toMatchObject({ availableCents: 60_000, heldCents: 55_000, canRequestPayout: true });

    const p = await earn.requestPayout(aff.user.id);
    expect(p.amountCents).toBe(60_000);
    expect((await prisma.commission.findMany({ where: { payoutId: p.id } })).map((c) => c.id)).toEqual([kept.id]);
    expect((await prisma.commission.findUniqueOrThrow({ where: { id: held.id } })).payoutId).toBeNull();

    // Once the refund is declined it is available again.
    await prisma.refundRequest.update({ where: { id: req.id }, data: { status: "REJECTED" } });
    expect(await earn.summary(aff.user.id)).toMatchObject({ availableCents: 55_000, heldCents: 0 });

    // Held commissions alone never make up a request.
    const solo = await approvedAffiliate();
    const only = await approvedCommission(solo, 70_000);
    await openRefundRequest(only.orderId);
    expect(await earn.summary(solo.user.id)).toMatchObject({ availableCents: 0, heldCents: 70_000, canRequestPayout: false });
    await expect(earn.requestPayout(solo.user.id)).rejects.toThrow(/₹0 available/);
  });

  it("a payout is not approved or paid while a refund request is open on one of its orders, or while the affiliate is suspended", async () => {
    const aff = await approvedAffiliate();
    const refunding = await approvedCommission(aff, 30_000);
    await approvedCommission(aff, 30_000);
    const p = await earn.requestPayout(aff.user.id);

    // The buyer asks for a refund after the payout was requested.
    const req = await openRefundRequest(refunding.orderId);
    await expect(earn.approvePayout(admin.id, p.id)).rejects.toThrow(/refund request is open/);
    expect((await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("REQUESTED");
    await prisma.refundRequest.update({ where: { id: req.id }, data: { status: "REJECTED" } });
    expect((await earn.approvePayout(admin.id, p.id)).status).toBe("APPROVED");

    const again = await openRefundRequest(refunding.orderId);
    await expect(earn.markPayoutPaid(admin.id, p.id, "UTR1")).rejects.toThrow(/refund request is open/);
    await prisma.refundRequest.update({ where: { id: again.id }, data: { status: "REJECTED" } });

    await earn.suspend(admin.id, aff.profile.id, "Fraud check");
    await expect(earn.markPayoutPaid(admin.id, p.id, "UTR1")).rejects.toThrow(/affiliate is suspended/);
    const still = await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id }, include: { commissions: true } });
    expect(still.status).toBe("APPROVED");
    expect(still.commissions.every((c) => c.status === "APPROVED")).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "payout.paid", targetId: p.id } })).toBe(0);
    // Declining still works and gives the commissions back.
    expect((await earn.rejectPayout(admin.id, p.id, "Account suspended")).status).toBe("REJECTED");

    // A request made before the suspension is not approved either.
    await earn.approve(admin.id, aff.profile.id);
    const p2 = await earn.requestPayout(aff.user.id);
    await earn.suspend(admin.id, aff.profile.id, "Fraud check");
    await expect(earn.approvePayout(admin.id, p2.id)).rejects.toThrow(/affiliate is suspended/);
  });

  it("payoutBlocker reads only refund requests that are still open, refunded orders, and whether the payout adds up", () => {
    type Refund = "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";
    const line = (refunds: Refund[] = [], order: "PAID" | "FULFILLED" | "REFUNDED" = "PAID", status: "APPROVED" | "REVERSED" = "APPROVED") => ({
      amountCents: 30_000,
      status,
      order: { status: order, refundRequests: refunds.map((s) => ({ status: s })) },
    });
    const payout = (affiliate: "APPROVED" | "SUSPENDED", ...commissions: ReturnType<typeof line>[]) => ({
      amountCents: commissions.reduce((s, c) => s + c.amountCents, 0),
      affiliate: { status: affiliate },
      commissions,
    });
    expect(payoutBlocker(payout("APPROVED", line(["REJECTED", "REFUNDED"]), line([], "FULFILLED")))).toBeNull();
    expect(payoutBlocker(payout("APPROVED", line(), line(["REQUESTED"])))).toMatch(/refund request is open/);
    expect(payoutBlocker(payout("SUSPENDED", line()))).toMatch(/suspended/);
    expect(payoutBlocker(payout("APPROVED", line(), line([], "REFUNDED")))).toMatch(/was refunded/);
    expect(payoutBlocker(payout("APPROVED", line(), line([], "PAID", "REVERSED")))).toMatch(/do not add up/);
    expect(payoutBlocker({ ...payout("APPROVED", line()), amountCents: 40_000 })).toMatch(/do not add up/);
  });

  it("a refund that would empty an open payout closes it, and the refunded commission is never paid", async () => {
    const aff = await approvedAffiliate();
    const c = await approvedCommission(aff, 60_000); // ₹600 on a ₹6,000 order
    const p = await earn.requestPayout(aff.user.id);
    await earn.approvePayout(admin.id, p.id);

    await prisma.order.update({ where: { id: c.orderId }, data: { status: "REFUNDED" } });
    await earn.onOrderRefunded(c.orderId);

    const after = await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id }, include: { commissions: true } });
    expect(after).toMatchObject({ status: "REJECTED", amountCents: 60_000, reason: "Every commission in it was refunded." });
    expect(after.commissions).toEqual([]);
    expect(await prisma.commission.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ status: "REVERSED", payoutId: null });
    expect(await prisma.auditLog.count({ where: { action: "payout.close", targetId: p.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "commission.reverse_failed", targetId: c.orderId } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: aff.user.id, title: "Payout request closed" } })).toBe(1);
    await expect(earn.markPayoutPaid(admin.id, p.id, "UTR1")).rejects.toThrow(/rejected/);

    // Running the hook again changes nothing.
    await earn.onOrderRefunded(c.orderId);
    expect(await prisma.auditLog.count({ where: { action: "commission.reverse", targetId: c.id } })).toBe(1);
  });

  it("a two-commission payout whose orders are both refunded in turn is lowered, then closed", async () => {
    const aff = await approvedAffiliate();
    const first = await approvedCommission(aff, 60_000);
    const second = await approvedCommission(aff, 60_000);
    const p = await earn.requestPayout(aff.user.id);
    expect(p.amountCents).toBe(120_000);

    await prisma.order.update({ where: { id: first.orderId }, data: { status: "REFUNDED" } });
    await earn.onOrderRefunded(first.orderId);
    expect(await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ status: "REQUESTED", amountCents: 60_000 });

    await prisma.order.update({ where: { id: second.orderId }, data: { status: "REFUNDED" } });
    await earn.onOrderRefunded(second.orderId);
    expect(await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ status: "REJECTED", reason: "Every commission in it was refunded." });
    const cs = await prisma.commission.findMany({ where: { id: { in: [first.id, second.id] } } });
    expect(cs).toHaveLength(2);
    expect(cs.every((c) => c.status === "REVERSED" && c.payoutId === null)).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "commission.reverse_failed", targetId: { in: [first.orderId, second.orderId] } } })).toBe(0);
    expect(await earn.summary(aff.user.id)).toMatchObject({ availableCents: 0, canRequestPayout: false });
  });

  it("a refund that takes a payout below the minimum closes it and gives the rest back", async () => {
    const aff = await approvedAffiliate();
    const rest = await approvedCommission(aff, 40_000);
    const refunded = await approvedCommission(aff, 30_000);
    const p = await earn.requestPayout(aff.user.id);
    expect(p.amountCents).toBe(70_000);

    await prisma.order.update({ where: { id: refunded.orderId }, data: { status: "REFUNDED" } });
    await earn.onOrderRefunded(refunded.orderId);

    const after = await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.status).toBe("REJECTED");
    expect(after.reason).toBe("A refund took it below the ₹500 minimum.");
    expect(await prisma.commission.findUniqueOrThrow({ where: { id: rest.id } })).toMatchObject({ status: "APPROVED", payoutId: null });
    expect(await prisma.commission.findUniqueOrThrow({ where: { id: refunded.id } })).toMatchObject({ status: "REVERSED", payoutId: null });
    expect(await prisma.auditLog.findFirst({ where: { action: "payout.close", targetId: p.id } })).toMatchObject({ meta: { returned: 1 } });
    expect(await earn.summary(aff.user.id)).toMatchObject({ availableCents: 40_000, canRequestPayout: false });

    // Topped up later, the member can request again.
    await approvedCommission(aff, 20_000);
    expect((await earn.requestPayout(aff.user.id)).amountCents).toBe(60_000);
  });

  it("a refund that lands while the payout is being paid waits for it, then records a manual clawback", async () => {
    const aff = await approvedAffiliate();
    const c = await approvedCommission(aff, 60_000);
    const p = await earn.requestPayout(aff.user.id);
    await earn.approvePayout(admin.id, p.id);

    // Pay the way markPayoutPaid does, holding the affiliate's row lock.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let holding!: () => void;
    const held = new Promise<void>((r) => (holding = r));
    const paying = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "AffiliateProfile" WHERE id = ${aff.profile.id} FOR UPDATE`;
        holding();
        await gate;
        await tx.payoutRequest.update({ where: { id: p.id }, data: { status: "PAID", paidAt: new Date(), reference: "UTR-RACE" } });
        await tx.commission.updateMany({ where: { payoutId: p.id, status: "APPROVED" }, data: { status: "PAID" } });
      },
      { timeout: 30_000 }
    );
    await held;
    await prisma.order.update({ where: { id: c.orderId }, data: { status: "REFUNDED" } });
    const reversing = earn.onOrderRefunded(c.orderId);
    await new Promise((r) => setTimeout(r, 300)); // the reversal is now waiting for the lock
    release();
    await paying;
    await reversing;

    expect(await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ status: "PAID", amountCents: 60_000 });
    const after = await prisma.commission.findUniqueOrThrow({ where: { id: c.id } });
    expect(after).toMatchObject({ status: "REVERSED", payoutId: p.id });
    expect(after.reason).toMatch(/clawback is manual/);
    expect(await prisma.auditLog.count({ where: { action: "commission.reverse_failed", targetId: c.orderId } })).toBe(0);
  });

  it("a refund racing markPayoutPaid ends one way or the other, never both", async () => {
    for (let round = 0; round < 4; round++) {
      const aff = await approvedAffiliate();
      const c = await approvedCommission(aff, 60_000);
      const p = await earn.requestPayout(aff.user.id);
      await earn.approvePayout(admin.id, p.id);
      const refund = async () => {
        await prisma.order.update({ where: { id: c.orderId }, data: { status: "REFUNDED" } });
        await earn.onOrderRefunded(c.orderId);
      };
      const [paid] = await Promise.allSettled([earn.markPayoutPaid(admin.id, p.id, `UTR-${round}`), refund()]);

      const payout = await prisma.payoutRequest.findUniqueOrThrow({ where: { id: p.id } });
      const after = await prisma.commission.findUniqueOrThrow({ where: { id: c.id } });
      expect(after.status).toBe("REVERSED");
      if (paid.status === "fulfilled") {
        // Paid first: the reversal saw it and flagged the money to recover.
        expect(payout.status).toBe("PAID");
        expect(after.reason).toMatch(/clawback is manual/);
      } else {
        // Refunded first: paying was refused and the request closed with nothing in it.
        expect(payout.status).toBe("REJECTED");
        expect(after.payoutId).toBeNull();
      }
      expect(await prisma.auditLog.count({ where: { action: "commission.reverse_failed", targetId: c.orderId } })).toBe(0);
    }
  });

  it("a failed reversal is audited, keeps the payout blocked, and an admin can run it again", async () => {
    const aff = await approvedAffiliate();
    const c = await approvedCommission(aff, 60_000);
    await approvedCommission(aff, 60_000);
    const p = await earn.requestPayout(aff.user.id);
    await prisma.order.update({ where: { id: c.orderId }, data: { status: "REFUNDED" } });

    // The database drops the reversal's transaction.
    const down = new Proxy(prisma, {
      get: (target, key) => (key === "$transaction" ? () => Promise.reject(new Error("connection reset")) : Reflect.get(target, key)),
    });
    await expect(new AffiliateService(down).onOrderRefunded(c.orderId)).resolves.toBeUndefined();
    const failure = await prisma.auditLog.findFirstOrThrow({ where: { action: "commission.reverse_failed", targetId: c.orderId } });
    expect(failure).toMatchObject({ actorId: null, targetType: "order", meta: { error: "connection reset" } });

    // The payout cannot go ahead with the refunded order still in it.
    await expect(earn.approvePayout(admin.id, p.id)).rejects.toThrow(/was refunded/);
    expect((await earn.listUnreversed()).find((r) => r.id === c.id)).toMatchObject({
      status: "APPROVED",
      payoutId: p.id,
      affiliate: { code: aff.profile.code },
      lastFailure: { error: "connection reset" },
    });

    const standing = await approvedCommission(aff, 10_000);
    await expect(earn.reverseRefunded(admin.id, standing.id)).rejects.toThrow(/not refunded/);
    expect(await earn.reverseRefunded(admin.id, c.id)).toMatchObject({ status: "REVERSED", payoutId: null });
    expect(await prisma.auditLog.count({ where: { action: "commission.reverse", targetId: c.id, actorId: admin.id } })).toBe(1);
    expect((await earn.listUnreversed()).some((r) => r.id === c.id)).toBe(false);
    expect(await earn.approvePayout(admin.id, p.id)).toMatchObject({ status: "APPROVED", amountCents: 60_000 });
  });

  it("a payout whose amount no longer matches its commissions is not approved", async () => {
    const aff = await approvedAffiliate();
    await approvedCommission(aff, 60_000);
    const p = await earn.requestPayout(aff.user.id);
    await prisma.payoutRequest.update({ where: { id: p.id }, data: { amountCents: 70_000 } });
    await expect(earn.approvePayout(admin.id, p.id)).rejects.toThrow(/do not add up/);
    expect((await earn.rejectPayout(admin.id, p.id, "Amount does not match")).status).toBe("REJECTED");
  });
});
