"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { standard, StandardError } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";

export interface StandardActionState {
  error?: string;
}

async function member() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setTickAction(itemId: string, ticked: boolean): Promise<StandardActionState> {
  const user = await member();
  try {
    if (ticked) await standard.tick(user.id, itemId);
    else await standard.untick(user.id, itemId);
  } catch (e) {
    if (e instanceof StandardError) return { error: e.message };
    throw e;
  }
  revalidatePath("/today");
  return {};
}

export async function addOwnItemAction(_prev: StandardActionState, fd: FormData): Promise<StandardActionState> {
  const user = await member();
  try {
    await standard.addOwn(user.id, { title: String(fd.get("title") ?? ""), detail: String(fd.get("detail") ?? "") || null });
  } catch (e) {
    if (e instanceof StandardError) return { error: e.message };
    throw e;
  }
  revalidatePath("/today");
  return {};
}

export async function removeOwnItemAction(itemId: string): Promise<StandardActionState> {
  const user = await member();
  try {
    await standard.removeOwn(user.id, itemId);
  } catch (e) {
    if (e instanceof StandardError) return { error: e.message };
    throw e;
  }
  revalidatePath("/today");
  return {};
}
