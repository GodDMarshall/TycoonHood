import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "@tycoonhood/db";
import { AccountService, AccountSuspendedError, InvalidCredentialsError } from "../src/auth/account";
import { SessionService } from "../src/auth/session";
import { ForbiddenError } from "../src/auth/permissions";
import {
  EmailVerificationService,
  InvalidVerificationTokenError,
  VerificationRateLimitError,
  AlreadyVerifiedError,
} from "../src/platform/email-verification";
import { SettingsService, SETTING_DEFAULTS, resolveSetting, InvalidSettingError } from "../src/platform/settings";
import { profileCompletion, ProfileService } from "../src/platform/profile";
import { MemberAdminService, MemberAdminError } from "../src/platform/members";
import { AccountSettingsService, WrongPasswordError } from "../src/platform/account-settings";
import { CmsService } from "../src/platform/cms";
import { createTestUser, uid } from "./helpers";

const verification = new EmailVerificationService(prisma);
const accounts = new AccountService(prisma);
const sessions = new SessionService(prisma);
const settingsSvc = new SettingsService(prisma);
const members = new MemberAdminService(prisma);
const accountSettings = new AccountSettingsService(prisma);
const cms = new CmsService(prisma);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

describe("Email verification — token lifecycle", () => {
  it("stores only the hash, keyed by email, expiring in 24h", async () => {
    const user = await createTestUser();
    const issued = await verification.issue(user.id);
    const row = await prisma.verificationToken.findUnique({ where: { token: sha256(issued.rawToken) } });
    expect(row?.identifier).toBe(user.email);
    expect(row?.token).not.toBe(issued.rawToken);
    const hours = (row!.expires.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
  });

  it("verifies once, then the link is spent", async () => {
    const user = await createTestUser();
    const { rawToken } = await verification.issue(user.id);
    const verified = await verification.verify(rawToken);
    expect(verified.emailVerified).toBeInstanceOf(Date);
    await expect(verification.verify(rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    await expect(verification.issue(user.id)).rejects.toBeInstanceOf(AlreadyVerifiedError);
  });

  it("refuses an expired token", async () => {
    const user = await createTestUser();
    const { rawToken } = await verification.issue(user.id);
    await prisma.verificationToken.update({ where: { token: sha256(rawToken) }, data: { expires: new Date(Date.now() - 1000) } });
    await expect(verification.verify(rawToken)).rejects.toThrow(/expired/);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.emailVerified).toBeNull();
  });

  it("re-issuing invalidates the previous link", async () => {
    const user = await createTestUser();
    const first = await verification.issue(user.id);
    const second = await verification.issue(user.id);
    await expect(verification.verify(first.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    expect((await verification.verify(second.rawToken)).emailVerified).toBeInstanceOf(Date);
  });

  it("limits resends to 3 an hour", async () => {
    const user = await createTestUser();
    await verification.issue(user.id); // the registration email does not count
    await verification.resend(user.id);
    await verification.resend(user.id);
    await verification.resend(user.id);
    await expect(verification.resend(user.id)).rejects.toBeInstanceOf(VerificationRateLimitError);
  });

  it("a token for an old address dies when the email changes", async () => {
    const user = await createTestUser();
    await prisma.passwordCredential.create({ data: { userId: user.id, hash: await (await import("../src/auth/password")).hashPassword("long enough password") } });
    const { rawToken } = await verification.issue(user.id);
    await accountSettings.changeEmail(user.id, `new-${uid().slice(0, 8)}@tycoonhood.test`, "long enough password");
    await expect(verification.verify(rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it("ignores garbage tokens", async () => {
    await expect(verification.verify("nope")).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });
});

describe("Suspended accounts", () => {
  it("cannot sign in, and existing sessions stop resolving", async () => {
    const email = `susp-${uid().slice(0, 8)}@tycoonhood.test`;
    const user = await accounts.register({ email, password: "correct horse battery", name: "S" });
    const { raw } = await sessions.create(user.id);
    expect((await sessions.resolve(raw))?.user.id).toBe(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } });
    await expect(accounts.authenticate({ email, password: "correct horse battery" })).rejects.toBeInstanceOf(AccountSuspendedError);
    // A wrong password still gets the generic error — suspension is not revealed to guessers.
    await expect(accounts.authenticate({ email, password: "wrong password!!" })).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(await sessions.resolve(raw)).toBeNull();
  });

  it("suspending through the admin service signs the member out everywhere", async () => {
    const admin = await createTestUser();
    const adminActor = { id: admin.id, role: "ADMIN" as const };
    const target = await createTestUser();
    await sessions.create(target.id);
    await members.setSuspended(adminActor, target.id, true, "test");
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0);
    const log = await prisma.auditLog.findFirst({ where: { action: "user.suspend", targetId: target.id } });
    expect(log?.actorId).toBe(admin.id);
    await members.setSuspended(adminActor, target.id, false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).suspendedAt).toBeNull();
  });
});

describe("Role changes", () => {
  it("non-admins cannot change roles", async () => {
    const mod = await createTestUser();
    const target = await createTestUser();
    await expect(members.changeRole({ id: mod.id, role: "MODERATOR" }, target.id, "ADMIN")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(members.changeRole({ id: mod.id, role: "MEMBER" }, target.id, "ADMIN")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("admins can, with an audit row, but never on themselves", async () => {
    const admin = await createTestUser();
    const actor = { id: admin.id, role: "ADMIN" as const };
    const target = await createTestUser();
    const updated = await members.changeRole(actor, target.id, "INSTRUCTOR");
    expect(updated.role).toBe("INSTRUCTOR");
    const log = await prisma.auditLog.findFirst({ where: { action: "user.role.change", targetId: target.id } });
    expect(log?.meta).toMatchObject({ from: "MEMBER", to: "INSTRUCTOR" });
    await expect(members.changeRole(actor, admin.id, "MEMBER")).rejects.toBeInstanceOf(MemberAdminError);
  });
});

describe("Site settings", () => {
  it("returns typed defaults when nothing is stored", async () => {
    await prisma.siteSetting.deleteMany({ where: { key: "contact" } });
    expect(await settingsSvc.get("contact")).toEqual(SETTING_DEFAULTS.contact);
  });

  it("stores, reads back and audits", async () => {
    const admin = await createTestUser();
    const before = await settingsSvc.get("platform");
    try {
      await settingsSvc.set("platform", { signupsOpen: false, maintenanceBanner: "Back soon" }, admin.id);
      expect(await settingsSvc.get("platform")).toEqual({ signupsOpen: false, maintenanceBanner: "Back soon" });
      const log = await prisma.auditLog.findFirst({ where: { action: "settings.update", targetId: "platform", actorId: admin.id } });
      expect(log).not.toBeNull();
    } finally {
      await settingsSvc.set("platform", before, admin.id);
    }
  });

  it("rejects invalid values and merges partial stored ones field by field", async () => {
    await expect(settingsSvc.set("contact", { supportEmail: "not-an-email" }, null)).rejects.toBeInstanceOf(InvalidSettingError);
    const merged = resolveSetting("home", { heroLead: "A new lead.", sections: { founder: false }, heroLines: "bad" });
    expect(merged.heroLead).toBe("A new lead.");
    expect(merged.heroLines).toEqual(SETTING_DEFAULTS.home.heroLines);
    expect(merged.sections.founder).toBe(false);
    expect(merged.sections.programmes).toBe(true);
  });
});

describe("Profile completion", () => {
  it("scores real fields only", () => {
    const empty = profileCompletion({ emailVerified: null, profile: null });
    expect(empty.score).toBe(0);
    expect(empty.missing).toHaveLength(empty.total);

    const partial = profileCompletion({
      emailVerified: new Date(),
      profile: { displayName: "Asha", username: "asha", bio: "  ", avatarUrl: null, timezone: "Asia/Kolkata", goals: ["Grow my income"] },
    });
    expect(partial.done).toBe(5);
    expect(partial.missing.map((m) => m.key).sort()).toEqual(["avatar", "bio"]);
    expect(partial.score).toBe(Math.round((5 / 7) * 100));
  });

  it("profile updates validate username and https-only avatars", async () => {
    const user = await createTestUser();
    const svc = new ProfileService(prisma);
    const base = { displayName: "Name", username: `p_${uid().slice(0, 8)}`, bio: "", avatarUrl: "", timezone: "Europe/London" };
    await expect(svc.update(user.id, { ...base, avatarUrl: "http://example.com/a.png" })).rejects.toThrow(/https/);
    await expect(svc.update(user.id, { ...base, username: "admin" })).rejects.toThrow(/reserved/);
    await expect(svc.update(user.id, { ...base, timezone: "Mars/Olympus" })).rejects.toThrow(/time zone/);
    const saved = await svc.update(user.id, { ...base, avatarUrl: "https://example.com/a.png" });
    expect(saved.avatarUrl).toBe("https://example.com/a.png");
    expect(saved.bio).toBeNull();
  });
});

describe("Account settings", () => {
  it("password change needs the current password and revokes other sessions", async () => {
    const email = `pw-${uid().slice(0, 8)}@tycoonhood.test`;
    const user = await accounts.register({ email, password: "first password ok", name: "P" });
    const keep = await sessions.create(user.id);
    const other = await sessions.create(user.id);
    await expect(accountSettings.changePassword(user.id, "wrong one here", "second password ok", keep.session.id)).rejects.toBeInstanceOf(
      WrongPasswordError
    );
    await accountSettings.changePassword(user.id, "first password ok", "second password ok", keep.session.id);
    expect(await sessions.resolve(keep.raw)).not.toBeNull();
    expect(await sessions.resolve(other.raw)).toBeNull();
    await expect(accounts.authenticate({ email, password: "second password ok" })).resolves.toBeTruthy();
  });

  it("deletion is a request for staff, never a hard delete, and is idempotent", async () => {
    const user = await createTestUser();
    const a = await accountSettings.requestDeletion(user.id, "moving on");
    const b = await accountSettings.requestDeletion(user.id);
    expect(a.id).toBe(b.id);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });
});

describe("Testimonials and announcements", () => {
  it("cannot save a story without a consent date", async () => {
    const admin = await createTestUser();
    const actor = { id: admin.id, role: "ADMIN" as const };
    await expect(
      cms.saveTestimonial(actor, { name: "X", role: "", quote: "A real story here.", consentAt: "", published: true })
    ).rejects.toThrow();
    const t = await cms.saveTestimonial(actor, { name: "X", role: "", quote: "A real story here.", consentAt: "2026-11-01", published: false });
    expect(t.published).toBe(false);
    await cms.deleteTestimonial(actor, t.id);
  });

  it("announcements need admin.content", async () => {
    const mod = await createTestUser();
    await expect(cms.announce({ id: mod.id, role: "MODERATOR" }, { title: "Hello all", role: "ADMIN" })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
