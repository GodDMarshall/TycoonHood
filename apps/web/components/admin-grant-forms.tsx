"use client";
import { useActionState } from "react";
import { Button, Input } from "@tycoonhood/ui";
import type { AdminActionState } from "../app/(app)/admin/actions";

type Bound = (prev: AdminActionState, fd: FormData) => Promise<AdminActionState>;

export function GrantForms({ thcAction, xpAction }: { thcAction: Bound; xpAction: Bound }) {
  const [thcState, thcForm, thcPending] = useActionState(thcAction, {} as AdminActionState);
  const [xpState, xpForm, xpPending] = useActionState(xpAction, {} as AdminActionState);
  const notice = thcState.message ?? thcState.error ?? xpState.message ?? xpState.error;
  const isError = !!(thcState.error ?? xpState.error);
  return (
    <div className="flex flex-col gap-2">
      <form action={thcForm} className="flex items-center gap-2">
        <Input name="amount" type="number" min={1} placeholder="THC" className="h-8 w-24 text-[12px]" />
        <Input name="memo" placeholder="memo (audited)" className="h-8 w-40 text-[12px]" />
        <Button size="sm" type="submit" loading={thcPending}>Grant THC</Button>
      </form>
      <form action={xpForm} className="flex items-center gap-2">
        <Input name="amount" type="number" min={1} placeholder="XP" className="h-8 w-24 text-[12px]" />
        <Button size="sm" variant="outline" type="submit" loading={xpPending}>Grant XP</Button>
      </form>
      {notice && <p className={`text-[11px] ${isError ? "text-danger" : "text-success"}`}>{notice}</p>}
    </div>
  );
}
