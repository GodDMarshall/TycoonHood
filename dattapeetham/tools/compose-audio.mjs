#!/usr/bin/env node
// The website's own music and temple sounds, composed and synthesised here.
//
//   node tools/compose-audio.mjs            render everything and encode it into src/assets/audio/
//   node tools/compose-audio.mjs --music    only the flute piece
//   node tools/compose-audio.mjs --sfx      only the temple sounds
//   node tools/compose-audio.mjs --plan     print the timeline of the score and stop
//   node tools/compose-audio.mjs --wav      render the WAV files but do not encode them
//   node tools/compose-audio.mjs --work <dir>   where WAVs and stems go
//                                               (default: <system temp>/dattapeetham-audio)
//   node tools/compose-audio.mjs --xfade-tail 3.35   also write flute-mohanam-xfade.mp3: the same
//        loop followed by its own first 3.35 s, for a player that crossfades two <audio>
//        elements (crossfade inside the tail into a second element started at 0, and the
//        two play identical audio). Not made unless asked for.
//
// Nothing is sampled or recorded: the flute, the tanpura, the bells and the
// temple acoustics are all synthesised below from well-known DSP (additive and
// modal synthesis, resonant filters, a synthetic room impulse response and FFT
// convolution). Seeded random generators drive every human detail, so each
// render is identical. Each phrase has its own stream: editing one phrase leaves
// the nuances of every other phrase as they were (later phrases only move in
// time), and the score never changes the tanpura or the bells.
//
// Needs Node 20+ and nothing else to render. Encoding needs ffmpeg with
// libmp3lame on the PATH.
//
// What it makes (all tuned to the same Sa = D):
//   src/assets/audio/flute-mohanam.mp3   ~3½ min flute alapana in Raga Mohanam over a
//                                        tanpura drone; loops seamlessly (see LOOP below)
//   src/assets/audio/sfx/ghanta.mp3      a small brass hand-bell, struck once
//   src/assets/audio/sfx/chime-*.mp3     soft bell tones on the swaras S R G P D S'
//   src/assets/audio/sfx/shankha.mp3     a soft conch swell (optional)
//   src/assets/audio/manifest.json       durations, loudness, loop points, swara of each chime
//
// LOOP: the tanpura and the hall reverb are rendered circularly (a pluck that
// is still ringing at the end of the file continues at its start, and the
// reverb tail of the last bar is folded onto the first), so the last sample
// flows into the first exactly as if the piece had been crossfaded into
// itself. The flute is silent for SCORE.intro seconds at the start and
// SCORE.outro seconds at the end, so the seam always falls on drone alone.

import { writeFile, readFile, mkdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

// ============================================================================
// THE SCORE
// ============================================================================
// Raga Mohanam (audava–audava): S R2 G3 P D2 — no Ma, no Ni. Sa = D.
// The flute's madhya Sa is D4 (293.66 Hz); the tanpura is tuned an octave below.
//
// Each phrase is written the way a musician would write sargam:
//
//   S R G P D      the five swaras of Mohanam (Sa, Chatusruti Ri, Antara Ga, Pa, Chatusruti Dha)
//   P.  D.         a dot after a swara: mandra sthayi (the octave below)
//   S'  R'  G'     a quote after it: tara sthayi (the octave above); S'' is ati-tara Sa
//   :1.5           how long the swara is held, in seconds (an alapana has no tala)
//   G~             kampita: the swara oscillates, touching the next swara above, and settles back on it
//   /D             jaru: a slow slide into this swara from the one before it
//   (D)P           kan: a quick grace touch of D just before landing on P
//   -:0.3          a short silence inside the phrase (no breath is taken)
//
// After each phrase the flautist breathes for `gap` seconds while the tanpura
// carries on. `level` (0–1) is how strongly the phrase is played. Change
// anything here and run `node tools/compose-audio.mjs` again.
export const SCORE = {
  raga: 'Mohanam',
  sa: 293.66, // D4, the flute's madhya Sa
  tempo: 1, // > 1 plays slower: every duration and gap is multiplied by it
  intro: 8, // seconds of tanpura alone before the flute's first phrase
  outro: 7.5, // seconds of tanpura after the last phrase (the reverb rings into it)
  seed: 108,
  excerptFrom: 9, // the client's 30-second audition excerpt starts just before this phrase
  phrases: [
    // I. Settling on Sa: madhya and mandra sthayi
    { notes: 'S:4.2', gap: 2.0, level: 0.72 },
    { notes: 'S:0.7 R:0.6 G~:1.8 R:0.6 S:2.6', gap: 1.6, level: 0.78 },
    { notes: 'S:0.6 D.:0.9 P.:1.6 /D.:1.1 S:2.8', gap: 1.8, level: 0.76 },
    { notes: 'R:0.5 G:0.5 P:1.2 G~:1.4 R:0.5 S:0.6 D.:0.7 (R)S:2.4', gap: 2.0, level: 0.8 },
    // II. Madhya sthayi: Ga, Pa and Dha as resting notes
    { notes: 'G:0.6 P:2.0 (D)P:0.8 G~:1.4 R:0.6 G:0.8 /P:2.4', gap: 1.6, level: 0.82 },
    { notes: 'P:0.5 D~:2.2 P:0.6 G:0.6 /P:1.0 D:0.6 P:2.4', gap: 1.8, level: 0.82 },
    { notes: "G:0.5 P:0.5 D:0.6 S':2.6 /D:1.2 P:0.8 G~:1.6 R:0.6 S:2.4", gap: 2.0, level: 0.85 },
    { notes: 'P:0.6 G:0.4 R:0.3 S:0.7 R:0.4 G~:1.8 P:0.9 G:0.5 R:0.5 S:1.0 D.:0.6 S:2.0', gap: 2.2, level: 0.8 },
    // III. Rising to tara sthayi
    { notes: "G:0.6 P:0.4 D:0.5 S':0.9 R':0.6 S':2.8", gap: 1.6, level: 0.86 },
    { notes: "D:0.6 P:0.5 G:0.5 P:0.5 D~:1.8 S':1.4 /D:2.2", gap: 1.8, level: 0.86 }, // (review) rests on Dha: S' sliding down to D
    { notes: "S':1.2 (R')S':0.8 D~:1.4 P:0.6 D:0.5 S':0.7 R':0.8 G'~:2.0 R':0.6 S':2.4", gap: 2.0, level: 0.88 },
    // (review: no straight runs of the scale at an even pace; climbs and descents
    // turn back on themselves — G P D P D S', R' S' R' G', P' G' P' G' — as alapana does)
    { notes: "G:0.4 P:0.5 D:0.4 P:0.4 D:0.5 S':1.0 R':0.5 S':0.4 R':0.5 G':1.2 /P':1.4 G':0.6 R':0.6 S':2.0", gap: 2.2, level: 0.88 },
    // IV. The peak: tara Pa, touching ati-tara Sa (briefly and not at full breath: it is background music)
    { notes: "G':0.8 P':2.8 (D')P':0.8 G'~:1.4 R':0.4 G':1.8", gap: 2.0, level: 0.86 }, // (review) rests on tara Ga, a jiva swara
    { notes: "S':0.5 R':0.4 G':0.7 R':0.4 G':0.4 P':0.7 D'~:1.6 S'':2.4 /D':1.2 P':0.9 G':0.5 P':0.4 G':0.8 R':0.5 S':2.4", gap: 2.4, level: 0.8 },
    // V. Descent and resolution to Sa
    { notes: "S':0.6 R':0.4 S':0.3 D:0.25 S':0.25 R':0.3 S':1.2 D:0.8 P:1.1 /D:0.9 S':2.2", gap: 2.0, level: 0.84 },
    { notes: "S':0.6 D~:1.3 P:0.7 G:0.4 P:0.5 D:0.4 P:0.5 G:0.6 R:0.5 S:2.2", gap: 1.8, level: 0.8 },
    { notes: 'P:1.0 /D:1.4 P:0.6 G~:1.8 R:0.6 G:0.6 P:0.8 G:0.5 R:0.5 S:2.2', gap: 2.0, level: 0.8 },
    { notes: 'G:0.6 R:0.6 S:0.7 D.:1.0 S:0.6 R:0.5 S:0.6 D.:0.6 P.:2.0 /D.:1.1 S:2.4', gap: 2.4, level: 0.76 },
    { notes: 'S:0.8 R:0.6 G~:1.8 R:0.7 S:1.0 D.:0.9 S:6.0', gap: 0, level: 0.74 },
  ],
};

// ============================================================================
// Settings
// ============================================================================
const SR = 44100;
const TAU = Math.PI * 2;
const MUSIC = {
  lufs: -23, // EBU R128 integrated: it plays in the background
  truePeak: -2, // dBTP ceiling
  bitrate: '128k',
  tanpuraLU: -8, // tanpura loudness relative to the flute's
  wetLU: -9, // reverb return loudness relative to the dry mix
  lowCut: 55, // Hz, 12 dB/octave
  flutePan: 0.06, // -1 left … +1 right
  tanpuraCycle: 4.6, // seconds per Pa–Sa–Sa–Sa round (adjusted to fit the loop exactly)
};
const SFX_LUFS = { ghanta: -22, chime: -23, shankha: -23 };
const CREDIT = 'Flute: original raga composition for this website';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/assets/audio');

// The five swaras in just intonation (cents above Sa)
const RATIO = { S: 1, R: 9 / 8, G: 5 / 4, P: 3 / 2, D: 5 / 3 };
const SCALE = ['S', 'R', 'G', 'P', 'D'];
const CENTS = Object.fromEntries(SCALE.map((s) => [s, 1200 * Math.log2(RATIO[s])]));

// ============================================================================
// Small DSP toolkit
// ============================================================================
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const dbToGain = (db) => Math.pow(10, db / 20);
const smoother = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u));

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
const TOKEN = /^(\/)?(?:\(([SRGPD])([.']*)\))?([SRGPD-])([.']*)(~)?:(\d+(?:\.\d+)?)$/;
const octave = (marks) => [...marks].reduce((o, c) => o + (c === "'" ? 1 : -1), 0);

export function parsePhrase(text, where = 'phrase') {
  return text.trim().split(/\s+/).map((tok) => {
    const m = TOKEN.exec(tok);
    if (!m) {
      if (/[MN]/i.test(tok)) throw new Error(`${where}: "${tok}" — Mohanam has no Ma and no Ni`);
      throw new Error(`${where}: cannot read "${tok}" (write e.g. G:0.8, D.:1.2, S':2, G~:1.6, /D:1, (D)P:0.8)`);
    }
    const [, jaru, kanS, kanO, sw, oct, kamp, dur] = m;
    const rest = sw === '-';
    return {
      token: tok, rest, swara: rest ? '-' : sw + oct,
      cents: rest ? null : CENTS[sw] + 1200 * octave(oct),
      jaru: !!jaru, kampita: !!kamp, kan: kanS ? CENTS[kanS] + 1200 * octave(kanO) : null, dur: +dur,
    };
  });
}
// the next Mohanam swara above / below a pitch (cents re Sa)
function above(c) {
  const pc = ((c % 1200) + 1200) % 1200, base = c - pc;
  for (const s of SCALE) if (CENTS[s] > pc + 1) return base + CENTS[s];
  return base + 1200;
}
function below(c) {
  const pc = ((c % 1200) + 1200) % 1200, base = c - pc;
  for (let i = SCALE.length - 1; i >= 0; i--) if (CENTS[SCALE[i]] < pc - 1) return base + CENTS[SCALE[i]];
  return base - 1200 + CENTS.D;
}

export function schedule(score = SCORE) {
  let t = score.intro;
  const phrases = score.phrases.map((ph, pi) => {
    const R = rng(score.seed, `rubato-${pi + 1}`);
    const notes = parsePhrase(ph.notes, `phrase ${pi + 1}`);
    const ev = [];
    for (const n of notes) {
      // a little rubato: no two swaras are held for exactly the written time
      let d = n.dur * score.tempo * (1 + 0.04 * (R() - 0.5));
      if (n.kan != null) { const g = Math.min(0.075, d * 0.3); ev.push({ cents: n.kan, dur: g, grace: true, swara: 'kan' }); d -= g; }
      ev.push({ ...n, dur: d });
    }
    const t0 = t;
    for (const e of ev) { e.t0 = t; t += e.dur; e.t1 = t; }
    const out = { index: pi + 1, notes: ph.notes, ev, t0, t1: t, level: ph.level ?? 0.8, last: pi === score.phrases.length - 1 };
    t += (ph.gap ?? 2) * score.tempo;
    return out;
  });
  const fluteEnd = phrases.at(-1).t1;
  return { phrases, fluteStart: score.intro, fluteEnd, length: fluteEnd + score.outro };
}

// ============================================================================
// The flute (venu / bansuri)
// ============================================================================
// A continuous-phase oscillator follows a pitch contour built from the score
// (glides, gamakas, scoops, vibrato, slow drift), so every note-to-note move is
// a real slide, never a jump. The tone is a near-sine with small 2nd–5th
// harmonics that brighten with breath pressure and fade in the upper register,
// plus three kinds of breath noise: a narrow band riding on the fundamental
// (the airy halo of a bamboo flute), a weaker band on the octave, and a soft
// high hiss. Onsets carry a breathy chiff; gaps carry a faint inhale.
function renderFlute(plan, N, score) {
  const SA = score.sa;
  const cents = new Float32Array(N), lvl = new Float32Array(N), env = new Float32Array(N);
  const air = new Float32Array(N), vib = new Float32Array(N), inh = new Float32Array(N);
  const at = (t) => clamp(Math.round(t * SR), 0, N);
  const ranges = [];

  for (const ph of plan.phrases) {
    const R = rng(score.seed, `flute-${ph.index}`);
    const ev = ph.ev, baseDb = 20 * Math.log10(ph.level), pdur = ph.t1 - ph.t0;
    const lastI = ev.length - 1;
    // 1. how each swara is reached
    let prev = null;
    for (const e of ev) {
      if (e.rest) { prev = null; continue; }
      if (!prev) { // phrase start, or after a silence: a soft scoop up from below
        e.onset = true;
        e.from = e.jaru ? below(e.cents) : e.cents - (45 + 35 * R());
        e.ts = e.t0;
        e.tau = e.jaru ? clamp(0.42 * e.dur, 0.25, 0.8) : 0.11 + 0.05 * R();
        e.curve = e.jaru ? ease : smoother;
      } else {
        e.from = prev.cents;
        if (e.jaru) { e.tau = clamp(0.42 * e.dur, 0.28, 0.85); e.ts = e.t0; e.curve = ease; }
        else if (e.grace || prev.grace) { e.tau = 0.03; e.ts = e.t0 - 0.01; e.curve = smoother; }
        else { e.tau = clamp(0.28 * Math.min(prev.dur, e.dur), 0.04, 0.095); e.ts = e.t0 - 0.4 * e.tau; e.curve = smoother; }
      }
      prev = e;
    }
    // 2. pitch contour, swara by swara (each owns the time until the next one starts to move)
    for (let i = 0; i <= lastI; i++) {
      const e = ev[i];
      if (e.rest) continue;
      const next = ev[i + 1];
      const end = !next ? ph.t1 + 0.06 : next.rest ? next.t1 : next.ts;
      const settle = next && !next.rest ? next.ts : e.t1;
      // Kampita: the swara is the anchor; each oscillation rises to just touch the
      // next Mohanam swara above and falls back, lingering on the anchor. It never
      // dwells on a pitch in between, so no Ma or Ni is ever suggested. A few
      // oscillations, slower at the start and end, quicker in the middle.
      let kp = null;
      if (e.kampita) {
        const ta = e.ts + e.tau + 0.1, tb = settle - 0.15;
        if (tb - ta > 0.35) {
          const cycles = Math.max(1, Math.round((tb - ta) * (2.5 + 0.5 * R())));
          kp = { ta, tb, cycles, depth: (above(e.cents) - e.cents) * (0.93 + 0.05 * R()), warp: 0.25 + 0.1 * R() };
        }
      }
      for (let n = at(e.onset ? e.t0 : e.ts); n < at(end); n++) {
        const t = n / SR;
        let c = t < e.ts + e.tau ? e.from + (e.cents - e.from) * e.curve((t - e.ts) / e.tau) : e.cents;
        if (kp && t > kp.ta && t < kp.tb) {
          const u = (t - kp.ta) / (kp.tb - kp.ta);
          const w = u - (kp.warp * Math.sin(TAU * u)) / TAU; // slow – quick – slow
          const x = 0.5 - 0.5 * Math.cos(TAU * kp.cycles * w);
          c += kp.depth * Math.pow(x, 1.8);
        }
        cents[n] = c;
      }
      // 3. vibrato on long, plain swaras: starts after the note settles, grows, fades before the next move
      if (!e.kampita && !e.grace && e.dur >= 0.85) {
        const v0 = e.ts + e.tau + 0.28 + 0.15 * R(), v1 = settle - 0.06, depth = 0.8 + 0.4 * R();
        for (let n = at(v0); n < at(v1); n++) {
          const t = n / SR;
          vib[n] = depth * smoother((t - v0) / 0.65) * smoother((v1 - t) / 0.18) * (e.dur >= 3 ? 1.15 : 1);
        }
      }
    }
    // 4. dynamics: phrase arc, register, a messa di voce on long notes, a long diminuendo at the very end
    for (let i = 0; i <= lastI; i++) {
      const e = ev[i];
      if (e.rest) { for (let n = at(e.t0); n < at(e.t1); n++) lvl[n] = lvl[Math.max(0, n - 1)]; continue; }
      const main = e.grace && ev[i + 1] && !ev[i + 1].rest ? ev[i + 1] : e;
      const u = ((main.t0 + main.t1) / 2 - ph.t0) / pdur;
      const d0 = baseDb + 2.2 * Math.sin(Math.PI * Math.pow(u, 0.8)) - 1.1 + clamp(main.cents / 1200, -0.5, 1.4) * 2.5;
      for (let n = at(e.t0); n < at(i === lastI ? ph.t1 + 0.06 : e.t1); n++) {
        const v = clamp((n / SR - e.t0) / e.dur, 0, 1);
        let d = d0;
        if (e.dur >= 1.2 && !e.grace) d += 1.6 * Math.sin(Math.PI * Math.min(1, v * 1.25)) - 1.2 * v;
        if (ph.last && i === lastI) d -= 10 * Math.pow(v, 1.3);
        lvl[n] = d;
      }
    }
    { // smooth the level steps (breath pressure cannot jump)
      const k = 1 - Math.exp(-1 / (0.05 * SR));
      let y1 = lvl[at(ph.t0)], y2 = y1;
      for (let n = at(ph.t0); n < at(ph.t1 + 0.06); n++) { y1 += k * (lvl[n] - y1); y2 += k * (y1 - y2); lvl[n] = y2; }
    }
    // 5. breath on/off envelope, silences inside the phrase, re-articulated repeated swaras
    const att = 0.15 + 0.08 * R(), rel = ph.last ? 1.6 : 0.26 + 0.1 * R();
    for (let n = at(ph.t0); n < at(ph.t1); n++) {
      const t = n / SR;
      let g = 1;
      if (t - ph.t0 < att) g *= Math.pow(Math.sin((Math.PI / 2) * ((t - ph.t0) / att)), 2);
      if (ph.t1 - t < rel) g *= Math.pow(Math.sin((Math.PI / 2) * ((ph.t1 - t) / rel)), 2);
      env[n] = g;
      air[n] = 0.2;
      if (ph.t1 - t < rel) {
        air[n] += 0.5 * (1 - (ph.t1 - t) / rel); // the tone thins before the breath does
        cents[n] -= 22 * Math.pow(1 - (ph.t1 - t) / rel, 2) * (ph.last ? 0.5 : 1); // and sags a little flat
      }
    }
    for (let i = 0; i <= lastI; i++) {
      const e = ev[i];
      if (e.rest) {
        for (let n = at(e.t0 - 0.03); n < at(e.t1 + 0.05); n++) {
          const t = n / SR;
          env[n] *= t < e.t0 ? Math.pow(Math.cos((Math.PI / 2) * ((t - e.t0 + 0.03) / 0.03)), 2) : t < e.t1 ? 0 : Math.pow(Math.sin((Math.PI / 2) * ((t - e.t1) / 0.05)), 2);
        }
        continue;
      }
      const p = ev[i - 1];
      if (p && !p.rest && !p.grace && !e.grace && Math.abs(p.cents - e.cents) < 1) {
        for (let n = at(e.t0 - 0.03); n < at(e.t0 + 0.03); n++) env[n] *= 1 - 0.68 * Math.pow(Math.sin((Math.PI * (n / SR - e.t0 + 0.03)) / 0.06), 2);
      }
      if (e.onset) for (let n = at(e.t0); n < at(e.t0 + 0.4); n++) air[n] += 0.9 * Math.exp(-(n / SR - e.t0) / 0.06);
    }
    ranges.push([at(ph.t0), at(ph.t1 + 0.06)]);
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
    ranges.push([at(t0), at(t1)]);
  }
  ranges.sort((a, b) => a[0] - b[0]);

  // 7. synthesis
  const len = N / SR, out = new Float32Array(N);
  const noise = gaussian(rng(score.seed, 'breath'));
  const drift = wander(rng(score.seed, 'drift'), 0.4, len), jitter = wander(rng(score.seed, 'jitter'), 7, len);
  const vibRate = wander(rng(score.seed, 'vibrate'), 0.3, len);
  const turbA = wander(rng(score.seed, 'turbA'), 11, len), turbB = wander(rng(score.seed, 'turbB'), 2.3, len);
  const mod2 = wander(rng(score.seed, 'h2'), 0.7, len), mod3 = wander(rng(score.seed, 'h3'), 1.1, len);
  const bp1 = new Biquad(), bp2 = new Biquad();
  const airBP = new Biquad().bandpass(2200, 0.6), hissHP = new Biquad().highpass(3200), hissLP = new Biquad().lowpass(9000);
  const inBP = new Biquad().bandpass(1500, 0.8), inLP = new Biquad().lowpass(4500);
  const bpNorm = (f, q) => 1 / Math.sqrt(((Math.PI / 2) * (f / q)) / (SR / 2)); // unit-RMS output for white input
  const HISS_NORM = 1 / Math.sqrt((9000 - 3200) / (SR / 2)), AIR_NORM = bpNorm(2200, 0.6), IN_NORM = bpNorm(1500, 0.8);
  let ph = 0, vph = 0, n1 = 1, n2 = 1, h2 = 0, h3 = 0, h4 = 0, h5 = 0;
  const filters = [bp1, bp2, airBP, hissHP, hissLP, inBP, inLP];
  for (const [a, b] of ranges) {
    // every breath starts afresh, so a phrase depends only on its own notes
    ph = 0; vph = 0;
    for (const f of filters) f.reset();
    for (let n = a; n < b; n++) {
      const t = n / SR, e = env[n], w = noise();
      let y = 0;
      if (e > 0) {
        const v = vib[n], vs = Math.sin(vph);
        const c = cents[n] + 9 * v * vs + 3 * drift(t) + 0.8 * jitter(t);
        const f = SA * Math.pow(2, c / 1200);
        if ((n & 31) === 0 || n === a) {
          bp1.bandpass(f, 7); n1 = bpNorm(f, 7);
          bp2.bandpass(2 * f, 10); n2 = bpNorm(2 * f, 10);
          const br = clamp((f - 300) / 700, 0, 1), loud = clamp((lvl[n] + 8) / 10, 0, 1) - 0.5;
          h2 = dbToGain(-15 - 9 * br + 6 * loud + 1.5 * mod2(t));
          h3 = dbToGain(-25 - 11 * br + 8 * loud + 1.5 * mod3(t));
          h4 = dbToGain(-35 - 10 * br + 8 * loud);
          h5 = dbToGain(-45 - 8 * br + 8 * loud);
        }
        ph += f / SR; ph -= Math.floor(ph);
        const g = dbToGain(lvl[n]);
        const A = g * e * (1 + 0.06 * v * vs) * (1 + 0.012 * turbA(t) + 0.01 * turbB(t));
        let p2 = 2 * ph + 0.13, p3 = 3 * ph + 0.41, p4 = 4 * ph + 0.07, p5 = 5 * ph + 0.3;
        p2 -= Math.floor(p2); p3 -= Math.floor(p3); p4 -= Math.floor(p4); p5 -= Math.floor(p5);
        const tone = sinT(ph) + h2 * sinT(p2) + h3 * sinT(p3) + h4 * sinT(p4) + h5 * sinT(p5);
        const breathy = 0.55 + air[n] + 0.25 * clamp(-lvl[n] / 8, 0, 1);
        const An = g * Math.pow(e, 0.7) * breathy * 0.707;
        y = A * tone + An * (0.095 * n1 * bp1.tick(w) + 0.032 * n2 * bp2.tick(w) + 0.013 * AIR_NORM * airBP.tick(w) + 0.018 * HISS_NORM * hissLP.tick(hissHP.tick(w)));
      }
      if (inh[n] > 0) y += 0.012 * inh[n] * IN_NORM * inLP.tick(inBP.tick(w));
      vph += (TAU * (5.05 + 0.35 * vibRate(t))) / SR;
      if (vph > TAU) vph -= TAU;
      out[n] = y;
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
// The hall: synthetic stereo impulse response + circular FFT convolution
// ============================================================================
// A stone mantapa: a cluster of early reflections in the first 90 ms, then a
// dense, decorrelated stereo tail whose decay time falls with frequency
// (≈3.5 s in the low mids, ≈2.7 s at 2 kHz, ≈1.4 s at 8 kHz). The tail is
// synthesised frame by frame (random phase, frequency-dependent decay).
function makeIR(seed, seconds = 3.8) {
  const R = rng(seed, 'hall'), M = Math.round(seconds * SR), pre = Math.round(0.02 * SR);
  const T60 = [[63, 3.2], [125, 3.5], [250, 3.6], [500, 3.4], [1000, 3.1], [2000, 2.7], [4000, 2.1], [8000, 1.4], [16000, 0.8]];
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
    shape[k] = (h / (1 + h)) * (fr > 1000 ? Math.pow(1000 / fr, 0.12) : 1) / (1 + Math.pow(fr / 12000, 4));
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
      tail[i] = y[i] * (1 - Math.exp(-t / 0.03)) * (i > M - 0.25 * SR ? Math.pow(Math.cos((Math.PI / 2) * ((i - (M - 0.25 * SR)) / (0.25 * SR))), 2) : 1);
    }
    // early reflections off stone pillars and the floor
    let eTail = 0;
    for (let i = 0; i < M; i++) eTail += tail[i] * tail[i];
    const er = new Float32Array(M);
    const taps = side ? [11.2, 16.9, 19.4, 25.3, 36.8, 44.0, 52.7, 61.3, 72.2, 84.9] : [9.7, 14.3, 21.1, 27.8, 33.0, 41.6, 49.2, 58.5, 67.1, 79.4];
    for (const ms of taps) {
      const c = Math.round((ms / 1000) * SR) + pre, g = (R() < 0.5 ? -1 : 1) * (0.7 + 0.6 * R()) * Math.exp(-ms / 60);
      for (let j = -3; j <= 3; j++) er[c + j] += g * (0.5 + 0.5 * Math.cos((Math.PI * j) / 4)); // slightly dulled
    }
    let eEr = 0;
    for (let i = 0; i < M; i++) eEr += er[i] * er[i];
    const ge = Math.sqrt((0.25 * eTail) / eEr);
    for (let i = 0; i < M; i++) tail[i] += ge * er[i];
    ir.push(tail);
  }
  let e = 0;
  for (const ch of ir) for (let i = 0; i < M; i++) e += ch[i] * ch[i];
  scaleAll(1 / Math.sqrt(e / 2), ...ir);
  return { L: ir[0], R: ir[1] };
}

// Circular convolution of a mono send with a stereo IR (overlap-add, FFT 2^18).
// One complex IFFT yields both channels: Y = X·Hl + i·X·Hr.
function convolveLoop(x, irL, irR) {
  const N = x.length, M = irL.length, F = 1 << 18, B = 1 << 16;
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
// Sa and Ga of the same D; the short, inharmonic ones are what make it metal.
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
// noise. It swells in, sounds briefly and dies away; Sa = D4.
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
// The gapless fields of the Xing/Info header ffmpeg writes: encoder delay and
// end padding, which decoders use to return exactly the original samples.
async function gapless(file) {
  const d = await readFile(file);
  const i = d.subarray(0, 3).toString() === 'ID3' ? 10 + ((d[6] << 21) | (d[7] << 14) | (d[8] << 7) | d[9]) : 0;
  const first = d.subarray(i, i + 64); // the tag sits in the first frame, after the side information
  const at = Math.max(first.indexOf('Info'), first.indexOf('Xing'));
  if (at < 0) return null;
  const tag = i + at;
  const flags = d.readUInt32BE(tag + 4);
  let p = tag + 8, frames = null;
  if (flags & 1) { frames = d.readUInt32BE(p); p += 4; }
  if (flags & 2) p += 4;
  if (flags & 4) p += 100;
  if (flags & 8) p += 4;
  const delay = (d[p + 21] << 4) | (d[p + 22] >> 4), padding = ((d[p + 22] & 15) << 8) | d[p + 23];
  return { encoder: d.subarray(p, p + 9).toString().replace(/\0/g, ''), encoderDelay: delay, padding, frames, samples: frames * 1152 - delay - padding };
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
      note: 'For a two-<audio> player: when A reaches aFrom, start B at bAt (better: at A.currentTime - (cycles - 1) * cycleSeconds) and crossfade with equal-power curves over `seconds`. Both are drone only and at the same point of the tanpura cycle; anywhere inside quietInCycle works.' },
  };
}

async function renderMusic(work, encode, xfadeTail = 0) {
  const t0 = Date.now();
  const plan = schedule(SCORE);
  const N = Math.round(plan.length * SR);
  console.log(`music: ${plan.phrases.length} phrases, flute ${plan.fluteStart.toFixed(1)}–${plan.fluteEnd.toFixed(1)} s, loop ${(N / SR).toFixed(3)} s (${N} samples)`);

  const flute = renderFlute(plan, N, SCORE);
  console.log(`  flute rendered (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const tan = renderTanpura(N, SCORE);
  console.log(`  tanpura rendered (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  const [fl, fr] = panGains(MUSIC.flutePan);
  const fL = flute.map((x) => x * fl), fR = flute.map((x) => x * fr);
  const lFlute = lufs([fL, fR]), lTan = lufs([tan.L, tan.R]);
  const tg = dbToGain(lFlute + MUSIC.tanpuraLU - lTan);
  scaleAll(tg, tan.L, tan.R);

  const send = new Float32Array(N);
  for (let i = 0; i < N; i++) send[i] = flute[i] + 0.55 * 0.5 * (tan.L[i] + tan.R[i]);
  const ir = makeIR(SCORE.seed);
  const wet = convolveLoop(send, ir.L, ir.R);
  const dryL = new Float32Array(N), dryR = new Float32Array(N);
  for (let i = 0; i < N; i++) { dryL[i] = fL[i] + tan.L[i]; dryR[i] = fR[i] + tan.R[i]; }
  const wg = dbToGain(lufs([dryL, dryR]) + MUSIC.wetLU - lufs([wet.L, wet.R]));
  const L = new Float32Array(N), Rt = new Float32Array(N);
  for (let i = 0; i < N; i++) { L[i] = dryL[i] + wg * wet.L[i]; Rt[i] = dryR[i] + wg * wet.R[i]; }
  for (const ch of [L, Rt]) filterLoop(ch, [new Biquad().highpass(MUSIC.lowCut)]);
  const norm = dbToGain(-1) / peakOf(L, Rt);
  scaleAll(norm, L, Rt);
  console.log(`  mixed (${((Date.now() - t0) / 1000).toFixed(1)} s): flute ${lFlute.toFixed(1)} LUFS, tanpura set ${MUSIC.tanpuraLU} LU below, reverb ${MUSIC.wetLU} LU`);

  await mkdir(work, { recursive: true });
  const wav = join(work, 'flute-mohanam.wav');
  await writeFile(wav, wavFloat([L, Rt]));
  // stems for analysis (same gain as in the mix)
  const g = norm;
  await writeFile(join(work, 'stem-flute-dry.wav'), wavFloat([flute.map((x) => x * g)]));
  await writeFile(join(work, 'stem-tanpura.wav'), wavFloat([tan.L.map((x) => x * norm), tan.R.map((x) => x * norm)]));
  await writeFile(join(work, 'timeline.json'), JSON.stringify({
    sa: SCORE.sa, samples: N, seconds: N / SR, fluteStart: plan.fluteStart, fluteEnd: plan.fluteEnd,
    phrases: plan.phrases.map((p) => ({ index: p.index, t0: +p.t0.toFixed(3), t1: +p.t1.toFixed(3), notes: p.notes,
      swaras: p.ev.filter((e) => !e.rest).map((e) => ({ s: e.swara, cents: +e.cents.toFixed(1), t0: +e.t0.toFixed(3), t1: +e.t1.toFixed(3), kampita: !!e.kampita, jaru: !!e.jaru, grace: !!e.grace })) })),
  }, null, 1));
  const info = { file: 'flute-mohanam.mp3', samples: N, seconds: +(N / SR).toFixed(4), fluteStart: +plan.fluteStart.toFixed(2), fluteEnd: +plan.fluteEnd.toFixed(2), tanpura: tanpuraGrid(tan, plan) };
  if (!encode) return info;

  // pass 1: loudnorm measures the master; pass 2: its linear gain, checked on the MP3
  const m = measure(wav, MUSIC.lufs, MUSIC.truePeak);
  const mp3 = join(OUT, 'flute-mohanam.mp3');
  await mkdir(OUT, { recursive: true });
  const enc = encodeTo(MUSIC.lufs, mp3, (gain) => ffmpeg(['-i', wav, '-af', `volume=${gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', MUSIC.bitrate, '-ar', String(SR), '-ac', '2',
    '-metadata', 'title=Mohanam (flute alapana with tanpura)', '-metadata', 'artist=Original composition for dattapeetham.org',
    '-metadata', `comment=${CREDIT}. Raga Mohanam, Sa = D.`, mp3]), linearGain(m, MUSIC.lufs, MUSIC.truePeak));
  if (enc.truePeak > MUSIC.truePeak) throw new Error(`true peak ${enc.truePeak} dBTP exceeds ${MUSIC.truePeak}`);
  const ex = plan.phrases[SCORE.excerptFrom - 1].t0 - 1.5;
  ffmpeg(['-ss', ex.toFixed(3), '-t', '30', '-i', wav, '-af', `volume=${enc.gain.toFixed(3)}dB,afade=t=in:st=0:d=1.2,afade=t=out:st=27.5:d=2.5`,
    '-c:a', 'libmp3lame', '-b:a', MUSIC.bitrate, '-metadata', 'title=Mohanam (30 s excerpt)', join(work, 'flute-excerpt.mp3')]);
  console.log(`  encoded ${mp3} (${await kb(mp3)} KB): master ${m.input_i} LUFS / ${m.input_tp} dBTP; gain ${enc.gain.toFixed(2)} dB → ${enc.lufs} LUFS, ${enc.truePeak} dBTP, LRA ${enc.lra} LU`);
  console.log(`  excerpt ${join(work, 'flute-excerpt.mp3')} from ${ex.toFixed(1)} s`);
  const out = { ...info, gainDb: +enc.gain.toFixed(3), lufs: enc.lufs, truePeakDbtp: enc.truePeak, lraLU: enc.lra, kb: await kb(mp3), excerptFrom: +ex.toFixed(2) };
  if (xfadeTail > 0) { // the loop, then its own beginning again: continuous across N by construction
    const T = Math.round(xfadeTail * SR), xL = new Float32Array(N + T), xR = new Float32Array(N + T);
    xL.set(L); xL.set(L.subarray(0, T), N); xR.set(Rt); xR.set(Rt.subarray(0, T), N);
    const xwav = join(work, 'flute-mohanam-xfade.wav'), xmp3 = join(OUT, 'flute-mohanam-xfade.mp3');
    await writeFile(xwav, wavFloat([xL, xR]));
    ffmpeg(['-i', xwav, '-af', `volume=${enc.gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', MUSIC.bitrate, '-ar', String(SR), '-ac', '2',
      '-metadata', 'title=Mohanam (flute alapana with tanpura), crossfade tail', '-metadata', `comment=${CREDIT}.`, xmp3]);
    out.xfade = { file: 'flute-mohanam-xfade.mp3', samples: N + T, loopSamples: N, loopSeconds: +(N / SR).toFixed(4), tailSeconds: +(T / SR).toFixed(4), kb: await kb(xmp3),
      note: 'Samples [N, N+T) repeat [0, T). Crossfade two elements inside the tail: when A reaches loopSeconds + d, start B at d; both then play identical audio.' };
    console.log(`  crossfade variant ${xmp3} (${out.xfade.kb} KB, tail ${out.xfade.tailSeconds} s)`);
  }
  return out;
}

async function renderSfx(work, encode) {
  const seed = SCORE.seed;
  const items = [
    { name: 'ghanta', kind: 'ghanta', buf: renderGhanta(seed), note: 'small brass hand-bell, struck (Sa = D6, Ga ringing above)' },
    ...['S', 'R', 'G', 'P', 'D', 'S2'].map((s) => ({ name: `chime-${s.toLowerCase()}`, kind: 'chime', swara: s, buf: renderChime(s, seed),
      hz: +(2 * SCORE.sa * (s === 'S2' ? 2 : RATIO[s])).toFixed(2) })),
    { name: 'shankha', kind: 'shankha', buf: renderShankha(seed), note: 'soft conch swell on Sa (D4); optional' },
  ];
  await mkdir(join(work, 'sfx'), { recursive: true });
  await mkdir(join(OUT, 'sfx'), { recursive: true });
  const out = [];
  for (const it of items) {
    const g = dbToGain(SFX_LUFS[it.kind] - lufs([it.buf]));
    scaleAll(g, it.buf);
    if (peakOf(it.buf) > dbToGain(-1.5)) scaleAll(dbToGain(-1.5) / peakOf(it.buf), it.buf);
    const wav = join(work, 'sfx', it.name + '.wav');
    await writeFile(wav, wavFloat([it.buf]));
    const rec = { file: `sfx/${it.name}.mp3`, seconds: +(it.buf.length / SR).toFixed(3), ...(it.swara ? { swara: it.swara, hz: it.hz } : {}), ...(it.note ? { note: it.note } : {}) };
    if (encode) {
      const mp3 = join(OUT, 'sfx', it.name + '.mp3');
      const enc = encodeTo(SFX_LUFS[it.kind], mp3, (gain) => ffmpeg(['-i', wav, '-af', `volume=${gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', '-ar', String(SR),
        '-metadata', `title=${it.name}`, '-metadata', 'artist=Original sound for dattapeetham.org', mp3]));
      Object.assign(rec, { lufs: enc.lufs, truePeakDbtp: enc.truePeak, kb: await kb(mp3) });
    }
    out.push(rec);
    console.log(`  ${it.name}: ${rec.seconds} s${rec.kb ? `, ${rec.kb} KB, ${rec.lufs} LUFS, ${rec.truePeakDbtp} dBTP` : ''}`);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const wi = args.indexOf('--work');
  const work = resolve(wi >= 0 ? args[wi + 1] : join(os.tmpdir(), 'dattapeetham-audio'));
  const encode = !args.includes('--wav');
  if (args.includes('--plan')) {
    const plan = schedule(SCORE);
    for (const p of plan.phrases) console.log(`${String(p.index).padStart(2)}  ${p.t0.toFixed(1).padStart(6)}–${p.t1.toFixed(1).padEnd(6)} ${p.notes}`);
    console.log(`loop length ${plan.length.toFixed(2)} s`);
    return;
  }
  const doMusic = !args.includes('--sfx') || args.includes('--music'), doSfx = !args.includes('--music') || args.includes('--sfx');
  const manifest = { credit: CREDIT, raga: 'Mohanam (S R2 G3 P D2)', sa: 'D', saHz: SCORE.sa, sampleRate: SR };
  const xi = args.indexOf('--xfade-tail');
  if (doMusic) manifest.music = await renderMusic(work, encode, xi >= 0 ? +args[xi + 1] : 0);
  if (doSfx) { console.log('temple sounds:'); manifest.sfx = await renderSfx(work, encode); }
  if (encode && doMusic && doSfx) {
    const gl = await gapless(join(OUT, 'flute-mohanam.mp3'));
    if (!gl || gl.samples !== manifest.music.samples) console.warn(`  ! gapless header says ${gl && gl.samples} samples, the master has ${manifest.music.samples}`);
    manifest.music.loop = {
      start: 0, end: manifest.music.seconds, samples: manifest.music.samples, gapless: gl,
      note: 'The whole file is one seamless loop. Decoders that read the gapless header (Chromium decodeAudioData, ffmpeg) return exactly `samples` samples: loop the whole AudioBuffer (AudioBufferSourceNode.loop = true). A decoder that ignores the header returns more, usually 1105 extra at the start (576 encoder + 529 decoder delay): then set loopStart = 1105 / sampleRate and loopEnd = loopStart + samples / sampleRate. Avoid <audio loop>: Chromium 141 skips 12–23 ms at the wrap (measured), an audible hiccup in the drone. A player that crossfades two <audio> elements should use music.tanpura.crossfade (same point of the tanpura cycle) rather than fade the end of the file into B started at 0.',
    };
    await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  }
  console.log(`work files in ${work}`);
}

// for tests and analysis: `import { makeIR } from './compose-audio.mjs'` renders nothing by itself
export { renderFlute, renderTanpura, makeIR, convolveLoop, renderGhanta, renderChime, renderShankha, lufs, SR };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
