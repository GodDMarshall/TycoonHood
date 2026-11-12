"use server";
/**
 * Member actions for the affiliate programme. Every rule lives in
 * @tycoonhood/core (AffiliateService); these only read the form and report.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { affiliates, EarnError, formatInr, type PayoutMethodInput } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rate-limit";
import type { EarnFormState } from "../../../components/earn/format";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function registerAffiliateAction(_prev: EarnFormState, fd: FormData): Promise<EarnFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!rateLimit(`aff-apply:${user.id}`, 5, 60_000).ok) return { error: "Too many attempts. Wait a minute and try again." };

  const payoutMethod: PayoutMethodInput =
    str(fd, "payoutType") === "BANK"
      ? { type: "BANK", accountName: str(fd, "accountName"), accountNumber: str(fd, "accountNumber"), ifsc: str(fd, "ifsc"), bankName: str(fd, "bankName") || undefined }
      : { type: "UPI", upiId: str(fd, "upiId") };

  try {
    await affiliates.register(user.id, {
      channels: str(fd, "channels"),
      payoutMethod,
      acceptTerms: fd.get("acceptTerms") === "yes",
    });
  } catch (e) {
    if (e instanceof EarnError) return { error: e.message };
    throw e;
  }
  revalidatePath("/earnings");
  return { message: "Application sent. An admin reviews every application by hand." };
}

export async function requestPayoutAction(_prev: EarnFormState, _fd: FormData): Promise<EarnFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!rateLimit(`aff-payout:${user.id}`, 5, 60_000).ok) return { error: "Too many attempts. Wait a minute and try again." };
  try {
    const p = await affiliates.requestPayout(user.id);
    revalidatePath("/earnings");
    return { message: `Payout of ${formatInr(p.amountCents)} requested.` };
  } catch (e) {
    if (e instanceof EarnError) return { error: e.message };
    throw e;
  }
}
