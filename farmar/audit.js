// ===== 🧾 NEMENNÝ ZÁZNAM ZMIEN · ⏪ BODY OBNOVY · 🗑️ ZMAZANIE ÚČTU · 🎯 RIZIKOVÉ SKÓRE (príkaz majiteľa 6. 11. – Master Enterprise Prompt) =====
// • Tím (iba Martin): 🧾 Záznam zmien – kto, kedy, z akej IP a zariadenia zmenil ceny, zmluvy, lístky, podpisy, súhlasy, prístupy, nastavenia;
//   overenie reťaze SHA-256 a export CSV pre kontrolu (daňový úrad, PPA, ISCC). ⏪ Body obnovy nastavení – porovnať a vrátiť po položkách.
//   🗑️ Žiadosti o zmazanie účtu – vykonať / zamietnuť.
// • Farmári (majitelia): 🎯 Rizikové skóre farmárov – plnenie zmlúv, meškanie, kvalita, sporné lístky, náhradné nákupy, chýbajúce údaje.
// • Každý prihlásený: „🗑️ Zmazať účet a moje dáta“ pod aplikáciou (App Store / Google Play, GDPR čl. 17).
(function(){
const E=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IN=()=>typeof sb!=="undefined"&&sb&&typeof ME!=="undefined"&&!!ME&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const KID=()=>IN()&&/@junior\.ernte\.sk$/i.test(String(ME.email||""));
const MAIN=()=>IN()&&typeof MAIN_OK==="function"&&MAIN_OK()&&typeof ROLE!=="undefined"&&ROLE==="owner";
const OWN=()=>IN()&&typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||5000);else alert(t)};
const soon=f=>(window.ernteSoon||requestAnimationFrame)(f);
const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",year:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
const dd=x=>x?new Date(x).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"}):"";
const nofn=m=>/could not find the function|schema cache|does not exist/i.test(String(m||""));
const errT=m=>nofn(m)?"Zapína sa po aktualizácii databázy – o pár minút.":String(m||"chyba");
const TL={prices:"💶 Ceny",deals:"🤝 Zmluvy",deliveries:"⚖️ Vážne lístky",staff:"👥 Prístupy tímu",farmers:"👨‍🌾 Farmári",settings:"⚙️ Nastavenia cenníka",
  kalk_store:"💶 Cenník (úpravy, konkurencia)",ai_state:"⚙️ Nastavenia",sell_buyers:"🏆 Odberatelia",sale_contracts:"📑 Predajné zmluvy",gdpr_sign:"🛡️ Súhlasy GDPR",
  deal_signs:"✍️ Podpisy zmlúv",trader_portal:"🤝 Portály obchodníkov",deal_replace:"🔁 Náhradné nákupy",buyer_claims:"🧾 Reklamácie"};
const OP={I:"pridané",U:"zmenené",D:"zmazané"};
const UA=u=>{u=String(u||"");if(!u)return"";const d=/iPhone/.test(u)?"iPhone":/iPad/.test(u)?"iPad":/Android/.test(u)?(/SM-F9/.test(u)?"Galaxy Z Fold":"Android"):/Windows/.test(u)?"Windows":/Mac OS/.test(u)?"Mac":"zariadenie";
  const b=/Edg\//.test(u)?"Edge":/CriOS|Chrome\//.test(u)?"Chrome":/Firefox|FxiOS/.test(u)?"Firefox":/Safari/.test(u)?"Safari":"";return d+(b?" · "+b:"")};
const V=v=>{if(v==null)return"—";if(typeof v==="object"){if(v._sha256)return`(veľký údaj · odtlačok ${String(v._sha256).slice(0,10)}…)`;const s=JSON.stringify(v);return s.length>70?s.slice(0,70)+"…":s}
  const s=String(v);return s.length>70?s.slice(0,70)+"…":s};
function ridName(t,r){try{if(t==="deals"){const d=[].concat(STATE.deals||[],STATE.dealsArch||[],STATE.dealsTest||[]).find(x=>x.id===r);if(d)return d.no||r}
  if(t==="farmers"||t==="trader_portal"){const f=(STATE.farmers||[]).find(x=>x.id===r);if(f)return f.name}}catch(x){}return r}
function diffHTML(a){const d=a.diff||{};let L=[];
  if(a.op==="U"){for(const k of Object.keys(d)){const v=d[k];
      if(v&&v._zmeny){for(const s of Object.keys(v._zmeny)){const w=v._zmeny[s];
          if(Array.isArray(w))L.push(`${k}.${s}: ${V(w[0])} → ${V(w[1])}`);else L.push(`${k}.${s}: ${w&&w["+"]?"+"+w["+"].length+" ":""}${w&&w["-"]?"−"+w["-"].length:""} položiek`)}}
      else if(Array.isArray(v))L.push(`${k}: ${V(v[0])} → ${V(v[1])}`);else L.push(`${k}: ${V(v)}`)}}
  else{const pref=["no","com","tons","price","status","name","email","role","ver","net_kg","ticket","key","value","data"];const ks=Object.keys(d).sort((x,y)=>(pref.indexOf(x)<0?99:pref.indexOf(x))-(pref.indexOf(y)<0?99:pref.indexOf(y)));
    for(const k of ks){if(d[k]==null||k==="id")continue;L.push(`${k}: ${V(d[k])}`);if(L.length>=5)break}}
  const more=L.length>6?L.length-6:0;return L.slice(0,6).map(x=>`<span>${E(x)}</span>`).join("")+(more?`<span>… a ďalších ${more}</span>`:"")}

// ---------- stav ----------
const A={d:null,busy:false,at:0,tbl:"",q:"",od:"",do:"",ver:null,vb:false};
const S={list:null,busy:false,at:0,cur:null,diff:null,sel:{}};
const Z={list:null,busy:false,at:0};
const R={d:null,busy:false,at:0,all:false};
async function loadA(f){if(A.busy||(!f&&A.d&&Date.now()-A.at<90e3))return;A.busy=true;
  try{const r=await sb.rpc("audit_list",{p_tbl:A.tbl||null,p_q:A.q||null,p_from:A.od?new Date(A.od+"T00:00").toISOString():null,p_to:A.do?new Date(new Date(A.do+"T00:00").getTime()+864e5).toISOString():null,p_limit:150});
    A.d=r.error?{err:errT(r.error.message)}:r.data}catch(x){A.d={err:String(x)}}A.busy=false;A.at=Date.now();paint()}
async function loadS(f){if(S.busy||(!f&&S.list&&Date.now()-S.at<120e3))return;S.busy=true;try{const r=await sb.rpc("config_snap_list");S.list=r.error?{err:errT(r.error.message)}:r.data||[]}catch(x){S.list={err:String(x)}}S.busy=false;S.at=Date.now();paint()}
async function loadZ(f){if(Z.busy||(!f&&Z.list&&Date.now()-Z.at<120e3))return;Z.busy=true;try{const r=await sb.rpc("account_delete_list");Z.list=r.error?{err:errT(r.error.message)}:r.data||[]}catch(x){Z.list={err:String(x)}}Z.busy=false;Z.at=Date.now();paint()}
async function loadR(f){if(R.busy||(!f&&R.d&&Date.now()-R.at<300e3))return;R.busy=true;try{const r=await sb.rpc("farmer_risk");R.d=r.error?{err:errT(r.error.message)}:r.data||[]}catch(x){R.d={err:String(x)}}R.busy=false;R.at=Date.now();paint()}

// ---------- 🧾 záznam zmien ----------
function auditCard(){const d=A.d;const head=`<summary>🧾 Nemenný záznam zmien${d&&!d.err?` · ${Number(d.n||0).toLocaleString("sk-SK")} záznamov`:""}</summary>`;
  if(!d)return `<details class="card auc" id="auA" data-auo="A">${head}<p class="s">Načítavam…</p></details>`;
  if(d.err)return `<details class="card auc" id="auA" data-auo="A">${head}<p class="s">⚠️ ${E(d.err)}</p></details>`;
  const T=d.tbls||{},rows=d.rows||[];const vr=A.ver;
  return `<details class="card auc" id="auA" data-auo="A">${head}
   <p class="s">Každá zmena cien, zmlúv, vážnych lístkov, podpisov, súhlasov GDPR, prístupov a nastavení sa zapíše s časom, menom, IP adresou a zariadením. Záznam sa nedá zmeniť ani zmazať – každý riadok je zapečatený odtlačkom SHA-256 predchádzajúceho (reťaz) a denný odtlačok sa ukladá aj mimo databázy. Zapisuje sa od ${E(dd(d.from))}.</p>
   <div class="auf"><select data-auf="tbl"><option value="">Všetko</option>${Object.keys(TL).map(k=>`<option value="${k}"${A.tbl===k?" selected":""}>${E(TL[k])}${T[k]?` (${T[k]})`:""}</option>`).join("")}</select>
    <input type="search" data-auf="q" placeholder="Hľadať (číslo zmluvy, lístok, e-mail, IP)" value="${E(A.q)}">
    <label>od <input type="date" data-auf="od" value="${E(A.od)}"></label><label>do <input type="date" data-auf="do" value="${E(A.do)}"></label>
    <button type="button" data-aug="find">🔎 Hľadať</button></div>
   <div class="aub"><button type="button" data-aug="auto" aria-pressed="${A.q==="systém"}">🤖 Denník automatických akcií (AI a systém)</button><button type="button" data-aug="verify"${A.vb?" disabled":""}>✔️ Overiť reťaz</button><button type="button" data-aug="csv">⬇️ Export pre kontrolu (CSV)</button></div>
   ${vr?`<div class="auv ${vr.ok?"ok":"bad"}">${vr.err?`⚠️ ${E(vr.err)}`:vr.ok?`✅ Reťaz neporušená · ${Number(vr.n).toLocaleString("sk-SK")} zapečatených záznamov${vr.open?` · ${vr.open} čaká na zapečatenie (do minúty)`:""}${vr.anchor_ok===true?" · denný odtlačok mimo databázy sedí":vr.anchor_ok===false?" · ⚠️ denný odtlačok NESEDÍ":""}<small>posledný odtlačok ${E(String(vr.head||"").slice(0,24))}…</small>`
      :`⛔ Reťaz porušená: ${(vr.bad||[]).map(b=>`#${E(b.seq)} ${E(b.why)}`).join(" · ")}`}</div>`:""}
   ${rows.length?`<div class="aul">${rows.map(a=>`<div class="aui op${E(a.op)}"><div class="auh"><b>${E(TL[a.tbl]||a.tbl)} · ${E(OP[a.op]||a.op)}</b><small>${E(dt(a.at))}</small></div>
      <div class="aum">${E(ridName(a.tbl,a.rid))} · <b>${E(a.who||"")}</b>${a.ip?` · IP ${E(a.ip)}`:""}${a.ua?` · ${E(UA(a.ua))}`:""}${!a.ip&&a.q?` · ${E(String(a.q).slice(0,50))}`:""}</div>
      <div class="aud">${diffHTML(a)}</div></div>`).join("")}</div>${rows.length>=150?`<p class="s">Zobrazených posledných 150 – zúž výber dátumom alebo hľadaním. Export CSV obsahuje až 5 000 záznamov.</p>`:""}`
    :`<p class="s">Nič sa nenašlo.</p>`}</details>`}
async function verify(){A.vb=true;paint();try{const r=await sb.rpc("audit_verify");A.ver=r.error?{err:errT(r.error.message)}:r.data}catch(x){A.ver={err:String(x)}}A.vb=false;paint()}
async function csv(b){if(b)b.disabled=true;try{
  const r=await sb.rpc("audit_list",{p_tbl:A.tbl||null,p_q:A.q||null,p_from:A.od?new Date(A.od+"T00:00").toISOString():null,p_to:A.do?new Date(new Date(A.do+"T00:00").getTime()+864e5).toISOString():null,p_limit:5000});
  if(r.error)throw new Error(errT(r.error.message));const rows=(r.data&&r.data.rows)||[];if(!rows.length){say("Nie je čo exportovať.");return}
  const q=v=>{const s=v==null?"":typeof v==="object"?JSON.stringify(v):String(v);return /[";\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
  const H=["Poradie v reťazi","Čas (UTC)","Čas (SK)","Kto","IP adresa","Zariadenie","Oblasť","Akcia","Záznam","Zmena","Odtlačok SHA-256"];
  const L=[H.join(";")].concat(rows.slice().reverse().map(a=>[a.seq,a.at,dt(a.at),a.who,a.ip,UA(a.ua),String(TL[a.tbl]||a.tbl).replace(/^\S+\s/,""),OP[a.op]||a.op,ridName(a.tbl,a.rid),a.diff,a.h].map(q).join(";")));
  const f=new Date().toISOString().slice(0,10),od=A.od||String(rows[rows.length-1].at).slice(0,10),do_=A.do||f;
  const blob=new Blob(["﻿"+L.join("\r\n")],{type:"text/csv;charset=utf-8"});const u=URL.createObjectURL(blob);const x=document.createElement("a");x.href=u;x.download=`Záznam zmien ERNTE ${od} – ${do_}.csv`;document.body.appendChild(x);x.click();setTimeout(()=>{URL.revokeObjectURL(u);x.remove()},4000);
  say(`⬇️ Export: ${rows.length} záznamov.`,4000)}catch(x){say("Export sa nepodaril: "+(x&&x.message||x),7000)}finally{if(b)b.disabled=false}}

// ---------- ⏪ body obnovy ----------
const KN={auto:"🕑 denný",rucne:"📸 ručný",pred_obnovou:"↩️ pred obnovou"};
function snapCard(){const L=S.list;const head=`<summary>⏪ Body obnovy nastavení${Array.isArray(L)?` · ${L.length}`:""}</summary>`;
  if(!L)return `<details class="card auc" id="auS" data-auo="S">${head}<p class="s">Načítavam…</p></details>`;
  if(L.err)return `<details class="card auc" id="auS" data-auo="S">${head}<p class="s">⚠️ ${E(L.err)}</p></details>`;
  const df=S.diff;
  return `<details class="card auc" id="auS" data-auo="S">${head}
   <p class="s">Každý deň o 1:17 (iba keď sa niečo zmenilo), pred každou obnovou a kedykoľvek ručne sa uloží: cenník (± úpravy, konkurenčné ceny, automatický cenník, strop nákupu), nastavenia cenníka, upozornení a strážcov, modely odberateľov a prístupy tímu. Vrátiť sa dá ktorákoľvek položka zvlášť – ceny riadia modely, tie sa iba porovnajú. Obnovuješ iba ty.</p>
   <div class="aub"><button type="button" data-aug="snap">📸 Uložiť bod obnovy teraz</button></div>
   <div class="aus">${L.slice(0,25).map(s=>`<div class="ausr${S.cur===s.id?" on":""}"><div><b>${E(dt(s.at))}</b><small>${E(KN[s.kind]||s.kind)}${s.why?" · "+E(s.why):""} · ${E(s.who||"")}</small></div><button type="button" data-ausd="${s.id}">${S.cur===s.id?"Zavrieť":"Porovnať"}</button></div>
     ${S.cur===s.id?(!df?`<p class="s">Porovnávam…</p>`:df.err?`<p class="s">⚠️ ${E(df.err)}</p>`:`<div class="ausd">${(df.items||[]).length?`<p class="s">Odvtedy sa zmenilo ${df.items.length} položiek (bez zmeny ${df.same}). Zaškrtni, čo vrátiť na stav z ${E(dt(df.at))}:</p>
       ${df.items.map((it,i)=>`<label class="ausi${it.ok?"":" off"}"><input type="checkbox" data-ausi="${E(it.g+":"+it.k)}"${it.ok?"":" disabled"}${S.sel[it.g+":"+it.k]?" checked":""}><span><b>${E(it.name)}</b>${it.pozn?`<small>${E(it.pozn)}</small>`:""}<small>vtedy: ${E(it.old)}</small><small>teraz: ${E(it.new)}</small></span></label>`).join("")}
       <button type="button" class="pri" data-aug="restore">⏪ Obnoviť vybrané (${Object.keys(S.sel).filter(k=>S.sel[k]).length})</button>`:`<p class="s">✅ Od tohto bodu sa nič nezmenilo.</p>`}</div>`):""}`).join("")}</div></details>`}
async function snapDiff(id){if(S.cur===id){S.cur=null;S.diff=null;S.sel={};paint();return}S.cur=id;S.diff=null;S.sel={};paint();
  try{const r=await sb.rpc("config_snap_diff",{p_id:id});S.diff=r.error?{err:errT(r.error.message)}:r.data}catch(x){S.diff={err:String(x)}}paint()}
async function snapTake(b){if(b)b.disabled=true;try{const r=await sb.rpc("config_snap_take",{p_why:"Ručne – Martin",p_kind:"rucne"});if(r.error)throw new Error(errT(r.error.message));say("📸 Bod obnovy uložený.",3000);await loadS(true)}catch(x){say("Nepodarilo sa: "+(x&&x.message||x),7000)}finally{if(b)b.disabled=false}}
async function restore(b){const it=Object.keys(S.sel).filter(k=>S.sel[k]);if(!it.length){say("Najprv zaškrtni, čo vrátiť.");return}
  const nm=((S.diff&&S.diff.items)||[]).filter(x=>it.includes(x.g+":"+x.k)).map(x=>"• "+x.name).join("\n");
  if(!confirm(`Vrátiť na stav z ${dt(S.diff&&S.diff.at)}?\n\n${nm}\n\nPredtým sa uloží bod obnovy terajšieho stavu – dá sa to vrátiť.`))return;
  if(b)b.disabled=true;try{const r=await sb.rpc("config_snap_restore",{p_id:S.cur,p_items:it});if(r.error)throw new Error(errT(r.error.message));const d=r.data||{};
    say(`⏪ Obnovené: ${d.n||0} položiek.${(d.skip||[]).length?" Preskočené: "+d.skip.length+".":""} Predchádzajúci stav je v bode obnovy.`,8000);S.cur=null;S.diff=null;S.sel={};await loadS(true)}
  catch(x){say("Obnova sa nepodarila: "+(x&&x.message||x),8000)}finally{if(b)b.disabled=false}}

// ---------- 🗑️ žiadosti o zmazanie ----------
const ZS={nova:"🆕 nová",vykonana:"✅ vykonaná",zamietnuta:"✕ zamietnutá"};
function delCard(){const L=Z.list;const nw=Array.isArray(L)?L.filter(x=>x.status==="nova").length:0;
  const head=`<summary>🗑️ Žiadosti o zmazanie účtu${nw?` · ⚠️ ${nw} nové`:Array.isArray(L)?` · ${L.length}`:""}</summary>`;
  if(!L)return `<details class="card auc" id="auZ" data-auo="Z">${head}<p class="s">Načítavam…</p></details>`;
  if(L.err)return `<details class="card auc" id="auZ" data-auo="Z">${head}<p class="s">⚠️ ${E(L.err)}</p></details>`;
  return `<details class="card auc" id="auZ" data-auo="Z"${nw?" open":""}>${head}
   <p class="s">Každý prihlásený má pod aplikáciou tlačidlo „🗑️ Zmazať účet a moje dáta“ (vyžadujú ho App Store a Google Play, GDPR čl. 17). Vybaviť do 30 dní. Vykonanie zmaže prihlásenie a upozornenia; farmárovi bez zmlúv a lístkov aj osobné údaje. Zmluvy, lístky, zúčtovania a súhlas GDPR ostávajú – zákon o účtovníctve (10 rokov), DPH, ISCC.</p>
   ${L.length?`<div class="aus">${L.map(x=>`<div class="auz ${E(x.status)}"><div><b>${E(x.name||x.email)}</b><small>${E(x.email)} · ${E(x.kind==="tim"?"tím":x.kind==="farmar"?"farmár":x.kind)} · ${E(dt(x.at))}${x.ip?" · IP "+E(x.ip):""}</small>
      ${x.reason?`<small>Dôvod: ${E(x.reason)}</small>`:""}${x.kind==="farmar"?`<small>Zmluvy ${E(x.zml)} · lístky ${E(x.lis)}${(+x.zml||+x.lis)?" – ostanú v archíve":""}</small>`:""}
      <small>${E(ZS[x.status]||x.status)}${x.done_at?" "+E(dt(x.done_at)):""}${x.result?" · "+E(Object.values(x.result).join(" · ")):""}${x.note?" · "+E(x.note):""}</small></div>
      ${x.status==="nova"?`<div class="auzb"><button type="button" class="pri" data-auz="vykonat" data-id="${x.id}">✅ Vykonať</button><button type="button" data-auz="zamietnut" data-id="${x.id}">✕ Zamietnuť</button></div>`:""}</div>`).join("")}</div>`:`<p class="s">Zatiaľ žiadna žiadosť.</p>`}</details>`}
async function delResolve(b){const id=+b.dataset.id,act=b.dataset.auz,x=(Z.list||[]).find(y=>y.id===id);if(!x)return;let note=null;
  if(act==="vykonat"){if(!confirm(`Zmazať účet ${x.name||x.email}?\n\nZruší sa prihlásenie a upozornenia${x.kind==="farmar"&&!(+x.zml||+x.lis)?" a zmažú sa osobné údaje":""}. Toto sa nedá vrátiť.`))return;
    if(!confirm("Naozaj? Prihlásenie sa natrvalo zmaže."))return}
  else{note=prompt("Dôvod zamietnutia (napr. prebiehajúca zmluva):","");if(note===null)return}
  b.disabled=true;try{const r=await sb.rpc("account_delete_resolve",{p_id:id,p_act:act,p_note:note});if(r.error)throw new Error(errT(r.error.message));say(act==="vykonat"?"✅ Účet zmazaný.":"Žiadosť zamietnutá.",4000);await loadZ(true)}
  catch(e){say("Nepodarilo sa: "+(e&&e.message||e),8000);b.disabled=false}}

// ---------- 🎯 rizikové skóre ----------
const LV={vysoke:["🔴","vysoké"],stredne:["🟠","stredné"],nizke:["🟢","nízke"]};
function riskCard(){const d=R.d;const L=Array.isArray(d)?d:[];const hi=L.filter(x=>x.lvl==="vysoke").length,mid=L.filter(x=>x.lvl==="stredne").length;
  const head=`<summary>🎯 Rizikové skóre farmárov${Array.isArray(d)?` · 🔴 ${hi} · 🟠 ${mid}`:""}</summary>`;
  if(!d)return `<details class="card auc" id="auR" data-auo="R">${head}<p class="s">Počítam…</p></details>`;
  if(d.err)return `<details class="card auc" id="auR" data-auo="R">${head}<p class="s">⚠️ ${E(d.err)}</p></details>`;
  const V2=R.all?L:L.filter(x=>x.lvl!=="nizke");
  return `<details class="card auc" id="auR" data-auo="R">${head}
   <p class="s">0–100 bodov za posledných 18 mesiacov: nedodávky v uzavretých zmluvách nad toleranciu 5 % (do 35), zmluvy po termíne nedodané (do 16), nadodávky (do 6), vlhkosť nad normu (bez kukurice) a nečistoty nad 2 % (do 20), neuznané reklamácie (do 8), náhradné nákupy (do 15), chýbajúce IČO / IBAN / GDPR (do 8). 🔴 od 50, 🟠 od 25. Pomôcka pri novej zmluve – nie dôvod nikoho odmietnuť bez rozhovoru.</p>
   ${V2.length?`<div class="aus">${V2.map(x=>`<div class="aur ${E(x.lvl)}"><div class="aurs"><b>${E(x.score)}</b><small>${E((LV[x.lvl]||["",""])[0])} ${E((LV[x.lvl]||["",""])[1])}</small></div>
      <div><b>${E(x.name)}</b><small>Zmluvy ${E(x.zml.n)} · ${E(x.zml.t)} t · dodané ${E(x.zml.dod)} t${x.kval.n?` · lístky ${E(x.kval.n)}`:""}</small>${(x.why||[]).map(w=>`<small>• ${E(w)}</small>`).join("")}${x.zml.pod_no?`<small>Zmluvy: ${E(x.zml.pod_no)}</small>`:""}</div></div>`).join("")}</div>`
    :`<p class="s">✅ Žiadny farmár so stredným ani vysokým rizikom.</p>`}
   ${L.length>V2.length||R.all?`<button type="button" data-aug="rall">${R.all?"Iba rizikoví":`Zobraziť všetkých (${L.length})`}</button>`:""}</details>`}

// ---------- vloženie do obrazovky ----------
function put(id,h,after){let o=document.getElementById(id);if(o){if(o.dataset.h!==String(h.length)+":"+h.slice(-60)){const op=o.open;const t=document.createElement("div");t.innerHTML=h;const n=t.firstElementChild;n.dataset.h=String(h.length)+":"+h.slice(-60);
    if(op)n.open=true;const ae=document.activeElement;if(ae&&o.contains(ae)&&ae.matches("input,select,textarea"))return;o.replaceWith(n)}return}
  const t=document.createElement("div");t.innerHTML=h;const n=t.firstElementChild;n.dataset.h=String(h.length)+":"+h.slice(-60);if(after&&after.parentNode)after.after(n);else{const app=document.getElementById("app");if(app)app.prepend(n)}}
function anchor(){const app=document.getElementById("app");if(!app)return null;return document.getElementById("gdCard")||app.querySelector("nav.tabs")||app.querySelector(".hero")}
function paint(){try{
  const tab=typeof TAB!=="undefined"?TAB:"";
  if(MAIN()&&tab==="team"&&document.getElementById("app")){
    put("auA",auditCard(),anchor());put("auS",snapCard(),document.getElementById("auA"));put("auZ",delCard(),document.getElementById("auS"));
    loadA();loadS();loadZ()}
  if(OWN()&&tab==="farm"&&document.getElementById("app")){put("auR",riskCard(),document.querySelector("#app nav.tabs")||null);loadR()}
  link()}catch(x){}}
// ---------- 🗑️ Zmazať účet a moje dáta (každý prihlásený) ----------
function link(){const p=document.querySelector(".privl");if(!p)return;let a=document.getElementById("auDel");const on=IN()&&!KID()&&!!document.getElementById("outBtn")&&!document.getElementById("outBtn").hidden;
  if(!on){if(a){a.previousSibling&&a.previousSibling.nodeType===3&&a.previousSibling.remove();a.remove()}return}
  if(!a){p.appendChild(document.createTextNode(" · "));a=document.createElement("a");a.id="auDel";a.href="#zmazat-ucet";a.textContent="🗑️ Zmazať účet a moje dáta";p.appendChild(a)}}
async function delModal(){let st={};try{const r=await sb.rpc("account_delete_status");if(!r.error&&r.data)st=r.data}catch(x){}
  const m=document.createElement("div");m.className="admod";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");
  const pend=st.status==="nova";
  m.innerHTML=`<div class="adbox"><div class="adhd"><b>🗑️ Zmazať účet a moje dáta</b><button type="button" class="adx" data-adx aria-label="Zavrieť">✕</button></div>
   ${pend?`<p>✅ Žiadosť ste odoslali ${E(dt(st.at))}. Vybavíme ju najneskôr do 30 dní a dáme vám vedieť.</p><button type="button" data-adx>Zavrieť</button>`
   :`<p>Po potvrdení pošleme žiadosť správcovi údajov (ERNTE spol. s r.o.). Vybavíme ju najneskôr do 30 dní (GDPR čl. 12 a 17).</p>
    <p><b>Zmažeme:</b> prihlásenie do aplikácie, upozornenia do mobilu a osobné údaje, ktoré nepotrebujeme na doklady.</p>
    <p><b>Ponecháme iba to, čo nám ukladá zákon:</b> uzavreté zmluvy, vážne lístky, zúčtovania a faktúry (10 rokov – zákon o účtovníctve a zákon o DPH), záznamy pre certifikáciu ISCC a záznam o súhlase GDPR. Po uplynutí lehoty ich zmažeme.</p>
    <label class="adl"><span>Dôvod (nepovinné)</span><textarea data-adr rows="2" maxlength="500"></textarea></label>
    <label class="adl"><span>Na potvrdenie napíšte <b>ZMAZAŤ</b></span><input data-adc autocomplete="off" autocapitalize="characters"></label>
    <div class="adb"><button type="button" data-adx>Zrušiť</button><button type="button" class="pri" data-ads disabled>🗑️ Odoslať žiadosť</button></div>`}</div>`;
  document.body.appendChild(m);document.documentElement.classList.add("adopen");
  const close=()=>{m.remove();document.documentElement.classList.remove("adopen")};
  m.addEventListener("click",async e=>{if(e.target===m||e.target.closest("[data-adx]")){close();return}const s=e.target.closest("[data-ads]");if(!s)return;s.disabled=true;
    try{const r=await sb.rpc("account_delete_request",{p_reason:(m.querySelector("[data-adr]")||{}).value||null});if(r.error)throw new Error(errT(r.error.message));close();say("✅ Žiadosť o zmazanie účtu odoslaná. Vybavíme ju do 30 dní.",7000)}
    catch(x){say("Nepodarilo sa: "+(x&&x.message||x),8000);s.disabled=false}});
  const c=m.querySelector("[data-adc]");if(c)c.addEventListener("input",()=>{const ok=c.value.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"")==="ZMAZAT";m.querySelector("[data-ads]").disabled=!ok})}

// ---------- udalosti ----------
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#auDel")){e.preventDefault();if(IN())delModal();return}
  const g=t.closest("[data-aug]");if(g&&(MAIN()||(OWN()&&g.dataset.aug==="rall"))){e.preventDefault();const k=g.dataset.aug;
    if(k==="find"){const w=g.closest("#auA");if(w){w.querySelectorAll("[data-auf]").forEach(x=>{A[x.dataset.auf]=x.value})}A.ver=null;loadA(true)}
    else if(k==="auto"){A.q=A.q==="systém"?"":"systém";A.ver=null;loadA(true)}
    else if(k==="verify")verify();else if(k==="csv")csv(g);else if(k==="snap")snapTake(g);else if(k==="restore")restore(g);else if(k==="rall"){R.all=!R.all;paint()}return}
  const sd=t.closest("[data-ausd]");if(sd&&MAIN()){e.preventDefault();snapDiff(+sd.dataset.ausd);return}
  const z=t.closest("[data-auz]");if(z&&MAIN()){e.preventDefault();delResolve(z);return}},true);
document.addEventListener("change",e=>{const t=e.target;if(!t.closest)return;const i=t.closest("[data-ausi]");if(i){S.sel[i.dataset.ausi]=i.checked;const b=document.querySelector('#auS [data-aug="restore"]');if(b)b.textContent=`⏪ Obnoviť vybrané (${Object.keys(S.sel).filter(k=>S.sel[k]).length})`;return}
  const f=t.closest("[data-auf]");if(f){A[f.dataset.auf]=f.value;if(f.tagName==="SELECT"){A.ver=null;loadA(true)}}},true);
document.addEventListener("keydown",e=>{const f=e.target&&e.target.closest&&e.target.closest('[data-auf="q"]');if(f&&e.key==="Enter"){e.preventDefault();A.q=f.value;A.ver=null;loadA(true)}},true);
if(location.hash==="#zmazat-ucet")setTimeout(()=>{if(IN())delModal()},2500);
let q=0;new MutationObserver(()=>{if(q)return;q=1;soon(()=>{q=0;paint()})}).observe(document.documentElement,{childList:true,subtree:true});
{const s=document.createElement("style");s.textContent=`.auc>summary{cursor:pointer;font-weight:800}.auf{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.auf>*{flex:1 1 150px;min-width:0}.auf label{display:flex;align-items:center;gap:6px;font-size:.85rem}.auf label input{flex:1;min-width:0}
.aub{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.aub button{flex:1 1 180px;min-height:44px}
.auv{margin-top:8px;padding:10px 12px;border-radius:12px;font-weight:700;border:1px solid rgba(182,255,59,.5);background:rgba(182,255,59,.1)}.auv.bad{border-color:rgba(255,107,129,.7);background:rgba(255,107,129,.12)}.auv small{display:block;font-weight:400;opacity:.75;overflow-wrap:anywhere}
.aul,.aus{display:grid;gap:8px;margin-top:10px}.aui{padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-left:3px solid #22d3ee;min-width:0}.aui.opI{border-left-color:#b6ff3b}.aui.opD{border-left-color:#ff6b81}
.auh{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.auh small,.aum{font-size:.78rem;opacity:.8}.aum{overflow-wrap:anywhere}.aud{display:grid;gap:2px;margin-top:4px}.aud span{font-size:.8rem;font-family:ui-monospace,Menlo,monospace;overflow-wrap:anywhere;opacity:.92}
.ausr,.auz,.aur{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}.ausr.on{border-color:rgba(34,211,238,.7)}
.ausr small,.auz small,.aur small{display:block;font-size:.78rem;opacity:.8;overflow-wrap:anywhere}.ausr b,.auz b,.aur b{overflow-wrap:anywhere}.ausr button{min-height:44px;white-space:nowrap}
.ausd{display:grid;gap:8px;padding:4px 2px 8px}.ausi{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.1)}.ausi input{width:22px;height:22px;margin-top:2px}.ausi.off{opacity:.6}.ausi small{display:block;font-size:.76rem;opacity:.8;overflow-wrap:anywhere;font-family:ui-monospace,Menlo,monospace}
.auz.nova{border-color:rgba(255,207,90,.7)}.auzb{display:grid;gap:6px}.auzb button{min-height:44px;white-space:nowrap}
@media(max-width:480px){.auz{grid-template-columns:1fr}.auzb{grid-template-columns:1fr 1fr}}
.aur{grid-template-columns:64px minmax(0,1fr)}.aurs{text-align:center}.aurs b{display:block;font-size:1.5rem;line-height:1.1}.aur.vysoke{border-color:rgba(255,107,129,.7)}.aur.vysoke .aurs b{color:#ff6b81}.aur.stredne{border-color:rgba(255,207,90,.6)}.aur.stredne .aurs b{color:#ffcf5a}.aur.nizke .aurs b{color:#b6ff3b}
.admod{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center;padding:10px}@media(min-width:700px){.admod{align-items:center}}html.adopen{overflow:hidden}
.adbox{width:min(520px,100%);max-height:92vh;overflow:auto;display:grid;gap:10px;padding:18px;border-radius:22px;background:#0B0F19;color:#eef2f7;border:1px solid rgba(255,107,129,.45)}
html[data-theme=light] .adbox{background:#fff;color:#0f172a}.adbox p{margin:0;font-size:.92rem;line-height:1.45}.adhd{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:1.08rem}.adx{width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border-radius:50%;flex:none}
.adl{display:grid;gap:6px;font-size:.88rem}.adl textarea,.adl input{width:100%}.adb{display:grid;grid-template-columns:1fr 1fr;gap:8px}.adb button{min-height:48px}`;document.head.appendChild(s)}
})();
