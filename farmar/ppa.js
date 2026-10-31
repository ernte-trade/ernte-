// ===== 🌾 PÔDA Z PPA – kto koľko ha obrába (iba majiteľ) =====
// Zdroj: verejné údaje PPA – užívané plochy 2025 (LPIS, výmera podľa kultúr a lokalít) a zoznam prijímateľov dotácií FY2024/FY2025
// (sídlo, výška platieb). Tabuľka ppa_farms (RLS: iba majiteľ). Kontakty (telefón, e-mail) PPA ani register nezverejňujú.
// Záložka Farmári: naši farmári s ich výmerou + potenciálni farmári v okolí (filter km / ha / meno), IČO a sídlo z registra RPO,
// pridanie za farmára jedným ťuknutím.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined";
const OKV=()=>!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined"&&typeof ROLE!=="undefined"&&(ROLE==="owner"||(typeof can==="function"&&can("ppa")))&&!window.ERNTE_VIEWAS_FARMER;
const LG=new Set("spol s r o a sro as druzstvo pd pol v k ltd kft gmbh ing mgr bc mvdr ph d phd rndr judr shr zs zsr p st ml zh agro".split(" "));
const key=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(" ").filter(w=>w&&!LG.has(w)).sort().join("");
const n0=v=>v==null?"–":Math.round(+v).toLocaleString("sk-SK");
const eur=v=>v?Math.round(+v).toLocaleString("sk-SK")+" €":"–";
const P={open:false,mine:null,list:null,busy:false,km:60,ha:100,q:"",reg:{},err:null};
try{const s=JSON.parse(localStorage.getItem("ernte-ppa")||"{}");if(s.km)P.km=s.km;if(s.ha!=null)P.ha=s.ha}catch(x){}
const COLS="id,n,k,ha,orna,ttp,lok,nlok,sidlo,spsc,sokres,okres,kraj,km,e25,e24,mat,ico";
const farmers=()=>((typeof STATE!=="undefined"&&STATE.farmers)||[]).filter(f=>f&&f.id);
const icoN=v=>String(v||"").replace(/\D/g,"");
async function loadMine(){const F=farmers();const ks=[...new Set(F.map(f=>key(f.name)).filter(Boolean))],is=[...new Set(F.map(f=>icoN(f.ico)).filter(x=>x.length>=6))];if(!ks.length&&!is.length){P.mine=[];return}
  const out=[];for(let i=0;i<ks.length;i+=150){const r=await sb.from("ppa_farms").select(COLS).in("k",ks.slice(i,i+150));if(r.error)throw r.error;out.push(...(r.data||[]))}
  for(let i=0;i<is.length;i+=150){const r=await sb.from("ppa_farms").select(COLS).in("ico",is.slice(i,i+150));if(!r.error)out.push(...(r.data||[]))}
  const by={},bi={};out.forEach(x=>{(by[x.k]=by[x.k]||[]).push(x);if(x.ico)(bi[icoN(x.ico)]=bi[icoN(x.ico)]||[]).push(x)});
  const best=L=>(L||[]).sort((a,b)=>(+b.ha||0)-(+a.ha||0))[0]||null;
  P.mine=F.map(f=>({f,p:best(bi[icoN(f.ico)])||best(by[key(f.name)])}));P.at=Date.now()}
// ---- 🌾 ku každému farmárovi: výmera a dotácie z PPA (majiteľ + obchodníci ERNTE s prístupom „ppa“) ----
let fcBusy=false;
function fcHTML(x){if(!x)return `<div class="ppfc no">🌾 PPA: podľa mena / IČO sa nenašiel <small>(SHR alebo iné meno v PPA – skús v „🌾 Pôda z PPA“)</small></div>`;
  const tot=(+x.orna||0)+(+x.ttp||0);
  return `<div class="ppfc"><div class="ppfh">🌾 <b>PPA 2025</b>${x.n&&key(x.n)!==""?` <small>· ${E(x.n)}</small>`:""}</div>
   <div class="ppn"><span><b>${n0(x.orna)}</b> ha orná</span>${+x.ttp?`<span><b>${n0(x.ttp)}</b> ha TTP</span>`:""}<span>spolu <b>${n0(x.ha!=null?x.ha:tot)}</b> ha</span>${x.km!=null?`<span>📍 ${x.km} km od Zbudze</span>`:""}</div>
   <div class="ppn"><span>💶 dotácie 2025: <b>${eur(x.e25)}</b></span><span>2024: <b>${eur(x.e24)}</b></span>${x.mat?`<span>skupina: ${E(x.mat)}</span>`:""}</div>
   <div class="pps">🌾 ${E(x.lok||"–")}${x.nlok>4?` … (${x.nlok} lokalít)`:""}${x.okres?` · okres ${E(x.okres)}`:""}${x.kraj?` · ${E(x.kraj)}`:""}</div>
   ${x.sidlo?`<div class="pps">🏠 sídlo podľa PPA: ${E(x.sidlo)}${x.spsc?" "+E(String(x.spsc).slice(0,3)+" "+String(x.spsc).slice(3)):""}${x.sokres?", okres "+E(x.sokres):""}</div>`:""}
   <div class="pps">Zdroj: verejné údaje PPA (užívané plochy 2025, prijímatelia dotácií 2024/2025) · vidí iba majiteľ a obchodníci ERNTE</div></div>`}
function fcInject(){if(!OKV()||typeof TAB==="undefined"||TAB!=="farm")return;const app=document.getElementById("app");if(!app)return;
  const cards=app.querySelectorAll(".ds-fc");if(!cards.length)return;
  if(!P.mine||Date.now()-(P.at||0)>10*60e3||(P.mine.length!==farmers().length)){if(!fcBusy){fcBusy=true;loadMine().catch(()=>{P.mine=P.mine||[]}).finally(()=>{fcBusy=false;P.at=P.at||Date.now();fcInject()})}if(!P.mine)return}
  const M={};(P.mine||[]).forEach(m=>{M[m.f.id]=m.p});
  cards.forEach(c=>{if(c.querySelector(".ppfc"))return;const b=c.querySelector("[data-fedit]");if(!b)return;const id=b.dataset.fedit;if(!(id in M))return;
    const meta=c.querySelector(".ds-meta");const w=document.createElement("div");w.innerHTML=fcHTML(M[id]);const el=w.firstElementChild;
    if(meta&&meta.parentNode)meta.parentNode.insertBefore(el,meta.nextSibling);else c.appendChild(el)})}
async function loadList(){let q=sb.from("ppa_farms").select(COLS).gte("orna",+P.ha||0).order("orna",{ascending:false}).limit(60);
  if(P.km)q=q.lte("km",+P.km);if(P.q.trim())q=q.or(`n.ilike.%${P.q.trim().replace(/[%,()]/g," ")}%,lok.ilike.%${P.q.trim().replace(/[%,()]/g," ")}%`);
  const r=await q;if(r.error)throw r.error;const mine=new Set(farmers().map(f=>key(f.name)));P.list=(r.data||[]).map(x=>Object.assign(x,{our:mine.has(x.k)}))}
async function load(){if(P.busy)return;P.busy=true;P.err=null;paint();try{await loadMine();await loadList()}catch(x){P.err=x.message||String(x)}P.busy=false;paint()}
function sum(){const m=(P.mine||[]).filter(x=>x.p);return {n:m.length,orna:m.reduce((s,x)=>s+(+x.p.orna||0),0),ttp:m.reduce((s,x)=>s+(+x.p.ttp||0),0)}}
function regHTML(x){const r=P.reg[x.id];if(!r)return "";if(r==="…")return `<div class="ppreg">🔎 Hľadám v registri…</div>`;
  if(r.err)return `<div class="ppreg w">Register teraz neodpovedá. <a href="${orsr(x.n)}" target="_blank" rel="noopener">ORSR ↗</a></div>`;
  if(!r.length)return `<div class="ppreg w">V registri sa nenašlo (môže ísť o SHR / fyzickú osobu). <a href="${orsr(x.n)}" target="_blank" rel="noopener">ORSR ↗</a></div>`;
  return r.map(y=>`<div class="ppreg ok">✓ <b>${E(y.name)}</b> · IČO <b>${E(y.ico)}</b>${y.addr?" · "+E(y.addr):""}${y.ended?" · ⚠️ ukončená":""} <a href="${finstatUrl(y.ico)}" target="_blank" rel="noopener">FinStat ↗</a>${x.our?"":` <button type="button" class="ppadd" data-ppadd="${x.id}" data-ico="${E(y.ico)}">➕ Pridať ako farmára</button>`}</div>`).join("")}
const orsr=n=>"https://www.orsr.sk/hladaj_subjekt.asp?OBMENO="+encodeURIComponent(String(n).replace(/,.*$/,"").slice(0,40))+"&PF=0&SID=0&R=on";
function rowHTML(x){return `<div class="pprow${x.our?" our":""}"><div class="pph"><b>${E(x.n)}</b>${x.our?' <span class="ppt">náš farmár</span>':""}</div>
  <div class="ppn"><span><b>${n0(x.orna)}</b> ha orná</span>${+x.ttp?`<span>${n0(x.ttp)} ha TTP</span>`:""}${x.km!=null?`<span>📍 ${x.km} km</span>`:""}${x.e25||x.e24?`<span>💶 ${eur(x.e25||x.e24)}</span>`:""}</div>
  <div class="pps">🌾 ${E(x.lok)}${x.nlok>4?` … (${x.nlok} lokalít)`:""}${x.okres?` · okres ${E(x.okres)}`:""}</div>
  ${x.sidlo?`<div class="pps">🏠 Sídlo (PPA): ${E(x.sidlo)}${x.spsc?" "+E(x.spsc.slice(0,3)+" "+x.spsc.slice(3)):""}${x.sokres&&x.sokres!==x.okres?", okres "+E(x.sokres):""}${x.mat?` · skupina: ${E(x.mat)}`:""}</div>`:""}
  ${x.our?"":`<div class="btns"><button type="button" data-ppreg="${x.id}">🔎 IČO a sídlo z registra</button>${Array.isArray(P.reg[x.id])&&P.reg[x.id].length?"":`<button type="button" class="ppadd" data-ppadd="${x.id}">➕ Pridať ako farmára</button>`}</div>`}
  ${regHTML(x)}</div>`}
function html(){const s=sum();
  if(!P.open)return `<div class="card ppa"><button type="button" class="pptg" data-pptg="1"><b>🌾 Pôda z PPA</b><span>kto koľko ha obrába · potenciálni farmári v okolí ›</span></button></div>`;
  const mine=(P.mine||[]).filter(x=>x.p).sort((a,b)=>b.p.orna-a.p.orna),miss=(P.mine||[]).filter(x=>!x.p);
  return `<div class="card ppa open"><button type="button" class="pptg" data-pptg="1"><b>🌾 Pôda z PPA</b><span>zbaliť ‹</span></button>
  <div class="s">Verejné údaje PPA: užívané plochy 2025 a prijímatelia dotácií 2024/2025. Vzdialenosť = vzdušne od Zbudze (cestou ≈ ×1,3). Telefón a e-mail PPA nezverejňuje.</div>
  ${P.err?`<div class="ppreg w">Chyba: ${E(P.err)}</div>`:""}${P.busy?`<div class="s">Načítavam…</div>`:""}
  ${P.mine?`<h3>Naši farmári · ${s.n} z ${(P.mine||[]).length} nájdených v PPA</h3><div class="ppkpi"><span><b>${n0(s.orna)}</b> ha ornej pôdy</span><span><b>${n0(s.ttp)}</b> ha TTP</span></div>
   <div class="ppmine">${mine.map(x=>`<div class="ppm"><b>${E(x.f.name)}</b><span>${n0(x.p.orna)} ha orná${+x.p.ttp?` · ${n0(x.p.ttp)} TTP`:""}${x.p.km!=null?` · ${x.p.km} km`:""}</span><small>🌾 ${E(x.p.lok)}</small></div>`).join("")||'<div class="s">Žiadna zhoda podľa mena.</div>'}</div>
   ${miss.length?`<details class="ppmiss"><summary>Nenájdení v PPA podľa mena (${miss.length})</summary><div class="s">${miss.map(x=>E(x.f.name)).join(" · ")}</div></details>`:""}`:""}
  <h3>Potenciálni farmári</h3>
  <form class="ppf" data-ppf="1"><label>Do km<input name="km" type="number" inputmode="numeric" min="0" step="10" value="${E(P.km)}"></label><label>Orná od ha<input name="ha" type="number" inputmode="numeric" min="0" step="10" value="${E(P.ha)}"></label><label class="w">Meno alebo obec<input name="q" value="${E(P.q)}" placeholder="napr. Trebišov, družstvo…"></label><button>Hľadať</button></form>
  ${P.list?`<div class="s">${P.list.length>=60?"Prvých 60":P.list.length} podľa ornej pôdy · ${P.list.filter(x=>!x.our).length} ešte nie sú naši farmári</div><div class="pplist">${P.list.map(rowHTML).join("")}</div>`:""}</div>`}
function paint(){const c=document.querySelector(".card.ppa");if(c)c.outerHTML=html()}
function inject(){if(!OK()||typeof TAB==="undefined"||TAB!=="farm")return;const app=document.getElementById("app");if(!app||app.querySelector(".card.ppa"))return;
  const d=document.createElement("div");d.innerHTML=html();const el=d.firstElementChild,ref=app.querySelector(".fsall")||(app.querySelector("nav.tabs")||{}).nextElementSibling;
  if(ref&&ref.parentNode)ref.parentNode.insertBefore(el,ref.nextSibling);else app.appendChild(el)}
async function regFind(id){const x=(P.list||[]).find(y=>y.id==id);if(!x)return;P.reg[id]="…";paint();
  try{const nm=String(x.n).replace(/["„“]/g,"").slice(0,80);const r=await fetch("https://api.statistics.sk/rpo/v1/search?fullName="+encodeURIComponent(nm)+"&onlyActive=true",{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error(r.status);const j=await r.json();const cur=a=>(a||[]).find(z=>!z.validTo)||(a||[])[0]||null;
    P.reg[id]=(j.results||[]).slice(0,3).map(R=>{const id0=cur(R.identifiers),nm0=cur(R.fullNames),ad=cur(R.addresses);
      const town=ad&&ad.municipality&&ad.municipality.value||"",no=ad?[ad.regNumber&&+ad.regNumber>0?ad.regNumber:"",ad.buildingNumber||""].filter(Boolean).join("/"):"",pc=ad&&(ad.postalCodes||[])[0]||"";
      return {ico:id0?id0.value:"",name:nm0?nm0.value:"",addr:ad?[((ad.street||town)+(no?" "+no:"")),[pc,town].filter(Boolean).join(" ")].filter(Boolean).join(", "):"",ended:!!(R.termination||R.terminationDate)}}).filter(y=>y.ico)}
  catch(e){P.reg[id]={err:1}}paint()}
async function add(id,ico){const x=(P.list||[]).find(y=>y.id==id);if(!x)return;const r0=Array.isArray(P.reg[id])?P.reg[id].find(y=>y.ico===ico):null;
  if(!confirm(`Pridať „${x.n}“ medzi farmárov?`))return;
  const row={name:(r0&&r0.name)||x.n,ico:ico||null,addr:(r0&&r0.addr)||(x.sidlo?[x.spsc?x.spsc.slice(0,3)+" "+x.spsc.slice(3):"",x.sidlo].filter(Boolean).join(" "):null),
    note:`PPA 2025: ${n0(x.orna)} ha orná${+x.ttp?`, ${n0(x.ttp)} ha TTP`:""}; lokality: ${x.lok}${x.km!=null?`; ${x.km} km od Zbudze`:""}`,active:true};
  const r=await sb.from("farmers").insert(row);if(r.error){toast("Chyba: "+r.error.message,6000);return}
  if(ico)sb.from("ppa_farms").update({ico}).eq("id",x.id).then(()=>{});
  x.our=true;toast("✓ Farmár pridaný – údaje z registra sa doplnia podľa IČO.");if(typeof loadStaff==="function"){await loadStaff();P.mine=null;loadMine().then(paint).catch(()=>{});if(typeof renderStaff==="function")renderStaff()}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-pptg],[data-ppreg],[data-ppadd]");if(!t||!OK())return;e.preventDefault();
  if(t.dataset.pptg){P.open=!P.open;paint();if(P.open&&!P.list)load();return}
  if(t.dataset.ppreg){regFind(t.dataset.ppreg);return}
  if(t.dataset.ppadd)add(t.dataset.ppadd,t.dataset.ico||"")});
document.addEventListener("submit",e=>{const f=e.target;if(!f.dataset||!f.dataset.ppf)return;e.preventDefault();e.stopPropagation();const fd=new FormData(f);
  P.km=+fd.get("km")||0;P.ha=+fd.get("ha")||0;P.q=String(fd.get("q")||"");try{localStorage.setItem("ernte-ppa",JSON.stringify({km:P.km,ha:P.ha}))}catch(x){}
  P.list=null;P.busy=false;loadList().then(paint).catch(x=>{P.err=x.message;paint()});paint()},true);
{const s=document.createElement("style");s.textContent=`.ppa .pptg{all:unset;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;justify-content:center;text-align:center;width:100%;cursor:pointer}
.ppa .pptg span{font-size:.84rem;opacity:.75}.ppa h3{margin:12px 0 6px;font-size:1rem}
.ppkpi,.ppn{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:.88rem}.ppkpi{margin-bottom:6px}
.ppmine{display:grid;gap:6px}.ppm{padding:8px 10px;border-radius:12px;background:rgba(182,255,59,.08);border:1px solid rgba(182,255,59,.25);min-width:0}
.ppm b{display:block;overflow-wrap:anywhere}.ppm span{font-size:.86rem}.ppm small{display:block;opacity:.75;font-size:.78rem;overflow-wrap:anywhere}
.ppf{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:6px 0}.ppf label{flex:1 1 90px;min-width:0}.ppf label.w{flex:2 1 180px}.ppf input{width:100%;box-sizing:border-box}.ppf button{flex:1 1 100%}
.pplist{display:grid;gap:8px;margin-top:6px}.pprow{padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);min-width:0}
.pprow.our{border-color:rgba(182,255,59,.4)}.pph b{overflow-wrap:anywhere}.ppt{font-size:.72rem;padding:1px 7px;border-radius:9px;background:rgba(182,255,59,.2);white-space:nowrap}
.pps{font-size:.8rem;opacity:.8;margin-top:3px;overflow-wrap:anywhere}.pprow .btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.pprow .btns button{flex:1 1 140px;min-width:0;white-space:normal}
.ppreg{margin-top:6px;padding:7px 9px;border-radius:10px;font-size:.82rem;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3);overflow-wrap:anywhere}
.ppreg.ok{background:rgba(182,255,59,.08);border-color:rgba(182,255,59,.35)}.ppreg.w{background:rgba(250,204,21,.1);border-color:rgba(250,204,21,.4)}.ppreg .ppadd{display:block;margin-top:6px;width:100%}
.ppmiss summary{cursor:pointer;font-size:.85rem;margin-top:6px}
.ppfc{margin:8px 0 2px;padding:9px 11px;border-radius:14px;background:rgba(182,255,59,.07);border:1px solid rgba(182,255,59,.28);min-width:0;display:grid;gap:3px;text-align:left}
.ppfc.no{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.1);font-size:.8rem;opacity:.8}.ppfc.no small{opacity:.8}
.ppfh{font-size:.88rem;overflow-wrap:anywhere}.ppfh small{opacity:.7}.ppfc .ppn{font-size:.85rem}
@media(min-width:800px){.ppmine{grid-template-columns:1fr 1fr}}`;document.head.appendChild(s)}
let q2=0;const sch=()=>{if(q2)return;q2=(window.ernteSoon||requestAnimationFrame)(()=>{q2=0;try{inject()}catch(x){}try{fcInject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.ppaKey=key;
})();
