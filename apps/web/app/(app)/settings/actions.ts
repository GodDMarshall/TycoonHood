"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@tycoonhood/db";
import { discord, sessions } from "@tycoonhood/core";
import { getCurrentUser, SESSION_COOKIE } from "../../../lib/auth";

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
  const privacy = {
    level: formData.get("level") === "on",
    rank: formData.get("rank") === "on",
    streak: formData.get("streak") === "on",
  };
  await prisma.profile.update({ where: { userId: user.id }, data: { privacy } });
  revalidatePath("/settings");
  revalidatePath("/leaderboard");
}
