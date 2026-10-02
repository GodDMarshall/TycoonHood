import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchitectureDiagram } from "@/components/projects/ArchitectureDiagram";
import { ProjectDemo } from "@/components/projects/demos";
import { ProjectVisual } from "@/components/projects/ProjectVisual";
import { Scene3D } from "@/components/three/Scene3D";
import { Reveal } from "@/components/ui/Reveal";
import { getProject, projects } from "@/lib/projects";
import { site } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return {
    title: `${p.name} — ${p.category}`,
    description: p.summary,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { title: `${p.name} · ${site.name}`, description: p.summary, url: `${site.url}/projects/${p.slug}` },
  };
}

function Chapter({ n, label, title, children, accent }: { n: string; label: string; title: string; children: React.ReactNode; accent: string }) {
  return (
    <section className="border-t border-line py-24 md:py-32">
      <div className="shell grid gap-10 md:grid-cols-12">
        <Reveal className="md:col-span-3">
          <div className="flex items-center gap-3 border-t border-line pt-4 md:sticky md:top-[calc(var(--nav-h)+2rem)]">
            <span className="mono text-xs" style={{ color: accent }}>
              {n}
            </span>
            <span className="eyebrow">{label}</span>
          </div>
        </Reveal>
        <div className="md:col-span-9">
          <Reveal as="h2" className="headline text-[clamp(2rem,4.6vw,4rem)]">
            {title}
          </Reveal>
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();
  const idx = projects.findIndex((x) => x.slug === p.slug);
  const next = projects[(idx + 1) % projects.length];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: p.name,
    about: p.category,
    description: p.summary,
    creator: { "@type": "Organization", name: site.name, url: site.url },
    url: `${site.url}/projects/${p.slug}`,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Entry */}
      {p.scene ? (
        <header className="relative isolate h-[100svh] min-h-[640px] overflow-hidden bg-black">
          <div className="absolute inset-0">
            <Scene3D name={p.scene} fallback={<ProjectVisual project={p} />} />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 70%), linear-gradient(0deg, rgba(5,6,7,1) 0%, rgba(5,6,7,0) 30%)" }}
          />
          <div className="shell pointer-events-none relative flex h-full flex-col justify-end pb-16 md:pb-20">
            <Reveal className="pointer-events-auto">
              <Link href="/projects" className="eyebrow hover:text-ink">
                ← Projects / {p.index}
              </Link>
            </Reveal>
            <Reveal as="p" delay={60} className="eyebrow mt-8">
              <span style={{ color: p.accent }}>{p.category}</span>
            </Reveal>
            <Reveal as="h1" delay={100} className="display mt-5 max-w-4xl text-[clamp(3rem,8.5vw,8.5rem)]">
              {p.name}
            </Reveal>
            <Reveal as="p" delay={160} className="lede mt-6 max-w-xl">
              {p.summary}
            </Reveal>
            <Reveal delay={220} className="pointer-events-auto mt-9 flex flex-wrap items-center gap-3">
              <a href="#experience" className="btn btn-primary" data-magnetic>
                Enter the experience <span className="arrow">↓</span>
              </a>
              <a href="#system" className="btn btn-ghost">
                See the architecture
              </a>
              <span className="mono ml-2 hidden items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-3 md:inline-flex">
                <span className="inline-block h-3 w-3 rounded-full border border-ink-3" aria-hidden="true" /> Drag to explore in 3D
              </span>
            </Reveal>
          </div>
        </header>
      ) : (
        <header className="relative isolate overflow-hidden pt-[calc(var(--nav-h)+4rem)] md:pt-[calc(var(--nav-h)+6rem)]">
          <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
          <div className="shell grid gap-12 pb-20 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Link href="/projects" className="eyebrow hover:text-ink">
                ← Projects / {p.index}
              </Link>
              <p className="eyebrow mt-10" style={{ color: p.accent }}>
                {p.category}
              </p>
              <h1 className="display mt-5 text-[clamp(3rem,8vw,7.5rem)]">{p.name}</h1>
              <p className="lede mt-8 max-w-2xl">{p.summary}</p>
            </div>
            <div className="brackets relative aspect-[4/3] border border-line bg-void/50 lg:col-span-5">
              <ProjectVisual project={p} />
            </div>
          </div>
        </header>
      )}

      <section className="border-t border-line">
        <dl className="shell grid gap-6 py-10 text-sm sm:grid-cols-3">
          <div>
            <dt className="eyebrow">Category</dt>
            <dd className="mt-2 text-ink-2">{p.category}</dd>
          </div>
          <div>
            <dt className="eyebrow">Built by</dt>
            <dd className="mt-2 text-ink-2">{site.name}</dd>
          </div>
          <div>
            <dt className="eyebrow">Technology</dt>
            <dd className="mt-2 text-ink-2">{p.technology.join(" · ")}</dd>
          </div>
        </dl>
      </section>

      <Chapter n="01" label="The problem" title={p.problem.title} accent={p.accent}>
        <div className="grid gap-6 md:grid-cols-2">
          {p.problem.body.map((para, i) => (
            <Reveal as="p" key={i} delay={i * 80} className="text-lg leading-relaxed text-ink-2">
              {para}
            </Reveal>
          ))}
        </div>
      </Chapter>

      <Chapter n="02" label="The idea" title={p.idea.title} accent={p.accent}>
        <div className="grid gap-6 md:grid-cols-2">
          {p.idea.body.map((para, i) => (
            <Reveal as="p" key={i} delay={i * 80} className={`text-lg leading-relaxed ${i === 0 ? "text-ink" : "text-ink-2"}`}>
              {para}
            </Reveal>
          ))}
        </div>
      </Chapter>

      <div id="system">
        <Chapter n="03" label="The system" title={p.system.title} accent={p.accent}>
          <Reveal as="p" className="lede max-w-2xl">
            {p.system.body}
          </Reveal>
          <Reveal delay={100} className="mt-12">
            <ArchitectureDiagram layers={p.system.layers} accent={p.accent} />
          </Reveal>
        </Chapter>
      </div>

      {/* The experience gets the full width */}
      <section id="experience" className="scroll-mt-[var(--nav-h)] border-t border-line py-24 md:py-32">
        <div className="shell">
          <div className="grid gap-10 md:grid-cols-12">
            <Reveal className="md:col-span-3">
              <div className="flex items-center gap-3 border-t border-line pt-4">
                <span className="mono text-xs" style={{ color: p.accent }}>
                  04
                </span>
                <span className="eyebrow">The experience</span>
              </div>
            </Reveal>
            <div className="md:col-span-9">
              <Reveal as="h2" className="headline text-[clamp(2rem,4.6vw,4rem)]">
                {p.experience.title}
              </Reveal>
              <Reveal as="p" delay={80} className="lede mt-6 max-w-2xl">
                {p.experience.body}
              </Reveal>
            </div>
          </div>
          <Reveal delay={120} className="mt-14">
            <ProjectDemo demo={p.demo} />
          </Reveal>
        </div>
      </section>

      <Chapter n="05" label="The intelligence" title={p.intelligence.title} accent={p.accent}>
        <Reveal as="p" className="lede max-w-2xl">
          {p.intelligence.body}
        </Reveal>
        <ul className="mt-12 grid border-l border-t border-line sm:grid-cols-2">
          {p.intelligence.capabilities.map((c, i) => (
            <Reveal as="li" key={c.name} delay={i * 70} className="border-b border-r border-line p-6">
              <p className="mono text-[11px] uppercase tracking-[0.14em]" style={{ color: p.accent }}>
                {c.name}
              </p>
              <p className="mt-3 text-ink-2">{c.detail}</p>
            </Reveal>
          ))}
        </ul>
      </Chapter>

      <Chapter n="06" label="The result" title={p.result.title} accent={p.accent}>
        <Reveal as="p" className="lede max-w-2xl">
          {p.result.body}
        </Reveal>
        <ul className="mt-12 flex flex-col">
          {p.result.enables.map((e, i) => (
            <Reveal as="li" key={e} delay={i * 60} className="flex items-baseline gap-6 border-t border-line py-5 text-xl tracking-tight last:border-b md:text-2xl">
              <span className="mono text-xs text-ink-4">0{i + 1}</span>
              {e}
            </Reveal>
          ))}
        </ul>
        {p.pending?.length ? (
          <Reveal className="mt-12 border border-dashed border-line-strong p-5 text-sm text-ink-3">
            <span className="eyebrow mr-3">To be documented</span>
            {p.pending.join(" · ")}. This page will be updated as they are published.
          </Reveal>
        ) : null}
      </Chapter>

      {/* Bridge to the visitor's own problem */}
      <section className="border-t border-line py-24 md:py-32">
        <div className="shell grid gap-10 md:grid-cols-12 md:items-end">
          <Reveal className="md:col-span-7">
            <p className="eyebrow">Your turn</p>
            <p className="headline mt-6 text-[clamp(2rem,4.4vw,3.75rem)]">
              {p.name} is one system. <span className="text-ink-3">What would yours look like?</span>
            </p>
            <Link href="/build" className="btn btn-primary mt-10">
              Start a project <span className="arrow">→</span>
            </Link>
          </Reveal>
          {next && next.slug !== p.slug ? (
            <Reveal delay={100} className="md:col-span-5">
              <Link href={`/projects/${next.slug}`} className="group block border border-line p-6 transition-colors hover:border-line-strong">
                <p className="eyebrow">Next system · {next.index}</p>
                <p className="mt-4 text-3xl font-medium tracking-tight transition-colors group-hover:text-ojas">{next.name}</p>
                <p className="mt-2 text-sm text-ink-3">{next.category}</p>
              </Link>
            </Reveal>
          ) : null}
        </div>
      </section>
    </article>
  );
}
