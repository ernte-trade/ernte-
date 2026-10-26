// ===== ERNTE · AGRO SLUŽBY (Excel „Stroje v počte“) =====
// Majiteľ: kalkulácia strojov (náklady, bod nula, marža, porovnanie, reálne tankovanie), cenník služieb, objednávky.
// Zamestnanec s prístupom „agro“: objednávky a cenník bez nákladov. Farmár: cenník služieb, objednávka, moje objednávky.
(function(){
const AGM=[["CLAAS","T","AXION 830",235,null,36.1,25.2,48.6],["CLAAS","T","AXION 850",264,null,40.6,28.3,54.6],["CLAAS","T","AXION 870",295,null,45.3,31.6,61],["CLAAS","T","AXION 920",325,null,49.9,34.9,67.2],["CLAAS","T","AXION 930",355,null,54.6,38.1,73.4],["CLAAS","T","AXION 940",385,null,59.2,41.3,79.6],["CLAAS","T","AXION 950",410,null,63,44,84.7],["CLAAS","T","AXION 960",445,null,68.4,47.7,92],["CLAAS","T","XERION 4200",462,null,71,49.6,95.5],["CLAAS","T","XERION 4500",490,null,75.3,52.6,101.3],["CLAAS","T","XERION 5000",530,null,81.4,56.8,109.5],["CLAAS","T","XERION 12.590",585,null,89.9,62.7,120.9],["CLAAS","T","XERION 12.650",653,null,100.3,70,134.9],["CLAAS","K","TRION 530",258,null,29.2,21.9,36.5],["CLAAS","K","TRION 540",306,null,34.6,26,43.3],["CLAAS","K","TRION 550",354,null,40,30,50],["CLAAS","K","TRION 650",354,null,40,30,50],["CLAAS","K","TRION 660",408,null,46.1,34.6,57.6],["CLAAS","K","TRION 730",408,null,46.1,34.6,57.6],["CLAAS","K","TRION 740",435,null,49.2,36.9,61.5],["CLAAS","K","TRION 750",466,null,52.7,39.5,65.9],["CLAAS","K","LEXION 5500",408,null,46.1,34.6,57.6],["CLAAS","K","LEXION 6600",408,null,46.1,34.6,57.6],["CLAAS","K","LEXION 6700",408,null,46.1,34.6,57.6],["CLAAS","K","LEXION 6900",507,null,57.3,43,71.6],["CLAAS","K","LEXION 7400",408,null,46.1,34.6,57.6],["CLAAS","K","LEXION 7500",435,null,49.2,36.9,61.5],["CLAAS","K","LEXION 7600",507,null,57.3,43,71.6],["CLAAS","K","LEXION 7700",585,null,66.1,49.6,82.6],["CLAAS","K","LEXION 7800",625,null,70.6,53,88.3],["CLAAS","K","LEXION 8600",549,null,62.1,46.6,77.6],["CLAAS","K","LEXION 8700 TERRA TRAC",585,null,66.1,49.6,82.6],["CLAAS","K","LEXION 8800 TERRA TRAC",700,65,79.1,59.3,98.9],["CLAAS","K","LEXION 8900 TERRA TRAC",790,66,89.3,67,111.6],["Case IH","T","Puma 240",240,null,36.9,25.7,49.6],["Case IH","T","Optum 270",288,null,44.3,30.9,59.5],["Case IH","T","Optum 300",313,null,48.1,33.6,64.7],["Case IH","T","Optum 340",340,null,52.2,36.5,70.3],["Case IH","T","Optum 360",360,null,55.3,38.6,74.4],["Case IH","T","Optum 390",390,null,59.9,41.8,80.6],["Case IH","T","Optum 440",440,null,67.6,47.2,90.9],["Case IH","T","Magnum 355",355,null,54.6,38.1,73.4],["Case IH","T","Magnum 385",385,null,59.2,41.3,79.6],["Case IH","T","Magnum 405",405,null,62.2,43.4,83.7],["Case IH","T","Steiger 425",425,null,65.3,45.6,87.8],["Case IH","T","Steiger 475",475,null,73,50.9,98.2],["Case IH","T","Steiger 525",525,null,80.7,56.3,108.5],["Case IH","T","Steiger 555",555,null,85.3,59.5,114.7],["Case IH","T","Steiger 595",595,null,91.4,63.8,123],["Case IH","T","Steiger 645",645,null,99.1,69.2,133.3],["Case IH","T","Steiger 715",715,null,109.9,76.7,147.7],["Case IH","T","Steiger 785",785,null,120.6,84.2,162.2],["Case IH","K","Axial-Flow 6160",400,null,45.2,33.9,56.5],["Case IH","K","Axial-Flow 7160",460,null,52,39,65],["Case IH","K","Axial-Flow 7250",498,null,56.3,42.2,70.4],["Case IH","K","Axial-Flow 8250",571,null,64.5,48.4,80.6],["Case IH","K","Axial-Flow 9250",634,null,71.7,53.8,89.6],["Case IH","K","Axial-Flow AF9",635,null,71.8,53.9,89.8],["Case IH","K","Axial-Flow AF10",775,null,87.6,65.7,109.5],["Fendt","T","722 Vario Gen7.1",223,null,34.3,23.9,46.1],["Fendt","T","724 Vario Gen7.1",243,null,37.3,26.1,50.2],["Fendt","T","726 Vario Gen7.1",262,null,40.3,28.1,54.1],["Fendt","T","728 Vario Gen7.1",283,null,43.5,30.4,58.5],["Fendt","T","826 Vario",260,null,40,27.9,53.7],["Fendt","T","829 Vario",290,null,44.6,31.1,59.9],["Fendt","T","832 Vario",320,null,49.2,34.3,66.1],["Fendt","T","930 Vario",296,null,45.5,31.7,61.2],["Fendt","T","933 Vario",326,null,50.1,35,67.4],["Fendt","T","936 Vario",355,null,54.6,38.1,73.4],["Fendt","T","939 Vario",385,null,59.2,41.3,79.6],["Fendt","T","942 Vario",415,null,63.8,44.5,85.8],["Fendt","T","1040 Vario",426,null,65.5,45.7,88],["Fendt","T","1044 Vario",466,null,71.6,50,96.3],["Fendt","T","1048 Vario",517,null,79.4,55.5,106.8],["Fendt","T","1052 Vario",550,null,84.5,59,113.7],["Fendt","K","C 5255",260,null,29.4,22.1,36.8],["Fendt","K","C 5275",306,null,34.6,26,43.3],["Fendt","K","IDEAL 7",451,null,51,38.3,63.8],["Fendt","K","IDEAL 8",538,null,60.8,45.6,76],["Fendt","K","IDEAL 9",647,null,73.1,54.8,91.4],["Fendt","K","IDEAL 10",790,null,89.3,67,111.6],["Fendt","P","1167 Vario MT",680,112,112,90,125]];
const TYP={T:"Traktor",K:"Kombajn",P:"Pásový traktor"};
const mId=m=>m[0]+" | "+m[2];
const mFind=id=>AGM.find(m=>mId(m)===id)||AGM[0];
// --- predvolené vstupy = hodnoty z Excelu ---
const DEF_M=(model,price)=>({model,speed:12,width:5,eff:85,unit:"l/ha",own:"",price,life:5000,net:1800,hours:174,svc:4,ins:1.5,annual:1000,ovh:0,sell:46.68,tankL:"",tankHa:""});
const DEF={m:[DEF_M("CLAAS | AXION 850",154000),DEF_M("CLAAS | AXION 930",230000)],fuel:1.92,fuelDate:"2026-09-17",area:50};
DEF.m[0].tankL=450;DEF.m[0].tankHa=50;DEF.m[1].tankL=600;DEF.m[1].tankHa=50;
const STS={nova:["nová","w"],potvrdena:["potvrdená","b"],v_praci:["v práci","b"],hotova:["hotová",""],zrusena:["zrušená","g"]};
const UN={ha:"ha",h:"mth",t:"t",km:"km",ks:"ks"};
let A={sec:"",cfg:null,orders:null,srv:null,flt:"open",edit:null,saveT:null};
const n=v=>{const x=typeof num==="function"?num(v):+v;return Number.isFinite(x)?x:NaN};
const f2=(x,d=2)=>fmt(x,d);
// zamestnanec: celková cena práce z čistej mzdy (SR 2026: odvody zamestnanca 14,4 %, daň 19 %, NČZD 497,23 €/mes., odvody zamestnávateľa 36,2 %)
const empCost=net=>Math.round(((net-497.23*0.19)/((1-0.144)*(1-0.19)))*1.362*100)/100;
// --- výpočet jedného stroja (logika Excelu + opravy) ---
function calc(m,c){const M=mFind(m.model),pub=M[4],est=M[5],cat=pub!=null?pub:est;
  const theo=n(m.speed)*n(m.width)/10,eff=Math.min(100,Math.max(30,n(m.eff)||100))/100,cap=theo*eff;
  const own=m.own===""||m.own==null?NaN:n(m.own),hasOwn=Number.isFinite(own);
  const lph=hasOwn?(m.unit==="l/h"?own:own*cap):cat, lha=cap>0?lph/cap:NaN;
  const price=n(m.price),emp=empCost(n(m.net)),dep=price/n(m.life),empH=emp/n(m.hours),svc=price*n(m.svc)/100/n(m.annual),ins=price*n(m.ins)/100/n(m.annual)+(n(m.ovh)||0);
  const costH=dep+empH+svc+ins,costHa=costH/cap,sell=n(m.sell),margin=sell-costHa,area=n(c.area);
  const realL=n(m.tankL),realHa=n(m.tankHa),real=realL>0&&realHa>0?realL/realHa:NaN,fp=n(c.fuel);
  return {M,cat,pub,est,src:hasOwn?"vlastný údaj":pub!=null?"publikovaný údaj / test":"modelový odhad z verejných testov",theo,eff,cap,lph,lha,emp,dep,empH,svc,ins,costH,costHa,sell,margin,
    pct:sell>0?margin/sell*100:NaN,profit:margin*area,mthPrice:sell*cap,mthProfit:sell*cap-costH,hrs:area/cap,
    payback:margin+dep/cap>0?price/((margin+dep/cap)*5):NaN,fuelHa:lha*fp,custHa:sell+lha*fp,real,realFuelHa:real*fp,realCustHa:sell+real*fp,area,
    depHa:dep/cap,empHa:empH/cap,svcHa:(svc+ins)/cap}}
const nm=m=>esc(m.model);
// ===== MAJITEĽ / TÍM =====
window.vAgro=function(){const OWN=ROLE==="owner",SEC=[["ord","📋","Objednávky","od farmárov · stav · termíny"],["srv","💶","Cenník služieb","čo vidia a objednávajú farmári"]];
  if(OWN)SEC.push(["calc","🧮","Kalkulácia strojov","náklady · bod nula · marža · porovnanie"],["cat","📚","Katalóg strojov","82 strojov · spotreba nafty"]);
  let h=`<div class="zt"><h2>🚜 Agro služby ${A.sec?`<button type="button" class="ztb" data-asec="">← späť</button>`:""}</h2>`;
  if(!A.sec){if(!A.orders)loadOrders();const nw=(A.orders||[]).filter(o=>o.status==="nova").length;
    return h+`<div class="zgrid">${SEC.map(s=>`<button type="button" class="zbtn" data-asec="${s[0]}"><span>${s[1]}</span><b>${s[2]}${s[0]==="ord"&&nw?` <em class="acnt">${nw} nové</em>`:""}</b><small>${s[3]}</small></button>`).join("")}</div>
      <div class="s">🔒 Náklady, marža a kalkulácia sú iba pre teba. Farmár vidí len cenník služieb, ktorý zverejníš, a svoje objednávky.</div></div>`}
  if(A.sec==="ord")h+=ordHTML();else if(A.sec==="srv")h+=srvHTML();else if(A.sec==="calc"&&OWN)h+=calcHTML();else if(A.sec==="cat"&&OWN)h+=catHTML();
  return h+`</div>`};
// --- objednávky ---
async function loadOrders(){const r=await sb.rpc("agro_orders_staff");A.orders=r.error?{err:r.error.message}:r.data||[];if(typeof TAB!=="undefined"&&TAB==="agro")renderStaff()}
function ordHTML(){const O=A.orders;if(!O){loadOrders();return `<div class="card"><div class="s">Načítavam objednávky…</div></div>`}
  if(O.err)return `<div class="card"><div class="s">${/agro_orders/.test(O.err)?"Agro služby sa zapnú po aktualizácii databázy (pár minút).":esc(O.err)}</div></div>`;
  const F={open:o=>["nova","potvrdena","v_praci"].includes(o.status),nova:o=>o.status==="nova",hotova:o=>o.status==="hotova",all:()=>true},L=O.filter(F[A.flt]||F.open);
  const op=O.filter(F.open),qty=op.reduce((s,o)=>s+(o.unit==="ha"?+o.qty:0),0),done=O.filter(o=>o.status==="hotova").reduce((s,o)=>s+(+o.total||0),0);
  let h=`<div class="hrk"><div class="${O.some(F.nova)?"wn":""}"><small>Nové objednávky</small><b>${O.filter(F.nova).length}</b></div><div><small>Otvorené</small><b>${op.length} · ${f2(qty,1)} ha</b></div><div><small>Otvorené v cene</small><b>${f2(op.reduce((s,o)=>s+(+o.total||0),0),0)} €</b></div><div class="ps"><small>Hotové spolu</small><b>${f2(done,0)} €</b></div></div>
   <div class="btns seg2">${[["open","Otvorené"],["nova","Nové"],["hotova","Hotové"],["all","Všetky"]].map(x=>`<button type="button" data-aflt="${x[0]}" aria-pressed="${A.flt===x[0]}">${x[1]}</button>`).join("")}</div>`;
  if(!L.length)return h+`<div class="card"><div class="s">Žiadne objednávky v tomto zozname.</div></div>`;
  return h+`<div class="agl">${L.map(o=>{const tel=String(o.phone||"").replace(/\D/g,"").replace(/^00/,"").replace(/^0/,"421");
    return `<div class="card agc ${o.status}"><div class="row"><span class="t">${esc(o.service_name||"Služba")}</span>${pill(STS[o.status]||[o.status])}</div>
    <div class="s"><b>${esc(o.farmer)}</b>${o.addr?" · "+esc(o.addr):""} · ${esc(o.no||"")} · ${esc(dtSK(o.created_at))}</div>
    <div class="zsg"><div><small>Množstvo</small><b>${f2(o.qty,1)} ${UN[o.unit]||o.unit}</b></div><div><small>Cena</small><b>${f2(o.price)} €/${UN[o.unit]||o.unit}</b></div><div class="hl"><small>Spolu bez DPH</small><b>${f2(o.total)} €</b></div><div><small>Termín</small><b>${o.planned?"📅 "+esc(dSK(o.planned)):o.date_from||o.date_to?esc((o.date_from?dSK(o.date_from):"…")+" – "+(o.date_to?dSK(o.date_to):"…")):"dohodou"}</b></div></div>
    ${o.place?`<div class="s">📍 ${esc(o.place)}</div>`:""}${o.note?`<div class="s">💬 ${esc(o.note)}</div>`:""}${o.reply?`<div class="s">↩️ ERNTE: ${esc(o.reply)}</div>`:""}
    ${o.status!=="zrusena"&&o.status!=="hotova"?`<form class="f agf" data-aord="${esc(o.id)}"><label>Termín práce<input type="date" name="planned" value="${esc(o.planned||"")}"></label><label>Skutočne ${UN[o.unit]||o.unit}<input name="done_qty" inputmode="decimal" value="${o.done_qty!=null?String(o.done_qty).replace(".",","):""}" placeholder="${f2(o.qty,1)}"></label>
      <label class="w">Odpoveď farmárovi<input name="reply" value="${esc(o.reply||"")}" placeholder="napr. prídeme v utorok ráno"></label>
      <div class="w btns">${o.status==="nova"?`<button class="pri" name="st" value="potvrdena">✓ Potvrdiť</button>`:""}${o.status!=="v_praci"?`<button name="st" value="v_praci">🚜 V práci</button>`:""}<button class="lime" name="st" value="hotova">✅ Hotovo</button><button name="st" value="">💾 Uložiť</button><button class="ghost" name="st" value="zrusena">✕ Zrušiť</button></div></form>`:""}
    <div class="btns">${o.phone?`<a class="btn" href="tel:${esc(String(o.phone).replace(/\s/g,""))}">📞 Zavolať</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent(`Dobrý deň, ERNTE Agro služby – objednávka ${o.no}: ${o.service_name}, ${f2(o.qty,1)} ${UN[o.unit]||o.unit}.${o.planned?" Termín: "+dSK(o.planned)+".":""}${o.reply?" "+o.reply:""}`)}">WhatsApp</a>`:""}</div></div>`}).join("")}</div>`}
// --- cenník služieb ---
async function loadSrv(){const r=await sb.from("agro_services").select("*").order("sort").order("name");A.srv=r.error?{err:r.error.message}:r.data||[];rerender()}
function srvForm(s){s=s||{unit:"ha",active:false,fuel_by_customer:true,sort:100};
  return `<form class="card f" id="fASrv" data-id="${esc(s.id||"")}"><div class="w t">${s.id?"Upraviť službu":"Nová služba"}</div>
   <label class="w">Názov služby<input name="name" required value="${esc(s.name||"")}" placeholder="napr. Podmietka tanierovým náradím"></label>
   <label>Stroj<input name="machine" value="${esc(s.machine||"")}" placeholder="napr. CLAAS AXION 850 · 5 m"></label>
   <label>Jednotka<select name="unit">${Object.entries({ha:"€ / ha",h:"€ / motohodina",t:"€ / t",km:"€ / km",ks:"€ / kus"}).map(([k,v])=>`<option value="${k}"${s.unit===k?" selected":""}>${v}</option>`).join("")}</select></label>
   <label>Cena bez DPH<input name="price" inputmode="decimal" required value="${s.price!=null?String(s.price).replace(".",","):""}"></label>
   <label>Nafta – odhad l/ha<input name="fuel_lha" inputmode="decimal" value="${s.fuel_lha!=null?String(s.fuel_lha).replace(".",","):""}"></label>
   <label>Minimálne množstvo<input name="min_qty" inputmode="decimal" value="${s.min_qty!=null?String(s.min_qty).replace(".",","):""}"></label>
   <label>Poradie<input name="sort" inputmode="numeric" value="${esc(s.sort??100)}"></label>
   <label class="w">Popis pre farmára<textarea name="descr" rows="2">${esc(s.descr||"")}</textarea></label>
   <label class="pck w"><input type="checkbox" name="fuel_by_customer"${s.fuel_by_customer!==false?" checked":""}><span>Naftu tankuje zákazník</span></label>
   <label class="pck w"><input type="checkbox" name="active"${s.active?" checked":""}><span><b>Zverejniť farmárom</b> – uvidia cenu a môžu objednať</span></label>
   <div class="w btns"><button class="pri">💾 Uložiť</button><button type="button" class="ghost" data-asedit="">Zavrieť</button>${s.id?`<button type="button" class="ghost" data-asdel="${esc(s.id)}">🗑️ Zmazať</button>`:""}</div></form>`}
function srvCard(s,own){return `<div class="card agsv ${s.active?"on":"off"}"><div class="row"><span class="t">${esc(s.name)}</span>${pill(s.active?["zverejnená",""]:["skrytá","g"])}</div>
  ${s.machine?`<div class="s">🚜 ${esc(s.machine)}</div>`:""}${s.descr?`<div class="s">${esc(s.descr)}</div>`:""}
  <div class="zsg"><div class="hl"><small>Cena bez DPH</small><b>${f2(s.price)} €/${UN[s.unit]||s.unit}</b></div><div><small>Nafta</small><b>${s.fuel_by_customer!==false?"tankuje zákazník":"v cene"}${s.fuel_lha?` · ~${f2(s.fuel_lha,1)} l/ha`:""}</b></div>${s.min_qty?`<div><small>Minimum</small><b>${f2(s.min_qty,0)} ${UN[s.unit]||s.unit}</b></div>`:""}</div>
  ${own?`<div class="btns"><button type="button" data-asedit="${esc(s.id)}">✏️ Upraviť</button><button type="button" data-astog="${esc(s.id)}">${s.active?"🙈 Skryť farmárom":"👁️ Zverejniť farmárom"}</button></div>`:""}</div>`}
function srvHTML(){const S=A.srv,OWN=ROLE==="owner";if(!S){loadSrv();return `<div class="card"><div class="s">Načítavam cenník…</div></div>`}
  if(S.err)return `<div class="card"><div class="s">${/agro_services/.test(S.err)?"Agro služby sa zapnú po aktualizácii databázy (pár minút).":esc(S.err)}</div></div>`;
  let h=`<div class="s">${OWN?"Zverejnené služby vidia farmári s cenou a môžu si ich objednať. Skryté vidíš iba ty. Cenu vieš prevziať z Kalkulácie strojov.":"Cenník služieb, ktorý vidia farmári."}</div>`;
  if(OWN&&A.edit==="new")h+=srvForm();else if(OWN)h+=`<div class="btns"><button type="button" class="pri" data-asedit="new">➕ Nová služba</button></div>`;
  return h+(S.length?S.map(s=>OWN&&A.edit===s.id?srvForm(s):srvCard(s,OWN)).join(""):`<div class="card"><div class="s">Zatiaľ žiadna služba.</div></div>`)}
// --- kalkulácia ---
async function loadCfg(){const r=await sb.from("agro_cfg").select("value").eq("key","calc").maybeSingle();
  A.cfg=r.error?{err:r.error.message}:JSON.parse(JSON.stringify(r.data&&r.data.value&&r.data.value.m?r.data.value:DEF));renderStaff()}
function saveCfg(){clearTimeout(A.saveT);A.saveT=setTimeout(async()=>{const r=await sb.from("agro_cfg").upsert({key:"calc",value:A.cfg,updated_at:new Date().toISOString()});const el=document.getElementById("agSave");if(el)el.textContent=r.error?"⚠️ Neuložené":"✓ Uložené"},900)}
const inp=(i,k,lab,unit,attr="")=>`<label>${lab}${unit?` <small>${unit}</small>`:""}<input data-ak="${i}.${k}" inputmode="decimal" value="${esc(String(i==="c"?A.cfg[k]??"":A.cfg.m[i][k]??"").replace(".",","))}" ${attr}></label>`;
function mInputs(i){const m=A.cfg.m[i],M=mFind(m.model);const groups=[...new Set(AGM.map(x=>x[0]+" · "+TYP[x[1]]))];
  return `<details class="card hsec agin"${i===0?" open":""}><summary><span>${i?"2️⃣":"1️⃣"}</span><b>Stroj ${i+1}: ${nm(m)}</b><small>${esc(TYP[M[1]])} · ${M[3]} hp · katalóg ${f2(M[5],1)} l/h</small></summary><div class="f agf">
   <label class="w">Model<select data-ak="${i}.model">${groups.map(g=>`<optgroup label="${esc(g)}">${AGM.filter(x=>x[0]+" · "+TYP[x[1]]===g).map(x=>`<option value="${esc(mId(x))}"${mId(x)===m.model?" selected":""}>${esc(x[2])} · ${x[3]} hp</option>`).join("")}</optgroup>`).join("")}</select></label>
   <div class="w s agh">Práca</div>${inp(i,"speed","Rýchlosť","km/h")}${inp(i,"width","Pracovný záber","m")}${inp(i,"eff","Efektivita poľa","%")}
   <label>Jednotka vlastnej spotreby<select data-ak="${i}.unit"><option value="l/ha"${m.unit==="l/ha"?" selected":""}>l/ha</option><option value="l/h"${m.unit==="l/h"?" selected":""}>l/h</option></select></label>${inp(i,"own","Vlastná spotreba",m.unit,'placeholder="prázdne = odhad z katalógu"')}
   <div class="w s agh">Náklady</div>${inp(i,"price","Obstarávacia cena súpravy","€")}${inp(i,"life","Odpisovaná životnosť","mth")}${inp(i,"net","Čistá mzda obsluhy","€/mes.")}${inp(i,"hours","Pracovné hodiny mesačne","h")}
   ${inp(i,"svc","Servis a opravy","% z ceny/rok")}${inp(i,"ins","Poistenie","% z ceny/rok")}${inp(i,"annual","Ročné využitie","mth/rok")}${inp(i,"ovh","Dodatočná réžia","€/h")}
   <div class="w s agh">Predaj a reálne tankovanie</div>${inp(i,"sell","Cena služby","€/ha")}${inp(i,"tankL","Natankované","l")}${inp(i,"tankHa","Odpracovaná plocha","ha")}</div></details>`}
function resHTML(){const C=A.cfg,R=C.m.map(m=>calc(m,C)),[a,b]=R,na=nm(C.m[0]),nb=nm(C.m[1]),same=C.m[0].model===C.m[1].model;
  const tile=(l,v,c="")=>`<div class="${c}"><small>${l}</small><b>${v}</b></div>`;
  const mach=(r,i)=>`<div class="card agr ${r.margin>=0?"gain":"loss"}"><div class="row"><span class="t">${i+1}. ${nm(C.m[i])}</span>${pill(r.margin>0.005?["ZISK",""]:r.margin<-0.005?["STRATA","r"]:["NULA","w"])}</div>
    <div class="zsg agbig">${tile("Bod nula (náklad)",f2(r.costHa)+" €/ha")}${tile("Cena služby",f2(r.sell)+" €/ha")}${tile(r.margin>=0?"Zisk na hektár":"Strata na hektár",f2(r.margin)+" €/ha",r.margin>=0?"hl":"wn")}${tile("Zisk zákazky "+f2(r.area,0)+" ha",f2(r.profit,0)+" €",r.profit>=0?"hl":"wn")}</div>
    <div class="zsg">${tile("Výkon",f2(r.cap,2)+" ha/h")}${tile("Náklad na hodinu",f2(r.costH)+" €/h")}${tile("Cena za motohodinu",f2(r.mthPrice)+" €/mth")}${tile("Zisk na motohodinu",f2(r.mthProfit)+" €/mth",r.mthProfit>=0?"":"wn")}${tile("Marža",f2(r.pct,1)+" %")}${tile("Na splatenie stroja za 5 rokov",Number.isFinite(r.payback)?f2(r.payback,0)+" ha/rok":"–")}${tile("Spotreba",f2(r.lha,2)+" l/ha · "+f2(r.lph,1)+" l/h")}${tile("Čas na zákazku",f2(r.hrs,1)+" h")}</div>
    <div class="agbar" title="Skladba nákladu na hektár"><i style="flex:${r.depHa}" class="d"></i><i style="flex:${r.empHa}" class="e"></i><i style="flex:${r.svcHa}" class="s"></i></div>
    <div class="s">Náklad ${f2(r.costHa)} €/ha = odpis ${f2(r.depHa)} + obsluha ${f2(r.empHa)} + servis, poistenie a réžia ${f2(r.svcHa)}. Celková cena obsluhy ${f2(r.emp)} €/mes. Spotreba: ${esc(r.src)}. Efektivita poľa ${f2(r.eff*100,0)} % (teoreticky ${f2(r.theo,1)} ha/h).</div>
    <div class="btns"><button type="button" class="pri" data-apub="${i}">💶 Dať ${f2(r.sell)} €/ha do cenníka služieb</button></div></div>`;
  // porovnanie – vždy pomenuje lacnejší stroj (oprava: Excel mal napevno „CLAAS − Fendt“ a ABS bez smeru)
    const est=b.custHa-a.custHa,real=Number.isFinite(a.real)&&Number.isFinite(b.real)?(b.realCustHa-a.realCustHa):NaN;
  const cmp=same?"":`<div class="card agcmp"><b class="sth">Porovnanie pre zákazníka · služba + nafta (naftu platí zákazník)</b>
   <div class="agct"><div class="agch"><span></span><b>1. ${na}</b><b>2. ${nb}</b></div>${[["Spotreba – odhad","l/ha",a.lha,b.lha,2],["Nafta zákazníka – odhad","€/ha",a.fuelHa,b.fuelHa],["Konečná cena – odhad","€/ha",a.custHa,b.custHa],["Spotreba – reálne tankovanie","l/ha",a.real,b.real,2],["Nafta – reálne","€/ha",a.realFuelHa,b.realFuelHa],["Konečná cena – reálne","€/ha",a.realCustHa,b.realCustHa],["Náš náklad","€/ha",a.costHa,b.costHa],["Náš zisk","€/ha",a.margin,b.margin,2,1]].filter(r=>Number.isFinite(r[2])||Number.isFinite(r[3])).map(r=>{const ok=Number.isFinite(r[2])&&Number.isFinite(r[3])&&Math.abs(r[2]-r[3])>=0.005,w=ok?((r[5]?r[2]>r[3]:r[2]<r[3])?0:1):-1;
     return `<div class="agcr"><span>${r[0]} <small>${r[1]}</small></span><b class="${w===0?"win":""}">${f2(r[2],r[4]??2)}</b><b class="${w===1?"win":""}">${f2(r[3],r[4]??2)}</b></div>`}).join("")}</div>
   <div class="zsg">${tile("Úspora zákazníka – odhad",Math.abs(est)<0.005?"0 €":f2(Math.abs(est)*a.area,0)+" € · "+(est>0?na:nb),"hl")}${Number.isFinite(real)?tile("Úspora zákazníka – reálne",Math.abs(real)<0.005?"0 €":f2(Math.abs(real)*a.area,0)+" € · "+(real>0?na:nb),"hl"):""}${Number.isFinite(a.real)?tile("Reál vs. odhad · S1",(a.real-a.lha>=0?"+":"")+f2(a.real-a.lha,2)+" l/ha",Math.abs(a.real-a.lha)>1?"wn":""):""}${Number.isFinite(b.real)?tile("Reál vs. odhad · S2",(b.real-b.lha>=0?"+":"")+f2(b.real-b.lha,2)+" l/ha",Math.abs(b.real-b.lha)>1?"wn":""):""}</div></div>`;
  const VAR=[30,40,50,60,70,80,90,100],MK2=[0,10,15,20,25,30,40,50];
  const vt=`<details class="card hsec"><summary><span>📈</span><b>Varianty ceny · ${na}</b><small>€/ha aj prirážka na motohodinu</small></summary><div class="hrt"><table><thead><tr><th>Cena €/ha</th><th>Tržba €/h</th><th>Zisk €/ha</th><th>Zisk ${f2(a.area,0)} ha</th><th>Splatenie ha/rok</th></tr></thead><tbody>${VAR.map(p=>{const mg=p-a.costHa;return `<tr><td>${p}</td><td>${f2(p*a.cap,0)}</td><td class="${mg>=0?"ps":"ng"}">${f2(mg)}</td><td class="${mg>=0?"ps":"ng"}">${f2(mg*a.area,0)}</td><td>${mg+a.depHa>0?f2(n(C.m[0].price)/((mg+a.depHa)*5),0):"–"}</td></tr>`}).join("")}</tbody></table></div>
   <div class="hrt"><table><thead><tr><th>Prirážka</th><th>€/mth</th><th>€/ha</th><th>Zisk €/mth</th><th>Zisk ${f2(a.area,0)} ha</th></tr></thead><tbody>${MK2.map(p=>{const c=a.costH*(1+p/100);return `<tr><td>${p?"+"+p+" %":"bod nula"}</td><td>${f2(c)}</td><td>${f2(c/a.cap)}</td><td>${f2(c-a.costH)}</td><td>${f2((c-a.costH)*a.hrs,0)}</td></tr>`}).join("")}</tbody></table></div></details>`;
  return `<div class="agres">${R.map(mach).join("")}</div>${cmp}${vt}`}
function calcHTML(){if(!A.cfg){loadCfg();return `<div class="card"><div class="s">Načítavam kalkuláciu…</div></div>`}
  if(A.cfg.err)return `<div class="card"><div class="s">${/agro_cfg/.test(A.cfg.err)?"Kalkulácia sa zapne po aktualizácii databázy (pár minút).":esc(A.cfg.err)}</div></div>`;
  return `<div class="s">Zmena čísla sa hneď prepočíta a uloží. <span id="agSave"></span> Nafta nie je v cene služby – tankuje zákazník.</div>
   <div id="agRes">${resHTML()}</div>
   <details class="card hsec agin" open><summary><span>⛽</span><b>Spoločné vstupy</b><small>cena nafty ${f2(A.cfg.fuel)} €/l · plocha ${f2(A.cfg.area,0)} ha</small></summary><div class="f agf">${inp("c","fuel","Cena nafty SR","€/l")}${inp("c","area","Plocha zákazky","ha")}<div class="w s">Priemerná cena nafty SR podľa Európskej komisie (Weekly Oil Bulletin) k ${esc(dSK(A.cfg.fuelDate||"2026-09-17"))} – uprav podľa aktuálnej.</div></div></details>
   ${mInputs(0)}${mInputs(1)}
   <div class="btns"><button type="button" class="ghost" data-areset="1">↺ Hodnoty z Excelu</button></div>
   <details class="card hsec"><summary><span>🔎</span><b>Kontrola Excelu · opravené chyby</b><small>čo sme v tabuľke Stroje v počte opravili</small></summary><div class="s agfix">
   <p><b>1. Jednotka spotreby stroja 2</b> bola v Exceli napevno „l/ha“ (1 VSTUPY!C22). Keď si pri stroji 2 zvolil l/h, spotreba za hodinu sa násobila výkonom a vychádzala zle. Tu má každý stroj vlastnú jednotku.</p>
   <p><b>2. Názvy strojov v PREHĽADE</b> boli napevno „CLAAS − Fendt“, aj keď si porovnával dva CLAAS. Tu sa vždy píše skutočný model a kto je lacnejší.</p>
   <p><b>3. Úspora bez smeru</b> – Excel bral absolútnu hodnotu (ABS) a pripisoval úsporu stroju 1 aj vtedy, keď bol drahší. Tu sa úspora pripíše lacnejšiemu stroju.</p>
   <p><b>4. Teoretický výkon</b> – Excel rátal výkon ako rýchlosť × záber bez otáčok na úvratiach, prestojov a plnenia. Pridal som <b>efektivitu poľa</b> (predvolene 85 %, bežne 75–90 %). Pri 100 % dostaneš presne čísla z Excelu.</p>
   <p><b>Skontrolované a správne:</b> cena práce 2026 (14,4 % / 19 % / NČZD 497,23 € / 36,2 %), odpis, servis a poistenie z ceny stroja a ročného využitia, bod nula, marža, zisk zákazky, varianty, splatenie, reálne tankovanie.</p>
   <p><b>Na zváženie:</b> obsluha sa počíta 174 h mesačne. Ak vodič robí len na tomto stroji (1000 mth/rok), skutočná cena obsluhy na motohodinu je vyššia – vtedy zníž „Pracovné hodiny mesačne“ na ~83.</p></div></details>`}
function catHTML(){const T=A.catT||"",q=String(A.catQ||"").toLowerCase(),L=AGM.filter(m=>(!T||m[1]===T)&&(!q||(m[0]+" "+m[2]).toLowerCase().includes(q)));
  return `<div class="card f"><label>Hľadať<input id="agCatQ" value="${esc(A.catQ||"")}" placeholder="napr. Fendt 936"></label><label>Typ<select id="agCatT"><option value="">všetky</option>${Object.entries(TYP).map(([k,v])=>`<option value="${k}"${T===k?" selected":""}>${v}</option>`).join("")}</select></label></div>
   <div class="hrt"><table><thead><tr><th>Značka</th><th>Model</th><th>Typ</th><th>hp</th><th>Test l/h</th><th>Odhad l/h</th><th>Min–max l/h</th></tr></thead><tbody>${L.map(m=>`<tr><td>${esc(m[0])}</td><td><b>${esc(m[2])}</b></td><td>${TYP[m[1]]}</td><td>${m[3]}</td><td>${m[4]!=null?f2(m[4],0):"–"}</td><td>${f2(m[5],1)}</td><td>${f2(m[6],1)}–${f2(m[7],1)}</td></tr>`).join("")}</tbody></table></div>
   <div class="s">Traktory: DLG PowerMix 245–295 g/kWh pri 65 % zaťažení. Kombajny: CLAAS TELEMATICS / žatevný test LEXION 8900 škálovaný výkonom. Fendt 1167 MT: nezávislý test NTTL/Profi.</div>`}
// --- udalosti (tím) ---
document.addEventListener("click",async e=>{if(typeof ROLE==="undefined"||!ROLE||(typeof FARMER!=="undefined"&&FARMER))return;const t=e.target;let x;
  if(x=t.closest("[data-asec]")){A.sec=x.dataset.asec;A.edit=null;if(A.sec==="ord")A.orders=null;renderStaff();scrollTo(0,0);return}
  if(x=t.closest("[data-aflt]")){A.flt=x.dataset.aflt;renderStaff();return}
  if(ROLE!=="owner")return;
  if(x=t.closest("[data-asedit]")){A.edit=x.dataset.asedit||null;renderStaff();return}
  if(x=t.closest("[data-astog]")){const s=(A.srv||[]).find(y=>y.id===x.dataset.astog);if(!s)return;const r=await sb.from("agro_services").update({active:!s.active}).eq("id",s.id);if(r.error){toast("Chyba: "+r.error.message);return}toast(s.active?"Služba je skrytá farmárom.":"✓ Služba je zverejnená farmárom.");loadSrv();return}
  if(x=t.closest("[data-asdel]")){if(!x.dataset.arm){x.dataset.arm=1;x.textContent="Naozaj zmazať?";setTimeout(()=>{x.dataset.arm="";x.textContent="🗑️ Zmazať"},3000);return}const r=await sb.from("agro_services").delete().eq("id",x.dataset.asdel);if(r.error){toast(/foreign|violates/.test(r.error.message)?"Služba má objednávky – radšej ju skry.":"Chyba: "+r.error.message);return}A.edit=null;loadSrv();return}
  if(x=t.closest("[data-areset]")){if(!x.dataset.arm){x.dataset.arm=1;x.textContent="Naozaj prepísať?";setTimeout(()=>{x.dataset.arm="";x.textContent="↺ Hodnoty z Excelu"},3000);return}A.cfg=JSON.parse(JSON.stringify(DEF));saveCfg();renderStaff();return}
  if(x=t.closest("[data-apub]")){const i=+x.dataset.apub,m=A.cfg.m[i],r=calc(m,A.cfg),M=mFind(m.model),nmM=M[0]+" "+M[2]+" · záber "+String(m.width).replace(".",",")+" m";
    const S=A.srv&&!A.srv.err?A.srv:((await sb.from("agro_services").select("*")).data||[]),ex=S.find(s=>s.machine===nmM);
    const row={name:ex?ex.name:"Práca strojom "+M[0]+" "+M[2],machine:nmM,unit:"ha",price:Math.round(r.sell*100)/100,fuel_lha:Math.round(r.lha*10)/10,fuel_by_customer:true};
    const q=ex?await sb.from("agro_services").update(row).eq("id",ex.id):await sb.from("agro_services").insert({...row,active:false,descr:"Práca strojom s obsluhou. Naftu tankuje zákazník."});
    if(q.error){toast("Chyba: "+q.error.message);return}A.srv=null;toast(ex?"✓ Cena služby aktualizovaná v cenníku.":"✓ Služba pridaná do cenníka ako skrytá – zverejni ju v Cenníku služieb.",6000);return}});
document.addEventListener("submit",async e=>{const f=e.target;if(typeof FARMER!=="undefined"&&FARMER)return;
  if(f.id==="fASrv"){e.preventDefault();e.stopPropagation();const d=new FormData(f),pr=n(d.get("price"));if(!(pr>=0)){toast("Zadaj cenu.");return}
    const nn=k=>{const v=n(d.get(k));return Number.isFinite(v)?v:null};
    const row={name:String(d.get("name")||"").trim(),machine:String(d.get("machine")||"").trim()||null,descr:String(d.get("descr")||"").trim()||null,unit:d.get("unit"),price:pr,fuel_lha:nn("fuel_lha"),min_qty:nn("min_qty"),sort:Math.round(nn("sort")??100),active:d.get("active")==="on",fuel_by_customer:d.get("fuel_by_customer")==="on"};
    const id=f.dataset.id,r=id?await sb.from("agro_services").update(row).eq("id",id):await sb.from("agro_services").insert(row);
    if(r.error){toast("Chyba: "+r.error.message);return}A.edit=null;toast(row.active?"✓ Uložené a zverejnené farmárom.":"✓ Uložené (skryté farmárom).");loadSrv();return}
  if(f.dataset.aord){e.preventDefault();e.stopPropagation();const d=new FormData(f),st=e.submitter&&e.submitter.name==="st"?e.submitter.value:"";const dq=n(d.get("done_qty"));
    const row={planned:d.get("planned")||null,reply:String(d.get("reply")||"").trim()||null,done_qty:Number.isFinite(dq)&&dq>0?dq:null};if(st)row.status=st;
    if(st==="potvrdena"&&!row.planned){toast("Zadaj termín práce, nech farmár vie, kedy prídete.");return}
    const r=await sb.from("agro_orders").update(row).eq("id",f.dataset.aord);if(r.error){toast("Chyba: "+r.error.message);return}
    toast(st==="hotova"?"✅ Hotovo – suma prepočítaná podľa skutočnej výmery.":st==="zrusena"?"Objednávka zrušená.":"✓ Uložené – farmár to vidí v aplikácii.");loadOrders();return}},true);
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.ak;if(k&&A.cfg&&!A.cfg.err){const [i,key]=k.split(".");const v=e.target.value;
    if(i==="c")A.cfg[key]=key==="fuelDate"?v:v.replace(",",".");else A.cfg.m[+i][key]=["model","unit"].includes(key)?v:v.replace(",",".");
    const R=document.getElementById("agRes");if(R)R.innerHTML=resHTML();saveCfg();return}
  if(e.target.id==="agCatQ"){A.catQ=e.target.value;clearTimeout(e.target._t);e.target._t=setTimeout(()=>{renderStaff();const i=document.getElementById("agCatQ");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)}});
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.ak;if(k&&/\.(model|unit)$/.test(k)){renderStaff();return}if(e.target.id==="agCatT"){A.catT=e.target.value;renderStaff()}});

// ===== FARMÁR =====
let FA={srv:undefined,ord:null,open:null};
async function faLoad(){FA.srv=null;const [s,o]=await Promise.all([sb.from("agro_services").select("id,name,machine,descr,unit,price,fuel_lha,min_qty,fuel_by_customer,sort").eq("active",true).order("sort").order("name"),
  sb.from("agro_orders").select("id,no,service_name,unit,qty,price,total,date_from,date_to,place,note,status,planned,done_qty,reply,created_at").order("created_at",{ascending:false}).limit(30)]);
  FA.srv=s.error?[]:s.data||[];FA.ord=o.error?[]:o.data||[];renderFarmer()}
window.farmAgroHTML=function(){if(typeof FARMER==="undefined"||!FARMER||(window.fcan&&!fcan("f_agro")))return "";if(FA.srv===undefined){faLoad();return ""}if(!FA.srv)return "";
  const S=FA.srv,O=FA.ord||[];if(!S.length&&!O.length)return "";
  let h=`<h2>🚜 Agro služby ERNTE · objednajte si prácu strojom</h2><div class="agfl">${S.map(s=>{const op=FA.open===s.id,u=UN[s.unit]||s.unit;return `<div class="card agsv on"><div class="row"><span class="t">${esc(s.name)}</span><b class="agpr">${f2(s.price)} €<small>/${u} bez DPH</small></b></div>
    ${s.machine?`<div class="s">🚜 ${esc(s.machine)}</div>`:""}${s.descr?`<div class="s">${esc(s.descr)}</div>`:""}
    <div class="s">${s.fuel_by_customer!==false?`⛽ Naftu tankujete vy${s.fuel_lha?` · odhad ${f2(s.fuel_lha,1)} l/ha`:""}`:"⛽ Nafta je v cene"}${s.min_qty?` · minimum ${f2(s.min_qty,0)} ${u}`:""}</div>
    ${op?`<form class="f agf" id="fAOrd" data-sid="${esc(s.id)}"><label>Koľko ${u}?<input name="qty" inputmode="decimal" required placeholder="${s.min_qty?"min. "+f2(s.min_qty,0):"napr. 50"}"></label><div class="agest" id="agEst">${s.min_qty?"":"Zadajte výmeru – ukážeme sumu."}</div>
      <label>Termín od<input type="date" name="date_from" min="${today()}"></label><label>Termín do<input type="date" name="date_to" min="${today()}"></label>
      <label class="w">Kde (obec, parcela, honov)<input name="place" placeholder="napr. Zbudza – honov pri ceste"></label><label class="w">Poznámka<input name="note" placeholder="napr. hĺbka 15 cm, prístup od cesty"></label>
      <div class="w btns"><button class="lime">✅ Záväzne objednať</button><button type="button" class="ghost" data-faopen="">Zrušiť</button></div></form>`:`<div class="btns"><button type="button" class="pri" data-faopen="${esc(s.id)}">🚜 Objednať</button></div>`}</div>`}).join("")}</div>`;
  if(O.length)h+=`<h2>Moje objednávky služieb</h2><div class="card">${O.map(o=>`<div class="row"><span><b>${esc(o.service_name)}</b> · ${f2(o.done_qty??o.qty,1)} ${UN[o.unit]||o.unit} · ${f2(o.total)} €</span>${pill(STS[o.status]||[o.status])}</div>
    <div class="s" style="margin-top:-6px">${esc(o.no||"")} · ${esc(dtSK(o.created_at))}${o.planned?` · 📅 termín ${esc(dSK(o.planned))}`:""}${o.reply?` · ERNTE: ${esc(o.reply)}`:""}${o.status==="nova"?` · <button type="button" class="linkb" data-facancel="${esc(o.id)}">zrušiť objednávku</button>`:""}</div>`).join("")}</div>`;
  return h};
document.addEventListener("click",async e=>{if(typeof FARMER==="undefined"||!FARMER)return;let x=e.target.closest("[data-faopen]");
  if(x){FA.open=x.dataset.faopen||null;renderFarmer();if(FA.open)setTimeout(()=>{const i=document.querySelector("#fAOrd [name=qty]");if(i)i.focus()},50);return}
  x=e.target.closest("[data-facancel]");if(x){if(!x.dataset.arm){x.dataset.arm=1;x.textContent="naozaj zrušiť?";setTimeout(()=>{x.dataset.arm="";x.textContent="zrušiť objednávku"},3000);return}
    const r=await sb.from("agro_orders").update({status:"zrusena"}).eq("id",x.dataset.facancel);if(r.error){toast(r.error.message);return}toast("Objednávka zrušená.");faLoad()}});
document.addEventListener("input",e=>{if(typeof FARMER==="undefined"||!FARMER||e.target.name!=="qty"||!e.target.closest("#fAOrd"))return;const s=(FA.srv||[]).find(y=>y.id===e.target.closest("#fAOrd").dataset.sid),q=n(e.target.value),el=document.getElementById("agEst");
  if(s&&el)el.innerHTML=q>0?`Spolu približne <b>${f2(q*s.price)} €</b> bez DPH${s.fuel_by_customer!==false&&s.fuel_lha&&s.unit==="ha"?` + nafta ~${f2(q*s.fuel_lha,0)} l`:""}${s.min_qty&&q<s.min_qty?`<br><span class="wn">Minimum je ${f2(s.min_qty,0)} ${UN[s.unit]}</span>`:""}`:""});
document.addEventListener("submit",async e=>{const f=e.target;if(f.id!=="fAOrd")return;e.preventDefault();e.stopPropagation();if(f._b)return;const d=new FormData(f),q=n(d.get("qty")),s=(FA.srv||[]).find(y=>y.id===f.dataset.sid);
  if(!(q>0)){toast("Zadajte množstvo.");return}if(s&&s.min_qty&&q<s.min_qty){toast(`Minimum je ${f2(s.min_qty,0)} ${UN[s.unit]}.`);return}
  if(d.get("date_from")&&d.get("date_to")&&d.get("date_to")<d.get("date_from")){toast("Termín do je pred termínom od.");return}
  f._b=1;const b=f.querySelector("button.lime");if(b)busy(b,true);
  const r=await sb.from("agro_orders").insert({farmer_id:FARMER.id,service_id:f.dataset.sid,qty:q,date_from:d.get("date_from")||null,date_to:d.get("date_to")||null,place:String(d.get("place")||"").trim()||null,note:String(d.get("note")||"").trim()||null});
  f._b=0;if(b)busy(b,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}FA.open=null;toast("✅ Objednávka odoslaná. ERNTE vás bude kontaktovať a potvrdí termín.",7000);faLoad()},true);
// pomocník
try{Object.assign(HELP,{agro:{t:"Agro služby",i:"🚜",r:"Práce strojmi pre farmárov – cenník, objednávky a kalkulácia.",s:[
 ["Objednávky","Farmár si v aplikácii objedná službu (výmera, termín, miesto). Ty ju potvrdíš s termínom, označíš V práci a Hotovo so skutočnou výmerou – suma sa prepočíta sama."],
 ["Cenník služieb","Služby so zaškrtnutým Zverejniť vidia farmári s cenou a môžu ich objednať. Skryté vidíš iba ty."],
 ["Kalkulácia strojov","Ako Excel Stroje v počte: odpis, obsluha, servis, poistenie → bod nula €/ha, marža, zisk zákazky, porovnanie dvoch strojov, reálne tankovanie. Každá zmena sa hneď prepočíta."],
 ["Čo vidí farmár","Iba zverejnené služby s cenou a svoje objednávky. Nikdy náklady, maržu ani kalkuláciu."]]}})}catch(e){}
})();
