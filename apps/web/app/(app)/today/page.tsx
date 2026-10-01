/**
 * TODAY — the member's home. Learning first, the community one step away.
 *
 *   main   a guided start (until done) · today's standard · the next lesson
 *   side   the record (streak, standard, rank) · announcements · wins
 *
 * Everything here is the member's real state; nothing is sample data.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { community, MAX_OWN_STANDARD_ITEMS, mining, standard } from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";
import { Icon, buttonStyles, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { continueLearning } from "../../../lib/learning";
import { Page, Panel, SectionTitle } from "../../../components/app/page";
import { StandardChecklist } from "../../../components/today/standard-checklist";
import { RecordGrid } from "../../../components/today/record-grid";
import { CourseCover } from "../../../components/learning/course-card";
import { TodayMiningCard } from "../../../components/mining/today-mining-card";
import { DaySky, skyPhase } from "../../../components/art/day-sky";
import { ProgressRing, RankEmblem, StreakFlame } from "../../../components/art/emblems";
import { addOwnItemAction, removeOwnItemAction, setTickAction } from "./actions";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

function localParts(tz: string | null) {
  const now = new Date();
  const zone = tz ?? "UTC";
  let hour = now.getUTCHours();
  let date = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  try {
    hour =
      Number(
        new Intl.DateTimeFormat("en-GB", {
          hour: "numeric",
          hour12: false,
          timeZone: zone,
        }).format(now),
      ) % 24;
    date = now.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: zone,
    });
  } catch {
    // An unknown zone falls back to UTC, as streaks do.
  }
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return { greeting, date, hour };
}

const short = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function TodayPage() {
  const user = await requireUser();
  const viewer = { id: user.id, role: user.role };
  const tz = user.profile?.timezone ?? null;

  const [today, history, streak, next, ranks, steps, announcements, wins, challenges, rig] = await Promise.all([
    standard.today(user.id),
    standard.history(user.id, 28),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    continueLearning(user.id),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    Promise.all([
      prisma.enrollment.count({ where: { userId: user.id } }),
      prisma.lessonProgress.count({
        where: { userId: user.id, completedAt: { not: null } },
      }),
      prisma.standardDay.count({ where: { userId: user.id } }),
      prisma.message.count({
        where: { authorId: user.id, channel: { slug: "general" } },
      }),
    ]),
    community.latest(viewer, "announcements", 2),
    community.latest(viewer, "wins", 3),
    prisma.challengeParticipation.findMany({
      where: { userId: user.id, status: "JOINED" },
      include: { challenge: { select: { slug: true, name: true } } },
      orderBy: { joinedAt: "desc" },
      take: 3,
    }),
    mining.preview(user.id),
  ]);

  const { greeting, date, hour } = localParts(tz);
  const first = (user.profile?.displayName ?? user.name ?? "").split(" ")[0];

  const [enrolled, lessonsDone, metDaysEver, introduced] = steps;
  const START = [
    {
      done: enrolled > 0,
      label: "Choose a program",
      detail: "Enrolling is free. Start where you are weakest.",
      href: "/courses",
    },
    {
      done: lessonsDone > 0,
      label: "Finish your first lesson",
      detail: "Lessons open in order. The first one is short.",
      href: next ? `/courses/${next.slug}/lesson/${next.next!.id}` : "/courses",
    },
    {
      done: metDaysEver > 0,
      label: "Meet the daily standard once",
      detail: "Tick every item below in a single day.",
      href: "#standard",
    },
    {
      done: introduced > 0,
      label: "Introduce yourself",
      detail: "Say who you are and what you are building, in General.",
      href: "/community/general",
    },
  ];
  const startDone = START.filter((s) => s.done).length;

  const rankIdx = Math.max(
    0,
    ranks.findIndex((r) => r.id === user.rankId),
  );
  const rank = ranks[rankIdx];
  const nextRank = ranks[rankIdx + 1];
  const toNextRank = nextRank ? Math.max(0, xpRequiredForLevel(nextRank.minLevel) - user.xp) : 0;

  return (
    <Page width="wide">
      <header className="relative mb-8 overflow-hidden rounded-xl border border-line bg-bg-1">
        <DaySky phase={skyPhase(hour)} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-0/90 via-bg-0/60 to-bg-0/10" aria-hidden />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="min-w-0">
            <p className="mb-1.5 text-[13px] font-medium text-ink-2">{date}</p>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink-1 sm:text-[34px]">
              {greeting}
              {first ? `, ${first}` : ""}.
            </h1>
            <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ink-1/90">
              {today.met
                ? "Today's standard is met. Anything more is extra."
                : today.ticked === 0
                  ? "One step at a time. Start with the first thing on your standard."
                  : `${today.total - today.ticked} left on today's standard.`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-5 rounded-lg border border-line-strong/70 bg-bg-0/70 p-4 backdrop-blur-sm">
            <ProgressRing
              value={today.ticked}
              total={today.total}
              size={76}
              tone={today.met ? "success" : "gold"}
              label={`Today's standard: ${today.ticked} of ${today.total} done`}
            >
              <span className="text-[19px] font-semibold tabular-nums leading-none">
                {today.ticked}
                <span className="text-[13px] font-normal text-ink-3">/{today.total}</span>
              </span>
            </ProgressRing>
            <div className="flex items-center gap-2.5">
              <StreakFlame days={streak?.current ?? 0} size={34} />
              <p className="leading-tight">
                <span className="block text-[22px] font-semibold tabular-nums">{streak?.current ?? 0}</span>
                <span className="text-[12.5px] text-ink-3">day streak</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-10">
          {startDone < START.length && (
            <section aria-labelledby="start">
              <SectionTitle
                id="start"
                action={
                  <span className="text-[13px] tabular-nums text-ink-3">
                    {startDone} of {START.length}
                  </span>
                }
              >
                Start here
              </SectionTitle>
              <Panel as="div" className="divide-y divide-line">
                {START.map((s, i) => (
                  <Link key={s.label} href={s.href} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-bg-2">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border text-[12.5px] font-semibold tabular-nums",
                        s.done ? "border-success/40 bg-success/10 text-success" : "border-line-strong text-ink-2",
                      )}
                    >
                      {s.done ? <Icon name="check" size={14} /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[15px] font-medium", s.done ? "text-ink-2 line-through decoration-ink-3/60" : "text-ink-1")}>
                        {s.label}
                      </span>
                      <span className="block text-[13px] text-ink-3">{s.detail}</span>
                    </span>
                    {!s.done && <Icon name="chevron-right" size={16} className="text-ink-3" />}
                  </Link>
                ))}
              </Panel>
            </section>
          )}

          <section id="standard" aria-labelledby="standard-title" className="scroll-mt-20">
            <SectionTitle
              id="standard-title"
              action={
                today.met ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
                    <Icon name="check" size={14} /> Met
                  </span>
                ) : undefined
              }
            >
              Today&rsquo;s standard
            </SectionTitle>
            <StandardChecklist
              items={today.items}
              maxOwn={MAX_OWN_STANDARD_ITEMS}
              setTick={setTickAction}
              addOwn={addOwnItemAction}
              removeOwn={removeOwnItemAction}
            />
          </section>

          <section aria-labelledby="learning">
            <SectionTitle
              id="learning"
              action={
                <Link href="/courses" className="text-[13px] text-ink-3 hover:text-ink-1">
                  All courses
                </Link>
              }
            >
              Continue learning
            </SectionTitle>
            {next ? (
              <Link
                href={`/courses/${next.slug}/lesson/${next.next!.id}`}
                className="group flex flex-col gap-4 rounded-lg border border-line bg-bg-1 p-3 transition-colors hover:border-gold-deep sm:flex-row sm:items-center"
              >
                <CourseCover pillar={next.pillar} coverImage={next.coverImage} className="sm:w-56 sm:shrink-0" />
                <div className="min-w-0 flex-1 px-2 pb-2 sm:p-0">
                  <p className="text-[13px] text-ink-3">
                    {next.title} · lesson {next.done + 1} of {next.lessons}
                  </p>
                  <p className="mt-1 text-[18px] font-semibold leading-snug">{next.next!.title}</p>
                  <p className="mt-1 text-[13.5px] text-ink-3">{next.next!.moduleTitle}</p>
                  <span className={buttonStyles({ size: "sm", className: "mt-4" })}>
                    {next.done === 0 ? "Start" : "Continue"} <Icon name="arrow-right" size={14} />
                  </span>
                </div>
              </Link>
            ) : (
              <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
                <p className="text-[14.5px] text-ink-2">{enrolled ? "Every program you enrolled in is complete." : "You are not enrolled in a program yet."}</p>
                <Link href="/courses" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  Browse courses
                </Link>
              </Panel>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-8" aria-label="Your record and the house">
          <section aria-labelledby="record">
            <SectionTitle
              id="record"
              action={
                <Link href="/profile" className="text-[13px] text-ink-3 hover:text-ink-1">
                  Full record
                </Link>
              }
            >
              Your record
            </SectionTitle>
            <Panel className="p-5">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[12.5px] text-ink-3">Streak</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 text-[22px] font-semibold tabular-nums">
                    <StreakFlame days={streak?.current ?? 0} size={22} />
                    {streak?.current ?? 0} <span className="text-[13px] font-normal text-ink-3">{(streak?.current ?? 0) === 1 ? "day" : "days"}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[12.5px] text-ink-3">Longest</dt>
                  <dd className="mt-0.5 text-[22px] font-semibold tabular-nums">
                    {streak?.longest ?? 0} <span className="text-[13px] font-normal text-ink-3">{(streak?.longest ?? 0) === 1 ? "day" : "days"}</span>
                  </dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-line pt-5">
                <RecordGrid days={history.days} metDays={history.metDays} />
              </div>
              {rank && (
                <div className="mt-5 flex gap-4 border-t border-line pt-5">
                  <RankEmblem tier={rankIdx} of={ranks.length} size={52} />
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-ink-3">Rank</p>
                    <p className="mt-0.5 text-[15px] font-medium">
                      {rank.name.replace(/^Tycoon\s+/, "")} <span className="font-normal text-ink-3">· level {user.level}</span>
                    </p>
                    {nextRank && (
                      <p className="mt-1 text-[13px] text-ink-3">
                        {nextRank.name.replace(/^Tycoon\s+/, "")} at level {nextRank.minLevel} — {toNextRank.toLocaleString("en-US")} XP of verified work away.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Panel>
          </section>

          <section aria-labelledby="rig-title">
            <SectionTitle id="rig-title">Your rig</SectionTitle>
            <TodayMiningCard level={rig.rigLevel} maxLevel={rig.maxLevel} accrued={rig.accrued} capacity={rig.capacity} ratePerHour={rig.ratePerHour} />
          </section>

          <section aria-labelledby="announcements">
            <SectionTitle
              id="announcements"
              action={
                <Link href="/community/announcements" className="text-[13px] text-ink-3 hover:text-ink-1">
                  All
                </Link>
              }
            >
              Announcements
            </SectionTitle>
            {announcements.length === 0 ? (
              <p className="text-[14px] text-ink-3">Nothing posted yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {announcements.reverse().map((a) => (
                  <Link
                    key={a.id}
                    href={`/community/announcements#m-${a.id}`}
                    className="block rounded-lg border border-line bg-bg-1 p-4 hover:border-line-strong"
                  >
                    <p className="text-[12.5px] text-ink-3">
                      {a.author.name} · {short(a.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-4 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-1">{a.body}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="wins">
            <SectionTitle
              id="wins"
              action={
                <Link href="/community/wins" className="text-[13px] text-ink-3 hover:text-ink-1">
                  Post a win
                </Link>
              }
            >
              Recent wins
            </SectionTitle>
            {wins.length === 0 ? (
              <p className="text-[14px] text-ink-3">No wins posted yet. Be the first — with proof.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {wins.reverse().map((w) => (
                  <li key={w.id}>
                    <Link href={`/community/wins#m-${w.id}`} className="flex gap-3 rounded-md px-1 py-2 hover:bg-bg-2">
                      <Icon name="trophy" size={16} className="mt-0.5 text-gold" />
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-[14px] text-ink-1">{w.body}</span>
                        <span className="text-[12.5px] text-ink-3">
                          {w.author.name} · {short(w.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {challenges.length > 0 && (
            <section aria-labelledby="challenges">
              <SectionTitle
                id="challenges"
                action={
                  <Link href="/challenges" className="text-[13px] text-ink-3 hover:text-ink-1">
                    All
                  </Link>
                }
              >
                Your challenges
              </SectionTitle>
              <ul className="flex flex-col gap-2">
                {challenges.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/challenges#${p.challenge.slug}`}
                      className="flex items-center gap-3 rounded-md border border-line bg-bg-1 px-4 py-3 hover:border-line-strong"
                    >
                      <Icon name="target" size={16} className="text-gold" />
                      <span className="min-w-0 flex-1 truncate text-[14px]">{p.challenge.name}</span>
                      <Icon name="chevron-right" size={14} className="text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </Page>
  );
}
