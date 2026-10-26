#!/usr/bin/env node
// The website's own music and temple sounds, composed and synthesised here.
//
//   node tools/compose-audio.mjs            render everything and encode it into src/assets/audio/
//   node tools/compose-audio.mjs --music    only the bansuri piece
//   node tools/compose-audio.mjs --sfx      only the temple sounds
//   node tools/compose-audio.mjs --plan     print the timeline of the score, check it, and stop
//   node tools/compose-audio.mjs --wav      render the WAV files but do not encode them
//   node tools/compose-audio.mjs --work <dir>   where WAVs and stems go
//                                               (default: <system temp>/dattapeetham-audio)
//   node tools/compose-audio.mjs --xfade-tail 4.6   also write flute-pahadi-xfade.mp3: the same
//        loop followed by its own first 4.6 s, for a player that crossfades two <audio>
//        elements (crossfade inside the tail into a second element started at 0, and the
//        two play the same music). This is the copy the site plays. Not made unless asked
//        for (an encode without it warns); with --wav it is written as flute-pahadi-xfade.wav
//        in the work folder.
//   --music or --sfx alone encodes its own part and rewrites manifest.json with the other
//   part kept from the manifest already there (with no such part to keep, the manifest is
//   left as it was, with a warning: run both). An unknown option, a missing value or a
//   tail longer than the loop is an error, before anything is written. Every MP3 is
//   encoded in the work folder and copied into src/assets/audio/ only once all of them
//   have passed their checks, each beside its target first and then renamed over it, so
//   a failed run leaves the site's files as they were and none is ever half-written.
//
// Nothing is sampled or recorded: the bansuri, the tanpura, the pad, the
// swarmandal (off in this score), the bells and the hall are all synthesised
// below from well-known DSP (additive and modal synthesis, resonant filters, a
// synthetic room impulse response and FFT convolution). Seeded random
// generators drive every human detail, so each render is identical. Each phrase
// has its own streams (its rubato, its ornaments, its breath noise and its
// "phoonk", its meends, its drift and its shimmer): editing one phrase leaves the
// nuances of every other phrase as they were (later phrases only move in time:
// the same playing, on the sample grid of its new start), and the
// phrases never change the tanpura, the pad or the bells (only the loop length
// they add up to does, and SCORE.seed and SCORE.sa change everything).
//
// Needs Node 20+ and nothing else to render. Encoding needs ffmpeg with
// libmp3lame on the PATH.
//
// What it makes (all tuned to the same Sa = D, at A4 = 432 Hz):
//   src/assets/audio/flute-pahadi.mp3    ~4 min soft bansuri in Raga Pahadi over a tanpura drone
//                                        and a faint pad; loops seamlessly (see LOOP)
//   src/assets/audio/sfx/ghanta.mp3      a small brass hand-bell, struck once
//   src/assets/audio/sfx/chime-*.mp3     soft bell tones on the swaras S R G P D S'
//   src/assets/audio/sfx/shankha.mp3     a soft conch swell (optional)
//   src/assets/audio/manifest.json       durations, loudness, loop points, swara of each chime
//
// LOOP: the tanpura and the hall reverb are rendered circularly (a pluck that
// is still ringing at the end of the file continues at its start, and the
// reverb tail of the last bar is folded onto the first), and the pad is exactly
// periodic over the loop (every partial and every swell has a whole number of
// cycles in it), so the last sample flows into the first exactly as if the
// piece had been crossfaded into itself. The flute is silent for SCORE.intro
// seconds at the start and SCORE.outro seconds at the end, and no swarmandal
// shimmer rings within 8 s of either, so the seam always falls on drone and
// pad alone. The loop's MP3 is encoded circularly too (see WRAP), so the codec
// adds no edge at the wrap.

import { writeFile, readFile, mkdir, stat, rm, copyFile, rename } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

// ============================================================================
// THE SCORE
// ============================================================================
// Raga Pahadi (Bilawal thaat; light-classical, from the folk music of the
// hills), the raga of Krishna's flute: pastoral and sweet. The melody moves on
// S R G P D. Shuddha Ma and shuddha Ni are soft touches only: as a kan or a
// murki, or in passing (G M G R S, P M G, D N S', S' N D P, N. S), never held as
// a resting note (at most about 0.6 s, except inside a grace) and together at
// most about 6 % of the flute's time. No komal or tivra notes. The mandra is
// home: P. and D. are resting places and phrases often fall to mandra Pa or Sa;
// Sa and Pa are the pillars, with Ga strong. Sa = D at A4 = 432 Hz: the flute's
// madhya Sa is D4 (288.3254 Hz) and the tanpura is tuned an octave below. The
// swaras sit in just intonation above Sa (R 9/8, G 5/4, M 4/3, P 3/2, D 5/3,
// N 15/8).
//
// SCORE.raga picks the swaras a phrase may use (RAGAS, below; Bhoopali, S R G P
// D only, is kept so the notation stays general). Each phrase is written the
// way a musician would write sargam:
//
//   S R G M P D N  the seven shuddha swaras (in Pahadi, M and N only as soft touches)
//   P.  D.  P..    a dot after a swara: mandra sthayi (the octave below); two dots, two octaves
//   S'  R'  G'     a quote after it: tara sthayi (the octave above); S'' is ati-tara Sa (rarely, if ever)
//   :1.5           how long the swara is held, in seconds (no tala)
//   /D             meend: a slow glide into this swara from the one before it, over 35–60 %
//                  of the note, easing in and out; at the start of a phrase (or after a
//                  silence) it glides up from the melody swara below (never from M or N).
//                  On its way it passes the pitches between: a band of ±30 cents around
//                  a note the raga lacks, or around M or N, is passed in at most about
//                  115–150 ms (drawn for each meend; see glideFor), so a slow glide never
//                  rests on one of them, and a meend that leaves M or N leaves it at once
//   (D)P           kan: a quick grace touch of D just before landing on P
//   (GR)S          murki: two quick grace notes, then the swara (at most three in the brackets)
//   G~             andolan: a slow (about 1 Hz), shallow swing 15–25 cents *below* the swara
//                  that keeps returning to it; it never reaches a neighbouring swara (the
//                  nearest is 112 cents away). Rare in this style: at most twice in the piece
//   -:0.4          a short silence inside the phrase (no breath is taken)
//
// Komal and tivra notes have no token: a lower-case r g m d n is an error that
// names the raga ("Pahadi has no komal or tivra notes"), and so is a swara the
// raga lacks (M or N in Bhoopali); any other letter is simply not notation.
// The marks combine in this order: meend, grace notes, swara, octave marks,
// andolan, duration, as in /(DP)G'~:2.4. A silence takes none of them.
//
// After each phrase the flautist breathes for `gap` seconds (0 or more) while
// the tanpura and the pad carry on. `level` (above 0, at most 1) is how
// strongly the phrase is played: softly here, mostly 0.6–0.78. `shimmer: true`
// would ring a soft swarmandal sweep in the breath before that phrase; this
// score uses none (the option is kept, off, like the shankha). A shimmer may
// not ring within 8 s of the loop's start or end and needs a breath of at least
// 1.55 s before its phrase. Change anything here and run
// `node tools/compose-audio.mjs --plan` to check it, then again without --plan
// to render.
export const SCORE = {
  raga: 'Pahadi',
  sa: 432 * 2 ** (-7 / 12), // D4 at A4 = 432 Hz (288.3254 Hz), the flute's madhya Sa
  tempo: 1, // > 1 plays slower: every duration and gap is multiplied by it
  intro: 10, // seconds of tanpura and pad alone before the flute's first phrase
  outro: 8, // seconds of tanpura and pad after the last phrase (the reverb rings into it)
  seed: 108,
  excerptFrom: 19, // the client's 30-second audition excerpt starts just before this phrase
  //                (section V: the murki (DPM)G, G M G R S falling to mandra Pa, and an
  //                answer that rests on Ga and comes home to Sa; it ends in a breath)
  // An original Pahadi dhun in five sections, phrased like a folk tune: calls
  // that end open (on Ga, mandra Dha or tara Sa) and answers that fall home to
  // mandra Pa or Sa. Each section ends with a slightly longer breath (2.8 s).
  // One short visit to the tara (IV), one andolan (on Ga, in III), four murkis
  // and no shimmer. Ma and Ni only touch, in passing or as grace notes (never
  // written longer than 0.4 s, and under 0.6 s with the move off them, which
  // --plan checks), and the playing stays soft (levels 0.62–0.72).
  phrases: [
    // I. Godhuli: Sa at dusk and mandra Pa as home; the second phrase asks on Ga, the third answers
    { notes: 'S:3.4 (R)S:0.8 D.:0.45 /P.:3.0', gap: 2.1, level: 0.62 },
    { notes: 'P.:1.2 (D.)S:1.4 R:0.45 /G:2.6 R:0.4 /G:1.4', gap: 2.0, level: 0.64 },
    { notes: 'G:1.0 (M)G:0.5 R:0.45 S:1.0 D.:0.45 /P.:3.0', gap: 1.9, level: 0.65 },
    { notes: 'P.:0.9 D.:0.45 S:2.2 -:0.3 (N.)S:0.6 R:0.45 (PM)G:0.9 R:0.45 /S:2.6', gap: 2.8, level: 0.66 },

    // II. Yamuna: the herd by the river, in the mandra
    { notes: 'S:0.8 /D.:2.6 P.:0.5 D.:0.45 S:0.6 R:0.4 /G:2.4', gap: 2.0, level: 0.66 },
    { notes: 'P.:1.4 D.:0.5 S:0.45 /G:2.4 -:0.25 G:0.6 R:0.4 S:1.0 D.:0.45 /P.:2.2', gap: 2.4, level: 0.67 },
    { notes: 'S:0.6 R:0.45 S:1.2 N.:0.4 /D.:3.0 P.:0.5 /D.:1.6', gap: 2.1, level: 0.67 },
    { notes: 'D.:0.5 /S:1.8 R:0.4 /G:2.2 (M)G:0.6 R:0.4 S:1.0 D.:0.45 /P.:2.6', gap: 2.4, level: 0.68 },
    { notes: 'P:0.9 /G:1.8 R:0.45 S:0.8 (RGR)S:0.6 D.:0.45 P.:1.2 D.:0.45 /S:2.6', gap: 2.8, level: 0.66 },

    // III. Gopa-geet: the cowherd's song on Ga, in call and answer (Ma touched in four of its five
    // phrases: G M G R S, P M G twice, and the kan onto the andolan)
    { notes: 'S:0.6 /G:2.2 R:0.45 G:0.6 P:1.8 -:0.25 (D)P:0.6 /G:1.6', gap: 2.1, level: 0.69 },
    { notes: 'G:0.6 P:1.4 D:0.45 /P:2.0 /G:2.2 (M)G:0.5 R:0.45 S:1.2', gap: 2.3, level: 0.7 },
    { notes: 'P:0.9 D:0.45 /P:2.0 -:0.3 (D)P:0.6 G:0.45 P:1.0 (PM)G:1.6 R:0.4 S:0.8', gap: 2.2, level: 0.71 },
    { notes: 'P.:0.8 (D.)S:1.0 R:0.4 /G:1.8 P:0.5 /D:1.4 P:0.6 M:0.35 /G:2.0', gap: 2.3, level: 0.71 },
    { notes: 'G:0.6 (M)G~:2.6 R:0.45 S:1.0 N.:0.35 S:0.4 D.:0.6 /P.:2.6', gap: 2.8, level: 0.69 },

    // IV. Pukaar: calling across the Yamuna; up through Ni to tara Sa, once, and down
    { notes: "G:0.7 P:1.0 /D:1.4 N:0.35 /S':3.0", gap: 1.9, level: 0.71 },
    { notes: "D:0.5 /S':2.0 (R')S':0.5 R':0.4 /G':1.2 R':0.45 (N)S':2.2", gap: 2.1, level: 0.72 },
    { notes: "S':1.4 N:0.4 D:0.45 /P:1.8 -:0.3 (D)P:0.9 M:0.4 /G:2.4", gap: 2.2, level: 0.72 },
    { notes: "P:0.6 /D:1.4 (N)S':1.0 (N)D:1.2 P:0.6 /G:1.8 P:0.4 G:0.6 R:0.45 S:1.2", gap: 2.8, level: 0.7 },

    // V. Ghar ki or: homeward, to mandra Pa and a long Sa (gap 0: the outro follows)
    { notes: 'G:1.8 P:0.5 (DPM)G:0.9 R:0.45 S:1.2 -:0.25 R:0.45 /G:1.8', gap: 2.0, level: 0.68 },
    { notes: 'G:0.8 M:0.4 G:0.7 R:0.45 S:1.6 -:0.25 S:0.45 N.:0.4 D.:0.6 /P.:2.6', gap: 2.3, level: 0.66 },
    { notes: 'P.:1.2 (D.)S:0.9 R:0.4 /G:2.2 -:0.3 G:0.45 R:0.45 /S:2.4', gap: 2.4, level: 0.64 },
    { notes: 'G:0.6 R:0.45 S:0.9 D.:0.45 /P.:2.2 D.:0.45 (N.)S:6.0', gap: 0, level: 0.62 },
  ],
};

// ============================================================================
// Settings
// ============================================================================
const SR = 44100;
const TAU = Math.PI * 2;
// The mix is about 70 % flute: the tanpura and the pad together sound about a
// third as loud as the flute (loudness roughly halves every 10 LU), about 16 LU
// below it combined.
const MUSIC = {
  lufs: -23, // EBU R128 integrated: it plays in the background
  truePeak: -2, // dBTP ceiling
  bitrate: '128k',
  tanpuraLU: -17, // tanpura loudness relative to the flute's
  padLU: -23.5, // the faint ambient pad, relative to the flute
  shimmerLU: -12, // the swarmandal while it rings, relative to the flute (none in this score)
  wetLU: -9, // reverb return loudness relative to the dry mix: the flute's space, not an instrument
  send: { tanpura: 0.55, pad: 0.35, shimmer: 0.6 }, // reverb sends (the flute's is 1)
  lowCut: 55, // Hz, 12 dB/octave
  flutePan: 0.06, // -1 left … +1 right
  tanpuraCycle: 4.6, // seconds per Pa–Sa–Sa–Sa round (adjusted to fit the loop exactly)
  shimmerGuard: 8, // seconds at each end of the loop (the seam and the crossfade) where no shimmer rings
};
const SFX_LUFS = { ghanta: -22, chime: -23, shankha: -23 };
const CREDIT = 'Flute: original raga composition for this website';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/assets/audio');

// The seven shuddha swaras in just intonation (ratios above Sa), and their cents
const RATIO = { S: 1, R: 9 / 8, G: 5 / 4, M: 4 / 3, P: 3 / 2, D: 5 / 3, N: 15 / 8 };
const CENTS = Object.fromEntries(Object.entries(RATIO).map(([s, r]) => [s, 1200 * Math.log2(r)]));
// Every pitch a raga might lack, in cents above Sa: komal Re (16/15), komal Ga (6/5),
// shuddha Ma, tivra Ma (45/32), komal Dha (8/5), komal Ni (16/9) and shuddha Ni
const CHROMATIC = {
  'komal Re': 1200 * Math.log2(16 / 15), 'komal Ga': 1200 * Math.log2(6 / 5), Ma: CENTS.M, 'tivra Ma': 1200 * Math.log2(45 / 32),
  'komal Dha': 1200 * Math.log2(8 / 5), 'komal Ni': 1200 * Math.log2(16 / 9), Ni: CENTS.N,
};
// What each raga allows. `swaras`: every swara a phrase may write; `melody`: the swaras
// the melody rests on (a meend that opens a breath starts from the melody swara below);
// `touch`: swaras allowed only as soft touches, with the longest a plain one may be held
// (written seconds) and their share of the flute's sounding time (both checked by --plan);
// `lacks`: the error for a swara the raga does not have.
export const RAGAS = {
  Pahadi: {
    swaras: 'SRGMPDN', melody: 'SRGPD', touch: { swaras: 'MN', hold: 0.6, share: 0.06 },
    label: 'Pahadi (S R G P D, with soft touches of M and N)',
    lacks: { komal: 'Pahadi has no komal or tivra notes' },
  },
  Bhoopali: {
    swaras: 'SRGPD', melody: 'SRGPD', touch: null,
    label: 'Bhoopali (S R G P D)',
    lacks: { shuddha: 'Bhoopali has no Ma and no Ni', komal: 'Bhoopali has no komal or tivra notes' },
  },
};
function ragaOf(name) {
  const rg = Object.hasOwn(RAGAS, name) ? RAGAS[name] : null; // not 'toString' and the like
  if (!rg) throw new Error(`raga "${name}" is not one this engine knows (${Object.keys(RAGAS).join(', ')})`);
  return rg;
}
// The pitches a slow glide may pass but not linger on (see glideFor): every note the raga
// lacks, and its touch swaras (cents above Sa, within one octave)
function passBands(rg) {
  const swara = { Ma: 'M', Ni: 'N' }; // the two of CHROMATIC that a raga may have
  const lacking = Object.entries(CHROMATIC).filter(([name]) => !(swara[name] && rg.swaras.includes(swara[name])));
  const touch = rg.touch ? [...rg.touch.swaras].map((s) => [s, CENTS[s]]) : [];
  return [...lacking, ...touch].map(([name, cents]) => ({ name, cents }));
}

// ============================================================================
// Small DSP toolkit
// ============================================================================
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const dbToGain = (db) => Math.pow(10, db / 20);
const smoother = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u)); // raised cosine (= sin²(πu/2)): glides and fades
const mod1200 = (c) => ((c % 1200) + 1200) % 1200;

// Seeded PRNG (mulberry32); each part of the piece gets its own stream.
function rng(seed, name) {
  let h = 2166136261 ^ seed;
  for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rand) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0;
    while (u === 0) u = rand();
    const r = Math.sqrt(-2 * Math.log(u)), v = TAU * rand();
    spare = r * Math.sin(v);
    return r * Math.cos(v);
  };
}
// Smooth random wander in about [-1, 1], `rate` new values per second (Catmull–Rom).
function wander(rand, rate, seconds) {
  const n = Math.ceil(seconds * rate) + 5, p = new Float64Array(n);
  for (let i = 0; i < n; i++) p[i] = rand() * 2 - 1;
  return (t) => {
    const x = clamp(t, 0, seconds) * rate + 1, i = x | 0, u = x - i;
    const a = p[i - 1], b = p[i], c = p[i + 1], d = p[i + 2];
    return b + 0.5 * u * (c - a + u * (2 * a - 5 * b + 4 * c - d + u * (3 * (b - c) + d - a)));
  };
}

// Sine table with linear interpolation; phase in cycles [0, 1).
const TBL = 8192;
const SINE = new Float64Array(TBL + 1);
for (let i = 0; i <= TBL; i++) SINE[i] = Math.sin((TAU * i) / TBL);
function sinT(ph) {
  const x = ph * TBL, i = x | 0;
  return SINE[i] + (x - i) * (SINE[i + 1] - SINE[i]);
}

// RBJ-cookbook biquad, transposed direct form II.
class Biquad {
  constructor() { this.b0 = 1; this.b1 = this.b2 = this.a1 = this.a2 = 0; this.z1 = this.z2 = 0; }
  set(b0, b1, b2, a0, a1, a2) {
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  w(f, q) { const w = (TAU * f) / SR; return [Math.cos(w), Math.sin(w) / (2 * q)]; }
  lowpass(f, q = Math.SQRT1_2) { const [c, al] = this.w(f, q); return this.set((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al); }
  highpass(f, q = Math.SQRT1_2) { const [c, al] = this.w(f, q); return this.set((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al); }
  bandpass(f, q) { const [c, al] = this.w(f, q); return this.set(al, 0, -al, 1 + al, -2 * c, 1 - al); } // 0 dB peak
  peaking(f, q, db) {
    const [c, al] = this.w(f, q), A = Math.pow(10, db / 40);
    return this.set(1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A);
  }
  highshelf(f, db, q = Math.SQRT1_2) {
    const [c, al] = this.w(f, q), A = Math.pow(10, db / 40), s = 2 * Math.sqrt(A) * al;
    return this.set(A * (A + 1 + (A - 1) * c + s), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - s),
      A + 1 - (A - 1) * c + s, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - s);
  }
  reset() { this.z1 = this.z2 = 0; return this; }
  tick(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}
// Filter a looping buffer in place: warm the filters up on its last seconds
// first, so the state at sample 0 is the state the loop really arrives with.
function filterLoop(buf, filters, warm = 2) {
  const n = buf.length, w = Math.min(n, Math.round(warm * SR));
  for (let i = n - w; i < n; i++) { let x = buf[i]; for (const f of filters) x = f.tick(x); }
  for (let i = 0; i < n; i++) { let x = buf[i]; for (const f of filters) x = f.tick(x); buf[i] = x; }
}

// Iterative radix-2 FFT with cached tables.
const FFT_CACHE = new Map();
function fftTables(n) {
  if (FFT_CACHE.has(n)) return FFT_CACHE.get(n);
  const rev = new Uint32Array(n), bits = Math.log2(n);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((TAU * i) / n); sin[i] = Math.sin((TAU * i) / n); }
  const t = { rev, cos, sin };
  FFT_CACHE.set(n, t);
  return t;
}
function fft(re, im, inverse = false) {
  const n = re.length, { rev, cos, sin } = fftTables(n), sg = inverse ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0, k = 0; j < half; j++, k += step) {
        const wr = cos[k], wi = sg * sin[k], a = i + j, b = a + half;
        const vr = re[b] * wr - im[b] * wi, vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// ITU-R BS.1770-4 integrated loudness (LUFS) of 1 or 2 channels.
function lufs(channels) {
  const n = channels[0].length, sq = new Float64Array(n);
  for (const ch of channels) {
    // K-weighting: high shelf + RLB high-pass, derived for 44.1 kHz
    const A = Math.pow(10, 3.99984385397 / 40), w0 = (TAU * 1681.974450955532) / SR, c0 = Math.cos(w0), al = Math.sin(w0) / (2 * 0.7071752369554193);
    const shelf = new Biquad().set(A * (A + 1 + (A - 1) * c0 + 2 * Math.sqrt(A) * al), -2 * A * (A - 1 + (A + 1) * c0), A * (A + 1 + (A - 1) * c0 - 2 * Math.sqrt(A) * al),
      A + 1 - (A - 1) * c0 + 2 * Math.sqrt(A) * al, 2 * (A - 1 - (A + 1) * c0), A + 1 - (A - 1) * c0 - 2 * Math.sqrt(A) * al);
    const hp = new Biquad().highpass(38.13547087613982, 0.5003270373253953);
    for (let i = 0; i < n; i++) { const y = hp.tick(shelf.tick(ch[i])); sq[i] += y * y; }
  }
  const blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR), z = [];
  let acc = 0;
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { acc += sq[i]; cum[i + 1] = acc; }
  for (let s = 0; s + blk <= n; s += hop) z.push((cum[s + blk] - cum[s]) / blk);
  const L = (m) => -0.691 + 10 * Math.log10(m);
  const abs = z.filter((m) => L(m) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((m) => L(m) > rel);
  return L(gated.reduce((a, b) => a + b, 0) / gated.length);
}

function peakOf(...chs) { let p = 0; for (const c of chs) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > p) p = a; } return p; }
function scaleAll(g, ...chs) { for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= g; }
const panGains = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

// ============================================================================
// Score → timeline
// ============================================================================
// One letter with its octave marks (S, D., P.., S', S''), then a whole token:
// [/] [(grace…)] swara-or-rest [marks] [~] :seconds
// Any letter fits the pattern; whether it is a swara of the raga is checked after it.
const LETTER = "[A-Za-z](?:\\.{1,2}|'{1,2})?";
const TOKEN = new RegExp(`^(\\/)?(?:\\(((?:${LETTER})+)\\))?([A-Za-z-])(\\.{1,2}|'{1,2})?(~)?:(\\d+(?:\\.\\d+)?)$`);
const octave = (marks = '') => [...marks].reduce((o, c) => o + (c === "'" ? 1 : -1), 0);
const swaraCents = (s) => CENTS[s[0]] + 1200 * octave(s.slice(1));
// Why a letter is not a swara of the raga, when that has a name: a lower-case
// r g m d n (the usual way of writing komal and tivra notes, which have no token
// here), or a shuddha swara the raga lacks. Any other letter is not notation.
const lacking = (ch, rg) => ('rgmdn'.includes(ch) ? rg.lacks.komal : 'SRGMPDN'.includes(ch) && !rg.swaras.includes(ch) ? rg.lacks.shuddha : null);

export function parsePhrase(text, where = 'phrase', raga = SCORE.raga) {
  const rg = ragaOf(raga);
  return text.trim().split(/\s+/).map((tok) => {
    const named = [...tok].map((ch) => lacking(ch, rg)).find(Boolean);
    if (named) throw new Error(`${where}: "${tok}" — ${named} (write its swaras: ${[...rg.swaras].join(' ')})`);
    const m = TOKEN.exec(tok);
    const unreadable = () => new Error(`${where}: cannot read "${tok}" (write e.g. G:0.8, D.:1.2, S':2, /D:1, (D)P:0.8, (GR)S:1.2, G~:2, -:0.4)`);
    if (!m) throw unreadable();
    const [, meend, graceText, sw, oct, andolan, dur] = m;
    const rest = sw === '-';
    const graces = graceText ? graceText.match(new RegExp(LETTER, 'g')) : [];
    if (![sw, ...graces.map((g) => g[0])].every((ch) => ch === '-' || rg.swaras.includes(ch))) throw unreadable();
    if (rest && (meend || graces.length || oct || andolan)) throw new Error(`${where}: "${tok}" — a silence takes no meend, grace notes, octave marks or andolan`);
    if (graces.length > 3) throw new Error(`${where}: "${tok}" — a murki has at most three grace notes`);
    if (!(+dur > 0)) throw new Error(`${where}: "${tok}" — a swara needs a duration above zero`);
    return {
      token: tok, rest, swara: rest ? '-' : sw + (oct || ''),
      cents: rest ? null : CENTS[sw] + 1200 * octave(oct),
      touch: !rest && !!rg.touch && rg.touch.swaras.includes(sw),
      meend: !!meend, andolan: !!andolan, graces: graces.map(swaraCents), graceSwaras: graces, dur: +dur,
    };
  });
}
// the next melody swara of the raga below a pitch (cents re Sa): where a meend that opens a
// breath starts from (in Pahadi never M or N, which are touches, not places to start from)
function below(c, rg) {
  const pc = mod1200(c), base = c - pc, mel = [...rg.melody].map((s) => CENTS[s]);
  for (let i = mel.length - 1; i >= 0; i--) if (mel[i] < pc - 1) return base + mel[i];
  return base - 1200 + mel.at(-1);
}

const SCORE_KEYS = ['raga', 'sa', 'tempo', 'intro', 'outro', 'seed', 'excerptFrom', 'phrases'];
const PHRASE_KEYS = ['notes', 'gap', 'level', 'shimmer'];
export function schedule(score = SCORE) {
  for (const k of Object.keys(score)) if (!SCORE_KEYS.includes(k)) throw new Error(`the score has an unknown field "${k}" (it reads ${SCORE_KEYS.join(', ')})`);
  const rg = ragaOf(score.raga);
  if (typeof score.sa !== 'number' || !Number.isFinite(score.sa) || !(score.sa > 0)) throw new Error(`sa is ${JSON.stringify(score.sa)}: the frequency of Sa in Hz, above 0`);
  if (!Number.isInteger(score.seed)) throw new Error(`seed is ${JSON.stringify(score.seed)}: write a whole number`);
  if (!(score.tempo > 0)) throw new Error(`tempo is ${score.tempo}: it must be above 0`);
  if (!(score.intro >= 0) || !(score.outro >= 0)) throw new Error(`intro and outro are seconds, 0 or more (they are ${score.intro} and ${score.outro})`);
  if (!Array.isArray(score.phrases) || !score.phrases.length) throw new Error('the score has no phrases');
  let t = score.intro;
  const phrases = score.phrases.map((ph, pi) => {
    const where = `phrase ${pi + 1}`;
    for (const k of Object.keys(ph)) if (!PHRASE_KEYS.includes(k)) throw new Error(`${where}: unknown field "${k}" (a phrase has ${PHRASE_KEYS.join(', ')})`);
    if (typeof ph.notes !== 'string') throw new Error(`${where}: notes is the phrase's sargam, as text`);
    if (ph.level !== undefined && !(ph.level > 0 && ph.level <= 1)) throw new Error(`${where}: level is ${ph.level}; write a number above 0 and at most 1`);
    if (ph.gap !== undefined && !(ph.gap >= 0)) throw new Error(`${where}: gap is ${ph.gap}; write 0 or more seconds`);
    if (ph.shimmer !== undefined && typeof ph.shimmer !== 'boolean') throw new Error(`${where}: shimmer is true or false`);
    const R = rng(score.seed, `rubato-${pi + 1}`), Rg = rng(score.seed, `grace-${pi + 1}`); // grace timing has its own stream
    const notes = parsePhrase(ph.notes, where, score.raga);
    const ev = [];
    for (const n of notes) {
      // a little rubato: no two swaras are held for exactly the written time
      let d = n.dur * score.tempo * (1 + 0.04 * (R() - 0.5));
      // grace notes take their time from the swara they lead into: a kan is one quick
      // touch; a murki's notes are a little longer, the first of them longest
      const k = n.graces.length;
      if (k) {
        const g = k === 1 ? Math.min(0.075, d * 0.3) : Math.min(0.085, (0.5 * d) / (k + 1));
        n.graces.forEach((c, j) => {
          const gd = g * (1 + (k > 1 && j === 0 ? 0.18 : 0) + 0.12 * (Rg() - 0.5));
          ev.push({ cents: c, dur: gd, grace: true, swara: n.graceSwaras[j], ornament: k === 1 ? 'kan' : 'murki', touch: !!rg.touch && rg.touch.swaras.includes(n.graceSwaras[j][0]) });
          d -= gd;
        });
      }
      const { graces, graceSwaras, ...main } = n;
      ev.push({ ...main, kan: k === 1, murki: k > 1, dur: d });
    }
    const t0 = t;
    for (const e of ev) { e.t0 = t; t += e.dur; e.t1 = t; }
    const out = { index: pi + 1, notes: ph.notes, ev, t0, t1: t, level: ph.level ?? 0.8, shimmer: !!ph.shimmer, last: pi === score.phrases.length - 1 };
    t += (ph.gap ?? 2) * score.tempo;
    return out;
  });
  const fluteEnd = phrases.at(-1).t1;
  return { phrases, fluteStart: score.intro, fluteEnd, length: fluteEnd + score.outro };
}

// ============================================================================
// Meend: how a slow glide passes the pitches between its two swaras
// ============================================================================
// A meend eases out of one swara and into the next along a raised cosine,
// fastest in the middle. On its way it passes pitches the raga lacks (in Pahadi
// komal Re, komal Ga, tivra Ma, komal Dha and komal Ni, in every octave) and, in
// Pahadi, its touch swaras M and N. A slow glide that lingers near one of them
// makes the ear hear that note: a note foreign to the raga, or M or N as a
// resting note. So the glide may stay in each such band (±MEEND.band cents) for
// only a moment: its cap, between MEEND.dwell[0] and MEEND.dwell[1] seconds,
// drawn for each meend from the phrase's own `meend-` stream (so the meends do
// not all move at one speed, and nothing else in the phrase moves with them).
// When it would stay longer, it is first made steeper through the middle, along
// ease(u^p / (u^p + (1 − u)^p)) with p from 1 (the plain raised cosine) up to
// MEEND.steep: the meend keeps its length, but it leaves the first swara a
// little later and settles into the second a little more slowly. Only if that
// is not enough is it also made shorter, so it takes less than its usual 35–60 %
// of the note. A meend that leaves M or N starts inside that swara's own band,
// where an eased start would hold it for a third of a slow glide (and a steeper
// middle longer still), as if M or N were a resting note. It leaves along
// ease(1 − (1 − u)²) instead: off the touch in half the time (twice as fast at the start),
// then settling slowly into the swara it lands on; and it too is shortened if
// even that would stay too long. Between Pahadi's swaras a foreign band lies in
// the middle of almost every step (komal Re between S and R, komal Ga between R
// and G, …), so nearly every slow meend is shaped here; --plan lists what each
// one became.
const MEEND = { band: 30, dwell: [0.115, 0.15], steep: 1.6 };
const glideCurve = (p) => (p === 1 ? ease : (u) => {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const a = Math.pow(u, p), b = Math.pow(1 - u, p);
  return ease(a / (a + b));
});
// the inverse of glideCurve(p): the share of the glide's time by which it has covered the share y of its way
function glideAt(p, y) {
  if (y <= 0) return 0;
  if (y >= 1) return 1;
  const v = Math.acos(1 - 2 * y) / Math.PI; // the inverse of ease
  return 1 / (1 + Math.pow((1 - v) / v, 1 / p));
}
// a meend that leaves M or N, and its inverse
const leaveCurve = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : ease(1 - (1 - u) * (1 - u)));
const leaveAt = (y) => (y <= 0 ? 0 : y >= 1 ? 1 : 1 - Math.sqrt(1 - Math.acos(1 - 2 * y) / Math.PI));
const OCT_NAME = { '-2': 'ati-mandra ', '-1': 'mandra ', 0: '', 1: 'tara ', 2: 'ati-tara ' };
// the bands of passBands (in every octave) that lie between two pitches, each with the
// share of the way from `from` to `to` over which the glide is inside it. A band around the
// swara the glide lands on is that swara, and is left out; a band around the swara it
// leaves (only M or N can be one: `leaves`) counts from the start
function bandsBetween(from, to, rg) {
  const lo = Math.min(from, to), hi = Math.max(from, to), w = MEEND.band, out = [];
  for (const b of passBands(rg)) {
    for (let k = Math.floor((lo - w - b.cents) / 1200); b.cents + 1200 * k < hi + w; k++) {
      const c = b.cents + 1200 * k;
      if (c + w <= lo || c - w >= hi || Math.abs(c - to) < 1) continue;
      const y1 = clamp((c - w - from) / (to - from), 0, 1), y2 = clamp((c + w - from) / (to - from), 0, 1);
      out.push({ name: (OCT_NAME[k] ?? '') + b.name, y: [Math.min(y1, y2), Math.max(y1, y2)], leaves: Math.abs(c - from) < 1 });
    }
  }
  return out;
}
// The curve and the time a meend from `from` to `to` (cents) takes, asked to take `tau`
// seconds and to stay at most `cap` seconds in any band it passes; with how long it then
// spends in each band.
function glideFor(from, to, tau, rg, cap = MEEND.dwell[1]) {
  const bands = bandsBetween(from, to, rg), leaves = bands.some((b) => b.leaves);
  const share = (p, y) => (leaves ? leaveAt(y) : glideAt(p, y));
  const dwell = (p, T) => bands.map((b) => T * (share(p, b.y[1]) - share(p, b.y[0])));
  const worst = (p, T) => Math.max(0, ...dwell(p, T));
  let p = 1, T = tau;
  if (worst(1, tau) > cap) {
    if (!leaves) {
      for (let i = 1, best = 1; i <= 30; i++) { // the least steepening that is enough, or the best there is
        const q = 1 + (i * (MEEND.steep - 1)) / 30;
        if (worst(q, tau) < worst(best, tau)) best = q;
        p = best;
        if (worst(q, tau) <= cap) { p = q; break; }
      }
    }
    if (worst(p, tau) > cap) T = (tau * cap) / worst(p, tau);
  }
  const d = dwell(p, T);
  return { curve: leaves ? leaveCurve : glideCurve(p), p, leaves, cap, tau: T, asked: tau, bands: bands.map((b, i) => ({ band: b.name, seconds: d[i] })) };
}
// a pitch moved just outside any band of passBands it falls in, on the side of `target`
// (where a soft scoop into a breath starts: never on a note the raga lacks)
function clearOf(c, target, rg) {
  for (const b of passBands(rg)) {
    const centre = b.cents + 1200 * Math.round((c - b.cents) / 1200);
    if (Math.abs(c - centre) < MEEND.band && Math.abs(target - centre) >= MEEND.band) return target > centre ? centre + MEEND.band : centre - MEEND.band;
  }
  return c;
}

// the pitch (cents re Sa) the contour has reached at time t on its way into the event e
const along = (e, t) => (t <= e.ts ? e.from : t >= e.ts + e.tau ? e.cents : e.from + (e.cents - e.from) * e.curve((t - e.ts) / e.tau));

// How each swara of a phrase is reached: from which pitch, from when, over how long and
// along which curve (step 1 of renderFlute). It is the first use of the phrase's `flute-`
// stream, and the only use of its `meend-` stream (each meend's cap in a band, see MEEND),
// so --plan, which calls it on fresh streams to list the meends, sees exactly what the
// render does.
function reach(ph, R, score) {
  const rg = ragaOf(score.raga), Rm = rng(score.seed, `meend-${ph.index}`);
  let prev = null;
  for (const e of ph.ev) {
    if (e.rest) { prev = null; continue; }
    if (!prev) { // phrase start, or after a silence
      e.onset = true;
      e.ts = e.t0;
      if (e.grace) { // a kan or murki straight after a silence: the tone speaks on it, with a grace's quick approach
        e.from = e.cents - (25 + 25 * R());
        e.tau = Math.min(0.028 + 0.01 * R(), 0.45 * e.dur);
        e.curve = smoother;
      } else { // the breath arrives with a soft scoop up from below, or a meend from the melody swara below
        e.from = e.meend ? below(e.cents, rg) : e.cents - (25 + 25 * R());
        e.tau = e.meend ? clamp((0.35 + 0.25 * R()) * e.dur, 0.15, 2.4) : Math.min(0.14 + 0.08 * R(), 0.6 * e.dur);
        e.curve = e.meend ? ease : smoother;
      }
      if (!e.meend) e.from = clearOf(e.from, e.cents, rg);
    } else {
      // meend: 35–60 % of the swara, easing in and out
      if (e.meend) { e.tau = clamp((0.35 + 0.25 * R()) * e.dur, 0.12, 2.4); e.ts = e.t0; e.curve = ease; }
      else if (e.grace || prev.grace) { e.tau = 0.028 + 0.01 * R(); e.ts = e.t0 - 0.35 * e.tau; e.curve = smoother; }
      else { e.tau = clamp(0.28 * Math.min(prev.dur, e.dur), 0.045, 0.1); e.ts = e.t0 - 0.4 * e.tau; e.curve = smoother; }
      e.from = along(prev, e.ts); // from wherever the last swara has got to: the pitch never jumps
    }
    if (e.meend) {
      const cap = MEEND.dwell[0] + (MEEND.dwell[1] - MEEND.dwell[0]) * Rm(); // one draw for every meend, in order
      const g = glideFor(e.from, e.cents, e.tau, rg, cap);
      e.tau = g.tau; e.curve = g.curve; e.glide = g;
    }
    prev = e;
  }
}

// ============================================================================
// The bansuri
// ============================================================================
// A large bamboo flute played softly, the way Krishna's flute is imagined: sweet,
// airy and singing. A continuous-phase oscillator follows a pitch contour built
// from the score (meend, kan, murki, andolan, a soft scoop into each breath,
// slow drift), so every note-to-note move is a real slide, never a jump. The
// tone is soft-blown and fundamental-dominant (2nd harmonic about −29 dB and 3rd
// about −33 dB in madhya, each wandering ±1 dB, less in tara), a little brighter
// when the breath is stronger, over plenty of breath noise (about −12.5 dB re the
// tone on a held madhya note) in four bands: a band riding on the fundamental
// (the airy halo of a large bamboo flute), a weaker band on the octave, a broad,
// warm band of air near 1.4 kHz and a soft hiss. Each breath arrives as air
// first; the tone speaks 40–80 ms later (up to about 105 ms after a phoonk) and
// fills in over about 0.3–0.5 s with a gentle chiff, and now and then (from the
// phrase's own stream) a small "phoonk" of air comes before it. A phrase that
// opens on a kan or a murki speaks at once instead.
// Long swaras carry breath vibrato: the breath pressure swings about 1.2–1.8 dB
// peak to peak at 4.6–5.3 Hz, arriving after about 0.8 s, with only a trace of
// pitch in it (±2 cents). At the end of a phrase the tone thins into breath
// before the breath stops. Gaps carry a faint inhale.
//
// `part` ('tone' or 'breath') renders only that half, for analysis.
const PHOONK = { chance: 0.4, level: 0.34 };
function renderFlute(plan, N, score, { part } = {}) {
  const SA = score.sa, rg = ragaOf(score.raga);
  const cents = new Float32Array(N), lvl = new Float32Array(N);
  const envT = new Float32Array(N), envB = new Float32Array(N); // tone and breath, apart
  const air = new Float32Array(N), chf = new Float32Array(N), vib = new Float32Array(N), inh = new Float32Array(N), puf = new Float32Array(N);
  const at = (t) => clamp(Math.round(t * SR), 0, N);
  const ranges = [];

  for (const ph of plan.phrases) {
    const R = rng(score.seed, `flute-${ph.index}`);
    const ev = ph.ev, baseDb = 20 * Math.log10(ph.level), pdur = ph.t1 - ph.t0;
    const lastI = ev.length - 1;
    // 1. how each swara is reached
    reach(ph, R, score);
    // 2. pitch contour, swara by swara (each owns the time until the next one starts to move)
    for (let i = 0; i <= lastI; i++) {
      const e = ev[i];
      if (e.rest) continue;
      const next = ev[i + 1];
      const end = !next ? ph.t1 + 0.06 : next.rest ? next.t1 : next.ts;
      const settle = next && !next.rest ? next.ts : e.t1;
      // Andolan: once the swara has settled, it swings slowly (0.85–1.05 Hz) and
      // shallowly *below* itself, 15–25 cents, and keeps coming back to it. A
      // whole number of swings ends just before the next move (the swara is held
      // plain until they begin), so it leaves from and returns to the swara; it
      // never reaches a neighbour (the nearest swara is at least 112 cents away)
      // and stays clear of the ±30-cent band of every note the raga lacks.
      let an = null;
      if (e.andolan) {
        const t0 = e.ts + e.tau + 0.2, tb = settle - 0.2;
        if (tb - t0 > 0.6) {
          const rate = 0.85 + 0.2 * R(), cycles = Math.max(1, Math.floor((tb - t0) * rate)), depth = 17 + 5 * R();
          an = { ta: Math.max(t0, tb - cycles / rate), tb, cycles, depth: Array.from({ length: cycles }, () => depth * (0.9 + 0.2 * R())) };
        }
      }
      for (let n = at(e.onset ? e.t0 : e.ts); n < at(end); n++) {
        const t = n / SR;
        let c = t < e.ts + e.tau ? e.from + (e.cents - e.from) * e.curve((t - e.ts) / e.tau) : e.cents;
        if (an && t > an.ta && t < an.tb) {
          const u = ((t - an.ta) / (an.tb - an.ta)) * an.cycles, j = Math.min(an.cycles - 1, u | 0);
          c -= an.depth[j] * Math.pow(0.5 - 0.5 * Math.cos(TAU * u), 1.2);
        }
        cents[n] = c;
      }
      // 3. breath vibrato on long, plain swaras: it arrives about 0.8 s into the swara (and
      //    after a meend has landed), grows, and fades before the next move. In dB of breath pressure.
      if (!e.grace && !e.andolan && e.dur >= 1.4) {
        const v0 = Math.max(e.t0 + 0.65 + 0.15 * R(), e.ts + e.tau + 0.2), v1 = settle - 0.12;
        const depth = 0.6 + 0.3 * R(), rate = 4.6 + 0.7 * R();
        let p = TAU * R();
        if (v1 - v0 > 0.5) {
          for (let n = at(v0); n < at(v1); n++) {
            const t = n / SR;
            p += (TAU * rate) / SR;
            vib[n] = depth * smoother((t - v0) / 0.5) * smoother((v1 - t) / 0.25) * Math.sin(p);
          }
        }
      }
    }
    // 4. dynamics: phrase arc, register, a messa di voce on long notes, a long diminuendo at
    //    the very end; all gentle, as the flute is played softly (no loud peaks)
    for (let i = 0; i <= lastI; i++) {
      const e = ev[i];
      if (e.rest) { for (let n = at(e.t0); n < at(e.t1); n++) lvl[n] = lvl[Math.max(0, n - 1)]; continue; }
      let j = i;
      while (ev[j].grace && ev[j + 1] && !ev[j + 1].rest) j++; // grace notes take the level of their swara
      const main = ev[j];
      const u = ((main.t0 + main.t1) / 2 - ph.t0) / pdur;
      const d0 = baseDb + 1.8 * Math.sin(Math.PI * Math.pow(u, 0.8)) - 0.9 + clamp(main.cents / 1200, -0.5, 1.4) * 1.5;
      for (let n = at(e.t0); n < at(i === lastI ? ph.t1 + 0.06 : e.t1); n++) {
        const v = clamp((n / SR - e.t0) / e.dur, 0, 1);
        let d = d0;
        if (e.dur >= 1.2 && !e.grace) d += 1.3 * Math.sin(Math.PI * Math.min(1, v * 1.25)) - 1.0 * v;
        if (ph.last && i === lastI) d -= 10 * Math.pow(v, 1.3);
        lvl[n] = d;
      }
    }
    { // smooth the level steps (breath pressure cannot jump)
      const k = 1 - Math.exp(-1 / (0.05 * SR));
      let y1 = lvl[at(ph.t0)], y2 = y1;
      for (let n = at(ph.t0); n < at(ph.t1 + 0.06); n++) { y1 += k * (lvl[n] - y1); y2 += k * (y1 - y2); lvl[n] = y2; }
    }
    // 5. the breath and the tone: onset, release, silences inside the phrase,
    //    re-articulated repeated swaras, the chiff, a little more air in a meend
    const att = 0.3 + 0.16 * R(), lead = 0.04 + 0.04 * R(); // the air arrives first; the tone speaks after it and swells in
    const rel = ph.last ? 1.8 : 0.4 + 0.2 * R();
    // A phrase that opens on a kan or a murki speaks at once (a grace is far shorter than the
    // swell). Any other phrase may open with a gentle "phoonk": a small puff of air before the
    // tone speaks. Whether it does, and how, comes from the phrase's own `phoonk-` stream, so
    // nothing else in the phrase moves with it.
    const Rp = rng(score.seed, `phoonk-${ph.index}`);
    const puff = Rp() < PHOONK.chance ? { dur: 0.08 + 0.06 * Rp(), amp: 0.8 + 0.4 * Rp() } : null;
    const graceFirst = !!ev[0].grace, puffed = puff && !graceFirst;
    const speak = graceFirst ? 0.005 : puffed ? Math.max(lead, 0.75 * puff.dur) : lead, swell = graceFirst ? 0.025 : att - lead;
    if (puffed) {
      for (let n = at(ph.t0); n < at(ph.t0 + puff.dur); n++) puf[n] = puff.amp * Math.pow(Math.sin(Math.PI * Math.pow((n / SR - ph.t0) / puff.dur, 0.6)), 2);
    }
    ph.onsetShape = { att, lead, speak, swell, puff: puffed ? puff : null, graceFirst }; // for timeline.json
    for (let n = at(ph.t0); n < at(ph.t1); n++) {
      const t = n / SR, a = t - ph.t0, r = ph.t1 - t;
      let gT = 1, gB = 1, ai = 0.2;
      if (a < 0.6 * att || a < speak + swell) { gB = ease(a / (0.6 * att)); gT = ease((a - speak) / swell); }
      if (r < rel) {
        const u = r / rel; // 1 → 0 through the release
        gT *= ease((u - 0.3) / 0.7); // the tone thins away first…
        gB *= ease(u / 0.5); // …and the breath a moment after it
        ai += 0.6 * (1 - u);
        cents[n] -= 16 * Math.pow(1 - u, 2) * (ph.last ? 0.5 : 1); // and it sags a little flat
      }
      envT[n] = gT; envB[n] = gB; air[n] = ai;
    }
    for (let i = 0; i <= lastI; i++) {
      const e = ev[i];
      if (e.rest) { // the tone stops just before the air does, and speaks again just after it
        // (at once when a grace note comes next: a kan or murki is shorter than the usual 0.13 s re-entry)
        const quick = ev[i + 1] && ev[i + 1].grace, tIn = quick ? 0.005 : 0.03, tRise = quick ? 0.025 : 0.1;
        for (let n = at(e.t0 - 0.08); n < at(e.t1 + 0.14); n++) {
          const t = n / SR;
          envT[n] *= t < e.t0 ? 1 - ease((t - e.t0 + 0.08) / 0.06) : t < e.t1 + tIn ? 0 : ease((t - e.t1 - tIn) / tRise);
          envB[n] *= t < e.t0 ? 1 - ease((t - e.t0 + 0.05) / 0.05) : t < e.t1 ? 0 : ease((t - e.t1) / 0.06);
        }
        continue;
      }
      const p = ev[i - 1];
      if (p && !p.rest && !p.grace && !e.grace && Math.abs(p.cents - e.cents) < 1) {
        for (let n = at(e.t0 - 0.035); n < at(e.t0 + 0.035); n++) {
          const x = Math.pow(Math.sin((Math.PI * (n / SR - e.t0 + 0.035)) / 0.07), 2);
          envT[n] *= 1 - 0.6 * x; envB[n] *= 1 - 0.25 * x;
        }
      }
      if (e.onset) {
        for (let n = at(e.t0); n < at(e.t0 + 0.4); n++) {
          const a = n / SR - e.t0;
          air[n] += 0.55 * Math.exp(-a / 0.07);
          chf[n] = ease(a / 0.02) * Math.exp(-Math.max(0, a - 0.02) / 0.045);
        }
      }
      if (e.meend) for (let n = at(e.ts); n < at(e.ts + e.tau); n++) air[n] += 0.12 * Math.sin((Math.PI * (n / SR - e.ts)) / e.tau);
    }
    ranges.push({ a: at(ph.t0), b: at(ph.t1 + 0.06), key: `phrase-${ph.index}` });
  }
  // 6. faint inhales in most breathing gaps
  for (let i = 0; i < plan.phrases.length; i++) {
    const nextT0 = plan.phrases[i].t0, prevT1 = i ? plan.phrases[i - 1].t1 : 0, R = rng(score.seed, `inhale-${i + 1}`);
    if (nextT0 - prevT1 < 1.3 || R() > 0.75) continue;
    const d = 0.3 + 0.22 * R(), t1 = nextT0 - 0.1 - 0.06 * R(), t0 = t1 - d;
    for (let n = at(t0); n < at(t1); n++) {
      const u = (n / SR - t0) / d;
      inh[n] = u < 0.82 ? Math.pow(Math.sin((Math.PI / 2) * (u / 0.82)), 1.5) : Math.pow(Math.cos((Math.PI / 2) * ((u - 0.82) / 0.18)), 2);
    }
    ranges.push({ a: at(t0), b: at(t1), key: `inhale-${i + 1}` });
  }
  ranges.sort((x, y) => x.a - y.a);
  for (let i = 0; i + 1 < ranges.length; i++) ranges[i].b = Math.min(ranges[i].b, ranges[i + 1].a);

  // 7. synthesis
  const out = new Float32Array(N), kT = part === 'breath' ? 0 : 1, kB = part === 'tone' ? 0 : 1;
  const bpNorm = (f, q) => 1 / Math.sqrt(((Math.PI / 2) * (f / q)) / (SR / 2)); // unit-RMS output for white input
  const halo1 = new Biquad(), halo2 = new Biquad(), edge = new Biquad();
  const airBP = new Biquad().bandpass(1400, 0.7), hissHP = new Biquad().highpass(2500), hissLP = new Biquad().lowpass(6500);
  const inBP = new Biquad().bandpass(1500, 0.8), inLP = new Biquad().lowpass(4500);
  const puffBP = new Biquad().bandpass(1000, 0.6), puffLP = new Biquad().lowpass(3800); // the phoonk: a soft, low "ph" of air
  const HISS_NORM = 1 / Math.sqrt((6500 - 2500) / (SR / 2)), AIR_NORM = bpNorm(1400, 0.7), IN_NORM = bpNorm(1500, 0.8), PUFF_NORM = bpNorm(1000, 0.6);
  const filters = [halo1, halo2, edge, airBP, hissHP, hissLP, inBP, inLP, puffBP, puffLP];
  for (const { a, b, key } of ranges) {
    // every breath starts afresh: its own random streams on its own clock, the
    // oscillator and the filters at rest, so a phrase depends only on its own notes
    const len = (b - a) / SR + 0.1, S = (name) => rng(score.seed, `${name}-${key}`);
    const noise = gaussian(S('breath'));
    const drift = wander(S('drift'), 0.4, len), jitter = wander(S('jitter'), 7, len);
    const turbA = wander(S('turbA'), 11, len), turbB = wander(S('turbB'), 2.3, len);
    const mod2 = wander(S('h2'), 0.7, len), mod3 = wander(S('h3'), 1.1, len);
    let ph = 0, n1 = 1, n2 = 1, n3 = 1, h2 = 0, h3 = 0, h4 = 0, h5 = 0, reg = 0, fresh = true;
    for (const f of filters) f.reset();
    for (let n = a; n < b; n++) {
      const t = (n - a) / SR, eT = envT[n], eB = envB[n], w = noise();
      let y = 0;
      if (eT > 0 || eB > 0) {
        const v = vib[n];
        const c = cents[n] + 2.5 * v + 2.5 * drift(t) + 0.8 * jitter(t);
        const f = SA * Math.pow(2, c / 1200);
        if (fresh || ((n - a) & 31) === 0) { // (at the breath's first sound too, so no filter keeps the last breath's tuning)
          fresh = false;
          halo1.bandpass(f, 5); n1 = bpNorm(f, 5);
          halo2.bandpass(2 * f, 8); n2 = bpNorm(2 * f, 8);
          edge.bandpass(3 * f, 3); n3 = bpNorm(3 * f, 3);
          // soft-blown and fundamental-dominant, purer from the top of madhya into tara, a
          // little brighter when the breath is stronger
          const oct = Math.log2(f / SA), up = clamp(oct - 0.6, 0, 1.4), down = clamp(-oct, 0, 1);
          const loud = clamp((lvl[n] + 8) / 10, 0, 1) - 0.5;
          h2 = dbToGain(-29 - 10 * up + 1.5 * down + 3 * loud + mod2(t));
          h3 = dbToGain(-33 - 11 * up + 1.5 * down + 3 * loud + mod3(t));
          h4 = dbToGain(-44 - 12 * up + 4 * loud);
          h5 = dbToGain(-53 - 12 * up + 4 * loud);
          reg = 0.15 * down - 0.2 * up; // a bass flute's low notes are breathier, its high ones cleaner
        }
        ph += f / SR; ph -= Math.floor(ph);
        const g = dbToGain(lvl[n]);
        const A = kT * g * eT * dbToGain(v) * (1 + 0.012 * turbA(t) + 0.01 * turbB(t));
        let p2 = 2 * ph + 0.13, p3 = 3 * ph + 0.41, p4 = 4 * ph + 0.07, p5 = 5 * ph + 0.3;
        p2 -= Math.floor(p2); p3 -= Math.floor(p3); p4 -= Math.floor(p4); p5 -= Math.floor(p5);
        const tone = sinT(ph) + h2 * sinT(p2) + h3 * sinT(p3) + h4 * sinT(p4) + h5 * sinT(p5);
        const breathy = 0.55 + air[n] + 0.25 * clamp(-lvl[n] / 8, 0, 1) + reg;
        const gB = kB * g * eB * dbToGain(0.6 * v), An = gB * breathy * 0.707;
        // the breath: the halo on the fundamental, the octave band, the warm air band, the hiss
        y = A * tone
          + An * (0.25 * n1 * halo1.tick(w) + 0.08 * n2 * halo2.tick(w) + 0.125 * AIR_NORM * airBP.tick(w) + 0.03 * HISS_NORM * hissLP.tick(hissHP.tick(w)))
          + gB * chf[n] * 0.03 * n3 * edge.tick(w);
        if (puf[n] > 0) y += kB * g * puf[n] * PHOONK.level * PUFF_NORM * puffLP.tick(puffBP.tick(w));
      }
      if (inh[n] > 0) y += kB * 0.017 * inh[n] * IN_NORM * inLP.tick(inBP.tick(w));
      out[n] += y;
    }
  }
  return out;
}

// ============================================================================
// The tanpura
// ============================================================================
// Four strings tuned Pa (mandra) – Sa – Sa – Sa (kharaj, an octave lower),
// plucked in the traditional unhurried cycle. Each pluck is modal (additive)
// synthesis of up to 90 partials: a soft finger-pad pluck spectrum, slow
// high-partial decay, and the jawari — the curved bridge that makes a tanpura
// buzz — modelled as a band of strongly boosted partials that blooms just
// after the pluck and then sweeps slowly down through the harmonics as the
// string loses energy. Each partial shimmers a little (the string's two
// polarisations beating), the two middle Sa strings are a hair apart so their
// upper partials beat slowly against each other, and every pluck starts a few
// cents sharp (tension) and settles. Rendered circularly so it loops.
function renderTanpura(N, score) {
  const R = rng(score.seed, 'tanpura'), G = gaussian(rng(score.seed, 'tanpura-human'));
  const sa = score.sa / 2; // D3
  const strings = [
    { name: 'Pa', f: (sa * 3) / 4, at: 0, pan: -0.32, gain: 0.85, tau1: 4.2, p: 0.19, c0: 3600, c1: 850 },
    { name: 'Sa', f: sa, at: 0.235, pan: -0.14, gain: 0.8, tau1: 4.0, p: 0.21, c0: 3800, c1: 900 },
    { name: 'Sa', f: sa * Math.pow(2, 1.4 / 1200), at: 0.455, pan: 0.02, gain: 0.8, tau1: 4.0, p: 0.23, c0: 3800, c1: 900 },
    { name: 'Kharaj Sa', f: (sa / 2) * Math.pow(2, 0.6 / 1200), at: 0.675, pan: -0.22, gain: 1.0, tau1: 5.2, p: 0.17, c0: 2800, c1: 600 },
  ];
  // A whole number of cycles fits the loop exactly, and each cycle begins with Pa
  // on the loop point, so the seam falls on a pluck like every other bar.
  const L = N / SR, cycles = Math.max(1, Math.round(L / MUSIC.tanpuraCycle)), C = L / cycles;
  const outL = new Float32Array(N), outR = new Float32Array(N), plucks = [];
  for (const st of strings) {
    const times = [], vel = [];
    for (let k = 0; k < cycles; k++) { times.push((k + st.at) * C + 0.018 * G()); vel.push(dbToGain(1.0 * G())); }
    times.forEach((t, k) => plucks.push({ string: st.name, k, t, phase: t - k * C }));
    const [gl, gr] = panGains(st.pan);
    for (let k = 0; k < cycles; k++) {
      const next = k + 1 < cycles ? times[k + 1] : times[0] + L;
      const ring = next - times[k];
      const buf = renderPluck(st, ring, 0.1 * st.gain * vel[k], R);
      const s0 = Math.round(times[k] * SR);
      for (let i = 0; i < buf.length; i++) {
        const j = (((s0 + i) % N) + N) % N;
        outL[j] += gl * buf[i]; outR[j] += gr * buf[i];
      }
    }
  }
  // the gourd and the room: a little body warmth, softened top
  for (const ch of [outL, outR]) filterLoop(ch, [new Biquad().peaking(200, 0.8, 2), new Biquad().peaking(900, 1, 1.5), new Biquad().highshelf(5500, -4)]);
  return { L: outL, R: outR, cycles, C, plucks };
}

function renderPluck(st, ring, amp, R) {
  const fadeAt = ring - 0.015, fadeLen = 0.085; // the finger lands on the string for the next pluck
  const n = Math.ceil((ring + 0.07) * SR), buf = new Float32Array(n);
  const K = Math.min(90, Math.floor(7500 / st.f));
  const f = [], lf = [], base = [], tau = [], md = [], mr = [], mp = [], ph = new Float64Array(K), a0 = new Float64Array(K);
  for (let k = 1; k <= K; k++) {
    const fk = k * st.f * Math.sqrt(1 + 6e-6 * k * k);
    f.push(fk); lf.push(Math.log2(fk));
    base.push((0.35 + 0.65 * Math.abs(Math.sin(Math.PI * k * st.p))) * Math.pow(k, -1.15) * (1 + 0.15 * (R() - 0.5)));
    tau.push(st.tau1 / (1 + 0.045 * (k - 1)));
    md.push(0.1 + 0.25 * R()); mr.push(0.15 + 1.5 * R()); mp.push(TAU * R());
    ph[k - 1] = R();
  }
  const CR = 64, blocks = Math.ceil(n / CR);
  for (let b = 0; b < blocks; b++) {
    const n0 = b * CR, n1 = Math.min(n, n0 + CR), t = n1 / SR;
    const att = 1 - Math.exp(-t / 0.0045);
    const lc = Math.log2(st.c1 + (st.c0 - st.c1) * Math.exp(-t / 1.5)); // the jawari band slides down
    const gj = 9 * (1 - Math.exp(-t / 0.045)) * (0.5 + 0.5 * Math.exp(-t / 2.8)); // and blooms just after the pluck
    const fade = t < fadeAt ? 1 : t > fadeAt + fadeLen ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * (t - fadeAt)) / fadeLen);
    const mf = (1 + 0.0022 * Math.exp(-t / 0.2)) / SR; // starts a few cents sharp
    const env = amp * att * fade;
    for (let k = 0; k < K; k++) {
      const x = (lf[k] - lc) / 0.62, W = Math.exp(-0.5 * x * x);
      const a1 = env * base[k] * (1 + gj * W) * Math.exp(-t / tau[k]) * (1 + md[k] * (0.4 + W) * Math.cos(TAU * mr[k] * t + mp[k]));
      const da = (a1 - a0[k]) / (n1 - n0), inc = f[k] * mf;
      let a = a0[k], p = ph[k];
      if (a < 1e-7 && a1 < 1e-7) { p += inc * (n1 - n0); ph[k] = p - Math.floor(p); a0[k] = a1; continue; }
      for (let i = n0; i < n1; i++) {
        const xx = p * TBL, ii = xx | 0;
        buf[i] += a * (SINE[ii] + (xx - ii) * (SINE[ii + 1] - SINE[ii]));
        a += da; p += inc; if (p >= 1) p -= 1;
      }
      ph[k] = p; a0[k] = a1;
    }
  }
  // the soft thump of the finger pad
  const nz = gaussian(R), lp = new Biquad().lowpass(1200);
  for (let i = 0; i < Math.min(n, 0.03 * SR); i++) buf[i] += amp * 0.25 * lp.tick(nz()) * Math.exp(-i / (0.004 * SR));
  return buf;
}

// ============================================================================
// The pad (an ambient shruti box)
// ============================================================================
// A soft, warm drone on Sa, Pa and tara Sa, with a quieter mandra Sa beneath
// (no chords: only the drone's own swaras). Each of the four voices is a reed
// harmonic series, and each is sounded by three reeds a few cents apart, the
// gentle chorus of a shruti box (the outer reeds are weak in the fundamental,
// so the chorus lives in the upper partials and the body of the drone stays
// steady). Every partial is weighted by a 4th-order low-pass whose cutoff
// breathes slowly between about 600 and 1200 Hz, so the pad stays dark under
// the flute. Slow swells move each voice by about ±2 dB, each reed wavers by
// ±0.6 cents, and the three reeds of a voice sit left, centre and right (the
// middle reed's partials alternating a little to either side), each drifting
// slowly, for a wide image.
// The middle reeds of all the voices are in tune and waver together, so their
// partials that meet on one frequency (Sa's octave, tara Sa and mandra Sa's 4th
// harmonic at 576.65 Hz; Pa and mandra Sa's 3rd; …) never beat, but as separate
// oscillators they would sum to whatever their start phases made of them, and
// cancel in places (10 dB at 576.65 Hz in mono, measured on the previous
// render). So each such meeting is one oscillator, with one phase: its level in
// each channel is the power sum of the partials it stands for (as unrelated reeds
// add on average), each keeping its own swell and pan.
// Nothing in it is random in time: every partial has a whole number of cycles
// in the loop and every swell, sweep, wavering and drift a whole number of
// periods, so the pad is exactly periodic and sample N - 1 flows into sample 0.
function renderPad(N, score) {
  const R = rng(score.seed, 'pad'), L = N / SR, sa = score.sa;
  const whole = (f) => Math.max(1, Math.round(f * L)) / L; // the nearest frequency with whole cycles in the loop
  const lfo = (seconds) => ({ k: Math.max(1, Math.round(L / seconds)), th: TAU * R() }); // whole periods in the loop
  const sw = (m, t) => Math.sin((TAU * m.k * t) / L + m.th);
  const voices = [
    { name: 'mandra Sa', f: sa / 2, gain: 0.5 },
    { name: 'Sa', f: sa, gain: 1 },
    { name: 'Pa', f: (sa * 3) / 2, gain: 0.62 },
    { name: "Sa'", f: sa * 2, gain: 0.42 },
  ];
  const cut = [lfo(37), lfo(23)], all = lfo(61), wow = lfo(17);
  const osc = [];
  voices.forEach((v, vi) => {
    const swell = lfo(29 + 14 * R());
    // the middle reed carries the voice; the two outer reeds, a few cents either side and
    // far left and right, are weaker in the fundamental and brighter above it, so the chorus
    // shimmers in the upper partials while the drone's body stays steady
    [-3.4, 0, 3.1].forEach((dc, m) => {
      // the middle reeds of all the voices are in tune and waver together (one wow), so the
      // partials they share do not beat; below, each frequency they share is one oscillator
      const reed = { cents: m === 1 ? 0 : dc + 0.8 * (R() - 0.5), pan: [-0.9, 0, 0.9][m] + 0.06 * (R() - 0.5), drift: lfo(41 + 20 * R()), wow: m === 1 ? wow : lfo(13 + 9 * R()), gain: 0.9 + 0.2 * R() };
      for (let k = 1; k * v.f <= 2600; k++) {
        const f = whole(k * v.f * 2 ** (reed.cents / 1200));
        const wow = (f * (2 ** (0.6 / 1200) - 1)) / ((TAU * reed.wow.k) / L); // ±0.6 cents, as a phase swing (cycles)
        const share = m === 1 ? 1 : Math.min(0.85, 0.2 * Math.pow(k, 0.6));
        const pan = m === 1 ? 0.5 * ((k + vi) % 2 ? 1 : -1) : 0; // the middle reed's partials alternate a little left and right
        osc.push({ f, amp: v.gain * reed.gain * share * Math.pow(k, -0.95) * (k % 2 ? 1 : 0.8), swell, reed, pan, wow, p: R() });
      }
    });
  });
  // one oscillator for each frequency the middle reeds share (the same whole number of cycles
  // in the loop, the same wow): the first of them gives the phase, and each keeps its own
  // level, swell and pan (`parts`)
  const bank = [];
  for (const o of osc) {
    const twin = o.reed.wow === wow && bank.find((q) => q.reed.wow === wow && Math.round(q.f * L) === Math.round(o.f * L));
    if (twin) twin.parts.push(o); else bank.push({ ...o, parts: [o] });
  }
  // gains (left, right) and phase swing of one oscillator at time t, with the low-pass at fc:
  // in each channel the power sum of the partials it stands for (just the one, mostly)
  const state = (o, t, fc) => {
    const lp = 1 / Math.sqrt(1 + Math.pow(o.f / fc, 8)), hp = 1 / Math.sqrt(1 + Math.pow(90 / o.f, 4)), g = lp * hp * (1 + 0.12 * sw(all, t));
    let l2 = 0, r2 = 0;
    for (const q of o.parts) {
      const a = g * q.amp * (1 + 0.22 * sw(q.swell, t));
      const [gl, gr] = panGains(clamp(q.reed.pan + q.pan + 0.1 * sw(q.reed.drift, t), -1, 1));
      l2 += a * a * gl * gl; r2 += a * a * gr * gr;
    }
    return [Math.sqrt(l2), Math.sqrt(r2), o.wow * sw(o.reed.wow, t)];
  };
  const fcAt = (t) => 850 * Math.pow(2, 0.33 * sw(cut[0], t) + 0.17 * sw(cut[1], t));
  const outL = new Float32Array(N), outR = new Float32Array(N), CR = 64;
  const fc0 = fcAt(0), cur = bank.map((o) => state(o, 0, fc0));
  for (let n0 = 0; n0 < N; n0 += CR) {
    const n1 = Math.min(N, n0 + CR), m = n1 - n0, fc = fcAt(n1 / SR);
    for (let j = 0; j < bank.length; j++) {
      const o = bank[j], [aL1, aR1, w1] = state(o, n1 / SR, fc), [aL0, aR0, w0] = cur[j], inc = o.f / SR;
      let p = o.p;
      if (Math.max(aL0, aR0, aL1, aR1) > 1e-7) {
        const dL = (aL1 - aL0) / m, dR = (aR1 - aR0) / m, dW = (w1 - w0) / m;
        let aL = aL0, aR = aR0, w = w0;
        for (let i = n0; i < n1; i++) {
          let q = p + w; q -= Math.floor(q);
          const y = sinT(q);
          outL[i] += aL * y; outR[i] += aR * y;
          p += inc; if (p >= 1) p -= 1;
          aL += dL; aR += dR; w += dW;
        }
      } else { p += inc * m; p -= Math.floor(p); }
      o.p = p; cur[j] = [aL1, aR1, w1];
    }
  }
  return { L: outL, R: outR, voices: voices.map((v) => v.name), partials: osc.length, oscillators: bank.length };
}

// ============================================================================
// The swarmandal shimmer
// ============================================================================
// A plucked zither swept with the fingers across its strings, in the breath
// before a phrase marked `shimmer: true` (none in this score: the option is
// kept, off). Its steel strings are tuned to the raga's melody swaras in madhya
// and tara, with ati-tara Sa on top (for Pahadi, like Bhoopali, S R G P D: 11
// strings), each a modal pluck: bright, slightly stretched partials (a stiff
// wire), plucked near the bridge, its two polarisations a fraction of a hertz
// apart; the fundamental rings for 2.2–3.5 s (T60) and the upper partials die
// sooner. The sweep takes 1–1.8 s and ends just before the flute comes in;
// most sweeps rise. Low strings sit to the left, high ones to the right.
const swarmandal = (rg) => [...[...rg.melody], ...[...rg.melody].map((s) => s + "'"), "S''"];
const SHIMMER_RING = 3.6; // seconds a string still sounds after its pluck (its longest T60, with margin)

// Where each shimmer falls. Throws if a shimmer would ring within
// MUSIC.shimmerGuard seconds of the loop's start or end (the seam and the
// crossfade), or if the breath before its phrase is too short to hold it.
function shimmerPlan(plan, N, score = SCORE) {
  const L = N / SR, g = MUSIC.shimmerGuard, out = [];
  for (const ph of plan.phrases) {
    if (!ph.shimmer) continue;
    const R = rng(score.seed, `shimmer-${ph.index}`);
    const prevT1 = ph.index > 1 ? plan.phrases[ph.index - 2].t1 : 0, from = ph.index > 1 ? prevT1 + 0.25 : 0; // after the last breath has gone
    const room = ph.t0 - 0.3 - from;
    if (room < 1) throw new Error(`phrase ${ph.index}: a shimmer needs a breath of at least 1.55 s before the phrase (the gap before it is ${(ph.t0 - prevT1).toFixed(2)} s)`);
    const sweep = Math.min(1 + 0.8 * R(), room), t0 = ph.t0 - 0.3 - sweep, up = R() < 0.7, ring = t0 + sweep + SHIMMER_RING;
    if (t0 < g || ring > L - g) {
      throw new Error(`phrase ${ph.index}: its shimmer would ring at ${t0.toFixed(1)}–${ring.toFixed(1)} s, within ${g} s of the loop's start or end (0 and ${L.toFixed(1)} s), where the seam and the crossfade are; mark a later section start`);
    }
    out.push({ index: ph.index, t0, sweep, up, ring });
  }
  return out;
}

function renderShimmer(plan, N, score) {
  const events = shimmerPlan(plan, N, score);
  const outL = new Float32Array(N), outR = new Float32Array(N), names = swarmandal(ragaOf(score.raga));
  const strings = names.map((s, i) => ({ s, oct: swaraCents(s) / 1200, pan: -0.8 + (1.6 * i) / (names.length - 1) }));
  if (!events.length) return { L: outL, R: outR, events, strings: names.length }; // silent: nothing to filter
  for (const ev of events) {
    const R = rng(score.seed, `swarmandal-${ev.index}`), G = gaussian(R);
    const order = ev.up ? strings : [...strings].reverse();
    order.forEach((st, i) => {
      const u = i / (order.length - 1);
      // the hand slows a little as it travels; each string a few ms early or late; the far end a touch softer
      const t = ev.t0 + ev.sweep * (0.8 * u + 0.2 * u * u) + 0.01 * G();
      const buf = zitherPluck(score.sa * 2 ** st.oct, st.oct, R, 0.1 * dbToGain(-2 * u + 0.8 * G()));
      const [gl, gr] = panGains(st.pan), s0 = Math.round(t * SR);
      for (let j = 0; j < buf.length && s0 + j < N; j++) { outL[s0 + j] += gl * buf[j]; outR[s0 + j] += gr * buf[j]; }
    });
  }
  // a softened top: it shimmers without glare
  for (const ch of [outL, outR]) filterLoop(ch, [new Biquad().highshelf(5000, -4), new Biquad().lowpass(10000)]);
  return { L: outL, R: outR, events, strings: names.length };
}

function zitherPluck(f, oct, R, amp) {
  const t60 = clamp(3.3 - 0.45 * oct + 0.3 * (R() - 0.5), 2.2, 3.5), tau1 = t60 / Math.log(1000);
  const n = Math.ceil(Math.min(t60 + 0.1, SHIMMER_RING) * SR), buf = new Float32Array(n);
  const K = Math.min(24, Math.floor(9000 / f)), B = 1.5e-4, p = 0.1 + 0.05 * R(), atk = 0.002 * SR;
  for (let k = 1; k <= K; k++) {
    const fk = k * f * Math.sqrt(1 + B * k * k), tau = tau1 / (1 + 0.15 * (k - 1));
    const a = amp * Math.abs(Math.sin(Math.PI * k * p)) * Math.pow(k, -0.7) * (1 + 0.2 * (R() - 0.5));
    const i1 = fk / SR, i2 = (fk + 0.25 + 0.9 * R()) / SR, dec = Math.exp(-1 / (tau * SR));
    const m = Math.min(n, Math.ceil(tau * Math.log(1e5) * SR)); // until it is 100 dB down
    let e = a, q1 = R(), q2 = R();
    for (let i = 0; i < m; i++) {
      const s = i < atk ? 0.5 - 0.5 * Math.cos((Math.PI * i) / atk) : 1;
      buf[i] += e * s * (sinT(q1) + 0.35 * sinT(q2));
      e *= dec; q1 += i1; if (q1 >= 1) q1 -= 1; q2 += i2; if (q2 >= 1) q2 -= 1;
    }
  }
  // the fingertip leaving the wire
  const g = gaussian(R), bp = new Biquad().bandpass(3800, 1.5);
  for (let i = 0; i < 0.02 * SR; i++) buf[i] += 0.15 * amp * bp.tick(g()) * Math.exp(-i / (0.006 * SR));
  const f0 = n - Math.round(0.1 * SR); // nothing is cut off
  for (let i = f0; i < n; i++) buf[i] *= Math.pow(Math.cos((Math.PI / 2) * ((i - f0) / (n - f0))), 2);
  return buf;
}

// ============================================================================
// The hall: synthetic stereo impulse response + circular FFT convolution
// ============================================================================
// A stone hall, more intimate than a large one, so the breath stays audible and
// does not wash out: it is the flute's space, not an instrument. A sparse
// cluster of dulled early reflections in the first 110 ms (weak, so no slap),
// then a dense, decorrelated stereo tail that builds up gently and whose decay
// time falls with frequency (≈3.9 s in the low mids, ≈2.8 s at 2 kHz, ≈1.4 s at
// 8 kHz), with its top rolled off. The tail is synthesised frame by frame
// (random phase, frequency-dependent decay). Its low end is then made to reach
// the two channels nearly alike, as it reaches two nearby points in a real room
// (see cohere), and a little of each channel (IR_CROSS, -18 dB) is mixed into the
// other: the flute's few, narrow partials each meet the tail's fine structure at
// one pitch, where the two channels can still be opposed by chance (the reverb's
// third-octave bands at 200, 252 and 800 Hz read -0.13, -0.04 and -0.17 without
// it, measured), and this lifts every band to +0.05 or more (800 Hz is the lowest; +0.28
// overall).
const IR_CROSS = 0.12;
function makeIR(seed, seconds = 5.2) {
  const R = rng(seed, 'hall'), M = Math.round(seconds * SR), pre = Math.round(0.022 * SR);
  const T60 = [[63, 3.5], [125, 3.8], [250, 3.95], [500, 3.9], [1000, 3.5], [2000, 2.8], [4000, 2.1], [8000, 1.4], [16000, 0.8]];
  const t60 = (fr) => {
    if (fr <= T60[0][0]) return T60[0][1];
    for (let i = 1; i < T60.length; i++) if (fr <= T60[i][0]) {
      const u = Math.log2(fr / T60[i - 1][0]) / Math.log2(T60[i][0] / T60[i - 1][0]);
      return T60[i - 1][1] + u * (T60[i][1] - T60[i - 1][1]);
    }
    return T60.at(-1)[1];
  };
  const F = 2048, hop = 512, bins = F / 2, win = new Float64Array(F);
  for (let i = 0; i < F; i++) win[i] = 0.5 - 0.5 * Math.cos((TAU * i) / F);
  const shape = new Float64Array(bins), rate = new Float64Array(bins);
  for (let k = 1; k < bins; k++) {
    const fr = (k * SR) / F, h = Math.pow(fr / 110, 2);
    shape[k] = (h / (1 + h)) * (fr > 800 ? Math.pow(800 / fr, 0.2) : 1) / (1 + Math.pow(fr / 9000, 4)); // a soft top
    rate[k] = -3 / t60(fr); // log10 amplitude per second
  }
  const ir = [];
  for (const side of [0, 1]) {
    const y = new Float64Array(M + F);
    const re = new Float64Array(F), im = new Float64Array(F);
    for (let s = 0; s < M; s += hop) {
      const tc = (s + F / 2) / SR; // frame centre
      re.fill(0); im.fill(0);
      for (let k = 1; k < bins; k++) {
        const mag = shape[k] * Math.pow(10, rate[k] * tc), th = TAU * R();
        re[k] = mag * Math.cos(th); im[k] = mag * Math.sin(th);
        re[F - k] = re[k]; im[F - k] = -im[k];
      }
      fft(re, im, true);
      for (let i = 0; i < F; i++) y[s + i] += re[i] * win[i];
    }
    const tail = new Float32Array(M);
    for (let i = pre; i < M; i++) {
      const t = (i - pre) / SR;
      tail[i] = y[i] * (1 - Math.exp(-t / 0.05)) * (i > M - 0.25 * SR ? Math.pow(Math.cos((Math.PI / 2) * ((i - (M - 0.25 * SR)) / (0.25 * SR))), 2) : 1);
    }
    // early reflections off stone pillars and the floor, dulled (a little closer together than in a large hall)
    let eTail = 0;
    for (let i = 0; i < M; i++) eTail += tail[i] * tail[i];
    const er = new Float32Array(M);
    const taps = (side ? [15.7, 23.6, 27.2, 35.4, 51.5, 61.6, 73.8, 85.8, 101.1, 118.9] : [13.6, 20.0, 29.5, 38.9, 46.2, 58.2, 68.9, 81.9, 93.9, 111.2]).map((ms) => 0.88 * ms);
    for (const ms of taps) {
      const c = Math.round((ms / 1000) * SR) + pre, g = (R() < 0.5 ? -1 : 1) * (0.7 + 0.6 * R()) * Math.exp(-ms / 80);
      for (let j = -6; j <= 6; j++) er[c + j] += g * (0.5 + 0.5 * Math.cos((Math.PI * j) / 7)); // dulled
    }
    let eEr = 0;
    for (let i = 0; i < M; i++) eEr += er[i] * er[i];
    const ge = Math.sqrt((0.15 * eTail) / eEr);
    for (let i = 0; i < M; i++) tail[i] += ge * er[i];
    ir.push(tail);
  }
  cohere(ir[0], ir[1]);
  for (let i = 0; i < M; i++) { const l = ir[0][i], r = ir[1][i]; ir[0][i] = l + IR_CROSS * r; ir[1][i] = r + IR_CROSS * l; }
  let e = 0;
  for (const ch of ir) for (let i = 0; i < M; i++) e += ch[i] * ch[i];
  scaleAll(1 / Math.sqrt(e / 2), ...ir);
  return { L: ir[0], R: ir[1] };
}

// In a room the low end reaches two nearby points almost alike, and only higher up do
// they differ: the coherence of a diffuse field between two points d apart is
// sin x / x, x = 2πf·d/c. Two independently synthesised channels do not do that. Their
// few low-frequency components, and the sparse early reflections that carry most of the
// energy below 100 Hz, correlate at random: as low as −0.74 in one third-octave band
// (measured on the previous IR), which made the hall thinner in mono than an
// uncorrelated pair would be. So each band below about 340 Hz is brought up to about the
// coherence of two points half a metre apart (0.87 at 100 Hz, 0.53 at 200 Hz, 0 at
// 343 Hz), and up to 400 Hz none is left anti-correlated (the lift fades out by 500 Hz),
// by rebalancing the channels' sum against their difference; each keeps its energy, so
// the colour and the decay times stay as they are. A band already as coherent as that is
// left alone. In place, zero-phase.
function cohere(L, R, d = 0.5) {
  const M = L.length, F = 1 << Math.ceil(Math.log2(M + SR)), half = F / 2;
  const mr = new Float64Array(F), mi = new Float64Array(F), sr = new Float64Array(F), si = new Float64Array(F);
  for (let i = 0; i < M; i++) { mr[i] = 0.5 * (L[i] + R[i]); sr[i] = 0.5 * (L[i] - R[i]); }
  fft(mr, mi); fft(sr, si);
  // the powers of the sum and the difference, summed up to each bin (for third-octave bands)
  const cm = new Float64Array(half + 2), cs = new Float64Array(half + 2);
  for (let k = 0; k <= half; k++) { cm[k + 1] = cm[k] + mr[k] * mr[k] + mi[k] * mi[k]; cs[k + 1] = cs[k] + sr[k] * sr[k] + si[k] * si[k]; }
  for (let k = 1, top = Math.ceil((500 * F) / SR); k <= top; k++) {
    const f = (k * SR) / F, x = (TAU * f * d) / 343, lift = f <= 400 ? 1 : ease((500 - f) / 100);
    const a = Math.max(1, Math.floor(k / 2 ** (1 / 6))), b = Math.min(half, Math.ceil(k * 2 ** (1 / 6)));
    const pm = cm[b + 1] - cm[a], ps = cs[b + 1] - cs[a], r = (pm - ps) / (pm + ps);
    const want = x < Math.PI ? Math.sin(x) / x : 0;
    if (!(pm > 0 && ps > 0) || r >= want) continue;
    const rho = r + lift * (want - r); // the band's new correlation
    const h = Math.sqrt(((1 + rho) * (pm + ps)) / (2 * pm)), g = Math.sqrt(((1 - rho) * (pm + ps)) / (2 * ps));
    for (const j of [k, F - k]) { mr[j] *= h; mi[j] *= h; sr[j] *= g; si[j] *= g; }
  }
  fft(mr, mi, true); fft(sr, si, true);
  for (let i = 0; i < M; i++) { L[i] = mr[i] + sr[i]; R[i] = mr[i] - sr[i]; }
}

// Circular convolution of a mono send with a stereo IR (overlap-add, FFT 2^19,
// blocks of 2^17: room for an IR of up to 8.9 s). One complex IFFT yields both
// channels: Y = X·Hl + i·X·Hr.
function convolveLoop(x, irL, irR) {
  const N = x.length, M = irL.length, F = 1 << 19, B = 1 << 17;
  if (B + M - 1 > F) throw new Error('impulse response too long for the FFT block');
  const Hl = [new Float64Array(F), new Float64Array(F)], Hr = [new Float64Array(F), new Float64Array(F)];
  Hl[0].set(irL); Hr[0].set(irR); fft(Hl[0], Hl[1]); fft(Hr[0], Hr[1]);
  const yL = new Float64Array(N + F), yR = new Float64Array(N + F);
  const re = new Float64Array(F), im = new Float64Array(F);
  for (let s = 0; s < N; s += B) {
    re.fill(0); im.fill(0);
    for (let i = 0; i < B && s + i < N; i++) re[i] = x[s + i];
    fft(re, im);
    for (let k = 0; k < F; k++) {
      const xr = re[k], xi = im[k];
      const lr = xr * Hl[0][k] - xi * Hl[1][k], li = xr * Hl[1][k] + xi * Hl[0][k];
      const rr = xr * Hr[0][k] - xi * Hr[1][k], ri = xr * Hr[1][k] + xi * Hr[0][k];
      re[k] = lr - ri; im[k] = li + rr;
    }
    fft(re, im, true);
    for (let i = 0; i < B + M - 1; i++) { yL[s + i] += re[i]; yR[s + i] += im[i]; }
  }
  const L = new Float32Array(N), Rr = new Float32Array(N);
  for (let i = 0; i < N + F; i++) { const j = i % N; L[j] += yL[i]; Rr[j] += yR[i]; } // fold the tail onto the start
  return { L, R: Rr };
}

// ============================================================================
// Temple sounds
// ============================================================================
// Modal synthesis: each vibration mode of the bell is a decaying sine, split
// into a close doublet (a real bell is never perfectly round), which gives the
// slow "wah-wah" beating of brass temple bells. Long-lived modes are tuned to
// Sa and Ga of the same D as the music (from SCORE.sa, so at A4 = 432 Hz);
// the short, inharmonic ones are what make it metal.
function modal(seconds, modes, strikes, R, { tick = 0, tickHz = 6500, fadeLen = 0.6 } = {}) {
  const n = Math.round(seconds * SR), out = new Float32Array(n);
  for (const s of strikes) {
    const s0 = Math.round(s.t * SR);
    for (const [ratio, amp, tau, split, splitAmp] of modes) {
      const fA = s.f * ratio, fB = fA + split, pA = R(), pB = R(), a = amp * s.gain * (1 + 0.1 * (R() - 0.5));
      for (let i = s0; i < n; i++) {
        const t = (i - s0) / SR, d = Math.exp(-t / tau);
        if (d < 1e-5) break;
        const atk = Math.min(1, t / (s.soft || 0.0004));
        out[i] += a * d * atk * (Math.sin(TAU * (fA * t + pA)) + splitAmp * Math.sin(TAU * (fB * t + pB)));
      }
    }
    if (tick) { // the clapper's contact
      const g = gaussian(R), bp = new Biquad().bandpass(tickHz, 1.2);
      for (let i = 0; i < 0.03 * SR && s0 + i < n; i++) out[s0 + i] += tick * s.gain * bp.tick(g()) * Math.exp(-i / (0.0025 * SR));
    }
  }
  const f0 = n - Math.round(fadeLen * SR);
  for (let i = f0; i < n; i++) out[i] *= Math.pow(Math.cos((Math.PI / 2) * ((i - f0) / (n - f0))), 2);
  return out;
}

function renderGhanta(seed) {
  const R = rng(seed, 'ghanta'), f = 2 * SCORE.sa * 2; // D6
  const modes = [ // ratio, amplitude, decay (s), doublet split (Hz), doublet amplitude
    [0.5, 0.05, 0.9, 0.9, 0.3],
    [1.0, 1.0, 0.85, 2.3, 0.55], // Sa
    [2.5, 0.55, 0.55, 3.6, 0.5], // Ga, two octaves up
    [4.23, 0.32, 0.22, 5.1, 0.45],
    [6.05, 0.22, 0.13, 6.7, 0.4],
    [8.38, 0.14, 0.08, 9.0, 0.4],
    [11.12, 0.08, 0.05, 11, 0.3],
  ];
  return modal(3.0, modes, [{ t: 0, f, gain: 1 }, { t: 0.105 + 0.01 * R(), f, gain: 0.2 }], R, { tick: 0.18, fadeLen: 0.9 });
}

function renderChime(swara, seed) {
  const R = rng(seed, 'chime-' + swara);
  const f = 2 * SCORE.sa * (swara === 'S2' ? 2 : RATIO[swara]); // tara sthayi: D5 … D6
  const modes = [
    [1.0, 1.0, 0.5, 1.1, 0.35],
    [2.0, 0.1, 0.35, 1.7, 0.3],
    [3.0, 0.07, 0.25, 2.3, 0.3],
    [5.4, 0.1, 0.035, 0, 0],
    [8.93, 0.05, 0.02, 0, 0],
  ];
  return modal(1.7, modes, [{ t: 0, f, gain: 1, soft: 0.003 }], R, { fadeLen: 0.55 });
}

// A conch played softly: a lip-buzzed harmonic tone whose brightness grows
// with breath, shaped by the shell's resonance near 1.1 kHz, with breath
// noise. It swells in, sounds briefly and dies away; Sa = D4 (SCORE.sa).
function renderShankha(seed) {
  const R = rng(seed, 'shankha'), G = gaussian(rng(seed, 'shankha-air'));
  const seconds = 1.9, n = Math.round(seconds * SR), out = new Float32Array(n), f0 = SCORE.sa;
  const rough = wander(rng(seed, 'shankha-rough'), 9, seconds);
  const bpF = new Biquad().bandpass(f0, 6), bpS = new Biquad().bandpass(1150, 1.5);
  const nF = 1 / Math.sqrt(((Math.PI / 2) * (f0 / 6)) / (SR / 2)), nS = 1 / Math.sqrt(((Math.PI / 2) * (1150 / 1.5)) / (SR / 2));
  const H = 14, phs = Array.from({ length: H }, () => R());
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const l = t < 0.85 ? Math.pow(Math.sin((Math.PI / 2) * (t / 0.85)), 2) : t < 1.1 ? 1 : Math.pow(Math.cos((Math.PI / 2) * Math.min(1, (t - 1.1) / 0.8)), 2);
    const c = -55 * (1 - smoother(t / 0.35)) - (t > 1.1 ? 25 * Math.pow(Math.min(1, (t - 1.1) / 0.8), 2) : 0);
    const f = f0 * Math.pow(2, c / 1200);
    ph += f / SR; ph -= Math.floor(ph);
    const loud = 0.6 * l, slope = 2.8 - 1.4 * loud;
    let tone = 0;
    for (let h = 1; h <= H; h++) {
      const fh = h * f;
      if (fh > 5000) break;
      const x = Math.log2(fh / 1150) / 0.45;
      tone += Math.pow(h, -slope) * (1 + 1.2 * Math.exp(-0.5 * x * x)) * Math.sin(TAU * (h * ph + phs[h - 1]));
    }
    const w = G();
    out[i] = l * (tone * (1 + 0.015 * rough(t)) + 0.05 * (nF * bpF.tick(w) + 0.6 * nS * bpS.tick(w)));
  }
  const lp = new Biquad().lowpass(4500);
  for (let i = 0; i < n; i++) out[i] = lp.tick(out[i]);
  return out;
}

// ============================================================================
// Files
// ============================================================================
function wavFloat(channels) {
  const nCh = channels.length, n = channels[0].length, bytes = n * nCh * 4;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + bytes, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(nCh, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * nCh * 4, 28); buf.writeUInt16LE(nCh * 4, 32); buf.writeUInt16LE(32, 34);
  buf.write('data', 36); buf.writeUInt32LE(bytes, 40);
  for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < nCh; c++, o += 4) buf.writeFloatLE(channels[c][i], o);
  return buf;
}
function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.error) throw new Error(`ffmpeg not found (${r.error.message}); install it or run with --wav`);
  if (r.status !== 0) throw new Error('ffmpeg failed:\n' + r.stderr.slice(-3000));
  return r.stderr;
}
// ffmpeg loudnorm, measuring pass
function measure(file, I, TP) {
  const err = ffmpeg(['-i', file, '-af', `loudnorm=I=${I}:TP=${TP}:LRA=20:print_format=json`, '-f', 'null', '-']);
  const j = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1));
  return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, isNaN(+v) ? v : +v]));
}
// Second pass: the static gain that loudnorm's linear mode would apply. Applied
// with `volume` rather than loudnorm itself, because loudnorm resamples to
// 192 kHz and back, and the resampler's edge effects would mark the loop seam.
function linearGain(m, I, TP) {
  let gain = I - m.input_i;
  if (m.input_tp + gain > TP) { console.warn(`  ! true peak would reach ${(m.input_tp + gain).toFixed(2)} dBTP; lowering the gain`); gain = TP - m.input_tp; }
  return gain;
}
// EBU R128 integrated loudness and true peak of a finished file (ffmpeg ebur128)
function ebur128(file) {
  const err = ffmpeg(['-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const s = err.slice(err.lastIndexOf('Summary:'));
  return { lufs: +/I:\s+(-?[\d.]+) LUFS/.exec(s)[1], lra: +/LRA:\s+(-?[\d.]+) LU/.exec(s)[1], truePeak: +/Peak:\s+(-?[\d.]+) dBFS/.exec(s)[1] };
}
// An MP3 decoded as a player that reads its gapless header decodes it (ffmpeg, as Chromium
// does): interleaved stereo samples
async function decodeMp3(file, work) {
  const raw = join(work, 'decoded.f32');
  try {
    ffmpeg(['-i', file, '-f', 'f32le', '-c:a', 'pcm_f32le', '-ac', '2', raw]);
    const b = readFileSync(raw);
    return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
  } finally {
    await rm(raw, { force: true });
  }
}
// the q-quantile of some numbers, interpolated linearly between the two nearest (as numpy's default)
function percentile(xs, q) {
  const a = Float64Array.from(xs).sort(), x = q * (a.length - 1), i = Math.floor(x);
  return i + 1 < a.length ? a[i] + (x - i) * (a[i + 1] - a[i]) : a[i];
}
// Encode, measure the MP3 itself, and re-encode once with the residual
// corrected: libmp3lame scales its input by 0.95 (-0.45 dB), and the codec
// shifts loudness a little more, so the target is checked on the real file.
function encodeTo(target, mp3, encode, gain = 0) {
  encode(gain);
  let m = ebur128(mp3);
  if (Math.abs(target - m.lufs) > 0.05) { gain += target - m.lufs; encode(gain); m = ebur128(mp3); }
  return { gain, ...m };
}
const kb = async (f) => Math.round((await stat(f)).size / 1024);
// The Info/Xing tag ffmpeg writes in the first frame, after the side information: where the
// frame starts (`frame`) and where its LAME extension starts (`lame`), and the frame count.
function infoTag(d) {
  const frame = d.subarray(0, 3).toString() === 'ID3' ? 10 + ((d[6] << 21) | (d[7] << 14) | (d[8] << 7) | d[9]) : 0;
  const first = d.subarray(frame, frame + 64);
  const at = Math.max(first.indexOf('Info'), first.indexOf('Xing'));
  if (at < 0) return null;
  const tag = frame + at, flags = d.readUInt32BE(tag + 4);
  let p = tag + 8, frames = null;
  if (flags & 1) { frames = d.readUInt32BE(p); p += 4; }
  if (flags & 2) p += 4;
  if (flags & 4) p += 100;
  if (flags & 8) p += 4;
  return { frame, lame: p, frames };
}
// The gapless fields of that tag: encoder delay and end padding, which decoders use to
// return exactly the original samples.
async function gapless(file) {
  const d = await readFile(file), t = infoTag(d);
  if (!t) return null;
  const p = t.lame, delay = (d[p + 21] << 4) | (d[p + 22] >> 4), padding = ((d[p + 22] & 15) << 8) | d[p + 23];
  return { encoder: d.subarray(p, p + 9).toString().replace(/\0/g, ''), encoderDelay: delay, padding, frames: t.frames, samples: t.frames * 1152 - delay - padding };
}
// CRC-16 (ARC: polynomial 0x8005 reflected, initial 0), the checksum of the LAME tag
function crc16(bytes) {
  let c = 0;
  for (const x of bytes) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1; }
  return c;
}
// Make an MP3's Info tag describe exactly `samples` samples of music that start `lead`
// samples into what was encoded: the encoder delay grows by `lead`, and the end padding is
// set from the frame count (ffmpeg's own figure can be a few samples off: 15 short for one
// length measured here, which a gapless decoder then returns as extra samples). The tag's
// CRC (over the bytes of the frame before it) is rewritten. The CRC is checked first, so a
// tag laid out otherwise is refused rather than corrupted; that includes ffmpeg's own mono and
// MPEG-2 files, whose CRC ffmpeg takes over a fixed 190 bytes: this suits the stereo 44.1 kHz
// music only (where both conventions cover the same 190 bytes). Returns false, and leaves the
// file as it was, when the padding would not fit the tag's 12 bits.
function setGapless(file, lead, samples) {
  const d = readFileSync(file), t = infoTag(d);
  if (!t || !t.frames) throw new Error(`${file}: no Info tag with a frame count to carry the gapless fields`);
  const p = t.lame, crcAt = p + 34;
  if (crc16(d.subarray(t.frame, crcAt)) !== d.readUInt16BE(crcAt)) throw new Error(`${file}: the LAME tag is not laid out as expected (its CRC does not match)`);
  const delay = ((d[p + 21] << 4) | (d[p + 22] >> 4)) + lead, padding = t.frames * 1152 - delay - samples;
  if (delay > 4095) throw new Error(`${file}: an encoder delay of ${delay} would not fit the tag's 12 bits`);
  if (padding < 0 || padding > 4095) return false;
  d[p + 21] = delay >> 4; d[p + 22] = ((delay & 15) << 4) | (padding >> 8); d[p + 23] = padding & 255;
  d.writeUInt16BE(crc16(d.subarray(t.frame, crcAt)), crcAt);
  writeFileSync(file, d);
  return true;
}

// ============================================================================
// Main
// ============================================================================
// The tanpura's pluck grid, for a player that loops with two <audio> elements and
// cannot hit the loop point to the sample. Every cycle has the same shape (Pa, Sa,
// Sa, kharaj Sa, then a quiet stretch while the strings ring), so crossfading the
// last cycle into the first at the same point of the cycle, inside that quiet
// stretch, keeps the plucks in their rhythm. One cycle of drone is skipped per loop;
// the flute is silent there (it ends long before the last cycle and starts after
// the first). Crossfading the end of the file into its start (B at 0) instead lays
// two different stretches of the pattern over each other: extra and missing plucks.
function tanpuraGrid(tan, plan) {
  const { cycles: K, C, plucks } = tan;
  const kharaj = Math.max(...plucks.filter((p) => p.string === 'Kharaj Sa').map((p) => p.phase));
  const nextPa = C + Math.min(...plucks.filter((p) => p.string === 'Pa').map((p) => p.phase));
  const quiet = [kharaj + 0.2, nextPa - 0.05]; // after the last pluck's attack has settled, before the next Pa
  const xf = Math.min(0.6, Math.max(0.2, quiet[1] - quiet[0] - 0.5));
  const bAt = quiet[0] + 0.1, aFrom = (K - 1) * C + bAt;
  if (aFrom < plan.fluteEnd + 4 || bAt + xf > plan.fluteStart) console.warn('  ! the cycle-aligned crossfade would overlap the flute');
  const r = (x) => +x.toFixed(4);
  return {
    cycles: K, cycleSeconds: r(C), plucksPerCycle: ['Pa', 'Sa', 'Sa', 'Kharaj Sa'],
    quietInCycle: quiet.map(r),
    crossfade: { aFrom: r(aFrom), bAt: r(bAt), seconds: xf,
      note: 'For a two-<audio> player: when A reaches aFrom, start B at bAt (better: at A.currentTime - (cycles - 1) * cycleSeconds) and crossfade with equal-power curves over `seconds`. Both are at the same point of the tanpura cycle with only the drone and the pad sounding; anywhere inside quietInCycle works. The pad is periodic over the whole loop, not over one cycle, so during the fade the two elements play different moments of the pad (equal-power keeps its level; its partials are not phase-aligned). The xfade file avoids this.' },
  };
}

const NAME = `flute-${SCORE.raga.toLowerCase()}`; // flute-pahadi: the music's file names
const TUNING = `A4 = ${+(SCORE.sa * 2 ** (7 / 12)).toFixed(2)} Hz`;
// The loop's own MP3 is encoded circularly. An MP3 encoder starts from silence (its
// priming) and ends in silence (its padding), while the loop's first and last samples sit
// in the middle of the drone, so a plain encode leaves a step at both edges of the file: a
// click wherever a player wraps it. Instead the loop's last WRAP samples go before it and
// its first WRAP after it (half that, if the padding would not fit the tag), and the Info
// tag's encoder delay and end padding are raised to match (setGapless): a decoder that
// reads the tag returns exactly the loop, decoded from frames that ran through the wrap as
// through any other moment of the music.
const WRAP = 2304; // two MP3 frames

// Where the 30 s excerpt starts: 1.5 s before phrase SCORE.excerptFrom. Throws if that names
// no phrase or the excerpt would run past the end of the loop (it would end without its fade).
function excerptStart(plan, score = SCORE) {
  const k = score.excerptFrom, n = plan.phrases.length;
  if (!Number.isInteger(k) || k < 1 || k > n) throw new Error(`excerptFrom is ${k}: write the number of a phrase, 1–${n}`);
  const ex = Math.max(0, plan.phrases[k - 1].t0 - 1.5);
  if (ex + 30 > plan.length) throw new Error(`excerptFrom ${k}: a 30 s excerpt from ${ex.toFixed(1)} s runs past the end of the loop (${plan.length.toFixed(1)} s)`);
  return ex;
}

async function renderMusic(work, encode, xfadeTail = 0, ship = []) {
  const t0 = Date.now();
  const plan = schedule(SCORE);
  const N = Math.round(plan.length * SR), T = Math.round(xfadeTail * SR);
  // the options and the score are checked before anything is rendered or written
  if (T > N) throw new Error(`--xfade-tail ${xfadeTail}: longer than the loop (${(N / SR).toFixed(1)} s)`);
  const ex = excerptStart(plan);
  const shim = renderShimmer(plan, N, SCORE); // it checks where the shimmers fall
  console.log(`music: Raga ${SCORE.raga}, ${plan.phrases.length} phrases, flute ${plan.fluteStart.toFixed(1)}–${plan.fluteEnd.toFixed(1)} s, loop ${(N / SR).toFixed(3)} s (${N} samples)`);

  const flute = renderFlute(plan, N, SCORE);
  console.log(`  flute rendered (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const tan = renderTanpura(N, SCORE);
  console.log(`  tanpura rendered (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const pad = renderPad(N, SCORE);
  console.log(`  pad rendered: ${pad.partials} partials in ${pad.oscillators} oscillators (${((Date.now() - t0) / 1000).toFixed(1)} s); ${shim.events.length ? `${shim.events.length} shimmers` : 'no shimmer'}`);

  // every layer is set by loudness relative to the flute's
  const [fl, fr] = panGains(MUSIC.flutePan);
  const fL = flute.map((x) => x * fl), fR = flute.map((x) => x * fr);
  const lFlute = lufs([fL, fR]);
  const setLU = (st, lu) => scaleAll(dbToGain(lFlute + lu - lufs([st.L, st.R])), st.L, st.R);
  setLU(tan, MUSIC.tanpuraLU);
  setLU(pad, MUSIC.padLU);
  if (shim.events.length) setLU(shim, MUSIC.shimmerLU); // measured over the moments it rings (gated)
  const bed = lufs([tan.L.map((x, i) => x + pad.L[i]), tan.R.map((x, i) => x + pad.R[i])]) - lFlute; // the tanpura and the pad together

  const send = new Float32Array(N), S = MUSIC.send;
  for (let i = 0; i < N; i++) send[i] = flute[i] + 0.5 * (S.tanpura * (tan.L[i] + tan.R[i]) + S.pad * (pad.L[i] + pad.R[i]) + S.shimmer * (shim.L[i] + shim.R[i]));
  const ir = makeIR(SCORE.seed);
  const wet = convolveLoop(send, ir.L, ir.R);
  const dryL = new Float32Array(N), dryR = new Float32Array(N);
  for (let i = 0; i < N; i++) { dryL[i] = fL[i] + tan.L[i] + pad.L[i] + shim.L[i]; dryR[i] = fR[i] + tan.R[i] + pad.R[i] + shim.R[i]; }
  const wg = dbToGain(lufs([dryL, dryR]) + MUSIC.wetLU - lufs([wet.L, wet.R]));
  const L = new Float32Array(N), Rt = new Float32Array(N);
  for (let i = 0; i < N; i++) { L[i] = dryL[i] + wg * wet.L[i]; Rt[i] = dryR[i] + wg * wet.R[i]; }
  for (const ch of [L, Rt]) filterLoop(ch, [new Biquad().highpass(MUSIC.lowCut)]);
  const norm = dbToGain(-1) / peakOf(L, Rt);
  scaleAll(norm, L, Rt);
  const under = shim.events.length ? 20 * Math.log10(peakOf(fL, fR) / peakOf(shim.L, shim.R)) : null;
  console.log(`  mixed (${((Date.now() - t0) / 1000).toFixed(1)} s): flute ${lFlute.toFixed(1)} LUFS; tanpura ${-MUSIC.tanpuraLU} LU and pad ${-MUSIC.padLU} LU below it (together ${(-bed).toFixed(1)} LU below)${under != null ? `, shimmer ${-MUSIC.shimmerLU} LU below (its peaks ${under.toFixed(1)} dB under the flute's)` : ''}; reverb ${-MUSIC.wetLU} LU below the dry mix`);

  await mkdir(work, { recursive: true });
  const wav = join(work, `${NAME}.wav`);
  await writeFile(wav, wavFloat([L, Rt]));
  // stems for analysis (same gain as in the mix, before the master's low cut)
  const g = norm, st = (x) => x.map((v) => v * g);
  await writeFile(join(work, 'stem-flute-dry.wav'), wavFloat([st(flute)]));
  await writeFile(join(work, 'stem-tanpura.wav'), wavFloat([st(tan.L), st(tan.R)]));
  await writeFile(join(work, 'stem-pad.wav'), wavFloat([st(pad.L), st(pad.R)]));
  // the swarmandal's stem only when it rings (an earlier score's, if any, goes)
  if (shim.events.length) await writeFile(join(work, 'stem-shimmer.wav'), wavFloat([st(shim.L), st(shim.R)]));
  else await rm(join(work, 'stem-shimmer.wav'), { force: true });
  await writeFile(join(work, 'stem-reverb.wav'), wavFloat([wet.L.map((v) => v * wg * g), wet.R.map((v) => v * wg * g)]));
  const r3 = (x) => +x.toFixed(3);
  await writeFile(join(work, 'timeline.json'), JSON.stringify({
    raga: SCORE.raga, sa: SCORE.sa, samples: N, seconds: N / SR, fluteStart: plan.fluteStart, fluteEnd: plan.fluteEnd,
    phrases: plan.phrases.map((p) => ({ index: p.index, t0: r3(p.t0), t1: r3(p.t1), notes: p.notes, level: p.level, shimmer: p.shimmer,
      onset: { breathToFullTone: r3(p.onsetShape.speak + p.onsetShape.swell), toneSpeaksAfter: r3(p.onsetShape.speak), phoonk: p.onsetShape.puff ? { seconds: r3(p.onsetShape.puff.dur), amp: r3(p.onsetShape.puff.amp) } : null, opensOnGrace: p.onsetShape.graceFirst },
      swaras: p.ev.filter((e) => !e.rest).map((e) => ({ s: e.swara, cents: +e.cents.toFixed(1), t0: r3(e.t0), t1: r3(e.t1), meend: !!e.meend, andolan: !!e.andolan, kan: !!e.kan, murki: !!e.murki, grace: !!e.grace, ...(e.grace ? { ornament: e.ornament } : {}), touch: !!e.touch,
        from: +e.from.toFixed(1), ts: r3(e.ts), tau: r3(e.tau),
        ...(e.glide ? { glide: { askedTau: r3(e.glide.asked), steepness: +e.glide.p.toFixed(2), leavesTouch: e.glide.leaves, capMs: Math.round(1000 * e.glide.cap), bands: e.glide.bands.map((b) => ({ band: b.band, ms: Math.round(1000 * b.seconds) })) } } : {}) })) })),
    shimmers: shim.events.map((s) => ({ before: s.index, t0: r3(s.t0), sweep: r3(s.sweep), rising: s.up, ringsUntil: r3(s.ring) })),
  }, null, 1));
  // the loop, then its own beginning again: continuous across N by construction
  let xwav = null;
  if (T > 0) {
    const xL = new Float32Array(N + T), xR = new Float32Array(N + T);
    xL.set(L); xL.set(L.subarray(0, T), N); xR.set(Rt); xR.set(Rt.subarray(0, T), N);
    xwav = join(work, `${NAME}-xfade.wav`);
    await writeFile(xwav, wavFloat([xL, xR]));
  }
  const info = {
    file: `${NAME}.mp3`, samples: N, seconds: +(N / SR).toFixed(4), fluteStart: +plan.fluteStart.toFixed(2), fluteEnd: +plan.fluteEnd.toFixed(2), tanpura: tanpuraGrid(tan, plan),
    pad: { levelLU: MUSIC.padLU, note: `A faint ambient drone like a shruti box: Sa, Pa and tara Sa with a soft mandra Sa, each voiced by three reeds a few cents apart (${pad.partials} partials, ${pad.oscillators} oscillators: where the middle reeds of two voices meet on one frequency they are one, so they cannot cancel), low-passed at 600–1200 Hz (slowly breathing), with slow swells and a wide stereo image; ${-MUSIC.padLU} LU below the flute, and with the tanpura (${-MUSIC.tanpuraLU} LU below) ${(-bed).toFixed(1)} LU below it together. Exactly periodic over the loop.` },
    shimmer: shim.events.length
      ? { levelLU: MUSIC.shimmerLU, at: shim.events.map((s) => ({ beforePhrase: s.index, from: +s.t0.toFixed(2), to: +s.ring.toFixed(2) })),
        note: `Soft swarmandal sweeps (${shim.strings} plucked strings tuned to Raga ${SCORE.raga}, madhya to ati-tara Sa) in the breath before the phrases the score marks; never within ${MUSIC.shimmerGuard} s of the loop's start or end.` }
      : { at: [], note: 'None: the score marks no shimmer (the engine keeps the swarmandal option, off).' },
  };
  if (!encode) {
    if (xwav) console.log(`  crossfade variant ${xwav} (WAV only: --wav)`);
    return info;
  }

  // pass 1: loudnorm measures the master; pass 2: its linear gain, checked on the MP3. The MP3s
  // are made in the work folder and listed in `ship`: main() copies them into OUT only once
  // everything has passed, so a failed or interrupted run never leaves a broken or half-made
  // file among the site's assets
  const m = measure(wav, MUSIC.lufs, MUSIC.truePeak);
  const mp3 = join(work, `${NAME}.mp3`), title = `${SCORE.raga} (bansuri with tanpura)`;
  // the loop between its own last `WRAP` samples and its first `out` samples, as a WAV to encode:
  // written once in this run (encodeTo may encode twice), never taken from an earlier run (an
  // interrupted one leaves its own audio there), and removed when the encoding succeeds or
  // fails (a run killed by a signal, Ctrl-C, still leaves it, and the next run overwrites it)
  const made = new Set();
  const cwav = (out) => {
    const file = join(work, `${NAME}-circular-${out}.wav`);
    if (!made.has(file)) {
      const around = (x) => { const y = new Float32Array(WRAP + N + out); y.set(x.subarray(N - WRAP)); y.set(x, WRAP); y.set(x.subarray(0, out), WRAP + N); return y; };
      writeFileSync(file, wavFloat([around(L), around(Rt)]));
      made.add(file);
    }
    return file;
  };
  let enc;
  try {
    enc = encodeTo(MUSIC.lufs, mp3, (gain) => {
      for (const out of [WRAP, WRAP / 2]) {
        ffmpeg(['-i', cwav(out), '-af', `volume=${gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', MUSIC.bitrate, '-ar', String(SR), '-ac', '2',
          '-metadata', `title=${title}`, '-metadata', 'artist=Original composition for dattapeetham.org',
          '-metadata', `comment=${CREDIT}. Raga ${SCORE.raga}, Sa = D (${TUNING}).`, mp3]);
        if (setGapless(mp3, WRAP, N)) return;
      }
      throw new Error(`${mp3}: its end padding does not fit the Info tag`);
    }, linearGain(m, MUSIC.lufs, MUSIC.truePeak));
  } finally {
    for (const out of [WRAP, WRAP / 2]) await rm(join(work, `${NAME}-circular-${out}.wav`), { force: true });
  }
  if (enc.truePeak > MUSIC.truePeak) throw new Error(`true peak ${enc.truePeak} dBTP exceeds ${MUSIC.truePeak}`);
  ffmpeg(['-ss', ex.toFixed(3), '-t', '30', '-i', wav, '-af', `volume=${enc.gain.toFixed(3)}dB,afade=t=in:st=0:d=1.2,afade=t=out:st=27.5:d=2.5`,
    '-c:a', 'libmp3lame', '-b:a', MUSIC.bitrate, '-metadata', `title=${SCORE.raga} (30 s excerpt)`, join(work, 'flute-excerpt.mp3')]);
  console.log(`  encoded ${mp3} (${await kb(mp3)} KB, circularly): master ${m.input_i} LUFS / ${m.input_tp} dBTP; gain ${enc.gain.toFixed(2)} dB → ${enc.lufs} LUFS, ${enc.truePeak} dBTP, LRA ${enc.lra} LU`);
  console.log(`  excerpt ${join(work, 'flute-excerpt.mp3')} from ${ex.toFixed(1)} s`);
  let xmp3 = null;
  if (xwav) {
    xmp3 = join(work, `${NAME}-xfade.mp3`);
    ffmpeg(['-i', xwav, '-af', `volume=${enc.gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', MUSIC.bitrate, '-ar', String(SR), '-ac', '2',
      '-metadata', `title=${title}, crossfade tail`, '-metadata', `comment=${CREDIT}.`, xmp3]);
    if (!setGapless(xmp3, 0, N + T)) console.warn(`  ! ${xmp3}: its gapless padding could not be set exactly`);
  }
  // The file the site plays, decoded as a player that reads its gapless header decodes it. From
  // it: the gain the MP3 really carries (gainDb is the volume filter's; libmp3lame scales its
  // input by a further 0.95, -0.45 dB), as the least-squares fit of the decoded loop to the
  // master; and levelRef, the RMS that the player's level meter reports as 1: the 95th
  // percentile of the RMS of 2048-sample frames (hop 1024) over the loop, in mono (0.5 (L + R))
  // as its AnalyserNode takes it, after the crossfade gains (at unity) and before the volume.
  const site = xmp3 || mp3, heard = await decodeMp3(site, work), n = heard.length / 2;
  if (n !== (xmp3 ? N + T : N)) console.warn(`  ! ${site} decodes to ${n} samples, not ${xmp3 ? N + T : N}`);
  let xy = 0, xx = 0;
  for (let i = 0; i < Math.min(N, n); i++) { xy += L[i] * heard[2 * i] + Rt[i] * heard[2 * i + 1]; xx += L[i] * L[i] + Rt[i] * Rt[i]; }
  const frames = [];
  for (let s = 0; s < N; s += 1024) {
    let e = 0;
    for (let i = s; i < s + 2048; i++) { const j = 2 * (i < n ? i : i - N), v = 0.5 * (heard[j] + heard[j + 1]); e += v * v; } // past the end of the main file: its start
    frames.push(Math.sqrt(e / 2048));
  }
  const out = {
    ...info, gainDb: +enc.gain.toFixed(3), mp3GainDb: +(20 * Math.log10(xy / xx)).toFixed(2),
    gainNote: 'gainDb is the gain of the ffmpeg volume filter; libmp3lame scales its input by 0.95 (-0.45 dB) as well, so the MP3s carry mp3GainDb relative to the master (measured: the decoded loop fitted to it)',
    lufs: enc.lufs, truePeakDbtp: enc.truePeak, lraLU: enc.lra, levelRef: +percentile(frames, 0.95).toFixed(3), kb: await kb(mp3), excerptFrom: +ex.toFixed(2),
  };
  console.log(`  ${site} decoded: carries ${out.mp3GainDb} dB re the master; levelRef ${out.levelRef} (95th-percentile frame RMS)`);
  if (xmp3) {
    out.xfade = { file: `${NAME}-xfade.mp3`, samples: N + T, loopSamples: N, loopSeconds: +(N / SR).toFixed(4), tailSeconds: +(T / SR).toFixed(4), kb: await kb(xmp3),
      note: 'Samples [N, N+T) repeat [0, T). Crossfade two elements inside the tail: when A reaches loopSeconds + d, start B at d; both then play the same music (the same samples in the master; in the MP3, each copy with its own coding noise).' };
    console.log(`  crossfade variant ${xmp3} (${out.xfade.kb} KB, tail ${out.xfade.tailSeconds} s)`);
  }
  const gl = await gapless(mp3);
  if (!gl || gl.samples !== N) console.warn(`  ! gapless header says ${gl && gl.samples} samples, the master has ${N}`);
  const lead = gl ? gl.encoderDelay + 529 : null;
  out.loop = {
    start: 0, end: out.seconds, samples: N, gapless: gl,
    note: `The whole file is one seamless loop. It is encoded circularly (its own last ${WRAP} samples before it and its first ${WRAP} after it, with the Info tag's encoder delay and padding raised by ${WRAP} each), so the codec adds no edge at the wrap. Decoders that read the gapless header (Chromium decodeAudioData, ffmpeg) return exactly \`samples\` samples: loop the whole AudioBuffer (AudioBufferSourceNode.loop = true) in a 44.1 kHz AudioContext. In a 48 kHz one, decodeAudioData resamples the file as one piece rather than as a loop, and that leaves a faint edge at the wrap (about -66 dBFS above 5 kHz in Chromium 141, measured on an earlier render): there, use a 44.1 kHz AudioContext, or music.xfade.file and its crossfade. A decoder that ignores the header returns more: ${lead} extra at the start (the encoder delay of ${gl && gl.encoderDelay}, which includes the ${WRAP} lead-in, and 529 of decoder delay) and the lead-out and padding at the end; then set loopStart = ${lead} / sampleRate and loopEnd = loopStart + samples / sampleRate. Avoid <audio loop>: Chromium 141 skipped 12–23 ms at the wrap (measured on an earlier track), an audible hiccup in the drone. The site does not play this file: it plays music.xfade.file with two <audio> elements crossfaded inside its tail (see music.xfade); a two-element player without that file should use music.tanpura.crossfade (the same point of the tanpura cycle) rather than fade the end of this file into its start.`,
  };
  ship.push([mp3, join(OUT, `${NAME}.mp3`)]);
  if (xmp3) ship.push([xmp3, join(OUT, `${NAME}-xfade.mp3`)]);
  return out;
}

async function renderSfx(work, encode, ship = []) {
  const seed = SCORE.seed;
  const items = [
    { name: 'ghanta', kind: 'ghanta', buf: renderGhanta(seed), note: 'small brass hand-bell, struck (Sa = D6, Ga ringing above; A4 = 432 Hz)' },
    ...['S', 'R', 'G', 'P', 'D', 'S2'].map((s) => ({ name: `chime-${s.toLowerCase()}`, kind: 'chime', swara: s, buf: renderChime(s, seed),
      hz: +(2 * SCORE.sa * (s === 'S2' ? 2 : RATIO[s])).toFixed(2) })),
    { name: 'shankha', kind: 'shankha', buf: renderShankha(seed), note: 'soft conch swell on Sa (D4, A4 = 432 Hz); optional' },
  ];
  await mkdir(join(work, 'sfx'), { recursive: true });
  const out = [];
  for (const it of items) {
    const g = dbToGain(SFX_LUFS[it.kind] - lufs([it.buf]));
    scaleAll(g, it.buf);
    if (peakOf(it.buf) > dbToGain(-1.5)) scaleAll(dbToGain(-1.5) / peakOf(it.buf), it.buf);
    const wav = join(work, 'sfx', it.name + '.wav');
    await writeFile(wav, wavFloat([it.buf]));
    const rec = { file: `sfx/${it.name}.mp3`, seconds: +(it.buf.length / SR).toFixed(3), ...(it.swara ? { swara: it.swara, hz: it.hz } : {}), ...(it.note ? { note: it.note } : {}) };
    if (encode) {
      const mp3 = join(work, 'sfx', it.name + '.mp3'); // copied into OUT with the rest (see renderMusic)
      const enc = encodeTo(SFX_LUFS[it.kind], mp3, (gain) => ffmpeg(['-i', wav, '-af', `volume=${gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', '-ar', String(SR),
        '-metadata', `title=${it.name}`, '-metadata', 'artist=Original sound for dattapeetham.org', mp3]));
      Object.assign(rec, { lufs: enc.lufs, truePeakDbtp: enc.truePeak, kb: await kb(mp3) });
      ship.push([mp3, join(OUT, 'sfx', it.name + '.mp3')]);
    }
    out.push(rec);
    console.log(`  ${it.name}: ${rec.seconds} s${rec.kb ? `, ${rec.kb} KB, ${rec.lufs} LUFS, ${rec.truePeakDbtp} dBTP` : ''}`);
  }
  return out;
}

// A pitch in cents re Sa written as a swara (D., S', komal Ga …)
function swaraName(c) {
  const pc = mod1200(c), o = Math.round((c - pc) / 1200), marks = o < 0 ? '.'.repeat(-o) : "'".repeat(o);
  const s = Object.keys(CENTS).find((k) => Math.abs(CENTS[k] - pc) < 1 || Math.abs(CENTS[k] - pc + 1200) < 1);
  return s ? s + marks : `${pc.toFixed(0)} c${marks}`;
}

// How long the pitch stays within ±w cents of the swara ev[i] of a phrase (after reach): its
// own time and the move off it, as one stretch (a meend that leaves it included)
function stay(ph, i, w = MEEND.band) {
  const ev = ph.ev, e = ev[i], next = ev[i + 1], moves = next && !next.rest, dt = 0.001;
  const pitch = (t) => (moves && t >= next.ts ? along(next, t) : along(e, t));
  let n = 0;
  for (let t = e.ts, t1 = moves ? next.ts + next.tau : e.t1; t <= t1; t += dt) {
    if (Math.abs(pitch(t) - e.cents) <= w) n++;
    else if (n) break;
  }
  return n * dt;
}

// --plan: the timeline, and the shape of the piece against the composition's targets
function printPlan() {
  const plan = schedule(SCORE), N = Math.round(plan.length * SR), rg = ragaOf(SCORE.raga);
  const shimmers = shimmerPlan(plan, N, SCORE); // throws if one is misplaced
  const ex = excerptStart(plan); // throws if excerptFrom names no phrase, or the excerpt would run off the end
  for (const p of plan.phrases) reach(p, rng(SCORE.seed, `flute-${p.index}`), SCORE); // the meends exactly as the render shapes them
  const sum = (xs) => xs.reduce((a, b) => a + b, 0), flag = (ok) => (ok ? '  ' : '! ');
  console.log(`Raga ${SCORE.raga}: ${[...rg.swaras].join(' ')}${rg.touch ? ` (${[...rg.touch.swaras].join(' and ')} as soft touches only)` : ''}; Sa ${SCORE.sa.toFixed(4)} Hz (${TUNING})`);
  for (const p of plan.phrases) console.log(`${String(p.index).padStart(2)}${p.shimmer ? ' *' : '  '} ${p.t0.toFixed(1).padStart(6)}–${p.t1.toFixed(1).padEnd(6)} ${p.notes}`);
  const flute = sum(plan.phrases.map((p) => p.t1 - p.t0)), share = (100 * flute) / plan.length;
  const sounding = plan.phrases.flatMap((p) => p.ev.filter((e) => !e.rest)), all = sum(sounding.map((e) => e.dur));
  const tara = sum(sounding.filter((e) => e.cents >= 1200 - 1).map((e) => e.dur));
  const andolan = sounding.filter((e) => e.andolan).length, levels = plan.phrases.map((p) => p.level);
  console.log(`${flag(plan.length >= 230 && plan.length <= 270 && share >= 70 && share <= 75)}loop length ${plan.length.toFixed(2)} s (target 230–270); the flute plays ${flute.toFixed(1)} s of it, ${share.toFixed(0)} % (target 70–75)`);
  console.log(`${flag(tara <= 0.15 * all && andolan <= 2)}tara sthayi ${((100 * tara) / all).toFixed(1)} % of the flute's sounding time (at most ~15); andolan ${andolan}× (at most 2)`);
  console.log(`${flag(Math.max(...levels) <= 0.8)}levels ${Math.min(...levels)}–${Math.max(...levels)} (soft: mostly 0.6–0.78); shimmers ${shimmers.length}${shimmers.length ? '' : ' (none: the score marks none)'}`);
  if (rg.touch) {
    const touch = sounding.filter((e) => rg.touch.swaras.includes(e.swara[0])), part = sum(touch.map((e) => e.dur)) / all;
    // each plain M or N: its written time, and how long the pitch stays near it (with the move off it)
    const plain = plan.phrases.flatMap((p) => p.ev.flatMap((e, i) => (!e.rest && !e.grace && rg.touch.swaras.includes(e.swara[0]) ? [{ p, e, near: stay(p, i) }] : [])));
    const limit = rg.touch.hold * SCORE.tempo, held = plain.filter(({ e, near }) => e.dur > limit * 1.02 || near > limit || e.andolan);
    const longest = (f) => (plain.length ? Math.max(...plain.map(f)) : 0).toFixed(2);
    console.log(`${flag(!held.length && part <= rg.touch.share)}${[...rg.touch.swaras].join(' and ')}: ${(100 * part).toFixed(1)} % of the flute's sounding time (at most ~${100 * rg.touch.share}); longest held ${longest((x) => x.e.dur)} s, and ${longest((x) => x.near)} s within ±${MEEND.band} c with the move off it (at most ~${rg.touch.hold}, except in a grace)`);
    for (const { p, e, near } of held) console.log(`!   ${e.token} in phrase ${p.index}: ${e.andolan ? 'an andolan makes it a resting note' : `held ${e.dur.toFixed(2)} s, ${near.toFixed(2)} s within ±${MEEND.band} c with the move off it`}`);
  }
  // an andolan needs room: at least 0.6 s between its swara settling and the next move (otherwise it is dropped)
  for (const p of plan.phrases) p.ev.forEach((e, i) => {
    if (!e.andolan) return;
    const next = p.ev[i + 1], room = (next && !next.rest ? next.ts : e.t1) - 0.2 - (e.ts + e.tau + 0.2);
    if (room <= 0.6) console.log(`!   ${e.token} in phrase ${p.index}: too short for an andolan (${Math.max(0, room).toFixed(2)} s to swing in; it is played plain)`);
  });
  // every meend that passes a band, and what glideFor made of it
  const glides = plan.phrases.flatMap((p) => p.ev.filter((e) => e.glide).map((e) => ({ p, e }))), meends = glides.filter(({ e }) => e.glide.bands.length);
  const ms = (s) => Math.round(1000 * s);
  if (meends.length) console.log(`meends (each band a glide passes: at most ${ms(MEEND.dwell[0])}–${ms(MEEND.dwell[1])} ms, drawn for each meend; ±${MEEND.band} c around ${passBands(rg).map((b) => b.name).join(', ')}):`);
  for (const { p, e } of meends) {
    const { glide: gl } = e, worst = gl.bands.reduce((a, b) => (b.seconds > a.seconds ? b : a));
    const how = [gl.leaves ? `off ${swaraName(e.from)} at once` : gl.p > 1 ? `steeper (p ${gl.p.toFixed(2)})` : '',
      gl.tau < gl.asked - 1e-9 ? `shortened by ${ms(gl.asked - gl.tau)} ms (from ${gl.asked.toFixed(2)} s)` : ''].filter(Boolean).join(' and ') || 'as written';
    console.log(`${flag(worst.seconds <= gl.cap + 1e-6)}  phrase ${String(p.index).padStart(2)} ${swaraName(e.from).padStart(3)} → ${e.swara.padEnd(3)} ${e.tau.toFixed(2)} s, ${((100 * e.tau) / e.dur).toFixed(0)} % of the note, ${how}; longest in a band ${ms(worst.seconds)} ms of its ${ms(gl.cap)} (${worst.band})`);
  }
  if (glides.length) console.log(`  ${glides.length} meends: ${meends.length} pass a band, ${meends.filter(({ e }) => e.glide.tau < e.glide.asked - 1e-9).length} of them shortened`);
  for (const s of shimmers) console.log(`  * shimmer before phrase ${s.index}: sweep ${s.t0.toFixed(1)}–${(s.t0 + s.sweep).toFixed(1)} s (${s.up ? 'rising' : 'falling'}), rings until ${s.ring.toFixed(1)} s`);
  console.log(`excerpt ${ex.toFixed(1)}–${(ex + 30).toFixed(1)} s (from phrase ${SCORE.excerptFrom})`);
}

// manifest.json: written whole after a run that encodes both parts. After --music or --sfx
// alone, the other part is kept from the manifest already in OUT when it describes the
// same files; without one to keep, the manifest is left as it was, with a warning.
async function writeManifest(top, music, sfx) {
  const file = join(OUT, 'manifest.json');
  let old = null;
  try { old = JSON.parse(await readFile(file, 'utf8')); } catch { /* none yet, or unreadable */ }
  if (!music && old && old.music && old.music.file === `${NAME}.mp3`) music = old.music;
  if (!sfx && old && Array.isArray(old.sfx)) sfx = old.sfx;
  if (!music || !sfx) {
    console.warn(`  ! manifest.json left as it was: it has no ${music ? 'sfx' : `music part for ${NAME}.mp3`} to keep (run without --music or --sfx)`);
    return;
  }
  await writeFile(`${file}.new`, JSON.stringify({ ...top, music, sfx }, null, 2) + '\n');
  await rename(`${file}.new`, file); // whole or not at all
  console.log(`  ${file} written${old && (music === old.music || sfx === old.sfx) ? ` (its ${music === old.music ? 'music' : 'sfx'} part kept)` : ''}`);
}

async function main() {
  const args = process.argv.slice(2);
  const valued = ['--work', '--xfade-tail'], known = ['--music', '--sfx', '--plan', '--wav', ...valued];
  args.forEach((a, i) => { if (!known.includes(a) && !valued.includes(args[i - 1])) throw new Error(`unknown option ${a} (the options are listed at the top of tools/compose-audio.mjs)`); });
  const value = (flag) => {
    const i = args.indexOf(flag);
    if (i < 0) return undefined;
    if (args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new Error(`${flag} needs a value`);
    return args[i + 1];
  };
  const work = resolve(value('--work') ?? join(os.tmpdir(), 'dattapeetham-audio'));
  const tail = value('--xfade-tail'), xfadeTail = tail === undefined ? 0 : +tail;
  if (!(xfadeTail >= 0)) throw new Error(`--xfade-tail ${tail}: write the seconds of the tail, e.g. 4.6`);
  const encode = !args.includes('--wav');
  if (args.includes('--plan')) { printPlan(); return; }
  const doMusic = !args.includes('--sfx') || args.includes('--music'), doSfx = !args.includes('--music') || args.includes('--sfx');
  if (encode && doMusic && tail === undefined) console.warn(`  ! no --xfade-tail: the manifest gets no music.xfade, so the site falls back to looping ${NAME}.mp3 one tanpura cycle short; the site's own copy is made with --xfade-tail 4.6`);
  const top = { credit: CREDIT, raga: ragaOf(SCORE.raga).label, sa: 'D', saHz: +SCORE.sa.toFixed(4), tuning: TUNING, sampleRate: SR };
  const ship = []; // every MP3 made in the work folder, with where it goes in OUT
  const music = doMusic ? await renderMusic(work, encode, xfadeTail, ship) : null;
  let sfx = null;
  if (doSfx) { console.log('temple sounds:'); sfx = await renderSfx(work, encode, ship); }
  if (encode) {
    // every part has passed its checks: only now do the new files replace the site's. Each is
    // copied beside its target first (a failed copy removes them all and leaves OUT as it was),
    // then renamed over it, which replaces it whole
    const staged = [];
    try {
      for (const [from, to] of ship) { await mkdir(dirname(to), { recursive: true }); staged.push(to); await copyFile(from, `${to}.new`); }
    } catch (e) {
      for (const to of staged) await rm(`${to}.new`, { force: true }).catch(() => {});
      throw e;
    }
    for (const to of staged) await rename(`${to}.new`, to);
    console.log(`  ${ship.length} files copied into ${OUT}`);
    await writeManifest(top, music, sfx);
  }
  console.log(`work files in ${work}`);
}

// for tests and analysis: `import { makeIR } from './compose-audio.mjs'` renders nothing by itself
export { renderFlute, renderTanpura, renderPad, renderShimmer, makeIR, convolveLoop, renderGhanta, renderChime, renderShankha, lufs, reach, glideFor, SR };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
