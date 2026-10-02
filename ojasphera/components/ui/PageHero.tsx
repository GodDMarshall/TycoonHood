import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function PageHero({ eyebrow, title, lede, children }: { eyebrow: string; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden pb-20 pt-[calc(var(--nav-h)+5rem)] md:pb-28 md:pt-[calc(var(--nav-h)+8rem)]">
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
      <div className="shell">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
        </Reveal>
        <Reveal as="h1" delay={80} className="display mt-8 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
          {title}
        </Reveal>
        {lede ? (
          <Reveal as="p" delay={160} className="lede mt-8 max-w-2xl">
            {lede}
          </Reveal>
        ) : null}
        {children}
      </div>
    </section>
  );
}
