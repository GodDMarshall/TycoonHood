"use client";
import { useState } from "react";
import { Button, Dialog, Icon, Label, Notice, Textarea } from "@tycoonhood/ui";
import { reportAction } from "../actions";

export function ReportButton({ type, id, already }: { type: "post" | "comment"; id: string; already?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!already);
  const [error, setError] = useState<string | null>(null);

  if (done) return <span className="text-[12.5px] text-ink-3">Reported</span>;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await reportAction(type, id, reason);
    setBusy(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setDone(true);
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-7 items-center gap-1 rounded px-1.5 text-[12.5px] text-ink-3 hover:bg-bg-2 hover:text-ink-1">
        <Icon name="flag" size={14} /> Report
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Report this ${type}`}
        description="Staff read every report. Say briefly which rule it breaks."
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" loading={busy} onClick={() => void submit()} disabled={reason.trim().length < 3}>
              Send report
            </Button>
          </>
        }
      >
        <Label htmlFor={`rep-${id}`} className="sr-only">
          Reason
        </Label>
        <Textarea id={`rep-${id}`} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Spam, selling, a personal attack…" />
        {error && <Notice tone="danger" className="mt-3">{error}</Notice>}
      </Dialog>
    </>
  );
}
