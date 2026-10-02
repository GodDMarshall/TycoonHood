"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { telemetry } from "../three/env";
import { Reveal } from "../ui/Reveal";

/**
 * The close: everything the visitor just touched was a live system, and this
 * section shows it with real numbers measured in their own browser this visit.
 */
export function ProofSection() {
  const [s, setS] = useState({ frames: 0, pulses: 0, interactions: 0, seconds: 0 });
  const t0 = useRef(0);

  useEffect(() => {
    t0.current = performance.now();
    let local = 0;
    const onAny = () => local++;
    window.addEventListener("pointermove", onAny, { passive: true });
    window.addEventListener("scroll", onAny, { passive: true });
    window.addEventListener("click", onAny);
    const id = setInterval(() => {
      setS({
        frames: telemetry.frames,
        pulses: telemetry.pulses,
        interactions: telemetry.interactions + local,
        seconds: Math.floor(performance.now() / 1000),
      });
    }, 250);
    return () => {
      clearInterval(id);
      window.removeEventListener("pointermove", onAny);
      window.removeEventListener("scroll", onAny);
      window.removeEventListener("click", onAny);
    };
  }, []);

  const mm = String(Math.floor(s.seconds / 60)).padStart(2, "0");
  const ss = String(s.seconds % 60).padStart(2, "0");
  const fmt = (n: number) => n.toLocaleString("en-US");
  const stats = [
    { k: "Frames rendered for you", v: fmt(s.frames), note: "real-time 3D, in your browser" },
    { k: "Signals routed", v: fmt(s.pulses), note: "through the system you explored" },
    { k: "Your interactions", v: fmt(s.interactions), note: "each one answered instantly" },
    { k: "Time inside", v: `${mm}:${ss}`, note: "and counting" },
  ];

  return (
    <section aria-labelledby="proof-title" className="relative isolate overflow-hidden border-t border-line bg-black py-28 md:py-40">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{ background: "radial-gradient(60% 50% at 80% 0%, rgba(242,180,90,0.10), transparent 70%), radial-gradient(50% 60% at 0% 100%, rgba(124,199,232,0.08), transparent 70%)" }}
      />
      <div className="shell">
        <Reveal className="flex items-center gap-3">
          <span className="pulse-dot text-ojas" aria-hidden="true" />
          <span className="eyebrow">Live · measured in your browser, this visit</span>
        </Reveal>
        <Reveal as="h2" delay={80} className="display mt-10 max-w-6xl text-[clamp(2.75rem,7vw,7.25rem)]">
          <span id="proof-title">
            You've been inside one of our systems for <span className="mono text-ojas">{mm}:{ss}</span>.
          </span>
        </Reveal>
        <Reveal as="p" delay={160} className="lede mt-10 max-w-2xl">
          Nothing on this page is a template. Every frame, every signal and every reaction was engineered — and it ran
          on your device, in real time. That is the standard we build to. Your customers would feel it the way you just did.
        </Reveal>

        <dl className="mt-20 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((x, i) => (
            <Reveal key={x.k} delay={i * 80} className="border-b border-r border-line p-6 md:p-8">
              <dt className="eyebrow">{x.k}</dt>
              <dd className="mono mt-6 text-[clamp(2.25rem,4vw,3.5rem)] leading-none tracking-tight text-ink tabular-nums">{x.v}</dd>
              <p className="mt-3 text-xs text-ink-3">{x.note}</p>
            </Reveal>
          ))}
        </dl>

        <div className="mt-20 grid gap-10 md:grid-cols-12 md:items-end">
          <Reveal className="md:col-span-8">
            <p className="text-[clamp(1.75rem,3.6vw,3.25rem)] font-medium leading-[1.05] tracking-tight">
              Most businesses have a website.
              <br />
              <span className="text-ink-3">The ones people remember have a system.</span>
            </p>
          </Reveal>
          <Reveal delay={120} className="flex flex-wrap gap-3 md:col-span-4 md:justify-end">
            <Link href="/build" className="btn btn-primary" data-magnetic>
              Build mine <span className="arrow">→</span>
            </Link>
            <Link href="/projects" className="btn btn-ghost">
              See what we've built
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
