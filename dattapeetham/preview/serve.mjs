#!/usr/bin/env node
// Local preview of the Datta Peetham website. A small static web server with
// no dependencies: Node.js 20 or newer, on Windows, macOS or Linux.
//
//   node serve.mjs [folder] [--port=8080] [--host=0.0.0.0] [--no-open]
//                  [--exact-headers] [--verbose]
//
// Serves the delivered website folder (default: ../website next to this
// file, else ../site) the way the live hosts serve it, by reading the site's
// own _headers and _redirects files (Netlify / Cloudflare format, written by
// tools/server-configs.mjs from deploy/routes.mjs):
//
//   - response headers per path pattern: the security headers, the Content
//     Security Policy and the cache rules
//   - redirects: 301/302 (a trailing ! forces a rule over an existing file),
//     * splats and :placeholders, the query string kept and placed before any
//     #fragment; 200 rewrites; 404 rules
//   - unknown paths get /404.html with HTTP status 404
//   - hidden files and the other servers' config files (.htaccess, _headers,
//     _redirects, web.config) are never served, as on the live servers
//   - correct MIME types, gzip, ETag / 304, byte ranges (audio)
//
// It prints the address for this computer and the address(es) a phone or
// tablet on the same Wi-Fi can open, then opens the default browser. If the
// port is busy it takes the next free one.
//
// Differences from the live site, all deliberate, all for the preview only:
//   - The phone address is plain http://, and the site's Content Security
//     Policy says "upgrade-insecure-requests", which makes a browser fetch
//     every image, stylesheet and script over https:// instead: on a LAN
//     address that fails and the page arrives unstyled. So for requests that
//     are not addressed to this computer (localhost / 127.0.0.1 / ::1) that
//     one directive is left out. --exact-headers turns this off.
//   - Redirects are sent with "Cache-Control: no-store", so the browser does
//     not remember them for other projects later served on the same port.
//
// This is not a production server. To put the site online, upload the
// contents of the website folder to the web server (see README-FIRST.html).

import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PORT = 8080;
const PORT_TRIES = 20;

// ------------------------------------------------------------ MIME types ---

const TYPES = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  webmanifest: 'application/manifest+json; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  vtt: 'text/vtt; charset=utf-8',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  avif: 'image/avif',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
  wasm: 'application/wasm',
  zip: 'application/zip',
};
const COMPRESSIBLE = /^(?:text\/|application\/(?:json|manifest\+json|xml|javascript)|image\/svg\+xml)/;

/** The Content-Type for a file name. */
export function contentType(file) {
  return TYPES[extname(file).slice(1).toLowerCase()] || 'application/octet-stream';
}

// -------------------------------------------------- _redirects / _headers ---

// A path pattern as both files write it: literal segments, ":name" for one
// segment, "*" for the rest of the path (exposed as :splat). Exact match,
// case-sensitive, as on Cloudflare; the generated rules never rely on
// Netlify's trailing-slash folding.
function compilePattern(pattern) {
  const keys = [];
  const esc = (lit) => lit.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const re = pattern.split('/').map((seg) => {
    if (/^:[A-Za-z_]\w*$/.test(seg)) { keys.push(seg.slice(1)); return '([^/]+)'; }
    const parts = seg.split('*');
    for (let n = 1; n < parts.length; n++) keys.push('splat');
    return parts.map(esc).join('(.*)');
  }).join('/');
  return { regex: new RegExp(`^${re}$`), keys };
}

function matchPattern(compiled, path) {
  const m = compiled.regex.exec(path);
  if (!m) return null;
  const params = {};
  compiled.keys.forEach((k, i) => { params[k] = m[i + 1]; });
  return params;
}

const isUrl = (s) => /^[a-z][a-z0-9+.-]*:\/\//i.test(s);

/**
 * Parses a _redirects file. Returns { rules, warnings }; each rule is
 * { from, to, status, force, line }. Rules this preview cannot honour (query
 * or country conditions, other domains) are left out with a warning rather
 * than applied too broadly.
 */
export function parseRedirects(text) {
  const rules = [];
  const warnings = [];
  String(text || '').split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const t = line.split(/\s+/);
    const at = `_redirects line ${i + 1}`;
    const j = t.findIndex((x, k) => k > 0 && (x.startsWith('/') || isUrl(x)));
    if (j < 0) { warnings.push(`${at}: no destination, skipped: ${line}`); return; }
    if (j > 1) { warnings.push(`${at}: query conditions are not supported by the preview, skipped: ${line}`); return; }
    let status = 301;
    let force = false;
    let k = j + 1;
    const s = /^(\d{3})(!?)$/.exec(t[k] || '');
    if (s) { status = Number(s[1]); force = s[2] === '!'; k++; }
    if (k < t.length) { warnings.push(`${at}: conditions are not supported by the preview, skipped: ${line}`); return; }
    if (!t[0].startsWith('/')) { warnings.push(`${at}: rules for other domains do not apply to the preview, skipped: ${line}`); return; }
    rules.push({ from: t[0], to: t[j], status, force, line: i + 1, ...compilePattern(t[0]) });
  });
  return { rules, warnings };
}

/**
 * Parses a _headers file: a path pattern on its own line, then indented
 * "Name: value" lines (or "! Name" to remove a header set by an earlier
 * block). Returns { blocks, warnings }.
 */
export function parseHeaders(text) {
  const blocks = [];
  const warnings = [];
  let cur = null;
  String(text || '').split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    if (!/^\s/.test(raw)) {
      cur = { pattern: line, headers: [], line: i + 1 };
      if (!line.startsWith('/')) { warnings.push(`_headers line ${i + 1}: rules for other domains do not apply to the preview, skipped: ${line}`); cur.skip = true; }
      else Object.assign(cur, compilePattern(line));
      blocks.push(cur);
      return;
    }
    if (!cur) { warnings.push(`_headers line ${i + 1}: a header before any path, skipped`); return; }
    if (line.startsWith('!')) { cur.headers.push({ name: line.slice(1).trim(), remove: true }); return; }
    const c = line.indexOf(':');
    if (c <= 0) { warnings.push(`_headers line ${i + 1}: not "Name: value", skipped: ${line}`); return; }
    cur.headers.push({ name: line.slice(0, c).trim(), value: line.slice(c + 1).trim() });
  });
  return { blocks: blocks.filter((b) => !b.skip), warnings };
}

/**
 * The headers every matching _headers block gives a path, in file order. A
 * header set by two blocks gets both values joined with ", " (as Cloudflare
 * and Netlify do); "! Name" removes it. Returns [[name, value], ...].
 */
export function headersFor(blocks, path) {
  const out = new Map();
  for (const b of blocks) {
    if (!matchPattern(b, path)) continue;
    for (const h of b.headers) {
      const key = h.name.toLowerCase();
      if (h.remove) { out.delete(key); continue; }
      const prev = out.get(key);
      out.set(key, prev ? [prev[0], `${prev[1]}, ${h.value}`] : [h.name, h.value]);
    }
  }
  return [...out.values()];
}

/** The first rule matching a path, as { rule, to } with placeholders filled in. */
export function matchRedirect(rules, path, { forced } = {}) {
  for (const rule of rules) {
    if (forced !== undefined && rule.force !== forced) continue;
    const params = matchPattern(rule, path);
    if (!params) continue;
    const to = rule.to.replace(/:([A-Za-z_]\w*)/g, (all, k) => (k in params ? params[k] : all));
    return { rule, to };
  }
  return null;
}

/**
 * The query string travels with a redirect (both hosts pass it on), placed
 * before any #fragment of the destination. A destination with its own query
 * keeps it unchanged.
 */
export function withQuery(to, search) {
  if (!search || search === '?' || to.includes('?')) return to;
  const h = to.indexOf('#');
  return h < 0 ? to + search : to.slice(0, h) + search + to.slice(h);
}

// ---------------------------------------------------------------- server ---

const LOOPBACK = /^(?:localhost|[\w-]+\.localhost|127(?:\.\d{1,3}){3}|\[::1\]|::1)$/i;
/** Is this Host header this computer (a secure context for the browser)? */
export function isLoopbackHost(host) {
  if (!host) return true;
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.replace(/:\d+$/, '');
  return LOOPBACK.test(name);
}

// The directive a plain-http LAN address cannot honour; see the header.
const dropUpgrade = (csp) => csp.split(';').map((d) => d.trim()).filter((d) => d && d.toLowerCase() !== 'upgrade-insecure-requests').join('; ');

// Files the live servers never serve: hidden files (except /.well-known/) and
// the other servers' configuration.
const PRIVATE = new Set(['_headers', '_redirects', 'web.config']);
function isPrivate(segments) {
  if (segments.length === 1 && PRIVATE.has(segments[0])) return true;
  return segments.some((s, i) => s.startsWith('.') && !(i === 0 && s === '.well-known'));
}

/**
 * An http.Server serving `root` with its _headers and _redirects.
 * Options: exactHeaders (never adapt the CSP for LAN addresses), verbose
 * (log every request), redirectsText / headersText (use these rules instead
 * of the folder's files; for tests).
 */
export function createPreviewServer({ root, exactHeaders = false, verbose = false, redirectsText, headersText, log = console.log } = {}) {
  root = resolve(root);
  const rules = { redirects: [], headers: [], key: null };

  // Re-read the rule files whenever they change, so a rebuild while the
  // preview runs is picked up without a restart.
  async function loadRules() {
    if (redirectsText !== undefined || headersText !== undefined) {
      if (rules.key === 'fixed') return rules;
      const r = parseRedirects(redirectsText);
      const h = parseHeaders(headersText);
      for (const w of [...r.warnings, ...h.warnings]) log(`  note: ${w}`);
      Object.assign(rules, { redirects: r.rules, headers: h.blocks, key: 'fixed' });
      return rules;
    }
    const files = ['_redirects', '_headers'].map((f) => join(root, f));
    const stamps = await Promise.all(files.map((f) => stat(f).then((s) => `${s.mtimeMs}:${s.size}`, () => '-')));
    const key = stamps.join('|');
    if (key === rules.key) return rules;
    const [rText, hText] = await Promise.all(files.map((f) => readFile(f, 'utf8').catch(() => '')));
    const r = parseRedirects(rText);
    const h = parseHeaders(hText);
    if (rules.key !== null) log('  (rules reloaded: _redirects / _headers changed)');
    for (const w of [...r.warnings, ...h.warnings]) log(`  note: ${w}`);
    Object.assign(rules, { redirects: r.rules, headers: h.blocks, key });
    return rules;
  }

  // A request path -> a file inside root, or null. A path ending in "/" means
  // the folder's index.html; a folder without the slash is not a file.
  async function findFile(path) {
    const segments = path.split('/').filter(Boolean);
    if (segments.some((s) => s === '..' || s === '.' || s.includes('\\') || s.includes('\0') || (process.platform === 'win32' && /[:*?"<>|]/.test(s)))) return null;
    if (isPrivate(segments)) return null;
    const file = join(root, ...segments, ...(path.endsWith('/') ? ['index.html'] : []));
    if (file !== root && !file.startsWith(root + sep)) return null;
    const st = await stat(file).catch(() => null);
    return st && st.isFile() ? { file, st } : null;
  }

  function baseHeaders(req, rawPath) {
    const { headers: blocks } = rules;
    const lan = !exactHeaders && !isLoopbackHost(req.headers.host);
    const out = {};
    for (const [name, value] of headersFor(blocks, rawPath)) {
      out[name] = lan && name.toLowerCase() === 'content-security-policy' ? dropUpgrade(value) : value;
    }
    return out;
  }
  const hasHeader = (h, name) => Object.keys(h).some((k) => k.toLowerCase() === name);

  async function sendFile(req, res, { file, st }, status, headers) {
    const type = contentType(file);
    const h = { ...headers, 'Content-Type': type };
    if (!hasHeader(h, 'cache-control')) h['Cache-Control'] = 'no-cache';
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    h.ETag = etag;
    h['Last-Modified'] = st.mtime.toUTCString();
    const compressible = COMPRESSIBLE.test(type);
    if (compressible) h.Vary = 'Accept-Encoding';
    else h['Accept-Ranges'] = 'bytes';

    if (status === 200) {
      const inm = req.headers['if-none-match'];
      const ims = Date.parse(req.headers['if-modified-since'] || '');
      if ((inm && inm.split(',').map((x) => x.trim()).includes(etag)) || (!inm && ims && Math.floor(st.mtimeMs / 1000) <= Math.floor(ims / 1000))) {
        res.writeHead(304, h).end();
        return 304;
      }
    }

    // byte ranges (the audio player seeks with them)
    const range = status === 200 && !compressible && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      let start;
      let end = st.size - 1;
      if (range[1] === '') {
        // "bytes=-500": the last 500 bytes
        const n = Number(range[2]);
        start = range[2] === '' || n === 0 ? NaN : Math.max(0, st.size - n);
      } else {
        start = Number(range[1]);
        if (range[2] !== '') end = Math.min(Number(range[2]), st.size - 1);
      }
      if (!(start >= 0) || start > end || start >= st.size) {
        res.writeHead(416, { ...h, 'Content-Range': `bytes */${st.size}` }).end();
        return 416;
      }
      res.writeHead(206, { ...h, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') { res.end(); return 206; }
      createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
      return 206;
    }

    const gzip = compressible && /\bgzip\b/i.test(req.headers['accept-encoding'] || '');
    let body = await readFile(file);
    if (gzip) { body = zlib.gzipSync(body, { level: 6 }); h['Content-Encoding'] = 'gzip'; }
    h['Content-Length'] = body.length;
    res.writeHead(status, h);
    res.end(req.method === 'HEAD' ? undefined : body);
    return status;
  }

  async function notFound(req, res, headers) {
    const page = await findFile('/404.html');
    if (page) return sendFile(req, res, page, 404, headers);
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : 'Not found\n');
    return 404;
  }

  function redirect(req, res, status, location, headers) {
    const h = { ...headers, Location: location, 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' };
    for (const k of Object.keys(h)) if (k !== 'Cache-Control' && k.toLowerCase() === 'cache-control') delete h[k];
    res.writeHead(status, h);
    res.end(req.method === 'HEAD' ? undefined : `Redirecting to ${location}\n`);
    return status;
  }

  // Apply one _redirects rule: 3xx -> redirect; 200 / 404 -> serve the
  // destination file with that status. null when it cannot be applied here.
  async function applyRule(req, res, hit, search, headers) {
    const { rule, to } = hit;
    if (rule.status >= 300 && rule.status < 400) return redirect(req, res, rule.status, withQuery(to, search), headers);
    if (isUrl(to)) return null; // a proxy rewrite to another host: not something a preview can do
    let dest;
    try { dest = decodeURIComponent(to.split(/[?#]/)[0]); } catch { return null; }
    const target = await findFile(dest);
    if (!target) return null;
    return sendFile(req, res, target, rule.status, headers);
  }

  async function handle(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }).end('Method not allowed\n');
      return 405;
    }
    let url;
    let path;
    try {
      url = new URL(req.url, 'http://preview.invalid');
      path = decodeURIComponent(url.pathname);
      if (path.includes('\0')) throw new Error('NUL');
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request\n');
      return 400;
    }
    const rawPath = url.pathname;
    const { redirects } = await loadRules();
    const headers = baseHeaders(req, rawPath);

    // 1. forced rules (status!) win over files; 2. files; 3. the other rules
    const forced = matchRedirect(redirects, rawPath, { forced: true });
    if (forced) { const r = await applyRule(req, res, forced, url.search, headers); if (r) return r; }
    const file = await findFile(path);
    if (file) return sendFile(req, res, file, 200, headers);
    const hit = matchRedirect(redirects, rawPath, { forced: false });
    if (hit) { const r = await applyRule(req, res, hit, url.search, headers); if (r) return r; }

    // A folder without its trailing slash, when it has an index page.
    if (!path.endsWith('/') && (await findFile(`${path}/`))) return redirect(req, res, 301, withQuery(`${rawPath}/`, url.search), headers);
    return notFound(req, res, headers);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).then((status) => {
      if (verbose) log(`  ${status} ${req.method} ${req.url}`);
    }, (e) => {
      log(`  error serving ${req.url}: ${e && e.message}`);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end();
    });
  });
  server.root = root;
  server.loadRules = loadRules;
  return server;
}

// ------------------------------------------------------------------- CLI ---

// Adapter names of virtual networks (WSL, Hyper-V, Docker, VirtualBox,
// VMware, Linux bridges). Their addresses are listed last, not dropped: on a
// Hyper-V host the real network can sit on a "vEthernet (External ...)" switch.
const VIRTUAL_ADAPTER = /^(?:docker\d*|br-[0-9a-f]+|veth|virbr|vmnet|vboxnet|cni|flannel|tailscale|zt)|vEthernet|WSL|Hyper-V|VirtualBox|VMware|Loopback/i;

/**
 * IPv4 addresses a phone on the same network can reach (no loopback or
 * link-local), those of virtual adapters last.
 */
export function lanAddresses(ifaces = os.networkInterfaces()) {
  const real = [];
  const virtual = [];
  for (const [name, list] of Object.entries(ifaces)) {
    for (const a of list || []) {
      const v4 = a.family === 'IPv4' || a.family === 4;
      if (v4 && !a.internal && !a.address.startsWith('169.254.')) (VIRTUAL_ADAPTER.test(name) ? virtual : real).push(a.address);
    }
  }
  return [...new Set([...real, ...virtual])];
}

/** Parses the command line. Unknown options throw. */
export function parseArgs(argv) {
  const o = { folder: undefined, port: undefined, host: '0.0.0.0', open: true, exactHeaders: false, verbose: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = (name) => {
      if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
      if (i + 1 >= argv.length) throw new Error(`--${name} needs a value`);
      return argv[++i];
    };
    if (a === '--help' || a === '-h' || a === '/?') o.help = true;
    else if (a === '--no-open') o.open = false;
    else if (a === '--exact-headers') o.exactHeaders = true;
    else if (a === '--verbose') o.verbose = true;
    else if (a === '--port' || a.startsWith('--port=')) {
      const v = val('port');
      if (!/^\d+$/.test(v) || Number(v) > 65535) throw new Error(`--port must be a number from 0 to 65535, not "${v}"`);
      o.port = Number(v);
    } else if (a === '--host' || a.startsWith('--host=')) o.host = val('host');
    else if (a.startsWith('-')) throw new Error(`unknown option ${a} (see --help)`);
    else o.folder = a; // the last folder given wins
  }
  return o;
}

const HELP = `Datta Peetham website - local preview

  node serve.mjs [folder] [options]

  folder            the website folder to serve (default: ../website next to
                    this file, else ../site)
  --port=8080       the port to try first; the next free one is used if busy
  --host=0.0.0.0    the network address to listen on; --host=127.0.0.1 keeps
                    the preview private to this computer (no phone address)
  --no-open         do not open the browser
  --exact-headers   send the headers exactly as _headers says, even to the
                    phone address (its pages then load without styles)
  --verbose         print every request
`;

// Is something already answering on this port? (On Windows a second server
// can bind 0.0.0.0 next to one on 127.0.0.1, so binding alone does not tell.)
function portAnswers(port) {
  return new Promise((done) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    const end = (v) => { s.destroy(); done(v); };
    s.once('connect', () => end(true));
    s.once('error', () => end(false));
    s.setTimeout(400, () => end(false));
  });
}

/** Listens on the first free port from `port`; resolves to the port used. */
export async function listen(server, { port = DEFAULT_PORT, host = '0.0.0.0', tries = PORT_TRIES } = {}) {
  if (port === 0) {
    await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, host, () => { server.off('error', fail); ok(); }); });
    return server.address().port;
  }
  let last;
  for (let p = port; p < port + tries && p <= 65535; p++) {
    if (await portAnswers(p)) { last = new Error(`port ${p} is in use`); continue; }
    try {
      await new Promise((ok, fail) => { server.once('error', fail); server.listen(p, host, () => { server.off('error', fail); ok(); }); });
      return p;
    } catch (e) {
      if (e.code !== 'EADDRINUSE' && e.code !== 'EACCES') throw e;
      last = e;
    }
  }
  throw new Error(`no free port from ${port} to ${Math.min(port + tries - 1, 65535)} (${last && last.message}); try --port=<another number>`);
}

/** Opens a URL in the default browser. Never throws; resolves to true if a browser command started. */
export function openBrowser(url) {
  const [cmd, args, opts] = process.platform === 'win32'
    ? ['cmd', ['/d', '/c', 'start', '""', `"${url}"`], { windowsVerbatimArguments: true }]
    : process.platform === 'darwin' ? ['open', [url], {}] : ['xdg-open', [url], {}];
  return new Promise((done) => {
    try {
      const child = spawn(cmd, args, { ...opts, stdio: 'ignore', detached: true });
      child.once('error', () => done(false));
      child.once('spawn', () => { child.unref(); done(true); });
    } catch { done(false); }
  });
}

function defaultFolder() {
  const website = resolve(HERE, '..', 'website');
  if (existsSync(website)) return website;
  const site = resolve(HERE, '..', 'site');
  return existsSync(site) ? site : website;
}

async function main() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) {
    console.error(`This computer has Node.js ${process.version}; the preview needs version 20 or newer.\nDownload the LTS version from https://nodejs.org and try again.`);
    process.exit(1);
  }
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`Error: ${e.message}`); process.exit(2); }
  if (o.help) { console.log(HELP); return; }

  const root = o.folder ? resolve(o.folder) : defaultFolder();
  let st = null;
  try { st = statSync(root); } catch { /* reported below */ }
  if (!st || !st.isDirectory() || !existsSync(join(root, 'index.html'))) {
    console.error(`\nThere is no website to preview at:\n  ${root}\n\nGive the folder that holds index.html, for example:\n  node serve.mjs "${join(dirname(HERE), 'website')}"\n`);
    process.exit(1);
  }

  const server = createPreviewServer({ root, exactHeaders: o.exactHeaders, verbose: o.verbose });
  const rules = await server.loadRules();
  const wanted = o.port ?? DEFAULT_PORT;
  let port;
  try { port = await listen(server, { port: wanted, host: o.host }); } catch (e) { console.error(`\nCould not start the preview: ${e.message}\n`); process.exit(1); }

  const everywhere = o.host === '0.0.0.0' || o.host === '::';
  const urlHost = (h) => (h.includes(':') && !h.startsWith('[') ? `[${h}]` : h);
  // Bound to one network address only: that address is the one to open.
  const local = everywhere || isLoopbackHost(urlHost(o.host)) ? `http://localhost:${port}/` : `http://${urlHost(o.host)}:${port}/`;
  const lan = everywhere ? lanAddresses() : [];
  const L = [
    '',
    '  Datta Peetham website - local preview',
    '',
    `  Folder:  ${root}`,
    '',
    '  Open on this computer:',
    `    ${local}`,
  ];
  if (lan.length) {
    L.push('', '  Open on a phone or tablet on the same Wi-Fi:');
    for (const ip of lan) L.push(`    http://${ip}:${port}/`);
  } else if (everywhere) {
    L.push('', '  (No network connection found, so only this computer can open the preview.)');
  }
  L.push('');
  if (port !== wanted) L.push(`  Port ${wanted} was busy, so the preview uses port ${port}.`);
  if (!rules.redirects.length && !rules.headers.length) L.push('  Note: this folder has no _redirects or _headers file, so pages are served as plain files.');
  if (lan.length && process.platform === 'win32') L.push('  If Windows asks whether Node.js may use the network, allow private networks', '  so that phones can connect.');
  L.push(
    '  Links for puja bookings, donations, sign-in and the store open the',
    "  Peetham's existing platform on the internet, as on the live site.",
    '',
    '  Leave this window open while you look at the site. Press Ctrl+C to stop.',
    '',
  );
  console.log(L.join('\n'));

  const stop = () => {
    console.log('  Preview stopped.');
    server.close();
    server.closeAllConnections?.();
    setTimeout(() => process.exit(0), 300).unref();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  if (o.open && !(await openBrowser(local))) console.log(`  (Could not open a browser by itself: open ${local} yourself.)\n`);
}

// Run when started as a script (also through a symlinked or differently-cased
// path), not when imported by the tests.
function isMain() {
  if (!process.argv[1]) return false;
  const norm = (p) => { try { p = realpathSync(p); } catch { p = resolve(p); } return process.platform === 'win32' ? p.toLowerCase() : p; };
  return norm(process.argv[1]) === norm(fileURLToPath(import.meta.url));
}
if (isMain()) main().catch((e) => { console.error(e); process.exit(1); });
