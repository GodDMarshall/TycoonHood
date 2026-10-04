"use client";

import { useEffect, useRef, useState } from "react";
import { method } from "@/lib/content";
import { SectionHead } from "../ui/Section";
import { rng } from "../hero/system-model";

/**
 * The Ojasphera Method, scroll-driven: a scattered "problem" becomes a working,
 * connected system one step at a time. Each step changes the drawing in the way
 * that step changes a real project.
 */

const LAYERS = ["EXPERIENCE", "AUTOMATION", "INTELLIGENCE", "SYSTEMS", "DATA"];
const LAYER_COLOR = ["#eceef1", "#b9c7ff", "#f2b45a", "#7cc7e8", "#6fd3a8"];
const PER = [4, 5, 4, 6, 7];

type Pt = { g: number; cx: number; cy: number; ox: number; oy: number; extra?: boolean };

const points: Pt[] = (() => {
  const r = rng(42);
  const out: Pt[] = [];
  PER.forEach((count, g) => {
    for (let i = 0; i < count + 1; i++) {
      const extra = i === count; // nodes added later, during "Evolve"
      out.push({
        g,
        cx: 40 + r() * 320,
        cy: 40 + r() * 320,
        ox: 70 + ((i + 0.5) * 260) / (count + 1),
        oy: 68 + g * 66,
        extra,
      });
    }
  });
  return out;
})();

/** Connections between adjacent layers (each node links to one or two below). */
const links: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let g = 0; g < LAYERS.length - 1; g++) {
    const a = points.map((p, i) => [p, i] as const).filter(([p]) => p.g === g && !p.extra);
    const b = points.map((p, i) => [p, i] as const).filter(([p]) => p.g === g + 1 && !p.extra);
    a.forEach(([pa, ia]) => {
      const sorted = [...b].sort((x, y) => Math.abs(x[0].ox - pa.ox) - Math.abs(y[0].ox - pa.ox));
      out.push([ia, sorted[0][1]]);
      if (sorted[1]) out.push([ia, sorted[1][1]]);
    });
  }
  return out;
})();

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const CAPTIONS = [
  "A problem, as it arrives: scattered pieces, unclear relationships.",
  "Every piece identified and grouped — data, workflows, people, systems.",
  "The architecture drawn before anything is built.",
  "Components built and moved into place.",
  "Data, systems and intelligence wired together.",
  "Live. Information flows through a working environment.",
  "The system keeps growing as the business does.",
];

export function MethodSection({ index = "04" }: { index?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const raw = clamp((vh * 0.62 - rect.top) / rect.height) * 7.25;
      const next = Math.min(7, raw);
      // Reduced motion: snap to whole steps rather than continuously morphing.
      setP(reduced ? Math.floor(next) + (next >= 7 ? 0 : 0.999) : next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const step = Math.min(6, Math.floor(p));
  const scan = clamp(p) * (1 - clamp(p - 1.2));
  const grouped = clamp(p - 1);
  const frames = clamp(p - 2);
  const built = ease(clamp(p - 3));
  const wired = clamp(p - 4);
  const live = clamp(p - 5);
  const evolve = ease(clamp(p - 6));

  return (
    <section id="method" aria-labelledby="method-title" className="relative border-t border-line pt-28 md:pt-40">
      <div className="shell">
        <SectionHead
          index={index}
          label="The Ojasphera method"
          title={<span id="method-title">From Problem to Intelligence.</span>}
          lede="Seven steps, in this order, every time. Scroll to watch a problem become a system."
        />
      </div>

      <div ref={trackRef} className="shell relative mt-16 grid gap-0 pb-28 lg:grid-cols-12 lg:gap-12 md:pb-40">
        {/* Sticky drawing */}
        <div className="sticky top-[var(--nav-h)] z-10 -mx-[var(--gutter)] h-[46svh] border-b border-line bg-base/90 px-[var(--gutter)] py-3 backdrop-blur-md lg:order-2 lg:col-span-7 lg:mx-0 lg:h-[calc(100svh-var(--nav-h)-4rem)] lg:border-0 lg:bg-transparent lg:px-0 lg:py-8 lg:backdrop-blur-none">
          <div className="brackets relative h-full w-full border border-line bg-raise/40">
            <svg viewBox="0 0 400 400" className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={CAPTIONS[step]}>
              {/* Architecture frames */}
              {LAYERS.map((l, g) => (
                <g key={l} opacity={frames}>
                  <rect
                    x="52"
                    y={50 + g * 66}
                    width="296"
                    height="36"
                    fill={live > 0 ? LAYER_COLOR[g] : "none"}
                    fillOpacity={0.04 * live}
                    stroke={LAYER_COLOR[g]}
                    strokeOpacity={0.25 + 0.25 * live}
                    strokeDasharray={live > 0.5 ? undefined : "3 4"}
                  />
                  <text x="52" y={45 + g * 66} fontSize="7" letterSpacing="1.6" fill={LAYER_COLOR[g]} fillOpacity={0.7} className="mono">
                    {l}
                  </text>
                </g>
              ))}

              {/* Wiring */}
              {links.map(([a, b], i) => {
                const pa = points[a], pb = points[b];
                const ax = pa.cx + (pa.ox - pa.cx) * built, ay = pa.cy + (pa.oy - pa.cy) * built;
                const bx = pb.cx + (pb.ox - pb.cx) * built, by = pb.cy + (pb.oy - pb.cy) * built;
                const reveal = clamp(wired * links.length * 1.0 - i * 0.6);
                return (
                  <line
                    key={i}
                    x1={ax}
                    y1={ay}
                    x2={ax + (bx - ax) * reveal}
                    y2={ay + (by - ay) * reveal}
                    stroke={live > 0.3 ? "var(--color-signal)" : "var(--color-ink-3)"}
                    strokeOpacity={0.25 + live * 0.35}
                    className={live > 0.3 ? "flow-dash" : undefined}
                  />
                );
              })}

              {/* Scan ring during "Understand" */}
              <circle cx="200" cy="200" r={40 + scan * 150} fill="none" stroke="var(--color-ojas)" strokeOpacity={0.35 * scan * (1 - clamp(p))+ 0.25 * scan} />

              {/* Nodes */}
              {points.map((pt, i) => {
                if (pt.extra && evolve <= 0) return null;
                const x = pt.cx + (pt.ox - pt.cx) * (pt.extra ? 1 : built);
                const y = pt.cy + (pt.oy - pt.cy) * (pt.extra ? 1 : built);
                const col = grouped > 0 ? LAYER_COLOR[pt.g] : "#69707c";
                const op = pt.extra ? evolve : 0.5 + grouped * 0.5;
                return (
                  <g key={i} opacity={op}>
                    {pt.extra ? (
                      <circle cx={x} cy={y} r={6 + (1 - evolve) * 10} fill="none" stroke="var(--color-ojas)" strokeOpacity={1 - evolve * 0.6} />
                    ) : null}
                    <circle
                      cx={x}
                      cy={y}
                      r={3 + built * 1.2}
                      fill="var(--color-base)"
                      stroke={col}
                      strokeOpacity={0.4 + grouped * 0.6}
                      strokeWidth={1.2}
                    />
                    <circle cx={x} cy={y} r={1.4 + built * 0.4} fill={col} />
                  </g>
                );
              })}

              {/* Live indicator */}
              <g opacity={live}>
                <circle cx="356" cy="22" r="3" fill="var(--color-growth)" />
                <text x="346" y="25" textAnchor="end" fontSize="7" letterSpacing="1.6" fill="var(--color-growth)" className="mono">
                  {evolve > 0.2 ? "LIVE · EVOLVING" : "LIVE"}
                </text>
              </g>
              <text x="14" y="25" fontSize="7" letterSpacing="1.6" fill="var(--color-ink-3)" className="mono">
                {method[step].n} — {method[step].title.toUpperCase()}
              </text>
            </svg>
            <p className="absolute inset-x-4 bottom-3 hidden text-xs text-ink-3 sm:block">{CAPTIONS[step]}</p>
          </div>
        </div>

        {/* Steps */}
        <ol className="relative lg:order-1 lg:col-span-5">
          {method.map((m, i) => (
            <li key={m.n} className="relative flex min-h-[52svh] items-center border-l border-line pl-6 md:pl-10 lg:min-h-[70svh]">
              <div className={`transition-colors duration-500 ${i === step ? "" : "[&_h3]:text-ink-3 [&_p]:text-ink-4 [&_span]:text-ink-4"}`}>
                <span className={`mono text-sm ${i === step ? "text-ojas" : "text-ink-3"}`}>{m.n}</span>
                <h3 className="mt-3 text-[clamp(2rem,4vw,3.5rem)] font-medium tracking-tight">{m.title}</h3>
                <p className="mt-4 max-w-sm text-lg text-ink-2">{m.body}</p>
              </div>
              <span
                aria-hidden="true"
                className={`absolute -left-px top-1/2 h-24 w-px -translate-y-1/2 bg-ojas transition-opacity duration-500 ${i === step ? "opacity-100" : "opacity-0"}`}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
