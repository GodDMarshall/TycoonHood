import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import { LedgerService, InsufficientFundsError } from "../src/ledger/ledger";
import {
  CartService, CouponService, ShopCheckoutService, RefundService, RazorpayProvider, SandboxProvider,
  cartTotals, cartBadge, discountFor, checkCouponRules, verifyCheckoutSignature, verifyWebhookSignature,
  setEarnHooks, orderTimeline, refundBlocker, paymentsStatus, activeShopProvider, CartError, CouponError,
  PaymentVerificationError, paymentsStatusFor, razorpayOpenTo, razorpayPreflight, razorpayStaffOnly,
  paidAfterCancel, PENDING_TTL_MINUTES, PAYING_GRACE_MINUTES, SWEEP_EVERY_MS, opensLibrary, libraryOrderFor,
  ShopStatsService, testPaymentAllowed, refundUncounted, RefundError,
} from "../src/shop";
import { platformAnalytics } from "../src/platform/analytics";
import { cronAuth } from "../src/platform/cron";
import { CommerceError, CommerceService } from "../src/commerce/commerce";
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
type FakeRazorpayRefund = { id: string; amount: number; status: "pending" | "processed" | "failed" };

/**
 * A RazorpayProvider over a fake fetch. The key id decides its mode: rzp_test_… is TEST, rzp_live_… is LIVE.
 * `orders` is what this Razorpay account knows, for order lookups; "unreachable" makes a lookup fail.
 * `refunds` is what it holds for each payment id, for refund lookups.
 */
function fakeRazorpay(keyId = "rzp_test_key") {
  const calls: { url: string; method: string; body: unknown; auth: string }[] = [];
  const orders = new Map<string, FakeRazorpayOrder | "unreachable">();
  const refunds = new Map<string, FakeRazorpayRefund[]>();
  const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetchImpl = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method: init.method, body, auth: init.headers.Authorization });
    if (init.method === "GET" && /\/payments\/[^/]+\/refunds\?count=100$/.test(url)) {
      const list = refunds.get(decodeURIComponent(url.match(/\/payments\/([^/]+)\/refunds/)?.[1] ?? ""));
      if (!list) return reply(400, { error: { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" } });
      return reply(200, { entity: "collection", count: list.length, items: list.map((r) => ({ entity: "refund", currency: "INR", ...r })) });
    }
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
  return { provider: new RazorpayProvider(keyId, KEY_SECRET, fetchImpl), calls, orders, refunds };
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

describe("Shop — cart badge", () => {
  it("is hidden for an empty cart and names the exact count", () => {
    expect(cartBadge(0)).toBeNull();
    expect(cartBadge(-2)).toBeNull();
    expect(cartBadge(Number.NaN)).toBeNull();
    expect(cartBadge(1)).toEqual({ text: "1", label: "Cart, 1 item" });
    expect(cartBadge(3)).toEqual({ text: "3", label: "Cart, 3 items" });
    expect(cartBadge(99)).toEqual({ text: "99", label: "Cart, 99 items" });
    // The eye gets a short cap; a screen reader still hears the real number.
    expect(cartBadge(140)).toEqual({ text: "99+", label: "Cart, 140 items" });
  });

  it("counts quantities across lines, not lines, and only the member's own", async () => {
    const [user, other] = await Promise.all([createTestUser(), createTestUser()]);
    const [a, b] = await Promise.all([product({}), product({ kind: "DIGITAL", inventory: null })]);
    await cart.add(user.id, a.id, null, 3);
    await cart.add(user.id, b.id, null, 2);
    await cart.add(other.id, a.id, null, 1);
    expect(await cart.count(user.id)).toBe(5);
    expect(cartBadge(await cart.count(user.id))?.label).toBe("Cart, 5 items");
    await cart.clear(user.id);
    expect(cartBadge(await cart.count(user.id))).toBeNull();
    expect(await cart.count(other.id)).toBe(1);
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

  it("a test payment completes an order only for staff in production, whatever keys are set now", () => {
    for (const viewer of [null, member, { role: "INSTRUCTOR" as const }, { role: "MODERATOR" as const }]) {
      expect(testPaymentAllowed(viewer, prodTest)).toBe(false);
      expect(testPaymentAllowed(viewer, prodLive)).toBe(false); // a window opened before the swap
      expect(testPaymentAllowed(viewer, devTest)).toBe(true);
    }
    expect(testPaymentAllowed(admin, prodTest)).toBe(true);
    expect(testPaymentAllowed(admin, { NODE_ENV: "production" })).toBe(true);
  });

  it("a member's test-mode payment never completes an order in production, by callback, webhook or sweep; staff's does", async () => {
    const book = await product({ kind: "DIGITAL", inventory: null, inr: 10_000 });
    const gear = await product({ inventory: 10, inr: 20_000 });
    const c = await coupon({ maxRedemptions: 5 });
    const { provider: testKeys, orders, calls } = fakeRazorpay("rzp_test_fenced");
    const svc = new ShopCheckoutService(prisma, { provider: () => testKeys, providerFor: () => testKeys });
    // Started with test keys before the rail was fenced, as every member could.
    async function started(role: "MEMBER" | "ADMIN") {
      const user = await prisma.user.update({ where: { id: (await createTestUser()).id }, data: { role } });
      await cart.add(user.id, book.id);
      await cart.add(user.id, gear.id);
      const { order, payment } = await svc.startInrCheckout(user.id, { shipping: ADDRESS, couponCode: c.code });
      return { user, order, providerOrderId: payment.providerOrderId! };
    }
    const byCallback = await started("MEMBER");
    const byWebhook = await started("MEMBER");
    const bySweep = await started("MEMBER");
    const staff = await started("ADMIN");
    const payId = () => `pay_${uid().slice(0, 12)}`;
    const signed = (providerOrderId: string, razorpayPaymentId: string) => ({
      razorpayOrderId: providerOrderId,
      razorpayPaymentId,
      signature: hmacSha256Hex(KEY_SECRET, `${providerOrderId}|${razorpayPaymentId}`),
    });

    vi.stubEnv("NODE_ENV", "production");
    try {
      expect((await svc.verifyRazorpayCallback(byCallback.user.id, signed(byCallback.providerOrderId, payId()))).outcome).toBe("refused");

      const body = JSON.stringify({
        event: "order.paid",
        payload: { payment: { entity: { id: payId(), order_id: byWebhook.providerOrderId, amount: byWebhook.order.totalFiatCents, currency: "INR", status: "captured" } } },
      });
      expect(await svc.handleRazorpayWebhook(body, hmacSha256Hex(WEBHOOK_SECRET, body), WEBHOOK_SECRET)).toMatchObject({ status: 200, body: { outcome: "refused" } });

      // Paid at Razorpay, never confirmed to us: the sweep finds it.
      await prisma.order.update({ where: { id: bySweep.order.id }, data: { createdAt: new Date(Date.now() - (PENDING_TTL_MINUTES + 1) * 60_000) } });
      orders.set(bySweep.providerOrderId, { status: "paid", payments: [{ id: payId(), amount: bySweep.order.totalFiatCents, currency: "INR", status: "captured" }] });
      expect(await svc.expireStale(new Date(), { orderId: bySweep.order.id, userId: bySweep.user.id })).toMatchObject({ captured: 1 });

      // Staff can still try the whole flow.
      expect((await svc.verifyRazorpayCallback(staff.user.id, signed(staff.providerOrderId, payId()))).outcome).toBe("paid");
    } finally {
      vi.unstubAllEnvs();
    }

    const full = { items: { include: { product: true } }, payments: true, refundRequests: true } as const;
    for (const [{ user, order }, source] of [[byCallback, "callback"], [byWebhook, "webhook"], [bySweep, "sweep"]] as const) {
      const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: full });
      expect(after.status).toBe("CANCELLED");
      expect(after.payments[0]).toMatchObject({ status: "CAPTURED", mode: "TEST" });
      expect(after.refundRequests.map((r) => [r.status, r.reason])).toEqual([["REQUESTED", expect.stringMatching(/paid in test mode/)]]);
      expect(opensLibrary(after)).toBe(false);
      expect(await libraryOrderFor(user.id, book.id, prisma)).toBeNull();
      expect(orderTimeline(after).find((st) => st.key === "cancelled")?.detail).toMatch(/^Paid in test mode, so no real money was charged/);
      expect(await prisma.auditLog.findFirst({ where: { action: "payment.test_refused", targetId: order.id } })).toMatchObject({ meta: { source, mode: "TEST" } });
      expect(await prisma.auditLog.count({ where: { action: "order.paid", targetId: order.id } })).toBe(0);
      expect(await prisma.notification.count({ where: { userId: user.id, title: "Order cancelled: test payment" } })).toBe(1);
      expect(await cart.count(user.id)).toBe(2); // the cart is as they left it
    }
    // Only the staff order still holds its unit and its coupon use.
    expect((await prisma.product.findUniqueOrThrow({ where: { id: gear.id } })).inventory).toBe(9);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).redeemedCount).toBe(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: staff.order.id } })).status).toBe("PAID");
    expect(await libraryOrderFor(staff.user.id, book.id, prisma)).toEqual({ id: staff.order.id });
    expect(paidSpy).toHaveBeenCalledTimes(1);
    expect(paidSpy).toHaveBeenCalledWith(staff.order.id);

    // Approving the queued request closes it. The test keys are still set, so it goes back through Razorpay test mode.
    const admin = await createTestUser();
    const req = await prisma.refundRequest.findFirstOrThrow({ where: { orderId: byCallback.order.id } });
    await expect(new RefundService(prisma, { providerFor: () => testKeys }).approve(admin.id, req.id)).resolves.toMatchObject({ rail: "INR/TEST" });
    expect(calls.filter((cl) => /\/payments\/[^/]+\/refund$/.test(cl.url))).toHaveLength(1);
    const closed = await prisma.order.findUniqueOrThrow({ where: { id: byCallback.order.id }, include: full });
    expect(closed.status).toBe("CANCELLED");
    expect(closed.payments[0].status).toBe("REFUNDED");
    expect(closed.refundRequests[0].status).toBe("REFUNDED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: gear.id } })).inventory).toBe(9); // its unit went back once
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
    const { provider } = fakeRazorpay("rzp_live_key"); // real money: a test payment's order says no money moved
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

  it("checkout releases the member's own expired holds on every load, even right after a sweep", async () => {
    const svc = new ShopCheckoutService(prisma, { provider: () => sandbox, sandboxEnabled: () => true });
    await svc.sweepStale(); // this server just swept, so page loads skip the sweep for a minute
    const mine = await heldOrder(svc, PENDING_TTL_MINUTES + 1);
    const other = await heldOrder(svc, PENDING_TTL_MINUTES + 1);
    expect(await svc.sweepStale()).toBeNull();
    expect(await other.state()).toEqual(held);

    expect(await svc.expireStale(new Date(), { userId: mine.order.userId })).toEqual({ cancelled: 1, captured: 0, waiting: 0 });
    expect(await mine.state()).toEqual(released);
    expect(await other.state()).toEqual(held); // someone else's waits for the sweep
    await svc.expireStale();
    expect(await other.state()).toEqual(released);
  });

  it("a payment Razorpay reports with the wrong amount is flagged once and the order goes, instead of being looked up on every sweep", async () => {
    const { provider, orders, calls } = fakeRazorpay();
    const live = new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider });
    const odd = await heldOrder(live, PENDING_TTL_MINUTES + 1);
    orders.set(odd.providerOrderId, { status: "paid", payments: [{ id: `pay_${uid().slice(0, 10)}`, amount: 1, currency: "INR", status: "captured" }] });
    const lookups = () => calls.filter((cl) => cl.method === "GET" && cl.url.includes(odd.providerOrderId)).length;
    const scope = { orderId: odd.order.id, userId: odd.order.userId };

    expect(await live.expireStale(new Date(), scope)).toEqual({ cancelled: 1, captured: 0, waiting: 0 });
    expect(await odd.state()).toEqual(released);
    expect(await prisma.auditLog.findFirst({ where: { action: "payment.sweep_mismatch", targetId: odd.payment.id } })).toMatchObject({
      actorId: null,
      meta: { providerOrderId: odd.providerOrderId, error: "Payment amount does not match the order." },
    });
    expect(paidSpy).not.toHaveBeenCalled();

    // It has left the sweep: no more lookups and no more audit rows.
    expect(lookups()).toBe(2);
    expect(await live.expireStale(new Date(), scope)).toEqual({ cancelled: 0, captured: 0, waiting: 0 });
    await live.expireStale();
    expect(lookups()).toBe(2);
    expect(await prisma.auditLog.count({ where: { action: "payment.sweep_mismatch", targetId: odd.payment.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "payment.amount_mismatch", targetId: odd.payment.id } })).toBe(1);
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

  /** Razorpay's signed refund.processed or refund.failed for a payment, as the webhook route passes it on. */
  function refundWebhook(shop: ShopCheckoutService, paymentId: string) {
    return (event: "refund.processed" | "refund.failed", refundId: string, amount: number) => {
      const body = JSON.stringify({
        event,
        payload: { refund: { entity: { id: refundId, payment_id: paymentId, amount, status: event === "refund.processed" ? "processed" : "failed" } } },
      });
      return shop.handleRazorpayWebhook(body, hmacSha256Hex(WEBHOOK_SECRET, body), WEBHOOK_SECRET);
    };
  }

  const refundCalls = (calls: { url: string; body: unknown }[]) => calls.filter((c) => /\/payments\/[^/]+\/refund$/.test(c.url));

  it("a partial refund from the Razorpay dashboard keeps the order; the rest unwinds it, once", async () => {
    const { provider: keys, calls } = fakeRazorpay("rzp_live_key");
    const shop = new ShopCheckoutService(prisma, { provider: () => keys, providerFor: () => keys });
    const stats = new ShopStatsService(prisma);
    const { user, order, product: p } = await paidWithRazorpay(keys);
    const pay = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id, status: "CAPTURED" } });
    expect(pay.amountCents).toBe(25_000);
    const refund = refundWebhook(shop, pay.providerPaymentId!);
    const revenue = (await stats.liveRevenue()).amountCents;

    expect(await refundWebhook(shop, `pay_${uid().slice(0, 12)}`)("refund.processed", `rfnd_${uid().slice(0, 12)}`, 100)).toMatchObject({
      status: 200,
      body: { outcome: "not ours" },
    });

    // ₹100 of ₹250 goes back. Razorpay retries the webhook, even at the same moment: counted once.
    const part1 = `rfnd_${uid().slice(0, 12)}`;
    const first = await Promise.all([refund("refund.processed", part1, 10_000), refund("refund.processed", part1, 10_000)]);
    expect(first.map((r) => r.body.outcome).sort()).toEqual(["already counted", "partial"]);
    expect(await refund("refund.processed", part1, 10_000)).toMatchObject({ status: 200, body: { outcome: "already counted" } });
    let after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(after.status).toBe("PAID");
    expect(after.payments[0]).toMatchObject({ status: "CAPTURED", refundedCents: 10_000, refundIds: [part1] });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(3);
    expect(refundedSpy).not.toHaveBeenCalled();
    expect(await prisma.auditLog.count({ where: { action: "refund.partial_external", targetId: order.id } })).toBe(1);
    expect((await stats.liveRevenue()).amountCents).toBe(revenue - 10_000);
    // The admin analytics page counts it the same way as the orders page.
    const analyticsRevenue = async () => (await platformAnalytics(prisma)).revenue.live.find((m) => m.currency === "INR")?.amountCents ?? 0;
    expect(await analyticsRevenue()).toBe((await stats.liveRevenue()).amountCents);

    // The other ₹150: now the order is unwound, once.
    const part2 = `rfnd_${uid().slice(0, 12)}`;
    expect(await refund("refund.processed", part2, 15_000)).toMatchObject({ body: { outcome: "refunded" } });
    expect(await refund("refund.processed", part2, 15_000)).toMatchObject({ body: { outcome: "already counted" } });
    after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(after.status).toBe("REFUNDED");
    expect(after.payments[0]).toMatchObject({ status: "REFUNDED", refundedCents: 25_000, refundIds: [part1, part2] });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(4);
    expect(refundedSpy).toHaveBeenCalledTimes(1);
    expect(refundedSpy).toHaveBeenCalledWith(order.id);
    expect(await prisma.auditLog.count({ where: { action: "refund.external", targetId: order.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "order.unwind", targetId: order.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: user.id, title: "Order refunded" } })).toBe(1);
    expect((await stats.liveRevenue()).amountCents).toBe(revenue - 25_000);
    expect(await analyticsRevenue()).toBe(revenue - 25_000);
    expect(refundCalls(calls)).toHaveLength(0);

    // Unwinding again changes nothing.
    expect(await refundSvc.unwindOrder(order.id, { actorId: null, source: "test" })).toEqual({ unwound: false, closedRequests: 0 });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(4);
  });

  it("approving a request after a partial dashboard refund sends only the rest; Razorpay confirming it changes nothing", async () => {
    const admin = await createTestUser();
    const { provider: keys, calls } = fakeRazorpay("rzp_live_key");
    const shop = new ShopCheckoutService(prisma, { provider: () => keys, providerFor: () => keys });
    const { user, order, product: p } = await paidWithRazorpay(keys);
    const pay = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id, status: "CAPTURED" } });
    const refund = refundWebhook(shop, pay.providerPaymentId!);
    expect(await refund("refund.processed", `rfnd_${uid().slice(0, 12)}`, 5_000)).toMatchObject({ body: { outcome: "partial" } });

    const svc = new RefundService(prisma, { providerFor: () => keys });
    const req = await svc.requestRefund(user.id, order.id, "Arrived damaged, please refund the rest");
    await expect(svc.approve(admin.id, req.id)).resolves.toMatchObject({ rail: "INR/LIVE", refundedLocally: false });
    const sent = refundCalls(calls);
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({ amount: 20_000 });

    const paid = await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } });
    expect(paid).toMatchObject({ status: "REFUNDED", refundedCents: 25_000 });
    expect(paid.refundIds).toHaveLength(2);
    expect(await prisma.auditLog.findFirst({ where: { action: "refund.approve", targetId: order.id } })).toMatchObject({ meta: { sentCents: 20_000 } });

    // Razorpay's webhook for our own refund arrives afterwards.
    expect(await refund("refund.processed", paid.refundIds[1], 20_000)).toMatchObject({ body: { outcome: "already counted" } });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
    expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("REFUNDED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(4);
    expect(refundedSpy).toHaveBeenCalledTimes(1);
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).toMatchObject({ refundedCents: 25_000 });
  });

  it("a full refund from the dashboard unwinds the order and closes the member's open request", async () => {
    const admin = await createTestUser();
    const { provider: keys, calls } = fakeRazorpay("rzp_live_key");
    const shop = new ShopCheckoutService(prisma, { provider: () => keys, providerFor: () => keys });
    const { user, order, product: p } = await paidWithRazorpay(keys);
    const pay = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id, status: "CAPTURED" } });
    const req = await refundSvc.requestRefund(user.id, order.id, "Please refund, I changed my mind");

    expect(await refundWebhook(shop, pay.providerPaymentId!)("refund.processed", `rfnd_${uid().slice(0, 12)}`, 25_000)).toMatchObject({
      body: { outcome: "refunded" },
    });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
    expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("REFUNDED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(4);
    expect(refundedSpy).toHaveBeenCalledTimes(1);
    // Nothing is left to decide or to send.
    await expect(refundSvc.approve(admin.id, req.id)).rejects.toThrow(/already decided/);
    expect(refundCalls(calls)).toHaveLength(0);
  });

  it("a retried refund.processed finishes an unwind that failed part way", async () => {
    const { provider: keys } = fakeRazorpay("rzp_live_key");
    const shop = new ShopCheckoutService(prisma, { provider: () => keys, providerFor: () => keys });
    const { order, product: p } = await paidWithRazorpay(keys);
    const pay = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id, status: "CAPTURED" } });
    const refundId = `rfnd_${uid().slice(0, 12)}`;
    // The first delivery counted the refund, then failed before the order was unwound.
    await prisma.payment.update({ where: { id: pay.id }, data: { status: "REFUNDED", refundedCents: 25_000, refundIds: [refundId] } });

    expect(await refundWebhook(shop, pay.providerPaymentId!)("refund.processed", refundId, 25_000)).toMatchObject({
      status: 200,
      body: { outcome: "already counted" },
    });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(4);
    expect(refundedSpy).toHaveBeenCalledTimes(1);
  });

  it("refund.failed takes our refund off again and lists the payment until it is refunded again", async () => {
    const admin = await createTestUser();
    const { provider: keys } = fakeRazorpay("rzp_live_key");
    const shop = new ShopCheckoutService(prisma, { provider: () => keys, providerFor: () => keys });
    const { user, order } = await paidWithRazorpay(keys);
    const svc = new RefundService(prisma, { providerFor: () => keys });
    const req = await svc.requestRefund(user.id, order.id, "Wrong size, please refund");
    await svc.approve(admin.id, req.id);
    const pay = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(pay).toMatchObject({ status: "REFUNDED", refundedCents: 25_000 });
    const refund = refundWebhook(shop, pay.providerPaymentId!);

    expect(await refund("refund.failed", pay.refundIds[0], 25_000)).toMatchObject({ status: 200, body: { outcome: "reverted" } });
    expect(await refund("refund.failed", pay.refundIds[0], 25_000)).toMatchObject({ body: { outcome: "not counted" } });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).toMatchObject({ status: "CAPTURED", refundedCents: 0, refundIds: [] });
    expect(await prisma.auditLog.count({ where: { action: "refund.failed", targetId: order.id } })).toBe(1);
    expect((await svc.listFailedRefunds()).find((x) => x.id === pay.id)).toMatchObject({ order: { id: order.id, status: "REFUNDED" } });
    // The order stays refunded: its stock went back already.
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");

    // Sent again from the Razorpay dashboard, it is counted when Razorpay confirms it.
    expect(await refund("refund.processed", `rfnd_${uid().slice(0, 12)}`, 25_000)).toMatchObject({ body: { outcome: "refunded" } });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).toMatchObject({ status: "REFUNDED", refundedCents: 25_000 });
    expect((await svc.listFailedRefunds()).some((x) => x.id === pay.id)).toBe(false);
    expect(refundedSpy).toHaveBeenCalledTimes(1);
  });

  it("staff refund any paid order, at any age, which clears a member's test-paid order from the packing queue", async () => {
    const admin = await createTestUser();
    const { provider: testKeys } = fakeRazorpay("rzp_test_key");
    // Paid in test mode before the fence; the member's 14 days have passed.
    const { user, order, product: p } = await paidWithRazorpay(testKeys);
    await prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date(Date.now() - 40 * 86_400_000) } });
    await expect(refundSvc.requestRefund(user.id, order.id, "Please refund this old order of mine")).rejects.toThrow(/within 14 days/);

    const svc = new RefundService(prisma, { providerFor: () => null }); // the test keys are gone
    await expect(svc.refundOrder(admin.id, order.id, "  ")).rejects.toThrow("Say why — the member sees this note.");
    await expect(svc.refundOrder(admin.id, order.id, "x".repeat(1001))).rejects.toBeInstanceOf(RefundError);
    expect(await svc.refundOrder(admin.id, order.id, "Paid in test mode, so it will not ship")).toMatchObject({ rail: "INR/TEST", refundedLocally: true });

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true, refundRequests: true } });
    expect(after.status).toBe("REFUNDED");
    expect(after.payments[0].status).toBe("REFUNDED");
    expect(after.refundRequests.map((r) => [r.status, r.userId, r.reason, r.adminNote])).toEqual([
      ["REFUNDED", user.id, "Refund started by staff.", "Paid in test mode, so it will not ship"],
    ]);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).inventory).toBe(4);
    expect(refundedSpy).toHaveBeenCalledWith(order.id);
    expect(await prisma.auditLog.findFirst({ where: { action: "refund.staff_request", targetId: order.id } })).toMatchObject({ actorId: admin.id });
    expect(await prisma.notification.count({ where: { userId: user.id, title: "Refund approved" } })).toBe(1);
    await expect(svc.refundOrder(admin.id, order.id, "Once more")).rejects.toThrow("Only a paid order can be refunded.");
    expect(await prisma.order.count({ where: { id: order.id, status: "PAID", items: { some: { product: { kind: "PHYSICAL" } } } } })).toBe(0);
  });

  it("a staff refund decides the member's open request, never a second one", async () => {
    const admin = await createTestUser();
    const { provider: keys, calls } = fakeRazorpay("rzp_live_key");
    const svc = new RefundService(prisma, { providerFor: () => keys });
    const { user, order } = await paidWithRazorpay(keys);
    const req = await svc.requestRefund(user.id, order.id, "The box arrived crushed, please refund");

    await prisma.refundRequest.update({ where: { id: req.id }, data: { status: "APPROVED" } }); // another admin is approving it
    await expect(svc.refundOrder(admin.id, order.id, "Damaged in transit")).rejects.toThrow("A refund for this order is already going through.");
    await prisma.refundRequest.update({ where: { id: req.id }, data: { status: "REQUESTED" } });

    expect(await svc.refundOrder(admin.id, order.id, "Damaged in transit")).toMatchObject({ rail: "INR/LIVE", refundedLocally: false });
    expect(await prisma.refundRequest.findMany({ where: { orderId: order.id }, select: { id: true, status: true, adminNote: true } })).toEqual([
      { id: req.id, status: "REFUNDED", adminNote: "Damaged in transit" },
    ]);
    expect(calls.filter((c) => /\/payments\/[^/]+\/refund$/.test(c.url)).map((c) => c.body)).toEqual([expect.objectContaining({ amount: 25_000 })]);
    expect(await prisma.auditLog.count({ where: { action: "refund.staff_request", targetId: order.id } })).toBe(0);

    const pending = await prisma.order.create({ data: { userId: user.id, status: "PENDING", totalFiatCents: 100, fiatCurrency: "INR", paymentProvider: "razorpay" } });
    await expect(svc.refundOrder(admin.id, pending.id, "Not paid yet")).rejects.toThrow("Only a paid order can be refunded.");
    await expect(svc.refundOrder(admin.id, "no-such-order", "Typo")).rejects.toThrow("Order not found.");
  });

  /** A live payment the old refund.processed handler marked REFUNDED, counted in full by the migration. */
  async function legacyRefunded(keys: RazorpayProvider) {
    const { user, order, product: p } = await paidWithRazorpay(keys);
    const pay = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    await prisma.payment.update({ where: { id: pay.id }, data: { status: "REFUNDED", refundedCents: pay.amountCents } });
    return { user, order, product: p, pay: await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } }) };
  }

  it("a payment marked refunded before amounts were kept is never refunded or counted blind", async () => {
    const admin = await createTestUser();
    const { provider: keys, calls } = fakeRazorpay("rzp_live_key");
    const shop = new ShopCheckoutService(prisma, { provider: () => keys, providerFor: () => keys });
    const svc = new RefundService(prisma, { providerFor: () => keys });
    const { user, order, pay } = await legacyRefunded(keys);
    expect(refundUncounted(pay)).toBe(true);
    expect((await svc.listUncountedRefunds()).map((x) => x.id)).toContain(pay.id);

    // Approving would skip Razorpay and tell the member it is all coming back.
    const req = await svc.requestRefund(user.id, order.id, "Only part of my money came back");
    await expect(svc.approve(admin.id, req.id)).rejects.toThrow(/Check it with Razorpay on the refunds page first/);
    expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("REQUESTED");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");

    // A new refund.processed for it waits to be counted with the others.
    const body = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { id: `rfnd_${uid().slice(0, 12)}`, payment_id: pay.providerPaymentId, amount: 5_000, status: "processed" } } } });
    expect(await shop.handleRazorpayWebhook(body, hmacSha256Hex(WEBHOOK_SECRET, body), WEBHOOK_SECRET)).toMatchObject({ status: 200, body: { outcome: "uncounted" } });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).toMatchObject({ status: "REFUNDED", refundedCents: 25_000, refundIds: [] });
    expect(calls.filter((c) => /\/payments\/[^/]+\/refund$/.test(c.url))).toHaveLength(0);
    expect(refundedSpy).not.toHaveBeenCalled();

    // Paid ones the old approval refunded in full, test payments and new refunds are not in doubt.
    expect(refundUncounted({ ...pay, raw: { previous: null, refund: { id: "rfnd_old" } } })).toBe(false);
    expect(refundUncounted({ ...pay, mode: "TEST" })).toBe(false);
    expect(refundUncounted({ ...pay, refundIds: ["rfnd_new"] })).toBe(false);
    expect(refundUncounted({ ...pay, status: "CAPTURED" })).toBe(false);

    await prisma.payment.update({ where: { id: pay.id }, data: { refundIds: ["rfnd_tidy"] } }); // out of the shared list
  });

  it("checking with Razorpay counts what it really refunded: in full unwinds the order, in part sends only the rest", async () => {
    const admin = await createTestUser();
    const { provider: keys, calls, refunds } = fakeRazorpay("rzp_live_key");
    const svc = new RefundService(prisma, { providerFor: () => keys });
    const rf = (amount: number, status: "pending" | "processed" | "failed" = "processed") => ({ id: `rfnd_${uid().slice(0, 12)}`, amount, status });

    const whole = await legacyRefunded(keys); // refunded in two parts at Razorpay
    const part = await legacyRefunded(keys); // ₹100 of ₹250 back; the order still stands
    const closedEarly = await legacyRefunded(keys); // ₹50 back, then the old approval closed the order without sending the rest
    await prisma.order.update({ where: { id: closedEarly.order.id }, data: { status: "REFUNDED" } });
    const waiting = await legacyRefunded(keys); // nothing found yet, then a refund still pending
    const wholeRefunds = [rf(20_000), rf(5_000), rf(25_000, "failed")];
    refunds.set(whole.pay.providerPaymentId!, wholeRefunds);
    refunds.set(part.pay.providerPaymentId!, [rf(10_000)]);
    refunds.set(closedEarly.pay.providerPaymentId!, [rf(5_000)]);
    refunds.set(waiting.pay.providerPaymentId!, []);

    await expect(new RefundService(prisma, { providerFor: () => fakeRazorpay("rzp_test_key").provider }).countRefundsWithRazorpay(admin.id)).rejects.toThrow(
      "These are live payments: set the live Razorpay keys to check them."
    );
    const mine = (rs: { paymentId: string }[], x: { pay: { id: string } }) => rs.find((r) => r.paymentId === x.pay.id);
    const first = await svc.countRefundsWithRazorpay(admin.id);
    expect(mine(first, whole)).toMatchObject({ outcome: "refunded", refundedCents: 25_000 });
    expect(mine(first, part)).toMatchObject({ outcome: "partial", refundedCents: 10_000 });
    expect(mine(first, closedEarly)).toMatchObject({ outcome: "partial", refundedCents: 5_000 });
    expect(mine(first, waiting)).toMatchObject({ outcome: "none found" });
    expect(calls.filter((c) => c.url.endsWith("/refunds?count=100") && c.method === "GET").length).toBeGreaterThanOrEqual(4);

    // In full: the payment stays refunded with the real refunds, and the order is unwound once.
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: whole.pay.id } })).toMatchObject({
      status: "REFUNDED", refundedCents: 25_000, refundIds: [wholeRefunds[0].id, wholeRefunds[1].id],
    });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: whole.order.id } })).status).toBe("REFUNDED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: whole.product.id } })).inventory).toBe(4);
    expect(refundedSpy).toHaveBeenCalledWith(whole.order.id);
    expect(await prisma.notification.count({ where: { userId: whole.user.id, title: "Order refunded" } })).toBe(1);
    expect(await prisma.auditLog.findFirst({ where: { action: "refund.counted", targetId: whole.order.id } })).toMatchObject({ actorId: admin.id, meta: { refundedCents: 25_000 } });

    // In part: the order still stands and a refund now sends only the rest.
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: part.pay.id } })).toMatchObject({ status: "CAPTURED", refundedCents: 10_000 });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: part.order.id } })).status).toBe("PAID");
    expect(refundedSpy).not.toHaveBeenCalledWith(part.order.id);
    await svc.refundOrder(admin.id, part.order.id, "The rest of the refund");
    expect(calls.filter((c) => /\/payments\/[^/]+\/refund$/.test(c.url)).map((c) => c.body)).toEqual([expect.objectContaining({ amount: 15_000 })]);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: part.order.id } })).status).toBe("REFUNDED");

    // In part on an order already closed: listed as money still to send back.
    expect((await svc.listFailedRefunds()).find((x) => x.id === closedEarly.pay.id)).toMatchObject({ refundedCents: 5_000, order: { status: "REFUNDED" } });

    // Nothing found, then pending: left as it is, and still listed, until Razorpay settles it.
    expect((await svc.listUncountedRefunds()).map((x) => x.id)).toEqual(expect.arrayContaining([waiting.pay.id]));
    const pendingRefund = rf(25_000, "pending");
    refunds.set(waiting.pay.providerPaymentId!, [pendingRefund]);
    expect(mine(await svc.countRefundsWithRazorpay(admin.id), waiting)).toMatchObject({ outcome: "pending" });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: waiting.pay.id } })).toMatchObject({ status: "REFUNDED", refundIds: [] });
    refunds.set(waiting.pay.providerPaymentId!, [{ ...pendingRefund, status: "processed" }]);
    expect(mine(await svc.countRefundsWithRazorpay(admin.id), waiting)).toMatchObject({ outcome: "refunded" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: waiting.order.id } })).status).toBe("REFUNDED");

    // Counted once: none of them is listed again, and Razorpay's webhook for a counted refund changes nothing.
    const listed = (await svc.listUncountedRefunds()).map((x) => x.id);
    for (const x of [whole, part, closedEarly, waiting]) expect(listed).not.toContain(x.pay.id);
    expect(await svc.recordProviderRefund({ providerPaymentId: whole.pay.providerPaymentId!, refundId: wholeRefunds[0].id, amountCents: 20_000 })).toEqual({ outcome: "already counted" });
    expect(refundedSpy).toHaveBeenCalledTimes(3); // whole, part (refunded by staff), waiting
  });
});

/**
 * A CommerceService whose first write to an order lets `meanwhile` run just
 * before it: a refund landing between markShipped's check and its write.
 */
function shippingWhile(meanwhile: () => Promise<unknown>) {
  let pending: (() => Promise<unknown>) | null = meanwhile;
  const orders = new Proxy(prisma.order, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if ((prop !== "update" && prop !== "updateMany") || typeof value !== "function") return value;
      return async (...args: unknown[]) => {
        const run = pending;
        pending = null;
        if (run) await run();
        return value.apply(target, args);
      };
    },
  });
  return new CommerceService(new Proxy(prisma, { get: (target, prop) => (prop === "order" ? orders : Reflect.get(target, prop)) }));
}

describe("Shop — marking a parcel shipped", () => {
  async function paidParcel() {
    const user = await createTestUser();
    const p = await product({ inventory: 5, inr: 40_000 });
    await cart.add(user.id, p.id);
    const { order } = await checkout.startInrCheckout(user.id, { shipping: ADDRESS });
    await checkout.sandboxCapture(user.id, order.id);
    return { user, order, product: p };
  }
  const stock = async (productId: string) => (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).inventory;
  const toldShipped = (userId: string) => prisma.notification.count({ where: { userId, title: "Your order is on its way" } });

  it("a refund that lands between the check and the write wins: the order stays refunded and unshipped, and its stock stays back", async () => {
    const admin = await createTestUser();
    const { user, order, product: p } = await paidParcel();
    expect(await stock(p.id)).toBe(4);
    const req = await refundSvc.requestRefund(user.id, order.id, "Changed my mind, please refund");

    const err = await shippingWhile(() => refundSvc.approve(admin.id, req.id))
      .markShipped(order.id, "Delhivery", "DLV123")
      .catch((e) => e);
    expect(err).toBeInstanceOf(CommerceError);
    expect(err.message).toBe("This order was refunded. Do not ship it.");

    expect(await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: "REFUNDED", shippedAt: null, trackingCarrier: null, trackingNumber: null,
    });
    expect(await stock(p.id)).toBe(5); // the unit went back on the shelf and stays there
    expect(await toldShipped(user.id)).toBe(0);
    expect(refundedSpy).toHaveBeenCalledWith(order.id);
  });

  it("the other way round, the parcel went out first: the refund leaves the stock alone", async () => {
    const admin = await createTestUser();
    const { user, order, product: p } = await paidParcel();
    const req = await refundSvc.requestRefund(user.id, order.id, "Changed my mind, please refund");
    const shipped = await new CommerceService(prisma).markShipped(order.id, "Delhivery", "DLV124");
    expect(shipped).toMatchObject({ status: "FULFILLED", trackingCarrier: "Delhivery", trackingNumber: "DLV124" });
    await refundSvc.approve(admin.id, req.id);
    expect(await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "REFUNDED", trackingNumber: "DLV124" });
    expect(await stock(p.id)).toBe(4); // that unit is in the post, not on the shelf
    expect(await toldShipped(user.id)).toBe(1);
  });

  it("two Mark shipped clicks at once ship it once and tell the member once", async () => {
    const { user, order } = await paidParcel();
    const commerce = new CommerceService(prisma);
    const results = await Promise.allSettled([
      commerce.markShipped(order.id, "Delhivery", "DLV125"),
      commerce.markShipped(order.id, "Blue Dart", "BD126"),
    ]);
    expect(await toldShipped(user.id)).toBe(1);
    const refused = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(refused).toHaveLength(1);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("FULFILLED");
    expect(refused[0].reason).toBeInstanceOf(CommerceError);
    expect(refused[0].reason.message).toBe(`This order was already marked shipped (${after.trackingCarrier} ${after.trackingNumber}).`);
  });

  it("says why it will not ship an order that is not paid", async () => {
    const { order } = await paidParcel();
    await new RefundService(prisma).unwindOrder(order.id, { actorId: null, source: "test" });
    await expect(new CommerceService(prisma).markShipped(order.id, "Delhivery", "DLV127")).rejects.toThrow("This order was refunded. Do not ship it.");
  });
});
