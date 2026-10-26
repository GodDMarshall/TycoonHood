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

**Self-hosted 4K copies (the rule for every photo on the site).** The site
serves its photos from its own sized WebP copies in `src/assets/img/opt/`
(from 480 pixels wide up to the full master: one master per photo, 3840
pixels on its long edge),
listed in `src/assets/img/opt/manifest.json`. The build points every
`<img>` at the copies when the manifest has the photo. To make the master
and the copies for a new photo, run:

```powershell
npm run images
```

That builds the site, runs the photo tool (`tools/enhance-photos.mjs`) and
builds again; `npm run photos` runs the photo tool alone, after a build.
The tool downloads every photo the built pages use that has no copies yet,
enlarges it to its 3840-pixel master with the AI enhancer (Real-ESRGAN,
keeping small faces and marked regions as they are) and writes the copies
and the share images. It needs `npm install` and the photo enhancer set up
once per machine (Python and its models: `tools/upscale/README.md`). The
whole process, and how to look at the result, is in `docs/PHOTOS.md`. If
the enhancer is not set up, the command stops with an error before changing
any photo, and the new photo keeps loading from S3 (and `npm test` fails
until it has its copies).

**Camera originals.** An enlarged web copy is not a 4K photograph. When the
Peetham has the camera's original file of a photo, put it in
`photos/originals/`, named after the S3 file it replaces (for example
`sadguru-deva.jpg`; `photos/originals/README.md` explains how to map other
names), and run `npm run images` again: the master is then made from the
original instead (only resized, if it is 3840 pixels or more). The photos to
ask for first are listed in `docs/PHOTOS.md`, under *Ask the Peetham for
camera originals of these*.

Then tell the browsers how wide the new photo is shown, and build again:

```powershell
node tools/measure-sizes.mjs --pages=seva.html
node build.mjs
```

(name the page or pages the photo is on; without `--pages` it measures all
of them in all five languages, 10 to 15 minutes). Safari, iPhone and iPad
pick a photo's copy from this measurement; without it they load the largest
copy for any box. `npm test` fails until it is done. Run it for the whole
site after changing a page's layout too.

Rules:

- A photo on the Peetham's **dev** bucket (`dev-dattapeetham.s3…`) is
  blocked by the Content Security Policy. The build stops with an error if a
  page uses one that has no self-hosted copy.
- **Share previews.** Each page's `image` (in its file in `src/pages/`) is
  its picture when shared on WhatsApp or social media. After changing a
  page's `image` to a photo the site already has, run
  `node tools/make-og.mjs` (needs `npm install`). It cuts the photo's 4K copy
  to 1200 × 630 in `src/assets/img/og/<page>.jpg`, which the page shares with
  its size and the photo's alt text (a page whose hero has no alt text on the
  page can give one as `imageAlt`). Without it, the page's preview uses the
  S3 original, which some apps drop when it is large.
- A page that starts loading anything from a **new host** (another image
  host, a new video service) needs that host added to the Content Security
  Policy in `deploy/routes.mjs`. `npm test` names the exact host that is
  missing.

## Music and temple sounds

The site has its own flute music (an original piece for bansuri, the
Hindustani bamboo flute, in Raga Pahadi, made for this website) and soft
temple sounds (a bell and six chimes) while scrolling. Nothing plays until
the visitor chooses it: the first visit asks, the answer is remembered, and
the round sound button at the bottom left of every page switches both on or
off. The files are in `src/assets/audio/`; the plan and the measurements are
in `docs/DEVOTION-PLAN.md` (section 9).

- **The credit** shown in the sound panel, "Flute: original raga composition
  for this website", is `CREDIT` in `src/features/devotion-sound.mjs` (and
  "Raga Pahadi" beneath it is `RAGA`). Changing either changes a translated
  sentence (see [Translations](#translations)).
- **The conch (shankha)** at the end of a page has not been auditioned, so it
  is switched off: the pages do not list it and the build does not ship its
  file. To switch it on after the Peetham has listened to it (it is
  `src/assets/audio/sfx/shankha.mp3`), set `SHANKHA = true` in
  `src/features/devotion-sound.mjs` and rebuild. The build then lists it in
  each page's sound control and ships `assets/audio/sfx/shankha.mp3`; it
  sounds once, softly, when a reader with temple sounds on reaches the end of
  a page. Set it back to `false` to switch it off again.
- **The level.** The music is mastered quietly (−23 LUFS), so the control's
  default volume is 80 %; the temple sounds sit 8 dB under the music. To
  change these defaults, add `data-volume="70"` (0 to 100) or
  `data-sfx-db="-10"` to the `<div class="snd" data-sound …>` that
  `soundControl()` writes in `src/features/devotion-sound.mjs`. A visitor's
  own volume, once set, is kept.
- **Where a first play starts.** The flute sits well above its drone (about
  70/30, below), so the first 10 seconds of the file, the tanpura and the
  pad alone, would sound as if nothing had happened. A visitor's first play
  therefore starts 1.5 seconds before the flute comes in (8.5 seconds into
  the file); music carried over from another page goes on from where it
  was. The build writes this point on the sound control as `data-start`,
  from `fluteStart` in `src/assets/audio/manifest.json`, so it follows the
  music when it is re-rendered.
- **The level reference.** The motifs that pulse with the flute (the nada
  rings, and the sound rings in the Music page's opening picture) read the
  music's level through `DP.sound.level()`, which reports a moment as loud
  (by RMS) as the track's own 95th-percentile frame as 1. The build writes
  that reference on the sound control as `data-level-ref`, from `levelRef`
  in the manifest, when the manifest has one; without it the player uses
  0.08, measured on the first flute track. `tools/compose-audio.mjs` writes
  `levelRef` on every full run (the 95th percentile of the RMS of
  2048-sample frames of the file the site plays; 0.069 for the Pahadi
  piece). Neither attribute is edited by hand: re-render and rebuild.

### Changing or re-rendering the music

Nothing is recorded: the bansuri, the tanpura, a faint drone like a shruti
box (the "pad"), the bells and the temple's acoustics are synthesised by
`tools/compose-audio.mjs`, from a score written in sargam near the top of
that file (`SCORE`). The comments above the score explain every symbol. Each
phrase is one line, for example:

```js
{ notes: 'G:1.0 (M)G:0.5 R:0.45 S:1.0 D.:0.45 /P.:3.0', gap: 1.9, level: 0.65 },
```

- `S R G P D` are the swaras Raga Pahadi moves on; `M` and `N` (shuddha Ma
  and Ni) may only touch (see below). `P.` (a dot) is the octave below,
  `P..` two octaves below, `S'` (a quote) the octave above, `S''` the one
  above that.
- `:1.8` is how long the swara is held, in seconds (there is no tala).
- `/D` is a meend: a slow glide into the swara from the one before it, over
  35–60 % of the note. At the start of a phrase, or after a silence, it
  glides up from the raga's melody swara below (never from Ma or Ni).
- `(D)P` is a kan, a quick grace touch of D just before landing on P;
  `(GR)S` a murki, two quick grace notes and then the swara (at most three
  in the brackets).
- `G~` is an andolan: a slow, shallow swing 15–25 cents *below* the swara
  that keeps returning to it. It is rare in this style: at most twice in the
  piece.
- `-:0.4` is a short silence inside the phrase (no breath is taken).
- The marks combine in this order: meend, grace notes, swara, octave marks,
  andolan, duration, as in `/(DP)G'~:2.4`. A silence takes none of them.
- `gap` is the breath after the phrase, in seconds (0 or more; the tanpura
  and the pad carry on); `level` (above 0, at most 1) is how strongly the
  phrase is played: softly here, 0.62 to 0.72. `shimmer: true` would ring a
  soft swarmandal sweep in the breath before that phrase; this piece uses
  none, and the option is kept, off, like the conch (a shimmer may not ring
  within 8 seconds of the loop's start or end, and needs a breath of at
  least 1.55 seconds before its phrase).
- Above the phrases: `tempo` slows the whole piece (1.1 is 10 % slower);
  `intro` and `outro` are the seconds of drone alone before the first phrase
  (10) and after the last (8), where the loop's seam falls; `excerptFrom` is
  the phrase the 30-second listening excerpt starts just before; `seed`
  drives every small human detail (a different seed is a different
  performance of the same score).

**Ma and Ni only touch.** In Pahadi they appear as a kan or a murki, or in
passing (`G M G R S`, `P M G`, `D N S'`, `S' N D P`, `N. S`), never as a
resting note: a plain `M` or `N` is held at most about 0.6 seconds and
takes no andolan, and the two together are at most about 6 % of the flute's
sounding time. `--plan` checks both (as the score stands: 2.1 %, and 0.41
seconds at the longest). There are no komal or tivra notes: a lower-case
`r g m d n` is an error that says so ("Pahadi has no komal or tivra
notes").

**A meend never rests on a wrong note.** On its way a slow glide passes the
pitches between its two swaras, among them notes Pahadi does not have (komal
Re, komal Ga, tivra Ma, komal Dha, komal Ni) and its touches Ma and Ni. It
may stay within 30 cents of any of them for at most 125 milliseconds, or the
ear would hear that note. Where a glide would stay longer, the tool makes it
steeper through the middle and, only if that is not enough, shorter; nearly
every slow meend in Pahadi is shaped this way. `--plan` lists each one and
what it became.

**The raga.** `SCORE.raga` names one of the ragas in `RAGAS`, just below the
score: `Pahadi`, or `Bhoopali` (S R G P D only), which is kept so that the
notation stays general. Each entry lists the swaras a phrase may write, the
melody swaras a meend may start from, the swaras allowed only as touches with
their limits (for Pahadi `touch: { swaras: 'MN', hold: 0.6, share: 0.06 }`),
the raga's line in the manifest and the error for a swara it lacks. A new
raga is added there; it can use only the seven shuddha swaras, since the
notation has no komal or tivra notes. When the raga changes:

- the music's file names follow it (`flute-pahadi.mp3` becomes
  `flute-<raga>.mp3`), and the build follows the manifest;
- the line under the credit does not: change `RAGA` in
  `src/features/devotion-sound.mjs` by hand, and have it translated (see
  [Translations](#translations));
- the scroll chimes stay on S R G P D S', whatever the raga.

The build ships only the music file the site plays (`flute-pahadi-xfade.mp3`
today); the plain loop, the manifest and any files of an earlier piece left
in `src/assets/audio/` stay out of the site.

**The balance** is about 70 % flute and 30 % accompaniment, as the site's
owner asked. In `MUSIC`, below the score, each layer is set by its
loudness relative to the flute: `tanpuraLU: -17` (the tanpura 17 LU below
the flute) and `padLU: -23.5` (the pad 23.5 LU below), which puts the two
together about 16 LU below it (the render prints 16.1). `wetLU: -9` is the
temple's reverb, 9 LU below the dry mix: the flute's space, not an
instrument. A number nearer 0 brings that layer forward; loudness roughly
halves for every 10 LU. (`shimmerLU` is for the swarmandal, which this piece
does not use.)

**The tuning.** Everything is tuned to Sa = D at A4 = 432 Hz: the flute's
madhya Sa is D4, 288.3254 Hz (`SCORE.sa`), the tanpura is tuned an octave
below, and the swaras sit in just intonation above Sa. The bell and the six
chimes (S R G P D S', 576.65 to 1153.3 Hz) are rendered from the same Sa, and
the player varies the bell's pitch by only about 5 cents, so it stays on Sa.
Changing `SCORE.sa` (or `SCORE.seed`) changes every detail of the render.

To render it (needs Node.js 20 or newer and `ffmpeg` with `libmp3lame` on
the PATH; a minute or two; the same score always gives the same files):

```powershell
node tools/compose-audio.mjs --plan
node tools/compose-audio.mjs --xfade-tail 4.6
node build.mjs
npm test
```

1. `--plan` checks the score and renders nothing. It prints the raga, Sa
   and the tuning; when each phrase starts and ends; the length of the loop
   and how much of it the flute plays (targets 230–270 seconds and
   70–75 %; as written, 249.26 seconds and 74 %); the share of tara sthayi
   and the number of andolans; the levels and the shimmers; the share of
   Ma and Ni and the longest plain one; every meend that passes a note the
   raga lacks, or Ma or Ni, and what was made of it; and where the
   30-second excerpt falls. A line that starts with `!` is outside its
   target. A mistake in the score (a token it cannot read, a komal note, a
   misplaced shimmer, an unknown field) stops it with a message that says
   what is wrong and in which phrase.
2. The second command renders and encodes everything into
   `src/assets/audio/`: the music (`flute-pahadi.mp3`, and
   `flute-pahadi-xfade.mp3`, the copy the site plays: the loop followed by
   its own first 4.6 seconds, so that two players can hand over without a
   seam), the temple sounds in `sfx/`, and `manifest.json` (the loop points,
   the start of the flute and the loudness the site reads).
   `flute-pahadi.mp3` is encoded circularly, so a player that loops it to
   the sample hears no edge at the wrap. **Always run it whole, with
   `--xfade-tail 4.6`**: `--music` or `--sfx` alone rewrites the manifest
   with the other part kept from the one already there, and without
   `--xfade-tail` the manifest names no crossfade copy, so the site falls
   back to the plain file. It also writes a 30-second listening excerpt,
   `flute-excerpt.mp3`, into a work folder it names at the end (not part of
   the site; `--work` followed by a folder puts the work files there).
   `--wav` renders the WAV files there only, and changes nothing in
   `src/assets/audio/`. An unknown option, an option without its value, or
   a tail longer than the loop is an error before anything is written.
3. The build reads the new loop points, the first-play start and, when the
   manifest has one, the level reference from the manifest, gives every
   audio address a new content version (so visitors get the new music at
   once, although browsers keep audio for 30 days), and ships only the files
   the pages use. `npm test` checks them.
4. Listen to the result on speakers and on headphones before deploying.

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
package you received, its zip, a zip of the website files alone
(`…-deploy-only.zip`), a zip of the project alone without the built website
(`…-source-only.zip`), and `release\SHA256SUMS.txt` with the fingerprints of
all three. Stop `npm run dev` first: the packager stops if
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
| The photo pipeline: every photo from its 4K copies, each with its measured `sizes`, the share images | `npm test` (runs `tests/photos.test.mjs`) | a build |
| Whether the measured `sizes` still match the layout | `node tools/measure-sizes.mjs --check` | `npm install` |

The test files are in `tests/`, the browser checks in `qa/`, the server
tests in `deploy/test/`, and the tools in `tools/`.

To point the browser check at another address, set `BASE_URL` first.
PowerShell: `$env:BASE_URL = "https://www.dattapeetham.org/"`. Linux,
macOS: `BASE_URL=https://www.dattapeetham.org/ node qa/check-pages.mjs`.
