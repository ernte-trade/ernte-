// ===== 🔗 MOŽNÉ DUPLICITY FARMÁROV (iba majiteľ, záložka Farmári) =====
// Skupiny podľa rovnakého mena firmy (bez s.r.o., PD, Agro…), e-mailu alebo telefónu. Zlúčenie: farmer_merge(ponechať, zlúčiť) –
// obchody, zmluvy, lístky, podmienky sa presunú, prázdne údaje sa doplnia, záloha v farmers_merged.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined"&&!window.ERNTE_VIEWAS;
const D={open:false,busy:false,skip:{}};
try{D.skip=JSON.parse(localStorage.getItem("ernte-fdup-skip")||"{}")}catch(x){}
const key=n=>typeof window.ppaKey==="function"?window.ppaKey(n):String(n||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const ph=p=>String(p||"").replace(/\D/g,"").slice(-9);
function groups(){const F=((typeof STATE!=="undefined"&&STATE.farmers)||[]).filter(f=>f&&f.id),G=[],seen=new Set();
  const add=(by,lbl,map)=>Object.entries(map).forEach(([k,L])=>{if(L.length<2)return;const id=by+":"+L.map(f=>f.id).sort().join(",");if(seen.has(id)||D.skip[id])return;seen.add(id);G.push({by,lbl,k,id,L})});
  const bn={},be={},bp={};F.forEach(f=>{const k=key(f.name);if(k)(bn[k]=bn[k]||[]).push(f);const e=String(f.email||"").trim().toLowerCase();if(e)(be[e]=be[e]||[]).push(f);const p=ph(f.phone);if(p.length===9)(bp[p]=bp[p]||[]).push(f)});
  add("name","rovnaké meno firmy",bn);add("email","rovnaký e-mail",be);add("phone","rovnaký telefón – môžu to byť rôzne firmy jedného majiteľa",bp);return G}
const nd=f=>((typeof STATE!=="undefined"&&STATE.deals)||[]).filter(d=>d.farmer_id===f.id).length;
function card(){const G=groups();
  if(!G.length)return "";
  if(!D.open)return `<div class="card fdup"><button type="button" class="fdtg" data-fdtg="1"><b>🔗 Možné duplicity (${G.length})</b><span>rovnaké meno, e-mail alebo telefón · zlúčiť do jedného ›</span></button></div>`;
  return `<div class="card fdup open"><button type="button" class="fdtg" data-fdtg="1"><b>🔗 Možné duplicity (${G.length})</b><span>zbaliť ‹</span></button>
   <div class="s">Vyber záznam, ktorý ostane (●). Ostatné sa doň zlúčia – obchody, zmluvy, lístky, podmienky a prihlásenie sa presunú, prázdny e-mail / telefón / adresa sa doplní. Záloha ostáva v databáze.</div>
   ${G.map((g,gi)=>{const best=[...g.L].sort((a,b)=>nd(b)-nd(a)||(!!b.login-!!a.login)||(!!b.email-!!a.email))[0];
     return `<div class="fdg${g.by==="phone"?" ph":""}" data-fdg="${gi}"><div class="fdgh">${g.by==="name"?"🏷️":g.by==="email"?"✉️":"📞"} ${E(g.lbl)}</div>
     ${g.L.map(f=>`<label class="fdr"><input type="radio" name="fdk${gi}" value="${E(f.id)}"${f===best?" checked":""}><span><b>${E(f.name)}</b><small>${E([f.email,f.phone,String(f.addr||"").split(",")[0],f.ico&&"IČO "+f.ico].filter(Boolean).join(" · ")||"bez kontaktu")} · 🤝 ${nd(f)}${f.login?" · 🔐 prihlásenie":""}${f.active?" · aktívny":""}</small></span></label>`).join("")}
     <div class="btns"><button type="button" class="pri" data-fdm="${gi}">🔗 Zlúčiť do vybraného</button><button type="button" data-fdx="${gi}">Nie sú duplicity</button></div></div>`}).join("")}</div>`}
let G0=[];function paint(){const c=document.querySelector(".card.fdup");const h=card();if(c){if(h)c.outerHTML=h;else c.remove()}else inject()}
function inject(){if(!OK()||typeof TAB==="undefined"||TAB!=="farm")return;const app=document.getElementById("app");if(!app||app.querySelector(".card.fdup"))return;
  const h=card();if(!h)return;const w=document.createElement("div");w.innerHTML=h;const el=w.firstElementChild;
  const ref=app.querySelector(".card.ppa")||app.querySelector(".ds-search")&&app.querySelector(".ds-search").closest(".card");
  if(ref&&ref.parentNode)ref.parentNode.insertBefore(el,ref.nextSibling);else app.appendChild(el)}
async function merge(gi){const g=groups()[gi];if(!g||D.busy)return;const box=document.querySelector(`[data-fdg="${gi}"]`);const keep=box&&box.querySelector("input:checked");if(!keep)return;
  const K=g.L.find(f=>f.id===keep.value),O=g.L.filter(f=>f.id!==keep.value);
  if(!confirm(`Zlúčiť do „${K.name}“:\n${O.map(f=>"• "+f.name).join("\n")}\n\nObchody, zmluvy a lístky sa presunú. Pokračovať?`))return;
  D.busy=true;let err=null;for(const f of O){const r=await sb.rpc("farmer_merge",{p_keep:K.id,p_drop:f.id,p_force:false});if(r.error){err=r.error.message;break}}
  D.busy=false;if(err){toast("Chyba: "+(/could not find|schema cache/i.test(err)?"zlúčenie sa zapína po aktualizácii databázy – o pár minút":err),6000);return}
  toast("✓ Zlúčené do „"+K.name+"“",4000);if(typeof loadStaff==="function")await loadStaff();if(typeof renderStaff==="function")renderStaff()}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-fdtg],[data-fdm],[data-fdx]");if(!t||!OK())return;e.preventDefault();
  if(t.dataset.fdtg){D.open=!D.open;paint();return}
  if(t.dataset.fdm!==undefined){merge(+t.dataset.fdm);return}
  if(t.dataset.fdx!==undefined){const g=groups()[+t.dataset.fdx];if(g){D.skip[g.id]=1;try{localStorage.setItem("ernte-fdup-skip",JSON.stringify(D.skip))}catch(x){}}paint()}});
{const s=document.createElement("style");s.textContent=`.fdup .fdtg{all:unset;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;justify-content:center;text-align:center;width:100%;cursor:pointer}.fdup .fdtg span{font-size:.84rem;opacity:.75}
.fdg{margin-top:10px;padding:10px;border-radius:14px;border:1px solid rgba(182,255,59,.3);background:rgba(182,255,59,.05);display:grid;gap:6px;min-width:0}.fdg.ph{border-color:rgba(250,204,21,.35);background:rgba(250,204,21,.05)}
.fdgh{font-size:.84rem;opacity:.85}.fdr{display:grid!important;grid-template-columns:auto 1fr;gap:10px;align-items:start;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.04);cursor:pointer;text-align:left;min-width:0}
.fdr input{width:20px;height:20px;margin-top:2px}.fdr b{overflow-wrap:anywhere}.fdr small{display:block;opacity:.75;font-size:.76rem;overflow-wrap:anywhere}.fdg .btns{display:flex;flex-wrap:wrap;gap:6px}.fdg .btns button{flex:1 1 150px;min-width:0;white-space:normal}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
