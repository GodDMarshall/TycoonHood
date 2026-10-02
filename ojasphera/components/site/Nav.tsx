"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav } from "@/lib/site";
import { Wordmark } from "./Logo";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the full-screen menu on navigation and lock body scroll while open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled || open ? "border-b border-line bg-base/75 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="shell flex h-[var(--nav-h)] items-center justify-between">
        <Link href="/" aria-label="Ojasphera Labs — home" className="relative z-10 text-ink">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-9">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`text-[13px] transition-colors duration-300 hover:text-ink ${
                    isActive(item.href) ? "text-ink" : "text-ink-2"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/build" className="link-arrow hidden text-[13px] md:inline-flex">
            Build With Us <span className="arrow">→</span>
          </Link>
          <button
            type="button"
            className="relative z-10 -mr-2 flex h-11 w-11 items-center justify-center md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-6">
              <span
                className={`absolute left-0 top-0 h-px w-6 bg-ink transition-transform duration-500 ${open ? "translate-y-1.5 rotate-45" : ""}`}
              />
              <span
                className={`absolute bottom-0 left-0 h-px w-6 bg-ink transition-transform duration-500 ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Full-screen mobile navigation */}
      <div
        id="mobile-nav"
        className={`fixed inset-0 top-0 h-dvh bg-void transition-[opacity,visibility] duration-500 md:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <nav aria-label="Mobile" className="shell relative flex h-full flex-col justify-between pb-10 pt-28">
          <ul className="flex flex-col gap-2">
            {[...nav, { href: "/build", label: "Build With Us" }].map((item, i) => (
              <li
                key={item.href}
                className="transition-[opacity,transform] duration-700"
                style={{
                  transitionDelay: open ? `${120 + i * 60}ms` : "0ms",
                  opacity: open ? 1 : 0,
                  transform: open ? "none" : "translateY(16px)",
                }}
              >
                <Link
                  href={item.href}
                  tabIndex={open ? 0 : -1}
                  className="flex items-baseline gap-4 border-b border-line py-4 text-4xl font-medium tracking-tight"
                >
                  <span className="mono text-xs text-ink-3">0{i + 1}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="eyebrow">AI • Systems • Automation • Intelligence • Experiences</p>
        </nav>
      </div>
    </header>
  );
}
