import type { MailMode } from "@tycoonhood/core";
import { devMailer } from "./dev";
import { resendMailer } from "./resend";
import type { Mailer } from "./mailer";

/** Resend when configured; the labeled dev mailer otherwise. */
export function activeMailer(): Mailer | null {
  if (resendMailer.available) return resendMailer;
  if (devMailer.available) return devMailer;
  return null;
}

/**
 * How email works here right now: a real provider, dev-mode logging, or not
 * at all (production without RESEND_API_KEY). Pages read this to avoid
 * promising an email that cannot be sent.
 */
export function mailMode(): MailMode {
  const mailer = activeMailer();
  if (!mailer) return "off";
  return mailer.name === "dev" ? "dev" : "live";
}
export type { Mail, Mailer } from "./mailer";
