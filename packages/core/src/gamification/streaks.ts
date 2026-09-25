/**
 * STREAKS (spec §19). One activity per LOCAL calendar day advances the streak;
 * a gap resets it. Longest is preserved.
 *
 * The day boundary is the member's own, from `Profile.timezone`. It used to be
 * UTC, which meant a member in India checking in at 05:00 IST was credited to
 * the previous day, and one in California at 17:00 could break a streak they
 * had not broken. That is a correctness bug in the core loop, not a nicety.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { localDayKey, localDayKeyOffset, dayKeyToDate } from "../time/day";

export class StreakService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /**
   * Record activity for the member's today. Idempotent within their day.
   * Pass `timezone` to skip the profile lookup when the caller already has it.
   */
  async touch(userId: string, now = new Date(), timezone?: string | null) {
    const tz =
      timezone !== undefined
        ? timezone
        : (await this.db.profile.findUnique({ where: { userId }, select: { timezone: true } }))
            ?.timezone ?? null;

    const today = localDayKey(now, tz);
    const yesterday = localDayKeyOffset(now, tz, -1);

    const streak = await this.db.streak.findUnique({ where: { userId } });
    // lastActiveOn is a @db.Date stored as the local day key at UTC midnight,
    // so it compares as the same plain string it was written from.
    const last = streak?.lastActiveOn ? streak.lastActiveOn.toISOString().slice(0, 10) : null;

    if (last === today) return streak!; // already counted for their day

    const current = last === yesterday ? (streak?.current ?? 0) + 1 : 1;
    const longest = Math.max(current, streak?.longest ?? 0);

    const updated = await this.db.streak.upsert({
      where: { userId },
      update: { current, longest, lastActiveOn: dayKeyToDate(today) },
      create: { userId, current, longest, lastActiveOn: dayKeyToDate(today) },
    });

    // Streak milestones are rules like any other — the engine decides what a
    // 7-day streak is worth, not this file. Fail-soft: a reward problem must
    // never cost the member their streak.
    const { events } = await import("../events/bus");
    await events.emit({ type: "STREAK", userId, days: current, at: now });

    return updated;
  }
}

export const streaks = new StreakService();
