/**
 * ACHIEVEMENTS — the case of everything there is to earn, the missions in
 * force (daily, weekly, one-time) with real progress, the XP history, and the
 * rank ladder with what the next rank needs. Every figure is counted from rows.
 */
import type { Metadata } from "next";
import { prisma } from "@tycoonhood/db";
import { countEvidence, countsStandardDays, describeCriteria, formatDate, formatDay, localDayKey, memberZone, repeatBucket, requiredFor, tryParseCriteria } from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";
import { Badge, EmptyState, Icon, Progress, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader, Panel, SectionTitle } from "../../../components/app/page";

export const metadata: Metadata = { title: "Achievements" };
export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SOURCE: Record<string, string> = {
  LESSON_COMPLETED: "Lesson completed",
  COURSE_COMPLETED: "Programme completed",
  QUIZ_PASSED: "Quiz passed",
  CHALLENGE_COMPLETED: "Challenge completed",
  MISSION_COMPLETED: "Mission",
  ACHIEVEMENT_UNLOCKED: "Achievement",
  STREAK_BONUS: "Streak",
  ADMIN_GRANT: "Granted by staff",
  WATCH_TASK: "Video watched",
  REFERRAL: "Referral",
  COMMUNITY: "Community",
};

export default async function AchievementsPage() {
  const user = await requireUser();
  const now = new Date();
  const tz = user.profile?.timezone ?? null;
  const zone = memberZone(tz);

  const [all, unlocked, xpEvents, ranks, missions, me] = await Promise.all([
    prisma.achievement.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId: user.id }, select: { achievementId: true, unlockedAt: true } }),
    prisma.xpEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.mission.findMany({ where: { active: true }, orderBy: [{ repeatable: "desc" }, { name: "asc" }] }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { xp: true, level: true, rankId: true } }),
  ]);
  const got = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));
  const visible = all.filter((a) => !a.isSecret || got.has(a.id));
  const secretLeft = all.filter((a) => a.isSecret && !got.has(a.id)).length;
  const earned = visible.filter((a) => got.has(a.id)).sort((a, b) => got.get(b.id)!.getTime() - got.get(a.id)!.getTime());
  const locked = visible.filter((a) => !got.has(a.id));

  // Missions with real progress. Weekly = a "week" window; daily = repeatable otherwise.
  const missionRows = await Promise.all(
    missions.map(async (m) => {
      const c = tryParseCriteria(m.criteria);
      const kind: "weekly" | "daily" | "once" = !m.repeatable ? "once" : c?.within === "week" ? "weekly" : "daily";
      // The same bucket the rules engine records the completion under.
      const occurrence = kind === "once" ? "once" : c ? repeatBucket(c, now, tz) : localDayKey(now, tz);
      const [done, have] = await Promise.all([
        prisma.missionCompletion.findUnique({ where: { idempotencyKey: `mission:${m.id}:${user.id}:${occurrence}` }, select: { completedAt: true } }),
        c ? countEvidence(prisma, user.id, c, now, tz) : Promise.resolve(null),
      ]);
      const need = c ? requiredFor(c) : 1;
      const localWeek = kind === "weekly" && !!c && countsStandardDays(c);
      return { m, kind, localWeek, rule: c ? cap(describeCriteria(c)) : m.description, done: !!done, have: have ?? 0, need, measurable: have !== null && need > 1 };
    })
  );
  // Days of the standard are the member's own days, so their week is too.
  const weekly = missionRows.filter((r) => r.kind === "weekly");
  const weeklyNote = weekly.every((r) => r.localWeek)
    ? "Reset every Monday at midnight, your time."
    : weekly.some((r) => r.localWeek)
      ? "Reset every Monday, 00:00 UTC. Days of the standard count Monday to Sunday, your time."
      : "Reset every Monday, 00:00 UTC.";
  const groups = [
    { key: "daily", title: "Daily", note: "Reset at midnight, your time." },
    { key: "weekly", title: "Weekly", note: weeklyNote },
    { key: "once", title: "One-time", note: "Earned once." },
  ] as const;

  const rankIdx = ranks.findIndex((r) => r.id === me.rankId);
  const next = ranks[rankIdx + 1] ?? (rankIdx === -1 ? ranks[0] : undefined);
  const nextXp = next ? xpRequiredForLevel(next.minLevel) : null;

  return (
    <Page>
      <PageHeader
        title="Achievements"
        description="What there is to earn, what you have earned, and where it came from. Only verified work counts; posting and chatting do not."
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="missions">
            <SectionTitle id="missions">Missions</SectionTitle>
            {missionRows.length === 0 ? (
              <p className="text-[14px] text-ink-3">No missions are running right now.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {groups.map((g) => {
                  const rows = missionRows.filter((r) => r.kind === g.key);
                  if (rows.length === 0) return null;
                  return (
                    <div key={g.key}>
                      <p className="mb-2 text-[13px] text-ink-3">
                        <span className="font-semibold text-ink-2">{g.title}</span> · {g.note}
                      </p>
                      <Panel as="ul" className="divide-y divide-line">
                        {rows.map(({ m, rule, done, have, need, measurable }) => (
                          <li key={m.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                            <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border", done ? "border-gold-deep bg-gold/10 text-gold" : "border-line-strong text-ink-3")}>
                              <Icon name={done ? "check" : "mission"} size={13} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14.5px] font-medium text-ink-1">{m.name}</p>
                              <p className="text-[13px] text-ink-3">{rule}</p>
                              {measurable && !done && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Progress value={Math.min(100, Math.round((have / need) * 100))} className="max-w-[200px]" />
                                  <span className="text-[12px] tabular-nums text-ink-3">
                                    {Math.min(have, need)} / {need}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 text-right text-[12.5px] tabular-nums text-ink-3">
                              {done ? (
                                <Badge tone="success">Done</Badge>
                              ) : (
                                <>
                                  {m.xpReward > 0 && <span className="block">{m.xpReward} XP</span>}
                                  {m.thcReward > 0n && <span className="block">{m.thcReward.toString()} THC</span>}
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </Panel>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="earned">
            <SectionTitle id="earned" action={<span className="text-[13px] tabular-nums text-ink-3">{earned.length} of {all.length} earned</span>}>
              Achievements
            </SectionTitle>
            {visible.length === 0 ? (
              <EmptyState icon="trophy" title="No achievements are set up yet." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {earned.map((a) => (
                  <li key={a.id} className="flex gap-3 rounded-lg border border-gold-deep/50 bg-gold/[0.04] p-4">
                    <Icon name="trophy" size={18} className="mt-0.5 shrink-0 text-gold" />
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-ink-1">{a.name}</p>
                      <p className="text-[13px] leading-relaxed text-ink-2">{a.description}</p>
                      <p className="mt-1 text-[12.5px] text-ink-3">Earned {formatDate(got.get(a.id)!, zone)}</p>
                    </div>
                  </li>
                ))}
                {locked.map((a) => {
                  const c = tryParseCriteria(a.criteria);
                  return (
                    <li key={a.id} className="flex gap-3 rounded-lg border border-line bg-bg-1 p-4">
                      <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-ink-3" />
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-semibold text-ink-2">{a.name}</p>
                        <p className="text-[13px] leading-relaxed text-ink-3">{c ? cap(describeCriteria(c)) : a.description}</p>
                        {(a.xpReward > 0 || a.thcReward > 0n) && (
                          <p className="mt-1 text-[12.5px] tabular-nums text-ink-3">
                            {[a.xpReward > 0 ? `${a.xpReward} XP` : null, a.thcReward > 0n ? `${a.thcReward.toString()} THC` : null].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {secretLeft > 0 && <p className="mt-3 text-[13px] text-ink-3">And {secretLeft} hidden {secretLeft === 1 ? "one" : "ones"}, revealed when earned.</p>}
          </section>
        </div>

        <aside className="flex flex-col gap-10">
          <section aria-labelledby="ranks">
            <SectionTitle id="ranks">Rank ladder</SectionTitle>
            <Panel as="ol" className="divide-y divide-line">
              {ranks.map((r, i) => {
                const current = r.id === me.rankId;
                const reached = rankIdx >= i;
                return (
                  <li key={r.id} className={cn("flex items-center gap-3 px-4 py-3", current && "bg-gold/[0.06]")}>
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums", reached ? "border-gold-deep text-gold" : "border-line-strong text-ink-3")}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[14px]", current ? "font-semibold text-ink-1" : reached ? "text-ink-2" : "text-ink-3")}>{r.name}</span>
                      <span className="block text-[12px] tabular-nums text-ink-3">
                        Level {r.minLevel} · {xpRequiredForLevel(r.minLevel).toLocaleString("en-US")} XP
                      </span>
                    </span>
                    {current && <Badge tone="gold">You</Badge>}
                  </li>
                );
              })}
            </Panel>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
              You are level <span className="tabular-nums">{me.level}</span> with <span className="tabular-nums">{me.xp.toLocaleString("en-US")}</span> XP.{" "}
              {next && nextXp !== null ? (
                <>
                  {next.name} needs level {next.minLevel}: <span className="tabular-nums">{Math.max(0, nextXp - me.xp).toLocaleString("en-US")}</span> XP to go.
                </>
              ) : (
                "You hold the top rank."
              )}
            </p>
          </section>

          <section aria-labelledby="history">
            <SectionTitle id="history">XP history</SectionTitle>
            {xpEvents.length === 0 ? (
              <p className="text-[14px] text-ink-3">Nothing yet. Your first lesson writes the first line.</p>
            ) : (
              <Panel as="ul" className="divide-y divide-line">
                {xpEvents.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-ink-1">{e.note ?? SOURCE[e.source] ?? e.source}</span>
                      <span className="block text-[12px] text-ink-3">{formatDay(e.createdAt, zone)}</span>
                    </span>
                    <span className="shrink-0 text-[13.5px] tabular-nums text-gold">+{e.amount}</span>
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
