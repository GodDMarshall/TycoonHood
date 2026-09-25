import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Badge, Card, CardContent, PillarBadge, SectionRule } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Programs" };
export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: { modules: { include: { lessons: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow mb-3">Programs</p>
      <h1 className="display text-[40px] leading-tight">Four pillars. One standard.</h1>
      <p className="mt-3 max-w-xl text-ink-2">
        Every program is structured into modules and lessons with XP on
        completion. Content is in production — the structure below is live
        from the catalog.
      </p>

      <SectionRule className="my-10" />
      <div className="grid gap-5 md:grid-cols-2">
        {courses.map((c) => {
          const lessonCount = c.modules.reduce((n, m) => n + m.lessons.length, 0);
          return (
            <Link key={c.id} href={`/programs/${c.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-gold-deep">
                <CardContent className="flex h-full flex-col gap-3 py-6">
                  <div className="flex items-center justify-between">
                    <PillarBadge pillar={c.pillar} />
                    {c.status !== "PUBLISHED" && <Badge>In production</Badge>}
                  </div>
                  <h2 className="display text-[24px]">{c.title}</h2>
                  <p className="text-[14px] leading-relaxed text-ink-2">{c.description}</p>
                  <p className="figures mt-auto pt-2 text-[12px] text-ink-3">
                    {c.modules.length} module{c.modules.length === 1 ? "" : "s"} · {lessonCount} lesson
                    {lessonCount === 1 ? "" : "s"} · +{c.xpOnCompletion} XP on completion
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
