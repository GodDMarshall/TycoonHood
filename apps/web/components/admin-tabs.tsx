"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@tycoonhood/ui";

export type AdminTab = { href: string; label: string };

/** Console sections. The server decides which tabs a role sees; each page re-checks. */
export function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Console" className="mb-8 overflow-x-auto">
      <ul className="flex w-max gap-1 rounded-lg border border-line bg-bg-1 p-1">
        {tabs.map(({ href, label }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-md px-3.5 py-2 text-[13px] transition-colors",
                  active ? "bg-bg-3 text-ink-1 shadow-[var(--shadow-1)]" : "text-ink-2 hover:bg-bg-2 hover:text-ink-1"
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
