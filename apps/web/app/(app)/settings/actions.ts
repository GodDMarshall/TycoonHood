"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@tycoonhood/db";
import {
  accountSettings,
  AlreadyVerifiedError,
  discord,
  EmailTakenError,
  emailChangeReply,
  emailVerification,
  profiles,
  sessions,
  UsernameTakenError,
  verificationResendReply,
  VerificationRateLimitError,
  WrongPasswordError,
} from "@tycoonhood/core";
import { getCurrentSession, getCurrentUser, SESSION_COOKIE } from "../../../lib/auth";
import { mailMode } from "../../../lib/mail";
import { sendVerificationEmail } from "../../../lib/mail/verification";
import { rateLimit } from "../../../lib/rate-limit";
import { isZodError, zodMessage } from "../../../lib/form-errors";

export async function signOutEverywhereAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await sessions.destroyAllForUser(user.id);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export interface LinkCodeState { code?: string; expires?: string }

export async function generateLinkCodeAction(): Promise<LinkCodeState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { code, expires } = await discord.createLinkCode(user.id);
  return { code, expires: expires.toISOString() };
}

export async function unlinkDiscordAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await discord.unlink(user.id);
  revalidatePath("/settings");
}

export async function savePrivacyAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Merge, so facets this form does not show (achievements, courses, thc) keep their values.
  const current = await prisma.profile.findUnique({ where: { userId: user.id }, select: { privacy: true } });
  const base = current?.privacy && typeof current.privacy === "object" && !Array.isArray(current.privacy) ? (current.privacy as Record<string, unknown>) : {};
  const privacy = {
    ...base,
    level: formData.get("level") === "on",
    rank: formData.get("rank") === "on",
    streak: formData.get("streak") === "on",
    leaderboard: formData.get("leaderboard") === "on",
  };
  await prisma.profile.update({ where: { userId: user.id }, data: { privacy } });
  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/leaderboard");
}

// ─── Account & profile (spec B) ─────────────────────────────────────

export type FormState = { ok?: string; error?: string };

async function current() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}



export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await current();
  try {
    await profiles.update(user.id, {
      displayName: String(fd.get("displayName") ?? ""),
      username: String(fd.get("username") ?? ""),
      bio: String(fd.get("bio") ?? ""),
      avatarUrl: String(fd.get("avatarUrl") ?? ""),
      timezone: String(fd.get("timezone") ?? ""),
    });
  } catch (e) {
    if (isZodError(e)) return { error: zodMessage(e) };
    if (e instanceof UsernameTakenError) return { error: e.message };
    throw e;
  }
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/profile");
  return { ok: "Profile saved." };
}

export async function resendVerificationAction(_prev: FormState, _fd: FormData): Promise<FormState> {
  const { user } = await current();
  if (user.emailVerified) return { ok: "Your email is already verified." };
  // With no mail provider, say so without issuing a link: issuing would
  // replace any link already sent and use up one of the three an hour.
  if (mailMode() === "off") return verificationResendReply("no-mailer", user.email);
  // A cheap first gate for bursts in this process. The limit that counts is
  // core's: three an hour, counted and recorded in one locked transaction.
  const r = rateLimit(`verify-resend:${user.id}`, 5, 60 * 60_000);
  if (!r.ok) return { error: "Too many attempts. Try again later." };
  try {
    const outcome = await sendVerificationEmail(await emailVerification.resend(user.id));
    // A new link replaced the old one, or none is left if sending failed, so
    // the banner and the settings page re-render with where the link stands.
    revalidatePath("/settings");
    return verificationResendReply(outcome, user.email);
  } catch (e) {
    if (e instanceof VerificationRateLimitError) return { error: e.message };
    if (e instanceof AlreadyVerifiedError) return { ok: "Your email is already verified." };
    throw e;
  }
}

export async function changeEmailAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await current();
  const r = rateLimit(`email-change:${user.id}`, 5, 60 * 60_000);
  if (!r.ok) return { error: "Too many attempts. Try again later." };
  try {
    const updated = await accountSettings.changeEmail(user.id, String(fd.get("email") ?? ""), String(fd.get("password") ?? ""));
    if (!updated.emailVerified) {
      const outcome = await sendVerificationEmail(await emailVerification.issue(user.id, { reason: "email-change" }));
      revalidatePath("/settings");
      return emailChangeReply(outcome, updated.email);
    }
  } catch (e) {
    if (isZodError(e)) return { error: zodMessage(e) };
    if (e instanceof WrongPasswordError || e instanceof EmailTakenError) return { error: e.message };
    throw e;
  }
  revalidatePath("/settings");
  return { ok: "That is already your email." };
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await current();
  const r = rateLimit(`pw-change:${session.user.id}`, 5, 60 * 60_000);
  if (!r.ok) return { error: "Too many attempts. Try again later." };
  const next = String(fd.get("newPassword") ?? "");
  if (next !== String(fd.get("confirm") ?? "")) return { error: "The new passwords don't match." };
  try {
    await accountSettings.changePassword(session.user.id, String(fd.get("currentPassword") ?? ""), next, session.id);
  } catch (e) {
    if (isZodError(e)) return { error: zodMessage(e) };
    if (e instanceof WrongPasswordError) return { error: e.message };
    throw e;
  }
  revalidatePath("/settings");
  return { ok: "Password changed. Every other device was signed out." };
}

export async function signOutOtherDevicesAction() {
  const session = await current();
  await accountSettings.signOutOtherDevices(session.user.id, session.id);
  revalidatePath("/settings");
}

export async function requestDeletionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await current();
  if (fd.get("confirm") !== "on") return { error: "Tick the box to confirm you want your account deleted." };
  await accountSettings.requestDeletion(user.id, String(fd.get("note") ?? ""));
  revalidatePath("/settings");
  return { ok: "Request received. We'll email you before anything is removed." };
}
