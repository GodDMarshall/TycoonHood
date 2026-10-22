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
    if (!/\ssrcset=/.test(out)) out = out.replace(/^<img/, `<img srcset="${e.srcs.map(([w, f]) => `${prefix}${f} ${w}w`).join(', ')}" sizes="${lazy ? 'auto, 100vw' : '100vw'}"`);
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
      if (/^(https?:|mailto:|tel:|data:)/.test(href) || href.startsWith('assets/')) continue;
      const [file, hash] = href.split('#');
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
  await writeFile(join(TMP, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.filter((p) => p.slug !== '404').map((p) => `  <url><loc>${site.origin}/${p.slug === 'index' ? '' : p.file}</loc></url>`).join('\n')}
</urlset>
`);
  await writeFile(join(TMP, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);

  const OLD = `${OUT}-old-${process.pid}-${bust}`;
  await rename(OUT, OLD).catch(() => {});
  await rename(TMP, OUT).catch(async () => { await cp(TMP, OUT, { recursive: true }); await rm(TMP, { recursive: true, force: true }); });
  await rm(OLD, { recursive: true, force: true });

  const problems = checkLinks(pages);
  const ms = Math.round(performance.now() - t0);
  console.log(`Built ${pages.length} pages, ${search.length} search entries in ${ms} ms → ${OUT}`);
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
