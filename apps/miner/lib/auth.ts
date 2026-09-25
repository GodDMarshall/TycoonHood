/** Miner shares the platform session: same cookie, same SessionService.
 *  On localhost the cookie crosses ports; in production set COOKIE_DOMAIN
 *  (e.g. ".tycoonhood.com") so www and miner share sign-in. */
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
  (await cookies()).set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
}

export const getCurrentSession = cache(async () => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return sessions.resolve(raw);
});

export async function getCurrentUser() {
  return (await getCurrentSession())?.user ?? null;
}
