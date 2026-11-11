import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import { LedgerService, InsufficientFundsError } from "../src/ledger/ledger";
import {
  CartService, CouponService, ShopCheckoutService, RefundService, RazorpayProvider, SandboxProvider,
  cartTotals, discountFor, checkCouponRules, verifyCheckoutSignature, verifyWebhookSignature,
  setEarnHooks, orderTimeline, refundBlocker, paymentsStatus, activeShopProvider, CartError, CouponError,
  PaymentVerificationError,
} from "../src/shop";
import { hmacSha256Hex } from "../src/shop/payments/razorpay";
import { createTestUser, uid } from "./helpers";

const ledger = new LedgerService(prisma);
const cart = new CartService(prisma);
const couponSvc = new CouponService(prisma);
const sandbox = new SandboxProvider();
const checkout = new ShopCheckoutService(prisma, { provider: () => sandbox, sandboxEnabled: () => true });
const refundSvc = new RefundService(prisma);

const ADDRESS = { fullName: "Test Buyer", line1: "1 Test Street", city: "Pune", postalCode: "411001", country: "IN" };
const created: string[] = [];

async function fund(userId: string, amount: bigint) {
  await ledger.reward({ userId, amount, reason: "REWARD_ADMIN", idempotencyKey: `fund-${uid()}` });
}

async function product(opts: {
  kind?: "DIGITAL" | "PHYSICAL" | "COURSE";
  priceThc?: bigint | null;
  inr?: number | null;
  inventory?: number | null;
}) {
  const p = await prisma.product.create({
    data: {
      slug: `shoptest-${uid().slice(0, 8)}`,
      kind: opts.kind ?? "PHYSICAL",
      name: "Shop test item",
      description: "test",
      active: true,
      priceThc: opts.priceThc === undefined ? 1000n : opts.priceThc,
      priceFiatCents: opts.inr === undefined ? 50_000 : opts.inr,
      fiatCurrency: "INR",
      inventory: opts.inventory === undefined ? 10 : opts.inventory,
    },
  });
  created.push(p.id);
  return p;
}

async function coupon(data: Partial<Parameters<typeof prisma.coupon.create>[0]["data"]> = {}) {
  return prisma.coupon.create({
    data: { code: `T${uid().slice(0, 8).toUpperCase()}`, percentOff: 10, active: true, ...data },
  });
}

let paidSpy = vi.fn(async (_id: string) => {});
let refundedSpy = vi.fn(async (_id: string) => {});
beforeEach(() => {
  paidSpy = vi.fn(async () => {});
  refundedSpy = vi.fn(async () => {});
  setEarnHooks({ onOrderPaid: paidSpy, onOrderRefunded: refundedSpy });
});

afterAll(async () => {
  setEarnHooks(undefined); // back to the default (affiliates)
  await prisma.product.updateMany({ where: { id: { in: created } }, data: { active: false } });
});

describe("Shop — earn hooks registry", () => {
  it("defaults to the EARN affiliates service when nothing is registered", async () => {
    const { affiliates } = await import("../src/earn/affiliates");
    const { getEarnHooks } = await import("../src/shop");
    setEarnHooks(undefined);
    expect(getEarnHooks()).toBe(affiliates);
    setEarnHooks(null);
    expect(getEarnHooks()).toBeNull();
  });
});

describe("Shop — cart maths", () => {
  it("totals per rail, flags unpriced lines and blocked lines", () => {
    const t = cartTotals([
      { lineKey: "a:-", qty: 2, unitThc: 100n, unitInrPaise: 5000, physical: true, problem: null },
      { lineKey: "b:-", qty: 3, unitThc: null, unitInrPaise: 1999, physical: false, problem: null },
    ]);
    expect(t.itemCount).toBe(5);
    expect(t.thc.total).toBe(200n);
    expect(t.thc.payable).toBe(false);
    expect(t.thc.unpriced).toEqual(["b:-"]);
    expect(t.inr.total).toBe(2 * 5000 + 3 * 1999);
    expect(t.inr.payable).toBe(true);
    expect(t.needsAddress).toBe(true);

    const blocked = cartTotals([{ lineKey: "a:-", qty: 1, unitThc: 1n, unitInrPaise: 1, physical: false, problem: "Sold out." }]);
    expect(blocked.thc.payable).toBe(false);
    expect(blocked.inr.payable).toBe(false);
    expect(cartTotals([]).inr.payable).toBe(false);
  });

  it("adds, merges, caps at 20, updates, removes; rejects inactive products", async () => {
    const user = await createTestUser();
    const p = await product({});
    await cart.add(user.id, p.id, null, 3);
    await cart.add(user.id, p.id, null, 2);
    const first = await cart.list(user.id);
    let lines = first.lines;
    const totals = first.totals;
    expect(lines).toHaveLength(1);
    expect(lines[0].lineKey).toBe(`${p.id}:-`);
    expect(lines[0].qty).toBe(5);
    expect(totals.inr.total).toBe(5 * 50_000);
    expect(totals.thc.total).toBe(5000n);

    await expect(cart.add(user.id, p.id, null, 16)).rejects.toBeInstanceOf(CartError);
    await expect(cart.add(user.id, p.id, null, 0)).rejects.toBeInstanceOf(CartError);
    await cart.update(user.id, `${p.id}:-`, 20);
    await expect(cart.update(user.id, `${p.id}:-`, 21)).rejects.toBeInstanceOf(CartError);
    lines = (await cart.list(user.id)).lines;
    expect(lines[0].problem).toMatch(/Only 10 left/);
    await cart.update(user.id, `${p.id}:-`, 0);
    expect(await cart.count(user.id)).toBe(0);

    const off = await product({});
    await prisma.product.update({ where: { id: off.id }, data: { active: false } });
    await expect(cart.add(user.id, off.id)).rejects.toBeInstanceOf(CartError);
  });

  it("requires a size for a sized product and keys lines by size", async () => {
    const user = await createTestUser();
    const p = await product({ inventory: null });
    const [s, m] = await Promise.all(
      ["S", "M"].map((label, i) =>
        prisma.productVariant.create({ data: { productId: p.id, sku: `${p.slug}-${label}`, label, inventory: 3, sortOrder: i } })
      )
    );
    await expect(cart.add(user.id, p.id)).rejects.toBeInstanceOf(CartError);
    await cart.add(user.id, p.id, s.id);
    await cart.add(user.id, p.id, m.id, 2);
    const { lines } = await cart.list(user.id);
    expect(lines.map((l) => l.lineKey).sort()).toEqual([`${p.id}:${m.id}`, `${p.id}:${s.id}`].sort());
  });
});

describe("Shop — coupons", () => {
  it("applies percent and amount rules, minimum subtotal and date window", () => {
    expect(discountFor({ percentOff: 10, amountOffCents: null }, 12_345)).toBe(1234);
    expect(discountFor({ percentOff: null, amountOffCents: 50_000 }, 20_000)).toBe(20_000 - 100); // never below ₹1
    const now = new Date("2026-11-11T00:00:00Z");
    const base = { active: true, startsAt: null, endsAt: null, minSubtotalCents: 0, maxRedemptions: null, redeemedCount: 0 };
    expect(checkCouponRules(base, 100, now)).toBeNull();
    expect(checkCouponRules({ ...base, active: false }, 100, now)).toMatch(/not active/);
    expect(checkCouponRules({ ...base, minSubtotalCents: 1000 }, 999, now)).toMatch(/at least/);
    expect(checkCouponRules({ ...base, startsAt: new Date("2026-12-01") }, 100, now)).toMatch(/not valid yet/);
    expect(checkCouponRules({ ...base, endsAt: new Date("2026-11-01") }, 100, now)).toMatch(/expired/);
    expect(checkCouponRules({ ...base, maxRedemptions: 2, redeemedCount: 2 }, 100, now)).toMatch(/fully used/);
  });

  it("enforces the per-member limit at redemption", async () => {
    const user = await createTestUser();
    const c = await coupon({ perUserLimit: 1 });
    const p = await product({ inventory: null, kind: "DIGITAL" });

    await cart.add(user.id, p.id);
    const quote = await checkout.quoteInr(user.id, c.code);
    expect(quote.discountCents).toBe(5000);
    const first = await checkout.startInrCheckout(user.id, { couponCode: c.code });
    expect(first.order.discountCents).toBe(5000);
    expect(first.order.totalFiatCents).toBe(45_000);
    expect(first.payment.amountCents).toBe(45_000);
    await checkout.sandboxCapture(user.id, first.order.id);

    await cart.add(user.id, p.id);
    expect((await couponSvc.validate(c.code, user.id, 50_000)).ok).toBe(false);
    await expect(checkout.startInrCheckout(user.id, { couponCode: c.code })).rejects.toBeInstanceOf(CouponError);
    // Nothing was left reserved or pending by the refused attempt.
    expect(await prisma.order.count({ where: { userId: user.id, status: "PENDING" } })).toBe(0);
  });

  it("never exceeds maxRedemptions under concurrency", async () => {
    const c = await coupon({ maxRedemptions: 3, perUserLimit: 1 });
    const p = await product({ inventory: null, kind: "DIGITAL" });
    const buyers = await Promise.all(Array.from({ length: 8 }, () => createTestUser()));
    for (const b of buyers) await cart.add(b.id, p.id);

    const results = await Promise.allSettled(buyers.map((b) => checkout.startInrCheckout(b.id, { couponCode: c.code })));
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(3);
    for (const r of results) if (r.status === "rejected") expect(r.reason).toBeInstanceOf(CouponError);
    const after = await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.redeemedCount).toBe(3);
    expect(await prisma.couponRedemption.count({ where: { couponId: c.id } })).toBe(3);
  });

  it("a failed payment gives the redemption and the stock back", async () => {
    const user = await createTestUser();
    const c = await coupon({ maxRedemptions: 1 });
    const p = await product({ inventory: 2 });
    await cart.add(user.id, p.id, null, 2);
    const { order } = await checkout.startInrCheckout(user.id, { couponCode: c.code, shipping: ADDRESS });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(0);

    await checkout.sandboxFail(user.id, order.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(2);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).redeemedCount).toBe(0);
    expect(await prisma.couponRedemption.count({ where: { orderId: order.id } })).toBe(0);
    expect(paidSpy).not.toHaveBeenCalled();
  });
});

describe("Shop — THC checkout", () => {
  it("multi-item: one ledger spend for the total, stock per line, cart cleared", async () => {
    const user = await createTestUser();
    const a = await product({ priceThc: 300n, inventory: 5 });
    const b = await product({ priceThc: 200n, inventory: null, kind: "DIGITAL" });
    await cart.add(user.id, a.id, null, 2);
    await cart.add(user.id, b.id, null, 1);
    await fund(user.id, 1000n);

    const order = await checkout.checkoutThc(user.id, { shipping: ADDRESS });
    expect(order.status).toBe("PAID"); // physical line keeps it PAID until shipped
    expect(order.totalThc).toBe(800n);
    expect(order.items).toHaveLength(2);
    const tx = await prisma.ledgerTransaction.findUniqueOrThrow({ where: { id: order.ledgerTxId! } });
    expect(tx.sourceId).toBe(order.id);
    expect(await ledger.getBalance((await ledger.ensureUserAccount(user.id)).id)).toBe(200n);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: a.id } })).inventory).toBe(3);
    expect(await cart.count(user.id)).toBe(0);
    expect(paidSpy).not.toHaveBeenCalled(); // commissions are a rupee-rail concern
  });

  it("insufficient balance → nothing taken: no stock, no THC, cart intact", async () => {
    const user = await createTestUser();
    const a = await product({ priceThc: 600n, inventory: 4 });
    const b = await product({ priceThc: 600n, inventory: 4 });
    await cart.add(user.id, a.id);
    await cart.add(user.id, b.id);
    await fund(user.id, 1000n);

    await expect(checkout.checkoutThc(user.id, { shipping: ADDRESS })).rejects.toBeInstanceOf(InsufficientFundsError);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: a.id } })).inventory).toBe(4);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: b.id } })).inventory).toBe(4);
    expect(await ledger.getBalance((await ledger.ensureUserAccount(user.id)).id)).toBe(1000n);
    expect(await cart.count(user.id)).toBe(2);
    expect(await prisma.order.count({ where: { userId: user.id, status: { in: ["PAID", "FULFILLED"] } } })).toBe(0);
  });

  it("a sold-out second line releases the first line's reservation", async () => {
    const user = await createTestUser();
    const a = await product({ priceThc: 10n, inventory: 5 });
    const b = await product({ priceThc: 10n, inventory: 1 });
    await cart.add(user.id, a.id, null, 2);
    await cart.add(user.id, b.id, null, 1);
    await fund(user.id, 100n);
    // Someone else takes the last unit of b after it was carted.
    await prisma.product.update({ where: { id: b.id }, data: { inventory: 0 } });
    await expect(checkout.checkoutThc(user.id, { shipping: ADDRESS })).rejects.toThrow();
    expect((await prisma.product.findUniqueOrThrow({ where: { id: a.id } })).inventory).toBe(5);
    expect(await ledger.getBalance((await ledger.ensureUserAccount(user.id)).id)).toBe(100n);
  });
});

describe("Shop — INR rail (sandbox)", () => {
  it("sandbox checkout → PAID, TEST payment, cart cleared, earn hook called once", async () => {
    const user = await createTestUser();
    const p = await product({ kind: "DIGITAL", inventory: null, inr: 29_900 });
    await cart.add(user.id, p.id, null, 2);
    const { order, payment } = await checkout.startInrCheckout(user.id, { affiliateCode: "CREATOR1" });
    expect(order.status).toBe("PENDING");
    expect(order.affiliateCode).toBe("CREATOR1");
    expect(order.fiatCurrency).toBe("INR");
    expect(payment.mode).toBe("TEST");
    expect(payment.provider).toBe("sandbox");
    expect(payment.amountCents).toBe(59_800);

    const r = await checkout.sandboxCapture(user.id, order.id);
    expect(r.outcome).toBe("paid");
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true, items: { include: { product: true } } } });
    expect(after.status).toBe("FULFILLED"); // digital: instant
    expect(after.payments[0].status).toBe("CAPTURED");
    expect(await cart.count(user.id)).toBe(0);
    expect(paidSpy).toHaveBeenCalledTimes(1);
    expect(paidSpy).toHaveBeenCalledWith(order.id);

    // A second capture is a no-op and does not call the hook again.
    await expect(checkout.sandboxCapture(user.id, order.id)).resolves.toMatchObject({ outcome: "duplicate" });
    expect(paidSpy).toHaveBeenCalledTimes(1);

    const steps = orderTimeline(after);
    expect(steps.find((s) => s.key === "paid")?.detail).toMatch(/Test mode/);
  });

  it("the sandbox cannot capture when disabled (production)", async () => {
    const prodLike = new ShopCheckoutService(prisma, { provider: () => sandbox, sandboxEnabled: () => false });
    const user = await createTestUser();
    const p = await product({ kind: "DIGITAL", inventory: null });
    await cart.add(user.id, p.id);
    const { order } = await prodLike.startInrCheckout(user.id);
    await expect(prodLike.sandboxCapture(user.id, order.id)).rejects.toThrow(/disabled/);
  });

  it("provider resolution: keys → razorpay LIVE; no keys + dev → sandbox; production without keys → none", () => {
    expect(activeShopProvider({ RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "s" })?.name).toBe("razorpay");
    expect(activeShopProvider({ DEV_MODE: "true", NODE_ENV: "development" })?.name).toBe("sandbox");
    expect(activeShopProvider({ DEV_MODE: "true", NODE_ENV: "production" })).toBeNull();
    expect(activeShopProvider({ NODE_ENV: "development" })).toBeNull();
    expect(paymentsStatus({ DEV_MODE: "true", NODE_ENV: "production" }).provider).toBeNull();
    expect(paymentsStatus({ DEV_MODE: "true", NODE_ENV: "test" }).mode).toBe("TEST");
    // Razorpay test keys are TEST (out of revenue); live keys are LIVE.
    expect(paymentsStatus({ RAZORPAY_KEY_ID: "rzp_test_abc", RAZORPAY_KEY_SECRET: "s" }).mode).toBe("TEST");
    expect(paymentsStatus({ RAZORPAY_KEY_ID: "rzp_live_abc", RAZORPAY_KEY_SECRET: "s" }).mode).toBe("LIVE");
  });
});

describe("Shop — Razorpay signatures and webhook", () => {
  const KEY_SECRET = "test_key_secret_for_unit_tests";
  const WEBHOOK_SECRET = "test_webhook_secret_for_unit_tests";

  it("verifies the checkout signature (valid / tampered / wrong secret)", () => {
    const sig = hmacSha256Hex(KEY_SECRET, "order_ABC|pay_XYZ");
    expect(verifyCheckoutSignature({ razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_XYZ", signature: sig }, KEY_SECRET)).toBe(true);
    expect(verifyCheckoutSignature({ razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_OTHER", signature: sig }, KEY_SECRET)).toBe(false);
    expect(verifyCheckoutSignature({ razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_XYZ", signature: sig }, "other")).toBe(false);
    expect(verifyCheckoutSignature({ razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_XYZ", signature: "zz" }, KEY_SECRET)).toBe(false);
    const body = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(body, hmacSha256Hex(WEBHOOK_SECRET, body), WEBHOOK_SECRET)).toBe(true);
    expect(verifyWebhookSignature(body + " ", hmacSha256Hex(WEBHOOK_SECRET, body), WEBHOOK_SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, null, WEBHOOK_SECRET)).toBe(false);
  });

  function fakeRazorpay() {
    const calls: { url: string; body: unknown; auth: string }[] = [];
    const fetchImpl = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push({ url, body, auth: init.headers.Authorization });
      const id = url.endsWith("/orders") ? `order_${uid().slice(0, 12)}` : `rfnd_${uid().slice(0, 12)}`;
      return { ok: true, status: 200, json: async () => ({ id, ...body }), text: async () => "" };
    };
    return { provider: new RazorpayProvider("rzp_test_key", KEY_SECRET, fetchImpl), calls };
  }

  it("callback signature → PAID; webhook for the same payment is idempotent", async () => {
    const { provider, calls } = fakeRazorpay();
    const live = new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider });
    const user = await createTestUser();
    const p = await product({ kind: "DIGITAL", inventory: null, inr: 10_000 });
    await cart.add(user.id, p.id);
    const { order, payment } = await live.startInrCheckout(user.id);
    expect(payment.mode).toBe("TEST"); // rzp_test_ keys never count as revenue
    expect(calls[0].url).toMatch(/\/v1\/orders$/);
    expect(calls[0].auth).toBe(`Basic ${Buffer.from(`rzp_test_key:${KEY_SECRET}`).toString("base64")}`);
    expect(calls[0].body).toMatchObject({ amount: 10_000, currency: "INR", receipt: order.id });

    const paymentId = `pay_${uid().slice(0, 12)}`;
    await expect(
      live.verifyRazorpayCallback(user.id, { razorpayOrderId: payment.providerOrderId!, razorpayPaymentId: paymentId, signature: "bad" })
    ).rejects.toBeInstanceOf(PaymentVerificationError);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");

    const sig = hmacSha256Hex(KEY_SECRET, `${payment.providerOrderId}|${paymentId}`);
    const r = await live.verifyRazorpayCallback(user.id, { razorpayOrderId: payment.providerOrderId!, razorpayPaymentId: paymentId, signature: sig });
    expect(r.outcome).toBe("paid");

    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: paymentId, order_id: payment.providerOrderId, amount: 10_000, currency: "INR", status: "captured" } } },
    });
    const hook = hmacSha256Hex(WEBHOOK_SECRET, body);
    expect((await live.handleRazorpayWebhook(body, "nope", WEBHOOK_SECRET)).status).toBe(400);
    const w1 = await live.handleRazorpayWebhook(body, hook, WEBHOOK_SECRET);
    const w2 = await live.handleRazorpayWebhook(body, hook, WEBHOOK_SECRET);
    expect(w1).toMatchObject({ status: 200, body: { outcome: "duplicate" } });
    expect(w2).toMatchObject({ status: 200, body: { outcome: "duplicate" } });
    expect(paidSpy).toHaveBeenCalledTimes(1);
    expect(await prisma.payment.count({ where: { providerPaymentId: paymentId } })).toBe(1);
  });

  it("webhook alone settles an order exactly once, and rejects a wrong amount", async () => {
    const { provider } = fakeRazorpay();
    const live = new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider });
    const user = await createTestUser();
    const p = await product({ kind: "DIGITAL", inventory: null, inr: 20_000 });
    await cart.add(user.id, p.id);
    const { order, payment } = await live.startInrCheckout(user.id);
    const paymentId = `pay_${uid().slice(0, 12)}`;
    const mk = (amount: number) =>
      JSON.stringify({ event: "order.paid", payload: { payment: { entity: { id: paymentId, order_id: payment.providerOrderId, amount, currency: "INR", status: "captured" } } } });

    const wrong = mk(1);
    expect((await live.handleRazorpayWebhook(wrong, hmacSha256Hex(WEBHOOK_SECRET, wrong), WEBHOOK_SECRET)).body).toHaveProperty("rejected");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");

    const right = mk(20_000);
    const sig = hmacSha256Hex(WEBHOOK_SECRET, right);
    const results = await Promise.all([1, 2, 3].map(() => live.handleRazorpayWebhook(right, sig, WEBHOOK_SECRET)));
    expect(results.filter((r) => r.body.outcome === "paid")).toHaveLength(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("FULFILLED");
    expect(paidSpy).toHaveBeenCalledTimes(1);
  });

  it("payment.failed cancels the order and restores stock; a late capture is queued for refund", async () => {
    const { provider } = fakeRazorpay();
    const live = new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider });
    const user = await createTestUser();
    const p = await product({ inventory: 3, inr: 30_000 });
    await cart.add(user.id, p.id);
    const { order, payment } = await live.startInrCheckout(user.id, { shipping: ADDRESS });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(2);

    const failed = JSON.stringify({
      event: "payment.failed",
      payload: { payment: { entity: { id: "pay_failed1", order_id: payment.providerOrderId, amount: 30_000, currency: "INR", status: "failed" } } },
    });
    await live.handleRazorpayWebhook(failed, hmacSha256Hex(WEBHOOK_SECRET, failed), WEBHOOK_SECRET);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(3);

    const late = await live.capture({ providerOrderId: payment.providerOrderId!, providerPaymentId: `pay_${uid().slice(0, 10)}`, source: "webhook" });
    expect(late.outcome).toBe("late");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect(await prisma.refundRequest.count({ where: { orderId: order.id, status: "REQUESTED" } })).toBe(1);
    expect(paidSpy).not.toHaveBeenCalled();
  });
});

describe("Shop — refunds", () => {
  it("window, ownership and one-open-request rules", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    expect(refundBlocker({ status: "PAID", createdAt: new Date("2026-11-10") }, false, now)).toBeNull();
    expect(refundBlocker({ status: "PENDING", createdAt: new Date("2026-11-10") }, false, now)).toMatch(/paid/);
    expect(refundBlocker({ status: "FULFILLED", createdAt: new Date("2026-11-01") }, false, now)).toMatch(/14 days/);
    expect(refundBlocker({ status: "FULFILLED", createdAt: new Date("2026-11-19") }, true, now)).toMatch(/already/);
  });

  it("sandbox order: request → approve restores unshipped stock, marks REFUNDED, calls the refund hook", async () => {
    const user = await createTestUser();
    const admin = await createTestUser();
    const p = await product({ inventory: 5, inr: 40_000 });
    await cart.add(user.id, p.id, null, 2);
    const { order } = await checkout.startInrCheckout(user.id, { shipping: ADDRESS });
    await checkout.sandboxCapture(user.id, order.id);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(3);

    const other = await createTestUser();
    await expect(refundSvc.requestRefund(other.id, order.id, "Not my order but let me try")).rejects.toThrow(/not found/);
    const req = await refundSvc.requestRefund(user.id, order.id, "Wrong size ordered, please refund");
    await expect(refundSvc.requestRefund(user.id, order.id, "Asking twice for the same order")).rejects.toThrow(/already/);

    const r = await refundSvc.approve(admin.id, req.id, "ok");
    expect(r.rail).toBe("INR/TEST");
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(after.status).toBe("REFUNDED");
    expect(after.payments[0].status).toBe("REFUNDED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(5);
    expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("REFUNDED");
    expect(refundedSpy).toHaveBeenCalledWith(order.id);
    await expect(refundSvc.approve(admin.id, req.id)).rejects.toThrow(/already decided/);
    expect(await prisma.auditLog.count({ where: { action: "refund.approve", targetId: order.id } })).toBe(1);
  });

  it("THC order: approve reverses the ledger spend; reject leaves the order alone", async () => {
    const user = await createTestUser();
    const admin = await createTestUser();
    const p = await product({ kind: "DIGITAL", priceThc: 250n, inventory: null });
    await cart.add(user.id, p.id);
    await fund(user.id, 250n);
    const order = await checkout.checkoutThc(user.id);
    const req = await refundSvc.requestRefund(user.id, order.id, "Bought by mistake, sorry");
    await refundSvc.approve(admin.id, req.id);
    expect(await ledger.getBalance((await ledger.ensureUserAccount(user.id)).id)).toBe(250n);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");

    const u2 = await createTestUser();
    await cart.add(u2.id, p.id);
    await fund(u2.id, 250n);
    const o2 = await checkout.checkoutThc(u2.id);
    const r2 = await refundSvc.requestRefund(u2.id, o2.id, "Changed my mind about it");
    await refundSvc.reject(admin.id, r2.id, "Digital item already delivered");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o2.id } })).status).toBe("FULFILLED");
    expect(refundedSpy).toHaveBeenCalledTimes(1);
  });
});
