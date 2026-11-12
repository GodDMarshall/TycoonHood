/**
 * Email changes whose undo notice never went out (platform/email-notice).
 * The hold records when its notice was sent. A change older than the grace
 * with no such record is put back: by the sweep, and first thing in a new
 * change request and a reset request for either address.
 */
import { describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { AccountService } from "../src/auth/account";
import { PasswordResetService } from "../src/auth/password-reset";
import { AccountSettingsService } from "../src/platform/account-settings";
import { EmailVerificationService } from "../src/platform/email-verification";
import { EmailUndoService, InvalidUndoLinkError } from "../src/platform/email-undo";
import { NOTICE_GRACE_MS, undoLinkState } from "../src/platform/email-notice";
import { uid } from "./helpers";

const accounts = new AccountService(prisma);
const verification = new EmailVerificationService(prisma);
const accountSettings = new AccountSettingsService(prisma);
const resets = new PasswordResetService(prisma);
const undos = new EmailUndoService(prisma);
const PASSWORD = "first password ok";
const address = (tag: string) => `${tag}-${uid().slice(0, 8)}@tycoonhood.test`;

/** A confirmed member whose change to a new address has just taken effect. Its notice is not recorded as sent. */
async function changed() {
  const oldEmail = address("old");
  const user = await accounts.register({ email: oldEmail, password: PASSWORD, name: "Notice Case" });
  await verification.verify((await verification.issue(user.id)).rawToken);
  const newEmail = address("new");
  const change = await accountSettings.changeEmail(user.id, newEmail, PASSWORD);
  const done = await verification.confirm(change!.rawToken);
  if (done.kind !== "email-change" || !done.undo) throw new Error("expected an email change with an undo link");
  return { user, oldEmail, newEmail, undo: done.undo };
}

/** As if the account's change took effect `ms` ago. */
async function madeAgo(userId: string, ms: number) {
  await prisma.emailHold.updateMany({ where: { userId }, data: { createdAt: new Date(Date.now() - ms) } });
}

const STALE = NOTICE_GRACE_MS + 60_000;
const emailOf = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).email;

describe("A change whose undo notice was never recorded as sent", () => {
  it("is put back once it is older than the grace: the old address is the account's again, and the link never works", async () => {
    const { user, oldEmail, newEmail, undo } = await changed();
    await madeAgo(user.id, STALE);
    expect(await undos.putBackUnnotified({ userId: user.id })).toBe(1);
    expect(await emailOf(user.id)).toBe(oldEmail);
    expect(await prisma.emailHold.count({ where: { userId: user.id } })).toBe(0);
    await expect(undos.undo(undo.rawToken)).rejects.toBeInstanceOf(InvalidUndoLinkError);
    // Only the telling failed: the password stays.
    await expect(accounts.authenticate({ email: oldEmail, password: PASSWORD })).resolves.toBeTruthy();
    const log = await prisma.auditLog.findFirst({ where: { action: "account.email.change.revert", targetId: user.id } });
    expect(log?.meta).toMatchObject({ from: newEmail, to: oldEmail, reason: "notice-not-sent" });
  });

  it("is left alone while its notice is still being sent, once the notice is recorded as sent, and after its hold ran out", async () => {
    const sending = await changed();
    const told = await changed();
    await undos.markNoticeSent(told.undo.rawToken);
    await madeAgo(told.user.id, STALE);
    const over = await changed();
    await madeAgo(over.user.id, STALE);
    await prisma.emailHold.updateMany({ where: { userId: over.user.id }, data: { expires: new Date(Date.now() - 1000) } });
    // Once its hold runs out the old address is free, and someone else may have it now.
    await accounts.register({ email: over.oldEmail, password: "someone else entirely", name: "Newcomer" });

    for (const m of [sending, told, over]) {
      expect(await undos.putBackUnnotified({ userId: m.user.id })).toBe(0);
      expect(await emailOf(m.user.id)).toBe(m.newEmail);
    }
    // The link that was sent still works.
    await expect(undos.undo(told.undo.rawToken)).resolves.toMatchObject({ restoredEmail: told.oldEmail });
  });

  it("is put back before the account asks for another change, which then goes ahead from the old address", async () => {
    const { user, oldEmail } = await changed();
    await madeAgo(user.id, STALE);
    // Not refused as too soon: the change it would wait for was never told to the old address.
    const next = await accountSettings.changeEmail(user.id, address("next"), PASSWORD);
    expect(next?.currentEmail).toBe(oldEmail);
    expect(await emailOf(user.id)).toBe(oldEmail);
  });

  it.each(["old", "new"] as const)("is put back before a reset request for its %s address", async (which) => {
    const { user, oldEmail, newEmail } = await changed();
    await madeAgo(user.id, STALE);
    const { issued } = await resets.requestReset(which === "old" ? oldEmail : newEmail);
    expect(await emailOf(user.id)).toBe(oldEmail);
    // A link goes only to the address the account has again: the owner's.
    expect(issued?.email ?? null).toBe(which === "old" ? oldEmail : null);
  });
});

describe("Where an undo link stands, as the admin page says it", () => {
  it("sent, being sent, never sent, or ended", () => {
    const now = new Date();
    const ago = (ms: number) => new Date(now.getTime() - ms);
    expect(undoLinkState({ undoToken: "h", noticeSentAt: ago(0), createdAt: ago(2 * NOTICE_GRACE_MS) }, now)).toBe("sent");
    expect(undoLinkState({ undoToken: "h", noticeSentAt: null, createdAt: ago(1_000) }, now)).toBe("sending");
    expect(undoLinkState({ undoToken: "h", noticeSentAt: null, createdAt: ago(NOTICE_GRACE_MS + 1) }, now)).toBe("unsent");
    expect(undoLinkState({ undoToken: null, noticeSentAt: ago(0), createdAt: ago(0) }, now)).toBe("ended");
  });
});
