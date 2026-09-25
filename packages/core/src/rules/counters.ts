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
 */
import type { PrismaClient } from "@tycoonhood/db";
import type { Criteria } from "./criteria";
import { windowStart } from "./criteria";

export async function countEvidence(
  db: PrismaClient,
  userId: string,
  c: Criteria,
  now: Date
): Promise<number | null> {
  const since = windowStart(c.within, now);
  const when = since ? { gte: since } : undefined;

  switch (c.event) {
    case "ONBOARDED": {
      const p = await db.profile.findUnique({ where: { userId }, select: { onboardedAt: true } });
      return p?.onboardedAt ? 1 : 0;
    }

    case "LESSON_COMPLETED":
      return db.lessonProgress.count({
        where: {
          userId,
          completedAt: when ? when : { not: null },
          ...(c.scope?.pillar || c.scope?.courseId
            ? {
                lesson: {
                  module: {
                    course: {
                      ...(c.scope.pillar ? { pillar: c.scope.pillar } : {}),
                      ...(c.scope.courseId ? { id: c.scope.courseId } : {}),
                    },
                  },
                },
              }
            : {}),
        },
      });

    case "COURSE_COMPLETED":
      return db.enrollment.count({
        where: {
          userId,
          status: "COMPLETED",
          ...(when ? { completedAt: when } : {}),
          ...(c.scope?.pillar || c.scope?.courseId
            ? {
                course: {
                  ...(c.scope.pillar ? { pillar: c.scope.pillar } : {}),
                  ...(c.scope.courseId ? { id: c.scope.courseId } : {}),
                },
              }
            : {}),
        },
      });

    case "QUIZ_PASSED":
      return db.quizAttempt.count({
        where: {
          userId,
          passed: true,
          ...(c.minScore !== undefined ? { scorePct: { gte: c.minScore } } : {}),
          ...(when ? { createdAt: when } : {}),
        },
      });

    case "CHALLENGE_COMPLETED":
      return db.challengeParticipation.count({
        where: { userId, status: "COMPLETED", ...(when ? { completedAt: when } : {}) },
      });

    case "STREAK": {
      const s = await db.streak.findUnique({ where: { userId }, select: { current: true } });
      return s?.current ?? 0;
    }

    case "MINING_CLAIMED":
      // mining.ts posts every claim with sourceType "miner", sourceId = userId.
      return db.ledgerTransaction.count({
        where: { sourceType: "miner", sourceId: userId, ...(when ? { createdAt: when } : {}) },
      });

    case "PURCHASE_MADE":
      return db.order.count({
        where: { userId, status: { in: ["PAID", "FULFILLED"] }, ...(when ? { createdAt: when } : {}) },
      });

    case "DAILY_ACTIVE":
      // Instantaneous: the event IS the evidence. Multi-day variants belong on
      // STREAK, which has a real store behind it.
      return 1;

    case "VIDEO_WATCHED":
      // Real store now: a settled watch is a paid, server-timed completion.
      return db.watchCompletion.count({
        where: {
          userId,
          completedAt: when ? when : { not: null },
        },
      });

    case "COMMUNITY_CONTRIBUTION":
      // No trustworthy source; Discord gives us no verifiable contribution feed.
      return null;
  }
}

/** STREAK compares against `days`; everything else against `count`. */
export function requiredFor(c: Criteria): number {
  return c.event === "STREAK" ? c.days ?? 1 : c.count ?? 1;
}
