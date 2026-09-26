/**
 * THE NETWORK MAP — members by rank, as a constellation.
 *
 * Concentric orbits, one per rank: Initiate on the outside, Legend at the
 * core. Each node is a member at that rank (aggregate counts only — no
 * individual is identified, so rank privacy holds). The viewer's own node
 * is lit. It answers a real question at a glance: how many people are
 * where, and how far in you are.
 */
export function RankMap({
  ranks,
  youIndex,
}: {
  ranks: { name: string; count: number }[];
  /** Index of the viewer's rank, or -1. */
  youIndex: number;
}) {
  const S = 420;
  const C = S / 2;
  const n = ranks.length;
  const orbit = (i: number) => 36 + ((n - 1 - i) / Math.max(1, n - 1)) * (C - 58);
  const MAX_NODES = 90;

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="block h-auto w-full" role="img" aria-label={`Members by rank: ${ranks.map((r) => `${r.name} ${r.count}`).join(", ")}.`}>
      <defs>
        <radialGradient id="rm-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#cfa95e" stopOpacity="0.28" />
          <stop offset="1" stopColor="#cfa95e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={70} fill="url(#rm-core)" />
      {ranks.map((r, i) => {
        const R = orbit(i);
        const shown = Math.min(r.count, MAX_NODES);
        const lit = i === youIndex;
        return (
          <g key={r.name}>
            <circle cx={C} cy={C} r={R} fill="none" stroke={lit ? "var(--color-gold-deep)" : "var(--color-line-strong)"} strokeWidth={lit ? 1 : 0.8} strokeDasharray={lit ? undefined : "2 4"} />
            {Array.from({ length: shown }, (_, k) => {
              const a = (k / Math.max(1, shown)) * Math.PI * 2 + i * 0.7;
              const isYou = lit && k === 0;
              return (
                <circle
                  key={k}
                  cx={C + Math.cos(a) * R}
                  cy={C + Math.sin(a) * R}
                  r={isYou ? 4.5 : 2}
                  fill={isYou ? "var(--color-gold-bright)" : i >= n - 2 ? "var(--color-gold)" : "var(--color-ink-3)"}
                  stroke={isYou ? "var(--color-bg-0)" : undefined}
                  strokeWidth={isYou ? 1.5 : undefined}
                />
              );
            })}
            <text
              x={C}
              y={C - R - 6}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="9"
              letterSpacing="1.6"
              fill={lit ? "var(--color-gold-bright)" : "var(--color-ink-3)"}
            >
              {r.name.toUpperCase()} · {r.count}
              {r.count > MAX_NODES ? "+" : ""}
            </text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={5} fill="var(--color-gold)" />
    </svg>
  );
}
