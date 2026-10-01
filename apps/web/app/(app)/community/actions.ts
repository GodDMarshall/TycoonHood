"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { community, CommunityError, type MessageView } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rate-limit";

async function viewer() {
  const user = await getCurrentUser();
  if (!user?.profile?.onboardedAt) redirect("/login");
  return { id: user.id, role: user.role };
}

export interface SendResult {
  message?: MessageView;
  error?: string;
}

export async function sendMessageAction(
  slug: string,
  input: { body: string; proofUrl?: string | null; replyToId?: string | null }
): Promise<SendResult> {
  const v = await viewer();
  if (!rateLimit(`post:${v.id}`, 6, 30_000).ok) return { error: "You are posting very fast. Give it a few seconds." };
  try {
    const message = await community.post(v, slug, {
      body: String(input.body ?? ""),
      proofUrl: input.proofUrl ?? null,
      replyToId: input.replyToId ?? null,
    });
    return { message };
  } catch (e) {
    if (e instanceof CommunityError) return { error: e.message };
    throw e;
  }
}

/** Mark a channel read up to now. `refresh` re-renders the unread badges in
 *  the shell — done when a channel is opened, not on every poll. */
export async function markReadAction(channelId: string, refresh = false) {
  const v = await viewer();
  await community.markRead(v.id, channelId);
  if (refresh) revalidatePath("/", "layout");
}

export async function removeMessageAction(messageId: string): Promise<{ error?: string }> {
  const v = await viewer();
  try {
    await community.remove(v, messageId);
    return {};
  } catch (e) {
    if (e instanceof CommunityError) return { error: e.message };
    throw e;
  }
}

export async function reportMessageAction(messageId: string, reason: string): Promise<{ error?: string; ok?: boolean }> {
  const v = await viewer();
  if (!rateLimit(`report:${v.id}`, 10, 60_000).ok) return { error: "Too many reports at once. Try again in a minute." };
  try {
    await community.report(v, messageId, reason);
    return { ok: true };
  } catch (e) {
    if (e instanceof CommunityError) return { error: e.message };
    throw e;
  }
}

export async function pinMessageAction(messageId: string, pinned: boolean): Promise<{ error?: string }> {
  const v = await viewer();
  try {
    await community.setPinned(v, messageId, pinned);
    return {};
  } catch (e) {
    if (e instanceof CommunityError) return { error: e.message };
    throw e;
  }
}
