/**
 * Program covers, drawn in code. One scene per pillar so a program reads at a
 * glance before its title does:
 *
 *   WARRIOR — a loaded barbell under a single spotlight
 *   BUILDER — a structure rising floor by floor against a grid
 *   TYCOON  — coin stacks with the compounding curve climbing over them
 *   MIND    — a still lake, one drop, the rings spreading
 *
 * Decorative only (aria-hidden): the title beside it carries the meaning.
 * When a program has a real cover photo, `CourseCover` shows that instead.
 * Server component — pure SVG, no state.
 */
import { useId } from "react";
import { cn } from "@tycoonhood/ui";

export type Pillar = "WARRIOR" | "BUILDER" | "TYCOON" | "MIND";

const HUE: Record<Pillar, { main: string; light: string; deep: string }> = {
  WARRIOR: { main: "#c9705f", light: "#e6a493", deep: "#5e2a20" },
  BUILDER: { main: "#7d9cb5", light: "#b5cadb", deep: "#26394a" },
  TYCOON: { main: "#cfa95e", light: "#f1d99c", deep: "#5c4a26" },
  MIND: { main: "#86ab99", light: "#bcd6c8", deep: "#2a4237" },
};

export function ProgramArt({ pillar, className }: { pillar: Pillar; className?: string }) {
  const id = useId().replace(/:/g, "");
  const h = HUE[pillar];
  return (
    <svg viewBox="0 0 640 280" preserveAspectRatio="xMidYMid slice" className={cn("h-full w-full", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0c0a" />
          <stop offset="100%" stopColor="#16140f" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={h.main} stopOpacity="0.34" />
          <stop offset="60%" stopColor={h.main} stopOpacity="0.06" />
          <stop offset="100%" stopColor={h.main} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={h.light} />
          <stop offset="50%" stopColor={h.main} />
          <stop offset="100%" stopColor={h.deep} />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1d99c" />
          <stop offset="50%" stopColor="#cfa95e" />
          <stop offset="100%" stopColor="#7a5f2e" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={h.light} stopOpacity="0.28" />
          <stop offset="100%" stopColor={h.light} stopOpacity="0" />
        </linearGradient>
        <pattern id={`${id}-grid`} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke={h.main} strokeOpacity="0.09" />
        </pattern>
      </defs>

      <rect width="640" height="280" fill={`url(#${id}-sky)`} />
      <rect width="640" height="280" fill={`url(#${id}-halo)`} />
      {pillar === "WARRIOR" && <Warrior id={id} h={h} />}
      {pillar === "BUILDER" && <Builder id={id} h={h} />}
      {pillar === "TYCOON" && <Tycoon id={id} h={h} />}
      {pillar === "MIND" && <Mind id={id} h={h} />}
      {/* Vignette so a title laid over the bottom-left always reads */}
      <rect y="170" width="640" height="110" fill="#0a0908" opacity="0.35" />
    </svg>
  );
}

type SceneProps = {
  id: string;
  h: { main: string; light: string; deep: string };
};

function Warrior({ id, h }: SceneProps) {
  const plates = (cx: number, dir: 1 | -1) =>
    [0, 1, 2].map((i) => {
      const w = [26, 20, 16][i];
      const ph = [118, 96, 74][i];
      const x = cx + dir * [0, 28, 50][i] - w / 2;
      return <rect key={i} x={x} y={170 - ph / 2} width={w} height={ph} rx="5" fill={`url(#${id}-metal)`} stroke={h.deep} />;
    });
  return (
    <g>
      {/* Spotlight */}
      <path d="M270 0 H370 L470 230 H170 Z" fill={`url(#${id}-beam)`} />
      {/* Floor */}
      <ellipse cx="320" cy="236" rx="240" ry="22" fill="#000" opacity="0.6" />
      <ellipse cx="320" cy="232" rx="170" ry="12" fill={h.main} opacity="0.12" />
      {/* Platform lines */}
      <path d="M40 240 H600" stroke={h.main} strokeOpacity="0.25" />
      <path d="M90 256 H550" stroke={h.main} strokeOpacity="0.12" />
      {/* Bar */}
      <rect x="120" y="165" width="400" height="10" rx="5" fill="#8f897c" />
      <rect x="120" y="165" width="400" height="3" rx="1.5" fill="#d6d0c4" opacity="0.6" />
      <rect x="250" y="163" width="140" height="14" rx="3" fill="#6b665a" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${262 + i * 18} 163 v14`} stroke="#4a463d" strokeWidth="1.5" />
      ))}
      {plates(200, -1)}
      {plates(440, 1)}
      {/* Collars */}
      <rect x="216" y="158" width="10" height="24" rx="2" fill="#b4ad9f" />
      <rect x="414" y="158" width="10" height="24" rx="2" fill="#b4ad9f" />
      {/* Chalk dust */}
      {[
        [300, 140, 2],
        [334, 128, 1.5],
        [356, 148, 1.2],
        [284, 120, 1],
        [318, 108, 1.3],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#f3efe7" opacity="0.5" />
      ))}
    </g>
  );
}

function Builder({ id, h }: SceneProps) {
  const floors = 7;
  return (
    <g>
      <rect width="640" height="280" fill={`url(#${id}-grid)`} />
      {/* Ground */}
      <path d="M0 236 H640" stroke={h.main} strokeOpacity="0.35" />
      {/* Background towers */}
      {[
        [70, 150, 54],
        [140, 120, 40],
        [470, 130, 46],
        [530, 160, 60],
      ].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={236 - y} fill={h.deep} opacity="0.55" />
      ))}
      {/* The rising structure */}
      {Array.from({ length: floors }, (_, i) => {
        const y = 212 - i * 24;
        const solid = i < 5;
        return (
          <g key={i}>
            <rect
              x="256"
              y={y}
              width="128"
              height="24"
              fill={solid ? `url(#${id}-metal)` : "none"}
              opacity={solid ? 0.9 - i * 0.06 : 1}
              stroke={h.light}
              strokeOpacity={solid ? 0.3 : 0.6}
              strokeDasharray={solid ? undefined : "5 5"}
            />
            {solid &&
              [0, 1, 2, 3].map((w) => (
                <rect key={w} x={266 + w * 30} y={y + 7} width="16" height="10" rx="1" fill="#0d0c0a" opacity={(i + w) % 3 === 0 ? 0.25 : 0.7} />
              ))}
          </g>
        );
      })}
      {/* Crane */}
      <path d="M420 236 V44 M420 50 H220 M420 50 L470 70 M300 50 V112" stroke={h.light} strokeOpacity="0.7" strokeWidth="2" fill="none" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M414 ${232 - i * 21} L426 ${222 - i * 21}`} stroke={h.light} strokeOpacity="0.4" />
      ))}
      <rect x="284" y="112" width="32" height="10" fill={`url(#${id}-gold)`} />
      {/* Rising chart line over it all */}
      <path
        d="M40 220 L150 196 L230 204 L320 150 L400 132 L520 74 L600 48"
        fill="none"
        stroke="#cfa95e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <circle cx="600" cy="48" r="5" fill="#f1d99c" />
    </g>
  );
}

function Tycoon({ id }: SceneProps) {
  const stack = (x: number, n: number) =>
    Array.from({ length: n }, (_, i) => (
      <g key={i}>
        <ellipse cx={x} cy={228 - i * 11} rx="34" ry="9" fill="#5c4a26" />
        <rect x={x - 34} y={219 - i * 11} width="68" height="9" fill={`url(#${id}-gold)`} />
        <ellipse cx={x} cy={219 - i * 11} rx="34" ry="9" fill="#e8cf94" stroke="#a38449" strokeWidth="0.8" />
      </g>
    ));
  // A compounding curve: each period grows on the last (×1.52), seven periods.
  const pts = Array.from({ length: 8 }, (_, i) => {
    const x = 60 + i * 76;
    const y = 222 - 9 * Math.pow(1.52, i);
    return [x, Math.max(28, y)] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <g>
      <path d="M0 238 H640" stroke="#cfa95e" strokeOpacity="0.3" />
      <ellipse cx="320" cy="240" rx="280" ry="16" fill="#000" opacity="0.5" />
      {stack(100, 2)}
      {stack(176, 3)}
      {stack(252, 4)}
      {stack(328, 6)}
      {stack(404, 8)}
      {stack(480, 11)}
      {stack(556, 15)}
      <path d={`${d} L596 238 L60 238 Z`} fill="#cfa95e" opacity="0.07" />
      <path d={d} fill="none" stroke="#f1d99c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 5 : 3} fill="#f1d99c" />
      ))}
    </g>
  );
}

function Mind({ id, h }: SceneProps) {
  return (
    <g>
      {/* Moon */}
      <circle cx="470" cy="70" r="26" fill={h.light} opacity="0.85" />
      <circle cx="480" cy="64" r="24" fill="#0e0d0b" opacity="0.55" />
      {/* Far hills */}
      <path d="M0 160 Q90 120 180 150 T360 140 T520 132 T640 150 V170 H0Z" fill={h.deep} opacity="0.7" />
      <path d="M0 170 Q120 150 240 166 T480 160 T640 168 V176 H0Z" fill={h.deep} />
      {/* Water */}
      <rect y="176" width="640" height="104" fill={`url(#${id}-beam)`} opacity="0.5" />
      <path d="M470 180 v90" stroke={h.light} strokeOpacity="0.25" strokeWidth="14" strokeDasharray="2 9" />
      {/* Ripples */}
      {[1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx="300" cy="222" rx={i * 46} ry={i * 9} fill="none" stroke={h.light} strokeOpacity={0.55 - i * 0.09} />
      ))}
      <circle cx="300" cy="222" r="3" fill={h.light} />
      <circle cx="300" cy="196" r="2.2" fill={h.light} opacity="0.8" />
      {/* Stars */}
      {[
        [80, 40],
        [150, 70],
        [230, 30],
        [330, 56],
        [390, 22],
        [560, 40],
        [600, 96],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 1 : 1.4} fill="#f3efe7" opacity="0.6" />
      ))}
    </g>
  );
}

/**
 * Fills its (positioned) parent with the program's picture: the admin's cover
 * photo when set, otherwise the pillar's drawn scene.
 */
export function CoverFill({ pillar, coverImage, className }: { pillar: Pillar; coverImage?: string | null; className?: string }) {
  return coverImage ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host; next/image would need every host allow-listed
    <img src={coverImage} alt="" loading="lazy" decoding="async" className={cn("absolute inset-0 h-full w-full object-cover", className)} />
  ) : (
    <ProgramArt pillar={pillar} className={cn("absolute inset-0", className)} />
  );
}
