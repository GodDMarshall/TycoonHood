/**
 * WORLD STATE v1: what the optional 3D campus at /world shows (DR-31).
 *
 * One JSON-safe object: bigints travel as decimal strings and dates as ISO
 * strings. It holds the viewer's own figures and house-wide counts, and
 * never anyone's id, name, username, avatar or email, the viewer's
 * included. Fields may be added within v1; renaming or removing one bumps
 * `v`, and a host that sees an unknown `v` renders only the 2D page.
 *
 * The shapers below are pure: no Prisma and no DOM, so tests can hold them
 * to the rules without a database.
 */
import type { AffiliateStatus, Pillar } from "@tycoonhood/db";
import { MINING, capacity, ratePerHour, xpRequiredForLevel } from "@tycoonhood/config";

export const WORLD_STATE_VERSION = 1;

/** The six buildings, in walking order. */
export const BUILDING_IDS = ["today", "courses", "community", "leaderboard", "mining", "store"] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

/** At most this many programs are shown, most recently active first. */
export const WORLD_MAX_PROGRAMS = 6;

export interface WorldState {
  v: typeof WORLD_STATE_VERSION;
  asOf: string;
  me: {
    level: number;
    xp: number;
    /** XP at which the current level began. */
    xpFloor: number;
    /** XP at which the next level begins. */
    xpNext: number;
    /** `index` is the rank's 1-based place on the ladder of `total` ranks. */
    rank: { name: string; index: number; total: number } | null;
  };
  today: {
    standard: { ticked: number; total: number; met: boolean };
    streak: { current: number; longest: number };
    /** The next open lesson to continue (DR-25), or null. */
    next: { slug: string; course: string; lessonId: string; lesson: string } | null;
  };
  courses: {
    programs: Array<{
      slug: string;
      title: string;
      pillar: Pillar;
      done: number;
      lessons: number;
      pct: number;
      next: { lessonId: string; lesson: string } | null;
    }>;
    certificates: number;
  };
  community: { unread: number; challengesJoined: number };
  leaderboard: {
    week: { hidden: boolean; xp: number; position: number | null };
    achievements: { earned: number; shown: number };
    ranks: Array<{ name: string; members: number; you: boolean }>;
  };
  mining: {
    started: boolean;
    rigLevel: number;
    maxLevel: number;
    ratePerHour: string;
    capacity: string;
    accrued: string;
    full: boolean;
    wallet: string;
  };
  store: { cart: number; wishlist: number; orders: number; affiliate: "NONE" | AffiliateStatus };
  /**
   * House-wide counts for the last 24 hours. The store never shows one.
   * community counts chat messages and every post; discussions only the
   * posts in the main discussions feed.
   */
  presence: { today: number; courses: number; community: number; leaderboard: number; mining: number; store: null; discussions: number };
}

export function levelProgress(xp: number, level: number): Omit<WorldState["me"], "rank"> {
  return { level, xp, xpFloor: xpRequiredForLevel(level), xpNext: xpRequiredForLevel(level + 1) };
}

export function programProgress(done: number, lessons: number): { done: number; lessons: number; pct: number } {
  const total = Math.max(0, lessons);
  const d = Math.min(Math.max(0, done), total);
  return { done: d, lessons: total, pct: total ? Math.round((d * 100) / total) : 0 };
}

/**
 * The rig as the campus shows it. The same sums as MiningService (rate,
 * storage, accrual capped at storage), from the same MINING config, without
 * MiningService.preview, which creates rows.
 */
export function miningView(
  state: { rigLevel: number; lastClaimAt: Date } | null,
  balance: bigint | null,
  now: Date
): WorldState["mining"] {
  const level = state?.rigLevel ?? 1;
  const rate = ratePerHour(level);
  const cap = capacity(level);
  let accrued = 0n;
  if (state) {
    const elapsedMs = BigInt(Math.max(0, now.getTime() - state.lastClaimAt.getTime()));
    const raw = (rate * elapsedMs) / 3_600_000n;
    accrued = raw > cap ? cap : raw;
  }
  return {
    started: state !== null,
    rigLevel: level,
    maxLevel: MINING.maxLevel,
    ratePerHour: rate.toString(),
    capacity: cap.toString(),
    accrued: accrued.toString(),
    full: accrued >= cap,
    wallet: (balance ?? 0n).toString(),
  };
}

type RankDef = { id: string; name: string; sortOrder: number };

/** The viewer's rank on the ladder, or null when they have none yet. */
export function rankOf(defs: RankDef[], rankId: string | null): WorldState["me"]["rank"] {
  if (!rankId) return null;
  const ladder = [...defs].sort((a, b) => a.sortOrder - b.sortOrder);
  const at = ladder.findIndex((d) => d.id === rankId);
  return at < 0 ? null : { name: ladder[at].name, index: at + 1, total: ladder.length };
}

/**
 * How many members hold each rank, every rank listed in ladder order.
 * Members without a rank are left out, and so is any rank id that no longer
 * exists. `you` marks the viewer's own rank.
 */
export function rankBuckets(
  defs: RankDef[],
  groups: Array<{ rankId: string | null; members: number }>,
  myRankId: string | null
): WorldState["leaderboard"]["ranks"] {
  const counts = new Map<string, number>();
  for (const g of groups) if (g.rankId) counts.set(g.rankId, (counts.get(g.rankId) ?? 0) + g.members);
  return [...defs]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => {
      const you = myRankId !== null && d.id === myRankId;
      const members = counts.get(d.id) ?? 0;
      // The counts can be a minute old and the member's rank never is: just after
      // a rank-up their new rank holds at least them.
      return { name: d.name, members: you ? Math.max(1, members) : members, you };
    });
}
