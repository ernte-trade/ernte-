// ===== 🧪 STARÁ / NOVÁ VERZIA APLIKÁCIE (iba majiteľ – Martin, ERNTE spol.) =====
// farmar/       = stará (overená) verzia pre celý tím, farmárov a všetkých ostatných
// farmar/beta/  = nová verzia s poslednými úpravami – vidí ju iba majiteľ, kým ju nezverejní (✅ Zverejniť všetkým)
// Tlačidlo 🧪 je pri zvončeku. Voľba sa pamätá na zariadení (otvorenie appky → posledná zvolená verzia).
(function(){
const BETA=/\/beta\//.test(location.pathname);
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PREVIEW=()=>!!(window.ERNTE_VIEWAS||window.ERNTE_TEST)||/[?&](viewas|test)=/.test(location.search);
const MAIN=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK()&&!PREVIEW();
/* PRÍKAZ MAJITEĽA (30. 10.): Martin a Jana sú vždy v najnovšej verzii, bez ponuky prepínania */
const NEWEST=()=>!PREVIEW()&&typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof ME!=="undefined"&&!!ME&&(MAIN()||/^jana\.valkova@/i.test(String(ME.email||"")));
const KEY="ernte-verzia";
const pref=()=>{try{return localStorage.getItem(KEY)||""}catch(x){return ""}};
const setPref=v=>{try{localStorage.setItem(KEY,v)}catch(x){}};
let Z=null,open=false,busy=false;
async function zm(){if(Z)return Z;try{const r=await fetch((BETA?"":"beta/")+"zmeny.json?u="+Date.now(),{cache:"no-store"});Z=r.ok?await r.json():{n:0,list:[],none:1}}catch(x){Z={n:0,list:[],none:1}}paint();return Z}
const go=to=>{setPref(to);const h=location.hash||"";location.href=(to==="nova"?(BETA?"./":"beta/"):(BETA?"../":"./"))+h};
const dsk=d=>{try{return new Date(d).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}catch(x){return ""}};
function btn(){const n=Z&&!Z.same?Z.n:0;return `<button type="button" class="vrb${BETA?" on":""}" data-vrb="1" aria-label="${BETA?"Nová verzia – prepnúť":"Stará verzia – prepnúť na novú"}" title="${BETA?"Používaš NOVÚ verziu":"Používaš STARÚ verziu"}"><span aria-hidden="true">🧪</span>${BETA?"<i>NOVÁ</i>":n?`<b>${n>99?"99+":n}</b>`:""}</button>`}
function sheet(){const z=Z||{n:0,list:[]},L=z.list||[];
  return `<div class="vrs" id="vrSheet" role="dialog" aria-modal="true"><div class="vrbox"><div class="vrh"><b>🧪 Verzia aplikácie</b><button type="button" class="vrx" data-vrx="1" aria-label="Zavrieť">✕</button></div>
   <div class="vrnow">Teraz používaš: <b>${BETA?"🆕 NOVÚ verziu":"✔︎ STARÚ (overenú) verziu"}</b></div>
   <div class="s">Celý tím, farmári a ostatní majú <b>starú</b> verziu. Novú vidíš iba ty, kým ju nezverejníš.</div>
   ${z.none?`<div class="s">Zoznam zmien sa ešte pripravuje (pár minút po nasadení).</div>`:z.same||!L.length?`<div class="s">✅ Nová a stará verzia sú rovnaké – nič nečaká na zverejnenie.</div>`:
     `<div class="vrlh">Čo je v novej verzii (${z.n}):</div><ul class="vrl">${L.map(x=>`<li><small>${E(dsk(x.d))}</small>${E(x.s)}</li>`).join("")}</ul>`}
   <div class="btns vrbt">${BETA?`<button type="button" data-vrgo="stara">↩️ Prepnúť na starú</button>`:`<button type="button" class="pri" data-vrgo="nova">🆕 Prepnúť na novú</button>`}
    ${BETA&&!z.same&&L.length?`<button type="button" class="lime" data-vrrel="1"${busy?" disabled":""}>✅ Zverejniť novú verziu všetkým</button>`:""}</div>
   <div class="s">Údaje (ceny, obchody, zúčtovanie) sú v oboch verziách rovnaké a živé – mení sa iba vzhľad a funkcie aplikácie.</div></div></div>`}
function paint(){const app=document.getElementById("app");if(!app)return;{const o=document.querySelector(".vrb");if(o)o.remove()}return;const row=app.querySelector(":scope > .hrow");
  const old=document.querySelector(".vrb");
  if(!MAIN()||!row){if(old)old.remove();return}
  const nb=btn();if(old&&old.parentNode===row){if(old.outerHTML!==nb)old.outerHTML=nb}else{if(old)old.remove();const bell=row.querySelector(".nbb");if(bell)bell.insertAdjacentHTML("afterend",nb);else row.insertAdjacentHTML("afterbegin",nb)}}
function show(){open=true;let s=document.getElementById("vrSheet");if(s)s.remove();document.body.insertAdjacentHTML("beforeend",sheet())}
function hide(){open=false;const s=document.getElementById("vrSheet");if(s)s.remove()}
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-vrb],[data-vrx],[data-vrgo],[data-vrrel],#vrSheet");if(!t)return;
  if(t.id==="vrSheet"){if(e.target===t)hide();return}
  e.preventDefault();
  if(t.dataset.vrb){await zm();show();return}
  if(t.dataset.vrx){hide();return}
  if(t.dataset.vrgo){go(t.dataset.vrgo);return}
  if(t.dataset.vrrel){if(!confirm("Zverejniť novú verziu celému tímu, farmárom aj všetkým ostatným?"))return;busy=true;show();
    try{const r=await sb.rpc("app_release");if(r.error)throw r.error;setPref("");(typeof toast==="function"?toast:alert)("✅ Nová verzia sa zverejňuje – o 2–3 minúty ju budú mať všetci.",8000);hide()}
    catch(x){(typeof toast==="function"?toast:alert)("Nepodarilo sa: "+(x.message||x),8000)}busy=false}});
document.addEventListener("keydown",e=>{if(open&&e.key==="Escape")hide()});
// kto nie je majiteľ, v novej verzii nemá čo robiť → stará; majiteľ s voľbou „nová“ sa pri otvorení starej presunie do novej
let tries=0;const chk=setInterval(()=>{tries++;if(tries>60){clearInterval(chk);return}
  const isF=typeof FARMER!=="undefined"&&!!FARMER;if(!isF&&(typeof ROLE==="undefined"||!ROLE||typeof ME==="undefined"||!ME))return;clearInterval(chk);if(PREVIEW())return;
  if(BETA&&!NEWEST()){location.replace("../"+(location.hash||""));return}
  if(!BETA&&NEWEST()){location.replace("beta/"+(location.hash||""));return}
  if(MAIN())zm()},500);
{const s=document.createElement("style");s.textContent=`.vrb{position:relative;overflow:visible!important;min-width:44px;min-height:44px;padding:0 12px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:1.05rem;margin-left:6px}
.vrb b{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#a3e635;color:#0b1020;font:800 .7rem/18px system-ui}
.vrb.on{background:linear-gradient(135deg,#a3e635,#22d3ee)!important;color:#0b1020!important;border-color:transparent!important}.vrb i{font:800 .72rem system-ui;font-style:normal;letter-spacing:.04em}
.vrs{position:fixed;inset:0;z-index:10060;background:rgba(2,6,23,.6);display:flex;align-items:flex-end;justify-content:center;padding:12px}
.vrbox{width:100%;max-width:560px;max-height:86vh;overflow:auto;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:22px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.vrh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.vrh b{font-size:1.1rem}
.vrx{width:44px;height:44px;min-width:44px;border-radius:50%!important;padding:0!important;display:grid;place-items:center}
.vrnow{margin:4px 0 6px;font-size:1rem}.vrlh{margin:10px 0 4px;font-weight:800}
.vrl{margin:0;padding-left:18px;display:grid;gap:6px;font-size:.88rem}.vrl small{display:block;opacity:.65;font-size:.72rem}
.vrbt{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 6px}.vrbt button{flex:1 1 200px;min-height:46px}
@media(min-width:700px){.vrs{align-items:center}}
html[data-theme=light] .vrbox{background:#fff;color:#0f172a;border-color:rgba(15,23,42,.12)}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{paint()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true,subtree:false});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.ernteBeta=BETA;
})();
