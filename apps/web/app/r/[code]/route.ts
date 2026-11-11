/**
 * /r/[code] — an affiliate link.
 *
 * Records the click (hashed visitor, never the raw IP; one per visitor per
 * affiliate per 24h), remembers the code for 30 days in an httpOnly cookie
 * the checkout reads, and sends the visitor on to ?to= when it is a safe,
 * same-site relative path. Unknown or inactive codes just redirect: a dead
 * link should still land somewhere useful, and must not set the cookie.
 */
import { NextResponse, type NextRequest } from "next/server";
import { affiliates, AFFILIATE_CODE_PATTERN } from "@tycoonhood/core";
import { rateLimit } from "../../../lib/rate-limit";

export const dynamic = "force-dynamic";

// The shop reads this cookie at checkout (see the coordinator wiring). Not exported: route files may only export handlers.
const AFFILIATE_COOKIE = "th_aff";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

/** Only "/path?query#hash" on this site. Rejects "//evil", "/\\evil", schemes and control characters. */
function safeDestination(to: string | null): string {
  if (!to || to.length > 500) return "/";
  if (!to.startsWith("/") || to.startsWith("//") || to.includes("\\")) return "/";
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (/[\u0000-\u001f\u007f]/.test(to)) return "/";
  try {
    const base = "http://same.invalid";
    const u = new URL(to, base);
    if (u.origin !== base) return "/";
    if (u.pathname.startsWith("/r/")) return "/"; // no redirect loops
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return "/";
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw ?? "").trim().toUpperCase();
  const dest = safeDestination(req.nextUrl.searchParams.get("to"));
  const res = NextResponse.redirect(new URL(dest, req.nextUrl.origin), 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (!AFFILIATE_CODE_PATTERN.test(code)) return res;

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || null;
  // Light limit: a person clicking links is far below this; a script is not.
  if (!rateLimit(`aff-click:${ip ?? "unknown"}`, 30, 60_000).ok) return res;

  try {
    const { affiliateId } = await affiliates.recordClick(code, {
      ip,
      userAgent: req.headers.get("user-agent"),
      landingPath: dest,
      referrer: req.headers.get("referer"),
    });
    if (affiliateId) {
      res.cookies.set(AFFILIATE_COOKIE, code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: THIRTY_DAYS,
      });
    }
  } catch (e) {
    // Tracking must never strand a visitor.
    console.error("[earn] click tracking failed", e);
  }
  return res;
}
