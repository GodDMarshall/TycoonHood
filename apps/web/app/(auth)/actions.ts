"use server";
/**
 * Auth server actions. Validation errors return as field errors; the only
 * generic message is the credentials one, on purpose.
 */
import { redirect } from "next/navigation";
import {
  accounts,
  sessions,
  registerSchema,
  loginSchema,
  EmailTakenError,
  InvalidCredentialsError,
  passwordReset,
  InvalidResetTokenError,
  referrals,
  ReferralError,
} from "@tycoonhood/core";
import { activeMailer } from "../../lib/mail";
import { clearSessionCookie, deviceInfo, setSessionCookie, SESSION_COOKIE } from "../../lib/auth";
import { cookies } from "next/headers";
import { rateLimit } from "../../lib/rate-limit";

/** Throttle credential endpoints by client IP: 10 attempts / 10 minutes. */
async function throttled(bucket: string): Promise<string | null> {
  const { ip } = await deviceInfo();
  const r = rateLimit(`${bucket}:${ip ?? "unknown"}`, 10, 10 * 60_000);
  return r.ok ? null : `Too many attempts. Try again in ~${Math.max(1, Math.ceil(r.retryAfterSec / 60))} min.`;
}

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const blocked = await throttled("register");
  if (blocked) return { error: blocked };

  try {
    const user = await accounts.register(parsed.data);

    // An invite code, if they arrived through one. This records who brought
    // them and pays nobody yet — the reward lands when they finish their
    // first lesson (spec §17). A bad code must never block a signup, so the
    // failure is swallowed after the account already exists.
    const code = String(formData.get("ref") ?? "").trim();
    if (code) {
      try {
        const { ip } = await deviceInfo();
        await referrals.attach(user.id, code, ip);
      } catch (e) {
        if (!(e instanceof ReferralError)) throw e;
      }
    }

    const { raw } = await sessions.create(user.id, await deviceInfo());
    await setSessionCookie(raw);
  } catch (e) {
    if (e instanceof EmailTakenError) return { fieldErrors: { email: [e.message] } };
    throw e;
  }
  redirect("/onboarding");
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const blocked = await throttled("login");
  if (blocked) return { error: blocked };

  let destination = "/dashboard";
  try {
    const user = await accounts.authenticate(parsed.data);
    const { raw } = await sessions.create(user.id, await deviceInfo());
    await setSessionCookie(raw);
    const { prisma } = await import("@tycoonhood/db");
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    if (!profile?.onboardedAt) destination = "/onboarding";
  } catch (e) {
    if (e instanceof InvalidCredentialsError) return { error: e.message };
    throw e;
  }
  redirect(destination);
}

export async function logoutAction() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (raw) await sessions.destroy(raw);
  await clearSessionCookie();
  redirect("/login");
}

export interface ForgotState {
  sent?: boolean;
  error?: string;
  /** DEV MODE ONLY — surfaced with an explicit label so the flow is
   *  exercisable without an inbox. Never populated when a real mailer runs. */
  devLink?: string;
}

export async function forgotPasswordAction(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const blocked = await throttled("pwreset");
  if (blocked) return { error: blocked };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Enter the email you signed up with." };

  const mailer = activeMailer();
  if (!mailer) {
    return { error: "Password reset email isn't configured on this deployment yet. Contact the house." };
  }

  const { issued } = await passwordReset.requestReset(email);
  // Identical response either way — no account enumeration.
  if (!issued) return { sent: true };

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${base}/reset-password/${issued.rawToken}`;
  const result = await mailer.send({
    to: issued.email,
    subject: "Reset your Tycoonhood password",
    text: `Someone (hopefully you) asked to reset this account's password.\n\nReset link (valid 30 minutes, single use):\n${link}\n\nIf this wasn't you, ignore this email — your password is unchanged and your sessions are untouched.`,
  });

  // Never return the reset link to the browser. The dev mailer logs it
  // server-side for local development; in production the link only travels by
  // real email. (TYCOONHOOD_DECISIONS.md DR-2 / P0-2.)
  if (!result.delivered && mailer.name !== "dev") {
    return { error: "Couldn't send the email just now — try again in a minute." };
  }
  return { sent: true };
}

export interface ResetState {
  done?: boolean;
  error?: string;
}

export async function resetPasswordAction(token: string, _prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) return { error: "Passwords don't match." };
  try {
    await passwordReset.resetPassword(token, password);
  } catch (e) {
    if (e instanceof InvalidResetTokenError) return { error: e.message };
    throw e;
  }
  return { done: true };
}
