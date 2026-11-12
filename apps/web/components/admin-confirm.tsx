"use client";
import { useRef, useState } from "react";
import { Button, Dialog } from "@tycoonhood/ui";

/**
 * A consequential admin action behind a confirmation dialog. The form is
 * submitted only from the dialog's confirm button, so an accidental click
 * on the trigger never writes to the ledger.
 */
export function ConfirmButton({
  action,
  label,
  confirmText,
  variant = "outline",
}: {
  action: () => Promise<void>;
  label: string;
  confirmText: string;
  variant?: "outline" | "ghost" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action}>
      <Button size="sm" variant={variant} type="button" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        tone="confirmation"
        title={`${label}?`}
        description={confirmText}
        footer={
          <>
            <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => {
                setOpen(false);
                form.current?.requestSubmit();
              }}
            >
              {label}
            </Button>
          </>
        }
      />
    </form>
  );
}
