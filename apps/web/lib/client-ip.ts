/**
 * The visitor's address, for per-IP limits and hashed device records. Which
 * X-Forwarded-For entry to trust is decided in core (clientIpFrom); this file
 * only reads the request headers and TRUSTED_PROXY_HOPS.
 */
import { headers } from "next/headers";
import { clientIpFrom, trustedProxyHops } from "@tycoonhood/core";

/** From a set of request headers, e.g. a route handler's `req.headers`. */
export function clientIpFromHeaders(h: { get(name: string): string | null }): string | null {
  return clientIpFrom(
    { forwardedFor: h.get("x-forwarded-for"), realIp: h.get("x-real-ip") },
    trustedProxyHops(process.env.TRUSTED_PROXY_HOPS),
  );
}

/** For server components and server actions. */
export async function clientIp(): Promise<string | null> {
  return clientIpFromHeaders(await headers());
}
