import { watch } from "@tycoonhood/core";

import { Badge, SectionRule } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { MinerLogin } from "../../components/miner-login";
import { MinerHeader } from "../../components/miner-header";
import { WatchList } from "../../components/watch-list";

export const dynamic = "force-dynamic";
const MAIN_SITE = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "http://localhost:3000";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) return <MinerLogin mainSiteUrl={MAIN_SITE} />;

  const { tasks, paidToday, dailyCap, capReached } = await watch.listFor(user.id);
  const open = tasks.filter((t) => !t.paid);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-24 pt-8">
      <MinerHeader name={user.profile?.displayName ?? user.name ?? "Miner"} />

      <p className="eyebrow mb-1">Watch to earn</p>
      <h1 className="display text-[26px] leading-tight">Attention pays.</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
        Tycoonhood videos, on the Tycoonhood channel. Watch one properly and
        the THC lands in your wallet. The player reports to the server, and the
        server checks the clock — skipping ahead earns nothing.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Badge tone={capReached ? "neutral" : undefined}>
          {paidToday} of {dailyCap} today
        </Badge>
        <span className="text-[11px] text-ink-3">
          {capReached ? "That is today's limit — more tomorrow." : `Up to ${dailyCap} paid videos a day.`}
        </span>
      </div>

      <SectionRule label={open.length ? "Waiting for you" : "All caught up"} className="mb-4 mt-8" />

      {tasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-line px-4 py-8 text-center">
          <p className="text-[13px] text-ink-2">No videos are published yet.</p>
          <p className="mt-1 text-[12px] text-ink-3">
            They appear here the moment one goes live on the channel.
          </p>
        </div>
      ) : (
        <WatchList
          tasks={tasks.map((t) => ({
            id: t.id,
            slug: t.slug,
            title: t.title,
            description: t.description,
            youtubeVideoId: t.youtubeVideoId,
            durationSec: t.durationSec,
            requiredSec: t.requiredSec,
            rewardThc: t.rewardThc.toString(),
            rewardXp: t.rewardXp,
            paid: t.paid,
            secondsWatched: t.secondsWatched,
          }))}
          capReached={capReached}
        />
      )}

      <p className="mt-8 text-[11px] leading-relaxed text-ink-3">
        One payout per video, for life. A video watched at double speed, in a
        background tab, or by a script does not count — the server times it
        independently and only pays for time that actually passed.
      </p>
    </main>
  );
}
