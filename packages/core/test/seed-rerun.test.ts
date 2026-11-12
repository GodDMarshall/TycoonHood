/**
 * SEEDS ARE SAFE TO RE-RUN ON A LIVE DATABASE (review finding 17).
 *
 * A re-run may add what is missing and put back copy only the seed owns. It
 * must never rewrite what staff can change in the admin: prices, stock, what
 * is live, a challenge's lifecycle and dates, a course's curriculum, status
 * and instructor, wording staff edited, or a member's role.
 *
 * These tests build a database from nothing, run the five deploy seeds the
 * way scripts/vercel-build.sh runs them (separate processes, in order), make
 * the edits staff make through the admin's own services, run the seeds again
 * and compare every row of every table.
 *
 * "Missing" means never made. A mission, size, essay, category or group the
 * seeds made once is staff's from then on, even under another slug or SKU:
 * the seeds record what they made (SiteSetting "seed.created.*") and never
 * make it again (review finding 17, follow-up).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@tycoonhood/db";
import { CatalogService, type ProductKind } from "../src/catalog/catalog";
import { CourseAuthoringService } from "../src/lms/authoring";
import { DiscussionService } from "../src/discussions/discussions";
import { CommunityService } from "../src/community/community";
import { CouponService } from "../src/shop/coupons";
import { LedgerService } from "../src/ledger/ledger";
import { MemberAdminService } from "../src/platform/members";
import { AccountService } from "../src/auth/account";
import {
  createThrowawayDb, migrate, seedAll, mustRun, snapshot, changes,
  DEPLOY_SEEDS, DB_PACKAGE, REPO_ROOT, SEED_ADMIN, type Throwaway,
} from "./throwaway-db";

const SLOW = 180_000;

/** The seeds' record of what they made, for one kind of row. */
async function recorded(db: PrismaClient, kind: string) {
  const row = await db.siteSetting.findUniqueOrThrow({ where: { key: `seed.created.${kind}` } });
  return (row.value as { keys: string[] }).keys;
}

/** Takes `key` off that record, as if the seed files had only now gained it. */
async function forget(db: PrismaClient, kind: string, key: string) {
  const keys = (await recorded(db, kind)).filter((k) => k !== key);
  await db.siteSetting.update({ where: { key: `seed.created.${kind}` }, data: { value: { keys } } });
}

/** What staff do in the admin, through the same services and writes the admin actions use. */
async function editLikeStaff(db: PrismaClient) {
  const admin = await db.user.findUniqueOrThrow({ where: { email: SEED_ADMIN.ADMIN_EMAIL } });
  const staff = { id: admin.id, role: admin.role };
  const warrior = await db.course.findUniqueOrThrow({ where: { slug: "warrior" } });

  // Admin → Products (saveProductAction → catalog.save): new prices, new
  // stock, taken off sale, and one card price removed (THC only now).
  const catalog = new CatalogService(db);
  await catalog.save({
    slug: "warrior-program-access", kind: "COURSE", name: "Warrior Programme, full access",
    description: "Every module of the Warrior programme.", priceThc: 15_000n, priceFiatCents: 2_999_00,
    grantsCourseId: warrior.id, active: false,
  });
  await catalog.save({
    slug: "tycoonhood-training-tee", kind: "PHYSICAL", name: "Training Tee", description: "Heavy cotton tee.",
    priceFiatCents: 1_299_00, costCents: 410_00, inventory: 37, active: false,
  });
  await catalog.save({
    slug: "founders-playbook", kind: "DIGITAL", name: "The Founder's Playbook", description: "The working document.",
    priceThc: 6_000n, priceFiatCents: null, contentMd: "# Rewritten by staff", active: true,
  });
  // Admin → Products, storefront fields (setShopFieldsAction): a category cleared, another changed.
  await db.product.update({ where: { slug: "tycoonhood-training-tee" }, data: { category: null, sellerName: "Tycoonhood Studio" } });
  await db.product.update({ where: { slug: "founders-playbook" }, data: { category: "books" } });

  // Admin → Challenges (setChallengeLifecycleAction).
  await db.challenge.update({ where: { slug: "30-days-of-iron" }, data: { lifecycle: "ACTIVE" } });
  await db.challenge.update({ where: { slug: "launch-week" }, data: { lifecycle: "ENDED" } });
  await db.challenge.update({ where: { slug: "the-one-percent-ledger" }, data: { lifecycle: "ACTIVE" } });

  // Admin → Content (savePostAction): an essay rewritten, another unpublished.
  await db.post.update({
    where: { slug: "why-tycoonhood-exists" },
    data: { title: "Why we built Tycoonhood", excerpt: "Rewritten by staff.", contentMd: "Staff copy.", authorName: "The House" },
  });
  // The action clears the time and the status together: Post_live_has_time refuses a PUBLISHED post with no time.
  await db.post.update({ where: { slug: "thc-utility-before-speculation" }, data: { publishedAt: null, status: "DRAFT" } });

  // Admin → Courses: details with the instructor cleared, a lesson, a module,
  // the founder's profile, one programme unpublished and one archived.
  const authoring = new CourseAuthoringService(db);
  await authoring.updateCourse(staff, warrior.id, {
    title: "Warrior Programme", slug: "warrior", pillar: "WARRIOR", subtitle: "Staff subtitle.",
    description: "Staff rewrote this description.", coverImage: "/covers/warrior-staff.jpg", instructorId: "", xpOnCompletion: 650,
  });
  const lesson = await db.lesson.findFirstOrThrow({
    where: { module: { courseId: warrior.id }, type: "READING" },
    orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  await authoring.updateLesson(staff, lesson.id, {
    title: "Staff lesson title", type: "READING", contentMd: "Staff lesson copy.", xpReward: lesson.xpReward,
    minutes: lesson.durationSec ? lesson.durationSec / 60 : null, isPreview: lesson.isPreview, isFinal: lesson.isFinal,
  });
  const money = await db.course.findUniqueOrThrow({
    where: { slug: "financial-planning-investment-advisory" },
    include: { modules: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  await authoring.updateModule(staff, money.modules[0].id, {
    title: "Staff module title", description: "Staff module description.", objectives: "One\nTwo", completion: "Finish it.",
  });
  const founder = await db.instructor.findUniqueOrThrow({ where: { slug: "harsha" } });
  await authoring.updateInstructor(staff, founder.id, {
    slug: "harsha", name: "Harsha R", headline: "Founder", bio: "Staff rewrote the founder's bio.", avatar: "/founder/harsha-2026.jpg",
  });
  await authoring.archive(staff, (await db.course.findUniqueOrThrow({ where: { slug: "mindfulness-wellness" } })).id);
  // One programme taken down and emptied, to be rewritten by hand: it must stay empty.
  const business = await db.course.findUniqueOrThrow({ where: { slug: "business-mastery" }, include: { modules: true } });
  await authoring.unpublish(staff, business.id);
  for (const m of business.modules) await authoring.deleteModule(staff, m.id);

  // Admin → Missions (saveMissionAction, toggleMissionAction): seed.ts's and seed-community's.
  await db.mission.update({
    where: { slug: "first-lesson" },
    data: { name: "First Lesson Done", description: "Staff wording.", xpReward: 150, thcReward: 750n, active: false },
  });
  await db.mission.update({ where: { slug: "weekly-quiz-pass" }, data: { name: "Prove It Twice", xpReward: 80 } });
  await db.mission.update({ where: { slug: "daily-check-in" }, data: { active: false } });

  // Admin → Community: a category, a group and a programme channel.
  const discussions = new DiscussionService(db);
  const intro = await db.communityCategory.findUniqueOrThrow({ where: { slug: "introductions" } });
  await discussions.saveCategory(staff, { id: intro.id, slug: "introductions", name: "Say hello", description: "Staff wording.", sortOrder: 5 });
  const group = await db.communityGroup.findUniqueOrThrow({ where: { slug: "warrior-program" } });
  await discussions.saveGroup(staff, {
    id: group.id, slug: "warrior-program", name: "Warrior Crew", description: "Staff wrote this group description.", pillar: "WARRIOR",
  });
  const channel = await db.channel.findUniqueOrThrow({ where: { slug: "warrior-discussion" } });
  await new CommunityService(db).saveChannel(staff, {
    id: channel.id, slug: "warrior-discussion", name: "Warrior talk", topic: "Staff topic.", kind: "CHAT",
    courseId: warrior.id, adminOnly: false, slowModeSec: 30, sortOrder: 0,
  });

  // Admin → Coupons: the welcome offer switched on.
  const welcome = await db.coupon.findUniqueOrThrow({ where: { code: "WELCOME10" } });
  await new CouponService(db).setActive(welcome.id, true);

  // A member, and THC staff granted them.
  const accounts = new AccountService(db);
  const member = await accounts.register({ email: "member@tycoonhood.test", password: "a-long-member-password", name: "Member" });
  await new LedgerService(db).reward({
    userId: member.id, amount: 1_234n, reason: "REWARD_ADMIN", idempotencyKey: "staff-grant-1", memo: "Thanks", createdById: admin.id,
  });

  // Admin → Members: the owner takes over and demotes the seeded admin.
  const owner = await accounts.register({ email: "owner@tycoonhood.test", password: "a-long-owner-password", name: "Owner" });
  const members = new MemberAdminService(db);
  await members.changeRole(staff, owner.id, "ADMIN");
  await members.changeRole({ id: owner.id, role: "ADMIN" }, admin.id, "MEMBER");
}

describe("seeds are safe to re-run on a live database", () => {
  let t: Throwaway;

  beforeAll(async () => {
    t = await createThrowawayDb("rerun");
    await migrate(t);
    await seedAll(t);
  }, SLOW);
  afterAll(async () => {
    await t?.drop();
  });

  it("runs the same seeds as a production deploy, in the same order", () => {
    const build = readFileSync(resolve(REPO_ROOT, "scripts/vercel-build.sh"), "utf8");
    const rootScripts = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8")).scripts as Record<string, string>;
    const dbScripts = JSON.parse(readFileSync(resolve(DB_PACKAGE, "package.json"), "utf8")).scripts as Record<string, string>;
    const fileOf = (name: string) => {
      const viaRoot = rootScripts[name]?.match(/^pnpm --filter @tycoonhood\/db (\S+)$/)?.[1];
      return dbScripts[viaRoot ?? name]?.match(/tsx (\S+)$/)?.[1];
    };
    const run = [...build.matchAll(/^\s*pnpm (?:--filter @tycoonhood\/db )?((?:db:)?seed[\w:]*)\s*$/gm)].map((m) => fileOf(m[1]));
    expect(run).toEqual([...DEPLOY_SEEDS]);
  });

  it("seeds each essay with the status its time gives it, as migration 20261113000700 backfilled posts", async () => {
    // On a fresh database the migrations run before the seeds, so the backfill finds no
    // essay: the seed writes the status itself, or a live essay reads as a draft.
    const essays = await t.db.post.findMany({ select: { slug: true, status: true, publishedAt: true }, orderBy: { slug: "asc" } });
    expect(essays.length).toBeGreaterThan(0);
    const now = new Date();
    expect(essays.map((e) => [e.slug, e.status])).toEqual(
      essays.map((e) => [e.slug, e.publishedAt === null ? "DRAFT" : e.publishedAt <= now ? "PUBLISHED" : "SCHEDULED"])
    );
    expect(essays.every((e) => e.status === "PUBLISHED")).toBe(true);
  });

  it("a second run on an untouched database changes nothing", async () => {
    const before = await snapshot(t.db);
    await seedAll(t);
    expect(changes(before, await snapshot(t.db))).toEqual([]);
  }, SLOW);

  it("counts a programme an older seed built, before the record of builds existed, as built", async () => {
    await t.db.siteSetting.delete({ where: { key: "seed.academy.built" } });
    const before = await snapshot(t.db);
    await mustRun("src/seed-academy.ts", t.url);
    expect(changes(before, await snapshot(t.db))).toEqual(["SiteSetting[seed.academy.built] added"]);
    expect((await t.db.siteSetting.findUniqueOrThrow({ where: { key: "seed.academy.built" } })).value).toEqual({
      slugs: ["business-mastery", "financial-planning-investment-advisory", "mindfulness-wellness", "warrior"],
    });
  }, SLOW);

  it("a re-run keeps every edit staff made in the admin", async () => {
    await editLikeStaff(t.db);
    const before = await snapshot(t.db);
    await seedAll(t);
    const after = await snapshot(t.db);

    // The finding, in its own words: prices, stock, live state and challenge dates stay put.
    const product = (slug: string) => t.db.product.findUniqueOrThrow({ where: { slug } });
    const warrior = await product("warrior-program-access");
    expect([warrior.priceFiatCents, warrior.fiatCurrency, warrior.priceThc, warrior.active]).toEqual([2_999_00, "INR", 15_000n, false]);
    const tee = await product("tycoonhood-training-tee");
    expect([tee.priceFiatCents, tee.inventory, tee.active, tee.category]).toEqual([1_299_00, 37, false, null]);
    const playbook = await product("founders-playbook");
    expect([playbook.priceFiatCents, playbook.priceThc, playbook.contentMd]).toEqual([null, 6_000n, "# Rewritten by staff"]);
    const iron = await t.db.challenge.findUniqueOrThrow({ where: { slug: "30-days-of-iron" } });
    const ironBefore = before.Challenge.rows.find((r) => r.slug === "30-days-of-iron")!;
    expect(iron.lifecycle).toBe("ACTIVE");
    expect(iron.startsAt?.toISOString()).toBe(new Date(ironBefore.startsAt as string).toISOString());
    expect((await t.db.user.findUniqueOrThrow({ where: { email: SEED_ADMIN.ADMIN_EMAIL } })).role).toBe("MEMBER");
    const business = await t.db.course.findUniqueOrThrow({ where: { slug: "business-mastery" }, include: { _count: { select: { modules: true } } } });
    expect([business.status, business._count.modules]).toEqual(["DRAFT", 0]);

    // And everything else: every row of every table is as staff left it.
    expect(changes(before, after)).toEqual([]);
  }, SLOW);

  it("a re-run adds what is missing and puts back copy only the seeds own", async () => {
    await t.db.achievement.delete({ where: { slug: "seven-day-streak" } });
    // A mission the seeds have not made yet, as when a release adds one to the seed files.
    // (One they made and staff then removed stays removed: see the renaming test below.)
    await t.db.mission.delete({ where: { slug: "complete-onboarding" } });
    await forget(t.db, "missions", "complete-onboarding");
    await t.db.rankDefinition.update({ where: { slug: "elite" }, data: { name: "Elite (typo" } });
    await t.db.challenge.update({ where: { slug: "launch-week" }, data: { description: "Old wording." } });
    const before = await snapshot(t.db);
    await seedAll(t);
    const diff = changes(before, await snapshot(t.db));

    expect(diff.map((l) => l.replace(/:.*$/, "")).sort()).toEqual([
      "Achievement[seven-day-streak] added",
      "Challenge[launch-week]",
      "Mission[complete-onboarding] added",
      "RankDefinition[elite]",
      "SiteSetting[seed.created.missions]",
    ]);
    expect(await recorded(t.db, "missions")).toContain("complete-onboarding");
    // The challenge got its wording back and nothing else (but the time of that write, in
    // updatedAt): staff ended it, and it stays ended.
    expect(diff.find((l) => l.startsWith("Challenge"))).toMatch(
      /^Challenge\[launch-week\]: description "Old wording\." → "Seven days[^;]*; updatedAt "[^"]+" → "[^"]+"$/
    );
    expect((await t.db.challenge.findUniqueOrThrow({ where: { slug: "launch-week" } })).lifecycle).toBe("ENDED");
    expect((await t.db.rankDefinition.findUniqueOrThrow({ where: { slug: "elite" } })).name).toBe("Tycoon Elite");
  }, SLOW);

  it("SEED_ACADEMY_FORCE=1 still rebuilds the programmes from the curriculum files", async () => {
    expect(await t.db.lesson.count({ where: { title: "Staff lesson title" } })).toBe(1);
    // An administrator gave one programme to another instructor in /admin/courses (DR-34).
    const other = await t.db.instructor.create({ data: { slug: "test-instructor", name: "Test Instructor", bio: "Fixture." } });
    await t.db.course.update({ where: { slug: "mindfulness-wellness" }, data: { instructorId: other.id } });
    await mustRun("src/seed-academy.ts", t.url, { SEED_ACADEMY_FORCE: "1" });
    expect(await t.db.lesson.count({ where: { title: "Staff lesson title" } })).toBe(0);
    // Staff cleared warrior's instructor, so the rebuild gives it the founder ...
    const warrior = await t.db.course.findUniqueOrThrow({ where: { slug: "warrior" }, include: { instructor: true } });
    expect([warrior.status, warrior.instructor?.slug]).toEqual(["PUBLISHED", "harsha"]);
    expect(await t.db.courseModule.count({ where: { courseId: warrior.id } })).toBe(9);
    // ... but never takes a programme from the instructor an administrator assigned.
    const mindfulness = await t.db.course.findUniqueOrThrow({ where: { slug: "mindfulness-wellness" }, include: { instructor: true } });
    expect([mindfulness.status, mindfulness.instructor?.slug]).toEqual(["PUBLISHED", "test-instructor"]);
  }, SLOW);

  it("re-running seed:merch keeps staff's prices, costs, sizes and videos", async () => {
    const videos = { TH_SEED_VIDEOS: "intro-video|dQw4w9WgXcQ|300|Intro" };
    await mustRun("src/seed-merch.ts", t.url, videos);

    const hoodie = await t.db.product.findUniqueOrThrow({
      where: { slug: "warrior-hoodie" },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });
    await new CatalogService(t.db).save({
      slug: "warrior-hoodie", kind: "PHYSICAL", name: "Warrior Hoodie II", description: "Staff copy.",
      priceThc: hoodie.priceThc, priceFiatCents: 2_799_00, costCents: null, active: true,
      variants: hoodie.variants.map((v, i) => ({
        id: v.id, sku: v.sku, label: v.label === "XXL" ? "2XL" : v.label, inventory: v.inventory + 5,
        priceThc: v.priceThc, sortOrder: hoodie.variants.length - i, active: true,
      })),
    });
    // Admin → Videos (saveVideoAction).
    await t.db.watchTask.update({
      where: { slug: "intro-video" },
      data: { title: "Staff title", rewardThc: 99n, rewardXp: 5, active: true, publishedAt: new Date(), sortOrder: 4 },
    });

    const before = await snapshot(t.db);
    await mustRun("src/seed-merch.ts", t.url, videos);
    expect(changes(before, await snapshot(t.db))).toEqual([]);
  }, SLOW);

  it("a seeded mission, size, essay, category or group staff renamed does not come back under its old name", async () => {
    // Admin → Missions (saveMissionAction updates by id, slug included). Under its
    // old slug, a second copy would be live and pay its reward again.
    for (const [from, to] of [["first-lesson", "first-lesson-done"], ["weekly-five-lessons", "five-lessons-a-week"]]) {
      const m = await t.db.mission.findUniqueOrThrow({ where: { slug: from } });
      await t.db.mission.update({ where: { id: m.id }, data: { slug: to } });
    }
    // Admin → Products (catalog.save with each size's id): a size's SKU changed.
    // Under its old SKU, a second size would be on sale with stock that is not there.
    const hoodie = await t.db.product.findUniqueOrThrow({
      where: { slug: "warrior-hoodie" },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });
    await new CatalogService(t.db).save({
      slug: hoodie.slug, kind: hoodie.kind as ProductKind, name: hoodie.name, description: hoodie.description,
      priceThc: hoodie.priceThc, priceFiatCents: hoodie.priceFiatCents, costCents: hoodie.costCents, active: hoodie.active,
      variants: hoodie.variants.map((v) => ({
        id: v.id, sku: v.sku === "WARRIORHOO-M" ? "HOODIE-MEDIUM" : v.sku, label: v.label, inventory: v.inventory,
        priceThc: v.priceThc, sortOrder: v.sortOrder, active: v.active,
      })),
    });
    // Admin → Content (savePostAction) and Admin → Community (saveCategory, saveGroup) update by id, slug included.
    await t.db.post.update({ where: { slug: "why-tycoonhood-exists" }, data: { slug: "why-we-built-tycoonhood" } });
    await t.db.communityCategory.update({ where: { slug: "introductions" }, data: { slug: "say-hello" } });
    await t.db.communityGroup.update({ where: { slug: "warrior-program" }, data: { slug: "warrior-crew" } });

    const before = await snapshot(t.db);
    await seedAll(t);
    await mustRun("src/seed-merch.ts", t.url);
    expect(changes(before, await snapshot(t.db))).toEqual([]);
  }, SLOW);

  it("counts what an older seed made, before the record existed, as made, renamed rows included", async () => {
    // A database seeded before the records began: the renames above happened, and no record exists.
    await t.db.siteSetting.deleteMany({ where: { key: { startsWith: "seed.created." } } });
    const before = await snapshot(t.db);
    await seedAll(t);
    await mustRun("src/seed-merch.ts", t.url);
    expect(changes(before, await snapshot(t.db)).sort()).toEqual(
      ["categories", "essays", "groups", "missions", "sizes", "weekly-missions"].map((k) => `SiteSetting[seed.created.${k}] added`)
    );
    // An older seed made each kind in one run: if some of it is here, all of it was made.
    expect(await recorded(t.db, "missions")).toEqual(["first-lesson", "daily-check-in", "complete-onboarding"]);
    expect(await recorded(t.db, "weekly-missions")).toContain("weekly-five-lessons");
    expect(await recorded(t.db, "sizes")).toContain("WARRIORHOO-M");
    expect(await recorded(t.db, "essays")).toContain("why-tycoonhood-exists");
  }, SLOW);
});
