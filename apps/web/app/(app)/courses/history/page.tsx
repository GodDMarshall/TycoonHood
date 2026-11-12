import type { Metadata } from "next";
import Link from "next/link";
import { formatWeekday, learner, memberZone } from "@tycoonhood/core";
import { Icon } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { LESSON_TYPE } from "../../../../lib/learning";
import { Page, PageHeader, Panel } from "../../../../components/app/page";

export const metadata: Metadata = { title: "Learning history" };
export const dynamic = "force-dynamic";

/** Every lesson this member has completed, newest first, grouped by day. */
export default async function LearningHistoryPage() {
  const user = await requireUser();
  const rows = await learner.history(user.id, 200);
  const zone = memberZone(user.profile?.timezone);
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.completedAt ? formatWeekday(r.completedAt, zone, { year: true }) : "Undated";
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  return (
    <Page width="narrow">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px] text-ink-3">
        <Link href="/courses" className="hover:text-ink-1">
          Courses
        </Link>
        <Icon name="chevron-right" size={12} />
        <span className="text-ink-2">History</span>
      </nav>
      <PageHeader title="Learning history" description={rows.length ? `${rows.length} lesson${rows.length === 1 ? "" : "s"} completed${rows.length === 200 ? " (latest 200 shown)" : ""}.` : undefined} />
      {rows.length === 0 ? (
        <Panel className="p-8 text-center text-[15px] text-ink-2">
          Nothing completed yet. <Link href="/courses" className="text-gold underline-offset-4 hover:underline">Pick a program</Link> and finish your first lesson.
        </Panel>
      ) : (
        <div className="flex flex-col gap-8">
          {[...groups.entries()].map(([day, items]) => (
            <section key={day} aria-label={day}>
              <h2 className="mb-2 text-[13px] font-medium text-ink-3">{day}</h2>
              <Panel as="ul" className="divide-y divide-line">
                {items.map((h) => {
                  const live = h.lesson.module.course.status === "PUBLISHED";
                  const body = (
                    <>
                      <Icon name="check" size={15} className="mt-1 text-success" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14.5px] text-ink-1">{h.lesson.title}</span>
                        <span className="block text-[12.5px] text-ink-3">
                          {h.lesson.module.course.title} · {h.lesson.module.title} · {LESSON_TYPE[h.lesson.type]}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={h.lesson.id}>
                      {live ? (
                        <Link href={`/courses/${h.lesson.module.course.slug}/lesson/${h.lesson.id}`} className="flex items-start gap-4 px-5 py-3 hover:bg-bg-2">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-4 px-5 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </Panel>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
