import Link from "next/link";
import type { Project } from "@/lib/projects";
import { Scene3D } from "../three/Scene3D";
import { ProjectVisual } from "./ProjectVisual";

export function ProjectCard({ project, large = false, heading: Heading = "h3" }: { project: Project; large?: boolean; heading?: "h2" | "h3" }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative flex h-full flex-col border border-line bg-raise/30 transition-colors duration-500 hover:border-line-strong hover:bg-raise/60"
    >
      <div className={`relative overflow-hidden border-b border-line ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        <div
          className="absolute inset-0 opacity-60 transition-opacity duration-700 group-hover:opacity-100"
          style={{ background: `radial-gradient(60% 60% at 50% 50%, ${project.accent}14, transparent 70%)` }}
        />
        <div className="absolute inset-0 transition-transform duration-[1200ms] ease-[var(--ease-system)] group-hover:scale-[1.03]">
          {project.scene ? (
            <Scene3D name={project.scene} mode="card" desktopOnly fallback={<ProjectVisual project={project} />} />
          ) : (
            <ProjectVisual project={project} />
          )}
        </div>
        <span className="mono absolute left-4 top-4 text-[11px] text-ink-3">{project.index}</span>
        <span className="mono absolute right-4 top-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-ink-3">
          <span className="pulse-dot" style={{ color: project.accent }} aria-hidden="true" />
          {project.scene ? "Live 3D" : "Interactive demo"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <p className="eyebrow" style={{ color: project.accent }}>
          {project.category}
        </p>
        <Heading className="mt-4 text-[clamp(1.75rem,3vw,2.75rem)] font-medium leading-none tracking-tight">{project.name}</Heading>
        <p className="mt-4 max-w-lg text-ink-2">{project.summary}</p>
        <ul className="mt-6 flex flex-wrap gap-1.5">
          {project.signals.map((s) => (
            <li key={s} className="mono border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-ink-3">
              {s}
            </li>
          ))}
        </ul>
        <span className="link-arrow mt-auto pt-8">
          Explore {project.name.replace(" Estates", "")} <span className="arrow">→</span>
        </span>
      </div>
    </Link>
  );
}

/** The open slot in the library — the next system. */
export function NextSystemCard() {
  return (
    <Link
      href="/build"
      className="group relative flex h-full min-h-[18rem] flex-col justify-between border border-dashed border-line-strong p-6 transition-colors hover:border-ojas/60 md:p-8"
    >
      <span className="mono text-[11px] text-ink-4">0X</span>
      <div>
        <p className="eyebrow">Next system</p>
        <p className="mt-4 text-[clamp(1.5rem,2.4vw,2.25rem)] font-medium leading-tight tracking-tight text-ink-2 transition-colors group-hover:text-ink">
          The library grows one real problem at a time. Yours could be next.
        </p>
      </div>
      <span className="link-arrow">
        Start a project <span className="arrow">→</span>
      </span>
    </Link>
  );
}
