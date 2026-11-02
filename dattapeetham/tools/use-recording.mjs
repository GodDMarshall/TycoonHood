#!/usr/bin/env node
// The site's music from a recording, in place of the piece tools/compose-audio.mjs synthesises.
//
//   node tools/use-recording.mjs <recording> --sa <Hz> [--gap 1.5] [--bitrate 192] [--source "<text>"] [--work <dir>]
//
//   <recording>  any file ffmpeg reads (m4a, mp3, wav, flac …)
//   --sa         the recording's Sa (its tonic) in Hz, for example 261.93 for C4 with A4 a
//                touch above 440 Hz. The temple sounds (the bell and the six scroll chimes,
//                S R G P D S') are retuned to it, so they sound in the music's key.
//   --gap        seconds of silence after the recording before it starts again (default 1.5)
//   --bitrate    MP3 bitrate in kbit/s (default 192: the recording is heard as it is, so it is
//                kept a step above the 128 kbit/s the synthesised piece used)
//   --source     one line on where the recording comes from, kept in manifest.json
//   --work       where the WAVs and MP3s are made (default <system temp>/dattapeetham-recording)
//
// What it writes into src/assets/audio/, once every check has passed:
//   flute-music.mp3         the recording as one loop: the music, then --gap seconds of silence
//   flute-music-xfade.mp3   the same loop followed by its own first 4.6 s: the copy the site
//                           plays. Two <audio> elements hand over inside that tail (B, started at
//                           3.45 s, takes over from A at the loop plus 3.45 s), both playing the
//                           same music, so the loop has no seam to hear.
//   sfx/*.mp3               the temple sounds of tools/compose-audio.mjs, tuned to --sa in
//                           equal temperament (as a recording is played)
//   manifest.json           what the build reads: the files, the loop and crossfade points,
//                           loudness, and the level meter's reference
// and it removes the other flute-*.mp3 files there (a synthesised piece it replaces).
//
// The recording itself is not changed: it is decoded, resampled to 44.1 kHz (soxr), its digital
// silence at either end trimmed, given a 10 ms fade-in so the loop's restart cannot click, and
// set to the loudness the site's levels are built around (-23 LUFS integrated, true peak at
// most -2 dBTP) by one fixed gain. Nothing is filtered, compressed or added.
//
// To go back to the synthesised piece, run tools/compose-audio.mjs --xfade-tail 4.6 (it writes
// its own files and manifest).

import { writeFile, mkdir, rm, copyFile, rename, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import os from 'node:os';
import {
  SCORE, SFX, renderSfx, ffmpeg, measure, linearGain, ebur128, encodeTo, decodeMp3, percentile, kb, wavFloat, setGapless, gapless, noteOf, tuningOf, OUT, SR,
} from './compose-audio.mjs';
import { CREDIT } from '../src/features/devotion-sound.mjs';

const NAME = 'flute-music';
const LUFS = -23, TRUE_PEAK = -2;
const TAIL = 4.6, B_AT = 3.45, FADE = 0.6; // the xfade file's tail, and the handover inside it
const SILENT = 10 ** (-70 / 20); // trimmed at either end: below -70 dBFS
const FADE_IN = 0.01;

function args() {
  const a = process.argv.slice(2), valued = ['--sa', '--gap', '--bitrate', '--source', '--work'];
  const o = { file: null };
  for (let i = 0; i < a.length; i++) {
    if (valued.includes(a[i])) {
      if (a[i + 1] === undefined || a[i + 1].startsWith('--')) throw new Error(`${a[i]} needs a value`);
      o[a[i].slice(2)] = a[++i];
    } else if (a[i].startsWith('--')) throw new Error(`unknown option ${a[i]} (the options are listed at the top of tools/use-recording.mjs)`);
    else if (o.file) throw new Error(`one recording at a time (${o.file}, then ${a[i]})`);
    else o.file = a[i];
  }
  if (!o.file) throw new Error('usage: node tools/use-recording.mjs <recording> --sa <Hz> [--gap 1.5] [--bitrate 192] [--source "<text>"] [--work <dir>]');
  const sa = +o.sa, gap = o.gap === undefined ? 1.5 : +o.gap, bitrate = o.bitrate === undefined ? 192 : +o.bitrate;
  if (!(sa > 50 && sa < 1000)) throw new Error(`--sa ${o.sa}: the recording's Sa in Hz (for example 261.93)`);
  if (!(gap >= 0 && gap <= 10)) throw new Error(`--gap ${o.gap}: seconds of silence, 0 to 10`);
  if (![96, 128, 160, 192, 224, 256, 320].includes(bitrate)) throw new Error(`--bitrate ${o.bitrate}: one of 96, 128, 160, 192, 224, 256 or 320`);
  return { file: resolve(o.file), sa, gap, bitrate, source: o.source || null, work: resolve(o.work ?? join(os.tmpdir(), 'dattapeetham-recording')) };
}

// The recording as two channels of 44.1 kHz float samples
async function decode(file, work) {
  const raw = join(work, 'recording.f32');
  try {
    ffmpeg(['-i', file, '-vn', '-af', 'aresample=resampler=soxr:precision=28', '-ar', String(SR), '-ac', '2', '-f', 'f32le', '-c:a', 'pcm_f32le', raw]);
    const b = readFileSync(raw), x = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
    const n = x.length / 2, L = new Float32Array(n), R = new Float32Array(n);
    for (let i = 0; i < n; i++) { L[i] = x[2 * i]; R[i] = x[2 * i + 1]; }
    return [L, R];
  } finally {
    await rm(raw, { force: true });
  }
}

// RMS of 2048-sample frames (hop 1024) of a mono mix, as the player's level meter reads it
function frameRms(L, R, n) {
  const out = [];
  for (let s = 0; s + 2048 <= n; s += 1024) {
    let e = 0;
    for (let i = s; i < s + 2048; i++) { const m = 0.5 * (L[i] + R[i]); e += m * m; }
    out.push(Math.sqrt(e / 2048));
  }
  return out;
}

async function main() {
  const o = args();
  await mkdir(o.work, { recursive: true });
  console.log(`recording ${o.file}`);
  const [L0, R0] = await decode(o.file, o.work);
  const loud = (i) => Math.abs(L0[i]) > SILENT || Math.abs(R0[i]) > SILENT;
  let a = 0, b = L0.length;
  while (a < b && !loud(a)) a++;
  while (b > a && !loud(b - 1)) b--;
  if (b - a < 10 * SR) throw new Error(`only ${((b - a) / SR).toFixed(1)} s of sound in the recording`);
  const music = b - a, gap = Math.round(o.gap * SR), N = music + gap, T = Math.round(TAIL * SR);
  console.log(`  ${(L0.length / SR).toFixed(2)} s decoded; sound from ${(a / SR).toFixed(3)} to ${(b / SR).toFixed(3)} s; loop ${(N / SR).toFixed(3)} s with ${o.gap} s of silence`);
  const L = new Float32Array(N), R = new Float32Array(N), fi = Math.round(FADE_IN * SR);
  for (let i = 0; i < music; i++) {
    const g = i < fi ? Math.pow(Math.sin((Math.PI / 2) * (i / fi)), 2) : 1;
    L[i] = g * L0[a + i]; R[i] = g * R0[a + i];
  }
  // where the music starts to be heard (the player's first play begins 1.5 s before it, or at 0)
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  let start = 0;
  while (start < N && Math.max(Math.abs(L[start]), Math.abs(R[start])) < peak * 10 ** (-40 / 20)) start++;

  // the loop, and the loop followed by its own first TAIL seconds
  const wav = join(o.work, `${NAME}.wav`), xwav = join(o.work, `${NAME}-xfade.wav`);
  await writeFile(wav, wavFloat([L, R]));
  const XL = new Float32Array(N + T), XR = new Float32Array(N + T);
  XL.set(L); XR.set(R); XL.set(L.subarray(0, T), N); XR.set(R.subarray(0, T), N);
  await writeFile(xwav, wavFloat([XL, XR]));

  const m = measure(wav, LUFS, TRUE_PEAK), title = 'Flute (background music)';
  const meta = ['-metadata', `title=${title}`, '-metadata', `comment=${CREDIT}.${o.source ? ` ${o.source}` : ''}`];
  const mp3 = join(o.work, `${NAME}.mp3`), xmp3 = join(o.work, `${NAME}-xfade.mp3`);
  const enc = encodeTo(LUFS, mp3, (gain) => ffmpeg(['-i', wav, '-af', `volume=${gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', `${o.bitrate}k`, '-ar', String(SR), '-ac', '2', ...meta, mp3]),
    linearGain(m, LUFS, TRUE_PEAK));
  if (enc.truePeak > TRUE_PEAK) throw new Error(`true peak ${enc.truePeak} dBTP exceeds ${TRUE_PEAK}`);
  ffmpeg(['-i', xwav, '-af', `volume=${enc.gain.toFixed(3)}dB`, '-c:a', 'libmp3lame', '-b:a', `${o.bitrate}k`, '-ar', String(SR), '-ac', '2', ...meta, xmp3]);
  // exact gapless headers: a decoder that reads them returns the loop, and the loop plus its tail, to the sample
  for (const [f, n] of [[mp3, N], [xmp3, N + T]]) if (!setGapless(f, 0, n)) throw new Error(`${f}: the end padding does not fit the gapless header`);
  const dec = await decodeMp3(mp3, o.work), xdec = await decodeMp3(xmp3, o.work);
  if (dec.length / 2 !== N) throw new Error(`${NAME}.mp3 decodes to ${dec.length / 2} samples, the loop has ${N}`);
  if (xdec.length / 2 !== N + T) throw new Error(`${NAME}-xfade.mp3 decodes to ${xdec.length / 2} samples, not ${N + T}`);
  // the tail plays what the head plays (each with its own coding noise)
  let e = 0, d = 0;
  for (let i = 0; i < 2 * T; i++) { e += xdec[i] ** 2; d += (xdec[2 * N + i] - xdec[i]) ** 2; }
  const tailDb = 10 * Math.log10(d / e);
  if (tailDb > -20) throw new Error(`the xfade tail differs from the head by ${tailDb.toFixed(1)} dB`);
  const XDL = new Float32Array(N), XDR = new Float32Array(N);
  for (let i = 0; i < N; i++) { XDL[i] = xdec[2 * i]; XDR[i] = xdec[2 * i + 1]; }
  const levelRef = +percentile(frameRms(XDL, XDR, N), 0.95).toFixed(3);
  const xm = ebur128(xmp3);
  console.log(`  ${NAME}.mp3: ${enc.lufs} LUFS, ${enc.truePeak} dBTP, LRA ${enc.lra} LU (gain ${enc.gain.toFixed(2)} dB, ${o.bitrate} kbit/s)`);
  console.log(`  ${NAME}-xfade.mp3: ${xm.lufs} LUFS, ${xm.truePeak} dBTP; tail vs head ${tailDb.toFixed(1)} dB; levelRef ${levelRef}`);

  // the temple sounds, in the recording's key and its equal temperament
  SCORE.sa = o.sa; SFX.equal = true;
  console.log(`temple sounds, Sa = ${noteOf(o.sa).name} (${o.sa} Hz, ${tuningOf(o.sa)}):`);
  const ship = [[mp3, join(OUT, `${NAME}.mp3`)], [xmp3, join(OUT, `${NAME}-xfade.mp3`)]];
  const sfx = await renderSfx(o.work, true, ship);

  const r = (x, k = 4) => +x.toFixed(k), seconds = r(N / SR), info = await gapless(mp3), xinfo = await gapless(xmp3);
  const manifest = {
    credit: CREDIT, raga: null, sa: noteOf(o.sa).note, saHz: r(o.sa), tuning: tuningOf(o.sa), temperament: 'equal (the temple sounds, to match the recording)', sampleRate: SR,
    music: {
      file: `${NAME}.mp3`, samples: N, seconds, fluteStart: r(start / SR, 2), fluteEnd: r(music / SR, 2),
      recording: { from: basename(o.file), seconds: r(L0.length / SR, 3), soundFrom: r(a / SR, 3), soundTo: r(b / SR, 3), gapSeconds: o.gap, ...(o.source ? { source: o.source } : {}),
        note: 'A recording, used as it is: decoded, resampled to 44.1 kHz, its digital silence trimmed, a 10 ms fade-in, one fixed gain; then the gap of silence before it starts again. Made with tools/use-recording.mjs.' },
      crossfade: { bAt: B_AT, seconds: FADE,
        note: 'Only for the xfade file: when A reaches loopSeconds + bAt, B (started at bAt) takes over over `seconds`; both play the same music. There is no plan for the plain file: a recording has no cycle to hand over on.' },
      gainDb: r(enc.gain, 2), lufs: enc.lufs, truePeakDbtp: enc.truePeak, lraLU: enc.lra, bitrateKbps: o.bitrate, levelRef, kb: await kb(mp3),
      xfade: { file: `${NAME}-xfade.mp3`, samples: N + T, loopSamples: N, loopSeconds: seconds, tailSeconds: r(T / SR), kb: await kb(xmp3), gapless: xinfo,
        note: 'Samples [N, N+T) repeat [0, T). Crossfade two elements inside the tail: when A reaches loopSeconds + d, start B at d; both then play the same music (the same samples in the master; in the MP3, each copy with its own coding noise).' },
      loop: { start: 0, end: seconds, samples: N, gapless: info,
        note: 'The whole file is one loop: the recording, then its gap of silence. Decoders that read the gapless header (Chromium decodeAudioData, ffmpeg) return exactly `samples` samples. The site plays the xfade file with the crossfade above.' },
    },
    sfx,
  };

  // every check has passed: the new files replace the site's, each copied beside its target and renamed over it
  const staged = [];
  try {
    for (const [from, to] of ship) { await mkdir(dirname(to), { recursive: true }); staged.push(to); await copyFile(from, `${to}.new`); }
  } catch (err) {
    for (const to of staged) await rm(`${to}.new`, { force: true }).catch(() => {});
    throw err;
  }
  for (const to of staged) await rename(`${to}.new`, to);
  const mf = join(OUT, 'manifest.json');
  await writeFile(`${mf}.new`, JSON.stringify(manifest, null, 2) + '\n');
  await rename(`${mf}.new`, mf);
  for (const f of await readdir(OUT)) {
    if (/^flute-.*\.mp3$/.test(f) && !f.startsWith(`${NAME}.`) && !f.startsWith(`${NAME}-xfade.`)) { await rm(join(OUT, f)); console.log(`  removed ${f} (the music it replaces)`); }
  }
  console.log(`  ${ship.length} files and manifest.json written to ${OUT}`);
  console.log(`work files in ${o.work}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
