// Build-time translation engine.
//
// The English site is the source. Each built page is split into translatable
// segments: runs of text between block-level tags, with inline markup kept as
// numbered placeholders (<1>…</1>, <2/>), plus translatable attributes (alt,
// aria-label, title, placeholder, data-caption…, meta descriptions). Each
// language has a dictionary { englishSegment: translation } in
// src/i18n/<lang>/*.json. The build swaps segments for translations, falls back
// to English for anything missing or failing QA, and reports coverage.
//
// QA per translation (ported from the Emerald Haven translation checks):
//   - placeholders must match exactly (same set, same nesting)
//   - every number in the source must survive (dates, timings, phones, counts)
//   - text must contain the target script (unless kept identical, e.g. a name)

export const LANGS = [
  { code: 'en', name: 'English', native: 'English', script: null, dir: '' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: /[ಀ-೿]/, dir: 'kn/', fonts: ['Noto Sans Kannada', 'Noto Serif Kannada'] },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', script: /[ऀ-ॿ]/, dir: 'hi/', fonts: ['Noto Sans Devanagari', 'Noto Serif Devanagari'] },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: /[஀-௿]/, dir: 'ta/', fonts: ['Noto Sans Tamil', 'Noto Serif Tamil'] },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', script: /[ఀ-౿]/, dir: 'te/', fonts: ['Noto Sans Telugu', 'Noto Serif Telugu'] },
];

const BLOCK = new Set(('html head body main header footer nav section article aside div p h1 h2 h3 h4 h5 h6 ul ol li dl dt dd ' +
  'table thead tbody tfoot tr td th caption figure figcaption blockquote form fieldset legend label button select option optgroup ' +
  'details summary canvas iframe input textarea dialog picture video audio source track hr address pre title meta link noscript ' +
  'template object embed map area menu hgroup search output progress meter').split(' '));
const SKIP = new Set(['script', 'style', 'svg', 'template', 'textarea', 'code', 'pre', 'math']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// data-tag, data-ix-title, data-ep-title, data-extra, data-snap and data-copy-label hold text that page
// scripts show or announce (reel tags, video dialog titles, rail labels, copy confirmations).
export const ATTRS = ['alt', 'title', 'aria-label', 'placeholder', 'data-caption', 'data-title', 'data-note', 'data-name', 'data-q', 'aria-description', 'data-label', 'data-label-now', 'data-text',
  'data-tag', 'data-ix-title', 'data-ep-title', 'data-extra', 'data-snap', 'data-copy-label'];

const TOKEN = /<!--[\s\S]*?-->|<![^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
const hasLetter = (s) => /\p{L}/u.test(s);
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function tokenize(html) {
  const out = [];
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(html))) {
    if (m[5] !== undefined) out.push({ t: 'text', raw: m[0] });
    else if (m[0].startsWith('<!')) out.push({ t: 'comment', raw: m[0] });
    else out.push({ t: m[1] ? 'close' : 'open', name: m[2].toLowerCase(), attrs: m[3], self: !!m[4], raw: m[0] });
  }
  return out;
}

const notranslate = (attrs) => /\btranslate="no"|\bclass="[^"]*\bnotranslate\b/.test(attrs || '');
// Inside a block-level <svg>, only these elements hold translatable text; each
// one is its own segment (paths, defs, gradients and icon sprites stay as they are).
const SVG_TEXT = new Set(['text', 'tspan', 'textpath', 'title', 'desc']);

// Walk tokens, collecting inline runs. `onRun(tokens)` returns replacement raw text.
function walk(tokens, onRun) {
  const out = [];
  let run = [];
  let skipDepth = 0, skipName = '', noDepth = 0;
  let svgDepth = 0, svgText = 0;
  const stack = [];
  const flush = () => { if (run.length) { out.push(onRun(run)); run = []; } };
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (skipDepth) {
      if (tk.t === 'open' && tk.name === skipName && !tk.self) skipDepth++;
      if (tk.t === 'close' && tk.name === skipName) skipDepth--;
      if (run.length || skipName === 'svg') { /* svg inside a run is atomic */ }
      (run.atomic ? run.atomic : out).push?.call(run.atomic ? run.atomic : out, tk.raw);
      if (!skipDepth && run.atomic) { run.push({ t: 'atomic', raw: run.atomic.join('') }); run.atomic = null; }
      continue;
    }
    if (svgDepth && !noDepth) {
      const tag = tk.t === 'open' || tk.t === 'close';
      if (tag && tk.name === 'svg') {
        flush(); out.push(tk.raw);
        if (tk.t === 'open' && !tk.self) svgDepth++;
        else if (tk.t === 'close') { svgDepth--; if (!svgDepth) svgText = 0; }
        continue;
      }
      if (tag && SVG_TEXT.has(tk.name)) {
        flush(); out.push(tk.raw);
        if (tk.t === 'open' && !tk.self && notranslate(tk.attrs)) { noDepth = 1; stack.push(tk.name); }
        else if (tk.t === 'open' && !tk.self) svgText++;
        else if (tk.t === 'close') svgText = Math.max(0, svgText - 1);
        continue;
      }
      if (!svgText || tk.t === 'comment') { flush(); out.push(tk.raw); continue; }
      // inline content of a <text>/<tspan>/<textPath>/<title>/<desc>: handled below
    }
    if (tk.t === 'open' && SKIP.has(tk.name) && !tk.self) {
      // an inline <svg> (icon) inside a text run becomes one atomic placeholder
      const inRun = run.some((t) => t.t !== 'comment' && !(t.t === 'text' && !t.raw.trim()));
      if (tk.name === 'svg' && inRun && !noDepth) { run.atomic = [tk.raw]; skipDepth = 1; skipName = 'svg'; continue; }
      flush();
      // any other <svg> (diagram, map, chart, or an icon before the text): its
      // <text>, <title> and <desc> are translated, everything else is kept as is
      if (tk.name === 'svg' && !noDepth && !notranslate(tk.attrs)) { out.push(tk.raw); svgDepth = 1; svgText = 0; continue; }
      out.push(tk.raw); skipDepth = 1; skipName = tk.name; continue;
    }
    if (noDepth) {
      out.push(tk.raw);
      if (tk.t === 'open' && !tk.self && !VOID.has(tk.name)) stack.push(tk.name), noDepth++;
      if (tk.t === 'close') { stack.pop(); noDepth--; }
      continue;
    }
    if (tk.t === 'open' && notranslate(tk.attrs) && !VOID.has(tk.name) && !tk.self) {
      flush(); out.push(tk.raw); noDepth = 1; stack.push(tk.name); continue;
    }
    const isBlock = (tk.t === 'open' || tk.t === 'close') && BLOCK.has(tk.name);
    if (isBlock || tk.t === 'comment') { flush(); out.push(tk.raw); continue; }
    run.push(tk);
  }
  flush();
  return out.join('');
}

// Turn a run of tokens into { lead, key, trail, map } where key uses placeholders.
function encodeRun(run) {
  const toks = run.slice();
  const lead = [], trail = [];
  // peel leading/trailing whitespace, atomic icons, void tags and wrapping inline pairs
  const isWs = (t) => t.t === 'text' && !t.raw.trim();
  const isAtom = (t) => t.t === 'atomic' || (t.t === 'open' && (VOID.has(t.name) || t.self));
  let changed = true;
  while (changed && toks.length) {
    changed = false;
    while (toks.length && (isWs(toks[0]) || isAtom(toks[0]) || toks[0].t === 'comment')) { lead.push(toks.shift()); changed = true; }
    while (toks.length && (isWs(toks[toks.length - 1]) || isAtom(toks[toks.length - 1]) || toks[toks.length - 1].t === 'comment')) { trail.unshift(toks.pop()); changed = true; }
    if (toks.length >= 2 && toks[0].t === 'open' && toks[toks.length - 1].t === 'close' && toks[toks.length - 1].name === toks[0].name) {
      // only peel if the opening tag pairs with the final closing tag
      let depth = 0, pairsAtEnd = true;
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if (t.t === 'open' && t.name === toks[0].name && !t.self) depth++;
        if (t.t === 'close' && t.name === toks[0].name) { depth--; if (depth === 0 && i !== toks.length - 1) { pairsAtEnd = false; break; } }
      }
      if (pairsAtEnd) { lead.push(toks.shift()); trail.unshift(toks.pop()); changed = true; }
    }
  }
  const text = toks.filter((t) => t.t === 'text').map((t) => t.raw).join('');
  if (!toks.length || !hasLetter(text)) return null;
  const map = {};
  let n = 0;
  const stack = [];
  const parts = toks.map((t) => {
    if (t.t === 'text') return t.raw;
    if (t.t === 'comment') return '';
    if (t.t === 'atomic' || (t.t === 'open' && (VOID.has(t.name) || t.self))) { n++; map[`<${n}/>`] = t.raw; return `<${n}/>`; }
    if (t.t === 'open') { n++; stack.push(n); map[`<${n}>`] = t.raw; return `<${n}>`; }
    if (t.t === 'close') { const k = stack.pop() ?? ++n; map[`</${k}>`] = t.raw; return `</${k}>`; }
    return '';
  });
  return { lead: lead.map((t) => t.raw).join(''), trail: trail.map((t) => t.raw).join(''), key: norm(parts.join('')), map };
}

const decodeEntities = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const encodeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function eachAttr(tag, fn) {
  return tag.replace(new RegExp(`(\\s(?:${ATTRS.join('|')})=")([^"]*)(")`, 'g'), (all, a, v, b) => {
    const val = decodeEntities(v);
    if (!hasLetter(val) || /^https?:|^[\w.-]+\.(?:html|jpe?g|png|webp)$/.test(val)) return all;
    const r = fn(norm(val));
    return r === undefined ? all : a + encodeAttr(r) + b;
  });
}

// Collect every segment (text runs + attributes) from an English page.
export function extract(html) {
  const segs = new Map();
  const tokens = tokenize(html);
  walk(tokens, (run) => {
    const enc = encodeRun(run);
    if (enc) segs.set(enc.key, (segs.get(enc.key) || 0) + 1);
    return '';
  });
  for (const tk of tokens) {
    if (tk.t !== 'open') continue;
    if (tk.name === 'meta' && /(?:name="description"|property="og:(?:title|description)")/.test(tk.attrs)) {
      const c = /content="([^"]*)"/.exec(tk.attrs); if (c && hasLetter(c[1])) segs.set(norm(decodeEntities(c[1])), 1);
    }
    eachAttr(tk.raw, (v) => { segs.set(v, (segs.get(v) || 0) + 1); return undefined; });
  }
  return segs;
}

export function checkTranslation(src, tr, lang) {
  if (typeof tr !== 'string' || !tr.trim()) return 'empty';
  const ph = (s) => (s.match(/<\/?\d+\/?>/g) || []).sort().join(',');
  if (ph(src) !== ph(tr)) return 'placeholders';
  // placeholders become a space, so digits on either side of a tag stay two numbers ('1977</1><2>29')
  const nums = (s) => (s.replace(/<\/?\d+\/?>/g, ' ').match(/\d+/g) || []).sort().join(',');
  if (nums(src) !== nums(tr)) return 'numbers';
  if (lang.script && tr !== src && !lang.script.test(tr.replace(/<\/?\d+\/?>/g, ''))) return 'script';
  return null;
}

// Translate a page. Returns { html, total, hit, missing:Set, rejected:[] }.
export function translate(html, dict, lang) {
  const stats = { total: 0, hit: 0, missing: new Set(), rejected: [] };
  const lookup = (key) => {
    stats.total++;
    const tr = dict[key];
    if (tr === undefined) { stats.missing.add(key); return undefined; }
    const bad = checkTranslation(key, tr, lang);
    if (bad) { stats.rejected.push([key, bad]); return undefined; }
    stats.hit++;
    return tr;
  };
  const tokens = tokenize(html);
  let out = walk(tokens, (run) => {
    const enc = encodeRun(run);
    const raw = run.map((t) => t.raw).join('');
    if (!enc) return raw;
    const tr = lookup(enc.key);
    if (tr === undefined) return raw;
    const body = tr.replace(/<\/?\d+\/?>/g, (ph) => enc.map[ph] ?? '');
    return enc.lead + body + enc.trail;
  });
  // attributes and meta content
  out = out.replace(/<[a-zA-Z][^>]*>/g, (tag) => {
    let t = eachAttr(tag, (v) => lookup(v));
    if (/^<meta\b/.test(t) && /(?:name="description"|property="og:(?:title|description)")/.test(t)) {
      t = t.replace(/(content=")([^"]*)(")/, (all, a, v, b) => {
        const r = hasLetter(v) ? lookup(norm(decodeEntities(v))) : undefined;
        return r === undefined ? all : a + encodeAttr(r) + b;
      });
    }
    return t;
  });
  // <title> (head) is a block with plain text
  return { html: out, ...stats };
}

// JS string literals that hold UI text (used to localise page scripts).
// A literal passed straight to fmt() is always UI text, so it is extracted even when the heuristics
// below would skip it: one-word labels such as fmt('Copied') or fmt('Tomorrow').
const JS_STR = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
export function extractJs(code) {
  const out = new Set();
  for (const m of code.matchAll(JS_STR)) {
    const s = m[2];
    if (/\bfmt\($/.test(code.slice(Math.max(0, m.index - 4), m.index)) && /\p{L}/u.test(s) && !/[<>{}]|\$\{/.test(s)) { out.add(s.replace(/\\'/g, "'").replace(/\\"/g, '"')); continue; }
    if (/\$\{|^\s*$|^[\w.#\[\]=:\-\/ >*,()"']+$/.test(s) && !/\s/.test(s)) continue;
    if (!/\p{Lu}\p{Ll}+|\p{Ll}{3,} \p{Ll}{2,}|%\d.*\p{Ll}{3,}|\p{Ll}{3,}.*%\d/u.test(s) || /^(?:[a-z-]+:|\.|#|\[)|https?:|\.(?:js|css|html|webp|jpe?g|png)\b|^[a-z]+(?:[-_][a-z]+)+$/.test(s)) continue;
    if (/[<>{}]|=>|;/.test(s) || s === 'use strict') continue;
    out.add(s.replace(/\\'/g, "'").replace(/\\"/g, '"'));
  }
  return out;
}
export function translateJs(code, dict, lang) {
  return code.replace(JS_STR, (all, q, s) => {
    const key = s.replace(/\\'/g, "'").replace(/\\"/g, '"');
    const tr = dict[key];
    if (key === 'use strict' || tr === undefined || checkTranslation(key, tr, lang)) return all;
    return q + tr.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n') + q;
  });
}
