"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button, Field, Input, Notice } from "@tycoonhood/ui";
import type { ReactNode } from "react";

/** The door: a heading that is the page's h1, a line of context, the form. */
function Door({ eyebrow, title, lead, children }: { eyebrow: string; title: ReactNode; lead: string; children: ReactNode }) {
  return (
    <section className="animate-rise">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h1 className="display text-h1">{title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{lead}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}
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
    <Door eyebrow="Enter Tycoonhood" title={<>Take your <span className="accent">seat.</span></>} lead="Free to join. Your first mission pays the moment you finish onboarding.">
        {referralCode && (
          <Notice tone="success" className="mb-5">
            {inviterName ? <><span className="text-gold-bright">{inviterName}</span> invited you.</> : "You were invited."}{" "}
            You both get paid when you finish your first lesson.
          </Notice>
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
          <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
            Create account
          </Button>
          <p className="text-center text-[13px] text-ink-3">
            Already a member?{" "}
            <Link className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold" href="/login">
              Sign in
            </Link>
          </p>
        </form>
    </Door>
  );
}

export function LoginForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <Door eyebrow="Members" title={<>Welcome <span className="accent">back.</span></>} lead="Pick up where you left off — your streak is waiting.">
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <Notice tone="danger">{state.error}</Notice>}
          <Field label="Email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </Field>
          <Field label="Password" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
            <Input id="password" name="password" type="password" autoComplete="current-password" />
          </Field>
          <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
            Sign in
          </Button>
          <p className="text-right text-[12px]">
            <Link className="text-ink-3 hover:text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold" href="/forgot-password">
              Forgot password?
            </Link>
          </p>
          <p className="text-center text-[13px] text-ink-3">
            New here?{" "}
            <Link className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold" href="/register">
              Create an account
            </Link>
          </p>
        </form>
    </Door>
  );
}
