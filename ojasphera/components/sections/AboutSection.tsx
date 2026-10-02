import Link from "next/link";
import { Reveal } from "../ui/Reveal";
import { SectionHead } from "../ui/Section";

const parts = ["AI", "Software", "Data", "Automation", "Experience"];

export function AboutSection({ index = "09" }: { index?: string }) {
  return (
    <section id="about" aria-labelledby="about-title" className="relative border-t border-line py-28 md:py-40">
      <div className="shell">
        <SectionHead
          index={index}
          label="About"
          title={<span id="about-title">A laboratory for building technology around real-world complexity.</span>}
        />
        <div className="mt-16 grid gap-12 md:grid-cols-12">
          <Reveal className="md:col-span-5 md:col-start-4">
            <p className="lede">
              Ojasphera Labs is not simply an AI company, a software agency or a design studio. It operates where those
              disciplines meet — because real problems don't respect the boundaries between them.
            </p>
            <Link href="/about" className="link-arrow mt-8">
              More about Ojasphera <span className="arrow">→</span>
            </Link>
          </Reveal>
          <Reveal className="md:col-span-4" delay={120}>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xl font-medium tracking-tight" aria-label="Disciplines">
              {parts.map((p, i) => (
                <li key={p} className="flex items-center gap-3">
                  <span>{p}</span>
                  {i < parts.length - 1 ? <span className="text-ojas">+</span> : null}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
