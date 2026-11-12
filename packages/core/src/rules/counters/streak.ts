/** STREAK: the current run of days, or days the standard was met inside a window. */
import { countsStandardDays } from "../criteria";
import { dayKeyToDate, localWeekStartKey } from "../../time/day";
import type { EvidenceCounter } from "./types";

export const count: EvidenceCounter = async (db, userId, c, { now, since, timezone }) => {
  // Days the standard was met inside a window ("hold the standard 5 days
  // this week"): `count` + `within`, no `days`. The met-day record is the
  // store. Its days are the member's local dates, so "this week" starts on
  // their own Monday, not Monday in UTC.
  if (countsStandardDays(c) && since) {
    if (c.within === "week") {
      const monday = dayKeyToDate(localWeekStartKey(now, timezone));
      const nextMonday = new Date(monday.getTime() + 7 * 86_400_000);
      return db.standardDay.count({ where: { userId, day: { gte: monday, lt: nextMonday } } });
    }
    return db.standardDay.count({ where: { userId, day: { gte: since } } });
  }
  const s = await db.streak.findUnique({ where: { userId }, select: { current: true } });
  return s?.current ?? 0;
};
