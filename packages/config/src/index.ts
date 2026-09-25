/**
 * Tycoonhood shared constants & flags.
 * Economy parameters live HERE and nowhere else (Blueprint D6/D7).
 * These are seed parameters — changeable before launch, ceremonial after.
 */

/** Total THC ever minted: 1 quadrillion, smallest unit = 1 (no decimals). */
export const THC_TOTAL_SUPPLY = 1_000_000_000_000_000n;

/** Portion of genesis moved into the rewards pool so day-to-day rewards
 *  never touch the treasury directly. (Assumption — see docs/DECISIONS.md) */
export const THC_INITIAL_REWARDS_POOL = 10_000_000_000n; // 10 billion

/** Default XP awards. Course content can override per-lesson. */
export const XP_DEFAULTS = {
  LESSON_COMPLETED: 50,
  COURSE_COMPLETED: 500,
} as const;

/** Cumulative XP required to REACH a level. Level 1 = 0 XP.
 *  Quadratic curve: L2@500, L3@1,500, L4@3,000, L5@5,000 ... L20@95,000. */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return 250 * (level - 1) * level;
}

export const MAX_SEEDED_LEVEL = 50;

/**
 * Dev-mode boundaries (dev mailer, dev payment provider) are OFF by default and
 * fail closed. They activate only with an explicit DEV_MODE="true" AND when the
 * build is not production — so a forgotten flag in production can never hand out
 * reset links on screen or settle card orders for free. See TYCOONHOOD_DECISIONS.md DR-2.
 */
export const isDevMode = () =>
  process.env.DEV_MODE === "true" && process.env.NODE_ENV !== "production";

export { MINING } from "./mining";

/** Treasury → MINING_POOL funding for the first epoch. */
export const THC_MINING_EPOCH_1 = 50_000_000_000n; // 50 billion

/**
 * REFERRALS (spec §17). Signing somebody up pays NOTHING — the reward lands
 * only when the person they brought finishes a lesson. That is the whole
 * anti-farming design: a fake account has to be carried through real study
 * before it is worth anything.
 */
export const REFERRAL = {
  /** Paid to the inviter, once, when their invite qualifies. */
  referrerReward: 2_000n,
  /** Paid to the new member on the same event. */
  referredReward: 1_000n,
} as const;

/**
 * WATCH-TO-EARN. Tasks pay for attention to OUR channel, and the limits
 * exist so attention is what gets paid for.
 *
 * `dailyTaskCap` is the number of watch tasks one member can be paid for in
 * their own local day. `graceSec` is how much less than the required watch
 * time the server will tolerate, to absorb buffering rather than cheating.
 */
export const WATCH = {
  dailyTaskCap: 5,
  graceSec: 5,
  /** Default share of a video that must be watched when a task is authored. */
  defaultRequiredFraction: 0.9,
} as const;

/** Pricing in units of a member's time. Lives here because it is pure
 *  economic policy over MINING — no database, so seeds and the admin UI can
 *  both use it without pulling in the data layer. */
export * from "./mining-time";
