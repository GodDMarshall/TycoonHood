/**
 * The sky over Today, set by the member's own local hour (their profile time
 * zone): night, dawn, day or dusk. A horizon of ridges, the sun or moon in the
 * right place. Decorative — the greeting carries the meaning.
 */
import { useId } from "react";
import { cn } from "@tycoonhood/ui";

export type SkyPhase = "night" | "dawn" | "day" | "dusk";

export function skyPhase(hour: number): SkyPhase {
  if (hour < 5 || hour >= 21) return "night";
  if (hour < 9) return "dawn";
  if (hour < 17) return "day";
  return "dusk";
}

const SKY: Record<
  SkyPhase,
  {
    top: string;
    mid: string;
    low: string;
    body: string;
    glow: string;
    ridge: [string, string, string];
  }
> = {
  night: {
    top: "#07080c",
    mid: "#0d1018",
    low: "#171a22",
    body: "#e8e4d8",
    glow: "rgb(180 190 220 / 0.18)",
    ridge: ["#14161c", "#0f1015", "#0a0b0e"],
  },
  dawn: {
    top: "#14121a",
    mid: "#3a2a2c",
    low: "#b5744e",
    body: "#f6d79a",
    glow: "rgb(246 190 120 / 0.45)",
    ridge: ["#2a1f1f", "#1d1616", "#120e0d"],
  },
  day: {
    top: "#161a20",
    mid: "#33302a",
    low: "#8a6a3c",
    body: "#f8e6b8",
    glow: "rgb(240 210 150 / 0.35)",
    ridge: ["#2a2620", "#1d1a16", "#13110e"],
  },
  dusk: {
    top: "#100c12",
    mid: "#3a1f22",
    low: "#a2533e",
    body: "#f0b27a",
    glow: "rgb(220 120 80 / 0.42)",
    ridge: ["#2a1717", "#1c1010", "#110a0a"],
  },
};

const SUN_POS: Record<SkyPhase, [number, number]> = {
  // Kept clear of the left (text) and the far right (Today's stat card).
  night: [700, 60],
  dawn: [640, 196],
  day: [720, 64],
  dusk: [760, 186],
};

export function DaySky({ phase, className }: { phase: SkyPhase; className?: string }) {
  const id = useId().replace(/:/g, "");
  const s = SKY[phase];
  const [sx, sy] = SUN_POS[phase];
  return (
    <svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMid slice" className={cn("h-full w-full", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={s.top} />
          <stop offset="60%" stopColor={s.mid} />
          <stop offset="100%" stopColor={s.low} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx={sx / 1200} cy={sy / 260} r="0.5">
          <stop offset="0%" stopColor={s.glow} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="1200" height="260" fill={`url(#${id}-sky)`} />
      <rect width="1200" height="260" fill={`url(#${id}-glow)`} />
      {phase === "night" &&
        Array.from({ length: 46 }, (_, i) => {
          // Deterministic scatter — same stars every render, no hydration drift.
          const x = (i * 263) % 1200;
          const y = (i * 97) % 150;
          return <circle key={i} cx={x} cy={y + 6} r={i % 5 === 0 ? 1.3 : 0.8} fill="#f3efe7" opacity={0.25 + ((i * 37) % 50) / 100} />;
        })}
      <circle cx={sx} cy={sy} r={phase === "night" ? 22 : 34} fill={s.body} opacity={phase === "night" ? 0.9 : 0.95} />
      {phase === "night" && <circle cx={sx + 9} cy={sy - 6} r="20" fill={s.top} opacity="0.85" />}
      <path
        d="M0 170 L90 140 L170 158 L260 118 L360 150 L450 126 L560 160 L660 120 L760 148 L860 112 L960 150 L1060 130 L1200 156 V260 H0Z"
        fill={s.ridge[0]}
      />
      <path d="M0 196 L120 170 L230 190 L340 164 L470 194 L590 172 L700 196 L820 168 L940 192 L1070 172 L1200 188 V260 H0Z" fill={s.ridge[1]} />
      <path d="M0 226 L160 206 L300 224 L460 204 L620 226 L780 208 L940 228 L1100 210 L1200 222 V260 H0Z" fill={s.ridge[2]} />
      <rect y="200" width="1200" height="60" fill="#0a0908" opacity="0.55" />
    </svg>
  );
}
