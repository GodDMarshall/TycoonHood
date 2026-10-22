#!/usr/bin/env node
// Validate translation dictionaries against the extracted English segments.
//
//   node tools/i18n-check.mjs <lang> [file.json ...]
//
// Reports, per language: coverage of src/i18n/segments.json, and every entry
// that fails QA (placeholders changed, numbers lost, wrong script, empty) or
// whose key is not an English segment (typo in the key). Exit 1 on problems.

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, checkTranslation } from '../src/i18n/engine.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [code, ...only] = process.argv.slice(2);
const lang = LANGS.find((l) => l.code === code);
if (!lang || code === 'en') { console.error('usage: node tools/i18n-check.mjs kn|hi|ta|te [files]'); process.exit(2); }
const segs = new Set(JSON.parse(await readFile(join(ROOT, 'src/i18n/segments.json'), 'utf8')).map((s) => s.k));
const dir = join(ROOT, 'src/i18n', code);
const files = only.length ? only : (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));
const dict = {};
const problems = [];
for (const f of files) {
  let d;
  try { d = JSON.parse(await readFile(f, 'utf8')); } catch (e) { problems.push(`${f}: invalid JSON — ${e.message}`); continue; }
  for (const [k, v] of Object.entries(d)) {
    dict[k] = v;
    if (!segs.has(k)) problems.push(`unknown key (not an English segment): ${JSON.stringify(k).slice(0, 100)}`);
    const bad = checkTranslation(k, v, lang);
    if (bad) problems.push(`${bad}: ${JSON.stringify(k).slice(0, 90)} → ${JSON.stringify(v).slice(0, 90)}`);
  }
}
const covered = [...segs].filter((k) => dict[k] !== undefined).length;
console.log(`${code}: ${covered}/${segs.size} segments translated (${(covered / segs.size * 100).toFixed(1)}%), ${problems.length} problem(s)`);
for (const p of problems.slice(0, 200)) console.log('  ' + p);
process.exit(problems.length ? 1 : 0);
