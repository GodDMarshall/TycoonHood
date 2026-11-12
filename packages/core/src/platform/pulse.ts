/**
 * THE PULSE: real counts across the whole house for the 24 hours before `now`.
 *
 * Members who met the standard, lessons completed, chat messages and posts,
 * posts in the discussions feed, achievements unlocked, mining claims, and
 * members per rank. Every figure is counted from real rows, read in one go;
 * none is estimated or padded. They are house-wide numbers that hold nobody's
 * data (DR-22), so any page may show them.
 *
 * READ-ONLY: nothing here creates, updates or upserts.
 *
 * Moved here from world/load.ts (the 3D campus, DR-31), which still calls it
 * and keeps its own 60-second memo around it. HOME owns this file now
 * (docs/ECOSYSTEM_PLAN.md W1.4).
 */
import type { PrismaClient } from "@tycoonhood/db";
import { PostService } from "../discussions/posts";
import type { WorldState } from "../world/state";

const DAY_MS = 86_400_000;

/** House-wide counts: activity per area (as the campus shows it) and members per rank. */
export interface Pulse {
  presence: WorldState["presence"];
  ranks: Array<{ rankId: string | null; members: number }>;
}

/** Counts across the whole house for the 24 hours before `now`. */
export async function readPulse(db: PrismaClient, now: Date): Promise<Pulse> {
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
    new PostService(db).archived().then(({ categories }) =>
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
