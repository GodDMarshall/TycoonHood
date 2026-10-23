#!/usr/bin/env node
// Share-preview images (og:image) for every page.
//
//   node tools/make-og.mjs            (after npm install; needs `sharp`)
//
// Each page's `image` (its og:image: a Peetham photo on S3) is cropped to the
// 1.91:1 frame WhatsApp, Facebook, X and LinkedIn show, at up to 1200×630 (never
// enlarged), and saved as a progressive JPEG of at most ~250 KB in
// src/assets/img/og/<sha1 of the URL, 12 hex>-<w>x<h>.jpg. Many share
// previews (WhatsApp in particular) drop images much above 300 KB, and some of
// the originals are 0.8–2.4 MB PNGs.
//
// src/layout.mjs serves that file as an absolute og:image with its width and
// height when it exists, and falls back to the S3 original when it does not,
// so a new page works before this tool is run. Run it again after changing a
// page's `image`, and commit the outputs: the build only copies them.
// Originals are cached in .cache/img-src (shared with tools/optimize-images.mjs).

import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ogKey, DEFAULT_OG_IMAGE } from '../src/layout.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/assets/img/og');
const CACHE = join(ROOT, '.cache/img-src');
const MAX_BYTES = 250 * 1024;
const W = 1200, H = 630;

const pages = [];
for (const f of (await readdir(join(ROOT, 'src/pages'))).filter((x) => x.endsWith('.mjs')).sort()) {
  const page = (await import(pathToFileURL(join(ROOT, 'src/pages', f)).href)).default;
  pages.push({ file: page.file, image: page.image || DEFAULT_OG_IMAGE });
}
const urls = [...new Set(pages.map((p) => p.image))];
await mkdir(OUT, { recursive: true });
await mkdir(CACHE, { recursive: true });

const keep = new Set();
for (const url of urls) {
  const key = ogKey(url);
  const ext = url.slice(url.lastIndexOf('.')).toLowerCase();
  const src = join(CACHE, key + ext);
  // curl honours the environment's HTTPS proxy; Node's fetch does not.
  if (!existsSync(src)) await run('curl', ['-sSfL', '--retry', '2', '-o', src, encodeURI(decodeURI(url))], { maxBuffer: 1 << 26 });
  const input = await readFile(src);
  const meta = await sharp(input).rotate().metadata();
  const [sw, sh] = meta.orientation >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];
  const scale = Math.min(1, sw / W, sh / H);
  const w = Math.round(W * scale), h = Math.round(H * scale);
  // `attention` keeps the most salient region (faces, the lit shrine) in frame.
  const frame = await sharp(input).rotate().resize(w, h, { fit: 'cover', position: sharp.strategy.attention }).toBuffer();
  let q = 84, buf;
  do {
    buf = await sharp(frame).flatten({ background: '#f8f3e9' }).jpeg({ quality: q, mozjpeg: true, progressive: true }).toBuffer();
    q -= 6;
  } while (buf.length > MAX_BYTES && q >= 50);
  const name = `${key}-${w}x${h}.jpg`;
  await writeFile(join(OUT, name), buf);
  keep.add(name);
  const users = pages.filter((p) => p.image === url).map((p) => p.file).join(', ');
  console.log(`${name}  ${(buf.length / 1024).toFixed(0)} KB (q${q + 6}, from ${(input.length / 1024).toFixed(0)} KB ${sw}×${sh})  ${users}`);
}
for (const f of await readdir(OUT)) if (f.endsWith('.jpg') && !keep.has(f)) { await unlink(join(OUT, f)); console.log(`removed ${f} (no page uses it)`); }
