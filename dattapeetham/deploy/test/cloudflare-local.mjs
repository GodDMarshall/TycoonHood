#!/usr/bin/env node
// Serves a built site with Cloudflare's own static-asset worker (workerd, via
// Miniflare 4), configured as deploy/cloudflare/wrangler.jsonc configures it:
// html_handling "none", not_found_handling "404-page", and the site's own
// _redirects, _headers and .assetsignore. Then check it with verify-server.mjs.
//
//   npm install --no-save miniflare@4          (once; not a project dependency)
//   node deploy/test/cloudflare-local.mjs site 8787 &
//   node deploy/test/verify-server.mjs --base=http://127.0.0.1:8787/ --no-canonical --no-vary \
//        "--revalidate=public, max-age=0, must-revalidate"
//
// --no-canonical: on Cloudflare, HTTPS and the bare-domain redirect are zone
// settings, not files. --no-vary: local workerd omits Vary on compressed
// responses; the Cloudflare edge adds it. --revalidate: pages and JSON keep
// Cloudflare's default "public, max-age=0, must-revalidate" (see _headers).

import { resolve } from 'node:path';

const [site = 'site', port = '8787'] = process.argv.slice(2);
let Miniflare;
try { ({ Miniflare } = await import('miniflare')); } catch {
  console.error('Miniflare is not installed: npm install --no-save miniflare@4');
  process.exit(2);
}
const mf = new Miniflare({
  name: 'dattapeetham',
  compatibilityDate: '2026-07-01',
  modules: true,
  script: 'export default { async fetch(request, env) { return env.ASSETS.fetch(request); } }',
  assets: {
    directory: resolve(site),
    binding: 'ASSETS',
    workerName: 'dattapeetham',
    routerConfig: { has_user_worker: false },
    assetConfig: { html_handling: 'none', not_found_handling: '404-page' },
  },
  host: '127.0.0.1',
  port: Number(port),
});
console.log(`Cloudflare asset worker serving ${resolve(site)} at ${(await mf.ready).href}`);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await mf.dispose(); process.exit(0); });
