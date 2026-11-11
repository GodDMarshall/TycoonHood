import type { Metadata } from "next";
import Link from "next/link";
import { cart, paymentsStatusFor, MAX_LINE_QTY } from "@tycoonhood/core";
import { EmptyState, Notice, ThcAmount, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader, Panel, SectionTitle } from "../../../components/app/page";
import { SubmitButton } from "../../../components/submit-button";
import { inr, KIND_LABEL } from "../../../components/shop/format";
import { removeLineAction, saveForLaterAction, setQtyAction } from "./actions";

export const metadata: Metadata = { title: "Cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await requireUser();
  const { lines, totals } = await cart.list(user.id);
  const pay = paymentsStatusFor(user);

  return (
    <Page>
      <PageHeader title="Cart" description="Prices and stock are checked again at checkout, so what you see here is what you pay." />
      {lines.length === 0 ? (
        <EmptyState
          icon="store"
          title="Your cart is empty"
          body="Add program access, resources or gear from the store."
          action={<Link href="/store" className={buttonStyles({ size: "sm" })}>Go to the store</Link>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="flex flex-col gap-3" aria-label="Items in your cart">
            {lines.map((l) => (
              <li key={l.id}>
                <Panel as="div" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/store/${l.slug}`} className="text-[15px] font-medium text-ink-1 hover:text-gold-bright">
                      {l.name}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {KIND_LABEL[l.kind]}
                      {l.variantLabel && ` · Size ${l.variantLabel}`}
                    </p>
                    <p className="figures mt-1 flex flex-wrap gap-x-3 text-[13px] text-ink-2">
                      {l.unitThc != null && <span>{l.unitThc.toLocaleString("en-US")} THC each</span>}
                      {l.unitInrPaise != null && <span>{inr(l.unitInrPaise)} each</span>}
                    </p>
                    {l.problem && <p className="mt-1 text-[12.5px] text-danger">{l.problem}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={setQtyAction.bind(null, l.lineKey)} className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`qty-${l.id}`}>Quantity of {l.name}</label>
                      <select
                        id={`qty-${l.id}`}
                        name="qty"
                        defaultValue={String(l.qty)}
                        className="h-9 w-[72px] rounded-md border border-line-input/70 bg-bg-0/60 px-2 text-[14px] text-ink-1"
                      >
                        {Array.from({ length: MAX_LINE_QTY }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <SubmitButton size="sm" variant="secondary">Update</SubmitButton>
                    </form>
                    <form action={saveForLaterAction.bind(null, l.lineKey, l.productId)}>
                      <SubmitButton size="sm" variant="ghost">Save for later</SubmitButton>
                    </form>
                    <form action={removeLineAction.bind(null, l.lineKey)}>
                      <SubmitButton size="sm" variant="ghost">Remove</SubmitButton>
                    </form>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>

          <Panel className="h-fit p-5">
            <SectionTitle>Summary</SectionTitle>
            <p className="text-[13px] text-ink-3">{totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}</p>
            <dl className="mt-4 flex flex-col gap-3 text-[14px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-2">Pay with THC</dt>
                <dd>{totals.thc.unpriced.length === 0 ? <ThcAmount amount={totals.thc.total} size="sm" /> : <span className="text-[12px] text-ink-3">Not every item takes THC</span>}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-2">Pay in rupees</dt>
                <dd className="figures">{totals.inr.unpriced.length === 0 ? inr(totals.inr.total) : <span className="text-[12px] text-ink-3">Not every item has a rupee price</span>}</dd>
              </div>
            </dl>
            {totals.inr.unpriced.length === 0 && pay.provider === null && (
              <p className="mt-3 text-[12px] text-ink-3">{pay.summary}</p>
            )}
            {totals.blocked.length > 0 && (
              <Notice tone="warning" className="mt-4">Fix the items marked above before checking out.</Notice>
            )}
            {!totals.thc.payable && !totals.inr.payable && totals.blocked.length === 0 && (
              <Notice tone="warning" className="mt-4">
                No single way to pay covers every item. Split the cart: remove the items one rail cannot take.
              </Notice>
            )}
            <Link
              href="/checkout"
              aria-disabled={!totals.thc.payable && !totals.inr.payable}
              className={buttonStyles({ className: "mt-5 w-full" })}
            >
              Checkout
            </Link>
            <p className="mt-3 text-[12px] text-ink-3">Coupons are entered at checkout and apply to rupee payments.</p>
          </Panel>
        </div>
      )}
    </Page>
  );
}
