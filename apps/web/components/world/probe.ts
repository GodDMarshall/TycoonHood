/**
 * The campus's device and GPU check (DR-30), run on the device after
 * hydration, never during render and never on the server.
 *
 * It imports only core's gate.ts, which has no imports of its own, so it
 * adds a few hundred bytes to a page and nothing more. What it reads (the
 * user agent, memory, cores, the GPU's renderer string) stays here: it is
 * used to decide locally and is never logged, sent or stored, because the
 * renderer string is a fingerprinting vector.
 */
import { decideWorld, deviceGate, type GpuProbe, type WorldDecision, type WorldSignals } from "@tycoonhood/core/src/world/gate";

type NavigatorExtras = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

const matches = (query: string) => window.matchMedia(query).matches;

export function readSignals(): WorldSignals {
  const nav = navigator as NavigatorExtras;
  return {
    ua: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    coarse: matches("(pointer: coarse)"),
    hoverNone: matches("(hover: none)"),
    screenW: window.screen.width,
    screenH: window.screen.height,
    innerW: window.innerWidth,
    reducedMotion: matches("(prefers-reduced-motion: reduce)"),
    saveData: nav.connection?.saveData === true,
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined,
    cores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : undefined,
  };
}

/**
 * One detached canvas: a WebGL2 context that refuses a major performance
 * caveat (software rendering), then a plain one, then the renderer's name.
 * The context is released before this returns.
 */
export function probeGpu(): GpuProbe {
  const canvas = document.createElement("canvas");
  const strict = webgl2(canvas, { failIfMajorPerformanceCaveat: true });
  const gl = strict ?? webgl2(canvas);
  if (!gl) return { webgl2: false, majorCaveat: false, renderer: "" };
  const renderer = rendererOf(gl);
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { webgl2: true, majorCaveat: strict === null, renderer };
}

function webgl2(canvas: HTMLCanvasElement, attributes?: WebGLContextAttributes): WebGL2RenderingContext | null {
  try {
    return canvas.getContext("webgl2", attributes);
  } catch {
    return null;
  }
}

function rendererOf(gl: WebGL2RenderingContext): string {
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
  } catch {
    return "";
  }
}

/** QA only: ?world=cinematic|balanced|performance picks the tier. It never skips a gate. */
export function readOverride(): string | null {
  return new URLSearchParams(window.location.search).get("world");
}

/** The whole decision: device gate, then (only if it passes) the GPU, then the tier. */
export function decide(): WorldDecision {
  return decideWorld(readSignals(), probeGpu, readOverride());
}

/** Whether this device may be offered the campus at all. No WebGL context is created. */
export function deviceEligible(): boolean {
  return deviceGate(readSignals()) === null;
}
