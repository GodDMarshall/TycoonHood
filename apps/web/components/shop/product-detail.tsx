/**
 * A product's own page, shared by /store/[slug] (members) and
 * /marketplace/[slug] (guests). Server component.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { MAX_LINE_QTY, categoryLabel, priceInTime, unitPrices } from "@tycoonhood/core";
import { Badge, CoinMark, Icon, ThcAmount, type IconName } from "@tycoonhood/ui";
import { addToCartAction, toggleWishlistAction } from "../../app/(app)/store/actions";
import { releaseExpiredHolds } from "../../lib/stale-orders";
import { AddToCart, GuestAddToCart } from "./add-to-cart";
import { stockOf } from "./catalogue";
import { KIND_LABEL, inr } from "./format";
import { SubmitButton } from "../submit-button";

const kindIcon: Record<string, IconName> = { DIGITAL: "book", PHYSICAL: "orders", COURSE: "academy", MEMBERSHIP: "seal" };

export async function ProductDetail({
  slug,
  base,
  user,
}: {
  slug: string;
  base: "/store" | "/marketplace";
  user: { id: string } | null;
}) {
  // Unpaid orders past their hold give their stock back before it is shown.
  await releaseExpiredHolds();
  const p = await prisma.product.findUnique({
    where: { slug },
    include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!p || !p.active) notFound();

  const saved = user
    ? !!(await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId: p.id } } }))
    : false;
  const stock = stockOf(p);
  const base_ = unitPrices(p);
  const time = p.kind === "PHYSICAL" && base_.thc != null ? priceInTime(base_.thc) : null;
  const legacyFiat = p.priceFiatCents != null && p.fiatCurrency !== "INR";

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
        <Link href={base} className="hover:text-ink-1">Store</Link>
        {p.category && (
          <>
            {" / "}
            <Link href={`${base}?category=${p.category}`} className="hover:text-ink-1">{categoryLabel(p.category)}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-line bg-[radial-gradient(ellipse_at_50%_60%,var(--color-bg-3),var(--color-bg-1)_70%)]">
          {p.image ? (
            /* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL */
            <img src={p.image} alt={p.name} className="aspect-[4/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center" aria-hidden>
              <div className="flex size-28 items-center justify-center rounded-full border border-line-strong bg-bg-1/80">
                {p.kind === "PHYSICAL" ? <CoinMark size={60} /> : <Icon name={kindIcon[p.kind] ?? "store"} size={42} className="text-gold" />}
              </div>
            </div>
          )}
          {!p.image && <p className="border-t border-line px-4 py-2 text-[12px] text-ink-3">No photograph of this item yet.</p>}
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge>{KIND_LABEL[p.kind]}</Badge>
            {p.category && <Badge>{categoryLabel(p.category)}</Badge>}
            {stock === 0 && <Badge tone="danger">Sold out</Badge>}
          </div>
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">{p.name}</h1>
            <p className="mt-1 text-[13px] text-ink-3">Sold by {p.sellerName ?? "Tycoonhood"}</p>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            {base_.thc != null && <ThcAmount amount={base_.thc} />}
            {base_.thc != null && base_.inrPaise != null && <span className="text-[13px] text-ink-3">or</span>}
            {base_.inrPaise != null && <span className="figures text-[20px] text-ink-1">{inr(base_.inrPaise)}</span>}
          </div>
          {time && (
            <p className="-mt-3 flex items-center gap-1.5 text-[13px] text-ink-3">
              <Icon name="clock" size={13} /> {time.summary}
            </p>
          )}
          {legacyFiat && (
            <p className="-mt-2 text-[12px] text-ink-3">Card checkout is in rupees; this item has no rupee price yet.</p>
          )}

          <p className="text-[13px] text-ink-2">
            {stock == null
              ? p.kind === "PHYSICAL" ? "In stock." : "Delivered instantly after payment."
              : stock === 0
                ? "Sold out. We restock only when the next batch is paid for and on the shelf."
                : `${stock} in stock${p.variants.length ? " across sizes" : ""}.`}
          </p>

          {user ? (
            <AddToCart
              action={addToCartAction.bind(null, p.id, p.slug)}
              variants={p.variants.map((v) => {
                const vp = unitPrices(p, v);
                return {
                  id: v.id,
                  label: v.label,
                  inventory: v.inventory,
                  thc: v.priceThc != null && vp.thc != null ? vp.thc.toLocaleString("en-US") : null,
                  inr: v.priceFiatCents != null && vp.inrPaise != null ? inr(vp.inrPaise) : null,
                };
              })}
              stock={p.variants.length ? null : p.inventory}
              maxQty={MAX_LINE_QTY}
            />
          ) : (
            <GuestAddToCart next={`/store/${p.slug}`} />
          )}

          {user && (
            <form action={toggleWishlistAction.bind(null, p.id, p.slug)}>
              <SubmitButton variant="ghost" size="sm" aria-pressed={saved}>
                {saved ? "Saved to your wishlist — remove" : "Save to wishlist"}
              </SubmitButton>
            </form>
          )}

          <div className="border-t border-line pt-5">
            <h2 className="mb-2 text-[15px] font-semibold">About this item</h2>
            <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">{p.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
