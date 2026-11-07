/* 7. 11. 2026 – 🐔 AGRO-SOMOTOR · SKUPINA MASTER GOOD v záložke Obchody (majitelia; benchmark, ceny konkurencie a schvaľovanie IBA Martin).
   Príkaz majiteľa „AGRO-SOMOTOR OUTPUT ENGINE (MASTERGOOD CONTRACTS)“ + „BENCHMARK 200 KM, FREIGHT CONVERSION & OWNER GATE“; 05:59 spresnenie:
   ERNTE je obchodník a dodáva do spracovne Agro-Somotor (Somotor patrí pod skupinu Master Good).
   • 📏 Benchmark 200 km: najnižšia cena DAP Somotor = najvyššia cena INÝCH odberateľov a konkurencie v okruhu 200 km (loco Somotor) + prémia GMP+/ISCC/QS;
     FCA u farmára = − paušál dopravy Agro-Somotora.
   • 📊 Týždne a 🧾 lístky: vážne lístky Agro-Somotora (prichádzajú samé z Gmailu), vlhkosť a zrážka, doprava z GPS jázd (km × €/km ÷ netto t).
   • 🧾 Doklady (SK | HU): zmluva (z predajnej zmluvy), faktúra, vyúčtovanie dopravy (VALKO), týždenný audit vlhkosti s návrhom reklamácie.
     Každý vznikne ako „⏳ ČAKÁ NA SCHVÁLENIE MAJITEĽOM“; Martin ťukne „✅ SCHVÁLIŤ A ODOSLAŤ HOTOVÉ PRE MASTERGOOD“ → záznam zmien,
     PDF a zdieľanie z telefónu (odosielanie e-mailov je vypnuté – adresa sa skopíruje). Pod benchmarkom sa schváliť nedá.
   Databáza: mastergood.sql (mg_list, mg_doc_make, mg_doc_approve, mg_cfg_set; pg_cron mastergood-tyzden, mastergood-benchmark). Prefix tried mzg. */
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
const S={D:null,at:0,busy:false,err:"",open:false,wk:null};
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
const CF=()=>(S.D&&S.D.cfg)||{};
const FRS=()=>num(CF().fr_std)??9.4;
function lowOf(d){return !!(d&&d.data&&d.data.floor_ok===false)}
function docRow(d,compact){const K=KIND[d.kind]||["📄",d.kind,""],dt=d.data||{},low=lowOf(d);
  const st=d.stav==="caka"?`<span class="mzg-st mzg-sw">⏳ ČAKÁ NA SCHVÁLENIE MAJITEĽOM</span>`:d.stav==="schvalene"?`<span class="mzg-st mzg-sok">✅ Schválené ${E(dT(d.ok_at))}${d.no?" · "+E(d.no):""}</span>`:`<span class="mzg-st mzg-sno">✕ Zamietnuté${d.why?" – "+E(d.why):""}</span>`;
  const info=[];if(d.suma!=null)info.push(f(d.suma,2)+" €"+(d.kind==="audit"?" na reklamáciu":" bez DPH"));info.push((d.created_by==="systém"?"pripravené automaticky ":"pripravené ")+dT(d.created_at));
  if(d.kind==="audit")info.push(+dt.claims?`⚠️ návrh reklamácie vlhkosti`:"✅ bez odchýlok");
  if(d.kind==="faktura"&&+dt.miss)info.push(`${dt.miss} lístkov bez ceny nie je vo faktúre`);
  if(d.kind==="faktura"&&dt.odb!=null&&dt.goods!=null&&MAIN())info.push(`Agro-Somotor zúčtoval ${f(dt.odb,2)} €, podľa zmluvy tovar ${f(dt.goods,2)} €`);
  return `<div class="mzg-doc${d.stav==="caka"?" mzg-pend":""}"><div class="mzg-dh"><b>${K[0]} ${E(d.title)}</b>${st}</div><small class="mzg-i">${E(info.join(" · "))}</small>
   ${low?`<div class="mzg-bad">⛔ Cena ${f(d.price,2)} €/t (DAP Somotor) je pod benchmarkom${d.floor!=null?" "+f(d.floor,2)+" €/t":""} – schváliť sa nedá. ${d.kind==="zmluva"?"Uprav cenu v predajnej zmluve (💼 Predaj).":"Agro-Somotor platí menej, ako dáva trh v okolí."}</div>`:""}
   ${(d.kind==="zmluva"||d.kind==="faktura")&&dt.floor_ok==null&&d.stav==="caka"&&MAIN()?`<div class="mzg-warn">⚠️ ${d.kind==="faktura"?"Pre dni dodávok nie je uložený benchmark (ukladá sa od 7. 11.)":"Benchmark chýba (žiadna cena v okruhu 200 km za posledné 3 týždne)"} – cenu over sám.</div>`:""}
   <div class="mzg-b"><button type="button" data-mzgview="${d.id}">👁 Náhľad</button>${d.stav==="caka"&&MAIN()?`<button type="button" class="pri mzg-go" data-mzgok="${d.id}"${low?" disabled":""}>✅ SCHVÁLIŤ A ODOSLAŤ HOTOVÉ PRE MASTERGOOD</button>${compact?"":`<button type="button" data-mzgno="${d.id}">✕ Zamietnuť</button>`}`:""}${d.stav==="schvalene"?`<button type="button" data-mzgsend="${d.id}">📤 Poslať Agro-Somotor</button>`:""}</div></div>`}
function benchHTML(){const B=S.D.bench||{},C=B.com||{},ks=Object.keys(C);
  const head=`<h3 class="mzg-h">📏 Benchmark ${f(B.r_km||200)} km od Somotora</h3><div class="s">Najnižšia cena, za ktorú dodávame do Agro-Somotora: najvyššia cena <b>iných</b> odberateľov a konkurencie v okruhu ${f(B.r_km||200)} km (DAP / DDP po odrátaní našej dopravy zo Somotora; skupina Master Good sa nepočíta) + prémia GMP+ / ISCC / QS ${f(B.prem,2)} €/t = cena DAP Somotor. FCA u farmára = o paušál dopravy ${f(B.fr_std??FRS(),2)} €/t menej. Pod ňou zmluvu ani faktúru schváliť nejde.</div>`;
  if(!ks.length)return head+`<div class="s">Za posledné 3 týždne nie je v okruhu žiadna iná cena – benchmark sa nedá určiť.</div>`;
  return head+`<div class="mzg-tiles">${ks.map(k=>{const c=C[k],b=c.best||{};return `<div class="mzg-t"><small>${E(cN(k))} · najmenej</small><b>${c.floor!=null?f(c.floor,2)+" €/t":"–"}</b><small>DAP Somotor${c.floor_fca!=null?` · FCA farmár ${f(c.floor_fca,2)}`:""}</small><small>${b.who?`${E(b.who)} · ${E(b.site||"u farmára")} ${E(b.del||"")} ${f(b.pnow,2)} € → loco ${f(b.fca,2)} €`:"bez ceny v okruhu"}</small></div>`}).join("")}</div>
   ${ks.map(k=>`<details class="mzg-d"><summary>${E(cN(k))} – odkiaľ je benchmark · ${C[k].n||0} cien v okruhu</summary>${(C[k].rows||[]).map(r=>`<div class="mzg-li${r.inr?"":" mzg-out"}"><div class="mzg-l1"><b>${E(r.who)}</b><b class="mzg-v">${r.fca==null?"–":"loco "+f(r.fca,2)+" €"}</b></div><small>${r.src==="konkurencia"?"konkurencia":"odberateľ"} · ${E(r.site||"u farmára")} ${E(r.del||"")}${r.per?" · "+E(r.per):""} · ${f(r.pnow,2)} €/t${r.fl&&+r.pnow!==+r.price?` (ponuka ${f(r.price,2)}, posun s burzou)`:""}${r.rkm!=null&&+r.rkm>0?` · ${f(r.rkm)} km, doprava ${f(r.dop,2)} €/t`:""} · ${E(dSK(r.d))}${r.why?" · ⚠️ "+E(r.why):""}</small></div>`).join("")}</details>`).join("")}`}
function scHTML(){const L=S.D.sc||[],C=((S.D.bench||{}).com)||{},frs=FRS();
  const hint=`<small class="mzg-i">Novú pridaj v 💼 Predaj → ➕ Nová predajná zmluva, odberateľ Agro-Somotor: <b>FCA</b> = cena u farmára (Agro-Somotor platí dopravu), <b>DAP</b> = dovezené do Somotora. Návrh zmluvy na schválenie sa pripraví sám.</small>`;
  return `<h3 class="mzg-h">📄 Predajné zmluvy Agro-Somotor</h3>${L.length?L.map(s=>{const fl=C[s.com]&&C[s.com].floor,pf=s.price==null?null:+s.price+(s.parity==="DAP"?0:frs),low=MAIN()&&fl!=null&&pf!=null&&pf<+fl;
    return `<div class="mzg-row"><b>${E(s.no||"bez čísla")} · ${E(cN(s.com))} · ${f(s.tons,0)} t · ${s.price!=null?f(s.price,2)+" €/t "+E(s.parity||""):"bez ceny"}</b><small>${s.parity==="DAP"?"dovezené do Somotora":`u farmára, + doprava ${f(frs,2)} €/t = DAP ${f(pf,2)} €/t`}${s.term?" · "+E(s.term):""}${s.delivered_t!=null?" · dodané "+f(s.delivered_t,1)+" t":""}</small>${low?`<div class="mzg-bad">⛔ ${f(pf,2)} €/t DAP je pod dnešným benchmarkom ${f(fl,2)} €/t</div>`:""}</div>`}).join("")+hint
    :`<div class="s">V aplikácii zatiaľ nie je žiadna predajná zmluva s Agro-Somotorom.</div>${hint}`}`}
function weeksHTML(){const W=S.D.weeks||[];if(!W.length)return `<h3 class="mzg-h">📊 Týždne – vlhkosť, zrážky, doprava</h3><div class="s">Za posledných 6 týždňov nie sú lístky Agro-Somotora.</div>`;
  const met=CF().metoda==="listky"?"po lístkoch":"týždenný vážený priemer";
  return `<h3 class="mzg-h">📊 Týždne – vlhkosť, zrážky, doprava</h3><div class="s">Zrážka Agro-Somotora vs. fyzický úbytok vody (${E(met)}). Doprava z jázd GPS pri lístkoch: km × ${f(CF().ekm??1.6,2)} € ÷ netto t, porovnanie s paušálom ${f(FRS(),2)} €/t.</div>
   ${W.map(w=>{const G=w.g||[],T=w.tot||null;return `<div class="mzg-li"><div class="mzg-l1"><b>${E(wkTxt(w.w))}</b>${T?`<b class="mzg-v">🚛 ${f(T.eur_t,2)} €/t</b>`:""}</div>${G.map(g=>{const cl=(g.claims||[]).length;return `<small>${E(cN(g.com))}: ${f(g.n)} lístkov · ${f(g.t,1)} t · vlhkosť ${g.vw!=null?f(g.vw,2)+" %":"–"} (norma ${f(g.vc,0)} %) · zrážka AS ${f(g.ded_kg,0)} kg · fyzicky ${f(g.loss_kg,0)} kg${g.loss_l!==g.loss_w?` (po lístkoch ${f(g.loss_l,0)} kg)`:""}${cl?` · <b class="mzg-badt">⚠️ +${f(g.diff_kg,0)} kg${(g.claims[0]||{}).eur!=null?` ≈ ${f(g.claims[0].eur,0)} €`:""}</b>`:""}</small>`}).join("")}${T?`<small>Doprava VALKO: ${f(T.n)} z ${f(T.vsetky)} lístkov · ${f(T.km,0)} km · ${f(T.eur,0)} € (paušál by bol ${f(T.pausal,0)} €)</small>`:""}</div>`}).join("")}`}
function tixHTML(){const L=S.D.tix||[];
  return `<details class="mzg-d"><summary>🧾 Lístky za posledné 2 týždne (${L.length})</summary>${L.length?L.map(t=>{const P=[cN(t.com),`${f(t.t,2)} t`];if(t.moist!=null)P.push(`vlhkosť ${f(t.moist,1)} %`);if(+t.ded_kg)P.push(`zrážka ${f(t.ded_kg,0)} kg (fyzicky ${f(t.phys_kg,0)})`);if(t.price)P.push(`${f(t.price,2)} €/t`);else P.push("bez ceny");if(t.km!=null)P.push(`🛰️ ${f(t.km,0)} km → ${f(t.eur_t,2)} €/t`);if(t.fa)P.push("🧾 vo faktúre");
     return `<div class="mzg-li"><div class="mzg-l1"><b>${E(dSK(t.d))} · ${E(t.id)}</b><small>${E(t.spz||"")}</small></div><small>${E(P.join(" · "))}</small></div>`}).join(""):`<div class="s">Žiadne lístky.</div>`}<small class="mzg-i">Lístky prichádzajú samé zo zúčtovania Agro-Somotora (Gmail). Opravy lístkov: Zúčtovanie odberateľa.</small></details>`}
function docsHTML(){const L=(S.D.docs||[]).filter(d=>d.stav!=="caka"),P=pend(),w=S.wk||weeks()[1];
  return `<h3 class="mzg-h">🧾 Doklady pre Agro-Somotor</h3>
   <div class="mzg-gen"><label>Týždeň<select data-mzgwk>${weeks().map(x=>`<option value="${x}"${x===w?" selected":""}>${E(wkTxt(x))}</option>`).join("")}</select></label>
    <div class="mzg-b"><button type="button" data-mzgmk="faktura">🧾 Faktúra</button><button type="button" data-mzgmk="doprava">🚛 Vyúčtovanie dopravy</button><button type="button" data-mzgmk="audit">🔍 Audit vlhkosti</button></div>
    <small>Každý pondelok ráno sa za minulý týždeň pripravia samé. Nový návrh nahradí starší neschválený. Zmluva sa pripraví sama z predajnej zmluvy.</small></div>
   ${P.length?`<div class="mzg-sub">⏳ Na schválenie (${P.length})</div>${P.map(d=>docRow(d)).join("")}`:""}
   ${L.length?`<div class="mzg-sub">Ostatné</div>${L.slice(0,30).map(d=>docRow(d)).join("")}`:(P.length?"":`<div class="s">Zatiaľ žiadny doklad.</div>`)}`}
function cfgHTML(){const c=S.D.cfg||{},b=c.buyer||{},o=(v,l,cur)=>`<option value="${v}"${cur===v?" selected":""}>${l}</option>`;
  return `<details class="mzg-d"><summary>⚙️ Nastavenie Agro-Somotor</summary><form class="mzg-f" id="fMzgCfg" onsubmit="return false">
   <label class="mzg-w">Odberateľ (názov na dokladoch)<input name="b_n" value="${E(b.n||"Agro-Somotor s.r.o.")}"></label>
   <label class="mzg-w">Adresa odberateľa<input name="b_a" value="${E(b.a||"")}" placeholder="ulica, PSČ, obec"></label>
   <label>IČO odberateľa<input name="b_id" value="${E(b.id||"")}" placeholder="IČO …"></label>
   <label>IČ DPH odberateľa<input name="b_vat" value="${E(b.vat||"")}" placeholder="SK…"></label>
   <label>Doprava na faktúre<select name="fr_mode">${o("gps","podľa GPS (km × €/km ÷ t)",c.fr_mode||"gps")}${o("pausal","paušál €/t",c.fr_mode)}${o("nie","bez dopravy",c.fr_mode)}</select></label>
   <label>Paušál dopravy Agro-Somotora €/t<input name="fr_std" inputmode="decimal" value="${E(c.fr_std??9.4)}"></label>
   <label>Doprava €/km<input name="ekm" inputmode="decimal" value="${E(c.ekm??1.6)}"></label>
   <label>Zrážka za vlhkosť<select name="metoda">${o("tyzden","týždenný vážený priemer",c.metoda||"tyzden")}${o("listky","po lístkoch",c.metoda)}</select></label>
   <label>Prémia GMP+ / ISCC / QS €/t<input name="prem" inputmode="decimal" value="${E(c.prem??3)}"></label>
   <label>Okruh benchmarku km<input name="r_km" inputmode="numeric" value="${E(c.r_km??200)}"></label>
   <label>Tolerancia zrážky kg / týždeň<input name="tol_ded" inputmode="decimal" value="${E(c.tol_ded??20)}"></label>
   <label>Splatnosť faktúry (dni)<input name="splat" inputmode="numeric" value="${E(c.splat??"")}" placeholder="podľa zmluvy"></label>
   <label>E-mail Agro-Somotor (komu posielať)<input name="email" type="email" inputmode="email" autocapitalize="off" value="${E(c.email||"")}" placeholder="…@…"></label>
   <label>IBAN ERNTE na faktúre<input name="iban" value="${E(c.iban||"")}" placeholder="SK…"></label>
   <div class="mzg-b mzg-w"><button type="button" class="pri" data-mzgcfg>💾 Uložiť nastavenie</button></div>
   <small class="mzg-w">Polohy miest pre benchmark (${Object.keys(c.geo||{}).length}): ${E(Object.keys(c.geo||{}).map(k=>k.replace(/\[[^\]]*\]/g,m=>m.slice(1,2))).join(", "))}. Ponuka z miesta, ktoré tu nie je, sa ukáže s „chýba poloha miesta“ – pridaj ho:</small>
   <label>Nové miesto (názov)<input name="g_k" placeholder="napr. Sárospatak"></label>
   <label>Šírka, dĺžka, krajina<input name="g_v" placeholder="48.32, 21.57, HU"></label>
   <div class="mzg-b mzg-w"><button type="button" data-mzggeo>➕ Pridať miesto</button></div></form></details>`}
function bodyHTML(){const D=S.D,c=D.cfg||{},b=c.buyer||{},M=!!D.main&&MAIN();
  const miss=[];if(M&&!b.a)miss.push("adresu odberateľa");if(M&&!b.id)miss.push("IČO odberateľa");if(M&&!b.vat)miss.push("IČ DPH odberateľa");if(M&&!c.email)miss.push("e-mail Agro-Somotor");if(M&&!c.iban)miss.push("IBAN ERNTE");
  return `<div class="s">ERNTE ako obchodník dodáva do spracovne <b>Agro-Somotor</b> (skupina Master Good). Dodávky = ich vážne lístky, doprava VALKO = jazdy GPS pri lístkoch. Každý doklad najprv <b>⏳ ČAKÁ NA SCHVÁLENIE MAJITEĽOM</b> – Agro-Somotor ho dostane až po ✅ Martina.</div>
   ${miss.length?`<div class="mzg-warn">⚠️ Doplň v ⚙️ Nastavení: ${E(miss.join(", "))}.</div>`:""}
   ${M?benchHTML():""}${scHTML()}${weeksHTML()}${tixHTML()}${docsHTML()}${M?cfgHTML():""}`}
function cardHTML(){const D=S.D,P=pend();
  return `<details class="card mzg" id="mzgCard"${S.open?" open":""}><summary><b>🐔 Agro-Somotor · skupina Master Good</b><small>${D?`${P.length?`⏳ ${P.length} na schválenie · `:""}${(D.tix||[]).length} lístkov za 2 týždne`:"benchmark 200 km · doprava z GPS · týždenný audit · schvaľovanie"}</small></summary>
   <div class="mzg-in">${D?bodyHTML():`<div class="s">${S.err?E(S.err):"Načítavam…"}</div>`}</div></details>`}
function gateHTML(){const P=pend();
  return `<div class="card mzg mzg-gate" id="mzgGate"><div class="mzg-dh"><b>🐔 Agro-Somotor – ${P.length} ${P.length===1?"doklad čaká":P.length<5?"doklady čakajú":"dokladov čaká"} na schválenie</b><button type="button" class="mzg-sm" data-mzgopen>Otvoriť ›</button></div>${P.slice(0,4).map(d=>docRow(d,true)).join("")}</div>`}

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
const buyerOf=d=>((d.data||{}).cfg||{}).buyer||CF().buyer||{};
const buyerBlock=b=>`${E(b.n||"Agro-Somotor s.r.o.")}${b.grp?` <small>(${E(b.grp)})</small>`:""}<br>${b.a?E(b.a):"………………………………"}<br>${b.id?E(/^IČO/i.test(b.id)?b.id:"IČO "+b.id):"IČO ………………"} · ${b.vat?E(/^IČ/i.test(b.vat)?b.vat:"IČ DPH "+b.vat):"IČ DPH ………………"}`;
const fileName=(d,k)=>`${k} Agro-Somotor ${d.kind==="zmluva"?String(((d.data||{}).sc||{}).no||d.id).replace(/[\\/:*?"<>|_]+/g," "):d.ref}`;
const DPH=`prenesenie daňovej povinnosti – § 69 ods. 12 písm. f) zákona č. 222/2004 Z. z. (tovar kapitol 10 a 12 Spoločného colného sadzobníka; doprava je súčasťou dodania tovaru) <span class=hu>fordított adózás</span>`;
function docZmluva(d){const dt=d.data||{},s=dt.sc||{},c=dt.cfg||{},vc=f(dt.vc,1),ekm=f(dt.ekm||c.ekm||1.6,2),frs=f(dt.frs??c.fr_std??9.4,2),fm=dt.fr_mode||c.fr_mode||"gps";
  const frTxt=fm==="gps"?`ak tovar vezie VALKO s.r.o., účtuje sa podľa skutočných km z GPS: km × ${ekm} € ÷ netto t <span class=hu>VALKO szállítás esetén a tényleges GPS-km alapján: km × ${ekm} € ÷ nettó t</span>`:fm==="pausal"?`ak tovar vezie VALKO s.r.o., paušál ${frs} € / t <span class=hu>átalány ${frs} € / t</span>`:`dopravu zabezpečí kupujúci <span class=hu>a fuvart a vevő biztosítja</span>`;
  const R=[["Predávajúci <span class=hu>Eladó</span>",FIRMA.ernte],["Kupujúci <span class=hu>Vevő</span>",buyerBlock(buyerOf(d))],
   ["Tovar <span class=hu>Áru</span>",`${E(cN(s.com))} <span class=hu>${E(cH(s.com))}</span>${cKN(s.com)?" · KN "+cKN(s.com):""} · voľne ložený <span class=hu>ömlesztett</span>`],
   ["Množstvo <span class=hu>Mennyiség</span>",`${f(s.tons,2)} t`],
   ["Cena <span class=hu>Ár</span>",dt.dap?`<b>${f(s.price,2)} € / t</b> bez DPH · DAP Agro-Somotor, Somotor – dovezené do spracovne <span class=hu>a feldolgozóba szállítva</span>`:`<b>${f(s.price,2)} € / t</b> bez DPH · FCA u predávajúceho / farmára <span class=hu>az eladónál / gazdánál</span>`],
   ["Doprava <span class=hu>Fuvar</span>",dt.dap?`v cene – zabezpečí VALKO s.r.o. <span class=hu>az árban foglalt</span>`:frTxt],
   ["Termín dodania <span class=hu>Szállítási határidő</span>",E(s.term||"podľa dohody / megállapodás szerint")],
   ["Kvalita <span class=hu>Minőség</span>",`vlhkosť max. ${vc} %, zdravé, bez živých škodcov a cudzích pachov <span class=hu>nedvesség max. ${vc} %, egészséges, élő kártevőktől és idegen szagtól mentes</span>`],
   ["Váha <span class=hu>Súly</span>",`rozhoduje váženie v spracovni Agro-Somotor (vážny lístok) <span class=hu>az Agro-Somotor mérlegjegye az irányadó</span>`],
   ["Zrážky za vlhkosť <span class=hu>Nedvességlevonás</span>",`iba fyzický úbytok vody: zrážka (kg) = M × (V − ${vc}) / (100 − ${vc}), M = váha po čistení${(dt.metoda||c.metoda)==="listky"?", po lístkoch":", V = vážený priemer vlhkosti všetkých dodávok kalendárneho týždňa"}; iné zrážky za vlhkosť sa neuplatňujú <span class=hu>csak a fizikai vízveszteség; egyéb nedvességlevonás nincs</span>`],
   ["Fakturácia <span class=hu>Számlázás</span>",`týždenne za dodávky kalendárneho týždňa <span class=hu>hetente, a naptári hét szállításairól</span>`],
   ["DPH <span class=hu>ÁFA</span>",DPH],
   ["Platba <span class=hu>Fizetés</span>",c.splat?`${f(c.splat)} dní od vystavenia faktúry <span class=hu>a számla kiállításától számított ${f(c.splat)} nap</span>`:`podľa faktúry <span class=hu>a számla szerint</span>`],
   ["Rozhodné právo <span class=hu>Irányadó jog</span>",`právo Slovenskej republiky; pri rozpore jazykových znení platí slovenské znenie <span class=hu>a Szlovák Köztársaság joga; eltérés esetén a szlovák nyelvű szöveg az irányadó</span>`]];
  docOpen(fileName(d,"Zmluva"),`${wmark(d)}<table class="pt">${R.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join("")}</table>
   <div class="sig"><div>Za predávajúceho <span class=hu>Az eladó részéről</span><br><br>……………………………<br>ERNTE spol. s r.o.</div><div>Za kupujúceho <span class=hu>A vevő részéről</span><br><br>……………………………<br>${E(buyerOf(d).n||"Agro-Somotor s.r.o.")}</div></div>${okLine(d)}`,
   "ernte",`Kúpna zmluva <span class=hu>Adásvételi szerződés</span>`,`č. ${E(s.no||"")} · ${E(dSK(d.created_at))}`)}
function tixTable(L,cols){return `<table><thead><tr><th>Lístok <span class=hu>Mérlegjegy</span></th><th>Dátum · ŠPZ</th><th class=r>Netto t</th>${cols.v?`<th class=r>Po čistení t <span class=hu>Tisztítás után</span></th><th class=r>Vlhkosť %</th><th class=r>Zrážka AS kg</th><th class=r>Fyzicky kg <span class=hu>Fizikai</span></th>`:""}${cols.km?`<th class=r>km GPS</th><th class=r>€</th><th class=r>€/t</th>`:""}</tr></thead><tbody>
  ${L.map(t=>`<tr><td>${E(t.id)}</td><td>${E(dSK(t.d))}<br><small>${E(t.spz||"")}</small></td><td class=r>${f(t.t,3)}</td>${cols.v?`<td class=r>${f(t.tc,3)}</td><td class=r>${t.moist!=null?f(t.moist,1):"–"}</td><td class=r>${t.ded_kg!=null?f(t.ded_kg,0):"–"}</td><td class=r>${f(t.phys_kg,0)}</td>`:""}${cols.km?`<td class=r>${t.km!=null?f(t.km,0):"–"}</td><td class=r>${t.eur!=null?f(t.eur,2):"–"}</td><td class=r>${t.eur_t!=null?f(t.eur_t,2):"–"}</td>`:""}</tr>`).join("")}</tbody></table>`}
function docFaktura(d){const dt=d.data||{},c=dt.cfg||{},L=dt.lines||[],fr=dt.frt||{},ekm=dt.ekm||c.ekm||1.6,r=wkRange(d.ref),fm=fr.mode||c.fr_mode||"gps";
  const lastD=(dt.ships||[]).map(x=>x.d).filter(Boolean).sort().pop()||"",iss=d.ok_at||new Date().toISOString(),due=c.splat?new Date(new Date(iss).getTime()+c.splat*864e5):null;
  const met=dt.metoda==="listky"?"po lístkoch":`týždenný vážený priemer vlhkosti`;
  const rows=L.map(l=>`<tr><td>${E(cN(l.com))} <span class=hu>${E(cH(l.com))}</span> – ${f(l.n)} lístkov ${E(dSK(l.d0))}${l.d1!==l.d0?" – "+E(dSK(l.d1)):""}<br><small>po čistení ${f(l.tc,3)} t − fyzický úbytok vody ${f(l.loss_kg,0)} kg (${E(met)}${l.vw!=null&&dt.metoda!=="listky"?" "+f(l.vw,2)+" %":""}, norma ${f(l.vc,0)} %) <span class=hu>tisztított súly − fizikai vízveszteség</span></small></td><td class=r>${f(l.qty,3)} t</td><td class=r>${f(l.p,2)}</td><td class=r>${f(l.eur,2)}</td></tr>`).join("")
   +(+dt.fe?`<tr><td>Doprava VALKO s.r.o. do Somotora <span class=hu>Fuvar</span><br><small>${fm==="gps"?`GPS ${f(fr.km,0)} km (tam aj späť) × ${f(ekm,2)} € ÷ ${f(fr.t,3)} t = ${f(fr.eur_t,2)} €/t · ${f(fr.n)} jázd`:`paušál ${f(dt.frs,2)} €/t × ${f(fr.t,3)} t`}</small></td><td class=r>${f(fr.t,3)} t</td><td class=r>${fm==="gps"?f(fr.eur_t,2):f(dt.frs,2)}</td><td class=r>${f(dt.fe,2)}</td></tr>`:"");
  docOpen(fileName(d,"Faktúra"),`${wmark(d)}<table class="pt"><tr><th>Dodávateľ <span class=hu>Szállító</span></th><td>${FIRMA.ernte}${c.iban?`<br>IBAN ${E(c.iban)}`:"<br>IBAN: ………………"}</td></tr><tr><th>Odberateľ <span class=hu>Vevő</span></th><td>${buyerBlock(buyerOf(d))}</td></tr>
   <tr><th>Dátum vystavenia <span class=hu>Kiállítás</span></th><td>${E(dSK(iss))}</td></tr><tr><th>Dátum dodania <span class=hu>Teljesítés</span></th><td>${E(dSK(lastD)||(r?r[1].toLocaleDateString("sk-SK",{timeZone:"UTC"}):""))} (${E(wkTxt(d.ref))})</td></tr>
   <tr><th>Splatnosť <span class=hu>Fizetési határidő</span></th><td>${due?E(due.toLocaleDateString("sk-SK")):"podľa zmluvy / a szerződés szerint"}</td></tr></table>
   <table><thead><tr><th>Položka <span class=hu>Tétel</span></th><th class=r>Množstvo <span class=hu>Menny.</span></th><th class=r>€ / t</th><th class=r>Spolu € <span class=hu>Összesen</span></th></tr></thead><tbody>${rows}
   <tr class="tot"><td colspan=3>Spolu bez DPH <span class=hu>Összesen ÁFA nélkül</span></td><td class=r>${f(dt.total,2)}</td></tr><tr><td colspan=3>DPH: ${DPH}</td><td class=r>0,00</td></tr>
   <tr class="tot"><td colspan=3>Na úhradu € <span class=hu>Fizetendő €</span></td><td class=r>${f(dt.total,2)}</td></tr></tbody></table>
   <h2>Príloha – vážne lístky <span class=hu>Melléklet – mérlegjegyek</span></h2>${tixTable(dt.ships||[],{v:1,km:fm==="gps"})}${okLine(d)}`,
   "ernte",`Faktúra <span class=hu>Számla</span>`,`č. ${E(d.no||"pridelí sa po schválení")} · ${E(wkTxt(d.ref))}`)}
function docDoprava(d){const dt=d.data||{},t=dt.tot||{},ekm=dt.ekm||1.6;
  docOpen(fileName(d,"Vyúčtovanie dopravy"),`${wmark(d)}<table class="pt"><tr><th>Dopravca <span class=hu>Fuvarozó</span></th><td>${FIRMA.valko}</td></tr><tr><th>Objednávateľ <span class=hu>Megrendelő</span></th><td>${FIRMA.ernte}</td></tr>
   <tr><th>Miesto vykládky <span class=hu>Lerakodás</span></th><td>${buyerBlock(buyerOf(d))}<br>spracovňa Somotor</td></tr>
   <tr><th>Sadzba <span class=hu>Díj</span></th><td>${f(ekm,2)} € / km · km zo systému GPS – jazda k lístku × ${f(dt.ret||2)} (tam aj späť) <span class=hu>GPS szerinti km, oda-vissza</span></td></tr></table>
   ${tixTable(dt.ships||[],{km:1})}<table><tbody><tr class="tot"><td>Spolu <span class=hu>Összesen</span>: ${f(t.n)} jázd · ${f(t.km,0)} km · ${f(t.t,3)} t</td><td class=r>${f(t.eur,2)} €</td><td class=r>${t.eur_t!=null?f(t.eur_t,2)+" €/t":""}</td></tr>
   <tr><td>Pre porovnanie: paušál ${f(dt.frs,2)} €/t <span class=hu>átalány</span></td><td class=r>${f(t.pausal,2)} €</td><td class=r>${f((t.eur||0)-(t.pausal||0),2)} €</td></tr></tbody></table>
   <small>Doprava na tonu = km × ${f(ekm,2)} € ÷ netto t. Lístky bez jazdy GPS (vozil niekto iný) tu nie sú – ${f(t.vsetky)} lístkov spolu, ${f(t.n)} s jazdou VALKO.</small>${okLine(d)}`,
   "valko",`Vyúčtovanie dopravy <span class=hu>Fuvarelszámolás</span>`,`do spracovne Agro-Somotor · ${E(wkTxt(d.ref))}`)}
function claimTxt(g){const cl=(g.claims||[])[0]||{},kg=f(cl.kg,0),eur=cl.eur!=null?f(cl.eur,2)+" €":"",p=g.p!=null?f(g.p,2):"",lst=g.met==="listky";
  return [`Reklamácia – zrážka za vlhkosť (${cN(g.com)}): Agro-Somotor uplatnil ${f(g.ded_kg,0)} kg, fyzický úbytok vody ${lst?"po lístkoch":`pri týždennom váženom priemere vlhkosti ${f(g.vw,2)} %`} (norma ${f(g.vc,0)} %) je ${f(g.loss_kg,0)} kg. Rozdiel ${kg} kg${eur?` × ${p} €/t = ${eur}`:""} žiadame vrátiť dobropisom.`,
    `Reklamáció – nedvesség miatti levonás (${cH(g.com)}): az Agro-Somotor ${f(g.ded_kg,0)} kg-ot vont le, a fizikai vízveszteség ${lst?"mérlegjegyenként":`a heti súlyozott átlagos nedvesség (${f(g.vw,2)} %)`} és ${f(g.vc,0)} % szabvány mellett ${f(g.loss_kg,0)} kg. A ${kg} kg különbözet${eur?` (× ${p} €/t = ${eur})`:""} jóváírását kérjük.`]}
function docAudit(d){const dt=d.data||{},G=dt.g||[];
  const body=G.map(g=>`<h2>${E(cN(g.com))} <span class=hu>${E(cH(g.com))}</span> · ${f(g.n)} lístkov · ${f(g.t,3)} t</h2>${tixTable((dt.ships||[]).filter(s=>s.com===g.com),{v:1})}
   <table class="pt"><tr><th>Vážený priemer vlhkosti <span class=hu>Súlyozott átlagos nedvesség</span></th><td>${g.vw!=null?f(g.vw,2)+" %":"– (chýba vlhkosť)"}${+g.bez_v?` · ${g.bez_v} lístkov bez vlhkosti`:""}</td></tr>
   <tr><th>Norma vlhkosti <span class=hu>Nedvességi szabvány</span></th><td>${f(g.vc,1)} %</td></tr>
   <tr><th>Fyzický úbytok vody <span class=hu>Fizikai vízveszteség</span></th><td><b>${f(g.loss_kg,0)} kg</b> (${g.met==="listky"?"po lístkoch":"týždenný vážený priemer"})<br><small>týždeň: ${f(g.tv,3)} t × (${g.vw!=null?f(g.vw,2):"V̄"} − ${f(g.vc,1)}) / (100 − ${f(g.vc,1)}) = ${f(g.loss_w,0)} kg · po lístkoch: ${f(g.loss_l,0)} kg</small></td></tr>
   <tr><th>Zrážka Agro-Somotor <span class=hu>Agro-Somotor levonás</span></th><td>${+g.ndk?f(g.ded_kg,0)+" kg":"žiadna"}${g.diff_kg!=null?` · rozdiel <b>${g.diff_kg>0?"+":""}${f(g.diff_kg,0)} kg</b>`:""}</td></tr></table>
   ${(g.claims||[]).length?(()=>{const t=claimTxt(g);return `<div class="cl"><b>Návrh reklamácie <span class=hu>Reklamáció tervezet</span></b><p>${E(t[0])}</p><p class=hu>${E(t[1])}</p></div>`})():`<div class="ok">✅ Bez odchýlok – zrážka zodpovedá fyzickému úbytku vody. <span class=hu>Nincs eltérés.</span></div>`}`).join("");
  docOpen(fileName(d,"Audit vlhkosti"),`${wmark(d)}<table class="pt"><tr><th>Predávajúci <span class=hu>Eladó</span></th><td>${FIRMA.ernte}</td></tr><tr><th>Kupujúci <span class=hu>Vevő</span></th><td>${buyerBlock(buyerOf(d))}</td></tr>
   <tr><th>Pravidlo <span class=hu>Szabály</span></th><td>Zrážka sa uznáva iba vo výške fyzického úbytku vody: M × (V − Vc) / (100 − Vc), M = váha po čistení${dt.metoda==="listky"?", po lístkoch":", V = vážený priemer vlhkosti všetkých lístkov kalendárneho týždňa"}. <span class=hu>Csak a fizikai vízveszteség fogadható el.</span></td></tr></table>${body}${okLine(d)}`,
   "ernte",`Týždenný audit vlhkosti <span class=hu>Heti nedvességellenőrzés</span>`,`Agro-Somotor · ${E(wkTxt(d.ref))}`)}
function openDoc(d,send){const K=KIND[d.kind]||["📄","Doklad","Dokumentum"],c=CF();
  if(send){window.__pvMail={to:c.email||"",subj:`${K[1]} / ${K[2]} – ${d.no||d.title}`,prof:d.kind==="doprava"?"valko":"ernte",cc:[],
    body:`Dobrý deň,\n\nv prílohe posielame: ${K[1]} – ${d.title}.\n\nJó napot kívánunk!\nMellékelten küldjük: ${K[2]} – ${d.title}.\n\nS pozdravom / Üdvözlettel\nMartin Vaľko\n${d.kind==="doprava"?"VALKO s.r.o.":"ERNTE spol. s r.o."}`}}
  else window.__pvMail=null;
  try{({zmluva:docZmluva,faktura:docFaktura,doprava:docDoprava,audit:docAudit}[d.kind]||docAudit)(d)}finally{window.__pvMail=null}
  if(send&&c.email){try{navigator.clipboard&&navigator.clipboard.writeText(c.email)}catch(x){}}}

// ---------- ovládanie ----------
const docById=id=>((S.D&&S.D.docs)||[]).find(x=>String(x.id)===String(id));
document.addEventListener("click",async ev=>{const t=ev.target.closest&&ev.target.closest("[data-mzgmk],[data-mzgview],[data-mzgok],[data-mzgno],[data-mzgsend],[data-mzgcfg],[data-mzggeo],[data-mzgopen]");
  if(!t||!t.closest("#mzgCard,#mzgGate"))return;ev.preventDefault();const fm=t.closest("form");
  if(t.matches("[data-mzgopen]")){S.open=true;try{localStorage.setItem("ernte-mzg-open","1")}catch(x){}goDeals();return}
  if(t.matches("[data-mzgmk]")){const w=S.wk||weeks()[1];t.disabled=true;try{const r=await sb.rpc("mg_doc_make",{p_kind:t.dataset.mzgmk,p_ref:w});if(r.error){say(r.error.message,8000);return}say("Návrh pripravený – ⏳ čaká na schválenie majiteľom.",6000);await load(true)}finally{t.disabled=false}return}
  if(t.matches("[data-mzgview]")){const d=docById(t.dataset.mzgview);if(d)openDoc(d,false);return}
  if(t.matches("[data-mzgsend]")){const d=docById(t.dataset.mzgsend);if(d)openDoc(d,true);return}
  if(t.matches("[data-mzgok]")){const d=docById(t.dataset.mzgok);if(!d||!MAIN())return;t.disabled=true;
    try{const r=await sb.rpc("mg_doc_approve",{p_id:d.id,p_ok:true});if(r.error){say("Neschválené: "+r.error.message,10000);t.disabled=false;return}
      const nd=Object.assign({},d,r.data||{},{data:d.data,stav:"schvalene"});say("✅ Schválené a zapísané. Ťukni 📧 Odoslať – vyber Gmail / Outlook (adresa Agro-Somotor je skopírovaná).",9000);openDoc(nd,true);load(true)}
    catch(x){say("Neschválené: "+(x&&x.message||x),8000);t.disabled=false}return}
  if(t.matches("[data-mzgno]")){const d=docById(t.dataset.mzgno);if(!d||!MAIN())return;const why=prompt("Prečo zamietaš? (neodíde Agro-Somoru, iba záznam)","");if(why===null)return;
    const r=await sb.rpc("mg_doc_approve",{p_id:d.id,p_ok:false,p_why:why});if(r.error){say(r.error.message,7000);return}say("Zamietnuté.");load(true);return}
  if(t.matches("[data-mzgcfg]")&&fm){const g=n=>fm.elements[n]?fm.elements[n].value.trim():"",p={email:g("email"),iban:g("iban"),b_n:g("b_n"),b_a:g("b_a"),b_id:g("b_id"),b_vat:g("b_vat"),fr_mode:g("fr_mode")||"gps",metoda:g("metoda")||"tyzden"};
    for(const k of ["prem","r_km","ekm","tol_ded","splat","fr_std"]){const v=num(g(k));if(v!=null)p[k]=v}
    const r=await sb.rpc("mg_cfg_set",{p});if(r.error){say("Neuložené: "+r.error.message,7000);return}say("Nastavenie uložené.");load(true);return}
  if(t.matches("[data-mzggeo]")&&fm){const k=fm.elements.g_k.value.trim(),v=fm.elements.g_v.value.split(/[,;\s]+/).filter(Boolean);
    if(!k||v.length<2){say("Zadaj názov a polohu: šírka, dĺžka, krajina (napr. 48.32, 21.57, HU).");return}
    const key=k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const r=await sb.rpc("mg_cfg_set",{p:{geo_add:{[key]:[num(v[0]),num(v[1]),(v[2]||"SK").toUpperCase()]}}});if(r.error){say(r.error.message,7000);return}say("Miesto pridané – benchmark sa prepočíta.");load(true);return}
},true);
document.addEventListener("change",ev=>{const t=ev.target;if(t&&t.matches&&t.matches("[data-mzgwk]"))S.wk=t.value});
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
.mzg-bad{color:#ff6b81;font-weight:700;margin-top:6px}.mzg-badt{color:#ffcf5a}.mzg-warn{color:#ffcf5a;margin:6px 0}
.mzg-f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}.mzg-f .mzg-w{grid-column:1/-1}.mzg-f label{min-width:0;display:flex;flex-direction:column;gap:4px}.mzg-f input,.mzg-f select{min-height:44px;width:100%;box-sizing:border-box}
.mzg-km{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:end}.mzg-km small{grid-column:1/-1;color:#94A3B8}.mzg-km button{min-height:44px}
.mzg-rides{display:flex;flex-direction:column;gap:6px}.mzg-ck{display:flex!important;flex-direction:row!important;gap:8px;align-items:flex-start}.mzg-ck input{width:22px!important;height:22px;min-height:22px!important;flex:none;margin-top:2px}.mzg-ck span{min-width:0;overflow-wrap:anywhere}.mzg-ck small{display:block;color:#94A3B8}
.mzg-gen{display:flex;flex-direction:column;gap:6px;margin:6px 0}.mzg-gen select{min-height:44px;max-width:100%}.mzg-gen small{color:#94A3B8}
.mzg-sm{min-height:40px;min-width:40px;padding:4px 10px}.mzg-del{color:#ff6b81}.mzg-gate{border-color:#ffcf5a!important}
@media(max-width:430px){.mzg-f{grid-template-columns:1fr}.mzg-tb{font-size:.78rem}}`;document.head.appendChild(st);
})();
