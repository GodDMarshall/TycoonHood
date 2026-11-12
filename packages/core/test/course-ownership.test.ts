/**
 * Who may edit which programme (DR-34). An instructor edits only the
 * programmes whose instructor profile is linked to their own account.
 * Course managers (`courses.manage`, administrators today) edit every
 * programme, manage instructor profiles and link them to member accounts.
 * Every course, profile and member here is a throwaway made by this file.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import type { UserRole } from "@tycoonhood/db";
import { CourseAuthoringService, AuthoringError, type AuthoringActor } from "../src/lms/authoring";
import { can, ForbiddenError, ROLES } from "../src/auth/permissions";
import { createTestUser, uid } from "./helpers";

const authoring = new CourseAuthoringService(prisma);

const courses: string[] = [];
const profiles: string[] = [];

afterAll(async () => {
  await prisma.course.deleteMany({ where: { id: { in: courses } } });
  await prisma.instructor.deleteMany({ where: { id: { in: profiles } } });
});

async function staff(role: UserRole = "ADMIN"): Promise<AuthoringActor> {
  const u = await createTestUser();
  if (role !== "MEMBER") await prisma.user.update({ where: { id: u.id }, data: { role } });
  return { id: u.id, role };
}

/** A public instructor profile, made by an administrator. */
async function profile(admin: AuthoringActor, name = "Test Teacher") {
  const i = await authoring.createInstructor(admin, { slug: `i-${uid().slice(0, 8)}`, name, bio: "Teaches tests for a living." });
  profiles.push(i.id);
  return i;
}

const auditRows = (targetId: string, action: string) => prisma.auditLog.findMany({ where: { targetId, action }, orderBy: { createdAt: "asc" } });

describe("the courses.manage permission", () => {
  it("is held by administrators only; instructors keep courses.author", () => {
    for (const role of ROLES) expect(can({ role }, "courses.manage"), role).toBe(role === "ADMIN");
    expect(can({ role: "INSTRUCTOR" }, "courses.author")).toBe(true);
    expect(can({ role: "ADMIN" }, "courses.author")).toBe(true);
    expect(can({ role: "MODERATOR" }, "courses.author")).toBe(false);
    expect(can(null, "courses.manage")).toBe(false);
  });
});

describe("instructor profiles are managed with courses.manage", () => {
  it("instructors and moderators cannot create, edit or delete a profile, not even their own", async () => {
    const admin = await staff();
    const mine = await profile(admin, "Mine");
    const theirs = await profile(admin, "Theirs");
    const instructor = await staff("INSTRUCTOR");
    await authoring.linkInstructorUser(admin, mine.id, instructor.id);

    for (const actor of [instructor, await staff("MODERATOR")]) {
      await expect(
        authoring.createInstructor(actor, { slug: `i-${uid().slice(0, 8)}`, name: "Someone New", bio: "Should never be created." })
      ).rejects.toBeInstanceOf(ForbiddenError);
      for (const target of [mine, theirs]) {
        await expect(authoring.updateInstructor(actor, target.id, { slug: target.slug, name: "Renamed", bio: "Should never be saved." })).rejects.toBeInstanceOf(
          ForbiddenError
        );
        await expect(authoring.deleteInstructor(actor, target.id)).rejects.toBeInstanceOf(ForbiddenError);
      }
    }
    const left = await prisma.instructor.findMany({ where: { id: { in: [mine.id, theirs.id] } }, orderBy: { name: "asc" } });
    expect(left.map((i) => i.name)).toEqual(["Mine", "Theirs"]);
  });

  it("creating or editing a profile never links it to an account; only linkInstructorUser does", async () => {
    const admin = await staff();
    const member = await createTestUser();
    const sneaky = { slug: `i-${uid().slice(0, 8)}`, name: "Sneaky", bio: "Tries to link itself.", userId: member.id };
    const i = await authoring.createInstructor(admin, sneaky);
    profiles.push(i.id);
    expect(i.userId).toBeNull();
    const saved = await authoring.updateInstructor(admin, i.id, sneaky);
    expect(saved.userId).toBeNull();
  });
});

describe("linking a profile to a member account", () => {
  it("instructors and moderators cannot link or unlink, even their own profile", async () => {
    const admin = await staff();
    const mine = await profile(admin);
    const instructor = await staff("INSTRUCTOR");
    await expect(authoring.linkInstructorUser(instructor, mine.id, instructor.id)).rejects.toBeInstanceOf(ForbiddenError);
    await authoring.linkInstructorUser(admin, mine.id, instructor.id);
    for (const actor of [instructor, await staff("MODERATOR")]) {
      await expect(authoring.linkInstructorUser(actor, mine.id, null)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(authoring.findMemberForLink(actor, "anyone@tycoonhood.test")).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect((await prisma.instructor.findUniqueOrThrow({ where: { id: mine.id } })).userId).toBe(instructor.id);
  });

  it("link and unlink are audited with who was linked before and after", async () => {
    const admin = await staff();
    const i = await profile(admin);
    const first = await staff("INSTRUCTOR");
    const second = await staff("INSTRUCTOR");
    const name = async (id: string) => (await prisma.profile.findUniqueOrThrow({ where: { userId: id } })).username;

    const linked = await authoring.linkInstructorUser(admin, i.id, first.id);
    expect(linked.userId).toBe(first.id);
    // The same link again changes nothing and writes nothing.
    await authoring.linkInstructorUser(admin, i.id, first.id);
    // Moving the profile to another member records both.
    await authoring.linkInstructorUser(admin, i.id, second.id);
    await authoring.linkInstructorUser(admin, i.id, null);
    expect((await prisma.instructor.findUniqueOrThrow({ where: { id: i.id } })).userId).toBeNull();

    const links = await auditRows(i.id, "instructor.link");
    expect(links.map((r) => [r.actorId, r.targetType, r.meta])).toEqual([
      [admin.id, "Instructor", { slug: i.slug, userId: { from: null, to: first.id }, username: { from: null, to: await name(first.id) } }],
      [
        admin.id,
        "Instructor",
        { slug: i.slug, userId: { from: first.id, to: second.id }, username: { from: await name(first.id), to: await name(second.id) } },
      ],
    ]);
    const unlinks = await auditRows(i.id, "instructor.unlink");
    expect(unlinks.map((r) => r.meta)).toEqual([{ slug: i.slug, userId: { from: second.id, to: null }, username: { from: await name(second.id), to: null } }]);
  });

  it("one profile per member: a member linked elsewhere is refused, even when two links race", async () => {
    const admin = await staff();
    const [a, b, c] = [await profile(admin, "Alpha"), await profile(admin, "Beta"), await profile(admin, "Gamma")];
    const member = await staff("INSTRUCTOR");
    await authoring.linkInstructorUser(admin, a.id, member.id);
    await expect(authoring.linkInstructorUser(admin, b.id, member.id)).rejects.toThrow(/already linked to the instructor profile “Alpha”/);
    expect((await prisma.instructor.findUniqueOrThrow({ where: { id: b.id } })).userId).toBeNull();
    expect(await auditRows(b.id, "instructor.link")).toHaveLength(0);

    // Two administrators link one new member to two profiles at the same moment: one wins.
    const racer = await staff("INSTRUCTOR");
    const results = await Promise.allSettled([authoring.linkInstructorUser(admin, b.id, racer.id), authoring.linkInstructorUser(admin, c.id, racer.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [lost] = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(lost.reason).toBeInstanceOf(AuthoringError);
    expect(String(lost.reason.message)).toMatch(/already linked/);
    expect(await prisma.instructor.count({ where: { userId: racer.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { targetId: { in: [b.id, c.id] }, action: "instructor.link" } })).toBe(1);
  });

  it("refuses a profile or member that does not exist", async () => {
    const admin = await staff();
    const i = await profile(admin);
    await expect(authoring.linkInstructorUser(admin, i.id, "no-such-member")).rejects.toThrow(/No member has that account/);
    await expect(authoring.linkInstructorUser(admin, "no-such-profile", admin.id)).rejects.toThrow(/Instructor not found/);
  });

  it("finds the member to link by exact email or username, never by a partial match", async () => {
    const admin = await staff();
    const member = await createTestUser();
    const username = (await prisma.profile.findUniqueOrThrow({ where: { userId: member.id } })).username;
    expect((await authoring.findMemberForLink(admin, member.email.toUpperCase()))?.id).toBe(member.id);
    expect((await authoring.findMemberForLink(admin, `  ${username}  `))?.id).toBe(member.id);
    expect((await authoring.findMemberForLink(admin, `@${username}`))?.id).toBe(member.id);
    expect(await authoring.findMemberForLink(admin, username.slice(0, -1))).toBeNull();
    expect(await authoring.findMemberForLink(admin, member.email.slice(1))).toBeNull();
    expect(await authoring.findMemberForLink(admin, "   ")).toBeNull();
  });
});
