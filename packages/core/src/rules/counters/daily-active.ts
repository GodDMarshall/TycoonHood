/** DAILY_ACTIVE: a check-in. */
import type { EvidenceCounter } from "./types";

// Instantaneous: the event IS the evidence. Multi-day variants belong on
// STREAK, which has a real store behind it.
export const count: EvidenceCounter = async () => 1;
