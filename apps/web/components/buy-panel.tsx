"use client";
import { useActionState, useState } from "react";
import { Button, Input } from "@tycoonhood/ui";
import type { BuyState } from "../app/(public)/marketplace/actions";

type BoundAction = (prev: BuyState, fd: FormData) => Promise<BuyState>;

export interface VariantView {
  id: string;
  label: string;
  inventory: number;
  priceThc: string | null;
}

/**
 * Everything checkout needs, on the card itself: pick a size, say where it
 * goes, pay. A separate checkout page would be one more place to abandon.
 */
export function BuyPanel({
  variants,
  physical,
  hasThc,
  hasFiat,
  fiatLabel,
  devPayments,
  thcAction,
  cardAction,
  basePriceThc,
}: {
  variants: VariantView[];
  physical: boolean;
  hasThc: boolean;
  hasFiat: boolean;
  fiatLabel?: string;
  devPayments: boolean;
  thcAction?: BoundAction;
  cardAction?: BoundAction;
  basePriceThc: string | null;
}) {
  const [thcState, thcForm, thcPending] = useActionState(thcAction ?? (async (p) => p), {} as BuyState);
  const [cardState, cardForm, cardPending] = useActionState(cardAction ?? (async (p) => p), {} as BuyState);
  const [variantId, setVariantId] = useState<string>(
    variants.find((v) => v.inventory > 0)?.id ?? ""
  );
  const [open, setOpen] = useState(false);

  const notice = thcState.message ?? thcState.error ?? cardState.message ?? cardState.error;
  const isError = !!(thcState.error ?? cardState.error);
  const done = !!(thcState.message ?? cardState.message);

  const chosen = variants.find((v) => v.id === variantId) ?? null;
  const shownPrice = chosen?.priceThc ?? basePriceThc;
  const soldOut = variants.length > 0 && variants.every((v) => v.inventory <= 0);
  const needsChoice = variants.length > 0 && !variantId;

  const AddressFields = physical && !done && (
    <div className="mt-3 grid gap-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">Where it goes</p>
      <Input name="fullName" required placeholder="Full name" autoComplete="name" />
      <Input name="line1" required placeholder="Street address" autoComplete="address-line1" />
      <Input name="line2" placeholder="Apartment, floor (optional)" autoComplete="address-line2" />
      <div className="grid grid-cols-2 gap-2">
        <Input name="city" required placeholder="City" autoComplete="address-level2" />
        <Input name="region" placeholder="State / region" autoComplete="address-level1" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input name="postalCode" required placeholder="Postcode" autoComplete="postal-code" />
        <Input name="country" required maxLength={2} placeholder="IN" autoComplete="country"
          className="uppercase" aria-label="Two-letter country code" />
      </div>
      <Input name="phone" placeholder="Phone (helps the courier)" autoComplete="tel" />
    </div>
  );

  const SizePicker = variants.length > 0 && !done && (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-3">Size</p>
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => {
          const out = v.inventory <= 0;
          const active = v.id === variantId;
          return (
            <button
              key={v.id}
              type="button"
              disabled={out}
              onClick={() => setVariantId(v.id)}
              aria-pressed={active}
              className={`figures min-w-[44px] rounded-md border px-2.5 py-1.5 text-[13px] transition-colors ${
                out
                  ? "cursor-not-allowed border-line text-ink-3 line-through"
                  : active
                    ? "border-gold-deep bg-gold/10 text-gold-bright"
                    : "border-line text-ink-2 hover:border-gold-deep/50"
              }`}
              title={out ? "Sold out" : `${v.inventory} left`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      {chosen && chosen.inventory > 0 && chosen.inventory <= 3 && (
        <p className="mt-1.5 text-[11px] text-gold-bright">Only {chosen.inventory} left in {chosen.label}.</p>
      )}
      {soldOut && <p className="mt-1.5 text-[12px] text-danger">Every size is sold out.</p>}
    </div>
  );

  if (done) {
    return (
      <div className="border-t border-line pt-3">
        <p className="text-[13px] text-success">{notice}</p>
        {cardState.dev && (
          <p className="mt-1 text-[11px] text-ink-3">DEV PAYMENT: no real charge was made.</p>
        )}
      </div>
    );
  }

  // Collapsed state: one button, so the grid stays readable.
  if (physical && !open) {
    return (
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <Button size="sm" onClick={() => setOpen(true)} disabled={soldOut}>
          {soldOut ? "Sold out" : "Buy"}
        </Button>
        {variants.length > 0 && (
          <p className="text-[11px] text-ink-3">
            {variants.filter((v) => v.inventory > 0).length} of {variants.length} sizes in stock
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      {shownPrice && chosen?.priceThc && chosen.priceThc !== basePriceThc && (
        <p className="figures text-[12px] text-gold-bright">
          {chosen.label}: {Number(shownPrice).toLocaleString("en-US")} THC
        </p>
      )}

      {hasThc && thcAction && (
        <form action={thcForm}>
          <input type="hidden" name="variantId" value={variantId} />
          {SizePicker}
          {AddressFields}
          <Button size="sm" type="submit" loading={thcPending} className="mt-3 w-full"
            disabled={soldOut || needsChoice}>
            Buy with THC
          </Button>
        </form>
      )}

      {hasFiat && cardAction && (
        <form action={cardForm}>
          <input type="hidden" name="variantId" value={variantId} />
          {/* The THC form above already collected these when both rails exist. */}
          {!hasThc && SizePicker}
          {!hasThc && AddressFields}
          <Button size="sm" variant="outline" type="submit" loading={cardPending}
            className={hasThc ? "w-full" : "mt-3 w-full"} disabled={soldOut || needsChoice}>
            {fiatLabel ?? "Buy with card"}
          </Button>
        </form>
      )}

      {hasThc && hasFiat && physical && (
        <p className="text-[11px] text-ink-3">
          The card option uses the size and address filled in above.
        </p>
      )}
      {hasFiat && devPayments && (
        <p className="text-[11px] leading-relaxed text-ink-3">
          Card payments run in development mode — no live provider is configured,
          so card orders are recorded but not charged.
        </p>
      )}
      {notice && <p className={`text-[12px] ${isError ? "text-danger" : "text-success"}`}>{notice}</p>}
    </div>
  );
}
