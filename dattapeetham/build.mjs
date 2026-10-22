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

function checkLinks(pages) {
  const ids = new Map(pages.map((p) => [p.file, new Set([...p.html.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]))]));
  const problems = [];
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

  // Build into a private temp dir, then swap it in, so a running dev server
  // (or a parallel build) never serves a half-written site.
  const TMP = join(ROOT, `.site-tmp-${process.pid}-${bust}`);
  await mkdir(TMP, { recursive: true });
  await cp(join(SRC, 'assets'), join(TMP, 'assets'), { recursive: true });

  const pages = [];
  const search = [];
  for (const f of files) {
    let page;
    try { page = (await load(`pages/${f}`, bust)).default; } catch (e) { console.error(`✗ src/pages/${f}: ${e.message}`); process.exitCode = 1; continue; }
    if (!page?.file || typeof page.render !== 'function') throw new Error(`src/pages/${f}: default export needs { file, render }`);
    let body;
    try { body = await page.render(); } catch (e) { console.error(`✗ ${page.file}: render failed — ${e.stack}`); process.exitCode = 1; continue; }
    const html = layout(page, body);
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
    console.error(`\n${problems.length} broken internal link(s):\n  ` + problems.join('\n  '));
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

  let timer;
  watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error(e)), 150);
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  build().then(() => { if (process.argv.includes('--serve')) serve(); }).catch((e) => { console.error(e); process.exit(1); });
}
