/**
 * THE OPEN BOOKS. Every figure on this page is a live database query made
 * on this request — no cached marketing numbers, no hand-typed claims.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { Icon } from "@tycoonhood/ui";
import { RoomHeader } from "../../../components/room-header";

export const metadata: Metadata = {
  title: "The open books",
  description: "Tycoonhood's live figures: supply, every system account, members, missions paid, lessons completed and certificates issued — straight from the ledger.",
  alternates: { canonical: "/status" },
};
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);
const fmt = (n: bigint | number) => n.toLocaleString("en-US");

export default async function OpenBooks() {
  const [accounts, circulating, members, missionsPaid, lessonsDone, certificates, programs, ordersShipped, txCount] = await Promise.all([
    prisma.ledgerAccount.findMany({ where: { type: { not: "USER" } }, orderBy: { type: "asc" } }),
    ledger.circulatingSupply(),
    prisma.user.count(),
    prisma.missionCompletion.count(),
    prisma.lessonProgress.count({ where: { completedAt: { not: null } } }),
    prisma.certificate.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.order.count({ where: { status: "FULFILLED" } }),
    prisma.ledgerTransaction.count(),
  ]);
  const describe: Record<string, string> = {
    SYSTEM_MINT: "Genesis counter-account. Its negative balance is the proof of total supply.",
    TREASURY: "Held by the house.",
    REWARDS_POOL: "Finite pool that pays missions, challenges and achievements.",
    MINING_POOL: "Ring-fenced budget the Miner distributes from. Distribution, not minting.",
    REVENUE: "Receives THC spent on Tycoonhood products.",
    ESCROW: "Holds THC in flight between two sides of a transaction.",
  };
  const activity: [string, number][] = [
    ["Members", members],
    ["Programs published", programs],
    ["Missions paid", missionsPaid],
    ["Lessons completed", lessonsDone],
    ["Certificates issued", certificates],
    ["Orders shipped", ordersShipped],
    ["Ledger transactions", txCount],
  ];

  return (
    <main>
      <RoomHeader
        icon="treasury"
        room="Open books"
        title="Every figure,"
        accent="a database fact."
        lead="Queried live on this request. If a number here is wrong, the ledger is wrong — and the ledger is double-entry, enforced by the database itself."
      />
      <div className="mx-auto grid max-w-[88rem] gap-8 px-[var(--gutter)] py-16 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="accounts">
          <h2 id="accounts" className="eyebrow mb-5">
            System accounts
          </h2>
          <ul className="overflow-hidden rounded-lg border border-line bg-bg-1">
            {accounts.map((a) => (
              <li key={a.id} className="grid gap-2 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">{a.type.replace("_", " ")}</p>
                  <p className="mt-1 text-[13px] text-ink-3">{describe[a.type] ?? ""}</p>
                </div>
                <p className="figures break-all text-[15px] sm:text-right">{fmt(a.balance)}</p>
              </li>
            ))}
            <li className="grid gap-2 bg-bg-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-bright">Member hands</p>
                <p className="mt-1 text-[13px] text-ink-3">The sum of every member wallet.</p>
              </div>
              <p className="figures text-[15px] sm:text-right">{fmt(circulating)}</p>
            </li>
          </ul>
        </section>
        <section aria-labelledby="activity">
          <h2 id="activity" className="eyebrow mb-5">
            Activity
          </h2>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
            {activity.map(([k, v]) => (
              <div key={k} className="bg-bg-1 p-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">{k}</dt>
                <dd className="figures mt-2 text-[22px]">{fmt(v)}</dd>
              </div>
            ))}
          </dl>
          <Link href="/thc" className="mt-6 flex items-center justify-between rounded-md border border-line-strong p-4 text-[14px] transition-colors hover:border-gold-deep">
            How the economy works <Icon name="arrow-right" size={16} className="text-ink-3" />
          </Link>
        </section>
      </div>
    </main>
  );
}
