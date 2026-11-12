/**
 * THE SEEDED ADMIN (review finding 18).
 *
 * Sign-in lower-cases and trims the address it is given, so an admin stored as
 * "Owner@Example.com" could never sign in. And a re-run that did not recognise
 * the existing admin tried to create another one with the username "admin",
 * which is taken, and failed the deploy. The seed now stores ADMIN_EMAIL the
 * way sign-in reads it, finds the admin it made before whatever the case, and
 * never fails on the username.
 *
 * Each case runs the real seed (packages/db/src/seed.ts) as a separate
 * process against a database built from nothing.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AccountService } from "../src/auth/account";
import { loginSchema } from "../src/auth/schemas";
import { hashPassword } from "../src/auth/password";
import { MemberAdminService } from "../src/platform/members";
import { createThrowawayDb, migrate, runDbScript, mustRun, SEED_ADMIN, type Throwaway } from "./throwaway-db";

const SLOW = 120_000;

/** Signs in exactly as the login form does: the schema first, then the account service. */
async function signIn(t: Throwaway, email: string, password: string) {
  return new AccountService(t.db).authenticate(loginSchema.parse({ email, password }));
}

const seed = (t: Throwaway, env: Record<string, string>) => mustRun("src/seed.ts", t.url, env);
const sameAddress = (t: Throwaway, email: string) =>
  t.db.user.findMany({ where: { email: { contains: email.trim(), mode: "insensitive" } }, include: { profile: true } });

describe("the admin from ADMIN_EMAIL", () => {
  let t: Throwaway;
  beforeAll(async () => {
    t = await createThrowawayDb("admin");
    await migrate(t);
  }, SLOW);
  afterAll(async () => {
    await t?.drop();
  });

  it("is stored the way sign-in reads it, so a capitalised address can sign in", async () => {
    await seed(t, { ADMIN_EMAIL: "  Owner.Admin@Example.COM " });
    const admin = await t.db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    expect(admin.email).toBe("owner.admin@example.com");
    expect((await signIn(t, "  Owner.Admin@Example.COM ", SEED_ADMIN.ADMIN_PASSWORD)).id).toBe(admin.id);
    expect((await signIn(t, "owner.admin@example.com", SEED_ADMIN.ADMIN_PASSWORD)).id).toBe(admin.id);
  }, SLOW);

  it("is found again by a re-run that spells the address in another case", async () => {
    await seed(t, { ADMIN_EMAIL: "OWNER.ADMIN@example.com" });
    const rows = await sameAddress(t, "owner.admin@example.com");
    expect(rows.map((u) => [u.email, u.role, u.profile?.username])).toEqual([["owner.admin@example.com", "ADMIN", "admin"]]);
  }, SLOW);

  it("is created with a free username when another account already has 'admin'", async () => {
    await seed(t, { ADMIN_EMAIL: "Second.Admin@Example.com" });
    const second = await t.db.user.findUniqueOrThrow({ where: { email: "second.admin@example.com" }, include: { profile: true } });
    expect([second.role, second.profile?.username]).toEqual(["ADMIN", "admin_2"]);
    expect((await signIn(t, "second.admin@example.com", SEED_ADMIN.ADMIN_PASSWORD)).id).toBe(second.id);
  }, SLOW);

  it("is not promoted back after staff demoted it, while another admin can sign in", async () => {
    const first = await t.db.user.findUniqueOrThrow({ where: { email: "owner.admin@example.com" } });
    const second = await t.db.user.findUniqueOrThrow({ where: { email: "second.admin@example.com" } });
    await new MemberAdminService(t.db).changeRole({ id: second.id, role: "ADMIN" }, first.id, "MEMBER");
    await seed(t, { ADMIN_EMAIL: "owner.admin@example.com" });
    expect((await t.db.user.findUniqueOrThrow({ where: { id: first.id } })).role).toBe("MEMBER");
  }, SLOW);

  it("must be an email address", async () => {
    const users = await t.db.user.count();
    for (const bad of ["   ", "not-an-address"]) {
      const r = await runDbScript("src/seed.ts", t.url, { ADMIN_EMAIL: bad });
      expect(r.code).toBe(1);
      expect(r.output).toMatch(/ADMIN_EMAIL/);
    }
    expect(await t.db.user.count()).toBe(users);
  }, SLOW);
});

describe("an admin an earlier seed stored with capitals", () => {
  let t: Throwaway;
  beforeAll(async () => {
    t = await createThrowawayDb("legacy");
    await migrate(t);
  }, SLOW);
  afterAll(async () => {
    await t?.drop();
  });

  it("is repaired in place, keeps its password, and can sign in", async () => {
    // What the old seed wrote for ADMIN_EMAIL=" Legacy.Admin@Example.com".
    const legacy = await t.db.user.create({
      data: {
        email: " Legacy.Admin@Example.com",
        name: "The House",
        role: "ADMIN",
        credential: { create: { hash: await hashPassword("the-legacy-password") } },
        profile: { create: { username: "admin", displayName: "The House" } },
      },
    });
    await expect(signIn(t, " Legacy.Admin@Example.com", "the-legacy-password")).rejects.toThrow();

    await seed(t, { ADMIN_EMAIL: "legacy.admin@example.com" });
    const rows = await sameAddress(t, "legacy.admin@example.com");
    expect(rows.map((u) => [u.id, u.email, u.role])).toEqual([[legacy.id, "legacy.admin@example.com", "ADMIN"]]);
    expect((await signIn(t, "Legacy.Admin@Example.com", "the-legacy-password")).id).toBe(legacy.id);
  }, SLOW);
});

describe("an account that registered with ADMIN_EMAIL before the first seed", () => {
  let t: Throwaway;
  beforeAll(async () => {
    t = await createThrowawayDb("signup");
    await migrate(t);
  }, SLOW);
  afterAll(async () => {
    await t?.drop();
  });

  it("is promoted while no admin can sign in, and keeps its own password", async () => {
    const member = await new AccountService(t.db).register({ email: "first@example.com", password: "their-own-password", name: "First" });
    await seed(t, { ADMIN_EMAIL: "First@Example.com" });
    expect(await t.db.user.count()).toBe(1);
    expect((await t.db.user.findUniqueOrThrow({ where: { id: member.id } })).role).toBe("ADMIN");
    expect((await signIn(t, "first@example.com", "their-own-password")).id).toBe(member.id);
  }, SLOW);
});
