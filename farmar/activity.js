// ===== ERNTE · AKTIVITA TÍMU =====
// Zamestnanci: zaznamenáva sa, ktorú časť aplikácie otvoria, ako dlho v nej sú a aké tlačidlá použijú (nikdy nie obsah, ktorý píšu).
// Majiteľ: v Tíme karta „Aktivita tímu“ (dnes / 7 dní), Súhrn teraz; každú hodinu súhrn v ERNTE AI Podpore.
(function(){
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-avedit]");if(!b||typeof teamEdit!=="function")return;e.preventDefault();e.stopPropagation();teamEdit(b.dataset.avedit)},true);
const Q=[];let ctx=null,since=0,ME_E="",on=false,fT=null;
const dev=()=>{const u=navigator.userAgent;const os=/iPhone|iPad/.test(u)?"iPhone":/Android/.test(u)?"Android":/Windows/.test(u)?"Windows":/Mac/.test(u)?"Mac":"iné";
  const b=/SamsungBrowser/.test(u)?"Samsung Internet":/EdgA?\//.test(u)?"Edge":/CriOS|Chrome\//.test(u)?"Chrome":/Firefox/.test(u)?"Firefox":/Safari/.test(u)?"Safari":"prehliadač";
  return os+" · "+b+(matchMedia("(display-mode: standalone)").matches?" · ikona":"")};
const staffOn=()=>typeof ROLE!=="undefined"&&ROLE&&ROLE!=="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof ME!=="undefined"&&ME&&ME.email;
function push(r){if(!on)return;Q.push(Object.assign({email:ME_E,at:new Date().toISOString()},r));if(Q.length>=25)flush();else{clearTimeout(fT);fT=setTimeout(flush,15000)}}
async function flush(){if(!Q.length)return;const b=Q.splice(0,Q.length);try{const r=await sb.from("app_activity").insert(b);if(r.error&&!/app_activity|relation|schema cache/i.test(r.error.message))Q.unshift(...b.slice(-50))}catch(e){Q.unshift(...b.slice(-50))}}
function cur(){if(typeof TAB==="undefined")return null;let c=TAB;try{if(TAB==="fleet"&&STATE.fsec)c+=":"+STATE.fsec}catch(e){}return c}
function mark(){if(!on||document.hidden)return;const c=cur();if(c===ctx)return;close();ctx=c;since=Date.now()}
function close(){if(ctx&&since){const s=Math.round((Date.now()-since)/1000);if(s>=2)push({kind:"tab",what:ctx,dur_s:Math.min(s,43200)})}since=0}
function start(){if(on||!staffOn())return;on=true;ME_E=String(ME.email).toLowerCase();push({kind:"session",what:"otvorenie aplikácie",dev:dev()});mark();
  const _r=window.renderStaff;if(typeof _r==="function"&&!_r.__aa){window.renderStaff=function(){const x=_r.apply(this,arguments);try{mark()}catch(e){}return x};Object.keys(_r).forEach(k=>{try{if(!(k in window.renderStaff))window.renderStaff[k]=_r[k]}catch(x){}});window.renderStaff.__aa=1}
  setInterval(()=>{if(!document.hidden&&ctx){close();since=Date.now()}flush()},60000)}
document.addEventListener("visibilitychange",()=>{if(!on)return;if(document.hidden){close();flush()}else{since=Date.now();if(!ctx)mark()}});
addEventListener("pagehide",()=>{if(on){close();flush()}});
// odhlásenie: zápis „end“ ešte pred odhlásením (upozornenie majiteľovi „Odhlásenie“)
const _bl=window.ernteBeforeLogout;window.ernteBeforeLogout=async function(){try{if(_bl)await _bl()}catch(e){}if(!on)return;close();push({kind:"end",what:"odhlásenie",dev:dev()});await flush()};
// akcie: tlačidlá a formuláre – zaznamená sa iba názov tlačidla a časť aplikácie
const SKIP="[data-tab],[data-fsec],[data-dstheme],.ds-theme,summary";
document.addEventListener("click",e=>{if(!on)return;const b=e.target.closest("button,a.btn");if(!b||b.closest(SKIP)||b.matches(SKIP)||!b.closest("#app"))return;
  const t=String(b.innerText||b.getAttribute("aria-label")||b.title||"").replace(/\s+/g," ").trim().slice(0,70);if(!t||/^[\d\s,.]+$/.test(t))return;push({kind:"action",what:t,detail:"@"+(cur()||"")})},true);
document.addEventListener("submit",e=>{if(!on)return;const f=e.target;if(!f.closest||!f.closest("#app"))return;const b=f.querySelector("button[type=submit],button:not([type])");
  push({kind:"action",what:"Uložil: "+String((b&&b.innerText)||f.id||"formulár").replace(/\s+/g," ").trim().slice(0,60),detail:"@"+(cur()||"")})},true);
// spustenie po prihlásení zamestnanca
const _ss=window.startStaff;if(typeof _ss==="function")window.startStaff=async function(){const r=await _ss.apply(this,arguments);try{start()}catch(e){}return r};
setTimeout(()=>{try{start()}catch(e){}},4000);

// ===== MAJITEĽ: karta Aktivita tímu =====
let AV={per:"d",data:null,sum:null,open:null};
const LBL=w=>{const [a,b]=String(w||"").split(":");const T={home:"Prehľad",req:"Požiadavky",price:"Cenník",trans:"Doprava",fleet:"Flotila",deals:"Obchody / vývoz",farm:"Farmári",wx:"Počasie",team:"Tím",calc:"Kalkulačka",zuct:"Zúčtovanie",agro:"Agro služby"},
  S={dash:"Prehľad",fuel:"Nafta",alarm:"Alarmy",drv:"Vodiči",veh:"Vozidlá",map:"Mapa",set:"Nastavenia",perf:"Prevádzka",money:"Peniaze",yard:"Dvor",moves:"Pohyby"};return (T[a]||a)+(b?" › "+(S[b]||b):"")};
const mm=s=>s>=3600?Math.floor(s/3600)+" h "+Math.round((s%3600)/60)+" min":s>=60?Math.round(s/60)+" min":s+" s";
async function avLoad(){AV.data=null;const from=new Date();if(AV.per==="d")from.setHours(0,0,0,0);else if(AV.per==="h")from.setTime(Date.now()-3600e3);else from.setTime(Date.now()-7*864e5);
  const r=await sb.from("app_activity").select("at,email,name,role,kind,what,detail,dur_s,dev").gte("at",from.toISOString()).order("at",{ascending:false}).limit(5000);
  AV.data=r.error?{err:r.error.message}:r.data||[];if(typeof TAB!=="undefined"&&TAB==="team")renderStaff()}
function avHTML(){if(ROLE!=="owner")return "";const D=AV.data;if(D===null){avLoad();return `<div class="card"><div class="s">Načítavam aktivitu tímu…</div></div>`}
  let h=`<details class="card hsec avc" open><summary><span>📊</span><b>Aktivita tímu v aplikácii</b><small>kto · kde · ako dlho · čo robil · súhrn každú hodinu v AI Podpore</small></summary><div class="avb">
   <div class="btns seg2">${[["h","Posledná hodina"],["d","Dnes"],["w","7 dní"]].map(x=>`<button type="button" data-avper="${x[0]}" aria-pressed="${AV.per===x[0]}">${x[1]}</button>`).join("")}</div>`;
  if(D.err)return h+`<div class="s">${/app_activity/.test(D.err)?"Aktivita sa zapne po aktualizácii databázy (pár minút).":esc(D.err)}</div></div></details>`;
  const P={};for(const r of D){const p=P[r.email]=P[r.email]||{n:r.name||((STATE.staff||[]).find(x=>String(x.email).toLowerCase()===r.email)||{}).name||r.email,role:r.role,sec:0,ses:0,act:0,tabs:{},acts:[],last:r.at,first:r.at,dev:new Set()};
    if(r.at>p.last)p.last=r.at;if(r.at<p.first)p.first=r.at;if(r.dev)p.dev.add(r.dev);
    if(r.kind==="tab"){p.sec+=+r.dur_s||0;p.tabs[r.what]=(p.tabs[r.what]||0)+(+r.dur_s||0)}else if(r.kind==="session")p.ses++;else if(r.kind==="action"){p.act++;if(p.acts.length<40)p.acts.push(r)}}
  const L=Object.entries(P).sort((a,b)=>b[1].sec-a[1].sec),tot=L.reduce((s,x)=>s+x[1].sec,0);
  h+=`<div class="hrk"><div><small>Aktívnych ľudí</small><b>${L.length}</b></div><div><small>Čas v aplikácii spolu</small><b>${mm(tot)}</b></div><div><small>Akcií</small><b>${L.reduce((s,x)=>s+x[1].act,0)}</b></div><div><small>Otvorení aplikácie</small><b>${L.reduce((s,x)=>s+x[1].ses,0)}</b></div></div>`;
  if(!L.length)h+=`<div class="s">V tomto období nikto z tímu aplikáciu nepoužíval.</div>`;
  h+=L.map(([em,p])=>{const T=Object.entries(p.tabs).sort((a,b)=>b[1]-a[1]),mx=T.length?T[0][1]:1,op=AV.open===em,ago=Math.round((Date.now()-new Date(p.last))/60000);
    return `<div class="avp"><button type="button" class="avh" data-avopen="${esc(em)}"><span class="ds-av">${esc((typeof dsIni==="function"?dsIni(p.n):p.n.slice(0,2)))}</span><span><b>${esc(p.n)}</b><small>${ago<3?"🟢 práve teraz":ago<60?"pred "+ago+" min":"naposledy "+new Date(p.last).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})} · ${[...p.dev].map(esc).join(", ")||"–"}</small></span><span class="avt"><b>${mm(p.sec)}</b><small>${p.act} akcií</small></span></button>
     ${typeof teamEdit==="function"&&(STATE.staff||[]).some(x=>String(x.email).toLowerCase()===String(em).toLowerCase())?`<div class="btns avedit"><button type="button" data-avedit="${esc(em)}">✏️ Upraviť údaje a meno</button></div>`:""}<div class="avbars">${T.slice(0,6).map(([w,s])=>`<div class="avbar"><span>${esc(LBL(w))}</span><i style="--w:${Math.max(4,s/mx*100)}%"></i><b>${mm(s)}</b></div>`).join("")||`<div class="s">Iba otvoril aplikáciu.</div>`}</div>
     ${op?`<div class="avacts">${p.acts.map(a=>`<div><time>${new Date(a.at).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}</time><span>${esc(a.what)}</span><small>${esc(LBL(String(a.detail||"").replace(/^@/,"")))}</small></div>`).join("")||`<div class="s">Žiadne akcie.</div>`}</div>`:p.acts.length?`<div class="s">Posledná akcia: ${esc(p.acts[0].what)} · ${esc(LBL(String(p.acts[0].detail||"").replace(/^@/,"")))} – ťukni na meno pre všetky</div>`:""}</div>`}).join("");
  h+=`<div class="btns"><button type="button" class="pri" data-avsum="1">🧾 Súhrn teraz do AI Podpory</button><button type="button" data-avref="1">↻ Obnoviť</button></div>
   <div class="s">Zaznamenáva sa iba to, ktorú časť aplikácie má človek otvorenú, ako dlho, a názvy tlačidiel, ktoré použil – nie obsah, ktorý píše. Zamestnanci sú o tom v aplikácii informovaní. Záznamy sa mažú po 180 dňoch.</div></div></details>`;
  return h}
const _vt=window.vTeam;if(typeof _vt==="function")window.vTeam=function(){return avHTML()+_vt.apply(this,arguments)};
document.addEventListener("click",async e=>{if(typeof ROLE==="undefined"||ROLE!=="owner")return;let x;
  if(x=e.target.closest("[data-avper]")){AV.per=x.dataset.avper;AV.open=null;avLoad();renderStaff();return}
  if(x=e.target.closest("[data-avopen]")){AV.open=AV.open===x.dataset.avopen?null:x.dataset.avopen;renderStaff();return}
  if(e.target.closest("[data-avref]")){avLoad();return}
  if(x=e.target.closest("[data-avsum]")){busy(x,true);const r=await sb.rpc("activity_report",{p_hours:AV.per==="w"?168:AV.per==="d"?Math.max(1,Math.ceil((Date.now()-new Date().setHours(0,0,0,0))/3600e3)):1});busy(x,false);
    if(r.error){toast(/activity_report/.test(r.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":"Chyba: "+r.error.message,6000);return}toast("✓ Súhrn je v ERNTE AI Podpore (tlačidlo Podpora hore).",6000)}});
// informovanie zamestnanca (jednorazovo)
const _vh=window.vHome;if(typeof _vh==="function")window.vHome=function(){let h=_vh.apply(this,arguments);let seen=false;try{seen=localStorage.getItem("ernte_aa_info")==="1"}catch(e){}
  if(staffOn()&&!seen)h=`<div class="card avinfo"><div class="s">ℹ️ <b>Informácia pre zamestnancov:</b> aplikácia zaznamenáva, ktoré časti používate, ako dlho a aké tlačidlá stlačíte (nie obsah, ktorý píšete). Slúži to na zlepšovanie aplikácie a organizáciu práce vo firme. Záznamy sa mažú po 180 dňoch.</div><div class="btns"><button type="button" data-aainfo="1">Rozumiem</button></div></div>`+h;return h};
document.addEventListener("click",e=>{if(e.target.closest("[data-aainfo]")){try{localStorage.setItem("ernte_aa_info","1")}catch(x){}renderStaff()}});
})();
