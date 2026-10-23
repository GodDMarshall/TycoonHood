// Guards for the server configurations (deploy/routes.mjs → tools/server-configs.mjs).
//
//   node build.mjs && node --test tests/server-configs.test.mjs
//
// Real-server behaviour is tested by deploy/test/docker-servers.mjs (nginx and
// Apache in Docker) and deploy/test/verify-server.mjs (any running host);
// these tests check the data, the generator and each file's syntax and limits
// without a server.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../deploy/routes.mjs';
import {
  buildModel, scanSite, detectVersioning, groupAssets, toOrigin, resolveAddresses,
  renderHtaccess, renderNginx, renderRedirects, renderHeaders, renderWebConfig, renderVercel, renderWrangler,
} from '../tools/server-configs.mjs';
import { links, OFFICIAL } from '../src/site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const SEVA = 'https://seva.dattapeetham.org';
const WWW = 'https://www.dattapeetham.org';
const scan = await scanSite(SITE);
const same = await buildModel({ siteUrl: WWW, legacyUrl: WWW, scan });
const split = await buildModel({ siteUrl: WWW, legacyUrl: SEVA, scan });
const render = (m) => ({
  htaccess: renderHtaccess(m), nginx: renderNginx(m), redirects: renderRedirects(m), headers: renderHeaders(m),
  webConfig: renderWebConfig(m), vercel: renderVercel(m), wrangler: renderWrangler(m),
});
const out = { same: render(same), split: render(split) };

// ------------------------------------------------------------- the data ---

test('security headers: the original vercel.json set, CSP unchanged', () => {
  assert.deepEqual(Object.keys(R.securityHeaders), ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security', 'Content-Security-Policy']);
  assert.equal(R.securityHeaders['Content-Security-Policy'], "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' mailto:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://dattapeetham.s3.amazonaws.com https://dev-dattapeetham.s3.amazonaws.com https://i.ytimg.com; frame-src https://www.youtube-nocookie.com https://www.google.com; connect-src 'self'; upgrade-insecure-requests");
});

test('cache policy: revalidate by default, immutable code, 30-day media', () => {
  assert.equal(R.defaultCache, 'no-cache');
  assert.equal(R.cacheRules[0].value, 'public, max-age=31536000, immutable');
  assert.equal(R.cacheRules[1].value, 'public, max-age=2592000');
  for (const r of R.cacheRules) assert.equal(r.prefix, '/assets/');
  assert.ok(!R.cacheRules.some((r) => r.extensions.some((x) => ['json', 'html', 'webmanifest', 'xml', 'txt'].includes(x))), 'pages, JSON, sitemap, robots and the manifest must revalidate');
});

test('old-site redirects: the 41 from the original vercel.json, to .html URLs', () => {
  assert.equal(R.oldSiteRedirects.length, 41);
  const froms = R.oldSiteRedirects.map(([f]) => f);
  assert.equal(new Set(froms).size, froms.length, 'duplicate source');
  for (const [from, to] of R.oldSiteRedirects) {
    assert.match(from, /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/, from);
    assert.match(to, /^\/[a-z0-9-]+\.html(?:#[a-z0-9-]+)?$/, `${from} → ${to}`);
  }
  assert.equal(R.REDIRECT_STATUS, 301);
});

test('old-site redirect targets exist in the built site, anchors included', () => {
  for (const [from, to] of R.oldSiteRedirects) {
    const [file, hash] = to.slice(1).split('#');
    const html = scan.text.get(file);
    assert.ok(html, `${from}: ${file} not built`);
    if (hash) assert.match(html, new RegExp(`\\sid="${hash}"`), `${from}: ${file} has no #${hash}`);
  }
});

test('platform paths: plain paths, 302, none shadowing a page or an old-site URL', () => {
  assert.equal(R.legacyPlatform.status, 302);
  const pages = scan.pages.map((f) => '/' + f.replace(/\.html$/, ''));
  const old = new Set(R.oldSiteRedirects.map(([f]) => f));
  for (const p of R.legacyPlatform.paths) {
    assert.match(p, /^\/[a-z0-9-]+$/, p);
    assert.ok(!pages.includes(p), `${p} is a page of the new site`);
    assert.ok(!old.has(p), `${p} is an old-site redirect`);
  }
  for (const p of R.legacyPlatform.prefixes) assert.match(p, /^\/[a-z0-9/-]+\/$/, p);
});

test('every link the site makes to the platform host is routed on the new host', async () => {
  // A page, an old-site redirect, or a platform path: so a stale link to the
  // new host (bookmark, search result, app) never dead-ends.
  const pages = new Set(['/', ...scan.langs.map((l) => `/${l}/`)]);
  for (const f of scan.files.filter((x) => x.endsWith('.html'))) { pages.add('/' + f); pages.add('/' + f.replace(/\.html$/, '')); }
  const old = new Set(R.oldSiteRedirects.map(([f]) => f));
  const covered = (p) => pages.has(p) || old.has(p)
    || R.legacyPlatform.paths.some((x) => p === x || p.startsWith(x + '/'))
    || R.legacyPlatform.prefixes.some((x) => p.startsWith(x));
  const fromSite = Object.values(links).filter((u) => u.startsWith(OFFICIAL + '/')).map((u) => new URL(u).pathname);
  const host = new URL(OFFICIAL).origin;
  const fromHtml = new Set();
  for (const [f, html] of scan.text) {
    if (!f.endsWith('.html')) continue;
    for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) if (href.startsWith(host + '/')) fromHtml.add(new URL(href.replace(/&amp;/g, '&')).pathname);
  }
  assert.ok(fromSite.length > 20 && fromHtml.size > 20, 'found the platform links');
  const missing = [...new Set([...fromSite, ...fromHtml])].filter((p) => !covered(p));
  assert.deepEqual(missing, [], `not routed: ${missing.join(', ')}`);
});

// ------------------------------------------------------------ the model ---

test('page URLs: every page in every language, .html form, index and language roots', () => {
  const names = scan.pages.filter((f) => f !== 'index.html' && f !== '404.html').map((f) => f.slice(0, -5));
  assert.ok(names.length >= 14, `${names.length} pages`);
  const r = new Map(same.redirects.map((x) => [x.from, x]));
  for (const pre of ['', ...R.LANGUAGES.map((l) => `/${l}`)]) {
    for (const n of names) assert.equal(r.get(`${pre}/${n}`)?.to, `${pre}/${n}.html`);
    assert.equal(r.get(`${pre}/index`)?.to, `${pre}/`);
    if (pre) assert.equal(r.get(pre)?.to, `${pre}/`);
  }
  assert.ok(!r.has('/404'), 'the 404 page has no extensionless URL');
  assert.ok(same.redirects.every((x) => x.status === 301));
});

test('same host: no platform rules anywhere (they would loop)', () => {
  assert.equal(same.splitHost, false);
  assert.equal(same.platform, null);
  for (const [name, text] of Object.entries(out.same)) {
    assert.ok(!/\b302\b|redirectType="Found"|R=302/.test(text), `${name} has a 302`);
    assert.ok(!text.includes('/poojas'), `${name} mentions /poojas`);
  }
});

test('split host: platform rules in every format, to the same path and query', () => {
  assert.equal(split.splitHost, true);
  assert.match(out.split.htaccess, /RewriteRule \^\(\?:poojas\|donations\|.*\)\(\?:\/\.\*\)\?\$ https:\/\/seva\.dattapeetham\.org%\{REQUEST_URI\} \[R=302,L\]/);
  assert.match(out.split.nginx, /location ~ "\^\/\(\?:poojas\|.*\)\(\?:\/\|\$\)" \{ return 302 https:\/\/seva\.dattapeetham\.org\$request_uri; \}/);
  assert.match(out.split.nginx, /location \^~ \/page\/view\/ \{ return 302 https:\/\/seva\.dattapeetham\.org\$request_uri; \}/);
  assert.match(out.split.redirects, /^\/poojas\/\*\s+https:\/\/seva\.dattapeetham\.org\/poojas\/:splat\s+302$/m);
  assert.match(out.split.redirects, /^\/page\/view\/\*\s+https:\/\/seva\.dattapeetham\.org\/page\/view\/:splat\s+302$/m);
  assert.match(out.split.webConfig, /url="https:\/\/seva\.dattapeetham\.org\{REQUEST_URI\}" redirectType="Found" appendQueryString="false"/);
  const v = JSON.parse(out.split.vercel);
  assert.ok(v.redirects.some((r) => r.source === '/poojas/:path+' && r.destination === `${SEVA}/poojas/:path+` && r.statusCode === 302));
  for (const p of R.legacyPlatform.paths) assert.ok(out.split.redirects.includes(`${p} `), `_redirects lacks ${p}`);
});

test('old-site URLs beat the platform catch-all', () => {
  // exact rules come first in every ordered format
  const at = (text, a, b) => assert.ok(text.indexOf(a) >= 0 && text.indexOf(a) < text.indexOf(b), `${a} before ${b}`);
  at(out.split.htaccess, '^page/view/about-us$', 'page/view|ashrams');
  at(out.split.redirects, '/page/view/about-us ', '/page/view/*');
  at(out.split.webConfig, 'DP old /page/view/about-us', 'DP platform pages');
  const v = JSON.parse(out.split.vercel).redirects.map((r) => r.source);
  assert.ok(v.indexOf('/page/view/about-us') < v.indexOf('/page/view/:path+'));
  assert.match(out.split.nginx, /location = \/page\/view\/about-us \{ return 301/); // nginx: exact beats ^~
});

test('a sibling platform host (www vs bare) is flagged', async () => {
  const m = await buildModel({ siteUrl: WWW, legacyUrl: 'https://dattapeetham.org', scan });
  assert.ok(m.warnings.some((w) => /loop/.test(w)));
});

test('addresses: bare https origins only; flags, then env, then site.config.json', () => {
  assert.equal(toOrigin('https://www.dattapeetham.org/'), WWW);
  for (const bad of ['www.dattapeetham.org', 'ftp://x.org', 'https://x.org/path', 'https://x.org/?q', 'https://x.org/#f', 'https://u:p@x.org']) assert.throws(() => toOrigin(bad), bad);
  const file = join(ROOT, 'site.config.json');
  assert.deepEqual(resolveAddresses({ argv: ['--legacy-url=https://a.org'], env: { DP_LEGACY_URL: 'https://b.org', DP_SITE_URL: 'https://c.org' }, file }), { siteUrl: 'https://c.org', legacyUrl: 'https://a.org' });
  assert.deepEqual(resolveAddresses({ argv: [], env: {}, file: join(ROOT, 'no-such-file.json') }), { siteUrl: WWW, legacyUrl: WWW });
});

test('routes that do not fit the site are refused', async () => {
  await assert.rejects(buildModel({ siteUrl: WWW, legacyUrl: SEVA, pages: ['index.html', 'store.html'] }), /platform path \/store/);
  const broken = { ...scan, text: new Map([...scan.text].map(([f, h]) => [f, f === 'sri-swamiji.html' ? h.replace(/\sid="bala-swamiji"/, '') : h])) };
  await assert.rejects(buildModel({ siteUrl: WWW, legacyUrl: WWW, scan: broken }), /no id="bala-swamiji"/);
  await assert.rejects(buildModel({ siteUrl: WWW, legacyUrl: WWW, pages: [] }), /no pages/);
});

test('CSS/JS are immutable only when every reference is content-hashed', async () => {
  assert.equal(same.versioning.versioned, true, 'the built site versions its CSS/JS');
  const page = (src) => new Map([['index.html', src]]);
  assert.equal(detectVersioning(page('<link rel="stylesheet" href="assets/css/site.css?v=ab12cd34"><script src="assets/js/site.js?v=12345678"></script>')).versioned, true);
  assert.equal(detectVersioning(page('<link rel="stylesheet" href="assets/css/site.3fa9c2d1e4.css">')).versioned, true);
  assert.equal(detectVersioning(page('<link rel="stylesheet" href="assets/css/site.css?v=1"><script src="assets/js/site.js"></script>')).versioned, false);
  assert.equal(detectVersioning(new Map([['index.html', '<script src="assets/js/a.js?v=12345678"></script>'], ['assets/js/a.js', "load('assets/js/b.js')"]])).versioned, false, 'a script loading an unversioned script');
  assert.equal(detectVersioning(page('<script src="https://cdn.example/x.js"></script>')).versioned, false, 'no own references');
  const m = await buildModel({ siteUrl: WWW, legacyUrl: WWW, scan, versionedAssets: false });
  for (const [name, text] of Object.entries(render(m))) assert.ok(!text.includes('immutable'), `${name} still marks code immutable`);
});

test('asset cache groups: one rule per uniform folder, files where mixed', () => {
  const rules = R.cacheRules;
  const g = groupAssets(['/assets/css/a.css', '/assets/css/p/b.css', '/assets/img/a.webp', '/assets/img/b.svg', '/assets/x.json', '/assets/mix/a.js', '/assets/mix/a.json'], rules);
  assert.deepEqual(g.map((x) => [x.path, x.value]), [
    ['/assets/css/*', rules[0].value], ['/assets/img/*', rules[1].value], ['/assets/mix/a.js', rules[0].value],
  ]);
  for (const x of same.assetGroups) assert.notEqual(x.value, R.defaultCache);
  assert.ok(!same.assetGroups.some((x) => x.path.endsWith('.json')), 'JSON keeps revalidating');
});

// ------------------------------------------------------- file by file ---

const balanced = (text, open, close) => {
  let depth = 0;
  for (const m of text.matchAll(new RegExp(`${open.source}|${close.source}`, 'g'))) {
    depth += new RegExp(`^${open.source}$`).test(m[0]) ? 1 : -1;
    if (depth < 0) return false;
  }
  return depth === 0;
};

test('.htaccess: balanced sections, modules guarded, 404 page, canonical block marked', () => {
  for (const t of [out.same.htaccess, out.split.htaccess]) {
    for (const tag of ['IfModule', 'If', 'ElseIf', 'FilesMatch']) assert.ok(balanced(t, new RegExp(`<${tag}\\b`), new RegExp(`</${tag}>`)), `<${tag}> unbalanced`);
    assert.match(t, /^ErrorDocument 404 \/404\.html$/m);
    assert.match(t, /^DirectoryIndex index\.html$/m);
    assert.match(t, /BEGIN canonical host and HTTPS[\s\S]+DP_CANONICAL[\s\S]+END canonical host and HTTPS/);
    assert.match(t, /RewriteCond %\{HTTP_HOST\} \^dattapeetham\\\.org/);
    assert.match(t, /<IfModule mod_expires\.c>\s+ExpiresActive Off/);
    // every directive that needs a module sits inside its <IfModule>
    const outside = t.replace(/<IfModule[\s\S]*?<\/IfModule>\n/g, '');
    assert.ok(!/^\s*(?:Header|Rewrite|Expires|AddType|AddOutputFilter)/m.test(outside), 'module directive outside <IfModule>');
    for (const [from] of R.oldSiteRedirects) assert.ok(t.includes(`RewriteRule ^${from.slice(1).replace(/[.]/g, '\\.')}$ `), from);
  }
});

test('nginx: balanced braces, TLS lines marked, headers never inside a location', () => {
  for (const t of [out.same.nginx, out.split.nginx]) {
    const code = t.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/#.*$/gm, '');
    assert.ok(balanced(code, /\{/, /\}/), 'braces');
    for (const line of code.split('\n').map((l) => l.trim()).filter(Boolean)) assert.match(line, /[;{}]$/, `unterminated: ${line}`);
    assert.match(t, /ssl_certificate\s+\S+;\s+# \[tls\]/);
    assert.match(t, /# \[server-name\]/);
    assert.match(t, /error_page 404 \/404\.html;/);
    assert.match(t, /absolute_redirect off;/);
    // add_header in a location would silently drop every server-level header there
    assert.ok(!code.split('\n').some((l) => /^\s*location\b/.test(l) && /add_header/.test(l)));
    const main = t.slice(t.lastIndexOf('server {'));
    const loc = main.slice(main.indexOf('location / {'));
    assert.ok(!/add_header/.test(loc));
    assert.equal((main.match(/add_header [\w-]+ .* always;/g) || []).length, 7);
    for (const [from] of R.oldSiteRedirects) assert.ok(t.includes(`location = ${from} {`), from);
  }
});

test('_redirects: valid for Cloudflare and Netlify (tokens, statuses, order, limits)', () => {
  for (const t of [out.same.redirects, out.split.redirects]) {
    const rules = t.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s+/));
    let dynamic = 0, staticN = 0, seenDynamic = false;
    const seen = new Set();
    for (const r of rules) {
      assert.equal(r.length, 3, r.join(' '));
      assert.ok(['200', '301', '302'].includes(r[2]), `status ${r[2]} (Cloudflare rejects "!")`);
      assert.match(r[0], /^\//);
      assert.match(r[1], /^(?:\/|https:\/\/)/);
      assert.ok(!seen.has(r[0]), `duplicate ${r[0]}`);
      seen.add(r[0]);
      if (r[0].includes('*')) { dynamic++; seenDynamic = true; } else { staticN++; assert.ok(!seenDynamic, `static rule ${r[0]} after a splat (Cloudflare would count it as dynamic)`); }
    }
    assert.ok(dynamic <= 100 && staticN <= 2000, `${dynamic} dynamic, ${staticN} static`);
    assert.ok(t.split('\n').every((l) => l.length <= 1000));
  }
  const forced = renderRedirects(same, { netlifyForce: true });
  assert.match(forced, /^\/about\s+\/about\.html\s+301!$/m);
  assert.match(forced, /^\/kn\s+\/kn\/\s+301$/m, 'language roots are never forced');
  assert.match(forced, /^\/sriswamiji\s+\/sri-swamiji\.html\s+301$/m, 'old-site rules need no force');
});

test('_headers: security on /*, no Cache-Control on /*, under 100 rules', () => {
  const blocks = out.same.headers.split('\n').filter((l) => /^\//.test(l));
  assert.ok(blocks.length <= 100, `${blocks.length} rules`);
  const star = out.same.headers.split('\n\n').find((b) => b.startsWith('/*'));
  for (const [k, v] of Object.entries(R.securityHeaders)) assert.ok(star.includes(`  ${k}: ${v}`), k);
  assert.ok(!/Cache-Control/.test(star), 'Netlify and Cloudflare would join it with the asset values');
  assert.match(out.same.headers, /^\/assets\/css\/\*\n {2}Cache-Control: public, max-age=31536000, immutable$/m);
});

// Minimal XML well-formedness: balanced elements, quoted attributes, escaped text.
function xmlProblems(text) {
  const body = text.replace(/^<\?xml[^?]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const problems = [];
  const re = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+="[^"<]*")*)\s*(\/?)>|([^<]+)|(<)/g;
  let m;
  while ((m = re.exec(body))) {
    if (m[6]) { problems.push(`stray < at ${m.index}`); continue; }
    if (m[5] !== undefined) { if (/&(?!(?:amp|lt|gt|quot|apos|#\d+);)/.test(m[5]) || m[5].trim() && !stack.length) problems.push(`bad text "${m[5].trim().slice(0, 30)}"`); continue; }
    for (const [, v] of m[3].matchAll(/="([^"]*)"/g)) if (/&(?!(?:amp|lt|gt|quot|apos|#\d+);)/.test(v)) problems.push(`unescaped & in ${v}`);
    if (m[1]) { if (stack.pop() !== m[2]) problems.push(`</${m[2]}> mismatched`); } else if (!m[4]) stack.push(m[2]);
  }
  if (stack.length) problems.push(`unclosed ${stack.join(' > ')}`);
  return problems;
}

test('web.config: well-formed, rewrite rules, 404 page, MIME types, headers', () => {
  assert.deepEqual(xmlProblems('<a><b x="1"/>t &amp; u</a>'), []);
  assert.ok(xmlProblems('<a><b></a>').length && xmlProblems('<a x="&"></a>').length, 'the checker catches errors');
  for (const t of [out.same.webConfig, out.split.webConfig]) {
    assert.deepEqual(xmlProblems(t), []);
    for (const ext of ['webmanifest', 'webp', 'json', 'svg', 'woff2']) assert.match(t, new RegExp(`<remove fileExtension="\\.${ext}" />\\s+<mimeMap fileExtension="\\.${ext}"`));
    assert.match(t, /<error statusCode="404" path="\/404\.html" responseMode="ExecuteURL" \/>/);
    assert.match(t, /<add name="Content-Security-Policy" value="default-src 'self';/);
    const names = [...t.matchAll(/<rule name="([^"]+)"/g)].map((x) => x[1]);
    assert.equal(new Set(names).size, names.length, 'rule names must be unique');
    for (const [, url] of t.matchAll(/<match url="([^"]+)"/g)) new RegExp(url.replace(/&quot;/g, '"'));
  }
});

test('vercel.json: .html URLs kept, trailing slash untouched, rules well-formed', () => {
  const v = JSON.parse(out.same.vercel);
  assert.equal(v.cleanUrls, false);
  assert.ok(!('trailingSlash' in v), 'trailingSlash: false would 308 /kn/ to /kn and break its relative links');
  assert.equal(v.outputDirectory, 'site');
  assert.equal(v.buildCommand, 'node build.mjs');
  assert.equal(v.installCommand, 'echo no-install');
  const sources = v.redirects.map((r) => r.source);
  assert.equal(new Set(sources).size, sources.length);
  for (const r of v.redirects) assert.ok(r.source.startsWith('/') && r.destination && [301, 302].includes(r.statusCode) && !('permanent' in r), JSON.stringify(r));
  assert.equal(v.headers[0].source, '/(.*)');
  assert.deepEqual(v.headers[0].headers.find((h) => h.key === 'Cache-Control'), { key: 'Cache-Control', value: 'no-cache' });
  assert.ok(v.redirects.some((r) => r.source === '/page/view/sri-bala-swamiji' && r.destination === '/sri-swamiji.html#bala-swamiji' && r.statusCode === 301));
});

test('wrangler.jsonc: Workers static assets serve files as named', () => {
  const json = JSON.parse(out.same.wrangler.replace(/^\s*\/\/.*$/gm, ''));
  assert.deepEqual(json.assets, { directory: '../../site', html_handling: 'none', not_found_handling: '404-page' });
});

test('committed project files match a fresh render from site.config.json', async () => {
  const { siteUrl, legacyUrl } = resolveAddresses({ env: {} });
  const m = await buildModel({ siteUrl, legacyUrl, scan });
  assert.equal(await readFile(join(ROOT, 'vercel.json'), 'utf8'), renderVercel(m), 'vercel.json is stale: run node tools/server-configs.mjs site');
  assert.equal(await readFile(join(ROOT, 'deploy', 'nginx', 'dattapeetham.conf'), 'utf8'), renderNginx(m), 'deploy/nginx/dattapeetham.conf is stale');
  assert.equal(await readFile(join(ROOT, 'deploy', 'cloudflare', 'wrangler.jsonc'), 'utf8'), renderWrangler(m), 'deploy/cloudflare/wrangler.jsonc is stale');
});

test('the 404 page works at any depth (root-absolute links and assets)', async () => {
  const html = await readFile(join(SITE, '404.html'), 'utf8');
  const rel = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]).filter((u) => !/^(?:\/|#|[a-z]+:)/i.test(u));
  assert.deepEqual(rel, []);
});

test('language folders exist for every language the rules cover', async () => {
  const dirs = (await readdir(SITE, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const l of R.LANGUAGES) assert.ok(dirs.includes(l), l);
  assert.deepEqual(same.languages, R.LANGUAGES);
});
