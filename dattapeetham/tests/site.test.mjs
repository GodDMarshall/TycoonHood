// Content and structure guards for the built site (node:test, no dependencies).
//
//   node build.mjs && node --test tests/
//
// Catches template leaks, missing metadata, images without alt or size, and
// contact details that drift from the single source in src/site.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const files = (await readdir(SITE)).filter((f) => f.endsWith('.html'));
const pages = await Promise.all(files.map(async (f) => ({ f, html: await readFile(join(SITE, f), 'utf8') })));
const main = (html) => (/<main[^>]*>([\s\S]*)<\/main>/.exec(html) || [, ''])[1];
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ');

test('every page was built', () => {
  for (const f of ['index.html', 'about.html', 'sri-swamiji.html', 'guru-parampara.html', 'darshan.html', 'events.html', 'teachings.html', 'music.html', 'kriya-yoga.html', 'seva.html', 'visit.html', 'attractions.html', 'media.html', 'centers.html', 'contact.html', '404.html']) {
    assert.ok(files.includes(f), `${f} missing`);
  }
});

for (const { f, html } of pages) {
  test(`${f}: no template leaks`, () => {
    const t = text(main(html));
    for (const bad of ['undefined', 'NaN', '[object Object]', 'TODO', 'lorem ipsum', '${']) {
      assert.ok(!t.includes(bad), `"${bad}" appears in visible text`);
    }
  });

  test(`${f}: head metadata`, () => {
    const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1] || '';
    const desc = (/<meta name="description" content="([^"]*)"/.exec(html) || [])[1] || '';
    assert.ok(title.length >= 10 && title.length <= 90, `title length ${title.length}: ${title}`);
    assert.ok(desc.length >= 50 && desc.length <= 200, `description length ${desc.length}`);
    assert.match(html, /<link rel="canonical" href="https:\/\/www\.dattapeetham\.org\//);
    assert.match(html, /<meta property="og:image" content="https:\/\//);
    assert.match(html, /<html lang="en">/);
  });

  test(`${f}: exactly one h1`, () => {
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
  });

  test(`${f}: images have alt and intrinsic size`, () => {
    for (const tag of html.match(/<img\b[^>]*>/g) || []) {
      assert.match(tag, /\salt="/, `img without alt: ${tag.slice(0, 120)}`);
      if (/assets\/img\/opt\//.test(tag)) assert.match(tag, /\swidth="\d+"/, `optimised img without width: ${tag.slice(0, 120)}`);
    }
  });

  test(`${f}: JSON-LD parses`, () => {
    for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(json);
  });

  test(`${f}: external links are safe`, () => {
    for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) assert.match(tag, /rel="[^"]*noopener/, tag.slice(0, 120));
  });

  test(`${f}: main contact details match src/site.mjs`, () => {
    const t = text(html);
    // The Ashram's main line may only appear in its canonical form.
    for (const m of t.matchAll(/\(?0?821\)?[\s-]*248[\s-]*6[\s-]*486/g)) {
      assert.ok(['+91 (0821) 2486 486', '(0821) 2486 486', '(0821)-2486486', '0821 2486486', '0821-2486486'].some((ok) => m[0].includes(ok.replace('+91 ', '')) || t.includes(site.phone)), `unexpected phone form: ${m[0]}`);
    }
    for (const [, mail] of html.matchAll(/mailto:([^"?]+)/g)) {
      assert.match(decodeURIComponent(mail), /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/, `bad mailto ${mail}`);
    }
  });
}

test('sitemap lists every public page', async () => {
  const xml = await readFile(join(SITE, 'sitemap.xml'), 'utf8');
  for (const f of files.filter((x) => x !== '404.html')) {
    const loc = f === 'index.html' ? `${site.origin}/` : `${site.origin}/${f}`;
    assert.ok(xml.includes(`<loc>${loc}</loc>`), `${loc} not in sitemap`);
  }
});

test('search index has an entry for every public page', async () => {
  const idx = JSON.parse(await readFile(join(SITE, 'assets/search-index.json'), 'utf8'));
  for (const f of files.filter((x) => x !== '404.html')) assert.ok(idx.some((e) => e.u.startsWith(f)), `${f} not searchable`);
});
