/**
 * Small drawn marks for a member's record: the streak flame, the progress
 * ring, rank emblems and achievement medals. Server components — pure SVG.
 *
 * Every one of them draws a real number. The flame grows with the real
 * streak; the ring fills to the real ratio; the emblem's tier is the rank's
 * real position in the ladder. None of them invents state.
 */
import { useId } from "react";
import { cn } from "@tycoonhood/ui";

/* ── Streak flame ─────────────────────────────────────────────────────────
   0 days: a cold ember. Then the flame grows in three steps (1+, 7+, 30+). */
export function StreakFlame({ days, size = 28, className }: { days: number; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const step = days <= 0 ? 0 : days < 7 ? 1 : days < 30 ? 2 : 3;
  const scale = [0.55, 0.78, 0.9, 1][step];
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn("shrink-0", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={step ? "#c9705f" : "#37342d"} />
          <stop offset="55%" stopColor={step ? "#d9a441" : "#4a463d"} />
          <stop offset="100%" stopColor={step ? "#f1d99c" : "#6b665a"} />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="29" rx="8" ry="1.6" fill="#000" opacity="0.4" />
      <g transform={`translate(16 29) scale(${scale}) translate(-16 -29)`}>
        <path
          d="M16 2 C 20 9, 27 12, 26 20 C 25.3 25.6, 21 29, 16 29 C 11 29, 6.7 25.6, 6 20 C 5.4 14.6, 9.5 12, 11 7 C 12.5 11, 14 12, 15 12 C 15.4 8.5, 15 5, 16 2 Z"
          fill={`url(#${id}-f)`}
        />
        {step > 0 && (
          <path
            d="M16 15 C 18.5 18.5, 21 20, 20.4 23.6 C 20 26.4, 18.2 28, 16 28 C 13.8 28, 11.8 26.4, 11.6 23.8 C 11.4 21, 13.6 19.6, 14.4 17.6 C 15 19, 15.8 19.4, 16 19.4 Z"
            fill="#fbecc4"
            opacity={0.55 + step * 0.12}
          />
        )}
      </g>
      {step === 3 && (
        <g fill="#f1d99c">
          <circle cx="7" cy="9" r="0.9" />
          <circle cx="25.5" cy="6.5" r="0.7" />
          <circle cx="27" cy="13" r="0.6" />
        </g>
      )}
    </svg>
  );
}

/* ── Progress ring ────────────────────────────────────────────────────────
   Labelled for screen readers ("3 of 5 done"); the centre shows the count. */
export function ProgressRing({
  value,
  total,
  size = 88,
  stroke = 8,
  label,
  tone = "gold",
  children,
  className,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  label: string;
  tone?: "gold" | "success";
  children?: React.ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const color = tone === "success" ? "var(--color-success)" : "var(--color-gold)";
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden focusable="false">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line-strong)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
        {children}
      </div>
    </div>
  );
}

/* ── Rank emblem ──────────────────────────────────────────────────────────
   A shield whose detail grows with the rank's position in the ladder:
   chevrons for the first ranks, then a laurel, then a crown at the top. */
export function RankEmblem({ tier, of, size = 56, className }: { tier: number; of: number; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const t = Math.max(0, Math.min(tier, Math.max(0, of - 1)));
  const top = of > 1 && t === of - 1;
  const chevrons = Math.min(3, t + 1);
  const laurel = t >= 3;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn("shrink-0", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1d99c" />
          <stop offset="50%" stopColor="#cfa95e" />
          <stop offset="100%" stopColor="#7a5f2e" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#24211c" />
          <stop offset="100%" stopColor="#100f0d" />
        </linearGradient>
      </defs>
      {laurel && (
        <g fill="none" stroke={`url(#${id}-m)`} strokeWidth="1.6" strokeLinecap="round">
          <path d="M14 50 C 6 42, 5 30, 9 20" />
          <path d="M50 50 C 58 42, 59 30, 55 20" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <path d={`M${8.4 + i * 0.4} ${24 + i * 7} l-4 -3`} />
              <path d={`M${55.6 - i * 0.4} ${24 + i * 7} l4 -3`} />
            </g>
          ))}
        </g>
      )}
      <path d="M32 6 L52 13 V31 C52 44 43 53 32 58 C21 53 12 44 12 31 V13 Z" fill={`url(#${id}-s)`} stroke={`url(#${id}-m)`} strokeWidth="2" />
      <path d="M32 11 L47.5 16.5 V31 C47.5 41.5 40.5 48.8 32 53 C23.5 48.8 16.5 41.5 16.5 31 V16.5 Z" fill="none" stroke="#cfa95e" strokeOpacity="0.25" />
      {top ? (
        <path d="M21 36 L23 23 L28 29 L32 20 L36 29 L41 23 L43 36 Z" fill={`url(#${id}-m)`} stroke="#5c4a26" strokeWidth="0.8" />
      ) : (
        Array.from({ length: chevrons }, (_, i) => (
          <path
            key={i}
            d={`M22 ${24 + i * 8} L32 ${31 + i * 8} L42 ${24 + i * 8}`}
            fill="none"
            stroke={`url(#${id}-m)`}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
      {top && <rect x="21" y="38" width="22" height="3" rx="1" fill={`url(#${id}-m)`} />}
    </svg>
  );
}

/* ── Achievement medal ────────────────────────────────────────────────────
   Locked medals are drawn in iron; earned ones in gold. The glyph is a
   letter from the achievement's own name, so no artwork is invented per
   achievement. */
export function Medal({ earned, glyph, size = 48, className }: { earned: boolean; glyph: string; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 56" width={size} height={(size * 56) / 48} className={cn("shrink-0", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={earned ? "#f1d99c" : "#4a463d"} />
          <stop offset="55%" stopColor={earned ? "#cfa95e" : "#37342d"} />
          <stop offset="100%" stopColor={earned ? "#7a5f2e" : "#1f1d19"} />
        </linearGradient>
      </defs>
      <path d="M14 0 H22 L26 16 H18 Z" fill={earned ? "#c9705f" : "#26241f"} />
      <path d="M34 0 H26 L22 16 H30 Z" fill={earned ? "#a85646" : "#1f1d19"} />
      <circle cx="24" cy="34" r="19" fill={`url(#${id}-g)`} stroke={earned ? "#5c4a26" : "#26241f"} />
      <circle cx="24" cy="34" r="14" fill="none" stroke={earned ? "#fbecc4" : "#6b665a"} strokeOpacity="0.4" strokeDasharray="1.5 2.5" />
      <text x="24" y="39.5" textAnchor="middle" fontSize="15" fontWeight="700" fill={earned ? "#3a2c10" : "#8f897c"}>
        {glyph.slice(0, 1).toUpperCase()}
      </text>
    </svg>
  );
}
