// Jednoduchý service worker: aplikácia sa otvorí aj pri slabom signáli.
// Dáta (ceny, obchody) sa vždy berú živo z databázy, necachujú sa.
const CACHE = "ernte-v123";
const SHELL = ["./", "./index.html", "./config.js", "./logo.png", "./icon-192.png", "./icon-512.png", "./manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const OFF = '<meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="background:#05070a;color:#fff;font:16px system-ui;padding:24px"><h3>ERNTE Trade &amp; Logistic</h3><p>Nie je pripojenie k internetu. Skúste to o chvíľu znova.</p><button onclick="location.reload()" style="padding:12px 18px;border-radius:12px">↻ Skúsiť znova</button>';
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // databáza, písma, knižnice idú priamo
  // vždy overiť u servera (no-cache = rýchla kontrola, či nie je novšia verzia), offline zo zálohy
  // otvorenie aplikácie (navigácia) ide presne tak, ako ho poslal telefón – aj s presmerovaním; ostatné súbory vždy overiť u servera
  let req = e.request;
  if (e.request.mode !== "navigate") { try { req = new Request(e.request, { cache: "no-cache" }); } catch (x) { req = e.request; } }
  e.respondWith(fetch(req).then(r => { if (r.ok && r.type === "basic") { const cp = r.clone(); const key = u.origin + u.pathname; caches.open(CACHE).then(c => c.put(key, cp)); } return r; }).catch(() => caches.match(u.origin + u.pathname).then(m => m || caches.match(e.request)).then(m => m || (e.request.mode === "navigate" ? caches.match(new URL("./", self.registration.scope).href).then(x => x || caches.match(new URL("index.html", self.registration.scope).href)) : undefined)).then(m => m || (e.request.mode === "navigate" ? new Response(OFF, { headers: { "Content-Type": "text/html; charset=utf-8" } }) : Response.error()))));
});
self.addEventListener("message", e => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });
