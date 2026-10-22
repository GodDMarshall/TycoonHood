#!/usr/bin/env node
// Site-wide QA crawler (ported from the Ojasphera build).
//
//   node qa/check-pages.mjs            needs `node build.mjs --serve` running
//   BASE_URL=https://… node qa/check-pages.mjs
//
// Reads every <loc> in sitemap.xml and opens each page three times:
//   1. desktop 1440×900   — HTTP 200, no page errors or console errors
//   2. phone 390×844      — the same, plus no sideways scroll
//   3. reduced motion     — every element in its final state; axe-core audit
// Also checks one <h1> per page, alt text on every image, JSON-LD parses, and
// that an unknown URL returns 404. Exits 1 with a list of problems.

import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4321/').replace(/\/?$/, '/');
const exe = ['/opt/pw-browsers/chromium', process.env.PW_CHROMIUM_PATH].find((p) => p && existsSync(p));
const AXE = require.resolve('axe-core/axe.min.js');

const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/^\//, '') || 'index.html');
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const problems = [];

async function visit(path, opts, fn) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => { try { sessionStorage.setItem('dp-intro', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(`pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/youtube|google|ytimg|gstatic/i.test(m.text())) errs.push(`console ${m.text()}`); });
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  if (res.status() !== 200) errs.push(`HTTP ${res.status()}`);
  if (fn) errs.push(...(await fn(page)));
  await ctx.close();
  return errs;
}

for (const path of paths) {
  const t0 = Date.now();
  const errs = [];
  errs.push(...(await visit(path, { viewport: { width: 1440, height: 900 } }, async (p) => p.evaluate(() => {
    const out = [];
    if (document.querySelectorAll('h1').length !== 1) out.push(`h1 count ${document.querySelectorAll('h1').length}`);
    const noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
    if (noAlt) out.push(`${noAlt} images without alt`);
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { JSON.parse(s.textContent); } catch (e) { out.push('invalid JSON-LD'); } });
    return out;
  }))).map((e) => `desktop: ${e}`));
  errs.push(...(await visit(path, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, async (p) => {
    const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    return o > 1 ? [`sideways scroll ${o}px`] : [];
  })).map((e) => `phone: ${e}`));
  errs.push(...(await visit(path, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }, async (p) => {
    await p.addScriptTag({ path: AXE });
    const r = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`));
    return r;
  })).map((e) => `axe: ${e}`));
  console.log(`${errs.length ? '✗' : '✓'} ${path} (${Date.now() - t0} ms)`);
  errs.forEach((e) => { console.log('   ' + e); problems.push(`${path} ${e}`); });
}

const missing = await fetch(BASE + 'this-page-does-not-exist-' + Math.random().toString(36).slice(2)).catch(() => null);
if (!missing || missing.status !== 404) problems.push(`unknown URL returned ${missing && missing.status}, expected 404`);

await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s).` : `\nAll ${paths.length} pages clean.`);
process.exit(problems.length ? 1 : 0);
