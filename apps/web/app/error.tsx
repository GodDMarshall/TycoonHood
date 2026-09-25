"use client";
import { CoinMark } from "@tycoonhood/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <CoinMark size={64} />
      <p className="figures text-[13px] text-danger">Something broke</p>
      <h1 className="display text-[32px]">That one's on the house.</h1>
      <p className="max-w-sm text-[14px] text-ink-2">
        The error is logged. Your ledger is untouched — every balance change is transactional.
      </p>
      <button onClick={reset} className="text-[14px] font-semibold text-gold hover:underline underline-offset-4">
        Try again
      </button>
    </main>
  );
}
