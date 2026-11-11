import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  deviceGate,
  gpuGate,
  pickTier,
  decideWorld,
  QUALITY,
  stepDown,
  FrameGovernor,
  MIN_WORLD_WIDTH,
  type GpuProbe,
  type WorldSignals,
} from "../src/world/gate";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  androidPhone:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  headless:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36",
  ipad:
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  linuxDesktop:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

/** A plain desktop: mouse, big screen, wide window, nothing asked for. */
const desktop: WorldSignals = {
  ua: UA.windows,
  maxTouchPoints: 0,
  coarse: false,
  hoverNone: false,
  screenW: 1920,
  screenH: 1080,
  innerW: 1440,
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  cores: 8,
};
const sig = (over: Partial<WorldSignals>): WorldSignals => ({ ...desktop, ...over });

/** An ordinary laptop GPU: real hardware, not a strong one. */
const hardware: GpuProbe = { webgl2: true, majorCaveat: false, renderer: "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)" };
const gpu = (over: Partial<GpuProbe>): GpuProbe => ({ ...hardware, ...over });

describe("deviceGate: phones and tablets never get the campus", () => {
  it("calls these phones", () => {
    expect(deviceGate(sig({ ua: UA.iphone, maxTouchPoints: 5, coarse: true, hoverNone: true, screenW: 390, screenH: 844, innerW: 390 }))).toBe("phone");
    expect(deviceGate(sig({ ua: UA.androidPhone, maxTouchPoints: 5, coarse: true, screenW: 412, screenH: 915, innerW: 412 }))).toBe("phone");
    // The journey-8 Playwright phone: a desktop UA, a fine pointer, one touch point.
    expect(deviceGate(sig({ ua: UA.headless, maxTouchPoints: 1, coarse: false, screenW: 390, screenH: 844, innerW: 390 }))).toBe("phone");
  });

  it("calls these tablets", () => {
    expect(deviceGate(sig({ ua: UA.ipad, maxTouchPoints: 5, screenW: 834, screenH: 1194, innerW: 834 }))).toBe("tablet");
    // iPadOS asks for the desktop site with a Mac user agent; its touch points give it away.
    expect(deviceGate(sig({ ua: UA.mac, maxTouchPoints: 5, screenW: 1194, screenH: 834, innerW: 1194 }))).toBe("tablet");
    // An Android tablet in desktop mode: an X11 UA, but a coarse primary pointer.
    expect(deviceGate(sig({ ua: UA.linuxDesktop, maxTouchPoints: 10, coarse: true, screenW: 1280, screenH: 800, innerW: 1280 }))).toBe("tablet");
  });

  it("lets these through", () => {
    // A Windows touchscreen laptop: the primary pointer is a fine, hovering trackpad.
    expect(deviceGate(sig({ maxTouchPoints: 10 }))).toBeNull();
    expect(deviceGate(sig({ ua: UA.mac, maxTouchPoints: 0, screenW: 1512, screenH: 982 }))).toBeNull();
    expect(deviceGate(sig({ innerW: MIN_WORLD_WIDTH }))).toBeNull();
    expect(MIN_WORLD_WIDTH).toBe(1024);
  });

  it("names the other reasons", () => {
    expect(deviceGate(sig({ innerW: 1000 }))).toBe("narrow");
    expect(deviceGate(sig({ reducedMotion: true }))).toBe("reduced-motion");
    expect(deviceGate(sig({ saveData: true }))).toBe("save-data");
  });

  it("applies the rules in order", () => {
    const phone = { ua: UA.iphone, maxTouchPoints: 5, coarse: true, screenW: 390, screenH: 844, innerW: 390 };
    expect(deviceGate(sig({ ...phone, reducedMotion: true, saveData: true }))).toBe("phone");
    expect(deviceGate(sig({ reducedMotion: true, saveData: true }))).toBe("reduced-motion");
  });
});

describe("gpuGate: real hardware only", () => {
  it("needs WebGL2", () => {
    expect(gpuGate(gpu({ webgl2: false }))).toBe("no-webgl2");
  });

  it("treats a major performance caveat as software", () => {
    expect(gpuGate(gpu({ majorCaveat: true }))).toBe("software-gpu");
  });

  it("recognises software renderers", () => {
    for (const renderer of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "Microsoft Basic Render Driver",
      "softpipe",
    ]) {
      expect(gpuGate(gpu({ renderer })), renderer).toBe("software-gpu");
    }
  });

  it("passes hardware, and a masked renderer", () => {
    expect(gpuGate(gpu({ renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)" }))).toBeNull();
    expect(gpuGate(gpu({ renderer: "WebKit WebGL" }))).toBeNull();
  });
});

describe("decideWorld", () => {
  it("never creates a GL context when the device gate fails", () => {
    const probe = vi.fn(() => hardware);
    const phone = sig({ ua: UA.iphone, maxTouchPoints: 5, coarse: true, screenW: 390, screenH: 844, innerW: 390 });
    expect(decideWorld(phone, probe)).toEqual({ mode: "2d", reason: "phone" });
    expect(decideWorld(sig({ ua: UA.ipad, maxTouchPoints: 5, screenW: 834, screenH: 1194, innerW: 834 }), probe)).toEqual({ mode: "2d", reason: "tablet" });
    expect(decideWorld(sig({ innerW: 800 }), probe)).toEqual({ mode: "2d", reason: "narrow" });
    expect(decideWorld(sig({ reducedMotion: true }), probe)).toEqual({ mode: "2d", reason: "reduced-motion" });
    expect(probe).toHaveBeenCalledTimes(0);
  });

  it("does not let ?world= skip a gate", () => {
    const phone = sig({ ua: UA.iphone, maxTouchPoints: 5, coarse: true, screenW: 390, screenH: 844, innerW: 390 });
    expect(decideWorld(phone, () => hardware, "cinematic")).toEqual({ mode: "2d", reason: "phone" });
    const swiftshader = gpu({ renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)" });
    expect(decideWorld(desktop, () => swiftshader, "cinematic")).toEqual({ mode: "2d", reason: "software-gpu" });
    expect(decideWorld(desktop, () => gpu({ webgl2: false }), "performance")).toEqual({ mode: "2d", reason: "no-webgl2" });
  });

  it("lets an override pick only the tier, and ignores a bad one", () => {
    expect(decideWorld(desktop, () => hardware, "performance")).toEqual({ mode: "3d", tier: "performance", why: "override" });
    expect(decideWorld(desktop, () => hardware, "ultra")).toEqual({ mode: "3d", tier: "balanced", why: "default" });
    expect(decideWorld(desktop, () => hardware, "CINEMATIC")).toEqual({ mode: "3d", tier: "balanced", why: "default" });
  });

  it("chooses the tier from memory, cores and the GPU", () => {
    expect(pickTier({ deviceMemory: 2, cores: 8 }, "Apple M2").tier).toBe("performance");
    expect(pickTier({ deviceMemory: 8, cores: 2 }, "Apple M2").tier).toBe("performance");
    expect(pickTier({ deviceMemory: 8, cores: 8 }, "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)").tier).toBe("cinematic");
    expect(pickTier({ deviceMemory: 8, cores: 8 }, "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)").tier).toBe("cinematic");
    expect(pickTier({ deviceMemory: 8, cores: 8 }, "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)").tier).toBe("balanced");
    expect(pickTier({}, "WebKit WebGL").tier).toBe("balanced");
  });
});

describe("QUALITY, stepDown and FrameGovernor", () => {
  it("steps down one tier at a time", () => {
    expect(stepDown("cinematic")).toBe("balanced");
    expect(stepDown("balanced")).toBe("performance");
    expect(stepDown("performance")).toBeNull();
  });

  it("draws no AO and no reflections at performance", () => {
    expect(QUALITY.performance.ao).toBe(false);
    expect(QUALITY.performance.reflections).toBe(false);
    expect(QUALITY.cinematic.shadow).toBeGreaterThan(QUALITY.balanced.shadow);
    expect(QUALITY.balanced.shadow).toBeGreaterThan(QUALITY.performance.shadow);
  });

  it("fires once after 120 slow frames", () => {
    let slow = 0;
    const g = new FrameGovernor(() => slow++);
    for (let i = 0; i < 119; i++) g.sample(30);
    expect(slow).toBe(0);
    g.sample(30);
    expect(slow).toBe(1);
  });

  it("never fires at 16 ms", () => {
    let slow = 0;
    const g = new FrameGovernor(() => slow++);
    for (let i = 0; i < 2000; i++) g.sample(16);
    expect(slow).toBe(0);
  });

  it("ignores frames over 250 ms", () => {
    let slow = 0;
    const g = new FrameGovernor(() => slow++);
    for (let i = 0; i < 119; i++) g.sample(30);
    for (let i = 0; i < 1000; i++) g.sample(400);
    expect(slow).toBe(0);
    g.sample(30);
    expect(slow).toBe(1);
  });

  it("waits 180 frames after firing before it can fire again", () => {
    let slow = 0;
    const g = new FrameGovernor(() => slow++);
    for (let i = 0; i < 120; i++) g.sample(30);
    expect(slow).toBe(1);
    for (let i = 0; i < 180 + 119; i++) g.sample(30);
    expect(slow).toBe(1);
    g.sample(30);
    expect(slow).toBe(2);
  });
});

describe("module purity", () => {
  const src = (f: string) => readFileSync(resolve(__dirname, "../src/world", f), "utf8");

  it("keeps gate.ts free of imports, so the client can load it alone", () => {
    const gate = src("gate.ts");
    expect(gate).not.toMatch(/^\s*import[\s{*("']/m);
    expect(gate).not.toMatch(/^\s*export\s[^;]*\sfrom\s/m);
    expect(gate).not.toMatch(/\brequire\(|\bimport\(/);
  });

  it("keeps state.ts to type imports and @tycoonhood/config", () => {
    const lines = src("state.ts")
      .split("\n")
      .filter((l) => /^\s*import\b/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(/^import type /.test(line) || /from "@tycoonhood\/config";$/.test(line), line).toBe(true);
    }
  });
});
