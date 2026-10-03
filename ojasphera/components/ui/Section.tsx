import type { ReactNode } from "react";
import { Mark } from "../site/Logo";
import { Reveal } from "./Reveal";

/** Editorial section header: index + label rail on the left, headline on the right. */
export function SectionHead({
  index,
  label,
  title,
  lede,
  className = "",
}: {
  index?: string;
  label: string;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-8 md:grid-cols-12 ${className}`}>
      <Reveal className="md:col-span-3">
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Mark size={13} className="text-ink-2" />
          {index ? <span className="mono text-xs text-ojas">{index}</span> : null}
          <span className="eyebrow">{label}</span>
        </div>
      </Reveal>
      <div className="md:col-span-9">
        <Reveal as="h2" className="headline text-[clamp(2.25rem,5.4vw,5rem)]" delay={80}>
          {title}
        </Reveal>
        {lede ? (
          <Reveal as="p" className="lede mt-6 max-w-2xl" delay={160}>
            {lede}
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}
