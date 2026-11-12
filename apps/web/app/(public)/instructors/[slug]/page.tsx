import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { Avatar, Icon, PillarBadge } from "@tycoonhood/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const i = await prisma.instructor.findUnique({ where: { slug }, select: { name: true, headline: true } });
  if (!i) return { title: "Instructor" };
  return { title: i.name, description: i.headline ?? undefined, alternates: { canonical: `/instructors/${slug}` } };
}

/** An instructor and the published programmes they teach. */
export default async function InstructorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instructor = await prisma.instructor.findUnique({
    where: { slug },
    include: {
      courses: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
        select: { id: true, slug: true, title: true, subtitle: true, pillar: true, modules: { select: { _count: { select: { lessons: true } } } } },
      },
    },
  });
  if (!instructor) notFound();

  return (
    <main className="mx-auto max-w-[56rem] px-[var(--gutter)] py-16 md:py-24">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[12.5px] text-ink-3">
        <Link href="/learning" className="hover:text-ink-1">
          Learning
        </Link>
        <Icon name="chevron-right" size={12} />
        <span className="text-ink-2">{instructor.name}</span>
      </nav>
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar name={instructor.name} src={instructor.avatar} size={112} className="shrink-0" />
        <div>
          <p className="eyebrow">Instructor</p>
          <h1 className="display mt-2 text-[clamp(2rem,1.6rem+2vw,3rem)]">{instructor.name}</h1>
          {instructor.headline && <p className="mt-2 text-lead text-ink-2">{instructor.headline}</p>}
        </div>
      </header>
      <p className="mt-10 max-w-[65ch] whitespace-pre-line text-[16px] leading-relaxed text-ink-2">{instructor.bio}</p>

      <section aria-labelledby="teaches" className="mt-14">
        <h2 id="teaches" className="eyebrow mb-5">
          Programs
        </h2>
        {instructor.courses.length === 0 ? (
          <p className="text-[15px] text-ink-3">No published programs yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {instructor.courses.map((c) => {
              const lessons = c.modules.reduce((n, m) => n + m._count.lessons, 0);
              return (
                <li key={c.id}>
                  <Link href={`/programs/${c.slug}`} className="flex h-full flex-col rounded-lg border border-line bg-bg-1 p-5 transition-colors hover:border-gold-deep">
                    <PillarBadge pillar={c.pillar} />
                    <span className="display mt-3 text-[20px]">{c.title}</span>
                    {c.subtitle && <span className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{c.subtitle}</span>}
                    <span className="figures mt-auto pt-4 text-[12.5px] text-ink-3">
                      {c.modules.length} modules · {lessons} lessons
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
