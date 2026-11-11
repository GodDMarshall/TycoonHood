"use client";
/**
 * THE CAMPUS HOST (DR-30): the optional 3D campus at /world, over its own
 * 2D page.
 *
 * The server renders the 2D page (fallback.tsx) as the first paint, and the
 * host shows it unchanged until the device decides, once, in an effect after
 * hydration: the device gate first, the GPU only if that passes. Only a 3D
 * decision fetches the engine, with import(), so a 2D visit and every other
 * page never download three.js. Every way back to 2D (a failed load, a lost
 * GPU, slow frames, reduced motion, the member's own choice) disposes the
 * engine down to its GL context.
 *
 * The root carries the state for tests: data-world-mode (deciding, loading,
 * 3d, 2d), data-world-fallback (why it is 2D) and data-world-engine (idle,
 * loading, loaded, disposed).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, buttonStyles, cn } from "@tycoonhood/ui";
import type { BuildingId, WorldState } from "@tycoonhood/core/src/world/state";
import type { Tier, WorldDecision, WorldFallbackReason } from "@tycoonhood/core/src/world/gate";
import type { WorldAssets } from "./engine/assets";
import type { Projected, Prompt, RoomData, Space, World, WorldHandlers } from "./engine/world";
import { decide, deviceEligible } from "./probe";
import { SECTION, SECTIONS } from "./sections";
import { PlacePanel, StationPanel, buildingFact, stationLabel } from "./hud/panels";

/**
 * The WorldState version this host reads. Typed against the contract, so a
 * version bump in core fails the build here until the host is updated; at
 * run time any other version keeps the page 2D.
 */
const READS_VERSION: WorldState["v"] = 1;

type View =
  | { mode: "deciding" }
  | { mode: "loading" }
  | { mode: "3d"; tier: Tier }
  | { mode: "2d"; reason: WorldFallbackReason; retry: boolean };
type Engine = "idle" | "loading" | "loaded" | "disposed";

/** One plain line for every way the page stays 2D. */
const WHY: Record<WorldFallbackReason, string> = {
  phone: "The 3D campus is made for a computer. Everything in it is below.",
  tablet: "The 3D campus is made for a computer. Everything in it is below.",
  narrow: "Make the window at least 1024 pixels wide to walk the campus.",
  "reduced-motion": "Your device asks for less motion, so the campus stays 2D.",
  "save-data": "Data saver is on, so the campus stays 2D.",
  "no-webgl2": "This browser can't draw the campus smoothly.",
  "software-gpu": "This browser can't draw the campus smoothly.",
  "load-failed": "The campus didn't finish loading.",
  "context-lost": "The graphics stopped responding, so the campus closed.",
  "too-slow": "The campus ran too slowly on this device, so it closed.",
  chosen: "You're on the 2D view.",
};

const KEYS = "3D campus. W A S D or arrow keys to walk, Enter to go in, Escape to leave.";
const MOTION = "(prefers-reduced-motion: reduce)";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** What each room is sized by. Ranks are counts only: a height per rank, and which one is the member's. */
function roomData(s: WorldState): Record<BuildingId, RoomData> {
  const ranks = s.leaderboard.ranks.slice(0, 10);
  const most = Math.max(1, ...ranks.map((r) => r.members));
  const mine = ranks.findIndex((r) => r.you);
  return {
    today: { count: 3 },
    courses: { count: Math.max(1, s.courses.programs.length), pillars: s.courses.programs.map((p) => p.pillar) },
    community: { count: 3 },
    leaderboard: { count: Math.max(1, ranks.length), heights: ranks.map((r) => r.members / most), mine: mine >= 0 ? mine : undefined },
    mining: { count: 3 },
    store: { count: 4 },
  };
}

function feed(w: World, s: WorldState) {
  const data = roomData(s);
  for (const section of SECTIONS) w.setRoomData(section.id, data[section.id]);
  w.setPresence(s.presence);
}

export function WorldHost({ state, fallback }: { state: WorldState; fallback: ReactNode }) {
  const [view, setView] = useState<View>({ mode: "deciding" });
  const [engine, setEngine] = useState<Engine>("idle");
  const [attempt, setAttempt] = useState(0);
  const [offer, setOffer] = useState(false);
  const [progress, setProgress] = useState(0);
  const [space, setSpace] = useState<Space>("exterior");
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [help, setHelp] = useState(true);
  const [labels, setLabels] = useState<string[]>([]);
  const [height, setHeight] = useState("max(520px, calc(100dvh - 4rem))");

  const frame = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const run = useRef(0);
  const nodes = useRef(new Map<string, HTMLElement>());
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /** Back to 2D: abandon any load in flight and release the engine, down to its GL context. */
  const toTwoD = useCallback((reason: WorldFallbackReason, retry = false) => {
    run.current++;
    const w = world.current;
    world.current = null;
    w?.dispose();
    setEngine((e) => (e === "idle" ? e : "disposed"));
    setView({ mode: "2d", reason, retry });
    setSpace("exterior");
    setPrompt(null);
    setFocus(null);
    setHover(null);
    setDark(false);
    setLabels([]);
  }, []);

  /** Labels follow their anchors in container pixels. Runs every frame; never renders. */
  const project = useCallback((points: Projected[]) => {
    const box = frame.current;
    if (!box) return;
    const h = box.clientHeight;
    const inside = (world.current?.currentSpace ?? "exterior") !== "exterior";
    for (const p of points) {
      const el = nodes.current.get(p.key);
      if (!el) continue;
      const scale = inside ? clamp(7 / p.dist, 0.62, 1) : clamp(90 / p.dist, 0.72, 1);
      // On the plaza, keep labels clear of the top bar and the dock.
      const underHud = p.y < 72 || p.y > h - 150;
      const show = p.visible && !(!inside && underHud) && (inside ? p.dist < 22 : p.dist < 260);
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      el.style.opacity = show ? "1" : "0";
      el.style.visibility = show ? "visible" : "hidden";
    }
  }, []);

  // The decision, once per attempt, after hydration; then, only for 3D, the engine.
  useEffect(() => {
    // Abandoned when this effect is cleaned up, or when toTwoD() bumps the run.
    let cancelled = false;
    const mine = ++run.current;
    const live = () => !cancelled && run.current === mine;
    if (stateRef.current.v !== READS_VERSION) {
      setView({ mode: "2d", reason: "load-failed", retry: false });
      return;
    }
    let d: WorldDecision;
    try {
      d = decide();
    } catch {
      d = { mode: "2d", reason: "no-webgl2" };
    }
    if (d.mode === "2d") {
      setView({ mode: "2d", reason: d.reason, retry: false });
      return;
    }
    const tier = d.tier;
    setView({ mode: "loading" });
    setEngine("loading");
    setProgress(0);

    const handlers: WorldHandlers = {
      onSpace: (s) => {
        setSpace(s);
        setFocus(null);
        setHover(null);
      },
      onPrompt: setPrompt,
      onHover: setHover,
      onFocus: setFocus,
      onFade: setDark,
      onQuality: (q) => setView((v) => (v.mode === "3d" ? { mode: "3d", tier: q } : v)),
      onSlow: () => toTwoD("too-slow"),
      onFatal: () => toTwoD("context-lost"),
      onPose: () => undefined,
      onProject: project,
    };

    void (async () => {
      let assets: WorldAssets | null = null;
      let release: ((a: WorldAssets) => void) | null = null;
      try {
        const [lib, engineModule] = await Promise.all([
          import(/* webpackChunkName: "world-engine" */ "./engine/assets"),
          import("./engine/world"),
        ]);
        release = lib.disposeAssets;
        if (!live()) return;
        assets = await lib.loadWorldAssets({ anisotropy: 8, onProgress: (p) => live() && setProgress(p) });
        const el = host.current;
        if (!live() || !el) throw new Error("The campus was closed while it loaded.");
        const w = new engineModule.World(el, assets, tier, handlers);
        assets = null; // the world owns them now, and releases them in dispose()
        world.current = w;
        feed(w, stateRef.current);
        setEngine("loaded");
        setView({ mode: "3d", tier });
      } catch {
        if (assets && release) release(assets);
        if (live()) toTwoD("load-failed", true);
      }
    })();

    return () => {
      cancelled = true;
      const w = world.current;
      world.current = null;
      w?.dispose();
    };
  }, [attempt, toTwoD, project]);

  const active = view.mode === "loading" || view.mode === "3d";
  const ready = view.mode === "3d";

  // Reduced motion switched on while the campus is open: close it.
  useEffect(() => {
    if (!active) return;
    const mq = window.matchMedia(MOTION);
    const onChange = () => {
      if (mq.matches) toTwoD("reduced-motion");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [active, toTwoD]);

  // After '2D view', or a window that was too narrow: offer the campus again while the device gate passes.
  const reopenable = view.mode === "2d" && (view.reason === "chosen" || view.reason === "narrow");
  useEffect(() => {
    if (!reopenable) {
      setOffer(false);
      return;
    }
    const check = () => setOffer(deviceEligible());
    check();
    const mq = window.matchMedia(MOTION);
    window.addEventListener("resize", check);
    mq.addEventListener("change", check);
    return () => {
      window.removeEventListener("resize", check);
      mq.removeEventListener("change", check);
    };
  }, [reopenable]);

  // The campus fills the window below whatever sits above it (banners included), never under 520 px.
  useEffect(() => {
    if (!active) return;
    const fit = () => {
      const el = frame.current;
      if (!el) return;
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
      setHeight(`max(520px, calc(100dvh - ${top}px))`);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [active]);

  // Live data reaches the rooms and the markers by the doors.
  useEffect(() => {
    const w = world.current;
    if (w && ready) feed(w, state);
  }, [state, ready]);

  // What gets a label: the buildings outside, the stations inside.
  useEffect(() => {
    if (!ready) return;
    setLabels(space === "exterior" ? SECTIONS.map((s) => s.id) : (world.current?.stations() ?? []));
  }, [space, ready]);

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    []
  );

  const line = view.mode === "2d" ? (offer && view.reason === "narrow" ? "The window is wide enough now." : WHY[view.reason]) : active ? "Loading the 3D campus." : null;
  const here = space === "exterior" ? null : SECTION[space];
  const inside = here !== null;

  return (
    <section
      data-world-root=""
      data-world-mode={view.mode}
      data-world-fallback={view.mode === "2d" ? view.reason : undefined}
      data-world-engine={engine}
      data-world-tier={view.mode === "3d" ? view.tier : undefined}
    >
      {/* One status line, above the 2D page. Its space is kept from the first paint, so nothing jumps. */}
      <div className={cn("mx-auto w-full max-w-[1120px] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10", active && "sr-only")}>
        <div className={cn("flex min-h-[50px] flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-2", view.mode === "2d" ? "border-line bg-bg-1" : "border-transparent")}>
          <p role="status" className="min-w-0 flex-1 text-[14px] text-ink-2">
            {line}
            {view.mode === "deciding" && <noscript>The 3D campus needs JavaScript. Everything in it is below.</noscript>}
          </p>
          {view.mode === "2d" && view.retry && (
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Try again
            </button>
          )}
          {view.mode === "2d" && offer && (
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Walk the campus
            </button>
          )}
        </div>
      </div>

      {!active ? (
        fallback
      ) : (
        <div ref={frame} className="relative overflow-hidden bg-bg-0 text-ink-1" style={{ height }}>
          <h1 className="sr-only">3D campus</h1>
          <div
            ref={host}
            role="application"
            tabIndex={0}
            aria-label={KEYS}
            className="absolute inset-0 outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-ink-3)]"
          />

          {/* Labels over the buildings and stations, moved by the engine every frame. */}
          <div className="pointer-events-none absolute inset-0">
            {ready &&
              labels.map((key) => {
                if (!inside) {
                  const section = SECTION[key as BuildingId];
                  if (!section) return null;
                  const on = hover === key || prompt?.id === key;
                  return (
                    <button
                      key={key}
                      ref={register(key)}
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      onClick={() => world.current?.travelTo(section.id)}
                      className="pointer-events-auto absolute left-0 top-0 flex flex-col items-center opacity-0 transition-opacity duration-300 [visibility:hidden]"
                    >
                      <span className={cn("rounded-md border bg-bg-1 px-3 py-2 text-center", on ? "border-ink-3" : "border-line-strong")}>
                        <span className="flex items-center justify-center gap-2 text-[13.5px] font-medium text-ink-1">
                          <Icon name={section.icon} size={15} className="text-ink-3" />
                          {section.name}
                        </span>
                        <span className="mt-0.5 block whitespace-nowrap text-[12px] text-ink-2">{buildingFact(section.id, state)}</span>
                      </span>
                      <span className="h-6 w-px bg-line-strong" />
                    </button>
                  );
                }
                const label = stationLabel(key, state);
                return (
                  <div key={key} ref={register(key)} className="absolute left-0 top-0 opacity-0 transition-opacity duration-300 [visibility:hidden]">
                    {focus === key ? (
                      <div className="pointer-events-auto">
                        <StationPanel stationKey={key} s={state} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden="true"
                        onClick={() => world.current?.approach(key)}
                        className="pointer-events-auto flex items-center gap-2 whitespace-nowrap rounded-md border border-line-strong bg-bg-1 px-3 py-1.5 text-[12.5px] font-medium text-ink-1"
                      >
                        <Icon name={label.icon} size={13} className="text-ink-3" />
                        {label.label}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Where you are, the way out, and the way back to 2D. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <div className="pointer-events-auto flex items-center gap-2">
              <p className="rounded-md border border-line bg-bg-1 px-3 py-1.5 text-[14px] font-medium text-ink-1">{here ? here.name : "Campus"}</p>
              {ready && inside && (
                <button type="button" onClick={() => world.current?.exit()} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  <Icon name="arrow-left" size={14} />
                  Leave
                  <kbd className="ml-1 font-sans text-[11px] text-ink-3">Esc</kbd>
                </button>
              )}
            </div>
            {ready && (
              <div className="pointer-events-auto flex items-center gap-2">
                <button type="button" onClick={() => toTwoD("chosen")} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  2D view
                </button>
                <button
                  type="button"
                  onClick={() => setHelp((v) => !v)}
                  aria-expanded={help}
                  aria-controls="world-help"
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Help
                </button>
              </div>
            )}
          </div>

          {ready && help && (
            <div id="world-help" className="absolute right-4 top-16 w-[min(290px,calc(100%-2rem))] rounded-lg border border-line-strong bg-bg-1 p-4 text-[13px] leading-relaxed text-ink-2">
              <h2 className="text-[14px] font-semibold text-ink-1">Moving around</h2>
              <ul className="mt-2 flex flex-col gap-1.5">
                <li>
                  <Kbd>W</Kbd> <Kbd>S</Kbd> or the up and down arrows: walk
                </li>
                <li>
                  <Kbd>A</Kbd> <Kbd>D</Kbd>: step sideways
                </li>
                <li>
                  <Kbd>Q</Kbd> <Kbd>E</Kbd> or the left and right arrows: turn
                </li>
                <li>
                  <Kbd>Shift</Kbd>: walk faster
                </li>
                <li>Drag to look around. Click the ground to walk there, or a building to walk to its door.</li>
                <li>
                  <Kbd>Enter</Kbd> goes in, <Kbd>Esc</Kbd> leaves.
                </li>
                <li className="text-ink-3">Click the campus first so it hears your keys.</li>
              </ul>
            </div>
          )}

          {ready && here && (
            <div className="absolute left-4 top-16">
              <PlacePanel id={here.id} s={state} />
            </div>
          )}

          {ready && prompt && (
            <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center">
              <button
                type="button"
                onClick={() => (prompt.kind === "enter" ? world.current?.enter(prompt.id) : world.current?.exit())}
                className="pointer-events-auto flex items-center gap-2 rounded-md border border-line-strong bg-bg-1 px-4 py-2.5 text-[14px] font-medium text-ink-1 hover:bg-bg-2"
              >
                <Icon name={prompt.kind === "enter" ? "arrow-up-right" : "arrow-left"} size={15} className="text-ink-3" />
                {prompt.kind === "enter" ? `Go into ${SECTION[prompt.id].name}` : `Leave ${SECTION[prompt.id].name}`}
                <span className="text-ink-3">· Enter</span>
              </button>
            </div>
          )}

          {/* The dock: every building, one press away. */}
          {ready && (
            <nav aria-label="Buildings" className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
              <ul className="pointer-events-auto flex gap-1 rounded-lg border border-line-strong bg-bg-1 p-1.5">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => world.current?.travelTo(section.id)}
                      aria-current={space === section.id ? "location" : undefined}
                      className={cn(
                        "flex w-[84px] flex-col items-center gap-1 rounded-md px-2 py-2 text-[12px] font-medium transition-colors",
                        space === section.id ? "bg-bg-3 text-ink-1" : "text-ink-2 hover:bg-bg-2 hover:text-ink-1"
                      )}
                    >
                      <Icon name={section.icon} size={18} />
                      <span className="whitespace-nowrap">{section.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* A short fade between spaces. */}
          <div className={cn("pointer-events-none absolute inset-0 bg-black transition-opacity duration-[400ms]", dark ? "opacity-100" : "opacity-0")} />

          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-0">
              <p className="text-[15px] text-ink-2">Loading the campus</p>
              <div className="h-1 w-64 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-[12.5px] tabular-nums text-ink-3">{Math.round(progress * 100)}%</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong px-1 font-sans text-[11.5px] text-ink-1">{children}</kbd>;
}
