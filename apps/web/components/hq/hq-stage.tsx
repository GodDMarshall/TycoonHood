/**
 * The homepage stage — the architectural drawing of the house, with a real
 * link for every district. Server-rendered, zero JavaScript.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@tycoonhood/ui";
import { DISTRICTS, districtHref } from "./districts";
import { DRAWING_ANCHORS, DRAWING_ASPECT } from "./drawing-frame";

export function HQStage({ poster, member, className }: { poster: ReactNode; member: boolean; className?: string }) {
  return (
    <div className={cn("relative xl:flex xl:h-full xl:items-center xl:justify-end", className)}>
      <div className="relative mx-auto w-full max-w-[620px] xl:mx-0 xl:mr-[2%] xl:w-[60%] xl:max-w-none" style={{ aspectRatio: DRAWING_ASPECT }}>
        {poster}
        {DISTRICTS.map((d) => (
          <Link
            key={d.id}
            href={districtHref(d, member)}
            className="group absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center max-sm:hidden"
            style={{ left: `${DRAWING_ANCHORS[d.id].left}%`, top: `${DRAWING_ANCHORS[d.id].top}%` }}
            aria-label={`${d.name} — ${member ? d.note : (d.guestNote ?? d.note)}`}
          >
            <span className="rounded-sm border border-line-strong bg-bg-0/85 px-2.5 py-1.5 text-center shadow-[var(--shadow-2)] group-hover:border-gold-deep">
              <span className="whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-gold">{d.name}</span>
            </span>
            <span aria-hidden className="h-6 w-px bg-gradient-to-b from-gold-deep to-transparent" />
            <span aria-hidden className="size-[5px] rotate-45 bg-gold" />
          </Link>
        ))}
      </div>
    </div>
  );
}
