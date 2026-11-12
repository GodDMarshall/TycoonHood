/**
 * Public surface of the LMS additions (authoring, reviews, history,
 * recommendations, certificate eligibility). Re-exported from the package
 * index with `export * from "./lms/index-authoring"`.
 */
export {
  CourseAuthoringService,
  authoring,
  AuthoringError,
  LessonHasProgressError,
  PublishBlockedError,
  courseInputSchema,
  moduleInputSchema,
  lessonInputSchema,
  quizInputSchema,
  resourceInputSchema,
  instructorInputSchema,
  PILLARS,
  LESSON_TYPES,
  RESOURCE_KINDS,
  REVIEW_MODERATORS,
  canModerateReviews,
} from "./authoring";
export type { AuthoringActor, CourseInput, ModuleInput, LessonInput, QuizInput, ResourceInput, InstructorInput } from "./authoring";
export { LearnerService, learner, ReviewNotAllowedError, reviewSchema, rankBySignals } from "./learner";
export type { ReviewEligibility, ReviewInput } from "./learner";
export { CourseUnavailableError, questionsForMember } from "./lms";
export type { CertificateEligibility, QuizReviewItem } from "./lms";
