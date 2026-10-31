// ERNTE Kalkulačka – náhrada runtime Claude artefaktu (window.claude.use) nad Supabase.
// Načítava sa PRED skriptom aplikácie (po config.js a supabase-js UMD).
//
//   db        -> tabuľka kalk_store(path,id,data jsonb) – Firestore-like API
//                (collection/doc/set/update/get/delete/add/orderBy/limit/where/onSnapshot).
//                "Živé" počúvanie = polling každých 20 s (len keď je stránka viditeľná)
//                + okamžité lokálne upozornenie po vlastnom zápise.
//   user      -> id(), me(), canEdit(), isOwner(), profiles(ids)
//   downloads -> save({filename,data|blob|url,mimeType})
//   assets    -> upload(file) -> {url: dataURL} (obrázky zmenšené na max 1600 px, JPEG)
//
// Bez prihlásenia (relácia z hlavnej aplikácie, rovnaký origin) alebo bez práva 'calc'
// sa zobrazí celostránková hláška s odkazom späť na index.html.
(function () {
  "use strict";
  var POLL_MS = 20000, PAGE = 1000, PROFILES = "_profiles";
  var CFG = window.ERNTE_CONFIG || {};
  var sb = null;
  try {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  } catch (e) { sb = null; }

  // ---------- celostránková hláška ----------
  var MSG = {
    nosession: ["Nie si prihlásený", "Kalkulačka používa prihlásenie z aplikácie ERNTE. Prihlás sa tam a potom otvor kalkulačku znova."],
    nostaff: ["Len pre pracovníkov ERNTE", "Tvoj účet nie je v zozname pracovníkov ERNTE. Prihlás sa v aplikácii ERNTE účtom pracovníka."],
    noperm: ["Nemáš prístup ku kalkulačke", "Kalkulačku môžu používať len pracovníci s oprávnením. Požiadaj majiteľa o prístup, alebo sa prihlás v aplikácii ERNTE iným účtom."],
    config: ["Kalkulačka sa nenačítala", "Nepodarilo sa pripojiť k databáze ERNTE. Skontroluj pripojenie na internet a skús to znova z aplikácie ERNTE."]
  };
  function onBody(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }
  function showGate(kind) {
    onBody(function () {
      if (document.getElementById("kalkGate")) return;
      var m = MSG[kind] || MSG.config;
      var st = document.createElement("style");
      st.textContent = "#kalkGate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px 16px;" +
        "background:var(--bg,#0a0f0b);color:var(--ink,#eef3ea);font-family:var(--f-ui,system-ui,sans-serif)}" +
        "#kalkGate .box{max-width:420px;width:100%;background:var(--panel,#131b15);border:1px solid var(--line,#243026);border-radius:18px;padding:24px 20px;text-align:center}" +
        "#kalkGate h2{margin:0 0 8px;font-size:1.15rem}#kalkGate p{margin:0 0 18px;color:var(--muted,#8e9b8f);line-height:1.5;font-size:.95rem}" +
        "#kalkGate a{display:inline-block;padding:11px 18px;border-radius:999px;background:var(--lime,#a9d225);color:var(--lime-ink,#0b1203);font-weight:600;text-decoration:none}" +
        "body.kalk-gated{overflow:hidden}";
      var d = document.createElement("div");
      d.id = "kalkGate"; d.setAttribute("role", "alertdialog"); d.setAttribute("aria-modal", "true");
      d.innerHTML = '<div class="box"><h2></h2><p></p><a href="index.html">Prihlás sa v aplikácii ERNTE</a></div>';
      d.querySelector("h2").textContent = m[0];
      d.querySelector("p").textContent = m[1];
      document.head.appendChild(st);
      document.body.appendChild(d);
      document.body.classList.add("kalk-gated");
    });
    return null;
  }

  // ---------- prihlásenie a oprávnenie ----------
  var CTX = null;
  var ready = (async function () {
    if (!sb) return showGate("config");
    var session;
    try { session = (await sb.auth.getSession()).data.session; } catch (e) { return showGate("config"); }
    if (!session || !session.user) return showGate("nosession");
    var email = String(session.user.email || "").toLowerCase();
    var staff = null;
    try {
      var r = await sb.from("staff").select("email,name,role");
      if (r.error) throw r.error;
      staff = (r.data || []).find(function (s) { return String(s.email || "").toLowerCase() === email; }) || null;
    } catch (e) { return showGate("config"); }
    if (!staff) return showGate("nostaff");
    try {
      var p = await sb.rpc("has_perm", { k: "calc" });
      // ak funkcia ešte neexistuje (chyba), rozhodnú pravidlá tabuľky kalk_store
      if (!p.error && p.data === false) return showGate("noperm");
    } catch (e) {}
    CTX = { uid: session.user.id, email: email, name: staff.name || "", role: staff.role || "" };
    // meno pre "profiles(ids)" – ostatní pracovníci uvidia, kto výpočet uložil
    try {
      await sb.from("kalk_store").upsert({ path: PROFILES, id: CTX.uid, data: { name: CTX.name, email: CTX.email } },
        { onConflict: "path,id" });
    } catch (e) {}
    onBody(function () { var n = document.getElementById("kalkWho"); if (n) n.textContent = CTX.name; });
    return CTX;
  })();
  try {
    sb && sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") showGate("nosession"); });
  } catch (e) {}

  // ---------- pomocné ----------
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function norm(p) { return String(p == null ? "" : p).replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/"); }
  function splitDoc(p) {
    var parts = norm(p).split("/");
    if (parts.length < 2) throw dbErr("invalid-argument", "Neplatná cesta dokumentu: " + p);
    var id = parts.pop();
    return [parts.join("/"), id];
  }
  function dbErr(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function sbErr(e) { var x = new Error((e && e.message) || "db error"); x.code = (e && e.code) || "unavailable"; x.cause = e; return x; }
  function newId() {
    var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", s = "", r = new Uint8Array(20);
    crypto.getRandomValues(r); for (var i = 0; i < 20; i++) s += a[r[i] % 62]; return s;
  }
  function getField(o, f) {
    if (!o) return undefined;
    return String(f).split(".").reduce(function (v, k) { return v == null ? undefined : v[k]; }, o);
  }
  function cmp(a, b) {
    if (a === b) return 0;
    if (a === undefined || a === null) return -1;
    if (b === undefined || b === null) return 1;
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a) < String(b) ? -1 : 1;
  }
  function testWhere(v, op, x) {
    switch (op) {
      case "==": return JSON.stringify(v) === JSON.stringify(x);
      case "!=": return JSON.stringify(v) !== JSON.stringify(x);
      case "<": return v != null && cmp(v, x) < 0;
      case "<=": return v != null && cmp(v, x) <= 0;
      case ">": return v != null && cmp(v, x) > 0;
      case ">=": return v != null && cmp(v, x) >= 0;
      case "in": return Array.isArray(x) && x.some(function (y) { return JSON.stringify(y) === JSON.stringify(v); });
      case "not-in": return Array.isArray(x) && !x.some(function (y) { return JSON.stringify(y) === JSON.stringify(v); });
      case "array-contains": return Array.isArray(v) && v.some(function (y) { return JSON.stringify(y) === JSON.stringify(x); });
      case "array-contains-any": return Array.isArray(v) && Array.isArray(x) && v.some(function (y) { return x.some(function (z) { return JSON.stringify(y) === JSON.stringify(z); }); });
      default: return true;
    }
  }

  // ---------- cache a čítanie z kalk_store ----------
  // cache: path -> Map(id -> {data, ts})
  var cache = new Map(), loaded = new Set(), watchers = new Set();

  async function selectAll(build) {
    var out = [], from = 0;
    for (;;) {
      var r = await build().range(from, from + PAGE - 1);
      if (r.error) throw sbErr(r.error);
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < PAGE) return out;
      from += PAGE;
    }
  }
  async function loadPath(path) {
    var rows = await selectAll(function () {
      return sb.from("kalk_store").select("id,data,updated_at").eq("path", path).order("id");
    });
    var m = new Map();
    rows.forEach(function (r) { m.set(r.id, { data: r.data, ts: r.updated_at }); });
    cache.set(path, m); loaded.add(path);
    return m;
  }
  async function ensurePath(path) { return loaded.has(path) ? cache.get(path) : loadPath(path); }

  function docSnap(path, id, entry) {
    var exists = !!entry;
    return {
      id: id, exists: exists, ref: docRef(path + "/" + id), metadata: { hasPendingWrites: false, fromCache: false },
      data: function () { return exists ? clone(entry.data) : undefined; },
      get: function (f) { return exists ? clone(getField(entry.data, f)) : undefined; }
    };
  }
  function querySnap(q) {
    var m = cache.get(q.path) || new Map(), docs = [];
    m.forEach(function (e, id) { docs.push({ id: id, e: e }); });
    q.wh.forEach(function (w) { docs = docs.filter(function (d) { return testWhere(getField(d.e.data, w[0]), w[1], w[2]); }); });
    if (q.ob.length) docs.sort(function (a, b) {
      for (var i = 0; i < q.ob.length; i++) {
        var o = q.ob[i], c = o[0] === "__name__" ? cmp(a.id, b.id) : cmp(getField(a.e.data, o[0]), getField(b.e.data, o[0]));
        if (c) return o[1] === "desc" ? -c : c;
      }
      return 0;
    });
    if (q.lim != null) docs = docs.slice(0, q.lim);
    var snaps = docs.map(function (d) { return docSnap(q.path, d.id, d.e); });
    return { docs: snaps, size: snaps.length, empty: !snaps.length, query: q,
      forEach: function (fn, t) { snaps.forEach(fn, t); },
      docChanges: function () { return snaps.map(function (s, i) { return { type: "added", doc: s, oldIndex: -1, newIndex: i }; }); } };
  }
  function sigOf(w) {
    var m = cache.get(w.path) || new Map();
    if (w.id != null) { var e = m.get(w.id); return e ? String(e.ts) : "-"; }
    var s = []; m.forEach(function (e, id) { s.push(id + "@" + e.ts); }); return s.join("|");
  }
  function fire(w, force) {
    if (!w.active) return;
    var sig = sigOf(w);
    if (!force && sig === w.sig) return;
    w.sig = sig;
    try {
      w.next(w.id != null ? docSnap(w.path, w.id, (cache.get(w.path) || new Map()).get(w.id)) : querySnap(w.q));
    } catch (e) { setTimeout(function () { throw e; }); }
  }
  function notify(path) { watchers.forEach(function (w) { if (w.path === path) fire(w); }); }

  // ---------- polling ----------
  var pollTimer = null, polling = false;
  async function poll() {
    if (polling || !watchers.size || document.hidden) return;
    polling = true;
    try {
      var paths = Array.from(new Set(Array.from(watchers).map(function (w) { return w.path; })));
      var rows = await selectAll(function () {
        return sb.from("kalk_store").select("path,id,updated_at").in("path", paths).order("path").order("id");
      });
      var byPath = new Map(); paths.forEach(function (p) { byPath.set(p, new Map()); });
      rows.forEach(function (r) { byPath.get(r.path) && byPath.get(r.path).set(r.id, r.updated_at); });
      for (var i = 0; i < paths.length; i++) {
        var p = paths[i], remote = byPath.get(p), local = cache.get(p) || new Map(), changed = [], dirty = false;
        remote.forEach(function (ts, id) { var e = local.get(id); if (!e || String(e.ts) !== String(ts)) changed.push(id); });
        local.forEach(function (e, id) { if (!remote.has(id)) { local.delete(id); dirty = true; } });
        for (var j = 0; j < changed.length; j += 100) {
          var part = changed.slice(j, j + 100);
          var r = await sb.from("kalk_store").select("id,data,updated_at").eq("path", p).in("id", part);
          if (r.error) throw sbErr(r.error);
          (r.data || []).forEach(function (x) { local.set(x.id, { data: x.data, ts: x.updated_at }); });
          dirty = true;
        }
        cache.set(p, local); loaded.add(p);
        if (dirty) notify(p);
      }
    } catch (e) { /* sieť / dočasná chyba – skúsi sa pri ďalšom kole */ }
    finally { polling = false; }
  }
  function startPolling() { if (!pollTimer) pollTimer = setInterval(poll, POLL_MS); }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
  window.addEventListener("online", function () { poll(); });

  function listen(path, id, q, next, err) {
    if (typeof next === "object" && next) { err = next.error; next = next.next; }
    var w = { path: path, id: id, q: q, next: next || function () {}, err: err, active: true, sig: null };
    watchers.add(w);
    ensurePath(path).then(function () { fire(w, true); startPolling(); }, function (e) {
      watchers.delete(w); w.active = false;
      if (typeof w.err === "function") { try { w.err(e); } catch (x) {} }
    });
    return function unsubscribe() { w.active = false; watchers.delete(w); };
  }

  // ---------- zápisy ----------
  async function writeDoc(path, id, data) {
    var clean = clone(data == null ? {} : data);
    var r = await sb.from("kalk_store").upsert({ path: path, id: id, data: clean }, { onConflict: "path,id" })
      .select("updated_at").single();
    if (r.error) throw sbErr(r.error);
    if (!cache.has(path)) { if (watchersOn(path)) await loadPath(path).catch(function () {}); else return; }
    (cache.get(path) || new Map()).set(id, { data: clean, ts: r.data ? r.data.updated_at : Date.now() });
    notify(path);
  }
  function watchersOn(path) { var f = false; watchers.forEach(function (w) { if (w.path === path) f = true; }); return f; }
  async function readDoc(path, id) {
    var r = await sb.from("kalk_store").select("data,updated_at").eq("path", path).eq("id", id).maybeSingle();
    if (r.error) throw sbErr(r.error);
    return r.data ? { data: r.data.data, ts: r.data.updated_at } : null;
  }
  function deepMerge(a, b) {
    if (!a || typeof a !== "object" || Array.isArray(a) || !b || typeof b !== "object" || Array.isArray(b)) return clone(b);
    var o = clone(a);
    Object.keys(b).forEach(function (k) { o[k] = (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) ? deepMerge(o[k], b[k]) : clone(b[k]); });
    return o;
  }

  // ---------- referencie (Firestore-like) ----------
  function docRef(full) {
    var pi = splitDoc(full), path = pi[0], id = pi[1];
    return {
      id: id, path: path + "/" + id, parent: path,
      collection: function (sub) { return collRef(path + "/" + id + "/" + norm(sub)); },
      get: async function () { var e = await readDoc(path, id); return docSnap(path, id, e); },
      set: async function (data, opts) {
        if (opts && (opts.merge || opts.mergeFields)) { var cur = await readDoc(path, id); data = deepMerge(cur ? cur.data : {}, data); }
        await writeDoc(path, id, data);
      },
      update: async function (data) {
        var cur = await readDoc(path, id);
        if (!cur) throw dbErr("not-found", "Dokument neexistuje: " + path + "/" + id);
        var o = clone(cur.data) || {};
        Object.keys(data || {}).forEach(function (k) {
          if (k.indexOf(".") < 0) { o[k] = clone(data[k]); return; }
          var ks = k.split("."), t = o; for (var i = 0; i < ks.length - 1; i++) { if (!t[ks[i]] || typeof t[ks[i]] !== "object") t[ks[i]] = {}; t = t[ks[i]]; }
          t[ks[ks.length - 1]] = clone(data[k]);
        });
        await writeDoc(path, id, o);
      },
      delete: async function () {
        var r = await sb.from("kalk_store").delete().eq("path", path).eq("id", id);
        if (r.error) throw sbErr(r.error);
        var m = cache.get(path); if (m && m.delete(id)) notify(path);
      },
      onSnapshot: function (next, err) { return listen(path, id, null, next, err); }
    };
  }
  function query(path, wh, ob, lim) {
    var q = { path: path, wh: wh, ob: ob, lim: lim };
    q.where = function (f, op, v) { return query(path, wh.concat([[f, op, v]]), ob, lim); };
    q.orderBy = function (f, dir) { return query(path, wh, ob.concat([[f, dir === "desc" ? "desc" : "asc"]]), lim); };
    q.limit = function (n) { return query(path, wh, ob, n); };
    q.get = async function () { await loadPath(path); return querySnap(q); };
    q.onSnapshot = function (next, err) { return listen(path, null, q, next, err); };
    return q;
  }
  function collRef(p) {
    var path = norm(p), q = query(path, [], [], null);
    q.id = path.split("/").pop();
    q.doc = function (id) { return docRef(path + "/" + (id == null ? newId() : String(id))); };
    q.add = async function (data) { var r = q.doc(); await r.set(data); return r; };
    return q;
  }

  var dbApi = {
    collection: function (p) { return collRef(p); },
    doc: function (p) { return docRef(p); }
  };

  // ---------- user ----------
  var userApi = {
    id: async function () { return CTX && CTX.uid; },
    me: async function () { return CTX ? { id: CTX.uid, name: CTX.name, email: CTX.email, role: CTX.role } : null; },
    canEdit: async function () { return !!CTX && CTX.role === "owner"; },
    isOwner: async function () { return !!CTX && CTX.role === "owner"; },
    profiles: async function (ids) {
      var out = {}; ids = Array.from(new Set((ids || []).filter(Boolean).map(String)));
      if (!ids.length) return out;
      try {
        for (var i = 0; i < ids.length; i += 100) {
          var r = await sb.from("kalk_store").select("id,data").eq("path", PROFILES).in("id", ids.slice(i, i + 100));
          if (r.error) throw r.error;
          (r.data || []).forEach(function (x) { out[x.id] = { name: (x.data && x.data.name) || "" }; });
        }
      } catch (e) {}
      if (CTX && ids.indexOf(CTX.uid) >= 0) out[CTX.uid] = { name: CTX.name };
      return out;
    }
  };

  // ---------- downloads ----------
  async function toBlob(o) {
    var d = o.data != null ? o.data : (o.blob != null ? o.blob : (o.content != null ? o.content : o.url));
    var type = o.mimeType || o.type || o.contentType || "";
    if (d instanceof Blob) return d;
    if (d instanceof ArrayBuffer || ArrayBuffer.isView(d)) return new Blob([d], { type: type || "application/octet-stream" });
    if (typeof d === "string") {
      if (/^(data:|blob:)/.test(d)) return await (await fetch(d)).blob();
      return new Blob([d], { type: type || "text/plain;charset=utf-8" });
    }
    return new Blob([JSON.stringify(d, null, 2)], { type: type || "application/json" });
  }
  var downloadsApi = {
    save: async function (o) {
      o = o || {};
      var blob = await toBlob(o), url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = o.filename || o.name || "subor"; a.rel = "noopener"; a.style.display = "none";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      return { status: "saved", filename: a.download };
    }
  };

  // ---------- assets ----------
  function readDataUrl(b) {
    return new Promise(function (ok, ko) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { ko(fr.error); }; fr.readAsDataURL(b); });
  }
  async function shrink(file, max) {
    var url = URL.createObjectURL(file);
    try {
      var img = await new Promise(function (ok, ko) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = ko; im.src = url; });
      var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.85);
    } finally { URL.revokeObjectURL(url); }
  }
  var assetsApi = {
    upload: async function (file) {
      if (!file) throw dbErr("invalid-argument", "Chýba súbor");
      var type = file.type || "", url;
      if (/^image\//.test(type) && !/svg|gif/.test(type)) {
        try { url = await shrink(file, 1600); } catch (e) { url = await readDataUrl(file); }
      } else url = await readDataUrl(file);
      return { url: url, id: newId(), name: file.name || "", type: /^data:image\/jpeg/.test(url) ? "image/jpeg" : type, size: url.length };
    }
  };

  var APIS = { db: dbApi, user: userApi, downloads: downloadsApi, assets: assetsApi };
  window.claude = {
    use: async function (name) {
      var c = await ready;
      if (!c) return null;
      return APIS[name] || null;
    }
  };
  window.ERNTE_KALK = { ready: ready, supabase: sb, poll: poll };
})();
