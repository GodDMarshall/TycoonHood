import type { Metadata } from "next";
import { NextSystemCard, ProjectCard } from "@/components/projects/ProjectCard";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Systems Ojasphera Labs has built — from an AI workspace of real-time agents to an immersive digital environment for a physical estate.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <>
      <PageHero
        eyebrow="Projects · Library"
        title="A living library of systems."
        lede="Different problems. Different industries. One principle: build the system around the reality. Each entry documents the problem, the idea, the architecture — and lets you use the result."
      />
      <section className="pb-28 md:pb-40">
        <div className="shell grid gap-4 md:grid-cols-2">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={i * 100}>
              <ProjectCard project={p} large heading="h2" />
            </Reveal>
          ))}
          <Reveal className="md:col-span-2">
            <NextSystemCard />
          </Reveal>
        </div>
      </section>
    </>
  );
}
