/**
 * REFUNDS. A member may ask for one on their own PAID or FULFILLED order
 * within 14 days, one open request per order. An admin approves or rejects.
 *
 * Approval sends the money back on the rail it came in on:
 *   THC        → the ledger reversal of the order's spend (idempotent)
 *   INR, TEST  → the sandbox payment is marked REFUNDED; nothing moved anyway.
 *                A Razorpay test-key payment goes back through Razorpay while
 *                test keys are configured; once they are not (live keys, or
 *                none) it is marked REFUNDED here, because no money moved
 *   INR, LIVE  → Razorpay's refund API with live keys, then REFUNDED
 * Only what is left of the payment is sent: part of it may already have been
 * refunded in the Razorpay dashboard. Then unwindOrder: the order becomes
 * REFUNDED, physical units that never shipped go back on the shelf, and the
 * earn hook onOrderRefunded reverses any commission.
 *
 * A refund made in the Razorpay dashboard arrives as the refund.processed
 * webhook (recordProviderRefund), counted once per refund id. A partial refund
 * keeps the payment CAPTURED and the order standing; once the whole payment
 * is back, the order is unwound the same way. refund.failed
 * (recordFailedRefund) takes a refund we had counted off again, and the
 * admin refunds page lists the payment until it is refunded again.
 *
 * Every decision is audited and the member is told.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient, Prisma } from "@tycoonhood/db";
import { CommerceService } from "../commerce/commerce";
import { LedgerService } from "../ledger/ledger";
import { AuditService } from "../platform/audit";
import { notify } from "../platform/notify";
import { callEarnHook } from "./earn-registry";
import { RefundError } from "./errors";
import { razorpayFromEnv, sandboxProvider, type ShopPaymentProvider } from "./payments";

export const REFUND_WINDOW_DAYS = 14;
export const REFUND_REASON_MIN = 10;
export const REFUND_REASON_MAX = 1000;

/** Recorded on a test-key payment that is refunded without calling Razorpay. */
export const TEST_REFUND_NOTE =
  "Test-mode payment, and the test keys that took it are no longer configured. No money moved, so it was marked refunded here without calling Razorpay.";

export interface RefundOptions {
  providerFor?: (name: string) => ShopPaymentProvider | null;
}

function defaultProviderFor(name: string): ShopPaymentProvider | null {
  if (name === "razorpay") return razorpayFromEnv();
  if (name === "sandbox") return sandboxProvider;
  return null;
}

/** Pure: can this order be refunded by request right now? Returns the reason it cannot, or null. */
export function refundBlocker(
  order: { status: string; createdAt: Date },
  openRequest: boolean,
  now = new Date()
): string | null {
  if (order.status !== "PAID" && order.status !== "FULFILLED") return "Only a paid order can be refunded.";
  if (openRequest) return "There is already a refund request open for this order.";
  const age = now.getTime() - order.createdAt.getTime();
  if (age > REFUND_WINDOW_DAYS * 86_400_000) return `Refunds can be requested within ${REFUND_WINDOW_DAYS} days of the order.`;
  return null;
}

export class RefundService {
  private commerce: CommerceService;
  private ledger: LedgerService;
  private audit: AuditService;
  private providerFor: (name: string) => ShopPaymentProvider | null;

  constructor(private readonly db: PrismaClient = defaultPrisma, opts: RefundOptions = {}) {
    this.commerce = new CommerceService(db);
    this.ledger = new LedgerService(db);
    this.audit = new AuditService(db);
    this.providerFor = opts.providerFor ?? defaultProviderFor;
  }

  private async hasOpen(orderId: string) {
    return (await this.db.refundRequest.count({ where: { orderId, status: { in: ["REQUESTED", "APPROVED"] } } })) > 0;
  }

  async eligibility(userId: string, orderId: string, now = new Date()) {
    const order = await this.db.order.findFirst({ where: { id: orderId, userId } });
    if (!order) return "Order not found.";
    return refundBlocker(order, await this.hasOpen(orderId), now);
  }

  async requestRefund(userId: string, orderId: string, reason: string, now = new Date()) {
    const text = reason.trim();
    if (text.length < REFUND_REASON_MIN) throw new RefundError("Tell us a little more — at least a sentence.");
    if (text.length > REFUND_REASON_MAX) throw new RefundError(`Keep it under ${REFUND_REASON_MAX} characters.`);
    const order = await this.db.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new RefundError("Order not found.");

    const req = await this.db.$transaction(async (tx) => {
      // Serialise requests per order so a double-submit cannot open two.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`refund:${orderId}`}))`;
      const open = (await tx.refundRequest.count({ where: { orderId, status: { in: ["REQUESTED", "APPROVED"] } } })) > 0;
      const blocker = refundBlocker(order, open, now);
      if (blocker) throw new RefundError(blocker);
      return tx.refundRequest.create({ data: { orderId, userId, reason: text } });
    });
    await this.audit.log({ actorId: userId, action: "refund.request", targetType: "order", targetId: orderId, meta: { requestId: req.id } });
    await notify(userId, "ORDER", "Refund requested", "We will review it and tell you the outcome here.", { orderId, href: `/orders/${orderId}` }, this.db);
    return req;
  }

  async listQueue(status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED" | "all" = "REQUESTED") {
    return this.db.refundRequest.findMany({
      where: status === "all" ? {} : { status },
      orderBy: { createdAt: status === "REQUESTED" ? "asc" : "desc" },
      take: 100,
      include: {
        user: { select: { email: true, profile: { select: { username: true } } } },
        order: { include: { items: { include: { product: true } }, payments: true } },
      },
    });
  }

  /** Admin approval: money back on its rail, order REFUNDED, stock and commission unwound. */
  async approve(adminId: string, requestId: string, note?: string | null) {
    // Claim the request first so two admins clicking at once refund once.
    const claimed = await this.db.refundRequest.updateMany({
      where: { id: requestId, status: "REQUESTED" },
      data: { status: "APPROVED", adminNote: note?.trim() || null },
    });
    if (claimed.count === 0) throw new RefundError("This request was already decided.");

    const req = await this.db.refundRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { order: { include: { payments: true } } },
    });
    const order = req.order;

    try {
      let rail: string;
      let refundedLocally = false;
      let sentCents: number | null = null;
      if (order.ledgerTxId) {
        rail = "THC";
        await this.ledger.reverse(order.ledgerTxId, {
          idempotencyKey: `refund:${order.id}`,
          memo: `Refund of order ${order.id.slice(-6).toUpperCase()}`,
          createdById: adminId,
        });
      } else {
        const payment = order.payments.find((p) => p.status === "CAPTURED") ?? order.payments.find((p) => p.status === "REFUNDED");
        if (!payment) throw new RefundError("No captured payment on this order — nothing to send back.");
        rail = `INR/${payment.mode}`;
        if (payment.status === "CAPTURED") {
          // Part of it may already have gone back from the Razorpay dashboard.
          const remaining = payment.amountCents - payment.refundedCents;
          let raw: unknown = { refundedBy: adminId };
          let refundId: string | null = null;
          // The sandbox moved no money, so there is nothing to send back. A Razorpay
          // payment goes back through Razorpay, with keys of the same mode: Razorpay
          // keeps test and live apart, so live keys cannot refund a test payment.
          if (payment.provider !== "sandbox" && remaining > 0) {
            const provider = this.providerFor(payment.provider);
            if (payment.mode === "TEST" && provider?.mode !== "TEST") {
              // The test keys that took it are gone, and a test payment moved no money.
              refundedLocally = true;
              raw = { refundedBy: adminId, note: TEST_REFUND_NOTE };
            } else {
              if (!provider) throw new RefundError(`${payment.provider} is not configured — cannot refund this payment.`);
              if (payment.mode === "LIVE" && provider.mode !== "LIVE") {
                throw new RefundError("This live payment can only be refunded with live Razorpay keys configured.");
              }
              if (!payment.providerPaymentId) throw new RefundError("The payment has no provider payment id.");
              const r = await provider.refund({
                providerPaymentId: payment.providerPaymentId,
                amountCents: remaining,
                notes: { orderId: order.id, requestId },
              });
              refundId = r.refundId;
              raw = r.raw ?? { refundId: r.refundId };
            }
          }
          await this.addRefund(payment.id, { refundId, amountCents: remaining, raw });
          sentCents = remaining;
        }
      }

      await this.unwindOrder(order.id, { actorId: adminId, source: "refund.approve" });
      await this.db.refundRequest.update({ where: { id: requestId }, data: { status: "REFUNDED" } });
      await this.audit.log({
        actorId: adminId,
        action: "refund.approve",
        targetType: "order",
        targetId: order.id,
        meta: { requestId, rail, note: note ?? null, ...(sentCents !== null ? { sentCents } : {}), ...(refundedLocally ? { refundedLocally: TEST_REFUND_NOTE } : {}) },
      });
      await notify(
        order.userId,
        "ORDER",
        "Refund approved",
        rail === "THC" ? "The THC is back in your wallet." : rail === "INR/TEST" ? "Test-mode order — no real money had been charged." : "Razorpay is sending the money back to your original payment method.",
        { orderId: order.id, href: `/orders/${order.id}` },
        this.db
      );
      return { orderId: order.id, rail, refundedLocally };
    } catch (e) {
      // Put the request back so it can be retried once the cause is fixed, unless
      // a refund from Razorpay closed it meanwhile.
      await this.db.refundRequest.updateMany({ where: { id: requestId, status: "APPROVED" }, data: { status: "REQUESTED" } });
      await this.audit.log({ actorId: adminId, action: "refund.approve_failed", targetType: "order", targetId: order.id, meta: { requestId, error: e instanceof Error ? e.message : String(e) } });
      throw e;
    }
  }

  /**
   * Unwinds a refunded order, once. Under the order's row lock, a PAID or
   * FULFILLED order becomes REFUNDED and its physical units that never shipped
   * go back on the shelf, and any open refund request is closed. Then the earn
   * hook reverses any commission. Calling it again changes nothing.
   */
  async unwindOrder(orderId: string, opts: { actorId: string | null; source: string }) {
    const done = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true, shippedAt: true, items: { select: { productId: true, variantId: true, qty: true, product: { select: { kind: true } } } } },
      });
      // An order cancelled before its (late) payment arrived already gave its stock back.
      const unwound = order.status === "PAID" || order.status === "FULFILLED";
      const released: { productId: string; variantId: string | null; qty: number }[] = [];
      if (unwound) {
        await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
        if (!order.shippedAt) {
          for (const i of order.items) {
            if (i.product.kind !== "PHYSICAL") continue;
            await this.commerce.releaseUnits(i.productId, i.variantId, i.qty, tx);
            released.push({ productId: i.productId, variantId: i.variantId, qty: i.qty });
          }
        }
      }
      const closed = await tx.refundRequest.updateMany({ where: { orderId, status: { in: ["REQUESTED", "APPROVED"] } }, data: { status: "REFUNDED" } });
      if (unwound || closed.count > 0) {
        await this.audit.log(
          { actorId: opts.actorId, action: "order.unwind", targetType: "order", targetId: orderId, meta: { source: opts.source, from: order.status, released, closedRequests: closed.count } },
          tx
        );
      }
      return { unwound, closedRequests: closed.count };
    });
    if (done.unwound || done.closedRequests > 0) await callEarnHook("onOrderRefunded", orderId, this.db);
    return done;
  }

  /**
   * Counts money sent back on a payment, under its row lock and once per
   * provider refund id. The payment turns REFUNDED when all of it is back.
   */
  private async addRefund(paymentId: string, r: { refundId: string | null; amountCents: number; raw?: unknown }) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
      const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (r.refundId && p.refundIds.includes(r.refundId)) return { payment: p, added: false };
      const refundedCents = Math.min(p.amountCents, p.refundedCents + Math.max(0, r.amountCents));
      const payment = await tx.payment.update({
        where: { id: p.id },
        data: {
          refundedCents,
          ...(r.refundId ? { refundIds: { push: r.refundId } } : {}),
          ...(refundedCents >= p.amountCents ? { status: "REFUNDED" as const } : {}),
          ...(r.raw !== undefined ? { raw: { previous: p.raw ?? null, refund: r.raw } as Prisma.InputJsonValue } : {}),
        },
      });
      return { payment, added: true };
    });
  }

  /**
   * Razorpay's refund.processed. Our own refund was counted when we sent it, so
   * it changes nothing; a refund made in the Razorpay dashboard is counted now.
   * Part of the payment back: the order stands and a later refund sends only the
   * rest. All of it back: the order is unwound as an approved refund would be.
   */
  async recordProviderRefund(input: { providerPaymentId: string; refundId: string; amountCents: number }) {
    const found = await this.db.payment.findUnique({ where: { providerPaymentId: input.providerPaymentId }, select: { id: true, orderId: true } });
    if (!found) return { outcome: "not ours" as const };
    const r = await this.addRefund(found.id, { refundId: input.refundId, amountCents: input.amountCents });
    const full = r.payment.status === "REFUNDED";
    if (r.added) {
      await this.audit.log({
        actorId: null,
        action: full ? "refund.external" : "refund.partial_external",
        targetType: "order",
        targetId: found.orderId,
        meta: { paymentId: found.id, refundId: input.refundId, amountCents: input.amountCents, refundedCents: r.payment.refundedCents, paymentCents: r.payment.amountCents },
      });
    }
    if (!full) return { outcome: r.added ? ("partial" as const) : ("already counted" as const) };
    // Also when already counted: a retry finishes an unwind that failed part way. Once done it changes nothing.
    const unwind = await this.unwindOrder(found.orderId, { actorId: null, source: "refund.external" });
    if (unwind.unwound || unwind.closedRequests > 0) {
      const order = await this.db.order.findUniqueOrThrow({ where: { id: found.orderId }, select: { userId: true } });
      await notify(
        order.userId,
        "ORDER",
        "Order refunded",
        r.payment.mode === "TEST" ? "Test-mode order — no real money had been charged." : "Razorpay is sending the money back to your original payment method.",
        { orderId: found.orderId, href: `/orders/${found.orderId}` },
        this.db
      );
    }
    return { outcome: r.added ? ("refunded" as const) : ("already counted" as const) };
  }

  /**
   * Razorpay's refund.failed: that money did not go back. A refund we had
   * counted is taken off again and the payment returns to CAPTURED, so the
   * admin refunds page lists it to be refunded again. The order is left as it is.
   */
  async recordFailedRefund(input: { providerPaymentId: string; refundId: string; amountCents: number }) {
    const found = await this.db.payment.findUnique({ where: { providerPaymentId: input.providerPaymentId }, select: { id: true, orderId: true } });
    if (!found) return { outcome: "not ours" as const };
    const r = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${found.id} FOR UPDATE`;
      const p = await tx.payment.findUniqueOrThrow({ where: { id: found.id } });
      if (!p.refundIds.includes(input.refundId)) return { counted: false, payment: p };
      const refundedCents = Math.max(0, p.refundedCents - Math.max(0, input.amountCents));
      const payment = await tx.payment.update({
        where: { id: p.id },
        data: {
          refundedCents,
          refundIds: p.refundIds.filter((id) => id !== input.refundId),
          ...(p.status === "REFUNDED" && refundedCents < p.amountCents ? { status: "CAPTURED" as const } : {}),
        },
      });
      return { counted: true, payment };
    });
    // Razorpay retries webhooks: one audit entry per failed refund.
    const seen = await this.db.auditLog.count({
      where: { action: "refund.failed", targetType: "order", targetId: found.orderId, meta: { path: ["refundId"], equals: input.refundId } },
    });
    if (seen === 0) {
      await this.audit.log({
        actorId: null,
        action: "refund.failed",
        targetType: "order",
        targetId: found.orderId,
        meta: { paymentId: found.id, refundId: input.refundId, amountCents: input.amountCents, counted: r.counted, refundedCents: r.payment.refundedCents },
      });
    }
    return { outcome: r.counted ? ("reverted" as const) : ("not counted" as const) };
  }

  /**
   * Money still with us on an order that was refunded or cancelled, with no
   * refund request open: mostly a refund that Razorpay failed. The admin
   * refunds page lists these until each is refunded again.
   */
  async listFailedRefunds() {
    return this.db.payment.findMany({
      where: {
        status: "CAPTURED",
        order: { status: { in: ["REFUNDED", "CANCELLED"] }, refundRequests: { none: { status: { in: ["REQUESTED", "APPROVED"] } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { order: { select: { id: true, status: true, user: { select: { email: true } } } } },
    });
  }

  async reject(adminId: string, requestId: string, note: string) {
    const text = note.trim();
    if (text.length < 3) throw new RefundError("Say why — the member sees this note.");
    const done = await this.db.refundRequest.updateMany({
      where: { id: requestId, status: "REQUESTED" },
      data: { status: "REJECTED", adminNote: text },
    });
    if (done.count === 0) throw new RefundError("This request was already decided.");
    const req = await this.db.refundRequest.findUniqueOrThrow({ where: { id: requestId } });
    await this.audit.log({ actorId: adminId, action: "refund.reject", targetType: "order", targetId: req.orderId, meta: { requestId, note: text } });
    await notify(req.userId, "ORDER", "Refund request declined", text, { orderId: req.orderId, href: `/orders/${req.orderId}` }, this.db);
    return req;
  }
}

export const refunds = new RefundService();
