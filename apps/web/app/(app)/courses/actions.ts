"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { community, CommunityError, lms, LessonLockedError, NotEnrolledError, QuizRequiredError } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rate-limit";

export async function enrollAction(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await lms.enroll(user.id, slug);
  revalidatePath("/", "layout"); // the sidebar lists your programs
  redirect(`/courses/${slug}`);
}

/**
 * Complete a lesson and move on: straight to the next lesson when there is
 * one, back to the program when it was the last. A lesson that is not open
 * (or needs its knowledge check) sends the member back to it, where the page
 * says why.
 */
export async function completeLessonAction(slug: string, lessonId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let courseCompleted: boolean;
  try {
    const r = await lms.completeLesson(user.id, lessonId);
    courseCompleted = r.courseCompleted;
  } catch (e) {
    if (e instanceof NotEnrolledError) redirect(`/courses/${slug}`);
    if (e instanceof LessonLockedError || e instanceof QuizRequiredError) redirect(`/courses/${slug}/lesson/${lessonId}`);
    throw e;
  }
  revalidatePath("/", "layout");
  const view = await lms.memberCourseView(user.id, slug);
  const ordered = view?.course.modules.flatMap((m) => m.lessons) ?? [];
  const next = ordered.find((l) => !l.progress[0]?.completedAt);
  if (courseCompleted || !next) redirect(`/courses/${slug}?completed=1`);
  redirect(`/courses/${slug}/lesson/${next.id}`);
}

export interface QuizState {
  result?: {
    scorePct: number;
    passed: boolean;
    passScore: number;
    correct: number;
    total: number;
    review: { prompt: string; yourAnswer: number; correctIndex: number; correct: boolean; explanation: string | null }[];
  };
  /** Where to go after a pass. */
  nextHref?: string;
  error?: string;
}

export async function submitQuizAction(
  meta: { quizId: string; slug: string; lessonId: string; questionCount: number },
  _prev: QuizState,
  formData: FormData
): Promise<QuizState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const answers: number[] = [];
  for (let i = 0; i < meta.questionCount; i++) {
    const v = formData.get(`q${i}`);
    if (v == null) return { error: "Answer every question before submitting." };
    answers.push(Number(v));
  }
  try {
    const result = await lms.submitQuiz(user.id, meta.quizId, answers);
    revalidatePath("/", "layout");
    let nextHref: string | undefined;
    if (result.passed) {
      const view = await lms.memberCourseView(user.id, meta.slug);
      const next = view?.course.modules.flatMap((m) => m.lessons).find((l) => !l.progress[0]?.completedAt);
      nextHref = next ? `/courses/${meta.slug}/lesson/${next.id}` : `/courses/${meta.slug}?completed=1`;
    }
    return { result, nextHref };
  } catch (e) {
    if (e instanceof LessonLockedError || e instanceof NotEnrolledError) return { error: e.message };
    throw e;
  }
}

export interface AskState {
  ok?: boolean;
  error?: string;
  channel?: string;
}

/** Ask about this lesson: lands in the program's Questions channel with the lesson attached. */
export async function askAboutLessonAction(slug: string, lessonId: string, _prev: AskState, fd: FormData): Promise<AskState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!rateLimit(`post:${user.id}`, 6, 30_000).ok) return { error: "You are posting very fast. Give it a few seconds." };
  const channel = `${slug}-questions`;
  try {
    await community.post({ id: user.id, role: user.role }, channel, { body: String(fd.get("body") ?? ""), lessonId });
  } catch (e) {
    if (e instanceof CommunityError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/courses/${slug}/lesson/${lessonId}`);
  revalidatePath(`/community/${channel}`);
  return { ok: true, channel };
}
