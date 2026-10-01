"use client";
/**
 * The member app's chrome: the desktop sidebar, the phone's top bar and tab
 * bar, and the "More" sheet. Data comes from the server shell; this half
 * only knows where you are.
 *
 * Components only — nothing else is exported from this "use client" module.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Icon, Logo, cn, type IconName } from "@tycoonhood/ui";
import { logoutAction } from "../../app/(auth)/actions";
import { ACCOUNT_NAV, PRIMARY_NAV, SECONDARY_NAV, TAB_NAV, TAB_OVERFLOW_NAV, isActive, type AppNavItem } from "./nav";
import { InstallAppButton } from "./install-app";

export type ShellUser = { name: string; username: string | null; avatarUrl: string | null; rank: string | null; isAdmin: boolean };
export type ShellData = {
  user: ShellUser;
  programs: { slug: string; title: string; pct: number }[];
  unreadCommunity: number;
  unreadNotifications: number;
};

function Count({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold tabular-nums text-bg-0",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
      <span className="sr-only"> unread</span>
    </span>
  );
}

function SideLink({ item, active, count, external }: { item: AppNavItem; active: boolean; count?: number; external?: boolean }) {
  const cls = cn(
    "group flex h-9 items-center gap-3 rounded-md px-3 text-[14px] font-medium transition-colors duration-[var(--dur-1)]",
    active ? "bg-bg-3 text-ink-1" : "text-ink-2 hover:bg-bg-2 hover:text-ink-1",
  );
  const inner = (
    <>
      <Icon name={item.icon} size={18} className={active ? "text-gold" : "text-ink-3 group-hover:text-ink-2"} />
      <span className="truncate">{item.label}</span>
      {external && <Icon name="arrow-up-right" size={13} className="ml-auto text-ink-3" />}
      {count !== undefined && <Count n={count} />}
    </>
  );
  if (external) {
    return (
      <a href={item.href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={item.href} className={cls} aria-current={active ? "page" : undefined}>
      {inner}
    </Link>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-1.5 pt-6 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">{children}</p>;
}

/** Close a popover on outside click and Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function SignOut({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <button type="submit" className={className}>
        <Icon name="logout" size={18} className="text-ink-3" /> Sign out
      </button>
    </form>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-bg-2"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-ink-1">{user.name}</span>
          <span className="block truncate text-[12px] text-ink-3">{user.rank ?? "Member"}</span>
        </span>
        <Icon name="chevron-down" size={14} className={cn("text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-line-strong bg-bg-2 p-1.5 shadow-[var(--shadow-3)] animate-fade"
        >
          {ACCOUNT_NAV.map((i) => (
            <Link
              key={i.href}
              role="menuitem"
              href={i.href}
              className="flex h-9 items-center gap-3 rounded-md px-2.5 text-[13.5px] text-ink-2 hover:bg-bg-3 hover:text-ink-1"
            >
              <Icon name={i.icon} size={17} className="text-ink-3" />
              {i.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-line" />
          <SignOut className="flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-[13.5px] text-ink-2 hover:bg-bg-3 hover:text-ink-1" />
        </div>
      )}
    </div>
  );
}

export function Sidebar({ data }: { data: ShellData }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-[var(--z-nav)] hidden w-[248px] flex-col border-r border-line bg-bg-1 lg:flex">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/today" aria-label="Tycoonhood — Today">
          <Logo size={24} />
        </Link>
      </div>
      <nav aria-label="App" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <SideLink item={item} active={isActive(pathname, item)} count={item.href === "/community" ? data.unreadCommunity : undefined} />
            </li>
          ))}
        </ul>

        {data.programs.length > 0 && (
          <>
            <SectionLabel>Your programs</SectionLabel>
            <ul className="flex flex-col gap-0.5">
              {data.programs.map((p) => {
                const href = `/courses/${p.slug}`;
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={p.slug}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors",
                        active ? "bg-bg-3 text-ink-1" : "text-ink-2 hover:bg-bg-2 hover:text-ink-1",
                      )}
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="ml-auto text-[12px] tabular-nums text-ink-3">{p.pct}%</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <SectionLabel>More</SectionLabel>
        <ul className="flex flex-col gap-0.5">
          {SECONDARY_NAV.map((item) => (
            <li key={item.href}>
              <SideLink item={item} active={isActive(pathname, item)} />
            </li>
          ))}
          {data.user.isAdmin && (
            <li>
              <SideLink item={{ href: "/admin", label: "Admin", icon: "shield" }} active={isActive(pathname, { href: "/admin" })} />
            </li>
          )}
        </ul>
      </nav>
      <div className="shrink-0 border-t border-line p-3">
        <SideLink
          item={{ href: "/notifications", label: "Notifications", icon: "bell" }}
          active={isActive(pathname, { href: "/notifications" })}
          count={data.unreadNotifications}
        />
        <InstallAppButton variant="sidebar" />
        <div className="mt-1">
          <UserMenu user={data.user} />
        </div>
      </div>
    </aside>
  );
}

export function MobileTopBar({ data }: { data: ShellData }) {
  return (
    <header className="sticky top-0 z-[var(--z-nav)] flex h-14 items-center gap-3 border-b border-line bg-bg-0/90 px-4 backdrop-blur-md lg:hidden">
      <Link href="/today" aria-label="Tycoonhood — Today">
        <Logo size={22} />
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/notifications"
          aria-label={data.unreadNotifications > 0 ? `Notifications, ${data.unreadNotifications} unread` : "Notifications"}
          className="relative flex size-10 items-center justify-center rounded-md text-ink-2 hover:bg-bg-2 hover:text-ink-1"
        >
          <Icon name="bell" size={20} />
          {data.unreadNotifications > 0 && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-gold" />}
        </Link>
        <Link href="/profile" aria-label="Your profile" className="flex size-10 items-center justify-center">
          <Avatar name={data.user.name} src={data.user.avatarUrl} size={30} />
        </Link>
      </div>
    </header>
  );
}

function SheetLink({ href, icon, label, external, onNavigate }: { href: string; icon: IconName; label: string; external?: boolean; onNavigate: () => void }) {
  const cls = "flex h-12 items-center gap-3 rounded-md px-3 text-[15px] text-ink-1 hover:bg-bg-3";
  const inner = (
    <>
      <Icon name={icon} size={20} className="text-ink-3" />
      {label}
      {external && <Icon name="arrow-up-right" size={14} className="ml-auto text-ink-3" />}
    </>
  );
  return external ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls} onClick={onNavigate}>
      {inner}
    </Link>
  );
}

export function MobileTabBar({ data }: { data: ShellData }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = sheet.current;
    if (!d) return;
    if (more && !d.open) d.showModal();
    if (!more && d.open) d.close();
  }, [more]);
  useEffect(() => setMore(false), [pathname]);
  const moreActive = [...TAB_OVERFLOW_NAV, ...SECONDARY_NAV, ...ACCOUNT_NAV, { href: "/admin" }, { href: "/notifications" }].some((i) => isActive(pathname, i));

  return (
    <>
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-line bg-bg-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
          {TAB_NAV.map((item) => {
            const active = isActive(pathname, item);
            const count = item.href === "/community" ? data.unreadCommunity : 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-gold" : "text-ink-3 hover:text-ink-1",
                  )}
                >
                  <Icon name={item.icon} size={22} />
                  {item.label}
                  {count > 0 && (
                    <span className="absolute left-1/2 top-2 ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold tabular-nums text-bg-0">
                      {count > 99 ? "99+" : count}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-haspopup="dialog"
              aria-expanded={more}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                moreActive ? "text-gold" : "text-ink-3 hover:text-ink-1",
              )}
            >
              <Icon name="menu" size={22} />
              More
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={sheet}
        aria-label="More"
        onClose={() => setMore(false)}
        onClick={(e) => e.target === sheet.current && setMore(false)}
        className="mb-0 mt-auto w-full max-w-none rounded-t-xl border border-b-0 border-line-strong bg-bg-1 p-0 text-ink-1 backdrop:bg-black/60 open:animate-rise lg:hidden"
      >
        <div className="mx-auto max-w-xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={data.user.name} src={data.user.avatarUrl} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{data.user.name}</p>
              <p className="truncate text-[13px] text-ink-3">{data.user.rank ?? "Member"}</p>
            </div>
            <button
              type="button"
              onClick={() => setMore(false)}
              aria-label="Close"
              className="ml-auto flex size-10 items-center justify-center rounded-md text-ink-3 hover:bg-bg-3 hover:text-ink-1"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-0.5 border-t border-line pt-2 min-[420px]:grid-cols-2">
            {TAB_OVERFLOW_NAV.map((i) => (
              <SheetLink key={i.href} href={i.href} icon={i.icon} label={i.label} onNavigate={() => setMore(false)} />
            ))}
            {ACCOUNT_NAV.map((i) => (
              <SheetLink key={i.href} href={i.href} icon={i.icon} label={i.label} onNavigate={() => setMore(false)} />
            ))}
            {SECONDARY_NAV.map((i) => (
              <SheetLink key={i.href} href={i.href} icon={i.icon} label={i.label} onNavigate={() => setMore(false)} />
            ))}
            <SheetLink href="/notifications" icon="bell" label="Notifications" onNavigate={() => setMore(false)} />
            {data.user.isAdmin && <SheetLink href="/admin" icon="shield" label="Admin" onNavigate={() => setMore(false)} />}
          </div>
          <div className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2">
            <InstallAppButton variant="sheet" />
            <SignOut className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-[15px] text-ink-1 hover:bg-bg-3" />
          </div>
        </div>
      </dialog>
    </>
  );
}
