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
  { href: "/programs", label: "Academy", note: "Four programs, one per pillar", icon: "academy" },
  { href: "/challenges", label: "Arena", note: "Challenges with real stakes", icon: "arena" },
  { href: "/marketplace", label: "Vault", note: "Gear and library, bought with THC", icon: "vault" },
  { href: "/thc", label: "Treasury", note: "The economy, with the books open", icon: "treasury", match: ["/status"] },
  { href: "/blog", label: "Journal", note: "Essays from the house", icon: "journal" },
];

export const MEMBER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Command", note: "Your command center", icon: "command" },
  { href: "/academy", label: "Academy", note: "Your programs and lessons", icon: "academy", match: ["/programs"] },
  { href: "/challenges", label: "Arena", note: "Challenges and check-ins", icon: "arena" },
  { href: "/leaderboard", label: "Network", note: "Members, ranked in the open", icon: "network", match: ["/u/"] },
  { href: "/marketplace", label: "Vault", note: "Spend THC on things that exist", icon: "vault", match: ["/library"] },
  { href: "/wallet", label: "Wallet", note: "Your ledger, audited live", icon: "wallet" },
];

/** Five slots for the phone tab bar. Everything else lives behind "More". */
export const MEMBER_TABS: NavItem[] = [MEMBER_NAV[0], MEMBER_NAV[1], MEMBER_NAV[2], MEMBER_NAV[5]];

export const ACCOUNT_LINKS: NavItem[] = [
  { href: "/orders", label: "Orders", note: "Parcels and purchases", icon: "orders" },
  { href: "/settings", label: "Settings", note: "Privacy, Discord, account", icon: "settings" },
];

export function isActive(pathname: string, item: NavItem) {
  const hit = (p: string) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : p + "/");
  return hit(item.href) || (item.match ?? []).some((m) => (m.endsWith("/") ? pathname.startsWith(m) : hit(m)));
}
