# Moving www.dattapeetham.org to the new website

Version 1.0.0. This is the order of operations for the day the new website
takes over **www.dattapeetham.org**, without breaking bookings, donations or
sign-in. Read it all before you start.

## Why the existing platform has to move first

Today `www.dattapeetham.org` is the Peetham's existing platform. It handles:

- puja and seva bookings
- donations
- sign-in and subscriptions
- the store
- the Raga Sagara concert bookings
- the privacy policy, terms and disclaimer
- the old `/page/view/…` pages and other pages the new site cites as sources

The new website does not rebuild any of that. Its "Book a Puja", "Donate",
"Sign in" and "Store" buttons, and its source links, point at the platform.
They are all built from one setting in `site.config.json`:

```json
{
  "siteUrl": "https://www.dattapeetham.org",
  "legacyPlatformUrl": "https://www.dattapeetham.org"
}
```

At hand-over both addresses are the same, because the platform still lives
on `www`. **When the new site takes `www`, the platform must answer at its
own address**, for example `https://seva.dattapeetham.org` (the Peetham
chooses the name; `seva` is only an example). `legacyPlatformUrl` must then
hold that address.

If the site went live with both addresses still the same:

- `/poojas`, `/donations`, `/store`, `/login` and the platform's other paths
  would show the new site's "page not found";
- source links such as "the full timeline on dattapeetham.org" would lead
  back into the page that cites them;
- payment gateways and the mobile apps that call `www` would reach the wrong
  server.

That is why `node build.mjs` prints a warning while the two addresses match,
and `node build.mjs --production` refuses to build at all.

## The order, at a glance

| When | Step | Who |
| --- | --- | --- |
| 2–3 weeks before (earlier if the apps call `www`; step 2) | 1. Decide the platform's new address and the switch date; record the current DNS | The Peetham |
| 2–3 weeks before | 2. Back up the platform; it answers at its new address too, and is tested there | The platform's team or vendor, with your IT person for DNS |
| 1 week before | 3. Rebuild the new site for production with that address | Your IT person or the agency |
| 1 week before | 4. Deploy the new site to its server and test it there, before DNS | Your IT person |
| 2+ days before | Lower the DNS TTL (step 1) | Your IT person |
| Before the switch | 5. HTTPS certificate for both names | Your IT person |
| Switch day | 6. Point DNS at the new server | Your IT person |
| Switch day | 7. Check the live site, including a real booking and donation | Your IT person, with the platform team |
| Switch day and after | 8. Search Console | Your IT person |
| If needed | 9. Roll back | Your IT person |

Steps 1–5 change nothing visitors see. Step 6 is the switch, and step 9
undoes it.

## 1. Prepare

1. **Choose the platform's new address**, for example
   `https://seva.dattapeetham.org`. It must be a different host name from
   `www.dattapeetham.org` and from `dattapeetham.org` (the production build
   refuses both).
2. **Choose the switch day and time**: a quiet time, not during a festival,
   with the platform team reachable.
3. **Record the current DNS records** for `www.dattapeetham.org` and
   `dattapeetham.org` (type, value, TTL). Take a screenshot or export them
   from your DNS provider. You need these to roll back.
4. **Lower the TTL** of those two records to 300 seconds (5 minutes). Do this
   at least as long before the switch as the old TTL. If the old TTL is one
   day, lower it two days before. Then the switch, and a rollback, reach
   visitors within minutes.
5. Do not touch the other records in the zone (MX, TXT and so on). E-mail and
   other services do not move.

## 2. Move the platform to its own address

**The platform's own team or vendor does this part.** The agency does not
operate the platform and cannot see its settings, so treat the list below as
questions to put to them, not as facts about the platform.

1. **Back up the platform first.** Before any setting changes, the vendor
   takes a full backup of the platform (database, uploaded files and
   configuration) and confirms that it can be restored. The new website
   holds none of this data, so this backup is the only one.
2. **Create the DNS record for the new name now**, not on switch day: your
   IT person adds it at the DNS provider (for example `seva`), with the value
   the vendor gives. The vendor needs it to set up the certificate and to
   test, and the production build in step 3 links every booking button to
   it.
3. Make the platform answer at its new address (for example
   `https://seva.dattapeetham.org`) with a valid HTTPS certificate, **while it
   still answers at `www.dattapeetham.org`**. Keeping both until the switch is
   stable is what makes a rollback possible.
   - HTTPS is required, not optional: payments and sign-in need it.
   - The new site sends `Strict-Transport-Security` (HSTS: "use only HTTPS
     here for two years"). It is sent **without** `includeSubDomains`, so it
     covers only `www.dattapeetham.org` and, on Apache and IIS (which also
     send it from the bare domain's redirect), `dattapeetham.org`. It does
     not reach the platform's new address or any other name under
     `dattapeetham.org`, such as a mail or webmail address.
   - **For the Peetham to decide, later if at all:** HSTS on every name
     under `dattapeetham.org`. A browser that has received
     `includeSubDomains` from the bare domain refuses plain `http://` on all
     of them for two years, and keeps it even if the header later changes,
     until it visits again over `https://`. So first ask your
     DNS provider for the list of names in the zone and check that each one
     people open in a browser works over `https://`. Only then add
     `; includeSubDomains` to `Strict-Transport-Security` in
     `deploy/routes.mjs`, rebuild (step 3) and redeploy.
4. Ask the vendor to check, and update where needed, every setting that
   holds the platform's address. For example:
   - the platform's own base address, and any list of allowed host names;
   - payment gateway settings: return URLs, callback or webhook URLs, and any
     list of approved domains at the gateway;
   - sign-in providers (for example Google or Facebook sign-in): their
     redirect or callback URLs;
   - the cookie domain and session settings (visitors may need to sign in
     again after the move);
   - the mobile apps' API address, if the apps call the platform;
   - e-mail and SMS templates, receipts and confirmation links;
   - the platform's own links, canonical links and sitemap.

   The new site forwards old platform paths with a 302 redirect, so a
   visitor's bookmark still works. But a redirect cannot carry a payment
   gateway's or an app's POST request reliably: those must call the
   platform's new address directly.

   **The mobile apps need the earliest answer.** If the Peetham's apps call
   the platform at `www.dattapeetham.org`, every copy already installed on a
   phone keeps calling `www` after the switch, and the new site cannot pass
   those calls on. The vendor must then publish app updates that use the
   new address, and they must reach users (store review, then people
   updating) **before** the switch date. Ask this first: it can set the date.
5. **Ask the vendor for the list of the platform's public paths.** The new
   site forwards these paths to the platform (from `deploy/routes.mjs`,
   `legacyPlatform`):

   `/poojas`, `/donations`, `/store`, `/subscriptions`, `/subscribe`,
   `/login`, `/calendar`, `/speeches`, `/sri-swamiji-says`, `/photos`,
   `/videos`, `/downloads`, `/articles`, `/dailyposts`, `/mobileapps`,
   `/ashramcenters`, `/myragasagaraconcerts`, `/techsupport`, `/facebook`,
   `/youtube`, `/websites`, `/hanuman-chalisa-form`, `/releases`,
   `/liveupdates`, and everything below `/page/view/` and `/ashrams/` that
   has no new page.

   Each also covers everything below it (`/poojas/…`). Any other platform
   path (for example a cart, checkout, account or API path) would show the
   new site's "page not found" on `www`. Add the missing ones to
   `legacyPlatform.paths` in `deploy/routes.mjs`, one line each, then
   rebuild (step 3).
6. Test the platform at its new address: `/poojas`, `/donations`, `/store`,
   `/login`, `/subscriptions`, `/myragasagaraconcerts`, `/calendar`,
   `/page/view/privacy-policy`, `/page/view/terms-and-conditions`,
   `/page/view/disclaimer`, and a complete booking and donation (in the
   gateway's test mode, if it has one).

## 3. Rebuild the new site for production

You need Node.js 20 or newer (see [HANDOVER.md](HANDOVER.md)). Work in the
project folder: `source\` in the package.

1. In `site.config.json`, set `legacyPlatformUrl` to the platform's new
   address. Leave `siteUrl` as it is.

   ```json
   "legacyPlatformUrl": "https://seva.dattapeetham.org"
   ```

   Edit the file rather than passing the address on the command line. The
   generated nginx file, `vercel.json` and every server file are rewritten
   from it on each build, and the server check (step 7) reads it too, so
   everything stays in step.
2. Build. In PowerShell (Windows) or a terminal (Linux, macOS), the same
   command:

   ```powershell
   cd source
   node build.mjs --production
   ```

   (`npm run build:production` does the same.) If the platform address is
   still the site's own host, or differs from it only by `www.`, the build
   prints the same-host `WARNING` (between two rows of `!`), then stops with
   an error that starts with `✗ --production`, and writes nothing.
   A good build prints:

   ```
   Site address:     https://www.dattapeetham.org  (site.config.json)
   Legacy platform:  https://seva.dattapeetham.org  (site.config.json)
   Server configs v1.0.0: .htaccess, _headers, _redirects, web.config in the site; 26 platform rules → https://seva.dattapeetham.org; CSS/JS immutable
   ...
   Built 16 pages × 5 languages, ... → ...\site
   Translation coverage: kn 100% (0 missing, 0 rejected) · hi 100% ... · te 100% (0 missing, 0 rejected)
   ```

   and no link problems. The site is now in `source\site\`.
3. Run the tests:

   ```powershell
   npm test
   ```

   The summary at the end must show `# fail 0`. (If PowerShell says that
   running scripts is disabled, type `npm.cmd test` instead.)
4. Keep a copy of this `source\` folder, with its `site.config.json`. It is
   the record of what went live.

Every booking, donation, sign-in and store link in the pages now points at
the platform's new address. Every server file also forwards the platform's
old paths: a bookmark to `https://www.dattapeetham.org/poojas?ashram_id=4`
reaches `https://seva.dattapeetham.org/poojas?ashram_id=4`.

## 4. Deploy, and test before the switch

1. Upload the contents of `source\site\` to the new server, with the file
   for your server (on nginx, the `deploy\nginx\dattapeetham.conf` this
   build wrote; on Vercel, its `vercel.json`). [DEPLOY.md](DEPLOY.md) has the
   steps for each host.
2. Test it before DNS points there, as described in
   [DEPLOY.md](DEPLOY.md), *Check the server after deploying* (preview
   address, IP address, or the hosts-file method). The server check must
   end with `0 failed`.
3. With the hosts-file method, also click through a few pages, the language
   switcher and the "Book a Puja" button in a browser. Remove the hosts-file
   lines afterwards.

   Use the hosts-file method, over `https://`, for these browser checks. A
   page opened at `http://<IP address>/` shows without its styles and
   scripts: the security policy (`upgrade-insecure-requests`) makes the
   browser fetch every stylesheet, script and image over
   `https://<IP address>/`, which fails. That is expected, and does not
   happen at the real address. The server check (`verify-server.mjs`) is not
   affected.

## 5. HTTPS certificate

One certificate must cover both `www.dattapeetham.org` and
`dattapeetham.org`. The server files send the bare domain and plain `http://`
to `https://www.dattapeetham.org`.

- **Netlify, Vercel, Cloudflare:** the host issues the certificate itself
  once DNS points at it (step 6). Expect a few minutes before it is ready.
- **Your own server:** get the certificate before the switch if you can,
  using the DNS method in [DEPLOY.md](DEPLOY.md) (nginx section), or use a
  certificate the Peetham already holds for both names. Otherwise get it
  right after the switch over http; visitors may see certificate warnings
  for those few minutes.
- If the zone has `CAA` records (they name the certificate authorities
  allowed to issue for the domain), they must allow the one your host or
  certbot uses (Let's Encrypt is `letsencrypt.org`), or the certificate is
  refused. Check with your DNS provider.

## 6. Switch DNS

1. Confirm: the platform answers at its new address (step 2), the apps no
   longer depend on `www` (step 2), the new site passes the server check
   (step 4), the platform team is reachable.
2. At your DNS provider, change:
   - `www.dattapeetham.org` to the new server (an `A` record, and `AAAA` if
     the server has IPv6, or a `CNAME` if your host asks for one);
   - `dattapeetham.org` to the new server as well (`A`/`AAAA`; many DNS
     providers cannot put a `CNAME` on the bare domain, some offer `ALIAS`
     or "flattening" instead). Hosted platforms show the exact records to
     use.
   - Leave the platform's new name (`seva.dattapeetham.org` in the
     example) as it is: it was created in step 2 and already points at the
     platform. Leave the e-mail (`MX`) and other records alone too.
3. Wait for the TTL to pass (5 minutes, if you lowered it), then check from
   a phone on mobile data as well as from the office network.

## 7. Check the live site

### Automatic checks

1. **The server**, about 800 requests: every redirect, every page in every
   language, the headers, the 404 page, the platform forwarding. In
   `source\`:

   ```powershell
   node deploy/test/verify-server.mjs --base=https://www.dattapeetham.org/ --no-canonical
   ```

   It must end with `0 failed`. Then check the canonical redirects:

   ```powershell
   curl.exe -sI http://dattapeetham.org/about.html
   curl.exe -sI https://dattapeetham.org/about.html
   curl.exe -sI http://www.dattapeetham.org/about.html
   ```

   Each must answer `301` with `Location: https://www.dattapeetham.org/about.html`.
   (Linux and macOS: `curl` instead of `curl.exe`. On Netlify and Cloudflare,
   add the option given in [DEPLOY.md](DEPLOY.md).)
2. **Every off-site link and file**: the platform, the S3 photos, PDFs and
   audio, YouTube, the app stores and social pages. From an ordinary office
   or home connection:

   ```powershell
   node tools/check-external-links.mjs site
   ```

   It exits with code 1 if any address fails. Addresses marked "check by
   hand" are social sites that block automated requests: open those in a
   browser. The agency's build environment could not reach most of these
   hosts, so this check has to be run from a normal connection at least once.
   Also open `/subscriptions`, `/subscribe` and `/hanuman-chalisa-form` on the
   platform by hand: they may need a sign-in.

### By hand, in a browser

On a phone and on a computer:

- [ ] **Bookings and payments work.** "Book a Puja" opens the platform at
  its new address. With the platform team, complete one real booking and
  one real donation (or the gateway's test mode), through to the receipt.
- [ ] **Other platform links work**: "Donate", "Sign in", "Store",
  "Subscribe for updates", a concert booking, and the footer's Disclaimer,
  Privacy and Terms.
- [ ] **Old addresses still work.** `https://www.dattapeetham.org/poojas`
  forwards to the platform. `/page/view/sri-bala-swamiji` opens the Sri
  Swamiji page at Sri Bala Swamiji. `/about` opens `/about.html`.
- [ ] **Videos play** (home, Sri Swamiji, Guru Parampara, Music,
  Attractions, Media). A video loads from `www.youtube-nocookie.com` when
  you press play.
- [ ] **The map shows** on the Visit and Contact pages (Google Maps).
- [ ] **The chant plays** on the Media page ("Listen in stillness").
- [ ] **Languages and search work**: the language switcher (ಕನ್ನಡ, हिन्दी,
  தமிழ், తెలుగు) and site search (Ctrl+K).
- [ ] **The browser console is clean.** In the browser's developer tools,
  the console shows no "Content Security Policy" errors.
- [ ] **Share previews** show a picture: paste a page address into WhatsApp,
  or into Facebook's Sharing Debugger.

## 8. Search engines

- **No "change of address" is needed.** The domain stays the same
  (`www.dattapeetham.org`); only what answers there changes. The old pages'
  addresses redirect (301) to the matching new pages.
- In **Google Search Console**, use (or add) the property for
  `dattapeetham.org`, owned by a Google account the Peetham controls (if the
  platform vendor set up the existing one, ask to be added as an owner). A
  *Domain* property, verified by a DNS TXT record, survives every redeploy;
  a verification file uploaded to the site would be removed by the next
  upload.
- Submit the sitemap: `https://www.dattapeetham.org/sitemap.xml`. It lists
  all 75 pages (15 pages in 5 languages), each with its language versions.
- Use *URL inspection* on the home page and request indexing.
- Test `events.html` with Google's Rich Results Test: its upcoming events
  carry Event data. (Only events still ahead on the day of the build do;
  the listed programme ends on 23 December 2026.)
- For the first weeks, watch the *Pages* report for "Not found (404)"
  addresses. An old address that should lead somewhere can be added to
  `oldSiteRedirects` in `deploy/routes.mjs` (then rebuild and redeploy).
- The platform's pages now live at its new address. Their search listings
  are the platform vendor's responsibility (canonical links and sitemap on
  the platform).
- Bing Webmaster Tools can import the property from Google Search Console.
- **Visitor statistics.** The new site has no analytics or tracking code,
  and its Content Security Policy blocks any. Search Console shows how
  people find the site in Google without any code on it. If the Peetham
  wants more, that is a decision to make before launch: it needs a code
  change, a Content Security Policy change, and an updated privacy notice
  ([PRIVACY-DATA-INVENTORY.md](PRIVACY-DATA-INVENTORY.md)).

## 9. Rollback plan

**Decide in advance** who can call a rollback, and when. For example:
bookings or donations fail and cannot be fixed within an hour.

**To roll back:** set the DNS records for `www.dattapeetham.org` and
`dattapeetham.org` back to the values recorded in step 1. With a 5-minute
TTL, most visitors reach the old platform again within minutes; some
networks take longer.

This works only while the platform's server is still set up to answer for
`www.dattapeetham.org`. So **keep that working for at least the first
week** after the switch, and keep the new site deployed, ready for a second
attempt:

- **The platform's certificate for `www`.** After the switch, `www` points
  at the new server, so the platform can no longer renew a `www`
  certificate by the usual http check. Ask the vendor when it expires; if
  it would expire inside the rollback window, renew it before the switch
  (or by DNS validation).
- **Do not undo the vendor's changes from step 2.** The platform answers at
  both addresses, so payment callbacks and apps that already use the new
  address keep working after a rollback too.
- A rollback needs no rebuild and no upload: only the DNS change.

What a rollback cannot undo:

- **Remembered redirects.** Browsers keep 301 redirects. A visitor who
  opened `/about` or an old `/page/view/…` address on the new site may be
  sent to the new site's address (`/about.html` and so on) on the old
  platform, where it does not exist, until their browser forgets it. The
  302s for platform paths are not remembered.
- **HSTS.** Browsers that visited the new site insist on HTTPS for
  `www.dattapeetham.org` (and, from Apache or IIS, `dattapeetham.org`) for
  two years. The old platform must keep a valid HTTPS certificate (it must
  anyway).

## 10. After the switch

- **First week:** watch Search Console, the platform's bookings and
  donations, and messages from devotees. Run the server check again after
  any change.
- After a week without problems, raise the DNS TTL back to its old value,
  and the platform team can stop serving `www` (if they wish). The new site
  forwards its known paths to the new address.
- Keep the content current: events, hours, photos. See
  [MAINTENANCE.md](MAINTENANCE.md).

## Questions only the Peetham can answer

- What is the platform's new address (`seva.dattapeetham.org` is only an
  example)? Who moves it, and when?
- Which payment gateways, sign-in providers, apps and e-mail templates hold
  the old address? (The platform vendor will know.)
- Does the platform have public paths beyond the list in step 2?
- Do the Peetham's mobile apps call `www.dattapeetham.org`? If so, when can
  updated apps reach users (step 2)?
- Should HSTS cover every name under `dattapeetham.org`
  (`includeSubDomains`)? It is off at hand-over. Turn it on only once every
  name people open in a browser works over `https://` (step 2).
- Has the vendor taken a full backup of the platform, and tested restoring
  it?
- Who can call a rollback, and who runs the checks in step 7?
