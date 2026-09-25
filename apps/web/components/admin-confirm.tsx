"use client";
import { Button } from "@tycoonhood/ui";

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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <Button size="sm" variant={variant} type="submit">{label}</Button>
    </form>
  );
}
