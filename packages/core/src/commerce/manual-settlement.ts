/**
 * MANUAL SETTLEMENT of a legacy rupee order: one placed through the old fiat
 * path (createFiatOrder), which names a provider on the order and never
 * records a Payment row. Staff settle one by hand once the money has arrived
 * out of band. Admin → Orders offers it only for such orders.
 *
 * An order with Payment rows belongs to the payment flow: its webhook or the
 * reconciler settles it from the provider's record. Marking it paid by hand
 * could race a payment still in flight, so it is refused here.
 *
 * Settlement goes through commerce.settleFiatOrder, the one path every
 * provider uses, and every manual settlement writes an audit row.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient, UserRole } from "@tycoonhood/db";
import { assertCan } from "../auth/permissions";
import { AuditService } from "../platform/audit";
import { CommerceError, CommerceService } from "./commerce";

export class ManualSettlementError extends CommerceError {}

export class ManualSettlementService {
  private commerce: CommerceService;
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.commerce = new CommerceService(db);
    this.audit = new AuditService(db);
  }

  /** Mark a legacy pending rupee order paid (and fulfil it). Needs admin.commerce. */
  async settle(actor: { id: string; role: UserRole }, orderId: string) {
    assertCan(actor, "admin.commerce");
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentProvider: true, _count: { select: { payments: true } } },
    });
    if (!order) throw new ManualSettlementError("That order does not exist.");
    if (order.status !== "PENDING") throw new ManualSettlementError(`This order is ${order.status.toLowerCase()}, not pending.`);
    if (!order.paymentProvider) throw new ManualSettlementError("This order has no rupee payment to settle.");
    if (order._count.payments > 0) {
      throw new ManualSettlementError("This order has a payment record, so it settles through the payment provider, not by hand.");
    }

    const paymentRef = `admin_${actor.id}`;
    // Two settles at once both get past the check above; the conditional write lets one through.
    const { settled, order: after } = await this.commerce.settleFiatOrder(orderId, paymentRef);
    if (!settled) throw new ManualSettlementError(`This order is ${after.status.toLowerCase()}, not pending.`);
    await this.audit.log({
      actorId: actor.id,
      action: "order.settle_manual",
      targetType: "order",
      targetId: orderId,
      meta: { paymentRef, provider: order.paymentProvider, from: order.status, to: after.status },
    });
    return after;
  }
}

export const manualSettlement = new ManualSettlementService();
