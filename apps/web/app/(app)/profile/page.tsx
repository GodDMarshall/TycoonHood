/**
 * PROFILE — the member's own record. What they have verifiably done, laid
 * out like a training log: consistency first, then learning, then status.
 * The public card at /u/<username> shows only what the member chose to share.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { standard } from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";
import { Avatar, Icon, Progress, buttonStyles, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { catalog } from "../../../lib/learning";
import { Page, Panel, SectionTitle } from "../../../components/app/page";
import { RecordGrid } from "../../../components/today/record-grid";
import { Medal, RankEmblem } from "../../../components/art/emblems";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

const since = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const short = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function ProfilePage() {
  const user = await requireUser();
  const [streak, history, metTotal, lessonsDone, certificates, achievements, ranks, programs, openAchievements] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: user.id } }),
    standard.history(user.id, 84),
    standard.metDaysTotal(user.id),
    prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } }),
    prisma.certificate.findMany({ where: { userId: user.id }, include: { course: { select: { title: true } } }, orderBy: { issuedAt: "desc" } }),
    prisma.userAchievement.findMany({ where: { userId: user.id }, include: { achievement: true }, orderBy: { unlockedAt: "desc" } }),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    catalog(user.id),
    // The rest of the case: active, non-secret achievements not yet earned.
    prisma.achievement.findMany({
      where: { active: true, isSecret: false, unlocks: { none: { userId: user.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
  ]);

  const name = user.profile?.displayName ?? user.name ?? "Member";
  const username = user.profile?.username ?? null;
  const rankIdx = Math.max(
    0,
    ranks.findIndex((r) => r.id === user.rankId),
  );
  const rank = ranks[rankIdx];
  const nextRank = ranks[rankIdx + 1];
  const from = rank ? xpRequiredForLevel(rank.minLevel) : 0;
  const to = nextRank ? xpRequiredForLevel(nextRank.minLevel) : null;
  const toward = to ? Math.min(100, Math.round(((user.xp - from) / Math.max(1, to - from)) * 100)) : 100;
  const enrolled = programs.filter((p) => p.enrollment);

  const STATS = [
    { label: "Current streak", value: streak?.current ?? 0, unit: (streak?.current ?? 0) === 1 ? "day" : "days" },
    { label: "Longest streak", value: streak?.longest ?? 0, unit: (streak?.longest ?? 0) === 1 ? "day" : "days" },
    { label: "Standard met", value: metTotal, unit: metTotal === 1 ? "day" : "days" },
    { label: "Lessons completed", value: lessonsDone, unit: "" },
    { label: "Certificates", value: certificates.length, unit: "" },
  ];

  return (
    <Page>
      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative w-fit shrink-0">
          <Avatar name={name} src={user.profile?.avatarUrl} size={72} />
          <RankEmblem tier={rankIdx} of={ranks.length} size={34} className="absolute -bottom-2 -right-3 drop-shadow-[0_2px_4px_rgb(0_0_0/0.6)]" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">{name}</h1>
          <p className="mt-1 text-[14px] text-ink-3">
            {username && <>@{username} · </>}
            {rank ? rank.name.replace(/^Tycoon\s+/, "") : "Member"} · member since {since.format(user.createdAt)}
          </p>
          {user.profile?.bio && <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{user.profile.bio}</p>}
        </div>
        <div className="flex gap-2">
          {username && (
            <Link href={`/u/${username}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Public card
            </Link>
          )}
          <Link href="/settings" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            <Icon name="settings" size={15} /> Settings
          </Link>
        </div>
      </header>

      <dl className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-bg-1 p-5">
            <dt className="text-[12.5px] text-ink-3">{s.label}</dt>
            <dd className="mt-1 text-[26px] font-semibold tabular-nums leading-none">
              {s.value.toLocaleString("en-US")}
              {s.unit && <span className="ml-1.5 text-[13px] font-normal text-ink-3">{s.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="consistency">
            <SectionTitle id="consistency">The daily standard, last 12 weeks</SectionTitle>
            <Panel className="p-5">
              <RecordGrid days={history.days} metDays={history.metDays} size={16} />
            </Panel>
          </section>

          <section aria-labelledby="learning">
            <SectionTitle
              id="learning"
              action={
                <Link href="/courses" className="text-[13px] text-ink-3 hover:text-ink-1">
                  Courses
                </Link>
              }
            >
              Programs
            </SectionTitle>
            {enrolled.length === 0 ? (
              <Panel className="p-5 text-[14.5px] text-ink-2">Not enrolled in a program yet.</Panel>
            ) : (
              <Panel as="div" className="divide-y divide-line">
                {enrolled.map((p) => (
                  <Link key={p.id} href={`/courses/${p.slug}`} className="flex items-center gap-4 px-5 py-4 hover:bg-bg-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{p.title}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={p.pct} label={`${p.title} progress`} className="flex-1" />
                        <span className="text-[12.5px] tabular-nums text-ink-3">
                          {p.done}/{p.lessons}
                        </span>
                      </div>
                    </div>
                    {p.certificate && <Icon name="seal" size={18} className="text-gold" />}
                  </Link>
                ))}
              </Panel>
            )}
          </section>

          {certificates.length > 0 && (
            <section aria-labelledby="certificates">
              <SectionTitle id="certificates">Certificates</SectionTitle>
              <Panel as="div" className="divide-y divide-line">
                {certificates.map((c) => (
                  <Link key={c.id} href={`/verify/${c.serial}`} className="flex items-center gap-4 px-5 py-4 hover:bg-bg-2">
                    <Icon name="seal" size={20} className="text-gold" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{c.course.title}</p>
                      <p className="text-[13px] tabular-nums text-ink-3">
                        {c.serial} · issued {short.format(c.issuedAt)}
                      </p>
                    </div>
                    <span className="text-[13px] text-ink-3">Verify</span>
                  </Link>
                ))}
              </Panel>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-8">
          <section aria-labelledby="rank">
            <SectionTitle id="rank">Rank</SectionTitle>
            <Panel className="p-5">
              <div className="flex items-center gap-4">
                <RankEmblem tier={rankIdx} of={ranks.length} size={64} />
                <div className="min-w-0">
                  <p className="text-[20px] font-semibold">{rank ? rank.name.replace(/^Tycoon\s+/, "") : "Member"}</p>
                  <p className="mt-0.5 text-[13.5px] text-ink-3">
                    Level {user.level} · {user.xp.toLocaleString("en-US")} XP
                  </p>
                </div>
              </div>
              {nextRank && to && (
                <>
                  <Progress value={toward} label="Progress to next rank" className="mt-4" />
                  <p className="mt-2 text-[13px] text-ink-3">
                    {nextRank.name.replace(/^Tycoon\s+/, "")} at level {nextRank.minLevel} · {Math.max(0, to - user.xp).toLocaleString("en-US")} XP to go
                  </p>
                </>
              )}
              <p className="mt-4 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-3">
                XP comes only from verified actions — lessons, knowledge checks, challenges, the daily check-in. How much you post in the community never
                counts.
              </p>
              <ol className="mt-4 flex flex-col gap-1.5">
                {ranks.map((r, i) => (
                  <li key={r.id} className="flex items-center justify-between text-[13.5px]">
                    <span className={cn("flex items-center gap-2", i === rankIdx ? "font-medium text-ink-1" : i < rankIdx ? "text-ink-2" : "text-ink-3")}>
                      <RankEmblem tier={i} of={ranks.length} size={22} className={i > rankIdx ? "opacity-40 grayscale" : undefined} />
                      {r.name.replace(/^Tycoon\s+/, "")}
                      {i < rankIdx && <Icon name="check" size={13} className="text-success" />}
                    </span>
                    <span className="tabular-nums text-ink-3">Level {r.minLevel}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </section>

          <section aria-labelledby="achievements">
            <SectionTitle id="achievements" action={<span className="text-[13px] tabular-nums text-ink-3">{achievements.length} earned</span>}>
              Achievements
            </SectionTitle>
            {achievements.length === 0 && openAchievements.length === 0 ? (
              <p className="text-[14px] text-ink-3">None yet. They unlock from real milestones — a first program, a seven-day streak.</p>
            ) : (
              <Panel as="ul" className="grid grid-cols-1 divide-y divide-line">
                {achievements.map((a) => (
                  <li key={a.id} className="flex items-center gap-3.5 px-5 py-3.5">
                    <Medal earned glyph={a.achievement.name} size={36} />
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-medium">{a.achievement.name}</p>
                      <p className="text-[13px] text-ink-3">
                        {a.achievement.description} · {short.format(a.unlockedAt)}
                      </p>
                    </div>
                  </li>
                ))}
                {openAchievements.map((a) => (
                  <li key={a.id} className="flex items-center gap-3.5 px-5 py-3.5">
                    <Medal earned={false} glyph={a.name} size={36} />
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-medium text-ink-2">
                        {a.name} <span className="sr-only">(not yet earned)</span>
                      </p>
                      <p className="text-[13px] text-ink-3">{a.description}</p>
                    </div>
                  </li>
                ))}
              </Panel>
            )}
          </section>
        </aside>
      </div>
    </Page>
  );
}
