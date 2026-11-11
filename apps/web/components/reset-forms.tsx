"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { MailMode } from "@tycoonhood/core";
import { Button, Card, CardContent, CardDescription, CardHeader, Field, Input, Notice } from "@tycoonhood/ui";
import type { ForgotState, ResetState } from "../app/(auth)/actions";

const linkCls = "text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

export function ForgotPasswordForm({
  action,
  mode,
  unavailable,
}: {
  action: (prev: ForgotState, fd: FormData) => Promise<ForgotState>;
  /** How email works on this deployment; the page reads it on the server. */
  mode: MailMode;
  /** What to say when no email can be sent (mode "off"), instead of showing the form. */
  unavailable: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ForgotState);
  const footer = (
    <p className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
      <Link href="/login" className={linkCls}>← Back to sign in</Link>
      <Link href="/contact" className={linkCls}>Contact us</Link>
    </p>
  );
  return (
    <Card variant="raised" className="w-full">
      <CardHeader>
        <h1 className="display text-h2">Reset your password</h1>
        <CardDescription>
          {mode === "live" && <>We&rsquo;ll email a single-use link, good for 30 minutes.</>}
          {mode === "dev" && <>Dev mode: the single-use link, good for 30 minutes, goes to the server log, not by email.</>}
          {mode === "off" && <>Reset links are sent by email.</>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.done ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-ink-1">{state.done}</p>
            {footer}
          </div>
        ) : mode === "off" ? (
          <div className="flex flex-col gap-3">
            <Notice tone="warning">{unavailable}</Notice>
            {footer}
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
              <Link href="/login" className={linkCls}>Sign in</Link>
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
          <Link href="/login" className="text-[14px] font-semibold text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
            Sign in →
          </Link>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card variant="raised" className="w-full">
      <CardHeader>
        <h1 className="display text-h2">Choose a new password</h1>
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
