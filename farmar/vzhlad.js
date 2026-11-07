// ===== 🎨 NOVÝ VZHĽAD ERNTE (6. 11. 2026 PRÍKAZ MAJITEĽA – zadanie „ERNTE Trade & Logistic UI/UX redizajn“) =====
// IBA Martin a Jana (ROLE owner, nie „Pozrieť ako“ ani Test) – tím a farmári ostávajú na doterajšom vzhľade.
// • tmavý režim s vysokým kontrastom: pozadie #060913, karty #0B0F19; 6. 11. 07:42 PRÍKAZ MAJITEĽA: pôvodné farby ERNTE – zelená #b6ff3b (→ mint #5eead4), azúrová #22d3ee, oranžová #ffcf5a, azúrová #22d3ee
// • spodná lišta 5 tlačidiel (Prehľad, Logistika, Zmluvy, Trh a ceny, Správy) s tenkými ikonami; ostatné sekcie v menu podľa oblastí (7)
// • na počítači bočný panel s oblasťami; rýchle hľadanie Ctrl+K / ⌘K (zmluva, ŠPZ, farmár, sekcia)
// • Prehľad: veľké čísla (nedodané tony, aktívne zmluvy, kritické alarmy flotily, reklamácie) – rd_kpi() + pracovné nástroje
// Pôvodná lišta nav.tabs ostáva v stránke (skrytá) – prepínanie sekcií ide cez jej tlačidlá, takže všetky moduly fungujú ako doteraz.
(function(){
const H=document.documentElement;
const OK=()=>{try{return typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST}catch(x){return false}};
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const nf=(n,d=0)=>(+n||0).toLocaleString("sk-SK",{maximumFractionDigits:d,minimumFractionDigits:0});
const eur=n=>{n=+n||0;return Math.abs(n)>=1e6?nf(n/1e6,2)+" mil. €":Math.abs(n)>=1e4?nf(n/1e3,0)+" tis. €":nf(n,0)+" €"};
const soon=f=>(window.ernteSoon||requestAnimationFrame)(f);
const PC=()=>H.classList.contains("pc")&&H.classList.contains("pc-in");

// ---- tenké ikony (vlastné, 24 × 24, čiara 1,8) ----
const P={
 home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
 truck:'<path d="M2 6h12v10H2z"/><path d="M14 9h4l4 4v3h-8"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
 file:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/>',
 chart:'<path d="M3 20h18"/><path d="M5 16l4-5 3 3 6-7"/><path d="M15 7h3v3"/>',
 msg:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
 grid:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 pen:'<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
 user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
 sprout:'<path d="M12 21v-9"/><path d="M12 12c0-4 3-7 8-7 0 4-3 7-8 7z"/><path d="M12 14c0-3-2.5-5-7-5 0 3 2.5 5 7 5z"/>',
 inbox:'<path d="M3 13 6 5h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
 waves:'<path d="M3 8c3-2 6 2 9 0s6-2 9 0"/><path d="M3 13c3-2 6 2 9 0s6-2 9 0"/><path d="M3 18c3-2 6 2 9 0s6-2 9 0"/>',
 receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
 tractor:'<circle cx="7" cy="16" r="3.5"/><circle cx="18" cy="17" r="2.5"/><path d="M7 12.5V6h6l2 6.5"/><path d="M10.5 16h5"/><path d="M15 12.5h4v2"/>',
 bag:'<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
 book:'<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
 pin:'<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
 users:'<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.3.2 4 1.8 4.6 4.8"/>',
 idcard:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13h3"/>',
 cloud:'<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-1 9z"/>',
 bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
 spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
 shield:'<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="m9 12 2 2 4-4"/>',
 coins:'<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"/><path d="M10 15.5c.6 1.5 2.6 2.5 5 2.5 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5"/>',
 flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>',
 scale:'<path d="M12 4v16M7 20h10"/><path d="M5 8h14"/><path d="M5 8 2.5 14a2.6 2.6 0 0 0 5 0z"/><path d="M19 8l-2.5 6a2.6 2.6 0 0 0 5 0z"/>',
 alert:'<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
 claim:'<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16h.01"/>',
 map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
 dot:'<circle cx="12" cy="12" r="3"/>'};
const ico=(k,c)=>`<svg class="rdi${c?" "+c:""}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[k]||P.dot}</svg>`;
window.rdIco=ico;

// ---- sekcie → ikona, oblasti (menu), spodná lišta ----
const TI={home:"home",deals:"file",qd:"pen",farm:"user",price:"tag",nu:"sprout",req:"inbox",danube:"waves",zuct:"receipt",calc:"calc",agro:"tractor",trus:"bag",evid:"book",
 trans:"truck",fleet:"pin",team:"users",klient:"idcard",wx:"cloud",nov:"bell",cal:"cal",pred:"spark",iscc:"shield",inv:"coins",test:"flask"};
const AREAS=[
 {k:"obchod",t:"Obchod a nákup",c:"#b6ff3b",tabs:["deals","qd","farm","price","nu","req"]},
 {k:"predaj",t:"Obchod a predaj · Danube",c:"#5eead4",tabs:["danube","zuct"]},
 {k:"sluzby",t:"Služby ERNTE a špeciál",c:"#ffcf5a",tabs:["calc","agro","trus","evid"]},
 {k:"doprava",t:"Doprava a flotila",c:"#22d3ee",tabs:["trans","fleet"]},
 {k:"tim",t:"Partneri a tím",c:"#94A3B8",tabs:["team","klient"]},
 {k:"nastroje",t:"Operatívne nástroje",c:"#22d3ee",tabs:["home","wx","nov","cal"]},
 {k:"ai",t:"Algomancia AI a správa",c:"#7cc4ff",tabs:["pred","iscc","inv","test"]}];
const BAR=[
 {k:"home",t:"Prehľad",i:"home",tabs:["home"]},
 {k:"log",t:"Logistika",i:"truck",tabs:["fleet","trans"]},
 {k:"zml",t:"Zmluvy",i:"file",tabs:["deals","qd","zuct","danube"]},
 {k:"trh",t:"Trh a ceny",i:"chart",tabs:["price","nu","pred"]},
 {k:"spr",t:"Správy",i:"msg",tabs:["req","nov","cal"]}];
window.rdTabIco=t=>OK()?ico(TI[t]||"dot"):null;
const DESC=k=>{try{return (window.TABD||{})[k]||""}catch(x){return ""}};
/* 7. 11. 17:49 „zjednoduš“ (bod 4): sekcie, ktoré si 30 dní neotvoril, idú do „Menej používané“ (nič sa nezmaže, Hľadať ich nájde);
   najpoužívanejšie sú v každej oblasti prvé. Kým nie sú údaje o používaní (ownertabs.js / tab_use), ukáže sa všetko ako doteraz. */
function useT(){try{return window.ernteTabUse?window.ernteTabUse():null}catch(x){return null}}
function used(k,T){if(!T||k==="home"||k===cur())return true;const A=T.U||{},B=T.DB||{};
  const hasL=Object.values(B).some(x=>x&&x.l)||Object.values(A).some(x=>x&&x.l);if(!hasL)return true;
  const l=Math.max(Date.parse((B[k]||{}).l||"")||0,(A[k]||{}).l||0);return l>Date.now()-30*864e5}
function uScore(k,T){if(!T)return 0;return Math.max(((T.U||{})[k]||{}).n||0,((T.DB||{})[k]||{}).n||0)}
function split(ks,TT){const T=useT();const on=[],off=[];for(const k of ks){if(used(k,T)||((TT||{})[k]||{}).n)on.push(k);else off.push(k)}on.sort((a,b)=>uScore(b,T)-uScore(a,T));return {on,off}}

// dostupné sekcie (z pôvodnej lišty)
function tabs(){const m={};document.querySelectorAll("#app>nav.tabs [data-tab]").forEach(b=>{const k=b.dataset.tab;const l=b.querySelector(".tl"),c=b.querySelector(".cnt");
  m[k]={k,t:(l?l.textContent:b.textContent).trim(),n:c?(parseInt(c.textContent,10)||0):0}});return m}
function cur(){try{return typeof TAB!=="undefined"?TAB:""}catch(x){return ""}}
function go(k){closeMenu();const b=document.querySelector(`#app>nav.tabs [data-tab="${k}"]`);if(b){b.click();scrollTo({top:0})}else{try{TAB=k;renderStaff();scrollTo({top:0})}catch(x){}}}
const LK=g=>"ernte-rd-g-"+g;
function remember(){const t=cur();BAR.forEach(g=>{if(g.tabs.includes(t))try{localStorage.setItem(LK(g.k),t)}catch(x){}})}
function barGo(g){const T=tabs();let t="";try{t=localStorage.getItem(LK(g.k))||""}catch(x){}
  if(!T[t])t=g.tabs.find(x=>T[x])||"";if(t)go(t);else openMenu()}

// ---- spodná lišta (mobil, tablet) ----
function bar(){let b=document.getElementById("rdBar");if(!OK()){if(b)b.remove();return}const T=tabs(),t=cur();
  if(!b){b=document.createElement("nav");b.id="rdBar";b.setAttribute("aria-label","Hlavné menu");document.body.appendChild(b)}
  const h=BAR.map(g=>{const av=g.tabs.filter(x=>T[x]);if(!av.length)return "";const n=av.reduce((s,x)=>s+T[x].n,0);
    return `<button type="button" data-rdbar="${g.k}" class="${g.tabs.includes(t)?"on":""}" aria-current="${g.tabs.includes(t)?"page":"false"}">${ico(g.i)}<span>${E(g.t)}</span>${n?`<i class="rdc">${n>99?"99+":n}</i>`:""}</button>`}).join("");
  if(b.dataset.h!==h){b.innerHTML=h;b.dataset.h=h}}
// ---- bočný panel (počítač) ----
function side(){let s=document.getElementById("rdSide");if(!OK()||!PC()){if(s)s.remove();return}const T=tabs(),t=cur();
  if(!s){s=document.createElement("nav");s.id="rdSide";s.setAttribute("aria-label","Sekcie");document.body.appendChild(s)}
  const it=k=>T[k]?`<button type="button" data-rdgo="${k}" class="${k===t?"on":""}">${ico(TI[k])}<span>${E(T[k].t)}</span>${T[k].n?`<i class="rdc">${T[k].n}</i>`:""}</button>`:"";
  const h=`<button type="button" class="rdsf" data-rdfind>${ico("search")}<span>Hľadať…</span><kbd>${/Mac/.test(navigator.platform)?"⌘":"Ctrl"} K</kbd></button>${it("home")}`+
   (()=>{const OFF=[];const h=AREAS.map(a=>{const sp=split(a.tabs.filter(k=>k!=="home"&&T[k]),T);OFF.push(...sp.off);if(!sp.on.length)return "";return `<div class="rdsa"><b style="--ac:${a.c}">${E(a.t)}</b>${sp.on.map(it).join("")}</div>`}).join("");
     const usedA=new Set(AREAS.flatMap(a=>a.tabs));const sp=split(Object.keys(T).filter(k=>!usedA.has(k)),T);OFF.push(...sp.off);
     return h+(sp.on.length?`<div class="rdsa"><b>Ďalšie</b>${sp.on.map(it).join("")}</div>`:"")+(OFF.length?`<details class="rdsa rdless"><summary><b>Menej používané (${OFF.length})</b></summary>${OFF.map(it).join("")}</details>`:"")})();
  if(s.dataset.h!==h){s.innerHTML=h;s.dataset.h=h;const a=s.querySelector("button.on");if(a)a.scrollIntoView({block:"nearest"})}}
// ---- podsekcie oblasti hore (mobil, tablet) ----
function sub(){const app=document.getElementById("app");if(!app)return;let el=app.querySelector(":scope>#rdSub");if(!OK()||PC()){if(el)el.remove();return}
  const T=tabs(),t=cur(),a=AREAS.find(x=>x.tabs.includes(t)&&t!=="home");const L=a?split(a.tabs.filter(k=>k!=="home"&&T[k]),T).on:[];
  if(L.length<2){if(el)el.remove();return}
  const h=`<b style="--ac:${a.c}">${E(a.t)}</b><div>${L.map(k=>`<button type="button" data-rdgo="${k}" class="${k===t?"on":""}">${ico(TI[k])}<span>${E(T[k].t)}</span>${T[k].n?`<i class="rdc">${T[k].n}</i>`:""}</button>`).join("")}<button type="button" data-rdmenu>${ico("grid")}<span>Všetky sekcie</span></button></div>`;
  if(!el){el=document.createElement("div");el.id="rdSub"}
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}
  const anchor=app.querySelector(":scope>section.ehb")||app.querySelector(":scope>nav.tabs");if(anchor&&el.parentNode!==app)anchor.after(el);if(window.ernteTopOrder)window.ernteTopOrder();else if(anchor&&anchor.nextElementSibling!==el)anchor.after(el);
  const on=el.querySelector("button.on");if(on&&on.offsetLeft)el.querySelector("div").scrollLeft=Math.max(0,on.offsetLeft-60)}
// ---- tlačidlá v hlavičke: Menu a Hľadať ----
function head(){const h=document.querySelector("header.top");if(!h)return;let m=document.getElementById("rdHead");if(!OK()){if(m)m.remove();return}
  if(!m){m=document.createElement("div");m.id="rdHead";m.innerHTML=`<button type="button" data-rdmenu aria-label="Menu – všetky sekcie">${ico("grid")}<span>Menu</span></button><button type="button" data-rdfind aria-label="Hľadať (Ctrl+K)">${ico("search")}<span>Hľadať</span></button>`}
  if(m.previousElementSibling!==h)h.after(m)}

// ---- menu podľa oblastí + hľadanie (jedno okno) ----
let IDX=null,VEH=null,SEL=0,RES=[];
function openMenu(find){if(!OK())return;let m=document.getElementById("rdMenu");if(!m){m=document.createElement("div");m.id="rdMenu";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Menu a hľadanie");document.body.appendChild(m)}
  m.innerHTML=`<div class="rdmb"><div class="rdmh"><label class="rdmq">${ico("search")}<input type="search" id="rdQ" placeholder="Hľadať čokoľvek – sekciu, zmluvu, farmára, odberateľa, ŠPZ, lístok…" autocomplete="off" enterkeyhint="search"></label><button type="button" class="rdmx" data-rdclose aria-label="Zavrieť">${ico("x")}</button></div><div class="rdml" id="rdML"></div></div>`;
  m.hidden=false;document.body.classList.add("rdmo");areas();const q=m.querySelector("#rdQ");q.addEventListener("input",()=>find2(q.value));q.addEventListener("keydown",keys);
  if(find||matchMedia("(hover:hover) and (pointer:fine)").matches)setTimeout(()=>q.focus(),30);loadVeh()}
function closeMenu(){const m=document.getElementById("rdMenu");if(m){m.hidden=true;m.innerHTML=""}document.body.classList.remove("rdmo")}
function areas(){const L=document.getElementById("rdML");if(!L)return;const T=tabs(),t=cur();RES=[];
  const tile=k=>T[k]?`<button type="button" class="rdmt${k===t?" on":""}" data-rdgo="${k}">${ico(TI[k])}<span><b>${E(T[k].t)}</b>${DESC(k)?`<small>${E(DESC(k).split(/[.–]/)[0])}</small>`:""}</span>${T[k].n?`<i class="rdc">${T[k].n}</i>`:""}</button>`:"";
  const usedA=new Set(AREAS.flatMap(a=>a.tabs)),RS=split(Object.keys(T).filter(k=>!usedA.has(k)),T),rest=RS.on,OFF=RS.off.slice();
  const AS=AREAS.map(a=>{const sp=split(a.tabs.filter(k=>k!=="home"&&T[k]),T);OFF.push(...sp.off);return [a,sp.on]});
  L.innerHTML=`<div class="rdma rdm0"><div class="rdmg">${tile("home")}${document.querySelector("#app>nav.tabs [data-uvod]")?`<button type="button" class="rdmt" data-rduvod>${ico("sun")}<span><b>Úvod LIVE</b><small>burza, počasie, ceny</small></span></button>`:""}</div></div>`+
   AS.map(([a,ks])=>ks.length?`<div class="rdma"><h3 style="--ac:${a.c}">${E(a.t)}</h3><div class="rdmg">${ks.map(tile).join("")}</div></div>`:"").join("")+
   (rest.length?`<div class="rdma"><h3>Ďalšie</h3><div class="rdmg">${rest.map(tile).join("")}</div></div>`:"")+
   (OFF.length?`<details class="rdma rdless"><summary><h3>Menej používané (${OFF.length}) – 30 dní si ich neotvoril</h3></summary><div class="rdmg">${OFF.map(tile).join("")}</div></details>`:"")}
async function loadVeh(){if(VEH||typeof sb==="undefined"||!sb)return;VEH=[];try{const r=await sb.from("cmd_vehicles").select("*");VEH=(r.data||[]).map(v=>({id:v.id,p:v.plate||"",n:v.name||"",r:v.region||""}))}catch(x){}}
function index(){const S=typeof STATE!=="undefined"&&STATE?STATE:{},F={};(S.farmers||[]).forEach(f=>F[f.id]=f);
  const D=[...(S.deals||[]),...(S.dealsArch||[])];return {D,F:S.farmers||[],FM:F}}
function find2(q){const L=document.getElementById("rdML");if(!L)return;const n=N(q).trim();if(!n){areas();return}if(window.ernteFindUI&&window.ernteFindUI(q,L,R=>{RES=R;SEL=0}))return; /* 7. 11.: hľadá všetko – hladat.js */
  if(!window.ernteFindUI&&!window.__hlLoad){window.__hlLoad=1;const s=document.createElement("script");s.src="hladat.js?v=20261107-1830";s.onload=()=>{const i=document.getElementById("rdQ");if(i&&i.value.trim())find2(i.value)};document.head.appendChild(s)} /* 7. 11. 14:47: hľadanie sa nenačítalo → načítať a hľadať znova */const I=index(),T=tabs(),R=[],nd=n.replace(/\s/g,"");
  Object.values(T).forEach(t=>{if(N(t.t).includes(n))R.push({g:"Sekcie",i:TI[t.k]||"dot",t:t.t,s:"otvoriť sekciu",a:()=>go(t.k)})});
  let c=0;for(const d of I.D){if(c>=8)break;const f=I.FM[d.farmer_id]||{},hay=N([d.no,f.name,d.com,d.term].join(" "));
    if(hay.includes(n)||(nd&&N(d.no||"").replace(/\s/g,"").includes(nd))){c++;R.push({g:"Zmluvy",i:"file",t:(d.no||"bez čísla")+" · "+(f.name||""),s:[typeof comName==="function"?comName(d.com):d.com,d.tons?nf(d.tons,1)+" t":"",d.status].filter(Boolean).join(" · "),a:()=>openDeal(d)})}}
  c=0;for(const f of I.F){if(c>=8)break;const hay=N([f.name,f.addr,f.email,f.phone].join(" "));if(hay.includes(n)||(nd&&String(f.ico||"").replace(/\s/g,"").includes(nd))){c++;R.push({g:"Farmári",i:"user",t:f.name||"",s:[f.ico?"IČO "+f.ico:"",f.addr||""].filter(Boolean).join(" · "),a:()=>openFarmer(f)})}}
  c=0;for(const v of VEH||[]){if(c>=8)break;if(N(v.p).replace(/[\s-]/g,"").includes(nd.replace(/-/g,""))||N(v.n).includes(n)){c++;R.push({g:"Vozidlá",i:"truck",t:v.p||v.n,s:[v.n,v.r].filter(Boolean).join(" · "),a:()=>openVeh(v)})}}
  RES=R;SEL=0;if(!R.length){L.innerHTML=`<div class="rdmn">Nič sa nenašlo pre „${E(q)}“.${VEH&&!VEH.length?" Vozidlá sa ešte načítavajú.":""}</div>`;return}
  let g="",h="";R.forEach((r,i)=>{if(r.g!==g){g=r.g;h+=`<h3>${E(g)}</h3>`}h+=`<button type="button" class="rdmr${i===SEL?" sel":""}" data-rdres="${i}">${ico(r.i)}<span><b>${E(r.t)}</b>${r.s?`<small>${E(r.s)}</small>`:""}</span></button>`});L.innerHTML=h}
function keys(e){if(e.key==="Escape"){closeMenu();return}if(!RES.length)return;if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();SEL=(SEL+(e.key==="ArrowDown"?1:-1)+RES.length)%RES.length;
  document.querySelectorAll("#rdML .rdmr").forEach((b,i)=>{b.classList.toggle("sel",i===SEL);if(i===SEL)b.scrollIntoView({block:"nearest"})})}
  else if(e.key==="Enter"){e.preventDefault();const r=RES[SEL];if(r)r.a()}}
function flash(el){if(!el)return;el.scrollIntoView({block:"center",behavior:"smooth"});el.classList.add("rdflash");setTimeout(()=>el.classList.remove("rdflash"),2600)}
function after(fn,tries=24){let n=0;const t=setInterval(()=>{n++;let ok=false;try{ok=fn()}catch(x){}if(ok||n>=tries)clearInterval(t)},250)}
function openDeal(d){try{if(window.rokOk&&!rokOk(d)&&window.rokSet){const y=window.rokOf&&rokOf(d);rokSet(y||"")}}catch(x){}go("deals");
  after(()=>{const el=document.querySelector(`#app [data-deal="${CSS.escape(String(d.id))}"]`);if(el){flash(el.closest(".card,.dcard,li,div")||el);return true}
    const no=String(d.no||"");if(!no)return false;const c=[...document.querySelectorAll("#app .card")].find(x=>x.textContent.includes(no));if(c){flash(c);return true}return false})}
function openFarmer(f){try{FQ=f.name||""}catch(x){}go("farm");after(()=>{const c=[...document.querySelectorAll("#app .card")].find(x=>f.name&&x.textContent.includes(f.name)&&!x.closest("#rdSub"));if(c){flash(c);return true}return false})}
function openVeh(v){go("fleet");after(()=>{try{if(typeof STATE==="undefined"||!STATE.fleet)return false;const b=document.createElement("button");b.hidden=true;b.dataset.aveh=v.id;document.body.appendChild(b);b.click();b.remove();
  setTimeout(()=>{const el=document.querySelector("#app .xv.open,#app .xv.o")||[...document.querySelectorAll("#app .xv,#app .card")].find(x=>v.p&&x.textContent.includes(v.p));flash(el)},700);return true}catch(x){return false}},40)}

// ---- Prehľad: veľké čísla (Bento) + pracovné nástroje – údaje rd_kpi() ----
let K=null,KAT=0,KBUSY=false;
async function loadK(force){if(!OK()||KBUSY||typeof sb==="undefined"||!sb)return;if(!force&&K&&Date.now()-KAT<240e3)return;KBUSY=true;
  try{const r=await sb.rpc("rd_kpi");if(r.error&&!K){K={err:1};KAT=Date.now()}if(!r.error&&r.data){const ch=JSON.stringify(r.data)!==JSON.stringify(K);K=r.data;KAT=Date.now();if(ch&&cur()==="home"){const s=document.querySelector("#app>section.ehb");if(s)s.remove();try{renderStaff()}catch(x){}}}}catch(x){}finally{KBUSY=false}}
window.rdHomeK=function(){if(!OK())return null;const S=typeof STATE!=="undefined"&&STATE?STATE:{};
  const D=(S.deals||[]).filter(d=>!d.archived&&["podpisany","odvoz"].includes(d.status)),rest=d=>Math.max(0,(+d.tons||0)-(+d.delivered_t||0)),open=D.filter(d=>rest(d)>Math.max(.05*(+d.tons||0),1));
  const kk=K&&!K.err;const t=kk?+K.nedod_t:open.reduce((s,d)=>s+rest(d),0),v=kk?+K.nedod_eur:open.reduce((s,d)=>s+rest(d)*(+d.price||0),0),z=kk?+K.zmluvy:D.length;
  const al=K&&K.alarmy?K.alarmy:null,rk=K&&K.reklam?K.reklam:null,wait=!K?"…":"–";
  return [[ico("scale"),nf(t,0)+" t","nedodané · "+eur(v),"w","deals"],[ico("file"),nf(z),"aktívne zmluvy","g","deals"],
   [ico("alert"),al?nf(al.krit):wait,al?(+al.krit?"kritické alarmy flotily · 24 h":"bez kritických alarmov · 24 h"):"alarmy flotily",al&&+al.krit?"r":"g","fleet"],
   [ico("claim"),rk?nf(rk.n):wait,rk?("reklamácie · 30 dní"+(+rk.n?" · uznané "+nf(rk.uznane):"")):"reklamácie",rk&&+rk.n?"w":"g","zuct"]]};
window.rdTools=function(){if(!OK())return "";const T=tabs();const b=(k,i,t,s)=>T[k]?`<button type="button" class="rdtl" data-rdgo="${k}">${ico(i)}<span><b>${E(t)}</b><small>${E(s)}</small></span></button>`:"";
  return `<div class="rdtools">${b("price","tag","Výkupný cenník","ceny dnes · burza")}${b("qd","pen","Nová zmluva","uzatvoriť obchod")}${b("fleet","map","Trasy live","flotila na mape")}</div>`};

// ---- udalosti ----
document.addEventListener("click",e=>{if(!OK())return;const t=e.target.closest&&e.target.closest("[data-rdbar],[data-rdgo],[data-rdmenu],[data-rdfind],[data-rdclose],[data-rdres],[data-rduvod],#rdMenu");if(!t)return;
  if(t.id==="rdMenu"){if(e.target===t)closeMenu();return}
  e.preventDefault();
  if(t.dataset.rdbar){const g=BAR.find(x=>x.k===t.dataset.rdbar);if(g)barGo(g);return}
  if(t.dataset.rdgo){go(t.dataset.rdgo);return}
  if(t.hasAttribute("data-rdmenu")){openMenu(false);return}
  if(t.hasAttribute("data-rdfind")){openMenu(true);return}
  if(t.hasAttribute("data-rdclose")){closeMenu();return}
  if(t.hasAttribute("data-rduvod")){closeMenu();const u=document.querySelector("#app>nav.tabs [data-uvod]");if(u)u.click();return}
  if(t.dataset.rdres!==undefined){const r=RES[+t.dataset.rdres];if(r)r.a();return}},true);
document.addEventListener("keydown",e=>{if(!OK())return;if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==="k"||e.key==="K")){e.preventDefault();const m=document.getElementById("rdMenu");if(m&&!m.hidden)closeMenu();else openMenu(true)}
  else if(e.key==="Escape"){const m=document.getElementById("rdMenu");if(m&&!m.hidden)closeMenu()}});
document.addEventListener("keydown",e=>{const c=e.target.closest&&e.target.closest(".ehbc[data-rdgo]");if(c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();go(c.dataset.rdgo)}});

// ---- prekreslenie ----
function all(){const ok=OK();H.classList.toggle("rd",ok);if(!ok){["rdBar","rdSide","rdHead"].forEach(i=>{const x=document.getElementById(i);if(x)x.remove()});const s=document.querySelector("#app>#rdSub");if(s)s.remove();return}
  remember();head();bar();side();sub();if(cur()==="home")loadK(false)}
let q=0;const sch=()=>{if(q)return;q=1;soon(()=>{q=0;try{all()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,400);return}new MutationObserver(sch).observe(app,{childList:true});
  new MutationObserver(sch).observe(H,{attributes:true,attributeFilter:["class"]});sch();setInterval(()=>{if(!document.hidden&&OK())loadK(true)},300e3)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
addEventListener("resize",sch);

// ---- vzhľad (iba html.rd) ----
const st=document.createElement("style");st.id="rdCss";st.textContent=`
html.rd{--rd-bg:#060913;--rd-sf:#0B0F19;--rd-sf2:#111827;--rd-bd:rgba(34,211,238,.4);--rd-bd2:rgba(34,211,238,.22);--rd-blue:#22d3ee;--rd-green:#b6ff3b;--rd-amber:#ffcf5a;--rd-cyan:#22d3ee;--rd-red:#ff6b81;--rd-tx:#FFFFFF;--rd-tx2:#94A3B8}
html.rd:not([data-theme=light]){--bg:#060913;--ds-bg1:#060913;--ds-bg2:#0B0F19;--ink:#FFFFFF;--ds-ink:#FFFFFF;--muted:#94A3B8;--ds-muted:#94A3B8;--ds-gray:#94A3B8;
 --glass:#0B0F19;--glass2:#111827;--field:#0F1524;--ds-glass:#0B0F19;--ds-glass-hi:#0B0F19;--ds-glass-lo:#0B0F19;--ds-edge:rgba(34,211,238,.4);--ds-edge-hi:rgba(34,211,238,.6);
 --line:rgba(34,211,238,.22);--line2:rgba(34,211,238,.4);--ds-blur:none;--ds-shadow:none;--ds-fallback:#0B0F19;
 --ds-ok:#b6ff3b;--ds-warn:#ffcf5a;--ds-bad:#ff6b81;--ds-acc:#22d3ee;--warn:#ffcf5a;--bad:#ff6b81;--blue:#7cc4ff;--cyan:#22d3ee;--lime:#b6ff3b;--mint:#5eead4;
 --grad:linear-gradient(135deg,#b6ff3b,#5eead4);--grad2:linear-gradient(135deg,#7c5cff,#22d3ee)}
html.rd:not([data-theme=light]),html.rd:not([data-theme=light]) body{background:#060913!important}
html.rd:not([data-theme=light]) body::before,html.rd:not([data-theme=light]) body::after,html.rd:not([data-theme=light]) #pcFacet,html.rd:not([data-theme=light]) #pcGlow{background:#060913!important;animation:none!important;opacity:1}
html.rd:not([data-theme=light]) #pcFacet,html.rd:not([data-theme=light]) #pcGlow{display:none!important}
html.rd:not([data-theme=light]) :is(.card,.kb,.vd,.xv,.xd,.pyc,.xc,.xmap,.xtl,.vfirm,.vt,.ds-g,.ds-kpi,.ds-tile,.ds-trow,.ds-fc){background:#0B0F19;border:1px solid rgba(34,211,238,.4);box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;border-radius:16px}
html.rd:not([data-theme=light]) .card :is(.card,.xd,.xv,.vt,.kb,.ds-kpi,.ds-tile){background:#111827;border-color:rgba(34,211,238,.22)}
html.rd:not([data-theme=light]) :is(.card,.kb,.vd,.xv,.xd,.pyc,.xc,.xmap,.xtl,.vfirm,.vt,.ds-g,.ds-kpi,.ds-tile,.ds-trow,.ds-fc)::before,
html.rd:not([data-theme=light]) :is(.card,.kb,.vd,.xv,.xd,.pyc,.xc,.xmap,.xtl,.vfirm,.vt,.ds-g,.ds-kpi,.ds-tile,.ds-trow,.ds-fc)::after{display:none!important}
@media (hover:hover){html.rd:not([data-theme=light]) :is(.card,.kb,.vd,.xv,.xd,.pyc,.xc,.vt,.ds-kpi,.ds-tile,.ds-trow,.ds-fc):hover{transform:none;border-color:#22d3ee;box-shadow:none}}
html.rd:not([data-theme=light]) h2{background:none;-webkit-background-clip:border-box;background-clip:border-box;color:#FFFFFF}
html.rd:not([data-theme=light]) :is(.s,small,.muted){color:#94A3B8}
html.rd:not([data-theme=light]) :is(button,.btn){background:#111827;border:1px solid rgba(34,211,238,.4);box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;color:#FFFFFF;text-shadow:none}
@media (hover:hover){html.rd:not([data-theme=light]) :is(button,.btn):hover{border-color:#22d3ee;box-shadow:none}}
html.rd:not([data-theme=light]) :is(button.pri,.btn.pri){background:linear-gradient(135deg,#b6ff3b,#5eead4);border-color:transparent;color:#05210f;font-weight:800}
html.rd:not([data-theme=light]) :is(button.lime,.btn.lime){background:#b6ff3b;border-color:#b6ff3b;color:#05210f}
html.rd:not([data-theme=light]) button.dng{background:rgba(255,107,129,.12);border-color:rgba(255,107,129,.6);color:#ffb3c0}
html.rd:not([data-theme=light]) :is(input,select,textarea){background:#0F1524;border:1px solid rgba(34,211,238,.35);box-shadow:none;color:#fff}
html.rd:not([data-theme=light]) :is(input,select,textarea):focus{border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.28)}
html.rd:not([data-theme=light]) .pill{background:rgba(182,255,59,.16);color:#d9ff9e;border-color:rgba(182,255,59,.6)}
html.rd:not([data-theme=light]) .pill.w{background:rgba(255,207,90,.16);color:#ffd97a;border-color:rgba(255,207,90,.6)}
html.rd:not([data-theme=light]) .pill.r{background:rgba(255,107,129,.16);color:#ff8fa0;border-color:rgba(255,107,129,.6)}
html.rd:not([data-theme=light]) .pill.b{background:rgba(34,211,238,.18);color:#a5f3fc;border-color:rgba(34,211,238,.6)}
html.rd:not([data-theme=light]) .pill.g{background:rgba(148,163,184,.14);color:#CBD5E1;border-color:rgba(148,163,184,.45)}
html.rd:not([data-theme=light]) .good{color:#b6ff3b!important}html.rd:not([data-theme=light]) .bad{color:#ff6b81!important}
html.rd:not([data-theme=light]) header.top img{box-shadow:none}
html.rd #app .card :is(button,.btn){min-height:48px}
/* hub hlavička + veľké čísla (Bento) */
html.rd:not([data-theme=light]) .ehb{background:#0B0F19;border:1px solid rgba(34,211,238,.4);box-shadow:none;border-radius:18px}
html.rd .ehb:before{display:none}
html.rd:not([data-theme=light]) .ehbi{background:rgba(34,211,238,.18);border:1px solid rgba(34,211,238,.5)}
html.rd:not([data-theme=light]) .ehbc{background:#111827;border:1px solid rgba(34,211,238,.3);box-shadow:none;border-radius:16px;min-height:112px}
html.rd .ehbc[data-rdgo]{cursor:pointer}html.rd .ehbc[data-rdgo]:active{transform:scale(.99)}
html.rd .ehbs{position:static!important;background:transparent!important;border:0!important;width:28px;height:28px;color:#94A3B8;margin:0 0 6px;display:block!important}
html.rd .ehbc b{padding-right:0!important;white-space:nowrap}
html.rd .ehbs .rdi{width:26px;height:26px}
html.rd:not([data-theme=light]) .ehbc b{color:#FFFFFF;font-size:clamp(26px,7.6vw,38px)}
html.rd:not([data-theme=light]) .ehbc.t-g b{color:#b6ff3b}html.rd:not([data-theme=light]) .ehbc.t-w b{color:#ffcf5a}html.rd:not([data-theme=light]) .ehbc.t-r b{color:#ff6b81}html.rd:not([data-theme=light]) .ehbc.t-b b{color:#7cc4ff}
html.rd:not([data-theme=light]) .ehbc.t-r{border-color:rgba(255,107,129,.6)}html.rd:not([data-theme=light]) .ehbc.t-w{border-color:rgba(255,207,90,.5)}html.rd:not([data-theme=light]) .ehbc.t-g{border-color:rgba(182,255,59,.45)}
html.rd .ehbc small{color:#94A3B8;opacity:1}
html.rd .ehbi .rdi{width:.78em;height:.78em;color:#7cc4ff}
html.rd:not([data-theme=light]) .secbar button[aria-pressed="true"]{background:linear-gradient(135deg,#b6ff3b,#5eead4)!important;color:#05210f!important;border-color:transparent!important}
html.rd:not([data-theme=light]) .rokbar{background:rgba(6,9,19,.94);-webkit-backdrop-filter:none;backdrop-filter:none;border-bottom:1px solid rgba(34,211,238,.25)}
html.rd:not([data-theme=light]) .rokbar button{background:#111827;border-color:rgba(34,211,238,.4)}
html.rd:not([data-theme=light]) .rokbar button[aria-pressed=true]{background:linear-gradient(135deg,#b6ff3b,#5eead4)!important;color:#05210f!important;border-color:transparent!important}
html.rd:not([data-theme=light]) .rokbar .roknew{background:#b6ff3b!important;color:#05210f!important}
.rdtools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.rdtl{display:flex!important;align-items:center;gap:10px;min-height:56px;padding:10px 12px;text-align:left;border-radius:14px!important}
.rdtl .rdi{width:24px;height:24px;flex:none;color:#22d3ee}.rdtl span{display:flex;flex-direction:column;min-width:0}.rdtl b{font-size:.9rem;overflow-wrap:anywhere}.rdtl small{font-weight:500;font-size:.74rem;overflow-wrap:anywhere}
@media (max-width:560px){.rdtools{grid-template-columns:1fr}}
/* pôvodná lišta skrytá – nahradila ju spodná lišta / bočný panel */
html.rd #app>nav.tabs{display:none!important}
html.rd body.ds-bn,html.rd:not(.pc-in) body{padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))!important}
.rdi{width:22px;height:22px;display:block;flex:none}
#rdBar{position:fixed;left:0;right:0;bottom:0;z-index:1500;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:6px max(8px,env(safe-area-inset-left,0px)) calc(6px + env(safe-area-inset-bottom,0px));
 background:rgba(6,9,19,.97);border-top:1px solid rgba(34,211,238,.4)}
html.rd.pc.pc-in #rdBar{display:none}
#rdBar button{position:relative;min-height:58px;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 2px;border:0!important;border-radius:14px;background:transparent!important;box-shadow:none!important;
 color:#94A3B8!important;font:600 .7rem/1.1 var(--f-ui);letter-spacing:0;-webkit-backdrop-filter:none;backdrop-filter:none;text-align:center}
#rdBar button span{max-width:100%;white-space:normal;overflow-wrap:anywhere;line-height:1.05;text-align:center}
#rdBar button .rdi{width:24px;height:24px}
#rdBar button.on{color:#FFFFFF!important}
#rdBar button.on .rdi{color:#05210f;background:linear-gradient(135deg,#b6ff3b,#5eead4);border-radius:12px;padding:5px;width:40px;height:32px;box-sizing:border-box}
.rdc{position:absolute;top:2px;left:calc(50% + 6px);min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ff6b81;color:#fff;font:700 .62rem/18px var(--f-ui);font-style:normal;text-align:center;box-sizing:border-box}
/* podsekcie oblasti */
#rdSub{display:grid;gap:6px;margin:2px 0 2px}
#rdSub>b{font:700 .7rem var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:#94A3B8;display:flex;align-items:center;gap:8px}
#rdSub>b:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--ac,#22d3ee)}
#rdSub>div{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}#rdSub>div::-webkit-scrollbar{display:none}
#rdSub button{position:relative;flex:none;display:flex;align-items:center;gap:7px;min-height:48px;padding:0 14px;border-radius:999px!important;font:600 .82rem var(--f-ui);white-space:nowrap}
#rdSub button .rdi{width:20px;height:20px}
#rdSub button.on{background:linear-gradient(135deg,#b6ff3b,#5eead4)!important;border-color:transparent!important;color:#05210f!important}
#rdSub .rdc{position:static;margin-left:2px}
/* tlačidlá v hlavičke */
#rdHead{display:flex;gap:8px;margin:0 0 4px}
#rdHead button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:48px;padding:0 14px;flex:1 1 0;font:600 .85rem var(--f-ui);border-radius:14px}
html.rd.pc.pc-in #rdHead{display:none}
/* bočný panel (počítač) */
#rdSide{position:fixed;z-index:59;left:var(--pc-gap,22px);width:var(--pc-side,276px);box-sizing:border-box;top:var(--pc-top,150px);bottom:calc(var(--pc-gap,22px) + 64px);padding:10px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;scrollbar-width:thin;
 background:#0B0F19;border:1px solid rgba(34,211,238,.4);border-top:0;border-bottom:0}
#rdSide button{position:relative;display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:8px 12px;border-radius:12px!important;border:1px solid transparent!important;background:transparent!important;box-shadow:none!important;color:#CBD5E1!important;font:600 .88rem var(--f-ui);text-align:left}
#rdSide button span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rdSide button:hover{background:rgba(34,211,238,.12)!important;color:#fff!important}
#rdSide button.on{background:linear-gradient(135deg,#b6ff3b,#5eead4)!important;color:#05210f!important}
#rdSide .rdc{position:static}
#rdSide .rdsf{border:1px solid rgba(34,211,238,.4)!important;background:#0F1524!important;color:#94A3B8!important;margin-bottom:6px}
#rdSide kbd{font:600 .68rem var(--f-ui);color:#94A3B8;border:1px solid rgba(148,163,184,.4);border-radius:6px;padding:1px 6px}
.rdsa{display:grid;gap:2px;margin-top:10px}.rdsa>b{font:700 .66rem var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:#94A3B8;padding:4px 12px;display:flex;align-items:center;gap:8px}
.rdsa>b:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--ac,#94A3B8)}
html.rd.pc.pc-in:not([data-theme=light]) header.top,html.rd:not([data-theme=light]) #pcFoot{background:#0B0F19!important;border-color:rgba(34,211,238,.4)!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
html.rd.pc.pc-in header.top h1{background:none!important;color:#fff!important}
/* menu + hľadanie */
#rdMenu{position:fixed;inset:0;z-index:20000;background:rgba(2,4,10,.72);display:flex;align-items:flex-start;justify-content:center;padding:max(10px,env(safe-area-inset-top)) 10px 10px}
#rdMenu[hidden]{display:none}
body.rdmo{overflow:hidden}
.rdmb{width:min(980px,100%);max-height:calc(100dvh - 20px);display:flex;flex-direction:column;background:#0B0F19;border:1px solid rgba(34,211,238,.45);border-radius:20px;overflow:hidden;color:#fff}
.rdmh{display:flex;gap:8px;padding:12px;border-bottom:1px solid rgba(34,211,238,.25)}
.rdmq{flex:1;display:flex;align-items:center;gap:10px;min-height:52px;padding:0 14px;border:1px solid rgba(34,211,238,.45);border-radius:14px;background:#0F1524;color:#94A3B8}
.rdmq input{flex:1;min-width:0;border:0!important;background:transparent!important;box-shadow:none!important;color:#fff;font:500 1rem var(--f-ui);padding:0;min-height:48px}
.rdmq input:focus{outline:none}
.rdmx{width:52px;height:52px;min-height:52px;padding:0;border-radius:14px;display:grid;place-items:center;flex:none}
.rdml{overflow-y:auto;padding:6px 12px 16px;overscroll-behavior:contain}
.rdma{margin-top:10px}.rdma h3,.rdml>h3{margin:12px 2px 8px;font:700 .7rem var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:#94A3B8;display:flex;align-items:center;gap:8px}
.rdma h3:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--ac,#94A3B8)}
.rdmg{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
@media (max-width:460px){.rdmg{grid-template-columns:1fr 1fr}}
.rdmt,.rdmr{position:relative;display:flex;align-items:center;gap:10px;min-height:56px;padding:10px 12px;border-radius:14px!important;text-align:left;background:#111827!important;border:1px solid rgba(34,211,238,.3)!important;color:#fff!important;box-shadow:none!important;width:100%}
.rdmt .rdi,.rdmr .rdi{width:24px;height:24px;color:#7cc4ff}
.rdmt span,.rdmr span{display:flex;flex-direction:column;min-width:0;gap:2px}.rdmt b,.rdmr b{font-size:.9rem;overflow-wrap:anywhere;line-height:1.2}
.rdmt small,.rdmr small{font-weight:500;font-size:.72rem;color:#94A3B8;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.rdmt.on{border-color:#22d3ee!important;background:rgba(34,211,238,.18)!important}
.rdmt .rdc{position:absolute;top:6px;right:8px;left:auto}
.rdmr{margin-bottom:6px}.rdmr.sel{border-color:#22d3ee!important;background:rgba(34,211,238,.2)!important}
.rdmn{padding:22px 6px;color:#94A3B8}
.rdflash{outline:3px solid #22d3ee!important;outline-offset:3px;transition:outline-color .3s}
/* ── VNÚTRO SEKCIÍ (6. 11. 07:34 príkaz majiteľa „vnútorné úpravy po rozkliknutí sekcie, grafika a vizuál v celej app“) – iba rozloženie a farby ERNTE ── */
html.rd:not([data-theme=light]) #app .card{border-radius:18px}
html.rd:not([data-theme=light]) #app .card :is(h2,h3):not(.ehb *){border-left:4px solid #b6ff3b;padding-left:10px;border-radius:2px;line-height:1.25}
html.rd:not([data-theme=light]) #app .card h3:not(.ehb *){border-left-color:#22d3ee}
html.rd:not([data-theme=light]) #app details>summary{min-height:44px;padding-top:8px;padding-bottom:8px;line-height:1.35;cursor:pointer}
html.rd:not([data-theme=light]) #app details>summary::marker{color:#22d3ee}
html.rd:not([data-theme=light]) #app details[open]>summary{color:#d9ff9e}
html.rd:not([data-theme=light]) #app details[open]>summary::marker{color:#b6ff3b}
html.rd:not([data-theme=light]) #app table{border-collapse:separate;border-spacing:0}
html.rd:not([data-theme=light]) #app th{background:#111827;color:#94A3B8;font-weight:700;border-bottom:1px solid rgba(34,211,238,.35)}
html.rd:not([data-theme=light]) #app td{border-bottom:1px solid rgba(34,211,238,.1)}
html.rd:not([data-theme=light]) #app tbody tr:nth-child(even)>td{background:rgba(255,255,255,.025)}
@media (hover:hover){html.rd:not([data-theme=light]) #app tbody tr:hover>td{background:rgba(34,211,238,.07)}}
html.rd:not([data-theme=light]) #app label{color:#cbd5e1}
html.rd #app .card :is(input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),select){min-height:46px;border-radius:12px}
html.rd #app .card textarea{border-radius:12px}
html.rd:not([data-theme=light]) #app :is(input[type=checkbox],input[type=radio]){accent-color:#b6ff3b}
html.rd:not([data-theme=light]) :is(button,a,input,select,textarea,summary):focus-visible{outline:2px solid #b6ff3b;outline-offset:2px}
html.rd:not([data-theme=light]) #app .pill{border-radius:999px}
html.rd:not([data-theme=light]) #app .card p a:not(.btn):not([role=button]){color:#5eead4}
html.rd:not([data-theme=light]) #app hr{border:0;border-top:1px solid rgba(34,211,238,.2)}
html.rd:not([data-theme=light]) ::-webkit-scrollbar-thumb{background:rgba(34,211,238,.32);border-radius:8px}
html.rd:not([data-theme=light]) ::selection{background:rgba(182,255,59,.35);color:#fff}
/* svetlý režim – iba nové prvky */
html.rd[data-theme=light] #rdBar{background:rgba(255,255,255,.97);border-top-color:rgba(34,211,238,.35)}
html.rd[data-theme=light] #rdBar button{color:#475569!important}html.rd[data-theme=light] #rdBar button.on{color:#0f172a!important}
html.rd[data-theme=light] :is(#rdSide,.rdmb){background:#fff;color:#0f172a}
html.rd[data-theme=light] :is(.rdmt,.rdmr){background:#F1F5F9!important;color:#0f172a!important}
html.rd[data-theme=light] .rdmq{background:#F8FAFC}html.rd[data-theme=light] .rdmq input{color:#0f172a}
html.rd[data-theme=light] #rdSide button{color:#334155!important}html.rd[data-theme=light] #rdSide button.on{color:#05210f!important}
`;document.head.appendChild(st);
})();
