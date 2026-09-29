"use client";
/**
 * THE WORLD HOST — mounts the HQ and wraps it in the HUD.
 *
 * Owns: capability detection, the loading sequence, the live data (props
 * from the server page, refreshed with router.refresh() after actions), and
 * every piece of DOM over the canvas. The engine is fetched only after the
 * tier is known, so a device that cannot run it never downloads it.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoinMark, Icon, RankPips, buttonStyles, cn, type IconName } from "@tycoonhood/ui";
import type { WorldState } from "../../lib/world-state";
import type { Projected, Prompt, Space, World } from "./engine/world";
import type { DistrictId } from "./architecture/campus";
import { detectQuality, type Quality, type Tier } from "./engine/quality";
import { StationChip, StationPanel, TREASURY_COUNT, buildingFact, stationSummary } from "./hud/panels";

const DISTRICTS: { id: DistrictId; name: string; icon: IconName; note: string }[] = [
  { id: "command", name: "Command Center", icon: "command", note: "Your seat" },
  { id: "academy", name: "Academy", icon: "academy", note: "Programs" },
  { id: "arena", name: "Arena", icon: "arena", note: "Challenges" },
  { id: "vault", name: "Vault", icon: "vault", note: "Spend THC" },
  { id: "treasury", name: "Treasury", icon: "treasury", note: "Open books" },
  { id: "network", name: "Network", icon: "network", note: "Members" },
];
const NAME: Record<Space, string> = {
  exterior: "The Plaza",
  command: "Command Center",
  academy: "The Academy",
  arena: "The Arena",
  vault: "The Vault",
  treasury: "The Treasury",
  network: "The Network",
};
// Minimap footprints (plan view, metres) — mirrors architecture/campus.ts.
const PLAN: { id: DistrictId; x: number; z: number; w: number; d: number; round?: boolean }[] = [
  { id: "command", x: 0, z: -74, w: 38, d: 38 },
  { id: "academy", x: -64, z: -10, w: 30, d: 60 },
  { id: "treasury", x: 64, z: -10, w: 37, d: 37, round: true },
  { id: "vault", x: 58, z: 44, w: 33, d: 33 },
  { id: "arena", x: -58, z: 44, w: 50, d: 50, round: true },
  { id: "network", x: -60, z: -64, w: 38, d: 38 },
];

export function WorldHost({ state }: { state: WorldState }) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [reason, setReason] = useState("");
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [space, setSpace] = useState<Space>("exterior");
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [help, setHelp] = useState(true);
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), []);
  const [keys, setKeys] = useState<string[]>([]);
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const me = useRef<SVGGElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const d = detectQuality();
    setTier(d.tier);
    setReason(d.reason);
  }, []);

  // Room sizes follow the live data.
  const roomData = useMemo(
    () => ({
      command: { count: 3 },
      academy: { count: Math.max(1, state.programs.length), pillars: state.programs.map((p) => p.pillar) },
      arena: { count: Math.max(1, state.challenges.length) },
      vault: { count: Math.max(1, state.vault.length) },
      treasury: { count: TREASURY_COUNT },
      network: { count: Math.max(1, state.network.top.length) },
    }),
    [state]
  );

  useEffect(() => {
    const w = world.current;
    if (!w) return;
    for (const [id, d] of Object.entries(roomData)) w.setRoomData(id as DistrictId, d);
    w.setPresence(state.presence);
  }, [roomData, state.presence]);

  useEffect(() => {
    if (!tier || tier === "none" || !host.current) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ loadWorldAssets }, { World }] = await Promise.all([import("./engine/assets"), import("./engine/world")]);
        const assets = await loadWorldAssets({ anisotropy: 8, onProgress: (p) => !cancelled && setProgress(p) });
        if (cancelled || !host.current) return;
        const w = new World(host.current, assets, tier, {
          onSpace: (s) => {
            setSpace(s);
            setFocus(null);
          },
          onPrompt: setPrompt,
          onHover: setHover,
          onFocus: setFocus,
          onFade: setDark,
          onQuality: setQuality,
          onFatal: (r) => setFatal(r),
          onPose: (x, z, yaw) => {
            me.current?.setAttribute("transform", `translate(${x} ${z}) rotate(${(-yaw * 180) / Math.PI})`);
          },
          onProject: (pts: Projected[]) => {
            for (const p of pts) {
              const el = nodes.current.get(p.key);
              if (!el) continue;
              const inside = w.currentSpace !== "exterior";
              const s = inside ? Math.max(0.62, Math.min(1, 7 / p.dist)) : Math.max(0.72, Math.min(1, 90 / p.dist));
              // Keep labels clear of the HUD bars at the top and bottom of the screen.
              const inHud = p.y < 110 || p.y > window.innerHeight - 120;
              const show = p.visible && !(!inside && inHud) && (inside ? p.dist < 22 : p.dist < 260);
              el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${s.toFixed(3)})`;
              el.style.opacity = show ? "1" : "0";
              el.style.pointerEvents = show ? "auto" : "none";
            }
          },
        });
        world.current = w;
        for (const [id, d] of Object.entries(roomData)) w.setRoomData(id as DistrictId, d);
        w.setPresence(stateRef.current.presence);
        setQuality(tier);
        window.setTimeout(() => !cancelled && setReady(true), 350);
      } catch (e) {
        console.error(e);
        setFatal("load-failed");
      }
    })();
    return () => {
      cancelled = true;
      world.current?.dispose();
      world.current = null;
    };
    // The world is created once; data flows in through the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setHelp(false), 9000);
    return () => window.clearTimeout(t);
  }, [ready]);

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    []
  );

  useEffect(() => {
    setKeys(space === "exterior" ? DISTRICTS.map((d) => d.id) : (world.current?.stations() ?? []));
  }, [space, ready, roomData]);

  if (tier === "none" || fatal) return <Fallback reason={fatal ?? reason} />;

  const m = state.member;
  const inside = space !== "exterior";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050404] text-ink-1">
      <div ref={host} className="absolute inset-0" />

      {/* Labels and panels over the scene. */}
      <div className="pointer-events-none absolute inset-0" aria-live="off">
        {ready &&
          keys.map((key) => {
            if (!inside) {
              const d = DISTRICTS.find((x) => x.id === key)!;
              const on = hover === key || prompt?.id === key;
              return (
                <button
                  key={key}
                  ref={register(key)}
                  type="button"
                  onClick={() => world.current?.travelTo(d.id)}
                  className="absolute left-0 top-0 flex flex-col items-center opacity-0 transition-opacity duration-300"
                  aria-label={`Go to ${d.name}: ${buildingFact(d.id, state)}`}
                >
                  <span className={cn("rounded-md border bg-bg-0/80 px-3.5 py-2 text-center backdrop-blur-md transition-colors", on ? "border-gold" : "border-gold-deep/50")}>
                    <span className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
                      <Icon name={d.icon} size={13} /> {d.name}
                    </span>
                    <span className="mt-0.5 block whitespace-nowrap text-[12px] text-ink-2">{buildingFact(d.id, state)}</span>
                  </span>
                  <span className="h-8 w-px bg-gradient-to-b from-gold to-transparent" aria-hidden />
                </button>
              );
            }
            const full = focus === key;
            const sum = stationSummary(key, state);
            return (
              <div key={key} ref={register(key)} className="absolute left-0 top-0 opacity-0 transition-opacity duration-300">
                {full ? (
                  <div className="animate-fade">
                    <StationPanel stationKey={key} s={state} />
                  </div>
                ) : (
                  <button type="button" onClick={() => world.current?.approach(key)} aria-label={`Walk to ${sum.label}`}>
                    <StationChip label={sum.label} icon={sum.icon} />
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {/* Top bar. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:gap-4 sm:p-4 md:p-6">
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" aria-label="Tycoonhood home" className="rounded-md border border-line-strong bg-bg-0/70 p-2 backdrop-blur-md">
            <CoinMark size={26} />
          </Link>
          {/* On a phone inside a room the dock already marks where you are. */}
          <div className={cn("rounded-md border border-line-strong bg-bg-0/70 px-3.5 py-2 backdrop-blur-md", inside && "max-sm:hidden")}>
            <p className="whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-3 max-sm:hidden">Tycoonhood HQ</p>
            <p className="whitespace-nowrap text-[14px] font-medium leading-tight">{NAME[space]}</p>
          </div>
          {inside && (
            <button type="button" onClick={() => world.current?.exit()} className={buttonStyles({ variant: "secondary", size: "sm", className: "bg-bg-0/70 backdrop-blur-md" })}>
              <Icon name="arrow-left" size={14} /> Leave <kbd className="ml-1 font-mono text-[10px] text-ink-3 max-sm:hidden">Esc</kbd>
            </button>
          )}
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/wallet" className="hidden items-center gap-2 rounded-md border border-line-strong bg-bg-0/70 px-3 py-2 backdrop-blur-md sm:flex">
            <span className="figures text-[13px]">{BigInt(m.wallet).toLocaleString("en-US")}</span>
            <span className="font-mono text-[10px] text-ink-3">THC</span>
          </Link>
          <span className="hidden items-center gap-2 rounded-md border border-line-strong bg-bg-0/70 px-3 py-2 backdrop-blur-md md:flex">
            <RankPips filled={m.rank.index + 1} />
            <span className="text-[13px]">{m.rank.name}</span>
            <span className="font-mono text-[11px] text-ink-3">L{m.level}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-line-strong bg-bg-0/70 px-3 py-2 backdrop-blur-md" title="Streak">
            <Icon name="streak" size={14} className="text-gold" />
            <span className="figures text-[13px]">{m.streak.current}</span>
          </span>
          <Link href="/dashboard" className="whitespace-nowrap rounded-md border border-line-strong bg-bg-0/70 px-3 py-2 text-[12.5px] text-ink-2 backdrop-blur-md hover:text-ink-1">
            2D<span className="max-sm:hidden"> view</span>
          </Link>
          <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} aria-label="How to move" className="rounded-md border border-line-strong bg-bg-0/70 px-3 py-2 text-[12.5px] text-ink-2 backdrop-blur-md hover:text-ink-1">
            ?
          </button>
        </div>
      </header>

      {/* Door prompt. */}
      {prompt && ready && (
        <div className="absolute inset-x-0 bottom-32 flex justify-center">
          <button
            type="button"
            onClick={() => (prompt.kind === "enter" ? world.current?.enter(prompt.id) : world.current?.exit())}
            className="flex items-center gap-3 rounded-md border border-gold bg-bg-0/80 px-5 py-3 text-[14px] shadow-[var(--shadow-gold)] backdrop-blur-md animate-rise"
          >
            <Icon name={prompt.kind === "enter" ? "arrow-up-right" : "arrow-left"} size={16} className="text-gold" />
            {prompt.kind === "enter" ? `Enter ${NAME[prompt.id]}` : `Back to the plaza`}
            <kbd className="rounded-sm border border-line-strong px-1.5 font-mono text-[10.5px] text-ink-3">F</kbd>
          </button>
        </div>
      )}

      {/* Dock: quick travel for everyone, and the keyboard route through the world. */}
      <nav aria-label="Travel" className="absolute inset-x-0 bottom-0 flex justify-center p-4 md:p-6">
        <ul className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-line-strong bg-bg-0/75 p-1 backdrop-blur-md sm:gap-1 sm:p-1.5">
          {DISTRICTS.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => world.current?.travelTo(d.id)}
                aria-current={space === d.id ? "location" : undefined}
                className={cn(
                  "flex w-[54px] flex-col items-center gap-1 rounded-md px-1 py-2 text-[9.5px] transition-colors sm:w-[76px] sm:px-2 sm:text-[10.5px] md:w-[92px]",
                  space === d.id ? "bg-gold/[0.12] text-gold-bright" : "text-ink-2 hover:bg-bg-3 hover:text-ink-1"
                )}
              >
                <Icon name={d.icon} size={18} />
                <span className="whitespace-nowrap">{d.name.replace("Command Center", "Command")}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Minimap. */}
      {!inside && ready && (
        <div className="absolute bottom-28 left-4 hidden rounded-lg border border-line-strong bg-bg-0/70 p-2 backdrop-blur-md md:bottom-6 md:left-6 md:block" aria-hidden>
          <svg viewBox="-95 -105 190 195" width="150" height="154">
            <rect x="-90" y="-98" width="180" height="180" fill="none" stroke="var(--color-line-strong)" />
            <circle cx="0" cy="0" r="11" fill="none" stroke="var(--color-gold-deep)" />
            <rect x="-8" y="-51" width="16" height="34" fill="#0b1014" stroke="var(--color-line-strong)" />
            {PLAN.map((b) =>
              b.round ? (
                <circle key={b.id} cx={b.x} cy={b.z} r={b.w / 2} fill="#1f1d19" stroke="var(--color-gold-deep)" />
              ) : (
                <rect key={b.id} x={b.x - b.w / 2} y={b.z - b.d / 2} width={b.w} height={b.d} fill="#1f1d19" stroke="var(--color-gold-deep)" />
              )
            )}
            <g ref={me}>
              <path d="M0 -7 L5 5 L0 2 L-5 5 Z" fill="var(--color-gold-bright)" />
            </g>
          </svg>
        </div>
      )}

      {/* Controls. */}
      {help && ready && (
        <div className="absolute right-3 top-[4.25rem] w-[min(280px,calc(100vw-1.5rem))] rounded-lg sm:right-4 sm:top-20 border border-line-strong bg-bg-0/85 p-5 text-[13px] text-ink-2 backdrop-blur-md md:right-6 animate-fade">
          <p className="eyebrow mb-3">Moving through the HQ</p>
          {touch ? (
            <ul className="flex flex-col gap-2">
              <li><span className="text-ink-1">Drag</span> to look around</li>
              <li><span className="text-ink-1">Tap the ground</span> to walk there</li>
              <li><span className="text-ink-1">Tap a building</span> to walk to its door</li>
              <li><span className="text-ink-1">Two fingers</span>: slide up to walk, down to step back</li>
              <li>The bar below travels anywhere</li>
            </ul>
          ) : (
            <ul className="flex flex-col gap-2">
              <li><kbd className="font-mono text-ink-1">W A S D</kbd> walk · <kbd className="font-mono text-ink-1">Shift</kbd> stride</li>
              <li><span className="text-ink-1">Drag</span> to look around</li>
              <li><span className="text-ink-1">Click the ground</span> to walk there</li>
              <li><span className="text-ink-1">Click a building</span> to walk to its door</li>
              <li><kbd className="font-mono text-ink-1">F</kbd> enter · <kbd className="font-mono text-ink-1">Esc</kbd> leave</li>
            </ul>
          )}
          {quality && <p className="mt-4 border-t border-line pt-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">Quality: {quality}</p>}
        </div>
      )}

      {/* Fade between spaces. */}
      <div className={cn("pointer-events-none absolute inset-0 bg-black transition-opacity duration-[400ms]", dark ? "opacity-100" : "opacity-0")} aria-hidden />

      {/* Loading. */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-8 bg-[#050404] transition-opacity duration-[900ms]",
          ready ? "pointer-events-none opacity-0" : "opacity-100"
        )}
        role="status"
        aria-live="polite"
      >
        <CoinMark size={84} className="animate-pulse" />
        <div className="text-center">
          <p className="eyebrow">Tycoonhood HQ</p>
          <p className="display mt-3 text-[28px]">
            Entering the house, <span className="accent">{m.name}.</span>
          </p>
        </div>
        <div className="h-px w-64 bg-line">
          <div className="h-px bg-gold transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="figures text-[11px] text-ink-3">{Math.round(progress * 100)}% · stone, brass, light</p>
      </div>
    </div>
  );
}

function Fallback({ reason }: { reason: string }) {
  const why: Record<string, string> = {
    "reduced-motion": "Your device asks for reduced motion, so the walkable HQ stays closed.",
    "no-webgl2": "This browser cannot run the 3D headquarters.",
    "software-gpu": "This device has no graphics hardware the HQ can use.",
    "context-lost": "The graphics device reset while the HQ was open.",
    "load-failed": "The HQ could not finish loading.",
  };
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-[var(--gutter)] text-center">
      <CoinMark size={72} />
      <h1 className="display max-w-[20ch] text-h1">
        Everything in the HQ, <span className="accent">in two dimensions.</span>
      </h1>
      <p className="max-w-md text-[15px] text-ink-2">{why[reason] ?? "The HQ is unavailable on this device."} Every room is also a page — nothing is lost.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className={buttonStyles({ size: "lg" })}>
          Open the Command Center
        </Link>
        {reason !== "reduced-motion" && (
          <a href="/world?world=performance" className={buttonStyles({ variant: "secondary", size: "lg" })}>
            Try the HQ anyway
          </a>
        )}
      </div>
    </main>
  );
}
