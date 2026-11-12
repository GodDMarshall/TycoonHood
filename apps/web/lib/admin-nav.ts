import { can, type Permission } from "@tycoonhood/core";
import type { UserRole } from "@tycoonhood/db";
import type { AdminTab } from "../components/admin-tabs";

/** Every console section and the permission it needs. Order = tab order.
 *  `unless`: hidden for users who hold that permission and reach the page another way. */
const SECTIONS: (AdminTab & { needs: Permission; unless?: Permission })[] = [
  { href: "/admin", label: "Overview", needs: "admin.access" },
  { href: "/admin/analytics", label: "Analytics", needs: "admin.analytics" },
  { href: "/admin/members", label: "Members", needs: "admin.users" },
  { href: "/admin/courses", label: "Courses", needs: "courses.author" },
  { href: "/admin/orders", label: "Orders", needs: "admin.commerce" },
  { href: "/admin/products", label: "Products", needs: "admin.commerce" },
  { href: "/admin/coupons", label: "Coupons", needs: "admin.commerce" },
  { href: "/admin/refunds", label: "Refunds", needs: "admin.commerce" },
  { href: "/admin/earn", label: "Affiliates", needs: "admin.earn" },
  { href: "/admin/economy", label: "Economy", needs: "admin.economy" },
  { href: "/admin/missions", label: "Missions", needs: "admin.economy" },
  { href: "/admin/challenges", label: "Challenges", needs: "admin.economy" },
  { href: "/admin/videos", label: "Videos", needs: "admin.economy" },
  { href: "/admin/community", label: "Community", needs: "community.moderate" },
  { href: "/admin/moderation", label: "Reports", needs: "community.moderate" },
  // Course staff reach reviews under Courses; moderators hide reviews too.
  { href: "/admin/courses/reviews", label: "Reviews", needs: "community.moderate", unless: "courses.author" },
  { href: "/admin/standard", label: "Daily standard", needs: "admin.content" },
  { href: "/admin/content", label: "Content", needs: "admin.content" },
  { href: "/admin/site", label: "Site & CMS", needs: "admin.content" },
  { href: "/admin/audit", label: "Audit log", needs: "admin.audit" },
];

export function adminTabsFor(user: { role: UserRole }): AdminTab[] {
  return SECTIONS.filter((s) => can(user, s.needs) && !(s.unless && can(user, s.unless))).map(({ href, label }) => ({ href, label }));
}
