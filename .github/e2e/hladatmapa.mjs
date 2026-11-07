import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import { createRequire } from "node:module"; const require=createRequire(import.meta.url); const { chromium } = require("playwright");
const ROOT = path.resolve(process.argv[2]); const MOCK = fs.readFileSync(new URL("./mock-sb.js", import.meta.url), "utf8");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg":"image/svg+xml" };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split("?")[0]).replace(/^\/beta(\/|$)/, "/"); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end(); return; }
  s.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(s); }).listen(0);
const BASE = `http://127.0.0.1:${srv.address().port}/`;
const PERMS={};"agro agro_calc ai alarms assign big calc cams costs danube deals deals_qty diesel drivers ev ev_doch farm farm_login farm_terms farmer_gps firmy fleet fleet_all fleet_cost leads market notes ppa praca price_edit price_view remain req sklad trans trus wx yard klient".split(" ").forEach(k=>PERMS[k]=true);
const ROLES={owner:{ kind: "staff", staff: { email: "ernte@ernte.sk", name: "Majiteľ Test", role: "owner", perms: {}, must_change: false } },staff:{kind:"staff",staff:{email:"obchod@example.com",name:"Obchodník Test",role:"admin",perms:PERMS,must_change:false}},farmer:{kind:"farmer"}};
const b = await chromium.launch();
const ALL={};for(const rn of ["owner","staff","farmer"]){const M={};ALL[rn]=M;
  const ctx = await b.newContext({ viewport: { width: 900, height: 900 }, serviceWorkers: "block" });
  await ctx.route("**/*", async rt => { const u = rt.request().url(); if (/vendor\/supabase-[\d.]+\.js/.test(u)) return rt.fulfill({ body: `window.__ROLE=${JSON.stringify(ROLES[rn])};` + MOCK, contentType: "text/javascript" }); if (u.startsWith(BASE)) return rt.continue(); return rt.fulfill({status:200,body:""}); });
  await ctx.addInitScript(() => { try { localStorage.setItem("ernte-inst", "1"); sessionStorage.setItem("ernte-welcome-skip", "1"); sessionStorage.setItem("ernte-posta-pop","1"); } catch (e) {} });
  const pg = await ctx.newPage(); await pg.goto(BASE + "index.html", { waitUntil: "load" }); await pg.waitForTimeout(3500);
  await pg.evaluate(() => { const g = [...document.querySelectorAll("button,a")].find(x => /Poďme na to/.test(x.innerText || "")); g && g.click(); }); await pg.waitForTimeout(7000);
  const tabs=rn==="farmer"?["_farmer"]:await pg.evaluate(()=>[...document.querySelectorAll("#app>nav.tabs [data-tab]")].map(x=>x.dataset.tab));
  for(const t of tabs){if(t!=="_farmer"){await pg.evaluate(t=>{const e=document.querySelector(`#app>nav.tabs [data-tab="${t}"]`);e&&e.click()},t);await pg.waitForTimeout(3500)}
    const L=await pg.evaluate(()=>{const out=new Set();const add=x=>{let s=(x||"").replace(/\s+/g," ").trim();s=s.replace(/\(\s*\d+[^)]*\)/g,"").replace(/\b\d[\d\s.,:/–-]*\b/g," ").replace(/\s+/g," ").replace(/[·:–-]\s*$/,"").trim();
        if(s.length<3||s.length>80)return;if(/test|demo|example|XX|Majiteľ Test|Obchodník|Vodič/i.test(s))return;out.add(s)};
      document.querySelectorAll("#app .secbar button,#app h2,#app h3,#app .owsh span:first-child,#app .srt,#app .ocnt,#app .ehb h1,#app .card>b:first-child,#app details>summary").forEach(el=>{if(el.closest("#rdBar,#rdMenu"))return;
        const tx=el.tagName==="SUMMARY"?(el.firstChild&&el.firstChild.textContent||el.innerText.split("\n")[0]):el.innerText.split("\n")[0];add(tx)});
      return [...out]});
    M[t]=L.slice(0,80)}
  await ctx.close()}
fs.writeFileSync(process.argv[3],JSON.stringify(ALL));for(const k in ALL)console.log(k,Object.keys(ALL[k]).length,Object.values(ALL[k]).reduce((a,x)=>a+x.length,0));await b.close();srv.close();
