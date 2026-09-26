import { cn } from "../cn";

/**
 * A precise instrument, not a candy bar: 4px, square ends, a metal fill
 * with a lit leading edge. `label` names the bar for assistive tech.
 */
export function Progress({
  value,
  max = 100,
  label,
  tone = "gold",
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "gold" | "warrior" | "builder" | "mind" | "tycoon";
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  const fills = {
    gold: "bg-[linear-gradient(90deg,var(--color-gold-shadow),var(--color-gold)_70%,var(--color-gold-bright))]",
    tycoon: "bg-[linear-gradient(90deg,var(--color-gold-shadow),var(--color-gold)_70%,var(--color-gold-bright))]",
    warrior: "bg-warrior",
    builder: "bg-builder",
    mind: "bg-mind",
  } as const;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("relative h-1 w-full overflow-hidden rounded-[1px] bg-line", className)}
    >
      <div
        className={cn("h-full transition-[width] duration-[var(--dur-4)] ease-[var(--ease-premium)]", fills[tone])}
        style={{ width: pct + "%" }}
      />
    </div>
  );
}

/** XP toward next level, with ledger figures on both ends. */
export function XpBar({
  currentXp,
  levelFloorXp,
  nextLevelXp,
  level,
  className,
}: {
  currentXp: number;
  levelFloorXp: number;
  nextLevelXp: number;
  level: number;
  className?: string;
}) {
  const span = Math.max(1, nextLevelXp - levelFloorXp);
  const into = currentXp - levelFloorXp;
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-ink-3">
          Level <span className="figures text-gold">{level}</span>
        </span>
        <span className="figures text-[12px] text-ink-2">
          {into.toLocaleString("en-US")} / {span.toLocaleString("en-US")} XP
        </span>
      </div>
      <Progress value={into} max={span} label={`Progress to level ${level + 1}`} />
    </div>
  );
}
