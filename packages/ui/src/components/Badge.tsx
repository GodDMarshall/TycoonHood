import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type Tone = "neutral" | "gold" | "warrior" | "builder" | "tycoon" | "mind" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "border-line-strong text-ink-2 bg-bg-2",
  gold: "border-gold-deep text-gold-bright bg-gold/10",
  warrior: "border-warrior/50 text-warrior bg-warrior/10",
  builder: "border-builder/50 text-builder bg-builder/10",
  tycoon: "border-gold-deep text-gold bg-gold/10",
  mind: "border-mind/50 text-mind bg-mind/10",
  success: "border-success/50 text-success bg-success/10",
  danger: "border-danger/50 text-danger bg-danger/10",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-[11px] font-semibold uppercase tracking-[0.14em]",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

/** Rank insignia: pips fill with rank order — Initiate ○ through Legend ●●●●● */
const RANKS: Record<string, { name: string; pips: number }> = {
  initiate: { name: "Initiate", pips: 1 },
  apprentice: { name: "Apprentice", pips: 2 },
  mastermind: { name: "Mastermind", pips: 3 },
  elite: { name: "Elite", pips: 4 },
  legend: { name: "Legend", pips: 5 },
};

export function RankBadge({ slug, className }: { slug: string; className?: string }) {
  const rank = RANKS[slug] ?? { name: slug, pips: 0 };
  return (
    <Badge tone="gold" className={className}>
      <span aria-hidden className="tracking-[0.2em] text-[9px]">
        {"●".repeat(rank.pips)}
        {"○".repeat(Math.max(0, 5 - rank.pips))}
      </span>
      {rank.name}
    </Badge>
  );
}

export function PillarBadge({ pillar, className }: { pillar: "WARRIOR" | "BUILDER" | "TYCOON" | "MIND"; className?: string }) {
  const tone = pillar.toLowerCase() as Tone;
  return <Badge tone={tone} className={className}>{pillar}</Badge>;
}
