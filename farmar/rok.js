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
function bar(){const Y=years();return `<div class="rokbar" role="group" aria-label="Rok úrody"><span>📅 Úroda</span>${Y.map(y=>`<button type="button" data-rok="${y}" aria-pressed="${R===y}">${y}</button>`).join("")}<button type="button" data-rok="" aria-pressed="${!R}">Všetko</button></div>`}
function inject(){const app=document.getElementById("app");if(!app)return;app.querySelectorAll(".rokbar").forEach(x=>x.remove());
  const farmer=typeof FARMER!=="undefined"&&FARMER;if(typeof ROLE==="undefined"||(!ROLE&&!farmer))return;
  if(!farmer&&!(typeof TAB!=="undefined"&&TABS.includes(TAB)))return;
  if(farmer&&years().length<2&&!(!R||R!==NOW))return;
  const at=app.querySelector("nav.tabs:not(.trtabs)")||app.querySelector(".hero");if(!at)return;const d=document.createElement("div");d.innerHTML=bar();at.after(d.firstChild)}
// pri vykreslení sa zoznamy dočasne nahradia výberom roka (po vykreslení sa vrátia celé – udalosti hľadajú v celých zoznamoch)
const KEYS=["deals","dealsTest","dealsArch","reqs"];
function wrap(fn){const tk=setInterval(()=>{const o=window[fn];if(typeof o!=="function"||o.__rok)return;
  const w=function(){let saved=null;try{if(R&&typeof STATE!=="undefined"){saved={};for(const k of KEYS){if(Array.isArray(STATE[k])){saved[k]=STATE[k];STATE[k]=STATE[k].filter(rokOk)}}}}catch(x){saved=null}
    let r;try{r=o.apply(this,arguments)}finally{if(saved)for(const k in saved)STATE[k]=saved[k]}
    (window.ernteSoon||requestAnimationFrame)(()=>{try{inject()}catch(x){}});return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__rok=1;window[fn]=w},600);setTimeout(()=>clearInterval(tk),60000)}
wrap("renderStaff");wrap("renderFarmer");
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".rokbar [data-rok]");if(!b)return;e.preventDefault();set(b.dataset.rok)},true);
{const s=document.createElement("style");s.textContent=`.rokbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;margin:8px 0 10px;font-size:.84rem}.rokbar span{opacity:.75;font-weight:600}
.rokbar button{min-height:36px!important;padding:4px 14px!important;border-radius:999px!important;font-weight:700;font-size:.86rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18)}
.rokbar button[aria-pressed=true]{background:linear-gradient(135deg,#a3e635,#22d3ee);color:#0b1020;border-color:transparent}
.rokh{display:flex;align-items:center;gap:8px;margin:14px 2px 6px;font-size:1rem}.rokh::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.15)}`;document.head.appendChild(s)}
})();
