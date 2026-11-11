/**
 * The member app shell (server half). Loads what the chrome shows — the
 * member's programs and their progress, unread counts, the cart count — and
 * hands it to the client chrome. Pages render inside <main>; each page sets
 * its own width.
 */
import type { ReactNode } from "react";
import { prisma } from "@tycoonhood/db";
import { community, can, cartBadge } from "@tycoonhood/core";
import type { UserRole } from "@tycoonhood/db";
import { cartItemCount } from "../../lib/cart-count";
import { MobileTabBar, MobileTopBar, Sidebar, type ShellData } from "./app-chrome";

type ShellUserRow = {
  id: string;
  role: UserRole;
  name: string | null;
  createdAt: Date;
  profile: { displayName: string; username: string; avatarUrl: string | null } | null;
  rank: { name: string } | null;
};

export async function AppShell({ user, children }: { user: ShellUserRow; children: ReactNode }) {
  const [enrollments, unreadNotifications, unreadCommunity, inCart] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
      orderBy: { course: { sortOrder: "asc" } },
      select: { progressPct: true, course: { select: { slug: true, title: true } } },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    community.unreadTotal({ id: user.id, role: user.role }, user.createdAt),
    cartItemCount(user.id),
  ]);

  const data: ShellData = {
    user: {
      name: user.profile?.displayName ?? user.name ?? "Member",
      username: user.profile?.username ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      rank: user.rank?.name.replace(/^Tycoon\s+/, "") ?? null,
      isAdmin: can(user, "admin.access"),
    },
    programs: enrollments.map((e) => ({ slug: e.course.slug, title: e.course.title, pct: e.progressPct })),
    unreadCommunity,
    unreadNotifications,
    cart: cartBadge(inCart),
  };

  return (
    <div className="min-h-dvh">
      <Sidebar data={data} />
      <MobileTopBar data={data} />
      <div className="lg:pl-[248px]">
        <main id="content" tabIndex={-1} className="pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none lg:pb-0">
          {children}
        </main>
      </div>
      <MobileTabBar data={data} />
    </div>
  );
}
