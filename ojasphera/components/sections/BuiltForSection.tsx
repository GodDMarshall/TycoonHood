import { builtFor } from "@/lib/content";
import { Reveal } from "../ui/Reveal";
import { SectionHead } from "../ui/Section";

export function BuiltForSection({ index }: { index?: string }) {
  return (
    <section id="built-for" aria-labelledby="bf-title" className="relative border-t border-line py-28 md:py-40">
      <div className="shell">
        <SectionHead index={index} label="Built for" title={<span id="bf-title">Built for whoever has the problem.</span>} />
        <ul className="mt-16 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3" role="list">
          {builtFor.map((b, i) => (
            <Reveal as="li" key={b.title} delay={(i % 3) * 80} className="group relative border-b border-r border-line p-6 md:p-8">
              <span className="mono text-[11px] text-ink-4">0{i + 1}</span>
              <h3 className="mt-10 text-2xl font-medium tracking-tight">{b.title}</h3>
              <p className="mt-3 text-ink-2">{b.body}</p>
              <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-ojas transition-transform duration-700 ease-[var(--ease-system)] group-hover:scale-x-100" />
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-12">
          <p className="max-w-3xl text-[clamp(1.5rem,2.8vw,2.5rem)] font-medium leading-tight tracking-tight">
            Not on the list? <span className="text-ink-3">If the problem is complex enough, we can probably build around it.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
