# Avadhoota Datta Peetham website: start here

Version 1.0.0. This is the hand-over guide for the new website of Avadhoota
Datta Peetham, Mysuru. It is written for the Peetham's IT person. You do not
need to be a web developer to follow it.

The Peetham owns `www.dattapeetham.org`. The agency hands over the finished
product. The Peetham then puts it on its own server and connects its own
domain.

**One thing to know before anything else.** Today the Peetham's existing
platform runs on `www.dattapeetham.org`. That platform handles puja
bookings, donations, sign-in, the store and the concert bookings. The new
website does not replace it; it links to it. So when the new website takes
`www.dattapeetham.org`, the platform must first move to another address, for
example `seva.dattapeetham.org`. [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md)
explains how to do that without breaking bookings.

## The documents

| Read | When |
| --- | --- |
| **HANDOVER.md** (this file) | First. What the product is, what is in the package, the go-live plan |
| [DEPLOY.md](DEPLOY.md) | Putting the site on a server: Apache/cPanel, nginx, IIS, Netlify, Cloudflare, Vercel, plain static hosting |
| [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md) | Moving `www.dattapeetham.org` to the new site, in order, with a rollback plan |
| [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md) | Tick-boxes: before launch, launch day, the first week |
| [MAINTENANCE.md](MAINTENANCE.md) | Changing temple hours, events, photos, text and translations; rebuilding and redeploying |
| [PRIVACY-DATA-INVENTORY.md](PRIVACY-DATA-INVENTORY.md) | For your legal team: what the site stores in the browser and which other services the browser contacts |

The translation review notes are in `docs/i18n/` (one file per language).

## What the product is

A complete website of **16 pages in 5 languages**: English, Kannada (ಕನ್ನಡ),
Hindi (हिन्दी), Tamil (தமிழ்) and Telugu (తెలుగు). That is 80 HTML pages.

| Page | File | Covers |
| --- | --- | --- |
| Home | `index.html` | Live temple status, the day's timings, Sri Swamiji, the temples, a virtual tour, Nada Chikitsa, seva, the ashram map, global reach, the apps |
| About | `about.html` | The Peetham's story and principles, the campus, a day at the Ashram, Mysuru |
| Sri Swamiji | `sri-swamiji.html` | His life, His work, the Avatara timeline, honours, Sri Bala Swamiji |
| Guru Parampara | `guru-parampara.html` | The lineage, Adi Guru Dattatreya, Sri Jayalakshmi Maata, Datta Charitram |
| Darshan & Puja | `darshan.html` | Temple timings, each shrine, the sevas and links to book them, festivals |
| Events | `events.html` | The festival calendar with filters, programmes, concerts, TV telecast times |
| Teachings | `teachings.html` | Discourses, literature, Bhaktimala, Ask Dattaji, the A–Z glossary |
| Music | `music.html` | Nada Chikitsa, Raga Sagara concerts, the albums |
| Kriya Yoga | `kriya-yoga.html` | Datta Kriya Yoga and how to learn it |
| Seva | `seva.html` | Goshala, Veda Pathashala, SGS Hospital, Annadana, volunteering, donations |
| Visit | `visit.html` | Getting to Mysuru, the interactive ashram map, guidelines, stay and food |
| Attractions | `attractions.html` | Shuka Vana, the Bonsai Garden, Vishwam Museum, Nada Mantapa |
| Media | `media.html` | Videos, the chant, books, photo galleries, apps, social channels |
| Centres | `centers.html` | The world map and the centre directory |
| Contact | `contact.html` | Office contacts, writing in, visiting, FAQs |
| Not found | `404.html` | Shown for any address that does not exist, with search |

English pages are at the top of the site (`/about.html`). The other
languages are in folders: `/kn/about.html`, `/hi/about.html`,
`/ta/about.html`, `/te/about.html`.

**Features on every page:**

- A bar showing whether the temple is open now, in Mysuru time.
- A menu, a language switcher (the choice is remembered) and site search
  (press Ctrl+K).
- Calm motion that switches off when the visitor's device asks for reduced
  motion.
- Share previews for WhatsApp and social media, and search-engine data
  (sitemap, language links, structured data).

**What it is made of.** It is a *static* website: a folder of ready-made
HTML, CSS, JavaScript and image files. There is no database and no server
program. Any web server or static host can serve it. A small Node.js script
(`build.mjs`) produces the folder from the source files.

**Security and server behaviour come with it.** The site carries ready-made
configuration for Apache, IIS, Netlify and Cloudflare, and the project has
files for nginx and Vercel. They set security headers (including a Content
Security Policy), caching, redirects from the old site's addresses, and the
404 page. See [DEPLOY.md](DEPLOY.md).

## What is in the package

The package is a folder (and a zip of it) named
`dattapeetham-website-v1.0.0`:

| Item | What it is |
| --- | --- |
| `README-FIRST.html` | A one-page summary for anyone opening the package. Double-click to open it in a browser |
| `VERSION.txt` | Version, build date, the two addresses the site was built for, pages and translation coverage |
| `website\` | **The finished website.** Upload the *contents* of this folder to your web server. It includes hidden files (`.htaccess`) |
| `preview\` | Look at the site on your own computer: `Start-Preview.cmd` (Windows), `start-preview.sh` (macOS, Linux), `serve.mjs` |
| `server-configs\` | Copies of each server's configuration file, for reference (see `server-configs\README.txt`) |
| `docs\` | These documents, and the translation review notes in `docs\i18n\` |
| `source\` | The project, to edit and rebuild the site. Commands in these documents are run inside this folder |

The agency may also send `dattapeetham-website-v1.0.0-deploy-only.zip`. It
holds only the website files, at the top of the zip, ready to upload.

### Checking the download

Both zips are far larger than e-mail allows, so they travel by a
file-sharing link or on a USB drive. With them, outside the zips, comes
`SHA256SUMS.txt`: one line per zip, holding its SHA-256 fingerprint. A copy
that arrived complete and unchanged has the same fingerprint. In
PowerShell, in the folder that holds the zip:

```powershell
Get-FileHash .\dattapeetham-website-v1.0.0.zip -Algorithm SHA256
```

The `Hash` it prints must be the one on that zip's line in
`SHA256SUMS.txt` (PowerShell prints capital letters; the letters' case does
not matter). On Linux, in that folder: `sha256sum -c --ignore-missing
SHA256SUMS.txt`; on macOS, with both zips there: `shasum -a 256 -c
SHA256SUMS.txt`. Each zip must show `OK`. If a fingerprint differs, ask for
the file again.

**Check `VERSION.txt` first.** It shows the two addresses the website was
built for:

- *Site address*: where the new site is served (`https://www.dattapeetham.org`).
- *Existing platform*: where bookings, donations, sign-in and the store live.

If both are the same, `VERSION.txt` says WARNING. Then the `website\` folder
is fine for previewing and testing, but **not ready to take over the
domain**: its booking links would point at the new site itself. Rebuild it
with the platform's new address first (step 3 below, and
[DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), step 3).

Inside `source\`, the parts you are most likely to touch:

| Path (in `source\`) | What it is |
| --- | --- |
| `site.config.json` | The two addresses: this site, and the existing platform |
| `src\site.mjs` | Facts used everywhere: address, phone, e-mail, opening hours, the platform links |
| `src\data.mjs` | Shared content: timings, the timeline, apps, centres |
| `src\pages\` | One file per page |
| `src\i18n\` | The translations |
| `deploy\` | Server rules (`routes.mjs`), nginx, Apache and Cloudflare files, the server tests |
| `build.mjs` | Builds the site into `site\` |
| `site\` | Appears after you run a build: the freshly built website |

## Quick start: preview the site on Windows

1. Install **Node.js 20 or newer** (the LTS version) from
   <https://nodejs.org>, with the default options. In PowerShell you can
   also run `winget install OpenJS.NodeJS.LTS`.
2. Unzip the package, for example to your Desktop (right-click the zip,
   then *Extract All*). The preview does not run from inside the zip; if
   you double-click it there, its window says so.
3. Open the `preview` folder and double-click **`Start-Preview.cmd`**. If
   Windows shows *Windows protected your PC* (it may, for a file that came
   from the internet), choose *More info*, then *Run anyway*.
4. A black window opens and your browser shows the site. The window also
   lists an address to open on a phone or tablet on the same Wi-Fi. If it
   lists several (a computer can have wired and wireless connections, and
   virtual adapters for WSL, Hyper-V or Docker), try them in order:
   adapters that look virtual are listed last.
5. Keep the window open while you look around. Close it (or press Ctrl+C in
   it) to stop.

The preview serves the `website` folder much as the live servers do: it
reads the site's own `_headers` and `_redirects`, so the redirects, headers
and "page not found" page behave the same.
It starts at `http://localhost:8080/`, or the next free port if 8080 is in
use.

If Node.js is missing or too old, the window says so. Without Node.js you can
still double-click `website\index.html`: the pages open, but site search does
not work that way.

**macOS or Linux:** in a terminal, run `./start-preview.sh` inside the
`preview` folder.

Booking, donation, sign-in and store links in the preview open the
Peetham's existing platform on the internet, as they will on the live site.

## Going live in five steps

| Step | What | Who | Details |
| --- | --- | --- | --- |
| 1 | **Review and approve.** Look at every page in every language. Native speakers read their language. The Ashram answers the open questions | The Peetham | [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md) |
| 2 | **Move the existing platform to its own address** (for example `seva.dattapeetham.org`) and check that bookings and payments work there | The platform's own team or vendor | [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), step 2 |
| 3 | **Rebuild for production** with that address in `site.config.json`: `node build.mjs --production` | Your IT person, or the agency | [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), step 3 |
| 4 | **Deploy and switch the domain**: upload the site, get the HTTPS certificate, point DNS at the new server | Your IT person | [DEPLOY.md](DEPLOY.md), [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), steps 4–6 |
| 5 | **Check, then tell search engines**: run the automatic server check, click through the booking links, submit the sitemap | Your IT person | [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), steps 7–8 |

Step 2 must be finished before step 4. Everything else can be prepared in
advance.

## What stays on the existing platform, and why

The new website is a static site. It deliberately has no database, no
accounts and no payment handling. These stay on the Peetham's existing
platform, and the new site links to them:

| What | Example address on the platform |
| --- | --- |
| Puja and seva bookings | `/poojas?ashram_id=4` |
| Donations | `/donations?ashram_id=4` |
| Sign-in and subscriptions | `/login`, `/subscriptions`, `/subscribe` |
| The store | `/store` |
| Raga Sagara concert bookings | `/myragasagaraconcerts` |
| The privacy policy, terms and disclaimer | `/page/view/privacy-policy`, `/page/view/terms-and-conditions`, `/page/view/disclaimer` |
| The full calendar, speeches, photos, videos, downloads and other old pages the new site cites as sources | `/calendar`, `/speeches`, `/photos`, `/page/view/…` |

Why:

- **Money and personal data.** Bookings, donations and accounts handle
  payments and devotees' personal details. They need a server, a database
  and a payment gateway. The platform already does this, and its records
  (bookings, donors, accounts) live there. Rebuilding it would mean moving
  that data and setting up payments again.
- **Legal text is the Peetham's.** The privacy policy, terms and disclaimer
  are the Peetham's own legal documents. The agency does not write legal
  text, so the footer links to the platform's pages. For a privacy notice
  for the new site, see
  [PRIVACY-DATA-INVENTORY.md](PRIVACY-DATA-INVENTORY.md).
- **One place for each thing.** The platform stays the single record of
  bookings and donations. The new site never collects payment details, and
  it never shows a form that looks as if it does.

Every one of these links is built from one setting, `legacyPlatformUrl` in
`site.config.json`. Change it, rebuild, and every link follows.

The contact form on the new site does not send anything to a server either.
It opens the visitor's own e-mail app with the message ready, addressed to
`mail@dattapeetham.com`.

## Support and contacts

> **TO FILL (agency):** the agency fills in this section before the
> hand-over. Nothing here may be guessed.

| Role | Name | E-mail | Phone | Hours |
| --- | --- | --- | --- | --- |
| Agency project lead | TO FILL | TO FILL | TO FILL | TO FILL |
| Agency technical contact (build, deploy, server files) | TO FILL | TO FILL | TO FILL | TO FILL |
| Peetham IT contact | TO FILL | TO FILL | TO FILL | TO FILL |
| Existing platform vendor (bookings, donations, sign-in) | TO FILL | TO FILL | TO FILL | TO FILL |
| Domain and DNS provider for `dattapeetham.org` | TO FILL | TO FILL | TO FILL | TO FILL |
| Web host for the new site | TO FILL | TO FILL | TO FILL | TO FILL |

- Support period and what it covers: **TO FILL**
- How to report a problem (e-mail, ticket system): **TO FILL**
- Where the source repository lives, and who has access: **TO FILL**

## What it needs to run

Prices depend on the host and the plan the Peetham chooses; these documents
do not quote any.

| Need | What |
| --- | --- |
| **Hosting** | Any web server or static host that serves files over HTTPS (see [DEPLOY.md](DEPLOY.md)). No database, and nothing to install on the server: no Node.js, PHP or other server-side code. |
| **Space** | Under 1 GB. `VERSION.txt` gives the exact size of the `website` folder; almost all of it is photos. |
| **Traffic** | Measured on version 1.0.0, from the site's own server: a visitor who reads one page to the end downloads about 0.5 to 2.5 MB (desktop; less on a phone). The home page is the largest. Photos are kept by the browser for 30 days and CSS and JavaScript for a year, so returning visitors download much less. |
| **Certificate** | One HTTPS certificate covering `www.dattapeetham.org` and `dattapeetham.org`. Let's Encrypt issues them free of charge; many hosts set one up themselves. |
| **Outside services** | Google Fonts, the Google Maps embed (Visit and Contact pages) and the YouTube player. The site uses them without any account or API key. What each one receives is in [PRIVACY-DATA-INVENTORY.md](PRIVACY-DATA-INVENTORY.md). |
| **The existing platform** | Keeps running with its own vendor, as today, at a new address of its own (which needs its own HTTPS certificate). |
| **Upkeep** | Someone keeps events and temple hours current, then rebuilds and uploads ([MAINTENANCE.md](MAINTENANCE.md)). The events listed today end on 23 December 2026; adding the next year's calendar is a job for a developer. |
| **A computer for changes** | Node.js 20 or newer on any Windows, macOS or Linux computer, to preview, rebuild or run the checks. The build needs nothing else (no `npm install`). The browser checks also need `npm install` and `npx playwright install chromium` in `source\`. |

## What the Peetham decides

Nobody else can settle these. Each has a line in
[LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).

| Decision | Who |
| --- | --- |
| The platform's new address (for example `seva.dattapeetham.org`), who moves the platform, and when | The Peetham, with the platform's vendor |
| Where the new site is hosted | The Peetham, with its IT person |
| The switch date and time, and who may call a rollback | The Peetham |
| The answers to the open content questions (*For the Ashram to confirm* in the checklist) | The Ashram |
| A fluent reviewer for each of Kannada, Hindi, Tamil and Telugu. The translations are machine-assisted; no fluent speaker has yet reviewed them for the Peetham | The Peetham |
| The privacy notice for the new site, and whether the platform's privacy, terms and disclaimer pages also cover it | The Peetham's legal team |
| HSTS on every name under `dattapeetham.org` (`includeSubDomains`). Off at hand-over, because other subdomains (mail, webmail, older services) may not work over `https://`; once browsers have it, they keep it for up to two years ([DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md), step 2) | The Peetham, with its IT person |
| Visitor statistics. The site has none (see [PRIVACY-DATA-INVENTORY.md](PRIVACY-DATA-INVENTORY.md)). Search Console shows search traffic without any code on the site. Adding a statistics service means a code change, a Content Security Policy change and an updated privacy notice | The Peetham |
| The photos: approve the enhanced copies (see *The photos*, below), and send camera originals where possible | The Ashram |
| Who keeps the events and timings current, and who supports the site after the hand-over | The Peetham, with the agency |

## Third-party components

These ship inside the website or are loaded by it. The licence terms are the
publishers'; the agency confirms them before the hand-over.

| Component | Where | Terms |
| --- | --- | --- |
| GSAP 3.12.5 and ScrollTrigger 3.12.5 (animation) | `src/assets/vendor/`, copied into the site | The file headers say: "Subject to the terms at https://gsap.com/standard-license" |
| Lenis (smooth scrolling) | `src/assets/vendor/lenis.min.js` | **TO CONFIRM (agency):** the file carries no licence header |
| Web fonts: Cormorant Garamond, Marcellus, Inter, Noto Serif Devanagari, Noto Sans and Noto Serif Kannada, Noto Sans Devanagari, Tamil and Telugu | Served by Google Fonts | Google Fonts' terms; **TO CONFIRM (agency)** |
| Google Maps embed, YouTube player | Loaded from Google | Google's terms |

**The photos** are the Peetham's own, from its storage bucket. Most of them
were small web copies, so the agency enlarged them with an AI enhancer
(Real-ESRGAN) to make sharp copies for large screens. An enhancer cannot
recover detail the small copy lost; it estimates it. The Ashram should look
at the photos, the portraits of Sri Swamiji above all, and send the camera
originals where it can; the photo tool then uses them instead (a job for
the agency or a developer). How this works: `docs/PHOTOS.md`.
