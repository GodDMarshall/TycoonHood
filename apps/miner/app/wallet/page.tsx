import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService, priceInTime } from "@tycoonhood/core";
import { Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { MinerLogin } from "../../components/miner-login";
import { MinerHeader } from "../../components/miner-header";

export const dynamic = "force-dynamic";
const MAIN_SITE = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "http://localhost:3000";
const ledger = new LedgerService();

const REASON_LABEL: Record<string, string> = {
  REWARD_MINING: "Rig claim",
  REWARD_MISSION: "Mission",
  REWARD_CHALLENGE: "Challenge",
  REWARD_ACHIEVEMENT: "Achievement",
  REWARD_ADMIN: "Granted",
  SPEND_PURCHASE: "Purchase",
  TRANSFER: "Transfer",
  REVERSAL: "Reversal",
};

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) return <MinerLogin mainSiteUrl={MAIN_SITE} />;

  const wallet = await ledger.ensureUserAccount(user.id);
  const [balance, entries, reachable] = await Promise.all([
    ledger.getBalance(wallet.id),
    prisma.ledgerEntry.findMany({
      where: { accountId: wallet.id },
      orderBy: { id: "desc" },
      take: 25,
      include: { transaction: true },
    }),
    prisma.product.findMany({
      where: { active: true, priceThc: { not: null } },
      orderBy: { priceThc: "asc" },
      include: { variants: { where: { active: true } } },
    }),
  ]);

  const affordable = reachable.filter((p) => p.priceThc != null && balance >= p.priceThc);
  const next = reachable.find((p) => p.priceThc != null && balance < p.priceThc);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-24 pt-8">
      <MinerHeader name={user.profile?.displayName ?? user.name ?? "Miner"} />

      <p className="eyebrow mb-2">Wallet</p>
      <ThcAmount amount={balance} size="lg" />
      <p className="mt-1 text-[12px] text-ink-3">
        Internal utility credits. Not money, not redeemable for money.
      </p>

      {/* What it actually buys — the whole point of mining. */}
      <SectionRule label="What this reaches" className="mb-4 mt-8" />
      {reachable.length === 0 ? (
        <p className="text-[13px] text-ink-3">Nothing is priced in THC yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {affordable.length > 0 && (
            <Card variant="gold">
              <CardContent className="py-4">
                <p className="text-[13px] text-ink-1">
                  You can buy{" "}
                  <span className="text-gold-bright">
                    {affordable.length === 1 ? affordable[0].name : `${affordable.length} things`}
                  </span>{" "}
                  right now.
                </p>
                <Link href={`${MAIN_SITE}/marketplace`} className="mt-1 inline-block text-[12px] text-gold-bright underline">
                  Open the marketplace
                </Link>
              </CardContent>
            </Card>
          )}
          {next?.priceThc != null && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] text-ink-1">{next.name}</p>
                  <span className="figures text-[12px] text-ink-2">{next.priceThc.toLocaleString("en-US")} THC</span>
                </div>
                <p className="mt-1 text-[12px] text-ink-3">
                  {(next.priceThc - balance).toLocaleString("en-US")} THC to go —{" "}
                  {priceInTime(next.priceThc - balance).summary.replace(/\.$/, "")} from here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <SectionRule label="Every movement" className="mb-4 mt-8" />
      {entries.length === 0 ? (
        <p className="text-[13px] text-ink-3">Nothing yet. Claim your rig to start.</p>
      ) : (
        <div className="flex flex-col">
          {entries.map((e) => (
            <div key={e.id} className="flex items-baseline justify-between border-b border-line py-2.5 last:border-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-ink-1">
                  {e.transaction.memo || REASON_LABEL[e.transaction.reason] || e.transaction.reason}
                </span>
                <span className="text-[11px] text-ink-3">
                  {e.transaction.createdAt.toISOString().slice(0, 10)}
                </span>
              </span>
              <span className={`figures ml-3 text-[13px] ${e.amount >= 0n ? "text-success" : "text-ink-2"}`}>
                {e.amount >= 0n ? "+" : ""}
                {e.amount.toLocaleString("en-US")}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-[11px] leading-relaxed text-ink-3">
        Every line above is one half of a balanced transaction. The books sum to
        zero, always — that is what makes the supply provable.
      </p>
    </main>
  );
}
