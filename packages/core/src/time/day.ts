/**
 * LOCAL DAY (spec §19)
 *
 * Every day-keyed mechanic in the product — streaks, check-ins, mission
 * occurrence buckets, daily caps — must resolve against the MEMBER'S day, not
 * UTC. A member in India checking in at 05:00 IST was being credited to the
 * previous UTC day; one in California at 17:00 was breaking a streak they had
 * not broken. `Profile.timezone` was collected at onboarding and never read.
 *
 * `en-CA` formats as YYYY-MM-DD, which sorts and compares as a plain string.
 */

/** IANA zone → "YYYY-MM-DD" for that zone. Falls back to UTC on a bad zone. */
export function localDayKey(at: Date = new Date(), timezone?: string | null): string {
  if (!timezone) return at.toISOString().slice(0, 10);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    // Unknown/garbage zone: behave exactly as before rather than throwing in a
    // reward path. The member keeps a working streak; they just keep a UTC one.
    return at.toISOString().slice(0, 10);
  }
}

/** The local day key N days before `at`, in the member's zone. */
export function localDayKeyOffset(at: Date, timezone: string | null | undefined, days: number): string {
  return localDayKey(new Date(at.getTime() + days * 86_400_000), timezone);
}

/** True when two instants fall on the same local day for this member. */
export function isSameLocalDay(a: Date, b: Date, timezone?: string | null): boolean {
  return localDayKey(a, timezone) === localDayKey(b, timezone);
}

/** Midnight UTC of a YYYY-MM-DD key — for storing into an @db.Date column. */
export function dayKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}
