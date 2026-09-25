import Link from "next/link";
import { CoinMark } from "@tycoonhood/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <CoinMark size={64} />
      <p className="figures text-[13px] text-gold-deep">404 — not on the books</p>
      <h1 className="display text-[32px]">This page doesn't exist.</h1>
      <p className="max-w-sm text-[14px] text-ink-2">Whatever you were promised, it wasn't ledgered here.</p>
      <Link href="/" className="text-[14px] font-semibold text-gold hover:underline underline-offset-4">← Back to the rig</Link>
    </main>
  );
}
