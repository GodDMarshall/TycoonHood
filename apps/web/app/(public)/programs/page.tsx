import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Badge, Icon, PillarBadge } from "@tycoonhood/ui";
import { RoomHeader } from "../../../components/room-header";
import { PILLAR_WORLD, PillarArt } from "../../../components/pillar-art";

export const metadata: Metadata = {
  title: "The Academy — four programs",
  description:
    "Warrior, Business Mastery, Financial Planning and Mindfulness: structured programs of modules, lessons and quizzes, with XP on every lesson and a certificate on completion.",
  alternates: { canonical: "/programs" },
};
export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: { modules: { include: { lessons: { select: { id: true } } } } },
  });
  const lessons = courses.reduce((n, c) => n + c.modules.reduce((m, mod) => m + mod.lessons.length, 0), 0);

  return (
    <main>
      <RoomHeader
        icon="academy"
        room="The Academy"
        title="Four disciplines."
        accent="One standard."
        lead="Every program is modules, lessons and a knowledge check. Each lesson pays XP when you finish it; each program ends in a certificate with a public serial anyone can verify."
        aside={
          <dl className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-bg-1/80">
            {[
              ["Programs", courses.filter((c) => c.status === "PUBLISHED").length],
              ["Lessons", lessons],
              ["Cost to enroll", "Free"],
            ].map(([k, v]) => (
              <div key={k} className="px-5 py-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{k}</dt>
                <dd className="figures mt-2 text-[22px]">{v}</dd>
              </div>
            ))}
          </dl>
        }
      />

      <div className="mx-auto grid max-w-[88rem] gap-6 px-[var(--gutter)] py-16 md:grid-cols-2">
        {courses.map((c, i) => {
          const lessonCount = c.modules.reduce((n, m) => n + m.lessons.length, 0);
          return (
            <Link
              key={c.id}
              href={`/programs/${c.slug}`}
              data-reveal
              style={{ transitionDelay: `${(i % 2) * 90}ms` }}
              className="group flex flex-col overflow-hidden rounded-lg border border-line bg-bg-1 transition-colors duration-[var(--dur-3)] hover:border-gold-deep"
            >
              <div className="relative aspect-[2/1] overflow-hidden border-b border-line">
                <PillarArt pillar={c.pillar} className="transition-transform duration-[1200ms] ease-[var(--ease-premium)] group-hover:scale-[1.03]" />
                <span className="absolute left-5 top-5 flex gap-2">
                  <PillarBadge pillar={c.pillar} />
                  {c.status !== "PUBLISHED" && <Badge>In production</Badge>}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6 md:p-8">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">{PILLAR_WORLD[c.pillar].line}</p>
                <h2 className="display text-[26px] leading-tight">{c.title}</h2>
                <p className="text-[14.5px] leading-relaxed text-ink-2">{c.description}</p>
                <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                  <span>
                    {c.modules.length} module{c.modules.length === 1 ? "" : "s"}
                  </span>
                  <span>
                    {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-gold">+{c.xpOnCompletion} XP</span>
                  <Icon name="arrow-right" size={15} className="ml-auto text-ink-3 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-gold" />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
