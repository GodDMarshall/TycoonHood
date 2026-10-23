// The hand-over documents (docs/handover/) against the project they describe.
//
//   node --test tests/handover-docs.test.mjs          (part of npm test)
//   DP_SITE_DIR=/tmp/x node --test tests/handover-docs.test.mjs
//
// The documents are read by the Peetham's IT person and legal team, so they
// must not drift from the code: every file path, script, npm script and
// command-line flag they name must exist; their links must work both in the
// project and in the package (tools/package.mjs copies docs/handover/ to
// docs/ and README-FIRST.html to the package root); and the privacy inventory
// must list every browser-storage key the scripts use and every outside host
// the Content Security Policy allows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../deploy/routes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HANDOVER = join(ROOT, 'docs', 'handover');
const SITE = process.env.DP_SITE_DIR ? resolve(process.env.DP_SITE_DIR) : join(ROOT, 'site');
const DOCS = ['HANDOVER.md', 'DEPLOY.md', 'DOMAIN-CUTOVER.md', 'LAUNCH-CHECKLIST.md', 'MAINTENANCE.md', 'PRIVACY-DATA-INVENTORY.md'];

const read = (f) => readFile(f, 'utf8');
const docs = Object.fromEntries(await Promise.all(DOCS.map(async (d) => [d, await read(join(HANDOVER, d))])));
const readmeFirst = await read(join(HANDOVER, 'README-FIRST.html'));
const all = Object.values(docs).join('\n');

// GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens.
const slug = (h) => h.trim().toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
const anchors = (md) => new Set([...md.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1])));
// Markdown links outside code: [text](target)
const mdLinks = (md) => [...md.replace(/```[\s\S]*?```/g, '').matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]);

test('every hand-over document exists and is not empty', async () => {
  for (const f of [...DOCS, 'README-FIRST.html']) {
    const s = await stat(join(HANDOVER, f));
    assert.ok(s.size > 1000, `${f} is missing or nearly empty`);
  }
});

test('links between the documents work, in the project and in the package', () => {
  for (const [name, md] of Object.entries(docs)) {
    for (const link of mdLinks(md)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(link)) continue; // https:, mailto:
      const [path, hash] = link.split('#');
      // The package copies docs/handover/ to docs/ and the project to source/:
      // a link that leaves this folder would break there.
      assert.ok(!path.includes('/') && !path.includes('\\'), `${name}: "${link}" leaves docs/handover/, so it breaks in the package; name the file in backticks instead`);
      const target = path || name;
      assert.ok(DOCS.includes(target), `${name}: link to missing document "${link}"`);
      if (hash) assert.ok(anchors(docs[target]).has(hash), `${name}: "${link}" has no heading #${hash} in ${target}`);
    }
  }
});

test('README-FIRST.html: package links and project links both resolve', async () => {
  const links = [...readmeFirst.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  let checked = 0;
  for (const tag of links) {
    const href = (/\shref="([^"]+)"/.exec(tag) || [])[1];
    if (!href || /^https?:/.test(href)) continue;
    // In-page links (the "On this page" index): the target id must exist.
    if (href.startsWith('#')) {
      assert.ok(readmeFirst.includes(` id="${href.slice(1)}"`), `README-FIRST.html: "${href}" has no element with that id`);
      continue;
    }
    const project = (/\sdata-project-href="([^"]+)"/.exec(tag) || [])[1];
    assert.ok(project, `README-FIRST.html: "${href}" needs a data-project-href for when it is opened from docs/handover/`);
    assert.ok(existsSync(join(HANDOVER, project)), `README-FIRST.html: data-project-href "${project}" does not exist`);
    // Package form, mapped onto the project the package is made from.
    let inProject;
    if (href.startsWith('docs/i18n/')) inProject = join(ROOT, href);
    else if (href.startsWith('docs/')) inProject = join(HANDOVER, href.slice(5));
    else if (href.startsWith('website/')) inProject = join(SITE, href.slice(8));
    else if (href === 'VERSION.txt') inProject = join(ROOT, 'tools', 'package.mjs'); // written by the packager
    assert.ok(inProject && existsSync(inProject), `README-FIRST.html: "${href}" will not exist in the package`);
    checked++;
  }
  assert.ok(checked >= 8, `only ${checked} local links checked`);
  assert.match(await read(join(ROOT, 'tools', 'package.mjs')), /VERSION\.txt/);
  assert.match(await read(join(ROOT, 'tools', 'package.mjs')), /README-FIRST\.html/);
});

test('every project file and folder the documents name exists', () => {
  // `path/with/slashes` in backticks, starting at a top-level project folder.
  const re = /`((?:src|deploy|tools|tests|qa|docs|preview|photos)\/[^`\s]*)`/g;
  const missing = [];
  let n = 0;
  for (const [name, md] of Object.entries(docs)) {
    for (const [, p] of md.matchAll(re)) {
      if (/[<>*…]/.test(p)) continue; // placeholders: src/pages/<page>.mjs, part-*.json
      n++;
      if (!existsSync(join(ROOT, p.replace(/[#?].*$/, '')))) missing.push(`${name}: ${p}`);
    }
  }
  assert.deepEqual(missing, []);
  assert.ok(n > 30, `only ${n} paths found: did the pattern break?`);
});

test('every script, npm script and flag in the documents exists', async () => {
  const pkg = JSON.parse(await read(join(ROOT, 'package.json')));
  for (const [, script] of all.matchAll(/\bnpm run ([\w:-]+)/g)) assert.ok(pkg.scripts[script], `npm run ${script}: no such script in package.json`);
  assert.ok(pkg.scripts.test && pkg.scripts.dev && pkg.scripts['build:production'], 'npm test / dev / build:production');

  const scripts = new Set([...all.matchAll(/\bnode ((?:[\w.-]+\/)*[\w.-]+\.mjs)/g)].map((m) => m[1]));
  for (const s of scripts) assert.ok(existsSync(join(ROOT, s)), `node ${s}: no such file`);
  for (const s of ['build.mjs', 'deploy/test/verify-server.mjs', 'tools/i18n-check.mjs', 'tools/check-external-links.mjs', 'tools/make-og.mjs', 'qa/check-pages.mjs']) {
    assert.ok(scripts.has(s), `the documents no longer mention node ${s}`);
  }

  const flagsOf = (cmd) => new Set([...all.matchAll(new RegExp(`node ${cmd.replace(/[./]/g, '\\$&')}([^\\n\`]*)`, 'g'))]
    .flatMap((m) => [...m[1].matchAll(/(?:^|\s|")(--[a-z-]+)/g)].map((f) => f[1])));
  const sources = {
    'build.mjs': await read(join(ROOT, 'build.mjs')),
    'deploy/test/verify-server.mjs': await read(join(ROOT, 'deploy', 'test', 'verify-server.mjs')),
    'tools/server-configs.mjs': await read(join(ROOT, 'tools', 'server-configs.mjs')),
  };
  for (const [cmd, src] of Object.entries(sources)) {
    for (const flag of flagsOf(cmd)) assert.ok(src.includes(flag), `node ${cmd} ${flag}: the script does not know this option`);
  }
  assert.ok(flagsOf('build.mjs').has('--production'));
  assert.ok(flagsOf('deploy/test/verify-server.mjs').has('--no-canonical'));
});

test('the documents match the rules: platform paths, redirect counts, version', () => {
  const cut = docs['DOMAIN-CUTOVER.md'];
  for (const p of R.legacyPlatform.paths) assert.ok(cut.includes(`\`${p}\``), `DOMAIN-CUTOVER.md does not list the platform path ${p}`);
  for (const p of R.legacyPlatform.prefixes) assert.ok(cut.includes(`\`${p}\``), `DOMAIN-CUTOVER.md does not list the platform prefix ${p}`);
  const rules = R.legacyPlatform.paths.length + R.legacyPlatform.prefixes.length;
  assert.match(cut, new RegExp(`${rules} platform rules`), `the build prints "${rules} platform rules"`);
  assert.match(docs['DEPLOY.md'], new RegExp(`${R.oldSiteRedirects.length} addresses of the old site`));
  for (const [name, text] of [...Object.entries(docs), ['README-FIRST.html', readmeFirst]]) {
    assert.match(text, new RegExp(`[Vv]ersion ${R.VERSION.replace(/\./g, '\\.')}`), `${name} does not name version ${R.VERSION}`);
  }
});

test('README-FIRST.html is self-contained and in the site palette', () => {
  assert.doesNotMatch(readmeFirst, /<link\b|<script\b[^>]*\ssrc=|@import|url\(\s*['"]?https?:/i, 'no outside stylesheets, scripts, fonts or images');
  for (const c of ['#f8f3e9', '#0f1c18', '#a07a35']) assert.ok(readmeFirst.toLowerCase().includes(c), `palette colour ${c}`);
  assert.match(readmeFirst, /<html lang="en">/);
  assert.match(readmeFirst, /name="viewport"/);
  assert.match(readmeFirst, /TO FILL/);
});

test('privacy inventory: every browser-storage key the scripts use is listed', async () => {
  const inv = docs['PRIVACY-DATA-INVENTORY.md'];
  const files = [];
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'vendor' && e.name !== 'i18n') await walk(p); } else if (/\.(?:m?js)$/.test(e.name)) files.push(p);
    }
  };
  await walk(join(ROOT, 'src'));
  const keys = new Set();
  for (const f of files) {
    const code = await read(f);
    assert.doesNotMatch(code, /document\.cookie/, `${f} uses cookies: update the privacy inventory, then this test`);
    assert.doesNotMatch(code, /indexedDB|serviceWorker\.register|caches\.open/, `${f} uses IndexedDB, a service worker or Cache Storage: update the privacy inventory`);
    if (!/localStorage|sessionStorage/.test(code)) continue;
    for (const [, k] of code.matchAll(/['"](dp-[a-z0-9-]+)['"]/g)) keys.add(k);
  }
  assert.ok(keys.has('dp-lang') && keys.has('dp-intro'), `found ${[...keys]}`);
  for (const k of keys) assert.ok(inv.includes(`\`${k}\``), `PRIVACY-DATA-INVENTORY.md does not list the storage key ${k}`);
});

test('privacy inventory: every outside host the Content Security Policy allows is listed', () => {
  const inv = docs['PRIVACY-DATA-INVENTORY.md'];
  const hosts = new Set([...R.securityHeaders['Content-Security-Policy'].matchAll(/https:\/\/([a-z0-9.-]+)/g)].map((m) => m[1]));
  assert.ok(hosts.size >= 4);
  for (const h of hosts) assert.ok(inv.includes(`\`${h}\``), `PRIVACY-DATA-INVENTORY.md does not list ${h}, which the CSP allows`);
});

test('privacy inventory: the devotional sound feature is described as the build ships it', async () => {
  const inv = docs['PRIVACY-DATA-INVENTORY.md'];
  const html = (await readdir(SITE)).filter((f) => f.endsWith('.html'));
  assert.ok(html.length >= 16, `no built site in ${SITE}`);
  let loaded = false;
  for (const f of html) if (/devotion-sound\.js/.test(await read(join(SITE, f)))) loaded = true;
  const saysUnused = /no page loads it/.test(inv);
  assert.ok(loaded !== saysUnused,
    loaded ? 'pages now load devotion-sound.js: update PRIVACY-DATA-INVENTORY.md (dp-sound, dp-sound-pos are now set)'
      : 'PRIVACY-DATA-INVENTORY.md should say that no page loads devotion-sound.js, as in this build');
});

test('privacy inventory: the map frames and their referrer policy are as described', async () => {
  const inv = docs['PRIVACY-DATA-INVENTORY.md'];
  const withMap = [];
  for (const f of (await readdir(SITE)).filter((x) => x.endsWith('.html'))) {
    const h = await read(join(SITE, f));
    const frames = [...h.matchAll(/<iframe\b[^>]*>/g)].map((m) => m[0]);
    for (const fr of frames) {
      if (!/google\.com\/maps/.test(fr)) continue;
      withMap.push(f);
      assert.match(fr, /loading="lazy"/, `${f}: the map frame is no longer lazy-loaded; update the inventory`);
      assert.match(fr, /referrerpolicy="no-referrer-when-downgrade"/, `${f}: the map frame's referrer policy changed; update the inventory`);
    }
  }
  assert.deepEqual(withMap.sort(), ['contact.html', 'visit.html'], 'the pages with a map changed; update the inventory');
  assert.ok(inv.includes('`visit.html`') && inv.includes('`contact.html`'));
});
