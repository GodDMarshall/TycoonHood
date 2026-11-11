/**
 * Which address a request really came from.
 *
 * X-Forwarded-For is a list the visitor can start and each proxy appends to,
 * so only its right-hand end is written by machines we run. With N trusted
 * proxies in front of the app, the visitor's address is the entry N places
 * from the right; anything further left is whatever the visitor typed, and
 * reading it lets anyone dodge a per-IP limit by changing the header.
 * Vercel replaces the header, so there the visitor's address is the only entry.
 *
 * Pure: the web app passes in the header values and TRUSTED_PROXY_HOPS.
 */

export const MAX_TRUSTED_PROXY_HOPS = 5;

/** The longest textual IPv6 address, "ffff:…:ffff:255.255.255.255". */
const MAX_IP_LENGTH = 45;

const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = new RegExp(`^${OCTET}(?:\\.${OCTET}){3}$`);
const HEX_GROUP = /^[0-9a-f]{1,4}$/i;

export interface ForwardingHeaders {
  /** The raw X-Forwarded-For value. */
  forwardedFor?: string | null;
  /** The raw X-Real-IP value. */
  realIp?: string | null;
}

/** TRUSTED_PROXY_HOPS as a number: an integer from 1 to 5. Unset or anything else is 1. */
export function trustedProxyHops(raw: string | null | undefined): number {
  const s = (raw ?? "").trim();
  if (!/^\d{1,2}$/.test(s)) return 1;
  return validHops(Number(s));
}

/**
 * The client's address, or null when no valid address is present.
 * `trustedHops` counts the proxies that append to X-Forwarded-For (1 = the
 * right-most entry). Empty and malformed entries are dropped before counting.
 * With fewer entries than hops, the left-most valid entry is used. X-Real-IP
 * is read only when X-Forwarded-For has nothing usable.
 */
export function clientIpFrom({ forwardedFor, realIp }: ForwardingHeaders, trustedHops = 1): string | null {
  const entries = (forwardedFor ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(isIpAddress);
  if (entries.length > 0) {
    return entries[Math.max(0, entries.length - validHops(trustedHops))].toLowerCase();
  }
  const real = (realIp ?? "").trim();
  return isIpAddress(real) ? real.toLowerCase() : null;
}

function validHops(n: number): number {
  return Number.isInteger(n) && n >= 1 && n <= MAX_TRUSTED_PROXY_HOPS ? n : 1;
}

/** An IPv4 or IPv6 address in plain text form. No ports, brackets or zone ids. */
function isIpAddress(s: string): boolean {
  if (s.length === 0 || s.length > MAX_IP_LENGTH) return false;
  return IPV4.test(s) || isIpv6(s);
}

/** Up to eight hex groups, at most one "::", optionally ending in a dotted IPv4 address. */
function isIpv6(s: string): boolean {
  if (!s.includes(":")) return false;
  const halves = s.split("::");
  if (halves.length > 2) return false;
  let groups = 0;
  for (let h = 0; h < halves.length; h++) {
    if (halves[h] === "") continue;
    const parts = halves[h].split(":");
    for (let i = 0; i < parts.length; i++) {
      const lastPart = h === halves.length - 1 && i === parts.length - 1;
      if (lastPart && parts[i].includes(".")) {
        if (!IPV4.test(parts[i])) return false;
        groups += 2;
      } else if (HEX_GROUP.test(parts[i])) {
        groups += 1;
      } else {
        return false;
      }
    }
  }
  return halves.length === 2 ? groups <= 7 : groups === 8;
}
