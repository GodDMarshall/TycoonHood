"use server";
import { revalidatePath } from "next/cache";
import { audit, commerce, shopCheckout } from "@tycoonhood/core";
import { actorWith } from "../../../../lib/guard";
import type { ShipState } from "../actions";

/** Marks a parcel sent (carrier + tracking required) and audits it. */
export async function shipAuditedAction(orderId: string, _prev: ShipState, fd: FormData): Promise<ShipState> {
  const admin = await actorWith("admin.commerce");
  const carrier = String(fd.get("carrier") ?? "").trim();
  const tracking = String(fd.get("tracking") ?? "").trim();
  if (!carrier) return { error: "Name the carrier." };
  if (!tracking) return { error: "Enter the tracking number — the member is told it." };
  try {
    await commerce.markShipped(orderId, carrier, tracking);
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
  await audit.log({ actorId: admin.id, action: "order.ship", targetType: "order", targetId: orderId, meta: { carrier, tracking } });
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  return { message: `Marked shipped · ${carrier} ${tracking}` };
}

/** Cancels an unpaid rupee order now (stock and coupon go back). */
export async function cancelPendingAction(orderId: string) {
  const admin = await actorWith("admin.commerce");
  await shopCheckout.cancelOrder(orderId, "Cancelled by staff", admin.id);
  revalidatePath("/admin/orders");
}
