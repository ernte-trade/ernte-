// ===== 💡 NÁVRHY OD CLAUDE + 🤖 ČO CLAUDE SPRAVIL SÁM (iba majiteľ, Prehľad) – príkaz majiteľa 1. 11. 2026 =====
// Claude každú noc: noví farmári z východného Maďarska → Danube (hu_prospects), doplnené kontakty farmárov (farm_enrich_log),
// modernizácia časti majiteľa; zmeny pre tím a farmárov iba navrhne (claude_navrhy) – Martin ťukne Áno / Nie (claude_navrh_set).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&typeof MAIN_OK==="function"&&MAIN_OK()&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST&&typeof sb!=="undefined";
const N={d:null,at:0,busy:false,open:{}};
async function load(){if(N.busy||Date.now()-N.at<120e3)return;N.busy=true;N.at=Date.now();
  try{const since=new Date(Date.now()-7*864e5).toISOString();
    const [a,b,c]=await Promise.all([sb.from("claude_navrhy").select("*").in("status",["navrh","ano"]).order("id",{ascending:false}).limit(20),
      sb.from("hu_prospects").select("company,city,crops,created_at").gte("created_at",since).order("created_at",{ascending:false}).limit(50),
      sb.from("farm_enrich_log").select("field,at").gte("at",since).limit(500)]);
    N.d={nav:(a&&a.data)||[],hu:(b&&b.data)||[],enr:(c&&c.data)||[],err:a&&a.error&&a.error.message}}catch(x){N.d={nav:[],hu:[],enr:[]}}
  N.busy=false;paint()}
function card(){const d=N.d;if(!d||d.err)return "";const nav=d.nav.filter(x=>x.status==="navrh"),ok=d.nav.filter(x=>x.status==="ano");
  const ne=d.enr.length,nh=d.hu.length;if(!nav.length&&!ok.length&&!ne&&!nh)return "";
  return `<div class="card cnav"><div class="cnh"><b>🤖 Claude pracuje sám</b><small>posledných 7 dní</small></div>
   <div class="cns">${nh?`<span>🇭🇺 <b>${nh}</b> nových firiem z východného Maďarska v Danube</span>`:""}${ne?`<span>📇 <b>${ne}</b> doplnených kontaktov farmárov</span>`:""}${ok.length?`<span>⏳ <b>${ok.length}</b> schválených návrhov sa robí</span>`:""}</div>
   ${nh?`<details class="cnd"><summary>Noví farmári DANUBE</summary>${d.hu.slice(0,20).map(h=>`<div class="cnr"><b>${E(h.company)}</b><small>${E([h.city,h.crops].filter(Boolean).join(" · "))}</small></div>`).join("")}<div class="s">Sú v Danube Trade ako neaktívni – obchodník ich osloví, až keď rozhodneš.</div></details>`:""}
   ${nav.length?`<div class="cnt">💡 Návrhy – rozhodni</div>${nav.map(x=>`<div class="cnn"><b>${E(x.title)}</b>${x.area?`<small>${E(x.area)}</small>`:""}${x.body?`<p>${E(x.body).replace(/\n/g,"<br>")}</p>`:""}
     <div class="btns"><button type="button" class="lime" data-cnav="${x.id}" data-v="ano">✅ Áno, sprav to</button><button type="button" data-cnav="${x.id}" data-v="nie">✕ Nie</button></div></div>`).join("")}`:""}</div>`}
function paint(){const app=document.getElementById("app");if(!app||!OK()||typeof TAB==="undefined"||TAB!=="home")return;const old=app.querySelector(".card.cnav"),h=card();
  if(old){if(old.dataset.h===String(h.length)+h.slice(-40))return;if(h){old.outerHTML=h;const n=app.querySelector(".card.cnav");if(n)n.dataset.h=String(h.length)+h.slice(-40)}else old.remove();return}if(!h)return;const w=document.createElement("div");w.innerHTML=h;const el=w.firstElementChild;el.dataset.h=String(h.length)+h.slice(-40);
  const ref=app.querySelector(".hero")||app.querySelector("nav.tabs");if(ref&&ref.parentNode)ref.parentNode.insertBefore(el,ref.nextSibling);else app.prepend(el)}
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-cnav]");if(!t||!OK())return;e.preventDefault();
  let note=null;if(t.dataset.v==="nie"){note=prompt("Prečo nie? (nepovinné – Claude sa podľa toho zariadi)")||null}
  const r=await sb.rpc("claude_navrh_set",{p_id:+t.dataset.cnav,p_status:t.dataset.v,p_note:note});
  if(r.error){(window.toast||alert)(r.error.message);return}(window.toast||(()=>{}))(t.dataset.v==="ano"?"✅ Claude to spraví pri najbližšej práci":"Zamietnuté",3000);N.at=0;load()});
{const s=document.createElement("style");s.textContent=`.cnav .cnh{display:flex;justify-content:center;align-items:baseline;gap:10px;flex-wrap:wrap}.cnav .cnh small{opacity:.7}
.cnav .cns{display:grid;gap:4px;margin:8px 0;text-align:center;font-size:.9rem}.cnav .cnt{font-weight:700;margin:10px 0 4px}
.cnav .cnn{padding:10px;border-radius:14px;border:1px solid rgba(182,255,59,.35);background:rgba(182,255,59,.05);margin-top:8px;display:grid;gap:4px}.cnav .cnn small{opacity:.7}.cnav .cnn p{margin:2px 0;line-height:1.45;overflow-wrap:anywhere}
.cnav .btns{display:flex;flex-wrap:wrap;gap:6px}.cnav .btns button{flex:1 1 140px;min-height:40px;white-space:normal}
.cnav .cnd summary{cursor:pointer;font-weight:600;margin-top:6px}.cnav .cnr{display:grid;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.08)}.cnav .cnr small{opacity:.7}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{if(OK()&&typeof TAB!=="undefined"&&TAB==="home"){if(N.d)paint();load()}}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,600);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
