// ===== 🔘 SEKCIE AKO TLAČIDLÁ (iba majitelia – Martin a Jana) =====
// V dlhých záložkách (Cenník, Obchody, Farmári) sú bloky schované za tlačidlami – ťukneš a otvorí sa iba ten jeden,
// netreba rolovať. Voľba sa pamätá počas práce (pre každú záložku). Ostatní používatelia vidia záložky ako doteraz.
(function(){
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const CFG={
  price:{def:"cen",S:[["bzc",":scope > .card.bzc","📈 Burza"],["kkg",":scope > .card.kkg","🛡️ Kontrola cien"],["acn",":scope > .card.acn-card","🤖 Automatický cenník"],
    ["cen",":scope > form.card.f:not(.chcard)","💶 Výkupné ceny"],["his",":scope > div.card.chcard","📜 História cien"],["upz",":scope > form.card.chcard","🔔 Upozornenie na zmenu"],["kk",":scope > .card.kkcard","🏷️ Konkurenčné ceny"]]},
  deals:{def:"",S:[["dw",":scope > .card.dwcard","📊 Stráženie nákupov"],["new",":scope > form.card.f","➕ Nový obchod"],["lis",":scope > details.card.hsec","⚖️ Vážne lístky"]]},
  farm:{def:"",S:[["reg",":scope > .card.fsall","🔎 Údaje z registra"],["ppa",":scope > .card.ppa","🌾 Pôda z PPA"],["fpc",":scope > details.card.fpc","👁️ Čo vidia farmári"]]}
};
const KEY=t=>"ernte-sec-"+t;
const getSel=t=>{try{const v=sessionStorage.getItem(KEY(t));return v===null?CFG[t].def:v}catch(x){return CFG[t].def}};
const setSel=(t,v)=>{try{sessionStorage.setItem(KEY(t),v)}catch(x){}};
function apply(){const app=document.getElementById("app");if(!app)return;
  const t=typeof TAB!=="undefined"?TAB:"",C=CFG[t];
  if(!OWN()||!C||window.ERNTE_VIEWAS){app.querySelectorAll(":scope > .secbar").forEach(b=>b.remove());app.querySelectorAll(".sbh").forEach(e=>e.classList.remove("sbh"));return}
  const found=C.S.map(([k,sel,lab])=>[k,app.querySelector(sel),lab]).filter(x=>x[1]);
  if(found.length<2){app.querySelectorAll(":scope > .secbar").forEach(b=>b.remove());return}
  let cur=getSel(t);if(cur&&!found.some(x=>x[0]===cur))cur=found[0][0];
  const act=document.activeElement;
  for(const [k,el] of found){const keep=k===cur||(act&&el.contains(act)&&act!==document.body);el.classList.toggle("sbh",!keep)}
  let bar=app.querySelector(":scope > .secbar");const html=found.map(([k,,lab])=>`<button type="button" data-secb="${k}" aria-pressed="${k===cur}">${lab}</button>`).join("");
  if(!bar){bar=document.createElement("div");bar.className="secbar";bar.setAttribute("role","toolbar");bar.setAttribute("aria-label","Sekcie");}
  if(bar.dataset.h!==html+t){bar.innerHTML=html;bar.dataset.h=html+t}
  const first=found[0][1];if(bar.nextElementSibling!==first||bar.parentNode!==app)app.insertBefore(bar,first)}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-secb]");if(!b)return;e.preventDefault();
  const t=TAB,k=b.dataset.secb,cur=getSel(t);setSel(t,cur===k?"":k);apply();
  const bar=document.querySelector("#app > .secbar");if(bar&&cur!==k){const y=bar.getBoundingClientRect().top+scrollY-70;if(Math.abs(scrollY-y)>40)window.scrollTo({top:y,behavior:"smooth"})}});
{const s=document.createElement("style");s.textContent=`.sbh{display:none!important}
.secbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:4px 0 12px}
.secbar button{min-height:52px;border-radius:16px;font-weight:700;font-size:.9rem;line-height:1.2;padding:6px 8px;white-space:normal;text-align:center;min-width:0}
.secbar button[aria-pressed="true"]{background:linear-gradient(135deg,#34d399,#22d3ee)!important;color:#05210f!important;border-color:transparent!important}
@media(min-width:700px){.secbar{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{apply()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
