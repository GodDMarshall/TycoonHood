"use client";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@tycoonhood/ui";

/** A submit button that shows its form is in flight — for plain server-action forms. */
export function SubmitButton({ children, pendingLabel, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
