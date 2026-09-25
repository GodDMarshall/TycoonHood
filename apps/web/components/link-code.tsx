"use client";
import { useActionState } from "react";
import { Button } from "@tycoonhood/ui";
import type { LinkCodeState } from "../app/(app)/settings/actions";

export function LinkCodeGenerator({ action }: { action: () => Promise<LinkCodeState> }) {
  const [state, formAction, pending] = useActionState(async () => action(), {} as LinkCodeState);
  return (
    <div className="flex flex-col gap-3">
      <form action={formAction}>
        <Button size="sm" type="submit" loading={pending}>
          {state.code ? "Generate a new code" : "Generate link code"}
        </Button>
      </form>
      {state.code && (
        <div className="rounded-md border border-gold-deep/50 bg-gold/10 px-4 py-3">
          <p className="figures text-[26px] tracking-[0.35em] text-gold-bright">{state.code}</p>
          <p className="mt-1 text-[12px] text-ink-2">
            In the Tycoonhood Discord, run <code className="figures">/link {state.code}</code> within 10 minutes.
          </p>
        </div>
      )}
    </div>
  );
}
