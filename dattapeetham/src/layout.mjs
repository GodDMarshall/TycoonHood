// Page shell shared by every page: <head>, utility bar, header with mega menu,
// search dialog, page-transition veil and footer.

import { readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { site, links, nav, hours } from './site.mjs';
import { sprite, icon } from './icons.mjs';

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
// tools/make-og.mjs crops each page's `image` to a light 1.91:1 JPEG in
// src/assets/img/og/<ogKey(url)>-<w>x<h>.jpg. When that file exists the page
// shares it (absolute, with its size); otherwise the S3 original.
export const DEFAULT_OG_IMAGE = 'https://dattapeetham.s3.amazonaws.com/homepage_assets/site_1/front_page_images/sadguru-deva.jpg';
export const ogKey = (url) => createHash('sha1').update(url).digest('hex').slice(0, 12);
let ogFiles;
function shareImage(url) {
  ogFiles ??= (() => { try { return readdirSync(new URL('./assets/img/og/', import.meta.url)); } catch { return []; } })();
  const f = ogFiles.find((x) => x.startsWith(ogKey(url) + '-') && /-\d+x\d+\.jpg$/.test(x));
  if (!f) return { url };
  const [, w, h] = /-(\d+)x(\d+)\.jpg$/.exec(f);
  return { url: `${site.origin}/assets/img/og/${f}`, w, h, type: 'image/jpeg' };
}
// The alt text the page itself gives that photo (decorative heroes have none).
function shareAlt(url, body = '') {
  for (const [tag] of body.matchAll(/<img\b[^>]*>/g)) {
    if (!tag.includes(`src="${url}"`)) continue;
    const alt = (/\salt="([^"]+)"/.exec(tag) || [])[1];
    if (alt) return alt;
  }
  return '';
}
// og:locale for each language (all pages are written for readers in India);
// build.mjs swaps the primary one on the language pages.
export const OG_LOCALES = { en: 'en_IN', kn: 'kn_IN', hi: 'hi_IN', ta: 'ta_IN', te: 'te_IN' };
export const ogLocaleTags = (code) => [`<meta property="og:locale" content="${OG_LOCALES[code]}">`,
  ...Object.entries(OG_LOCALES).filter(([c]) => c !== code).map(([, l]) => `<meta property="og:locale:alternate" content="${l}">`)].join('\n');

function head(page, body) {
  const title = page.slug === 'index' ? `${site.name} · ${site.ashram}, Mysuru` : `${page.title} · ${site.name}`;
  const ogSource = page.image || DEFAULT_OG_IMAGE;
  const og = shareImage(ogSource);
  const ogAlt = shareAlt(ogSource, body);
  const canonical = page.slug === 'index' ? site.origin + '/' : `${site.origin}/${page.file}`;
  // The 404 page answers unknown URLs: not indexed, no language alternates, and no
  // remembered-language redirect (it would loop, every unknown URL is this page).
  const is404 = page.slug === '404';
  const langRedirect = "(function(d){try{var pref=localStorage.getItem('dp-lang'),cur=d.lang||'en';if(pref&&pref!==cur&&/^(en|kn|hi|ta|te)$/.test(pref)&&!/[?&]lang=keep/.test(location.search)){var f=location.pathname.split('/').pop()||'index.html';location.replace((d.getAttribute('data-root')||'')+(pref==='en'?'':pref+'/')+f+location.hash);return;}}catch(e){}})(document.documentElement);";
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
<link rel="preconnect" href="https://dattapeetham.s3.amazonaws.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Marcellus&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@500&text=%E0%A5%90&display=swap" rel="stylesheet">
${page.preload ? `<link rel="preload" as="image" href="${page.preload}" fetchpriority="high">` : ''}
<link rel="stylesheet" href="assets/css/site.css">
${(page.features || []).map((f) => `<link rel="stylesheet" href="assets/css/features/${f}.css">`).join('\n')}
${page.css ? `<link rel="stylesheet" href="assets/css/pages/${page.slug}.css">` : ''}
${jsonLd(page)}
<script>${is404 ? '' : langRedirect}(function(d){d.classList.add('js');try{if(sessionStorage.getItem('dp-intro'))d.classList.add('intro-seen');else sessionStorage.setItem('dp-intro','1');}catch(e){d.classList.add('intro-seen');}})(document.documentElement);window.DP_HOURS=${JSON.stringify(hours)};</script>
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

const INTRO_WORD = [...'Avadhoota Datta Peetham'].map((ch, i) => ch === ' ' ? '<span>&nbsp;</span>' : `<span style="animation-delay:${120 + i * 40}ms">${ch}</span>`).join('');

export function layout(page, body) {
  const scripts = [
    `<script src="${VENDOR.gsap}" defer></script>`,
    `<script src="${VENDOR.scrollTrigger}" defer></script>`,
    `<script src="${VENDOR.lenis}" defer></script>`,
    `<script src="assets/js/site.js" defer></script>`,
    `<script src="assets/js/motion.js" defer></script>`,
    ...(page.features || []).map((f) => `<script src="assets/js/features/${f}.js" defer></script>`),
    ...(page.scripts || []).map((s) => /^https?:/.test(s) ? `<script src="${s}" defer></script>` : `<script src="assets/js/${s}.js" defer></script>`),
  ].join('\n');
  return `${head(page, body)}
<body class="page-${page.slug}${page.bodyClass ? ' ' + page.bodyClass : ''}">
<a class="skip" href="#main">Skip to content</a>
${sprite}
<div class="scroll-progress" aria-hidden="true"><span></span></div>
<div class="intro" aria-hidden="true">
  <svg class="intro-mark" viewBox="0 0 104 104"><use href="#i-mandala"/></svg>
  <div class="intro-word" translate="no">${INTRO_WORD}</div>
  <div class="intro-bar"><i></i></div>
  <div class="intro-label">Jaya Guru Datta</div>
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

export { esc, ext };
