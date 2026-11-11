/**
 * One way to put something in a member's notification inbox, so every module
 * writes the same shape. Notifications are informational; nothing reads them
 * to decide money or rank.
 */
import { prisma, type NotificationType, type Prisma, type PrismaClient } from "@tycoonhood/db";
import { safeSitePath } from "../auth/next-path";

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  data?: Prisma.InputJsonValue & { href?: string },
  db: PrismaClient | Prisma.TransactionClient = prisma
) {
  await db.notification.create({ data: { userId, type, title, body: body ?? null, data: data ?? undefined } });
}

/**
 * The page a notification's `data.href` points to, when it is a path on this
 * site ("/community/…", never "//host" or "/\host"). Null otherwise.
 */
export function notificationLink(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return safeSitePath((data as { href?: unknown }).href);
}
