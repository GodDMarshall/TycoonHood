/**
 * The dashboard's extra cards (spec C), loaded in one place. Everything is a
 * query of the member's own rows; a card with nothing real to show gets an
 * empty state, never a zero dressed up as a figure.
 */
import "server-only";
import { prisma } from "@tycoonhood/db";
import {
  countsStandardDays,
  describeCriteria,
  discussions,
  missionCadence,
  openPostWhere,
  profileCompletion,
  repeatBucket,
  tryParseCriteria,
  type ProfileCompletion,
} from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";

export type MissionView = {
  id: string;
  name: string;
  description: string;
  rule: string | null;
  xpReward: number;
  thcReward: bigint;
  cadence: "daily" | "weekly";
  /** Resets on Monday (a calendar week), rather than 7 days after completion. */
  calendarWeek: boolean;
  /** A calendar week of standard days: the member's own Monday, not UTC's. */
  localWeek: boolean;
  doneThisPeriod: boolean;
};

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

const HOUR = 60 * 60 * 1000;

export async function loadDashboard(user: {
  id: string;
  xp: number;
  level: number;
  emailVerified: Date | null;
  profile: { displayName: string; username: string; bio: string | null; avatarUrl: string | null; timezone: string | null; goals: string[]; referralCode: string | null } | null;
}) {
  const now = new Date();
  // Covers a rolling week and the whole calendar week (its Monday may be up
  // to a day further back in the member's zone).
  const since8d = new Date(now.getTime() - 8 * 24 * HOUR);
  // Posts in archived groups and categories are closed, so they stay off Today.
  const archive = await discussions.archived();
  const [missions, completions, affiliate, referralGroups, orders, posts, groupCount, notifications, unread] = await Promise.all([
    prisma.mission.findMany({ where: { active: true, repeatable: true }, orderBy: { name: "asc" } }),
    prisma.missionCompletion.findMany({
      where: { userId: user.id, completedAt: { gte: since8d } },
      select: { missionId: true, completedAt: true, idempotencyKey: true },
    }),
    prisma.affiliateProfile.findUnique({ where: { userId: user.id }, select: { id: true, status: true, code: true } }),
    prisma.referral.groupBy({ by: ["status"], where: { referrerId: user.id }, _count: { _all: true } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, status: true, createdAt: true, totalThc: true, totalFiatCents: true, fiatCurrency: true, _count: { select: { items: true } } },
    }),
    prisma.communityPost.findMany({
      where: openPostWhere(archive),
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        createdAt: true,
        commentCount: true,
        author: { select: { name: true, profile: { select: { displayName: true } } } },
        group: { select: { name: true } },
      },
    }),
    prisma.groupMembership.count({ where: { userId: user.id } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, title: true, body: true, readAt: true, createdAt: true, data: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  // ─ Missions: repeatable ones that reset daily or weekly.
  const tz = user.profile?.timezone ?? null;
  const missionViews: MissionView[] = [];
  for (const m of missions) {
    const cadence = missionCadence(m);
    if (!cadence) continue;
    const c = tryParseCriteria(m.criteria);
    const calendarWeek = c?.within === "week";
    // A calendar-week mission is done when this week's completion exists,
    // under the key the rules engine wrote; the rest count back from now.
    const thisWeek = calendarWeek && c ? `mission:${m.id}:${user.id}:${repeatBucket(c, now, tz)}` : null;
    const windowMs = (m.cooldownHours ?? (cadence === "daily" ? 24 : 168)) * HOUR;
    const doneThisPeriod = completions.some((x) =>
      thisWeek ? x.idempotencyKey === thisWeek : x.missionId === m.id && now.getTime() - x.completedAt.getTime() < windowMs
    );
    missionViews.push({
      id: m.id,
      name: m.name,
      description: m.description,
      rule: c ? describeCriteria(c) : null,
      xpReward: m.xpReward,
      thcReward: m.thcReward,
      cadence,
      calendarWeek,
      localWeek: calendarWeek && !!c && countsStandardDays(c),
      doneThisPeriod,
    });
  }

  // ─ Earnings: a summary only, and only for members in the programme.
  let earnings: null | {
    status: string;
    code: string;
    byStatus: { status: string; currency: string; amountCents: number; count: number }[];
  } = null;
  if (affiliate) {
    const groups = await prisma.commission.groupBy({
      by: ["status", "currency"],
      where: { affiliateId: affiliate.id },
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    earnings = {
      status: affiliate.status,
      code: affiliate.code,
      byStatus: groups.map((g) => ({ status: g.status, currency: g.currency, amountCents: g._sum.amountCents ?? 0, count: g._count._all })),
    };
  }

  const referrals = {
    pending: referralGroups.find((g) => g.status === "PENDING")?._count._all ?? 0,
    qualified: referralGroups.find((g) => g.status === "QUALIFIED")?._count._all ?? 0,
    code: user.profile?.referralCode ?? null,
  };

  const completion: ProfileCompletion = profileCompletion({ emailVerified: user.emailVerified, profile: user.profile });

  const floor = xpRequiredForLevel(user.level);
  const nextXp = xpRequiredForLevel(user.level + 1);

  return {
    completion,
    xp: { current: user.xp, level: user.level, floor, next: nextXp },
    missions: missionViews,
    earnings,
    affiliateStatus: affiliate?.status ?? null,
    referrals,
    orders,
    posts,
    groupCount,
    notifications,
    unread,
  };
}
