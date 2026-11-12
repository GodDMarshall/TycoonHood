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
 * ADMIN_EMAIL makes the first admin, and nothing more. While an admin can sign
 * in, an address no account has makes no admin: otherwise every seeding run
 * with a mistyped or out-of-date ADMIN_EMAIL would mint a full admin, with
 * ADMIN_PASSWORD, for whoever holds that mailbox. And the seed never takes an
 * address held for an account that changed away from it in the last 7 days
 * (platform/email-hold), or that account's undo link would stop working.
 * Only an address its account confirmed is held (DR-32). One never confirmed
 * gets no hold and no undo link, and is free at once to anyone, so the seed
 * treats it as any free address.
 *
 * Each case runs the real seed (packages/db/src/seed.ts) as a separate
 * process against a database built from nothing.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { AccountService } from "../src/auth/account";
import { loginSchema } from "../src/auth/schemas";
import { hashPassword } from "../src/auth/password";
import { MemberAdminService } from "../src/platform/members";
import { AccountSettingsService } from "../src/platform/account-settings";
import { EmailVerificationService } from "../src/platform/email-verification";
import { EmailUndoService } from "../src/platform/email-undo";
import { adminEmailFrom } from "../../db/src/admin-email";
import { resolve } from "node:path";
import {
  createThrowawayDb, migrate, runDbScript, mustRun, start, scriptEnv, SEED_ADMIN, REPO_ROOT, TSX, type Throwaway,
} from "./throwaway-db";
import { askedADayAgo } from "./helpers";

const SLOW = 120_000;

/** Signs in exactly as the login form does: the schema first, then the account service. */
async function signIn(t: Throwaway, email: string, password: string) {
  return new AccountService(t.db).authenticate(loginSchema.parse({ email, password }));
}

/**
 * Confirms the account's address with the link its owner is sent, as the
 * owner would from the banner. Neither the seed nor sign-up confirms one, and
 * only a confirmed address is held, with an undo link, when the account moves
 * off it (DR-32).
 */
async function confirmAddress(t: Throwaway, userId: string) {
  const verification = new EmailVerificationService(t.db);
  await verification.verify((await verification.issue(userId)).rawToken);
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

  it("is the account scripts/smoke-admin.ts signs in as, with ADMIN_EMAIL as it was typed", async () => {
    const r = await start(process.execPath, [TSX, "scripts/smoke-admin.ts"], {
      cwd: resolve(REPO_ROOT, "packages/core"),
      env: scriptEnv(t.url, { ADMIN_EMAIL: "  Owner.Admin@Example.COM " }),
    }).done;
    expect(r.code, r.output).toBe(0);
    const { token } = JSON.parse(r.output.trim().split("\n").pop() ?? "{}") as { token?: string };
    expect(token).toMatch(/^\S{20,}$/);
  }, SLOW);

  it("is found again by a re-run that spells the address in another case", async () => {
    await seed(t, { ADMIN_EMAIL: "OWNER.ADMIN@example.com" });
    const rows = await sameAddress(t, "owner.admin@example.com");
    expect(rows.map((u) => [u.email, u.role, u.profile?.username])).toEqual([["owner.admin@example.com", "ADMIN", "admin"]]);
  }, SLOW);

  it("is not made for an address no account has while an admin can already sign in", async () => {
    // A later build with a new or mistyped ADMIN_EMAIL: no second admin, nothing for that mailbox to take over.
    const users = await t.db.user.count();
    const output = await seed(t, { ADMIN_EMAIL: "Second.Admin@Example.com" });
    expect(await t.db.user.count()).toBe(users);
    expect(await t.db.user.findUnique({ where: { email: "second.admin@example.com" } })).toBeNull();
    expect(output).toMatch(/\/admin\/members/);
  }, SLOW);

  it("is not promoted back after staff demoted it, while another admin can sign in", async () => {
    const first = await t.db.user.findUniqueOrThrow({ where: { email: "owner.admin@example.com" } });
    // Staff make a second admin the way the admin does: a member, promoted in /admin/members.
    const second = await new AccountService(t.db).register({ email: "second.admin@example.com", password: "the-second-password", name: "Second" });
    const members = new MemberAdminService(t.db);
    await members.changeRole({ id: first.id, role: "ADMIN" }, second.id, "ADMIN");
    await members.changeRole({ id: second.id, role: "ADMIN" }, first.id, "MEMBER");
    await seed(t, { ADMIN_EMAIL: "owner.admin@example.com" });
    expect((await t.db.user.findUniqueOrThrow({ where: { id: first.id } })).role).toBe("MEMBER");
  }, SLOW);

  it("must be an address sign-in accepts", async () => {
    const users = await t.db.user.count();
    // Each passes a loose "something@something" test, and sign-in refuses every one.
    for (const bad of ["   ", "not-an-address", '"owner@example.com"', "owner@localhost", "owner@example.c", "owner@example.com."]) {
      const r = await runDbScript("src/seed.ts", t.url, { ADMIN_EMAIL: bad });
      expect(r.code, bad).toBe(1);
      expect(r.output, bad).toMatch(/ADMIN_EMAIL/);
    }
    // Quote marks typed into Vercel's value box are kept, so the message names them.
    expect((await runDbScript("src/seed.ts", t.url, { ADMIN_EMAIL: '"owner@example.com"' })).output).toMatch(/quote marks/);
    expect(await t.db.user.count()).toBe(users);
  }, SLOW);
});

describe("the rule ADMIN_EMAIL is checked by", () => {
  it("is sign-in's own: the seed accepts what the login form accepts, and stores what it looks up", () => {
    const typed = [
      "owner@example.com", "  Owner.Admin@Example.COM ", "owner+tag@example.co.in", "o'brien@example.com",
      "owner@example.museum", "owner@xn--80ak6aa92e.com", "admin@tycoonhood.local",
      '"owner@example.com"', "'owner@example.com'", "“owner@example.com”", "owner@localhost", "owner@example.c",
      "owner@example.com.", "owner@exa_mple.com", "owner@-example.com", "owner@[192.168.1.1]", "own..er@example.com",
      ".owner@example.com", "owner.@example.com", "owner @example.com", "owner@@example.com", "", "   ",
    ];
    for (const raw of typed) {
      const login = loginSchema.safeParse({ email: raw, password: "x" });
      let seeded: string | null;
      try {
        seeded = adminEmailFrom(raw);
      } catch {
        seeded = null;
      }
      expect(seeded, raw).toBe(login.success ? login.data.email : null);
    }
  });
});

describe("an admin an earlier seed stored with quote marks around its address", () => {
  // What the old seed wrote for ADMIN_EMAIL entered in Vercel as "owner@example.com", quotes included.
  const quotedAdmin = async (t: Throwaway) =>
    t.db.user.create({
      data: {
        email: '"owner@example.com"',
        name: "The House",
        role: "ADMIN",
        credential: { create: { hash: await hashPassword(SEED_ADMIN.ADMIN_PASSWORD) } },
        profile: { create: { username: "admin", displayName: "The House" } },
      },
    });

  let t: Throwaway;
  beforeEach(async () => {
    t = await createThrowawayDb("quoted");
    await migrate(t);
  }, SLOW);
  afterEach(async () => {
    await t?.drop();
  });

  it("does not count as an admin who can sign in, so the real address is made admin", async () => {
    const quoted = await quotedAdmin(t);
    for (const typed of ["owner@example.com", '"owner@example.com"']) {
      await expect(signIn(t, typed, SEED_ADMIN.ADMIN_PASSWORD)).rejects.toThrow();
    }
    // The owner registers the real address, fixes ADMIN_EMAIL and deploys again.
    const owner = await new AccountService(t.db).register({ email: "owner@example.com", password: "the-owner-password", name: "Owner" });
    await seed(t, { ADMIN_EMAIL: "owner@example.com" });
    expect((await t.db.user.findUniqueOrThrow({ where: { id: owner.id } })).role).toBe("ADMIN");
    expect((await signIn(t, "Owner@Example.com", "the-owner-password")).id).toBe(owner.id);
    expect((await t.db.user.findUniqueOrThrow({ where: { id: quoted.id } })).email).toBe('"owner@example.com"');
  }, SLOW);

  it("does not count, so with no account at the real address an admin is made there, under a free username", async () => {
    await quotedAdmin(t);
    await seed(t, { ADMIN_EMAIL: "owner@example.com" });
    const admin = await t.db.user.findUniqueOrThrow({ where: { email: "owner@example.com" }, include: { profile: true } });
    expect([admin.role, admin.profile?.username]).toEqual(["ADMIN", "admin_2"]);
    expect((await signIn(t, "owner@example.com", SEED_ADMIN.ADMIN_PASSWORD)).id).toBe(admin.id);
  }, SLOW);
});

describe("a deploy whose ADMIN_EMAIL sign-in would refuse", () => {
  // Nothing listens here, so a deploy that went on to the database would say "Cannot reach the database".
  const unreachable = "postgresql://tycoon:nothing@127.0.0.1:9/tycoonhood_never_test";
  const deployEnv = scriptEnv(unreachable, { ADMIN_EMAIL: '"owner@example.com"', ADMIN_PASSWORD: "a-long-deploy-password" });

  it("stops the Vercel build before it touches the database", async () => {
    const r = await start("bash", ["scripts/vercel-build.sh"], {
      cwd: REPO_ROOT,
      env: { ...deployEnv, VERCEL_ENV: "production", SEED_ON_DEPLOY: "1" },
    }).done;
    expect(r.code, r.output).toBe(1);
    expect(r.output).toMatch(/quote marks/);
    expect(r.output).toMatch(/The database was not touched/);
    expect(r.output).not.toMatch(/Cannot reach the database|Applying database migrations/);
  }, SLOW);

  it("stops pnpm deploy:db before it touches the database", async () => {
    const r = await start(process.execPath, ["scripts/deploy-db.mjs"], { cwd: REPO_ROOT, env: deployEnv }).done;
    expect(r.code, r.output).toBe(1);
    expect(r.output).toMatch(/quote marks/);
    expect(r.output).not.toMatch(/Cannot reach the database/);
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

describe("an ADMIN_EMAIL that an account changed away from in the last 7 days", () => {
  let t: Throwaway;
  beforeAll(async () => {
    t = await createThrowawayDb("held");
    await migrate(t);
  }, SLOW);
  afterAll(async () => {
    await t?.drop();
  });

  it("makes no admin there, so the undo link still puts the address back", async () => {
    await seed(t, { ADMIN_EMAIL: "owner@old.example.com" });
    const admin = await t.db.user.findUniqueOrThrow({ where: { email: "owner@old.example.com" } });
    // The owner confirms the admin's address (LAUNCH.md, step 5). Only a confirmed address is held.
    await confirmAddress(t, admin.id);
    // The admin's address moves (the owner's own change, or a takeover): the old one is held for 7 days.
    const change = await new AccountSettingsService(t.db).changeEmail(admin.id, "someone@new.example.com", SEED_ADMIN.ADMIN_PASSWORD);
    const moved = await new EmailVerificationService(t.db).confirm(change!.rawToken);
    if (moved.kind !== "email-change" || !moved.undo) throw new Error("expected an email change with an undo link");

    // A later build still has the old ADMIN_EMAIL.
    await seed(t, { ADMIN_EMAIL: "owner@old.example.com" });
    expect(await t.db.user.findUnique({ where: { email: "owner@old.example.com" } })).toBeNull();
    expect(await t.db.user.count({ where: { role: "ADMIN" } })).toBe(1);

    const undone = await new EmailUndoService(t.db).undo(moved.undo.rawToken);
    expect([undone.userId, undone.restoredEmail]).toEqual([admin.id, "owner@old.example.com"]);
  }, SLOW);

  it("is refused even while no admin can sign in, and an earlier seed's row for it is left alone", async () => {
    // A database where no admin can sign in: the only admin is what an older
    // seed wrote for ADMIN_EMAIL=" Held@Example.com", which no sign-in matches.
    await t.db.user.updateMany({ where: { role: "ADMIN" }, data: { role: "MEMBER" } });
    const legacy = await t.db.user.create({
      data: {
        email: " Held@Example.com",
        name: "The House",
        role: "ADMIN",
        credential: { create: { hash: await hashPassword("the-legacy-password") } },
        profile: { create: { username: "admin_9", displayName: "The House" } },
      },
    });
    // A member confirmed held@example.com, then moved away from it, so it is held for them.
    const accounts = new AccountService(t.db);
    const member = await accounts.register({ email: "held@example.com", password: "the-member-password", name: "Member" });
    await confirmAddress(t, member.id);
    const change = await new AccountSettingsService(t.db).changeEmail(member.id, "member@moved.example.com", "the-member-password");
    await new EmailVerificationService(t.db).confirm(change!.rawToken);
    expect(await t.db.emailHold.count({ where: { address: "held@example.com", userId: member.id } })).toBe(1);

    const users = await t.db.user.count();
    const r = await runDbScript("src/seed.ts", t.url, { ADMIN_EMAIL: "held@example.com" });
    expect(r.code, r.output).toBe(1);
    expect(r.output).toMatch(/held@example\.com is held/);
    expect(await t.db.user.count()).toBe(users);
    expect((await t.db.user.findUniqueOrThrow({ where: { id: legacy.id } })).email).toBe(" Held@Example.com");
  }, SLOW);
});

describe("an admin the seed makes at an address nobody has confirmed", () => {
  // Only its owner can confirm ADMIN_EMAIL. Were the seed to mark it confirmed, a mistyped one would get
  // the undo link of the owner's first email change, which hands over the admin account. Until it is
  // confirmed, a change away from it gets no hold and no undo link (DR-32), so the seed says to confirm it.
  let t: Throwaway;
  beforeAll(async () => {
    t = await createThrowawayDb("confirm");
    await migrate(t);
  }, SLOW);
  afterAll(async () => {
    await t?.drop();
  });

  it("is left unconfirmed, and the seed asks the owner to confirm it", async () => {
    const output = await seed(t, { ADMIN_EMAIL: "owner@example.com" });
    expect((await t.db.user.findUniqueOrThrow({ where: { email: "owner@example.com" } })).emailVerified).toBeNull();
    expect(output).toMatch(/owner@example\.com is not confirmed yet\..*LAUNCH\.md, step 5/);
  }, SLOW);

  it("is named the same way when the seed makes an account admin, unless its owner confirmed the address", async () => {
    const accounts = new AccountService(t.db);
    await t.db.user.updateMany({ where: { role: "ADMIN" }, data: { role: "MEMBER" } });
    await accounts.register({ email: "member@example.com", password: "the-member-password", name: "Member" });
    expect(await seed(t, { ADMIN_EMAIL: "member@example.com" })).toMatch(/member@example\.com is not confirmed yet\./);

    await t.db.user.updateMany({ where: { role: "ADMIN" }, data: { role: "MEMBER" } });
    const owner = await accounts.register({ email: "confirmed@example.com", password: "the-owner-password", name: "Owner" });
    await confirmAddress(t, owner.id);
    expect(await seed(t, { ADMIN_EMAIL: "confirmed@example.com" })).not.toMatch(/not confirmed/);
    expect((await t.db.user.findUniqueOrThrow({ where: { id: owner.id } })).role).toBe("ADMIN");
  }, SLOW);
});

describe("an ADMIN_EMAIL never confirmed, that its account changed away from", () => {
  // A change away from an address never confirmed holds nothing and makes no undo link (DR-32): the
  // address may not be the account's, and it is free at once, to anyone who signs up with it.
  let t: Throwaway;
  beforeAll(async () => {
    t = await createThrowawayDb("unheld");
    await migrate(t);
  }, SLOW);
  afterAll(async () => {
    await t?.drop();
  });

  it("is not held, so the seed makes an admin there only while no admin can sign in", async () => {
    await seed(t, { ADMIN_EMAIL: "owner@typo.example.com" });
    const admin = await t.db.user.findUniqueOrThrow({ where: { email: "owner@typo.example.com" } });
    // The seed leaves the address unconfirmed: only its owner can confirm it (LAUNCH.md, step 5).
    expect(admin.emailVerified).toBeNull();
    const change = await new AccountSettingsService(t.db).changeEmail(admin.id, "owner@real.example.com", SEED_ADMIN.ADMIN_PASSWORD);
    await askedADayAgo(admin.id, t.db); // a change away from an address never confirmed waits a day first
    const moved = await new EmailVerificationService(t.db).confirm(change!.rawToken);
    expect(moved).toMatchObject({ kind: "email-change", previousEmail: "owner@typo.example.com", undo: null });
    expect(await t.db.emailHold.count()).toBe(0);

    // A later build still has the old ADMIN_EMAIL. The admin signs in at its new address, so nothing is made.
    const users = await t.db.user.count();
    await seed(t, { ADMIN_EMAIL: "owner@typo.example.com" });
    expect(await t.db.user.count()).toBe(users);
    expect(await t.db.user.findUnique({ where: { email: "owner@typo.example.com" } })).toBeNull();

    // With no admin who can sign in, the seed makes one there, as anyone could sign up with it.
    await t.db.user.updateMany({ where: { role: "ADMIN" }, data: { role: "MEMBER" } });
    await seed(t, { ADMIN_EMAIL: "owner@typo.example.com" });
    const made = await t.db.user.findUniqueOrThrow({ where: { email: "owner@typo.example.com" } });
    expect([made.role, made.id === admin.id]).toEqual(["ADMIN", false]);
    expect((await signIn(t, "owner@typo.example.com", SEED_ADMIN.ADMIN_PASSWORD)).id).toBe(made.id);
  }, SLOW);
});
