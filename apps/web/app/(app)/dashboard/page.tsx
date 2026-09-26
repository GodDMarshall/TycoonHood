/**
 * THE COMMAND CENTER — the member's seat in the house.
 *
 *   top     status: who you are here — rank, level, streak, wallet, goals
 *   centre  today's mission: the one thing to do now, and what it pays
 *   left    progress: the ascent through the five ranks
 *   right   performance: streak, lessons, achievements, certificates
 *   below   the monument, the academy, the arena, the record
 *
 * On a phone the order is what matters most first: today, continue, progress.
 * Everything here is the member's real state; nothing is sample data.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";
import {
  Badge,
  EmptyState,
  Icon,
  PILLAR_LABEL,
  PillarBadge,
  Progress,
  RankPips,
  ThcAmount,
  XpBar,
  buttonStyles,
  cn,
  type IconName,
} from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { dailyCheckInAction } from "../challenges/actions";
import { CheckInButton } from "../../../components/checkin-button";
import { Monument } from "../../../components/command/monument";

export const metadata: Metadata = { title: "Command Center" };
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);
const fmt = (n: number | bigint) => n.toLocaleString("en-US");
const PILLARS = ["WARRIOR", "BUILDER", "TYCOON", "MIND"] as const;

/** Where a mission's work actually happens, keyed by the event it listens for. */
const MISSION_DOOR: Record<string, { href: string; label: string }> = {
  LESSON_COMPLETED: { href: "/academy", label: "Open the Academy" },
  ONBOARDED: { href: "/onboarding", label: "Finish onboarding" },
  DAILY_ACTIVE: { href: "/dashboard", label: "Check in" },
};

export default async function CommandCenter() {
  const user = await requireUser();
  const now = new Date();

  const [wallet, notifications, openMissions, daily, streak, unlocked, achievementCount, enrollments, ranks, participations, lessonsDone, certificates] =
    await Promise.all([
      ledger.ensureUserAccount(user.id),
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.mission.findMany({
        where: { active: true, repeatable: false, completions: { none: { userId: user.id } } },
        orderBy: { xpReward: "desc" },
        take: 3,
      }),
      prisma.mission.findFirst({
        where: { active: true, repeatable: true, criteria: { path: ["event"], equals: "DAILY_ACTIVE" } },
        include: { completions: { where: { userId: user.id }, orderBy: { completedAt: "desc" }, take: 1 } },
      }),
      prisma.streak.findUnique({ where: { userId: user.id } }),
      prisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
        orderBy: { unlockedAt: "desc" },
      }),
      prisma.achievement.count({ where: { active: true, isSecret: false } }),
      prisma.enrollment.findMany({
        where: { userId: user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
        orderBy: { enrolledAt: "desc" },
        include: {
          course: {
            include: {
              modules: {
                orderBy: { sortOrder: "asc" },
                include: {
                  lessons: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, title: true, progress: { where: { userId: user.id }, select: { completedAt: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.challengeParticipation.findMany({
        where: { userId: user.id, status: "JOINED" },
        include: { challenge: true },
        orderBy: { joinedAt: "desc" },
        take: 3,
      }),
      prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } }),
      prisma.certificate.count({ where: { userId: user.id } }),
    ]);

  const name = user.profile?.displayName ?? user.name ?? "Member";
  const floor = xpRequiredForLevel(user.level);
  const next = xpRequiredForLevel(user.level + 1);
  const rankIndex = Math.max(0, ranks.findIndex((r) => r.id === user.rank?.id));
  const nextRank = ranks[rankIndex + 1];
  const xpToNextRank = nextRank ? Math.max(0, xpRequiredForLevel(nextRank.minLevel) - user.xp) : 0;

  // Today: is the daily window open?
  const lastCheckIn = daily?.completions[0]?.completedAt ?? null;
  const reopensAt = lastCheckIn && daily?.cooldownHours ? new Date(lastCheckIn.getTime() + daily.cooldownHours * 3600_000) : null;
  const checkInOpen = !!daily && (!reopensAt || reopensAt <= now);
  const hoursLeft = reopensAt ? Math.max(1, Math.ceil((reopensAt.getTime() - now.getTime()) / 3600_000)) : 0;

  // Continue: the most recent program with a lesson left.
  const active = enrollments.find((e) => e.status === "ACTIVE");
  const nextLesson = active?.course.modules.flatMap((m) => m.lessons).find((l) => !l.progress[0]?.completedAt);

  const columns = PILLARS.map((p) => {
    const e = enrollments.find((x) => x.course.pillar === p);
    return { pillar: p, pct: e?.progressPct ?? 0, enrolled: !!e };
  });

  const goals = user.profile?.goals ?? [];

  return (
    <main className="flex flex-col gap-6 lg:gap-8">
      {/* ── STATUS ───────────────────────────────────────────── */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="animate-rise">
          <p className="mb-4 flex items-center gap-3">
            <span className="eyebrow">Command Center</span>
            <span className="h-px w-6 bg-line-strong max-sm:hidden" aria-hidden />
            <span className="index max-sm:hidden">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </p>
          <h1 className="display text-h1">
            Welcome back, <span className="accent">{name}.</span>
          </h1>
          {goals.length > 0 && (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
              <span>Building toward</span>
              {goals.slice(0, 3).map((g) => (
                <Badge key={g} tone="neutral" className="normal-case tracking-normal font-sans text-[12px]">
                  {g}
                </Badge>
              ))}
            </p>
          )}
        </div>
        <div role="group" aria-label="Your status" className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-bg-1 sm:grid-cols-4 lg:min-w-[560px]">
          <Readout label="Rank" icon="ascent">
            <span className="flex items-center gap-2">
              <RankPips filled={rankIndex + 1} />
              {user.rank?.name.replace(/^Tycoon\s+/, "") ?? "—"}
            </span>
          </Readout>
          <Readout label="Level" icon="bolt">
            {user.level}
          </Readout>
          <Readout label="Streak" icon="streak">
            {streak?.current ?? 0}
            <span className="ml-1 text-[11px] text-ink-3">{(streak?.current ?? 0) === 1 ? "day" : "days"}</span>
          </Readout>
          <Readout label="Wallet" icon="wallet" href="/wallet">
            <ThcAmount amount={wallet.balance} size="sm" />
          </Readout>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Two columns on desktop; on a phone the wrappers dissolve (display: contents)
            so the order classes below put today, the academy and the arena first. */}
        <div className="max-lg:contents lg:col-span-7 lg:flex lg:flex-col lg:gap-8">
        {/* ── TODAY'S MISSION (first on every device) ───────────── */}
        <section
          aria-labelledby="today"
          className="relative overflow-hidden rounded-lg border border-gold-deep/60 bg-[linear-gradient(160deg,rgb(207_169_94/0.08),transparent_45%),var(--color-bg-2)] shadow-[var(--shadow-gold)] max-lg:order-1"
        >
          <div className="grid-plane pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="relative flex h-full flex-col gap-6 p-6 md:p-8">
            <div className="flex items-center justify-between">
              <p id="today" className="eyebrow flex items-center gap-2">
                <Icon name="mission" size={14} /> Today&apos;s mission
              </p>
              {daily && (
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  {checkInOpen ? "Window open" : `Reopens in ~${hoursLeft}h`}
                </span>
              )}
            </div>

            {daily ? (
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <h2 className="display text-h2">{daily.name}</h2>
                  <p className="mt-2 max-w-[44ch] text-[15px] text-ink-2">{daily.description}</p>
                  <p className="mt-4 flex items-center gap-4">
                    <span className="figures text-[14px] text-gold-bright">+{fmt(daily.xpReward)} XP</span>
                    <ThcAmount amount={daily.thcReward} signed size="sm" />
                  </p>
                </div>
                <div className="md:w-[260px]">
                  {checkInOpen ? (
                    <CheckInButton action={dailyCheckInAction} label="Check in now" block />
                  ) : (
                    <div className="flex items-center gap-3 rounded-md border border-success/40 bg-success/[0.06] px-4 py-3 text-[13.5px] text-success">
                      <Icon name="check" size={18} /> Done for this window. Streak held.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-ink-2">No daily mission is running right now.</p>
            )}

            <div className="mt-auto grid gap-3 border-t border-line pt-6 md:grid-cols-2">
              {active && nextLesson ? (
                <Link
                  href={`/academy/${active.course.slug}/lesson/${nextLesson.id}`}
                  className="group flex flex-col gap-2 rounded-md border border-line-strong bg-bg-1/80 p-4 transition-colors hover:border-gold-deep"
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">Continue · {active.course.title}</span>
                  <span className="text-[15px] font-semibold leading-snug">{nextLesson.title}</span>
                  <span className="mt-1 flex items-center gap-3">
                    <Progress value={active.progressPct} label={`${active.course.title} progress`} className="flex-1" />
                    <span className="figures text-[11px] text-ink-3">{active.progressPct}%</span>
                    <Icon name="arrow-right" size={15} className="text-gold transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ) : (
                <Link
                  href="/academy"
                  className="group flex flex-col gap-2 rounded-md border border-dashed border-line-strong p-4 transition-colors hover:border-gold-deep"
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">Academy</span>
                  <span className="text-[15px] font-semibold">Choose your first program</span>
                  <span className="text-[13px] text-ink-2">Four pillars, free to enroll. Start where you are weakest.</span>
                </Link>
              )}
              {openMissions[0] ? (
                <MissionDoor mission={openMissions[0]} />
              ) : (
                <div className="flex flex-col gap-2 rounded-md border border-line p-4">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">Missions</span>
                  <span className="text-[15px] font-semibold">Every starter mission is complete.</span>
                  <span className="text-[13px] text-ink-2">New missions start paying the moment the house publishes them.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── THE MONUMENT ─────────────────────────────────────── */}
        <section aria-labelledby="monument" className="rounded-lg border border-line bg-bg-1 p-6 max-lg:order-6 md:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="monument" className="eyebrow">
              Your monument
            </h2>
            <p className="text-[12px] text-ink-3">Tiers are ranks. Columns are your four programs, built to your real progress.</p>
          </div>
          <Monument
            className="mx-auto mt-4 max-w-[560px]"
            columns={columns}
            rankIndex={rankIndex}
            rankNames={ranks.map((r) => r.name)}
          />
          {/* The same facts as text: readable at phone size, and for assistive tech. */}
          <ul className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
            {columns.map((c) => (
              <li key={c.pillar} className="flex items-center justify-between gap-2 bg-bg-1 px-3 py-2.5">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">{PILLAR_LABEL[c.pillar]}</span>
                <span className="figures text-[13px]">{c.enrolled ? `${c.pct}%` : "—"}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── THE RECORD ───────────────────────────────────────── */}
        <section aria-labelledby="record" className="rounded-lg border border-line bg-bg-2/70 p-6 max-lg:order-7">
          <div className="flex items-center justify-between">
            <h2 id="record" className="eyebrow">
              The record
            </h2>
            <Link href="/wallet" className="text-[12.5px] text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
              Full ledger
            </Link>
          </div>
          {notifications.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon="journal"
              title="Nothing written yet"
              body="Your first completed mission writes the first line here — and on the ledger, permanently."
            />
          ) : (
            <ol className="mt-4 flex flex-col">
              {notifications.map((n) => (
                <li key={n.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b border-line py-3 last:border-0">
                  <span className="size-1.5 translate-y-[-2px] rotate-45 bg-gold-deep" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[14px] text-ink-1">{n.title}</p>
                    {n.body && <p className="truncate text-[12.5px] text-ink-3">{n.body}</p>}
                  </div>
                  <time dateTime={n.createdAt.toISOString()} className="figures shrink-0 text-[11px] text-ink-3">
                    {n.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
        </div>

        <div className="max-lg:contents lg:col-span-5 lg:flex lg:flex-col lg:gap-8">
        {/* ── PROGRESS: the ascent ─────────────────────────────── */}
        <section aria-labelledby="ascent" className="rounded-lg border border-line bg-bg-2/70 p-6 max-lg:order-4">
          <div className="flex items-center justify-between">
            <h2 id="ascent" className="eyebrow">
              The ascent
            </h2>
            <span className="index">
              Rank {rankIndex + 1} / {ranks.length}
            </span>
          </div>
          <XpBar className="mt-5" level={user.level} currentXp={user.xp} levelFloorXp={floor} nextLevelXp={next} />
          <ol className="mt-6 flex flex-col">
            {ranks.map((r, i) => {
              const reached = i <= rankIndex;
              const current = i === rankIndex;
              return (
                <li key={r.id} className="grid grid-cols-[18px_1fr_auto] items-center gap-3 py-2">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 rotate-45 border",
                      current ? "border-gold-bright bg-gold" : reached ? "border-gold-deep bg-gold-deep" : "border-line-strong"
                    )}
                  />
                  <span className={cn("text-[14px]", current ? "font-semibold text-ink-1" : reached ? "text-ink-2" : "text-ink-3")}>
                    {r.name.replace(/^Tycoon\s+/, "")}
                    {current && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">you</span>}
                  </span>
                  <span className="figures text-[11.5px] text-ink-3">Lv {r.minLevel}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-2">
            {nextRank ? (
              <>
                <span className="figures text-gold">{fmt(xpToNextRank)} XP</span> to{" "}
                {nextRank.name.replace(/^Tycoon\s+/, "")} (level {nextRank.minLevel}).
              </>
            ) : (
              "You hold the highest rank in the house."
            )}
          </p>
        </section>

        {/* ── PERFORMANCE ──────────────────────────────────────── */}
        <section aria-labelledby="performance" className="rounded-lg border border-line bg-bg-2/70 p-6 max-lg:order-5">
          <h2 id="performance" className="eyebrow">
            Performance
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
            <Fact label="Best streak" value={`${streak?.longest ?? 0}`} unit={(streak?.longest ?? 0) === 1 ? "day" : "days"} />
            <Fact label="Lessons done" value={fmt(lessonsDone)} />
            <Fact label="Achievements" value={`${unlocked.length}`} unit={`of ${achievementCount}`} />
            <Fact label="Certificates" value={fmt(certificates)} />
          </dl>
          {unlocked.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              {unlocked.slice(0, 4).map((ua) => (
                <li key={ua.id}>
                  <Badge tone="gold">
                    <Icon name="seal" size={12} /> {ua.achievement.name}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── ACADEMY ──────────────────────────────────────────── */}
        <section aria-labelledby="academy" className="rounded-lg border border-line bg-bg-2/70 p-6 max-lg:order-2">
          <div className="flex items-center justify-between">
            <h2 id="academy" className="eyebrow">
              Academy
            </h2>
            <Link href="/academy" className="text-[12.5px] text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
              All programs
            </Link>
          </div>
          {enrollments.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon="academy"
              title="No program yet"
              body="Enrolling is free. Each program is modules, lessons and a quiz — and your first finished lesson pays a mission."
              action={
                <Link href="/academy" className={buttonStyles({ size: "sm" })}>
                  Choose a program
                </Link>
              }
            />
          ) : (
            <ul className="mt-5 flex flex-col divide-y divide-line">
              {enrollments.map((e) => (
                <li key={e.id}>
                  <Link href={`/academy/${e.course.slug}`} className="group flex flex-col gap-2 py-3.5">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-[14px] font-medium group-hover:text-gold-bright">{e.course.title}</span>
                      <PillarBadge pillar={e.course.pillar} />
                    </span>
                    <span className="flex items-center gap-3">
                      <Progress value={e.progressPct} tone={e.course.pillar === "TYCOON" ? "gold" : (e.course.pillar.toLowerCase() as "warrior" | "builder" | "mind")} label={`${e.course.title} progress`} className="flex-1" />
                      <span className="figures w-10 text-right text-[11.5px] text-ink-3">{e.progressPct}%</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── ARENA ────────────────────────────────────────────── */}
        <section aria-labelledby="arena" className="rounded-lg border border-line bg-bg-2/70 p-6 max-lg:order-3">
          <div className="flex items-center justify-between">
            <h2 id="arena" className="eyebrow">
              Arena
            </h2>
            <Link href="/challenges" className="text-[12.5px] text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
              All challenges
            </Link>
          </div>
          {participations.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon="arena"
              title="Not in a challenge"
              body="Challenges have a fixed objective, a window and a reward posted on completion. Join one when you are ready to be held to it."
              action={
                <Link href="/challenges" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  Enter the Arena
                </Link>
              }
            />
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {participations.map((p) => (
                <li key={p.id} className="rounded-md border border-line-strong bg-bg-1 p-4">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">{p.challenge.lifecycle.toLowerCase()}</p>
                  <p className="mt-1 text-[15px] font-semibold">{p.challenge.name}</p>
                  <p className="mt-2 flex items-center gap-4">
                    <span className="figures text-[12.5px] text-gold-bright">+{fmt(p.challenge.xpReward)} XP</span>
                    <ThcAmount amount={p.challenge.thcReward} signed size="sm" />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        </div>
      </div>
    </main>
  );
}

function Readout({ label, icon, href, children }: { label: string; icon: IconName; href?: string; children: ReactNode }) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-3">
        <Icon name={icon} size={12} className="text-gold" />
        {label}
      </span>
      <span className="figures mt-2 text-[15px] leading-none text-ink-1">{children}</span>
    </>
  );
  const cls = "flex flex-col border-line px-4 py-4 max-sm:[&:nth-child(-n+2)]:border-b [&:not(:last-child)]:border-r max-sm:[&:nth-child(2)]:border-r-0";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-bg-2")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Fact({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-1.5">
        <span className="figures text-[24px] leading-none">{value}</span>
        {unit && <span className="text-[12px] text-ink-3">{unit}</span>}
      </dd>
    </div>
  );
}

function MissionDoor({ mission }: { mission: { name: string; description: string; xpReward: number; thcReward: bigint; criteria: unknown } }) {
  const event = (mission.criteria as { event?: string } | null)?.event ?? "";
  const door = MISSION_DOOR[event];
  const inner = (
    <>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">Next mission · {mission.name}</span>
      <span className="text-[15px] font-semibold leading-snug">{mission.description}</span>
      <span className="mt-1 flex items-center gap-4">
        <span className="figures text-[12.5px] text-gold-bright">+{fmt(mission.xpReward)} XP</span>
        <ThcAmount amount={mission.thcReward} signed size="sm" />
        {door && <Icon name="arrow-right" size={15} className="ml-auto text-gold transition-transform group-hover:translate-x-0.5" />}
      </span>
    </>
  );
  return door ? (
    <Link href={door.href} aria-label={`${mission.name}: ${door.label}`} className="group flex flex-col gap-2 rounded-md border border-line-strong bg-bg-1/80 p-4 transition-colors hover:border-gold-deep">
      {inner}
    </Link>
  ) : (
    <div className="flex flex-col gap-2 rounded-md border border-line-strong bg-bg-1/80 p-4">{inner}</div>
  );
}
