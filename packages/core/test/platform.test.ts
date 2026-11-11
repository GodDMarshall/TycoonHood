import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "@tycoonhood/db";
import type { Prisma } from "@tycoonhood/db";
import { AccountService, AccountSuspendedError, InvalidCredentialsError } from "../src/auth/account";
import { SessionService } from "../src/auth/session";
import { ForbiddenError } from "../src/auth/permissions";
import {
  EmailVerificationService,
  InvalidVerificationTokenError,
  VerificationRateLimitError,
  AlreadyVerifiedError,
  EmailChangeEndedError,
  EmailChangeTakenError,
  NoEmailChangeError,
  VERIFY_RESEND_LIMIT,
  type EmailChangeCancelReason,
} from "../src/platform/email-verification";
import { PasswordResetService, InvalidResetTokenError } from "../src/auth/password-reset";
import { EmailTakenError } from "../src/auth/account";
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
const resets = new PasswordResetService(prisma);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const PASSWORD = "first password ok";
const address = (tag: string) => `${tag}-${uid().slice(0, 8)}@tycoonhood.test`;

/** A member who signs in with a password, as registration makes one. */
async function memberWithPassword() {
  const email = address("acct");
  const user = await accounts.register({ email, password: PASSWORD, name: "Account Case" });
  return { user, email };
}

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

  it("parallel resends cannot get past the limit", async () => {
    const user = await createTestUser();
    await verification.issue(user.id);
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => verification.resend(user.id)));
    const sent = results.filter((r) => r.status === "fulfilled");
    const refused = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(sent).toHaveLength(VERIFY_RESEND_LIMIT);
    for (const r of refused) expect(r.reason).toBeInstanceOf(VerificationRateLimitError);
    const rows = await prisma.auditLog.count({ where: { action: "auth.verify.resend", targetType: "User", targetId: user.id } });
    expect(rows).toBe(VERIFY_RESEND_LIMIT);
    // Each resend replaces the link before it, so one link is left.
    expect(await prisma.verificationToken.count({ where: { identifier: user.email } })).toBe(1);
  });

  it("a token for an old address dies when an email change takes effect", async () => {
    const { user } = await memberWithPassword();
    const { rawToken } = await verification.issue(user.id);
    const change = await accountSettings.changeEmail(user.id, address("new"), PASSWORD);
    // Asking is not changing: the current address's link still works until then.
    expect(await verification.hasLiveLink(user.email)).toBe(true);
    await verification.confirm(change!.rawToken);
    // Deleted by the change itself, not only refused later because no account has that address now.
    expect(await verification.hasLiveLink(user.email)).toBe(false);
    await expect(verification.verify(rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it("ignores garbage tokens", async () => {
    await expect(verification.verify("nope")).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it("knows whether a usable link is out: issued yes; revoked, expired or spent no", async () => {
    const user = await createTestUser();
    expect(await verification.hasLiveLink(user.email)).toBe(false);

    // Issued, then revoked because it could not be sent.
    await verification.issue(user.id);
    expect(await verification.hasLiveLink(user.email)).toBe(true);
    await verification.revokeFor(user.email);
    expect(await verification.hasLiveLink(user.email)).toBe(false);

    // Expired.
    const { rawToken } = await verification.issue(user.id);
    await prisma.verificationToken.update({ where: { token: sha256(rawToken) }, data: { expires: new Date(Date.now() - 1000) } });
    expect(await verification.hasLiveLink(user.email)).toBe(false);

    // Spent.
    const fresh = await verification.issue(user.id);
    expect(await verification.hasLiveLink(user.email)).toBe(true);
    await verification.verify(fresh.rawToken);
    expect(await verification.hasLiveLink(user.email)).toBe(false);
  });

  it("a password-reset token for the same member is not a confirmation link", async () => {
    const user = await createTestUser();
    await prisma.verificationToken.create({
      data: { identifier: `pwreset:${user.id}`, token: sha256(uid()), expires: new Date(Date.now() + 60_000) },
    });
    expect(await verification.hasLiveLink(user.email)).toBe(false);
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

describe("Reset links die when the account is secured", () => {
  it("a password change kills an outstanding reset link", async () => {
    const { user, email } = await memberWithPassword();
    const { issued } = await resets.requestReset(email);
    await accountSettings.changePassword(user.id, PASSWORD, "second password ok");
    await expect(resets.resetPassword(issued!.rawToken, "attacker password 1")).rejects.toBeInstanceOf(InvalidResetTokenError);
    await expect(accounts.authenticate({ email, password: "second password ok" })).resolves.toBeTruthy();
  });

  it("an email change kills an outstanding reset link once it takes effect", async () => {
    const { user, email } = await memberWithPassword();
    const { issued } = await resets.requestReset(email);
    const change = await accountSettings.changeEmail(user.id, address("moved"), PASSWORD);
    await verification.confirm(change!.rawToken);
    await expect(resets.resetPassword(issued!.rawToken, "attacker password 1")).rejects.toBeInstanceOf(InvalidResetTokenError);
    await expect(accounts.authenticate({ email: change!.newEmail, password: PASSWORD })).resolves.toBeTruthy();
  });

  it("a reset spends every reset link the member has, and is audited", async () => {
    const { user, email } = await memberWithPassword();
    const { issued } = await resets.requestReset(email);
    await prisma.verificationToken.create({
      data: { identifier: `pwreset:${user.id}`, token: sha256(uid()), expires: new Date(Date.now() + 60_000) },
    });
    await resets.resetPassword(issued!.rawToken, "brand new password 2");
    expect(await prisma.verificationToken.count({ where: { identifier: `pwreset:${user.id}` } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: "account.password.reset", targetId: user.id } })).toBe(1);
  });
});

describe("Email change — waits for the new address", () => {
  it("is only a request: the current address still signs in and still gets reset links", async () => {
    const { user, email } = await memberWithPassword();
    const next = address("next");
    const change = await accountSettings.changeEmail(user.id, next.toUpperCase(), PASSWORD);
    expect(change).toMatchObject({ userId: user.id, currentEmail: email, newEmail: next });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.email).toBe(email);
    expect(after.pendingEmail).toBe(next);
    await expect(accounts.authenticate({ email, password: PASSWORD })).resolves.toBeTruthy();
    await expect(accounts.authenticate({ email: next, password: PASSWORD })).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect((await resets.requestReset(email)).issued).not.toBeNull();
    expect((await resets.requestReset(next)).issued).toBeNull();

    // One link, stored as a hash under the member's change identifier.
    const row = await prisma.verificationToken.findUnique({ where: { token: sha256(change!.rawToken) } });
    expect(row?.identifier).toBe(`emailchange:${user.id}`);
    expect(await verification.hasLiveEmailChangeLink(user.id)).toBe(true);
    const log = await prisma.auditLog.findFirst({ where: { action: "account.email.change.request", targetId: user.id } });
    expect(log?.meta).toMatchObject({ from: email, to: next });
  });

  it("needs the password, and refuses an address another account uses", async () => {
    const { user } = await memberWithPassword();
    const other = await memberWithPassword();
    await expect(accountSettings.changeEmail(user.id, address("x"), "wrong password here")).rejects.toBeInstanceOf(WrongPasswordError);
    await expect(accountSettings.changeEmail(user.id, other.email.toUpperCase(), PASSWORD)).rejects.toBeInstanceOf(EmailTakenError);
    expect(await accountSettings.changeEmail(user.id, user.email, PASSWORD)).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pendingEmail).toBeNull();
  });

  it("confirming moves the account, verified, and kills the old links and every other session", async () => {
    const { user, email } = await memberWithPassword();
    const { rawToken: oldLink } = await verification.issue(user.id);
    const here = await sessions.create(user.id);
    const elsewhere = await sessions.create(user.id);
    const next = address("moved");
    const change = await accountSettings.changeEmail(user.id, next, PASSWORD);

    const done = await verification.confirm(change!.rawToken, { keepSessionId: here.session.id });
    expect(done.kind).toBe("email-change");
    expect(done.kind === "email-change" && done.previousEmail).toBe(email);
    expect(done.user.email).toBe(next);
    expect(done.user.emailVerified).toBeInstanceOf(Date);
    expect(done.user.pendingEmail).toBeNull();

    expect(await sessions.resolve(here.raw)).not.toBeNull();
    expect(await sessions.resolve(elsewhere.raw)).toBeNull();
    await expect(verification.verify(oldLink)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    expect(await prisma.verificationToken.count({ where: { identifier: { in: [email, `emailchange:${user.id}`] } } })).toBe(0);
    await expect(accounts.authenticate({ email, password: PASSWORD })).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(accounts.authenticate({ email: next, password: PASSWORD })).resolves.toBeTruthy();
    const log = await prisma.auditLog.findFirst({ where: { action: "account.email.change", targetId: user.id } });
    expect(log?.meta).toMatchObject({ from: email, to: next });
  });

  it("keeps only this member's session: a session of someone else's browser is no exemption", async () => {
    const { user } = await memberWithPassword();
    const stranger = await memberWithPassword();
    const mine = await sessions.create(user.id);
    const theirs = await sessions.create(stranger.user.id);
    const change = await accountSettings.changeEmail(user.id, address("moved"), PASSWORD);
    await verification.confirm(change!.rawToken, { keepSessionId: theirs.session.id });
    expect(await sessions.resolve(mine.raw)).toBeNull();
    expect(await sessions.resolve(theirs.raw)).not.toBeNull();
  });

  it("a link works once, expires, and is replaced by a newer request", async () => {
    const { user, email } = await memberWithPassword();
    const first = await accountSettings.changeEmail(user.id, address("first"), PASSWORD);
    const second = await accountSettings.changeEmail(user.id, address("second"), PASSWORD);
    await expect(verification.confirm(first!.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);

    await prisma.verificationToken.update({ where: { token: sha256(second!.rawToken) }, data: { expires: new Date(Date.now() - 1000) } });
    await expect(verification.confirm(second!.rawToken)).rejects.toThrow(/expired/);
    let now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(email);
    expect(now.pendingEmail).toBe(second!.newEmail); // still waiting: a new link can be sent

    const third = await verification.resendEmailChange(user.id);
    await verification.confirm(third.rawToken);
    await expect(verification.confirm(third.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(second!.newEmail);
  });

  it("an address another account took in the meantime fails cleanly and drops the request", async () => {
    const { user, email } = await memberWithPassword();
    const wanted = address("contested");
    const change = await accountSettings.changeEmail(user.id, wanted, PASSWORD);
    await accounts.register({ email: wanted, password: "someone else entirely", name: "Quicker" });

    const err = await verification.confirm(change!.rawToken).catch((e) => e);
    expect(err).toBeInstanceOf(EmailChangeTakenError);
    expect(err).toBeInstanceOf(EmailChangeEndedError);
    expect(err).toBeInstanceOf(InvalidVerificationTokenError);
    expect(err.message).toMatch(/belongs to another account/);
    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(email);
    expect(now.pendingEmail).toBeNull();
    expect(await prisma.verificationToken.count({ where: { identifier: `emailchange:${user.id}` } })).toBe(0);
    const log = await prisma.auditLog.findFirst({ where: { action: "account.email.change.cancel", targetId: user.id } });
    expect(log?.meta).toMatchObject({ to: wanted, reason: "taken" });
  });

  it("two accounts may wait for the same address; the first to confirm gets it", async () => {
    const a = await memberWithPassword();
    const b = await memberWithPassword();
    const wanted = address("shared");
    const ca = await accountSettings.changeEmail(a.user.id, wanted, PASSWORD);
    const cb = await accountSettings.changeEmail(b.user.id, wanted, PASSWORD);
    await verification.confirm(cb!.rawToken);
    await expect(verification.confirm(ca!.rawToken)).rejects.toBeInstanceOf(EmailChangeTakenError);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: b.user.id } })).email).toBe(wanted);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).email).toBe(a.email);
  });

  it("two confirmations racing for one address: one wins, the other fails cleanly", async () => {
    const a = await memberWithPassword();
    const b = await memberWithPassword();
    const wanted = address("race");
    const ca = await accountSettings.changeEmail(a.user.id, wanted, PASSWORD);
    const cb = await accountSettings.changeEmail(b.user.id, wanted, PASSWORD);
    const results = await Promise.allSettled([verification.confirm(ca!.rawToken), verification.confirm(cb!.rawToken)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const lost = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(lost?.reason).toBeInstanceOf(EmailChangeTakenError);
    const owners = await prisma.user.findMany({ where: { id: { in: [a.user.id, b.user.id] } } });
    expect(owners.filter((u) => u.email === wanted)).toHaveLength(1);
    expect(owners.every((u) => u.pendingEmail === null)).toBe(true);
  });

  it("a password change cancels a waiting change", async () => {
    const { user, email } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("hijack"), PASSWORD);
    const { cancelledEmailChange } = await accountSettings.changePassword(user.id, PASSWORD, "second password ok");
    expect(cancelledEmailChange).toBe(change!.newEmail);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pendingEmail).toBeNull();
    await expect(verification.confirm(change!.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(email);
    const log = await prisma.auditLog.findFirst({ where: { action: "account.email.change.cancel", targetId: user.id } });
    expect(log?.meta).toMatchObject({ to: change!.newEmail, reason: "password-change" });
  });

  it("a password reset cancels a waiting change", async () => {
    const { user, email } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("hijack"), PASSWORD);
    const { issued } = await resets.requestReset(email);
    await resets.resetPassword(issued!.rawToken, "reset password ok");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pendingEmail).toBeNull();
    await expect(verification.confirm(change!.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it("the member can cancel it", async () => {
    const { user } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("oops"), PASSWORD);
    expect(await accountSettings.cancelEmailChange(user.id)).toBe(change!.newEmail);
    expect(await accountSettings.cancelEmailChange(user.id)).toBeNull();
    expect(await verification.hasLiveEmailChangeLink(user.id)).toBe(false);
    await expect(verification.confirm(change!.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it("resending the link shares the three-an-hour limit with confirmation resends", async () => {
    const { user } = await memberWithPassword();
    await expect(verification.resendEmailChange(user.id)).rejects.toBeInstanceOf(NoEmailChangeError);
    const change = await accountSettings.changeEmail(user.id, address("again"), PASSWORD);
    await verification.resend(user.id);
    await verification.resend(user.id);
    const again = await verification.resendEmailChange(user.id);
    expect(again.newEmail).toBe(change!.newEmail);
    await expect(verification.confirm(change!.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError); // replaced
    await expect(verification.resendEmailChange(user.id)).rejects.toBeInstanceOf(VerificationRateLimitError);
    await expect(verification.resend(user.id)).rejects.toBeInstanceOf(VerificationRateLimitError);
  });

  it("a link whose change is over says so, and is spent", async () => {
    const { user, email } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("ended"), PASSWORD);
    await prisma.user.update({ where: { id: user.id }, data: { pendingEmail: null } });
    const err = await verification.confirm(change!.rawToken).catch((e) => e);
    expect(err).toBeInstanceOf(EmailChangeEndedError);
    expect(err.message).toMatch(/cancelled.*has not changed/);
    expect(await prisma.verificationToken.count({ where: { token: sha256(change!.rawToken) } })).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(email);
  });

  it("a link that could not be sent can be revoked, so none is live", async () => {
    const { user } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("bounce"), PASSWORD);
    await verification.revokeEmailChangeLink(change!);
    expect(await verification.hasLiveEmailChangeLink(user.id)).toBe(false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pendingEmail).toBe(change!.newEmail);
  });
});

// ── An email change racing a new password. Each helper builds the client one
// racing request uses, and runs `meanwhile` once at a chosen point in it.

type Client = typeof prisma;
const bound = (target: object, value: unknown) => (typeof value === "function" ? value.bind(target) : value);

/** `meanwhile` runs when the request opens its first transaction, which starts after it. In changeEmail that is just after the password check. */
function beforeFirstTransaction(meanwhile: () => Promise<unknown>): Client {
  let armed = true;
  return new Proxy(prisma, {
    get(target, prop) {
      const value: unknown = Reflect.get(target, prop);
      if (prop !== "$transaction" || !armed || typeof value !== "function") return bound(target, value);
      armed = false;
      return async (...args: unknown[]) => {
        await meanwhile();
        return Reflect.apply(value, target, args);
      };
    },
  });
}

/** `meanwhile` runs inside the request's first transaction, just before it first writes the member's row. */
function beforeFirstUserWrite(meanwhile: () => Promise<unknown>): Client {
  let armed = true;
  return new Proxy(prisma, {
    get(target, prop) {
      if (prop !== "$transaction") return bound(target, Reflect.get(target, prop));
      return (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        target.$transaction((tx) => {
          const user = new Proxy(tx.user, {
            get(delegate, p) {
              const value: unknown = Reflect.get(delegate, p);
              if (p !== "update" || !armed || typeof value !== "function") return bound(delegate, value);
              armed = false;
              return async (...args: unknown[]) => {
                await meanwhile();
                return Reflect.apply(value, delegate, args);
              };
            },
          });
          return fn(new Proxy(tx, { get: (t, p) => (p === "user" ? user : bound(t, Reflect.get(t, p))) }));
        });
    },
  });
}

/** Wait until a statement in this database is blocked on a lock, or `finished()` says the other request is done. */
async function untilBlockedOnLock(finished: () => boolean) {
  for (let i = 0; i < 150 && !finished(); i++) {
    const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`;
    if (n > 0) return;
    await new Promise((r) => setTimeout(r, 20));
  }
}

const NEW_PASSWORD = "owners new password";
const newPasswordBy: [string, EmailChangeCancelReason, (userId: string, email: string) => Promise<unknown>][] = [
  ["a password change in Settings", "password-change", (userId) => accountSettings.changePassword(userId, PASSWORD, NEW_PASSWORD)],
  ["a reset", "password-reset", async (_userId, email) => resets.resetPassword((await resets.requestReset(email)).issued!.rawToken, NEW_PASSWORD)],
];

describe("Email change racing a new password", () => {
  it.each(newPasswordBy)("%s that lands after the request's password check refuses the request", async (_how, _reason, setNewPassword) => {
    const { user, email } = await memberWithPassword();
    const racing = new AccountSettingsService(beforeFirstTransaction(() => setNewPassword(user.id, email)));
    await expect(racing.changeEmail(user.id, address("hijack"), PASSWORD)).rejects.toBeInstanceOf(WrongPasswordError);

    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(email);
    expect(now.pendingEmail).toBeNull();
    expect(await verification.hasLiveEmailChangeLink(user.id)).toBe(false);
    expect(await prisma.auditLog.count({ where: { action: "account.email.change.request", targetId: user.id } })).toBe(0);
    await expect(accounts.authenticate({ email, password: NEW_PASSWORD })).resolves.toBeTruthy();
  });

  it.each(newPasswordBy)("%s that arrives while the request is being written waits for it, then cancels it", async (_how, reason, setNewPassword) => {
    const { user, email } = await memberWithPassword();
    let newPassword: Promise<unknown> | undefined;
    let finished = false;
    const racing = new AccountSettingsService(
      beforeFirstUserWrite(async () => {
        newPassword = setNewPassword(user.id, email);
        newPassword.then(
          () => (finished = true),
          () => (finished = true)
        );
        await untilBlockedOnLock(() => finished);
        expect(finished).toBe(false); // it waits for the lock this request holds
      })
    );
    const change = await racing.changeEmail(user.id, address("hijack"), PASSWORD);
    await newPassword;

    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(email);
    expect(now.pendingEmail).toBeNull();
    await expect(verification.confirm(change!.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    const log = await prisma.auditLog.findFirst({ where: { action: "account.email.change.cancel", targetId: user.id } });
    expect(log?.meta).toMatchObject({ to: change!.newEmail, reason });
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
