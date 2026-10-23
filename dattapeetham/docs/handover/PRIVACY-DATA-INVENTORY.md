# Privacy data inventory

Version 1.0.0. **This is an inventory, not a privacy policy.** It lists, as
facts checked against the code, what the new website stores in visitors'
browsers and which other services a visitor's browser contacts, and when.
It is written for the Peetham's legal team, to help them write the site's
privacy notice. It gives no legal advice and makes no legal judgement.

The privacy policy, terms and disclaimer the site links to are the existing
platform's pages (`/page/view/privacy-policy`,
`/page/view/terms-and-conditions`, `/page/view/disclaimer`). The agency has
not written or changed legal text.

## How this was checked

On 23 October 2026, against version 1.0.0:

- **The code was read.** Every script in `src/assets/js/` and the page
  frame in `src/layout.mjs` was searched for browser storage
  (`localStorage`, `sessionStorage`, IndexedDB, Cache Storage, service
  workers), cookies (`document.cookie`), and network calls (`fetch`,
  `XMLHttpRequest`, beacons, WebSockets). The server files were checked for
  `Set-Cookie`.
- **The built site was crawled** in a headless Chromium browser: all 80
  pages (16 pages in 5 languages), plus two unknown addresses, each loaded
  and scrolled to the end. Every request to another host was recorded. Then the
  interactive parts were used: playing videos, playing the chant, opening a
  photo, switching language, searching. Cookies and storage were read
  afterwards.
- **Limits.** The test environment could not reach Google Maps or YouTube,
  so what those services do *inside* their embedded frames (their own
  requests and cookies) could not be observed. They are listed below as
  "governed by the provider". The hosting company's own behaviour (server
  logs, any cookies a CDN adds) is outside the product and was not checked.

A second, independent crawl on the same day (a production build with the
platform on its own host; the 75 pages of the sitemap and two unknown
addresses; then a video, the chant, search and the language switcher)
found the same: the hosts in section 2, the two values in section 1, and no
cookies.

How to repeat the check in a normal browser: open the site, press F12, and
look at *Application → Storage / Cookies* and at the *Network* tab
(filter "third-party", or sort by domain), on the pages named below.

## 1. What the site stores in the browser

| Name | Where | Set when | Value | Purpose | How long |
| --- | --- | --- | --- | --- | --- |
| `dp-lang` | `localStorage` | Only when the visitor picks a language in the language switcher | `en`, `kn`, `hi`, `ta` or `te` | On later visits, opens pages in that language | Until the visitor clears the site's data |
| `dp-intro` | `sessionStorage` | On the first page viewed in a browser tab | `1` | Shows the opening intro animation only once per visit | Until the tab or window is closed |

Nothing else is stored:

- **No cookies** are set by the site's code or by its server
  configuration. After the full crawl, the browser held no cookies at all
  (but see the limits above for the embedded maps and videos).
- No IndexedDB, no Cache Storage and no service worker.
- Both values stay in the visitor's browser. The site has no server code and
  never sends them anywhere.
- The language memory can be bypassed by adding `?lang=keep` to an address.
  The "page not found" page never redirects by it.

*For completeness:* the project also contains a devotional sound feature
(`src/assets/js/devotion-sound.js`). If it were used, it would store
`dp-sound` (`localStorage`: whether music and temple sounds are on, and the
volume) and `dp-sound-pos` (`sessionStorage`: where the music was, to carry
on across pages). **In version 1.0.0 no page loads it**, so neither is ever
set. If a later version switches it on, this inventory must be updated.

## 2. Other services the browser contacts

Photos, icons, scripts, styles and the site's own search data are served by
the site itself. These are the only other hosts contacted without a click,
or by the embedded players:

| Host | Operator | What | Pages | When |
| --- | --- | --- | --- | --- |
| `fonts.googleapis.com` | Google | The web-font stylesheets (Cormorant Garamond, Marcellus, Inter, Noto Serif Devanagari for the ॐ sign; on language pages also Noto Sans Devanagari, Tamil or Telugu, or Noto Sans and Noto Serif Kannada) | Every page, every language | On page load |
| `fonts.gstatic.com` | Google | The font files | Every page, every language | On page load |
| `www.google.com` | Google | The embedded Google Map | `visit.html` (section "The way to Datta Nagar") and `contact.html` (section "Find your way to Datta Nagar"), every language | **Without a click**, when the visitor scrolls near the map (the frame is lazy-loaded) |
| `www.youtube-nocookie.com` | Google (YouTube) | The video player | Home, Sri Swamiji, Guru Parampara, Music, Attractions, Media | **Only after the visitor presses play.** Before that, each video is a poster image served by the site |
| `dattapeetham.s3.amazonaws.com` | Amazon Web Services (the Peetham's own storage bucket) | The chant audio (MP3) | `media.html` | Only after the visitor presses play (the player is set to load nothing beforehand) |
| `dattapeetham.s3.amazonaws.com` | Amazon Web Services | PDF books and the chant's download link | `media.html` | Only when the visitor clicks the download |
| `dattapeetham.s3.amazonaws.com` | Amazon Web Services | A *preconnect* hint: the browser may open a connection on page load (name lookup and secure handshake), but requests no file | Every page | On page load |

What each of these receives, as with any web request: the visitor's IP
address, browser type and language, and the address requested. The site
sends `Referrer-Policy: strict-origin-when-cross-origin`, so for these
requests the `Referer` header carries at most the site's own address
(`https://www.dattapeetham.org/`), not the page. **Exception:** the Google
Map frames are given `referrerpolicy="no-referrer-when-downgrade"`, so
Google receives the full address of the page with the map (for example
`https://www.dattapeetham.org/visit.html`).

Inside the map and video frames, Google's own code then loads further files
from Google's servers and may set its own cookies or storage. That happens
under Google's terms and privacy policy, not under the site's control; the
site's Content Security Policy does not govern what runs inside those
frames.

The Content Security Policy (in `deploy/routes.mjs`) allows exactly these
outside hosts: `fonts.googleapis.com` (styles), `fonts.gstatic.com` (fonts),
`dattapeetham.s3.amazonaws.com` (images and audio), and
`www.youtube-nocookie.com` and `www.google.com` (frames). A browser refuses
anything else. A test (`tests/server-configs.test.mjs`) checks that the
policy and the pages match.

## 3. Links that leave the site (only when clicked)

These are ordinary links. Nothing is contacted until the visitor clicks.
When they do, the other site receives what any visit sends (IP address,
browser, and the site's address as `Referer`).

| Where they go | What for |
| --- | --- |
| The Peetham's existing platform (`www.dattapeetham.org` today; its new address after the move) | Puja bookings, donations, sign-in, subscriptions, the store, concert bookings, the legal pages, the full calendar and archives |
| `www.youtube.com`, `www.facebook.com`, `www.instagram.com`, `x.com`, `www.twitter.com`, `vimeo.com` | The Peetham's channels and pages |
| `apps.apple.com`, `play.google.com` | The Peetham's apps |
| `open.spotify.com`, `music.apple.com` | The albums |
| `www.google.com/maps` | Directions |
| `wa.me`, `t.me`, `www.facebook.com/sharer` | **Share buttons.** The link itself carries the page's address and title to WhatsApp, Telegram or Facebook |
| `www.dattakriyayoga.org`, `www.sgsragasagara.com`, `www.japanragasagara.com`, `www.bhajanmala.com`, `ragaraginistore.com`, `www.vedanidhi.in`, `www.sgsgitaindia.org`, `www.sgsgitafoundation.org`, `www.sdvtemple.in`, `www.museumsofindia.org`, `starofmysore.com`, `survey.tataji.app` | Related sites and sources cited on the pages |
| `dattapeetham.s3.amazonaws.com` | Downloads (see above) |

## 4. Forms and other inputs

- **Contact form** (`contact.html`): name, e-mail, country code, phone,
  purpose and message. **Nothing is sent to any server.** When the visitor
  presses send, the page composes an e-mail (subject and body from the
  fields) and opens the visitor's own e-mail app, addressed to
  `mail@dattapeetham.com`. The message goes only if the visitor then presses
  Send in their e-mail app; the page says so beside the form. A "copy the
  message" button puts the text on the visitor's clipboard instead. Without
  JavaScript, the form falls back to a plain `mailto:` form.
- **"Find your day"** (`darshan.html`, the Date of Birth Pillars): the
  visitor picks a day and month to find a pillar. It runs in the page only;
  nothing is stored or sent.
- **Site search** (Ctrl+K): the search runs in the browser, over an index
  file downloaded from the site itself (on a language page, a query in
  Latin letters also loads the English index, from the site itself too).
  What the visitor types is not sent anywhere.
- **Copy buttons** (`contact.html`): copy a phone number, e-mail or address
  to the visitor's clipboard.
- **The live temple status** is worked out in the browser from the
  visitor's own clock, converted to Mysuru time. No time service is called.

## 5. What the site does not do

- No analytics, statistics or tracking scripts, no advertising, no social
  media "pixels". (None is in the code; none is allowed by the Content
  Security Policy.)
- No accounts, sign-in or payments on the new site. Those are on the
  existing platform, under its own privacy policy.
- No access to camera, microphone or location: the site's
  `Permissions-Policy` header switches them off.
- No notifications and no background activity (no service worker).

## 6. Outside the product: for the Peetham to check

- **Server logs.** Web servers and hosting companies normally record each
  request (IP address, time, address requested, browser) in access logs, by
  their own settings and for their own retention period. Check with the
  host, or in the server configuration, what is kept and for how long.
- **CDN or hosting cookies.** Some hosts and CDNs add their own cookies or
  headers (for example for bot protection). Check the host's documentation
  once the site is deployed, using the browser check above.
- **The existing platform** collects personal data for bookings,
  donations, accounts and the store. That is covered by the platform's own
  privacy policy, not by this inventory.
- **E-mail.** Messages devotees send through their own e-mail app arrive at
  `mail@dattapeetham.com` and are handled by the Peetham's e-mail system.

If the site changes (a new embedded service, analytics, the sound feature),
this inventory must be updated before that version goes live.
