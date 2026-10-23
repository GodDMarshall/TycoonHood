#!/usr/bin/env node
// Checks every off-site link and file the built site points at: the Peetham's
// existing platform (bookings, donations, sign-in, store, old pages), the S3
// photos, PDFs and audio, YouTube, the app stores and social pages.
//
//   node tools/check-external-links.mjs [siteDir=site] [--only=host,host] [--concurrency=6]
//
// Run it from an ordinary internet connection before launch and after the
// domain moves (the build sandbox could not reach most of these hosts). It
// needs no install: Node 20+'s fetch. Each URL is tried with HEAD, then GET,
// following redirects, with a 20 s timeout. Exit code 1 when any URL fails.
//
// Some hosts answer automated requests with 4xx or a login wall even though
// the page works in a browser (Facebook, Instagram, X). Those are listed as
// "check by hand", not as failures.

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const SITE = resolve(args.find((a) => !a.startsWith('--')) || 'site');
const ONLY = opt('only') ? opt('only').split(',') : null;
const N = Number(opt('concurrency', 6));
const BY_HAND = /(?:^|\.)(?:facebook\.com|instagram\.com|x\.com|twitter\.com|linkedin\.com)$/;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const urls = new Map(); // url → first page that uses it
for (const f of await walk(SITE)) {
  const html = (await readFile(f, 'utf8')).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  for (const [, u] of html.matchAll(/\s(?:href|src|data-full|poster)="(https?:\/\/[^"]+)"/g)) {
    const url = u.replace(/&amp;/g, '&');
    const host = new URL(url).hostname;
    // preconnect hints and font CSS are not links; YouTube embeds are built at runtime
    if (/^fonts\.(?:googleapis|gstatic)\.com$/.test(host) || /\/\/[^/]+\/?$/.test(url) && /dattapeetham\.s3/.test(host)) continue;
    if (ONLY && !ONLY.some((h) => host === h || host.endsWith('.' + h))) continue;
    if (!urls.has(url)) urls.set(url, f.slice(SITE.length + 1));
  }
}

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (link check; Datta Peetham website handover)' } });
      if (method === 'GET' && r.body) await r.body.cancel();
      if (r.ok) return { ok: true, status: r.status, final: r.url };
      if (method === 'GET') return { ok: false, status: r.status, final: r.url };
    } catch (e) {
      if (method === 'GET') return { ok: false, status: e.name === 'TimeoutError' ? 'timeout' : e.cause?.code || e.message };
    }
  }
}

const list = [...urls.keys()];
const results = [];
let i = 0;
await Promise.all(Array.from({ length: N }, async () => { while (i < list.length) { const url = list[i++]; results.push({ url, page: urls.get(url), ...(await check(url)) }); } }));

const failed = results.filter((r) => !r.ok && !BY_HAND.test(new URL(r.url).hostname));
const byHand = results.filter((r) => !r.ok && BY_HAND.test(new URL(r.url).hostname));
const login = results.filter((r) => r.ok && /\/login\b|signin|accounts\./i.test(r.final || '') && !/\/login\b/.test(r.url));
for (const r of failed) console.log(`FAIL  ${String(r.status).padEnd(8)} ${r.url}  (on ${r.page})`);
for (const r of byHand) console.log(`HAND  ${String(r.status).padEnd(8)} ${r.url}  (on ${r.page}; open it in a browser)`);
for (const r of login) console.log(`LOGIN ${r.url} → ${r.final}  (on ${r.page}; ends at a sign-in page)`);
console.log(`\n${results.length} URLs: ${results.length - failed.length - byHand.length} ok, ${failed.length} failed, ${byHand.length} to check by hand, ${login.length} land on a sign-in page`);
process.exit(failed.length ? 1 : 0);
