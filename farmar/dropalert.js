// ===== 📉 POKLES NAŠEJ NÁKUPNEJ CENY – karta pre obchodníkov (Galajda, Ceperko, Ličko) =====
// Databáza (cennik_drop_tick, cron cennik-pokles) pošle push pri každom znížení ceny; tu karta hore v aplikácii, kým nepotvrdia.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ST=()=>typeof ROLE!=="undefined"&&!!ROLE&&ROLE!=="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined";
const nm=c=>{try{const m=(typeof MK!=="undefined"?MK:[]).find(x=>x[0]===c);if(m)return m[1]}catch(x){}return c};
const f0=n=>n==null||!isFinite(n)?"–":(+n).toLocaleString("sk-SK",{maximumFractionDigits:2});
const tm=a=>{try{const d=new Date(a);return d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}catch(x){return ""}};
const D={L:[],at:0,busy:false};
async function load(){if(!ST()||D.busy)return;D.busy=true;try{const r=await sb.rpc("cennik_drops_my");D.L=r.error?[]:(r.data||[]);D.at=Date.now()}catch(x){}finally{D.busy=false}paint()}
function rows(){const G={};for(const x of D.L){const g=G[x.com]||(G[x.com]={com:x.com,old:x.old,nw:x.new,at:x.at,first:x.at});if(x.at<g.first){g.first=x.at;g.old=x.old}if(x.at>g.at){g.at=x.at;g.nw=x.new}}
  return Object.values(G).filter(g=>+g.nw<+g.old).sort((a,b)=>String(b.at).localeCompare(String(a.at)))}
function html(){const R=rows();if(!R.length)return "";
  return `<div class="card dropc" id="dropCard"><b class="dropt">📉 ${R.length===1?"Klesla naša nákupná cena":"Klesli naše nákupné ceny"}</b>
   ${R.map(g=>`<div class="dropr"><b>${E(nm(g.com))}</b><span>${f0(g.old)} → <b>${f0(g.nw)} €/t</b> <em>−${f0(+g.old-+g.nw)} €</em></span><small>${E(tm(g.at))}</small></div>`).join("")}
   <div class="s">Farmárom ponúkaj už novú cenu.</div><div class="btns"><button type="button" class="lime" data-dropack>✓ Beriem na vedomie</button></div></div>`}
function paint(){const app=document.getElementById("app");if(!app)return;const old=document.getElementById("dropCard"),h=ST()?html():"";
  if(!h){if(old)old.remove();return}const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;
  if(old){old.replaceWith(el);return}const a=app.querySelector("nav.tabs")||app.querySelector(".hero");if(a)a.after(el);else app.prepend(el)}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-dropack]");if(!b||!ST())return;e.preventDefault();b.disabled=true;
  const r=await sb.rpc("cennik_drops_ack",{p_ids:D.L.map(x=>x.id)});b.disabled=false;
  if(r.error){if(typeof toast==="function")toast("Nepodarilo sa: "+r.error.message,6000);return}D.L=[];paint();if(typeof toast==="function")toast("✓ Potvrdené",3000)},true);
{const s=document.createElement("style");s.textContent=`.dropc{border-color:rgba(248,113,113,.65)!important;box-shadow:0 0 0 1px rgba(248,113,113,.35),0 10px 30px -12px rgba(248,113,113,.55);text-align:center}
.dropc .dropt{display:block;color:#fca5a5;font-size:1.05rem;margin-bottom:6px}.dropr{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;align-items:baseline;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)}
.dropr em{font-style:normal;color:#fca5a5;font-weight:700}.dropr small{opacity:.65;flex-basis:100%}.dropc .btns{justify-content:center}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;if(!ST())return;if(!D.at||Date.now()-D.at>120e3)load();else if(D.L.length&&!document.getElementById("dropCard"))paint()})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  setInterval(()=>{if(!document.hidden&&ST())load()},120e3);document.addEventListener("visibilitychange",()=>{if(!document.hidden&&ST())load()})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
