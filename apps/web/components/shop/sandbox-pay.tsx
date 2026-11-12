"use client";
import { useActionState } from "react";
import { Button, Notice } from "@tycoonhood/ui";
import type { PayState } from "../../app/(app)/checkout/actions";

/** The sandbox's stand-in for a card form: succeed or fail on purpose. Nothing is charged. */
export function SandboxPay({
  pay,
  fail,
  amount,
}: {
  pay: (prev: PayState) => Promise<PayState>;
  fail: (prev: PayState) => Promise<PayState>;
  amount: string;
}) {
  const [payState, payAction, paying] = useActionState(pay, {} as PayState);
  const [failState, failAction, failing] = useActionState(fail, {} as PayState);
  const error = payState.error ?? failState.error;
  return (
    <div className="flex flex-col gap-3">
      <form action={payAction}>
        <Button type="submit" size="lg" loading={paying} className="w-full">
          Pay {amount} (test)
        </Button>
      </form>
      <form action={failAction}>
        <Button type="submit" variant="ghost" size="sm" loading={failing}>
          Simulate a failed payment
        </Button>
      </form>
      {error && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}
