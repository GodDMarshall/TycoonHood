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
import { join, dirname, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, links, OFFICIAL, config, resolveConfig, normaliseUrl } from '../src/site.mjs';
import { THEME_COLOR } from '../src/layout.mjs';
import { printAddresses } from '../build.mjs';

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
    const prefix = f === '404.html' ? '/' : lang === 'en' ? '' : '../';
    for (const [k, re] of Object.entries(want)) {
      const m = re.exec(html);
      assert.ok(m, `missing ${k} link`);
      assert.ok(m[1].startsWith(prefix) && (prefix || !/^(?:\/|\.\.\/)/.test(m[1])), `${k} link "${m[1]}" should start with "${prefix}"`);
      assert.ok(await exists(join(SITE, target(f, m[1]))), `${k} link "${m[1]}" does not resolve`);
    }
    // the footer's About Us is this site's own page; the legal pages stay on the platform
    const legal = (/<nav aria-label="[^"]*">\s*(<a href="[^"]*">[^<]*<\/a>\s*){4}<\/nav>\s*<\/div>\s*<\/div>\s*<\/footer>/.exec(html) || [''])[0];
    const hrefs = [...legal.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    assert.deepEqual(hrefs, [`${f === '404.html' ? '/' : ''}about.html`, links.disclaimer, links.privacy, links.terms], 'footer legal row');
    assert.ok(!html.includes('/page/view/about-us'), 'still links to the platform about-us page');
  });
}

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
  // .htaccess (Apache) and .well-known/ are legitimate server files; any other dotfile is not
  assert.deepEqual(all.filter((p) => p.split('/').some((seg) => seg.startsWith('.') && seg !== '.htaccess' && seg !== '.well-known')), [], 'dotfiles in the site');
  assert.deepEqual(all.filter((p) => /\.(?:map|mjs|md|log)$|(?:^|\/)(?:node_modules|src|tests?)\//.test(p)), [], 'source or tooling files in the site');
  for (const { f, html } of pages) {
    assert.ok(!/localhost|127\.0\.0\.1|:4321|livereload|EventSource\(/.test(html), `${f} references the dev server`);
  }
});

test('booking, donation, sign-in and store links follow legacyPlatformUrl', () => {
  const home = pages.find((p) => p.f === 'index.html').html;
  for (const k of ['poojas', 'donations', 'login', 'store']) assert.ok(home.includes(`href="${links[k].replace(/&/g, '&amp;')}"`), `index.html has no link to links.${k}`);
});
