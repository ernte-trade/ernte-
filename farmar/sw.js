// Jednoduchý service worker: aplikácia sa otvorí aj pri slabom signáli.
// Dáta (ceny, obchody) sa vždy berú živo z databázy, necachujú sa.
const CACHE = "ernte-v181";
const ASSETS = "ernte-assets-1"; // verziované súbory (?v=) a obrázky – prežijú nasadenie, nesťahujú sa znova
// VŠETKO DO TELEFÓNU: po inštalácii / aktualizácii si telefón potichu stiahne všetky súbory aplikácie
// (skripty a štýly z index.html, písma, fotky, knižnice), aby nič nečakalo na sieť. Údaje z databázy sem nepatria – tie sú vždy živé.
const PRE = ["fonts/geist.woff2", "fonts/geistmono.woff2", "fonts/inter.woff", "fonts/jost.woff", "fonts/plexmono-400.woff", "fonts/plexmono-500.woff", "fonts/plexmono-600.woff", "fonts/sora.woff", "fonts/unbounded.woff", "img/ceo-uvod.jpg", "img/com/cirok.jpg", "img/com/ho.jpg", "img/com/jacmen_k.jpg", "img/com/jacmen_s.jpg", "img/com/kukurica.jpg", "img/com/lo.jpg", "img/com/psenica_k.jpg", "img/com/psenica_p.jpg", "img/com/repka.jpg", "img/com/soja.jpg", "img/doprava-uvod.jpg", "img/evid-uvod.jpg", "img/farmar-uvod.jpg", "img/iscc.jpg", "img/ja-uvod.jpg", "img/obchod-uvod.jpg", "img/trus-uvod.jpg", "vendor/html2pdf-0.10.1.js", "vendor/mammoth-1.6.0.js", "vendor/supabase-2.45.4.js", "vendor/xlsx-0.18.5.js", "leaflet.js", "logo.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
const SHELL = ["./", "./index.html", "./config.js", "./logo.png", "./icon-192.png", "./icon-512.png", "./manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== ASSETS).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => { precache(); })); });
const OFF = '<meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="background:#05070a;color:#fff;font:16px system-ui;padding:24px"><h3>ERNTE Trade &amp; Logistic</h3><p>Nie je pripojenie k internetu. Skúste to o chvíľu znova.</p><button onclick="location.reload()" style="padding:12px 18px;border-radius:12px">↻ Skúsiť znova</button>';
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // databáza, písma, knižnice idú priamo
  // ROZLOŽENIE ZÁŤAŽE: skripty (?v=…), obrázky, písma a knižnica sa otvoria hneď z pamäte telefónu – bez čakania na server.
  // Novšiu verziu si overí potichu na pozadí (najviac raz za 6 h na súbor; pri zmene ?v= v index.html hneď).
  if (e.request.mode !== "navigate" && (u.searchParams.has("v") || /\.(png|jpe?g|webp|svg|woff2?|ico|css)$|\/vendor\/|\/leaflet\.js$/.test(u.pathname))) {
    const key = u.searchParams.has("v") ? u.href : u.origin + u.pathname;
    e.respondWith(caches.open(ASSETS).then(c => c.match(key).then(m => {
      const net = () => fetch(new Request(e.request, { cache: "no-cache" })).then(r => {
        if (r.ok && r.type === "basic") { r.clone().blob().then(b => { const h = new Headers(r.headers); h.set("x-ernte-at", String(Date.now()));
          c.put(key, new Response(b, { status: r.status, statusText: r.statusText, headers: h }));
          if (key !== u.origin + u.pathname) c.keys().then(ks => ks.forEach(k => { const x = new URL(k.url); if (x.pathname === u.pathname && x.href !== key) c.delete(k); })); }); }
        return r; });
      if (m) { const at = +(m.headers.get("x-ernte-at") || 0); if (Date.now() - at > 6 * 3600e3) e.waitUntil(net().catch(() => {})); return m; }
      return net().catch(() => caches.match(u.origin + u.pathname).then(x => x || Response.error())); })));
    return;
  }
  // vždy overiť u servera (no-cache = rýchla kontrola, či nie je novšia verzia), offline zo zálohy
  // otvorenie aplikácie (navigácia) ide presne tak, ako ho poslal telefón – aj s presmerovaním; ostatné súbory vždy overiť u servera
  let req = e.request;
  if (e.request.mode !== "navigate") { try { req = new Request(e.request, { cache: "no-cache" }); } catch (x) { req = e.request; } }
  e.respondWith(fetch(req).then(r => { if (r.ok && r.type === "basic") { const cp = r.clone(); const key = u.origin + u.pathname; caches.open(CACHE).then(c => c.put(key, cp)); } return r; }).catch(() => caches.match(u.origin + u.pathname).then(m => m || caches.match(e.request)).then(m => m || (e.request.mode === "navigate" ? caches.match(new URL("./", self.registration.scope).href).then(x => x || caches.match(new URL("index.html", self.registration.scope).href)) : undefined)).then(m => m || (e.request.mode === "navigate" ? new Response(OFF, { headers: { "Content-Type": "text/html; charset=utf-8" } }) : Response.error()))));
});
self.addEventListener("message", e => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); if (e.data && e.data.type === "PRECACHE") e.waitUntil(precache()); });
let preBusy = null;
function precache() { if (preBusy) return preBusy; const base = self.registration.scope;
  preBusy = (async () => { try { const c = await caches.open(ASSETS);
    const html = await fetch(new URL("index.html", base).href, { cache: "no-cache" }).then(r => r.ok ? r.text() : "").catch(() => "");
    const keys = new Set(); (html.match(/(?:src|href)="([^"]+\?v=[^"]+)"/g) || []).forEach(m => { const h = m.replace(/^(?:src|href)="|"$/g, ""); if (!/^https?:/.test(h)) keys.add(new URL(h, base).href); });
    PRE.forEach(p => keys.add(new URL(p, base).href));
    const have = new Set((await c.keys()).map(r => r.url)); const todo = [...keys].filter(k => !have.has(k));
    for (let i = 0; i < todo.length; i += 3) await Promise.all(todo.slice(i, i + 3).map(k => fetch(k, { cache: "no-cache" }).then(async r => {
      if (!r.ok || r.type !== "basic") return; const b = await r.blob(); const h = new Headers(r.headers); h.set("x-ernte-at", String(Date.now()));
      await c.put(k, new Response(b, { status: r.status, statusText: r.statusText, headers: h }));
      const u = new URL(k); if (u.search) (await c.keys()).forEach(q => { const x = new URL(q.url); if (x.pathname === u.pathname && x.href !== k) c.delete(q); }); }).catch(() => {})));
  } finally { preBusy = null; } })(); return preBusy; }

// ===== Upozornenia majiteľovi (Web Push) =====
// Rovnaké upozornenie (rovnaký tag alebo text) nahradí predchádzajúce – v lište sa nehromadí 10× to isté.
const hk = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "ERNTE Trade & Logistic", body: e.data ? e.data.text() : "" }; }
  const hi = (+d.prio || 4) >= 5;
  const tag = (d.tag || "ernte") + "-" + hk((d.title || "") + "|" + (d.body || ""));
  // to isté upozornenie, ktoré už v lište je, sa iba ticho obnoví – nepípa znova
  e.waitUntil(self.registration.getNotifications({ tag }).catch(() => []).then(old => self.registration.showNotification(d.title || "ERNTE Trade & Logistic", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag,
    renotify: !(old && old.length), silent: false, requireInteraction: hi, vibrate: hi ? [400, 150, 400, 150, 600] : [250, 100, 250],
    data: { url: d.url || self.registration.scope }, timestamp: Date.now()
  })));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(L => { for (const c of L) { if (c.url.startsWith(self.registration.scope) && "focus" in c) return c.focus(); } return clients.openWindow(url); }));
});
