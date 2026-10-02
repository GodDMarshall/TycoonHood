"use client";

import { useEffect, useRef } from "react";

/**
 * Cinematic opening: the wordmark assembles while the system "boots" 000→100,
 * then the curtain lifts. Pure CSS timing does the reveal, so it can never trap
 * content (no JS, slow JS, or a script error all still lift the curtain). Shown
 * once per session; skipped for reduced motion.
 */
export function Intro() {
  const countRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = countRef.current;
    if (!el) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1500);
      el.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 100)).padStart(3, "0");
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    try {
      sessionStorage.setItem("ojas-intro", "1");
    } catch {}
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-inner">
        <div className="intro-word">
          {"OJASPHERA".split("").map((c, i) => (
            <span key={i} style={{ animationDelay: `${120 + i * 55}ms` }}>
              {c}
            </span>
          ))}
        </div>
        <div className="intro-bar">
          <i />
        </div>
        <div className="intro-meta">
          <span>Initialising intelligence systems</span>
          <span ref={countRef}>000</span>
        </div>
      </div>
    </div>
  );
}
