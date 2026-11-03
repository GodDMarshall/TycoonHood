// Page shell shared by every page: <head>, utility bar, header with mega menu,
// search dialog, page-transition veil and footer.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { site, links, nav, hours } from './site.mjs';
import { sprite, icon } from './icons.mjs';
import { soundStyles, soundInvite, soundControl, soundScript, SOUND_DEV_ONLY } from './features/devotion-sound.mjs';
import { deepaRow, JYOTI_ATTR, DEVOTION_CSS, DEVOTION_JS } from './features/devotion-motion.mjs';

// Languages (codes and native names); the build renders /kn/, /hi/, /ta/, /te/.
const LANG_CODES = [['en', 'English'], ['kn', 'ಕನ್ನಡ'], ['hi', 'हिन्दी'], ['ta', 'தமிழ்'], ['te', 'తెలుగు']];

function langSwitch() {
  return `<div class="lang" data-lang-switch>
  <button class="lang-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="lang-menu">${icon('globe', 18)}<span class="lang-current" translate="no">EN</span><span class="visually-hidden">Change language</span></button>
  <ul class="lang-menu" id="lang-menu" role="list">${LANG_CODES.map(([code, name]) => `<li><a href="@@lang:${code}" hreflang="${code}" lang="${code}" data-lang="${code}" translate="no">${name}</a></li>`).join('')}</ul>
</div>`;
}

// The browser chrome colour (--forest in site.css). site.webmanifest uses the
// same token; tests/site.test.mjs checks the two agree.
export const THEME_COLOR = '#0f1c18';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ext = (href) => /^https?:/.test(href);

// Self-hosted, pinned: gsap 3.12.5, ScrollTrigger 3.12.5, lenis 1.1.13 (its
// sourceMappingURL comment removed: the .map is not shipped, and browsers
// would request it and log a 404).
export const VENDOR = {
  gsap: 'assets/vendor/gsap.min.js',
  scrollTrigger: 'assets/vendor/ScrollTrigger.min.js',
  lenis: 'assets/vendor/lenis.min.js',
};

function jsonLd(page) {
  const org = {
    '@context': 'https://schema.org',
    '@type': ['HinduTemple', 'Organization'],
    name: site.name,
    alternateName: site.ashram,
    url: site.origin + '/',
    telephone: '+91-821-2486486',
    email: site.email,
    address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postal, addressCountry: site.address.country },
    openingHoursSpecification: hours.temple.sessions.map(([o, c]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: o, closes: c })),
    sameAs: ['https://www.facebook.com/SriSwamiji'],
  };
  // No breadcrumb on the home page, or on the 404 page (it answers every unknown URL).
  const crumbs = page.slug === 'index' || page.slug === '404' ? null : {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site.origin + '/' },
      { '@type': 'ListItem', position: 2, name: page.crumb || page.title, item: `${site.origin}/${page.file}` },
    ],
  };
  return [org, crumbs, ...(page.jsonLd || [])].filter(Boolean)
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
}

// ---------- share previews (og:image) ----------
// Every page shares src/assets/img/og/<slug>.jpg: its `image` cut from the 4K
// master to the 1200x630 frame share previews show (tools/enhance-photos.mjs
// makes it with a new photo; tools/make-og.mjs re-cuts them all). It goes out
// as an absolute URL on siteUrl with its type, size and the photo's alt text.
// A page with no share image yet falls back to the S3 original.
export const DEFAULT_OG_IMAGE = 'https://dattapeetham.s3.amazonaws.com/homepage_assets/site_1/front_page_images/sadguru-deva.jpg';
function jpegSize(buf) {
  if (buf.readUInt16BE(0) !== 0xffd8) throw new Error('not a JPEG');
  for (let i = 2; i < buf.length;) {
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no SOF marker');
}
// The URL carries ?v=<first 8 hex of the file's sha256>, as the CSS and JS
// do: the name stays the same when a page's photo changes, and share
// previews and the 30-day image cache would otherwise keep the old one.
function shareImage(page) {
  const name = `${page.slug}.jpg`;
  try {
    const buf = readFileSync(new URL(`./assets/img/og/${name}`, import.meta.url));
    const { w, h } = jpegSize(buf);
    const v = createHash('sha256').update(buf).digest('hex').slice(0, 8);
    return { url: `${site.origin}/assets/img/og/${name}?v=${v}`, w, h, type: 'image/jpeg' };
  } catch { return { url: page.image || DEFAULT_OG_IMAGE }; }
}
// The share image's alt text: the page's `imageAlt`, else the alt the page
// gives that photo, else the one another page gives it (build.mjs collects
// them before laying out the pages: setSiteImageAlts). Heroes are decorative
// on their own page (alt=""), but a share preview stands alone.
let siteAlts = new Map();
export function setSiteImageAlts(map) { siteAlts = map; }
function shareAlt(page, url, body = '') {
  if (page.imageAlt) return page.imageAlt;
  for (const [tag] of body.matchAll(/<img\b[^>]*>/g)) {
    if (!tag.includes(`src="${url}"`)) continue;
    const alt = (/\salt="([^"]+)"/.exec(tag) || [])[1];
    if (alt) return alt;
  }
  return siteAlts.get(url) || '';
}
// og:locale for each language (all pages are written for readers in India);
// build.mjs swaps the primary one on the language pages.
export const OG_LOCALES = { en: 'en_IN', kn: 'kn_IN', hi: 'hi_IN', ta: 'ta_IN', te: 'te_IN' };
export const ogLocaleTags = (code) => [`<meta property="og:locale" content="${OG_LOCALES[code]}">`,
  ...Object.entries(OG_LOCALES).filter(([c]) => c !== code).map(([, l]) => `<meta property="og:locale:alternate" content="${l}">`)].join('\n');

function head(page, body) {
  const title = page.slug === 'index' ? `${site.name} · ${site.ashram}, Mysuru` : `${page.title} · ${site.name}`;
  const ogSource = page.image || DEFAULT_OG_IMAGE;
  const og = shareImage(page);
  const ogAlt = shareAlt(page, ogSource, body);
  const canonical = page.slug === 'index' ? site.origin + '/' : `${site.origin}/${page.file}`;
  // The 404 page answers unknown URLs: not indexed, no language alternates, and no
  // remembered-language redirect (it would loop, every unknown URL is this page).
  const is404 = page.slug === '404';
  // The inline head script only sets classes on <html>. The opening screen (.intro) shows on the
  // first page of a browser session (sessionStorage dp-intro; otherwise .intro-seen hides it). When
  // it shows, localStorage dp-welcome tells a returning visitor (.welcome-seen: the short loading
  // screen) from a first visit ever (the namaskara); a browser that cannot keep it counts as
  // returning. A page that is leaving for the remembered language (data-leaving) sets neither flag,
  // so the page it opens still shows the screen as it should; mid-session it shows no curtain either.
  const langRedirect = "(function(d){try{var pref=localStorage.getItem('dp-lang'),cur=d.lang||'en';if(pref&&pref!==cur&&/^(en|kn|hi|ta|te)$/.test(pref)&&!/[?&]lang=keep/.test(location.search)){var f=location.pathname.split('/').pop()||'index.html';location.replace((d.getAttribute('data-root')||'')+(pref==='en'?'':pref+'/')+f+location.hash);d.setAttribute('data-leaving','');return;}}catch(e){}})(document.documentElement);";
  return `<!doctype html>
<html lang="en" data-root="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="theme-color" content="${THEME_COLOR}">
<link rel="canonical" href="${canonical}">
${is404 ? '<meta name="robots" content="noindex">' : `${LANG_CODES.map(([code]) => `<link rel="alternate" hreflang="${code}" href="${site.origin}/${code === 'en' ? '' : code + '/'}${page.slug === 'index' ? '' : page.file}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${page.slug === 'index' ? site.origin + '/' : `${site.origin}/${page.file}`}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:url" content="${canonical}">
${ogLocaleTags('en')}
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="${og.url}">
${og.w ? `<meta property="og:image:type" content="${og.type}">
<meta property="og:image:width" content="${og.w}">
<meta property="og:image:height" content="${og.h}">\n` : ''}${ogAlt ? `<meta property="og:image:alt" content="${ogAlt}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/img/icons/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Marcellus&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@500&text=%E0%A5%90&display=swap" rel="stylesheet">
${page.preload ? `<link rel="preload" as="image" href="${page.preload}" fetchpriority="high">` : ''}
<link rel="stylesheet" href="assets/css/site.css">
${soundStyles()}
<link rel="stylesheet" href="${DEVOTION_CSS}">
${(page.features || []).map((f) => `<link rel="stylesheet" href="assets/css/features/${f}.css">`).join('\n')}
${page.css ? `<link rel="stylesheet" href="assets/css/pages/${page.slug}.css">` : ''}
${jsonLd(page)}
<script>${is404 ? '' : langRedirect}(function(d){d.classList.add('js');var L=d.hasAttribute('data-leaving'),s=1;try{if(!sessionStorage.getItem('dp-intro')){if(!L)sessionStorage.setItem('dp-intro','1');s=0;}}catch(e){}if(s){d.classList.add('intro-seen');return;}if(L)return;try{if(localStorage.getItem('dp-welcome'))d.classList.add('welcome-seen');else localStorage.setItem('dp-welcome','1');}catch(e){d.classList.add('welcome-seen');}})(document.documentElement);window.DP_HOURS=${JSON.stringify(hours)};</script>
</head>`;
}

function brand(variant = '') {
  return `<a class="brand ${variant}" href="index.html" aria-label="${esc(site.name)} — home">
  <svg class="brand-mark" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
  <span class="brand-word"><span>Avadhoota</span><span>Datta Peetham</span></span>
</a>`;
}

function navMenu(active) {
  return nav.map((item, i) => {
    const isActive = item.label === active;
    if (!item.children) return `<li><a class="nav-top${isActive ? ' is-active' : ''}" href="${item.href}">${item.label}</a></li>`;
    return `<li class="has-sub">
  <a class="nav-top${isActive ? ' is-active' : ''}" href="${item.href}" aria-haspopup="true">${item.label}</a>
  <button class="sub-toggle" type="button" aria-expanded="false" aria-controls="sub-${i}" aria-label="Show ${item.label} menu">${icon('chev', 12)}</button>
  <div class="sub" id="sub-${i}">
    <ul>${item.children.map((c) => `<li><a href="${c.href}"${c.external ? ' data-external' : ''}><b>${c.label}${c.external ? ` ${icon('arrow-up-right', 12)}` : ''}</b><span>${c.note || ''}</span></a></li>`).join('')}</ul>
  </div>
</li>`;
  }).join('');
}

function header(page) {
  return `<div class="util-bar">
  <div class="wrap">
    <div class="util-status" aria-live="polite">
      <span class="status-pill"><i class="dot" data-dot="temple"></i>Temple <b data-status="temple">·</b></span>
      <span class="status-pill status-next hide-sm">${icon('diya', 13)}Next <b data-next-ritual>·</b></span>
      <span class="status-pill status-clock hide-sm">${icon('clock', 13)}Mysuru <b data-clock>--:--</b></span>
    </div>
    <nav class="util-links" aria-label="Utility links">
      <a href="${links.live}" class="live-link">${icon('live', 14)}Live streams ${icon('arrow-up-right', 11)}</a>
      <a href="events.html">Events</a>
      <a href="contact.html">Contact</a>
      <a href="${links.login}">Sign in ${icon('arrow-up-right', 11)}</a>
    </nav>
  </div>
</div>
<header class="site-header" data-header>
  <div class="wrap header-inner">
    ${brand()}
    <nav class="primary-nav" id="primary-nav" aria-label="Main">
      <ul class="menu">${navMenu(page.nav)}</ul>
      <div class="nav-mobile-extra">
        <a class="btn btn-gold" href="${links.donations}">Donate</a>
        <a class="btn btn-line" href="${links.poojas}">Book a Puja</a>
      </div>
    </nav>
    <div class="header-actions">
      ${langSwitch()}
      <button class="icon-btn" type="button" data-search-open aria-label="Search the site" aria-haspopup="dialog">${icon('search', 20)}</button>
      <a class="btn btn-gold btn-sm header-donate" href="${links.donations}">Donate</a>
      <button class="icon-btn burger" type="button" aria-label="Open menu" aria-controls="primary-nav" aria-expanded="false"><span></span></button>
    </div>
  </div>
</header>`;
}

function searchDialog() {
  return `<div class="search-dialog" role="dialog" aria-modal="true" aria-label="Search" hidden data-search>
  <div class="search-panel">
    <div class="search-field">
      ${icon('search', 22)}
      <input type="search" placeholder="Search temples, sevas, teachings, timings…" aria-label="Search the site" autocomplete="off" data-search-input>
      <button class="icon-btn" type="button" data-search-close aria-label="Close search">${icon('close', 20)}</button>
    </div>
    <div class="search-hints" data-search-hints>
      <span>Try</span>
      <button type="button" data-q="Darshan timings">Darshan timings</button>
      <button type="button" data-q="Shuka Vana">Shuka Vana</button>
      <button type="button" data-q="Datta Jayanti">Datta Jayanti</button>
      <button type="button" data-q="Kriya Yoga">Kriya Yoga</button>
      <button type="button" data-q="How to reach">How to reach</button>
    </div>
    <ul class="search-results" data-search-results role="listbox" aria-label="Results"></ul>
  </div>
</div>`;
}

function footer() {
  const col = (title, items) => `<div><h2 class="footer-h">${title}</h2><ul>${items.map(([l, h]) => `<li><a href="${h}">${l}${ext(h) ? ` ${icon('arrow-up-right', 12)}` : ''}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-footer">
  <div class="footer-glow" aria-hidden="true"></div>
  <svg class="footer-watermark" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        ${brand('brand-light')}
        <p>${esc(site.trust)}<br>${site.address.lines.slice(1).join('<br>')}</p>
        <p class="footer-contact"><a href="${site.phoneHref}">${icon('phone', 16)}${site.phone}</a><a href="mailto:${site.email}">${icon('mail', 16)}${site.email}</a></p>
        <div class="socials">
          <a href="${links.facebook}" aria-label="Facebook">${icon('fb', 18)}</a>
          <a href="${links.youtube}" aria-label="YouTube">${icon('yt', 18)}</a>
          <a href="https://www.instagram.com/sgsbirds" aria-label="Shuka Vana on Instagram">${icon('ig', 18)}</a>
          <a href="${links.websites}" aria-label="All Datta Peetham websites">${icon('globe', 18)}</a>
        </div>
      </div>
      ${col('Explore', [['About the Peetham', 'about.html'], ['Sri Swamiji', 'sri-swamiji.html'], ['Guru Parampara', 'guru-parampara.html'], ['Global Reach', 'centers.html'], ['Ashram Attractions', 'attractions.html']])}
      ${col('Participate', [['Temples & Darshan', 'darshan.html'], ['Events & Festivals', 'events.html'], ['Book a Puja', links.poojas], ['Donate', links.donations], ['Volunteer', 'seva.html#volunteer'], ['Store', links.store]])}
      ${col('Learn & Listen', [['Discourses', 'teachings.html'], ['Nada Chikitsa', 'music.html'], ['Datta Kriya Yoga', 'kriya-yoga.html'], ['Videos & Photos', 'media.html'], ['Mobile Apps', 'media.html#apps']])}
      ${col('Visit', [['Plan Your Visit', 'visit.html'], ['Ashram Map', 'visit.html#map'], ['Contact', 'contact.html'], ['Feedback / Support', links.techSupport], ['Subscribe for updates', links.subscribe]])}
    </div>
    ${deepaRow({ count: 5, size: 'sm', rule: true, cls: 'dv-footer-lamps' })}
    <div class="footer-mantra" aria-label="Lokah samastah sukhino bhavantu">
      <span class="om" aria-hidden="true">ॐ</span>
      <p>May all beings be happy. May all beings be healthy. May all beings experience peace.</p>
    </div>
    <div class="footer-tagline" aria-hidden="true">
      <span>A modern digital home for a timeless mission</span><i></i><span>Spirituality</span><b>•</b><span>Service</span><b>•</b><span>Harmony</span><b>•</b><span>A better humanity</span>
    </div>
    <p class="i18n-note" data-i18n-note hidden>This page was translated from English. The translation is being reviewed by the Ashram; where it differs, the English page is authoritative.</p>
    <div class="footer-bottom">
      <span>© 2015 – <span data-year>2026</span> ${esc(site.trust)}. All rights reserved.</span>
      <nav aria-label="Legal">
        <a href="about.html">About Us</a>
        <a href="${links.disclaimer}">Disclaimer</a>
        <a href="${links.privacy}">Privacy</a>
        <a href="${links.terms}">Terms</a>
      </nav>
    </div>
  </div>
</footer>`;
}

// one span per letter, each rising in turn; site.css times them from --i (per variant: first visit, loading screen)
const INTRO_WORD = [...'Avadhoota Datta Peetham'].map((ch, i) => ch === ' ' ? '<span>&nbsp;</span>' : `<span style="--i:${i}">${ch}</span>`).join('');

// The opening screen's art (docs/DEVOTION-PLAN.md, "The opening screen: namaskara"): two hands in
// anjali (namaskara), seen from the front as the visitor faces the one greeting them, joined at the
// heart over a small lotus, inside the site's own mandala with fine rays. It is an illustration.
// One hand is drawn (#ih-hand) and the other is its mirror. Each hand is its own <svg>, so its glide
// is a composited transform. Every layer shares the art's 260 x 300 units (the halo's centre is at
// 0,128; the wrists meet at 0,208). .intro-mark is the art box: devotion-sound.js reads the curtain's
// clock from its first animation.
const INTRO_ART = `<div class="intro-mark">
    <i class="ih-glow"></i>
    <span class="ih-halo"><svg viewBox="-130 0 260 300"><use href="#i-mandala" x="-117" y="11" width="234" height="234"/></svg></span>
    <svg class="ih-rays" viewBox="-130 0 260 300"><defs><radialGradient id="ih-ray" gradientUnits="userSpaceOnUse" cx="0" cy="128" r="148"><stop offset=".8" stop-color="#f0dcaa"/><stop offset="1" stop-color="#f0dcaa" stop-opacity="0"/></radialGradient></defs><path fill="none" stroke="url(#ih-ray)" stroke-width=".9" stroke-linecap="round" d="M-102 187L-126 201M-111 168L-124 173M-116 148L-130 151M-118 128L-146 128M-116 108L-130 105M-111 88L-124 83M-102 69L-126 55M-90 52L-101 43M-76 38L-85 27M-59 26L-73 2M-40 17L-45 4M-20 12L-23 -2M0 10L0 -18M20 12L23 -2M40 17L45 4M59 26L73 2M76 38L85 27M90 52L101 43M102 69L126 55M111 88L124 83M116 108L130 105M118 128L146 128M116 148L130 151M111 168L124 173M102 187L126 201"/></svg>
    <i class="ih-ring"></i>
    <svg class="ih-lotus" viewBox="-130 0 260 300"><defs><linearGradient id="ih-pg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7d5a22"/><stop offset=".5" stop-color="#cfa75e"/><stop offset="1" stop-color="#f3dfab"/></linearGradient><g id="ih-pet"><path d="M0 0C9.5-4 13-20 0-38-13-20-9.5-4 0 0Z"/><path d="M0-4V-31" fill="none" stroke-width=".55" opacity=".7"/></g></defs><g transform="translate(0 265) scale(.86)" fill="url(#ih-pg)" stroke="#5e4114" stroke-width=".8" stroke-linejoin="round"><g fill="#6e4e1c"><use href="#ih-pet" transform="rotate(-50) scale(.9)"/><use href="#ih-pet" transform="rotate(50) scale(.9)"/><use href="#ih-pet" transform="rotate(-16)"/><use href="#ih-pet" transform="rotate(16)"/></g><use href="#ih-pet" transform="rotate(-76) scale(.72)"/><use href="#ih-pet" transform="rotate(76) scale(.72)"/><use href="#ih-pet" transform="rotate(-54) scale(.84)"/><use href="#ih-pet" transform="rotate(54) scale(.84)"/><use href="#ih-pet" transform="rotate(-29) scale(.94)"/><use href="#ih-pet" transform="rotate(29) scale(.94)"/><use href="#ih-pet"/><path d="M-40 2.5H40" fill="none" stroke="#e2c88e" opacity=".8"/></g></svg>
    <svg class="ih-l" viewBox="-130 0 260 300"><defs><linearGradient id="ih-gold" gradientUnits="userSpaceOnUse" x1="0" y1="34" x2="0" y2="240"><stop offset="0" stop-color="#f4e2b0"/><stop offset=".45" stop-color="#d8b36b"/><stop offset=".8" stop-color="#a47835"/><stop offset="1" stop-color="#7a5622"/></linearGradient><linearGradient id="ih-sheen" gradientUnits="userSpaceOnUse" x2="36"><stop offset="0" stop-color="#4a3009" stop-opacity=".28"/><stop offset=".2" stop-color="#4a3009" stop-opacity="0"/><stop offset=".5" stop-color="#fff4d6" stop-opacity=".26"/><stop offset=".78" stop-color="#fff4d6" stop-opacity="0"/><stop offset=".96" stop-color="#4a3009" stop-opacity=".22"/></linearGradient><radialGradient id="ih-fade" gradientUnits="userSpaceOnUse" cx="0" cy="128" r="124" gradientTransform="scale(.74 1)"><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="ih-m" maskUnits="userSpaceOnUse" x="-130" y="0" width="260" height="300"><rect x="-130" width="260" height="300" fill="url(#ih-fade)"/></mask><path id="ih-shape" d="M0 38.6C.3 35.6 2.4 34 5.2 34c3 0 5.2 5.5 6 13 .5 4.5 1.2 8 1.8 11 2.4-1.2 5.6 1.6 6.8 8 1.8 13 4.2 30 7.2 44 1.4 6 4.4 11 6.4 17 2.4 13 3.2 29 2 43-.8 10-.8 19 2.2 26 4.4 6 11.4 12 19.4 18 7 5 15 10 23 15l-14 17c-10-6-20-10-30-15-12-7-25-15-36-23-2.2-11-1.8-38-.9-58 .6-12 .7-18 .9-23-1.1-8-1.1-24-.6-30-.3-4 0-7.5.6-10-1.1-8-1.1-23 0-29.5-.9-6.5-.8-14.5 0-18.9Z"/><g id="ih-hand" mask="url(#ih-m)"><use href="#ih-shape" fill="url(#ih-gold)"/><use href="#ih-shape" fill="url(#ih-sheen)"/><path fill="none" stroke="#f6e3b2" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round" d="M0 38.6C.3 35.6 2.4 34 5.2 34c3 0 5.2 5.5 6 13 .5 4.5 1.2 8 1.8 11 2.4-1.2 5.6 1.6 6.8 8 1.8 13 4.2 30 7.2 44 1.4 6 4.4 11 6.4 17 2.4 13 3.2 29 2 43-.8 10-.8 19 2.2 26 4.4 6 11.4 12 19.4 18 7 5 15 10 23 15"/><g fill="none" stroke="#6a4818" stroke-width=".85" stroke-linecap="round"><path d="M0 38.6V208" stroke-width=".7" opacity=".7"/><path d="M13 58c1.8 15 4.6 34 8 50 1.2 6 3.6 11 6.4 15M0 57.5c.4-3.1 2.4-5.1 5-5.1 3.2 0 5.4 4.6 6.2 10.6 1.4 14 3.4 33 6 49 1 6 3.2 11 6.2 15M0 87c.4-3 2.2-4.8 4.6-4.8 2.8 0 4.6 3.8 5.2 8.8.8 11 1.8 24 2.8 36 .8 6 2.4 10 4.8 13"/><path d="M7.6 84.6c1.4 1.8 1.9 4 1.8 6.4M2.4 110.5c2.6-1 5.6-.9 8.2.4M2.4 97.5c2.4-.9 5-.8 7.4.3M3 76c3-1 6.4-.9 9.4.4M16.2 80.4c1.9-.7 3.9-.6 5.6.3" opacity=".5"/><path d="M24 140c1.6 16 3.4 32 6.4 48M16.4 146c2 14 4.2 30 8 45" opacity=".3"/><path d="M0 208c11 8 24 16 36 23" opacity=".35"/></g></g></defs><use href="#ih-hand" transform="scale(-1 1)"/></svg>
    <svg class="ih-r" viewBox="-130 0 260 300"><use href="#ih-hand"/></svg>
    <i class="ih-seam"></i>
  </div>`;

export function layout(page, body) {
  const scripts = [
    `<script src="${VENDOR.gsap}" defer></script>`,
    `<script src="${VENDOR.scrollTrigger}" defer></script>`,
    `<script src="${VENDOR.lenis}" defer></script>`,
    `<script src="assets/js/site.js" defer></script>`,
    `<script src="assets/js/motion.js" defer></script>`,
    // the devotional layer: the flute and temple sounds, then the motifs (docs/DEVOTION-PLAN.md)
    soundScript(),
    `<script src="${DEVOTION_JS}" defer></script>`,
    ...(page.features || []).map((f) => `<script src="assets/js/features/${f}.js" defer></script>`),
    ...(page.scripts || []).map((s) => /^https?:/.test(s) ? `<script src="${s}" defer></script>` : `<script src="assets/js/${s}.js" defer></script>`),
  ].join('\n');
  return `${head(page, body)}
<body class="page-${page.slug}${page.bodyClass ? ' ' + page.bodyClass : ''}">
<a class="skip" href="#main">Skip to content</a>
${soundControl()}
${sprite}
<div class="scroll-progress" aria-hidden="true"${JYOTI_ATTR}><span></span></div>
<div class="intro" aria-hidden="true">
  <div class="intro-core">
  ${INTRO_ART}
  <p class="intro-hello intro-hello-first" aria-hidden="true">Welcome to</p>
  <p class="intro-hello intro-hello-back" aria-hidden="true">Welcome</p>
  <div class="intro-word" translate="no">${INTRO_WORD}</div>
  <div class="intro-bar"><i></i></div>
  <div class="intro-label">Jaya Guru Datta</div>
  </div>
  ${soundInvite()}
</div>
${header(page)}
${searchDialog()}
<main id="main">
${body}
</main>
${footer()}
<button class="to-top" type="button" aria-label="Back to top" data-to-top>${icon('arrow', 18)}</button>
${scripts}
</body>
</html>
`;
}

// Files under src/assets/ that no page requests (build-only data, audio the
// sound engine does not use): build.mjs leaves them out of the site.
export const DEV_ONLY_ASSETS = [...SOUND_DEV_ONLY];

export { esc, ext };
