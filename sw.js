// Farm Intelligence service worker: lets the app open without internet.
// With internet: always fetch the newest files (and save a copy).
// Without internet, or if the network is very slow: use the saved copy.
const VER = "fi-v5";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "icons/apple-touch-icon.png", "icons/favicon.png", "diary.js", "prices.js", "config.js",
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
  e.respondWith((async () => {
    const cached = () => caches.match(req, {ignoreSearch: true});
    try {
      const net = fetch(req, {cache: "no-cache"}).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); }
        return r;
      });
      net.catch(() => {});
      // give the network 6 seconds on a weak signal, then fall back to the saved copy
      const slow = new Promise(res => setTimeout(async () => res((await cached()) || net), 6000));
      return await Promise.race([net, slow]);
    } catch (err) {
      return (await cached()) || Response.error();
    }
  })());
});
