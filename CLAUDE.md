# ERNTE Trade & Logistic – pravidlá pre každú úpravu aplikácie

Platí pre Claude aj ERNTE AI pri každej novej sekcii, záložke, funkcii alebo type používateľa.

## Povinne pri každej novej sekcii / funkcii
1. **📲 Pridať na plochu** – každý nový typ používateľa alebo nová obrazovka po prihlásení musí zobraziť dlaždicu
   „Pridať na plochu“ (`farmar/installapp.js`). Dlaždica sa vkladá automaticky do `#app` po `.hero` alebo `nav.tabs`;
   nová obrazovka musí mať jedno z toho, inak doplň miesto vloženia v `installapp.js`. Tlačidlo musí fungovať:
   systémové okno inštalácie, inak presný návod pre prehliadač.
2. **ℹ️ Popis funkcie** – nová záložka dostane popis v `TABD`, nová sekcia s dlaždicami v `SECD`, dôležitý nadpis v `H2`
   (`farmar/fndesc.js`). Nová záložka dostane aj návod `HELP` v `index.html` (tlačidlo „Ako to funguje“).
3. **🆕 Novinky** – každá zmena sa zapíše do `app_novinky` (zašifrovaná migrácia v `farmar/supabase/auto/`):
   dátum, názov, kde to nájsť, kto to vidí, `aud` (owner / staff / farmer / all / kľúč prístupu) a krátky popis.
   Pri novom dni aj `app_dni` (krátke a podrobné zhrnutie dňa, vidí iba majiteľ).
4. **Prístupy** – nová funkcia má kľúč v `PCAT` (`perms.js`), záložka v `TABP`, a ochranu aj v databáze (RLS / `has_perm`).
5. **Jazyk** – časti pre maďarských partnerov (Danube, Baromfi) majú prepínač 🇸🇰 SK / 🇭🇺 HU.
6. **Odkaz na aplikáciu** – v správach pre používateľov nikdy holý odkaz na začiatku; vždy „👉 ERNTE Trade & Logistic: …“ na konci,
   v aplikácii zobrazovať cez `appLinkHTML()` (logo + názov namiesto https).

7. **Štýl dokumentov (PDF)** – všetko o doprave (preprava, jazdy, CMR, vodiči, flotila, doprava trusu) v štýle **VALKO s.r.o.**,
   obchod, výkup, zúčtovanie, zmluvy a kurací trus v štýle **ERNTE spol. s r.o.** Hlavička cez `brandHead("valko"|"ernte", nadpis, podnadpis)`
   a farby cez `brandCss(...)` (`farmar/brand.js`).

## Bezpečnosť a dáta
- Žiadne heslá, kľúče, pečiatky ani obchodné dáta v čitateľnej podobe v repozitári – iba zašifrované migrácie.
- Marža, zisk, mzdy a výsledok vidí iba majiteľ. Farmár nikdy nevidí odberateľa, burzu, predajné ceny ani iných farmárov.
- Upozornenia príjemcom odchádzajú až po schválení majiteľom (📤), okrem výslovne povolených automatických správ
  (napr. „objednávka je v spracovaní“).

## Nasadenie
- Zvýšiť `CACHE` v `farmar/sw.js` a `?v=` pri zmenených skriptoch v `farmar/index.html`.
- Push do `main` aj `gh-pages`.
- **`?v=` je povinné** pri každom zmenenom skripte / štýle.
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
- **Príkaz majiteľa (trvalý):** pracovať na 100 %, bezchybne a rýchlo; nič nepoškodiť (model cenníka, nastavenia, údaje). Pred nasadením otestovať.

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
- Úvod sa dá vždy opustiť: „Poďme na to“, ✕ vľavo hore, ťuknutie mimo karty; ukazuje sa aj v náhľade „Pozrieť ako“.
  Rozloženie: pod 1100 px šírky panely nad kartou (bez prekrývania, posúvateľné), nad 1100 px panely vpravo, karta vľavo.
- Firmy podľa IČO (`firmy.js`, prístup `firmy`): po zadaní IČO / odfotení pečiatky vyplní meno a sídlo z registra RPO
  (api.statistics.sk, CORS povolený, zadarmo) + odkaz FinStat. DIČ / IČ DPH: RÚZ (registeruz.sk) ich má, ale nemá CORS →
  iba cez databázu (pg_net); plný FinStat API potrebuje platený kľúč (zadať v aplikácii, nikdy v chate).
- Vtipy na úvode: ~100 vlastných vo východniarskom nárečí (`KE` vo `welcome.js`), bez opakovania na zariadení.
- Kontroly bez prístupu k sieti z Claude: workflowy `health.yml` (dostupnosť) a `icotest.yml` (registre) zapisujú výsledok do vetiev
  `health-results` / `ico-results`.
- Automatický test živej aplikácie na 7 zariadeniach (`.github/e2e/`, výsledky zašifrované v vetve `e2e-results`).
- Prezentácie (Claude Slides): majiteľ, farmár, kurací trus, Jana, Galajda, Ličko, Tóth.

### Čaká / odložené
- Overiť, či databáza spracúva migrácie z `farmar/supabase/auto/` (od ~10:00 28. 10. nebol žiadny „Audit Claude“ ani push –
  `Audit Claude 8 (bezpečnosť)` čaká). Bezpečnostná kontrola dát (RLS, anon, funkcie, úložisko) – dokončiť po výsledku auditu.
- Povolenie na fotky Dominika Klacika (CLAAS) a potvrdenie práv k reklame Bio-Fer NATUR (úvod trusu).
- Odložené majiteľom („k tomu sa vrátime“): upratanie karty upozornení, vlastná doména (app.ernte.sk), verejná web stránka, aplikácia vs. web.
- Pozdrav s menom pri kuracom truse (ponúknuté).
- Staršie: KROS, údaje firiem Agro-Somotor / Danube.
