/**
 * The catalogue — one server component for the member /store and the public
 * /marketplace, so the two can never disagree about a price or a stock count.
 * Filters are a plain GET form: they work without JavaScript and every
 * filtered view is a shareable URL.
 */
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { SHOP_CATEGORIES, categoryLabel, priceInTime } from "@tycoonhood/core";
import { Badge, CoinMark, EmptyState, Icon, Input, Select, ThcAmount, buttonStyles, type IconName } from "@tycoonhood/ui";
import { catalogueQuery, normaliseParams, queryString, SORTS } from "./catalogue-query";
import { KIND_LABEL, inr } from "./format";

const kindIcon: Record<string, IconName> = { DIGITAL: "book", PHYSICAL: "orders", COURSE: "academy", MEMBERSHIP: "seal" };

export async function Catalogue({
  base,
  searchParams,
  wishlistIds,
}: {
  base: "/store" | "/marketplace";
  searchParams: Record<string, string | string[] | undefined>;
  wishlistIds?: Set<string>;
}) {
  const p = normaliseParams(searchParams);
  const { where, orderBy } = catalogueQuery(p);
  const [products, counts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take: 120,
      include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.product.groupBy({ by: ["category"], where: { active: true }, _count: true }),
  ]);
  const countOf = (slug: string) => counts.find((c) => c.category === slug)?._count ?? 0;
  const filtered = !!(p.q || p.category || p.kind || p.rail);

  return (
    <div className="flex flex-col gap-6">
      {/* Category chips */}
      <nav aria-label="Categories" className="-mx-1 flex flex-wrap gap-1.5">
        <Link
          href={`${base}${queryString({ ...p, category: "" , sort: p.sort === "new" ? "" : p.sort })}`}
          className={chip(!p.category)}
          aria-current={!p.category ? "page" : undefined}
        >
          All
        </Link>
        {SHOP_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`${base}${queryString({ ...p, category: c.slug, sort: p.sort === "new" ? "" : p.sort })}`}
            className={chip(p.category === c.slug)}
            aria-current={p.category === c.slug ? "page" : undefined}
          >
            {c.label}
            <span className="figures ml-1.5 text-ink-3">{countOf(c.slug)}</span>
          </Link>
        ))}
      </nav>

      <form method="get" action={base} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]" role="search">
        {p.category && <input type="hidden" name="category" value={p.category} />}
        <label className="sr-only" htmlFor="shop-q">Search the store</label>
        <Input id="shop-q" name="q" defaultValue={p.q} placeholder="Search the store" type="search" />
        <label className="sr-only" htmlFor="shop-kind">Kind</label>
        <Select id="shop-kind" name="kind" defaultValue={p.kind} className="sm:w-[150px]">
          <option value="">Any kind</option>
          {Object.entries(KIND_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="shop-rail">Pay with</label>
        <Select id="shop-rail" name="rail" defaultValue={p.rail} className="sm:w-[150px]">
          <option value="">THC or rupees</option>
          <option value="thc">Payable in THC</option>
          <option value="inr">Payable in rupees</option>
        </Select>
        <label className="sr-only" htmlFor="shop-sort">Sort</label>
        <Select id="shop-sort" name="sort" defaultValue={p.sort} className="sm:w-[180px]">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
        <button type="submit" className={buttonStyles({ variant: "secondary", className: "h-11" })}>
          Apply
        </button>
      </form>

      {p.category === "partner" && products.length === 0 ? (
        <EmptyState
          icon="store"
          title="No approved partners yet"
          body="Partner products appear here once a partner has been reviewed and approved. Nothing is listed on anyone's behalf before then."
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="search"
          title={filtered ? "Nothing matches these filters" : "Nothing is listed yet"}
          body={
            filtered
              ? "Try another search or clear the filters."
              : "Items go live only once their real cost is on the books, so every price is honest the day it appears."
          }
          action={
            filtered ? (
              <Link href={base} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-[13px] text-ink-3" aria-live="polite">
            {products.length} {products.length === 1 ? "item" : "items"}
            {p.category && ` in ${categoryLabel(p.category)}`}
            {p.q && ` matching "${p.q}"`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((prod) => (
              <ProductCard key={prod.id} p={prod} href={`${base}/${prod.slug}`} saved={wishlistIds?.has(prod.id) ?? false} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const chip = (on: boolean) =>
  `rounded-md border px-2.5 py-1.5 text-[13px] transition-colors ${
    on ? "border-gold-deep bg-gold/10 text-gold-bright" : "border-line text-ink-2 hover:border-line-strong hover:text-ink-1"
  }`;

type CardProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  image: string | null;
  category: string | null;
  sellerName: string | null;
  priceThc: bigint | null;
  priceFiatCents: number | null;
  fiatCurrency: string;
  inventory: number | null;
  variants: { inventory: number }[];
};

/** Units on hand across sizes; null = unlimited. */
export function stockOf(p: { inventory: number | null; variants: { inventory: number }[] }) {
  return p.variants.length ? p.variants.reduce((t, v) => t + v.inventory, 0) : p.inventory;
}

export function ProductCard({ p, href, saved }: { p: CardProduct; href: string; saved: boolean }) {
  const stock = stockOf(p);
  const inr_ = p.fiatCurrency === "INR" ? p.priceFiatCents : null;
  const time = p.kind === "PHYSICAL" && p.priceThc != null ? priceInTime(p.priceThc) : null;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-bg-1 transition-colors duration-[var(--dur-2)] hover:border-line-strong">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-[radial-gradient(ellipse_at_50%_60%,var(--color-bg-3),var(--color-bg-1)_70%)]">
        {p.image ? (
          /* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL; next/image cannot allowlist it ahead of time */
          <img src={p.image} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center" aria-hidden>
            <div className="flex size-20 items-center justify-center rounded-full border border-line-strong bg-bg-1/80">
              {p.kind === "PHYSICAL" ? <CoinMark size={44} /> : <Icon name={kindIcon[p.kind] ?? "store"} size={30} className="text-gold" />}
            </div>
          </div>
        )}
        <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge>{categoryLabel(p.category) ?? KIND_LABEL[p.kind]}</Badge>
          {stock === 0 && <Badge tone="danger">Sold out</Badge>}
          {saved && <Badge tone="gold">Saved</Badge>}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="text-[16px] font-semibold tracking-[-0.01em]">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.name}
          </Link>
        </h3>
        <p className="line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-ink-2">{p.description}</p>
        {p.sellerName && <p className="text-[12px] text-ink-3">Sold by {p.sellerName}</p>}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-3">
          {p.priceThc != null && <ThcAmount amount={p.priceThc} size="sm" />}
          {p.priceThc != null && inr_ != null && <span className="text-[12px] text-ink-3">or</span>}
          {inr_ != null && <span className="figures text-[14px] text-ink-1">{inr(inr_)}</span>}
          {p.priceThc == null && inr_ == null && <span className="text-[12px] text-ink-3">Not priced yet</span>}
          {stock != null && stock > 0 && (
            <span className={`ml-auto text-[12px] tabular-nums ${stock <= 3 ? "text-gold-bright" : "text-ink-3"}`}>{stock} left</span>
          )}
        </div>
        {time && (
          <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <Icon name="clock" size={12} /> {time.summary}
          </p>
        )}
      </div>
    </article>
  );
}
