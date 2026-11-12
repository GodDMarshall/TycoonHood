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

/**
 * What `pnpm preflight` reports about CRON_SECRET. Without it both daily
 * sweeps refuse every call (cronAuth "unset"). The email-change sweep is
 * the backstop that puts back a change whose undo notice never went out
 * (platform/email-notice), so in production its absence fails the
 * preflight (DR-32: CRON_SECRET is required); elsewhere it only warns.
 */
export function cronPreflight(env: Record<string, string | undefined> = process.env): {
  level: "FAIL" | "WARN" | "OK";
  label: string;
  detail: string;
} {
  const label = "the daily sweeps can run on a schedule";
  if (env.CRON_SECRET?.trim()) return { level: "OK", label, detail: "/api/cron/expire-orders and /api/cron/email-holds" };
  return {
    level: env.NODE_ENV === "production" ? "FAIL" : "WARN",
    label,
    detail:
      "no CRON_SECRET: /api/cron/expire-orders and /api/cron/email-holds refuse every call. Unpaid orders are let go only " +
      "when shop pages load, and an email change whose undo notice never went out stands until its account asks for a " +
      "change or a reset, or staff open it in the admin",
  };
}
