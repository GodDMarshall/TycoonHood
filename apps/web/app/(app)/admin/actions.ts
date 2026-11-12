"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import {
  AuthoringError,
  ForbiddenError,
  LedgerService,
  XpService,
  authoring,
  challenges,
  commerce,
  manualSettlement,
  ManualSettlementError,
  sliceWhole,
} from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import { actorWith } from "../../../lib/guard";

const ledger = new LedgerService(prisma);
const xp = new XpService(prisma);

/** Defense in depth: every admin action re-checks the role (spec §27). */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/today");
  return user;
}

export interface AdminActionState {
  message?: string;
  error?: string;
}

export async function grantThcAction(userId: string, _p: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const amount = BigInt(String(fd.get("amount") ?? "0"));
  const memo = sliceWhole(String(fd.get("memo") ?? ""), 0, 200) || "Admin grant";
  if (amount <= 0n) return { error: "Amount must be positive." };
  await ledger.reward({
    userId,
    amount,
    reason: "REWARD_ADMIN",
    idempotencyKey: `admin-grant:${admin.id}:${userId}:${Date.now()}`,
    memo,
    createdById: admin.id,
  });
  revalidatePath("/admin/members");
  return { message: `+${amount} THC granted (audited).` };
}

export async function grantXpAction(userId: string, _p: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const amount = Number(fd.get("amount") ?? 0);
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Amount must be a positive integer." };
  await xp.awardXp({
    userId,
    amount,
    source: "ADMIN_GRANT",
    sourceId: admin.id,
    idempotencyKey: `admin-xp:${admin.id}:${userId}:${Date.now()}`,
  });
  revalidatePath("/admin/members");
  return { message: `+${amount} XP granted.` };
}

export async function reverseTxAction(txId: string) {
  const admin = await requireAdmin();
  await ledger.reverse(txId, {
    idempotencyKey: `admin-reverse:${txId}`,
    memo: "Admin reversal",
    createdById: admin.id,
  });
  revalidatePath("/admin/economy");
}

/**
 * Publish or unpublish a program from the Content list. It goes through the
 * authoring service, which checks the program can go live and audits the
 * change (course.publish / course.unpublish). An archived program is never
 * published from here: the list links to its editor instead.
 */
export async function toggleCoursePublishAction(
  courseId: string,
  _p: { ok?: string; error?: string },
  _fd: FormData
): Promise<{ ok?: string; error?: string }> {
  let published: boolean;
  try {
    const admin = await actorWith("courses.publish");
    const actor = { id: admin.id, role: admin.role };
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true } });
    if (!course) return { error: "That program no longer exists." };
    if (course.status === "ARCHIVED") return { error: "This program is archived. Open its editor to bring it back." };
    published = course.status !== "PUBLISHED";
    if (published) await authoring.publish(actor, courseId);
    else await authoring.unpublish(actor, courseId);
  } catch (e) {
    if (e instanceof AuthoringError || e instanceof ForbiddenError) return { error: e.message };
    if (e instanceof Error && e.message.startsWith("You do not have permission")) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/content");
  revalidatePath("/courses");
  revalidatePath("/programs");
  return { ok: published ? "Published." : "Back to draft." };
}

/**
 * A program's cover photo. Empty clears it (the pillar's house photo shows
 * instead). Only https URLs or paths under /public are accepted.
 */
export async function setCourseCoverAction(courseId: string, _p: { ok?: string; error?: string }, fd: FormData): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const raw = String(fd.get("coverImage") ?? "").trim();
  if (raw && !/^https:\/\/[^\s]+$/i.test(raw) && !/^\/[^\s/][^\s]*$/.test(raw)) {
    return { error: "Use an https:// address or a path starting with / (a file in apps/web/public)." };
  }
  if (raw.length > 1000) return { error: "That address is too long." };
  await prisma.course.update({ where: { id: courseId }, data: { coverImage: raw || null } });
  for (const path of ["/admin/content", "/courses", "/programs", "/today", "/"]) revalidatePath(path);
  return { ok: raw ? "Cover saved." : "Cover cleared — the house photo shows." };
}

export async function savePostAction(postId: string | null, _p: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const title = String(fd.get("title") ?? "").trim();
  const slug = String(fd.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const excerpt = String(fd.get("excerpt") ?? "").trim();
  const contentMd = String(fd.get("contentMd") ?? "");
  const publish = fd.get("publish") === "on";
  if (!title || !slug || !contentMd) return { error: "Title, slug, and content are required." };
  const data = {
    title,
    slug,
    excerpt:
      excerpt ||
      sliceWhole(contentMd.replace(/[#*_>`]/g, ""), 0, 140).trim(),
    contentMd,
    publishedAt: publish ? new Date() : null,
    authorName: admin.profile?.displayName ?? admin.name ?? "Tycoonhood",
  };
  if (postId) {
    const existing = await prisma.post.findUniqueOrThrow({ where: { id: postId } });
    await prisma.post.update({
      where: { id: postId },
      data: { ...data, publishedAt: publish ? (existing.publishedAt ?? new Date()) : null },
    });
  } else {
    await prisma.post.create({ data });
  }
  revalidatePath("/admin/content");
  revalidatePath("/blog");
  redirect("/admin/content");
}

export async function setChallengeLifecycleAction(challengeId: string, lifecycle: "UPCOMING" | "ACTIVE" | "ENDED") {
  await requireAdmin();
  await prisma.challenge.update({ where: { id: challengeId }, data: { lifecycle } });
  if (lifecycle === "ENDED") {
    await prisma.challengeParticipation.updateMany({
      where: { challengeId, status: "JOINED" },
      data: { status: "FAILED" },
    });
  }
  revalidatePath("/admin/challenges");
  revalidatePath("/challenges");
}

export interface ShipState {
  error?: string;
  message?: string;
}

/**
 * Marks a parcel sent. Tracking is required: "fulfilled" with nothing to
 * follow is how a member ends up wondering for three weeks whether their
 * two months of mining bought anything.
 */
export async function shipOrderAction(orderId: string, _prev: ShipState, fd: FormData): Promise<ShipState> {
  await requireAdmin();
  const carrier = String(fd.get("carrier") ?? "").trim();
  const tracking = String(fd.get("tracking") ?? "").trim();
  if (!carrier) return { error: "Name the carrier." };
  if (!tracking) return { error: "Enter the tracking number — the member is told it." };
  try {
    await commerce.markShipped(orderId, carrier, tracking);
    revalidatePath("/admin/orders");
    revalidatePath("/orders");
    return { message: `Marked shipped · ${carrier} ${tracking}` };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

/**
 * Settle a legacy rupee order by hand. Core refuses any order the payment
 * flow owns (one with a Payment row) and audits the settlement.
 *
 * A refusal means the order moved on after the list was drawn: another admin
 * settled it, it was cancelled, or a payment started. Nothing was written, so
 * the list is redrawn to show where the order stands, not an error page.
 */
export async function settlePendingFiatAction(orderId: string) {
  const admin = await actorWith("admin.commerce");
  try {
    await manualSettlement.settle({ id: admin.id, role: admin.role }, orderId);
  } catch (e) {
    if (!(e instanceof ManualSettlementError)) throw e;
  }
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
}

export async function reviewSubmissionAction(participationId: string, submissionId: string, approve: boolean, fd: FormData) {
  const admin = await requireAdmin();
  const feedback = String(fd.get("feedback") ?? "") || undefined;
  await challenges.reviewSubmission(participationId, submissionId, approve, feedback, admin.id);
  revalidatePath("/admin/challenges");
  revalidatePath("/challenges");
}
