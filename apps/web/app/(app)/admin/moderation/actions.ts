"use server";
import { revalidatePath } from "next/cache";
import { discussions } from "@tycoonhood/core";
import { actorWith } from "../../../../lib/guard";

export async function resolveDiscussionReportAction(reportId: string, action: "hide" | "remove" | "dismiss") {
  const actor = await actorWith("community.moderate");
  if (!["hide", "remove", "dismiss"].includes(action)) return;
  // Core re-checks staff and writes the audit entry.
  await discussions.resolveReport({ id: actor.id, role: actor.role }, reportId, action);
  revalidatePath("/admin/moderation");
  revalidatePath("/community/discussions");
}
