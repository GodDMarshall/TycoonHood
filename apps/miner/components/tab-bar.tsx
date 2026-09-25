"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The Miner is a phone app first. A thumb-reachable bar beats a menu, and
 * the five tabs are the five things a member actually does here.
 */
const TABS = [
  { href: "/", label: "Rig", icon: RigIcon },
  { href: "/tasks", label: "Watch", icon: PlayIcon },
  { href: "/squad", label: "Squad", icon: SquadIcon },
  { href: "/ranks", label: "Ranks", icon: RanksIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
] as const;

export function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Miner sections"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg-0/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  active ? "text-gold-bright" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                <Icon active={active} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { active: boolean };
const stroke = (a: boolean) => (a ? "currentColor" : "currentColor");

function RigIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke={stroke(active)} strokeWidth="1.5" />
      <path d="M12 7.5v9M8.5 10l7 4M15.5 10l-7 4" stroke={stroke(active)} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function PlayIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="3.5" stroke={stroke(active)} strokeWidth="1.5" />
      <path d="M10.5 9.5l4.5 2.5-4.5 2.5z" fill={stroke(active)} />
    </svg>
  );
}
function SquadIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="3.2" stroke={stroke(active)} strokeWidth="1.5" />
      <path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" stroke={stroke(active)} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 6.2a3 3 0 010 5.6M17.5 14.6c2 .6 3.3 2.2 3.3 4.4" stroke={stroke(active)} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function RanksIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="12" width="4.5" height="8" rx="1" stroke={stroke(active)} strokeWidth="1.5" />
      <rect x="9.75" y="7" width="4.5" height="13" rx="1" stroke={stroke(active)} strokeWidth="1.5" />
      <rect x="16.5" y="10" width="4.5" height="10" rx="1" stroke={stroke(active)} strokeWidth="1.5" />
    </svg>
  );
}
function WalletIcon({ active }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3" stroke={stroke(active)} strokeWidth="1.5" />
      <path d="M2.5 9.5h19" stroke={stroke(active)} strokeWidth="1.3" />
      <circle cx="17" cy="14" r="1.3" fill={stroke(active)} />
    </svg>
  );
}
