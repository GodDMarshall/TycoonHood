"use client";
import { useActionState } from "react";
import { Button } from "@tycoonhood/ui";
import type { ChallengeActionState } from "../app/(app)/challenges/actions";

export function CheckInButton({
  action,
  label,
}: {
  action: () => Promise<ChallengeActionState>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(async () => action(), {} as ChallengeActionState);
  return (
    <div className="flex flex-col items-end gap-1.5">
      <form action={formAction}>
        <Button size="sm" type="submit" loading={pending}>{label}</Button>
      </form>
      {state.message && <p className="text-[12px] text-success">{state.message}</p>}
      {state.error && <p className="text-[12px] text-danger">{state.error}</p>}
    </div>
  );
}
