// ===== 🤝 PORTÁL OBCHODNÍKA (5. 11. 2026 príkaz majiteľa) =====
// Obchodné firmy, od ktorých kupujeme tovar, sa prihlásia ako dodávateľ, ale vidia vlastný portál vo farbách a s logom firmy:
//   📞 Chcem predať (Martin – telefón / SMS / WhatsApp; cenu nastavujeme spolu) · 💬 Orientačná cena pre vás (zverejnená cena − doplatok k doprave,
//   základ sa nepopisuje) · 📈 Burza MATIF · CBOT (iba verejné kurzy z nášho bota, nie AHDB) · 🚛 Kamióny s ich tovarom (poloha IBA v okne trader_trucks:
//   od 30 min pred nakládkou, v okolí ich miesta nakládky, do odchodu z nakládky – potom tabuľa „ochrana údajov“) · 📄 Zmluvy, vážne lístky, zúčtovanie
//   (štandardné časti dodávateľa BEZ cenníka, predaja, burzy, áut s vodičmi a GPS – fcan).
// NIKDY: odberatelia, kde predávame, modely cien podľa odberateľov, „naše nákupné ceny“.
// Prihlásenie vo farbách firmy: odkaz …/farmar/?p=<kód> → portal_brand(kód). Správa (iba Martin): Farmári → 🤝 Portály obchodníkov (trader_list / trader_set).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=(x,d)=>x==null||!isFinite(x)?"–":(+x).toLocaleString("sk-SK",{minimumFractionDigits:d||0,maximumFractionDigits:d==null?2:d});
const LSK="ernte-tp-kod",LSB="ernte-tp-brand",LSO="ernte-tp-on",LSL="ernte-tp-lang";
const ls=k=>{try{return localStorage.getItem(k)}catch(x){return null}},lss=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(x){}};
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
const MAIN=()=>typeof MAIN_OK==="function"&&MAIN_OK();
const TP={me:null,busy:false,view:"tp",tr:null,trAt:0,trBusy:false,map:null,mk:{},bz:null,w:null,meAt:0};
/* kód z odkazu (?p=… alebo #p=…) – farby a logo na prihlasovacej stránke */
try{const u=new URL(location.href);const k=u.searchParams.get("p")||((location.hash.match(/[#&]p=([a-z0-9]{8,12})/i)||[])[1]);if(k&&/^[a-z0-9]{8,12}$/i.test(k))lss(LSK,k)}catch(x){}

/* ---------- jazyk SK / HU ---------- */
const TX={
 hdr:["Portál obchodníka","Kereskedői portál"],
 sell:["📞 Chcem predať","📞 Eladnék"],
 sellp:["Ceny sú iba orientačné. Predajnú cenu nastavíme spolu – zavolajte alebo napíšte.","Az árak csak tájékoztató jellegűek. Az eladási árat közösen állapítjuk meg – hívjon vagy írjon."],
 call:["📞 Zavolať","📞 Hívás"],sms:["💬 SMS","💬 SMS"],mail:["✉️ E-mail","✉️ E-mail"],
 notel:["Telefónne číslo doplní ERNTE.","A telefonszámot az ERNTE adja meg."],
 ceny:["💬 Orientačná cena pre vás","💬 Tájékoztató ár az Ön részére"],
 cenys:["€/t bez DPH · FCA vaše miesto nakládky · orientačne, nie je to záväzná ponuka","€/t ÁFA nélkül · FCA az Ön rakodási helyén · tájékoztató, nem kötelező ajánlat"],
 prir:["🚚 Doplatok k doprave −{x} €/t je už odpočítaný z predajnej ceny (vaše miesto nakládky je ~{km} km).","🚚 A {x} €/t szállítási hozzájárulás már le van vonva az eladási árból (az Ön rakodási helye ~{km} km)."],
 ceny0:["Ceny práve pripravujeme.","Az árakat most készítjük."],
 bz:["📈 Burza MATIF · CBOT","📈 Tőzsde MATIF · CBOT"],
 bzs:["verejné kurzy búrz v €/t – nie je to cena ERNTE","nyilvános tőzsdei árfolyamok €/t-ban – nem az ERNTE ára"],
 tr:["🚛 Kamióny s vaším tovarom","🚛 Az Ön áruját szállító kamionok"],
 tr0:["Na najbližšie dni nie je naplánovaný žiadny kamión.","A következő napokra nincs tervezett kamion."],
 pred:["🔒 Poloha sa zobrazí od {od} – 30 minút pred nakládkou.","🔒 A helyzet {od}-tól látható – 30 perccel a rakodás előtt."],
 pred0:["🔒 Poloha sa zobrazí 30 minút pred nakládkou, keď bude auto pri vás.","🔒 A helyzet 30 perccel a rakodás előtt látható, amikor a kamion Önnél lesz."],
 den:["📅 Naplánované – poloha sa zobrazí v deň nakládky 30 minút pred príchodom.","📅 Tervezett – a helyzet a rakodás napján, 30 perccel érkezés előtt látható."],
 daleko:["🔒 Auto je ešte ďaleko – poloha sa zobrazí, keď bude v okolí vášho miesta nakládky.","🔒 A kamion még messze van – a helyzet a rakodási hely közelében lesz látható."],
 bezgps:["📡 Poloha auta teraz nie je k dispozícii.","📡 A kamion helyzete most nem elérhető."],
 po:["🔒 Poloha je skrytá","🔒 A helyzet rejtett"],
 pop:["Po nakládke polohu auta nezobrazujeme – ochrana osobných údajov vodiča (GDPR) a obchodného tajomstva ERNTE. Ďakujeme za pochopenie.","Rakodás után a kamion helyzetét nem mutatjuk – a sofőr személyes adatainak (GDPR) és az ERNTE üzleti titkának védelme. Köszönjük a megértést."],
 km:["{km} km od miesta nakládky","{km} km a rakodási helytől"],
 upd:["poloha {t}","helyzet {t}"],
 maps:["🗺️ Otvoriť v mapách","🗺️ Megnyitás térképen"],
 docs:["📄 Zmluvy, vážne lístky a zúčtovanie","📄 Szerződések, mérlegjegyek és elszámolás"],
 docsp:["Vaše zmluvy s ERNTE, dodávky a PDF dokumenty.","Az ERNTE-vel kötött szerződései, szállításai és PDF dokumentumai."],
 open:["Otvoriť","Megnyitás"],back:["← Späť na portál","← Vissza a portálra"],
 deals:["{n} zmlúv · zostáva vyviezť {t} t","{n} szerződés · hátralévő {t} t"],
 load:["Načítavam…","Betöltés…"],
 st:{naplanovana:["naplánované","tervezett"],na_ceste:["ide na nakládku","úton a rakodáshoz"],nakladka:["nakladá","rakodik"],nalozene:["naložené – odišlo","megrakva – elindult"],vylozene:["doručené","leszállítva"]},
 dnes:["dnes","ma"],zajtra:["zajtra","holnap"],
 foot:["Údaje sú dôverné – iba pre vašu firmu.","Az adatok bizalmasak – csak az Ön cége számára."]
};
const HUC={repka:"Repce",lo:"Napraforgó (LO)",ho:"Napraforgó (HO)",soja:"Szója",psenica_p:"Étkezési búza",psenica_k:"Takarmánybúza",jacmen_k:"Takarmányárpa",jacmen_s:"Sörárpa",kukurica:"Kukorica",cirok:"Cirok"};
const HUB={"MATIF repka":"MATIF repce","MATIF pšenica":"MATIF búza","MATIF kukurica":"MATIF kukorica","CBOT sója":"CBOT szója","CBOT kukurica":"CBOT kukorica","CBOT pšenica":"CBOT búza"};
function LG(){const v=ls(LSL)||(TP.me&&TP.me.lang)||(brand()||{}).lang||"sk";return v==="hu"?"hu":"sk"}
const T=(k,o)=>{const a=TX[k];let s=a?a[LG()==="hu"?1:0]:k;if(o)for(const x in o)s=s.split("{"+x+"}").join(o[x]);return s};
const CN=c=>LG()==="hu"&&HUC[c]?HUC[c]:(typeof comName==="function"?comName(c):c);

/* ---------- značka (farby, logo) ---------- */
function brand(){try{return JSON.parse(ls(LSB)||"null")}catch(x){return null}}
function applyVars(b){const r=document.documentElement;if(!b||!b.name){r.classList.remove("tpb");return}
  r.style.setProperty("--tc1",b.c1||"#1d4ed8");r.style.setProperty("--tc2",b.c2||b.c1||"#22c55e");r.classList.add("tpb")}
const ini=n=>String(n||"").replace(/\b(s\.?r\.?o\.?|a\.?s\.?|kft\.?|zrt\.?|bt\.?|spol\.)/gi,"").trim().split(/[\s\/.,-]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"•";
const logoHTML=b=>b&&b.logo?`<span class="tplogo"><img src="${E(b.logo)}" alt="${E(b.name||"")}"></span>`:`<span class="tplogo tpini">${E(ini(b&&b.name))}</span>`;
async function loadBrand(){const k=ls(LSK);if(!k||typeof sb==="undefined"||isF())return;
  try{const r=await sb.rpc("portal_brand",{p_kod:k});if(r.error)return;if(r.data&&r.data.name){lss(LSB,JSON.stringify(r.data));applyVars(r.data);decorLogin()}else{lss(LSK,null);lss(LSB,null);applyVars(null)}}catch(x){}}
function decorLogin(){const b=brand();if(!b||isF())return;css();applyVars(b);const A=document.getElementById("app");const c=A&&A.querySelector(":scope>.center");if(!c)return;
  if(c.querySelector(".tplg"))return;const h=c.querySelector(".hero");if(!h)return;c.classList.add("tplog");
  h.insertAdjacentHTML("beforebegin",`<div class="tplg">${logoHTML(b)}<div><small>${E(T("hdr"))} · ERNTE</small><b>${E(b.name)}</b></div></div>`)}
function wrapLogin(){const o=window.showLogin;if(typeof o!=="function"||o.__tp)return;const w=function(){const r=o.apply(this,arguments);try{decorLogin()}catch(x){}return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__tp=1;window.showLogin=w}

/* ---------- prihlásená firma ---------- */
const on=()=>isF()&&(TP.me?!!TP.me.on:ls(LSO)===String(FARMER.id));
const LSN="ernte-tp-no",known=()=>!!TP.me||ls(LSO)===String(FARMER.id)||ls(LSN)===String(FARMER.id);
window.ernteTrader={is:on,me:()=>TP.me};
async function meLoad(force){if(TP.busy||!isF())return;if(!force&&TP.me&&Date.now()-TP.meAt<5*60e3)return;TP.busy=true;
  let d=null;try{const r=await sb.rpc("trader_me");d=r.error?{on:false,err:r.error.message}:(r.data||{on:false})}catch(x){d={on:false,err:String(x)}}
  TP.busy=false;TP.meAt=Date.now();const was=on(),pend=TP.pend;TP.pend=false;if(!d||Array.isArray(d))d={on:false};TP.me=d;
  if(d.on){lss(LSO,String(FARMER.id));lss(LSN,null);lss(LSB,JSON.stringify({name:d.name,c1:d.c1,c2:d.c2,logo:d.logo,lang:d.lang}));closeWelcome()}
  else{lss(LSO,null);if(!d.err){lss(LSN,String(FARMER.id));lss(LSK,null);lss(LSB,null)}document.documentElement.classList.remove("trader","tpb")}
  if(pend||was!==!!d.on||(d.on&&!document.querySelector("#app>.tph")))try{renderFarmer()}catch(x){}
  else if(d.on&&TP.view==="tp")refreshCards()}
/* pravidelné obnovenie: iba karty na mieste (stránka neskáče, mapa beží ďalej) */
function refreshCards(){const A=document.getElementById("app");if(!A)return;const rep=(sel,html)=>{const el=A.querySelector(sel);if(!el)return;const t=document.createElement("div");t.innerHTML=html;const n=t.firstElementChild;if(n&&el.outerHTML!==n.outerHTML)el.replaceWith(n)};
  rep(".tpsell",sellHTML());rep(".tpceny",cenyHTML());rep("#tpBz",bzHTML());rep(".tpdocs",docsHTML())}
function closeWelcome(){const w=document.querySelector(".wlc");if(w){w.remove();document.documentElement.classList.remove("wlon")}}

/* ---------- 🚛 kamióny ---------- */
async function trLoad(){if(TP.trBusy||!on())return;TP.trBusy=true;
  try{const r=await sb.rpc("trader_trucks");TP.tr=r.error?{err:r.error.message,trips:[]}:(r.data||{trips:[]})}catch(x){TP.tr={err:String(x),trips:[]}}
  TP.trAt=Date.now();TP.trBusy=false;paintTr()}
const hm=t=>new Date(t).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});
function dayTxt(d){const t=new Date().toLocaleDateString("sv-SE"),z=new Date(Date.now()+864e5).toLocaleDateString("sv-SE");if(d===t)return T("dnes");if(d===z)return T("zajtra");
  return new Date(d+"T12:00").toLocaleDateString(LG()==="hu"?"hu-HU":"sk-SK",{weekday:"short",day:"numeric",month:"numeric"})}
function trRow(x){const st=(TX.st[x.status]||[x.status,x.status])[LG()==="hu"?1:0];let b="";
  if(x.pos){b=`<div class="tpgps"><span>📍 ${E(x.pos.km!=null?T("km",{km:N(x.pos.km,1)}):"")}</span><span>${E(T("upd",{t:hm(x.pos.at)}))}${x.pos.spd?` · ${N(x.pos.spd,0)} km/h`:""}</span>
     <a href="https://www.google.com/maps?q=${x.pos.lat},${x.pos.lon}" target="_blank" rel="noopener">${E(T("maps"))}</a></div>`}
  else if(x.hide==="po")b=`<div class="tpboard"><b>${E(T("po"))}</b><span>${E(T("pop"))}</span></div>`;
  else b=`<div class="tphide">${E(x.hide==="pred"?(x.od?T("pred",{od:hm(x.od)}):T("pred0")):x.hide==="den"?T("den"):x.hide==="daleko"?T("daleko"):T("bezgps"))}</div>`;
  return `<div class="tptr${x.pos?" tplive":""}"><div class="tptrh"><b>${E(dayTxt(x.day))}${x.time?" · "+E(x.time):""}</b><span class="tpspz">🚛 ${E(x.spz||"")}</span><span class="tpst s-${E(x.status)}">${E(st)}</span></div>${b}</div>`}
function trHTML(){const D=TP.tr;let h=`<div class="card tpc tptrc" id="tpTr"><h3>${E(T("tr"))}</h3>`;
  if(!D)return h+`<div class="s">${E(T("load"))}</div></div>`;
  const L0=(D.trips||[]).filter(x=>x.status!=="vylozene"||x.day>=new Date(Date.now()-864e5).toLocaleDateString("sv-SE"));
  if(!L0.length)return h+`<div class="s">${E(T("tr0"))}</div></div>`;
  const live=L0.some(x=>x.pos);
  return h+(live?`<div class="tpmap" id="tpMap" data-nocut></div>`:"")+L0.map(trRow).join("")+`</div>`}
function paintTr(){const c=document.getElementById("tpTr");if(!c||TP.view!=="tp")return;const live=!!document.getElementById("tpMap");
  const tmp=document.createElement("div");tmp.innerHTML=trHTML();const n=tmp.firstElementChild;const hasMap=!!n.querySelector("#tpMap");
  if(live&&hasMap){/* mapu nechať, prepísať iba riadky */[...c.querySelectorAll(".tptr,.s")].forEach(e=>e.remove());[...n.querySelectorAll(".tptr,.s")].forEach(e=>c.appendChild(e));markers()}
  else{c.replaceWith(n);TP.map=null;TP.mk={};mountMap()}}
function mountMap(){const el=document.getElementById("tpMap");if(!el||typeof needL!=="function")return;
  needL().then(()=>{if(!el.isConnected||el._m)return;const m=L.map(el,{scrollWheelZoom:false,attributionControl:true,zoomControl:true});el._m=m;TP.map=m;
    try{baseLayers(m)}catch(x){L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(m)}markers(true)}).catch(()=>{})}
function markers(fit){const m=TP.map;if(!m||!window.L)return;const P=((TP.tr||{}).trips||[]).filter(x=>x.pos);const seen={};
  for(const x of P){seen[x.id]=1;const ll=[x.pos.lat,x.pos.lon];if(TP.mk[x.id])TP.mk[x.id].setLatLng(ll);
    else TP.mk[x.id]=L.marker(ll,{icon:L.divIcon({className:"tpmk",html:`<span>🚛</span><b>${E(x.spz||"")}</b>`,iconSize:[86,34],iconAnchor:[17,17]})}).addTo(m)}
  for(const k in TP.mk)if(!seen[k]){m.removeLayer(TP.mk[k]);delete TP.mk[k]}
  if(fit&&P.length){if(P.length===1)m.setView([P[0].pos.lat,P[0].pos.lon],13);else m.fitBounds(P.map(x=>[x.pos.lat,x.pos.lon]),{padding:[30,30],maxZoom:13})}}

/* ---------- 📈 burza (iba náš bot – market.json) ---------- */
async function bzLoad(){if(TP.bz&&Date.now()-TP.bz.at<10*60e3)return;try{const r=await fetch("market.json",{cache:"no-store"});const j=r.ok?await r.json():null;TP.bz={at:Date.now(),j}}catch(x){TP.bz={at:Date.now(),j:null}}
  const c=document.getElementById("tpBz");if(c&&TP.view==="tp"&&on()){const t=document.createElement("div");t.innerHTML=bzHTML();c.replaceWith(t.firstElementChild)}}
const HK={"MATIF repka":"matif_repka","MATIF pšenica":"matif_psenica","MATIF kukurica":"matif_kukurica","CBOT sója":"cbot_soja"};
function spark(pts){if(!pts||pts.length<2)return "";const w=96,h=28,mn=Math.min(...pts),mx=Math.max(...pts),sp=mx-mn||1;
  const p=pts.map((v,i)=>`${(i/(pts.length-1)*w).toFixed(1)},${(h-2-(v-mn)/sp*(h-4)).toFixed(1)}`).join(" ");
  return `<svg class="tpsp" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${p}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`}
function bzHTML(){const M=TP.me||{},B=(M.burza||[]).filter(b=>/^(MATIF|CBOT)/i.test(b.name||"")),H=TP.bz&&TP.bz.j&&Array.isArray(TP.bz.j.hist)?TP.bz.j.hist:[];
  let h=`<div class="card tpc" id="tpBz"><h3>${E(T("bz"))}</h3><small class="tps">${E(T("bzs"))}</small>`;
  if(!B.length)return h+`<div class="s">${E(T("load"))}</div></div>`;
  return h+B.map(b=>{const k=HK[b.name],pts=k?H.filter(x=>x[k]>0).slice(-30).map(x=>+x[k]):[],df=pts.length>1?pts[pts.length-1]-pts[pts.length-2]:null;
    return `<div class="tpbzr"><span class="tpbzn"><b>${E(LG()==="hu"&&HUB[b.name]?HUB[b.name]:b.name)}</b><small>${E(b.kontrakt||"")}${b.d?" · "+E(new Date(b.d+"T12:00").toLocaleDateString(LG()==="hu"?"hu-HU":"sk-SK",{day:"numeric",month:"numeric"})):""}</small></span>
      <span class="tpbzg ${df>0?"up":df<0?"dn":""}">${spark(pts)}</span><b class="tpbzv">${N(b.eur_t,2)} <small>€/t</small>${df!=null&&df!==0?`<em class="${df>0?"up":"dn"}">${df>0?"▲":"▼"} ${N(Math.abs(df),2)}</em>`:""}</b></div>`}).join("")+`</div>`}

/* ---------- 💬 orientačné ceny, 📞 kontakt, 📄 dokumenty ---------- */
const telD=t=>String(t||"").replace(/[^\d+]/g,"");
function sellHTML(){const K=(TP.me||{}).kontakt||{},t=telD(K.tel),wa=t.replace(/^\+/,"").replace(/^00/,"");
  return `<div class="card tpc tpsell"><h3>${E(T("sell"))}</h3><p>${E(T("sellp"))}</p><div class="tpwho">👤 <b>${E(K.meno||"Martin Vaľko")}</b>${t?` · <a href="tel:${E(t)}">${E(K.tel)}</a>`:""}</div>
   <div class="tpbtns">${t?`<a class="tpbtn pri" href="tel:${E(t)}">${E(T("call"))}</a><a class="tpbtn" href="sms:${E(t)}">${E(T("sms"))}</a><a class="tpbtn wa" href="https://wa.me/${E(wa)}" target="_blank" rel="noopener">WhatsApp</a>`
     :`<a class="tpbtn pri" href="mailto:ernte@ernte.sk">${E(T("mail"))}</a><span class="s">${E(T("notel"))}</span>`}</div></div>`}
function cenyHTML(){const M=TP.me||{},C=M.ceny||[];
  let h=`<div class="card tpc tpceny"><h3>${E(T("ceny"))}</h3><small class="tps">${E(T("cenys"))}</small>`;
  if(!C.length)return h+`<div class="s">${E(T("ceny0"))}</div></div>`;
  h+=C.map(c=>`<div class="tprow">${typeof comImg==="function"?comImg(c.com):""}<span>${E(CN(c.com))}</span><b>≈ ${N(c.cena,0)} <small>€/t</small></b></div>`).join("");
  if(+M.prirazka>0)h+=`<div class="tpnote">${E(T("prir",{x:N(M.prirazka,2),km:N(M.km,0)}))}</div>`;
  return h+`</div>`}
function docsHTML(){const D=(typeof STATE!=="undefined"&&STATE.deals)||[],run=D.filter(d=>["podpisany","odvoz","navrh"].includes(d.status)),left=run.reduce((s,d)=>s+Math.max(0,(+d.tons||0)-(+d.delivered_t||0)),0);
  return `<div class="card tpc tpdocs"><h3>${E(T("docs"))}</h3><p>${E(T("docsp"))}</p>${D.length?`<div class="s">${E(T("deals",{n:D.length,t:N(left,0)}))}</div>`:""}
   <div class="tpbtns"><button type="button" class="tpbtn pri" data-tpstd>${E(T("open"))} ›</button></div></div>`}
function heroHTML(){const M=TP.me||brand()||{},l=LG();
  return `<div class="hero tph"><div class="tphl">${logoHTML(M)}</div><div class="tpht"><small>${E(T("hdr"))} · ERNTE Trade &amp; Logistic</small><b>${E(M.name||(isF()?FARMER.name:""))}</b></div>
   <div class="tplang" role="group" aria-label="Jazyk"><button type="button" data-tplang="sk" class="${l==="sk"?"on":""}" aria-pressed="${l==="sk"}">🇸🇰 SK</button><button type="button" data-tplang="hu" class="${l==="hu"?"on":""}" aria-pressed="${l==="hu"}">🇭🇺 HU</button></div></div>`}
function portal(){const A=document.getElementById("app");if(!A)return;css();const M=TP.me;applyVars(M&&M.on?M:brand());document.documentElement.classList.add("trader");
  if(!M){A.innerHTML=heroHTML()+`<div class="card tpc"><div class="s">${E(T("load"))}</div></div>`;return}
  A.innerHTML=heroHTML()+`<div class="tpg">${sellHTML()}${cenyHTML()}${trHTML()}${bzHTML()}${docsHTML()}</div><p class="tpfoot">🔒 ${E(T("foot"))}</p>`;
  TP.map=null;TP.mk={};mountMap();if(!TP.tr||Date.now()-TP.trAt>30e3)trLoad();bzLoad()}
function stdBar(){const A=document.getElementById("app");if(!A)return;const h=A.querySelector(":scope>.hero");if(!h||A.querySelector(":scope>.tpback"))return;
  h.insertAdjacentHTML("afterend",`<div class="fvbar tpback"><button type="button" data-tpback>${E(T("back"))}</button><b>${E(T("docs").replace(/^📄\s*/,""))}</b></div>`)}

/* ---------- obalenie renderFarmer (vždy najvonkajšie) + skrytie častí dodávateľa ---------- */
const HIDE=["f_prices","f_sell","f_offer","f_burza","f_trucks","f_gps","f_agro"];
function patchFcan(){const of=window.fcan;if(typeof of!=="function"||of.__tp)return;const w=k=>on()&&HIDE.includes(k)?false:of(k);w.__tp=1;window.fcan=w}
let RW=0;function wrapRF(){const o=window.renderFarmer;if(typeof o!=="function"||o===TP.w||RW>8)return;RW++;
  const w=function(){if(isF()){if(!TP.me&&!TP.busy)meLoad();patchFcan();
      if(!known()){/* prvé prihlásenie na zariadení: kým nevieme, či je to obchodná firma, nič z dodávateľa (ceny) neukážeme */
        TP.pend=true;const A=document.getElementById("app");if(A)A.innerHTML=`<div class="hero"><small>ERNTE Trade &amp; Logistic</small><b>${E(T("load"))}</b></div>`;return}
      if(on()){if(TP.view==="std"){document.documentElement.classList.add("trader");const r=o.apply(this,arguments);try{stdBar()}catch(x){}return r}return portal()}
      document.documentElement.classList.remove("trader")}
    return o.apply(this,arguments)};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});TP.w=w;window.renderFarmer=w}
setInterval(()=>{wrapRF();wrapLogin();patchFcan();if(on()&&TP.view==="tp"&&!document.hidden){if(Date.now()-TP.trAt>45e3)trLoad();if(Date.now()-TP.meAt>5*60e3)meLoad(true)}},1000);
wrapRF();wrapLogin();
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-tplang],[data-tpstd],[data-tpback]");if(!t||!on())return;e.preventDefault();
  if(t.dataset.tplang){lss(LSL,t.dataset.tplang);renderFarmer();return}
  if("tpstd" in t.dataset){TP.view="std";renderFarmer();scrollTo(0,0);return}
  if("tpback" in t.dataset){TP.view="tp";renderFarmer();scrollTo(0,0)}});
addEventListener("load",()=>{setTimeout(()=>{loadBrand();decorLogin()},300)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&on()&&TP.view==="tp"&&Date.now()-TP.trAt>20e3)trLoad()});

/* ===== ⚙️ SPRÁVA – iba Martin: Farmári → 🤝 Portály obchodníkov ===== */
const AD={d:null,busy:false,open:false,msg:""};
async function adLoad(){AD.busy=true;try{const r=await sb.rpc("trader_list");AD.d=r.error?{err:r.error.message}:(r.data||{list:[]})}catch(x){AD.d={err:String(x)}}AD.busy=false;adPaint()}
const URLP=k=>{const u=new URL(location.href);u.search="";u.hash="";u.pathname=u.pathname.replace(/\/beta\//,"/");return u.origin+u.pathname.replace(/index\.html$/,"")+"?p="+k};
function adRow(t){const km=t.km!=null?t.km:t.km_auto;
  return `<div class="tpad" data-tpf="${E(t.farmer_id)}" style="--tc1:${E(t.c1||"#1d4ed8")};--tc2:${E(t.c2||t.c1||"#22c55e")}">
   <div class="tpadh">${logoHTML(t)}<b>${E(t.name)}</b><label class="tpsw"><input type="checkbox" data-tpk="on" ${t.on?"checked":""}> zapnutý</label></div>
   ${!t.active||!t.login?`<div class="tpwarn">⚠️ Firma zatiaľ nemá prístup do aplikácie${!t.login?" (chýba e-mail alebo telefón)":""}. Zapni prístup a pošli pozvánku v karte firmy (Farmári → ${E(t.name)} → Pozvať). Odkaz nižšie potom otvorí prihlásenie v ich farbách.</div>`:""}
   <div class="tpadg">
    <label>Hlavná farba<input type="color" data-tpk="c1" value="${E(t.c1||"#1d4ed8")}"></label>
    <label>Druhá farba<input type="color" data-tpk="c2" value="${E(t.c2||"#22c55e")}"></label>
    <label>Jazyk portálu<select data-tpk="lang"><option value="sk" ${t.lang==="sk"?"selected":""}>🇸🇰 slovensky</option><option value="hu" ${t.lang==="hu"?"selected":""}>🇭🇺 maďarsky</option></select></label>
    <label>Km jedným smerom<input type="number" inputmode="decimal" min="0" max="2000" data-tpk="km" value="${t.km!=null?E(t.km):""}" placeholder="${t.km_auto!=null?"odhad "+E(t.km_auto):"zadaj km"}"></label>
    <label>Nosnosť auta (t)<input type="number" inputmode="decimal" min="5" max="45" data-tpk="nosnost" value="${E(t.nosnost||25)}"></label>
    <label class="tplogo-in">Logo firmy<span class="tpbtns"><span class="tpbtn" role="button" tabindex="0">🖼️ Nahrať logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-tplogo hidden></span>${t.logo?`<button type="button" class="tpbtn" data-tplogox>✕ Zmazať logo</button>`:""}</span></label>
   </div>
   <div class="tpadn">🚚 Doplatok k doprave: ${km!=null?(()=>{const C=AD.d.cfg||{},bk=+C.base_km||160,pr=Math.max(0,(2*km-bk))*(+C.ekm||1.6)/(+t.nosnost||25);return pr>0?`${N(km,0)} km → <b>−${N(pr,2)} €/t</b> sa odpočíta z orientačnej ceny`:`${N(km,0)} km – <b>bez doplatku</b> (do ${N(bk/2,0)} km jedným smerom)`})():"zadaj km"} · miesta nakládky: ${(t.miesta||[]).length} zadané, ${t.spots} naučené z lístkov</div>
   <div class="tpadn">📍 Výdajné miesta (poloha kamióna sa ukáže iba pri nich): ${(t.miesta||[]).map((m,i)=>`<span class="tpchip">${E(m.n||"miesto "+(i+1))} <button type="button" data-tpmx="${i}" aria-label="Zmazať miesto">✕</button></span>`).join("")}
     <button type="button" class="tpbtn" data-tpmadd>➕ Pridať výdajné miesto</button></div>
   <div class="tplink"><code>${E(URLP(t.kod))}</code><button type="button" class="tpbtn" data-tpcopy="${E(URLP(t.kod))}">📋 Kopírovať odkaz</button><button type="button" class="tpbtn" data-tpnew>🔄 Nový kód</button></div>
   <div class="tpbtns"><button type="button" class="tpbtn" data-tpdel>🗑️ Zrušiť portál</button></div></div>`}
function adHTML(){const D=AD.d;if(!D)return `<div class="s">Načítavam…</div>`;if(D.err)return `<div class="s">${/trader_list|does not exist|could not find/i.test(D.err)?"Zapne sa po aktualizácii databázy (pár minút).":E(D.err)}</div>`;
  const C=D.cfg||{},F=((typeof STATE!=="undefined"&&STATE.farmers)||[]).filter(f=>!D.list.some(t=>t.farmer_id===f.id)).sort((a,b)=>String(a.name).localeCompare(String(b.name),"sk"));
  return `<p class="s">Obchodné firmy, od ktorých kupujeme tovar. Vidia iba: burzu, orientačnú cenu pre nich (zverejnená cena − doplatok k doprave), svoje kamióny (poloha iba 30 min pred nakládkou pri ich mieste a do odchodu z nakládky) a svoje zmluvy. Nevidia odberateľov, kde predávame, ani naše výkupné ceny ako „nákupné“.</p>
   <div class="tpadg tpcfg"><label>Tvoje meno pre obchodníkov<input data-tpc="meno" value="${E(C.meno||"Martin Vaľko")}"></label>
    <label>Tvoj telefón (volať, SMS, WhatsApp)<input data-tpc="tel" inputmode="tel" value="${E(C.tel||C.tel_staff||"")}" placeholder="+421 9xx xxx xxx"></label>
    <label>€/km<input data-tpc="ekm" type="number" step="0.01" value="${E(C.ekm||1.6)}"></label><label>Km v cene (tam a späť)<input data-tpc="base_km" type="number" value="${E(C.base_km||160)}"></label>
    <label>Okruh polohy pri nakládke (km)<input data-tpc="r_km" type="number" value="${E(C.r_km||25)}"></label></div>
   ${!(C.tel||C.tel_staff)?`<div class="tpwarn">⚠️ Doplň svoj telefón – obchodníci ťa majú volať alebo ti písať, keď chcú predať.</div>`:""}
   ${D.list.map(adRow).join("")||`<div class="s">Zatiaľ žiadna firma.</div>`}
   <div class="tpadd"><select data-tpaddsel><option value="">➕ Pridať firmu z dodávateľov…</option>${F.map(f=>`<option value="${E(f.id)}">${E(f.name)}</option>`).join("")}</select></div>
   ${AD.msg?`<div class="s">${E(AD.msg)}</div>`:""}`}
function adPaint(){const m=document.getElementById("tpAdm");if(!m)return;const b=m.querySelector(".tpadb");if(b){const st=b.scrollTop;b.innerHTML=adHTML();b.scrollTop=st}}
window.traderAdmin=function(){if(!MAIN())return;css();let m=document.getElementById("tpAdm");if(!m){m=document.createElement("div");m.id="tpAdm";m.className="tpmod";document.body.appendChild(m)}
  m.innerHTML=`<div class="tpbox" role="dialog" aria-modal="true" aria-label="Portály obchodníkov"><div class="tphd"><b>🤝 Portály obchodníkov</b><button type="button" data-tpadx aria-label="Zavrieť">✕</button></div><div class="tpadb">${adHTML()}</div></div>`;
  document.documentElement.classList.add("zlock");adLoad()};
async function adSet(fid,p,msg){const r=await sb.rpc("trader_set",{p_farmer:fid,p});if(r.error){if(typeof toast==="function")toast("⚠️ "+r.error.message,6000);return false}if(msg&&typeof toast==="function")toast(msg,3000);await adLoad();return true}
function parseLL(s){s=String(s||"");let m=s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)||s.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)[ ,]+(-?\d+\.\d+)/)||s.match(/(-?\d{1,2}\.\d{3,})\s*[,; ]\s*(-?\d{1,3}\.\d{3,})/);return m?[+m[1],+m[2]]:null}
/* farba z loga: najčastejší sýty odtieň (bez bielej, čiernej a priehľadných bodov) */
function logoColors(img){try{const c=document.createElement("canvas"),w=c.width=48,h=c.height=Math.max(8,Math.round(48*img.height/img.width||48));const x=c.getContext("2d");x.drawImage(img,0,0,w,h);const D=x.getImageData(0,0,w,h).data,B={};
  for(let i=0;i<D.length;i+=4){const r=D[i],g=D[i+1],b=D[i+2],a=D[i+3];if(a<200)continue;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx<40||mn>215||mx-mn<40)continue;const k=(r>>5)+","+(g>>5)+","+(b>>5);(B[k]=B[k]||{n:0,r:0,g:0,b:0});B[k].n++;B[k].r+=r;B[k].g+=g;B[k].b+=b}
  const S=Object.values(B).sort((a,b)=>b.n-a.n).map(o=>"#"+[o.r/o.n,o.g/o.n,o.b/o.n].map(v=>Math.round(v).toString(16).padStart(2,"0")).join(""));return S.slice(0,2)}catch(x){return []}}
async function logoUp(fid,file){if(!file)return;if(file.size>6e6){toast("Obrázok je príliš veľký.",4000);return}
  const url=await new Promise(ok=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.readAsDataURL(file)});
  const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url}).catch(()=>null);if(!img){toast("Obrázok sa nedá načítať.",4000);return}
  let out=url;if(!/svg/.test(file.type)||url.length>300000){const s=Math.min(1,480/img.width,200/img.height),c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));c.getContext("2d").drawImage(img,0,0,c.width,c.height);out=c.toDataURL("image/png");if(out.length>380000)out=c.toDataURL("image/webp",.85)}
  if(out.length>390000){toast("Logo je po zmenšení stále príliš veľké – skús PNG s menšou plochou.",6000);return}
  const col=logoColors(img),p={logo:out};const t=(AD.d.list||[]).find(x=>x.farmer_id===fid);if(t&&!t.c1&&col[0])p.c1=col[0];if(t&&!t.c2&&col[1])p.c2=col[1];
  await adSet(fid,p,"✓ Logo uložené"+(p.c1?" – farby som vzala z loga.":"."))}
document.addEventListener("click",async e=>{const m=document.getElementById("tpAdm");if(!m||!m.contains(e.target))return;const t=e.target;
  if(t===m||t.closest("[data-tpadx]")){m.remove();document.documentElement.classList.remove("zlock");return}
  const row=t.closest("[data-tpf]"),fid=row&&row.dataset.tpf,T0=fid&&(AD.d.list||[]).find(x=>x.farmer_id===fid);
  if(t.closest("[data-tpcopy]")){const u=t.closest("[data-tpcopy]").dataset.tpcopy;try{await navigator.clipboard.writeText(u);toast("📋 Odkaz skopírovaný – pošli ho firme spolu s pozvánkou.",4000)}catch(x){prompt("Skopíruj odkaz:",u)}return}
  if(!fid)return;
  if(t.closest("[data-tpnew]")){if(confirm("Vytvoriť nový kód? Starý odkaz prestane ukazovať farby firmy."))adSet(fid,{novy_kod:true},"✓ Nový odkaz pripravený.");return}
  if(t.closest("[data-tpdel]")){if(confirm(`Zrušiť portál pre ${T0?T0.name:"firmu"}? Firma uvidí bežnú aplikáciu dodávateľa.`)){const r=await sb.rpc("trader_del",{p_farmer:fid});if(r.error)toast("⚠️ "+r.error.message,6000);else{toast("✓ Portál zrušený.",3000);adLoad()}}return}
  if(t.closest("[data-tplogox]")){adSet(fid,{logo:""},"✓ Logo zmazané.");return}
  if(t.closest(".tplogo-in .tpbtn")&&!t.closest("[data-tplogox]")){const i=row.querySelector("[data-tplogo]");if(i&&t.tagName!=="INPUT")i.click();return}
  if(t.closest("[data-tpmx]")){const i=+t.closest("[data-tpmx]").dataset.tpmx,M=(T0.miesta||[]).slice();M.splice(i,1);adSet(fid,{miesta:M},"✓ Miesto zmazané.");return}
  if(t.closest("[data-tpmadd]")){const s=prompt("Vlož súradnice výdajného miesta (napr. 48.6507, 21.9915) alebo odkaz z Google Máp:","");if(s==null)return;const ll=parseLL(s);if(!ll){toast("Súradnice sa nedajú prečítať.",5000);return}
    const n=prompt("Názov miesta (napr. Sklad Michalovce):","")||"";const M=(T0.miesta||[]).concat([{n:n.slice(0,60),lat:+ll[0].toFixed(6),lon:+ll[1].toFixed(6)}]);adSet(fid,{miesta:M},"✓ Miesto pridané.");return}},true);
document.addEventListener("change",async e=>{const m=document.getElementById("tpAdm");if(!m||!m.contains(e.target))return;const t=e.target;
  if(t.dataset.tpaddsel!==undefined&&t.value){const ok=await adSet(t.value,{on:true},"✓ Firma pridaná – nastav farby, logo a km.");return}
  if(t.dataset.tpc){const r=await sb.rpc("trader_cfg_set",{p:{[t.dataset.tpc]:t.value}});if(r.error)toast("⚠️ "+r.error.message,6000);else{toast("✓ Uložené.",2000);adLoad()}return}
  const row=t.closest("[data-tpf]");if(!row)return;const fid=row.dataset.tpf;
  if(t.dataset.tplogo!==undefined){logoUp(fid,t.files&&t.files[0]);return}
  const k=t.dataset.tpk;if(!k)return;const v=t.type==="checkbox"?t.checked:t.value;adSet(fid,{[k]:v},"✓ Uložené.")},true);
/* dlaždica vo Farmároch (iba Martin) */
function adTile(){if(!MAIN()||typeof TAB==="undefined"||TAB!=="farm")return;const A=document.getElementById("app");if(!A||A.querySelector(".tpadt"))return;
  const anc=A.querySelector("section.ehb")||A.querySelector("nav.tabs");if(!anc)return;css();
  anc.insertAdjacentHTML("afterend",`<button type="button" class="card tpadt" data-tpadm><span aria-hidden="true">🤝</span><span><b>Portály obchodníkov</b><small>obchodné firmy – ich farby, logo, odkaz na prihlásenie, doplatok k doprave</small></span><i aria-hidden="true">›</i></button>`)}
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-tpadm]")){e.preventDefault();traderAdmin()}});
function wrapRS(){const o=window.renderStaff;if(typeof o!=="function"||o.__tpadm)return;const w=function(){const r=o.apply(this,arguments);try{(window.ernteSoon||requestAnimationFrame)(adTile)}catch(x){}return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__tpadm=1;window.renderStaff=w}
setInterval(wrapRS,1500);wrapRS();

/* ---------- vzhľad ---------- */
function css(){if(document.getElementById("tp-css"))return;const s=document.createElement("style");s.id="tp-css";s.textContent=`
html.tpb{--tc1:#1d4ed8;--tc2:#22c55e}
.tplog .tplg,.tph{display:flex;align-items:center;gap:12px;min-width:0}
.tplog .tplg{justify-content:center;padding:14px 12px;margin:0 0 6px;border-radius:22px;background:linear-gradient(135deg,color-mix(in srgb,var(--tc1) 85%,#000),color-mix(in srgb,var(--tc2) 70%,#000));color:#fff;box-shadow:0 10px 30px color-mix(in srgb,var(--tc1) 35%,transparent)}
.tplg>div{display:grid;gap:2px;min-width:0}.tplg small{opacity:.85;font-size:.78rem}.tplg b{font-size:1.15rem;overflow-wrap:anywhere}
html.tpb .tplog .pri,html.trader .tpbtn.pri{background:linear-gradient(135deg,var(--tc1),var(--tc2))!important;color:#fff!important;border-color:transparent!important}
.tplogo{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:18px;background:#fff;padding:6px;box-sizing:border-box;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.tplogo img{max-width:100%;max-height:100%;object-fit:contain}
.tplogo.tpini{background:linear-gradient(135deg,var(--tc1),var(--tc2));color:#fff;font:800 1.35rem/1 var(--f-ui,system-ui);letter-spacing:.02em}
.hero.tph{flex-wrap:wrap;text-align:left;justify-content:flex-start;background:linear-gradient(135deg,color-mix(in srgb,var(--tc1) 80%,#06090f),color-mix(in srgb,var(--tc2) 55%,#06090f))!important;color:#fff;border:1px solid rgba(255,255,255,.18)}
.tpht{flex:1 1 160px;display:grid;gap:2px;min-width:0}.tpht small{opacity:.85;font-size:.76rem;overflow-wrap:anywhere}.tpht b{font-size:clamp(1.15rem,5vw,1.5rem);line-height:1.2;overflow-wrap:anywhere}
.tplang{display:flex;gap:6px;flex:0 0 auto;margin-left:auto}.tplang button{min-height:40px;min-width:62px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.18);color:#fff;font:700 .85rem var(--f-ui,system-ui)}
.tplang button.on{background:#fff;color:#0b1220;border-color:#fff}
.tpg{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-top:12px}@media(min-width:760px){.tpg{grid-template-columns:1fr 1fr;align-items:start}.tptrc{grid-column:1/-1}}
.tpc{display:grid;gap:8px;min-width:0;border-top:3px solid var(--tc1)}.tpc h3{margin:0;font-size:1.05rem}.tpc p{margin:0;line-height:1.45;overflow-wrap:anywhere}
.tps{opacity:.7;font-size:.78rem;overflow-wrap:anywhere}
.tpwho{overflow-wrap:anywhere}.tpwho a{color:inherit;font-weight:700}
.tpbtns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tpbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 16px;border-radius:14px;border:1px solid var(--line,rgba(255,255,255,.18));background:rgba(255,255,255,.06);color:inherit;font:700 .92rem var(--f-ui,system-ui);text-decoration:none;cursor:pointer;flex:0 1 auto;white-space:nowrap}
.tpsell .tpbtn{flex:1 1 120px}.tpbtn.wa{background:#25d366;color:#05210f;border-color:transparent}
.tprow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line,rgba(255,255,255,.08))}
.tprow:first-of-type{border-top:0}.tprow>span:not(.cimg){font-weight:700;overflow-wrap:anywhere}.tprow>b{white-space:nowrap;font-size:1.08rem}.tprow small{font-weight:600;opacity:.7}
.tprow .cimg{width:38px;height:38px}.tprow .cimg img{width:38px;height:38px;border-radius:10px;object-fit:cover}
.tpnote{font-size:.82rem;line-height:1.45;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--tc1) 14%,transparent);overflow-wrap:anywhere}
.tpbzr{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line,rgba(255,255,255,.08))}
.tpbzn{display:grid;min-width:0}.tpbzn b{overflow-wrap:anywhere}.tpbzn small{opacity:.65;font-size:.75rem}
.tpbzg{color:#9ca3af}.tpbzg.up{color:#4ade80}.tpbzg.dn{color:#f87171}.tpsp{display:block}
.tpbzv{white-space:nowrap;text-align:right;display:grid}.tpbzv small{font-weight:600;opacity:.7}.tpbzv em{font-style:normal;font-size:.75rem}.tpbzv em.up{color:#4ade80}.tpbzv em.dn{color:#f87171}
@media(max-width:360px){.tpbzg{display:none}.tpbzr{grid-template-columns:minmax(0,1fr) auto}}
.tpmap{height:240px;border-radius:16px;overflow:hidden;border:1px solid var(--line,rgba(255,255,255,.12))}
.tpmk{display:flex!important;align-items:center;gap:4px;background:none;border:0}.tpmk span{font-size:22px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.tpmk b{font:800 11px/1 system-ui;background:var(--tc1);color:#fff;padding:3px 6px;border-radius:8px;white-space:nowrap}
.tptr{display:grid;gap:6px;padding:10px 0;border-top:1px solid var(--line,rgba(255,255,255,.08))}.tptr.tplive .tptrh b::before{content:"● ";color:#4ade80}
.tptrh{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}.tptrh b{overflow-wrap:anywhere}.tpspz{font-weight:700;opacity:.9}
.tpst{margin-left:auto;font-size:.76rem;font-weight:800;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08);white-space:nowrap}
.tpst.s-na_ceste,.tpst.s-nakladka{background:color-mix(in srgb,var(--tc2) 30%,transparent)}.tpst.s-vylozene{opacity:.7}
.tpgps{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.84rem;align-items:center}.tpgps a{font-weight:700;color:inherit}
.tphide{font-size:.84rem;opacity:.85;line-height:1.4;overflow-wrap:anywhere}
.tpboard{display:grid;gap:4px;padding:12px;border-radius:14px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 10px,rgba(255,255,255,.08) 10px 20px);border:1px dashed rgba(255,255,255,.3);text-align:center}
.tpboard b{font-size:1rem}.tpboard span{font-size:.8rem;opacity:.85;line-height:1.4;overflow-wrap:anywhere}
.tpfoot{text-align:center;font-size:.76rem;opacity:.6;margin:14px 0 4px}
.tpback{display:flex;align-items:center;gap:10px}.tpback b{min-width:0;overflow-wrap:anywhere}
.tpadt{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;text-align:left;cursor:pointer;margin:10px 0;min-height:64px}
.tpadt>span:first-child{font-size:1.6rem}.tpadt>span:nth-child(2){display:grid;gap:2px;min-width:0}.tpadt small{opacity:.7;overflow-wrap:anywhere}.tpadt i{font-style:normal;opacity:.6;font-size:1.3rem}
.tpmod{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:stretch;justify-content:center}
@media(min-width:760px){.tpmod{align-items:center;padding:16px}}
.tpbox{width:min(820px,100%);max-height:100%;display:flex;flex-direction:column;background:linear-gradient(160deg,rgba(28,34,46,.98),rgba(12,16,24,.99));color:#eef2f7;border:1px solid rgba(255,255,255,.14);box-sizing:border-box}
@media(min-width:760px){.tpbox{border-radius:24px;max-height:94vh}}
.tphd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(12px + env(safe-area-inset-top,0px)) 14px 8px 16px}.tphd b{font-size:1.05rem;min-width:0}
.tphd button{flex:0 0 auto;width:44px;height:44px;border-radius:50%;padding:0;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font:700 1.05rem/1 system-ui}
.tpadb{overflow:auto;padding:4px 14px calc(18px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-content:start;-webkit-overflow-scrolling:touch}
.tpad{display:grid;gap:10px;padding:12px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-top:3px solid var(--tc1);min-width:0}
.tpadh{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tpadh b{flex:1 1 120px;min-width:0;overflow-wrap:anywhere}.tpadh .tplogo{width:48px;height:48px;border-radius:14px}
.tpsw{display:inline-flex;align-items:center;gap:6px;font-size:.85rem;min-height:40px}
.tpadg{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.tpadg label{display:grid;gap:4px;font-size:.8rem;min-width:0}
.tpadg input,.tpadg select{min-height:44px;box-sizing:border-box;width:100%}.tpadg input[type=color]{padding:2px;height:44px}
.tpadn{font-size:.82rem;line-height:1.5;overflow-wrap:anywhere;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.tpchip{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 10px;border-radius:999px;background:rgba(255,255,255,.08)}.tpchip button{width:32px;height:32px;border-radius:50%;padding:0;border:0;background:rgba(255,255,255,.1);color:inherit}
.tplink{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.tplink code{flex:1 1 220px;min-width:0;overflow-wrap:anywhere;font-size:.78rem;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.3)}
.tpwarn{font-size:.82rem;line-height:1.45;padding:8px 10px;border-radius:12px;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.35);overflow-wrap:anywhere}
.tpad .tpbtn,.tpsell .tpbtn,.tpdocs .tpbtn{white-space:normal;text-align:center}
.tpadd select,.tpadg select{min-height:44px;width:100%;max-width:100%;min-width:0;text-overflow:ellipsis}
`;document.head.appendChild(s)}
})();
