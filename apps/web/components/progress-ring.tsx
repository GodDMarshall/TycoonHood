/** A mission gauge: a thin ring with a lit arc and the figure in the middle. */
export function ProgressRing({
  value,
  max,
  size = 76,
  label,
  caption,
}: {
  value: number;
  max: number;
  size?: number;
  label: string;
  caption?: string;
}) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 76 76" width={size} height={size} className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-line-strong)" strokeWidth="2" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="2.5"
          strokeDasharray={`${c * pct} ${c}`}
          className="transition-[stroke-dasharray] duration-[var(--dur-4)]"
        />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={38 + Math.cos(a) * 34.5}
              y1={38 + Math.sin(a) * 34.5}
              x2={38 + Math.cos(a) * 36.5}
              y2={38 + Math.sin(a) * 36.5}
              stroke="var(--color-line-strong)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="figures text-[15px] leading-none text-ink-1">
          {value}
          <span className="text-ink-3">/{max}</span>
        </span>
        {caption && <span className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-3">{caption}</span>}
      </span>
    </div>
  );
}
