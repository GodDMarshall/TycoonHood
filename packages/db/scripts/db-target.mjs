/**
 * WHICH DATABASE A DEPLOY STEP WORKS ON
 *
 * Two variables can name the database. DATABASE_URL is the address the site
 * uses, often a pooled one. DATABASE_URL_UNPOOLED, which Neon's Vercel
 * integration sets, is the direct address of the same database. The deploy
 * lock and the migrations need a direct connection (a session lock taken
 * through a pooler belongs to whichever server connection ran it), so they
 * use DATABASE_URL_UNPOOLED when it is set. The seeds read DATABASE_URL.
 *
 * Why this module (review finding 19, follow-up): when the two variables
 * named different databases, a deploy locked and migrated one database and
 * seeded the other, unmigrated and outside the lock, and deploy:db reported
 * the second. It happens when a shell sets one variable and .env the other:
 * dotenv never replaces a variable that is already set.
 *
 * So scripts/with-db-lock.mjs, scripts/deploy-db.mjs and
 * packages/db/scripts/migrate-sql.ts all pick their address here. They refuse
 * when the two variables plainly name different databases, say which
 * variable they use, and give that one address to everything they run.
 *
 * "Plainly", because only the addresses are compared; nothing connects to
 * check. They differ when the database names differ, or when one is a Neon
 * address and the other is not the same Neon endpoint (Neon's pooled host is
 * the direct one with "-pooler" added). A pooler on a host or port of its
 * own, as Supabase's shared pooler and RDS Proxy have, cannot be matched from
 * the address, so another host or port alone is not refused.
 *
 * Plain JavaScript, so the two scripts that run under node can import it.
 */
import { URL } from "node:url";

/**
 * The address the deploy lock, the migrations and the seeds use, and the
 * variable it came from. Throws, with a message to show as it is, when
 * neither variable is set or the two name different databases.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ url: string, from: "DATABASE_URL" | "DATABASE_URL_UNPOOLED" }}
 */
export function databaseTarget(env = process.env) {
  const site = env.DATABASE_URL || "";
  const direct = env.DATABASE_URL_UNPOOLED || "";
  if (!site && !direct) throw new Error("DATABASE_URL is not set.");
  if (site && direct && differentDatabases(site, direct)) {
    throw new Error(
      `DATABASE_URL and DATABASE_URL_UNPOOLED name different databases (${where(site)} and ${where(direct)}). ` +
        "DATABASE_URL_UNPOOLED must be the direct address of the database in DATABASE_URL. " +
        "Correct one of them, or remove the one you did not mean. A value in .env never replaces one already set in your shell."
    );
  }
  return direct ? { url: direct, from: "DATABASE_URL_UNPOOLED" } : { url: site, from: "DATABASE_URL" };
}

/**
 * True when two addresses plainly name different databases: another database
 * name, or not the same Neon endpoint. False when the addresses cannot tell.
 *
 * @param {string} a
 * @param {string} b
 */
export function differentDatabases(a, b) {
  const x = identify(a);
  const y = identify(b);
  if (!x || !y) return false;
  if (x.database && y.database && x.database !== y.database) return true;
  if (x.neon || y.neon) return x.neon !== y.neon;
  return false;
}

/** Neon's pooled address has "-pooler" in its host name. @param {string} url */
export function isPooled(url) {
  const id = identify(url);
  return Boolean(id && /-pooler\./.test(id.host));
}

/** Host, port and database, for messages: never the user or password. @param {string} url */
export function where(url) {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return "(an address that cannot be read)";
  }
}

/** The address with its password starred out, for the deploy report. @param {string} url */
export function redacted(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return url.replace(/:[^:@]+@/, ":****@");
  }
}

/** What an address says about its database, or null when it cannot be read. @param {string} url */
function identify(url) {
  try {
    const u = new URL(url);
    // Host names are not case-sensitive, and a non-web scheme keeps them as typed.
    const host = u.hostname.toLowerCase();
    const [first, ...rest] = host.split(".");
    const isNeon = first.endsWith("-pooler") || /(^|\.)(neon\.tech|vercel-storage\.com)$/.test(host);
    return {
      host,
      database: decodeURIComponent(u.pathname.replace(/^\//, "")),
      // The endpoint and its region: the same for an endpoint's pooled and direct addresses.
      neon: isNeon ? [first.replace(/-pooler$/, ""), ...rest].join(".") : null,
    };
  } catch {
    return null;
  }
}
