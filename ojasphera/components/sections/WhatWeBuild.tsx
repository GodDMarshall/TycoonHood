"use client";

import { useState } from "react";
import { offerings } from "@/lib/content";
import { SectionHead } from "../ui/Section";
import { Schematic } from "./Schematic";

export function WhatWeBuild({ index = "03" }: { index?: string }) {
  const [active, setActive] = useState(0);
  const current = offerings[active];

  return (
    <section id="systems" aria-labelledby="wwb-title" className="relative border-t border-line py-28 md:py-40">
      <div className="shell">
        <SectionHead
          index={index}
          label="What we actually do"
          title={<span id="wwb-title">We Don't Sell One Product.</span>}
          lede={
            <>
              <span className="text-ink">We build the system your idea needs.</span> Every project is different, so the
              output is different too — sometimes a platform, sometimes a team of AI agents, sometimes an environment you
              can walk through. Usually a combination.
            </>
          }
        />

        <div className="mt-20 grid gap-10 lg:grid-cols-12">
          <ul className="lg:col-span-7" role="list">
            {offerings.map((o, i) => {
              const on = i === active;
              return (
                <li key={o.key} className="border-t border-line last:border-b">
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-expanded={on}
                    className="group grid w-full grid-cols-[3rem_1fr] items-baseline gap-2 py-6 text-left md:grid-cols-[4rem_1fr]"
                  >
                    <span className={`mono text-xs transition-colors ${on ? "text-ojas" : "text-ink-4"}`}>0{i + 1}</span>
                    <span>
                      <span
                        className={`block text-[clamp(1.4rem,2.6vw,2.25rem)] font-medium tracking-tight transition-colors duration-300 ${
                          on ? "text-ink" : "text-ink-3 group-hover:text-ink-2"
                        }`}
                      >
                        {o.title}
                      </span>
                      <span
                        className="grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-system)]"
                        style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0 }}
                      >
                        <span className="overflow-hidden">
                          <span className="block max-w-xl pt-3 text-ink-2">{o.body}</span>
                          <span className="mt-6 block aspect-[16/11] w-full max-w-md border border-line lg:hidden">
                            {on ? <Schematic kind={o.key} /> : null}
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-[calc(var(--nav-h)+2rem)]">
              <div className="brackets relative aspect-[16/11] w-full border border-line bg-raise/40">
                <Schematic key={current.key} kind={current.key} />
                <span className="eyebrow absolute left-4 top-4">Schematic · {current.title}</span>
              </div>
              <p className="mt-5 text-sm text-ink-3">
                These are building blocks, not a menu. A project usually combines several of them around one problem.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
