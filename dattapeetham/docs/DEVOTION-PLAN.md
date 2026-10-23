# Devotion motion: the plan for stage 2

The client asked for "motion graphics on every page that plant the thought
'this is devotion' in one's mind". This plan answers with motifs drawn from
real acts of Hindu worship rather than generic decoration: lamps lit one
after another (deepa aradhana), a lamp lit from a lamp (Guru Parampara),
flowers offered (pushpanjali), incense (dhoopa), the aarti circling the
deity, the lotus, the kolam drawn at the threshold, nada, the reader's own
lamp, and the temple bell.

They share one visual language: brass and gold light on ivory or forest, the
site's gold tokens, a soft bloom, slow movement and the site's expo-out ease.
Each page gets one to three motifs, placed where its words already speak of
the act. Nothing sits in a hero (the heroes already carry embers and
constellations) and nothing moves over body text.

Stage 1 built and tested the library in a scratch copy of the site. Stage 2
wires it into the real pages, as set out below. Nothing in the project
outside the four new files has been changed.

## 1. Files

| File | What it is |
| --- | --- |
| `src/features/devotion-motion.mjs` | Markup helpers. Page modules and `layout.mjs` call them. Every helper returns an HTML string. |
| `src/assets/js/devotion-motion.js` | Behaviour. A plain IIFE with no dependencies (37 KB, 12 KB gzipped). It starts every `[data-devotion]` element and exposes `DP.devotion`. |
| `src/assets/css/devotion-motion.css` | Styles (32 KB, 8 KB gzipped). The flame, diya and bell drawings are inline SVG data URIs, which the CSP allows (`img-src data:`). |
| `docs/DEVOTION-PLAN.md` | This plan. |

The motifs contain no text, so they add nothing to translate. Every one is
`aria-hidden`, so nothing new is read out or reachable by keyboard. The build
copies `src/assets/**`, adds `?v=` to the new links and writes the per-language
copies of the script. The script has no `fmt()` strings and no `'assets/…'`
literals, so the language copies are identical to the English one.

## 2. Global integration (stage 2, `src/layout.mjs`)

1. **Load the files on every page.** In `head()`, add the stylesheet right
   after `site.css` and before the page's own CSS, so a page can still
   adjust a motif:
   ```html
   <link rel="stylesheet" href="assets/css/devotion-motion.css">
   ```
   In `layout()`'s `scripts`, add the script right after `motion.js`:
   ```js
   `<script src="assets/js/devotion-motion.js" defer></script>`,
   ```
   The 404 page needs no special care: `rootAbsolute()` rewrites these links
   like the others.
2. **The reading lamp (jyoti-progress), on every page.** Change
   `<div class="scroll-progress" aria-hidden="true">` to
   `<div class="scroll-progress" aria-hidden="true"${JYOTI_ATTR}>`, importing
   `JYOTI_ATTR` from `./features/devotion-motion.mjs`.
   - The existing gold line is not restyled.
   - A small flame rides its leading tip, leaning back as it is carried.
     Faster reading stretches the flame.
   - The flame is built from `<i>`/`<b>` elements because site.css styles
     every `span` inside `.scroll-progress` as the bar itself.
3. **Lamps before the closing prayer, on every page.** In `footer()`, put
   ```js
   ${deepaRow({ count: 5, size: 'sm', rule: true, cls: 'dv-footer-lamps' })}
   ```
   immediately before `<div class="footer-mantra" …>`.
   - Every visit ends the way worship does: lamps lit, then *Lokah samastah
     sukhino bhavantu*.
   - `devotion-motion.css` moves the mantra's top margin above the lamps,
     scoped to `.dv-footer-lamps`, so nothing else in the footer moves.
4. **Sound hooks.** Already wired in both scripts (review stage); stage 2 has
   nothing to add. Load order in `layout()`: `motion.js`, then
   `devotion-sound.js`, then `devotion-motion.js` (either order works).
   - **Nada.** It reads `DP.sound.state().playing` and `DP.sound.level()`,
     and wakes on the `dp:sound` event.
   - **Section bell → hanging bell.** When the sound engine rings a section's
     bell it dispatches `dp:bell` with `{ detail: { section } }`; the bell
     hanging in that section swings with the sound. With no
     `detail.section`, every bell on screen swings.
   - **Hanging bell → sound.** When a bell swings on its own,
     `devotion-motion.js` dispatches `dp:ghanta` with
     `{ detail: { el, cause } }`, `cause` being `'enter'` (the reader's
     scrolling brought it into view), `'touch'` (a pointer) or `'bell'` (the
     sound engine rang it). With temple sounds on, the engine sounds the
     ghanta for `'enter'` (in place of that section's own bell, so one bell
     rings once, in sync with the swing; never on page load) and for
     `'touch'`; it ignores `'bell'`.
5. **Optional: the music hero rings follow the flute.** In
   `src/assets/js/music.js`, right after `energy *= Math.pow(0.3, dt || 0);`,
   add:
   ```js
   var S = window.DP && DP.sound; if (S && S.state && S.state().playing) energy = Math.max(energy, S.level() * 0.8);
   ```

### Section dividers

Use `deepaDivider()` sparingly. Darshan uses one, before its closing call to
action. Don't replace the site's `.divider-light` sweep wholesale: the gold
sweep is the site's signature, and lamps everywhere would stop meaning
anything.

## 3. The library

Call each helper from a page module and print the string where the motif
goes. Every motif starts from its `data-devotion` attribute.

| Motif | Act of worship | Helper | What happens | Without JS / reduced motion |
| --- | --- | --- | --- | --- |
| `deepa-row` | Deepa aradhana: lighting the lamps | `deepaRow({ count, order, size, rule, wrap, align, cls })` | Brass diyas, seen from the side, with the flame on the wick at the spout. They ignite one after another when the row enters view, centre first or left to right. Each flame rises from the wick with a small flare. The flames flicker (three layers, each with its own period) and a warm glow grows as each lamp is lit. Rows shrink to fit a phone, and `wrap: 8` folds long rows into two. | All lit, still |
| `deepaDivider` | The same, as a threshold between sections | `deepaDivider({ count, size })` | A lamp row between gold hairlines | Lit |
| `lamp-chain` (standalone) | Guru Parampara: a lamp lit from a lamp | `lampChain({ count, axis: 'x'\|'y', range })` | A ledge (or vertical line) of lamps. Light travels along it with scroll; a small taper flame carries it, and each lamp kindles when the light reaches it. The light never goes back. | All lit |
| `lamp-chain` (attached) | The same, on an existing list | `lampChainAttrs({ nodes, line, diya, at, size, gap, order })` on the list element | A small lamp (flame, or flame on a diya) on each node, lit as the reading line passes it. Use `at: 'below'` to place it under a node that clips its content. Use `order: 'sequence'` for a row of nodes at one height: lit in order when the row comes into view. | All lit |
| `pushpanjali` | Offering flowers | `pushpanjali({ density, shower, layer })` in a `DV_HOST` | Marigold petals (saffron and yellow, with ruffled edges) and jasmine flowers and buds drift down with depth: far ones soft, a very near one a bokeh blur. They tumble softly. A gentle shower falls when the section first comes into view, then it is sparse; fast scrolling stirs a few more. Each petal is a small pre-drawn element moved only by transform and opacity. | No JS: none. Reduced: a still scatter |
| `dhoopa` | Offering incense | `dhoopa({ from, wisps, stick, at, height, width })` in a `DV_HOST` | An incense stick with a breathing ember. Thin wisps rise, start to sway, then curl and spread into a soft veil at very low opacity. The canvas is only a column (480px by default) at one side of the section. On phones the stick stands at the very edge. For dark sections. | No JS: none. Reduced: a still frame |
| `aarti` | Aarti / pradakshina | `aarti({ gap, period, size })` inside a positioned focal element, or `aartiAround(imgOrSvgHtml, opts)` | A small flame traces a slow clockwise circle with a fading trail of light, then rests at the crown. One circle every 8 s. Around a photograph the path becomes an ellipse with `gap` clear of each edge, and the flame is counter-scaled so it stays a true flame. | The path ring, with the flame at the crown |
| `padma` | The lotus (seat of the divine, of meditation) | `padma({ size })` (bloom) or `padmaOrnament(sectionHeadHtml)` | Gold line-art lotus: petals open from a bud, the outer ones first, then a bindu kindles above. `padmaOrnament()` swaps the gold ornament that `sectionHead()`/`ornament()` draw for the lotus between two hairlines. | Open |
| `kolam` | The kolam drawn at the threshold to welcome | `kolam({ cols, rows, width, range })` | A sikku kolam: one unbroken line woven around a dot grid, with diagonal crossings and petal loops at the border. The geometry is computed at build time, so it is deterministic and the line is single when cols and rows are coprime. First the dots appear, then the line is drawn by your scrolling. When it closes, a bead of light runs the line once. On forest it is cream, like rice flour. | Drawn |
| `nada` | Nada: the primordial sound | `nada({ size, layer: 'behind' })` (rings) or `nada({ variant: 'string' })` (tanpura) | A bindu with rings that breathe outward (about 10 s). While the flute plays (`DP.sound`), the rings brighten and the bindu and rings pulse with its level. The string variant is three shimmering strings of light with a bead travelling along them. | Still rings; still strings |
| `jyoti-progress` | Carrying the lamp | `JYOTI_ATTR` on `.scroll-progress` | A flame at the reading line's tip | The flame at the tip, still |
| `ghanta` | Ringing the bell on entering | `ghanta({ side, drop, inset })` inside a positioned section | A brass bell on a chain at the section's top edge. It swings once, with a ring of light humming out, when it first comes into view, on `dp:bell`, and when a pointer touches it. | Hangs still |

**Runtime API.**
- `DP.devotion.init(scope)` starts motifs added later. Use it after a page
  script inserts markup.
- `DP.devotion.light(el)` lights every lamp inside `el`.
- `DP.devotion.ring(el?)` swings a bell (with no argument, every bell).
- `DP.devotion.stats()` returns the frame cost per motif.

**Hosts.** Layer motifs fill their host and sit above the host's own
background but under its content. Give the host `DV_HOST` (the class
`dv-host`: `position: relative; isolation: isolate`). Any element can be a
host, for example a `<figure>`.

**Tone.** Gold reads correctly on both grounds without extra classes:
- The light treatment is the default.
- The dark treatment applies automatically inside `.section-dark`, heroes,
  `.cta-box`, `.panel-dark`, `.glass` and the footer.
- Force it either way with `tone: 'light' | 'dark'`.

## 4. Page by page

The **What it evokes** column is the act each placement draws on.
Intensity: **low** is a single quiet touch; **medium** is one moving canvas
or layer.

**Import line** for each page module, listing only the helpers it uses:

```js
import { … } from '../features/devotion-motion.mjs';
```

Every page also gets the two global motifs: the reading lamp and the footer
lamps.

### index (Home) — medium

| Motif | Where | What it evokes |
| --- | --- | --- |
| `padmaOrnament` | `mandirSection`: replace `${ornament()}` in its `<header class="section-head">` with `${padma({ size: 56, variant: 'ornament' })}` | "Every shrine … a doorway to the divine": the lotus seat above the city of temples |
| `deepa-row` (5) | `statement`: between `<blockquote>${scrollLit('Just as *fire* …')}</blockquote>` and `<figcaption>`, insert `${deepaRow({ count: 5, cls: 'ix-dv-lamps' })}` | "Just as fire cannot be separated from wood, a true devotee is not separate from … devotion": the lamps are lit as the saying is read |
| `pushpanjali` | `closing`: `<section id="support" class="ix-closing ${DV_HOST}" …>` and `${pushpanjali()}` right after `${horizon()}` | "Your offering sustains …": flowers offered at the close of the page |

Tested at 1440 and 390. The petals pass behind the words; the horizon and the
mandala stay underneath them.

### about — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `dhoopa` | The `ab-statement` section ("… Devotion is His *methodology*"): add `${DV_HOST}` to its class and `${dhoopa({ from: 'left', wisps: 2 })}` as its first child | Incense rising in the stillness of the statement |
| `lamp-chain` (sequence) | `<ol class="ab-lineage-row" data-stagger${lampChainAttrs({ nodes: '.ab-guru-ring', diya: true, at: 'below', size: 32, gap: 16, order: 'sequence' })}>`, plus in `about.css`: `.page-about .ab-guru-num { margin-top: 50px; }` | The four Gurus of the row, lit one from the next, from Lord Dattatreya to Sri Swamiji |

Tested at 1440 and 390. The incense stands at the left edge. The lineage
lamps need the 50px margin: without it the lamp covers the "01" label.

### sri-swamiji — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `lamp-chain` (attached) | `${timeline(avataraTimeline)}` becomes `${timeline(avataraTimeline).replace('<ol class="timeline" data-timeline>', `<ol class="timeline" data-timeline${lampChainAttrs({ nodes: '.tl-dot', line: 0.6, size: 30 })}>`)}` | A life as a line of lamps: each year's dot takes a flame as the gold line reaches it |
| `padmaOrnament` | `#mission`: `padmaOrnament(sectionHead({ … }))` | The lotus over His mission |

Looked at on screen at 1440; at 390, checked for overflow and layout shift
only. The flame sits on each dot, on the gold line.

### guru-parampara — medium

| Motif | Where | What it evokes |
| --- | --- | --- |
| `padmaOrnament` | `#meaning`: `padmaOrnament(sectionHead({ … }))` | The lotus over "the meaning of Guru" |
| `lamp-chain` (attached) | `<ol class="gp-thread" data-thread data-progress="0.62,0.62"${lampChainAttrs({ nodes: '.gn-medal', line: 0.62, diya: true, at: 'below', size: 40, gap: 30 })} aria-label="The lineage of Gurus">` | Guru Parampara as a lamp lit from a lamp. A diya stands before each Guru's portrait, as in a home shrine, and is lit at the moment the page's own thread of light reaches that Guru. The reading line is 0.62, the same as the thread's. |
| `dhoopa` | `<section id="guru-purnima" class="section section-dark gp-purnima ${DV_HOST}">` and `${dhoopa({ from: 'left', wisps: 3, at: 'top', height: '780px' })}` as its first child | Incense on the full-moon night of Guru Purnima; the smoke rises towards the moon |

Tested at 1440 and 390. On phones the stick stands at the edge, clear of the
text.

### darshan — medium

| Motif | Where | What it evokes |
| --- | --- | --- |
| `ghanta` | `timingsSection`: insert `${ghanta({ side: 'right', drop: 72 })}` right after `<section id="timings" class="section section-paper dn-timings-sec">` | Ringing the bell as you enter for darshan; it swings with the section bell when temple sounds are on |
| `aarti` | `prayerHall`: in `<figure class="dn-inset">`, wrap the image: `${aartiAround(img(pic.kaalaagni, 'Sri Swamiji offers arati to Kaalaagni Shamana Dattatreya, the main deity of the Peetham'), { gap: 18, size: 30 })}` | The photograph is of the arati itself: the flame circles it as the lamp circles the deity |
| `deepaDivider` (5) | `render`: between `${festivalsSection}` and `${ctaBand({`, insert `${deepaDivider({ count: 5 })}` | Lamps lit before "Come for darshan" |

Tested at 1440 and 390. The ellipse hugs the 4:5 inset with 18px clear.
On a phone the inset sits about 36px from the screen edge; if a placement
leaves less room than the gap plus the flame, the script closes the path in
(down to 4px) so the flame never passes the edge of the screen.

### events — medium

| Motif | Where | What it evokes |
| --- | --- | --- |
| `pushpanjali` | `festivalsSection`: `<section id="festivals" class="section section-dark grain ev-year ${DV_HOST}">` and `${pushpanjali({ density: 0.8 })}` as its first child | The festival year: flowers of celebration (the `.grain` overlay stays on top) |
| `padmaOrnament` | `calendarSection`: `padmaOrnament(sectionHead({ … }))` | The lotus over the calendar |

The flowers were looked at on screen at 1440 and 390, the ornament at 1440.
The `.grain` overlay stays on top of the petals.

### teachings — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `deepa-row` (5) | `<figure class="tc-lit">`: between `${scrollLit('A speech is an *inspiration!* … *enlightenment* from within!')}` and `<figcaption`, insert `${deepaRow({ count: 5 })}` | The lamp of knowledge (jnana deepa) lit by the words |
| `padmaOrnament` | `#dharma`: `padmaOrnament(sectionHead({ … }))` | The lotus over "Protecting the eternal way" |

Looked at on screen at 1440; at 390, checked for overflow only.

### music — medium (and it moves with the flute)

| Motif | Where | What it evokes |
| --- | --- | --- |
| `nada` (rings, behind) | `<div class="nada-quote section-tight section-paper ${DV_HOST}">` and `${nada({ size: 460, layer: 'behind' })}` as its first child | "Music is my religion …": nada, the sound that is worship. The rings pulse with the flute while it plays. |
| `nada` (string) | `#albums`: insert `${nada({ variant: 'string', cls: 'mu-dv-strings' })}` right before `<ol class="records" data-stagger>` | The tanpura drone beneath the flute: three strings of light shimmering with the music |
| optional | the `music.js` hero hook (section 2, item 5) | The hero's sound rings swell with the flute |

Tested at 1440 and 390. The rings sit behind the quote and do not move the
layout.

### kriya-yoga — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `padma` (bloom) | `#prayers` header: right after `<span class="om ky-om" aria-hidden="true">ॐ</span>`, insert `${padma({ size: 72 })}` | ॐ above the lotus: the seat of meditation (padmasana) before the prayers to the Guru |
| `dhoopa` | `#breath`: `<section class="section section-dark ky-breath-section grain ${DV_HOST}" …>` and `${dhoopa({ from: 'left', wisps: 2, height: '560px' })}` as its first child | Incense in meditation; prana flowing like smoke. It is quiet beside the existing breathing circle. |

The lotus was looked at on screen at 1440, the incense at 1440 and 390. The
stick stands bottom-left, under the "circle is illustrative" note. If that feels crowded, use `from: 'right'` with
`height: '420px'`; this was not tried.

### seva — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `lamp-chain` (standalone, 5) | `.seva-creed`: right after `<p class="creed-note" …>…</p>`, insert `${lampChain({ count: 5, cls: 'seva-dv-chain' })}`, plus in `seva.css`: `.page-seva .seva-dv-chain { margin-top: 28px; }` | "Service to mankind is service to God": one act of service kindles the next, a lamp lit from a lamp |
| `pushpanjali` | `#donate`: `<section id="donate" class="section section-paper seva-donate ${DV_HOST}">` and `${pushpanjali({ density: 0.6 })}` | The offering: "Your offering sustains …" |

Looked at on screen at 1440. The flowers fall behind the fund cards.

### visit — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `kolam` (9 × 2) | `welcome`: right before `<div class="vs-lit">`, insert `${kolam({ cols: 9, rows: 2, width: 440, cls: 'vs-dv-kolam' })}` | The kolam drawn at the doorstep to welcome guests, above "Persons of all faiths are welcome" |
| `ghanta` | `guidelinesSection`: insert `${ghanta({ side: 'right', drop: 64 })}` right after `<section id="guidelines" …>` | The bell at the temple door: before you travel |

The kolam was looked at on screen at 1440 and 390, the bell at 1440. The
kolam is drawn by scrolling, then a bead of light runs the line. The bell hangs in the right gutter. While you scroll it
sits under the page's sticky "Plan" bar, and it swings when the section comes
into view.

### attractions — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `nada` (rings, behind) | `#overview`: `<figure class="at-quote ${DV_HOST}">` and `${nada({ size: 380, layer: 'behind' })}` as its first child | "*Naada* is my voice": sound as Sri Swamiji's voice, behind His words |
| `padmaOrnament` | `#more`: `padmaOrnament(sectionHead({ … }))` | The lotus over "More to discover" |

Looked at on screen at 1440; at 390, checked for overflow only.

### media — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `nada` (rings, behind) | `#audio`: wrap the section head as `<div class="${DV_HOST}">${nada({ size: 360, layer: 'behind' })}${sectionHead({ … 'Listen in <span class="em-light">stillness</span>' … })}</div>` | "Listen in stillness": the rings breathe, and pulse with the flute if it plays |
| `padmaOrnament` | `#photos`: `padmaOrnament(sectionHead({ … }))` | "Darshan in pictures" |

Looked at on screen at 1440; at 390, checked for overflow only.

### centers — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `deepa-row` (16) | `kshetraSection`: right after its `sectionHead(…)`, insert `${deepaRow({ count: 16, size: 'sm', order: 'ltr', wrap: 8, cls: 'ce-dv-lamps' })}`, plus in `centers.css`: `.page-centers .ce-dv-lamps { margin: -8px auto clamp(28px, 4vw, 44px); }` | Sixteen lamps lit one after another for the sixteen Shodasha Datta Kshetras: one row on desktop, two rows of eight on phones |

Tested at 1440 and 390. Without the margin the row touches the grid.

### contact — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `padmaOrnament` | `reachSection`: replace `${ornament()}` in its header with `${padma({ size: 56, variant: 'ornament' })}` | A quiet lotus over "the right desk for every question"; the page stays practical |

Looked at on screen at 1440; at 390, checked for overflow only.

### 404 — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `deepa-row` (1) | Right before `<span class="eyebrow">404 · A different path</span>`, insert `${deepaRow({ count: 1, size: 'lg', align: 'start' })}` | A single lamp to light the way back: "Every road still leads to the Ashram" |

Tested at 1440 and 390.

## 5. Measured

All of this was measured in a scratch copy of the built site served over
HTTP, using Chromium 1194 (headless, no GPU). The harness and the raw
results stayed in the agency's working folder; they are not part of this
repository.

### Cost per motif

Each motif's own main-thread CPU per frame was measured as an A/B in one
session: the motif ON, then OFF, alternating six times, taking the median of
`ThreadTime`.

| Motif (1440 wide) | Main thread, ms per frame | Its own JS (`DP.devotion.stats()`) |
| --- | --- | --- |
| pushpanjali (index closing) | +0.84 (390 wide: +0.56) | about 0.1 |
| dhoopa (Guru Purnima) | +1.41 (390 wide: +0.74) | 0.5 – 0.8, drawn at 30 fps |
| deepa row (index teaching) | +0.38 | — (CSS) |
| nada rings | +0.25 | under 0.03 while the flute plays |
| nada string | +0.08 | about 0.1 |
| aarti | +0.21 | — (CSS) |
| jyoti-progress | — | about 0.03 |
| kolam, lamp chains (scroll-driven) | — | about 0.002; positions are cached, so no layout reads while scrolling |

Every motif is under the 2 ms target. Motifs on one page are rarely on
screen together. The heaviest pair that can share the screen is the index
closing flowers (+0.84 ms) with the footer lamps. The footer lamps were not
measured on their own; a five-lamp row of the same kind adds +0.38 ms, so
the pair comes to about 1.2 ms, under the 4 ms target. Wall-clock timings on this
shared machine (load average about 12) were too noisy to compare, which is
why CPU time was used.

### Layout and accessibility checks

| Check | Result |
| --- | --- |
| Layout shift (scrolled through, 1440 and 390), all 16 injected pages | No layout-shift entry on any page has a motif as its source: they move only transform and opacity, and size nothing after load. CLS is at most 0.011 on every page and width, and matches the originals where both were measured (index 0.001 / 0, darshan 0.002 / 0.003, music 0.001 / 0.003, centres, about, visit, seva, Sri Swamiji all ≤ 0.0012). The one exception is Guru Parampara at 390 (0.086, original 0.081). Those shifts come from the page's own `gp-bead`/`gp-tip`, which animate `top`; moving them to `transform` is a separate fix worth making. |
| Horizontal overflow at 360, 390 and 1440 | None on all 16 injected pages, checked at every scroll step **while the motifs move** (see section 8: the first measurement, taken at rest, missed two that widened the page mid-animation, both fixed). |
| Reduced motion (`emulateMedia`), all 16 injected pages | No running animation inside any motif. Every lamp is lit, every lotus open, every kolam drawn. Canvases and petals paint once as a still. |
| No JS | Lamps lit, lotus open, kolam drawn, aarti path and still rings shown. Flowers, incense and strings are empty. |
| Off-screen and hidden tabs | Canvases and the petal loop stop when off-screen (IntersectionObserver, 160px margin) and in hidden tabs. CSS motifs get `.is-idle` off-screen, which pauses their animations. |
| Console | No errors on any page. |

## 6. Rules for stage 2

- **One to three motifs a page, as above.** Don't add motifs to heroes, the
  virtual tour or the maps.
- **Never put a layer motif in front of body text.** `layer: 'front'` is for
  imagery only.
- **Put a canvas or layer motif inside a `DV_HOST`.** Without one it may slip
  behind the section's background.
- **Don't rename `data-devotion` values or the `dv-` classes.** The script
  and the CSS rely on them.
- **Rebuild and check after adding motifs.** Run `npm test` and
  `npm run qa`.
  - `axe` should stay clean: everything is `aria-hidden`. The bell takes
    pointer input but no focus, which is intentional and harmless.
  - Check `.dv` elements for horizontal overflow at 360 and 390, **while
    they move**: measure the scroll width during the animations, not only
    at rest. A rotated or scaled box counts towards the page's width.
- **To start a motif added later by a script, call `DP.devotion.init(el)`.**
- **Anything that turns or grows near a screen edge must not have a large
  box.** Turn a point (a zero-size pivot), clip what turns inside its own
  bounds, and draw glows and rings as `box-shadow` or as SVG painted past a
  small box. That is ink overflow: painted, but it never widens the page.

## 7. Open points

- **The sound engine** now dispatches `dp:bell` and sounds `dp:ghanta`
  (section 2, item 4); nothing is left to wire.
- **About and Centres each need one line of page CSS** (section 4), so their
  lamps have room.
- **Every placement in section 4 has been injected into a copy of its page
  and looked at.** Stage 2's build will differ only in how the strings are
  written into the modules, so look at each page once after wiring it.
- **Guru Parampara has an existing layout-shift source.** `gp-bead` and
  `gp-tip` animate `top`, which gives 0.08 CLS at 390 in the original page.
  It is not caused by this work, but it is worth a separate fix.
