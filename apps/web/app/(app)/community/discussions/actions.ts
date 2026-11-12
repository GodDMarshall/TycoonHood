"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { discussions, DiscussionError, isStaff, type TargetType } from "@tycoonhood/core";
import { getCurrentUser } from "../../../../lib/auth";

export interface FormState {
  ok?: string;
  error?: string;
}

async function viewer() {
  const user = await getCurrentUser();
  if (!user?.profile?.onboardedAt) redirect("/login");
  return { id: user.id, role: user.role };
}

async function attempt<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await fn() };
  } catch (e) {
    if (e instanceof DiscussionError) return { error: e.message };
    throw e;
  }
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const target = (t: string): TargetType => (t === "comment" ? "comment" : "post");

export async function createPostAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = await viewer();
  const groupId = str(fd, "groupId") || null;
  const r = await attempt(() =>
    discussions.createPost(v, {
      title: str(fd, "title"),
      body: str(fd, "body"),
      categoryId: groupId ? null : str(fd, "categoryId") || null,
      groupId,
    })
  );
  if (r.error) return { error: r.error };
  revalidatePath("/community/discussions");
  if (groupId) revalidatePath("/community/groups", "layout");
  redirect(`/community/discussions/${r.value!.id}`);
}

export async function editPostAction(postId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const v = await viewer();
  const r = await attempt(() => discussions.editPost(v, postId, { title: str(fd, "title"), body: str(fd, "body") }));
  if (r.error) return { error: r.error };
  revalidatePath(`/community/discussions/${postId}`);
  redirect(`/community/discussions/${postId}`);
}

export async function deletePostAction(postId: string) {
  const v = await viewer();
  const r = await attempt(() => discussions.deletePost(v, postId));
  if (r.error) return;
  revalidatePath("/community/discussions");
  redirect("/community/discussions");
}

export async function commentAction(postId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const v = await viewer();
  const r = await attempt(() => discussions.comment(v, postId, str(fd, "body")));
  if (r.error) return { error: r.error };
  revalidatePath(`/community/discussions/${postId}`);
  return { ok: "Posted." };
}

export async function deleteCommentAction(postId: string, commentId: string) {
  const v = await viewer();
  await attempt(() => discussions.deleteComment(v, commentId));
  revalidatePath(`/community/discussions/${postId}`);
}

export async function reactAction(postId: string, type: string, id: string, kind: string): Promise<{ on?: boolean; error?: string }> {
  const v = await viewer();
  const r = await attempt(() => discussions.toggleReaction(v, { type: target(type), id }, kind));
  if (r.error) return { error: r.error };
  revalidatePath(`/community/discussions/${postId}`);
  return { on: r.value!.on };
}

export async function reportAction(type: string, id: string, reason: string): Promise<{ ok?: boolean; error?: string }> {
  const v = await viewer();
  const r = await attempt(() => discussions.report(v, { type: target(type), id }, reason));
  if (r.error) return { error: r.error };
  return { ok: true };
}

// ─────────────────────────────── staff (re-authorized in core: isStaff)

async function staff() {
  const v = await viewer();
  if (!isStaff(v)) throw new Error("You do not have permission to do that.");
  return v;
}

export async function pinAction(postId: string, pinned: boolean) {
  const v = await staff();
  await discussions.setPinned(v, postId, pinned);
  revalidatePath(`/community/discussions/${postId}`);
  revalidatePath("/community/discussions");
}

export async function lockAction(postId: string, locked: boolean) {
  const v = await staff();
  await discussions.setLocked(v, postId, locked);
  revalidatePath(`/community/discussions/${postId}`);
}

export async function moderateAction(postId: string, type: string, id: string, state: "VISIBLE" | "HIDDEN" | "REMOVED") {
  const v = await staff();
  if (!["VISIBLE", "HIDDEN", "REMOVED"].includes(state)) return;
  await discussions.moderate(v, { type: target(type), id }, state);
  revalidatePath(`/community/discussions/${postId}`);
  revalidatePath("/community/discussions");
  revalidatePath("/admin/moderation");
}
