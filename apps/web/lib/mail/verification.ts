/**
 * The verification email. Same discipline as the reset email (DR-2 / P0-2):
 * the link only ever travels by mail. The dev mailer logs it server-side for
 * local development; nothing returns it to the browser in any mode.
 *
 * A link that could not be sent is revoked at once. So a usable link in the
 * database always means one went out (or was logged, in dev mode), and the
 * banner and settings page can say "we sent a link" only when that is true.
 */
import { cache } from "react";
import { emailVerification, mailWentOut, verifyLinkState, type IssuedVerification, type MailOutcome } from "@tycoonhood/core";
import { activeMailer, mailMode } from "./index";

export async function sendVerificationEmail(issued: IssuedVerification): Promise<MailOutcome> {
  const outcome = await deliver(issued);
  if (!mailWentOut(outcome)) await emailVerification.revokeFor(issued.email);
  return outcome;
}

async function deliver(issued: IssuedVerification): Promise<MailOutcome> {
  const mailer = activeMailer();
  if (!mailer) return "no-mailer";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${base}/verify-email/${issued.rawToken}`;
  try {
    const result = await mailer.send({
      to: issued.email,
      subject: "Confirm your email for Tycoonhood",
      text: [
        "Welcome to Tycoonhood.",
        "",
        "Confirm this is your email address (link valid 24 hours, single use):",
        link,
        "",
        "If you didn't create an account, ignore this email — nothing happens without the click.",
      ].join("\n"),
    });
    if (mailer.name === "dev") return "logged";
    if (!result.delivered) console.error(`[mail] verification email for ${issued.userId} not sent: ${result.detail.slice(0, 300)}`);
    return result.delivered ? "sent" : "failed";
  } catch (e) {
    console.error(`[mail] verification email for ${issued.userId} not sent`, e);
    return "failed";
  }
}

/** Where this member's confirmation link stands; read once per request by the banner and the settings page. */
export const verifyLinkStateFor = cache(async (email: string) => {
  const mode = mailMode();
  return verifyLinkState(mode, mode !== "off" && (await emailVerification.hasLiveLink(email)));
});
