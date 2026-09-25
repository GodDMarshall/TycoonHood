/**
 * DOMAIN EVENTS (spec §14, §17)
 *
 * One typed vocabulary for "something meaningful happened to a member".
 * Every earning surface emits into this; the rules engine is the only thing
 * that decides what an event is worth. Adding a new way to earn should mean
 * adding a mission row, not adding code.
 */

export const DOMAIN_EVENTS = [
  "ONBOARDED",
  "LESSON_COMPLETED",
  "COURSE_COMPLETED",
  "QUIZ_PASSED",
  "CHALLENGE_COMPLETED",
  "DAILY_ACTIVE",
  "STREAK",
  "MINING_CLAIMED",
  "PURCHASE_MADE",
  "VIDEO_WATCHED",
  "COMMUNITY_CONTRIBUTION",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENTS)[number];

export function isDomainEventType(v: unknown): v is DomainEventType {
  return typeof v === "string" && (DOMAIN_EVENTS as readonly string[]).includes(v);
}

interface Base {
  userId: string;
  /** When it happened. Defaults to now; injectable so tests can travel. */
  at?: Date;
}

export type DomainEvent =
  | ({ type: "ONBOARDED" } & Base)
  | ({ type: "LESSON_COMPLETED"; lessonId: string; courseId: string } & Base)
  | ({ type: "COURSE_COMPLETED"; courseId: string } & Base)
  | ({ type: "QUIZ_PASSED"; quizId: string; scorePct: number } & Base)
  | ({ type: "CHALLENGE_COMPLETED"; challengeId: string } & Base)
  | ({ type: "DAILY_ACTIVE" } & Base)
  | ({ type: "STREAK"; days: number } & Base)
  | ({ type: "MINING_CLAIMED"; amount: bigint } & Base)
  | ({ type: "PURCHASE_MADE"; orderId: string } & Base)
  | ({ type: "VIDEO_WATCHED"; videoTaskId: string } & Base)
  | ({ type: "COMMUNITY_CONTRIBUTION" } & Base);
