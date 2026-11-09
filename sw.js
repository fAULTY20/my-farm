// Farm Intelligence service worker: lets the app open without internet.
// App files: served from cache, refreshed in the background.
// Data files (data/*.json): fresh from the internet when possible, cached copy when offline.
const VER = "fi-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "icons/apple-touch-icon.png", "icons/favicon.png",
  "data/farm_data.json", "data/weather.json", "data/soil.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isData = new URL(req.url).pathname.includes("/data/");
  if (isData) {
    e.respondWith(fetch(req, {cache: "no-store"}).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req, {ignoreSearch: true})));
  } else {
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => {
      const net = fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    }));
  }
});
