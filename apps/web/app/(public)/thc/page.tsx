import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { Card, CardContent, CoinMark, SectionRule, Stat, ThcAmount } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "THC — the Tycoonhood economy" };
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);

const principles = [
  ["Fixed supply", "1,000,000,000,000,000 THC minted in one genesis transaction. Nothing mints after it — the mint account's negative balance is the permanent proof."],
  ["Double-entry, always", "THC moves only through transactions whose entries sum to zero, enforced by the application and by the database itself. Balances are derived truth, not editable numbers."],
  ["Earned by doing", "Missions, challenges, and achievements pay from a public rewards pool. Verified work is the only faucet."],
  ["Corrections in the open", "Nothing is deleted or edited. Mistakes are reversed with visible compensating transactions that point at the original."],
] as const;

export default async function ThcPage() {
  const [mint, treasury, pool, revenue, circulating] = await Promise.all([
    prisma.ledgerAccount.findFirst({ where: { type: "SYSTEM_MINT" } }),
    prisma.ledgerAccount.findFirst({ where: { type: "TREASURY" } }),
    prisma.ledgerAccount.findFirst({ where: { type: "REWARDS_POOL" } }),
    prisma.ledgerAccount.findFirst({ where: { type: "REVENUE" } }),
    ledger.circulatingSupply(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-start gap-6">
        <CoinMark size={64} className="mt-1 hidden sm:block" />
        <div>
          <p className="eyebrow mb-3">The economy</p>
          <h1 className="display text-[42px] leading-tight">THC. Utility before speculation.</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">
            THC is the internal currency of Tycoonhood: earned through verified
            work, spent on programs, tools, and goods inside the house. It is
            not a cryptocurrency, not an investment, and not redeemable for
            money — and the entire system is built so you never have to take
            our word for anything.
          </p>
        </div>
      </div>

      <SectionRule label="The open books — live" className="mb-6 mt-14" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="gold">
          <CardContent className="py-5">
            <Stat label="Total supply" value={<ThcAmount amount={-(mint?.balance ?? 0n)} />} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <Stat label="Treasury" value={<ThcAmount amount={treasury?.balance ?? 0n} />} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <Stat label="Rewards pool" value={<ThcAmount amount={pool?.balance ?? 0n} />} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <Stat label="In member hands" value={<ThcAmount amount={circulating} />} />
          </CardContent>
        </Card>
      </div>
      <p className="mt-3 text-[12px] text-ink-3">
        Spent THC flows to a revenue account (currently{" "}
        <span className="figures">{(revenue?.balance ?? 0n).toLocaleString("en-US")}</span>) — even the
        house is on the ledger.
      </p>

      <SectionRule label="Principles" className="mb-6 mt-14" />
      <div className="grid gap-4 md:grid-cols-2">
        {principles.map(([title, body]) => (
          <Card key={title}>
            <CardContent className="py-5">
              <h2 className="display text-[18px]">{title}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionRule label="Earn & spend" className="mb-6 mt-14" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-5">
            <h2 className="display mb-3 text-[18px]">How THC is earned</h2>
            <div className="flex flex-col">
              {[
                ["Complete onboarding", 250n],
                ["Daily check-in", 50n],
                ["First lesson", 500n],
                ["Challenges", 2000n],
              ].map(([label, amt]) => (
                <div key={String(label)} className="flex items-baseline justify-between border-b border-line py-2 last:border-0">
                  <span className="text-[13px] text-ink-2">{String(label)}</span>
                  <ThcAmount amount={amt as bigint} signed size="sm" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-ink-3">Sample rewards from the live mission and challenge catalog.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <h2 className="display mb-3 text-[18px]">What THC unlocks</h2>
            <p className="text-[13px] leading-relaxed text-ink-2">
              Program access, digital tools, and marketplace goods — the{" "}
              <Link href="/marketplace" className="text-gold hover:underline underline-offset-4">
                marketplace preview
              </Link>{" "}
              shows THC pricing on real catalog items. Spending opens in Phase 8
              of the{" "}
              <Link href="/roadmap" className="text-gold hover:underline underline-offset-4">
                roadmap
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-14 rounded-lg border border-line bg-bg-1 p-6">
        <h2 className="display text-[18px]">The plain-language disclaimer</h2>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-2">
          THC are internal utility credits. They are not money, not securities,
          not crypto-assets, and carry no promise of future value. They cannot
          be withdrawn, exchanged, or redeemed for currency. If THC ever moves
          on-chain, it will be after the utility is proven and legal review is
          complete — in that order, and not before.
        </p>
      </div>
    </main>
  );
}
