#!/usr/bin/env node
// Browser and home-screen icons from the lotus mandala favicon.
//
//   node tools/make-icons.mjs
//
// Reads src/assets/img/favicon.svg and writes, into src/assets/img/icons/:
//   favicon-16.png, favicon-32.png   tab icons for browsers without SVG favicons
//   favicon.ico                      16 + 32 px PNGs in an ICO container; the
//                                    build also copies it to /favicon.ico
//   apple-touch-icon.png             180 px, opaque forest ground, padded
//   icon-192.png, icon-512.png       web manifest icons (purpose "any")
//   icon-maskable-512.png            opaque, mark inside the maskable safe zone
//
// Run it once after changing the favicon and commit the outputs: the build
// only copies them, so it needs no image library. Uses the `sharp`
// devDependency (npm install).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG = join(ROOT, 'src/assets/img/favicon.svg');
const OUT = join(ROOT, 'src/assets/img/icons');
// --forest in src/assets/css/site.css: the favicon's own disc colour, so the
// disc melts into the square ground and the gold mandala carries the icon.
const GROUND = '#0f1c18';

const svg = await readFile(SVG);
const VIEWBOX = 104; // favicon.svg viewBox is 104 × 104

// Rasterise the SVG at `size` px. librsvg renders at the requested density,
// so render large and let sharp downsample for clean small sizes.
async function render(size) {
  const density = Math.min(2400, Math.ceil((72 * Math.max(size, 256) * 2) / VIEWBOX));
  return sharp(svg, { density }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

// The mark scaled to `scale` of the canvas, centred on an opaque square.
async function onGround(size, scale) {
  const inner = Math.round(size * scale);
  const mark = await render(inner);
  const off = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 3, background: GROUND } })
    .composite([{ input: mark, left: off, top: off }])
    .flatten({ background: GROUND })
    .removeAlpha()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

const png = (buf) => sharp(buf).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();

// ICO container (ICONDIR + one ICONDIRENTRY per image + PNG payloads). PNG
// payloads are valid in ICO since Windows Vista and in every current browser.
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); // reserved
  head.writeUInt16LE(1, 2); // type 1 = icon
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); // width (0 = 256)
    head.writeUInt8(size >= 256 ? 0 : size, e + 1); // height
    head.writeUInt8(0, e + 2); // palette colours
    head.writeUInt8(0, e + 3); // reserved
    head.writeUInt16LE(1, e + 4); // colour planes
    head.writeUInt16LE(32, e + 6); // bits per pixel
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((x) => x.data)]);
}

await mkdir(OUT, { recursive: true });
const f16 = await png(await render(16));
const f32 = await png(await render(32));
const files = {
  'favicon-16.png': f16,
  'favicon-32.png': f32,
  'favicon.ico': ico([{ size: 16, data: f16 }, { size: 32, data: f32 }]),
  // iOS rounds the corners and shows transparency as black: opaque, with
  // the mark at 80% so nothing sits near the clipped corners.
  'apple-touch-icon.png': await onGround(180, 0.8),
  'icon-192.png': await png(await render(192)),
  'icon-512.png': await png(await render(512)),
  // Maskable icons may be cropped to a circle of 80% diameter. At 70% the
  // mandala's outer ring sits well inside that safe zone.
  'icon-maskable-512.png': await onGround(512, 0.7),
};
for (const [name, data] of Object.entries(files)) {
  await writeFile(join(OUT, name), data);
  console.log(`${name.padEnd(24)} ${String(data.length).padStart(6)} bytes`);
}
console.log(`→ ${OUT}`);
