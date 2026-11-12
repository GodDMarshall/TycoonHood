/** COURSE_COMPLETED: programmes finished, optionally in one pillar or course. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, c, { when }) =>
  db.enrollment.count({
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
