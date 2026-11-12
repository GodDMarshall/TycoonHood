/**
 * COURSE AUTHORING (spec "Admin course management", Journey 7).
 *
 * Every write is permission-checked here as well as in the server action
 * (defence in depth), validated with zod, and written to the audit log.
 *
 * Rules that protect members:
 *  - DRAFT and ARCHIVED programmes are never visible to members; publishing
 *    needs `courses.publish` and at least one lesson, and every knowledge
 *    check must have questions so it can actually be passed.
 *  - A lesson (or module) that members have progress on cannot be deleted;
 *    archive the programme instead. Their certificates stay valid.
 *  - One final assessment per programme: marking a lesson final unmarks
 *    the others. A final assessment is always a QUIZ lesson.
 *  - An edit that can finish members' programmes (marking a final,
 *    removing a lesson or module, publishing) completes and certifies
 *    everyone who now qualifies, at once.
 */
import { z } from "zod";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { Prisma, PrismaClient, UserRole } from "@tycoonhood/db";
import { assertCan, can, ForbiddenError, type HasRole, type Permission } from "../auth/permissions";
import { AuditService } from "../platform/audit";
import { LmsService } from "./lms";

export type AuthoringActor = { id: string; role: UserRole };

/** Who may hide a programme review: course staff, and community moderators. */
export const REVIEW_MODERATORS = ["courses.author", "community.moderate"] as const satisfies readonly Permission[];

export function canModerateReviews(user: HasRole): boolean {
  return REVIEW_MODERATORS.some((p) => can(user, p));
}

export class AuthoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthoringError";
  }
}
export class LessonHasProgressError extends AuthoringError {}
export class PublishBlockedError extends AuthoringError {}

// ─────────────────────────────────────────────────────────── schemas

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "The slug needs at least 2 characters.")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** http(s) URL, or a site path such as /photos/x.jpg. */
const urlOrPath = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => /^https?:\/\/\S+$/i.test(v) || /^\/[^\s]*$/.test(v), "Use a full https:// link or a path starting with /.");
const optUrlOrPath = z
  .union([urlOrPath, z.literal("")])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const bool = z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean());

/** An XP field left blank means the default, not 0 (Number("") is 0). 0 typed on purpose stays 0. */
const xpField = (max: number, fallback: number) =>
  z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.coerce.number().int().min(0).max(max).default(fallback)
  );

export const PILLARS = ["WARRIOR", "BUILDER", "TYCOON", "MIND"] as const;
export const LESSON_TYPES = ["VIDEO", "READING", "ASSIGNMENT", "QUIZ"] as const;
export const RESOURCE_KINDS = ["link", "file", "template"] as const;

export const courseInputSchema = z.object({
  title: z.string().trim().min(3, "Give the program a title.").max(120),
  slug,
  pillar: z.enum(PILLARS),
  subtitle: optText(200),
  description: z.string().trim().min(10, "Write at least a sentence of description.").max(5000),
  coverImage: optUrlOrPath,
  instructorId: optText(64),
  xpOnCompletion: xpField(10_000, 500),
});
export type CourseInput = z.input<typeof courseInputSchema>;

/** Objectives arrive as one-per-line text from a textarea, or as an array. */
const objectives = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v : (v ?? "").split(/\r?\n/)).map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(240, "Keep each objective under 240 characters.")).max(10, "Ten objectives at most."));

export const moduleInputSchema = z.object({
  title: z.string().trim().min(2, "Give the module a title.").max(120),
  description: optText(1000),
  objectives,
  completion: optText(300),
});
export type ModuleInput = z.input<typeof moduleInputSchema>;

export const lessonInputSchema = z
  .object({
    title: z.string().trim().min(2, "Give the lesson a title.").max(160),
    type: z.enum(LESSON_TYPES),
    contentMd: optText(100_000),
    videoUrl: z
      .union([z.string().trim().url("Video URL must be a full link.").max(2000).refine((v) => /^https:\/\//i.test(v), "Use an https:// link."), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    minutes: z
      .union([z.coerce.number().int().min(0).max(600), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === "" || v == null || v === 0 ? null : v)),
    xpReward: xpField(1000, 50),
    isPreview: bool.default(false),
    isFinal: bool.default(false),
    moduleId: z.string().optional(),
  })
  .refine((l) => !l.isFinal || l.type === "QUIZ", { message: "The final assessment must be a knowledge check (QUIZ).", path: ["isFinal"] });
export type LessonInput = z.input<typeof lessonInputSchema>;

export const quizInputSchema = z.object({
  passScore: z.coerce.number().int().min(1).max(100).default(70),
  questions: z
    .array(
      z
        .object({
          prompt: z.string().trim().min(3, "Every question needs a prompt.").max(1000),
          options: z
            .array(z.string().trim().min(1, "Options cannot be empty.").max(300))
            .min(2, "Each question needs 2 to 6 options.")
            .max(6, "Each question needs 2 to 6 options."),
          correctIndex: z.coerce.number().int().min(0),
          explanation: optText(2000),
        })
        .refine((q) => q.correctIndex < q.options.length, { message: "The correct answer must be one of the options.", path: ["correctIndex"] })
    )
    .min(1, "Add at least one question.")
    .max(50),
});
export type QuizInput = z.input<typeof quizInputSchema>;

export const resourceInputSchema = z.object({
  title: z.string().trim().min(2, "Give the resource a title.").max(120),
  url: urlOrPath,
  kind: z.enum(RESOURCE_KINDS).default("link"),
});
export type ResourceInput = z.input<typeof resourceInputSchema>;

export const instructorInputSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(80),
  headline: optText(160),
  bio: z.string().trim().min(10, "Write at least a sentence of bio.").max(4000),
  avatar: optUrlOrPath,
});
export type InstructorInput = z.input<typeof instructorInputSchema>;

// ─────────────────────────────────────────────────────────── helpers

/** Swap an item with its neighbour after normalising the order to 0..n-1. */
function reorder<T extends { id: string }>(items: T[], id: string, dir: "up" | "down"): { id: string; sortOrder: number }[] {
  const ids = items.map((i) => i.id);
  const at = ids.indexOf(id);
  if (at === -1) throw new AuthoringError("Not found.");
  const to = dir === "up" ? at - 1 : at + 1;
  if (to >= 0 && to < ids.length) [ids[at], ids[to]] = [ids[to], ids[at]];
  return ids.map((x, i) => ({ id: x, sortOrder: i }));
}

function friendly(e: unknown): never {
  if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
    throw new AuthoringError("That slug is already taken.");
  }
  throw e;
}

// ─────────────────────────────────────────────────────────── service

export class CourseAuthoringService {
  private audit: AuditService;

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  private async log(actor: AuthoringActor, action: string, targetType: string, targetId: string, meta?: Prisma.InputJsonValue) {
    await this.audit.log({ actorId: actor.id, action, targetType, targetId, meta });
  }

  private async courseOfModule(moduleId: string) {
    const m = await this.db.courseModule.findUnique({ where: { id: moduleId }, select: { id: true, courseId: true } });
    if (!m) throw new AuthoringError("Module not found.");
    return m;
  }

  private async lessonWithCourse(lessonId: string) {
    const l = await this.db.lesson.findUnique({ where: { id: lessonId }, include: { module: { select: { id: true, courseId: true } } } });
    if (!l) throw new AuthoringError("Lesson not found.");
    return l;
  }

  /**
   * After an edit that can finish members' programmes (a final marked, a
   * lesson or module removed, publishing), complete and certify everyone who
   * now qualifies. Fail-soft: the edit stands either way, and a member is
   * settled again when they next open the programme.
   */
  private async settleMembers(courseId: string) {
    try {
      await new LmsService(this.db).reconcileCourse(courseId);
    } catch {
      // The edit is saved; nothing here may undo it.
    }
  }

  private async assertInstructor(id: string | null) {
    if (id && !(await this.db.instructor.findUnique({ where: { id }, select: { id: true } }))) {
      throw new AuthoringError("Choose an instructor from the list.");
    }
  }

  // ── courses

  /** New programmes always start as DRAFT. */
  async createCourse(actor: AuthoringActor, input: CourseInput) {
    assertCan(actor, "courses.author");
    const d = courseInputSchema.parse(input);
    await this.assertInstructor(d.instructorId);
    const max = await this.db.course.aggregate({ _max: { sortOrder: true } });
    const course = await this.db.course
      .create({ data: { ...d, status: "DRAFT", sortOrder: (max._max.sortOrder ?? -1) + 1 } })
      .catch(friendly);
    await this.log(actor, "course.create", "Course", course.id, { slug: course.slug });
    return course;
  }

  async updateCourse(actor: AuthoringActor, courseId: string, input: CourseInput) {
    assertCan(actor, "courses.author");
    const d = courseInputSchema.parse(input);
    await this.assertInstructor(d.instructorId);
    const course = await this.db.course.update({ where: { id: courseId }, data: d }).catch(friendly);
    await this.log(actor, "course.update", "Course", course.id, { slug: course.slug });
    return course;
  }

  /** Why a programme cannot be published yet; empty when it can. */
  async publishProblems(courseId: string): Promise<string[]> {
    const lessons = await this.db.lesson.findMany({
      where: { module: { courseId } },
      select: { title: true, type: true, videoUrl: true, isFinal: true, quiz: { select: { _count: { select: { questions: true } } } } },
    });
    const problems: string[] = [];
    if (lessons.length === 0) problems.push("Add at least one lesson.");
    for (const l of lessons) {
      if (l.type === "QUIZ" && !(l.quiz && l.quiz._count.questions > 0)) problems.push(`“${l.title}” is a knowledge check with no questions.`);
      if (l.type === "VIDEO" && !l.videoUrl) problems.push(`“${l.title}” is a video lesson with no video URL.`);
    }
    if (lessons.filter((l) => l.isFinal).length > 1) problems.push("Only one lesson can be the final assessment.");
    return problems;
  }

  async publish(actor: AuthoringActor, courseId: string) {
    assertCan(actor, "courses.publish");
    const problems = await this.publishProblems(courseId);
    if (problems.length) throw new PublishBlockedError(problems.join(" "));
    const course = await this.db.course.update({ where: { id: courseId }, data: { status: "PUBLISHED" } });
    await this.log(actor, "course.publish", "Course", course.id, { slug: course.slug });
    await this.settleMembers(course.id);
    return course;
  }

  /** Back to DRAFT: hidden from members (their progress and certificates are kept). */
  async unpublish(actor: AuthoringActor, courseId: string) {
    assertCan(actor, "courses.publish");
    const course = await this.db.course.update({ where: { id: courseId }, data: { status: "DRAFT" } });
    await this.log(actor, "course.unpublish", "Course", course.id, { slug: course.slug });
    return course;
  }

  /** Retire a programme. The way to "delete" a programme members have worked in. */
  async archive(actor: AuthoringActor, courseId: string) {
    assertCan(actor, "courses.publish");
    const course = await this.db.course.update({ where: { id: courseId }, data: { status: "ARCHIVED" } });
    await this.log(actor, "course.archive", "Course", course.id, { slug: course.slug });
    return course;
  }

  // ── modules

  async addModule(actor: AuthoringActor, courseId: string, input: ModuleInput) {
    assertCan(actor, "courses.author");
    const d = moduleInputSchema.parse(input);
    const max = await this.db.courseModule.aggregate({ where: { courseId }, _max: { sortOrder: true } });
    const m = await this.db.courseModule.create({
      data: { courseId, title: d.title, description: d.description, objectives: d.objectives, completion: d.completion, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
    await this.log(actor, "module.create", "CourseModule", m.id, { courseId, title: m.title });
    return m;
  }

  async updateModule(actor: AuthoringActor, moduleId: string, input: ModuleInput) {
    assertCan(actor, "courses.author");
    const d = moduleInputSchema.parse(input);
    const m = await this.db.courseModule.update({
      where: { id: moduleId },
      data: { title: d.title, description: d.description, objectives: d.objectives, completion: d.completion },
    });
    await this.log(actor, "module.update", "CourseModule", m.id, { courseId: m.courseId, title: m.title });
    return m;
  }

  async moveModule(actor: AuthoringActor, moduleId: string, dir: "up" | "down") {
    assertCan(actor, "courses.author");
    const { courseId } = await this.courseOfModule(moduleId);
    const all = await this.db.courseModule.findMany({ where: { courseId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
    const order = reorder(all, moduleId, dir);
    await this.db.$transaction(order.map((o) => this.db.courseModule.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } })));
    await this.log(actor, "module.move", "CourseModule", moduleId, { courseId, dir });
  }

  async deleteModule(actor: AuthoringActor, moduleId: string) {
    assertCan(actor, "courses.author");
    const { courseId } = await this.courseOfModule(moduleId);
    const withProgress = await this.db.lessonProgress.count({ where: { lesson: { moduleId } } });
    if (withProgress > 0) {
      throw new LessonHasProgressError("Members have progress in this module, so it cannot be deleted. Archive the program instead.");
    }
    await this.db.courseModule.delete({ where: { id: moduleId } });
    await this.log(actor, "module.delete", "CourseModule", moduleId, { courseId });
    await this.settleMembers(courseId);
  }

  // ── lessons

  private async clearOtherFinals(courseId: string, keepLessonId: string) {
    await this.db.lesson.updateMany({ where: { module: { courseId }, isFinal: true, id: { not: keepLessonId } }, data: { isFinal: false } });
  }

  async addLesson(actor: AuthoringActor, moduleId: string, input: LessonInput) {
    assertCan(actor, "courses.author");
    const d = lessonInputSchema.parse(input);
    const { courseId } = await this.courseOfModule(moduleId);
    const max = await this.db.lesson.aggregate({ where: { moduleId }, _max: { sortOrder: true } });
    const lesson = await this.db.lesson.create({
      data: {
        moduleId,
        title: d.title,
        type: d.type,
        contentMd: d.contentMd,
        videoUrl: d.videoUrl,
        durationSec: d.minutes ? d.minutes * 60 : null,
        xpReward: d.xpReward,
        isPreview: d.isPreview,
        isFinal: d.isFinal,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    if (d.isFinal) await this.clearOtherFinals(courseId, lesson.id);
    await this.log(actor, "lesson.create", "Lesson", lesson.id, { courseId, moduleId, title: lesson.title });
    return lesson;
  }

  async updateLesson(actor: AuthoringActor, lessonId: string, input: LessonInput) {
    assertCan(actor, "courses.author");
    const d = lessonInputSchema.parse(input);
    const current = await this.lessonWithCourse(lessonId);
    const courseId = current.module.courseId;
    let moduleId = current.moduleId;
    let sortOrder = current.sortOrder;
    if (d.moduleId && d.moduleId !== current.moduleId) {
      const target = await this.courseOfModule(d.moduleId);
      if (target.courseId !== courseId) throw new AuthoringError("A lesson can only move to a module of the same program.");
      const max = await this.db.lesson.aggregate({ where: { moduleId: target.id }, _max: { sortOrder: true } });
      moduleId = target.id;
      sortOrder = (max._max.sortOrder ?? -1) + 1;
    }
    const lesson = await this.db.lesson.update({
      where: { id: lessonId },
      data: {
        moduleId,
        sortOrder,
        title: d.title,
        type: d.type,
        contentMd: d.contentMd,
        videoUrl: d.videoUrl,
        durationSec: d.minutes ? d.minutes * 60 : null,
        xpReward: d.xpReward,
        isPreview: d.isPreview,
        isFinal: d.isFinal,
      },
    });
    if (d.isFinal) await this.clearOtherFinals(courseId, lesson.id);
    await this.log(actor, "lesson.update", "Lesson", lesson.id, { courseId, moduleId, title: lesson.title });
    // Members who already passed this check may now hold the final.
    if (d.isFinal && !current.isFinal) await this.settleMembers(courseId);
    return lesson;
  }

  async moveLesson(actor: AuthoringActor, lessonId: string, dir: "up" | "down") {
    assertCan(actor, "courses.author");
    const l = await this.lessonWithCourse(lessonId);
    const all = await this.db.lesson.findMany({ where: { moduleId: l.moduleId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
    const order = reorder(all, lessonId, dir);
    await this.db.$transaction(order.map((o) => this.db.lesson.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } })));
    await this.log(actor, "lesson.move", "Lesson", lessonId, { courseId: l.module.courseId, dir });
  }

  /** Blocked when any member has progress on the lesson: archive the program instead. */
  async deleteLesson(actor: AuthoringActor, lessonId: string) {
    assertCan(actor, "courses.author");
    const l = await this.lessonWithCourse(lessonId);
    const progress = await this.db.lessonProgress.count({ where: { lessonId } });
    if (progress > 0) {
      throw new LessonHasProgressError("Members have progress on this lesson, so it cannot be deleted. Archive the program instead.");
    }
    await this.db.lesson.delete({ where: { id: lessonId } });
    await this.log(actor, "lesson.delete", "Lesson", lessonId, { courseId: l.module.courseId, title: l.title });
    // It may have been the only lesson some members had left.
    await this.settleMembers(l.module.courseId);
  }

  // ── quizzes

  /** Creates or replaces a lesson's knowledge check. Past attempts are kept. */
  async saveQuiz(actor: AuthoringActor, lessonId: string, input: QuizInput) {
    assertCan(actor, "courses.author");
    const d = quizInputSchema.parse(input);
    const l = await this.lessonWithCourse(lessonId);
    const quiz = await this.db.$transaction(async (tx) => {
      const q = await tx.quiz.upsert({ where: { lessonId }, update: { passScore: d.passScore }, create: { lessonId, passScore: d.passScore } });
      await tx.quizQuestion.deleteMany({ where: { quizId: q.id } });
      await tx.quizQuestion.createMany({
        data: d.questions.map((x, i) => ({
          quizId: q.id,
          sortOrder: i,
          prompt: x.prompt,
          options: x.options,
          correctIndex: x.correctIndex,
          explanation: x.explanation,
        })),
      });
      return q;
    });
    await this.log(actor, "quiz.save", "Quiz", quiz.id, { courseId: l.module.courseId, lessonId, questions: d.questions.length, passScore: d.passScore });
    return quiz;
  }

  // ── resources

  async addResource(actor: AuthoringActor, target: { courseId?: string; lessonId?: string }, input: ResourceInput) {
    assertCan(actor, "courses.author");
    const d = resourceInputSchema.parse(input);
    if (!!target.courseId === !!target.lessonId) throw new AuthoringError("Attach the resource to a program or to a lesson.");
    const r = await this.db.resource.create({ data: { ...d, courseId: target.courseId ?? null, lessonId: target.lessonId ?? null } });
    await this.log(actor, "resource.create", "Resource", r.id, { ...target, title: r.title });
    return r;
  }

  async deleteResource(actor: AuthoringActor, resourceId: string) {
    assertCan(actor, "courses.author");
    const r = await this.db.resource.delete({ where: { id: resourceId } });
    await this.log(actor, "resource.delete", "Resource", r.id, { title: r.title });
  }

  // ── instructors
  //
  // Profiles are public pages, and a profile's link to an account decides who
  // may edit its programmes, so all of this needs courses.manage (DR-34).

  async createInstructor(actor: AuthoringActor, input: InstructorInput) {
    assertCan(actor, "courses.manage");
    const d = instructorInputSchema.parse(input);
    const i = await this.db.instructor.create({ data: d }).catch(friendly);
    await this.log(actor, "instructor.create", "Instructor", i.id, { slug: i.slug });
    return i;
  }

  async updateInstructor(actor: AuthoringActor, id: string, input: InstructorInput) {
    assertCan(actor, "courses.manage");
    const d = instructorInputSchema.parse(input);
    const i = await this.db.instructor.update({ where: { id }, data: d }).catch(friendly);
    await this.log(actor, "instructor.update", "Instructor", i.id, { slug: i.slug });
    return i;
  }

  /** Programmes they taught keep running; they just lose the instructor link. */
  async deleteInstructor(actor: AuthoringActor, id: string) {
    assertCan(actor, "courses.manage");
    const i = await this.db.instructor.delete({ where: { id } });
    await this.log(actor, "instructor.delete", "Instructor", i.id, i.userId ? { slug: i.slug, userId: i.userId } : { slug: i.slug });
  }

  /**
   * The member an email address or a username names, exactly: no partial
   * match, so a link can never land on a near miss. Null when nobody does.
   */
  async findMemberForLink(actor: AuthoringActor, emailOrUsername: string) {
    assertCan(actor, "courses.manage");
    const q = emailOrUsername.trim().toLowerCase();
    if (!q) return null;
    const where = q.includes("@") && !q.startsWith("@") ? { email: q } : { profile: { is: { username: q.replace(/^@/, "") } } };
    return this.db.user.findFirst({
      where,
      select: { id: true, email: true, role: true, profile: { select: { username: true, displayName: true } } },
    });
  }

  /**
   * Link an instructor profile to the account of the person who teaches as
   * it, or unlink it (`userId` null). The link is what lets an instructor edit
   * the profile's programmes, so it is never guessed: nothing links a profile
   * but this, called by someone with courses.manage. One profile per member
   * (Instructor.userId is unique). Audited with who was linked before and after.
   */
  async linkInstructorUser(actor: AuthoringActor, instructorId: string, userId: string | null) {
    assertCan(actor, "courses.manage");
    if (!(await this.db.instructor.findUnique({ where: { id: instructorId }, select: { id: true } }))) throw new AuthoringError("Instructor not found.");
    if (userId) {
      if (!(await this.db.user.findUnique({ where: { id: userId }, select: { id: true } }))) throw new AuthoringError("No member has that account.");
      const other = await this.db.instructor.findUnique({ where: { userId }, select: { id: true, name: true } });
      if (other && other.id !== instructorId) {
        throw new AuthoringError(`That member is already linked to the instructor profile “${other.name}”. Unlink them there first.`);
      }
    }
    const usernameOf = async (tx: Prisma.TransactionClient, id: string | null) =>
      id ? ((await tx.profile.findUnique({ where: { userId: id }, select: { username: true } }))?.username ?? null) : null;
    return this.db
      .$transaction(async (tx) => {
        // Locked, so two links of one profile at once audit what each really replaced.
        const [row] = await tx.$queryRaw<{ userId: string | null }[]>`SELECT "userId" FROM "Instructor" WHERE "id" = ${instructorId} FOR UPDATE`;
        if (!row) throw new AuthoringError("Instructor not found."); // deleted since the check above
        if (row.userId === userId) return tx.instructor.findUniqueOrThrow({ where: { id: instructorId } });
        const i = await tx.instructor.update({ where: { id: instructorId }, data: { userId } });
        await this.audit.log(
          {
            actorId: actor.id,
            action: userId ? "instructor.link" : "instructor.unlink",
            targetType: "Instructor",
            targetId: i.id,
            meta: {
              slug: i.slug,
              userId: { from: row.userId, to: userId },
              username: { from: await usernameOf(tx, row.userId), to: await usernameOf(tx, userId) },
            },
          },
          tx
        );
        return i;
      })
      .catch((e: unknown) => {
        // The unique index decides a race the check above could not see.
        if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
          throw new AuthoringError("That member is already linked to another instructor profile. Unlink them there first.");
        }
        throw e;
      });
  }

  // ── reviews

  /** Course staff and community moderators can both hide a review. */
  async setReviewHidden(actor: AuthoringActor, reviewId: string, hidden: boolean) {
    if (!canModerateReviews(actor)) throw new ForbiddenError();
    const r = await this.db.courseReview.update({ where: { id: reviewId }, data: { hidden } });
    await this.log(actor, hidden ? "review.hide" : "review.unhide", "CourseReview", r.id, { courseId: r.courseId });
    return r;
  }
}

export const authoring = new CourseAuthoringService();
