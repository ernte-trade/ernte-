// ===== ERNTE · DENNÍK PRÁC – roľníci/strojníci zapisujú každý deň čo robili a koľko ha =====
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f2=(x,d=2)=>typeof fmt==="function"?fmt(x,d):(+x).toFixed(d);
const num=v=>{if(v==null||v==="")return null;const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null};
const tst=(t,ms)=>(typeof toast==="function"?toast:alert)(t,ms);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dSK=d=>d?new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString("sk-SK",{weekday:"short",day:"numeric",month:"numeric"}):"";
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const BOSS=()=>OWN()||(typeof can==="function"&&can("ev"));
const meMail=()=>String((typeof ME!=="undefined"&&ME&&ME.email)||"").toLowerCase();
const meName=()=>String((typeof STATE!=="undefined"&&STATE.me&&STATE.me.name)||meMail().split("@")[0]);
const PRACE=["orba","podmietka","príprava pôdy","sejba","postrek","hnojenie / rozmetanie","vápnenie","mulčovanie","žatva","lisovanie","odvoz / doprava","valcovanie","dielňa / oprava stroja","iné"];
let W={L:null,m:today().slice(0,7),view:"moje",edit:null,last:{}};
try{W.last=JSON.parse(localStorage.getItem("ernte-praca-last")||"{}")||{}}catch(x){}
const rr=()=>{if(typeof TAB!=="undefined"&&typeof renderStaff==="function")renderStaff()};
async function load(){const d0=new Date();d0.setDate(d0.getDate()-120);const r=await sb.from("ev_praca").select("*").gte("d",d0.toISOString().slice(0,10)).order("d",{ascending:false}).order("id",{ascending:false}).limit(3000);
  W.L=r.error?{err:/does not exist|could not find/i.test(r.error.message)?"Denník prác sa zapne po aktualizácii databázy (pár minút).":r.error.message}:(r.data||[]);rr()}
const mine=()=>(Array.isArray(W.L)?W.L:[]).filter(x=>x.created_by===meMail()||(!BOSS()&&false));
window.pracaToday=()=>Array.isArray(W.L)?W.L.some(x=>x.d===today()&&x.created_by===meMail()):null;

// pripomienka – svieti, kým nie je dnešná práca zapísaná
window.pracaTile=function(){if(OWN()||typeof can!=="function"||!can("praca"))return "";if(W.L===null){load();return ""}
  if(!Array.isArray(W.L)||pracaToday())return "";const h=new Date().getHours();if(h<12)return "";
  return `<button type="button" class="card prtile" data-prgo><span>🌾</span><div><b>Zapíš dnešnú prácu</b><small>Čo si robil, akým strojom, kde a koľko hektárov – zaberie to 20 sekúnd.</small></div><i>›</i></button>`};
const _vh=window.vHome;if(typeof _vh==="function")window.vHome=function(){return (window.pracaTile?pracaTile():"")+_vh.apply(this,arguments)};

// ---- automatická cena: stroj + náradie + ha → Cenník služieb (rovnaké párovanie ako databáza agro_match) ----
const PS={L:null,ok:false,busy:false};
async function psLoad(){if(PS.busy||PS.L)return;PS.busy=true;try{const r=await sb.from("agro_services").select("id,name,machine,tool,unit,price,price_small,small_limit,sort,active").eq("active",true).order("sort");
  PS.L=r.error?[]:(r.data||[]);PS.ok=!r.error&&PS.L.length>0}catch(x){PS.L=[]}PS.busy=false;if(PS.ok&&typeof TAB!=="undefined"&&document.getElementById("prF"))renderStaff()}
const nz=t=>String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const has=(kde,co)=>{const K=" "+nz(kde)+" ",W=nz(co).split(" ").filter(Boolean);return W.length>0&&W.every(w=>K.includes(" "+w+" ")||(w.length>=4&&K.includes(w)))};
function psMatch(stroj,nar){if(!PS.L||!String(stroj||"").trim())return null;const nn=String(nar||"").trim();
  const C=PS.L.filter(s=>["ha","h"].includes(s.unit)&&has((s.machine||"")+" "+s.name,stroj)&&(!nn||has((s.tool||"")+" "+s.name,nn)));
  C.sort((a,b)=>((nn&&has(b.tool||"",nn))-(nn&&has(a.tool||"",nn)))||((((b.tool||"")==="")===(!nn))-(((a.tool||"")==="")===(!nn)))||((a.sort||0)-(b.sort||0)));return C[0]||null}
const tier=(s,q)=>s.price_small!=null&&s.small_limit!=null&&q<=+s.small_limit?+s.price_small:+s.price;
function prCenaHTML(stroj,nar,ha,hod){if(!String(stroj||"").trim())return `<span class="prci">💎</span><div><b>Automatická cena</b><small>Zadaj stroj, náradie a hektáre – cenu vypočítam z Cenníka služieb.</small></div>`;
  const s=psMatch(stroj,nar);if(!s)return `<span class="prci">💎</span><div><b>Pre „${e(stroj)}${nar?" + "+e(nar):""}“ nie je cena v Cenníku služieb</b><small>Doplň službu v Agro služby → Cenník služieb (stroj a náradie).</small></div>`;
  const q=s.unit==="h"?num(hod):num(ha),c=tier(s,q||0),u=s.unit==="h"?"mth":"ha";
  return `<span class="prci">💎</span><div><small>${e(s.name)}${s.tool?" · "+e(s.tool):""}</small><b>${f2(c,2)} €/${u}${q?` × ${f2(q,u==="ha"?2:1)} ${u} = <em>${f2(q*c,2)} €</em>`:""}</b><small>${q?"cena podľa pásma množstva z Cenníka služieb":"zadaj "+(u==="ha"?"hektáre":"hodiny")}</small></div>`}
document.addEventListener("input",ev=>{const f=ev.target.form;if(!f||f.id!=="prF"||!PS.ok)return;if(!["stroj","naradie","ha","hod"].includes(ev.target.name))return;const b=document.getElementById("prCena");if(b)b.innerHTML=prCenaHTML(f.stroj.value,f.naradie.value,f.ha.value,f.hod.value)});
{const st=document.createElement("style");st.textContent=`.prcena{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:18px;position:relative;overflow:hidden;
 background:linear-gradient(135deg,rgba(165,243,252,.16),rgba(139,92,246,.14) 55%,rgba(182,255,59,.10));border:1px solid rgba(165,243,252,.45);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 30px -14px rgba(34,211,238,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.prcena::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.18) 45%,transparent 60%);pointer-events:none}
.prcena .prci{font-size:1.6rem;filter:drop-shadow(0 0 10px rgba(165,243,252,.8))}.prcena div{display:grid;gap:2px;min-width:0}.prcena b{font-size:1.05rem;overflow-wrap:anywhere}.prcena em{font-style:normal;color:#b6ff3b}
.prcena small{opacity:.78;overflow-wrap:anywhere}.prsum{color:#b6ff3b;font-weight:700}`;document.head.appendChild(st)}
window.vPraca=function(){if(!PS.L)psLoad();if(W.L===null){load();return `<div class="card"><div class="s">Načítavam denník prác…</div></div>`}if(W.L.err)return `<div class="card"><div class="s">${e(W.L.err)}</div></div>`;
  const boss=BOSS();let h="";
  if(boss)h+=`<div class="btns seg2">${[["moje","✍️ Zapísať"],["prehl","📊 Prehľad"]].map(x=>`<button type="button" data-prv="${x[0]}" aria-pressed="${W.view===x[0]}">${x[1]}</button>`).join("")}</div>`;
  if(boss&&W.view==="prehl")return h+prehl();
  const L=W.L,ed=W.edit?L.find(x=>x.id===W.edit):null,v=ed||W.last||{};
  const STR=[...new Set(L.map(x=>x.stroj).filter(Boolean))].slice(0,60),POD=[...new Set(L.map(x=>x.podnik).filter(Boolean))].slice(0,80),KTO=[...new Set(L.map(x=>x.kto).filter(Boolean))];
  h+=`<form class="card f prf" id="prF"><div class="w t">${ed?"✏️ Opraviť zápis":"🌾 Čo si dnes robil?"}</div>
   <label>Dátum<input type="date" name="d" required value="${e(ed?ed.d:today())}" max="${today()}"></label>
   ${boss?`<label>Kto<input name="kto" list="prK" value="${e(ed?ed.kto:meName())}" required></label><datalist id="prK">${KTO.map(x=>`<option value="${e(x)}">`).join("")}</datalist>`:""}
   <label>Práca<input name="praca" list="prP" required value="${e(v.praca||"")}" placeholder="sejba, postrek…"></label><datalist id="prP">${PRACE.map(x=>`<option value="${e(x)}">`).join("")}</datalist>
   <label>Stroj<input name="stroj" list="prS" value="${e(v.stroj||"")}" placeholder="Axion 850, Xerion…"></label><datalist id="prS">${STR.map(x=>`<option value="${e(x)}">`).join("")}</datalist>
   <label>Náradie<input name="naradie" list="prN" value="${e(v.naradie||"")}" placeholder="pluh, tanierovka, sejačka…"></label><datalist id="prN">${[...new Set((PS.L||[]).map(x=>x.tool).filter(Boolean).concat(L.map(x=>x.naradie).filter(Boolean)))].slice(0,80).map(x=>`<option value="${e(x)}">`).join("")}</datalist>
   <label>Kde / pre koho<input name="podnik" list="prD" value="${e(ed?ed.podnik||"":"")}" placeholder="ERNTE, farmár, obec…"></label><datalist id="prD">${POD.map(x=>`<option value="${e(x)}">`).join("")}</datalist>
   <label>Pole / lokalita<input name="pole" value="${e(ed?ed.pole||"":"")}"></label>
   <label>Plodina<input name="plodina" list="prC" value="${e(ed?ed.plodina||"":"")}"></label><datalist id="prC">${["pšenica","repka","kukurica","sója","jačmeň","slnečnica"].map(x=>`<option value="${x}">`).join("")}</datalist>
   <label class="prha">Hektáre<input name="ha" inputmode="decimal" value="${ed&&ed.ha!=null?String(ed.ha).replace(".",","):""}" placeholder="napr. 25,5"></label>
   <label>Hodiny<input name="hod" inputmode="decimal" value="${ed&&ed.hod!=null?String(ed.hod).replace(".",","):""}" placeholder="napr. 9"></label>
   ${PS.ok?`<div class="w prcena" id="prCena">${prCenaHTML(v.stroj,v.naradie,ed&&ed.ha,ed&&ed.hod)}</div>`:""}
   <label class="w">Poznámka<input name="pozn" value="${e(ed?ed.pozn||"":"")}" placeholder="napr. porucha, prestoj, materiál"></label>
   <div class="w btns"><button class="lime" type="submit">💾 Uložiť</button>${ed?`<button type="button" data-prx>Zrušiť</button><button type="button" class="red" data-prdel="${ed.id}">🗑️ Zmazať</button>`:""}</div></form>`;
  const M=L.filter(x=>boss?true:x.created_by===meMail()),td=M.filter(x=>x.d===today()&&(boss?x.created_by===meMail():true));
  const wk=new Date();wk.setDate(wk.getDate()-6);const W7=M.filter(x=>x.d>=wk.toISOString().slice(0,10)&&(!boss||x.created_by===meMail()));
  h+=`<div class="hrk"><div class="${td.length?"ps":"wn"}"><small>Dnes</small><b>${td.length?f2(td.reduce((s,x)=>s+(+x.ha||0),0),1)+" ha":"nezapísané"}</b></div><div><small>Posledných 7 dní</small><b>${f2(W7.reduce((s,x)=>s+(+x.ha||0),0),1)} ha</b></div><div><small>Dní s prácou (7 dní)</small><b>${new Set(W7.map(x=>x.d)).size}</b></div></div>`;
  const R=(boss?M.filter(x=>x.created_by===meMail()||x.d===today()):M).slice(0,40);
  if(R.length)h+=`<div class="card trtab prtab"><table><thead><tr><th>Deň</th>${boss?"<th>Kto</th>":""}<th>Práca</th><th>Kde</th><th class="r">ha</th><th></th></tr></thead><tbody>${R.map(x=>`<tr><td>${e(dSK(x.d))}</td>${boss?`<td>${e(x.kto)}</td>`:""}<td><b>${e(x.praca)}</b>${x.stroj?`<br><small>🚜 ${e(x.stroj)}${x.naradie?" + "+e(x.naradie):""}</small>`:""}</td><td>${e([x.podnik,x.pole,x.plodina].filter(Boolean).join(" · "))}</td><td class="r"><b>${x.ha!=null?f2(x.ha,1):"–"}</b>${x.hod?`<br><small>${f2(x.hod,1)} h</small>`:""}${PS.ok&&x.suma!=null?`<br><small class="prsum">${f2(x.suma,0)} €</small>`:""}</td>
    <td>${boss||(x.created_by===meMail()&&Date.now()-new Date(x.created_at)<3*864e5)?`<button type="button" class="evmini" data-pre="${x.id}" aria-label="Opraviť">✏️</button>`:""}</td></tr>`).join("")}</tbody></table></div>`;
  return h+`<div class="s">Zapisuj každý deň. Zápis môžeš 3 dni opraviť. Vedúci z toho vidí hektáre podľa ľudí, strojov a zákazníkov a doplní dochádzku (dni na poli).</div>`};

function prehl(){const m=W.m,L=W.L.filter(x=>String(x.d).startsWith(m)),S=(A,k)=>{const M=new Map;for(const x of A){const kk=(typeof k==="function"?k(x):x[k])||"–";const o=M.get(kk)||{ha:0,hod:0,n:0,d:new Set};o.ha+=+x.ha||0;o.hod+=+x.hod||0;o.n++;o.d.add(x.d);M.set(kk,o)}return [...M].sort((a,b)=>b[1].ha-a[1].ha)};
  const [y,mm]=m.split("-").map(Number),prev=new Date(y,mm-2,1),next=new Date(y,mm,1),fm=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const ppl=S(L,"kto"),days=[...new Set(L.map(x=>x.d))].sort().reverse();
  const tbl=(t,A,cols)=>`<div class="card trtab"><table><thead><tr><th>${t}</th><th class="r">ha</th><th class="r">hod</th>${cols?"<th class=\"r\">dní</th>":""}</tr></thead><tbody>${A.map(([k,o])=>`<tr><td>${e(k)}</td><td class="r"><b>${f2(o.ha,1)}</b></td><td class="r">${o.hod?f2(o.hod,1):""}</td>${cols?`<td class="r">${o.d.size}</td>`:""}</tr>`).join("")||`<tr><td colspan="4">Žiadne zápisy.</td></tr>`}</tbody></table></div>`;
  // kto dnes nezapísal (ľudia, ktorí zapisovali za posledných 14 dní)
  const d14=new Date();d14.setDate(d14.getDate()-14);const act=[...new Set(W.L.filter(x=>x.d>=d14.toISOString().slice(0,10)).map(x=>x.kto))],nt=act.filter(k=>!W.L.some(x=>x.kto===k&&x.d===today()));
  return `<div class="btns evmon"><button type="button" data-prm="${fm(prev)}">◀</button><b>${e(new Date(y,mm-1,1).toLocaleDateString("sk-SK",{month:"long",year:"numeric"}))}</b><button type="button" data-prm="${fm(next)}">▶</button></div>
   <div class="hrk"><div class="ps"><small>Hektáre v mesiaci</small><b>${f2(L.reduce((s,x)=>s+(+x.ha||0),0),1)} ha</b></div><div><small>Zápisov</small><b>${L.length}</b></div>${m===today().slice(0,7)?`<div class="${nt.length?"wn":"ps"}"><small>Dnes ešte nezapísali</small><b>${nt.length?nt.map(e).join(", "):"všetci ✓"}</b></div>`:""}</div>
   ${OWN()||(typeof can==="function"&&can("ev_doch"))?`<div class="btns"><button type="button" data-prdoch="${m}">🗓️ Doplniť do dochádzky dni na poli</button></div>`:""}
   <div class="trdocs">${tbl("Ľudia",ppl,1)}${tbl("Práca",S(L,"praca"))}${tbl("Kde / pre koho",S(L,"podnik"))}${tbl("Stroj",S(L,"stroj"))}</div>
   <details class="card trap"><summary>📅 Po dňoch (${days.length})</summary><div class="trtab"><table><tbody>${days.map(d=>{const A=L.filter(x=>x.d===d);return `<tr><td><b>${e(dSK(d))}</b></td><td>${A.map(x=>`${e(x.kto)}: ${e(x.praca)}${x.ha!=null?" "+f2(x.ha,1)+" ha":""}${x.podnik?" · "+e(x.podnik):""}`).join("<br>")}</td><td class="r"><b>${f2(A.reduce((s,x)=>s+(+x.ha||0),0),1)}</b></td></tr>`}).join("")}</tbody></table></div></details>
   <div class="s">„Kde / pre koho“ je podklad na fakturáciu služieb (napr. rozmetanie, postrek pre farmára).</div>`}

document.addEventListener("click",async ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(g("[data-prgo]")){if(typeof TAB!=="undefined"){TAB="evid";if(window.evSetSec)evSetSec("praca");rr();window.scrollTo({top:0})}return}
  if(x=g("[data-prv]")){W.view=x.dataset.prv;rr();return}
  if(x=g("[data-prm]")){W.m=x.dataset.prm;rr();return}
  if(x=g("[data-pre]")){W.edit=+x.dataset.pre;W.view="moje";rr();window.scrollTo({top:0,behavior:"smooth"});return}
  if(g("[data-prx]")){W.edit=null;rr();return}
  if(x=g("[data-prdel]")){if(!confirm("Zmazať zápis?"))return;const r=await sb.from("ev_praca").delete().eq("id",+x.dataset.prdel);if(r.error){tst("⚠️ "+r.error.message);return}W.L=W.L.filter(y=>y.id!==+x.dataset.prdel);W.edit=null;rr();return}
  if(x=g("[data-prdoch]")){busy(x,true);const r=await sb.rpc("ev_doch_from_praca",{m:x.dataset.prdoch+"-01"});busy(x,false);if(r.error){tst("⚠️ "+r.error.message);return}
    const d=r.data||{};tst(`✓ Dni na poli doplnené u ${d.ok||0} ľudí.${d.nenajdeni&&d.nenajdeni.length?" Nenašiel som v evidencii: "+d.nenajdeni.join(", "):""}`,7000);return}
});
document.addEventListener("submit",async ev=>{const f=ev.target;if(f.id!=="prF")return;ev.preventDefault();const d=new FormData(f),b=f.querySelector("button.lime");
  const o={d:d.get("d"),kto:String(d.get("kto")||meName()).trim(),praca:String(d.get("praca")||"").trim(),stroj:String(d.get("stroj")||"").trim()||null,podnik:String(d.get("podnik")||"").trim()||null,
    pole:String(d.get("pole")||"").trim()||null,plodina:String(d.get("plodina")||"").trim()||null,ha:num(d.get("ha")),hod:num(d.get("hod")),pozn:String(d.get("pozn")||"").trim()||null};if(f.naradie)o.naradie=String(d.get("naradie")||"").trim()||null;
  if(!o.praca){tst("Napíš, akú prácu si robil.");return}if(o.ha!=null&&(o.ha<0||o.ha>2000)){tst("Skontroluj hektáre.");return}if(o.hod!=null&&(o.hod<0||o.hod>24)){tst("Hodín môže byť najviac 24.");return}
  busy(b,true);const id=W.edit;const sv=x=>id?sb.from("ev_praca").update(x).eq("id",id).select().single():sb.from("ev_praca").insert(x).select().single();
  let r=await sv(o);if(r.error&&/naradie/.test(r.error.message||"")){delete o.naradie;r=await sv(o)}busy(b,false);
  if(r.error){tst("⚠️ "+r.error.message);return}
  if(id)W.L=W.L.map(y=>y.id===id?r.data:y);else W.L.unshift(r.data);W.edit=null;W.last={praca:o.praca,stroj:o.stroj,naradie:o.naradie||null};try{localStorage.setItem("ernte-praca-last",JSON.stringify(W.last))}catch(x){}
  tst("✓ Zapísané. Ďakujeme!");rr()});
})();
