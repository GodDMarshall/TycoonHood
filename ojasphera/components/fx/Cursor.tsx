"use client";

import { useEffect, useRef } from "react";

/**
 * A precise two-part cursor: a dot that tracks exactly and a ring that follows
 * with inertia, grows over anything interactive and reads "Drag" over 3D scenes.
 * Also drives [data-magnetic] elements. Fine pointers only; off for reduced motion.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("has-cursor");
    const d = dot.current!, r = ring.current!, l = label.current!;
    let x = -100, y = -100, rx = -100, ry = -100, scale = 1, ts = 1;
    let raf = 0;
    let magnet: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      const canvas = t?.closest("canvas");
      const interactive = t?.closest("a, button, [role=switch], [role=radio], input, textarea, label, summary");
      ts = canvas ? 2.6 : interactive ? 1.9 : 1;
      l.textContent = canvas ? "Drag" : "";
      r.classList.toggle("is-active", !!(canvas || interactive));
      const m = t?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (magnet && magnet !== m) magnet.style.transform = "";
      magnet = m;
      if (m) {
        const b = m.getBoundingClientRect();
        const mx = (x - (b.left + b.width / 2)) * 0.22;
        const my = (y - (b.top + b.height / 2)) * 0.3;
        m.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      }
    };
    const onLeave = () => {
      x = y = -100;
      if (magnet) magnet.style.transform = "";
    };
    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      scale += (ts - scale) * 0.15;
      d.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      r.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${scale})`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div aria-hidden="true" className="cursor-layer">
      <div ref={ring} className="cursor-ring">
        <span ref={label} />
      </div>
      <div ref={dot} className="cursor-dot" />
    </div>
  );
}
