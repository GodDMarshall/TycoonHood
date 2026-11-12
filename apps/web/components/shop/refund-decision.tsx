"use client";
import { useActionState } from "react";
import { Button, Input, Notice } from "@tycoonhood/ui";

type State = { ok?: string; error?: string };

/** Approve / reject with a note. Rejection requires the note: the member reads it. */
export function RefundDecision({ action }: { action: (p: State, fd: FormData) => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  if (state.ok) return <p className="text-[13px] text-success" role="status">{state.ok}</p>;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Input name="note" placeholder="Note to the member (required to reject)" aria-label="Note to the member" />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="approve" size="sm" loading={pending}>Approve and refund</Button>
        <Button type="submit" name="decision" value="reject" size="sm" variant="outline" disabled={pending}>Reject</Button>
      </div>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
    </form>
  );
}
