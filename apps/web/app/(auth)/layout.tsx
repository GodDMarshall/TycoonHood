import Link from "next/link";
import type { ReactNode } from "react";
import { CoinMark, Logo } from "@tycoonhood/ui";

/**
 * The threshold. A split room: the house on one side, the door on the other.
 * On a phone the house collapses to its mark and the door is the page.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="content" tabIndex={-1} className="grid min-h-dvh outline-none lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-bg-1 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="grid-plane absolute inset-0" aria-hidden />
        <div
          aria-hidden
          className="absolute -bottom-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(207_169_94/0.16),transparent)]"
        />
        <Link href="/" className="relative">
          <Logo size={28} />
        </Link>
        <div className="relative flex flex-col gap-8">
          <CoinMark size={88} />
          <p className="display max-w-[14ch] text-[clamp(2.5rem,1.5rem+2.4vw,4rem)]">
            Free to enter. <span className="accent">Hard to fake.</span>
          </p>
          <ul className="flex max-w-md flex-col gap-3 text-[14px] text-ink-2">
            <li className="flex gap-3">
              <span className="figures text-gold">01</span> Four programs, one per pillar — body, business, capital, mind.
            </li>
            <li className="flex gap-3">
              <span className="figures text-gold">02</span> Missions pay XP and THC the moment the work is verified.
            </li>
            <li className="flex gap-3">
              <span className="figures text-gold">03</span> Five ranks, public thresholds, the same for everyone.
            </li>
          </ul>
        </div>
        <p className="relative text-[12px] text-ink-3">
          THC are internal utility credits — not currency, not an investment, not redeemable for money.
        </p>
      </aside>
      <div className="flex flex-col items-center justify-center px-[var(--gutter)] py-12">
        <Link href="/" className="mb-10 lg:hidden">
          <Logo size={26} />
        </Link>
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </main>
  );
}
