/**
 * Cookie ↔ session bridge for the web app. All session logic lives in
 * @tycoonhood/core; this file only speaks HTTP: one httpOnly cookie,
 * device info from headers, a cached per-request user lookup.
 */
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { sessions, SESSION_TTL_MS } from "@tycoonhood/core";

export const SESSION_COOKIE = "th_session";

export async function deviceInfo() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent"),
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
  };
}

export async function setSessionCookie(raw: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    // Set COOKIE_DOMAIN (e.g. ".tycoonhood.com") in prod so the Miner app
    // shares this session — mirrors apps/miner/lib/auth.ts.
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Resolve the current member once per request. Null when signed out. */
export const getCurrentSession = cache(async () => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return sessions.resolve(raw);
});

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}
