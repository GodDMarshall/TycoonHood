"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { can, community, CommunityError, discussions, DiscussionError, type ChannelSummary } from "@tycoonhood/core";
import { getCurrentUser } from "../../../../lib/auth";

export interface AdminState {
  ok?: string;
  error?: string;
}

/** Community staff: moderators and admins (community.moderate). */
async function staff() {
  const user = await getCurrentUser();
  if (!user || !can(user, "community.moderate")) redirect("/today");
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
    if (e instanceof CommunityError || e instanceof DiscussionError) return { error: e.message };
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
  // The list offers Lift only where the rule allows it; core refuses the rest.
  await guard(async () => {
    await community.unmute(v, userId);
    return {};
  });
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

// ─────────────────────────────── discussion categories and groups

const PILLARS = ["WARRIOR", "BUILDER", "TYCOON", "MIND"] as const;

function discussionsDone(message: string): AdminState {
  revalidatePath("/admin/community");
  revalidatePath("/community/discussions");
  revalidatePath("/community/groups", "layout");
  return { ok: message };
}

export async function saveCategoryAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const v = await staff();
  return guard(async () => {
    const c = await discussions.saveCategory(v, {
      id: String(fd.get("id") ?? "") || undefined,
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? ""),
      sortOrder: Number(fd.get("sortOrder") ?? 0),
    });
    return discussionsDone(`Saved ${c.name}.`);
  });
}

export async function saveGroupAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const v = await staff();
  return guard(async () => {
    const raw = String(fd.get("pillar") ?? "");
    const pillar = (PILLARS as readonly string[]).includes(raw) ? (raw as (typeof PILLARS)[number]) : null;
    const g = await discussions.saveGroup(v, {
      id: String(fd.get("id") ?? "") || undefined,
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? ""),
      pillar,
    });
    return discussionsDone(`Saved ${g.name}.`);
  });
}

export async function archiveDiscussionAction(kind: "category" | "group", id: string, archived: boolean) {
  const v = await staff();
  if (kind !== "category" && kind !== "group") return;
  await discussions.setArchived(v, kind, id, archived);
  discussionsDone("");
}
