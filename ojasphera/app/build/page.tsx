import type { Metadata } from "next";
import { Suspense } from "react";
import { IntakeConsole } from "@/components/intake/IntakeConsole";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Build With Us",
  description:
    "Start a project with Ojasphera Labs. Tell us what you're trying to build, automate, understand or transform — custom software, AI agents, automation or interactive digital experiences.",
  alternates: { canonical: "/build" },
};

export default function BuildPage() {
  return (
    <section className="relative isolate pb-28 pt-[calc(var(--nav-h)+4rem)] md:pb-40 md:pt-[calc(var(--nav-h)+6rem)]">
      <div className="grid-lines pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60svh] opacity-70" aria-hidden="true" />
      <div className="shell">
        <Reveal>
          <p className="eyebrow">Build with us · New project</p>
        </Reveal>
        <Reveal as="h1" delay={80} className="display mt-8 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)]">
          Have a Problem Worth Building Around?
        </Reveal>
        <Reveal as="p" delay={160} className="lede mt-8 max-w-2xl">
          Tell us what you're trying to build, automate, understand or transform. Rough is fine — the first step of our
          method is understanding, and that's our job.
        </Reveal>
        <Reveal delay={220} className="mt-16">
          <Suspense fallback={<div className="h-[40rem] border border-line" />}>
            <IntakeConsole />
          </Suspense>
        </Reveal>
      </div>
    </section>
  );
}
