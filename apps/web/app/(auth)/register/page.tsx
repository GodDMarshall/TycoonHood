import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSetting, referrals } from "@tycoonhood/core";
import { Notice } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";
import { registerAction } from "../actions";
import { RegisterForm } from "../../../components/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  if (await getCurrentUser()) redirect("/today");

  if (!(await getSetting("platform")).signupsOpen) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="display text-h2">Sign-ups are paused</h1>
        <Notice tone="info">New accounts are paused for the moment. Existing members can still sign in.</Notice>
        <p className="text-[14px] text-ink-2">
          <Link href="/login" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">Sign in</Link>{" "}
          or{" "}
          <Link href="/contact" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">contact us</Link>.
        </p>
      </div>
    );
  }

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
