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
  GOVERNOR,
  cadenceOf,
  MIN_WORLD_WIDTH,
  type GpuProbe,
  type Tier,
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

  it("names a narrow window only when widening it is all that stands in the way", () => {
    expect(deviceGate(sig({ innerW: 1000, reducedMotion: true }))).toBe("reduced-motion");
    expect(deviceGate(sig({ innerW: 1000, saveData: true }))).toBe("save-data");
    expect(deviceGate(sig({ innerW: 1000 }))).toBe("narrow");
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

  /** world.ts's use of the governor: step down, or close at the lowest tier or when hopeless. Times in seconds. */
  function drive(start: Tier, frameMs: number, seconds: number) {
    let tier: Tier = start;
    let t = 0;
    const events: string[] = [];
    let closed = false;
    const g = new FrameGovernor((_median, hopeless) => {
      const next = hopeless ? null : stepDown(tier);
      events.push(`${Math.round(t / 100) / 10} ${next ?? "closed"}`);
      if (next) tier = next;
      else closed = true;
    });
    while (t < seconds * 1000 && !closed) {
      t += frameMs;
      g.sample(frameMs);
    }
    return events;
  }

  it("fires once three seconds of slow frames are in", () => {
    let slow = 0;
    const g = new FrameGovernor(() => slow++);
    for (let i = 0; i < 99; i++) g.sample(30);
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

  it("counts long frames: sustained 400 ms frames step down, then close, within seconds", () => {
    expect(drive("balanced", 400, 600)).toEqual(["3.2 performance", "9.6 closed"]);
    expect(drive("performance", 520, 600)).toEqual(["3.1 closed"]);
  });

  it("closes at once when frames take a second or more, whatever the tier", () => {
    const seen: Array<[number, boolean]> = [];
    const g = new FrameGovernor((median, hopeless) => seen.push([median, hopeless]));
    for (let i = 0; i < 6; i++) g.sample(5000);
    expect(seen).toEqual([[GOVERNOR.clampMs, true]]);
    expect(drive("cinematic", 1200, 600)).toEqual(["7.2 closed"]);
  });

  it("never fires for a lone stall of 2 to 5 seconds among quick frames", () => {
    let slow = 0;
    const g = new FrameGovernor(() => slow++);
    for (let round = 0; round < 200; round++) {
      for (let i = 0; i < 40; i++) g.sample(16);
      g.sample(2000 + (round % 4) * 1000);
    }
    expect(slow).toBe(0);
  });

  it("waits three seconds after firing before it judges again", () => {
    let slow = 0;
    const g = new FrameGovernor(() => slow++);
    for (let i = 0; i < 100; i++) g.sample(30);
    expect(slow).toBe(1);
    for (let i = 0; i < 100 + 99; i++) g.sample(30);
    expect(slow).toBe(1);
    g.sample(30);
    expect(slow).toBe(2);
  });

  it("judges frames against the display's cadence, not a fixed budget", () => {
    // A browser held at 30 Hz (Energy Saver, Low Power Mode): steady 33 ms frames are not slow.
    let slow = 0;
    const capped = new FrameGovernor(() => slow++);
    capped.setBase(1000 / 30);
    for (let i = 0; i < 2000; i++) capped.sample(1000 / 30);
    expect(slow).toBe(0);
    // Twice that, at 30 Hz, is.
    for (let i = 0; i < 100; i++) capped.sample(2000 / 30);
    expect(slow).toBe(1);

    // At 60 Hz, 40 ms frames are slow, and so are 33 ms ones (every other refresh missed).
    const sixty = new FrameGovernor(() => slow++);
    sixty.setBase(1000 / 60);
    for (let i = 0; i < 100; i++) sixty.sample(40);
    expect(slow).toBe(2);
    expect(sixty.slowMs).toBe(GOVERNOR.budgetMs);
    expect(capped.slowMs).toBeCloseTo(50);
  });

  it("reads the display's cadence from frame intervals, and only a plausible one", () => {
    const sixty = [16.6, 16.7, 16.7, 16.8, 16.6, 16.7, 120, 250, 16.7, 33.4];
    expect(cadenceOf(sixty)).toBeCloseTo(16.7, 0);
    expect(cadenceOf([33.3, 33.4, 33.2, 33.3, 66.7, 33.3, 400])).toBeCloseTo(33.3, 0);
    expect(cadenceOf([16.7, 16.7, 16.7])).toBeNull();
    expect(cadenceOf([120, 140, 160, 180, 200, 220])).toBeNull();
    expect(cadenceOf([Number.NaN, -5, 0, 16.7, 16.7, 16.7, 16.7, 16.7])).toBeCloseTo(16.7);
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
