// Site-wide facts, links and navigation. Facts were taken from the live
// dattapeetham.org (October 2026). Change a fact here and every page follows.

import { readFileSync } from 'node:fs';

// ---------- the two addresses (site.config.json) ----------
// siteUrl            where this website is served (canonical, sitemap, JSON-LD)
// legacyPlatformUrl  where the existing platform runs (bookings, donations,
//                    store, sign-in, legal pages, cited source pages)
// Highest first: --site-url= / --legacy-url= on the command line, then the
// DP_SITE_URL / DP_LEGACY_URL environment variables, then site.config.json.
export const CONFIG_FILE = new URL('../site.config.json', import.meta.url);
const configError = (msg) => Object.assign(new Error(msg), { name: 'ConfigError' });
const FIELDS = {
  siteUrl: { flag: '--site-url', env: 'DP_SITE_URL' },
  legacyPlatformUrl: { flag: '--legacy-url', env: 'DP_LEGACY_URL' },
};

// An https origin, normalised: lower-case host, default port and trailing
// slash dropped. Paths, queries, fragments and credentials are refused: the
// site is served from the root of its host, and the platform's links are
// built as `${address}/poojas?...`.
export function normaliseUrl(value, name = 'URL') {
  const raw = String(value ?? '').trim();
  const eg = name === 'legacyPlatformUrl' ? 'https://seva.dattapeetham.org' : 'https://www.dattapeetham.org';
  if (!raw) throw configError(`${name} is empty: give an https address such as ${eg}`);
  let u;
  try { u = new URL(raw); } catch { throw configError(`${name} "${raw}" is not an absolute URL: give an https address such as ${eg}`); }
  if (u.protocol !== 'https:') throw configError(`${name} "${raw}" must use https:// (for example ${eg})`);
  if (!u.hostname) throw configError(`${name} "${raw}" has no host name`);
  if (u.username || u.password) throw configError(`${name} "${raw}" must not contain a user name or password`);
  if (u.search || u.hash || /[?#]/.test(raw)) throw configError(`${name} "${raw}" must not contain a query or fragment`);
  if (u.pathname.replace(/\/+$/, '') !== '') throw configError(`${name} "${raw}" must be a bare address with no path (for example ${eg}): the site is served from the root of its host`);
  return u.origin;
}

function flagValue(argv, flag) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith(flag + '=')) return argv[i].slice(flag.length + 1);
    if (argv[i] === flag) {
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) return argv[i + 1];
      throw configError(`${flag} needs an address, e.g. ${flag}=https://seva.dattapeetham.org`);
    }
  }
  return undefined;
}

// Pure, so the tests can check precedence and validation. `file` may be a
// path/URL to read, or the parsed object itself.
export function resolveConfig({ argv = process.argv.slice(2), env = process.env, file = CONFIG_FILE } = {}) {
  let json = {};
  let fileError = null;
  if (file && typeof file === 'object' && !(file instanceof URL)) json = file;
  else {
    try { json = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fileError = e; }
  }
  const out = { sources: {} };
  for (const [key, { flag, env: envName }] of Object.entries(FIELDS)) {
    const cli = flagValue(argv, flag);
    const fromEnv = env[envName];
    let value, source;
    if (cli !== undefined) { value = cli; source = flag; }
    else if (fromEnv !== undefined && fromEnv !== '') { value = fromEnv; source = envName; }
    else if (json[key] !== undefined) { value = json[key]; source = 'site.config.json'; }
    else if (fileError) throw configError(`site.config.json could not be read (${fileError.message}) and ${key} was not given by ${flag}= or ${envName}`);
    else throw configError(`site.config.json has no "${key}" (and neither ${flag}= nor ${envName} is set)`);
    out[key] = normaliseUrl(value, key);
    out.sources[key] = source;
  }
  const site = new URL(out.siteUrl), legacy = new URL(out.legacyPlatformUrl);
  out.sameHost = site.host === legacy.host;
  // www.example.org and example.org are different hosts, but one usually
  // redirects to the other, which would send platform links to this site.
  out.siblingHost = !out.sameHost && site.host.replace(/^www\./, '') === legacy.host.replace(/^www\./, '');
  return Object.freeze(out);
}

export const config = resolveConfig();

export const OFFICIAL = config.legacyPlatformUrl;
export const S3 = 'https://dattapeetham.s3.amazonaws.com/';
export const IMG = `${S3}homepage_assets/site_1/front_page_images/`;
export const PAGE_IMG = `${S3}content/page_images/`;
export const KSHETRA_IMG = `${S3}images/site_assets/peetham-ashrams/shodasha-datta-kshetras/`;

export const site = {
  name: 'Avadhoota Datta Peetham',
  shortName: 'Datta Peetham',
  trust: 'Sri Ganapathy Sachchidananda Avadhoota Datta Peetha Trust',
  ashram: 'Sri Ganapathy Sachchidananda Ashram',
  origin: config.siteUrl,
  tagline: 'Guiding humanity towards a more conscious, compassionate world',
  address: {
    lines: ['Sri Ganapathy Sachchidananda Ashram', 'Datta Nagar, Ooty Road', 'Mysuru, Karnataka 570 025, India'],
    street: 'Datta Nagar, Ooty Road',
    city: 'Mysuru',
    region: 'Karnataka',
    postal: '570025',
    country: 'IN',
  },
  phone: '+91 (0821) 2486 486',
  phoneHref: 'tel:+918212486486',
  email: 'mail@dattapeetham.com',
  mapQuery: 'Avadhoota Datta Peetham, Sri Ganapathy Sachchidananda Ashram, Mysuru',
};

// Transactional systems (payments, accounts, orders) stay on the existing
// platform; the rebuilt site links into them.
export const links = {
  poojas: `${OFFICIAL}/poojas?ashram_id=4`,
  donations: `${OFFICIAL}/donations?ashram_id=4`,
  store: `${OFFICIAL}/store`,
  subscriptions: `${OFFICIAL}/subscriptions`,
  login: `${OFFICIAL}/login`,
  calendar: `${OFFICIAL}/calendar`,
  eventsArchive: `${OFFICIAL}/events`,
  speeches: `${OFFICIAL}/speeches`,
  dattaVaakya: `${OFFICIAL}/speeches?category=449`,
  vijayaVyakhya: `${OFFICIAL}/speeches?category=450`,
  swamijiSays: `${OFFICIAL}/sri-swamiji-says`,
  photos: `${OFFICIAL}/photos`,
  videos: `${OFFICIAL}/videos`,
  downloads: `${OFFICIAL}/downloads`,
  articles: `${OFFICIAL}/articles`,
  dailyPosts: `${OFFICIAL}/dailyposts`,
  mobileApps: `${OFFICIAL}/mobileapps`,
  ashramCenters: `${OFFICIAL}/ashramcenters`,
  navanatha: `${OFFICIAL}/navanatha-datta-kshetras`,
  concerts: `${OFFICIAL}/myragasagaraconcerts`, // official concert pages ask visitors to sign in
  ragaSagara: 'https://www.sgsragasagara.com', // public Raga Sagara site, listed on the bhajans & healing music page
  techSupport: `${OFFICIAL}/techsupport`,
  subscribe: `${OFFICIAL}/subscribe`,
  dattaKriyaYoga: 'https://www.dattakriyayoga.org/',
  appStore: 'https://apps.apple.com/in/app/datta-peetham/id1627048826',
  playStore: 'https://play.google.com/store/apps/details?id=org.dattapeetham.mobile',
  facebook: `${OFFICIAL}/facebook`,
  youtube: `${OFFICIAL}/youtube`,
  // The Peetham's main YouTube channel (listed on its social-media page);
  // the streams tab shows the live broadcast when one is on.
  live: 'https://www.youtube.com/@DattaPeetham/streams',
  websites: `${OFFICIAL}/websites`,
  privacy: `${OFFICIAL}/page/view/privacy-policy`,
  terms: `${OFFICIAL}/page/view/terms-and-conditions`,
  disclaimer: `${OFFICIAL}/page/view/disclaimer`,
  directions: 'https://www.google.com/maps/dir/?api=1&destination=Avadhoota+Datta+Peetham+Mysuru',
  mapEmbed: 'https://www.google.com/maps?q=Avadhoota+Datta+Peetham,+Sri+Ganapathy+Sachchidananda+Ashram,+Mysuru&output=embed',
};

// Opening hours in Indian Standard Time; `closed` lists weekdays shut
// (0 = Sunday). Serialised into the page for the live open/closed badges.
// `temple` is the homepage's general "Temple Timings" block; individual
// shrines (Sri Datta Venkateshwara, Karya Siddhi Hanuman) list their own
// weekday/weekend hours on their pages, shown on darshan.html.
export const hours = {
  temple: { label: 'Temple', sessions: [['06:00', '12:00'], ['16:00', '20:00']], closed: [] },
  // Official sources disagree on Shuka Vana's hours and its own page says it
  // is temporarily closed for maintenance, so the live badge speaks of the
  // listed hours rather than promising it is open.
  shukaVana: { label: 'Shuka Vana', sessions: [['09:00', '12:00'], ['15:30', '18:00']], closed: [3], caution: true },
};

export const nav = [
  { label: 'About', href: 'about.html', children: [
    { label: 'About the Peetham', href: 'about.html', note: 'History, mission, Mysuru Ashram' },
    { label: 'Guru Parampara', href: 'guru-parampara.html', note: 'The lineage of the masters' },
    { label: 'Global Reach', href: 'centers.html', note: 'Centres & 16 Datta Kshetras' },
  ] },
  { label: 'Sri Swamiji', href: 'sri-swamiji.html', children: [
    { label: 'Sri Ganapathy Sachchidananda Swamiji', href: 'sri-swamiji.html', note: 'His life and mission' },
    { label: 'Avatara Timeline', href: 'sri-swamiji.html#timeline', note: 'Milestones since 1942' },
    { label: 'Sri Datta Vijayananda Teertha Swamiji', href: 'sri-swamiji.html#bala-swamiji', note: 'The junior pontiff' },
  ] },
  { label: 'Darshan & Puja', href: 'darshan.html', children: [
    { label: 'Temples & Darshan', href: 'darshan.html', note: 'Shrines, timings, worship' },
    { label: 'Events & Festivals', href: 'events.html', note: 'Programmes through the year' },
    { label: 'Book a Puja', href: links.poojas, external: true, note: 'Participate online' },
  ] },
  { label: 'Teachings', href: 'teachings.html', children: [
    { label: 'Discourses & Wisdom', href: 'teachings.html', note: 'Datta Vaakya, Vijaya Vyakhya' },
    { label: 'Nada Chikitsa', href: 'music.html', note: 'Healing through music' },
    { label: 'Datta Kriya Yoga', href: 'kriya-yoga.html', note: 'Breath, body, mind' },
  ] },
  { label: 'Seva', href: 'seva.html', children: [
    { label: 'Pillars of Service', href: 'seva.html', note: 'Healthcare, education, cow care' },
    { label: 'Volunteer', href: 'seva.html#volunteer', note: 'Join the SDHS volunteers' },
    { label: 'Donate', href: links.donations, external: true, note: 'Support the mission' },
  ] },
  { label: 'Visit', href: 'visit.html', children: [
    { label: 'Plan Your Visit', href: 'visit.html', note: 'Reach, stay, guidelines' },
    { label: 'Interactive Ashram Map', href: 'visit.html#map', note: 'Explore the campus' },
    { label: 'Ashram Attractions', href: 'attractions.html', note: 'Shuka Vana, Bonsai, Museum' },
  ] },
  { label: 'Media', href: 'media.html', children: [
    { label: 'Videos & Photos', href: 'media.html', note: 'Watch and explore' },
    { label: 'Music & Audio', href: 'media.html#audio', note: 'Albums and bhajans' },
    { label: 'Mobile Apps', href: 'media.html#apps', note: '18 devotional apps' },
  ] },
];
