// Devotion motion: markup helpers for the motifs drawn from acts of worship.
//
// Every helper returns an HTML string. Each motif is decorative
// (aria-hidden, no text, nothing to translate) and is brought to life by
// assets/js/devotion-motion.js through its data-devotion attribute; its
// styles are in assets/css/devotion-motion.css. Without JavaScript, and
// under prefers-reduced-motion, every motif shows its finished state: the
// lamps lit, the lotus open, the kolam drawn.
//
//   deepaRow()       a row of brass diyas lit one after another (deepa aradhana)
//   deepaDivider()   the same row between two gold hairlines, as a section divider
//   lampChain()      Guru Parampara: a lamp lit from a lamp, light travelling with scroll
//   lampChainAttrs() the same, attached to an existing list (timeline, lineage)
//   flame()          one small flame, for tips and accents
//   pushpanjali()    marigold petals and jasmine drifting down (small pre-drawn elements)
//   dhoopa()         incense smoke rising and curling (canvas)
//   aarti()          a flame tracing a slow clockwise circle around a focal element
//   aartiAround()    wraps an <img>/<svg> so the aarti circles exactly it
//   padma()          a lotus that blooms when it enters view
//   padmaOrnament()  swaps the gold ornament in a sectionHead() string for the lotus
//   kolam()          a dot-grid sikku kolam that draws itself as you scroll
//   nada()           rings of light that breathe, and pulse with the flute music
//   JYOTI_ATTR       on .scroll-progress: a small flame at the reading line's tip
//   ghanta()         a hanging temple bell that swings on entry and on 'dp:bell'
//
// Layer motifs (pushpanjali, dhoopa, nada with layer 'behind') fill their host:
// give the host section the DV_HOST class (position: relative; isolation:
// isolate) so they sit above the section's background and below its content.
// The integration plan, page by page, is docs/DEVOTION-PLAN.md.

export const DEVOTION_CSS = 'assets/css/devotion-motion.css';
export const DEVOTION_JS = 'assets/js/devotion-motion.js';
export const DV_HOST = 'dv-host';

const TONES = { light: 'dv-on-light', dark: 'dv-on-dark', auto: '' };
const tone = (t = 'auto') => TONES[t] ?? '';
const cx = (...c) => c.filter(Boolean).join(' ');
const r2 = (v) => +v.toFixed(2);

// Deterministic variation (same markup on every build): a small hash of an index.
function vary(i, salt = 1) {
  let x = (i + 1) * 374761393 + salt * 668265263;
  x = (x ^ (x >>> 13)) * 1274126177;
  return (((x ^ (x >>> 16)) >>> 0) % 1000) / 1000;
}

// One flame: halo (::before), tongue (::after) and white-hot core (<i>).
// --fd: flicker period, --fo: phase offset, so no two flames move together.
export function flame({ size, cls = '', i = 0 } = {}) {
  const fd = r2(2.6 + vary(i, 3) * 1.4), fo = r2(-vary(i, 5) * 4), cd = r2(1.7 + vary(i, 7) * 0.9);
  return `<span class="${cx('dv-flame', cls)}" style="--fd:${fd}s;--fo:${fo}s;--cd:${cd}s${size ? `;--dv-s:${size}px` : ''}"><i></i></span>`;
}

const lamp = (i, extra = '') => `<span class="dv-lamp" style="--i:${i}"${extra}>${flame({ i })}<span class="dv-diya"></span></span>`;

const SIZES = { sm: 26, md: 34, lg: 44 };
// --dv-s0 is the size asked for; the CSS shrinks it (--dv-s) so a row never outgrows a phone screen
const sizeVar = (size) => `--dv-s0:${SIZES[size] || +size || SIZES.md}px`;

/**
 * deepaRow — brass diyas whose flames ignite one after another when the row
 * scrolls into view, with a warm glow that grows as each is lit.
 * @param {object} o
 * @param {number} [o.count=5]     lamps (1–16; odd counts keep a centre lamp)
 * @param {'center'|'ltr'} [o.order='center']  centre first then pairs outward, or left to right
 * @param {'auto'|'light'|'dark'} [o.tone='auto']  auto follows the section
 * @param {'sm'|'md'|'lg'|number} [o.size='md']
 * @param {boolean} [o.rule=false] gold hairlines either side (divider form)
 * @param {number} [o.wrap]        on phones (≤ 640px) wrap into rows of this many lamps (for long rows, e.g. 16 → 8)
 * @param {'center'|'start'} [o.align='center']
 */
export function deepaRow({ count = 5, order = 'center', tone: t, size = 'md', rule = false, wrap, align = 'center', cls = '' } = {}) {
  const n = Math.max(1, Math.min(16, count | 0));
  const mid = (n - 1) / 2;
  // ignition step for each lamp: centre first then pairs outward, or left to right
  const step = (i) => (order === 'ltr' ? i : Math.round(Math.abs(i - mid) * 2) - (n % 2 ? 0 : 1));
  const w = wrap && wrap < n ? wrap | 0 : 0;
  return `<div class="${cx('dv', 'dv-deepa', rule && 'dv-deepa--rule', w && 'dv-deepa--wrap', align === 'start' && 'dv-deepa--start', tone(t), cls)}" data-devotion="deepa-row" data-order="${order === 'ltr' ? 'ltr' : 'center'}" style="--n:${n};${w ? `--dv-wrap:${w};` : ''}${sizeVar(size)}" aria-hidden="true">
  ${rule ? '<span class="dv-rule"></span>' : ''}<span class="dv-deepa-lamps">${Array.from({ length: n }, (_, i) => lamp(i, ` data-step="${Math.max(0, step(i))}"`)).join('')}</span>${rule ? '<span class="dv-rule"></span>' : ''}
</div>`;
}

/** deepaDivider — a deepa row between hairlines, for the seam between two sections. */
export function deepaDivider({ count = 3, tone: t, size = 'sm', cls = '' } = {}) {
  return `<div class="${cx('dv-divider', cls)}">${deepaRow({ count, tone: t, size, rule: true })}</div>`;
}

/**
 * lampChain — "a lamp lit from a lamp": a line of lamps along which light
 * travels with scroll; each lamp kindles from the flame that reaches it.
 * The light never goes back: lamps once lit stay lit.
 * @param {object} o
 * @param {number} [o.count=5]
 * @param {'x'|'y'} [o.axis='x']   horizontal row, or vertical column (fills its height)
 * @param {string} [o.range]       data-range "start,end" as viewport fractions (default 0.85,0.4)
 */
export function lampChain({ count = 5, axis = 'x', tone: t, size = 'md', range, cls = '' } = {}) {
  const n = Math.max(2, Math.min(12, count | 0));
  return `<div class="${cx('dv', 'dv-chain', axis === 'y' ? 'dv-chain--y' : 'dv-chain--x', tone(t), cls)}" data-devotion="lamp-chain"${range ? ` data-range="${range}"` : ''} style="--n:${n};${sizeVar(size)}" aria-hidden="true">
  <span class="dv-chain-line"><i class="dv-chain-fill"></i><span class="dv-chain-run"><span class="dv-chain-tip">${flame({ i: 99, cls: 'dv-flame--taper' })}</span></span></span>
  ${Array.from({ length: n }, (_, i) => lamp(i)).join('')}
</div>`;
}

/**
 * lampChainAttrs — attributes for an EXISTING list (the Sri Swamiji timeline,
 * the Guru Parampara thread): each node gets a small lamp that is lit as the
 * reading line (a fraction of the viewport height) passes it.
 * @param {object} o
 * @param {string} o.nodes          selector of the node elements inside the list (each must be positioned)
 * @param {number} [o.line=0.62]    reading line, fraction of viewport height from the top
 * @param {boolean} [o.diya=false]  a brass diya under each flame (true), or the flame alone
 * @param {'top'|'center'|'bottom'|'below'} [o.at='center'] where the lamp sits: on the node, or 'below' it
 *        (a sibling centred under the node: use it when the node clips its content; its parent must be positioned)
 * @param {number} [o.size]  lamp size in px (default 30)
 * @param {number} [o.gap]   with 'below': px between the node's bottom edge and the lamp's base line
 * @param {'line'|'sequence'} [o.order='line']  'sequence' for a row of nodes at one height: when the
 *        list comes into view the lamps are lit one after another in document order
 */
export function lampChainAttrs({ nodes, line = 0.62, diya = false, at = 'center', size, gap, order }) {
  return ` data-devotion="lamp-chain" data-nodes="${nodes}" data-line="${line}" data-at="${at}"${diya ? ' data-diya' : ''}${size ? ` data-size="${size}"` : ''}${gap ? ` data-gap="${gap}"` : ''}${order === 'sequence' ? ' data-order="sequence"' : ''}`;
}

/**
 * pushpanjali — an offering of flowers: marigold petals and jasmine buds
 * drifting down with depth and soft tumbling. A gentle shower when the host
 * first comes into view, then sparse; scrolling stirs a few more.
 * Each petal is a small pre-drawn element moved by transform/opacity only.
 * Put it inside a host with DV_HOST.
 * @param {object} o
 * @param {number} [o.density=1]   0.5 sparser … 1.5 fuller
 * @param {boolean} [o.shower=true] the welcoming shower on first view
 * @param {'behind'|'front'} [o.layer='behind']  front only over imagery, never over body text
 */
export function pushpanjali({ density = 1, shower = true, layer = 'behind', cls = '' } = {}) {
  return `<span class="${cx('dv-layer', 'dv-pushpanjali', layer === 'front' && 'dv-front', cls)}" data-devotion="pushpanjali" data-density="${density}"${shower ? '' : ' data-shower="off"'} aria-hidden="true"></span>`;
}

/**
 * dhoopa — incense smoke: thin wisps rising from an incense stick and curling
 * as they climb, at very low opacity. For dark sections.
 * @param {object} o
 * @param {'left'|'right'|'center'} [o.from='left']  where the stick stands
 * @param {number} [o.wisps=3]
 * @param {boolean} [o.stick=true]  draw the stick and its glowing tip
 * @param {string} [o.height]   CSS height of the smoke's area (default: the whole host); the stick stands at its foot
 * @param {'top'|'bottom'} [o.at='bottom']  with height: keep the area at the host's top or bottom
 * @param {string} [o.width='480px']  the smoke's column (at most 60 % of the host), on the `from` side
 */
export function dhoopa({ from = 'left', wisps = 3, stick = true, at, height, width, cls = '' } = {}) {
  const css = [height && (at === 'top' ? 'top:0;bottom:auto' : 'top:auto;bottom:0'), height && `height:${height}`, width && `--dv-dw:${width}`].filter(Boolean).join(';');
  const box = css ? ` style="${css}"` : '';
  return `<canvas class="${cx('dv-canvas', 'dv-dhoopa', cls)}" data-devotion="dhoopa" data-from="${from}" data-wisps="${wisps}"${stick ? '' : ' data-stick="off"'}${box} aria-hidden="true"></canvas>`;
}

/**
 * aarti — a small flame tracing a slow clockwise circle (pradakshina) around a
 * focal element, leaving a faint trail of light, then resting at the crown.
 * Place it INSIDE the focal element's positioned wrapper (a mandala, a deity
 * photograph, a portrait disc). Around a square or round element the path is
 * a circle; around a photograph the script turns it into an ellipse that
 * keeps --dv-gap from every edge (without JS: a circle of the element's height).
 * @param {object} o
 * @param {number} [o.gap=14]     px between the focal edge and the flame's path
 * @param {number} [o.period=8]   seconds per circle and rest
 * @param {number} [o.size=24]    lamp size the flame is drawn for (flame ≈ 0.3 × size wide)
 */
export function aarti({ gap = 14, period = 8, size = 24, cls = '' } = {}) {
  return `<span class="${cx('dv', 'dv-aarti', cls)}" data-devotion="aarti" style="--dv-gap:${gap}px;--dv-ap:${period}s" aria-hidden="true">
  <span class="dv-aarti-orbit"><span class="dv-aarti-ring"></span><span class="dv-aarti-tclip"><span class="dv-aarti-trail"></span></span>
  <span class="dv-aarti-arm"><span class="dv-aarti-hold"><span class="dv-aarti-lamp">${flame({ i: 42, size })}</span></span></span></span>
</span>`;
}

/** aartiAround — wraps a focal element (an <img>, an <svg>) so the aarti circles exactly it. */
export function aartiAround(inner, opts = {}) {
  return `<span class="dv-focal">${inner}${aarti(opts)}</span>`;
}

/**
 * padmaOrnament — swaps the first gold ornament (the <svg class="ornament"> that
 * sectionHead() and ornament() draw) in an HTML string for the blooming lotus.
 *   sectionHead({...})            → padmaOrnament(sectionHead({...}))
 */
export function padmaOrnament(html, { size = 56, tone: t, cls = '' } = {}) {
  return html.replace(/<svg class="ornament[^"]*"[\s\S]*?<\/svg>/, padma({ size, variant: 'ornament', tone: t, cls }));
}

// Lotus petal pointing up from the origin: length L, half-width w.
const petal = (L, w) => `M0 0C${r2(-w * 0.95)} ${r2(-L * 0.22)} ${r2(-w * 1.05)} ${r2(-L * 0.62)} 0 ${-L}C${r2(w * 1.05)} ${r2(-L * 0.62)} ${r2(w * 0.95)} ${r2(-L * 0.22)} 0 0Z`;

/**
 * padma — a lotus that blooms, petal by petal, when it enters view, with a
 * point of light (bindu) kindling above it. Line art in the site's gold.
 * @param {object} o
 * @param {number} [o.size=72]   width in px (height ≈ 0.62 × width)
 * @param {'bloom'|'ornament'} [o.variant='bloom']  'ornament' adds hairlines either side, a drop-in for ornament()
 */
export function padma({ size = 72, variant = 'bloom', tone: t, cls = '' } = {}) {
  // [angle°, length, half-width, layer]; back layer first so the front overlaps it
  const petals = [
    [-64, 30, 8, 'b'], [64, 30, 8, 'b'], [-34, 36, 9, 'b'], [34, 36, 9, 'b'],
    [-82, 24, 7, 'm'], [82, 24, 7, 'm'], [-48, 33, 9.5, 'm'], [48, 33, 9.5, 'm'], [-17, 38, 10, 'm'], [17, 38, 10, 'm'],
    [0, 42, 11, 'f'],
  ];
  const order = { b: 2, m: 1, f: 0 };
  const paths = petals.map(([a, L, w, layer]) => `<path class="dv-petal dv-petal--${layer}" style="--a:${a}deg;--o:${order[layer]}" d="${petal(L, w)}"/>`).join('');
  const lotus = `<svg class="dv-padma-svg" viewBox="-50 -50 100 62" focusable="false">
    <ellipse class="dv-padma-glow" cx="0" cy="-30" rx="26" ry="20"/>
    <g class="dv-padma-flower" transform="translate(0 4)">${paths}</g>
    <path class="dv-padma-base" d="M-30 7.5C-16 12 16 12 30 7.5M-20 11.5C-8 14.5 8 14.5 20 11.5"/>
    <circle class="dv-padma-bindu" cx="0" cy="-45" r="2.2"/>
  </svg>`;
  return `<span class="${cx('dv', 'dv-padma', variant === 'ornament' && 'dv-padma--ornament', tone(t), cls)}" data-devotion="padma" style="--dv-pw:${size}px" aria-hidden="true">${variant === 'ornament' ? `<span class="dv-rule"></span>${lotus}<span class="dv-rule"></span>` : lotus}</span>`;
}

/* ---------------- kolam geometry ----------------
   A sikku kolam is one unbroken line woven around a grid of dots (pulli).
   On a cols × rows grid it is the path of a ball bouncing at 45° inside the
   grid's frame (a mirror curve): it crosses between every pair of
   neighbouring dots and loops around the dots on the border. With cols and
   rows coprime the line closes on itself as a single loop. The polyline is
   then rounded: diagonal crossings inside, petal loops on the border. */
function gcd(a, b) { return b ? gcd(b, a % b) : a; }

function kolamLoops(a, b) {
  const W = 2 * a, H = 2 * b, seen = new Set(), loops = [];
  for (let sx = 1; sx < W; sx += 2) {
    if (seen.has(`${sx},0`)) continue;
    let x = sx, y = 0, dx = 1, dy = 1;
    const pts = [];
    for (let g = 0; g < 4 * W * H + 8; g++) {
      pts.push([x, y]); seen.add(`${x},${y}`);
      x += dx; y += dy;
      if (x <= 0 || x >= W) dx = -dx;
      if (y <= 0 || y >= H) dy = -dy;
      if (x === sx && y === 0) break;
    }
    loops.push(pts);
  }
  return loops;
}

function kolamRound(pts, a, b, rm = 0.75, rw = 1.12) {
  const W = 2 * a, H = 2 * b;
  const wall = ([x, y]) => x === 0 || y === 0 || x === W || y === H;
  const k = pts.findIndex((p) => !wall(p));
  const P = pts.slice(k).concat(pts.slice(0, k)), n = P.length, out = [];
  for (let i = 0; i < n;) {
    const p = P[i];
    let j = i + 1; const walls = [];
    while (wall(P[j % n])) { walls.push(P[j % n]); j++; }
    const q = P[j % n];
    const D = [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]]
      .filter(([x, y]) => x % 2 && y % 2)
      .find(([x, y]) => Math.abs(q[0] - x) + Math.abs(q[1] - y) === 1);
    const a0 = Math.atan2(p[1] - D[1], p[0] - D[0]);
    const m = walls.length ? walls[0] : q;
    const dir = Math.sign(Math.sin(Math.atan2(m[1] - D[1], m[0] - D[0]) - a0)) || 1;
    const steps = (walls.length + 1) * 2, span = (walls.length + 1) * Math.PI / 2;
    out.push(p);
    for (let s = 1; s < steps; s++) {
      const ang = a0 + dir * span * s / steps, edge = s === 1 || s === steps - 1;
      const r = s % 2 === 0 ? rw : walls.length ? (edge ? (rm + rw) / 2 : rw * 1.02) : rm;
      out.push([D[0] + r * Math.cos(ang), D[1] + r * Math.sin(ang)]);
    }
    i = j;
    if (j >= n) break;
  }
  return out;
}

// closed Catmull-Rom spline as cubic Béziers, in px (u = half the dot spacing)
function splinePath(pts, u, pad, t = 0.55) {
  const n = pts.length, f = (v) => r2(v), T = (p) => [pad + p[0] * u, pad + p[1] * u];
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = T(pts[(i - 1 + n) % n]), p1 = T(pts[i]), p2 = T(pts[(i + 1) % n]), p3 = T(pts[(i + 2) % n]);
    if (!i) d += `M${f(p1[0])} ${f(p1[1])}`;
    d += `C${f(p1[0] + (p2[0] - p0[0]) * t / 3)} ${f(p1[1] + (p2[1] - p0[1]) * t / 3)} ${f(p2[0] - (p3[0] - p1[0]) * t / 3)} ${f(p2[1] - (p3[1] - p1[1]) * t / 3)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

/**
 * kolam — a sikku kolam drawn at the threshold to welcome: first the dots,
 * then one unbroken line woven around them, drawn by your scrolling; when it
 * closes, a bead of light travels the line once.
 * @param {object} o
 * @param {number} [o.cols=5]  dots across
 * @param {number} [o.rows=4]  dots down (keep cols and rows coprime for one single line)
 * @param {number} [o.width]   max width in px (default cols × 44)
 * @param {string} [o.range]   "start,end" viewport fractions for the drawing (default 0.92,0.42)
 */
export function kolam({ cols = 5, rows = 4, width, range, tone: t, cls = '' } = {}) {
  const a = Math.max(2, cols | 0), b = Math.max(1, rows | 0), u = 12, pad = 8;
  const loops = kolamLoops(a, b);
  const w = 2 * a * u + 2 * pad, h = 2 * b * u + 2 * pad;
  const lines = loops.map((l) => splinePath(kolamRound(l, a, b), u, pad));
  const dots = [];
  for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) dots.push(`<circle cx="${pad + (2 * i + 1) * u}" cy="${pad + (2 * j + 1) * u}" r="1.9" style="--i:${j * a + i}"/>`);
  return `<div class="${cx('dv', 'dv-kolam', tone(t), cls)}" data-devotion="kolam"${range ? ` data-range="${range}"` : ''} data-loops="${loops.length}" style="--dv-kw:${width || a * 44}px;--dv-kn:${a * b}" aria-hidden="true">
  <svg viewBox="0 0 ${w} ${h}" focusable="false">
    <g class="dv-kolam-dots">${dots.join('')}</g>
    <g class="dv-kolam-line">${lines.map((d) => `<path pathLength="1000" d="${d}"/>`).join('')}</g>
    <g class="dv-kolam-bead">${lines.map((d) => `<path pathLength="1000" d="${d}"/>`).join('')}</g>
  </svg>
</div>`;
}
kolam.isSingleLine = (cols, rows) => gcd(cols, rows) === 1;

/**
 * nada — the primordial sound as light: a bindu with rings that breathe
 * outward. When the flute music is playing (DP.sound.level()), the rings and
 * the bindu pulse with it; otherwise they breathe slowly (about 8 s).
 * @param {object} o
 * @param {number} [o.size=220]  diameter in px
 * @param {'rings'|'string'} [o.variant='rings']  'string': three tanpura strings of light that shimmer
 * @param {'behind'} [o.layer]  rings centred behind the host's content (host needs DV_HOST); default: in the flow
 */
export function nada({ size = 220, variant = 'rings', layer, tone: t, cls = '' } = {}) {
  if (variant === 'string') {
    return `<canvas class="${cx('dv', 'dv-nada-string', tone(t), cls)}" data-devotion="nada" data-variant="string" aria-hidden="true"></canvas>`;
  }
  return `<span class="${cx('dv', 'dv-nada', layer === 'behind' && 'dv-nada--behind', tone(t), cls)}" data-devotion="nada" style="--dv-nd:${size}px" aria-hidden="true">
  <span class="dv-nada-pulse">${[0, 1, 2, 3, 4].map((i) => `<i class="dv-nada-ring" style="--i:${i}"></i>`).join('')}<i class="dv-nada-still"></i><i class="dv-nada-bindu"></i></span>
</span>`;
}

/** On the shared `.scroll-progress` element: the reading line carries a flame at its tip. */
export const JYOTI_ATTR = ' data-devotion="jyoti-progress"';

/**
 * ghanta — a small brass temple bell hanging on a chain. It swings once when
 * it first comes into view (a devotee rings the bell on entering), when the
 * sound engine rings a section bell ('dp:bell'), and when a pointer touches it.
 * Place it inside a positioned section; it hangs from the section's top edge.
 * @param {object} o
 * @param {'left'|'right'} [o.side='right']
 * @param {number} [o.drop=64]  chain length in px
 * @param {string} [o.inset]    CSS length from the side (default: the page gutter)
 */
export function ghanta({ side = 'right', drop = 64, inset, tone: t, cls = '' } = {}) {
  return `<span class="${cx('dv', 'dv-ghanta', side === 'left' ? 'dv-ghanta--left' : '', tone(t), cls)}" data-devotion="ghanta" style="--dv-drop:${drop}px${inset ? `;--dv-gi:${inset}` : ''}" aria-hidden="true">
  <span class="dv-ghanta-swing"><span class="dv-ghanta-chain"></span><span class="dv-ghanta-bell"><i class="dv-ghanta-clapper"></i></span></span><svg class="dv-ghanta-hum" viewBox="-1 -1 2 2" width="2" height="2" overflow="visible" focusable="false"><circle r="37.5"/></svg>
</span>`;
}
