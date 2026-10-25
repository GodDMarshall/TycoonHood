#!/usr/bin/env node
// The `sizes` of every lazy photo, measured from the built site.
//
//   node tools/measure-sizes.mjs                 (after node build.mjs; needs Playwright)
//   node tools/measure-sizes.mjs --check         compare with src/image-sizes.json, change nothing
//   node tools/measure-sizes.mjs --langs=en      measure English only (quicker; default: all five)
//   node tools/measure-sizes.mjs --pages=media.html,seva.html   re-measure some pages, keep the rest
//
// Why. Every photo offers its WebP copies at 480, 960, 1600, 2560 and 3840 px
// (srcset), and the browser picks one from `sizes`, the width the image will be
// shown at. Chromium can work that out itself (sizes="auto", lazy images only);
// Safari on Mac, iPhone and iPad cannot, and falls back to the rest of the list.
// The build's default fallback is the whole window (100vw), which made a Mac
// load the 3840 copy for a 120 px thumbnail: 63 MB instead of 32 on seven pages
// (docs/PHOTOS.md). And a photo cropped by object-fit: cover needs more than its
// box: a tall box shows a slice of a wide photo, so the photo is drawn wider
// than the box (Chromium's "auto" does not know that either).
//
// What. This tool opens every page in Chromium at 46 window widths (desktop,
// and phone/tablet with touch; each window as tall as common screens of that
// width get), measures for every lazy <img srcset> the width it is drawn at
// (for a cover crop: the scaled photo, max(box width, box height × photo
// aspect)), takes the largest over all languages and modes, and fits a short
// `sizes` list to it: one length per range between the site's CSS breakpoints
// (px, vw or calc), never below what was measured and at most 30 % above it,
// so no screen loads more than one srcset step too much.
//
//   - A photo drawn at its box width keeps "auto" first: "auto, (min-width: …) …".
//   - A cover crop that needs more than its box gets no "auto" (Chromium would
//     take the box width) and, on screens denser than 2.5x below 981 px (phones),
//     a second entry at 0.65 of the length: a phone at 3x then gets about 2x
//     density, which looks the same on a phone and saves about a third of the
//     bytes.
//
// The result goes to src/image-sizes.json, keyed by page and photo (the copy's
// hash and its occurrence on the page, `3123cdb41815#0`); the build puts it on
// the <img> (English and every language; the layouts match). Eager images (the
// page heroes) state their sizes in the page code, and are not measured.
//
// Run it again after a layout change or a new photo, then node build.mjs.
// tests/photos.test.mjs fails while a lazy photo on a page has no entry, or an
// entry names a photo that is no longer on its page.

import { createServer } from 'node:http';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const OUT = join(ROOT, 'src/image-sizes.json');
const args = process.argv.slice(2);
const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const CHECK = args.includes('--check');
const LANG_DIRS = (opt('langs') || 'en,kn,hi,ta,te').split(',').map((c) => (c === 'en' ? '' : `${c}/`));
const ONLY = opt('pages') ? opt('pages').split(',') : null;
const WORKERS = Math.max(1, +opt('workers') || 3);

// Window widths: both sides of the breakpoints the stylesheets use most, plus
// the common phone, tablet, laptop and monitor widths.
const DESK = [320, 360, 375, 390, 400, 401, 414, 430, 431, 460, 480, 481, 520, 560, 600, 640, 641, 700, 701, 760, 761, 768, 800, 820, 860, 900, 901, 980, 981, 1024, 1025, 1080, 1100, 1101, 1180, 1181, 1239, 1240, 1280, 1320, 1366, 1440, 1600, 1920, 2560, 3840];
const TOUCH = DESK.filter((w) => w <= 1366);
// sizes knows only the width, but a box sized by the window's height (a
// full-screen plate, a sticky stage) crops more of a photo in a taller window.
// Each width is measured at the tallest window common at that width: phones
// up to 2.22 x (412 x 915), small tablets 1.6 x, tablets in portrait up to
// 1.52 x (iPad mini 744 x 1133), iPad Pro portrait at 1024 x 1366, tablets in
// landscape and laptops 0.75 x, monitors 0.625 x.
const tallest = (w) => Math.round(w * (w <= 430 ? 2.22 : w <= 640 ? 1.6 : w <= 980 ? 1.52 : w <= 1024 ? 1.34 : w <= 1366 ? 0.75 : 0.625));
// Range starts the fit may use (the stylesheets' min-width values, max-width
// + 1, and 431 where phones end).
const CUTS = [401, 431, 481, 641, 700, 701, 761, 801, 821, 861, 900, 901, 981, 1025, 1081, 1100, 1101, 1181, 1240, 1321, 1361, 1440];
const SITE_CUTS = [641, 981, 1181]; // the layout's own: phone | tablet | small laptop | desktop
const MAX_OVER = 1.3; // a candidate step is ≥ 1.5×, so this never costs more than one step
// 0.65, not 2/3: the fit runs up to ~3 % above the photo's width, and a 3x
// phone would then cross into the next copy for that 3 %.
const PHONE_BELOW = 981, DENSE = '2.5dppx', CAP = 0.65;
// A photo counts as a cover crop when it is drawn at least this much wider than its box.
const COVER_MIN = 1.02;

// ---------- a static server for site/ ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
function serve() {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(SITE, p));
    if (!file.startsWith(SITE + sep)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// ---------- lengths: { a: vw coefficient in %, b: px } ----------
const lenStr = ({ a, b }) => (a === 0 ? `${b}px` : b === 0 ? `${a}vw` : `calc(${a}vw ${b < 0 ? '-' : '+'} ${Math.abs(b)}px)`);
const lenAt = ({ a, b }, vw) => (a / 100) * vw + b;
const scale = ({ a, b }, k) => ({ a: a ? Math.ceil(a * k * 10) / 10 : 0, b: b ? Math.ceil(b * k) : 0 });

// The upper envelope of [vw, px] points: a constant when the points are within
// 12 % of each other, otherwise a line (vw + px) raised to cover every point.
function envelope(pts) {
  const max = Math.max(...pts.map((p) => p[1])), min = Math.min(...pts.map((p) => p[1]));
  if (pts.length === 1 || max / min <= 1.12) return { a: 0, b: Math.ceil(max) };
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  let a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  if (!isFinite(a) || a <= 0) return { a: 0, b: Math.ceil(max) };
  a = Math.ceil(a * 1000) / 10;
  let b = Math.ceil(Math.max(...pts.map(([x, y]) => y - (a / 100) * x)));
  if (Math.abs(b) <= 6) { // plain vw when that still covers every point
    const a2 = Math.ceil(Math.max(...pts.map(([x, y]) => (y / x) * 100)) * 10) / 10;
    if (pts.every(([x, y]) => (a2 / 100) * x <= y * MAX_OVER)) return { a: a2, b: 0 };
  }
  return { a, b };
}
const over = (pts, len) => Math.max(...pts.map(([x, y]) => lenAt(len, x) / y));

// Split [vw → px] into ranges at breakpoints until no range over-asks by more than MAX_OVER.
function fit(points) {
  const pts = [...points.entries()].sort((a, b) => a[0] - b[0]);
  const segs = (cuts) => {
    const b = [0, ...cuts, Infinity];
    return b.slice(0, -1).map((lo, i) => ({ lo, p: pts.filter(([x]) => x >= lo && x < b[i + 1]) })).filter((s) => s.p.length)
      .map((s) => ({ ...s, len: envelope(s.p) })).map((s) => ({ ...s, r: over(s.p, s.len) }));
  };
  let cuts = SITE_CUTS.slice();
  for (let i = 0; i < 8; i++) {
    const bad = segs(cuts).filter((s) => s.r > MAX_OVER).sort((a, b) => b.r - a.r)[0];
    if (!bad) break;
    let best = null;
    for (const c of CUTS.filter((c) => !cuts.includes(c) && bad.p.some(([x]) => x < c) && bad.p.some(([x]) => x >= c))) {
      const cs = [...cuts, c].sort((a, b) => a - b);
      const r = Math.max(...segs(cs).map((s) => s.r));
      if (!best || r < best.r) best = { cs, r };
    }
    if (!best) break;
    cuts = best.cs;
  }
  const out = [];
  for (const s of segs(cuts)) if (!out.length || lenStr(out[out.length - 1].len) !== lenStr(s.len)) out.push(s);
  return out.reverse(); // widest range first
}

// ranges → the sizes attribute
function sizesAttr(ranges, cover) {
  const parts = [];
  for (const { lo, len } of ranges) {
    const mq = lo ? `(min-width: ${lo}px)` : '';
    if (cover && lo < PHONE_BELOW) parts.push(`${mq ? mq + ' and ' : ''}(min-resolution: ${DENSE}) ${lenStr(scale(len, CAP))}`);
    parts.push(`${mq ? mq + ' ' : ''}${lenStr(len)}`);
  }
  return (cover ? '' : 'auto, ') + parts.join(', ');
}

// Evaluate one of our sizes attributes at a window width (density 1): for --check.
export function evalSizes(attr, vw) {
  for (const part of attr.replace(/^auto,\s*/, '').split(/,\s*(?![^()]*\))/)) {
    const m = /^(?:\(min-width: (\d+)px\)\s*(?:and\s*)?)?(\(min-resolution:[^)]*\)\s*)?(.+)$/.exec(part.trim());
    if (!m || m[2]) continue;
    if (m[1] && vw < +m[1]) continue;
    const v = m[3];
    const c = /^calc\(([\d.]+)vw ([+-]) ([\d.]+)px\)$/.exec(v);
    if (c) return (+c[1] / 100) * vw + (c[2] === '-' ? -1 : 1) * +c[3];
    if (v.endsWith('vw')) return (parseFloat(v) / 100) * vw;
    return parseFloat(v);
  }
  return vw;
}

// ---------- measuring ----------
async function measurePage(browser, base, path, mode) {
  const touch = mode === 'touch';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  // no curtain, no sound question
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('dp-intro', '1'); } catch (e) {}
    try { localStorage.setItem('dp-sound', JSON.stringify({ music: false, sfx: false, v: 1 })); } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(1000);
  const seen = [];
  for (const w of touch ? TOUCH : DESK) {
    await page.setViewportSize({ width: w, height: tallest(w) });
    await page.waitForTimeout(220);
    const list = await page.evaluate(() => {
      const count = new Map();
      const key = (el) => {
        const parts = [];
        for (let n = el.parentElement, i = 0; n && n !== document.body && i < 3; n = n.parentElement, i++) parts.unshift((n.classList[0] || n.tagName.toLowerCase()));
        return parts.join('>');
      };
      return [...document.querySelectorAll('img[srcset]')].filter((im) => !im.closest('.lightbox-dialog')).map((im) => {
        const f = im.getAttribute('srcset').split(',')[0].trim().split(/\s+/)[0].split('/').pop();
        const stem = f.replace(/-\d+\.webp$/, '');
        const n = count.get(stem) || 0; count.set(stem, n + 1);
        if (im.getAttribute('fetchpriority') === 'high' || im.loading !== 'lazy') return null;
        const w = im.clientWidth, h = im.clientHeight;
        const ar = (+im.getAttribute('width') || 1) / (+im.getAttribute('height') || 1);
        const fit = getComputedStyle(im).objectFit;
        const drawn = !w || !h ? 0 : fit === 'cover' ? Math.max(w, h * ar) : fit === 'contain' ? Math.min(w, h * ar) : w;
        return { id: `${stem}#${n}`, comp: key(im), w, drawn };
      }).filter(Boolean);
    });
    for (const x of list) seen.push({ ...x, vw: w });
  }
  await ctx.close();
  return seen;
}

async function main() {
  const { chromium } = await import('playwright').catch(() => { throw new Error('needs Playwright: npm install && npx playwright install chromium'); });
  if (!existsSync(join(SITE, 'index.html'))) throw new Error('no site/: run node build.mjs first');
  const exe = ['/opt/pw-browsers/chromium', process.env.PW_CHROMIUM_PATH].find((p) => p && existsSync(p));
  const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox'] });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const files = (await readdir(SITE)).filter((f) => f.endsWith('.html') && (!ONLY || ONLY.includes(f))).sort();
  const jobs = [];
  for (const f of files) for (const d of LANG_DIRS) if (existsSync(join(SITE, d, f))) for (const mode of ['desk', 'touch']) jobs.push({ f, path: d + f, mode });

  // page → id → { comp, cover, at: Map(vw → px) }
  const data = new Map();
  let done = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    for (let job; (job = jobs.shift());) {
      const rows = await measurePage(browser, base, job.path, job.mode);
      const pg = data.get(job.f) || data.set(job.f, new Map()).get(job.f);
      for (const r of rows) {
        const e = pg.get(r.id) || pg.set(r.id, { comp: r.comp, cover: false, at: new Map() }).get(r.id);
        if (!r.drawn) continue;
        if (r.drawn > r.w * COVER_MIN) e.cover = true;
        e.at.set(r.vw, Math.max(e.at.get(r.vw) || 0, r.drawn));
      }
      done++;
      process.stdout.write(`\r  measured ${done} page views (${job.path}, ${job.mode})${' '.repeat(20)}`);
    }
  }));
  process.stdout.write(`\r  measured ${done} page views in ${Math.round((Date.now() - t0) / 1000)} s${' '.repeat(40)}\n`);
  await browser.close();
  server.close();

  const old = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : {};
  const table = ONLY ? { ...old } : { _about: old._about };
  table._about = 'Measured by tools/measure-sizes.mjs from the built site: the sizes attribute of every lazy photo, by page and photo (copy hash # occurrence on the page). Do not edit by hand; re-run the tool after a layout change or a new photo.';
  let hidden = 0;
  for (const [f, pg] of [...data.entries()].sort()) {
    const out = {};
    for (const [id, e] of [...pg.entries()].sort()) {
      let at = e.at;
      if (!at.size) {
        // never visible at any width (a closed card, a filtered-out item): use
        // the largest of the same component on this page
        const same = [...pg.values()].filter((x) => x.comp === e.comp && x.at.size);
        if (!same.length) { console.warn(`  ! ${f} ${id}: never visible, and no visible photo in the same component (${e.comp})`); continue; }
        at = new Map();
        for (const x of same) for (const [vw, px] of x.at) at.set(vw, Math.max(at.get(vw) || 0, px));
        e.cover = same.some((x) => x.cover);
        hidden++;
      }
      out[id] = sizesAttr(fit(at), e.cover);
    }
    table[f] = out;
  }
  const sorted = Object.fromEntries(Object.entries(table).sort(([a], [b]) => (a === '_about' ? -1 : b === '_about' ? 1 : a.localeCompare(b))));
  const count = Object.entries(sorted).filter(([k]) => k !== '_about').reduce((s, [, v]) => s + Object.keys(v).length, 0);

  if (CHECK) {
    const problems = [];
    for (const [f, pg] of Object.entries(sorted)) {
      if (f === '_about') continue;
      for (const [id, attr] of Object.entries(pg)) {
        const was = old[f]?.[id];
        if (!was) { problems.push(`${f} ${id}: not in src/image-sizes.json`); continue; }
        // stale when the stored value is off by more than 15 % at any measured width
        const worst = Math.max(...DESK.map((vw) => Math.abs(evalSizes(was, vw) / evalSizes(attr, vw) - 1)));
        if (worst > 0.15 || /^auto/.test(was) !== /^auto/.test(attr)) problems.push(`${f} ${id}: stored "${was}", measured "${attr}"`);
      }
      for (const id of Object.keys(old[f] || {})) if (!(id in pg)) problems.push(`${f} ${id}: in src/image-sizes.json, but not on the page`);
    }
    if (problems.length) { console.error(`✗ src/image-sizes.json is out of date (${problems.length}):\n  ${problems.join('\n  ')}\nRun node tools/measure-sizes.mjs, then node build.mjs.`); process.exit(1); }
    console.log(`✓ src/image-sizes.json matches the layout (${count} photos)`);
    return;
  }
  await writeFile(OUT, JSON.stringify(sorted, null, 1) + '\n');
  console.log(`✓ src/image-sizes.json: ${count} photos on ${Object.keys(sorted).length - 1} pages${hidden ? ` (${hidden} never visible, sized like their component)` : ''}. Now run node build.mjs.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
}
