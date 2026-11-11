/**
 * Where sign-in may send someone afterwards: a path on this site, never
 * another site. Pure, so the login page and the login action check the same
 * rule. Returns the path in normalised form, or null when it is unsafe and the
 * default destination should be used instead.
 */

export const NEXT_PATH_MAX = 512;

/** Signing in must not land on a sign-in page again. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

const BASE = "http://next-path.invalid";

/** The normalised path and its decoded, lower-case pathname, or null when it leaves the site. */
function sitePath(raw: unknown): { path: string; pathname: string } | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > NEXT_PATH_MAX) return null;
  // One leading slash: "//host" and "/\host" point at another site, and a
  // scheme ("https:", "javascript:") never starts with "/".
  if (raw[0] !== "/" || raw[1] === "/" || raw.includes("\\")) return null;
  // Browsers drop tabs and newlines from URLs, which can turn "/\t/host" into "//host".
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (/[\u0000-\u001f\u007f-\u009f]/.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;

  // Normalising resolves dot segments, and "/.//host" becomes "//host": check the result again.
  const path = `${url.pathname}${url.search}${url.hash}`;
  if (!path.startsWith("/") || path.startsWith("//") || path.length > NEXT_PATH_MAX) return null;

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname).toLowerCase();
  } catch {
    return null;
  }
  return { path, pathname };
}

/**
 * A link to a page on this site, such as a notification's or an announcement's:
 * the same rule as sign-in's return path, except that the sign-in pages are
 * pages like any other.
 */
export function safeSitePath(raw: unknown): string | null {
  return sitePath(raw)?.path ?? null;
}

export function safeNextPath(raw: unknown): string | null {
  const site = sitePath(raw);
  if (!site) return null;
  if (AUTH_PAGES.some((page) => site.pathname === page || site.pathname.startsWith(`${page}/`))) return null;
  return site.path;
}
