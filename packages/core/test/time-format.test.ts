import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatDay,
  formatDayTime,
  formatLongDate,
  formatMonthYear,
  formatRelative,
  formatTime,
  formatWeekday,
  hourIn,
  isValidTimeZone,
  memberZone,
} from "../src/time/format";
import { IST_TIME_ZONE, formatIst } from "../src/time/ist";

const IST = IST_TIME_ZONE;

describe("time/format — dates in the reader's zone", () => {
  it("puts an instant on the right day across the IST/UTC boundary", () => {
    // 01:30 IST on 12 Nov is still 11 Nov in UTC: the order the bug report named.
    const order = new Date("2026-11-11T20:00:00Z");
    expect(formatDay(order, IST)).toBe("12 Nov");
    expect(formatDay(order, "UTC")).toBe("11 Nov");
    expect(formatDateTime(order, IST)).toBe("12 Nov 2026, 01:30");
    expect(formatDateTime(order, "UTC")).toBe("11 Nov 2026, 20:00");

    // The boundary itself: 18:30 UTC is midnight in India.
    expect(formatDateTime(new Date("2026-11-11T18:29:59Z"), IST, { seconds: true })).toBe("11 Nov 2026, 23:59:59");
    expect(formatDateTime(new Date("2026-11-11T18:30:00Z"), IST, { seconds: true })).toBe("12 Nov 2026, 00:00:00");
    expect(formatDate(new Date("2026-11-11T18:30:00Z"), "UTC")).toBe("11 Nov 2026");

    // And a year boundary: New Year in India comes 5½ hours before UTC's.
    const newYear = new Date("2025-12-31T19:00:00Z");
    expect(formatDate(newYear, IST)).toBe("1 Jan 2026");
    expect(formatDate(newYear, "UTC")).toBe("31 Dec 2025");
  });

  it("falls back to Asia/Kolkata for a zone Intl does not know", () => {
    const at = new Date("2026-11-11T20:00:00Z");
    for (const bad of ["Mars/Phobos", "not a zone", "Asia/Kolkatta", ""]) {
      expect(isValidTimeZone(bad), bad).toBe(false);
      expect(memberZone(bad), bad).toBe(IST);
      expect(formatDateTime(at, bad), bad).toBe("12 Nov 2026, 01:30");
      expect(formatWeekday(at, bad), bad).toBe("Thursday 12 November");
    }
    expect(memberZone(null)).toBe(IST);
    expect(memberZone(undefined)).toBe(IST);
  });

  it("uses a member's own zone when it is real, daylight saving included", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(memberZone("America/New_York")).toBe("America/New_York");
    expect(memberZone(IST)).toBe(IST);
    expect(formatDateTime(new Date("2026-07-01T12:00:00Z"), "America/New_York")).toBe("1 Jul 2026, 08:00");
    expect(formatDateTime(new Date("2026-12-01T12:00:00Z"), "America/New_York")).toBe("1 Dec 2026, 07:00");
    expect(formatDay(new Date("2026-11-12T03:00:00Z"), "America/Los_Angeles")).toBe("11 Nov");
  });

  it("writes each style the app uses", () => {
    const at = new Date("2026-11-11T19:05:09Z"); // 00:35:09 IST, Thursday 12 November
    expect(formatDay(at, IST)).toBe("12 Nov");
    expect(formatDate(at, IST)).toBe("12 Nov 2026");
    expect(formatLongDate(at, IST)).toBe("12 November 2026");
    expect(formatWeekday(at, IST)).toBe("Thursday 12 November");
    expect(formatWeekday(at, IST, { year: true })).toBe("Thursday 12 November 2026");
    expect(formatMonthYear(at, IST)).toBe("November 2026");
    expect(formatTime(at, IST)).toBe("00:35");
    expect(formatTime(at, IST, { seconds: true })).toBe("00:35:09");
    expect(formatDayTime(at, IST)).toBe("12 Nov, 00:35");
    expect(formatDateTime(at, IST)).toBe("12 Nov 2026, 00:35");
    expect(hourIn(at, IST)).toBe(0);
    expect(hourIn(at, "UTC")).toBe(19);
    expect(hourIn(at, "Mars/Phobos")).toBe(0);
  });

  it("takes ISO text and epoch milliseconds, and prints nothing for a date that is not one", () => {
    expect(formatDay("2026-11-11T20:00:00.000Z", IST)).toBe("12 Nov");
    expect(formatDay(Date.parse("2026-11-11T20:00:00Z"), IST)).toBe("12 Nov");
    expect(formatDate("not a date", IST)).toBe("");
    expect(formatRelative(new Date(Number.NaN), IST)).toBe("");
  });

  it("agrees with Intl's own reading of the zone, for every hour of a day in several zones", () => {
    const zones = [IST, "UTC", "America/New_York", "Asia/Kathmandu", "Pacific/Chatham"];
    for (const zone of zones) {
      const intl = new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      for (let h = 0; h < 24; h++) {
        const at = new Date(Date.UTC(2026, 2, 8, h, 17)); // a US daylight-saving day
        const p = Object.fromEntries(intl.formatToParts(at).map((x) => [x.type, x.value]));
        expect(formatDateTime(at, zone), `${zone} ${at.toISOString()}`).toBe(`${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`);
      }
    }
  });

  it("matches formatIst, the staff timestamp, minus its label", () => {
    for (let i = 0; i < 48; i++) {
      const at = new Date(Date.UTC(2026, 10, 30, 0, 0, 7) + i * 47 * 60_000);
      expect(formatIst(at)).toBe(`${formatDateTime(at, IST)} IST`);
      expect(formatIst(at, { seconds: true })).toBe(`${formatDateTime(at, IST, { seconds: true })} IST`);
    }
  });
});

describe("time/format — formatRelative", () => {
  const now = new Date("2026-11-12T06:30:00Z"); // 12:00 IST

  it("counts minutes, then hours, for the last day", () => {
    expect(formatRelative(new Date(now.getTime() - 20_000), IST, now)).toBe("just now");
    expect(formatRelative(new Date(now.getTime() + 60_000), IST, now)).toBe("just now");
    expect(formatRelative(new Date(now.getTime() - 5 * 60_000), IST, now)).toBe("5 min ago");
    expect(formatRelative(new Date(now.getTime() - 3 * 3_600_000), IST, now)).toBe("3 h ago");
    expect(formatRelative(new Date(now.getTime() - 23 * 3_600_000), IST, now)).toBe("23 h ago");
  });

  it("gives the date in the zone after that, with the year only when it differs there", () => {
    // 30 hours back is 00:30 UTC on 11 Nov but 06:00 IST: the same day either way.
    expect(formatRelative(new Date(now.getTime() - 30 * 3_600_000), IST, now)).toBe("11 Nov");
    // 19:00 UTC on 9 Nov is 00:30 IST on 10 Nov.
    expect(formatRelative(new Date("2026-11-09T19:00:00Z"), IST, now)).toBe("10 Nov");
    expect(formatRelative(new Date("2026-11-09T19:00:00Z"), "UTC", now)).toBe("9 Nov");
    expect(formatRelative(new Date("2025-12-31T19:00:00Z"), IST, now)).toBe("1 Jan");
    expect(formatRelative(new Date("2025-12-31T19:00:00Z"), "UTC", now)).toBe("31 Dec 2025");
  });
});
