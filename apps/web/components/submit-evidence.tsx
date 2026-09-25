"use client";
import { useActionState } from "react";
import { Button, Input, Textarea } from "@tycoonhood/ui";
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
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <p className="figures text-[12px] text-ink-3">
        Evidence: {approved}/{required} approved{pending > 0 ? ` · ${pending} in review` : ""}
      </p>
      <form action={formAction} className="flex flex-col gap-2">
        <Textarea name="text" rows={3} placeholder="What did you do? Be specific — a reviewer reads this." className="text-[13px]" />
        <div className="flex items-center gap-2">
          <Input name="url" placeholder="Link (optional)" className="h-9 flex-1 text-[13px]" />
          <Button size="sm" type="submit" loading={busy}>Submit evidence</Button>
        </div>
      </form>
      {state.message && <p className="text-[12px] text-success">{state.message}</p>}
      {state.error && <p className="text-[12px] text-danger">{state.error}</p>}
    </div>
  );
}
