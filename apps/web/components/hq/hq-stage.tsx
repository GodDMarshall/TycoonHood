"use client";
/**
 * The HQ stage — hosts the signature experience.
 *
 * 1. Server HTML already contains the architectural drawing (the poster)
 *    and a real link for every district, so the hero is complete, crawlable
 *    and navigable before any JS runs.
 * 2. After hydration the tier is detected. Only `full`/`lite` go further:
 *    three.js is fetched on idle — never on the critical path — the scene
 *    mounts behind the poster and fades in once it has drawn two frames.
 * 3. The district labels stay DOM links throughout: keyboard focus on a
 *    label lights its building; hovering a building expands its label.
 * Any failure (context loss, a GPU that cannot hold 25fps) returns to the
 * drawing without a flash of nothing.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@tycoonhood/ui";
import { DISTRICTS, districtHref, type DistrictId } from "./districts";
import { DRAWING_ANCHORS, DRAWING_ASPECT } from "./drawing-frame";
import type { HQController, Projection } from "./scene/create-scene";
import { detectTier, type Tier } from "./scene/performance";

export function HQStage({ poster, member, className }: { poster: ReactNode; member: boolean; className?: string }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Partial<Record<DistrictId, HTMLAnchorElement | null>>>({});
  const controller = useRef<HQController | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<DistrictId | null>(null);

  useEffect(() => {
    const { tier } = detectTier();
    setTier(tier);
  }, []);

  useEffect(() => {
    if (tier !== "full" && tier !== "lite") return;
    let cancelled = false;
    const start = async () => {
      const { createHQScene } = await import("./scene/create-scene");
      if (cancelled || !host.current) return;
      controller.current = createHQScene(host.current, {
        tier,
        onHover: (id) => setActive(id),
        onSelect: (id) => {
          const d = DISTRICTS.find((x) => x.id === id);
          if (d) router.push(districtHref(d, member));
        },
        onProject: (points: Projection[]) => {
          for (const p of points) {
            const el = labelRefs.current[p.id];
            if (!el) continue;
            el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
            el.style.opacity = p.visible ? "" : "0";
          }
        },
        onReady: () => setReady(true),
        onFallback: () => {
          controller.current?.dispose();
          controller.current = null;
          setReady(false);
          setTier("static");
        },
        getScroll: () => {
          const h = root.current?.offsetHeight ?? 1;
          return window.scrollY / h;
        },
      });
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    const handle = idle ? idle(() => void start(), { timeout: 1200 }) : window.setTimeout(() => void start(), 300);
    return () => {
      cancelled = true;
      if (!idle) window.clearTimeout(handle);
      controller.current?.dispose();
      controller.current = null;
    };
  }, [tier, member, router]);

  const live = ready && (tier === "full" || tier === "lite");

  const label = (id: DistrictId, style: CSSProperties | undefined, projected: boolean) => {
    const d = DISTRICTS.find((x) => x.id === id)!;
    const on = active === id;
    return (
      <Link
        key={id + (projected ? "-3d" : "-2d")}
        href={districtHref(d, member)}
        ref={projected ? (el) => void (labelRefs.current[id] = el) : undefined}
        onMouseEnter={() => {
          setActive(id);
          controller.current?.setHighlight(id);
        }}
        onMouseLeave={() => {
          setActive(null);
          controller.current?.setHighlight(null);
        }}
        onFocus={() => {
          setActive(id);
          controller.current?.setHighlight(id);
        }}
        onBlur={() => {
          setActive(null);
          controller.current?.setHighlight(null);
        }}
        className={cn(
          "group absolute left-0 top-0 z-10 flex flex-col items-center",
          "transition-opacity duration-[var(--dur-3)]",
          // Below 640px the drawing is too small for six tap targets to sit apart;
          // the Explore section right after the hero lists every room instead.
          !projected && "-translate-x-1/2 -translate-y-full max-sm:hidden"
        )}
        style={style}
        aria-label={`${d.name} — ${member ? d.note : (d.guestNote ?? d.note)}`}
      >
        <span
          className={cn(
            "flex flex-col items-center rounded-sm border bg-bg-0/85 px-2.5 py-1.5 text-center shadow-[var(--shadow-2)] backdrop-blur-sm",
            "transition-[border-color,background-color] duration-[var(--dur-2)]",
            on ? "border-gold-deep bg-bg-1/95" : "border-line-strong"
          )}
        >
          <span
            className={cn(
              "whitespace-nowrap font-mono text-[9.5px] font-medium uppercase tracking-[0.2em] sm:text-[10.5px]",
              on ? "text-gold-bright" : "text-gold"
            )}
          >
            {d.name}
          </span>
          <span
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-[var(--dur-3)] ease-[var(--ease-premium)]",
              on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <span className="min-h-0 overflow-hidden">
              <span className="block max-w-[22ch] pt-1 text-[11.5px] leading-snug text-ink-2">
                {member ? d.note : (d.guestNote ?? d.note)}
              </span>
            </span>
          </span>
        </span>
        <span aria-hidden className={cn("h-4 w-px sm:h-6", on ? "bg-gold" : "bg-gradient-to-b from-gold-deep to-transparent")} />
        <span aria-hidden className={cn("size-[5px] rotate-45", on ? "bg-gold-bright" : "bg-gold")} />
      </Link>
    );
  };

  return (
    <div ref={root} className={cn("relative xl:h-full", className)}>
      {/* The drawing: poster for 3D, complete rendering for everyone else. */}
      <div
        className={cn(
          "relative transition-opacity duration-[var(--dur-4)] ease-[var(--ease-premium)] xl:absolute xl:inset-0 xl:flex xl:items-center xl:justify-end",
          live && "pointer-events-none opacity-0"
        )}
        aria-hidden={live || undefined}
      >
        <div
          className="relative mx-auto w-full max-w-[620px] xl:mx-0 xl:mr-[2%] xl:w-[60%] xl:max-w-none"
          style={{ aspectRatio: DRAWING_ASPECT }}
        >
          {poster}
          {!live &&
            DISTRICTS.map((d) =>
              label(d.id, { left: `${DRAWING_ANCHORS[d.id].left}%`, top: `${DRAWING_ANCHORS[d.id].top}%` }, false)
            )}
        </div>
      </div>

      {/* The live scene. */}
      {(tier === "full" || tier === "lite") && (
        <div
          className={cn(
            "absolute inset-0 hidden transition-opacity duration-[1200ms] ease-[var(--ease-premium)] xl:block",
            live ? "opacity-100" : "opacity-0"
          )}
        >
          <div ref={host} className="absolute inset-0" />
          {live && DISTRICTS.map((d) => label(d.id, { opacity: 0 }, true))}
          {live && (
            <p className="pointer-events-none absolute bottom-6 right-[var(--gutter)] flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
              <span className="size-1.5 rotate-45 bg-gold" aria-hidden />
              Hover a district · click to enter
            </p>
          )}
        </div>
      )}
    </div>
  );
}
