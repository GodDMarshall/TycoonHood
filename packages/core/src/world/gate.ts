/**
 * THE 3D CAMPUS GATE (DR-30): who may walk the optional campus at /world.
 *
 * Pure and free of imports on purpose. Client code deep-imports this file as
 * "@tycoonhood/core/src/world/gate", so it must never pull the core barrel
 * (and with it Prisma) into a browser bundle. The browser gathers the
 * signals; this file only decides. A test fails if an import ever appears.
 *
 * The order is the product rule:
 *   1. device: phones, tablets, narrow windows, reduced motion, data saver
 *   2. GPU: WebGL2 that real hardware draws
 *   3. tier: chosen only once both gates pass. `?world=` may choose the
 *      tier for QA; nothing can skip a gate.
 */

/** What the browser reports. Gathered on the device, never on the server. */
export interface WorldSignals {
  /** navigator.userAgent */
  ua: string;
  /** navigator.maxTouchPoints */
  maxTouchPoints: number;
  /** matchMedia("(pointer: coarse)"): the primary pointer only */
  coarse: boolean;
  /** matchMedia("(hover: none)"): the primary pointer only */
  hoverNone: boolean;
  /** screen.width and screen.height */
  screenW: number;
  screenH: number;
  /** window.innerWidth */
  innerW: number;
  /** matchMedia("(prefers-reduced-motion: reduce)") */
  reducedMotion: boolean;
  /** navigator.connection.saveData */
  saveData: boolean;
  /** navigator.deviceMemory, in GB, where the browser reports it */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency */
  cores?: number;
}

/** One probe canvas, released straight after reading these. */
export interface GpuProbe {
  /** A WebGL2 context could be created at all. */
  webgl2: boolean;
  /** Only the failIfMajorPerformanceCaveat context failed. */
  majorCaveat: boolean;
  /** UNMASKED_RENDERER_WEBGL, else RENDERER; "" when unknown. */
  renderer: string;
}

export type Tier = "cinematic" | "balanced" | "performance";
export const TIERS: readonly Tier[] = ["cinematic", "balanced", "performance"];

/** Why the page stays 2D. The host writes it to data-world-fallback. */
export type WorldFallbackReason =
  | "phone"
  | "tablet"
  | "narrow"
  | "reduced-motion"
  | "save-data"
  | "no-webgl2"
  | "software-gpu"
  | "load-failed"
  | "context-lost"
  | "too-slow"
  | "chosen";

/** Why a tier was chosen. */
export type TierWhy = "override" | "constrained" | "strong-gpu" | "default";

export type WorldDecision =
  | { mode: "3d"; tier: Tier; why: TierWhy }
  | { mode: "2d"; reason: WorldFallbackReason };

/** Tailwind's lg breakpoint, where the app's sidebar appears. */
export const MIN_WORLD_WIDTH = 1024;
/** A touch device whose shorter screen side is below this is a phone. */
export const PHONE_MAX_SIDE = 600;

export const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;
export const STRONG_GPU = /apple m\d|rtx|radeon rx|geforce gtx 1[06-9]|geforce rtx|arc a/i;
const TOUCH_UA = /Android|iPhone|iPad|iPod|Mobile/i;

export function isTier(v: unknown): v is Tier {
  return v === "cinematic" || v === "balanced" || v === "performance";
}

/**
 * Phones and tablets never get the campus, nor do narrow windows, reduced
 * motion or data saver. Only the primary pointer counts, so a touchscreen
 * laptop with a mouse or trackpad stays eligible. iPadOS reports a desktop
 * Mac user agent; its touch points give it away.
 */
export function deviceGate(s: WorldSignals): WorldFallbackReason | null {
  const small = Math.min(s.screenW, s.screenH) < PHONE_MAX_SIDE;
  const touch =
    s.coarse || s.hoverNone || TOUCH_UA.test(s.ua) || (/Macintosh/.test(s.ua) && s.maxTouchPoints > 0);
  if (touch) return small ? "phone" : "tablet";
  if (s.maxTouchPoints > 0 && small) return "phone";
  if (s.innerW < MIN_WORLD_WIDTH) return "narrow";
  if (s.reducedMotion) return "reduced-motion";
  if (s.saveData) return "save-data";
  return null;
}

/** No WebGL2, or WebGL2 drawn in software, keeps the page 2D. */
export function gpuGate(p: GpuProbe): WorldFallbackReason | null {
  if (!p.webgl2) return "no-webgl2";
  if (p.majorCaveat) return "software-gpu";
  if (SOFTWARE_GPU.test(p.renderer)) return "software-gpu";
  return null;
}

/** The tier, once every gate has passed. An override only picks the tier. */
export function pickTier(
  s: Pick<WorldSignals, "deviceMemory" | "cores">,
  renderer: string,
  override?: string | null
): { tier: Tier; why: TierWhy } {
  if (isTier(override)) return { tier: override, why: "override" };
  if ((s.deviceMemory ?? 8) < 4 || (s.cores ?? 8) < 4) return { tier: "performance", why: "constrained" };
  if (STRONG_GPU.test(renderer)) return { tier: "cinematic", why: "strong-gpu" };
  return { tier: "balanced", why: "default" };
}

/**
 * The whole decision. `probe` creates a WebGL context, so it runs only after
 * the device gate passes: phones and tablets never touch the GPU at all.
 */
export function decideWorld(s: WorldSignals, probe: () => GpuProbe, override?: string | null): WorldDecision {
  const device = deviceGate(s);
  if (device) return { mode: "2d", reason: device };
  const gpu = probe();
  const reason = gpuGate(gpu);
  if (reason) return { mode: "2d", reason };
  const { tier, why } = pickTier(s, gpu.renderer, override);
  return { mode: "3d", tier, why };
}

/**
 * What each tier draws.
 *
 *   cinematic    desktop-class GPU: AO at full resolution, 4K shadows,
 *                reflecting pool, bloom, DPR up to 1.75
 *   balanced     most laptops: AO at half resolution, 2K shadows, no planar
 *                reflections, DPR up to 1.25
 *   performance  weak GPUs: no AO, 1K shadows, DPR 0.85
 */
export const QUALITY = {
  cinematic: { dpr: 1.75, shadow: 4096, ao: true, aoHalf: false, reflections: true, bloom: true, skyline: 260 },
  balanced: { dpr: 1.25, shadow: 2048, ao: true, aoHalf: true, reflections: false, bloom: true, skyline: 180 },
  performance: { dpr: 0.85, shadow: 1024, ao: false, aoHalf: true, reflections: false, bloom: true, skyline: 90 },
} as const;

export function stepDown(q: Tier): Tier | null {
  return q === "cinematic" ? "balanced" : q === "balanced" ? "performance" : null;
}

/**
 * Median-of-window frame timing; asks for a lower tier when frames run long.
 * It is fed frame durations and never reads a clock itself.
 */
export class FrameGovernor {
  private samples: number[] = [];
  private cooldown = 0;
  constructor(private readonly onSlow: () => void) {}
  sample(ms: number) {
    if (ms > 250) return;
    if (this.cooldown > 0) {
      this.cooldown--;
      return;
    }
    this.samples.push(ms);
    if (this.samples.length < 120) return;
    const med = [...this.samples].sort((a, b) => a - b)[60];
    this.samples = [];
    if (med > 26) {
      this.cooldown = 180;
      this.onSlow();
    }
  }
}
