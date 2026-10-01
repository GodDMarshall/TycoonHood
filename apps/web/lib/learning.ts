/**
 * What the learning screens show, computed once, from the database.
 * Gating comes from @tycoonhood/core so the screens and the server enforce
 * the same order. Durations are honest: a video's recorded length, or a
 * reading estimate from the lesson's own word count (220 words a minute).
 */
import "server-only";
import { prisma } from "@tycoonhood/db";
import { gateLessons, nextLesson, type Gate } from "@tycoonhood/core";

export const LESSON_TYPE = { VIDEO: "Video", READING: "Reading", QUIZ: "Knowledge check", ASSIGNMENT: "Assignment" } as const;

const WORDS_PER_MINUTE = 220;

export function lessonMinutes(l: { durationSec: number | null; contentMd: string | null }) {
  if (l.durationSec) return Math.max(1, Math.round(l.durationSec / 60));
  const words = (l.contentMd ?? "").split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) : null;
}

const lessonSelect = (userId: string) =>
  ({
    id: true,
    title: true,
    type: true,
    sortOrder: true,
    durationSec: true,
    contentMd: true,
    isPreview: true,
    quiz: { select: { id: true } },
    progress: { where: { userId }, select: { completedAt: true } },
  }) as const;

/** Every published program with this member's progress and next step. */
export async function catalog(userId: string) {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    include: {
      modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" }, select: lessonSelect(userId) } } },
      enrollments: { where: { userId } },
      certificates: { where: { userId } },
    },
  });
  return courses.map((c) => {
    const lessons = c.modules.flatMap((m) =>
      m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleSortOrder: m.sortOrder, completed: !!l.progress[0]?.completedAt }))
    );
    const done = lessons.filter((l) => l.completed).length;
    const minutes = lessons.reduce((n, l) => n + (lessonMinutes(l) ?? 0), 0);
    const next = nextLesson(lessons);
    const enrollment = c.enrollments[0] ?? null;
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      description: c.description,
      pillar: c.pillar,
      coverImage: c.coverImage,
      instructorName: c.instructorName,
      modules: c.modules.length,
      lessons: lessons.length,
      done,
      pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
      minutes,
      next: next ? { id: next.id, title: next.title, moduleTitle: next.moduleTitle } : null,
      enrollment,
      certificate: c.certificates[0] ?? null,
    };
  });
}

export type CatalogCourse = Awaited<ReturnType<typeof catalog>>[number];

/** Where to pick up: the enrolled, unfinished program touched most recently. */
export async function continueLearning(userId: string) {
  const courses = (await catalog(userId)).filter((c) => c.enrollment && c.next);
  if (courses.length === 0) return null;
  const touched = await prisma.lessonProgress.findMany({
    where: { userId, lesson: { module: { courseId: { in: courses.map((c) => c.id) } } } },
    orderBy: { updatedAt: "desc" },
    take: 1,
    select: { lesson: { select: { module: { select: { courseId: true } } } } },
  });
  const lastId = touched[0]?.lesson.module.courseId;
  return courses.find((c) => c.id === lastId) ?? courses.sort((a, b) => +b.enrollment!.enrolledAt - +a.enrollment!.enrolledAt)[0];
}

/** One program, every lesson gated for this member. */
export async function courseDetail(userId: string, slug: string) {
  const c = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" }, select: lessonSelect(userId) } } },
      enrollments: { where: { userId } },
      certificates: { where: { userId } },
      channels: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, kind: true } },
    },
  });
  if (!c || c.status !== "PUBLISHED") return null;
  const flat = c.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title, moduleSortOrder: m.sortOrder, completed: !!l.progress[0]?.completedAt }))
  );
  const gates = gateLessons(flat);
  const gate = (id: string): Gate => gates.get(id) ?? { state: "locked" };
  const done = flat.filter((l) => l.completed).length;
  const next = nextLesson(flat);
  return {
    course: c,
    enrollment: c.enrollments[0] ?? null,
    certificate: c.certificates[0] ?? null,
    channels: c.channels,
    lessons: flat.map((l) => ({ ...l, minutes: lessonMinutes(l), gate: gate(l.id) })),
    modules: c.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      lessons: flat.filter((l) => l.moduleId === m.id).map((l) => ({ ...l, minutes: lessonMinutes(l), gate: gate(l.id) })),
    })),
    done,
    total: flat.length,
    pct: flat.length ? Math.round((done / flat.length) * 100) : 0,
    minutes: flat.reduce((n, l) => n + (lessonMinutes(l) ?? 0), 0),
    next: next ? { id: next.id, title: next.title } : null,
  };
}

export type CourseDetail = NonNullable<Awaited<ReturnType<typeof courseDetail>>>;

/** Lessons whose title or text mention the query, across published programs. */
export async function searchLessons(userId: string, q: string) {
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return [];
  const rows = await prisma.lesson.findMany({
    where: {
      module: { course: { status: "PUBLISHED" } },
      OR: [{ title: { contains: term, mode: "insensitive" } }, { contentMd: { contains: term, mode: "insensitive" } }],
    },
    take: 30,
    select: {
      id: true,
      title: true,
      type: true,
      contentMd: true,
      module: { select: { title: true, course: { select: { slug: true, title: true } } } },
    },
  });
  const details = new Map<string, CourseDetail | null>();
  const out = [];
  for (const r of rows) {
    const slug = r.module.course.slug;
    if (!details.has(slug)) details.set(slug, await courseDetail(userId, slug));
    const d = details.get(slug);
    const l = d?.lessons.find((x) => x.id === r.id);
    // A snippet around the first match in the text, if the title did not match.
    let snippet: string | null = null;
    const text = (r.contentMd ?? "").replace(/[#*_>`[\]()]/g, "");
    const at = text.toLowerCase().indexOf(term.toLowerCase());
    if (at >= 0 && !r.title.toLowerCase().includes(term.toLowerCase())) {
      snippet = (at > 60 ? "…" : "") + text.slice(Math.max(0, at - 60), at + 100).replace(/\s+/g, " ").trim() + "…";
    }
    out.push({
      id: r.id,
      title: r.title,
      type: r.type,
      module: r.module.title,
      course: r.module.course,
      enrolled: !!d?.enrollment,
      state: l?.gate.state ?? "locked",
      snippet,
    });
  }
  return out;
}
