// ===== 🔎 FIRMA Z REGISTRA PODĽA MENA (Obchody → Nový obchod, Farmári → Pridať / upraviť farmára) =====
// Napíš názov (napr. „MK Agro“) → zobrazia sa firmy z registra RPO (api.statistics.sk, verejné, CORS povolený).
// Ťuknutím: v karte farmára sa doplní názov, IČO a adresa; v Novom obchode sa vyberie existujúci farmár s tým IČO, inak sa vytvorí nový.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cur=a=>(a||[]).find(z=>!z.validTo)||(a||[])[0]||null;
const fmtA=a=>{if(!a)return "";const town=(a.municipality&&a.municipality.value)||"",no=[a.regNumber&&+a.regNumber>0?a.regNumber:"",a.buildingNumber||""].filter(Boolean).join("/"),pc=String((a.postalCodes||[])[0]||"").replace(/^(\d{3})(\d{2})$/,"$1 $2");return [(a.street||town)+(no?" "+no:""),[pc,town].filter(Boolean).join(" ")].filter(Boolean).join(", ")};
const nz=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const icoN=s=>String(s||"").replace(/\D/g,"");
const C={};let T=0,LQ="",L=[];
async function find(q){q=String(q||"").trim();if(q.length<3)return [];if(C[q])return C[q];
  try{const r=await fetch("https://api.statistics.sk/rpo/v1/search?fullName="+encodeURIComponent(q.slice(0,80))+"&onlyActive=true",{headers:{Accept:"application/json"}});
    const j=r.ok?await r.json():{results:[]};const seen=new Set();
    C[q]=(j.results||[]).map(R=>{const i=cur(R.identifiers),n=cur(R.fullNames);return {ico:i?i.value:"",name:n?n.value:"",addr:fmtA(cur(R.addresses))}}).filter(x=>x.ico&&!seen.has(x.ico)&&seen.add(x.ico)).slice(0,5)}
  catch(x){C[q]=[]}return C[q]}
function box(kind,html){const id=kind==="deal"?"rgnDeal":"rgnFarm";let b=document.getElementById(id);
  const anchor=kind==="deal"?document.getElementById("dfl"):(document.querySelector('#fFarm input[name="name"]')||{}).closest?.("label");
  if(!anchor)return;if(!b){b=document.createElement("div");b.id=id;b.className="rgn";anchor.insertAdjacentElement("afterend",b)}b.innerHTML=html}
function list(kind,q,R,busy){if(busy)return `<div class="s">🔎 Hľadám „${E(q)}“ v registri firiem…</div>`;if(!R.length)return q.length>=3?`<div class="s">V registri firiem sa „${E(q)}“ nenašlo – skús iný tvar názvu alebo zadaj IČO v karte farmára.</div>`:"";
  return `<div class="rgnh">🔎 V registri firiem – ťukni a údaje sa doplnia:</div>${R.map((x,i)=>`<button type="button" data-rgn="${kind}:${i}"><b>${E(x.name)}</b><small>IČO ${E(x.ico)}${x.addr?" · "+E(x.addr):""}</small></button>`).join("")}`}
function go(kind,q){clearTimeout(T);q=String(q||"").trim();if(q.length<3){box(kind,"");return}
  if(kind==="deal"){const ex=((typeof STATE!=="undefined"&&STATE.farmers)||[]).find(f=>nz(f.name)===nz(q));if(ex){box(kind,"");return}}
  T=setTimeout(async()=>{box(kind,list(kind,q,[],true));const R=await find(q);LQ=q;L=R;box(kind,list(kind,q,R,false))},700)}
document.addEventListener("input",e=>{const t=e.target;if(!t)return;
  if(t.id==="dfq")go("deal",t.value);
  else if(t.name==="name"&&t.form&&t.form.id==="fFarm")go("farm",t.value)},true);
// ťuknutie nesmie zobrať fokus z políčka (inak sa zoznam pod ním posunie a ťuk minie tlačidlo)
document.addEventListener("mousedown",e=>{if(e.target.closest&&e.target.closest("[data-rgn],[data-qdreg],[data-dfp],[data-rgnsave]"))e.preventDefault()},true);
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-rgn]");if(!b)return;e.preventDefault();e.stopPropagation();
  const [kind,i]=b.dataset.rgn.split(":"),x=L[+i];if(!x)return;
  if(kind==="farm"){const f=document.getElementById("fFarm");if(!f)return;const s=(n,v,force)=>{const el=f.elements[n];if(el&&v&&(force||!String(el.value).trim()))el.value=v};
    s("name",x.name,true);s("ico",x.ico,true);s("addr",x.addr,!String(f.elements.addr&&f.elements.addr.value||"").trim());box("farm","");
    if(typeof toast==="function")toast("✓ Doplnené z registra: "+x.name+" · IČO "+x.ico+". Skontroluj a ulož.",5000);
    try{const ic=f.elements.ico;if(ic){ic.dispatchEvent(new Event("input",{bubbles:true}));ic.dispatchEvent(new Event("change",{bubbles:true}))}}catch(z){}return}
  // Nový obchod: existujúci farmár s rovnakým IČO, inak nový
  const F=(typeof STATE!=="undefined"&&STATE.farmers)||[];let f=F.find(y=>icoN(y.ico)&&icoN(y.ico)===icoN(x.ico))||F.find(y=>nz(y.name)===nz(x.name));
  if(!f){b.disabled=true;const r=await sb.from("farmers").insert({name:x.name,ico:x.ico,addr:x.addr||null,active:true}).select();b.disabled=false;
    if(r.error){(window.toast||alert)("Farmára sa nepodarilo pridať: "+r.error.message,6000);return}f=Array.isArray(r.data)?r.data[0]:r.data;
    if(!f&&typeof loadStaff==="function"){await loadStaff();f=(STATE.farmers||[]).find(y=>icoN(y.ico)===icoN(x.ico))}
    if(!f){(window.toast||alert)("Farmár pridaný – vyber ho zo zoznamu.",5000);return}if(!(STATE.farmers||[]).some(y=>y.id===f.id))STATE.farmers=(STATE.farmers||[]).concat([f]);
    if(typeof toast==="function")toast("✓ Nový farmár z registra: "+x.name+" (IČO "+x.ico+")",5000)}
  const fm=document.getElementById("fDeal"),q=document.getElementById("dfq");if(fm&&fm.elements.farmer)fm.elements.farmer.value=f.id;if(q)q.value=String(f.name).trim();
  const dl=document.getElementById("dfl");if(dl)dl.innerHTML=`<div class="s">✓ Vybraný: <b>${E(String(f.name).trim())}</b></div>`;box("deal","");check(f.id)},true);

// ===== KONTROLA ÚDAJOV ZÁKAZNÍKA (príkaz majiteľa 30. 10.) =====
// Po výbere farmára v Novom obchode: chýbajúce IČO / sídlo sa doplnia z registra (podľa IČO, inak podľa názvu) a hneď uložia k zákazníkovi.
// Čo ostane prázdne, ukáže bublinu – obchodník to dopíše a ťukne Uložiť → zapíše sa k zákazníkovi.
const NEED=[["ico","IČO","napr. 47615885"],["addr","Sídlo / adresa","ulica, PSČ obec"],["dic","DIČ","10 číslic"],["icdph","IČ DPH","SK… (ak je platiteľ)"],["phone","Telefón","+421…"],["email","E-mail","kvôli zmluve e-mailom"]];
const REQ=new Set(["ico","addr"]);
const nameKey=s=>nz(s).replace(/\b(s r o|sro|a s|as|spol|pd|shr|druzstvo|v o s|k s)\b/g," ").replace(/\s+/g," ").trim();
async function save(f,row){const r=await sb.from("farmers").update(row).eq("id",f.id);if(r.error)throw new Error(r.error.message);Object.assign(f,row);return true}
async function check(fid){const F=(typeof STATE!=="undefined"&&STATE.farmers)||[],f=F.find(y=>y.id===fid);const old=document.getElementById("rgnNeed");if(old)old.remove();if(!f)return;
  const got=[];
  try{
    if(!icoN(f.ico)){const R=await find(String(f.name||"").trim());const k=nameKey(f.name);const m=R.filter(x=>nameKey(x.name)===k);const x=m.length===1?m[0]:null;
      if(x){const row={ico:x.ico};if(!String(f.addr||"").trim()&&x.addr)row.addr=x.addr;await save(f,row);got.push("IČO"+(row.addr?", sídlo":""))}}
    if(icoN(f.ico)&&!String(f.addr||"").trim()&&window.firmyLookup){const d=await firmyLookup(f.ico);if(d&&!d.none&&d.addr){await save(f,{addr:d.addr});got.push("sídlo")}}
  }catch(x){}
  if(got.length&&typeof toast==="function")toast("✓ Doplnené z registra a uložené k zákazníkovi "+String(f.name).trim()+": "+got.join(", "),6000);
  const miss=NEED.filter(([k])=>!String(f[k]||"").trim());if(!miss.length)return;
  const fm=document.getElementById("fDeal");const anchor=document.getElementById("dfl");if(!fm||!anchor||(fm.elements.farmer&&fm.elements.farmer.value!==fid))return;
  const hard=miss.filter(([k])=>REQ.has(k));
  const d=document.createElement("div");d.id="rgnNeed";d.className="rgnneed"+(hard.length?" hard":"");d.dataset.fid=fid;
  d.innerHTML=`<b>${hard.length?"⚠️":"ℹ️"} Pri zákazníkovi <u>${E(String(f.name).trim())}</u> nemáme: ${miss.map(m=>m[1]).join(", ")}</b>
   <div class="s">${hard.length?"IČO a sídlo musia byť v zmluve – dopíš ich, prosím. ":""}Vypíš, čo vieš, a ťukni Uložiť – údaje sa hneď uložia k zákazníkovi${miss.some(m=>m[0]==="ico")?" (alebo napíš IČO a sídlo sa doplní z registra)":""}.</div>
   <div class="rgnf">${miss.map(([k,l,ph])=>`<label>${l}${REQ.has(k)?" *":""}<input data-rgnk="${k}" placeholder="${E(ph)}"${k==="email"?' type="email"':k==="phone"?' type="tel"':k==="ico"?' inputmode="numeric"':""} autocomplete="off"></label>`).join("")}</div>
   <div class="btns"><button type="button" class="pri" data-rgnsave="1">💾 Uložiť k zákazníkovi</button><a class="rgnfs" href="https://finstat.sk/databaza-firiem-organizacii?query=${encodeURIComponent(String(f.name).trim())}" target="_blank" rel="noopener">FinStat ↗</a></div>`;
  anchor.insertAdjacentElement("afterend",d)}
window.rgnCheckFarmer=check;
// výber existujúceho farmára v Novom obchode
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-dfp]");if(!b)return;const id=b.dataset.dfp;setTimeout(()=>check(id),0)});
// IČO v bubline → sídlo z registra
document.addEventListener("change",async e=>{const t=e.target;if(!t||t.dataset.rgnk!=="ico"||!window.firmyLookup)return;const w=document.getElementById("rgnNeed");if(!w)return;
  try{const d=await firmyLookup(t.value);const a=w.querySelector('[data-rgnk="addr"]');if(d&&!d.none&&d.addr&&a&&!a.value.trim()){a.value=d.addr;if(typeof toast==="function")toast("✓ Sídlo z registra: "+d.addr,4000)}}catch(x){}});
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-rgnsave]");if(!b)return;e.preventDefault();const w=document.getElementById("rgnNeed");if(!w)return;
  const f=((typeof STATE!=="undefined"&&STATE.farmers)||[]).find(y=>y.id===w.dataset.fid);if(!f)return;const row={};
  w.querySelectorAll("[data-rgnk]").forEach(i=>{let v=String(i.value||"").trim();if(!v)return;if(i.dataset.rgnk==="email")v=v.toLowerCase();if(i.dataset.rgnk==="ico")v=icoN(v);row[i.dataset.rgnk]=v});
  if(!Object.keys(row).length){toast("Vypíš aspoň jeden údaj.",4000);return}
  b.disabled=true;try{await save(f,row);toast("✓ Uložené k zákazníkovi: "+String(f.name).trim(),5000);check(f.id)}catch(x){toast(/23505/.test(String(x.message))?"Tento e-mail už má iný farmár.":"Uloženie zlyhalo: "+x.message,6000)}b.disabled=false},true);
{const s=document.createElement("style");s.textContent=`.rgn{display:grid;gap:6px;margin:6px 0 4px;grid-column:1/-1}.rgn .rgnh{font-weight:700;font-size:.88rem}
.rgn button{display:grid;gap:2px;justify-items:start;justify-content:stretch;text-align:left!important;padding:8px 12px;border-radius:12px;min-height:48px;white-space:normal;width:100%;box-sizing:border-box}.rgnneed{margin:8px 0;padding:12px;border-radius:16px;border:1px solid rgba(250,204,21,.55);background:rgba(250,204,21,.1);display:grid;gap:8px;grid-column:1/-1}.rgnneed.hard{border-color:rgba(248,113,113,.7);background:rgba(248,113,113,.1)}
.rgnneed .rgnf{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.rgnneed label{display:flex;flex-direction:column;gap:4px;min-width:0}.rgnneed .rgnfs{align-self:center;font-weight:700}
.rgn button small{opacity:.75;font-weight:500;overflow-wrap:anywhere}`;document.head.appendChild(s)}
})();
