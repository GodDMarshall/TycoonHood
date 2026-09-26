import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { CoinMark, Icon, ThcAmount, cn } from "@tycoonhood/ui";
import { RoomHeader } from "../../../components/room-header";

export const metadata: Metadata = {
  title: "The Treasury — how THC works",
  description:
    "THC is Tycoonhood's internal utility credit: one quadrillion minted once, every movement double-entry, earned by verified work and spent on things that exist. Not money, not an investment, not redeemable.",
  alternates: { canonical: "/thc" },
};
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);
const fmt = (n: bigint | number) => n.toLocaleString("en-US");

const principles = [
  ["Fixed supply", "One quadrillion THC minted in one genesis transaction. Nothing mints after it — the mint account's negative balance is the permanent proof."],
  ["Double-entry, always", "THC moves only through transactions whose entries sum to zero, enforced by the application and by the database itself. Balances are derived truth, not editable numbers."],
  ["Earned by doing", "Missions, challenges and achievements pay from a finite rewards pool; the Miner distributes from its own ring-fenced pool. Verified work is the only faucet."],
  ["Corrections in the open", "Nothing is deleted or edited. Mistakes are reversed with visible compensating transactions that point at the original."],
] as const;

export default async function ThcPage() {
  const [accounts, circulating, missions, challenges] = await Promise.all([
    prisma.ledgerAccount.findMany({ where: { type: { in: ["SYSTEM_MINT", "TREASURY", "REWARDS_POOL", "MINING_POOL", "REVENUE"] } } }),
    ledger.circulatingSupply(),
    prisma.mission.findMany({ where: { active: true, thcReward: { gt: 0 } }, orderBy: { thcReward: "asc" } }),
    prisma.challenge.findMany({
      where: { lifecycle: { in: ["UPCOMING", "ACTIVE"] }, thcReward: { gt: 0 } },
      orderBy: { thcReward: "asc" },
    }),
  ]);
  const bal = (t: string) => accounts.find((a) => a.type === t)?.balance ?? 0n;
  const supply = -bal("SYSTEM_MINT");

  const flow: { key: string; label: string; note: string; amount: bigint; tone?: "gold" }[] = [
    { key: "mint", label: "Genesis", note: "Minted once. Never again.", amount: supply, tone: "gold" },
    { key: "treasury", label: "Treasury", note: "Held by the house.", amount: bal("TREASURY") },
    { key: "rewards", label: "Rewards pool", note: "Pays missions, challenges, achievements.", amount: bal("REWARDS_POOL") },
    { key: "mining", label: "Mining pool", note: "Distributed by the Miner — not minted.", amount: bal("MINING_POOL") },
    { key: "members", label: "Member hands", note: "Earned by verified work.", amount: circulating, tone: "gold" },
    { key: "revenue", label: "Revenue", note: "THC spent in the Vault lands here.", amount: bal("REVENUE") },
  ];

  const earn = [
    ...missions.map((m) => ({ label: m.name, note: m.repeatable ? "Mission · repeatable" : "Mission · once", amount: m.thcReward })),
    ...challenges.map((c) => ({ label: c.name, note: "Challenge", amount: c.thcReward })),
  ];

  return (
    <main>
      <RoomHeader
        icon="treasury"
        room="The Treasury"
        title="One quadrillion."
        accent="Minted once."
        lead="THC is the internal credit of Tycoonhood: earned through verified work, spent on programs, tools and goods inside the house. It is not a cryptocurrency, not an investment and not redeemable for money — and the whole system is built so you never have to take our word for any of it."
        aside={
          <div className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center">
            <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(207_169_94/0.2),transparent)]" />
            <CoinMark size={200} className="relative" />
          </div>
        }
      />

      <div className="mx-auto max-w-[88rem] px-[var(--gutter)]">
        {/* ── The flow, live ── */}
        <section aria-labelledby="books" className="py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="books" className="eyebrow flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success" aria-hidden /> The open books — live
            </h2>
            <Link href="/status" className="text-[13px] text-gold underline-offset-4 hover:underline">
              Every figure, audited
            </Link>
          </div>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {flow.map((f, i) => (
              <li key={f.key} className={cn("relative flex flex-col gap-2 bg-bg-1 p-5", f.tone === "gold" && "bg-[linear-gradient(180deg,rgb(207_169_94/0.07),transparent),var(--color-bg-1)]")}>
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{f.label}</span>
                  <span className="index">{String(i + 1).padStart(2, "0")}</span>
                </span>
                <span className="figures break-all text-[15px] text-ink-1">{fmt(f.amount)}</span>
                <span className="text-[12px] leading-snug text-ink-3">{f.note}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[12px] text-ink-3">Read straight from the double-entry ledger on every request. Even the house is on it.</p>
        </section>

        {/* ── Principles ── */}
        <section aria-labelledby="principles" className="border-t border-line py-16">
          <h2 id="principles" className="eyebrow mb-8">
            Principles
          </h2>
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            {principles.map(([title, body], i) => (
              <div key={title} data-reveal className="grid grid-cols-[auto_1fr] gap-5">
                <span className="figures pt-1 text-[12px] text-gold">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="display text-[21px]">{title}</h3>
                  <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-2">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Earn & spend ── */}
        <section aria-labelledby="earn" className="grid gap-6 border-t border-line py-16 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-bg-1 p-6">
            <h2 id="earn" className="display text-[21px]">
              How THC is earned
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">Every reward currently live, straight from the mission and challenge catalogue.</p>
            <ul className="mt-5 flex flex-col">
              {earn.map((e) => (
                <li key={e.label} className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-0">
                  <span>
                    <span className="block text-[14px] text-ink-1">{e.label}</span>
                    <span className="block font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">{e.note}</span>
                  </span>
                  <ThcAmount amount={e.amount} signed size="sm" />
                </li>
              ))}
              {earn.length === 0 && <li className="py-3 text-[13.5px] text-ink-3">No THC-paying mission is live right now.</li>}
            </ul>
          </div>
          <div className="flex flex-col gap-6 rounded-lg border border-line bg-bg-1 p-6">
            <div>
              <h2 className="display text-[21px]">What THC unlocks</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
                Program access, digital tools and gear in the Vault. Gear is priced in months of steady work — the
                house rule is two to three months per item — so a price means something before you pay it.
              </p>
            </div>
            <Link href="/marketplace" className="mt-auto flex items-center justify-between rounded-md border border-line-strong p-4 transition-colors hover:border-gold-deep">
              <span className="flex items-center gap-3 text-[14px]">
                <Icon name="vault" size={18} className="text-gold" /> Open the Vault
              </span>
              <Icon name="arrow-right" size={16} className="text-ink-3" />
            </Link>
          </div>
        </section>

        {/* ── Disclosure ── */}
        <section id="disclosure" aria-labelledby="disclosure-title" className="scroll-mt-24 border-t border-line py-16">
          <div className="grid gap-6 rounded-lg border border-line-strong bg-bg-2 p-6 md:grid-cols-[auto_1fr] md:p-8">
            <Icon name="shield" size={28} className="text-gold" />
            <div>
              <h2 id="disclosure-title" className="display text-[21px]">
                The plain-language disclosure
              </h2>
              <p className="mt-3 max-w-[72ch] text-[14.5px] leading-relaxed text-ink-2">
                THC are internal utility credits. They are not money, not securities, not crypto-assets, and carry no
                promise of future value. They cannot be withdrawn, exchanged, transferred between members or redeemed
                for currency. If THC ever moves on-chain, it will be after the utility is proven and legal review is
                complete — in that order, and not before.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
