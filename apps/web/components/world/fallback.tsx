/**
 * The 2D page of /world (DR-31): the first paint, and the whole page on
 * every phone, tablet and browser that does not draw the campus.
 *
 * A server component that works without JavaScript: one card per building,
 * each with the member's own figures, the house's last 24 hours as a count,
 * and every link the building leads to. Nothing on it changes anything;
 * each action lives on the page its link opens. No canvas and no three.
 */
import Link from "next/link";
import type { WorldState } from "@tycoonhood/core";
import { Icon, buttonStyles } from "@tycoonhood/ui";
import { Page, PageHeader, Panel } from "../app/page";
import { SECTIONS, facts, lessonHref, linksFor, presenceLine, type Section } from "./sections";

const PILLAR_COLOR: Record<string, string> = {
  WARRIOR: "var(--color-warrior)",
  BUILDER: "var(--color-builder)",
  TYCOON: "var(--color-tycoon)",
  MIND: "var(--color-mind)",
};

const inkLink = "font-medium text-ink-1 underline decoration-line-strong underline-offset-4 hover:decoration-ink-2";

export function WorldFallback({ state }: { state: WorldState }) {
  return (
    <Page className="pt-4 lg:pt-6">
      <PageHeader title="3D campus" description="An optional way to move between your sections. Everything in it is here too." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <Card key={section.id} section={section} s={state} />
        ))}
      </div>
    </Page>
  );
}

function Card({ section, s }: { section: Section; s: WorldState }) {
  const id = section.id;
  const presence = presenceLine(id, s);
  return (
    <Panel className="flex flex-col p-5" aria-labelledby={`world-${id}`} data-world-card={id}>
      <h2 id={`world-${id}`} className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em] text-ink-1">
        <Icon name={section.icon} size={18} className="text-ink-3" />
        {section.name}
      </h2>

      <dl className="mt-4 flex flex-col gap-2">
        {facts(id, s).map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-[13px] text-ink-3">{f.label}</dt>
            <dd className="text-right text-[14px] tabular-nums text-ink-1">{f.value}</dd>
          </div>
        ))}
      </dl>

      {id === "today" && <NextLesson s={s} />}
      {id === "courses" && <Programs s={s} />}

      {presence && <p className="mt-4 text-[13px] text-ink-3">{presence}</p>}

      <div className="mt-auto pt-5">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">
          {linksFor(id, s).map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex items-center gap-1 text-[14px] font-medium text-ink-2 hover:text-ink-1">
                {l.label}
                <Icon name="arrow-right" size={13} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/** The one gold button on the page: the next open lesson (DR-25). */
function NextLesson({ s }: { s: WorldState }) {
  const n = s.today.next;
  if (!n)
    return (
      <p className="mt-4 border-t border-line pt-4 text-[14px] text-ink-2">
        No lesson waiting.{" "}
        <Link href="/courses" className={inkLink}>
          Find a course
        </Link>
      </p>
    );
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-[13px] text-ink-3">Next lesson</p>
      <p className="mt-0.5 text-[14.5px] font-medium leading-snug text-ink-1">{n.lesson}</p>
      <p className="text-[13px] text-ink-3">{n.course}</p>
      <Link href={lessonHref(n.slug, n.lessonId)} className={buttonStyles({ size: "sm", className: "mt-3" })}>
        Continue
        <Icon name="arrow-right" size={14} />
      </Link>
    </div>
  );
}

/** The member's programs, most recently active first, each with its next lesson. */
function Programs({ s }: { s: WorldState }) {
  const programs = s.courses.programs;
  if (programs.length === 0)
    return (
      <p className="mt-4 border-t border-line pt-4 text-[14px] text-ink-2">
        No enrolments yet.{" "}
        <Link href="/courses" className={inkLink}>
          Browse courses
        </Link>
      </p>
    );
  return (
    <ul className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
      {programs.map((p) => (
        <li key={p.slug} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <Link href={`/courses/${p.slug}`} className="truncate text-[14px] font-medium text-ink-1 hover:underline">
              {p.title}
            </Link>
            <span className="shrink-0 text-[12.5px] tabular-nums text-ink-3">
              {p.done} of {p.lessons}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${p.title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={p.pct}
            className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: PILLAR_COLOR[p.pillar] }} />
          </div>
          {p.next ? (
            <Link href={lessonHref(p.slug, p.next.lessonId)} className="mt-1.5 block truncate text-[13px] text-ink-2 hover:text-ink-1">
              Next: {p.next.lesson}
            </Link>
          ) : (
            <p className="mt-1.5 text-[13px] text-ink-3">{p.lessons === 0 ? "No lessons yet" : "Every lesson done"}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
