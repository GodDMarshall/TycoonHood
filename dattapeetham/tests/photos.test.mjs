// Photo pipeline guards (node:test, no dependencies): every photo on the site
// is served from its enhanced 4K master, never from a small copy or from S3.
//
//   node build.mjs && node --test tests/photos.test.mjs
//   DP_SITE_DIR=/tmp/x node --test tests/photos.test.mjs      (another build)
//
// The masters and their WebP copies come from tools/enhance-photos.mjs; see
// docs/PHOTOS.md. Photos: 3840 px on the long edge; app icons: 512 px.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, posix, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.DP_SITE_DIR ? resolve(process.env.DP_SITE_DIR) : join(ROOT, 'site');
const OPT = join(ROOT, 'src/assets/img/opt');
const OG = join(ROOT, 'src/assets/img/og');
const manifest = JSON.parse(await readFile(join(OPT, 'manifest.json'), 'utf8'));
const TARGET = { photo: 3840, icon: 512 };
const WIDTHS = { photo: [480, 960, 1600, 2560, 3840], icon: [96, 192, 384, 512] };
const isIcon = (url) => /\/front_page_images\/app-[0-9a-f]+\.png$/i.test(url);
const S3_IMAGE = /https?:\/\/(?:dev-)?dattapeetham\.s3\.amazonaws\.com\/[^"'\s)<>,]+?\.(?:jpe?g|png|webp|gif)\b/i;
const longEdge = (e) => Math.max(e.w, e.h);
const exists = async (p) => !!(await stat(p).catch(() => null));

// variant file name -> its manifest entry
const byFile = new Map();
for (const [url, e] of Object.entries(manifest)) for (const [w, f] of e.srcs) byFile.set(basename(f), { url, e, w });

const files = (await readdir(SITE)).filter((f) => f.endsWith('.html'));
const pages = [];
for (const dir of ['', 'kn', 'hi', 'ta', 'te']) {
  for (const f of files) {
    const p = dir ? `${dir}/${f}` : f;
    pages.push({ f: p, html: await readFile(join(SITE, p), 'utf8') });
  }
}
const target = (page, url) => posix.normalize(posix.join(posix.dirname(page), url.split('#')[0].split('?')[0]));
const attr = (tag, name) => (new RegExp(`\\s${name}="([^"]*)"`).exec(tag) || [])[1];

// image sizes from the file headers
function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4) + buf.toString('ascii', 8, 12), 'RIFFWEBP', 'not a WebP');
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  if (chunk === 'VP8X') return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  throw new Error(`unknown WebP chunk ${chunk}`);
}
function jpegSize(buf) {
  assert.equal(buf.readUInt16BE(0), 0xffd8, 'not a JPEG');
  for (let i = 2; i < buf.length;) {
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no SOF marker');
}

test('manifest: every photo has a 3840 px master, every app icon a 512 px one', () => {
  assert.ok(Object.keys(manifest).length > 100, 'manifest looks empty');
  for (const [url, e] of Object.entries(manifest)) {
    const cls = isIcon(url) ? 'icon' : 'photo';
    assert.equal(e.class, cls, `${url}: class ${e.class}, expected ${cls}`);
    assert.equal(longEdge(e), TARGET[cls], `${url}: master ${e.w}x${e.h}, expected a ${TARGET[cls]} px long edge`);
  }
});

test('manifest: masters keep the original shape and carry their provenance', () => {
  for (const [url, e] of Object.entries(manifest)) {
    assert.ok(e.src && e.src.w > 0 && e.src.h > 0, `${url}: no source size`);
    // the short edge is rounded from the long one: at most half a source pixel off
    assert.ok(Math.abs(e.w * e.src.h - e.h * e.src.w) <= 0.5 * Math.max(e.src.w, e.src.h) + 1, `${url}: master ${e.w}x${e.h} changes the shape of the ${e.src.w}x${e.src.h} source`);
    assert.equal(typeof e.method, 'string', `${url}: no method`);
    assert.ok(e.scale > 0, `${url}: no scale`);
    assert.ok(Math.abs(e.scale - e.w / e.src.w) < 0.01, `${url}: scale ${e.scale} disagrees with ${e.w}/${e.src.w}`);
    assert.ok(e.fidelity && e.fidelity.psnr > 0 && e.fidelity.ssim > 0 && e.fidelity.ssim <= 1, `${url}: no fidelity guard`);
  }
});

test('manifest: variant widths, ending at the master\'s full width', async () => {
  for (const [url, e] of Object.entries(manifest)) {
    const ws = e.srcs.map(([w]) => w);
    assert.deepEqual(ws, [...ws].sort((a, b) => a - b), `${url}: srcs not ascending`);
    assert.equal(ws[ws.length - 1], e.w, `${url}: largest variant ${ws[ws.length - 1]} is not the master's full width ${e.w}`);
    assert.ok(WIDTHS[e.class], `${url}: class ${e.class} is neither photo nor icon`);
    for (const w of ws) assert.ok(WIDTHS[e.class].includes(w) || w === e.w, `${url}: unexpected width ${w}`);
  }
});

test('every WebP copy exists and is as wide as its srcset descriptor says', async () => {
  for (const [url, e] of Object.entries(manifest)) {
    for (const [w, f] of e.srcs) {
      const file = join(ROOT, 'src', f);
      assert.ok(await exists(file), `${url}: ${f} missing`);
      const s = webpSize(await readFile(file));
      assert.equal(s.w, w, `${f}: ${s.w} px wide, descriptor says ${w}w`);
      assert.ok(Math.abs(s.h - (w * e.h) / e.w) <= 1, `${f}: ${s.w}x${s.h} is not the master's shape`);
    }
  }
});

test('no orphaned WebP copies in src/assets/img/opt', async () => {
  const orphans = (await readdir(OPT)).filter((f) => f.endsWith('.webp') && !byFile.has(f));
  assert.deepEqual(orphans, [], 'copies no manifest entry uses (they would ship for nothing)');
});

test('flagged photos are reviewed in docs/PHOTOS.md', async () => {
  const doc = await readFile(join(ROOT, 'docs/PHOTOS.md'), 'utf8').catch(() => '');
  for (const [url, e] of Object.entries(manifest)) {
    if (!e.flag) continue;
    const hash = basename(e.srcs[0][1]).slice(0, 12);
    assert.ok(doc.includes(hash), `${url} (${hash}) is flagged by the fidelity guard but not reviewed in docs/PHOTOS.md`);
  }
});

// The photo review found the network redraws small faces and small lettering;
// these guard what it decided (docs/PHOTOS.md, "Photo review").
test('every master the network made went through the face guard', () => {
  for (const [url, e] of Object.entries(manifest)) {
    if (e.route !== 'x4' && e.route !== 'x16' && e.route !== 'pre') continue;
    assert.ok(e.faces && Number.isInteger(e.faces.found) && Number.isInteger(e.faces.protected), `${url}: made by the network without the face guard (no faces record)`);
    assert.ok(e.faces.protected <= e.faces.found, `${url}: protected ${e.faces.protected} of ${e.faces.found} faces`);
    assert.match(e.method, /realesrgan/, `${url}: route ${e.route} but method ${e.method}`);
  }
});

test('no face-restoration or generative model in any method', () => {
  for (const [url, e] of Object.entries(manifest)) {
    assert.doesNotMatch(e.method, /gfpgan|codeformer|restoreformer|diffusion|stable|sdxl|supir|gan-face/i, `${url}: ${e.method}`);
    assert.ok(/^(realesrgan|lanczos)/.test(e.method), `${url}: unknown method ${e.method}`);
  }
});

test('photos/overrides.json: every entry names a photo on the site and is applied', async () => {
  const overrides = JSON.parse(await readFile(join(ROOT, 'photos/overrides.json'), 'utf8'));
  const byKey = new Map();
  for (const url of Object.keys(manifest)) {
    const path = url.replace(/^https:\/\/[^/]+\//, '');
    for (const k of [url, path, decodeURIComponent(path), decodeURIComponent(basename(url))]) byKey.set(k, url);
  }
  for (const [k, o] of Object.entries(overrides)) {
    if (k.startsWith('_')) continue;
    const url = byKey.get(k) || Object.keys(manifest).find((u) => basename(manifest[u].srcs[0][1]).startsWith(k + '-'));
    assert.ok(url, `photos/overrides.json: ${k} matches no photo in the manifest`);
    assert.ok(o.note, `photos/overrides.json: ${k} has no note saying why`);
    const e = manifest[url];
    if (o.route === 'lanczos') {
      assert.equal(e.route, 'lanczos', `${k}: the review sent it to the lanczos route, the manifest says ${e.route}`);
      assert.match(e.method, /^lanczos/, `${k}: ${e.method}`);
    }
    for (const r of o.protect || []) {
      assert.equal(r.length, 4, `${k}: protect region ${JSON.stringify(r)}`);
      assert.ok(r.every((v) => v >= 0 && v <= 1) && r[0] + r[2] <= 1.0001 && r[1] + r[3] <= 1.0001 && r[2] > 0 && r[3] > 0, `${k}: protect region ${JSON.stringify(r)} is not inside the photo`);
    }
    if (o.protect?.length && e.route !== 'lanczos' && e.route !== 'resize') {
      assert.ok(e.protected >= o.protect.length, `${k}: ${o.protect.length} protected regions in overrides.json, the master was made with ${e.protected || 0}`);
    }
  }
});

for (const { f, html } of pages) {
  test(`${f}: every photo comes from its 4K master, none from S3`, async () => {
    for (const tag of html.match(/<img\b[^>]*>/g) || []) {
      const src = attr(tag, 'src') || '';
      const srcset = attr(tag, 'srcset') || '';
      const short = tag.slice(0, 140);
      assert.ok(!S3_IMAGE.test(src) && !S3_IMAGE.test(srcset), `<img> loads a photo straight from S3: ${short}`);
      if (!/assets\/img\/opt\//.test(src + srcset)) continue;
      assert.ok(srcset, `optimised <img> without srcset: ${short}`);
      assert.ok(attr(tag, 'sizes'), `<img> with srcset but no sizes: ${short}`);
      const cands = srcset.split(',').map((c) => c.trim().split(/\s+/)).map(([u, d]) => ({ u, w: parseInt(d, 10) }));
      const entries = new Set();
      for (const { u, w } of cands) {
        assert.ok(await exists(join(SITE, target(f, u))), `${f}: ${u} missing from the build`);
        const v = byFile.get(basename(u));
        assert.ok(v, `${u} is not in the manifest`);
        assert.equal(v.w, w, `${u}: descriptor ${w}w, manifest ${v.w}`);
        entries.add(v.e);
      }
      assert.equal(entries.size, 1, `srcset mixes photos: ${short}`);
      const [e] = entries;
      const largest = Math.max(...cands.map((c) => c.w));
      assert.ok(largest >= 3840 || largest === e.w, `largest candidate ${largest}w is below 3840 and not the master's full width ${e.w}: ${short}`);
      assert.equal(largest, e.w, `srcset stops at ${largest}w; the master is ${e.w} wide: ${short}`);
      assert.equal(longEdge(e), TARGET[e.class], `master ${e.w}x${e.h} is not ${TARGET[e.class]} px on the long edge: ${short}`);
      const W = +attr(tag, 'width'), H = +attr(tag, 'height');
      assert.ok(W > 0 && H > 0, `no width/height: ${short}`);
      assert.ok(Math.abs(W / H - e.w / e.h) / (e.w / e.h) < 0.01, `width/height ${W}x${H} do not match the master's shape ${e.w}x${e.h}: ${short}`);
    }
    // the hero preload offers the very candidates its <img> does: a preload
    // that stops at a small copy makes a wide screen load the soft one first
    const srcsets = (html.match(/<img\b[^>]*>/g) || []).map((t) => attr(t, 'srcset'));
    for (const link of html.match(/<link\b[^>]*\srel="preload"[^>]*>/g) || []) {
      const iss = attr(link, 'imagesrcset');
      if (iss) assert.ok(srcsets.includes(iss), `preload imagesrcset is not the srcset of any <img> on the page: ${link.slice(0, 160)}`);
    }
    // backgrounds, lightbox sources, data attributes, the share image and
    // structured data: no S3 photo either (links to S3 files are fine)
    const rest = html.replace(/<a\b[^>]*>/g, '');
    const m = S3_IMAGE.exec(rest);
    assert.ok(!m, `a photo still comes from S3: …${m && rest.slice(Math.max(0, m.index - 60), m.index + m[0].length)}`);
  });
  test(`${f}: structured data names this site's own 4K copies`, async () => {
    const images = [];
    const walk = (v, k) => { if (Array.isArray(v)) v.forEach((x) => walk(x, k)); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => walk(x, kk)); else if (k === 'image' && typeof v === 'string') images.push(v); };
    for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) walk(JSON.parse(json));
    for (const u of images) {
      assert.ok(u.startsWith(`${site.origin}/assets/img/opt/`), `JSON-LD image is not this site's copy: ${u}`);
      const v = byFile.get(basename(u));
      assert.ok(v && v.w === v.e.w, `JSON-LD image ${u} is not the largest copy (the master's width)`);
      assert.ok(await exists(join(SITE, u.slice(site.origin.length + 1))), `${u} is not in the build`);
    }
  });
}

// Safari and iOS have no sizes="auto": a lazy photo whose sizes falls back to
// the window width (the build's default "auto, 100vw") loads its 3840 copy for
// any box. tools/measure-sizes.mjs measures every lazy photo on every page;
// the build writes the result on the <img>.
const SIZES_FILE = join(ROOT, 'src/image-sizes.json');
const measured = JSON.parse(await readFile(SIZES_FILE, 'utf8').catch(() => '{}'));
const photoKeys = (html) => {
  const seen = new Map();
  return (html.match(/<img\b[^>]*>/g) || []).map((tag) => {
    const set = attr(tag, 'srcset') || '';
    if (!/assets\/img\/opt\//.test(set)) return null;
    const stem = basename(set.split(',')[0].trim().split(/\s+/)[0]).replace(/-\d+\.webp$/, '');
    const n = seen.get(stem) || 0;
    seen.set(stem, n + 1);
    return { key: `${stem}#${n}`, tag };
  }).filter(Boolean);
};
for (const { f, html } of pages) {
  test(`${f}: every lazy photo carries its measured sizes, every hero its own`, () => {
    const table = measured[basename(f)] || {};
    const missing = [], wrong = [];
    for (const { key, tag } of photoKeys(html)) {
      const sizes = attr(tag, 'sizes');
      if (attr(tag, 'loading') !== 'lazy') {
        // eager (the page hero, preloaded): its page states the width, never "auto"
        assert.ok(sizes && !/^auto/.test(sizes), `eager photo with sizes="${sizes}": ${tag.slice(0, 120)}`);
        continue;
      }
      if (!table[key]) missing.push(key);
      else if (sizes !== table[key]) wrong.push(`${key}: "${sizes}"`);
    }
    assert.deepEqual(missing, [], `lazy photos with no measured sizes in src/image-sizes.json (run node tools/measure-sizes.mjs, then node build.mjs)`);
    assert.deepEqual(wrong, [], 'sizes differs from src/image-sizes.json (rebuild)');
  });
}
test('src/image-sizes.json: every entry names a lazy photo on its page', () => {
  assert.ok(Object.keys(measured).length > 1, 'src/image-sizes.json is missing: run node tools/measure-sizes.mjs');
  for (const [file, table] of Object.entries(measured)) {
    if (file.startsWith('_')) continue;
    const page = pages.find((p) => p.f === file);
    assert.ok(page, `src/image-sizes.json: no page ${file}`);
    const lazy = new Set(photoKeys(page.html).filter((x) => attr(x.tag, 'loading') === 'lazy').map((x) => x.key));
    const stale = Object.keys(table).filter((k) => !lazy.has(k));
    assert.deepEqual(stale, [], `${file}: entries for photos no longer on the page (re-run node tools/measure-sizes.mjs)`);
    for (const [k, v] of Object.entries(table)) {
      // the tool's two forms: "auto, …" (drawn at its box width) or a cover crop's list
      assert.match(v, /^(auto, )?((\(min-width: \d+px\) )?((and )?\(min-resolution: [\d.]+dppx\) )?(\d+px|[\d.]+vw|calc\([\d.]+vw [+-] \d+px\))(, |$))+$/, `${file} ${k}: "${v}"`);
    }
  }
});

test('built scripts and styles load no photo from S3', async () => {
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat();
  for (const file of (await walk(join(SITE, 'assets'))).filter((p) => /\.(js|css)$/.test(p))) {
    const m = S3_IMAGE.exec(await readFile(file, 'utf8'));
    assert.ok(!m, `${file.slice(SITE.length + 1)} loads ${m && m[0]} from S3`);
  }
});

test('share images: a 1200x630 JPEG under 300 KB for every page, and nothing else', async () => {
  for (const f of files) {
    const file = join(OG, f.replace(/\.html$/, '.jpg'));
    assert.ok(await exists(file), `${f}: no share image ${file.slice(ROOT.length + 1)}`);
    const buf = await readFile(file);
    assert.deepEqual(jpegSize(buf), { w: 1200, h: 630 }, `${file.slice(ROOT.length + 1)}`);
    assert.ok(buf.length <= 300 * 1024, `${file.slice(ROOT.length + 1)} is ${(buf.length / 1024).toFixed(0)} KB (share previews drop images over 300 KB)`);
  }
  // one share image per page: no other set shipped beside it
  const extra = (await readdir(OG)).filter((n) => !files.includes(n.replace(/\.jpg$/, '.html')));
  assert.deepEqual(extra, [], 'files in src/assets/img/og/ that no page shares (node tools/make-og.mjs removes them)');
});
