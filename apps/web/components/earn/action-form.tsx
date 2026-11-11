"use client";
import { useActionState, useState } from "react";
import { Button, Input } from "@tycoonhood/ui";
import type { EarnFormState } from "./format";

type Bound = (prev: EarnFormState, fd: FormData) => Promise<EarnFormState>;

/**
 * One-button action that reports its result inline (approve, request payout).
 * The server decides; the button only asks.
 */
export function ActionButton({
  action,
  label,
  variant = "outline",
  confirmText,
}: {
  action: Bound;
  label: string;
  variant?: "primary" | "outline" | "ghost";
  confirmText?: string;
}) {
  const [state, form, pending] = useActionState(action, {} as EarnFormState);
  if (state.message) return <p className="text-[12px] text-success">{state.message}</p>;
  return (
    <form
      action={form}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <Button size="sm" variant={variant} type="submit" loading={pending}>
        {label}
      </Button>
      {state.error && <span role="alert" className="text-[12px] text-danger">{state.error}</span>}
    </form>
  );
}

/**
 * An action that needs one line of text first: a reason (shown to the
 * member) or a payment reference. Collapsed to a button until opened.
 */
export function TextActionForm({
  action,
  label,
  field = "reason",
  placeholder,
  submitLabel,
  variant = "ghost",
}: {
  action: Bound;
  label: string;
  field?: "reason" | "reference";
  placeholder: string;
  submitLabel?: string;
  variant?: "primary" | "outline" | "ghost" | "danger";
}) {
  const [state, form, pending] = useActionState(action, {} as EarnFormState);
  const [open, setOpen] = useState(false);
  if (state.message) return <p className="text-[12px] text-success">{state.message}</p>;
  if (!open) {
    return (
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form action={form} className="flex flex-wrap items-center gap-2">
      <Input name={field} required maxLength={field === "reason" ? 500 : 200} placeholder={placeholder} aria-label={placeholder} className="h-9 w-[240px]" autoFocus />
      <Button size="sm" type="submit" variant={variant === "danger" ? "danger" : "primary"} loading={pending}>
        {submitLabel ?? label}
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {state.error && <span role="alert" className="text-[12px] text-danger">{state.error}</span>}
    </form>
  );
}
