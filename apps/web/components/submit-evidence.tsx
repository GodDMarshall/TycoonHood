"use client";
import { useActionState, useId } from "react";
import { Button, Input, Notice, Textarea } from "@tycoonhood/ui";
import type { ChallengeActionState } from "../app/(app)/challenges/actions";

export function SubmitEvidence({
  action,
  approved,
  required,
  pending,
}: {
  action: (prev: ChallengeActionState, fd: FormData) => Promise<ChallengeActionState>;
  approved: number;
  required: number;
  pending: number;
}) {
  const [state, formAction, busy] = useActionState(action, {} as ChallengeActionState);
  const id = useId();
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-bg-0/50 p-4">
      <p className="figures text-[12px] text-ink-3">
        Evidence: {approved}/{required} approved{pending > 0 ? ` · ${pending} in review` : ""}
      </p>
      <form action={formAction} className="flex flex-col gap-2">
        <label htmlFor={`${id}-text`} className="sr-only">What you did</label>
        <Textarea id={`${id}-text`} name="text" rows={3} placeholder="What did you do? Be specific — a reviewer reads this." className="text-[13.5px]" />
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${id}-url`} className="sr-only">Link to evidence (optional)</label>
          <Input id={`${id}-url`} name="url" type="url" placeholder="Link (optional)" className="h-10 min-w-0 flex-1 text-[13.5px]" />
          <Button size="sm" type="submit" loading={busy}>Submit evidence</Button>
        </div>
      </form>
      <div aria-live="polite">
        {state.message && <Notice tone="success">{state.message}</Notice>}
        {state.error && <Notice tone="danger">{state.error}</Notice>}
      </div>
    </div>
  );
}
