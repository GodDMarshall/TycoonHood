/**
 * CUTTING TEXT WITHOUT CUTTING A CHARACTER
 *
 * String lengths count UTF-16 units, and an emoji (any character past U+FFFF)
 * takes two of them. A plain `s.slice(0, n)` can keep the first half of one,
 * a lone surrogate. The server's HTML cannot carry that half, so the page
 * shows U+FFFD where the browser's copy keeps the half, and React reports a
 * hydration mismatch (#418). Prisma refuses a query or write holding one.
 *
 * Every cut here moves inward to the nearest whole character. Limits are
 * still counted in UTF-16 units, so a limit means what it meant before.
 * Pure and dependency-free: client components import it by path.
 */

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff;

/** True when a cut at `i` would separate the two halves of one character. */
const splitsPair = (s: string, i: number) => i > 0 && i < s.length && isHigh(s.charCodeAt(i - 1)) && isLow(s.charCodeAt(i));

/**
 * `s.slice(start, end)`, except that an end falling inside a character moves
 * inward, so the result never starts or ends with half of one.
 */
export function sliceWhole(s: string, start = 0, end = s.length): string {
  const at = (i: number) => (i < 0 ? Math.max(0, s.length + i) : Math.min(i, s.length));
  let a = at(start);
  let b = at(end);
  if (splitsPair(s, a)) a++;
  if (b > a && splitsPair(s, b)) b--;
  return b > a ? s.slice(a, b) : "";
}

/**
 * The text itself when it fits in `max` units; otherwise its start, trimmed,
 * with `ellipsis` added, `max` units at most in all.
 */
export function clip(s: string, max: number, ellipsis = "…"): string {
  if (s.length <= max) return s;
  return sliceWhole(s, 0, Math.max(0, max - ellipsis.length)).trimEnd() + ellipsis;
}
