import type { Metadata } from "next";
import { BuildCTA } from "@/components/sections/BuildCTA";
import { BuiltForSection } from "@/components/sections/BuiltForSection";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { offerings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Capabilities",
  description:
    "AI development, AI agents, business automation, data systems, custom software and interactive digital experiences — Ojasphera's capabilities, organised by what they do.",
  alternates: { canonical: "/capabilities" },
};

export default function CapabilitiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Capabilities"
        title="Intelligence. Systems. Automation. Experience."
        lede="Grouped by what the technology accomplishes — because a client needs an outcome, not a logo wall."
      />
      <CapabilitiesSection index="01" standalone />
      <section className="border-t border-line py-28 md:py-40">
        <div className="shell">
          <Reveal className="flex items-center gap-3 border-t border-line pt-4 md:w-1/4">
            <span className="mono text-xs text-ojas">02</span>
            <span className="eyebrow">What that turns into</span>
          </Reveal>
          <ul className="mt-14 grid border-l border-t border-line md:grid-cols-2 xl:grid-cols-4">
            {offerings.map((o, i) => (
              <Reveal as="li" key={o.key} delay={(i % 4) * 70} className="border-b border-r border-line p-6 md:p-8">
                <span className="mono text-[11px] text-ink-4">0{i + 1}</span>
                <h2 className="mt-8 text-xl font-medium tracking-tight">{o.title}</h2>
                <p className="mt-3 text-sm text-ink-2">{o.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <BuiltForSection index="03" />
      <BuildCTA index="04" />
    </>
  );
}
