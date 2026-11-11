/**
 * ORDER TRACKING — what happened to an order, as a timeline built only from
 * recorded facts. Delivery is not tracked (there is no carrier integration),
 * and the timeline says so rather than guessing.
 *
 * Also the one honest revenue figure: LIVE captured payments only. TEST
 * (sandbox) payments are never money and never counted.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";

export type TimelineState = "done" | "current" | "upcoming" | "stopped";

export interface TimelineStep {
  key: "placed" | "paid" | "packed" | "shipped" | "delivered" | "fulfilled" | "cancelled" | "refund" | "refunded";
  label: string;
  state: TimelineState;
  at: Date | null;
  detail?: string;
}

export interface TimelineOrder {
  status: string;
  createdAt: Date;
  updatedAt: Date;
  ledgerTxId: string | null;
  shippedAt: Date | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  items: { product: { kind: string } }[];
  payments?: { status: string; mode: string; updatedAt: Date }[];
  refundRequests?: { status: string; createdAt: Date; updatedAt: Date; adminNote: string | null }[];
}

/** Pure: builds the timeline from an order row and its relations. */
export function orderTimeline(o: TimelineOrder): TimelineStep[] {
  const physical = o.items.some((i) => i.product.kind === "PHYSICAL");
  const captured = o.payments?.find((p) => p.status === "CAPTURED" || p.status === "REFUNDED");
  const wasPaid = o.status === "PAID" || o.status === "FULFILLED" || o.status === "REFUNDED";
  const paidAt = o.ledgerTxId ? o.createdAt : captured?.updatedAt ?? null;
  const steps: TimelineStep[] = [{ key: "placed", label: "Order placed", state: "done", at: o.createdAt }];

  if (o.status === "CANCELLED") {
    steps.push({
      key: "cancelled",
      label: "Cancelled",
      state: "stopped",
      at: o.updatedAt,
      detail: paidAfterCancel(o)
        ? "Your payment arrived after the order was cancelled, so a full refund was queued. The stock went back."
        : "No payment was completed, so nothing was charged and the stock went back.",
    });
  } else {
    steps.push({
      key: "paid",
      label: o.ledgerTxId ? "Paid with THC" : "Paid",
      state: wasPaid ? "done" : "current",
      at: wasPaid ? paidAt : null,
      detail: wasPaid ? (captured?.mode === "TEST" ? "Test mode — no real money was charged." : undefined) : "Waiting for the payment to be confirmed.",
    });
    if (physical) {
      const shipped = !!o.shippedAt;
      steps.push({
        key: "shipped",
        label: "Shipped",
        state: shipped ? "done" : wasPaid && o.status !== "REFUNDED" ? "current" : "upcoming",
        at: o.shippedAt,
        detail: shipped
          ? `${o.trackingCarrier ?? "Carrier"} · ${o.trackingNumber ?? "no tracking number"}`
          : wasPaid ? "Being packed. The tracking number appears here the moment it ships." : undefined,
      });
      steps.push({
        key: "delivered",
        label: "Delivered",
        state: "upcoming",
        at: null,
        detail: "Not tracked here — follow the parcel with the carrier's tracking number.",
      });
    } else {
      const done = o.status === "FULFILLED" || (o.status === "REFUNDED" && wasPaid);
      steps.push({ key: "fulfilled", label: "In your library", state: done ? "done" : "upcoming", at: done ? paidAt : null });
    }
  }

  const req = o.refundRequests?.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (req) {
    const label = { REQUESTED: "Refund requested", APPROVED: "Refund approved", REJECTED: "Refund declined", REFUNDED: "Refunded" }[req.status] ?? "Refund";
    steps.push({
      key: req.status === "REFUNDED" ? "refunded" : "refund",
      label,
      state: req.status === "REQUESTED" ? "current" : req.status === "REJECTED" ? "stopped" : "done",
      at: req.status === "REQUESTED" ? req.createdAt : req.updatedAt,
      detail: req.adminNote ?? undefined,
    });
  } else if (o.status === "REFUNDED") {
    steps.push({ key: "refunded", label: "Refunded", state: "done", at: o.updatedAt });
  }
  return steps;
}

/**
 * A payment that came in after its order was cancelled (it expired, or was
 * replaced by a new checkout). capture() queues a full refund for it, so the
 * member must never be told that nothing was charged.
 */
export function paidAfterCancel(o: { status: string; payments?: { status: string }[] }) {
  return o.status === "CANCELLED" && (o.payments ?? []).some((p) => p.status === "CAPTURED" || p.status === "REFUNDED");
}

/** True when any payment on the order is a sandbox (TEST) payment. */
export function isTestOrder(o: { payments?: { mode: string }[]; paymentProvider?: string | null }) {
  return (o.payments ?? []).some((p) => p.mode === "TEST") || o.paymentProvider === "sandbox";
}

/**
 * Order statuses that open the DIGITAL items in an order. The store promises
 * delivery as soon as payment lands, so a paid order counts even while gear in
 * the same order waits to ship. A refunded or cancelled order never does.
 */
export const LIBRARY_ORDER_STATUSES = ["PAID", "FULFILLED"] as const;

/** True when the order's DIGITAL items are the member's to open. */
export function opensLibrary(o: { status: string }): boolean {
  return (LIBRARY_ORDER_STATUSES as readonly string[]).includes(o.status);
}

/** The member's order that opens this DIGITAL product in the library, or null. */
export function libraryOrderFor(userId: string, productId: string, db: PrismaClient = defaultPrisma) {
  return db.order.findFirst({
    where: { userId, status: { in: [...LIBRARY_ORDER_STATUSES] }, items: { some: { productId } } },
    select: { id: true },
  });
}

export class ShopStatsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /**
   * Real rupee revenue: LIVE payments captured and not refunded. TEST payments
   * are excluded by construction. Any revenue figure on any page must use this.
   */
  async liveRevenue(since?: Date) {
    const r = await this.db.payment.aggregate({
      where: { mode: "LIVE", status: "CAPTURED", currency: "INR", ...(since ? { createdAt: { gte: since } } : {}) },
      _sum: { amountCents: true },
      _count: true,
    });
    return { amountCents: r._sum.amountCents ?? 0, payments: r._count, currency: "INR" as const };
  }

  /** Count of TEST payments captured, shown beside revenue so nobody mistakes them for money. */
  async testCaptures() {
    return this.db.payment.count({ where: { mode: "TEST", status: { in: ["CAPTURED", "REFUNDED"] } } });
  }
}

export const shopStats = new ShopStatsService();
