"use server";
/**
 * Auth server actions. Validation errors return as field errors; the only
 * generic message is the credentials one, on purpose.
 */
import { redirect } from "next/navigation";
import { after } from "next/server";
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
  AccountSuspendedError,
  emailVerification,
  emailUndo,
  EmailChangeEndedError,
  getSetting,
  InvalidUndoLinkError,
  InvalidVerificationTokenError,
  safeNextPath,
  mailWentOut,
  passwordResetReply,
} from "@tycoonhood/core";
import { sendVerificationEmail } from "../../lib/mail/verification";
import { sendPasswordResetEmail } from "../../lib/mail/password-reset";
import { sendEmailChangedNotice, sendEmailChangeUndoneNotices, sendPasswordChangedNotice } from "../../lib/mail/account";
import { mailMode } from "../../lib/mail";
import { clearSessionCookie, deviceInfo, getCurrentSession, setSessionCookie, SESSION_COOKIE } from "../../lib/auth";
import { cookies } from "next/headers";
import { rateLimit } from "../../lib/rate-limit";

const THROTTLE_WINDOW_MS = 10 * 60_000;

function tooManyAttempts(retryAfterSec: number): string {
  return `Too many attempts. Try again in ~${Math.max(1, Math.ceil(retryAfterSec / 60))} min.`;
}

/** Throttle credential endpoints by client IP: 10 attempts / 10 minutes. */
async function throttled(bucket: string): Promise<string | null> {
  const { ip } = await deviceInfo();
  const r = rateLimit(`${bucket}:${ip ?? "unknown"}`, 10, THROTTLE_WINDOW_MS);
  return r.ok ? null : tooManyAttempts(r.retryAfterSec);
}

/**
 * Throttle sign-in per account as well, so guesses spread over many addresses
 * still stop: 20 attempts / 10 minutes per email. It counts every address
 * typed, whether or not an account has it, and says exactly what the per-IP
 * limit says, so it never reveals whether an account exists.
 */
function throttledAccount(email: string): string | null {
  const r = rateLimit(`login-email:${email.trim().toLowerCase()}`, 20, THROTTLE_WINDOW_MS);
  return r.ok ? null : tooManyAttempts(r.retryAfterSec);
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
  if (!(await getSetting("platform")).signupsOpen) {
    return { error: "New sign-ups are paused for the moment. Please check back soon." };
  }

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

    // Verification never blocks the journey: the member goes on to onboarding
    // and the app shows a banner until the link is clicked. A link that could
    // not be sent is revoked, so the banner says it was not sent (rather than
    // "we sent a link") and offers to try again or contact us.
    try {
      const outcome = await sendVerificationEmail(await emailVerification.issue(user.id, { reason: "register" }));
      if (!mailWentOut(outcome)) console.warn(`[verify] verification email not sent for ${user.id}: ${outcome}`);
    } catch (e) {
      console.error("[verify] could not issue verification email", e);
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
  // The IP check runs first, so one address cannot fill someone's account bucket on its own.
  const blocked = (await throttled("login")) ?? throttledAccount(parsed.data.email);
  if (blocked) return { error: blocked };

  // Back to the page that sent them here, when it is a safe path on this site.
  let destination = safeNextPath(formData.get("next")) ?? "/today";
  try {
    const { user, raw } = await accounts.signIn(parsed.data, await deviceInfo());
    await setSessionCookie(raw);
    const { prisma } = await import("@tycoonhood/db");
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    if (!profile?.onboardedAt) destination = "/onboarding";
  } catch (e) {
    if (e instanceof InvalidCredentialsError) return { error: e.message };
    if (e instanceof AccountSuspendedError) return { error: e.message };
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

/**
 * The forgot-password form's state. It never carries the reset link: that
 * only ever travels by email (TYCOONHOOD_DECISIONS.md DR-2 / P0-2).
 */
export interface ForgotState {
  /** The reply after a request — the same words whether or not an account uses the address. */
  done?: string;
  error?: string;
}

export async function forgotPasswordAction(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const blocked = await throttled("pwreset");
  if (blocked) return { error: blocked };

  // No mail provider at all: say so before anything is looked up, so every
  // address gets the same answer and it reveals nothing about accounts.
  const mode = mailMode();
  if (mode === "off") return passwordResetReply("off");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Enter the email you signed up with." };

  const { issued } = await passwordReset.requestReset(email);
  if (issued) {
    const outcome = await sendPasswordResetEmail(issued);
    // A failed send is logged, not shown: an error only for addresses that
    // have an account would reveal which ones do. The reply below already
    // says what to do if nothing arrives.
    if (!mailWentOut(outcome)) console.warn(`[reset] reset email not sent for ${issued.userId}: ${outcome}`);
  }
  // Identical response either way — no account enumeration.
  return passwordResetReply(mode);
}

export interface ResetState {
  done?: boolean;
  error?: string;
}

export async function resetPasswordAction(token: string, _prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) return { error: "Passwords don't match." };
  let user;
  try {
    user = await passwordReset.resetPassword(token, password);
  } catch (e) {
    if (e instanceof InvalidResetTokenError) return { error: e.message };
    throw e;
  }
  // After the response: a notice never holds up or undoes the reset.
  const { id, email } = user;
  after(() => sendPasswordChangedNotice(id, email, "reset"));
  return { done: true };
}

export interface VerifyState {
  /** What the link did: confirmed the member's address, or moved the account to a new one. */
  done?: "verified" | "email-changed";
  /** The account's address now, after an email change. */
  email?: string;
  /** Whether this browser is signed in as the member the link was for. */
  signedIn?: boolean;
  error?: string;
  /** False when a new link cannot help: the email change it was for is over. */
  retry?: boolean;
}

/**
 * Uses a link from an email: a confirmation link, or the link that confirms
 * an email change. A POST behind a button, so mail scanners that prefetch
 * links cannot spend it.
 */
export async function verifyEmailAction(token: string, _prev: VerifyState, _fd: FormData): Promise<VerifyState> {
  const blocked = await throttled("verify");
  if (blocked) return { error: blocked };
  // An email change signs out every other session; this browser's stays if it is the member's.
  const session = await getCurrentSession();
  let result;
  try {
    result = await emailVerification.confirm(token, { keepSessionId: session?.id });
  } catch (e) {
    if (e instanceof EmailChangeEndedError) return { error: e.message, retry: false };
    if (e instanceof InvalidVerificationTokenError) return { error: e.message };
    throw e;
  }
  const signedIn = session?.user.id === result.user.id;
  if (result.kind === "email-change") {
    const { user, previousEmail, undo } = result;
    // The old address gets the link that undoes the change; it is held for the account meanwhile.
    after(() => sendEmailChangedNotice(user.id, previousEmail, user.email, undo.rawToken));
    return { done: "email-changed", email: user.email, signedIn };
  }
  return { done: "verified", signedIn };
}

export interface UndoState {
  error?: string;
}

/**
 * Uses the link in the "your email was changed" notice: puts the old address
 * back, signs out every device and replaces the password. A POST behind a
 * button, like verifyEmailAction, so mail scanners cannot spend it. Then this
 * browser goes straight to the new-password page with a fresh reset link: it
 * just proved control of the restored address, which is what a reset link
 * proves.
 */
export async function undoEmailChangeAction(token: string, _prev: UndoState, _fd: FormData): Promise<UndoState> {
  const blocked = await throttled("undo-email");
  if (blocked) return { error: blocked };
  let undone;
  try {
    undone = await emailUndo.undo(token);
  } catch (e) {
    if (e instanceof InvalidUndoLinkError) return { error: e.message };
    throw e;
  }
  const { userId, restoredEmail, removedEmail } = undone;
  after(() => sendEmailChangeUndoneNotices(userId, restoredEmail, removedEmail));
  redirect(`/reset-password/${undone.reset.rawToken}?undone=1`);
}
