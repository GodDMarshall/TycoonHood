/**
 * Everything the optional 3D campus shows, read in one go (DR-30).
 *
 * READ-ONLY. Nothing here creates, updates or upserts: no ensureUserAccount,
 * no MiningService.preview (it creates the rig), no markRead. Opening the
 * campus changes nothing; it only looks.
 *
 * PRIVATE. The result holds the viewer's own figures and house-wide counts
 * (DR-22). Other members are numbers, never people: the week's place comes
 * from standing(), which reads no one else's row.
 *
 * House-wide counts (presence and members per rank) hold nobody's data, so
 * they are kept for 60 seconds per process; `fresh: true` reads them anew.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { StandardService } from "../standard/standard";
import { LeaderboardService } from "../discussions/leaderboard";
import { DiscussionService } from "../discussions/discussions";
import { CommunityService } from "../community/community";
import { CartService } from "../shop/cart";
import { nextLesson } from "../lms/gating";
import {
  WORLD_MAX_PROGRAMS,
  WORLD_STATE_VERSION,
  levelProgress,
  miningView,
  programProgress,
  rankBuckets,
  rankOf,
  type WorldState,
} from "./state";

const DAY_MS = 86_400_000;
export const WORLD_HOUSE_TTL_MS = 60_000;

interface HouseCounts {
  presence: WorldState["presence"];
  ranks: Array<{ rankId: string | null; members: number }>;
}

const houseMemo = new WeakMap<PrismaClient, { at: number; value: Promise<HouseCounts> }>();

/** Counts across the whole house for the 24 hours before `now`. */
async function readHouse(db: PrismaClient, now: Date): Promise<HouseCounts> {
  const since = new Date(now.getTime() - DAY_MS);
  const [standards, lessons, messages, posts, discussions, unlocks, claims, ranks] = await Promise.all([
    // Members, not days: one member can meet two local days inside 24 hours.
    db.$queryRaw<{ n: number }[]>`
      SELECT count(DISTINCT "userId")::int AS n FROM "StandardDay" WHERE "metAt" >= ${since}`,
    db.lessonProgress.count({ where: { completedAt: { gte: since } } }),
    db.message.count({
      where: { createdAt: { gte: since }, deletedAt: null, channel: { courseId: null, archivedAt: null } },
    }),
    db.communityPost.count({ where: { state: "VISIBLE", createdAt: { gte: since } } }),
    // The posts a member sees in the discussions feed: no group posts, no archived categories.
    new DiscussionService(db).archived().then(({ categories }) =>
      db.communityPost.count({
        where: {
          state: "VISIBLE",
          groupId: null,
          createdAt: { gte: since },
          ...(categories.length ? { OR: [{ categoryId: null }, { categoryId: { notIn: categories } }] } : {}),
        },
      })
    ),
    db.userAchievement.count({ where: { unlockedAt: { gte: since } } }),
    db.ledgerTransaction.count({ where: { reason: "REWARD_MINING", status: "POSTED", createdAt: { gte: since } } }),
    db.user.groupBy({
      by: ["rankId"],
      where: { suspendedAt: null, profile: { onboardedAt: { not: null } } },
      _count: { _all: true },
    }),
  ]);
  return {
    presence: {
      today: Number(standards[0]?.n ?? 0),
      courses: lessons,
      community: messages + posts,
      leaderboard: unlocks,
      mining: claims,
      store: null,
      discussions,
    },
    ranks: ranks.map((r) => ({ rankId: r.rankId, members: r._count._all })),
  };
}

function houseCounts(db: PrismaClient, now: Date, fresh: boolean): Promise<HouseCounts> {
  const at = now.getTime();
  const hit = fresh ? undefined : houseMemo.get(db);
  if (hit && at >= hit.at && at - hit.at < WORLD_HOUSE_TTL_MS) return hit.value;
  const value = readHouse(db, now);
  houseMemo.set(db, { at, value });
  // A failed read is not remembered.
  value.catch(() => {
    if (houseMemo.get(db)?.value === value) houseMemo.delete(db);
  });
  return value;
}

/**
 * `unread` is the member's unread total when the caller already has it (the
 * web app's sidebar reads the same figure), so it is worked out once.
 */
export async function loadWorldState(
  userId: string,
  opts: { now?: Date; db?: PrismaClient; fresh?: boolean; unread?: number } = {}
): Promise<WorldState> {
  const db = opts.db ?? defaultPrisma;
  const now = opts.now ?? new Date();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, rankId: true, role: true, createdAt: true },
  });
  if (!user) throw new Error("World state: no such member.");

  const [
    rankDefs,
    standardToday,
    streak,
    enrollments,
    certificates,
    unread,
    challengesJoined,
    week,
    achievementList,
    unlocked,
    miner,
    wallet,
    cartCount,
    wishlist,
    orders,
    affiliate,
    house,
  ] = await Promise.all([
    db.rankDefinition.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, sortOrder: true } }),
    new StandardService(db).today(userId, now),
    db.streak.findUnique({ where: { userId }, select: { current: true, longest: true } }),
    db.enrollment.findMany({
      where: { userId, status: { in: ["ACTIVE", "COMPLETED"] }, course: { status: "PUBLISHED" } },
      select: {
        enrolledAt: true,
        course: {
          select: {
            slug: true,
            title: true,
            pillar: true,
            modules: {
              select: {
                sortOrder: true,
                // Never contentMd: titles and order are all the campus needs.
                lessons: {
                  select: {
                    id: true,
                    title: true,
                    sortOrder: true,
                    progress: { where: { userId }, select: { completedAt: true, updatedAt: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.certificate.count({ where: { userId } }),
    opts.unread ?? new CommunityService(db).unreadTotal({ id: userId, role: user.role }, user.createdAt),
    db.challengeParticipation.count({ where: { userId, status: "JOINED" } }),
    new LeaderboardService(db).standing(userId, "week", now),
    db.achievement.findMany({ where: { active: true }, select: { id: true, isSecret: true } }),
    db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
    db.minerState.findUnique({ where: { userId }, select: { rigLevel: true, lastClaimAt: true } }),
    db.ledgerAccount.findUnique({ where: { userId }, select: { balance: true } }),
    new CartService(db).count(userId),
    db.wishlistItem.count({ where: { userId } }),
    db.order.count({ where: { userId, status: { in: ["PAID", "FULFILLED"] } } }),
    db.affiliateProfile.findUnique({ where: { userId }, select: { status: true } }),
    houseCounts(db, now, opts.fresh === true),
  ]);

  // Programs, gated the same way as the course pages (DR-25).
  const programs = enrollments.map((e) => {
    const lessons = e.course.modules.flatMap((m) =>
      m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        sortOrder: l.sortOrder,
        moduleSortOrder: m.sortOrder,
        completed: !!l.progress[0]?.completedAt,
        touched: l.progress[0]?.updatedAt.getTime() ?? null,
      }))
    );
    const touched = lessons.reduce<number | null>((t, l) => (l.touched !== null && (t === null || l.touched > t) ? l.touched : t), null);
    return {
      course: e.course,
      enrolledAt: e.enrolledAt.getTime(),
      touched,
      next: nextLesson(lessons),
      ...programProgress(lessons.filter((l) => l.completed).length, lessons.length),
    };
  });

  // Where to pick up, as on Today: the open program touched most recently,
  // else the newest enrolment.
  const open = programs.filter((p) => p.next);
  const continueWith =
    open.filter((p) => p.touched !== null).sort((a, b) => b.touched! - a.touched!)[0] ??
    [...open].sort((a, b) => b.enrolledAt - a.enrolledAt)[0] ??
    null;

  const recent = [...programs]
    .sort((a, b) => Math.max(b.touched ?? 0, b.enrolledAt) - Math.max(a.touched ?? 0, a.enrolledAt))
    .slice(0, WORLD_MAX_PROGRAMS);

  // The Achievements page's rule: secret ones count once earned.
  const got = new Set(unlocked.map((u) => u.achievementId));
  const shown = achievementList.filter((a) => !a.isSecret || got.has(a.id));

  return {
    v: WORLD_STATE_VERSION,
    asOf: now.toISOString(),
    me: { ...levelProgress(user.xp, user.level), rank: rankOf(rankDefs, user.rankId) },
    today: {
      standard: { ticked: standardToday.ticked, total: standardToday.total, met: standardToday.met },
      streak: { current: streak?.current ?? 0, longest: streak?.longest ?? 0 },
      next:
        continueWith && continueWith.next
          ? {
              slug: continueWith.course.slug,
              course: continueWith.course.title,
              lessonId: continueWith.next.id,
              lesson: continueWith.next.title,
            }
          : null,
    },
    courses: {
      programs: recent.map((p) => ({
        slug: p.course.slug,
        title: p.course.title,
        pillar: p.course.pillar,
        done: p.done,
        lessons: p.lessons,
        pct: p.pct,
        next: p.next ? { lessonId: p.next.id, lesson: p.next.title } : null,
      })),
      certificates,
    },
    community: { unread, challengesJoined },
    leaderboard: {
      week: { hidden: week.hidden, xp: week.xp, position: week.position },
      achievements: { earned: shown.filter((a) => got.has(a.id)).length, shown: shown.length },
      ranks: rankBuckets(rankDefs, house.ranks, user.rankId),
    },
    mining: miningView(miner, wallet?.balance ?? null, now),
    store: { cart: cartCount, wishlist, orders, affiliate: affiliate?.status ?? "NONE" },
    presence: { ...house.presence },
  };
}
