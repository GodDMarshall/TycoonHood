"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { discussions, DiscussionError } from "@tycoonhood/core";
import { getCurrentUser } from "../../../../lib/auth";

async function viewer() {
  const user = await getCurrentUser();
  if (!user?.profile?.onboardedAt) redirect("/login");
  return { id: user.id, role: user.role };
}

export async function joinGroupAction(groupId: string, slug: string) {
  const v = await viewer();
  try {
    await discussions.joinGroup(v, groupId);
  } catch (e) {
    if (!(e instanceof DiscussionError)) throw e;
  }
  revalidatePath("/community/groups");
  revalidatePath(`/community/groups/${slug}`);
}

export async function leaveGroupAction(groupId: string, slug: string) {
  const v = await viewer();
  await discussions.leaveGroup(v, groupId);
  revalidatePath("/community/groups");
  revalidatePath(`/community/groups/${slug}`);
}
