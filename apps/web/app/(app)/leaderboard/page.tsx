import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { challenges } from "@tycoonhood/core";
import { Avatar, EmptyState, Icon, RankBadge, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { RoomHeader } from "../../../components/room-header";
import { RankMap } from "../../../components/network/rank-map";

export const metadata: Metadata = { title: "Network" };
export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const user = await requireUser();
  const [rows, ranks, byRank] = await Promise.all([
    challenges.leaderboard(25),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.groupBy({ by: ["rankId"], where: { role: "MEMBER", profile: { isNot: null } }, _count: { _all: true } }),
  ]);
  const counts = ranks.map((r) => ({
    name: r.name.replace(/^Tycoon\s+/, ""),
    count: byRank.find((g) => g.rankId === r.id)?._count._all ?? 0,
  }));
  const total = counts.reduce((n, c) => n + c.count, 0);
  const youIndex = ranks.findIndex((r) => r.id === user.rank?.id);
  const me = user.profile?.username;

  return (
    <main>
      <RoomHeader
        compact
        icon="network"
        room="The Network"
        title="Members, ranked"
        accent="in the open."
        lead="Standings by verified XP. Members who keep their level private appear without figures — that choice is theirs, and an absent figure means private, not zero."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <section aria-labelledby="standings">
          <h2 id="standings" className="eyebrow mb-4">
            The standings
          </h2>
          {rows.length === 0 ? (
            <EmptyState icon="network" title="No standings yet" body="The first member to finish a lesson takes the first seat." />
          ) : (
            <ol className="overflow-hidden rounded-lg border border-line bg-bg-1">
              {rows.map((r) => {
                const top = r.position <= 3;
                const isMe = r.username === me;
                return (
                  <li key={r.username} className={cn("border-b border-line last:border-0", isMe && "bg-gold/[0.05]")}>
                    <Link href={`/u/${r.username}`} className="group grid grid-cols-[2.5rem_auto_1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-bg-2">
                      <span className={cn("figures text-[14px]", top ? "text-gold-bright" : "text-ink-3")}>{String(r.position).padStart(2, "0")}</span>
                      <Avatar name={r.displayName} size={34} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14.5px] text-ink-1 group-hover:text-gold-bright">{r.displayName}</span>
                          {isMe && <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">you</span>}
                        </span>
                        <span className="figures block text-[11.5px] text-ink-3">@{r.username}</span>
                      </span>
                      <span className="flex flex-col items-end gap-1.5">
                        {r.rankSlug && <RankBadge slug={r.rankSlug} />}
                        <span className="figures flex items-center gap-2 text-[12px] text-ink-2">
                          {r.xp != null ? `${r.xp.toLocaleString("en-US")} XP · L${r.level}` : "private"}
                          {r.streak ? (
                            <span className="flex items-center gap-1 text-ink-3">
                              <Icon name="streak" size={12} className="text-gold" /> {r.streak}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="map" className="rounded-lg border border-line bg-bg-1 p-6">
            <div className="flex items-baseline justify-between">
              <h2 id="map" className="eyebrow">
                The map
              </h2>
              <span className="figures text-[11.5px] text-ink-3">{total} members</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
              Every member, placed on the orbit of their rank. Legend is the core; your node is lit.
            </p>
            <div className="mx-auto mt-4 max-w-[360px]">
              <RankMap ranks={counts} youIndex={youIndex} />
            </div>
          </section>
          <section className="rounded-lg border border-line bg-bg-1 p-6">
            <h2 className="eyebrow">Your rank travels</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
              Link your Discord account and your rank follows you there as a role, synced on every rank-up.
            </p>
            <Link href="/settings" className="mt-4 inline-flex items-center gap-2 text-[13px] text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
              Link Discord in settings <Icon name="arrow-right" size={14} />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
