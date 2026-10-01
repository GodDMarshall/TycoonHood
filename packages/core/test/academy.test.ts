/**
 * The academy rebuild: lessons in order, the daily standard, and the
 * community's access, limits and moderation. Community tests post only in
 * throwaway channels they create and delete, never in the house's.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { LmsService, LessonLockedError, NotEnrolledError, QuizRequiredError } from "../src/lms/lms";
import { gateLessons, nextLesson } from "../src/lms/gating";
import { StandardService, StandardError, MAX_OWN_STANDARD_ITEMS } from "../src/standard/standard";
import { CommunityService, CommunityError, cleanUrl, MESSAGE_MAX, type Viewer } from "../src/community/community";
import { countEvidence } from "../src/rules/counters";
import { createTestUser, uid } from "./helpers";

const lms = new LmsService(prisma);
const standard = new StandardService(prisma);
const community = new CommunityService(prisma);

async function warrior() {
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: "warrior" },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { orderBy: { sortOrder: "asc" }, include: { quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } } } } },
      },
    },
  });
  return { course, lessons: course.modules.flatMap((m) => m.lessons) };
}

const member = (u: { id: string }): Viewer => ({ id: u.id, role: "MEMBER" });
async function createAdmin() {
  const u = await createTestUser();
  await prisma.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
  return { id: u.id, role: "ADMIN" as const };
}

const channels: string[] = [];
async function testChannel(opts: { adminOnly?: boolean; slowModeSec?: number; kind?: "CHAT" | "WINS" | "QUESTIONS"; courseId?: string } = {}) {
  const ch = await prisma.channel.create({
    data: {
      slug: `test-${uid().slice(0, 8)}`,
      name: "Test",
      kind: opts.kind ?? "CHAT",
      adminOnly: opts.adminOnly ?? false,
      slowModeSec: opts.slowModeSec ?? 0,
      courseId: opts.courseId ?? null,
    },
  });
  channels.push(ch.id);
  return ch;
}

afterAll(async () => {
  await prisma.channel.deleteMany({ where: { id: { in: channels } } });
});

// ─────────────────────────────────────────────────────────── gating

describe("Lesson gating — the pure rule", () => {
  const L = (id: string, mod: number, ord: number, completed = false) => ({ id, title: id.toUpperCase(), sortOrder: ord, moduleSortOrder: mod, completed });

  it("opens exactly one next lesson and locks the rest behind it", () => {
    const g = gateLessons([L("c", 1, 0), L("a", 0, 0, true), L("b", 0, 1), L("d", 1, 1)]);
    expect(g.get("a")?.state).toBe("done");
    expect(g.get("b")?.state).toBe("open");
    expect(g.get("c")).toEqual({ state: "locked", blockedBy: { id: "b", title: "B" } });
    expect(g.get("d")?.state).toBe("locked");
  });

  it("keeps out-of-order completions done, and the first gap is the next lesson", () => {
    const lessons = [L("a", 0, 0), L("b", 0, 1, true), L("c", 0, 2)];
    const g = gateLessons(lessons);
    expect(g.get("a")?.state).toBe("open");
    expect(g.get("b")?.state).toBe("done");
    expect(g.get("c")?.state).toBe("locked");
    expect(nextLesson(lessons)?.id).toBe("a");
    expect(nextLesson(lessons.map((l) => ({ ...l, completed: true })))).toBeNull();
  });
});

describe("Lesson gating — enforced by the server", () => {
  it("refuses a lesson behind an unfinished one, then opens it", async () => {
    const user = await createTestUser();
    const { lessons } = await warrior();
    await lms.enroll(user.id, "warrior");
    await expect(lms.completeLesson(user.id, lessons[1].id)).rejects.toBeInstanceOf(LessonLockedError);
    await expect(lms.completeLesson(user.id, lessons[1].id)).rejects.toThrow(lessons[0].title);
    await lms.completeLesson(user.id, lessons[0].id);
    const r = await lms.completeLesson(user.id, lessons[1].id);
    expect(r.firstCompletion).toBe(true);
  });

  it("completes a knowledge-check lesson only by passing it", async () => {
    const user = await createTestUser();
    const { lessons } = await warrior();
    await lms.enroll(user.id, "warrior");
    const quizLesson = lessons.find((l) => l.quiz)!;
    for (const l of lessons.slice(0, lessons.indexOf(quizLesson))) await lms.completeLesson(user.id, l.id);
    await expect(lms.completeLesson(user.id, quizLesson.id)).rejects.toBeInstanceOf(QuizRequiredError);
    const pass = await lms.submitQuiz(user.id, quizLesson.quiz!.id, quizLesson.quiz!.questions.map((q) => q.correctIndex));
    expect(pass.lesson?.firstCompletion).toBe(true);
  });

  it("does not score a knowledge check that is still locked, or one you are not enrolled for", async () => {
    const user = await createTestUser();
    const { lessons } = await warrior();
    const quizLesson = lessons.find((l) => l.quiz)!;
    const answers = quizLesson.quiz!.questions.map((q) => q.correctIndex);
    await expect(lms.submitQuiz(user.id, quizLesson.quiz!.id, answers)).rejects.toBeInstanceOf(NotEnrolledError);
    await lms.enroll(user.id, "warrior");
    await expect(lms.submitQuiz(user.id, quizLesson.quiz!.id, answers)).rejects.toBeInstanceOf(LessonLockedError);
    expect(await prisma.quizAttempt.count({ where: { userId: user.id } })).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────── the daily standard

describe("The daily standard", () => {
  const day = new Date("2031-03-04T12:00:00Z");

  it("lists the house standard, ticks by hand, and refuses to hand-tick an automatic item", async () => {
    const user = await createTestUser();
    const t0 = await standard.today(user.id, day);
    const house = await prisma.standardItem.count({ where: { userId: null, active: true } });
    expect(t0.total).toBe(house);
    expect(t0.ticked).toBe(0);
    const manual = t0.items.find((i) => !i.auto)!;
    const auto = t0.items.find((i) => i.auto);
    const t1 = await standard.tick(user.id, manual.id, day);
    expect(t1.items.find((i) => i.id === manual.id)?.ticked).toBe(true);
    // Idempotent within the day.
    expect((await standard.tick(user.id, manual.id, day)).ticked).toBe(1);
    if (auto) await expect(standard.tick(user.id, auto.id, day)).rejects.toBeInstanceOf(StandardError);
  });

  it("showing up: the first tick of the day completes the check-in mission once", async () => {
    const user = await createTestUser();
    const mission = await prisma.mission.findUniqueOrThrow({ where: { slug: "daily-check-in" } });
    const items = (await standard.today(user.id, day)).items.filter((i) => !i.auto);
    await standard.tick(user.id, items[0].id, day);
    await standard.tick(user.id, items[1].id, day);
    expect(await prisma.missionCompletion.count({ where: { userId: user.id, missionId: mission.id } })).toBe(1);
  });

  it("a completed lesson ticks Study; meeting every item records the day and advances the streak", async () => {
    const user = await createTestUser();
    const { lessons } = await warrior();
    await lms.enroll(user.id, "warrior");
    const now = new Date();
    await lms.completeLesson(user.id, lessons[0].id);
    const today = await standard.today(user.id, now);
    const study = today.items.find((i) => i.auto);
    if (study) expect(study.ticked).toBe(true);
    for (const i of today.items.filter((i) => !i.auto)) await standard.tick(user.id, i.id, now);
    const after = await standard.today(user.id, now);
    expect(after.met).toBe(true);
    expect(await prisma.standardDay.count({ where: { userId: user.id } })).toBe(1);
    expect((await prisma.streak.findUniqueOrThrow({ where: { userId: user.id } })).current).toBe(1);
    const hist = await standard.history(user.id, 7, now);
    expect(hist.days).toHaveLength(7);
    expect(hist.days[6]).toMatchObject({ day: after.day, met: true });
    expect(hist.metDays).toBe(1);

    // Unticking unmeets the day; the streak is not taken back.
    const manual = after.items.find((i) => !i.auto)!;
    const back = await standard.untick(user.id, manual.id, now);
    expect(back.met).toBe(false);
    expect(await prisma.standardDay.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.streak.findUniqueOrThrow({ where: { userId: user.id } })).current).toBe(1);
  });

  it("a member holds a few items of their own, and only their own", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    for (let i = 0; i < MAX_OWN_STANDARD_ITEMS; i++) await standard.addOwn(user.id, { title: `Own item ${i}` });
    await expect(standard.addOwn(user.id, { title: "One too many" })).rejects.toBeInstanceOf(StandardError);
    await expect(standard.addOwn(user.id, { title: "x" })).rejects.toBeInstanceOf(StandardError);
    const t = await standard.today(user.id, day);
    const own = t.items.filter((i) => i.own);
    expect(own).toHaveLength(MAX_OWN_STANDARD_ITEMS);
    // House items come first; a member's additions never reorder them.
    expect(t.items.slice(0, t.total - own.length).every((i) => !i.own)).toBe(true);
    await expect(standard.tick(other.id, own[0].id, day)).rejects.toBeInstanceOf(StandardError);
    await expect(standard.removeOwn(other.id, own[0].id)).rejects.toBeInstanceOf(StandardError);
    await standard.removeOwn(user.id, own[0].id);
    expect((await standard.today(user.id, day)).items.filter((i) => i.own)).toHaveLength(MAX_OWN_STANDARD_ITEMS - 1);
  });
});

// ─────────────────────────────────────────────────────────── community

describe("Community — who can read", () => {
  it("house channels are open to members; a program's channels need enrollment", async () => {
    const user = await createTestUser();
    const v = member(user);
    expect(await community.channel(v, "general")).not.toBeNull();
    expect(await community.channel(v, "warrior-discussion")).toBeNull();
    const before = await community.channelsFor(v, new Date());
    expect(before.some((c) => c.slug === "warrior-discussion")).toBe(false);
    await lms.enroll(user.id, "warrior");
    expect(await community.channel(v, "warrior-discussion")).not.toBeNull();
    const after = await community.channelsFor(v, new Date());
    expect(after.some((c) => c.slug === "warrior-discussion")).toBe(true);
    // House channels list before program channels.
    expect(after.findIndex((c) => !c.course)).toBeLessThan(after.findIndex((c) => !!c.course));
  });

  it("an archived channel disappears for members", async () => {
    const admin = await createAdmin();
    const user = await createTestUser();
    const ch = await testChannel();
    await community.setArchived(admin, ch.id, true);
    expect(await community.channel(member(user), ch.slug)).toBeNull();
    expect(await community.channel(admin, ch.slug)).not.toBeNull();
  });
});

describe("Community — posting", () => {
  it("validates the body and keeps staff-only channels staff-only", async () => {
    const admin = await createAdmin();
    const user = await createTestUser();
    const open = await testChannel();
    const staffOnly = await testChannel({ adminOnly: true });
    await expect(community.post(member(user), open.slug, { body: "   " })).rejects.toBeInstanceOf(CommunityError);
    await expect(community.post(member(user), open.slug, { body: "x".repeat(MESSAGE_MAX + 1) })).rejects.toBeInstanceOf(CommunityError);
    const m = await community.post(member(user), open.slug, { body: "  First real message  " });
    expect(m.body).toBe("First real message");
    expect(m.mine).toBe(true);
    await expect(community.post(member(user), staffOnly.slug, { body: "Hello" })).rejects.toThrow(/staff/i);
    const a = await community.post(admin, staffOnly.slug, { body: "House news." });
    expect(a.author.staff).toBe(true);
  });

  it("slow mode makes a member wait; staff are exempt", async () => {
    const admin = await createAdmin();
    const user = await createTestUser();
    const ch = await testChannel({ slowModeSec: 30 });
    const t = new Date();
    await community.post(member(user), ch.slug, { body: "one" }, t);
    await expect(community.post(member(user), ch.slug, { body: "two" }, new Date(t.getTime() + 5_000))).rejects.toThrow(/25s/);
    await community.post(member(user), ch.slug, { body: "three" }, new Date(t.getTime() + 31_000));
    await community.post(admin, ch.slug, { body: "a" }, t);
    await community.post(admin, ch.slug, { body: "b" }, new Date(t.getTime() + 1_000));
  });

  it("a muted member can read but not post until the mute lifts", async () => {
    const admin = await createAdmin();
    const user = await createTestUser();
    const ch = await testChannel();
    await community.mute(admin, user.id, new Date(Date.now() + 3_600_000), "cooling off");
    await expect(community.post(member(user), ch.slug, { body: "hi" })).rejects.toThrow(/read but not post/);
    expect(await community.channel(member(user), ch.slug)).not.toBeNull();
    await community.unmute(admin, user.id);
    await community.post(member(user), ch.slug, { body: "hi again" });
    await expect(community.mute(member(user), admin.id, null, null)).rejects.toBeInstanceOf(CommunityError);
  });

  it("wins carry a proof link, and only an http(s) one", async () => {
    const user = await createTestUser();
    const wins = await testChannel({ kind: "WINS" });
    expect(() => cleanUrl("javascript:alert(1)")).toThrow(CommunityError);
    expect(() => cleanUrl("not a url")).toThrow(CommunityError);
    const m = await community.post(member(user), wins.slug, { body: "Closed my first client.", proofUrl: "https://example.com/invoice" });
    expect(m.proofUrl).toBe("https://example.com/invoice");
    // A proof link means nothing outside a wins channel.
    const chat = await testChannel();
    const c = await community.post(member(user), chat.slug, { body: "hi", proofUrl: "https://example.com" });
    expect(c.proofUrl).toBeNull();
  });

  it("a question carries its lesson, and only a lesson of that program", async () => {
    const user = await createTestUser();
    const { course, lessons } = await warrior();
    await lms.enroll(user.id, "warrior");
    const qs = await testChannel({ kind: "QUESTIONS", courseId: course.id });
    const m = await community.post(member(user), qs.slug, { body: "Why the deload week?", lessonId: lessons[1].id });
    expect(m.lesson).toEqual({ id: lessons[1].id, title: lessons[1].title, courseSlug: "warrior" });
    const asked = await community.lessonQuestions(member(user), lessons[1].id);
    expect(asked.some((q) => q.id === m.id)).toBe(true);
    const other = await prisma.lesson.findFirstOrThrow({ where: { module: { course: { slug: { not: "warrior" } } } } });
    await expect(community.post(member(user), qs.slug, { body: "?", lessonId: other.id })).rejects.toBeInstanceOf(CommunityError);
  });

  it("a reply notifies the person replied to, and unread counts follow reading", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const ch = await testChannel();
    const since = new Date(Date.now() - 60_000);
    const first = await community.post(member(a), ch.slug, { body: "Who is training today?" });
    const reply = await community.post(member(b), ch.slug, { body: "Me. Legs.", replyToId: first.id });
    expect(reply.replyTo).toMatchObject({ id: first.id, excerpt: "Who is training today?" });
    const note = await prisma.notification.findFirst({ where: { userId: a.id, type: "COMMUNITY" } });
    expect(note?.title).toMatch(/replied to you/);

    const unread = (await community.channelsFor(member(a), since)).find((c) => c.id === ch.id)!;
    expect(unread.unread).toBe(1);
    await community.markRead(a.id, ch.id);
    expect((await community.channelsFor(member(a), since)).find((c) => c.id === ch.id)!.unread).toBe(0);

    const page = await community.messages(member(a), ch.id);
    expect(page.map((m) => m.id)).toEqual([first.id, reply.id]);
    expect(await community.messages(member(a), ch.id, { after: first.id })).toHaveLength(1);
    expect(await community.messages(member(a), ch.id, { before: reply.id })).toHaveLength(1);
  });
});

describe("Community — moderation", () => {
  it("authors remove their own; others cannot; a removed body is never served", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const ch = await testChannel();
    const m = await community.post(member(a), ch.slug, { body: "regret this" });
    await expect(community.remove(member(b), m.id)).rejects.toBeInstanceOf(CommunityError);
    await community.remove(member(a), m.id);
    const [view] = await community.messages(member(b), ch.id);
    expect(view).toMatchObject({ id: m.id, removed: true, body: null });
  });

  it("reports: not your own, once each; staff removal resolves them", async () => {
    const admin = await createAdmin();
    const a = await createTestUser();
    const b = await createTestUser();
    const ch = await testChannel();
    const m = await community.post(member(a), ch.slug, { body: "spam spam spam" });
    await expect(community.report(member(a), m.id, "my own")).rejects.toBeInstanceOf(CommunityError);
    await community.report(member(b), m.id, "Spam");
    await expect(community.report(member(b), m.id, "Spam again")).rejects.toThrow(/already reported/);
    const open = await community.openReports();
    const mine = open.find((r) => r.messageId === m.id)!;
    expect(mine.reason).toBe("Spam");
    await community.resolveReport(admin, mine.id, "remove");
    const rep = await prisma.messageReport.findUniqueOrThrow({ where: { id: mine.id } });
    expect(rep.resolution).toBe("removed");
    expect((await prisma.message.findUniqueOrThrow({ where: { id: m.id } })).deletedAt).not.toBeNull();
  });

  it("pins are staff-only, notify the author, and are the contribution that counts", async () => {
    const admin = await createAdmin();
    const a = await createTestUser();
    const ch = await testChannel();
    const m = await community.post(member(a), ch.slug, { body: "Here is my full training log for the month." });
    await expect(community.setPinned(member(a), m.id, true)).rejects.toBeInstanceOf(CommunityError);
    expect(await countEvidence(prisma, a.id, { event: "COMMUNITY_CONTRIBUTION" }, new Date())).toBe(0);
    await community.setPinned(admin, m.id, true);
    expect((await community.pinned(member(a), ch.id)).map((p) => p.id)).toEqual([m.id]);
    expect(await prisma.notification.count({ where: { userId: a.id, type: "COMMUNITY", title: { contains: "pinned" } } })).toBe(1);
    expect(await countEvidence(prisma, a.id, { event: "COMMUNITY_CONTRIBUTION" }, new Date())).toBe(1);
    // Volume is not contribution: an unpinned message counts for nothing.
    await community.post(member(a), ch.slug, { body: "another" });
    expect(await countEvidence(prisma, a.id, { event: "COMMUNITY_CONTRIBUTION" }, new Date())).toBe(1);
  });
});
