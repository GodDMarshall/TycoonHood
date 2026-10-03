import Link from "next/link";
import { EclipseHorizon } from "../fx/EclipseHorizon";
import { Reveal } from "../ui/Reveal";

export function BuildCTA({ index = "10" }: { index?: string }) {
  return (
    <section id="build" aria-labelledby="build-title" className="relative isolate overflow-hidden border-t border-line bg-black pb-[38vw] pt-32 md:pb-[30vw] md:pt-44">
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-80" aria-hidden="true" />
      <EclipseHorizon />
      <div className="shell">
        <Reveal className="flex items-center gap-3">
          <span className="mono text-xs text-ojas">{index}</span>
          <span className="eyebrow">Build with us</span>
        </Reveal>
        <Reveal as="h2" delay={80} className="display mt-10 max-w-5xl text-[clamp(2.75rem,7.5vw,7rem)]">
          <span id="build-title">Have a Problem Worth Building Around?</span>
        </Reveal>
        <Reveal delay={160} className="mt-10 grid gap-10 md:grid-cols-12">
          <p className="lede md:col-span-5">Tell us what you're trying to build, automate, understand or transform.</p>
          <div className="flex flex-wrap items-start gap-3 md:col-span-7 md:justify-end">
            <Link href="/build" className="btn btn-primary">
              Start a Project <span className="arrow">→</span>
            </Link>
            <Link href="/build?mode=talk" className="btn btn-ghost">
              Talk to Ojasphera
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
