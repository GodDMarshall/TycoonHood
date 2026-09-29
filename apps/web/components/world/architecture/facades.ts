/**
 * Facades — the difference between a block and a building.
 *
 * Drawn once at load into canvases: curtain walls with bronze mullions,
 * spandrel bands and a scatter of lit offices (dusk: some people are still
 * working); a warm lobby; a library seen through glass. Each texture covers
 * a real module (bays × floors in metres), and geometry carries matching
 * UVs, so every window is the right size on every building.
 */
import { CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

function tex(c: HTMLCanvasElement, color = true) {
  const t = new CanvasTexture(c);
  if (color) t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

/**
 * Curtain wall. `bays` × `floors` windows per texture; `lit` = share of
 * offices with the lights on. Returns a material whose texture spans
 * BAY*bays metres × FLOOR*floors metres (use as box(... tile, {tileV})).
 */
export function curtainWall(opts: { bays?: number; floors?: number; lit?: number; seed?: number; cool?: number } = {}) {
  const bays = opts.bays ?? 16;
  const floors = opts.floors ?? 16;
  const lit = opts.lit ?? 0.34;
  const r = rng(opts.seed ?? 11);
  const W = 1024;
  const H = 1024;
  const bw = W / bays;
  const fh = H / floors;
  const albedo = canvas(W, H);
  const glow = canvas(W, H);
  const rough = canvas(W, H);
  const a = albedo.g;
  const e = glow.g;
  const ro = rough.g;
  a.fillStyle = "#0c0e11";
  a.fillRect(0, 0, W, H);
  e.fillStyle = "#000";
  e.fillRect(0, 0, W, H);
  ro.fillStyle = "#111"; // glass: very smooth
  ro.fillRect(0, 0, W, H);
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    const floorOn = r() < 0.85;
    for (let b = 0; b < bays; b++) {
      const x = b * bw;
      const on = floorOn && r() < lit;
      if (on) {
        const cool = r() < (opts.cool ?? 0.15);
        const grad = e.createLinearGradient(0, y, 0, y + fh);
        const top = cool ? "rgba(200,220,255," : "rgba(255,196,128,";
        const k = 0.55 + r() * 0.45;
        grad.addColorStop(0, top + (0.9 * k).toFixed(2) + ")");
        grad.addColorStop(0.55, top + (0.55 * k).toFixed(2) + ")");
        grad.addColorStop(1, top + (0.25 * k).toFixed(2) + ")");
        e.fillStyle = grad;
        e.fillRect(x, y, bw, fh);
        // A ceiling light line and the silhouette of a desk.
        e.fillStyle = cool ? "rgba(235,245,255,0.95)" : "rgba(255,236,200,0.95)";
        e.fillRect(x + bw * 0.15, y + fh * 0.12, bw * 0.7, Math.max(1, fh * 0.03));
        if (r() < 0.5) {
          e.fillStyle = "rgba(0,0,0,0.5)";
          e.fillRect(x + bw * (0.1 + r() * 0.3), y + fh * 0.6, bw * 0.5, fh * 0.22);
        }
      }
      // Glass tint variation so dark windows are not one flat panel.
      a.fillStyle = `rgba(${18 + r() * 10},${22 + r() * 10},${28 + r() * 12},1)`;
      a.fillRect(x, y, bw, fh);
    }
    // Spandrel band.
    for (const g2 of [a, e]) {
      g2.fillStyle = g2 === a ? "#1d1812" : "#000";
      g2.fillRect(0, y + fh * 0.86, W, fh * 0.14);
    }
    ro.fillStyle = "#6a6a6a";
    ro.fillRect(0, y + fh * 0.86, W, fh * 0.14);
  }
  // Bronze mullions.
  for (let b = 0; b <= bays; b++) {
    for (const g2 of [a, e]) {
      g2.fillStyle = g2 === a ? "#3a2c1c" : "#000";
      g2.fillRect(b * bw - 1.5, 0, 3, H);
    }
    ro.fillStyle = "#5a5a5a";
    ro.fillRect(b * bw - 1.5, 0, 3, H);
  }
  const mat = new MeshStandardMaterial({
    map: tex(albedo.c),
    emissiveMap: tex(glow.c),
    emissive: new Color("#ffffff"),
    emissiveIntensity: 1.7,
    roughnessMap: tex(rough.c, false),
    roughness: 1,
    metalness: 0.85,
    envMapIntensity: 1.25,
  });
  return { mat, moduleW: 3, moduleH: 4, spanW: 3 * bays, spanH: 4 * floors };
}

/** A warm double-height lobby behind glass: mullions every 1.5m, a light shelf, people-scale detail. */
export function lobbyGlass() {
  const { c, g } = canvas(512, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#ffd7a0");
  grad.addColorStop(0.2, "#e6a864");
  grad.addColorStop(0.8, "#8a5a30");
  grad.addColorStop(1, "#2a1a0e");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);
  // Pendant lights.
  for (let i = 0; i < 8; i++) {
    g.fillStyle = "rgba(255,245,220,1)";
    g.beginPath();
    g.arc(32 + i * 64, 60, 6, 0, Math.PI * 2);
    g.fill();
  }
  // Mezzanine band and mullions.
  g.fillStyle = "rgba(30,20,12,0.9)";
  g.fillRect(0, 118, 512, 10);
  for (let x = 0; x <= 512; x += 32) {
    g.fillStyle = "#1c140c";
    g.fillRect(x - 2, 0, 4, 256);
  }
  const t = tex(c);
  return new MeshStandardMaterial({ color: "#1a1410", emissive: new Color("#ffffff"), emissiveMap: t, emissiveIntensity: 1.6, map: t, metalness: 0.3, roughness: 0.15 });
}

/** The Academy's library face: warm light, shelf lines, reading lamps. */
export function libraryGlass() {
  const { c, g } = canvas(512, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#f2c07a");
  grad.addColorStop(1, "#6d4222");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const r = rng(5);
  for (let y = 24; y < 512; y += 44) {
    g.fillStyle = "rgba(40,24,12,0.9)";
    g.fillRect(0, y, 512, 5);
    for (let x = 0; x < 512; x += 3 + Math.floor(r() * 3)) {
      g.fillStyle = `rgba(${40 + r() * 60},${20 + r() * 30},${10 + r() * 20},${0.5 + r() * 0.4})`;
      g.fillRect(x, y - 30 + r() * 6, 2 + r() * 2, 30);
    }
  }
  for (let x = 0; x <= 512; x += 64) {
    g.fillStyle = "#20160e";
    g.fillRect(x - 3, 0, 6, 512);
  }
  const t = tex(c);
  return new MeshStandardMaterial({ color: "#140e09", emissive: new Color("#ffffff"), emissiveMap: t, emissiveIntensity: 1.35, map: t, metalness: 0.2, roughness: 0.12 });
}
