/**
 * The dashboard's extra cards (spec C), loaded in one place. Everything is a
 * query of the member's own rows; a card with nothing real to show gets an
 * empty state, never a zero dressed up as a figure.
 */
import "server-only";
import { prisma } from "@tycoonhood/db";
import { parseCriteria, describeCriteria, profileCompletion, type ProfileCompletion } from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";

export type MissionView = {
  id: string;
  name: string;
  description: string;
  rule: string | null;
  xpReward: number;
  thcReward: bigint;
  cadence: "daily" | "weekly";
  doneThisPeriod: boolean;
};

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

const HOUR = 60 * 60 * 1000;

function cadenceOf(m: { cooldownHours: number | null; criteria: unknown }): "daily" | "weekly" | null {
  if (m.cooldownHours != null) {
    if (m.cooldownHours <= 24) return "daily";
    if (m.cooldownHours <= 24 * 7) return "weekly";
    return null;
  }
  try {
    const within = parseCriteria(m.criteria).within;
    if (within === "24h" || within === "1d") return "daily";
    if (within === "7d" || within === "168h") return "weekly";
  } catch {
    /* malformed rule: not shown */
  }
  return null;
}

export async function loadDashboard(user: {
  id: string;
  xp: number;
  level: number;
  emailVerified: Date | null;
  profile: { displayName: string; username: string; bio: string | null; avatarUrl: string | null; timezone: string | null; goals: string[]; referralCode: string | null } | null;
}) {
  const since7d = new Date(Date.now() - 7 * 24 * HOUR);
  const [missions, completions, affiliate, referralGroups, orders, posts, groupCount, notifications, unread] = await Promise.all([
    prisma.mission.findMany({ where: { active: true, repeatable: true }, orderBy: { name: "asc" } }),
    prisma.missionCompletion.findMany({
      where: { userId: user.id, completedAt: { gte: since7d } },
      select: { missionId: true, completedAt: true },
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
      where: { state: "VISIBLE" },
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
  const missionViews: MissionView[] = [];
  for (const m of missions) {
    const cadence = cadenceOf(m);
    if (!cadence) continue;
    const windowMs = (m.cooldownHours ?? (cadence === "daily" ? 24 : 168)) * HOUR;
    const doneThisPeriod = completions.some((c) => c.missionId === m.id && Date.now() - c.completedAt.getTime() < windowMs);
    let rule: string | null;
    try {
      rule = describeCriteria(parseCriteria(m.criteria));
    } catch {
      rule = null;
    }
    missionViews.push({
      id: m.id,
      name: m.name,
      description: m.description,
      rule,
      xpReward: m.xpReward,
      thcReward: m.thcReward,
      cadence,
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
