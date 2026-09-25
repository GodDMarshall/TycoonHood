"use client";
import { Button, Input } from "@tycoonhood/ui";

export function ReviewCard({
  approveAction,
  rejectAction,
}: {
  approveAction: (fd: FormData) => Promise<void>;
  rejectAction: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={approveAction}>
        <Button size="sm" type="submit">Approve</Button>
      </form>
      <form action={rejectAction} className="flex items-center gap-2">
        <Input name="feedback" placeholder="Feedback (sent to member)" className="h-8 w-56 text-[12px]" />
        <Button size="sm" variant="outline" type="submit">Reject</Button>
      </form>
    </div>
  );
}
