// The local preview server (preview/serve.mjs) and its launchers.
//
//   node --test tests/preview.test.mjs
//
// Unit tests for the _redirects / _headers parsers, an HTTP test against a
// fixture site in a folder whose path has spaces (as on a Windows desktop),
// the launchers, and a fidelity test: the project's own live-server verifier
// (deploy/test/verify-server.mjs, the one nginx and Apache are tested with)
// run against the preview serving the built site with the generator's rules,
// for the shared-host and the split-host configuration.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseRedirects, parseHeaders, headersFor, matchRedirect, withQuery, contentType, isLoopbackHost,
  lanAddresses, parseArgs, createPreviewServer, listen,
} from '../preview/serve.mjs';
import { buildModel, scanSite, renderRedirects, renderHeaders } from '../tools/server-configs.mjs';
import * as R from '../deploy/routes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = join(ROOT, 'preview');
const SITE = process.env.DP_SITE_DIR ? resolve(process.env.DP_SITE_DIR) : join(ROOT, 'site');
const CSP = "default-src 'self'; img-src 'self' data:; upgrade-insecure-requests";

// ------------------------------------------------------------ fixtures ---

const REDIRECTS = `# a comment
/old                     /about.html#team                          301
/page/view/about-us      /about.html                               301
/                        /index.html                               200
/kn/                     /kn/index.html                            200
/about                   /about.html                               301
/kn                      /kn/                                      301
/default-status          /about.html
/poojas                  https://seva.example.org/poojas           302
/poojas/*                https://seva.example.org/poojas/:splat    302
/page/view/*             https://seva.example.org/page/view/:splat 302
/blog/:year/:slug        /news/:year-:slug.html                    301
/forced.html             /about.html                               302!
/gone/*                  /404.html                                 404
/rewrite                 /about.html                               200
/store id=:id            /about.html                               301
/country                 /about.html                               302 Country=in
`;

const HEADERS = `# a comment
/*
  X-Test: all
  Content-Security-Policy: ${CSP}
  X-Removed: yes

/assets/css/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  X-Test: assets
  ! X-Removed
`;

const BIG_CSS = `body { color: #333; }\n`.repeat(400);
const MP3 = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));

async function writeFixture(dir) {
  const files = {
    'index.html': '<!doctype html><h1>home</h1>',
    '404.html': '<!doctype html><main class="page-404">missing</main>',
    'about.html': '<!doctype html><h1>about</h1>',
    'forced.html': '<!doctype html><h1>forced</h1>',
    'kn/index.html': '<!doctype html><h1>kn home</h1>',
    'kn/about.html': '<!doctype html><h1>kn about</h1>',
    'my folder/page one.html': '<!doctype html><h1>spaces</h1>',
    'assets/css/site.css': BIG_CSS,
    'assets/img/i.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'assets/img/p.webp': 'RIFF....WEBP',
    'assets/fonts/f.woff2': 'wOF2',
    'assets/audio/a.mp3': MP3,
    'assets/search-index.json': '[]',
    'site.webmanifest': '{}',
    'favicon.ico': 'ico',
    'sitemap.xml': '<urlset/>',
    'robots.txt': 'User-agent: *',
    '.htaccess': 'RewriteEngine On # secret-htaccess',
    '.assetsignore': 'web.config',
    'web.config': '<configuration>secret-webconfig</configuration>',
    '.git/config': '[core] secret-git',
    '.well-known/dp-test.txt': 'dp-well-known',
    _headers: HEADERS,
    _redirects: REDIRECTS,
  };
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), body);
  }
}

function request(port, path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolveP, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method, headers: { connection: 'close', ...headers }, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolveP({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

let TMP;
let FIX;
let server;
let PORT;
before(async () => {
  // A path with spaces, like C:\Users\Name\Desktop\Datta Peetham
  TMP = await mkdtemp(join(tmpdir(), 'dp preview test '));
  FIX = join(TMP, 'Datta Peetham', 'website');
  await writeFixture(FIX);
  server = createPreviewServer({ root: FIX, log: () => {} });
  PORT = await listen(server, { port: 0, host: '127.0.0.1' });
});
after(async () => {
  server?.closeAllConnections?.();
  await new Promise((r) => (server ? server.close(r) : r()));
  if (TMP) await rm(TMP, { recursive: true, force: true });
});

// -------------------------------------------------------------- parsers ---

test('_redirects: rules, statuses, forced rules, default 301, unsupported conditions skipped', () => {
  const { rules, warnings } = parseRedirects(REDIRECTS);
  assert.equal(rules.length, 14);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /line 16: query conditions/);
  assert.match(warnings[1], /line 17: conditions/);
  const by = Object.fromEntries(rules.map((r) => [r.from, r]));
  assert.equal(by['/old'].status, 301);
  assert.equal(by['/old'].to, '/about.html#team');
  assert.equal(by['/default-status'].status, 301);
  assert.equal(by['/poojas/*'].status, 302);
  assert.equal(by['/forced.html'].force, true);
  assert.equal(by['/about'].force, false);
  assert.equal(by['/gone/*'].status, 404);
  assert.equal(by['/rewrite'].status, 200);
  assert.deepEqual(parseRedirects('/a https://other.example/b 301\nhttps://x.example/* /y 301').warnings.length, 1);
  assert.equal(parseRedirects('\r\n/a   /b   302\r\n').rules[0].status, 302);
});

test('_redirects: splats, :placeholders, first match wins, exact paths', () => {
  const { rules } = parseRedirects(REDIRECTS);
  assert.equal(matchRedirect(rules, '/poojas/a/b').to, 'https://seva.example.org/poojas/a/b');
  assert.equal(matchRedirect(rules, '/poojas/').to, 'https://seva.example.org/poojas/');
  assert.equal(matchRedirect(rules, '/poojas').to, 'https://seva.example.org/poojas');
  assert.equal(matchRedirect(rules, '/blog/2026/hello').to, '/news/2026-hello.html');
  assert.equal(matchRedirect(rules, '/blog/2026/hello/more'), null, ':placeholder matches one segment only');
  // the old-site rule comes before the platform prefix rule
  assert.equal(matchRedirect(rules, '/page/view/about-us').to, '/about.html');
  assert.equal(matchRedirect(rules, '/page/view/privacy-policy').to, 'https://seva.example.org/page/view/privacy-policy');
  assert.equal(matchRedirect(rules, '/page/view'), null, 'a prefix rule does not take the bare path');
  // exact: no trailing-slash folding (it would turn /kn into a rewrite of /kn/)
  assert.equal(matchRedirect(rules, '/kn').to, '/kn/');
  assert.equal(matchRedirect(rules, '/about/'), null);
  assert.equal(matchRedirect(rules, '/About'), null);
  assert.equal(matchRedirect(rules, '/forced.html', { forced: true }).to, '/about.html');
  assert.equal(matchRedirect(rules, '/forced.html', { forced: false }), null);
  // regex characters in a path are literal
  assert.equal(matchRedirect(parseRedirects('/a.b /c 301').rules, '/axb'), null);
});

test('redirects keep the query string, before any #fragment', () => {
  assert.equal(withQuery('/about.html', '?x=1'), '/about.html?x=1');
  assert.equal(withQuery('/about.html#team', '?x=1&y=2'), '/about.html?x=1&y=2#team');
  assert.equal(withQuery('/about.html', ''), '/about.html');
  assert.equal(withQuery('/about.html?keep=1', '?x=1'), '/about.html?keep=1');
  assert.equal(withQuery('https://seva.example.org/poojas', '?ashram_id=4'), 'https://seva.example.org/poojas?ashram_id=4');
});

test('_headers: blocks per pattern, repeated headers joined, "! Name" removes', () => {
  const { blocks, warnings } = parseHeaders(HEADERS);
  assert.equal(blocks.length, 3);
  assert.equal(warnings.length, 0);
  const page = Object.fromEntries(headersFor(blocks, '/about.html'));
  assert.equal(page['X-Test'], 'all');
  assert.equal(page['Content-Security-Policy'], CSP);
  assert.equal(page['X-Removed'], 'yes');
  assert.equal(page['Cache-Control'], undefined);
  const css = Object.fromEntries(headersFor(blocks, '/assets/css/site.css'));
  assert.equal(css['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.equal(css['X-Test'], 'all, assets');
  assert.equal(css['X-Removed'], undefined);
  assert.equal(parseHeaders('https://example.org/*\n  X: 1').blocks.length, 0);
});

test('MIME types, including the ones servers often lack', () => {
  const want = {
    'a.html': 'text/html; charset=utf-8', 'a.css': 'text/css; charset=utf-8', 'a.js': 'text/javascript; charset=utf-8',
    'a.json': 'application/json; charset=utf-8', 'site.webmanifest': 'application/manifest+json; charset=utf-8',
    'a.webp': 'image/webp', 'a.svg': 'image/svg+xml', 'a.woff2': 'font/woff2', 'favicon.ico': 'image/x-icon',
    'a.mp3': 'audio/mpeg', 'a.xml': 'application/xml; charset=utf-8', 'robots.txt': 'text/plain; charset=utf-8',
    'A.WEBP': 'image/webp', 'noext': 'application/octet-stream',
  };
  for (const [f, t] of Object.entries(want)) assert.equal(contentType(f), t, f);
  // every extension the built site uses has a real type
  for (const ext of ['html', 'css', 'js', 'json', 'webmanifest', 'webp', 'jpg', 'png', 'svg', 'ico', 'mp3', 'xml', 'txt', 'woff2']) {
    assert.notEqual(contentType(`x.${ext}`), 'application/octet-stream', ext);
  }
});

test('loopback hosts, LAN addresses and the command line', () => {
  for (const h of ['localhost:8080', '127.0.0.1:8080', '127.1.2.3', '[::1]:8080', 'LOCALHOST', 'app.localhost:1', undefined]) assert.equal(isLoopbackHost(h), true, h);
  for (const h of ['192.168.1.20:8080', '10.0.0.5', 'example.org', '[fe80::1]:8080']) assert.equal(isLoopbackHost(h), false, h);
  assert.deepEqual(lanAddresses({
    lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    wifi: [{ family: 'IPv4', address: '192.168.1.20', internal: false }, { family: 'IPv6', address: 'fe80::1', internal: false }],
    eth: [{ family: 4, address: '10.0.0.5', internal: false }, { family: 'IPv4', address: '169.254.3.4', internal: false }],
  }), ['192.168.1.20', '10.0.0.5']);
  // virtual adapters (Docker, WSL, Hyper-V) after the real ones, never dropped
  assert.deepEqual(lanAddresses({
    docker0: [{ family: 'IPv4', address: '172.17.0.1', internal: false }],
    'vEthernet (WSL)': [{ family: 'IPv4', address: '172.20.48.1', internal: false }],
    'Wi-Fi': [{ family: 'IPv4', address: '192.168.1.20', internal: false }],
    'vEthernet (Default Switch)': [{ family: 'IPv4', address: '172.30.0.1', internal: false }],
    Ethernet: [{ family: 'IPv4', address: '10.0.0.5', internal: false }],
  }), ['192.168.1.20', '10.0.0.5', '172.17.0.1', '172.20.48.1', '172.30.0.1']);
  assert.deepEqual(parseArgs([]), { folder: undefined, port: undefined, host: '0.0.0.0', open: true, exactHeaders: false, verbose: false, help: false });
  const o = parseArgs(['C:\\Users\\Name\\Desktop\\Datta Peetham\\website', '--port', '9000', '--no-open', '--host=127.0.0.1', '--exact-headers']);
  assert.equal(o.folder, 'C:\\Users\\Name\\Desktop\\Datta Peetham\\website');
  assert.equal(o.port, 9000);
  assert.equal(o.open, false);
  assert.equal(o.host, '127.0.0.1');
  assert.equal(o.exactHeaders, true);
  assert.equal(parseArgs(['--port=8081']).port, 8081);
  assert.equal(parseArgs(['a', 'b']).folder, 'b', 'the last folder given wins (the launchers pass one first)');
  assert.throws(() => parseArgs(['--port=abc']), /--port/);
  assert.throws(() => parseArgs(['--port=70000']), /--port/);
  assert.throws(() => parseArgs(['--nope']), /unknown option/);
  assert.equal(parseArgs(['--help']).help, true);
});

// ----------------------------------------------------------------- HTTP ---

test('pages: 200, security headers from _headers, revalidated, gzip on request', async () => {
  const r = await request(PORT, '/');
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(r.body.toString(), '<!doctype html><h1>home</h1>');
  assert.equal(r.headers['x-test'], 'all');
  assert.equal(r.headers['content-security-policy'], CSP);
  assert.equal(r.headers['cache-control'], 'no-cache');
  assert.match(r.headers.etag, /^W\/"/);
  const gz = await request(PORT, '/assets/css/site.css', { headers: { 'accept-encoding': 'gzip, br' } });
  assert.equal(gz.headers['content-encoding'], 'gzip');
  assert.match(gz.headers.vary, /Accept-Encoding/);
  assert.equal(zlib.gunzipSync(gz.body).toString(), BIG_CSS);
  assert.equal(gz.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.equal(gz.headers['x-test'], 'all, assets');
  const plain = await request(PORT, '/assets/css/site.css');
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.equal(plain.body.toString(), BIG_CSS);
  assert.equal((await request(PORT, '/kn/')).body.toString(), '<!doctype html><h1>kn home</h1>');
  assert.equal((await request(PORT, '/my%20folder/page%20one.html')).status, 200);
});

test('content types on the wire', async () => {
  const want = {
    '/site.webmanifest': 'application/manifest+json', '/assets/img/p.webp': 'image/webp', '/assets/img/i.svg': 'image/svg+xml',
    '/assets/search-index.json': 'application/json', '/assets/fonts/f.woff2': 'font/woff2', '/favicon.ico': 'image/x-icon',
    '/assets/audio/a.mp3': 'audio/mpeg', '/sitemap.xml': 'application/xml', '/robots.txt': 'text/plain',
  };
  for (const [p, t] of Object.entries(want)) {
    const r = await request(PORT, p, { method: 'HEAD' });
    assert.equal(r.status, 200, p);
    assert.equal(r.headers['content-type'].split(';')[0], t, p);
    assert.equal(r.body.length, 0, `${p}: HEAD has no body`);
  }
});

test('the phone (LAN) address gets the CSP without upgrade-insecure-requests; this computer gets it exactly', async () => {
  const lan = await request(PORT, '/', { headers: { host: '192.168.1.20:8080' } });
  assert.equal(lan.headers['content-security-policy'], "default-src 'self'; img-src 'self' data:");
  for (const host of ['localhost:8080', '127.0.0.1:8080', '[::1]:8080']) {
    assert.equal((await request(PORT, '/', { headers: { host } })).headers['content-security-policy'], CSP, host);
  }
  const exact = createPreviewServer({ root: FIX, exactHeaders: true, log: () => {} });
  const p = await listen(exact, { port: 0, host: '127.0.0.1' });
  try {
    assert.equal((await request(p, '/', { headers: { host: '192.168.1.20:8080' } })).headers['content-security-policy'], CSP);
  } finally { exact.close(); }
});

test('redirects: page URLs, old-site URLs, the platform, placeholders; not cached by the browser', async () => {
  const cases = [
    ['/about', 301, '/about.html'],
    ['/about?utm_source=dp&x=1', 301, '/about.html?utm_source=dp&x=1'],
    ['/old?utm=1', 301, '/about.html?utm=1#team'],
    ['/kn', 301, '/kn/'],
    ['/default-status', 301, '/about.html'],
    ['/page/view/about-us', 301, '/about.html'],
    ['/page/view/privacy-policy?a=1', 302, 'https://seva.example.org/page/view/privacy-policy?a=1'],
    ['/poojas?ashram_id=4&currency=inr', 302, 'https://seva.example.org/poojas?ashram_id=4&currency=inr'],
    ['/poojas/a/b?ashram_id=4&x=%20y', 302, 'https://seva.example.org/poojas/a/b?ashram_id=4&x=%20y'],
    ['/blog/2026/hello', 301, '/news/2026-hello.html'],
    ['/forced.html', 302, '/about.html'],
  ];
  for (const [from, status, to] of cases) {
    const r = await request(PORT, from);
    assert.equal(r.status, status, from);
    assert.equal(r.headers.location, to, from);
    assert.equal(r.headers['cache-control'], 'no-store', `${from}: a preview redirect must not stick in the browser`);
    assert.equal(r.headers['x-test'], 'all', `${from}: headers apply to redirects too`);
  }
  const rw = await request(PORT, '/rewrite');
  assert.equal(rw.status, 200);
  assert.equal(rw.body.toString(), '<!doctype html><h1>about</h1>');
});

test('404: unknown paths, 404 rules, folders, hidden and server files', async () => {
  for (const p of ['/nope', '/kn/nope', '/a/b/c/does-not-exist.html', '/gone/x', '/assets/', '/assets', '/page/view', '/about/', '/store?id=1']) {
    const r = await request(PORT, p);
    assert.equal(r.status, 404, p);
    assert.match(r.body.toString(), /class="page-404"/, p);
    assert.match(r.headers['x-test'], /^all\b/, `${p}: the _headers of the requested path`);
    assert.equal(r.headers['cache-control'], 'no-cache', p);
  }
  for (const [p, secret] of [['/.htaccess', 'secret-htaccess'], ['/web.config', 'secret-webconfig'], ['/_headers', 'X-Test'], ['/_redirects', '/old'], ['/.assetsignore', 'web.config'], ['/.git/config', 'secret-git']]) {
    const r = await request(PORT, p);
    assert.equal(r.status, 404, p);
    assert.doesNotMatch(r.body.toString(), new RegExp(secret.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')), `${p} leaked`);
  }
  const wk = await request(PORT, '/.well-known/dp-test.txt');
  assert.equal(wk.status, 200);
  assert.equal(wk.body.toString(), 'dp-well-known');
});

test('requests cannot leave the folder', async () => {
  // the fixture folder's parent holds a file that must stay unreachable
  await writeFile(join(FIX, '..', 'outside.txt'), 'outside-secret');
  for (const p of ['/../outside.txt', '/%2e%2e/outside.txt', '/..%2foutside.txt', '/..%5coutside.txt', '/assets/..%2f..%2foutside.txt', '//../outside.txt']) {
    const r = await request(PORT, p);
    assert.notEqual(r.status, 200, p);
    assert.doesNotMatch(r.body.toString(), /outside-secret/, p);
  }
  assert.equal((await request(PORT, '/%00')).status, 400);
  assert.equal((await request(PORT, '/%E0%A4%A')).status, 400);
  assert.equal((await request(PORT, '/', { method: 'POST' })).status, 405);
});

test('conditional requests and byte ranges', async () => {
  const first = await request(PORT, '/about.html');
  const again = await request(PORT, '/about.html', { headers: { 'if-none-match': first.headers.etag } });
  assert.equal(again.status, 304);
  assert.equal(again.body.length, 0);
  const since = await request(PORT, '/about.html', { headers: { 'if-modified-since': first.headers['last-modified'] } });
  assert.equal(since.status, 304);
  const part = await request(PORT, '/assets/audio/a.mp3', { headers: { range: 'bytes=10-19' } });
  assert.equal(part.status, 206);
  assert.equal(part.headers['content-range'], 'bytes 10-19/1000');
  assert.deepEqual([...part.body], [...MP3.subarray(10, 20)]);
  const tail = await request(PORT, '/assets/audio/a.mp3', { headers: { range: 'bytes=-5' } });
  assert.equal(tail.headers['content-range'], 'bytes 995-999/1000');
  const open = await request(PORT, '/assets/audio/a.mp3', { headers: { range: 'bytes=990-' } });
  assert.equal(open.body.length, 10);
  assert.equal((await request(PORT, '/assets/audio/a.mp3', { headers: { range: 'bytes=2000-' } })).status, 416);
  assert.equal((await request(PORT, '/assets/audio/a.mp3')).headers['accept-ranges'], 'bytes');
});

test('a changed _redirects is picked up without a restart', async () => {
  const file = join(FIX, '_redirects');
  const old = await readFile(file, 'utf8');
  try {
    await writeFile(file, `/fresh  /about.html  302\n${old}`);
    const r = await request(PORT, '/fresh');
    assert.equal(r.status, 302);
    assert.equal(r.headers.location, '/about.html');
  } finally {
    await writeFile(file, old);
  }
  assert.equal((await request(PORT, '/fresh')).status, 404);
});

test('a busy port: the next free one is used', async () => {
  const blocker = net.createServer().listen(0, '127.0.0.1');
  await new Promise((r) => blocker.once('listening', r));
  const busy = blocker.address().port;
  const s = createPreviewServer({ root: FIX, log: () => {} });
  try {
    const got = await listen(s, { port: busy, host: '127.0.0.1' });
    assert.ok(got > busy && got < busy + 20, `got ${got}, busy ${busy}`);
    assert.equal((await request(got, '/')).status, 200);
  } finally {
    s.close();
    blocker.close();
  }
});

// ------------------------------------------------------- the launchers ---

// Starts a command, waits for the local URL in its output, returns it.
function startAndWait(cmd, args, opts) {
  return new Promise((resolveP, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error(`no URL after 10 s:\n${out}`)); }, 10000);
    const onData = (d) => {
      out += d;
      const m = /http:\/\/localhost:(\d+)\//.exec(out);
      if (m) { clearTimeout(timer); resolveP({ child, port: Number(m[1]), out: () => out }); }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`exited with ${code} before printing a URL:\n${out}`)); });
  });
}
const stopChild = (child) => new Promise((r) => { child.removeAllListeners('exit'); child.once('exit', r); child.kill('SIGINT'); });

test('serve.mjs from a folder with spaces: prints the addresses and serves the site', async () => {
  const { child, port, out } = await startAndWait(process.execPath, [join(PREVIEW, 'serve.mjs'), FIX, '--port=0', '--no-open'], { cwd: TMP });
  try {
    assert.match(out(), /Datta Peetham website - local preview/);
    assert.ok(out().includes(FIX), 'prints the folder it serves');
    assert.match(out(), /Ctrl\+C/);
    assert.doesNotMatch(out(), /[^\x00-\x7f]/, 'ASCII only, for old Windows consoles');
    const lan = lanAddresses();
    if (lan.length) assert.ok(out().includes(`http://${lan[0]}:${port}/`), 'prints the phone address');
    assert.equal((await request(port, '/about.html')).status, 200);
    assert.equal((await request(port, '/about')).headers.location, '/about.html');
  } finally {
    await stopChild(child);
  }
});

test('serve.mjs: a missing folder is a friendly error, not a stack trace', async () => {
  const r = await new Promise((done) => {
    const c = spawn(process.execPath, [join(PREVIEW, 'serve.mjs'), join(TMP, 'no such folder'), '--no-open', '--port=0'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    c.stdout.on('data', (d) => { out += d; });
    c.stderr.on('data', (d) => { out += d; });
    c.on('exit', (code) => done({ code, out }));
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /There is no website to preview at/);
  assert.doesNotMatch(r.out, /at .*serve\.mjs:\d+/);
});

test('start-preview.sh runs from a path with spaces', { skip: process.platform === 'win32' || !existsSync('/bin/sh') }, async () => {
  // the package layout: <pkg>/preview/start-preview.sh next to <pkg>/website
  const pkg = join(TMP, 'Datta Peetham');
  await mkdir(join(pkg, 'preview'), { recursive: true });
  for (const f of ['serve.mjs', 'start-preview.sh']) await copyFile(join(PREVIEW, f), join(pkg, 'preview', f));
  await chmod(join(pkg, 'preview', 'start-preview.sh'), 0o755);
  const { child, port } = await startAndWait(join(pkg, 'preview', 'start-preview.sh'), ['--port=0', '--no-open'], { cwd: tmpdir() });
  try {
    const r = await request(port, '/');
    assert.equal(r.status, 200);
    assert.equal(r.body.toString(), '<!doctype html><h1>home</h1>');
  } finally {
    await stopChild(child);
  }
});

test('Start-Preview.cmd: CRLF, ASCII, checks for Node.js 20+, quotes every path', async () => {
  const cmd = await readFile(join(PREVIEW, 'Start-Preview.cmd'), 'utf8');
  assert.ok(!/[^\x00-\x7f]/.test(cmd), 'ASCII only');
  assert.equal(cmd.split('\n').length - 1, cmd.split('\r\n').length - 1, 'every line ends in CRLF');
  assert.match(cmd, /^@echo off\r\n/);
  assert.match(cmd, /where node >nul 2>nul\r\nif errorlevel 1 goto nonode/);
  assert.match(cmd, />= 20 \? 0 : 1/);
  assert.match(cmd, /https:\/\/nodejs\.org/);
  assert.match(cmd, /node "%~dp0serve\.mjs" "%~dp0\.\.\\website" %\*/);
  assert.match(cmd, /\r\npause\r\n/, 'the window stays open after a message');
  // opened from inside the zip, Windows extracts the .cmd alone: say so first,
  // before Node.js is even looked for
  const guard = cmd.indexOf('if not exist "%~dp0serve.mjs" goto notextracted\r\n');
  assert.ok(guard > 0 && guard < cmd.indexOf('where node'), 'checks for serve.mjs before anything else');
  assert.match(cmd, /if not exist "%~dp0\.\.\\website\\index\.html" goto notextracted\r\n/);
  assert.match(cmd, /\r\n:notextracted\r\n[\s\S]*Extract All[\s\S]*?\r\npause\r\nexit \/b 1\r\n/);
  // no ( ) blocks: a ")" in the folder path would end them early
  assert.doesNotMatch(cmd.replace(/^(?:echo|rem)\b.*$/gm, '').replace(/"[^"]*"/g, ''), /[()]/);
  const sh = await readFile(join(PREVIEW, 'start-preview.sh'), 'utf8');
  assert.match(sh, /^#!\/bin\/sh\n/);
  assert.doesNotMatch(sh, /\r/);
  assert.match(sh, /exec node "\$here\/serve\.mjs" "\$here\/\.\.\/website" "\$@"/);
});

// ------------------------------------- fidelity: the live-server verifier ---

// The generator's rules for the built site, served by the preview, must pass
// the same checks nginx and Apache pass (deploy/test/docker-servers.mjs).
const VERIFY = join(ROOT, 'deploy', 'test', 'verify-server.mjs');
const haveSite = existsSync(join(SITE, 'index.html')) && existsSync(join(SITE, 'sitemap.xml'));
const WWW = 'https://www.dattapeetham.org';
const SEVA = 'https://seva.dattapeetham.org';

async function verifyAgainst(legacyUrl) {
  const scan = await scanSite(SITE);
  const model = await buildModel({ siteUrl: WWW, legacyUrl, scan });
  const s = createPreviewServer({ root: SITE, redirectsText: renderRedirects(model), headersText: renderHeaders(model), log: () => {} });
  const port = await listen(s, { port: 0, host: '127.0.0.1' });
  try {
    return await new Promise((done) => {
      const c = spawn(process.execPath, [VERIFY, `--base=http://127.0.0.1:${port}/`, '--no-canonical', `--site-url=${WWW}`, `--legacy-url=${legacyUrl}`], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      c.stdout.on('data', (d) => { out += d; });
      c.stderr.on('data', (d) => { out += d; });
      c.on('exit', (code) => done({ code, out }));
    });
  } finally {
    s.closeAllConnections?.();
    s.close();
  }
}

test('the preview passes deploy/test/verify-server.mjs: platform on the same host', { skip: !haveSite && 'no built site (node build.mjs)' }, async () => {
  const r = await verifyAgainst(WWW);
  assert.equal(r.code, 0, r.out.split('\n').filter((l) => /FAIL|checks:/.test(l)).join('\n'));
  assert.match(r.out, /checks: \d+ passed, 0 failed/);
});

test('the preview passes deploy/test/verify-server.mjs: platform on its own host', { skip: !haveSite && 'no built site (node build.mjs)' }, async () => {
  const r = await verifyAgainst(SEVA);
  assert.equal(r.code, 0, r.out.split('\n').filter((l) => /FAIL|checks:/.test(l)).join('\n'));
  // every platform path was checked
  assert.ok(R.legacyPlatform.paths.length > 10);
  assert.match(r.out, /checks: \d+ passed, 0 failed/);
});
