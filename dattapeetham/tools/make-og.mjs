#!/usr/bin/env node
// Share-preview images (og:image) for every page.
//
//   node tools/make-og.mjs            (after npm install; needs `sharp`)
//   node tools/make-og.mjs --out=DIR  (write somewhere else, to compare)
//
// Each page's `image` (its og:image: a Peetham photo) is cut to the 1.91:1
// frame WhatsApp, Facebook, X and LinkedIn show, 1200×630, and saved as a
// progressive JPEG of at most 300 KB in src/assets/img/og/<slug>.jpg (many
// share previews, WhatsApp in particular, drop larger images). The cut and the
// quality are tools/share-image.mjs, the same as tools/enhance-photos.mjs uses
// when it makes a new photo's 4K master; this tool re-cuts them all, for a page
// whose `image` changed to a photo the site already has.
//
// The source is the photo's 4K master in .cache/img-4k/ when this machine
// made it, otherwise its 3840 px copy in src/assets/img/opt/ (committed). A
// photo with neither is not on the site yet: run tools/enhance-photos.mjs.
//
// src/layout.mjs shares assets/img/og/<slug>.jpg as an absolute og:image with
// its width, height and alt text. Commit the outputs: the build only copies
// them. Files in src/assets/img/og/ that no page uses are removed.

import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, unlink, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_OG_IMAGE } from '../src/layout.mjs';
import { OG, cutShareImage } from './share-image.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? resolve(outArg.slice(6)) : join(ROOT, 'src/assets/img/og');
const OPT = join(ROOT, 'src/assets/img/opt');
const REPORT = join(ROOT, '.cache/img-4k/report.json');

const manifest = JSON.parse(await readFile(join(OPT, 'manifest.json'), 'utf8'));
let masters = new Map();
try {
  const report = JSON.parse(await readFile(REPORT, 'utf8'));
  masters = new Map((report.images || []).filter((r) => r.master?.file).map((r) => [r.url, r.master]));
} catch { /* no masters on this machine: the 3840 copies */ }

const pages = [];
for (const f of (await readdir(join(ROOT, 'src/pages'))).filter((x) => x.endsWith('.mjs')).sort()) {
  const page = (await import(pathToFileURL(join(ROOT, 'src/pages', f)).href)).default;
  if (!page?.file) continue;
  pages.push({ slug: page.slug || page.file.replace(/\.html$/, ''), file: page.file, image: page.image || DEFAULT_OG_IMAGE });
}

await mkdir(OUT, { recursive: true });
const keep = new Set();
let failed = 0;
for (const p of pages) {
  const master = masters.get(p.image);
  const e = manifest[p.image];
  let input, size, from;
  if (master && existsSync(join(ROOT, master.file))) {
    input = await readFile(join(ROOT, master.file));
    size = master;
    from = master.file;
  } else if (e) {
    const [w, file] = e.srcs[e.srcs.length - 1];
    input = await readFile(join(ROOT, 'src', file));
    size = { w, h: Math.round((w * e.h) / e.w) };
    from = `src/${file}`;
  } else {
    console.error(`✗ ${p.file}: ${p.image} has no 4K copy yet: run node tools/enhance-photos.mjs`);
    failed++;
    continue;
  }
  const { buf, quality, crop } = await cutShareImage(sharp, input, size, p.slug);
  const name = `${p.slug}.jpg`;
  const tmp = join(OUT, `.${name}.tmp-${process.pid}`);
  await writeFile(tmp, buf);
  await rename(tmp, join(OUT, name));
  keep.add(name);
  console.log(`${name.padEnd(20)} ${OG.w}×${OG.h} ${(buf.length / 1024).toFixed(0).padStart(4)} KB  q${quality}  ${crop}  from ${from}`);
}
if (!outArg && !failed) {
  for (const f of await readdir(OUT)) if (/\.jpe?g$/i.test(f) && !keep.has(f)) { await unlink(join(OUT, f)); console.log(`removed ${f} (no page uses it)`); }
}
if (failed) process.exit(1);
