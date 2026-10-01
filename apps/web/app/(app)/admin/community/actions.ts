"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { community, CommunityError, type ChannelSummary } from "@tycoonhood/core";
import { getCurrentUser } from "../../../../lib/auth";

export interface AdminState {
  ok?: string;
  error?: string;
}

async function staff() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/today");
  return { id: user.id, role: user.role };
}

function done(message: string): AdminState {
  revalidatePath("/admin/community");
  revalidatePath("/community", "layout");
  return { ok: message };
}

async function guard(fn: () => Promise<AdminState>): Promise<AdminState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CommunityError) return { error: e.message };
    throw e;
  }
}

export async function resolveReportAction(reportId: string, action: "remove" | "dismiss") {
  const v = await staff();
  await community.resolveReport(v, reportId, action);
  revalidatePath("/admin/community");
}

export async function unmuteAction(userId: string) {
  const v = await staff();
  await community.unmute(v, userId);
  revalidatePath("/admin/community");
}

const DURATIONS: Record<string, number | null> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30, forever: null };

export async function muteAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const v = await staff();
  return guard(async () => {
    const username = String(fd.get("username") ?? "").trim().replace(/^@/, "");
    const profile = await prisma.profile.findUnique({ where: { username }, select: { userId: true, displayName: true } });
    if (!profile) return { error: `No member is called @${username}.` };
    const key = String(fd.get("duration") ?? "24h");
    if (!(key in DURATIONS)) return { error: "Choose a duration." };
    const hours = DURATIONS[key];
    const until = hours === null ? null : new Date(Date.now() + hours * 3600_000);
    await community.mute(v, profile.userId, until, String(fd.get("reason") ?? "").trim() || null);
    return done(`${profile.displayName} can read but not post${until ? ` until ${until.toUTCString().slice(0, 22)} UTC` : " until you lift it"}.`);
  });
}

export async function saveChannelAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const v = await staff();
  return guard(async () => {
    const kind = String(fd.get("kind") ?? "CHAT") as ChannelSummary["kind"];
    if (!["CHAT", "ANNOUNCEMENTS", "WINS", "QUESTIONS"].includes(kind)) return { error: "Unknown channel type." };
    const ch = await community.saveChannel(v, {
      id: String(fd.get("id") ?? "") || undefined,
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      topic: String(fd.get("topic") ?? ""),
      kind,
      courseId: String(fd.get("courseId") ?? "") || null,
      adminOnly: fd.get("adminOnly") === "on",
      slowModeSec: Number(fd.get("slowModeSec") ?? 0),
      sortOrder: Number(fd.get("sortOrder") ?? 0),
    });
    return done(`Saved #${ch.slug}.`);
  });
}

export async function archiveChannelAction(channelId: string, archived: boolean) {
  const v = await staff();
  await community.setArchived(v, channelId, archived);
  revalidatePath("/admin/community");
  revalidatePath("/community", "layout");
}

export async function ensureProgramChannelsAction(): Promise<void> {
  await staff();
  await community.ensureProgramChannels();
  revalidatePath("/admin/community");
}

export async function announceAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const v = await staff();
  return guard(async () => {
    await community.post(v, "announcements", { body: String(fd.get("body") ?? "") });
    revalidatePath("/today");
    return done("Announcement posted.");
  });
}
