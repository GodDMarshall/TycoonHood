/**
 * Curriculum source format. One file per programme exports `Programme`.
 * The academy seed (seed-academy.ts) turns these into Course → CourseModule →
 * Lesson → Quiz rows. Admins can edit everything afterwards in /admin/courses;
 * these files are the launch edition, not the only way content gets in.
 */

export type QuizQuestionSrc = {
  prompt: string;
  /** 3–4 options. */
  options: string[];
  /** 0-based index into options. */
  correct: number;
  /** Why the correct answer is correct — shown after submission. */
  why: string;
};

export type LessonSrc = {
  title: string;
  /** READING teaches, ASSIGNMENT is a practical exercise, QUIZ is the module check. */
  type: "READING" | "ASSIGNMENT" | "QUIZ";
  /** XP for completing. Defaults: READING 50, ASSIGNMENT 75, QUIZ 100. */
  xp?: number;
  /** Visible before enrolment. Use on the first lesson of module 1 only. */
  preview?: boolean;
  /** Estimated minutes to complete. */
  minutes?: number;
  /** Markdown body. READING/ASSIGNMENT: 350–700 words of real teaching. */
  md: string;
  /** Required on QUIZ lessons. */
  quiz?: { passScore?: number; questions: QuizQuestionSrc[] };
};

export type ModuleSrc = {
  title: string;
  description: string;
  /** 3–4 learning objectives, each starting with a verb ("Explain…", "Build…"). */
  objectives: string[];
  /** What a member must do to complete the module, in one sentence. */
  completion: string;
  lessons: LessonSrc[];
};

export type Programme = {
  slug: string;
  modules: ModuleSrc[];
  /** Final programme assessment: 10–12 questions spanning every module. */
  finalAssessment: { passScore: number; intro: string; questions: QuizQuestionSrc[] };
};
