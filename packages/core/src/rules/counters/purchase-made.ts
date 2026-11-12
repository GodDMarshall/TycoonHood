/** PURCHASE_MADE: orders paid or fulfilled. */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, _c, { when }) =>
  db.order.count({
    where: { userId, status: { in: ["PAID", "FULFILLED"] }, ...(when ? { createdAt: when } : {}) },
  });
