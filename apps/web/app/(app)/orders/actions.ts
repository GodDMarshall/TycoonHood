"use server";
import { revalidatePath } from "next/cache";
import { refunds, RefundError } from "@tycoonhood/core";
import { requireUser } from "../../../lib/guard";

export interface RefundFormState {
  ok?: string;
  error?: string;
}

export async function requestRefundAction(orderId: string, _prev: RefundFormState, fd: FormData): Promise<RefundFormState> {
  const user = await requireUser();
  try {
    await refunds.requestRefund(user.id, orderId, String(fd.get("reason") ?? ""));
  } catch (e) {
    if (e instanceof RefundError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/orders/${orderId}`);
  return { ok: "Refund requested. We will tell you the outcome here and in your notifications." };
}
