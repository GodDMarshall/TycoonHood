/**
 * LEADERBOARD — weekly and all-time XP, summed from the XpEvent log.
 *
 * XP comes only from verified work (lessons, quizzes, programs, missions,
 * achievements). Nothing in discussions or chat writes XP, so the board
 * cannot be climbed by talking.
 *
 * Privacy: Profile.privacy.leaderboard. Missing means visible; `false` means the
 * member is left off the board for everyone, and sees themselves as hidden.
 * Suspended members never appear.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { weekStart } from "../rules/criteria";

export const LEADERBOARD_SIZE = 50;
export type LeaderboardPeriod = "week" | "all";

export interface LeaderboardRow {
  position: number;
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  rank: string | null;
  xp: number;
  me: boolean;
}

export interface Leaderboard {
  period: LeaderboardPeriod;
  since: string | null;
  rows: LeaderboardRow[];
  /** The viewer: their position (null if no XP in the period), or hidden. */
  viewer: { hidden: boolean; xp: number; position: number | null };
}

/** True unless the member explicitly opted out. */
export function onLeaderboard(privacy: unknown): boolean {
  if (!privacy || typeof privacy !== "object" || Array.isArray(privacy)) return true;
  return (privacy as Record<string, unknown>).leaderboard !== false;
}

/** The period's bounds: this week from Monday, or all time. */
function span(period: LeaderboardPeriod, now: Date): { since: Date; until: Date } {
  const since = period === "week" ? weekStart(now) : new Date(0);
  const until = period === "week" ? new Date(since.getTime() + 7 * 86_400_000) : new Date("9999-12-31T00:00:00Z");
  return { since, until };
}

export class LeaderboardService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async board(viewerId: string | null, period: LeaderboardPeriod, now = new Date(), size = LEADERBOARD_SIZE): Promise<Leaderboard> {
    const { since, until } = span(period, now);
    const limit = Math.min(Math.max(size, 1), 200);

    const top = await this.db.$queryRaw<{ userId: string; xp: number }[]>`
      SELECT e."userId", SUM(e.amount)::int AS xp
      FROM "XpEvent" e
      JOIN "User" u ON u.id = e."userId"
      LEFT JOIN "Profile" p ON p."userId" = u.id
      WHERE u."suspendedAt" IS NULL
        AND e."createdAt" >= ${since} AND e."createdAt" < ${until}
        AND (p.privacy ->> 'leaderboard') IS DISTINCT FROM 'false'
      GROUP BY e."userId"
      HAVING SUM(e.amount) > 0
      ORDER BY xp DESC, MAX(e."createdAt") ASC, e."userId" ASC
      LIMIT ${limit}`;

    const people = await this.db.user.findMany({
      where: { id: { in: top.map((t) => t.userId) } },
      select: {
        id: true,
        name: true,
        rank: { select: { name: true } },
        profile: { select: { displayName: true, username: true, avatarUrl: true } },
      },
    });
    const byId = new Map(people.map((p) => [p.id, p]));

    // Standard competition ranking: equal XP shares a position.
    const rows: LeaderboardRow[] = [];
    top.forEach((t, i) => {
      const xp = Number(t.xp);
      const position = i > 0 && rows[i - 1].xp === xp ? rows[i - 1].position : i + 1;
      const p = byId.get(t.userId);
      rows.push({
        position,
        userId: t.userId,
        name: p?.profile?.displayName ?? p?.name ?? "Member",
        username: p?.profile?.username ?? null,
        avatarUrl: p?.profile?.avatarUrl ?? null,
        rank: p?.rank?.name ?? null,
        xp,
        me: t.userId === viewerId,
      });
    });

    const viewer = viewerId ? await this.viewerStanding(viewerId, since, until) : { hidden: false, xp: 0, position: null };
    return { period, since: period === "week" ? since.toISOString() : null, rows, viewer };
  }

  /**
   * The viewer's own place only, the same figures as board().viewer: no top
   * rows and nobody else's identity, for pages that show the viewer alone.
   */
  async standing(viewerId: string, period: LeaderboardPeriod, now = new Date()): Promise<Leaderboard["viewer"]> {
    const { since, until } = span(period, now);
    return this.viewerStanding(viewerId, since, until);
  }

  private async viewerStanding(viewerId: string, since: Date, until: Date): Promise<Leaderboard["viewer"]> {
    const profile = await this.db.profile.findUnique({ where: { userId: viewerId }, select: { privacy: true } });
    const mine = await this.db.xpEvent.aggregate({
      where: { userId: viewerId, createdAt: { gte: since, lt: until } },
      _sum: { amount: true },
    });
    const xp = mine._sum.amount ?? 0;
    if (!onLeaderboard(profile?.privacy)) return { hidden: true, xp, position: null };
    if (!(xp > 0)) return { hidden: false, xp: 0, position: null };
    const ahead = await this.db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM (
        SELECT e."userId"
        FROM "XpEvent" e
        JOIN "User" u ON u.id = e."userId"
        LEFT JOIN "Profile" p ON p."userId" = u.id
        WHERE u."suspendedAt" IS NULL
          AND e."createdAt" >= ${since} AND e."createdAt" < ${until}
          AND (p.privacy ->> 'leaderboard') IS DISTINCT FROM 'false'
        GROUP BY e."userId"
        HAVING SUM(e.amount) > ${xp}
      ) t`;
    return { hidden: false, xp, position: Number(ahead[0]?.n ?? 0) + 1 };
  }
}

export const leaderboard = new LeaderboardService();
