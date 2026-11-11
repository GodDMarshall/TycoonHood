"use server";
import { revalidatePath } from "next/cache";
import { refunds, RefundError } from "@tycoonhood/core";
import { actorWith } from "../../../../lib/guard";

type State = { ok?: string; error?: string };

/** Approve or reject; the core service audits, notifies and runs the earn hook. */
export async function decideRefundAction(requestId: string, _prev: State, fd: FormData): Promise<State> {
  const admin = await actorWith("admin.commerce");
  const decision = String(fd.get("decision") ?? "");
  const note = String(fd.get("note") ?? "");
  try {
    if (decision === "approve") {
      const r = await refunds.approve(admin.id, requestId, note);
      revalidatePath("/admin/refunds");
      revalidatePath("/admin/orders");
      return {
        ok: r.refundedLocally
          ? `Marked refunded (${r.rail}). It was a test payment, so no money moved and Razorpay was not called.`
          : `Refunded (${r.rail}).`,
      };
    }
    if (decision === "reject") {
      await refunds.reject(admin.id, requestId, note);
      revalidatePath("/admin/refunds");
      return { ok: "Rejected. The member has been told why." };
    }
    return { error: "Choose approve or reject." };
  } catch (e) {
    if (e instanceof RefundError) return { error: e.message };
    if (e instanceof Error) return { error: `Refund failed: ${e.message}. The request is back in the queue.` };
    throw e;
  }
}
