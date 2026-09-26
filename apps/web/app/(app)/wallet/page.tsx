import type { Metadata } from "next";
import { RoomHeader } from "../../../components/room-header";
import { requireUser } from "../../../lib/guard";
import { LedgerService } from "@tycoonhood/core";
import { prisma } from "@tycoonhood/db";
import { Card, CardContent, Icon, SectionRule, Stat, ThcAmount } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";

export const metadata: Metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";
const ledger = new LedgerService(prisma);
const dt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const reasonLabel: Record<string, string> = {
  REWARD_MISSION: "Mission reward",
  REWARD_CHALLENGE: "Challenge reward",
  REWARD_ACHIEVEMENT: "Achievement reward",
  REWARD_MINING: "Miner claim",
  REWARD_ADMIN: "Grant",
  PURCHASE: "Purchase",
  REFUND: "Refund",
  ADJUSTMENT: "Adjustment",
  TRANSFER: "Transfer",
};

export default async function WalletPage() {
  await requireUser();
  const user = (await getCurrentUser())!;
  const { account, entries } = await ledger.history(user.id, 100);
  const audit = await ledger.auditAccount(account.id);

  return (
    <main>
      <RoomHeader
        compact
        icon="wallet"
        room="Wallet"
        title="Your ledger,"
        accent="audited live."
        lead="Every THC you hold is the sum of real entries. The balance below is recomputed from all of them on every visit."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="gold">
          <CardContent className="py-5">
            <Stat label="Balance" value={<ThcAmount amount={account.balance} size="lg" />} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <Stat
              label="Audit"
              value={
                <span className={`figures flex items-center gap-2 text-[15px] ${audit.consistent ? "text-success" : "text-danger"}`}>
                  <Icon name={audit.consistent ? "check" : "alert"} size={16} />
                  {audit.consistent ? "cache = Σ entries" : "INCONSISTENT"}
                </span>
              }
            />
            <p className="mt-1 text-[11px] text-ink-3">Your cached balance, recomputed from every entry, live.</p>
          </CardContent>
        </Card>
      </div>

      <SectionRule label="Entries" className="mb-4 mt-10" />
      <Card>
        <CardContent className="flex flex-col py-2">
          {entries.length === 0 ? (
            <p className="py-4 text-[14px] text-ink-3">No movements yet. Complete a mission or fire up the Miner.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink-1">
                    {reasonLabel[e.transaction.reason] ?? e.transaction.reason}
                    {e.transaction.memo ? ` — ${e.transaction.memo}` : ""}
                  </span>
                  <span className="figures block text-[11px] text-ink-3">{dt.format(e.transaction.createdAt)}</span>
                </span>
                <ThcAmount amount={e.amount} signed={e.amount > 0n} size="sm" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
