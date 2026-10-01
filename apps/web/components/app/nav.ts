/**
 * The member app's map. One list, used by the desktop sidebar, the phone's
 * tab bar and its "More" sheet, so the three can never disagree.
 *
 * Every entry is a real route. The Miner is the one game in Tycoonhood and
 * lives inside the member app at /mining (Rig, Tasks, Squad, Ranks). The old
 * standalone Miner app (apps/miner) only forwards here now.
 */
import type { IconName } from "@tycoonhood/ui";

export type AppNavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Other path prefixes that should light this item. */
  match?: string[];
};

export const PRIMARY_NAV: AppNavItem[] = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/courses", label: "Courses", icon: "courses" },
  { href: "/community", label: "Community", icon: "chat" },
  { href: "/challenges", label: "Challenges", icon: "target" },
  { href: "/mining", label: "Mining", icon: "miner" },
];

export const SECONDARY_NAV: AppNavItem[] = [
  { href: "/store", label: "Store", icon: "store", match: ["/library"] },
  { href: "/wallet", label: "Wallet", icon: "wallet" },
];

export const ACCOUNT_NAV: AppNavItem[] = [
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/orders", label: "Orders", icon: "orders" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** Phone tab bar: four destinations and "More" (Challenges lives in the sheet). */
export const TAB_NAV: AppNavItem[] = [PRIMARY_NAV[0], PRIMARY_NAV[1], PRIMARY_NAV[2], PRIMARY_NAV[4]];

/** Primary destinations that did not fit in TAB_NAV — the "More" sheet should list these first. */
export const TAB_OVERFLOW_NAV: AppNavItem[] = PRIMARY_NAV.filter((i) => !TAB_NAV.includes(i));

export function isActive(pathname: string, item: Pick<AppNavItem, "href" | "match">) {
  const hit = (p: string) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : p + "/");
  return hit(item.href) || (item.match ?? []).some(hit);
}
