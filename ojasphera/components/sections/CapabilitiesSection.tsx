"use client";

import { useState } from "react";
import { techGroups } from "@/lib/content";
import { SectionHead } from "../ui/Section";
import { Reveal } from "../ui/Reveal";

/** The technology layer: four capability planes stacked into one system. */
export function CapabilitiesSection({ index = "07", standalone = false }: { index?: string; standalone?: boolean }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section id="capabilities" aria-labelledby="cap-title" className="relative overflow-hidden border-t border-line py-28 md:py-40">
      <div className="shell">
        <SectionHead
          index={index}
          label="Capabilities"
          title={
            <span id="cap-title">
              {standalone ? "The layers every system is built from." : "Four layers. One system."}
            </span>
          }
          lede="We don't start from a list of tools. We start from what the system has to do — then choose technology by capability, not by brand."
        />

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-12">
          <ul className="lg:col-span-5" role="list">
            {techGroups.map((g, i) => {
              const on = active === i;
              return (
                <li key={g.key} className="border-t border-line last:border-b">
                  <button
                    type="button"
                    className="w-full py-6 text-left"
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    aria-describedby={`cap-${g.key}`}
                  >
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium tracking-tight transition-colors" style={{ color: on ? g.color : undefined }}>
                        {g.name}
                      </span>
                      <span className="mono text-xs text-ink-3">{g.does}</span>
                    </span>
                    <span id={`cap-${g.key}`} className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                      {g.items.map((it) => (
                        <span key={it}>{it}</span>
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <Reveal className="lg:col-span-7">
            <div className="relative mx-auto aspect-square w-full max-w-[560px] [perspective:1400px]" aria-hidden="true">
              <div className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]">
                {techGroups.map((g, i) => {
                  const order = techGroups.length - 1 - i; // experience on top
                  const lift = active === null ? 0 : active === i ? 40 : active < i ? -20 : 20;
                  return (
                    <div
                      key={g.key}
                      className="absolute h-[58%] w-[58%] border transition-all duration-700 ease-[var(--ease-system)]"
                      style={{
                        transform: `rotateX(58deg) rotateZ(-42deg) translateZ(${(order - 1.5) * 70 + lift}px)`,
                        borderColor: active === null || active === i ? g.color : "var(--color-line-strong)",
                        background: `linear-gradient(135deg, ${g.color}${active === i ? "22" : "0c"}, transparent 70%)`,
                        opacity: active === null || active === i ? 1 : 0.35,
                      }}
                    >
                      <div className="grid h-full w-full grid-cols-5 grid-rows-5 opacity-40">
                        {Array.from({ length: 25 }, (_, k) => (
                          <span key={k} className="border-[0.5px] border-white/5" />
                        ))}
                      </div>
                      <span className="mono absolute left-3 top-3 text-[11px] tracking-[0.2em]" style={{ color: g.color }}>
                        {g.name.toUpperCase()}
                      </span>
                      {g.items.slice(0, 4).map((it, k) => (
                        <span
                          key={it}
                          className="absolute h-2 w-2 rounded-full"
                          style={{ background: g.color, left: `${22 + ((k * 37) % 60)}%`, top: `${30 + ((k * 23) % 50)}%`, opacity: active === i ? 1 : 0.5 }}
                        />
                      ))}
                    </div>
                  );
                })}
                {/* The vertical spine that connects the layers */}
                <div className="absolute h-[64%] w-px bg-gradient-to-b from-transparent via-ojas/60 to-transparent" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
