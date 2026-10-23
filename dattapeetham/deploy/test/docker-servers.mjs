#!/usr/bin/env node
// Serves the built site with real nginx and real Apache (Docker) and runs
// verify-server.mjs against both, for two builds of the server configs:
//   same   the platform shares the site's host (site.config.json today)
//   split  the platform has moved to --legacy-url (default seva.dattapeetham.org)
//
//   node deploy/test/docker-servers.mjs --work=/tmp/dp-servers [--site=site]
//        [--nginx-port=18100 --apache-port=18101] [--nginx-name=dp-nginx --apache-name=dp-httpd]
//        [--legacy-url=https://seva.dattapeetham.org] [--only=same|split] [--keep]
//
// Needs Docker with nginx:1.27-alpine and httpd:2.4-alpine. Nothing in the
// project is changed: the site is copied into --work, the configs are
// generated there, and the containers are removed at the end (unless --keep).
//
// nginx runs the production deploy/nginx/dattapeetham.conf with only its TLS
// lines (marked [tls]) swapped for a plain :80 listener, and the production
// file itself is checked with `nginx -t` against a throw-away certificate.
// Apache runs deploy/apache/dattapeetham.conf plus deploy/test/apache-test.conf,
// which imitates a shared host (a host-wide mod_expires policy) and adds a
// test-only switch for the canonical block.

import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const WORK = resolve(opt('work', ''));
if (!opt('work')) { console.error('--work=<scratch folder> is required'); process.exit(2); }
const SITE = resolve(opt('site', join(ROOT, 'site')));
const NGINX_PORT = opt('nginx-port', '18100');
const APACHE_PORT = opt('apache-port', '18101');
const NGINX = opt('nginx-name', 'dp-nginx');
const APACHE = opt('apache-name', 'dp-httpd');
const LEGACY = opt('legacy-url', 'https://seva.dattapeetham.org');
const ONLY = opt('only');
const KEEP = args.includes('--keep');
const NGINX_IMAGE = 'nginx:1.27-alpine';
const HTTPD_IMAGE = 'httpd:2.4-alpine';
const DOCROOT = '/var/www/dattapeetham/site';

const sh = (cmd, a, o = {}) => execFileSync(cmd, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...o });
const docker = (...a) => sh('docker', a);
const rmContainer = (name) => spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });

// This Docker network has no IPv6, so lines marked [ipv6] are dropped too.
const noIpv6 = (conf) => conf.split('\n').filter((l) => !/\[ipv6\]/.test(l)).join('\n');

/** The production nginx file with its TLS lines replaced by a plain :80 listener. */
function nginxTestConf(prod) {
  return noIpv6(prod).split('\n')
    .filter((l) => !/#\s*\[tls\]/.test(l))
    .map((l) => (/#\s*\[server-name\]/.test(l) ? '    listen 80;\n    server_name 127.0.0.1 localhost;  # test: the production name stays on the canonical server' : l))
    .join('\n');
}

async function waitFor(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { redirect: 'manual' }); if (r.status) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`server at ${url} did not start`);
}

function verify(base, legacyUrl, extra) {
  const r = spawnSync(process.execPath, [join(HERE, 'verify-server.mjs'), `--base=${base}`, '--site-url=https://www.dattapeetham.org', `--legacy-url=${legacyUrl}`, '--fixtures', ...extra], { encoding: 'utf8' });
  const out = r.stdout + r.stderr;
  return { ok: r.status === 0, out, summary: (out.match(/\d+ checks: .*/) || ['(no summary)'])[0] };
}

function prepare(variant) {
  const dir = join(WORK, variant);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const site = join(dir, 'site');
  cpSync(SITE, site, { recursive: true });
  // fixtures the checks look for (they never reach the real site)
  mkdirSync(join(site, '.well-known', 'acme-challenge'), { recursive: true });
  writeFileSync(join(site, '.well-known', 'dp-test.txt'), 'dp-well-known\n');
  writeFileSync(join(site, '.well-known', 'acme-challenge', 'dp-test'), 'dp-acme\n');
  writeFileSync(join(site, '.dp-secret'), 'dp-secret-content\n');
  mkdirSync(join(site, '.git'), { recursive: true });
  writeFileSync(join(site, '.git', 'config'), '[core]\n');
  // the CLI, exactly as the client would run it
  const legacyArg = variant === 'split' ? [`--legacy-url=${LEGACY}`] : ['--legacy-url=https://www.dattapeetham.org'];
  const out = sh(process.execPath, [join(ROOT, 'tools', 'server-configs.mjs'), site, '--site-url=https://www.dattapeetham.org', ...legacyArg, `--project-files=${join(dir, 'project')}`], { cwd: ROOT });
  process.stdout.write(out.replace(/^/gm, '    '));
  const prod = readFileSync(join(dir, 'project', 'deploy', 'nginx', 'dattapeetham.conf'), 'utf8');
  writeFileSync(join(dir, 'nginx-test.conf'), nginxTestConf(prod));
  writeFileSync(join(dir, 'nginx-production-no-ipv6.conf'), noIpv6(prod));
  return { dir, site, prodConf: join(dir, 'nginx-production-no-ipv6.conf') };
}

function checkProductionNginx({ dir, site, prodConf }) {
  // `nginx -t` on the unmodified production file, with a throw-away certificate
  const certs = join(dir, 'certs');
  mkdirSync(certs, { recursive: true });
  if (!existsSync(join(certs, 'fullchain.pem'))) {
    sh('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=www.dattapeetham.org',
      '-keyout', join(certs, 'privkey.pem'), '-out', join(certs, 'fullchain.pem')]);
  }
  const r = spawnSync('docker', ['run', '--rm', '-v', `${site}:${DOCROOT}:ro`, '-v', `${prodConf}:/etc/nginx/conf.d/default.conf:ro`,
    '-v', `${certs}:/etc/ssl/dattapeetham:ro`, NGINX_IMAGE, 'nginx', '-t'], { encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout + r.stderr).trim() };
}

async function runNginx({ dir, site }) {
  rmContainer(NGINX);
  docker('run', '-d', '--name', NGINX, '-p', `127.0.0.1:${NGINX_PORT}:80`, '-v', `${site}:${DOCROOT}:ro`,
    '-v', `${join(dir, 'nginx-test.conf')}:/etc/nginx/conf.d/default.conf:ro`, NGINX_IMAGE);
  await waitFor(`http://127.0.0.1:${NGINX_PORT}/`);
  return spawnSync('docker', ['exec', NGINX, 'nginx', '-t'], { encoding: 'utf8' }).stderr.trim();
}

async function runApache({ dir, site }) {
  rmContainer(APACHE);
  const conf = join(dir, 'httpd.conf');
  const base = docker('run', '--rm', HTTPD_IMAGE, 'cat', '/usr/local/apache2/conf/httpd.conf');
  writeFileSync(conf, `${base}\n# ---- added by deploy/test/docker-servers.mjs ----\nInclude conf/extra/dattapeetham.conf\nInclude conf/extra/dp-test.conf\n`);
  const mounts = ['-v', `${site}:${DOCROOT}:ro`, '-v', `${conf}:/usr/local/apache2/conf/httpd.conf:ro`,
    '-v', `${join(ROOT, 'deploy', 'apache', 'dattapeetham.conf')}:/usr/local/apache2/conf/extra/dattapeetham.conf:ro`,
    '-v', `${join(HERE, 'apache-test.conf')}:/usr/local/apache2/conf/extra/dp-test.conf:ro`];
  const t = spawnSync('docker', ['run', '--rm', ...mounts, HTTPD_IMAGE, 'httpd', '-t'], { encoding: 'utf8' });
  if (t.status !== 0) throw new Error(`httpd -t failed:\n${t.stdout}${t.stderr}`);
  docker('run', '-d', '--name', APACHE, '-p', `127.0.0.1:${APACHE_PORT}:80`, ...mounts, HTTPD_IMAGE);
  await waitFor(`http://127.0.0.1:${APACHE_PORT}/`);
  return (t.stdout + t.stderr).trim();
}

const results = [];
try {
  for (const variant of ['same', 'split'].filter((v) => !ONLY || v === ONLY)) {
    const legacyUrl = variant === 'split' ? LEGACY : 'https://www.dattapeetham.org';
    console.log(`\n== ${variant}-host build (platform: ${legacyUrl})`);
    const prep = prepare(variant);
    const prod = checkProductionNginx(prep);
    console.log(`  nginx -t, production file with TLS: ${prod.ok ? 'ok' : 'FAILED'}\n${prod.out.replace(/^/gm, '    ')}`);
    results.push({ name: `${variant}: nginx -t (production, TLS)`, ok: prod.ok, summary: prod.ok ? 'syntax ok' : prod.out });

    const ntest = await runNginx(prep);
    console.log(`  nginx (${NGINX_IMAGE}) on :${NGINX_PORT}: ${ntest.split('\n').pop()}`);
    const n = verify(`http://127.0.0.1:${NGINX_PORT}/`, legacyUrl, []);
    console.log(n.out.split('\n').filter((l) => /FAIL|checks:/.test(l) || /^\s{9}/.test(l)).map((l) => '    ' + l).join('\n'));
    results.push({ name: `${variant}: nginx`, ...n });

    const atest = await runApache(prep);
    console.log(`  Apache (${HTTPD_IMAGE}) on :${APACHE_PORT}: ${atest.split('\n').pop()}`);
    const a = verify(`http://127.0.0.1:${APACHE_PORT}/`, legacyUrl, ['--forwarded-proto', '--canonical-off=X-DP-Canonical:off']);
    console.log(a.out.split('\n').filter((l) => /FAIL|checks:/.test(l) || /^\s{9}/.test(l)).map((l) => '    ' + l).join('\n'));
    results.push({ name: `${variant}: Apache`, ...a });
    writeFileSync(join(prep.dir, 'verify-nginx.log'), n.out);
    writeFileSync(join(prep.dir, 'verify-apache.log'), a.out);
  }
} finally {
  if (!KEEP) { rmContainer(NGINX); rmContainer(APACHE); }
}

console.log('\n== summary');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(36)} ${r.summary}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
