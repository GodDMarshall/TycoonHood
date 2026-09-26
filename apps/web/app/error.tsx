"use client";
import Link from "next/link";
import { Button, CoinMark, buttonStyles } from "@tycoonhood/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="content" className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-[var(--gutter)] text-center">
      <div className="grid-plane pointer-events-none absolute inset-0" aria-hidden />
      <CoinMark size={72} className="relative" />
      <p className="index relative text-danger">Something broke</p>
      <h1 className="display relative max-w-[18ch] text-h1">
        That one&apos;s <span className="accent">on the house.</span>
      </h1>
      <p className="relative max-w-sm text-[15px] text-ink-2">
        The error is logged. Your ledger is untouched — every balance change is transactional.
      </p>
      <div className="relative flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonStyles({ variant: "secondary" })}>
          Back to the HQ
        </Link>
      </div>
    </main>
  );
}
