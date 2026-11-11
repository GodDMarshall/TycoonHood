"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, Notice } from "@tycoonhood/ui";
import type { VerifyState } from "../app/(auth)/actions";

/** One button: links in emails are often prefetched by scanners, so the click is what spends the token. */
export function VerifyEmailForm({
  action,
  signedIn,
}: {
  action: (prev: VerifyState, fd: FormData) => Promise<VerifyState>;
  signedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as VerifyState);
  const next = signedIn ? { href: "/today", label: "Go to your dashboard" } : { href: "/login", label: "Sign in" };

  if (state.done) {
    return (
      <Card variant="gold" className="w-full">
        <CardContent className="flex flex-col gap-3 py-6">
          <p className="text-[15px] font-semibold text-ink-1">Email confirmed.</p>
          <p className="text-[13px] text-ink-2">Thank you. Your account is fully set up.</p>
          <Link href={next.href} className="text-[14px] font-semibold text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
            {next.label} →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="raised" className="w-full">
      <CardHeader>
        <h1 className="display text-h2">Confirm your email</h1>
        <CardDescription>One click and you&rsquo;re done.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <Notice tone="danger">{state.error}</Notice>}
          <Button type="submit" size="lg" loading={pending} className="w-full">
            Confirm my email
          </Button>
          {state.error && (
            <p className="text-center text-[13px] text-ink-3">
              {signedIn ? (
                <>
                  Send a new link from{" "}
                  <Link href="/settings#email" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
                    your settings
                  </Link>
                  .
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
                    Sign in
                  </Link>{" "}
                  to send a new link.
                </>
              )}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
