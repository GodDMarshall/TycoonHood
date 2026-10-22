#!/usr/bin/env node
// Screenshot one page at desktop and phone size and report problems.
//
//   node qa/shot.mjs <page.html> [outDir] [--full] [--scroll]
//
// Needs the dev server (`node build.mjs --serve`, port 4321) or BASE_URL.
// Writes <outDir>/<page>-desktop.png and -mobile.png (full-page with --full),
// then prints console errors, sideways overflow and broken images as JSON.
// Exits 1 if anything is wrong. Uses the system Chromium when present.

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const page = args.find((a) => !a.startsWith('--')) || 'index.html';
const outDir = args.filter((a) => !a.startsWith('--'))[1] || 'qa/shots';
const full = args.includes('--full');
const scroll = args.includes('--scroll');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321/';
const exe = ['/opt/pw-browsers/chromium', process.env.PW_CHROMIUM_PATH].find((p) => p && existsSync(p));

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const report = { page, problems: [] };

for (const [name, viewport, extra] of [
  ['desktop', { width: 1440, height: 900 }, {}],
  ['mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const ctx = await browser.newContext({ viewport, ...extra });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('dp-intro', '1'); } catch (e) {} });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => report.problems.push(`${name}: pageerror ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') report.problems.push(`${name}: console ${m.text()}`); });
  const res = await p.goto(BASE + page, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => ({ status: () => 0, err: e }));
  if (res.status() !== 200) report.problems.push(`${name}: HTTP ${res.status()}`);
  if (scroll || full) {
    // walk the page so lazy images load and scroll reveals fire
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.7) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
    await p.evaluate(() => window.DP && DP.reveal && DP.reveal(document));
  }
  await p.waitForTimeout(1600);
  const info = await p.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('loading') !== 'lazy').map((i) => i.src),
    noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
    h1: document.querySelectorAll('h1').length,
  }));
  if (info.overflow > 1) report.problems.push(`${name}: horizontal overflow ${info.overflow}px`);
  if (info.broken.length) report.problems.push(`${name}: broken images ${info.broken.join(', ')}`);
  if (info.noAlt) report.problems.push(`${name}: ${info.noAlt} <img> without alt`);
  if (info.h1 !== 1) report.problems.push(`${name}: expected exactly one <h1>, found ${info.h1}`);
  const file = join(outDir, `${page.replace(/\W+/g, '-')}-${name}.png`);
  await p.screenshot({ path: file, fullPage: full });
  report[name] = file;
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.problems.length ? 1 : 0);
