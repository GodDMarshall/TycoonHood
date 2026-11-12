/* global self, caches, fetch, Request, URL */
/*
 * Tycoonhood service worker — deliberately small.
 *
 *  • Pages always come from the network. A member's pages are private and
 *    change by the minute, so they are never cached; when the network is
 *    gone, the offline page explains it instead of a browser error.
 *  • Build assets (/_next/static, immutable by hash) and icons are cached
 *    on first use so the app shell opens fast. Every deploy brings new
 *    hashes and this file does not change with it, so the cache keeps only
 *    the newest MAX_ASSETS files: the oldest go first, and a deploy's files
 *    push out the last one's.
 *  • API calls are never touched.
 */
const VERSION = "th-v2";
const OFFLINE = "/offline";
const MAX_ASSETS = 200;

/** Keys come back in the order they were stored, so the first ones are the oldest. */
function trim(cache) {
  return cache.keys().then((keys) => {
    const assets = keys.filter((k) => new URL(k.url).pathname !== OFFLINE);
    return Promise.all(assets.slice(0, Math.max(0, assets.length - MAX_ASSETS)).map((k) => cache.delete(k)));
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.add(new Request(OFFLINE, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy).then(() => trim(c)));
            }
            return res;
          })
      )
    );
  }
});
