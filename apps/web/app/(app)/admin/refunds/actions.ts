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

/** Counts what Razorpay actually refunded on payments marked refunded before amounts were kept. */
export async function countRefundsAction(_prev: { message?: string; error?: string }, _fd: FormData): Promise<{ message?: string; error?: string }> {
  const admin = await actorWith("admin.commerce");
  try {
    const results = await refunds.countRefundsWithRazorpay(admin.id);
    revalidatePath("/admin/refunds");
    revalidatePath("/admin/orders");
    const n = (o: string) => results.filter((r) => r.outcome === o).length;
    const parts = [
      n("refunded") && `${n("refunded")} refunded in full`,
      n("partial") && `${n("partial")} refunded in part (the rest can be refunded now)`,
      n("pending") && `${n("pending")} still pending at Razorpay (check again later)`,
      n("none found") && `${n("none found")} with no processed refund at Razorpay (check those in the dashboard)`,
      n("failed") && `${n("failed")} could not be checked`,
    ].filter(Boolean);
    return { message: parts.length ? `Checked ${results.length}: ${parts.join(", ")}.` : "Nothing left to check." };
  } catch (e) {
    if (e instanceof RefundError) return { error: e.message };
    throw e;
  }
}
