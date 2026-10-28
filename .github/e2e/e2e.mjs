// Prejde živú aplikáciu ako testovací farmár, obchodník a dopravca: prihlásenie, každá záložka, snímka, chyby.
// Nič neodosiela – iba ťuká na záložky. Do logu nevypisuje údaje ani heslá.
import fs from "node:fs";
import { chromium } from "playwright";
const cfg = fs.readFileSync("../../farmar/config.js", "utf8");
const URL_ = cfg.match(/SUPABASE_URL:\s*"([^"]+)"/)[1], KEY = cfg.match(/SUPABASE_KEY:\s*"([^"]+)"/)[1];
const APP = "https://ernte-trade.github.io/ernte-/farmar/";
fs.mkdirSync("out", { recursive: true });
const R = { at: new Date().toISOString(), runs: [] };
const save = () => fs.writeFileSync("out/result.json", JSON.stringify(R, null, 1));
const r = await fetch(`${URL_}/rest/v1/rpc/test_creds_take`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_token: process.env.E2E_TOKEN || "" }) });
const creds = r.ok ? await r.json() : null;
if (!Array.isArray(creds)) { R.err = "token neplatný alebo databáza nedostupná (" + r.status + ")"; save(); console.log("bez prístupu"); process.exit(0); }
const br = await chromium.launch();
for (const c of creds) {
  const run = { kind: c.kind, name: c.name, errors: [], http: [], tabs: [] }; R.runs.push(run);
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, locale: "sk-SK", timezoneId: "Europe/Bratislava" });
  const pg = await ctx.newPage();
  pg.on("pageerror", e => run.errors.push("JS: " + String(e.message || e).slice(0, 300)));
  pg.on("console", m => { if (m.type() === "error") run.errors.push("console: " + m.text().slice(0, 300)); });
  pg.on("response", res => { const u = res.url(); if (res.status() >= 400 && /supabase\.co/.test(u)) run.http.push(res.status() + " " + u.replace(/\?.*/, "").replace(/^https:\/\/[^/]+/, "").slice(0, 140)); });
  try {
    await pg.goto(APP, { waitUntil: "networkidle", timeout: 60000 });
    await pg.fill("input[name=email]", c.login); await pg.fill("input[name=pw]", c.pw);
    await pg.click("form button[type=submit]"); await pg.waitForTimeout(7000);
    if (await pg.$(".pinmod")) { run.errors.push("PIN okno sa zobrazilo"); }
    await pg.evaluate(() => { const b = document.querySelector("[data-instx]"); if (b) b.click(); });
    await pg.waitForTimeout(800);
    await pg.screenshot({ path: `out/${c.kind}-00-start.jpg`, fullPage: true, quality: 60, type: "jpeg" });
    const tabs = await pg.$$eval("nav.tabs [data-tab]", L => L.map(b => [b.dataset.tab, b.textContent.trim().replace(/\s+/g, " ")]));
    run.tabList = tabs;
    let i = 1;
    for (const [t, label] of tabs) {
      const e0 = run.errors.length;
      try {
        await pg.evaluate(t => { const b = document.querySelector(`nav.tabs [data-tab="${t}"]`); if (b) b.click(); }, t);
        await pg.waitForTimeout(3500);
        const txt = await pg.$eval("#app", a => a.innerText.replace(/\s+/g, " ").slice(0, 400));
        await pg.screenshot({ path: `out/${c.kind}-${String(i).padStart(2, "0")}-${t}.jpg`, fullPage: true, quality: 55, type: "jpeg" });
        run.tabs.push({ t, label, ok: true, newErrors: run.errors.length - e0, text: txt });
      } catch (x) { run.tabs.push({ t, label, ok: false, err: String(x.message || x).slice(0, 200) }); }
      i++;
    }
    if (!tabs.length) run.farmerText = await pg.$eval("#app", a => a.innerText.replace(/\s+/g, " ").slice(0, 1500));
  } catch (x) { run.errors.push("beh: " + String(x.message || x).slice(0, 300)); }
  await ctx.close(); save();
}
await br.close(); save();
console.log("hotovo: " + R.runs.map(x => `${x.kind} záložky ${x.tabs.length}, chyby ${x.errors.length}`).join("; "));
