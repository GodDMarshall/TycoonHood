import { Reveal } from "../ui/Reveal";
import { SectionHead } from "../ui/Section";

const traditional = ["Problem", "Existing Software", "Adapt Business"];
const ojasphera = ["Problem", "Understand", "Architect", "Build", "Intelligence", "Experience"];

function Flow({ steps, tone }: { steps: string[]; tone: "muted" | "hot" }) {
  const hot = tone === "hot";
  return (
    <ol className="flex flex-col gap-0 md:flex-row md:items-stretch">
      {steps.map((s, i) => (
        <li key={s + i} className="flex flex-col md:flex-1 md:flex-row md:items-center">
          <div
            className={`flex h-14 items-center justify-center border px-3 text-center text-sm md:h-16 md:w-full ${
              hot ? (i === steps.length - 1 ? "border-ojas text-ink" : "border-line-strong text-ink") : i === steps.length - 1 ? "border-alert/60 text-alert" : "border-line text-ink-3"
            }`}
          >
            {s}
          </div>
          {i < steps.length - 1 ? (
            <svg className="mx-auto h-6 w-4 shrink-0 md:mx-0 md:h-4 md:w-8" viewBox="0 0 32 16" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="8" x2="32" y2="8" stroke={hot ? "var(--color-ojas)" : "var(--color-ink-4)"} className={hot ? "flow-dash" : undefined} transform="" />
            </svg>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function WhySection({ index = "08" }: { index?: string }) {
  return (
    <section id="why" aria-labelledby="why-title" className="relative border-t border-line py-28 md:py-40">
      <div className="shell">
        <SectionHead
          index={index}
          label="Why Ojasphera"
          title={
            <span id="why-title">
              Most companies buy software.
              <br />
              <span className="text-ink-3">We build the system around the problem.</span>
            </span>
          }
        />

        <div className="mt-20 grid gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-4">
            <p className="eyebrow">Off-the-shelf software</p>
            <p className="mt-4 text-xl leading-snug text-ink-2">works around existing assumptions — someone else's idea of how your business should run.</p>
          </Reveal>
          <Reveal className="md:col-span-4" delay={80}>
            <p className="eyebrow text-ojas">Ojasphera</p>
            <p className="mt-4 text-xl leading-snug text-ink">starts with the actual problem and designs the technology around it.</p>
          </Reveal>
          <Reveal className="md:col-span-4" delay={160}>
            <p className="eyebrow">The difference</p>
            <p className="mt-4 text-xl leading-snug text-ink-2">shows up later: in what you don't have to work around, export, re-enter or explain.</p>
          </Reveal>
        </div>

        <div className="mt-20 space-y-12">
          <Reveal>
            <p className="eyebrow mb-4">Traditional</p>
            <div className="md:max-w-[50%]">
              <Flow steps={traditional} tone="muted" />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className="eyebrow mb-4 text-ojas">Ojasphera</p>
            <Flow steps={ojasphera} tone="hot" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
