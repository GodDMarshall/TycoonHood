"use client";
import { useActionState } from "react";
import { Button } from "@tycoonhood/ui";
import type { BuyState } from "../app/(public)/marketplace/actions";

type BoundAction = (prev: BuyState, fd: FormData) => Promise<BuyState>;

export function BuyButtons({
  thcAction,
  cardAction,
  hasThc,
  hasFiat,
  fiatLabel,
  devPayments,
}: {
  thcAction?: BoundAction;
  cardAction?: BoundAction;
  hasThc: boolean;
  hasFiat: boolean;
  fiatLabel?: string;
  devPayments: boolean;
}) {
  const [thcState, thcForm, thcPending] = useActionState(thcAction ?? (async (p) => p), {} as BuyState);
  const [cardState, cardForm, cardPending] = useActionState(cardAction ?? (async (p) => p), {} as BuyState);
  const notice = thcState.message ?? thcState.error ?? cardState.message ?? cardState.error;
  const isError = !!(thcState.error ?? cardState.error);
  const wasDev = cardState.dev;

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {hasThc && thcAction && (
          <form action={thcForm}>
            <Button size="sm" type="submit" loading={thcPending}>Buy with THC</Button>
          </form>
        )}
        {hasFiat && cardAction && (
          <form action={cardForm}>
            <Button size="sm" variant="outline" type="submit" loading={cardPending}>
              {fiatLabel ?? "Buy with card"}
            </Button>
          </form>
        )}
      </div>
      {hasFiat && devPayments && (
        <p className="text-[11px] leading-relaxed text-ink-3">
          Card payments run in development mode — no live payment provider is
          configured, so card orders are recorded but not charged.
        </p>
      )}
      {notice && (
        <p className={`text-[12px] ${isError ? "text-danger" : "text-success"}`}>
          {notice}
          {wasDev && " — DEV PAYMENT: no real charge was made."}
        </p>
      )}
    </div>
  );
}
