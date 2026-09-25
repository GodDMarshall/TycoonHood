import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { priceInTime } from "@tycoonhood/core";
import { Badge, Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";
import { activeFiatProvider } from "../../../lib/payments";
import { buyWithThcAction, buyWithCardAction } from "./actions";
import { BuyPanel } from "../../../components/buy-panel";

export const metadata: Metadata = { title: "Marketplace" };
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
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="eyebrow mb-3">Marketplace</p>
      <h1 className="display text-[40px] leading-tight">Spend it on something real.</h1>
      <p className="mt-3 max-w-xl text-ink-2">
        Program access, working tools, and gear — priced in THC, in currency, or
        both. Gear is made in small runs, so every size has a real count behind
        it and nothing is oversold.
      </p>

      {gear.length > 0 && (
        <>
          <SectionRule label="Gear" className="mb-6 mt-12" />
          <div className="grid gap-4 md:grid-cols-3">
            {gear.map((p) => <ProductCard key={p.id} p={p} user={user} fiatProvider={fiatProvider} />)}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <SectionRule label={gear.length ? "Everything else" : "At launch"} className="mb-6 mt-12" />
          <div className="grid gap-4 md:grid-cols-3">
            {rest.map((p) => <ProductCard key={p.id} p={p} user={user} fiatProvider={fiatProvider} />)}
          </div>
        </>
      )}

      {products.length === 0 && (
        <div className="mt-12 rounded-md border border-dashed border-line px-6 py-12 text-center">
          <p className="text-[15px] text-ink-2">Nothing is on sale yet.</p>
          <p className="mt-1 text-[13px] text-ink-3">The first drop lands here.</p>
        </div>
      )}
    </main>
  );
}

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
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 py-5">
        <div className="flex items-center justify-between">
          <Badge>{kindLabel[p.kind]}</Badge>
          {inStock === 0 && <Badge tone="neutral">Sold out</Badge>}
        </div>

        {p.image && (
          /* eslint-disable-next-line @next/next/no-img-element -- the image URL is
             typed by an admin and can point anywhere, so next/image cannot
             allowlist it ahead of time. */
          <img src={p.image} alt="" className="aspect-square w-full rounded-md border border-line object-cover" />
        )}

        <h2 className="display text-[19px]">{p.name}</h2>
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
          <p className="-mt-1 text-[11px] text-ink-3">{time.summary}</p>
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
          <p className="border-t border-line pt-3 text-[12px] text-ink-3">
            <Link href="/login" className="text-gold underline-offset-4 hover:underline">Sign in</Link> to purchase.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
