import Link from "next/link";
import { CoinMark, Icon, buttonStyles } from "@tycoonhood/ui";

export default function NotFound() {
  return (
    <main id="content" className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-[var(--gutter)] text-center">
      <div className="grid-plane pointer-events-none absolute inset-0" aria-hidden />
      <CoinMark size={72} className="relative" />
      <p className="index relative">404 — not on the books</p>
      <h1 className="display relative max-w-[16ch] text-h1">
        This room <span className="accent">doesn&apos;t exist.</span>
      </h1>
      <p className="relative max-w-sm text-[15px] text-ink-2">Whatever you were promised, it wasn&apos;t ledgered here.</p>
      <Link href="/" className={buttonStyles({ variant: "secondary", className: "relative" })}>
        <Icon name="arrow-left" size={15} /> Back to the HQ
      </Link>
    </main>
  );
}
