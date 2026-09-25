/**
 * RATE LIMITER (Blueprint Phase 11) — fixed-window, in-memory.
 * HONEST LIMITATION: state lives in this Node process. On a single VPS or
 * one Vercel region with low concurrency it meaningfully slows credential
 * stuffing; across many serverless instances each instance counts alone.
 * Before public launch at scale, swap the Map for Redis/Upstash behind the
 * same function signature — call sites won't change.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

/** Periodic sweep so long-lived processes don't accumulate dead buckets. */
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 60_000).unref?.();
