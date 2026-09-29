/**
 * Everything the world shows, for one member, in one serializable object.
 *
 * Server-only. Called from the /world page after requireUser(), so it is
 * authorized at the point the data is read (DR-3). It contains only:
 *   - the member's own state,
 *   - public catalogue data (programs, challenges, live Vault items),
 *   - public ledger figures (the same ones /thc and /status show),
 *   - the leaderboard exactly as challenges.leaderboard() exposes it
 *     (which honours each member's privacy flags),
 *   - presence: 24-hour COUNTS per district — never who.
 * BigInts are strings so the object crosses to the client untouched.
 */
import "server-only";
import { prisma } from "@tycoonhood/db";
import { LedgerService, challenges as challengeService, priceInTime } from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";
import type { requireUser } from "./guard";

type Member = Awaited<ReturnType<typeof requireUser>>;
const ledger = new LedgerService(prisma);
const DAY = 86_400_000;

function objectiveOf(criteria: unknown) {
  const c = (criteria ?? {}) as { event?: string; consecutiveDays?: number; gates?: number };
  if (c.event === "DAILY_CHECKIN") return `Check in ${c.consecutiveDays ?? 1} days in a row.`;
  if (c.event === "GATED_SUBMISSIONS") return `${c.gates ?? 1} pieces of evidence, each approved by a reviewer.`;
  if (c.event === "SUBMISSION") return "Submit your work for review.";
  return "Complete the stated objective within the window.";
}

export async function getWorldState(user: Member) {
  const now = new Date();
  const since = new Date(now.getTime() - DAY);

  const [
    wallet,
    streak,
    ranks,
    daily,
    openMissions,
    courses,
    challengeRows,
    products,
    accounts,
    circulating,
    top,
    byRank,
    notifications,
    pLessons,
    pJoins,
    pOrders,
    pMining,
    pRankUps,
    pMissions,
  ] = await Promise.all([
    ledger.ensureUserAccount(user.id),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.mission.findFirst({
      where: { active: true, repeatable: true, criteria: { path: ["event"], equals: "DAILY_ACTIVE" } },
      include: { completions: { where: { userId: user.id }, orderBy: { completedAt: "desc" }, take: 1 } },
    }),
    prisma.mission.findMany({
      where: { active: true, repeatable: false, completions: { none: { userId: user.id } } },
      orderBy: { xpReward: "desc" },
      take: 1,
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      include: {
        enrollments: { where: { userId: user.id } },
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
    }),
    prisma.challenge.findMany({
      where: { lifecycle: { in: ["ACTIVE", "UPCOMING"] } },
      orderBy: [{ lifecycle: "asc" }, { startsAt: "asc" }],
      take: 5,
      include: {
        participations: { where: { userId: user.id } },
        _count: { select: { participations: { where: { status: { in: ["JOINED", "COMPLETED"] } } } } },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      take: 6,
      include: { variants: { where: { active: true } } },
    }),
    prisma.ledgerAccount.findMany({ where: { type: { in: ["SYSTEM_MINT", "REWARDS_POOL", "MINING_POOL", "REVENUE"] } } }),
    ledger.circulatingSupply(),
    challengeService.leaderboard(6),
    prisma.user.groupBy({ by: ["rankId"], where: { role: "MEMBER", profile: { isNot: null } }, _count: { _all: true } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.lessonProgress.count({ where: { completedAt: { gte: since } } }),
    prisma.challengeParticipation.count({ where: { joinedAt: { gte: since } } }),
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.ledgerTransaction.count({ where: { reason: "REWARD_MINING", createdAt: { gte: since } } }),
    prisma.notification.count({ where: { type: "RANK_UP", createdAt: { gte: since } } }),
    prisma.missionCompletion.count({ where: { completedAt: { gte: since } } }),
  ]);

  const bal = (t: string) => accounts.find((a) => a.type === t)?.balance ?? 0n;
  const rankIndex = Math.max(0, ranks.findIndex((r) => r.id === user.rank?.id));
  const nextRank = ranks[rankIndex + 1] ?? null;
  const lastCheckIn = daily?.completions[0]?.completedAt ?? null;
  const reopens = lastCheckIn && daily?.cooldownHours ? lastCheckIn.getTime() + daily.cooldownHours * 3600_000 : 0;
  const nextMission = openMissions[0] ?? null;

  const programs = courses.map((c) => {
    const e = c.enrollments[0] ?? null;
    const lessons = c.modules.flatMap((m) => m.lessons);
    const next = lessons.find((l) => !l.progress[0]?.completedAt) ?? null;
    return {
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle ?? "",
      pillar: c.pillar as "WARRIOR" | "BUILDER" | "TYCOON" | "MIND",
      enrolled: !!e,
      pct: e?.progressPct ?? 0,
      lessons: lessons.length,
      done: lessons.filter((l) => l.progress[0]?.completedAt).length,
      next: next ? { id: next.id, title: next.title } : null,
      xpOnCompletion: c.xpOnCompletion,
    };
  });
  const active = programs.find((p) => p.enrolled && p.next && p.pct < 100) ?? null;

  return {
    now: now.toISOString(),
    member: {
      name: user.profile?.displayName ?? user.name ?? "Member",
      username: user.profile?.username ?? null,
      isAdmin: user.role === "ADMIN",
      rank: { name: user.rank?.name.replace(/^Tycoon\s+/, "") ?? "—", index: rankIndex, total: ranks.length, slug: user.rank?.slug ?? null },
      level: user.level,
      xp: user.xp,
      xpFloor: xpRequiredForLevel(user.level),
      xpNext: xpRequiredForLevel(user.level + 1),
      nextRank: nextRank
        ? { name: nextRank.name.replace(/^Tycoon\s+/, ""), level: nextRank.minLevel, xpToGo: Math.max(0, xpRequiredForLevel(nextRank.minLevel) - user.xp) }
        : null,
      streak: { current: streak?.current ?? 0, longest: streak?.longest ?? 0 },
      wallet: wallet.balance.toString(),
      goals: user.profile?.goals ?? [],
    },
    today: {
      daily: daily ? { name: daily.name, description: daily.description, xp: daily.xpReward, thc: daily.thcReward.toString() } : null,
      open: !!daily && (!reopens || reopens <= now.getTime()),
      hoursLeft: reopens ? Math.max(0, Math.ceil((reopens - now.getTime()) / 3600_000)) : 0,
      nextMission: nextMission
        ? {
            name: nextMission.name,
            description: nextMission.description,
            xp: nextMission.xpReward,
            thc: nextMission.thcReward.toString(),
            event: ((nextMission.criteria as { event?: string } | null)?.event ?? "") as string,
          }
        : null,
      continue: active && active.next ? { slug: active.slug, title: active.title, lessonId: active.next.id, lessonTitle: active.next.title, pct: active.pct } : null,
    },
    programs,
    challenges: challengeRows.map((c) => {
      const p = c.participations[0] ?? null;
      const left = c.endsAt ? Math.ceil((c.endsAt.getTime() - now.getTime()) / DAY) : null;
      const opens = c.startsAt ? Math.ceil((c.startsAt.getTime() - now.getTime()) / DAY) : null;
      return {
        slug: c.slug,
        name: c.name,
        pillar: c.pillar,
        live: c.lifecycle === "ACTIVE",
        window: c.lifecycle === "ACTIVE" ? (left != null ? `${Math.max(0, left)} days left` : "Open") : opens != null ? `Opens in ${Math.max(0, opens)} days` : "Opening soon",
        objective: objectiveOf(c.criteria),
        xp: c.xpReward,
        thc: c.thcReward.toString(),
        entered: c._count.participations,
        status: p?.status ?? null,
      };
    }),
    vault: products.map((p) => {
      const stock = p.variants.length ? p.variants.reduce((t, v) => t + v.inventory, 0) : p.inventory;
      return {
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        priceThc: p.priceThc?.toString() ?? null,
        priceFiat: p.priceFiatCents,
        stock,
        time: p.kind === "PHYSICAL" && p.priceThc != null ? priceInTime(p.priceThc).summary : null,
      };
    }),
    treasury: {
      supply: (-bal("SYSTEM_MINT")).toString(),
      circulating: circulating.toString(),
      rewardsPool: bal("REWARDS_POOL").toString(),
      miningPool: bal("MINING_POOL").toString(),
      revenue: bal("REVENUE").toString(),
      wallet: wallet.balance.toString(),
    },
    network: {
      top: top.map((r) => ({ username: r.username, displayName: r.displayName, rankSlug: r.rankSlug, xp: r.xp, level: r.level, position: r.position })),
      ranks: ranks.map((r) => ({ name: r.name.replace(/^Tycoon\s+/, ""), count: byRank.find((g) => g.rankId === r.id)?._count._all ?? 0 })),
      youIndex: rankIndex,
      me: user.profile?.username ?? null,
    },
    record: notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, at: n.createdAt.toISOString() })),
    presence: {
      academy: pLessons,
      arena: pJoins,
      vault: pOrders,
      treasury: pMining,
      network: pRankUps,
      command: pMissions,
    },
  };
}

export type WorldState = Awaited<ReturnType<typeof getWorldState>>;
