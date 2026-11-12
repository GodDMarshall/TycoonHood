/**
 * WATCH TO EARN — ported from apps/miner/app/tasks/page.tsx.
 * The list, the daily cap and every reward are read from watch.listFor.
 */
import type { Metadata } from "next";
import { watch } from "@tycoonhood/core";
import { Badge, EmptyState } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { PageHeader, SectionTitle } from "../../../../components/app/page";
import { WatchList } from "../../../../components/mining/watch-list";

export const metadata: Metadata = { title: "Mining tasks" };
export const dynamic = "force-dynamic";

export default async function MiningTasksPage() {
  const user = await requireUser();
  const { tasks, paidToday, dailyCap, capReached } = await watch.listFor(user.id);
  const open = tasks.filter((t) => !t.paid);

  return (
    <>
      <PageHeader
        kicker="Watch to earn"
        title="Attention pays."
        description="Tycoonhood videos, on the Tycoonhood channel. Watch one properly and the THC lands in your wallet. The player reports to the server, and the server checks the clock — skipping ahead earns nothing."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={capReached ? "neutral" : "gold"}>
              <span className="tabular-nums">
                {paidToday} of {dailyCap}
              </span>{" "}
              today
            </Badge>
            <span className="text-[12.5px] text-ink-3">
              {capReached ? "That is today's limit — more tomorrow." : `Up to ${dailyCap} paid videos a day.`}
            </span>
          </div>
        }
      />

      <div className="max-w-[760px] min-w-0">
        <SectionTitle>{open.length ? "Waiting for you" : "All caught up"}</SectionTitle>
        {tasks.length === 0 ? (
          <EmptyState
            icon="play"
            title="No videos are published yet."
            body="They appear here the moment one goes live on the channel."
          />
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

        <p className="mt-8 text-[12px] leading-relaxed text-ink-3">
          One payout per video, for life. A video watched at double speed, in a background tab, or by a script does not
          count — the server times it independently and only pays for time that actually passed.
        </p>
      </div>
    </>
  );
}
