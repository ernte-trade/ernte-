/* 7. 11. 2026 (príkaz majiteľa – „AGRO-SOMOTOR OUTPUT ENGINE (MASTERGOOD CONTRACTS)“ + „BENCHMARK 200 KM, FREIGHT CONVERSION & OWNER GATE“):
   🐔 MASTER GOOD v záložke Obchody (majitelia). ERNTE predáva Master Good Kft. (Kisvárda): tovar naložený FCA Agro-Somotor, VALKO vezie CPT Kisvárda.
   • 📏 Benchmark 200 km (IBA Martin – ceny odberateľov a konkurencie): najnižšia povolená cena = najvyššia cena v okruhu 200 km (loco Somotor) + prémia GMP+/ISCC/QS.
   • 🚛 Dodávky: naložené / prevzaté t, vlhkosť, zrážka Master Good, km z GPS (Commander – 🛰️ výber jázd) → doprava km × €/km ÷ netto t.
   • 🧾 Doklady: zmluva (z predajnej zmluvy), faktúra, vyúčtovanie dopravy (VALKO), týždenný audit vlhkosti a váhy s návrhom reklamácie (SK | HU).
     Každý vznikne ako „⏳ ČAKÁ NA SCHVÁLENIE MAJITEĽOM“; Martin ťukne „✅ SCHVÁLIŤ A ODOSLAŤ HOTOVÉ PRE MASTERGOOD“ → zápis do záznamu zmien,
     PDF a zdieľanie z telefónu (odosielanie e-mailov z aplikácie je vypnuté – adresa sa skopíruje). Pod benchmarkom sa schváliť nedá.
   Databáza: mastergood.sql (mg_list, mg_doc_make, mg_doc_approve, mg_rides, mg_cfg_set; pg_cron mastergood-tyzden po 5:23 UTC). Prefix tried mzg. */
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{if(v==null||v==="")return null;const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return isFinite(x)?x:null};
const f=(v,d=0)=>v==null||v===""||!isFinite(+v)?"–":Number(v).toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d});
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_TEST&&!window.ERNTE_VIEWAS;
const MAIN=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const say=(m,ms)=>{if(window.toast)toast(m,ms||5000)};
const COM={kukurica:["Kukurica","Kukorica","1005"],psenica_k:["Pšenica kŕmna","Takarmánybúza","1001"],psenica_p:["Pšenica potravinárska","Étkezési búza","1001"],
  jacmen_k:["Jačmeň kŕmny","Takarmányárpa","1003"],soja:["Sója","Szója","1201"],repka:["Repka","Repce","1205"],slnecnica_ho:["Slnečnica HO","Magas olajsavas napraforgó","1206"],
  ho:["Slnečnica HO","Magas olajsavas napraforgó","1206"],lo:["Slnečnica","Napraforgó","1206"],slnecnica_lo:["Slnečnica","Napraforgó","1206"]};
const cN=k=>(COM[k]||[k||""])[0],cH=k=>(COM[k]||[k,k||""])[1],cKN=k=>(COM[k]||["","",""])[2];
const KIND={zmluva:["📄","Kúpna zmluva","Adásvételi szerződés"],faktura:["🧾","Faktúra","Számla"],doprava:["🚛","Vyúčtovanie dopravy","Fuvarelszámolás"],audit:["🔍","Týždenný audit vlhkosti a váhy","Heti nedvesség- és súlyellenőrzés"]};
const FIRMA={ernte:"ERNTE spol. s r.o.<br>Zbudza 141, 072 23 Zbudza, Slovensko<br>IČO 52 341 356 · IČ DPH SK2120988551",
  valko:"VALKO s.r.o.<br>Zbudza 141, 072 23 Zbudza, Slovensko<br>IČO 53 365 241 · IČ DPH SK2121345424"};
const S={D:null,at:0,busy:false,err:"",open:false,F:null,rides:null,ridesBusy:false,wk:null};
try{S.open=localStorage.getItem("ernte-mzg-open")==="1"}catch(x){}
const dSK=v=>{if(!v)return "";const d=new Date(String(v).length===10?v+"T12:00:00":v);return isNaN(d)?"":d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"})};
const dT=v=>{if(!v)return "";const d=new Date(v);return isNaN(d)?"":d.toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
  const y=t.getUTCFullYear();return y+"-W"+String(Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7)).padStart(2,"0")}
function wkRange(w){const m=/^(\d{4})-W(\d{2})$/.exec(w||"");if(!m)return null;const j4=new Date(Date.UTC(+m[1],0,4)),dw=j4.getUTCDay()||7;
  const mon=new Date(j4);mon.setUTCDate(j4.getUTCDate()-dw+1+(+m[2]-1)*7);const sun=new Date(mon);sun.setUTCDate(mon.getUTCDate()+6);return [mon,sun]}
const wkTxt=w=>{const r=wkRange(w);if(!r)return w||"";const o={day:"numeric",month:"numeric",timeZone:"UTC"};return `${w.slice(6)}. týždeň · ${r[0].toLocaleDateString("sk-SK",o)} – ${r[1].toLocaleDateString("sk-SK",Object.assign({year:"numeric"},o))}`};
function weeks(){const L=[],d=new Date();for(let i=0;i<10;i++){const x=new Date(d);x.setDate(d.getDate()-7*i);const w=isoWeek(x);if(!L.includes(w))L.push(w)}return L}

// ---------- načítanie (časový zámok 2 min – nikdy nie hneď znova z paint) ----------
async function load(force){if(!OWN()||S.busy)return;if(!force&&S.D&&Date.now()-S.at<120000)return;if(!force&&!S.D&&S.err&&Date.now()-S.at<120000)return;
  S.at=Date.now();S.busy=true;
  try{const r=await sb.rpc("mg_list",{p_days:120});
    if(r.error){S.err=/does not exist|Could not find|schema cache|function/i.test(r.error.message||"")?"Databáza ešte nemá časť Master Good – príde s najbližšou aktualizáciou (do pár minút).":String(r.error.message||"chyba");}
    else if(r.data&&typeof r.data==="object"&&!Array.isArray(r.data)){S.D=r.data;S.err=""}
    else S.err="Žiadne údaje."}
  catch(x){S.err=/Failed to fetch|Load failed|offline/i.test(String(x&&x.message||x))?"📡 Bez signálu – skúsim znova o chvíľu.":String(x&&x.message||x)}
  finally{S.busy=false}paint()}

// ---------- časti karty ----------
const pend=()=>((S.D&&S.D.docs)||[]).filter(d=>d.stav==="caka");
function lowOf(d){return !!(d&&d.data&&d.data.floor_ok===false)}
function docRow(d,compact){const K=KIND[d.kind]||["📄",d.kind,""],dt=d.data||{},low=lowOf(d);
  const st=d.stav==="caka"?`<span class="mzg-st mzg-sw">⏳ ČAKÁ NA SCHVÁLENIE MAJITEĽOM</span>`:d.stav==="schvalene"?`<span class="mzg-st mzg-sok">✅ Schválené ${E(dT(d.ok_at))}${d.no?" · "+E(d.no):""}</span>`:`<span class="mzg-st mzg-sno">✕ Zamietnuté${d.why?" – "+E(d.why):""}</span>`;
  const info=[];if(d.suma!=null)info.push(f(d.suma,2)+" €"+(d.kind==="audit"?" na reklamáciu":" bez DPH"));info.push((d.created_by==="systém"?"pripravené automaticky ":"pripravené ")+dT(d.created_at));
  if(d.kind==="audit")info.push(+dt.claims?`⚠️ návrh reklamácie ${dt.claims}×`:"✅ bez odchýlok");
  if(d.kind==="faktura"&&+dt.miss)info.push(`${dt.miss} dodávok bez ceny nie je vo faktúre`);
  if((d.kind==="faktura"&&dt.frt&&+dt.frt.bez_km)||(d.kind==="doprava"&&dt.tot&&+dt.tot.bez_km))info.push(`⚠️ ${(dt.frt||dt.tot).bez_km}× bez km – doprava neúplná`);
  return `<div class="mzg-doc${d.stav==="caka"?" mzg-pend":""}"><div class="mzg-dh"><b>${K[0]} ${E(d.title)}</b>${st}</div><small class="mzg-i">${E(info.join(" · "))}</small>
   ${low?`<div class="mzg-bad">⛔ Cena ${f(d.price,2)} €/t je pod benchmarkom${d.floor!=null?" "+f(d.floor,2)+" €/t":""} – schváliť sa nedá. ${d.kind==="zmluva"?"Uprav cenu v predajnej zmluve (💼 Predaj).":"Uprav cenu dodávok alebo zmluvy a priprav faktúru znova."}</div>`:""}
   ${d.kind!=="audit"&&dt.floor_ok==null&&(d.kind==="zmluva"||d.kind==="faktura")&&d.stav==="caka"&&MAIN()?`<div class="mzg-warn">⚠️ Benchmark chýba (žiadna cena v okruhu 200 km za posledné 3 týždne) – cenu over sám.</div>`:""}
   <div class="mzg-b"><button type="button" data-mzgview="${d.id}">👁 Náhľad</button>${d.stav==="caka"&&MAIN()?`<button type="button" class="pri mzg-go" data-mzgok="${d.id}"${low?" disabled":""}>✅ SCHVÁLIŤ A ODOSLAŤ HOTOVÉ PRE MASTERGOOD</button>${compact?"":`<button type="button" data-mzgno="${d.id}">✕ Zamietnuť</button>`}`:""}${d.stav==="schvalene"?`<button type="button" data-mzgsend="${d.id}">📤 Poslať Master Good</button>`:""}</div></div>`}
function benchHTML(){const B=S.D.bench||{},C=B.com||{},ks=Object.keys(C);
  const head=`<h3 class="mzg-h">📏 Benchmark ${f(B.r_km||200)} km od Somotora</h3><div class="s">Najnižšia povolená cena tovaru FCA Agro-Somotor = najvyššia cena odberateľov a konkurencie v okruhu ${f(B.r_km||200)} km (DAP / DDP po odrátaní našej dopravy do Somotora) + prémia GMP+ / ISCC / QS ${f(B.prem,2)} €/t. Pod ňou zmluvu ani faktúru pre Master Good schváliť nejde.</div>`;
  if(!ks.length)return head+`<div class="s">Za posledné 3 týždne nie je v okruhu žiadna cena – benchmark sa nedá určiť.</div>`;
  return head+`<div class="mzg-tiles">${ks.map(k=>{const c=C[k],b=c.best||{};return `<div class="mzg-t"><small>${E(cN(k))} · najmenej</small><b>${c.floor!=null?f(c.floor,2)+" €/t":"–"}</b><small>${b.who?`${E(b.who)} · ${E(b.site||"u farmára")} ${E(b.del||"")} ${f(b.pnow,2)} € → loco ${f(b.fca,2)} €`:"bez ceny v okruhu"}</small></div>`}).join("")}</div>
   ${ks.map(k=>`<details class="mzg-d"><summary>${E(cN(k))} – odkiaľ je benchmark · ${C[k].n||0} cien v okruhu</summary>${(C[k].rows||[]).map(r=>`<div class="mzg-li${r.inr?"":" mzg-out"}"><div class="mzg-l1"><b>${E(r.who)}</b><b class="mzg-v">${r.fca==null?"–":"loco "+f(r.fca,2)+" €"}</b></div><small>${r.src==="konkurencia"?"konkurencia":"odberateľ"} · ${E(r.site||"u farmára")} ${E(r.del||"")}${r.per?" · "+E(r.per):""} · ${f(r.pnow,2)} €/t${r.fl&&+r.pnow!==+r.price?` (ponuka ${f(r.price,2)}, posun s burzou)`:""}${r.rkm!=null&&+r.rkm>0?` · ${f(r.rkm)} km, doprava ${f(r.dop,2)} €/t`:""} · ${E(dSK(r.d))}${r.why?" · ⚠️ "+E(r.why):""}</small></div>`).join("")}</details>`).join("")}`}
function scHTML(){const L=S.D.sc||[],C=((S.D.bench||{}).com)||{};
  return `<h3 class="mzg-h">📄 Predajné zmluvy Master Good</h3>${L.length?L.map(s=>{const fl=C[s.com]&&C[s.com].floor,low=MAIN()&&fl!=null&&s.price!=null&&+s.price<+fl;
    return `<div class="mzg-row"><b>${E(s.no||"bez čísla")} · ${E(cN(s.com))} · ${f(s.tons,0)} t · ${s.price!=null?f(s.price,2)+" €/t":"bez ceny"}</b><small>${E(s.parity||"")}${s.term?" · "+E(s.term):""}${s.delivered_t!=null?" · dodané "+f(s.delivered_t,1)+" t":""}</small>${low?`<div class="mzg-bad">⛔ Pod dnešným benchmarkom ${f(fl,2)} €/t</div>`:""}</div>`}).join("")
    :`<div class="s">Zatiaľ žiadna. Pridaj ju v 💼 Predaj → ➕ Nová predajná zmluva (odberateľ Master Good, cena = tovar FCA Agro-Somotor) – návrh zmluvy na schválenie sa pripraví sám.</div>`}`}
function shipHTML(){const L=S.D.ship||[],ekm=num(S.D.cfg&&S.D.cfg.ekm)||1.6;
  return `<h3 class="mzg-h">🚛 Dodávky Agro-Somotor → Kisvárda</h3>${S.F?formHTML():`<div class="mzg-b"><button type="button" class="pri" data-mzgnew>➕ Nová dodávka</button><button type="button" data-mzgre>↻ Obnoviť</button></div>`}
   ${L.length?L.slice(0,80).map(s=>{const t=num(s.t_mg)??num(s.t_load),fr=s.km!=null&&t?s.km*ekm/t:null,P=[];
     P.push(cN(s.com));if(s.cmr)P.push("CMR "+s.cmr);P.push(`naložené ${f(s.t_load,2)} t / prevzaté ${f(s.t_mg,2)} t`+(s.t_load&&s.t_mg?` (rozdiel ${f((s.t_load-s.t_mg)*1000,0)} kg)`:""));
     if(s.moist!=null)P.push(`vlhkosť ${f(s.moist,1)} %`);if(s.ded_kg!=null)P.push(`zrážka MG ${f(s.ded_kg,0)} kg`);
     P.push(s.km!=null?`${f(s.km,0)} km${s.km_src==="gps"?" 🛰️ GPS":" ručne"}${fr!=null?` → ${f(fr,2)} €/t`:""}`:"bez km");
     return `<div class="mzg-li"><div class="mzg-l1"><b>${E(dSK(s.d))} · ${E(s.spz||"bez ŠPZ")}</b>${s.fa_id?`<small>🧾 vo faktúre</small>`:`<button type="button" class="mzg-sm" data-mzged="${s.id}" aria-label="Upraviť dodávku">✏️</button>`}</div><small>${E(P.join(" · "))}</small></div>`}).join(""):`<div class="s">Zatiaľ žiadna dodávka.</div>`}`}
function ridesHTML(){if(S.ridesBusy)return `<div class="s">🛰️ Hľadám jazdy z GPS…</div>`;if(!S.rides)return "";
  if(!S.rides.length)return `<div class="s">🛰️ V ten deň nemá auto v GPS žiadnu jazdu – km zadaj ručne.</div>`;
  const sel=new Set((S.F&&S.F.rides)||[]);
  return `<div class="mzg-rides"><small>Zaškrtni jazdy Somotor → Kisvárda a späť (navrhnuté sú zaškrtnuté):</small>${S.rides.map(r=>`<label class="mzg-ck"><input type="checkbox" data-mzgride="${E(r.id)}" data-km="${r.km}"${sel.has(r.id)?" checked":""}><span>${E(dT(r.start))} · <b>${f(r.km,1)} km</b><small>${E(r.from||"?")} → ${E(r.to||"?")}</small></span></label>`).join("")}</div>`}
function formHTML(){const F=S.F,T=(typeof STATE!=="undefined"&&STATE.trucks||[]).filter(t=>t.active!==false),SC=S.D.sc||[];
  const o=(v,l,s)=>`<option value="${E(v)}"${s?" selected":""}>${E(l)}</option>`;
  return `<form class="mzg-f" id="fMzg" autocomplete="off" onsubmit="return false">
   <label>Dátum nakládky<input type="date" name="d" value="${E(F.d||"")}" required></label>
   <label>Komodita<select name="com">${Object.keys(COM).filter(k=>!/^(ho|lo|slnecnica_lo)$/.test(k)).map(k=>o(k,cN(k),F.com===k)).join("")}</select></label>
   <label>ŠPZ<input name="spz" list="mzgSpz" value="${E(F.spz||"")}" placeholder="napr. AA 623NU"><datalist id="mzgSpz">${T.map(t=>`<option value="${E(t.spz||"")}">`).join("")}</datalist></label>
   <label>Vodič<input name="vodic" value="${E(F.vodic||"")}"></label>
   <label>Č. CMR / dodacieho listu<input name="cmr" value="${E(F.cmr||"")}"></label>
   <label>Zmluva<select name="sc_id">${o("","– bez zmluvy –",!F.sc_id)}${SC.map(s=>o(s.id,`${s.no||"bez čísla"} · ${cN(s.com)} · ${s.price!=null?f(s.price,2)+" €/t":""}`,F.sc_id===s.id)).join("")}</select></label>
   <label>Naložené t (Agro-Somotor)<input name="t_load" inputmode="decimal" value="${E(F.t_load??"")}"></label>
   <label>Prevzaté t (Master Good)<input name="t_mg" inputmode="decimal" value="${E(F.t_mg??"")}"></label>
   <label>Vlhkosť % (laboratórium MG)<input name="moist" inputmode="decimal" value="${E(F.moist??"")}"></label>
   <label>Nečistoty %<input name="impur" inputmode="decimal" value="${E(F.impur??"")}"></label>
   <label>Zrážka Master Good kg<input name="ded_kg" inputmode="decimal" value="${E(F.ded_kg??"")}"></label>
   <label>Cena tovaru €/t<input name="price" inputmode="decimal" value="${E(F.price??"")}" placeholder="podľa zmluvy"></label>
   <div class="mzg-km mzg-w"><label>Km spolu (tam aj späť)<input name="km" inputmode="decimal" value="${E(F.km??"")}" data-mzgkm></label><button type="button" data-mzggps>🛰️ Km z GPS</button><small>${F.km_src==="gps"?"🛰️ zo skutočných jázd GPS":F.km!=null&&F.km!==""?"zadané ručne":"podľa ŠPZ a dátumu nájdem jazdy v GPS"}</small></div>
   <div class="mzg-w">${ridesHTML()}</div>
   <label class="mzg-w">Poznámka<input name="note" value="${E(F.note||"")}"></label>
   <div class="mzg-b mzg-w"><button type="button" class="pri" data-mzgsave>💾 Uložiť dodávku</button><button type="button" data-mzgx>Zrušiť</button>${F.id?`<button type="button" class="mzg-del" data-mzgdel>🗑️ Zmazať</button>`:""}</div></form>`}
function docsHTML(){const L=(S.D.docs||[]).filter(d=>d.stav!=="caka"),P=pend(),w=S.wk||weeks()[1];
  return `<h3 class="mzg-h">🧾 Doklady pre Master Good</h3>
   <div class="mzg-gen"><label>Týždeň<select data-mzgwk>${weeks().map(x=>`<option value="${x}"${x===w?" selected":""}>${E(wkTxt(x))}</option>`).join("")}</select></label>
    <div class="mzg-b"><button type="button" data-mzgmk="faktura">🧾 Faktúra</button><button type="button" data-mzgmk="doprava">🚛 Vyúčtovanie dopravy</button><button type="button" data-mzgmk="audit">🔍 Audit vlhkosti</button></div>
    <small>Každý pondelok ráno sa za minulý týždeň pripravia samé. Nový návrh nahradí starší neschválený. Zmluva sa pripraví sama z predajnej zmluvy.</small></div>
   ${P.length?`<div class="mzg-sub">⏳ Na schválenie (${P.length})</div>${P.map(d=>docRow(d)).join("")}`:""}
   ${L.length?`<div class="mzg-sub">Ostatné</div>${L.slice(0,30).map(d=>docRow(d)).join("")}`:(P.length?"":`<div class="s">Zatiaľ žiadny doklad.</div>`)}`}
function cfgHTML(){const c=S.D.cfg||{},b=c.buyer||{};
  return `<details class="mzg-d"><summary>⚙️ Nastavenie Master Good</summary><form class="mzg-f" id="fMzgCfg" onsubmit="return false">
   <label>Prémia GMP+ / ISCC / QS €/t<input name="prem" inputmode="decimal" value="${E(c.prem??3)}"></label>
   <label>Okruh benchmarku km<input name="r_km" inputmode="numeric" value="${E(c.r_km??200)}"></label>
   <label>Doprava €/km<input name="ekm" inputmode="decimal" value="${E(c.ekm??1.6)}"></label>
   <label>Tolerancia váhy %<input name="tol_w" inputmode="decimal" value="${E(c.tol_w??0.3)}"></label>
   <label>Tolerancia zrážky kg / týždeň<input name="tol_ded" inputmode="decimal" value="${E(c.tol_ded??20)}"></label>
   <label>Splatnosť faktúry (dni)<input name="splat" inputmode="numeric" value="${E(c.splat??"")}" placeholder="podľa zmluvy"></label>
   <label class="mzg-w">E-mail Master Good (komu posielať)<input name="email" type="email" inputmode="email" autocapitalize="off" value="${E(c.email||"")}" placeholder="nakup@…"></label>
   <label>Adószám / EU DIČ Master Good<input name="vat" value="${E(b.vat||"")}" placeholder="HU…"></label>
   <label>IBAN ERNTE na faktúre<input name="iban" value="${E(c.iban||"")}" placeholder="SK…"></label>
   <div class="mzg-b mzg-w"><button type="button" class="pri" data-mzgcfg>💾 Uložiť nastavenie</button></div>
   <small class="mzg-w">Polohy miest pre benchmark (${Object.keys(c.geo||{}).length}): ${E(Object.keys(c.geo||{}).map(k=>k.replace(/\[[^\]]*\]/g,m=>m.slice(1,2))).join(", "))}. Ponuka z miesta, ktoré tu nie je, sa ukáže s „chýba poloha miesta“ – pridaj ho:</small>
   <label>Nové miesto (názov)<input name="g_k" placeholder="napr. Sárospatak"></label>
   <label>Šírka, dĺžka, krajina<input name="g_v" placeholder="48.32, 21.57, HU"></label>
   <div class="mzg-b mzg-w"><button type="button" data-mzggeo>➕ Pridať miesto</button></div></form></details>`}
function bodyHTML(){const D=S.D,c=D.cfg||{},M=!!D.main&&MAIN();
  const miss=[];if(M&&!c.email)miss.push("e-mail Master Good");if(M&&!(c.buyer&&c.buyer.vat))miss.push("adószám Master Good");if(M&&!c.iban)miss.push("IBAN ERNTE");
  return `<div class="s">ERNTE predáva Master Good Kft. (Kisvárda): tovar naložený FCA Agro-Somotor, VALKO vezie CPT Kisvárda, doprava na faktúre podľa km z GPS. Každý doklad najprv <b>⏳ ČAKÁ NA SCHVÁLENIE MAJITEĽOM</b> – Master Good ho dostane až po ✅ Martina.</div>
   ${miss.length?`<div class="mzg-warn">⚠️ Doplň v ⚙️ Nastavení: ${E(miss.join(", "))}.</div>`:""}
   ${M?benchHTML():""}${scHTML()}${shipHTML()}${docsHTML()}${M?cfgHTML():""}`}
function cardHTML(){const D=S.D,P=pend();
  return `<details class="card mzg" id="mzgCard"${S.open?" open":""}><summary><b>🐔 Master Good · predaj z Agro-Somotor</b><small>${D?`${P.length?`⏳ ${P.length} na schválenie · `:""}${(D.ship||[]).filter(s=>!s.fa_id).length} dodávok mimo faktúry`:"benchmark 200 km · doprava z GPS · týždenný audit · schvaľovanie"}</small></summary>
   <div class="mzg-in">${D?bodyHTML():`<div class="s">${S.err?E(S.err):"Načítavam…"}</div>`}</div></details>`}
function gateHTML(){const P=pend();
  return `<div class="card mzg mzg-gate" id="mzgGate"><div class="mzg-dh"><b>🐔 Master Good – ${P.length} ${P.length===1?"doklad čaká":P.length<5?"doklady čakajú":"dokladov čaká"} na schválenie</b><button type="button" class="mzg-sm" data-mzgopen>Otvoriť ›</button></div>${P.slice(0,4).map(d=>docRow(d,true)).join("")}</div>`}

// ---------- vykreslenie ----------
function paint(){const app=document.getElementById("app");if(!app)return;const T=typeof TAB!=="undefined"?TAB:"";
  const oc=document.getElementById("mzgCard"),og=document.getElementById("mzgGate");
  if(!OWN()){if(oc)oc.remove();if(og)og.remove();return}
  // brána na Prehľade (iba Martin, iba keď niečo čaká)
  if(T==="home"&&MAIN()&&S.D&&pend().length){const h=gateHTML();if(og){if(og.__h!==h){const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.__h=h;og.replaceWith(el)}}
    else{const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.__h=h;const a=app.querySelector(":scope>nav.tabs")||app.querySelector(":scope>.hero");if(a)a.after(el);else app.prepend(el);if(window.ernteTopOrder)try{ernteTopOrder()}catch(x){}}}
  else if(og)og.remove();
  if(T!=="deals"){if(oc)oc.remove();return}
  const fm=oc&&oc.querySelector("form"),ae=document.activeElement;if(fm&&ae&&oc.contains(ae)&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName))return; // nepreskakovať, kým píše
  const h=cardHTML();if(oc&&oc.__h===h)return;const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.__h=h;
  if(oc){oc.replaceWith(el);return}
  const a=app.querySelector("#pzCard")||app.querySelector("#dwCard");if(a)a.after(el);else app.appendChild(el)}
function inject(){if(!OWN())return paint();const T=typeof TAB!=="undefined"?TAB:"";if(T==="deals"||(T==="home"&&MAIN()))load(false);paint()}

// ---------- doklady (PDF) ----------
function docOpen(title,body,brand,head,sub){const w=window.open("","_blank");if(!w){say("Povoľ vyskakovacie okná.");return}
  w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${E(title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{font:12px/1.45 Arial,Helvetica,sans-serif;color:#111;margin:16px}h2{font-size:14px;margin:14px 0 6px}table{border-collapse:collapse;width:100%;margin:4px 0 8px}td,th{border:1px solid #9aa1ad;padding:5px 6px;vertical-align:top;text-align:left}
  th{font-size:11px}td.r,th.r{text-align:right;white-space:nowrap}tr{page-break-inside:avoid}.pt th{width:30%}small{color:#555}.hu{color:#555;font-style:italic}
  .wm{border:2px solid #b45309;background:#fff7ed;color:#9a3412;font-weight:800;padding:8px 10px;margin:0 0 10px;text-align:center;border-radius:6px}.wm.no{border-color:#b91c1c;background:#fef2f2;color:#991b1b}
  .ok{border:1px solid #15803d;background:#f0fdf4;color:#166534;padding:6px 8px;border-radius:6px}.cl{border:1px solid #b91c1c;background:#fef2f2;padding:8px 10px;border-radius:6px;margin:6px 0}
  .tot td{font-weight:800}.sig{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px}.ft{margin-top:14px;font-size:10px;color:#555}${window.brandCss?brandCss(brand):""}</style></head><body>${window.brandHead?brandHead(brand,head||title,sub||""):`<h1>${E(head||title)}</h1>`}${body}</body></html>`);w.document.close()}
function wmark(d){return d.stav==="schvalene"?"":d.stav==="zamietnute"?`<div class="wm no">✕ ZAMIETNUTÉ – NEPOSIELAŤ · ELUTASÍTVA</div>`:`<div class="wm">⏳ NÁVRH – ČAKÁ NA SCHVÁLENIE MAJITEĽOM · TERVEZET – JÓVÁHAGYÁSRA VÁR</div>`}
const okLine=d=>d.stav==="schvalene"?`<div class="ft">Schválil Martin Vaľko ${E(dT(d.ok_at))} · ${E(d.no||"")} · ERNTE Trade &amp; Logistic</div>`:`<div class="ft">ERNTE Trade &amp; Logistic · návrh č. ${d.id}</div>`;
const buyerOf=d=>((d.data||{}).cfg||{}).buyer||((S.D&&S.D.cfg)||{}).buyer||{};
const buyerBlock=b=>`${E(b.n||"MASTER GOOD Kft.")}<br>${E(b.a||"Ipari u. 9., 4600 Kisvárda, Magyarország")}<br>${E(b.id||"")}${b.vat?" · Adószám / EU VAT "+E(b.vat):" · Adószám: ………………"}`;
const fileName=(d,k)=>`${k} Master Good ${d.kind==="zmluva"?String(((d.data||{}).sc||{}).no||d.id).replace(/[\\/:*?"<>|_]+/g," "):d.ref}`;
function docZmluva(d){const dt=d.data||{},s=dt.sc||{},c=dt.cfg||{},vc=f(dt.vc,1),ekm=f(dt.ekm||c.ekm||1.6,2),tolw=f(dt.tolw??c.tol_w??0.3,1);
  const R=[["Predávajúci <span class=hu>Eladó</span>",FIRMA.ernte],["Kupujúci <span class=hu>Vevő</span>",buyerBlock(buyerOf(d))],
   ["Tovar <span class=hu>Áru</span>",`${E(cN(s.com))} <span class=hu>${E(cH(s.com))}</span>${cKN(s.com)?" · KN "+cKN(s.com):""} · voľne ložený <span class=hu>ömlesztett</span>`],
   ["Množstvo <span class=hu>Mennyiség</span>",`${f(s.tons,2)} t`],
   ["Cena tovaru <span class=hu>Áru ára</span>",`<b>${f(s.price,2)} € / t</b> bez DPH · FCA Agro-Somotor s.r.o., Somotor – naložené na vozidlo <span class=hu>járműre rakva</span>`],
   ["Doprava <span class=hu>Fuvar</span>",`CPT Kisvárda (Master Good Kft.) – zabezpečí VALKO s.r.o. Účtuje sa podľa skutočných km z GPS: km × ${ekm} € ÷ netto t. <span class=hu>A tényleges GPS-km alapján: km × ${ekm} € ÷ nettó t.</span>`],
   ["Termín dodania <span class=hu>Szállítási határidő</span>",E(s.term||"podľa dohody / megállapodás szerint")],
   ["Kvalita <span class=hu>Minőség</span>",`vlhkosť max. ${vc} %, zdravé, bez živých škodcov a cudzích pachov <span class=hu>nedvesség max. ${vc} %, egészséges, élő kártevőktől és idegen szagtól mentes</span>`],
   ["Váha <span class=hu>Súly</span>",`rozhoduje prevzatá netto váha Master Good; rozdiel voči váhe pri nakládke nad ${tolw} % sa rieši reklamáciou <span class=hu>a Master Good átvételi nettó súlya irányadó; a berakodási súlytól ${tolw} %-ot meghaladó eltérés reklamáció tárgya</span>`],
   ["Zrážky <span class=hu>Levonások</span>",`iba fyzický úbytok vody z týždenného váženého priemeru vlhkosti: zrážka (kg) = M × (V̄ − ${vc}) / (100 − ${vc}); iné zrážky sa neuplatňujú <span class=hu>csak a fizikai vízveszteség a heti súlyozott átlagos nedvesség alapján: levonás (kg) = M × (V̄ − ${vc}) / (100 − ${vc}); egyéb levonás nincs</span>`],
   ["Fakturácia <span class=hu>Számlázás</span>",`týždenne za dodávky kalendárneho týždňa: fakturačná váha × cena tovaru + doprava podľa GPS <span class=hu>hetente, a naptári hét szállításairól: számlázott súly × ár + GPS szerinti fuvardíj</span>`],
   ["DPH <span class=hu>ÁFA</span>",`dodanie tovaru do iného členského štátu – oslobodené od DPH podľa § 43 ods. 1 zákona č. 222/2004 Z. z. <span class=hu>Közösségen belüli adómentes termékértékesítés</span>`],
   ["Platba <span class=hu>Fizetés</span>",c.splat?`${f(c.splat)} dní od vystavenia faktúry <span class=hu>a számla kiállításától számított ${f(c.splat)} nap</span>`:`podľa faktúry <span class=hu>a számla szerint</span>`],
   ["Rozhodné právo <span class=hu>Irányadó jog</span>",`právo Slovenskej republiky; pri rozpore jazykových znení platí slovenské znenie <span class=hu>a Szlovák Köztársaság joga; eltérés esetén a szlovák nyelvű szöveg az irányadó</span>`]];
  docOpen(fileName(d,"Zmluva"),`${wmark(d)}<table class="pt">${R.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join("")}</table>
   <div class="sig"><div>Za predávajúceho <span class=hu>Az eladó részéről</span><br><br>……………………………<br>ERNTE spol. s r.o.</div><div>Za kupujúceho <span class=hu>A vevő részéről</span><br><br>……………………………<br>${E(buyerOf(d).n||"MASTER GOOD Kft.")}</div></div>${okLine(d)}`,
   "ernte",`Kúpna zmluva <span class=hu>Adásvételi szerződés</span>`,`č. ${E(s.no||"")} · ${E(dSK(d.created_at))}`)}
function shipsTable(L,cols){return `<table><thead><tr><th>Dátum <span class=hu>Dátum</span></th><th>ŠPZ · CMR</th><th class=r>Naložené t <span class=hu>Berakva</span></th><th class=r>Prevzaté t <span class=hu>Átvéve</span></th>${cols.v?`<th class=r>Vlhkosť % <span class=hu>Nedv.</span></th><th class=r>Zrážka MG kg <span class=hu>Levonás</span></th>`:""}${cols.km?`<th class=r>km GPS</th><th class=r>€</th><th class=r>€/t</th>`:""}</tr></thead><tbody>
  ${L.map(s=>`<tr><td>${E(dSK(s.d))}</td><td>${E(s.spz||"")}${s.cmr?" · "+E(s.cmr):""}</td><td class=r>${f(s.t_load,3)}</td><td class=r>${f(s.t_mg,3)}</td>${cols.v?`<td class=r>${s.moist!=null?f(s.moist,1):"–"}</td><td class=r>${s.ded_kg!=null?f(s.ded_kg,0):"–"}</td>`:""}${cols.km?`<td class=r>${s.km!=null?f(s.km,0)+(s.km_src==="rucne"?"*":""):"–"}</td><td class=r>${s.eur!=null?f(s.eur,2):"–"}</td><td class=r>${s.eur_t!=null?f(s.eur_t,2):"–"}</td>`:""}</tr>`).join("")}</tbody></table>`}
function docFaktura(d){const dt=d.data||{},c=dt.cfg||{},L=dt.lines||[],fr=dt.frt||{},ekm=dt.ekm||c.ekm||1.6,r=wkRange(d.ref);
  const lastD=(dt.ships||[]).map(x=>x.d).filter(Boolean).sort().pop()||"",iss=d.ok_at||new Date().toISOString(),due=c.splat?new Date(new Date(iss).getTime()+c.splat*864e5):null;
  const rows=L.map(l=>`<tr><td>${E(cN(l.com))} <span class=hu>${E(cH(l.com))}</span> – FCA Agro-Somotor${l.sc_no?" · zmluva "+E(l.sc_no):""}<br><small>prevzaté ${f(l.t,3)} t − fyzický úbytok vody ${f(l.loss_kg,0)} kg (týždenný vážený priemer vlhkosti ${l.vw!=null?f(l.vw,2)+" %":"–"}, norma ${f(l.vc,1)} %) <span class=hu>átvett súly − fizikai vízveszteség</span></small></td><td class=r>${f(l.qty,3)} t</td><td class=r>${f(l.p,2)}</td><td class=r>${f(l.eur,2)}</td></tr>`).join("")
   +(+fr.eur?`<tr><td>Doprava CPT Kisvárda – VALKO s.r.o. <span class=hu>Fuvar</span><br><small>GPS ${f(fr.km,0)} km × ${f(ekm,2)} € ÷ ${f(fr.t,3)} t = ${f(fr.eur_t,2)} €/t${+fr.bez_km?` · ${fr.bez_km} dodávok bez km`:""}</small></td><td class=r>${f(fr.t,3)} t</td><td class=r>${f(fr.eur_t,2)}</td><td class=r>${f(fr.eur,2)}</td></tr>`:"");
  docOpen(fileName(d,"Faktúra"),`${wmark(d)}<table class="pt"><tr><th>Dodávateľ <span class=hu>Szállító</span></th><td>${FIRMA.ernte}${c.iban?`<br>IBAN ${E(c.iban)}`:"<br>IBAN: ………………"}</td></tr><tr><th>Odberateľ <span class=hu>Vevő</span></th><td>${buyerBlock(buyerOf(d))}</td></tr>
   <tr><th>Dátum vystavenia <span class=hu>Kiállítás</span></th><td>${E(dSK(iss))}</td></tr><tr><th>Dátum dodania <span class=hu>Teljesítés</span></th><td>${E(dSK(lastD)||(r?r[1].toLocaleDateString("sk-SK",{timeZone:"UTC"}):""))} (${E(wkTxt(d.ref))})</td></tr>
   <tr><th>Splatnosť <span class=hu>Fizetési határidő</span></th><td>${due?E(due.toLocaleDateString("sk-SK")):"podľa zmluvy / a szerződés szerint"}</td></tr></table>
   <table><thead><tr><th>Položka <span class=hu>Tétel</span></th><th class=r>Množstvo <span class=hu>Menny.</span></th><th class=r>€ / t</th><th class=r>Spolu € <span class=hu>Összesen</span></th></tr></thead><tbody>${rows}
   <tr class="tot"><td colspan=3>Spolu bez DPH <span class=hu>Összesen ÁFA nélkül</span></td><td class=r>${f(dt.total,2)}</td></tr><tr><td colspan=3>DPH 0 % – oslobodené, § 43 ods. 1 zákona č. 222/2004 Z. z., dodanie tovaru do iného členského štátu <span class=hu>Közösségen belüli adómentes termékértékesítés</span></td><td class=r>0,00</td></tr>
   <tr class="tot"><td colspan=3>Na úhradu € <span class=hu>Fizetendő €</span></td><td class=r>${f(dt.total,2)}</td></tr></tbody></table>
   <h2>Príloha – dodávky <span class=hu>Melléklet – szállítások</span></h2>${shipsTable(dt.ships||[],{v:1,km:1})}<small>* km zadané ručne (nie z GPS)</small>${okLine(d)}`,
   "ernte",`Faktúra <span class=hu>Számla</span>`,`č. ${E(d.no||"pridelí sa po schválení")} · ${E(wkTxt(d.ref))}`)}
function docDoprava(d){const dt=d.data||{},t=dt.tot||{},ekm=dt.ekm||1.6;
  docOpen(fileName(d,"Vyúčtovanie dopravy"),`${wmark(d)}<table class="pt"><tr><th>Dopravca <span class=hu>Fuvarozó</span></th><td>${FIRMA.valko}</td></tr><tr><th>Objednávateľ <span class=hu>Megrendelő</span></th><td>${FIRMA.ernte}</td></tr>
   <tr><th>Príjemca tovaru <span class=hu>Címzett</span></th><td>${buyerBlock(buyerOf(d))}</td></tr><tr><th>Trasa <span class=hu>Útvonal</span></th><td>Agro-Somotor s.r.o., Somotor (SK) → Master Good Kft., Kisvárda (HU) · CPT</td></tr>
   <tr><th>Sadzba <span class=hu>Díj</span></th><td>${f(ekm,2)} € / km · km zo systému GPS (skutočné jazdy tam aj späť) <span class=hu>GPS szerinti tényleges km (oda-vissza)</span></td></tr></table>
   ${shipsTable(dt.ships||[],{km:1})}<table><tbody><tr class="tot"><td>Spolu <span class=hu>Összesen</span>: ${f(t.n)} jázd · ${f(t.km,0)} km · ${f(t.t,3)} t</td><td class=r>${f(t.eur,2)} €</td><td class=r>${t.eur_t!=null?f(t.eur_t,2)+" €/t":""}</td></tr></tbody></table>
   <small>Doprava na tonu = km × ${f(ekm,2)} € ÷ netto t (prevzatá váha, inak naložená). * km zadané ručne.${+t.bez_km?` ${t.bez_km} dodávok bez km nie je v súčte.`:""}</small>${okLine(d)}`,
   "valko",`Vyúčtovanie dopravy <span class=hu>Fuvarelszámolás</span>`,`CPT Kisvárda · ${E(wkTxt(d.ref))}`)}
function claimTxt(g,cl,tolw){const kg=f(cl.kg,0),eur=cl.eur!=null?f(cl.eur,2)+" €":"",p=g.p!=null?f(g.p,2):"";
  if(cl.typ==="vlhkost")return [`Reklamácia – zrážka za vlhkosť (${cN(g.com)}): Master Good uplatnil ${f(g.ded_kg,0)} kg, fyzický úbytok vody pri týždennom váženom priemere vlhkosti ${f(g.vw,2)} % (norma ${f(g.vc,1)} %) je ${f(g.loss_kg,0)} kg. Rozdiel ${kg} kg${eur?` × ${p} €/t = ${eur}`:""} žiadame vrátiť dobropisom.`,
    `Reklamáció – nedvesség miatti levonás (${cH(g.com)}): a Master Good ${f(g.ded_kg,0)} kg-ot vont le, a heti súlyozott átlagos nedvesség (${f(g.vw,2)} %, szabvány ${f(g.vc,1)} %) melletti fizikai vízveszteség ${f(g.loss_kg,0)} kg. A ${kg} kg különbözet${eur?` (× ${p} €/t = ${eur})`:""} jóváírását kérjük.`];
  return [`Reklamácia – hmotnosť (${cN(g.com)}): naložené v Agro-Somotor ${f(g.tl,3)} t, prevzaté v Master Good ${f(g.tm,3)} t; rozdiel ${f(g.manko_kg,0)} kg (${f(g.manko_pct,2)} %) presahuje toleranciu ${f(tolw,1)} % o ${kg} kg${eur?` (${eur})`:""}. Žiadame preverenie váženia a dobropis.`,
    `Reklamáció – súly (${cH(g.com)}): berakva ${f(g.tl,3)} t, átvéve ${f(g.tm,3)} t; a ${f(g.manko_kg,0)} kg (${f(g.manko_pct,2)} %) eltérés ${kg} kg-mal meghaladja a ${f(tolw,1)} % tűréshatárt${eur?` (${eur})`:""}. Kérjük a mérés ellenőrzését és a jóváírást.`]}
function docAudit(d){const dt=d.data||{},G=dt.g||[],tolw=dt.tolw??0.3;
  const body=G.map(g=>`<h2>${E(cN(g.com))} <span class=hu>${E(cH(g.com))}</span> · ${f(g.n)} dodávok · ${f(g.t,3)} t</h2>${shipsTable((dt.ships||[]).filter(s=>s.com===g.com),{v:1})}
   <table class="pt"><tr><th>Vážený priemer vlhkosti <span class=hu>Súlyozott átlagos nedvesség</span></th><td>${g.vw!=null?f(g.vw,2)+" %":"– (chýba vlhkosť)"}${+g.bez_v?` · ${g.bez_v} dodávok bez vlhkosti`:""}</td></tr>
   <tr><th>Norma vlhkosti <span class=hu>Nedvességi szabvány</span></th><td>${f(g.vc,1)} %</td></tr>
   <tr><th>Fyzický úbytok vody <span class=hu>Fizikai vízveszteség</span></th><td><b>${g.loss_kg!=null?f(g.loss_kg,0)+" kg":"–"}</b><br><small>${f(g.tv,3)} t × (${g.vw!=null?f(g.vw,2):"V̄"} − ${f(g.vc,1)}) / (100 − ${f(g.vc,1)})</small></td></tr>
   <tr><th>Zrážka Master Good <span class=hu>Master Good levonás</span></th><td>${+g.ndk?f(g.ded_kg,0)+" kg":"nezadaná"}${g.diff_kg!=null?` · rozdiel <b>${g.diff_kg>0?"+":""}${f(g.diff_kg,0)} kg</b>`:""}</td></tr>
   <tr><th>Naložené / prevzaté <span class=hu>Berakva / átvéve</span></th><td>${g.tl!=null?`${f(g.tl,3)} t / ${f(g.tm,3)} t · rozdiel ${f(g.manko_kg,0)} kg (${f(g.manko_pct,2)} %), tolerancia ${f(tolw,1)} %`:"– (chýba jedna z váh)"}</td></tr></table>
   ${(g.claims||[]).length?(g.claims||[]).map(cl=>{const t=claimTxt(g,cl,tolw);return `<div class="cl"><b>Návrh reklamácie <span class=hu>Reklamáció tervezet</span></b><p>${E(t[0])}</p><p class=hu>${E(t[1])}</p></div>`}).join(""):`<div class="ok">✅ Bez odchýlok – zrážka zodpovedá fyzickému úbytku vody a váha je v tolerancii. <span class=hu>Nincs eltérés.</span></div>`}`).join("");
  docOpen(fileName(d,"Audit vlhkosti"),`${wmark(d)}<table class="pt"><tr><th>Predávajúci <span class=hu>Eladó</span></th><td>${FIRMA.ernte}</td></tr><tr><th>Kupujúci <span class=hu>Vevő</span></th><td>${buyerBlock(buyerOf(d))}</td></tr>
   <tr><th>Pravidlo <span class=hu>Szabály</span></th><td>Zrážka sa uznáva iba vo výške fyzického úbytku vody: M × (V̄ − Vc) / (100 − Vc), V̄ = vážený priemer vlhkosti všetkých dodávok kalendárneho týždňa. <span class=hu>Csak a fizikai vízveszteség fogadható el; V̄ = a naptári hét összes szállításának súlyozott átlagos nedvessége.</span></td></tr></table>${body}${okLine(d)}`,
   "ernte",`Týždenný audit vlhkosti a váhy <span class=hu>Heti nedvesség- és súlyellenőrzés</span>`,E(wkTxt(d.ref)))}
function openDoc(d,send){const K=KIND[d.kind]||["📄","Doklad","Dokumentum"],c=(S.D&&S.D.cfg)||{};
  if(send){window.__pvMail={to:c.email||"",subj:`${K[1]} / ${K[2]} – ${d.no||d.title}`,prof:d.kind==="doprava"?"valko":"ernte",cc:[],
    body:`Dobrý deň,\n\nv prílohe posielame: ${K[1]} – ${d.title}.\n\nJó napot kívánunk!\nMellékelten küldjük: ${K[2]} – ${d.title}.\n\nS pozdravom / Üdvözlettel\nMartin Vaľko\n${d.kind==="doprava"?"VALKO s.r.o.":"ERNTE spol. s r.o."}`}}
  else window.__pvMail=null;
  try{({zmluva:docZmluva,faktura:docFaktura,doprava:docDoprava,audit:docAudit}[d.kind]||docAudit)(d)}finally{window.__pvMail=null}
  if(send&&c.email){try{navigator.clipboard&&navigator.clipboard.writeText(c.email)}catch(x){}}}

// ---------- ovládanie ----------
const docById=id=>((S.D&&S.D.docs)||[]).find(x=>String(x.id)===String(id));
const repaint=()=>{const c=document.getElementById("mzgCard");if(c)c.__h=null;const g=document.getElementById("mzgGate");if(g)g.__h=null;paint()};
async function gps(fm){const d=fm.elements.d.value,spz=fm.elements.spz.value.trim();keepForm(fm);if(!d||!spz){say("Najprv dátum a ŠPZ.");return}
  S.ridesBusy=true;S.rides=null;repaintForm();
  try{const r=await sb.rpc("mg_rides",{p_d:d,p_spz:spz});S.rides=r.error?[]:(Array.isArray(r.data)?r.data:[]);if(r.error)say("GPS: "+r.error.message)}catch(x){S.rides=[]}
  S.ridesBusy=false;const sug=S.rides.filter(x=>x.sug);if(sug.length){S.F.rides=sug.map(x=>x.id);S.F.km=Math.round(sug.reduce((a,x)=>a+(+x.km||0),0));S.F.km_src="gps"}repaintForm()}
function keepForm(fm){if(!fm||!S.F)return;for(const el of fm.elements){if(el.name&&!/^g_/.test(el.name))S.F[el.name]=el.value}}
function repaintForm(){const c=document.getElementById("mzgCard");if(!c)return paint();const fm=c.querySelector("#fMzg");if(!fm)return repaint();const d=document.createElement("div");d.innerHTML=formHTML();fm.replaceWith(d.firstElementChild)}
async function save(fm){keepForm(fm);const F=S.F,km=num(F.km);
  const row={d:F.d||null,com:F.com||"kukurica",spz:(F.spz||"").trim()||null,vodic:(F.vodic||"").trim()||null,cmr:(F.cmr||"").trim()||null,t_load:num(F.t_load),t_mg:num(F.t_mg),
    moist:num(F.moist),impur:num(F.impur),ded_kg:num(F.ded_kg),km,km_src:km==null?null:(F.km_src==="gps"?"gps":"rucne"),rides:km!=null&&F.km_src==="gps"&&F.rides&&F.rides.length?F.rides:null,
    sc_id:F.sc_id||null,price:num(F.price),note:(F.note||"").trim()||null};
  if(!row.d||(row.t_load==null&&row.t_mg==null)){say("Doplň dátum a tony (naložené alebo prevzaté).");return}
  for(const [k,mx] of [["t_load",60],["t_mg",60],["moist",50],["impur",50]])if(row[k]!=null&&(row[k]<0||row[k]>=mx)){say("Skontroluj hodnotu: "+k);return}
  const b=document.querySelector("#mzgCard [data-mzgsave]");if(b)b.disabled=true;
  try{const r=F.id?await sb.from("mg_ship").update(row).eq("id",F.id):await sb.from("mg_ship").insert(row);
    if(r.error){say("Neuložené: "+r.error.message,8000);return}say(F.id?"Dodávka upravená.":"Dodávka uložená.");S.F=null;S.rides=null;await load(true)}
  finally{if(b)b.disabled=false}}
document.addEventListener("click",async ev=>{const t=ev.target.closest&&ev.target.closest("[data-mzgnew],[data-mzgre],[data-mzgx],[data-mzgsave],[data-mzgdel],[data-mzged],[data-mzggps],[data-mzgmk],[data-mzgview],[data-mzgok],[data-mzgno],[data-mzgsend],[data-mzgcfg],[data-mzggeo],[data-mzgopen]");
  if(!t||!t.closest("#mzgCard,#mzgGate"))return;ev.preventDefault();const fm=t.closest("form");
  if(t.matches("[data-mzgopen]")){S.open=true;try{localStorage.setItem("ernte-mzg-open","1")}catch(x){}goDeals();return}
  if(t.matches("[data-mzgnew]")){S.F={d:new Date().toISOString().slice(0,10),com:"kukurica"};const sc=(S.D.sc||[])[0];if(sc){S.F.sc_id=sc.id;S.F.com=sc.com||"kukurica"}S.rides=null;repaint();return}
  if(t.matches("[data-mzgx]")){S.F=null;S.rides=null;repaint();return}
  if(t.matches("[data-mzgre]")){load(true);return}
  if(t.matches("[data-mzged]")){const s=(S.D.ship||[]).find(x=>String(x.id)===t.dataset.mzged);if(!s)return;S.F=Object.assign({},s,{t_load:s.t_load??"",t_mg:s.t_mg??"",moist:s.moist??"",impur:s.impur??"",ded_kg:s.ded_kg??"",km:s.km??"",price:s.price??""});S.rides=null;repaint();
    const fe=document.getElementById("fMzg");if(fe)fe.scrollIntoView({block:"center"});return}
  if(t.matches("[data-mzgsave]")&&fm)return save(fm);
  if(t.matches("[data-mzggps]")&&fm)return gps(fm);
  if(t.matches("[data-mzgdel]")&&S.F&&S.F.id){if(!confirm("Zmazať túto dodávku?"))return;const r=await sb.from("mg_ship").delete().eq("id",S.F.id);if(r.error){say(r.error.message,7000);return}S.F=null;load(true);return}
  if(t.matches("[data-mzgmk]")){const w=S.wk||weeks()[1];t.disabled=true;try{const r=await sb.rpc("mg_doc_make",{p_kind:t.dataset.mzgmk,p_ref:w});if(r.error){say(r.error.message,8000);return}say("Návrh pripravený – ⏳ čaká na schválenie majiteľom.",6000);await load(true)}finally{t.disabled=false}return}
  if(t.matches("[data-mzgview]")){const d=docById(t.dataset.mzgview);if(d)openDoc(d,false);return}
  if(t.matches("[data-mzgsend]")){const d=docById(t.dataset.mzgsend);if(d)openDoc(d,true);return}
  if(t.matches("[data-mzgok]")){const d=docById(t.dataset.mzgok);if(!d||!MAIN())return;t.disabled=true;
    try{const r=await sb.rpc("mg_doc_approve",{p_id:d.id,p_ok:true});if(r.error){say("Neschválené: "+r.error.message,10000);t.disabled=false;return}
      const nd=Object.assign({},d,r.data||{},{data:d.data,stav:"schvalene"});say("✅ Schválené a zapísané. Ťukni 📧 Odoslať – vyber Gmail / Outlook (adresa Master Good je skopírovaná).",9000);openDoc(nd,true);load(true)}
    catch(x){say("Neschválené: "+(x&&x.message||x),8000);t.disabled=false}return}
  if(t.matches("[data-mzgno]")){const d=docById(t.dataset.mzgno);if(!d||!MAIN())return;const why=prompt("Prečo zamietaš? (neodíde Master Good, iba záznam)","");if(why===null)return;
    const r=await sb.rpc("mg_doc_approve",{p_id:d.id,p_ok:false,p_why:why});if(r.error){say(r.error.message,7000);return}say("Zamietnuté.");load(true);return}
  if(t.matches("[data-mzgcfg]")&&fm){const g=n=>fm.elements[n]?fm.elements[n].value.trim():"",p={email:g("email"),vat:g("vat"),iban:g("iban")};
    for(const k of ["prem","r_km","ekm","tol_w","tol_ded","splat"]){const v=num(g(k));if(v!=null)p[k]=v}
    const r=await sb.rpc("mg_cfg_set",{p});if(r.error){say("Neuložené: "+r.error.message,7000);return}say("Nastavenie uložené.");load(true);return}
  if(t.matches("[data-mzggeo]")&&fm){const k=fm.elements.g_k.value.trim(),v=fm.elements.g_v.value.split(/[,;\s]+/).filter(Boolean);
    if(!k||v.length<2){say("Zadaj názov a polohu: šírka, dĺžka, krajina (napr. 48.32, 21.57, HU).");return}
    const key=k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const r=await sb.rpc("mg_cfg_set",{p:{geo_add:{[key]:[num(v[0]),num(v[1]),(v[2]||"SK").toUpperCase()]}}});if(r.error){say(r.error.message,7000);return}say("Miesto pridané – benchmark sa prepočíta.");load(true);return}
},true);
document.addEventListener("change",ev=>{const t=ev.target;if(!t||!t.closest)return;
  if(t.matches("[data-mzgwk]")){S.wk=t.value;return}
  if(t.matches("[data-mzgride]")){const fm=t.closest("form");keepForm(fm);const ch=[...fm.querySelectorAll("[data-mzgride]")].filter(x=>x.checked);
    S.F.rides=ch.map(x=>x.dataset.mzgride);S.F.km=ch.length?Math.round(ch.reduce((a,x)=>a+(+x.dataset.km||0),0)):"";S.F.km_src=ch.length?"gps":"";repaintForm();return}});
document.addEventListener("input",ev=>{const t=ev.target;if(t&&t.matches&&t.matches("[data-mzgkm]")&&S.F){S.F.km_src="rucne";S.F.rides=null}});
document.addEventListener("toggle",ev=>{const t=ev.target;if(!t||t.id!=="mzgCard")return;S.open=t.open;try{localStorage.setItem("ernte-mzg-open",t.open?"1":"0")}catch(x){}if(t.open)load(false)},true);

// ---------- odkaz z upozornenia: …/farmar/#mastergood ----------
function goDeals(){let n=0;const go=()=>{if(!OWN()){if(n++<60)setTimeout(go,500);return}
  if(typeof TAB!=="undefined"&&TAB!=="deals"){const b=document.querySelector('nav.tabs [data-tab="deals"]');if(b)b.click();else if(n++<60){setTimeout(go,500);return}}
  S.open=true;load(true);(window.ernteSoon||requestAnimationFrame)(()=>setTimeout(()=>{const c=document.getElementById("mzgCard");if(c){c.open=true;c.scrollIntoView({block:"start"})}},350))};go()}
function hash(){if(/^#mastergood$/i.test(location.hash)){S.open=true;try{localStorage.setItem("ernte-mzg-open","1")}catch(x){}goDeals()}}
window.addEventListener("hashchange",hash);hash();

function wrap(){const o=window.renderStaff;if(typeof o!=="function"||o.__mzg)return;const w=function(){const r=o.apply(this,arguments);(window.ernteSoon||requestAnimationFrame)(()=>{try{inject()}catch(x){}});return r};
  Object.keys(o).forEach(k=>{if(!(k in w))try{w[k]=o[k]}catch(x){}});w.__mzg=1;window.renderStaff=w}
const tk=setInterval(wrap,500);setTimeout(()=>clearInterval(tk),60000);wrap();
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&OWN()&&typeof TAB!=="undefined"&&(TAB==="deals"||TAB==="home"))load(false)});

const st=document.createElement("style");st.textContent=`.mzg>summary{cursor:pointer;display:flex;flex-direction:column;gap:2px;list-style:none}.mzg>summary::-webkit-details-marker{display:none}.mzg>summary small{color:#94A3B8;font-size:.8rem}
.mzg-in{margin-top:8px}.mzg-h{margin:14px 0 6px;font-size:1rem}.mzg-sub{margin:10px 0 4px;font-weight:700;color:#ffcf5a}
.mzg-b{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.mzg-b button{min-height:44px;max-width:100%;white-space:normal}.mzg-go{font-weight:800}
.mzg-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:6px 0}.mzg-t{border:1px solid rgba(34,211,238,.4);border-radius:14px;padding:8px 10px;min-width:0;text-align:center}.mzg-t b{display:block;font-size:1.15rem;color:#5eead4}.mzg-t small{display:block;color:#94A3B8;font-size:.74rem;overflow-wrap:anywhere}
.mzg{min-width:0;max-width:100%;box-sizing:border-box}.mzg-in,.mzg-d,.mzg-doc,.mzg-row,.mzg-gen{min-width:0;max-width:100%}
.mzg-d{margin:6px 0}.mzg-d>summary{cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center}.mzg-tw{display:block;width:100%;max-width:100%;overflow-x:auto;contain:inline-size}
.mzg-tb{width:100%;border-collapse:collapse;font-size:.84rem}.mzg-tb th,.mzg-tb td{padding:6px;border-bottom:1px solid rgba(148,163,184,.2);text-align:left;vertical-align:top}.mzg-tb td{overflow-wrap:anywhere}.mzg-tb td small{display:block;color:#94A3B8;font-size:.72rem}.mzg-tb tr.mzg-out{opacity:.55}
.mzg-li{padding:8px 0;border-bottom:1px solid rgba(148,163,184,.15);min-width:0}.mzg-li small{display:block;color:#94A3B8;font-size:.78rem;overflow-wrap:anywhere;margin-top:2px}.mzg-li.mzg-out{opacity:.55}.mzg-l1{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}.mzg-l1>b:first-child{min-width:0;overflow-wrap:anywhere}.mzg-v{color:#5eead4;white-space:nowrap;flex:none}
.mzg-row{padding:8px 0;border-bottom:1px solid rgba(148,163,184,.15)}.mzg-row small{display:block;color:#94A3B8}
.mzg-doc{border:1px solid rgba(148,163,184,.25);border-radius:14px;padding:10px;margin:8px 0}.mzg-doc.mzg-pend{border-color:#ffcf5a;box-shadow:0 0 0 1px rgba(255,207,90,.25) inset}
.mzg-dh{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;align-items:center}.mzg-dh b{overflow-wrap:anywhere;min-width:0}.mzg-i{display:block;color:#94A3B8;margin-top:4px;overflow-wrap:anywhere}
.mzg-st{font-size:.74rem;font-weight:800;border-radius:999px;padding:3px 8px;border:1px solid}.mzg-st.mzg-sw{color:#ffcf5a;border-color:#ffcf5a}.mzg-st.mzg-sok{color:#5eead4;border-color:#5eead4}.mzg-st.mzg-sno{color:#ff6b81;border-color:#ff6b81}
.mzg-bad{color:#ff6b81;font-weight:700;margin-top:6px}.mzg-warn{color:#ffcf5a;margin:6px 0}
.mzg-f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}.mzg-f .mzg-w{grid-column:1/-1}.mzg-f label{min-width:0;display:flex;flex-direction:column;gap:4px}.mzg-f input,.mzg-f select{min-height:44px;width:100%;box-sizing:border-box}
.mzg-km{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:end}.mzg-km small{grid-column:1/-1;color:#94A3B8}.mzg-km button{min-height:44px}
.mzg-rides{display:flex;flex-direction:column;gap:6px}.mzg-ck{display:flex!important;flex-direction:row!important;gap:8px;align-items:flex-start}.mzg-ck input{width:22px!important;height:22px;min-height:22px!important;flex:none;margin-top:2px}.mzg-ck span{min-width:0;overflow-wrap:anywhere}.mzg-ck small{display:block;color:#94A3B8}
.mzg-gen{display:flex;flex-direction:column;gap:6px;margin:6px 0}.mzg-gen select{min-height:44px;max-width:100%}.mzg-gen small{color:#94A3B8}
.mzg-sm{min-height:40px;min-width:40px;padding:4px 10px}.mzg-del{color:#ff6b81}.mzg-gate{border-color:#ffcf5a!important}
@media(max-width:430px){.mzg-f{grid-template-columns:1fr}.mzg-tb{font-size:.78rem}}`;document.head.appendChild(st);
})();
