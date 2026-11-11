#!/usr/bin/env node
/**
 * Bundle isolation for the optional 3D campus (DR-31).
 *
 * three.js reaches the browser only through apps/web/components/world/
 * world-host.tsx, which loads the engine with import() once the device and
 * GPU gates pass. This reads the built web app and fails when:
 *   - any chunk listed for any route (or for every page, like the runtime)
 *     carries three's renderer, /(app)/world/page and /(app)/today/page
 *     included; or
 *   - no chunk at all carries it, which would mean the async engine chunk
 *     went missing and the check proves nothing.
 *
 * The marker is a property name that survives minification:
 *   grep -l isWebGLRenderer apps/web/node_modules/three/build/*.js
 *
 * Run after `pnpm build:web`:   node scripts/world/check-bundle.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const NEXT = join(ROOT, "apps/web/.next");
const MARKER = "isWebGLRenderer";

const rel = (p) => relative(ROOT, p);
const kb = (n) => `${Math.round(n / 1024)} kB`;

function fail(message) {
  console.error(`check-bundle: FAIL. ${message}`);
  process.exit(1);
}

function readJson(path) {
  if (!existsSync(path)) fail(`${rel(path)} is missing. Run "pnpm build:web" first.`);
  return JSON.parse(readFileSync(path, "utf8"));
}

const carries = new Map();
function hasMarker(file) {
  if (!carries.has(file)) carries.set(file, existsSync(file) && readFileSync(file, "utf8").includes(MARKER));
  return carries.get(file);
}

// Every route's chunks, from the App Router manifest and the Pages manifest.
const routes = new Map();
const add = (route, files) => {
  const list = routes.get(route) ?? new Set();
  for (const f of files ?? []) if (typeof f === "string" && f.endsWith(".js")) list.add(f);
  routes.set(route, list);
};
const app = readJson(join(NEXT, "app-build-manifest.json"));
for (const [route, files] of Object.entries(app.pages ?? {})) add(route, files);
const pagesManifest = join(NEXT, "build-manifest.json");
if (existsSync(pagesManifest)) {
  const b = readJson(pagesManifest);
  for (const [route, files] of Object.entries(b.pages ?? {})) add(`pages:${route}`, files);
  add("every page (rootMainFiles)", b.rootMainFiles);
  add("every page (polyfillFiles)", b.polyfillFiles);
  add("every page (lowPriorityFiles)", b.lowPriorityFiles);
}
for (const route of ["/(app)/world/page", "/(app)/today/page"]) {
  if (!routes.has(route)) fail(`${route} is not in app-build-manifest.json, so the check cannot vouch for it.`);
}

const leaks = [];
const listed = new Set();
for (const [route, files] of routes) {
  for (const f of files) {
    listed.add(f);
    if (hasMarker(join(NEXT, f))) leaks.push(`${route} -> ${f}`);
  }
}
if (leaks.length) fail(`three.js is in a route's own chunks:\n  ${leaks.join("\n  ")}`);

// The engine must still exist, as chunks no route lists: loaded by import() alone.
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}
const chunksDir = join(NEXT, "static/chunks");
if (!existsSync(chunksDir)) fail(`${rel(chunksDir)} is missing. Run "pnpm build:web" first.`);
const engine = walk(chunksDir).filter(hasMarker);
if (engine.length === 0) fail(`no chunk under ${rel(chunksDir)} carries "${MARKER}": the async engine chunk is missing.`);

const engineList = engine.map((p) => `${relative(chunksDir, p)} (${kb(statSync(p).size)})`).join(", ");
console.log(`check-bundle: OK. ${routes.size} routes and ${listed.size} route chunks checked, none carries three.js; the engine is in ${engine.length} async chunk${engine.length === 1 ? "" : "s"}: ${engineList}.`);
