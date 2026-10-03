/**
 * A vast eclipse rising behind a section: the dark disc's limb catches the
 * light at the upper right and the spark breaks through. Pure CSS + SVG.
 */
export function EclipseHorizon({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[78%] overflow-hidden ${className}`} aria-hidden="true">
      <svg className="absolute left-1/2 top-[18%] w-[170%] max-w-none -translate-x-1/2 md:w-[120%]" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMin meet">
        <defs>
          <radialGradient id="eh-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.86" stopColor="#f2b45a" stopOpacity="0" />
            <stop offset="0.905" stopColor="#f2b45a" stopOpacity="0.16" />
            <stop offset="1" stopColor="#f2b45a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="eh-rim" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0.35" stopColor="#7cc7e8" stopOpacity="0" />
            <stop offset="0.7" stopColor="#eceef1" stopOpacity="0.55" />
            <stop offset="0.86" stopColor="#f2b45a" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="eh-spark" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff4dc" />
            <stop offset="0.25" stopColor="#f2b45a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#f2b45a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="500" r="470" fill="url(#eh-glow)" />
        <circle cx="500" cy="500" r="430" fill="#030404" />
        <circle cx="500" cy="500" r="430" fill="none" stroke="url(#eh-rim)" strokeWidth="2.2" />
        <g className="eh-spark">
          <circle cx="804" cy="196" r="70" fill="url(#eh-spark)" />
          <rect x="604" y="195" width="400" height="2" fill="#f6c27a" opacity="0.55" />
          <circle cx="804" cy="196" r="7" fill="#fff4dc" />
        </g>
      </svg>
    </div>
  );
}
