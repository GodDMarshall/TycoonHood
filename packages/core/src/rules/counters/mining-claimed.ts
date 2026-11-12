/** MINING_CLAIMED: claims from the rig. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, _c, { when }) =>
  // mining.ts posts every claim with sourceType "miner", sourceId = userId.
  db.ledgerTransaction.count({
    where: { sourceType: "miner", sourceId: userId, ...(when ? { createdAt: when } : {}) },
  });
