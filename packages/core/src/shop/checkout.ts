/**
 * CHECKOUT — the whole cart, on one of two rails.
 *
 * THC rail. Stock is reserved line by line through commerce's guarded UPDATE
 * (DR-10), the order is written, then ONE ledger spend for the total is posted
 * (idempotent on `order:<id>`). Any failure gives back every unit already
 * reserved and cancels the order, so "not enough THC" leaves nothing taken.
 *
 * INR rail. Stock is reserved and a PENDING order is written in the same
 * transaction as the coupon redemption; then the active provider (Razorpay,
 * or the TEST sandbox) creates its order and a Payment row records it. The
 * order turns PAID only on a VERIFIED capture — the Razorpay callback with a
 * valid signature, the signed webhook, the sandbox's simulated capture, or
 * the expiry sweep finding the payment at Razorpay — and every one of those
 * converges on capture(), which is idempotent on the payment.
 *
 * A failed attempt does not end the order: Razorpay Checkout lets the member
 * retry on the same order, so payment.failed is only recorded. The order is
 * cancelled, giving back the stock and the coupon, when the member abandons
 * it, an admin cancels it, or expireStale finds it unpaid after the hold. The
 * sweep asks Razorpay first, so it never cancels an order that was paid, and
 * gives one the member is still paying for PAYING_GRACE_MINUTES more.
 *
 * After a capture: order PAID → cart lines cleared → fulfilment exactly as
 * commerce does it (course grants, notifications, PURCHASE_MADE) → the earn
 * hook onOrderPaid(orderId).
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient, Prisma } from "@tycoonhood/db";
import type { HasRole } from "../auth/permissions";
import { CommerceService, requireShipping, type ShippingInput } from "../commerce/commerce";
import { LedgerService, InsufficientFundsError } from "../ledger/ledger";
import { AuditService } from "../platform/audit";
import { CartService, type CartLineView } from "./cart";
import { CouponService } from "./coupons";
import { callEarnHook } from "./earn-registry";
import { CheckoutError, PaymentVerificationError } from "./errors";
import { SHOP_CURRENCY } from "./pricing";
import { activeShopProvider, razorpayFromEnv, sandboxProvider, sandboxAllowed, RazorpayProvider } from "./payments";
import type { RazorpayWebhookEvent, ShopPaymentProvider } from "./payments";
import { verifyWebhookSignature } from "./payments/razorpay";

/** How long a rupee order may wait for its payment before its stock goes back. */
export const PENDING_TTL_MINUTES = 30;
/** Extra time after the hold for an order Razorpay shows as attempted: the member may be retrying. */
export const PAYING_GRACE_MINUTES = 30;
/** Page loads run the expiry sweep at most this often, per server instance. */
export const SWEEP_EVERY_MS = 60_000;

export interface ShopCheckoutOptions {
  /**
   * The provider this buyer's new orders go to. Defaults to
   * activeShopProvider(process.env, buyer), which keeps Razorpay test keys in
   * production for staff with admin.commerce.
   */
  provider?: (buyer: HasRole) => ShopPaymentProvider | null;
  /** Looks a provider up by the name on a Payment row (refunds, verification). */
  providerFor?: (name: string) => ShopPaymentProvider | null;
  /** Whether the sandbox may capture. Defaults to sandboxAllowed() — false in production. */
  sandboxEnabled?: () => boolean;
}

export type CaptureOutcome = "paid" | "duplicate" | "late";

function defaultProviderFor(name: string): ShopPaymentProvider | null {
  if (name === "razorpay") return razorpayFromEnv();
  if (name === "sandbox") return sandboxProvider;
  return null;
}

const addressCreate = (s: ShippingInput) => ({
  create: {
    fullName: s.fullName.trim(),
    line1: s.line1.trim(),
    line2: s.line2?.trim() || null,
    city: s.city.trim(),
    region: s.region?.trim() || null,
    postalCode: s.postalCode.trim(),
    country: s.country.trim().toUpperCase(),
    phone: s.phone?.trim() || null,
  },
});

const lineMemo = (lines: CartLineView[]) =>
  lines.map((l) => `${l.qty}× ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ""}`).join(", ").slice(0, 300);

export class ShopCheckoutService {
  private commerce: CommerceService;
  private ledger: LedgerService;
  private cart: CartService;
  private coupons: CouponService;
  private audit: AuditService;
  private provider: (buyer: HasRole) => ShopPaymentProvider | null;
  private providerFor: (name: string) => ShopPaymentProvider | null;
  private sandboxEnabled: () => boolean;
  private lastSweepAt = 0;

  constructor(private readonly db: PrismaClient = defaultPrisma, opts: ShopCheckoutOptions = {}) {
    this.commerce = new CommerceService(db);
    this.ledger = new LedgerService(db);
    this.cart = new CartService(db);
    this.coupons = new CouponService(db);
    this.audit = new AuditService(db);
    this.provider = opts.provider ?? ((buyer) => activeShopProvider(process.env, buyer));
    this.providerFor = opts.providerFor ?? defaultProviderFor;
    this.sandboxEnabled = opts.sandboxEnabled ?? (() => sandboxAllowed());
  }

  /** Reserves every line or none: on the first failure, what was taken goes back. */
  private async reserveAll(lines: CartLineView[]) {
    const taken: CartLineView[] = [];
    try {
      for (const l of lines) {
        await this.commerce.reserveUnits(l.productId, l.variantId, l.qty);
        taken.push(l);
      }
    } catch (e) {
      for (const l of taken) await this.commerce.releaseUnits(l.productId, l.variantId, l.qty);
      throw e;
    }
  }

  private async releaseAll(lines: { productId: string; variantId: string | null; qty: number }[]) {
    for (const l of lines) await this.commerce.releaseUnits(l.productId, l.variantId, l.qty);
  }

  private async readyCart(userId: string) {
    const { lines, totals } = await this.cart.list(userId);
    if (lines.length === 0) throw new CheckoutError("Your cart is empty.");
    const blocked = lines.find((l) => l.problem);
    if (blocked) throw new CheckoutError(`${blocked.name}: ${blocked.problem}`);
    return { lines, totals };
  }

  // ------------------------------------------------------------------ THC

  async checkoutThc(userId: string, input: { shipping?: ShippingInput | null } = {}) {
    const { lines, totals } = await this.readyCart(userId);
    if (!totals.thc.payable) {
      const names = lines.filter((l) => l.unitThc == null).map((l) => l.name);
      throw new CheckoutError(`Not payable with THC: ${names.join(", ")}. Remove ${names.length === 1 ? "it" : "them"} or pay in rupees.`);
    }
    const shipping = totals.needsAddress ? requireShipping(input.shipping) : null;
    const total = totals.thc.total;

    // Cheap early answer; the ledger's own check below is the real guard.
    const wallet = await this.ledger.ensureUserAccount(userId);
    if ((await this.ledger.getBalance(wallet.id)) < total) {
      throw new InsufficientFundsError("Not enough THC for this cart.");
    }

    await this.reserveAll(lines);

    let order;
    try {
      order = await this.db.order.create({
        data: {
          userId,
          totalThc: total,
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              variantLabel: l.variantLabel,
              qty: l.qty,
              unitPriceThc: l.unitThc,
            })),
          },
          ...(shipping ? { address: addressCreate(shipping) } : {}),
        },
      });
    } catch (e) {
      await this.releaseAll(lines);
      throw e;
    }

    let tx;
    try {
      tx = await this.ledger.spend({
        userId,
        amount: total,
        idempotencyKey: `order:${order.id}`,
        sourceType: "order",
        sourceId: order.id,
        memo: lineMemo(lines),
      });
    } catch (e) {
      await this.releaseAll(lines);
      await this.db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      throw e;
    }

    await this.db.order.update({ where: { id: order.id }, data: { status: "PAID", ledgerTxId: tx.id } });
    await this.cart.clear(userId, lines.map((l) => l.lineKey));
    await this.commerce.fulfillOrder(order.id);
    await this.audit.log({ actorId: userId, action: "order.paid", targetType: "order", targetId: order.id, meta: { rail: "THC", total: total.toString() } });
    return this.db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
  }

  // ------------------------------------------------------------------ INR

  /** Re-prices the cart for the rupee rail with an optional coupon. Read-only. */
  async quoteInr(userId: string, couponCode?: string | null) {
    const { lines, totals } = await this.cart.list(userId);
    const subtotal = totals.inr.total;
    let discountCents = 0;
    let couponError: string | null = null;
    let code: string | null = null;
    if (couponCode?.trim()) {
      const check = await this.coupons.validate(couponCode, userId, subtotal);
      if (check.ok) {
        discountCents = check.discountCents;
        code = check.coupon.code;
      } else couponError = check.reason;
    }
    return { lines, totals, subtotalCents: subtotal, discountCents, totalCents: subtotal - discountCents, couponCode: code, couponError };
  }

  async startInrCheckout(
    userId: string,
    input: { shipping?: ShippingInput | null; couponCode?: string | null; affiliateCode?: string | null } = {}
  ) {
    // The rail depends on who is buying (test keys in production are staff-only),
    // so the role is read here, on the server, from the database.
    const buyer = await this.db.user.findUnique({ where: { id: userId }, select: { role: true } });
    const provider = this.provider(buyer);
    if (!provider) throw new CheckoutError("Card payments are not available right now. You can still pay with THC.");

    const { lines, totals } = await this.readyCart(userId);
    if (!totals.inr.payable) {
      const names = lines.filter((l) => l.unitInrPaise == null).map((l) => l.name);
      throw new CheckoutError(`No rupee price for: ${names.join(", ")}. Remove ${names.length === 1 ? "it" : "them"} or pay with THC.`);
    }
    const shipping = totals.needsAddress ? requireShipping(input.shipping) : null;
    const subtotal = totals.inr.total;

    // One open rupee order per member: an abandoned one gives its stock back first.
    const open = await this.db.order.findMany({
      where: { userId, status: "PENDING", paymentProvider: { not: null } },
      select: { id: true },
    });
    for (const o of open) await this.cancelOrder(o.id, "Replaced by a new checkout");

    await this.reserveAll(lines);

    let order;
    try {
      order = await this.db.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId,
            totalFiatCents: subtotal,
            fiatCurrency: SHOP_CURRENCY,
            paymentProvider: provider.name,
            affiliateCode: input.affiliateCode?.trim().slice(0, 64) || null,
            items: {
              create: lines.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                variantLabel: l.variantLabel,
                qty: l.qty,
                unitPriceFiatC: l.unitInrPaise,
              })),
            },
            ...(shipping ? { address: addressCreate(shipping) } : {}),
          },
        });
        if (!input.couponCode?.trim()) return created;
        const r = await this.coupons.redeemInTx(tx, { code: input.couponCode, userId, orderId: created.id, subtotalCents: subtotal });
        return tx.order.update({
          where: { id: created.id },
          data: { couponCode: r.code, discountCents: r.discountCents, totalFiatCents: subtotal - r.discountCents },
        });
      });
    } catch (e) {
      await this.releaseAll(lines);
      throw e;
    }

    let created;
    try {
      created = await provider.createOrder({
        amountCents: order.totalFiatCents,
        currency: SHOP_CURRENCY,
        receipt: order.id,
        notes: { orderId: order.id },
      });
    } catch (e) {
      await this.cancelOrder(order.id, "Payment provider refused the order");
      console.error("[shop] provider createOrder failed", e);
      throw new CheckoutError("The payment provider could not start this payment. Nothing was charged — try again in a moment.");
    }

    const payment = await this.db.payment.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        mode: provider.mode,
        providerOrderId: created.providerOrderId,
        amountCents: order.totalFiatCents,
        currency: SHOP_CURRENCY,
        raw: (created.raw ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: "order.create",
      targetType: "order",
      targetId: order.id,
      meta: { rail: "INR", provider: provider.name, mode: provider.mode, totalCents: order.totalFiatCents, coupon: order.couponCode },
    });
    return { order, payment };
  }

  /**
   * THE convergence point for a verified payment. Idempotent on the payment:
   * a second call (webhook after callback, a retried webhook) changes nothing.
   */
  async capture(args: {
    providerOrderId: string;
    providerPaymentId: string;
    amountCents?: number;
    currency?: string;
    raw?: unknown;
    source: "callback" | "webhook" | "sandbox" | "sweep";
  }): Promise<{ orderId: string; outcome: CaptureOutcome }> {
    const payment = await this.db.payment.findUnique({ where: { providerOrderId: args.providerOrderId } });
    if (!payment) throw new PaymentVerificationError("Unknown payment order.");
    if (args.amountCents != null && args.amountCents !== payment.amountCents) {
      await this.audit.log({ actorId: null, action: "payment.amount_mismatch", targetType: "payment", targetId: payment.id, meta: { expected: payment.amountCents, got: args.amountCents } });
      throw new PaymentVerificationError("Payment amount does not match the order.");
    }
    if (args.currency && args.currency.toUpperCase() !== payment.currency.toUpperCase()) {
      throw new PaymentVerificationError("Payment currency does not match the order.");
    }

    const claimed = await this.db.payment.updateMany({
      where: { id: payment.id, status: { in: ["CREATED", "FAILED"] } },
      data: {
        status: "CAPTURED",
        providerPaymentId: args.providerPaymentId,
        raw: (args.raw ?? { source: args.source }) as Prisma.InputJsonValue,
      },
    });
    if (claimed.count === 0) return { orderId: payment.orderId, outcome: "duplicate" };

    const order = await this.db.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });
    const paid = await this.db.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID", paymentRef: args.providerPaymentId },
    });

    if (paid.count === 0) {
      // Money arrived for an order that had already expired or been replaced.
      // Its stock went back on the shelf, so it is not quietly revived; it goes
      // straight to the refunds queue for a human to send back.
      await this.db.refundRequest.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          reason: "Automatic: the payment arrived after this order had been cancelled. Refund it in full.",
        },
      });
      await this.audit.log({ actorId: null, action: "payment.captured_after_cancel", targetType: "order", targetId: order.id, meta: { source: args.source, mode: payment.mode } });
      await this.db.notification.create({
        data: {
          userId: order.userId,
          type: "ORDER",
          title: "Payment received for a cancelled order",
          body: "Your payment came through after the order had expired. We have queued a full refund.",
          data: { orderId: order.id, href: `/orders/${order.id}` },
        },
      });
      return { orderId: order.id, outcome: "late" };
    }

    const keys = order.items.map((i) => `${i.productId}:${i.variantId ?? "-"}`);
    await this.cart.clear(order.userId, keys);
    await this.commerce.fulfillOrder(order.id);
    await this.audit.log({
      actorId: args.source === "webhook" || args.source === "sweep" ? null : order.userId,
      action: "order.paid",
      targetType: "order",
      targetId: order.id,
      meta: { rail: "INR", provider: payment.provider, mode: payment.mode, source: args.source, totalCents: payment.amountCents },
    });
    await callEarnHook("onOrderPaid", order.id, this.db);
    return { orderId: order.id, outcome: "paid" };
  }

  /** The Razorpay Checkout.js success handler, verified with the key secret. */
  async verifyRazorpayCallback(
    userId: string,
    args: { razorpayOrderId: string; razorpayPaymentId: string; signature: string }
  ) {
    const payment = await this.db.payment.findUnique({ where: { providerOrderId: args.razorpayOrderId }, include: { order: true } });
    if (!payment || payment.order.userId !== userId || payment.provider !== "razorpay") {
      throw new PaymentVerificationError("That payment does not belong to this order.");
    }
    const provider = this.providerFor("razorpay");
    if (!(provider instanceof RazorpayProvider)) throw new PaymentVerificationError("Razorpay is not configured.");
    if (!provider.verifyCheckout(args)) {
      await this.audit.log({ actorId: userId, action: "payment.bad_signature", targetType: "payment", targetId: payment.id, meta: { source: "callback" } });
      throw new PaymentVerificationError("The payment signature did not verify. Nothing was recorded as paid.");
    }
    return this.capture({ providerOrderId: args.razorpayOrderId, providerPaymentId: args.razorpayPaymentId, source: "callback" });
  }

  private async sandboxPayment(userId: string, orderId: string) {
    if (!this.sandboxEnabled()) throw new CheckoutError("Test payments are disabled on this deployment.");
    const payment = await this.db.payment.findFirst({
      where: { orderId, provider: "sandbox", mode: "TEST", order: { userId } },
      orderBy: { createdAt: "desc" },
    });
    if (!payment?.providerOrderId) throw new CheckoutError("No test payment is waiting on this order.");
    return payment as typeof payment & { providerOrderId: string };
  }

  /** "Pay (test)" — simulates a successful capture. TEST mode only, never in production. */
  async sandboxCapture(userId: string, orderId: string) {
    const payment = await this.sandboxPayment(userId, orderId);
    return this.capture({
      providerOrderId: payment.providerOrderId,
      providerPaymentId: sandboxProvider.newPaymentId(),
      amountCents: payment.amountCents,
      currency: payment.currency,
      raw: { sandbox: true },
      source: "sandbox",
    });
  }

  /**
   * "Simulate a failed payment" — TEST mode only. The sandbox has no retry, so
   * the order is cancelled and the stock and coupon go back.
   */
  async sandboxFail(userId: string, orderId: string) {
    const payment = await this.sandboxPayment(userId, orderId);
    await this.cancelOrder(payment.orderId, "Simulated failure (test mode)", userId);
  }

  /**
   * One failed attempt (Razorpay's payment.failed). The member can retry on the
   * same Razorpay order, so the order stays PENDING with its stock and coupon,
   * and the payment stays open. Only the attempt is recorded.
   */
  async recordFailedAttempt(args: { providerOrderId: string; providerPaymentId?: string | null; reason?: string | null }) {
    const payment = await this.db.payment.findUnique({ where: { providerOrderId: args.providerOrderId } });
    if (!payment) return null;
    await this.audit.log({
      actorId: null,
      action: "payment.attempt_failed",
      targetType: "payment",
      targetId: payment.id,
      meta: { orderId: payment.orderId, providerPaymentId: args.providerPaymentId ?? null, reason: args.reason?.slice(0, 300) ?? null },
    });
    return payment.orderId;
  }

  /** PENDING → CANCELLED, once. Stock, coupon and the open payment are released. */
  async cancelOrder(orderId: string, reason: string, actorId: string | null = null) {
    const done = await this.db.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
    if (done.count === 0) return false;
    const items = await this.db.orderItem.findMany({ where: { orderId } });
    await this.releaseAll(items);
    await this.coupons.release(orderId);
    await this.db.payment.updateMany({ where: { orderId, status: "CREATED" }, data: { status: "FAILED" } });
    await this.audit.log({ actorId, action: "order.cancel", targetType: "order", targetId: orderId, meta: { reason } });
    return true;
  }

  /** The member walks away from their own unpaid order. */
  async abandon(userId: string, orderId: string) {
    const order = await this.db.order.findFirst({ where: { id: orderId, userId, status: "PENDING" } });
    if (!order) return false;
    return this.cancelOrder(orderId, "Cancelled by the member", userId);
  }

  /**
   * Ends rupee orders that waited longer than PENDING_TTL_MINUTES for payment.
   * A Razorpay order is looked up first: one already paid is captured instead,
   * and one the member has started paying waits PAYING_GRACE_MINUTES more.
   * Everything else is cancelled, which gives back the stock and the coupon.
   * With `orderId` and `userId`, only that member's order is looked at (the pay page).
   */
  async expireStale(now = new Date(), opts: { orderId?: string; userId?: string } = {}) {
    const cutoff = new Date(now.getTime() - PENDING_TTL_MINUTES * 60_000);
    const graceCutoff = new Date(cutoff.getTime() - PAYING_GRACE_MINUTES * 60_000);
    const stale = await this.db.order.findMany({
      where: {
        status: "PENDING",
        paymentProvider: { not: null },
        createdAt: { lt: cutoff },
        payments: { none: { status: "CAPTURED" } },
        ...(opts.orderId ? { id: opts.orderId } : {}),
        ...(opts.userId ? { userId: opts.userId } : {}),
      },
      select: { id: true, createdAt: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    const result = { cancelled: 0, captured: 0, waiting: 0 };
    for (const o of stale) {
      const verdict = await this.staleVerdict(o.payments[0], o.createdAt < graceCutoff);
      if (verdict === "captured") result.captured++;
      else if (verdict === "wait") result.waiting++;
      else if (await this.cancelOrder(o.id, "Payment window expired")) result.cancelled++;
    }
    return result;
  }

  /**
   * expireStale for page loads: the store, product, cart, wishlist, checkout
   * and admin order pages call it before they read stock. At most once per
   * SWEEP_EVERY_MS on this server instance, and it never throws into the page.
   * The cron route (/api/cron/expire-orders) also runs expireStale on a
   * schedule, so holds go on time even when nobody is browsing.
   */
  async sweepStale(now = new Date()) {
    if (now.getTime() - this.lastSweepAt < SWEEP_EVERY_MS) return null;
    this.lastSweepAt = now.getTime();
    try {
      return await this.expireStale(now);
    } catch (e) {
      console.error("[shop] stale-order sweep failed", e);
      return null;
    }
  }

  /** What the sweep does with one stale order's latest payment. */
  private async staleVerdict(
    payment: { provider: string; mode: string; providerOrderId: string | null } | undefined,
    pastGrace: boolean
  ): Promise<"cancel" | "wait" | "captured"> {
    if (!payment?.providerOrderId) return "cancel";
    const provider = this.providerFor(payment.provider);
    // The sandbox has nobody to ask, and keys of the other mode cannot see the order.
    if (!provider?.checkOrder || provider.mode !== payment.mode) return "cancel";
    try {
      const check = await provider.checkOrder(payment.providerOrderId);
      if (!check) return "cancel"; // unknown to the provider, so nobody can pay it
      if (check.captured) {
        await this.capture({
          providerOrderId: payment.providerOrderId,
          providerPaymentId: check.captured.providerPaymentId,
          amountCents: check.captured.amountCents,
          currency: check.captured.currency,
          raw: { source: "sweep", check } as unknown,
          source: "sweep",
        });
        return "captured";
      }
      // Attempted: the member may be retrying in the Razorpay window right now.
      return check.status !== "created" && !pastGrace ? "wait" : "cancel";
    } catch (e) {
      // Not knowing is not a reason to cancel: try again on the next sweep.
      console.error("[shop] could not check a stale order with the payment provider", e);
      return "wait";
    }
  }

  /**
   * The Razorpay webhook. Verifies X-Razorpay-Signature over the raw body,
   * then routes the event. Always idempotent: Razorpay retries, and the same
   * payment.captured may arrive after the browser callback already settled it.
   */
  async handleRazorpayWebhook(rawBody: string, signature: string | null, webhookSecret: string): Promise<{ status: number; body: Record<string, unknown> }> {
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return { status: 400, body: { error: "bad signature" } };
    }
    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(rawBody) as RazorpayWebhookEvent;
    } catch {
      return { status: 400, body: { error: "bad json" } };
    }
    const pay = event.payload?.payment?.entity;
    try {
      switch (event.event) {
        case "payment.captured":
        case "order.paid": {
          if (!pay?.order_id) return { status: 200, body: { ignored: "no order" } };
          const known = await this.db.payment.findUnique({ where: { providerOrderId: pay.order_id } });
          if (!known) return { status: 200, body: { ignored: "not ours" } };
          const r = await this.capture({
            providerOrderId: pay.order_id,
            providerPaymentId: pay.id,
            amountCents: pay.amount,
            currency: pay.currency,
            raw: event as unknown,
            source: "webhook",
          });
          return { status: 200, body: { ok: true, outcome: r.outcome } };
        }
        case "payment.failed": {
          // One attempt failed; the member can retry on the same order, so it stays open.
          if (!pay?.order_id) return { status: 200, body: { ignored: "no order" } };
          await this.recordFailedAttempt({ providerOrderId: pay.order_id, providerPaymentId: pay.id, reason: pay.error_description });
          return { status: 200, body: { ok: true } };
        }
        case "refund.processed": {
          const ref = event.payload?.refund?.entity;
          if (ref?.payment_id) {
            await this.db.payment.updateMany({ where: { providerPaymentId: ref.payment_id, status: "CAPTURED" }, data: { status: "REFUNDED" } });
          }
          return { status: 200, body: { ok: true } };
        }
        default:
          return { status: 200, body: { ignored: event.event } };
      }
    } catch (e) {
      if (e instanceof PaymentVerificationError) {
        // A mismatch is our record of fraud or a bug, not something Razorpay should retry.
        return { status: 200, body: { rejected: e.message } };
      }
      throw e;
    }
  }
}

export const shopCheckout = new ShopCheckoutService();
