import { projects } from "@/lib/projects";
import { NextSystemCard, ProjectCard } from "../projects/ProjectCard";
import { Reveal } from "../ui/Reveal";
import { SectionHead } from "../ui/Section";

export function ProjectsSection({ index = "06" }: { index?: string }) {
  return (
    <section id="projects" aria-labelledby="projects-title" className="relative border-t border-line py-28 md:py-40">
      <div className="shell">
        <SectionHead
          index={index}
          label="What we've built"
          title={<span id="projects-title">What We've Built</span>}
          lede="Different problems. Different industries. One principle: build the system around the reality."
        />
        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={i * 100}>
              <ProjectCard project={p} large />
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-4">
          <NextSystemCard />
        </Reveal>
        <p className="mt-8 max-w-2xl text-sm text-ink-3">
          These are two examples, not the boundaries of what we build. Each one shows a pattern — agents in a workspace, a
          physical project as an environment — that applies far beyond its original industry.
        </p>
      </div>
    </section>
  );
}
