/**
 * INDIA TIME for times staff type into forms.
 *
 * <input type="datetime-local"> sends a wall-clock value with no offset,
 * such as "2026-11-30T23:59". new Date() reads that in the server's own
 * zone, which is UTC in production, so a coupon meant to end at 23:59 IST
 * ran until 05:29 IST the next day.
 *
 * These helpers read and show such values in Asia/Kolkata and keep the UTC
 * instant for storage. India keeps UTC+05:30 all year, with no daylight
 * saving, so the offset is fixed and the conversion is exact.
 */
export const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;

const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Reads a datetime-local value ("YYYY-MM-DDTHH:mm", seconds optional) as
 * India time and returns the UTC instant. Returns null when the value is not
 * a real date and time (wrong shape, 30 February, 24:00).
 */
export function parseIstDateTime(value: string): Date | null {
  const m = DATETIME_LOCAL.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map((x) => (x === undefined ? 0 : Number(x)));
  if (h > 23 || mi > 59 || s > 59) return null;
  const wall = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  // Date.UTC rolls 30 February over to 2 March; a real date survives the round trip.
  if (wall.getUTCFullYear() !== y || wall.getUTCMonth() !== mo - 1 || wall.getUTCDate() !== d) return null;
  return new Date(wall.getTime() - IST_OFFSET_MS);
}

/**
 * An instant as India time, for staff screens: "30 Nov 2026, 23:59 IST",
 * or "30 Nov 2026, 23:59:30 IST" with `seconds`.
 */
export function formatIst(at: Date, opts: { seconds?: boolean } = {}): string {
  const t = new Date(at.getTime() + IST_OFFSET_MS);
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  const ss = opts.seconds ? `:${String(t.getUTCSeconds()).padStart(2, "0")}` : "";
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}, ${hh}:${mm}${ss} IST`;
}
