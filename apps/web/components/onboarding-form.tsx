"use client";
import { useActionState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  SectionRule,
} from "@tycoonhood/ui";
import {
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  EXPERIENCE_OPTIONS,
} from "@tycoonhood/core/src/auth/schemas";
import type { AuthFormState } from "../app/(auth)/actions";

type Action = (prev: AuthFormState, data: FormData) => Promise<AuthFormState>;
const initial: AuthFormState = {};

/** Checkbox chip: no JS state — the hidden input + peer styling carry it. */
function Chip({ name, value, type = "checkbox" }: { name: string; value: string; type?: "checkbox" | "radio" }) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={value} className="peer sr-only" />
      <span
        className={
          "inline-block rounded-full border border-line-strong bg-bg-1 px-3.5 py-1.5 text-[13px] text-ink-2 " +
          "transition-colors hover:border-gold-deep hover:text-ink-1 " +
          "peer-checked:border-gold-deep peer-checked:bg-gold/10 peer-checked:text-gold-bright " +
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold"
        }
      >
        {value}
      </span>
    </label>
  );
}

export function OnboardingForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <Card variant="raised">
      <CardHeader>
        <CardTitle>Set up your membership</CardTitle>
        <CardDescription>
          Two minutes. Finishing this pays your first mission: +75 XP and +250 THC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Username"
              htmlFor="username"
              error={state.fieldErrors?.username?.[0]}
              hint="Public. 3–20 characters: letters, numbers, underscores."
            >
              <Input id="username" name="username" placeholder="iron_ledger" autoComplete="off" />
            </Field>
            <Field label="Display name" htmlFor="displayName" error={state.fieldErrors?.displayName?.[0]}>
              <Input id="displayName" name="displayName" placeholder="How your name appears" />
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <SectionRule label="What are you here to build?" />
            {state.fieldErrors?.goals?.[0] && (
              <p className="text-[12px] text-danger">{state.fieldErrors.goals[0]}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((g) => (
                <Chip key={g} name="goals" value={g} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <SectionRule label="Interests — pick any" />
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((i) => (
                <Chip key={i} name="interests" value={i} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <SectionRule label="Where are you now?" />
            {state.fieldErrors?.experienceLevel?.[0] && (
              <p className="text-[12px] text-danger">{state.fieldErrors.experienceLevel[0]}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((e) => (
                <Chip key={e} name="experienceLevel" value={e} type="radio" />
              ))}
            </div>
          </div>

          {state.error && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" loading={pending}>
            Enter Tycoonhood
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
