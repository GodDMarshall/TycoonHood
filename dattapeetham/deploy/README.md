# Serving the site: any host, same behaviour

The site is a folder of static files (`site/`, made by `node build.mjs`). How
a server must serve it is written once, as data, in `deploy/routes.mjs`:

- **Security headers** on every response: the Content Security Policy, HSTS,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and
  `Permissions-Policy`.
- **Caching.** Pages, JSON, the sitemap, `robots.txt` and the web manifest
  are always revalidated (`no-cache`). CSS and JS are kept for a year as
  `immutable`, because every reference carries a content hash (`?v=…`).
  Images and fonts under `/assets/` are kept for 30 days.
- **Redirects** (all 301, query string kept):
  - The 41 old-site addresses go to the new pages. For example,
    `/page/view/sri-bala-swamiji` goes to `/sri-swamiji.html#bala-swamiji`.
  - Every page without `.html` goes to its `.html` URL, which is the
    canonical form: `/about` → `/about.html` and `/kn/about` →
    `/kn/about.html`.
  - `/index` goes to `/`, and `/kn` goes to `/kn/`.
- **The Peetham's existing platform**: puja booking, donations, the store,
  sign-in, concerts, the legal pages and the old pages. Once that platform
  runs on its own host, requests for its paths that still reach the new
  site go to the same path and query on the platform's host. This is a 302,
  so the platform can move again. While the platform shares the site's
  host, no such rule is written, because it would loop.
- **404**: an unknown path at any depth, in any language folder, gets
  `/404.html` with status 404.
- **Hidden files** (`.htaccess`, `.git/…`) and the other servers' config
  files are never served. The exception is `/.well-known/`.

`tools/server-configs.mjs` turns those rules into each server's own format.
The build runs it, so `site/` always carries the files for Apache, IIS,
Netlify and Cloudflare. The project-level files are rewritten too, but only
when the build uses the addresses in `site.config.json`.

| Host | File | Where it comes from |
| --- | --- | --- |
| Apache 2.4, cPanel, most shared hosting | `site/.htaccess` | in `site/` |
| nginx | `deploy/nginx/dattapeetham.conf` | project |
| IIS (Windows Server) | `site/web.config` | in `site/` |
| Netlify | `site/_redirects`, `site/_headers` | in `site/` |
| Cloudflare (Workers static assets) | `deploy/cloudflare/wrangler.jsonc` + `site/_redirects`, `_headers`, `.assetsignore` | both |
| Vercel | `vercel.json` | project |

To regenerate the files by hand, for example after editing `routes.mjs`,
run:

```
node tools/server-configs.mjs site
node tools/server-configs.mjs site --legacy-url=https://seva.dattapeetham.org
```

The two addresses come from `--site-url=` / `--legacy-url=`, then
`DP_SITE_URL` / `DP_LEGACY_URL`, then `site.config.json` (`siteUrl`,
`legacyPlatformUrl`).

## Before the new site takes the domain

1. Move the existing platform to its own host, for example
   `https://seva.dattapeetham.org`, and check that it works there.
   - Its payment gateways and the mobile apps call it by address, so update
     their callback and API URLs. A 302 cannot carry a form POST across.
   - It must serve HTTPS: the HSTS header covers every subdomain
     (`includeSubDomains`).
2. Put that address in `site.config.json` as `legacyPlatformUrl`, then run
   `node build.mjs`. Every platform link in the pages now points there, and
   every server file carries the platform redirects.
3. Deploy `site/` (and the file for your server, see below), then point the
   domain at it.
4. Check the live site:

   ```
   node deploy/test/verify-server.mjs --base=https://www.dattapeetham.org/ --no-canonical
   ```

   Then run it once more without `--no-canonical` against the server's own
   address. That run also tests the redirect from `dattapeetham.org` and the
   http-to-https redirect, by sending the right `Host` header.

## Per host

### Apache, cPanel and shared hosting

- Upload the contents of `site/` to `public_html`, including the hidden
  `.htaccess`. In cPanel's File Manager, turn on *Settings → Show Hidden
  Files* first.
- The file needs `AllowOverride All`, which is the cPanel default. Every
  module it uses is guarded, so a missing module turns off one feature but
  never breaks the site. It also switches off any host-wide `mod_expires`
  policy, which would add a second, conflicting cache lifetime.
- A host that forbids `Options` in `.htaccess` answers with a 500 error.
  Delete the two `Options` lines; most hosts allow them.
- The block marked *canonical host and HTTPS* does two things:
  - It sends `dattapeetham.org` to `https://www.dattapeetham.org`.
  - It sends plain http to https.

  Any other host name is left alone, such as a staging or cPanel preview
  address. To switch the block off, delete it, or put
  `SetEnvIf Request_URI "^" DP_CANONICAL=off` in the virtual host. Behind
  a CDN that handles TLS, the block trusts `X-Forwarded-Proto: https`.
- `deploy/apache/dattapeetham.conf` is the server-side setup for a VPS: the
  modules, `AllowOverride` and the virtual hosts. It is also the
  configuration that `deploy/test/docker-servers.mjs` tests.

### nginx

1. Copy `site/` to `/var/www/dattapeetham/site`. If you use another path,
   change `root`.
2. Copy `deploy/nginx/dattapeetham.conf` into `/etc/nginx/conf.d/`.
3. Set the certificate paths on the lines marked `[tls]`. One certificate
   must cover both `www.dattapeetham.org` and `dattapeetham.org`.
   Let's Encrypt over HTTP-01 works as it is: `/.well-known/acme-challenge/`
   is not redirected.
4. Run `nginx -t`, then reload.

Things to know:

- If the server has no IPv6, delete the lines marked `[ipv6]`.
- nginx 1.25.1+ warns that `listen … http2` is deprecated. It still works.
  You can swap it for `http2 on;`, but nginx 1.24 and older don't
  understand that.
- The file never uses `add_header` inside a `location`. nginx would
  otherwise silently drop all the other headers there.

### IIS

- Install the **URL Rewrite** module, then copy `site/` (with `web.config`)
  to the site's folder.
- If IIS reports that the `httpErrors` section is locked, unlock it at the
  server level:
  `%windir%\system32\inetsrv\appcmd.exe unlock config -section:system.webServer/httpErrors`.
- To switch off the canonical host and HTTPS rules, set `enabled="false"`
  on the two rules named `DP canonical host` and `DP https`.

### Netlify

- Set the publish directory to `site` and the build command to
  `node build.mjs`.
- If your site's post-processing settings still offer *Pretty URLs*, keep
  that option off: it would redirect `/about.html` to `/about`.
- Netlify handles HTTPS and the bare-domain redirect once the primary
  domain is set.
- Netlify may serve `/about` straight from `about.html`, because a file
  "exists" there, instead of redirecting it. If `verify-server.mjs`
  reports that, build with
  `node build.mjs && node tools/server-configs.mjs site --netlify-force`.
  That adds `!` to the page-URL rules. Cloudflare rejects `!`, which is why
  the default file does not use it.
- Pages and JSON keep the host's default
  `public, max-age=0, must-revalidate`, which revalidates like `no-cache`.
  `_headers` sets no Cache-Control on `/*`: both hosts apply every matching
  rule, and Cloudflare joins a second value onto the first with a comma.
  Test with `--revalidate="public, max-age=0, must-revalidate"`.

### Cloudflare

- Use **Workers static assets**, not Cloudflare Pages. Pages always
  redirects `/about.html` to `/about`, which goes against the canonical
  URLs, and it can't be turned off.
- Deploy with
  `node build.mjs && npx wrangler deploy --config deploy/cloudflare/wrangler.jsonc`.
- In the zone, turn on *Always Use HTTPS*, and add a redirect rule from
  `dattapeetham.org` to `www`.
- `.assetsignore` keeps dotfiles and `web.config` out of the upload.
- An unknown path inside a language folder gets that language's
  `404.html`, not the English one. It still has status 404.
- To test locally, run `deploy/test/cloudflare-local.mjs`. It uses
  Cloudflare's own asset worker.

### Vercel

- Import the repository and set the Root Directory to `dattapeetham`.
  `vercel.json` holds the build settings, headers and redirects.
  `cleanUrls` is `false`, so the `.html` URLs stay.
- `trailingSlash` is deliberately left unset. Setting it to `false` would
  send `/kn/` to `/kn` with a 308, which breaks that page's relative links.
- Vercel handles HTTPS and the bare-domain redirect in its domain settings.
- Vercel serves the files of other hosts (`.htaccess`, `web.config`) as
  plain files. None of them holds a secret.

## Testing

| What | Command |
| --- | --- |
| Data, generator and file syntax | `node --test tests/server-configs.test.mjs` |
| Real nginx and Apache, same-host and split-host builds | `node deploy/test/docker-servers.mjs --work=/tmp/dp-servers` |
| Any running server | `node deploy/test/verify-server.mjs --base=http://host:port/` |
| Cloudflare's asset worker, locally | `deploy/test/cloudflare-local.mjs` (see its header) |

`docker-servers.mjs` needs Docker with `nginx:1.27-alpine` and
`httpd:2.4-alpine`.

- **nginx**: it runs the production nginx file with only its `[tls]` lines
  replaced by a plain `:80` listener. It also checks the unchanged
  production file with `nginx -t`, using a throwaway certificate.
- **Apache**: it runs `deploy/apache/dattapeetham.conf` on top of a host
  that, like many shared hosts, has its own `mod_expires` policy.

Each run makes about 800 HTTP checks per server and build:

- every redirect, with its status and `Location`
- every page in every language
- the 404 page
- the headers and content types
- hidden files
- the platform hand-off
- the canonical host and HTTPS redirects
