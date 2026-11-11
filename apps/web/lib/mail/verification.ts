/**
 * The verification email. Same discipline as the reset email (DR-2 / P0-2):
 * the link only ever travels by mail. The dev mailer logs it server-side for
 * local development; nothing returns it to the browser in any mode.
 */
import type { IssuedVerification } from "@tycoonhood/core";
import { activeMailer } from "./index";

export type SendResult = { sent: true } | { sent: false; reason: "no-mailer" | "failed" };

export async function sendVerificationEmail(issued: IssuedVerification): Promise<SendResult> {
  const mailer = activeMailer();
  if (!mailer) return { sent: false, reason: "no-mailer" };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${base}/verify-email/${issued.rawToken}`;
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
  if (!result.delivered && mailer.name !== "dev") return { sent: false, reason: "failed" };
  return { sent: true };
}
