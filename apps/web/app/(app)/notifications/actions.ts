"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { getCurrentUser } from "../../../lib/auth";

export async function markAllReadAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}
