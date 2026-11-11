/**
 * REFUNDS. A member may ask for one on their own PAID or FULFILLED order
 * within 14 days, one open request per order. An admin approves or rejects.
 *
 * Approval sends the money back on the rail it came in on:
 *   THC        → the ledger reversal of the order's spend (idempotent)
 *   INR, TEST  → the sandbox payment is marked REFUNDED; nothing moved anyway
 *   INR, LIVE  → Razorpay's refund API, then REFUNDED
 * then the order becomes REFUNDED, physical units that never shipped go back
 * on the shelf, and the earn hook onOrderRefunded reverses any commission.
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
      include: { order: { include: { items: { include: { product: true } }, payments: true } } },
    });
    const order = req.order;

    try {
      let rail: string;
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
          let raw: unknown = { refundedBy: adminId };
          if (payment.mode === "LIVE") {
            const provider = this.providerFor(payment.provider);
            if (!provider) throw new RefundError(`${payment.provider} is not configured — cannot refund a live payment.`);
            if (!payment.providerPaymentId) throw new RefundError("The live payment has no provider payment id.");
            const r = await provider.refund({
              providerPaymentId: payment.providerPaymentId,
              amountCents: payment.amountCents,
              notes: { orderId: order.id, requestId },
            });
            raw = r.raw ?? { refundId: r.refundId };
          }
          await this.db.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED", raw: { previous: payment.raw ?? null, refund: raw } as Prisma.InputJsonValue },
          });
        }
      }

      // An order cancelled before its (late) payment arrived already gave its stock back.
      const wasLive = order.status === "PAID" || order.status === "FULFILLED";
      if (wasLive) {
        if (!order.shippedAt) {
          for (const i of order.items) {
            if (i.product.kind === "PHYSICAL") await this.commerce.releaseUnits(i.productId, i.variantId, i.qty);
          }
        }
        await this.db.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
      }
      await this.db.refundRequest.update({ where: { id: requestId }, data: { status: "REFUNDED" } });
      await this.audit.log({ actorId: adminId, action: "refund.approve", targetType: "order", targetId: order.id, meta: { requestId, rail, note: note ?? null } });
      await notify(
        order.userId,
        "ORDER",
        "Refund approved",
        rail === "THC" ? "The THC is back in your wallet." : rail === "INR/TEST" ? "Test-mode order — no real money had been charged." : "Razorpay is sending the money back to your original payment method.",
        { orderId: order.id, href: `/orders/${order.id}` },
        this.db
      );
      await callEarnHook("onOrderRefunded", order.id);
      return { orderId: order.id, rail };
    } catch (e) {
      // Put the request back so it can be retried once the cause is fixed.
      await this.db.refundRequest.update({ where: { id: requestId }, data: { status: "REQUESTED" } });
      await this.audit.log({ actorId: adminId, action: "refund.approve_failed", targetType: "order", targetId: order.id, meta: { requestId, error: e instanceof Error ? e.message : String(e) } });
      throw e;
    }
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
