// How any web server must serve the Datta Peetham site: security headers,
// cache rules, redirects, the hand-off to the Peetham's existing platform and
// the 404 page. This file is the single source of truth and holds plain data
// only.
//
//   tools/server-configs.mjs        turns it into .htaccess (Apache / cPanel),
//                                   nginx, _headers + _redirects (Netlify /
//                                   Cloudflare), web.config (IIS) and vercel.json
//   deploy/test/verify-server.mjs   checks a running server against it
//
// Change a rule here, then run `node tools/server-configs.mjs site` (the build
// does this too) so every server's file follows.

export const VERSION = '1.0.0';

// Language versions live in these sub-folders; English is at the root.
export const LANGUAGES = ['kn', 'hi', 'ta', 'te'];

// Unknown paths, at any depth and in any language folder, get this page with
// HTTP status 404. It is the English page: its links are root-absolute, so it
// works at /kn/a/b/c as well as at /x.
export const NOT_FOUND_PAGE = '/404.html';

// ---------------------------------------------------------------------------
// Security headers, sent on every response (pages, assets, redirects, 404s).
// Carried over unchanged from the original vercel.json.
// ---------------------------------------------------------------------------
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' mailto:",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://dattapeetham.s3.amazonaws.com https://dev-dattapeetham.s3.amazonaws.com https://i.ytimg.com",
    'frame-src https://www.youtube-nocookie.com https://www.google.com',
    "connect-src 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
};

// ---------------------------------------------------------------------------
// Caching. The first rule whose prefix and extension match the request path
// wins; anything no rule matches gets `defaultCache`.
// ---------------------------------------------------------------------------
export const CACHE = {
  // Store, but ask the server (ETag / Last-Modified) before every reuse.
  revalidate: 'no-cache',
  // CSS and JS are referenced with a content hash (?v=…), so a changed file
  // gets a new URL and the old one can be kept forever.
  immutable: 'public, max-age=31536000, immutable',
  // Photos, icons and fonts: 30 days.
  media: 'public, max-age=2592000',
};

export const cacheRules = [
  {
    name: 'versioned code',
    prefix: '/assets/',
    extensions: ['css', 'js', 'mjs'],
    value: CACHE.immutable,
    // Only while every page references these files with a content hash. If a
    // build ever ships unversioned references, tools/server-configs.mjs drops
    // this rule (they fall back to `defaultCache`) rather than pin stale code
    // in visitors' browsers for a year.
    versionedOnly: true,
  },
  {
    name: 'media',
    prefix: '/assets/',
    extensions: ['webp', 'avif', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'otf'],
    value: CACHE.media,
  },
];

// HTML, *.json (search indexes), sitemap.xml, robots.txt, site.webmanifest,
// root icons and everything else.
export const defaultCache = CACHE.revalidate;

// MIME types some servers lack or get wrong. Every generated config declares
// them explicitly.
export const contentTypes = {
  webmanifest: 'application/manifest+json',
  webp: 'image/webp',
  json: 'application/json',
  svg: 'image/svg+xml',
  woff2: 'font/woff2',
};

// ---------------------------------------------------------------------------
// Old-site URLs → the new pages. Permanent, query string kept, #fragment
// added after it. Taken from the original vercel.json (October 2026), with
// destinations in the .html form the canonical URLs use.
// ---------------------------------------------------------------------------
export const REDIRECT_STATUS = 301;

export const oldSiteRedirects = [
  ['/sriswamiji', '/sri-swamiji.html'],
  ['/page/view/sri-swamiji', '/sri-swamiji.html'],
  ['/page/view/sri-ganapathy-sachchidananda-swamiji', '/sri-swamiji.html'],
  ['/page/view/sri-bala-swamiji', '/sri-swamiji.html#bala-swamiji'],
  ['/page/view/sri-swamijis-avatara-timeline', '/sri-swamiji.html#timeline'],
  ['/page/view/awards-honors', '/sri-swamiji.html#honours'],
  ['/page/view/datta-peetha-guru-parampara', '/guru-parampara.html'],
  ['/page/view/adi-guru-dattatreya', '/guru-parampara.html#dattatreya'],
  ['/page/view/datta-avadhoota', '/centers.html#kshetras'],
  ['/page/view/sri-jayalakshmi-maata', '/guru-parampara.html#jayalakshmi-maata'],
  ['/dattapeetham', '/about.html'],
  ['/page/view/about-us', '/about.html'],
  ['/page/view/ashram-life', '/about.html#ashram-life'],
  ['/page/view/ashram-shrines', '/darshan.html'],
  ['/page/view/kaalaagni-shamana-dattatreya', '/darshan.html#prayer-hall'],
  ['/page/view/rajarajeshwari-temple', '/darshan.html#rajarajeshwari'],
  ['/page/view/sri-datta-venkateshwara-temple', '/darshan.html#venkateshwara'],
  ['/page/view/karya-siddhi-hanuman-temple', '/darshan.html#hanuman'],
  ['/page/view/shuka-vana', '/attractions.html#shuka-vana'],
  ['/page/view/bonsai-garden', '/attractions.html#bonsai'],
  ['/page/view/vishwam-museum', '/attractions.html#vishwam'],
  ['/page/view/nada-mantapa', '/attractions.html#nada-mantapa'],
  ['/page/view/sgs-hospital', '/seva.html#hospital'],
  ['/page/view/sgs-veda-pathashala', '/seva.html#pathashala'],
  ['/page/view/social-activities', '/seva.html'],
  ['/page/view/contribution-towards-nature', '/seva.html#nature'],
  ['/page/view/sdhs-volunteers', '/seva.html#volunteer'],
  ['/page/view/bhajans-and-healing-music', '/music.html'],
  ['/page/view/datta-kriya-yoga', '/kriya-yoga.html'],
  ['/page/view/datta-kriya-yoga-international-center', '/kriya-yoga.html#dkyic'],
  ['/page/view/guidelines-for-visitors', '/visit.html#guidelines'],
  ['/page/view/devotee-etiquette', '/visit.html#etiquette'],
  ['/page/view/datta-peetham-glossary', '/teachings.html#glossary'],
  ['/page/view/literary-contributions', '/teachings.html#literature'],
  ['/page/view/sanatana-dharma-parirakshana', '/teachings.html'],
  ['/page/view/ask-dattaji', '/teachings.html#ask-dattaji'],
  ['/page/view/social-media-pages', '/media.html#social'],
  ['/page/view/dattapeetham-telecast-timing-of-sri-swamijis-programs', '/events.html#tv'],
  ['/shodasha-datta-kshetras', '/centers.html#kshetras'],
  ['/navanatha-datta-kshetras', '/centers.html#navanatha'],
  ['/ashrams/avadhoota-datta-peetham-mysore-main', '/centers.html#mysuru'],
];

// ---------------------------------------------------------------------------
// Page URLs without .html. Canonical URLs keep the .html form, so for every
// page (except the 404 page) in every language:
//   /about → /about.html     /kn/about → /kn/about.html
//   /index → /               /kn/index → /kn/
//   /kn    → /kn/
// Permanent, query string kept. The page list comes from the build.
// ---------------------------------------------------------------------------
export const pageUrls = {
  status: 301,
  exclude: ['404.html'],
};

// ---------------------------------------------------------------------------
// The Peetham's existing platform: puja booking, donations, the store,
// sign-in, subscriptions, concert bookings, legal pages and the old pages the
// site cites. When the platform runs on another host than this site
// (legacyPlatformUrl in site.config.json), requests for these paths that
// still arrive here (bookmarks, search results, old e-mails, apps) are sent
// to the same path and query on the platform's host.
//
// 302, not 301: the Peetham may still move the platform again, and browsers
// cache a 301 indefinitely.
//
// When the platform is on the SAME host as this site, no such rule is
// written: it would redirect to itself forever.
//
// Rules above win: /page/view/about-us still goes to /about.html, /events
// stays the new Events page, /navanatha-datta-kshetras the Centres page.
// ---------------------------------------------------------------------------
export const legacyPlatform = {
  status: 302,
  // Each covers the path itself and everything below it (/poojas, /poojas/…).
  paths: [
    // links in src/site.mjs
    '/poojas',
    '/donations',
    '/store',
    '/subscriptions',
    '/subscribe',
    '/login',
    '/calendar',
    '/speeches',
    '/sri-swamiji-says',
    '/photos',
    '/videos',
    '/downloads',
    '/articles',
    '/dailyposts',
    '/mobileapps',
    '/ashramcenters',
    '/myragasagaraconcerts',
    '/techsupport',
    '/facebook',
    '/youtube',
    '/websites',
    // links in the page modules (darshan, media)
    '/hanuman-chalisa-form',
    '/releases',
    // linked from the old homepage (src/legacy-homepage.html)
    '/liveupdates',
  ],
  // Everything below these, but not the bare path. Old pages with no new
  // equivalent, including the legal pages (privacy, terms, disclaimer).
  prefixes: ['/page/view/', '/ashrams/'],
};
