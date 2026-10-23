// The hand-over packager (tools/package.mjs): its zip writer, what goes into
// source/, how it reads the build, VERSION.txt and the document link check.
//
//   node --test tests/package.test.mjs
//
// A full `npm run package` builds the site and writes ~250 MB, so it is not
// run here; these tests cover each part it is made of.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  crc32, crc32Table, dosDateTime, zipEntries, writeZip, selectSource, isJunk, SOURCE_ENTRIES, parseBuildOutput,
  configAddresses, versionLines, brokenLinks, copyTree, listTree, parseArgs, mb,
} from '../tools/package.mjs';
import { printAddresses } from '../build.mjs';
import { resolveConfig } from '../src/site.mjs';
import { buildModel, scanSite, renderRedirects, renderNginx, renderHtaccess } from '../tools/server-configs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.DP_SITE_DIR ? resolve(process.env.DP_SITE_DIR) : join(ROOT, 'site');

let TMP;
before(async () => { TMP = await mkdtemp(join(tmpdir(), 'dp package test ')); });
after(async () => { if (TMP) await rm(TMP, { recursive: true, force: true }); });

async function tree(dir, files) {
  for (const [name, body] of Object.entries(files)) {
    if (name.endsWith('/')) { await mkdir(join(dir, name), { recursive: true }); continue; }
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), body);
  }
}

// A minimal zip reader: the central directory, then each local entry checked
// against it (name, sizes, CRC of the inflated data).
function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, 'end of central directory');
  const count = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  let p = buf.readUInt32LE(eocd + 16);
  assert.equal(p + cdSize, eocd, 'central directory ends where the end record starts');
  const out = [];
  for (let i = 0; i < count; i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50, 'central header signature');
    const e = {
      madeBy: buf.readUInt16LE(p + 4), flags: buf.readUInt16LE(p + 8), method: buf.readUInt16LE(p + 10),
      time: buf.readUInt16LE(p + 12), date: buf.readUInt16LE(p + 14), crc: buf.readUInt32LE(p + 16),
      csize: buf.readUInt32LE(p + 20), size: buf.readUInt32LE(p + 24), attrs: buf.readUInt32LE(p + 38), offset: buf.readUInt32LE(p + 42),
    };
    const n = buf.readUInt16LE(p + 28);
    const x = buf.readUInt16LE(p + 30);
    const c = buf.readUInt16LE(p + 32);
    e.name = buf.subarray(p + 46, p + 46 + n).toString('utf8');
    p += 46 + n + x + c;
    const l = e.offset;
    assert.equal(buf.readUInt32LE(l), 0x04034b50, `${e.name}: local header signature`);
    const ln = buf.readUInt16LE(l + 26);
    const lx = buf.readUInt16LE(l + 28);
    assert.equal(buf.subarray(l + 30, l + 30 + ln).toString('utf8'), e.name, 'local name = central name');
    assert.equal(buf.readUInt32LE(l + 14), e.crc);
    const data = buf.subarray(l + 30 + ln + lx, l + 30 + ln + lx + e.csize);
    e.data = e.method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
    assert.equal(e.data.length, e.size, `${e.name}: size`);
    assert.equal(crc32(e.data), e.crc, `${e.name}: CRC`);
    out.push(e);
  }
  return out;
}

// ----------------------------------------------------------------- zip ---

test('CRC-32: the standard check value, zlib and table versions agree', () => {
  const nine = Buffer.from('123456789');
  assert.equal(crc32Table(nine), 0xcbf43926);
  assert.equal(crc32(nine), 0xcbf43926);
  assert.equal(crc32Table(Buffer.alloc(0)), 0);
  const big = Buffer.from(Array.from({ length: 70000 }, (_, i) => (i * 7) % 251));
  assert.equal(crc32Table(big), crc32(big));
});

test('DOS timestamps: UTC fields, 2-second steps, never before 1980', () => {
  const { time, date } = dosDateTime(new Date(Date.UTC(2026, 9, 23, 7, 41, 13)));
  assert.equal(date >> 9, 2026 - 1980);
  assert.equal((date >> 5) & 15, 10);
  assert.equal(date & 31, 23);
  assert.equal(time >> 11, 7);
  assert.equal((time >> 5) & 63, 41);
  assert.equal((time & 31) * 2, 12);
  assert.deepEqual(dosDateTime(new Date(0)), dosDateTime(new Date(Date.UTC(1980, 0, 1))));
});

test('zip: every file and folder, dotfiles kept, tree order, valid and identical on every run', async () => {
  const dir = join(TMP, 'zip src');
  await tree(dir, {
    'index.html': '<h1>home</h1>'.repeat(50),
    '.htaccess': 'RewriteEngine On',
    '_redirects': '/a /b 301',
    'kn/index.html': 'ಕನ್ನಡ',
    'assets/img/a.webp': Buffer.from([1, 2, 3, 4]),
    'assets/css/site.css': 'body{}'.repeat(200),
    'empty.txt': '',
    'empty dir/': null,
    'preview/start-preview.sh': '#!/bin/sh\necho hi\n',
    'Datta Peetham/page one.html': 'spaces',
    'a-b.txt': 'x',
  });
  const entries = await zipEntries(dir, 'pkg/');
  const names = entries.map((e) => e.name);
  assert.equal(names[0], 'pkg/');
  // each folder right before its contents, names sorted within a folder
  assert.deepEqual(names, [
    'pkg/', 'pkg/.htaccess', 'pkg/Datta Peetham/', 'pkg/Datta Peetham/page one.html', 'pkg/_redirects', 'pkg/a-b.txt',
    'pkg/assets/', 'pkg/assets/css/', 'pkg/assets/css/site.css', 'pkg/assets/img/', 'pkg/assets/img/a.webp',
    'pkg/empty dir/', 'pkg/empty.txt', 'pkg/index.html', 'pkg/kn/', 'pkg/kn/index.html', 'pkg/preview/', 'pkg/preview/start-preview.sh',
  ]);
  const mtime = new Date(Date.UTC(2026, 9, 23, 7, 41, 12));
  const a = join(TMP, 'a.zip');
  const b = join(TMP, 'b.zip');
  const r = await writeZip(a, entries, { mtime });
  await writeZip(b, await zipEntries(dir, 'pkg/'), { mtime });
  const buf = await readFile(a);
  assert.equal(r.bytes, buf.length);
  assert.ok(buf.equals(await readFile(b)), 'the same input gives the same bytes');
  const z = readZip(buf);
  assert.deepEqual(z.map((e) => e.name), names);
  const by = Object.fromEntries(z.map((e) => [e.name, e]));
  assert.equal(by['pkg/kn/index.html'].data.toString(), 'ಕನ್ನಡ');
  assert.equal(by['pkg/.htaccess'].data.toString(), 'RewriteEngine On');
  assert.equal(by['pkg/empty.txt'].size, 0);
  assert.equal(by['pkg/assets/img/a.webp'].method, 0, 'images are stored, not deflated');
  assert.equal(by['pkg/assets/css/site.css'].method, 8, 'text is deflated');
  for (const e of z) {
    assert.equal(e.flags & 0x0800, 0x0800, 'UTF-8 names');
    assert.equal(e.madeBy >> 8, 3, 'Unix attributes');
    assert.deepEqual([e.time, e.date], Object.values(dosDateTime(mtime)), 'one timestamp');
  }
  assert.equal((by['pkg/preview/start-preview.sh'].attrs >>> 16) & 0o777, 0o755, 'start-preview.sh stays executable');
  assert.equal((by['pkg/index.html'].attrs >>> 16) & 0o777, 0o644);
  assert.equal((by['pkg/empty dir/'].attrs >>> 16) & 0o170000, 0o040000, 'a folder entry');
  assert.equal(by['pkg/empty dir/'].attrs & 0x10, 0x10, 'the DOS folder bit');
  // without a prefix: the files sit at the zip root (the deploy-only zip)
  const flat = (await zipEntries(dir)).map((e) => e.name);
  assert.equal(flat[0], '.htaccess');
  assert.ok(flat.includes('index.html') && !flat.some((n) => n.startsWith('pkg/')));
});

test('zip: readable by Python\'s zipfile and by unzip, where installed', async (t) => {
  const zip = join(TMP, 'a.zip');
  if (!existsSync(zip)) return t.skip('needs the zip from the previous test');
  let python = false;
  try { execFileSync('python3', ['--version'], { stdio: 'ignore' }); python = true; } catch { /* not installed */ }
  if (python) {
    const out = execFileSync('python3', ['-I', '-c', 'import sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\nprint(z.testzip(), len(z.namelist()))', zip], { encoding: 'utf8' });
    assert.equal(out.trim(), 'None 18');
  }
  let unzip = false;
  try { execFileSync('unzip', ['-v'], { stdio: 'ignore' }); unzip = true; } catch { /* not installed */ }
  if (unzip) assert.match(execFileSync('unzip', ['-t', zip], { encoding: 'utf8' }), /No errors detected/);
  if (!python && !unzip) t.skip('neither python3 nor unzip is installed');
});

// ------------------------------------------------------------- source/ ---

test('source/: the project list, never node_modules, caches, builds or the release; strays reported', async () => {
  const root = join(TMP, 'project');
  await tree(root, {
    'package.json': '{}', 'package-lock.json': '{}', 'build.mjs': '', 'site.config.json': '{}', 'README.md': '', 'vercel.json': '{}', '.gitignore': '',
    'src/a.mjs': '', 'tools/t.mjs': '', 'deploy/routes.mjs': '', 'tests/t.mjs': '', 'qa/q.mjs': '', 'docs/handover/x.md': '', 'preview/serve.mjs': '', 'photos/originals/README.md': '',
    'node_modules/x/index.js': '', '.cache/i18n/r.json': '', 'site/index.html': '', 'release/old.zip': '', '.site-tmp-1-2/index.html': '', 'site-old-1-2/index.html': '', '.git/config': '',
    'stray.log': 'x', 'notes/': null,
  });
  const sel = await selectSource(root);
  assert.deepEqual(sel.include, [...SOURCE_ENTRIES].sort());
  assert.deepEqual(sel.skipped, ['notes', 'stray.log']);
  assert.deepEqual(sel.missing, []);
  await rm(join(root, 'build.mjs'));
  assert.deepEqual((await selectSource(root)).missing, ['build.mjs']);
  // the real project has everything it needs, and nothing unexpected is dropped silently
  const real = await selectSource(ROOT);
  assert.deepEqual(real.missing, []);
  for (const n of ['src', 'tools', 'deploy', 'docs', 'tests', 'qa', 'preview', 'build.mjs', 'package.json', 'site.config.json', 'vercel.json', 'README.md']) assert.ok(real.include.includes(n), n);
  for (const n of ['node_modules', '.cache', 'site', 'release']) assert.ok(!real.include.includes(n) && !real.skipped.includes(n), n);
});

test('source/: junk is left out at any depth', async () => {
  for (const n of ['node_modules', '.cache', '__pycache__', '.DS_Store', 'Thumbs.db', 'desktop.ini', 'x.pyc', '.site-tmp-12-34', 'site-old-12-34']) assert.equal(isJunk(n), true, n);
  for (const n of ['.htaccess', '.gitignore', 'index.html', 'cache.mjs', 'site.css', 'photos']) assert.equal(isJunk(n), false, n);
  const src = join(TMP, 'copy src');
  await tree(src, { 'a/b.txt': 'b', 'a/.DS_Store': 'x', 'a/__pycache__/c.pyc': 'x', '.hidden': 'h', 'z.txt': 'z' });
  const copied = await copyTree(src, join(TMP, 'copy dest'), { filter: (rel) => !isJunk(rel.split('/').pop()) });
  assert.deepEqual(copied, ['.hidden', 'a/b.txt', 'z.txt']);
  assert.deepEqual(await listTree(join(TMP, 'copy dest')), ['.hidden', 'a/b.txt', 'z.txt']);
});

// --------------------------------------------------------- the build ---

test('reads the addresses as build.mjs prints them', () => {
  const FILE = { siteUrl: 'https://www.dattapeetham.org', legacyPlatformUrl: 'https://www.dattapeetham.org' };
  const capture = (cfg) => {
    const out = [];
    const { log, warn } = console;
    console.log = (...a) => out.push(a.join(' '));
    console.warn = (...a) => out.push(a.join(' '));
    try { printAddresses(cfg); } finally { console.log = log; console.warn = warn; }
    return out.join('\n');
  };
  const same = parseBuildOutput(capture(resolveConfig({ argv: [], env: {}, file: FILE })));
  assert.equal(same.siteUrl, 'https://www.dattapeetham.org');
  assert.equal(same.legacyUrl, 'https://www.dattapeetham.org');
  assert.equal(same.sameHost, true);
  const split = parseBuildOutput(capture(resolveConfig({ argv: ['--legacy-url=https://seva.dattapeetham.org'], env: {}, file: FILE })));
  assert.equal(split.legacyUrl, 'https://seva.dattapeetham.org');
  assert.equal(split.sameHost, false);
  assert.equal(split.siblingHost, false);
  assert.equal(parseBuildOutput(capture(resolveConfig({ argv: ['--legacy-url=https://dattapeetham.org'], env: {}, file: FILE }))).siblingHost, true);
});

test('reads the page count and translation coverage lines the build prints', () => {
  const src = readFileSync(join(ROOT, 'build.mjs'), 'utf8');
  // the two lines parseBuildOutput depends on are still printed in this form
  assert.ok(src.includes('console.log(`Built ${pages.length} pages × 5 languages'), 'build.mjs: the "Built N pages" line');
  assert.ok(src.includes("console.log('Translation coverage: '"), 'build.mjs: the coverage line');
  const r = parseBuildOutput([
    'Built 16 pages × 5 languages, 129 search entries in 3232 ms → /x/site',
    'Translation coverage: kn 100% (0 missing, 0 rejected) · hi 99.5% (3 missing, 1 rejected)',
  ].join('\n'));
  assert.equal(r.pages, 16);
  assert.equal(r.languages, 5);
  assert.equal(r.coverage, 'kn 100% (0 missing, 0 rejected) · hi 99.5% (3 missing, 1 rejected)');
  assert.deepEqual(parseBuildOutput(''), { siteUrl: undefined, legacyUrl: undefined, pages: undefined, languages: undefined, coverage: undefined, sameHost: false, siblingHost: false });
});

test('reads the addresses each generated server file was written for', { skip: !existsSync(join(SITE, 'index.html')) && 'no built site' }, async () => {
  const scan = await scanSite(SITE);
  for (const legacyUrl of ['https://www.dattapeetham.org', 'https://seva.dattapeetham.org']) {
    const m = await buildModel({ siteUrl: 'https://www.dattapeetham.org', legacyUrl, scan });
    for (const text of [renderRedirects(m), renderNginx(m), renderHtaccess(m)]) {
      assert.deepEqual(configAddresses(text), { siteUrl: 'https://www.dattapeetham.org', legacyUrl });
    }
  }
});

// ----------------------------------------------------------- VERSION ---

const V = {
  version: '1.0.0', builtAt: new Date(Date.UTC(2026, 9, 23, 7, 41, 12)), packagedAt: new Date(Date.UTC(2026, 9, 23, 7, 42, 0)),
  git: { hash: '7f513850000000000000000000000000000000ab', dirty: false, branch: 'main' },
  siteUrl: 'https://www.dattapeetham.org', legacyUrl: 'https://seva.dattapeetham.org', sameHost: false, siblingHost: false,
  pages: 16, languageCodes: ['en', 'kn', 'hi', 'ta', 'te'], htmlFiles: 80,
  coverage: 'kn 100% (0 missing, 0 rejected) · hi 100% (0 missing, 0 rejected)', websiteFiles: 699, websiteBytes: 94162944, node: 'v22.22.0',
};

test('VERSION.txt: version, dates, commit, addresses, pages, languages, coverage', () => {
  const text = versionLines(V).join('\n');
  assert.match(text, /^Version\s+1\.0\.0$/m);
  assert.match(text, /^Built\s+2026-10-23 07:41:12 UTC$/m);
  assert.match(text, /^Packaged\s+2026-10-23 07:42:00 UTC$/m);
  assert.match(text, /^Source commit\s+7f513850000000000000000000000000000000ab \(branch main\)$/m);
  assert.match(text, /^Site address\s+https:\/\/www\.dattapeetham\.org {2}\(siteUrl\)$/m);
  assert.match(text, /^Existing platform\s+https:\/\/seva\.dattapeetham\.org {2}\(legacyPlatformUrl\)$/m);
  assert.match(text, /^Pages\s+16 pages x 5 languages \(English, Kannada, Hindi, Tamil, Telugu\) = 80 HTML files$/m);
  assert.match(text, /^Translation\s+kn 100% \(0 missing, 0 rejected\); hi 100%/m);
  assert.match(text, /^website\/\s+699 files, 89\.8 MB$/m);
  assert.doesNotMatch(text, /WARNING|uncommitted|not yet committed/);
  assert.doesNotMatch(text, /[^\x00-\x7f]/, 'ASCII, for any text editor');
});

test('VERSION.txt: says so when the platform shares the host, the tree had changes, or there is no git', () => {
  const same = versionLines({ ...V, legacyUrl: V.siteUrl, sameHost: true }).join('\n');
  assert.match(same, /WARNING: the existing platform is on the same host/);
  // the same advice as DOMAIN-CUTOVER.md, step 3: edit the config, then rebuild
  assert.match(same, /set legacyPlatformUrl in source\/site\.config\.json/);
  assert.match(same, /\(docs\/DOMAIN-CUTOVER\.md, step 3\)/);
  assert.doesNotMatch(same, /--legacy-url=/);
  assert.match(versionLines({ ...V, siblingHost: true }).join('\n'), /differ only by "www\."/);
  assert.match(versionLines({ ...V, git: { ...V.git, dirty: true } }).join('\n'), /not yet committed/);
  assert.match(versionLines({ ...V, git: null }).join('\n'), /^Source commit\s+not available/m);
  assert.match(versionLines({ ...V, coverage: undefined }).join('\n'), /not reported by the build/);
});

// --------------------------------------------------------------- misc ---

test('document link check: relative links must resolve inside the package', async () => {
  const pkg = join(TMP, 'pkg');
  await tree(pkg, {
    'website/index.html': '', 'docs/DOMAIN-CUTOVER.md': '', 'preview/Start-Preview.cmd': '', 'docs/i18n/kn-review.md': '',
    'README-FIRST.html': '<a href="website/index.html">x</a><a href="docs/DOMAIN-CUTOVER.md#step-2">y</a><a href="preview/Start-Preview.cmd">z</a>'
      + '<a href="https://nodejs.org">n</a><a href="mailto:a@b.c">m</a><a href="#top">t</a><img src="docs/missing.png"><a href="source/nope.md">s</a>',
    'docs/guide.md': '[a](DOMAIN-CUTOVER.md) [b](i18n/kn-review.md "title") [c](../../deploy/README.md) [d](https://x.org) [e](#here)',
  });
  assert.deepEqual(await brokenLinks(join(pkg, 'README-FIRST.html'), pkg), ['docs/missing.png', 'source/nope.md']);
  assert.deepEqual(await brokenLinks(join(pkg, 'docs', 'guide.md'), pkg), ['../../deploy/README.md']);
});

test('command line: only the build\'s address flags pass through', () => {
  assert.deepEqual(parseArgs([]).flags, []);
  assert.deepEqual(parseArgs(['--legacy-url=https://seva.dattapeetham.org', '--site-url=https://www.dattapeetham.org', '--production']).flags,
    ['--legacy-url=https://seva.dattapeetham.org', '--site-url=https://www.dattapeetham.org', '--production']);
  assert.equal(parseArgs(['--help']).help, true);
  assert.throws(() => parseArgs(['--out=/tmp/x']), /unknown option/);
  assert.throws(() => parseArgs(['--legacy-url=']), /unknown option/);
  assert.equal(mb(94162944), '89.8 MB');
});

test('package.json runs it, and the release folder is not committed', async () => {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.package, 'node tools/package.mjs');
  for (const f of ['tests/preview.test.mjs', 'tests/package.test.mjs']) assert.ok(pkg.scripts.test.includes(f), `npm test runs ${f}`);
  assert.match(await readFile(join(ROOT, '.gitignore'), 'utf8'), /^release\/$/m);
});

// ------------------------------------------------- nothing of this machine ---

// source/ goes to the Peetham. It must not carry paths of the machine the site
// was built on (agent upload and scratch folders, this checkout's location):
// they mean nothing there and expose internal tooling. Built from parts so
// that this file does not match itself.
const MACHINE_PATHS = new RegExp([
  ['/root', '/\\.claude'].join(''),
  ['/tmp', '/claude-'].join(''),
  ['/home', '/user/'].join(''),
  ['scratch', 'pad/'].join(''),
].join('|'));
const BINARY = /\.(?:webp|avif|png|jpe?g|gif|ico|mp3|m4a|ogg|mp4|webm|woff2?|ttf|otf|zip|gz|pdf|pyc)$/i;

test('source/: no paths of the build machine in any file that ships', async () => {
  const { include } = await selectSource(ROOT);
  const hits = [];
  let files = 0;
  const scan = async (rel) => {
    files++;
    const lines = (await readFile(join(ROOT, ...rel.split('/')), 'utf8')).split('\n');
    lines.forEach((line, i) => { if (MACHINE_PATHS.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`); });
  };
  const walk = async (rel) => {
    for (const e of await readdir(join(ROOT, ...rel.split('/')), { withFileTypes: true })) {
      if (isJunk(e.name)) continue;
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) await walk(r);
      else if (e.isFile() && !BINARY.test(e.name)) await scan(r);
    }
  };
  for (const n of include) {
    if (statSync(join(ROOT, n)).isDirectory()) await walk(n);
    else if (!BINARY.test(n)) await scan(n);
  }
  assert.ok(files > 100, `only ${files} files scanned`);
  assert.deepEqual(hits, [], 'use paths relative to the project, or describe the place instead');
});
