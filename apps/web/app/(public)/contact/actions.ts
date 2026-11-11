"use server";
/** Public contact form → ContactMessage. Honeypot + per-IP rate limit; validation lives in core. */
import { cms } from "@tycoonhood/core";
import { deviceInfo } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rate-limit";
import { isZodError, zodMessage } from "../../../lib/form-errors";

export interface ContactState {
  sent?: boolean;
  error?: string;
}

export async function contactAction(_prev: ContactState, fd: FormData): Promise<ContactState> {
  // Honeypot: a field people never see. Bots fill it; we pretend success and store nothing.
  if (String(fd.get("website") ?? "").trim()) return { sent: true };

  const { ip } = await deviceInfo();
  const r = rateLimit(`contact:${ip ?? "unknown"}`, 5, 60 * 60_000);
  if (!r.ok) return { error: `You've sent several messages already. Try again in about ${Math.max(1, Math.ceil(r.retryAfterSec / 60))} min.` };

  try {
    await cms.submitContact({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      topic: String(fd.get("topic") ?? "") as "General",
      message: String(fd.get("message") ?? ""),
    });
  } catch (e) {
    if (isZodError(e)) return { error: zodMessage(e) };
    throw e;
  }
  return { sent: true };
}
