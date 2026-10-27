// Jednoduchý service worker: aplikácia sa otvorí aj pri slabom signáli.
// Dáta (ceny, obchody) sa vždy berú živo z databázy, necachujú sa.
const CACHE = "ernte-v108";
const SHELL = ["./", "./index.html", "./config.js", "./logo.png", "./icon-192.png", "./icon-512.png", "./manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // databáza, písma, knižnice idú priamo
  // vždy overiť u servera (no-cache = rýchla kontrola, či nie je novšia verzia), offline zo zálohy
  const req = e.request.mode === "navigate" ? new Request(u.href, { cache: "no-cache", credentials: "same-origin" }) : new Request(e.request, { cache: "no-cache" });
  e.respondWith(fetch(req).then(r => { if (r.ok && r.type === "basic") { const cp = r.clone(); const key = u.origin + u.pathname; caches.open(CACHE).then(c => c.put(key, cp)); } return r; }).catch(() => caches.match(u.origin + u.pathname).then(m => m || caches.match(e.request))));
});
self.addEventListener("message", e => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });
