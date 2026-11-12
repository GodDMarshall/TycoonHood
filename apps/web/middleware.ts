/**
 * Records the path each page request asked for in a request header, so a
 * signed-out visitor can be returned to it after signing in (lib/guard.ts).
 *
 * Request headers only. Response headers, including the CSP, come from
 * next.config.mjs and are not touched here.
 */
import { NextResponse, type NextRequest } from "next/server";
import { PATH_HEADER } from "./lib/path-header";

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Always overwritten, so a value the visitor sent never reaches the app.
  headers.set(PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip build assets, image optimisation, payment webhooks and any file with an extension
  // (favicon, manifest, service worker, photos).
  matcher: [
    "/((?!_next/static|_next/image|api/webhooks|favicon\\.ico|manifest\\.webmanifest|sw\\.js|.*\\.[A-Za-z0-9]+$).*)",
  ],
};
