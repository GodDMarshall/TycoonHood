/**
 * Performance controls for the HQ scene.
 *
 * Three tiers, decided before a single byte of three.js is fetched:
 *   full   — desktop-class GPU: antialiasing, particles, DPR up to 2
 *   lite   — capable but constrained: DPR 1, no particles, no AA
 *   static — the architectural drawing, no WebGL at all
 *
 * Static is not a failure mode, it is a first-class rendering: phones,
 * reduced motion, Save-Data, slow networks and software GPUs all get it.
 * `?hq=3d` / `?hq=static` override detection for QA only.
 */
export type Tier = "full" | "lite" | "static";

type Nav = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

export function detectTier(): { tier: Tier; reason: string } {
  if (typeof window === "undefined") return { tier: "static", reason: "server" };
  const force = new URLSearchParams(window.location.search).get("hq");
  if (force === "static") return { tier: "static", reason: "forced" };
  if (force !== "3d") {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return { tier: "static", reason: "reduced-motion" };
    const nav = navigator as Nav;
    if (nav.connection?.saveData) return { tier: "static", reason: "save-data" };
    if (/(^|-)2g$/.test(nav.connection?.effectiveType ?? "")) return { tier: "static", reason: "slow-network" };
    // The live scene shares the hero with the headline only from 1280px up.
    if (window.innerWidth < 1280) return { tier: "static", reason: "small-viewport" };
  }

  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: force !== "3d" });
  if (!gl) return { tier: "static", reason: "no-webgl2" };
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  if (force === "3d") return { tier: "full", reason: "forced" };
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return { tier: "static", reason: "software-gpu" };

  const nav = navigator as Nav;
  const weak = (nav.deviceMemory ?? 8) < 4 || (navigator.hardwareConcurrency ?? 8) < 4;
  return weak ? { tier: "lite", reason: "constrained-device" } : { tier: "full", reason: "capable" };
}

/**
 * Watches real frame times and degrades instead of stuttering: first the
 * pixel ratio drops, then — if the GPU still cannot hold ~25fps — the scene
 * asks to be replaced by the static drawing.
 */
export class FrameGovernor {
  private samples: number[] = [];
  private stage = 0;
  constructor(
    private readonly onLowerQuality: () => void,
    private readonly onGiveUp: () => void
  ) {}

  sample(deltaMs: number) {
    if (deltaMs > 250) return; // tab switch, breakpoint — not a real frame
    this.samples.push(deltaMs);
    if (this.samples.length < 90) return;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.samples = [];
    if (median > 40 && this.stage >= 1) {
      this.stage = 2;
      this.onGiveUp();
    } else if (median > 24 && this.stage === 0) {
      this.stage = 1;
      this.onLowerQuality();
    }
  }
}
