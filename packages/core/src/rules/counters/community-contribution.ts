/** COMMUNITY_CONTRIBUTION: chat messages staff pinned. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, _c, { when }) =>
  // Volume is never a signal (it is the first thing farmed). The one
  // trustworthy source: messages staff chose to pin, still standing.
  db.message.count({
    where: { authorId: userId, pinnedAt: when ? when : { not: null }, deletedAt: null },
  });
