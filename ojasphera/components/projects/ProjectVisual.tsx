import type { Project } from "@/lib/projects";

/** Compact, always-moving signature visual for a project card. */
export function ProjectVisual({ project }: { project: Project }) {
  const c = project.accent;
  if (project.slug === "marshal-tower") {
    // A tower of floors, each holding agents with live activity.
    return (
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        {Array.from({ length: 6 }, (_, f) => (
          <g key={f}>
            <rect x="110" y={40 + f * 38} width="180" height="30" fill="none" stroke="var(--color-line-strong)" />
            <text x="98" y={59 + f * 38} textAnchor="end" fontSize="8" fill="var(--color-ink-4)" className="mono">
              L{6 - f}
            </text>
            {Array.from({ length: 5 }, (_, a) => (
              <circle key={a} cx={130 + a * 35} cy={55 + f * 38} r="4" fill={c}>
                <animate attributeName="opacity" values="0.15;1;0.15" dur={`${2 + ((f * 5 + a) % 7) * 0.45}s`} begin={`${((f * 3 + a) % 5) * 0.4}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        ))}
        <line x1="300" y1="55" x2="300" y2="245" stroke={c} strokeOpacity="0.5" className="flow-dash" />
        <line x1="290" y1="55" x2="300" y2="55" stroke={c} strokeOpacity="0.5" />
        <line x1="290" y1="245" x2="300" y2="245" stroke={c} strokeOpacity="0.5" />
        <text x="310" y="152" fontSize="8" letterSpacing="1.5" fill={c} className="mono">LIVE STATE</text>
      </svg>
    );
  }
  if (project.slug === "emerald-haven") {
    // A topographic estate with zones, a path and points of interest.
    return (
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <ellipse key={i} cx={200 + i * 4} cy={150 - i * 2} rx={170 - i * 22} ry={110 - i * 14} fill="none" stroke={c} strokeOpacity={0.08 + i * 0.05} transform={`rotate(-8 200 150)`} />
        ))}
        <path d="M60 220 C 120 200, 140 140, 210 140 S 320 90, 350 70" fill="none" stroke="var(--color-ink-3)" strokeDasharray="4 4" />
        {[
          [130, 120],
          [240, 190],
          [290, 110],
          [180, 200],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="10" fill="none" stroke={c} strokeOpacity="0.5">
              <animate attributeName="r" values="4;14;4" dur="3s" begin={`${i * 0.7}s`} repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="3s" begin={`${i * 0.7}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={y} r="3" fill={c} />
          </g>
        ))}
        <rect x="270" y="170" width="44" height="28" fill="none" stroke="var(--color-signal)" strokeOpacity="0.7" />
        <text x="22" y="34" fontSize="8" letterSpacing="1.5" fill={c} className="mono">ESTATE MODEL · LAYERS 4</text>
      </svg>
    );
  }
  // Future projects: a generic system signature.
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1="200" y1="150" x2={200 + Math.cos(a) * 110} y2={150 + Math.sin(a) * 90} stroke={c} strokeOpacity="0.3" />;
      })}
      <circle cx="200" cy="150" r="20" fill="none" stroke={c} />
    </svg>
  );
}
