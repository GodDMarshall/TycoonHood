"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { lms, NotEnrolledError } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";

export async function enrollAction(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await lms.enroll(user.id, slug);
  redirect(`/academy/${slug}`);
}

export async function completeLessonAction(slug: string, lessonId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  try {
    await lms.completeLesson(user.id, lessonId);
  } catch (e) {
    if (e instanceof NotEnrolledError) redirect(`/academy/${slug}`);
    throw e;
  }
  revalidatePath(`/academy/${slug}`);
  revalidatePath(`/academy/${slug}/lesson/${lessonId}`);
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
  const result = await lms.submitQuiz(user.id, meta.quizId, answers);
  revalidatePath(`/academy/${meta.slug}`);
  revalidatePath(`/academy/${meta.slug}/lesson/${meta.lessonId}`);
  return { result };
}
