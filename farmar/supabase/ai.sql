-- ERNTE AI Podpora – chat s AI (Claude), prehľady do Dashboardu, úlohy na úpravu aplikácie.
-- Vidí iba majiteľ (role owner). Kľúče sú v trezore Supabase (Vault), nie v kóde.
create extension if not exists pg_net;
create extension if not exists pgcrypto with schema extensions;

create table if not exists ai_msgs(
  id bigserial primary key,
  kind text not null default 'chat' check (kind in ('chat','report','fix')),
  role text not null check (role in ('user','assistant')),
  content text,
  status text not null default 'ok' check (status in ('ok','wait','err')),
  req_id bigint, tries int not null default 0, convo jsonb,
  created_at timestamptz not null default now());
create index if not exists ai_msgs_at on ai_msgs(created_at desc);
create table if not exists ai_tasks(
  id uuid primary key default gen_random_uuid(),
  text text not null,
  status text not null default 'nova' check (status in ('nova','odoslana','hotova','chyba')),
  req_id bigint, tries int not null default 0, msg_id bigint,
  report text, created_at timestamptz not null default now(), done_at timestamptz);
create table if not exists ai_state(key text primary key, value jsonb, updated_at timestamptz default now());

alter table ai_msgs enable row level security;
alter table ai_tasks enable row level security;
alter table ai_state enable row level security;
drop policy if exists ai_msgs_own on ai_msgs;  create policy ai_msgs_own  on ai_msgs  for select using (is_owner());
drop policy if exists ai_tasks_own on ai_tasks; create policy ai_tasks_own on ai_tasks for select using (is_owner());
drop policy if exists ai_state_own on ai_state; create policy ai_state_own on ai_state for all using (is_owner()) with check (is_owner());

create or replace function public.ai_secret(n text) returns text language sql stable security definer set search_path=public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name=n limit 1 $$;
revoke all on function public.ai_secret(text) from public, anon, authenticated;

-- bezpečný dopyt: chyba v jednej časti nezhodí celý prehľad
create or replace function public.ai_part(q text) returns jsonb language plpgsql volatile security definer set search_path=public, extensions as $$
declare r jsonb; begin execute 'select to_jsonb(('||q||'))' into r; return r; exception when others then return jsonb_build_object('chyba',SQLERRM); end $$;
revoke all on function public.ai_part(text) from public, anon, authenticated;

-- mesačné KPI flotily priamo z databázy (nezávisle od aplikácie)
create or replace function public.ai_fleet_kpi() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare m0 timestamptz:=date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava'; c jsonb; km numeric; l numeric; lok numeric; kok numeric; rl numeric; re numeric; n int; d numeric; t numeric; sh numeric; fx numeric; rt numeric; dim int; dd int;
begin
  select coalesce(value,'{}') into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  d:=coalesce((c->>'diesel')::numeric,1.952); t:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100); fx:=coalesce((c->>'fixed')::numeric,80000); rt:=coalesce((c->>'rate')::numeric,1.5);
  select count(*), coalesce(sum(distance),0), coalesce(sum(fuel_consumed) filter (where distance>0),0), coalesce(sum(refuel_l),0), coalesce(sum(refuel_eur),0) into n,km,l,rl,re from rides where start_at>=m0;
  select coalesce(sum(vl),0), coalesce(sum(vk),0) into lok,kok from (select sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0) vl, sum(distance) filter (where distance>0 and fuel_consumed>0) vk, sum(distance) vtot from rides where start_at>=m0 group by vehicle_id) v where vtot>=100;
  dim:=extract(day from (date_trunc('month',now() at time zone 'Europe/Bratislava')+interval '1 month - 1 day'))::int; dd:=extract(day from now() at time zone 'Europe/Bratislava')::int;
  return jsonb_build_object('obdobie','tento mesiac do dnes','jazd',n,'km',round(km),'nafta_l',round(l),'l_100km_flotila_bez_aut_pod_100km',case when kok>20 then round(lok/kok*100,1) end,
    'natankovane_l',round(rl),'natankovane_eur',round(re),'natankovane_eur_za_l',case when rl>0 then round(re/rl,3) end,
    'rozdiel_spotreba_minus_natankovane_l',round(l-rl),'rozdiel_pct',case when l>0 then round((l-rl)/l*100,1) end,'rozdiel_eur_pri_cene_z_nastaveni',round((l-rl)*d),
    'cena_nafty_s_dph',d,'nafta_eur_s_dph',round(l*d),'nafta_eur_bez_dph',round(l*d/1.23),'myto_eur_km',t,'myto_podiel_km_pct',sh,'myto_eur',round(km*sh/100*t),
    'nafta_s_dph_plus_myto_eur',round(l*d+km*sh/100*t),'eur_na_km_s_dph',case when km>0 then round((l*d+km*sh/100*t)/km,3) end,
    'obrat_sadzba_eur_km',rt,'obrat_eur',round(km*rt),'pevne_naklady_mesiac',fx,'pevne_naklady_pomerne_k_dnu',round(fx*dd/dim),
    'mzdy','počíta aplikácia (kpi_z_aplikacie), databáza ich nemá');
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_fleet_kpi() from public, anon, authenticated;

-- rozpis tohto mesiaca po vodičoch a ich autách (spotreba priradená konkrétnemu vodičovi)
-- l_100km iba z jázd, ktoré majú km aj litre; pod 100 km = „málo dát“
create or replace function public.ai_fleet_drivers() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare m0 timestamptz:=date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava'; r jsonb;
begin
  with p as (select coalesce(nullif(trim(driver),''),'neznámy vodič') vodic, coalesce(nullif(trim(plate),''),vehicle_id,'?') auto,
      coalesce(sum(distance),0) km, coalesce(sum(fuel_consumed),0) l,
      coalesce(sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0),0) lok, coalesce(sum(distance) filter (where distance>0 and fuel_consumed>0),0) kok,
      coalesce(sum(refuel_l),0) ref
    from rides where start_at>=m0 group by 1,2),
  d as (select vodic, sum(km) km, sum(l) l, sum(lok) lok, sum(kok) kok, sum(ref) ref,
      jsonb_agg(jsonb_build_object('auto',auto,'km',round(km),'litre',round(l),
        'l_100km',case when km>=100 and kok>20 then to_jsonb(round(lok/kok*100,1)) else '"málo dát"'::jsonb end,'natankovane_l',round(ref)) order by km desc) auta
    from p group by vodic)
  select coalesce(jsonb_agg(jsonb_build_object('vodic',vodic,'km',round(km),'litre',round(l),
      'l_100km',case when km>=100 and kok>20 then to_jsonb(round(lok/kok*100,1)) else '"málo dát"'::jsonb end,
      'malo_dat',km<100,'natankovane_l',round(ref),'auta',auta) order by km desc),'[]') into r from d;
  return r;
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_fleet_drivers() from public, anon, authenticated;

-- diagnostika: čo je zapnuté a kde chýbajú dáta
create or replace function public.ai_diag() returns jsonb language plpgsql security definer set search_path=public as $$
declare m0 text:=quote_literal((date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava')::text);
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  return jsonb_build_object(
   'udalosti_spolu', ai_part('select count(*) from fleet_events'),
   'udalosti_posledna', ai_part($q$select to_char(max(at) at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') from fleet_events$q$),
   'udalosti_podla_typu_30_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '30 days' group by kind) x$q$),
   'dvor_nastaveny', ai_part($q$select exists(select 1 from fleet_cfg where key='yard') or exists(select 1 from places where kind='yard')$q$),
   'miesta', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from places group by kind) x$q$),
   'miesta_s_upozornenim', ai_part('select count(*) from places where notify'),
   'ntfy_tema_nastavena', ai_part($q$select coalesce((select value->>'topic' from fleet_cfg where key='notify'),'') <> ''$q$),
   'funkcie', ai_part($q$select jsonb_build_object('yard_check',to_regprocedure('public.yard_check()') is not null,'place_check',to_regprocedure('public.place_check()') is not null,'stop_check',to_regprocedure('public.stop_check()') is not null,'fuel_check',to_regprocedure('public.fuel_check()') is not null,'osm_sync',to_regprocedure('public.osm_sync()') is not null)$q$),
   'cron_ulohy', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('uloha',jobname,'zapnuta',active,'rozvrh',schedule)),'[]') from cron.job$q$),
   'cron_posledne_behy', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select j.jobname uloha, d.status, left(d.return_message,120) sprava, to_char(d.start_time at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from cron.job_run_details d join cron.job j on j.jobid=d.jobid where d.start_time>now()-interval '15 minutes' order by d.start_time desc limit 12) x$q$),
   'cron_chyby_24h', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select j.jobname uloha, count(*) chyb, max(left(d.return_message,160)) posledna from cron.job_run_details d join cron.job j on j.jobid=d.jobid where d.status<>'succeeded' and d.start_time>now()-interval '24 hours' group by j.jobname) x$q$),
   'commander_posledne', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, to_char(max(at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') posledne, max(code) filter (where at>now()-interval '1 hour') kod from cmd_log group by kind) x$q$),
   'aut_spolu', ai_part('select count(*) from cmd_vehicles'),
   'auta_s_polohou_do_30_min', ai_part($q$select count(*) from cmd_vehicles where lat is not null and gps_at>now()-interval '30 minutes'$q$),
   'najnovsia_poloha', ai_part($q$select to_char(max(gps_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from cmd_vehicles$q$),
   'najstarsia_poloha', ai_part($q$select to_char(min(gps_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from cmd_vehicles$q$),
   'auta_na_mieste_teraz', ai_part('select count(*) from veh_place where place_id is not null'),
   'kontroly_stav', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('kontrola',fn,'posledny_ok',to_char(ok_at at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'udalosti',n,'chyba',msg,'chyba_kedy',to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI'))),'[]') from check_err$q$),
   'auta_bez_jazd_tento_mesiac', ai_part('select coalesce(jsonb_agg(coalesce(v.plate,v.name,v.id)),''[]'') from cmd_vehicles v where not exists(select 1 from rides r where r.vehicle_id=v.id and r.start_at>='||m0||'::timestamptz)'),
   'auta_malo_dat_pod_100km', ai_part('select coalesce(jsonb_agg(jsonb_build_object(''auto'',a,''km'',km,''l'',l)),''[]'') from (select coalesce(plate,vehicle_id) a, round(sum(distance)) km, round(sum(fuel_consumed)) l from rides where start_at>='||m0||'::timestamptz group by 1 having coalesce(sum(distance),0)<100) x'),
   'jazdy_mesiac', ai_part('select count(*) from rides where start_at>='||m0||'::timestamptz'),
   'jazdy_s_tankovanim_mesiac', ai_part('select count(*) from rides where refuel_l>0 and start_at>='||m0||'::timestamptz'),
   'tankovanie_bez_ceny_mesiac', ai_part('select count(*) from rides where refuel_l>0 and coalesce(refuel_eur,0)=0 and start_at>='||m0||'::timestamptz'),
   'farmari', ai_part($q$select jsonb_build_object('spolu',count(*),'aktivni',count(*) filter (where active),'s_emailom',count(*) filter (where email is not null)) from farmers$q$),
   'obchodov_spolu', ai_part('select count(*) from deals'),
   'poziadaviek_spolu', ai_part('select count(*) from requests'),
   'poziadaviek_novych', ai_part($q$select count(*) from requests where status='nova'$q$),
   'ai_ulohy', ai_part($q$select coalesce(jsonb_object_agg(status,n),'{}') from (select status,count(*) n from ai_tasks group by status) x$q$),
   'auto_zmeny_db', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('subor',name,'stav',status,'chyba',msg,'kedy',to_char(coalesce(done_at,at) at time zone 'Europe/Bratislava','DD.MM HH24:MI')) order by name desc),'[]') from (select * from ai_mig order by name desc limit 8) x$q$),
   'github_token_ulozeny', ai_part($q$select exists(select 1 from vault.secrets where name='github_token')$q$));
end $$;
grant execute on function public.ai_diag() to authenticated;

-- prehľad firmy, ktorý AI dostane ku každej otázke
create or replace function public.ai_snapshot() returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare m0 text:=quote_literal((date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava')::text);
begin
  return jsonb_build_object(
   'teraz', to_char(now() at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),
   'cennik_eur_t', ai_part($q$select coalesce(jsonb_object_agg(com,coalesce(price::text,'nezadané')),'{}') from prices$q$),
   'cennik_bez_ceny', ai_part($q$select coalesce(jsonb_agg(c),'[]') from unnest(array['repka','lo','ho','soja','psenica_p','psenica_k','jacmen_k','jacmen_s','kukurica','cirok']) c where not exists(select 1 from prices p where p.com=c and p.price is not null)$q$),
   'cennik_platny_do', ai_part($q$select coalesce((select value->>'valid' from settings where key='pricelist'),'nezadané')$q$),
   'obchody_podla_stavu', ai_part($q$select coalesce(jsonb_object_agg(status, x),'{}') from (select status, jsonb_build_object('pocet',count(*),'ton',sum(tons),'dodane_t',sum(delivered_t),'hodnota_eur',round(sum(tons*price))) x from deals group by status) s$q$),
   'otvorene_obchody', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select d.no, f.name farmar, d.com komodita, d.tons ton, d.delivered_t dodane_t, d.price cena, d.status stav, d.term termin, d.created_at::date vytvorene from deals d join farmers f on f.id=d.farmer_id where d.status not in ('zaplateny','zruseny') order by d.created_at desc limit 25) x$q$),
   'nove_poziadavky', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select r.kind typ, f.name farmar, r.com, r.tons, r.price, r.pickup_date, r.note, r.created_at::date from requests r join farmers f on f.id=r.farmer_id where r.status='nova' order by r.created_at desc limit 15) x$q$),
   'flotila_kpi_mesiac_z_databazy', ai_fleet_kpi(),
   'flotila_po_autach_mesiac', ai_part('select coalesce(jsonb_agg(x),''[]'') from (select coalesce(plate,vehicle_id) auto, round(sum(distance)) km, round(sum(fuel_consumed)) l, case when sum(distance)>=100 then round(100*sum(fuel_consumed)/nullif(sum(distance),0),1)::text else ''málo dát'' end l_100km, round(sum(refuel_l)) natankovane_l from rides where start_at>='||m0||'::timestamptz group by 1 order by 2 desc nulls last) x'),
   'flotila_po_vodicoch', ai_fleet_drivers(),
   'auta_teraz', ai_part($q$select jsonb_build_object('spolu',count(*),'ide',count(*) filter (where speed>3 and gps_at>now()-interval '20 min')) from cmd_vehicles$q$),
   'udalosti_7_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '7 days' group by kind) x$q$),
   'posledne_alarmy_nafta', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, plate, driver, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where at>now()-interval '7 days' and kind in ('fuel_drop','refuel_gap') order by at desc limit 10) x$q$),
   'alarmy_z_aplikacie', ai_part($q$select value->'alarmy' from ai_state where key='kpi'$q$),
   'nastavenia_nakladov', ai_part($q$select value from fleet_cfg where key='costs'$q$),
   'kpi_z_aplikacie', ai_part($q$select coalesce((select value||jsonb_build_object('aktualizovane',to_char(updated_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')) from ai_state where key='kpi'),'"majiteľ ešte neotvoril Flotilu"'::jsonb)$q$),
   'diagnostika', ai_diag(),
   'posledne_upravy_ai', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x$q$));
exception when others then return jsonb_build_object('chyba_prehladu',SQLERRM);
end $$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;

create or replace function public.ai_system() returns text language sql stable as $$ select
'Si ERNTE AI – osobný poradca a kontrolór majiteľa (Martin Vaľko) firiem ERNTE spol. s r.o. (výkup obilia a olejnín od farmárov, predaj odberateľom/na burzu) a VALKO s.r.o. (kamiónová doprava, Scania ťahače, Michalovce, dvor Medovská 46). Píš po slovensky, stručne, priamo, bez omáčok, ako skúsený obchodný riaditeľ. Používaj čísla.
Úlohy: 1) kontroluj obchody, náklady, zisky a straty, flotilu (spotreba, krádeže nafty, prestoje) a upozorni čo je zlé a čo dobré; 2) sleduj trhy (MATIF repka/pšenica/kukurica, CBOT sója, slovenské a maďarské výkupné ceny, nafta) – na aktuálne ceny VŽDY použi web_search a uveď zdroj a dátum; 3) raď konkrétne čo má robiť (kúpiť/predať/držať, za akú cenu, komu volať, čo skontrolovať).
Nikdy si nevymýšľaj čísla – ak údaj chýba, napíš „nezadané“ alebo „málo dát“, nikdy nie 0. Zisk = obrat − (nafta + mýto + pevné náklady + mzdy); ak chýbajú mzdy (kpi_z_aplikacie.mzdy_eur je null), napíš že zisk sa nedá presne spočítať. Autá s menej ako 100 km za mesiac majú „málo dát“ – nerátaj ich do priemernej spotreby ani alarmov. Spotrebu konkrétneho vodiča ber z flotila_po_vodicoch (vodič → autá, km, litre, l/100 km, natankované litre); vodič s menej ako 100 km za mesiac má „málo dát“ – jeho spotrebu nehodnoť. Pri technických problémoch (chýbajúce udalosti, alarmy, jazdy) použi sekciu diagnostika a povedz presne, čo je vypnuté alebo nenastavené.
PLNÉ OPRÁVNENIE: majiteľ ti dal plný prístup ku všetkému v tejto aplikácii (kód aj databáza). Úpravy aj zmeny databázy sa robia a nasadzujú automaticky – nikdy nežiadaj majiteľa, aby spúšťal SQL alebo niečo kopíroval. Ak vidíš chybu alebo chýbajúce dáta (aj v diagnostike), sám navrhni opravu ako ÚLOHU.
ÚPRAVY APLIKÁCIE: ak majiteľ chce niečo v aplikácii opraviť, pridať alebo zmeniť, NEROB to v texte – na koniec odpovede pridaj samostatný riadok presne v tvare
ÚLOHA: <presný a úplný popis zmeny po slovensky, aby ju programátor vedel spraviť bez ďalších otázok>
(jeden riadok na jednu zmenu). Povedz mu, že úprava bude hotová spravidla do hodiny a zhrnutie uvidí v Dashboarde. Aplikácia: ERNTE Trade & Logistic (záložky Požiadavky, Cenník, Doprava, Flotila, Obchody, Farmári, Počasie, Tím; Flotila má Dashboard, Prevádzka a náklady, Alarmy, Mapa, Pohyby, Vozidlá, Vodiči a mzdy, Miesta, Nastavenia).
Formát (Markdown): krátke odseky, nadpisy „## “, odrážky „- “, číslované zoznamy, tučné **takto**, tabuľky | stĺpec | stĺpec |.
DOKUMENTY A VÝSTUPY: vieš pripraviť čokoľvek – zmluvy, kúpne a prepravné zmluvy, cenové ponuky, objednávky, listy, e-maily, upomienky, reporty, tabuľky, plány, preklady. Píš ich ako hotový dokument s nadpisom (prvý riadok „## Názov“), dátumom a údajmi firmy z prehľadu. Aplikácia pod každou tvojou odpoveďou automaticky ukáže tlačidlá Kopírovať, PDF, Word, Excel (keď sú v odpovedi tabuľky), E-mail a Zdieľať – preto nikdy nehovor, že PDF alebo súbor nevieš urobiť; povedz „ťukni PDF / Word pod odpoveďou“.
KOPÍROVANIE: keď majiteľ chce text na skopírovanie (správa, SMS, e-mail, príspevok, údaje), daj ten text do bloku ohraničeného riadkami ``` – aplikácia k nemu pridá tlačidlo Kopírovať (dva štvorčeky). Mimo bloku napíš max 1 vetu.
Údaje, ktoré nepoznáš (IČO odberateľa, presné adresy), nevymýšľaj – nechaj [doplniť].
PRÍLOHY: majiteľ ti môže poslať fotky (vážne lístky, faktúry, doklady, poškodenia), PDF, Word, Excel. Prečítaj ich dôkladne, vytiahni čísla a údaje a povedz, čo s nimi spraviť.' $$;

create or replace function public.ai_json(t text) returns jsonb language plpgsql immutable as $$ begin return t::jsonb; exception when others then return null; end $$;

-- interné: pošli požiadavku na Claude API
create or replace function public.ai_post(convo jsonb, sys_extra text default '') returns bigint language plpgsql security definer set search_path=public, net as $$
declare k text:=regexp_replace(coalesce(ai_secret('anthropic_key'),''),'\s','','g'); md text:=(select value->>'mode' from ai_state where key='auth');
begin
  if k='' then k:=null; end if;
  if k is null then raise exception 'Chýba API kľúč – spusti nastavenie na stránke ai.html.'; end if;
  return net.http_post(url:='https://api.anthropic.com/v1/messages',
    headers:=case when coalesce(md, case when k like 'sk-ant-api%' then 'x' else 'b' end)='x' then jsonb_build_object('x-api-key',k) else jsonb_build_object('Authorization','Bearer '||k) end||jsonb_build_object('anthropic-version','2023-06-01','content-type','application/json'),
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',3000,
      'system', ai_system()||E'\n\nAKTUÁLNE ÚDAJE FIRMY (JSON):\n'||ai_snapshot()::text||sys_extra,
      'messages',convo,
      'tools',jsonb_build_array(jsonb_build_object('type','web_search_20250305','name','web_search','max_uses',5))),
    timeout_milliseconds:=180000);
end $$;
revoke all on function public.ai_post(jsonb,text) from public, anon, authenticated;

-- majiteľ pošle správu
alter table ai_msgs add column if not exists att jsonb;
alter table ai_msgs add column if not exists att_meta jsonb;
drop function if exists public.ai_ask(text,jsonb);
create or replace function public.ai_ask(q text, kpi jsonb default null, att jsonb default null) returns bigint language plpgsql security definer set search_path=public as $$
declare cv jsonb:='[]'; r record; last text:=''; aid bigint; uid bigint; meta jsonb; c text;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if coalesce(trim(q),'')='' and att is null then raise exception 'Prázdna správa.'; end if;
  q:=coalesce(nullif(trim(q),''),'Pozri si prílohu.');
  if kpi is not null then insert into ai_state(key,value,updated_at) values('kpi',kpi,now()) on conflict(key) do update set value=excluded.value, updated_at=now(); end if;
  if att is not null and jsonb_typeof(att)='array' and jsonb_array_length(att)>0 then
    select jsonb_agg(jsonb_build_object('name',a->>'name','kind',a->>'kind','thumb',a->>'thumb')) into meta from jsonb_array_elements(att) a;
  else att:=null; end if;
  insert into ai_msgs(kind,role,content,att,att_meta) values('chat','user',left(q,8000),att,meta) returning id into uid;
  for r in select * from (select role, content, id, att_meta from ai_msgs where kind='chat' and status='ok' order by id desc limit 16) t order by id loop
    if jsonb_array_length(cv)=0 and r.role<>'user' then continue; end if;
    c:=r.content;
    if r.att_meta is not null and r.id<>uid then c:=c||E'\n[prílohy: '||(select string_agg(m->>'name',', ') from jsonb_array_elements(r.att_meta) m)||']'; end if;
    if r.role=last then cv:=jsonb_set(cv, array[(jsonb_array_length(cv)-1)::text,'content'], to_jsonb((cv->-1->>'content')||E'\n\n'||c));
    else cv:=cv||jsonb_build_array(jsonb_build_object('role',r.role,'content',c)); end if;
    last:=r.role;
  end loop;
  -- prílohy (obrázky, PDF, texty) k poslednej správe
  if att is not null then
    cv:=jsonb_set(cv, array[(jsonb_array_length(cv)-1)::text,'content'],
      coalesce((select jsonb_agg(case a->>'kind'
          when 'image' then jsonb_build_object('type','image','source',jsonb_build_object('type','base64','media_type',a->>'media_type','data',a->>'data'))
          when 'pdf' then jsonb_build_object('type','document','source',jsonb_build_object('type','base64','media_type','application/pdf','data',a->>'data'),'title',a->>'name')
          else jsonb_build_object('type','text','text','Príloha „'||coalesce(a->>'name','súbor')||'“:'||E'\n'||left(coalesce(a->>'text',''),150000)) end) from jsonb_array_elements(att) a),'[]'::jsonb)
      ||jsonb_build_array(jsonb_build_object('type','text','text',cv->-1->>'content')));
  end if;
  insert into ai_msgs(kind,role,status,convo,req_id) values('chat','assistant','wait',cv,ai_post(cv)) returning id into aid;
  return aid;
end $$;
grant execute on function public.ai_ask(text,jsonb,jsonb) to authenticated;

-- prehľad (ráno/poobede alebo na požiadanie)
create or replace function public.ai_report(what text default null) returns bigint language plpgsql security definer set search_path=public as $$
declare cv jsonb; aid bigint;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  cv:=jsonb_build_array(jsonb_build_object('role','user','content',coalesce(what,
    'Sprav prehľad pre majiteľa na Dashboard: 1) TRHY dnes – MATIF repka, pšenica, kukurica, CBOT sója (vyhľadaj aktuálne ceny a trend) a porovnaj s naším cenníkom; 2) OBCHODY – čo je otvorené, riziká, marža; 3) FLOTILA – km, spotreba, náklady, zisk/strata, alarmy, podozrivé veci; 4) ČO ROBIŤ DNES – max 5 konkrétnych krokov. Začni jednou vetou s najdôležitejšou vecou. Max ~250 slov.')));
  insert into ai_msgs(kind,role,content) values('report','user',coalesce(what,'Prehľad'));
  insert into ai_msgs(kind,role,status,convo,req_id) values('report','assistant','wait',cv,ai_post(cv)) returning id into aid;
  return aid;
end $$;
grant execute on function public.ai_report(text) to authenticated;

-- interné: vytvor GitHub úlohu (zašifrovanú) pre programátora-AI
create or replace function public.ai_gh_issue(t uuid) returns void language plpgsql security definer set search_path=public, extensions, net as $$
declare tk text:=regexp_replace(coalesce(ai_secret('github_token'),''),'\s','','g'); pw text:=ai_secret('ai_pass'); x record;
begin
  select * into x from ai_tasks where id=t; if not found then return; end if;
  if tk='' then update ai_tasks set status='chyba', report='Chýba GitHub token – vlož ho na stránke ai.html a potom ťukni Skúsiť znova.' where id=t; return; end if;
  if pw is null then update ai_tasks set status='chyba', report='Chýba AI kľúč – vlož ho na stránke ai.html a potom ťukni Skúsiť znova.' where id=t; return; end if;
  -- stav ostáva „nova“ (čaká na odoslanie), kým GitHub nepotvrdí 201
  update ai_tasks set status='nova', report=null, tries=tries+1, req_id=net.http_post(
    url:='https://api.github.com/repos/ernte-trade/ernte-/issues',
    headers:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28','Content-Type','application/json'),
    body:=jsonb_build_object('title','AI úloha '||left(t::text,8),'body','ernte-ai-task '||t::text||E'\n\n'||armor(pgp_sym_encrypt(x.text,pw,'cipher-algo=aes256')))) where id=t;
end $$;
revoke all on function public.ai_gh_issue(uuid) from public, anon, authenticated;

-- majiteľ: skúsiť úlohu odoslať znova
create or replace function public.ai_task_retry(t uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  update ai_tasks set tries=0, req_id=null, status='nova', report=null where id=t and status='chyba';
  perform ai_gh_issue(t);
end $$;
grant execute on function public.ai_task_retry(uuid) to authenticated;

-- spracuj odpovede (volá aplikácia aj cron)
create or replace function public.ai_collect() returns int language plpgsql security definer set search_path=public, net as $$
declare m record; r record; j jsonb; txt text; n int:=0; ln text; tid uuid;
begin
  for m in select * from ai_msgs where status='wait' and req_id is not null order by id for update skip locked loop
    select * into r from net._http_response where id=m.req_id;
    if r.id is null then
      if m.created_at<now()-interval '6 minutes' then update ai_msgs set status='err', content='AI neodpovedala včas. Skús znova.' where id=m.id; end if;
      continue; end if;
    n:=n+1;
    if r.status_code=401 and m.tries<2 then
      insert into ai_state(key,value) values('auth',jsonb_build_object('mode',case when coalesce((select value->>'mode' from ai_state where key='auth'),case when ai_secret('anthropic_key') like 'sk-ant-api%' then 'x' else 'b' end)='x' then 'b' else 'x' end))
        on conflict(key) do update set value=excluded.value, updated_at=now();
      update ai_msgs set tries=tries+1, req_id=ai_post(convo) where id=m.id; continue; end if;
    if r.status_code=401 then
      update ai_msgs set status='err', content='Kľúč Claude nefunguje (uložený kľúč začína „'||left(coalesce(ai_secret('anthropic_key'),'?'),12)||'…“, dĺžka '||length(coalesce(ai_secret('anthropic_key'),''))||' znakov). Vytvor v Console nový kľúč a vlož ho na stránke ai.html.' where id=m.id; continue; end if;
    if r.status_code is distinct from 200 then
      update ai_msgs set status='err', content='Chyba AI ('||coalesce(r.status_code::text,'sieť')||'): '||left(coalesce(ai_json(r.content)#>>'{error,message}', r.error_msg, r.content),400) where id=m.id; continue; end if;
    j:=ai_json(r.content);
    if j is null then update ai_msgs set status='err', content='AI vrátila neplatnú odpoveď.' where id=m.id; continue; end if;
    if j->>'stop_reason'='pause_turn' and m.tries<4 then
      update ai_msgs set tries=tries+1, convo=convo||jsonb_build_array(jsonb_build_object('role','assistant','content',j->'content')),
        req_id=ai_post(convo||jsonb_build_array(jsonb_build_object('role','assistant','content',j->'content'))) where id=m.id;
      continue; end if;
    select string_agg(b->>'text','') into txt from jsonb_array_elements(j->'content') b where b->>'type'='text';
    txt:=coalesce(nullif(trim(txt),''),'(bez odpovede)');
    for ln in select (regexp_matches(txt, '^\s*\**ÚLOHA:\**\s*(.+)$', 'gm'))[1] loop
      insert into ai_tasks(text,msg_id) values(trim(ln),m.id) returning id into tid;
      perform ai_gh_issue(tid);
    end loop;
    update ai_msgs set status='ok', content=txt, convo=null where id=m.id;
  end loop;
  return n;
end $$;
grant execute on function public.ai_collect() to authenticated;

-- interné: načítaj hotové úlohy z GitHubu (zašifrované zhrnutia)
drop function if exists public.ai_gh_sync();
create or replace function public.ai_gh_sync(do_full boolean default true) returns void language plpgsql security definer set search_path=public, extensions, net as $$
declare tk text:=regexp_replace(coalesce(ai_secret('github_token'),''),'\s','','g'); pw text:=ai_secret('ai_pass'); st jsonb; r record; c jsonb; tid uuid; rep text; t record; since timestamptz; msg text;
begin
  -- 1) odoslanie úloh: čakáme na potvrdenie 201 od GitHubu
  for t in select * from ai_tasks where status='nova' loop
    if t.req_id is null then perform ai_gh_issue(t.id); continue; end if;
    select * into r from net._http_response where id=t.req_id;
    if r.id is null then
      if t.created_at<now()-interval '15 minutes' and t.tries<5 then perform ai_gh_issue(t.id); end if;
      continue; end if;
    if r.status_code=201 then update ai_tasks set status='odoslana', report=null where id=t.id; continue; end if;
    msg:=coalesce(ai_json(r.content)->>'message', r.error_msg, left(r.content,150), 'bez odpovede');
    if r.status_code in (401,403,404) or t.tries>=5 then
      update ai_tasks set status='chyba', report=case
        when r.status_code=401 then 'GitHub odmietol token (401 '||msg||'). Token je neplatný alebo zle skopírovaný – vytvor nový token (Issues: Read and write pre ernte-trade/ernte-), vlož ho na ai.html, spusti SQL a ťukni Skúsiť znova.'
        when r.status_code=403 then 'GitHub: token nemá právo vytvárať úlohy (403 '||msg||'). Pri tokene nastav Issues: Read and write a ťukni Skúsiť znova.'
        when r.status_code=404 then 'GitHub: repozitár ernte-trade/ernte- nenájdený pre tento token (404). Pri tokene vyber repozitár ernte-trade/ernte- a ťukni Skúsiť znova.'
        else 'GitHub chyba ('||coalesce(r.status_code::text,'sieť')||'): '||msg end where id=t.id;
    else perform ai_gh_issue(t.id); end if;
  end loop;
  if not do_full or tk='' or pw is null then return; end if;
  -- 2) prečítaj odpoveď na poslednú kontrolu komentárov (zhrnutia hotových úprav)
  select value into st from ai_state where key='gh';
  if st is not null and st ? 'req' then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is not null and r.status_code=200 then
      for c in select * from jsonb_array_elements(case when jsonb_typeof(ai_json(r.content))='array' then ai_json(r.content) else '[]'::jsonb end) loop
        if c->>'body' like 'ernte-ai-report %' then
          begin
            tid:=substring(c->>'body' from 'ernte-ai-report ([0-9a-f-]{36})')::uuid;
            rep:=convert_from(pgp_sym_decrypt_bytea(dearmor(substring(c->>'body' from '(-----BEGIN PGP MESSAGE-----.*-----END PGP MESSAGE-----)')),pw),'UTF8');
            update ai_tasks set status='hotova', report=rep, done_at=now() where id=tid and status<>'hotova';
            if found then insert into ai_msgs(kind,role,content) values('fix','assistant',rep); end if;
          exception when others then null; end;
        end if;
      end loop;
    end if;
  end if;
  select min(created_at) into since from ai_tasks where status='odoslana';
  if since is null then delete from ai_state where key='gh'; return; end if;
  insert into ai_state(key,value) values('gh',jsonb_build_object('req',net.http_get(
    url:='https://api.github.com/repos/ernte-trade/ernte-/issues/comments?per_page=100&since='||to_char(since at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    headers:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28'))))
  on conflict(key) do update set value=excluded.value, updated_at=now();
end $$;
revoke all on function public.ai_gh_sync(boolean) from public, anon, authenticated;

create or replace function public.ai_tick() returns void language plpgsql security definer set search_path=public as $$
begin
  perform ai_collect();
  perform ai_gh_sync(extract(minute from now())::int % 5 = 0);
  begin perform ai_auto_sync(extract(minute from now())::int % 3 = 0); exception when others then null; end;
end $$;

-- kontroly flotily (dvor, miesta, odchod po státí, nafta) so zápisom chýb – predtým sa chyby ticho zahadzovali
create table if not exists check_err(fn text primary key, msg text, at timestamptz default now(), ok_at timestamptz, n int default 0);
alter table check_err enable row level security;
drop policy if exists check_err_own on check_err; create policy check_err_own on check_err for select using (is_owner());
drop function if exists public.check_run(text);
create or replace function public.check_run(f text) returns int language plpgsql security definer set search_path=public as $$
declare k int:=0;
begin
  if to_regprocedure('public.'||f||'()') is null then return 0; end if;
  begin
    if f='osm_sync' then execute 'select 0 from (select public.osm_sync()) x' into k; else execute 'select public.'||f||'()' into k; end if;
    insert into check_err as c(fn,msg,ok_at,n) values(f,null,now(),coalesce(k,0)) on conflict on constraint check_err_pkey do update set ok_at=now(), n=c.n+coalesce(k,0), msg=null;
  exception when others then
    insert into check_err as c(fn,msg,at) values(f,left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now();
  end;
  return coalesce(k,0);
end $$;
revoke all on function public.check_run(text) from public, anon, authenticated;
create or replace function public.yard_check() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0;
begin
  perform check_run('osm_sync');
  k:=k+check_run('place_check');
  k:=k+check_run('stop_check');
  k:=k+check_run('fuel_check');
  return k;
end $$;
revoke all on function public.yard_check() from public, anon, authenticated;

-- AUTOMATICKÉ ZMENY DATABÁZY: ERNTE AI (programátor) dáva zašifrované SQL do farmar/supabase/auto/*.sql.asc,
-- databáza ich sama stiahne, overí (dešifruje AI kľúčom) a spustí. Majiteľ nemusí nič kopírovať.
create table if not exists ai_mig(name text primary key, status text not null default 'stahuje', msg text, req_id bigint, at timestamptz default now(), done_at timestamptz);
alter table ai_mig enable row level security;
drop policy if exists ai_mig_own on ai_mig; create policy ai_mig_own on ai_mig for select using (is_owner());
create or replace function public.ai_auto_sync(list boolean default false) returns void language plpgsql security definer set search_path=public, extensions, net as $$
declare tk text:=regexp_replace(coalesce(ai_secret('github_token'),''),'\s','','g'); pw text:=ai_secret('ai_pass'); st jsonb; r record; it jsonb; m record; sq text; tid uuid; hdr jsonb;
begin
  if tk='' or pw is null then return; end if;
  hdr:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28');
  -- 1) zoznam súborov
  select value into st from ai_state where key='mig_list';
  if st is not null then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is not null then
      if r.status_code=200 and jsonb_typeof(ai_json(r.content))='array' then
        for it in select * from jsonb_array_elements(ai_json(r.content)) loop
          if it->>'name' like '%.sql.asc' and not exists(select 1 from ai_mig where name=it->>'name') then
            insert into ai_mig(name,req_id) values(it->>'name', net.http_get(url:=it->>'download_url', headers:=hdr));
          end if;
        end loop;
      end if;
      delete from ai_state where key='mig_list';
    elsif (st->>'at')::timestamptz<now()-interval '10 minutes' then delete from ai_state where key='mig_list'; end if;
  end if;
  if list and not exists(select 1 from ai_state where key='mig_list') then
    insert into ai_state(key,value) values('mig_list',jsonb_build_object('at',now(),'req',net.http_get(
      url:='https://api.github.com/repos/ernte-trade/ernte-/contents/farmar/supabase/auto?ref=main', headers:=hdr)));
  end if;
  -- 2) spustenie stiahnutých (po poradí názvov)
  for m in select * from ai_mig where status='stahuje' order by name loop
    select * into r from net._http_response where id=m.req_id;
    if r.id is null then
      if m.at<now()-interval '15 minutes' then delete from ai_mig where name=m.name; end if; -- skúsi sa znova
      exit; end if;
    if r.status_code is distinct from 200 then delete from ai_mig where name=m.name; exit; end if;
    begin
      sq:=convert_from(pgp_sym_decrypt_bytea(dearmor(r.content),pw),'UTF8');
    exception when others then
      update ai_mig set status='odmietnuta', msg='Neplatný podpis/šifra – nespustené', done_at=now() where name=m.name; continue;
    end;
    begin
      execute sq;
      update ai_mig set status='ok', msg=null, done_at=now() where name=m.name;
      insert into ai_msgs(kind,role,content) values('fix','assistant','🗄 **Databáza aktualizovaná automaticky:** '||regexp_replace(m.name,'\.sql\.asc$',''));
    exception when others then
      update ai_mig set status='chyba', msg=left(SQLERRM,400), done_at=now() where name=m.name;
      insert into ai_msgs(kind,role,content) values('fix','assistant','⚠️ **Zmena databázy zlyhala:** '||regexp_replace(m.name,'\.sql\.asc$','')||' – '||left(SQLERRM,200)||'. Opravím to automaticky.');
      insert into ai_tasks(text) values('Oprav automatickú zmenu databázy '||m.name||' – pri spustení zlyhala s chybou: '||left(SQLERRM,300)||'. Vytvor nový opravený súbor v farmar/supabase/auto (nový názov).') returning id into tid;
      perform ai_gh_issue(tid);
    end;
  end loop;
end $$;
revoke all on function public.ai_auto_sync(boolean) from public, anon, authenticated;

-- automaticky: každú minútu spracovanie, prehľad ráno 6:00 a poobede 14:00 (Bratislava)
select cron.unschedule(jobname) from cron.job where jobname in ('ai-tick','ai-rano','ai-poobede');
select cron.schedule('ai-tick','* * * * *','select public.ai_tick()');
select cron.schedule('ai-rano','0 5 * * *','select public.ai_report()');
select cron.schedule('ai-poobede','0 13 * * 1-5','select public.ai_report()');
