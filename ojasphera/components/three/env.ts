/**
 * Tiny, dependency-free helpers shared with non-3D code. Kept apart from
 * engine.ts so importing them never pulls three.js into the initial bundle.
 */

/** True when the browser can create a WebGL2 (or WebGL) context. */
export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Live counters other parts of the page can read (the "proof" section). */
export const telemetry = { frames: 0, pulses: 0, interactions: 0 };
if (typeof window !== "undefined") (window as unknown as { __ojasphera?: typeof telemetry }).__ojasphera = telemetry;
