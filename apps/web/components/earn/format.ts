/**
 * Formatting for the affiliate programme. Every amount is INR minor units
 * (paise). Plain module: safe to import from server and client components.
 */
const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

/** 22500 → "₹225.00" */
export function inr(cents: number): string {
  return inrFmt.format(cents / 100);
}

export const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const commissionTone = {
  PENDING: "neutral",
  APPROVED: "gold",
  PAID: "success",
  REJECTED: "danger",
  REVERSED: "warning",
} as const;

export const commissionLabel = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
  REJECTED: "Rejected",
  REVERSED: "Reversed",
} as const;

export const payoutTone = { REQUESTED: "neutral", APPROVED: "gold", PAID: "success", REJECTED: "danger" } as const;
export const payoutLabel = { REQUESTED: "Requested", APPROVED: "Approved", PAID: "Paid", REJECTED: "Declined" } as const;

export const affiliateTone = { PENDING: "neutral", APPROVED: "success", SUSPENDED: "warning", REJECTED: "danger" } as const;

/** Server action result shape shared by the member and admin forms. */
export type EarnFormState = { message?: string; error?: string };
