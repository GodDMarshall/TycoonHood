/**
 * Pillar atmospheres — each program gets its own world inside the house.
 *
 *   WARRIOR  disciplined human capability: monumental stone steps, a low
 *            fired-clay sun, one gold line of discipline. No weapons, no
 *            combat, no figures.
 *   BUILDER  business as architecture: a district of blocks on a plan grid,
 *            steel edges, one lit building — the one you are building.
 *   TYCOON   capital as compounding: a curve over a fine grid with the
 *            contributions beneath it. Deliberately not a price chart.
 *   MIND     calm and depth: concentric rings that breathe, a horizon,
 *            a single point of focus.
 *
 * Pure SVG, server-rendered, decorative (aria-hidden). Motion is CSS and
 * stops under reduced motion.
 */
import { cn } from "@tycoonhood/ui";

type Pillar = "WARRIOR" | "BUILDER" | "TYCOON" | "MIND";

const C30 = Math.cos(Math.PI / 6);

function Warrior() {
  const steps = [0, 1, 2, 3, 4];
  return (
    <>
      <defs>
        <linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15110e" />
          <stop offset="1" stopColor="#0a0908" />
        </linearGradient>
        <radialGradient id="w-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--color-warrior)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--color-warrior)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#w-sky)" />
      <circle cx="120" cy="168" r="120" fill="url(#w-sun)" />
      <circle cx="120" cy="168" r="30" fill="var(--color-warrior)" opacity="0.5" />
      <line x1="0" y1="168" x2="400" y2="168" stroke="var(--color-line-strong)" />
      {steps.map((i) => {
        const x = 150 + i * 42;
        const h = 22 + i * 18;
        return (
          <g key={i}>
            <rect x={x} y={168 - h} width={46} height={h} fill={i === 4 ? "#1e1b16" : "#16140f"} stroke="#2a2620" />
            <line x1={x} y1={168 - h} x2={x + 46} y2={168 - h} stroke="var(--color-gold-deep)" strokeWidth={i === 4 ? 1.4 : 0.8} />
          </g>
        );
      })}
      <line x1="339" y1="30" x2="339" y2="72" stroke="var(--color-gold)" strokeWidth="1.5" />
      <rect x="0" y="168" width="400" height="72" fill="#0a0908" opacity="0.6" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={i * 80 - 40} y1="240" x2={120} y2="168" stroke="#231f1a" strokeWidth="0.8" />
      ))}
    </>
  );
}

function Builder() {
  const S = 13;
  const iso = (x: number, y: number, z: number) => [200 + (x - z) * C30 * S, 150 + (x + z) * 0.5 * S - y * S] as const;
  const blocks: [number, number, number, boolean][] = [];
  for (let x = -4; x <= 4; x += 2)
    for (let z = -4; z <= 4; z += 2) {
      const h = 1 + ((Math.abs(Math.sin(x * 12.9 + z * 78.2)) * 43758) % 1) * 5;
      blocks.push([x, z, h, x === 0 && z === 0]);
    }
  blocks.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  const face = (pts: (readonly [number, number])[]) => pts.map((p) => p.join(",")).join(" ");
  return (
    <>
      <rect width="400" height="240" fill="#0c0d0e" />
      <g stroke="var(--color-builder)" strokeOpacity="0.12">
        {Array.from({ length: 13 }, (_, i) => {
          const v = -6 + i;
          const [a, b] = iso(-6, 0, v);
          const [c, d] = iso(6, 0, v);
          const [e, f] = iso(v, 0, -6);
          const [g, h] = iso(v, 0, 6);
          return (
            <g key={i}>
              <line x1={a} y1={b} x2={c} y2={d} />
              <line x1={e} y1={f} x2={g} y2={h} />
            </g>
          );
        })}
      </g>
      {blocks.map(([x, z, h, lit], i) => {
        const w = 0.7;
        const top = [iso(x - w, h, z - w), iso(x + w, h, z - w), iso(x + w, h, z + w), iso(x - w, h, z + w)];
        const front = [iso(x - w, 0, z + w), iso(x + w, 0, z + w), iso(x + w, h, z + w), iso(x - w, h, z + w)];
        const side = [iso(x + w, 0, z - w), iso(x + w, 0, z + w), iso(x + w, h, z + w), iso(x + w, h, z - w)];
        return (
          <g key={i} stroke={lit ? "var(--color-gold-bright)" : "var(--color-builder)"} strokeOpacity={lit ? 0.9 : 0.35} strokeWidth="0.7">
            <polygon points={face(front)} fill={lit ? "#6b5429" : "#14171a"} />
            <polygon points={face(side)} fill={lit ? "#4f3e1f" : "#0f1113"} />
            <polygon points={face(top)} fill={lit ? "var(--color-gold)" : "#1b1f23"} />
          </g>
        );
      })}
    </>
  );
}

function Tycoon() {
  const pts = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    return [40 + t * 320, 200 - (Math.pow(1.34, i) - 1) * 7.2] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <>
      <rect width="400" height="240" fill="#0d0c0a" />
      <g stroke="var(--color-gold-shadow)" strokeOpacity="0.55" strokeWidth="0.6">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="40" y1={40 + i * 20} x2="360" y2={40 + i * 20} />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={40 + i * 32} y1="40" x2={40 + i * 32} y2="200" />
        ))}
      </g>
      {pts.map(([x], i) => (
        <rect key={i} x={x - 5} y={200 - 6 - i * 0.2} width="10" height={6 + i * 0.2} fill="var(--color-gold-deep)" opacity="0.7" />
      ))}
      <path d={`${d} L360,200 L40,200 Z`} fill="var(--color-gold)" opacity="0.07" />
      <path d={d} fill="none" stroke="var(--color-gold)" strokeWidth="1.6" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 10 ? 3.5 : 2} fill={i === 10 ? "var(--color-gold-bright)" : "var(--color-gold)"} />
      ))}
      <line x1="40" y1="200" x2="360" y2="200" stroke="var(--color-line-strong)" />
    </>
  );
}

function Mind() {
  return (
    <>
      <defs>
        <radialGradient id="m-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--color-mind)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--color-mind)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="#0a0b0a" />
      <circle cx="200" cy="120" r="130" fill="url(#m-glow)" />
      <g className="th-breathe" style={{ transformOrigin: "200px 120px" }} fill="none" stroke="var(--color-mind)">
        {[22, 44, 66, 88, 110].map((r, i) => (
          <circle key={r} cx="200" cy="120" r={r} strokeOpacity={0.55 - i * 0.09} strokeWidth="0.8" />
        ))}
      </g>
      <line x1="0" y1="120" x2="400" y2="120" stroke="var(--color-line-strong)" strokeWidth="0.6" />
      <circle cx="200" cy="120" r="3" fill="var(--color-gold-bright)" />
    </>
  );
}

const ART = { WARRIOR: Warrior, BUILDER: Builder, TYCOON: Tycoon, MIND: Mind } as const;

export function PillarArt({ pillar, className }: { pillar: Pillar; className?: string }) {
  const Art = ART[pillar];
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden className={cn("block h-full w-full", className)}>
      <Art />
    </svg>
  );
}

export const PILLAR_WORLD: Record<Pillar, { name: string; line: string }> = {
  WARRIOR: { name: "Warrior", line: "Body and discipline" },
  BUILDER: { name: "Builder", line: "Business and execution" },
  TYCOON: { name: "Tycoon", line: "Capital and compounding" },
  MIND: { name: "Mind", line: "Focus and clarity" },
};
