// KLIK AUDIT (7. 11.): node klikaudit.mjs <farmar> [owner,obch,farmer] [max tlačidiel na záložku] [časť i/n] [výstup.json]
// Audit „mŕtvych“ tlačidiel: každé tlačidlo v každej záložke klikne a sleduje, či sa niečo stalo
// (zmena DOM mimo „živých“ prvkov, RPC / tabuľka, toast, okno, posun, fokus, schránka, hash, výber súboru). Mock databáza – nič sa neukladá.
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import { createRequire } from "node:module"; const require=createRequire(import.meta.url); const { chromium } = require("playwright");
const ROOT = path.resolve(process.argv[2]); const MOCK = fs.readFileSync(new URL("./mock-sb.js", import.meta.url), "utf8");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg":"image/svg+xml" };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split("?")[0]).replace(/^\/beta(\/|$)/, "/"); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end(); return; }
  s.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(s); }).listen(0);
const BASE = `http://127.0.0.1:${srv.address().port}/`;
const ROLES={owner:{ kind: "staff", staff: { email: "ernte@ernte.sk", name: "Majiteľ Test", role: "owner", perms: {}, must_change: false } },
  obch:{kind:"staff",staff:{email:"obchod@example.com",name:"Obchodník Test",role:"staff",perms:{deals:true,req:true,farm:true,price_view:true,trans:true},must_change:false}},
  farmer:{kind:"farmer"}};
const INST=()=>{window.__ev=0;window.__evk=[];const bump=k=>{window.__ev++;window.__evk.push(k)};window.__bump=bump;
  const wrap=(o,m,k)=>{try{const f=o[m];if(typeof f!=="function")return;o[m]=function(){bump(k);return f.apply(this,arguments)}}catch(x){}};
  wrap(window,"open","open");wrap(window,"scrollTo","scroll");wrap(window,"scrollBy","scroll");wrap(Element.prototype,"scrollIntoView","scroll");wrap(HTMLElement.prototype,"focus","focus");
  wrap(HTMLInputElement.prototype,"click","fileclick");wrap(HTMLFormElement.prototype,"requestSubmit","submit");wrap(window,"print","print");wrap(history,"back","back");wrap(history,"pushState","push");
  wrap(HTMLMediaElement.prototype,"play","play");try{wrap(navigator.clipboard,"writeText","clip")}catch(x){}try{wrap(navigator,"share","share")}catch(x){}try{wrap(speechSynthesis,"speak","speak")}catch(x){}
  addEventListener("hashchange",()=>bump("hash"));document.addEventListener("submit",()=>bump("submitev"),true);document.addEventListener("toggle",()=>bump("toggle"),true);
  window.alert=()=>bump("alert");window.confirm=()=>{bump("confirm");return false};window.prompt=()=>{bump("prompt");return null}};
const b = await chromium.launch(); const OUT=[];
const RL=(process.argv[3]||"owner,obch,farmer").split(","), MAXB=+(process.argv[4]||150), PART=process.argv[5]||"", OF=process.argv[6]||"deadbtn.json";
for(const rn of RL){
  const ctx = await b.newContext({ viewport: { width: 390, height: 860 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await ctx.route("**/*", async rt => { const u = rt.request().url(); if (/vendor\/supabase-[\d.]+\.js/.test(u)) return rt.fulfill({ body: `window.__ROLE=${JSON.stringify(ROLES[rn])};` + MOCK, contentType: "text/javascript" }); if (u.startsWith(BASE)) return rt.continue(); return rt.fulfill({status:200,body:""}); });
  await ctx.addInitScript(() => { try { localStorage.setItem("ernte-inst", "1"); sessionStorage.setItem("ernte-welcome-skip", "1"); sessionStorage.setItem("ernte-posta-pop","1"); } catch (e) {} });
  await ctx.addInitScript(INST);
  ctx.on("page",p=>{if(p.url()!=="about:blank")p.close().catch(()=>{})});
  let curKey="";const pg = await ctx.newPage(); const errs=[]; pg.on("pageerror", e => errs.push(curKey+" ⇒ "+String(e.message || e).slice(0, 160)+" @ "+String(e.stack||"").split("\n").slice(1,3).join(" | ").slice(0,200))); pg.on("dialog",d=>d.dismiss().catch(()=>{}));
  await pg.goto(BASE + "index.html", { waitUntil: "load" }); await pg.waitForTimeout(3500);
  await pg.evaluate(() => { const g = [...document.querySelectorAll("button,a")].find(x => /Poďme na to/.test(x.innerText || "")); g && g.click(); });
  await pg.waitForTimeout(6000);
  await pg.evaluate(()=>{const bump=window.__bump;try{const t=window.toast;if(typeof t==="function")window.toast=function(){bump("toast");return t.apply(this,arguments)}}catch(x){}
    try{const s=window.sb;if(s){const r=s.rpc.bind(s),f=s.from.bind(s);s.rpc=function(n){bump("rpc:"+n);return r.apply(null,arguments)};s.from=function(n){bump("from:"+n);return f.apply(null,arguments)}}}catch(x){}
    try{const rs=window.renderStaff;if(typeof rs==="function"){window.renderStaff=function(){bump("render");return rs.apply(this,arguments)};Object.keys(rs).forEach(k=>{try{window.renderStaff[k]=rs[k]}catch(x){}})}}catch(x){}
    try{const rf=window.renderFarmer;if(typeof rf==="function"){window.renderFarmer=function(){bump("render");return rf.apply(this,arguments)};Object.keys(rf).forEach(k=>{try{window.renderFarmer[k]=rf[k]}catch(x){}})}}catch(x){}});
  let tabs=rn==="farmer"?["_"]:await pg.evaluate(()=>[...document.querySelectorAll("#app>nav.tabs [data-tab]")].map(x=>x.dataset.tab));
  if(PART){const [i,n]=PART.split("/").map(Number);tabs=tabs.filter((_,j)=>j%n===i)}
  fs.writeFileSync(OF+".tabs",JSON.stringify(tabs));
  for(const t of tabs){
    const go=async()=>{if(t!=="_")await pg.evaluate(t=>{document.querySelectorAll("#pvAsk,.pvask").forEach(x=>x.remove());const e=document.querySelector(`#app>nav.tabs [data-tab="${t}"]`);e&&e.click()},t);await pg.waitForTimeout(2500)};
    await go();
    // „živé“ prvky: čo sa mení samo bez kliku
    const keys=await pg.evaluate(()=>{const path=el=>{let s="",n=0;for(let x=el;x&&x!==document.body&&n<4;x=x.parentElement,n++)s=(x.id?"#"+x.id:x.tagName+"."+String(x.className||"").split(" ")[0])+">"+s;return s};
      window.__noisy=new Set();const mo=new MutationObserver(R=>{for(const r of R){const t=r.target.nodeType===1?r.target:r.target.parentElement;if(t)window.__noisy.add(path(t))}});mo.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
      window.__mo=mo;window.__path=path;
      const vis=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
      const L=[...document.querySelectorAll("#app button,#app [role=button],#app summary,#app a[href],#app label:has(input[type=file]),#app [data-owgo],#app [data-kgo]")].filter(el=>vis(el)&&!el.closest("nav.tabs,#rdBar,#rdMenu,#rdSide,.secbar,.rokbar,#spatBar")&&!el.disabled);
      const k=el=>el.tagName+"|"+(el.innerText||el.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().slice(0,50)+"|"+[...el.attributes].filter(a=>a.name.startsWith("data-")).map(a=>a.name+"="+a.value.slice(0,30)).join(",");
      return [...new Set(L.map(k))]});
    await pg.waitForTimeout(1500);
    await pg.evaluate(()=>{window.__noisy0=new Set(window.__noisy)});
    let n=0;
    for(const key of keys.slice(0,MAXB)){n++;curKey=t+" :: "+key;
      if(/Odhlásiť|⏻|logout|data-out|Vymazať obchod|Zmazať účet/i.test(key))continue;
      const r=await pg.evaluate(async key=>{const k=el=>el.tagName+"|"+(el.innerText||el.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().slice(0,50)+"|"+[...el.attributes].filter(a=>a.name.startsWith("data-")).map(a=>a.name+"="+a.value.slice(0,30)).join(",");
        const el=[...document.querySelectorAll("#app button,#app [role=button],#app summary,#app a[href],#app label,#app [data-owgo],#app [data-kgo]")].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&k(x)===key});if(!el)return {skip:"zmizol"};
        const href=el.tagName==="A"?el.getAttribute("href"):null;if(href&&/^(https?:|mailto:|tel:|sms:|whatsapp:)/.test(href))return {skip:"odkaz von"};
        const fixed0=[...document.body.children].filter(x=>getComputedStyle(x).position==="fixed").length;
        window.__ev=0;window.__evk=[];const muts=[];const mo=new MutationObserver(R=>{for(const r of R){const t=r.target.nodeType===1?r.target:r.target.parentElement;if(!t)continue;const p=window.__path(t);if(!window.__noisy0.has(p))muts.push(p)}});
        mo.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});el.scrollIntoView({block:"center"});window.__ev=0;window.__evk=[];
        const ae=document.activeElement;el.click();await new Promise(z=>setTimeout(z,350));mo.disconnect();
        const ev=window.__evk.filter(x=>x!=="scroll"||true);return {ev:[...new Set(ev)].slice(0,4),mut:muts.length,ex:muts.slice(0,2),fixed:[...document.body.children].filter(x=>getComputedStyle(x).position==="fixed").length-fixed0,tag:el.tagName}},key).catch(e=>({err:String(e).slice(0,80)}));
      if(r.skip||r.err){continue}
      const alive=r.ev.filter(x=>x!=="focus").length>0||r.mut>0;
      if(!alive)OUT.push({rn,t,key});
      // upratanie: zavrieť okná, vrátiť záložku
      await pg.evaluate(()=>{for(const m of [...document.body.children].reverse()){const s=getComputedStyle(m);if(s.position!=="fixed"||m.id==="app")continue;if(+s.zIndex<50||m.offsetHeight<innerHeight*0.3)continue;
          const c=[...m.querySelectorAll("button,a")].find(b=>/^(✕|×|Zavrieť|← Späť|Späť|Neskôr|Zrušiť)/.test((b.innerText||b.getAttribute("aria-label")||"").trim()));if(c)c.click();else m.remove()}}).catch(()=>{});
      const tabNow=await pg.evaluate(()=>typeof TAB!=="undefined"?TAB:null).catch(()=>null);if(t!=="_"&&tabNow!==t)await go();
    }
    OUT.push({rn,t,checked:Math.min(keys.length,MAXB),total:keys.length});fs.writeFileSync(OF,JSON.stringify(OUT,null,1));
  }
  OUT.push({rn,errs:errs.slice(0,10)});await ctx.close();
}
fs.writeFileSync(OF,JSON.stringify(OUT,null,1));console.log("hotovo",OUT.length);await b.close();srv.close();
