import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import { LedgerService, InsufficientFundsError } from "../src/ledger/ledger";
import {
  CartService, CouponService, ShopCheckoutService, RefundService, RazorpayProvider, SandboxProvider,
  cartTotals, discountFor, checkCouponRules, verifyCheckoutSignature, verifyWebhookSignature,
  setEarnHooks, orderTimeline, refundBlocker, paymentsStatus, activeShopProvider, CartError, CouponError,
  PaymentVerificationError, paymentsStatusFor, razorpayOpenTo, razorpayPreflight, razorpayStaffOnly,
  paidAfterCancel, PENDING_TTL_MINUTES, PAYING_GRACE_MINUTES, SWEEP_EVERY_MS, opensLibrary, libraryOrderFor,
} from "../src/shop";
import { cronAuth } from "../src/platform/cron";
import { CommerceService } from "../src/commerce/commerce";
import { hmacSha256Hex } from "../src/shop/payments/razorpay";
import { TEST_REFUND_NOTE } from "../src/shop/refunds";
import { IST_TIME_ZONE, formatIst, parseIstDateTime } from "../src/time/ist";
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

const KEY_SECRET = "test_key_secret_for_unit_tests";
const WEBHOOK_SECRET = "test_webhook_secret_for_unit_tests";

type FakeRazorpayOrder = { status: "created" | "attempted" | "paid"; payments: { id: string; amount: number; currency: string; status: string }[] };

/**
 * A RazorpayProvider over a fake fetch. The key id decides its mode: rzp_test_… is TEST, rzp_live_… is LIVE.
 * `orders` is what this Razorpay account knows, for order lookups; "unreachable" makes a lookup fail.
 */
function fakeRazorpay(keyId = "rzp_test_key") {
  const calls: { url: string; method: string; body: unknown; auth: string }[] = [];
  const orders = new Map<string, FakeRazorpayOrder | "unreachable">();
  const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetchImpl = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method: init.method, body, auth: init.headers.Authorization });
    if (init.method === "GET") {
      const [, id = "", payments] = url.match(/\/orders\/([^/]+)(\/payments)?$/) ?? [];
      const o = orders.get(decodeURIComponent(id));
      if (o === "unreachable") return reply(503, { error: { code: "SERVER_ERROR", description: "Service unavailable" } });
      if (!o) return reply(400, { error: { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" } });
      return reply(200, payments ? { entity: "collection", count: o.payments.length, items: o.payments } : { id, entity: "order", status: o.status });
    }
    if (url.endsWith("/orders")) {
      const id = `order_${uid().slice(0, 12)}`;
      orders.set(id, { status: "created", payments: [] });
      return reply(200, { id, ...body });
    }
    return reply(200, { id: `rfnd_${uid().slice(0, 12)}`, ...body });
  };
  return { provider: new RazorpayProvider(keyId, KEY_SECRET, fetchImpl), calls, orders };
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

  it("a hook that throws is audited, and the refund still goes through", async () => {
    setEarnHooks({ onOrderPaid: paidSpy, onOrderRefunded: async () => Promise.reject(new Error("earn is down")) });
    const user = await createTestUser();
    const admin = await createTestUser();
    const p = await product({ inventory: 3, inr: 30_000 });
    await cart.add(user.id, p.id);
    const { order } = await checkout.startInrCheckout(user.id, { shipping: ADDRESS });
    await checkout.sandboxCapture(user.id, order.id);
    const req = await refundSvc.requestRefund(user.id, order.id, "Changed my mind, please refund");

    await expect(refundSvc.approve(admin.id, req.id)).resolves.toBeTruthy();
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
    const failed = await prisma.auditLog.findFirstOrThrow({ where: { action: "earn.hook_failed", targetId: order.id } });
    expect(failed).toMatchObject({ actorId: null, targetType: "order", meta: { hook: "onOrderRefunded", error: "earn is down" } });
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

  it("reads the start and end typed in the admin form as India time and stores the UTC instant", async () => {
    // A datetime-local value has no offset; it means India time whatever zone the server runs in.
    expect(parseIstDateTime("2026-11-30T23:59")?.toISOString()).toBe("2026-11-30T18:29:00.000Z");
    expect(parseIstDateTime("2026-12-01T00:00:00")?.toISOString()).toBe("2026-11-30T18:30:00.000Z");
    expect(parseIstDateTime(" 2026-01-01T05:29 ")?.toISOString()).toBe("2025-12-31T23:59:00.000Z");
    for (const bad of ["", "2026-11-30", "2026-02-30T10:00", "2026-11-30T24:00", "2026-11-30T23:60", "30/11/2026 23:59", "2026-11-30T23:59Z"]) {
      expect(parseIstDateTime(bad)).toBeNull();
    }

    // Shown back to staff in India time, matching the platform's own Asia/Kolkata rules.
    expect(formatIst(new Date("2026-11-30T18:29:00Z"))).toBe("30 Nov 2026, 23:59 IST");
    expect(formatIst(new Date("2026-11-30T18:30:00Z"))).toBe("1 Dec 2026, 00:00 IST");
    for (const iso of ["2026-06-15T20:45:00Z", "2027-01-31T18:30:00Z"]) {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", { timeZone: IST_TIME_ZONE, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
          .formatToParts(new Date(iso))
          .map((p) => [p.type, p.value])
      );
      expect(formatIst(new Date(iso))).toBe(`${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} IST`);
    }

    // A code meant to run until 23:59 IST on 30 Nov stops then, not 5.5 hours later.
    const c = await couponSvc.create({
      code: `IST${uid().slice(0, 6).toUpperCase()}`,
      percentOff: 10,
      startsAt: parseIstDateTime("2026-11-01T00:00"),
      endsAt: parseIstDateTime("2026-11-30T23:59"),
      active: true,
    });
    const stored = await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } });
    expect(stored.startsAt?.toISOString()).toBe("2026-10-31T18:30:00.000Z");
    expect(stored.endsAt?.toISOString()).toBe("2026-11-30T18:29:00.000Z");
    expect(checkCouponRules(stored, 100, new Date("2026-10-31T18:29:00Z"))).toMatch(/not valid yet/);
    expect(checkCouponRules(stored, 100, new Date("2026-10-31T18:30:00Z"))).toBeNull();
    expect(checkCouponRules(stored, 100, new Date("2026-11-30T18:29:00Z"))).toBeNull();
    expect(checkCouponRules(stored, 100, new Date("2026-11-30T18:29:01Z"))).toMatch(/expired/);
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

  it("a paid order opens its digital items at once, while gear in the same order waits to ship", async () => {
    const user = await createTestUser();
    const admin = await createTestUser();
    const book = await product({ kind: "DIGITAL", inventory: null, inr: 19_900 });
    const tee = await product({ inventory: 5, inr: 59_900 });
    await cart.add(user.id, book.id);
    await cart.add(user.id, tee.id);
    const { order } = await checkout.startInrCheckout(user.id, { shipping: ADDRESS });
    expect(await libraryOrderFor(user.id, book.id, prisma)).toBeNull(); // not paid yet

    await checkout.sandboxCapture(user.id, order.id);
    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.status).toBe("PAID"); // the tee has not shipped
    expect(opensLibrary(paid)).toBe(true);
    expect(await libraryOrderFor(user.id, book.id, prisma)).toEqual({ id: order.id });
    expect(await libraryOrderFor((await createTestUser()).id, book.id, prisma)).toBeNull(); // only the buyer's

    // Shipping changes nothing; a refund closes it again.
    await new CommerceService(prisma).markShipped(order.id, "Delhivery", "DLV123");
    expect(await libraryOrderFor(user.id, book.id, prisma)).toEqual({ id: order.id });
    const req = await refundSvc.requestRefund(user.id, order.id, "Ordered the wrong things, sorry");
    await refundSvc.approve(admin.id, req.id);
    expect(await libraryOrderFor(user.id, book.id, prisma)).toBeNull();
    expect(["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"].filter((status) => opensLibrary({ status }))).toEqual(["PAID", "FULFILLED"]);
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

describe("Shop — Razorpay test keys in production are staff-only", () => {
  const keys = { RAZORPAY_KEY_ID: "rzp_test_abc", RAZORPAY_KEY_SECRET: "s" };
  const prodTest = { NODE_ENV: "production", ...keys };
  const prodLive = { NODE_ENV: "production", RAZORPAY_KEY_ID: "rzp_live_abc", RAZORPAY_KEY_SECRET: "s" };
  const devTest = { NODE_ENV: "development", ...keys };
  const member = { role: "MEMBER" as const };
  const admin = { role: "ADMIN" as const };

  it("offers the rail only to staff with admin.commerce, and tells members plainly", () => {
    expect(razorpayStaffOnly(prodTest)).toBe(true);
    expect(razorpayStaffOnly(prodLive)).toBe(false);
    expect(razorpayStaffOnly(devTest)).toBe(false);
    for (const viewer of [null, member, { role: "STUDENT" as const }, { role: "INSTRUCTOR" as const }, { role: "MODERATOR" as const }]) {
      expect(razorpayOpenTo(viewer, prodTest)).toBe(false);
      expect(activeShopProvider(prodTest, viewer)).toBeNull();
      expect(paymentsStatusFor(viewer, prodTest)).toMatchObject({ provider: null, mode: null, staffOnly: true });
      expect(paymentsStatusFor(viewer, prodTest).summary).toBe("Card payments are not available yet. You can still pay with THC.");
    }
    expect(razorpayOpenTo(admin, prodTest)).toBe(true);
    expect(activeShopProvider(prodTest, admin)).toMatchObject({ name: "razorpay", mode: "TEST" });
    expect(paymentsStatusFor(admin, prodTest)).toMatchObject({ provider: "razorpay", mode: "TEST", staffOnly: true });
    expect(paymentsStatus(prodTest).summary).toMatch(/only staff with commerce access see card checkout/);

    // Live keys in production, test keys outside it, and the dev sandbox are unchanged.
    for (const env of [prodLive, devTest]) {
      expect(activeShopProvider(env, member)?.name).toBe("razorpay");
      expect(paymentsStatusFor(member, env)).toMatchObject({ provider: "razorpay", staffOnly: false });
    }
    expect(activeShopProvider({ DEV_MODE: "true", NODE_ENV: "development" }, member)?.name).toBe("sandbox");
    expect(paymentsStatusFor(member, { DEV_MODE: "true", NODE_ENV: "development" }).provider).toBe("sandbox");
  });

  it("startInrCheckout refuses members on the server with the default wiring; staff still get a test order", async () => {
    const urls: string[] = [];
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_staffonly");
    vi.stubEnv("RAZORPAY_KEY_SECRET", KEY_SECRET);
    vi.stubGlobal("fetch", async (url: string, init: { body?: string }) => {
      urls.push(url);
      const body = init.body ? JSON.parse(init.body) : {};
      return { ok: true, status: 200, json: async () => ({ id: `order_${uid().slice(0, 12)}`, ...body }), text: async () => "" };
    });
    try {
      const svc = new ShopCheckoutService(prisma); // provider: activeShopProvider(process.env, buyer)
      const p = await product({ kind: "DIGITAL", inventory: null, inr: 10_000 });
      for (const role of ["MEMBER", "INSTRUCTOR"] as const) {
        const u = await prisma.user.update({ where: { id: (await createTestUser()).id }, data: { role } });
        await cart.add(u.id, p.id);
        await expect(svc.startInrCheckout(u.id)).rejects.toThrow("Card payments are not available right now. You can still pay with THC.");
        expect(await prisma.order.count({ where: { userId: u.id } })).toBe(0);
        expect(await cart.count(u.id)).toBe(1);
      }
      expect(urls).toHaveLength(0);

      const staff = await prisma.user.update({ where: { id: (await createTestUser()).id }, data: { role: "ADMIN" } });
      await cart.add(staff.id, p.id);
      const { order, payment } = await svc.startInrCheckout(staff.id);
      expect(order.paymentProvider).toBe("razorpay");
      expect(payment).toMatchObject({ provider: "razorpay", mode: "TEST" });
      expect(urls).toEqual(["https://api.razorpay.com/v1/orders"]);
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });

  it("a member's order paid in test mode is never shipped in production; staff test orders and live orders still ship", async () => {
    const commerce = new CommerceService(prisma);
    const p = await product({ inventory: 5, inr: 20_000 });
    async function paidOrder(keyId: string, role: "MEMBER" | "ADMIN") {
      const { provider } = fakeRazorpay(keyId);
      const svc = new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider });
      const u = await prisma.user.update({ where: { id: (await createTestUser()).id }, data: { role } });
      await cart.add(u.id, p.id);
      const { order, payment } = await svc.startInrCheckout(u.id, { shipping: ADDRESS });
      const payId = `pay_${uid().slice(0, 12)}`;
      const signature = hmacSha256Hex(KEY_SECRET, `${payment.providerOrderId}|${payId}`);
      expect((await svc.verifyRazorpayCallback(u.id, { razorpayOrderId: payment.providerOrderId!, razorpayPaymentId: payId, signature })).outcome).toBe("paid");
      return order;
    }
    // Paid in test mode before the rail was fenced, as every member could.
    const memberTest = await paidOrder("rzp_test_ship", "MEMBER");
    const staffTest = await paidOrder("rzp_test_ship", "ADMIN");
    const memberLive = await paidOrder("rzp_live_ship", "MEMBER");

    vi.stubEnv("NODE_ENV", "production");
    try {
      await expect(commerce.markShipped(memberTest.id, "India Post", "EE000000001IN")).rejects.toThrow(
        "This order was paid in test mode, so no real money was charged. Do not ship it."
      );
      expect((await prisma.order.findUniqueOrThrow({ where: { id: memberTest.id } })).status).toBe("PAID");
      expect((await commerce.markShipped(staffTest.id, "India Post", "EE000000002IN")).status).toBe("FULFILLED");
      expect((await commerce.markShipped(memberLive.id, "India Post", "EE000000003IN")).status).toBe("FULFILLED");
    } finally {
      vi.unstubAllEnvs();
    }
    // Outside production, test orders ship as before.
    expect((await commerce.markShipped(memberTest.id, "India Post", "EE000000001IN")).status).toBe("FULFILLED");
  });

  it("preflight warns about test keys in production and a missing webhook secret, and fails on half a key pair", () => {
    expect(razorpayPreflight({ NODE_ENV: "production" })).toEqual([]);
    expect(razorpayPreflight({ NODE_ENV: "production", RAZORPAY_KEY_ID: "rzp_live_abc" })).toEqual([
      { level: "FAIL", label: "Razorpay has both keys", detail: "RAZORPAY_KEY_SECRET is missing, so card checkout is off" },
    ]);
    expect(razorpayPreflight({ NODE_ENV: "production", RAZORPAY_KEY_SECRET: "s" })[0]).toMatchObject({ level: "FAIL", detail: expect.stringMatching(/^RAZORPAY_KEY_ID is missing/) });

    const [testKeys, noWebhook] = razorpayPreflight(prodTest);
    expect(testKeys).toMatchObject({ level: "WARN", label: "Razorpay uses live keys" });
    expect(testKeys.detail).toMatch(/only staff with commerce access/);
    expect(noWebhook).toMatchObject({ level: "WARN", label: "the Razorpay webhook is configured" });

    expect(razorpayPreflight({ ...prodLive, RAZORPAY_WEBHOOK_SECRET: "w" }).map((r) => r.level)).toEqual(["OK", "OK"]);
    expect(razorpayPreflight({ ...devTest, RAZORPAY_WEBHOOK_SECRET: "w" })[0]).toMatchObject({ level: "OK", label: "Razorpay test keys" });
  });
});

describe("Shop — Razorpay signatures and webhook", () => {
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

  it("payment.failed leaves the order open; a retry on the same Razorpay order is paid and fulfilled", async () => {
    const { provider } = fakeRazorpay();
    const live = new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider });
    const user = await createTestUser();
    const c = await coupon({ maxRedemptions: 1 });
    const p = await product({ inventory: 3, inr: 30_000 });
    await cart.add(user.id, p.id);
    const { order, payment } = await live.startInrCheckout(user.id, { shipping: ADDRESS, couponCode: c.code });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(2);

    const failed = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: {
          entity: { id: "pay_failed1", order_id: payment.providerOrderId, amount: order.totalFiatCents, currency: "INR", status: "failed", error_description: "Your payment was declined by the bank." },
        },
      },
    });
    const r = await live.handleRazorpayWebhook(failed, hmacSha256Hex(WEBHOOK_SECRET, failed), WEBHOOK_SECRET);
    expect(r).toMatchObject({ status: 200, body: { ok: true } });
    // Only the attempt is recorded: the order, its stock, its coupon and its payment stay open.
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(2);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).redeemedCount).toBe(1);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("CREATED");
    const attempt = await prisma.auditLog.findFirstOrThrow({ where: { action: "payment.attempt_failed", targetId: payment.id } });
    expect(attempt.actorId).toBeNull();
    expect(attempt.meta).toMatchObject({ orderId: order.id, providerPaymentId: "pay_failed1", reason: "Your payment was declined by the bank." });
    expect(await prisma.auditLog.count({ where: { action: "order.cancel", targetId: order.id } })).toBe(0);

    // The member retries in the same Razorpay window and it goes through: paid, not refunded.
    const retryId = `pay_${uid().slice(0, 12)}`;
    const signature = hmacSha256Hex(KEY_SECRET, `${payment.providerOrderId}|${retryId}`);
    const paid = await live.verifyRazorpayCallback(user.id, { razorpayOrderId: payment.providerOrderId!, razorpayPaymentId: retryId, signature });
    expect(paid.outcome).toBe("paid");
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(after.status).toBe("PAID"); // physical: waits to be shipped
    expect(after.payments[0]).toMatchObject({ status: "CAPTURED", providerPaymentId: retryId });
    expect(await prisma.refundRequest.count({ where: { orderId: order.id } })).toBe(0);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(2);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).redeemedCount).toBe(1);
    expect(await cart.count(user.id)).toBe(0);
    expect(paidSpy).toHaveBeenCalledTimes(1);
  });

  it("a payment that lands after the order was cancelled is queued for a full refund, and the order says so", async () => {
    const { provider } = fakeRazorpay();
    const live = new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider });
    const user = await createTestUser();
    const p = await product({ inventory: 3, inr: 30_000 });
    await cart.add(user.id, p.id);
    const { order, payment } = await live.startInrCheckout(user.id, { shipping: ADDRESS });
    expect(await live.abandon(user.id, order.id)).toBe(true);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(3);
    const full = { items: { include: { product: true } }, payments: true, refundRequests: true } as const;
    const cancelled = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: full });
    expect(paidAfterCancel(cancelled)).toBe(false);
    expect(orderTimeline(cancelled).find((st) => st.key === "cancelled")?.detail).toMatch(/nothing was charged/);

    const late = await live.capture({ providerOrderId: payment.providerOrderId!, providerPaymentId: `pay_${uid().slice(0, 10)}`, source: "webhook" });
    expect(late.outcome).toBe("late");
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: full });
    expect(after.status).toBe("CANCELLED");
    expect(after.refundRequests.map((rr) => rr.status)).toEqual(["REQUESTED"]);
    expect(paidAfterCancel(after)).toBe(true);
    const steps = orderTimeline(after);
    expect(steps.find((st) => st.key === "cancelled")?.detail).toMatch(/arrived after the order was cancelled, so a full refund was queued/);
    expect(steps.find((st) => st.key === "cancelled")?.detail).not.toMatch(/nothing was charged/);
    expect(steps.find((st) => st.key === "refund")).toMatchObject({ label: "Refund requested", state: "current" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(3); // not revived
    expect(paidSpy).not.toHaveBeenCalled();
  });
});

describe("Shop — expiring unpaid rupee orders", () => {
  const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

  /** A rupee order with a coupon, held since `ageMinutes` ago. */
  async function heldOrder(svc: ShopCheckoutService, ageMinutes: number) {
    const user = await createTestUser();
    const c = await coupon({ maxRedemptions: 5 });
    const p = await product({ inventory: 2, inr: 40_000 });
    await cart.add(user.id, p.id);
    const { order, payment } = await svc.startInrCheckout(user.id, { shipping: ADDRESS, couponCode: c.code });
    await prisma.order.update({ where: { id: order.id }, data: { createdAt: minutesAgo(ageMinutes) } });
    const state = async () => ({
      order: (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status,
      payment: (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status,
      inventory: (await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory,
      redeemed: (await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).redeemedCount,
    });
    return { order, payment, providerOrderId: payment.providerOrderId!, state };
  }
  const held = { order: "PENDING", payment: "CREATED", inventory: 1, redeemed: 1 };
  const released = { order: "CANCELLED", payment: "FAILED", inventory: 2, redeemed: 0 };

  it("asks Razorpay first: never cancels a paid order, waits for one being paid, cancels the rest", async () => {
    const { provider, orders, calls } = fakeRazorpay();
    const live = new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider });

    const fresh = await heldOrder(live, 5); // inside the hold: not looked at
    const untried = await heldOrder(live, PENDING_TTL_MINUTES + 1); // never attempted
    const retrying = await heldOrder(live, PENDING_TTL_MINUTES + 1); // attempted, inside the grace period
    const gaveUp = await heldOrder(live, PENDING_TTL_MINUTES + PAYING_GRACE_MINUTES + 1); // attempted, grace over
    const paid = await heldOrder(live, PENDING_TTL_MINUTES + 1); // paid at Razorpay, never confirmed to us
    const unknown = await heldOrder(live, PENDING_TTL_MINUTES + 1); // Razorpay does not know it
    const down = await heldOrder(live, PENDING_TTL_MINUTES + PAYING_GRACE_MINUTES + 30); // Razorpay cannot be reached

    const failedAttempt = { id: `pay_${uid().slice(0, 10)}`, amount: 36_000, currency: "INR", status: "failed" };
    orders.set(retrying.providerOrderId, { status: "attempted", payments: [failedAttempt] });
    orders.set(gaveUp.providerOrderId, { status: "attempted", payments: [{ ...failedAttempt, id: `pay_${uid().slice(0, 10)}` }] });
    const paidId = `pay_${uid().slice(0, 10)}`;
    orders.set(paid.providerOrderId, {
      status: "paid",
      payments: [{ ...failedAttempt, id: `pay_${uid().slice(0, 10)}` }, { id: paidId, amount: paid.order.totalFiatCents, currency: "INR", status: "captured" }],
    });
    orders.delete(unknown.providerOrderId);
    orders.set(down.providerOrderId, "unreachable");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const r = await live.expireStale();
      expect(r.cancelled).toBeGreaterThanOrEqual(3);
      expect(r.captured).toBeGreaterThanOrEqual(1);
      expect(r.waiting).toBeGreaterThanOrEqual(2);
    } finally {
      errors.mockRestore();
    }

    expect(await fresh.state()).toEqual(held);
    expect(calls.some((cl) => cl.method === "GET" && cl.url.includes(fresh.providerOrderId))).toBe(false);
    expect(await untried.state()).toEqual(released);
    expect(await retrying.state()).toEqual(held);
    expect(await gaveUp.state()).toEqual(released);
    expect(await unknown.state()).toEqual(released);
    expect(await down.state()).toEqual(held);

    // The paid one is captured as the webhook would have: paid, kept, not refunded.
    expect(await paid.state()).toEqual({ order: "PAID", payment: "CAPTURED", inventory: 1, redeemed: 1 });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paid.payment.id } })).providerPaymentId).toBe(paidId);
    expect(await prisma.refundRequest.count({ where: { orderId: paid.order.id } })).toBe(0);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "order.paid", targetId: paid.order.id } });
    expect(audit.actorId).toBeNull();
    expect(audit.meta).toMatchObject({ source: "sweep" });
    expect(paidSpy).toHaveBeenCalledWith(paid.order.id);

    // Once Razorpay answers again, an unpaid order past the grace period goes.
    orders.set(down.providerOrderId, { status: "created", payments: [] });
    await live.expireStale();
    expect(await down.state()).toEqual(released);
  });

  it("cancels without asking when nobody can be asked: the sandbox, or keys of the other mode", async () => {
    const sandboxOrder = await heldOrder(checkout, PENDING_TTL_MINUTES + 1);
    await checkout.expireStale();
    expect(await sandboxOrder.state()).toEqual(released);

    const { provider: testKeys } = fakeRazorpay("rzp_test_key");
    const { provider: liveKeys, calls: liveCalls } = fakeRazorpay("rzp_live_key");
    const tookTest = new ShopCheckoutService(prisma, { provider: () => testKeys, providerFor: () => testKeys });
    const testOrder = await heldOrder(tookTest, PENDING_TTL_MINUTES + 1);
    // The test keys were swapped for live ones, which cannot see a test order.
    await new ShopCheckoutService(prisma, { providerFor: () => liveKeys }).expireStale();
    expect(await testOrder.state()).toEqual(released);
    expect(liveCalls.filter((cl) => cl.url.includes(testOrder.providerOrderId))).toHaveLength(0);
  });

  it("the pay page expires only its own order", async () => {
    const mine = await heldOrder(checkout, PENDING_TTL_MINUTES + 1);
    const other = await heldOrder(checkout, PENDING_TTL_MINUTES + 1);
    const recent = await heldOrder(checkout, 5);
    const none = { cancelled: 0, captured: 0, waiting: 0 };
    expect(await checkout.expireStale(new Date(), { orderId: recent.order.id, userId: recent.order.userId })).toEqual(none);
    // Someone else's order is not theirs to expire.
    expect(await checkout.expireStale(new Date(), { orderId: mine.order.id, userId: other.order.userId })).toEqual(none);
    expect(await mine.state()).toEqual(held);
    expect(await checkout.expireStale(new Date(), { orderId: mine.order.id, userId: mine.order.userId })).toEqual({ cancelled: 1, captured: 0, waiting: 0 });
    expect(await mine.state()).toEqual(released);
    expect(await other.state()).toEqual(held);
    expect(await recent.state()).toEqual(held);
    await checkout.expireStale();
    expect(await other.state()).toEqual(released);
  });

  it("page loads sweep at most once a minute per server, and a failed sweep never breaks the page", async () => {
    const svc = new ShopCheckoutService(prisma, { provider: () => sandbox, sandboxEnabled: () => true });
    const sweep = vi.spyOn(svc, "expireStale");
    const stale = await heldOrder(svc, PENDING_TTL_MINUTES + 1);
    const t0 = new Date();

    expect(await svc.sweepStale(t0)).toMatchObject({ cancelled: expect.any(Number) });
    expect(await stale.state()).toEqual(released);
    const next = await heldOrder(svc, PENDING_TTL_MINUTES + 1);
    expect(await svc.sweepStale(new Date(t0.getTime() + SWEEP_EVERY_MS - 1))).toBeNull(); // too soon: skipped
    expect(await next.state()).toEqual(held);
    expect(sweep).toHaveBeenCalledTimes(1);

    sweep.mockRejectedValueOnce(new Error("database unavailable"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(svc.sweepStale(new Date(t0.getTime() + SWEEP_EVERY_MS))).resolves.toBeNull();
    } finally {
      errors.mockRestore();
    }
    expect(sweep).toHaveBeenCalledTimes(2);
    expect(await svc.sweepStale(new Date(t0.getTime() + 2 * SWEEP_EVERY_MS))).toMatchObject({ cancelled: expect.any(Number) });
    expect(await next.state()).toEqual(released);
  });

  it("the scheduled sweep runs only for a caller with CRON_SECRET", () => {
    const secret = "a-long-random-cron-secret-for-tests";
    expect(cronAuth(`Bearer ${secret}`, secret)).toBe("ok");
    expect(cronAuth(`Bearer ${secret}`, ` ${secret}\n`)).toBe("ok"); // the env value is trimmed
    for (const header of [null, undefined, "", secret, "Bearer", "Bearer ", `bearer ${secret}`, `Basic ${secret}`, `Bearer ${secret}x`, `Bearer ${secret.slice(1)}`]) {
      expect(cronAuth(header, secret)).toBe("denied");
    }
    expect(cronAuth(`Bearer ${secret}`, undefined)).toBe("unset");
    expect(cronAuth("Bearer ", "   ")).toBe("unset");
    vi.stubEnv("CRON_SECRET", secret);
    try {
      expect(cronAuth(`Bearer ${secret}`)).toBe("ok");
      expect(cronAuth("Bearer wrong")).toBe("denied");
    } finally {
      vi.unstubAllEnvs();
    }
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

  /** A Razorpay order paid with these keys: physical, so a refund puts the unit back. */
  async function paidWithRazorpay(keys: RazorpayProvider) {
    const shop = new ShopCheckoutService(prisma, { provider: () => keys, providerFor: () => keys });
    const user = await createTestUser();
    const p = await product({ inventory: 4, inr: 25_000 });
    await cart.add(user.id, p.id);
    const { order, payment } = await shop.startInrCheckout(user.id, { shipping: ADDRESS });
    await shop.capture({ providerOrderId: payment.providerOrderId!, providerPaymentId: `pay_${uid().slice(0, 12)}`, source: "webhook" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(3);
    return { user, order, payment, product: p };
  }

  it("a test-key payment is refunded here once the test keys are gone, without calling Razorpay", async () => {
    const admin = await createTestUser();
    const { provider: testKeys } = fakeRazorpay("rzp_test_key");

    // KYC cleared and the owner swapped in live keys; later, keys removed altogether.
    const { provider: liveKeys, calls: liveCalls } = fakeRazorpay("rzp_live_key");
    for (const providerFor of [() => liveKeys, () => null]) {
      const { user, order, payment, product: p } = await paidWithRazorpay(testKeys);
      expect(payment.mode).toBe("TEST");
      const svc = new RefundService(prisma, { providerFor });
      const req = await svc.requestRefund(user.id, order.id, "Ordered during the test-key run, please refund");
      const r = await svc.approve(admin.id, req.id);

      expect(r).toMatchObject({ rail: "INR/TEST", refundedLocally: true });
      expect(liveCalls).toHaveLength(0);
      const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
      expect(after.status).toBe("REFUNDED");
      expect(after.payments[0].status).toBe("REFUNDED");
      expect(after.payments[0].raw).toMatchObject({ refund: { note: TEST_REFUND_NOTE } });
      expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(4);
      expect(refundedSpy).toHaveBeenCalledWith(order.id);
      const told = await prisma.notification.findFirst({ where: { userId: user.id, title: "Refund approved" } });
      expect(told?.body).toMatch(/no real money/);
      const logged = await prisma.auditLog.findFirst({ where: { action: "refund.approve", targetId: order.id } });
      expect(logged?.meta).toMatchObject({ rail: "INR/TEST", refundedLocally: TEST_REFUND_NOTE });
    }
  });

  it("a test-key payment still goes back through Razorpay while test keys are configured", async () => {
    const admin = await createTestUser();
    const { provider: testKeys, calls } = fakeRazorpay("rzp_test_key");
    const { user, order } = await paidWithRazorpay(testKeys);
    const svc = new RefundService(prisma, { providerFor: () => testKeys });
    const req = await svc.requestRefund(user.id, order.id, "Test refund through Razorpay test mode");
    await expect(svc.approve(admin.id, req.id)).resolves.toMatchObject({ rail: "INR/TEST", refundedLocally: false });
    expect(calls.filter((c) => /\/payments\/[^/]+\/refund$/.test(c.url))).toHaveLength(1);
  });

  it("a live payment is never refunded with test keys", async () => {
    const admin = await createTestUser();
    const { provider: liveKeys, calls: liveCalls } = fakeRazorpay("rzp_live_key");
    const { user, order, payment } = await paidWithRazorpay(liveKeys);
    expect(payment.mode).toBe("LIVE");

    const { provider: testKeys, calls: testCalls } = fakeRazorpay("rzp_test_key");
    const wrongKeys = new RefundService(prisma, { providerFor: () => testKeys });
    const req = await wrongKeys.requestRefund(user.id, order.id, "Damaged on arrival, please refund");
    await expect(wrongKeys.approve(admin.id, req.id)).rejects.toThrow(/live Razorpay keys/);
    expect(testCalls).toHaveLength(0);
    expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("REQUESTED");
    const still = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(still.status).toBe("PAID");
    expect(still.payments[0].status).toBe("CAPTURED");

    // With live keys it goes back through Razorpay.
    const rightKeys = new RefundService(prisma, { providerFor: () => liveKeys });
    await expect(rightKeys.approve(admin.id, req.id)).resolves.toMatchObject({ rail: "INR/LIVE" });
    expect(liveCalls.filter((c) => /\/payments\/[^/]+\/refund$/.test(c.url))).toHaveLength(1);
  });
});
