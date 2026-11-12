/**
 * The password-reset email (DR-2 / P0-2). The reset link only ever travels by
 * mail: the dev mailer logs it server-side for local development, and nothing
 * returns it to the browser in any mode.
 *
 * A link that could not be sent is revoked at once, as confirmation and
 * email-change links are (lib/mail/verification, lib/mail/account). An
 * account has at most three live reset links, so unsent ones would otherwise
 * fill them, and the owner's next request would issue nothing.
 */
import { mailWentOut, passwordReset, type MailOutcome } from "@tycoonhood/core";
import { activeMailer } from "./index";

type IssuedReset = { userId: string; email: string; rawToken: string };

export async function sendPasswordResetEmail(issued: IssuedReset): Promise<MailOutcome> {
  const outcome = await deliver(issued);
  if (!mailWentOut(outcome)) await passwordReset.revoke(issued);
  return outcome;
}

async function deliver(issued: IssuedReset): Promise<MailOutcome> {
  const mailer = activeMailer();
  if (!mailer) return "no-mailer";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${base}/reset-password/${issued.rawToken}`;
  try {
    const result = await mailer.send({
      to: issued.email,
      subject: "Reset your Tycoonhood password",
      text: `Someone (hopefully you) asked to reset this account's password.\n\nReset link (valid 30 minutes, single use):\n${link}\n\nIf this wasn't you, ignore this email — your password is unchanged and your sessions are untouched.`,
    });
    if (mailer.name === "dev") return "logged";
    if (!result.delivered) console.error(`[mail] reset email for ${issued.userId} not sent: ${result.detail.slice(0, 300)}`);
    return result.delivered ? "sent" : "failed";
  } catch (e) {
    console.error(`[mail] reset email for ${issued.userId} not sent`, e);
    return "failed";
  }
}
