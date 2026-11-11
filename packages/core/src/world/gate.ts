/**
 * THE 3D CAMPUS GATE (DR-30): who may walk the optional campus at /world.
 *
 * Pure and free of imports on purpose. Client code deep-imports this file as
 * "@tycoonhood/core/src/world/gate", so it must never pull the core barrel
 * (and with it Prisma) into a browser bundle. The browser gathers the
 * signals; this file only decides. A test fails if an import ever appears.
 *
 * The order is the product rule:
 *   1. device: phones, tablets, reduced motion, data saver, then narrow
 *      windows (last, because resizing is the one thing that fixes it)
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
 * Phones and tablets never get the campus, nor do reduced motion, data saver
 * or narrow windows. Only the primary pointer counts, so a touchscreen
 * laptop with a mouse or trackpad stays eligible. iPadOS reports a desktop
 * Mac user agent; its touch points give it away. A narrow window is named
 * last: widening it is a promise only when nothing else stands in the way.
 */
export function deviceGate(s: WorldSignals): WorldFallbackReason | null {
  const small = Math.min(s.screenW, s.screenH) < PHONE_MAX_SIDE;
  const touch =
    s.coarse || s.hoverNone || TOUCH_UA.test(s.ua) || (/Macintosh/.test(s.ua) && s.maxTouchPoints > 0);
  if (touch) return small ? "phone" : "tablet";
  if (s.maxTouchPoints > 0 && small) return "phone";
  if (s.reducedMotion) return "reduced-motion";
  if (s.saveData) return "save-data";
  if (s.innerW < MIN_WORLD_WIDTH) return "narrow";
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
 * How the frame governor judges frames.
 *
 * It reads requestAnimationFrame intervals, and a browser can run those
 * below the display's rate: Chrome's Energy Saver and Safari's Low Power
 * Mode hold them at 30 Hz however idle the GPU is. So a frame is slow only
 * against the display's own cadence (`base`): it must span one and a half
 * display intervals, and the 26 ms budget of a 60 Hz display.
 */
export const GOVERNOR = {
  /** The frame budget at 60 Hz: a median over it is slow. */
  budgetMs: 26,
  /** The longest interval a display, or a browser's cap, produces: 20 Hz. */
  cadenceMaxMs: 50,
  /** No frame counts for more than this, so one stall cannot outweigh a window. */
  clampMs: 1000,
  /** A window is this much frame time, and at least `minSamples` frames. */
  windowMs: 3000,
  minSamples: 6,
  /** After it fires, this much frame time passes unjudged while the tier settles. */
  cooldownMs: 3000,
} as const;

/**
 * The display's frame interval, from requestAnimationFrame intervals taken
 * while nothing heavy is drawn; null when there are too few, or when they
 * are too long to be a display's (the page was busy, not the screen). Long
 * tasks only ever add time, so a low percentile is the display.
 */
export function cadenceOf(gaps: readonly number[]): number | null {
  const g = gaps.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (g.length < 5) return null;
  const ms = g[Math.floor(g.length / 5)];
  return ms <= GOVERNOR.cadenceMaxMs ? ms : null;
}

/**
 * Median-of-window frame timing; asks for a lower tier when frames run long.
 * It is fed frame intervals and never reads a clock itself; the caller
 * leaves out the frames after a stall it knows about (a hidden tab, a scene
 * switch, a change of tier).
 *
 *   - Long frames count, clamped to `clampMs`: a device drawing one frame a
 *     second is judged like any other, and one stall never decides a window.
 *   - A window is three seconds of frames (six at least), so a slow device
 *     is judged in seconds, however few frames it draws.
 *   - It fires when the median frame is slow, saying whether that median is
 *     hopeless: a frame a second or slower, which no tier can rescue.
 */
export class FrameGovernor {
  private samples: number[] = [];
  private elapsed = 0;
  private cooldown = 0;
  private base = 1000 / 60;
  constructor(private readonly onSlow: (median: number, hopeless: boolean) => void) {}

  /** The display's own frame interval; frames are judged against it. */
  setBase(ms: number) {
    if (Number.isFinite(ms) && ms > 0) this.base = Math.min(ms, GOVERNOR.cadenceMaxMs);
  }

  /** A frame longer than this is slow. */
  get slowMs() {
    return Math.max(GOVERNOR.budgetMs, 1.5 * this.base);
  }

  /** Forget the frames gathered so far. */
  reset() {
    this.samples = [];
    this.elapsed = 0;
  }

  sample(ms: number) {
    if (!(ms > 0)) return;
    if (this.cooldown > 0) {
      this.cooldown -= ms;
      return;
    }
    this.samples.push(Math.min(ms, GOVERNOR.clampMs));
    this.elapsed += ms;
    const n = this.samples.length;
    if (n < GOVERNOR.minSamples || this.elapsed < GOVERNOR.windowMs) return;
    // The lower median: most frames in the window must be slow.
    const median = [...this.samples].sort((a, b) => a - b)[(n - 1) >> 1];
    this.reset();
    if (median <= this.slowMs) return;
    this.cooldown = GOVERNOR.cooldownMs;
    this.onSlow(median, median >= GOVERNOR.clampMs);
  }
}
