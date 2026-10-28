// ===== 🔎 FIRMY PODĽA IČO – automatické vyplnenie z verejného registra + FinStat =====
// Kde je IČO (nový farmár / zákazník, Uzatvoriť obchod, kurací trus – partneri, evidencia – živnostník, karta farmára),
// po zadaní IČO alebo po odfotení pečiatky aplikácia hneď vyhľadá firmu v Registri právnických osôb
// (Štatistický úrad SR, verejné údaje, licencia CC BY 4.0) a vyplní obchodné meno a sídlo. Pri výsledku je odkaz na FinStat.
// DIČ a IČ DPH register neposkytuje – tie zostávajú z pečiatky / ručne (FinStat API vyžaduje platený kľúč).
// Prístup: kľúč „firmy“ v Prístupoch (majiteľ vždy). Nič sa neukladá mimo formulára – zapíše sa až pri Uložiť.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>{if(typeof ROLE==="undefined"||!ROLE)return false;if(typeof FARMER!=="undefined"&&FARMER)return false;return ROLE==="owner"||(typeof can==="function"&&can("firmy"))};
const C={};
const digits=v=>String(v||"").replace(/\D/g,"");
const norm=v=>{const d=digits(v);return d.length>=6&&d.length<=8?d.padStart(8,"0"):""};
const cur=a=>(a||[]).find(x=>!x.validTo)||(a||[])[0]||null;
const psc=p=>{const d=digits(p);return d.length===5?d.slice(0,3)+" "+d.slice(3):p||""};
function fmtAddr(a){if(!a)return "";const town=(a.municipality&&a.municipality.value)||"";const st=a.street||"";
  const no=[a.regNumber&&+a.regNumber>0?a.regNumber:"",a.buildingNumber||""].filter(Boolean).join("/");
  const pc=psc((a.postalCodes||[])[0]||"");return [(st||town)+(no?" "+no:""),[pc,town].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
async function lookup(ico){ico=norm(ico);if(!ico)return null;if(C[ico])return C[ico];
  const p=(async()=>{const r=await fetch("https://api.statistics.sk/rpo/v1/search?identifier="+ico,{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error("register "+r.status);const j=await r.json();const R=(j.results||[])[0];if(!R)return {ico,none:true};
    const nm=cur(R.fullNames),ad=cur(R.addresses),sr=R.sourceRegister||{};
    const reg=[sr.value&&sr.value.value,cur(sr.registrationOffices)&&cur(sr.registrationOffices).value,cur(sr.registrationNumbers)&&("č. "+cur(sr.registrationNumbers).value)].filter(Boolean).join(", ");
    return {ico,name:nm?nm.value:"",addr:fmtAddr(ad),reg,ended:!!(R.termination||R.terminationDate)}})();
  C[ico]=p;p.catch(()=>{delete C[ico]});return p}
window.firmyLookup=lookup;
window.finstatUrl=ico=>"https://finstat.sk/"+norm(ico);
// pole pre meno / adresu v tom istom formulári
const pickIn=(root,names)=>{for(const n of names){const x=root.querySelector(`input[name="${n}"],input[data-qdf="${n}"],textarea[name="${n}"]`);if(x)return x}return null};
function setVal(inp,v){if(!inp||!v)return;inp.value=v;inp.dispatchEvent(new Event("input",{bubbles:true}));inp.dispatchEvent(new Event("change",{bubbles:true}))}
function chip(inp){let c=inp.parentNode.querySelector(":scope > .fsi");if(!c){c=document.createElement("div");c.className="fsi";(inp.closest("label")||inp).after(c)}return c}
async function run(inp){if(!OK())return;const ico=norm(inp.value);if(!ico||inp.dataset.fsDone===ico)return;inp.dataset.fsDone=ico;
  const root=inp.closest("form,details,.card")||document;const c=chip(inp);c.className="fsi";c.innerHTML="🔎 Hľadám IČO "+E(ico)+" v registri…";
  try{const d=await lookup(ico);if(!d||d.none){c.className="fsi w";c.innerHTML=`⚠️ IČO ${E(ico)} sa v registri nenašlo – skontroluj ho. <a href="${finstatUrl(ico)}" target="_blank" rel="noopener">FinStat ↗</a>`;return}
    setVal(pickIn(root,["name","nazov"]),d.name);setVal(pickIn(root,["addr","adresa","address"]),d.addr);
    c.className="fsi ok"+(d.ended?" w":"");c.innerHTML=`✓ <b>${E(d.name)}</b>${d.addr?" · "+E(d.addr):""}${d.reg?`<small>${E(d.reg)}</small>`:""}${d.ended?"<small>⚠️ Firma je v registri ukončená!</small>":""}<small>Vyplnené z registra (RPO, ŠÚ SR). DIČ a IČ DPH skontroluj na <a href="${finstatUrl(ico)}" target="_blank" rel="noopener">FinStat ↗</a></small>`}
  catch(x){delete inp.dataset.fsDone;c.className="fsi w";c.innerHTML=`Register je teraz nedostupný. <a href="${finstatUrl(ico)}" target="_blank" rel="noopener">Otvoriť FinStat ↗</a>`}}
const isIco=t=>t&&t.matches&&t.matches('input[name="ico"],input[data-qdf="ico"]')&&!t.closest('form[id^="dn"],[data-dn]');
let tm=0;
document.addEventListener("input",e=>{if(!isIco(e.target))return;clearTimeout(tm);const t=e.target;tm=setTimeout(()=>{if(norm(t.value).length===8&&digits(t.value).length>=8)run(t)},700)},true);
document.addEventListener("change",e=>{if(isIco(e.target))run(e.target)},true);
document.addEventListener("focusout",e=>{if(isIco(e.target))run(e.target)},true);
// po odfotení pečiatky (Uzatvoriť obchod) – qd.js zavolá firmyAfterStamp(F) s prečítanými údajmi
window.firmyAfterStamp=async(F,done)=>{if(!OK()||!F||!norm(F.ico))return;try{const d=await lookup(F.ico);if(d&&!d.none){if(d.name)F.nazov=d.name;if(d.addr)F.adresa=d.addr;F._reg=d.reg;if(done)done(d)}}catch(x){}};
{const s=document.createElement("style");s.textContent=`.fsi{margin:4px 0 2px;padding:8px 10px;border-radius:12px;font-size:.84rem;line-height:1.35;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.35)}
.fsi.ok{background:rgba(182,255,59,.1);border-color:rgba(182,255,59,.4)}.fsi.w{background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.5)}
.fsi small{display:block;opacity:.8;margin-top:2px}.fsall .btns{margin-top:8px}.fsi a{font-weight:700}`;document.head.appendChild(s)}

// ===== VŠETCI FARMÁRI: doplniť údaje z registra podľa IČO (pravidlo majiteľa: vždy) =====
// Doplní iba prázdne polia (sídlo), nič neprepíše; firmy ukončené v registri označí. Spúšťa sa samo raz denne u majiteľa
// (na pozadí, potichu) a tlačidlom v záložke Farmári. Farmári bez IČO sa nedajú overiť – ukáže ich počet.
const CANF=()=>OK()&&(ROLE==="owner"||(typeof can==="function"&&can("farm")));
let FA={busy:false,last:null};
async function fillAll(manual){if(FA.busy||!CANF())return;const L=((typeof STATE!=="undefined"&&STATE.farmers)||[]).filter(f=>f&&f.id);if(!L.length)return;
  FA.busy=true;let ok=0,filled=0,ended=[],noico=0,miss=0;paintFA(manual?"🔎 Overujem farmárov v registri…":null);
  for(const f of L){const ico=norm(f.ico);if(!ico){noico++;continue}
    try{const d=await lookup(ico);if(!d||d.none){miss++;continue}ok++;if(d.ended)ended.push(f.name);
      const row={};if(!String(f.addr||"").trim()&&d.addr)row.addr=d.addr;
      if(Object.keys(row).length){const r=await sb.from("farmers").update(row).eq("id",f.id);if(!r.error){Object.assign(f,row);filled++}}}
    catch(x){}
    await new Promise(r=>setTimeout(r,250))}
  FA={busy:false,last:{at:new Date(),ok,filled,ended,noico,miss,n:L.length}};try{localStorage.setItem("ernte-firmy-all",new Date().toLocaleDateString("sv-SE"))}catch(x){}
  paintFA();if(manual&&typeof toast==="function")toast(`✓ Register: overených ${ok}, doplnené údaje u ${filled}${ended.length?`, ⚠️ ukončené firmy: ${ended.join(", ")}`:""}${noico?`, bez IČO: ${noico}`:""}.`,9000)}
window.firmyFillAll=fillAll;
function faHTML(){const L=((typeof STATE!=="undefined"&&STATE.farmers)||[]),n=L.filter(f=>norm(f.ico)).length,x=FA.last;
  return `<div class="card fsall"><b>🔎 Údaje farmárov z registra</b><div class="s">Podľa IČO sa doplní sídlo (a overí, či firma ešte existuje) – automaticky raz denne. S IČO: <b>${n}</b> z ${L.length}. DIČ / IČ DPH over cez FinStat pri farmárovi.</div>
   ${x?`<div class="s">Posledná kontrola ${x.at.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}: overených ${x.ok}, doplnené ${x.filled}${x.miss?`, nenájdené IČO ${x.miss}`:""}${x.ended.length?` · <b>⚠️ ukončené v registri: ${E(x.ended.join(", "))}</b>`:""}</div>`:""}
   <div class="btns"><button type="button" data-fsall="1"${FA.busy?" disabled":""}>${FA.busy?"Overujem…":"🔎 Doplniť všetkým teraz"}</button></div></div>`}
function paintFA(){const c=document.querySelector(".fsall");if(c)c.outerHTML=faHTML()}
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-fsall]")){e.preventDefault();fillAll(true)}});
// karta v záložke Farmári
function inject(){if(!CANF()||typeof TAB==="undefined"||TAB!=="farm")return;const app=document.getElementById("app");if(!app||app.querySelector(".fsall"))return;
  const nav=app.querySelector("nav.tabs");const d=document.createElement("div");d.innerHTML=faHTML();const el=d.firstElementChild;
  const first=nav?nav.nextElementSibling:app.firstElementChild;if(first&&first.parentNode)first.parentNode.insertBefore(el,first.nextSibling);else app.prepend(el)}
let q2=0;const sch=()=>{if(q2)return;q2=requestAnimationFrame(()=>{q2=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  // raz denne automaticky na pozadí
  let tries=0;const t=setInterval(()=>{tries++;if(tries>60){clearInterval(t);return}if(!CANF()||window.ERNTE_VIEWAS||window.ERNTE_TEST||!(typeof STATE!=="undefined"&&STATE.farmers&&STATE.farmers.length))return;clearInterval(t);
    let last="";try{last=localStorage.getItem("ernte-firmy-all")||""}catch(x){}if(last!==new Date().toLocaleDateString("sv-SE"))setTimeout(()=>fillAll(false),8000)},2000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
