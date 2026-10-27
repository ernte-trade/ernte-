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

## Bezpečnosť a dáta
- Žiadne heslá, kľúče, pečiatky ani obchodné dáta v čitateľnej podobe v repozitári – iba zašifrované migrácie.
- Marža, zisk, mzdy a výsledok vidí iba majiteľ. Farmár nikdy nevidí odberateľa, burzu, predajné ceny ani iných farmárov.
- Upozornenia príjemcom odchádzajú až po schválení majiteľom (📤), okrem výslovne povolených automatických správ
  (napr. „objednávka je v spracovaní“).

## Nasadenie
- Zvýšiť `CACHE` v `farmar/sw.js` a `?v=` pri zmenených skriptoch v `farmar/index.html`.
- Push do `main` aj `gh-pages`.
