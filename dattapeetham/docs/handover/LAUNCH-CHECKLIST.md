# Launch checklist

Version 1.0.0. Tick each box as it is done. The steps are explained in
[DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md) and [DEPLOY.md](DEPLOY.md). Write a
name and a date next to anything that needs a decision.

Paths below are inside the project folder (`source\` in the package).

## Before launch

### Content: the Ashram confirms

- [ ] Every English page has been read and approved by the Ashram (the 16
      pages listed in [HANDOVER.md](HANDOVER.md), the "page not found" page
      included).
- [ ] The contact details are right: address, phone `+91 (0821) 2486 486`,
      e-mail `mail@dattapeetham.com` (they are set in `src/site.mjs`).
- [ ] The temple timings are right: 6:00 AM – 12:00 PM and 4:00 PM – 8:00 PM,
      daily, as on the Peetham's homepage. (How to change them:
      [MAINTENANCE.md](MAINTENANCE.md).)
- [ ] The upcoming events on the home page and the Events page are still
      right. The 2026 programme listed on the site ends on 23 December 2026;
      after that, add the next year's dates from the official calendar.

- [ ] **The music and the temple sounds** have been heard and approved by
      the Ashram, on a phone speaker and on headphones: open the site in a
      new private window, choose "Enter with flute music", listen for a few
      minutes, then scroll a page slowly (the bell and chimes). The flute is
      an original composition in Raga Mohanam; ideally a musician of the
      Peetham listens too. ([MAINTENANCE.md](MAINTENANCE.md), *Music and
      temple sounds*.)
- [ ] **The conch (shankha)** at the end of a page: switched off until the
      Ashram has listened to it. Decide: keep it off, or switch it on
      (`SHANKHA` in `src/features/devotion-sound.mjs`).

The official pages disagree on the points below (README.md, *For the Ashram
to confirm*). The site states them carefully and does not pick one silently.
For each, the Ashram confirms the current wording or gives the correct fact:

- [ ] **Shuka Vana and Bonsai Garden hours.** The homepage says 9–12 and
      3:30–6, closed Wednesdays. Their own pages say 10–12:30 and
      3:30–5:30. The Shuka Vana page also says it is temporarily closed for
      maintenance. The site shows the homepage hours with a caveat.
- [ ] **Karya Siddhi Hanuman.** The homepage lists Abhisheka at 7 AM and
      Aarti at 6 PM. The temple page gives darshan hours of 6:30–12:30 and
      5–8 (8:30 at weekends), plus the weekend laser show.
- [ ] **Sri Jayalakshmi Maata.** One page gives 1951 and two give 1953. The
      site uses 1953.
- [ ] **Shuka Vana species count.** Most pages say 486 species; the 2017
      Guinness certificate says 468.
- [ ] **Nada Mantapa.** One page says 22 pillars in one place and 72 in
      another. The site uses 72.
- [ ] **Centre directory.** 86 of the 92 centres had published addresses.
      The Centres page says the list is partial and links to the official
      directory.
- [ ] **Wording that looks like a slip**, kept as published:
  - [ ] The K R Nagar centre is listed at "Krishnaraja Raga Sagara"
        (probably Krishnarajanagara).
  - [ ] "Bhajans heal the mind and bhajan (food) heals body" (probably
        *bhojan*).
  - [ ] The glossary entry "bahiraga" (probably *bahiranga*).
  - [ ] "The Trivikrama Salagrama and the Manoratha Kurma Salagrama,
        weighing 300 kg": one stone or both?

### Content: the four languages

The translations are machine-assisted (translated, then edited for
consistent names and terms); no fluent speaker has yet reviewed them for the
Peetham. A fluent devotee in each language should read the site before
launch, especially the Sanskrit verses, Sri Swamiji's quotations and the
honorifics. Each language has its own notes:
the spelling decisions, the questions only the Ashram can answer, the pages
to read first, and how to make a correction.

| Language | Notes | Reviewer (TO FILL) | Date |
| --- | --- | --- | --- |
| Kannada (ಕನ್ನಡ) | `docs/i18n/kn-review.md` | | |
| Hindi (हिन्दी) | `docs/i18n/hi-review.md` | | |
| Tamil (தமிழ்) | `docs/i18n/ta-review.md` | | |
| Telugu (తెలుగు) | `docs/i18n/te-review.md` | | |

For each language:

- [ ] Kannada: the pages under "What to read first" have been read; the
      Ashram has answered the open questions; corrections are made.
- [ ] Hindi: the same.
- [ ] Tamil: the same.
- [ ] Telugu: the same.
- [ ] After corrections: `node tools/i18n-check.mjs kn` (and `hi`, `ta`,
      `te`) each report `0 problem(s)`, and `node build.mjs` shows
      `100% (0 missing, 0 rejected)` for every language.

### Photos

- [ ] The Ashram has looked at the photos, the portraits of Sri Swamiji
      above all, and approved them. Most of the site's photos come from small
      web copies on the Peetham's S3 bucket, enlarged with an AI enhancer
      (Real-ESRGAN): it sharpens them, but detail the small copy lost is
      estimated, not recovered.
- [ ] The Ashram has been asked for the camera originals of the hero and
      portrait photos; originals give truly sharp images. How they are used:
      `photos/originals/README.md` and `docs/PHOTOS.md`.

### Privacy and legal

- [ ] The Peetham's legal team has read
      [PRIVACY-DATA-INVENTORY.md](PRIVACY-DATA-INVENTORY.md) and decided what
      the privacy notice for the new site says.
- [ ] The footer's **Privacy**, **Terms** and **Disclaimer** links open the
      platform's pages (`/page/view/privacy-policy`,
      `/page/view/terms-and-conditions`, `/page/view/disclaimer`). The Peetham
      confirms that those pages also cover the new website, or updates them.
- [ ] **Visitor statistics decided.** The site has none, and its Content
      Security Policy blocks any. Either the Peetham is content with Search
      Console (no code on the site), or it asks the agency to add a service
      before launch, with an updated privacy notice: ______________________

### The existing platform

- [ ] The platform's new address is decided (for example
      `https://seva.dattapeetham.org`): ______________________
- [ ] The vendor has taken a full backup of the platform (database, uploaded
      files, configuration) and tested restoring it, before changing any
      setting.
- [ ] The DNS record for the platform's new name has been created (step 2
      of [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md)), not left for switch day.
- [ ] The platform answers at that address with a valid HTTPS certificate,
      and still answers at `www.dattapeetham.org` until the switch is stable.
- [ ] **The mobile apps.** The vendor confirms whether the Peetham's apps
      call `www.dattapeetham.org`. If they do, updated apps using the new
      address have reached users before the switch date.
- [ ] **HSTS on subdomains (the Peetham decides).** The site's HSTS header
      covers only `www.dattapeetham.org` and `dattapeetham.org`, not the
      platform's address or other names under `dattapeetham.org`. Leave it
      so, or, once every name people open in a browser works over
      `https://`, add `includeSubDomains` (step 2 of
      [DOMAIN-CUTOVER.md](DOMAIN-CUTOVER.md)). Decision: ______________
- [ ] The platform vendor has checked the settings that hold its address:
      base address, allowed hosts, payment gateway return and callback URLs,
      sign-in provider callbacks, cookie domain, app API address, e-mail and
      SMS templates.
- [ ] The vendor's list of the platform's public paths has been compared
      with `legacyPlatform` in `deploy/routes.mjs`; missing paths are added.
- [ ] A booking and a donation work at the new address (test mode, or a real
      one).

### The build

- [ ] `site.config.json` has `legacyPlatformUrl` set to the platform's new
      address.
- [ ] `node build.mjs --production` ran without errors, showed `26 platform
      rules → <the new address>` (or more, if paths were added), and 100%
      for every language.
- [ ] `npm test` ends with `# fail 0`.
- [ ] `node tools/check-external-links.mjs site`, run from an ordinary
      office or home connection, reports no failures. The "check by hand"
      addresses have been opened in a browser.
- [ ] A copy of the `source\` folder used for this build is kept.
- [ ] Vercel only: the `vercel.json` this build rewrote is committed with
      `site.config.json` ([DEPLOY.md](DEPLOY.md), Vercel).

### Hosting, DNS and certificate

- [ ] The host is chosen and the site is deployed there
      ([DEPLOY.md](DEPLOY.md)).
- [ ] The server check passed before the switch:
      `node deploy/test/verify-server.mjs ...` ends with `0 failed`.
- [ ] The HTTPS certificate for `www.dattapeetham.org` and `dattapeetham.org`
      is ready, or the plan for getting it at the switch is clear.
- [ ] The current DNS records for `www.dattapeetham.org` and
      `dattapeetham.org` are recorded (for rollback).
- [ ] Their TTL is lowered to 300 seconds, at least as long before the
      switch as the old TTL.
- [ ] Any `CAA` records in the zone allow the certificate authority the host
      uses. The `MX` (e-mail) and other records stay as they are.
- [ ] The switch date and time are agreed. The platform team will be
      reachable then.
- [ ] The person who can call a rollback is named: ______________________
- [ ] Google Search Console: a *Domain* property for `dattapeetham.org` is
      verified (by DNS TXT record), owned by a Google account the Peetham
      controls.
- [ ] The platform's certificate for `www.dattapeetham.org` stays valid for
      at least the week after the switch (the rollback window).
- [ ] The support contacts in [HANDOVER.md](HANDOVER.md) and
      `README-FIRST.html` are filled in, with the support period.

## Launch day

- [ ] The DNS values recorded for rollback are at hand, and the person who
      can call a rollback is reachable.
- [ ] DNS for `www.dattapeetham.org` and `dattapeetham.org` points at the
      new server; the platform's new name points at the platform.
- [ ] The certificate is valid for both names (no browser warning on
      `https://www.dattapeetham.org` or `https://dattapeetham.org`).
- [ ] `node deploy/test/verify-server.mjs --base=https://www.dattapeetham.org/ --no-canonical`
      ends with `0 failed`.
- [ ] `curl.exe -sI` on `http://dattapeetham.org/about.html`,
      `https://dattapeetham.org/about.html` and
      `http://www.dattapeetham.org/about.html` each answer `301` to
      `https://www.dattapeetham.org/about.html`.
- [ ] One real booking and one real donation, through to the receipt, with
      the platform team.
- [ ] Donate, Sign in, Store, Subscribe for updates, a concert booking, and
      the footer's Disclaimer, Privacy and Terms all open the platform at its
      new address.
- [ ] Old addresses: `/poojas` forwards to the platform;
      `/page/view/sri-bala-swamiji` opens the Sri Swamiji page; `/about`
      opens `/about.html`.
- [ ] Videos play; the maps show on Visit and Contact; the chant plays on
      Media.
- [ ] The language switcher and site search (Ctrl+K) work, on a phone and
      on a computer.
- [ ] The browser console shows no "Content Security Policy" errors.
- [ ] A page shared on WhatsApp shows its preview picture.
- [ ] The sitemap `https://www.dattapeetham.org/sitemap.xml` is submitted in
      Search Console; the home page is inspected and indexing requested.
- [ ] Devotees and staff are told about the new site (the Ashram's
      channels).

## The first week

- [ ] Every day: bookings and donations arrive on the platform as usual (ask
      the platform team).
- [ ] Every day: Search Console's *Pages* report, for new "Not found (404)"
      addresses. Old addresses that should lead somewhere are added to
      `oldSiteRedirects` in `deploy/routes.mjs`, then rebuilt and redeployed.
- [ ] Messages from devotees about the site are collected and answered.
- [ ] `node tools/check-external-links.mjs site` is run once more.
- [ ] The server check is run again after any change to the server.
- [ ] After a week without problems: the DNS TTL is raised back to its old
      value, and the platform team decides when to stop serving `www`.
- [ ] Someone is named to keep the events and timings current
      ([MAINTENANCE.md](MAINTENANCE.md)): ______________________
