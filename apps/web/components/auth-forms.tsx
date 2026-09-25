"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input } from "@tycoonhood/ui";
import type { AuthFormState } from "../app/(auth)/actions";

type Action = (prev: AuthFormState, data: FormData) => Promise<AuthFormState>;
const initial: AuthFormState = {};

export function RegisterForm({
  action,
  referralCode = null,
  inviterName = null,
}: {
  action: Action;
  /** Present only when the code in the link resolved to a real member. */
  referralCode?: string | null;
  inviterName?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <Card variant="raised">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Your first mission pays out the moment you finish onboarding.</CardDescription>
      </CardHeader>
      <CardContent>
        {referralCode && (
          <p className="mb-4 rounded-md border border-gold-deep/40 bg-gold/5 px-3 py-2 text-[13px] text-ink-2">
            {inviterName ? <><span className="text-gold-bright">{inviterName}</span> invited you.</> : "You were invited."}{" "}
            You both get paid when you finish your first lesson.
          </p>
        )}
        <form action={formAction} className="flex flex-col gap-4">
          {referralCode && <input type="hidden" name="ref" value={referralCode} />}
          <Field label="Name" htmlFor="name" error={state.fieldErrors?.name?.[0]}>
            <Input id="name" name="name" autoComplete="name" placeholder="What should we call you?" />
          </Field>
          <Field label="Email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            error={state.fieldErrors?.password?.[0]}
            hint="At least 10 characters."
          >
            <Input id="password" name="password" type="password" autoComplete="new-password" />
          </Field>
          <Button type="submit" loading={pending} className="mt-1">
            Create account
          </Button>
          <p className="text-center text-[13px] text-ink-3">
            Already a member?{" "}
            <Link className="text-gold hover:underline underline-offset-4" href="/login">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <Card variant="raised">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Pick up where you left off.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {state.error}
            </p>
          )}
          <Field label="Email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </Field>
          <Field label="Password" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
            <Input id="password" name="password" type="password" autoComplete="current-password" />
          </Field>
          <Button type="submit" loading={pending} className="mt-1">
            Sign in
          </Button>
          <p className="text-right text-[12px]">
            <Link className="text-ink-3 hover:text-gold hover:underline underline-offset-4" href="/forgot-password">
              Forgot password?
            </Link>
          </p>
          <p className="text-center text-[13px] text-ink-3">
            New here?{" "}
            <Link className="text-gold hover:underline underline-offset-4" href="/register">
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
