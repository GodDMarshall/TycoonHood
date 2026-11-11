"use client";
/** A one-button server-action form (publish, move, delete…) that reports its result inline. */
import { useActionState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@tycoonhood/ui";

type State = { ok?: string; error?: string };

export function InlineAction({
  action,
  label,
  variant = "secondary",
  confirm,
  ariaLabel,
  showOk = false,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  label: ReactNode;
  variant?: ButtonProps["variant"];
  /** Ask before submitting (deletes). */
  confirm?: string;
  ariaLabel?: string;
  showOk?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-start gap-1"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <Button type="submit" size="sm" variant={variant} loading={pending} aria-label={ariaLabel}>
        {label}
      </Button>
      {state.error && (
        <span role="alert" className="max-w-xs text-[12.5px] text-danger">
          {state.error}
        </span>
      )}
      {showOk && state.ok && (
        <span role="status" className="text-[12.5px] text-success">
          {state.ok}
        </span>
      )}
    </form>
  );
}
