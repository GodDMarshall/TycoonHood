#!/usr/bin/env node
// Enhance every Peetham photo to a 4K master and publish responsive WebP copies.
//
//   node tools/enhance-photos.mjs                 (after `node build.mjs`)
//   node tools/enhance-photos.mjs --only=sadguru-deva,32ead86a6b9c
//   node tools/enhance-photos.mjs --dry-run       (list what would be done)
//
// For every photo on the Peetham's S3 buckets that the built site uses (and
// every one already in the manifest):
//   1. the source is the camera original in photos/originals/ when the Peetham
//      has supplied one, otherwise the web copy (downloaded once into
//      .cache/img-src/<sha1(url)[:12]>.<ext>);
//   2. tools/upscale/enhance.py renders a master: 3840 px on the long edge for
//      photos, 512 px for app icons (Real-ESRGAN general-x4v3/wdn-x4v3 DNI; no
//      face-restoration or generative model). Faces under 130 px (YuNet face
//      detector) and the regions in photos/overrides.json are kept out of the
//      network (Lanczos + unsharp mask there); see "Photo review" in
//      docs/PHOTOS.md. Masters are cached in .cache/img-4k/ by source hash +
//      settings, so a re-run only does new work;
//   3. WebP variants (480 960 1600 2560 3840; icons 96 192 384 512; never wider
//      than the master) go to src/assets/img/opt/<sha1(url)[:12]>-<w>.webp and
//      src/assets/img/opt/manifest.json records them with the master size and
//      the fidelity guard (master scaled back to the source size: PSNR / SSIM);
//   4. each page's share image (its `image`) is cropped from the master to a
//      1200x630 JPEG in src/assets/img/og/<slug>.jpg.
// See docs/PHOTOS.md. Dev-only: needs `sharp` and the Python set-up in
// tools/upscale/README.md. A photo that cannot be enhanced is never published
// as a low-resolution copy: it keeps loading from S3 and the run fails.

import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, stat, rename, unlink, copyFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname, basename, extname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const OUT = join(ROOT, 'src/assets/img/opt');
const OG_OUT = join(ROOT, 'src/assets/img/og');
const SRC_CACHE = join(ROOT, '.cache/img-src');
const MASTERS = join(ROOT, '.cache/img-4k');
const ORIGINALS = join(ROOT, 'photos/originals');
const OVERRIDES = join(ROOT, 'photos/overrides.json');
const MANIFEST = join(OUT, 'manifest.json');
const ENHANCE = join(ROOT, 'tools/upscale/enhance.py');
const S3 = /https:\/\/(?:dev-)?dattapeetham\.s3\.amazonaws\.com\/[^"'\s)<>\\]+?\.(?:jpe?g|png|webp|gif)/gi;
const IS_S3 = new RegExp(`^${S3.source}$`, 'i');

// ---------- settings (docs/PHOTOS.md explains each; bump VERSION to re-render every master) ----------
const VERSION = 1;
const SETTINGS = {
  // DNI denoise strength: weights = dni x general-x4v3 + (1 - dni) x wdn-x4v3
  photo: { target: 3840, dni: 0.25 },
  icon: { target: 512, dni: 0.25, route: 'x4' },
  // originals whose 4x still falls short of the target (long edge < 960 px):
  // the route by long edge, first match wins (calibration in docs/PHOTOS.md)
  small: [{ below: 960, route: 'x4' }],
  precision: 'bf16', tile: 512, pad: 40,
  // Face guard: every face the YuNet detector finds in the original that is
  // smaller than this (source px) is kept out of the network (Lanczos + a
  // gentle unsharp mask there). The photo review found the network redraws
  // small faces at any denoise strength; above 130 px they stayed true.
  faceMax: 130,
};
// Per-photo decisions of the photo review live in photos/overrides.json
// (keyed by S3 path, file name, full URL or hash): { dni, route: 'lanczos',
// protect: [[x, y, w, h], ...] (fractions), faceMax, usm, note }. See docs/PHOTOS.md.
const FACE_MODEL = 'face_detection_yunet_2023mar.onnx';
function routeFor(cls, longEdge) {
  const t = SETTINGS[cls].target;
  if (longEdge >= t) return 'resize';
  if (cls === 'icon') return SETTINGS.icon.route;
  if (longEdge * 4 >= t) return 'x4';
  return (SETTINGS.small.find((r) => longEdge < r.below) || { route: 'x4' }).route;
}
const WIDTHS = { photo: [480, 960, 1600, 2560, 3840], icon: [96, 192, 384, 512] };
// A width within 10% of the master's own width adds nothing: the master's full
// width stands in for it (a 2570-wide portrait master gets ... 1600, 2570).
const NEAR = 0.9;
const quality = (w, cls) => (cls === 'icon' ? 86 : w <= 960 ? 78 : w <= 1600 ? 72 : 66);
const VARIANT_VERSION = 1; // bump when the variant encoding changes
// Transparent photos: alpha quality 70 looks the same as lossless alpha over
// light and dark grounds and halves the file (Guru Parampara PNG: 888 -> 391 KB at 1600).
const ALPHA_QUALITY = 70;
// Fidelity guard: a master scaled back to the source size should match the
// source. Dense texture (flowers, foliage, ornament) scores lower because the
// model removes the web copy's JPEG noise there, so the thresholds sit just
// below the lowest score of any calibration sample approved by eye
// (docs/PHOTOS.md): anything under them is flagged for a human look.
const FLAG = { photo: { psnr: 26, ssim: 0.93 }, icon: { psnr: 25, ssim: 0.94 } };
const OG = { w: 1200, h: 630, quality: 85, maxBytes: 300 * 1024 };
// Share-image crops are chosen by sharp's attention strategy (faces, skin,
// saturated colour); a page whose crop cut the subject gets a fixed one here:
// a sharp gravity ('north', 'centre', ...) or { x, y } = the crop centre as a
// fraction of the master. Checked by eye on every page (docs/PHOTOS.md).
const OG_CROP = {
  // sadguru-deva.jpg (also the default share image): attention picked the
  // clasped hands and cut Sri Swamiji at the eyes; keep His head in frame
  404: { x: 0.5, y: 0.35 },
};
const isIcon = (url) => /\/front_page_images\/app-[0-9a-f]+\.png$/i.test(url);

// ---------- arguments ----------
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  if (!m) { console.error(`unknown argument ${a}`); process.exit(2); }
  return [m[1], m[2] ?? true];
}));
if (args.help) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 27).join('\n').replace(/^\/\/ ?/gm, ''));
  console.log(`\nOptions: --only=a,b (URL part or hash)  --dry-run  --force  --no-og  --no-prune\n  --workers=N --threads=N  --python=PATH  --models=DIR  --report=FILE  --limit=N`);
  process.exit(0);
}
const WORKERS = +(args.workers || process.env.PHOTOS_WORKERS || 2);
const THREADS = +(args.threads || process.env.PHOTOS_THREADS || 2);
const MODELS = args.models || process.env.REALESRGAN_MODELS || join(ROOT, '.cache/realesrgan');
const PYTHON = args.python || process.env.PHOTOS_PYTHON || [join(ROOT, '.cache/upscale-venv/bin/python')].find(existsSync) || 'python3';
const REPORT = args.report || join(MASTERS, 'report.json');
const only = args.only ? String(args.only).split(',').filter(Boolean) : null;

const sha1 = (b) => createHash('sha1').update(b).digest('hex');
const urlHash = (url) => sha1(url).slice(0, 12);
const decodeHtml = (u) => u.replace(/&amp;/g, '&');
const rel = (p) => relative(ROOT, p);
const mb = (n) => (n / 1e6).toFixed(1) + ' MB';

async function walk(dir, re) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, re)));
    else if (re.test(e.name)) out.push(p);
  }
  return out;
}
async function writeAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}
async function download(url, file) {
  // curl honours the environment's HTTPS proxy; Node's fetch does not.
  const tmp = `${file}.part`;
  await run('curl', ['-sSfL', '--retry', '2', '-o', tmp, encodeURI(decodeURI(url))], { maxBuffer: 1 << 26 });
  await rename(tmp, file);
}

// ---------- pre-flight: the enhancer must be usable, or nothing is published ----------
const weights = ['realesr-general-x4v3.pth', 'realesr-general-wdn-x4v3.pth'].map((f) => join(MODELS, f));
const faceModel = join(MODELS, FACE_MODEL);
for (const w of [...weights, faceModel]) {
  if (!existsSync(w)) {
    console.error(`✗ missing ${w}\n  Set up the enhancer first: tools/upscale/README.md (or pass --models=DIR / REALESRGAN_MODELS).`);
    process.exit(1);
  }
}
// the face guard is not optional: without it small faces would be redrawn
try { await run(PYTHON, ['-c', 'import torch, numpy, PIL, cv2']); }
catch { console.error(`✗ ${PYTHON} cannot import torch, numpy, pillow and cv2 (opencv-python-headless, for the face guard).\n  Set up the enhancer first: tools/upscale/README.md (or pass --python=PATH / PHOTOS_PYTHON).`); process.exit(1); }
const weightsId = sha1(Buffer.concat(await Promise.all(weights.map((w) => readFile(w))))).slice(0, 12);
const faceModelId = sha1(await readFile(faceModel)).slice(0, 12);

// photos/overrides.json: the photo review's per-photo decisions
const overrides = existsSync(OVERRIDES) ? JSON.parse(await readFile(OVERRIDES, 'utf8')) : {};
const OVERRIDE_KEYS = new Set(['dni', 'route', 'protect', 'faceMax', 'usm', 'note', 'review']);
for (const [k, o] of Object.entries(overrides)) {
  if (k.startsWith('_')) continue;
  const bad = Object.keys(o).filter((x) => !OVERRIDE_KEYS.has(x));
  if (bad.length) { console.error(`✗ photos/overrides.json: ${k}: unknown field(s) ${bad.join(', ')}`); process.exit(1); }
  if (o.route && !['x4', 'lanczos'].includes(o.route)) { console.error(`✗ photos/overrides.json: ${k}: route must be "x4" or "lanczos"`); process.exit(1); }
  for (const r of o.protect || []) {
    if (r.length !== 4 || r.some((v) => typeof v !== 'number' || v < 0) || r[0] + r[2] > 1.0001 || r[1] + r[3] > 1.0001) {
      console.error(`✗ photos/overrides.json: ${k}: protect region ${JSON.stringify(r)} is not [x, y, w, h] in fractions of the photo`); process.exit(1);
    }
  }
}
function overrideFor(url) {
  const path = url.replace(/^https:\/\/[^/]+\//, '');
  const name = decodeURIComponent(basename(url));
  const keys = [...new Set([url, path, decodeURIComponent(path), name, urlHash(url)])];
  const hits = keys.filter((k) => overrides[k]);
  if (hits.length > 1) console.warn(`! photos/overrides.json: ${url} matches ${hits.join(' and ')}; using ${hits[0]}`);
  return hits.length ? overrides[hits[0]] : null;
}

// ---------- what to process ----------
const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
const urls = new Set(Object.keys(manifest));
for (const f of await walk(SITE, /\.(html|js|css)$/)) {
  for (const m of (await readFile(f, 'utf8')).matchAll(S3)) urls.add(decodeHtml(m[0]));
}
// every page's share image (og:image), even before the site is built
const pages = [];
let DEFAULT_OG_IMAGE = 'https://dattapeetham.s3.amazonaws.com/homepage_assets/site_1/front_page_images/sadguru-deva.jpg';
try { ({ DEFAULT_OG_IMAGE } = await import(pathToFileURL(join(ROOT, 'src/layout.mjs')).href)); } catch {}
for (const f of (await readdir(join(ROOT, 'src/pages'))).filter((x) => x.endsWith('.mjs')).sort()) {
  try {
    const page = (await import(pathToFileURL(join(ROOT, 'src/pages', f)).href)).default;
    if (!page?.file) continue;
    const image = page.image || DEFAULT_OG_IMAGE;
    pages.push({ slug: page.slug || page.file.replace(/\.html$/, ''), file: page.file, image });
    if (IS_S3.test(image)) urls.add(image);
  } catch (e) { console.warn(`! src/pages/${f}: ${e.message.split('\n')[0]} (share image skipped)`); }
}

// photos/originals: camera originals the Peetham supplies, by S3 file name or map.json
const originals = new Map();
if (existsSync(ORIGINALS)) {
  const files = (await readdir(ORIGINALS)).filter((f) => /\.(jpe?g|png|tiff?|webp)$/i.test(f));
  const byStem = new Map(files.map((f) => [f.toLowerCase(), f]).concat(files.map((f) => [f.replace(/\.[^.]+$/, '').toLowerCase(), f])));
  let map = {};
  if (existsSync(join(ORIGINALS, 'map.json'))) map = JSON.parse(await readFile(join(ORIGINALS, 'map.json'), 'utf8'));
  for (const url of urls) {
    const name = decodeURIComponent(basename(url));
    const mapped = map[url] || map[name];
    const f = mapped || byStem.get(name.toLowerCase()) || byStem.get(name.replace(/\.[^.]+$/, '').toLowerCase());
    if (f) {
      if (!existsSync(join(ORIGINALS, f))) { console.error(`✗ photos/originals/map.json: ${f} does not exist`); process.exitCode = 1; continue; }
      originals.set(url, join(ORIGINALS, f));
    }
  }
}

let todo = [...urls].sort();
if (only) todo = todo.filter((u) => only.some((o) => u.includes(o) || urlHash(u) === o));
if (args.limit) todo = todo.slice(0, +args.limit);
console.log(`${urls.size} photos referenced; processing ${todo.length}${originals.size ? `; ${originals.size} from photos/originals` : ''}; ${WORKERS} worker(s) x ${THREADS} thread(s)`);

await mkdir(OUT, { recursive: true });
await mkdir(SRC_CACHE, { recursive: true });
await mkdir(MASTERS, { recursive: true });
sharp.cache(false);
sharp.concurrency(THREADS);

// baseline of what was shipped before the first enhanced run (for the size report)
const BASELINE = join(MASTERS, 'baseline.json');
if (!existsSync(BASELINE)) {
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.webp'));
  const sizes = Object.fromEntries(await Promise.all(files.map(async (f) => [f, (await stat(join(OUT, f))).size])));
  await writeFile(BASELINE, JSON.stringify({ at: new Date().toISOString(), files: sizes }));
}

// ---------- one photo ----------
function enhance(src, out, cls, route, dni, o = {}) {
  const a = [ENHANCE, src, out, '--models', MODELS, '--threads', String(THREADS), '--precision', SETTINGS.precision,
    '--tile', String(SETTINGS.tile), '--tile-pad', String(SETTINGS.pad), '--dni', String(dni),
    // 'resize' (source already at the target): enhance.py only scales it down
    '--route', route === 'resize' ? 'x4' : route,
    '--faces', faceModel, '--face-max', String(o.faceMax ?? SETTINGS.faceMax)];
  if (o.protect?.length) a.push('--protect', o.protect.map((r) => r.join(',')).join(';'));
  if (o.usm) a.push('--usm', String(o.usm));
  if (cls === 'icon') a.push('--icon', '--icon-size', String(SETTINGS.icon.target));
  else a.push('--target-long-edge', String(SETTINGS.photo.target));
  return new Promise((resolve, reject) => {
    const p = spawn(PYTHON, a, { stdio: ['ignore', 'pipe', 'pipe'] });
    let o = '', e = '';
    p.stdout.on('data', (d) => (o += d));
    p.stderr.on('data', (d) => (e += d));
    p.on('close', (code) => {
      if (code) return reject(new Error(`enhance.py exited ${code}: ${e.trim().split('\n').slice(-3).join(' | ')}`));
      try { resolve(JSON.parse(o.trim().split('\n').pop())); } catch { reject(new Error(`enhance.py printed no JSON: ${o.slice(-300)} ${e.slice(-300)}`)); }
    });
  });
}

function variantWidths(masterW, cls) {
  const ws = WIDTHS[cls].filter((w) => w < masterW && (w <= masterW * NEAR || w === WIDTHS[cls][0]));
  return [...new Set([...ws, masterW])].sort((a, b) => a - b);
}

const results = [];
const failed = [];
let done = 0;
async function processOne(url) {
  const t0 = Date.now();
  const hash = urlHash(url);
  const cls = isIcon(url) ? 'icon' : 'photo';
  const r = { url, hash, class: cls };
  // source
  let src = originals.get(url);
  r.source = src ? rel(src) : 'web copy (S3)';
  if (!src) {
    src = join(SRC_CACHE, hash + extname(url).toLowerCase());
    if (!existsSync(src)) {
      if (args['dry-run']) { r.action = 'download + enhance'; return r; }
      await download(url, src);
    }
  }
  const input = await readFile(src);
  const meta = await sharp(input).metadata();
  const [sw, sh] = (meta.orientation || 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];
  r.src = { w: sw, h: sh, bytes: input.length };
  if (originals.has(url)) {
    // a camera original replacing the web copy must show the same picture
    const web = join(SRC_CACHE, hash + extname(url).toLowerCase());
    if (existsSync(web)) {
      const wm = await sharp(web).metadata();
      const [ww, wh] = (wm.orientation || 1) >= 5 ? [wm.height, wm.width] : [wm.width, wm.height];
      if (Math.abs(sw / sh - ww / wh) / (ww / wh) > 0.02) r.warning = `photos/originals copy has aspect ${(sw / sh).toFixed(3)}, the web copy ${(ww / wh).toFixed(3)}: check the crop and the page's object-position`;
    }
  }
  // master
  // only what changes this photo's master goes into its cache key
  const o = overrideFor(url) || {};
  const auto = routeFor(cls, Math.max(sw, sh));
  // an override can only take the network away ('lanczos'), never add it to an original already at the target
  const route = auto === 'resize' ? 'resize' : o.route || auto;
  const dni = o.dni ?? SETTINGS[cls].dni;
  const faceMax = o.faceMax ?? SETTINGS.faceMax;
  const settings = route === 'resize'
    ? { v: VERSION, cls, target: SETTINGS[cls].target, route }
    : route === 'lanczos'
      ? { v: VERSION, cls, target: SETTINGS[cls].target, route, usm: o.usm || null }
      : { v: VERSION, cls, target: SETTINGS[cls].target, route, dni, precision: SETTINGS.precision, tile: SETTINGS.tile, pad: SETTINGS.pad, weightsId,
        faces: { model: faceModelId, max: faceMax }, protect: o.protect || [], usm: o.usm || null };
  if (o.note || o.review) r.review = o.note || o.review;
  const key = sha1(sha1(input) + JSON.stringify(settings)).slice(0, 16);
  const stem = join(MASTERS, `${hash}-${key}`);
  const sidecar = `${stem}.json`;
  let info = existsSync(sidecar) ? JSON.parse(await readFile(sidecar, 'utf8')) : null;
  if (info && (!existsSync(info.output) || args.force)) info = null;
  if (!info) {
    if (args['dry-run']) { r.action = 'enhance'; return r; }
    info = await enhance(src, `${stem}.jpg`, cls, route, dni, { protect: o.protect, faceMax, usm: o.usm });
    info.settings = settings;
    await writeAtomic(sidecar, JSON.stringify(info, null, 1));
    r.rendered = true;
  } else r.rendered = false;
  r.master = { w: info.master.w, h: info.master.h, file: rel(info.output), bytes: (await stat(info.output)).size };
  r.route = info.route; r.method = info.method; r.passes = info.passes; r.dni = info.dni; r.scale = info.scale;
  r.fidelity = info.fidelity;
  r.faces = info.faces || null;
  r.protected = (info.protect || []).length - (info.faces?.protected || 0);
  r.timings = info.timings;
  const lim = FLAG[cls];
  if (info.fidelity.psnr < lim.psnr || info.fidelity.ssim < lim.ssim) r.flag = `fidelity psnr ${info.fidelity.psnr} dB / ssim ${info.fidelity.ssim} below ${lim.psnr} / ${lim.ssim}`;
  if (args['dry-run']) { r.action = 'variants only'; return r; }

  // variants
  const widths = variantWidths(info.master.w, cls);
  const hasAlpha = info.output.endsWith('.png');
  const vkey = sha1(key + JSON.stringify({ VARIANT_VERSION, widths, q: widths.map((w) => quality(w, cls)), ...(hasAlpha ? { aq: ALPHA_QUALITY } : {}) })).slice(0, 12);
  const prev = info.variants;
  const fresh = prev && prev.key === vkey && !args.force && prev.files.every(([, name, bytes]) => {
    try { return readFileSync(join(OUT, name)).length === bytes; } catch { return false; }
  });
  let files;
  if (fresh) files = prev.files;
  else {
    const master = await readFile(info.output);
    files = [];
    for (const w of widths) {
      const name = `${hash}-${w}.webp`;
      const buf = await sharp(master).resize({ width: w, kernel: 'lanczos3' })
        .webp({ quality: quality(w, cls), alphaQuality: ALPHA_QUALITY, effort: 5, smartSubsample: true }).toBuffer();
      await writeAtomic(join(OUT, name), buf);
      files.push([w, name, buf.length]);
    }
    info.variants = { key: vkey, files };
    await writeAtomic(sidecar, JSON.stringify(info, null, 1));
  }
  r.variants = files.map(([w, name, bytes]) => ({ w, file: name, bytes }));
  r.entry = {
    w: info.master.w, h: info.master.h,
    srcs: files.map(([w, name]) => [w, `assets/img/opt/${name}`]),
    class: cls,
    src: { w: info.src.w, h: info.src.h, from: originals.has(url) ? rel(originals.get(url)) : 's3' },
    method: info.method, route: info.route, scale: info.scale, dni: info.dni,
    fidelity: info.fidelity,
    // the face guard and the review's protected regions (docs/PHOTOS.md)
    ...(info.faces ? { faces: { found: info.faces.found, protected: info.faces.protected } } : {}),
    ...(r.protected > 0 ? { protected: r.protected } : {}),
    ...(r.flag ? { flag: r.flag } : {}),
  };
  r.seconds = Math.round((Date.now() - t0) / 100) / 10;
  return r;
}

// ---------- run the pool ----------
const t0 = Date.now();
const queue = [...todo];
// big photos first, so the pool does not end on one long job
const area = (u) => { const e = manifest[u]; return e?.src ? e.src.w * e.src.h : e ? e.w * e.h : 0; };
queue.sort((a, b) => area(b) - area(a));
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    try {
      const r = await processOne(url);
      results.push(r);
      if (r.entry) manifest[url] = r.entry;
      done++;
      const eta = queue.length ? ` · ~${Math.round(((Date.now() - t0) / done) * queue.length / 60000)} min left` : '';
      console.log(`[${done}/${todo.length}] ${r.hash} ${r.class} ${r.src ? `${r.src.w}x${r.src.h}` : ''} -> ${r.master ? `${r.master.w}x${r.master.h}` : r.action} ${r.fidelity ? `psnr ${r.fidelity.psnr} ssim ${r.fidelity.ssim}` : ''} ${r.rendered ? `(${r.timings?.total}s)` : r.master ? '(cached)' : ''}${r.flag ? ' FLAG' : ''}${eta}`);
    } catch (e) {
      failed.push({ url, error: e.message.split('\n')[0] });
      console.error(`✗ ${url}: ${e.message.split('\n')[0]}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.max(1, WORKERS) }, worker));
if (args['dry-run']) {
  for (const r of results) console.log(`${r.action.padEnd(20)} ${r.url}`);
  process.exit(0);
}

// A photo that failed keeps no low-resolution manifest entry: it loads from S3
// until the next run succeeds (build.mjs leaves unknown URLs alone).
for (const f of failed) if (manifest[f.url] && !manifest[f.url].fidelity) delete manifest[f.url];
const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
await writeAtomic(MANIFEST, JSON.stringify(sorted, null, 0));

// remove variants no manifest entry points at any more (old 800/1024/... widths)
const used = new Set(Object.values(sorted).flatMap((e) => e.srcs.map(([, f]) => basename(f))));
let pruned = 0;
if (!args['no-prune'] && !only && !failed.length) {
  for (const f of await readdir(OUT)) {
    if (/^[0-9a-f]{12}-\d+\.webp$/.test(f) && !used.has(f)) { await unlink(join(OUT, f)); pruned++; }
  }
}

// ---------- share images (og) ----------
const og = [];
if (!args['no-og']) {
  await mkdir(OG_OUT, { recursive: true });
  for (const p of pages) {
    const r = results.find((x) => x.url === p.image) || null;
    const masterFile = r?.master ? join(ROOT, r.master.file) : null;
    if (!masterFile) { if (!only) og.push({ ...p, error: 'no master' }); continue; }
    try {
      const master = await readFile(masterFile);
      const crop = OG_CROP[p.slug];
      let img;
      if (crop && typeof crop === 'object') {
        // fixed centre: scale the master to cover the frame, then cut around (x, y)
        const { w: mw, h: mh } = r.master;
        const s = Math.max(OG.w / mw, OG.h / mh);
        const W = Math.round(mw * s), H = Math.round(mh * s);
        const left = Math.min(Math.max(0, Math.round(crop.x * W - OG.w / 2)), W - OG.w);
        const top = Math.min(Math.max(0, Math.round(crop.y * H - OG.h / 2)), H - OG.h);
        img = sharp(master).resize(W, H, { kernel: 'lanczos3' }).extract({ left, top, width: OG.w, height: OG.h });
      } else {
        img = sharp(master).resize(OG.w, OG.h, { fit: 'cover', position: crop || sharp.strategy.attention, kernel: 'lanczos3' });
      }
      const frame = await img.flatten({ background: '#f8f3e9' }).toBuffer();
      let q = OG.quality, buf;
      do {
        buf = await sharp(frame).jpeg({ quality: q, mozjpeg: true, progressive: true }).toBuffer();
        q -= 5;
      } while (buf.length > OG.maxBytes && q >= 60);
      const name = `${p.slug}.jpg`;
      await writeAtomic(join(OG_OUT, name), buf);
      og.push({ slug: p.slug, page: p.file, image: p.image, ogKey: urlHash(p.image), crop: crop ? JSON.stringify(crop) : 'attention', file: `src/assets/img/og/${name}`, w: OG.w, h: OG.h, quality: q + 5, bytes: buf.length });
    } catch (e) { og.push({ ...p, error: e.message.split('\n')[0] }); console.error(`✗ share image for ${p.file}: ${e.message.split('\n')[0]}`); }
  }
}

// ---------- report ----------
const all = Object.entries(sorted);
const shipped = (await readdir(OUT)).filter((f) => f.endsWith('.webp'));
const sizes = Object.fromEntries(await Promise.all(shipped.map(async (f) => [f, (await stat(join(OUT, f))).size])));
const baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
function byWidth(files) {
  const o = {};
  for (const [f, b] of Object.entries(files)) {
    const w = +(/-(\d+)\.webp$/.exec(f) || [0, 0])[1];
    const k = WIDTHS.photo.includes(w) || WIDTHS.icon.includes(w) ? w : 'own width';
    (o[k] ??= { files: 0, bytes: 0 }).files++;
    o[k].bytes += b;
  }
  return o;
}
const perWidth = byWidth(sizes);
const perWidthBefore = byWidth(baseline.files);
const psnrs = all.filter(([, e]) => e.class === 'photo' && e.fidelity).map(([, e]) => e.fidelity.psnr).sort((a, b) => a - b);
const hist = {};
for (const v of psnrs) { const k = v < 28 ? '<28' : v < 30 ? '28-30' : v < 32 ? '30-32' : v < 34 ? '32-34' : v < 36 ? '34-36' : '>=36'; hist[k] = (hist[k] || 0) + 1; }
const report = {
  at: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), workers: WORKERS, threads: THREADS,
  settings: SETTINGS, widths: WIDTHS, flagThreshold: FLAG,
  counts: {
    referenced: urls.size, processed: results.length, rendered: results.filter((r) => r.rendered).length,
    cached: results.filter((r) => r.rendered === false).length, failed: failed.length, pruned,
    photos: all.filter(([, e]) => e.class === 'photo').length, icons: all.filter(([, e]) => e.class === 'icon').length,
    fromOriginals: results.filter((r) => r.source !== 'web copy (S3)').length,
    flagged: results.filter((r) => r.flag).length,
    routes: results.reduce((a, r) => ((a[r.route] = (a[r.route] || 0) + 1), a), {}),
    faceGuard: {
      photos: results.filter((r) => r.faces?.protected).length,
      faces: results.reduce((a, r) => a + (r.faces?.protected || 0), 0),
      found: results.reduce((a, r) => a + (r.faces?.found || 0), 0),
    },
    overrides: results.filter((r) => r.review).length,
    protectedRegions: results.reduce((a, r) => a + Math.max(0, r.protected || 0), 0),
  },
  bytes: {
    before: { files: Object.keys(baseline.files).length, total: sum(baseline.files) },
    after: { files: shipped.length, total: sum(sizes) },
    perWidth, perWidthBefore,
    largest: Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([f, b]) => ({ file: f, bytes: b })),
    masters: results.reduce((a, r) => a + (r.master?.bytes || 0), 0),
    og: og.reduce((a, o) => a + (o.bytes || 0), 0),
  },
  fidelity: { psnrMin: psnrs[0], psnrMedian: psnrs[psnrs.length >> 1], psnrMax: psnrs[psnrs.length - 1], histogram: hist },
  flagged: results.filter((r) => r.flag || r.warning).map((r) => ({ url: r.url, hash: r.hash, flag: r.flag, warning: r.warning })),
  failed, og,
  images: results.map(({ entry, ...r }) => r),
};
await mkdir(dirname(REPORT), { recursive: true });
await writeAtomic(REPORT, JSON.stringify(report, null, 1));
const summary = [
  `Photo enhancement — ${report.at}`,
  `${report.counts.processed} processed (${report.counts.rendered} rendered, ${report.counts.cached} cached), ${report.counts.failed} failed, ${report.counts.flagged} flagged, in ${Math.round(report.seconds / 60)} min (${WORKERS}x${THREADS})`,
  `Masters: ${report.counts.photos} photos at ${SETTINGS.photo.target} px long edge, ${report.counts.icons} icons at ${SETTINGS.icon.target} px; routes ${JSON.stringify(report.counts.routes)}`,
  `Face guard: ${report.counts.faceGuard.faces} of ${report.counts.faceGuard.found} faces found (under ${SETTINGS.faceMax} px) kept out of the network in ${report.counts.faceGuard.photos} photos; photos/overrides.json: ${report.counts.overrides} photos, ${report.counts.protectedRegions} protected regions`,
  `Fidelity (master scaled back to the source): PSNR min ${report.fidelity.psnrMin} / median ${report.fidelity.psnrMedian} / max ${report.fidelity.psnrMax} dB; ${JSON.stringify(hist)}`,
  `Shipped WebP: ${mb(report.bytes.before.total)} in ${report.bytes.before.files} files before -> ${mb(report.bytes.after.total)} in ${report.bytes.after.files} files now`,
  `  width        before                 after`,
  ...[...new Set([...Object.keys(perWidthBefore), ...Object.keys(perWidth)])].sort((a, b) => (+a || 1e9) - (+b || 1e9)).map((w) => {
    const b = perWidthBefore[w] || { files: 0, bytes: 0 }, a = perWidth[w] || { files: 0, bytes: 0 };
    return `  ${String(w).padEnd(10)} ${String(b.files).padStart(4)} files ${mb(b.bytes).padStart(9)}   ${String(a.files).padStart(4)} files ${mb(a.bytes).padStart(9)}`;
  }),
  `Largest: ${report.bytes.largest.slice(0, 5).map((x) => `${x.file} ${(x.bytes / 1024).toFixed(0)} KB`).join(', ')}`,
  `Share images: ${og.filter((o) => o.bytes).length} x ${OG.w}x${OG.h} JPEG, ${mb(report.bytes.og)}`,
  ...(report.flagged.length ? ['Flagged for review:', ...report.flagged.map((f) => `  ${f.hash} ${f.url}\n    ${f.flag || ''}${f.warning || ''}`)] : []),
  ...(failed.length ? ['FAILED (still load from S3):', ...failed.map((f) => `  ${f.url}: ${f.error}`)] : []),
].join('\n');
await writeFile(REPORT.replace(/\.json$/, '') + '-summary.txt', summary + '\n');
console.log('\n' + summary);
if (failed.length) process.exitCode = 1;
