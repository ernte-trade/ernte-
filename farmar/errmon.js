// ===== 🐞 CHYBY APLIKÁCIE A PRIHLÁSENIA (2. 11.) =====
// U všetkých (farmári aj tím, aj pred prihlásením) zachytí: chyby skriptov (window.onerror), nevybavené sľuby (unhandledrejection),
// nevydarené volania databázy (HTTP 4xx/5xx; nie 401 po odhlásení, nie 406 „žiadny riadok“) a chyby vykreslenia (renderStaff / renderFarmer v stope).
// Do databázy (app_err_log → app_chyby) ide iba: čas, rola, obrazovka, zariadenie, prehliadač, verzia, správa a stopa –
// BEZ osobných a obchodných údajov (e-maily, telefóny, čísla dlhšie ako 4 číslice, mená a hodnoty sa vyčistia tu aj v databáze).
// Prihlásenia (window.ernteLogin z prihlasovacieho formulára v index.html) → app_login_log: používateľ iba ako odtlačok SHA-256 a m***@doména.
// Majiteľ: Flotila → ⚙️ Nastavenia → 🩺 Diagnostika → 🐞 Chyby aplikácie (window.vErrDiag, app_err_stats).
// Načítava sa hneď po supabase (pred vytvorením klienta), aby obalil fetch skôr, než si ho supabase-js uloží.
(function(){
"use strict";
if(window.ernteErr)return;
const CF=window.ERNTE_CONFIG||{};
const HOST=(()=>{try{return new URL(CF.SUPABASE_URL).host}catch(e){return ""}})();
const DRY=!!navigator.webdriver&&!window.ERNTE_ERRMON_TEST; // automatické testy: nič neodosielať (iba window.ernteErrLog)
const LOG=window.ernteErrLog=[];
const OWNRPC=/\/rpc\/(app_err_log|app_login_log|app_err_rate|app_err_stats|ui_report)\b/;
const OF=window.fetch?window.fetch.bind(window):null;
const g=f=>{try{return f()}catch(e){return undefined}}; // globálne `let` premenné z index.html (sb, ME, ROLE, FARMER, TAB, STATE) – bez pádu pred ich vznikom

// ---------- čistenie textu (žiadne osobné ani obchodné údaje) ----------
const BASE=location.origin+location.pathname.replace(/[^/]*$/,"");
function scrub(t,n){let s=String(t==null?"":t).slice(0,4000);
  s=s.split(BASE).join("").split(location.origin).join("");
  s=s.replace(/(\.(js|mjs|html|css|json))\?[^\s:"'<>)]*/g,"$1");
  s=s.replace(/(https?:\/\/[^\s?#"'<>]*)[?#][^\s"'<>)]*/g,"$1");
  s=s.replace(/(eyJ|sb-|Bearer )[A-Za-z0-9._-]{10,}/g,"[token]");
  s=s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,"[email]");
  s=s.replace(/(\+|\b0)\d[\d /-]{7,}\d/g,"[tel]");
  s=s.replace(/(^|[^:\d])\d{5,}/g,"$1#");
  s=s.replace(/=\([^)]*\)/g,"=(…)");
  // mená: dve slová s veľkým začiatočným písmenom, aspoň jedno s diakritikou (Ján Novák, Peter Dvořák, Kovács Béla)
  s=s.replace(/\p{Lu}\p{Ll}*[\u00C0-\u024F]\p{Ll}*\s+\p{Lu}\p{Ll}+/gu,"[meno]").replace(/\p{Lu}\p{Ll}+\s+\p{Lu}\p{Ll}*[\u00C0-\u024F]\p{Ll}*/gu,"[meno]");
  return s.replace(/\s+/g," ").trim().slice(0,n||500)}
function scrubStack(t){return String(t||"").split("\n").slice(0,12).map(l=>scrub(l,200)).filter(Boolean).join("\n").slice(0,1500)}

// ---------- kde a na čom ----------
function ver(){let v="";document.querySelectorAll("script[src*='?v=']").forEach(x=>{const m=/\?v=([\w.-]+)/.exec(x.getAttribute("src")||"");if(m&&m[1]>v)v=m[1]});
  return (/\/beta\//.test(location.pathname)?"beta ":"")+(v||"?")}
function dev(){const u=navigator.userAgent||"",w=innerWidth||0;let d;
  if(/iPad/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1))d="iPad";
  else if(/iPhone/.test(u))d="iPhone iOS "+((/OS (\d+)/.exec(u)||[])[1]||"");
  else if(/Android/.test(u))d="Android "+((/Android (\d+)/.exec(u)||[])[1]||"")+(/Mobile/.test(u)?" mobil":" tablet");
  else if(/Windows/.test(u))d="Windows";else if(/Mac OS X/.test(u))d="Mac";else if(/Linux/.test(u))d="Linux";else d="iné";
  return d+" "+w+"px"}
function browser(){const u=navigator.userAgent||"";let b;const v=re=>(re.exec(u)||[])[1]||"";
  if(/SamsungBrowser/.test(u))b="Samsung "+v(/SamsungBrowser\/(\d+)/);else if(/Edg\//.test(u))b="Edge "+v(/Edg\/(\d+)/);
  else if(/FxiOS|Firefox/.test(u))b="Firefox "+v(/(?:FxiOS|Firefox)\/(\d+)/);else if(/CriOS/.test(u))b="Chrome iOS "+v(/CriOS\/(\d+)/);
  else if(/Chrome\//.test(u))b="Chrome "+v(/Chrome\/(\d+)/);else if(/Safari/.test(u))b="Safari "+v(/Version\/(\d+)/);else b="iný";
  const app=/[?&]src=android/.test(location.search)?" TWA":(matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true?" app":"";
  return b+app}
function inApp(){return !!g(()=>ME)}
function screen(){if(document.querySelector(".wlc"))return "uvod";
  if(!inApp())return document.querySelector("#fEmail,#fCode")?"prihlasenie":"start";
  if(window.ERNTE_KIND==="junior")return "junior";
  if(g(()=>FARMER))return "farmar:"+(g(()=>document.querySelector("[data-fsec].on,[data-fsec][aria-pressed=true]").dataset.fsec)||"domov");
  const t=g(()=>TAB),st=g(()=>STATE)||{};return t?String(t)+(t==="fleet"&&st.fsec?"/"+st.fsec:""):"?"}
function role(){if(!inApp())return "anon";if(window.ERNTE_KIND==="junior")return "junior";if(g(()=>FARMER))return "farmar";const r=g(()=>ROLE);return r?String(r):"?"}

// ---------- fronta a odoslanie ----------
const SEEN=new Map(),Q=[];let nSent=0,qt=0;
const IGN=/ResizeObserver loop|^Script error\.?$|extension:\/\/|chrome-extension|moz-extension|safari-extension|webkit-masked-url|__gCrWeb|instantSearchSDK|Non-Error promise rejection captured/i;
function rep(kind,msg,stack,x){try{
  const m=scrub(msg,500);if(!m||IGN.test(m)||IGN.test(String(stack||"")))return;
  const sc=screen();if(kind==="js"||kind==="promise"){if(/render(Staff|Farmer)|renderFarm|\bfbody\b/.test(String(stack||"")))kind="render"}
  const k=kind+"|"+m.replace(/\d+/g,"#")+"|"+sc,now=Date.now();if(SEEN.has(k)&&now-SEEN.get(k)<60e3)return;SEEN.set(k,now);
  if(nSent>=40)return;nSent++;
  const o=Object.assign({kind,msg:m,stack:scrubStack(stack),screen:sc,role:role(),dev:dev(),browser:browser(),ver:ver(),at:new Date().toISOString()},x||{});
  LOG.push(o);if(LOG.length>50)LOG.shift();if(DRY)return;
  Q.push(o);if(!qt)qt=setTimeout(flush,2500)}catch(e){}}
async function rpc(name,p){const c=g(()=>sb);if(c&&c.rpc){try{const r=await c.rpc(name,{p});if(!r.error)return true}catch(e){}}
  if(!OF||!CF.SUPABASE_URL||!CF.SUPABASE_KEY)return false; // pred vytvorením klienta (alebo pri jeho chybe) priamo, anonymne
  try{const r=await OF(CF.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/rpc/"+name,{method:"POST",keepalive:true,headers:{"Content-Type":"application/json",apikey:CF.SUPABASE_KEY,Authorization:"Bearer "+CF.SUPABASE_KEY},body:JSON.stringify({p})});return r.ok}catch(e){return false}}
async function flush(){qt=0;const b=Q.splice(0,20);if(!b.length)return;await rpc("app_err_log",b);if(Q.length)qt=setTimeout(flush,4000)}
addEventListener("pagehide",()=>{if(Q.length&&!DRY){const b=Q.splice(0,20);rpc("app_err_log",b)}});

// ---------- 1) chyby skriptov a sľubov ----------
addEventListener("error",ev=>{try{if(!ev||ev.target&&ev.target!==window&&!(ev instanceof ErrorEvent))return; // chyby načítania obrázkov a pod. nie
  const f=String(ev.filename||"");if(/extension|^chrome-|^moz-|^safari-/.test(f))return;
  const e=ev.error,st=(e&&e.stack)||(f?f.split("/").pop()+":"+(ev.lineno||0)+":"+(ev.colno||0):"");
  rep("js",ev.message||(e&&e.message)||"chyba",st)}catch(x){}});
addEventListener("unhandledrejection",ev=>{try{const r=ev.reason;if(r&&(r.name==="AbortError"||r.__ernteNet))return;
  const m=r==null?"(prázdne)":typeof r==="string"?r:(r.message||r.error_description||g(()=>JSON.stringify(r).slice(0,300))||String(r));
  if(/Failed to fetch|NetworkError|Load failed|network connection was lost/i.test(m))return; // výpadok siete – nie chyba aplikácie (zachytí ho fetch)
  rep("promise",m,r&&r.stack||"")}catch(x){}});
window.ernteErr=function(e,ctx){try{rep(ctx==="render"?"render":"js",(ctx&&ctx!=="render"?ctx+": ":"")+((e&&e.message)||String(e)),e&&e.stack||"")}catch(x){}};

// ---------- 2) volania databázy ----------
function endpoint(u){try{const p=new URL(u,location.href).pathname;let m;
  if((m=/\/rest\/v1\/rpc\/([\w]+)/.exec(p)))return "rpc:"+m[1];
  if((m=/\/rest\/v1\/([\w]+)/.exec(p)))return "tab:"+m[1];
  if((m=/\/auth\/v1\/([\w]+)/.exec(p)))return "auth:"+m[1];
  if((m=/\/storage\/v1\/object\/(?:sign\/|public\/|authenticated\/|upload\/sign\/)?([\w.-]+)/.exec(p)))return "storage:"+m[1];
  if((m=/\/functions\/v1\/([\w-]+)/.exec(p)))return "fn:"+m[1];
  return p.split("/").slice(0,3).join("/")}catch(e){return "?"}}
function apiErr(url,res,meth){const st=res.status,ep=endpoint(url);
  if(st===401&&!inApp())return;                 // po odhlásení / pred prihlásením
  if(st===406)return;                            // .single() bez riadku – očakávané
  if(/^auth:/.test(ep)&&st<500)return;           // nesprávne heslo / kód = prihlásenia (app_login_log), nie chyba
  const go=(m,c)=>rep("api","HTTP "+st+" "+meth+" "+ep+(c?" ["+c+"]":"")+(m?": "+m:""),"",{api:ep,status:st});
  try{res.clone().text().then(t=>{let j=null;try{j=JSON.parse(t)}catch(e){}
    go(j?String(j.message||j.msg||j.error_description||j.error||"").slice(0,300):"",j&&j.code?String(j.code).slice(0,20):"")},()=>go("",""))}catch(e){go("","")}}
if(OF&&HOST){window.fetch=function(u,o){let url="";try{url=typeof u==="string"?u:(u&&u.url)||String(u)}catch(e){}
  const p=OF(u,o);if(!url||url.indexOf(HOST)<0||OWNRPC.test(url))return p;
  const meth=String((o&&o.method)||(u&&u.method)||"GET").toUpperCase();
  return p.then(r=>{try{if(r&&!r.ok&&r.status)apiErr(url,r,meth)}catch(e){}return r},
    e=>{try{if(!(e&&e.name==="AbortError")&&navigator.onLine!==false&&!document.hidden)rep("siet","Sieť: "+meth+" "+endpoint(url)+" – "+((e&&e.message)||e),"",{api:endpoint(url)})}catch(x){}throw e})}}

// ---------- 3) prihlásenia ----------
async function hash(s){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("ernte-login|"+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
  catch(e){let h1=0x811c9dc5,h2=0;for(let i=0;i<s.length;i++){h1=Math.imul(h1^s.charCodeAt(i),16777619)>>>0;h2=(h2*31+s.charCodeAt(i))>>>0}return h1.toString(16).padStart(8,"0")+h2.toString(16).padStart(8,"0")}}
const mask=s=>{s=String(s||"").trim().toLowerCase();const i=s.indexOf("@");return i<0?(s?s[0]+"***":""):(s[0]||"")+"***@"+s.slice(i+1).slice(0,40)};
window.ernteLogin=async function(ev,method,login,err){try{
  const id=String(login||"").trim().toLowerCase(),code=err?String(err.code||err.status||err.name||"chyba").slice(0,40):"";
  const o={ev,method,who_h:id?await hash(id):"",who_m:id?mask(id):"",code,dev:dev(),browser:browser(),ver:ver()};
  LOG.push(Object.assign({login:true},o));if(DRY)return;await rpc("app_login_log",o)}catch(e){}};
// prihlásenie odkazom z e-mailu: chyba v adrese (vypršaný / použitý odkaz) alebo úspech
try{const h=location.hash+"&"+location.search,ec=/[#&?]error_code=([\w-]+)/.exec(h);
  if(ec)setTimeout(()=>window.ernteLogin("link_fail","odkaz","",{code:ec[1]}),1500);
  else if(/access_token=|token_hash=/.test(h))setTimeout(()=>window.ernteLogin("ok","odkaz","",null),1500)}catch(e){}

// ---------- 4) Diagnostika – 🐞 Chyby aplikácie (iba majiteľ) ----------
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>g(()=>ROLE)==="owner"&&!g(()=>FARMER);
const RS=()=>{try{const st=g(()=>STATE);if(typeof renderStaff==="function"&&st&&st.reqs&&g(()=>TAB)==="fleet"&&st.fsec==="set")renderStaff()}catch(x){}};
const S={d:1,data:null,busy:false,err:"",at:0};
async function load(){if(S.busy)return;S.busy=true;
  try{const r=await sb.rpc("app_err_stats",{p_days:S.d});
    if(r.error)S.err=/app_err_stats|schema cache|function/i.test(r.error.message||"")?"Prehľad chýb sa zapne po aktualizácii databázy (do pár minút).":String(r.error.message||"chyba");
    else{S.data=r.data&&!Array.isArray(r.data)?r.data:{};S.err=""}}catch(x){S.err=String(x&&x.message||x)}
  S.at=Date.now();S.busy=false;RS()}
const RN={owner:"majiteľ",admin:"kancelária",dispatch:"doprava",invoice:"fakturácia",staff:"obchodník",farmar:"farmár",junior:"Junior",anon:"pred prihlásením",trus:"kurací trus","?":"neznáma"};
const rn=r=>RN[r]||r;
const SN={prihlasenie:"Prihlásenie",start:"Štart",uvod:"Úvod LIVE",junior:"ERNTE Junior"};
const sn=s=>{s=String(s||"?");if(SN[s])return SN[s];if(s.startsWith("farmar:"))return "Farmár · "+s.slice(7);if(s.startsWith("fleet/"))return "Flotila · "+s.slice(6);return s};
const KN={js:"skript",promise:"sľub",api:"databáza",render:"zobrazenie",siet:"sieť"};
const dt=a=>a?new Date(a).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"";
function css(){if(document.getElementById("emdCss"))return;const s=document.createElement("style");s.id="emdCss";s.textContent=`
.emd{display:grid;gap:12px;min-width:0;margin-top:12px}.emd .card{min-width:0}
.emd .emh{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between}.emd .emh h2{margin:0;font-size:1.05rem;min-width:0}
.emd .emsw{display:flex;flex-wrap:wrap;gap:6px}.emd .emsw button{min-height:40px;padding:6px 14px;border-radius:99px}
.emd .emsw button[aria-pressed=true]{background:rgba(182,255,59,.18);border-color:rgba(182,255,59,.5);color:#d9ff9a}
.emd .emk{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px;margin-top:8px}
.emd .emk div{padding:10px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);min-width:0;text-align:center}
.emd .emk b{display:block;font-size:1.3rem}.emd .emk small{display:block;opacity:.75;font-size:.75rem;overflow-wrap:anywhere}.emd .emk .bad b{color:#ff8a9a}
.emd .emg{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;margin-top:10px}
.emd .emb{display:grid;gap:5px;margin-top:6px}.emd .emr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;font-size:.84rem;position:relative;padding:5px 8px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.03)}
.emd .emr i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,rgba(255,107,129,.28),rgba(255,107,129,.08));border-radius:10px;pointer-events:none}
.emd .emr span{position:relative;overflow-wrap:anywhere;min-width:0}.emd .emr b{position:relative;font-variant-numeric:tabular-nums}
.emd .emt{display:grid;gap:6px;margin-top:8px}.emd .eme{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:.84rem}
.emd .eme .n{min-width:40px;padding:4px 8px;border-radius:99px;text-align:center;font-weight:800;background:rgba(255,107,129,.18);color:#ffb3c0;font-variant-numeric:tabular-nums}
.emd .eme p{margin:0;overflow-wrap:anywhere;font-weight:600;line-height:1.35}.emd .eme small{display:block;opacity:.72;overflow-wrap:anywhere;margin-top:3px}
.emd .sth{display:block;margin-top:4px}`;document.head.appendChild(s)}
function bars(L,key,name){if(!L||!L.length)return `<div class="s">Žiadne chyby.</div>`;const mx=Math.max(1,...L.map(x=>+x.n||0));
  return `<div class="emb">${L.map(x=>`<div class="emr"><i style="width:${Math.max(4,Math.round((+x.n||0)/mx*100))}%"></i><span>${E(name(x[key]))}</span><b>${E(x.n)}</b></div>`).join("")}</div>`}
window.vErrDiag=function(){if(!OWN())return "";css();if(!S.at&&!S.busy)load();
  let h=`<div class="emd"><div class="card"><div class="emh"><h2>🐞 Chyby aplikácie</h2><div class="emsw" role="group" aria-label="Obdobie">${[[1,"24 h"],[7,"7 dní"]].map(([d,t])=>`<button type="button" data-emd="${d}" aria-pressed="${S.d===d}">${t}</button>`).join("")}<button type="button" data-emr="1" aria-label="Obnoviť prehľad chýb">↻</button></div></div>
`;
  const d=S.data;
  if(S.err&&!d)h+=`<div class="s" style="margin-top:8px">${E(S.err)}</div>`;
  else if(!d)h+=`<div class="s" style="margin-top:8px">Načítavam…</div>`;
  else{const per=S.d===1?"za 24 h":"za 7 dní";
    h+=`<div class="emk"><div class="${d.n?"bad":""}"><b>${d.n||0}</b><small>chýb ${per}</small></div><div class="${d.farmar?"bad":""}"><b>${d.farmar||0}</b><small>u farmárov</small></div><div><b>${d.tim||0}</b><small>u tímu</small></div><div><b>${d.anon||0}</b><small>pred prihlásením</small></div><div><b>${d.h1||0}</b><small>za poslednú hodinu</small></div></div>
     <div class="emg"><div><b class="sth">📱 Podľa obrazovky</b>${bars(d.by_screen,"s",sn)}</div><div><b class="sth">👤 Podľa roly</b>${bars(d.by_role,"r",rn)}</div></div>
     <b class="sth" style="margin-top:12px">📊 10 najčastejších chýb</b><div class="emt">${(d.top||[]).map(x=>`<div class="eme"><span class="n">${E(x.n)}×</span><div><p>${E(x.m)}</p><small>${E(KN[x.k]||x.k||"")} · ${E(sn(x.s))} · naposledy ${E(dt(x.last))} · ${E((x.roles||[]).map(rn).join(", "))}${x.u>1?` · ${E(x.u)} zariadení`:""}${x.dev?` · ${E(x.dev)}`:""}${x.ver?` · verzia ${E(x.ver)}`:""}</small></div></div>`).join("")||`<div class="s">✅ Žiadne chyby ${per}.</div>`}</div>`;
    const l=d.login||{};
    h+=`<b class="sth" style="margin-top:12px">🔐 Prihlásenia ${per}</b><div class="emk"><div><b>${l.ok||0}</b><small>úspešné</small></div><div class="${l.fail?"bad":""}"><b>${l.fail||0}</b><small>neúspešné</small></div><div><b>${l.link_sent||0}</b><small>odkaz odoslaný</small></div><div class="${l.link_fail?"bad":""}"><b>${l.link_fail||0}</b><small>odkaz neodišiel / vypršal</small></div></div>
     ${(l.last_fail||[]).length?`<div class="emt">${l.last_fail.map(x=>`<div class="eme"><span class="n">${x.ev==="link_fail"?"✉️":"🔒"}</span><div><p>${E(x.w||"neznámy používateľ")}</p><small>${E(dt(x.at))} · ${E({fail:"nesprávne heslo",code_fail:"nesprávny kód",link_fail:"odkaz / e-mail"}[x.ev]||x.ev)}${x.c?` · ${E(x.c)}`:""}${x.dev?` · ${E(x.dev)}`:""}</small></div></div>`).join("")}</div>`:""}
     <div class="s" style="margin-top:6px">Viac ako 3 neúspešné pokusy toho istého človeka za 15 min = push priorita 4.</div>`}
  return h+`</div></div>`};
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emd],[data-emr]");if(!t)return;
  if(t.dataset.emd){S.d=+t.dataset.emd;S.data=null}S.at=0;load();RS()});
})();
