// ===== 📅 ROK ÚRODY – CELÁ APLIKÁCIA PODĽA ROKOV (príkaz majiteľa 2. 11. 10:26 „usporiadaj všetko podľa rokov“) =====
// Prepínač „📅 2026 · 2025 · Všetko“ pod lištou sekcií. Platí naraz pre Obchody, Požiadavky, Prehľad, Farmárov, Zúčtovanie
// (farmára aj odberateľa), Predajné zmluvy a Danube. Rok záznamu = rok v čísle zmluvy (P2026/35, ERN-2026-0001), inak dátum.
// Pri „Všetko“ sú obchody zoskupené po rokoch (najnovší hore). Voľba sa pamätá v zariadení (localStorage ernte-rok).
(function(){
const KEY="ernte-rok",NOW=String(new Date().getFullYear());
const get=()=>{try{const v=localStorage.getItem(KEY);return v==null?NOW:v}catch(x){return NOW}};
let R=get();
window.ROK=()=>R; // "" = všetky roky
window.rokOf=function(x){if(!x)return null;const m=String(x.no||x.contract_no||"").match(/(?:^|[^0-9])(20\d\d)(?:[^0-9]|$)/);if(m)return m[1];
  const d=x.signed_at||x.day||x.d||x.date||x.created_at||x.at;const y=d&&String(d).match(/^(20\d\d)-/);return y?y[1]:null};
window.rokOk=x=>!R||(()=>{const y=rokOf(x);return !y||y===R})();
window.rokBounds=()=>R?{d0:R+"-01-01",d1:R===NOW?new Date().toISOString().slice(0,10):R+"-12-31"}:null;
function years(){const S=new Set([NOW]);try{(STATE.dealsAll||STATE.deals||[]).forEach(d=>{const y=rokOf(d);if(y)S.add(y)});(STATE.reqs||[]).forEach(d=>{const y=rokOf(d);if(y)S.add(y)})}catch(x){}
  return [...S].sort((a,b)=>b.localeCompare(a))}
function set(v){R=v;try{localStorage.setItem(KEY,v)}catch(x){}window.dispatchEvent(new CustomEvent("ernterok",{detail:v}));if(typeof renderStaff==="function"&&!(typeof FARMER!=="undefined"&&FARMER))renderStaff();else if(typeof renderFarmer==="function")renderFarmer()}
window.rokSet=set;
// karty, kde má rok zmysel (záložky tímu); farmár: iba keď má údaje z viac rokov
const TABS=["home","deals","req","zuct","farm","danube","trans","price"];
// 2. 11. 10:48 príkaz majiteľa: lišta rokov hneď hore (prilepená pri posúvaní) + v Obchodoch celkom hore „➕ Nová zmluva“
function bar(){const Y=years(),nw=typeof TAB!=="undefined"&&TAB==="deals"&&document.getElementById("fDeal");
  return `<div class="rokbar" role="group" aria-label="Rok úrody"><span>📅 Úroda</span>${Y.map(y=>`<button type="button" data-rok="${y}" aria-pressed="${R===y}">${y}</button>`).join("")}<button type="button" data-rok="" aria-pressed="${!R}">Všetko</button>${nw?`<button type="button" class="roknew" data-roknew>➕ Nová zmluva</button>`:""}</div>`}
function inject(){const app=document.getElementById("app");if(!app)return;app.querySelectorAll(".rokbar").forEach(x=>x.remove());
  const farmer=typeof FARMER!=="undefined"&&FARMER;if(typeof ROLE==="undefined"||(!ROLE&&!farmer))return;
  if(!farmer&&!(typeof TAB!=="undefined"&&TABS.includes(TAB)))return;
  if(farmer&&years().length<2&&!(!R||R!==NOW))return;
  const at=app.querySelector("nav.tabs:not(.trtabs)")||app.querySelector(".hero");const d=document.createElement("div");d.innerHTML=bar();
  if(at)at.after(d.firstChild);else app.prepend(d.firstChild)}
// pri vykreslení sa zoznamy dočasne nahradia výberom roka (po vykreslení sa vrátia celé – udalosti hľadajú v celých zoznamoch)
const KEYS=["deals","dealsTest","dealsArch","reqs"];
function wrap(fn){const tk=setInterval(()=>{const o=window[fn];if(typeof o!=="function"||o.__rok)return;
  const w=function(){let saved=null;try{if(R&&typeof STATE!=="undefined"){saved={};for(const k of KEYS){if(Array.isArray(STATE[k])){saved[k]=STATE[k];STATE[k]=STATE[k].filter(rokOk)}}}}catch(x){saved=null}
    let r;try{r=o.apply(this,arguments)}finally{if(saved)for(const k in saved)STATE[k]=saved[k]}
    (window.ernteSoon||requestAnimationFrame)(()=>{try{inject()}catch(x){}});return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__rok=1;window[fn]=w},600);setTimeout(()=>clearInterval(tk),60000)}
wrap("renderStaff");wrap("renderFarmer");
// lišta ostane vždy prvá (iné moduly vkladajú dlaždice tiež hneď za lištu sekcií)
let kt=0;function keepTop(){kt=0;const app=document.getElementById("app"),b=app&&app.querySelector(":scope > .rokbar");if(!b)return;const nav=app.querySelector(":scope > nav.tabs:not(.trtabs)")||app.querySelector(":scope > .hero");
  let pv=b.previousElementSibling;while(pv&&pv.classList&&pv.classList.contains("spatbar"))pv=pv.previousElementSibling;
  if(nav){if(pv!==nav){const sp=nav.nextElementSibling&&nav.nextElementSibling.classList.contains("spatbar")?nav.nextElementSibling:nav;sp.after(b)}}else if(pv)app.prepend(b)}
(function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(()=>{if(!kt)kt=setTimeout(keepTop,0)}).observe(app,{childList:true})})();
document.addEventListener("click",e=>{const n=e.target.closest&&e.target.closest("[data-roknew]");if(!n)return;e.preventDefault();
  const sb=document.querySelector('#app [data-secb="new"]');if(sb&&sb.getAttribute("aria-pressed")!=="true")sb.click();
  setTimeout(()=>{const f=document.getElementById("fDeal");if(!f)return;f.classList.remove("sbh");const bh=(document.querySelector(".rokbar")||{offsetHeight:0}).offsetHeight,y=f.getBoundingClientRect().top+scrollY-bh-14;scrollTo({top:Math.max(0,y),behavior:"smooth"})},60)},true);
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".rokbar [data-rok]");if(!b)return;e.preventDefault();set(b.dataset.rok)},true);
{const s=document.createElement("style");s.textContent=`.rokbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;margin:0 -4px 10px;padding:8px 4px;font-size:.84rem;position:sticky;top:0;z-index:60;background:rgba(11,16,32,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-radius:0 0 16px 16px}
html[data-theme=light] .rokbar{background:rgba(255,255,255,.88)}.rokbar .roknew{background:linear-gradient(135deg,#a3e635,#22d3ee)!important;color:#0b1020!important;border:0!important;font-weight:800;margin-left:4px}.rokbar span{opacity:.75;font-weight:600}
.rokbar button{min-height:36px!important;padding:4px 14px!important;border-radius:999px!important;font-weight:700;font-size:.86rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18)}
.rokbar button[aria-pressed=true]{background:linear-gradient(135deg,#a3e635,#22d3ee);color:#0b1020;border-color:transparent}
.rokh{display:flex;align-items:center;gap:8px;margin:14px 2px 6px;font-size:1rem}.rokh::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.15)}`;document.head.appendChild(s)}
/* 2. 11. príkaz majiteľa „odkaz priamo tam“: …/farmar/#novy-obchod[=C0013] → Obchody → Nový obchod (+ farmár podľa kódu/mena) */
{const m=/^#novy-obchod(?:=([^&]+))?/i.exec(location.hash||"");if(m){const q=m[1]?decodeURIComponent(m[1]):"";try{sessionStorage.setItem("ernte-tab","deals")}catch(e){}
  let n=0;const t=setInterval(()=>{if(++n>1200){clearInterval(t);return}const b=document.querySelector("[data-roknew]"),f=document.getElementById("fDeal");
    if(!b||!f||[...document.querySelectorAll(".wlc")].some(w=>w.getClientRects().length))return;clearInterval(t);b.click();
    if(q){let c=0;const fill=()=>{const f=document.getElementById("fDeal");if(!f)return;const k=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),v=k(q),F=(typeof STATE!=="undefined"&&STATE.farmers)||[];
      const x=F.find(z=>k(z.code)===v)||F.find(z=>k(z.name)===v);if(!x)return;if(f.elements.farmer.value!==x.id){f.elements.farmer.value=x.id;const i=document.getElementById("dfq");if(i)i.value=String(x.name).trim();const L=document.getElementById("dfl");if(L)L.innerHTML=`<div class="s">✓ Vybraný: <b>${String(x.name).trim().replace(/</g,"&lt;")}</b></div>`}};
      const ft=setInterval(()=>{fill();if(++c>12)clearInterval(ft)},250)}
    try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}},250)}}
})();
