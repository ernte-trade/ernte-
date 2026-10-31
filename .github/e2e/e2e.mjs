// Prejde živú aplikáciu ako testovací farmár, obchodník a dopravca na viacerých zariadeniach:
// iPhone a iPad (Safari – WebKit), Android mobil a tablet (Chrome), PC Chrome / Edge, Firefox, Safari (Mac).
// Na každej záložke: snímka, chyby, vodorovné pretečenie, malé tlačidlá, drobné písmo, iOS zoom pri písaní.
// Nič neodosiela – iba ťuká na záložky. Do logu nevypisuje údaje ani heslá.
import fs from "node:fs";
import { chromium, webkit, firefox, devices } from "playwright";
const cfg = fs.readFileSync("../../farmar/config.js", "utf8");
const URL_ = cfg.match(/SUPABASE_URL:\s*"([^"]+)"/)[1], KEY = cfg.match(/SUPABASE_KEY:\s*"([^"]+)"/)[1];
const APP = "https://ernte-trade.github.io/ernte-/farmar/";
fs.mkdirSync("out", { recursive: true });
const R = { at: new Date().toISOString(), runs: [] };
const save = () => fs.writeFileSync("out/result.json", JSON.stringify(R, null, 1));
const r = await fetch(`${URL_}/rest/v1/rpc/test_creds_take`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_token: process.env.E2E_TOKEN || "" }) });
const creds = r.ok ? await r.json() : null;
if (!Array.isArray(creds)) { R.err = "token neplatný alebo databáza nedostupná (" + r.status + ")"; save(); console.log("bez prístupu"); process.exit(0); }

const DEV = [
  { id: "iphone", name: "iPhone 13 · Safari", eng: webkit, opt: devices["iPhone 13"], touch: true, ios: true, full: true },
  { id: "ipad", name: "iPad · Safari", eng: webkit, opt: devices["iPad (gen 7)"], touch: true, ios: true },
  { id: "android", name: "Android mobil · Chrome", eng: chromium, opt: devices["Pixel 7"], touch: true, full: true },
  { id: "atablet", name: "Android tablet · Chrome", eng: chromium, opt: devices["Galaxy Tab S4"], touch: true },
  { id: "pc", name: "PC · Chrome / Edge 1366×768", eng: chromium, opt: { viewport: { width: 1366, height: 768 } } },
  { id: "pcff", name: "PC · Firefox 1920×1080", eng: firefox, opt: { viewport: { width: 1920, height: 1080 } } },
  { id: "mac", name: "Mac · Safari 1440×900", eng: webkit, opt: { viewport: { width: 1440, height: 900 } } },
];
const ONLY = (process.env.E2E_DEV || "").split(",").filter(Boolean);

// meranie rozloženia priamo v stránke
function measure(a) {
  const W = innerWidth, out = { overflow: Math.max(0, document.documentElement.scrollWidth - W), wide: [], small: [], tiny: 0, tinyS: [], izoom: [] };
  const vis = e => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const scroller = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
  const desc = e => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.classList.length ? "." + [...e.classList].slice(0, 2).join(".") : "") + " „" + (e.innerText || e.value || e.placeholder || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40) + "“");
  const all = document.querySelectorAll("#app *, body > *:not(script):not(style)");
  for (const e of all) {
    if (out.wide.length >= 8) break;
    const r = e.getBoundingClientRect(); if (r.right > W + 2 && r.width > 0 && vis(e) && !scroller(e)) { const p = e.parentElement; const pr = p && p.getBoundingClientRect(); if (!pr || pr.right <= W + 2) out.wide.push(desc(e) + " " + Math.round(r.right - W) + "px"); }
  }
  if (a.touch) for (const e of document.querySelectorAll("#app button, #app a[href], #app [data-tab], #app select, #app input:not([type=hidden]):not([type=checkbox]):not([type=radio]), #app [role=button]")) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > 20000) continue;
    if ((r.height < 30 || r.width < 30) && out.small.length < 400) out.small.push(desc(e) + " " + Math.round(r.width) + "×" + Math.round(r.height));
  }
  const tw = document.createTreeWalker(document.getElementById("app") || document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim()) continue; const e = n.parentElement; if (!e || seen.has(e)) continue; seen.add(e); if (!vis(e)) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11) { out.tiny++; if (out.tinyS.length < 6) out.tinyS.push(desc(e) + " " + fs + "px"); } }
  if (a.ios) for (const e of document.querySelectorAll("#app input:not([type=checkbox]):not([type=radio]):not([type=hidden]), #app textarea, #app select")) { if (vis(e) && parseFloat(getComputedStyle(e).fontSize) < 16 && out.izoom.length < 6) out.izoom.push(desc(e) + " " + getComputedStyle(e).fontSize); }
  out.smallN = out.small.length; out.small = out.small.slice(0, 8);
  return out;
}

const browsers = {};
for (const d of DEV) {
  if (ONLY.length && !ONLY.includes(d.id)) continue;
  const key = d.eng.name();
  if (!browsers[key]) browsers[key] = await d.eng.launch();
  for (const c of creds) {
    const run = { dev: d.id, devName: d.name, kind: c.kind, name: c.name, errors: [], http: [], tabs: [] }; R.runs.push(run);
    const ctx = await browsers[key].newContext({ ...d.opt, locale: "sk-SK", timezoneId: "Europe/Bratislava" });
    const pg = await ctx.newPage();
    await pg.addInitScript(() => { try { sessionStorage.setItem("ernte-welcome-skip", "1"); } catch (x) {} });
    pg.on("pageerror", e => run.errors.push("JS: " + String(e.message || e).slice(0, 300)));
    pg.on("console", m => { if (m.type() === "error" && !/favicon|__cf_bm|ERR_ABORTED|net::ERR_FAILED|Failed to load resource: the server responded with a status of 404 \(\)/.test(m.text())) run.errors.push("console: " + m.text().slice(0, 300)); });
    pg.on("response", res => { const u = res.url(); if (res.status() >= 400 && /supabase\.co/.test(u)) run.http.push(res.status() + " " + u.replace(/\?.*/, "").replace(/^https:\/\/[^/]+/, "").slice(0, 140)); });
    const pre = `${d.id}-${c.kind}`;
    if (c.kind === "viewas") {
      // 👁 prepínač majiteľa: náhľad testovacieho farmára cez jednorazový token (iba raz – token sa po použití mení)
      if (R.viewasDone) { run.skip = true; await ctx.close(); continue; }
      R.viewasDone = true;
      try {
        await pg.addInitScript(cr => { try { if (!sessionStorage.getItem("ernte-viewas")) sessionStorage.setItem("ernte-viewas-cred", cr); } catch (x) {} }, JSON.stringify({ rt: c.rt, name: c.name, email: c.login }));
        run.auth = [];
        pg.on("response", async res => { if (/\/auth\/v1\//.test(res.url())) { let b = ""; try { b = (await res.text()).replace(/"(access_token|refresh_token|provider_token)":"[^"]*"/g, '"$1":"…"').slice(0, 300); } catch (x) {} run.auth.push(res.request().method() + " " + res.status() + " " + res.url().replace(/^https:\/\/[^/]+/, "").replace(/\?.*$/, "") + " " + b); } });
        await pg.goto(APP + "?viewas=1", { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(8000);
        run.banner = await pg.$eval(".vabar", b => b.innerText.replace(/\s+/g, " ")).catch(() => null);
        run.farmerText = await pg.$eval("#app", a => a.innerText.replace(/\s+/g, " ").slice(0, 600)).catch(() => null);
        run.tabList = await pg.$$eval("nav.tabs [data-tab]", L => L.map(b => b.dataset.tab));
        run.writeTest = await pg.evaluate(async () => { try { const r = await sb.from("app_feedback").insert({ question: "viewas test" }); return r.error ? (r.error.code || r.error.message) : "PREŠLO"; } catch (x) { return "chyba " + x.message; } });
        await pg.screenshot({ path: `out/${pre}-00-start.jpg`, fullPage: !!d.full, quality: 50, type: "jpeg" });
      } catch (x) { run.errors.push("beh: " + String(x.message || x).slice(0, 300)); }
      await ctx.close(); save(); continue;
    }
    try {
      await pg.goto(APP, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(2500);
      run.login = await pg.evaluate(measure, { touch: !!d.touch, ios: !!d.ios }).catch(() => null);
      await pg.fill("input[name=email]", c.login); await pg.fill("input[name=pw]", c.pw);
      await pg.click("form button[type=submit]"); await pg.waitForTimeout(7000);
      if (await pg.$(".pinmod")) run.errors.push("PIN okno sa zobrazilo");
      run.install = await pg.evaluate(() => { const c = document.querySelector(".instc"); if (!c) return null; c.querySelector("[data-inst]").click(); return true; });
      if (run.install) { await pg.waitForTimeout(600); run.installHelp = await pg.$eval(".instc", c => c.innerText.replace(/\s+/g, " ").slice(0, 400)).catch(() => null); }
      run.pwa = await pg.evaluate(async () => ({ sw: !!(navigator.serviceWorker && await navigator.serviceWorker.getRegistration()), manifest: !!document.querySelector("link[rel=manifest]"), push: "PushManager" in window, notif: "Notification" in window }));
      await pg.evaluate(() => { const b = document.querySelector("[data-instx]"); if (b) b.click(); });
      await pg.waitForTimeout(600);
      await pg.screenshot({ path: `out/${pre}-00-start.jpg`, fullPage: !!d.full, quality: 50, type: "jpeg" });
      run.start = await pg.evaluate(measure, { touch: !!d.touch, ios: !!d.ios });
      const tabs = await pg.$$eval("nav.tabs [data-tab]", L => L.map(b => [b.dataset.tab, b.textContent.trim().replace(/\s+/g, " ")]));
      run.tabList = tabs;
      // 📅 Stretnutie: otvorí okno a spočíta ponúknuté voľné termíny (nič neodošle)
      if (await pg.$("[data-mtopen]")) { await pg.click("[data-mtopen]").catch(() => {}); await pg.waitForTimeout(4000);
        run.meet = await pg.evaluate(() => ({ slots: document.querySelectorAll(".clu .clsb").length, pref: document.querySelectorAll(".clu .clsb.pref").length, msg: (document.querySelector(".clu .ftsec:last-of-type .s") || {}).textContent || "" }));
        await pg.screenshot({ path: `out/${pre}-00-meet.jpg`, quality: 50, type: "jpeg" }).catch(() => {});
        await pg.evaluate(() => { const b = document.querySelector("[data-mtclose]"); if (b) b.click(); }); await pg.waitForTimeout(400); }
      run.navFits = await pg.evaluate(() => { const n = document.querySelector("nav.tabs"); if (!n) return null; const s = getComputedStyle(n); return { scroll: n.scrollWidth > n.clientWidth + 2, ox: s.overflowX, h: Math.round(n.getBoundingClientRect().height) }; });
      let i = 1;
      for (const [t, label] of tabs) {
        const e0 = run.errors.length;
        try {
          await pg.evaluate(t => { const b = document.querySelector(`nav.tabs [data-tab="${t}"]`); if (b) b.click(); }, t);
          await pg.waitForTimeout(3000);
          const m = await pg.evaluate(measure, { touch: !!d.touch, ios: !!d.ios });
          const sp = `out/${pre}-${String(i).padStart(2, "0")}-${t}.jpg`;
          await pg.screenshot({ path: sp, fullPage: !!d.full, quality: 45, type: "jpeg" }).catch(() => pg.screenshot({ path: sp, quality: 45, type: "jpeg" }));
          run.tabs.push({ t, label, ok: true, newErrors: run.errors.length - e0, m });
        } catch (x) { run.tabs.push({ t, label, ok: false, err: String(x.message || x).slice(0, 200) }); }
        i++;
      }
    } catch (x) { run.errors.push("beh: " + String(x.message || x).slice(0, 300)); }
    await ctx.close(); save();
  }
}
for (const b of Object.values(browsers)) await b.close();
save();
console.log("hotovo: " + R.runs.map(x => `${x.dev}/${x.kind} záložky ${x.tabs.length}, chyby ${x.errors.length}`).join("; "));
