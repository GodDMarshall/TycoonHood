import { cn } from "../cn";

export function Progress({
  value,
  max = 100,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-bg-2 border border-line", className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold-deep via-gold to-gold-bright transition-[width] duration-300"
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">
          Level <span className="figures text-gold">{level}</span>
        </span>
        <span className="figures text-[12px] text-ink-2">
          {into.toLocaleString()} / {span.toLocaleString()} XP
        </span>
      </div>
      <Progress value={into} max={span} />
    </div>
  );
}
