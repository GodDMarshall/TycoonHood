#!/usr/bin/env node
// Download every Peetham photo the site uses and publish it from its 4K master.
//
//   node tools/optimize-images.mjs          (after `node build.mjs`; `npm run images`)
//
// This used to publish WebP copies straight from the S3 web copies (at most
// 1600 px, often 400). It now hands over to tools/enhance-photos.mjs, which
// renders every photo to a 3840 px master first (512 px for app icons) and
// publishes 480-3840 px WebP copies from that: see docs/PHOTOS.md. So a new
// photo added to a page can never be published as a low-resolution copy. If
// the enhancer is not set up (tools/upscale/README.md), this stops with an
// error and the new photo keeps loading from S3 until it is.
// Arguments are passed through (--only=, --dry-run, --workers=, ...).

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const tool = join(dirname(fileURLToPath(import.meta.url)), 'enhance-photos.mjs');
const child = spawn(process.execPath, [tool, ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('close', (code, signal) => process.exit(signal ? 1 : code));
