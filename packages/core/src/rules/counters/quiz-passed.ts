/** QUIZ_PASSED: distinct knowledge checks passed, at the criteria's minimum score. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, c, { since }) => {
  // Distinct knowledge checks, each counted once, in the window of its
  // first pass: a retake of a check already passed adds nothing, so
  // "pass 2 knowledge checks this week" means two new ones.
  const firstPasses = await db.quizAttempt.groupBy({
    by: ["quizId"],
    where: {
      userId,
      passed: true,
      ...(c.minScore !== undefined ? { scorePct: { gte: c.minScore } } : {}),
    },
    _min: { createdAt: true },
  });
  return firstPasses.filter((f) => !since || (f._min.createdAt !== null && f._min.createdAt >= since)).length;
};
