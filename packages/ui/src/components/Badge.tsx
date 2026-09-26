import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type Tone = "neutral" | "gold" | "warrior" | "builder" | "tycoon" | "mind" | "success" | "danger" | "warning";

/**
 * A tag, not a pill. Rectangular, hairline-bordered, mono small caps —
 * the label on a drawer in the vault rather than a sticker on a toy.
 */
const tones: Record<Tone, string> = {
  neutral: "border-line-strong text-ink-2 bg-bg-2",
  gold: "border-gold-deep/70 text-gold-bright bg-gold/[0.07]",
  warrior: "border-warrior/40 text-warrior bg-warrior/[0.07]",
  builder: "border-builder/40 text-builder bg-builder/[0.07]",
  tycoon: "border-gold-deep/70 text-gold bg-gold/[0.07]",
  mind: "border-mind/40 text-mind bg-mind/[0.07]",
  success: "border-success/40 text-success bg-success/[0.07]",
  danger: "border-danger/40 text-danger bg-danger/[0.07]",
  warning: "border-warning/40 text-warning bg-warning/[0.07]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-sm border px-2",
        "font-mono text-[10.5px] font-medium uppercase leading-none tracking-[0.14em]",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

/** Rank insignia: five bars, filled to the rank's order — Initiate through Legend. */
const RANKS: Record<string, { name: string; pips: number }> = {
  initiate: { name: "Initiate", pips: 1 },
  apprentice: { name: "Apprentice", pips: 2 },
  mastermind: { name: "Mastermind", pips: 3 },
  elite: { name: "Elite", pips: 4 },
  legend: { name: "Legend", pips: 5 },
};

export function RankPips({ filled, className }: { filled: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-end gap-[2px]", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-[1px]", i < filled ? "bg-gold" : "bg-line-strong")}
          style={{ height: 5 + i * 1.5 }}
        />
      ))}
    </span>
  );
}

export function RankBadge({ slug, className }: { slug: string; className?: string }) {
  const rank = RANKS[slug] ?? { name: slug, pips: 0 };
  return (
    <Badge tone="gold" className={className}>
      <RankPips filled={rank.pips} />
      {rank.name}
    </Badge>
  );
}

export const PILLAR_LABEL = {
  WARRIOR: "Warrior",
  BUILDER: "Builder",
  TYCOON: "Tycoon",
  MIND: "Mind",
} as const;

export function PillarBadge({ pillar, className }: { pillar: "WARRIOR" | "BUILDER" | "TYCOON" | "MIND"; className?: string }) {
  const tone = pillar.toLowerCase() as Tone;
  return (
    <Badge tone={tone} className={className}>
      <span aria-hidden className="size-1.5 rounded-[1px] bg-current" />
      {PILLAR_LABEL[pillar]}
    </Badge>
  );
}
