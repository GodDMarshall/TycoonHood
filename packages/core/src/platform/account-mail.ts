/**
 * ACCOUNT SECURITY EMAIL, IN WORDS (ASVS V2.2.3): the link that confirms a
 * new address, and the notices that tell an account's address what changed.
 * Pure — the web app sends them (apps/web/lib/mail/account.ts) — so the words
 * can be tested.
 *
 * A notice never shows the other address in full, because the mailbox that
 * reads it may not be the member's: it shows a masked form, "ne***@ex***.com".
 */

export interface MailCopy {
  subject: string;
  text: string;
}

/** At most two characters of a part, and only one when the part is that short. */
function keep(part: string): string {
  const chars = Array.from(part);
  return chars.slice(0, chars.length > 2 ? 2 : 1).join("");
}

/** "newname@example.com" → "ne***@ex***.com". The top-level domain stays readable. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${keep(local)}***@${keep(name)}***${tld}`;
}

/** To the address asked for: the link that confirms it. */
export function emailChangeLinkMail(link: string): MailCopy {
  return {
    subject: "Confirm your new email for Tycoonhood",
    text: [
      "Someone (hopefully you) asked to use this address for a Tycoonhood account.",
      "",
      "Confirm it with this link (valid 24 hours, single use):",
      link,
      "",
      "The account's email changes only when the link is used. If this wasn't you, ignore this email.",
    ].join("\n"),
  };
}

/** To the account's current address, when a change is asked for. */
export function emailChangeRequestedMail(newEmail: string, siteUrl: string): MailCopy {
  return {
    subject: "Someone asked to change your Tycoonhood email",
    text: [
      `Someone asked to change the email on your Tycoonhood account to ${maskEmail(newEmail)}.`,
      "",
      "Nothing changes until that address is confirmed. Until then you still sign in with this one.",
      "",
      "If this wasn't you, someone knows your password. Change it now in Settings, or reset it here:",
      `${siteUrl}/forgot-password`,
      "A new password cancels the change and signs out your other devices.",
    ].join("\n"),
  };
}

/** To the old address, once the change has happened. */
export function emailChangedMail(newEmail: string, siteUrl: string): MailCopy {
  return {
    subject: "Your Tycoonhood email was changed",
    text: [
      `The email on your Tycoonhood account is now ${maskEmail(newEmail)}. This address no longer signs in to it.`,
      "",
      "If this wasn't you, contact us right away:",
      `${siteUrl}/contact`,
    ].join("\n"),
  };
}

/** To the account's address after a password change: from Settings, or with a reset link. */
export function passwordChangedMail(via: "settings" | "reset", siteUrl: string): MailCopy {
  return {
    subject: "Your Tycoonhood password was changed",
    text: [
      via === "reset"
        ? "The password for your Tycoonhood account was changed with a reset link. Every device was signed out."
        : "The password for your Tycoonhood account was changed in Settings. Every other device was signed out.",
      "If an email change was waiting for confirmation, it was cancelled.",
      "",
      "If this wasn't you, reset your password now:",
      `${siteUrl}/forgot-password`,
      "Then contact us:",
      `${siteUrl}/contact`,
    ].join("\n"),
  };
}
