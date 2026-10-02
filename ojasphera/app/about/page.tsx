import type { Metadata } from "next";
import Link from "next/link";
import { BuildCTA } from "@/components/sections/BuildCTA";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ojasphera Labs exists to build technology around real-world complexity — at the intersection of AI, software, data, automation and experience.",
  alternates: { canonical: "/about" },
};

const isNot = ["simply an AI company.", "simply a software agency.", "simply a design studio."];
const parts = [
  ["AI", "Models and agents that read, reason and act."],
  ["Software", "Engineering that holds up in production."],
  ["Data", "Information structured so it can be used."],
  ["Automation", "Work that runs itself, with people in control."],
  ["Experience", "Interfaces that make complex things clear."],
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Ojasphera Labs"
        title="We exist to build technology around real-world complexity."
        lede={`${site.legalName} is a technology laboratory. Clients bring a business, a physical project, an operational problem or an idea. We analyse it, then build the digital infrastructure, intelligence and interface it needs to become more useful, visible, automated and intelligent.`}
      />

      <section className="border-t border-line py-28 md:py-36">
        <div className="shell grid gap-12 md:grid-cols-12">
          <Reveal className="md:col-span-3">
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <span className="mono text-xs text-ojas">01</span>
              <span className="eyebrow">What we are not</span>
            </div>
          </Reveal>
          <div className="md:col-span-9">
            {isNot.map((t, i) => (
              <Reveal key={t} delay={i * 90} as="p" className="headline border-b border-line py-6 text-[clamp(1.75rem,4vw,3.5rem)] text-ink-3">
                It is not <span className="text-ink">{t}</span>
              </Reveal>
            ))}
            <Reveal as="p" delay={300} className="lede mt-10 max-w-2xl">
              Real problems don't respect those boundaries. A useful system usually needs intelligence, engineering, data,
              automation and a well-designed interface at the same time — so that's where we work.
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-28 md:py-36">
        <div className="shell grid gap-12 md:grid-cols-12">
          <Reveal className="md:col-span-3">
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <span className="mono text-xs text-ojas">02</span>
              <span className="eyebrow">The intersection</span>
            </div>
          </Reveal>
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 md:col-span-9 lg:grid-cols-5">
            {parts.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 60} className="bg-base p-6">
                <p className="text-xl font-medium tracking-tight">{t}</p>
                <p className="mt-3 text-sm text-ink-3">{d}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line py-28 md:py-36">
        <div className="shell grid gap-16 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow text-ojas">Mission</p>
            <p className="headline mt-6 text-[clamp(2rem,4vw,3.5rem)]">Build intelligent systems that make ambitious ideas possible.</p>
          </Reveal>
          <Reveal delay={120}>
            <p className="eyebrow text-signal">Vision</p>
            <p className="headline mt-6 text-[clamp(2rem,4vw,3.5rem)]">
              A world where technology adapts to the problem instead of forcing the problem to adapt to technology.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line py-28 md:py-36">
        <div className="shell grid gap-12 md:grid-cols-12">
          <Reveal className="md:col-span-3">
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <span className="mono text-xs text-ojas">03</span>
              <span className="eyebrow">How we talk about our work</span>
            </div>
          </Reveal>
          <div className="md:col-span-9">
            <Reveal as="p" className="lede max-w-2xl">
              We'd rather show a working system than describe one. That's why this site is built the way it is, and why our
              projects come with environments you can use instead of claims you have to trust.
            </Reveal>
            <Reveal delay={100} className="mt-10 flex flex-wrap gap-3">
              <Link href="/projects" className="btn btn-ghost">
                See what we've built <span className="arrow">→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <BuildCTA index="04" />
    </>
  );
}
