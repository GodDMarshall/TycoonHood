"use client";
import { useActionState, useState } from "react";
import { Button, Input, Notice } from "@tycoonhood/ui";
import type { CheckoutState, CouponPreview } from "../../app/(app)/checkout/actions";

/**
 * Rail choice, delivery address (only when something ships), coupon (rupee
 * rail only) and the place-order button. Every figure shown here was
 * computed on the server; the browser only collects choices.
 */
export function CheckoutForm({
  placeAction,
  couponAction,
  rails,
  needsAddress,
  thcTotal,
  inrSubtotal,
  testMode,
}: {
  placeAction: (prev: CheckoutState, fd: FormData) => Promise<CheckoutState>;
  couponAction: (prev: CouponPreview, fd: FormData) => Promise<CouponPreview>;
  rails: { thc: { ok: boolean; why?: string }; inr: { ok: boolean; why?: string } };
  needsAddress: boolean;
  thcTotal: string;
  inrSubtotal: string;
  testMode: boolean;
}) {
  const [state, place, placing] = useActionState(placeAction, {} as CheckoutState);
  const [coupon, applyCoupon, applying] = useActionState(couponAction, {} as CouponPreview);
  const [rail, setRail] = useState<"thc" | "inr" | "">(rails.inr.ok ? "inr" : rails.thc.ok ? "thc" : "");
  const [code, setCode] = useState("");

  const radio = (value: "thc" | "inr", label: string, amount: string, r: { ok: boolean; why?: string }) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
        !r.ok ? "cursor-not-allowed opacity-60" : rail === value ? "border-gold-deep bg-gold/5" : "border-line hover:border-line-strong"
      }`}
    >
      <input
        type="radio"
        name="rail"
        value={value}
        checked={rail === value}
        disabled={!r.ok}
        onChange={() => setRail(value)}
        className="mt-1 accent-[var(--color-gold)]"
      />
      <span className="flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium text-ink-1">{label}</span>
          <span className="figures text-[15px] text-ink-1">{amount}</span>
        </span>
        {!r.ok && r.why && <span className="mt-1 block text-[12.5px] text-ink-3">{r.why}</span>}
        {r.ok && value === "inr" && testMode && (
          <span className="mt-1 block text-[12.5px] text-warning">Test mode — no real money is charged.</span>
        )}
      </span>
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      <form id="place-order" action={place} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[16px] font-semibold">How would you like to pay?</legend>
          {radio("inr", "Rupees (card, UPI, netbanking)", coupon.ok && rail === "inr" && coupon.total ? coupon.total : inrSubtotal, rails.inr)}
          {radio("thc", "THC from your wallet", thcTotal, rails.thc)}
        </fieldset>

        {needsAddress && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-[16px] font-semibold">Delivery address</legend>
            <p className="-mt-1 mb-1 text-[12.5px] text-ink-3">Saved on this order only — changing it later never changes where this parcel went.</p>
            <Input name="fullName" required placeholder="Full name" autoComplete="name" aria-label="Full name" />
            <Input name="line1" required placeholder="Street address" autoComplete="address-line1" aria-label="Street address" />
            <Input name="line2" placeholder="Apartment, floor (optional)" autoComplete="address-line2" aria-label="Apartment or floor" />
            <div className="grid grid-cols-2 gap-2">
              <Input name="city" required placeholder="City" autoComplete="address-level2" aria-label="City" />
              <Input name="region" placeholder="State" autoComplete="address-level1" aria-label="State" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input name="postalCode" required placeholder="PIN code" autoComplete="postal-code" aria-label="PIN code" />
              <Input name="country" required maxLength={2} defaultValue="IN" autoComplete="country" aria-label="Two-letter country code" className="uppercase" />
            </div>
            <Input name="phone" placeholder="Phone (helps the courier)" autoComplete="tel" aria-label="Phone" />
          </fieldset>
        )}
        {/* The applied coupon travels with the order; the server re-validates it atomically. */}
        <input type="hidden" name="coupon" value={rail === "inr" && coupon.ok ? coupon.code ?? code : ""} />
      </form>

      {rail === "inr" && (
        <form action={applyCoupon} className="flex flex-col gap-2">
          <label htmlFor="coupon" className="text-[13px] font-medium text-ink-1">Coupon code</label>
          <div className="flex gap-2">
            <Input id="coupon" name="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" className="uppercase" />
            <Button type="submit" variant="secondary" loading={applying}>Apply</Button>
          </div>
          {coupon.message && (
            <p className={`text-[12.5px] ${coupon.ok ? "text-success" : "text-danger"}`} role="status">
              {coupon.message}
              {coupon.ok && coupon.discount && ` You save ${coupon.discount}.`}
            </p>
          )}
          <p className="text-[12px] text-ink-3">Coupons apply to rupee payments only. THC prices are never discounted.</p>
        </form>
      )}

      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Button type="submit" form="place-order" size="lg" loading={placing} disabled={!rail}>
        {rail === "thc" ? `Pay ${thcTotal}` : rail === "inr" ? "Continue to payment" : "Choose how to pay"}
      </Button>
    </div>
  );
}
