/**
 * Lets unpaid rupee orders whose hold ran out give their stock and coupons
 * back before a page reads them (see shopCheckout.sweepStale: at most once a
 * minute per server instance). The cron route does the same on a schedule.
 */
import { after } from "next/server";
import { shopCheckout } from "@tycoonhood/core";

/** How long a page waits for the sweep before it renders anyway. */
const PAGE_WAIT_MS = 1_500;

/**
 * Runs the sweep and waits for it briefly. A slow payment provider cannot hold
 * the page up: after PAGE_WAIT_MS the page renders, and the sweep finishes
 * after the response.
 */
export async function releaseExpiredHolds() {
  const sweep = shopCheckout.sweepStale();
  after(sweep);
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([sweep, new Promise<void>((resolve) => (timer = setTimeout(resolve, PAGE_WAIT_MS)))]);
  clearTimeout(timer);
}
