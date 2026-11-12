/** LESSON_COMPLETED: lessons completed, optionally in one pillar or course. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, c, { when }) =>
  db.lessonProgress.count({
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
