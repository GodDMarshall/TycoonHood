#!/usr/bin/env node
// Download every Peetham photo the site uses and publish responsive WebP copies.
//
//   node tools/optimize-images.mjs          (after `node build.mjs`)
//
// Scans the built pages and scripts for images on the Peetham's S3 buckets,
// downloads each once (cached in .cache/img-src), writes WebP variants at 480,
// 960 and 1600 px wide (never wider than the original) to src/assets/img/opt/,
// and records them in src/assets/img/opt/manifest.json. build.mjs reads that
// manifest and serves the local copies with srcset; images missing from it keep
// loading from S3, so the site never breaks. Dev-only: needs `sharp`.

import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const OUT = join(ROOT, 'src/assets/img/opt');
const CACHE = join(ROOT, '.cache/img-src');
const MANIFEST = join(OUT, 'manifest.json');
const WIDTHS = [480, 960, 1600];
const QUALITY = 72;
const S3 = /https:\/\/(?:dev-)?dattapeetham\.s3\.amazonaws\.com\/[^"'\s)<>]+?\.(?:jpe?g|png|webp|gif)/gi;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(html|js|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

const decodeHtml = (u) => u.replace(/&amp;/g, '&');

async function download(url, file) {
  // curl honours the environment's HTTPS proxy; Node's fetch does not.
  await run('curl', ['-sSfL', '--retry', '2', '-o', file, url], { maxBuffer: 1 << 26 });
}

const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
await mkdir(OUT, { recursive: true });
await mkdir(CACHE, { recursive: true });

const urls = new Set();
for (const f of await walk(SITE)) {
  const text = await readFile(f, 'utf8');
  for (const m of text.matchAll(S3)) urls.add(decodeHtml(m[0]));
}
const todo = [...urls].filter((u) => !manifest[u]);
console.log(`${urls.size} images referenced, ${todo.length} new`);

let saved = 0, before = 0, after = 0, failed = [];
const queue = [...todo];
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    const hash = createHash('sha1').update(url).digest('hex').slice(0, 12);
    const src = join(CACHE, hash + url.slice(url.lastIndexOf('.')).toLowerCase());
    try {
      if (!existsSync(src)) await download(encodeURI(decodeURI(url)), src);
      const input = await readFile(src);
      const meta = await sharp(input).metadata();
      const widths = [...new Set(WIDTHS.filter((w) => w < meta.width).concat(Math.min(meta.width, WIDTHS[WIDTHS.length - 1])))].sort((a, b) => a - b);
      const srcs = [];
      for (const w of widths) {
        const name = `${hash}-${w}.webp`;
        const buf = await sharp(input).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY, effort: 5 }).toBuffer();
        await writeFile(join(OUT, name), buf);
        srcs.push([w, `assets/img/opt/${name}`]);
        after += w === widths[widths.length - 1] ? buf.length : 0;
      }
      before += input.length;
      manifest[url] = { w: meta.width, h: meta.height, srcs };
      saved++;
      if (saved % 20 === 0) console.log(`  ${saved}/${todo.length}`);
    } catch (e) {
      failed.push(`${url} — ${e.message.split('\n')[0]}`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

await writeFile(MANIFEST, JSON.stringify(manifest, null, 0));
const outBytes = (await Promise.all((await readdir(OUT)).filter((f) => f.endsWith('.webp')).map(async (f) => (await stat(join(OUT, f))).size))).reduce((a, b) => a + b, 0);
console.log(`Optimised ${saved} new image(s). Largest variants ${(after / 1e6).toFixed(1)} MB vs originals ${(before / 1e6).toFixed(1)} MB. All variants on disk: ${(outBytes / 1e6).toFixed(1)} MB.`);
if (failed.length) { console.log(`${failed.length} failed (they keep loading from S3):\n  ` + failed.join('\n  ')); }
