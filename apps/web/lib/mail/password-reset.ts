/**
 * The password-reset email (DR-2 / P0-2). The reset link only ever travels by
 * mail: the dev mailer logs it server-side for local development, and nothing
 * returns it to the browser in any mode.
 */
import type { MailOutcome } from "@tycoonhood/core";
import { activeMailer } from "./index";

export async function sendPasswordResetEmail(issued: { userId: string; email: string; rawToken: string }): Promise<MailOutcome> {
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
