// Content and structure guards for the built site (node:test, no dependencies).
//
//   node build.mjs && node --test tests/
//   node build.mjs --out=/tmp/x && DP_SITE_DIR=/tmp/x node --test tests/
//
// Catches template leaks, missing metadata, images without alt or size, and
// contact details that drift from the single source in src/site.mjs. Also
// guards the handover pieces: the two site addresses, asset versioning,
// icons and the web manifest. The addresses are resolved the same way as the
// build resolves them (DP_SITE_URL / DP_LEGACY_URL, then site.config.json).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname, resolve, posix, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, links, OFFICIAL, config, resolveConfig, normaliseUrl } from '../src/site.mjs';
import { THEME_COLOR } from '../src/layout.mjs';
import { printAddresses, assertProduction, byteRange } from '../build.mjs';
import { SHANKHA, CREDIT } from '../src/features/devotion-sound.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.DP_SITE_DIR ? resolve(process.env.DP_SITE_DIR) : join(ROOT, 'site');
const files = (await readdir(SITE)).filter((f) => f.endsWith('.html'));
const LANG_DIRS = ['kn', 'hi', 'ta', 'te'];
const pages = await Promise.all(files.map(async (f) => ({ f, lang: 'en', html: await readFile(join(SITE, f), 'utf8') })));
for (const l of LANG_DIRS) {
  for (const f of files) pages.push({ f: `${l}/${f}`, lang: l, html: await readFile(join(SITE, l, f), 'utf8') });
}
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const hash8 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 8);
const exists = async (p) => !!(await stat(p).catch(() => null));
// A page-relative or root-absolute reference → path inside the site folder.
const target = (page, url) => {
  const path = url.split('#')[0].split('?')[0];
  return path.startsWith('/') ? path.slice(1) : posix.normalize(posix.join(posix.dirname(page), path));
};
// PNG width, height and colour type (2 = RGB, 6 = RGBA) from the IHDR chunk
const pngInfo = (buf) => {
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'not a PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType: buf[25] };
};
const main = (html) => (/<main[^>]*>([\s\S]*)<\/main>/.exec(html) || [, ''])[1];
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ');

test('every page was built', () => {
  for (const f of ['index.html', 'about.html', 'sri-swamiji.html', 'guru-parampara.html', 'darshan.html', 'events.html', 'teachings.html', 'music.html', 'kriya-yoga.html', 'seva.html', 'visit.html', 'attractions.html', 'media.html', 'centers.html', 'contact.html', '404.html']) {
    assert.ok(files.includes(f), `${f} missing`);
  }
});

for (const { f, lang, html } of pages) {
  test(`${f}: language attributes`, () => {
    assert.match(html, new RegExp(`<html lang="${lang}" data-root="${lang === 'en' ? '' : '../'}">`));
    for (const code of ['en', ...LANG_DIRS]) assert.match(html, new RegExp(`hreflang="${code}"`), `missing hreflang ${code}`);
    assert.ok(!html.includes('@@lang:'), 'unresolved language link');
    if (lang !== 'en') {
      assert.ok(!/(?:src|href)="assets\//.test(html), 'asset path not localised');
      assert.match(html, new RegExp(`assets/js-${lang}/site\\.js`));
    }
  });

  test(`${f}: no template leaks`, () => {
    const t = text(main(html));
    for (const bad of ['undefined', 'NaN', '[object Object]', 'TODO', 'lorem ipsum', '${']) {
      assert.ok(!t.includes(bad), `"${bad}" appears in visible text`);
    }
  });

  test(`${f}: head metadata`, () => {
    const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1] || '';
    const desc = (/<meta name="description" content="([^"]*)"/.exec(html) || [])[1] || '';
    assert.ok(title.length >= 10 && title.length <= 90, `title length ${title.length}: ${title}`);
    // Count visible letters: Indic vowel signs are separate code units, and
    // conjuncts pack a translated description into fewer letters than English.
    const len = [...new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(desc)].length;
    assert.ok(len >= (lang === 'en' ? 50 : 30) && len <= 200, `description length ${len}`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${reEsc(site.origin)}/`));
    assert.match(html, /<meta property="og:image" content="https:\/\//);
  });

  test(`${f}: exactly one h1`, () => {
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
  });

  test(`${f}: images have alt and intrinsic size`, () => {
    for (const tag of html.match(/<img\b[^>]*>/g) || []) {
      assert.match(tag, /\salt="/, `img without alt: ${tag.slice(0, 120)}`);
      if (/assets\/img\/opt\//.test(tag)) assert.match(tag, /\swidth="\d+"/, `optimised img without width: ${tag.slice(0, 120)}`);
    }
  });

  test(`${f}: JSON-LD parses`, () => {
    for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(json);
  });

  test(`${f}: external links are safe`, () => {
    for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) assert.match(tag, /rel="[^"]*noopener/, tag.slice(0, 120));
  });

  test(`${f}: main contact details match src/site.mjs`, () => {
    const t = text(html);
    // The Ashram's main line may only appear in its canonical form.
    for (const m of t.matchAll(/\(?0?821\)?[\s-]*248[\s-]*6[\s-]*486/g)) {
      assert.ok(['+91 (0821) 2486 486', '(0821) 2486 486', '(0821)-2486486', '0821 2486486', '0821-2486486'].some((ok) => m[0].includes(ok.replace('+91 ', '')) || t.includes(site.phone)), `unexpected phone form: ${m[0]}`);
    }
    for (const [, mail] of html.matchAll(/mailto:([^"?]+)/g)) {
      assert.match(decodeURIComponent(mail), /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/, `bad mailto ${mail}`);
    }
  });

  test(`${f}: local CSS, JS and JSON references carry ?v=<content hash>`, async () => {
    let seen = 0;
    for (const [, attr, url] of html.matchAll(/\s(src|href)="([^"]+)"/g)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) continue;
      const path = url.split('#')[0].split('?')[0];
      if (!/\.(?:css|js|json)$/.test(path)) continue;
      seen++;
      const m = /[?&]v=([0-9a-f]+)(?:&|#|$)/.exec(url);
      assert.ok(m, `${attr}="${url}" has no ?v=`);
      assert.match(m[1], /^[0-9a-f]{8}$/, `${url}: version is not 8 hex characters`);
      const file = join(SITE, target(f, url));
      assert.ok(await exists(file), `${url} → ${target(f, url)} does not exist`);
      assert.equal(m[1], hash8(await readFile(file)), `${url}: ?v= does not match the file's content hash`);
    }
    assert.ok(seen >= 6, `only ${seen} local css/js references found`);
    // the search index is fetched at runtime with the version the page carries
    const v = (/<body\b[^>]*\sdata-search-v="([0-9a-f]{8})"/.exec(html) || [])[1];
    assert.ok(v, 'body has no data-search-v');
    const index = lang === 'en' ? 'assets/search-index.json' : `assets/search-index.${lang}.json`;
    assert.equal(v, hash8(await readFile(join(SITE, index))), `data-search-v does not match ${index}`);
  });

  test(`${f}: icons, manifest and legal links`, async () => {
    const want = {
      icon: /<link rel="icon" href="([^"]+favicon\.svg)" type="image\/svg\+xml">/,
      png: /<link rel="icon" href="([^"]+icons\/favicon-32\.png)" sizes="32x32" type="image\/png">/,
      touch: /<link rel="apple-touch-icon" href="([^"]+icons\/apple-touch-icon\.png)">/,
      manifest: /<link rel="manifest" href="([^"]*site\.webmanifest)">/,
    };
    // the 404 pages are root-absolute (they are served at any depth)
    const is404 = f.endsWith('404.html');
    const prefix = is404 ? '/' : lang === 'en' ? '' : '../';
    for (const [k, re] of Object.entries(want)) {
      const m = re.exec(html);
      assert.ok(m, `missing ${k} link`);
      assert.ok(m[1].startsWith(prefix) && (prefix || !/^(?:\/|\.\.\/)/.test(m[1])), `${k} link "${m[1]}" should start with "${prefix}"`);
      assert.ok(await exists(join(SITE, target(f, m[1]))), `${k} link "${m[1]}" does not resolve`);
    }
    // the footer's About Us is this site's own page; the legal pages stay on the platform
    const legal = (/<nav aria-label="[^"]*">\s*(<a href="[^"]*">[^<]*<\/a>\s*){4}<\/nav>\s*<\/div>\s*<\/div>\s*<\/footer>/.exec(html) || [''])[0];
    const hrefs = [...legal.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    const own = is404 ? `/${lang === 'en' ? '' : `${lang}/`}` : '';
    assert.deepEqual(hrefs, [`${own}about.html`, links.disclaimer, links.privacy, links.terms], 'footer legal row');
    assert.ok(!html.includes('/page/view/about-us'), 'still links to the platform about-us page');
  });

  test(`${f}: share preview (og:url, og:locale, a light og:image)`, async () => {
    const meta = (p) => [...html.matchAll(new RegExp(`<meta property="${reEsc(p)}" content="([^"]*)">`, 'g'))].map((m) => m[1]);
    const canonical = (/<link rel="canonical" href="([^"]+)"/.exec(html) || [])[1];
    assert.deepEqual(meta('og:url'), [canonical], 'og:url is the canonical URL');
    assert.deepEqual(meta('og:locale'), [`${lang}_IN`]);
    assert.deepEqual(meta('og:locale:alternate').sort(), ['en', ...LANG_DIRS].filter((c) => c !== lang).map((c) => `${c}_IN`).sort());
    // the page's own share image: cut from the 4K master (tools/make-og.mjs),
    // absolute on siteUrl, with its type, real size and alt text
    const [image] = meta('og:image');
    const [url, v] = image.split('?v=');
    assert.equal(url, `${site.origin}/assets/img/og/${basename(f, '.html')}.jpg`);
    const file = join(SITE, url.slice(site.origin.length + 1));
    assert.ok(await exists(file), `${image} is not in the build`);
    assert.ok((await stat(file)).size <= 300 * 1024, `${image} is over 300 KB (share previews drop it)`);
    const buf = await readFile(file);
    assert.equal(buf.readUInt16BE(0), 0xffd8, 'not a JPEG');
    // versioned by content, so a new photo under the same name reaches share previews
    assert.equal(v, createHash('sha256').update(buf).digest('hex').slice(0, 8), 'og:image ?v= is not the file\'s hash');
    let size;
    for (let i = 2; i < buf.length && !size;) {
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) size = [String(buf.readUInt16BE(i + 7)), String(buf.readUInt16BE(i + 5))];
      i += 2 + buf.readUInt16BE(i + 2);
    }
    assert.deepEqual(size, ['1200', '630'], `${image} is not 1200x630`);
    assert.deepEqual([meta('og:image:width')[0], meta('og:image:height')[0]], size, 'og:image:width/height are the file\'s');
    assert.deepEqual(meta('og:image:type'), ['image/jpeg']);
    const [alt] = meta('og:image:alt');
    assert.ok(alt && alt.length > 10, 'no og:image:alt');
    if (lang !== 'en') assert.ok(!/^[\x00-\x7f]+$/.test(alt), `og:image:alt is not translated: ${alt}`);
  });

  test(`${f}: the hero preload asks for the file the hero image picks`, () => {
    const pre = /<link rel="preload" as="image" href="[^"]+"([^>]*)>/.exec(html);
    if (!pre) return;
    const set = (/\simagesrcset="([^"]+)"/.exec(pre[1]) || [])[1];
    const sizes = (/\simagesizes="([^"]+)"/.exec(pre[1]) || [])[1];
    assert.ok(set && sizes, 'image preload without imagesrcset/imagesizes downloads a second copy on wide screens');
    assert.ok((html.match(/<img\b[^>]*>/g) || []).some((t) => t.includes(` srcset="${set}"`) && t.includes(` sizes="${sizes}"`)), 'no <img> with the same srcset and sizes');
  });

  test(`${f}: JSON-LD links to this site resolve, in this language`, async () => {
    const urls = [];
    const walk = (v, k) => { if (Array.isArray(v)) v.forEach((x) => walk(x, k)); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => walk(x, kk)); else if (typeof v === 'string' && v.startsWith(site.origin + '/')) urls.push([k, v]); };
    const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    lds.forEach((o) => walk(o));
    for (const [, u] of urls) {
      const [path, hash] = u.slice(site.origin.length + 1).split('#');
      if (!/(?:^|\/|\.html)$/.test(path) || /^page\/view\//.test(path)) continue; // assets and the platform's pages
      if (lang !== 'en' && /\.html$/.test(path)) assert.ok(path.startsWith(`${lang}/`), `${u} is not the ${lang} page`);
      const file = join(SITE, path.endsWith('/') || !path ? path + 'index.html' : path);
      assert.ok(await exists(file), `${u} does not exist`);
      if (hash) assert.match(await readFile(file, 'utf8'), new RegExp(`\\sid="${reEsc(hash)}"`), `${u}: no such anchor`);
    }
    const crumbs = lds.find((o) => o['@type'] === 'BreadcrumbList');
    if (f.endsWith('index.html') || f.endsWith('404.html')) { assert.ok(!crumbs, 'no breadcrumb on the home and 404 pages'); return; }
    assert.ok(crumbs, 'BreadcrumbList missing');
    const shown = /<nav class="crumbs"[^>]*>\s*<a [^>]*>([^<]+)<\/a>[\s\S]*?<span aria-current="page">([^<]+)<\/span>/.exec(html);
    const dec = (s) => s.replace(/&amp;/g, '&').trim();
    assert.deepEqual(crumbs.itemListElement.map((x) => x.name), [dec(shown[1]), dec(shown[2])], 'breadcrumb names match the visible breadcrumb');
    assert.deepEqual(crumbs.itemListElement.map((x) => x.item), [`${site.origin}/${lang === 'en' ? '' : lang + '/'}`, (/<link rel="canonical" href="([^"]+)"/.exec(html) || [])[1]]);
  });
}

test('events: structured data for upcoming events only, each with a venue address and its own card', async () => {
  for (const f of ['events.html', 'index.html', ...LANG_DIRS.map((l) => `${l}/events.html`)]) {
    const html = pages.find((p) => p.f === f).html;
    const built = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format((await stat(join(SITE, f))).mtime);
    const events = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).filter((o) => o['@type'] === 'Event');
    for (const e of events) {
      assert.ok(e.endDate >= built, `${f}: ${e.name} ended ${e.endDate}, before the build (${built})`);
      assert.ok(e.location?.address?.addressCountry, `${f}: ${e.name} has no venue address`);
      assert.match(e.url, /\/events\.html#ev-\d{4}-\d\d-\d\d$/, `${f}: ${e.name} url`);
    }
  }
});

test('no dev-bucket URLs and no dangling source-map comments in the build', async () => {
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat();
  for (const file of (await walk(SITE)).filter((p) => /\.(?:html|js|css|json|xml|txt)$|(?:^|[\\/])(?:\.htaccess|_headers|web\.config)$/.test(p))) {
    const text = await readFile(file, 'utf8');
    assert.ok(!text.includes('dev-dattapeetham.s3'), `${file.slice(SITE.length + 1)} references the dev bucket (blocked by the CSP)`);
    for (const [, map] of text.matchAll(/[#@] sourceMappingURL=(\S+?)(?:\s|\*\/|$)/g)) {
      assert.ok(await exists(join(dirname(file), map)), `${file.slice(SITE.length + 1)} points at ${map}, which is not shipped`);
    }
  }
});

test('sitemap lists every public page', async () => {
  const xml = await readFile(join(SITE, 'sitemap.xml'), 'utf8');
  for (const f of files.filter((x) => x !== '404.html')) {
    const loc = f === 'index.html' ? `${site.origin}/` : `${site.origin}/${f}`;
    assert.ok(xml.includes(`<loc>${loc}</loc>`), `${loc} not in sitemap`);
  }
});

test('search index has an entry for every public page', async () => {
  const idx = JSON.parse(await readFile(join(SITE, 'assets/search-index.json'), 'utf8'));
  for (const f of files.filter((x) => x !== '404.html')) assert.ok(idx.some((e) => e.u.startsWith(f)), `${f} not searchable`);
});

test('no half-written files in the site (a photo run writes name.webp.tmp-<pid>, then renames it)', async () => {
  const left = (await readdir(SITE, { recursive: true })).filter((f) => /\.(?:tmp|part)(?:-\d+)?$/i.test(f));
  assert.deepEqual(left, []);
});

test('language pages: Latin-script queries also search the English index, and its hits exist in every language', async () => {
  // site.js on a language page loads the English index for a query in Latin
  // letters ("Hanuman" on /kn/) and opens the hit's section on this
  // language's page, so every English entry must have the same address there.
  const en = JSON.parse(await readFile(join(SITE, 'assets/search-index.json'), 'utf8'));
  for (const l of LANG_DIRS) {
    const own = new Set(JSON.parse(await readFile(join(SITE, `assets/search-index.${l}.json`), 'utf8')).map((e) => e.u));
    const missing = en.map((e) => e.u).filter((u) => !own.has(u));
    assert.deepEqual(missing, [], `${l}: English search entries with no section in /${l}/`);
    const js = await readFile(join(SITE, 'assets', `js-${l}`, 'site.js'), 'utf8');
    assert.ok(js.includes("fetch(base + '../assets/' + 'search-index.json')"), `assets/js-${l}/site.js does not load the English index from the site root`);
  }
  assert.ok((await readFile(join(SITE, 'assets/js/site.js'), 'utf8')).includes('var both = !EN && /[a-z]/i.test(q);'), 'English pages search their own index only');
});

// ---------------------------------------------------------------------------
// Site addresses (site.config.json → src/site.mjs)
// ---------------------------------------------------------------------------

const FILE = { siteUrl: 'https://www.dattapeetham.org', legacyPlatformUrl: 'https://www.dattapeetham.org' };

test('addresses: command line beats environment beats site.config.json', () => {
  let c = resolveConfig({ argv: [], env: {}, file: FILE });
  assert.equal(c.siteUrl, 'https://www.dattapeetham.org');
  assert.deepEqual({ ...c.sources }, { siteUrl: 'site.config.json', legacyPlatformUrl: 'site.config.json' });
  c = resolveConfig({ argv: [], env: { DP_LEGACY_URL: 'https://env.example.org', DP_SITE_URL: 'https://site-env.example.org' }, file: FILE });
  assert.equal(c.legacyPlatformUrl, 'https://env.example.org');
  assert.equal(c.siteUrl, 'https://site-env.example.org');
  assert.equal(c.sources.legacyPlatformUrl, 'DP_LEGACY_URL');
  c = resolveConfig({ argv: ['--serve', '--legacy-url=https://seva.dattapeetham.org', '--site-url', 'https://cli.example.org'], env: { DP_LEGACY_URL: 'https://env.example.org', DP_SITE_URL: 'https://site-env.example.org' }, file: FILE });
  assert.equal(c.legacyPlatformUrl, 'https://seva.dattapeetham.org');
  assert.equal(c.siteUrl, 'https://cli.example.org');
  assert.deepEqual({ ...c.sources }, { siteUrl: '--site-url', legacyPlatformUrl: '--legacy-url' });
  // an empty environment variable does not count
  assert.equal(resolveConfig({ argv: [], env: { DP_SITE_URL: '' }, file: FILE }).siteUrl, FILE.siteUrl);
  assert.throws(() => resolveConfig({ argv: [], env: {}, file: { siteUrl: FILE.siteUrl } }), /legacyPlatformUrl/);
  assert.throws(() => resolveConfig({ argv: ['--legacy-url'], env: {}, file: FILE }), /needs an address/);
});

test('addresses: validated and normalised', () => {
  assert.equal(normaliseUrl('  https://WWW.Example.ORG/  '), 'https://www.example.org');
  assert.equal(normaliseUrl('https://example.org:443'), 'https://example.org');
  assert.equal(normaliseUrl('https://example.org:8443//'), 'https://example.org:8443');
  for (const bad of ['', 'www.example.org', 'http://example.org', 'ftp://example.org', 'https://example.org/sub', 'https://example.org/?a=1', 'https://example.org/#x', 'https://user:pw@example.org', '/relative', 'not a url']) {
    assert.throws(() => normaliseUrl(bad, 'siteUrl'), (e) => e.name === 'ConfigError', `accepted "${bad}"`);
  }
});

test('addresses: same-host warning', () => {
  const same = resolveConfig({ argv: [], env: {}, file: FILE });
  assert.equal(same.sameHost, true);
  const split = resolveConfig({ argv: ['--legacy-url=https://seva.dattapeetham.org'], env: {}, file: FILE });
  assert.equal(split.sameHost, false);
  assert.equal(split.siblingHost, false);
  assert.equal(resolveConfig({ argv: ['--legacy-url=https://dattapeetham.org'], env: {}, file: FILE }).siblingHost, true);
  const capture = (cfg) => {
    const out = [];
    const { log, warn } = console;
    console.log = (...a) => out.push(a.join(' '));
    console.warn = (...a) => out.push(a.join(' '));
    try { printAddresses(cfg); } finally { console.log = log; console.warn = warn; }
    return out.join('\n');
  };
  const text = capture(same);
  assert.match(text, /https:\/\/www\.dattapeetham\.org/);
  assert.match(text, /WARNING/);
  assert.match(text, /point at this site\s+itself/);
  assert.match(text, /docs\/handover\/DOMAIN-CUTOVER\.md/);
  const ok = capture(split);
  assert.match(ok, /seva\.dattapeetham\.org/);
  assert.doesNotMatch(ok, /WARNING/);
});

test('a --production build refuses a platform address on this site\'s own host', () => {
  const same = resolveConfig({ argv: [], env: {}, file: FILE });
  const sibling = resolveConfig({ argv: ['--legacy-url=https://dattapeetham.org'], env: {}, file: FILE });
  const split = resolveConfig({ argv: ['--legacy-url=https://seva.dattapeetham.org'], env: {}, file: FILE });
  const prod = { argv: ['--production'], env: {} };
  assert.throws(() => assertProduction(same, prod), (e) => e.name === 'ConfigError' && /DOMAIN-CUTOVER\.md/.test(e.message));
  assert.throws(() => assertProduction(sibling, prod), /www\./);
  assert.throws(() => assertProduction(same, { argv: [], env: { DP_PRODUCTION: '1' } }), /own host/);
  assert.doesNotThrow(() => assertProduction(split, prod));
  assert.doesNotThrow(() => assertProduction(same, { argv: [], env: {} }), 'an ordinary build only warns');
});

test('docs/handover/DOMAIN-CUTOVER.md exists (the build and site.config.json point to it)', async () => {
  const doc = await readFile(join(ROOT, 'docs/handover/DOMAIN-CUTOVER.md'), 'utf8');
  for (const need of ['legacyPlatformUrl', 'site.config.json', 'build:production', 'verify-server.mjs']) assert.ok(doc.includes(need), `DOMAIN-CUTOVER.md does not mention ${need}`);
});

test('site.config.json holds both addresses, normalised and explained', async () => {
  const json = JSON.parse(await readFile(join(ROOT, 'site.config.json'), 'utf8'));
  for (const k of ['siteUrl', 'legacyPlatformUrl']) {
    assert.equal(typeof json[k], 'string', `${k} missing`);
    assert.equal(normaliseUrl(json[k], k), json[k], `${k} is not in normal form`);
    assert.ok(JSON.stringify(json._comment || '').includes(k), `_comment does not explain ${k}`);
  }
});

test('src/site.mjs takes OFFICIAL and site.origin from the resolved addresses', () => {
  assert.equal(OFFICIAL, config.legacyPlatformUrl);
  assert.equal(site.origin, config.siteUrl);
  for (const k of ['poojas', 'donations', 'store', 'login', 'subscriptions', 'privacy', 'terms', 'disclaimer']) {
    assert.ok(links[k].startsWith(OFFICIAL + '/'), `links.${k} does not follow legacyPlatformUrl`);
  }
});

test('no hard-coded site address in src code (comments may name it)', async () => {
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? (e.name === 'vendor' ? [] : walk(p)) : [p];
  }))).flat();
  const code = (await walk(join(ROOT, 'src'))).filter((p) => /\.(?:mjs|js)$/.test(p));
  assert.ok(code.length > 20);
  const offenders = [];
  for (const p of code) {
    const src = (await readFile(p, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    src.split('\n').forEach((line, i) => {
      const live = line.replace(/(^|[^:\\'"`])\/\/.*$/, '$1');
      // the one allowed mention: the example in src/site.mjs's address error messages
      if (p.endsWith(join('src', 'site.mjs')) && /^\s*const eg = /.test(live)) return;
      if (/https?:\/\/(?:www\.)?dattapeetham\.org(?![\w-])/.test(live)) offenders.push(`${p.slice(ROOT.length + 1)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(offenders, [], 'use site.origin (this site) or OFFICIAL / links.* (the existing platform)');
});

// ---------------------------------------------------------------------------
// Built output: versioning, icons, manifest, nothing dev-only
// ---------------------------------------------------------------------------

test('scripts fetch the search index with a version', async () => {
  const dirs = ['assets/js', ...LANG_DIRS.map((l) => `assets/js-${l}`)];
  let found = 0;
  for (const d of dirs) {
    const code = await readFile(join(SITE, d, 'site.js'), 'utf8');
    // every literal path to a search index is the versioned form
    for (const [all] of code.matchAll(/['"](?:\.\.\/)?assets\/search-index[^'"]*['"]/g)) {
      assert.match(all, /\.json\?v=['"]$/, `${d}/site.js: unversioned ${all}`);
      found++;
    }
    assert.match(code, /getAttribute\('data-search-v'\)/, `${d}/site.js does not read data-search-v`);
  }
  assert.equal(found, dirs.length);
});

test('every built asset that pages reference by ?v= exists and nothing points outside the site', async () => {
  const all = new Set();
  for (const { f, html } of pages) for (const [, url] of html.matchAll(/\s(?:src|href)="([^"#]+\?v=[0-9a-f]{8})"/g)) all.add(target(f, url));
  for (const t of all) {
    assert.ok(!t.startsWith('..'), `${t} escapes the site folder`);
    assert.ok(await exists(join(SITE, t)), `${t} missing`);
  }
});

test('site.webmanifest: names, colours and icons', async () => {
  const m = JSON.parse(await readFile(join(SITE, 'site.webmanifest'), 'utf8'));
  assert.equal(m.name, 'Avadhoota Datta Peetham');
  assert.equal(m.short_name, 'Datta Peetham');
  assert.equal(m.start_url, '/');
  assert.ok(['browser', 'minimal-ui'].includes(m.display), `display ${m.display}`);
  const css = await readFile(join(SITE, 'assets/css/site.css'), 'utf8');
  const token = (n) => (new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css) || [])[1];
  assert.equal(m.theme_color, token('forest'));
  assert.equal(m.theme_color, THEME_COLOR, 'manifest and <meta name="theme-color"> disagree');
  assert.equal(m.background_color, token('ivory'));
  const sizes = new Set();
  for (const icon of m.icons) {
    const file = join(SITE, icon.src.replace(/^\//, ''));
    assert.ok(await exists(file), `${icon.src} missing`);
    if (icon.type === 'image/png') {
      const { w, h } = pngInfo(await readFile(file));
      assert.equal(`${w}x${h}`, icon.sizes, `${icon.src} is ${w}x${h}`);
      sizes.add(`${icon.sizes} ${icon.purpose}`);
    }
  }
  for (const need of ['192x192 any', '512x512 any', '512x512 maskable']) assert.ok(sizes.has(need), `no ${need} icon`);
});

test('icons: sizes, and opaque where iOS and maskable crops need it', async () => {
  const dir = join(SITE, 'assets/img/icons');
  const expect = { 'favicon-16.png': 16, 'favicon-32.png': 32, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512, 'icon-maskable-512.png': 512 };
  for (const [f, px] of Object.entries(expect)) {
    const { w, h, colorType } = pngInfo(await readFile(join(dir, f)));
    assert.deepEqual([w, h], [px, px], f);
    if (f === 'apple-touch-icon.png' || f.includes('maskable')) assert.ok(colorType === 2 || colorType === 0, `${f} has an alpha channel`);
  }
});

test('/favicon.ico: an ICO holding 16 and 32 px PNGs', async () => {
  const buf = await readFile(join(SITE, 'favicon.ico'));
  assert.equal(buf.readUInt16LE(0), 0);
  assert.equal(buf.readUInt16LE(2), 1, 'not an icon resource');
  const n = buf.readUInt16LE(4);
  const got = [];
  for (let i = 0; i < n; i++) {
    const e = 6 + 16 * i;
    const size = buf[e] || 256, len = buf.readUInt32LE(e + 8), off = buf.readUInt32LE(e + 12);
    assert.ok(off + len <= buf.length, 'entry runs past the end of the file');
    const { w, h } = pngInfo(buf.subarray(off, off + len));
    assert.deepEqual([w, h], [size, size]);
    got.push(size);
  }
  assert.deepEqual(got.sort((a, b) => a - b), [16, 32]);
});

test('nothing dev-only in the built site', async () => {
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat();
  const all = (await walk(SITE)).map((p) => p.slice(SITE.length + 1).split('\\').join('/'));
  assert.ok(!all.includes('assets/img/opt/manifest.json'), 'image optimiser manifest copied');
  // .htaccess (Apache), .assetsignore (Cloudflare Workers) and .well-known/ are
  // legitimate server files (tools/server-configs.mjs; every generated config
  // keeps them private); any other dotfile is not
  const SERVER_DOTFILES = new Set(['.htaccess', '.assetsignore', '.well-known']);
  assert.deepEqual(all.filter((p) => p.split('/').some((seg) => seg.startsWith('.') && !SERVER_DOTFILES.has(seg))), [], 'dotfiles in the site');
  assert.deepEqual(all.filter((p) => p.includes('/') && /(?:^|\/)\.(?:htaccess|assetsignore)$/.test(p)), [], 'server dotfiles belong at the site root only');
  assert.deepEqual(all.filter((p) => /\.(?:map|mjs|md|log)$|(?:^|\/)(?:node_modules|src|tests?)\//.test(p)), [], 'source or tooling files in the site');
  for (const { f, html } of pages) {
    assert.ok(!/localhost|127\.0\.0\.1|:4321|livereload|EventSource\(/.test(html), `${f} references the dev server`);
  }
});

test('booking, donation, sign-in and store links follow legacyPlatformUrl', () => {
  const home = pages.find((p) => p.f === 'index.html').html;
  for (const k of ['poojas', 'donations', 'login', 'store']) assert.ok(home.includes(`href="${links[k].replace(/&/g, '&amp;')}"`), `index.html has no link to links.${k}`);
});

// ---------------------------------------------------------------------------
// The devotional layer: wired on every page, audio shipped and versioned as used
// ---------------------------------------------------------------------------

for (const { f, lang, html } of pages) {
  test(`${f}: the devotional layer is wired (sound control after the skip link, invitation in the curtain, scripts, reading lamp, footer lamps)`, () => {
    const body = html.slice(html.indexOf('<body'));
    assert.match(body, /^<body[^>]*>\s*<a class="skip" href="#main">[^<]*<\/a>\s*<div class="snd" data-sound /, 'the sound control comes right after the skip link');
    const intro = (/<div class="intro"[\s\S]*?\n<\/div>/.exec(body) || [''])[0];
    assert.match(intro, /<div class="snd-invite" data-sound-invite hidden>/, 'the first-visit invitation sits inside the intro curtain');
    assert.match(body, /<div class="scroll-progress" aria-hidden="true" data-devotion="jyoti-progress">/);
    assert.match(body, /<footer class="site-footer">[\s\S]*class="[^"]*dv-footer-lamps[^"]*"[\s\S]*<div class="footer-mantra"/);
    const srcs = [...html.matchAll(/<script src="([^"?]+)/g)].map((m) => m[1].split('/').pop());
    const at = (n) => srcs.indexOf(n);
    assert.ok(at('motion.js') >= 0 && at('motion.js') < at('devotion-sound.js') && at('devotion-sound.js') < at('devotion-motion.js'), `script order: ${srcs.join(' ')}`);
    assert.match(html, /<link rel="stylesheet" href="[^"]*devotion-sound\.css\?v=[0-9a-f]{8}">\n<link rel="stylesheet" href="[^"]*devotion-motion\.css\?v=[0-9a-f]{8}">/);
    if (lang === 'en') assert.ok(html.includes(`<p class="snd-credit">${CREDIT}</p>`), 'the credit, word for word');
  });
}

test('audio: the sound control names files that ship, each with its content hash; nothing else ships', async () => {
  const shipped = [];
  const walk = async (d) => { for (const e of await readdir(join(SITE, d), { withFileTypes: true })) (e.isDirectory() ? await walk(`${d}/${e.name}`) : shipped.push(`${d}/${e.name}`.replace(/^assets\/audio\//, ''))); };
  await walk('assets/audio');
  const used = new Map();
  for (const { f, html } of pages) {
    const tag = (/<div class="snd" data-sound [^>]*>/.exec(html) || [])[0];
    assert.ok(tag, `${f}: no sound control`);
    const attr = (n) => (new RegExp(`\\s${n}="([^"]*)"`).exec(tag) || [])[1];
    const v = new Map(attr('data-audio-v').split(/\s+/).filter(Boolean).map((t) => t.split('=')));
    const music = attr('data-music');
    assert.ok(v.has(music), `${f}: no version for ${music}`);
    for (const n of attr('data-sfx').split(/\s+/).filter(Boolean)) assert.ok(v.has(`sfx/${n}.mp3`), `${f}: no version for sfx/${n}.mp3`);
    if (!SHANKHA) assert.ok(!/\bshankha\b/.test(attr('data-sfx')), `${f}: the shankha is listed while it is off`);
    const from = +attr('data-xf-from'), to = +attr('data-xf-to'), fade = +attr('data-xfade');
    assert.ok(from > to && to > 0 && fade > 0 && fade < 2, `${f}: loop plan ${from} ${to} ${fade}`);
    for (const [file, h] of v) used.set(file, h);
  }
  for (const [file, h] of used) assert.equal(hash8(await readFile(join(SITE, 'assets/audio', file))), h, `${file}: data-audio-v does not match the file`);
  assert.deepEqual(shipped.sort(), [...used.keys()].sort(), 'site/assets/audio holds exactly the files the pages use');
  assert.ok(!shipped.includes('manifest.json'), 'the audio manifest is build-only');
});

test('dev server: byte ranges for the audio', () => {
  assert.equal(byteRange(undefined, 100), null);
  assert.deepEqual(byteRange('bytes=0-', 100), { start: 0, end: 99 });
  assert.deepEqual(byteRange('bytes=10-19', 100), { start: 10, end: 19 });
  assert.deepEqual(byteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange('bytes=90-500', 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange('bytes=100-', 100), { unsatisfiable: true });
  assert.equal(byteRange('bytes=0-1,5-9', 100), null, 'several ranges: the whole file');
});

// polish-sound: the loop's fade curve, the first-visit curtain and the fling guard, read from
// the shipped script (curves() is evaluated as written there)
test('sound: the crossfade keeps the level for any likeness of the two players (equal gain when in step)', async () => {
  const js = await readFile(join(SITE, 'assets/js/devotion-sound.js'), 'utf8');
  const src = /function curves\(r\) \{[\s\S]*?\n {2}\}/.exec(js);
  assert.ok(src, 'curves() in devotion-sound.js');
  const curves = new Function(`var CURVES = {};\n${src[0]}\nreturn curves;`)();
  for (const r of [-0.3, 0, 0.2, 0.5, 0.8, 1]) { // (curves() works in steps of 0.02)
    const [up, down] = curves(r);
    assert.ok(up.length >= 32 && up.length === down.length, `r=${r}: curve length`);
    const n = up.length - 1;
    assert.ok(Math.abs(up[0]) < 1e-6 && Math.abs(down[0] - 1) < 1e-6 && Math.abs(up[n] - 1) < 1e-6 && Math.abs(down[n]) < 1e-6, `r=${r}: from A alone to B alone`);
    for (let k = 0; k <= n; k++) {
      const p = up[k] ** 2 + down[k] ** 2 + 2 * r * up[k] * down[k]; // power of the sum of two signals correlated r
      assert.ok(Math.abs(p - 1) < 1e-4, `r=${r}, point ${k}: power of the sum ${p.toFixed(5)}`);
      if (k && r >= 0) assert.ok(up[k] >= up[k - 1] && down[k] <= down[k - 1], `r=${r}, point ${k}: not monotonic`);
      assert.ok(up[k] <= 1.1 && down[k] <= 1.1, `r=${r}, point ${k}: a gain above 1.1`);
    }
  }
  const [u, d] = curves(1);
  u.forEach((x, k) => assert.ok(Math.abs(x + d[k] - 1) < 1e-6, 'in step to the sample: the gains add to one (equal gain, no 3 dB swell)'));
});

test('sound: an unanswered first-visit question lifts the curtain after about 4 s and carries on as the corner card', async () => {
  const js = await readFile(join(SITE, 'assets/js/devotion-sound.js'), 'utf8');
  const ask = +(/\bASK = (\d+)/.exec(js) || [])[1];
  assert.ok(ask >= 3000 && ask <= 4500, `the curtain holds the question ${ask} ms`);
  assert.match(js, /if \(withMusic === undefined\) offer\(inv, \d+\)/, 'unanswered: the question moves to the card');
  assert.match(js, /function toPage\(\)/, 'focus goes back to the start of the page');
  const css = await readFile(join(SITE, 'assets/css/devotion-sound.css'), 'utf8');
  assert.match(css, /\.snd-inviting \.intro \{[^}]*animation: snd-lift [^}]*var\(--snd-hold/, 'the CSS still lifts the curtain if the script stops');
});

test('sound: a fling is read from the wheel and the finger, and a temple sound that falls due waits for it', async () => {
  const js = await readFile(join(SITE, 'assets/js/devotion-sound.js'), 'utf8');
  assert.match(js, /addEventListener\(IN\[0\], onWheel/, 'wheel steps are watched while the temple sounds are on');
  assert.match(js, /'touchmove'/, 'and the finger');
  const hold = +(/\bHOLD = (\d+)/.exec(js) || [])[1];
  assert.ok(hold >= 150 && hold <= 400, `a chime or section bell that falls due waits ${hold} ms`);
});
