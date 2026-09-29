/**
 * Quality tiers for the world. Decided before three.js is fetched.
 *
 *   cinematic    desktop-class GPU: AO full-res, 4K shadows, reflecting pool,
 *                bloom, DPR ≤ 1.75
 *   balanced     most laptops and good phones: AO half-res, 2K shadows, no
 *                planar reflections, DPR ≤ 1.25
 *   performance  weak GPUs and small phones: no AO, 1K shadows, DPR 0.85
 *   none         no WebGL2 / software GPU / reduced motion: the 2D app
 *
 * The FrameGovernor steps a tier down at runtime instead of stuttering.
 * `?world=cinematic|balanced|performance` overrides detection (QA only).
 */
export type Quality = "cinematic" | "balanced" | "performance";
export type Tier = Quality | "none";

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };

export function detectQuality(): { tier: Tier; reason: string } {
  if (typeof window === "undefined") return { tier: "none", reason: "server" };
  const forced = new URLSearchParams(window.location.search).get("world");
  if (forced === "cinematic" || forced === "balanced" || forced === "performance") return { tier: forced, reason: "forced" };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return { tier: "none", reason: "reduced-motion" };

  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2");
  if (!gl) return { tier: "none", reason: "no-webgl2" };
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return { tier: "none", reason: "software-gpu" };

  const nav = navigator as Nav;
  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (nav.connection?.saveData) return { tier: "performance", reason: "save-data" };
  if (mem < 4 || cores < 4) return { tier: "performance", reason: "constrained" };
  if (coarse || small) return { tier: small ? "performance" : "balanced", reason: "touch-device" };
  if (/apple m\d|rtx|radeon rx|geforce gtx 1[06-9]|geforce rtx|arc a/i.test(renderer)) return { tier: "cinematic", reason: "strong-gpu" };
  return { tier: "balanced", reason: "default" };
}

export const QUALITY = {
  cinematic: { dpr: 1.75, shadow: 4096, ao: true, aoHalf: false, reflections: true, bloom: true, skyline: 260 },
  balanced: { dpr: 1.25, shadow: 2048, ao: true, aoHalf: true, reflections: false, bloom: true, skyline: 180 },
  performance: { dpr: 0.85, shadow: 1024, ao: false, aoHalf: true, reflections: false, bloom: true, skyline: 90 },
} as const;

export function stepDown(q: Quality): Quality | null {
  return q === "cinematic" ? "balanced" : q === "balanced" ? "performance" : null;
}

/** Median-of-window frame timing; asks for a lower tier when frames run long. */
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
