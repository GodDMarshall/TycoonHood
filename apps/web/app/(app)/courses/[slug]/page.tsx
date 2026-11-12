import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { formatDate, learner, lms, memberZone } from "@tycoonhood/core";
import { Avatar, Badge, Icon, Notice, PILLAR_LABEL, Progress, buttonStyles, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { courseDetail, LESSON_TYPE } from "../../../../lib/learning";
import { enrollAction, saveReviewAction } from "../actions";
import { ResourceList } from "../../../../components/learning/lesson-video";
import { ReviewForm } from "../../../../components/learning/review-form";
import { Page, Panel, SectionTitle } from "../../../../components/app/page";
import { CourseCover, duration } from "../../../../components/learning/course-card";
import { SubmitButton } from "../../../../components/submit-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) };
}

export default async function CoursePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ completed?: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const { completed } = await searchParams;
  let d = await courseDetail(user.id, slug);
  if (!d) notFound();
  // Every lesson done but not settled: the programme became finishable
  // without a new lesson (a final marked on a check already passed, a lesson
  // removed). Complete it and issue the certificate now. Idempotent.
  if (d.enrollment && d.total > 0 && d.done === d.total && (d.enrollment.status !== "COMPLETED" || !d.certificate)) {
    if (await lms.reconcile(user.id, d.course.id)) d = (await courseDetail(user.id, slug)) ?? d;
  }
  const { course, enrollment, certificate } = d;
  const [eligibility, rating, reviews, reviewGate, mine] = await Promise.all([
    enrollment ? lms.certificateEligibility(user.id, course.id) : Promise.resolve(null),
    learner.rating(course.id),
    learner.reviews(course.id, 10),
    learner.reviewEligibility(user.id, course.id),
    prisma.courseReview.findUnique({ where: { courseId_userId: { courseId: course.id, userId: user.id } } }),
  ]);
  const zone = memberZone(user.profile?.timezone);

  return (
    <Page>
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px] text-ink-3">
        <Link href="/courses" className="hover:text-ink-1">
          Courses
        </Link>
        <Icon name="chevron-right" size={12} />
        <span className="truncate text-ink-2">{course.title}</span>
      </nav>

      {completed && !d.next && (
        <Notice tone="success" title="Program complete" className="mb-8">
          You finished every lesson in {course.title}.{" "}
          {certificate && (
            <Link href={`/certificates/${certificate.serial}`} className="text-gold underline underline-offset-4">
              Your certificate is {certificate.serial}.
            </Link>
          )}
        </Notice>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-3">{PILLAR_LABEL[course.pillar]} program</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{course.title}</h1>
          {course.subtitle && <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{course.subtitle}</p>}
          <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{course.description}</p>
          {course.pillar === "TYCOON" && (
            <Notice tone="info" className="mt-5 max-w-[68ch]">
              Educational content only. Nothing in this program is personalised financial, investment, tax or legal advice.
            </Notice>
          )}
          {d.instructor ? (
            <Link
              href={`/instructors/${d.instructor.slug}`}
              className="mt-6 flex max-w-md items-center gap-3 rounded-lg border border-line bg-bg-1 p-3 transition-colors hover:border-line-strong"
            >
              <Avatar name={d.instructor.name} src={d.instructor.avatar} size={44} />
              <span className="min-w-0">
                <span className="block text-[13px] text-ink-3">Your instructor</span>
                <span className="block text-[15px] font-medium text-ink-1">{d.instructor.name}</span>
                {d.instructor.headline && <span className="block truncate text-[13px] text-ink-2">{d.instructor.headline}</span>}
              </span>
            </Link>
          ) : course.instructorName ? (
            <p className="mt-4 text-[14px] text-ink-3">
              Taught by <span className="text-ink-1">{course.instructorName}</span>
            </p>
          ) : null}
          <p className="mt-4 text-[13.5px] text-ink-3">
            {rating.count > 0 ? (
              <>
                Rated <span className="tabular-nums text-ink-1">{rating.average?.toFixed(1)}</span> / 5 by {rating.count} member{rating.count === 1 ? "" : "s"}
              </>
            ) : (
              "No reviews yet."
            )}
          </p>
        </div>

        <Panel className="p-4 lg:sticky lg:top-6">
          <CourseCover pillar={course.pillar} coverImage={course.coverImage} />
          <div className="px-1 pt-4">
            <p className="text-[13px] text-ink-3">
              {d.modules.length} modules · {d.total} lessons{d.minutes ? ` · about ${duration(d.minutes)}` : ""}
            </p>
            {enrollment ? (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={d.pct} label="Program progress" className="flex-1" />
                  <span className="text-[13px] tabular-nums text-ink-2">{d.pct}%</span>
                </div>
                <p className="mt-2 text-[13px] text-ink-3">
                  {d.done} of {d.total} lessons complete
                </p>
                {d.next ? (
                  <Link href={`/courses/${slug}/lesson/${d.next.id}`} className={buttonStyles({ size: "lg", className: "mt-4 w-full" })}>
                    {d.done === 0 ? "Start the first lesson" : "Continue"}
                    <Icon name="arrow-right" size={16} />
                  </Link>
                ) : certificate ? (
                  <Link href={`/certificates/${certificate.serial}`} className={buttonStyles({ variant: "secondary", size: "lg", className: "mt-4 w-full" })}>
                    <Icon name="seal" size={16} /> View certificate
                  </Link>
                ) : null}
                {d.next && <p className="mt-2 truncate text-center text-[13px] text-ink-3">Next: {d.next.title}</p>}
              </>
            ) : (
              <form action={enrollAction.bind(null, slug)} className="mt-4">
                <SubmitButton size="lg" className="w-full" pendingLabel="Enrolling">
                  Enroll — free
                </SubmitButton>
                <p className="mt-2 text-center text-[13px] text-ink-3">Opens the first lesson and this program&rsquo;s community.</p>
              </form>
            )}
          </div>
          {eligibility && (
            <div className="mt-4 border-t border-line px-1 pt-4">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink-2">
                <Icon name="seal" size={15} className={certificate ? "text-gold" : "text-ink-3"} /> Certificate
              </p>
              {certificate ? (
                <p className="text-[13.5px] text-ink-2">
                  Issued {formatDate(certificate.issuedAt, zone)} ·{" "}
                  <Link href={`/certificates/${certificate.serial}`} className="text-gold underline-offset-4 hover:underline">
                    {certificate.serial}
                  </Link>
                </p>
              ) : !eligibility.hasFinal ? (
                <p className="text-[13.5px] text-ink-3">This program has no final assessment yet, so it does not issue a certificate.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-[13.5px]">
                  <li className={cn("flex items-start gap-2", eligibility.lessonsLeft <= (eligibility.finalPassed ? 0 : 1) ? "text-success" : "text-ink-2")}>
                    <Icon name={eligibility.lessonsLeft <= (eligibility.finalPassed ? 0 : 1) ? "check" : "clock"} size={14} className="mt-[3px]" />
                    {(() => {
                      const left = eligibility.lessonsLeft - (eligibility.finalPassed ? 0 : 1);
                      return left <= 0 ? "Every lesson complete" : `${left} lesson${left === 1 ? "" : "s"} left before the final`;
                    })()}
                  </li>
                  <li className={cn("flex items-start gap-2", eligibility.finalPassed ? "text-success" : "text-ink-2")}>
                    <Icon name={eligibility.finalPassed ? "check" : "quiz"} size={14} className="mt-[3px]" />
                    {eligibility.finalPassed
                      ? "Final assessment passed"
                      : eligibility.finalBestScore != null
                        ? `Pass the final assessment (best so far ${eligibility.finalBestScore}%)`
                        : "Pass the final assessment"}
                  </li>
                </ul>
              )}
            </div>
          )}
          {enrollment && d.channels.length > 0 && (
            <div className="mt-4 border-t border-line px-1 pt-4">
              <p className="mb-2 text-[13px] font-medium text-ink-2">Program community</p>
              <div className="flex flex-col gap-1">
                {d.channels.map((ch) => (
                  <Link
                    key={ch.slug}
                    href={`/community/${ch.slug}`}
                    className="flex h-9 items-center gap-2.5 rounded-md px-2 text-[14px] text-ink-2 hover:bg-bg-2 hover:text-ink-1"
                  >
                    <Icon name={ch.kind === "QUESTIONS" ? "help" : "hash"} size={16} className="text-ink-3" />
                    {ch.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <section aria-labelledby="syllabus" className="mt-12">
        <SectionTitle id="syllabus">Syllabus</SectionTitle>
        <div className="flex flex-col gap-4">
          {d.modules.map((m, mi) => {
            const doneHere = m.lessons.filter((l) => l.completed).length;
            return (
              <Panel key={m.id} className="overflow-hidden">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
                  <div>
                    <p className="text-[12.5px] font-medium text-ink-3">Module {mi + 1}</p>
                    <h3 className="text-[16px] font-semibold">{m.title}</h3>
                    {m.description && <p className="mt-1 text-[14px] text-ink-2">{m.description}</p>}
                    {m.objectives.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[12.5px] font-medium text-ink-3">You will be able to</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13.5px] leading-relaxed text-ink-2">
                          {m.objectives.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.completion && (
                      <p className="mt-2 flex items-start gap-2 text-[13px] text-ink-3">
                        <Icon name="check" size={13} className="mt-[3px]" /> <span>To complete: {m.completion}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-[13px] tabular-nums text-ink-3">
                    {doneHere}/{m.lessons.length}
                  </span>
                </div>
                <ol>
                  {m.lessons.map((l) => {
                    const state = l.gate.state;
                    const reachable = enrollment ? state !== "locked" : l.isPreview;
                    const row = (
                      <>
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full border",
                            state === "done" && "border-success/40 bg-success/10 text-success",
                            state === "open" && enrollment && "border-gold-deep bg-gold/10 text-gold",
                            (state === "locked" || !enrollment) && state !== "done" && "border-line-strong text-ink-3",
                          )}
                          aria-hidden
                        >
                          <Icon name={state === "done" ? "check" : state === "open" && enrollment ? "play" : "lock"} size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-[15px]", reachable ? "text-ink-1" : "text-ink-2")}>{l.title}</span>
                          <span className="mt-0.5 block text-[13px] text-ink-3">
                            {l.isFinal ? "Final assessment" : LESSON_TYPE[l.type]}
                            {l.minutes ? ` · ${l.minutes} min` : ""}
                            {l.quiz && state !== "done" ? " · pass to continue" : ""}
                            {enrollment && state === "locked" && l.gate.blockedBy ? ` · opens after “${l.gate.blockedBy.title}”` : ""}
                            {!enrollment && l.isPreview ? " · free preview" : ""}
                          </span>
                        </span>
                        {state === "open" && enrollment && <Badge tone="gold">Next</Badge>}
                      </>
                    );
                    return (
                      <li key={l.id} className="border-b border-line last:border-0">
                        {reachable ? (
                          <Link href={`/courses/${slug}/lesson/${l.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-bg-2">
                            {row}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-4 px-5 py-3.5" aria-disabled>
                            {row}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </Panel>
            );
          })}
        </div>
      </section>

      {d.resources.length > 0 && (
        <section aria-labelledby="resources" className="mt-12">
          <SectionTitle id="resources">Program resources</SectionTitle>
          <Panel className="px-5 py-2">
            <ResourceList resources={d.resources} />
          </Panel>
        </section>
      )}

      <section aria-labelledby="reviews" className="mt-12">
        <SectionTitle id="reviews">
          Reviews{rating.count > 0 ? ` · ${rating.average?.toFixed(1)} / 5 from ${rating.count}` : ""}
        </SectionTitle>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            {reviews.length === 0 ? (
              <Panel className="p-6 text-[14.5px] text-ink-2">No reviews yet. Members can review a program once they finish its first module.</Panel>
            ) : (
              <ul className="flex flex-col gap-3">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <Panel as="div" className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.user.profile?.displayName ?? "Member"} src={r.user.profile?.avatarUrl} size={28} />
                        <span className="text-[14px] text-ink-1">{r.user.profile?.displayName ?? "A member"}</span>
                        <Badge tone="gold">{r.rating} / 5</Badge>
                        <span className="ml-auto text-[12.5px] text-ink-3">{formatDate(r.updatedAt, zone)}</span>
                      </div>
                      {r.body && <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">{r.body}</p>}
                    </Panel>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Panel className="p-5">
            {reviewGate.canReview ? (
              <ReviewForm action={saveReviewAction.bind(null, slug, course.id)} initial={mine ? { rating: mine.rating, body: mine.body } : null} />
            ) : (
              <p className="text-[14px] text-ink-2">{reviewGate.reason}</p>
            )}
            {mine?.hidden && <p className="mt-3 text-[12.5px] text-ink-3">Your review was hidden by staff and is not shown to others.</p>}
          </Panel>
        </div>
      </section>
    </Page>
  );
}
