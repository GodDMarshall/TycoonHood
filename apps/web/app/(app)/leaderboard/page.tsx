/**
 * LEADERBOARD — XP from verified work, this week and all time.
 * XP comes from lessons, quizzes, programmes, missions and achievements; chat
 * and discussions write none, so the board cannot be talked up.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { leaderboard, type LeaderboardPeriod } from "@tycoonhood/core";
import { Avatar, EmptyState, Notice, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader, Panel } from "../../../components/app/page";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const period: LeaderboardPeriod = sp.period === "all" ? "all" : "week";
  const board = await leaderboard.board(user.id, period);
  const meInTop = board.rows.some((r) => r.me);

  return (
    <Page width="narrow">
      <PageHeader
        title="Leaderboard"
        description="XP earned from verified work: lessons, quizzes, programmes, missions and achievements. Posting and chatting earn none."
      />

      <nav aria-label="Period" className="mb-5 flex w-fit gap-1 rounded-md border border-line bg-bg-1 p-1">
        {(
          [
            ["week", "This week"],
            ["all", "All time"],
          ] as const
        ).map(([k, label]) => (
          <Link
            key={k}
            href={k === "week" ? "/leaderboard" : "/leaderboard?period=all"}
            aria-current={period === k ? "page" : undefined}
            className={cn(
              "flex h-8 items-center rounded-[6px] px-4 text-[13.5px] font-medium transition-colors",
              period === k ? "bg-bg-3 text-ink-1" : "text-ink-2 hover:bg-bg-2 hover:text-ink-1"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {board.since && <p className="mb-4 text-[13px] text-ink-3">Since {dayFmt.format(new Date(board.since))}, 00:00 UTC. Resets every Monday.</p>}

      {board.viewer.hidden ? (
        <Notice tone="info" title="You are hidden from the leaderboard." className="mb-5">
          You earned <span className="tabular-nums">{board.viewer.xp.toLocaleString("en-US")}</span> XP {period === "week" ? "this week" : "in total"}. Other members cannot see you here.{" "}
          <Link href="/settings" className="text-gold underline">
            Change this in Settings
          </Link>
          .
        </Notice>
      ) : (
        !meInTop && (
          <Panel className="mb-5 flex items-center justify-between gap-3 px-5 py-4">
            <span className="text-[14px] text-ink-2">Your position</span>
            <span className="text-[14px] tabular-nums text-ink-1">
              {board.viewer.position ? `#${board.viewer.position} · ${board.viewer.xp.toLocaleString("en-US")} XP` : period === "week" ? "No XP yet this week" : "No XP yet"}
            </span>
          </Panel>
        )
      )}

      {board.rows.length === 0 ? (
        <EmptyState icon="leaderboard" title={period === "week" ? "No XP earned this week yet." : "No XP earned yet."} body="Finish a lesson to put the first name on the board." />
      ) : (
        <Panel as="ol" className="divide-y divide-line">
          {board.rows.map((r) => (
            <li key={r.userId} className={cn("flex items-center gap-3 px-4 py-3 sm:px-5", r.me && "bg-gold/[0.05]")}>
              <span className={cn("w-8 shrink-0 text-right text-[14px] font-semibold tabular-nums", r.position <= 3 ? "text-gold" : "text-ink-3")}>{r.position}</span>
              <Avatar name={r.name} src={r.avatarUrl} size={32} />
              <span className="min-w-0 flex-1">
                {r.username ? (
                  <Link href={`/u/${r.username}`} className="block truncate text-[14.5px] font-medium text-ink-1 hover:underline">
                    {r.name}
                    {r.me && <span className="text-ink-3"> (you)</span>}
                  </Link>
                ) : (
                  <span className="block truncate text-[14.5px] font-medium text-ink-1">{r.name}</span>
                )}
                {r.rank && <span className="block truncate text-[12.5px] text-ink-3">{r.rank}</span>}
              </span>
              <span className="shrink-0 text-[14px] tabular-nums text-ink-1">{r.xp.toLocaleString("en-US")} XP</span>
            </li>
          ))}
        </Panel>
      )}
      <p className="mt-6 text-[12.5px] text-ink-3">Top {board.rows.length > 0 ? Math.min(board.rows.length, 50) : 50} shown. Members who hide their XP or opt out in Settings are left off.</p>
    </Page>
  );
}
