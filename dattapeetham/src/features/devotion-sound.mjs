// Devotional sound: the flute music (an original bansuri composition in Raga
// Bhoopali, tuned to A = 432 Hz, made for this website) and the temple sounds
// while scrolling.
//
// Server-side markup helpers for src/layout.mjs. The runtime is
// src/assets/js/devotion-sound.js, the styles src/assets/css/devotion-sound.css.
// Everything here is inert without the script: the invitation and the control
// carry the `hidden` attribute, and the script removes it only when the browser
// can play sound (Web Audio + HTMLAudioElement). No audio is ever downloaded
// until the visitor turns the music on.
//
// Integration (src/layout.mjs):
//   head:     soundStyles()   after the site.css <link>
//   .intro:   soundInvite()   as the last child of <div class="intro">
//   body:     soundControl()  right after the skip link (position: fixed)
//   scripts:  soundScript()   after motion.js (before page scripts)
//   build:    SOUND_DEV_ONLY  audio files the script never requests stay out of the site
// Every visible or announced English string is listed in SOUND_STRINGS so the
// translation dictionaries can cover them (markup strings are picked up by
// `node build.mjs --extract`; runtime strings come from fmt() calls in the JS).
//
// Behaviour worth knowing (review stage, polish):
// - The invitation appears 1.5 s into the curtain (after its own animation) and
//   takes focus (a modal dialog). Unanswered for 4 s, or on a scroll, Escape or
//   a tap on the curtain, the curtain lifts (gone 6.4 s into it; it used to hold
//   ~10.4 s), focus returns to the start of the page, and the same choice
//   carries on as a small non-modal card above the sound button ("Would you
//   like flute music while you read?" · "Play flute music" · "Not now"), which
//   Tab reaches right after the skip link. A pointer resting on the choices, or
//   Tab between them, holds the curtain. The card is also how the choice is
//   offered when the script arrives after the CSS curtain has lifted (slow
//   connections: measured at 1.6 Mbps / 150 ms latency the deferred scripts
//   run at ~5.3 s and at 3G speeds at ~12 s, long after the curtain).
// - On screens below 1100px the button tucks away at the top of a page while
//   nothing sounds (at 360-768px it covered a page link or button on 10-14 of
//   the 16 pages, e.g. "Donate" on Seva at 360px). It returns once the reader
//   scrolls, when it gets keyboard focus, and whenever music is on or waiting.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const AUDIO = new URL('../assets/audio/', import.meta.url);
const has = (rel) => existsSync(fileURLToPath(new URL(rel, AUDIO)));

// The conch (shankha) at the end of a page is optional and has NOT been
// auditioned by the client: it stays off, and its file is not shipped, until
// the Peetham approves it after listening. Set this to true to include it
// (data-sfx then lists it, and the build ships assets/audio/sfx/shankha.mp3).
export const SHANKHA = false;

const SFX_NAMES = ['ghanta', 'chime-s', 'chime-r', 'chime-g', 'chime-p', 'chime-d', 'chime-s2', ...(SHANKHA ? ['shankha'] : [])];
// Only the temple sounds that exist at build time are requested.
const sfxPresent = () => SFX_NAMES.filter((n) => has(`sfx/${n}.mp3`));

// The credit the client chose, word for word, and the raga beneath it.
export const CREDIT = 'Flute: original raga composition for this website';
export const RAGA = 'Raga Bhoopali';

// How the music loops, from assets/audio/manifest.json (written by
// tools/compose-audio.mjs). Two <audio> elements crossfade at the loop point
// (Chromium's <audio loop> skips 12–23 ms at the wrap). The preferred file is
// flute-bhoopali-xfade.mp3: the loop followed by its own first seconds, so the
// end of the file plays exactly what its start plays. When element A reaches
// loop + d, element B starts at d and the two play the same music; the fade
// (0.6 s) sits inside the tanpura's quiet stretch after the kharaj pluck, so
// no pluck is doubled or dropped and no part of the loop is skipped. Without
// that file (or with a tail too short to hold the quiet stretch) the plain
// loop is used, faded at the same point of the tanpura cycle one cycle apart.
//   from  A's time at which the fade begins    to  B's time at that moment
//   fade  seconds                              the loop period is from − to
export function musicPlan() {
  let man = null;
  try { man = JSON.parse(readFileSync(fileURLToPath(new URL('manifest.json', AUDIO)), 'utf8')); } catch { /* no manifest */ }
  const m = man && man.music, c = m && m.tanpura && m.tanpura.crossfade, x = m && m.xfade;
  if (!m || !c) return { file: 'flute-bhoopali.mp3' }; // no plan: the script falls back to its own
  if (x && has(x.file) && x.tailSeconds >= c.bAt + c.seconds + 0.2) {
    return { file: x.file, from: +(x.loopSeconds + c.bAt).toFixed(4), to: c.bAt, fade: c.seconds, loop: x.loopSeconds };
  }
  return { file: m.file, from: c.aFrom, to: c.bAt, fade: c.seconds, loop: m.seconds };
}

// ?v=<first 8 hex of the file's SHA-256>, the build's versioning scheme for
// CSS/JS/JSON. The script builds the audio URLs itself (relative to its own
// <script src>), so the versions travel on [data-sound] as "file=hash" pairs.
const hash8 = (rel) => createHash('sha256').update(readFileSync(fileURLToPath(new URL(rel, AUDIO)))).digest('hex').slice(0, 8);
let cached;
function audioSet() {
  if (cached) return cached;
  const plan = musicPlan();
  const used = [plan.file, ...sfxPresent().map((n) => `sfx/${n}.mp3`)].filter(has);
  cached = { plan, used, versions: used.map((f) => `${f}=${hash8(f)}`).join(' ') };
  return cached;
}

// Everything in src/assets/audio/ that the script never requests (the
// manifest, the music file not chosen above, the shankha while it is off):
// build.mjs leaves these out of the site, paths relative to src/assets/.
export const SOUND_DEV_ONLY = (() => {
  const walk = (rel = '') => {
    try {
      return readdirSync(fileURLToPath(new URL(rel || '.', AUDIO)), { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(`${rel}${e.name}/`) : [`${rel}${e.name}`]));
    } catch { return []; }
  };
  const { used } = audioSet();
  return walk().filter((f) => !used.includes(f)).map((f) => `audio/${f}`);
})();

export const SOUND_ASSETS = {
  css: 'assets/css/devotion-sound.css',
  js: 'assets/js/devotion-sound.js',
  // The runtime resolves these relative to its own <script src>, so they work
  // from /, /kn/ … and the root-absolute 404 page alike.
  music: `assets/audio/${audioSet().plan.file}`,
  sfx: SFX_NAMES.map((n) => `assets/audio/sfx/${n}.mp3`),
};

export const soundStyles = () => `<link rel="stylesheet" href="${SOUND_ASSETS.css}">`;
export const soundScript = () => `<script src="${SOUND_ASSETS.js}" defer></script>`;

// Bansuri (bamboo flute) in the sprite's line style: 24-unit grid, 1.5 stroke,
// round caps, currentColor. Drawn inline so icons.mjs stays untouched.
const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
export function fluteIcon(size = 22, cls = 'snd-ico') {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">`
    + `<g transform="rotate(-45 12 12)"><rect ${S} x="1.4" y="9.8" width="21.2" height="4.4" rx="2.2"/>`
    + `<path ${S} d="M4.8 9.8v4.4M19.2 9.8v4.4"/>`
    + `<g fill="currentColor"><circle cx="16.4" cy="12" r=".9"/><circle cx="11.6" cy="12" r=".7"/><circle cx="9.2" cy="12" r=".7"/><circle cx="6.8" cy="12" r=".7"/></g></g>`
    + `<path ${S} d="M5.2 8.6c.6-1.6 1.8-2.8 3.4-3.4M2.6 7.4c1-2.4 2.8-4.2 5.2-5.2"/>`
    + `</svg>`;
}

// Inside the intro curtain: shown only on a first visit (no stored choice) and
// only while the curtain is still up. The script makes the curtain a modal
// dialog labelled by "Jaya Guru Datta" while the choice is offered.
export function soundInvite() {
  return `<div class="snd-invite" data-sound-invite hidden>
  <div class="snd-invite-actions">
    <button class="btn btn-gold snd-enter" type="button" data-sound-enter="music">${fluteIcon(20, 'snd-enter-ico')}<span>Enter with flute music</span></button>
    <button class="btn btn-ghost snd-enter" type="button" data-sound-enter="silence">Enter in silence</button>
  </div>
  <p class="snd-invite-note" id="snd-invite-note">You can change this at any time with the sound button at the bottom of the page.</p>
</div>`;
}

// The floating control (bottom left; the back-to-top button is bottom right).
// layout.mjs puts it right after the skip link, so a screen-reader or keyboard
// user reaches it (and can stop the music) first; it is position: fixed, so
// its place in the DOM does not move anything on screen.
// The panel follows the button in the DOM so Tab moves from the button into it.
// Hooks: [data-sound] wrapper (data-state="off|wait|on" is set by the script),
// [data-sound-toggle] button, [data-sound-switch="music|sfx"] switches,
// [data-sound-volume] range, [data-sound-status] live line.
// Written by the build, read by the script:
//   data-music       the music file, relative to assets/audio/
//   data-xf-from, data-xf-to, data-xfade   the loop plan (musicPlan() above)
//   data-sfx         the temple sounds to load (the files present; no shankha while SHANKHA is false)
//   data-audio-v     "file=hash" content versions, appended to the audio URLs as ?v=
// Optional tuning attributes, read by the script:
//   data-sfx-db="-8" temple-sound level relative to the music, in dB
//   data-volume="80" default volume (0–100) before the visitor sets one
//   data-level-ref="0.08" music RMS that DP.sound.level() reports as 1 (p95 of the track)
export function soundControl({ sfx = sfxPresent() } = {}) {
  const { plan, versions } = audioSet();
  const loop = plan.from ? ` data-xf-from="${plan.from}" data-xf-to="${plan.to}" data-xfade="${plan.fade}"` : '';
  return `<div class="snd" data-sound data-state="off" data-music="${plan.file}"${loop} data-sfx="${sfx.join(' ')}" data-audio-v="${versions}" hidden>
  <button class="snd-btn" type="button" aria-label="Sound settings" aria-expanded="false" aria-controls="snd-panel" data-sound-toggle>${fluteIcon(22)}<span class="snd-bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
  <div class="snd-panel" id="snd-panel" role="group" aria-labelledby="snd-title" data-sound-panel hidden>
    <p class="snd-title" id="snd-title">Sound</p>
    <button class="snd-switch" type="button" role="switch" aria-checked="false" data-sound-switch="music">Flute music</button>
    <button class="snd-switch" type="button" role="switch" aria-checked="false" data-sound-switch="sfx">Temple sounds while scrolling</button>
    <label class="snd-vol"><span>Volume</span><input type="range" min="0" max="100" step="5" value="80" data-sound-volume></label>
    <p class="snd-status" data-sound-status aria-live="polite"></p>
    <p class="snd-credit">${CREDIT}</p>
    <p class="snd-raga">${RAGA}</p>
  </div>
</div>`;
}

// Every English string a visitor can see or hear announced, for the
// translation dictionaries (src/i18n/<lang>/*.json). The first group is in the
// markup above; the second is set at runtime through fmt() in the script.
export const SOUND_STRINGS = {
  markup: [
    'Enter with flute music',
    'Enter in silence',
    'You can change this at any time with the sound button at the bottom of the page.',
    'Sound',
    'Flute music',
    'Temple sounds while scrolling',
    'Volume',
    CREDIT,
    RAGA,
    'Sound settings', // aria-label of the round button
  ],
  runtime: [
    'Music is off.',
    'The flute music is playing.',
    'The music is loading.',
    'The music will begin when you tap or press a key.',
    'The music is paused while another recording or video plays.',
    'The music is playing in another tab.',
    'The music could not be loaded.',
    // the first-visit choice as a card above the sound button, when the script arrives
    // after the curtain has lifted (a slow connection)
    'Would you like flute music while you read?',
    'Play flute music',
    'Not now',
  ],
};
