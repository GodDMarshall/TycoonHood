/**
 * Member dashboard, first cut. Everything here is the member's real state:
 * XP on the real curve, wallet from the ledger, notifications the engines
 * wrote. Phase 6 grows this into the full experience.
 */
import type { Metadata } from "next";
import { requireUser } from "../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SectionRule,
  Stat,
  ThcAmount,
  XpBar,
} from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";
import { dailyCheckInAction } from "../challenges/actions";
import { CheckInButton } from "../../../components/checkin-button";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);

export default async function DashboardPage() {
  await requireUser();
  const user = (await getCurrentUser())!; // layout guarantees

  const [wallet, notifications, openMissions, streak, unlocked, activeEnrollment] = await Promise.all([
    ledger.ensureUserAccount(user.id),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.mission.findMany({
      where: { active: true, repeatable: false, completions: { none: { userId: user.id } } },
      orderBy: { xpReward: "desc" },
      take: 3,
    }),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    }),
    prisma.enrollment.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { enrolledAt: "desc" },
      include: { course: true },
    }),
  ]);

  const floor = xpRequiredForLevel(user.level);
  const next = xpRequiredForLevel(user.level + 1);

  return (
    <main>
      <p className="eyebrow mb-2">Dashboard</p>
      <h1 className="display text-[34px] leading-tight">
        Welcome, {user.profile?.displayName ?? user.name}.
      </h1>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="eyebrow">Streak</p>
                <p className="figures text-[22px]">🔥 {streak?.current ?? 0}<span className="ml-2 text-[12px] text-ink-3">best {streak?.longest ?? 0}</span></p>
              </div>
              {activeEnrollment && (
                <div className="hidden sm:block">
                  <p className="eyebrow">Continue</p>
                  <Link href={`/academy/${activeEnrollment.course.slug}`} className="text-[14px] text-gold hover:underline underline-offset-4">
                    {activeEnrollment.course.title} · {activeEnrollment.progressPct}% →
                  </Link>
                </div>
              )}
            </div>
            <CheckInButton action={dailyCheckInAction} label="Daily check-in · +25 XP +50 THC" />
          </CardContent>
        </Card>
        <Card variant="gold" className="md:col-span-1">
          <CardContent className="py-5">
            <Stat label="Wallet" value={<ThcAmount amount={wallet.balance} size="lg" />} />
            <p className="mt-2 text-[11px] text-ink-3">
              Every movement is on the ledger. Wallet history arrives in Phase 7.
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="py-5">
            <XpBar
              level={user.level}
              currentXp={user.xp}
              levelFloorXp={floor}
              nextLevelXp={next}
            />
            <p className="mt-3 text-[12px] text-ink-3">
              {Math.max(0, next - user.xp).toLocaleString()} XP to level {user.level + 1}.
            </p>
          </CardContent>
        </Card>
      </div>

      <SectionRule label="Open missions" className="mb-5 mt-12" />
      {openMissions.length === 0 ? (
        <p className="text-[14px] text-ink-3">
          All starter missions complete. New missions arrive with Phase 6.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {openMissions.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="text-[15px]">{m.name}</CardTitle>
                <CardDescription>{m.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3 pt-0">
                <Badge tone="gold">+{m.xpReward} XP</Badge>
                <ThcAmount amount={m.thcReward} signed size="sm" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {unlocked.length > 0 && (
        <>
          <SectionRule label="Achievements" className="mb-5 mt-12" />
          <div className="flex flex-wrap gap-2">
            {unlocked.map((ua) => (
              <Badge key={ua.id} tone="gold">🏅 {ua.achievement.name}</Badge>
            ))}
          </div>
        </>
      )}

      <SectionRule label="Recent activity" className="mb-5 mt-12" />
      <Card>
        <CardContent className="flex flex-col py-2">
          {notifications.length === 0 ? (
            <p className="py-4 text-[14px] text-ink-3">
              Nothing yet. Your first completed mission writes the first line.
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[14px] text-ink-1">{n.title}</p>
                  {n.body && <p className="truncate text-[12px] text-ink-3">{n.body}</p>}
                </div>
                <span className="figures shrink-0 text-[11px] uppercase tracking-[0.12em] text-ink-3">
                  {n.type.replace("_", " ")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
