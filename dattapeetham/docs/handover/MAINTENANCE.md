# Keeping the site up to date

Version 1.0.0. How to change the things that change most often, rebuild and
redeploy. You edit plain text files with any editor (Notepad works; a code
editor such as Visual Studio Code is easier). No programming is needed for
the common changes below, but keep the punctuation of the files exactly as
it is: quotes, commas and brackets.

All paths and commands are inside the project folder: `source\` in the
package. Open PowerShell there (in File Explorer, open the folder, then type
`powershell` in the address bar and press Enter). Commands are the same in
a Linux or macOS terminal unless shown otherwise.

## Once per computer

1. Install **Node.js 20 or newer** from <https://nodejs.org> (the LTS
   version). Check with `node --version`.
2. For the browser checks only (optional):

   ```powershell
   npm install
   npx playwright install chromium
   ```

   `npm install` fetches the three development tools listed in
   `package.json` (Playwright, axe-core, sharp). The build itself needs none
   of them.

If PowerShell answers *"running scripts is disabled on this system"* when you
type `npm`, type `npm.cmd` instead (for example `npm.cmd test`), or allow
local scripts once with
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. `node` commands are
not affected.

## The routine for every change

1. **Start the preview server** in its own window:

   ```powershell
   npm run dev
   ```

   (`node build.mjs --serve` does the same.) It builds the site, serves it at
   <http://localhost:4321> and rebuilds whenever a file in `src\` or
   `site.config.json` changes. Leave it running; stop it with Ctrl+C.
2. **Edit** the file (sections below). Save. Reload the page in the browser.
3. **Read what the build printed** in the preview window:
   - `Built 16 pages × 5 languages` and no line starting with `✗`;
   - `Translation coverage: kn 100% (0 missing, 0 rejected) · …` for every
     language. If you changed English text, some segments now show as
     *missing*; see [Translations](#translations).
   - No `link/id problem(s)`. If there are, the build lists each broken
     link.
4. **Build for the live site and test**, in a second window:

   ```powershell
   node build.mjs --production
   npm test
   ```

   `npm test` must end with `# fail 0`.
5. **Upload** the contents of `site\` to the server, and on nginx install
   the rebuilt `deploy\nginx\dattapeetham.conf` as well (see
   [DEPLOY.md](DEPLOY.md), *Deploying an update later*), then run the server
   check:

   ```powershell
   node deploy/test/verify-server.mjs --base=https://www.dattapeetham.org/ --no-canonical
   ```

`npm run verify` runs the build, the tests and the browser check of every
page in one go. It needs the preview server from step 1 running, and the
one-time `npm install` above.

## Temple hours

The general temple timings appear as text in several places, and as data
that drives the live "open now / closed" badges. Change all of them
together.

1. **The live badges and search-engine data**: `src/site.mjs`, `hours`.

   ```js
   temple: { label: 'Temple', sessions: [['06:00', '12:00'], ['16:00', '20:00']], closed: [] },
   ```

   Times are 24-hour, Mysuru time. `closed` lists weekdays when it is shut,
   by number (0 = Sunday, 3 = Wednesday). `shukaVana` works the same way.
   The opening hours in the search-engine data for the whole Peetham are
   made from `hours.temple` automatically.
2. **The timings shown as text.** The general timings
   (`6:00 AM – 12:00 PM`, `4:00 PM – 8:00 PM`) are written in:
   - `src/data.mjs`, `timings` (the home page's timings);
   - `src/pages/darshan.mjs`: the timings card, and `dayEvents`, the day
     line from 5 AM to 9 PM. Each of its entries starts with the time in
     minutes after midnight (`[960, '4:00 PM', 'Evening darshan', …]`, 960 =
     16:00), so change both. The legend under that line is made from
     `hours.temple` by itself;
   - `src/features/ashram-map.mjs`, `TEMPLE_HOURS` (the map's pop-up).

   The other shrines' own hours (Sri Datta Venkateshwara, Karya Siddhi
   Hanuman) are in `src/pages/darshan.mjs` and `src/pages/visit.mjs`;
   `src/pages/darshan.mjs` also holds their search-engine opening hours, in
   24-hour form, near the end of the file. Shuka Vana's homepage hours are in
   `src/data.mjs` and `src/features/ashram-map.mjs`; the hours from Shuka
   Vana's own page are in `src/pages/attractions.mjs`.

   To find every place a time is written, search the source. PowerShell:

   ```powershell
   Get-ChildItem src -Recurse -Include *.mjs,*.js | Select-String -SimpleMatch "4:00 PM"
   ```

   Linux, macOS:

   ```bash
   grep -rn "4:00 PM" src --include=*.mjs --include=*.js
   ```
3. **Translations.** Each changed sentence needs its translation updated in
   the four languages (next section). Until then those sentences show in
   English on the language pages. Nothing breaks.

## Events and festival dates

Only dates the official calendar states go on the site. Festivals without a
published date are described by their lunar month.

| What | Where |
| --- | --- |
| The year calendar on the Events page (month by month) | `src/pages/events.mjs`, `CAL`: one line per event, `[start, end, title, place, kinds]` |
| The large "coming up" cards on the Events page, with schedule, photo and link | `src/pages/events.mjs`, `COMING` |
| The "Coming up" list on the home page | `src/pages/index.mjs`, `events` |

- Dates are written `'2026-12-21'` (year, month, day). A one-day event has
  the same start and end.
- `kinds` are any of `festivals`, `music`, `discourses`, `seva-camps`,
  `vratas`, `tours`. On the home page, `cat` is one of `festival`, `music`,
  `seva` (the filter buttons).
- Each "coming up" card gets an anchor from its start date
  (`events.html#ev-2026-12-21`); the search-engine data for each event links
  to it.
- The pages mark events as "now" or "past" by themselves, using Mysuru time.
  But the search-engine event data lists only the events still ahead **on
  the day of the build**. Rebuild and redeploy after editing the calendar,
  and at least once after each event has passed.
- **The 2026 programme ends on 23 December 2026.** After that, the pages say
  the listed events have passed and point to the official calendar. Moving
  to a new year is a larger edit than adding one event: the whole `CAL`
  list, `COMING`, the home page's `events`, the festival entries in
  `src/pages/events.mjs` (each carries that year's dates and a sentence
  about them), and several sentences that name the year. Search for `2026`
  in `src/pages/events.mjs` and `src/pages/index.mjs`. Plan it with the
  agency or a developer.

## Photos

All photos on the site are the Peetham's own, from its S3 bucket
(`https://dattapeetham.s3.amazonaws.com/…`). Never use stock or
AI-generated images.

**The simple way: a photo already on the Peetham's S3 bucket.** Put its
address in the page (or in `photos` in `src/data.mjs`) with an honest
description in `alt`. It shows at once, loaded from S3 at its own size. The
Content Security Policy allows that bucket.

**Self-hosted, sized copies (recommended for large photos).** The site
serves most photos from its own sized WebP copies in
`src/assets/img/opt/`, listed in `src/assets/img/opt/manifest.json`. The
build points every `<img>` at the copies when the manifest has the photo.
To make copies for a new photo, run:

```powershell
npm run images
```

This needs `npm install` and the photo enhancer set up once per machine
(Python and its models: `tools/upscale/README.md`). The whole process is in
`docs/PHOTOS.md`. If the enhancer is not set up, the command stops with an
error before changing any photo, and the new photo keeps loading from S3.

Rules:

- A photo on the Peetham's **dev** bucket (`dev-dattapeetham.s3…`) is
  blocked by the Content Security Policy. The build stops with an error if a
  page uses one that has no self-hosted copy.
- **Share previews.** Each page's `image` (in its file in `src/pages/`) is
  its picture when shared on WhatsApp or social media. After changing a
  page's `image`, run `node tools/make-og.mjs` (needs `npm install`). It
  writes a small copy, at most 1200 × 630, to `src/assets/img/og/`. Without
  it, the page's preview uses the S3 original, which some apps drop when it
  is large.
- A page that starts loading anything from a **new host** (another image
  host, a new video service) needs that host added to the Content Security
  Policy in `deploy/routes.mjs`. `npm test` names the exact host that is
  missing.

## Text on a page

| What | Where |
| --- | --- |
| A page's own text | `src/pages/<page>.mjs` (for example `src/pages/visit.mjs`) |
| The page title and the search-engine description | the `title` and `description` lines at the top of the page's file |
| Address, phone, e-mail, the platform links (booking, donation, store) | `src/site.mjs` (`site`, `links`) |
| Menu entries | `src/site.mjs`, `nav` |
| Shared lists: timings, timeline, apps, centres, albums | `src/data.mjs` |
| The footer and the page frame | `src/layout.mjs` |

The text sits inside HTML, between backticks (`` ` ``). Change the words and
leave the tags (`<p>`, `<a href="…">`) as they are. Keep to the content
rules in `docs/PAGE-GUIDE.md`: every fact must come from the Peetham's own
pages, and honorifics follow the Peetham's usage.

Transactions stay on the existing platform: never add a form that looks as if
it takes payments or sign-ins.

## Translations

English is the source. Each language has dictionaries in
`src/i18n/<lang>/part-*.json` (`kn`, `hi`, `ta`, `te`). Each entry is the
exact English text, then its translation:

```json
"4:00 PM – 8:00 PM": "ಸಂಜೆ 4:00 – ರಾತ್ರಿ 8:00",
```

The English text is the key, so **changing English text means its old
translation no longer matches**. The changed sentence then shows in English
on the language pages until a translation is added. To find and fix them:

1. Build (or let the preview server rebuild). The build shows, per
   language, how many segments are *missing*.
2. The exact list is in `.cache\i18n\report-kn.json` (and `-hi`, `-ta`,
   `-te`), under `missing`.
3. For each, add an entry with the new English text and its translation to
   a file in `src/i18n/<lang>/`. The easiest way: search for the old English
   text in that folder, copy the entry, and change both sides. Keep the old
   entry while any page still uses the old text.
4. Keep every placeholder (`<1>…</1>`, `<2/>`, `%1`) and every number
   exactly as in the English. You may move placeholders to suit the word
   order. A translation that loses a number or placeholder is *rejected*,
   and the English shows instead.
5. Refresh the list of English segments, then check each language:

   ```powershell
   node build.mjs --extract
   node tools/i18n-check.mjs kn
   node tools/i18n-check.mjs hi
   node tools/i18n-check.mjs ta
   node tools/i18n-check.mjs te
   ```

   Each must report `0 problem(s)`. An *unknown key* is an entry whose
   English is no longer on any page: delete it, or correct the key.
6. Build again: every language must show `100% (0 missing, 0 rejected)`.

Names, deities, places and practices follow each language's glossary in
`src/i18n/glossary/`. The notes for each language's reviewer, with the
spelling decisions, are in `docs/i18n/<lang>-review.md`.

Text that scripts write while the page runs (the live status, counts,
times) goes through whole sentences with numbered slots, such as
`fmt('Showing %1 of %2 centres', a, b)`. Never join English fragments in
JavaScript: they cannot be translated.

## Adding a page

1. Read `docs/PAGE-GUIDE.md` (the page contract and the content rules).
2. Create `src/pages/<slug>.mjs` exporting `slug`, `file`, `title`,
   `description` and `render()`, like the existing pages. The build finds it
   by itself and adds it to all five languages, the sitemap, the search
   index and the server rules (`/new-page` redirects to `/new-page.html`).
3. Optional page styles and script: `src/assets/css/pages/<slug>.css` (with
   `css: true`) and `src/assets/js/<slug>.js` (with `scripts: ['<slug>']`).
4. Add it to the menu: `nav` in `src/site.mjs`.
5. Add its file name to the list in the test *every page was built*, in
   `tests/site.test.mjs`.
6. Translate its text (see above), then build, test and look at it in every
   language, on a phone and on a computer.

## Changing the platform's address later

Edit `legacyPlatformUrl` in `site.config.json`, then rebuild with
`node build.mjs --production` and run `npm test`. Every platform link in the
pages, and every server file, now carries the new address. Upload `site\`.
On nginx, also install the rebuilt `deploy\nginx\dattapeetham.conf`, then
`sudo nginx -t` and reload (the redirects to the platform live in that file,
not in `site\`); on Vercel, commit the rebuilt `vercel.json`; on
Cloudflare, deploy again with Wrangler ([DEPLOY.md](DEPLOY.md), *Deploying
an update later*). Then run the server check. The platform redirects are
302 (temporary), so browsers do not remember the old address.

## Making a new hand-over package

```powershell
node tools/package.mjs --production
```

(`npm run package` does the same without options.) It builds the site, then
writes `release\dattapeetham-website-v<version>\` with the same layout as the
package you received, its zip, a zip of the website files alone, and
`release\SHA256SUMS.txt`. Stop `npm run dev` first: the packager stops if
`site\` keeps changing while it copies. With `--production` it builds only
once `legacyPlatformUrl` names the platform's own address. The version comes from
`package.json` (and must match `VERSION` in `deploy/routes.mjs`).

## Where the tests and checks are

| What | Command | Needs |
| --- | --- | --- |
| The built pages: languages, metadata, share previews, headings, image text and sizes, structured data, links, contact details, sitemap, search index, icons | `npm test` (runs `tests/site.test.mjs`) | a build |
| The server files: redirects, headers, cache rules, the Content Security Policy against what the pages load | `npm test` (runs `tests/server-configs.test.mjs`) | a build |
| The preview server, the packaging tool, and these hand-over documents (every path, command and link they name; the privacy inventory against the code) | `npm test` (runs `tests/preview.test.mjs`, `tests/package.test.mjs`, `tests/handover-docs.test.mjs`) | a build |
| Every page in Chromium, desktop and phone, reduced motion, accessibility (axe), console errors, sideways scrolling | `node qa/check-pages.mjs` (or one page: `node qa/check-pages.mjs visit.html`) | `npm install`, the preview server, or `BASE_URL` |
| Screenshots of one page | `node qa/shot.mjs index.html out --scroll` | `npm install`, the preview server |
| Translations | `node tools/i18n-check.mjs kn` (`hi`, `ta`, `te`) | nothing |
| Every off-site link and file | `node tools/check-external-links.mjs site` | an ordinary internet connection |
| A running server, about 800 requests | `node deploy/test/verify-server.mjs --base=…` | the server's address |
| Real nginx and Apache, in Docker | `npm run verify:servers` | Docker with `nginx:1.27-alpine` and `httpd:2.4-alpine` |
| The photo pipeline | `node --test tests/photos.test.mjs` | the enhancer set-up (`docs/PHOTOS.md`) |

The test files are in `tests/`, the browser checks in `qa/`, the server
tests in `deploy/test/`, and the tools in `tools/`.

To point the browser check at another address, set `BASE_URL` first.
PowerShell: `$env:BASE_URL = "https://www.dattapeetham.org/"`. Linux,
macOS: `BASE_URL=https://www.dattapeetham.org/ node qa/check-pages.mjs`.
