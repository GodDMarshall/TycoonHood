"use client";
/**
 * The homepage stage — the HQ, seen from the air.
 *
 * 1. Server HTML already contains the architectural drawing (the poster) and
 *    a real link for every district, so the hero is complete, crawlable and
 *    navigable before any JS runs.
 * 2. On capable desktops (≥1280px, real GPU, no reduced motion, no Save-Data)
 *    the same world members walk through is loaded on idle and flown around
 *    slowly — the actual campus, not an illustration of it. It fades in over
 *    the poster once it has rendered, and never loads on phones.
 * Any failure returns to the drawing without a flash of nothing.
 */
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@tycoonhood/ui";
import { DISTRICTS, districtHref, type DistrictId } from "./districts";
import { DRAWING_ANCHORS, DRAWING_ASPECT } from "./drawing-frame";
import { detectTier, type Tier } from "./scene/performance";
import type { World } from "../world/engine/world";

export function HQStage({ poster, member, className }: { poster: ReactNode; member: boolean; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<DistrictId | null>(null);

  useEffect(() => setTier(detectTier().tier), []);

  useEffect(() => {
    if (tier !== "full" && tier !== "lite") return;
    let cancelled = false;
    const start = async () => {
      try {
        const [{ loadWorldAssets }, { World }] = await Promise.all([import("../world/engine/assets"), import("../world/engine/world")]);
        const assets = await loadWorldAssets({ anisotropy: 8, models: false, onProgress: () => {} });
        if (cancelled || !host.current) return;
        const noop = () => {};
        world.current = new World(
          host.current,
          assets,
          tier === "full" ? "balanced" : "performance",
          {
            onSpace: noop,
            onPrompt: noop,
            onHover: noop,
            onFocus: noop,
            onProject: noop,
            onPose: noop,
            onFade: noop,
            onQuality: noop,
            onFatal: () => {
              world.current?.dispose();
              world.current = null;
              setReady(false);
              setTier("static");
            },
          },
          { tour: true }
        );
        window.setTimeout(() => !cancelled && setReady(true), 600);
      } catch {
        setTier("static");
      }
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const handle = idle ? idle(() => void start(), { timeout: 1500 }) : window.setTimeout(() => void start(), 400);
    return () => {
      cancelled = true;
      if (!idle) window.clearTimeout(handle);
      world.current?.dispose();
      world.current = null;
    };
  }, [tier]);

  const live = ready && (tier === "full" || tier === "lite");

  return (
    <div className={cn("relative xl:h-full", className)}>
      {/* The drawing: poster for the live world, complete rendering for everyone else. */}
      <div
        className={cn(
          "relative transition-opacity duration-[var(--dur-4)] ease-[var(--ease-premium)] xl:absolute xl:inset-0 xl:flex xl:items-center xl:justify-end",
          live && "pointer-events-none opacity-0"
        )}
        aria-hidden={live || undefined}
      >
        <div className="relative mx-auto w-full max-w-[620px] xl:mx-0 xl:mr-[2%] xl:w-[60%] xl:max-w-none" style={{ aspectRatio: DRAWING_ASPECT }}>
          {poster}
          {!live &&
            DISTRICTS.map((d) => {
              const on = active === d.id;
              return (
                <Link
                  key={d.id}
                  href={districtHref(d, member)}
                  onMouseEnter={() => setActive(d.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(d.id)}
                  onBlur={() => setActive(null)}
                  className="group absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center max-sm:hidden"
                  style={{ left: `${DRAWING_ANCHORS[d.id].left}%`, top: `${DRAWING_ANCHORS[d.id].top}%` }}
                  aria-label={`${d.name} — ${member ? d.note : (d.guestNote ?? d.note)}`}
                >
                  <span className={cn("rounded-sm border bg-bg-0/85 px-2.5 py-1.5 text-center shadow-[var(--shadow-2)] backdrop-blur-sm", on ? "border-gold-deep" : "border-line-strong")}>
                    <span className={cn("whitespace-nowrap font-mono text-[9.5px] font-medium uppercase tracking-[0.2em] sm:text-[10.5px]", on ? "text-gold-bright" : "text-gold")}>{d.name}</span>
                  </span>
                  <span aria-hidden className={cn("h-4 w-px sm:h-6", on ? "bg-gold" : "bg-gradient-to-b from-gold-deep to-transparent")} />
                  <span aria-hidden className={cn("size-[5px] rotate-45", on ? "bg-gold-bright" : "bg-gold")} />
                </Link>
              );
            })}
        </div>
      </div>

      {/* The live campus. */}
      {(tier === "full" || tier === "lite") && (
        <div className={cn("absolute inset-0 hidden transition-opacity duration-[1600ms] ease-[var(--ease-premium)] xl:block", live ? "opacity-100" : "opacity-0")}>
          <div ref={host} className="absolute inset-0" />
          {/* The headline sits over the left of the scene: keep its ground dark. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-bg-0 from-35% via-bg-0/75 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg-0 to-transparent" />
          {live && (
            <nav aria-label="The districts" className="absolute bottom-6 right-[var(--gutter)] flex flex-wrap justify-end gap-2">
              {DISTRICTS.map((d) => (
                <Link
                  key={d.id}
                  href={districtHref(d, member)}
                  className="rounded-sm border border-line-strong bg-bg-0/70 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold backdrop-blur-sm transition-colors hover:border-gold-deep hover:text-gold-bright"
                >
                  {d.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
