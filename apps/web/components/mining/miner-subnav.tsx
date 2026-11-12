"use client";
/**
 * The Miner's own sections, as a segmented control under the app chrome.
 * Components only — nothing else is exported from this "use client" module.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, cn, type IconName } from "@tycoonhood/ui";

const SECTIONS: { href: "/mining" | "/mining/tasks" | "/mining/squad" | "/mining/ranks"; label: string; icon: IconName }[] = [
  { href: "/mining", label: "Rig", icon: "miner" },
  { href: "/mining/tasks", label: "Tasks", icon: "play" },
  { href: "/mining/squad", label: "Squad", icon: "network" },
  { href: "/mining/ranks", label: "Ranks", icon: "leaderboard" },
];

export function MinerSubnav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Miner sections" className="mb-6 min-w-0">
      <ul className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-bg-1 p-1">
        {SECTIONS.map((s) => {
          const active = s.href === "/mining" ? pathname === "/mining" : pathname === s.href || pathname.startsWith(s.href + "/");
          return (
            <li key={s.href} className="shrink-0">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-[13.5px] font-medium transition-colors duration-[var(--dur-1)]",
                  active ? "bg-bg-3 text-ink-1 shadow-[var(--shadow-1)]" : "text-ink-3 hover:bg-bg-2 hover:text-ink-1"
                )}
              >
                <Icon name={s.icon} size={16} className={active ? "text-gold" : undefined} />
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
