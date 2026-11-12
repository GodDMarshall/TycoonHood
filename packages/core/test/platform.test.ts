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
  type IssuedEmailChange,
} from "../src/platform/email-verification";
import { PasswordResetService, InvalidResetTokenError, type ResetRequest } from "../src/auth/password-reset";
import { EmailTakenError } from "../src/auth/account";
import { SettingsService, SETTING_DEFAULTS, resolveSetting, InvalidSettingError } from "../src/platform/settings";
import { profileCompletion, ProfileService, privacyFromForm, privacyShows, showsCourses } from "../src/platform/profile";
import { MemberAdminService, MemberAdminError } from "../src/platform/members";
import { AccountSettingsService, WrongPasswordError } from "../src/platform/account-settings";
import { CmsService } from "../src/platform/cms";
import { EMAIL_HOLD_MS, EmailChangeTooSoonError } from "../src/platform/email-hold";
import { EmailUndoService, InvalidUndoLinkError, type UndoneEmailChange } from "../src/platform/email-undo";
import { createTestUser, uid } from "./helpers";

const verification = new EmailVerificationService(prisma);
const accounts = new AccountService(prisma);
const sessions = new SessionService(prisma);
const settingsSvc = new SettingsService(prisma);
const members = new MemberAdminService(prisma);
const accountSettings = new AccountSettingsService(prisma);
const cms = new CmsService(prisma);
const resets = new PasswordResetService(prisma);
const undos = new EmailUndoService(prisma);
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

describe("Profile privacy: certificates are opt-in", () => {
  it("hides certificates and the name on verification until the member opts in", () => {
    // The column default: courses off.
    const fresh = { level: true, rank: true, achievements: true, streak: true, courses: false, thc: false };
    expect(showsCourses(fresh)).toBe(false);
    expect(showsCourses({})).toBe(false);
    expect(showsCourses(null)).toBe(false);
    expect(showsCourses({ courses: "true" })).toBe(false);
    expect(showsCourses({ ...fresh, courses: true })).toBe(true);
    // Everything else on the card shows unless turned off.
    expect(privacyShows({}, "level")).toBe(true);
    expect(privacyShows({ level: false }, "level")).toBe(false);
    expect(privacyShows({}, "courses")).toBe(false);
  });

  it("the Settings form sets its own facets, courses included, and keeps the rest", () => {
    const stored = { level: true, rank: true, achievements: false, streak: true, courses: false, thc: true };
    const ticked = new Set(["level", "courses"]);
    const next = privacyFromForm(stored, (k) => ticked.has(k));
    expect(next).toEqual({ level: true, rank: false, achievements: false, streak: false, leaderboard: false, courses: true, thc: true });
    expect(showsCourses(next)).toBe(true);
    // Unticking it hides them again.
    expect(showsCourses(privacyFromForm(next, (k) => k === "level"))).toBe(false);
  });

  it("a member who opts in is named on verification, through the saved profile", async () => {
    const user = await createTestUser();
    const before = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(showsCourses(before.privacy)).toBe(false);
    await prisma.profile.update({ where: { userId: user.id }, data: { privacy: privacyFromForm(before.privacy, (k) => k === "courses") as object } });
    const after = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(showsCourses(after.privacy)).toBe(true);
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

/**
 * `meanwhile` runs inside the request's first transaction, at its first call of
 * `tx[model][method]`: just before it, or just after it returns.
 */
function atFirstCall(model: string, method: string, when: "before" | "after", meanwhile: () => Promise<unknown>): Client {
  let armed = true;
  return new Proxy(prisma, {
    get(target, prop) {
      if (prop !== "$transaction") return bound(target, Reflect.get(target, prop));
      return (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        target.$transaction((tx) => {
          const delegate = new Proxy(Reflect.get(tx, model) as object, {
            get(d, p) {
              const value: unknown = Reflect.get(d, p);
              if (p !== method || !armed || typeof value !== "function") return bound(d, value);
              armed = false;
              return async (...args: unknown[]) => {
                if (when === "before") await meanwhile();
                const result: unknown = await Reflect.apply(value, d, args);
                if (when === "after") await meanwhile();
                return result;
              };
            },
          });
          return fn(new Proxy(tx, { get: (t, p) => (p === model ? delegate : bound(t, Reflect.get(t, p))) }));
        });
    },
  });
}

/**
 * Wait until a statement in this database is blocked on a lock, or `finished()` says the other request is done.
 * Returns what it waits for: "advisory" for an account's lock (lockEmailOf), "transactionid" or "tuple" for a row.
 */
async function untilBlockedOnLock(finished: () => boolean): Promise<string | null> {
  for (let i = 0; i < 150 && !finished(); i++) {
    const [waiting] = await prisma.$queryRaw<{ event: string }[]>`
      SELECT wait_event AS event FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' LIMIT 1`;
    if (waiting) return waiting.event;
    await new Promise((r) => setTimeout(r, 20));
  }
  return null;
}

/** A request started in `meanwhile`, and whether it has settled yet, either way. */
type Started<T> = { promise: Promise<T>; finished: boolean };

function started<T>(work: Promise<T>): Started<T> {
  const run = { promise: work, finished: false };
  work.then(
    () => (run.finished = true),
    () => (run.finished = true)
  );
  return run;
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

// ── A resend of the change link reads the waiting address under the account's
// lock, so the link it mails always belongs to the change that is waiting then.

describe("Resending a change link while the change moves", () => {
  it("a resend that meets a new request: the link mailed to the first address never moves the account to the second", async () => {
    const { user } = await memberWithPassword();
    const first = address("first");
    await accountSettings.changeEmail(user.id, first, PASSWORD);
    const second = address("second");
    let requesting: Started<IssuedEmailChange | null> | undefined;
    let waitedOn: string | null = null;
    const racing = new EmailVerificationService(
      // The resend has read the waiting address and is about to replace the link.
      atFirstCall("verificationToken", "deleteMany", "before", async () => {
        requesting = started(accountSettings.changeEmail(user.id, second, PASSWORD));
        waitedOn = await untilBlockedOnLock(() => requesting!.finished);
      })
    );
    const resent = await racing.resendEmailChange(user.id);
    const request = (await requesting!.promise)!;
    expect(resent.newEmail).toBe(first);
    await expect(verification.confirm(resent.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    const done = await verification.confirm(request.rawToken);
    expect(done.user.email).toBe(second);
    expect(waitedOn).toBe("advisory"); // the request waited for the resend to commit
  });

  const endChange: [string, (svc: EmailVerificationService, userId: string, rawToken: string) => Promise<unknown>][] = [
    ["confirmed", (svc, _userId, rawToken) => svc.confirm(rawToken)],
    ["cancelled", (svc, userId) => svc.cancelEmailChange(userId, "member")],
  ];

  it.each(endChange)("a resend that meets the change being %s waits for it, then refuses", async (_how, end) => {
    const { user } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("moving"), PASSWORD);
    let resending: Started<IssuedEmailChange> | undefined;
    let waitedOn: string | null = null;
    const racing = new EmailVerificationService(
      // The change's link is spent and the account is about to be written.
      beforeFirstUserWrite(async () => {
        resending = started(verification.resendEmailChange(user.id));
        waitedOn = await untilBlockedOnLock(() => resending!.finished);
      })
    );
    await end(racing, user.id, change!.rawToken);
    // No link for a change that is over: before, one went to the address with a false "has not changed".
    await expect(resending!.promise).rejects.toBeInstanceOf(NoEmailChangeError);
    expect(await verification.hasLiveEmailChangeLink(user.id)).toBe(false);
    expect(waitedOn).toBe("advisory");
  });
});

// ── OQ-P: the old address is held for 7 days, and its notice carries a link that undoes the change.

/**
 * A member who has confirmed their address, as its owner would. Only a
 * confirmed address is held, with an undo link, when the account moves off
 * it; registration alone leaves it unconfirmed.
 */
async function confirmedMember() {
  const member = await memberWithPassword();
  await verification.verify((await verification.issue(member.user.id)).rawToken);
  return member;
}

/** A member whose change to a new address has just taken effect, and the undo link the old address was sent. */
async function changedMember() {
  const { user, email: oldEmail } = await confirmedMember();
  const newEmail = address("new");
  const change = await accountSettings.changeEmail(user.id, newEmail, PASSWORD);
  const done = await verification.confirm(change!.rawToken);
  if (done.kind !== "email-change" || !done.undo) throw new Error("expected an email change with an undo link");
  return { user, oldEmail, newEmail, undo: done.undo };
}

/** Move a confirmed member's email for real: ask, then use the link. Returns the undo link for the change. */
async function moveTo(userId: string, to: string) {
  const change = await accountSettings.changeEmail(userId, to, PASSWORD);
  const done = await verification.confirm(change!.rawToken);
  if (done.kind !== "email-change" || !done.undo) throw new Error("expected an email change with an undo link");
  return done.undo;
}

/**
 * A second change waiting while the last one can still be undone. Settings
 * refuses to ask for one (EmailChangeTooSoonError), so it is written here
 * directly, to test that the locks hold even if such a change existed.
 */
async function waitingChangeAnyway(userId: string, to: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { pendingEmail: to } });
    return verification.issueEmailChangeIn(tx, { id: userId, email: user.email, pendingEmail: to });
  });
}

const SQUATTER = { password: "someone else entirely", name: "Squatter" };
const TAKEN = "An account with this email already exists.";

describe("Email change — the old address is held, with an undo link", () => {
  it("holds the old address for 7 days, bound to the account and both addresses, with the link stored as a hash", async () => {
    const { user, oldEmail, newEmail, undo } = await changedMember();
    const hold = await prisma.emailHold.findUnique({ where: { undoToken: sha256(undo.rawToken) } });
    expect(hold).toMatchObject({ userId: user.id, address: oldEmail, changedTo: newEmail });
    expect(hold!.undoToken).not.toBe(undo.rawToken);
    const days = (hold!.expires.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(EMAIL_HOLD_MS / 86_400_000);
    expect(hold!.expires.getTime()).toBe(undo.expires.getTime());
  });

  it("undo puts the old address back, verified, and leaves whoever made the change nothing", async () => {
    const { user, oldEmail, newEmail, undo } = await changedMember();
    // What the person who made the change could hold by now: sessions, a reset link for the new
    // address, a confirmation link for it, and another change waiting.
    const here = await sessions.create(user.id);
    const there = await sessions.create(user.id);
    const { issued: reset } = await resets.requestReset(newEmail);
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: null } });
    const { rawToken: confirmLink } = await verification.issue(user.id);
    const third = await waitingChangeAnyway(user.id, address("third"));

    const done = await undos.undo(undo.rawToken);
    expect(done).toMatchObject({ userId: user.id, restoredEmail: oldEmail, removedEmail: newEmail });

    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(oldEmail);
    expect(now.emailVerified).toBeInstanceOf(Date);
    expect(now.pendingEmail).toBeNull();
    // Every session is signed out, this one included.
    expect(await sessions.resolve(here.raw)).toBeNull();
    expect(await sessions.resolve(there.raw)).toBeNull();
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    // Every outstanding link is dead.
    await expect(resets.resetPassword(reset!.rawToken, "attacker password 1")).rejects.toBeInstanceOf(InvalidResetTokenError);
    await expect(verification.verify(confirmLink)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    await expect(verification.confirm(third!.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    expect(await prisma.verificationToken.count({ where: { identifier: { in: [oldEmail, newEmail, `emailchange:${user.id}`] } } })).toBe(0);
    expect(await prisma.emailHold.count({ where: { userId: user.id } })).toBe(0);
    // The password they knew no longer works, at either address.
    await expect(accounts.authenticate({ email: oldEmail, password: PASSWORD })).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(accounts.authenticate({ email: newEmail, password: PASSWORD })).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(accountSettings.changeEmail(user.id, address("again"), PASSWORD)).rejects.toBeInstanceOf(WrongPasswordError);

    // One reset link is left: the new one, for the restored address. It lets the owner back in.
    const left = await prisma.verificationToken.findMany({ where: { identifier: `pwreset:${user.id}` } });
    expect(left.map((t) => t.token)).toEqual([sha256(done.reset.rawToken)]);
    await resets.resetPassword(done.reset.rawToken, "owners new password");
    await expect(accounts.authenticate({ email: oldEmail, password: "owners new password" })).resolves.toBeTruthy();

    const undoLog = await prisma.auditLog.findFirst({ where: { action: "auth.email.undo", targetId: user.id } });
    expect(undoLog?.meta).toMatchObject({ from: newEmail, to: oldEmail });
    const revokeLog = await prisma.auditLog.findFirst({ where: { action: "account.password.revoke", targetId: user.id } });
    expect(revokeLog?.meta).toMatchObject({ reason: "email-undo" });
  });

  it("an undo link works once", async () => {
    const { user, oldEmail, undo } = await changedMember();
    await undos.undo(undo.rawToken);
    await expect(undos.undo(undo.rawToken)).rejects.toBeInstanceOf(InvalidUndoLinkError);
    await expect(undos.undo("nope")).rejects.toBeInstanceOf(InvalidUndoLinkError);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
    expect(await prisma.auditLog.count({ where: { action: "auth.email.undo", targetId: user.id } })).toBe(1);
  });

  it("an expired undo link fails, changes nothing, and is spent", async () => {
    const { user, newEmail, undo } = await changedMember();
    const keep = await sessions.create(user.id);
    await prisma.emailHold.update({ where: { undoToken: sha256(undo.rawToken) }, data: { expires: new Date(Date.now() - 1000) } });
    await expect(undos.undo(undo.rawToken)).rejects.toThrow(/expired/);
    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(newEmail);
    expect(await sessions.resolve(keep.raw)).not.toBeNull();
    await expect(accounts.authenticate({ email: newEmail, password: PASSWORD })).resolves.toBeTruthy();
    expect(await prisma.emailHold.count({ where: { undoToken: sha256(undo.rawToken) } })).toBe(0);
    await expect(undos.undo(undo.rawToken)).rejects.toThrow(/not valid/);
  });

  it("a link is refused, and spent, once the account no longer has the address its change set", async () => {
    // Every change retires the earlier links first; this is the check behind that, should an address ever move another way.
    const { user, oldEmail, undo } = await changedMember();
    const elsewhere = address("elsewhere");
    await prisma.user.update({ where: { id: user.id }, data: { email: elsewhere } });
    await expect(undos.undo(undo.rawToken)).rejects.toThrow(/changed again since/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(elsewhere);
    expect(await prisma.emailHold.count({ where: { undoToken: sha256(undo.rawToken) } })).toBe(0);
    // The hold itself stays: the address is still kept for the account.
    await expect(accounts.register({ email: oldEmail, ...SQUATTER })).rejects.toThrow(TAKEN);
  });

  it("no second change while the last one can still be undone: refused, with the day it opens", async () => {
    const { user, newEmail } = await changedMember();
    const refused = await accountSettings.changeEmail(user.id, address("second"), PASSWORD).catch((e) => e);
    expect(refused).toBeInstanceOf(EmailChangeTooSoonError);
    const hold = await prisma.emailHold.findFirstOrThrow({ where: { userId: user.id } });
    expect(refused.until.getTime()).toBe(hold.expires.getTime());
    expect(refused.message).toContain(hold.expires.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" }));
    expect(refused.message).toMatch(/undo link/);
    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(newEmail);
    expect(now.pendingEmail).toBeNull();
    expect(await prisma.verificationToken.count({ where: { identifier: `emailchange:${user.id}` } })).toBe(0);
  });

  it("a change is allowed again once the last one's undo was used", async () => {
    const { user, undo } = await changedMember();
    const done = await undos.undo(undo.rawToken);
    await resets.resetPassword(done.reset.rawToken, NEW_PASSWORD);
    const next = address("after-undo");
    await expect(accountSettings.changeEmail(user.id, next, NEW_PASSWORD)).resolves.toMatchObject({ newEmail: next });
  });

  it("a change is allowed again once the last one can no longer be undone (7 days, or its link spent)", async () => {
    const ranOut = await changedMember();
    await prisma.emailHold.updateMany({ where: { userId: ranOut.user.id }, data: { expires: new Date(Date.now() - 1000) } });
    await expect(moveTo(ranOut.user.id, address("later"))).resolves.toBeTruthy();

    // A link refused because the account moved another way is spent, and the hold stays without it.
    const spent = await changedMember();
    await prisma.user.update({ where: { id: spent.user.id }, data: { email: address("elsewhere") } });
    await expect(undos.undo(spent.undo.rawToken)).rejects.toThrow(/changed again since/);
    await expect(moveTo(spent.user.id, address("onward"))).resolves.toBeTruthy();
    await expect(accounts.register({ email: spent.oldEmail, ...SQUATTER })).rejects.toThrow(TAKEN);
  });

  it("a held address is refused by registration, a change request and a confirmation, in the words a taken one gets", async () => {
    // A member who asked for an address while it was free, before another account took it and moved on.
    const asker = await memberWithPassword();
    const held = address("held");
    const waiting = await accountSettings.changeEmail(asker.user.id, held, PASSWORD);
    const owner = await accounts.register({ email: held, password: PASSWORD, name: "Owner" });
    await verification.verify((await verification.issue(owner.id)).rawToken); // only a confirmed address is held
    await moveTo(owner.id, address("onward")); // `held` is now held for `owner`

    const registered = await accounts.register({ email: held, ...SQUATTER }).catch((e) => e);
    expect(registered).toBeInstanceOf(EmailTakenError);
    expect(registered.message).toBe(TAKEN);
    expect(await prisma.user.count({ where: { email: held } })).toBe(0);

    const other = await memberWithPassword();
    const asked = await accountSettings.changeEmail(other.user.id, held, PASSWORD).catch((e) => e);
    const askedTaken = await accountSettings.changeEmail(other.user.id, asker.email, PASSWORD).catch((e) => e);
    expect(asked).toBeInstanceOf(EmailTakenError);
    expect(asked.message).toBe(askedTaken.message);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: other.user.id } })).pendingEmail).toBeNull();

    const confirmed = await verification.confirm(waiting!.rawToken).catch((e) => e);
    expect(confirmed).toBeInstanceOf(EmailChangeTakenError);
    expect(confirmed.message).toBe(new EmailChangeTakenError().message);
    const now = await prisma.user.findUniqueOrThrow({ where: { id: asker.user.id } });
    expect(now.email).toBe(asker.email);
    expect(now.pendingEmail).toBeNull();
  });

  it("the hold ends when the undo is used, and the address it removed is not held", async () => {
    const { user, oldEmail, newEmail, undo } = await changedMember();
    await undos.undo(undo.rawToken);
    expect(await prisma.emailHold.count({ where: { address: { in: [oldEmail, newEmail] } } })).toBe(0);
    await expect(accounts.register({ email: newEmail, ...SQUATTER })).resolves.toMatchObject({ email: newEmail });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
  });

  it("the hold ends when it runs out", async () => {
    const { oldEmail } = await changedMember();
    await expect(accounts.register({ email: oldEmail, ...SQUATTER })).rejects.toThrow(TAKEN);
    await prisma.emailHold.update({ where: { address: oldEmail }, data: { expires: new Date(Date.now() - 1000) } });
    await expect(accounts.register({ email: oldEmail, ...SQUATTER })).resolves.toMatchObject({ email: oldEmail });
  });

  it("the hold ends when the member moves back to the address, which then holds the one they left", async () => {
    const { user, oldEmail, newEmail, undo: first } = await changedMember();
    // Possible once the link is spent and the hold stays, as a refused undo leaves it.
    await prisma.emailHold.updateMany({ where: { userId: user.id }, data: { undoToken: null } });
    const back = await moveTo(user.id, oldEmail); // held for this account, so it may ask for it
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
    expect(await prisma.emailHold.count({ where: { address: oldEmail } })).toBe(0);
    await expect(undos.undo(first.rawToken)).rejects.toBeInstanceOf(InvalidUndoLinkError);
    const hold = await prisma.emailHold.findUnique({ where: { undoToken: sha256(back.rawToken) } });
    expect(hold).toMatchObject({ userId: user.id, address: newEmail, changedTo: oldEmail });
  });

  it("staff with admin.users can cancel a waiting change, audited as theirs; other staff cannot", async () => {
    const { user, email } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("waiting"), PASSWORD);
    const admin = await createTestUser();
    const mod = await createTestUser();
    await expect(members.cancelEmailChange({ id: mod.id, role: "MODERATOR" }, user.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pendingEmail).toBe(change!.newEmail);

    expect(await members.cancelEmailChange({ id: admin.id, role: "ADMIN" }, user.id)).toBe(change!.newEmail);
    expect(await members.cancelEmailChange({ id: admin.id, role: "ADMIN" }, user.id)).toBeNull();
    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.pendingEmail).toBeNull();
    expect(now.email).toBe(email);
    await expect(verification.confirm(change!.rawToken)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    const log = await prisma.auditLog.findFirst({ where: { action: "account.email.change.cancel", targetId: user.id } });
    expect(log?.actorId).toBe(admin.id);
    expect(log?.meta).toMatchObject({ to: change!.newEmail, reason: "staff" });
  });
});

// ── An address the member never confirmed may not be theirs (a typo at
// registration). It is not held and gets no undo link, which would hand the
// account to whoever reads it.

describe("Email change away from an address never confirmed", () => {
  it("holds nothing and makes no undo link: the address is free at once, and the next change need not wait", async () => {
    const { user, email: oldEmail } = await memberWithPassword(); // registration leaves the address unconfirmed
    const newEmail = address("fixed");
    const change = await accountSettings.changeEmail(user.id, newEmail, PASSWORD);
    const done = await verification.confirm(change!.rawToken);
    expect(done).toMatchObject({ kind: "email-change", previousEmail: oldEmail, undo: null });
    expect(done.user).toMatchObject({ email: newEmail, emailVerified: expect.any(Date) });
    expect(await prisma.emailHold.count({ where: { OR: [{ userId: user.id }, { address: oldEmail }] } })).toBe(0);
    // Whoever reads that mailbox can sign up with it straight away.
    await expect(accounts.register({ email: oldEmail, ...SQUATTER })).resolves.toMatchObject({ email: oldEmail });
    // Nothing can undo the change, so nothing holds up the next one.
    const next = address("next");
    await expect(accountSettings.changeEmail(user.id, next, PASSWORD)).resolves.toMatchObject({ newEmail: next });
  });

  it("still ends what the change makes moot: the last undo link, and the hold on the address it moves back to", async () => {
    const { user, oldEmail, newEmail, undo } = await changedMember();
    const back = await waitingChangeAnyway(user.id, oldEmail);
    // The address it leaves is unconfirmed again, as the undo test above makes one.
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: null } });
    const done = await verification.confirm(back.rawToken);
    expect(done).toMatchObject({ kind: "email-change", previousEmail: newEmail, undo: null });
    expect(await prisma.emailHold.count({ where: { userId: user.id } })).toBe(0);
    await expect(undos.undo(undo.rawToken)).rejects.toBeInstanceOf(InvalidUndoLinkError);
    await expect(accounts.register({ email: newEmail, ...SQUATTER })).resolves.toMatchObject({ email: newEmail });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
  });
});

describe("Undo racing another change", () => {
  it("an undo and another change confirmed at the same moment: exactly one wins", async () => {
    const { user, oldEmail, undo } = await changedMember();
    const third = address("third");
    const change = await waitingChangeAnyway(user.id, third);
    const [undone, moved] = await Promise.allSettled([undos.undo(undo.rawToken), verification.confirm(change!.rawToken)]);
    expect([undone.status, moved.status].filter((s) => s === "fulfilled")).toHaveLength(1);
    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(undone.status === "fulfilled" ? oldEmail : third);
    expect(now.pendingEmail).toBeNull();
  });

  it("a change confirmed while an undo is being written waits for it, then fails", async () => {
    const { user, oldEmail, undo } = await changedMember();
    const change = await waitingChangeAnyway(user.id, address("third"));
    let confirming: Promise<unknown> | undefined;
    let finished = false;
    const racing = new EmailUndoService(
      beforeFirstUserWrite(async () => {
        confirming = verification.confirm(change!.rawToken);
        confirming.then(
          () => (finished = true),
          () => (finished = true)
        );
        await untilBlockedOnLock(() => finished);
        expect(finished).toBe(false); // it waits for the lock the undo holds
      })
    );
    await racing.undo(undo.rawToken);
    await expect(confirming).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(oldEmail);
    expect(now.pendingEmail).toBeNull();
    expect(await prisma.emailHold.count({ where: { userId: user.id } })).toBe(0);
  });

  it("an undo used while another change is being confirmed waits for it, then fails", async () => {
    const { user, newEmail, undo } = await changedMember();
    const third = address("third");
    const change = await waitingChangeAnyway(user.id, third);
    let undoing: Promise<unknown> | undefined;
    let finished = false;
    const racing = new EmailVerificationService(
      beforeFirstUserWrite(async () => {
        undoing = undos.undo(undo.rawToken);
        undoing.then(
          () => (finished = true),
          () => (finished = true)
        );
        await untilBlockedOnLock(() => finished);
        expect(finished).toBe(false); // it waits for the lock the confirmation holds
      })
    );
    const done = await racing.confirm(change!.rawToken);
    await expect(undoing).rejects.toBeInstanceOf(InvalidUndoLinkError);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(third);
    await expect(accounts.authenticate({ email: third, password: PASSWORD })).resolves.toBeTruthy();
    // The latest change's link is the one that works now.
    if (done.kind !== "email-change" || !done.undo) throw new Error("expected an email change with an undo link");
    expect(await prisma.emailHold.findUnique({ where: { undoToken: sha256(done.undo.rawToken) } })).toMatchObject({
      address: newEmail,
      changedTo: third,
    });
  });

  it("a sign-in that matched the old password before an undo cannot open a session after it", async () => {
    const { user, newEmail, undo } = await changedMember();
    const racing = new AccountService(beforeFirstTransaction(() => undos.undo(undo.rawToken)));
    await expect(racing.signIn({ email: newEmail, password: PASSWORD })).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("a password change that checked the old password before an undo cannot land after it", async () => {
    const { user, oldEmail, undo } = await changedMember();
    const racing = new AccountSettingsService(beforeFirstTransaction(() => undos.undo(undo.rawToken)));
    await expect(racing.changePassword(user.id, PASSWORD, "attackers new password")).rejects.toBeInstanceOf(WrongPasswordError);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
    await expect(accounts.authenticate({ email: oldEmail, password: "attackers new password" })).rejects.toBeInstanceOf(
      InvalidCredentialsError
    );
  });
});

// ── A reset request is made under the account's lock, for the address the
// account has then, and never takes a live link away.

describe("Reset requests", () => {
  it("a request that straddles an undo issues nothing for the address the undo removed", async () => {
    const { user, newEmail, undo } = await changedMember();
    let requesting: Started<ResetRequest> | undefined;
    const racing = new EmailUndoService(
      // The undo has deleted the account's links and has not committed yet.
      atFirstCall("verificationToken", "deleteMany", "after", async () => {
        requesting = started(resets.requestReset(newEmail));
        await untilBlockedOnLock(() => requesting!.finished);
      })
    );
    const done = await racing.undo(undo.rawToken);
    expect((await requesting!.promise).issued).toBeNull();
    // The only reset link is the one the undo handed to the owner's browser.
    const links = await prisma.verificationToken.findMany({ where: { identifier: `pwreset:${user.id}` } });
    expect(links.map((t) => t.token)).toEqual([sha256(done.reset.rawToken)]);
  });

  it("a request that straddles a confirmed change issues nothing for the address the change replaced", async () => {
    const { user, email } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("moved"), PASSWORD);
    let requesting: Started<ResetRequest> | undefined;
    const racing = new EmailVerificationService(
      // The change has deleted the old address's links and has not committed yet.
      atFirstCall("session", "deleteMany", "before", async () => {
        requesting = started(resets.requestReset(email));
        await untilBlockedOnLock(() => requesting!.finished);
      })
    );
    await racing.confirm(change!.rawToken);
    expect((await requesting!.promise).issued).toBeNull();
    expect(await prisma.verificationToken.count({ where: { identifier: `pwreset:${user.id}` } })).toBe(0);
  });

  it("a request after an undo leaves the reset link the undo handed over working", async () => {
    const { oldEmail, undo } = await changedMember();
    const done = await undos.undo(undo.rawToken);
    // Anyone who knows the restored address can ask for a link. It goes to that address, and the owner's stays.
    expect((await resets.requestReset(oldEmail)).issued).not.toBeNull();
    await resets.resetPassword(done.reset.rawToken, NEW_PASSWORD);
    await expect(accounts.authenticate({ email: oldEmail, password: NEW_PASSWORD })).resolves.toBeTruthy();
  });

  it("at most three live links per account: a fourth request issues nothing, a link that ran out makes room", async () => {
    const { user, email } = await memberWithPassword();
    const links = [];
    for (let i = 0; i < 3; i++) links.push((await resets.requestReset(email)).issued);
    expect(links.every((l) => l !== null)).toBe(true);
    // The same answer an unknown address gets, so the reply cannot tell them apart either.
    expect(await resets.requestReset(email)).toEqual({ issued: null });
    expect(await prisma.verificationToken.count({ where: { identifier: `pwreset:${user.id}` } })).toBe(3);

    await prisma.verificationToken.update({ where: { token: sha256(links[0]!.rawToken) }, data: { expires: new Date(Date.now() - 1000) } });
    const fourth = (await resets.requestReset(email)).issued;
    expect(fourth).not.toBeNull();
    expect(await prisma.verificationToken.count({ where: { identifier: `pwreset:${user.id}` } })).toBe(3);

    // Any live link works, and using one spends them all.
    await resets.resetPassword(links[1]!.rawToken, NEW_PASSWORD);
    expect(await prisma.verificationToken.count({ where: { identifier: `pwreset:${user.id}` } })).toBe(0);
    await expect(resets.resetPassword(fourth!.rawToken, "another password ok")).rejects.toBeInstanceOf(InvalidResetTokenError);
  });
});

// ── Every flow that changes an account's password, address or links takes the
// account's lock (lockEmailOf) first. Two of them at the same moment then run one
// after the other: the second waits on that lock, and never on a row the first
// holds, which is how they used to deadlock (spend a link, then need the
// credential; or delete a link the other flow still needs).

describe("Account flows wait for each other instead of deadlocking", () => {
  it("an undo used while a reset is being written waits for it, then undoes the change", async () => {
    const { user, oldEmail, newEmail, undo } = await changedMember();
    // Whoever made the change resets the password through the new address.
    const { issued } = await resets.requestReset(newEmail);
    let undoing: Started<UndoneEmailChange> | undefined;
    let waitedOn: string | null = null;
    const racing = new PasswordResetService(
      // The reset has spent its link and is about to write the password.
      atFirstCall("verificationToken", "deleteMany", "after", async () => {
        undoing = started(undos.undo(undo.rawToken));
        waitedOn = await untilBlockedOnLock(() => undoing!.finished);
        expect(undoing.finished).toBe(false);
      })
    );
    await racing.resetPassword(issued!.rawToken, "attackers new password");
    const done = await undoing!.promise;
    expect(waitedOn).toBe("advisory");

    // The undo landed second, so it wins: the old address is back and the password the reset set is gone.
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
    for (const email of [oldEmail, newEmail]) {
      await expect(accounts.authenticate({ email, password: "attackers new password" })).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
    await resets.resetPassword(done.reset.rawToken, NEW_PASSWORD);
    await expect(accounts.authenticate({ email: oldEmail, password: NEW_PASSWORD })).resolves.toBeTruthy();
  });

  const setNewPasswordThrough: [string, (db: Client, userId: string, resetLink: string) => Promise<unknown>][] = [
    ["a reset", (db, _userId, resetLink) => new PasswordResetService(db).resetPassword(resetLink, NEW_PASSWORD)],
    ["a password change in Settings", (db, userId) => new AccountSettingsService(db).changePassword(userId, PASSWORD, NEW_PASSWORD)],
  ];

  it.each(setNewPasswordThrough)("a change confirmed while %s is being written waits for it, then fails cleanly", async (_how, setNewPassword) => {
    const { user, email } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("hijack"), PASSWORD);
    // A reset link is out, as the notice about the change request suggests.
    const { issued } = await resets.requestReset(email);
    let confirming: Started<unknown> | undefined;
    let waitedOn: string | null = null;
    const racing = atFirstCall("verificationToken", "deleteMany", "after", async () => {
      confirming = started(verification.confirm(change!.rawToken));
      waitedOn = await untilBlockedOnLock(() => confirming!.finished);
      expect(confirming.finished).toBe(false);
    });
    await setNewPassword(racing, user.id, issued!.rawToken);
    // The new password cancelled the change, so the link no longer works: a clean refusal, not a driver error.
    await expect(confirming!.promise).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    expect(waitedOn).toBe("advisory");

    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now.email).toBe(email);
    expect(now.pendingEmail).toBeNull();
    await expect(accounts.authenticate({ email, password: NEW_PASSWORD })).resolves.toBeTruthy();
  });

  it("a reset submitted while a change is being confirmed waits for it, then fails cleanly", async () => {
    const { user, email } = await memberWithPassword();
    const change = await accountSettings.changeEmail(user.id, address("moved"), PASSWORD);
    const { issued } = await resets.requestReset(email);
    let resetting: Started<unknown> | undefined;
    let waitedOn: string | null = null;
    const racing = new EmailVerificationService(
      beforeFirstUserWrite(async () => {
        resetting = started(resets.resetPassword(issued!.rawToken, NEW_PASSWORD));
        waitedOn = await untilBlockedOnLock(() => resetting!.finished);
        expect(resetting.finished).toBe(false);
      })
    );
    await racing.confirm(change!.rawToken);
    // The change took effect first and ended every reset link for the old address.
    await expect(resetting!.promise).rejects.toBeInstanceOf(InvalidResetTokenError);
    expect(waitedOn).toBe("advisory");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(change!.newEmail);
    await expect(accounts.authenticate({ email: change!.newEmail, password: PASSWORD })).resolves.toBeTruthy();
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
