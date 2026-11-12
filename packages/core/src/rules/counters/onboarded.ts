/** ONBOARDED: whether the member finished onboarding (1 or 0). */
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId) => {
  const p = await db.profile.findUnique({ where: { userId }, select: { onboardedAt: true } });
  return p?.onboardedAt ? 1 : 0;
};
