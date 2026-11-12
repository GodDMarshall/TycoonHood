/**
 * EVIDENCE COUNTERS (spec §17)
 *
 * The engine never keeps its own tally. It asks the database how much real
 * evidence exists, every time. A parallel counter would drift the first time a
 * job retried or a row was corrected by an admin; counting the actual rows
 * cannot drift, and it means a mission added today can immediately recognise
 * work a member did last month.
 *
 * `null` means "this event has no source of truth yet" — the engine treats that
 * as unevaluable and never pays, rather than guessing zero and silently
 * refusing forever.
 *
 * This file is the dispatcher: it works out the window once and hands the
 * question to the counter for the criteria's event. Each counter lives in its
 * own file here (one per evidence type; types.ts has the contract), so a unit
 * fills its own counter without touching this file. The switch is exhaustive:
 * a new event in DOMAIN_EVENTS does not compile until it has a counter here.
 */
import type { PrismaClient } from "@tycoonhood/db";
import type { Criteria } from "../criteria";
import { windowStart } from "../criteria";
import type { EvidenceWindow } from "./types";
import * as challengeCompleted from "./challenge-completed";
import * as communityContribution from "./community-contribution";
import * as courseCompleted from "./course-completed";
import * as dailyActive from "./daily-active";
import * as discussionPosted from "./discussion-posted";
import * as lessonCompleted from "./lesson-completed";
import * as miningClaimed from "./mining-claimed";
import * as onboarded from "./onboarded";
import * as purchaseMade from "./purchase-made";
import * as quizPassed from "./quiz-passed";
import * as streak from "./streak";
import * as videoWatched from "./video-watched";

export type { EvidenceCounter, EvidenceWindow } from "./types";

/**
 * `timezone` is the member's: days of the standard are their local days, so
 * a "week" of them is their own Monday to Sunday (see repeatBucket).
 */
export async function countEvidence(
  db: PrismaClient,
  userId: string,
  c: Criteria,
  now: Date,
  timezone?: string | null
): Promise<number | null> {
  const since = windowStart(c.within, now);
  const when = since ? { gte: since } : undefined;
  const w: EvidenceWindow = { now, since, when, timezone };

  switch (c.event) {
    case "ONBOARDED":
      return onboarded.count(db, userId, c, w);
    case "LESSON_COMPLETED":
      return lessonCompleted.count(db, userId, c, w);
    case "COURSE_COMPLETED":
      return courseCompleted.count(db, userId, c, w);
    case "QUIZ_PASSED":
      return quizPassed.count(db, userId, c, w);
    case "CHALLENGE_COMPLETED":
      return challengeCompleted.count(db, userId, c, w);
    case "STREAK":
      return streak.count(db, userId, c, w);
    case "MINING_CLAIMED":
      return miningClaimed.count(db, userId, c, w);
    case "PURCHASE_MADE":
      return purchaseMade.count(db, userId, c, w);
    case "DAILY_ACTIVE":
      return dailyActive.count(db, userId, c, w);
    case "VIDEO_WATCHED":
      return videoWatched.count(db, userId, c, w);
    case "DISCUSSION_POSTED":
      return discussionPosted.count(db, userId, c, w);
    case "COMMUNITY_CONTRIBUTION":
      return communityContribution.count(db, userId, c, w);
  }
}

/** STREAK compares against `days`; everything else against `count`. */
export function requiredFor(c: Criteria): number {
  return c.event === "STREAK" ? c.days ?? c.count ?? 1 : c.count ?? 1;
}
