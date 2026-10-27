// ===== ERNTE · EVIDENCIA – náklady a výnosy, výkony, dochádzka a výplaty podľa zákona SK =====
// Majiteľ: všetko (výsledok, mzdy, cena práce). Vedúci s prístupom „ev“ zapisuje náklady a výkony,
// s prístupom „ev_doch“ dochádzku (dni, pole, víkendy, nadčasy) – bez peňazí. Strážené aj v databáze (RLS).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f2=(x,d=2)=>typeof fmt==="function"?fmt(x,d):(+x).toFixed(d);
const eur=x=>f2(x)+" €";
const num=v=>{if(v==null||v==="")return null;const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null};
const iv=v=>v==null?"":String(v).replace(".",",");
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const CAN=k=>OWN()||(typeof can==="function"&&can(k));
const tst=(t,ms)=>(typeof toast==="function"?toast:alert)(t,ms);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dSK=d=>d?new Date(d+"T12:00:00").toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"}):"";
const MES=["január","február","marec","apríl","máj","jún","júl","august","september","október","november","december"];
const mTxt=m=>{const [y,mm]=String(m).split("-");return `${MES[+mm-1]} ${y}`};
const mAdd=(m,k)=>{const [y,mm]=m.split("-").map(Number);const d=new Date(y,mm-1+k,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
const curM=()=>today().slice(0,7);
const errTxt=r=>{const m=(r&&r.error&&r.error.message)||"";return /ev_|does not exist|could not find/i.test(m)&&/does not exist|could not find/i.test(m)?"Evidencia sa zapne po aktualizácii databázy (pár minút).":m};
const meMail=()=>String((typeof ME!=="undefined"&&ME&&ME.email)||(typeof STATE!=="undefined"&&STATE.me&&STATE.me.email)||"").toLowerCase();
let E={sec:"",y:+today().slice(0,4),m:curM(),fm:"",ft:"",fk:"",ff:"",fq:"",lim:150,ent:null,kat:null,ppl:null,pay:null,par:null,doch:null,dochM:null,ops:null,open:null,edit:null,pv:"",err:""};
window.evData=()=>E;window.evLoadEnt=()=>loadEnt();
const rr=()=>{if(typeof TAB!=="undefined"&&TAB==="evid"&&typeof renderStaff==="function")renderStaff()};

// ---------- načítanie ----------
async function all(q){let out=[],from=0;for(;;){const r=await q().range(from,from+999);if(r.error)return r;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)break;from+=1000}return {data:out}}
async function loadEnt(){const r=await all(()=>sb.from("ev_entries").select("*").order("d",{ascending:false}).order("id",{ascending:false}));if(r.error){E.err=errTxt(r);E.ent=[]}else E.ent=r.data;
  const k=await sb.from("ev_kat").select("*");E.kat=k.error?[]:(k.data||[]);rr()}
async function loadPay(){const [p,y,a]=await Promise.all([sb.from("ev_people").select("*").order("meno"),all(()=>sb.from("ev_pay").select("*").order("mes")),sb.from("ev_param").select("*").order("rok")]);
  if(p.error){E.err=errTxt(p);E.ppl=[];E.pay=[];E.par=[];rr();return}E.ppl=p.data||[];E.pay=y.data||[];E.par=a.data||[];rr()}
async function loadDoch(){E.dochM=E.m;const r=await sb.rpc("ev_doch_list",{m:E.m+"-01"});E.doch=r.error?{err:errTxt(r)}:r.data;rr()}
async function loadOps(){const r=await all(()=>sb.from("ev_ops").select("*").order("d",{ascending:false}));E.ops=r.error?[]:r.data;rr()}
const presun=k=>(E.kat||[]).some(x=>x.presun&&x.kat===k);
const person=id=>(E.ppl||[]).find(p=>p.id===id)||{};

// ---------- hlavná obrazovka ----------
window.vEvid=function(){
  const SEC=[];
  if(CAN("ev"))SEC.push(["zap","🧾","Náklady a výnosy","PHM, nákupy, služby, servis – zápis s dátumom, strojom a poľom"]);
  if(CAN("ev_doch"))SEC.push(["doch","🗓️","Dochádzka",OWN()?"dni, dovolenka, PN, pole, víkendy, nadčasy":"zapíš dni, pole, víkendy a nadčasy – bez peňazí"]);
  if(OWN())SEC.push(["mzdy","💶","Výplaty podľa zákona","hrubá → odvody → daň → čistá · cena práce · výplatné pásky"],["prehl","📊","Prehľad a výsledok","výnosy, náklady, mzdy, výsledok po mesiacoch"]);
  if(CAN("ev"))SEC.splice(1,0,["sklad","📦","Sklad","diely, materiál, náradie · odfoť bloček alebo súčiastku"]);
  if(CAN("ev"))SEC.push(["vyk","🌾","Výkony","žatva po kombajnoch, vápnenie po podnikoch"]);
  if(OWN())SEC.push(["kon","✅","Kontrola a opravy","čo bolo v Exceli zle a ako je to teraz · sadzby 2025/2026"]);
  let h=`<div class="zt evz"><h2>📒 Evidencia ERNTE ${E.sec?`<button type="button" class="ztb" data-evsec="">← späť</button>`:""}</h2>`;
  if(!E.sec)return h+`<div class="zgrid">${SEC.map(s=>`<button type="button" class="zbtn" data-evsec="${s[0]}"><span>${s[1]}</span><b>${s[2]}</b><small>${e(s[3])}</small></button>`).join("")}</div>
    <div class="s">🔒 Mzdy, cenu práce, výnosy a výsledok vidí iba majiteľ. Vedúci zapisuje náklady a dochádzku; svoje zápisy môže 14 dní opraviť.</div></div>`;
  let b="";try{b=({sklad:()=>{if(!E.ent)loadEnt();return (window.vSklad?vSklad():"")+`<datalist id="skStr">${[...new Set((E.ent||[]).map(r=>r.stroj).filter(Boolean))].slice(0,120).map(x=>`<option value="${e(x)}">`).join("")}</datalist>`},zap:zapHTML,doch:dochHTML,mzdy:mzdyHTML,prehl:prehlHTML,vyk:vykHTML,kon:konHTML})[E.sec]()}catch(x){b=`<div class="card"><div class="s">Chyba zobrazenia: ${e(x.message)}</div></div>`}
  return h+b+`</div>`};

// ================= NÁKLADY A VÝNOSY =================
const F_JED=["l","ks","ha","t","kg","hod","mth","km","m","€"];
function entForm(x){x=x||{};const own=OWN(),K=[...new Set((E.ent||[]).map(r=>r.kat).filter(Boolean))].sort(),ST=[...new Set((E.ent||[]).map(r=>r.stroj).filter(Boolean))].slice(0,80),PA=[...new Set((E.ent||[]).map(r=>r.partner).filter(Boolean))].slice(0,80);
  return `<form class="card f evf" data-event="${x.id||""}"><div class="w t">${x.id?"✏️ Upraviť zápis":"➕ Nový zápis"}</div>
  <label>Dátum<input type="date" name="d" required value="${e(x.d||today())}"></label>
  <label>Typ<select name="typ"><option value="naklad"${x.typ!=="zisk"?" selected":""}>Náklad</option><option value="zisk"${x.typ==="zisk"?" selected":""}>Výnos (príjem)</option></select></label>
  <label>Firma<select name="firma">${["ERNTE","VALKO"].map(f=>`<option${(x.firma||"ERNTE")===f?" selected":""}>${f}</option>`).join("")}</select></label>
  <label>Kategória<input name="kat" list="evK" required value="${e(x.kat||"")}" placeholder="PHM, nakup, služby, servis…"></label>
  <label>Podkategória / čo<input name="podkat" value="${e(x.podkat||"")}" placeholder="nafta, postrek, náhradný diel…"></label>
  <label>Množstvo<input name="mn" inputmode="decimal" value="${iv(x.mn)}"></label>
  <label>Jednotka<input name="jed" list="evJ" value="${e(x.jed||"")}"></label>
  <label>€ za jednotku (bez DPH)<input name="cena" inputmode="decimal" value="${iv(x.cena)}"></label>
  <label>Suma € <small>prázdne = množstvo × cena</small><input name="suma" inputmode="decimal" value="${iv(x.suma)}"></label>
  <label>Partner / dodávateľ<input name="partner" list="evP" value="${e(x.partner||"")}"></label>
  <label>Stroj / auto<input name="stroj" list="evS" value="${e(x.stroj||"")}"></label>
  <label>Pole<input name="pole" value="${e(x.pole||"")}"></label><label>Plodina<input name="plodina" value="${e(x.plodina||"")}"></label>
  <label class="w">Poznámka<input name="pozn" value="${e(x.pozn||"")}"></label>
  <datalist id="evK">${K.map(k=>`<option value="${e(k)}">`).join("")}</datalist><datalist id="evJ">${F_JED.map(k=>`<option value="${k}">`).join("")}</datalist>
  <datalist id="evS">${ST.map(k=>`<option value="${e(k)}">`).join("")}</datalist><datalist id="evP">${PA.map(k=>`<option value="${e(k)}">`).join("")}</datalist>
  <div class="w btns"><button class="lime" type="submit">💾 Uložiť</button>${x.id?`<button type="button" data-evcancel>Zrušiť</button><button type="button" class="red" data-evdel="${x.id}">🗑️ Zmazať</button>`:""}</div>
  ${own?"":`<div class="w s">Zápis uvidí majiteľ. Opraviť alebo zmazať ho môžeš do 14 dní.</div>`}</form>`}
function entFilter(){const R=E.ent||[],q=E.fq.trim().toLowerCase();
  return R.filter(r=>String(r.d).startsWith(String(E.y))&&(!E.fm||r.d.slice(5,7)===E.fm)&&(!E.ft||r.typ===E.ft)&&(!E.fk||r.kat===E.fk)&&(!E.ff||r.firma===E.ff)&&
    (!q||[r.kat,r.podkat,r.partner,r.stroj,r.pole,r.plodina,r.pozn].some(v=>String(v||"").toLowerCase().includes(q))))}
function zapHTML(){if(!E.ent){loadEnt();return `<div class="card"><div class="s">Načítavam…</div></div>`}
  if(E.err)return `<div class="card"><div class="s">${e(E.err)}</div></div>`;
  const yrs=[...new Set((E.ent||[]).map(r=>+String(r.d).slice(0,4)))].concat([+today().slice(0,4)]);const Y=[...new Set(yrs)].sort((a,b)=>b-a);
  const K=[...new Set((E.ent||[]).filter(r=>String(r.d).startsWith(String(E.y))).map(r=>r.kat).filter(Boolean))].sort();
  const L=entFilter(),own=OWN(),me=meMail();
  let h=E.edit===0?entForm():E.edit?entForm((E.ent||[]).find(r=>r.id===E.edit)):`<div class="btns"><button class="lime" data-evnew>➕ Nový zápis</button></div>`;
  h+=`<form class="card f evflt" id="evFlt"><label>Rok<select name="y">${Y.map(y=>`<option${y===E.y?" selected":""}>${y}</option>`).join("")}</select></label>
   <label>Mesiac<select name="m"><option value="">celý rok</option>${MES.map((m,i)=>{const v=String(i+1).padStart(2,"0");return `<option value="${v}"${E.fm===v?" selected":""}>${m}</option>`}).join("")}</select></label>
   <label>Typ<select name="t"><option value="">všetko</option><option value="naklad"${E.ft==="naklad"?" selected":""}>náklady</option>${own?`<option value="zisk"${E.ft==="zisk"?" selected":""}>výnosy</option>`:""}</select></label>
   <label>Kategória<select name="k"><option value="">všetky</option>${K.map(k=>`<option${E.fk===k?" selected":""}>${e(k)}</option>`).join("")}</select></label>
   <label>Firma<select name="f"><option value="">obe</option><option${E.ff==="ERNTE"?" selected":""}>ERNTE</option><option${E.ff==="VALKO"?" selected":""}>VALKO</option></select></label>
   <label>Hľadať<input name="q" value="${e(E.fq)}" placeholder="stroj, partner, pole…"></label></form>`;
  if(own){const vyn=L.filter(r=>r.typ==="zisk").reduce((s,r)=>s+(+r.suma||0),0),nk=L.filter(r=>r.typ==="naklad"&&!presun(r.kat)).reduce((s,r)=>s+(+r.suma||0),0),pr=L.filter(r=>r.typ==="naklad"&&presun(r.kat)).reduce((s,r)=>s+(+r.suma||0),0);
    h+=`<div class="hrk"><div class="ps"><small>Výnosy</small><b>${eur(vyn)}</b></div><div class="ng"><small>Náklady (prevádzka)</small><b>${eur(nk)}</b></div>${pr?`<div><small>Výbery hotovosti (nie náklad)</small><b>${eur(pr)}</b></div>`:""}<div><small>Zápisov</small><b>${L.length}</b></div></div>`}
  if(!L.length)return h+`<div class="card"><div class="s">Žiadne zápisy pre tento výber.</div></div>`;
  h+=`<div class="card trtab evtab"><table><thead><tr><th>Dátum</th><th>Kategória</th><th>Partner</th><th>Stroj / pole</th><th class="r">Množstvo</th><th class="r">€/j</th><th class="r">Suma €</th><th></th></tr></thead><tbody>`+
    L.slice(0,E.lim).map(r=>{const ed=own||(r.created_by===me&&Date.now()-new Date(r.created_at).getTime()<14*864e5);
      return `<tr class="${r.typ==="zisk"?"evzi":""}${presun(r.kat)?" evpr":""}"><td>${e(dSK(r.d))}${r.firma==="VALKO"?` <small class="pill b">VALKO</small>`:""}</td><td><b>${e(r.kat||"–")}</b>${r.podkat?`<br><small>${e(r.podkat)}</small>`:""}</td><td>${e(r.partner||"")}</td>
      <td>${e(r.stroj||"")}${r.pole||r.plodina?`<br><small>${e([r.pole,r.plodina].filter(Boolean).join(" · "))}</small>`:""}</td><td class="r">${r.mn!=null?f2(r.mn,r.mn%1?2:0)+" "+e(r.jed||""):""}</td><td class="r">${r.cena!=null?f2(r.cena,r.cena<10?3:2):""}</td>
      <td class="r"><b>${r.typ==="zisk"?"+":""}${f2(r.suma)}</b></td><td>${r.flag?`<span title="${e(r.flag)}" aria-label="${e(r.flag)}">⚠️</span>`:""}${ed?`<button type="button" class="evmini" data-evedit="${r.id}" aria-label="Upraviť">✏️</button>`:""}</td></tr>`}).join("")+`</tbody></table>
    ${L.length>E.lim?`<div class="s"><button type="button" data-evmore>Zobraziť ďalšie (${L.length-E.lim})</button></div>`:""}</div>`;
  return h}

// ================= DOCHÁDZKA =================
const DF=[["dni_prac","Odpracované dni","d"],["dni_dov","Dovolenka dni","d"],["dni_pn","PN dni","d"],["dni_pole","Dni na poli","d"],["hod_so","Sobota hod.","h"],["hod_ne","Nedeľa hod.","h"],["hod_noc","Noc 22–6 hod.","h"],["hod_sv","Sviatok hod.","h"],["hod_nad","Nadčas hod.","h"]];
const monthNav=k=>`<div class="btns evmon"><button type="button" data-evm="-1" aria-label="Predchádzajúci mesiac">◀</button><b>${e(mTxt(E.m))}</b><button type="button" data-evm="1" aria-label="Ďalší mesiac">▶</button>${E.m!==curM()?`<button type="button" data-evm="0">Tento mesiac</button>`:""}</div>`;
function dochHTML(){if(!E.doch||E.dochM!==E.m){loadDoch();return monthNav()+`<div class="card"><div class="s">Načítavam dochádzku…</div></div>`}
  const D=E.doch;if(D.err)return monthNav()+`<div class="card"><div class="s">${e(D.err)}</div></div>`;
  const R=D.rows||[];let h=monthNav()+`<div class="s">Pracovných dní v mesiaci: <b>${D.prac_dni}</b> (po–pi bez sviatkov). Prázdne „odpracované dni“ = všetky pracovné dni mínus dovolenka a PN.</div>`;
  if(!R.length)return h+`<div class="card"><div class="s">Zatiaľ nie sú pridaní pracovníci.${OWN()?" Pridaj ich vo Výplatách → Ľudia.":""}</div></div>`;
  return h+`<div class="agl">${R.map(r=>{const lock=r.stav!=="navrh"&&!D.own,sz=r.druh==="szco";const F=sz?DF.filter(f=>["dni_prac","dni_pole"].includes(f[0])):DF;
    return `<form class="card f evdoch" data-evdoch="${r.pid}"><div class="w row"><b>${e(r.meno)}</b><span class="pill ${sz?"w":"b"}">${sz?"živnostník":"zamestnanec"}</span>${r.stav!=="navrh"?`<span class="pill g">${r.stav==="vyplatene"?"vyplatené":"schválené"}</span>`:""}</div>
      ${F.map(f=>`<label>${sz&&f[0]==="dni_prac"?"Odpracované dni (faktúra)":f[1]}<input name="${f[0]}" inputmode="decimal" value="${iv(r[f[0]])}"${lock?" disabled":""} placeholder="${f[0]==="dni_prac"&&!sz?D.prac_dni+"":"0"}"></label>`).join("")}
      ${OWN()&&r.warn&&r.warn.length?`<div class="w evwarn">${r.warn.map(w=>`⚠️ ${e(w)}`).join("<br>")}</div>`:""}
      <div class="w row"><small>${r.doch_at?`zapísal ${e(r.doch_by||"")} · ${e(new Date(r.doch_at).toLocaleString("sk-SK"))}`:""}</small>${lock?`<small>🔒 schválené – zmeny iba majiteľ</small>`:`<button class="lime" type="submit">💾 Uložiť</button>`}</div></form>`}).join("")}</div>`}

// ================= VÝPLATY (majiteľ) =================
const PF=[["hruba","Základná hrubá mzda €"],["dni_prac","Odpracované dni (stravné)"],["dni_dov","Dovolenka dni"],["dni_pn","PN dni"],["nahrada_pn","Náhrada pri PN €"],["dni_pole","Dni na poli"],["pole_sadzba","€ za deň na poli"],
  ["hod_so","Sobota hod."],["hod_ne","Nedeľa hod."],["hod_noc","Noc hod."],["hod_sv","Sviatok hod."],["hod_nad","Nadčas hod."],["bonus","Prémia / odmena €"],["strava_den","Stravné €/deň"],["zrazky","Zrážky z čistej €"],["zaloha","Vyplatená záloha €"]];
const PFS=[["dni","Odpracované dni"],["sadzba","Sadzba €/deň"],["pausal","Paušál €/mesiac"],["dni_mes","Dní v mesiaci (pri paušáli)"],["dni_pole","Dni na poli"],["pole_sadzba","€ za deň na poli"],["odmeny","Odmeny €"],["zrazky","Zrážky €"]];
const STS={navrh:["návrh","w"],schvalene:["schválené","b"],vyplatene:["vyplatené",""]};
function monthRows(m){return (E.pay||[]).filter(y=>String(y.mes).slice(0,7)===m)}
function sumC(L,k){return L.reduce((s,y)=>s+(+(y.calc&&y.calc[k])||0),0)}
function mzdyHTML(){if(!E.pay){loadPay();return `<div class="card"><div class="s">Načítavam výplaty…</div></div>`}
  if(E.err)return `<div class="card"><div class="s">${e(E.err)}</div></div>`;
  if(E.pv==="ppl")return pplHTML();
  const L=monthRows(E.m).sort((a,b)=>{const A=person(a.person_id),B=person(b.person_id);return (A.druh<B.druh)-(A.druh>B.druh)||String(A.meno).localeCompare(B.meno,"sk")});
  const Z=L.filter(y=>person(y.person_id).druh!=="szco"),S=L.filter(y=>person(y.person_id).druh==="szco");
  let h=monthNav()+`<div class="btns"><button type="button" data-evopen>📋 Pripraviť mesiac (aktívni ľudia)</button><button type="button" data-evpv="ppl">👥 Ľudia a podmienky</button>${L.length?`<button type="button" data-evrek>🖨️ Rekapitulácia</button><button type="button" data-evall="schvalene">✓ Schváliť všetko</button><button type="button" data-evall="vyplatene">💸 Všetko vyplatené</button>`:""}</div>`;
  if(!L.length)return h+`<div class="card"><div class="s">Mesiac ešte nie je pripravený. Ťukni „Pripraviť mesiac“ – pridajú sa aktívni zamestnanci a živnostníci, vedúci potom doplní dochádzku.</div></div>`;
  const cp=sumC(Z,"cena_prace"),sz=sumC(S,"cena_prace");
  h+=`<div class="hrk"><div><small>Hrubé mzdy</small><b>${eur(sumC(Z,"hruba"))}</b></div><div><small>Na účty zamestnancom</small><b>${eur(sumC(Z,"k_vyplate"))}</b></div>
   <div><small>Sociálna poisťovňa</small><b>${eur(sumC(Z,"odvod_sp"))}</b></div><div><small>Zdravotné poisťovne</small><b>${eur(sumC(Z,"odvod_zp"))}</b></div>
   <div><small>Daňový úrad (preddavky − bonus)</small><b>${eur(sumC(Z,"odvod_dan"))}</b></div><div class="ng"><small>Cena práce zamestnancov</small><b>${eur(cp)}</b></div>
   ${S.length?`<div><small>Živnostníci (faktúry)</small><b>${eur(sz)}</b></div>`:""}<div class="ng"><small>Ľudia spolu – náklad firmy</small><b>${eur(cp+sz)}</b></div></div>
   <div class="s">⏰ Mzda je splatná najneskôr do konca nasledujúceho mesiaca (§ 130 Zákonníka práce). Preddavok dane odviesť do 5 dní od výplaty; poistné do Sociálnej a zdravotných poisťovní v lehote podľa zákona – termíny si potvrď s účtovníčkou.</div>`;
  return h+`<div class="agl">${L.map(payCard).join("")}</div>`}
function payCard(y){const p=person(y.person_id),c=y.calc||{},sz=p.druh==="szco",op=E.open===y.id,W=c.warn||[],lock=y.stav==="vyplatene";
  const top=sz?`<span>na faktúru <b>${eur(c.faktura_suma)}</b></span>`:`<span>hrubá <b>${eur(c.hruba)}</b></span><span>čistá <b>${eur(c.cista)}</b></span><span>na účet <b>${eur(c.k_vyplate)}</b></span><span>cena práce <b>${eur(c.cena_prace)}</b></span>`;
  let h=`<div class="card evpay${W.length?" evw":""}"><div class="row"><b>${e(p.meno)}</b><span class="pill ${sz?"w":"b"}">${sz?"živnostník":p.dochodca?"dôchodca":"zamestnanec"}</span><span class="pill ${STS[y.stav][1]}">${STS[y.stav][0]}</span>${W.length?`<span class="pill r">⚠️ ${W.length}</span>`:""}
    <button type="button" class="evmini" data-evop="${y.id}" aria-expanded="${op}">${op?"Zavrieť":"Detail"}</button></div><div class="trlw">${top}</div>`;
  if(!op)return h+`</div>`;
  if(W.length)h+=`<div class="evwarn">${W.map(w=>`⚠️ ${e(w)}`).join("<br>")}</div>`;
  const FF=sz?PFS:PF;
  h+=`<form class="f evpf" data-evpay="${y.id}">${FF.map(f=>`<label>${f[1]}<input name="${f[0]}" inputmode="decimal" value="${iv(y[f[0]])}"${lock?" disabled":""} placeholder="${e(ph(f[0],p,c))}"></label>`).join("")}
   ${sz?`<label>Číslo faktúry<input name="faktura" value="${e(y.faktura||"")}"${lock?" disabled":""}></label>`:""}<label class="w">Poznámka<input name="pozn" value="${e(y.pozn||"")}"${lock?" disabled":""}></label>
   ${lock?`<div class="w s">🔒 Vyplatený mesiac je zmrazený. Na opravu ho vráť do návrhu.</div>`:`<div class="w btns"><button class="lime" type="submit">💾 Uložiť a prepočítať</button></div>`}</form>`;
  if(!sz)h+=breakdown(c,y);else h+=`<table class="evbd"><tr><td>Za odpracované dni</td><td class="r">${eur(c.za_dni)}</td></tr><tr><td>Práca na poli</td><td class="r">${eur(c.pole)}</td></tr><tr><td>Odmeny</td><td class="r">${eur(c.odmeny)}</td></tr><tr><td>Zrážky</td><td class="r">−${eur(c.zrazky)}</td></tr><tr class="t"><td>K úhrade na účet</td><td class="r">${eur(c.k_vyplate)}</td></tr></table>`;
  if(y.excel_cost!=null)h+=`<div class="s">📎 Excel: ${sz?"":`čistá s príplatkami ${eur(y.excel_net)}, `}náklad v Exceli ${eur(y.excel_cost)} → správne podľa zákona <b>${eur(c.cena_prace)}</b> (rozdiel ${eur((c.cena_prace||0)-y.excel_cost)}).</div>`;
  h+=`<div class="btns">${["navrh","schvalene","vyplatene"].filter(s=>s!==y.stav).map(s=>`<button type="button" data-evst="${s}" data-id="${y.id}">${s==="navrh"?"↩ Späť do návrhu":s==="schvalene"?"✓ Schváliť":"💸 Vyplatené"}</button>`).join("")}${sz?"":`<button type="button" data-evslip="${y.id}">🖨️ Výplatná páska</button>`}<button type="button" class="red" data-evpdel="${y.id}">🗑️ Odstrániť z mesiaca</button></div>`;
  return h+`</div>`}
function ph(k,p,c){if(k==="hruba")return p.hruba!=null?String(p.hruba):"";if(k==="dni_prac")return c.prac_dni!=null?String(c.prac_dni):"";if(k==="strava_den")return c.strava_den!=null?String(c.strava_den):"";if(k==="pole_sadzba")return "20";if(k==="sadzba")return p.sadzba!=null?String(p.sadzba):"";if(k==="dni_mes")return c.prac_dni!=null?String(c.prac_dni):"";return "0"}
function breakdown(c,y){const r=(l,v,cl)=>v?`<tr${cl?` class="${cl}"`:""}><td>${l}</td><td class="r">${eur(v)}</td></tr>`:"";const S=c.sadzby||{};
  return `<table class="evbd">${r("Základná mzda",c.zaklad)}${r("Práca na poli ("+f2(y.dni_pole,1)+" dní)",c.pole)}${r("Príplatok sobota",c.pri_so)}${r("Príplatok nedeľa",c.pri_ne)}${r("Príplatok noc",c.pri_noc)}${r("Nadčas (mzda + 25 %)",c.pri_nad)}${r("Práca vo sviatok (+100 %)",c.pri_sv)}${r("Prémia / odmena",c.bonus)}${r("Stravné nad daňový limit (zdaňuje sa)",c.strava_nad)}
   <tr class="t"><td>Hrubá mzda</td><td class="r">${eur(c.hruba)}</td></tr>${r("Náhrada pri PN (bez odvodov)",c.nahrada_pn)}
   <tr><td>Sociálne poistenie ${f2((S.sp_zam||0)*100,1)} %</td><td class="r">−${eur(c.sp_zam)}</td></tr><tr><td>Zdravotné poistenie 5 %</td><td class="r">−${eur(c.zp_zam)}</td></tr>
   <tr><td>Základ dane</td><td class="r">${eur(c.zd)}</td></tr><tr><td>Nezdaniteľná časť</td><td class="r">−${eur(c.nczd)}</td></tr><tr><td>Preddavok dane</td><td class="r">−${eur(c.dan)}</td></tr>
   <tr class="t"><td>Čistá mzda</td><td class="r">${eur(c.cista)}</td></tr>${r("Daňový bonus na deti",c.bonus_deti)}<tr><td>Stravné ${f2(c.strava_dni,1)} dní × ${f2(c.strava_den)} €</td><td class="r">${eur(c.strava-(c.strava_nad||0))}</td></tr>${c.zrazky?`<tr><td>Zrážky</td><td class="r">−${eur(c.zrazky)}</td></tr>`:""}${c.zaloha?`<tr><td>Vyplatená záloha</td><td class="r">−${eur(c.zaloha)}</td></tr>`:""}
   <tr class="t"><td>Na účet zamestnanca</td><td class="r">${eur(c.k_vyplate)}</td></tr>
   <tr><td colspan="2" class="evsub">Firma platí navyše</td></tr><tr><td>Sociálne poistenie zamestnávateľ ${f2((S.sp_zav||0)*100+0.8,1)} %</td><td class="r">${eur(c.sp_zav)}</td></tr><tr><td>Zdravotné poistenie zamestnávateľ 11 %</td><td class="r">${eur(c.zp_zav)}</td></tr><tr><td>Sociálny fond 0,6 %</td><td class="r">${eur(c.socfond)}</td></tr>
   <tr class="t"><td>Celková cena práce</td><td class="r">${eur(c.cena_prace)}</td></tr></table>`}
function pplHTML(){const P=E.ppl||[];let h=`<div class="btns"><button type="button" data-evpv="">← Výplaty</button><button type="button" class="lime" data-evpnew>➕ Pridať človeka</button></div>
  <div class="s">Zamestnanec: hrubá mzda, úväzok, stupeň náročnosti (minimálny mzdový nárok), podpísané vyhlásenie na nezdaniteľnú časť a deti na daňový bonus. Živnostník: sadzba za deň alebo paušál – platí sa na faktúru.</div>`;
  if(E.edit==="p0")h+=pForm({});
  return h+`<div class="agl">${P.map(p=>E.edit==="p"+p.id?pForm(p):`<div class="card evppl${p.aktivny?"":" off"}"><div class="row"><b>${e(p.meno)}</b><span class="pill ${p.druh==="szco"?"w":"b"}">${p.druh==="szco"?"živnostník":"zamestnanec"}</span><small>${e(p.firma)}</small>${p.aktivny?"":`<span class="pill g">neaktívny</span>`}<button type="button" class="evmini" data-evpe="${p.id}">✏️</button></div>
    <div class="trlw">${p.druh==="szco"?`<span>${p.pausal?`paušál <b>${eur(p.pausal)}</b>`:`sadzba <b>${eur(p.sadzba||0)}</b>/deň`}</span>${p.ico?`<span>IČO ${e(p.ico)}</span>`:""}`:`<span>hrubá <b>${eur(p.hruba||0)}</b></span><span>úväzok ${f2(p.uvazok,0)} h</span><span>${p.stupen}. stupeň</span><span>${p.nczd?"NČZD ✓":"bez NČZD"}</span>${p.deti15+p.deti18?`<span>deti ${p.deti15}+${p.deti18}</span>`:""}${p.dochodca?"<span>dôchodca</span>":""}`}</div></div>`).join("")}</div>`}
function pForm(p){const sz=p.druh==="szco",ch=(n,l,v)=>`<label class="evck"><input type="checkbox" name="${n}"${v?" checked":""}> ${l}</label>`;
  return `<form class="card f" data-evperson="${p.id||""}"><div class="w t">${p.id?"✏️ "+e(p.meno):"➕ Nový človek"}</div>
  <label>Meno a priezvisko<input name="meno" required value="${e(p.meno||"")}"></label>
  <label>Druh<select name="druh"><option value="zam"${!sz?" selected":""}>Zamestnanec (pracovný pomer)</option><option value="szco"${sz?" selected":""}>Živnostník (faktúra)</option></select></label>
  <label>Firma<select name="firma">${["ERNTE","VALKO"].map(f=>`<option${(p.firma||"ERNTE")===f?" selected":""}>${f}</option>`).join("")}</select></label>
  <label>Hrubá mzda €/mes.<input name="hruba" inputmode="decimal" value="${iv(p.hruba)}"></label>
  <label>Úväzok hod./týždeň<input name="uvazok" inputmode="decimal" value="${iv(p.uvazok??40)}"></label>
  <label>Stupeň náročnosti práce (1–6)<input name="stupen" inputmode="numeric" value="${iv(p.stupen??1)}"><small>traktorista spravidla 2.–3. stupeň</small></label>
  <label>Deti do 15 rokov<input name="deti15" inputmode="numeric" value="${iv(p.deti15??0)}"></label><label>Deti 15–18 rokov<input name="deti18" inputmode="numeric" value="${iv(p.deti18??0)}"></label>
  <label>Stravné €/deň<input name="strava_den" inputmode="decimal" value="${iv(p.strava_den)}" placeholder="4,84"><small>2026: 3,84 – 5,12 € bez dane</small></label>
  <label>Sadzba živnostník €/deň<input name="sadzba" inputmode="decimal" value="${iv(p.sadzba)}"></label><label>Paušál živnostník €/mes.<input name="pausal" inputmode="decimal" value="${iv(p.pausal)}"></label>
  <label>IČO živnostníka<input name="ico" value="${e(p.ico||"")}"></label>
  ${ch("nczd","Podpísal vyhlásenie na nezdaniteľnú časť (NČZD)",p.nczd??true)}${ch("dochodca","Poberá starobný dôchodok",p.dochodca)}${ch("aktivny","Aktívny (pracuje u nás)",p.aktivny??true)}
  <label class="w">Poznámka<input name="pozn" value="${e(p.pozn||"")}"></label>
  <div class="w btns"><button class="lime" type="submit">💾 Uložiť</button><button type="button" data-evcancel>Zrušiť</button></div></form>`}

// ---------- výplatná páska a rekapitulácia ----------
const FIRM={ERNTE:{name:"ERNTE spol. s r.o.",addr:"Zbudza 141, 072 23 Zbudza",ico:"52 341 356"},VALKO:{name:"VALKO s.r.o.",addr:"Zbudza 141, 072 23 Zbudza",ico:"53 365 241"}};
function printW(title,body){const w=window.open("","_blank");if(!w){tst("Povoľte vyskakovacie okná pre tlač.");return}
  w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${e(title)}</title><style>@page{size:A4;margin:14mm}body{font:12px/1.45 "Segoe UI",Arial,sans-serif;color:#111;margin:0}h1{font-size:18px;margin:0 0 4px}
  .hd{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #3f6212;padding-bottom:8px;margin-bottom:10px}table{width:100%;border-collapse:collapse;margin-top:6px}td,th{border-bottom:1px solid #ddd;padding:5px 6px;text-align:left}th{background:#f3f5ef;font-size:11px}
  .r{text-align:right;white-space:nowrap}tr.t td{font-weight:800;border-top:2px solid #333}.sub{background:#f6f6f6;font-weight:700}.note{margin-top:14px;color:#444;font-size:10.5px;border-top:1px solid #ccc;padding-top:8px}.slip{page-break-after:always;max-width:640px}
  .btn{position:fixed;right:14px;bottom:14px;padding:10px 16px;font-weight:700;border:0;border-radius:8px;background:#3f6212;color:#fff}@media print{.btn{display:none}}</style></head><body><button class="btn" onclick="print()">Tlačiť / PDF</button>${body}</body></html>`);
  w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(x){}},400)}
function slipHTML(y){const p=person(y.person_id),c=y.calc||{},F=FIRM[p.firma]||FIRM.ERNTE,r=(l,v,neg)=>v?`<tr><td>${l}</td><td class="r">${neg?"−":""}${eur(v)}</td></tr>`:"";
  return `<div class="slip"><div class="hd"><div><h1>Výplatná páska</h1><b>${e(p.meno)}</b><br>za obdobie: ${e(mTxt(String(y.mes).slice(0,7)))}</div><div style="text-align:right"><b>${e(F.name)}</b><br>${e(F.addr)}<br>IČO ${e(F.ico)}</div></div>
  <table><tr class="sub"><td colspan="2">Odpracované</td></tr><tr><td>Pracovné dni v mesiaci / odpracované</td><td class="r">${c.prac_dni} / ${f2(c.strava_dni,1)}</td></tr>${y.dni_dov?`<tr><td>Dovolenka dni</td><td class="r">${f2(y.dni_dov,1)}</td></tr>`:""}${y.dni_pn?`<tr><td>PN dni</td><td class="r">${f2(y.dni_pn,1)}</td></tr>`:""}
  <tr class="sub"><td colspan="2">Hrubá mzda</td></tr>${r("Základná mzda",c.zaklad)}${r("Práca na poli",c.pole)}${r("Príplatok sobota",c.pri_so)}${r("Príplatok nedeľa",c.pri_ne)}${r("Príplatok noc",c.pri_noc)}${r("Nadčas",c.pri_nad)}${r("Sviatok",c.pri_sv)}${r("Prémia / odmena",c.bonus)}${r("Stravné nad limit",c.strava_nad)}
  <tr class="t"><td>Hrubá mzda spolu</td><td class="r">${eur(c.hruba)}</td></tr>${r("Náhrada pri PN",c.nahrada_pn)}
  <tr class="sub"><td colspan="2">Zrážky</td></tr>${r("Sociálne poistenie",c.sp_zam,1)}${r("Zdravotné poistenie",c.zp_zam,1)}<tr><td>Základ dane / nezdaniteľná časť</td><td class="r">${eur(c.zd)} / ${eur(c.nczd)}</td></tr>${r("Preddavok na daň",c.dan,1)}
  <tr class="t"><td>Čistá mzda</td><td class="r">${eur(c.cista)}</td></tr>${r("Daňový bonus na deti",c.bonus_deti)}${r("Príspevok na stravovanie",(c.strava||0)-(c.strava_nad||0))}${r("Zrážky zo mzdy",c.zrazky,1)}${r("Vyplatená záloha",c.zaloha,1)}
  <tr class="t"><td>K výplate na účet</td><td class="r">${eur(c.k_vyplate)}</td></tr>
  <tr class="sub"><td colspan="2">Zamestnávateľ odvádza za zamestnanca</td></tr>${r("Sociálne poistenie",c.sp_zav)}${r("Zdravotné poistenie",c.zp_zav)}</table>
  <div class="note">Výpočet podľa sadzieb roku ${String(y.mes).slice(0,4)} (zákon 595/2003 o dani z príjmov, 461/2003 o sociálnom poistení, 580/2004 o zdravotnom poistení, Zákonník práce). Náhradu pri PN, dohody, exekúcie a ročné zúčtovanie over s mzdovou účtovníčkou.</div></div>`}
function rekHTML(m){const L=monthRows(m),Z=L.filter(y=>person(y.person_id).druh!=="szco"),S=L.filter(y=>person(y.person_id).druh==="szco");
  return `<div class="hd"><div><h1>Rekapitulácia miezd – ${e(mTxt(m))}</h1></div><div style="text-align:right">vyhotovené ${e(new Date().toLocaleDateString("sk-SK"))}</div></div>
  <table><thead><tr><th>Meno</th><th class="r">Hrubá</th><th class="r">SP zam.</th><th class="r">ZP zam.</th><th class="r">Daň</th><th class="r">Bonus</th><th class="r">Na účet</th><th class="r">SP firma</th><th class="r">ZP firma</th><th class="r">Cena práce</th></tr></thead><tbody>
  ${Z.map(y=>{const c=y.calc||{};return `<tr><td>${e(person(y.person_id).meno)}</td>${["hruba","sp_zam","zp_zam","dan","bonus_deti","k_vyplate","sp_zav","zp_zav","cena_prace"].map(k=>`<td class="r">${f2(c[k])}</td>`).join("")}</tr>`}).join("")}</tbody>
  <tfoot><tr class="t"><td>Spolu</td>${["hruba","sp_zam","zp_zam","dan","bonus_deti","k_vyplate","sp_zav","zp_zav","cena_prace"].map(k=>`<td class="r">${f2(sumC(Z,k))}</td>`).join("")}</tr></tfoot></table>
  <table style="margin-top:14px;max-width:420px"><tr><td>Sociálna poisťovňa spolu</td><td class="r">${eur(sumC(Z,"odvod_sp"))}</td></tr><tr><td>Zdravotné poisťovne spolu</td><td class="r">${eur(sumC(Z,"odvod_zp"))}</td></tr><tr><td>Daňový úrad (preddavky − bonus)</td><td class="r">${eur(sumC(Z,"odvod_dan"))}</td></tr></table>
  ${S.length?`<h1 style="margin-top:18px;font-size:15px">Živnostníci (na faktúru)</h1><table><thead><tr><th>Meno</th><th>Faktúra</th><th class="r">Dni</th><th class="r">Suma</th></tr></thead><tbody>${S.map(y=>`<tr><td>${e(person(y.person_id).meno)}</td><td>${e(y.faktura||"chýba")}</td><td class="r">${f2(y.dni,1)}</td><td class="r">${f2((y.calc||{}).faktura_suma)}</td></tr>`).join("")}</tbody></table>`:""}
  <div class="note">Zdravotné poistenie sa odvádza každej poisťovni zvlášť podľa poistenca. Podklad pre účtovníčku – nie je to mzdový list.</div>`}

// ================= PREHĽAD (majiteľ) =================
function prehlHTML(){if(!E.ent){loadEnt();return `<div class="card"><div class="s">Načítavam…</div></div>`}if(!E.pay){loadPay();return `<div class="card"><div class="s">Načítavam…</div></div>`}
  const Y=String(E.y),R=(E.ent||[]).filter(r=>String(r.d).startsWith(Y)),P=(E.pay||[]).filter(y=>String(y.mes).startsWith(Y));
  const yrs=[...new Set((E.ent||[]).map(r=>+String(r.d).slice(0,4)).concat((E.pay||[]).map(y=>+String(y.mes).slice(0,4))))].sort((a,b)=>b-a);
  const M=[...Array(12)].map((_,i)=>{const mm=Y+"-"+String(i+1).padStart(2,"0"),r=R.filter(x=>x.d.startsWith(mm)),p=P.filter(y=>String(y.mes).startsWith(mm));
    const vyn=r.filter(x=>x.typ==="zisk").reduce((s,x)=>s+(+x.suma||0),0),nk=r.filter(x=>x.typ==="naklad"&&!presun(x.kat)).reduce((s,x)=>s+(+x.suma||0),0);
    const mz=p.filter(y=>person(y.person_id).druh!=="szco").reduce((s,y)=>s+(+(y.calc||{}).cena_prace||0),0),sz=p.filter(y=>person(y.person_id).druh==="szco").reduce((s,y)=>s+(+(y.calc||{}).cena_prace||0),0);
    return {mm,vyn,nk,mz,sz,vys:vyn-nk-mz-sz}});
  const T=M.reduce((a,m)=>({vyn:a.vyn+m.vyn,nk:a.nk+m.nk,mz:a.mz+m.mz,sz:a.sz+m.sz,vys:a.vys+m.vys}),{vyn:0,nk:0,mz:0,sz:0,vys:0});
  const pres=R.filter(x=>x.typ==="naklad"&&presun(x.kat)).reduce((s,x)=>s+(+x.suma||0),0);
  let h=`<div class="btns seg2">${yrs.map(y=>`<button type="button" data-evy="${y}" aria-pressed="${y===E.y}">${y}</button>`).join("")}</div>
   <div class="hrk"><div class="ps"><small>Výnosy</small><b>${eur(T.vyn)}</b></div><div><small>Prevádzkové náklady</small><b>${eur(T.nk)}</b></div><div><small>Zamestnanci – cena práce</small><b>${eur(T.mz)}</b></div><div><small>Živnostníci</small><b>${eur(T.sz)}</b></div>
   <div class="${T.vys<0?"ng":"ps"}"><small>Výsledok</small><b>${eur(T.vys)}</b></div><div><small>Marža</small><b>${T.vyn?f2(T.vys/T.vyn*100,1)+" %":"–"}</b></div></div>
   ${pres?`<div class="s">💡 Výbery hotovosti ${eur(pres)} nie sú v nákladoch – sú to presuny peňazí. Náklad je až to, čo sa za hotovosť kúpilo (zapíš to ako nákup).</div>`:""}`;
  let cum=0;h+=`<div class="card trtab"><table><thead><tr><th>Mesiac</th><th class="r">Výnosy</th><th class="r">Prevádzka</th><th class="r">Zamestnanci</th><th class="r">Živnostníci</th><th class="r">Výsledok</th><th class="r">Kumulatívne</th></tr></thead><tbody>
   ${M.map(m=>{cum+=m.vys;return `<tr class="${m.vys<0?"neg":""}"><td>${e(MES[+m.mm.slice(5)-1])}</td><td class="r">${f2(m.vyn)}</td><td class="r">${f2(m.nk)}</td><td class="r">${f2(m.mz)}</td><td class="r">${f2(m.sz)}</td><td class="r"><b>${f2(m.vys)}</b></td><td class="r">${f2(cum)}</td></tr>`}).join("")}</tbody>
   <tfoot><tr><td><b>Spolu</b></td><td class="r"><b>${f2(T.vyn)}</b></td><td class="r"><b>${f2(T.nk)}</b></td><td class="r"><b>${f2(T.mz)}</b></td><td class="r"><b>${f2(T.sz)}</b></td><td class="r"><b>${f2(T.vys)}</b></td><td></td></tr></tfoot></table></div>`;
  const grp=(L,k)=>{const m=new Map;for(const x of L){const kk=(typeof k==="function"?k(x):x[k])||"(nezadané)";m.set(kk,(m.get(kk)||0)+(+x.suma||0))}return [...m].sort((a,b)=>b[1]-a[1])};
  const NK=R.filter(x=>x.typ==="naklad"&&!presun(x.kat)),VY=R.filter(x=>x.typ==="zisk");
  const tbl=(t,L,n)=>`<div class="card trtab"><table><thead><tr><th>${t}</th><th class="r">€</th></tr></thead><tbody>${L.slice(0,n||12).map(x=>`<tr><td>${e(x[0])}</td><td class="r">${f2(x[1])}</td></tr>`).join("")}</tbody></table></div>`;
  h+=`<div class="trdocs">${tbl("Náklady podľa kategórie",grp(NK,"kat"))}${tbl("Náklady podľa stroja / auta",grp(NK,x=>x.stroj&&String(x.stroj).trim().toLowerCase().replace(/^ford /,"ford ")))}${tbl("Výnosy podľa služby",grp(VY,x=>x.podkat||x.kat))}${tbl("Výnosy podľa partnera",grp(VY,"partner"))}
   ${tbl("Náklady podľa firmy",grp(NK,"firma"))}${tbl("Dodávatelia (náklady)",grp(NK,"partner"))}</div>
   <div class="s">Mzdy zamestnancov sú v celkovej cene práce (hrubá + odvody firmy + stravné + sociálny fond) – tak, ako ich naozaj platí firma.</div>`;
  return h}

// ================= VÝKONY =================
function vykHTML(){if(!E.ops){loadOps();return `<div class="card"><div class="s">Načítavam…</div></div>`}
  const O0=E.ops||[];if(O0.length&&!O0.some(o=>String(o.d||"").startsWith(String(E.y))))E.y=Math.max(...O0.map(o=>+String(o.d||"").slice(0,4)||0));
  const O=O0,yrs=[...new Set(O.map(o=>+String(o.d||"").slice(0,4)).filter(Boolean).concat([+today().slice(0,4)]))].sort((a,b)=>b-a),Y=String(E.y),L=O.filter(o=>String(o.d||"").startsWith(Y));
  const Z=L.filter(o=>o.druh==="zatva"),V=L.filter(o=>o.druh==="vapnenie"),CR=[...new Set(Z.map(o=>o.plodina))],ST=[...new Set(Z.map(o=>o.stroj))];
  const s=(A,f)=>A.filter(f).reduce((a,o)=>a+(+o.t||0),0),me=meMail();
  let h=`<div class="btns seg2">${yrs.map(y=>`<button type="button" data-evy="${y}" aria-pressed="${y===E.y}">${y}</button>`).join("")}</div>
  <details class="card trap"${E.edit==="op"?" open":""}><summary>➕ Zapísať výkon</summary><form class="f" id="evOp"><label>Druh<select name="druh"><option value="zatva">Žatva</option><option value="vapnenie">Vápnenie</option></select></label>
   <label>Dátum<input type="date" name="d" value="${today()}" required></label><label>Podnik / farmár<input name="podnik" required></label><label>Stroj<input name="stroj" list="evOS"></label>
   <label>Plodina<select name="plodina"><option value="">–</option>${["jačmeň","repka","pšenica","sója","kukurica","slnečnica"].map(c=>`<option>${c}</option>`).join("")}</select></label><label>Tony<input name="t" inputmode="decimal" required></label>
   <datalist id="evOS">${[...new Set(O.map(o=>o.stroj).filter(Boolean))].map(x=>`<option value="${e(x)}">`).join("")}</datalist><div class="w btns"><button class="lime">💾 Uložiť</button></div></form></details>`;
  h+=`<div class="hrk"><div><small>Žatva spolu</small><b>${f2(s(Z,()=>1),1)} t</b></div><div><small>Vápnenie spolu</small><b>${f2(s(V,()=>1),1)} t</b></div><div><small>Podnikov (vápnenie)</small><b>${new Set(V.map(o=>o.podnik)).size}</b></div></div>`;
  if(Z.length)h+=`<div class="card trtab"><table><thead><tr><th>Žatva – kombajn</th>${CR.map(c=>`<th class="r">${e(c)}</th>`).join("")}<th class="r">Spolu t</th></tr></thead><tbody>${ST.map(st=>`<tr><td>${e(st)}</td>${CR.map(c=>`<td class="r">${f2(s(Z,o=>o.stroj===st&&o.plodina===c),1)}</td>`).join("")}<td class="r"><b>${f2(s(Z,o=>o.stroj===st),1)}</b></td></tr>`).join("")}</tbody>
   <tfoot><tr><td><b>Spolu</b></td>${CR.map(c=>`<td class="r"><b>${f2(s(Z,o=>o.plodina===c),1)}</b></td>`).join("")}<td class="r"><b>${f2(s(Z,()=>1),1)}</b></td></tr></tfoot></table></div>`;
  const byP=(A)=>{const m=new Map;for(const o of A)m.set(o.podnik||"–",(m.get(o.podnik||"–")||0)+(+o.t||0));return [...m].sort((a,b)=>b[1]-a[1])};
  h+=`<div class="trdocs">${Z.length?`<div class="card trtab"><table><thead><tr><th>Žatva – podnik</th><th class="r">t</th></tr></thead><tbody>${byP(Z).map(x=>`<tr><td>${e(x[0])}</td><td class="r">${f2(x[1],1)}</td></tr>`).join("")}</tbody></table></div>`:""}
   ${V.length?`<div class="card trtab"><table><thead><tr><th>Vápnenie – podnik</th><th class="r">t</th></tr></thead><tbody>${byP(V).map(x=>`<tr><td>${e(x[0])}</td><td class="r">${f2(x[1],1)}</td></tr>`).join("")}</tbody></table></div>`:""}</div>`;
  const mine=L.filter(o=>OWN()||o.created_by===me).slice(0,30);
  if(mine.length)h+=`<details class="card trap"><summary>Posledné zápisy (${mine.length})</summary><div class="trtab"><table><tbody>${mine.map(o=>`<tr><td>${e(dSK(o.d))}</td><td>${o.druh==="zatva"?"žatva":"vápnenie"}</td><td>${e(o.podnik||"")}</td><td>${e(o.stroj||"")}</td><td>${e(o.plodina||"")}</td><td class="r">${f2(o.t,2)} t</td><td><button type="button" class="evmini" data-evodel="${o.id}" aria-label="Zmazať">🗑️</button></td></tr>`).join("")}</tbody></table></div></details>`;
  return h}

// ================= KONTROLA (majiteľ) =================
function konHTML(){if(!E.ent){loadEnt();return `<div class="card"><div class="s">Načítavam…</div></div>`}if(!E.pay){loadPay();return `<div class="card"><div class="s">Načítavam…</div></div>`}
  const X=(E.pay||[]).filter(y=>y.excel_cost!=null),yrs=[...new Set(X.map(y=>String(y.mes).slice(0,4)))].sort();
  let h=`<div class="card"><div class="t">Čo bolo v Exceli zle a čo app robí správne</div><ol class="evol">
   <li><b>Zdravotné poistenie zamestnanca 4 %</b> → od 2025 je <b>5 %</b> (zamestnávateľ 11 %).</li>
   <li><b>Daň:</b> Excel rátal 19 % z (hrubá − 410,38 €). Správne je 19 % zo <b>základu dane = hrubá − odvody zamestnanca − nezdaniteľná časť</b> (2025: 479,48 €, 2026: 497,23 €), od 2026 pásma 19/25/30/35 %.</li>
   <li><b>Daňový bonus</b> 50 € na dieťa → správne <b>100 €</b> do 15 rokov, 50 € 15–18 rokov, s krátením pri vyššom príjme.</li>
   <li><b>Náklad na mzdy</b> = súčet hrubej + odvodov zamestnanca + dane + bonusu – odvody a daň sa započítali <b>dvakrát</b> a <b>chýbali odvody firmy</b> (SP 25,2 % + ZP 11 %). App počíta <b>cenu práce</b> = hrubá + odvody firmy + stravné + sociálny fond 0,6 %.</li>
   <li><b>Čistá mzda s príplatkami</b> pripočítala pole, prémie a zrážky <b>druhýkrát</b>; zrážky (zálohy, exekúcie) sa strhávajú z čistej, nie z hrubej.</li>
   <li><b>Stravné</b> sa platilo aj ľuďom s nulovou mzdou a za pevných 21/22 dní (raz aj −3,5 dňa). App ráta podľa odpracovaných dní a stráži daňový limit (2025: 4,57 €, 2026: 5,12 €/deň) – 4,84 € v roku 2025 bolo nad limitom.</li>
   <li><b>Výbery hotovosti</b> boli v nákladoch – nie sú to náklady, iba presun peňazí.</li>
   <li><b>Dátumy:</b> časť riadkov v hárku 2026 mala rok 2025 – v prehľadoch Excelu chýbali v oboch rokoch. Preklepy app zaradila do 2026, neskoro zapísané faktúry 2025 ostali v 2025 (⚠️ pri zápise).</li>
   <li><b>Prehľad 2026</b> rátal október–december ako hotové mzdy (odhad). App ráta iba skutočné mesiace.</li>
   <li><b>Žatva:</b> súčet v hlavičke rátal iba 4 z 9 sekcií – app sčíta všetky záznamy.</li></ol></div>`;
  for(const yr of yrs){const L=X.filter(y=>String(y.mes).startsWith(yr)),ex=L.reduce((s,y)=>s+(+y.excel_cost||0),0),ok=L.reduce((s,y)=>s+(+(y.calc||{}).cena_prace||0),0);
    const net=L.filter(y=>person(y.person_id).druh!=="szco"),exn=net.reduce((s,y)=>s+(+y.excel_net||0),0),okn=net.reduce((s,y)=>s+(+(y.calc||{}).k_vyplate||0),0);
    h+=`<div class="hrk"><div><small>Mzdy ${yr} – náklad v Exceli</small><b>${eur(ex)}</b></div><div class="ng"><small>Správna cena práce</small><b>${eur(ok)}</b></div><div><small>Rozdiel</small><b>${eur(ok-ex)}</b></div><div><small>Na účty: Excel / podľa zákona</small><b>${f2(exn,0)} / ${f2(okn,0)} €</b></div></div>`}
  const fl=(E.ent||[]).filter(r=>r.flag),pres=(E.ent||[]).filter(r=>presun(r.kat)),vypl=(E.ent||[]).filter(r=>/vyplat/i.test(r.kat||""));
  const lm=[...new Set((E.pay||[]).map(y=>String(y.mes).slice(0,7)))].sort().pop()||"",low=[...new Set((E.pay||[]).filter(y=>String(y.mes).startsWith(lm)&&((y.calc||{}).warn||[]).some(w=>/minimáln/.test(w))).map(y=>person(y.person_id).meno))];
  const both=[];const byM=new Map;for(const y of (E.pay||[])){const p=person(y.person_id),k=String(y.mes).slice(0,7)+"|"+String(p.meno||"").toLowerCase();byM.set(k,(byM.get(k)||new Set).add(p.druh))}
  for(const [k,s] of byM)if(s.size>1)both.push(k.split("|"));
  h+=`<div class="card"><div class="t">Na kontrolu</div><ul class="evol">
   ${both.length?`<li>⚠️ <b>Ten istý človek ako zamestnanec aj živnostník v tom istom mesiaci:</b> ${both.map(b=>e(b[1])+" ("+e(b[0])+")").join(", ")}. Pri rovnakej práci je to riziko nelegálnej závislej práce – rozhodni jedno.</li>`:""}
   <li>👷 <b>Živnostníci</b> pracujú denne na poli za dennú sadzbu. Ak pracujú podľa pokynov, v pracovnom čase a na náradí firmy, inšpektorát to môže posúdiť ako <b>závislú prácu</b> (§ 1 ods. 2 Zákonníka práce) – pokuta až 200 000 €. Odporúčam pracovný pomer alebo dohodu; poraď sa s právnikom.</li>
   ${vypl.length?`<li>💶 V denníku je ${vypl.length}× kategória „vyplata“ (${eur(vypl.reduce((s,r)=>s+(+r.suma||0),0))}) – over, či nie je aj vo výplatách (dvojitý náklad).</li>`:""}
   <li>🏦 Výbery hotovosti mimo nákladov: ${pres.length} zápisov, ${eur(pres.reduce((s,r)=>s+(+r.suma||0),0))}.</li>
   <li>⚠️ Opravené zápisy pri importe: ${fl.length} (v denníku označené ⚠️).</li>
   ${low.length?`<li>📉 <b>Pod minimálnym mzdovým nárokom</b> (pri zadanom úväzku): ${low.map(e).join(", ")} – doplň skutočný úväzok alebo uprav mzdu.</li>`:""}
   <li>📄 Pri mzdách ešte doplň v „Ľudia a podmienky“: kto podpísal vyhlásenie na nezdaniteľnú časť, počet a vek detí, úväzok, dôchodcov a stupeň náročnosti pre traktoristov.</li></ul></div>`;
  const PR=(E.par||[]).slice().sort((a,b)=>b.rok-a.rok);
  if(PR.length){const K=[["mm","Minimálna mzda €"],["mm_h","Minimálna hodinová mzda €"],["nczd","Nezdaniteľná časť €/mes."],["zp_zam","ZP zamestnanec"],["zp_zav","ZP zamestnávateľ"],["vz_max","Max. vymeriavací základ SP €"],["bon15","Daňový bonus do 15 r. €"],["bon_lim","Krátenie bonusu od ZD €/mes."],["strav_den","Stravné firmy €/deň"],["pole","Práca na poli €/deň"]];
    h+=`<div class="card trtab evsad"><table><thead><tr><th>Sadzby</th>${PR.map(p=>`<th class="r">${p.rok}</th>`).join("")}</tr></thead><tbody>${K.map(k=>`<tr><td>${k[1]}</td>${PR.map(p=>{const v=p.p[k[0]];return `<td class="r">${typeof v==="number"&&v<1?f2(v*100,1)+" %":f2(v,v%1?2:0)}</td>`}).join("")}</tr>`).join("")}
     <tr><td>Pásma dane (mesačný základ)</td>${PR.map(p=>`<td class="r">${(p.p.pasma||[]).map(b=>(b[1]*100)+" %"+(b[0]?" do "+f2(b[0]):"")).join("<br>")}</td>`).join("")}</tr></tbody></table></div>
     <div class="s">${PR.map(p=>`<b>${p.rok}:</b> ${e(p.zdroj||"")}`).join("<br>")}</div>
     <form class="card f" id="evPar"><div class="w t">Firemné nastavenie ${PR[0].rok}</div><label>Stravné €/deň<input name="strav_den" inputmode="decimal" value="${iv(PR[0].p.strav_den)}"></label><label>Práca na poli €/deň<input name="pole" inputmode="decimal" value="${iv(PR[0].p.pole)}"></label><div class="w btns"><button class="lime">💾 Uložiť</button></div>
     <div class="w s">Zákonné sadzby menia iba zákony – pri novom roku ich doplním. Nevyplatené mesiace sa po zmene prepočítajú.</div></form>`}
  return h+`<div class="s">⚖️ Nie som daňový poradca ani právnik – výpočty sú podľa platných sadzieb, ale mzdy, PN a ročné zúčtovanie nechaj skontrolovať mzdovej účtovníčke.</div>`}

// ================= UDALOSTI =================
document.addEventListener("click",async ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(x=g("[data-evsec]")){E.sec=x.dataset.evsec;E.edit=null;E.open=null;E.pv="";rr();window.scrollTo({top:0});return}
  if(typeof TAB==="undefined"||TAB!=="evid")return;
  if(g("[data-evnew]")){E.edit=0;rr();return}
  if(x=g("[data-evedit]")){E.edit=+x.dataset.evedit;rr();window.scrollTo({top:0,behavior:"smooth"});return}
  if(g("[data-evcancel]")){E.edit=null;rr();return}
  if(g("[data-evmore]")){E.lim+=300;rr();return}
  if(x=g("[data-evm]")){const k=+x.dataset.evm;E.m=k?mAdd(E.m,k):curM();E.open=null;rr();return}
  if(x=g("[data-evy]")){E.y=+x.dataset.evy;rr();return}
  if(x=g("[data-evdel]")){if(!confirmEv("Zmazať tento zápis?"))return;const r=await sb.from("ev_entries").delete().eq("id",+x.dataset.evdel);if(r.error){tst("⚠️ "+r.error.message);return}E.ent=E.ent.filter(y=>y.id!==+x.dataset.evdel);E.edit=null;tst("Zmazané.");rr();return}
  if(x=g("[data-evodel]")){const r=await sb.from("ev_ops").delete().eq("id",+x.dataset.evodel);if(r.error){tst("⚠️ "+r.error.message);return}E.ops=E.ops.filter(y=>y.id!==+x.dataset.evodel);rr();return}
  if(x=g("[data-evop]")){const id=+x.dataset.evop;E.open=E.open===id?null:id;rr();return}
  if(x=g("[data-evpv]")){E.pv=x.dataset.evpv;E.edit=null;rr();return}
  if(g("[data-evpnew]")){E.edit="p0";rr();return}
  if(x=g("[data-evpe]")){E.edit="p"+x.dataset.evpe;rr();return}
  if(x=g("[data-evopen]")){busy(x,true);const r=await sb.rpc("ev_month_open",{m:E.m+"-01"});busy(x,false);if(r.error){tst("⚠️ "+r.error.message);return}tst(r.data?`Pridaných ${r.data} ľudí.`:"Všetci aktívni už sú v mesiaci.");E.doch=null;await loadPay();return}
  if(x=g("[data-evst]")){const r=await sb.from("ev_pay").update({stav:x.dataset.evst}).eq("id",+x.dataset.id).select().single();if(r.error){tst("⚠️ "+r.error.message);return}repPay(r.data);return}
  if(x=g("[data-evall]")){const st=x.dataset.evall,L=monthRows(E.m).filter(y=>y.stav!==st&&!(st==="schvalene"&&y.stav==="vyplatene"));if(!L.length){tst("Nič na zmenu.");return}
    busy(x,true);const r=await sb.from("ev_pay").update({stav:st}).in("id",L.map(y=>y.id)).select();busy(x,false);if(r.error){tst("⚠️ "+r.error.message);return}(r.data||[]).forEach(repPay);tst("✓ Hotovo: "+L.length);return}
  if(x=g("[data-evpdel]")){if(!confirmEv("Odstrániť tohto človeka z mesiaca?"))return;const r=await sb.from("ev_pay").delete().eq("id",+x.dataset.evpdel);if(r.error){tst("⚠️ "+r.error.message);return}E.pay=E.pay.filter(y=>y.id!==+x.dataset.evpdel);rr();return}
  if(x=g("[data-evslip]")){const y=(E.pay||[]).find(z=>z.id===+x.dataset.evslip);if(y)printW("Výplatná páska "+person(y.person_id).meno,slipHTML(y));return}
  if(g("[data-evrek]")){const Z=monthRows(E.m);printW("Rekapitulácia "+mTxt(E.m),rekHTML(E.m)+Z.filter(y=>person(y.person_id).druh!=="szco").map(slipHTML).join(""));return}
});
function confirmEv(t){try{return window.confirm(t)}catch(x){return true}}
function repPay(row){const i=(E.pay||[]).findIndex(y=>y.id===row.id);if(i>=0)E.pay[i]=row;else E.pay.push(row);rr()}
document.addEventListener("change",ev=>{const f=ev.target.form;if(!f||f.id!=="evFlt")return;const d=new FormData(f);E.y=+d.get("y");E.fm=d.get("m");E.ft=d.get("t");E.fk=d.get("k");E.ff=d.get("f");E.lim=150;rr()});
document.addEventListener("input",ev=>{const f=ev.target.form;if(!f)return;
  if(f.id==="evFlt"&&ev.target.name==="q"){E.fq=ev.target.value;clearTimeout(E._q);E._q=setTimeout(()=>{rr();const i=document.querySelector("#evFlt [name=q]");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},350);return}
  if(f.classList&&f.classList.contains("evf")&&["mn","cena"].includes(ev.target.name)){const a=num(f.mn.value),b=num(f.cena.value);f.suma.placeholder=a!=null&&b!=null?f2(a*b):""}});
document.addEventListener("submit",async ev=>{const f=ev.target;if(!f.closest||typeof TAB==="undefined"||TAB!=="evid")return;
  const b=f.querySelector("button[type=submit],button:not([type])");
  if(f.classList.contains("evf")){ev.preventDefault();const d=new FormData(f),o={};for(const k of ["d","typ","firma","kat","podkat","pole","plodina","jed","partner","stroj","pozn"])o[k]=String(d.get(k)||"").trim()||null;
    for(const k of ["mn","cena","suma"])o[k]=num(d.get(k));if(o.suma==null)o.suma=o.mn!=null&&o.cena!=null?Math.round(o.mn*o.cena*100)/100:null;
    if(o.suma==null){tst("Zadaj sumu alebo množstvo a cenu.");return}if(!o.kat){tst("Zadaj kategóriu.");return}
    busy(b,true);const id=+f.dataset.event||0;let r;if(id){o.updated_at=new Date().toISOString();r=await sb.from("ev_entries").update(o).eq("id",id).select().single()}else r=await sb.from("ev_entries").insert(o).select().single();busy(b,false);
    if(r.error){tst("⚠️ "+r.error.message);return}if(id)E.ent=E.ent.map(y=>y.id===id?r.data:y);else E.ent.unshift(r.data);E.edit=null;tst("✓ Uložené.");rr();return}
  if(f.dataset.evdoch){ev.preventDefault();const d=new FormData(f),v={};for(const [k] of DF)if(d.has(k))v[k]=String(d.get(k)).replace(",",".").trim();
    busy(b,true);const r=await sb.rpc("ev_doch_save",{pid:+f.dataset.evdoch,m:E.m+"-01",v});busy(b,false);if(r.error){tst("⚠️ "+r.error.message);return}tst("✓ Dochádzka uložená.");E.doch=null;if(OWN())E.pay=null;rr();return}
  if(f.dataset.evpay){ev.preventDefault();const d=new FormData(f),o={},id=+f.dataset.evpay;const y=(E.pay||[]).find(z=>z.id===id),sz=person(y.person_id).druh==="szco";
    for(const [k] of (sz?PFS:PF)){const v=num(d.get(k));o[k]=v}const NN=["dni_dov","dni_pn","nahrada_pn","dni_pole","hod_so","hod_ne","hod_noc","hod_sv","hod_nad","bonus","zrazky","zaloha","odmeny"];for(const k of NN)if(k in o&&o[k]==null)o[k]=0;
    if(sz)o.faktura=String(d.get("faktura")||"").trim()||null;o.pozn=String(d.get("pozn")||"").trim()||null;
    busy(b,true);const r=await sb.from("ev_pay").update(o).eq("id",id).select().single();busy(b,false);if(r.error){tst("⚠️ "+r.error.message);return}repPay(r.data);tst("✓ Prepočítané podľa zákona.");return}
  if(f.dataset.evperson!=null){ev.preventDefault();const d=new FormData(f),o={meno:String(d.get("meno")).trim(),druh:d.get("druh"),firma:d.get("firma"),ico:String(d.get("ico")||"").trim()||null,pozn:String(d.get("pozn")||"").trim()||null,
      hruba:num(d.get("hruba")),uvazok:num(d.get("uvazok"))||40,stupen:Math.min(6,Math.max(1,parseInt(d.get("stupen"))||1)),deti15:parseInt(d.get("deti15"))||0,deti18:parseInt(d.get("deti18"))||0,
      strava_den:num(d.get("strava_den")),sadzba:num(d.get("sadzba")),pausal:num(d.get("pausal")),nczd:d.get("nczd")==="on",dochodca:d.get("dochodca")==="on",aktivny:d.get("aktivny")==="on"};
    busy(b,true);const id=+f.dataset.evperson||0;const r=id?await sb.from("ev_people").update(o).eq("id",id).select().single():await sb.from("ev_people").insert(o).select().single();busy(b,false);
    if(r.error){tst("⚠️ "+(/duplicate|unique/i.test(r.error.message)?"Tento človek už existuje.":r.error.message));return}E.edit=null;tst("✓ Uložené. Nevyplatené mesiace sa prepočítali.");await loadPay();return}
  if(f.id==="evOp"){ev.preventDefault();const d=new FormData(f),o={druh:d.get("druh"),d:d.get("d"),podnik:String(d.get("podnik")).trim(),stroj:String(d.get("stroj")||"").trim()||null,plodina:d.get("plodina")||null,t:num(d.get("t"))};
    if(!o.t){tst("Zadaj tony.");return}busy(b,true);const r=await sb.from("ev_ops").insert(o).select().single();busy(b,false);if(r.error){tst("⚠️ "+r.error.message);return}E.ops.unshift(r.data);E.edit="op";tst("✓ Zapísané.");rr();return}
  if(f.id==="evPar"){ev.preventDefault();const d=new FormData(f),PR=(E.par||[]).slice().sort((a,b)=>b.rok-a.rok)[0];if(!PR)return;const p={...PR.p,strav_den:num(d.get("strav_den"))??PR.p.strav_den,pole:num(d.get("pole"))??PR.p.pole};
    busy(b,true);const r=await sb.from("ev_param").update({p,updated_at:new Date().toISOString()}).eq("rok",PR.rok).select().single();busy(b,false);if(r.error){tst("⚠️ "+r.error.message);return}tst("✓ Uložené, nevyplatené mesiace prepočítané.");await loadPay();return}
});
})();
