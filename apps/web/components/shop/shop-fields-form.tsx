"use client";
import { useActionState } from "react";
import { Button } from "@tycoonhood/ui";

type State = { ok?: string; error?: string };

/** Inline category + seller editor on an admin product row. */
export function ShopFieldsForm({
  action,
  categories,
  category,
  sellerName,
}: {
  action: (p: State, fd: FormData) => Promise<State>;
  categories: { slug: string; label: string }[];
  category: string | null;
  sellerName: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const field = "h-8 rounded-md border border-line-input/70 bg-bg-0/60 px-2 text-[12px] text-ink-1 focus:border-gold focus:outline-none";
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <select name="category" defaultValue={category ?? ""} aria-label="Category" className={field}>
        <option value="">No category</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>{c.label}</option>
        ))}
      </select>
      <input name="sellerName" defaultValue={sellerName ?? ""} placeholder="Seller (empty = Tycoonhood)" aria-label="Seller name" className={`${field} w-[200px]`} />
      <Button type="submit" size="sm" variant="ghost" loading={pending}>Save</Button>
      {state.ok && <span className="text-[12px] text-success" role="status">{state.ok}</span>}
      {state.error && <span className="text-[12px] text-danger" role="alert">{state.error}</span>}
    </form>
  );
}
