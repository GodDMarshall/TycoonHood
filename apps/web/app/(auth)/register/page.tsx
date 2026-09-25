import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { referrals } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import { registerAction } from "../actions";
import { RegisterForm } from "../../../components/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");

  // Resolve the invite before the form renders, so an arriving member is told
  // who brought them rather than pasting a code on faith.
  const { ref } = await searchParams;
  const code = (ref ?? "").trim().toUpperCase().slice(0, 12);
  const inviter = code ? await referrals.resolveCode(code).catch(() => null) : null;

  return (
    <RegisterForm
      action={registerAction}
      referralCode={inviter ? code : null}
      inviterName={inviter?.displayName ?? null}
    />
  );
}
