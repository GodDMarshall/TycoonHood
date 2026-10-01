/**
 * The store's shelves — shared by the public /marketplace (guests) and the
 * member app's /store, so the two can never disagree about a price or a
 * stock count. Server component.
 */
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { priceInTime } from "@tycoonhood/core";
import { Badge, CoinMark, EmptyState, Icon, ThcAmount, type IconName } from "@tycoonhood/ui";
import { activeFiatProvider } from "../../lib/payments";
import { buyWithThcAction, buyWithCardAction } from "../../app/(public)/marketplace/actions";
import { BuyPanel } from "../buy-panel";

const kindLabel = { DIGITAL: "Digital", PHYSICAL: "Gear", COURSE: "Program access", MEMBERSHIP: "Membership" } as const;
const fiat = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export async function ProductShelves({ user }: { user: { id: string } | null }) {
  const fiatProvider = activeFiatProvider();
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  const gear = products.filter((p) => p.kind === "PHYSICAL");
  const rest = products.filter((p) => p.kind !== "PHYSICAL");

  if (products.length === 0) {
    return (
      <EmptyState
        icon="store"
        title="Nothing is listed yet"
        body="Gear goes live only once its real landed cost is on the books, so every price is honest the day it appears."
      />
    );
  }
  return (
    <div className="flex flex-col gap-12">
      {gear.length > 0 && (
        <section aria-labelledby="gear">
          <h2 id="gear" className="mb-4 text-[16px] font-semibold">
            Gear
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {gear.map((p) => (
              <ProductCard key={p.id} p={p} user={user} fiatProvider={fiatProvider} />
            ))}
          </div>
        </section>
      )}
      {rest.length > 0 && (
        <section aria-labelledby="library">
          <h2 id="library" className="mb-4 text-[16px] font-semibold">
            Library and access
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((p) => (
              <ProductCard key={p.id} p={p} user={user} fiatProvider={fiatProvider} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const kindIcon: Record<string, IconName> = { DIGITAL: "book", PHYSICAL: "orders", COURSE: "academy", MEMBERSHIP: "seal" };

type ProductRow = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  variants: { id: string; label: string; inventory: number; priceThc: bigint | null; active: boolean }[];
};

export function ProductCard({
  p,
  user,
  fiatProvider,
}: {
  p: ProductRow;
  user: { id: string } | null;
  fiatProvider: { name: string } | null;
}) {
  const physical = p.kind === "PHYSICAL";
  const inStock = p.variants.length
    ? p.variants.reduce((t, v) => t + v.inventory, 0)
    : p.inventory;
  const time = physical && p.priceThc != null ? priceInTime(p.priceThc) : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-bg-1 transition-colors duration-[var(--dur-3)] hover:border-line-strong">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-[radial-gradient(ellipse_at_50%_60%,var(--color-bg-3),var(--color-bg-1)_70%)]">
        {p.image ? (
          /* eslint-disable-next-line @next/next/no-img-element -- the image URL is
             typed by an admin and can point anywhere, so next/image cannot
             allowlist it ahead of time. */
          <img src={p.image} alt="" className="size-full object-cover" />
        ) : (
          // No photograph yet: a plain plate with the item's kind, not a stock image.
          <div className="flex size-full items-center justify-center" aria-hidden>
            <div className="flex size-24 items-center justify-center rounded-full border border-line-strong bg-bg-1/80">
              {p.kind === "PHYSICAL" ? <CoinMark size={52} /> : <Icon name={kindIcon[p.kind] ?? "store"} size={36} className="text-gold" />}
            </div>
          </div>
        )}
        <span className="absolute left-4 top-4 flex gap-2">
          <Badge>{kindLabel[p.kind]}</Badge>
          {inStock === 0 && <Badge tone="danger">Sold out</Badge>}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{p.name}</h3>
        <p className="flex-1 text-[14px] leading-relaxed text-ink-2">{p.description}</p>

        <div className="flex items-baseline gap-3 border-t border-line pt-3">
          {p.priceThc != null && <ThcAmount amount={p.priceThc} size="sm" />}
          {p.priceThc != null && p.priceFiatCents != null && <span className="text-[12px] text-ink-3">or</span>}
          {p.priceFiatCents != null && (
            <span className="figures text-[14px] text-ink-1">{fiat(p.priceFiatCents)}</span>
          )}
          {inStock != null && inStock > 0 && (
            <span className="ml-auto text-[12px] tabular-nums text-ink-3">{inStock} left</span>
          )}
        </div>

        {/* The honest translation: what this price costs in someone's time. */}
        {time && (
          <p className="-mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <Icon name="clock" size={12} /> {time.summary}
          </p>
        )}

        {user ? (
          <BuyPanel
            physical={physical}
            variants={p.variants.map((v) => ({
              id: v.id,
              label: v.label,
              inventory: v.inventory,
              priceThc: v.priceThc?.toString() ?? null,
            }))}
            basePriceThc={p.priceThc?.toString() ?? null}
            hasThc={p.priceThc != null}
            hasFiat={p.priceFiatCents != null && !!fiatProvider}
            thcAction={p.priceThc != null ? buyWithThcAction.bind(null, p.slug) : undefined}
            cardAction={p.priceFiatCents != null && fiatProvider ? buyWithCardAction.bind(null, p.slug) : undefined}
            fiatLabel={fiatProvider?.name === "dev" ? "Buy with card (dev)" : "Buy with card"}
            devPayments={fiatProvider?.name === "dev"}
          />
        ) : (
          <p className="border-t border-line pt-3 text-[13px] text-ink-3">
            <Link href="/login" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
              Sign in
            </Link>{" "}
            to purchase.
          </p>
        )}
      </div>
    </article>
  );
}
