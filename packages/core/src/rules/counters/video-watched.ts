/** VIDEO_WATCHED: settled watches. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, _c, { when }) =>
  // Real store now: a settled watch is a paid, server-timed completion.
  db.watchCompletion.count({
    where: {
      userId,
      completedAt: when ? when : { not: null },
    },
  });
