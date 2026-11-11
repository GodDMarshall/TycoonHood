/**
 * Scheduled jobs over HTTP. Vercel Cron calls a route with
 * "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set on the
 * project; anything else that schedules the call must send the same header.
 */
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Checks a scheduled call's Authorization header in constant time.
 * "unset" when no CRON_SECRET is configured: then nobody may run the job.
 */
export function cronAuth(authorization: string | null | undefined, secret: string | undefined = process.env.CRON_SECRET): "ok" | "unset" | "denied" {
  const want = secret?.trim();
  if (!want) return "unset";
  const given = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!given) return "denied";
  // Hash both sides so the comparison takes the same time whatever their lengths.
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(given), digest(want)) ? "ok" : "denied";
}
