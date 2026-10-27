// ===== ERNTE · POPISY FUNKCIÍ – pri každej záložke, sekcii a nadpise krátko „na čo to je“ =====
// Pre farmárov, partnerov, zamestnancov aj majiteľa. Dopĺňa sa automaticky po každom vykreslení.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;

// ---- záložky (zamestnanci) ----
const TABD={
 home:"Ranný prehľad firmy na jednom mieste: čo je nové, čo čaká na teba, termíny a upozornenia. Ťukni na dlaždicu a prejdeš rovno tam.",
 req:"Všetko, čo poslali farmári: ponuky na predaj, objednávky odvozu, otázky a súhlasy. Odpovieš, schváliš alebo z toho spravíš obchod.",
 price:"Výkupné ceny, ktoré vidia farmári v aplikácii, a ich platnosť. Pri zmene ceny farmári hneď vidia novú.",
 trans:"Odvozy komodít od farmárov: kto chce odviezť, kedy a koľko, pridelenie áut VALKO a stav jazdy.",
 fleet:"Autá VALKO: kde sú, nafta a nádrž na dvore, alarmy, vodiči, náklady a nastavenia. Sekcie vyberieš hore.",
 deals:"Kúpne zmluvy s farmármi: číslo zmluvy, cena, množstvo, čo je odvezené a čo ostáva, podpisy a archív zmlúv.",
 farm:"Zoznam farmárov s kontaktmi, prihlásením do aplikácie, prístupmi a aktivitou (kto čo v aplikácii robil).",
 wx:"Predpoveď počasia pre farmy a trasy – na plánovanie žatvy, odvozov a postrekov.",
 team:"Ľudia vo firme, ich prihlásenia a čo môžu v aplikácii vidieť a robiť (⚙️ Prístupy). Nastavuje iba majiteľ.",
 calc:"Kalkulačky: sušenie a čistenie (koľko farmár dostane zaplatené) a nákupná cena ERNTE z ceny odberateľa, dopravy a burzy.",
 zuct:"Vyúčtovanie dodávok od farmárov podľa vážnych lístkov: čistenie, sušenie, fakturačná hmotnosť a suma ku každej zmluve.",
 agro:"Služby strojmi ERNTE pre farmárov: objednávky, cenník prác a pri majiteľovi aj náklady strojov a marža.",
 trus:"Vývozy kuracieho trusu z fariem Baromfi (HU) do BPS Kamenica – nahlásenie, pridelenie áut, váženie a podklady k faktúram.",
 pred:"Iba pre majiteľa, zamknuté PIN-om: kde kúpiť a kam predať komodity, marža po doprave, kedy predať podľa burzy, vesmír (karty, Mesiac, horoskop) s nastaviteľnou váhou a meranie, ktorá zložka funguje.",
 danube:"Firma Danube Trade: obchod s komoditami, odvoz VALKO a služby strojmi. Požiadavky a objednávky Danube, prepínač SK / HU a kúpne zmluvy podľa maďarského práva.",
 nov:"Čo je v aplikácii nové: po dňoch, kde to nájdeš a kto to vidí. Dopĺňa sa automaticky pri každej úprave cez Claude aj ERNTE AI.",
 evid:"Firemná evidencia namiesto Excelu: náklady a výnosy, sklad, denník prác, dochádzka, výplaty podľa zákona a výsledok."};
// ---- sekcie v záložkách (dlaždice) ----
const SECD={
 "evid:zap":"Denník nákladov a výnosov. Zapíš dátum, kategóriu, množstvo a cenu – suma sa vypočíta sama. Stroj a pole ukážu, kam idú peniaze.",
 "evid:sklad":"Sklad dielov, materiálu a náradia. Vydaj diel do stroja, prijmi tovar, odfoť bloček alebo súčiastku a appka ich zapíše sama.",
 "evid:praca":"Denník prác: kto čo robil, akým strojom, pre koho a koľko hektárov. Z neho sa dopĺňajú dni na poli do dochádzky.",
 "evid:doch":"Dochádzka na mesiac: odpracované dni, dovolenka, PN, dni na poli, víkendy, noci, sviatky a nadčasy. Bez peňazí.",
 "evid:mzdy":"Výplaty podľa zákona: z hrubej mzdy odvody, daň, bonus na deti, stravné, čistá mzda a cena práce. Schváliš, vytlačíš pásky.",
 "evid:prehl":"Výsledok firmy po mesiacoch: výnosy, prevádzkové náklady, cena práce a zisk. Plus náklady podľa kategórie, stroja a dodávateľa.",
 "evid:vyk":"Výkony strojov: žatva po kombajnoch a plodinách, vápnenie po podnikoch – v tonách.",
 "evid:kon":"Čo bolo v Exceli zle a ako to app robí správne, upratanie dát (archív), sadzby miezd 2025/2026.",
 "trus:vyv":"Nahlásené vývozy od Baromfi: schváľ, zaškrtni autá (ŠPZ), sleduj nakládku, vykládku a váženie.",
 "trus:pri":"Prihlásenia pre firmy Baromfi a BPS, čo smú vidieť a robiť, a jazyk (slovensky / maďarsky).",
 "trus:fak":"Podklady k faktúram za obdobie: Baromfi → ERNTE, VALKO → ERNTE a ERNTE → BPS.",
 "trus:cen":"Cenník pre odberateľa po miestach nakládky: trus + doprava v €/t.",
 "trus:eko":"Ekonomika trás: skutočné náklady súpravy, zisk na jazdu a stratové trasy. Iba majiteľ.",
 "trus:nas":"Ceny, kilometre trás, náklady súpravy a partneri.",
 "agro:ord":"Objednávky prác od farmárov: termín, plocha, stav. Potvrď, naplánuj a označ hotové.",
 "agro:srv":"Cenník služieb, ktorý vidia farmári: práca, stroj a cena za ha alebo hodinu.",
 "agro:fleet":"Stroje ERNTE a ich náklady (nafta, servis, odpisy) – podklad pre cenu práce.",
 "agro:calc":"Kalkulácia ceny práce: náklady stroja, obsluha a marža za ha.",
 "agro:cat":"Katalóg prác a strojov, z ktorého sa skladá cenník."};
// ---- nadpisy (farmár aj zamestnanci) ----
const H2=[
 ["Výkupné ceny","Ceny, za ktoré ERNTE kúpi vašu komoditu na farme (bez DPH). Ťuknite Predať, napíšte tony – ERNTE sa vám ozve."],
 ["Moje požiadavky","Čo ste poslali ERNTE (predaj, odvoz, otázky) a v akom je to stave."],
 ["Navrhnite svoju cenu","Napíšte, za koľko chcete predať a koľko ton máte. Pridajte fotky zo skladu – ich poloha slúži na certifikáciu ISCC."],
 ["Návrhy cien od farmárov","Ceny a množstvá, ktoré navrhli farmári, s fotkami skladu a GPS bodmi pre ISCC. Prijmi, daj protinávrh alebo zamietni."],
 ["Ostatné požiadavky","Predaj, odvoz, súhlasy so zmluvou a správy od farmárov."],
 ["Odvoz tovaru bez zmluvy","Tovar, na ktorý ešte nie je zmluva. Zmluvný tovar má pri odvoze prednosť – zmluvný odvoz objednáte pri zmluve v Moje obchody."],
 ["Moje obchody","Vaše zmluvy: dohodnutá cena, množstvo, koľko je odvezené a čo ostáva. Tu zmluvu aj podpíšete a stiahnete."],
 ["Moja cieľová cena","Napíšte cenu, za ktorú chcete predať. Keď ju ERNTE dosiahne, príde vám upozornenie."],
 ["Moje dodávky","Každé váženie: hrubá váha, vlhkosť, nečistoty a koľko vám bude zaplatené."],
 ["Môj prehľad","Súhrn vašich obchodov, odvezených ton a peňazí na jednom mieste."],
 ["Agro služby ERNTE","Objednajte si prácu strojmi ERNTE (postrek, sejba, žatva…). Vyberte prácu a hneď vidíte cenu."],
 ["Moje objednávky služieb","Stav prác, ktoré ste si objednali u ERNTE."],
 ["Kontakt ERNTE","Telefón a e-mail na ERNTE – volajte pri akejkoľvek otázke."],
 ["Počasie","Predpoveď na 24 hodín a 7 dní – na plánovanie žatvy, postrekov a odvozu."],
 ["Upozornenia","Čo treba dnes vybaviť alebo na čo si dať pozor."],
 ["Najbližších 7 dní","Termíny a počasie na najbližší týždeň."],
 ["Prehľad ERNTE","Hlavné čísla ERNTE a VALKO – čo je nové a čo čaká."],
 ["Zúčtovanie","Vyúčtovanie dodávok podľa vážnych lístkov ku každej zmluve."],
 ["📊 Dashboard zúčtovania","Lístky, tony a hodnota za vybrané obdobie a komoditu. Odtiaľ vytlačíš PDF na fakturáciu dopravy a PDF pre odberateľa."],
 ["1️⃣ Nahrať Excel od odberateľa","Excel od odberateľa (Agro-Somotor…) má všetky lístky na ERNTE. Nahraj ho – lístky sa uložia ako nerozdelené."],
 ["2️⃣ Rozdeliť lístky farmárom","Označ lístky (filter komodita, ŠPZ), vyber farmára a ťukni Prideliť. Lístky sa zarátajú do jeho zmlúv a zúčtovania."],
 ["Vývoz od farmárov","Komodita pripravená na odvoz u farmárov – koľko ešte ostáva odviezť."],
 ["Objednávky odvozu","Farmári si objednali odvoz – priraď autá a termín."],
 ["Poznámky k vývozu","Správy a poznámky k odvozom a nedodanému tovaru."],
 ["Doprava VALKO","Naplánované autá VALKO na odvozy."],
 ["Kde sú teraz","Poloha áut VALKO práve teraz – kto ide a kto stojí."],
 ["Pohyby","Príchody a odchody áut z dôležitých miest."],
 ["Hľadať záznamy","Vyhľadaj jazdy a tankovania podľa vodiča, auta alebo dňa."],
 ["Ochrana nafty","Kontrola nafty: tankovania, poklesy v nádrži a podozrivé prípady."],
 ["Hodnotenie vodičov","Km, spotreba, tankovania a rozdiely po vodičoch za mesiac."],
 ["Návrh spravodlivej mzdy","Mzda vodičov podľa jázd, km a diét – návrh na schválenie."],
 ["Sadzby od dátumu","Stravné a sadzby platné od dátumu – podľa nich sa rátajú diéty."],
 ["Commander","Čo sa sťahuje z GPS systému Commander (polohy, jazdy, nafta)."],
 ["Firma VALKO","Údaje firmy VALKO, certifikáty a kontakty."],
 ["Tím VALKO","Kontakty na ľudí vo VALKO."],
 ["Tím a prístupy","Ľudia, prihlásenia a čo môže kto v aplikácii robiť."],
 ["ERNTE AI","Asistent, ktorý odpovedá z údajov firmy, pripraví prehľad, list alebo upozornenie."],
 ["Kurací trus","Vývozy kuracieho trusu – termíny, autá, tony a ceny."]];
const norm=s=>String(s||"").replace(/[\u{1F000}-\u{1FAFF}☀-➿️]/gu,"").replace(/\s+/g," ").trim().toLowerCase();
const H2N=H2.map(x=>[norm(x[0]),x[1]]);
let SEC={};   // posledná otvorená sekcia v záložke

function strip(cls,txt,more){return `<div class="fdesc ${cls}" data-fd="1"><span aria-hidden="true">ℹ️</span><p>${txt}${more?` <button type="button" class="fdmore" data-help="${more}">Viac</button>`:""}</p></div>`}
function apply(){const app=document.getElementById("app");if(!app)return;
  // 1) záložka – popis pod navigáciou
  if(!isF()&&typeof TAB!=="undefined"){const nav=app.querySelector("nav.tabs");
    if(nav&&!app.querySelector(".fdesc.ftab")){let t=TABD[TAB],more=(typeof HELP!=="undefined"&&HELP[TAB])?TAB:"";
      if(TAB==="fleet"&&typeof STATE!=="undefined"&&STATE.fsec&&typeof FHELP!=="undefined"&&FHELP[STATE.fsec])t=`<b>${e(FHELP[STATE.fsec][0])}:</b> ${e(String(FHELP[STATE.fsec][1]).split(/(?<=\.)\s/).slice(0,2).join(" "))}`;
      else if(t&&OWN()&&TAB==="evid")t+=" Mzdy, výnosy a výsledok vidíš iba ty.";
      if(t)nav.insertAdjacentHTML("afterend",strip("ftab",t,more))}}
  // 2) sekcia (dlaždice) – popis pod nadpisom so „← späť“
  app.querySelectorAll(".zt > h2").forEach(h=>{const back=h.querySelector("[data-evsec],[data-trsec],[data-asec]");if(!back){return}
    const nx=h.nextElementSibling;if(nx&&nx.classList.contains("fdesc"))return;const k=SEC[TAB];const t=k&&(SECD[TAB+":"+k]||SEC["_"+TAB]);if(t)h.insertAdjacentHTML("afterend",strip("fsec",e(t)))});
  // 2b) sekcia s jedinou dlaždicou (napr. strojník rovno v sklade)
  if(typeof TAB!=="undefined"&&TAB==="evid"&&window.evData){const E=evData();const h=app.querySelector(".zt > h2");if(h&&E.sec&&!h.querySelector("[data-evsec]")){const nx=h.nextElementSibling;if(!(nx&&nx.classList.contains("fdesc"))&&SECD["evid:"+E.sec])h.insertAdjacentHTML("afterend",strip("fsec",e(SECD["evid:"+E.sec])))}}
  // 3) nadpisy (iba farmár a zamestnanci – nie portál partnerov trusu)
  if(!isF()&&!app.querySelector("nav.tabs"))return;
  app.querySelectorAll("h2").forEach(h=>{if(h.closest(".zt")&&h.parentElement.classList.contains("zt"))return;const nx=h.nextElementSibling;if(nx&&nx.classList&&nx.classList.contains("fdesc"))return;
    const n=norm(h.textContent);const m=H2N.find(x=>n.startsWith(x[0]));if(m)h.insertAdjacentHTML("afterend",strip("fh2",e(m[1])))});
  // 4) farmár – úvod raz navrchu
  if(isF()&&!app.querySelector(".fdesc.ffarm")){const hero=app.querySelector(".hero");if(hero)hero.insertAdjacentHTML("afterend",strip("ffarm","Tu vidíte výkupné ceny, môžete ponúknuť komoditu na predaj, objednať odvoz alebo služby, podpísať zmluvu a sledovať dodávky a peniaze. Pod každým nadpisom je krátky popis."))}}
let q=0;function sched(){if(q)return;q=requestAnimationFrame(()=>{q=0;try{apply()}catch(x){}})}
document.addEventListener("click",ev=>{const b=ev.target.closest&&ev.target.closest(".zbtn[data-evsec],.zbtn[data-trsec],.zbtn[data-asec]");if(!b||typeof TAB==="undefined")return;
  const k=b.dataset.evsec||b.dataset.trsec||b.dataset.asec;SEC[TAB]=k;const sm=b.querySelector("small");SEC["_"+TAB]=sm?sm.textContent:""},true);
function start(){const app=document.getElementById("app");if(!app){setTimeout(start,300);return}new MutationObserver(sched).observe(app,{childList:true,subtree:true});sched()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
