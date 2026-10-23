#!/usr/bin/env node
// Checks a running web server against deploy/routes.mjs with real HTTP
// requests: redirects (status and Location), page URLs, the 404 page, security
// and cache headers, content types, hidden files and the platform hand-off.
// No dependencies; works against any host (nginx, Apache, IIS, Netlify,
// Cloudflare, Vercel, a CDN in front of any of them).
//
//   BASE_URL=http://127.0.0.1:8080/ node deploy/test/verify-server.mjs [options]
//
//   --base=URL                the server to test (or BASE_URL)
//   --site-url=URL            canonical site address (default: site.config.json, else https://www.dattapeetham.org)
//   --legacy-url=URL          platform address the configs were generated for (same default)
//   --no-canonical            skip the Host-header tests of the canonical-host/HTTPS redirects
//                             (for hosts that route by Host, e.g. Netlify or Vercel previews)
//   --forwarded-proto         also check that X-Forwarded-Proto: https suppresses the HTTPS redirect
//   --canonical-off=Name:Val  a request header that switches the canonical block off (test servers)
//   --fixtures                the site has the test fixtures from deploy/test/docker-servers.mjs
//                             (/.well-known/dp-test.txt, /.well-known/acme-challenge/dp-test, /.dp-secret)
//   --revalidate=VALUE        also accept this Cache-Control for pages and JSON, where the host
//                             has its own revalidating default (Netlify and Cloudflare send
//                             "public, max-age=0, must-revalidate", which behaves like "no-cache")
//   --no-vary                 do not require Vary: Accept-Encoding (local Cloudflare workerd omits it;
//                             the Cloudflare edge adds it)
//   --verbose                 print every check, not only failures
//
// Exit code 0 when every check passes.

import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as R from '../routes.mjs';

const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : undefined; };
const has = (name) => args.includes(`--${name}`);
let config = {};
try { config = JSON.parse(readFileSync(fileURLToPath(new URL('../../site.config.json', import.meta.url)), 'utf8')); } catch { /* defaults */ }

const BASE = new URL(opt('base') || process.env.BASE_URL || '');
const SITE = new URL(opt('site-url') || config.siteUrl || 'https://www.dattapeetham.org');
const LEGACY = new URL(opt('legacy-url') || config.legacyPlatformUrl || config.legacyUrl || SITE.href);
const SPLIT = SITE.host !== LEGACY.host;
const ALIAS = SITE.hostname.startsWith('www.') ? SITE.hostname.slice(4) : `www.${SITE.hostname}`;
const VERBOSE = has('verbose');
// Cache-Control values that mean "revalidate before every reuse".
const REVALIDATE = new Set([R.defaultCache, ...(opt('revalidate') ? [opt('revalidate')] : [])]);
const cacheOk = (got, want) => got === want || (want === R.defaultCache && REVALIDATE.has(got));

// ---------------------------------------------------------------- HTTP ---

function request(path, { method = 'GET', headers = {}, body = true } = {}) {
  const url = new URL(path, BASE);
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolveP, reject) => {
    const req = lib.request(url, { method, headers: { 'user-agent': 'dp-verify-server/1.0', ...headers } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'];
        try {
          if (enc === 'gzip') buf = zlib.gunzipSync(buf);
          else if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
          else if (enc === 'deflate') buf = zlib.inflateSync(buf);
        } catch { /* leave as is */ }
        const raw = {};
        for (let i = 0; i < res.rawHeaders.length; i += 2) (raw[res.rawHeaders[i].toLowerCase()] ||= []).push(res.rawHeaders[i + 1]);
        resolveP({ url, status: res.statusCode, headers: res.headers, raw, body: body ? buf.toString('utf8') : '' });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error(`timeout: ${url}`)));
    req.end();
  });
}

// Run requests a few at a time.
async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

// ---------------------------------------------------------------- checks ---

let passed = 0;
const failures = [];
function check(ok, label, detail = '') {
  if (ok) { passed++; if (VERBOSE) console.log(`  ok   ${label}`); return true; }
  failures.push(`${label}${detail ? `\n         ${detail}` : ''}`);
  console.log(`  FAIL ${label}${detail ? `\n         ${detail}` : ''}`);
  return false;
}
const one = (res, name) => {
  const v = res.raw[name.toLowerCase()];
  return v && v.length === 1 ? v[0] : v ? `<${v.length} values: ${v.join(' | ')}>` : undefined;
};
// Where a redirect points, as an absolute URL (Location may be relative).
const target = (res) => (res.headers.location ? new URL(res.headers.location, res.url).href : '');
const local = (to) => new URL(to, BASE).href;

async function expectRedirect(from, status, to, label = `${from} → ${status} ${to}`, headers) {
  const res = await request(from, { headers, body: false });
  check(res.status === status && target(res) === to, label, `got ${res.status} ${res.headers.location || '(no Location)'}${res.status !== status ? '' : `, resolved ${target(res)}`}`);
  return res;
}

const NOT_FOUND_MARK = 'class="page-404';
async function expectNotFound(path, label = `${path} → 404 with the custom 404 page`) {
  const res = await request(path);
  check(res.status === 404 && res.body.includes(NOT_FOUND_MARK), label, `got ${res.status}${res.headers.location ? ` → ${res.headers.location}` : ''}, custom page ${res.body.includes(NOT_FOUND_MARK) ? 'yes' : 'no'}`);
  return res;
}

function checkSecurity(res, what) {
  const csp = one(res, 'content-security-policy');
  check(csp === R.securityHeaders['Content-Security-Policy'], `${what}: Content-Security-Policy`, `got ${csp}`);
  for (const h of ['X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security']) {
    check(one(res, h) === R.securityHeaders[h], `${what}: ${h}`, `got ${one(res, h)}`);
  }
  const xfo = one(res, 'x-frame-options');
  check(xfo === R.securityHeaders['X-Frame-Options'] || /frame-ancestors/.test(csp || ''), `${what}: X-Frame-Options or frame-ancestors`, `got ${xfo}`);
}

const cacheExpect = (path, versioned) => {
  const rules = R.cacheRules.filter((r) => !r.versionedOnly || versioned);
  const p = path.split(/[?#]/)[0];
  const rule = rules.find((r) => p.startsWith(r.prefix) && r.extensions.some((x) => p.toLowerCase().endsWith('.' + x)));
  return rule ? rule.value : R.defaultCache;
};

// ------------------------------------------------------------------ main ---

async function main() {
  if (!BASE.host) { console.error('Give the server to test: BASE_URL=http://host:port/ or --base='); process.exit(2); }
  console.log(`Verifying ${BASE.origin} against deploy/routes.mjs v${R.VERSION}`);
  console.log(`  site ${SITE.origin}, platform ${SPLIT ? LEGACY.origin : 'on the same host (no platform redirects expected)'}`);

  // ---- the page list, from the server's own sitemap
  const sm = await request('/sitemap.xml');
  check(sm.status === 200, '/sitemap.xml → 200', `got ${sm.status}`);
  const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  check(locs.length > 0, 'sitemap lists pages', `${locs.length} <loc>`);
  const pages = locs.filter((p) => p.endsWith('.html'));
  const homes = locs.filter((p) => p.endsWith('/'));
  console.log(`  ${locs.length} pages in the sitemap (${pages.length} .html, ${homes.length} language homes)`);

  // ---- every page: 200, HTML, security headers, revalidate
  await pool(locs, 8, async (p) => {
    const res = await request(p);
    check(res.status === 200 && /^text\/html/.test(res.headers['content-type'] || ''), `${p} → 200 text/html`, `got ${res.status} ${res.headers['content-type']}`);
    checkSecurity(res, p);
    check(cacheOk(one(res, 'cache-control'), R.defaultCache), `${p}: Cache-Control ${R.defaultCache}`, `got ${one(res, 'cache-control')}`);
  });

  // ---- page URLs without .html → 301 to the .html URL (query kept)
  await pool(pages, 8, (p) => expectRedirect(p.slice(0, -5), R.pageUrls.status, local(p)));
  const sample = pages.find((p) => p !== '/index.html') || pages[0];
  await expectRedirect(`${sample.slice(0, -5)}?utm_source=dp&x=1`, R.pageUrls.status, local(`${sample}?utm_source=dp&x=1`));
  for (const h of homes) {
    await expectRedirect(`${h}index`, R.pageUrls.status, local(h));
    if (h !== '/') await expectRedirect(h.slice(0, -1), R.pageUrls.status, local(h));
  }

  // ---- old-site URLs → new pages (301, query kept before the #fragment)
  await pool(R.oldSiteRedirects, 8, ([from, to]) => expectRedirect(from, R.REDIRECT_STATUS, local(to)));
  for (const [from, to] of [R.oldSiteRedirects.find(([, t]) => t.includes('#')), R.oldSiteRedirects.find(([, t]) => !t.includes('#'))]) {
    const [path, hash = ''] = to.split('#');
    await expectRedirect(`${from}?utm_source=dp&x=1`, R.REDIRECT_STATUS, local(`${path}?utm_source=dp&x=1${hash ? '#' + hash : ''}`));
  }

  // ---- 404s, at any depth and in a language folder
  const nf = await expectNotFound('/this-page-does-not-exist-dp');
  checkSecurity(nf, '404 response');
  check(cacheOk(one(nf, 'cache-control'), R.defaultCache), `404 response: Cache-Control ${R.defaultCache}`, `got ${one(nf, 'cache-control')}`);
  await expectNotFound('/kn/this-page-does-not-exist-dp');
  for (const l of R.LANGUAGES.slice(1)) await expectNotFound(`/${l}/unknown`);
  await expectNotFound('/a/b/c/does-not-exist.html');
  await expectNotFound('/assets/css/does-not-exist.css');
  await expectNotFound('/page/view');
  const dir = await request('/assets/');
  check([403, 404].includes(dir.status) && !/Index of|Directory listing/i.test(dir.body), '/assets/ → no directory listing', `got ${dir.status}`);

  // ---- cache headers and content types per kind of file
  const home = await request('/');
  const refs = [...home.body.matchAll(/<(?:script\b[^>]*?\ssrc|link\b[^>]*?\shref)="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')).filter((u) => !/^(?:[a-z]+:|\/\/)/i.test(u));
  const code = refs.filter((u) => /^\/?assets\/.+\.(?:css|m?js)(?:\?|$)/.test(u));
  const versioned = code.length > 0 && code.every((u) => /[?&]v=/.test(u) || /[.-][0-9a-f]{8,}\.(?:css|m?js)$/.test(u.split('?')[0]));
  console.log(`  ${code.length} CSS/JS references on the home page, ${versioned ? 'all content-hashed: expecting immutable' : 'not all content-hashed: expecting revalidation'}`);
  const img = [...home.body.matchAll(/\ssrc="(\/?assets\/[^"]+\.webp)"/g)].map((m) => m[1])[0];
  const manifest = (/<link rel="manifest" href="([^"]+)"/.exec(home.body) || [])[1];
  const icon = (/<link rel="icon" href="([^"]+\.svg)"/.exec(home.body) || [])[1];
  const files = [
    [code.find((u) => /\.css/.test(u)), /^text\/css/],
    [code.find((u) => /\.m?js/.test(u)), /^(?:text|application)\/javascript/],
    [img, /^image\/webp/],
    [icon, /^image\/svg\+xml/],
    [manifest, /^application\/manifest\+json/],
    ['/assets/search-index.json', /^application\/json/],
    ['/sitemap.xml', /^(?:application|text)\/xml/],
    ['/robots.txt', /^text\/plain/],
  ].filter(([u]) => u);
  check(Boolean(img && manifest && icon), 'home page references a .webp, an .svg icon and a web manifest', `webp ${img}, svg ${icon}, manifest ${manifest}`);
  for (const [u, type] of files) {
    const path = '/' + u.replace(/^\//, '');
    const res = await request(path, { body: false });
    check(res.status === 200, `${path} → 200`, `got ${res.status}`);
    check(type.test(res.headers['content-type'] || ''), `${path}: Content-Type ${type.source.replace(/\\/g, '')}`, `got ${res.headers['content-type']}`);
    const want = cacheExpect(path, versioned);
    check(cacheOk(one(res, 'cache-control'), want), `${path}: Cache-Control ${want}`, `got ${one(res, 'cache-control')}`);
  }

  // ---- compression
  const gz = await request('/', { headers: { 'accept-encoding': 'gzip, br' } });
  check(/^(?:gzip|br)$/.test(gz.headers['content-encoding'] || ''), 'HTML is compressed for clients that accept it', `Content-Encoding ${gz.headers['content-encoding']}`);
  if (!has('no-vary')) check(/accept-encoding/i.test(gz.headers.vary || ''), 'compressed responses send Vary: Accept-Encoding', `Vary ${gz.headers.vary}`);

  // ---- hidden files and the other servers' config files
  // (a host may answer 403 or 404, but never with the file itself)
  const signature = { '/.htaccess': 'RewriteEngine', '/.assetsignore': 'web.config', '/_headers': 'X-Content-Type-Options:', '/_redirects': '/sriswamiji ', '/web.config': '<configuration>' };
  for (const [f, sig] of Object.entries(signature)) {
    const res = await request(f);
    const leaked = res.body.includes(sig) && !res.body.includes(NOT_FOUND_MARK);
    check([403, 404].includes(res.status) && !leaked, `${f} is not served`, `got ${res.status}${leaked ? ' with its contents' : ''}`);
  }
  if (has('fixtures')) {
    const s = await request('/.dp-secret');
    check(s.status === 404 && !s.body.includes('dp-secret-content'), '/.dp-secret (a dotfile) → 404', `got ${s.status}`);
    const g = await request('/.git/config');
    check([403, 404].includes(g.status), '/.git/config → not served', `got ${g.status}`);
    const wk = await request('/.well-known/dp-test.txt');
    check(wk.status === 200 && wk.body.includes('dp-well-known'), '/.well-known/ stays reachable', `got ${wk.status}`);
  }

  // ---- the Peetham's existing platform
  const P = R.legacyPlatform;
  if (SPLIT) {
    await pool(P.paths, 6, (p) => expectRedirect(p, P.status, `${LEGACY.origin}${p}`));
    await pool(P.paths, 6, (p) => expectRedirect(`${p}/a/b?ashram_id=4&x=%20y`, P.status, `${LEGACY.origin}${p}/a/b?ashram_id=4&x=%20y`));
    for (const pre of P.prefixes) await expectRedirect(`${pre}not-a-new-page?x=1`, P.status, `${LEGACY.origin}${pre}not-a-new-page?x=1`);
    for (const legal of ['privacy-policy', 'terms-and-conditions', 'disclaimer']) await expectRedirect(`/page/view/${legal}`, P.status, `${LEGACY.origin}/page/view/${legal}`);
    await expectRedirect('/poojas?ashram_id=4&currency=inr&view=listView', P.status, `${LEGACY.origin}/poojas?ashram_id=4&currency=inr&view=listView`);
  } else {
    await pool(P.paths, 6, async (p) => {
      const res = await request(p, { body: false });
      check(!res.headers.location && res.status === 404, `${p}: no platform redirect on a shared host`, `got ${res.status} ${res.headers.location || ''}`);
    });
    for (const pre of P.prefixes) await expectNotFound(`${pre}not-a-new-page`, `${pre}not-a-new-page → 404 on a shared host`);
    await expectNotFound('/page/view/privacy-policy', '/page/view/privacy-policy → 404 on a shared host');
  }

  // ---- canonical host and HTTPS (needs a server that routes by Host header)
  if (!has('no-canonical') && SITE.protocol === 'https:') {
    const to = (p) => `${SITE.origin}${p}`;
    await expectRedirect('/about.html?x=1', 301, to('/about.html?x=1'), `Host ${ALIAS} → 301 https://${SITE.hostname}`, { host: ALIAS });
    await expectRedirect('/kn/', 301, to('/kn/'), `Host ${ALIAS} /kn/ → 301 https://${SITE.hostname}/kn/`, { host: ALIAS });
    await expectRedirect('/page/view/about-us', 301, to('/page/view/about-us'), `Host ${ALIAS}: host first, then the old-URL redirect`, { host: ALIAS });
    await expectRedirect('/about.html', 301, to('/about.html'), `http://${SITE.hostname} → 301 https://${SITE.hostname}`, { host: SITE.hostname });
    if (has('fixtures')) {
      const acme = await request('/.well-known/acme-challenge/dp-test', { headers: { host: SITE.hostname } });
      check(acme.status === 200 && acme.body.includes('dp-acme'), `http://${SITE.hostname}/.well-known/acme-challenge/ is not redirected (certificates)`, `got ${acme.status} ${acme.headers.location || ''}`);
    }
    if (has('forwarded-proto')) {
      const xf = await request('/about.html', { headers: { host: SITE.hostname, 'x-forwarded-proto': 'https' }, body: false });
      check(xf.status === 200, `X-Forwarded-Proto: https on ${SITE.hostname} → no HTTPS redirect`, `got ${xf.status} ${xf.headers.location || ''}`);
    }
    const off = opt('canonical-off');
    if (off) {
      const [k, v] = off.split(':');
      const res = await request('/about.html', { headers: { host: ALIAS, [k]: v }, body: false });
      check(res.status === 200, `canonical block switched off (${k}: ${v}) → page served`, `got ${res.status} ${res.headers.location || ''}`);
    }
  }

  console.log(`\n${passed + failures.length} checks: ${passed} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
