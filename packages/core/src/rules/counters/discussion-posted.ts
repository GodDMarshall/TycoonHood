/** DISCUSSION_POSTED: discussions started. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, _c, { when }) =>
  // Posts still standing (staff-hidden or removed ones do not count).
  db.communityPost.count({
    where: { authorId: userId, state: "VISIBLE", ...(when ? { createdAt: when } : {}) },
  });
