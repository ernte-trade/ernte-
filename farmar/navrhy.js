// ===== 💡 NÁVRHY OD CLAUDE + 🤖 ČO CLAUDE SPRAVIL SÁM (iba majiteľ, Prehľad) – príkaz majiteľa 1. 11. 2026 =====
// Claude každú noc: noví farmári z východného Maďarska → Danube (hu_prospects), doplnené kontakty farmárov (farm_enrich_log),
// modernizácia časti majiteľa; zmeny pre tím a farmárov iba navrhne (claude_navrhy) – Martin ťukne Áno / Nie (claude_navrh_set).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&typeof MAIN_OK==="function"&&MAIN_OK()&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST&&typeof sb!=="undefined";
const N={d:null,at:0,busy:false,open:{}};
// 1. 11.: kedy návrh vznikol (dnes / včera / pred N dňami) – nech Martin vidí, čo je nové
const ago=t=>{if(!t)return "";const d=new Date(t);if(isNaN(d))return "";const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);const n=Math.round((a-b)/864e5);
  return n<=0?"dnes "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"}):n===1?"včera":"pred "+n+" dňami"};
async function load(){if(N.busy||Date.now()-N.at<120e3)return;N.busy=true;N.at=Date.now();
  try{const since=new Date(Date.now()-7*864e5).toISOString();
    const [a,b,c]=await Promise.all([sb.from("claude_navrhy").select("*").in("status",["navrh","ano","hotovo"]).order("id",{ascending:false}).limit(30),
      sb.from("hu_prospects").select("*").gte("created_at",since).order("created_at",{ascending:false}).limit(50),
      sb.from("farm_enrich_log").select("field,at").gte("at",since).limit(500)]);
    N.d={nav:(a&&a.data)||[],hu:(b&&b.data)||[],enr:(c&&c.data)||[],err:a&&a.error&&a.error.message}}catch(x){N.d={nav:[],hu:[],enr:[]}}
  N.busy=false;paint()}
function card(){const d=N.d;if(!d||d.err)return "";const nav=d.nav.filter(x=>x.status==="navrh"),ok=d.nav.filter(x=>x.status==="ano"),wk=Date.now()-7*864e5,done=d.nav.filter(x=>x.status==="hotovo"&&new Date(x.decided_at||x.at).getTime()>wk);
  const ne=d.enr.length,nh=d.hu.length;if(!nav.length&&!ok.length&&!done.length&&!ne&&!nh)return "";
  return `<div class="card cnav"><div class="cnh"><b>🤖 Claude pracuje sám</b>${nav.length?`<em class="cnb">💡 ${nav.length} na rozhodnutie</em>`:`<small>posledných 7 dní</small>`}</div>
   <div class="cns">${nh?(()=>{const h=d.hu.filter(x=>(x.country||"HU")==="HU").length,k=nh-h;return (h?`<span>🇭🇺 <b>${h}</b> nových firiem z Maďarska v Danube</span>`:"")+(k?`<span>🇸🇰 <b>${k}</b> nových firiem zo Slovenska v ERNTE</span>`:"")})():""}${ne?`<span>📇 <b>${ne}</b> doplnených kontaktov farmárov</span>`:""}${ok.length?`<span>⏳ <b>${ok.length}</b> schválených návrhov sa robí</span>`:""}${done.length?`<span>✔️ <b>${done.length}</b> návrhov hotových</span>`:""}</div>
   ${nav.length?`<div class="cnt">💡 Návrhy – rozhodni</div>${nav.map(x=>`<div class="cnn"><b>${E(x.title)}</b><small>${E([x.area,ago(x.at)].filter(Boolean).join(" · "))}</small>${x.body?`<p>${E(x.body).replace(/\n/g,"<br>")}</p>`:""}
     <div class="btns"><button type="button" class="lime" data-cnav="${x.id}" data-v="ano">✅ Áno, sprav to</button><button type="button" data-cnav="${x.id}" data-v="nie">✕ Nie</button></div></div>`).join("")}`:""}
   ${ok.length||done.length?`<details class="cnd"><summary>Schválené a hotové návrhy</summary>${ok.map(x=>`<div class="cnr"><b>⏳ ${E(x.title)}</b><small>${E(x.area||"")}</small></div>`).join("")}${done.map(x=>`<div class="cnr"><b>✔️ ${E(x.title)}</b><small>${E(x.area||"")}</small></div>`).join("")}<div class="s">Schválené Claude zrealizuje pri najbližšej nočnej práci.</div></details>`:""}
   ${nh?`<details class="cnd"><summary>Noví farmári (DANUBE / ERNTE)</summary>${d.hu.slice(0,30).map(h=>`<div class="cnr"><b>${(h.country||"HU")==="SK"?"🇸🇰":"🇭🇺"} ${E(h.company)}</b><small>${E([h.city,h.ico&&"IČO "+h.ico,h.dic&&"DIČ "+h.dic,h.phone,h.email,h.crops].filter(Boolean).join(" · "))}</small></div>`).join("")}<div class="s">Maďarské firmy sú v Danube Trade, slovenské vo Farmároch (ERNTE) – bez prístupu do aplikácie; obchodník ich osloví, až keď rozhodneš.</div></details>`:""}
</div>`}
function paint(){const app=document.getElementById("app");if(!app||!OK()||typeof TAB==="undefined"||TAB!=="home")return;const old=app.querySelector(".card.cnav"),h=card();
  if(old){if(old.dataset.h===String(h.length)+h.slice(-40))return;if(h){old.outerHTML=h;const n=app.querySelector(".card.cnav");if(n)n.dataset.h=String(h.length)+h.slice(-40)}else old.remove();return}if(!h)return;const w=document.createElement("div");w.innerHTML=h;const el=w.firstElementChild;el.dataset.h=String(h.length)+h.slice(-40);
  const ref=app.querySelector(".hero")||app.querySelector("nav.tabs");if(ref&&ref.parentNode)ref.parentNode.insertBefore(el,ref.nextSibling);else app.prepend(el)}
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-cnav]");if(!t||!OK())return;e.preventDefault();
  if(t.disabled)return;let note=null;if(t.dataset.v==="nie"){note=prompt("Prečo nie? (nepovinné – Claude sa podľa toho zariadi)");if(note===null)return;note=note.trim()||null}
  const bs=[...(t.closest(".cnn")||t.parentNode).querySelectorAll("[data-cnav]")];bs.forEach(b=>b.disabled=true);
  const r=await sb.rpc("claude_navrh_set",{p_id:+t.dataset.cnav,p_status:t.dataset.v,p_note:note});
  if(r.error){bs.forEach(b=>b.disabled=false);(window.toast||alert)(r.error.message);return}(window.toast||(()=>{}))(t.dataset.v==="ano"?"✅ Claude to spraví pri najbližšej práci":"Zamietnuté",3000);N.at=0;load()});
{const s=document.createElement("style");s.textContent=`.cnav .cnh{display:flex;justify-content:center;align-items:baseline;gap:10px;flex-wrap:wrap}.cnav .cnh small{opacity:.7}.cnav .cnb{font-style:normal;font-size:.82rem;font-weight:700;padding:3px 10px;border-radius:999px;background:rgba(182,255,59,.16);border:1px solid rgba(182,255,59,.45);color:#d9ff8a;white-space:nowrap}html[data-theme=light] .cnav .cnb{color:#3f6212;background:rgba(101,163,13,.12);border-color:rgba(101,163,13,.45)}
.cnav .cns{display:grid;gap:4px;margin:8px 0;text-align:center;font-size:.9rem}.cnav .cnt{font-weight:700;margin:10px 0 4px}
.cnav .cnn{padding:10px;border-radius:14px;border:1px solid rgba(182,255,59,.35);background:rgba(182,255,59,.05);margin-top:8px;display:grid;gap:4px}.cnav .cnn small{opacity:.7}.cnav .cnn p{margin:2px 0;line-height:1.45;overflow-wrap:anywhere}
.cnav .btns{display:flex;flex-wrap:wrap;gap:6px}.cnav .btns button{flex:1 1 140px;min-height:40px;white-space:normal}
.cnav .cnd summary{cursor:pointer;font-weight:600;margin-top:6px}.cnav .cnr{display:grid;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.08)}.cnav .cnr small{opacity:.7}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{if(OK()&&typeof TAB!=="undefined"&&TAB==="home"){if(N.d)paint();load()}}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,600);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
