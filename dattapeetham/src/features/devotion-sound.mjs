// Devotional sound: the flute music (an original composition in Raga Mohanam
// made for this website) and the temple sounds while scrolling.
//
// Server-side markup helpers for src/layout.mjs. The runtime is
// src/assets/js/devotion-sound.js, the styles src/assets/css/devotion-sound.css.
// Everything here is inert without the script: the invitation and the control
// carry the `hidden` attribute, and the script removes it only when the browser
// can play sound (Web Audio + HTMLAudioElement). No audio is ever downloaded
// until the visitor turns the music on.
//
// Integration (stage 2, in layout.mjs):
//   head:     soundStyles()   after the site.css <link>
//   .intro:   soundInvite()   as the last child of <div class="intro">
//   body:     soundControl()  just before the back-to-top button
//   scripts:  soundScript()   after motion.js (before page scripts)
// Every visible or announced English string is listed in SOUND_STRINGS so the
// translation dictionaries can cover them (markup strings are picked up by
// `node build.mjs --extract`; runtime strings come from fmt() calls in the JS).

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SFX_NAMES = ['ghanta', 'chime-s', 'chime-r', 'chime-g', 'chime-p', 'chime-d', 'chime-s2', 'shankha'];
// Only the temple sounds that exist at build time are requested (shankha is optional).
const sfxPresent = () => SFX_NAMES.filter((n) => existsSync(fileURLToPath(new URL(`../assets/audio/sfx/${n}.mp3`, import.meta.url))));

export const SOUND_ASSETS = {
  css: 'assets/css/devotion-sound.css',
  js: 'assets/js/devotion-sound.js',
  // The runtime resolves these relative to its own <script src>, so they work
  // from /, /kn/ … and the root-absolute 404 page alike.
  music: 'assets/audio/flute-mohanam.mp3',
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
// The panel follows the button in the DOM so Tab moves from the button into it.
// Hooks: [data-sound] wrapper (data-state="off|wait|on" is set by the script),
// [data-sound-toggle] button, [data-sound-switch="music|sfx"] switches,
// [data-sound-volume] range, [data-sound-status] live line.
// Optional tuning attributes on the wrapper, read by the script:
//   data-xfade="3"   seconds of crossfade at the loop point
//   data-sfx-db="-8" temple-sound level relative to the music, in dB
//   data-volume="80" default volume (0–100) before the visitor sets one
//   data-level-ref="0.12" music RMS that DP.sound.level() reports as 1
// data-sfx lists the temple sounds to load; it is written from the files present.
export function soundControl({ sfx = sfxPresent() } = {}) {
  return `<div class="snd" data-sound data-state="off" data-sfx="${sfx.join(' ')}" hidden>
  <button class="snd-btn" type="button" aria-label="Sound settings" aria-expanded="false" aria-controls="snd-panel" data-sound-toggle>${fluteIcon(22)}<span class="snd-bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
  <div class="snd-panel" id="snd-panel" role="group" aria-labelledby="snd-title" data-sound-panel hidden>
    <p class="snd-title" id="snd-title">Sound</p>
    <button class="snd-switch" type="button" role="switch" aria-checked="false" data-sound-switch="music">Flute music</button>
    <button class="snd-switch" type="button" role="switch" aria-checked="false" data-sound-switch="sfx">Temple sounds while scrolling</button>
    <label class="snd-vol"><span>Volume</span><input type="range" min="0" max="100" step="5" value="80" data-sound-volume></label>
    <p class="snd-status" data-sound-status aria-live="polite"></p>
    <p class="snd-credit">Flute: original raga composition (Raga Mohanam) for this website</p>
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
    'Flute: original raga composition (Raga Mohanam) for this website',
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
