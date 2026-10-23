#!/usr/bin/env node
// Zero-dependency static site build for the Datta Peetham website.
//
//   node build.mjs            build into ./site
//   node build.mjs --serve    build, serve on http://localhost:4321, rebuild on change
//
// Options (any command):
//   --site-url=https://…      where this site is served      (else DP_SITE_URL, else site.config.json)
//   --legacy-url=https://…    where the existing platform is (else DP_LEGACY_URL, else site.config.json)
//   --out=<dir>               build somewhere other than ./site
//   --production              the build for the live domain: refuses a legacyPlatformUrl on
//                             this site's own host (also DP_PRODUCTION=1; npm run build:production)
//
// Every page module in src/pages exports { slug, file, title, description,
// nav?, image?, preload?, scripts?, render() }. The build wraps each in the
// shared layout, copies assets, writes a search index, sitemap, robots.txt,
// icons and site.webmanifest, versions every CSS/JS/JSON reference by content
// hash, then verifies every internal link and #anchor resolves.

import { readdir, readFile, writeFile, mkdir, cp, rm, stat, rename, copyFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, extname, dirname, resolve, relative, sep, isAbsolute, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const argValue = (name) => { const a = process.argv.find((x) => x.startsWith(name + '=')); return a === undefined ? undefined : a.slice(name.length + 1); };
const OUT = argValue('--out') ? resolve(argValue('--out')) : join(ROOT, 'site');
const PORT = Number(process.env.PORT) || 4321;
// Flags a dev-server rebuild must repeat (it runs in a fresh process).
const FORWARD = process.argv.slice(2).filter((a) => /^--(?:site-url|legacy-url|out)=/.test(a));

const strip = (html) => html
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();

// Responsive images: tools/optimize-images.mjs writes WebP variants of the
// Peetham's S3 photos plus a manifest. Here every <img> (and lightbox source,
// script or stylesheet reference) to a manifest URL is pointed at the local
// copies with srcset, sizes and intrinsic dimensions. Unknown URLs are left on S3.
async function loadImageManifest() {
  try { return JSON.parse(await readFile(join(SRC, 'assets/img/opt/manifest.json'), 'utf8')); } catch { return {}; }
}
const amp = (u) => u.replace(/&amp;/g, '&');
function pick(entry, max = 960) {
  const fit = entry.srcs.filter(([w]) => w <= max);
  return (fit.length ? fit[fit.length - 1] : entry.srcs[0])[1];
}
function optimizeHtml(html, man, prefix = '') {
  if (!Object.keys(man).length) return html;
  const chosen = new Map(); // original URL → the srcset and sizes its first <img> got
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const m = /\ssrc="([^"]+)"/.exec(tag);
    const e = m && man[amp(m[1])];
    if (!e) return tag;
    const lazy = /\sloading="lazy"/.test(tag);
    let out = tag.replace(m[0], ` src="${prefix}${pick(e)}"`);
    if (!/\ssrcset=/.test(out)) out = out.replace(/^<img/, `<img srcset="${e.srcs.map(([w, f]) => `${prefix}${f} ${w}w`).join(', ')}"${/\ssizes=/.test(out) ? '' : ` sizes="${lazy ? 'auto, 100vw' : '100vw'}"`}`);
    if (!/\swidth=/.test(out) && !/\sheight=/.test(out)) out = out.replace(/^<img/, `<img width="${e.w}" height="${e.h}"`);
    const srcset = (/\ssrcset="([^"]*)"/.exec(out) || [])[1];
    if (!chosen.has(amp(m[1])) && srcset) chosen.set(amp(m[1]), { srcset, sizes: (/\ssizes="([^"]*)"/.exec(out) || [])[1] });
    return out;
  });
  // The hero preload must ask for the very file the hero <img> will pick, or
  // a wide screen downloads the image twice: give it the img's own srcset and
  // sizes (imagesrcset / imagesizes); href stays as the fallback.
  html = html.replace(/<link rel="preload" as="image" href="([^"]+)"([^>]*)>/g, (tag, href, rest) => {
    const e = man[amp(href)];
    if (!e) return tag;
    const img = chosen.get(amp(href));
    return `<link rel="preload" as="image" href="${prefix}${pick(e)}"${img ? ` imagesrcset="${img.srcset}"${img.sizes ? ` imagesizes="${img.sizes}"` : ''}` : ''}${rest}>`;
  });
  // lightbox sources, inline style backgrounds and data attributes: largest variant
  // Leave <meta> (og:image) and JSON-LD alone: share previews need absolute JPEG URLs.
  const keep = [];
  html = html.replace(/<meta\b[^>]*>|<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (m) => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  html = html.replace(/(data-full="|url\((?:&quot;|['"])?|data-[a-z-]*(?:img|src|photo|poster|image|bg)="|")(https:\/\/(?:dev-)?dattapeetham\.s3\.amazonaws\.com\/[^"')\s&]+(?:&amp;[^"')\s&]+)*)/g, (all, lead, url) => {
    const e = man[amp(url)];
    if (!e) return all;
    return lead + prefix + (lead.startsWith('data-full') ? e.srcs[e.srcs.length - 1][1] : pick(e));
  });
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
}

// The Peetham's dev bucket is a staging store, and the CSP does not allow it.
// A photo the optimiser holds a copy of is served from this site wherever its
// dev-bucket URL survives (JSON-LD, share tags), as an absolute URL; one with
// no copy stops the build.
const DEV_BUCKET = /https:\/\/dev-dattapeetham\.s3\.amazonaws\.com\/[^"'\s)<>\\]+/g;
function selfHostDevBucket(html, man, origin, file) {
  return html.replace(DEV_BUCKET, (u) => {
    const e = man[amp(u)];
    if (e) return `${origin}/${e.srcs[e.srcs.length - 1][1]}`;
    console.error(`✗ ${file}: ${u} is on the dev bucket, which the CSP blocks, and has no self-hosted copy: run npm run images`);
    process.exitCode = 1;
    return u;
  });
}
// Helpers from src/layout.mjs and facts about this build, set by build().
let LAYOUT = {};

// ---------- translations ----------
async function loadDicts(langs) {
  const dicts = {};
  for (const l of langs) {
    dicts[l.code] = {};
    const dir = join(SRC, 'i18n', l.code);
    for (const f of (await readdir(dir).catch(() => [])).filter((x) => x.endsWith('.json')).sort()) {
      try { Object.assign(dicts[l.code], JSON.parse(await readFile(join(dir, f), 'utf8'))); }
      catch (e) { console.error(`✗ src/i18n/${l.code}/${f}: ${e.message}`); process.exitCode = 1; }
    }
  }
  return dicts;
}

// Point a page at its language: switcher links, asset paths, scripts, fonts.
function localizePage(html, page, lang, langs) {
  const sub = lang.code !== 'en';
  let out = html.replace(/href="@@lang:(\w+)"/g, (_, c) => {
    const to = c === 'en' ? '' : c + '/';
    return `href="${sub ? '../' : ''}${to}${page.file}"`;
  });
  out = out.replace(/(<span class="lang-current"[^>]*>)EN(<\/span>)/, `$1${lang.code.toUpperCase()}$2`);
  out = out.replace(/(<a [^>]*data-lang="(\w+)"[^>]*)>/g, (all, a, c) => c === lang.code ? `${a} aria-current="true">` : all);
  if (!sub) return out;
  out = out.replace('<html lang="en" data-root="">', `<html lang="${lang.code}" data-root="../">`);
  // assets live at the site root
  out = out.replace(/((?:src|href|data-full|poster|content)=")assets\//g, '$1../assets/');
  out = out.replace(/(srcset=")([^"]+)"/g, (all, a, v) => a + v.replace(/(^|,\s*)assets\//g, '$1../assets/') + '"');
  out = out.replace(/url\((['"]?)assets\//g, 'url($1../assets/');
  out = out.replace(/(<script src=")\.\.\/assets\/js\//g, `$1../assets/js-${lang.code}/`);
  // root files: the web manifest
  out = out.replace(/(\shref=")(site\.webmanifest")/g, '$1../$2');
  // canonical, og:url and og:locale for this language
  out = out.replace(/(<link rel="canonical" href="https:\/\/[^"/]+\/)/, `$1${lang.code}/`);
  out = out.replace(/(<meta property="og:url" content="https:\/\/[^"/]+\/)/, `$1${lang.code}/`);
  out = out.replace(/<meta property="og:locale" content="[^"]*">(?:\n<meta property="og:locale:alternate" content="[^"]*">)*/, LAYOUT.ogLocaleTags(lang.code));
  // script fonts for this language
  const fam = lang.fonts.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600`).join('&');
  out = out.replace('<link rel="stylesheet" href="../assets/css/site.css">', `<link href="https://fonts.googleapis.com/css2?${fam}&display=swap" rel="stylesheet">\n<link rel="stylesheet" href="../assets/css/site.css">`);
  out = out.replace('<p class="i18n-note" data-i18n-note hidden>', '<p class="i18n-note" data-i18n-note>');
  return out;
}

// JSON-LD on a language page (it is skipped by the translator): links to this
// site's pages point at this language's versions, the breadcrumb carries the
// translated labels the page itself shows, and names and descriptions use the
// page's own reviewed translations (a string with none stays English). The
// organisation's name and its home URL stay as they are.
function localizeJsonLd(html, page, lang, dict, origin, check) {
  const pageUrl = new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([a-z0-9-]+\\.html)(#[\\w-]*)?$`);
  const files = LAYOUT.pageFiles;
  const toLang = (v) => v.replace(pageUrl, (all, f, h = '') => files.has(f) ? `${origin}/${lang.code}/${f}${h}` : all);
  const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const tr = (s) => {
    for (const k of [s, s.replace(/&/g, '&amp;')]) {
      const t = dict[k];
      if (t !== undefined && !check(k, t, lang)) return decode(t);
    }
    return s;
  };
  const crumbs = /<nav class="crumbs"[^>]*>\s*<a [^>]*>([^<]+)<\/a>[\s\S]*?<span aria-current="page">([^<]+)<\/span>/.exec(html);
  const walk = (v, key, parent) => {
    if (Array.isArray(v)) return v.map((x) => walk(x, key, parent));
    if (v && typeof v === 'object') {
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = walk(x, k, v);
      return o;
    }
    if (typeof v !== 'string') return v;
    if (key === 'url' || key === 'item' || key === '@id') {
      if (key === 'item' && v === `${origin}/`) return `${origin}/${lang.code}/`;
      return toLang(v);
    }
    if ((key === 'name' || key === 'description') && v !== LAYOUT.siteName && !/Organization/.test([].concat(parent['@type'] || '').join())) return tr(v);
    return v;
  };
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (all, json) => {
    let o = walk(JSON.parse(json));
    if (o['@type'] === 'BreadcrumbList' && crumbs) {
      const names = [decode(crumbs[1]).trim(), decode(crumbs[2]).trim()];
      o = { ...o, itemListElement: o.itemListElement.map((it, i) => (names[i] ? { ...it, name: names[i] } : it)) };
    }
    return `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
  });
}

// The 404 pages are served for unknown URLs at any depth (old links such as
// /ashrams/.../events/2016/...), so their links and assets must be
// root-absolute. nginx, Apache, IIS and the preview always serve /404.html;
// Cloudflare serves the nearest folder's 404.html, so /kn/a/b gets
// /kn/404.html. `dir` is the page's own folder ('/' or '/kn/'): relative
// references are resolved against it, and body[data-base] tells site.js where
// the page's search results live.
export function rootAbsolute(html, dir = '/') {
  const abs = (u) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(u)) return u;
    const folders = dir.split('/').filter(Boolean);
    let rest = u;
    for (;;) {
      if (rest.startsWith('./')) rest = rest.slice(2);
      else if (rest.startsWith('../')) { folders.pop(); rest = rest.slice(3); } else break;
    }
    return `/${folders.map((f) => `${f}/`).join('')}${rest}`;
  };
  return html
    .replace(/(\s(?:src|href|poster|data-full)=")([^"]*)"/g, (all, a, u) => `${a}${abs(u)}"`)
    .replace(/(\ssrcset=")([^"]+)"/g, (all, a, v) => a + v.split(/,\s*/).map((c) => abs(c.trim())).join(', ') + '"')
    // assets live at the site root, whichever folder the page is in
    .replace(/url\((['"]?|&quot;)(?:\.\.\/)*assets\//g, 'url($1/assets/')
    .replace(/<body class="([^"]*)"/, `<body class="$1" data-base="${dir}"`);
}

async function load(rel, bust) {
  return import(pathToFileURL(join(SRC, rel)).href + `?v=${bust}`);
}

function indexPage(page, body) {
  const entries = [{ t: page.title, s: '', u: page.file, x: strip(body).slice(0, 220) }];
  const re = /<section\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)(?=<section\b|$)/g;
  let m;
  while ((m = re.exec(body))) {
    const heading = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/.exec(m[2]);
    const text = strip(m[2]);
    if (!heading || !text) continue;
    entries.push({ t: page.title, s: strip(heading[1]), u: `${page.file}#${m[1]}`, x: text.slice(0, 600) });
  }
  return entries;
}

async function listFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p))); else out.push(p);
  }
  return out;
}

// `rootFiles`: non-page files at the site root (site.webmanifest, favicon.ico …)
function checkLinks(pages, rootFiles = new Set()) {
  const ids = new Map(pages.map((p) => [p.file, new Set([...p.html.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]))]));
  const problems = [];
  for (const p of pages) {
    const seen = new Set();
    for (const [, id] of p.html.matchAll(/\sid="([^"]+)"/g)) {
      if (seen.has(id)) problems.push(`${p.file}: duplicate id "${id}"`);
      seen.add(id);
    }
  }
  for (const p of pages) {
    for (const [, href] of p.html.matchAll(/\shref="([^"]+)"/g)) {
      const rel = href.replace(/^\//, '');
      if (/^(https?:|mailto:|tel:|data:)/.test(href) || rel.startsWith('assets/') || /^(kn|hi|ta|te)\//.test(rel)) continue;
      const [fileQ, hash] = rel.split('#');
      const file = fileQ.split('?')[0];
      if (file && !file.endsWith('.html')) {
        if (!rootFiles.has(file)) problems.push(`${p.file}: link to missing file "${href}"`);
        continue;
      }
      const target = file || p.file;
      if (!ids.has(target)) { problems.push(`${p.file}: link to missing page "${href}"`); continue; }
      if (hash && !ids.get(target).has(hash)) problems.push(`${p.file}: link to missing anchor "${href}"`);
    }
  }
  return [...new Set(problems)];
}

// ---------- addresses ----------
export function printAddresses(config) {
  const src = (k) => config.sources[k] === 'site.config.json' ? 'site.config.json' : `from ${config.sources[k]}`;
  console.log(`Site address:     ${config.siteUrl}  (${src('siteUrl')})`);
  console.log(`Legacy platform:  ${config.legacyPlatformUrl}  (${src('legacyPlatformUrl')})`);
  const bar = '!'.repeat(78);
  if (config.sameHost) {
    console.warn(`${bar}
WARNING: legacyPlatformUrl has the same host as siteUrl (${new URL(config.siteUrl).host}).
  Booking, donation, sign-in, store and source links will point at this site
  itself — set legacyPlatformUrl before the site takes over the domain, see
  docs/handover/DOMAIN-CUTOVER.md
  (edit site.config.json, or build with --legacy-url=https://… / DP_LEGACY_URL)
${bar}`);
  } else if (config.siblingHost) {
    console.warn(`NOTE: ${new URL(config.legacyPlatformUrl).host} and ${new URL(config.siteUrl).host} differ only by "www.".
  If one redirects to the other, platform links will land on this site; make sure
  ${config.legacyPlatformUrl} serves the existing platform itself.`);
  }
}

// `--production` (or DP_PRODUCTION=1): the build that goes live on the
// domain. It refuses addresses that would send bookings, donations, sign-in
// and the store back to this site: the same host, or a host that differs only
// by "www." (the generated server configs redirect that name to siteUrl).
export function assertProduction(config, { argv = process.argv, env = process.env } = {}) {
  if (!argv.includes('--production') && env.DP_PRODUCTION !== '1') return;
  if (!config.sameHost && !config.siblingHost) return;
  throw Object.assign(new Error(`--production: legacyPlatformUrl (${config.legacyPlatformUrl}) ${config.sameHost ? 'is this site\'s own host' : 'differs from siteUrl only by "www."'}.
  Move the existing platform to its own host first and set legacyPlatformUrl in
  site.config.json; see docs/handover/DOMAIN-CUTOVER.md`), { name: 'ConfigError' });
}

// Refuse output folders a swap would destroy: the project or anything above
// it, the sources, or a non-empty folder that is not a previous build.
async function assertSafeOut() {
  const fail = (msg) => Object.assign(new Error(msg), { name: 'ConfigError' });
  if (process.argv.includes('--out')) throw fail('write the output folder as --out=<dir>');
  const inside = (child, parent) => { const r = relative(parent, child); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
  if (inside(ROOT, OUT)) throw fail(`--out=${OUT} would replace the project folder (or a folder containing it)`);
  if (inside(OUT, SRC)) throw fail(`--out=${OUT} is inside src/, which the dev server watches`);
  const entries = await readdir(OUT).catch(() => null);
  if (entries && entries.length && !entries.includes('index.html')) throw fail(`--out=${OUT} is not empty and holds no previous build (no index.html); refusing to replace it`);
}

// ---------- cache-busting ----------
// Every local .css/.js/.json the HTML references gets ?v=<first 8 hex chars of
// the file's SHA-256>, so the server can cache /assets/ for a long time and a
// changed file still reaches visitors at once. Unchanged files keep their
// version, so a rebuild only moves the hashes of files that changed.
const VERSIONED = /\.(?:css|js|json)$/;
const hash8 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 8);

// The search index is fetched by site.js at runtime, so its version cannot be
// in the HTML's script tag. Each page carries it as <body data-search-v>, and
// the build points the fetch at it: the literal 'assets/search-index….json'
// becomes ('assets/search-index….json?v=' + <that attribute>). Keeping the
// version out of site.js means site.js's own hash only changes with its code.
const SEARCH_LITERAL = /(['"])((?:\.\.\/)?assets\/search-index(?:\.[a-z]{2})?\.json)\1/g;
const searchFetch = (q, path) => `(${q}${path}?v=${q} + (document.body && document.body.getAttribute('data-search-v') || ''))`;

async function versionAssets(TMP, htmlFiles, LANGS) {
  // 1. runtime fetches in JS (en + every js-<lang> copy)
  for (const f of await listFiles(join(TMP, 'assets'))) {
    if (!f.endsWith('.js') || f.includes(`${sep}vendor${sep}`)) continue;
    const code = await readFile(f, 'utf8');
    const out = code.replace(SEARCH_LITERAL, (all, q, path) => searchFetch(q, path));
    if (out !== code) await writeFile(f, out);
  }
  // 2. content hashes of everything versionable
  const hashes = new Map();
  for (const f of await listFiles(join(TMP, 'assets'))) {
    if (VERSIONED.test(f)) hashes.set(relative(TMP, f).split(sep).join('/'), hash8(await readFile(f)));
  }
  // 3. every src/href in every page, resolved against the page's folder
  //    (root-absolute on the 404); plus the page's search-index version
  const codes = new Set(LANGS.map((l) => l.code));
  const out = new Map();
  for (const rel of htmlFiles) {
    const dir = posix.dirname(rel) === '.' ? '' : posix.dirname(rel);
    let html = await readFile(join(TMP, rel), 'utf8');
    html = html.replace(/(\s(?:src|href)=")([^"]+)"/g, (all, attr, url) => {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return all;
      const [pathQ, frag] = url.split('#');
      const [path, query] = pathQ.split('?');
      if (!VERSIONED.test(path) || (query && /(?:^|&)v=/.test(query))) return all;
      const target = path.startsWith('/') ? path.slice(1) : posix.normalize(posix.join(dir, path));
      const h = hashes.get(target);
      if (!h) return all;
      return `${attr}${path}?${query ? query + '&' : ''}v=${h}${frag !== undefined ? '#' + frag : ''}"`;
    });
    const lang = codes.has(dir) ? dir : 'en';
    const idx = lang === 'en' ? 'assets/search-index.json' : `assets/search-index.${lang}.json`;
    if (hashes.has(idx)) html = html.replace(/<body\b([^>]*)>/, (m, attrs) => /\sdata-search-v=/.test(attrs) ? m : `<body${attrs} data-search-v="${hashes.get(idx)}">`);
    await writeFile(join(TMP, rel), html);
    out.set(rel, html);
  }
  return out;
}

// ---------- icons and web manifest ----------
// tools/make-icons.mjs renders src/assets/img/icons/ from favicon.svg (run it
// once, commit the PNGs/ICO); the build copies them with the other assets,
// puts favicon.ico at the root (browsers ask for /favicon.ico blindly) and
// writes site.webmanifest with colours from the design tokens in site.css.
const ICONS = 'assets/img/icons';
async function writeIconsAndManifest(TMP, site) {
  const missing = [];
  for (const f of ['favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
    if (!(await stat(join(TMP, ICONS, f)).catch(() => null))) missing.push(f);
  }
  if (missing.length) {
    console.error(`✗ ${ICONS}/ is missing ${missing.join(', ')}: run node tools/make-icons.mjs`);
    process.exitCode = 1;
  } else {
    await copyFile(join(TMP, ICONS, 'favicon.ico'), join(TMP, 'favicon.ico'));
  }
  const css = await readFile(join(TMP, 'assets/css/site.css'), 'utf8').catch(() => '');
  const token = (name, fallback) => (new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\b`).exec(css) || [, fallback])[1];
  const manifest = {
    name: site.name,
    short_name: site.shortName,
    description: site.tagline,
    lang: 'en',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    // A website, not an app: no offline mode, and bookings, donations and
    // sign-in open on the existing platform's own host.
    display: 'browser',
    theme_color: token('forest', '#0f1c18'),
    background_color: token('ivory', '#f8f3e9'),
    icons: [
      { src: `${ICONS}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${ICONS}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${ICONS}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'assets/img/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
  await writeFile(join(TMP, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
}

// ---------- server configs (tools/server-configs.mjs, optional) ----------
// Writes .htaccess, _headers, _redirects, web.config and .assetsignore into
// the site, for the addresses this build uses. The project-level files
// (deploy/nginx/dattapeetham.conf, deploy/cloudflare/wrangler.jsonc,
// vercel.json) describe ./site, so they follow the same addresses whenever
// the build writes ./site; a build into another folder (--out=…) leaves them
// alone.
async function serverConfigs(TMP, config, pages) {
  const mod = join(ROOT, 'tools', 'server-configs.mjs');
  if (!(await stat(mod).catch(() => null))) return;
  try {
    const { writeServerConfigs } = await import(pathToFileURL(mod).href);
    if (typeof writeServerConfigs !== 'function') throw new Error('does not export writeServerConfigs()');
    const projectFiles = OUT === join(ROOT, 'site');
    const { model, changed, warnings } = await writeServerConfigs({ siteDir: TMP, siteUrl: config.siteUrl, legacyUrl: config.legacyPlatformUrl, pages, projectFiles });
    const own = (f) => relative(ROOT, f).split(sep).join('/');
    const project = projectFiles
      ? (changed.filter((f) => !f.startsWith(TMP)).map(own).join(', ') || 'unchanged') : 'left unchanged (--out build)';
    const platform = model.platform
      ? `${model.platform.paths.length + model.platform.prefixes.length} platform rules → ${model.platform.origin}`
      : 'no platform redirects (same host)';
    console.log(`Server configs v${model.version}: .htaccess, _headers, _redirects, web.config in the site; ${platform}; CSS/JS ${model.versioning.versioned ? 'immutable' : 'revalidated'}`);
    console.log(`  project files (nginx, Cloudflare, vercel.json): ${project}`);
    for (const w of warnings.filter((x) => !/left unchanged/.test(x))) console.warn(`  ! ${w}`);
  } catch (e) {
    console.error(`✗ tools/server-configs.mjs: ${e.stack || e.message}`);
    process.exitCode = 1;
  }
}

// The temp folder of a build in progress, so a failed build can remove it.
let pendingTmp = null;

export async function build() {
  const t0 = performance.now();
  const bust = Date.now();
  const layoutModule = await load('layout.mjs', bust);
  const { layout } = layoutModule;
  const { site, config } = await load('site.mjs', bust);
  printAddresses(config);
  assertProduction(config);
  await assertSafeOut();
  const files = (await readdir(join(SRC, 'pages'))).filter((f) => f.endsWith('.mjs')).sort();
  const imgMan = await loadImageManifest();

  // Build into a private temp dir beside the output, then swap it in, so a
  // running dev server (or a parallel build) never serves a half-written site.
  const TMP = join(dirname(OUT), `.site-tmp-${process.pid}-${bust}`);
  pendingTmp = TMP; // removed if the build fails (a full disk left ~170 MB each time)
  await mkdir(TMP, { recursive: true });
  // Everything in src/assets except build-only files: the image optimiser's
  // manifest (read above, never fetched by a page), dotfiles, and the
  // half-written files of a photo run still in progress (name.webp.tmp-<pid>).
  const ASSETS = join(SRC, 'assets');
  const DEV_ONLY = new Set(['img/opt/manifest.json']);
  await cp(ASSETS, join(TMP, 'assets'), { recursive: true, filter: (from) => {
    const rel = relative(ASSETS, from).split(sep).join('/');
    return !DEV_ONLY.has(rel) && !/(?:^|\/)\./.test(rel) && !/\.(?:tmp|part)(?:-\d+)?$/i.test(rel);
  } });
  await writeIconsAndManifest(TMP, site);

  for (const dir of ['js', 'css']) {
    for (const rel of await listFiles(join(TMP, 'assets', dir))) {
      const text = await readFile(rel, 'utf8');
      if (!/dattapeetham\.s3\.amazonaws\.com/.test(text)) continue;
      // CSS urls resolve against the stylesheet; JS strings against the page
      const depth = dir === 'css' ? relative(join(TMP, 'assets'), rel).split(sep).length : 0;
      const prefix = dir === 'css' ? '../'.repeat(depth) : '';
      const out = text.replace(/https:\/\/(?:dev-)?dattapeetham\.s3\.amazonaws\.com\/[^"'`)\s]+?\.(?:jpe?g|png|webp|gif)/gi, (u) => imgMan[u] ? prefix + pick(imgMan[u]) : u);
      await writeFile(rel, out);
    }
  }

  const pages = [];
  const search = [];
  for (const f of files) {
    let page;
    try { page = (await load(`pages/${f}`, bust)).default; } catch (e) { console.error(`✗ src/pages/${f}: ${e.message}`); process.exitCode = 1; continue; }
    if (!page?.file || typeof page.render !== 'function') throw new Error(`src/pages/${f}: default export needs { file, render }`);
    let body;
    try { body = await page.render(); } catch (e) { console.error(`✗ ${page.file}: render failed — ${e.stack}`); process.exitCode = 1; continue; }
    const html = selfHostDevBucket(optimizeHtml(layout(page, body), imgMan), imgMan, site.origin, page.file);
    await writeFile(join(TMP, page.file), html);
    pages.push({ ...page, html });
    if (page.slug !== '404') search.push(...indexPage(page, body));
  }

  await writeFile(join(TMP, 'assets', 'search-index.json'), JSON.stringify(search));

  // ---- other languages: /kn/, /hi/, /ta/, /te/ ----
  const { LANGS, translate, extract, extractJs, translateJs, checkTranslation } = await load('i18n/engine.mjs', bust);
  LAYOUT = { ogLocaleTags: layoutModule.ogLocaleTags, siteName: site.name, pageFiles: new Set(pages.map((p) => p.file)) };
  const others = LANGS.filter((l) => l.code !== 'en');
  const dicts = await loadDicts(others);
  const jsFiles = await listFiles(join(TMP, 'assets', 'js'));
  const report = {};
  const htmlFiles = []; // every page written, relative to the site root
  for (const p of pages) p.htmlLocal = localizePage(p.html, p, LANGS[0], LANGS);
  for (const lang of others) {
    const dict = dicts[lang.code];
    // page scripts with their UI strings translated
    for (const f of jsFiles) {
      const rel = f.slice(join(TMP, 'assets', 'js').length + 1);
      const dest = join(TMP, 'assets', `js-${lang.code}`, rel);
      await mkdir(dirname(dest), { recursive: true });
      let code = translateJs(await readFile(f, 'utf8'), dict, lang);
      code = code.replace(/(['"])assets\/search-index\.json\1/g, `$1../assets/search-index.${lang.code}.json$1`)
        .replace(/(['"`])assets\//g, '$1../assets/');
      await writeFile(dest, code);
    }
    await mkdir(join(TMP, lang.code), { recursive: true });
    const lsearch = [];
    const stats = { total: 0, hit: 0, missing: new Set(), rejected: [] };
    for (const p of pages) {
      const r = translate(p.html, dict, lang);
      stats.total += r.total; stats.hit += r.hit; r.missing.forEach((m) => stats.missing.add(m)); stats.rejected.push(...r.rejected);
      let html = localizeJsonLd(localizePage(r.html, p, lang, LANGS), p, lang, dict, site.origin, checkTranslation);
      if (p.slug === '404') html = rootAbsolute(html, `/${lang.code}/`);
      await writeFile(join(TMP, lang.code, p.file), html);
      htmlFiles.push(`${lang.code}/${p.file}`);
      if (p.slug !== '404') {
        const body = (/<main id="main">([\s\S]*)<\/main>/.exec(r.html) || [, ''])[1];
        // the <title> text is HTML ('கோயில்கள் &amp; தரிசனம்'): decode it like the rest of the index
        const t = strip((/<title>([^<]*)<\/title>/.exec(r.html) || [, p.title])[1].split(' · ')[0]);
        lsearch.push(...indexPage({ ...p, title: t }, body));
      }
    }
    await writeFile(join(TMP, 'assets', `search-index.${lang.code}.json`), JSON.stringify(lsearch));
    report[lang.code] = { coverage: stats.total ? +(stats.hit / stats.total * 100).toFixed(1) : 0, missing: stats.missing.size, rejected: stats.rejected.length };
    await mkdir(join(ROOT, '.cache', 'i18n'), { recursive: true });
    await writeFile(join(ROOT, '.cache', 'i18n', `report-${lang.code}.json`), JSON.stringify({ missing: [...stats.missing], rejected: stats.rejected }, null, 1));
  }
  for (const p of pages) {
    p.html = p.slug === '404' ? rootAbsolute(p.htmlLocal) : p.htmlLocal;
    await writeFile(join(TMP, p.file), p.html);
  }
  htmlFiles.unshift(...pages.map((p) => p.file));

  // `node build.mjs --extract`: every English segment, for the translators
  if (process.argv.includes('--extract')) {
    const all = new Map();
    for (const p of pages) for (const [k] of extract(p.html)) { if (!all.has(k)) all.set(k, new Set()); all.get(k).add(p.file); }
    for (const f of jsFiles) for (const k of extractJs(await readFile(f, 'utf8'))) { if (!all.has(k)) all.set(k, new Set()); all.get(k).add('js:' + relative(join(TMP, 'assets', 'js'), f).split(sep).join('/')); }
    const list = [...all].map(([k, pg]) => ({ k, pages: [...pg] }));
    await mkdir(join(SRC, 'i18n'), { recursive: true });
    await writeFile(join(SRC, 'i18n', 'segments.json'), JSON.stringify(list, null, 1));
    console.log(`Extracted ${list.length} segments → src/i18n/segments.json`);
  }
  const LCODES = ['en', 'kn', 'hi', 'ta', 'te'];
  const urlFor = (code, p) => `${site.origin}/${code === 'en' ? '' : code + '/'}${p.slug === 'index' ? '' : p.file}`;
  await writeFile(join(TMP, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.filter((p) => p.slug !== '404').flatMap((p) => LCODES.map((c) => `  <url><loc>${urlFor(c, p)}</loc>${LCODES.map((h) => `<xhtml:link rel="alternate" hreflang="${h}" href="${urlFor(h, p)}"/>`).join('')}</url>`)).join('\n')}
</urlset>
`);
  await writeFile(join(TMP, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);

  // Last: version asset references (needs every file final), then let the
  // deployment tooling add its server files to the finished site.
  const versioned = await versionAssets(TMP, htmlFiles, LANGS);
  for (const p of pages) p.html = versioned.get(p.file) ?? p.html;
  const rootFiles = new Set((await readdir(TMP, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name));
  await serverConfigs(TMP, config, htmlFiles);

  const OLD = `${OUT}-old-${process.pid}-${bust}`;
  await rename(OUT, OLD).catch(() => {});
  await rename(TMP, OUT).catch(async () => { await cp(TMP, OUT, { recursive: true }); await rm(TMP, { recursive: true, force: true }); });
  pendingTmp = null;
  await rm(OLD, { recursive: true, force: true });

  const problems = checkLinks(pages, rootFiles);
  const ms = Math.round(performance.now() - t0);
  console.log(`Built ${pages.length} pages × 5 languages, ${search.length} search entries in ${ms} ms → ${OUT}`);
  console.log('Translation coverage: ' + Object.entries(report).map(([c, r]) => `${c} ${r.coverage}% (${r.missing} missing, ${r.rejected} rejected)`).join(' · '));
  if (problems.length) {
    console.error(`\n${problems.length} link/id problem(s):\n  ` + problems.join('\n  '));
    process.exitCode = 1;
  }
  return problems;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };

// Development server only: nothing here is written into the site.

function serve() {
  createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    let file = join(OUT, path);
    if (file !== OUT && !file.startsWith(OUT + sep)) { res.writeHead(403).end(); return; }
    // like production: /about → 301 /about.html
    if (!extname(path) && !(await stat(file).catch(() => null)) && (await stat(file + '.html').catch(() => null))) {
      res.writeHead(301, { location: path + '.html' + new URL(req.url, 'http://x').search }).end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(await readFile(join(OUT, '404.html')).catch(() => 'Not found'));
    }
  }).listen(PORT, () => console.log(`Serving http://localhost:${PORT}  (Ctrl+C to stop)`));

  // Rebuild in a fresh Node process: ESM caches every imported module, so an
  // in-process rebuild would keep stale copies of components, data and features.
  let timer, running = false, again = false;
  const rebuild = () => {
    if (running) { again = true; return; }
    running = true;
    spawn(process.execPath, [fileURLToPath(import.meta.url), ...FORWARD], { stdio: 'inherit' }).on('exit', () => {
      running = false;
      if (again) { again = false; rebuild(); }
    });
  };
  const later = () => { clearTimeout(timer); timer = setTimeout(rebuild, 150); };
  watch(SRC, { recursive: true }, later);
  try { watch(join(ROOT, 'site.config.json'), later); } catch { /* no config file: flags or env give the addresses */ }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  build().then(() => { if (process.argv.includes('--serve')) serve(); }).catch(async (e) => {
    // a wrong address or --out is a usage problem, not a crash: no stack trace
    console.error(e && e.name === 'ConfigError' ? `✗ ${e.message}` : e);
    if (pendingTmp) await rm(pendingTmp, { recursive: true, force: true }).catch(() => {});
    process.exit(1);
  });
}
