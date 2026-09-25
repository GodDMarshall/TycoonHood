/** RESEND ADAPTER. Fully coded; activates when RESEND_API_KEY is set.
 *  Untested against live Resend from this environment (no key) — the call
 *  follows Resend's documented POST /emails contract, same status as the
 *  Stripe adapter. MAIL_FROM must be a verified sender on your domain. */
import type { Mailer } from "./mailer";

export const resendMailer: Mailer = {
  name: "resend",
  get available() {
    return !!process.env.RESEND_API_KEY;
  },
  async send(mail) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { delivered: false, detail: "RESEND_API_KEY not set." };
    const from = process.env.MAIL_FROM ?? "Tycoonhood <no-reply@tycoonhood.local>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!res.ok) return { delivered: false, detail: `Resend ${res.status}: ${await res.text()}` };
    return { delivered: true, detail: "Accepted by Resend." };
  },
};
