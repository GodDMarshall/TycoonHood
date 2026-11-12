/**
 * DATES AND TIMES AS PEOPLE READ THEM
 *
 * The server runs in UTC. A date formatted there with no time zone showed
 * the UTC day and clock: an order placed at 01:30 IST on 12 Nov read
 * "11 Nov", and every time was 5½ hours off. Every date on a page goes
 * through these helpers instead, each told the zone to show it in:
 *
 *   - a signed-in member's own pages: their Profile.timezone when it is a
 *     real zone, otherwise India time (`memberZone`)
 *   - public pages, emails and staff screens: India time (IST_TIME_ZONE).
 *     Staff times also say "IST": `formatIst` in ./ist.
 *
 * A zone Intl does not know falls back to India time, never to UTC.
 *
 * Only the numbers come from Intl; the words (month and day names) and the
 * layout are our own. Node and every browser therefore print the same text
 * for the same instant and zone, so a client component given its zone by
 * the server hydrates without a mismatch. Times use the 24-hour clock, as
 * formatIst does. Pure: client components import it by path.
 */
import { IST_TIME_ZONE } from "./ist";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** One numeric formatter per zone; null for a zone Intl refuses. */
const numeric = new Map<string, Intl.DateTimeFormat | null>();

function numericIn(zone: string): Intl.DateTimeFormat | null {
  let f = numeric.get(zone);
  if (f === undefined) {
    try {
      f = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hourCycle: "h23",
      });
    } catch {
      f = null; // RangeError: not a zone this runtime knows
    }
    if (numeric.size > 1000) numeric.clear(); // only real zones repeat; never grow without bound
    numeric.set(zone, f);
  }
  return f;
}

/** True when Intl knows this IANA zone name ("Asia/Kolkata", "Europe/London"). */
export function isValidTimeZone(tz: string): boolean {
  return typeof tz === "string" && tz.length > 0 && numericIn(tz) !== null;
}

/** The zone to show a member's own dates in: their Profile.timezone when it is real, otherwise India time. */
export function memberZone(timezone: string | null | undefined): string {
  return timezone && isValidTimeZone(timezone) ? timezone : IST_TIME_ZONE;
}

export type DateInput = Date | string | number;

interface Parts {
  year: number;
  /** 0 = January */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday */
  weekday: number;
}

const toDate = (at: DateInput): Date | null => {
  const d = at instanceof Date ? at : new Date(at);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** The calendar and clock readings of an instant in a zone (India time when the zone is unknown). */
function partsIn(at: Date, zone: string): Parts {
  const fmt = numericIn(zone) ?? numericIn(IST_TIME_ZONE)!;
  const n: Record<string, number> = {};
  for (const p of fmt.formatToParts(at)) if (p.type !== "literal") n[p.type] = Number(p.value);
  const month = n.month - 1;
  return {
    year: n.year,
    month,
    day: n.day,
    hour: n.hour % 24, // some engines still write midnight as 24
    minute: n.minute,
    second: n.second,
    weekday: new Date(Date.UTC(n.year, month, n.day)).getUTCDay(),
  };
}

const two = (n: number) => String(n).padStart(2, "0");

/** Applies `fn` to the instant's readings in `zone`; empty text for a date that is not a date. */
function render(at: DateInput, zone: string, fn: (p: Parts) => string): string {
  const d = toDate(at);
  return d ? fn(partsIn(d, zone)) : "";
}

const clock = (p: Parts, seconds = false) => `${two(p.hour)}:${two(p.minute)}${seconds ? `:${two(p.second)}` : ""}`;

/** "12 Nov" */
export const formatDay = (at: DateInput, zone: string) => render(at, zone, (p) => `${p.day} ${MONTHS[p.month]}`);

/** "12 Nov 2026" */
export const formatDate = (at: DateInput, zone: string) => render(at, zone, (p) => `${p.day} ${MONTHS[p.month]} ${p.year}`);

/** "12 November 2026" */
export const formatLongDate = (at: DateInput, zone: string) => render(at, zone, (p) => `${p.day} ${MONTHS_LONG[p.month]} ${p.year}`);

/** "Thursday 12 November", or "Thursday 12 November 2026" with `year`. */
export const formatWeekday = (at: DateInput, zone: string, opts: { year?: boolean } = {}) =>
  render(at, zone, (p) => `${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS_LONG[p.month]}${opts.year ? ` ${p.year}` : ""}`);

/** "November 2026" */
export const formatMonthYear = (at: DateInput, zone: string) => render(at, zone, (p) => `${MONTHS_LONG[p.month]} ${p.year}`);

/** "14:05", or "14:05:09" with `seconds`. */
export const formatTime = (at: DateInput, zone: string, opts: { seconds?: boolean } = {}) => render(at, zone, (p) => clock(p, opts.seconds));

/** "12 Nov, 14:05" */
export const formatDayTime = (at: DateInput, zone: string) => render(at, zone, (p) => `${p.day} ${MONTHS[p.month]}, ${clock(p)}`);

/** "12 Nov 2026, 14:05", or "12 Nov 2026, 14:05:09" with `seconds`. */
export const formatDateTime = (at: DateInput, zone: string, opts: { seconds?: boolean } = {}) =>
  render(at, zone, (p) => `${p.day} ${MONTHS[p.month]} ${p.year}, ${clock(p, opts.seconds)}`);

/** The hour on the clock in `zone`, 0–23: for greetings and the sky on Today. */
export function hourIn(at: DateInput, zone: string): number {
  const d = toDate(at);
  return d ? partsIn(d, zone).hour : 0;
}

/**
 * How long ago, for recent things: "just now", "5 min ago", "3 h ago".
 * From a day back it is the date in `zone`: "12 Nov", with the year when it
 * is not this year there.
 */
export function formatRelative(at: DateInput, zone: string, now: DateInput = Date.now()): string {
  const d = toDate(at);
  const n = toDate(now);
  if (!d || !n) return "";
  const mins = Math.round((n.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return partsIn(d, zone).year === partsIn(n, zone).year ? formatDay(d, zone) : formatDate(d, zone);
}
