import type { Metadata } from "next";
import Link from "next/link";
import { wishlist, unitPrices } from "@tycoonhood/core";
import { Badge, EmptyState, ThcAmount, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader, Panel } from "../../../components/app/page";
import { SubmitButton } from "../../../components/submit-button";
import { stockOf } from "../../../components/shop/catalogue";
import { inr } from "../../../components/shop/format";
import { moveToCartAction, removeSavedAction } from "./actions";

export const metadata: Metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireUser();
  const items = await wishlist.list(user.id);
  return (
    <Page>
      <PageHeader title="Wishlist" description="Things you saved for later. Prices and stock here are live." />
      {items.length === 0 ? (
        <EmptyState
          icon="store"
          title="Nothing saved yet"
          body="Use “Save to wishlist” on any item in the store."
          action={<Link href="/store" className={buttonStyles({ size: "sm" })}>Browse the store</Link>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(({ product: p }) => {
            const price = unitPrices(p);
            const stock = stockOf(p);
            const sized = p.variants.length > 0;
            return (
              <li key={p.id}>
                <Panel as="div" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/store/${p.slug}`} className="text-[15px] font-medium hover:text-gold-bright">{p.name}</Link>
                    <p className="mt-1 flex flex-wrap items-baseline gap-3 text-[13px]">
                      {price.thc != null && <ThcAmount amount={price.thc} size="sm" />}
                      {price.inrPaise != null && <span className="figures">{inr(price.inrPaise)}</span>}
                      {!p.active && <Badge>No longer on sale</Badge>}
                      {p.active && stock === 0 && <Badge tone="danger">Sold out</Badge>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.active && stock !== 0 && (sized ? (
                      <Link href={`/store/${p.slug}`} className={buttonStyles({ size: "sm", variant: "secondary" })}>Choose a size</Link>
                    ) : (
                      <form action={moveToCartAction.bind(null, p.id)}>
                        <SubmitButton size="sm" variant="secondary">Move to cart</SubmitButton>
                      </form>
                    ))}
                    <form action={removeSavedAction.bind(null, p.id)}>
                      <SubmitButton size="sm" variant="ghost">Remove</SubmitButton>
                    </form>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
