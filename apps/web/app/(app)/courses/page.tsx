import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Icon, buttonStyles, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { catalog, LESSON_TYPE, searchLessons } from "../../../lib/learning";
import { Page, PageHeader, Panel, SectionTitle } from "../../../components/app/page";
import { CourseCard, CourseCover } from "../../../components/learning/course-card";

export const metadata: Metadata = { title: "Courses" };
export const dynamic = "force-dynamic";

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q = "" } = await searchParams;
  const query = q.trim();
  const [courses, results] = await Promise.all([catalog(user.id), query ? searchLessons(user.id, query) : Promise.resolve(null)]);
  const current = courses.filter((c) => c.enrollment && c.next);

  return (
    <Page>
      <PageHeader
        title="Courses"
        description="Each program is a sequence. Lessons open in order, so you always know the one next step."
      />

      <form role="search" action="/courses" className="mb-10 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <label htmlFor="lesson-search" className="sr-only">
            Search every lesson
          </label>
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-3" aria-hidden>
            <Icon name="search" size={17} />
          </span>
          <input
            id="lesson-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search every lesson — e.g. “overload”, “pricing”"
            className="h-11 w-full rounded-md border border-line-input/60 bg-bg-1 pl-10 pr-3 text-[15px] text-ink-1 placeholder:text-ink-3 focus:border-gold-deep focus:outline-none"
          />
        </div>
        <button type="submit" className={buttonStyles({ variant: "secondary", className: "h-11" })}>
          Search
        </button>
      </form>

      {results ? (
        <section aria-labelledby="results">
          <SectionTitle
            id="results"
            action={
              <Link href="/courses" className="text-[13px] text-ink-3 hover:text-ink-1">
                Clear search
              </Link>
            }
          >
            {results.length === 0 ? `Nothing matches “${query}”` : `${results.length} lesson${results.length === 1 ? "" : "s"} mention “${query}”`}
          </SectionTitle>
          {results.length > 0 && (
            <Panel as="div" className="divide-y divide-line">
              {results.map((r) => {
                const open = r.enrolled && r.state !== "locked";
                const href = open ? `/courses/${r.course.slug}/lesson/${r.id}` : `/courses/${r.course.slug}`;
                return (
                  <Link key={r.id} href={href} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-bg-2">
                    <Icon
                      name={r.state === "done" ? "check" : open ? "play" : "lock"}
                      size={16}
                      className={cn("mt-1", r.state === "done" ? "text-success" : open ? "text-gold" : "text-ink-3")}
                    />
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-ink-1">{r.title}</p>
                      <p className="mt-0.5 text-[13px] text-ink-3">
                        {r.course.title} · {r.module} · {LESSON_TYPE[r.type]}
                        {!r.enrolled ? " · enroll to open" : r.state === "locked" ? " · opens in order" : ""}
                      </p>
                      {r.snippet && <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{r.snippet}</p>}
                    </div>
                  </Link>
                );
              })}
            </Panel>
          )}
        </section>
      ) : (
        <>
          {current.length > 0 && (
            <section aria-labelledby="continue" className="mb-12">
              <SectionTitle id="continue">Pick up where you left off</SectionTitle>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {current.map((c) => (
                  <Link
                    key={c.id}
                    href={`/courses/${c.slug}/lesson/${c.next!.id}`}
                    className="group flex min-w-0 items-center gap-4 rounded-lg border border-line bg-bg-1 p-3 transition-colors hover:border-gold-deep"
                  >
                    <CourseCover pillar={c.pillar} title={c.title} compact className="aspect-square w-16 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink-3">
                        {c.title} · {c.done}/{c.lessons} done
                      </p>
                      <p className="mt-0.5 truncate text-[15px] font-medium text-ink-1">{c.next!.title}</p>
                      <p className="mt-0.5 truncate text-[13px] text-ink-3">{c.next!.moduleTitle}</p>
                    </div>
                    <Icon name="arrow-right" size={18} className="mr-2 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="programs">
            <SectionTitle id="programs">All programs</SectionTitle>
            {courses.length === 0 ? (
              <Panel className="p-8 text-center text-ink-2">No programs are published yet.</Panel>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((c) => (
                  <CourseCard key={c.id} c={c} />
                ))}
              </div>
            )}
            <p className="mt-6 flex items-center gap-2 text-[13px] text-ink-3">
              <Badge tone="neutral">Free</Badge> Every published program is free to enroll in.
            </p>
          </section>
        </>
      )}
    </Page>
  );
}
