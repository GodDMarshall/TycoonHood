/**
 * The map of the house. One list per audience — a guest and a member do
 * not see the same navigation (they are not in the same building).
 *
 * District names are the product's spatial language; every district is a
 * real route that exists today. A district with no route is not listed.
 * `note` is the plain-English descriptor shown wherever there is room for
 * it (mobile sheet, HQ scene), so the name never has to explain itself.
 */
import type { IconName } from "@tycoonhood/ui";

export type NavItem = {
  href: string;
  label: string;
  note: string;
  icon: IconName;
  /** Other path prefixes that should light this item. */
  match?: string[];
};

export const GUEST_NAV: NavItem[] = [
  { href: "/programs", label: "Programs", note: "Four programs, lessons in order", icon: "courses" },
  { href: "/#how", label: "How it works", note: "Learn, hold the standard, prove it", icon: "checklist" },
  { href: "/marketplace", label: "Store", note: "Gear and library", icon: "store" },
  { href: "/thc", label: "THC", note: "The economy, with the books open", icon: "treasury", match: ["/status"] },
  { href: "/blog", label: "Journal", note: "Essays", icon: "journal" },
];

export const ACCOUNT_LINKS: NavItem[] = [
  { href: "/orders", label: "Orders", note: "Parcels and purchases", icon: "orders" },
  { href: "/settings", label: "Settings", note: "Privacy, Discord, account", icon: "settings" },
];

export function isActive(pathname: string, item: NavItem) {
  const hit = (p: string) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : p + "/");
  return hit(item.href) || (item.match ?? []).some((m) => (m.endsWith("/") ? pathname.startsWith(m) : hit(m)));
}
