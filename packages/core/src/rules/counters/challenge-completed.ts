/** CHALLENGE_COMPLETED: challenges completed. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, _c, { when }) =>
  db.challengeParticipation.count({
    where: { userId, status: "COMPLETED", ...(when ? { completedAt: when } : {}) },
  });
