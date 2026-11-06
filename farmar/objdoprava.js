/* 7. 11. 2026 (príkaz majiteľa – Master AI Agent Prompt bod 4.1, 4.2, 5.1): 📦 OBJEDNÁVKY PREPRAVY v záložke Doprava.
   Rýchly formulár: firma (VALKO / ERNTE / DANUBE → hlavička a údaje na dokladoch), objednávateľ, odkiaľ → kam, komodita, tony,
   cena €/t | €/km | paušál, km (🧭 výpočet trasy OSRM, inak vzdušne × 1,25; ručne sa dá prepísať), prázdny návrat, nakládka/vykládka, auto, vodič.
   Majiteľ vidí tržbu, náklad, zisk a maržu (náklad = km × €/km); doprava/dispečing iba objednávku. Doklady: 📄 Objednávka prepravy, 📄 CMR (nákladný list).
   Tabuľka doprava_obj (RLS dob_ok = majiteľ alebo trans/assign), zákaz jazdy HU/SK pri nakládke (trusziv.js ernteBanHU/ernteBanSK). */
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{const x=parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",","."));return isFinite(x)?x:null};
const f=(v,d=0)=>v==null||!isFinite(v)?"–":Number(v).toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d});
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const FIRMY={valko:{n:"VALKO s.r.o.",a:"Zbudza 141, 072 23 Zbudza, Slovensko",id:"IČO 53 365 241 · IČ DPH SK2121345424"},
  ernte:{n:"ERNTE spol. s r.o.",a:"Zbudza 141, 072 23 Zbudza, Slovensko",id:"IČO 52 341 356 · IČ DPH SK2120988551"},
  danube:{n:"Danube Commodities Kft.",a:"3980 Sátoraljaújhely, Rákóczi utca 18., Magyarország",id:"Adószám 33148577-2-05 · Cégjegyzékszám 05-09-040314"}};
const KOM=[["psenica","Pšenica","1001"],["kukurica","Kukurica","1005"],["repka","Repka","1205"],["slnecnica","Slnečnica","1206"],["soja","Sója","1201"],["jacmen","Jačmeň","1003"],["trus","Kurací trus","3101"],["ine","Iné",""]];
const komN=k=>(KOM.find(x=>x[0]===k)||[k,k||"",""])[1],komHS=k=>(KOM.find(x=>x[0]===k)||[0,0,""])[2];
const STV={nova:["nová","w"],potvrdena:["potvrdená","b"],na_ceste:["na ceste","b"],dorucena:["doručená",""],zrusena:["zrušená","g"]};
const S={L:null,at:0,busy:false,open:false,err:"",F:null,calc:""};
const blank=()=>({id:null,firma:"valko",zakaznik:"",zak_adr:"",zak_ico:"",odosielatel:"",prijemca:"",odkial:"",kam:"",komodita:"psenica",tony:"",cena_typ:"t",cena:"",km:"",spat:true,naklad_km:"1,60",nakladka:"",vykladka:"",auto:"",vodic:"",pozn:"",km_zdroj:""});
S.F=blank();
async function load(force){if(S.busy||(!force&&Date.now()-S.at<120000&&S.L))return;S.at=Date.now();S.busy=true;
  try{const r=await sb.from("doprava_obj").select("*").order("nakladka",{ascending:false,nullsFirst:true}).limit(150);
    if(r.error){S.err=/relation|does not exist|schema cache/i.test(r.error.message||"")?"Databáza ešte nemá tabuľku objednávok – príde s najbližšou aktualizáciou.":r.error.message;}else{S.L=r.data||[];S.err=""}}
  catch(x){S.err=String(x.message||x)}finally{S.busy=false}paint()}
function money(o){const t=num(o.tony),c=num(o.cena),km=num(o.km),sp=o.km_spat!=null?num(o.km_spat):(o.spat?km:0),nk=num(o.naklad_km)??1.6;
  const rev=c==null?null:o.cena_typ==="km"?(km==null?null:c*km):o.cena_typ==="pausal"?c:(t==null?null:c*t);
  const kmT=km==null?null:km+(sp||0),cost=kmT==null?null:kmT*nk,pr=rev!=null&&cost!=null?rev-cost:null;
  return {rev,cost,pr,mg:pr!=null&&rev?pr/rev*100:null,ekm:pr!=null&&kmT?pr/kmT:null,et:pr!=null&&t?pr/t:null,kmT}}
function dl(v){if(!v)return "";const d=new Date(v);if(isNaN(d))return "";return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)}
const dSK=v=>{if(!v)return "";const d=new Date(v);return isNaN(d)?"":d.toLocaleString("sk-SK",{weekday:"short",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
function banTxt(o){if(!o.nakladka||!window.ernteBanHU)return "";const d=new Date(o.nakladka);if(isNaN(d))return "";const hu=/maďar|magyar|\bHU\b|hungary|ungarn/i.test(`${o.odkial} ${o.kam}`)||o.firma==="danube",intl=hu;
  const L=[];if(hu){const H=ernteBanHU(d,{intl});if(H.ban)L.push("⛔ HU zákaz jazdy: "+H.why);else if(H.exempt)L.push("✅ HU: zimná výnimka (Euro 3+, medzinárodná)")}
  const K=ernteBanSK(d);if(K.ban)L.push("⛔ SK zákaz na D/R/I. triede: "+K.why+" (výnimka pre poľnohospodárske produkty)");return L.join(" · ")}
function calcHTML(){const m=money(S.F);if(!OWN())return m.rev!=null?`<div class="s">Tržba za prepravu: <b>${f(m.rev,0)} €</b> bez DPH</div>`:"";
  return `<div class="dobg"><div><small>Tržba</small><b>${f(m.rev,0)} €</b></div><div><small>Náklad (${f(m.kmT,0)} km)</small><b>${f(m.cost,0)} €</b></div>
   <div class="${m.pr!=null&&m.pr<0?"wn":"hl"}"><small>Zisk</small><b>${f(m.pr,0)} €</b></div><div><small>Marža</small><b>${m.mg==null?"–":f(m.mg,1)+" %"}</b></div>
   <div><small>Zisk na km</small><b>${m.ekm==null?"–":f(m.ekm,2)+" €"}</b></div><div><small>Zisk na tonu</small><b>${m.et==null?"–":f(m.et,2)+" €"}</b></div></div>`}
function formHTML(){const F=S.F,T=(typeof STATE!=="undefined"&&STATE.trucks||[]).filter(t=>t.active!==false);
  const day=F.nakladka?String(F.nakladka).slice(0,10):"",busy=new Set((typeof STATE!=="undefined"&&STATE.trips||[]).filter(t=>t.day===day&&t.status!=="zrusena").map(t=>String(t.spz||"").replace(/\s/g,"").toUpperCase()));
  (S.L||[]).forEach(o=>{if(o.id!==F.id&&o.stav!=="zrusena"&&o.auto&&String(o.nakladka||"").slice(0,10)===day)busy.add(String(o.auto).replace(/\s/g,"").toUpperCase())});
  const TS=T.slice().sort((a,b)=>(busy.has(String(a.spz).replace(/\s/g,"").toUpperCase())?1:0)-(busy.has(String(b.spz).replace(/\s/g,"").toUpperCase())?1:0)||String(a.no).localeCompare(String(b.no),"sk",{numeric:true}));
  const fn=(typeof STATE!=="undefined"&&STATE.farmers||[]).map(x=>x.name).filter(Boolean).slice(0,600);
  return `<form class="f dobf" id="fDob" autocomplete="off" onsubmit="return false">
  <label>Firma na dokladoch<select name="firma">${Object.keys(FIRMY).map(k=>`<option value="${k}"${F.firma===k?" selected":""}>${E(FIRMY[k].n)}</option>`).join("")}</select></label>
  <label>Objednávateľ<input name="zakaznik" list="dobFn" value="${E(F.zakaznik)}" placeholder="firma, ktorá prepravu objednala"></label>
  <label>Adresa objednávateľa<input name="zak_adr" value="${E(F.zak_adr)}"></label><label>IČO / adószám<input name="zak_ico" value="${E(F.zak_ico)}"></label>
  <label>📍 Odkiaľ (nakládka)<input name="odkial" required value="${E(F.odkial)}" placeholder="napr. Bánovce nad Ondavou"></label>
  <label>🏁 Kam (vykládka)<input name="kam" required value="${E(F.kam)}" placeholder="napr. Kisvárda, Magyarország"></label>
  <label>Odosielateľ (CMR)<input name="odosielatel" value="${E(F.odosielatel)}" placeholder="ak iný ako objednávateľ"></label><label>Príjemca (CMR)<input name="prijemca" value="${E(F.prijemca)}" placeholder="kto tovar preberá"></label>
  <label>Komodita<select name="komodita">${KOM.map(k=>`<option value="${k[0]}"${F.komodita===k[0]?" selected":""}>${k[1]}</option>`).join("")}</select></label>
  <label>Tony<input name="tony" inputmode="decimal" value="${E(F.tony)}" placeholder="napr. 25"></label>
  <label>Cena za<select name="cena_typ"><option value="t"${F.cena_typ==="t"?" selected":""}>€ / tona</option><option value="km"${F.cena_typ==="km"?" selected":""}>€ / km</option><option value="pausal"${F.cena_typ==="pausal"?" selected":""}>paušál €</option></select></label>
  <label>Cena<input name="cena" inputmode="decimal" value="${E(F.cena)}" placeholder="bez DPH"></label>
  <label>Km tam<input name="km" inputmode="decimal" value="${E(F.km)}" placeholder="vypočíta sa"></label>
  <div class="dobkm"><button type="button" class="ghost" data-dobkm>🧭 Vypočítať km</button><small data-dobkmz>${E(F.km_zdroj||"")}</small></div>
  <label class="w dobck"><input type="checkbox" name="spat"${F.spat?" checked":""}> Späť ide auto prázdne (rátať km aj späť)</label>
  ${OWN()?`<label>Náklad €/km<input name="naklad_km" inputmode="decimal" value="${E(F.naklad_km)}"></label>`:""}
  <label>Nakládka<input type="datetime-local" name="nakladka" value="${E(dl(F.nakladka)||F.nakladka)}"></label><label>Vykládka<input type="datetime-local" name="vykladka" value="${E(dl(F.vykladka)||F.vykladka)}"></label>
  <label>Auto<select name="auto"><option value="">– vyber auto –</option>${TS.map(t=>{const b=busy.has(String(t.spz).replace(/\s/g,"").toUpperCase());return `<option value="${E(t.spz)}"${F.auto===t.spz?" selected":""}>${E(t.spz)} · č. ${E(t.no)}${b?" · v ten deň už jazdí":" · voľné"}</option>`}).join("")}</select></label>
  <label>Vodič<input name="vodic" value="${E(F.vodic)}"></label>
  <label class="w">Poznámka<input name="pozn" value="${E(F.pozn)}" placeholder="napr. sklápač, váženie na mieste, kontakt na nakládke"></label>
  <datalist id="dobFn">${fn.map(n=>`<option value="${E(n)}">`).join("")}</datalist>
  <div class="w" data-dobcalc>${calcHTML()}</div><div class="w s" data-dobban>${E(banTxt(S.F))}</div>
  <div class="w btns"><button type="button" class="pri" data-dobsave>💾 ${F.id?"Uložiť zmenu":"Uložiť objednávku"}</button><button type="button" class="ghost" data-dobclose>✕ Zavrieť</button></div></form>`}
function cardHTML(o){const m=money(o),st=STV[o.stav]||[o.stav,"g"],bt=banTxt(o);
  return `<div class="card dobc ${E(o.stav)}"><div class="row"><span class="t">${E(o.odkial)} → ${E(o.kam)}</span><span class="pill ${st[1]}">${E(st[0])}</span></div>
  <div class="s">${E(FIRMY[o.firma]?FIRMY[o.firma].n:o.firma)} · ${E(o.zakaznik||"objednávateľ nezadaný")} · ${E(komN(o.komodita))}${o.tony!=null?" · "+f(o.tony,1)+" t":""}${o.km!=null?" · "+f(o.km,0)+" km":""}</div>
  <div class="s">📅 ${E(dSK(o.nakladka)||"termín nezadaný")}${o.vykladka?" → "+E(dSK(o.vykladka)):""}${o.auto?" · 🚛 "+E(o.auto):""}${o.vodic?" · "+E(o.vodic):""}</div>
  ${OWN()&&m.rev!=null?`<div class="s">Tržba <b>${f(m.rev,0)} €</b> · náklad ${f(m.cost,0)} € · zisk <b class="${m.pr<0?"dobneg":""}">${f(m.pr,0)} €</b>${m.mg!=null?" ("+f(m.mg,1)+" %)":""}</div>`:""}
  ${bt?`<div class="s dobban">${E(bt)}</div>`:""}${o.pozn?`<div class="s">💬 ${E(o.pozn)}</div>`:""}
  <div class="btns dobb"><select data-dobst="${o.id}" aria-label="Stav objednávky">${Object.keys(STV).map(k=>`<option value="${k}"${o.stav===k?" selected":""}>${STV[k][0]}</option>`).join("")}</select>
   <button type="button" class="ghost" data-dobpdf="${o.id}">📄 Objednávka</button><button type="button" class="ghost" data-dobcmr="${o.id}">📄 CMR</button><button type="button" class="ghost" data-dobed="${o.id}">✏️ Upraviť</button>${OWN()?`<button type="button" class="ghost dng" data-dobdel="${o.id}">🗑️</button>`:""}</div></div>`}
function bodyHTML(){if(S.err)return `<div class="s">${E(S.err)}</div>`;if(!S.L)return `<div class="s">Načítavam objednávky…</div>`;
  const L=S.L,open=L.filter(o=>!["dorucena","zrusena"].includes(o.stav)),done=L.filter(o=>["dorucena","zrusena"].includes(o.stav)).slice(0,15);
  let h="";if(OWN()){const mon=new Date().toISOString().slice(0,7),M=L.filter(o=>o.stav!=="zrusena"&&String(o.nakladka||o.created_at).slice(0,7)===mon).map(money),rv=M.reduce((s,x)=>s+(x.rev||0),0),pr=M.reduce((s,x)=>s+(x.pr||0),0);
    if(M.length)h+=`<div class="s">Tento mesiac: <b>${M.length}</b> objednávok · tržba <b>${f(rv,0)} €</b> · zisk <b>${f(pr,0)} €</b>${rv?" ("+f(pr/rv*100,1)+" %)":""}</div>`}
  h+=open.length?open.map(cardHTML).join(""):`<div class="s">Žiadna otvorená objednávka prepravy.</div>`;
  if(done.length)h+=`<details class="dobd"><summary>Doručené a zrušené (${done.length})</summary>${done.map(cardHTML).join("")}</details>`;return h}
function cardWrap(){return `<div class="card dobw" id="dobCard"><div class="row"><span class="t">📦 Objednávky prepravy</span><button type="button" class="${S.open?"ghost":"lime"}" data-dobnew>${S.open?"✕ Zavrieť":"➕ Nová objednávka"}</button></div>
  <div class="s">Odkiaľ → kam, tony, cena za tonu alebo za km, nakládka a auto. ${OWN()?"Zisk a maržu vidíš iba ty. ":""}Z každej objednávky vytlačíš objednávku prepravy aj CMR.</div>
  ${S.open?formHTML():""}<div data-dobl>${bodyHTML()}</div></div>`}
function paint(){const c=document.getElementById("dobCard");if(!c)return inject();const l=c.querySelector("[data-dobl]");if(l)l.innerHTML=bodyHTML()}
function inject(){if(typeof TAB==="undefined"||TAB!=="trans")return;const app=document.getElementById("app");if(!app||document.getElementById("dobCard"))return;
  const anc=app.querySelector(":scope>.ds-kpis")||app.querySelector(":scope>h2");if(!anc)return;const d=document.createElement("div");d.innerHTML=cardWrap();
  if(anc.matches(".ds-kpis"))anc.after(d.firstElementChild);else anc.before(d.firstElementChild);load()}
function readForm(fm){const F=S.F,fd=new FormData(fm);for(const [k,v] of fd.entries())F[k]=v;F.spat=!!fm.querySelector('[name="spat"]:checked');return F}
async function geo(q){const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=sk&countrycodes=sk,hu,cz,at,pl,ro,ua,de&q="+encodeURIComponent(q));const j=await r.json();if(!j||!j[0])throw new Error("Nenašiel som miesto: "+q);return [+j[0].lat,+j[0].lon]}
async function kmCalc(fm){const F=readForm(fm),z=fm.querySelector("[data-dobkmz]");if(!F.odkial||!F.kam){window.toast&&toast("Zadaj odkiaľ aj kam.");return}
  z.textContent="počítam…";try{const a=await geo(F.odkial);await new Promise(r=>setTimeout(r,1100));const b=await geo(F.kam);let km=null,src="";
    try{const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=false`);const j=await r.json();if(j&&j.routes&&j.routes[0]){km=j.routes[0].distance/1000;src="trasa OSRM (cesty)"}}catch(x){}
    if(km==null){const R=6371,dl=(b[0]-a[0])*Math.PI/180,dn=(b[1]-a[1])*Math.PI/180,h=Math.sin(dl/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dn/2)**2;km=2*R*Math.asin(Math.sqrt(h))*1.25;src="vzdušne × 1,25 (trasa nedostupná)"}
    F.km=String(Math.round(km));F.km_zdroj=src;const i=fm.querySelector('[name="km"]');if(i)i.value=F.km;z.textContent=src+" · over pri kamiónovej trase";upd(fm)}
  catch(x){z.textContent=String(x.message||x)}}
function upd(fm){readForm(fm);const c=fm.querySelector("[data-dobcalc]");if(c)c.innerHTML=calcHTML();const b=fm.querySelector("[data-dobban]");if(b)b.textContent=banTxt(S.F)}
async function save(fm){const F=readForm(fm);if(!String(F.odkial).trim()||!String(F.kam).trim()){window.toast&&toast("Zadaj odkiaľ a kam.");return}
  const iso=v=>{if(!v)return null;const d=new Date(v);return isNaN(d)?null:d.toISOString()};
  const row={firma:F.firma,zakaznik:F.zakaznik||null,zak_adr:F.zak_adr||null,zak_ico:F.zak_ico||null,odosielatel:F.odosielatel||null,prijemca:F.prijemca||null,odkial:String(F.odkial).trim(),kam:String(F.kam).trim(),
    komodita:F.komodita,tony:num(F.tony),cena_typ:F.cena_typ,cena:num(F.cena),km:num(F.km),km_spat:F.spat?(num(F.km)||0):0,km_zdroj:F.km_zdroj||null,nakladka:iso(F.nakladka),vykladka:iso(F.vykladka),auto:F.auto||null,vodic:F.vodic||null,pozn:F.pozn||null};
  if(OWN()&&num(F.naklad_km)!=null)row.naklad_km=num(F.naklad_km);
  const r=F.id?await sb.from("doprava_obj").update(row).eq("id",F.id):await sb.from("doprava_obj").insert(row);
  if(r.error){window.toast&&toast("Neuložené: "+r.error.message);return}window.toast&&toast(F.id?"Objednávka upravená.":"Objednávka uložená.");S.F=blank();S.open=false;
  const c=document.getElementById("dobCard");if(c)c.outerHTML=cardWrap();await load(true)}
const firmaOf=o=>FIRMY[o.firma]||FIRMY.valko;
function docOpen(title,body,brand,head,sub){const w=window.open("","_blank");if(!w){window.toast&&toast("Povoľ vyskakovacie okná.");return}
  w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${E(title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{font:13px/1.45 Arial,Helvetica,sans-serif;color:#111;margin:18px}h1{font-size:19px;margin:6px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px;vertical-align:top;text-align:left}th{width:34%}
  .cmr{display:grid;grid-template-columns:1fr 1fr;border:2px solid #000}.cmr>div{border:1px solid #000;padding:5px 6px;min-height:46px}.cmr .w{grid-column:1/-1}.cmr b.n{display:inline-block;min-width:20px;font-size:11px}.cmr small{color:#444;font-size:10px}.cmr p{margin:3px 0 0;font-size:13px}
  .sig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ft{margin-top:14px;font-size:11px;color:#555}${window.brandCss?brandCss(brand):""}</style></head><body>${window.brandHead?brandHead(brand,head||title,sub||firmaOf({firma:brand}).n):`<h1>${E(head||title)}</h1>`}${body}</body></html>`);w.document.close()}
function fname(o,kind){const d=String(o.nakladka||o.created_at||"").slice(0,10),cl=s=>String(s||"").split(",")[0].replace(/[\\/:*?"<>|_]+/g," ").trim();return `${kind} ${d} ${cl(o.odkial)} – ${cl(o.kam)}`}
function docObj(o){const F=firmaOf(o),m=money(o),cena=o.cena==null?"dohodou":o.cena_typ==="km"?f(o.cena,2)+" € / km":o.cena_typ==="pausal"?f(o.cena,2)+" € paušál":f(o.cena,2)+" € / t";
  const R=[["Dopravca",`${F.n}<br>${F.a}<br>${F.id}`],["Objednávateľ",`${E(o.zakaznik||"")}${o.zak_adr?"<br>"+E(o.zak_adr):""}${o.zak_ico?"<br>"+E(o.zak_ico):""}`],["Miesto nakládky",E(o.odkial)],["Termín nakládky",E(dSK(o.nakladka))],["Miesto vykládky",E(o.kam)],["Termín vykládky",E(dSK(o.vykladka))],
    ["Tovar",`${E(komN(o.komodita))}${komHS(o.komodita)?" (colný kód "+komHS(o.komodita)+")":""} · voľne ložený`],["Množstvo",o.tony!=null?f(o.tony,2)+" t":""],["Vzdialenosť",o.km!=null?f(o.km,0)+" km":""],["Vozidlo / vodič",`${E(o.auto||"")}${o.vodic?" · "+E(o.vodic):""}`],
    ["Cena za prepravu",`${cena} bez DPH${m.rev!=null?" · spolu "+f(m.rev,2)+" € bez DPH":""}`],["Poznámka",E(o.pozn||"")]];
  docOpen(fname(o,"Objednávka prepravy"),`<table>${R.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join("")}</table>
  <p>Preprava sa riadi Dohovorom CMR a Obchodným zákonníkom. Faktúra po doručení na základe podpísaného CMR / vážneho lístka; splatnosť podľa dohody.</p>
  <div class="sig"><div>Za objednávateľa:<br><br>………………………</div><div></div><div>Za dopravcu:<br><br>………………………</div></div><div class="ft">Vystavené v aplikácii ERNTE Trade &amp; Logistic · č. ${o.id}</div>`,o.firma==="danube"?"danube":o.firma==="ernte"?"ernte":"valko","Objednávka prepravy","č. "+o.id+" · "+new Date().toLocaleDateString("sk-SK"))}
async function docCmr(o){const F=firmaOf(o),hu=o.firma==="danube"||/maďar|magyar|\bHU\b/i.test(`${o.odkial} ${o.kam}`);
  let no=o.cmr_no;if(!no){no=`${(o.firma||"valko").toUpperCase()}-${new Date().getFullYear()}-${String(o.id).padStart(4,"0")}`;try{await sb.from("doprava_obj").update({cmr_no:no}).eq("id",o.id);o.cmr_no=no}catch(x){}}
  const L=(n,sk,en,huT)=>`<b class="n">${n}</b> <small>${sk} / ${en}${hu&&huT?" / "+huT:""}</small>`;
  const tr=o.komodita==="trus";
  const B=[[1,"Odosielateľ","Sender","Feladó",E(o.odosielatel||o.zakaznik||"")],[16,"Dopravca","Carrier","Fuvarozó",`${F.n}, ${F.a}<br>${F.id}<br>Vozidlo: ${E(o.auto||"")}${o.vodic?" · vodič "+E(o.vodic):""}`],
   [2,"Príjemca","Consignee","Címzett",E(o.prijemca||"")],[17,"Nasledujúci dopravcovia","Successive carriers","Utófuvarozók",""],
   [3,"Miesto určenia","Place of delivery","Kirakodás helye",E(o.kam)],[18,"Výhrady dopravcu","Carrier's reservations","Fuvarozó fenntartásai",""],
   [4,"Miesto a dátum prevzatia","Place and date of taking over","Átvétel helye és ideje",`${E(o.odkial)}<br>${E(dSK(o.nakladka))}`],[19,"Osobitné dohody","Special agreements","Különleges megállapodások",""],
   [5,"Pripojené doklady","Documents attached","Csatolt okmányok",tr?"obchodný doklad TRACES (DOCOM) + veterinárne potvrdenie":"vážny lístok"],[13,"Pokyny odosielateľa","Sender's instructions","Feladó utasításai",E(o.pozn||"")]];
  const G=`<div class="w"><table><tr><th style="width:auto">${L(6,"Značky","Marks","Jelek")}</th><th style="width:auto">${L(7,"Počet kusov","Number of packages","Darabszám")}</th><th style="width:auto">${L(8,"Balenie","Packing","Csomagolás")}</th><th style="width:auto">${L(9,"Druh tovaru","Nature of goods","Áru megnevezése")}</th><th style="width:auto">${L(10,"Štat. číslo","Stat. No.","Stat. szám")}</th><th style="width:auto">${L(11,"Hmotnosť brutto kg","Gross weight kg","Bruttó súly kg")}</th></tr>
   <tr><td>–</td><td>1</td><td>voľne ložené / bulk</td><td>${E(komN(o.komodita))}</td><td>${E(komHS(o.komodita))}</td><td>${o.tony!=null?f(o.tony*1000,0):""}</td></tr></table></div>`;
  const body=`<div class="cmr">${B.map(b=>`<div>${L(b[0],b[1],b[2],b[3])}<p>${b[4]}</p></div>`).join("")}${G}
   <div>${L(14,"Dobierka","Cash on delivery","Utánvét")}<p></p></div><div>${L(20,"Platí","To be paid by","Fizeti")}<p>${E(o.zakaznik||"")}</p></div>
   <div>${L(21,"Vystavené v / dňa","Established in / on","Kiállítva")}<p>${E(String(o.odkial).split(",")[0])} · ${new Date().toLocaleDateString("sk-SK")}</p></div><div>${L(15,"Frankatúra","Carriage charges","Fuvardíj")}<p></p></div>
   <div>${L(22,"Podpis a pečiatka odosielateľa","Signature of sender","Feladó aláírása")}<p><br><br></p></div><div>${L(23,"Podpis a pečiatka dopravcu","Signature of carrier","Fuvarozó aláírása")}<p><br><br></p></div>
   <div class="w">${L(24,"Tovar prevzal – podpis a pečiatka príjemcu, dátum","Goods received – consignee","Az árut átvette")}<p><br><br></p></div></div>
   <div class="ft">CMR č. ${E(no)} · ERNTE Trade &amp; Logistic · Elektronický nákladný list (e-CMR) vyžaduje certifikovanú platformu – úrady v EÚ ho musia prijímať od 9. 7. 2027 (eFTI).</div>`;
  docOpen(fname(o,"CMR "+no),body,o.firma==="danube"?"danube":o.firma==="ernte"?"ernte":"valko","Medzinárodný nákladný list CMR","č. "+no)}
const byId=id=>(S.L||[]).find(o=>String(o.id)===String(id));
document.addEventListener("click",async ev=>{const t=ev.target.closest&&ev.target.closest("[data-dobnew],[data-dobclose],[data-dobsave],[data-dobkm],[data-dobpdf],[data-dobcmr],[data-dobed],[data-dobdel]");if(!t||!t.closest("#dobCard"))return;ev.preventDefault();
  const c=document.getElementById("dobCard"),fm=c.querySelector("#fDob");
  if(t.matches("[data-dobnew],[data-dobclose]")){S.open=t.matches("[data-dobnew]")?!S.open:false;if(!S.open)S.F=blank();c.outerHTML=cardWrap();return}
  if(t.matches("[data-dobsave]")&&fm)return save(fm);if(t.matches("[data-dobkm]")&&fm)return kmCalc(fm);
  const o=byId(t.dataset.dobpdf||t.dataset.dobcmr||t.dataset.dobed||t.dataset.dobdel);if(!o)return;
  if(t.matches("[data-dobpdf]"))return docObj(o);if(t.matches("[data-dobcmr]"))return docCmr(o);
  if(t.matches("[data-dobed]")){S.F=Object.assign(blank(),o,{spat:+o.km_spat>0,naklad_km:String(o.naklad_km??"1,60").replace(".",","),tony:o.tony??"",cena:o.cena??"",km:o.km??""});S.open=true;c.outerHTML=cardWrap();const n=document.getElementById("dobCard");n&&n.scrollIntoView({block:"start"});return}
  if(t.matches("[data-dobdel]")&&OWN()){if(!confirm(`Vymazať objednávku ${o.odkial} → ${o.kam}? Ak sa preprava len nekoná, radšej daj stav „zrušená“.`))return;const r=await sb.from("doprava_obj").delete().eq("id",o.id);if(r.error){window.toast&&toast(r.error.message);return}load(true)}},true);
document.addEventListener("input",ev=>{const fm=ev.target.closest&&ev.target.closest("#fDob");if(fm)upd(fm)});
document.addEventListener("change",async ev=>{const s=ev.target.closest&&ev.target.closest("[data-dobst]");if(s){const r=await sb.from("doprava_obj").update({stav:s.value}).eq("id",s.dataset.dobst);if(r.error){window.toast&&toast(r.error.message);return}window.toast&&toast("Stav: "+(STV[s.value]||[s.value])[0]);load(true);return}
  const fm=ev.target.closest&&ev.target.closest("#fDob");if(fm)upd(fm)});
function wrap(){const o=window.renderStaff;if(typeof o!=="function"||o.__dob)return;const w=function(){const r=o.apply(this,arguments);(window.ernteSoon||requestAnimationFrame)(()=>{try{inject()}catch(x){}});return r};
  Object.keys(o).forEach(k=>{if(!(k in w))try{w[k]=o[k]}catch(x){}});w.__dob=1;window.renderStaff=w}
const tk=setInterval(wrap,500);setTimeout(()=>clearInterval(tk),60000);wrap();
const st=document.createElement("style");st.textContent=`#dobCard .row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.dobf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.dobf .w{grid-column:1/-1}.dobf label{min-width:0}
.dobkm{display:flex;flex-direction:column;justify-content:flex-end;gap:4px;min-width:0}.dobkm small{color:#94A3B8;font-size:.75rem;overflow-wrap:anywhere}
.dobck{display:flex!important;flex-direction:row!important;align-items:center;gap:8px}.dobck input{width:22px;height:22px;flex:none}
.dobg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.dobg>div{border:1px solid rgba(34,211,238,.35);border-radius:14px;padding:8px;text-align:center;min-width:0}.dobg small{display:block;color:#94A3B8;font-size:.76rem}.dobg b{font-size:1.05rem}.dobg .hl{border-color:#b6ff3b}.dobg .hl b{color:#b6ff3b}.dobg .wn{border-color:#ff6b81}.dobg .wn b{color:#ff6b81}@media(max-width:520px){.dobg{grid-template-columns:repeat(2,minmax(0,1fr))}}
.dobc{margin-top:10px}.dobb{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.dobb select{max-width:160px;min-height:44px}.dobneg{color:#ff6b81}.dobban{color:#ffcf5a}.dobd{margin-top:10px}.dobd summary{cursor:pointer;font-weight:700}
@media(max-width:420px){.dobf{grid-template-columns:1fr}}`;document.head.appendChild(st);
})();
