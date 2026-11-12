"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Field, Input, Notice, Select, Textarea } from "@tycoonhood/ui";
import type { EarnFormState } from "./format";

type Bound = (prev: EarnFormState, fd: FormData) => Promise<EarnFormState>;

/**
 * The affiliate application. Payout details are collected now so an admin can
 * review the whole application once; they are shown only to admins at payout.
 */
export function AffiliateRegisterForm({ action, disabled = false }: { action: Bound; disabled?: boolean }) {
  const [state, form, pending] = useActionState(action, {} as EarnFormState);
  const [method, setMethod] = useState<"UPI" | "BANK">("UPI");

  return (
    <form action={form} className="flex flex-col gap-5">
      <fieldset disabled={disabled || pending} className="flex flex-col gap-5">
        <Field label="Where will you share your link?" htmlFor="aff-channels" hint="Your channel, page, newsletter or community. An admin reads this when reviewing your application.">
          <Textarea id="aff-channels" name="channels" required minLength={3} maxLength={1000} placeholder="e.g. youtube.com/@mychannel — weekly training videos" />
        </Field>

        <Field label="Payout method" htmlFor="aff-method">
          <Select id="aff-method" name="payoutType" value={method} onChange={(e) => setMethod(e.target.value as "UPI" | "BANK")}>
            <option value="UPI">UPI</option>
            <option value="BANK">Bank transfer (India)</option>
          </Select>
        </Field>

        {method === "UPI" ? (
          <Field label="UPI ID" htmlFor="aff-upi">
            <Input id="aff-upi" name="upiId" required placeholder="name@bank" autoComplete="off" />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name on the account" htmlFor="aff-acname">
              <Input id="aff-acname" name="accountName" required autoComplete="name" />
            </Field>
            <Field label="Bank name" htmlFor="aff-bank" hint="Optional">
              <Input id="aff-bank" name="bankName" />
            </Field>
            <Field label="Account number" htmlFor="aff-acno">
              <Input id="aff-acno" name="accountNumber" required inputMode="numeric" autoComplete="off" />
            </Field>
            <Field label="IFSC" htmlFor="aff-ifsc">
              <Input id="aff-ifsc" name="ifsc" required placeholder="HDFC0001234" autoComplete="off" className="uppercase" />
            </Field>
          </div>
        )}

        <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-2">
          <input type="checkbox" name="acceptTerms" value="yes" required className="mt-1 size-4 accent-gold" />
          <span>
            I have read and accept the{" "}
            <Link href="/earn/terms" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold" target="_blank">
              Affiliate &amp; Referral Terms
            </Link>
            . I understand there is no guaranteed income and commissions are paid only on real, paid orders.
          </span>
        </label>

        {state.error && <Notice tone="danger">{state.error}</Notice>}
        {state.message && <Notice tone="success">{state.message}</Notice>}

        <div>
          <Button type="submit" loading={pending}>
            Apply
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
