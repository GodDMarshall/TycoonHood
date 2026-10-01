/**
 * A program on the shelf: what it is, how long it is, where you are in it,
 * and the one button that moves you forward. Server component.
 */
import Link from "next/link";
import { Badge, Icon, PILLAR_LABEL, Progress, buttonStyles, cn } from "@tycoonhood/ui";
import type { CatalogCourse } from "../../lib/learning";
import { enrollAction } from "../../app/(app)/courses/actions";
import { SubmitButton } from "../submit-button";
import { CoverFill } from "../art/program-art";

const PILLAR_TEXT: Record<CatalogCourse["pillar"], string> = {
  WARRIOR: "text-warrior",
  BUILDER: "text-builder",
  TYCOON: "text-gold",
  MIND: "text-mind",
};

export function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * The program's picture: its cover photo when an admin has set one, otherwise
 * the pillar's drawn scene. Decorative — the title next to it is the label.
 */
export function CourseCover({
  pillar,
  coverImage,
  compact,
  className,
}: {
  pillar: CatalogCourse["pillar"];
  coverImage?: string | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[16/7] overflow-hidden rounded-md bg-bg-2", className)} aria-hidden>
      <CoverFill pillar={pillar} coverImage={coverImage} />
      {!compact && (
        <span
          className={cn(
            "absolute bottom-3 left-3 rounded-sm bg-bg-0/80 px-2 py-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] backdrop-blur-sm",
            PILLAR_TEXT[pillar],
          )}
        >
          {PILLAR_LABEL[pillar]}
        </span>
      )}
    </div>
  );
}

export function CourseCard({ c }: { c: CatalogCourse }) {
  const href = `/courses/${c.slug}`;
  const completed = c.enrollment?.status === "COMPLETED" || (c.enrollment && !c.next);
  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-line bg-bg-1 p-3 transition-colors hover:border-line-strong">
      <Link href={href} className="block" tabIndex={-1} aria-label={c.title}>
        <CourseCover pillar={c.pillar} coverImage={c.coverImage} />
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {c.certificate ? (
            <Badge tone="gold">
              <Icon name="seal" size={12} /> Certified
            </Badge>
          ) : completed ? (
            <Badge tone="success">Completed</Badge>
          ) : c.enrollment ? (
            <Badge tone="neutral">In progress</Badge>
          ) : null}
        </div>
        <h3 className="mt-2 text-[18px] font-semibold leading-snug tracking-[-0.01em]">
          <Link href={href} className="hover:text-gold-bright">
            {c.title}
          </Link>
        </h3>
        {c.subtitle && <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{c.subtitle}</p>}
        <p className="mt-3 text-[13px] text-ink-3">
          {c.modules} modules · {c.lessons} lessons
          {c.minutes ? ` · about ${duration(c.minutes)}` : ""}
        </p>

        <div className="mt-auto pt-5">
          {c.enrollment ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Progress value={c.pct} label={`${c.title} progress`} className="flex-1" />
                <span className="text-[12.5px] tabular-nums text-ink-3">
                  {c.done}/{c.lessons}
                </span>
              </div>
              {c.next ? (
                <Link
                  href={`${href}/lesson/${c.next.id}`}
                  className={buttonStyles({
                    className: "w-full min-w-0 overflow-hidden",
                  })}
                >
                  <span className="shrink-0">{c.done === 0 ? "Start" : "Continue"}:</span> <span className="min-w-0 truncate font-normal">{c.next.title}</span>
                </Link>
              ) : (
                <Link
                  href={href}
                  className={buttonStyles({
                    variant: "secondary",
                    className: "w-full",
                  })}
                >
                  Review the program
                </Link>
              )}
            </>
          ) : (
            <form action={enrollAction.bind(null, c.slug)}>
              <SubmitButton variant="secondary" className="w-full" pendingLabel="Enrolling">
                Enroll — free
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
