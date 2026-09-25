import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { WATCH } from "@tycoonhood/config";
import { Badge, Card, CardContent, SectionRule } from "@tycoonhood/ui";
import { VideoForm } from "../../../../components/admin-video-form";
import { toggleVideoAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Videos" };
export const dynamic = "force-dynamic";

const clock = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;

export default async function AdminVideos() {
  await requireAdmin();

  const tasks = await prisma.watchTask.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { completions: true } } },
  });

  const paidOut = await prisma.watchCompletion.count({ where: { completedAt: { not: null } } });

  return (
    <main>
      <h1 className="display text-[30px]">Watch to earn</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
        Tycoonhood videos that pay THC for being genuinely watched. The server
        stamps the start, times it independently of the browser, and refuses to
        settle a watch the clock says could not have happened.
      </p>

      <SectionRule label={`${tasks.length} tasks · ${paidOut} paid watches`} className="mb-4 mt-8" />

      {tasks.length === 0 ? (
        <p className="text-[14px] text-ink-3">
          No videos yet. Members see an empty Watch tab until the first one goes live.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail
                      from an arbitrary video id; next/image would need every host allowlisted
                      and this is a 80x45 admin thumbnail, never an LCP element. */}
                  <img
                    src={`https://i.ytimg.com/vi/${t.youtubeVideoId}/default.jpg`}
                    alt=""
                    className="h-[45px] w-[80px] shrink-0 rounded border border-line object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-ink-1">
                      {t.title} <span className="figures text-[11px] text-ink-3">/{t.slug}</span>
                    </p>
                    <p className="figures mt-0.5 text-[12px] text-ink-2">
                      {t.rewardThc.toLocaleString("en-US")} THC
                      {t.rewardXp > 0 && ` · ${t.rewardXp} XP`} · watch {clock(t.requiredSec)} of{" "}
                      {clock(t.durationSec)} · {t._count.completions} started
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={t.active ? undefined : "neutral"}>{t.active ? "Live" : "Draft"}</Badge>
                  <form action={toggleVideoAction.bind(null, t.slug, !t.active)}>
                    <button type="submit" className="text-[12px] text-ink-3 underline hover:text-ink-1">
                      {t.active ? "Take down" : "Publish"}
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SectionRule label="Add or replace a video task" className="mb-6 mt-12" />
      <VideoForm defaultFraction={WATCH.defaultRequiredFraction} dailyCap={WATCH.dailyTaskCap} />
    </main>
  );
}
