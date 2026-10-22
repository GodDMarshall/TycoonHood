// Global Reach — a dark night map of the world with golden threads drawn from
// the Ashram in Mysuru to the countries that have Datta Peetham centres.
//
//   import { worldMap } from '../features/world-map.mjs';
//   worldMap()                                  full map, legend, directory caption
//   worldMap({ compact: true, id: 'reach' })    homepage teaser: map + a few chips + link
//
// Place it inside a `.section-dark` section (the page supplies the <h2>) and
// add `features: ['world-map']` to the page module. Everything is computed
// here at build time: the dotted land (world-dots.mjs, generated from
// Natural Earth data), the arcs, their lengths and the animation timings.
// assets/css/features/world-map.css draws and animates it; the small script in
// assets/js/features/world-map.js starts it on view, pauses it off-screen and
// links the legend to the arcs. Without JS or with reduced motion the map is
// shown fully drawn and still.
//
// Honesty: destinations come from `countries` in data.mjs (the official
// centres filter). Each is placed at an approximate country centroid and
// labelled by country only; notes quote facts from dattapeetham.org.

import { countries, albums } from '../data.mjs';
import { links } from '../site.mjs';
import { icon, esc } from '../components.mjs';
import { MAP, project, decode, LAND, COUNTRY, GRATICULE } from './world-dots.mjs';

const ORIGIN = { lon: 76.64, lat: 12.30, name: 'Mysuru', country: 'India' };

const venue = (re) => (albums.find((a) => re.test(a.venue)) || {}).name;
const ASHRAM = 'An Ashram of Sri Swamiji';
const DIRECTORY = 'Listed in the official centres directory';

// Approximate country centroids (lon, lat), short on-map label, label offset
// from the node (dx, dy to the baseline, anchor; a 4th value draws a leader
// line, used for the tight European cluster) and a one-line note sourced from
// dattapeetham.org.
const PLACES = {
  US: { at: [-98.5, 39.5], short: 'United States', l: [-8, 4, 'end'], note: 'Eight Ashrams of Sri Swamiji, coordinated by Datta Yoga Center, USA' },
  GB: { at: [-1.8, 52.8], short: 'United Kingdom', l: [-19.4, 1.4, 'end', 1], note: ASHRAM },
  CA: { at: [-101, 57], short: 'Canada', l: [0, -11, 'middle'], note: ASHRAM },
  AU: { at: [134, -25], short: 'Australia', l: [0, 17, 'middle'], note: ASHRAM },
  NZ: { at: [172.6, -41.6], short: 'New Zealand', l: [-8, 12, 'end'], note: venue(/Auckland/) ? `${venue(/Auckland/)}, recorded live in Auckland` : DIRECTORY },
  DE: { at: [10.4, 51.2], short: 'Germany', l: [-48.6, 9.5, 'end', 1], note: ASHRAM },
  CH: { at: [8.2, 46.8], short: 'Switzerland', l: [-43.1, 8.8, 'end', 1], note: venue(/Davos/) ? `${venue(/Davos/)}, recorded live in Davos` : DIRECTORY },
  NL: { at: [5.3, 52.2], short: 'Netherlands', l: [-36.3, -13.4, 'end', 1], note: DIRECTORY },
  MY: { at: [102, 4.2], short: 'Malaysia', l: [9, 4, 'start'], note: ASHRAM },
  AE: { at: [54.2, 23.9], short: 'UAE', l: [-8, 4, 'end'], note: DIRECTORY },
  TT: { at: [-61.2, 10.6], short: 'Trinidad & Tobago', l: [0, 17, 'middle'], note: 'An Ashram, and an 85-ft Hanuman idol consecrated by Sri Swamiji' },
};
const ORIGIN_NOTE = 'Sri Ganapathy Sachchidananda Ashram, and over one hundred Ashram branches across India';
const TEASER = ['US', 'GB', 'AU', 'TT'];

// ---- timing (seconds) -----------------------------------------------------
const DRAW = 1.5;          // each arc draws in this long
const GAP = 0.26;          // next arc starts this much later
const START = 0.35;        // first arc after the map wakes
const TAIL = 44;           // bead tail length (viewBox units)
const TRAVEL = 0.7;        // share of each bead cycle spent travelling (matches CSS keyframes)
const EASE = [0.5, 0, 0.3, 1]; // bead easing (matches CSS)

const f1 = (n) => Math.round(n * 10) / 10;
const f2 = (n) => Math.round(n * 100) / 100;

// Time at which a cubic-bezier easing reaches progress y (bisection).
function easeTimeFor(y, [x1, y1, x2, y2]) {
  const bz = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const t = (lo + hi) / 2; if (bz(t, y1, y2) < y) lo = t; else hi = t; }
  return bz((lo + hi) / 2, x1, x2);
}

// ---- geometry (once per build) ---------------------------------------------
const O = project(ORIGIN.lon, ORIGIN.lat);

function quad(a, c, b, t) {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

const routes = countries.filter((c) => c.code !== 'IN' && PLACES[c.code]).map((c) => {
  const p = PLACES[c.code];
  const D = project(p.at[0], p.at[1]);
  const d = Math.hypot(D[0] - O[0], D[1] - O[1]);
  // Lift the control point straight up, so every thread rises out of Mysuru
  // and settles onto its country from above; short arcs curve relatively more,
  // and no apex may leave the top of the map.
  const mid = [(O[0] + D[0]) / 2, (O[1] + D[1]) / 2];
  const lift = Math.min(d * 0.36 + 30, mid[1] - (88 - O[1] - D[1]) / 2);
  const C = [mid[0], mid[1] - lift];
  const pts = [];
  for (let i = 0; i <= 48; i++) pts.push(quad(O, C, D, i / 48));
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return { ...c, ...p, D, C, d, pts, len };
});

// Arcs draw nearest-first, so the light ripples outward from Mysuru.
[...routes].sort((a, b) => a.d - b.d).forEach((r, i) => {
  r.delay = START + i * GAP;
  r.land = r.delay + DRAW;
  const travel = 1.9 + r.len / 170;             // calm, roughly constant speed
  r.cycle = travel / TRAVEL + (i % 3) * 0.35;  // slightly different periods so beads never sync
  r.run = r.land + 0.15;
  // the bead's head reaches the destination at this point of its cycle
  // (CSS spends the first TRAVEL share of every cycle travelling, eased)
  r.ping = r.run + easeTimeFor(r.len / (r.len + TAIL), EASE) * TRAVEL * r.cycle;
});
const LAST = Math.max(...routes.map((r) => r.land));

// Land dots: one dashed path per row-run; a 0-length dash with round caps is a dot.
function dotPath(encoded) {
  const s = MAP.step;
  return decode(encoded).map(([r, runs]) => runs.map(([c, n]) => `M${f1(MAP.ox + c * s)} ${f1(MAP.oy + r * s)}h${f1((n - 1) * s + 1)}`).join('')).join('');
}
function dotList(encoded) {
  const out = [];
  for (const [r, runs] of decode(encoded)) for (const [c, n] of runs) for (let k = 0; k < n; k++) out.push([MAP.ox + (c + k) * MAP.step, MAP.oy + r * MAP.step]);
  return out;
}
const LAND_D = dotPath(LAND);
const COUNTRY_D = Object.fromEntries(Object.entries(COUNTRY).map(([k, v]) => [k, dotPath(v)]));

// Dots the threads pass over get a soft twinkle: every other one, dealt into
// a few phase groups (one dotted path each) so neighbours never pulse together.
const PHASES = 5;
const TWINKLE = (() => {
  const near = new Map();
  const lim = MAP.step * 1.25;
  for (const [x, y] of dotList(LAND)) {
    for (const r of routes) {
      if (r.pts.some(([px, py]) => Math.abs(px - x) < lim && Math.abs(py - y) < lim)) { near.set(`${x},${y}`, [x, y]); break; }
    }
  }
  const groups = Array.from({ length: PHASES }, () => []);
  [...near.values()].filter((_, i) => i % 2 === 0).forEach(([x, y], i) => groups[(i * 3 + Math.floor(i / 7)) % PHASES].push(`M${f1(x)} ${f1(y)}h1`));
  return groups.map((g) => g.join(''));
})();

// ---- markup -------------------------------------------------------------------
function defs(id) {
  return `<defs>
    <radialGradient id="${id}-land" gradientUnits="userSpaceOnUse" cx="${f1(O[0])}" cy="${f1(O[1])}" r="620">
      <stop class="wm-s-hot" offset="0"/><stop class="wm-s-warm" offset=".28"/><stop class="wm-s-cool" offset="1"/>
    </radialGradient>
    <linearGradient id="${id}-fx" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000"/><stop offset=".07" stop-color="#fff"/><stop offset=".93" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <linearGradient id="${id}-fy" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".12" stop-color="#fff"/><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="${id}-mx" maskUnits="userSpaceOnUse" x="0" y="0" width="${MAP.w}" height="${MAP.h}"><rect width="${MAP.w}" height="${MAP.h}" fill="url(#${id}-fx)"/></mask>
    <mask id="${id}-my" maskUnits="userSpaceOnUse" x="0" y="0" width="${MAP.w}" height="${MAP.h}"><rect width="${MAP.w}" height="${MAP.h}" fill="url(#${id}-fy)"/></mask>
    <radialGradient id="${id}-sun" gradientUnits="userSpaceOnUse" cx="${f1(O[0])}" cy="${f1(O[1])}" r="210">
      <stop class="wm-s-sun0" offset="0"/><stop class="wm-s-sun1" offset=".35"/><stop class="wm-s-sun2" offset="1"/>
    </radialGradient>
  </defs>`;
}

function base(id) {
  const lit = Object.entries(COUNTRY_D).filter(([k]) => k !== 'IN').map(([k, d]) => {
    const r = routes.find((x) => x.code === k);
    return r ? `<path class="wm-cdots" data-code="${k}" d="${d}" style="--land:${f2(r.land)}s"/>` : '';
  }).join('');
  return `<svg class="wm-base" viewBox="0 0 ${MAP.w} ${MAP.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
  ${defs(id)}
  <rect class="wm-sun" width="${MAP.w}" height="${MAP.h}" fill="url(#${id}-sun)"/>
  <g mask="url(#${id}-mx)"><g mask="url(#${id}-my)">
    <path class="wm-grat" d="${GRATICULE}"/>
    <path class="wm-land" d="${LAND_D}" stroke="url(#${id}-land)"/>
    ${COUNTRY_D.IN ? `<path class="wm-india" d="${COUNTRY_D.IN}"/>` : ''}
    ${lit}
  </g></g>
</svg>`;
}

function route(r, id) {
  const P = `d="M${f1(O[0])} ${f1(O[1])}Q${f1(r.C[0])} ${f1(r.C[1])} ${f1(r.D[0])} ${f1(r.D[1])}"`;
  const L = f1(r.len);
  // three stacked dashes share one travelling front: a long faint tail, a
  // shorter brighter one and a round bead of light at the head
  const bead = (cls, t) => `<path class="wm-bead ${cls}" ${P} style="stroke-dasharray:${t} ${f1(r.len + TAIL + t + 4)};--o0:${t};--o1:${f1(t - r.len - TAIL)}"/>`;
  return `<g class="wm-route" data-code="${r.code}" style="--len:${L};--delay:${f2(r.delay)}s;--run:${f2(r.run)}s;--cycle:${f2(r.cycle)}s">
    <linearGradient id="${id}-a-${r.code}" gradientUnits="userSpaceOnUse" x1="${f1(O[0])}" y1="${f1(O[1])}" x2="${f1(r.D[0])}" y2="${f1(r.D[1])}"><stop class="wm-s-a0" offset="0"/><stop class="wm-s-a1" offset=".55"/><stop class="wm-s-a2" offset="1"/></linearGradient>
    <path class="wm-arc-glow" ${P}/>
    <path class="wm-arc" ${P} stroke="url(#${id}-a-${r.code})"/>
    <g class="wm-beads">${bead('wm-tail', TAIL)}${bead('wm-tail2', 18)}${bead('wm-head-glow', 0.1)}${bead('wm-head', 0.1)}</g>
  </g>`;
}

function node(r, id) {
  const [dx, dy, anchor, leader] = r.l;
  // leader: from just outside the pin to just past the label's end, at mid cap-height
  const ex = dx + 3, ey = dy - 3.2, k = 4.2 / Math.hypot(ex, ey);
  return `<g class="wm-node" data-code="${r.code}" transform="translate(${f1(r.D[0])} ${f1(r.D[1])})" style="--land:${f2(r.land)}s;--ping:${f2(r.ping)}s;--cycle:${f2(r.cycle)}s">
    <circle class="wm-hit" r="13"/>
    ${leader ? `<path class="wm-leader" d="M${f1(ex * k)} ${f1(ey * k)}L${f1(ex)} ${f1(ey)}"/>` : ''}
    <circle class="wm-ring" r="4"/>
    <g class="wm-pop"><circle class="wm-glow" r="9" fill="url(#${id}-ng)"/><circle class="wm-pin" r="2.6"/></g>
    <text class="wm-label" x="${dx}" y="${dy}" text-anchor="${anchor}">${esc(r.short)}</text>
  </g>`;
}

function fx(id) {
  const names = routes.map((r) => r.name);
  return `<svg class="wm-fx" viewBox="0 0 ${MAP.w} ${MAP.h}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false">
  <title id="${id}-t">World map of the Peetham’s reach</title>
  <desc id="${id}-d">Golden threads run from Mysuru, India to ${names.length} countries with Datta Peetham centres: ${esc(names.join(', '))}. Positions are approximate and shown by country only.</desc>
  <defs>
    <radialGradient id="${id}-ng"><stop class="wm-s-n0" offset="0"/><stop class="wm-s-n1" offset=".45"/><stop class="wm-s-n2" offset="1"/></radialGradient>
    <radialGradient id="${id}-halo"><stop class="wm-s-h0" offset="0"/><stop class="wm-s-h1" offset=".5"/><stop class="wm-s-h2" offset="1"/></radialGradient>
  </defs>
  <g class="wm-twinkles">${TWINKLE.map((d, i) => `<path d="${d}" style="--tw:${f2(LAST * 0.5 + i * 0.97)}s"/>`).join('')}</g>
  <g class="wm-routes">${routes.map((r) => route(r, id)).join('')}</g>
  <g class="wm-nodes">${routes.map((r) => node(r, id)).join('')}</g>
  <g class="wm-origin" transform="translate(${f1(O[0])} ${f1(O[1])})">
    <circle class="wm-halo" r="34" fill="url(#${id}-halo)"/>
    <circle class="wm-ripple" r="6"/><circle class="wm-ripple r2" r="6"/>
    <circle class="wm-core-glow" r="10" fill="url(#${id}-ng)"/>
    <circle class="wm-core" r="3.4"/>
    <text class="wm-origin-label" y="21" text-anchor="middle"><tspan class="wm-ol-city">${ORIGIN.name}</tspan><tspan class="wm-ol-country" x="0" dy="11">${ORIGIN.country}</tspan></text>
  </g>
</svg>`;
}

function legendFull() {
  const items = routes.map((r) => `<li><button type="button" class="wm-key" data-code="${r.code}" data-name="${esc(r.name)}" data-note="${esc(r.note)}" aria-pressed="false">
      <span class="wm-key-mark" aria-hidden="true">${r.code === 'GB' ? 'UK' : r.code}</span>
      <span class="wm-key-text"><b>${esc(r.name)}</b><small>${esc(r.note)}</small></span>
    </button></li>`).join('');
  return `<div class="wm-legend">
    <p class="wm-legend-hint">${icon('globe', 16)}<span><b>${routes.length} countries</b> beyond India. Choose one to trace its thread.</span></p>
    <ul class="wm-keys" data-stagger>
      ${items}
      <li><a class="wm-key wm-key-link" href="${links.ashramCenters}"><span class="wm-key-mark" aria-hidden="true">${icon('pin', 17)}</span><span class="wm-key-text"><b>Find a centre</b><small>Addresses and contacts on the official directory</small></span>${icon('arrow-up-right', 16)}</a></li>
    </ul>
  </div>`;
}

function legendCompact() {
  const pick = TEASER.map((c) => routes.find((r) => r.code === c)).filter(Boolean);
  const more = routes.length - pick.length;
  return `<div class="wm-teaser">
    <ul class="wm-chips" aria-label="Some of the countries with centres">
      ${pick.map((r) => `<li><button type="button" class="wm-chip" data-code="${r.code}" data-name="${esc(r.name)}" data-note="${esc(r.note)}" aria-pressed="false"><i aria-hidden="true"></i>${esc(r.name)}</button></li>`).join('')}
      ${more > 0 ? `<li><a class="wm-chip wm-more" href="centers.html">+${more} more</a></li>` : ''}
    </ul>
    <a class="btn btn-ghost wm-cta" href="centers.html"><span>Explore our global reach</span>${icon('arrow', 16)}</a>
  </div>`;
}

export function worldMap({ compact = false, id = 'global-reach' } = {}) {
  const readout = compact ? '' : `<div class="wm-readout glass" aria-hidden="true">
      <span class="wm-ro-eyebrow" data-wm-eyebrow>From the Ashram</span>
      <b class="wm-ro-name" data-wm-name>${ORIGIN.name}, ${ORIGIN.country}</b>
      <span class="wm-ro-note" data-wm-note>${ORIGIN_NOTE}.</span>
    </div>`;
  const caption = compact
    ? `<figcaption class="wm-caption">Illustrative map · positions approximate, shown by country</figcaption>`
    : `<figcaption class="wm-caption">${icon('info', 15)}<span>Illustrative map, not to scale: positions are approximate and shown by country only. Centre addresses, contacts and programmes are on the <a href="${links.ashramCenters}">official Ashram Centres directory${icon('arrow-up-right', 13)}</a>.</span></figcaption>`;
  const canvas = `<div class="wm-canvas">
      <div class="wm-stage" style="--ar:${MAP.w}/${MAP.h}">
        ${base(id)}
        ${fx(id)}
      </div>
      ${readout}
    </div>`;
  // full: the caption closes the figure as a footnote under the legend, so on
  // a phone the map, readout and country buttons sit together on one screen
  return `<div class="wm ${compact ? 'wm-compact' : 'wm-full'}" id="${id}" data-world-map>
  <figure class="wm-figure">
    ${canvas}
    ${compact ? caption : `${legendFull()}\n    ${caption}`}
  </figure>
  ${compact ? legendCompact() : ''}
</div>`;
}

// For pages that want to quote the count (e.g. "11 countries beyond India").
export const reachCount = routes.length;
