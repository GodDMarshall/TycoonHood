"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EclipseLoader } from "../fx/EclipseLoader";
import { Words } from "../fx/Words";
import { Mark } from "../site/Logo";
import { hasWebGL } from "../three/env";
import { CORE, STAGES, STAGE_COLOR, type CoreId } from "./system-model";

// The canvas is the heaviest thing on the page: load it after first paint, client-only.
const CoreScene = dynamic(() => import("../three/CoreScene"), { ssr: false, loading: () => <SystemBooting /> });
// 2D fallback for devices without WebGL.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false, loading: () => <SystemBooting /> });

function SystemBooting() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <EclipseLoader label="Initialising system" />
    </div>
  );
}

export function Hero() {
  const [focus, setFocus] = useState<CoreId | null>(null);
  const [selected, setSelected] = useState<CoreId | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => setGl(hasWebGL()), []);

  const onFocus = useCallback((id: CoreId | null) => setFocus(id), []);
  const onStage = useCallback((s: number | null) => setStage(s), []);

  const select = (id: CoreId) => {
    setSelected(id);
    setPulseKey((k) => k + 1);
  };

  const node = CORE.find((c) => c.id === focus);

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-black xl:min-h-[100svh]">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(60% 50% at 70% 45%, rgba(124,199,232,0.07), transparent 70%), radial-gradient(40% 40% at 20% 80%, rgba(242,180,90,0.05), transparent 70%)",
        }}
      />

      <div className="shell relative z-10 flex flex-col pt-[calc(var(--nav-h)+3.5rem)] xl:min-h-[100svh] xl:justify-center xl:pb-24 xl:pt-[var(--nav-h)]">
        <div className="max-w-[34rem] xl:max-w-[31rem]">
          <p className="eyebrow flex items-center gap-3">
            <Mark size={15} className="text-ink" />
            Ojasphera Labs
          </p>
          <h1 id="hero-title" className="display mt-7 text-[clamp(2.6rem,5.4vw,5rem)]">
            <Words text="We Build Intelligence Around Real-World Problems." />
          </h1>
          <p className="lede mt-7 max-w-[32rem] xl:max-w-[30rem]">
            From businesses and physical projects to complex workflows and ambitious ideas, Ojasphera builds the
            intelligent digital systems that make them work, evolve and scale.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/projects" className="btn btn-primary" data-magnetic>
              Explore What We Build <span className="arrow">→</span>
            </Link>
            <Link href="/build" className="btn btn-ghost" data-magnetic>
              Build With Ojasphera
            </Link>
          </div>
          <p className="eyebrow mt-12 hidden xl:block">AI • Systems • Automation • Intelligence • Experiences</p>
        </div>
      </div>

      {/* The live system. Full-bleed behind the copy on wide screens; its own viewport on smaller ones. */}
      <div className="relative h-[68svh] min-h-[420px] xl:absolute xl:inset-0 xl:h-auto">
        {gl === null ? (
          <SystemBooting />
        ) : gl ? (
          <CoreScene selected={selected} pulseKey={pulseKey} onFocus={onFocus} onStage={onStage} />
        ) : (
          <HeroCanvas selected={selected} pulseKey={pulseKey} onFocus={onFocus} onStage={onStage} />
        )}
        <p className="sr-only">
          An interactive diagram of the Ojasphera Intelligence System. Business and project nodes feed data into AI and
          agents, which connect through systems and automation into experiences, which feed back into the business.
        </p>
      </div>

      {/* System HUD */}
      <div className="shell relative z-10 pb-10 xl:pointer-events-none xl:absolute xl:inset-x-0 xl:bottom-0 xl:pb-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-end">
          <div className="xl:pointer-events-auto xl:w-[min(46rem,58%)]">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 mono text-[11px] uppercase tracking-[0.14em]" aria-label="System flow">
              {STAGES.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className="transition-colors duration-500"
                    style={{ color: stage !== null && i <= stage ? STAGE_COLOR[i] : "var(--color-ink-4)" }}
                  >
                    {s}
                  </span>
                  {i < STAGES.length - 1 ? <span className="text-ink-4">→</span> : null}
                </li>
              ))}
            </ol>
            <div className="mt-4 min-h-[3.5rem] border-t border-line pt-4" aria-live="polite">
              {node ? (
                <p className="text-sm text-ink-2">
                  <span className="mono mr-3 text-xs" style={{ color: STAGE_COLOR[node.stage] }}>
                    {node.id} · {STAGES[node.stage]}
                  </span>
                  {node.role}
                </p>
              ) : (
                <p className="text-sm text-ink-3">
                  Drag to spin the system. Select any node to send a signal through everything it connects to.
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="System nodes">
              {CORE.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c.id)}
                  onFocus={() => setSelected(c.id)}
                  aria-pressed={selected === c.id}
                  className="mono border border-line px-2 py-1 text-[10px] tracking-[0.12em] text-ink-3 transition-colors hover:border-ink-3 hover:text-ink aria-pressed:border-ink-3 aria-pressed:text-ink"
                >
                  {c.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
