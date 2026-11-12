"use client";
import { useActionState } from "react";
import { Button, Notice, Textarea } from "@tycoonhood/ui";
import type { RefundFormState } from "../../app/(app)/orders/actions";

export function RefundForm({ action, maxLength }: { action: (p: RefundFormState, fd: FormData) => Promise<RefundFormState>; maxLength: number }) {
  const [state, formAction, pending] = useActionState(action, {} as RefundFormState);
  if (state.ok) return <Notice tone="success">{state.ok}</Notice>;
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="refund-reason" className="text-[13px] font-medium text-ink-1">What went wrong?</label>
      <Textarea id="refund-reason" name="reason" required minLength={10} maxLength={maxLength} placeholder="A sentence or two helps us decide quickly." />
      <div>
        <Button type="submit" size="sm" variant="secondary" loading={pending}>Request a refund</Button>
      </div>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
    </form>
  );
}
