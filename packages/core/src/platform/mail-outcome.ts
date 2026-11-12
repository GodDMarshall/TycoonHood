/**
 * EMAIL, DESCRIBED TRUTHFULLY. What the app may say about an email depends on
 * what actually happened to it, and on how email works on this deployment:
 *
 *  · live — a mail provider is configured; "sent" means it accepted the email.
 *  · dev  — local development only: the email is written to the server log
 *           and nothing is emailed.
 *  · off  — no mail provider (production without RESEND_API_KEY): nothing can
 *           be sent, so nothing may be described as sent.
 *
 * Pure. The web app works out the mode and the outcome; these functions only
 * choose the words, so the wording can be tested. Wherever a reply says
 * "contact us", the page shows a link to /contact next to it.
 */

/** How email works on this deployment right now. */
export type MailMode = "live" | "dev" | "off";

/** What became of one email: accepted by the provider, written to the dev log, or not sent at all. */
export type MailOutcome = "sent" | "logged" | "no-mailer" | "failed";

/** False when nothing left the building: there was no mail provider, or it refused or failed. */
export function mailWentOut(outcome: MailOutcome): boolean {
  return outcome === "sent" || outcome === "logged";
}

/**
 * Where a member's email confirmation stands, as the banner and the settings
 * page describe it:
 *  · off    — no mail provider: we cannot send a link, whatever the database holds;
 *  · sent   — a usable link exists, so one went out (failed sends are revoked);
 *  · logged — the same, in dev mode: the link is in the server log, not an inbox;
 *  · unsent — no usable link: the last one could not be sent, or it has expired.
 */
export type VerifyLinkState = "off" | "sent" | "logged" | "unsent";

export function verifyLinkState(mode: MailMode, hasLiveLink: boolean): VerifyLinkState {
  if (mode === "off") return "off";
  if (!hasLiveLink) return "unsent";
  return mode === "dev" ? "logged" : "sent";
}

const HELP = "Try again later, or contact us.";

/** The reply to "send me a new confirmation link". */
export function verificationResendReply(outcome: MailOutcome, email: string): { ok?: string; error?: string } {
  switch (outcome) {
    case "sent":
      return { ok: `Sent. Check ${email} (and spam).` };
    case "logged":
      return { ok: `Dev mode: nothing was emailed. The new link for ${email} is in the server log.` };
    case "no-mailer":
      return { error: `We couldn't send the email: email isn't available right now. ${HELP}` };
    case "failed":
      return { error: `We couldn't send the email. ${HELP}` };
  }
}

/**
 * The reply after a member asks to change their email. Nothing has changed
 * yet: the account moves only when the link sent to the new address is used.
 * `opens`, already worded in the member's zone: when that link starts to
 * work, if the change waits (their current address was never confirmed).
 */
export function emailChangeReply(outcome: MailOutcome, email: string, opens?: string): { ok?: string; error?: string } {
  const wait = opens ? ` It works from ${opens}, because your current email was never confirmed.` : "";
  switch (outcome) {
    case "sent":
      return { ok: `We sent a confirmation link to ${email}.${wait} Your email changes when you use it.` };
    case "logged":
      return { ok: `Dev mode: nothing was emailed. The confirmation link for ${email} is in the server log.${wait} Your email changes when you use it.` };
    case "no-mailer":
      return { error: `We couldn't send a confirmation link: email isn't available right now. Your email has not changed. ${HELP}` };
    case "failed":
      return { error: `We couldn't send a confirmation link to ${email}. Your email has not changed. ${HELP}` };
  }
}

/**
 * The reply to a password-reset request. It depends on the mode only — never
 * on whether an account uses the address — so it cannot reveal one. With no
 * mail provider it says so for every address, before anything is looked up.
 */
export function passwordResetReply(mode: MailMode): { done?: string; error?: string } {
  switch (mode) {
    case "live":
      return {
        done: "If an account uses that address, we've emailed it a link to reset the password. The link works for 30 minutes. If nothing arrives, check spam, then try again later or contact us.",
      };
    case "dev":
      return { done: "Dev mode: nothing was emailed. If an account uses that address, its reset link is in the server log." };
    case "off":
      return { error: `Email isn't available right now, so we can't send a reset link. ${HELP}` };
  }
}
