// ===== ERNTE · 🔎 HĽADAŤ VŠETKO (7. 11. 07:44 PRÍKAZ MAJITEĽA „nač je tam možnosť hľadať, keď nič nevie nájsť – musí nájsť všetko,
// čo je v app aj u používateľov, čo majú prístup do app“) =====
// Hľadá: sekcie a ich časti (hladat-mapa.json – nadpisy každej záložky), popisy a návody (TABD, HELP), funkcie (app_novinky – „kde to nájdeš“),
// a z databázy cez hladaj(q) – SECURITY INVOKER, teda každý nájde iba to, k čomu má prístup: zmluvy s farmármi, predajné zmluvy, farmárov,
// odberateľov, spoluprácu s odberateľmi, tím a používateľov, vážne lístky, požiadavky, vozidlá. Slová v hocijakom tvare a bez diakritiky
// (skráti sa koncovka: „zmluva odberateľa“ nájde „zmluvy s odberateľmi“). Ťuk na výsledok otvorí záložku a ukáže presné miesto.
// Majitelia (nový vzhľad): Menu → Hľadať (vzhlad.js volá window.ernteFindUI). Ostatní: 🔎 v rade tlačidiel hore (.hrow) alebo v hlavičke.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9@.+/\s-]+/g," ").replace(/\s+/g," ").trim();
const TOK=q=>N(q).split(" ").filter(w=>w.length>=2).map(w=>w.length<=3?w:w.length<=5?w.slice(0,-1):w.slice(0,-2));
// rovnaký význam, iné slovo (cenník = ceny = výkup, zúčtovanie = vyúčtovanie, lístok = váženie, zmluva = obchod = kontrakt…)
const SYN=[["cenn","cen","vykup"],["zuct","vyuct"],["list","vazn","vaze"],["zmlu","obchod","kontrakt","dohod"],["auto","vozid","kamion","spz","flotil"],["farm","dodavat","pestovat","klient"],
  ["odber","kupuj"],["ponuk","predaj","ponuk"],["dopr","prevoz","odvoz","jazd"],["pocas","prepoved"],["burz","matif","cbot","trh"],["tim","zamestn","ludi","pouzivat","pristup"],["nastav","konfig"],["fakt","doklad"],["mzd","vyplat"]];
const ALT=t=>{const r=[t];for(const g of SYN)if(g.some(x=>t.startsWith(x)||x.startsWith(t)))r.push(...g);return [...new Set(r)]};
const HIT=(h,tk)=>tk.every(t=>ALT(t).some(a=>h.includes(a)));
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
let MAP=null,MAPB=false,RQ=0,LASTQ="";
async function map(){if(MAP||MAPB)return MAP;MAPB=true;try{const r=await fetch("hladat-mapa.json?v=20261107-0900",{cache:"no-store"});MAP=r.ok?await r.json():{}}catch(x){MAP={}}MAPB=false;return MAP}
function tabs(){const m={};document.querySelectorAll("#app>nav.tabs [data-tab]").forEach(b=>{const k=b.dataset.tab,l=b.querySelector(".tl");m[k]=((l?l.textContent:b.textContent)||k).replace(/\s*\d+\s*$/,"").trim()});return m}
const ICO={tab:"📂",sec:"📌",help:"📖",fn:"✨",deal:"📄",sale:"💼",farmer:"👨‍🌾",buyer:"🏭",spol:"🤝",staff:"👤",ticket:"⚖️",req:"📨",veh:"🚛",truck:"🚛"};
// ---------- miestne položky (sekcie, časti sekcií, návody) ----------
function local(T,q){const tk=TOK(q);if(!tk.length)return [];const D=window.ERNTE_DESC||{},TD=D.TABD||{},H=typeof HELP!=="undefined"?HELP:{},MM=MAP||{},M=(MM.owner?((typeof window.MAIN_OK==="function"&&MAIN_OK())?MM.owner:MM.staff):MM)||{},FM=(MM.farmer&&MM.farmer._farmer)||MM._farmer||[],R=[],seen=new Set();
  const add=(o,hay)=>{const h=N(hay);if(!HIT(h,tk))return;const key=o.k+"|"+o.tab+"|"+N(o.t);if(seen.has(key))return;seen.add(key);const tt=N(o.t);o.sc=tk.reduce((s,t)=>s+(tt.includes(t)?3:1),0)+(o.k==="tab"?2:0);R.push(o)};
  for(const k in T){add({k:"tab",g:"Sekcie aplikácie",t:T[k],s:(TD[k]||"").slice(0,110),tab:k},T[k]+" "+(TD[k]||"")+" "+(H[k]?(H[k].t||"")+" "+(H[k].r||""):""));
    const h=H[k];if(h&&Array.isArray(h.s))for(const x of h.s)add({k:"help",g:"Časti sekcií a návody",t:String(x[0]||"").replace(/<[^>]+>/g,""),s:T[k]+" · "+String(x[1]||"").replace(/<[^>]+>/g,"").slice(0,90),tab:k,find:x[0]},x[0]+" "+x[1]+" "+T[k]);
    for(const x of (M[k]||[]))add({k:"sec",g:"Časti sekcií a návody",t:x,s:"v sekcii "+T[k],tab:k,find:x},x+" "+T[k])}
  if(isF())for(const x of FM)add({k:"sec",g:"Časti aplikácie",t:x,s:"na hlavnej obrazovke",tab:null,find:x},x);
  return R.sort((a,b)=>b.sc-a.sc).slice(0,24)}
// ---------- presun na miesto ----------
function flash(el){if(!el)return false;try{if(el.tagName==="SUMMARY"&&el.parentElement&&!el.parentElement.open)el.parentElement.open=true;const d=el.closest("details");if(d&&!d.open)d.open=true}catch(x){}
  el.scrollIntoView({block:"center",behavior:"smooth"});el.classList.add("hlflash");setTimeout(()=>el.classList.remove("hlflash"),2800);return true}
function after(fn,n=28){let i=0;const t=setInterval(()=>{i++;let ok=false;try{ok=fn()}catch(x){}if(ok||i>=n)clearInterval(t)},250)}
function goTab(k){if(!k||isF())return;const b=document.querySelector(`#app>nav.tabs [data-tab="${k}"]`);if(b){b.click();scrollTo({top:0})}else{try{TAB=k;renderStaff();scrollTo({top:0})}catch(x){}}}
function byText(txt,sel){const n=N(txt).slice(0,40);if(!n)return null;const L=[...document.querySelectorAll(sel||"#app .secbar button,#app h2,#app h3,#app summary,#app .owsh span,#app .srt,#app .ocnt,#app .card>b,#app section h2")];
  return L.find(el=>el.offsetParent!==null&&N(el.textContent).startsWith(n))||L.find(el=>el.offsetParent!==null&&N(el.textContent).includes(n))}
function findCard(txt){const n=N(txt);if(!n)return null;return [...document.querySelectorAll("#app .card,#app .ds-card,#app section,#app .osr,#app .ocnr")].reverse().find(x=>x.offsetParent!==null&&N(x.textContent).includes(n))}
function openSec(r){goTab(r.tab);after(()=>{const el=byText(r.find||r.t);if(!el)return false;if(el.closest(".secbar")){el.click();setTimeout(()=>{const h=byText(r.find||r.t,"#app h2,#app h3,#app summary,#app .card>b,#app section h2");flash(h||el)},500);return true}return flash(el)})}
function toastS(r){if(typeof toast==="function")toast((ICO[r.k]||"")+" "+r.t+(r.s?" · "+r.s:""),7000)}
function act(r){closeUI();const k=r.k;
  if(k==="tab"){goTab(r.tab);return}
  if(k==="sec"||k==="help"){if(r.tab)openSec(r);else after(()=>flash(byText(r.find)));return}
  if(k==="fn"){const parts=String(r.s||"").split(/→|·|;|,/).map(x=>x.trim()).filter(Boolean),T=tabs();let tab=null;
    for(const p of parts){const np=N(p);for(const kk in T){const nt=N(T[kk]);if(nt&&(np.includes(nt)||nt.includes(np)))tab=tab||kk}}
    if(tab){goTab(tab);const last=parts.slice(1).reverse();after(()=>{for(const p of last){const el=byText(p);if(el)return flash(el)}return false},16)}toastS(r);return}
  if(k==="deal"){const D=((typeof STATE!=="undefined"&&STATE)||{}),d=[...(D.deals||[]),...(D.dealsArch||[]),...(D.dealsTest||[])].find(x=>String(x.id)===String(r.id));
    try{if(d&&window.rokOk&&!rokOk(d)&&window.rokSet)rokSet("")}catch(x){}goTab(r.tab||"deals");const no=String(r.t).split(" · ")[0];
    after(()=>{const el=document.querySelector(`#app [data-cpdf="${CSS.escape(String(r.id))}"]`)||document.querySelector(`#app [data-deal="${CSS.escape(String(r.id))}"]`);if(el)return flash(el.closest(".card,.dcard,li")||el);return flash(findCard(no))});return}
  if(k==="farmer"){try{FQ=String(r.t||"")}catch(x){}goTab("farm");after(()=>flash(findCard(r.t)));return}
  if(k==="buyer"){goTab("home");after(()=>{const s=document.getElementById("ocnSec");if(!s)return false;const d=s.querySelector('[data-ocnd="list"]');if(d)d.open=true;return flash(s)});return}
  if(k==="spol"){goTab("deals");after(()=>{const b=document.querySelector(`[data-osp="open"][data-id="${CSS.escape(String(r.id))}"]`);if(b){flash(b.closest(".osr")||b);setTimeout(()=>b.click(),700);return true}return flash(document.getElementById("osplCard"))});return}
  if(k==="veh"){goTab("fleet");after(()=>{try{const b=document.createElement("button");b.hidden=true;b.dataset.aveh=r.id;document.body.appendChild(b);b.click();b.remove();return true}catch(x){return false}},20);return}
  if(r.tab)goTab(r.tab);const key=String(r.t).split(" · ")[0];after(()=>flash(findCard(key)),16);toastS(r)}
// ---------- výsledky ----------
let RES=[],SEL=0,TMR=0;
function html(R,q,busy){if(!R.length)return `<div class="hlnone">${busy?"⏳ Hľadám aj v údajoch…":`Nič sa nenašlo pre „${E(q)}“. Skús kratšie slovo, meno, číslo zmluvy, ŠPZ alebo IČO.`}</div>`;
  let g="",h="";R.forEach((r,i)=>{if(r.g!==g){g=r.g;h+=`<h3 class="hlg">${E(g)}</h3>`}h+=`<button type="button" class="hlr rdmr${i===SEL?" sel":""}" data-rdres="${i}" data-hlres="${i}"><span class="hli" aria-hidden="true">${ICO[r.k]||"•"}</span><span class="hlt"><b>${E(r.t)}</b>${r.s?`<small>${E(r.s)}</small>`:""}</span></button>`});
  return h+(busy?`<div class="hlnone">⏳ Hľadám aj v údajoch…</div>`:"")}
const GORD=["Sekcie aplikácie","Časti sekcií a návody","Časti aplikácie","Funkcie – kde to nájdeš","Zmluvy s farmármi","Predajné zmluvy s odberateľmi","Spolupráca s odberateľmi","Odberatelia","Farmári a dodávatelia","Tím a používatelia","Vážne lístky","Požiadavky","Vozidlá"];
async function run(q,L,cb){const my=++RQ;LASTQ=q;await map();if(my!==RQ)return;const T=tabs(),loc=local(T,q).map(o=>Object.assign(o,{a:()=>act(o)}));
  const put=(R,busy)=>{R.sort((a,b)=>GORD.indexOf(a.g)-GORD.indexOf(b.g));RES=R;SEL=0;L.innerHTML=html(R,q,busy);if(cb)cb(R)};
  put(loc.slice(),true);clearTimeout(TMR);
  TMR=setTimeout(async()=>{let rem=[];try{const r=await sb.rpc("hladaj",{p_q:q});if(!r.error&&Array.isArray(r.data))rem=r.data}catch(x){}if(my!==RQ)return;
    const R=loc.concat(rem.map(o=>{const x=Object.assign({},o);x.a=()=>act(x);return x}));put(R,false)},220)}
window.ernteFindUI=function(q,L,cb){if(!String(q||"").trim()){return false}run(q,L,cb);return true};
window.ernteFind=async q=>{await map();return local(tabs(),q)};
// ---------- okno pre tím a farmárov (majitelia majú Menu → Hľadať) ----------
function closeUI(){const m=document.getElementById("hlBox");if(m)m.remove();try{const rm=document.getElementById("rdMenu");if(rm&&!rm.hidden&&rm.querySelector("[data-rdclose]"))rm.querySelector("[data-rdclose]").click()}catch(x){}}
function openUI(){let m=document.getElementById("hlBox");if(!m){m=document.createElement("div");m.id="hlBox";m.className="hlbox";m.innerHTML=`<div class="hlin" role="dialog" aria-modal="true" aria-label="Hľadať">
   <div class="hlh"><label class="hlq"><span aria-hidden="true">🔎</span><input type="search" id="hlQ" placeholder="Hľadať zmluvu, farmára, ŠPZ, lístok, sekciu…" autocomplete="off" enterkeyhint="search"></label><button type="button" class="hlx" data-hlclose aria-label="Zavrieť">✕</button></div>
   <div class="hll" id="hlL"><div class="hlnone">Napíš, čo hľadáš – sekciu, funkciu, zmluvu, farmára, odberateľa, ŠPZ, číslo lístka, IČO…</div></div></div>`;document.body.appendChild(m);
   const i=m.querySelector("#hlQ");i.addEventListener("input",()=>{const v=i.value;if(!v.trim()){RES=[];m.querySelector("#hlL").innerHTML=`<div class="hlnone">Napíš, čo hľadáš.</div>`;return}run(v,m.querySelector("#hlL"))});
   i.addEventListener("keydown",e=>{if(e.key==="Escape"){closeUI();return}if(!RES.length)return;if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();SEL=(SEL+(e.key==="ArrowDown"?1:-1)+RES.length)%RES.length;m.querySelectorAll(".hlr").forEach((b,j)=>b.classList.toggle("sel",j===SEL))}else if(e.key==="Enter"){e.preventDefault();const r=RES[SEL];if(r)r.a()}})}
  setTimeout(()=>{const i=document.getElementById("hlQ");if(i)i.focus()},60)}
window.ernteSearchOpen=openUI;
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-hlres],[data-hlclose],[data-hlopen],#hlBox");if(!t)return;
  if(t.dataset.hlopen!==undefined){e.preventDefault();openUI();return}
  if(t.dataset.hlclose!==undefined){e.preventDefault();closeUI();return}
  if(t.id==="hlBox"&&e.target===t){closeUI();return}
  if(t.dataset.hlres!==undefined&&t.closest("#hlBox")){e.preventDefault();const r=RES[+t.dataset.hlres];if(r)r.a()}},true);
// 🔎 do radu tlačidiel (.hrow) pre každého, kto nemá nový vzhľad majiteľa
function btn(){const app=document.getElementById("app");if(!app||document.documentElement.classList.contains("rd"))return;if(app.querySelector("[data-hlopen]"))return;
  const row=app.querySelector(".hrow")||app.querySelector(".hero");if(!row)return;const b=document.createElement("button");b.type="button";b.dataset.hlopen="";b.className="hlbtn";b.setAttribute("aria-label","Hľadať v aplikácii");b.title="Hľadať v aplikácii";b.textContent="🔎 Hľadať";row.appendChild(b)}
let qq=0;const sch=()=>{if(qq)return;qq=(window.ernteSoon||requestAnimationFrame)(()=>{qq=0;try{btn()}catch(x){}})};
(function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();setTimeout(map,4000)})();
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"&&!document.documentElement.classList.contains("rd")){e.preventDefault();openUI()}});
{const s=document.createElement("style");s.textContent=`.hlbox{position:fixed;inset:0;z-index:9600;background:rgba(2,6,15,.72);display:flex;align-items:flex-start;justify-content:center;padding:10px}
.hlin{width:min(720px,100%);max-height:88vh;display:grid;grid-template-rows:auto minmax(0,1fr);border-radius:22px;background:#0B0F19;border:1px solid rgba(34,211,238,.45);overflow:hidden;color:#eef2f7}
html[data-theme=light] .hlin{background:#fff;color:#0f172a}
.hlh{display:flex;gap:8px;align-items:center;padding:10px;border-bottom:1px solid rgba(255,255,255,.1)}.hlq{flex:1;display:flex;align-items:center;gap:8px;min-width:0;padding:0 12px;border-radius:14px;border:1px solid rgba(34,211,238,.5);min-height:48px}
.hlq input{flex:1;min-width:0;border:0!important;background:transparent!important;font-size:16px;min-height:44px;box-shadow:none!important;outline:none;color:inherit}.hlx{width:48px;height:48px;min-width:48px;padding:0;border-radius:50%;font-size:1.1rem}
.hll{overflow:auto;padding:6px 10px 14px;overscroll-behavior:contain}.hlg{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;opacity:.7;margin:12px 4px 4px}
.hlr{display:flex!important;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 10px!important;min-height:52px;border-radius:12px!important;margin:3px 0;white-space:normal}
.hlr.sel{border-color:rgba(94,234,212,.7)!important}.hli{flex:none;width:30px;text-align:center;font-size:1.1rem}.hlt{display:grid;min-width:0}.hlt b{overflow-wrap:anywhere}.hlt small{opacity:.75;font-size:.78rem;line-height:1.35;overflow-wrap:anywhere}
.hlnone{padding:14px 6px;opacity:.8;line-height:1.45}.hlbtn{min-height:44px;padding:0 14px;border-radius:999px;white-space:nowrap}
.hlflash{outline:3px solid #5eead4!important;outline-offset:3px;border-radius:12px;transition:outline-color .4s}
#rdML .hlr{background:transparent}`;document.head.appendChild(s)}
})();
