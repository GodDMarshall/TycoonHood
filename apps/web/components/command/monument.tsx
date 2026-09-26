/**
 * THE MONUMENT — the member's progress, drawn as architecture.
 *
 * A stepped plinth of five tiers, one per rank: the tiers you have reached
 * are cut in gold. On it stand four columns, one per pillar, each filled to
 * the member's real progress in that program. When all four columns are
 * complete the lintel is set across them — the monument is finished.
 *
 * Every mark is a fact from the database: rank from the rank table, column
 * heights from Enrollment.progressPct. An unstarted pillar is drawn as an
 * outline — the part of the building not yet built — never as zero decor.
 */
import { cn } from "@tycoonhood/ui";

type Pillar = "WARRIOR" | "BUILDER" | "TYCOON" | "MIND";

const PILLAR_COLOR: Record<Pillar, string> = {
  WARRIOR: "var(--color-warrior)",
  BUILDER: "var(--color-builder)",
  TYCOON: "var(--color-gold)",
  MIND: "var(--color-mind)",
};
const PILLAR_NAME: Record<Pillar, string> = { WARRIOR: "Warrior", BUILDER: "Builder", TYCOON: "Tycoon", MIND: "Mind" };

export function Monument({
  columns,
  rankIndex,
  rankNames,
  className,
}: {
  columns: { pillar: Pillar; pct: number; enrolled: boolean }[];
  /** 0-based index of the member's current rank. */
  rankIndex: number;
  rankNames: string[];
  className?: string;
}) {
  const W = 560;
  const H = 380;
  const CX = 236; // plinth centre — leaves the right margin for rank names
  const base = 340;
  const tierH = 16;
  const tiers = rankNames.length;
  const topY = base - tiers * tierH;
  const colH = 190;
  const colW = 38;
  const topTierW = 400 - (tiers - 1) * 30;
  const gap = (topTierW - columns.length * colW) / (columns.length + 1);
  const x0 = CX - topTierW / 2;
  const complete = columns.length > 0 && columns.every((c) => c.pct >= 100);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("block h-auto w-full", className)}
      role="img"
      aria-label={`Your monument: rank ${rankIndex + 1} of ${tiers} (${rankNames[rankIndex] ?? ""}). ${columns
        .map((c) => `${PILLAR_NAME[c.pillar]} ${c.enrolled ? `${c.pct}% built` : "not started"}`)
        .join(", ")}.`}
    >
      <defs>
        <linearGradient id="mon-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfa95e" stopOpacity="0.16" />
          <stop offset="1" stopColor="#cfa95e" stopOpacity="0" />
        </linearGradient>
        <pattern id="mon-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-line-strong)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Ground line and a pool of light under the plinth. */}
      <ellipse cx={CX} cy={base + 4} rx={240} ry={16} fill="url(#mon-glow)" />
      <line x1="0" y1={base} x2={W} y2={base} stroke="var(--color-line-strong)" />

      {/* The plinth: one tier per rank. */}
      {rankNames.map((name, i) => {
        const w = 400 - i * 30;
        const y = base - (i + 1) * tierH;
        const reached = i <= rankIndex;
        const current = i === rankIndex;
        return (
          <g key={name}>
            <rect
              x={CX - w / 2}
              y={y}
              width={w}
              height={tierH}
              fill={reached ? "#1f1b14" : "#121110"}
              stroke={reached ? "var(--color-gold-deep)" : "var(--color-line)"}
              strokeWidth={1}
            />
            <line
              x1={CX - w / 2}
              y1={y}
              x2={CX + w / 2}
              y2={y}
              stroke={current ? "var(--color-gold-bright)" : reached ? "var(--color-gold)" : "var(--color-line-strong)"}
              strokeWidth={current ? 2 : 1}
            />
            <text
              x={CX + w / 2 + 12}
              y={y + tierH - 4}
              fontFamily="var(--font-mono)"
              fontSize="9.5"
              letterSpacing="1.5"
              fill={current ? "var(--color-gold-bright)" : reached ? "var(--color-gold-deep)" : "var(--color-ink-3)"}
            >
              {name.replace(/^Tycoon\s+/, "").toUpperCase()}
              {current ? "  ◂" : ""}
            </text>
          </g>
        );
      })}

      {/* Columns, one per pillar, filled to real progress. */}
      {columns.map((c, i) => {
        const x = x0 + gap + i * (colW + gap);
        const fillH = Math.round((Math.max(0, Math.min(100, c.pct)) / 100) * colH);
        const color = PILLAR_COLOR[c.pillar];
        return (
          <g key={c.pillar}>
            {/* Blueprint of the full column. */}
            <rect x={x} y={topY - colH} width={colW} height={colH} fill={c.enrolled ? "#141310" : "url(#mon-hatch)"} stroke="var(--color-line-strong)" strokeDasharray={c.enrolled ? undefined : "3 3"} />
            {/* Built portion. */}
            {fillH > 0 && (
              <g className="origin-bottom animate-[th-build_1.1s_var(--ease-premium)_both]" style={{ transformBox: "fill-box" }}>
                <rect x={x} y={topY - fillH} width={colW} height={fillH} fill={color} fillOpacity={0.22} />
                <rect x={x} y={topY - fillH} width={colW} height={fillH} fill="none" stroke={color} strokeOpacity={0.7} />
                <line x1={x - 3} y1={topY - fillH} x2={x + colW + 3} y2={topY - fillH} stroke="var(--color-gold-bright)" strokeWidth={1.5} />
              </g>
            )}
            {/* Capital. */}
            <rect
              x={x - 5}
              y={topY - colH - 8}
              width={colW + 10}
              height={8}
              fill={c.pct >= 100 ? "var(--color-gold)" : "#171613"}
              stroke={c.pct >= 100 ? "var(--color-gold-bright)" : "var(--color-line-strong)"}
            />
            <text x={x + colW / 2} y={topY - colH - 18} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill={c.enrolled ? "var(--color-ink-1)" : "var(--color-ink-3)"}>
              {c.enrolled ? `${c.pct}%` : "—"}
            </text>
            <text x={x + colW / 2} y={topY - colH - 32} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8.5" letterSpacing="1.6" fill={color}>
              {PILLAR_NAME[c.pillar].toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* The lintel: set only when every pillar is complete. */}
      <rect
        x={x0 + gap - 14}
        y={topY - colH - 52}
        width={topTierW - 2 * gap + 28}
        height={8}
        fill={complete ? "var(--color-gold)" : "none"}
        stroke={complete ? "var(--color-gold-bright)" : "var(--color-line)"}
        strokeDasharray={complete ? undefined : "4 4"}
      />
    </svg>
  );
}
