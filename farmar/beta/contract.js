// ===== ERNTE · KÚPNA ZMLUVA podľa vzoru ERNTE (KZ K2026/1) + Príloha 1 (kvalita), Príloha 2 (GMP+), Príloha 3 (ISCC) =====
// Číslo zmluvy prideľuje databáza: J/R/P/S/K + rok + číslo klienta (napr. S2026/100). Majiteľ / obchod aj farmár (iba svoju).
(function(){
const KUP={n:"Ernte spol. s r. o.",a:"Zbudza 141, 072 23",ico:"52 341 356",dic:"2120988551",icdph:"SK2120988551",mail:"erntevykup@gmail.com",fmail:"jana.valkova@ernte.sk"};
const GEN={kukurica:"kukurice",soja:"sóje",psenica_p:"pšenice potravinárskej",psenica_k:"pšenice kŕmnej",jacmen_s:"jačmeňa sladovníckeho",jacmen_k:"jačmeňa kŕmneho",repka:"repky olejnej",lo:"slnečnice",ho:"slnečnice HO",cirok:"cirku"};
const NAM={kukurica:"Kukurica",soja:"Sója",psenica_p:"Pšenica potravinárska",psenica_k:"Pšenica kŕmna",jacmen_s:"Jačmeň sladovnícky",jacmen_k:"Jačmeň kŕmny",repka:"Repka olejná",lo:"Slnečnica",ho:"Slnečnica HO",cirok:"Cirok"};
const USE={psenica_p:"potravinárske",jacmen_s:"sladovnícke",repka:"priemyselné",lo:"priemyselné",ho:"priemyselné"};
const GMO={kukurica:1,soja:1,repka:1};
// Príloha 1 – podľa vzoru zmluvy a parametrov ERNTE (Sója/Kukurica/Pšenica parametre); [vlhkosť, nečistoty, škodlivé, ostatné, čistota, zlomky]
const Q={lo:[8,2,"–","–",98,"–"],kukurica:[14,2,"0,1",1,98,3],soja:[12,2,"–","–",98,5],psenica_k:[13,2,"–","–",98,"–"],psenica_p:[14,2,"–","–",98,"–"]};
// slnečnica (LO) – parametre podľa STN 46 2300-6 a STN 46 2300-1, metódy STN EN ISO
const XTRA={lo:[["Olejnatosť (obsah tuku)","min. 44,0 % – STN EN ISO 659"],["Vlhkosť","max. 8,0 % – STN EN ISO 665"],["Nečistoty","max. 2,0 % – STN EN ISO 658"],["Ostatné parametre","podľa STN 46 2300-6 a STN 46 2300-1"],["Zmyslové vlastnosti (vzhľad, pach, škodcovia)","podľa STN 46 1011-2 a STN 46 1011-3"],["Status","olejnatá slnečnica (LO), Non-GMO, na priemyselné spracovanie"]],
  soja:[["Bielkoviny v sušine (bez vody)","min. 38 %"],["Bielkoviny v pôvodnom stave","min. 33 %"],["Olej v sušine (bez vody)","min. 22 %"],["Olej v pôvodnom stave","min. 19 %"],["Status","udržateľná sója, Non-GMO"]],
  kukurica:[["Status","Non-GMO, kŕmne účely"],["Semená slnečnice a inváznych burín","neprípustné"]],
  psenica_k:[["Bielkoviny","min. 13 %"],["Objemová hmotnosť","min. 79 kg/hl"]],psenica_p:[["Bielkoviny","min. 13 %"],["Objemová hmotnosť","min. 79 kg/hl"]]};
const DEF_R={clean:2.5,dry:3.5,tol_pct:5};
let RUL=null;
async function rules(){if(RUL)return RUL;try{if(typeof FARMER!=="undefined"&&FARMER){const r=await sb.rpc("settle_contracts");RUL=Object.assign({},DEF_R,(r.data&&r.data.rules)||{})}
  else{const r=await sb.from("settle_rules").select("value").eq("key","main").maybeSingle();RUL=Object.assign({},DEF_R,(r.data&&r.data.value)||{})}}catch(e){RUL=Object.assign({},DEF_R)}return RUL}
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nf=(x,d=2)=>(+x).toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d});
const price=p=>Number.isInteger(+p)?(+p).toLocaleString("sk-SK")+",-":nf(p);
const tons=t=>Number.isInteger(+t)?(+t).toLocaleString("sk-SK"):nf(t,2);
const dmy=x=>{const d=x?new Date(x):new Date();return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."+d.getFullYear()};
const abs=p=>{try{return new URL(p,location.href).href}catch(x){return p}};
const dots=(v,n=60)=>v?e(v):".".repeat(n);
const term=(t,y)=>{if(!t)return `31/12/${y}`;const m=String(t).match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);return m?`${m[1].padStart(2,"0")}/${m[2].padStart(2,"0")}/${m[3]}`:e(t)};
function html(d,F,R,ST,FS){const S=(typeof SPEC!=="undefined"&&SPEC[d.com])||[14,2],y=new Date(d.created_at||Date.now()).getFullYear(),q=Q[d.com]||[S[0],S[1],"–","–","–","–"];
  const signDate=dmy(d.created_at),clean=nf(R.clean??2.5),dry=nf(R.dry??3.5),X=XTRA[d.com]||[];
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Kúpna zmluva ${e(d.no)} – ${e(F.name)}</title><style>
  @page{size:A4;margin:14mm 16mm 16mm}*{box-sizing:border-box}body{font:10.5pt/1.45 "Times New Roman",Georgia,serif;color:#111;margin:0;max-width:178mm;margin:0 auto;padding:8px}
  .hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #6a9a1f;padding-bottom:6px;margin-bottom:12px;font:9pt Arial,sans-serif;color:#444}.hdr img{height:34px}
  h1{text-align:center;font-size:15pt;margin:6px 0 2px;letter-spacing:.04em}.no{text-align:center;font-weight:700;font-size:12pt;margin:0 0 6px}.c{text-align:center}
  h2{text-align:center;font-size:11pt;margin:14px 0 6px}p{margin:3px 0;text-align:justify}ol{margin:4px 0 4px 0;padding-left:22px}li{margin:3px 0;text-align:justify}
  .pt p{text-align:left;margin:1px 0}.b{font-weight:700}
  .sg{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:22px;page-break-inside:avoid}.sg>div{text-align:center;display:flex;flex-direction:column;justify-content:flex-end;min-height:120px}
  .sg .ln{border-top:1px dotted #333;padding-top:4px}.sg small{display:block;color:#555;font-size:8.5pt}.stp{display:block;margin:0 auto -4px;height:105px;width:auto;mix-blend-mode:multiply}.fsg{height:80px}
  .pg{page-break-before:always;break-before:page}.at{font-weight:700;margin-top:6px}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #444;padding:4px 6px;text-align:center;font-size:9.5pt}td.l,th.l{text-align:left}
  .iscc td{text-align:left;vertical-align:top}.iscc .cb{width:52px;text-align:center}.box{display:inline-block;width:12px;height:12px;border:1px solid #333;vertical-align:middle;margin-right:6px}
  .ft{margin-top:14px;font:8pt Arial,sans-serif;color:#777;text-align:center}.isl{height:40px;float:right}.pb{text-align:center;margin:16px 0}@media print{.pb{display:none}body{padding:0}}
  </style></head><body>
  <div class="hdr"><img src="${e(abs("logo.png"))}" alt="ERNTE"><span>Ernte spol. s r. o. ● GMP+ ● ISCC-EU ● QS</span></div>
  <h1>KÚPNA ZMLUVA</h1><div class="no">č: ${e(d.no)}</div>
  <p class="c">uzatvorená podľa § 409 a nasl. zákona č. 513/1991 Zb. Obchodný zákonník (ďalej len ako „zmluva”) medzi nasledujúcimi zmluvnými stranami:</p>
  <h2>I. ZMLUVNÉ STRANY</h2>
  <div class="pt"><p>${e(KUP.n)}</p><p>so sídlom ${e(KUP.a)}</p><p>IČO: ${e(KUP.ico)}</p><p>DIČ: ${e(KUP.dic)}</p><p>IČ DPH: ${e(KUP.icdph)}</p><p>Email: ${e(KUP.mail)}</p><p>Fakturačný email: ${e(KUP.fmail)}</p><p class="b">- ako Odberateľ.</p><br>
  <p>Obchodné meno: ${dots(F.name)}</p><p>IČO: ${dots(F.ico,30)}</p><p>DIČ: ${dots(F.dic,30)}</p><p>IČ DPH: ${dots(F.icdph,30)}</p><p>Číslo účtu: ${dots(F.iban,82)}</p><p>Sídlo: ${dots(F.addr)}</p><p>Tel. číslo: ${dots(F.phone,82)}</p><p>Email : ${dots(F.email,40)}</p>
  <p class="b">– ďalej ako Dodávateľ za nižšie uvedených podmienok:</p></div>
  <h2>II. PREDMET ZMLUVY A MNOŽSTVO</h2>
  <ol><li class="b">Zmluvné strany sa dohodli, že Dodávateľ v roku ${y} vypestuje / dodá ${tons(d.tons)} t ${e(GEN[d.com]||d.com)}${GMO[d.com]?" (Non-GMO)":""} a predá pre ${USE[d.com]||"kŕmne"} účely pre Odberateľa.</li></ol>${d.note?`<p>Pozn. ${e(d.note)}</p>`:""}
  <h2>III. TERMÍN A MIESTO PLNENIA</h2>
  <ol><li class="b">Miestom plnenia sú : FCA sklady Dodávateľa</li><li class="b">Konečný termín plnenia je do : ${term(d.term,y)}</li>
  <li>Odovzdanie a prevzatie predmetu zmluvy, vrátane určenia množstva a kvality, sa uskutoční v mieste skladových priestorov Odberateľa. Rozhodujúce sú merania a kontrola vykonané u Odberateľa.</li>
  <li>Dodávateľ zabezpečí odovzdanie predmetu zmluvy do nákladných vozidiel zabezpečených Odberateľom, pričom preprava predmetu zmluvy do sídla (skladových priestorov) Odberateľa je zabezpečená Odberateľom.</li>
  <li>Zmluvné strany sa dohodli, že v prípade, ak sa po dodaní komodity preukáže jej nekvalita, ktorú nie je možné odstrániť, upraviť ani kompenzovať dostupnými technologickými alebo výrobnými postupmi odberateľa, považuje sa takáto komodita za technologicky nespracovateľnú. V takomto prípade znáša dodávateľ všetky náklady vzniknuté odberateľovi, najmä náklady na dopravu vrátane spätného odvozu, ako aj akékoľvek ďalšie preukázateľné náklady súvisiace s touto nekvalitou. Odberateľ nie je povinný takúto komoditu spracovať ani prevziať a je oprávnený ju na náklady dodávateľa odmietnuť, vrátiť alebo zabezpečiť jej likvidáciu. Týmto ustanovením nie sú dotknuté práva odberateľa na náhradu škody ani právo odstúpiť od zmluvy podľa príslušných ustanovení Obchodného zákonníka.</li>
  <li>Kvalita, množstvo a hmotnosť dodaného predmetu zmluvy sa zisťujú a overujú u Odberateľa pri jeho prevzatí. Zistená kvalita zmluvy bude akceptovaná obidvoma zmluvnými stranami a po prevzatí ju nie je možné dodatočne spochybňovať.</li>
  <li>V prípade rozdielnych názorov zmluvných strán na kvalitu predmetu zmluvy sa odoberie reprezentatívna vzorka, ktorá sa zapečatí za účasti oboch zmluvných strán a odošle sa na odborný rozbor na SGS Slovakia spol. s r. o. Košice.</li>
  <li>Náklady na vykonanie rozboru znáša tá zmluvná strana, ktorej tvrdenie o kvalite predmetu zmluvy sa podľa výsledkov rozboru preukáže ako nepravdivé.</li></ol>
  <h2>IV. KVALITA, VZORKOVANIE a ZRÁŽKY</h2>
  <ol><li>Kúpna cena je stanovená pre normovanú kvalitu. Kvalita predmetu zmluvy musí zodpovedať kritériám uvedeným v prílohe č.1 tejto zmluvy. V prípade vyššieho obsahu vlhkosti/ nečistôt ako je povolená, Odberateľ zabezpečí sušenie/čistenie a náklady odpočíta z kúpnej ceny. Predmet zmluvy, ktorý nebude zodpovedať kvalitatívnym kritériám, nie je povinný Odberateľ kúpiť.</li>
  <li class="b">Pri odchýlkach sa uplatňuje kvalitatívna zrážka:</li><li class="b">Čistenie : ${clean} € / t</li><li class="b">Sušenie : ${dry} € / t za každé % vlhkosti nad normu</li><li>Kvalitatívna zrážka nie je úhradou za službu, ale úpravou množstva.</li></ol>
  <h2>V. CENA A PLATOBNÉ PODMIENKY</h2>
  <ol><li class="b">Zmluvné strany sa dohodli na cene: ${price(d.price)} eur/ t bez DPH.</li><li>Odberateľ sa zaväzuje, že po odovzdaní a prevzatí predmetu zmluvy a po prevzatí faktúry do 14 dní od doručenia zaplatí dodávateľovi dohodnutú kúpnu cenu.</li></ol>
  <h2>VI. POVINNOSŤ DODAŤ, PEVNÁ CENA A ZMLUVNÉ SANKCIE</h2>
  <ol><li class="b">Kúpna cena podľa bodu V.1 je pevná a nemenná počas celej doby trvania zmluvy. Zmena trhových alebo burzových cien (napr. MATIF, CBOT, ponuky iných odberateľov) po uzavretí zmluvy nie je dôvodom na zmenu kúpnej ceny, na odmietnutie alebo odklad dodávky, ani na odstúpenie od zmluvy. Riziko zmeny trhových cien znáša každá zmluvná strana sama; zmluvné strany sa vzdávajú práva domáhať sa zmeny zmluvy pre podstatnú zmenu okolností.</li>
  <li>Dodávateľ vyhlasuje, že dohodnuté množstvo predmetu zmluvy nie je predmetom inej zmluvy, nie je zaťažené právami tretích osôb a do splnenia tejto zmluvy ho nepredá ani neprisľúbi tretej osobe.</li>
  <li>Dodávateľ je povinný sprístupniť predmet zmluvy na nakládku najneskôr do 10 dní od výzvy Odberateľa, najneskôr však v termíne podľa bodu III.2. Výzvu môže Odberateľ urobiť aj prostredníctvom aplikácie ERNTE, e-mailom, SMS alebo telefonicky; výzva sa považuje za doručenú dňom jej odoslania.</li>
  <li>Dodané množstvo sa považuje za splnené pri odchýlke najviac ± 5 % od dohodnutého množstva. Nedodané množstvo nad túto toleranciu je omeškaním Dodávateľa.</li>
  <li class="b">Ak Dodávateľ nedodá predmet zmluvy riadne a včas, najmä ak odmietne dodávku, je Odberateľ oprávnený zabezpečiť náhradný nákup u tretej osoby a Dodávateľ je povinný uhradiť Odberateľovi rozdiel medzi cenou náhradného nákupu a kúpnou cenou podľa tejto zmluvy, ako aj náklady spojené s náhradným nákupom a dopravou (§ 470 Obchodného zákonníka).</li>
  <li class="b">Za každú nedodanú tonu nad toleranciu podľa bodu VI.4 je Dodávateľ povinný zaplatiť Odberateľovi zmluvnú pokutu vo výške 20 % z kúpnej ceny nedodaného množstva. Zaplatením zmluvnej pokuty nie je dotknutý nárok Odberateľa na náhradu škody v plnej výške, ani povinnosť Dodávateľa dodať predmet zmluvy.</li>
  <li>Za okolnosť vylučujúcu zodpovednosť sa nepovažuje zmena trhových cien ani nižšia než očakávaná úroda. Ak Dodávateľ nemôže dodať pre živelnú pohromu, je povinný to Odberateľovi písomne oznámiť do 7 dní od jej vzniku a preukázať ju dokladom (napr. potvrdením poisťovne alebo príslušného orgánu); v takom prípade sa dodávané množstvo primerane zníži.</li>
  <li>Odberateľ je oprávnený započítať svoje pohľadávky zo zmluvnej pokuty, náhrady škody a kvalitatívnych zrážok voči pohľadávke Dodávateľa na zaplatenie kúpnej ceny.</li></ol>
  <h2>VII. INFORMAČNÁ POVINNOSŤ</h2>
  <ol><li>Zmluvné strany sú povinné informovať sa navzájom o takých skutočnostiach ktoré majú vplyv na plnenie práv a povinnosti vyplývajúcich z tejto zmluvy.</li></ol>
  <h2>VIII. ZÁVEREČNÉ USTANOVENIA</h2>
  <ol><li>Zmluvné strany sa dohodli, že od tejto zmluvy nemôže žiadna zmluvná strana jednostranne odstúpiť alebo vypovedať. Táto zmluva môže byť skončená iba dohodou zmluvných strán.</li>
  <li>V prípade porušenia povinností uvedených v tejto zmluve, vypovedania alebo odstúpenia od tejto zmluvy, je zmluvná strana, ktorá odstúpila alebo vypovedala zmluvu, povinná zaplatiť zmluvnú pokutu. Výška zmluvnej pokuty je 20 % z celkovej kúpnej ceny určenej podľa bodu V.1 tejto zmluvy a dohodnutého množstva.</li>
  <li>Zmluvné strany súhlasia, že zmluvu možno uzavrieť aj elektronicky podpisom v aplikácii ERNTE; takýto podpis má rovnaké účinky ako vlastnoručný podpis. Zmluva je vyhotovená v dvoch rovnopisoch, každá zmluvná strana dostane jeden.</li>
  <li>Prípadné spory vyplývajúce z tejto zmluvy je oprávnený bez ohľadu na výšku predmetu plnenia vyplývajúcu z tejto zmluvy riešiť Okresný súd Michalovce. Na práva a povinností vyplývajúce z tejto zmluvy sa vzťahujú ustanovenia Obchodného zákonníka.</li></ol>
  <p>V Zbudzi, dňa ${e(signDate)}</p>
  <div class="sg"><div>${FS?`<img class="stp fsg" src="${e(FS.img)}" alt="Podpis dodávateľa">`:""}<div class="ln">Dodávateľ<small>${e(F.name)}${FS&&FS.name?` · ${e(FS.name)}`:""}</small>${FS?`<small>podpísané elektronicky v aplikácii ERNTE ${e(new Date(FS.at).toLocaleString("sk-SK"))}</small>`:""}</div></div>
   <div>${ST?`<img class="stp" src="${e(ST)}" alt="Pečiatka a podpis ERNTE">`:""}<div class="ln">Odberateľ<small>${e(KUP.n)}</small></div></div></div>

  <div class="pg"></div><div class="hdr"><img src="${e(abs("logo.png"))}" alt="ERNTE"><span>Ernte spol. s r. o. ● GMP+ ● ISCC-EU ● QS</span></div>
  <p class="at">Príloha číslo 1.</p><h2>KVALITATÍVNE PREDPISY</h2>
  <table><thead><tr><th rowspan="2" class="l">Názov</th><th rowspan="2">Vlhkosť max %</th><th rowspan="2">Nečistoty max %</th><th colspan="2">Z toho</th><th rowspan="2">Čistota min %</th><th rowspan="2">Zlomky zŕn spolu hmot. % najviac</th></tr><tr><th>škodlivé %</th><th>ostatné %</th></tr></thead>
  <tbody><tr><td class="l b">${e(NAM[d.com]||d.com)}</td>${q.map(v=>`<td class="b">${e(String(v).replace(".",","))}</td>`).join("")}</tr></tbody></table>
  ${X.length?`<table><tbody>${X.map(r=>`<tr><td class="l">${e(r[0])}</td><td class="l b">${e(r[1])}</td></tr>`).join("")}</tbody></table>`:""}
  <p class="b c">Toxintartalom - Obsah toxínov</p><p class="b">MAXIMUM</p>
  <table><tbody>${[["DON","1,5 mg/kg"],["F2","0,1 mg/kg"],["T2","0,1 mg/kg"],["Ochratoxin A","0,25 mg/kg"],["Aflatoxin B1","0,02 mg/kg"],["Fumonizin B1 + B2","20 mg/kg"]].map(r=>`<tr><td class="l">${r[0]}</td><td class="l">${r[1]}</td></tr>`).join("")}</tbody></table>
  <p class="b">Produkt nesmie obsahovať:</p>
  <p>Produkt je zdravý, suchý, čistený, bez živých škodcov, cudzích zápachov, karanténnych objektov, bez plesní, hniloby.</p>
  <p>V produkte sa nenachádzajú zbytky chemikálií, ťažké kovy, toxíny, dioxíny, rádioaktivita, semená burín, a hranice fungicídnych ochorení sú v rozmedzí EU noriem a nariadení, takisto vyhovuje všetkým EU nariadeniam a smerniciam týkajúcim sa zdravia rastlín a živočíchov.</p>
  <p class="b" style="margin-top:10px">Príloha č. 1. je neoddeliteľnou súčasťou zmluvy.</p>

  <div class="pg"></div><div class="hdr"><img src="${e(abs("logo.png"))}" alt="ERNTE"><span>Ernte spol. s r. o. ● GMP+ ● ISCC-EU ● QS</span></div>
  <p class="at">Príloha číslo 2</p><p class="b c">ERNTE, spol. s r.o. 072 23 Zbudza 141</p>
  <p class="b c">Súhlas na poľnohospodárske produkty medzi<br>GMP + certifikovaným odberateľom a farmárom</p><br>
  <p class="b">Prehlásenie bezpečnosti dodaného produktu farmára</p><p class="b">Meno : ${dots(F.name)}</p><p class="b">Adresa : ${dots(F.addr)}</p><br><p class="b">Prehlasuje:</p>
  <ol><li><b>Agrokomodity dodávané farmou sú požadovanej kvality a nepredstavujú žiadne</b> zdravotné riziko ani pre ľudí ani pre zvieratá</li><li><b>Agrokomodity – boli ošetrované v súlade s legislatívou</b></li><li><b>Akékoľvek sušenie a čistenie bolo vykonané v zariadení určenom na tento účel</b></li>
  <li><b>Agrokomodity sú sledované počas celého procesu rastu, zberu, prepravy a skladovania</b> a oddelené od komodít na iné ako kŕmne a potravinárske účely</li><li><b>Dodávka neobsahuje žiadne zakázané látky ako hnoj, močovinu, semená kontaminované</b> pesticídmi, živočíšnymi produktmi a kal</li>
  <li><b>Agrokomodity musia vyhovovať normám pre – obsah nežiaducich látok, kŕmnych</b> materiálov viď legislatíva SR, EU a GMP +</li><li><b>Neobsahuje bielkoviny živočíšneho pôvodu</b></li><li><b>Agrokomodity sú ošetrené a spĺňajú hygienické požiadavky na kŕmne materiály – sú bez</b> salmonel</li>
  <li><b>Agrokomodity sú prepravované v hygienicky nezávadnými dopravnými prostriedkami</b></li><li><b>Ak agrokomodita nespĺňa niektoré z horeuvedených požiadaviek – bude informovaný</b> odberateľ</li><li><b>Ostatné stanovené požiadavky GMP+ zákazníka berieme na vedomie.</b></li></ol><br>
  <div class="sg"><div><div class="ln">Miesto a dátum<small>${FS?`aplikácia ERNTE, ${e(dmy(FS.at))}`:""}</small></div></div><div>${FS?`<img class="stp fsg" src="${e(FS.img)}" alt="Podpis">`:""}<div class="ln">Podpis<small>${e(F.name)}</small></div></div></div>

  <div class="pg"></div><img class="isl" src="${e(abs("img/iscc.jpg"))}" alt="ISCC">
  <p class="at">Príloha číslo 3</p><p class="b">Čestné vyhlásenie / samohodnotenie ISCC EÚ<br>Farma/plantáž EÚ (krížový súlad)</p>
  <table class="iscc"><tbody>${[["Meno pestovateľa",F.name],["Obchodný názov farmy/názov lokality",F.name],["Adresa",F.addr],["PSČ, mesto, krajina",""],["Plodiny (odchádzajúci materiál)",NAM[d.com]||d.com],["Celková rozloha farmy (v ha)",""],["Geosúradnice farmy, vrátane prenajatých fariem (zemepisná šírka, zemepisná dĺžka) – v desatinných stupňoch, napr. (-)XX.YYYYYY, (-)XX.YYYYYY",""],["Región NUTS II (ak existuje)",""],["Maximálna odhadovaná kapacita za rok (v mt)",""],["Maximálna odhadovaná udržateľná kapacita za rok (v mt)",""]].map(r=>`<tr><td style="width:48%">${e(r[0])}</td><td>${e(r[1]||"")}</td></tr>`).join("")}</tbody></table>
  <p class="b">Označte príslušnú kolónku:</p>
  <table class="iscc"><thead><tr><th>Č.</th><th>Požadovaná dokumentácia a informácie</th><th class="cb">Áno</th><th class="cb">Nie</th></tr></thead><tbody>
  <tr><td>1</td><td>Dokumentácia je k dispozícii na preukázanie súladu s požiadavkami ISCC (ISCC System GmbH)* vrátane máp všetkých oblastí, ich veľkostí, zákonného práva vykonávať poľnohospodársku činnosť, zmluvných dohôd so subdodávateľmi a prvých zberných bodov, dodacích listov/vážnych lístkov pre prvé zberné body.</td><td class="cb"><span class="box"></span></td><td class="cb"><span class="box"></span></td></tr>
  <tr><td>2</td><td>Potvrdzujete, že od 1. 1. 2008 nedošlo k žiadnej premene pôdy na akúkoľvek kategóriu pôdy chránenú podľa zásady 1 ISCC (vzťahuje sa na celú vlastnú a prenajatú pôdu)?<br><small>Podľa zásady 1 ISCC kategórie pôdy chránené pred konverziou zahŕňajú: primárne lesy, inú zalesnenú pôdu, staré lesné porasty, lesy s vysokou biologickou rozmanitosťou, oblasti určené zákonom alebo príslušným orgánom na účely ochrany prírody, oblasti na ochranu vzácnych, ohrozených alebo ohrozených ekosystémov alebo druhov, trávne porasty s vysokou biologickou rozmanitosťou, vresoviská, mokrade, trvalo zalesnené oblasti, zalesnené oblasti s 10 – 30 % pokrytím plochy korunami stromov, rašeliniská.</small></td><td class="cb"><span class="box"></span></td><td class="cb"><span class="box"></span></td></tr>
  <tr><td>3</td><td>Postavenie pestovateľa v rámci krížového plnenia (Cross Compliance, CC) možno preukázať príslušnou dokumentáciou (napr. kópiou formulára krížového plnenia). V prípade, že táto požiadavka nie je splnená, musí sa použiť čestné vyhlásenie/samohodnotenie EÚ podľa ISCC pre farmy/plantáže mimo EÚ.</td><td class="cb"><span class="box"></span></td><td class="cb"><span class="box"></span></td></tr></tbody></table>
  <p class="b">Označte príslušnú kolónku:</p><p><span class="box"></span>Súčasná štandardná hodnota sa používa na deklarovanie emisií skleníkových plynov.</p><p><span class="box"></span>Skutočný výpočet sa používa na deklarovanie emisií skleníkových plynov.</p>
  <p class="b c" style="margin-top:8px">Podpisom tohto čestného vyhlásenia/samohodnotenia signatár berie na vedomie a potvrdzuje:</p>
  <ol><li>Týmto potvrdzujem, že všetky právne záväzky sú splnené a že moje prevádzky na celom mojom vlastnenom a prenajatom pozemku spĺňajú požiadavky ISCC*. Ďalej súhlasím s tým, že audítori z certifikačných orgánov alebo ISCC môžu overiť súlad s požiadavkami ISCC v mojich prevádzkových priestoroch.</li>
  <li><b>Dôkazy / zistenia vyššie uvedených požiadaviek sú ľahko dostupné a môžu byť poskytnuté počas auditu a na požiadanie. V prípade, ak sa ukáže, že požiadavky sa neplnia (napr. písomné podklady nie sú k dispozícii alebo nie sú úplné), je povinné vyplniť navyše samostatný zoznam nezhôd a definovať nápravné opatrenia.</b></li>
  <li>Toto čestné vyhlásenie a informácie v ňom uvedené môžu byť postúpené, a to aj na preskúmanie alebo ďalšie spracovanie, prvému zbernému bodu alebo akémukoľvek relevantnému prvku dodávateľského reťazca, certifikačnému orgánu, ISCC, príslušným orgánom alebo dozorným orgánom alebo, ak to vyžaduje zákon, akejkoľvek inej inštitúcii alebo subjektu, takýmto orgánom alebo tretím stranám konajúcim v mene týchto orgánov alebo subjektov na zabezpečenie a presadzovanie súladu.</li>
  <li>Beriem na vedomie a súhlasím s tým, že všetky informácie týkajúce sa mojej farmy/plantáže, ktoré sprístupním iným prvkom dodávateľského reťazca certifikovaným podľa ISCC, môžu tieto prijímajúce prvky dodávateľského reťazca sprístupniť svojim certifikačným orgánom a ISCC.</li>
  <li>Informácie uvedené v tomto čestnom vyhlásení a informácie uvedené vo vyhlásení 4 môžu byť postúpené do akejkoľvek databázy prevádzkovanej Európskou úniou alebo ktorýmkoľvek z jej členských štátov alebo v ich mene, napr. do databázy Únie pre biopalivá (UDB), a akémukoľvek poskytovateľovi služieb, ktorý poskytuje prístup k údajom v takejto databáze alebo uľahčuje zaobchádzanie s nimi.</li>
  <li>Zaručujem, že mám právny základ alebo som získal súhlas fyzických osôb, ktorých osobné údaje (napr. meno, kontaktné údaje) sú zahrnuté v tomto čestnom vyhlásení, s uvedením takýchto osobných údajov v tomto vyhlásení a s ich zverejnením a postúpením v súlade s podmienkami uvedenými v tomto čestnom vyhlásení.</li>
  <li>Všetku dokumentáciu, ktorá je primerane potrebná na podporu informácií uvedených v tomto čestnom vyhlásení, poskytnem okamžite na požiadanie akémukoľvek relevantnému prvku dodávateľského reťazca, certifikačnému orgánu, ISCC alebo akémukoľvek príslušnému orgánu alebo dozornému orgánu. Táto povinnosť trvá päť (5) rokov po uplynutí platnosti tohto čestného vyhlásenia.</li>
  <li>Všetky informácie uvedené v tomto čestnom vyhlásení sú správne, aktuálne, úplné, plne zdokumentované a verne zobrazujú skutočný stav. Takáto dokumentácia musí byť k dispozícii päť (5) rokov po uplynutí platnosti tohto čestného vyhlásenia.</li>
  <li>Toto čestné vyhlásenie a akýkoľvek spor týkajúci sa vyhlásení alebo informácií obsiahnutých v tomto čestnom vyhlásení a jeho použitie sa riadi a vykladá výlučne v súlade s právnymi predpismi Spolkovej republiky Nemecko bez toho, aby došlo k akémukoľvek konfliktu právnych zásad alebo pravidiel, a s výnimkou uplatňovania Dohovoru Organizácie Spojených národov o zmluvách o medzinárodnej kúpe tovaru (CISG). Príslušné súdy v Kolíne nad Rýnom v Nemecku majú výlučnú právomoc rozhodovať o akomkoľvek spore týkajúcom sa vyhlásení alebo informácií uvedených v tomto čestnom vyhlásení a jeho použití.</li></ol>
  <p>V prípade akéhokoľvek rozporu medzi anglickou jazykovou verziou a preloženou verziou tohto dokumentu platí anglická jazyková verzia a je záväzná pre strany zúčastnené v tomto čestnom vyhlásení.</p>
  <div class="sg"><div><div class="ln">Miesto, dátum<small>${FS?`aplikácia ERNTE, ${e(dmy(FS.at))}`:""}</small></div></div><div>${FS?`<img class="stp fsg" src="${e(FS.img)}" alt="Podpis pestovateľa">`:""}<div class="ln">Podpis (pestovateľ)<small>${e(F.name)}</small></div></div></div>
  <p style="font-size:8.5pt;margin-top:10px">* Požiadavky ISCC a systémové dokumenty sú k dispozícii na webovej stránke ISCC (www.iscc-system.org).</p>
  <div class="ft">Verzia 2.0, od 30. septembra 2025 · © ISCC System GmbH<br>Zmluva č. ${e(d.no)} · vygenerované v aplikácii ERNTE Trade &amp; Logistic ${e(dmy())}</div>
  <div class="pb"><button onclick="print()" style="font-size:15px;padding:10px 18px">🖨️ Tlačiť / uložiť ako PDF</button></div></body></html>`}
async function open(id){const d=(STATE.deals||[]).find(x=>x.id===id);if(!d){toast("Zmluva sa nenašla.");return}
  const F=(typeof FARMER!=="undefined"&&FARMER)?FARMER:((STATE.farmers||[]).find(f=>f.id===d.farmer_id)||{name:""});
  if(!(typeof FARMER!=="undefined"&&FARMER)){const me=(typeof ME!=="undefined"&&ME&&ME.staffName)||"ERNTE",cn=typeof comName==="function"?comName(d.com):d.com;
    window.__pvMail=window.__pvMail||{to:F.email||"",deal:d.id,subj:`Kúpna zmluva ${d.no||""} – ERNTE spol. s r.o.`,
      body:`Dobrý deň,\n\nv prílohe Vám posielam kúpnu zmluvu ${d.no||""}: ${String(cn).toLowerCase()} ${d.tons} t za ${d.price} €/t${d.term?", vývoz "+d.term:""}.\nProsím o podpis a vrátenie. Zmluvu môžete podpísať aj v aplikácii ERNTE (Podpísať teraz).\n\nĎakujem\n${me} · ERNTE spol. s r.o.\n\n👉 ERNTE Trade & Logistic: ${typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0]}`}}
  const w=window.open("","_blank");if(!w){toast("Povoľ vyskakovacie okná pre zmluvu.");return}w.document.write("<p style='font:16px sans-serif;padding:20px'>Pripravujem zmluvu…</p>");
  const R=await rules();const okI=v=>typeof v==="string"&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v)?v:null;let ST=null,FS=null;
  try{const r=await sb.rpc("contract_sigs",{p_deal:d.id});if(!r.error&&r.data){ST=okI(r.data.ernte);if(okI(r.data.farmer))FS={img:okI(r.data.farmer),name:r.data.name,at:r.data.signed_at}}
    else{const q=await sb.rpc("contract_stamp",{p_deal:d.id});if(!q.error)ST=okI(q.data)}}catch(x){}
  let H=html(d,F,R,ST,FS);if(window.contractBi){try{H=await window.contractBi(H,d,F,w)}catch(x){}}w.document.open();w.document.write(H);w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(x){}},900)}
window.contractPdf=open;window.contractHTML=html;
// ---------- ARCHÍV ZMLÚV: podľa farmára a komodity, všetky zmluvy aj spätne ----------
const STN={navrh:"čaká na podpis",podpisany:"podpísaná",odvoz:"odvoz beží",odvezeny:"odvezená",fakturacia:"fakturácia",zaplateny:"zaplatená",zruseny:"zrušená"};
let AQ="";
function fnm(id){const f=(STATE.farmers||[]).find(x=>x.id===id);return f?f.name:"(farmár)"}
function archHTML(){const q=AQ.trim().toLowerCase(),G={};
  for(const d of (STATE.deals||[])){const n=fnm(d.farmer_id);if(q&&!(n+" "+d.no+" "+(NAM[d.com]||d.com)).toLowerCase().includes(q))continue;(G[n]=G[n]||{id:d.farmer_id,L:[]}).L.push(d)}
  const keys=Object.keys(G).sort((a,b)=>a.localeCompare(b,"sk"));
  return `<div class="cabox"><div class="cahd"><b>📁 Archív zmlúv (${(STATE.deals||[]).length})</b><button type="button" class="cax" data-caclose aria-label="Zavrieť">✕</button></div>
   <input type="search" id="caQ" value="${e(AQ)}" placeholder="Hľadať farmára, číslo zmluvy alebo komoditu" aria-label="Hľadať">
   <div class="s">Každá zmluva sa vytvorí z obchodu podľa vzoru ERNTE – s prílohami 1–3, cenou, množstvom a podpismi. Platí aj pre staršie obchody.</div>
   ${keys.length?keys.map(k=>{const g=G[k];g.L.sort((a,b)=>String(a.com).localeCompare(b.com)||String(a.no).localeCompare(b.no));
     return `<div class="caf"><div class="cafh"><b>${e(k)}</b><button type="button" data-cpall="${e(g.id)}">📚 Všetky (${g.L.length})</button></div>${g.L.map(d=>`<div class="car"><span class="cano">${e(d.no)}</span><span>${e(NAM[d.com]||d.com)}</span><span>${tons(d.tons)} t</span>${d.price!=null?`<span>${nf(d.price)} €/t</span>`:""}<span class="cast">${e(STN[d.status]||d.status||"")}</span><button type="button" data-cpdf="${e(d.id)}">📄 PDF</button></div>`).join("")}</div>`}).join(""):`<div class="s">Nič sa nenašlo.</div>`}</div>`}
function archOpen(){let m=document.getElementById("caMod");if(!m){m=document.createElement("div");m.id="caMod";m.className="camod2";document.body.appendChild(m)}m.innerHTML=archHTML();const i=m.querySelector("#caQ");if(i&&AQ){i.focus();i.setSelectionRange(AQ.length,AQ.length)}}
async function openAll(fid){const L=(STATE.deals||[]).filter(d=>d.farmer_id===fid&&d.status!=="zruseny");if(!L.length)return;const F=(STATE.farmers||[]).find(f=>f.id===fid)||{name:""};
  const w=window.open("","_blank");if(!w){toast("Povoľ vyskakovacie okná.");return}w.document.write("<p style='font:16px sans-serif;padding:20px'>Pripravujem zmluvy…</p>");
  const R=await rules();const okI=v=>typeof v==="string"&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v)?v:null;let head="",body="";
  for(const d of L){let ST=null,FS=null;try{const r=await sb.rpc("contract_sigs",{p_deal:d.id});if(!r.error&&r.data){ST=okI(r.data.ernte);if(okI(r.data.farmer))FS={img:okI(r.data.farmer),name:r.data.name,at:r.data.signed_at}}}catch(x){}
    const h=html(d,F,R,ST,FS);if(!head)head=h.slice(0,h.indexOf("<body>"));let b=h.slice(h.indexOf("<body>")+6,h.lastIndexOf("</body>"));b=b.replace(/<div class="pb">[\s\S]*?<\/div>/,"");body+=(body?'<div class="pg"></div>':"")+b}
  w.document.open();w.document.write(head.replace(/<title>[^<]*<\/title>/,`<title>Zmluvy – ${e(F.name)}</title>`)+"<body>"+body+'<div class="pb"><button onclick="print()" style="font-size:15px;padding:10px 18px">🖨️ Tlačiť / uložiť ako PDF</button></div></body></html>');w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(x){}},1200)}
{const st=document.createElement("style");st.textContent=`.camod2{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:10px}@media(min-width:700px){.camod2{align-items:center}}
.cabox{width:min(820px,100%);max-height:92vh;overflow:auto;display:grid;gap:10px;padding:18px;border-radius:24px;background:linear-gradient(160deg,rgba(28,34,46,.97),rgba(12,16,24,.98));border:1px solid rgba(255,255,255,.16);color:#eef2f7}
html[data-theme=light] .cabox{background:#fff;color:#0f172a}.cahd{display:flex;justify-content:space-between;align-items:center;font-size:1.1rem}.cax{min-height:40px;min-width:40px;padding:0}.cabox input{width:100%;box-sizing:border-box}
.caf{border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:10px 12px;display:grid;gap:6px}html[data-theme=light] .caf{border-color:rgba(15,23,42,.14)}.cafh{display:flex;justify-content:space-between;align-items:center;gap:8px}
.car{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:6px 0;border-top:1px solid rgba(255,255,255,.08);font-size:.92rem}.cano{font-weight:800;min-width:96px}.cast{opacity:.7;font-size:.8rem}.car button{margin-left:auto;min-height:38px;padding:0 12px}
.carch{margin:0 0 10px}`;document.head.appendChild(st)}
if(typeof window.renderStaff==="function"){const _rs=window.renderStaff;window.renderStaff=function(){const r=_rs.apply(this,arguments);try{if(typeof TAB!=="undefined"&&TAB==="deals"&&!(typeof FARMER!=="undefined"&&FARMER)){const app=document.getElementById("app"),hr=app&&app.querySelector(".hrow");
  if(hr&&!app.querySelector(".carch")){const b=document.createElement("div");b.className="btns carch";b.innerHTML=`<button type="button" class="lime" data-caopen>📁 Archív zmlúv podľa farmárov (${(STATE.deals||[]).length})</button>`;hr.after(b)}}}catch(x){}return r};Object.keys(_rs).forEach(k=>{try{if(!(k in window.renderStaff))window.renderStaff[k]=_rs[k]}catch(x){}})}
document.addEventListener("click",ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(g("[data-caopen]")){AQ="";archOpen();return}if(g("[data-caclose]")||ev.target.id==="caMod"){const m=document.getElementById("caMod");if(m)m.remove();return}
  if(x=g("[data-cpall]")){openAll(x.dataset.cpall);return}});
document.addEventListener("input",ev=>{if(ev.target.id==="caQ"){AQ=ev.target.value;archOpen()}});

document.addEventListener("click",e=>{const b=e.target.closest("[data-cpdf]");if(!b)return;e.preventDefault();open(b.dataset.cpdf)});
})();
