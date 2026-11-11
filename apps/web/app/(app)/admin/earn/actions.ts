"use server";
/**
 * Admin actions for the affiliate programme. Each one re-checks
 * "admin.earn" on the server (DR-3) and hands the decision to
 * AffiliateService, which audits and notifies.
 */
import { revalidatePath } from "next/cache";
import { affiliates, EarnError } from "@tycoonhood/core";
import { actorWith } from "../../../../lib/guard";
import type { EarnFormState } from "../../../../components/earn/format";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function run(fn: (adminId: string) => Promise<unknown>, done: string): Promise<EarnFormState> {
  let adminId: string;
  try {
    adminId = (await actorWith("admin.earn")).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "You do not have permission to do that." };
  }
  try {
    await fn(adminId);
  } catch (e) {
    if (e instanceof EarnError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/earn");
  revalidatePath("/earnings");
  return { message: done };
}

// ── applications

export async function approveAffiliateAction(id: string, _p: EarnFormState, _fd: FormData) {
  return run((a) => affiliates.approve(a, id), "Approved. The member has been told.");
}
export async function rejectAffiliateAction(id: string, _p: EarnFormState, fd: FormData) {
  return run((a) => affiliates.reject(a, id, text(fd, "reason")), "Rejected. The member sees the reason.");
}
export async function suspendAffiliateAction(id: string, _p: EarnFormState, fd: FormData) {
  return run((a) => affiliates.suspend(a, id, text(fd, "reason")), "Suspended. The link stops recording.");
}

// ── commissions

export async function approveCommissionAction(id: string, _p: EarnFormState, _fd: FormData) {
  return run((a) => affiliates.approveCommission(a, id), "Approved.");
}
export async function rejectCommissionAction(id: string, _p: EarnFormState, fd: FormData) {
  return run((a) => affiliates.rejectCommission(a, id, text(fd, "reason")), "Rejected.");
}
/** A refunded order's commission whose automatic reversal failed. */
export async function reverseCommissionAction(id: string, _p: EarnFormState, _fd: FormData) {
  return run((a) => affiliates.reverseRefunded(a, id), "Reversed. The member has been told.");
}

// ── payouts

export async function approvePayoutAction(id: string, _p: EarnFormState, _fd: FormData) {
  return run((a) => affiliates.approvePayout(a, id), "Approved. Send the money, then mark it paid.");
}
export async function markPayoutPaidAction(id: string, _p: EarnFormState, fd: FormData) {
  return run((a) => affiliates.markPayoutPaid(a, id, text(fd, "reference")), "Marked paid.");
}
export async function rejectPayoutAction(id: string, _p: EarnFormState, fd: FormData) {
  return run((a) => affiliates.rejectPayout(a, id, text(fd, "reason")), "Declined. Its commissions are available again.");
}
