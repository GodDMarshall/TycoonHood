/* global URL, fetch, setTimeout */
/**
 * Photo pipeline for Tycoonhood. Runs on GitHub Actions (the build sandbox
 * cannot reach image hosts).
 *
 *   no selection.json  → .covers-review/<slot>.jpg  numbered contact sheets
 *   selection.json     → apps/web/public/photos/<name>-{1600,800}.webp, graded
 *                        to the house look, plus CREDITS.json; review removed.
 *
 * The grade: a little less saturation, a warm shift, crushed blacks and a
 * vignette — near-black ground, one warm light, matching the drawn art.
 */
import { mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import sharp from "sharp";

const ROOT = new URL("../../", import.meta.url).pathname;
const { slots } = JSON.parse(await readFile(new URL("./candidates.json", import.meta.url), "utf8"));
const has = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

async function fetchImg(base, query) {
  const url = `https://images.unsplash.com/${base}?${query}`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url);
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
  }
  throw new Error(`download failed: ${url}`);
}

const label = (w, text) =>
  Buffer.from(
    `<svg width="${w}" height="44"><rect width="${w}" height="44" fill="rgba(0,0,0,0.72)"/><text x="12" y="30" font-family="DejaVu Sans, sans-serif" font-size="24" font-weight="700" fill="#f1d99c">${text}</text></svg>`,
  );

async function review() {
  const out = `${ROOT}.covers-review`;
  await mkdir(out, { recursive: true });
  for (const [slot, { shape, photos }] of Object.entries(slots)) {
    const [tw, th] = shape === "portrait" ? [330, 440] : [520, 300];
    const cols = shape === "portrait" ? 4 : 3;
    const rows = Math.ceil(photos.length / cols);
    const tiles = [];
    for (const [i, p] of photos.entries()) {
      const buf = await fetchImg(p[1], `w=${tw * 2}&q=70&fm=jpg`);
      const img = await sharp(buf)
        .resize(tw, th, { fit: "cover", position: "attention" })
        .composite([{ input: label(tw, `${i + 1}  ${p[0]}`), top: th - 44, left: 0 }])
        .toBuffer();
      tiles.push({ input: img, left: (i % cols) * (tw + 8), top: Math.floor(i / cols) * (th + 8) });
    }
    await sharp({ create: { width: cols * (tw + 8) - 8, height: rows * (th + 8) - 8, channels: 3, background: "#111" } })
      .composite(tiles)
      .jpeg({ quality: 82 })
      .toFile(`${out}/${slot}.jpg`);
    console.log("sheet", slot, photos.length);
  }
}

function vignette(w, h) {
  return Buffer.from(
    `<svg width="${w}" height="${h}"><defs><radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.62"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#v)"/></svg>`,
  );
}

async function build(selection) {
  const out = `${ROOT}apps/web/public/photos`;
  await mkdir(out, { recursive: true });
  const credits = [];
  for (const s of selection) {
    const pool = slots[s.slot];
    const p = pool.photos.find((x) => x[0] === s.id);
    if (!p) throw new Error(`${s.id} is not a ${s.slot} candidate`);
    const portrait = (s.shape ?? pool.shape) === "portrait";
    const [W, H] = portrait ? [1200, 1600] : [1920, 1080];
    const src = await fetchImg(p[1], `w=${portrait ? 1600 : 2600}&q=90&fm=jpg`);
    const graded = await sharp(src)
      .resize(W, H, { fit: "cover", position: s.position ?? "attention" })
      .modulate({ brightness: s.brightness ?? 0.8, saturation: s.saturation ?? 0.72 })
      .recomb([
        [1.07, 0.03, 0.0],
        [0.01, 1.0, 0.0],
        [0.0, 0.0, 0.86],
      ])
      .linear(1.06, -14)
      .composite([{ input: vignette(W, H), blend: "over" }])
      .toBuffer();
    for (const width of [W, Math.round(W / 2)]) {
      await sharp(graded).resize(width).webp({ quality: 78 }).toFile(`${out}/${s.name}-${width}.webp`);
    }
    credits.push({
      name: s.name,
      use: s.use,
      photographer: p[2],
      profile: `https://unsplash.com/@${p[3]}`,
      photo: `https://unsplash.com/photos/${p[0]}`,
      license: "Unsplash License",
    });
    console.log("built", s.name, p[0]);
  }
  await writeFile(`${out}/CREDITS.json`, JSON.stringify(credits, null, 2) + "\n");
  await rm(`${ROOT}.covers-review`, { recursive: true, force: true });
}

const selPath = new URL("./selection.json", import.meta.url);
if (await has(selPath.pathname)) await build(JSON.parse(await readFile(selPath, "utf8")));
else await review();
