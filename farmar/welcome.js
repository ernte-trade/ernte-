// ===== 🌾 ÚVODNÁ OBRAZOVKA PO PRIHLÁSENÍ – animovaná scéna podľa toho, kto sa prihlásil =====
// Majiteľ (Martin): osobný pozdrav, dnešné čísla, najbližšie stretnutie z kalendára, zaujímavosť dňa.
// CEO, farmár, doprava, obchod, kurací trus, evidencia: vlastná scéna (kombajn, traktor, kamióny VALKO, silá, hydina, šanóny).
// Ukáže sa vždy po prihlásení / otvorení aplikácie a po návrate do aplikácie (na pozadí aspoň 30 s; nie počas rozpísaného formulára).
// „Poďme na to →“ vždy otvorí pridelené sekcie (Prehľad, inak prvá záložka používateľa).
// Iba vzhľad – nič neukladá, žiadne údaje navyše (čísla sú tie, ktoré používateľ aj tak vidí).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>new Date().toLocaleDateString("sv-SE");
const sGet=k=>{try{return sessionStorage.getItem(k)}catch(x){return null}},sSet=(k,v)=>{try{sessionStorage.setItem(k,v)}catch(x){}};
const lGet=k=>{try{return localStorage.getItem(k)}catch(x){return null}},lSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(x){}};
const can_=k=>typeof can==="function"&&can(k);
function kind(){if(typeof FARMER!=="undefined"&&FARMER)return "farmar";if(window.ERNTE_KIND==="trus")return "trus";
  if(typeof ROLE==="undefined"||!ROLE)return null;
  if(ROLE==="owner")return (window.MAIN_OK&&MAIN_OK())?"ja":"ceo";
  if(ROLE==="dispatch"||can_("fleet")||can_("assign"))return "doprava";
  if(can_("trus")&&!can_("price_edit")&&!can_("price_view"))return "trus";
  if(can_("deals")||can_("price_edit"))return "obchod";
  if(can_("trus"))return "trus";if(can_("ev_mzdy"))return "mzdy";if(can_("ev"))return "evid";return "tim"}
function phase(){const h=window.__wlh!=null?window.__wlh:new Date().getHours();return h<5||h>=21?"noc":h<8?"rano":h<18?"den":"vecer"}
const GREET={noc:(window.__wlh!=null?window.__wlh:new Date().getHours())<5?"Pekná noc":"Dobrý večer",rano:"Dobré ráno",den:"Dobrý deň",vecer:"Dobrý večer"};
const firstName=n=>{const p=String(n||"").replace(/^(Ing\.|Bc\.|Mgr\.|Shr\.|🧪)\s*/g,"").trim().split(/\s+/);return p[0]||""};
const JOKES=["Kombajny sú natankované, burza nespí – a ty už tiež nie. 💪","Šéf, dnes to zase pôjde rýchlo. Ako vždy.","Repka nečaká, VALKO nestojí, ERNTE beží.","Kto skoro ráno vstáva, tomu sa tony ukladajú.","Káva hotová? Lebo aplikácia už áno. ☕","Dnešný plán: kúpiť lacno, odviezť rýchlo, zaplatiť načas.","Traktor má 300 koní. Ty máš celú firmu.","Počasie sa mení, ceny sa menia – šéf ostáva. 😎","Každá tona sa počíta. Aj tá, čo ešte rastie.","Obilie do sila, peniaze na účet, šéf na kávu."];
/* 💡 Vedeli ste? – zaujímavosti pre dospelých (poľnohospodárstvo, obchod, technika, svet); na jednom zariadení sa nezopakujú, kým neprejdú všetky */
const KE=["Z tony repky sa vylisuje zhruba 400 kg oleja – zvyšok je šrot, ktorý zjedia kravy a ošípané.", "Z tony sóje je len asi 190 kg oleja, ale takmer 800 kg šrotu. Sója je v skutočnosti hlavne krmivo.", "Sója má okolo 36–40 % bielkovín – preto ju svet kupuje viac na kŕmenie zvierat než na olej.", "Pšenica sa pestuje na väčšej ploche ako ktorákoľvek iná plodina na svete.", "Najväčší vývozca pšenice na svete je dnes Rusko.", "USA dopestujú zhruba tretinu všetkej kukurice na svete.", "Ukrajina je najväčší vývozca slnečnicového oleja na svete.", "Rumunsko je najväčší pestovateľ slnečnice v Európskej únii.", "Slnečnica sa točí za slnkom len ako mladá rastlina. Keď kvitne, zostane natrvalo otočená na východ.", "Repka je tretí najväčší zdroj rastlinného oleja na svete – hneď po palmovom a sójovom.", "Kukurica sa bez človeka nerozmnoží – jej klas zrná sám neodhodí. Je to čisto ľudský vynález.", "Kukuricu vyšľachtili v Mexiku pred asi 9 000 rokmi z nenápadnej divej trávy teosinte.", "Prvú pšenicu ľudia pestovali asi pred 10 000 rokmi na Blízkom východe.", "Chicagská obilná burza (CBOT) vznikla v roku 1848 – je staršia ako telefón.", "Jeden bušel sóje váži 27,2 kg. Preto sa cena CBOT na €/t prepočítava číslom 36,74.", "Šachovnica: dajte na prvé políčko 1 zrnko pšenice a na každé ďalšie dvojnásobok. Na poslednom by bolo viac pšenice, ako ľudstvo dopestovalo za celé dejiny.", "Slovo pecunia (peniaze) pochádza z latinského pecus – dobytok. Kedysi sa platilo zvieratami.", "Keby ste minuli 1 000 € denne, milión by vám vydržal necelé 3 roky. Miliarda vyše 2 700 rokov.", "Pravidlo 72: vydeľte 72 úrokom a viete, za koľko rokov sa peniaze zdvojnásobia. Pri 6 % je to 12 rokov.", "Dážď 10 mm znamená 10 litrov vody na každý meter štvorcový – na jednom hektári je to 100 ton vody.", "V hrsti zdravej pôdy žije viac mikroorganizmov, ako je ľudí na Zemi.", "Päťdňová predpoveď počasia je dnes taká presná ako jednodňová v roku 1980.", "Prvý traktor s benzínovým motorom postavil John Froelich v roku 1892.", "Ferruccio Lamborghini najprv vyrábal traktory – luxusné autá začal robiť až potom.", "Aj Porsche vyrábalo traktory – červené Porsche-Diesel jazdia po poliach dodnes.", "Najrýchlejší traktor sveta, upravený JCB Fastrac, dosiahol rýchlosť vyše 240 km/h.", "Rudolf Diesel predviedol svoj motor na svetovej výstave v Paríži v roku 1900 – bežal na arašidový olej.", "Pneumatiky veľkých traktorov majú často tlak len okolo 1 baru – menej ako bicykel. Šetria tak pôdu.", "Najvýkonnejšie kombajny zvládnu pozberať okolo 100 ton pšenice za hodinu.", "Bratislava je jediné hlavné mesto na svete, ktoré hraničí s dvoma inými štátmi.", "Dunaj preteká desiatimi krajinami – viac ako ktorákoľvek iná rieka na svete.", "Rotterdam je najväčší prístav v Európe.", "Tokajská vinárska oblasť nie je len v Maďarsku – kúsok z nej leží aj na Slovensku, pri Malej Tŕni a Viničkách.", "Zemplínska šírava má rozlohu asi 33 km² – je to druhá najväčšia vodná nádrž na Slovensku.", "Na Slovensku je evidovaných vyše 6 000 jaskýň.", "Na pol litra piva treba zhruba 100 g sladu zo sladovníckeho jačmeňa.", "Sumeri varili pivo už pred vyše 5 000 rokmi a robotníci pri egyptských pyramídach dostávali časť mzdy v pive.", "Na 1 kg šafranu treba asi 150 000 kvetov šafranu – preto je to najdrahšie korenie sveta.", "Popcorn vystrelí, keď sa voda v zrnku pri asi 180 °C zmení na paru a roztrhne škrupinu.", "Kváskový chlieb vydrží dlhšie – kyselina mliečna z kvásku brzdí plesne.", "Slepica na farme znesie okolo 300 vajec ročne. Jej divá predkyňa len zhruba tucet.", "Krava strávi prežúvaním približne 8 hodín denne.", "Kôň vie spať postojačky – kolená si v kĺboch „zamkne“, aby nespadol.", "Svetlo zo Slnka k nám letí asi 8 minút.", "Mesiac sa od Zeme každý rok vzďaľuje asi o 3,8 cm.", "Mozog váži asi 2 % tela, ale spotrebuje okolo 20 % jeho energie.", "Mobil vo vrecku je státisíckrát výkonnejší ako počítač, ktorý doviedol Apollo 11 na Mesiac.", "Z jedného hektára repky je olej na približne 1 300 litrov bionafty."];
const JKEY="ernte-facts-seen";
function pickJoke(){let seen=[];try{seen=JSON.parse(localStorage.getItem(JKEY)||"[]")||[]}catch(x){}
  let free=KE.map((_,i)=>i).filter(i=>!seen.includes(i));if(!free.length){seen=[];free=KE.map((_,i)=>i)}
  const i=free[Math.floor(Math.random()*free.length)];seen.push(i);try{localStorage.setItem(JKEY,JSON.stringify(seen))}catch(x){}return KE[i]}
const FUN={
 ja:JOKES,
 ceo:["Šéfka, káva je pripravená, čísla tiež. ☕📊","Faktúry odídu samy – skoro. 😉","Kto riadi firmu, ten riadi aj ráno.","Dnes žiadne prekvapenia. Iba tie príjemné.","Usmievaj sa – zúčtovanie sedí. 😄"],
 farmar:["Prečo je kombajn vždy v dobrej nálade? Lebo má všetko pokosené. 😄","Dážď na poli, slnko v duši, cena v aplikácii. ☀️","Najlepšie hnojivo je farmárov krok – a dobrá cena od ERNTE.","Traktor nepotrebuje kávu. Farmár áno. ☕","Repka kvitne, peniaze klíčia. 🌱"],
 doprava:["Kamión VALKO – jediné, čo ide rýchlejšie, sú klebety v dedine. 🚛😄","Vodiči, dnes zelená vlna od Michaloviec až po prístav! 🟢","GPS hovorí „odbočte vpravo“. Gabo hovorí „ja viem lepšie“. 😎","Plná nádrž, prázdna cesta, šťastný dispečer.","Kto má najviac koní? VALKO – 450 pod každou kapotou. 🐎"],
 obchod:["Najlepší obchod? Ten, čo sa uzavrie pred obedom. 🤝","Burza hore, burza dole – obchodník vždy na nohách.","Farmár volá? Usmej sa, cez telefón to počuť. 📞😊","Dnes predáme aj zrno, ktoré ešte nerastie. 😄","Káva, cenník, telefón – svätá trojica obchodníka. ☕"],
 trus:["Sliepky robia svoju prácu. My robíme tú našu. 🐔","Čo je zlato farmára? Tento trus – a dobrá doprava. 💛","Kikiríkí! Auto je na ceste. 🚛","Aj sliepka by vedela, že VALKO príde načas. 🐓","Dobrý vývoz začína ranným kikiríkí. 🌅"],
 evid:["Šanón v poriadku, šéf v pohode. 📒","Papier znesie všetko – aplikácia aj viac. 😄","Každý doklad na svojom mieste – ako v lekárni. 💊","Dnes ani jedna chýbajúca pečiatka! 🔖","Poriadok je polovica úspechu. Druhá polovica je káva. ☕"],
 tim:["Tímová práca: ty klikneš, aplikácia urobí zvyšok. 😄","Dnes to dáme! 💪","Úsmev je zadarmo – aj v ERNTE. 😊"]};
const ROLE_TXT={
 ceo:["manažérka · CEO","Celá firma pod kontrolou – obchody, doprava, zúčtovanie aj tím."],
 farmar:["dodávateľ ERNTE","Pozrite si dnešné výkupné ceny – predaj je na jedno ťuknutie."],
 doprava:["doprava VALKO","Autá, jazdy a odvozy na jednom mieste. Šťastnú cestu všetkým vodičom!"],
 obchod:["obchod ERNTE","Nový obchod uzavrieš za minútu – odfotíš, povieš alebo vyplníš."],
 trus:["kurací trus","Vývozy, autá a váženie – každý krok na jednom mieste."],
 evid:["evidencia","Doklady, zmluvy a zúčtovanie – všetko pekne v poriadku."],
 mzdy:["mzdy ERNTE","Výplaty, odvody a výplatné pásky – presne podľa zákona."],
 tim:["tím ERNTE","Všetko, čo potrebuješ, je na pár ťuknutí."]};

/* ---------- SVG scéna ---------- */
function sky(ph){const g={noc:["#050816","#1e2a71"],rano:["#fb923c","#7dd3fc"],den:["#38bdf8","#e0f2fe"],vecer:["#f97316","#4c1d95"]}[ph];
  let s=`<defs><linearGradient id="wsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[0]}"/></linearGradient>
  <linearGradient id="wfd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#facc15"/><stop offset="1" stop-color="#ca8a04"/></linearGradient>
  <linearGradient id="wst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9c27a"/><stop offset="1" stop-color="#a78b3c"/></linearGradient></defs>
  <rect width="400" height="220" fill="url(#wsk)"/>`;
  if(ph==="noc"){s+=`<g class="wstars">${Array.from({length:34},(_,i)=>`<circle cx="${(i*53)%400}" cy="${(i*37)%110}" r="${i%4?0.8:1.4}" fill="#fff" style="animation-delay:${(i%7)*.4}s"/>`).join("")}</g><circle cx="330" cy="40" r="16" fill="#f8fafc"/><circle cx="337" cy="35" r="14" fill="#1e2a71"/>`}
  else s+=`<circle class="wsun" cx="${ph==="rano"?70:ph==="vecer"?330:300}" cy="${ph==="den"?40:78}" r="20" fill="${ph==="den"?"#fde047":"#fdba74"}"/>`;
  s+=`<g class="wcl" opacity="${ph==="noc"?.25:.85}"><ellipse cx="60" cy="40" rx="26" ry="8" fill="#fff"/><ellipse cx="78" cy="36" rx="16" ry="8" fill="#fff"/><ellipse cx="230" cy="58" rx="30" ry="8" fill="#fff"/><ellipse cx="250" cy="54" rx="16" ry="7" fill="#fff"/></g>
  <path d="M0 130 Q60 100 130 118 T260 112 T400 120 V220 H0Z" fill="${ph==="noc"?"#14301a":"#4d7c0f"}"/>
  <path d="M0 145 Q90 125 200 140 T400 138 V220 H0Z" fill="${ph==="noc"?"#1c3a12":"#65a30d"}"/>`;
  return s}
const wheel=(x,y,r)=>`<g transform="translate(${x} ${y})"><g class="wsp"><circle r="${r}" fill="#1f2937"/><circle r="${r*.45}" fill="#9ca3af"/><rect x="${-r*.1}" y="${-r*.9}" width="${r*.2}" height="${r*1.8}" fill="#4b5563"/><rect y="${-r*.1}" x="${-r*.9}" height="${r*.2}" width="${r*1.8}" fill="#4b5563"/></g></g>`;
function combine(){return `<g class="wcomb"><g class="wdust"><circle cx="-8" cy="28" r="6" fill="#e7d39a"/><circle cx="-18" cy="22" r="8" fill="#e7d39a"/><circle cx="-30" cy="26" r="7" fill="#e7d39a"/></g>
  <rect x="0" y="0" width="56" height="24" rx="4" fill="#3f8a2b"/><rect x="34" y="-14" width="20" height="16" rx="3" fill="#3f8a2b"/><rect x="37" y="-11" width="14" height="10" rx="2" fill="#bae6fd"/>
  <rect x="4" y="-10" width="26" height="12" rx="2" fill="#2f6b20"/><rect x="-14" y="-16" width="26" height="4" rx="2" fill="#2f6b20" transform="rotate(-12)"/>
  <rect x="56" y="14" width="22" height="10" fill="#facc15"/><g transform="translate(70 12)"><g class="wsp"><circle r="9" fill="none" stroke="#b91c1c" stroke-width="2"/><line x1="-9" y1="0" x2="9" y2="0" stroke="#b91c1c" stroke-width="2"/><line x1="0" y1="-9" x2="0" y2="9" stroke="#b91c1c" stroke-width="2"/></g></g>
  ${wheel(14,26,9)}${wheel(44,28,7)}<text x="8" y="14" font-size="7" font-weight="700" fill="#fff" font-family="sans-serif">ERNTE</text></g>`}
function tractor(){return `<g class="wtrac"><rect x="-46" y="4" width="40" height="18" rx="3" fill="#e5e7eb"/><rect x="-44" y="0" width="36" height="6" fill="#facc15"/>${wheel(-36,24,5)}${wheel(-16,24,5)}
  <rect x="0" y="6" width="26" height="14" rx="3" fill="#b91c1c"/><rect x="14" y="-6" width="12" height="14" rx="2" fill="#b91c1c"/><rect x="16" y="-4" width="8" height="8" fill="#bae6fd"/><rect x="4" y="0" width="3" height="8" fill="#374151"/>${wheel(20,20,8)}${wheel(4,22,5)}</g>`}
function truck(cls,lbl){return `<g class="${cls}"><rect x="0" y="0" width="70" height="26" rx="3" fill="#f8fafc"/><text x="8" y="17" font-size="10" font-weight="800" fill="#1e2a71" font-family="sans-serif">${lbl}</text>
  <rect x="72" y="6" width="22" height="20" rx="4" fill="#1e2a71"/><rect x="82" y="9" width="10" height="8" rx="1" fill="#bae6fd"/>${wheel(12,28,5)}${wheel(26,28,5)}${wheel(56,28,5)}${wheel(84,28,5)}</g>`}
const PHOTO={mzdy:"img/evid-uvod.jpg",trus:"img/trus-uvod.jpg",farmar:"img/farmar-uvod.jpg",ja:"img/ja-uvod-claas.jpg",ceo:"img/ceo-uvod.jpg",tim:"img/ceo-uvod.jpg",doprava:"img/doprava-uvod.jpg",obchod:"img/obchod-uvod.jpg",evid:"img/evid-uvod.jpg"};
const ALT={mzdy:"Klasy obilia pri východe slnka",trus:"Kurací trus – Bio-Fer NATUR",farmar:"Farmár na poli s klasmi",ja:"Pásový traktor CLAAS Xerion s diskovým podmietačom na strnisku",ceo:"Oceľové silá na obilie",tim:"Oceľové silá na obilie",doprava:"Kombajn sype obilie do nákladného auta",obchod:"Zrno sa sype do prívesu",evid:"Klasy obilia pri východe slnka"};
const CW="https://commons.wikimedia.org/wiki/File:";
const CREDIT={ja:["Dominik Klacik","",""],doprava:["USDA NRCS Montana","voľné dielo",CW+"Harvest_NR_08_(38143696164).jpg"],
  obchod:["USDA","voľné dielo",CW+"Harvest_(20200724-NRCS-LSC-0490).jpg"],ceo:["Leaflet","CC BY-SA 3.0",CW+"Ralls_Texas_Grain_Silos_2010.jpg"],
  evid:["Dietmar Rabich","CC BY-SA 4.0",CW+"D%C3%BClmen,_Kirchspiel,_Dernekamp,_Getreide_bei_Sonnenaufgang_--_2021_--_8855.jpg"]};CREDIT.tim=CREDIT.ceo;CREDIT.mzdy=CREDIT.evid;
function scene(k,ph,por){if(PHOTO[k]){const c=CREDIT[k];return `<div class="wimg${k==="ja"?" wja":""}" style="background-image:url(${PHOTO[k]})" role="img" aria-label="${E(ALT[k]||"")}"><i class="wgrid"></i><i class="wscan"></i><i class="wcrn"></i>${hud(k)}${c?(c[2]?`<a class="wcred" href="${c[2]}" target="_blank" rel="noopener">Foto: ${E(c[0])} · ${E(c[1])} · Wikimedia Commons</a>`:`<span class="wcred">Foto: ${E(c[0])}</span>`):""}</div>`}let s=`<svg class="wsvg" viewBox="${por?"105 20 190 200":"0 0 400 220"}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">`+sky(ph);
  const field=`<rect x="0" y="150" width="400" height="70" fill="url(#wfd)"/><rect class="wcut" x="0" y="150" width="400" height="70" fill="url(#wst)"/>${Array.from({length:12},(_,i)=>`<line x1="0" y1="${156+i*5.5}" x2="400" y2="${156+i*5.5}" stroke="#a16207" stroke-width=".5" opacity=".35"/>`).join("")}`;
  const road=`<rect x="0" y="182" width="400" height="38" fill="#374151"/><g class="wlane">${Array.from({length:14},(_,i)=>`<rect x="${i*32}" y="199" width="16" height="3" fill="#f8fafc"/>`).join("")}</g>`;
  if(k==="doprava"){s+=`<rect x="0" y="150" width="400" height="32" fill="url(#wfd)"/>`+road+`<g transform="translate(0 150)">${truck("wtk1","VALKO")}</g><g transform="translate(0 186)">${truck("wtk2","VALKO")}</g>`}
  else if(k==="obchod"||k==="ceo"&&false){s+=field+`<g transform="translate(300 92)"><rect x="0" y="10" width="22" height="58" fill="#cbd5e1"/><ellipse cx="11" cy="10" rx="11" ry="6" fill="#94a3b8"/><rect x="26" y="0" width="26" height="68" fill="#e2e8f0"/><ellipse cx="39" cy="0" rx="13" ry="7" fill="#94a3b8"/><text x="4" y="45" font-size="7" font-weight="800" fill="#3f6212" font-family="sans-serif">ERNTE</text></g><g transform="translate(0 156)">${combine()}</g>`}
  else if(k==="trus"){s+=`<rect x="0" y="150" width="400" height="32" fill="#65a30d"/>`+road+`<g transform="translate(250 100)"><path d="M0 30 L40 6 L80 30 V58 H0Z" fill="#b91c1c"/><rect x="30" y="34" width="20" height="24" fill="#7f1d1d"/><path d="M-4 31 L40 4 L84 31" stroke="#f8fafc" stroke-width="3" fill="none"/></g>
    ${[0,1,2,3,4].map(i=>`<g class="when" style="animation-delay:${i*.3}s" transform="translate(${150+i*18} 166)"><ellipse rx="6" ry="5" fill="#f8fafc"/><circle cx="5" cy="-5" r="3" fill="#f8fafc"/><path d="M6 -8 l2 -2 l1 2z" fill="#dc2626"/><path d="M8 -5 l3 1 l-3 1z" fill="#f59e0b"/></g>`).join("")}
    <g transform="translate(0 186)">${truck("wtk1","VALKO")}</g>`}
  else if(k==="evid"){s+=field+`<g transform="translate(250 100)"><rect x="0" y="0" width="90" height="56" rx="6" fill="#f8fafc" opacity=".92"/>${[0,1,2,3].map(i=>`<rect x="${10+i*20}" y="12" width="14" height="38" rx="2" fill="${["#3f6212","#1e2a71","#b45309","#7c3aed"][i]}"/>`).join("")}</g>
    ${[0,1,2].map(i=>`<g class="wdoc" style="animation-delay:${i*1.2}s"><rect x="60" y="40" width="18" height="24" rx="2" fill="#fff" stroke="#cbd5e1"/><line x1="64" y1="48" x2="74" y2="48" stroke="#94a3b8"/><line x1="64" y1="53" x2="74" y2="53" stroke="#94a3b8"/></g>`).join("")}<g transform="translate(0 156)">${combine()}</g>`}
  else{s+=field+`<g transform="translate(0 154)">${combine()}</g>`+(k==="farmar"||k==="ja"||k==="ceo"?`<g transform="translate(0 112)">${tractor()}</g>`:"")+(k==="ja"||k==="ceo"?`<rect x="0" y="198" width="400" height="22" fill="#374151"/><g transform="translate(0 194) scale(.7)">${truck("wtk2","VALKO")}</g>`:"")}
  return s+`</svg>`}


/* ---------- ultra moderný HUD cez fotku: živé hodiny, počasie s grafom, čísla a grafy podľa role ---------- */
const KT={ja:["Vyvezené","Jazdy · 7 dní"],ceo:["Vyvezené","Jazdy · 7 dní"],tim:["Vyvezené","Jazdy · 7 dní"],doprava:["Jazdy dnes","Jazdy · 7 dní"],
  obchod:["Vyvezené","Požiadavky"],evid:["Tento mesiac",""],mzdy:["Tento mesiac",""],farmar:["Výkupné ceny",""],trus:["Požiadavky",""]};
function hud(k){return `<div class="whud"><div class="whtop"><span class="wlive"><i></i>LIVE</span><span class="wclk">--:--<small>:--</small></span></div>
  <div class="whrow"><div class="whc whwx"><small>Počasie</small><div class="whv"><span class="wxi">…</span><b class="wxt">--°</b></div><div class="wxs">načítavam</div><svg class="wspk" viewBox="0 0 120 34" preserveAspectRatio="none"></svg></div>
  <div class="whc whk"><small>${E((KT[k]||KT.tim)[0])}</small><div class="whkb"></div><small class="whk2">${E((KT[k]||KT.tim)[1])}</small><div class="whbars"></div></div></div>${k==="ja"||k==="ceo"||k==="obchod"&&(can_("price_view")||can_("price_edit"))?`<div class="whc whpr"><small>Naše nákupné ceny · €/t</small><div class="whpl"></div></div>`:""}${k==="obchod"?obPanel():GRK(k)?`<div class="whc whgr"><div class="wgrh"><small>📈 Vývoj našich nákupných cien</small><span class="wgrv"></span></div><div class="wgrc"></div><div class="wgrs"></div></div>${DIA(k)}`:spotOK(k)?(radioOff()?radioOnHTML():spot()):""}</div>`}
/* na širokej obrazovke sa „live“ fotka roztiahne nižšie, aby sa zmestili všetky dlaždice (dá sa posúvať) */
function wfit(el){try{const im=el.querySelector(".wimg"),hd=el.querySelector(".whud");if(!im||!hd||el.classList.contains("por"))return;const need=hd.offsetTop+hd.offsetHeight+48;im.style.minHeight=need>innerHeight?need+"px":""}catch(x){}}
/* 💎 diamantové dlaždice (príkaz majiteľa 30. 10.) – iba Martin a Jana: ⛽ nafta MOL Group + navigácia, 🤝 graf obchodov */
const DIA=k=>GRK(k)?`<div class="whc wdia wfuel"><i class="wdsh"></i><div class="wgrh"><small>⛽ Nafta · Slovnaft / MOL Group</small><span class="wfv"></span></div><div class="wfc"></div><div class="wfl"></div>
  <div class="wfnav"><a class="wfbtn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=Slovnaft%20%C4%8Derpacia%20stanica">🧭 Najbližší Slovnaft</a><a class="wfbtn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=MOL%20benzinkut">🧭 Najbližší MOL</a><a class="wfbtn wfnear" data-wfnear target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=%C4%8Derpacia%20stanica">📍 Najbližšia čerpacia stanica</a></div><div class="wfsrc"></div></div>
  <div class="whc wdia wdeal"><i class="wdsh"></i><div class="wgrh"><small>🤝 Obchody · nákup od farmárov</small><span class="wdv"></span></div><div class="wdc"></div><div class="wdk"></div></div>`:"";
const FCN={SK:"🇸🇰 Slovensko",HU:"🇭🇺 Maďarsko",CZ:"🇨🇿 Česko",AT:"🇦🇹 Rakúsko",SI:"🇸🇮 Slovinsko",HR:"🇭🇷 Chorvátsko",RO:"🇷🇴 Rumunsko",PL:"🇵🇱 Poľsko"};
const glowDefs=(id,col)=>`<defs><linearGradient id="${id}A" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".42"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient><filter id="${id}G" filterUnits="userSpaceOnUse" x="-20" y="-20" width="400" height="160"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
function lineSvg(id,series,W,Hh,fmt){fmt=fmt||(v=>v.toFixed(3).replace(".",","));/* series: [{pts:[[t,v]],col,area}] */const all=series.flatMap(x=>x.pts);if(all.length<2)return "";
  const t0=Math.min(...all.map(p=>p[0])),t1=Math.max(...all.map(p=>p[0])),vs=all.map(p=>p[1]),mn=Math.min(...vs),mx=Math.max(...vs),pad=(mx-mn)*.18||.02;
  const X=t=>((t-t0)/Math.max(1,t1-t0))*W,Y=v=>Hh-6-((v-(mn-pad))/((mx+pad)-(mn-pad)))*(Hh-14);let h="";
  series.forEach((S,i)=>{const d=S.pts.map((p,j)=>(j?"L":"M")+X(p[0]).toFixed(1)+","+Y(p[1]).toFixed(1)).join(" ");const l=S.pts[S.pts.length-1];
    h+=glowDefs(id+i,S.col)+(S.area?`<path d="${d} L${X(l[0]).toFixed(1)},${Hh} L${X(S.pts[0][0]).toFixed(1)},${Hh} Z" fill="url(#${id}${i}A)"/>`:"")+`<path d="${d}" fill="none" stroke="${S.col}" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke" filter="url(#${id}${i}G)" class="wgln"/><circle cx="${X(l[0]).toFixed(1)}" cy="${Y(l[1]).toFixed(1)}" r="3.6" fill="${S.col}" filter="url(#${id}${i}G)" class="wgdot"/>`});
  return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" class="wgsvg">${h}</svg><span class="wgmx">${fmt(mx)}</span><span class="wgmn">${fmt(mn)}</span>`}
async function fuelLive(hd,k){const box=hd.querySelector(".wfuel");if(!GRK(k)||!box)return;
  let F=null,M=null;try{const [a,b]=await Promise.all([fetch("https://raw.githubusercontent.com/ernte-trade/ernte-/fuel-data/fuel.json?u="+Math.floor(Date.now()/3e5),{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),fetch("market.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null)]);F=a;M=b}catch(x){}
  const C=(F&&F.c)||{},fu=(M&&M.fuel)||{},R=[];
  for(const c of Object.keys(FCN)){const v=C[c]||{};let p=null,src="";
    if(v.mol){p=v.mol.p;src=v.mol.b+" · "+v.mol.n+" staníc"}else if(c==="SK"&&fu.sk&&fu.sk.eurL){p=+fu.sk.eurL;src="priemer SR (EK)"}else if(c==="HU"&&fu.hu&&fu.hu.eurL){p=+fu.hu.eurL;src="priemer HU dnes ("+fu.hu.ftL+" Ft)"}
    else if(v.live){p=+v.live.p;src="priemer staníc dnes"}else if(v.w){p=+v.w.p;src="priemer krajiny (EK)"}
    if(p)R.push({c,p,src,mol:!!v.mol})}
  if(!R.length){box.querySelector(".wfc").innerHTML=`<span class="whu">Ceny nafty sa načítavajú…</span>`;return}
  const sk=R.find(x=>x.c==="SK"),hu=R.find(x=>x.c==="HU"),mn=Math.min(...R.map(x=>x.p)),mx=Math.max(...R.map(x=>x.p));
  const fv=box.querySelector(".wfv");if(fv&&sk)fv.innerHTML=`<b>${sk.p.toFixed(3).replace(".",",")} €/l</b><em>SK${hu?` · HU ${hu.p.toFixed(3).replace(".",",")}`:""}</em>`;
  const ser=[];const hs=(C.SK&&C.SK.h)||[],hh=(C.HU&&C.HU.h)||[];const T=d=>Date.parse(d+"T12:00:00");
  if(hs.length>1)ser.push({pts:hs.map(p=>[T(p[0]),+p[1]]),col:"#7dd3fc",area:true});if(hh.length>1)ser.push({pts:hh.map(p=>[T(p[0]),+p[1]]),col:"#f472b6"});
  box.querySelector(".wfc").innerHTML=ser.length?lineSvg("wf",ser,320,86)+`<span class="wgax">${hs.length?Math.round(hs.length)+" týždňov":""}</span><span class="wflg"><i style="--c:#7dd3fc"></i>SK <i style="--c:#f472b6"></i>HU</span>`:"";
  box.querySelector(".wfl").innerHTML=R.sort((a,b)=>a.p-b.p).map(x=>`<div class="wfr${x.c==="SK"||x.c==="HU"?" wfme":""}"><span>${FCN[x.c]}</span><i style="--w:${Math.max(12,(x.p-mn*.97)/(mx-mn*.97)*100)}%"></i><b>${x.p.toFixed(3).replace(".",",")}</b><em class="wfs">${E(x.src)}${x.mol?" ⛽":""}</em></div>`).join("");
  const sr=box.querySelector(".wfsrc");if(sr)sr.innerHTML=`Nafta s DPH, €/l · <a href="https://www.fuel-prices.eu/charts/" target="_blank" rel="noopener">fuel-prices.eu</a>, EK Weekly Oil Bulletin (CC BY 4.0)${F&&F.at?" · "+new Date(F.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):""}`}
function dealsLive(hd,k){const box=hd.querySelector(".wdeal");if(!GRK(k)||!box)return;const D=((typeof STATE!=="undefined"&&STATE.deals)||[]).filter(d=>!/zrus/.test(String(d.status||"")));
  const wk=t=>{const d=new Date(t);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.toLocaleDateString("sv-SE")};const N=12,B=[];
  for(let i=N-1;i>=0;i--){const k0=wk(Date.now()-i*7*864e5);B.push({k:k0,t:Date.parse(k0+"T12:00:00"),tons:0,eur:0,n:0})}
  for(const d of D){const t=wk(Date.parse(d.created_at||d.signed_at||0));const b=B.find(x=>x.k===t);if(b){b.tons+=+d.tons||0;b.eur+=(+d.tons||0)*(+d.price||0);b.n++}}
  const tot=B.reduce((a,b)=>a+b.tons,0),eur=B.reduce((a,b)=>a+b.eur,0),n=B.reduce((a,b)=>a+b.n,0),mx=Math.max(1,...B.map(b=>b.tons));
  const dv=box.querySelector(".wdv");if(dv)dv.innerHTML=`<b>${Math.round(tot).toLocaleString("sk-SK")} t</b><em>${n} zmlúv · 12 týždňov</em>`;
  const W=320,Hh=86,bw=W/N;let bars="";B.forEach((b,i)=>{const h=Math.max(1.5,(b.tons/mx)*(Hh-14));bars+=`<rect x="${(i*bw+bw*.18).toFixed(1)}" y="${(Hh-h).toFixed(1)}" width="${(bw*.64).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="url(#wdbA0)" class="wdbar" style="animation-delay:${i*.05}s"/>`});
  let cum=0;const pts=B.map(b=>{cum+=b.tons;return [b.t,cum]});
  box.querySelector(".wdc").innerHTML=`<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" class="wgsvg"><defs><linearGradient id="wdbA0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa" stop-opacity=".95"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".35"/></linearGradient></defs>${bars}</svg>`+
    `<div class="wdline">${lineSvg("wd",[{pts,col:"#b6ff3b"}],W,Hh,v=>Math.round(v).toLocaleString("sk-SK")+" t")}</div><span class="wgax">týždne</span><span class="wflg"><i style="--c:#a78bfa"></i>t za týždeň <i style="--c:#b6ff3b"></i>spolu</span>`;
  const mo=D.filter(d=>{const t=new Date(d.created_at||0),x=new Date();return t.getMonth()===x.getMonth()&&t.getFullYear()===x.getFullYear()});
  box.querySelector(".wdk").innerHTML=`<span><b>${mo.length}</b> zmlúv tento mesiac</span><span><b>${Math.round(mo.reduce((a,d)=>a+(+d.tons||0),0)).toLocaleString("sk-SK")} t</b> tento mesiac</span><span><b>${Math.round(eur/1000).toLocaleString("sk-SK")} tis. €</b> nákup za 12 týždňov</span>`}
/* 📈 graf so žiariacou čiarou na skle (príkaz majiteľa 30. 10.) – majiteľ: naše nákupné ceny z histórie cenníka; Spotify je nižšie na čiernom pozadí */
const GRK=k=>k==="ja"||k==="ceo";
const GRC={repka:"#facc15",soja:"#a3e635",kukurica:"#fb923c",psenica_p:"#fde68a",psenica_k:"#f5d0a9",jacmen_k:"#93c5fd",jacmen_s:"#c4b5fd",lo:"#fbbf24",ho:"#f472b6",cirok:"#fca5a5"};
const GR={d:null,c:null,t:0,user:false};
async function grLoad(){try{const since=new Date(Date.now()-90*864e5).toISOString();
    const r=await sb.from("cennik_historia").select("at,com,new_price,old_price").gte("at",since).not("com","is",null).order("at",{ascending:true}).limit(2000);
    const H=r.error?[]:(r.data||[]),now=Date.now(),S={};
    for(const p of pxList()){const L=H.filter(h=>h.com===p.com&&h.new_price!=null);const pts=[];const t0=now-90*864e5;
      const first=L[0];pts.push([t0,+(first?(first.old_price!=null?first.old_price:first.new_price):p.price)]);
      for(const h of L)pts.push([Date.parse(h.at),+h.new_price]);pts.push([now,+p.price]);S[p.com]=pts.filter(x=>isFinite(x[1])&&x[1]>0)}
    GR.d=S}catch(x){GR.d={}}}
function grDraw(hd){const box=hd.querySelector(".wgrc"),ch=hd.querySelector(".wgrs"),vv=hd.querySelector(".wgrv");if(!box||!GR.d)return;
  const C=Object.keys(GR.d).filter(c=>GR.d[c].length>1);if(!C.length){box.innerHTML=`<span class="whu">História cien sa zbiera…</span>`;return}
  if(!GR.c||!C.includes(GR.c))GR.c=C[0];const P=GR.d[GR.c],col=GRC[GR.c]||"#b6ff3b";
  const W=320,Hh=92,x0=P[0][0],x1=P[P.length-1][0],vs=P.map(p=>p[1]),mn=Math.min(...vs),mx=Math.max(...vs),pad=(mx-mn)*0.18||6;
  const X=t=>((t-x0)/Math.max(1,x1-x0))*W,Y=v=>Hh-6-((v-(mn-pad))/((mx+pad)-(mn-pad)))*(Hh-14);
  let d="";P.forEach((p,i)=>{const x=X(p[0]).toFixed(1),y=Y(p[1]).toFixed(1);if(!i)d=`M${x},${y}`;else d+=` H${x} V${y}`});
  const last=P[P.length-1],a=`${d} L${W},${Hh} L0,${Hh} Z`,diff=last[1]-P[0][1];
  box.innerHTML=`<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" class="wgsvg" aria-label="Vývoj ceny ${E(nmC(GR.c))} za 90 dní">
    <defs><linearGradient id="wgA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".45"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>
    <filter id="wgG" filterUnits="userSpaceOnUse" x="-20" y="-20" width="${W+40}" height="${Hh+40}"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path d="${a}" fill="url(#wgA)"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round" vector-effect="non-scaling-stroke" filter="url(#wgG)" class="wgln"/>
    <circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="4" fill="${col}" filter="url(#wgG)" class="wgdot"/></svg>
    <span class="wgmx">max ${Math.round(mx)}</span><span class="wgmn">min ${Math.round(mn)}</span><span class="wgax">pred 90 dňami</span><span class="wgnw">dnes</span>`;
  if(vv)vv.innerHTML=`<b style="color:${col}">${E(nmC(GR.c))} ${Math.round(last[1]).toLocaleString("sk-SK")} €/t</b><em class="${diff>0?"wup":diff<0?"wdn":""}">${diff>0?"▲ +":diff<0?"▼ ":"± "}${Math.round(diff)} za 90 dní</em>`;
  if(ch)ch.innerHTML=C.map(c=>`<button type="button" data-wgc="${c}" class="${c===GR.c?"on":""}" style="--gc:${GRC[c]||"#b6ff3b"}">${E(nmC(c))}</button>`).join("")}
async function grLive(hd,k){if(!GRK(k)||!hd.querySelector(".whgr"))return 0;await grLoad();grDraw(hd);
  hd.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-wgc]");if(!b)return;e.preventDefault();e.stopPropagation();GR.user=true;GR.c=b.dataset.wgc;grDraw(hd)});
  return setInterval(()=>{if(document.hidden||GR.user||!hd.isConnected)return;const C=Object.keys(GR.d||{}).filter(c=>GR.d[c].length>1);if(C.length<2)return;GR.c=C[(C.indexOf(GR.c)+1)%C.length];grDraw(hd)},7000)}
/* 🎵 Spotify – Martin, Jana, Galajda, Ličko, Tóth, Tomáš Štofa, Tomáš Vaľko. Vlastný playlist: „Zmeniť“ → vlož odkaz zo Spotify (Zdieľať → Kopírovať odkaz). Uloží sa v tomto zariadení. */
const SPK="ernte-spotify",SPDEF="playlist/1sri3NOK9SPtrmUq7ActiX";
/* rádiá: najnovšie hity z playlistov rádií SK, RO, HU, PL, UA (playlisty sa aktualizujú samy, uložené aj v Spotify majiteľa) */
const SPRAD=[["🇸🇰","Expres","playlist/1sri3NOK9SPtrmUq7ActiX"],["🇸🇰","Europa 2","playlist/22q1eYq2NsomZsTVu2Ss9k"],["🇸🇰","Hot Hits SK","playlist/37i9dQZF1DXdCrbrHtTRdI"],
 ["🔥","Pop hity 2026","playlist/37i9dQZF1DXcOG8EeZQ0xe"],["💃","Dance Pop Hits","playlist/37i9dQZF1DWZQaaqNMbbXa"],["🆕","Nový Dance Pop","playlist/37i9dQZF1DWWOGXILUAh53"],["🎉","Pop & Dance 2026","playlist/06S64oWn7uGnfGrwjh5IWb"],["🎧","Dance 2026","playlist/6g40a9GjWBkX8ewR0vF9C2"],["🇸🇰","Top hity SK","playlist/1tgRtNS7QvxRUNrJHXdJvs"],
 ["🇷🇴","Kiss FM RO","playlist/2W19sWVoqO0StmimPMcZjI"],["🇷🇴","Hot Hits RO","playlist/37i9dQZF1DX9BPHmsKo7pf"],["🇭🇺","Rádió 1","playlist/45i3K85u5AopQboEqAKvOV"],["🇭🇺","Hot Hits HU","playlist/37i9dQZF1DXddoYHYnHJ9N"],
 ["🇵🇱","RMF FM","playlist/0yZYV1gwGmZjx1Of1TXbHN"],["🇵🇱","ESKA·ZET","playlist/3veBbD2WYsf803JjKKK2UM"],["🇺🇦","Хіт FM","playlist/0qsBS4nvAHvxe0YeDrXzvj"],["🇺🇦","Hot Hits UA","playlist/37i9dQZF1DX1V3tM4cuX0v"]];
function spRef(){try{return localStorage.getItem(SPK)||SPDEF}catch(x){return SPDEF}}
function spParse(u){const m=String(u||"").match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]{10,})/)||String(u||"").match(/spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]{10,})/);return m?m[1]+"/"+m[2]:null}
/* komu Spotify: celý tím ERNTE/VALKO (každý zamestnanec v aplikácii); farmári a partnerské firmy trusu nie */
const SPWHO=[["jana"],["galajda"],["licko"],["toth"],["tomas","stofa"],["tomas","valko"]];
/* 🤝 obchodník: namiesto rádia ľahký panel „Môj mesiac“ (žiadne Spotify – rýchle aj na najslabšom telefóne) */
function obPanel(){const D=((typeof STATE!=="undefined"&&STATE.deals)||[]).filter(d=>!/zrus/.test(String(d.status||"")));const now=new Date(),m0=new Date(now.getFullYear(),now.getMonth(),1).getTime(),w0=Date.now()-7*864e5;
  const ts=d=>Date.parse(d.created_at||d.date||"")||0,M=D.filter(d=>ts(d)>=m0),W=D.filter(d=>ts(d)>=w0),t=L=>Math.round(L.reduce((a,d)=>a+(+d.tons||0),0)).toLocaleString("sk-SK");
  const by={};M.forEach(d=>{by[d.com]=(by[d.com]||0)+(+d.tons||0)});const top=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const cn=c=>(typeof comName==="function"?comName(c):c);
  return `<div class="whc whob"><small>🤝 Obchody · ${now.toLocaleDateString("sk-SK",{month:"long"})}</small><div class="whobg"><div><b>${M.length}</b><span>zmlúv</span></div><div><b>${t(M)}</b><span>ton</span></div><div><b>${W.length}</b><span>za 7 dní</span></div></div>
   ${top.length?`<div class="whobc">${top.map(([c,v])=>`<span>${E(cn(c))} <b>${Math.round(v).toLocaleString("sk-SK")} t</b></span>`).join("")}</div>`:`<div class="whobc"><span>Prvý obchod mesiaca ťa čaká – Uzatvoriť obchod za minútu.</span></div>`}</div>`}
/* štýl tlačidiel rádia */
{const st=document.createElement("style");st.textContent=".wspx{display:block;width:100%;margin-top:8px;min-height:40px;padding:0 12px!important;border-radius:12px!important;font-size:.85rem;font-weight:700}.whoff{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.wspon{min-height:38px;padding:0 12px;border-radius:12px}.whob .whobg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:8px 0 6px;text-align:center}.whob .whobg b{display:block;font-size:1.7rem;line-height:1.1}.whob .whobg span{font-size:.75rem;opacity:.8}.whob .whobc{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;font-size:.8rem}.whob .whobc span{padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.08)}";document.head.appendChild(st)}
/* 📻 rádio sa dá vypnúť natrvalo (návrh obchodníkov – slabší telefón); na slabom telefóne je predvolene vypnuté */
const RADK="ernte-radio";function radioOff(){let v="";try{v=localStorage.getItem(RADK)||""}catch(x){}if(v)return v==="off";return !!(navigator.deviceMemory&&navigator.deviceMemory<=3)}
function radioSet(on){try{localStorage.setItem(RADK,on?"on":"off")}catch(x){}}
function radioOnHTML(){return `<div class="whc whsp whoff"><small>🎵 Rádio je vypnuté</small><button type="button" class="wspon" data-radon="1">▶ Zapnúť rádio</button></div>`}
function spotOK(k){if(k==="ja")return true;if(typeof FARMER!=="undefined"&&FARMER)return false;if(window.ERNTE_KIND!=="trus"&&typeof ROLE!=="undefined"&&ROLE)return true;/* celý tím (zamestnanci); farmári a partneri trusu nie */
  const raw=((typeof ME!=="undefined"&&ME&&(ME.staffName||""))+" "+(typeof ME!=="undefined"&&ME&&ME.email||"")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const T=raw.split(/[^a-z0-9]+/);return SPWHO.some(ws=>ws.every(w=>T.includes(w)))}
function spot(){const r=spRef(),cur=SPRAD.find(x=>x[2]===r);return `<div class="whc whsp"><div class="wsph"><div class="wspt"><small>🎵 Rádio · Spotify</small><b>${cur?`<i>${cur[0]}</i> <span>${E(cur[1])}</span>`:"<span>Môj playlist</span>"}</b></div><span><a class="wspo" href="https://open.spotify.com/${r}" target="_blank" rel="noopener">Spotify ↗</a><button type="button" class="wspc" data-spchg>Zmeniť</button></span></div>
  <div class="wspr" role="group" aria-label="Rádiá">${SPRAD.map(x=>`<button type="button" class="wsprb" data-sprad="${x[2]}" aria-pressed="${x[2]===r}">${x[0]} ${E(x[1])}</button>`).join("")}</div>
  <div class="wspw wslot"></div><div class="wspn">▶ Hrá ďalej aj počas práce v aplikácii – dole sa zbalí do 🎵.</div><button type="button" class="wspx" data-radoff="1">✕ Vypnúť rádio (ak spomaľuje telefón)</button></div>`}
/* prehrávač žije mimo úvodu (spdock.js) – tu ho iba prilepíme do panelu, aby hudba pri zatvorení úvodu nestíchla */
function spHook(el){const s=el&&el.querySelector(".whsp .wslot");if(!s||!window.spDock)return;const r=spRef(),cur=SPRAD.find(x=>x[2]===r);try{spDock.play(r,cur?cur[0]+" "+cur[1]:"Môj playlist");spDock.attach(s)}catch(x){}}
const WXI=c=>c===0?"☀️":c<=2?"🌤️":c===3?"☁️":c<=48?"🌫️":c<=67?"🌧️":c<=77?"🌨️":c<=82?"🌦️":c<=86?"🌨️":"⛈️";
const WXN=c=>c===0?"jasno":c<=2?"polojasno":c===3?"zamračené":c<=48?"hmla":c<=57?"mrholenie":c<=67?"dážď":c<=77?"sneh":c<=82?"prehánky":c<=86?"snehové prehánky":"búrka";
function spark(svg,vals){if(!svg||!vals.length)return;const mn=Math.min(...vals),mx=Math.max(...vals),r=mx-mn||1;const pt=vals.map((v,i)=>[i*120/(vals.length-1||1),30-(v-mn)/r*24]);
  const d=pt.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  svg.innerHTML=`<defs><linearGradient id="wspg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6ff3b" stop-opacity=".45"/><stop offset="1" stop-color="#b6ff3b" stop-opacity="0"/></linearGradient></defs><path d="${d} L120 34 L0 34Z" fill="url(#wspg)" class="wspa"/><path d="${d}" fill="none" stroke="#b6ff3b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="wspl" vector-effect="non-scaling-stroke"/><circle cx="${pt[0][0]}" cy="${pt[0][1]}" r="3" fill="#fff" class="wspd"/>`}
async function wx(el){const L=(()=>{try{return WXLOC}catch(x){return null}})()||{name:"Michalovce",lat:48.755,lon:21.915};
  try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m&forecast_hours=12&timezone=auto`);const j=await r.json();
    const c=j.current||{};el.querySelector(".wxi").textContent=WXI(c.weather_code);countTo(el.querySelector(".wxt"),Math.round(c.temperature_2m),"°");
    el.querySelector(".wxs").textContent=`${WXN(c.weather_code)} · ${Math.round(c.wind_speed_10m)} km/h · ${L.name||""}`;spark(el.querySelector(".wspk"),((j.hourly||{}).temperature_2m||[]).filter(v=>v!=null))}
  catch(x){el.querySelector(".wxs").textContent=L.name||"";el.querySelector(".wxi").textContent="🌾"}}
function countTo(n,to,suf){if(!n)return;if(!isFinite(to)){n.textContent="–";return}const t0=performance.now(),D=1100;const f=t=>{const p=Math.min(1,(t-t0)/D),e=1-Math.pow(1-p,3);n.textContent=Math.round(to*e).toLocaleString("sk-SK")+(suf||"");if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function ring(pct){const C=2*Math.PI*26;return `<div class="wring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" class="wrb"/><circle cx="32" cy="32" r="26" class="wrf" stroke-dasharray="${C}" stroke-dashoffset="${C}" style="--to:${C*(1-pct/100)}"/></svg><b data-to="${Math.round(pct)}" data-suf="%">0%</b></div>`}
function big(v,suf){return `<b class="whbig" data-to="${v}" data-suf="${suf||""}">0</b>`}
function bars(vals,lbls,unit){const mx=Math.max(1,...vals);return vals.map((v,i)=>`<span title="${E(lbls[i]||"")}: ${v}${unit||""}"><i style="--h:${Math.max(4,v/mx*100)}%;animation-delay:${.15+i*.06}s"></i><em>${E(lbls[i]||"")}</em></span>`).join("")}
function days7(){const a=[];for(let i=6;i>=0;i--){const d=new Date(Date.now()-i*864e5);a.push([d.toLocaleDateString("sv-SE"),"NPUSŠPS"[d.getDay()]])}return a}
function kpis(k,el){const S=typeof STATE!=="undefined"?STATE:{};const t=today();const kb=el.querySelector(".whkb"),bb=el.querySelector(".whbars"),k2=el.querySelector(".whk2");
  const act=(S.deals||[]).filter(d=>!["zrusena","zruseny"].includes(d.status)&&+d.tons>0);const tons=act.reduce((a,d)=>a+(+d.tons||0),0),del=act.reduce((a,d)=>a+Math.min(+d.tons||0,+d.delivered_t||0),0);
  const pct=tons?del/tons*100:0;const D=days7();const trips=D.map(([d])=>(S.trips||[]).filter(x=>String(x.day).slice(0,10)===d).length);
  const nreq=(S.reqs||[]).filter(r=>r.status==="nova").length;
  if(k==="farmar")farmPx(el,false);
  else if(k==="doprava"){kb.innerHTML=big(trips[6])+`<span class="whu">${tons?Math.round(tons-del).toLocaleString("sk-SK")+" t zostáva":"dnes"}</span>`;bb.innerHTML=bars(trips,D.map(x=>x[1]))}
  else if(k==="evid"||k==="mzdy"){const n=new Date(),last=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();let wd=0;for(let d=n.getDate();d<=last;d++){const w=new Date(n.getFullYear(),n.getMonth(),d).getDay();if(w&&w<6)wd++}
    kb.innerHTML=big(wd)+`<span class="whu">${wd===1?"pracovný deň":wd<5?"pracovné dni":"pracovných dní"} do konca mesiaca${k==="mzdy"?"<br>potom výplaty":""}</span>`;if(k2)k2.remove();if(bb)bb.remove()}
  else if(k==="evid_old"){kb.innerHTML=big(act.length)+`<span class="whu">${Math.round(tons).toLocaleString("sk-SK")} t spolu</span>`;bb.innerHTML=bars(D.map(([d])=>(S.deals||[]).filter(x=>String(x.created_at||"").slice(0,10)===d).length),D.map(x=>x[1]))}
  else if(k==="obchod"){kb.innerHTML=ring(pct)+`<span class="whu">${Math.round(del).toLocaleString("sk-SK")} / ${Math.round(tons).toLocaleString("sk-SK")} t</span>`;bb.innerHTML=`<div class="whn">${big(nreq)}<span class="whu">${nreq===1?"čaká na teba":"čakajú na teba"}</span></div>`}
  else if(k==="trus"){kb.innerHTML=big(nreq)+`<span class="whu">nové</span>`;if(k2)k2.remove()}
  else{kb.innerHTML=ring(pct)+`<span class="whu">${Math.round(del).toLocaleString("sk-SK")} / ${Math.round(tons).toLocaleString("sk-SK")} t</span>`;bb.innerHTML=bars(trips,D.map(x=>x[1]))}
  pxPanel(el,false);
  el.querySelectorAll("[data-to]").forEach(n=>countTo(n,+n.dataset.to,n.dataset.suf));requestAnimationFrame(()=>el.classList.add("wgo"))}
function clock(el){const c=el.querySelector(".wclk");if(!c)return 0;const f=()=>{const d=new Date(),p=n=>String(n).padStart(2,"0");c.innerHTML=`${p(d.getHours())}:${p(d.getMinutes())}<small>:${p(d.getSeconds())}</small>`};f();return setInterval(f,1000)}


/* ---------- ceny: vždy aktuálne podľa automatického cenníka (tabuľka prices, ktorú plní autocennik.js) ---------- */
const PXK="ernte-wlpx";const nmC=c=>typeof comName==="function"?comName(c):c;
const pxSeen=()=>{try{return JSON.parse(localStorage.getItem(PXK))||{}}catch(x){return {}}};
const pxList=()=>((typeof STATE!=="undefined"&&STATE.prices)||[]).filter(p=>p.price!=null);
function pxSave(){const o={};pxList().forEach(p=>o[p.com]=+p.price);try{localStorage.setItem(PXK,JSON.stringify(o))}catch(x){}}
function dTag(com,v){const o=pxSeen()[com];if(o==null||!isFinite(o)||Math.abs(v-o)<.5)return "";const d=Math.round(v-o);return `<sup class="${d>0?"wup":"wdn"}" title="od poslednej návštevy">${d>0?"▲ +":"▼ "}${d}</sup>`}
function pxStamp(){const t=pxList().map(p=>p.updated_at).filter(Boolean).sort().pop();if(!t)return "";const d=new Date(t);const td=d.toLocaleDateString("sv-SE")===today();
  return `🤖 Automatický cenník · ${td?"dnes "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})} · obnovuje sa samo`}
function pxPanel(el,flash){const pl=el.querySelector(".whpl");if(!pl)return;const P=pxList().sort((a,b)=>b.price-a.price).slice(0,8);const mx=Math.max(1,...P.map(p=>+p.price));
  pl.innerHTML=P.length?P.map((p,i)=>`<span class="wpc${flash&&flash.has(p.com)?" wfl":""}"><em>${E(nmC(p.com))}</em><b><span data-to="${Math.round(p.price)}">${flash?Math.round(p.price).toLocaleString("sk-SK"):0}</span>${dTag(p.com,+p.price)}</b><i style="--w:${Math.max(8,p.price/mx*100)}%;animation-delay:${.3+i*.07}s"></i></span>`).join(""):`<span class="whu">Cenník zatiaľ nie je zadaný</span>`;
  let st=el.querySelector(".wpst");if(!st){st=document.createElement("div");st.className="wpst";pl.after(st)}st.textContent=pxStamp()}
function farmPx(el,flash){const kb=el.querySelector(".whkb"),bb=el.querySelector(".whbars");if(!kb||!bb)return;const P=pxList().sort((a,b)=>b.price-a.price).slice(0,5);
  if(P.length){kb.innerHTML=`<b class="whbig${flash?" wfl":""}" data-to="${Math.round(P[0].price)}">${flash?Math.round(P[0].price).toLocaleString("sk-SK"):0}</b><span class="whu">€/t · ${E(nmC(P[0].com))}${dTag(P[0].com,+P[0].price)}<br>najvyššia</span>`;bb.innerHTML=bars(P.map(p=>Math.round(p.price)),P.map(p=>String(nmC(p.com)).slice(0,4))," €/t");bb.classList.add("wtall")}
  else kb.innerHTML=`<span class="whu">Cenník sa pripravuje</span>`;
  let st=el.querySelector(".wpst");if(!st){st=document.createElement("div");st.className="wpst";bb.after(st)}st.textContent=pxStamp()}
async function pxRefresh(el,k){try{const r=await sb.from("prices").select("com,price,updated_at");if(r.error||!r.data)return;
    {const AJ=+window.PADJ||0;if(AJ)r.data=r.data.map(x=>x.price==null?x:Object.assign({},x,{price:Math.round((+x.price+AJ)*100)/100}))}
    const cur=Object.fromEntries(pxList().map(p=>[p.com,+p.price]));const ch=new Set();
    r.data.filter(x=>x.price!=null).forEach(x=>{if(cur[x.com]!==+x.price)ch.add(x.com)});
    const stampOld=pxStamp();if(typeof STATE!=="undefined"){const M=Object.fromEntries((STATE.prices||[]).map(p=>[p.com,p]));r.data.forEach(x=>{if(M[x.com])Object.assign(M[x.com],x);else (STATE.prices=STATE.prices||[]).push({...x})})}
    if(ch.size||pxStamp()!==stampOld){if(k==="farmar")farmPx(el,ch);else pxPanel(el,ch)}}catch(x){}}
function pxLive(el,k){if(!el.querySelector(".whpl")&&k!=="farmar")return 0;
  try{if(k!=="farmar"&&window.autoCennik&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST)autoCennik.run(false)}catch(x){}
  setTimeout(()=>pxRefresh(el,k),4000);return setInterval(()=>{if(!document.hidden)pxRefresh(el,k)},30000)}

/* ---------- údaje do pozdravu ---------- */
async function facts(k){const L=[];try{const S=typeof STATE!=="undefined"?STATE:{};const t=today();
  if(k==="ja"||k==="ceo"||k==="obchod"){const n=(S.reqs||[]).filter(r=>r.status==="nova").length;if(n)L.push(`📥 <b>${n}</b> ${n===1?"nová požiadavka":n<5?"nové požiadavky":"nových požiadaviek"}`)}
  if(k==="ja"||k==="ceo"||k==="obchod"||k==="doprava"){const rem=(S.deals||[]).filter(d=>!["zrusena","zruseny","uzavrety","hotovo"].includes(d.status)).reduce((a,d)=>a+Math.max(0,(+d.tons||0)-(+d.delivered_t||0)),0);if(rem>0)L.push(`🚚 <b>${Math.round(rem).toLocaleString("sk-SK")} t</b> zostáva vyviezť`)}
  if(k==="ja"||k==="ceo"||k==="doprava"){const tr=(S.trips||[]).filter(x=>x.day===t);if(tr.length)L.push(`🛣️ <b>${tr.length}</b> ${tr.length===1?"jazda":tr.length<5?"jazdy":"jázd"} dnes`)}
  if(k==="farmar"){const P=(S.prices||[]).filter(p=>p.price!=null).sort((a,b)=>b.price-a.price)[0];if(P)L.push(`🌾 Najvyššia výkupná cena: <b>${E(typeof comName==="function"?comName(P.com):P.com)} ${(+P.price).toLocaleString("sk-SK")} €/t</b>`);
    const my=(S.deals||[]).filter(d=>!["zrusena","zruseny"].includes(d.status));if(my.length)L.push(`📄 ${my.length} ${my.length===1?"obchod":my.length<5?"obchody":"obchodov"} s ERNTE`)}
  if(k==="ja"){const r=await sb.from("owner_cal").select("title,start_at,place").eq("done",false).gte("start_at",new Date().toISOString()).order("start_at",{ascending:true}).limit(1);
    const e=r.data&&r.data[0];if(e){const d=new Date(e.start_at);const dd=d.toLocaleDateString("sv-SE")===t?"dnes":d.toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"numeric"});L.push(`📅 ${E(dd)} ${d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})} · <b>${E(e.title)}</b>${e.place?" · "+E(e.place):""}`)}
    const m=await sb.from("meet_req").select("id").eq("status","nova").gte("start_at",new Date().toISOString());if(m.data&&m.data.length)L.push(`📩 <b>${m.data.length}</b> ${m.data.length===1?"žiadosť":"žiadosti"} o stretnutie čaká na teba`)}
 }catch(x){}return L}

/* ---------- zobrazenie ---------- */
async function show(force){const k=kind();if(!k||document.querySelector(".wlc"))return;if(sGet("ernte-welcome-skip"))return;
  const ph=phase();const nm=k==="farmar"?(FARMER.name||""):k==="trus"?"":firstName((typeof ME!=="undefined"&&ME&&ME.staffName)||"");
  const who=k==="ja"?"Martin":nm;const g=`${GREET[ph]}${who?", "+E(who):""}!`;
  const FL=FUN[k]||FUN.tim;let ji=Math.floor(Date.now()/864e5)%FL.length;
  const sub=k==="ja"?"Firma beží, čísla sú tu – poďme na to. 💪":(ROLE_TXT[k]||ROLE_TXT.tim)[1];const joke=pickJoke();
  const tag=k==="ja"?"majiteľ · ERNTE · VALKO":(ROLE_TXT[k]||ROLE_TXT.tim)[0];
  const el=document.createElement("div");el.className="wlc "+ph;el.setAttribute("role","dialog");el.setAttribute("aria-label","Úvod");
  const POR=()=>innerWidth<1100||innerHeight<640;const por=POR();if(por)el.classList.add("por");
  const rz=()=>{if(!el.isConnected){removeEventListener("resize",rz);return}el.classList.toggle("por",POR())};addEventListener("resize",rz);
  el.innerHTML=`${scene(k,ph,por)}<div class="wlb"><img src="icon-192.png" alt=""><div class="wlt"><small>${E(tag)}</small><b>${g}</b><p>${E(sub)}</p>${joke?`<p class="wjk">💡 <b>Vedeli ste?</b> <span>${E(joke)}</span></p>`:""}<ul class="wlf"></ul>
   <div class="wla"><button type="button" class="lime" data-wlgo>Poďme na to →</button><button type="button" class="wmore" data-wljoke>💡 Ďalšia zaujímavosť</button></div></div></div>${GRK(k)&&spotOK(k)?`<div class="wlsp">${radioOff()?radioOnHTML():spot()}</div>`:""}
   <button type="button" class="wlx" data-wlx hidden tabindex="-1" aria-hidden="true">✕</button><div class="wltap">${new Date().toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"long"})}</div>`;
  document.body.appendChild(el);
  const nextJoke=ev=>{if(ev){ev.preventDefault();ev.stopPropagation()}const now=Date.now();if(nextJoke.t&&now-nextJoke.t<500)return;nextJoke.t=now;
    const jt=pickJoke();
    let w=el.querySelector(".wjk");if(!w){el.querySelector(".wlt p").insertAdjacentHTML("afterend",`<p class="wjk">💡 <b>Vedeli ste?</b> <span></span></p>`);w=el.querySelector(".wjk")}
    w.querySelector("span").textContent=jt;w.classList.remove("pop");void w.offsetWidth;w.classList.add("pop");
    try{w.scrollIntoView({block:"nearest",behavior:"smooth"})}catch(x){}if(navigator.vibrate)try{navigator.vibrate(15)}catch(x){}};
  const jb=el.querySelector("[data-wljoke]");if(jb){jb.addEventListener("click",nextJoke);jb.addEventListener("touchend",nextJoke,{passive:false})}
  const go=ev=>{if(ev){ev.preventDefault();ev.stopPropagation()}if(el._gone)return;el._gone=1;try{window.opushAuto&&opushAuto(true)}catch(x){}close(el);goHome()};
  const gb=el.querySelector("[data-wlgo]");if(gb){gb.addEventListener("click",go);gb.addEventListener("touchend",go,{passive:false});gb.addEventListener("pointerup",e=>{if(e.pointerType!=="mouse")go(e)})}document.documentElement.classList.add("wlon");requestAnimationFrame(()=>el.classList.add("in"));
  const hd=el.querySelector(".whud");let ck=0;if(hd){ck=clock(hd);el._ck=ck;wx(hd);try{kpis(k,hd)}catch(x){}el._px=pxLive(hd,k);grLive(hd,k).then(t=>{el._gr=t},()=>{});try{fuelLive(hd,k).then(()=>wfit(el));dealsLive(hd,k);wfit(el)}catch(x){}}
  const fill=async()=>{const f=await facts(k);const ul=el.querySelector(".wlf");if(ul)ul.innerHTML=f.map(x=>`<li>${x}</li>`).join("")};
  /* údaje sa po otvorení ešte načítavajú – keď prídu, čísla a ceny sa doplnia (najviac 20 s) */
  const ready=()=>{const S=typeof STATE!=="undefined"?STATE:{};return (S.prices&&S.prices.length)||(S.deals&&S.deals.length)};
  if(hd&&!ready()){let n=0;const iv=setInterval(()=>{n++;if(!el.isConnected||n>40){clearInterval(iv);return}if(ready()){clearInterval(iv);hd.classList.remove("wgo");try{kpis(k,hd)}catch(x){}fill()}},500)}
  await fill();
  spHook(el);
  el.addEventListener("click",ev=>{    if(ev.target.closest("[data-wljoke]"))return;
    if(ev.target.closest(".wcomb,.wtrac,.wtk1,.wtk2,.when")){const g=ev.target.closest(".wcomb,.wtrac,.wtk1,.wtk2,.when");g.classList.add("wboost");setTimeout(()=>g.classList.remove("wboost"),1500);honk(g.classList.contains("when"));confetti(el,ev.clientX,ev.clientY);if(navigator.vibrate)try{navigator.vibrate(30)}catch(x){}return}
    if(ev.target.closest(".wcred"))return;
    if(ev.target.closest("[data-spchg]")){const u=prompt("Vlož odkaz na playlist, album alebo skladbu zo Spotify (v Spotify: ⋯ → Zdieľať → Kopírovať odkaz):","");if(u==null)return;const r=spParse(u);
      if(!r){if(typeof toast==="function")toast("Toto nie je odkaz zo Spotify – skús znova.",5000);return}try{localStorage.setItem(SPK,r)}catch(x){}const w=el.querySelector(".whsp");if(w)w.outerHTML=spot();spHook(el);return}
    {const ro=ev.target.closest("[data-radoff],[data-radon]");if(ro){const on=!!ro.dataset.radon;radioSet(on);if(!on){const d=document.getElementById("spdock");if(d)d.remove()}const w=el.querySelector(".whsp");if(w)w.outerHTML=on?spot():radioOnHTML();if(on)spHook(el);if(typeof toast==="function")toast(on?"🎵 Rádio zapnuté.":"Rádio vypnuté – aplikácia je ľahšia. Zapneš ho tu na úvode.",4000);return}}
    {const rb=ev.target.closest("[data-sprad]");if(rb){try{localStorage.setItem(SPK,rb.dataset.sprad)}catch(x){}const w=el.querySelector(".whsp");if(w)w.outerHTML=spot();spHook(el);return}}
    if(ev.target.closest(".whsp"))return;
    if(ev.target.closest(".whc")){const c=ev.target.closest(".whc");c.classList.remove("wtap");void c.offsetWidth;c.classList.add("wtap");honk(false);confetti(el,ev.clientX,ev.clientY);if(navigator.vibrate)try{navigator.vibrate(20)}catch(x){}return}
    if(ev.target.closest("[data-wlgo]"))return;
    /* PRÍKAZ MAJITEĽA (30. 10.): úvod LIVE sa nedá zavrieť ✕ ani ťuknutím mimo – iba „Poďme na to →“ (skrytý data-wlx používajú iba upozornenia, ktoré otvárajú konkrétne miesto) */
    if(ev.target.closest("[data-wlx]")&&ev.isTrusted===false){if(!el._gone){el._gone=1;close(el);goHome()}}});
  el.addEventListener("keydown",ev=>{if(ev.key==="Enter"&&!ev.target.closest("button")){ev.preventDefault();if(!el._gone){el._gone=1;close(el);goHome()}}});
  setTimeout(()=>{try{el.querySelector("[data-wlgo]").focus({preventScroll:true})}catch(x){}},400)}
/* „Poďme na to“ → vždy do pridelených sekcií (Prehľad / prvá záložka používateľa) */
function goHome(){try{if(typeof FARMER!=="undefined"&&FARMER){window.scrollTo(0,0);return}
  const b=document.querySelector('nav.tabs [data-tab="home"]')||document.querySelector("nav.tabs [data-tab]");
  if(b){if(typeof TAB!=="undefined"&&TAB===b.dataset.tab){window.scrollTo(0,0);return}b.click()}window.scrollTo(0,0)}catch(x){}}
/* po návrate do aplikácie (bola na pozadí aspoň 30 s) sa úvod ukáže znova */
let hidAt=0;document.addEventListener("visibilitychange",()=>{if(document.hidden){hidAt=Date.now();return}
  if(hidAt&&Date.now()-hidAt>=30000&&kind()&&!document.querySelector(".pinmod,dialog[open],.modal,.ovl")&&!(typeof window.formBusy==="function"&&formBusy()))show(true);hidAt=0});
let AC=null;function honk(chick){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime;
  const tone=(f,a,b,type)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type||"square";o.frequency.setValueAtTime(f,t+a);if(chick)o.frequency.exponentialRampToValueAtTime(f*1.8,t+b);g.gain.setValueAtTime(0,t+a);g.gain.linearRampToValueAtTime(.08,t+a+.02);g.gain.linearRampToValueAtTime(0,t+b);o.connect(g);g.connect(AC.destination);o.start(t+a);o.stop(t+b+.02)};
  if(chick){tone(700,0,.12,"triangle");tone(900,.16,.3,"triangle")}else{tone(392,0,.22);tone(330,.26,.5)}}catch(x){}}
function confetti(el,x,y){const em=["🌾","🌾","🌻","✨","🟡"];for(let i=0;i<12;i++){const d=document.createElement("span");d.className="wcf";d.textContent=em[i%em.length];d.style.left=x+"px";d.style.top=y+"px";
  d.style.setProperty("--dx",(Math.random()*240-120)+"px");d.style.setProperty("--dy",(-80-Math.random()*160)+"px");el.appendChild(d);setTimeout(()=>d.remove(),1100)}}
function close(el){if(el._gr)clearInterval(el._gr);if(el._ck)clearInterval(el._ck);if(el._px)clearInterval(el._px);pxSave();el.classList.remove("in");el.classList.add("out");document.documentElement.classList.remove("wlon");setTimeout(()=>el.remove(),380)}
window.ernteWelcome=()=>show(true);
/* poistka: „Poďme na to“ vždy zavrie úvod, aj keby sa niečo pri zobrazení pokazilo */
const fsGo=ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest("[data-wlgo]");if(!b)return;const w=b.closest(".wlc");if(!w||w._gone)return;ev.preventDefault();ev.stopPropagation();w._gone=1;try{window.opushAuto&&opushAuto(true)}catch(x){}close(w);goHome()};
document.addEventListener("click",fsGo,true);document.addEventListener("touchend",fsGo,{capture:true,passive:false});
document.addEventListener("click",e=>{const i=e.target.closest&&e.target.closest("header.top img");if(i&&kind()){e.preventDefault();show(true)}});
function css(){const s=document.createElement("style");s.textContent=`
.wlc{position:fixed;inset:0;z-index:30000;display:flex;flex-direction:column;justify-content:flex-end;background:#0b1020;opacity:0;transition:opacity .35s ease;overflow:hidden}
.wlc.in{opacity:1}.wlc.out{opacity:0}
html.wlon,html.wlon body{overflow:hidden}
.wsvg{position:absolute;inset:0;width:100%;height:100%}
.wimg{position:absolute;inset:0;background:#668921 center top/cover no-repeat}
@keyframes wkb{from{transform:scale(1)}to{transform:scale(1.08)}}
.wlc.por .wimg{position:relative;inset:auto;flex:1 1 auto;min-height:44vh}
.wlc.por{--x0:20px;--x1:330px;background:#14210a}.wlc.por .wsvg{position:relative;inset:auto;flex:1 1 auto;min-height:34vh;height:auto}
.wlc.por .wlb{margin-top:12px}
.wlc.por .wcomb{animation-duration:11s}.wlc.por .wcut{animation-duration:11s}.wlc.por .wtrac{animation-duration:9s}.wlc.por .wtk1{animation-duration:6s}.wlc.por .wtk2{animation-duration:7.5s}.wlc.por .wlane{--x0:-40px;--x1:0px;animation-duration:1.2s}
.wlb{position:relative;margin:0 auto calc(18px + env(safe-area-inset-bottom,0px));width:min(560px,calc(100% - 28px));display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:start;padding:16px;max-height:62vh;overflow:auto;border-radius:26px;
  background:rgba(11,16,32,.72);-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);border:1px solid rgba(255,255,255,.18);box-shadow:0 24px 60px rgba(0,0,0,.45);color:#f1f5ff;transform:translateY(30px);transition:transform .5s cubic-bezier(.2,.8,.2,1) .1s}
.wlc.in .wlb{transform:none}.wla button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;position:relative;z-index:2}.wlc{cursor:default}
.wlb img{width:48px;height:48px;border-radius:16px;background:#fff}
.wlt small{display:block;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#b6ff3b;font-weight:700}
.wlt>b{display:block;font-size:1.6rem;letter-spacing:-.03em;line-height:1.15;margin:2px 0 4px}
.wlt p{margin:0;color:#c9d1e3;font-size:.95rem;line-height:1.45}
.wlf{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:5px}.wlf li{font-size:.86rem;line-height:1.35;padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)}
.wla{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}.wla .lime{min-height:46px;padding:0 16px;font-size:.98rem}.wjk{margin-top:8px!important;padding:8px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(182,255,59,.14),rgba(94,234,212,.08));border:1px solid rgba(182,255,59,.3);color:#f1f5ff!important}
.wjk.pop{animation:wpop .35s cubic-bezier(.2,.8,.2,1)}@keyframes wpop{0%{transform:scale(.94);opacity:.4}100%{transform:none;opacity:1}}
.wmore{min-height:46px;padding:0 10px;font-size:.86rem}
.wcf{position:fixed;z-index:30001;pointer-events:none;font-size:22px;animation:wcfa 1.1s ease-out forwards}
@keyframes wcfa{0%{transform:translate(-50%,-50%) scale(.6);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy) + 160px)) rotate(240deg) scale(1);opacity:0}}
.wcomb,.wtrac,.wtk1,.wtk2,.when{cursor:pointer}
.wloff{background:none!important;border:0!important;box-shadow:none!important;color:#a7b1c6;font-weight:500;font-size:.8rem;min-height:40px}
.wltap{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:0;right:0;text-align:center;color:rgba(255,255,255,.85);font-weight:600;font-size:.85rem;text-transform:capitalize;text-shadow:0 1px 6px rgba(0,0,0,.4)}
@keyframes wdrive{from{transform:translateX(var(--x0,-140px))}to{transform:translateX(var(--x1,470px))}}
@keyframes wback{from{transform:translateX(var(--x1,460px))}to{transform:translateX(var(--x0,-140px))}}
@keyframes wcut{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes wspin{to{transform:rotate(360deg)}}
@keyframes wpuff{0%{opacity:.8;transform:translate(0,0) scale(.6)}100%{opacity:0;transform:translate(-26px,-14px) scale(1.4)}}
@keyframes wcloud{from{transform:translateX(-60px)}to{transform:translateX(60px)}}
@keyframes wtw{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes wpeck{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes wdocf{0%{transform:translate(0,0);opacity:0}15%{opacity:1}100%{transform:translate(230px,70px) scale(.5);opacity:0}}
@keyframes wbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}
.wcomb{animation:wdrive 16s linear infinite}.wcomb>rect,.wcomb>text{animation:wbob .5s ease-in-out infinite}
.wcut{transform-origin:0 0;animation:wcut 16s linear infinite}
.wtrac{animation:wback 13s linear infinite}
.wtk1{animation:wdrive 9s linear infinite}.wtk2{animation:wback 11s linear infinite}
.wsp{animation:wspin 1s linear infinite;transform-box:fill-box;transform-origin:center}
.wdust circle{animation:wpuff 1.2s ease-out infinite}.wdust circle:nth-child(2){animation-delay:.4s}.wdust circle:nth-child(3){animation-delay:.8s}
.wcl{animation:wcloud 30s ease-in-out infinite alternate}
.wstars circle{animation:wtw 3s ease-in-out infinite}
.when{animation:wpeck .8s ease-in-out infinite}
.wdoc{animation:wdocf 3.6s ease-in infinite}
.wlane{animation:wback 6s linear infinite}
.wboost{animation-duration:3s!important}

.wimg{overflow:hidden}.wimg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,22,.55) 0%,rgba(5,8,22,.05) 38%,rgba(5,8,22,.05) 62%,rgba(5,8,22,.6) 100%);pointer-events:none}
.wimg::before{content:"";position:absolute;inset:-4%;background:inherit;animation:wkb 18s ease-in-out infinite alternate}
.wgrid{position:absolute;inset:0;z-index:1;background-image:linear-gradient(rgba(182,255,59,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(182,255,59,.09) 1px,transparent 1px);background-size:38px 38px;-webkit-mask-image:radial-gradient(ellipse at 50% 35%,#000 0%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 35%,#000 0%,transparent 72%)}
.wscan{position:absolute;left:0;right:0;top:0;height:90px;z-index:1;background:linear-gradient(180deg,transparent,rgba(182,255,59,.07) 80%,rgba(182,255,59,.45) 100%);animation:wscan 5.5s cubic-bezier(.45,0,.55,1) infinite;pointer-events:none}
@keyframes wscan{0%{transform:translateY(-100%);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(100vh);opacity:0}}
.wcrn{position:absolute;inset:calc(10px + env(safe-area-inset-top,0px)) 10px 10px;z-index:1;pointer-events:none;background:linear-gradient(#b6ff3b,#b6ff3b) 0 0/18px 2px,linear-gradient(#b6ff3b,#b6ff3b) 0 0/2px 18px,linear-gradient(#b6ff3b,#b6ff3b) 100% 0/18px 2px,linear-gradient(#b6ff3b,#b6ff3b) 100% 0/2px 18px,linear-gradient(#b6ff3b,#b6ff3b) 0 100%/18px 2px,linear-gradient(#b6ff3b,#b6ff3b) 0 100%/2px 18px,linear-gradient(#b6ff3b,#b6ff3b) 100% 100%/18px 2px,linear-gradient(#b6ff3b,#b6ff3b) 100% 100%/2px 18px;background-repeat:no-repeat;opacity:.75}
.wcred{position:absolute;right:12px;bottom:6px;z-index:3;font-size:.62rem;color:rgba(255,255,255,.75);text-decoration:none;text-shadow:0 1px 3px rgba(0,0,0,.8);max-width:70%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wlc.por .wcred{bottom:52px}
.whud{position:absolute;z-index:2;left:14px;right:14px;top:calc(42px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:8px;font-family:"Geist",system-ui,sans-serif;color:#f1f5ff}
.whtop{display:flex;align-items:center;justify-content:space-between}
.wlive{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font:700 .66rem/1 "Geist Mono",ui-monospace,monospace;letter-spacing:.14em;background:rgba(5,8,22,.55);border:1px solid rgba(182,255,59,.35);color:#b6ff3b;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.wlive i{width:7px;height:7px;border-radius:50%;background:#b6ff3b;box-shadow:0 0 0 0 rgba(182,255,59,.7);animation:wpulse 1.6s infinite}
@keyframes wpulse{0%{box-shadow:0 0 0 0 rgba(182,255,59,.7)}70%{box-shadow:0 0 0 9px rgba(182,255,59,0)}100%{box-shadow:0 0 0 0 rgba(182,255,59,0)}}
.wclk{font:700 1.5rem/1 "Geist Mono",ui-monospace,monospace;letter-spacing:-.02em;text-shadow:0 2px 12px rgba(0,0,0,.6);font-variant-numeric:tabular-nums}.wclk small{font-size:.6em;opacity:.65}
.whrow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.whc{position:relative;min-width:0;padding:10px 12px;border-radius:18px;background:linear-gradient(145deg,rgba(10,16,34,.42),rgba(10,16,34,.18));border:1px solid rgba(255,255,255,.22);-webkit-backdrop-filter:blur(7px) saturate(150%);backdrop-filter:blur(7px) saturate(150%);box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.25);cursor:pointer;opacity:0;transform:translateY(12px) scale(.97);animation:whin .6s cubic-bezier(.2,.8,.2,1) .25s forwards;overflow:hidden}
.whc+.whc{animation-delay:.4s}
@keyframes whin{to{opacity:1;transform:none}}
.whc::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.18) 50%,transparent 70%);transform:translateX(-120%);animation:wshine 6s ease-in-out 1.2s infinite;pointer-events:none}
@keyframes wshine{0%,70%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
.whc.wtap{animation:wtapk .45s cubic-bezier(.2,.8,.2,1);opacity:1}@keyframes wtapk{0%{transform:scale(.94)}100%{transform:none}}
.whc small{display:block;font:600 .6rem/1.2 "Geist Mono",ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#b6ff3b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.whv{display:flex;align-items:center;gap:6px;margin-top:4px}.wxi{font-size:1.5rem;line-height:1}.wxt{font:700 1.7rem/1 "Geist",system-ui;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.wxs{font-size:.7rem;color:#dbe3f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.wspk{display:block;width:100%;height:30px;margin-top:4px;overflow:visible}
.wspl{stroke-dasharray:1;stroke-dashoffset:1;animation:wdraw 1.6s ease-out .5s forwards;filter:drop-shadow(0 0 4px rgba(182,255,59,.8))}
.wspa{opacity:0;animation:whin .8s ease 1.4s forwards}
.wspd{opacity:0;animation:whin .3s ease .5s forwards}
@keyframes wdraw{to{stroke-dashoffset:0}}
.whkb{display:flex;align-items:center;gap:8px;margin-top:4px;min-height:34px}
.whbig{font:700 1.9rem/1 "Geist",system-ui;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.whu{font-size:.7rem;color:#dbe3f3;line-height:1.25}
.wring{position:relative;width:46px;height:46px;flex:none}.wring svg{width:100%;height:100%;transform:rotate(-90deg)}
.wrb{fill:none;stroke:rgba(255,255,255,.18);stroke-width:7}.wrf{fill:none;stroke:#b6ff3b;stroke-width:7;stroke-linecap:round;filter:drop-shadow(0 0 4px rgba(182,255,59,.7))}
.wgo .wrf{transition:stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1) .4s;stroke-dashoffset:var(--to)}
.wring b{position:absolute;inset:0;display:grid;place-items:center;font:700 .72rem/1 "Geist Mono",ui-monospace,monospace}
.whk2{margin-top:6px!important;color:#c9d1e3!important;opacity:.85}
.whbars{display:flex;align-items:flex-end;gap:4px;height:34px;margin-top:4px}.whbars.wtall{height:48px}
.whbars span{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:2px;min-width:0}
.whbars i{display:block;width:100%;height:var(--h);border-radius:4px 4px 2px 2px;background:linear-gradient(180deg,#b6ff3b,rgba(94,234,212,.55));box-shadow:0 0 8px rgba(182,255,59,.45);transform:scaleY(0);transform-origin:bottom;animation:wbar .7s cubic-bezier(.2,.8,.2,1) forwards}
.whbars span:last-child i{background:linear-gradient(180deg,#fff,#b6ff3b)}
.whbars em{font:600 .5rem/1 "Geist Mono",ui-monospace,monospace;font-style:normal;color:#c9d1e3;white-space:nowrap;overflow:hidden;max-width:100%}
@keyframes wbar{to{transform:scaleY(1)}}
.whn{display:flex;align-items:center;gap:8px;height:100%}
.wlc.por{justify-content:flex-start;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.wlc.por .wimg{display:flex;flex-direction:column;flex:1 0 auto;padding-bottom:30px}
.wlc.por .wimg::before{position:absolute}
.wlc.por .whud{position:relative;top:auto;left:auto;right:auto;margin:calc(62px + env(safe-area-inset-top,0px)) auto 0}
.wlc.por .wla{flex-wrap:nowrap;position:sticky;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:3;padding:8px;margin:12px -8px -8px;border-radius:20px;background:rgba(11,16,32,.88);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.wlc.por .wla>button{flex:1 1 auto;white-space:nowrap;min-width:0}.wlc.por .wla .wmore{flex:0 1 auto;white-space:normal;line-height:1.15}
.wlc.por .wcred{bottom:8px}.wlc.por .wlb{flex:none;max-height:none;overflow:visible}
@media (max-height:640px){.wlc.por .wspk{height:20px}.wlc.por .whbars{height:24px}.wclk{font-size:1.2rem}}
.wlc:not(.por) .whud{left:auto;right:28px;top:calc(56px + env(safe-area-inset-top,0px));width:420px}.wlc:not(.por) .wclk{font-size:2rem}.wlc:not(.por) .wlb{margin-left:28px;margin-right:auto}
.wlc.por .whud{max-width:640px;align-self:center;width:calc(100% - 28px)}.wlc.por .wlb{width:min(640px,calc(100% - 28px))}
.wltap{z-index:3}.wlc .wlx[hidden]{display:none!important}
.whsp{cursor:default;padding:8px 10px 10px}.whsp::before{display:none}.wsph{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.wsph span{display:flex;gap:6px;align-items:center;flex:none}.wspo{font-size:.72rem;font-weight:700;color:#d9f99d;text-decoration:none}
.wspc{min-height:30px!important;padding:0 10px!important;border-radius:999px!important;font-size:.72rem!important}
.wspf{display:block;width:100%;height:80px;border:0;border-radius:14px;background:transparent}
.wslot{height:83px;background:rgba(255,255,255,.04)}.wspn{font-size:.66rem;color:rgba(241,245,255,.7);margin-top:6px}
.wspw{position:relative;border-radius:16px;padding:1.5px;background:linear-gradient(135deg,rgba(182,255,59,.75),rgba(94,234,212,.55) 45%,rgba(255,255,255,.18));box-shadow:0 12px 30px rgba(0,0,0,.35),0 0 26px rgba(94,234,212,.18)}
.wspt{min-width:0}.wspt b{display:block;font:800 1.02rem/1.15 var(--f-ui,system-ui);letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wspt b i{font-style:normal}.wspt b span{background:linear-gradient(90deg,#fff,#d9f99d 55%,#5eead4);-webkit-background-clip:text;background-clip:text;color:transparent}
.wspr{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;margin:0 0 6px;padding-bottom:2px}.wspr::-webkit-scrollbar{display:none}
.wsprb{flex:none;min-height:30px!important;padding:0 10px!important;border-radius:999px!important;font-size:.7rem!important;white-space:nowrap}.wsprb{background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.05))!important;border:1px solid rgba(255,255,255,.26)!important;color:#f1f5ff!important;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:inset 0 1px 0 rgba(255,255,255,.25)!important}
.wsprb[aria-pressed=true]{background:linear-gradient(135deg,#d2ff6e,#5eead4)!important;color:#0b1510!important;border-color:transparent!important;font-weight:800;box-shadow:0 0 18px rgba(182,255,59,.35),inset 0 1px 0 rgba(255,255,255,.6)!important}
.wlx{position:absolute;z-index:5;top:calc(10px + env(safe-area-inset-top,0px));left:12px;width:44px;height:44px;min-height:44px!important;padding:0!important;border-radius:50%!important;background:rgba(5,8,22,.6)!important;border:1px solid rgba(255,255,255,.3)!important;color:#fff;font-size:1.1rem}
.wpst{margin-top:6px;font:500 .6rem/1.3 "Geist Mono",ui-monospace,monospace;color:#c9d1e3;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wpc b sup,.whu sup{font:700 .58rem/1 "Geist Mono",ui-monospace,monospace;margin-left:3px;vertical-align:super}.wup{color:#b6ff3b}.wdn{color:#fda4af}
.wfl{animation:wflash 1.6s ease}@keyframes wflash{0%,30%{background:rgba(182,255,59,.35);border-radius:8px}100%{background:transparent}}
.whpr{animation-delay:.55s!important}.whgr{animation-delay:.6s!important;overflow:hidden}.wdia{overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(186,230,253,.06) 40%,rgba(244,114,182,.08) 70%,rgba(255,255,255,.12))!important;border:1px solid transparent!important;
 background-clip:padding-box;box-shadow:0 0 0 1px rgba(255,255,255,.35) inset,0 0 26px rgba(125,211,252,.35),0 0 46px rgba(167,139,250,.22),0 14px 40px rgba(0,0,0,.35)!important;-webkit-backdrop-filter:blur(10px) saturate(180%) brightness(1.08)!important;backdrop-filter:blur(10px) saturate(180%) brightness(1.08)!important}
.wdia::before{content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1.5px;background:conic-gradient(from var(--wa,0deg),#7dd3fc,#f0abfc,#fde68a,#a7f3d0,#c4b5fd,#7dd3fc);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:wdspin 6s linear infinite;pointer-events:none;opacity:.9}
@property --wa{syntax:"<angle>";initial-value:0deg;inherits:false}@keyframes wdspin{to{--wa:360deg}}
.wdsh{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.28) 46%,rgba(255,255,255,.05) 52%,transparent 60%);transform:translateX(-120%);animation:wdshine 5.5s ease-in-out infinite}
@keyframes wdshine{0%,55%{transform:translateX(-120%)}80%,100%{transform:translateX(120%)}}
.wdia .wgrh small{color:#e0f2fe!important;text-shadow:0 0 10px rgba(125,211,252,.8)}
.wfv,.wdv{display:flex;gap:8px;align-items:baseline}.wfv b,.wdv b{font-weight:800;font-size:1rem;color:#fff;text-shadow:0 0 14px rgba(125,211,252,.9)}.wfv em,.wdv em{font-style:normal;font-size:.72rem;opacity:.85}
.wfc,.wdc{position:relative;height:90px;margin:8px 0 4px}.wdline{position:absolute;inset:0}.wfc span,.wdc span{position:absolute;font:600 .58rem "Geist Mono",ui-monospace,monospace;opacity:.75}
.wflg{right:0;bottom:-14px;display:flex;gap:4px;align-items:center}.wflg i{display:inline-block;width:10px;height:3px;border-radius:2px;background:var(--c);box-shadow:0 0 6px var(--c);margin-left:6px}
.wdbar{transform-origin:bottom;animation:wdgrow .8s cubic-bezier(.2,.8,.2,1) both;filter:drop-shadow(0 0 6px rgba(167,139,250,.8))}@keyframes wdgrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.wfl{display:grid;gap:4px;margin-top:16px}.wfr{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) auto;gap:2px 8px;align-items:center;font-size:.78rem}.wfr span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wfr i{height:5px;border-radius:3px;width:var(--w);background:linear-gradient(90deg,#22d3ee,#a78bfa);box-shadow:0 0 8px rgba(125,211,252,.8)}.wfr b{font-weight:800;font-variant-numeric:tabular-nums}.wfr .wfs{grid-column:1/-1;font-size:.62rem;opacity:.65;margin-top:-2px;font-style:normal}
.wfr.wfme span,.wfr.wfme b{color:#bae6fd;text-shadow:0 0 8px rgba(125,211,252,.8)}
.wfnav{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.wfbtn.wfnear{flex:1 1 100%;text-align:center;padding:4px 14px;background:linear-gradient(135deg,#d9f99d,#a7f3d0 55%,#bae6fd);box-shadow:0 0 16px rgba(167,243,208,.7)}.wfbtn{flex:1 1 130px;display:inline-flex;justify-content:center;align-items:center;min-height:42px;border-radius:999px;font-weight:800;font-size:.82rem;color:#0b1020!important;text-decoration:none;background:linear-gradient(135deg,#e0f2fe,#c4b5fd 55%,#f5d0fe);box-shadow:0 0 16px rgba(196,181,253,.7)}
.wfsrc{margin-top:8px;font-size:.6rem;opacity:.6}.wfsrc a{color:inherit}
.wdk{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:16px;font-size:.74rem}.wdk span{opacity:.9}.wdk b{color:#fff;text-shadow:0 0 10px rgba(182,255,59,.7)}
.wimg.wja{background-size:max(100vw,calc(100vh * 1.5)) auto!important;background-position:62% 0!important;background-repeat:no-repeat!important;background-color:#0b1020!important}.wlc:not(.por){overflow-y:auto}.wlc:not(.por) .wlsp{margin-left:28px;margin-right:auto;width:min(560px,calc(100vw - 520px))}.wlc:not(.por) .wimg{bottom:auto;min-height:100%}
.wgrh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.wgrv{display:flex;gap:8px;align-items:baseline;font-size:.92rem}.wgrv b{font-weight:800;text-shadow:0 0 12px currentColor}.wgrv em{font-style:normal;font-size:.74rem;opacity:.9}
.wgrc{position:relative;height:96px;margin:8px 0 4px}.wgsvg{width:100%;height:100%;overflow:visible;display:block}.wgln{animation:wgfade 1.2s ease-out both}@keyframes wgfade{from{opacity:0}to{opacity:1}}
.wgdot{animation:wgpulse 1.6s ease-in-out infinite}@keyframes wgpulse{0%,100%{opacity:1}50%{opacity:.35}}
.wgrc span{position:absolute;font:600 .58rem "Geist Mono",ui-monospace,monospace;opacity:.7;letter-spacing:.04em}.wgmx{top:-2px;left:0}.wgmn{bottom:0;left:0}.wgax{bottom:-14px;left:0}.wgnw{bottom:-14px;right:0}
.wgrs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-top:14px;padding-bottom:2px}.wgrs::-webkit-scrollbar{display:none}
.wgrs button{flex:0 0 auto;min-height:32px;padding:4px 11px;border-radius:999px;font:600 .74rem "Geist",system-ui,sans-serif;color:#e8eefc;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22)}
.wgrs button.on{color:#0b1020;background:var(--gc);border-color:transparent;box-shadow:0 0 14px var(--gc)}
.wlsp{position:relative;margin:0 auto calc(18px + env(safe-area-inset-bottom,0px));width:min(560px,calc(100% - 28px))}.wlsp .whc{background:#05070d;border-color:rgba(255,255,255,.12);-webkit-backdrop-filter:none;backdrop-filter:none;animation:none!important;opacity:1!important;transform:none!important}
.wlc.por .wlsp{width:min(640px,calc(100% - 28px))}
.whpl{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px 10px;margin-top:6px}
.wpc{position:relative;display:flex;justify-content:space-between;align-items:baseline;gap:6px;padding-bottom:5px;min-width:0}
.wpc em{font-style:normal;font-size:.72rem;color:#dbe3f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wpc b{font:700 .95rem/1 "Geist Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums;color:#fff}
.wpc i{position:absolute;left:0;bottom:0;height:2px;width:var(--w);border-radius:2px;background:linear-gradient(90deg,#b6ff3b,rgba(94,234,212,.6));box-shadow:0 0 6px rgba(182,255,59,.6);transform:scaleX(0);transform-origin:left;animation:wbarx .8s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes wbarx{to{transform:scaleX(1)}}
@media (prefers-reduced-motion:reduce){.wlc *{animation:none!important}.whc,.wspl,.wspa,.wspd{opacity:1!important;transform:none!important;stroke-dashoffset:0!important}.whbars i{transform:none!important}}
@media (min-width:900px){.wlb{margin-bottom:48px}}
.wlb{box-sizing:border-box}.wlt{min-width:0;max-width:100%}.wlt *{overflow-wrap:anywhere}
.wlc.por .wlb{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center;align-self:center;margin-left:auto!important;margin-right:auto!important;gap:8px}
.wlc.por .wlb>img{width:44px;height:44px}.wlc.por .wlt{width:100%}.wlc.por .wlt>*{margin-left:auto;margin-right:auto}
.wlc.por .wjk{text-align:left}.wlc.por .wla{justify-content:center;margin-left:0;margin-right:0}
.wlc.por .wla{flex-wrap:wrap}.wlc.por .wla>button[data-wlgo]{flex:1 0 auto;min-width:max-content;white-space:nowrap;overflow:visible}.wlc.por .wla>button.wmore{flex:1 1 140px;min-width:0;white-space:normal}`;document.head.appendChild(s)}
css();
let tries=0;const t=setInterval(()=>{tries++;const app=document.getElementById("app");
  if(kind()&&app&&app.children.length&&!document.querySelector(".pinmod")){clearInterval(t);setTimeout(()=>show(false),600)}
  if(tries>120)clearInterval(t)},500);
})();
// 📍 najbližšia čerpacia stanica od aktuálnej polohy (príkaz majiteľa 30. 10.) – Google Maps hľadá okolo GPS polohy telefónu
(function(){let G=null;const url=c=>c?`https://www.google.com/maps/search/%C4%8Derpacia+stanica/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},14z`:"https://www.google.com/maps/search/?api=1&query=%C4%8Derpacia%20stanica";
const fresh=()=>G&&Date.now()-G.at<6e5;
const geo=(cb,ms)=>{try{navigator.geolocation.getCurrentPosition(p=>{G={lat:p.coords.latitude,lng:p.coords.longitude,at:Date.now()};cb(G)},()=>cb(null),{enableHighAccuracy:false,timeout:ms||8000,maximumAge:3e5})}catch(x){cb(null)}};
try{navigator.permissions&&navigator.permissions.query({name:"geolocation"}).then(r=>{if(r.state==="granted")geo(()=>{},15000)}).catch(()=>{})}catch(x){}
const go=u=>{let w=null;try{w=window.open(u,"_blank","noopener")}catch(x){}if(!w)location.href=u};
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-wfnear]");if(!a)return;
  if(fresh()){a.href=url(G);return} // otvorí sa hneď s polohou
  if(!navigator.geolocation)return;e.preventDefault();e.stopPropagation();const t=a.textContent;a.textContent="📍 Zisťujem polohu…";
  geo(c=>{a.textContent=t;const u=url(c);a.href=u;go(u)})},true)})();
