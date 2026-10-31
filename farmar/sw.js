// Jednoduchý service worker: aplikácia sa otvorí aj pri slabom signáli.
// Dáta (ceny, obchody) sa vždy berú živo z databázy, necachujú sa.
const CACHE = "ernte-v325";
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

// ===== Upozornenia majiteľovi (Web Push) =====
// Rovnaké upozornenie (rovnaký tag alebo text) nahradí predchádzajúce – v lište sa nehromadí 10× to isté.
const hk = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "ERNTE Trade & Logistic", body: e.data ? e.data.text() : "" }; }
  const hi = (+d.prio || 4) >= 5 || !!d.ri, lo = (+d.prio || 4) <= 2, ack = /\/ack\//.test(d.url || "") || !!d.ack;
  // odznak s počtom nových alarmov na ikone aplikácie
  if (d.badge != null && self.navigator && self.navigator.setAppBadge) { try { +d.badge ? self.navigator.setAppBadge(+d.badge) : self.navigator.clearAppBadge(); } catch (x) { } }
  const tag = (d.tag || "ernte") + "-" + hk((d.title || "") + "|" + (d.body || ""));
  // to isté upozornenie, ktoré už v lište je, sa iba ticho obnoví – nepípa znova
  e.waitUntil(self.registration.getNotifications({ tag }).catch(() => []).then(old => self.registration.showNotification(d.title || "ERNTE Trade & Logistic", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag,
    renotify: !lo && !(old && old.length), silent: lo, requireInteraction: hi, vibrate: lo ? undefined : hi ? [400, 150, 400, 150, 600] : [250, 100, 250],
    actions: (ack ? [{ action: "ack", title: "✓ Beriem na vedomie" }] : []).concat(d.tel ? [{ action: "tel", title: "📞 Zavolať" }] : []),
    data: { url: d.url || self.registration.scope, ack: d.ack || null, tel: d.tel || null }, timestamp: Date.now()
  })));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const D = e.notification.data || {}, url = D.url || self.registration.scope;
  // „Beriem na vedomie“ priamo z upozornenia (pripomienka z kalendára) – bez otvárania aplikácie
  if (e.action === "ack" && D.ack && D.ack.u) { e.waitUntil(fetch(D.ack.u, { method: "POST", headers: { apikey: D.ack.k, Authorization: "Bearer " + D.ack.k, "Content-Type": "application/json" }, body: JSON.stringify(D.ack.b || {}) }).catch(() => { })); return; }
  if (e.action === "tel" && D.tel) { e.waitUntil(clients.openWindow("tel:" + D.tel)); return; }
  // otvorená aplikácia dostane adresu (napr. #cennik → Cenník) a zaostrí sa; inak sa otvorí nové okno priamo s ňou
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(L => { for (const c of L) { if (c.url.startsWith(self.registration.scope) && "focus" in c) { try { c.postMessage({ type: "ernte-open", url }); } catch (x) { } return c.focus(); } } return clients.openWindow(url); }));
});
