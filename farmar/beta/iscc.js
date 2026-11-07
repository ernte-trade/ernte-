// ===== ERNTE · 🌱 ISCC CERTIFIKÁCIA (4. 11. 2026 PRÍKAZ MAJITEĽA – iba Martin a Jana) =====
// Zoznam fariem (samohodnotenia, súradnice polí, NUTS 2) + ISCC evidencia (príjem → predaj) + kontrola pre audit.
// Údaje: iscc_overview / iscc_set (každá zmena v auditnej stope iscc_log) / iscc_evid_add / iscc_file. Pôvodné Excely ostávajú uložené nezmenené.
(function(){
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const I={y:new Date().getFullYear(),d:null,busy:false,sec:"kontrola",ed:null,q:""};
const nf=(n,d=3)=>n==null||n===""?"–":(+n).toLocaleString("sk-SK",{maximumFractionDigits:d});
const dt=s=>s?new Date(s).toLocaleDateString("sk-SK"):"–";
const rr=()=>{if(typeof TAB!=="undefined"&&TAB==="iscc"&&typeof renderStaff==="function")renderStaff()};
async function load(){if(I.busy)return;I.busy=true;try{sb.rpc("deliv_geo_check").then(r=>{I.geo=r.error||!Array.isArray(r.data)?[]:r.data;rr()}).catch(()=>{});const {data,error}=await sb.rpc("iscc_overview",{p_year:I.y});I.d=error?{err:/iscc_overview/.test(error.message)?"Zapne sa po aktualizácii databázy (pár minút).":error.message}:data}catch(x){I.d={err:String(x.message||x)}}I.busy=false;rr()}
const FL=f=>f&&f.length?`<ul class="isf">${f.map(x=>`<li>⚠️ ${e(x)}</li>`).join("")}</ul>`:`<div class="isok">✅ bez výhrad</div>`;
const KV=(k,v)=>`<div><small>${e(k)}</small><b>${v}</b></div>`;
const geo=(la,lo)=>la&&lo?`<a href="https://www.google.com/maps/search/?api=1&query=${la},${lo}" target="_blank" rel="noopener">📍 ${(+la).toFixed(5)}, ${(+lo).toFixed(5)}</a>`:"–";
const MATCH=(x,t)=>`${x.fname?`👨‍🌾 <b>${e(x.fname)}</b> <small class="ism">(${e(x.match||"")})</small>`:`<b class="isw">nespárované</b>`}
  ${x.cands&&x.cands.length>1||!x.fname?`<select data-ispair="${t}:${x.id}"><option value="">— vybrať farmára —</option>${(x.cands||[]).map(c=>`<option value="${c.id}"${c.id===x.farmer_id?" selected":""}>${e(c.n)}${c.a?" · "+e(c.a):""}</option>`).join("")}<option value="?">🔎 hľadať iného…</option></select>`:""}`;
// ---- polia na úpravu ----
const FF=[["name","Meno farmára"],["street","Ulica / č."],["psc","PSČ"],["town","Obec"],["nuts","Región NUTS 2"],["ha","Výmera ha"],["material","Dodávaný materiál"],["decl_date","Dátum samohodnotenia","date"],["first_delivery","Prvá dodávka","date"],["euplus","EU / PLUS"],["lat","Zemepisná šírka (desatinne)"],["lon","Zemepisná dĺžka (desatinne)"],["luc","Zmena využitia pôdy po 1. 1. 2008 (yes/no)"],["cc","Cross Compliance (yes/no)"],["note","Poznámka"]];
const EF=[["recv_date","Dátum prevzatia","date"],["name","Meno farmára"],["addr","Adresa farmára"],["self_decl","ISCC samohodnotenie farmy (áno/nie)"],["sklad","Sklad"],["decl_no","Číslo deklarácie udržateľnosti"],["crop_year","Úroda z roku"],["nuts","NUTS 2 región"],["product","Produkt"],["ghg","GHG hodnota"],["qty_t","Dodané množstvo (t)"],
  ["out_date","Dátum dodania (predaj)","date"],["buyer","Kupujúci"],["contracts","Číslo zmluvy / dátum zmluvy"],["out_qty","Zmluvne dohodnuté množstvo (t)"],["incoterms","Incoterms"],["out_year","Úroda z roku (predaj)"],["out_decl","Číslo deklarácie (predaj)"],["out_nuts","NUTS 2 (predaj)"],["out_product","Produkt (predaj)"],["out_ghg","GHG (predaj)"],["out_delivered","Dodané množstvo (predaj, t)"],["note","Poznámka"]];
const KEYF={recv_date:"recv",self_decl:"self",decl_no:"decl",crop_year:"year",product:"prod",qty_t:"qty",incoterms:"inco",out_decl:"out_decl",out_nuts:"out_nuts",out_product:"out_prod",out_ghg:"out_ghg",out_delivered:"out_del",material:"mat",decl_date:"decl",first_delivery:"first"};
const val=(x,k)=>{const v=x[KEYF[k]||k];return v==null?"":String(v).slice(0,k.endsWith("date")||k==="first_delivery"?10:999)};
function edForm(t,x){const F=t==="farm"?FF:EF;return `<form class="isfrm" data-isfrm="${t}:${x.id}"><div class="isgrid">${F.map(f=>`<label>${e(f[1])}<input name="${f[0]}" ${f[2]==="date"?'type="date"':""} value="${e(val(x,f[0]))}"></label>`).join("")}</div>
  <div class="s">Každá zmena sa zapíše do auditnej stopy (kto, kedy, pôvodná a nová hodnota).</div><div class="btns"><button class="pri" type="submit">💾 Uložiť</button><button type="button" data-ised="">Zrušiť</button></div></form>`}
function farmCard(x){return `<div class="card isc${x.flags.length?" isbad":""}"><div class="ish"><b>${x.no?x.no+". ":""}${e(x.name)}</b><span class="pill ${x.flags.length?"w":""}">${x.flags.length?"⚠️ "+x.flags.length:"✅"}</span></div>
  <div class="s">${MATCH(x,"farm")}</div>
  <div class="iskv">${KV("Adresa",e([x.street,[x.psc,x.town].filter(Boolean).join(" ")].filter(Boolean).join(", "))||"–")}${KV("NUTS 2",e(x.nuts||"–"))}${KV("Výmera",x.ha!=null?nf(x.ha,2)+" ha":"–")}${KV("Materiál",e(x.mat||"–"))}${KV("Samohodnotenie",dt(x.decl))}${KV("Prvá dodávka",dt(x.first))}${KV("Pole (stred)",geo(x.lat,x.lon))}${KV("LUC po 2008",e(x.luc||"–"))}${KV("Cross Compliance",e(x.cc||"–"))}${x.app_t!=null?KV("Lístky v aplikácii "+I.y,nf(x.app_t)+" t"):""}</div>
  ${FL(x.flags)}${x.note?`<div class="s">📝 ${e(x.note)}</div>`:""}
  ${I.ed==="farm:"+x.id?edForm("farm",x):`<div class="btns"><button type="button" data-ised="farm:${x.id}">✏️ Upraviť</button></div>`}</div>`}
function evCard(x){const g=x.ghg||(x.ghg_auto?`${x.ghg_auto} <small class="ism">(podľa tabuľky, nezapísané)</small>`:"–");
  return `<div class="card isc${x.flags.length?" isbad":""}"><div class="ish"><b>${e(x.name)}</b><span class="pill ${x.flags.length?"w":""}">${x.src==="excel"?"Excel r. "+x.row:"z aplikácie"} · ${x.flags.length?"⚠️ "+x.flags.length:"✅"}</span></div>
  <div class="s">${MATCH(x,"evid")}</div>
  <div class="issub">📥 Príjem od farmára</div>
  <div class="iskv">${KV("Dátum prevzatia",dt(x.recv))}${KV("Adresa",e(x.addr||"–"))}${KV("Samohodnotenie",e(x.self||(x.farm_decl&&x.farm_decl.decl?"v zozname fariem "+dt(x.farm_decl.decl):"–")))}${KV("Sklad",e(x.sklad||"–"))}${KV("Č. deklarácie udržateľnosti",e(x.decl||"–"))}${KV("Úroda",e(x.year||"–"))}${KV("NUTS 2",e(x.nuts||"–"))}${KV("Produkt",e(x.prod||"–")+(x.kn?` <small class="ism">KN ${e(x.kn)}</small>`:""))}${KV("GHG",g)}${KV("Dodané množstvo",nf(x.qty)+" t")}</div>
  <div class="issub">🔗 Spárované v aplikácii</div>
  <div class="iskv">${KV("Vážne lístky "+I.y,x.app_t!=null?`${nf(x.app_t)} t · ${x.app_n} ks${x.app_buyers?" · "+e(x.app_buyers):""}`:"žiadne")}${KV("Kúpne zmluvy",e(x.deals||"žiadne"))}</div>
  <div class="issub">📤 Predaj</div>
  <div class="iskv">${KV("Kupujúci",e(x.buyer||"–"))}${KV("Zmluva",e(x.contracts||"–"))}${KV("Dátum dodania",dt(x.out_date))}${KV("Zmluvné množstvo",x.out_qty!=null?nf(x.out_qty)+" t":"–")}${KV("Incoterms",e(x.inco||"–"))}${KV("Č. deklarácie (predaj)",e(x.out_decl||"–"))}${KV("Dodané (predaj)",x.out_del!=null?nf(x.out_del)+" t":"–")}</div>
  ${FL(x.flags)}${x.note?`<div class="s">📝 ${e(x.note)}</div>`:""}
  ${I.ed==="evid:"+x.id?edForm("evid",x):`<div class="btns"><button type="button" data-ised="evid:${x.id}">✏️ Upraviť</button>${!x.ghg&&x.ghg_auto?`<button type="button" data-isghg="${x.id}" data-v="${e(x.ghg_auto)}">🌿 Zapísať GHG ${e(x.ghg_auto)} z tabuľky</button>`:""}</div>`}</div>`}
window.vIscc=function(){if(!OK())return `<div class="card"><div class="s">ISCC Certifikácia je iba pre majiteľa.</div></div>`;
  if(!I.d){load();return `<div class="card"><div class="s">Načítavam ISCC…</div></div>`}
  const D=I.d;if(D.err)return `<div class="card"><b>🌱 ISCC Certifikácia</b><div class="s">${e(D.err)}</div><div class="btns"><button type="button" data-isre>↻ Skúsiť znova</button></div></div>`;
  const F=D.farms||[],E=D.evid||[],M=D.missing||[],B=D.balance||[];
  const q=I.q.trim().toLowerCase(),hit=x=>!q||JSON.stringify([x.name,x.fname,x.addr,x.street,x.town,x.decl,x.contracts]).toLowerCase().includes(q);
  const nF=F.filter(x=>x.flags.length).length,nE=E.filter(x=>x.flags.length).length;
  const S=[["kontrola",`⚠️ Na kontrolu (${nF+nE+M.length})`],["farmy",`🌾 Zoznam fariem (${F.length})`],["evid",`📒 Evidencia ${D.year} (${E.length})`],["chyba",`➕ Chýba v evidencii (${M.length})`],["bilancia","⚖️ Bilancia"],["ghg","🌿 GHG a KN"],["subory","📁 Súbory a export"],["log","🧾 Auditná stopa"]];
  let h=`<div class="card isc ishd"><b class="sth">🌱 ISCC Certifikácia · ${D.year}</b><div class="s">⚠️ = čo by auditor vytkol. Nič sa nemení samo – každú úpravu robíš ty a zapíše sa do auditnej stopy.</div>
   <div class="isyr">${[D.year-1,D.year,D.year+1].map(y=>`<button type="button" class="${y===I.y?"pri":""}" data-isy="${y}">${y}</button>`).join("")}</div>
   <div class="isst">${S.map(s=>`<button type="button" class="${I.sec===s[0]?"pri":""}" data-issec="${s[0]}">${s[1]}</button>`).join("")}</div>
   ${["farmy","evid"].includes(I.sec)?`<input class="isq" data-isq placeholder="🔎 Hľadať meno, obec, číslo zmluvy…" value="${e(I.q)}">`:""}</div>`;
  if(I.sec==="kontrola"){
    const isG=f=>/^GHG prázdne/.test(f),GE=E.filter(x=>!x.ghg&&x.ghg_auto);
    if(GE.length)h+=`<div class="card isc"><b class="sth">🌿 GHG chýba v ${GE.length} riadkoch evidencie</b><div class="s">Hodnota sa dá vziať z tabuľky GHG podľa produktu a regiónu NUTS 2 farmy (napr. sója = DDV, predvolená hodnota). Zapíše sa do evidencie aj do auditnej stopy.</div><div class="btns"><button type="button" class="pri" data-isghgall>🌿 Zapísať GHG z tabuľky do ${GE.length} riadkov</button></div></div>`;
    const L=[...F.filter(x=>x.flags.length).map(x=>["🌾 "+x.name,x.flags,"farmy"]),...E.filter(x=>x.flags.filter(f=>!isG(f)).length).map(x=>["📒 "+x.name,x.flags.filter(f=>!isG(f)),"evid"]),...M.map(x=>["➕ "+x.name,[`dodal ${nf(x.t)} t ${x.prod} (${x.n} lístkov, ${dt(x.d0)}–${dt(x.d1)}) – v evidencii chýba${x.in_farms?"":", nie je ani v zozname fariem"}`],"chyba"])];
    const GX=I.geo||[];if(GX.length)h+=`<div class="card isc"><b class="sth">🚛 Lístky na kontrolu podľa GPS (${GX.length})</b><div class="s">Kamión nakladal pri zemepisnom bode iného farmára, než ku ktorému je lístok pridelený. Nič sa nemení samo – skontroluj a vyber.</div>
      ${GX.map(g=>`<div class="isrow"><b>${e(g.ticket)} · ${dt(g.day)} · ${e(g.com)} · ${nf((g.net||0)/1000)} t${g.plate?" · "+e(g.plate):""}</b><div class="s">Pridelený: <b>${e(g.assigned)}</b> (nakládka ${nf(g.da/1000,1)} km od neho) · GPS sedí na <b>${e(g.near)}</b> (${nf(g.db,0)} m${g.nsrc&&/ISCC/.test(g.nsrc)?", pole ISCC":""}) · <a href="https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lon}" target="_blank" rel="noopener">📍 nakládka</a></div>
       <div class="btns"><button type="button" data-isgmv="${e(g.ticket)}|${g.nid}|${e(g.near)}">↪️ Presunúť na ${e(g.near)}</button><button type="button" data-isgok="${e(g.ticket)}">✔️ Ponechať ${e(g.assigned)}</button></div></div>`).join("")}</div>`;
    h+=`<div class="card isc"><b class="sth">⚠️ Pred auditom treba vyriešiť (${L.length})</b>${L.length?L.map(r=>`<div class="isrow"><b>${e(r[0])}</b>${FL(r[1])}<button type="button" class="islnk" data-issec="${r[2]}">Otvoriť ›</button></div>`).join(""):`<div class="isok">✅ Všetko v poriadku.</div>`}</div>`}
  if(I.sec==="farmy")h+=F.filter(hit).map(farmCard).join("")||`<div class="card"><div class="s">Nič sa nenašlo.</div></div>`;
  if(I.sec==="evid")h+=E.filter(hit).map(evCard).join("")||`<div class="card"><div class="s">Nič sa nenašlo.</div></div>`;
  if(I.sec==="chyba")h+=`<div class="card isc"><b class="sth">➕ Dodali v ${D.year}, v evidencii chýbajú</b><div class="s">Podľa vážnych lístkov v aplikácii. Pridaním vznikne riadok s množstvom z lístkov; číslo deklarácie udržateľnosti doplníš ručne – aplikácia ho nikdy nevymýšľa.</div>
    ${M.length?M.map(x=>`<div class="isrow"><b>${e(x.name)}</b><div class="s">${e(x.prod)} · ${nf(x.t)} t · ${x.n} lístkov · ${dt(x.d0)} – ${dt(x.d1)}${x.buyers?" · "+e(x.buyers):""}${x.in_farms?"":" · ⚠️ nie je v zozname fariem (chýba samohodnotenie)"}</div><button type="button" data-isadd="${x.farmer_id}|${e(x.prod)}">➕ Pridať do evidencie</button></div>`).join(""):`<div class="isok">✅ Všetci, čo dodali, sú v evidencii.</div>`}</div>`;
  if(I.sec==="bilancia")h+=`<div class="card isc"><b class="sth">⚖️ Hmotnostná bilancia ${D.year}</b><div class="s">Udržateľný tovar sa nesmie predať viac, ako sa ho prijalo. Príjem = súčet evidencie, lístky = vážne lístky v aplikácii, predaj = dodané v časti predaj evidencie.</div>
    <div class="istb"><table><thead><tr><th>Produkt</th><th>Príjem (evidencia) t</th><th>Lístky v aplikácii t</th><th>Predaj t</th><th>Zostatok t</th></tr></thead><tbody>${B.map(b=>{const z=(+b.in_t||0)-(+b.out_t||0);return `<tr><td>${e(b.prod)}</td><td>${nf(b.in_t)}</td><td>${nf(b.app_t)}</td><td>${nf(b.out_t)}</td><td class="${z<0?"isw":""}">${nf(z)}${z<0?" ⚠️":""}</td></tr>`}).join("")}</tbody></table></div>
    <div class="s">Rozdiel medzi evidenciou a lístkami znamená, že časť príjmu nie je v aplikácii (iný sklad, iný odberateľ) alebo naopak – pozri ⚠️ pri jednotlivých riadkoch.</div></div>`;
  if(I.sec==="ghg"){const G=D.ghg||[],cr=[...new Set(G.map(g=>g.crop))],nu=[...new Set(G.map(g=>g.nuts))];
    h+=`<div class="card isc"><b class="sth">🌿 GHG hodnoty podľa NUTS 2 (kg CO₂eq/t)</b><div class="s">DDV = predvolená (disaggregated default) hodnota. Z tejto tabuľky sa ponúka GHG do evidencie podľa regiónu farmy.</div>
      <div class="istb"><table><thead><tr><th>Plodina</th>${nu.map(n=>`<th>${e(n)}</th>`).join("")}<th>KN kód</th></tr></thead><tbody>${cr.map(c=>`<tr><td>${e(c)}</td>${nu.map(n=>`<td>${e((G.find(g=>g.crop===c&&g.nuts===n)||{}).val||"")}</td>`).join("")}<td>${e((D.kn||{})[c]||"")}</td></tr>`).join("")}</tbody></table></div></div>`}
  if(I.sec==="subory")h+=`<div class="card isc"><b class="sth">📁 Pôvodné súbory (nezmenené, pre audit)</b>${(D.files||[]).map(f=>`<div class="isrow"><b>${e(f.title)}</b><div class="s">${e(f.fname)} · uložené ${dt(f.at)}</div><button type="button" data-isfile="${e(f.id)}">⬇️ Stiahnuť originál</button></div>`).join("")}
    <b class="sth">📤 Export pre audítora (aktuálny stav)</b><div class="s">Excel v rovnakom tvare ako pôvodné tabuľky – hárky Evidencia, Farm list a GHG hodnota, plus Kontrola so všetkými ⚠️. Riadky doplnené z lístkov bez čísla deklarácie idú na samostatný hárok „Na doplnenie“, nie do evidencie.</div><div class="btns"><button type="button" class="pri" data-isexp>📊 Exportovať Excel ${D.year}</button></div></div>`;
  if(I.sec==="log")h+=`<div class="card isc"><b class="sth">🧾 Auditná stopa (posledných 30 zmien)</b>${(D.log||[]).length?`<div class="istb"><table><thead><tr><th>Kedy</th><th>Kto</th><th>Čo</th><th>Pôvodne</th><th>Nové</th></tr></thead><tbody>${D.log.map(l=>`<tr><td>${new Date(l.at).toLocaleString("sk-SK")}</td><td>${e(l.by_email||"")}</td><td>${e((l.tbl==="farm"?"farma":"evidencia")+" #"+l.rid+" · "+l.field)}</td><td>${e(l.old??"")}</td><td>${e(l.new??"")}</td></tr>`).join("")}</tbody></table></div>`:`<div class="s">Zatiaľ žiadne zmeny.</div>`}</div>`;
  return h};
// ---- export Excel (SheetJS) ----
function xlsxLib(){if(window.XLSX)return Promise.resolve(window.XLSX);return new Promise((ok,no)=>{const s=document.createElement("script");s.src="vendor/xlsx-0.18.5.js";s.onload=()=>ok(window.XLSX);s.onerror=()=>no(new Error("Knižnica Excel sa nenačítala."));document.head.appendChild(s)})}
async function exportX(){const D=I.d;if(!D)return;const X=await xlsxLib(),wb=X.utils.book_new(),d=s=>s?new Date(s):null;
  const ev=[["Dátum prevzatia","Meno farmára","Adresa farmára","ISCC samohodnotenie farmy (áno/nie)","Sklad","Číslo deklarácie udržateľnosti","Úroda z roku","NUTS 2 región","Produkt","GHG hodnota","Dodané množstvo","","Dátum dodania","Kupujúci","Číslo zmluvy / Dátum zmluvy","Zmluvne dohodnuté množstvo","Incoterms","Úroda z roku","Číslo deklarácie udržateľnosti","NUTS 2 región","Produkt","GHG hodnota","Dodané množstvo"]];
  const ok=x=>x.src==="excel"||!!x.decl,nv=[ev[0].slice()];
  (D.evid||[]).filter(x=>!ok(x)).forEach(x=>nv.push([d(x.recv),x.name,x.addr,x.self||"",x.sklad||"",x.decl||"",x.year,x.nuts,x.prod,x.ghg||"",x.qty!=null?+x.qty:"","",d(x.out_date),x.buyer||"",x.contracts||"",x.out_qty!=null?+x.out_qty:"",x.inco||"",x.out_year||"",x.out_decl||"",x.out_nuts||"",x.out_prod||"",x.out_ghg||"",x.out_del!=null?+x.out_del:""]));
  (D.evid||[]).filter(ok).forEach(x=>ev.push([d(x.recv),x.name,x.addr,x.self||"",x.sklad||"",x.decl||"",x.year,x.nuts,x.prod,x.ghg||"",x.qty!=null?+x.qty:"","",d(x.out_date),x.buyer||"",x.contracts||"",x.out_qty!=null?+x.out_qty:"",x.inco||"",x.out_year||"",x.out_decl||"",x.out_nuts||"",x.out_prod||"",x.out_ghg||"",x.out_del!=null?+x.out_del:""]));
  const fl=[["No.","Name of farmer","Farm name","Street / house no.","Postal code","Town / city","Region","Size / acreage of the whole farm","Supplied material","Date of issuing the self-declaration","Date of first delivery from farm","EU / PLUS","Latitude","Longitude","Land use change after January 2008 (yes/no)","EU Cross Compliance (yes/no/n/a)"]];
  (D.farms||[]).forEach(x=>fl.push([x.no,x.name,x.name,x.street,x.psc,x.town,x.nuts,x.ha!=null?+x.ha:"",x.mat,d(x.decl),d(x.first),x.euplus||"",x.lat!=null?+x.lat:"",x.lon!=null?+x.lon:"",x.luc||"",x.cc||""]));
  const G=D.ghg||[],nu=[...new Set(G.map(g=>g.nuts))],gh=[["",...nu]];[...new Set(G.map(g=>g.crop))].forEach(c=>gh.push([c,...nu.map(n=>{const v=(G.find(g=>g.crop===c&&g.nuts===n)||{}).val;return v&&!isNaN(+v)?+v:v||""})]));gh.push([]);gh.push(["KN-kód"]);Object.entries(D.kn||{}).forEach(([c,k])=>gh.push([c,k]));
  const ko=[["Kde","Meno","Výhrada"]];(D.farms||[]).forEach(x=>x.flags.forEach(f=>ko.push(["Zoznam fariem",x.name,f])));(D.evid||[]).forEach(x=>x.flags.forEach(f=>ko.push(["Evidencia",x.name,f])));(D.missing||[]).forEach(x=>ko.push(["Chýba v evidencii",x.name,`${x.prod} ${x.t} t z lístkov aplikácie`]));
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(ev,{cellDates:true}),"Evidencia");X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(fl,{cellDates:true}),"Farm list");X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(gh),"GHG hodnota");X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(ko),"Kontrola");if(nv.length>1)X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(nv,{cellDates:true}),"Na doplnenie (z lístkov)");
  X.writeFile(wb,`ISCC evidencia ${D.year} ERNTE spol. s r.o. ${new Date().toISOString().slice(0,10)}.xlsx`)}
async function file(id){const {data,error}=await sb.rpc("iscc_file",{p_id:id});if(error||!data){toast("⚠️ "+(error?error.message:"Súbor sa nenašiel"));return}
  const b=Uint8Array.from(atob(data.b64),c=>c.charCodeAt(0)),u=URL.createObjectURL(new Blob([b],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})),a=document.createElement("a");a.href=u;a.download=String(data.fname).replace(/_/g," ");document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
async function set(t,id,f,v){const {error}=await sb.rpc("iscc_set",{p_tbl:t,p_id:id,p_field:f,p_val:v==null?"":String(v)});if(error)throw error}
document.addEventListener("click",async ev=>{const t=ev.target;let x;
  if(x=t.closest("[data-issec]")){I.sec=x.dataset.issec;I.ed=null;rr();return}
  if(x=t.closest("[data-isy]")){I.y=+x.dataset.isy;I.d=null;load();rr();return}
  if(t.closest("[data-isre]")){I.d=null;load();return}
  if(x=t.closest("[data-ised]")){I.ed=x.dataset.ised||null;rr();return}
  if(t.closest("[data-isexp]")){try{await exportX()}catch(er){toast("⚠️ "+er.message)}return}
  if(x=t.closest("[data-isfile]")){file(x.dataset.isfile);return}
  if(x=t.closest("[data-isgmv]")){const [tk,fid,nm]=x.dataset.isgmv.split("|");if(!confirm(`Presunúť lístok ${tk} na ${nm}? Prepočítajú sa zmluvy oboch farmárov.`))return;x.disabled=true;
    try{const {error}=await sb.rpc("deliveries_assign",{p_tickets:[tk],p_farmer:fid});if(error)throw error;toast("↪️ Presunuté");await load()}catch(er){x.disabled=false;toast("⚠️ "+er.message)}return}
  if(x=t.closest("[data-isgok]")){x.disabled=true;try{const {error}=await sb.rpc("deliv_geo_keep",{p_ticket:x.dataset.isgok});if(error)throw error;toast("✔️ Ponechané");await load()}catch(er){x.disabled=false;toast("⚠️ "+er.message)}return}
  if(x=t.closest("[data-isghgall]")){const GE=(I.d.evid||[]).filter(r=>!r.ghg&&r.ghg_auto);if(!confirm(`Zapísať GHG z tabuľky do ${GE.length} riadkov evidencie?`))return;x.disabled=true;let n=0;
    try{for(const r of GE){await set("evid",r.id,"ghg",r.ghg_auto);n++}toast(`🌿 GHG zapísané (${n})`)}catch(er){toast("⚠️ "+er.message)}await load();return}
  if(x=t.closest("[data-isghg]")){x.disabled=true;try{await set("evid",+x.dataset.isghg,"ghg",x.dataset.v);toast("🌿 GHG zapísané");await load()}catch(er){x.disabled=false;toast("⚠️ "+er.message)}return}
  if(x=t.closest("[data-isadd]")){const [fid,prod]=x.dataset.isadd.split("|");if(!confirm(`Pridať do ISCC evidencie ${prod} z vážnych lístkov? Číslo deklarácie doplníš ručne.`))return;x.disabled=true;
    try{const {error}=await sb.rpc("iscc_evid_add",{p_farmer:fid,p_prod:prod,p_year:I.y});if(error)throw error;toast("➕ Pridané do evidencie");I.sec="evid";await load()}catch(er){x.disabled=false;toast("⚠️ "+er.message)}return}});
document.addEventListener("change",async ev=>{const s=ev.target.closest("[data-ispair]");if(!s)return;let v=s.value;const [t,id]=s.dataset.ispair.split(":");
  if(v==="?"){const q=prompt("Napíš časť mena farmára:");if(!q){s.value="";return}const L=(STATE.farmers||[]).filter(f=>String(f.name).toLowerCase().includes(q.toLowerCase())).slice(0,12);
    if(!L.length){toast("Nikto sa nenašiel.");s.value="";return}const i=prompt(L.map((f,i)=>`${i+1}. ${f.name}${f.addr?" · "+f.addr:""}`).join("\n")+"\n\nNapíš číslo:");const f=L[(+i||0)-1];if(!f){s.value="";return}v=f.id}
  if(!v)return;try{await set(t,+id,"farmer_id",v);toast("👨‍🌾 Spárované");await load()}catch(er){toast("⚠️ "+er.message)}});
document.addEventListener("input",ev=>{const q=ev.target.closest("[data-isq]");if(!q)return;I.q=q.value;clearTimeout(I.qt);I.qt=setTimeout(()=>{const p=q.selectionStart;rr();const n=document.querySelector("[data-isq]");if(n){n.focus();try{n.setSelectionRange(p,p)}catch(x){}}},350)});
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-isfrm]");if(!f)return;ev.preventDefault();const [t,id]=f.dataset.isfrm.split(":");
  const x=(t==="farm"?I.d.farms:I.d.evid).find(r=>String(r.id)===id);if(!x)return;const ch=[];
  new FormData(f).forEach((v,k)=>{v=String(v).trim().replace(/^(-?\d+),(\d+)$/,"$1.$2");if(v!==val(x,k))ch.push([k,v])});
  if(!ch.length){I.ed=null;rr();return}
  const b=f.querySelector("button[type=submit]");b.disabled=true;
  try{for(const [k,v] of ch)await set(t,+id,k,v);toast(`💾 Uložené (${ch.length} ${ch.length===1?"zmena":ch.length<5?"zmeny":"zmien"})`);I.ed=null;await load()}catch(er){b.disabled=false;toast("⚠️ "+er.message)}});
const st=document.createElement("style");st.textContent=`
.isc{text-align:left}.ishd .s{margin:6px 0}.ish{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.ish b{font-size:16px}
.isst,.isyr{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.isst button,.isyr button{flex:1 1 auto;min-width:0}
.isq{width:100%;box-sizing:border-box;margin-top:10px}
.iskv{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 12px;margin:8px 0}.iskv>div{min-width:0}.iskv small{display:block;opacity:.7;font-size:12px}.iskv b{font-weight:600;font-size:14px;overflow-wrap:anywhere}
.issub{margin-top:10px;font-weight:700;font-size:13px;opacity:.85}
.isf{margin:6px 0;padding-left:0;list-style:none}.isf li{margin:3px 0;padding:6px 10px;border-radius:10px;background:rgba(255,170,60,.13);font-size:13.5px;overflow-wrap:anywhere}
.isok{margin:6px 0;color:#5fe3a1;font-weight:600}.isw{color:#ffb35c}.ism{opacity:.7;font-weight:400}
.isbad{border-color:rgba(255,170,60,.55)!important}
.isrow{padding:10px 0;border-top:1px solid rgba(255,255,255,.1)}.isrow:first-of-type{border-top:0}.islnk{margin-top:4px}
.istb{overflow-x:auto;margin:8px 0}.istb table{border-collapse:collapse;width:100%;font-size:13px}.istb th,.istb td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.12);text-align:left;white-space:nowrap}
.isgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin:10px 0}.isgrid label{font-size:12.5px;min-width:0}.isgrid input{width:100%;box-sizing:border-box}
[data-ispair]{max-width:100%;margin-top:6px}
[data-theme=light] .isok{color:#0f9a5a}[data-theme=light] .isf li{background:#fff4e2}
`;document.head.appendChild(st);
})();
