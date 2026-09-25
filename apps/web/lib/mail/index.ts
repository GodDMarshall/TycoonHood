import { devMailer } from "./dev";
import { resendMailer } from "./resend";
import type { Mailer } from "./mailer";

/** Resend when configured; the labeled dev mailer otherwise. */
export function activeMailer(): Mailer | null {
  if (resendMailer.available) return resendMailer;
  if (devMailer.available) return devMailer;
  return null;
}
export type { Mail, Mailer } from "./mailer";
