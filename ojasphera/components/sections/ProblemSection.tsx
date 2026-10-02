"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "../ui/Reveal";

const N = 96;
const CX = 200, CY = 200;

/** The business: irregular, specific, real. */
const blob = Array.from({ length: N }, (_, i) => {
  const t = (i / N) * Math.PI * 2;
  const r = 118 * (1 + 0.16 * Math.sin(3 * t + 0.4) + 0.09 * Math.cos(5 * t + 1.1) + 0.05 * Math.sin(7 * t));
  return [CX + Math.cos(t) * r, CY + Math.sin(t) * r] as const;
});

/** Point on a square of half-size s along the same ray. */
function onSquare(t: number, s: number) {
  const c = Math.cos(t), sn = Math.sin(t);
  const k = s / Math.max(Math.abs(c), Math.abs(sn));
  return [CX + c * k, CY + sn * k] as const;
}
const square = Array.from({ length: N }, (_, i) => onSquare((i / N) * Math.PI * 2, 104));
/** The business forced into the box: everything outside is cut. */
const squashed = blob.map(([x, y], i) => {
  const [sx, sy] = square[i];
  const dB = Math.hypot(x - CX, y - CY), dS = Math.hypot(sx - CX, sy - CY);
  return dB > dS ? ([sx, sy] as const) : ([x, y] as const);
});
/** The system, built around the business. */
const wrapped = blob.map(([x, y]) => [CX + (x - CX) * 1.14, CY + (y - CY) * 1.14] as const);
const lost = blob.map(([x, y], i) => Math.hypot(x - CX, y - CY) > Math.hypot(square[i][0] - CX, square[i][1] - CY) + 4);

const path = (pts: readonly (readonly [number, number])[]) =>
  "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function ProblemSection() {
  const [mode, setMode] = useState<"force" | "around">("force");
  const [k, setK] = useState(0); // 0 = forced, 1 = built around
  const kRef = useRef(0); // latest k, so a new animation starts from wherever the last one is
  const raf = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);
  const autoplayed = useRef(false);

  useEffect(() => {
    const target = mode === "around" ? 1 : 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      kRef.current = target;
      setK(target);
      return;
    }
    const from = kRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400);
      kRef.current = from + (target - from) * ease(p);
      setK(kRef.current);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [mode]);

  // Play the argument once when the section comes into view.
  useEffect(() => {
    const el = sectionRef.current!;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !autoplayed.current) {
          autoplayed.current = true;
          setTimeout(() => setMode("around"), 1600);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const bizPts = blob.map(([x, y], i) => [squashed[i][0] + (x - squashed[i][0]) * k, squashed[i][1] + (y - squashed[i][1]) * k] as const);
  const framePts = square.map(([x, y], i) => [x + (wrapped[i][0] - x) * k, y + (wrapped[i][1] - y) * k] as const);

  return (
    <section ref={sectionRef} id="problem" aria-labelledby="problem-title" className="relative border-t border-line py-28 md:py-40">
      <div className="shell grid items-center gap-16 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Reveal>
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <span className="mono text-xs text-ojas">02</span>
              <span className="eyebrow">The problem</span>
            </div>
          </Reveal>
          <Reveal as="h2" delay={80} className="headline mt-10 text-[clamp(2.25rem,5vw,4.5rem)]">
            <span id="problem-title">Technology shouldn't force your business to change itself.</span>
          </Reveal>
          <Reveal delay={160} className="lede mt-8 max-w-xl space-y-5">
            <p>
              Most software arrives with assumptions already built in — about how you work, what your data looks like
              and which problems matter. The business bends to fit the box, and whatever doesn't fit gets cut.
            </p>
            <p className="text-ink">Ojasphera works the other way round. We start from the reality and build the system around it.</p>
          </Reveal>
          <Reveal delay={240} className="mt-10 inline-flex border border-line p-1" >
            <div role="radiogroup" aria-label="Approach" className="flex">
              {(
                [
                  ["force", "Force it to fit"],
                  ["around", "Build around it"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => {
                    autoplayed.current = true;
                    setMode(m);
                  }}
                  className={`h-10 px-4 text-[13px] transition-colors duration-300 ${
                    mode === m ? "bg-ink text-void" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={120} className="lg:col-span-6">
          <figure className="brackets relative mx-auto aspect-square w-full max-w-[520px] border border-line bg-raise/40">
            <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-labelledby="problem-fig">
              <title id="problem-fig">
                {mode === "force"
                  ? "A business shape forced into a rigid square; the parts that don't fit are cut away."
                  : "A system boundary that follows the business shape exactly, connected at every point."}
              </title>
              {/* Lost pieces when forced */}
              {blob.map(([x, y], i) =>
                lost[i] && i % 2 === 0 ? (
                  <line
                    key={i}
                    x1={squashed[i][0]}
                    y1={squashed[i][1]}
                    x2={x}
                    y2={y}
                    stroke="var(--color-alert)"
                    strokeOpacity={0.5 * (1 - k)}
                    strokeDasharray="2 3"
                  />
                ) : null,
              )}
              <path d={path(blob)} fill="none" stroke="var(--color-alert)" strokeOpacity={0.25 * (1 - k)} strokeDasharray="2 4" />
              {/* The business */}
              <path d={path(bizPts)} fill="rgba(111,211,168,0.08)" stroke="var(--color-growth)" strokeWidth="1.2" />
              {/* The software / system */}
              <path
                d={path(framePts)}
                fill="none"
                stroke={k > 0.5 ? "var(--color-ojas)" : "var(--color-ink-3)"}
                strokeWidth={1.2}
              />
              {/* Connections appear when the system fits */}
              {blob.map(([x, y], i) =>
                i % 8 === 0 ? (
                  <g key={`c${i}`} opacity={k}>
                    <line x1={x} y1={y} x2={framePts[i][0]} y2={framePts[i][1]} stroke="var(--color-ojas)" strokeOpacity="0.6" />
                    <circle cx={framePts[i][0]} cy={framePts[i][1]} r="3" fill="var(--color-void)" stroke="var(--color-ojas)" />
                  </g>
                ) : null,
              )}
              <text x="200" y="205" textAnchor="middle" className="mono" fontSize="10" letterSpacing="2" fill="var(--color-growth)">
                YOUR BUSINESS
              </text>
              <text x="20" y="30" className="mono" fontSize="9" letterSpacing="2" fill="var(--color-ink-3)">
                {k < 0.5 ? "OFF-THE-SHELF SOFTWARE" : "SYSTEM BUILT AROUND IT"}
              </text>
              <text x="20" y="384" className="mono" fontSize="9" letterSpacing="2" fill={k < 0.5 ? "var(--color-alert)" : "var(--color-ojas)"}>
                {k < 0.5 ? "WHAT DOESN'T FIT GETS CUT" : "NOTHING CUT · EVERY EDGE CONNECTED"}
              </text>
            </svg>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
