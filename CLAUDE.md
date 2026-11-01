# ERNTE Trade & Logistic – pravidlá pre každú úpravu aplikácie

Platí pre Claude aj ERNTE AI pri každej novej sekcii, záložke, funkcii alebo type používateľa.

## Povinne pri každej novej sekcii / funkcii
1. **📲 Pridať na plochu** – každý nový typ používateľa alebo nová obrazovka po prihlásení musí zobraziť dlaždicu
   „Pridať na plochu“ (`farmar/installapp.js`). Dlaždica sa vkladá automaticky do `#app` po `.hero` alebo `nav.tabs`;
   nová obrazovka musí mať jedno z toho, inak doplň miesto vloženia v `installapp.js`. Tlačidlo musí fungovať:
   systémové okno inštalácie, inak presný návod pre prehliadač.
2. **ℹ️ Popis funkcie** – nová záložka dostane popis v `TABD`, nová sekcia s dlaždicami v `SECD`, dôležitý nadpis v `H2`
   (`farmar/fndesc.js`). Nová záložka dostane aj návod `HELP` v `index.html` (tlačidlo „Ako to funguje“).
3. **🆕 Novinky** – každá zmena sa zapíše do `app_novinky` (`aud` je POLE: `array['all']`, `array['owner']` – reťazec 'all' migráciu zhodí) (zašifrovaná migrácia v `farmar/supabase/auto/`):
   dátum, názov, kde to nájsť, kto to vidí, `aud` (owner / staff / farmer / all / kľúč prístupu) a krátky popis.
   Pri novom dni aj `app_dni` (krátke a podrobné zhrnutie dňa, vidí iba majiteľ).
4. **Prístupy** – nová funkcia má kľúč v `PCAT` (`perms.js`), záložka v `TABP`, a ochranu aj v databáze (RLS / `has_perm`).
5. **Jazyk** – časti pre maďarských partnerov (Danube, Baromfi) majú prepínač 🇸🇰 SK / 🇭🇺 HU.
6. **Odkaz na aplikáciu** – v správach pre používateľov nikdy holý odkaz na začiatku; vždy „👉 ERNTE Trade & Logistic: …“ na konci,
   v aplikácii zobrazovať cez `appLinkHTML()` (logo + názov namiesto https).

7. **Štýl dokumentov (PDF)** – všetko o doprave (preprava, jazdy, CMR, vodiči, flotila, doprava trusu) v štýle **VALKO s.r.o.**,
   obchod, výkup, zúčtovanie, zmluvy a kurací trus v štýle **ERNTE spol. s r.o.** Hlavička cez `brandHead("valko"|"ernte", nadpis, podnadpis)`
   a farby cez `brandCss(...)` (`farmar/brand.js`).

8. **Názvy súborov (PDF a iné pre majiteľa)** – PRÍKAZ MAJITEĽA: v názve súboru namiesto podčiarkovníka `_` vždy normálna medzera
   (napr. „Zmluva soja Danube SK HU.pdf“, nie „Zmluva_soja_Danube_SK-HU.pdf“).

## Kontrola vzhľadu – PRÍKAZ MAJITEĽA (trvalé, pri každej zmene aj novej funkcii)
Pred nasadením otestovať v prehliadači (Playwright) každú dotknutú obrazovku pre **všetky prihlásenia** (majiteľ, obchodník, doprava,
evidencia, mzdy, trus, farmár) na šírkach **344, 390, 412 px (mobil, Fold zatvorený) a 900 px (Fold otvorený)** a pozrieť snímky:
- nič sa neprekrýva, nič nepretŕča doprava (stránka sa nesmie posúvať do strany), text v tlačidlách sa neoreže;
- obsah dlaždíc a hlavičky na stred, dlaždice na celú šírku; nadpisy a popisy čitateľné (popis pod celým riadkom, nie stlačený);
- okrúhle tlačidlá (✕, obálka, zvonček, ↻ …) presný kruh, nie vajce (`fit.css`, `xround.js`);
- automatická kontrola: `.github/e2e/uiaudit.js` (prekrytia cez elementFromPoint, orezaný text, šírka stránky).
- **31. 10. (príkaz majiteľa „aby som ťa nemusel kontrolovať“):** testovať aj **orezaný obsah v kartách** (prvok s `overflow:hidden`, kde `scrollHeight > clientHeight` – `out.cut` v uiaudit.js),
  šírku **690 px** (Fold otvorený so zväčšeným zobrazením) a **väčšie písmo 130 %**; úvod LIVE testovať pre farmára aj tím (`ernte-wl-want`). Zlyhanie = neopustiť, opraviť a znova otestovať.
- **🩺 SAMOKONTROLA NA TELEFÓNOCH (31. 10. 23:20, `uiwatch.js`, tabuľka `ui_issues`, `ui_report`/`ui_fixed`, sonda `ernte_probe2.ui`):** každý telefón po prekreslení (najviac raz za 4 s, nález sa overí 2× – žiadne prechodné stavy)
  hlási: stránka širšia ako displej (`sirka`), in-flow obsah vyčnievajúci z prvku s overflow:hidden (`orezane`), orezaný text v tlačidle bez potomkov (`tlacidlo`), chyby skriptov (`chyba`).
  Ignoruje svg, mapu, zatvorené `<details>`, absolútne dekorácie (lesk), `[data-nocut]`. Strážca pri každej kontrole prejde `ui` zo sondy, opraví a zavolá `ui_fixed(array[k])`.
Spoločné opravy rozloženia patria do `farmar/fit.css` (načítava sa posledný).

## Výkon (29. 10.)
- **OPRAVA 31. 10. 12:50 („stále ma vyhadzuje“):** automatická aktualizácia v `index.html` počítala podpis verzie skôr, než sa načítali skripty pod ňou → podpis sa nikdy nezhodoval
  a aplikácia sa obnovila (úvod LIVE → Prehľad) pri KAŽDOM návrate z inej aplikácie. Teraz podpis až po `load`; nová verzia sa načíta iba po neprítomnosti ≥ 10 min a ostane tá istá záložka (`ernte-tab`, `ernte-wl-ret`).
  **12:53 PRÍKAZ MAJITEĽA: úvod LIVE sa ukáže IBA po novom prihlásení (showLogin / magic link) alebo po ↻ Obnoviť (localStorage `ernte-wl-want`) a tlačidlom 🌅 Úvod – prvé v lište sekcií (`.uvodb`, `data-uvod`) a prvá dlaždica farmára; pri otvorení aplikácie ani pri návrate NIE (platí pre všetkých).**
  (pôvodne:) Úvod LIVE pri návrate až po ≥ 10 min (predtým 30 s) a po „Poďme na to“ ostane otvorená tá istá obrazovka (`__wlRet`). Vytvorené heslá (Junior, Nové heslá) prežijú prepnutie do WhatsAppu (sessionStorage 30 min).
- Kto obaľuje `renderStaff` / `renderFarmer`, MUSÍ skopírovať značky z pôvodnej funkcie
  (`Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]})`) – inak sa moduly obaľovali donekonečna (stovky vrstiev, aplikácia sekala).
- Načítanie dát, ktoré po návrate volá `renderStaff`, nesmie nechať stav `null` (inak nekonečný cyklus) – pri prázdnej odpovedi `{err}` / `{}`.
- Kým človek píše do políčka, prekreslenie z pozadia počká (`formkeep.js`).
- **Spodná lišta (31. 10. 16:05):** zvýraznenie `.ds-ind` sa po každej zmene dorovná pod stlačené tlačidlo (`navfix.js` sync – inak ho posunulo vložené „Úvod“); 🎤 sa predvolene drží nad lištou (`voice.js` place: nav.top), tlačidlá lišty obsah na stred.
- **Obrazovka neskáče (31. 10.):** moduly, ktoré po prekreslení vkladajú prvky (popisy `fndesc`, Späť `spat`, dlaždice…), plánujú cez `(window.ernteSoon||requestAnimationFrame)(…)` – `ernteSoon` (inline v `index.html`) = mikroúloha pred vykreslením, poistka 300/úloha. Nové injektory písať rovnako, nie cez holý requestAnimationFrame (reťaz cez viac snímok = skok o ~220 px).
- **PRÍKAZ MAJITEĽA (31. 10.): pri obnovení na pozadí live STOJÍ – všade, každý používateľ** (`guard.js`): prekreslenie tej istej obrazovky bez dotyku ≥ 20 s sa podrží (`bgp`) a hore sa ukáže „🔄 Nové údaje · zobraziť“ (`#ernNew`); prekreslí sa po ťuknutí, prepnutí záložky, návrate do aplikácie. Výnimky: prvých 20 s po otvorení/návrate, „Načítavam…“, úvod LIVE otvorený, `window.ERNTE_LIVE_REDRAW`.
  Počasie (`wxs.js` → `wxCard`): pri prekreslení tej istej záložky s rovnakými údajmi sa vráti zástupca s výškami a pôvodný DOM (`[data-wsk]`, `KP`) sa vloží späť – video, satelit aj radar bežia ďalej.

## Bezpečnosť a dáta
- **PRÍKAZ MAJITEĽA (31. 10.): GDPR – každý prihlásený prečíta a podpíše** (`gdprsign.js`, tabuľka `gdpr_sign`, `gdpr_status`/`gdpr_sign`/`gdpr_list`): pred `enter()` celé poučenie `sukromie.html` (musí doskrolovať na koniec), zaškrtnutie, meno a priezvisko, podpis prstom → uloží sa podpis, verzia `VER`, SHA-256 textu, čas, zariadenie. Nová verzia poučenia = zvýšiť `VER` → podpíšu všetci znova. Majiteľ: Tím → 🛡️ GDPR súhlasy (+ PDF). Pri zmene spracúvania vždy aktualizovať `sukromie.html` (aj HU súhrn).
- Žiadne heslá, kľúče, pečiatky ani obchodné dáta v čitateľnej podobe v repozitári – iba zašifrované migrácie.
- Marža, zisk, mzdy a výsledok vidí iba majiteľ. Farmár nikdy nevidí odberateľa, predajné ceny ani iných farmárov.
  **PRÍKAZ MAJITEĽA (31. 10.):** farmár na úvode LIVE VIDÍ verejnú burzu MATIF a CBOT s grafom (`market.json`, s poznámkou „burza nie je naša výkupná cena“).
  História 90 dní: workflow `burza-hist` (každý prac. deň 21:40 UTC) → vetva `burza-hist`/hist.json z AHDB Futures prices (najbližší kontrakt, € / t; dni z bota majú prednosť).
  AHDB v súbore uvádza, že ďalšie zverejnenie vyžaduje súhlas poskytovateľov – súhlas zatiaľ nemáme (cereals.mi@ahdb.org.uk).
- **🛡️ NAŠA OCHRANA (1. 11. príkaz majiteľa, `ochrana.js`, tabuľky `data_guard`/`data_guard_block`, `guard_log/guard_status/guard_list/guard_block`):** každé stiahnutie (a[download] – prototyp aj klik), zdieľanie (navigator.share), tlač, kopírovanie ≥ 120 znakov a uloženie PDF (stopa `ernteTrace` v päte: meno, čas, kód) sa zapíše; ≥ `guard_cfg.lim` (15)/h → push Martinovi (raz za hodinu na človeka). Martin (MAIN_OK) sa nezapisuje. Tím → 🛡️ Naša ochrana: prehľad po ľuďoch + ⛔ Zablokovať (potom export/zdieľanie/tlač/kopírovanie nejde). Uvedené v `sukromie.html` (oddiel 3, VER nezvýšená).
- Upozornenia príjemcom odchádzajú až po schválení majiteľom (📤), okrem výslovne povolených automatických správ
  (napr. „objednávka je v spracovaní“).

## Nasadenie
- Zvýšiť `CACHE` v `farmar/sw.js` a `?v=` pri zmenených skriptoch v `farmar/index.html`.
- **PRÍKAZ MAJITEĽA (30. 10.): STARÁ / NOVÁ VERZIA.** Push iba do `main` – na `gh-pages` už NEPUSHOVAŤ ručne. Stránku stavia workflow
  `pages.yml` (pri každom pushe + každých 30 min): `farmar/` = stará verzia (commit v `farmar/STABLE`) pre tím, farmárov a všetkých,
  `farmar/beta/` = nová verzia (main) iba pre majiteľa (Martin, ERNTE spol.) – prepína tlačidlo 🧪 pri zvončeku (`verzia.js`).
  Novú verziu všetkým zverejní iba majiteľ (✅ v 🧪 → `app_release` → dispatch `ernte-release` → `farmar/STABLE` = main).
  Nikomu inému novú verziu neponúkať. Databáza (migrácie) platí hneď pre obe verzie – meniť ju spätne kompatibilne.
  **Zmena 30. 10. (príkaz majiteľa):** Martin aj Jana sú VŽDY v novej verzii automaticky (`NEWEST()` vo `verzia.js`), tlačidlo 🧪 a ponuka prepínania sa nezobrazujú.
  Ružový pás „Nová verzia“ sa neukazuje nikomu – nová verzia sa načíta sama pri návrate do aplikácie. Zverejnenie všetkým: dispatch `ernte-release` (na príkaz majiteľa).
- **`?v=` je povinné** pri každom zmenenom skripte / štýle.
- **🚦 BRÁNA PRED ZVEREJNENÍM (1. 11., príkaz majiteľa „obehnime ich“):** `ernte-release` (pages.yml) zverejní main všetkým IBA keď prejde `.github/e2e/smoke.mjs` – aplikácia z `farmar/` s náhradnou databázou `mock-sb.js` (vymyslené údaje), majiteľ / obchodník / doprava / farmár × 344, 390, 412, 690, 900 px, všetky záložky a farmárske dlaždice; zlyhá pri chybe skriptu, nenačítaní alebo stránke širšej ako displej. Pri zlyhaní ostáva STABLE, beh je červený so zoznamom chýb. Lokálne: `node smoke.mjs <farmar>` (~2,5 min). Núdzovo obísť iba na príkaz majiteľa: `client_payload {"force":true}`. Nová rola / dlaždica → doplniť do `ROLES` v smoke.mjs.
- **Service worker meniť iba po teste na serveri s gzip kompresiou** (ako GitHub Pages). 28. 10. ukladanie súborov do telefónu
  (cache-first) s kopírovanými hlavičkami (Content-Encoding/Length) rozbilo aplikáciu všetkým – vrátené na overený network-first.
- Každý commit: autor `ERNTE Trade <report.valko@gmail.com>`, committer `Claude <noreply@anthropic.com>`. Históriu `main` neprepisovať
  (bot „Trhové ceny“ do nej zapisuje).

## Stav projektu (pamäť pre každý nový rozhovor – čítaj ako prvé)
Hlavná pamäť projektu je tento repozitár. Telefóny (Samsung Galaxy Z Fold, iPhone) sú iba zariadenia na používanie –
Claude k ich úložisku nemá prístup. Pokračovať sa dá v tom istom rozhovore na hocijakom zariadení, alebo v novom rozhovore
s pripojeným repozitárom `ernte-trade/ernte-`.

- **Aplikácia:** ERNTE Trade & Logistic (PWA) – `https://ernte-trade.github.io/ernte-/farmar/`, zdroj v `farmar/`, nasadzuje sa z `gh-pages`.
- **Databáza:** Supabase; zmeny iba zašifrovanými migráciami v `farmar/supabase/auto/` (heslo má majiteľ / tajomstvo v GitHube, nikdy nie v repozitári ani v chate).
- **Majiteľ:** Martin Vaľko (ERNTE spol. s r.o., VALKO s.r.o.). Komunikácia po slovensky, chce hotové a otestované veci, nasadené hneď.
- **Pravidlo majiteľa (trvalé): všetkým farmárom vždy doplniť údaje podľa registra / FinStatu** – podľa IČO (`firmy.js` → `firmyFillAll`, raz denne
  automaticky + tlačidlo vo Farmároch); iba dopĺňať prázdne polia, nikdy neprepisovať; ukončené firmy hlásiť. Pri novom farmárovi a odfotení pečiatky hneď.
- **Pravidlo majiteľa (trvalé): SÓJA = model ADM východ.** Výkupná cena sóje = CBOT sója dnes (€/t, `market_px`) + báza ADM východ (FCA farma),
  bez +0,777 %. Báza: ručná (Automatický cenník), inak priemer posledných 3 ponúk ADM z východu (Sečovce/Parchovany) v „Konkurenčné ceny“
  (DDP − doprava `admDop`, predvolene 10 €/t), inak 64. Západ (Hamburg) sa nepočíta. Zverejňuje iba databáza (`soja_adm_tick`, pg_cron `soja-adm`
  každých 30 min); klient sóju nezverejňuje (žiadne preskakovanie cien). Ručná cena sóje sa neukladá.
- **Pravidlo majiteľa (trvalé): REPKA, KUKURICA, LO SLNEČNICA = Interagros − 10 €/t.** Naša výkupná cena = posledná ponuka Interagros
  (v „Konkurenčné ceny“; FCA prednostne, inak DAP; bez „nad 500 t“, neskoršieho odberu a DAP Parchovany) mínus `iaMinus` (10 €).
  Zverejňuje iba databáza (`ia_tick`, pg_cron `interagros` každých 30 min, `ia_run` hneď po vložení ponuky); klient ich nezverejňuje, ručná cena sa neukladá.
- **Pravidlo majiteľa (trvalé, 30. 10.): NÁKUP VIAZANÝ NA PREDAJ** – zverejnená nákupná cena nikdy nad najlepší predaj po našej doprave − marža (`sellcap.m`, 10 €/t),
  pre všetky komodity. Strop počíta aplikácia majiteľa z „Kde predať“ (`predaj.js` → `caps()`, kalk_store `pricelist/sellcap`, platí 3 dni); databáza `price_cap()`
  v `soja_adm_tick`, `ia_tick`, `price_propose`; `sellcap_apply()` zníži zverejnené ceny nad stropom hneď.
- **Pravidlo majiteľa (trvalé): ŽIADNE +0,777 %** – pri žiadnej komodite sa k cene nepripočítava (zrušené 29. 10.; `refPct()` = 0). Pšenica = výkup VSK, resp. burza + ich báza.
- **Ceny na neskorší odber** (`ia_tick` → settings `prices_fwd`, `fwd.js`): ponuky Interagros s termínom „odber …“ (bez nad 500 t / Parchovany) − `iaMinus` sa zobrazia pod cenou („📅 odber 1.–3. 2027: … €/t“); hlavná cena = odber teraz.
- **Kontrola automatických cien** (`price_guard`, `price_pending`, `price_watch`): skok > 25 €/t (`autoMaxJump`) sa nezverejní sám – push + potvrdenie v Cenníku
  (🛡️ Kontrola cien); 2× denne (pg_cron `cennik-kontrola`) kontrola čerstvosti: burza ≤ 3 dni, Interagros ≤ 10 dní, ADM východ ≤ 45 dní.
- **Pravidlo majiteľa (trvalé): STRÁŽENIE NÁKUPOV** (`deal_watch`, `deal_watch_tick` každých 15 min, `dealwatch.js`, iba majiteľ): obchody s farmármi od 29. 10. 2026 08:46.
  Trh (burza, inak konkurencia) klesne o ≥ 1,5 % / 5 €/t → „📉 KLESÁ“ priorita 5, opakuje sa každých 30 min, kým majiteľ nepotvrdí „Prečítal som“.
  Stúpa → „📈 DRŽ, NEPREDÁVAJ“ s termínom (max 60 dní, 15 dní pred mesiacom burzového kontraktu); obrat o ½ zisku alebo koniec termínu → „PREDAJ“ (opakuje sa).
  Končí zadaním predajnej ceny (deal_fin.sell_price) alebo zrušením obchodu.
- **Pravidlo majiteľa (trvalé): POKLES NAŠEJ NÁKUPNEJ CENY → obchodníci** (`cennik_drop_tick`, pg_cron `cennik-pokles` každú minútu, `dropalert.js`): každé zníženie zverejnenej výkupnej ceny
  = push priorita 5 Galajdovi, Ceperkovi a Ličkovi (`price_alert.drop_names`) + karta hore v aplikácii, kým nepotvrdia „Beriem na vedomie“. Kto cenu znížil sám, správu nedostane.
- **Pravidlo majiteľa (trvalé): CENY OBCHODNÍKA S ÚPRAVOU** (`staff.price_adj`, `my_price_adj`, `padjSet` v `index.html`): Ceperko = zverejnené ceny − 5 €/t
  (Prešovský kraj – vyššie náklady na dopravu) všade, kde ceny vidí (Cenník, Uzatvoriť obchod, úvod, ceny na neskorší odber, história, upozornenie na pokles); zverejnený cenník nemení.
  Ostatné nastavenia ako Galajda a Ličko. Všeobecné upozornenia cenníka (zverejnené ceny) mu nechodia.
- **Pravidlo majiteľa (trvalé): DANUBE ZMLUVA = vzor S-HU** (`dnzmluva.js`, `danube_contract_save`): pri pridaní zmluvy v Danube Trade sa vždy vytvorí dvojjazyčná zmluva SK | HU
  presne podľa vzoru S-HU-2026/1 (kupujúci Danube Commodities Kft., bez príloh GMP+ a ISCC, pri rozpore platí SK znenie). Cena = naša aktuálna nákupná cena u farmára
  (predvyplní sa, dá sa zmeniť), Príloha 1 = parametre podľa komodity, predávajúci z karty farmára. Číslo S/K/P/R/L/J-HU-rok/poradie.
- **Pravidlo majiteľa (trvalé): TOMÁŠ ŠTOFA** – Evidencia celá ako majiteľ (`ev_full`, `ev_full()`), Agro služby celé – park, kalkulácia, katalóg, cenník (`agro_calc`, `agro_full()`),
  GPS traktorov vo Flotile (`fleet_trak` → iba skupina Traktory). Tieto kľúče má iba on (+ majiteľ a Jana); nikomu inému nezapínať bez príkazu majiteľa.
- **Pravidlo majiteľa (trvalé): KDE PREDAŤ – NAJVYŠŠÍ ZISK** (`predaj.js`, `sell_buyers`, `sell_offers`, `sell_data`, iba majiteľ): ku každej zverejnenej nákupnej cene odporúčanie odberateľa
  s najvyšším ziskom = cena odberateľa (ponuky odberateľov posunuté s burzou, ponuky z Konkurenčných cien, skutočné predaje z vážnych lístkov) − doprava z regiónu (vzorec Kalkulačky) − nákup.
  Modely odberateľov a mená iba v DB. Nové ponuky odberateľov vkladať do `sell_offers` (formulár v Prehľade).
- **BURZA = bot „Trhové ceny“** (`market_bot_tick`, pg_cron `burza-bot` každých 5 min, raw `market.json`): `market_px` sa plní z overených kurzov, kontrakt = najbližší končiaci najskôr o 20 dní
  (ako rátajú odberatelia). Webové vyhľadávanie (`market_collect`) je iba záloha – nezapíše, ak má bot dáta < 48 h alebo ak sa líši o > 5 %. Rozdiel zdrojov > 3 % → push majiteľovi.
- **STRÁŽCA** (`ernte_watch`, pg_cron `strazca` každých 15 min → ai_state `ernte_watch`, v sonde `ernte_probe2.watch`): burza z bota, zlyhané úlohy, check_err, migrácie, sója, čakajúce ceny.
  Nové problémy → push majiteľovi; Claude ich pri pravidelnej kontrole (naplánovaná správa v rozhovore) opraví. Predikcia (`pred.js`) ráta s `sellOpts` (Kde predať) a otvorenými nákupmi (`deal_watch_list`).
- **PÔDA Z PPA** (`ppa.js`, tabuľka `ppa_farms`, iba majiteľ, záložka Farmári): verejné údaje PPA – užívané plochy 2025 (13 549 užívateľov, orná/TTP, lokality)
  + prijímatelia dotácií FY2024/2025 (sídlo, sumy) + obce z Wikidata (okres, PSČ, súradnice; km vzdušne od Zbudze). Párovanie s farmármi podľa mena (`ppaKey`).
  **31. 10.:** pri KAŽDOM farmárovi karta 🌾 PPA (`fcInject`: orná/TTP/spolu, km, dotácie 2025/2024, lokality, sídlo; párovanie IČO, inak meno) – vidí majiteľ + obchodníci s kľúčom `ppa` (Galajda, Ceperko, Ličko; RLS `is_owner() or (is_staff() and has_perm('ppa'))`). Zoznam potenciálnych farmárov ostáva iba majiteľovi.
  IČO a sídlo podľa mena z RPO (`fullName`, CORS OK). Telefóny/e-maily verejne nie sú. Nové dáta: workflow `ppa.yml` → vetva `ppa-results` (zašifrované).
- **🔗 DUPLICITNÍ FARMÁRI** (31. 10., `farmdup.js`, `farmer_merge(keep,drop)`, záloha `farmers_merged`, iba majiteľ): skupiny podľa mena (ppaKey) / e-mailu / telefónu; zlúčenie presunie všetky `farmer_id`/`auto_farmer`, doplní prázdne polia, nič neprepíše. Rovnaký telefón = často rôzne firmy jednej rodiny (Zamba, Kačur…) – nezlučovať automaticky. Zlúčené: ABLI-AGRO, AGROTRADE GROUP.
- **Oprava lístka odberateľa** (`odb.js`, `buyer_ticket_edit`, stĺpce `deliveries.fix/edited_at/edit_log`): hľadanie lístka / zákazníka vo všetkých obdobiach, ✏️ úprava,
  prepočet zmlúv farmára (`buyer_realloc`); `buyer_import` ručné opravy po nahratí Excelu znova použije (neprepíše ich).
- **Dokumenty / PDF** (`pdfview.js`, načítava sa hneď po supabase): každé `window.open("")` + `document.write` sa zobrazí v okne cez celú obrazovku
  (✕ Zavrieť / Späť, 🖨️ Tlačiť, ⬇️ Uložiť PDF cez html2pdf v rámci dokumentu, 📤 Poslať na mobile). Automatická tlač sa ignoruje (3 s). Nové PDF písať rovnako (window.open("")).
- **PRÍKAZ MAJITEĽA (31. 10.): ZVÝŠENIE DO 5 €/t AUTOMATICKY** (`price_guard`, ai_state `price_auto_raise.max`=5): zvýšenie ≤ 5 €/t sa zverejní samo (Martin dostane info push), nad 5 €/t čaká na súhlas Martina; pokles hneď. Nižšie pravidlo z 30. 10. platí iba pre zvýšenia nad 5 €/t.
- **Pravidlo majiteľa (trvalé, 30. 10.): POKLES CENY AUTOMATICKY, ZVÝŠENIE IBA MARTIN** (`price_guard`, `price_propose`, `price_main()`, trigger `prices_raise`):
  zníženie našej nákupnej ceny sa zverejní hneď; zvýšenie (model aj ručne od iných) ide do `price_pending` + push a zverejní ho iba Martin (Cenník → 🛡️ Kontrola cien).
- **± ÚPRAVA OD MODELU** (príkaz majiteľa 30. 10.): `kalk_store pricelist/adj` (samostatne, aby ho starší klient neprepísal) {komodita: ±€/t}; zverejnená cena = model + adj
  (klient `ADJ()` v `autocennik.js`, databáza v `soja_adm_tick` a `ia_tick` aj pre ceny na neskorší odber). Pšenica kŕmna = model − 5 €/t.
  Vždy zverejniť novú verziu všetkým zároveň (cenník zverejňuje aplikácia majiteľa – stará a nová verzia nesmú rátať inak).
- **E-MAIL Z APLIKÁCIE** (`mail_send` → dispatch `ernte-mail` → `.github/workflows/mail.yml` + `.github/mail/send.mjs`, nodemailer; `mail_job_take`/`mail_job_done`):
  zmluva v PDF farmárovi priamo z okna dokumentu (📧 Odoslať, adresa z karty farmára). Prístup k schránke (SMTP) zadá iba Martin v aplikácii (odkaz `…/farmar/#nastav-email`) → vault `ernte_smtp`. **PRÍKAZ MAJITEĽA 31. 10. 22:27: zmluvy, zúčtovania a faktúry odosiela jana.valkova@ernte.sk (profil `ernte`), ponuky a dopyty (obchodné návrhy AI, `sales_lead_send`) odosiela ernte@ernte.sk (profil `ponuky`, vault `ernte_smtp_ponuky`, odkaz `#nastav-email-ponuky`)** (Microsoft 365, smtp.office365.com:587 – v tenante treba zapnúť SMTP AUTH, inak 535 5.7.139); zmluvy aj zúčtovania.
  Profily schránok (`mail_cfg_set/mail_ready/mail_send` `p_prof`): `ernte` (jana.valkova@ernte.sk), `danube` (Gmail danube.commodities.kft@gmail.com – zmluvy Danube, `dnzmluva.js`), `valko` (@valko-logistics.sk – doprava).
  **31. 10. 22:45 OPRAVA („nechce odoslať“):** token databázy nemá právo na repository_dispatch (403 „Resource not accessible by personal access token“) → `ernte-mail` sa nikdy nespustil. Teraz trigger `mail_jobs_kick` → `mail_kick(id)` = komentár „ernte-mail <ID>“ v #51 (`kicked`) → `mail.yml` (issue_comment, MODE=comment): `mail_job_claim` → komentár „ernte-mail-ok <kód>“ ako github-actions[bot] → `mail_job_verify` (databáza overí autora cez GitHub API) → až potom heslo schránky; `mail_job_take` pre `kicked` úlohy nefunguje (repo je verejné). Tajomstvo ERNTE_MIG_PASS v Actions NIE JE nastavené. Rovnaký 403 má každý `dispatches` z databázy (napr. `app_release`) – zverejňovať cez `gh`.
  Odkazy `#nastav-email`, `#nastav-email-danube`, `#nastav-email-valko`; majiteľom (Martin, Jana) sa po prihlásení ponúkne nastavenie chýbajúcich schránok (`pvAsk`).
- **Zámok cien** (`prices_lock`): ceny riadené modelom (sója, repka, kukurica, LO) z aplikácie (jwt) nejdú zmeniť – iba databázové funkcie (`ernte.allow_price`).
- **Konkurenčné ceny** (`konk.js`, kalk_store `pricelist/konk`): vložený text ponuky → rozpoznanie, porovnanie, báza voči burze. Mená firiem iba v DB.
  **PRÍKAZ MAJITEĽA (30. 10.): Konkurenčné ceny a všetky možnosti predaja (Kde predať, pri cenách v Cenníku, 🏆 odporúča ekonomika) vidí IBA Martin** (`MAIN_OK()`), nie Jana ani obchodníci; 🛡️ Kontrola cien ostáva ako doteraz.
  Agro-Somotor: všetky ceny FCA u farmára (`sell_buyers.parita='FCA'`), dopravu platia oni 9,4 €/t.
  **Odberateľ ≠ konkurencia** (príkaz majiteľa 30. 10.): ponuka odberateľa (napr. Agro-Somotor) = za koľko kúpi OD NÁS → položka `sell:true`, `dop` (Somotor: FCA cena, keď odvezieme my +9,4 €/t),
  `konk.buyers` {meno:{dop}}; vidí iba Martin; zapíše sa aj do `sell_offers` (`konk_sell_offer`, FCA + DAP) pre „Kde predať“. Nikdy ju nerátať ako konkurenčnú výkupnú cenu.
- **STRÁŽ OBCHODOV** (30. 10., `obchody_straz.sql`, pg_cron `obchody-straz` → `obchody_straz_tick` = `deal_watch_tick` + `deal_guard_tick`, tabuľka `deal_alerts`): nad cenníkom (5), nadodávka > 10 % (4),
  vlastná firma ERNTE/VALKO (4), obchádzanie zmluvy (5). Návrh nad cenníkom sa podpíše až po schválení majiteľom (`deal_price_guard`, `deal_price_approve`, tlačidlo v Obchodoch).
  Archív obchodov (`deals.archived`, `deal_archive`); testovací farmári (TEST / 🧪, `is_test_name`, `deal_live`) mimo súčtov aj upozornení – klient `dealsSplit` (STATE.deals bez nich, `dealsTest`, `dealsArch`).
- **DOMÉNA app.ernte.sk** (`domena.sql`, `domena.js`, pg_cron `domena`, ai_state `domain_app`): CNAME app → ernte-trade.github.io; zapína ju `pages.yml` (súbor CNAME) IBA keď DNS ukazuje na GitHub.
  Registrátor: vault `ernte_dns_reg` (`domain_reg_set`, WebSupport/Active24 REST v2 HMAC). Supabase Auth redirect URL nejde nastaviť bez tokenu správy – prihlásenie kódom funguje.
- **COMMANDER PODPORA** (`commander_podpora.sql`, `cmdreq.js`, ai_state `cmd_support`, pg_cron `commander-podpora`): e-mail o práva API, kontrola main:refuel po 3 prac. dňoch.
- **Príkaz majiteľa (trvalý):** pracovať na 100 %, bezchybne a rýchlo; nič nepoškodiť (model cenníka, nastavenia, údaje). Pred nasadením otestovať.
- **PRÍKAZ MAJITEĽA (1. 11.): DLHÝ ZOZNAM = KAŽDÁ POLOŽKA ZVLÁŠŤ.** Keď Martin pošle veľa otázok a príkazov naraz (aj 100 + 100), očísluj ich, prejdi jednu po druhej detailne, nič nevynechaj, každý príkaz urob a na každú otázku odpovedz; na konci prehľad č. → ✅ hotové / ❓ odpoveď / ⚠️ nedá sa (prečo). Pri veľkom množstve rozdeliť na viac správ, nie skracovať. Prehľad všetkých príkazov: dokument „ERNTE – všetko na jednom mieste“ (Claude Docs).

- **🌾 FARMÁR JEDNODUCHO (31. 10., `farmapp.js`, migrácia `farmar-jednoducho`):** po úvode LIVE (burza MATIF/CBOT, naše výkupné ceny – `farm_price_hist`, počasie, obchodník – `farm_contacts`:
  Košický kraj Ing. Galajda +421 902 733 222, Prešovský Mgr. Ceperko +421 940 944 733 podľa PSČ v adrese; DANUBE iba Jozsef Karoczkai) iba veľké dlaždice. Pôvodné sekcie sa ukážu po ťuknutí (h2 → `data-fsec`).
  Predať = plodina → tony → stará úroda / nová (ceny na neskorší odber) → odvoz deň + čas → kupujúci ERNTE/Danube + jazyk zmluvy → Odoslať (`requests.harvest`, `clang`).
  Trigger `req_team_push`: push Galajda, Ceperko, Ličko; DANUBE aj Jozsef po maďarsky; `route_emails('obchod_dnb')` pridá Jozsefa do Nevybavených.
- **🌦️ UPOZORNENIA NA POČASIE (31. 10. `wxalert.js`, `wx_alert_run/collect/my`, pg_cron `pocasie-upoz` hodinovo; 1. 11. 09:20 príkaz majiteľa):** 24 h dopredu, každé upozornenie má radu pre pole (🚜 `p`) a dopravu / nakládky (🚛 `d`); dážď, sneh, poľadovica, búrka, vietor ≥ 55 aj ≥ 40 (postrek), hmla, mráz. Do mobilu (Web Push) kto má zapnuté (v noci 21–5 iba závažné), v aplikácii karta hore pre všetkých s ✕.
- **🌐 ZMLUVA PODĽA ŠTÁTU (`clang.js`, `farmers.clang`, `set_clang`):** ERNTE: SK/CZ → SK; HU → SK | HU; AT/DE → SK | DE; inde SK | EN (AI preklad cez `i18n_get`, „pri rozpore platí slovenské znenie“).
  DANUBE vždy SK | HU (dnzmluva.js). Tlačidlo 🌐 pri každej „Zmluva PDF“ (farmár aj tím) prepne jazyk.
- **🌐 JAZYK APLIKÁCIE (`lang.js`):** SK/HU/EN/DE, preklad AI so spoločnou pamäťou (`i18n_tr`, pg_cron `i18n`). Danube (farmári + Jozsef) prvé prihlásenie po maďarsky (`ernteLangAuto`),
  pozvánky po maďarsky (`inviteText`, odkaz s `#prihlas` a `l:"hu"`).
- **🎤 HLAS PRE KAŽDÉ PRIHLÁSENIE (`voice.js`):** ťukni do políčka a diktuj (čísla, dátum, čas, e-mail), „hľadaj …“, „otvor …“, „späť“, „predaj 30 ton repky“; nič neodošle samo.
- **📈 TÝŽDENNÝ LIST INVESTIČNEJ AKADÉMIE (31. 10., workflow `invest-list`, `.github/workflows/investlist.yml`):** naplánovaná úloha nemá heslo migrácií → SQL (`insert into invest_notes(who,title,body) values …`, base64) pošle cez workflow_dispatch (input `sql_b64`); workflow ho zašifruje tajomstvom `ERNTE_MIG_PASS` a commitne do `farmar/supabase/auto/`. Povolený je iba INSERT do invest_notes. **Tajomstvo `ERNTE_MIG_PASS` musí majiteľ raz zadať v GitHub → Settings → Secrets → Actions** (31. 10. ešte chýbalo – List č. 1 nevložený).
- **🤖 CLAUDE PRACUJE SÁM (1. 11. 2:27 PRÍKAZ MAJITEĽA: „prechádzaj app bez mojej žiadosti, modernizuj, zľahčuj, dopĺňaj zákazníkov, hľadaj farmárov vo východnom Maďarsku do Danube; v mojej app a v tíme automaticky, pre obchodníka/farmára sa spýtaj a navrhni“):**
  databáza (`20261101-0245-claude-samostatne`): `hu_farm_run` (pg_cron `hu-farm` 3:10) – AI s web_search nájde firmy (Kft./Zrt./Bt./szövetkezet, NIE súkromné osoby) z východného Maďarska → `farmers` (firma DANUBE, active=false) + `hu_prospects` (zdroj, plodiny);
  `farm_enrich_run` (`farm-enrich` 3:40) – 10 farmárov denne bez e-mailu/telefónu/adresy → overené verejné firemné kontakty, IBA prázdne polia, log `farm_enrich_log`; `claude_auto_tick` každé 3 min (zber + ai_state `claude_auto` → sonda `ernte_probe2.auto`).
  Návrhy: tabuľka `claude_navrhy` (navrh → ano/nie Martin v Prehľade, `navrhy.js`, `claude_navrh_set`) → naplánovaná úloha „Claude – nočná práca na aplikácii“ schválené zrealizuje (status `hotovo`).
  Automaticky smie meniť iba časť majiteľa (MAIN_OK) a nastavenia tímu bez dopadu na ich prácu; všetko, čo uvidí obchodník alebo farmár, najprv ako návrh. Nikoho nekontaktuje bez súhlasu Martina.
- **🚛 KURACÍ TRUS – KM ZO SKUTOČNEJ TRASY KAMIÓNA (1. 11. 8:20 PRÍKAZ MAJITEĽA):** workflow `trus-km.yml` (`.github/trus/km.py`, Valhalla truck 40 t / 5 náprav, Nominatim; výsledok zašifrovaný vo vetve `trus-km`) → `trus_sites.km_route` {perm, eu} (tam, späť, h, km podľa krajiny a triedy cesty).
  `trus_cfg.route_mode`: `perm` = s povolením (prihraničná Kisvárda – Cigánd – Sátoraljaújhely – Slovenské Nové Mesto, cesta 37), `eu` = bez povolenia (Miskolc – Košice); ak je trasa s povolením dlhšia, použije sa kratšia. Prepínač v Ekonomike trás aj Nastaveniach (`trus_route_mode` → `trus_route_sync`: km_one_way, sk_km, otvorené vývozy nahlásené/schválené). Mýto z km tried ciest × sadzby z cfg. **Ručné km z Excelu zrušené, doprava pevne 1,5 €/km** (price_km na farmách vymazané). Zálohy: `trus_km_backup`, `trus_order_km_backup`. Bez tranzitu Ukrajinou. Kaba a Földes by pri 1,5 €/km boli stratové (~ −110 €/otočka) – **trasa v strate sa nacení na minimum** (`trus_calc` → `min_priced`, cena = úplné náklady × (1 + min_margin_pct), `fixed_loss`), karta 💰 v Ekonomike.
- **🏠 SENCOR HOME (1. 11., `sencor.js`, IBA MARTIN – MAIN_OK):** okrúhle tlačidlo 🏠 v hlavičke pred ↻ otvorí aplikáciu Sencor HOME (iPhone App Store id1586323736, Android Google Play). Sencor HOME = Tuya OEM → **📡 meteostanice Jasenov a Zbudza na úvode LIVE (dlaždica `.wsenc` pod Počasím, iba Martin)**: Martin pridá stanice do Smart Life, na iot.tuya.com projekt (Central Europe) + Link App Account, Access ID/Secret zadá v dlaždici (⚙️ Pripojenie → `sencor_cfg_set` → vault `ernte_tuya`). Databáza `sencor_tick` (pg_cron `sencor` každú minútu, podpis HMAC-SHA256): token → `/v2.0/cloud/thing/device` (6 h) → `/v1.0/iot-03/devices/{id}/specification` (raz, scale/unit) → `/v1.0/iot-03/devices/status` (5 min) → tabuľka `sencor_dev`; `sencor_get()` (price_main).
- **📊 Martin – lišta sekcií podľa používania (`ownertabs.js`, `tab_use`).**
- **📷 PRÍKAZ MAJITEĽA (1. 11.): ikony = SKUTOČNÉ FOTKY, nie kreslené** – `img/foto/<kľúč>.jpg` (256 px, Wikimedia Commons CC0/CC BY/CC BY-SA, autori `img/foto/zdroje.json` + `fotky-zdroje.html`, odkaz v návode „Ako to funguje“). `fotoico.js`: lišta sekcií všetkých (aj 🌅 Úvod), hlavička návodu; farmapp, kid, welcome, ownertabs priamo `img/foto/`. Staré `img/ico/` (Fluent 3D) sa už nepoužívajú. Nové ikony hľadať workflowom `ernte-imgfetch` (payload maxn/tw/minw/minh) → vetva img-candidates, vybrať, orezať na štvorec.

- **👤 KONTAKT Z DATABÁZY AUTOMATICKY (1. 11. PRÍKAZ MAJITEĽA „musíš to robiť automaticky“):** kde sa zadáva človek (meno → e-mail/telefón), aplikácia ho sama dohľadá cez `people_lookup(q)` (známe tabuľky, inak celá databáza) a vyplní – bez ručného zadávania. Prvé použitie: Kurací trus → Prístupy → Pridať človeka z firmy (`trus.js` `pplFind`).
- **📞 MÔJ PLÁN NA DNES (31. 10., `plan.js`, `plan_ack/plan_log/deal_replace`):** vidia všetci obchodníci (deals/req/price_view alebo Galajda, Ceperko, Ličko, Jozsef). Položka zmizne IBA po vyjadrení
  (tlačidlá ✔️ Vyjadriť → `plan_say`, odloží pre celý tím na N dní) alebo keď je zmluva dodaná do nuly. Nadodávka nad zmluvu = položka ⚠️ + push (`deal_over_push`) obchodníkom, Martinovi a Jane,
  kým nie je dodatková zmluva. „Nedodá“ → náhradný nákup (`replace_save`): hodnota nedodaného (zostatok × zmluvná cena) = tony × naša zverejnená cena, tolerancia max(50 €, 1 %), kontroluje databáza.

- **🧒 ERNTE JUNIOR (31. 10., `kid.js`, tabuľky `kids`/`kid_progress`, `kid_me`/`kid_save`/`kid_create`/`kid_list`):** prihlásenie pre syna majiteľa (meno@junior.ernte.sk, na prihlásení stačí meno).
  NIE je tím ani farmár → žiadne obchodné údaje. 8 lekcií (firma, B2B, burza s ozajstným grafom, doprava, zmluva, peniaze, riziko, kurací trus), kvízy, mince, odznaky, hra „Obchodný deň“ (vymyslené čísla).
  GDPR za dieťa rodič (`gdpr_status` → `{kid:true}`). Majiteľ: Tím → 🧒 ERNTE Junior (vytvorenie, pokrok).
  **14:00:** 💶 skutočná odmena od otca (`kid_earn`, `kid_paid`, `kids.cfg` rate 0,10 € / lekcia 1 € / deň 30 € (15:44 príkaz majiteľa) / mesiac 200 € (15:24 príkaz majiteľa: 200 €); `kid_earn_add` drží sadzby, stropy a 3 s odstup; `kid_pay` Vyplatené, `kid_cfg_set`),
  🇬🇧 English mode (lekcie a kvízy SK + EN, výslovnosť en-GB), škola 4. ročník (matematika, vybrané slová, vlastiveda, angličtina – nekonečné cvičenia), lekcie Šéf a tím, Rozhodovanie, Rodinný podnik, Investovanie a ETF + hra ETF sporenie.
  **1. 11. ÚVOD TIMOTEJA + ⚽ FUTBAL (`kidhome.js`, `window.kidCtx()` z kid.js):** diamantové sklo – počasie Michalovce (open-meteo), zarobené, investície (inv_state), testy spolu/dnes (`qs`, `qday`, `pr_*.t`), úspešnosť po predmetoch, „📚 Musíš sa učiť“ (< 70 % pri ≥ 5 otázkach, 3 dni nerobené, ešte neskúšané), Spotify (localStorage `ernte-kid-sp`, predvolene hymna Barçy; 1. 11. `SPL`: 10 futbalových pesničiek (track/…) + 3 playlisty, veľké ◀ ▶ `data-ksps`, dlaždice `data-kspp`, „▶ HRÁ“). **💬 Timotej (1. 11.):** `feedback.js` `who()='kid'`, zhrnutie dňa `kidRs()` z `kidStats()` (dnešné otázky, zarobené a koľko ešte dnes, čo sa doučiť s tlačidlami `data-kpr`, ďalšia lekcia, investície, počasie na futbal), bodka raz denne (`ernte-kid-rs-seen`), spätná väzba do `app_feedback` (RLS `who='kid'` + kids). Futbal: MFK Zemplín Michalovce (Timotej tam hrá, 1912, Žltomodrí), Barça, Ronaldo, Yamal, El Clásico (bol tam), kvíz + futbalová matematika.
  **16:10 PRÍKAZ MAJITEĽA: otázky sa NEOPAKUJÚ** – AI na pozadí dopĺňa zásobník `kid_qbank` (pg_cron `kid-qgen`, `kid_qgen_run/collect`, témy = id lekcií + `vl`, `pr`, `en`, do ≥ 60 na tému), `kid_quiz_get` vráti iba nevidené (`kid_qseen`); v klientovi balíčky bez opakovania (`deck()`, localStorage `ernte-kid-dk-*`), kvíz lekcie = 2 AI + 2 pevné + obchodný príklad (`BQ`), škola + 🔬 Prírodoveda.

### Hotové (október 2026)
- Moderný vzhľad (`ui.css`, písmo Geist), podpora iPhone/iPad/Android/PC, inštalácia na plochu (`installapp.js`, manifest).
- Podmienky a bonusy pre každého farmára (`fterms.js`, ⚙️ pri farmárovi).
- Prepínač „👁 Pozrieť ako konkrétny človek“ (záložka Test, iba Martin a ERNTE spol.), iba na čítanie.
- Predikcia, Test, Kalendár: iba Martin a ERNTE spol. (`MAIN_OK()`), nie Jana.
- Kalendár majiteľa (`cal.js`): pripomienky do mobilu (pg_cron `ernte-kalendar`), hlasové pripomienky (diktovanie, záznamník),
  žiadosti o stretnutie od používateľov z voľných termínov (prednostne 8–13).
- Skrytie automatických upozornení potiahnutím doľava / ✕ (`dismiss.js`, iba majitelia; vrátia sa pri novej informácii).
- Úvodná obrazovka (`welcome.js`): reálna fotka podľa roly (Wikimedia Commons, autor a licencia na fotke; farmár a trus fotky od majiteľa),
  živé panely (hodiny, počasie s grafom, KPI a grafy podľa roly), **naše nákupné ceny obnovované automaticky podľa automatického cenníka**
  (`autocennik.js` → tabuľka `prices`, každých 30 s, ▲/▼ od poslednej návštevy), vtipy, trúbenie.
  Pravidlá: zobrazí sa vždy po prihlásení / otvorení a po návrate z pozadia (≥ 30 s, nie počas rozpísaného formulára);
  **žiadne „Dnes už neukazovať“**; „Poďme na to →“ vždy otvorí pridelené sekcie (Prehľad, inak prvá záložka).
- Service worker (`sw.js`): overená verzia network-first (súbory sa vždy overia u servera). Zrýchlenie s ukladaním do telefónu
  je VYPNUTÉ (28. 10. núdzovo vrátené); `index.html` má jednorazové vyčistenie uložených súborov (`ernte-clean-2810b`).
  Údaje z databázy sa nikdy necachujú – vždy živé.
- **PRÍKAZ MAJITEĽA (30. 10.): úvod LIVE sa nedá vypnúť ani zavrieť** – žiadne ✕, ťuknutie mimo ani Escape; pokračuje sa iba „Poďme na to →“ (pre všetkých).
  Skrytý `[data-wlx]` slúži iba upozorneniam (`cennikalert.js`, `pushcenter.js`), ktoré otvárajú konkrétne miesto. Ukazuje sa aj v náhľade „Pozrieť ako“.
  Rozloženie: pod 1100 px šírky panely nad kartou (bez prekrývania, posúvateľné), nad 1100 px panely vpravo, karta vľavo.
- Firmy podľa IČO (`firmy.js`, prístup `firmy`): po zadaní IČO / odfotení pečiatky vyplní meno a sídlo z registra RPO
  (api.statistics.sk, CORS povolený, zadarmo) + odkaz FinStat. DIČ / IČ DPH: RÚZ (registeruz.sk) ich má, ale nemá CORS →
  iba cez databázu (pg_net); plný FinStat API potrebuje platený kľúč (zadať v aplikácii, nikdy v chate).
- **Úvod Martina a Jany (30. 10.)**: na skle graf našich nákupných cien (90 dní, `cennik_historia`), 💎 diamantové dlaždice ⛽ Nafta Slovnaft/MOL Group
  (workflow `fuel.yml` 3× denne → vetva `fuel-data`/fuel.json: fuel-prices.eu + EK Weekly Oil Bulletin, CC BY 4.0 – stanice MOL/INA/Tifon kde sú, inak priemer krajiny; navigácia Google Maps)
  a 🤝 graf obchodov (12 týždňov); Spotify nižšie na čiernom pozadí; na širokej obrazovke sa fotka roztiahne a posúva (`wfit`).
- **🗺️ ERNTE Maps** (30. 10., `ernmaps.js`; PRÍKAZ MAJITEĽA: IBA MARTIN – `ernteMaps.ok()` = MAIN_OK, tlačidlo 🗺️ v hornej lište + dlaždica ⛽ na úvode; Jana má na úvode starú navigáciu Google; hľadanie = Promise.any(Overpass zrkadlá, Nominatim) – Overpass býva 502): vlastná GPS navigácia v aplikácii – presná poloha (≤ 1 km, inak čaká),
  miesta z OpenStreetMap/Overpass (⛽ ČS, 🍽️ reštaurácie, ☕, 🅿️ kamióny, 🏨, 🛒, 🔧, 🚿, 🏧, 💊, 🚻), trasa OSRM so žiariacou čiarou, navigácia krok za krokom po slovensky s hlasom,
  prepočet pri zídení z trasy, Google Maps ako záloha.
  **🧭 Trasa · 🚛 cena** (30. 10.): režim 🚛 Kamión / 🚗 Autom / 🚶 Pešo (Valhalla costing truck|auto|pedestrian; cena iba kamión; záloha OSRM, pešo routed-foot); odkiaľ → kam (Photon/Nominatim), kamiónová trasa Valhalla `valhalla1.openstreetmap.de` (truck 40 t, 5 náprav, pokyny sk-SK; záloha OSRM), `trace_attributes` → km podľa krajiny a triedy cesty → mýto (m = diaľnica+rýchlostná, p = I. trieda; SK/HU/AT ako Kalkulačka, CZ/PL/DE orientačne, ⚙️ localStorage `ernte-plan-cfg`), nafta market.json SK/HU netL, ostatné = 1,60 − 0,32 × ref. nafta €/km, prázdny návrat, marža → návrh ceny; navigácia po kamiónovej trase. **31. 10.:** alternatívy (Valhalla `alternates:2` + `shortest`), 💶 `use_tolls` / 🛣️ `use_highways`, zastávky (`break_through`, P.via), 📷 radary + 🚧 práce (Overpass around-line), 🚦 TomTom Traffic Incidents v5 (kľúč iba localStorage `ernte-plan-cfg.ttKey`, zadáva Martin v aplikácii), ⛽/🍽️/🅿️ po trase → zastávka, 🔁 kamión tam a späť so spätným nákladom (`cfg.trip=back`, P.c nakládka, P.d návrat, `P.tripStops` + `navStops()` pre navigáciu, `priceBack` – úseky tam / prázdny prejazd / späť, ½ prejazdu do každej ceny), priblíženie a zvýraznenie križovatky (`mvDraw`), upozornenia vpredu (`warnTick`), 🗺️ prehľad trasy (`overview`), panel ⇕. Leaflet: globálne `img,svg{max-width:100%}` → v `fit.css` výnimka pre `.leaflet-container svg`.
- **PRÍKAZ MAJITEĽA (30. 10.): „všade všetko sklo · diamant · live“** – Počasie (`wxs.js`): hlavná karta živé sklo (pohyblivý gradient, diamantový okraj `--wsa`, odlesk), karty sklo + diamant; 31. 10.: SKUTOČNÉ FOTKY oblohy (`farmar/img/wx/*.jpg`, Wikimedia Commons, autor v `WXP` + popis na karte), video oblakov `clouds.mp4` (polojasno/oblačno cez deň), dážď/sneh/blesk/hmla CSS efekty, **12:24 PRÍKAZ MAJITEĽA: Počasie bez live pohybu – pevná fotka podľa aktuálneho počasia (video, efekty, Ken Burns, lesky vypnuté v `fit.css`)**, ikony = fotky `wxIcon()` → `wxPhoto`; **1. 11. 08:50 PRÍKAZ MAJITEĽA: počasie plnohodnotné ako iOS** – ťuk na deň v 10-dňovej predpovedi (`data-wday`) → `#wxDay` (`dayHTML`: graf teploty + pocitová, zrážky mm/h + pravdepodobnosť, vietor + nárazy + smer, UV, slnko, tabuľka po hodinách; ‹ › / potiahnutie, ✕, späť); v riadkoch dní aj hodín mm a vietor, 🛰️ satelit NASA GIBS VIIRS (verejná doména, `mountSat`). Úvod: všetky `.whc` dostanú `.wdia` + `.wdsh`. ERNTE Maps navigácia LIVE: celá obrazovka (Fullscreen API, skryté lišty), ■ / 🚗 Do auta (Google Mapy s bodmi našej trasy, Apple Mapy, Waze → CarPlay / Android Auto; priamo do auta ide iba natívna schválená app) / 🔊; **18:51 PRÍKAZ MAJITEĽA: smer jazdy HORE, kurzor v STREDE voľnej plochy** (`navBox`/`sizeNav`: otáčaný štvorec so stredom v kurzore, polomer = vzdialenosť k rohom, bez will-change, `#emMap.navmap path{filter:none}` – ráno 8:35 obrovská vrstva s filtrom na Folde nevykreslila trasu), `onRoute` prichytenie, GPS smer iba pri pohybe > 25 m), BEZ 3D náklonu, bez druhého trojuholníka v `mvDraw`, „🔎 Kam ideš?“ na mape, HUD rýchlosť / zostáva / príchod.
- **💶 VALKO-HUB (31. 10., `valkopay.js`, iba majiteľ, tabuľky `valko_cfg/valko_drv/valko_pay/valko_kpi/valko_fleet`, RLS is_owner):** zo súborov „VALKO-HUB Vodiči výplaty“ a „administratíva výplaty“.
  Vodiči (Flotila → 👤 Vodiči, pod Mzdami): cieľ = súčet denných sadzieb z jázd (`payRows`, EU 105 / Región 80–90), diéty = MAX(min. Commander; cieľ − čistá mzda z pásky), zrážka len z diét nad minimom, prenos `nx` do ďalšieho mesiaca,
  vrátenia +, bonus podľa skóre (98→150, 95→120, 90→80, 85→50, 80→25 €), CSV pre MRP. Pásky 08/2026 a skóre 09/2026 nahraté. Párovanie mien bez diakritiky (`alias`).
  Tím (⚙️ → 🏢 Firma VALKO): 5 osôb, 5 KPI s váhami (list „00 FINÁLNE NASTAVENIE“), pásma 95/85/75 → 100/70/40 %, gate = 0, krátenie iba bonusu s dôvodom, stavy navrh→kontrola→ok→lock (trigger `valko_kpi_lock`, audit log), semafor flotily 0–2/3–4/5+.
  Ostatné súbory (Evidencia, Kalkulácia sušenia, Plochy/PPA) boli v aplikácii už skôr; ERNTE Control Tower = prototyp toho, čo robí Zúčtovanie (netto, cross-check odberateľa, sadzby úkonov).
- **PRÍKAZ MAJITEĽA (31. 10.): úvod KAŽDÉHO okrem Tótha = kombajn CLAAS LEXION 8700 TT pri mlátení, live** (`welcome.js` `TOTH()`, `PHOTO.claas` = `img/claas-uvod.jpg`, Commons „LEXION 8700 in corn“, IICaYeNnEII, CC BY-SA 4.0; `fit.css` `.wclaas` pomalý prejazd kamery + plevy `.wchaff` + prach `.wdust`). Dlaždice úvodu ČÍRE diamantové sklo (bez backdrop blur, `fit.css`). Tóth: biela Scania S 500 (`img/scania-uvod.jpg`, Lav Ulv, CC BY 2.0). **11:23: fotka = pozadie posúvacieho okna `.wlc` (cover, celá obrazovka, bez čierneho pásu, stojí pri posúvaní); 11:15 PRÍKAZ MAJITEĽA: PEVNÁ fotka pre VŠETKÝCH vrátane Martina** – pozadie úvodu sa nehýbe (žiadny Ken Burns `wkb`, prejazd, plevy); živé sú iba údaje. Zelený skener `.wscan` beží stále IBA u Martina (`.wme`, 11:25), krikľavý žiarivý (11:28), 11:56: čiara tenká ako niť (1 px biele jadro, silná žiara), jemne rozptýlená IBA zhora, bez cikcaku a bez záblesku obrazovky. **11:27: úvod STLAČENÝ – údaje na jednu obrazovku** (`fit.css`: bez zoznamu krajín a grafu nafty, bez grafu obchodov, menší graf cien, bez vtipu; od 700 px dlaždice v 2 stĺpcoch). 🎤 mikrofón (`voice.js`) sa dá potiahnuť, poloha v localStorage `ernte-va-pos`.
- Vtipy na úvode: ~100 vlastných vo východniarskom nárečí (`KE` vo `welcome.js`), bez opakovania na zariadení.
- Kontroly bez prístupu k sieti z Claude: workflowy `health.yml` (dostupnosť) a `icotest.yml` (registre) zapisujú výsledok do vetiev
  `health-results` / `ico-results`.
- Automatický test živej aplikácie na 7 zariadeniach (`.github/e2e/`, výsledky zašifrované v vetve `e2e-results`).
- **Push centrum (29. 10.)** – `farmar/supabase/push*.sql`, `pushcenter.js`: ntfy (témy flotila / majiteľ / kalendár) + Web Push, `push_log` (HTTP kódy),
  deduplikácia, tiché hodiny, hodinový (`push-hodina`) a ranný súhrn (5:00). Alarmy Flotily podľa stupňa (`fleet_push_scan`, pôvodné okamžité ntfy z kontrol vypnuté),
  udalosti aplikácie (`push_app`), pripomienky kalendára so zvonením a „Beriem na vedomie“ (`cal_ring`, `cal_ack`). Nastavenia → 🔔 Notifikácie / 🩺 Diagnostika (Stav úloh AI).
- **Výpis kariet po obdobiach** (`karty_obdobie.sql`, `fleet_cfg.cardcfg`): výpočty nafty iba do posledného výpisu, poskytovatelia kariet, pokrytie skupín.
- Prezentácie (Claude Slides): majiteľ, farmár, kurací trus, Jana, Galajda, Ličko, Tóth.

### Čaká / odložené
- Databáza migrácie SPRACÚVA (Diagnostika → Automatické zmeny databázy, 28. 10. všetky ✅). Zápis do GitHubu opäť funguje
  (29. 10.: workflow `ernte-push` 147 behov, posledný ✅ 21:36). Stále otvorený je „Audit Claude 9 (lístky)“ (#57) – dokončiť bezpečnostný audit.
- Vetvy: 4 nezlúčené návrhy ERNTE AI z 25.–26. 10. (`ai-ulohy-*`, `ai-uprava-20261026`) sú prerobené v appke novšie a uložené
  v `archiv-ai-vetvy`. Majiteľ ich ponecháva (29. 10.: „nejdem do toho“) – neškodia, appku neovplyvňujú; znova to neponúkať.
  Issue #51 „ERNTE upozornenia – technické (nemazať)“ sa nesmie mazať (spúšťa upozornenia do mobilu).
- Fotka Dominika Klacika na úvode Martina NAHRADENÁ 31. 10. (príkaz majiteľa, bez povolenia autora) späť `img/ja-uvod.jpg` (SDF Deutschland, CC BY-SA 4.0); súbor zmazaný. Potvrdenie práv k reklame Bio-Fer NATUR (úvod trusu) zatiaľ nemáme.
- Odložené majiteľom („k tomu sa vrátime“): upratanie karty upozornení, vlastná doména (app.ernte.sk), verejná web stránka, aplikácia vs. web.
- Pozdrav s menom pri kuracom truse (ponúknuté).
- Staršie: KROS, údaje firiem Agro-Somotor / Danube.
