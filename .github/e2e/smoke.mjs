// 🚦 BRÁNA PRED ZVEREJNENÍM – automatická kontrola novej verzie (main) skôr, než ju dostanú všetci.
// Spustí aplikáciu z priečinka farmar/ s náhradnou databázou (mock-sb.js, vymyslené údaje), prihlási sa ako
// majiteľ, obchodník, doprava, farmár a na šírkach 344 / 390 / 412 / 690 / 900 px prejde všetky záložky.
// Zlyhá (exit 1), ak: chyba skriptu, aplikácia sa nenačíta (ostane „Načítavam…“ / prázdna), stránka je širšia ako displej.
// Použitie: node smoke.mjs <cesta k farmar/>   (výsledok: out-smoke/result.json + snímky pri chybe)
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import { chromium } from "playwright";
const ROOT = path.resolve(process.argv[2] || "../../farmar");
const OUT = "out-smoke"; fs.mkdirSync(OUT, { recursive: true });
const MOCK = fs.readFileSync(new URL("./mock-sb.js", import.meta.url), "utf8");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".mp4": "video/mp4" };
// /beta/… = ten istý priečinok (majiteľa aplikácia presmeruje do novej verzie)
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split("?")[0]).replace(/^\/beta(\/|$)/, "/"); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end(); return; }
  s.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(s);
}).listen(0); const PORT = srv.address().port, BASE = `http://127.0.0.1:${PORT}/`;

const P = (...k) => Object.fromEntries(k.map(x => [x, true]));
const ROLES = [
  { id: "majitel", role: { kind: "staff", staff: { email: "ernte@ernte.sk", name: "Majiteľ Test", role: "owner", perms: {}, must_change: false } } },
  { id: "obchodnik", role: { kind: "staff", staff: { email: "obchod@example.com", name: "Obchodník Test", role: "staff", perms: P("req", "price_view", "deals", "deals_qty", "farm", "market", "wx"), must_change: false } } },
  { id: "doprava", role: { kind: "staff", staff: { email: "doprava@example.com", name: "Doprava Test", role: "dispatch", perms: P("trans", "assign", "fleet", "wx"), must_change: false } } },
  { id: "farmar", role: { kind: "farmer" } },
  { id: "obchodna_firma", role: { kind: "farmer", trader: true } },
];
const WIDTHS = [344, 390, 412, 690, 900, 1440];
const SHOTS = process.env.SHOTS || ""; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
// šum, ktorý nie je chyba aplikácie (externé služby sú v teste zablokované)
const NOISE = /ResizeObserver loop|Failed to fetch|NetworkError|Load failed|net::ERR|AbortError|The operation was aborted|Script error\.?$|serviceWorker|ServiceWorker|play\(\) request|NotAllowedError|Notification|geolocation|Permission/i;

const R = { at: new Date().toISOString(), ok: true, fails: [], warns: [], runs: [], load: [] };
const b = await chromium.launch();
// roly bežia súbežne (rýchlejšie), šírky v rámci roly po sebe
await Promise.all(ROLES.map(async r => { for (const w of WIDTHS) {
  const run = { role: r.id, w, errors: [], tabs: [], overflow: [], load_ms: null }; R.runs.push(run);
  const ctx = await b.newContext({ viewport: { width: w, height: w >= 1200 ? 900 : w === 390 ? 844 : 860 }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700, locale: "sk-SK", timezoneId: "Europe/Bratislava", serviceWorkers: "block" });
  await ctx.route("**/*", async rt => {
    const u = rt.request().url();
    if (/vendor\/supabase-[\d.]+\.js/.test(u)) return rt.fulfill({ body: `window.__ROLE=${JSON.stringify(r.role)};` + MOCK, contentType: "text/javascript" });
    if (u.startsWith(BASE)) return rt.continue();
    if (/raw\.githubusercontent\.com\/.*market\.json/.test(u)) return rt.fulfill({ body: fs.readFileSync(path.join(ROOT, "market.json")), contentType: "application/json" });
    return rt.abort();
  });
  await ctx.addInitScript(() => { try { localStorage.setItem("ernte-inst", "1"); sessionStorage.setItem("ernte-welcome-skip", "1"); } catch (e) {} window.confirm = () => true; window.alert = () => {}; window.prompt = () => null; });
  const pg = await ctx.newPage();
  pg.on("console", m => { if (m.type() === "error") { const t = m.text(); if (!NOISE.test(t) && !/Failed to load resource/.test(t)) R.warns.push(`${r.id} ${w}px: konzola – ${t.slice(0, 160)}`); } });
  pg.on("pageerror", e => { const m = String(e.message || e); if (!NOISE.test(m)) run.errors.push(m.slice(0, 240)); });
  const fail = async (what) => { R.ok = false; R.fails.push(`${r.id} ${w}px: ${what}`); try { await pg.screenshot({ path: `${OUT}/${r.id}-${w}-${R.fails.length}.jpg`, type: "jpeg", quality: 50 }); } catch (e) {} };
  try {
    const t0 = Date.now();
    await pg.goto(BASE + "index.html", { waitUntil: "load", timeout: 45000 });
    // čas načítania: kým #app ukáže obsah (nie „Načítavam…“)
    for (let i = 0; i < 150; i++) { const ok = await pg.evaluate(() => { const a = document.getElementById("app"); const t = (a && a.innerText || "").trim(); return t.length > 40 && !/^Načítavam/.test(t); }).catch(() => false); if (ok) { run.load_ms = Date.now() - t0; break; } await pg.waitForTimeout(100); }
    if (run.load_ms != null) { R.load.push(run.load_ms); if (run.load_ms > 3000) R.warns.push(`${r.id} ${w}px: načítanie ${(run.load_ms / 1000).toFixed(1).replace(".", ",")} s (nad 3 s)`); }
    await pg.waitForTimeout(Math.max(0, 4000 - (Date.now() - t0)));
    // zavrieť úvod LIVE, ak sa ukázal
    await pg.evaluate(() => { const g = [...document.querySelectorAll("button,a")].find(x => /Poďme na to|Hlavná ponuka|Hlavné menu/.test(x.innerText || "")); g && g.click(); });
    await pg.waitForTimeout(800);
    const st = await pg.evaluate(() => { const a = document.getElementById("app"); const t = (a && a.innerText || "").trim(); return { len: t.length, loading: /^Načítavam/.test(t) || (t.length < 400 && /Načítavam/.test(t)), login: !!document.querySelector("#app input[type=email]") && !document.querySelector("[data-tab],[data-ftile],[data-fsec]") }; });
    if (st.len < 40 || st.loading) await fail(`aplikácia sa nenačítala (${st.loading ? "Načítavam…" : "prázdna"})`);
    if (st.login) await fail("ukázalo prihlásenie namiesto aplikácie");
    if (SHOTS) { try { await pg.screenshot({ path: `${SHOTS}/${r.id}-${w}.png` }); } catch (e) {} }
    const tabs = await pg.evaluate(() => [...new Set([...document.querySelectorAll("[data-tab]")].map(x => x.dataset.tab))]);
    for (const t of [null, ...tabs.slice(0, 30)]) {
      if (t) { await pg.evaluate(t => { const e = document.querySelector(`[data-tab="${t}"]`); e && e.click(); }, t); await pg.waitForTimeout(900); }
      const ov = await pg.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
      run.tabs.push(t || "start");
      // farmár nesmie vidieť technické hodnoty; prázdne tabuľky = upozornenie
      const bad = await pg.evaluate(fm => { const a = document.getElementById("app"); const tx = a ? a.innerText : ""; const m = fm ? tx.match(/(^|[\s:(>])(undefined|NaN|null|nezadané)(?=$|[\s,.)<])/) : tx.match(/(^|[\s:(>])(undefined|NaN)(?=$|[\s,.)<])/);
        const empty = [...document.querySelectorAll("#app table")].filter(tb => tb.offsetParent && !tb.querySelector("tbody tr, tr td")).length; return { m: m ? m[2] : null, empty }; }, r.id === "farmar");
      if (bad.m) await fail(`viditeľný text „${bad.m}“ (záložka ${t || "start"})`);
      if (bad.empty) R.warns.push(`${r.id} ${w}px: prázdna tabuľka (${bad.empty}) na záložke ${t || "start"}`);
      if (ov > 2) { run.overflow.push(`${t || "start"} +${ov}px`); await fail(`stránka širšia ako displej o ${ov}px (záložka ${t || "start"})`); }
    }
    // farmár: veľké dlaždice (Predať, Zmluvy, …) – každú otvoriť a vrátiť sa domov
    const fv = await pg.evaluate(() => [...new Set([...document.querySelectorAll("[data-fv]")].map(x => x.dataset.fv))]);
    for (const v of fv.slice(0, 20)) {
      await pg.evaluate(v => { const e = document.querySelector(`[data-fv="${v}"]`); e && e.click(); }, v); await pg.waitForTimeout(900);
      const ov = await pg.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
      run.tabs.push("f:" + v);
      if (ov > 2) { run.overflow.push(`f:${v} +${ov}px`); await fail(`stránka širšia ako displej o ${ov}px (dlaždica ${v})`); }
      await pg.evaluate(() => { const h = document.querySelector("[data-fvhome]"); h && h.click(); }); await pg.waitForTimeout(500);
    }
    // 6. 11.: slučka v rozložení (moduly si prehadzujú pásy pod lištou → obrazovka skáče, nedá sa vyrolovať hore) – strážca v index.html
    const lp = await pg.evaluate(() => window.ERNTE_LOOP || []).catch(() => []);
    if (lp.length) await fail("slučka v rozložení (obrazovka skáče): " + lp.join(", "));
  } catch (e) { await fail("beh: " + String(e.message || e).slice(0, 200)); }
  if (run.errors.length) { R.ok = false; R.fails.push(`${r.id} ${w}px: chyba skriptu – ${run.errors[0]}`); }
  await ctx.close();
} }));
await b.close(); srv.close();
R.warns = [...new Set(R.warns)].slice(0, 60);
R.load_avg = R.load.length ? Math.round(R.load.reduce((a, b) => a + b, 0) / R.load.length) : null; R.load_max = R.load.length ? Math.max(...R.load) : null; delete R.load;
fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(R, null, 1));
const uniq = [...new Set(R.fails)];
console.log(R.ok ? `✅ Brána: všetko v poriadku (${R.runs.length} behov)` : `❌ Brána zastavila zverejnenie:\n- ` + uniq.slice(0, 40).join("\n- "));
process.exit(R.ok ? 0 : 1);
