/**
 * WORLD MATERIALS — procedural PBR texture generator.
 *
 * Writes seamless albedo / roughness / normal maps for the HQ's materials to
 * apps/web/public/world/tex. Deterministic (fixed seeds), so the output is
 * reproducible and reviewable; the generated files are committed so the app
 * never runs this at build or request time.
 *
 *   node scripts/world/generate-textures.mjs            # all materials
 *   node scripts/world/generate-textures.mjs marble     # one
 *
 * Seamless tiling: every noise field is sampled on a 4D torus (two circles),
 * so the left edge meets the right and the top meets the bottom exactly.
 */
import { createNoise4D } from "simplex-noise";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "apps/web/public/world/tex");
mkdirSync(OUT, { recursive: true });

// Deterministic PRNG for the noise permutation tables.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable fractal noise in [-1, 1]: u,v in [0,1), `scale` = features per tile. */
function makeField(seed) {
  const n4 = createNoise4D(mulberry32(seed));
  const TAU = Math.PI * 2;
  return function fbm(u, v, scale, octaves = 5, gain = 0.5, lac = 2) {
    let amp = 1;
    let freq = scale;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const r = freq / TAU;
      const a = u * TAU;
      const b = v * TAU;
      sum += amp * n4(Math.cos(a) * r, Math.sin(a) * r, Math.cos(b) * r + o * 17.3, Math.sin(b) * r + o * 5.1);
      norm += amp;
      amp *= gain;
      freq *= lac;
    }
    return sum / norm;
  };
}

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const srgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/**
 * Build a material from a per-pixel shader returning
 * { c: [r,g,b] 0..1, rough: 0..1, h: height 0..1 }.
 */
async function build(name, size, shader, { normalStrength = 2 } = {}) {
  const t0 = Date.now();
  const albedo = Buffer.alloc(size * size * 3);
  const rough = Buffer.alloc(size * size);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const s = shader(x / size, y / size);
      albedo[i * 3] = Math.round(clamp(s.c[0]) * 255);
      albedo[i * 3 + 1] = Math.round(clamp(s.c[1]) * 255);
      albedo[i * 3 + 2] = Math.round(clamp(s.c[2]) * 255);
      rough[i] = Math.round(clamp(s.rough) * 255);
      height[i] = s.h;
    }
  }
  // Normal map from height (Sobel, wrapping at the edges so it stays seamless).
  const normal = Buffer.alloc(size * size * 3);
  const H = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
      const dy =
        H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
      let nx = -dx * normalStrength;
      let ny = -dy * normalStrength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 3;
      normal[i] = Math.round((nx * 0.5 + 0.5) * 255);
      normal[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normal[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    }
  }
  const raw = (buf, ch) => sharp(buf, { raw: { width: size, height: size, channels: ch } });
  await raw(albedo, 3).jpeg({ quality: 86, mozjpeg: true }).toFile(`${OUT}/${name}_albedo.jpg`);
  await raw(rough, 1).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/${name}_rough.jpg`);
  await raw(normal, 3).jpeg({ quality: 90, mozjpeg: true }).toFile(`${OUT}/${name}_normal.jpg`);
  console.log(`  ${name.padEnd(12)} ${size}² in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// ─────────────────────────────────────────────────────────── materials

const MATERIALS = {
  /** Nero Marquina: near-black polished marble, white + warm-gold veins. */
  marble: async () => {
    const f = makeField(11);
    const g = makeField(12);
    const base = srgb("#0d0c0b");
    const cloud = srgb("#1a1815");
    const vein = srgb("#d9d2c4");
    const gold = srgb("#b8914a");
    await build(
      "marble",
      2048,
      (u, v) => {
        const warp = f(u, v, 2.2, 5) * 1.6;
        const w2 = g(u + 0.31, v + 0.77, 3.1, 4) * 0.9;
        const band = Math.sin((u * 2 + v * 3) * Math.PI * 2 + warp * 3.2 + w2 * 2.1);
        const fine = 1 - smooth(0.0, 0.09, Math.abs(band));
        const thin = 1 - smooth(0.0, 0.025, Math.abs(Math.sin((u * 3 - v * 2) * Math.PI * 2 + warp * 4.5)));
        const clouds = smooth(-0.3, 0.8, g(u, v, 4, 5));
        let c = base.map((b, k) => mix(b, cloud[k], clouds * 0.7));
        const goldAmt = smooth(0.2, 0.7, f(u + 0.5, v + 0.2, 1.5, 3));
        const vc = vein.map((w, k) => mix(w, gold[k], goldAmt));
        const veinAmt = clamp(fine * 0.85 + thin * 0.35);
        c = c.map((x, k) => mix(x, vc[k], veinAmt * 0.42));
        // Slab joints: 2 × 2 slabs per tile (1.6m slabs at the plaza's 3.2m tile).
        const ju = Math.min(u % 0.5, 0.5 - (u % 0.5));
        const jv = Math.min(v % 0.5, 0.5 - (v % 0.5));
        const joint = 1 - smooth(0.0006, 0.0022, Math.min(ju, jv));
        c = c.map((x) => x * (1 - joint * 0.75));
        return { c, rough: 0.07 + clouds * 0.05 + veinAmt * 0.06 + joint * 0.5, h: -veinAmt * 0.15 + clouds * 0.05 - joint * 0.6 };
      },
      { normalStrength: 0.6 }
    );
  },

  /** Honed basalt: the dark structural stone of every facade. */
  basalt: async () => {
    const f = makeField(21);
    const g = makeField(22);
    const a = srgb("#17181a");
    const b = srgb("#26272a");
    await build(
      "basalt",
      1024,
      (u, v) => {
        const n = f(u, v, 6, 6) * 0.5 + 0.5;
        const speck = smooth(0.62, 0.75, g(u, v, 90, 2) * 0.5 + 0.5);
        const pit = smooth(0.7, 0.9, g(u + 0.4, v, 40, 2) * 0.5 + 0.5);
        let c = a.map((x, k) => mix(x, b[k], n));
        c = c.map((x) => x * (1 + speck * 0.35) * (1 - pit * 0.35));
        return { c, rough: 0.62 + n * 0.12 + pit * 0.2, h: n * 0.6 - pit * 0.8 };
      },
      { normalStrength: 1.4 }
    );
  },

  /** Board-formed architectural concrete (Ando): tie holes, form seams, soft mottling. */
  concrete: async () => {
    const f = makeField(31);
    const g = makeField(32);
    const base = srgb("#4b4843");
    const dark = srgb("#34322e");
    await build(
      "concrete",
      1024,
      (u, v) => {
        const mottle = f(u, v, 3, 6) * 0.5 + 0.5;
        const grain = g(u, v, 120, 2) * 0.5 + 0.5;
        // Panel grid: 2 × 1 panels per tile, 6 tie holes per panel.
        const pu = (u * 2) % 1;
        const pv = v % 1;
        const seam = 1 - smooth(0.0, 0.004, Math.min(pu, 1 - pu, pv, 1 - pv));
        const hx = ((pu * 3 + 0.5) % 1) - 0.5;
        const hy = ((pv * 2 + 0.5) % 1) - 0.5;
        const hole = 1 - smooth(0.02, 0.028, Math.hypot(hx / 3, hy / 2) * 3);
        let c = base.map((x, k) => mix(dark[k], x, mottle));
        c = c.map((x) => x * (0.92 + grain * 0.16) * (1 - seam * 0.35) * (1 - hole * 0.55));
        return { c, rough: 0.78 + grain * 0.12, h: grain * 0.25 + mottle * 0.3 - seam * 0.6 - hole * 1.2 };
      },
      { normalStrength: 1.6 }
    );
  },

  /** Brushed brass: directional micro-scratches, subtle warm variation. */
  brass: async () => {
    const f = makeField(41);
    const g = makeField(42);
    const base = srgb("#c9a15a");
    const deep = srgb("#9c7a3c");
    await build(
      "brass",
      1024,
      (u, v) => {
        const brush = g(u * 1, v * 0.02, 400, 2) * 0.5 + 0.5; // stretched along u
        const tone = f(u, v, 2.5, 4) * 0.5 + 0.5;
        const c = base.map((x, k) => mix(deep[k], x, tone * 0.6 + brush * 0.4));
        return { c, rough: 0.22 + brush * 0.16 + (1 - tone) * 0.06, h: brush * 0.25 };
      },
      { normalStrength: 0.8 }
    );
  },

  /** Dark smoked oak: interior floors and lecterns. */
  oak: async () => {
    const f = makeField(51);
    const g = makeField(52);
    const a = srgb("#1d130c");
    const b = srgb("#3a2717");
    await build(
      "oak",
      1024,
      (u, v) => {
        const plank = Math.floor(v * 8);
        const pv = (v * 8) % 1;
        const seam = 1 - smooth(0.0, 0.02, Math.min(pv, 1 - pv));
        const ring = Math.sin(u * 60 + f(u, v + plank * 0.13, 3, 4) * 8 + plank * 3.1) * 0.5 + 0.5;
        const fine = g(u * 0.3, v, 300, 2) * 0.5 + 0.5;
        let c = a.map((x, k) => mix(x, b[k], ring * 0.6 + fine * 0.25));
        c = c.map((x) => x * (1 - seam * 0.6));
        return { c, rough: 0.45 + fine * 0.15 + seam * 0.3, h: ring * 0.2 + fine * 0.2 - seam };
      },
      { normalStrength: 1.2 }
    );
  },

  /** Clipped boxwood / yew: dense leafy surface for hedges and topiary. */
  hedge: async () => {
    const f = makeField(71);
    const g = makeField(72);
    const a = srgb("#0f1a0e");
    const b = srgb("#2b3d1f");
    await build(
      "hedge",
      1024,
      (u, v) => {
        const leaves = g(u, v, 70, 3) * 0.5 + 0.5;
        const clumps = f(u, v, 7, 4) * 0.5 + 0.5;
        const hole = smooth(0.72, 0.9, 1 - leaves);
        let c = a.map((x, k) => mix(x, b[k], leaves * 0.7 + clumps * 0.3));
        c = c.map((x) => x * (1 - hole * 0.7));
        return { c, rough: 0.8 + leaves * 0.1, h: leaves * 0.8 + clumps * 0.4 - hole };
      },
      { normalStrength: 3.5 }
    );
  },

  /** Water: only the normal map is used (ripples for the reflecting pool). */
  water: async () => {
    const f = makeField(61);
    const g = makeField(62);
    await build(
      "water",
      512,
      (u, v) => {
        const h = f(u, v, 5, 4) * 0.6 + g(u, v, 11, 3) * 0.4;
        return { c: [0, 0, 0], rough: 0, h };
      },
      { normalStrength: 3 }
    );
  },
};

const only = process.argv[2];
console.log("World materials →", OUT);
for (const [name, fn] of Object.entries(MATERIALS)) {
  if (!only || only === name) await fn();
}
