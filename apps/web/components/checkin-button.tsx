"use client";
import { useActionState } from "react";
import { Button, Icon, Notice } from "@tycoonhood/ui";
import type { ChallengeActionState } from "../app/(app)/challenges/actions";

export function CheckInButton({
  action,
  label,
  block = false,
}: {
  action: () => Promise<ChallengeActionState>;
  label: string;
  /** Full-width control with its result below it (mission card); inline otherwise. */
  block?: boolean;
}) {
  const [state, formAction, pending] = useActionState(async () => action(), {} as ChallengeActionState);
  return (
    <div className={block ? "flex w-full flex-col gap-3" : "flex flex-col items-end gap-1.5"}>
      <form action={formAction} className={block ? "w-full" : undefined}>
        <Button size={block ? "lg" : "sm"} type="submit" loading={pending} className={block ? "w-full" : undefined}>
          {!pending && <Icon name="check" size={16} />}
          {label}
        </Button>
      </form>
      {block ? (
        <div aria-live="polite">
          {state.message && <Notice tone="success">{state.message}</Notice>}
          {state.error && <Notice tone="warning">{state.error}</Notice>}
        </div>
      ) : (
        <div aria-live="polite">
          {state.message && <p className="text-[12px] text-success">{state.message}</p>}
          {state.error && <p className="text-[12px] text-danger">{state.error}</p>}
        </div>
      )}
    </div>
  );
}
