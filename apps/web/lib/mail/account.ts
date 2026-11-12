/**
 * Account security email (ASVS V2.2.3): the link that confirms a new address,
 * the notices that tell an account's address what changed, and the link that
 * undoes an email change. The words live in core (platform/account-mail.ts),
 * where they are tested.
 *
 * Same discipline as lib/mail/verification: the link only ever travels by
 * mail, and a link that could not be sent is revoked at once, so a usable
 * link in the database means one went out and the settings page can say so.
 *
 * Notices are best effort. They are sent after the change they report has
 * happened, and a mail failure is logged, never thrown, so it can never block
 * or undo that change. One is not: the notice that carries the link undoing
 * an email change. That link exists only in the request that made the
 * change, so the caller reads the outcome and puts the change back if the
 * notice did not go out (see verifyEmailAction).
 */
import { cache } from "react";
import {
  emailChangedMail,
  emailChangedUnconfirmedMail,
  emailChangeLinkMail,
  emailChangeRequestedMail,
  emailChangeUndoneMail,
  emailChangeUndoneRemovedMail,
  emailVerification,
  mailWentOut,
  passwordChangedMail,
  verifyLinkState,
  type IssuedEmailChange,
  type MailCopy,
  type MailOutcome,
} from "@tycoonhood/core";
import { activeMailer, mailMode } from "./index";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** `what` names the email in the server log; it never carries an address or a link. */
async function deliver(to: string, copy: MailCopy, what: string): Promise<MailOutcome> {
  const mailer = activeMailer();
  if (!mailer) return "no-mailer";
  try {
    const result = await mailer.send({ to, ...copy });
    if (mailer.name === "dev") return "logged";
    if (!result.delivered) console.error(`[mail] ${what} not sent: ${result.detail.slice(0, 300)}`);
    return result.delivered ? "sent" : "failed";
  } catch (e) {
    console.error(`[mail] ${what} not sent`, e);
    return "failed";
  }
}

/** A notice: logged when it does not go out, never thrown. */
async function notice(to: string, copy: MailCopy, what: string): Promise<void> {
  try {
    const outcome = await deliver(to, copy, what);
    if (!mailWentOut(outcome)) console.warn(`[mail] ${what}: ${outcome}`);
  } catch (e) {
    console.error(`[mail] ${what} failed`, e);
  }
}

/** The link that confirms a new address, to that address. Revoked if it could not be sent. */
export async function sendEmailChangeLink(issued: IssuedEmailChange): Promise<MailOutcome> {
  const link = `${siteUrl()}/verify-email/${issued.rawToken}`;
  const outcome = await deliver(issued.newEmail, emailChangeLinkMail(link), `email-change link for ${issued.userId}`);
  if (!mailWentOut(outcome)) await emailVerification.revokeEmailChangeLink(issued);
  return outcome;
}

/** To the current address: a change was asked for, and what to do if it wasn't them. */
export function sendEmailChangeRequestedNotice(issued: IssuedEmailChange): Promise<void> {
  return notice(issued.currentEmail, emailChangeRequestedMail(issued.newEmail, siteUrl()), `email-change notice for ${issued.userId}`);
}

/** To the old address, once the change has happened, with the link that undoes it. The caller reads the outcome. */
export function sendEmailChangedNotice(userId: string, previousEmail: string, newEmail: string, undoToken: string): Promise<MailOutcome> {
  const undoLink = `${siteUrl()}/undo-email/${undoToken}`;
  return deliver(previousEmail, emailChangedMail(newEmail, undoLink), `email-changed notice for ${userId}`);
}

/** To an old address that was never confirmed, once the change has happened: told, with no undo link. */
export function sendEmailChangedUnconfirmedNotice(userId: string, previousEmail: string, newEmail: string): Promise<void> {
  return notice(previousEmail, emailChangedUnconfirmedMail(newEmail, siteUrl()), `email-changed notice for ${userId}`);
}

/** After an undo: a confirmation to the address put back, and a notice to the address taken off. */
export async function sendEmailChangeUndoneNotices(userId: string, restoredEmail: string, removedEmail: string): Promise<void> {
  await Promise.all([
    notice(restoredEmail, emailChangeUndoneMail(removedEmail, siteUrl()), `email-undone confirmation for ${userId}`),
    notice(removedEmail, emailChangeUndoneRemovedMail(restoredEmail, siteUrl()), `email-undone notice for ${userId}`),
  ]);
}

/** To the account's address, after a password change in Settings or with a reset link. */
export function sendPasswordChangedNotice(userId: string, email: string, via: "settings" | "reset"): Promise<void> {
  return notice(email, passwordChangedMail(via, siteUrl()), `password notice for ${userId}`);
}

/** Where the link for this member's waiting email change stands (see verifyLinkState). */
export const emailChangeLinkStateFor = cache(async (userId: string) => {
  const mode = mailMode();
  return verifyLinkState(mode, mode !== "off" && (await emailVerification.hasLiveEmailChangeLink(userId)));
});
