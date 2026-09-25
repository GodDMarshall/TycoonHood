/**
 * THE CRITERIA DSL (spec §17)
 *
 * Missions and achievements carry their rule as data, in `criteria` JSON.
 * Until now nothing read it: three hard-coded slugs paid out and every other
 * seeded mission was decoration. This is the shape the engine understands.
 *
 * Versioned from the start (`v`), because rules outlive code and a row written
 * today must still be readable when the vocabulary grows.
 */
import { DOMAIN_EVENTS, isDomainEventType, type DomainEventType } from "../events/types";

export type Pillar = "WARRIOR" | "BUILDER" | "TYCOON" | "MIND";

export interface Criteria {
  /** Schema version. Absent means 1. */
  v?: 1;
  /** Which event can satisfy this rule. */
  event: DomainEventType;
  /** How many qualifying occurrences are needed. Default 1. */
  count?: number;
  /** Rolling window the count must fall inside: "24h", "7d", "30d". */
  within?: string;
  /** Narrowing. Not every event supports every facet; unsupported ones are ignored. */
  scope?: { pillar?: Pillar; courseId?: string };
  /** STREAK only: consecutive local days required. */
  days?: number;
  /** QUIZ_PASSED only: minimum score percent. */
  minScore?: number;
}

export class InvalidCriteriaError extends Error {}

const WINDOW = /^(\d+)([hd])$/;

/** Parse + validate a `criteria` JSON blob. Throws on anything malformed. */
export function parseCriteria(raw: unknown): Criteria {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new InvalidCriteriaError("criteria must be an object");
  }
  const c = raw as Record<string, unknown>;

  if (c.v !== undefined && c.v !== 1) {
    throw new InvalidCriteriaError(`unsupported criteria version ${String(c.v)}`);
  }
  if (!isDomainEventType(c.event)) {
    throw new InvalidCriteriaError(
      `criteria.event must be one of: ${DOMAIN_EVENTS.join(", ")} (got ${String(c.event)})`
    );
  }
  const out: Criteria = { v: 1, event: c.event };

  if (c.count !== undefined) {
    if (!Number.isInteger(c.count) || (c.count as number) < 1) {
      throw new InvalidCriteriaError("criteria.count must be a positive integer");
    }
    out.count = c.count as number;
  }
  if (c.within !== undefined) {
    if (typeof c.within !== "string" || !WINDOW.test(c.within)) {
      throw new InvalidCriteriaError('criteria.within must look like "24h" or "7d"');
    }
    out.within = c.within;
  }
  if (c.days !== undefined) {
    if (!Number.isInteger(c.days) || (c.days as number) < 1) {
      throw new InvalidCriteriaError("criteria.days must be a positive integer");
    }
    out.days = c.days as number;
  }
  if (c.minScore !== undefined) {
    if (typeof c.minScore !== "number" || c.minScore < 0 || c.minScore > 100) {
      throw new InvalidCriteriaError("criteria.minScore must be 0-100");
    }
    out.minScore = c.minScore;
  }
  if (c.scope !== undefined) {
    if (c.scope === null || typeof c.scope !== "object") {
      throw new InvalidCriteriaError("criteria.scope must be an object");
    }
    const s = c.scope as Record<string, unknown>;
    const scope: Criteria["scope"] = {};
    if (s.pillar !== undefined) {
      if (!["WARRIOR", "BUILDER", "TYCOON", "MIND"].includes(String(s.pillar))) {
        throw new InvalidCriteriaError(`criteria.scope.pillar invalid: ${String(s.pillar)}`);
      }
      scope.pillar = s.pillar as Pillar;
    }
    if (s.courseId !== undefined) {
      if (typeof s.courseId !== "string") throw new InvalidCriteriaError("scope.courseId must be a string");
      scope.courseId = s.courseId;
    }
    out.scope = scope;
  }
  return out;
}

/** Non-throwing variant — returns null for a rule we cannot read. */
export function tryParseCriteria(raw: unknown): Criteria | null {
  try {
    return parseCriteria(raw);
  } catch {
    return null;
  }
}

/** Cutoff instant for a `within` window, or null when unbounded. */
export function windowStart(within: string | undefined, now: Date): Date | null {
  if (!within) return null;
  const m = WINDOW.exec(within);
  if (!m) return null;
  const n = Number(m[1]);
  const ms = m[2] === "h" ? n * 3_600_000 : n * 86_400_000;
  return new Date(now.getTime() - ms);
}

/** Human summary for the admin console and the member task board. */
export function describeCriteria(c: Criteria): string {
  const n = c.count ?? 1;
  const noun: Record<DomainEventType, string> = {
    ONBOARDED: "complete onboarding",
    LESSON_COMPLETED: n === 1 ? "complete a lesson" : `complete ${n} lessons`,
    COURSE_COMPLETED: n === 1 ? "finish a program" : `finish ${n} programs`,
    QUIZ_PASSED: n === 1 ? "pass a quiz" : `pass ${n} quizzes`,
    CHALLENGE_COMPLETED: n === 1 ? "complete a challenge" : `complete ${n} challenges`,
    DAILY_ACTIVE: "check in today",
    STREAK: `reach a ${c.days ?? 1}-day streak`,
    MINING_CLAIMED: n === 1 ? "claim from the rig" : `claim ${n} times`,
    PURCHASE_MADE: n === 1 ? "make a purchase" : `make ${n} purchases`,
    VIDEO_WATCHED: n === 1 ? "watch a video" : `watch ${n} videos`,
    COMMUNITY_CONTRIBUTION: "contribute in the community",
  };
  let s = noun[c.event];
  if (c.scope?.pillar) s += ` in ${c.scope.pillar.toLowerCase()}`;
  if (c.minScore) s += ` at ${c.minScore}%+`;
  if (c.within) s += ` within ${c.within}`;
  return s;
}
