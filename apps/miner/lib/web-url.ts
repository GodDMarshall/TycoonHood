/**
 * The Miner moved into the member app at /mining. This app only forwards.
 *
 * The member app's public origin comes from NEXT_PUBLIC_MAIN_SITE_URL — the
 * same variable this app always used to link back to the main site (see
 * .env.example). No trailing slash.
 */
import { permanentRedirect } from "next/navigation";

const MAIN_SITE = (process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Permanently (308) forward to `path` on the member app. */
export function forwardToWeb(path: `/${string}`): never {
  permanentRedirect(`${MAIN_SITE}${path}`);
}
