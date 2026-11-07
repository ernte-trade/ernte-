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
// koreň slova bez slovenskej koncovky (odberateľské → odberatel, zmluvy → zmluv, predajné → predajn, lístky → listk)
const SUF=["ovskeho","ovskych","skeho","skych","skymi","skom","ovia","ami","ach","ych","ymi","ich","imi","ove","ova","ovi","sky","ska","ske","ski","eho","emu","ej","om","ov","mi","ia","ie","ou","ym","y","a","e","i","u","o"];
const STEM=w=>{if(w.length<=4||/\d/.test(w))return w;for(const x of SUF)if(w.endsWith(x)&&w.length-x.length>=4)return w.slice(0,-x.length);return w};
const TOK=q=>N(q).split(" ").filter(w=>w.length>=2).map(STEM);
// rovnaký význam, iné slovo (cenník = ceny = výkup, zúčtovanie = vyúčtovanie, lístok = váženie, zmluva = obchod = kontrakt…)
const SYN=[["cenn","ceny","vykup"],["zuct","vyuct"],["vazn","vaze"],["listk","listok"],["zmlu","obchod","kontrakt","dohod"],["auto","vozid","kamion","spz","flotil"],["farm","dodavat","pestovat","klient"],
  ["odberat","predajn","kupuj"],["ponuk","predaj","ponuk"],["dopr","prevoz","odvoz","jazd"],["pocas","prepoved"],["burz","matif","cbot","trh"],["tim","zamestn","ludi","pouzivat","pristup"],["nastav","konfig"],["fakt","doklad"],["mzd","vyplat"]];
const ALT=t=>{const r=[t];for(const g of SYN)if(g.some(x=>t.startsWith(x)||x.startsWith(t)))r.push(...g);return [...new Set(r)]};
const HIT=(h,tk)=>tk.every(t=>ALT(t).some(a=>h.includes(a)));
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
let MAP=null,MAPB=false,RQ=0,LASTQ="";
async function map(){if(MAP||MAPB)return MAP;MAPB=true;try{const r=await fetch("hladat-mapa.json?v=20261107-0900",{cache:"no-store"});MAP=r.ok?await r.json():{}}catch(x){MAP={}}MAPB=false;return MAP}
function tabs(){const m={};document.querySelectorAll("#app>nav.tabs [data-tab]").forEach(b=>{const k=b.dataset.tab,l=b.querySelector(".tl");m[k]=((l?l.textContent:b.textContent)||k).replace(/\s*\d+\s*$/,"").trim()});return m}
// ako ľudia sekcie volajú (hľadá sa aj podľa týchto slov v názve)
const TA={deals:"zmluvy s farmármi, dodávateľské a kúpne zmluvy, nákup",qd:"nová zmluva, uzatvoriť obchod",price:"výkupné ceny, nákupné ceny",nu:"nová úroda, ceny na budúci rok",zuct:"vyúčtovanie farmárov, zúčtovanie zmlúv",
  farm:"dodávatelia, klienti, pestovatelia",req:"ponuky a požiadavky farmárov, dopyty",trans:"jazdy, odvozy, nakládky",fleet:"autá, kamióny, GPS, nafta",team:"používatelia, prístupy, zamestnanci",
  danube:"maďarskí farmári, Maďarsko",trus:"hnoj, trus, Baromfi",wx:"predpoveď počasia",cal:"termíny, stretnutia, pripomienky",evid:"náklady, sklad, stroje",home:"prehľad, úvod, hlavná obrazovka",pred:"predpoveď, Algomancia"};
const ICO={tab:"📂",sec:"📌",help:"📖",fn:"✨",deal:"📄",sale:"💼",farmer:"👨‍🌾",buyer:"🏭",spol:"🤝",staff:"👤",ticket:"⚖️",req:"📨",veh:"🚛",truck:"🚛"};
// ---------- miestne položky (sekcie, časti sekcií, návody) ----------
function local(T,q){const tk=TOK(q);if(!tk.length)return [];const D=window.ERNTE_DESC||{},TD=D.TABD||{},H=typeof HELP!=="undefined"?HELP:{},MM=MAP||{},M=(MM.owner?((typeof window.MAIN_OK==="function"&&MAIN_OK())?MM.owner:MM.staff):MM)||{},FM=(MM.farmer&&MM.farmer._farmer)||MM._farmer||[],R=[],seen=new Set();
  const add=(o,hay)=>{const h=N(hay);if(!HIT(h,tk))return;const key=o.k+"|"+o.tab+"|"+N(o.t);if(seen.has(key))return;seen.add(key);const tt=N(o.t+" "+(o.al||""));o.tm=HIT(tt,tk);o.sc=(o.tm?100:0)+tk.reduce((s,t)=>s+(tt.includes(t)?3:ALT(t).some(a=>tt.includes(a))?2:0),0)+(o.k==="tab"?2:o.k==="sec"?1:0)+(tt.startsWith(tk[0])?2:0);R.push(o)};
  for(const k in T){add({k:"tab",g:"Sekcie aplikácie",t:T[k],al:TA[k]||"",s:(TA[k]?TA[k]+" · ":"")+(TD[k]||"").slice(0,90),tab:k},T[k]+" "+(TD[k]||"")+" "+(H[k]?(H[k].t||"")+" "+(H[k].r||""):""));
    const h=H[k];if(h&&Array.isArray(h.s))for(const x of h.s)add({k:"help",g:"Časti sekcií a návody",t:String(x[0]||"").replace(/<[^>]+>/g,""),s:T[k]+" · "+String(x[1]||"").replace(/<[^>]+>/g,"").slice(0,90),tab:k,find:x[0]},x[0]+" "+x[1]+" "+T[k]);
    const ML=(M[k]||[]).filter((x,i,a)=>!a.some((y,j)=>j!==i&&y.length<x.length&&N(x).startsWith(N(y))));
    for(const x of ML)add({k:"sec",g:"Časti sekcií a návody",t:x,s:"v sekcii "+T[k],tab:k,find:x},x+" "+T[k])}
  if(isF())for(const x of FM)add({k:"sec",g:"Časti aplikácie",t:x,s:"na hlavnej obrazovke",tab:null,find:x},x);
  return R.sort((a,b)=>b.sc-a.sc).slice(0,40)}
// ---------- presun na miesto ----------
function flash(el){if(!el)return false;try{if(el.tagName==="SUMMARY"&&el.parentElement&&!el.parentElement.open)el.parentElement.open=true;const d=el.closest("details");if(d&&!d.open)d.open=true}catch(x){}
  el.scrollIntoView({block:"center",behavior:"smooth"});el.classList.add("hlflash");setTimeout(()=>el.classList.remove("hlflash"),2800);return true}
// 🎯 IBA TO, ČO HĽADÁŠ (7. 11. 08:34 príkaz majiteľa „vstúpiť do nej a len to tam chcem mať, čo vyhľadávam – nie raňajky, počasie…“):
// nájdená časť sa ukáže sama (ostatné v záložke sa skryje), hore pás „🔎 Iba: … · ✕ Zobraziť celú sekciu“; pri prekreslení sa fokus obnoví, pri zmene záložky zruší.
let FOC=null;
function boxOf(el){const app=document.getElementById("app");if(!el||!app||!app.contains(el))return null;if(el.tagName==="SUMMARY"&&el.parentElement)return el.parentElement.closest(".card,section,.ospl,.ocn")||el.parentElement;
  let c=el.closest(".card,section.card,.ospl,.ocn,details,.osr,.ocnr,.obr,.car,.caf");if(!c||c===app)c=el.closest("#app > *")||el;return c}
function unhide(){document.querySelectorAll("[data-hlhide]").forEach(x=>x.removeAttribute("data-hlhide"))}
function unfocus(){FOC=null;unhide();document.body.classList.remove("hlfocusing");const b=document.getElementById("hlFoc");if(b)b.remove()}
function hideAround(c){const app=document.getElementById("app");unhide();let x=c;
  while(x&&x!==app&&x.parentElement){for(const s of x.parentElement.children)if(s!==x&&!s.matches("nav.tabs,script,style,#hlFoc"))s.setAttribute("data-hlhide","");if(x.parentElement===app)break;x=x.parentElement}
  try{const d=c.matches("details")?c:null;if(d)d.open=true;c.querySelectorAll(":scope>details").forEach(z=>{z.open=true})}catch(e){}}
function focusOn(el,label){const c=boxOf(el);if(!c)return false;const T=typeof TAB!=="undefined"?TAB:null;FOC={c,label:label||(el.textContent||"").trim().slice(0,60),tab:T,find:(el.textContent||"").trim().slice(0,50)};hideAround(c);
  document.body.classList.add("hlfocusing");let b=document.getElementById("hlFoc");if(!b){b=document.createElement("div");b.id="hlFoc";b.className="hlfoc";document.body.appendChild(b)}
  b.innerHTML=`<span>🔎 Iba: <b>${E(FOC.label)}</b></span><button type="button" data-hlunfoc>✕ Zobraziť celú sekciu</button>`;
  scrollTo({top:0});setTimeout(()=>{const r=c.getBoundingClientRect();scrollTo({top:Math.max(0,scrollY+r.top-90),behavior:"smooth"})},60);c.classList.add("hlflash");setTimeout(()=>c.classList.remove("hlflash"),2400);return true}
function refocus(){if(!FOC)return;const T=typeof TAB!=="undefined"?TAB:null;if(FOC.tab!==T){unfocus();return}
  if(FOC.c&&document.contains(FOC.c)){if(!document.querySelector("[data-hlhide]"))hideAround(FOC.c);return}
  const el=byText(FOC.find)||findCard(FOC.find);const c=el&&boxOf(el);if(c){FOC.c=c;hideAround(c)}}
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-hlunfoc]")){e.preventDefault();const c=FOC&&FOC.c;unfocus();if(c&&document.contains(c))setTimeout(()=>c.scrollIntoView({block:"start"}),50);return}
  if(FOC&&e.target.closest&&e.target.closest("#app>nav.tabs [data-tab],#rdBar button,#rdSide [data-rdgo],[data-rdgo]"))unfocus()},true);
function after(fn,n=28){let i=0;const t=setInterval(()=>{i++;let ok=false;try{ok=fn()}catch(x){}if(ok||i>=n)clearInterval(t)},250)}
function goTab(k){if(!k||isF())return;const b=document.querySelector(`#app>nav.tabs [data-tab="${k}"]`);if(b){b.click();scrollTo({top:0})}else{try{TAB=k;renderStaff();scrollTo({top:0})}catch(x){}}}
function byText(txt,sel){const n=N(txt).slice(0,40);if(!n)return null;const L=[...document.querySelectorAll(sel||"#app .secbar button,#app h2,#app h3,#app summary,#app .owsh span,#app .srt,#app .ocnt,#app .card>b,#app section h2")];
  return L.find(el=>el.offsetParent!==null&&N(el.textContent).startsWith(n))||L.find(el=>el.offsetParent!==null&&N(el.textContent).includes(n))}
function findCard(txt){const n=N(txt);if(!n)return null;return [...document.querySelectorAll("#app .card,#app .ds-card,#app section,#app .osr,#app .ocnr")].reverse().find(x=>x.offsetParent!==null&&N(x.textContent).includes(n))}
function openSec(r){unfocus();goTab(r.tab);after(()=>{const el=byText(r.find||r.t,"#app h2,#app h3,#app summary,#app .owsh span,#app .srt,#app .ocnt,#app .card>b,#app section h2");if(el)return focusOn(el,r.t);const sb=byText(r.find||r.t,"#app .secbar button");if(sb){sb.click();return true}return false})}
function toastS(r){if(typeof toast==="function")toast((ICO[r.k]||"")+" "+r.t+(r.s?" · "+r.s:""),7000)}
function act(r){closeUI();unfocus();const k=r.k;const F=(el,lab)=>el?focusOn(el,lab||r.t):false;
  if(k==="tab"){goTab(r.tab);return}
  if(k==="sec"||k==="help"){if(r.tab)openSec(r);else after(()=>flash(byText(r.find)));return}
  if(k==="fn"){const parts=String(r.s||"").split(/→|·|;|,/).map(x=>x.trim()).filter(Boolean),T=tabs();let tab=null;
    for(const p of parts){const np=N(p);for(const kk in T){const nt=N(T[kk]);if(nt&&(np.includes(nt)||nt.includes(np)))tab=tab||kk}}
    if(tab){goTab(tab);const last=parts.slice(1).reverse();after(()=>{for(const p of last){const el=byText(p);if(el)return F(el,p)}return false},16)}else toastS(r);return}
  if(k==="deal"){const D=((typeof STATE!=="undefined"&&STATE)||{}),d=[...(D.deals||[]),...(D.dealsArch||[]),...(D.dealsTest||[])].find(x=>String(x.id)===String(r.id));
    try{if(d&&window.rokOk&&!rokOk(d)&&window.rokSet)rokSet("")}catch(x){}goTab(r.tab||"deals");const no=String(r.t).split(" · ")[0];
    after(()=>{const el=document.querySelector(`#app [data-cpdf="${CSS.escape(String(r.id))}"]`)||document.querySelector(`#app [data-deal="${CSS.escape(String(r.id))}"]`);if(el)return F(el,no);return F(findCard(no),no)});return}
  if(k==="farmer"){try{FQ=String(r.t||"")}catch(x){}goTab("farm");after(()=>F(findCard(r.t)));return}
  if(k==="buyer"){goTab("home");after(()=>{const s=document.getElementById("ocnSec");if(!s)return false;const d=s.querySelector('[data-ocnd="list"]');if(d)d.open=true;return F(s,"🏷️ Ceny odberateľov")});return}
  if(k==="spol"){goTab("deals");after(()=>{const b=document.querySelector(`[data-osp="open"][data-id="${CSS.escape(String(r.id))}"]`);if(b){F(b.closest(".osr")||b);setTimeout(()=>b.click(),700);return true}return F(document.getElementById("osplCard"),"🤝 Spolupráca s odberateľmi")});return}
  if(k==="veh"){goTab("fleet");after(()=>{try{const b=document.createElement("button");b.hidden=true;b.dataset.aveh=r.id;document.body.appendChild(b);b.click();b.remove();return true}catch(x){return false}},20);return}
  if(r.tab)goTab(r.tab);const key=String(r.t).split(" · ")[0];after(()=>F(findCard(key),key),16);toastS(r)}
// ---------- výsledky ----------
let RES=[],SEL=0,TMR=0;
let MORE=false,LASTR=null;
const row=(r,i)=>`<button type="button" class="hlr rdmr${i===SEL?" sel":""}" data-rdres="${i}" data-hlres="${i}"><span class="hli" aria-hidden="true">${ICO[r.k]||"•"}</span><span class="hlt"><b>${E(r.t)}</b><small>${E(r.g)}${r.s?" · "+E(r.s):""}</small></span></button>`;
function html(R,q,busy){if(!R.length)return `<div class="hlnone">${busy?"⏳ Hľadám…":`Nič sa nenašlo pre „${E(q)}“. Skús kratšie slovo, meno, číslo zmluvy, ŠPZ alebo IČO.`}</div>`;
  const nT=R.filter(r=>r.tm).length;let h="";
  if(nT){h+=`<h3 class="hlg">🎯 Presne to, čo hľadáš</h3>`;R.forEach((r,i)=>{if(r.tm)h+=row(r,i)});
    const nO=R.length-nT;if(nO)h+=MORE?`<h3 class="hlg">Súvisiace</h3>`+R.map((r,i)=>r.tm?"":row(r,i)).join(""):`<button type="button" class="hlmore" data-hlmore>＋ Súvisiace výsledky (${nO})</button>`}
  else{h+=`<h3 class="hlg">Presná zhoda nie je – podobné</h3>`;R.forEach((r,i)=>{h+=row(r,i)})}
  return h+(busy?`<div class="hlnone">⏳ Hľadám aj v údajoch…</div>`:"")}
const GORD=["Sekcie aplikácie","Časti sekcií a návody","Časti aplikácie","Funkcie – kde to nájdeš","Zmluvy s farmármi","Predajné zmluvy s odberateľmi","Spolupráca s odberateľmi","Odberatelia","Farmári a dodávatelia","Tím a používatelia","Vážne lístky","Požiadavky","Vozidlá"];
async function run(q,L,cb){const my=++RQ;LASTQ=q;await map();if(my!==RQ)return;const T=tabs(),loc=local(T,q).map(o=>Object.assign(o,{a:()=>act(o)}));
  const KO={tab:0,sec:1,help:2,fn:3,spol:4,sale:5,deal:6,buyer:7,farmer:8,staff:9,ticket:10,req:11,veh:12,truck:12};const put=(R,busy)=>{R.sort((a,b)=>(b.tm-a.tm)||(b.sc-a.sc)||((KO[a.k]??20)-(KO[b.k]??20)));const top=R.filter(r=>r.tm);RES=top.concat(R.filter(r=>!r.tm));SEL=0;LASTR={R:RES,q,busy,L};L.innerHTML=html(RES,q,busy);if(cb)cb(RES)};MORE=false;
  put(loc.slice(),true);clearTimeout(TMR);
  TMR=setTimeout(async()=>{let rem=[];try{const r=await sb.rpc("hladaj",{p_q:q});if(!r.error&&Array.isArray(r.data))rem=r.data}catch(x){}if(my!==RQ)return;
    const tk=TOK(q);const R=loc.concat(rem.map(o=>{const x=Object.assign({},o);const tt=N((x.g||"")+" "+(x.t||"")+" "+(x.s||""));x.tm=HIT(tt,tk);x.sc=(x.tm?90:0)+tk.reduce((s,t)=>s+(tt.includes(t)?3:0),0);x.a=()=>act(x);return x}));put(R,false)},220)}
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
document.addEventListener("click",e=>{const m=e.target.closest&&e.target.closest("[data-hlmore]");if(m&&LASTR){e.preventDefault();e.stopPropagation();MORE=true;LASTR.L.innerHTML=html(LASTR.R,LASTR.q,LASTR.busy);return}},true);
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-hlres],[data-hlclose],[data-hlopen],#hlBox");if(!t)return;
  if(t.dataset.hlopen!==undefined){e.preventDefault();openUI();return}
  if(t.dataset.hlclose!==undefined){e.preventDefault();closeUI();return}
  if(t.id==="hlBox"&&e.target===t){closeUI();return}
  if(t.dataset.hlres!==undefined&&t.closest("#hlBox")){e.preventDefault();const r=RES[+t.dataset.hlres];if(r)r.a()}},true);
// 🔎 do radu tlačidiel (.hrow) pre každého, kto nemá nový vzhľad majiteľa
function btn(){const app=document.getElementById("app");if(!app||document.documentElement.classList.contains("rd"))return;if(app.querySelector("[data-hlopen]"))return;
  const row=app.querySelector(".hrow")||app.querySelector(".hero");if(!row)return;const b=document.createElement("button");b.type="button";b.dataset.hlopen="";b.className="hlbtn";b.setAttribute("aria-label","Hľadať v aplikácii");b.title="Hľadať v aplikácii";b.textContent="🔎 Hľadať";row.appendChild(b)}
let qq=0;const sch=()=>{if(qq)return;qq=(window.ernteSoon||requestAnimationFrame)(()=>{qq=0;try{btn();refocus()}catch(x){}})};
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
#rdML .hlr{background:transparent}
[data-hlhide]{display:none!important}.hlfoc{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 8px);z-index:70;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 16px);padding:6px 6px 6px 14px;border-radius:999px;background:#0B0F19;border:1px solid rgba(94,234,212,.7);box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:.84rem}.hlfoc span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hlfoc button{min-height:40px;padding:0 12px;border-radius:999px;white-space:nowrap;flex:none}html[data-theme=light] .hlfoc{background:#fff}
body.hlfocusing #spatFab{display:none!important}
.hlmore{width:100%;min-height:46px;margin:8px 0;border-radius:12px}`;document.head.appendChild(s)}
})();
