// Building blocks every page composes. Each returns an HTML string. Classes
// here are styled in assets/css/site.css and animated by assets/js/motion.js
// through data attributes:
//   data-reveal="up|fade|left|right|scale|clip"   reveal on scroll
//   data-stagger                                     reveal children in sequence
//   data-split                                       split heading into words
//   data-parallax="0.15"                             parallax speed (images)
//   data-count="1512"                                count up when visible
//   data-draw                                        draw SVG strokes on scroll

import { icon } from './icons.mjs';
import { esc } from './layout.mjs';

const isExt = (href) => /^https?:|^mailto:|^tel:/.test(href || '');

export function img(src, alt = '', { cls = '', w, h, eager = false, parallax, sizes, pos } = {}) {
  return `<img src="${src}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''}${w ? ` width="${w}"` : ''}${h ? ` height="${h}"` : ''}${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${parallax ? ` data-parallax="${parallax}"` : ''}${sizes ? ` sizes="${sizes}"` : ''}${pos ? ` style="object-position:${pos}"` : ''}>`;
}

export function btn(label, href, variant = 'gold', iconName = 'arrow', extra = '') {
  const ic = iconName ? icon(iconName, 16) : '';
  const lead = iconName === 'play-circle' || iconName === 'play' || iconName === 'live';
  return `<a class="btn btn-${variant}" href="${href}"${extra}>${lead ? ic : ''}<span>${label}</span>${lead ? '' : ic}</a>`;
}

export function ornament(cls = '') {
  return `<svg class="ornament ${cls}" viewBox="0 0 160 20" aria-hidden="true" data-draw>
  <path d="M0 10h58M102 10h58" />
  <path d="M80 2c3.6 3.2 5.4 5.8 5.4 8S83.6 15.6 80 18c-3.6-2.4-5.4-5.8-5.4-8S76.4 5.2 80 2Z"/>
  <path d="M80 18c-4.6-.6-9.4-3.6-12-8.6 4.6 0 8.8 2 12 6.2M80 18c4.6-.6 9.4-3.6 12-8.6-4.6 0-8.8 2-12 6.2"/>
  <circle cx="62" cy="10" r="1.6"/><circle cx="98" cy="10" r="1.6"/>
</svg>`;
}

// Golden thread: three faint lines with two beads of light travelling along
// them (Nature-Care's "wireline", recoloured as a sacred thread).
export function thread(cls = '') {
  return `<svg class="thread ${cls}" viewBox="0 0 1460 26" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 13 H1460"/><path d="M0 7 C 365 3, 1095 3, 1460 7" opacity=".5"/><path d="M0 19 C 365 23, 1095 23, 1460 19" opacity=".5"/>
  <path class="thread-pulse" pathLength="1460" d="M0 13 H1460"/><path class="thread-pulse p2" pathLength="1460" d="M0 7 C 365 3, 1095 3, 1460 7"/>
</svg>`;
}

// Scroll-lit statement: each word brightens as the line scrolls through.
// Wrap words in *asterisks* for the gold sheen.
export function scrollLit(text, tag = 'p') {
  const words = text.split(/\s+/);
  return `<${tag} class="scroll-lit" data-progress="0.9,0.5" style="--n:${words.length}">${words.map((w, i) => {
    const em = /^\*.*\*[.,;:!?]?$/.test(w);
    const clean = w.replace(/\*/g, '');
    return `<span class="w${em ? ' em-light' : ''}" style="--i:${i}">${clean}</span>`;
  }).join(' ')}</${tag}>`;
}

// Process steps: [title, text] pairs drawn along a self-drawing line.
export function processSteps(steps) {
  return `<ol class="process" data-progress="0.8,0.55" style="--n:${steps.length}">
  <span class="process-track" aria-hidden="true"><i></i></span>
  ${steps.map(([t, x], i) => `<li class="process-step" style="--i:${i}"><span class="process-dot" aria-hidden="true"></span><span class="process-num">${String(i + 1).padStart(2, '0')}</span><h3>${t}</h3>${x ? `<p>${x}</p>` : ''}</li>`).join('')}
</ol>`;
}

// Rising sun behind a closing section (Ojasphera's eclipse horizon, warmed).
export function horizon() {
  return `<svg class="horizon" viewBox="0 0 1000 1000" aria-hidden="true">
  <defs>
    <radialGradient id="hz-glow"><stop offset=".78" stop-color="#e8b45c" stop-opacity="0"/><stop offset=".905" stop-color="#e8b45c" stop-opacity=".2"/><stop offset="1" stop-color="#e8b45c" stop-opacity="0"/></radialGradient>
    <linearGradient id="hz-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3d6" stop-opacity="0"/><stop offset=".45" stop-color="#fff3d6" stop-opacity=".6"/><stop offset="1" stop-color="#e8b45c"/></linearGradient>
  </defs>
  <circle class="h-glow" cx="500" cy="500" r="500" fill="url(#hz-glow)"/>
  <circle cx="500" cy="500" r="430" fill="#0b1612"/>
  <circle cx="500" cy="500" r="430" fill="none" stroke="url(#hz-rim)" stroke-width="2.2"/>
</svg>`;
}

export function eyebrow(text, cls = '') {
  return `<span class="eyebrow ${cls}">${text}</span>`;
}

export function sectionHead({ eyebrow: eb, title, lead, align = 'center', light = false, ornament: orn = true, id }) {
  return `<header class="section-head ${align === 'left' ? 'is-left' : ''} ${light ? 'is-light' : ''}"${id ? ` id="${id}"` : ''}>
  ${orn && align !== 'left' ? ornament() : ''}
  ${eb ? eyebrow(eb) : ''}
  <h2 data-split>${title}</h2>
  ${lead ? `<p class="lead" data-reveal="up">${lead}</p>` : ''}
</header>`;
}

// Inner-page hero modelled on the reference "inner page concepts": full-bleed
// photograph, serif title, lead line, and a row of ivory quick tiles that
// overlap the bottom edge.
export function pageHero({ eyebrow: eb, title, lead, image, pos = 'center', tiles = [], crumb, actions = '' }) {
  return `<section class="page-hero" data-hero>
  <div class="page-hero-media">${img(image, '', { eager: true, pos, cls: 'kenburns' })}</div>
  <div class="page-hero-glow" aria-hidden="true"></div>
  <canvas class="embers" data-embers aria-hidden="true"></canvas>
  <div class="wrap page-hero-inner">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><span aria-current="page">${crumb || title}</span></nav>
    ${eb ? eyebrow(eb, 'eyebrow-light') : ''}
    <h1 data-split>${title}</h1>
    ${lead ? `<p class="lead" data-reveal="up">${lead}</p>` : ''}
    ${actions ? `<div class="hero-actions" data-reveal="up">${actions}</div>` : ''}
  </div>
  ${thread()}
</section>
${tiles.length ? quickTiles(tiles, 'overlap') : ''}`;
}

// Icon tiles row (reference: "Darshan & Puja / Events / Teachings / ...").
export function quickTiles(items, variant = '') {
  return `<div class="wrap"><nav class="quick-tiles ${variant}" aria-label="Quick links" data-stagger>
  ${items.map((t) => `<a class="quick-tile" href="${t.href}"${isExt(t.href) ? ' data-external' : ''}>
    <span class="qt-icon">${icon(t.icon, 28)}</span>
    <span class="qt-text"><b>${t.title}</b>${t.note ? `<small>${t.note}</small>` : ''}</span>
  </a>`).join('')}
</nav></div>`;
}

export function split({ media, body, reverse = false, cls = '' }) {
  return `<div class="split ${reverse ? 'is-reverse' : ''} ${cls}">
  <div class="split-media" data-reveal="clip">${media}</div>
  <div class="split-body prose" data-reveal="up">${body}</div>
</div>`;
}

export function frame(src, alt, { caption, pos, ratio = '4/5', parallax = '0.08', badge } = {}) {
  return `<figure class="frame" style="--ratio:${ratio}">
  <div class="frame-img">${img(src, alt, { pos, parallax })}</div>
  ${badge ? `<span class="frame-badge">${badge}</span>` : ''}
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>`;
}

// Image card used for pillars, temples, attractions, sevas.
export function card({ img: src, alt = '', title, text, href, tag, icon: ic, cta, pos, meta }) {
  const linkOpen = href ? `<a class="card-link" href="${href}"${isExt(href) ? ' data-external' : ''}>` : '';
  return `<article class="card" data-tilt>
  ${src ? `<div class="card-media">${img(src, alt, { pos })}</div>` : ''}
  <div class="card-body">
    ${ic ? `<span class="card-icon">${icon(ic, 26)}</span>` : ''}
    ${tag ? `<span class="tag">${tag}</span>` : ''}
    <h3>${href ? `${linkOpen}${title}</a>` : title}</h3>
    ${text ? `<p>${text}</p>` : ''}
    ${meta ? `<div class="card-meta">${meta}</div>` : ''}
    ${href && cta !== false ? `<span class="card-cta" aria-hidden="true">${cta || 'Know more'} ${icon('arrow', 15)}</span>` : ''}
  </div>
</article>`;
}

export function cards(list, cols = 3, cls = '') {
  return `<div class="grid grid-${cols} ${cls}" data-stagger>${list.map(card).join('')}</div>`;
}

// Tall photographic tile with text over a gradient (temples, attractions).
export function photoTile({ img: src, title, text, href, tag, pos }) {
  return `<a class="photo-tile" href="${href}"${isExt(href) ? ' data-external' : ''}>
  ${img(src, '', { pos })}
  <span class="pt-body">${tag ? `<span class="tag tag-light">${tag}</span>` : ''}<b>${title}</b>${text ? `<span class="pt-text">${text}</span>` : ''}</span>
</a>`;
}

export function stats(items, light = false) {
  return `<dl class="stats ${light ? 'is-light' : ''}" data-stagger>${items.map(([n, label, suffix = '']) => {
    const num = String(n).replace(/[^\d.]/g, '');
    const counted = /^\d[\d,]*$/.test(String(n)) ? ` data-count="${num}"` : '';
    return `<div class="stat"><dt><span${counted}>${n}</span>${suffix}</dt><dd>${label}</dd></div>`;
  }).join('')}</dl>`;
}

export function ctaBand({ title, text, actions, image }) {
  return `<section class="cta-band">
  <div class="wrap">
    <div class="cta-box" data-reveal="scale">
      ${image ? `<div class="cta-bg">${img(image, '')}</div>` : ''}
      <svg class="cta-mandala" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
      <div class="cta-copy"><h2 data-split>${title}</h2>${text ? `<p>${text}</p>` : ''}</div>
      <div class="cta-actions">${actions}</div>
    </div>
  </div>
</section>`;
}

// Lightbox gallery: clicking any figure opens the full-size image.
export function gallery(items, cls = '') {
  return `<div class="gallery ${cls}" data-gallery data-stagger>${items.map((g, i) => {
    const [src, alt = '', caption = ''] = Array.isArray(g) ? g : [g.src, g.alt, g.caption];
    return `<button class="g-item" type="button" data-full="${src}" data-caption="${esc(caption || alt)}" aria-label="Open image ${i + 1}${alt ? ': ' + esc(alt) : ''}">${img(src, alt)}</button>`;
  }).join('')}</div>`;
}

// Click-to-load YouTube (no iframe until the visitor asks for it).
export function video({ id, title, thumb, cls = '' }) {
  const poster = thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return `<div class="video ${cls}" data-yt="${id}" data-title="${esc(title)}">
  ${img(poster, '')}
  <button type="button" class="video-play" aria-label="Play video: ${esc(title)}">${icon('play', 28)}</button>
  <span class="video-title">${title}</span>
</div>`;
}

export function timeline(items) {
  return `<ol class="timeline" data-timeline>
  <span class="tl-line" aria-hidden="true"><span class="tl-progress"></span></span>
  ${items.map(([year, text]) => `<li class="tl-item" data-reveal="up"><span class="tl-year">${year}</span><span class="tl-dot" aria-hidden="true"></span><p>${text}</p></li>`).join('')}
</ol>`;
}

export function accordion(items) {
  return `<div class="accordion">${items.map(([q, a], i) => `<details class="acc"${i === 0 ? ' open' : ''}>
  <summary><span>${q}</span>${icon('plus', 18)}</summary>
  <div class="acc-body">${a}</div>
</details>`).join('')}</div>`;
}

// Accessible tabs: [{ id, label, html }]
export function tabs(name, items) {
  return `<div class="tabs" data-tabs>
  <div class="tab-list" role="tablist" aria-label="${esc(name)}">${items.map((t, i) => `<button type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${t.icon ? icon(t.icon, 18) : ''}${t.label}</button>`).join('')}</div>
  ${items.map((t, i) => `<div class="tab-panel" role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}"${i ? ' hidden' : ''}>${t.html}</div>`).join('')}
</div>`;
}

export function chips(name, list, attr = 'data-filter') {
  return `<div class="chips" role="group" aria-label="${esc(name)}">${list.map(([value, label], i) => `<button type="button" class="chip" ${attr}="${value}" aria-pressed="${i === 0}">${label}</button>`).join('')}</div>`;
}

export function infoList(items) {
  return `<ul class="info-list">${items.map(([ic, label, value]) => `<li><span class="il-icon">${icon(ic, 20)}</span><span><b>${label}</b>${value}</span></li>`).join('')}</ul>`;
}

export function hoursCard(key, title, rows, { img: src, note } = {}) {
  return `<article class="hours-card" data-reveal="up">
  ${src ? `<span class="hc-img">${img(src, '')}</span>` : `<span class="hc-img hc-icon">${icon('clock', 28)}</span>`}
  <div>
    <h3>${title}</h3>
    <dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
    ${key ? `<span class="badge" data-badge="${key}">Checking…</span>` : ''}
    ${note ? `<small>${note}</small>` : ''}
  </div>
</article>`;
}

export function marquee(words) {
  const row = words.map((w) => `<span>${w}</span><span class="mq-dot" aria-hidden="true">✦</span>`).join('');
  return `<div class="marquee" aria-hidden="true"><div class="mq-track">${row}${row}</div></div>`;
}

export function shareRow(text, url) {
  const t = encodeURIComponent(text), u = encodeURIComponent(url);
  return `<div class="share">
  <a href="https://wa.me/?text=${t}%20${u}" aria-label="Share on WhatsApp">${icon('wa', 16)}</a>
  <a href="https://www.facebook.com/sharer/sharer.php?u=${u}" aria-label="Share on Facebook">${icon('fb', 16)}</a>
  <a href="https://t.me/share/url?url=${u}&amp;text=${t}" aria-label="Share on Telegram">${icon('tg', 16)}</a>
</div>`;
}

export { icon, esc };
