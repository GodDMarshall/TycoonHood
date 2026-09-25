"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@tycoonhood/db";
import { WATCH } from "@tycoonhood/config";
import { requireAdmin } from "../../../../lib/guard";
import { extractVideoId, parseDuration } from "../../../../lib/youtube";

export interface VideoFormState { error?: string; message?: string; notes?: string[] }

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;


export async function saveVideoAction(_prev: VideoFormState, fd: FormData): Promise<VideoFormState> {
  await requireAdmin();

  const slug = str(fd.get("slug"));
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug must be lowercase letters, numbers and hyphens — 3 to 50 characters." };
  }
  const title = str(fd.get("title"));
  if (!title) return { error: "Give the task a title — it is what members see in the list." };

  const videoId = extractVideoId(str(fd.get("video")));
  if (!videoId) {
    return { error: "That is not a YouTube link or id. Paste the watch URL, the share link, or the 11-character id." };
  }

  const durationSec = parseDuration(str(fd.get("duration")));
  if (!durationSec || durationSec < 15) {
    return { error: "Enter the video length — like 9:42, or 582 for seconds. Under 15 seconds is not worth paying for." };
  }

  const requiredRaw = str(fd.get("required"));
  const requiredSec = requiredRaw
    ? parseDuration(requiredRaw)
    : Math.floor(durationSec * WATCH.defaultRequiredFraction);
  if (!requiredSec || requiredSec <= 0) return { error: "Required watch time must be a real length." };
  if (requiredSec > durationSec) {
    return { error: "Required watch time cannot be longer than the video." };
  }

  const rewardThcRaw = str(fd.get("rewardThc"));
  let rewardThc: bigint;
  try {
    rewardThc = rewardThcRaw ? BigInt(rewardThcRaw.replace(/[,\s]/g, "")) : 0n;
  } catch {
    return { error: "THC reward must be a whole number." };
  }
  const rewardXp = Number(str(fd.get("rewardXp")) || "0");
  if (!Number.isFinite(rewardXp) || rewardXp < 0) return { error: "XP must be zero or more." };
  if (rewardThc <= 0n && rewardXp <= 0) {
    return { error: "A task that pays nothing is not a task. Set THC, XP, or both." };
  }

  const active = fd.get("active") === "on";

  const data = {
    title,
    description: str(fd.get("description")) || null,
    youtubeVideoId: videoId,
    durationSec,
    requiredSec,
    rewardThc,
    rewardXp: Math.round(rewardXp),
    active,
    publishedAt: active ? new Date() : null,
    sortOrder: Number(str(fd.get("sortOrder")) || "0") || 0,
  };

  try {
    const saved = await prisma.watchTask.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
    revalidatePath("/admin/videos");

    const notes: string[] = [];
    const perHour = (Number(rewardThc) / requiredSec) * 3600;
    notes.push(
      `Members must watch ${Math.floor(requiredSec / 60)}m ${requiredSec % 60}s of ${Math.floor(durationSec / 60)}m ${durationSec % 60}s.`
    );
    if (rewardThc > 0n) {
      notes.push(`That is an effective ${Math.round(perHour).toLocaleString("en-US")} THC per hour of attention.`);
    }
    notes.push(`One payout per member, for life. Up to ${WATCH.dailyTaskCap} paid videos a day each.`);
    return {
      message: `Saved "${saved.title}".${active ? " It is live in the Miner now." : " Saved as a draft."}`,
      notes,
    };
  } catch (e) {
    if (e instanceof Error && /Unique constraint/i.test(e.message)) {
      return { error: "That slug already belongs to another video task." };
    }
    throw e;
  }
}

export async function toggleVideoAction(slug: string, next: boolean) {
  await requireAdmin();
  await prisma.watchTask.update({
    where: { slug },
    data: { active: next, publishedAt: next ? new Date() : null },
  });
  revalidatePath("/admin/videos");
}
