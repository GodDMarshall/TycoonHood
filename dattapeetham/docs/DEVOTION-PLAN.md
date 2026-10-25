# Devotion motion: the plan for stage 2

> **Status: wired (stage 2).** Every placement below is in the real pages, in
> all five languages, together with the flute music and the temple sounds.
> What stage 2 changed, measured and left open is in section 9; what the
> recorded walk-through of every page changed is in section 10; the polish for
> phones (speed, the Darshan aarti, the flowers on Home and Seva, the bells on
> Darshan and Visit) is in section 11.

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
| `src/assets/js/devotion-motion.js` | Behaviour. A plain IIFE with no dependencies (54 KB, 18 KB gzipped, much of it comments). It starts every `[data-devotion]` element and exposes `DP.devotion`. Every motif that the script moves runs on one shared frame loop (section 11). |
| `src/assets/css/devotion-motion.css` | Styles (45 KB, 14 KB gzipped). The flame, diya and bell drawings are inline SVG data URIs, plus one 2 KB WebP of the flame for phones; the CSP allows both (`img-src data:`). |
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
| `pushpanjali` | Offering flowers | `pushpanjali({ density, shower, layer, below })` in a `DV_HOST` | Marigold petals (saffron and yellow, with ruffled edges) and jasmine flowers and buds drift down with depth: far ones soft, a very near one a bokeh blur. They tumble softly. A gentle shower falls when the section first comes into view, then it is sparse; fast scrolling stirs a few more. Each petal is a small pre-drawn element moved only by transform and opacity. With `below: '<selector>'` the flowers fall only beneath that element of the host (its heading), emerging just under it, so the heading stays clear. | No JS: none. Reduced: a still scatter |
| `dhoopa` | Offering incense | `dhoopa({ from, wisps, stick, at, height, width })` in a `DV_HOST` | An incense stick with a breathing ember. Thin wisps rise, start to sway, then curl and spread into a soft veil at very low opacity. The canvas is only a column (480px by default) at one side of the section. The stick stands in the margin beside the text column (the host's `.wrap`), so the smoke rises clear of the words; where that margin is narrow (phones, small laptops) it stands at the very edge and the smoke sways less. For dark sections. | No JS: none. Reduced: a still frame |
| `aarti` | Aarti / pradakshina | `aarti({ gap, period, size })` inside a positioned focal element, or `aartiAround(imgOrSvgHtml, opts)` | A small flame traces a slow clockwise circle with a fading trail of light, then rests at the crown. One circle every 8 s. Around a photograph the path becomes an ellipse with `gap` clear of each edge, and the flame is counter-scaled so it stays a true flame. Near the screen edge (a phone), where an ellipse clear of the corners would pass the edge of the screen, the flame instead follows the element's own outline, a rounded frame `gap` clear of it, with four sparks as its trail. | The path ring (or frame), with the flame at the crown |
| `padma` | The lotus (seat of the divine, of meditation) | `padma({ size })` (bloom) or `padmaOrnament(sectionHeadHtml)` | Gold line-art lotus: petals open from a bud, the outer ones first, then a bindu kindles above. `padmaOrnament()` swaps the gold ornament that `sectionHead()`/`ornament()` draw for the lotus between two hairlines. | Open |
| `kolam` | The kolam drawn at the threshold to welcome | `kolam({ cols, rows, width, range })` | A sikku kolam: one unbroken line woven around a dot grid, with diagonal crossings and petal loops at the border. The geometry is computed at build time, so it is deterministic and the line is single when cols and rows are coprime. First the dots appear, then the line is drawn by your scrolling. When it closes, a bead of light runs the line once. On forest it is cream, like rice flour. | Drawn |
| `nada` | Nada: the primordial sound | `nada({ size, layer: 'behind' })` (rings) or `nada({ variant: 'string' })` (tanpura) | A bindu with rings that breathe outward (about 10 s). While the flute plays (`DP.sound`), the rings brighten and the bindu and rings pulse with its level. Behind words (`layer: 'behind'`) the bindu is only a soft warmth, without the white-hot point. The string variant is three shimmering strings of light with a bead travelling along them. | Still rings; still strings |
| `jyoti-progress` | Carrying the lamp | `JYOTI_ATTR` on `.scroll-progress` | A flame at the reading line's tip | The flame at the tip, still |
| `ghanta` | Ringing the bell on entering | `ghanta({ side, drop, inset, beside })` inside a positioned section, or with `beside: 'h2'` as the first child of the section's heading block | A brass bell on a chain at the section's top edge. It swings once, with a ring of light humming out, when it first comes into view, on `dp:bell`, and when a pointer touches it. With `beside` it hangs beside the heading's words at a modest size (32 to 42px), its body level with the heading's line and its chain fading upward; the script finds room after the first line, else the last, else before a centred line, else above the heading at the right (long Tamil and Kannada headings on a phone). It swings more gently there (8 degrees) so its lip keeps clear of the words. | Hangs still (beside: placed, still) |

**Runtime API.**
- `DP.devotion.init(scope)` starts motifs added later. Use it after a page
  script inserts markup.
- `DP.devotion.light(el)` lights every lamp inside `el`.
- `DP.devotion.ring(el?)` swings a bell (with no argument, every bell).
- `DP.devotion.stats()` returns the frame cost per motif.
- `DP.devotion.tier` is the device tier the motifs chose: `'full'`, `'lite'`
  (phones and tablets) or `'low'` (section 11).

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
| `pushpanjali` | `closing`: `<section id="support" class="ix-closing ${DV_HOST}" …>` and `${pushpanjali({ below: '.ix-closing-inner .lead' })}` right after `${horizon()}` | "Your offering sustains …": flowers offered at the close of the page; they fall beneath the saying, around the buttons, so "Support the Peetham's seva" stays clear (section 11) |

Tested at 1440 and 390. The petals pass behind the words; the horizon and the
mandala stay underneath them.

### about — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `dhoopa` | The `ab-statement` section ("… Devotion is His *methodology*"): add `${DV_HOST}` to its class and `${dhoopa({ from: 'left', wisps: 2 })}` as its first child | Incense rising in the stillness of the statement |
| `lamp-chain` (sequence) | `<ol class="ab-lineage-row" data-stagger${lampChainAttrs({ nodes: '.ab-guru-ring', diya: true, at: 'below', size: 32, gap: 22, order: 'sequence' })}>`, plus in `about.css`: `.page-about .ab-guru-num { margin-top: 56px; }` | The four Gurus of the row, lit one from the next, from Lord Dattatreya to Sri Swamiji |

Tested at 1440 and 390. The incense stands at the left edge. The lineage
lamps need the 56px margin: without it the lamp covers the "01" label. (The
gap was 16 and the margin 50 until the walk-through in section 10: the flame's
tip touched the portrait's gold ring.) They
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
| `ghanta` | `timingsSection`: the section head as ``sectionHead({ … }).replace(/^<header[^>]*>/, (h) => `${h}${ghanta({ beside: 'h2', drop: 44 })}`)``, so the bell is the head's first child and hangs beside "Temple timings" (section 11; it hung in the far-right gutter until then) | Ringing the bell as you enter for darshan; it swings with the section bell when temple sounds are on |
| `aarti` | `prayerHall`: as the last child of `<figure class="dn-inset">` (after its `<figcaption>`), `${aarti({ gap: 18, size: 30 })}`, so the flame circles the whole inset, the photograph and its name | The photograph is of the arati itself: the flame circles it as the lamp circles the deity |
| `deepaDivider` (5) | `render`: between `${festivalsSection}` and `${ctaBand({`, insert `${deepaDivider({ count: 5 })}` | Lamps lit before "Come for darshan" |

Tested at 1440 and 390. The ellipse hugs the inset card with 18px clear. (Until
the walk-through in section 10 it circled the photograph alone, so every circle
passed across the caption beneath it.)
On a phone the inset sits about 30px from the screen edge, too close for an
ellipse that clears the card's corners, so there the flame follows the card's
rounded outline 18px clear of it (section 11); if a placement leaves less room
than the gap plus the flame, the script closes the path in so the flame never
passes the edge of the screen.

### events — medium

| Motif | Where | What it evokes |
| --- | --- | --- |
| `pushpanjali` | `festivalsSection`: `<section id="festivals" class="section section-dark grain ev-year ${DV_HOST}">` and `${pushpanjali({ density: 0.6 })}` as its first child | The festival year: flowers of celebration (the `.grain` overlay stays on top). Density 0.6 (was 0.8): the section's month dial already moves |
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
stick stands bottom-left, in the margin left of the text column. (Until the
walk-through in section 10 it stood under the note, at the column's first
letters, and its smoke drifted up behind the paragraphs.)

### seva — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `lamp-chain` (standalone, 5) | `.seva-creed`: right after `<p class="creed-note" …>…</p>`, insert `${lampChain({ count: 5, range: '0.9,0.62', cls: 'seva-dv-chain' })}`, plus in `seva.css`: `.page-seva .seva-dv-chain { margin-top: 28px; }` | "Service to mankind is service to God": one act of service kindles the next, a lamp lit from a lamp. The range has all five lit by the time the creed is mid-screen (the default left a reader who paused there with three of five) |
| `pushpanjali` | `#donate`: `<section id="donate" class="section section-paper seva-donate ${DV_HOST}">` and `${pushpanjali({ density: 0.6, below: '.section-head' })}` | The offering: "Your offering sustains …"; the flowers fall beneath the section head, over the fund cards (section 11) |

Looked at on screen at 1440 and 390. The flowers fall behind the fund cards,
never across the heading.

### visit — low

| Motif | Where | What it evokes |
| --- | --- | --- |
| `kolam` (9 × 2) | `welcome`: right before `<div class="vs-lit">`, insert `${kolam({ cols: 9, rows: 2, width: 440, range: '0.92,0.66', cls: 'vs-dv-kolam' })}`, plus in `visit.css`: `.page-visit .vs-dv-kolam { margin-bottom: clamp(16px, 2.2vw, 28px); }` | The kolam drawn at the doorstep to welcome guests, above "Persons of all faiths are welcome". It closes as it reaches the middle of the screen, then the bead runs; with the default range a reader stopping at the saying saw a half-drawn line with a loose end |
| `ghanta` | `guidelinesSection`: `${ghanta({ beside: 'h2', drop: 44 })}` as the first child of `<header class="section-head is-left">` | The bell at the temple door: before you travel |

The kolam was looked at on screen at 1440 and 390, the bell at 1440, 1024 and
390 and in the four languages. The kolam is drawn by scrolling, then a bead of
light runs the line. The bell hangs beside "Before you travel", in the sticky
column with its heading, and swings when the heading comes into view (until
section 11 it hung in the right gutter, under the page's sticky "Plan" bar).

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
- **The curtain holds the question briefly** (after stage 2). The question
  rises 1.5 s into the curtain, once its own animation has played, and takes
  focus; unanswered, the curtain starts to lift 4 s later (`ASK` in
  `devotion-sound.js`; gone about 6.4 s into the curtain, where it used to
  hold about 10.4 s), at once on a scroll, Escape, an arrow or Page key or a
  tap on the curtain. The times are kept to the curtain's own animation
  clock, which on a busy device starts up to 0.5 s after the script runs.
  A pointer resting on the choices, or Tab between them, holds the curtain;
  leaving them, it lifts 2 s later, never before the 4 s are up. The CSS
  still lifts it by itself 7 s after the question (12 s while the visitor is
  on the choices) if the script stops. Focus then returns to the start of
  the page, and the same question carries on 250 ms after the curtain is
  gone as the small card above the sound button ("Would you like flute music
  while you read?" · "Play flute music" · "Not now"), which never takes
  focus (Tab reaches it right after the skip link) and leaves by itself after
  16 s or once the reader is 2.5 screens into the page; nothing is stored
  then, and the next visit asks again. The same card is how the question is
  asked when the script arrives after the curtain has lifted (a slow
  connection).
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
  started at 3.46 s, plays the same music**, and the two cross over (0.6 s)
  inside the tanpura's quiet stretch after the kharaj pluck. No pluck is
  doubled or dropped and no part of the loop is skipped. (The tail is 4.6 s
  rather than the 3.35 s first suggested so that it holds that quiet
  stretch, 3.36–4.55 s into each cycle.)
- **B is put in step while it is silent, in two stages.** It starts 2.8 s
  early at gain 0.
  1. *By `currentTime`:* it is seeked until it leads A by 8 ms by ear.
     Recording the output in Chromium 141 against the file showed that
     `currentTime` is not quite what is heard: **an MP3 element positioned
     by a seek into the first half of the file (`#t=`, or `currentTime`
     before or during play) sounds one MP3 frame, 1152 samples (26.1 ms),
     later than its `currentTime` says**; seeked into the second half (the
     split is at half the duration, measured between 110.8 and 111.5 s), or
     playing on from 0, it sounds where `currentTime` says. The aim allows
     for that frame. A seek still lands a few milliseconds off, and for
     this drone that is as good as two unrelated copies: measured on the
     file, the correlation of the drone with itself falls to 0.44 at 0.5 ms,
     0.23 at 1 ms and about 0 by 1.5 ms. Faded together they comb-filter.
  2. *By what the two actually play (ship stage):* each element's path is
     tapped (an `AnalyserNode` between its `DelayNode` and its gain), B's
     lead over A is measured to the sample by cross-correlating the two
     taps (8192 samples each), and the `DelayNode` on B's path takes it up.
     B's lead is searched from −6 to +20 ms (the aim is 8 ms), a span
     shorter than the drone's 27.2 ms period (where the drone's correlation
     with itself is 0.96), so it cannot lock onto a period instead of the
     true lead; the nearer
     secondary peaks (6.8 ms, 13.6 ms) reach only 0.58 and 0.75 against
     1.0 at the true lead. A measurement counts only when the next one
     (100 ms later) repeats it within 3 samples, because two taps read a
     render quantum apart would differ by 128 samples; there are at most 14
     measurements a loop, each a few milliseconds of main-thread time (more
     on a phone). Once the residual is
     within 2 samples the fade uses **equal-gain** curves (sin², cos²: the
     two are one signal, and equal power would swell it by up to 3 dB). If
     that is never reached (a very busy machine), the curves are computed for
     how alike the two taps are as heard together in the last 0.4 s (their
     lag-0 correlation r, counted when the next reading repeats it within
     0.15), keeping the power of the sum steady: in = s·n, out = (1 − s)·n,
     s = sin², n = 1/√((1 − s)² + s² + 2r·s(1 − s)), r held to −0.35…1 (so
     r = 1 is equal gain and r = 0 equal power). With no taps at all it falls
     back to equal power, as before. `DP.sound.loop().last` reports `fine`,
     the `delay` used, the number of `measures`, `rho`, the `r` used and the
     `curve` (`gain`, `power` or `mixed`).
- **Measured, by recording the speakers on the audio thread and matching
  them to the file** (Chromium 141, headless, real nginx; the harness
  stayed in the agency's working folder):
  - *Before the ship stage* (stage 1 only): on every run the two copies
    were 2.6–3.9 ms apart through the fade, so the drone was doubled for
    0.6 s once a loop (correlation with the file down to 0.61–0.69, against
    1.0 outside the fade), and on a fresh start, where the two happened to
    be in step, the equal-power curves swelled the level by up to +2.7 dB.
  - *After* (four runs of the final code: resumed at 211 s and at 100 s,
    100 s being a first-half seek where the one-frame offset applies; then
    at 211 s and 150 s with three of the machine's four cores kept busy):
    in every run the correlation with the file through the fade was
    0.9998–0.9999 (as outside it), the level within 0.01 dB, no jump
    (0.00 ms), no silent frame and no dropped render quantum. B was found
    3.3 to 12.0 ms ahead and held back by exactly that, from four
    measurements, with no reseek, and the fade used equal-gain curves every
    time.
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
  measured in Chromium only, but the sample alignment measures what the two
  players actually output, so it does not depend on it. If a browser cannot
  tap a media element (an `AnalyserNode` after a `MediaElementSource`), the
  fade falls back to equal power: a brief phasing of the drone once a loop
  at most, as before. iOS Safari playing two media elements through Web
  Audio at once during the 0.6 s fade is also untested.
- **The floating sound button** (bottom left, like back-to-top on the right)
  sits over page content as the reader scrolls on phones; it tucks away at
  the top of each page while nothing sounds, and the footer leaves room for
  it.

## 10. The walk-through (stage 2)

Every page was recorded as a visitor meets it, and the recordings were
looked at frame by frame, motif by motif:

- the first visit, from the opening curtain through "Enter with flute
  music";
- a steady read of each of the 16 English pages at 1440 × 900 (about 420 px
  a second, pausing three seconds wherever a motif comes into view, then at
  the footer lamps), with the flute and the temple sounds on;
- Home, Darshan and Guru Parampara on a 390 × 844 phone, and `kn/index` at
  both sizes; the invitation and the sound panel in Kannada.

The frames were rendered at a fixed page time per frame (headless Chromium
with begin-frame control and virtual time), so every motif moves at its real
speed in the recordings however loaded the machine was. Each change below was
recorded again afterwards and looked at.

### Changed

| Where | What the recording showed | Change |
| --- | --- | --- |
| Media, Music, Attractions (`nada`, behind words) | The bindu's white-hot core sat on "in" of "Listen in stillness" and between the lines of the two quotes, pulsing with the flute: a glare on the text. The `.72` opacity meant for it never applied (the breathing animation sets opacity). | Behind words the bindu is a soft warmth with its own gentle breathing (`devotion-motion.css`); the rings carry the motif. |
| Kriya Yoga (`dhoopa`) | The stick stood under the first letters of the paragraphs (30 % of the canvas, 144 px, with the text column at 132 px) and its smoke rose behind the words. | The stick stands in the margin beside the host's `.wrap` text column (66 px at 1440); where the margin is under 80 px it stands at the very edge and the smoke sways less (`devotion-motion.js`, every incense placement). |
| Darshan (`aarti`) | The ellipse circled the photograph alone, so every circle crossed the caption beneath it; an ellipse through the middle of each edge also cuts the corners. | `aarti()` now circles the whole inset card (`darshan.mjs`), and where the screen leaves room the ellipse is widened evenly until it also clears the corners (`devotion-motion.js`). |
| Visit (`kolam`) | A reader stopping at "Persons of all faiths are welcome" saw the line half drawn with a loose end, and the kolam sat on the saying. | `range: '0.92,0.66'`: it closes as it reaches the middle of the screen and the bead runs; a margin below it (`visit.css`). |
| Seva (`lamp-chain`) | Three or four of five lamps lit while the creed was being read. | `range: '0.9,0.62'`: all five are lit by then. |
| Home, Teachings (`deepa-row` under a saying) | The flames rose to within a few pixels of the last line's descenders. | A breath of space above a lamp row inside a `<figure>` (`devotion-motion.css`). |
| About (lineage lamps) | The flame's tip touched each portrait's gold ring. | `gap: 22` (was 16), `.ab-guru-num` margin 56 px (was 50). |
| Events (`pushpanjali`) | About thirteen petals at once over a section whose month dial also moves, crossing the heading and the paragraph. | `density: 0.6` (was 0.8). |

### Looked at and kept

The curtain and its invitation (at 1440, 390 and in Kannada), the sound
button over light and dark sections, the panel and its credit; the reading
lamp; the footer lamps before the closing prayer on every page; the lotus
ornaments; the lineage diyas on Guru Parampara; the Sri Swamiji timeline
flames; the Guru Purnima and About incense; the Darshan and Visit bells; the
Home and Seva flowers; the Centres row of sixteen; the tanpura strings on
Music; the single lamp on the 404 page. No page scrolled sideways in any
recording (measured at the end of each).

### Still open (larger than a placement)

All three were done in section 11; the notes below are what the walk-through
found.

- **The aarti on phones.** At 390 the inset card sits 14 px from the screen's
  edge, so the ellipse keeps its snug fit and the flame still passes the
  corners of the card, near the first and last letters of its three-line
  caption, once a circle. A path that follows the card's rounded rectangle
  (`offset-path`) would fix it everywhere; Safari support for that should be
  checked first.
- **Flowers behind headings.** On Home and Seva the petals of the closing
  offering pass behind "Support the Peetham's seva". They are behind the
  text and sparse; a host that starts below the heading would keep them to
  the cards and buttons.
- **The bells are small and far right** (Darshan, Visit), in the gutter at the
  section's top. That is restrained; if the Peetham wants the bell noticed,
  hang it beside the section's heading instead.

## 11. Polish for phones (after stage 2)

The stage-2 verification measured the motifs on a phone profile (390 × 844,
CPU slowed four times): while scrolling they added 18–33 % to the long-task
time of Home, Darshan, Music and `kn/index`, and 158 % on Guru Parampara. It
also left three placements open (section 10). This section records what was
found and changed. All measurements: Chromium 141 headless, no GPU, on a
shared four-core machine, the pages served by nginx; a phone is 390 × 844 at
3×, touch, CPU × 4.

### Why the motifs were slow on a phone

Measured with Performance traces, layer counts and A/B passes inside one page
load (the motifs shown, then hidden with `display: none`, alternating, after
a warm-up pass, so machine load and image loading fall on both arms alike):

1. **Every flickering flame cut the page into extra layers.** A flame
   flickers with a transform animation, which the compositor runs; the
   browser then has to assume the moving flame may cover anything painted
   after it, so the content after each lamp was lifted onto layers of its own.
   On Guru Parampara, counted at nine scroll positions after every reveal had
   played: 18 to 37 more layers than with the motifs hidden (58–107 against
   40–71). Each layer costs the main thread on every frame (layerize, commit,
   update layers). This was the largest single cost.
2. **Lamps inside a list the page restyles every frame.** `site.js` writes
   the reading progress (`--p`, `--tl`) on `[data-progress]` and
   `[data-timeline]` lists on every scrolled frame. The property is inherited,
   so every part of every lamp attached to the Guru Parampara thread (and the
   Sri Swamiji timeline) was restyled every frame. With the lamps moved out of
   the list the style time fell to the level with the motifs hidden (4652 and
   4674 ms a pass, against 5590 with the lamps inside).
3. **Writes before the page's own reads.** The reading lamp wrote its
   position every scrolled frame in a frame callback that ran before the page
   scripts' callbacks, which then read layout (`getBoundingClientRect`); each
   read forced a second style and layout pass in that frame (on Guru
   Parampara, 69 of the 72 forced passes inside `site.js` followed the reading
   lamp's writes).
4. **Script.** The incense cost 4.4 ms a draw at four-fold CPU (20 draws a
   second near Guru Purnima); the strings on Music drew at 60 fps; every
   canvas and the flowers ran their own loop.

Not causes: the IntersectionObservers (under 60 ms in a whole scroll), the
`gp-bead` animation of the page itself (it costs the same with the motifs
hidden). (A note for whoever measures next: blocking a script with request
interception, Playwright's `route`, slows every request of the page and skews
that arm; stop a script with its own guard instead, as the table below does.)

One correction to the stage-2 attribution: its "motifs removed" run removed
every `[data-devotion]` element, and on Guru Parampara that includes the
page's own lineage list (it carries the attached lamp chain), so part of the
158 % it attributed to the motifs was the page's thread itself.

### What changed (`devotion-motion.js`, `devotion-motion.css`)

- **Device tiers.** The script treats phones and tablets (no hover or a coarse
  pointer) as `lite` and weak devices (`navigator.deviceMemory` of 2 GB or
  less, `hardwareConcurrency` of 2 or fewer, or Save-Data) as `low`, and
  reports it in `DP.devotion.tier` (and as `html.dv-lite` / `html.dv-low`,
  which no rule uses). The stylesheet makes the same phone test with
  `@media (hover: none), (pointer: coarse)` rather than with the class: a class
  set on `<html>` after the first paint restyled the whole page once.
- **Flames on phones** flicker with the tongue alone (the halo and the
  white-hot core hold still), by `background-size` rather than transform, so
  nothing is handed to the compositor and no layer is made. A size change
  repaints the flame, and the SVG tongue redrawn at a new size each frame
  cost three times the paint of the motifs-hidden page, so phones draw the
  same tongue from a 2 KB WebP, and it changes in small steps (about seven a
  second). Layers with the motifs shown on Guru Parampara: 1 to 9 more than
  hidden (were 18 to 37). Desktop flames are unchanged.
- **One frame loop** for every motif the script moves (canvases, flowers, the
  nada pulse, the scroll-driven chains and kolam, the reading lamp), each at
  its own rate. While the page scrolls the loop runs after the page scripts'
  scroll work: a scroll listener added at `DOMContentLoaded` (after every
  deferred page script's) moves the pending frame callback to the end of the
  list. The viewport size is read once per resize, never mid-frame.
- **Rates on phones**: flowers 30 fps, incense 20 fps with two wisps of 40
  segments (a third of the work a draw), Music's strings 20 fps; on low-end
  devices 20 fps, fewer petals, one wisp.
- **Still while the page moves, on phones** (`html.dv-moving`, from 300 px/s
  until the page slows under 80 px/s): the canvases and the flowers rest and
  the flames and the nada rings hold still, taking up again as soon as the
  reader stops, which is when they are looked at. A busy page's frames
  already run close to the 50 ms long-task line on a slow phone, so even a
  small cost per frame there tipped many frames over it; and a moving page
  hides a flicker anyway. Desktop motifs keep moving. Every rule keyed to
  `html.dv-moving` ends in a class: the first version paused `.dv-nada *` and
  `.dv-aarti *`, and a selector ending in `*` under a class on `<html>` made
  each toggle restyle the whole page (46 ms a toggle on Home at full CPU
  speed; 1.7 ms now).
- **The reading lamp rides a CSS scroll timeline** (`animation-timeline:
  scroll()`, Chromium and Safari 26) with no script per frame; elsewhere the
  shared loop moves it. Its lean (still, reading, fast, backwards) is set as a
  class only when the pace changes.
- **Per-frame values on the element that uses them**: the attached lamps of a
  `[data-progress]`/`[data-timeline]` list hang in a layer just after the list
  (`.dv-node-layer`, placed by the script at the same spots); the standalone
  lamp chain writes its progress on its fill and runner, the kolam on its
  line, not on the whole motif.
- **Nada on phones**: three rings evenly spaced (not five) and a still bindu.
- **The aarti's frame path** (below) runs only near the screen; far from it the
  animations are cancelled, since a paused one keeps its layers.

### Measured after

**The phone scroll, against the build before stage 2** (`b5dfe94`). Each
run is a fresh context with a cold cache, 3 s after load, then the page is
wheeled to the bottom 120 px every 60 ms; long-task time is the sum of the
tasks over 50 ms during that scroll. Medians; "stage 2" is the build as the
stage-2 verification measured it (`493fffb`), "now" the build with this
section's changes.

| Page | Long-task time, stage 2 | Long-task time, now | Main-thread time, stage 2 | Main-thread time, now | Now without the devotional layer (long-task / main-thread) |
| --- | --- | --- | --- | --- | --- |
| Home | +22 % | **+10 %** | +7 % | +6 % | +19 % / +7 % |
| Darshan | +17 % | **+6 %** | +6 % | +5 % | +10 % / +5 % |
| Music | +33 % | +38 % | +9 % | +6 % | +10 to +55 % / +1 to +8 % |
| Guru Parampara | +113 % | +69 % | +19 % | +12 % | +19 % / +5 % |
| `kn/index` | +20 % | +20 % | +8 % | +7 % | +6 % / +1 % |

(9 runs a build for stage 2 and the base, 7 for now, 4 for the last column,
which is now with the motion and sound scripts stopped by their own guards
and their elements hidden.)

How to read it:

- **Home and Darshan are within the +10 % target.** Darshan's aarti, bell and
  lamps now cost nothing measurable; Home's were about 5 % of main-thread time
  in an A/B inside one page load.
- **Guru Parampara went from +113 % to +69 %**, and is still over the target.
  Split on the same machine in one run (4 runs each): the page as built +79 %,
  with the sound layer stopped +53 %, with both stopped +19 %. So the motifs
  still cost it about a third (mostly compositing: the reading lamp's two
  layers, the incense canvas and the layers that overlap it), the sound layer
  about a quarter (not part of this work), and the rest is the page itself.
  Inside one page load the motifs add 7 % of main-thread time (2 s of 27 a
  pass); the long-task sum grows much more because this page's frames already
  run at 40–50 ms on a phone four times slower than this machine, so a little
  more work per frame tips many of them over the 50 ms line.
- **Music and `kn/index` are over the target, but not because of the
  motifs**: with the devotional layer stopped they are just as far (Music
  swung from +10 % to +55 % between runs; its long-task time is only 5–12 s,
  so it is the noisiest of the five). Main-thread time is within +7 % on both.
- The spread is wide. On this shared machine two runs of the same build differ
  by up to a third in long-task time; main-thread time is steadier (a few per
  cent), which is why both are given.

**Inside one page load** (motifs shown, then hidden, alternating, six to eight
passes): Guru Parampara +7 % main-thread time, Home +5 %, Music +6 %, Darshan
no measurable difference.

**Layers** (Guru Parampara at 390, nine scroll positions, motifs shown against
hidden): stage 2, 18 to 37 more; now 1 to 9 more. Darshan: 8 more, now 1 to 3.

**Toggling a class on `<html>`** (the moving state): 46 ms a toggle on Home
with the first selectors, 1.7 ms now (full CPU speed).

### The three placements

- **Darshan aarti on phones.** Near the screen edge, where an ellipse that
  clears the card's corners would pass the edge of the screen, the flame now
  follows the card's own outline: a rounded frame 18 px clear of the card
  (its corner radius plus the gap), drawn as a faint gold line, with the flame
  carried along it at the circle's pace and ease and four sparks as its trail
  of light; it rests at the crown as before. The path is a Web Animation of
  transform (sampled along the frame), so no script runs per frame. At 320,
  360, 390 and 414 the flame stays outside the card and its caption all the
  way round, at least 12 px inside the screen edge, clear of the text below,
  and nothing scrolls sideways while it moves. Reduced motion: the frame and
  the flame at the crown. Desktop keeps the widened ellipse.
- **Flowers below the heading** (Home `#support`, Seva `#donate`):
  `pushpanjali({ below })` starts the layer just beneath the given element of
  the host, measured by the script (offsets, so the reveals do not move it),
  and the petals emerge there. Home: beneath the saying, so they fall around
  the buttons and over the horizon; Seva: beneath the section head, over the
  fund cards. The heading, and on Home the saying too, stay clear. Looked at
  at 1440 and 390.
- **Bells beside the headings** (Darshan timings, Visit guidelines):
  `ghanta({ beside: 'h2' })` as the first child of the section head. The bell
  is 32 to 42 px (was 28), hangs 18–26 px after the end of the heading's first
  line with its body level with that line and its chain fading upward, and
  swings more gently (8 degrees) so its lip keeps clear of the words; where no
  line leaves room it hangs above the heading at the right of the head (Tamil
  Darshan at 390). Looked at at 1440, 1024 and 390, at 360 in Telugu, and in
  Tamil, Kannada and Hindi; the swing and sound still happen together as the
  heading arrives. Both sections are light grounds (the site has no dark
  theme); the bell is drawn the same on dark grounds.

### Verified

On the built site, Chromium 141 headless:

- The four placements recorded as short frame sequences and looked at: the
  aarti at 320, 360, 390 and 414 while it circles (and under reduced motion);
  the flowers on Home at 1440 and 390 and on Seva at 1440; the bells at 1440,
  1024, 390 and 360, in English, Tamil, Kannada, Hindi and Telugu, ringing and
  still; the phone flames (the footer lamps being lit, the Guru Parampara
  lineage lamps, the Sri Swamiji timeline flames) and the motifs holding still
  while the page moves and taking up again when it stops.
- No sideways scroll while they move: the aarti at 320, 360, 390 and 414, the
  bells at 360 and 390, every page at 390 (the QA crawl). (At 320 the pages
  checked scroll sideways by 25–29 px, the same in the pre-stage-2 build; it
  comes from the header, not from the motifs.)
- Layout shift while scrolling through in screen-sized steps (Home, Seva,
  Darshan, Visit, Guru Parampara, Sri Swamiji, `ta/darshan`; 360, 390, 1440):
  no shift has a motif as its source; every page 0.009 or less except Seva at
  360 (0.042, from its own sections, the same in the stage-2 build).
- `node build.mjs` (kn, hi, ta, te 100 %, nothing missing or rejected, no link
  problems), `npm test` (1474 pass), `node --test tests/photos.test.mjs` (252
  pass), and `node qa/check-pages.mjs`: all 75 pages in the five languages
  clean at 1440, at 390 and under reduced motion with axe.

### Still open

- **Real phones.** All figures are headless and software-rendered on a
  shared machine. A mid-range Android phone and an iPhone should be checked
  by hand, Guru Parampara and Home first.
- **The incense canvas is still a layer of its own** on Guru Purnima,
  Kriya Yoga and About, and a few of the layers after it overlap it; that is
  most of what remains of the layer difference on Guru Parampara.
- **Guru Parampara is still over the +10 % target** (see the table). What
  remains of the motifs there is compositing: the reading lamp's layers (it is
  on screen the whole way) and the incense canvas with the layers that overlap
  it. The sound layer's share is for its owner to look at (its floating
  control and scroll listener, with sound off).
- **Music and `kn/index`** are over the target with or without the
  devotional layer; the cause is elsewhere in stage 2 (not investigated here).
- **At 320 px the pages checked (Home, Darshan, Visit) scroll sideways by
  25–29 px**, from the header (the navigation), with or without the motifs and
  in the pre-stage-2 build too; it is not part of the devotional layer.
