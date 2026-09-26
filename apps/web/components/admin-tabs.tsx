"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@tycoonhood/ui";

const tabs = [
  ["/admin", "Overview"],
  ["/admin/members", "Members"],
  ["/admin/economy", "Economy"],
  ["/admin/content", "Content"],
  ["/admin/missions", "Missions"],
  ["/admin/products", "Products"],
  ["/admin/videos", "Videos"],
  ["/admin/challenges", "Challenges"],
  ["/admin/orders", "Orders"],
] as const;

/** Console sections. Scrolls sideways on a phone instead of overflowing the page. */
export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Console" className="-mx-[var(--gutter)] mb-10 overflow-x-auto px-[var(--gutter)]">
      <ul className="flex w-max gap-1 rounded-lg border border-line bg-bg-1 p-1">
        {tabs.map(([href, label]) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-md px-3.5 py-2 text-[13px] transition-colors",
                  active ? "bg-bg-3 text-gold-bright shadow-[var(--shadow-1)]" : "text-ink-2 hover:bg-bg-2 hover:text-ink-1"
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
