// ===== 🔘 SEKCIE AKO TLAČIDLÁ (iba majitelia – Martin a Jana) =====
// V dlhých záložkách (Cenník, Obchody, Farmári) sú bloky schované za tlačidlami – ťukneš a otvorí sa iba ten jeden,
// netreba rolovať. Voľba sa pamätá počas práce (pre každú záložku). Ostatní používatelia vidia záložky ako doteraz.
(function(){
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const CFG={
  price:{def:"cen",S:[["bzc",":scope > .card.bzc","📈 Burza"],["trh",":scope > .card.trhcard","🔮 Trh a predpoveď"],["kkg",":scope > .card.kkg","🛡️ Kontrola cien"],["acn",":scope > .card.acn-card","🤖 Automatický cenník"],
    ["cen",":scope > form.card.f:not(.chcard), :scope > .card.nuc","💶 Výkupné ceny",1],["his",":scope > div.card.chcard","📜 História cien"],["upz",":scope > form.card.chcard","🔔 Upozornenie na zmenu"],["kk",":scope > .card.kkcard","🏷️ Konkurenčné ceny"]]},
  deals:{def:"",S:[["dw",":scope > .card.dwcard","📊 Stráženie nákupov"],["new",":scope > form.card.f","➕ Nový obchod"],["lis",":scope > details.card.hsec","⚖️ Vážne lístky"]]},
  farm:{def:"",S:[["reg",":scope > .card.fsall","🔎 Údaje z registra"],["ppa",":scope > .card.ppa","🌾 Pôda z PPA"],["fpc",":scope > details.card.fpc","👁️ Čo vidia farmári"]]}
};
const KEY=t=>"ernte-sec-"+t;
const DEF=t=>CFG[t]?CFG[t].def:"*";
const getSel=t=>{try{const v=sessionStorage.getItem(KEY(t));return v===null?DEF(t):v}catch(x){return DEF(t)}};
const setSel=(t,v)=>{try{sessionStorage.setItem(KEY(t),v)}catch(x){}};
/* 2. 11. 11:11 PRÍKAZ MAJITEĽA: „každú dlaždicu daj hore do tlačidla, hneď z hora si vyberiem – v každej sekcii“ → aj ostatné záložky:
   každá hlavná karta (s nadpisom) = tlačidlo v lište hore; „📋 Všetko“ ukáže všetko (predvolené). */
const SKIPT={fleet:1,wx:1};
const NOC=".secbar,.rokbar,.spatbar,.hero,.zfh,.plwarn,[class*=inst],[data-nosec],.fdesc,nav,.hrow,script,style";
const lab=el=>{const h=el.matches("h2,h3")?el:el.querySelector("h2,h3,summary,.row .t,.t,b.sth,legend")||el.querySelector(":scope > b, :scope > strong, :scope > div > b, :scope > .row > b");
  let x="";if(h){const c=h.cloneNode(true);c.querySelectorAll("small,.s,.sub,.muted,.fdesc,button,svg,img").forEach(z=>z.remove());x=String(c.textContent||"").replace(/\s+/g," ").trim()}if(!x)return "";x=x.replace(/›$/,"").split(" · ")[0].trim();return x.length>30?x.slice(0,29).trim()+"…":x};
const CARD=".card,section.card,details.card,form.card";
function items(box,deep){const K=[...box.children].filter(e=>!e.matches(NOC)),L=[];if(deep>3)return L;
  const nH=K.filter(e=>e.matches("h2")).length;let g=null;
  for(const e of K){if(e.matches("h2")){if(nH<2){g=null;continue}const x=lab(e);g=x?{x,els:[e]}:null;if(g)L.push(g);continue}
    if(g){g.els.push(e);continue}
    if(e.matches(CARD)){const x=lab(e);if(x)L.push({x,els:[e]});continue}
    // obal (Zúčtovanie/Danube .zt, Prehľad .hub …) → sekcie vo vnútri
    let I=[];if([...e.children].filter(c=>c.matches(CARD)||c.matches("h2")).length>=2)I=items(e,deep+1);
    if(I.length)L.push(...I);else if(!e.matches(".acn-wrap,.pban,.ernNew,[id^=ern]")&&e.children.length>=2){const x=lab(e);if(x)L.push({x,els:[e]})}}
  return L}
function auto(app,t){if(SKIPT[t])return null;const L=[],seen={};
  for(const it of items(app,0)){if(seen[it.x])continue;seen[it.x]=1;L.push(["a:"+it.x.replace(/[\d\s()]+/g,""),it.els,it.x])}
  return L.length>=3&&L.length<=16?L:null}
let LAST=null;
function apply(){const app=document.getElementById("app");if(!app)return;
  const t=typeof TAB!=="undefined"?TAB:"";let C=CFG[t];
  if(!C&&OWN()&&!window.ERNTE_VIEWAS){app.querySelectorAll(".sbh").forEach(e=>e.classList.remove("sbh"));const A=auto(app,t);if(A)C={def:"*",auto:A}}
  if(!OWN()||!C||window.ERNTE_VIEWAS){app.querySelectorAll(":scope > .secbar").forEach(b=>b.remove());app.querySelectorAll(".sbh").forEach(e=>e.classList.remove("sbh"));return}
  let found=C.auto?C.auto:C.S.map(([k,sel,lab,mm])=>{if(!mm)return [k,app.querySelector(sel),lab];const L=[...app.querySelectorAll(sel)];return [k,L.length>1?L:L[0],lab]}).filter(x=>x[1]);  /* mm: viac kariet v jednej sekcii (Výkupné ceny + 🌱 Nová úroda) */
  /* ďalšie karty záložky (Obchodné návrhy AI, Môj plán, Predaj…) tiež ako tlačidlá; pri predvolenom výbere ostávajú viditeľné */
  if(!C.auto){const E=found.flatMap(x=>Array.isArray(x[1])?x[1]:[x[1]]),X=(items(app,0)||[]).filter(it=>!it.els.some(z=>E.some(c=>c===z||c.contains(z)||z.contains(c)))).map(it=>["x:"+it.x.replace(/[\d\s()]+/g,""),it.els,it.x,1]);found=found.concat(X)}
  if(found.length<2){app.querySelectorAll(":scope > .secbar").forEach(b=>b.remove());return}
  LAST={t,found};let cur=getSel(t);if(C.auto&&cur!=="*"&&!found.some(x=>x[0]===cur))cur="*";else if(!C.auto&&cur&&cur!=="*"&&!found.some(x=>x[0]===cur))cur="";
  const act=document.activeElement;
  for(const [k,el,,xx] of found){const E=Array.isArray(el)?el:[el],keep=cur==="*"||k===cur||(xx&&!cur)||(act&&act!==document.body&&E.some(z=>z.contains(act)));E.forEach(z=>z.classList.toggle("sbh",!keep))}
  let bar=app.querySelector(":scope > .secbar");const html=`<button type="button" data-secb="*" aria-pressed="${cur==="*"}">📋 Všetko</button>`+found.map(([k,,lab])=>`<button type="button" data-secb="${String(k).replace(/"/g,"&quot;")}" aria-pressed="${k===cur}">${String(lab).replace(/</g,"&lt;")}</button>`).join("");
  if(!bar){bar=document.createElement("div");bar.className="secbar";bar.setAttribute("role","toolbar");bar.setAttribute("aria-label","Sekcie");}
  if(bar.dataset.h!==html+t){bar.innerHTML=html;bar.dataset.h=html+t}
  const top=[...app.children].filter(e=>e.matches("nav.tabs,.rokbar,.spatbar,.uvodb")&&!e.classList.contains("sbh")),anc=top.length?top[top.length-1]:null;
  if(anc){if(bar.parentNode!==app)anc.after(bar);if(window.ernteTopOrder)window.ernteTopOrder();else if(bar.previousElementSibling!==anc)anc.after(bar)}else{const f0=found[0][1],first=Array.isArray(f0)?f0[0]:f0;if(bar.nextElementSibling!==first||bar.parentNode!==app)app.insertBefore(bar,first)}}
/* 2. 11. 18:46 „nereaguje Pridať“ – tlačidlo mimo sekcií (➕ Pridať zamestnanca …) otvára formulár v skrytej sekcii → ukáž všetko */
window.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest||t.closest(".secbar")||!LAST||typeof TAB==="undefined"||LAST.t!==TAB)return;
  const app=document.getElementById("app");if(!app||!app.contains(t)||!t.closest("button,a,[role=button]"))return;
  const inItem=LAST.found.some(x=>(Array.isArray(x[1])?x[1]:[x[1]]).some(z=>z.contains(t)));if(inItem)return;
  const cur=getSel(TAB);if(!cur||cur==="*")return;setSel(TAB,"*");apply()},true);
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-secb]");if(!b)return;e.preventDefault();
  const t=TAB,k=b.dataset.secb,cur=getSel(t),au=!CFG[t];setSel(t,au?(cur===k?"*":k):(cur===k?(k==="*"?"":""):k));apply();
  const bar=document.querySelector("#app > .secbar");if(bar&&cur!==k){const y=bar.getBoundingClientRect().top+scrollY-70;if(Math.abs(scrollY-y)>40)window.scrollTo({top:y,behavior:"smooth"})}});
{const s=document.createElement("style");s.textContent=`.sbh{display:none!important}
.secbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:4px 0 12px}
.secbar button{min-height:52px;border-radius:16px;font-weight:700;font-size:.9rem;line-height:1.2;padding:6px 8px;white-space:normal;text-align:center;min-width:0}
.secbar button[aria-pressed="true"]{background:linear-gradient(135deg,#34d399,#22d3ee)!important;color:#05210f!important;border-color:transparent!important}
@media(min-width:700px){.secbar{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{apply()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
