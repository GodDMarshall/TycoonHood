/**
 * The contract every evidence counter meets (docs/ECOSYSTEM_PLAN.md W1.5).
 *
 * One file per evidence type in this folder exports `count`. The dispatcher
 * (index.ts) works out the window once and asks the counter for the criteria's
 * event; the counter answers from real rows, every time.
 *
 * `null` means "this event has no source of truth yet": the engine treats it
 * as unevaluable and never pays, rather than guessing zero.
 */
import type { PrismaClient } from "@tycoonhood/db";
import type { Criteria } from "../criteria";

/** The window a counter counts in, worked out once by the dispatcher. */
export interface EvidenceWindow {
  /** The moment the question is asked. */
  now: Date;
  /** Where the criteria's `within` window opens (windowStart), or null for all time. */
  since: Date | null;
  /** The same window as a Prisma date filter, or undefined for all time. */
  when: { gte: Date } | undefined;
  /** The member's time zone: days of the standard are their local days. */
  timezone?: string | null;
}

/** How much real evidence this member has for the criteria, inside the window. */
export type EvidenceCounter = (db: PrismaClient, userId: string, c: Criteria, w: EvidenceWindow) => Promise<number | null>;
