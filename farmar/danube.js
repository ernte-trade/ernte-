// ===== DANUBE TRADE + NEVYBAVENÉ OBJEDNÁVKY (svietia zodpovednému pri každom otvorení, kým ich neprijme) =====
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>(typeof toast==="function"?toast:alert)(t,ms);
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const isStaff=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER);
const ago=t=>{const h=(Date.now()-new Date(t))/36e5;return h<1?Math.max(1,Math.round(h*60))+" min":h<48?Math.round(h)+" h":Math.round(h/24)+" dní"};
const FB=f=>`<span class="pill ${f==="DANUBE"?"dnb":"ern"}">${f==="DANUBE"?"🌊 DANUBE":"🌾 ERNTE"}</span>`;
window.firmBadge=FB;
const RT={odvoz:"Odvozy",sluzby:"Služby strojmi",obchod:"Obchod (predaj, zmluvy)",trus:"Kurací trus"};
let P={L:null,at:0,all:false,busy:false},D={d:null,flt:"nova"};
const rr=()=>{if(typeof renderStaff==="function"&&isStaff())renderStaff()};

// ---------- nevybavené ----------
async function loadP(open){if(!isStaff()||P.busy)return;P.busy=true;let r;try{r=await sb.rpc("my_pending",{p_open:!!open})}catch(x){r={error:x}}P.busy=false;P.at=Date.now();
  if(!r.error){P.L=r.data||[];rr()}}
let hid=0;document.addEventListener("visibilitychange",()=>{if(document.hidden)hid=Date.now();else if(hid&&Date.now()-hid>5*6e4)loadP(true)});
setInterval(()=>{if(isStaff()&&!document.hidden)loadP(false)},60000);
let started=false;function boot(){if(started||!isStaff())return;started=true;let k=false;try{k=sessionStorage.getItem("ernte-pend-open")==="1";sessionStorage.setItem("ernte-pend-open","1")}catch(x){}loadP(!k)}
const TABOF=x=>x.src==="agro"?"agro":x.src==="trus"?"trus":x.route==="odvoz"?"trans":"req";
function tile(){if(!P.L||!P.L.length)return "";const M=P.L.filter(x=>x.mine||OWN()),mine=P.L.filter(x=>x.mine);if(!M.length)return "";
  const show=P.all?M:M.slice(0,4),urgent=mine.length;
  return `<div class="card pend${urgent?" pmine":""}" role="alert"><div class="row"><b>⚠️ Nevybavené objednávky <span class="cnt">${M.length}</span></b>${OWN()?`<small>${urgent?`tvoje: ${urgent}`:"u zodpovedných"}</small>`:""}</div>
   <div class="s">${OWN()?"Svieti zodpovednému pri každom otvorení aplikácie, kým objednávku neprijme. Pri každej vidíš, kto ju má a koľkokrát otvoril aplikáciu bez prijatia.":"Svieti, kým objednávku neprijmeš do spracovania. Objednávateľ potom hneď dostane správu, že na nej pracujete."}</div>
   ${show.map(x=>`<div class="pit"><div class="row">${FB(x.firma)}<b>${e(x.titul)}</b><small>čaká ${e(ago(x.at))}</small></div>
     <div class="s">${e(x.kto||"")}${x.detail?" · "+e(x.detail):""}</div>
     ${x.n>1&&x.mine?`<div class="pn">👀 Otvoril si aplikáciu už ${x.n}× a objednávka stále čaká</div>`:""}
     ${OWN()&&x.resp?`<div class="pr">${x.resp.length?x.resp.map(r=>`<span>${e(r.name||r.email)}: ${r.n?`videl ${r.n}×`:"ešte neotvoril"}</span>`).join(""):`<span>⚠️ nikto nie je určený – nastav v Danube Trade → Kto vybavuje</span>`}</div>`:""}
     <div class="btns">${x.src!=="trus"&&(x.mine||OWN())?`<button type="button" class="lime" data-pacc="${e(x.src)}|${e(x.id)}">✓ Prijať do spracovania</button>`:""}<button type="button" data-pgo="${TABOF(x)}">Otvoriť</button></div></div>`).join("")}
   ${M.length>4?`<button type="button" class="evmini" data-pall>${P.all?"Menej":"Zobraziť všetky ("+M.length+")"}</button>`:""}</div>`}
function inject(){const app=document.getElementById("app");if(!app||!isStaff())return;boot();if(P.L===null)return;const old=app.querySelector(".pend");const nav=app.querySelector("nav.tabs");if(!nav)return;
  const h=tile();if(old){if(old.dataset.h===String(h.length))return;old.remove()}if(!h)return;nav.insertAdjacentHTML("afterend",h);const n=app.querySelector(".pend");if(n)n.dataset.h=String(h.length)}
let q=0;const sched=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{inject()}catch(x){}})};
function start(){const app=document.getElementById("app");if(!app){setTimeout(start,300);return}new MutationObserver(sched).observe(app,{childList:true,subtree:false});sched()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();

// ---------- Danube Trade (SK / HU) ----------
try{D.lang=localStorage.getItem("ernte-dn-lang")||"sk"}catch(x){D.lang="sk"}
const T=(sk,hu)=>D.lang==="hu"?hu:sk;
async function loadD(){const r=await sb.rpc("danube_view");D.d=r.error?{err:/could not find|does not exist/i.test(r.error.message)?T("Danube Trade sa zapne po aktualizácii databázy (pár minút).","A Danube Trade az adatbázis frissítése után indul (pár perc)."):r.error.message}:(r.data||{req:[],agro:[],farmers:[],routes:{},staff:[]});
  if(!D.d.err){const c=await sb.from("danube_cfg").select("*").eq("key","firma").maybeSingle();D.cfg=(c.data&&c.data.value)||{};const k=await sb.from("danube_contracts").select("*").order("id",{ascending:false}).limit(200);D.K=k.data||[]}rr()}
const RS={nova:[["nová","új"],"w"],v_spracovani:[["v spracovaní","feldolgozás alatt"],"b"],vybavena:[["vybavená","elintézve"],""],zamietnuta:[["zamietnutá","elutasítva"],"r"],potvrdena:[["prijatá","elfogadva"],"b"],v_praci:[["v práci","folyamatban"],"b"],hotova:[["hotová","kész"],""],zrusena:[["zrušená","törölve"],"r"]};
const pl=s=>{const x=RS[s];return x?`<span class="pill ${x[1]}">${e(T(x[0][0],x[0][1]))}</span>`:`<span class="pill g">${e(s)}</span>`};
const KN=k=>({sell:T("🌾 Chce predať","🌾 Eladná"),transport:T("🚚 Odvoz","🚚 Elszállítás"),agree:T("✍️ Súhlas so zmluvou","✍️ Szerződés elfogadása"),message:T("💬 Správa","💬 Üzenet")})[k]||k;
const COM={kukurica:["kukurica","kukorica"],soja:["sója","szója"],psenica_k:["pšenica kŕmna","takarmánybúza"],psenica_p:["pšenica potravinárska","étkezési búza"],repka:["repka","repce"],slnecnica:["slnečnica","napraforgó"],jacmen:["jačmeň","árpa"]};
const cnm=k=>COM[k]?T(COM[k][0],COM[k][1]):(typeof comName==="function"?comName(k):k);
window.vDanube=function(){if(!D.d){loadD();return `<div class="card"><div class="s">${T("Načítavam Danube Trade…","Danube Trade betöltése…")}</div></div>`}const X=D.d;if(X.err)return `<div class="card"><div class="s">${e(X.err)}</div></div>`;
  const fl=a=>D.flt==="all"?a:D.flt==="nova"?a.filter(x=>["nova","v_spracovani","potvrdena","v_praci"].includes(x.status)):a.filter(x=>["vybavena","hotova","zamietnuta","zrusena"].includes(x.status));
  const R=fl(X.req||[]),A=fl(X.agro||[]),dn=(X.farmers||[]).filter(f=>f.firma==="DANUBE"),C=D.cfg||{};
  let h=`<div class="zt"><h2>🌊 Danube Trade <span class="btns seg2 dnlang">${[["sk","🇸🇰 SK"],["hu","🇭🇺 HU"]].map(x=>`<button type="button" data-dnlang="${x[0]}" aria-pressed="${D.lang===x[0]}">${x[1]}</button>`).join("")}</span></h2>
   <div class="card dnhero"><b>${e(C.name||"Danube Trade")}</b><span>${T("obchod s komoditami · odvoz VALKO · služby strojmi","terménykereskedelem · szállítás VALKO · gépi szolgáltatások")}</span>
   <small>${T("Požiadavky a objednávky farmárov priradených k Danube majú značku 🌊 DANUBE. Odvozy idú logistike (Tóth), služby strojmi vedúcemu (Štofa, T. Vaľko). Zmluvy sa robia podľa maďarského práva v maďarčine aj slovenčine.","A Danube-hoz rendelt gazdák kérései és megrendelései 🌊 DANUBE jelölést kapnak. Az elszállítás a logisztikához (Tóth), a gépi szolgáltatások a vezetőhöz (Štofa, T. Vaľko) kerülnek. A szerződések a magyar jog szerint, magyarul és szlovákul készülnek.")}</small></div>
   <div class="hrk"><div class="${(X.req||[]).some(x=>x.status==="nova")?"wn":""}"><small>${T("Nové požiadavky","Új kérések")}</small><b>${(X.req||[]).filter(x=>x.status==="nova").length}</b></div><div><small>${T("Nové služby","Új szolgáltatások")}</small><b>${(X.agro||[]).filter(x=>x.status==="nova").length}</b></div><div><small>${T("Farmári Danube","Danube gazdák")}</small><b>${dn.length}</b></div><div><small>${T("Zmluvy","Szerződések")}</small><b>${(D.K||[]).length}</b></div></div>
   <div class="btns seg2">${[["nova",T("Otvorené","Nyitott")],["done",T("Vybavené","Elintézett")],["all",T("Všetky","Összes")],["zml",T("📝 Zmluvy","📝 Szerződések")],["ludia",T("👥 Noví ľudia","👥 Új felhasználók")]].map(x=>`<button type="button" data-dnf="${x[0]}" aria-pressed="${D.flt===x[0]}">${x[1]}</button>`).join("")}</div>`;
  if(D.flt==="zml")return h+zmlHTML(X)+`</div>`;
  if(D.flt==="ludia")return h+ludiaHTML()+`</div>`;
  h+=`<h3 class="skh">📥 ${T("Požiadavky","Kérések")} <small>${R.length}</small></h3>${R.length?`<div class="agl">${R.map(r=>`<div class="card"><div class="row">${FB("DANUBE")}<b>${e(KN(r.kind))}</b>${pl(r.status)}</div>
     <div class="trlw"><span>${e(r.farmer)}</span>${r.com?`<span>${e(cnm(r.com))}</span>`:""}${r.tons!=null?`<span>${e(r.tons)} t</span>`:""}${r.pickup_date?`<span>${T("od","ettől")} ${e(r.pickup_date)}</span>`:""}${r.place?`<span>${e(r.place)}</span>`:""}</div>${r.note?`<div class="s">„${e(r.note)}“</div>`:""}${r.accepted_by?`<div class="s">✓ ${T("prijal","átvette")} ${e(r.accepted_by)}</div>`:""}
     <div class="btns">${r.status==="nova"?`<button type="button" class="lime" data-pacc="req|${e(r.id)}">✓ ${T("Prijať do spracovania","Feldolgozásra átvesz")}</button>`:""}${r.phone?`<a class="btn" href="tel:${e(String(r.phone).replace(/\s/g,""))}">📞 ${T("Volať","Hívás")}</a>`:""}${r.kind==="sell"?`<button type="button" data-dnzml="${e(r.id)}">📝 ${T("Zmluva","Szerződés")}</button>`:""}<button type="button" data-firm="req|${e(r.id)}|ERNTE">${T("Patrí ERNTE","ERNTE-hez tartozik")}</button></div></div>`).join("")}</div>`:`<div class="card"><div class="s">${T("Žiadne.","Nincs.")}</div></div>`}
   <h3 class="skh">🚜 ${T("Objednávky služieb","Szolgáltatás-megrendelések")} <small>${A.length}</small></h3>${A.length?`<div class="agl">${A.map(o=>`<div class="card"><div class="row">${FB("DANUBE")}<b>${e(o.service||T("Služba","Szolgáltatás"))} ${e(o.no||"")}</b>${pl(o.status)}</div>
     <div class="trlw"><span>${e(o.farmer)}</span><span>${e(o.qty)} ${e(o.unit||"")}</span>${o.date_from?`<span>${T("od","ettől")} ${e(o.date_from)}</span>`:""}${o.place?`<span>${e(o.place)}</span>`:""}</div>${o.accepted_by?`<div class="s">✓ ${T("prijal","átvette")} ${e(o.accepted_by)}</div>`:""}
     <div class="btns">${o.status==="nova"?`<button type="button" class="lime" data-pacc="agro|${e(o.id)}">✓ ${T("Prijať do spracovania","Feldolgozásra átvesz")}</button>`:""}<button type="button" data-firm="agro|${e(o.id)}|ERNTE">${T("Patrí ERNTE","ERNTE-hez tartozik")}</button></div></div>`).join("")}</div>`:`<div class="card"><div class="s">${T("Žiadne.","Nincs.")}</div></div>`}
   <details class="card trap"><summary>👨‍🌾 ${T("Ktorí farmári patria Danube","Danube-hoz tartozó gazdák")} (${dn.length})</summary><div class="s">${T("Nové požiadavky a objednávky farmára sa označia podľa jeho firmy.","A gazda új kérései és megrendelései a cége szerint kapnak jelölést.")}</div>
     <div class="dnfl">${(X.farmers||[]).map(f=>`<label class="evck"><input type="checkbox" data-dnfarm="${e(f.id)}"${f.firma==="DANUBE"?" checked":""}> ${e(f.name)}</label>`).join("")}</div></details>`;
  if(OWN()&&X.staff){const S=X.staff;h+=`<form class="card f dnr" id="dnR"><div class="w t">🔀 ${T("Kto vybavuje objednávky (ERNTE aj DANUBE)","Ki intézi a megrendeléseket (ERNTE és DANUBE)")}</div><div class="w s">${T("Prázdne = automaticky: odvozy Tóth, služby Štofa a Tomáš Vaľko, obchod ľudia s právom Obchody, trus dispečing.","Üres = automatikus: szállítás Tóth, szolgáltatás Štofa és Tomáš Vaľko, kereskedelem az Üzletek joggal rendelkezők, trágya a diszpécser.")}</div>
    ${Object.entries(RT).map(([k,l])=>`<fieldset class="w"><legend>${e(l)}</legend>${S.map(s=>`<label class="evck"><input type="checkbox" name="${k}" value="${e(s.email)}"${(X.routes[k]||[]).includes(s.email)?" checked":""}> ${e(s.name||s.email)}</label>`).join("")||`<div class="s">${T("Najprv vytvor ľuďom prihlásenie v Tíme.","Először hozz létre belépést a Csapatban.")}</div>`}</fieldset>`).join("")}
    <div class="w btns"><button class="lime">💾 ${T("Uložiť","Mentés")}</button></div></form>`}
  return h+`</div>`};

// ---------- zmluvy podľa maďarského práva ----------
function zmlHTML(X){const C=D.cfg||{},dn=(X.farmers||[]).filter(f=>f.firma==="DANUBE"),all=X.farmers||[],pre=D.pre||{};
  let h=`<div class="card s">⚖️ ${T("Kúpna zmluva podľa vzoru S-HU (Obchodný zákonník SR, § 409 a nasl.), dvojjazyčne slovensky | maďarsky, pri rozpore platí slovenské znenie. Kupujúci Danube Commodities Kft., pevná cena, zmluvná pokuta, Príloha 1 – kvalita podľa komodity.","Adásvételi szerződés az S-HU minta szerint (szlovák Kereskedelmi Törvénykönyv 409. § és köv.), kétnyelvű szlovák | magyar, eltérés esetén a szlovák szöveg az irányadó. Vevő: Danube Commodities Kft., fix ár, kötbér, 1. melléklet – minőség termény szerint.")}</div>
  <form class="card f dnz" id="dnZ"><div class="w t">📝 ${T("Nová kúpna zmluva","Új adásvételi szerződés")}</div>
   <label>${T("Predávajúci (farmár)","Eladó (termelő)")}<select name="farmer" required><option value="">–</option>${(dn.length?dn:all).map(f=>`<option value="${e(f.id)}"${pre.farmer===f.id?" selected":""}>${e(f.name)}</option>`).join("")}</select></label>
   <label>${T("Komodita","Termény")}<select name="com" data-dncom>${Object.keys(COM).map(k=>`<option value="${k}"${pre.com===k?" selected":""}>${e(cnm(k))}</option>`).join("")}</select></label>
   <label>${T("Úroda (rok)","Termésév")}<input name="rok" inputmode="numeric" value="${new Date().getFullYear()}"></label>
   <label>${T("Množstvo (t)","Mennyiség (t)")}<input name="t" inputmode="decimal" required value="${e(pre.t||"")}"></label>
   <label>${T("Cena bez DPH (naša nákupná u farmára)","Nettó ár (aktuális felvásárlási ár)")}<input name="cena" inputmode="decimal" required value="${e((()=>{const p=window.dnCurPrice?dnCurPrice(pre.com||Object.keys(COM)[0]):null;return p!=null?String(p).replace(".",","):""})())}"></label>
   <label>${T("Mena","Pénznem")}<select name="mena"><option>EUR</option><option>HUF</option></select></label>
   <label>${T("Dodanie od","Teljesítés kezdete")}<input type="date" name="od" value="${e(pre.od||"")}"></label><label>${T("Dodanie do","Teljesítés vége")}<input type="date" name="do"></label>
   <label class="w">${T("Miesto nakládky","Rakodás helye")}<input name="miesto" value="${e(pre.miesto||"")}" placeholder="${T("adresa farmy / sklad","gazdaság / raktár címe")}"></label>
   <label>${T("Splatnosť (dní, max. 30)","Fizetési határidő (nap, max. 30)")}<input name="spl" inputmode="numeric" value="${e(C.pay_days||14)}"></label>
   <label>${T("Zmluvná pokuta pri nedodaní (%)","Meghiúsulási kötbér (%)")}<input name="pok" inputmode="decimal" value="${e(C.penalty_pct||20)}"></label>
   <div class="w s">📄 ${T("Zmluva sa vytvorí dvojjazyčne SK | HU podľa vzoru S-HU (kupujúci Danube, bez príloh GMP+ a ISCC). Číslo pridelí aplikácia, parametre kvality podľa komodity, údaje predávajúceho z jeho karty.","A szerződés kétnyelvű (SK | HU) S-HU minta szerint készül (vevő: Danube, GMP+ és ISCC mellékletek nélkül). A számot az alkalmazás adja, a minőségi paraméterek a termény szerint, az eladó adatai a kartonjáról.")}</div>
   <div class="w btns"><button class="lime">📝 ${T("Vytvoriť zmluvu","Szerződés készítése")}</button></div></form>`;
  if((D.K||[]).length)h+=`<h3 class="skh">📁 ${T("Archív zmlúv","Szerződések archívuma")} <small>${D.K.length}</small></h3><div class="agl">${D.K.map(k=>{const d=k.data||{};return `<div class="card"><div class="row"><b>${e(k.no)}</b><small>${e(new Date(k.created_at).toLocaleDateString("sk-SK"))}</small></div>
    <div class="trlw"><span>${e(d.farmer&&d.farmer.name||"")}</span><span>${e(cnm(d.com))}</span><span>${e(d.t)} t</span><span>${e(d.cena)} ${e(d.mena)}/t</span></div>
    <div class="btns"><button type="button" data-dnprint="${k.id}|skhu">📄 PDF SK | HU</button><button type="button" data-dnprint="${k.id}|hu">🇭🇺 ${T("starý vzor","régi minta")}</button></div></div>`}).join("")}</div>`;
  if(OWN())h+=`<form class="card f dnc" id="dnC"><div class="w t">🏢 ${T("Údaje firmy Danube (do zmlúv)","A Danube cégadatai (a szerződésekhez)")}</div>
   ${[["name",T("Obchodné meno","Cégnév")],["addr",T("Sídlo","Székhely")],["cegj",T("Cégjegyzékszám","Cégjegyzékszám")],["adosz",T("Adószám","Adószám")],["eu",T("IČ DPH (EU)","Közösségi adószám")],["bank",T("Banka","Bank")],["iban","IBAN"],["kepv",T("Zastúpená","Képviseli")],["email","E-mail"],["tel",T("Telefón","Telefon")],["clean",T("Čistenie €/t","Tisztítás €/t")],["dry",T("Sušenie €/t za 1 %","Szárítás €/t/%")]].map(x=>`<label>${x[1]}<input name="${x[0]}" value="${e(C[x[0]]??"")}"></label>`).join("")}
   <div class="w btns"><button class="lime">💾 ${T("Uložiť","Mentés")}</button></div></form>`;
  return h}
// ---------- noví farmári a obchodníci Danube ----------
const canF=()=>OWN()||(typeof can==="function"&&can("farm_login"));
function invHTML(I){const t=window.appLinkHTML?appLinkHTML(I.txt):e(I.txt);
  return `<div class="card dninv"><b>✅ ${T("Prístup pre","Hozzáférés:")} ${e(I.name)} ${T("je pripravený","elkészült")}</b><pre class="trpre">${t}</pre>
   <div class="btns">${I.tel?`<a class="btn lime" target="_blank" rel="noopener" href="https://wa.me/${e(I.tel)}?text=${encodeURIComponent(I.txt)}">WhatsApp</a><a class="btn" href="sms:+${e(I.tel)}?body=${encodeURIComponent(I.txt)}">SMS</a>`:""}<button type="button" data-dncopy>📋 ${T("Kopírovať","Másolás")}</button><button type="button" data-dninvx>${T("Hotovo","Kész")}</button></div>
   <div class="s">${T("Heslo sa nikde neukladá – pošli ho teraz.","A jelszót sehol nem tároljuk – küldje el most.")}</div></div>`}
function ludiaHTML(){let h=D.inv?invHTML(D.inv):"";
  if(canF())h+=`<form class="card f dnz" id="dnNF"><div class="w t">👨‍🌾 ${T("Nový farmár / dodávateľ Danube","Új termelő / beszállító (Danube)")}</div>
   <label>${T("Názov / meno","Név / cégnév")}<input name="name" required></label><label>${T("Telefón","Telefon")}<input name="phone" inputmode="tel" placeholder="+36 30 … / 0905 …"></label>
   <label>E-mail<input name="email" type="email"></label><label class="w">${T("Adresa","Cím")}<input name="addr"></label>
   <label>${T("IČO / reg. číslo","Nyilvántartási szám")}<input name="ico"></label><label>${T("Daňové číslo","Adószám")}<input name="dic"></label>
   <label>${T("Jazyk správy","Üzenet nyelve")}<select name="lang"><option value="hu"${D.lang==="hu"?" selected":""}>🇭🇺 magyar</option><option value="sk"${D.lang==="sk"?" selected":""}>🇸🇰 slovensky</option></select></label>
   <label class="evck"><input type="checkbox" name="login" checked> ${T("Hneď vytvoriť prihlásenie a poslať","Belépés létrehozása és küldése most")}</label>
   <div class="w btns"><button class="lime">➕ ${T("Pridať farmára","Termelő hozzáadása")}</button></div></form>`;
  if(OWN())h+=`<form class="card f dnz" id="dnNO"><div class="w t">💼 ${T("Nový obchodník Danube","Új kereskedő (Danube)")}</div>
   <label>${T("Meno a priezvisko","Név")}<input name="name" required></label><label>${T("Telefón alebo e-mail (prihlásenie)","Telefon vagy e-mail (belépés)")}<input name="login" required></label>
   <label>${T("Funkcia","Beosztás")}<input name="title" value="${T("Obchodník Danube","Danube kereskedő")}"></label><label>${T("Kraj / región","Régió")}<input name="region"></label>
   <label>${T("Jazyk správy","Üzenet nyelve")}<select name="lang"><option value="hu"${D.lang==="hu"?" selected":""}>🇭🇺 magyar</option><option value="sk"${D.lang==="sk"?" selected":""}>🇸🇰 slovensky</option></select></label>
   <div class="w s">${T("Dostane: Danube Trade, požiadavky, obchody, farmárov, kalkulačku a vytváranie prihlásení farmárom. Upraviť to môžeš v Tíme → ⚙️ Prístupy.","Hozzáférés: Danube Trade, kérések, üzletek, termelők, kalkulátor és termelői belépések. A Csapat → ⚙️ Jogosultságok alatt módosítható.")}</div>
   <div class="w btns"><button class="lime">➕ ${T("Vytvoriť prístup","Hozzáférés létrehozása")}</button></div></form>`;
  if(!canF()&&!OWN())h+=`<div class="card"><div class="s">${T("Nových ľudí pridáva majiteľ alebo obchodník s právom vytvárať prihlásenia.","Új felhasználót a tulajdonos vagy belépés-létrehozási joggal rendelkező kereskedő ad hozzá.")}</div></div>`;
  return h}
const telN=x=>{let d=String(x||"").replace(/\D/g,"").replace(/^00/,"");if(/^06/.test(d))return "36"+d.slice(2);if(/^0[1-9]/.test(d))return "421"+d.slice(1);return d};
function invTxt(hu,who,pw,kind){const app=typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0];
  return hu?`Jó napot! Elkészült a hozzáférése a Danube Trade / ERNTE Trade & Logistic alkalmazáshoz${kind==="f"?" (felvásárlási árak, szerződések, szállítások)":""}.\n\nFelhasználónév: ${who}\nEgyszeri kód: ${pw}\n\nAz első belépés után saját PIN-kódot állít be (a kód ezután érvényét veszti). A PIN-t senkinek ne küldje el.\nTegye ki a kezdőképernyőre (Megosztás → Főképernyőhöz adás).\n\n👉 ERNTE Trade & Logistic: ${app}`
   :`Dobrý deň, tu je váš prístup do aplikácie Danube Trade / ERNTE Trade & Logistic${kind==="f"?" s výkupnými cenami, zmluvami a odvozmi":""}.\n\nPrihlasovacie meno: ${who}\nJednorazový kód: ${pw}\n\nPo prvom prihlásení si nastavíte vlastný PIN (kód potom prestane platiť). PIN nikomu neposielajte.\nAplikáciu si dajte na plochu (Zdieľať → Pridať na plochu).\n\n👉 ERNTE Trade & Logistic: ${app}`}
const QN={kukurica:[14,2,1,3],soja:[13,2,null,5],psenica_k:[14,2,null,null],psenica_p:[14,2,null,null],repka:[9,2,null,null],slnecnica:[9,3,null,null],jacmen:[14,2,null,null]};
function contractHTML(no,d,lg){const C=D.cfg||{},F=d.farmer||{},hu=lg==="hu",L=(a,b)=>hu?b:a,q=QN[d.com]||[14,2,null,null],cur=d.mena||"EUR",fd=x=>x?new Date(x+"T12:00:00").toLocaleDateString(hu?"hu-HU":"sk-SK"):L("[doplniť]","[kitöltendő]"),
  cn=COM[d.com]?COM[d.com][hu?1:0]:d.com,v=x=>x?e(x):`<span class="ph">${L("[doplniť]","[kitöltendő]")}</span>`;
  return `<div class="ct"><div class="hd"><h1>${L("KÚPNA ZMLUVA","ADÁSVÉTELI SZERZŐDÉS")}</h1><div>${L("na poľnohospodárske komodity","mezőgazdasági termény adásvételére")} · ${L("č.","sz.")} <b>${e(no)}</b></div></div>
  <p class="c">${L("uzavretá podľa § 6:215 a nasl. zákona č. V/2013 Občiansky zákonník (Ptk.) Maďarska a zákona č. XCVII/2015 o organizácii trhov s poľnohospodárskymi výrobkami","a Polgári Törvénykönyvről szóló 2013. évi V. törvény (Ptk.) 6:215. §-a és következő szakaszai, valamint a 2015. évi XCVII. törvény alapján")}</p>
  <h2>1. ${L("Zmluvné strany","Szerződő felek")}</h2>
  <table class="pt"><tr><td><b>${L("Predávajúci","Eladó")}</b><br>${v(F.name)}<br>${v(F.addr)}<br>${L("IČO / reg. č.","Nyilvántartási szám")}: ${v(F.ico)}<br>${L("Daňové č.","Adószám")}: ${v(F.dic)}<br>${F.phone?e(F.phone):""} ${F.email?e(F.email):""}</td>
   <td><b>${L("Kupujúci","Vevő")}</b><br>${v(C.name)}<br>${v(C.addr)}<br>${L("Cégjegyzékszám","Cégjegyzékszám")}: ${v(C.cegj)}<br>${L("Adószám","Adószám")}: ${v(C.adosz)}${C.eu?` · ${e(C.eu)}`:""}<br>${L("Zastúpený","Képviseli")}: ${v(C.kepv)}<br>${C.bank?e(C.bank)+" ":""}${C.iban?e(C.iban):""}</td></tr></table>
  <h2>2. ${L("Predmet zmluvy","A szerződés tárgya")}</h2><ol>
   <li>${L(`Predávajúci predá a Kupujúci kúpi komoditu <b>${e(cn)}</b> z úrody <b>${e(d.rok)}</b> v množstve <b>${e(d.t)} t</b> (tolerancia ±5 %) v kvalite podľa Prílohy č. 1.`,`Az Eladó eladja, a Vevő megvásárolja a <b>${e(d.rok)}</b>. évi termésű <b>${e(cn)}</b> terményt <b>${e(d.t)} tonna</b> mennyiségben (±5% tűréshatár), az 1. számú mellékletben meghatározott minőségben.`)}</li>
   <li>${L("Predávajúci vyhlasuje, že komodita je jeho vlastníctvom, nie je zaťažená právami tretích osôb, je GMO-free a bola ošetrovaná v súlade s právnymi predpismi.","Az Eladó kijelenti, hogy a termény kizárólagos tulajdonában áll, harmadik személy joga nem terheli, GMO-mentes, és kezelése a jogszabályoknak megfelelően történt.")}</li></ol>
  <h2>3. ${L("Kúpna cena","Vételár")}</h2><ol>
   <li>${L(`Kúpna cena je pevná: <b>${e(d.cena)} ${e(cur)}/t</b> bez DPH, parita FCA miesto nakládky (${v(d.miesto)}). Zvýšenie trhových cien po podpise zmluvy cenu nemení.`,`A vételár rögzített: <b>${e(d.cena)} ${e(cur)}/tonna</b> + ÁFA, FCA paritás a rakodás helyén (${v(d.miesto)}). A szerződéskötést követő piaci áremelkedés a vételárat nem módosítja.`)}</li>
   <li>${L("DPH sa uplatní podľa maďarského zákona o DPH (Áfa tv.); pri obilninách a olejninách medzi platiteľmi DPH sa uplatní prenesenie daňovej povinnosti (§ 142 Áfa tv.), ak sú splnené podmienky.","Az ÁFA a 2007. évi CXXVII. törvény (Áfa tv.) szerint kerül felszámításra; gabona- és olajos mag termékek adóalanyok közötti értékesítésénél a fordított adózás (Áfa tv. 142. §) alkalmazandó, ha feltételei fennállnak.")}</li></ol>
  <h2>4. ${L("Dodanie, váženie a prechod nebezpečenstva","Teljesítés, mérlegelés, kárveszély")}</h2><ol>
   <li>${L(`Dodacie obdobie: ${fd(d.od)} – ${fd(d.do)}. Odvoz zabezpečuje Kupujúci (doprava VALKO s.r.o.) po dohode termínu najmenej 2 pracovné dni vopred.`,`Teljesítési időszak: ${fd(d.od)} – ${fd(d.do)}. Az elszállításról a Vevő gondoskodik (VALKO s.r.o.), legalább 2 munkanappal előre egyeztetett időpontban.`)}</li>
   <li>${L("Rozhodujúca je hmotnosť zistená na úradne overenej váhe Kupujúceho alebo ním určeného skladu a výsledok laboratórneho rozboru priemernej vzorky odobratej pri príjme.","Irányadó a Vevő vagy az általa kijelölt raktár hitelesített mérlegén megállapított tömeg és az átvételkor vett átlagminta laboratóriumi vizsgálatának eredménye.")}</li>
   <li>${L("Vlastníctvo a nebezpečenstvo škody prechádzajú na Kupujúceho prevzatím komodity (§ 6:219 Ptk.).","A tulajdonjog és a kárveszély a termény átvételével száll át a Vevőre (Ptk. 6:219. §).")}</li></ol>
  <h2>5. ${L("Kvalita a kvalitatívne zrážky","Minőség és minőségi levonások")}</h2><ol>
   <li>${L(`Pri vyššej vlhkosti alebo nečistotách, ako je norma v Prílohe č. 1, zabezpečí Kupujúci sušenie/čistenie a uplatní zrážku: čistenie ${e(C.clean??2.5)} €/t, sušenie ${e(C.dry??3.5)} €/t za každé % vlhkosti nad normu. Zrážka je úpravou množstva, nie úhradou za službu.`,`Az 1. számú mellékletben szereplő normát meghaladó nedvesség vagy szennyezettség esetén a Vevő gondoskodik a szárításról/tisztításról és levonást alkalmaz: tisztítás ${e(C.clean??2.5)} €/t, szárítás ${e(C.dry??3.5)} €/t minden normát meghaladó nedvességszázalék után. A levonás mennyiségi korrekció, nem szolgáltatási díj.`)}</li>
   <li>${L("Ak sa strany nezhodnú na výsledku rozboru, rozhodne nezávislé akreditované laboratórium z rozhodcovskej vzorky; náklady znáša strana, ktorej stanovisko sa nepotvrdilo, inak rovnakým dielom (rozdelenie rizík podľa zákona č. XCVII/2015).","Ha a felek a vizsgálati eredményben nem értenek egyet, a döntőmintából független akkreditált laboratórium dönt; költségét az a fél viseli, akinek álláspontja nem igazolódott, egyébként a felek egyenlő arányban (kockázatmegosztás a 2015. évi XCVII. törvény szerint).")}</li></ol>
  <h2>6. ${L("Platobné podmienky","Fizetési feltételek")}</h2><ol>
   <li>${L(`Predávajúci vystaví faktúru do 15 dní od prevzatia. Kupujúci zaplatí kúpnu cenu do <b>${e(Math.min(30,+d.spl||30))} dní</b> od prevzatia komodity (pri neskoršom doručení faktúry do 15 dní od jej doručenia) – zákon č. XCVII/2015.`,`Az Eladó az átvételtől számított 15 napon belül számlát állít ki. A Vevő a vételárat a termény átvételétől számított <b>${e(Math.min(30,+d.spl||30))} napon</b> belül fizeti meg (későbbi számlakézbesítés esetén a számla kézhezvételétől számított 15 napon belül) – 2015. évi XCVII. törvény.`)}</li>
   <li>${L("Kupujúci udeľuje svojej banke splnomocnenie na inkaso (felhatalmazó levél) v prospech Predávajúceho pre prípad omeškania s platbou kúpnej ceny a úrokov z omeškania, ako to vyžaduje zákon.","A Vevő a törvény előírásának megfelelően felhatalmazó levelet ad számlavezető pénzforgalmi szolgáltatójának az Eladó javára a vételár és késedelmi kamata beszedésére, késedelmes fizetés esetére.")}</li>
   <li>${L("Pri omeškaní platí úrok z omeškania podľa § 6:155 Ptk.","Késedelem esetén a Ptk. 6:155. §-a szerinti késedelmi kamat jár.")}</li></ol>
  <h2>7. ${L("Povinnosť dodať a zmluvné sankcie","Szállítási kötelezettség és kötbér")}</h2><ol>
   <li>${L("Predávajúci je povinný dodať celé zmluvné množstvo za dohodnutú cenu aj vtedy, ak trhová cena stúpne. Predaj tej istej komodity tretej osobe pred splnením zmluvy je podstatným porušením zmluvy.","Az Eladó köteles a teljes szerződött mennyiséget a rögzített áron leszállítani akkor is, ha a piaci ár emelkedik. Ugyanazon termény harmadik személynek történő eladása a teljesítés előtt súlyos szerződésszegésnek minősül.")}</li>
   <li>${L(`Ak Predávajúci nedodá celé množstvo alebo jeho časť, zaplatí zmluvnú pokutu <b>${e(d.pok)} %</b> z kúpnej ceny nedodaného množstva (meghiúsulási kötbér, § 6:186 Ptk.). Kupujúci má okrem toho nárok na náhradu škody prevyšujúcej pokutu, najmä rozdielu ceny náhradného nákupu (fedezeti vétel).`,`Ha az Eladó a mennyiséget részben vagy egészben nem szállítja le, a le nem szállított mennyiség vételárának <b>${e(d.pok)}%-át</b> kitevő meghiúsulási kötbért fizet (Ptk. 6:186. §). A Vevő ezen felül jogosult a kötbért meghaladó kárának, különösen a fedezeti vétel árkülönbözetének megtérítésére.`)}</li>
   <li>${L("Vyššia moc (vis maior) – živelná pohroma, ktorá zničí úrodu – oslobodzuje od povinnosti v rozsahu preukázaných následkov, ak ju strana oznámi do 5 dní.","Vis maior (a termést megsemmisítő elemi kár) a bizonyított mértékben mentesít, ha a fél azt 5 napon belül bejelenti.")}</li></ol>
  <h2>8. ${L("Záverečné ustanovenia","Záró rendelkezések")}</h2><ol>
   <li>${L("Zmluva sa riadi maďarským právom, najmä Ptk. Spory rieši vecne a miestne príslušný súd v Maďarsku podľa sídla Kupujúceho.","A szerződésre a magyar jog, különösen a Ptk. az irányadó. A jogvitákra a Vevő székhelye szerint illetékes magyar bíróság jogosult.")}</li>
   <li>${L("Zmluva je vyhotovená v maďarskom a slovenskom jazyku; v prípade rozporu je rozhodujúce maďarské znenie. Zmeny len písomne. Elektronický podpis v aplikácii je platný podpis.","A szerződés magyar és szlovák nyelven készült; eltérés esetén a magyar szöveg az irányadó. Módosítás csak írásban. Az alkalmazásban tett elektronikus aláírás érvényes aláírás.")}</li>
   <li>${L("Osobné údaje sa spracúvajú podľa GDPR iba na účely tejto zmluvy.","A személyes adatok kezelése a GDPR szerint, kizárólag e szerződés céljából történik.")}</li></ol>
  <div class="sg"><div>${L("V","Kelt")} ......................., ${new Date().toLocaleDateString(hu?"hu-HU":"sk-SK")}<br><br>......................................<br>${L("Predávajúci","Eladó")}</div><div><br><br><br>......................................<br>${L("Kupujúci","Vevő")} – ${e(C.name||"Danube Trade")}</div></div>
  <h2 class="pb">${L("Príloha č. 1 – Kvalitatívne parametre","1. számú melléklet – Minőségi paraméterek")}</h2>
  <table class="q"><tr><th>${L("Parameter","Paraméter")}</th><th>${L("Norma","Norma")}</th></tr><tr><td>${L("Vlhkosť max.","Nedvesség max.")}</td><td>${q[0]} %</td></tr><tr><td>${L("Nečistoty max.","Idegen anyag max.")}</td><td>${q[1]} %</td></tr>${q[2]!=null?`<tr><td>${L("Zlomky max.","Tört szem max.")}</td><td>${q[3]} %</td></tr>`:""}<tr><td>${L("Živé škodce","Élő kártevő")}</td><td>${L("neprípustné","nem megengedett")}</td></tr><tr><td>${L("Vôňa, farba","Illat, szín")}</td><td>${L("typická, bez plesne","jellegzetes, penészmentes")}</td></tr><tr><td>${L("Mykotoxíny","Mikotoxinok")}</td><td>${L("v limitoch nariadenia (EÚ) 2023/915","az (EU) 2023/915 rendelet határértékein belül")}</td></tr></table></div>`}
function printContract(no,d,lg){const w=window.open("","_blank");if(!w){tst(T("Povoľte vyskakovacie okná.","Engedélyezze a felugró ablakokat."));return}
  const body=lg==="both"?`<div class="two"><div>${contractHTML(no,d,"hu")}</div><div>${contractHTML(no,d,"sk")}</div></div>`:contractHTML(no,d,lg);
  w.document.write(`<!doctype html><html lang="${lg==="sk"?"sk":"hu"}"><head><meta charset="utf-8"><title>${e(no)}</title><style>@page{size:A4;margin:14mm}body{font:11.5px/1.5 "Segoe UI",Arial,sans-serif;color:#111;margin:0}
  .hd{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:6px;margin-bottom:8px}h1{font-size:18px;margin:0;letter-spacing:.06em}h2{font-size:12.5px;margin:12px 0 4px;color:#1e3a8a}ol{margin:0;padding-left:18px}li{margin:3px 0}.c{text-align:center;font-size:10.5px;color:#444}
  .pt{width:100%;border-collapse:collapse}.pt td{width:50%;vertical-align:top;border:1px solid #ccc;padding:8px}.q{border-collapse:collapse;width:70%}.q td,.q th{border:1px solid #ccc;padding:5px 8px;text-align:left}
  .sg{display:flex;justify-content:space-between;margin-top:26px}.ph{background:#fef3c7;padding:0 3px}.pb{page-break-before:always}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:10px}.two .pb{page-break-before:auto}
  .btn{position:fixed;right:14px;bottom:14px;padding:10px 16px;font-weight:700;border:0;border-radius:8px;background:#1d4ed8;color:#fff}@media print{.btn{display:none}}</style></head><body><button class="btn" onclick="print()">${lg==="sk"?"Tlačiť / PDF":"Nyomtatás / PDF"}</button>${body}</body></html>`);
  w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(x){}},400)}
document.addEventListener("click",async ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(x=g("[data-pacc]")){const [src,id]=x.dataset.pacc.split("|");busy(x,true);const r=await sb.rpc("pending_accept",{p_src:src,p_id:id});busy(x,false);if(r.error){tst("⚠️ "+r.error.message);return}
    tst("✓ Prijaté do spracovania. Objednávateľ dostal správu.",5000);P.L=(P.L||[]).filter(y=>!(y.src===src&&y.id===id));D.d=null;
    if(typeof STATE!=="undefined"&&STATE.reqs){const q=STATE.reqs.find(y=>y.id===id);if(q){q.status="v_spracovani";q.accepted_by=r.data.by}}rr();return}
  if(x=g("[data-pgo]")){if(typeof TAB!=="undefined"){TAB=x.dataset.pgo;rr();window.scrollTo({top:0})}return}
  if(g("[data-pall]")){P.all=!P.all;rr();return}
  if(x=g("[data-dnf]")){D.flt=x.dataset.dnf;rr();return}
  if(g("[data-dninvx]")){D.inv=null;rr();return}
  if(g("[data-dncopy]")&&D.inv){try{await navigator.clipboard.writeText(D.inv.txt);tst(T("Skopírované.","Másolva."))}catch(z){tst(T("Kopírovanie nefunguje – označ text.","A másolás nem működik."))}return}
  if(x=g("[data-dnlang]")){D.lang=x.dataset.dnlang;try{localStorage.setItem("ernte-dn-lang",D.lang)}catch(z){}rr();return}
  if(x=g("[data-dnzml]")){const r=(D.d.req||[]).find(y=>y.id===x.dataset.dnzml);const f=r&&(D.d.farmers||[]).find(y=>y.name===r.farmer);D.pre={farmer:f&&f.id,com:r&&r.com,t:r&&r.tons,od:r&&r.pickup_date,miesto:r&&r.place};D.flt="zml";rr();window.scrollTo({top:0});return}
  if(x=g("[data-dnprint]")){const [id,lg]=x.dataset.dnprint.split("|");const k=(D.K||[]).find(y=>String(y.id)===id);if(k){if(lg==="skhu"&&window.dnZmluvaPrint)dnZmluvaPrint(k.no,k.data,D.cfg);else printContract(k.no,k.data,lg)}return}
  if(x=g("[data-firm]")){const [k,id,f]=x.dataset.firm.split("|");const r=await sb.rpc("set_firma",{p_kind:k,p_id:id,p_firma:f});if(r.error){tst("⚠️ "+r.error.message);return}tst("✓ Presunuté do "+f+".");D.d=null;if(typeof STATE!=="undefined"&&STATE.reqs){const q=STATE.reqs.find(y=>y.id===id);if(q)q.firma=f}rr();return}});
document.addEventListener("change",ev=>{const x=ev.target;if(!x.dataset||x.dataset.dncom===undefined)return;const f=x.form,p=window.dnCurPrice?dnCurPrice(x.value):null;if(f&&f.cena&&p!=null)f.cena.value=String(p).replace(".",",")});
document.addEventListener("change",async ev=>{const x=ev.target;if(!x.dataset||!x.dataset.dnfarm)return;const f=x.checked?"DANUBE":"ERNTE";const r=await sb.rpc("set_firma",{p_kind:"farmer",p_id:x.dataset.dnfarm,p_firma:f});
  if(r.error){tst("⚠️ "+r.error.message);x.checked=!x.checked;return}const F=(D.d.farmers||[]).find(y=>y.id===x.dataset.dnfarm);if(F)F.firma=f;tst("✓ "+(F?F.name:"Farmár")+" → "+f)});
document.addEventListener("submit",async ev=>{const f=ev.target;
  if(f.id==="dnZ"){ev.preventDefault();const d=new FormData(f),fid=d.get("farmer");if(!fid){tst(T("Vyber predávajúceho.","Válassza ki az eladót."));return}const b=f.querySelector("button.lime");busy(b,true);
    const fr=await sb.rpc("danube_farmer",{p:fid});const o={farmer:fr.data||{},com:d.get("com"),rok:d.get("rok"),t:d.get("t"),cena:d.get("cena"),mena:d.get("mena"),od:d.get("od"),do:d.get("do"),miesto:d.get("miesto"),spl:Math.min(30,+d.get("spl")||30),pok:d.get("pok")};
    const r=await sb.rpc("danube_contract_save",{p_farmer:fid,p_data:o});busy(b,false);if(r.error){tst("⚠️ "+r.error.message);return}D.K=[r.data,...(D.K||[])];D.pre=null;if(window.dnZmluvaPrint)dnZmluvaPrint(r.data.no,o,D.cfg);else printContract(r.data.no,o,"both");rr();return}
  if(f.id==="dnNF"){ev.preventDefault();const d=new FormData(f),b=f.querySelector("button.lime"),row={firma:"DANUBE",active:true};["name","email","phone","addr","ico","dic"].forEach(k=>{const v=String(d.get(k)||"").trim();row[k]=v||null});
    if(row.email)row.email=row.email.toLowerCase();if(!row.name){tst(T("Zadaj meno.","Adja meg a nevet."));return}busy(b,true);
    const r=await sb.from("farmers").insert(row).select().single();if(r.error){busy(b,false);tst(r.error.code==="23505"?T("Tento e-mail už má iný farmár.","Ez az e-mail már másik termelőé."):"⚠️ "+r.error.message,6000);return}
    if(d.get("login")==="on"&&(row.email||row.phone)){const usePhone=!row.email,pw=typeof genPw==="function"?genPw():Math.random().toString(36).slice(2,10);
      const q=await sb.rpc("set_farmer_password",{fid:r.data.id,pw,use_phone:usePhone});busy(b,false);if(q.error){tst("⚠️ "+q.error.message,7000)}
      else D.inv={name:row.name,tel:row.phone?telN(row.phone):"",txt:invTxt(d.get("lang")==="hu",usePhone?row.phone:row.email,pw,"f")}}else busy(b,false);
    tst(T("✓ Farmár pridaný do Danube.","✓ Termelő hozzáadva (Danube)."));D.d=null;if(typeof loadStaff==="function")loadStaff();rr();window.scrollTo({top:0});return}
  if(f.id==="dnNO"){ev.preventDefault();const d=new FormData(f),b=f.querySelector("button.lime"),name=String(d.get("name")).trim(),login=String(d.get("login")).trim();busy(b,true);
    const pw=(typeof genPw==="function"?genPw():"Danube")+"-"+String(10+((crypto.getRandomValues(new Uint32Array(1))[0])%90));
    const r=await sb.rpc("set_staff_login",{login_in:login,name_in:name,role_in:"admin",pw});if(r.error){busy(b,false);tst("⚠️ "+r.error.message,7000);return}
    const K=["req","price_view","deals","farm","farm_login","calc","market","remain","notes","wx","big","danube"],p={};(window.PCAT_KEYS||[]).forEach(k=>p[k]=false);K.forEach(k=>p[k]=true);
    const q=await sb.rpc("set_staff_profile",{em:r.data,p,t:String(d.get("title")||""),r:String(d.get("region")||""),ph:/@/.test(login)?"":login});busy(b,false);if(q.error)tst("⚠️ "+q.error.message,6000);
    const isT=String(r.data).endsWith("@tel.ernte.sk");D.inv={name,tel:isT?String(r.data).split("@")[0]:"",txt:invTxt(d.get("lang")==="hu",isT?login:r.data,pw,"o")};tst(T("✓ Obchodník vytvorený.","✓ Kereskedő létrehozva."));rr();window.scrollTo({top:0});return}
  if(f.id==="dnC"){ev.preventDefault();const d=new FormData(f),v={...(D.cfg||{})};for(const [k,x] of d.entries())v[k]=["clean","dry"].includes(k)?(parseFloat(String(x).replace(",","."))||null):String(x).trim();
    const r=await sb.from("danube_cfg").upsert({key:"firma",value:v,updated_at:new Date().toISOString()});if(r.error){tst("⚠️ "+r.error.message);return}D.cfg=v;tst(T("✓ Uložené.","✓ Mentve."));rr();return}
  if(f.id!=="dnR")return;ev.preventDefault();const d=new FormData(f),rows=Object.keys(RT).map(k=>({key:k,emails:d.getAll(k),updated_at:new Date().toISOString()}));
  const r=await sb.from("app_routes").upsert(rows);if(r.error){tst("⚠️ "+r.error.message);return}tst("✓ Uložené. Nevybavené objednávky sa ukážu týmto ľuďom.");D.d=null;loadP(false)});
})();
