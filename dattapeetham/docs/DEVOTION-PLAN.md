# Devotion motion: the plan for stage 2

> **Status: wired (stage 2).** Every placement below is in the real pages, in
> all five languages, together with the flute music and the temple sounds.
> What stage 2 changed, measured and left open is in section 9.

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
lamps need the 50px margin: without it the lamp covers the "01" label. They
also need a positioned parent, as `at: 'below'` requires
(`.page-about .ab-guru > a { position: relative; }`, added in stage 2):
without it the four lamps were placed against each `<li>` while the stagger
reveal transformed it, and then all fell under the first portrait.

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
- **About, Centres and Seva page CSS**: added in stage 2 (section 9).
- **Every placement in section 4 is wired and was looked at** at 1440 and 390
  in stage 2 (section 9).
- **Guru Parampara's layout shift: fixed in stage 2.** `gp-bead` and
  `gp-tip` (the lineage thread, not a motif) moved by `top`/`bottom`, which
  counted as layout shift on every frame. They now move by `transform` and
  `translate`, measured against the lit thread with container units
  (`.gp-fill` is a size container, `100cqh` its length). Scrolled through in
  screen-sized steps, three runs each: CLS 0.106–0.117 at 360 and
  0.104–0.107 at 390 before (all of it attributed to these three elements),
  0 at both after. The tip still sits exactly at the end of the lit thread
  and the beads still run its length.

## 8. Review (stage 1)

A reviewer wired the sound engine and this library together into copies of
all 16 pages (plus `kn/index`, `kn/darshan`) and tested them at 360, 390, 768
and 1440. The harness and logs stayed in the agency's working folder; they are
not part of this repository.

**Fixed in this library:**

| Defect | Measured | Fix |
| --- | --- | --- |
| The aarti widened the page on phones | Darshan at 390: the page scrolled sideways by 3–28px, varying as the flame went round. The arm and trail were squares rotating, so their bounding boxes grew by up to 41 %, and the flame's 5.6× halo box passed the screen edge. | The arm is now a zero-size point that turns, carrying the lamp at the radius (`--dv-ad`, or container units without the script). The trail turns inside a clip (`.dv-aarti-tclip`, new markup from `aarti()`). The circling flame's halo is a small core with a `box-shadow` glow. Near the edge of the screen the script closes the path in. |
| The bell's hum ring widened the page | Darshan at 390 and 360, and Visit: 10–15px of sideways scroll while the ring grew (76px × 1.6 next to a bell 30px from the edge). Chromium then widened the layout viewport for the rest of the visit. | The hum is drawn by SVG past a 2px box (new markup from `ghanta()`). The bell keeps at least 22px from the screen edge so its lip never swings past it. |
| A hanging bell rang out of step with its sound | The bell swung on entry (at about 86 % of the viewport), and the section bell sounded later (at 70 %). Scrolling slowly, the bell swung twice: once silently, then again with the sound. | The swing and the sound are now one event: see `dp:ghanta` and `dp:bell` in section 2, item 4. A touch on the bell also sounds it when temple sounds are on. |
| The sounding nada repainted its rings | The music page with the flute playing had more frames over 33ms than without it. | `will-change: transform` is set on the pulse while it is sounding. |

**Checked and fine:**
- **Reduced motion.** All 16 pages at 1440 and 8 at 390, with the flute on. At every motif, nothing moved for 1.5s: no running animation, no rAF from either script, canvases and petals unchanged. A negative control, run with motion allowed, does fail this check.
- **Layout shift.** Scrolled through in screen-sized steps at 1440, 390 and 360, every page is at most 0.009, with three exceptions:
  - Guru Parampara, from its own beads (see above).
  - `kn/darshan` at 1440: 0.043, from the Kannada header's status pills. The original page does the same.
  - Seva at 360: 0.046 in about one run in five; the original page measures 0.001. The source is the pushpanjali layer, `absolute; inset: 0` in `#donate`. When something above the scroll anchor reflows, scroll anchoring keeps the section's content still, but the layer is pinned to the section's top and is counted as moving. Nothing visibly jumps, because the petals are in motion anyway. If a page needs a clean CLS, put the flowers in a host whose top edge does not reflow.
- **Long session.** Three minutes of wheel scrolling on the home page with flute and temple sounds on: heap, DOM nodes and listeners stayed flat, with no growth. After 10–16 temple sounds, every per-hit Web Audio node was destroyed (CDP WebAudio events).
- **Cost.** At 1440, while scrolling through the busiest spots, the motifs add about 2ms of main-thread time per frame: 7.2 vs 4.8ms on the home page's offering, and 6.9 vs 4.2ms on Guru Purnima. With the flute playing, the music page was 8.1 vs 6.5ms. The 95th-percentile frame time did not change in these runs. At 390, the festival flowers on Events, measured on a quiet machine, held 16.8ms at the 95th percentile (10.9 vs 8.8ms of main-thread time per frame). Under heavy load from other jobs they read 33.2ms against 16.8ms for the original page, so check that spot on a low-end phone. All of these figures are headless, software-rendered and on a shared machine.

**Stage 2 must watch:**
- The new markup in `aarti()` (`.dv-aarti-tclip`) and `ghanta()` (an SVG hum) comes from the helpers. Don't hand-write either motif.
- After wiring, check every page at 360 and 390 for sideways scroll at several moments of each animation.
- `devotion-motion.js` uses `setTimeout` once per scrolled frame for the reading flame's rest pose. It is harmless (about 30 calls a second while scrolling), but it shows up in timer counts.

## 9. Stage 2: wired into the site

### What was wired

- **`src/layout.mjs`, every page in every language** (the 404 pages with
  root-absolute paths, which the build writes):
  - in `<head>`, `devotion-sound.css` and `devotion-motion.css` right after
    the unchanged `site.css` line;
  - the sound control right after the skip link, so a keyboard or
    screen-reader user reaches it, and can stop the music, first (it is
    `position: fixed`, so nothing moves on screen);
  - the first-visit invitation as the last child of the intro curtain;
  - `JYOTI_ATTR` on `.scroll-progress`, the footer lamps before the closing
    prayer;
  - scripts in the order `motion.js`, `devotion-sound.js`,
    `devotion-motion.js`, before features and page scripts.
- **The 16 pages**, as in section 4, always through the helpers (the
  stage-1 `aarti()` and `ghanta()` markup included). One to three motifs a
  page, none in a hero. Page CSS: About (margin, and the positioned parent
  above), Centres (margin) and Seva (margin). The optional `music.js` hook is
  in: the music hero's rings swell with the flute while it plays.
- **`translate="no"` on every motif's outer element** (in the helpers). An
  inline motif placed next to text (the lotus before a section's eyebrow)
  otherwise joined that text's translation segment, which became
  `<1><2></2><3/><4></4></1> <5>A city of temples</5>` and lost its
  translation in all four languages. The motifs hold no text, so nothing is
  lost.
- **The intro wordmark on phones.** At `.3em` tracking "AVADHOOTA DATTA
  PEETHAM" ran past both screen edges below about 390px and was clipped
  (measured: 14px each side at 360, 21px at 320). Since the first-visit choice
  now holds the curtain for several seconds, site.css sets a slightly smaller
  size and `.2em` below 480px: at least 23px clear at 320 to 414.

### The sound, as delivered

- **Consent.** Nothing plays and nothing audio is requested without the
  visitor's choice: the first visit is asked in the curtain ("Enter with
  flute music" / "Enter in silence"), the answer is remembered
  (`localStorage` `dp-sound`), and the control on every page switches the
  flute and the temple sounds. A page with both off requests no audio file
  and creates no AudioContext or player.
- **Credit**, the client's words exactly, everywhere: "Flute: original raga
  composition for this website", with "Raga Mohanam" on the line beneath it
  in the panel (`CREDIT` and `RAGA` in `src/features/devotion-sound.mjs`).
- **The conch (shankha) is off** (`SHANKHA = false` in
  `src/features/devotion-sound.mjs`): it has not been auditioned. While it is
  off, the page does not list it and the build does not ship its file. Set
  it to `true` after the Peetham has listened and approved it.
- **Level reference** for `DP.sound.level()`: 0.08, the measured
  95th-percentile frame RMS of the track (it was 0.12).

### The loop

The file is `flute-mohanam-xfade.mp3`, rendered with
`node tools/compose-audio.mjs --xfade-tail 4.6`: the 217.75 s loop followed
by its own first 4.6 s (decoded length exactly N + T; the tail correlates
0.9993 with the head; the plain loop and the temple sounds re-rendered
byte-identical). The build writes the loop plan on `[data-sound]` from
`assets/audio/manifest.json`:

- **When element A reaches 221.21 s (the loop plus 3.46 s), element B,
  started at 3.46 s, plays the same music**, and the two cross over (equal
  power, 0.6 s) inside the tanpura's quiet stretch after the kharaj pluck. No
  pluck is doubled or dropped and no part of the loop is skipped. (The tail
  is 4.6 s rather than the 3.35 s first suggested so that it holds that
  quiet stretch, 3.36–4.55 s into each cycle.)
- **B is put in step while it is silent.** It starts 1.6 s early at gain 0
  and is seeked until its `currentTime` agrees with A's. Recording the
  output in Chromium 141 against the file showed that `currentTime` is not
  quite what is heard: **an MP3 element positioned by a seek into the first
  half of the file (`#t=`, or `currentTime` before or during play) sounds one
  MP3 frame, 1152 samples (26.1 ms), later than its `currentTime` says**;
  seeked into the second half (the split is at half the duration, measured
  between 110.8 and 111.5 s), or playing on from 0, it sounds where
  `currentTime` says. B (always seeked near the start) therefore aims ahead
  of A by that frame unless A was itself seeked into the first half. Matching
  the two by their actual output at run time was tried and dropped: the
  drone is so periodic that short snapshots alias by whole kharaj periods
  (27 ms).
- **Measured, by recording the speakers and matching them to the file**
  (Chromium 141, headless): before the lead, every crossfade jumped the music
  back 26.1 ms (nine of nine, every flow); with it, the jump is +1.9 to
  +3.1 ms on a page resumed with `#t=` (three runs), and −4.7 ms on the second
  loop of the same page. Through the fade the level stays within −0.9/+1.6 dB
  of the uninterrupted file and no 10 ms frame drops out.
- **If B cannot start** (a network failure), A goes round by itself with a
  seek back by one loop at 221.7 s: a gap of a few milliseconds in the drone.
  Tested by making B's `play()` fail.
- **Across pages** the position travels in `sessionStorage` (`dp-sound-pos`,
  mapped into the loop) and the next page starts the file with `#t=`.

### Delivery

- **Only the files the script uses are shipped**: the crossfade file and the
  seven temple sounds. `manifest.json`, the plain `flute-mohanam.mp3` and,
  while it is off, `sfx/shankha.mp3` stay in `src/assets/audio/` and out of
  `site/` (`SOUND_DEV_ONLY`, read by `build.mjs` through layout's
  `DEV_ONLY_ASSETS`).
- **Versions**: each audio URL carries `?v=` and the first 8 hex characters
  of the file's SHA-256, the build's scheme for CSS and JS. The script builds
  the audio URLs itself, so the versions travel on `[data-sound]` as
  `data-audio-v="file=hash …"`.
- **Cache**: `.mp3` under `/assets/` gets the 30-day media rule
  (`deploy/routes.mjs`), and every generated server config declares
  `audio/mpeg`. `deploy/test/verify-server.mjs` now also checks the music
  file: `206` for a byte range, `audio/mpeg`, the cache rule, the `?v=`.
  The CSP needed no change: `media-src 'self'` for the `<audio>` element,
  `connect-src 'self'` for the temple sounds' fetch, nothing for Web Audio.
- **`node build.mjs --serve`** serves `.mp3` as `audio/mpeg` and answers byte
  ranges (`206`, `416`). Without ranges Chromium ignores `#t=` and cannot
  seek, so the flute restarted on every page and never reached its crossfade.

### Verified in stage 2

On the built `site/` over HTTP (the dev server), Chromium 141 headless:

- First visit at 1440 and 390: the invitation appears in the curtain and
  takes focus on "Enter with flute music"; nothing audio is requested and no
  AudioContext exists before the choice; the click requests the versioned
  flute only then, one running AudioContext, one playing element, the seven
  versioned temple sounds and no shankha; the choice is stored.
- Next page: no invitation; the music carries on from where it was
  (`#t=`), one context, one player. A new tab with the choice stored: no
  invitation, and the music waits for the first tap (no autoplay).
- The control: switching the flute and the temple sounds off is remembered;
  the next page, scrolled and clicked, requests no audio at all. "Enter in
  silence": three more pages scrolled and tapped, nothing requested. No
  answer: the curtain lifts by itself and nothing is stored.
- Temple sounds while reading (index, darshan, visit, a calm 160px-a-step
  read): 13, 3 and 2 bells (at most one per section), 22, 21 and 19 chimes;
  the closest gaps measured were chime→chime 1.68 s, bell→chime 0.91 s,
  chime→bell 0.70 s and bell→bell 1.67 s (the engine's floors: 0.9, 0.9, 0.7
  and 1.5 s); a fling back to the top made no sound; no shankha.
- No sideways scroll while the motifs animate: all 16 pages and five
  language pages at 360 and 390, sampled at four moments at every
  half-screen scroll step.
- Every page 1–3 motifs plus the reading lamp and the footer lamps, none in
  a hero; screenshots of every motif at 1440 and 390 looked at.
- Reduced motion, all 16 pages at 1440: at every motif, two screenshots
  1.2 s apart are identical and no animation is running; every lamp is shown
  lit.
- The QA crawl (`qa/check-pages.mjs`): all 80 pages (the 75 in the sitemap,
  then the five 404 pages) clean at 1440, at 390 (no sideways scroll) and
  under reduced motion with axe, with no console errors.
- `npm test` (1219 tests, including new guards for the wiring, the audio
  files, their versions and the byte ranges), the photo tests (91), the
  build at 100% translation coverage in all four languages, and real nginx
  and Apache in Docker (`deploy/test/docker-servers.mjs`, all checks).

### Still open

- **Listen on real devices.** Nobody has heard the music or the temple
  sounds on speakers or headphones, and the shankha needs the Peetham's
  approval before `SHANKHA` is switched on.
- **iOS Safari and Firefox were not tested.** The one-frame seek offset was
  measured in Chromium only; elsewhere the crossfade may sit up to 26 ms off,
  as every crossfade did before (inaudible as a click, a brief phasing of the
  drone at most). iOS Safari playing two media elements through Web Audio at
  once during the 0.6 s fade is also untested.
- **The floating sound button** (bottom left, like back-to-top on the right)
  sits over page content as the reader scrolls on phones; it tucks away at
  the top of each page while nothing sounds, and the footer leaves room for
  it.
