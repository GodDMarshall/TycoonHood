import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { priceInTime } from "@tycoonhood/core";
import { Badge, CoinMark, EmptyState, Icon, ThcAmount, type IconName } from "@tycoonhood/ui";
import { RoomHeader } from "../../../components/room-header";
import { getCurrentUser } from "../../../lib/auth";
import { activeFiatProvider } from "../../../lib/payments";
import { buyWithThcAction, buyWithCardAction } from "./actions";
import { BuyPanel } from "../../../components/buy-panel";

export const metadata: Metadata = {
  title: "The Vault — gear and library",
  description: "Program access, working tools and gear, priced in THC earned by doing — and translated into the months of work each price represents.",
  alternates: { canonical: "/marketplace" },
};
export const dynamic = "force-dynamic";

const kindLabel = { DIGITAL: "Digital", PHYSICAL: "Gear", COURSE: "Program access", MEMBERSHIP: "Membership" } as const;
const fiat = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  const fiatProvider = activeFiatProvider();
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });

  const gear = products.filter((p) => p.kind === "PHYSICAL");
  const rest = products.filter((p) => p.kind !== "PHYSICAL");

  return (
    <main>
      <RoomHeader
        icon="vault"
        room="The Vault"
        title="Spend it on"
        accent="something real."
        lead="Program access, working tools and gear — priced in THC you earned, in currency, or both. Gear is made in small runs: every size has a real count behind it, and nothing is oversold."
        aside={
          <div className="flex items-start gap-4 rounded-lg border border-line bg-bg-1/80 p-5">
            <Icon name="clock" size={20} className="mt-0.5 text-gold" />
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Every gear price is also shown as <span className="text-ink-1">time</span> — how long a member mining steadily takes to earn it. The house rule: two to three months per item.
            </p>
          </div>
        }
      />

      <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-14">
        {gear.length > 0 && (
          <section aria-labelledby="gear" className="mb-16">
            <h2 id="gear" className="eyebrow mb-6">
              Gear
            </h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {gear.map((p) => (
                <ProductCard key={p.id} p={p} user={user} fiatProvider={fiatProvider} />
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section aria-labelledby="library">
            <h2 id="library" className="eyebrow mb-6">
              {gear.length ? "Library and access" : "At launch"}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {rest.map((p) => (
                <ProductCard key={p.id} p={p} user={user} fiatProvider={fiatProvider} />
              ))}
            </div>
          </section>
        )}

        {products.length === 0 && (
          <EmptyState
            icon="vault"
            title="The Vault is being stocked"
            body="Nothing is listed yet. Gear goes live only once its real landed cost is on the books, so every price is honest the day it appears."
          />
        )}
      </div>
    </main>
  );
}

const kindIcon: Record<string, IconName> = { DIGITAL: "book", PHYSICAL: "orders", COURSE: "academy", MEMBERSHIP: "seal" };

type ProductRow = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  variants: { id: string; label: string; inventory: number; priceThc: bigint | null; active: boolean }[];
};

function ProductCard({
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
          // No photograph yet: a vault plate, not a stock image.
          <div className="grid-plane flex size-full items-center justify-center" aria-hidden>
            <div className="frame-ticks flex size-28 items-center justify-center rounded-md border border-line-strong bg-bg-1/80">
              {p.kind === "PHYSICAL" ? <CoinMark size={58} /> : <Icon name={kindIcon[p.kind] ?? "vault"} size={40} className="text-gold" />}
            </div>
          </div>
        )}
        <span className="absolute left-4 top-4 flex gap-2">
          <Badge>{kindLabel[p.kind]}</Badge>
          {inStock === 0 && <Badge tone="danger">Sold out</Badge>}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="display text-[20px]">{p.name}</h3>
        <p className="flex-1 text-[13px] leading-relaxed text-ink-2">{p.description}</p>

        <div className="flex items-baseline gap-3 border-t border-line pt-3">
          {p.priceThc != null && <ThcAmount amount={p.priceThc} size="sm" />}
          {p.priceThc != null && p.priceFiatCents != null && <span className="text-[12px] text-ink-3">or</span>}
          {p.priceFiatCents != null && (
            <span className="figures text-[14px] text-ink-1">{fiat(p.priceFiatCents)}</span>
          )}
          {inStock != null && inStock > 0 && (
            <span className="figures ml-auto text-[11px] text-ink-3">{inStock} left</span>
          )}
        </div>

        {/* The honest translation: what this price costs in someone's time. */}
        {time && (
          <p className="-mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
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
          <p className="border-t border-line pt-3 text-[12.5px] text-ink-3">
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
