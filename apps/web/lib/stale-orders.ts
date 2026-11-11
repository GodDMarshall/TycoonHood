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
 * Waits for the jobs at most PAGE_WAIT_MS. A slow payment provider cannot hold
 * the page up: the page renders, and the jobs finish after the response. They
 * never throw into the page.
 */
async function within(...jobs: Promise<unknown>[]) {
  const settled = Promise.all(jobs.map((job) => job.catch((e) => console.error("[shop] releasing expired holds failed", e)))).then(() => undefined);
  after(settled);
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([settled, new Promise<void>((resolve) => (timer = setTimeout(resolve, PAGE_WAIT_MS)))]);
  clearTimeout(timer);
}

/**
 * Runs the sweep and waits for it briefly. With `viewerId`, that member's own
 * expired orders are released on every load, not once a minute: there are only
 * a few, and they are what /checkout is about to quote.
 */
export async function releaseExpiredHolds(viewerId?: string) {
  const jobs: Promise<unknown>[] = [shopCheckout.sweepStale()];
  if (viewerId) jobs.push(shopCheckout.expireStale(new Date(), { userId: viewerId }));
  await within(...jobs);
}

/**
 * The pay page: this member's one order, so a hold that has run out is not
 * offered for payment. If Razorpay is slow to answer, the page renders first;
 * a payment that lands after the order is cancelled is queued for refund.
 */
export async function releaseExpiredOrder(orderId: string, userId: string) {
  await within(shopCheckout.expireStale(new Date(), { orderId, userId }));
}
