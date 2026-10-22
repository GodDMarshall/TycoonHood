# Building a page — Datta Peetham website

Read this before you touch any file. It is the contract every page follows.

## The bar

This is the full rebuild of www.dattapeetham.org for Avadhoota Datta Peetham
(Sri Ganapathy Sachchidananda Ashram, Mysuru). The client supplied a design
reference: `/root/.claude/uploads/b1182561-ec52-585b-bacd-dba9ee5740a3/e730c538-image.png`.
**Open it with the Read tool and study it before designing your page.**

The reference has these qualities:

- Ivory panels (`--ivory`, `--paper`) and deep forest-green immersive sections
  (`.section-dark`).
- Muted gold for buttons and fine line icons.
- Light serif headlines in Cormorant Garamond.
- Tracked small-caps eyebrows.
- A lotus mandala mark.
- Sunset and golden-hour photography.

Its inner-page concepts share one pattern: a full-bleed photo hero with a serif
title, then a row of ivory icon tiles overlapping the hero's bottom edge. The
four concepts are Spirituality, Visit the Ashram, Events & Programmes, and Media
& Teachings.

Each page must feel like the best temple or ashram site on the web: calm,
devotional, rich and immersive, but never busy. Choose quality over quantity of
effects.

## Non-negotiable honesty rules

1. **No invented facts.** Every date, number, timing, name, address, quote and
   claim must come from dattapeetham.org (the harvest files below, or a page
   you fetch), from `src/data.mjs` or `src/site.mjs`. If you don't have a fact,
   leave it out. Don't write "15 Dec 2026"-style festival dates unless the
   source states them; describe festivals by their lunar month instead and link
   to the official calendar.
2. **Real photographs only.** Use images from the Peetham's S3 bucket
   (`https://dattapeetham.s3.amazonaws.com/...`), already listed in `photos` in
   `src/data.mjs` or found in the harvest files. Never use the concept-art
   images in the reference, stock photos or AI images. Every `<img>` needs an
   honest `alt` (empty `alt=""` only when it is decorative).
3. **Transactions stay on the existing system.** Puja booking, donations, the
   store, login and subscriptions link to the `links.*` URLs in `src/site.mjs`.
   Don't build fake forms that look like they take payment.
4. **Label what is illustrative.** An artistic campus map must say "Illustrative
   map, not to scale".
5. Respect the subject. This is a living spiritual institution, so honorifics
   ("Sri Swamiji", "His Holiness", "Sri Bala Swamiji") follow the source's
   usage.

## Content sources

- **Harvest files:**
  `/tmp/claude-0/-home-user-TycoonHood/b1182561-ec52-585b-bacd-dba9ee5740a3/scratchpad/harvest/*.md`
  hold the verbatim text of dattapeetham.org pages. They may still be
  arriving.
- **Fetching a page yourself.** If a file you need is missing, fetch the page
  with Nimble:
  1. Run ToolSearch with `select:mcp__Nimble__nimble_extract`.
  2. Make the first call without a `conversation_id`, then reuse the one it
     returns.
  3. Use `output_format: "markdown"`.

  Direct `curl` or WebFetch to dattapeetham.org is blocked here. Every fetched
  page carries a huge navigation menu and a footer that starts "Avadhoota Datta
  Peetham / Sri Ganapathy Sachchidananda Avadhoota Datta Peetha Trust"; ignore
  both.
- **`src/data.mjs`:** shared collections, including `photos`, `timeline`,
  `concerts`, `albums`, `apps`, `kshetras`, `countries`, `latestSevas`,
  `timings` and `dattaCharitram` videos.
- **`src/site.mjs`:** `site` facts, `links`, `nav` and `hours`.

## Files

```
dattapeetham/
  build.mjs                    zero-dep build: node build.mjs [--serve]
  src/site.mjs                 facts, links, nav, opening hours        (shared — do not edit)
  src/data.mjs                 shared collections                      (shared — do not edit)
  src/layout.mjs               head, header, footer, intro curtain     (shared — do not edit)
  src/components.mjs           HTML building blocks                    (shared — do not edit)
  src/icons.mjs                icon sprite + icon(name)                (shared — do not edit)
  src/assets/css/site.css      design system                           (shared — do not edit)
  src/assets/js/site.js        core behaviour                          (shared — do not edit)
  src/assets/js/motion.js      GSAP/Lenis motion layer                 (shared — do not edit)
  src/pages/<slug>.mjs         YOUR page module
  src/assets/css/pages/<slug>.css   YOUR page-only styles (set css: true)
  src/assets/js/<slug>.js           YOUR page-only script (scripts: ['<slug>'])
  src/features/<name>.mjs           shared feature HTML (feature owners only)
  src/assets/css/features/<name>.css + src/assets/js/features/<name>.js
```

Only create or edit **your own** files. If you need a change in a shared file,
don't make it. Put a page-scoped equivalent in your page CSS or JS, and list
the request under `shared_change_requests` in your result.

## Page module contract

```js
import { pageHero, sectionHead, cards, btn, icon /* … */ } from '../components.mjs';
import { links } from '../site.mjs';
import { photos } from '../data.mjs';

export default {
  slug: 'visit',                 // body class page-visit; CSS file name
  file: 'visit.html',            // output file
  title: 'Plan Your Visit',      // <title> = "Plan Your Visit · Avadhoota Datta Peetham"
  crumb: 'Visit',                // breadcrumb label (optional)
  description: '…150-160 chars, specific…',
  nav: 'Visit',                  // top-level nav label to mark active
  image: photos.prayerHall,      // og:image
  preload: photos.prayerHall,    // hero image to preload (optional)
  css: true,                     // load assets/css/pages/visit.css
  scripts: ['visit'],            // load assets/js/visit.js (optional)
  features: ['ashram-map'],      // load shared feature css+js (optional)
  jsonLd: [ /* extra schema.org objects, optional */ ],
  render: () => `…html…`,
};
```

- Exactly **one `<h1>`** per page. `pageHero()` renders it.
- Give every major `<section>` an `id` and an `<h2>`. The build turns each
  `<section id>` into a site-search entry and checks every `#anchor`.
- Use semantic HTML, a logical heading order, buttons for actions and links
  for navigation.

## Components (`src/components.mjs`)

| function | renders |
|---|---|
| `pageHero({eyebrow, title, lead, image, pos, tiles, crumb, actions})` | Inner-page hero with breadcrumb, kinetic h1, ember canvas, golden-thread wireline and an optional overlapping tile row. `tiles: [{icon, title, note, href}]` |
| `quickTiles(items, variant)` | Ivory icon-tile row. Set `--cols` on the wrapper via `style` if not 4. |
| `sectionHead({eyebrow, title, lead, align, light, ornament, id})` | Centred lotus ornament, eyebrow and kinetic h2. Use `light:true` on dark sections. |
| `split({media, body, reverse})` | Two columns: media clip-reveals, body rises. |
| `frame(src, alt, {caption, pos, ratio, parallax, badge})` | Rounded photo with gold offset outline, parallax and a glass caption. |
| `card({img, alt, title, text, href, tag, icon, cta, pos, meta})`, `cards(list, cols)` | Image cards with tilt, hover zoom and arrow CTA. |
| `photoTile({img, title, text, href, tag})` | Tall photo tile with a gradient and hover text. |
| `stats([[n, label, suffix]], light)` | Stat strip; numbers count up in en-IN format. |
| `ctaBand({title, text, actions, image})` | Closing forest-green panel with a slowly spinning mandala. |
| `gallery([[src, alt, caption]])` | Masonry grid that opens a keyboard-friendly `<dialog>` lightbox. |
| `video({id, title, thumb})` | Click-to-load YouTube (`youtube-nocookie`). |
| `timeline([[year, text]])` | Alternating timeline whose gold progress line fills with scroll. |
| `processSteps([[title, text]])` | Self-drawing line; steps light up as it reaches them. |
| `scrollLit(text)` | Words light up as the statement scrolls past. `*word*` gives the gold sheen. |
| `accordion([[q, html]])`, `tabs(name, [{id,label,icon,html}])`, `chips(name, [[value,label]])` | Accessible disclosure, tabs and filter chips. |
| `infoList([[icon, label, valueHtml]])`, `hoursCard(key, title, rows, {img, note})` | Contact info, plus live opening hours with an open/closed badge (`key` = `temple` or `shukaVana`). |
| `marquee(words)`, `shareRow(text, url)`, `thread()`, `horizon()`, `ornament()`, `eyebrow()`, `img()`, `btn(label, href, variant, icon, extraAttrs)` | Smaller pieces. Button variants: `gold`, `line`, `ghost` (on dark), `ink`. |

For filter chips, put `data-filter-scope` on a wrapper that contains both the
`chips()` and the items. Each item gets `data-filter-item="tag1 tag2"`. An
optional `[data-filter-empty] hidden` element shows when nothing matches.

**Icons:** `icon(name, size)`. Available names: arrow, arrow-left,
arrow-up-right, chev, close, menu, search, play, play-circle, external, plus,
check, pin, phone, mail, clock, calendar, globe, live, user, download, info,
car, bus, plane, train, bed, compass, map, lotus, temple, diya, flame, namaste,
heart, heart-hand, book, music, veena, school, medical, cow, bird, tree, yoga,
sparkle, sun, moon, video, headphones, photo, camera, article, mobile, mic, wa,
fb, tg, yt, ig, spotify, apple, mandala.

## Design system (`site.css`)

- **Tokens:**
  - colours: `--ivory --ivory-2 --paper --sand --line --line-strong --gold
    --gold-2 --gold-3 --gold-deep --ink --ink-2 --muted --forest --forest-2
    --forest-3 --night --cream-on-dark --muted-on-dark`
  - fonts: `--serif` (Cormorant Garamond), `--display` (Marcellus caps),
    `--sans` (Inter), `--deva` (Devanagari, for ॐ)
  - shape and motion: `--radius --radius-lg --shadow --shadow-sm --ease-out
    --ease-k --wrap --gutter`
- **Sections:**
  - backgrounds: `.section` (vertical rhythm), `.section-tight`,
    `.section-paper`, `.section-sand`, `.section-dark` (forest-green immersive,
    gold accents)
  - containers: `.wrap`, `.wrap-narrow`
- **Layout and surfaces:**
  - grids: `.grid .grid-2/3/4/6`
  - panels: `.panel`, `.panel-dark`, `.glass` (dark frosted), `.glass-light`
  - film effects: `.grain` and `.vignette` (on a positioned container)
  - helpers: `.notice`, `.btn-row`, `.lead`, `.prose`, `.serif-quote`,
    `.dropcap`, `.eyebrow`, `.tag`
- **Motion vocabulary.** Prefer these attributes; site.js and motion.js drive
  them:
  - `data-reveal="up|fade|left|right|scale|clip"`: element reveals on scroll.
  - `data-stagger`: children deal in one after another.
  - `data-split`: the heading's words rise out of a blur. Wrap key words in
    `<span class="em-light">` for the gold sheen.
  - `data-parallax="0.08"`: image drifts inside its frame.
  - `data-count="1512"`: number counts up.
  - `data-draw`: SVG strokes draw themselves.
  - `data-tilt`: gentle 3D tilt.
  - `data-magnetic`: button follows the cursor.
  - `data-spin="90"`: element rotates with scroll.
  - `data-progress="start,end"`: element gets a `--p` scroll variable.
  - `data-embers`: golden sparks canvas.
  - `data-constellation`: gold star network canvas.
  - `data-story`: sticky scroll-story stage. Structure:
    `.story[data-story] > .story-stage > .story-plate*` with `.story-progress > i*`,
    plus `.story-scene > .wrap > .story-card.glass` siblings after the stage.
- **The site's signature (from the client's past builds):** one expo-out ease;
  long, calm durations; and a golden thread of light travelling along lines.
  Echo that in custom work. Every animation must have a finished state under
  `prefers-reduced-motion` and without JS. Never hide content in a way that
  only JS can reveal, except through the shared reveal attributes, which are
  handled.

## Page CSS and JS rules

- Scope page CSS under `.page-<slug>` to avoid collisions. Reuse tokens; never
  hard-code new colours outside the palette.
- Mobile first: check at 390px wide. No horizontal scroll. Use tap targets of
  at least 44px.
- Page JS is a plain IIFE with no frameworks. You may use `window.gsap` and
  `window.ScrollTrigger` when present (check first), plus `window.DP` helpers:
  `DP.reduced`, `DP.istNow()`, `DP.scrollTo()`, `DP.reveal(el)`, `DP.lenis`.

## Verify before you finish

1. `cd /home/user/TycoonHood/dattapeetham && node build.mjs`. It must build.
   Your page must cause **no broken links of its own**. Links to sibling pages
   that don't exist yet are fine; the planned pages are index, about,
   sri-swamiji, guru-parampara, darshan, events, teachings, music, kriya-yoga,
   seva, visit, attractions, media, centers and contact. Anchors that other
   pages rely on must exist on your page; your brief lists them.
2. A dev server may already be running on port 4321 (`node build.mjs --serve`
   rebuilds on change). If `curl -s localhost:4321` fails, start one in the
   background yourself.
3. `node qa/shot.mjs <your-file>.html /tmp/claude-0/-home-user-TycoonHood/b1182561-ec52-585b-bacd-dba9ee5740a3/scratchpad/shots/<slug> --full`.
   Then **Read the screenshots and look at them**. Compare with the reference
   image. Fix what looks wrong: spacing, contrast, broken images, awkward
   wrapping, empty areas. Repeat until it is genuinely excellent on both
   desktop and mobile. The script must report no problems.
4. Re-read your copy against the sources for factual accuracy.

## More patterns from the client's past builds (use where they fit)

Port these into your page CSS and JS. All of them need a reduced-motion state
and must be keyboard operable.

- **Horizontal scroll-snap rails** (Gaali-De). Use
  `display:grid; grid-auto-flow:column; grid-auto-columns:minmax(260px,1fr); overflow-x:auto; scroll-snap-type:x mandatory`
  and mask the edges with a gradient. Good for discourses, festivals, albums
  and seva cards.
- **Month/festival bar** (Emerald Haven). Twelve Hindu lunar months (Chaitra →
  Phalguna) marked up as a `radiogroup` with arrow-key navigation, festival
  months highlighted in gold and a "today" dot from `DP.istNow()`. Clicking a
  month filters the cards below.
- **Date-prominent event rows** (PharmaCartel). A large date block, then the
  title, then the meta line, with a stretched link. Format dates with
  `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })`. Only show dates
  the source states.
- **Long-form sticky TOC with scrollspy** (Gaali-De/PharmaCartel). Use an
  IntersectionObserver with `rootMargin: '-96px 0px -60% 0px'` and set
  `aria-current` on the matching link. Good for biographies, the lineage and
  visitor guidelines.
- **Breathing orb** (Gaali-De). A gold orb that scales over about an 8 s cycle,
  with an Inhale / Exhale label switched on `animationiteration`. It is
  illustrative only, so don't prescribe practice timings.
- **Animated waveform bars** (Gaali-De). Generate the bars deterministically
  with a formula, then animate their height.
- **Native share** (Gaali-De). Call `navigator.share()` and fall back to copying
  to the clipboard. Announce the result in an `aria-live` region. Use it
  alongside the WhatsApp, Facebook and Telegram row.
- **BalancedGrid** (Gaali-De). Use a CSS quantity query so a single card is
  never left alone on the last row.
- **Gold pen-stroke underline** (PharmaCartel). Draw an SVG swash under one key
  phrase on reveal: `stroke-dasharray` set to the path length, animated over
  900 ms.
- **Auto-advancing story** (Emerald Haven). Stops advance every 12–15 s with a
  thin gold progress bar and prev/next buttons. Pause on hover, on focus and
  while `document.hidden` is true. Use it for "A day at the Ashram"-style
  sequences, and only with sourced content.

## Known source contradictions (state carefully, don't silently pick one)

- **Shuka Vana and Bonsai Garden hours.** The homepage says 9–12 and
  3:30–6, closed Wednesday. Their own pages say 10–12:30 and 3:30–5:30,
  Wednesday holiday, and that Shuka Vana is "temporarily closed for
  maintenance". The site config uses the homepage hours. On detail pages, show
  a notice: "Timings vary across official sources; please check with the
  Ashram before visiting".
- **Karya Siddhi Hanuman.** The homepage says Abhisheka 7 AM and Aarti 6 PM
  daily. The temple's own page lists longer weekday and weekend hours plus a
  laser show. Show what the temple page states on the darshan page.
- **Sri Jayalakshmi Maata's passing.** One page says 1951, two say 1953.
  Prefer the timeline's 1953, or avoid stating the year.
- **Shuka Vana species count.** 486 on most pages, 468 in one summary. Use
  486.
- **Centre directory.** `harvest/centers--ashramcenters.md` holds 86 of the
  92 centres with addresses. Use it on the centres page and say the list is
  partial, linking the official directory.
