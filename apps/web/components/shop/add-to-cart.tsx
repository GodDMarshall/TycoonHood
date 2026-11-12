"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Notice, buttonStyles } from "@tycoonhood/ui";
import type { AddState } from "../../app/(app)/store/actions";

export interface VariantOption {
  id: string;
  label: string;
  inventory: number;
  thc: string | null;
  inr: string | null;
}

/**
 * Size picker, quantity and "Add to cart". The server re-checks everything
 * (active, size, stock, 1–20); this only makes the choice easy.
 */
export function AddToCart({
  action,
  variants,
  stock,
  maxQty,
}: {
  action: (prev: AddState, fd: FormData) => Promise<AddState>;
  variants: VariantOption[];
  /** Units available for a size-less product; null = unlimited. */
  stock: number | null;
  maxQty: number;
}) {
  const [state, formAction, pending] = useActionState(action, {} as AddState);
  const [variantId, setVariantId] = useState(variants.find((v) => v.inventory > 0)?.id ?? "");
  const chosen = variants.find((v) => v.id === variantId) ?? null;
  const available = variants.length ? (chosen?.inventory ?? 0) : stock;
  const soldOut = variants.length ? variants.every((v) => v.inventory <= 0) : stock === 0;
  const cap = Math.max(1, Math.min(maxQty, available ?? maxQty));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="variantId" value={variantId} />
      {variants.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink-1">Size</legend>
          <div className="flex flex-wrap gap-1.5">
            {variants.map((v) => {
              const out = v.inventory <= 0;
              const on = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  aria-pressed={on}
                  onClick={() => setVariantId(v.id)}
                  title={out ? "Sold out" : `${v.inventory} left`}
                  className={`figures min-w-[48px] rounded-md border px-3 py-2 text-[13px] transition-colors ${
                    out
                      ? "cursor-not-allowed border-line text-ink-3 line-through"
                      : on
                        ? "border-gold-deep bg-gold/10 text-gold-bright"
                        : "border-line text-ink-2 hover:border-gold-deep/60"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          {chosen && (chosen.thc || chosen.inr) && (
            <p className="mt-2 text-[12px] text-ink-3">
              {chosen.label}: {[chosen.thc && `${chosen.thc} THC`, chosen.inr].filter(Boolean).join(" or ")}
            </p>
          )}
          {chosen && chosen.inventory > 0 && chosen.inventory <= 3 && (
            <p className="mt-1 text-[12px] text-gold-bright">Only {chosen.inventory} left in {chosen.label}.</p>
          )}
        </fieldset>
      )}

      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-1">
          Quantity
          <select
            name="qty"
            defaultValue="1"
            disabled={soldOut}
            className="h-11 w-[88px] rounded-md border border-line-input/70 bg-bg-0/60 px-3 text-[14px] text-ink-1 focus:border-gold focus:outline-none"
          >
            {Array.from({ length: cap }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <Button type="submit" loading={pending} disabled={soldOut || (variants.length > 0 && !variantId)} className="flex-1">
          {soldOut ? "Sold out" : "Add to cart"}
        </Button>
      </div>

      {state.ok && (
        <Notice tone="success">
          {state.ok}{" "}
          <Link href="/cart" className="underline underline-offset-4">View cart</Link>
        </Notice>
      )}
      {state.error && <Notice tone="danger">{state.error}</Notice>}
    </form>
  );
}

/** What a guest sees in place of the form. */
export function GuestAddToCart({ next }: { next: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonStyles({ className: "w-full" })}>
        Sign in to add to cart
      </Link>
      <p className="text-[12px] text-ink-3">
        New here? <Link href="/register" className="text-gold underline decoration-gold-shadow underline-offset-4">Join free</Link> — it takes a minute.
      </p>
    </div>
  );
}
