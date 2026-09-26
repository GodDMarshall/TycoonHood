"use client";
/**
 * The interactive half of the shell: active states, the phone sheet, the
 * member tab bar and the account menu. Exports components only — a
 * non-component export from a client module becomes a client reference
 * when a server component imports it.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Avatar, Icon, RankBadge, buttonStyles, cn } from "@tycoonhood/ui";
import { isActive, type NavItem } from "./nav-items";
import { logoutAction } from "../../app/(auth)/actions";

export function DesktopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden h-full items-stretch lg:flex">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center px-3.5 text-[13.5px] font-medium tracking-[-0.005em]",
              "transition-colors duration-[var(--dur-2)]",
              active ? "text-ink-1" : "text-ink-2 hover:text-ink-1"
            )}
          >
            {item.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3.5 -bottom-px h-px origin-left bg-gold transition-transform duration-[var(--dur-3)] ease-[var(--ease-premium)]",
                active ? "scale-x-100" : "scale-x-0 opacity-60 group-hover:scale-x-100"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

type SheetProps = {
  items: NavItem[];
  secondary?: NavItem[];
  footer: ReactNode;
  heading: string;
};

/**
 * Phone navigation. One sheet, opened from the header or from the tab
 * bar's "More". Portalled to <body> so the header's stacking context can
 * never clip it. Escape closes; focus moves in on open and back on close.
 */
export function MobileNav({
  items,
  secondary,
  tabs,
  footer,
  heading,
}: SheetProps & { tabs?: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const sheet = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={cn(
        "fixed inset-0 z-[60] flex flex-col bg-bg-0 lg:hidden",
        "transition-[opacity,visibility] duration-[var(--dur-3)] ease-[var(--ease-premium)]",
        open ? "visible opacity-100" : "invisible opacity-0"
      )}
    >
      <div className="grid-plane pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-line px-[var(--gutter)]">
        <p id={titleId} className="eyebrow">
          {heading}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="flex size-10 items-center justify-center rounded-md border border-line-strong text-ink-1"
          aria-label="Close menu"
        >
          <Icon name="x" size={18} />
        </button>
      </div>
      <nav aria-label="Primary" className="relative flex-1 overflow-y-auto px-[var(--gutter)] py-6">
        <ul className="flex flex-col">
          {items.map((item, i) => {
            const active = isActive(pathname, item);
            return (
              <li
                key={item.href}
                className={cn(
                  "border-b border-line transition-[opacity,transform] duration-[var(--dur-4)] ease-[var(--ease-premium)]",
                  open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                )}
                style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="group flex items-center gap-4 py-4"
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-md border",
                      active ? "border-gold-deep text-gold" : "border-line-strong text-ink-2"
                    )}
                  >
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("display text-[24px] leading-tight", active && "text-gold-bright")}>
                      {item.label}
                    </span>
                    <span className="text-[13px] text-ink-3">{item.note}</span>
                  </span>
                  <Icon name="arrow-right" size={16} className="text-ink-3 group-hover:text-gold" />
                </Link>
              </li>
            );
          })}
        </ul>
        {secondary && secondary.length > 0 && (
          <ul className="mt-6 grid grid-cols-2 gap-2">
            {secondary.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md border border-line bg-bg-1 px-3 py-3 text-[14px] text-ink-2 hover:text-ink-1"
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <div className="relative border-t border-line px-[var(--gutter)] py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {footer}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open menu"
        className="flex size-10 items-center justify-center rounded-md border border-line-strong text-ink-1 transition-colors hover:border-gold-deep lg:hidden"
      >
        <Icon name="menu" size={18} />
      </button>
      {mounted && createPortal(sheet, document.body)}
      {mounted && tabs && createPortal(<TabBar tabs={tabs} onMore={() => setOpen(true)} moreOpen={open} />, document.body)}
    </>
  );
}

function TabBar({ tabs, onMore, moreOpen }: { tabs: NavItem[]; onMore: () => void; moreOpen: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Quick"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-bg-1/95 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = isActive(pathname, t);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium tracking-[0.02em]",
                  active ? "text-gold-bright" : "text-ink-3"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-5 top-0 h-px bg-gold transition-transform duration-[var(--dur-3)]",
                    active ? "scale-x-100" : "scale-x-0"
                  )}
                />
                <Icon name={t.icon} size={20} />
                {t.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-ink-3"
          >
            <Icon name="menu" size={20} />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Account menu: identity, secondary rooms, the house (admins), sign out. */
export function AccountMenu({
  name,
  username,
  rankSlug,
  isAdmin,
  minerUrl,
  links,
}: {
  name: string;
  username: string | null;
  rankSlug: string | null;
  isAdmin: boolean;
  minerUrl: string;
  links: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const menuId = useId();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const row =
    "flex items-center gap-3 rounded-sm px-3 py-2.5 text-[13.5px] text-ink-2 transition-colors hover:bg-bg-3 hover:text-ink-1";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex h-10 items-center gap-2.5 rounded-md border border-transparent pl-1 pr-2.5 transition-colors hover:border-line-strong"
      >
        <Avatar name={name} size={30} />
        <span className="hidden max-w-[12ch] truncate text-[13px] text-ink-1 xl:inline">{name}</span>
        <Icon name="chevron-down" size={14} className={cn("text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      <div
        id={menuId}
        className={cn(
          "absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-lg border border-line-strong bg-bg-1 p-1.5 shadow-[var(--shadow-3)]",
          "transition-[opacity,transform,visibility] duration-[var(--dur-2)] ease-[var(--ease-premium)]",
          open ? "visible scale-100 opacity-100" : "invisible scale-[0.98] opacity-0"
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-2">
          <Avatar name={name} size={36} />
          <div className="min-w-0">
            <p className="truncate text-[14px] text-ink-1">{name}</p>
            {rankSlug && <RankBadge slug={rankSlug} className="mt-1" />}
          </div>
        </div>
        <div className="flex flex-col py-1.5">
          {username && (
            <Link href={`/u/${username}`} className={row}>
              <Icon name="user" size={16} /> Your profile
            </Link>
          )}
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={row}>
              <Icon name={l.icon} size={16} /> {l.label}
            </Link>
          ))}
          <a href={minerUrl} className={row}>
            <Icon name="miner" size={16} /> The Miner
            <Icon name="arrow-up-right" size={13} className="ml-auto text-ink-3" />
          </a>
          {isAdmin && (
            <Link href="/admin" className={cn(row, "text-gold hover:text-gold-bright")}>
              <Icon name="shield" size={16} /> The House
            </Link>
          )}
        </div>
        <form action={logoutAction} className="border-t border-line pt-1.5">
          <button type="submit" className={cn(row, "w-full")}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

/** Sign-out as a full-width control, for the phone sheet footer. */
export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}>
        <Icon name="logout" size={16} /> Sign out
      </button>
    </form>
  );
}
