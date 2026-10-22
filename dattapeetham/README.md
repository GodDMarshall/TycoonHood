# Avadhoota Datta Peetham: website rebuild

This is a new website for www.dattapeetham.org. It has 16 pages in five
languages: English, ಕನ್ನಡ (Kannada), हिन्दी (Hindi), தமிழ் (Tamil) and తెలుగు
(Telugu). The design follows the client reference: ivory and paper
backgrounds, forest-green sections, muted gold and the lotus mandala.

It is a static site. A small Node script (`build.mjs`) assembles the pages
into `site/`, so there is no framework and no server code. The built site is
committed, so you can open `site/index.html` without building anything.

## Run it on Windows

You need [Node.js 20 or newer](https://nodejs.org) and Git. Run this in
PowerShell:

```powershell
git clone https://github.com/GodDMarshall/TycoonHood.git
cd TycoonHood
git checkout ccr-d0829889-m0ul0z
cd dattapeetham
node build.mjs --serve
```

Then open http://localhost:4321. The server rebuilds whenever a file in
`src/` changes. Stop it with Ctrl+C.

The build itself needs no `npm install`. The QA tools do:

```powershell
npm install                 # Playwright, axe-core and sharp (dev tools only)
npx playwright install chromium
```

| Command | What it does |
| --- | --- |
| `npm run build` | Builds all pages in every language into `site/`, checks every internal link and anchor, and prints translation coverage |
| `npm run dev` | Builds, serves on port 4321 and rebuilds on change |
| `npm test` | Checks the built HTML: language attributes, metadata, one h1 per page, image alt text and sizes, JSON-LD, safe external links, contact details, sitemap and search index |
| `npm run qa` | Opens every page in Chromium at desktop and phone sizes and with reduced motion, then runs axe accessibility checks and reports console errors and horizontal overflow (`npm run qa -- visit.html` checks one page) |
| `npm run shot -- index.html out --scroll` | Takes desktop and phone screenshots of a page |
| `npm run images` | Downloads any new Peetham photos and makes responsive WebP copies (480/960/1600 px) in `src/assets/img/opt/` |
| `npm run verify` | Runs the build, the tests and the QA crawl together |

## Pages

| Page | File | Covers |
| --- | --- | --- |
| Home | `index.html` | Live temple status, the day's timings, Sri Swamiji, the temples, a virtual tour, Nada Chikitsa, seva, the ashram map, global reach and the apps |
| About | `about.html` | The Peetham's story and principles, the campus, a day at the Ashram, Mysuru |
| Sri Swamiji | `sri-swamiji.html` | His life in chapters, six streams of His work, the Avatara timeline, Guinness records and honours, Sri Bala Swamiji |
| Guru Parampara | `guru-parampara.html` | The meaning of Guru, the Guru Geeta, Adi Guru Dattatreya and His 24 gurus, the lineage, Sri Jayalakshmi Maata, Guru Purnima, Datta Charitram episodes |
| Darshan & Puja | `darshan.html` | Temple timings, each shrine from the Universal Prayer Hall to Kalabhairava, the sevas and links to book them, festivals |
| Events | `events.html` | The festival calendar with filter chips, programmes, concerts, TV telecast times |
| Teachings | `teachings.html` | Discourses, Sri Swamiji says, literature, Bhaktimala, Sanatana Dharma, Ask Dattaji, the A–Z glossary |
| Music | `music.html` | Nada Chikitsa, Raga Sagara concerts and the albums |
| Kriya Yoga | `kriya-yoga.html` | Datta Kriya Yoga: the practice, its benefits, centres worldwide and how to learn it |
| Seva | `seva.html` | The pillars of service: Goshala, Veda Pathashala, SGS Hospital, Annadana, nature work, volunteering, donations |
| Visit | `visit.html` | Getting to Mysuru, the interactive ashram map, guidelines, etiquette, stay and food |
| Attractions | `attractions.html` | Shuka Vana, the Bonsai Garden, Vishwam Museum, Nada Mantapa and the Hanuman statue |
| Media | `media.html` | Videos, audio, books, photo galleries, the apps and social channels |
| Centres | `centers.html` | The world map and the centre directory |
| Contact | `contact.html` | Office contacts, writing in, visiting information, FAQs |
| 404 | `404.html` | Search and the main destinations |

Every page shares the same layout:

- A utility bar showing live temple status in Mysuru time.
- A mega menu, a language switcher and site search (Ctrl+K).
- The footer.

The pages also share a motion layer:

- Lenis smooth scrolling and kinetic headlines.
- Scroll-lit quotes and golden-thread lines.
- Ember and constellation canvases.

All motion switches off when the visitor's system asks for reduced motion.

## Languages

English is the source. `node build.mjs` writes the four other languages to
`site/kn/`, `site/hi/`, `site/ta/` and `site/te/`:

- Text is split into segments. These segments are translated through
  dictionaries in `src/i18n/<lang>/*.json`.
- Each language follows its glossary and style guide in `src/i18n/glossary/`.
- The build checks every translation. Placeholders, numbers and script must
  survive. Any segment that fails, or that has no translation yet, falls back
  to English, so a page never breaks.
- The language choice is remembered. Each page carries `hreflang` links, and
  the sitemap lists every language version.

To add or change a translation:

1. Edit the English page.
2. Run `node build.mjs --extract` to refresh `src/i18n/segments.json`.
3. Add the new segments to a JSON file in `src/i18n/<lang>/`.
4. Run `node tools/i18n-check.mjs <lang>`. It lists missing segments and
   problems.

**The translations are machine-assisted.** They followed a glossary of names,
deities, places and practices. Before launch, a fluent devotee in each language
should read them, especially the Sanskrit verses and honorifics.

## Deploy

`vercel.json` holds the whole deployment: the build command, the `site`
output folder, security headers and a Content Security Policy. It also
redirects old `/page/view/...` addresses to the matching new pages with 301s.

**Vercel:**

1. Import the repository.
2. Set **Root Directory** to `dattapeetham`.
3. Deploy. There is nothing to install.

**Any other static host:** upload the contents of `site/`.

**Before the new site takes over www.dattapeetham.org:** booking poojas,
donations, the store, sign-in and the concert bookings still run on the
existing platform. The new site links to those pages on www.dattapeetham.org
and does not rebuild payments or accounts. Before pointing the domain at the
new site, choose one of these:

- Move the existing platform to a subdomain (for example
  `seva.dattapeetham.org`) and update `OFFICIAL` and `links` in `src/site.mjs`.
- Or proxy those paths (`/poojas`, `/donations`, `/login`, `/store` and the
  others) from the new host to the existing platform.

The pages also cite the Peetham's own pages as sources ("As published on the
temple's own page", "The full timeline on dattapeetham.org", the glossary and
so on). They are built from `OFFICIAL` too, as `${OFFICIAL}/page/view/...`, and
`vercel.json` redirects exactly those `/page/view/...` paths into the new pages.
With the subdomain option the citations follow `OFFICIAL` to the old pages. With
the proxy option they would loop back to the section that cites them, so point
`OFFICIAL` at a host that keeps the old pages, or remove those citation links.

## How it is organised

```
build.mjs              build, link check, search index, languages, dev server
src/site.mjs           facts in one place: address, phones, hours, official links
src/data.mjs           shared content: timings, timeline, apps, kshetras, countries
src/layout.mjs         head, utility bar, header, mega menu, footer, intro
src/components.mjs     hero, tiles, cards, timeline, tabs, gallery, video, CTA ...
src/pages/<page>.mjs   one module per page (plus <page>.css / <page>.js)
src/features/          shared interactive features: ashram map, world map
src/assets/            CSS, JS, icons, vendored GSAP + Lenis, optimised images
src/i18n/              translation engine, segments, glossaries, dictionaries
docs/PAGE-GUIDE.md     the content rules: sources, honesty, page contract
tests/ qa/ tools/      tests, browser QA, image and translation tools
```

All content comes from the official dattapeetham.org pages (October 2026),
and every photo is the Peetham's own. The rest of the site links to the
official system rather than copying it.

## For the Ashram to confirm

The official pages disagree on these points. The site states them carefully
and does not pick one silently:

- **Shuka Vana and Bonsai Garden hours.**
  - The homepage says 9–12 and 3:30–6, closed Wednesdays.
  - Their own pages say 10–12:30 and 3:30–5:30.
  - The Shuka Vana page also says it is temporarily closed for maintenance.
  - The site shows the homepage hours with a caveat.
- **Karya Siddhi Hanuman.**
  - The homepage lists Abhisheka at 7 AM and Aarti at 6 PM.
  - The temple page gives darshan hours of 6:30–12:30 and 5–8 (8:30 at weekends), plus the weekend laser show.
- **Sri Jayalakshmi Maata.** One page gives 1951 and two give 1953. The site uses 1953.
- **Shuka Vana species count.**
  - Most pages say 486 species.
  - The 2017 Guinness certificate says 468.
- **Nada Mantapa.** One page says 22 pillars in one place and 72 in another. The site uses 72.
- **Centre directory.** 86 of the 92 centres had published addresses. The centres page says the list is partial and links to the official directory.
