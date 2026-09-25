"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from "@tycoonhood/ui";
import type { ForgotState, ResetState } from "../app/(auth)/actions";

export function ForgotPasswordForm({
  action,
}: {
  action: (prev: ForgotState, fd: FormData) => Promise<ForgotState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ForgotState);
  return (
    <Card variant="raised" className="w-full">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We'll email a single-use link, good for 30 minutes.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.sent ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-ink-1">
              If that email is on the books, a reset link is on its way. Check spam before requesting another.
            </p>
            {state.devLink && (
              <div className="rounded-md border border-gold-deep/50 bg-gold/10 px-3 py-2.5">
                <p className="eyebrow mb-1 text-gold">Dev mode — no email was sent</p>
                <a href={state.devLink} className="figures break-all text-[12px] text-gold-bright hover:underline underline-offset-4">
                  {state.devLink}
                </a>
                <p className="mt-1 text-[11px] text-ink-3">In production this link only ever travels by email.</p>
              </div>
            )}
            <Link href="/login" className="text-[13px] text-gold hover:underline underline-offset-4">← Back to sign in</Link>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            {state.error && (
              <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{state.error}</p>
            )}
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" />
            </Field>
            <Button type="submit" loading={pending}>Send reset link</Button>
            <p className="text-center text-[12px] text-ink-3">
              Remembered it?{" "}
              <Link href="/login" className="text-gold hover:underline underline-offset-4">Sign in</Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function ResetPasswordForm({
  action,
}: {
  action: (prev: ResetState, fd: FormData) => Promise<ResetState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ResetState);
  if (state.done) {
    return (
      <Card variant="gold" className="w-full">
        <CardContent className="flex flex-col gap-3 py-6">
          <p className="text-[15px] font-semibold text-ink-1">Password changed.</p>
          <p className="text-[13px] text-ink-2">
            Every device was signed out — including whoever wasn't you. Sign back in with the new password.
          </p>
          <Link href="/login" className="text-[14px] font-semibold text-gold hover:underline underline-offset-4">
            Sign in →
          </Link>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card variant="raised" className="w-full">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>At least 10 characters. This signs you out everywhere.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{state.error}</p>
          )}
          <Field label="New password" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="new-password" />
          </Field>
          <Field label="Confirm it" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
          </Field>
          <Button type="submit" loading={pending}>Set new password</Button>
        </form>
      </CardContent>
    </Card>
  );
}
