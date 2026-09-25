import type { Metadata } from "next";
import { requireUser } from "../../../lib/guard";
import { challenges } from "@tycoonhood/core";
import { RankBadge, SectionRule } from "@tycoonhood/ui";
import Link from "next/link";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireUser();
  const rows = await challenges.leaderboard(25);
  return (
    <main>
      <p className="eyebrow mb-2">Leaderboard</p>
      <h1 className="display text-[34px]">The standings.</h1>
      <p className="mt-2 max-w-lg text-[13px] text-ink-2">
        Ranked by verified XP. Members who set their level private appear without figures — the choice is theirs.
      </p>
      <SectionRule className="my-8" />
      <div className="flex flex-col">
        {rows.map((r) => (
          <div key={r.username} className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-0">
            <span className="flex items-center gap-4">
              <span className="figures w-7 text-[13px] text-gold-deep">{String(r.position).padStart(2, "0")}</span>
              <Link href={`/u/${r.username}`} className="group">
                <span className="block text-[14px] text-ink-1 group-hover:text-gold-bright">{r.displayName}</span>
                <span className="figures block text-[11px] text-ink-3">@{r.username}</span>
              </Link>
              {r.rankSlug && <RankBadge slug={r.rankSlug} />}
            </span>
            <span className="figures text-[13px] text-ink-2">
              {r.xp != null ? `${r.xp.toLocaleString()} XP · L${r.level}` : "private"}
              {r.streak ? ` · 🔥${r.streak}` : ""}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
