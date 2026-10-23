# Putting the website on a server

Version 1.0.0. This guide covers each kind of host, step by step, and how to
check the server afterwards. Windows PowerShell commands come first, then
Linux and macOS.

For moving `www.dattapeetham.org` itself (DNS, certificates, the existing
platform, rollback), follow [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md). This
guide is the "deploy" part of it.

## Before you start

### Which folder to upload

| You have | Upload |
| --- | --- |
| The package as delivered | the **contents** of `website\` |
| `dattapeetham-website-v1.0.0-deploy-only.zip` | the files inside the zip (they are at its top level) |
| A fresh build you made in `source\` | the **contents** of `source\site\` |

Upload the *contents*: `index.html` must end up at the top of the web root,
not inside a `website` folder.

The folder includes files whose names start with a dot (`.htaccess`,
`.assetsignore`). Some programs hide them. Make sure they are uploaded.

### Check the addresses it was built for

Every server file was generated for two addresses (see `VERSION.txt`, or the
top of any server file):

- **site**: `https://www.dattapeetham.org`
- **legacy platform**: where bookings, donations, sign-in and the store run

If both are the same, the site is fine for testing, but not for taking over
the domain. Rebuild first, as described in
[DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), step 3.

### What every server does with these files

The rules are written once, in `deploy/routes.mjs`, and turned into each
server's own format by the build. On every host the result is the same:

- **Security headers on every response:** a Content Security Policy,
  `Strict-Transport-Security` (HSTS: HTTPS only, for two years, for the
  site's own names; not for other subdomains), `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
- **Caching:** pages and data are revalidated on every visit; CSS and
  JavaScript (which carry a content hash in their address) are kept for a
  year; photos and fonts for 30 days.
- **Redirects (301):** 41 addresses of the old site go to the new pages (for
  example `/page/view/sri-bala-swamiji` goes to
  `/sri-swamiji.html#bala-swamiji`). Addresses without `.html` go to the
  `.html` address (`/about` to `/about.html`, `/kn/about` to
  `/kn/about.html`).
- **The existing platform (302):** once the platform has its own address,
  requests for its paths that still arrive at the new site (26 rules:
  `/poojas`, `/donations`, `/store`, `/login`, everything under
  `/page/view/` that has no new page, and so on) are sent on to the same path
  and query on the platform.
- **The 404 page** for every unknown address, with HTTP status 404.
- **Hidden files** (`.htaccess`, `.git`) and the other servers' files
  (`_headers`, `_redirects`, `web.config`) are never served.
- **Canonical address:** `http://` and the bare `dattapeetham.org` are sent
  to `https://www.dattapeetham.org`. Let's Encrypt's
  `/.well-known/acme-challenge/` path is left alone. On Netlify, Cloudflare
  and Vercel this is a setting in the host's dashboard instead.

Do not edit the generated server files by hand: a rebuild overwrites them.
Change `site.config.json` or `deploy/routes.mjs` and rebuild instead.

### Choose your host

| Host | File it uses | Where the file is |
| --- | --- | --- |
| Apache 2.4, cPanel, most shared hosting | `.htaccess` | already in `website\` |
| nginx | `dattapeetham.conf` | `server-configs\nginx\` (package) or `deploy\nginx\` (source) |
| IIS (Windows Server) | `web.config` | already in `website\` |
| Netlify | `_headers`, `_redirects` | already in `website\` |
| Cloudflare (Workers static assets) | `wrangler.jsonc` with `_headers`, `_redirects`, `.assetsignore` | `source\deploy\cloudflare\` and `website\` |
| Vercel | `vercel.json` | `source\` |
| Anything else (S3 + CloudFront, a plain file host) | none: configure by hand | see [Plain static hosting](#plain-static-hosting-s3-and-cloudfront-and-others) |

The configurations for nginx and Apache were tested on real nginx 1.27 and
Apache 2.4 servers (about 800 requests each, all passing). The files for IIS,
Netlify, Cloudflare and Vercel are checked by the automated tests (format,
rules, order), but were not run on those hosts by the agency. Run the server
check below after deploying to any of them.

## Apache, cPanel and shared hosting

**Server requirements:**

- Apache 2.4 with `AllowOverride All` on the web root (the cPanel default).
- `mod_rewrite` and `mod_headers` (needed for the redirects and the security
  headers), `mod_mime` and `mod_dir`. `mod_deflate` or `mod_brotli` are used
  when present, for compression.
- Every module block in `.htaccess` is guarded. A missing module switches off
  that one feature; it never breaks the site.

**cPanel, step by step:**

1. Open **File Manager**. Click **Settings** (top right), tick **Show Hidden
   Files (dotfiles)** and save.
2. Open `public_html`. If it holds an older site, move those files into a
   backup folder first.
3. Upload the site. The easiest way: upload
   `dattapeetham-website-v1.0.0-deploy-only.zip` into `public_html`,
   right-click it and choose **Extract**, then delete the zip. (Or upload the
   contents of `website\` by FTP/SFTP. In FileZilla, turn on *Server → Force
   showing hidden files* first.)
4. Check that `public_html` now holds `index.html`, `.htaccess`,
   `404.html`, `assets` and the folders `kn`, `hi`, `ta`, `te`.
5. HTTPS: once the domain points at the server, cPanel's **SSL/TLS Status**
   page can issue a free certificate (AutoSSL) for `www.dattapeetham.org`
   and `dattapeetham.org`. Your host's support can confirm how it works on
   their servers.

**If something goes wrong:**

- *Error 500 on every page:* some hosts forbid `Options` in `.htaccess`.
  Delete the two lines that start with `Options` and try again.
- *The redirects work but the headers are missing:* `mod_headers` is not
  enabled. Ask the host to enable it.
- The block marked `canonical host and HTTPS` sends `dattapeetham.org` and
  plain `http://` to `https://www.dattapeetham.org`. Other host names (a
  staging address, a cPanel preview address, the server's IP) are left
  alone. Behind a CDN that handles HTTPS, it trusts
  `X-Forwarded-Proto: https`. To switch the block off, delete it.
- `.htaccess` switches off any host-wide `mod_expires` policy for this site,
  because a second cache lifetime would conflict with its own.

**Your own Apache server (VPS).** `server-configs\apache\dattapeetham.conf`
(`deploy/apache/dattapeetham.conf` in the source) is the server side that
the `.htaccess` expects: modules, `AllowOverride All` and the virtual hosts.
On Debian or Ubuntu:

```bash
sudo apt install apache2 rsync
sudo a2enmod rewrite headers expires filter deflate ssl
sudo mkdir -p /var/www/dattapeetham/site
sudo rsync -a --delete /tmp/website/ /var/www/dattapeetham/site/   # after copying website/ to /tmp (see nginx below)
sudo cp dattapeetham.conf /etc/apache2/sites-available/dattapeetham.conf
sudo a2ensite dattapeetham
sudo apache2ctl configtest && sudo systemctl reload apache2
```

Its HTTPS virtual host switches itself on once a certificate exists at
`/etc/ssl/dattapeetham/fullchain.pem` (and `privkey.pem`). See the
certificate steps under nginx below; they are the same, with
`systemctl reload apache2` in place of `systemctl reload nginx`.

## nginx

The file `dattapeetham.conf` holds three server blocks:

- port 80 for both names: sends everything to `https://www.dattapeetham.org`,
  except the Let's Encrypt challenge path;
- port 443 for `dattapeetham.org`: sends everything to `www`;
- port 443 for `www.dattapeetham.org`: the site itself.

It needs nginx 1.11.8 or newer. It expects the site in
`/var/www/dattapeetham/site` and the certificate in
`/etc/ssl/dattapeetham/`. These are commands on the server (Debian or
Ubuntu); adapt the package manager for other systems.

**1. Copy the site and its configuration to the server.** From Windows
PowerShell (Windows 10 and later include `scp`), in the package folder:

```powershell
scp -r .\website user@your-server:/tmp/
scp .\server-configs\nginx\dattapeetham.conf user@your-server:/tmp/
```

From Linux or macOS:

```bash
scp -r website user@your-server:/tmp/
scp server-configs/nginx/dattapeetham.conf user@your-server:/tmp/
```

After a rebuild in `source\`, run the same two commands in `source\` with
`site` in place of `website` and `deploy\nginx\dattapeetham.conf` in place
of `server-configs\nginx\dattapeetham.conf`, and use `/tmp/site/` in step 2.

**2. Put it in place and install the configuration** (on the server):

```bash
sudo apt install nginx rsync
sudo mkdir -p /var/www/dattapeetham/site
sudo rsync -a --delete /tmp/website/ /var/www/dattapeetham/site/
sudo cp /tmp/dattapeetham.conf /etc/nginx/conf.d/dattapeetham.conf
```

Use the `dattapeetham.conf` from the same package or build as the site, so
both carry the same addresses.

- If the server has no IPv6, delete the lines marked `[ipv6]`. Otherwise
  nginx will not start ("Address family not supported"):

  ```bash
  sudo sed -i '/\[ipv6\]/d' /etc/nginx/conf.d/dattapeetham.conf
  ```

  Every build writes those lines into the file again, so do this each time
  you install a new copy of it (see *Deploying an update later*).
- nginx 1.25.1 and newer warn that `listen ... http2` is deprecated. It still
  works.
- The file puts every `add_header` at server level, never inside a
  `location`. Keep it that way if you add anything: nginx silently drops the
  other headers in a `location` that sets its own.

**3. The certificate.** One certificate must cover both
`www.dattapeetham.org` and `dattapeetham.org`. nginx will not load the file
until the two certificate files exist. With Let's Encrypt and `certbot`,
there are two ways.

*Before the DNS switch (no certificate warnings at all; recommended):* prove
ownership with a DNS record.

```bash
sudo apt install certbot
sudo certbot certonly --manual --preferred-challenges dns -d www.dattapeetham.org -d dattapeetham.org
```

certbot shows a TXT record to add at your DNS provider, then waits. A
certificate made this way does not renew by itself: after the DNS switch,
run the webroot command below once, and choose *Renew & replace* when
certbot asks.

*After the DNS switch (simpler; a few minutes of certificate warnings):*
start nginx with a throw-away certificate, then ask for the real one over
http.

```bash
sudo mkdir -p /etc/ssl/dattapeetham
sudo openssl req -x509 -newkey rsa:2048 -nodes -days 7 -subj /CN=www.dattapeetham.org \
  -keyout /etc/ssl/dattapeetham/privkey.pem -out /etc/ssl/dattapeetham/fullchain.pem
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/dattapeetham/site \
  -d www.dattapeetham.org -d dattapeetham.org --deploy-hook "systemctl reload nginx"
```

Either way, point the configuration's certificate paths at the Let's Encrypt
files, so that renewals are picked up without editing the configuration:

```bash
sudo mkdir -p /etc/ssl/dattapeetham
sudo ln -sf /etc/letsencrypt/live/www.dattapeetham.org/fullchain.pem /etc/ssl/dattapeetham/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/www.dattapeetham.org/privkey.pem /etc/ssl/dattapeetham/privkey.pem
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

These are standard certbot commands. The agency could not run them, because
its test servers have no public domain. The configuration itself, including
`nginx -t` with a certificate in place, was tested.

**4. Test and reload:** `sudo nginx -t`, then `sudo systemctl reload nginx`.

## IIS (Windows Server)

**Requirements:**

- IIS 7.5 or newer with the *Static Content* feature.
- The **URL Rewrite** module, from Microsoft:
  <https://www.iis.net/downloads/microsoft/url-rewrite>. Install it first.
  `web.config` relies on it for every redirect.

**Steps:**

1. In IIS Manager, add a website. Physical path: for example
   `C:\inetpub\dattapeetham`. Add bindings for `www.dattapeetham.org` and
   `dattapeetham.org`, on http (port 80) and on https (port 443, with your
   certificate, *Require Server Name Indication* ticked).
2. Copy the contents of `website\` into that folder, `web.config` included.
   In PowerShell, from the package folder:

   ```powershell
   robocopy .\website C:\inetpub\dattapeetham /MIR
   ```

   `/MIR` makes the folder an exact copy, deleting files that are no longer in
   the site. Use it only on a folder that holds this site alone.
3. Open `https://www.dattapeetham.org/` (after the DNS switch), or test first
   as described in [Check the server](#check-the-server-after-deploying).

**If something goes wrong:**

- *"This configuration section cannot be used at this path"* about
  `httpErrors`: the section is locked at server level. Unlock it, in an
  Administrator command prompt:
  `%windir%\system32\inetsrv\appcmd.exe unlock config -section:system.webServer/httpErrors`
- *Error 500.19 on every request:* usually the URL Rewrite module is missing.
- The rules named `DP canonical host` and `DP https` send `dattapeetham.org`
  and plain `http://` to `https://www.dattapeetham.org`. Other host names are
  left alone. To switch them off (for example behind a proxy that handles
  HTTPS), set `enabled="false"` on both. The https rule already trusts
  `X-Forwarded-Proto: https`.
- **Certificates:** IIS has no built-in Let's Encrypt client. Import a
  certificate you have (IIS Manager → *Server Certificates*), or use a
  Windows ACME client such as win-acme.

## Netlify

**Drag and drop:** when you add a new site in Netlify, choose the manual
deploy option and drag the `website` folder onto it. `_headers` and
`_redirects` are inside the folder, so headers and redirects work at once.

**From Git:** put `source\` in a Git repository and connect it. Settings:

| Setting | Value |
| --- | --- |
| Base directory | the folder that holds `build.mjs` (empty if it is the repository root) |
| Build command | `node build.mjs --production` |
| Publish directory | `site` |

Then:

- In *Domain management*, add `www.dattapeetham.org` as the primary domain
  and `dattapeetham.org` as an alias. Netlify handles HTTPS and the
  redirect from the bare domain.
- If your site's settings still offer *Pretty URLs* (post-processing), keep
  it off. It would redirect `/about.html` to `/about`, against the site's
  canonical `.html` addresses.
- Netlify may serve `/about` straight from `about.html` instead of
  redirecting it. If the server check reports that, build with the forced
  rules and deploy that build:

  ```powershell
  node build.mjs --production
  node tools/server-configs.mjs site --netlify-force
  ```

  (`--netlify-force` adds `!` to the page-address rules. Cloudflare rejects
  `!`, which is why the default file does not use it.)
- Pages keep Netlify's own `Cache-Control: public, max-age=0,
  must-revalidate`, which revalidates like `no-cache`. When you run the
  server check, add the matching option (see below).

## Cloudflare

Use **Workers static assets**, not Cloudflare Pages. A custom domain on a
Worker needs `dattapeetham.org` to be a zone in the Peetham's Cloudflare
account, which means its DNS moves to Cloudflare. If it is not there
already, plan that move on its own, before the switch, copying every
existing record (`MX` and the others) first. Cloudflare Pages always
redirects `/about.html` to `/about`, which goes against the site's canonical
`.html` addresses, and that cannot be turned off.
`source\deploy\cloudflare\wrangler.jsonc` sets Workers to serve files exactly
as named.

1. Build in `source\`, then deploy from the same folder:

   ```powershell
   node build.mjs --production
   npx wrangler deploy --config deploy/cloudflare/wrangler.jsonc
   ```

   `npx` downloads Wrangler, Cloudflare's tool; it asks you to sign in to
   your Cloudflare account the first time.
2. On the Worker, add the custom domain `www.dattapeetham.org`.
3. In the zone, turn on **Always Use HTTPS**, and add a redirect rule from
   `dattapeetham.org` to `https://www.dattapeetham.org` (keeping the path and
   query).

Notes:

- `.assetsignore` keeps the dotfiles and `web.config` out of the upload.
- An unknown address inside a language folder, at any depth, gets that
  language's `404.html` (still with status 404). Its links and styles are
  root-absolute, so it works at `/kn/a/b` as well as at `/kn/x`.

## Vercel

1. Rebuild in `source\` first (`node build.mjs --production`, as in
   [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), step 3), then put `source\` in a
   Git repository, **including the `vercel.json` that build rewrote**, and
   import it into Vercel. Vercel reads the redirects and headers in
   `vercel.json` before it builds, so after any change to `site.config.json`
   (or `deploy/routes.mjs`), rebuild locally and commit `vercel.json` with
   it. Otherwise the platform redirects keep the old address.
2. Set **Root Directory** to the folder that holds `vercel.json` (in the
   agency's repository it is `dattapeetham`; leave it empty if `vercel.json`
   is at the repository root).
3. Deploy. There is nothing to install. `vercel.json` holds the build
   command (`node build.mjs`), the output folder (`site`), the headers and the
   redirects.
4. In the project's environment variables, add `DP_PRODUCTION` = `1` for
   the *Production* environment. The build then refuses to run while the
   platform address is still the site's own (the same check as
   `--production`).
5. In *Domains*, add `www.dattapeetham.org`, and `dattapeetham.org`
   redirecting to it. Vercel handles HTTPS.

Notes:

- `cleanUrls` is `false`, so the `.html` addresses stay.
- `trailingSlash` is deliberately not set. Setting it to `false` would send
  `/kn/` to `/kn`, which breaks that page's links.
- Vercel serves the other hosts' files (`.htaccess`, `web.config`) as plain
  files. None of them holds a secret.

## Plain static hosting, S3 and CloudFront, and others

Any host that serves files will show the site: upload the contents of
`website\`. But a host that reads none of the server files above gives you
**only the files**. You lose, unless you set them up in the host's own
settings:

| Lost | What happens without it | What to set up |
| --- | --- | --- |
| Redirects of old addresses | Old bookmarks and search results (`/page/view/about-us`) give "not found" | The 301 rules in `website/_redirects` |
| `.html` redirects | `/about` gives "not found" (`/about.html` works) | The page rules in `website/_redirects` |
| Platform hand-off | `/poojas`, `/donations` and so on give "not found" on the new site | The 302 rules in `website/_redirects` |
| Security headers | No Content Security Policy, no HSTS, no clickjacking protection | The headers in `website/_headers` |
| Cache rules | The host's defaults; visitors may keep old CSS or pages | The values in `website/_headers` |
| The 404 page with status 404 | The host's own error page, or a "soft" 404 | Error document `404.html`, status 404 |
| Folder index | `/kn/` may not open `/kn/index.html` | Index document `index.html` for every folder |

On **Amazon S3 with CloudFront**, the usual tools are: the bucket's static
website hosting (index and error document), CloudFront *response headers
policies* (headers), and CloudFront Functions or S3 routing rules
(redirects). The agency has not written or tested a configuration for it.
After setting it up, run the server check below: it lists everything that is
missing.

## Check the server after deploying

`deploy/test/verify-server.mjs` checks a running server against the rules
with real requests: every redirect (status and target), every page in every
language, the 404 page, the security and cache headers, content types,
hidden files and the platform hand-off. About 800 checks. It needs only
Node.js 20 or newer, and nothing to install.

Run it in `source\`. It reads `site.config.json` there to know which
addresses to expect, so use the same `site.config.json` the site was built
with (or give `--site-url=` and `--legacy-url=`).

**After the DNS switch** (any host):

```powershell
node deploy/test/verify-server.mjs --base=https://www.dattapeetham.org/ --no-canonical
```

The last line reads, for example, `827 checks: 827 passed, 0 failed`, and the
exit code is 0. Failures are listed above it with what was expected and what
came back.

`--no-canonical` skips the tests of the `http://` and bare-domain redirects,
which need plain http. Check those with `curl` (on Windows, type `curl.exe`,
because `curl` in Windows PowerShell 5 is a different command):

```powershell
curl.exe -sI http://dattapeetham.org/about.html
curl.exe -sI https://dattapeetham.org/about.html
curl.exe -sI http://www.dattapeetham.org/about.html
```

Each must answer `301` with `Location: https://www.dattapeetham.org/about.html`.
On Linux and macOS, use `curl` instead of `curl.exe`.

**Options by host:**

| Host | Add |
| --- | --- |
| nginx, Apache, IIS | nothing extra |
| Netlify, Cloudflare | `"--revalidate=public, max-age=0, must-revalidate"` (quotes included) |
| Cloudflare, tested locally with `deploy/test/cloudflare-local.mjs` | also `--no-vary` |

**Before the DNS switch:**

- *Netlify, Vercel or Cloudflare:* use the address the host gives the new
  site, for example `--base=https://your-site.netlify.app/ --no-canonical`.
- *Apache or IIS on a server of your own, where the new site answers the
  server's IP address:* the canonical rules of `.htaccess` and `web.config`
  leave other host names alone, so you can test by IP address, without
  `--no-canonical`: `--base=http://203.0.113.10/` (use the server's real
  address). On Debian or Ubuntu Apache, disable the default site first
  (`sudo a2dissite 000-default`); on IIS, give the site an extra http
  binding with no host name. On shared hosting the IP address leads to the
  host's own page instead; use the next method. (nginx always sends plain
  http to `https://www`, so use the next method there too.)

  This is for the server check only. **In a browser, a page opened at
  `http://203.0.113.10/` shows without its styles and scripts**: the
  security policy (`upgrade-insecure-requests`) makes the browser fetch
  every stylesheet, script and image over `https://203.0.113.10/`, which
  fails. That is expected, and does not happen at the real address. For
  checks in a browser, use the hosts-file method below, over `https://`.
- *Any server that already has its certificate:* make your computer send
  `www.dattapeetham.org` to the new server, with two lines in your hosts
  file (replace the address):

  ```
  203.0.113.10  www.dattapeetham.org
  203.0.113.10  dattapeetham.org
  ```

  On Windows the file is `C:\Windows\System32\drivers\etc\hosts`; open
  Notepad *as Administrator* to edit it, then run `ipconfig /flushdns`. On
  Linux and macOS it is `/etc/hosts` (edit with `sudo`). Then run the two
  commands above (`verify-server.mjs ... --no-canonical`, and the `curl`
  checks). **Remove the two lines afterwards.**

**If the check stops with `TypeError: Cannot read properties of undefined
(reading 'slice')`:** it could not read `sitemap.xml` at that address,
usually because the address redirected (to `https://`, or to `www`) or
reached another site on the same server. Check the `--base` address in a
browser.

**Then, in a browser,** run through the by-hand checks in
[DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), step 7.

### The browser check (optional)

`qa/check-pages.mjs` opens every page in Chromium at desktop and phone sizes
and with reduced motion. It runs accessibility checks (axe) and reports
console errors and sideways scrolling. It needs `npm install` and
`npx playwright install chromium` once, in `source\`. Then:

```powershell
$env:BASE_URL = "https://www.dattapeetham.org/"; node qa/check-pages.mjs
```

```bash
BASE_URL=https://www.dattapeetham.org/ node qa/check-pages.mjs
```

It visits the 75 addresses in the sitemap (15 pages × 5 languages) and ends
with `All 75 pages clean.`, or lists each problem. Add page names to check
only those, for example `node qa/check-pages.mjs visit.html`.

## Deploying an update later

1. Make the change and rebuild in `source\` (see
   [MAINTENANCE.md](MAINTENANCE.md)).
2. Upload the contents of `source\site\` the same way as the first time.
   Replace the old files, and delete files that are no longer in the site:
   `rsync -a --delete` or `robocopy /MIR` do both.
3. **Install the rebuilt server file too, where the server keeps it outside
   the site folder.** Every build rewrites the redirects, the platform
   hand-off, the security headers and the cache rules in every server's
   file. Apache, cPanel, IIS and Netlify (drag and drop) read theirs from
   the uploaded folder, so step 2 is enough there. Elsewhere:
   - **nginx:** uploading `site\` alone leaves nginx on the old rules. Also
     copy the rebuilt `deploy\nginx\dattapeetham.conf` to
     `/etc/nginx/conf.d/dattapeetham.conf` (as in steps 1 and 2 of the nginx
     section), delete the `[ipv6]` lines again if the server has no IPv6,
     then run `sudo nginx -t` and `sudo systemctl reload nginx`.
   - **Vercel:** commit the rebuilt `vercel.json` with the change.
   - **Cloudflare:** deploy again from `source\` with
     `npx wrangler deploy --config deploy/cloudflare/wrangler.jsonc`.
4. Run the server check again.

A changed CSS or JavaScript file gets a new address on every build (its
content hash), so visitors never keep an old copy.
