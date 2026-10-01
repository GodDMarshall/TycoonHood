import type { Metadata } from "next";
import { CoinMark } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };
export const dynamic = "force-static";

/** Shown by the service worker when a page cannot be reached. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <CoinMark size={48} />
      <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.02em]">You&rsquo;re offline</h1>
      <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-ink-2">
        Tycoonhood needs a connection to load your day, your lessons and the community. Reconnect and try again — nothing you did is lost.
      </p>
      <a href="/today" className="mt-8 inline-flex h-11 items-center rounded-md bg-gold px-6 text-[15px] font-semibold text-bg-0">
        Try again
      </a>
    </main>
  );
}
