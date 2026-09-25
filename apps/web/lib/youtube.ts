/**
 * Pure parsing helpers, shared by the admin form and the server action so the
 * preview can never disagree with what is saved. They live outside the
 * "use server" file because that file may only export async actions.
 */

/**
 * Accepts a YouTube id, or any of the URL shapes people actually paste.
 * Returns null when it cannot find one rather than guessing — a wrong id
 * means members watch somebody else's video for our money.
 */
export function extractVideoId(raw: string): string | null {
  const s = raw.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  for (const re of [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts|live|v)\/)([A-Za-z0-9_-]{11})/,
  ]) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

/** "9:42", "9m42s", "1:02:30" or "582" → seconds. */
export function parseDuration(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const colon = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (colon) return Number(colon[1] ?? 0) * 3600 + Number(colon[2]) * 60 + Number(colon[3]);
  const units = s.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/);
  if (units && (units[1] || units[2] || units[3])) {
    return Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0);
  }
  return null;
}

/** Human clock for a number of seconds. */
export const clockOf = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
