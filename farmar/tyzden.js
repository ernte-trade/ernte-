// ===== 📧 TÝŽDENNÝ SÚHRN E-MAILOM – každý pondelok ráno PDF za minulý týždeň (6. 11. PRÍKAZ MAJITEĽA) =====
// „V doprave (flotila) všetko, čo sa týka dopravy – súhrn upozornení, právne, porušenia, alarmy – vždy v pondelok ráno v jednom e-maili
//  v PDF na odoslanie z valko@valko-logistics.sk na sales@valko-logistics.sk; ja už len skontrolujem a stlačím odoslať.
//  A tak v každej sekcii – príjemcu si doplním, odosielateľ je podľa sekcie, ktorá firma to má na starosti.“
// Nič sa neodošle samo: v pondelok (a kým súhrn nie je odoslaný) sa Martinovi ukáže okno „📧 Týždenné súhrny sú pripravené“,
// ťuk → dokument PDF v okne (pdfview.js) → 📧 Odoslať → Komu / Predmet / Text na kontrolu → 📤 Odoslať (alebo cez telefón).
// Odosielateľ = schránka firmy (pdfview profily): doprava VALKO (valko), Danube (danube), ostatné ERNTE (ernte). Vidí iba Martin (MAIN_OK).
// Nastavenie (príjemca, zapnuté, odoslané týždne) – localStorage ernte-tyz:<email>.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof MAIN_OK==="function"&&MAIN_OK()&&typeof sb!=="undefined";
const say=(t,ms)=>{try{typeof toast==="function"&&toast(t,ms||4000)}catch(x){}};
const n0=v=>v==null||!isFinite(v)?"–":(+v).toLocaleString("sk-SK",{maximumFractionDigits:0});
const n1=v=>v==null||!isFinite(v)?"–":(+v).toLocaleString("sk-SK",{maximumFractionDigits:1});
const dS=d=>new Date(d).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"});
const dT=d=>{const x=new Date(d);return x.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" "+x.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})};
const FIRM={valko:{n:"VALKO s.r.o.",from:"valko@valko-logistics.sk",sign:"VALKO s.r.o."},ernte:{n:"ERNTE spol. s r.o.",from:"erntevykup@gmail.com",sign:"ERNTE spol. s r.o."},danube:{n:"Danube Commodities Kft.",from:"danube.commodities.kft@gmail.com",sign:"Danube Commodities Kft."}};
// minulý týždeň: pondelok 00:00 – nedeľa 23:59 (miestny čas)
function week(){const t=new Date();t.setHours(0,0,0,0);const dow=(t.getDay()+6)%7,mon=new Date(t);mon.setDate(t.getDate()-dow);const a=new Date(mon);a.setDate(mon.getDate()-7);const sun=new Date(mon);sun.setDate(mon.getDate()-1);
  return {a,b:mon,sun,key:a.toISOString().slice(0,10),txt:a.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" – "+dS(sun),file:a.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" – "+dS(sun)}}
const inW=(x,W)=>{const t=new Date(x).getTime();return t>=W.a.getTime()&&t<W.b.getTime()};
const S=()=>typeof STATE!=="undefined"?STATE:{};
const farmers=()=>S().farmers||[];
const fName=id=>{const f=farmers().find(x=>x.id===id);return f?f.name:""};
const isDn=d=>{const f=farmers().find(x=>x.id===d.farmer_id);return !!f&&String(f.firma||"").toUpperCase()==="DANUBE"};
const com=c=>{try{const m=(typeof MK!=="undefined"?MK:[]).find(x=>x[0]===c);if(m)return m[1]}catch(x){}return c||""};
const dealsAll=()=>{const s=S();return [...(s.dealsAll||s.deals||[])].filter((d,i,A)=>A.findIndex(x=>x.id===d.id)===i)};
const STN={navrh:"návrh",podpisany:"podpísaný",odvoz:"odvoz",odvezeny:"odvezený",fakturacia:"fakturácia",zaplateny:"zaplatený",zruseny:"zrušený"};
const tbl=(head,rows)=>rows.length?`<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`:`<p class="nic">Žiadne záznamy.</p>`;
const box=(t,n,c)=>`<div class="kp ${c||""}"><b>${n}</b><small>${t}</small></div>`;

// ---------- 🚛 DOPRAVA A FLOTILA (VALKO) ----------
// 6. 11. 11:49 PRÍKAZ MAJITEĽA: osobné (služobné) autá do súhrnu nedávať – IBA Renault ŠPZ …809 a Octavia ŠPZ …264
const OSOB_OK=/809|264/;const pn=x=>String(x||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
async function skipSet(){const ids=new Set(),pl=new Set();let V=[];try{const r=await sb.from("cmd_vehicles").select("*").limit(2000);V=r.data||[]}catch(x){}
  if(!V.length)V=(S().fleet&&(S().fleet.vehAll||S().fleet.veh))||[];
  for(const v of V){const osob=v.fleet==="sluzobne"||v.vtype==="osobne_m1";if(osob&&!OSOB_OK.test(pn(v.plate))){ids.add(v.id);if(v.plate)pl.add(pn(v.plate))}}
  return {ids,pl,out:e=>ids.has(e.vehicle_id)||(e.plate&&pl.has(pn(e.plate)))||(e.spz&&pl.has(pn(e.spz)))}}
async function bDoprava(W){const RKx=typeof RK!=="undefined"?RK:{};let ev=[],err="";const SK=await skipSet();
  try{for(let off=0;off<10000;off+=1000){const r=await sb.from("fleet_events").select("*").in("kind",Object.keys(RKx)).gte("at",W.a.toISOString()).lt("at",W.b.toISOString()).order("at",{ascending:false}).range(off,off+999);if(r.error){err=r.error.message;break}ev.push(...(r.data||[]));if(!r.data||r.data.length<1000)break}}catch(x){err=String(x&&x.message||x)}
  ev=ev.filter(e=>!SK.out(e));
  const loss=e=>typeof regLoss==="function"?regLoss(e):["fuel_drop","fuel_transfer","paid_not_tank"].includes(e.kind)&&!e.flag;
  let pb=1.6;try{const CO=Object.assign({diesel:1.952},(S().fleet&&S().fleet.cfg&&S().fleet.cfg.costs)||{});if(typeof pBez==="function")pb=pBez(CO)}catch(x){}
  const L=ev.filter(loss).reduce((a,e)=>a+(+e.liters||0),0),sp=ev.filter(e=>e.kind==="speed"||e.kind==="limiter").length,cab=ev.filter(e=>e.kind==="cabotage").length,ns=ev.filter(e=>e.kind==="no_signal"||e.kind==="data_gap").length;
  const byK={};for(const e of ev){byK[e.kind]=(byK[e.kind]||0)+1}
  const byD={};for(const e of ev){const k=e.driver&&!/^(tacho|nezn)/i.test(e.driver)?e.driver:"bez vodiča";const o=byD[k]=byD[k]||{n:0,l:0,f:0,s:0,c:0,p:new Set()};o.n++;if(loss(e)){o.f++;o.l+=+e.liters||0}if(e.kind==="speed"||e.kind==="limiter")o.s++;if(e.kind==="cabotage")o.c++;if(e.plate)o.p.add(e.plate)}
  // aktuálne alarmy flotily (to isté, čo Flotila → Alarmy)
  let al=[];try{if(!S().fleet&&typeof loadFleet==="function")await loadFleet();if(S().fleet&&typeof fleetAlerts==="function")al=fleetAlerts(S().fleet).filter(a=>a[0]==="r"||a[0]==="w")}catch(x){}
  let ast={};try{const r=await sb.from("alarm_st").select("key,status").limit(5000);for(const x of r.data||[])ast[x.key]=x.status}catch(x){}
  al=al.filter(a=>!["vyriesene","falosny"].includes(ast[a[2]])&&!(a[3]&&SK.ids.has(a[3])));
  // výzvy a dokumenty vodičom za týždeň
  let docs=[];try{const r=await sb.from("ai_docs").select("kind,driver,title,status,created_at").gte("created_at",W.a.toISOString()).lt("created_at",W.b.toISOString()).order("created_at",{ascending:false}).limit(200);docs=r.data||[]}catch(x){}
  // jazdy (vývoz) za týždeň
  let trips=[];try{const r=await sb.from("trips").select("day,status,spz").gte("day",W.key).lt("day",W.b.toISOString().slice(0,10)).limit(2000);trips=(r.data||[]).filter(t=>!SK.out(t))}catch(x){}
  // právne termíny – doprava / VALKO / všetci, do 180 dní
  const now=Date.now(),DUE=(window.ERNTE_DUE||[]).filter(d=>{const t=new Date(d[0]+"T00:00:00").getTime();return t>=now-864e5&&t<=now+180*864e5&&/VALKO|mýt|eFTI|eCMR|doprav/i.test(d[2]+" "+d[3])});
  const RT=k=>(RKx[k]||["•",k])[0]+" "+(RKx[k]||["•",k])[1];
  return {sum:`${ev.length} porušení · nafta ${n0(L)} l ≈ ${n0(L*pb)} € · ${al.length} otvorených alarmov`,
   html:`<div class="kps">${box("porušení a upozornení",ev.length,ev.length?"r":"g")}${box("nafta – podozrivé poklesy",n0(L)+" l","r")}${box("≈ € bez DPH",n0(L*pb)+" €","r")}${box("rýchlosť / obmedzovač",sp,sp?"w":"g")}${box("možná kabotáž",cab,cab?"r":"g")}${box("bez signálu / výpadok dát",ns,"")}${box("otvorené alarmy",al.length,al.length?"r":"g")}${box("jazdy vývozu",trips.length,"")}</div>
   <p class="zh">🚗 Osobné autá: v súhrne iba Renault (ŠPZ …809) a Octavia (ŠPZ …264), ostatné osobné autá sa nezapočítavajú.</p>
   ${err?`<p class="nic">⚠️ Register porušení sa nepodarilo načítať: ${E(err)}</p>`:""}
   <h2>1. Porušenia podľa typu</h2>${tbl(["Typ","Počet"],Object.entries(byK).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[E(RT(k)),n]))}
   <h2>2. Porušenia podľa vodiča</h2>${tbl(["Vodič","Autá","Nafta (prípady)","Litre","≈ € bez DPH","Rýchlosť","Kabotáž","Spolu"],Object.entries(byD).sort((a,b)=>b[1].l-a[1].l||b[1].n-a[1].n).map(([k,o])=>[`<b>${E(k)}</b>`,E([...o.p].join(", ")),o.f,n0(o.l),n0(o.l*pb),o.s,o.c,o.n]))}
   <h2>3. Otvorené alarmy flotily</h2>${tbl(["Stupeň","Alarm","Stav"],al.slice(0,80).map(a=>[a[0]==="r"?"🔴 vysoký":"🟠 stredný",E(a[1]),E({novy:"nový",riesim:"riešim"}[ast[a[2]]]||"nový")]))}
   <h2>4. Právne termíny a povinnosti (do 180 dní)</h2>${tbl(["Termín","Povinnosť","Predpis / kto"],DUE.map(d=>[`<b>${dS(d[0]+"T12:00:00")}</b>`,E(d[1]+" "+d[2]),E(d[3])]))}
   <h2>5. Výzvy a dokumenty vodičom za týždeň</h2>${tbl(["Dátum","Vodič","Dokument","Stav"],docs.map(d=>[dT(d.created_at),E(d.driver||""),E(d.title||d.kind||""),E({novy:"neodoslaný",odoslany:"odoslaný",vyriesene:"vyriešené"}[d.status]||d.status||"")]))}
   <h2>6. Zoznam porušení (najnovšie hore)</h2>${tbl(["Kedy","Typ","Auto","Vodič","Detail"],ev.slice(0,150).map(e=>[dT(e.at),E(RT(e.kind)),E(e.plate||""),E(e.driver||""),[e.liters?n0(e.liters)+" l":"",e.kmh?e.kmh+" km/h":"",e.place||"",e.note||""].filter(Boolean).map(E).join(" · ")]))}${ev.length>150?`<p class="nic">…a ďalších ${ev.length-150} – celý register v aplikácii (Flotila → Register porušení).</p>`:""}`}}

// ---------- 🤝 OBCHODY (ERNTE) / 🇭🇺 DANUBE ----------
function bDeals(W,dn){const A=dealsAll().filter(d=>dn?isDn(d):!isDn(d)),nw=A.filter(d=>d.created_at&&inW(d.created_at,W)),open=A.filter(d=>["podpisany","odvoz"].includes(d.status));
  const t=nw.reduce((a,d)=>a+(+d.tons||0),0),v=nw.reduce((a,d)=>a+(+d.tons||0)*(+d.price||0),0),ot=open.reduce((a,d)=>a+(+d.tons||0),0);
  const row=d=>[E(d.no||""),E(fName(d.farmer_id)),E(com(d.com)),n1(d.tons)+" t",d.price?n0(d.price)+" €/t":"–",E(STN[d.status]||d.status||""),d.term?E(d.term):""];
  return {sum:`${nw.length} nových zmlúv · ${n1(t)} t · ${open.length} otvorených`,
   html:`<div class="kps">${box("nové zmluvy za týždeň",nw.length,"g")}${box("tony nových zmlúv",n1(t)+" t","")}${box("hodnota nových zmlúv",n0(v)+" €","")}${box("otvorené zmluvy (podpísané, odvoz)",open.length,"w")}${box("tony otvorených zmlúv",n1(ot)+" t","w")}</div>
   <h2>1. Nové zmluvy za týždeň</h2>${tbl(["Číslo","Farmár","Plodina","Množstvo","Cena","Stav","Termín"],nw.map(row))}
   <h2>2. Otvorené zmluvy</h2>${tbl(["Číslo","Farmár","Plodina","Množstvo","Cena","Stav","Termín"],open.slice(0,120).map(row))}`}}

// ---------- 👨‍🌾 FARMÁRI (ERNTE) ----------
function bFarm(W){const F=farmers().filter(f=>!/test|🧪/i.test(f.name||"")),nw=F.filter(f=>f.created_at&&inW(f.created_at,W)),miss=F.filter(f=>f.active!==false&&(!f.ico||!f.phone||!f.email||!f.iban));
  return {sum:`${nw.length} nových farmárov · ${miss.length} bez úplných údajov`,
   html:`<div class="kps">${box("noví farmári za týždeň",nw.length,"g")}${box("aktívni farmári",F.filter(f=>f.active!==false).length,"")}${box("bez IČO / telefónu / e-mailu / IBAN",miss.length,miss.length?"w":"g")}</div>
   <h2>1. Noví farmári a klienti za týždeň</h2>${tbl(["Meno","Firma","IČO","Telefón","E-mail"],nw.map(f=>[`<b>${E(f.name)}</b>`,E(f.firma||"ERNTE"),E(f.ico||""),E(f.phone||""),E(f.email||"")]))}
   <h2>2. Chýbajúce údaje (aktívni)</h2>${tbl(["Meno","Chýba"],miss.slice(0,150).map(f=>[E(f.name),[!f.ico&&"IČO",!f.phone&&"telefón",!f.email&&"e-mail",!f.iban&&"IBAN"].filter(Boolean).join(", ")]))}`}}

// ---------- 💶 CENNÍK (ERNTE) ----------
function bPrice(W){const P=(S().prices||[]).filter(p=>p.price!=null);
  return {sum:`${P.length} zverejnených nákupných cien`,
   html:`<div class="kps">${box("zverejnené nákupné ceny",P.length,"g")}</div>
   <h2>Naše zverejnené nákupné ceny (FCA farma)</h2>${tbl(["Plodina","Cena","Posledná zmena"],P.map(p=>[`<b>${E(com(p.com))}</b>`,n0(p.price)+" €/t",p.updated_at?dT(p.updated_at):""]))}`}}

const SEC=[
 {k:"trans",tabs:["trans","fleet"],t:"Doprava a flotila",i:"🚛",firm:"valko",prof:"valko",to:"sales@valko-logistics.sk",on:true,what:"upozornenia, porušenia, alarmy, právne termíny, výzvy vodičom",b:bDoprava},
 {k:"deals",tabs:["deals","qd"],t:"Obchody a zmluvy",i:"🤝",firm:"ernte",prof:"ernte",what:"nové a otvorené zmluvy ERNTE",b:W=>bDeals(W,false)},
 {k:"danube",tabs:["danube"],t:"Danube Trade",i:"🇭🇺",firm:"danube",prof:"danube",what:"nové a otvorené zmluvy Danube",b:W=>bDeals(W,true)},
 {k:"farm",tabs:["farm","klient"],t:"Farmári a klienti",i:"👨‍🌾",firm:"ernte",prof:"ernte",what:"noví farmári, chýbajúce údaje",b:bFarm},
 {k:"price",tabs:["price","nu"],t:"Cenník",i:"💶",firm:"ernte",prof:"ernte",what:"zverejnené nákupné ceny",b:bPrice}];
window.ernteTyzdenSec=SEC;

// ---------- nastavenie ----------
const KEY=()=>"ernte-tyz:"+String((typeof ME!=="undefined"&&ME&&ME.email)||"").toLowerCase();
function cfg(){let c={};try{c=JSON.parse(localStorage.getItem(KEY())||"{}")||{}}catch(x){}for(const s of SEC){const o=c[s.k]=c[s.k]||{};if(o.to==null)o.to=s.to||"";if(o.on==null)o.on=!!s.on;o.done=o.done||{}}return c}
function save(c){try{localStorage.setItem(KEY(),JSON.stringify(c))}catch(x){}}

// ---------- dokument ----------
async function open(k){const s=SEC.find(x=>x.k===k);if(!s||!OK())return;const W=week(),C=cfg(),o=C[k],F=FIRM[s.firm];
  say("📧 Pripravujem týždenný súhrn – "+s.t+"…",3000);let R;try{R=await s.b(W)}catch(x){say("Súhrn sa nepodarilo pripraviť: "+(x&&x.message||x),7000);return}
  const title=`Týždenný súhrn ${s.t} ${W.file}`;
  const css=`body{font:12px/1.45 Arial,sans-serif;color:#111}h2{font:800 14px Arial,sans-serif;margin:16px 0 6px;color:#222}table{width:100%;border-collapse:collapse;margin:4px 0 8px}th,td{border:1px solid #d6d9e0;padding:4px 6px;text-align:left;vertical-align:top}th{font-size:11px}tr{page-break-inside:avoid}
   .kps{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.kp{border:1px solid #d6d9e0;border-radius:8px;padding:6px 8px}.kp b{display:block;font-size:16px}.kp small{color:#555;font-size:10px}.kp.r b{color:#b91c1c}.kp.w b{color:#b45309}.kp.g b{color:#15803d}.nic{color:#666;font-style:italic}.zh{color:#444;font-size:11px;margin:6px 0 0}
   ${typeof brandCss==="function"?brandCss(s.firm):""}`;
  const head=typeof brandHead==="function"?brandHead(s.firm,`${s.i} Týždenný súhrn – ${E(s.t)}`,`Obdobie: ${E(W.txt)} · vyhotovené ${E(dT(new Date()))}`):`<h1>${s.i} Týždenný súhrn – ${E(s.t)}</h1><p>${E(W.txt)}</p>`;
  const body=`Dobrý deň,\n\nv prílohe posielam týždenný súhrn – ${s.t} (${F.n}) za obdobie ${W.txt}: ${s.what}.\n\nV skratke: ${R.sum}.\n\nS pozdravom\nMartin Vaľko\n${F.sign}`;
  window.__pvMail={to:o.to||"",subj:`Týždenný súhrn – ${s.t} – ${W.txt}`,body,prof:s.prof,cc:[]};
  const w=window.open("");if(!w){say("Dokument sa nepodarilo otvoriť.",5000);return}
  w.document.open();w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${E(title)}</title><style>${css}</style></head><body>${head}<p class="zh">Od: <b>${E(F.from)}</b> (${E(F.n)}) · Komu: <b>${E(o.to||"– doplň príjemcu –")}</b> · ${E(R.sum)}</p>${R.html}<p class="zh">Súhrn pripravila aplikácia ERNTE Trade &amp; Logistic z údajov v databáze; odoslanie schvaľuje Martin Vaľko.</p></body></html>`);w.document.close();
  // posledný týždeň označiť ako „otvorený“ (pripomienka ostáva, kým Martin neťukne ✔️ Odoslané)
  o.seen=o.seen||{};o.seen[W.key]=Date.now();save(C)}
window.ernteTyzdenOpen=open;

// ---------- karta v sekcii ----------
function cardHTML(s){const C=cfg(),o=C[s.k],W=week(),F=FIRM[s.firm],dn=!!o.done[W.key];
  return `<div class="card tyzc" id="tyzCard" data-tyzk="${s.k}"><div class="tyzh"><b>📧 Týždenný súhrn e-mailom · ${s.i} ${E(s.t)}</b><small>Každý pondelok ráno pripravím PDF za minulý týždeň (${E(s.what)}). Ty ho iba skontroluješ a ťukneš Odoslať – sám nič neodošlem.</small></div>
   <div class="tyzf"><div class="tyzr"><span>Od</span><b>${E(F.from)}</b><small>${E(F.n)}</small></div>
   <label class="tyzr"><span>Komu</span><input type="email" inputmode="email" autocapitalize="off" data-tyzto="${s.k}" value="${E(o.to)}" placeholder="doplň e-mail príjemcu"></label>
   <label class="tyzck"><input type="checkbox" data-tyzon="${s.k}"${o.on?" checked":""}> Pripraviť každý pondelok ráno</label></div>
   <div class="btns"><button type="button" class="pri" data-tyzopen="${s.k}">👁 Zobraziť a odoslať · ${E(W.txt)}</button><button type="button" data-tyzdone="${s.k}" aria-pressed="${dn}">${dn?"✅ Odoslané":"✔️ Odoslal som"}</button></div></div>`}
function paint(){const app=document.getElementById("app");if(!app)return;const old=document.getElementById("tyzCard");
  const T=typeof TAB!=="undefined"?TAB:"",s=OK()?SEC.find(x=>x.tabs.includes(T)):null;
  if(!s){if(old)old.remove();return}
  if(old&&old.dataset.tyzk===s.k)return;
  const d=document.createElement("div");d.innerHTML=cardHTML(s);const el=d.firstElementChild;if(old)old.replaceWith(el);else app.appendChild(el)}

// ---------- pondelok: okno „Týždenné súhrny sú pripravené“ ----------
function pending(){const C=cfg(),W=week();return SEC.filter(s=>{const o=C[s.k];return o.on&&o.to&&!o.done[W.key]})}
function pop(force){if(!OK())return;const W=week(),now=new Date();if(!force){if((now.getDay()+6)%7>2)return; // pondelok – streda
  if(now.getDay()===1&&now.getHours()<5)return;try{if(localStorage.getItem(KEY()+":pop")===now.toDateString())return}catch(x){}}
  const P=pending();if(!P.length){if(force)say("✅ Všetky týždenné súhrny za "+W.txt+" sú odoslané.",5000);return}if(document.getElementById("tyzPop"))return;
  if((document.querySelector(".wlc")||document.getElementById("pvSetup")||document.getElementById("pdfv"))&&!force){setTimeout(()=>pop(),4000);return} // počkať, kým sa zavrie úvod LIVE
  try{localStorage.setItem(KEY()+":pop",now.toDateString())}catch(x){}
  const C=cfg(),d=document.createElement("div");d.id="tyzPop";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");
  d.innerHTML=`<div class="tyzpb"><button type="button" class="tyzx" data-tyzx aria-label="Zavrieť">✕</button><b class="tyzpt">📧 Týždenné súhrny sú pripravené</b><small>Za týždeň ${E(W.txt)} · skontroluj a odošli. Bez tvojho ťuknutia neodíde nič.</small>
   ${P.map(s=>`<div class="tyzpr"><span><b>${s.i} ${E(s.t)}</b><small>Od ${E(FIRM[s.firm].from)} → ${E(C[s.k].to)}</small></span><button type="button" class="pri" data-tyzopen="${s.k}">Otvoriť</button></div>`).join("")}
   <div class="btns"><button type="button" data-tyzx>Zavrieť</button></div></div>`;
  document.body.appendChild(d)}
window.ernteTyzdenPop=()=>pop(true);

document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-tyzopen],[data-tyzdone],[data-tyzx]");if(!t)return;e.preventDefault();
  if(t.dataset.tyzx!=null){const p=document.getElementById("tyzPop");if(p)p.remove();return}
  if(t.dataset.tyzopen){const p=document.getElementById("tyzPop");if(p)p.remove();open(t.dataset.tyzopen);return}
  if(t.dataset.tyzdone){const C=cfg(),o=C[t.dataset.tyzdone],W=week();if(o.done[W.key])delete o.done[W.key];else o.done[W.key]=Date.now();save(C);const c=document.getElementById("tyzCard");if(c)c.remove();paint();say(o.done[W.key]?"✅ Označené ako odoslané":"Označenie zrušené",3000)}},true);
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.dataset)return;
  if(t.dataset.tyzto){const C=cfg();C[t.dataset.tyzto].to=t.value.trim();save(C);say("✓ Príjemca uložený",2500)}
  else if(t.dataset.tyzon){const C=cfg();C[t.dataset.tyzon].on=t.checked;save(C)}},true);

{const s=document.createElement("style");s.textContent=`.tyzc{text-align:left}#tyzCard.sbh{display:block!important}.tyzh b{display:block;font-size:1.02rem}.tyzh small{display:block;opacity:.75;margin-top:4px;line-height:1.4}
.tyzf{display:grid;gap:8px;margin:10px 0}.tyzr{display:grid;grid-template-columns:56px 1fr;align-items:center;gap:4px 8px;min-width:0}.tyzr>span{opacity:.7;font-size:.85rem}.tyzr>b{overflow-wrap:anywhere}.tyzr>small{grid-column:2;opacity:.6;font-size:.8rem}.tyzr input{width:100%;min-width:0;box-sizing:border-box}
.tyzck{display:flex;align-items:center;gap:8px;min-height:44px}.tyzc .btns{display:flex;flex-wrap:wrap;gap:8px}.tyzc .btns button{flex:1 1 220px;min-height:48px;white-space:normal}
#tyzPop{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:16px;background:rgba(2,6,15,.72)}
.tyzpb{position:relative;width:min(520px,100%);max-height:88vh;overflow:auto;box-sizing:border-box;padding:20px 16px 14px;border-radius:20px;background:#0B0F19;border:1px solid rgba(94,234,212,.55);box-shadow:0 20px 60px -20px rgba(94,234,212,.45);color:#fff}
.tyzpt{display:block;font-size:1.1rem;padding-right:44px}.tyzpb>small{display:block;opacity:.75;margin:4px 0 10px}
.tyzx{position:absolute;top:10px;right:10px;width:40px;height:40px;min-width:40px;border-radius:50%;padding:0;display:grid;place-items:center;aspect-ratio:1}
.tyzpr{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}.tyzpr>span{flex:1;min-width:0;display:grid}.tyzpr>span small{opacity:.65;overflow-wrap:anywhere}.tyzpr button{flex:none;min-height:44px}
.tyzpb .btns{display:flex;justify-content:flex-end;margin-top:8px}.tyzpb .btns button{min-height:44px}`;document.head.appendChild(s)}

let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;paint()})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  setTimeout(()=>pop(),6000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(()=>pop(),3000)})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
