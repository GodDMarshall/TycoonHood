"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { LedgerService, XpService, commerce, challenges } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";

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
  const memo = String(fd.get("memo") ?? "").slice(0, 200) || "Admin grant";
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

export async function toggleCoursePublishAction(courseId: string) {
  await requireAdmin();
  const c = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });
  await prisma.course.update({
    where: { id: courseId },
    data: { status: c.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" },
  });
  revalidatePath("/admin/content");
  revalidatePath("/courses");
  revalidatePath("/programs");
}

/**
 * A program's cover photo. Empty clears it (the drawn pillar scene shows
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
  return { ok: raw ? "Cover saved." : "Cover cleared — the drawn scene shows." };
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
      contentMd
        .replace(/[#*_>`]/g, "")
        .slice(0, 140)
        .trim(),
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

export async function settlePendingFiatAction(orderId: string) {
  const admin = await requireAdmin();
  await commerce.settleFiatOrder(orderId, `admin_${admin.id}`);
  revalidatePath("/admin/orders");
}

export async function reviewSubmissionAction(participationId: string, submissionId: string, approve: boolean, fd: FormData) {
  const admin = await requireAdmin();
  const feedback = String(fd.get("feedback") ?? "") || undefined;
  await challenges.reviewSubmission(participationId, submissionId, approve, feedback, admin.id);
  revalidatePath("/admin/challenges");
  revalidatePath("/challenges");
}
