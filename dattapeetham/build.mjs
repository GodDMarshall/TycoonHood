#!/usr/bin/env node
// Zero-dependency static site build for the Datta Peetham website.
//
//   node build.mjs            build into ./site
//   node build.mjs --serve    build, serve on http://localhost:4321, rebuild on change
//
// Every page module in src/pages exports { slug, file, title, description,
// nav?, image?, preload?, scripts?, render() }. The build wraps each in the
// shared layout, copies assets, writes a search index, sitemap and robots.txt,
// then verifies every internal link and #anchor resolves.

import { readdir, readFile, writeFile, mkdir, cp, rm, stat, rename } from 'node:fs/promises';
import { watch } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'site');
const PORT = Number(process.env.PORT) || 4321;

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
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const m = /\ssrc="([^"]+)"/.exec(tag);
    const e = m && man[amp(m[1])];
    if (!e) return tag;
    const lazy = /\sloading="lazy"/.test(tag);
    let out = tag.replace(m[0], ` src="${prefix}${pick(e)}"`);
    if (!/\ssrcset=/.test(out)) out = out.replace(/^<img/, `<img srcset="${e.srcs.map(([w, f]) => `${prefix}${f} ${w}w`).join(', ')}"${/\ssizes=/.test(out) ? '' : ` sizes="${lazy ? 'auto, 100vw' : '100vw'}"`}`);
    if (!/\swidth=/.test(out) && !/\sheight=/.test(out)) out = out.replace(/^<img/, `<img width="${e.w}" height="${e.h}"`);
    return out;
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
  // canonical and og:url for this language
  out = out.replace(/(<link rel="canonical" href="https:\/\/[^"/]+\/)/, `$1${lang.code}/`);
  // script fonts for this language
  const fam = lang.fonts.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600`).join('&');
  out = out.replace('<link rel="stylesheet" href="../assets/css/site.css">', `<link href="https://fonts.googleapis.com/css2?${fam}&display=swap" rel="stylesheet">\n<link rel="stylesheet" href="../assets/css/site.css">`);
  out = out.replace('<p class="i18n-note" data-i18n-note hidden>', '<p class="i18n-note" data-i18n-note>');
  return out;
}

// The 404 page is served for unknown URLs at any depth (old links such as
// /ashrams/.../events/2016/...), so its links and assets must be root-absolute.
function rootAbsolute(html) {
  const abs = (u) => (/^(?:[a-z]+:|#|\/)/i.test(u) ? u : '/' + u);
  return html
    .replace(/(\s(?:src|href|poster|data-full)=")([^"]*)"/g, (all, a, u) => `${a}${abs(u)}"`)
    .replace(/(\ssrcset=")([^"]+)"/g, (all, a, v) => a + v.split(/,\s*/).map((c) => abs(c.trim())).join(', ') + '"')
    .replace(/url\((['"]?|&quot;)assets\//g, 'url($1/assets/')
    .replace(/<body class="([^"]*)"/, '<body class="$1" data-base="/"');
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

function checkLinks(pages) {
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
      const [file, hash] = rel.split('#');
      const target = file || p.file;
      if (!ids.has(target)) { problems.push(`${p.file}: link to missing page "${href}"`); continue; }
      if (hash && !ids.get(target).has(hash)) problems.push(`${p.file}: link to missing anchor "${href}"`);
    }
  }
  return [...new Set(problems)];
}

export async function build() {
  const t0 = performance.now();
  const bust = Date.now();
  const { layout } = await load('layout.mjs', bust);
  const { site } = await load('site.mjs', bust);
  const files = (await readdir(join(SRC, 'pages'))).filter((f) => f.endsWith('.mjs')).sort();
  const imgMan = await loadImageManifest();

  // Build into a private temp dir, then swap it in, so a running dev server
  // (or a parallel build) never serves a half-written site.
  const TMP = join(ROOT, `.site-tmp-${process.pid}-${bust}`);
  await mkdir(TMP, { recursive: true });
  await cp(join(SRC, 'assets'), join(TMP, 'assets'), { recursive: true });

  for (const dir of ['js', 'css']) {
    for (const rel of await listFiles(join(TMP, 'assets', dir))) {
      const text = await readFile(rel, 'utf8');
      if (!/dattapeetham\.s3\.amazonaws\.com/.test(text)) continue;
      // CSS urls resolve against the stylesheet; JS strings against the page
      const depth = dir === 'css' ? rel.slice(join(TMP, 'assets').length + 1).split('/').length : 0;
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
    const html = optimizeHtml(layout(page, body), imgMan);
    await writeFile(join(TMP, page.file), html);
    pages.push({ ...page, html });
    if (page.slug !== '404') search.push(...indexPage(page, body));
  }

  await writeFile(join(TMP, 'assets', 'search-index.json'), JSON.stringify(search));

  // ---- other languages: /kn/, /hi/, /ta/, /te/ ----
  const { LANGS, translate, extract, extractJs, translateJs } = await load('i18n/engine.mjs', bust);
  const others = LANGS.filter((l) => l.code !== 'en');
  const dicts = await loadDicts(others);
  const jsFiles = await listFiles(join(TMP, 'assets', 'js'));
  const report = {};
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
      const html = localizePage(r.html, p, lang, LANGS);
      await writeFile(join(TMP, lang.code, p.file), html);
      if (p.slug !== '404') {
        const body = (/<main id="main">([\s\S]*)<\/main>/.exec(r.html) || [, ''])[1];
        const t = (/<title>([^<]*)<\/title>/.exec(r.html) || [, p.title])[1].split(' · ')[0];
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

  // `node build.mjs --extract`: every English segment, for the translators
  if (process.argv.includes('--extract')) {
    const all = new Map();
    for (const p of pages) for (const [k] of extract(p.html)) { if (!all.has(k)) all.set(k, new Set()); all.get(k).add(p.file); }
    for (const f of jsFiles) for (const k of extractJs(await readFile(f, 'utf8'))) { if (!all.has(k)) all.set(k, new Set()); all.get(k).add('js:' + f.split('/assets/js/')[1]); }
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

  const OLD = `${OUT}-old-${process.pid}-${bust}`;
  await rename(OUT, OLD).catch(() => {});
  await rename(TMP, OUT).catch(async () => { await cp(TMP, OUT, { recursive: true }); await rm(TMP, { recursive: true, force: true }); });
  await rm(OLD, { recursive: true, force: true });

  const problems = checkLinks(pages);
  const ms = Math.round(performance.now() - t0);
  console.log(`Built ${pages.length} pages × 5 languages, ${search.length} search entries in ${ms} ms → ${OUT}`);
  console.log('Translation coverage: ' + Object.entries(report).map(([c, r]) => `${c} ${r.coverage}% (${r.missing} missing, ${r.rejected} rejected)`).join(' · '));
  if (problems.length) {
    console.error(`\n${problems.length} link/id problem(s):\n  ` + problems.join('\n  '));
    process.exitCode = 1;
  }
  return problems;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };

function serve() {
  createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    let file = join(OUT, path);
    if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
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
    spawn(process.execPath, [fileURLToPath(import.meta.url)], { stdio: 'inherit' }).on('exit', () => {
      running = false;
      if (again) { again = false; rebuild(); }
    });
  };
  watch(SRC, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 150); });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  build().then(() => { if (process.argv.includes('--serve')) serve(); }).catch((e) => { console.error(e); process.exit(1); });
}
