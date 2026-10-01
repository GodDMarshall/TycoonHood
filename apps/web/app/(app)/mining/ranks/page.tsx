/**
 * RANKS — ported from apps/miner/app/ranks/page.tsx.
 *
 * The board is mining.stats().top; your position is computed, not guessed:
 * one plus the number of rigs that have mined strictly more than yours.
 */
import type { Metadata } from "next";
import { prisma } from "@tycoonhood/db";
import { mining } from "@tycoonhood/core";
import { Badge, EmptyState, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { PageHeader, Panel, SectionTitle } from "../../../../components/app/page";

export const metadata: Metadata = { title: "Mining ranks" };
export const dynamic = "force-dynamic";

const fmt = (n: bigint) => n.toLocaleString("en-US");

export default async function MiningRanksPage() {
  const user = await requireUser();

  const [stats, mine] = await Promise.all([mining.stats(), prisma.minerState.findUnique({ where: { userId: user.id } })]);

  const ahead = mine ? await prisma.minerState.count({ where: { totalMined: { gt: mine.totalMined } } }) : null;
  const myPosition = ahead == null ? null : ahead + 1;
  const inTopTen = stats.top.some((t) => t.username === user.profile?.username);

  return (
    <>
      <PageHeader
        kicker="Ranks"
        title="The books are open."
        description="Every figure here is read from the ledger, not from a cache. Anyone can check the supply against the mint at any time."
      />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Pool left", value: fmt(stats.poolRemaining) },
          { label: "Miners", value: stats.miners.toLocaleString("en-US") },
          { label: "Mined total", value: fmt(stats.totalMined) },
        ].map((t) => (
          <Panel key={t.label} as="div" className="min-w-0 px-4 py-3.5">
            <p className="text-[12px] font-medium text-ink-3">{t.label}</p>
            <p className="mt-1.5 truncate text-[17px] font-semibold tabular-nums text-ink-1">{t.value}</p>
          </Panel>
        ))}
      </div>

      {myPosition != null && (
        <div className="mt-4 rounded-xl border border-gold-deep/60 bg-bg-1 px-5 py-4 shadow-[var(--shadow-gold)]">
          <p className="text-[14px] text-ink-1">
            You are <span className="font-semibold tabular-nums text-gold-bright">#{myPosition}</span> of{" "}
            <span className="tabular-nums">{stats.miners.toLocaleString("en-US")}</span> rigs.
          </p>
          {mine && (
            <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-3">
              {fmt(mine.totalMined)} mined · Rig L{mine.rigLevel}
            </p>
          )}
        </div>
      )}

      <section aria-labelledby="top-rigs" className="mt-8 max-w-[760px] min-w-0">
        <SectionTitle id="top-rigs">Top rigs</SectionTitle>
        {stats.top.length === 0 ? (
          <EmptyState icon="leaderboard" title="Nobody has mined yet." body="Be the first." />
        ) : (
          <Panel as="ol" className="px-4">
            {stats.top.map((t) => {
              const isMe = t.username === user.profile?.username;
              return (
                <li
                  key={t.username}
                  className={cn(
                    "flex items-center justify-between gap-3 border-b border-line py-3 last:border-0",
                    isMe && "-mx-2 rounded-md bg-gold/[0.06] px-2"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3 text-[14px]">
                    <span className="w-6 shrink-0 text-[12px] tabular-nums text-gold-deep">{String(t.position).padStart(2, "0")}</span>
                    <span className={cn("min-w-0 truncate", isMe ? "text-gold-bright" : "text-ink-1")}>{t.displayName}</span>
                    <Badge className="shrink-0">L{t.rigLevel}</Badge>
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-ink-2">{fmt(t.totalMined)}</span>
                </li>
              );
            })}
          </Panel>
        )}

        {!inTopTen && myPosition != null && myPosition > 10 && (
          <p className="mt-4 text-[12.5px] text-ink-3">{(myPosition - 10).toLocaleString("en-US")} places from the board.</p>
        )}
      </section>
    </>
  );
}
