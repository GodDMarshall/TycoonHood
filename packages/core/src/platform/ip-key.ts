/**
 * IP KEYS — the only form in which an IP address is kept.
 *
 * A session records where it signed in from ("manage my devices"), and an
 * affiliate click records its visitor, so the self-dealing check can see a
 * buyer on the affiliate's own device. Neither may hold the address itself,
 * and a plain SHA-256 is not enough: there are only about four billion IPv4
 * addresses, so an unkeyed hash is reversed by trying them all. ipKey is a
 * keyed hash (HMAC-SHA256) under a secret the database never holds, cut to
 * 32 hex characters. Sessions and clicks use the same key, so the two can
 * still be compared.
 *
 * The secret is IP_HASH_KEY; without it AFFILIATE_HASH_SECRET; without that,
 * one derived from DATABASE_URL exactly as earn/affiliates.ts derives its
 * visitor-hash secret, which is secret and stable per deployment. Changing it
 * changes every key from then on: an affiliate visitor counts once more on
 * the day of the change, and sessions from before it no longer match clicks
 * from after it.
 */
import { createHash, createHmac } from "node:crypto";

/**
 * The secret IP keys are made with, from `env` (the process's when not given).
 * Read on every call, so a changed environment takes effect at once.
 */
export function privacySecret(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.IP_HASH_KEY ||
    env.AFFILIATE_HASH_SECRET ||
    createHash("sha256").update(`affiliate-visitor|${env.DATABASE_URL ?? ""}`).digest("hex")
  );
}

/** The keyed form of an IP address: 32 hex characters, or "" when there is no address. */
export function ipKey(ip: string | null | undefined): string {
  return ip ? createHmac("sha256", privacySecret()).update(`ip|${ip}`).digest("hex").slice(0, 32) : "";
}
