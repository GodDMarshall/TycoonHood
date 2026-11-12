"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { standard, StandardError } from "@tycoonhood/core";
import { getCurrentUser } from "../../../../lib/auth";

export interface AdminState {
  ok?: string;
  error?: string;
}

async function staff() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/today");
}

export async function saveHouseItemAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await staff();
  try {
    const item = await standard.saveHouseItem({
      id: String(fd.get("id") ?? "") || undefined,
      title: String(fd.get("title") ?? ""),
      detail: String(fd.get("detail") ?? ""),
      autoEvent: String(fd.get("autoEvent") ?? "") || null,
      sortOrder: Number(fd.get("sortOrder") ?? 0),
    });
    revalidatePath("/admin/standard");
    revalidatePath("/today");
    return { ok: `Saved “${item.title}”. Every member sees it from their next visit.` };
  } catch (e) {
    if (e instanceof StandardError) return { error: e.message };
    throw e;
  }
}

export async function setHouseItemActiveAction(id: string, active: boolean) {
  await staff();
  await standard.setHouseItemActive(id, active);
  revalidatePath("/admin/standard");
  revalidatePath("/today");
}
