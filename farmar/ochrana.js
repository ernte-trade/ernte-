// ===== 🛡️ NAŠA OCHRANA (príkaz majiteľa 1. 11.: „aby nemohli sťahovať dáta od nás a priradiť si ich hocikde“) =====
// Každé stiahnutie súboru, uloženie/zdieľanie PDF, tlač a skopírovanie väčšieho textu sa zapíše (guard_log) – kto, kedy, čo.
// Pri nezvyčajnom množstve príde Martinovi push. Martin môže človeku export zablokovať (guard_block) – potom sťahovanie,
// zdieľanie, tlač aj kopírovanie nefunguje. Každé PDF má v päte skrytú stopu (meno, čas, kód). Martin sa nekontroluje.
(function(){
const E=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IN=()=>typeof sb!=="undefined"&&typeof ME!=="undefined"&&!!ME&&!window.ERNTE_VIEWAS;
const MAIN=()=>typeof MAIN_OK==="function"&&MAIN_OK()&&typeof ROLE!=="undefined"&&ROLE==="owner";
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||5000);else alert(t)};
let ST={blocked:false,own:false,at:0};
/* 2. 11. oprava spomalenia: pri chybe / prázdnej odpovedi sa guard_status volal pri každej zmene obrazovky (stovky krát za sekundu) – teraz najviac raz za 2 min */
async function status(){if(!IN())return ST;if(Date.now()-ST.at<120e3)return ST;ST.at=Date.now();try{const r=await sb.rpc("guard_status");if(!r.error&&r.data)ST=Object.assign(r.data,{at:Date.now()})}catch(x){}return ST}
function who(){try{if(typeof FARMER!=="undefined"&&FARMER&&FARMER.name)return FARMER.name;if(window.kidCtx&&kidCtx())return kidCtx().K.name;return (ME&&(ME.staffName||ME.email))||""}catch(x){return ""}}
function log(kind,what,n){if(!IN()||MAIN())return;try{sb.rpc("guard_log",{p_kind:kind,p_what:String(what||"").slice(0,200),p_n:n||1,p_dev:navigator.userAgent.slice(0,120)}).then(r=>{if(r&&r.data&&r.data.blocked)ST.blocked=true},()=>{})}catch(x){}}
const blocked=()=>ST.blocked&&!MAIN();
const deny=()=>say("🛡️ Sťahovanie a kopírovanie údajov máš zablokované majiteľom ERNTE.",6000);
// stiahnutie súboru (a[download])
const aClick=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute&&this.hasAttribute("download")){if(blocked()){deny();return}this.__gl=Date.now();log("export",this.download||this.href)}return aClick.apply(this,arguments)};
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[download]");if(!a)return;if(a.__gl&&Date.now()-a.__gl<2000)return;if(blocked()){e.preventDefault();e.stopPropagation();deny();return}log("export",a.download||a.href)},true);
// zdieľanie
if(navigator.share){const sh=navigator.share.bind(navigator);navigator.share=function(d){if(blocked()){deny();return Promise.reject(new Error("blocked"))}
  log("share",(d&&((d.files&&[...d.files].map(f=>f.name).join(", "))||d.title||d.url))||"");return sh(d)}}
// tlač
const pr=window.print.bind(window);window.print=function(){if(blocked()){deny();return}log("print",document.title);return pr()};
// kopírovanie väčšieho textu
document.addEventListener("copy",e=>{if(!IN()||MAIN())return;const t=String((document.getSelection&&document.getSelection())||"");if(t.length<120)return;
  if(blocked()){e.preventDefault();deny();return}log("copy",(typeof TAB!=="undefined"&&TAB?"sekcia "+TAB+" · ":"")+t.length+" znakov",t.length)},true);
// skrytá stopa v každom PDF
window.ernteTrace=function(d){try{if(!d||!d.body||d.querySelector(".ernte-trace"))return;const n=new Date(),code=(Date.now().toString(36)+Math.random().toString(36).slice(2,6)).toUpperCase();
  const f=d.createElement("div");f.className="ernte-trace";f.setAttribute("style","margin-top:14px;font:7px/1.2 Arial,sans-serif;color:#9aa3ad;text-align:right");
  f.textContent=`Dokument z aplikácie ERNTE · vytvoril(a): ${who()} · ${n.toLocaleString("sk-SK")} · kód ${code}`;d.body.appendChild(f);log("export","PDF: "+(d.title||"dokument")+" · kód "+code)}catch(x){}};
// ---------- Martin: Tím → 🛡️ Naša ochrana ----------
let L=null,LB=false,LAT=0;
async function loadL(f){if(LB||(!f&&L&&Date.now()-LAT<60e3))return;LB=true;try{const r=await sb.rpc("guard_list");L=r.error?{err:r.error.message}:r.data}catch(x){}LB=false;LAT=Date.now();paint()}
const KN={export:"⬇️ stiahol",copy:"📋 kopíroval",share:"📤 zdieľal",print:"🖨️ tlačil",bulk:"👀 hromadne"};
function card(){if(!L)return `<details class="card gdc" id="gdCard"><summary>🛡️ Naša ochrana – kto si sťahuje naše údaje</summary><p class="s">Načítavam…</p></details>`;
  if(L.err)return `<details class="card gdc" id="gdCard"><summary>🛡️ Naša ochrana</summary><p class="s">⚠️ ${E(L.err)}</p></details>`;
  const W=L.who||[],hot=W.filter(w=>+w.d1>=5).length;
  return `<details class="card gdc" id="gdCard"${hot?" open":""}><summary>🛡️ Naša ochrana – kto si sťahuje naše údaje${hot?` · ⚠️ ${hot}`:""}</summary>
   <p class="s">Zapisuje sa každé stiahnutie súboru, uloženie a zdieľanie PDF, tlač a kopírovanie dlhšieho textu (od 120 znakov). Pri ${E(L.lim)} a viac za hodinu ti príde upozornenie. Ty sa nezapisuješ. Snímky obrazovky webová aplikácia zablokovať nevie – na každej je ale vodoznak s menom a časom.</p>
   ${W.length?`<div class="gdw">${W.map(w=>`<div class="gdr${+w.d1>=5?" hot":""}"><div><b>${E(w.name||w.email)}</b><small>${E(w.email)}</small><small>7 dní: ⬇️ ${w.export} · 📋 ${w.copy} · 📤🖨️ ${w.share} · dnes ${w.d1}</small></div>
     <button type="button" class="${w.blocked?"lime":""}" data-gdb="${E(w.email)}" data-on="${w.blocked?0:1}">${w.blocked?"🔓 Povoliť":"⛔ Zablokovať"}</button></div>`).join("")}</div>`:`<p class="s">Za posledných 30 dní si nikto nič nestiahol ani nekopíroval. 👍</p>`}
   ${(L.last||[]).length?`<details class="gdl"><summary>Posledné záznamy (${L.last.length})</summary>${L.last.map(x=>`<div class="gdi"><small>${E(new Date(x.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}))}</small><b>${E(x.name||x.email)}</b><span>${E(KN[x.kind]||x.kind)} · ${E(x.what||"")}</span></div>`).join("")}</details>`:""}</details>`}
function paint(){if(!MAIN()||typeof TAB==="undefined"||TAB!=="team")return;const app=document.getElementById("app");if(!app)return;const old=document.getElementById("gdCard"),h=card();
  if(old){if(old.dataset.h!==String(h.length)){const op=old.open;const t=document.createElement("div");t.innerHTML=h;const n=t.firstElementChild;n.dataset.h=String(h.length);if(op)n.open=true;old.replaceWith(n)}return}
  const nav=app.querySelector("nav.tabs");const t=document.createElement("div");t.innerHTML=h;const n=t.firstElementChild;n.dataset.h=String(h.length);if(nav)nav.after(n);else app.prepend(n);loadL()}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-gdb]");if(!b||!MAIN())return;e.preventDefault();const on=b.dataset.on==="1";
  if(on&&!confirm(`Zablokovať sťahovanie, zdieľanie, tlač a kopírovanie pre ${b.dataset.gdb}?`))return;b.disabled=true;const r=await sb.rpc("guard_block",{p_email:b.dataset.gdb,p_on:on});b.disabled=false;
  if(r.error){say("Nepodarilo sa: "+r.error.message,6000);return}say(on?"⛔ Zablokované.":"🔓 Povolené.",3000);loadL(true)},true);
let q=0;new MutationObserver(()=>{if(q)return;q=1;(window.ernteSoon||requestAnimationFrame)(()=>{q=0;if(IN())status();paint()})}).observe(document.documentElement,{childList:true,subtree:true});
{const s=document.createElement("style");s.textContent=`.gdc summary{cursor:pointer;font-weight:800}.gdw{display:grid;gap:8px;margin-top:8px}
.gdr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
.gdr.hot{border-color:rgba(248,113,113,.7);background:rgba(248,113,113,.1)}.gdr b,.gdr small{display:block;overflow-wrap:anywhere}.gdr small{font-size:.75rem;opacity:.75}.gdr button{min-height:40px;white-space:nowrap}
.gdl{margin-top:10px}.gdl summary{font-size:.85rem;opacity:.85}.gdi{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;padding:5px 0;border-top:1px solid rgba(255,255,255,.08);font-size:.82rem}.gdi span{grid-column:2;opacity:.8;overflow-wrap:anywhere}`;document.head.appendChild(s)}
})();
