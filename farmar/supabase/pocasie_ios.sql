-- 🍏 Počasie ako v iPhone + poloha pri každom otvorení (1. 11. 2026) – iba novinky (zmena je v aplikácii, wxs.js / wxplaces.js)
insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-01','🍏 Počasie ako v iPhone','Počasie (záložka) · úvod LIVE','všetci',array['all'],
 'Počasie vyzerá ako klasické Počasie v iPhone: obloha podľa počasia, mesto, veľká teplota, V/N, hodiny aj s východom a západom slnka, 10 dní s farebným pruhom teplôt, mapa zrážok a karty UV, slnko, vietor, zrážky, pocitová teplota, vlhkosť, viditeľnosť, tlak, mesiac. Ikony ako v iPhone: jasno = slnko, polojasno = mrak so slnkom, dážď = mrak s kvapkami. Pri každom otvorení aplikácie sa počasie zistí podľa vašej polohy (GPS).'
where not exists(select 1 from app_novinky where titul='🍏 Počasie ako v iPhone');
insert into app_dni(d,kratko,podrobne) values('2026-11-01','Počasie ako v iPhone, poloha pri otvorení',
 'Počasie prerobené na vzhľad iPhone (ikony slnko / mrak so slnkom, obloha, 10 dní s pruhom teplôt), poloha GPS pri každom otvorení aplikácie.')
on conflict(d) do update set podrobne=coalesce(app_dni.podrobne,'')||case when coalesce(app_dni.podrobne,'') like '%Počasie prerobené na vzhľad iPhone%' then '' else ' · Počasie prerobené na vzhľad iPhone (ikony, obloha, 10 dní), poloha GPS pri každom otvorení aplikácie.' end, updated_at=now();
