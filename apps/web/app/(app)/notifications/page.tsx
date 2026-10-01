import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Icon, cn, type IconName } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader, Panel } from "../../../components/app/page";
import { MarkReadOnView } from "../../../components/app/mark-read-on-view";
import { markAllReadAction } from "./actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const ICON: Record<string, IconName> = {
  XP_AWARDED: "bolt",
  LEVEL_UP: "ascent",
  RANK_UP: "ascent",
  ACHIEVEMENT: "seal",
  CHALLENGE: "target",
  MISSION: "check",
  THC: "wallet",
  SYSTEM: "info",
  ORDER: "orders",
  COMMUNITY: "chat",
};

const when = (d: Date) => {
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Where a notification leads, from the data it carries. Nothing invented. */
function hrefOf(n: { type: string; data: unknown }) {
  const d = (n.data ?? {}) as { channel?: string; messageId?: string; courseId?: string; orderId?: string };
  if (n.type === "COMMUNITY" && d.channel) return `/community/${d.channel}${d.messageId ? `#m-${d.messageId}` : ""}`;
  if (n.type === "ORDER") return "/orders";
  if (n.type === "CHALLENGE") return "/challenges";
  if (n.type === "THC") return "/wallet";
  if (n.type === "RANK_UP" || n.type === "LEVEL_UP" || n.type === "ACHIEVEMENT") return "/profile";
  if (d.courseId) return "/courses";
  return null;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <Page width="narrow">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} new` : "You're all caught up."}
        actions={
          unread > 0 ? (
            <form action={markAllReadAction}>
              <button type="submit" className="text-[13.5px] text-ink-3 hover:text-ink-1">
                Mark all read
              </button>
            </form>
          ) : undefined
        }
      />
      <MarkReadOnView action={markAllReadAction} unread={unread} />
      {items.length === 0 ? (
        <Panel className="p-8 text-center text-[14.5px] text-ink-2">Nothing yet. Replies, ranks, orders and pinned messages show up here.</Panel>
      ) : (
        <Panel as="ul" className="divide-y divide-line">
          {items.map((n) => {
            const href = hrefOf(n);
            const body = (
              <>
                <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border", n.readAt ? "border-line text-ink-3" : "border-gold-deep bg-gold/10 text-gold")}>
                  <Icon name={ICON[n.type] ?? "info"} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[14.5px]", n.readAt ? "text-ink-2" : "font-medium text-ink-1")}>{n.title}</span>
                  {n.body && <span className="mt-0.5 line-clamp-2 block text-[13.5px] text-ink-3">{n.body}</span>}
                </span>
                <span className="shrink-0 text-[12.5px] text-ink-3">{when(n.createdAt)}</span>
              </>
            );
            return (
              <li key={n.id}>
                {href ? (
                  <Link href={href} className="flex items-start gap-3 px-5 py-4 hover:bg-bg-2">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-5 py-4">{body}</div>
                )}
              </li>
            );
          })}
        </Panel>
      )}
    </Page>
  );
}
