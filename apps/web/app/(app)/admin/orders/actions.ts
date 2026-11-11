"use server";
import { revalidatePath } from "next/cache";
import { audit, commerce, refunds, shopCheckout, RefundError } from "@tycoonhood/core";
import { actorWith } from "../../../../lib/guard";
import type { EarnFormState } from "../../../../components/earn/format";
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

/**
 * Refunds a paid order in full, at any age: what is left of the payment goes
 * back on its rail, unshipped gear goes back on the shelf, and any commission
 * is reversed. The member sees the note.
 */
export async function refundOrderAction(orderId: string, _prev: EarnFormState, fd: FormData): Promise<EarnFormState> {
  const admin = await actorWith("admin.commerce");
  try {
    const r = await refunds.refundOrder(admin.id, orderId, String(fd.get("reason") ?? ""));
    revalidatePath("/admin/orders");
    revalidatePath("/admin/refunds");
    revalidatePath("/orders");
    return {
      message: r.refundedLocally
        ? `Marked refunded (${r.rail}). It was a test payment, so no money moved and Razorpay was not called.`
        : `Refunded (${r.rail}).`,
    };
  } catch (e) {
    if (e instanceof RefundError) return { error: e.message };
    if (e instanceof Error) return { error: `Refund failed: ${e.message}. The request waits on the refunds page.` };
    throw e;
  }
}
