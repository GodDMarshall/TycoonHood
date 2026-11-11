"use client";
import { useActionState, useEffect, useRef } from "react";
import { Button, Label, Notice, Textarea } from "@tycoonhood/ui";

type State = { ok?: string; error?: string };

export function CommentForm({ action, max }: { action: (prev: State, fd: FormData) => Promise<State>; max: number }) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-3">
      <Label htmlFor="cf-body" className="sr-only">
        Your comment
      </Label>
      <Textarea id="cf-body" name="body" required rows={4} maxLength={max} placeholder="Add something useful." />
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <div>
        <Button type="submit" size="sm" loading={pending}>
          Comment
        </Button>
      </div>
    </form>
  );
}
