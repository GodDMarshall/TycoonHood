"use client";
/** A server-action form that reports what happened: the saved message or the exact error. */
import { useActionState, type ReactNode } from "react";
import { Button, Notice, cn } from "@tycoonhood/ui";

type State = { ok?: string; error?: string };

export function ActionForm({
  action,
  submit,
  children,
  className,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  submit: string;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  return (
    <form action={formAction} className={cn("flex flex-col gap-3", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" loading={pending}>
          {submit}
        </Button>
        {state.ok && (
          <span role="status" className="text-[13px] text-success">
            {state.ok}
          </span>
        )}
      </div>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
    </form>
  );
}
