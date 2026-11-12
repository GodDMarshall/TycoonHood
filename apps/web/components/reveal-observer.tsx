"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll reveals. Content is visible by default; an inline script in the
 * root layout adds `js-reveal` before paint, and this observer lifts each
 * [data-reveal] block into place once. If this never runs, the inline
 * script's watchdog removes the class so nothing stays hidden.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    (window as unknown as { __thReveal?: boolean }).__thReveal = true;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)"));
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
