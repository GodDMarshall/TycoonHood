"use client";
/**
 * The one way into the optional 3D campus (DR-30): a quiet link at the foot
 * of the desktop sidebar.
 *
 * It renders nothing on the server or on the first client render, then
 * appears only where the campus could open: no touch screen as the main
 * pointer, a window at least 1024 px wide, no reduced motion, no data saver.
 * It never creates a WebGL context, and prefetch is off, so no other page
 * ever runs the /world loader.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, cn } from "@tycoonhood/ui";
import { deviceEligible } from "./probe";

export function WorldLink() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => setShow(deviceEligible());
    check();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener("resize", check);
    motion.addEventListener("change", check);
    return () => {
      window.removeEventListener("resize", check);
      motion.removeEventListener("change", check);
    };
  }, []);

  if (!show) return null;
  const active = pathname === "/world";
  return (
    <Link
      href="/world"
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-md px-3 text-[14px] font-medium transition-colors duration-[var(--dur-1)]",
        active ? "bg-bg-3 text-ink-1" : "text-ink-2 hover:bg-bg-2 hover:text-ink-1",
      )}
    >
      <Icon name="pillar" size={18} className={active ? "text-gold" : "text-ink-3 group-hover:text-ink-2"} />
      <span className="truncate">3D campus</span>
      <span className="ml-auto text-[12px] text-ink-3">optional</span>
    </Link>
  );
}
