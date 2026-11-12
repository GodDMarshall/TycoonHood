/**
 * Order.paidAt (data-model 0.5): the moment an order became PAID, written by
 * the same write that makes it PAID on every path, and never moved after. A
 * paid time used to be read from the captured Payment's createdAt, but that
 * row is written when the order starts, not when it is paid, and THC orders
 * and legacy rupee orders have no Payment at all.
 *
 * The paths: one product for THC (CommerceService.checkoutWithThc), the cart
 * for THC (ShopCheckoutService.checkoutThc), the legacy rupee settlement
 * (CommerceService.settleFiatOrder, which the Stripe webhook, the dev
 * provider and staff settling by hand all go through), and a captured rupee
 * payment (ShopCheckoutService.capture, reached by the Razorpay callback, the
 * Razorpay webhook, the sandbox and the stale-order sweep).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { CommerceService } from "../src/commerce/commerce";
import { ManualSettlementError, ManualSettlementService } from "../src/commerce/manual-settlement";
import { CartService, PENDING_TTL_MINUTES, RazorpayProvider, SandboxProvider, ShopCheckoutService, setEarnHooks } from "../src/shop";
import { hmacSha256Hex } from "../src/shop/payments/razorpay";
import { LedgerService } from "../src/ledger/ledger";
import { createTestUser, uid } from "./helpers";

const commerce = new CommerceService(prisma);
const settlement = new ManualSettlementService(prisma);
const ledger = new LedgerService(prisma);
const cart = new CartService(prisma);
const sandboxProvider = new SandboxProvider();
const sandbox = new ShopCheckoutService(prisma, { provider: () => sandboxProvider, sandboxEnabled: () => true });

const KEY_SECRET = "paid_at_test_key_secret";
const WEBHOOK_SECRET = "paid_at_test_webhook_secret";
const products: string[] = [];

beforeAll(() => {
  setEarnHooks(null); // no affiliate attribution: these orders are about their own paid time
});
afterAll(async () => {
  setEarnHooks(undefined);
  await prisma.product.updateMany({ where: { id: { in: products } }, data: { active: false } });
});

/** A digital item with unlimited stock, sold for THC and for rupees. */
async function product() {
  const p = await prisma.product.create({
    data: {
      slug: `paid-at-${uid().slice(0, 8)}`,
      kind: "DIGITAL",
      name: "Paid-at test item",
      description: "test",
      active: true,
      priceThc: 500n,
      priceFiatCents: 25_000,
      fiatCurrency: "INR",
      inventory: null,
    },
  });
  products.push(p.id);
  return p;
}

async function fundedMember(amount = 1_000n) {
  const user = await createTestUser();
  await ledger.reward({ userId: user.id, amount, reason: "REWARD_ADMIN", idempotencyKey: `fund-${uid()}` });
  return user;
}

const paidAt = async (orderId: string) => (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).paidAt;

/** Runs `step` and checks that it set the order's paid time to a moment during the step. */
async function paidDuring(orderId: string, step: () => Promise<unknown>) {
  expect(await paidAt(orderId)).toBeNull();
  const before = Date.now();
  await step();
  const after = Date.now();
  const at = await paidAt(orderId);
  expect(at).toBeInstanceOf(Date);
  expect(at!.getTime()).toBeGreaterThanOrEqual(before);
  expect(at!.getTime()).toBeLessThanOrEqual(after);
  return at!;
}

/** A Razorpay provider over a fake API that knows the orders it created. */
function fakeRazorpay() {
  const orders = new Map<string, { status: "created" | "attempted" | "paid"; payments: { id: string; amount: number; currency: string; status: string }[] }>();
  const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetchImpl = async (url: string, init: { method: string; body?: string }) => {
    if (init.method === "GET") {
      const [, id = "", payments] = url.match(/\/orders\/([^/]+)(\/payments)?$/) ?? [];
      const o = orders.get(decodeURIComponent(id));
      if (!o) return reply(400, { error: { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" } });
      return reply(200, payments ? { entity: "collection", count: o.payments.length, items: o.payments } : { id, entity: "order", status: o.status });
    }
    const id = `order_${uid().slice(0, 12)}`;
    orders.set(id, { status: "created", payments: [] });
    return reply(200, { id, ...JSON.parse(init.body ?? "{}") });
  };
  const provider = new RazorpayProvider("rzp_test_paid_at", KEY_SECRET, fetchImpl);
  return { orders, svc: new ShopCheckoutService(prisma, { provider: () => provider, providerFor: () => provider }) };
}

/** A member with the item in their cart and a rupee order waiting for payment. */
async function rupeeOrder(svc: ShopCheckoutService) {
  const user = await createTestUser();
  const p = await product();
  await cart.add(user.id, p.id);
  const { order, payment } = await svc.startInrCheckout(user.id);
  return { user, order, payment, providerOrderId: payment.providerOrderId! };
}

const webhookBody = (providerOrderId: string, paymentId: string, amount: number) =>
  JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentId, order_id: providerOrderId, amount, currency: "INR", status: "captured" } } },
  });

describe("THC orders are paid when the ledger spend lands", () => {
  it("one product for THC", async () => {
    const user = await fundedMember();
    const p = await product();
    const before = Date.now();
    const order = await commerce.checkoutWithThc(user.id, p.slug);
    const at = await paidAt(order.id);
    expect(order.status).toBe("FULFILLED");
    expect(at).toBeInstanceOf(Date);
    expect(at!.getTime()).toBeGreaterThanOrEqual(before);
    expect(at!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("the cart for THC", async () => {
    const user = await fundedMember();
    const p = await product();
    await cart.add(user.id, p.id);
    const before = Date.now();
    const order = await sandbox.checkoutThc(user.id);
    const at = await paidAt(order.id);
    expect(at).toBeInstanceOf(Date);
    expect(at!.getTime()).toBeGreaterThanOrEqual(before);
    expect(at!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("an order the wallet cannot pay is never paid", async () => {
    const user = await createTestUser();
    const p = await product();
    await expect(commerce.checkoutWithThc(user.id, p.slug)).rejects.toThrow();
    const cancelled = await prisma.order.findFirstOrThrow({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.paidAt).toBeNull();
  });
});

describe("legacy rupee orders are paid when they are settled", () => {
  it("settleFiatOrder sets the paid time once; a second settle does not move it", async () => {
    const user = await createTestUser();
    const p = await product();
    const order = await commerce.createFiatOrder(user.id, p.slug, "test");
    const at = await paidDuring(order.id, () => commerce.settleFiatOrder(order.id, "ref_first"));
    expect((await commerce.settleFiatOrder(order.id, "ref_second")).settled).toBe(false);
    expect(await paidAt(order.id)).toEqual(at);
  });

  it("staff settling by hand sets the paid time; a second settle is refused and does not move it", async () => {
    const user = await createTestUser();
    const staff = await prisma.user.update({ where: { id: (await createTestUser()).id }, data: { role: "ADMIN" } });
    const p = await product();
    const order = await commerce.createFiatOrder(user.id, p.slug, "dev");
    const at = await paidDuring(order.id, () => settlement.settle(staff, order.id));
    await expect(settlement.settle(staff, order.id)).rejects.toBeInstanceOf(ManualSettlementError);
    expect(await paidAt(order.id)).toEqual(at);
  });

  it("a cancelled rupee order is never paid", async () => {
    const user = await createTestUser();
    const p = await product();
    const order = await commerce.createFiatOrder(user.id, p.slug, "test");
    await commerce.cancelFiatOrder(order.id);
    expect((await commerce.settleFiatOrder(order.id, "ref_late")).settled).toBe(false);
    expect(await paidAt(order.id)).toBeNull();
  });
});

describe("rupee orders are paid when their payment is captured", () => {
  it("the sandbox; capturing again does not move the paid time", async () => {
    const { user, order } = await rupeeOrder(sandbox);
    const at = await paidDuring(order.id, () => sandbox.sandboxCapture(user.id, order.id));
    expect((await sandbox.sandboxCapture(user.id, order.id)).outcome).toBe("duplicate");
    expect(await paidAt(order.id)).toEqual(at);
  });

  it("the Razorpay callback; the webhook for the same payment does not move the paid time", async () => {
    const { svc } = fakeRazorpay();
    const { user, order, providerOrderId } = await rupeeOrder(svc);
    const paymentId = `pay_${uid().slice(0, 12)}`;
    const signature = hmacSha256Hex(KEY_SECRET, `${providerOrderId}|${paymentId}`);
    const at = await paidDuring(order.id, async () => {
      expect((await svc.verifyRazorpayCallback(user.id, { razorpayOrderId: providerOrderId, razorpayPaymentId: paymentId, signature })).outcome).toBe("paid");
    });
    const body = webhookBody(providerOrderId, paymentId, order.totalFiatCents!);
    expect(await svc.handleRazorpayWebhook(body, hmacSha256Hex(WEBHOOK_SECRET, body), WEBHOOK_SECRET)).toMatchObject({ body: { outcome: "duplicate" } });
    expect(await paidAt(order.id)).toEqual(at);
  });

  it("the Razorpay webhook alone", async () => {
    const { svc } = fakeRazorpay();
    const { order, providerOrderId } = await rupeeOrder(svc);
    const body = webhookBody(providerOrderId, `pay_${uid().slice(0, 12)}`, order.totalFiatCents!);
    await paidDuring(order.id, async () => {
      expect(await svc.handleRazorpayWebhook(body, hmacSha256Hex(WEBHOOK_SECRET, body), WEBHOOK_SECRET)).toMatchObject({ body: { outcome: "paid" } });
    });
  });

  it("the sweep, for an order Razorpay says was paid but nobody told us", async () => {
    const { svc, orders } = fakeRazorpay();
    const { user, order, providerOrderId } = await rupeeOrder(svc);
    await prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date(Date.now() - (PENDING_TTL_MINUTES + 1) * 60_000) } });
    orders.set(providerOrderId, {
      status: "paid",
      payments: [{ id: `pay_${uid().slice(0, 12)}`, amount: order.totalFiatCents!, currency: "INR", status: "captured" }],
    });
    await paidDuring(order.id, async () => {
      expect(await svc.expireStale(new Date(), { orderId: order.id, userId: user.id })).toMatchObject({ captured: 1 });
    });
  });

  it("a payment that lands after the order was cancelled does not make it paid", async () => {
    const { svc } = fakeRazorpay();
    const { user, order, providerOrderId } = await rupeeOrder(svc);
    expect(await svc.abandon(user.id, order.id)).toBe(true);
    const late = await svc.capture({ providerOrderId, providerPaymentId: `pay_${uid().slice(0, 12)}`, source: "webhook" });
    expect(late.outcome).toBe("late");
    expect(await paidAt(order.id)).toBeNull();
  });
});
