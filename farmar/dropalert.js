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
// 1. 11. návrh č. 3 (schválil Martin): pri poklese ceny priamo v karte farmári s otvorenou ponukou tejto plodiny za 14 dní + 📞
const tel=p=>{let d=String(p||"").replace(/[^\d+]/g,"");if(!d)return "";if(d.startsWith("+"))return d.slice(1);if(d.startsWith("00"))return d.slice(2);if(d.startsWith("0"))return "421"+d.slice(1);return d};
function callList(com){try{const S=typeof STATE!=="undefined"?STATE:{},F=S.farmers||[],lim=Date.now()-14*864e5,M=new Map(),dd=a=>{try{return new Date(a).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})}catch(x){return ""}};
  const add=(fid,t,at,what)=>{if(!fid||M.has(fid))return;const f=F.find(x=>x.id===fid);if(!f)return;M.set(fid,{f,t,at,what})};
  (S.reqs||[]).filter(r=>r.kind==="sell"&&r.com===com&&!["vybavena","zamietnuta","zrusena"].includes(r.status)&&new Date(r.created_at).getTime()>lim).forEach(r=>add(r.farmer_id,r.tons,r.created_at,"ponúka"));
  (S.deals||[]).filter(d=>d.com===com&&d.status==="navrh"&&new Date(d.created_at).getTime()>lim).forEach(d=>add(d.farmer_id,d.tons,d.created_at,"návrh zmluvy"));
  const L=[...M.values()].slice(0,8);if(!L.length)return "";
  return `<div class="dropf"><small>📞 Komu zavolať – ${L.length===1?"otvorená ponuka":"otvorené ponuky"} za 14 dní</small>${L.map(x=>{const t=tel(x.f.phone);return `<div class="dropfr"><span><b>${E(x.f.name)}</b><small>${E(x.what)}${x.t?" "+f0(x.t)+" t":""} · ${E(dd(x.at))}</small></span>${t?`<a class="dropcall" href="tel:+${E(t)}" aria-label="Volať ${E(x.f.name)}">📞</a>`:""}</div>`}).join("")}</div>`}catch(x){return ""}}
function html(){const R=rows();if(!R.length)return "";
  return `<div class="card dropc" id="dropCard"><b class="dropt">📉 ${R.length===1?"Klesla naša nákupná cena":"Klesli naše nákupné ceny"}</b>
   ${R.map(g=>`<div class="dropr"><b>${E(nm(g.com))}</b><span>${f0(g.old)} → <b>${f0(g.nw)} €/t</b> <em>−${f0(+g.old-+g.nw)} €</em></span><small>${E(tm(g.at))}</small></div>${callList(g.com)}`).join("")}
   <div class="s">Farmárom ponúkaj už novú cenu.</div><div class="btns"><button type="button" class="lime" data-dropack>✓ Beriem na vedomie</button></div></div>`}
function paint(){const app=document.getElementById("app");if(!app)return;const old=document.getElementById("dropCard"),h=ST()?html():"";
  if(!h){if(old)old.remove();return}const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;
  if(old){old.replaceWith(el);return}const a=app.querySelector("nav.tabs")||app.querySelector(".hero");if(a)a.after(el);else app.prepend(el)}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-dropack]");if(!b||!ST())return;e.preventDefault();b.disabled=true;
  const r=await sb.rpc("cennik_drops_ack",{p_ids:D.L.map(x=>x.id)});b.disabled=false;
  if(r.error){if(typeof toast==="function")toast("Nepodarilo sa: "+r.error.message,6000);return}D.L=[];paint();if(typeof toast==="function")toast("✓ Potvrdené",3000)},true);
{const s=document.createElement("style");s.textContent=`.dropc{border-color:rgba(248,113,113,.65)!important;box-shadow:0 0 0 1px rgba(248,113,113,.35),0 10px 30px -12px rgba(248,113,113,.55);text-align:center}
.dropc .dropt{display:block;color:#fca5a5;font-size:1.05rem;margin-bottom:6px}.dropr{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;align-items:baseline;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)}
.dropr em{font-style:normal;color:#fca5a5;font-weight:700}.dropr small{opacity:.65;flex-basis:100%}.dropc .btns{justify-content:center}
.dropf{display:grid;gap:4px;margin:4px 0 8px;text-align:left}.dropf>small{text-align:center;opacity:.8;font-weight:600}.dropfr{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(248,113,113,.25)}
.dropfr>span{flex:1;min-width:0;display:grid}.dropfr>span b{overflow-wrap:anywhere}.dropfr>span small{opacity:.7}.dropcall{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;text-decoration:none;font-size:1.1rem;background:rgba(182,255,59,.16);border:1px solid rgba(182,255,59,.55)}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;if(!ST())return;if(!D.at||Date.now()-D.at>120e3)load();else if(D.L.length&&!document.getElementById("dropCard"))paint()})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  setInterval(()=>{if(!document.hidden&&ST())load()},120e3);document.addEventListener("visibilitychange",()=>{if(!document.hidden&&ST())load()})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
