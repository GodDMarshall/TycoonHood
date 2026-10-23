#!/usr/bin/env node
// The hand-over package: everything the Peetham needs to put the website
// online, look at it locally, and edit and rebuild it later.
//
//   npm run package
//   npm run package -- --legacy-url=https://seva.dattapeetham.org [--site-url=https://…] [--production]
//
// 1. A fresh build: `node build.mjs` with the same flags. (A build of ./site
//    also writes vercel.json and deploy/nginx|cloudflare for its addresses.)
// 2. release/dattapeetham-website-v<version>/
//      README-FIRST.html  start here (from docs/handover/README-FIRST.html)
//      VERSION.txt        version, build date, commit, addresses, pages, translation coverage
//      website/           the built site, hidden .htaccess included: upload the CONTENTS
//                         of this folder to the web root
//      preview/           look at the site locally: Start-Preview.cmd (Windows),
//                         start-preview.sh (macOS / Linux), serve.mjs
//      server-configs/    each server's configuration, copied for reference
//      docs/              the hand-over documents (docs/handover) and the translation
//                         review notes (docs/i18n)
//      source/            the project, to edit and rebuild: no node_modules, caches or builds
// 3. release/dattapeetham-website-v<version>.zip              that folder
//    release/dattapeetham-website-v<version>-deploy-only.zip  the website files alone, at the
//                                                           zip root, ready to upload
//    release/SHA256SUMS.txt
//
// The zips are written here (no zip program needed): entries in a fixed order
// (folder by folder, names sorted), one timestamp (the build's), dotfiles
// kept, start-preview.sh executable. The package is assembled in a staging
// folder and moved into place only when complete, so a failed run leaves the
// previous package as it was.

import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, realpathSync } from 'node:fs';
import { chmod, copyFile, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const RELEASE = join(ROOT, 'release');

export const LANGUAGE_NAMES = { en: 'English', kn: 'Kannada', hi: 'Hindi', ta: 'Tamil', te: 'Telugu' };

// ------------------------------------------------------------- source/ ---

// Top-level entries of the project that make up source/. An allow-list, so a
// stray file (a log, a screenshot) never ships by accident; anything else at
// the top level is reported, so nothing new is dropped silently either.
export const SOURCE_ENTRIES = [
  '.gitignore', 'README.md', 'build.mjs', 'package-lock.json', 'package.json', 'site.config.json', 'vercel.json',
  'deploy', 'docs', 'photos', 'preview', 'qa', 'src', 'tests', 'tools',
];
const REQUIRED = new Set(['README.md', 'build.mjs', 'package.json', 'site.config.json', 'deploy', 'docs', 'preview', 'src', 'tools']);
// Never source: dependencies, caches, builds, the release itself, version control.
const NOT_SOURCE = /^(?:node_modules|\.cache|site|release|\.git|\.site-tmp-.*|site-old-.*)$/;
// Never copied, at any depth.
const JUNK = /^(?:node_modules|\.cache|__pycache__|\.DS_Store|Thumbs\.db|desktop\.ini|\.site-tmp-.*|site-old-.*)$|\.pyc$/i;

/** The top-level entries of `root` for source/: { include, skipped, missing }. */
export async function selectSource(root) {
  const names = (await readdir(root)).sort();
  const include = names.filter((n) => SOURCE_ENTRIES.includes(n));
  const skipped = names.filter((n) => !SOURCE_ENTRIES.includes(n) && !NOT_SOURCE.test(n));
  const missing = [...REQUIRED].filter((n) => !names.includes(n));
  return { include, skipped, missing };
}

export const isJunk = (name) => JUNK.test(name);

// ------------------------------------------------------------ the build ---

/** What the build printed: addresses, page and language counts, translation coverage. */
export function parseBuildOutput(text) {
  const grab = (re) => (re.exec(text) || [])[1];
  const built = /^Built (\d+) pages \S (\d+) languages/m.exec(text);
  return {
    siteUrl: grab(/^Site address:\s+(\S+)/m),
    legacyUrl: grab(/^Legacy platform:\s+(\S+)/m),
    pages: built ? Number(built[1]) : undefined,
    languages: built ? Number(built[2]) : undefined,
    coverage: grab(/^Translation coverage: (.+)$/m),
    sameHost: /legacyPlatformUrl has the same host as siteUrl/.test(text),
    siblingHost: /differ only by "www\."/.test(text),
  };
}

/** The addresses a generated server file says it was written for (its header). */
export function configAddresses(text) {
  return {
    siteUrl: (/^#\s+site:\s+(\S+)/m.exec(text) || [])[1],
    legacyUrl: (/^#\s+legacy platform:\s+(\S+)/m.exec(text) || [])[1],
  };
}

function runBuild(flags) {
  return new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'build.mjs'), ...flags], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
    child.stderr.on('data', (d) => { out += d; process.stderr.write(d); });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolveP(out) : reject(new Error(`the build failed (exit code ${code}), so nothing was packaged`))));
  });
}

function gitInfo() {
  try {
    const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const hash = git(['rev-parse', 'HEAD']);
    const dirty = git(['status', '--porcelain', '--', '.']) !== '';
    let branch = '';
    try { branch = git(['rev-parse', '--abbrev-ref', 'HEAD']); } catch { /* detached */ }
    return { hash, dirty, branch: branch && branch !== 'HEAD' ? branch : '' };
  } catch {
    return null;
  }
}

// --------------------------------------------------------------- files ---

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/**
 * Copies a folder tree. `filter(rel, isDir)` decides per entry (rel uses
 * "/"). Symlinked files are copied as files; symlinked folders are skipped
 * and reported through `warn`. Returns the relative paths of the files copied.
 */
export async function copyTree(src, dest, { filter = () => true, warn = () => {}, rel = '' } = {}) {
  await mkdir(dest, { recursive: true });
  const out = [];
  for (const e of (await readdir(src, { withFileTypes: true })).sort(byName)) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    const from = join(src, e.name);
    let isDir = e.isDirectory();
    let isFile = e.isFile();
    if (e.isSymbolicLink()) {
      const st = await stat(from).catch(() => null);
      if (st && st.isDirectory()) { warn(`skipped the symlinked folder ${r}`); continue; }
      isFile = Boolean(st && st.isFile());
      isDir = false;
    }
    if (!isDir && !isFile) continue;
    if (!filter(r, isDir)) continue;
    if (isDir) out.push(...(await copyTree(from, join(dest, e.name), { filter, warn, rel: r })));
    else { await copyFile(from, join(dest, e.name)); out.push(r); }
  }
  return out;
}

/** Every file under dir, relative with "/", in tree order. */
export async function listTree(dir, rel = '') {
  const out = [];
  for (const e of (await readdir(dir, { withFileTypes: true })).sort(byName)) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await listTree(join(dir, e.name), r)));
    else out.push(r);
  }
  return out;
}

async function sha256File(file) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}

/** Throws unless the two trees hold the same files with the same bytes. */
async function assertSameTree(a, b) {
  const [la, lb] = await Promise.all([listTree(a), listTree(b)]);
  if (la.join('\n') !== lb.join('\n')) throw new Error(`the copy of ${a} does not list the same files`);
  for (const f of la) {
    const [x, y] = await Promise.all([sha256File(join(a, ...f.split('/'))), sha256File(join(b, ...f.split('/')))]);
    if (x !== y) throw new Error(`${f} changed while it was being copied`);
  }
  return la;
}

async function treeSize(dir) {
  let n = 0;
  let bytes = 0;
  for (const f of await listTree(dir)) { n++; bytes += (await stat(join(dir, ...f.split('/')))).size; }
  return { files: n, bytes };
}

export const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

// ----------------------------------------------------------------- zip ---

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (ISO 3309, as zip uses), in JavaScript. */
export function crc32Table(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** CRC-32: zlib.crc32 where Node has it (22.2+, 20.15+), else crc32Table. */
export function crc32(buf) {
  return typeof zlib.crc32 === 'function' ? zlib.crc32(buf) >>> 0 : crc32Table(buf);
}

/** MS-DOS date and time fields (UTC, 2-second resolution, 1980 at the earliest). */
export function dosDateTime(d) {
  const t = d.getTime() < Date.UTC(1980, 0, 1) ? new Date(Date.UTC(1980, 0, 1)) : d;
  return {
    time: (t.getUTCHours() << 11) | (t.getUTCMinutes() << 5) | Math.floor(t.getUTCSeconds() / 2),
    date: ((t.getUTCFullYear() - 1980) << 9) | ((t.getUTCMonth() + 1) << 5) | t.getUTCDate(),
  };
}

// Already compressed: stored as they are.
const STORED = /\.(?:webp|avif|png|jpe?g|gif|mp3|m4a|ogg|mp4|webm|woff2?|zip|gz|br|7z|pdf)$/i;

/**
 * Zip entries for a folder, in tree order: each folder entry before its
 * contents. `prefix` is prepended to every name ("" or "name/").
 */
export async function zipEntries(dir, prefix = '') {
  const out = prefix ? [{ name: prefix, dir: true }] : [];
  const walk = async (d, rel) => {
    for (const e of (await readdir(d, { withFileTypes: true })).sort(byName)) {
      const name = `${prefix}${rel}${e.name}`;
      if (e.isDirectory()) { out.push({ name: `${name}/`, dir: true }); await walk(join(d, e.name), `${rel}${e.name}/`); }
      else if (e.isFile()) out.push({ name, file: join(d, e.name) });
    }
  };
  await walk(dir, '');
  return out;
}

/**
 * Writes a zip of `entries` ({ name, dir } or { name, file, mode? }) to
 * `outFile`. Every entry gets the timestamp `mtime`; files are 0644 (0755 for
 * *.sh or an explicit mode), folders 0755, names UTF-8. No ZIP64: refuses
 * more than 65,535 entries or 4 GB. Returns { entries, bytes }.
 */
export async function writeZip(outFile, entries, { mtime = new Date() } = {}) {
  if (entries.length > 0xffff) throw new Error(`${entries.length} entries is more than a zip without ZIP64 can hold`);
  const { time, date } = dosDateTime(mtime);
  const fh = await open(outFile, 'w');
  const central = [];
  let offset = 0;
  const write = async (buf) => { await fh.write(buf); offset += buf.length; };
  try {
    for (const e of entries) {
      const name = Buffer.from(e.name, 'utf8');
      let data = Buffer.alloc(0);
      let method = 0;
      let crc = 0;
      let size = 0;
      if (!e.dir) {
        const raw = await readFile(e.file);
        size = raw.length;
        crc = crc32(raw);
        data = raw;
        if (!STORED.test(e.name) && raw.length > 0) {
          const z = zlib.deflateRawSync(raw, { level: 9 });
          if (z.length < raw.length) { data = z; method = 8; }
        }
      }
      if (offset + 30 + name.length + data.length > 0xffffffff) throw new Error('the zip would be larger than 4 GB, which needs ZIP64');
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4); // version needed: 2.0
      local.writeUInt16LE(0x0800, 6); // UTF-8 names
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(data.length, 18);
      local.writeUInt32LE(size, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);
      const at = offset;
      await write(Buffer.concat([local, name, data]));
      const mode = e.dir ? 0o40755 : 0o100000 | (e.mode ?? (/\.sh$/.test(e.name) ? 0o755 : 0o644));
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0);
      c.writeUInt16LE((3 << 8) | 20, 4); // made by: Unix, 2.0 (so the mode below is read)
      c.writeUInt16LE(20, 6);
      c.writeUInt16LE(0x0800, 8);
      c.writeUInt16LE(method, 10);
      c.writeUInt16LE(time, 12);
      c.writeUInt16LE(date, 14);
      c.writeUInt32LE(crc, 16);
      c.writeUInt32LE(data.length, 20);
      c.writeUInt32LE(size, 24);
      c.writeUInt16LE(name.length, 28);
      c.writeUInt16LE(0, 30); // extra
      c.writeUInt16LE(0, 32); // comment
      c.writeUInt16LE(0, 34); // disk
      c.writeUInt16LE(0, 36); // internal attributes
      c.writeUInt32LE(((mode << 16) | (e.dir ? 0x10 : 0)) >>> 0, 38);
      c.writeUInt32LE(at, 42);
      central.push(Buffer.concat([c, name]));
    }
    const cd = Buffer.concat(central);
    const cdAt = offset;
    await write(cd);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(cd.length, 12);
    end.writeUInt32LE(cdAt, 16);
    end.writeUInt16LE(0, 20);
    await write(end);
  } finally {
    await fh.close();
  }
  return { entries: entries.length, bytes: offset };
}

// ------------------------------------------------------------ VERSION ---

const iso = (d) => d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

/** The text of VERSION.txt (lines; the caller joins them). */
export function versionLines(v) {
  const pad = (k) => k.padEnd(20);
  const L = [
    'Avadhoota Datta Peetham website - release information',
    '',
    `${pad('Version')}${v.version}`,
    `${pad('Built')}${iso(v.builtAt)}`,
    `${pad('Packaged')}${iso(v.packagedAt)}`,
  ];
  if (v.git) {
    L.push(`${pad('Source commit')}${v.git.hash}${v.git.branch ? ` (branch ${v.git.branch})` : ''}`);
    if (v.git.dirty) L.push(`${pad('')}The project had changes not yet committed when this package was made,`, `${pad('')}so source/ is that commit plus those changes.`);
  } else {
    L.push(`${pad('Source commit')}not available (the project was not a git checkout)`);
  }
  L.push(
    `${pad('Site address')}${v.siteUrl}  (siteUrl)`,
    `${pad('Existing platform')}${v.legacyUrl}  (legacyPlatformUrl)`,
  );
  if (v.sameHost) {
    L.push(
      `${pad('')}WARNING: the existing platform is on the same host as this site, so the`,
      `${pad('')}links for puja booking, donations, sign-in and the store point at this site`,
      `${pad('')}itself. Before this site takes over the domain, move the platform to its`,
      `${pad('')}own host, set legacyPlatformUrl in source/site.config.json to that address`,
      `${pad('')}and rebuild (docs/DOMAIN-CUTOVER.md, step 3).`,
    );
  } else if (v.siblingHost) {
    L.push(`${pad('')}NOTE: the two hosts differ only by "www."; make sure the platform address`, `${pad('')}serves the existing platform itself and does not redirect to this site.`);
  }
  const names = v.languageCodes.map((c) => LANGUAGE_NAMES[c] || c).join(', ');
  L.push(
    `${pad('Pages')}${v.pages} pages x ${v.languageCodes.length} languages (${names}) = ${v.htmlFiles} HTML files`,
    `${pad('Translation')}${(v.coverage || 'not reported by the build').replace(/\s+·\s+/g, '; ')}`,
    `${pad('website/')}${v.websiteFiles} files, ${mb(v.websiteBytes)}`,
    `${pad('Built with')}Node.js ${v.node}`,
  );
  return L;
}

// --------------------------------------------------------------- links ---

/** Relative links in an HTML or Markdown file that point at nothing inside `base`. */
export async function brokenLinks(file, base, text) {
  text ??= await readFile(file, 'utf8');
  const refs = file.endsWith('.html')
    ? [...text.matchAll(/\s(?:href|src)\s*=\s*"([^"]*)"/gi)].map((m) => m[1].replace(/&amp;/g, '&'))
    : [...text.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]);
  const out = [];
  for (const ref of refs) {
    if (!ref || ref.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('//')) continue;
    let path;
    try { path = decodeURI(ref.split(/[?#]/)[0]); } catch { out.push(ref); continue; }
    if (!path) continue;
    const target = path.startsWith('/') ? join(base, path) : join(dirname(file), path);
    if (!(await stat(target).catch(() => null))) out.push(ref);
  }
  return [...new Set(out)];
}

// ---------------------------------------------------------------- main ---

const USAGE = `Usage: npm run package [-- --site-url=https://... --legacy-url=https://... --production]

  --site-url=URL     where the website will be served (default: site.config.json)
  --legacy-url=URL   where the existing platform runs: bookings, donations,
                     sign-in, store (default: site.config.json)
  --production       refuse a platform address on the site's own host`;

export function parseArgs(argv) {
  const flags = [];
  for (const a of argv) {
    if (a === '--help' || a === '-h') return { help: true, flags };
    if (/^--(?:site-url|legacy-url)=./.test(a) || a === '--production') flags.push(a);
    else throw new Error(`unknown option ${a}\n\n${USAGE}`);
  }
  return { help: false, flags };
}

const CRLF = (lines) => `${lines.join('\r\n')}\r\n`;

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (args.help) { console.log(USAGE); return; }

  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const version = pkg.version;
  const routes = await import(new URL('../deploy/routes.mjs', import.meta.url));
  const warnings = [];
  if (routes.VERSION !== version) warnings.push(`package.json says version ${version} but deploy/routes.mjs says ${routes.VERSION}`);
  const NAME = `dattapeetham-website-v${version}`;

  // 1. a fresh build
  console.log(`Packaging ${NAME}\n\n1. Building the site (node build.mjs ${args.flags.join(' ')})`.trimEnd());
  const out = await runBuild(args.flags);
  const built = parseBuildOutput(out);
  const builtAt = (await stat(join(SITE, 'index.html'))).mtime;

  // 2. assemble in a staging folder
  await mkdir(RELEASE, { recursive: true });
  const STAGE = join(RELEASE, `.staging-${process.pid}`);
  await rm(STAGE, { recursive: true, force: true });
  const P = join(STAGE, NAME);
  await mkdir(P, { recursive: true });
  try {
    console.log(`\n2. Assembling release/${NAME}/`);

    // website/: an exact copy of site/. A dev server (npm run dev) may swap
    // site/ for a rebuild meanwhile: copy again if site/ changed under us.
    const W = join(P, 'website');
    let websiteFiles;
    for (let attempt = 1; ; attempt++) {
      const before = await stat(SITE);
      await rm(W, { recursive: true, force: true });
      await copyTree(SITE, W);
      const after = await stat(SITE);
      const swapped = before.ino !== after.ino || before.birthtimeMs !== after.birthtimeMs;
      try {
        if (swapped) throw new Error('site/ was replaced');
        websiteFiles = await assertSameTree(SITE, W);
        break;
      } catch (e) {
        if (attempt === 3) throw new Error(`site/ kept changing while it was being copied (${e.message}); stop any running \`npm run dev\` and package again`);
        console.warn(`  site/ changed while it was being copied (a dev server rebuilding?); copying again`);
      }
    }
    // The copy must be the build this run made: same addresses in its server files.
    const redirectsText = await readFile(join(W, '_redirects'), 'utf8');
    const inSite = configAddresses(redirectsText);
    if (built.siteUrl && (inSite.siteUrl !== built.siteUrl || inSite.legacyUrl !== built.legacyUrl)) {
      throw new Error(`site/ was rebuilt by another process for ${inSite.siteUrl} / ${inSite.legacyUrl} instead of ${built.siteUrl} / ${built.legacyUrl}; stop any running \`npm run dev\` and package again`);
    }
    const siteUrl = built.siteUrl || inSite.siteUrl;
    const legacyUrl = built.legacyUrl || inSite.legacyUrl;
    console.log(`  website/         ${websiteFiles.length} files (exact copy of site/, dotfiles included)`);

    // source/: the project to edit and rebuild
    const S = join(P, 'source');
    const sel = await selectSource(ROOT);
    if (sel.missing.length) throw new Error(`the project is missing ${sel.missing.join(', ')}`);
    for (const n of sel.skipped) warnings.push(`not packaged in source/: ${n} (not part of the project list in tools/package.mjs; add it to SOURCE_ENTRIES if it belongs)`);
    await mkdir(S, { recursive: true });
    const junkSeen = new Set();
    const filter = (rel) => { const base = rel.split('/').pop(); if (isJunk(base)) { junkSeen.add(base); return false; } return true; };
    let sourceFiles = 0;
    for (const n of sel.include) {
      const from = join(ROOT, n);
      if ((await stat(from)).isDirectory()) sourceFiles += (await copyTree(from, join(S, n), { filter, warn: (w) => warnings.push(`source/${n}: ${w}`) })).length;
      else { await copyFile(from, join(S, n)); sourceFiles++; }
    }
    // Rebuilding from source/ must give this package's addresses, also when
    // they came from flags or the environment rather than site.config.json.
    const cfgFile = join(S, 'site.config.json');
    const cfg = JSON.parse(await readFile(cfgFile, 'utf8'));
    let configNote = '';
    if (cfg.siteUrl !== siteUrl || cfg.legacyPlatformUrl !== legacyUrl) {
      cfg.siteUrl = siteUrl;
      cfg.legacyPlatformUrl = legacyUrl;
      await writeFile(cfgFile, `${JSON.stringify(cfg, null, 2)}\n`);
      configNote = `source/site.config.json was set to these addresses so that a rebuild from source/ gives the same site; the project's own site.config.json is unchanged (put them there to keep them)`;
    }
    console.log(`  source/          ${sourceFiles} files (${sel.include.join(', ')})${junkSeen.size ? `; left out ${[...junkSeen].sort().join(', ')}` : ''}`);

    // docs/: the hand-over documents and the translation review notes
    const D = join(P, 'docs');
    const handover = join(ROOT, 'docs', 'handover');
    const docs = await copyTree(handover, D, { filter: (rel) => rel !== 'README-FIRST.html' && !isJunk(rel.split('/').pop()) }).catch((e) => { warnings.push(`docs/handover: ${e.message}`); return []; });
    const reviews = await copyTree(join(ROOT, 'docs', 'i18n'), join(D, 'i18n'), { filter: (rel, isDir) => isDir || /\.md$/i.test(rel) }).catch((e) => { warnings.push(`docs/i18n: ${e.message}`); return []; });
    let readme = false;
    try { await copyFile(join(handover, 'README-FIRST.html'), join(P, 'README-FIRST.html')); readme = true; } catch { warnings.push('docs/handover/README-FIRST.html does not exist, so the package has no README-FIRST.html'); }
    console.log(`  docs/            ${docs.length} hand-over files, ${reviews.length} translation review notes${readme ? '; README-FIRST.html at the top' : ''}`);

    // preview/: the local preview server and its launchers
    const V = join(P, 'preview');
    await mkdir(V, { recursive: true });
    for (const f of ['serve.mjs', 'Start-Preview.cmd', 'start-preview.sh']) {
      let text = await readFile(join(ROOT, 'preview', f), 'utf8');
      // Windows batch files need CRLF; shell scripts must not have it.
      if (f.endsWith('.cmd')) text = text.replace(/\r?\n/g, '\r\n');
      if (f.endsWith('.sh')) text = text.replace(/\r\n/g, '\n');
      await writeFile(join(V, f), text);
      if (f.endsWith('.sh')) await chmod(join(V, f), 0o755).catch(() => {});
    }
    console.log('  preview/         serve.mjs, Start-Preview.cmd, start-preview.sh');

    // server-configs/: copies for reference, all for the same addresses
    const C = join(P, 'server-configs');
    await mkdir(join(C, 'nginx'), { recursive: true });
    await mkdir(join(C, 'cloudflare'), { recursive: true });
    for (const f of ['.htaccess', '_headers', '_redirects', 'web.config']) await copyFile(join(W, f), join(C, f));
    await copyFile(join(ROOT, 'deploy', 'nginx', 'dattapeetham.conf'), join(C, 'nginx', 'dattapeetham.conf'));
    await copyFile(join(ROOT, 'deploy', 'cloudflare', 'wrangler.jsonc'), join(C, 'cloudflare', 'wrangler.jsonc'));
    await copyTree(join(ROOT, 'deploy', 'apache'), join(C, 'apache'));
    await copyFile(join(ROOT, 'vercel.json'), join(C, 'vercel.json'));
    const nginx = configAddresses(await readFile(join(C, 'nginx', 'dattapeetham.conf'), 'utf8'));
    if (nginx.siteUrl !== siteUrl || nginx.legacyUrl !== legacyUrl) {
      throw new Error(`deploy/nginx/dattapeetham.conf was written for ${nginx.siteUrl} / ${nginx.legacyUrl}, not ${siteUrl} / ${legacyUrl}; another build ran meanwhile; stop any running \`npm run dev\` and package again`);
    }
    await writeFile(join(C, 'README.txt'), CRLF([
      'Server configuration files, copied here for reference',
      '',
      'The website folder already carries the files most hosts read by themselves:',
      '.htaccess (Apache, cPanel), web.config (IIS), _headers and _redirects',
      '(Netlify, Cloudflare). They are copied here so they can be read without',
      'opening the website folder. On macOS and Linux .htaccess is a hidden file.',
      '',
      '  .htaccess                  Apache 2.4, cPanel and most shared hosting',
      '  web.config                 Microsoft IIS with the URL Rewrite module',
      '  _headers, _redirects       Netlify, Cloudflare',
      '  nginx/dattapeetham.conf    nginx. The instructions are at the top of the file;',
      '                             the contents of website/ go in its root folder',
      '                             (/var/www/dattapeetham/site unless you change it).',
      '  apache/                    what the .htaccess needs from an Apache server you',
      '                             configure yourself (not needed on cPanel)',
      '  cloudflare/wrangler.jsonc  Cloudflare Workers; used from source/deploy/cloudflare/',
      '                             after a build, its paths are relative to the project',
      '  vercel.json                Vercel; used from source/, where Vercel builds the site',
      '',
      'All of them were generated for',
      `  site:               ${siteUrl}`,
      `  existing platform:  ${legacyUrl}`,
      '',
      'Do not edit them by hand. To change an address or a rule, edit',
      'source/site.config.json or source/deploy/routes.mjs and rebuild; setup',
      'for each host is described in source/deploy/README.md.',
    ]));
    console.log('  server-configs/  .htaccess, _headers, _redirects, web.config, nginx/, apache/, cloudflare/, vercel.json');

    // VERSION.txt
    const languageCodes = ['en', ...routes.LANGUAGES];
    const rootPages = websiteFiles.filter((f) => /^[^/]+\.html$/.test(f));
    const perLang = routes.LANGUAGES.map((l) => websiteFiles.filter((f) => f.startsWith(`${l}/`) && /^[^/]+\/[^/]+\.html$/.test(f)).length);
    const htmlFiles = rootPages.length + perLang.reduce((a, b) => a + b, 0);
    if (perLang.some((n) => n !== rootPages.length)) warnings.push(`the language folders do not all have ${rootPages.length} pages: ${routes.LANGUAGES.map((l, i) => `${l} ${perLang[i]}`).join(', ')}`);
    if (built.pages !== undefined && built.pages !== rootPages.length) warnings.push(`the build reported ${built.pages} pages but website/ has ${rootPages.length}`);
    const { bytes: websiteBytes } = await treeSize(W);
    const git = gitInfo();
    const lines = versionLines({
      version, builtAt, packagedAt: new Date(), git, siteUrl, legacyUrl,
      sameHost: built.sameHost || new URL(siteUrl).host === new URL(legacyUrl).host, siblingHost: built.siblingHost,
      pages: rootPages.length, languageCodes, htmlFiles, coverage: built.coverage,
      websiteFiles: websiteFiles.length, websiteBytes, node: process.version,
    });
    await writeFile(join(P, 'VERSION.txt'), CRLF(lines));
    console.log('  VERSION.txt');

    // Links in the documents that point at nothing in the package
    const docFiles = (await listTree(D)).filter((f) => /\.(?:md|html)$/i.test(f)).map((f) => join(D, ...f.split('/')));
    if (readme) docFiles.unshift(join(P, 'README-FIRST.html'));
    for (const f of docFiles) {
      const bad = await brokenLinks(f, P);
      if (bad.length) warnings.push(`${relative(P, f).split(sep).join('/')} links to ${bad.length} path(s) not in the package: ${bad.slice(0, 6).join(', ')}${bad.length > 6 ? ', ...' : ''}`);
    }

    // 3. the zips, then move everything into place
    console.log('\n3. Writing the zips');
    const mtime = builtAt;
    const full = join(STAGE, `${NAME}.zip`);
    const deploy = join(STAGE, `${NAME}-deploy-only.zip`);
    const zFull = await writeZip(full, await zipEntries(P, `${NAME}/`), { mtime });
    const zDeploy = await writeZip(deploy, await zipEntries(W), { mtime });

    await rm(join(RELEASE, NAME), { recursive: true, force: true });
    await rename(P, join(RELEASE, NAME));
    await rename(full, join(RELEASE, `${NAME}.zip`));
    await rename(deploy, join(RELEASE, `${NAME}-deploy-only.zip`));
    const sums = [];
    for (const f of [`${NAME}-deploy-only.zip`, `${NAME}.zip`]) sums.push(`${await sha256File(join(RELEASE, f))}  ${f}`);
    await writeFile(join(RELEASE, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`);

    // Sizes
    const sizes = {};
    for (const part of ['website', 'source', 'docs', 'preview', 'server-configs']) sizes[part] = await treeSize(join(RELEASE, NAME, part));
    const all = await treeSize(join(RELEASE, NAME));
    console.log(`\nPackage release/${NAME}/  ${all.files} files, ${mb(all.bytes)}`);
    for (const [k, s] of Object.entries(sizes)) console.log(`  ${`${k}/`.padEnd(16)} ${String(s.files).padStart(5)} files  ${mb(s.bytes).padStart(9)}`);
    console.log(`release/${NAME}.zip              ${mb(zFull.bytes).padStart(9)}  (${zFull.entries} entries)`);
    console.log(`release/${NAME}-deploy-only.zip  ${mb(zDeploy.bytes).padStart(9)}  (${zDeploy.entries} entries)`);
    console.log('release/SHA256SUMS.txt');
    console.log(`\nVersion ${version}, built ${iso(builtAt)}, site ${siteUrl}, platform ${legacyUrl}`);
    if (configNote) console.log(`\nNote: ${configNote}.`);
    if (built.sameHost) console.log('\nNote: the platform shares the site\'s host (see VERSION.txt). Before the new site takes the domain, set legacyPlatformUrl in site.config.json to the platform\'s own host and package again (docs/handover/DOMAIN-CUTOVER.md, step 3).');
    if (warnings.length) { console.warn(`\n${warnings.length} warning(s):`); for (const w of warnings) console.warn(`  ! ${w}`); }
  } finally {
    await rm(STAGE, { recursive: true, force: true });
  }
}

const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
const isMain = process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(`\nx Packaging failed: ${e.message}`);
    process.exit(1);
  });
}
