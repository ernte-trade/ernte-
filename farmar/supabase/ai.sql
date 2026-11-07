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

-- ARCHÍV DOKUMENTOV (upozornenia vodičom, zmluvy, listy) – história s PDF
create table if not exists ai_docs(id bigserial primary key, kind text not null default 'dokument', driver text, title text not null, content text not null,
  msg_id bigint, status text not null default 'novy' check (status in ('novy','odoslany','vyriesene')), created_at timestamptz not null default now(), sent_at timestamptz);
create index if not exists ai_docs_at on ai_docs(created_at desc);
alter table ai_docs enable row level security;
drop policy if exists ai_docs_own on ai_docs; create policy ai_docs_own on ai_docs for select using (is_owner());
create or replace function public.ai_doc_save(p_title text, p_content text, p_kind text default 'dokument', p_driver text default null, p_msg bigint default null) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  insert into ai_docs(kind,driver,title,content,msg_id) values(coalesce(nullif(p_kind,''),'dokument'),nullif(trim(coalesce(p_driver,'')),''),left(coalesce(nullif(trim(p_title),''),'Dokument'),200),p_content,p_msg) returning id into i;
  return i;
end $$;
grant execute on function public.ai_doc_save(text,text,text,text,bigint) to authenticated;
create or replace function public.ai_doc_mark(p_id bigint, p_status text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if p_status='zmazat' then delete from ai_docs where id=p_id; return; end if;
  update ai_docs set status=p_status, sent_at=case when p_status='odoslany' then coalesce(sent_at,now()) else sent_at end where id=p_id;
end $$;
grant execute on function public.ai_doc_mark(bigint,text) to authenticated;
-- z odpovede AI vytiahne bloky [[DOKUMENT|typ|vodič|názov]] … [[KONIEC]] a uloží ich do archívu
create or replace function public.ai_doc_extract(txt text, mid bigint) returns text language plpgsql security definer set search_path=public as $$
declare r text[]; hd text[]; out text:=txt;
begin
  for r in select regexp_matches(txt, '\[\[DOKUMENT\|([^\]]*?)\]\]\s*(.*?)\s*\[\[KONIEC\]\]', 'g') loop
    hd:=string_to_array(r[1],'|');
    perform ai_doc_save(coalesce(hd[3],'Dokument'), r[2], coalesce(hd[1],'dokument'), hd[2], mid);
  end loop;
  out:=regexp_replace(out, '\[\[DOKUMENT\|([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]', E'> 📁 **Uložené do Dokumentov:** \\3\n', 'g');
  out:=regexp_replace(out, '\[\[KONIEC\]\]', '', 'g');
  return out;
end $$;
revoke all on function public.ai_doc_extract(text,bigint) from public, anon, authenticated;

-- bezpečný dopyt: chyba v jednej časti nezhodí celý prehľad
create or replace function public.ai_part(q text) returns jsonb language plpgsql volatile security definer set search_path=public, extensions as $$
declare r jsonb; begin execute 'select to_jsonb(('||q||'))' into r; return r; exception when others then return jsonb_build_object('chyba',SQLERRM); end $$;
revoke all on function public.ai_part(text) from public, anon, authenticated;

-- mesačné KPI flotily priamo z databázy (nezávisle od aplikácie)
create or replace function public.ai_fleet_kpi() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare m0 timestamptz:=date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava'; c jsonb; km numeric; l numeric; lok numeric; kok numeric; rl numeric; re numeric; n int; d numeric; pb numeric; t numeric; sh numeric; fm jsonb;
begin
  select coalesce(value,'{}') into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  d:=coalesce((c->>'diesel')::numeric,1.952); pb:=d/1.23; t:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100);
  select count(*), coalesce(sum(distance),0), coalesce(sum(fuel_consumed) filter (where distance>0),0), coalesce(sum(refuel_l),0), coalesce(sum(refuel_eur),0) into n,km,l,rl,re from rides where start_at>=m0;
  select coalesce(sum(vl),0), coalesce(sum(vk),0) into lok,kok from (select sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0) vl, sum(distance) filter (where distance>0 and fuel_consumed>0) vk, sum(distance) vtot from rides where start_at>=m0 group by vehicle_id) v where vtot>=100;
  fm:=fleet_month();
  -- nafta v zisku = spotrebované litre × cena bez DPH (nastavená cena s DPH / 1,23); jedna hodnota pre Dashboard, zisk aj AI
  return jsonb_build_object('obdobie','tento mesiac do dnes','jazd',n,'km',round(km),'nafta_l',round(l),'l_100km_flotila_bez_aut_pod_100km',case when kok>20 then round(lok/kok*100,1) end,
    'natankovane_karta_l',round(rl),'natankovane_karta_eur',round(re),'vydaj_z_nadrze_dvor',yard_fuel_balance(),
    'rozdiel_spotreba_minus_natankovane_karta_l',round(l-rl),'rozdiel_pct',case when l>0 then round((l-rl)/l*100,1) end,'rozdiel_eur_bez_dph',round((l-rl)*pb),
    'cena_nafty_s_dph',d,'cena_nafty_bez_dph',round(pb,3),'nafta_eur_bez_dph',round(l*pb),'nafta_eur_s_dph',round(l*d),'myto_eur_km',t,'myto_podiel_km_pct',sh,'myto_eur',round(km*sh/100*t),
    'nafta_bez_dph_plus_myto_eur',round(l*pb+km*sh/100*t),'eur_na_km_bez_dph',case when km>0 then round((l*pb+km*sh/100*t)/km,3) end,
    'obrat_eur',fm->'obrat_eur','obrat_je_odhad',fm->'obrat_je_odhad','obrat_poznamka',fm->'obrat_poznamka',
    'pevne_naklady_cely_mesiac',fm->'pevne_naklady_cely_mesiac','pevne_naklady_do_dnes_pomerne',fm->'pevne_naklady_do_dnes_pomerne','mzdy_eur',fm->'mzdy_eur',
    'zisk_do_dnes_pomerne',fm->'zisk_do_dnes_pomerne','zisk_cely_mesiac_plne_pevne',fm->'zisk_cely_mesiac_plne_pevne');
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_fleet_kpi() from public, anon, authenticated;

-- rozpis tohto mesiaca po vodičoch a ich autách (fleet_drv_eval v events.sql): km, l/100 (pod 100 km = „málo dát“), natankované karta + dvor,
-- rozdiel l / % / € bez DPH, prekročenia 90 km/h, max rýchlosť, poklesy paliva pri státí
create or replace function public.ai_fleet_drivers() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  return fleet_drv_eval(date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava', now()+interval '1 day');
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
   'miesta_s_notifikaciou', ai_part('select count(*) from places where notify'),
   'miesta_s_problemom', ai_part($q$select count(*) from places p where p.lat is null or p.lon is null or p.lat=0 or p.lon=0 or p.lat not between 40 and 56 or p.lon not between 10 and 30
      or coalesce(trim(p.name),'') in ('','Slovnaft') or p.kind not in ('yard','buyer','fuel','other') or p.r<=0 or p.r>5000
      or exists(select 1 from places q where q.id<>p.id and q.kind=p.kind and (lower(trim(q.name))=lower(trim(p.name)) and q.kind<>'fuel' or abs(q.lat-p.lat)<0.0005 and abs(q.lon-p.lon)<0.0007))$q$),
   'miesta_problemy_podla_dovodu', ai_part($q$select jsonb_build_object(
      'bez súradníc',count(*) filter (where lat is null or lon is null or lat=0 or lon=0 or lat not between 40 and 56 or lon not between 10 and 30),
      'duplicitné',count(*) filter (where exists(select 1 from places q where q.id<>p.id and q.kind=p.kind and (lower(trim(q.name))=lower(trim(p.name)) and q.kind<>'fuel' or abs(q.lat-p.lat)<0.0005 and abs(q.lon-p.lon)<0.0007))),
      'chýba názov',count(*) filter (where coalesce(trim(name),'') in ('','Slovnaft')),
      'chýba/zlý typ',count(*) filter (where kind is null or kind not in ('yard','buyer','fuel','other')),
      'zlý okruh',count(*) filter (where r<=0 or r>5000)) from places p$q$),
   'ntfy_tema_nastavena', ai_part($q$select coalesce((select value->>'topic' from fleet_cfg where key='notify'),'') <> ''$q$),
   'funkcie', ai_part($q$select jsonb_build_object('yard_check',to_regprocedure('public.yard_check()') is not null,'place_check',to_regprocedure('public.place_check()') is not null,'stop_check',to_regprocedure('public.stop_check()') is not null,'fuel_check',to_regprocedure('public.fuel_check()') is not null,'osm_sync',to_regprocedure('public.osm_sync()') is not null)$q$),
   'cron_ulohy', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('uloha',jobname,'zapnuta',active,'rozvrh',schedule)),'[]') from cron.job$q$),
   'cron_posledne_behy', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select j.jobname uloha, d.status, left(d.return_message,120) sprava, to_char(d.start_time at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from cron.job_run_details d join cron.job j on j.jobid=d.jobid where d.start_time>now()-interval '15 minutes' order by d.start_time desc limit 12) x$q$),
   'cron_chyby_24h', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select j.jobname uloha, count(*) chyb, max(left(d.return_message,160)) posledna from cron.job_run_details d join cron.job j on j.jobid=d.jobid where d.status<>'succeeded' and d.start_time>now()-interval '24 hours' group by j.jobname) x$q$),
   'commander_posledne', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, to_char(max(at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') posledne, max(code) filter (where at>now()-interval '1 hour') kod from cmd_log group by kind) x$q$),
   'poloha_zapis', ai_part($q$select jsonb_build_object('posledne_nacitanie',(select to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' · kód '||coalesce(code::text,'čaká')||' · zapísaných áut '||coalesce(n::text,'?')||coalesce(' · najnovšia GPS v odpovedi '||to_char(gps_max at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'') from cmd_log where kind='pos' and done order by at desc limit 1),
      'posledny_zapis_do_aut',(select to_char(max(updated_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from cmd_vehicles),
      'najnovsia_gps',(select to_char(max(gps_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from cmd_vehicles),
      'chyba_zapisu',(select msg||' ('||to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||')' from check_err where fn='cmd_sync_pos' and msg is not null),
      'zaver',case when (select max(updated_at) from cmd_vehicles)>now()-interval '10 minutes' and (select max(gps_at) from cmd_vehicles)<now()-interval '30 minutes' then 'sync zapisuje, ale jednotky posielajú starú polohu (autá stoja / vypnuté)'
                   when (select max(updated_at) from cmd_vehicles)<now()-interval '10 minutes' then 'sync nezapisuje polohy – skontroluj Commander'
                   else 'polohy sa zapisujú' end)$q$),
   'commander_backfill', ai_part($q$select coalesce(jsonb_agg(x order by x->>'den' desc),'[]') from (select jsonb_build_object('den',url,'kedy',to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'pokusov',coalesce(n,1),
      'stav',case when ref is null then 'starý záznam bez kódu' when code=200 then 'OK (200)' when code is null and at>now()-interval '20 minutes' then 'čaká na odpoveď'
                  when coalesce(n,1)>=3 then 'ZLYHALO 3× ('||coalesce(code::text,'bez kódu')||')' else 'chyba '||coalesce(code::text,'bez kódu')||' – zopakuje sa' end) x
      from cmd_log where kind='backfill' order by url desc limit 6) q$q$),
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
   'flotila_zisk_mesiac', fleet_month(),
   'nalezy_flotila', fleet_findings(),
   'nadrz_dvor', ai_part('select yard_fuel_balance()'),
   'odstavene_auta', ai_part($q$select coalesce((select jsonb_agg(coalesce(v.plate,v.id)) from cmd_vehicles v where coalesce((select (value->>v.id)::boolean from fleet_cfg where key='parked'),false)),'[]')$q$),
   'auta_teraz', ai_part($q$select jsonb_build_object('spolu',count(*),'ide',count(*) filter (where speed>3 and gps_at>now()-interval '20 min')) from cmd_vehicles$q$),
   'nafta_bilancia_7_dni', ai_part('select public.fuel_balance(7)'),
   'nafta_bilancia_30_dni', ai_part('select public.fuel_balance(30)'),
   'nafta_poklesy_v_stati', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters l, lvl_from, lvl_to, to_char(t_from at time zone 'Europe/Bratislava','DD.MM HH24:MI') od, to_char(t_to at time zone 'Europe/Bratislava','DD.MM HH24:MI') do_, place miesto, note from fleet_events where kind='fuel_drop' and at>now()-interval '30 days' order by at desc limit 40) x$q$),
   'udalosti_7_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '7 days' group by kind) x$q$),
   'posledne_alarmy_nafta', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, plate, driver, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where at>now()-interval '7 days' and kind in ('fuel_drop','refuel_gap','fuel_transfer','no_signal') order by at desc limit 10) x$q$),
   'nafta_precerpanie_medzi_autami', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auta, driver vodici, liters l, place miesto, note popis, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where kind='fuel_transfer' and at>now()-interval '40 days' order by at desc limit 20) x$q$),
   'aktivne_auta_bez_signalu', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select e.plate auto, e.driver posledny_vodic, e.place posledna_poloha, floor(extract(epoch from now()-v.gps_at)/3600)::int hodin from fleet_events e join cmd_vehicles v on v.id=e.vehicle_id where e.kind='no_signal' and v.gps_at=e.t_from and v.gps_at<now()-interval '12 hours') x$q$),
   'alarmy_z_aplikacie', ai_part($q$select value->'alarmy' from ai_state where key='kpi'$q$),
   'nastavenia_nakladov', ai_part($q$select value from fleet_cfg where key='costs'$q$),
   'kpi_z_aplikacie', ai_part($q$select coalesce((select value||jsonb_build_object('aktualizovane',to_char(updated_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')) from ai_state where key='kpi'),'"majiteľ ešte neotvoril Flotilu"'::jsonb)$q$),
   'diagnostika', ai_diag(),
   'dokumenty_archiv', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind typ, driver vodic, title nazov, status stav, to_char(created_at at time zone 'Europe/Bratislava','DD.MM.YYYY') datum from ai_docs order by created_at desc limit 40) x$q$),
   'posledne_upravy_ai', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x$q$));
exception when others then return jsonb_build_object('chyba_prehladu',SQLERRM);
end $$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;

create or replace function public.ai_system() returns text language sql stable as $$ select
'Si ERNTE AI – osobný poradca a kontrolór majiteľa (Martin Vaľko) firiem ERNTE spol. s r.o. (výkup obilia a olejnín od farmárov, predaj odberateľom/na burzu) a VALKO s.r.o. (kamiónová doprava, Scania ťahače, Michalovce, dvor Medovská 46). Píš po slovensky, stručne, priamo, bez omáčok, ako skúsený obchodný riaditeľ. Používaj čísla.
PRACOVNÝ ŠTANDARD (najvyššia kvalita): pracuj ako najlepší analytik, controller a právnik v jednom. Každú odpoveď si premysli do hĺbky, prepočítaj čísla dvakrát (súčty, percentá, €), porovnaj viac zdrojov a údajov (Commander, nádrž, tankovania, jazdy, ceny, burza), hľadaj súvislosti a anomálie aj tam, kde sa majiteľ nepýtal, a povedz ich. Aktuálne fakty (ceny, zákony, pokuty, kurzy) VŽDY over web_search z viacerých zdrojov a uveď zdroj a dátum. Nikdy nehádaj – ak niečo nevieš alebo dáta chýbajú, povedz presne čo a navrhni ako to zistiť. Buď proaktívny: na konci uveď konkrétne ďalšie kroky s termínom. Odpovedaj úplne, nie povrchne; pri dokumentoch dodaj hotový text na odoslanie.
Úlohy: 1) kontroluj obchody, náklady, zisky a straty, flotilu (spotreba, krádeže nafty, prestoje) a upozorni čo je zlé a čo dobré; 2) sleduj trhy (MATIF repka/pšenica/kukurica, CBOT sója, slovenské a maďarské výkupné ceny, nafta) – na aktuálne ceny VŽDY použi web_search a uveď zdroj a dátum; 3) raď konkrétne čo má robiť (kúpiť/predať/držať, za akú cenu, komu volať, čo skontrolovať).
Nikdy si nevymýšľaj čísla – ak údaj chýba, napíš „nezadané“ alebo „málo dát“, nikdy nie 0. Zisk = obrat − (nafta + mýto + pevné náklady + mzdy); ak chýbajú mzdy (kpi_z_aplikacie.mzdy_eur je null), napíš že zisk sa nedá presne spočítať. Autá s menej ako 100 km za mesiac majú „málo dát“ – nerátaj ich do priemernej spotreby ani alarmov. Spotrebu konkrétneho vodiča ber z flotila_po_vodicoch (vodič → autá, km, litre, l/100 km, natankované litre); vodič s menej ako 100 km za mesiac má „málo dát“ – jeho spotrebu nehodnoť. Pri technických problémoch (chýbajúce udalosti, alarmy, jazdy) použi sekciu diagnostika a povedz presne, čo je vypnuté alebo nenastavené.
PLNÉ OPRÁVNENIE: majiteľ ti dal plný prístup ku všetkému v tejto aplikácii (kód aj databáza). Úpravy aj zmeny databázy sa robia a nasadzujú automaticky – nikdy nežiadaj majiteľa, aby spúšťal SQL alebo niečo kopíroval. Ak vidíš chybu alebo chýbajúce dáta (aj v diagnostike), sám navrhni opravu ako ÚLOHU.
ÚPRAVY APLIKÁCIE: ak majiteľ chce niečo v aplikácii opraviť, pridať alebo zmeniť, NEROB to v texte – na koniec odpovede pridaj samostatný riadok presne v tvare
ÚLOHA: <presný a úplný popis zmeny po slovensky, aby ju programátor vedel spraviť bez ďalších otázok>
(jeden riadok na jednu zmenu). Povedz mu, že úprava bude hotová spravidla do hodiny a zhrnutie uvidí v Dashboarde. Aplikácia: ERNTE Trade & Logistic (záložky Požiadavky, Cenník, Doprava, Flotila, Obchody, Farmári, Počasie, Tím; Flotila má Dashboard, Prevádzka a náklady, Alarmy, Mapa, Pohyby, Vozidlá, Vodiči a mzdy, Miesta, Nastavenia).
Formát (Markdown): krátke odseky, nadpisy „## “, odrážky „- “, číslované zoznamy, tučné **takto**, tabuľky | stĺpec | stĺpec |.
DOKUMENTY A VÝSTUPY: vieš pripraviť čokoľvek – zmluvy, kúpne a prepravné zmluvy, cenové ponuky, objednávky, listy, e-maily, upomienky, reporty, tabuľky, plány, preklady. Píš ich ako hotový dokument s nadpisom (prvý riadok „## Názov“), dátumom a údajmi firmy z prehľadu. Aplikácia pod každou tvojou odpoveďou automaticky ukáže tlačidlá Kopírovať, Uložiť PDF, Tlačiť, Word, Excel (keď sú v odpovedi tabuľky), E-mail a Zdieľať – preto nikdy nehovor, že PDF alebo súbor nevieš urobiť. Pri dokumente napíš do odpovede iba samotný dokument; pokyny typu „ťukni Uložiť PDF“ daj najviac ako jednu krátku vetu úplne na koniec za oddeľovač ---, nikdy dovnútra dokumentu.
PRÁVO A PREDPISY SR/EÚ: všetko rob v súlade s platným právom SR a EÚ. Pri dokumentoch a radách vždy dodrž najmä: Zákonník práce 311/2001 Z. z. (písomné upozornenie na porušenie pracovnej disciplíny, náhrada škody zamestnancom a jej limity, monitorovanie zamestnancov – GPS sledovanie len ak boli vodiči vopred informovaní, zrážky zo mzdy len s písomnou dohodou alebo podľa zákona), GDPR a zákon 18/2018 Z. z. o ochrane osobných údajov, zákon 56/2012 Z. z. o cestnej doprave, nariadenie (ES) 561/2006 (časy jazdy a odpočinku), nariadenie (EÚ) 165/2014 (tachografy), balík mobility (vysielanie vodičov, minimálne mzdy v iných štátoch EÚ), zákon 488/2013 Z. z. o diaľničnej známke/mýte a NV o výške mýta, zákon 8/2009 Z. z. o cestnej premávke, daňové predpisy (DPH, cestovné náhrady 283/2002 Z. z. – stravné/diéty). V upozorneniach vodičom nikoho neobviňuj z trestného činu bez dôkazov, uveď fakty, právny základ (paragraf) a lehotu na vyjadrenie. Pri právnych otázkach na konci krátko dodaj, že nejde o právne poradenstvo a pri sporných veciach treba advokáta. Paragrafy a výšky pokút over web_search na slov-lex.sk alebo oficiálnych stránkach a uveď zdroj s dátumom – nevymýšľaj.
LEGISLATÍVNY STRÁŽCA: sleduj nové zákony, vyhlášky, nariadenia a zmeny pokút, ktoré sa týkajú cestnej dopravy, kamiónov, vodičov, mýta, tachografov, MKD (medzinárodnej kamiónovej dopravy – licencia Spoločenstva, CMR, kabotáž, vysielanie vodičov, návrat vozidla a vodiča, smart tachograf, mýto a zákazy jazdy v DE/AT/HU/CZ/PL/IT a ďalších krajinách) a balíka mobility, minimálnych miezd v zahraničí (DE, AT, HU, CZ, PL…), poľnohospodárstva a výkupu obilia, DPH a cestovných náhrad. Keď nájdeš novú alebo pripravovanú zmenu, upozorni majiteľa: čo sa mení, od kedy, koho sa to týka, aké sú pokuty a čo má VALKO/ERNTE urobiť – so zdrojom a dátumom.
KONTROLA NAFTY (najdrahšia položka – sleduj NEUSTÁLE každé auto): používaj nafta_bilancia (začiatok nádrže + natankované − spotreba jazdou − koniec = nevysvetlený úbytok), nafta_poklesy_v_stati (presné časy od–do, hladiny, miesto, vodič) a rozdiel natankovanej a spotrebovanej nafty. Pri každom podozrivom aute uveď presný čas a miesto, kde sa nafta stratila (napr. auto stálo pri bydlisku vodiča), a navrhni ďalší krok. Pri nevysvetlenom úbytku nad 30 l alebo poklese v státí priprav vodičovi VÝZVU NA VYSVETLENIE (typ vyzva) s presnými časmi, hladinami a miestom, s lehotou 3 pracovné dni a žiadosťou o doklady (bločky, karta, výdajka z dvora). Pamätaj na možné nepresnosti: snímač hladiny pri vypnutom zapaľovaní, teplota a sklon auta, výpadok signálu, chýbajúce tankovania z vlastnej nádrže – uveď to, ale nezľahčuj opakované prípady. Hľadaj aj ďalšie spôsoby kontroly (web_search: odporúčania dopravcov, ČESMAD, výrobcovia sond) a navrhuj opatrenia: porovnanie výpisov palivových kariet s Commanderom, limity a PIN na kartách, uzamykateľné viečka a sitká proti odčerpaniu, kalibrované palivové sondy, prietokomery, výdaj z nádrže na dvore len s evidenciou, kamera na dvore, kontrola voľnobehu a PTO, porovnanie spotreby rovnakých áut a trás, odmeny za nízku spotrebu.
FIRMY V DOKUMENTOCH: autá, doprava, vodiči a všetci zamestnanci patria VALKO s.r.o. (Zbudza 141, 072 23, IČO 53 365 241, IČ DPH SK2121345424) – v dokumentoch k doprave, vozidlám, nafte a vodičom NIKDY nespomínaj ERNTE (ani v hlavičke, texte či podpise; píš „VALKO s.r.o.“, „konateľ VALKO s.r.o.“). ERNTE spol. s r.o. uvádzaj iba pri výkupe obilia, farmároch, zmluvách s nimi a cenníku. Aplikácia hlavičku a pečiatku podľa toho volí sama.
ARCHÍV DOKUMENTOV: každý hotový dokument (upozornenie vodičovi, výzva na vysvetlenie, zmluva, ponuka, list, upomienka) zabaľ presne takto, aby sa sám uložil do archívu Dokumenty s PDF:
[[DOKUMENT|typ|meno vodiča alebo partnera|Názov dokumentu]]
## Názov dokumentu
…celý text…
[[KONIEC]]
typ je jedno z: upozornenie, vyzva, zmluva, ponuka, list, iny. Ak nejde o vodiča, nechaj meno prázdne (napr. [[DOKUMENT|zmluva||Kúpna zmluva repka]]). Pred blokom napíš max 1 vetu. Upozornenia vodičom píš vecne a slušne: fakty z dát (km, litre, %, dátumy), žiadosť o vysvetlenie a doklady s termínom, ďalší postup – nikoho priamo neobviňuj z krádeže, kým to nepotvrdia doklady (dáta o tankovaní môžu byť neúplné). Na konci: podpis „Martin Vaľko, konateľ VALKO s.r.o.“ a riadok Prevzal dňa ____ Podpis vodiča ____. Pečiatku s podpisom VALKO aplikácia do PDF/Word vloží sama – nepíš „pečiatka“ ani miesto na ňu. Pozri dokumenty_archiv, nevytváraj duplicitu k tomu istému problému v tom istom mesiaci.
KOPÍROVANIE: keď majiteľ chce text na skopírovanie (správa, SMS, e-mail, príspevok, údaje), daj ten text do bloku ohraničeného riadkami ``` – aplikácia k nemu pridá tlačidlo Kopírovať (dva štvorčeky). Mimo bloku napíš max 1 vetu.
Údaje, ktoré nepoznáš (IČO odberateľa, presné adresy), nevymýšľaj – nechaj [doplniť].
PRÍLOHY: majiteľ ti môže poslať fotky (vážne lístky, faktúry, doklady, poškodenia), PDF, Word, Excel. Prečítaj ich dôkladne, vytiahni čísla a údaje a povedz, čo s nimi spraviť.
KAMERY DVOR: na dvore VALKO sú Tapo kamery (Flotila → Kamery dvor). Pri príjazde/odjazde áut, udalostiach nafty na dvore a výdaji z nádrže sa automaticky ukladajú zábery (tabuľky cams, cam_snaps, cam_req; zábery 30 dní, k nafte 1 rok). Majiteľ ti ich posiela ako obrázky – popíš presne čo vidíš (auto, ŠPZ ak je čitateľná, osoby, kanistre, hadice, manipulácia pri nádrži), porovnaj s časom udalosti nafty a uveď mieru istoty. Záber sám o sebe nie je dôkaz viny – nikoho neobviňuj, navrhni čo overiť. Pri kamerách dodržuj GDPR (označenie, poučenie zamestnancov, uchovanie max. 30 dní okrem incidentov).' $$;

create or replace function public.ai_json(t text) returns jsonb language plpgsql immutable as $$ begin return t::jsonb; exception when others then return null; end $$;

-- interné: pošli požiadavku na Claude API
create or replace function public.ai_post(convo jsonb, sys_extra text default '') returns bigint language plpgsql security definer set search_path=public, net as $$
declare k text:=regexp_replace(coalesce(ai_secret('anthropic_key'),''),'\s','','g'); md text:=(select value->>'mode' from ai_state where key='auth');
begin
  if k='' then k:=null; end if;
  if k is null then raise exception 'Chýba API kľúč – spusti nastavenie na stránke ai.html.'; end if;
  return net.http_post(url:='https://api.anthropic.com/v1/messages',
    headers:=case when coalesce(md, case when k like 'sk-ant-api%' then 'x' else 'b' end)='x' then jsonb_build_object('x-api-key',k) else jsonb_build_object('Authorization','Bearer '||k) end||jsonb_build_object('anthropic-version','2023-06-01','content-type','application/json'),
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',16000,
      'system', ai_system()||E'\n\nAKTUÁLNE ÚDAJE FIRMY (JSON):\n'||ai_snapshot()::text||sys_extra,
      'messages',convo,
      'tools',jsonb_build_array(jsonb_build_object('type','web_search_20250305','name','web_search','max_uses',5))),
    timeout_milliseconds:=300000);
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
    'Sprav prehľad pre majiteľa na Dashboard: 1) TRHY dnes – MATIF repka, pšenica, kukurica, CBOT sója (vyhľadaj aktuálne ceny a trend) a porovnaj s naším cenníkom; 2) OBCHODY – čo je otvorené, riziká, marža; 3) FLOTILA – km, spotreba, náklady, zisk/strata, alarmy, podozrivé veci; 4) ČO ROBIŤ DNES – max 5 konkrétnych krokov; 5) LEGISLATÍVA – ak za posledných 7 dní vyšla alebo sa chystá zmena predpisov či pokút v doprave, mýte, MKD (medzinárodnej kamiónovej doprave)/balíku mobility, pracovnom práve vodičov alebo výkupe obilia, krátko ju uveď so zdrojom (inak bod vynechaj); 6) UPOZORNENIA VODIČOM – ak niektorý vodič má nový závažný problém (rozdiel nafty nad 15 %, pokles paliva pri státí, opakovaná rýchlosť nad 90 km/h, spotreba výrazne nad priemerom) a v dokumenty_archiv ešte nemá upozornenie k tomu istému problému za tento mesiac, priprav mu písomné upozornenie ako DOKUMENT. Začni jednou vetou s najdôležitejšou vecou. Max ~250 slov.')));
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
create or replace function public.ai_task_dismiss(t uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  update ai_tasks set status='hotova', done_at=now(), report=coalesce(nullif(report,''),'')||case when report is null or report='' then '' else E'\n' end||'Zrušené majiteľom.' where id=t and status in ('chyba','nova');
end $$;
grant execute on function public.ai_task_dismiss(uuid) to authenticated;
-- 4 úlohy z 25. 10. (málo dát, KPI, alarm nafty, cenník) spravil Claude priamo – označiť ako hotové
update ai_tasks set status='hotova', done_at=now(), report='Spravené priamo s Claude 25. 10. 2026: málo dát pod 100 km, karta KPI s upozornením na chýbajúce mzdy, alarm rozdielu nafty, upozornenie na platnosť cenníka a „nezadané“ ceny.'
  where status='chyba' and created_at::date='2026-10-25' and (text ilike '%rebríčka spotreby%' or text ilike '%mesačných KPI%' or text ilike '%Rozdiel natankovanej%' or text ilike '%záložke Cenník%' or text ilike '%Cenník%upozornenie%' or text ilike '%DIAGNOSTIK%' or text ilike '%kpi_z_aplikacie%');


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
    if (j->>'stop_reason'='pause_turn' or (j->>'stop_reason'='max_tokens' and not exists(select 1 from jsonb_array_elements(j->'content') b where b->>'type'='text' and length(b->>'text')>200))) and m.tries<6 then
      update ai_msgs set tries=tries+1, convo=convo||jsonb_build_array(jsonb_build_object('role','assistant','content',j->'content')),
        req_id=ai_post(convo||jsonb_build_array(jsonb_build_object('role','assistant','content',j->'content'))) where id=m.id;
      continue; end if;
    select string_agg(b->>'text','') into txt from jsonb_array_elements(j->'content') b where b->>'type'='text';
    if nullif(trim(txt),'') is null then
      update ai_msgs set status='err', content='AI nedokončila odpoveď ('||coalesce(j->>'stop_reason','?')||'). Skús to znova – ťukni Urobiť prehľad / pošli otázku ešte raz.' where id=m.id; continue; end if;
    if j->>'stop_reason'='max_tokens' then txt:=txt||E'\n\n_(odpoveď bola dlhá a skrátila sa – napíš „pokračuj“)_'; end if;
    begin txt:=ai_doc_extract(txt,m.id); exception when others then null; end;
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
  begin perform ai_collect(); exception when others then insert into check_err as c(fn,msg,at) values('ai_collect',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end;
  begin perform ai_gh_sync(extract(minute from now())::int % 5 = 0); exception when others then insert into check_err as c(fn,msg,at) values('ai_gh_sync',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end;
  begin perform ai_auto_sync(extract(minute from now())::int % 3 = 0); exception when others then insert into check_err as c(fn,msg,at) values('ai_auto_sync',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end;
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
  k:=k+check_run('ride_events');
  k:=k+check_run('fuel_gap_tick');
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
-- ranný a poobedný report = stručný súhrn flotily (fleet_daily_report v events.sql); celý AI prehľad je na tlačidlo v Dashboarde
select cron.schedule('ai-rano','0 5 * * *',$c$select public.fleet_daily_report('rano')$c$);
select cron.schedule('ai-poobede','0 13 * * 1-5',$c$select public.fleet_daily_report('poobede')$c$);
select cron.unschedule(jobname) from cron.job where jobname='ai-legislativa';
select cron.schedule('ai-legislativa','30 5 * * 1',$c$select public.ai_report('LEGISLATÍVNY PREHĽAD TÝŽDŇA pre VALKO s.r.o. (kamiónová doprava SR/EÚ) a ERNTE spol. s r.o. (výkup obilia). Vyhľadaj na webe (slov-lex.sk, mindop.sk / MDV SR, financnasprava.sk, emyto.sk, ip.gov.sk – inšpektorát práce, ČESMAD Slovakia, Európska komisia – mobility package, nemecký/rakúsky/maďarský minimálny plat pre vodičov) nové a pripravované zmeny za posledné 2 týždne: zákony, vyhlášky, nariadenia, výšky pokút (časy jazdy, tachografy, mýto, MKD – medzinárodná kamiónová doprava: licencia Spoločenstva, CMR, kabotáž, vysielanie vodičov a IMI deklarácie, návrat vozidla a vodiča, smart tachograf 2, zákazy jazdy cez víkendy/sviatky v DE/AT/HU/CZ/PL/IT), mýtne sadzby, cestovné náhrady/diéty, minimálna mzda, DPH, dotácie a pravidlá pre poľnohospodárov. Pre každú zmenu: čo, od kedy, koho sa týka, pokuta, čo máme urobiť, zdroj s dátumom. Ak nie je nič nové, napíš to jednou vetou. Na konci 1–3 odporúčania.')$c$);

-- ===== 26. 10. 2026: register porušení pre AI, výpis kariet, KPI s mzdami =====
-- AI poradca: register_poruseni (od 1. 7. 2026, súhrn po vodičoch a autách po mesiacoch), výpis tankovacích kariet,
-- KPI z aplikácie vždy s mzdami (rovnako ako flotila_zisk_mesiac).
-- REGISTER PORUŠENÍ pre AI poradcu: udalosti od 1. 7. 2026 + súhrn po vodičoch a autách po mesiacoch
create or replace function public.ai_register() returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare cb numeric; tz text:='Europe/Bratislava'; f text:='DD.MM.YYYY HH24:MI'; r jsonb; n int; ev jsonb; nev int;
begin
  cb:=round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3);
  create temp table if not exists _reg(id bigint, at timestamptz, kind text, typ text, auto text, vodic text, od timestamptz, do_ timestamptz, miesto text, lf numeric, lt numeric, l numeric, eur numeric, kmh int, pozn text, pri int) on commit drop;
  truncate _reg;
  insert into _reg
  select e.id, e.at, e.kind,
         case e.kind when 'fuel_drop' then 'pokles v státí' when 'refuel_gap' then 'tankovanie nesedí' when 'fuel_transfer' then 'prečerpanie'
           when 'card_swap' then 'karta jedného auta, nafta v inom' when 'speed' then 'rýchlosť nad '||coalesce(veh_speed_lim(e.vehicle_id),90)
           when 'limiter' then 'obmedzovač rýchlosti (N3 nad 100)' when 'no_signal' then 'výpadok signálu' when 'data_gap' then 'výpadok dát' end,
         coalesce(nullif(trim(e.plate),''),e.vehicle_id), coalesce(nullif(trim(e.driver),''),'neznámy vodič'),
         coalesce(e.t_from,e.at), case when e.kind='refuel_gap' then null else coalesce(e.t_to,e.at) end, e.place, e.lvl_from, e.lvl_to, e.liters,
         case when e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap') then round(coalesce(e.liters,0)*cb) end, e.kmh, e.note,
         case when e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap') then 1 when e.kind='limiter' then 2 when e.kind in ('no_signal','data_gap') then 3 else 4 end
    from fleet_events e where e.at>='2026-07-01 00:00+02' and e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','speed','limiter','no_signal','data_gap');
  select count(*) into n from _reg;
  -- všetky udalosti nafty, obmedzovača a výpadkov; rýchlosť nad limit najviac 300 najvyšších (súhrny nižšie obsahujú všetky)
  select coalesce(jsonb_agg(jsonb_build_array(typ,auto,vodic,to_char(od at time zone tz,f),case when do_ is not null and do_<>od then to_char(do_ at time zone tz,f) end,miesto,
           round(lf),round(lt),round(l),eur,kmh,left(pozn,160)) order by pri, od desc),'[]'), count(*) into ev, nev
    from (select * from _reg where pri<4 order by pri, at desc limit 700) a;
  ev:=ev||coalesce((select jsonb_agg(jsonb_build_array(typ,auto,vodic,to_char(od at time zone tz,f),null,miesto,null,null,null,null,kmh,left(pozn,100)) order by kmh desc, od desc)
           from (select * from _reg where pri=4 order by kmh desc nulls last, at desc limit 300) b),'[]');
  nev:=jsonb_array_length(ev);
  r:=jsonb_build_object(
    'od','01.07.2026','cena_nafty_bez_dph',cb,'pocet_spolu',n,'pocet_v_zozname',nev,
    'vysvetlivky','€ bez DPH = litre × cena nafty bez DPH (iba nafta: pokles v státí, tankovanie nesedí, prečerpanie, karta jedného auta). Výpadok dát = medzera nad 6 h bez záznamu hladiny – nie je to krádež ani strata, bez €. Pri „tankovanie nesedí“ je od = dátum a čas tankovania. Rýchlosť: N2/N3 nad 90 km/h, osobné M1 a dodávky N1 nad 130 km/h; N3 nad 100 km/h = skontrolovať obmedzovač. Zoznam obsahuje všetky udalosti nafty, obmedzovača a výpadkov a najviac 300 najvyšších rýchlostí; súhrny obsahujú všetko.',
    'stlpce',jsonb_build_array('typ','auto','vodic','od','do','miesto','hladina_pred_l','hladina_po_l','litre','eur_bez_dph','max_kmh','poznamka'),
    'udalosti',ev,
    'suhrn_po_vodicoch_mesiace',(select coalesce(jsonb_agg(x order by x->>'mesiac', (x->>'eur_bez_dph')::numeric desc nulls last),'[]') from (
       select jsonb_build_object('mesiac',to_char(at at time zone tz,'YYYY-MM'),'vodic',vodic,'auta',string_agg(distinct auto,', '),
         'pokles_v_stati',count(*) filter (where kind='fuel_drop'),'tankovanie_nesedi',count(*) filter (where kind='refuel_gap'),'precerpanie',count(*) filter (where kind='fuel_transfer'),
         'karta_ine_auto',count(*) filter (where kind='card_swap'),'rychlost',count(*) filter (where kind='speed'),'obmedzovac',count(*) filter (where kind='limiter'),
         'vypadok_signalu',count(*) filter (where kind='no_signal'),'vypadok_dat',count(*) filter (where kind='data_gap'),
         'nafta_l',round(coalesce(sum(l) filter (where eur is not null),0)),'eur_bez_dph',round(coalesce(sum(eur),0)),'max_kmh',max(kmh)) x
       from _reg group by to_char(at at time zone tz,'YYYY-MM'), vodic) q),
    'suhrn_po_autach_mesiace',(select coalesce(jsonb_agg(x order by x->>'mesiac', (x->>'eur_bez_dph')::numeric desc nulls last),'[]') from (
       select jsonb_build_object('mesiac',to_char(at at time zone tz,'YYYY-MM'),'auto',auto,'vodici',string_agg(distinct vodic,', '),
         'pokles_v_stati',count(*) filter (where kind='fuel_drop'),'tankovanie_nesedi',count(*) filter (where kind='refuel_gap'),'precerpanie',count(*) filter (where kind='fuel_transfer'),
         'karta_ine_auto',count(*) filter (where kind='card_swap'),'rychlost',count(*) filter (where kind='speed'),'obmedzovac',count(*) filter (where kind='limiter'),
         'vypadok_signalu',count(*) filter (where kind='no_signal'),'vypadok_dat',count(*) filter (where kind='data_gap'),
         'nafta_l',round(coalesce(sum(l) filter (where eur is not null),0)),'eur_bez_dph',round(coalesce(sum(eur),0)),'max_kmh',max(kmh)) x
       from _reg group by to_char(at at time zone tz,'YYYY-MM'), auto) q));
  return r;
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_register() from public, anon, authenticated;

create or replace function public.ai_snapshot() returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare m0 text:=quote_literal((date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava')::text); kp jsonb; fm jsonb; mz numeric; old numeric; nk numeric;
begin
  -- KPI z aplikácie: zisk vždy s mzdami (ak aplikácia poslala mzdy 0 alebo nič, doplnia sa mzdy z databázy – rovnaký výpočet ako flotila_zisk_mesiac)
  begin
    select value||jsonb_build_object('aktualizovane',to_char(updated_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')) into kp from ai_state where key='kpi';
    fm:=fleet_month(); mz:=(fm->>'mzdy_eur')::numeric;
    if kp is not null and kp->>'obdobie'='m' and coalesce((kp->>'mzdy_eur')::numeric,0)=0 and coalesce(mz,0)>0 then
      old:=coalesce((kp->>'mzdy_eur')::numeric,0); nk:=coalesce((kp->>'naklady_spolu_eur')::numeric,0)-old+mz;
      kp:=kp||jsonb_build_object('mzdy_eur',mz,'mzdy_zdroj','databáza (rovnako ako flotila_zisk_mesiac)','naklady_spolu_eur',round(nk),
        'zisk_eur',round((kp->>'obrat_eur')::numeric-nk),'zisk_do_dnes_pomerne_eur',round((kp->>'obrat_eur')::numeric-nk),
        'zisk_cely_mesiac_plne_pevne_eur',round((kp->>'obrat_eur')::numeric-nk+coalesce((kp->>'pevne_eur')::numeric,0)-coalesce((kp->>'pevne_eur_cely_mesiac')::numeric,0)),
        'zisk_poznamka','');
    end if;
  exception when others then null;
  end;
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
   'flotila_zisk_mesiac', fleet_month(),
   'nalezy_flotila', fleet_findings(),
   'nadrz_dvor', ai_part('select yard_fuel_balance()'),
   'odstavene_auta', ai_part($q$select coalesce((select jsonb_agg(coalesce(v.plate,v.id)) from cmd_vehicles v where coalesce((select (value->>v.id)::boolean from fleet_cfg where key='parked'),false)),'[]')$q$),
   'auta_teraz', ai_part($q$select jsonb_build_object('spolu',count(*),'ide',count(*) filter (where speed>3 and gps_at>now()-interval '20 min')) from cmd_vehicles$q$),
   'nafta_bilancia_7_dni', ai_part('select public.fuel_balance(7)'),
   'nafta_bilancia_30_dni', ai_part('select public.fuel_balance(30)'),
   'nafta_poklesy_v_stati_bez_vypadkov_dat', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters l, lvl_from, lvl_to, to_char(t_from at time zone 'Europe/Bratislava','DD.MM HH24:MI') od, to_char(t_to at time zone 'Europe/Bratislava','DD.MM HH24:MI') do_, place miesto, note from fleet_events where kind='fuel_drop' and at>now()-interval '30 days' order by at desc limit 40) x$q$),
   'udalosti_7_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '7 days' group by kind) x$q$),
   'posledne_alarmy_nafta', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, plate, driver, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where at>now()-interval '7 days' and kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','limiter','no_signal') order by at desc limit 10) x$q$),
   'nafta_precerpanie_medzi_autami', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auta, driver vodici, liters l, place miesto, note popis, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where kind='fuel_transfer' and at>now()-interval '40 days' order by at desc limit 20) x$q$),
   'aktivne_auta_bez_signalu', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select e.plate auto, e.driver posledny_vodic, e.place posledna_poloha, floor(extract(epoch from now()-v.gps_at)/3600)::int hodin from fleet_events e join cmd_vehicles v on v.id=e.vehicle_id where e.kind='no_signal' and v.gps_at=e.t_from and v.gps_at<now()-interval '12 hours') x$q$),
   'alarmy_z_aplikacie', ai_part($q$select value->'alarmy' from ai_state where key='kpi'$q$),
   'nastavenia_nakladov', ai_part($q$select value from fleet_cfg where key='costs'$q$),
   'kpi_z_aplikacie', coalesce(kp,'"majiteľ ešte neotvoril Flotilu"'::jsonb),
   'register_poruseni', ai_register(),
   'tankovacie_karty_vypis', ai_part($q$select jsonb_build_object('dokladov_40_dni',count(*),'litre',round(coalesce(sum(liters),0)),'sparovane_so_sondou',count(*) filter (where m_state='sparovane'),
       'sonda_nezaznamenala',count(*) filter (where m_state='bez_sondy'),'nezname_auto',count(*) filter (where m_state='nezname_auto'),
       'najvacsie_rozdiely',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(plate,card) auto, to_char(at at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') kedy, station stanica, round(liters) doklad_l, round(m_rise) sonda_l, round(liters-coalesce(m_rise,0)) rozdiel_l from fuel_card where at>now()-interval '40 days' and m_state in ('sparovane','bez_sondy') order by abs(liters-coalesce(m_rise,0)) desc limit 10) x))
       from fuel_card where at>now()-interval '40 days'$q$),
   'diagnostika', ai_diag(),
   'dokumenty_archiv', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind typ, driver vodic, title nazov, status stav, to_char(created_at at time zone 'Europe/Bratislava','DD.MM.YYYY') datum from ai_docs order by created_at desc limit 40) x$q$),
   'posledne_upravy_ai', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x$q$));
exception when others then return jsonb_build_object('chyba_prehladu',SQLERRM);
end $$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;

-- ===================== 26. 10. 2026 – AKTUÁLNE DEFINÍCIE (nahrádzajú staršie vyššie aj v iných súboroch) =====================
-- Register porušení (nové typy, artefakt/kalibrácia/falošný bez €), nálezy a diagnostika bez duplicitných ID, počet áut v aplikácii a v Commanderi

create or replace function public.ai_register()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cb numeric; tz text:='Europe/Bratislava'; f text:='DD.MM.YYYY HH24:MI'; r jsonb; n int; ev jsonb; nev int;
begin
  cb:=round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3);
  create temp table if not exists _reg(id bigint, at timestamptz, kind text, typ text, auto text, vodic text, od timestamptz, do_ timestamptz, miesto text, lf numeric, lt numeric, l numeric, eur numeric, kmh int, pozn text, pri int) on commit drop;
  truncate _reg;
  insert into _reg
  select e.id, e.at, e.kind,
         case e.kind when 'fuel_drop' then 'pokles v státí' when 'refuel_gap' then 'tankovanie nesedí' when 'fuel_transfer' then 'prečerpanie'
           when 'card_swap' then 'karta jedného auta, nafta v inom' when 'speed' then 'rýchlosť nad '||coalesce(veh_speed_lim(e.vehicle_id),90)
           when 'limiter' then 'obmedzovač rýchlosti (N3 nad 100)' when 'no_signal' then 'výpadok signálu' when 'data_gap' then 'výpadok dát'
           when 'paid_not_tank' then 'zaplatené, ale nie v nádrži' when 'card_offhours' then 'tankovanie mimo pracovného času' when 'card_double' then 'dve tankovania do 4 h'
           when 'card_far' then 'tankovanie ďaleko od trasy' end
         ||case when e.flag='artefakt' then ' – artefakt snímača (nepočíta sa)' when e.flag='kalibracia' then ' – snímač nekalibrovaný (orientačne)' when e.flag='servis' then ' – odstavené/servis' else '' end
         ||case when e.st='falosny' then ' – FALOŠNÝ ALARM' when e.st='vyriesene' then ' – vyriešené' when e.st='riesim' then ' – rieši sa' else '' end,
         coalesce(nullif(trim(e.plate),''),e.vehicle_id), coalesce(nullif(trim(e.driver),''),'neznámy vodič'),
         coalesce(e.t_from,e.at), case when e.kind='refuel_gap' then null else coalesce(e.t_to,e.at) end, e.place, e.lvl_from, e.lvl_to, e.liters,
         case when e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank') and e.flag is null and e.st<>'falosny' then round(coalesce(e.liters,0)*cb) end, e.kmh,
         concat_ws(' · ',e.note,e.flag_note,case when e.st_note is not null then 'poznámka: '||e.st_note end),
         case when e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank') then 1 when e.kind='limiter' then 2 when e.kind in ('no_signal','data_gap','card_offhours','card_double','card_far') then 3 else 4 end
    from fleet_events e where e.at>='2026-07-01 00:00+02' and e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','speed','limiter','no_signal','data_gap','paid_not_tank','card_offhours','card_double','card_far');
  select count(*) into n from _reg;
  -- všetky udalosti nafty, obmedzovača a výpadkov; rýchlosť nad limit najviac 300 najvyšších (súhrny nižšie obsahujú všetky)
  select coalesce(jsonb_agg(jsonb_build_array(typ,auto,vodic,to_char(od at time zone tz,f),case when do_ is not null and do_<>od then to_char(do_ at time zone tz,f) end,miesto,
           round(lf),round(lt),round(l),eur,kmh,left(pozn,160)) order by pri, od desc),'[]'), count(*) into ev, nev
    from (select * from _reg where pri<4 order by pri, at desc limit 700) a;
  ev:=ev||coalesce((select jsonb_agg(jsonb_build_array(typ,auto,vodic,to_char(od at time zone tz,f),null,miesto,null,null,null,null,kmh,left(pozn,100)) order by kmh desc, od desc)
           from (select * from _reg where pri=4 order by kmh desc nulls last, at desc limit 300) b),'[]');
  nev:=jsonb_array_length(ev);
  r:=jsonb_build_object(
    'od','01.07.2026','cena_nafty_bez_dph',cb,'pocet_spolu',n,'pocet_v_zozname',nev,
    'vysvetlivky','€ bez DPH = litre × cena nafty bez DPH (iba nafta: pokles v státí, tankovanie nesedí, prečerpanie, karta jedného auta). Výpadok dát = medzera nad 6 h bez záznamu hladiny – nie je to krádež ani strata, bez €. Artefakt snímača (prebytok pri tankovaní a pokles do 6 h sa líšia o menej ako 30 l), nekalibrovaný snímač a falošné alarmy sú bez €. Zaplatené, ale nie v nádrži = doklad z karty, nárast v nádrži pod 20 % a o viac ako 100 l menej. Pri „tankovanie nesedí“ je od = dátum a čas tankovania. Rýchlosť: N2/N3 nad 90 km/h, osobné M1 a dodávky N1 nad 130 km/h; N3 nad 100 km/h = skontrolovať obmedzovač. Zoznam obsahuje všetky udalosti nafty, obmedzovača a výpadkov a najviac 300 najvyšších rýchlostí; súhrny obsahujú všetko.',
    'stlpce',jsonb_build_array('typ','auto','vodic','od','do','miesto','hladina_pred_l','hladina_po_l','litre','eur_bez_dph','max_kmh','poznamka'),
    'udalosti',ev,
    'suhrn_po_vodicoch_mesiace',(select coalesce(jsonb_agg(x order by x->>'mesiac', (x->>'eur_bez_dph')::numeric desc nulls last),'[]') from (
       select jsonb_build_object('mesiac',to_char(at at time zone tz,'YYYY-MM'),'vodic',vodic,'auta',string_agg(distinct auto,', '),
         'pokles_v_stati',count(*) filter (where kind='fuel_drop'),'tankovanie_nesedi',count(*) filter (where kind='refuel_gap'),'precerpanie',count(*) filter (where kind='fuel_transfer'),
         'karta_ine_auto',count(*) filter (where kind='card_swap'),'zaplatene_nie_v_nadrzi',count(*) filter (where kind='paid_not_tank'),'kontroly_kariet',count(*) filter (where kind like 'card\_%' and kind<>'card_swap'),'rychlost',count(*) filter (where kind='speed'),'obmedzovac',count(*) filter (where kind='limiter'),
         'vypadok_signalu',count(*) filter (where kind='no_signal'),'vypadok_dat',count(*) filter (where kind='data_gap'),
         'nafta_l',round(coalesce(sum(l) filter (where eur is not null),0)),'eur_bez_dph',round(coalesce(sum(eur),0)),'max_kmh',max(kmh)) x
       from _reg group by to_char(at at time zone tz,'YYYY-MM'), vodic) q),
    'suhrn_po_autach_mesiace',(select coalesce(jsonb_agg(x order by x->>'mesiac', (x->>'eur_bez_dph')::numeric desc nulls last),'[]') from (
       select jsonb_build_object('mesiac',to_char(at at time zone tz,'YYYY-MM'),'auto',auto,'vodici',string_agg(distinct vodic,', '),
         'pokles_v_stati',count(*) filter (where kind='fuel_drop'),'tankovanie_nesedi',count(*) filter (where kind='refuel_gap'),'precerpanie',count(*) filter (where kind='fuel_transfer'),
         'karta_ine_auto',count(*) filter (where kind='card_swap'),'zaplatene_nie_v_nadrzi',count(*) filter (where kind='paid_not_tank'),'kontroly_kariet',count(*) filter (where kind like 'card\_%' and kind<>'card_swap'),'rychlost',count(*) filter (where kind='speed'),'obmedzovac',count(*) filter (where kind='limiter'),
         'vypadok_signalu',count(*) filter (where kind='no_signal'),'vypadok_dat',count(*) filter (where kind='data_gap'),
         'nafta_l',round(coalesce(sum(l) filter (where eur is not null),0)),'eur_bez_dph',round(coalesce(sum(eur),0)),'max_kmh',max(kmh)) x
       from _reg group by to_char(at at time zone tz,'YYYY-MM'), auto) q));
  return r;
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $function$;
revoke all on function public.ai_register() from public, anon, authenticated;

create or replace function public.fleet_findings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare tz text:='Europe/Bratislava'; today date:=(now() at time zone 'Europe/Bratislava')::date; y0 timestamptz; m0 timestamptz; pk jsonb; dr jsonb; top jsonb; sp jsonb; fd jsonb; ns jsonb; nr jsonb; z1 jsonb; z0 jsonb; ch numeric; ok boolean;
begin
  y0:=(today-1)::timestamp at time zone tz; m0:=date_trunc('month',today)::timestamp at time zone tz;
  select coalesce(value,'{}') into pk from fleet_cfg where key='parked'; pk:=coalesce(pk,'{}');
  dr:=fleet_drv_eval(m0, now()+interval '1 day');
  select coalesce(jsonb_agg(x),'[]') into top from (select jsonb_build_object('vodic',e->>'vodic','rozdiel_l',(e->>'rozdiel_l')::numeric,'rozdiel_pct',(e->>'rozdiel_pct')::numeric,'rozdiel_eur_bez_dph',(e->>'rozdiel_eur_bez_dph')::numeric,'poznamka',e->>'poznamka') x
     from jsonb_array_elements(case when jsonb_typeof(dr)='array' then dr else '[]' end) e where not (e->>'malo_dat')::boolean and not fleet_unknown(e->>'vodic') and (e->>'rozdiel_l')::numeric>0
     order by (e->>'rozdiel_pct')::numeric desc nulls last limit 3) q;
  select coalesce(jsonb_agg(x order by x->>'pocet' desc),'[]') into sp from (select jsonb_build_object('vodic',coalesce(nullif(trim(driver),''),'neznámy vodič'),'pocet',count(*),'max_kmh',max(kmh),
     'auta',string_agg(distinct plate,', ')) x from fleet_events where kind='speed' and at>=y0 group by coalesce(nullif(trim(driver),''),'neznámy vodič')) q;
  select coalesce(jsonb_agg(jsonb_build_object('auto',plate,'vodic',driver,'litre',liters,'kedy',to_char(at at time zone tz,'DD.MM HH24:MI'),'miesto',place) order by at),'[]') into fd
    from fleet_events where kind='fuel_drop' and at>=y0 and flag is null and st<>'falosny';
  select coalesce(jsonb_agg(jsonb_build_object('auto',coalesce(plate,name,id),'hodin',case when gps_at is null then null else floor(extract(epoch from now()-gps_at)/3600)::int end) order by gps_at nulls first),'[]') into ns
    from cmd_vehicles v where (gps_at is null or gps_at<now()-interval '24 hours') and v.alias_of is null and not coalesce(v.deleted,false) and not veh_off(v.id);
  select coalesce(jsonb_agg(coalesce(plate,name,id) order by plate),'[]') into nr
    from cmd_vehicles v where v.alias_of is null and not coalesce(v.deleted,false) and not veh_off(v.id) and not exists(select 1 from rides r where r.vehicle_id=any(veh_ids(v.id)) and r.start_at>=now()-interval '48 hours');
  z1:=fleet_month(today);
  if date_trunc('month',today-1)=date_trunc('month',today) then z0:=fleet_month(today-1); ch:=(z1->>'zisk_do_dnes_pomerne')::numeric-(z0->>'zisk_do_dnes_pomerne')::numeric; end if;
  ok:=coalesce((select bool_and(coalesce((x->>'rozdiel_pct')::numeric,0)<=15) from jsonb_array_elements(top) x),true) and jsonb_array_length(sp)=0 and jsonb_array_length(fd)=0 and jsonb_array_length(ns)=0 and jsonb_array_length(nr)=0;
  return jsonb_build_object('bez_nalezov',ok,'cena_nafty_bez_dph',round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3),
    'top3_rozdiel_nafty_mesiac',top,'rychlost_nad_90_od_vcera',sp,'poklesy_paliva_pri_stati_od_vcera',fd,'bez_signalu_nad_24h',ns,'bez_jazdy_48h',nr,
    'zisk_do_dnes',z1->'zisk_do_dnes_pomerne','zisk_cely_mesiac',z1->'zisk_cely_mesiac_plne_pevne','zmena_zisku_od_vcera',round(ch),'obrat_je_odhad',z1->'obrat_je_odhad',
    'nadrz_dvor',yard_fuel_balance(),
    'zaplatene_nie_v_nadrzi_od_vcera',(select coalesce(jsonb_agg(jsonb_build_object('auto',plate,'vodic',driver,'chyba_l',liters,'kedy',to_char(at at time zone tz,'DD.MM HH24:MI'),'popis',left(note,300))),'[]') from fleet_events where kind='paid_not_tank' and at>=y0 and st<>'falosny'));
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $function$;
revoke all on function public.fleet_findings() from public, anon, authenticated;

create or replace function public.ai_diag()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m0 text:=quote_literal((date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava')::text);
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  return jsonb_build_object(
   'udalosti_spolu', ai_part('select count(*) from fleet_events'),
   'udalosti_posledna', ai_part($q$select to_char(max(at) at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') from fleet_events$q$),
   'udalosti_podla_typu_30_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '30 days' group by kind) x$q$),
   'dvor_nastaveny', ai_part($q$select exists(select 1 from fleet_cfg where key='yard') or exists(select 1 from places where kind='yard')$q$),
   'miesta', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from places group by kind) x$q$),
   'miesta_s_notifikaciou', ai_part('select count(*) from places where notify'),
   'miesta_s_problemom', ai_part($q$select count(*) from places p where p.lat is null or p.lon is null or p.lat=0 or p.lon=0 or p.lat not between 40 and 56 or p.lon not between 10 and 30
      or coalesce(trim(p.name),'') in ('','Slovnaft') or p.kind not in ('yard','buyer','fuel','other') or p.r<=0 or p.r>5000
      or exists(select 1 from places q where q.id<>p.id and q.kind=p.kind and (lower(trim(q.name))=lower(trim(p.name)) and q.kind<>'fuel' or abs(q.lat-p.lat)<0.0005 and abs(q.lon-p.lon)<0.0007))$q$),
   'miesta_problemy_podla_dovodu', ai_part($q$select jsonb_build_object(
      'bez súradníc',count(*) filter (where lat is null or lon is null or lat=0 or lon=0 or lat not between 40 and 56 or lon not between 10 and 30),
      'duplicitné',count(*) filter (where exists(select 1 from places q where q.id<>p.id and q.kind=p.kind and (lower(trim(q.name))=lower(trim(p.name)) and q.kind<>'fuel' or abs(q.lat-p.lat)<0.0005 and abs(q.lon-p.lon)<0.0007))),
      'chýba názov',count(*) filter (where coalesce(trim(name),'') in ('','Slovnaft')),
      'chýba/zlý typ',count(*) filter (where kind is null or kind not in ('yard','buyer','fuel','other')),
      'zlý okruh',count(*) filter (where r<=0 or r>5000)) from places p$q$),
   'ntfy_tema_nastavena', ai_part($q$select coalesce((select value->>'topic' from fleet_cfg where key='notify'),'') <> ''$q$),
   'funkcie', ai_part($q$select jsonb_build_object('yard_check',to_regprocedure('public.yard_check()') is not null,'place_check',to_regprocedure('public.place_check()') is not null,'stop_check',to_regprocedure('public.stop_check()') is not null,'fuel_check',to_regprocedure('public.fuel_check()') is not null,'osm_sync',to_regprocedure('public.osm_sync()') is not null)$q$),
   'cron_ulohy', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('uloha',jobname,'zapnuta',active,'rozvrh',schedule)),'[]') from cron.job$q$),
   'cron_posledne_behy', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select j.jobname uloha, d.status, left(d.return_message,120) sprava, to_char(d.start_time at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from cron.job_run_details d join cron.job j on j.jobid=d.jobid where d.start_time>now()-interval '15 minutes' order by d.start_time desc limit 12) x$q$),
   'cron_chyby_24h', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select j.jobname uloha, count(*) chyb, max(left(d.return_message,160)) posledna from cron.job_run_details d join cron.job j on j.jobid=d.jobid where d.status<>'succeeded' and d.start_time>now()-interval '24 hours' group by j.jobname) x$q$),
   'commander_posledne', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, to_char(max(at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') posledne, (array_agg(code order by at desc) filter (where code is not null))[1] kod from cmd_log where kind not in ('backfill','backfill_ref','refetch_r','rides26') group by kind) x$q$),
   'poloha_zapis', ai_part($q$select jsonb_build_object('posledne_nacitanie',(select to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' · kód '||coalesce(code::text,'čaká')||' · zapísaných áut '||coalesce(n::text,'?')||coalesce(' · najnovšia GPS v odpovedi '||to_char(gps_max at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'') from cmd_log where kind='pos' and done order by at desc limit 1),
      'posledny_zapis_do_aut',(select to_char(max(updated_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from cmd_vehicles),
      'najnovsia_gps',(select to_char(max(gps_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from cmd_vehicles),
      'chyba_zapisu',(select msg||' ('||to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||')' from check_err where fn='cmd_sync_pos' and msg is not null),
      'zaver',case when (select max(updated_at) from cmd_vehicles)>now()-interval '10 minutes' and (select max(gps_at) from cmd_vehicles)<now()-interval '30 minutes' then 'sync zapisuje, ale jednotky posielajú starú polohu (autá stoja / vypnuté)'
                   when (select max(updated_at) from cmd_vehicles)<now()-interval '10 minutes' then 'sync nezapisuje polohy – skontroluj Commander'
                   else 'polohy sa zapisujú' end)$q$),
   'commander_backfill', ai_part($q$select coalesce(jsonb_agg(x order by x->>'den' desc),'[]') from (select jsonb_build_object('den',url,'kedy',to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'pokusov',coalesce(n,1),
      'stav',case when ref is null then 'starý záznam bez kódu' when code=200 then 'OK (200)' when code is null and at>now()-interval '20 minutes' then 'čaká na odpoveď'
                  when coalesce(n,1)>=3 then 'ZLYHALO 3× ('||coalesce(code::text,'bez kódu')||')' else 'chyba '||coalesce(code::text,'bez kódu')||' – zopakuje sa' end) x
      from cmd_log where kind='backfill' order by url desc limit 6) q$q$),
   'aut_spolu', ai_part('select count(*) from cmd_vehicles'),
   'auta_aplikacia_vs_commander', ai_part($q$select jsonb_build_object('v_aplikacii',(select count(*) from cmd_vehicles where alias_of is null and not coalesce(deleted,false) and (plate is not null or name is not null)),
      'v_commanderi',(select sum(n) from cmd_api where kind='vehicles' and code=200),
      'zlucene_duplicity',(select count(*) from cmd_vehicles where alias_of is not null),
      'upozornenie',case when (select count(*) from cmd_vehicles where alias_of is null and not coalesce(deleted,false) and (plate is not null or name is not null)) is distinct from (select sum(n) from cmd_api where kind='vehicles' and code=200)
                         then 'POČET SA LÍŠI – skontroluj duplicitné alebo vymazané vozidlá' end)$q$),
   'commander_api', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('co',acc||':'||kind,'kod',code,'zaznamov',n,'posledne_ok',to_char(ok_at at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'sprava',left(msg,120)) order by acc,kind),'[]') from cmd_api$q$),
   'tankovacie_data', ai_part('select fuel_data_status()'),
   'auta_s_polohou_do_30_min', ai_part($q$select count(*) from cmd_vehicles where lat is not null and gps_at>now()-interval '30 minutes'$q$),
   'najnovsia_poloha', ai_part($q$select to_char(max(gps_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from cmd_vehicles$q$),
   'najstarsia_poloha', ai_part($q$select to_char(min(gps_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from cmd_vehicles$q$),
   'auta_na_mieste_teraz', ai_part('select count(*) from veh_place where place_id is not null'),
   'kontroly_stav', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('kontrola',fn,'posledny_ok',to_char(ok_at at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'udalosti',n,'chyba',msg,'chyba_kedy',to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI'))),'[]') from check_err$q$),
   'auta_bez_jazd_tento_mesiac', ai_part('select coalesce(jsonb_agg(coalesce(v.plate,v.name,v.id)),''[]'') from cmd_vehicles v where v.alias_of is null and not coalesce(v.deleted,false) and not exists(select 1 from rides r where r.vehicle_id=any(veh_ids(v.id)) and r.start_at>='||m0||'::timestamptz)'),
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
end $function$;
revoke all on function public.ai_diag() from public, anon;
grant execute on function public.ai_diag() to authenticated;

-- AI úprava 26. 10. 2026 (5/6): týždenný audit nafty (každý pondelok 6:00) a burzové ceny pre Cenník (MATIF, CBOT)

-- ===== týždenný audit nafty – VALKO s.r.o. =====
create or replace function public.fuel_audit_week(force boolean default false) returns bigint language plpgsql security definer set search_path=public, extensions, net as $$
declare tz text:='Europe/Bratislava'; d1 date; d0 date; a timestamptz; b timestamptz; cb numeric; md text; tp text; did bigint; wk text;
  l_card numeric; l_yard numeric; l_cons numeric; tkm numeric; top jsonb; msg text; n_pnt int;
begin
  d1:=date_trunc('week',(now() at time zone tz)::date)::date; d0:=d1-7;           -- predchádzajúci týždeň pondelok–nedeľa
  wk:=to_char(d0,'IYYY-IW');
  if not force then
    if extract(isodow from now() at time zone tz)<>1 or extract(hour from now() at time zone tz)<>6 then return null; end if;
    if exists(select 1 from ai_state where key='nafta_audit' and value->>'tyzden'=wk) then return null; end if;
  end if;
  a:=d0::timestamp at time zone tz; b:=d1::timestamp at time zone tz;
  cb:=round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3);
  select value->>'topic' into tp from fleet_cfg where key='notify';
  select coalesce(sum(liters),0) into l_card from card_tx(a) where at<b;
  select coalesce(sum(liters),0) into l_yard from yard_fuel where kind='vydaj' and day>=d0 and day<d1;
  select coalesce(sum(fuel_consumed) filter (where distance>0),0), coalesce(sum(distance),0) into l_cons, tkm from rides where start_at>=a and start_at<b;

  create temp table if not exists _au(typ text, nm text, grp text, km numeric, l numeric, c numeric, c3 numeric, cf numeric, dv3 numeric, dvf numeric, eur numeric) on commit drop;
  truncate _au;
  -- po autách: týždeň vs. vlastný 3-mesačný priemer vs. priemer skupiny
  insert into _au(typ,nm,grp,km,l,c,c3)
    select 'auto', coalesce(v.plate,v.name,v.id), veh_group(v.id), w.km, w.l, case when w.km>=100 then w.l/w.km*100 end,
           (select case when sum(r.distance)>=300 then sum(r.fuel_consumed)/sum(r.distance)*100 end from rides r where r.vehicle_id=any(veh_ids(v.id)) and r.start_at>=a-interval '90 days' and r.start_at<a and r.distance>0 and r.fuel_consumed>0)
      from cmd_vehicles v join lateral (select sum(distance) km, sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0) l from rides r where r.vehicle_id=any(veh_ids(v.id)) and r.start_at>=a and r.start_at<b) w on true
     where v.alias_of is null and not coalesce(v.deleted,false) and coalesce(w.km,0)>0;
  -- po vodičoch
  insert into _au(typ,nm,grp,km,l,c,c3)
    select 'vodic', dn, null, sum(km), sum(l), case when sum(km)>=100 then sum(l)/sum(km)*100 end,
           (select case when sum(r.distance)>=300 then sum(r.fuel_consumed)/sum(r.distance)*100 end from rides r where trim(r.driver)=dn and r.start_at>=a-interval '90 days' and r.start_at<a and r.distance>0 and r.fuel_consumed>0)
      from (select trim(driver) dn, distance km, case when distance>0 and fuel_consumed>0 then fuel_consumed end l from rides where start_at>=a and start_at<b and not fleet_unknown(driver)) q group by dn;
  update _au u set cf=(select sum(l)/nullif(sum(km),0)*100 from _au x where x.typ='auto' and x.grp=u.grp and x.km>=100) where typ='auto';
  update _au u set cf=(select sum(l)/nullif(sum(km),0)*100 from _au x where x.typ='auto' and x.km>=100 and x.grp in ('region','eu')) where typ='vodic';
  update _au set dv3=case when c3>0 and c is not null then (c/c3-1)*100 end, dvf=case when cf>0 and c is not null then (c/cf-1)*100 end;
  update _au set eur=round(greatest(0, case when dv3>8 then (c-c3)/100*km when dvf>15 then (c-cf)/100*km else 0 end)*cb);

  md:='# VALKO s.r.o. – týždenný audit nafty'||E'\n'||'**Obdobie:** '||to_char(d0,'DD.MM.')||' – '||to_char(d1-1,'DD.MM.YYYY')||' · cena nafty '||replace(cb::text,'.',',')||' €/l bez DPH'||E'\n\n'
    ||'## Súhrn'||E'\n'||'| Položka | Litre |'||E'\n'||'|---|---|'||E'\n'
    ||'| Natankované z kariet | '||round(l_card)||' l |'||E'\n'||'| Výdaj z nádrže na dvore | '||round(l_yard)||' l |'||E'\n'
    ||'| Spotreba podľa Commandera | '||round(l_cons)||' l ('||round(tkm)||' km'||case when tkm>0 then ', '||replace(round(l_cons/tkm*100,1)::text,'.',',')||' l/100 km' else '' end||') |'||E'\n'
    ||'| Rozdiel spotreba − (karty + dvor) | '||round(l_cons-l_card-l_yard)||' l ≈ '||round((l_cons-l_card-l_yard)*cb)||' € |'||E'\n'
    ||case when (fuel_data_status()->>'neuplne')::boolean then E'\n'||'⚠️ Tankovania z kariet chýbajú od '||coalesce(to_char((fuel_data_status()->>'chybaju_od')::date,'DD.MM.YYYY'),'?')||' – rozdiel je neúplný.'||E'\n' else '' end
    ||E'\n'||'## Spotreba po autách'||E'\n'||'Alarm: odchýlka od vlastného 3-mesačného priemeru nad 8 % alebo od priemeru skupiny flotily nad 15 %.'||E'\n\n'
    ||'| Auto | km | l/100 | vlastný 3-mes. | odchýlka | priemer skupiny | odchýlka | |'||E'\n'||'|---|---|---|---|---|---|---|---|'||E'\n'
    ||coalesce((select string_agg('| '||nm||' | '||round(km)||' | '||coalesce(replace(round(c,1)::text,'.',','),'málo dát')||' | '||coalesce(replace(round(c3,1)::text,'.',','),'–')||' | '
        ||coalesce(case when dv3>=0 then '+' else '' end||replace(round(dv3,1)::text,'.',',')||' %','–')||' | '||coalesce(replace(round(cf,1)::text,'.',','),'–')||' | '
        ||coalesce(case when dvf>=0 then '+' else '' end||replace(round(dvf,1)::text,'.',',')||' %','–')||' | '||case when dv3>8 or dvf>15 then '🚨 '||coalesce(eur,0)||' €' else '✓' end||' |',E'\n' order by coalesce(greatest(dv3,dvf),-999) desc)
       from _au where typ='auto'),'| žiadne jazdy | | | | | | | |')
    ||E'\n\n'||'## Spotreba po vodičoch'||E'\n'||'| Vodič | km | l/100 | vlastný 3-mes. | odchýlka | priemer flotily | odchýlka | |'||E'\n'||'|---|---|---|---|---|---|---|---|'||E'\n'
    ||coalesce((select string_agg('| '||nm||' | '||round(km)||' | '||coalesce(replace(round(c,1)::text,'.',','),'málo dát')||' | '||coalesce(replace(round(c3,1)::text,'.',','),'–')||' | '
        ||coalesce(case when dv3>=0 then '+' else '' end||replace(round(dv3,1)::text,'.',',')||' %','–')||' | '||coalesce(replace(round(cf,1)::text,'.',','),'–')||' | '
        ||coalesce(case when dvf>=0 then '+' else '' end||replace(round(dvf,1)::text,'.',',')||' %','–')||' | '||case when dv3>8 or dvf>15 then '🚨 '||coalesce(eur,0)||' €' else '✓' end||' |',E'\n' order by coalesce(greatest(dv3,dvf),-999) desc)
       from _au where typ='vodic'),'| žiadne jazdy | | | | | | | |')
    ||E'\n\n'||'## Zaplatené, ale nie v nádrži'||E'\n'
    ||coalesce((select string_agg('- **'||plate||'** · '||coalesce(driver,'neznámy')||' · '||to_char(at at time zone tz,'DD.MM HH24:MI')||' · chýba '||round(liters)||' l ≈ '||round(liters*cb)||' € · '||left(coalesce(note,''),220),E'\n' order by liters desc)
       from fleet_events where kind='paid_not_tank' and at>=a and at<b and st<>'falosny'),'Žiadne prípady.')
    ||E'\n\n'||'## Kalibrácia palivových snímačov'||E'\n'
    ||coalesce((select string_agg('- **'||coalesce(v.plate,v.name,v.id)||'** · '||case when c.flagged then 'snímač nekalibrovaný – koeficient '||replace(c.coef::text,'.',',')||' ('||c.n||' tankovaní, '||coalesce(c.rule,'')||')' else '' end
         ||case when c.over_cap then case when c.flagged then ' · ' else '' end||'max. hladina za 90 dní '||round(c.max90)||' l je o viac ako 5 % nad objemom nádrže '||round(c.tank_real)||' l' else '' end,E'\n')
       from veh_calib c join cmd_vehicles v on v.id=c.vehicle_id where c.flagged or c.over_cap),'Všetky snímače bez podozrenia.');
  -- 3 najväčšie položky v €
  select coalesce(jsonb_agg(x order by (x->>'eur')::numeric desc),'[]') into top from (
    select jsonb_build_object('t',t,'eur',eur) x from (
      select 'Zaplatené, nie v nádrži: '||plate||' '||round(liters)||' l' t, round(liters*cb) eur from fleet_events where kind='paid_not_tank' and at>=a and at<b and st<>'falosny'
      union all select 'Karta iného auta: '||plate||' '||round(liters)||' l', round(liters*cb) from fleet_events where kind='card_swap' and at>=a and at<b and st<>'falosny'
      union all select 'Pokles v státí: '||plate||' '||round(liters)||' l', round(liters*cb) from fleet_events where kind='fuel_drop' and at>=a and at<b and flag is null and st<>'falosny'
      union all select 'Spotreba nad priemer: '||nm||' ('||case when dv3>8 then '+'||round(dv3)||' % vs. vlastný' else '+'||round(dvf)||' % vs. flotila' end||')', eur from _au where eur>0
    ) q order by eur desc nulls last limit 3) z;
  if jsonb_array_length(top)>0 then
    md:=md||E'\n\n'||'## Najväčšie položky'||E'\n'||(select string_agg((o)::text||'. '||(e->>'t')||' – **'||(e->>'eur')||' €**',E'\n') from jsonb_array_elements(top) with ordinality q(e,o));
  end if;
  md:=md||E'\n\n'||'_Audit vytvorený automaticky '||to_char(now() at time zone tz,'DD.MM.YYYY HH24:MI')||' z údajov Commander, výpisu kariet a nádrže na dvore. Pri autách s nekalibrovaným snímačom sú hodnoty orientačné._';
  insert into ai_docs(kind,title,content) values('iny','VALKO s.r.o. – týždenný audit nafty '||to_char(d0,'DD.MM.')||'–'||to_char(d1-1,'DD.MM.YYYY'),md) returning id into did;
  insert into ai_state(key,value) values('nafta_audit',jsonb_build_object('tyzden',wk,'doc',did,'at',now())) on conflict(key) do update set value=excluded.value, updated_at=now();
  if tp is not null then
    msg:='Audit nafty '||to_char(d0,'DD.MM.')||'–'||to_char(d1-1,'DD.MM.')||': '||coalesce((select string_agg((e->>'t')||' '||(e->>'eur')||' €',' · ') from jsonb_array_elements(top) e),'bez výrazných strát')||' · celý audit: AI → Dokumenty';
    begin perform net.http_post(url:='https://ntfy.sh/'||tp, body:=jsonb_build_object('topic',tp,'title','Týždenný audit nafty','message',msg,'tags',jsonb_build_array('fuelpump','bar_chart'),'priority',4)); exception when others then null; end;
  end if;
  return did;
end $$;
revoke all on function public.fuel_audit_week(boolean) from public, anon, authenticated;
select cron.schedule('nafta-audit','0 4,5 * * 1','select public.fuel_audit_week()');

-- ===== burzové ceny (MATIF repka, pšenica, kukurica; CBOT sója → €/t) =====
create table if not exists market_px(sym text primary key, name text, price numeric, unit text, eur_t numeric, contract text, quote_date date, src text, updated_at timestamptz not null default now());
alter table market_px enable row level security;
drop policy if exists market_px_read on market_px;
create policy market_px_read on market_px for select using (is_staff());

create or replace function public.market_refresh() returns bigint language plpgsql security definer set search_path=public, net as $$
declare k text:=regexp_replace(coalesce(ai_secret('anthropic_key'),''),'\s','','g'); md text:=(select value->>'mode' from ai_state where key='auth'); rq bigint;
begin
  if k='' then return null; end if;
  rq:=net.http_post(url:='https://api.anthropic.com/v1/messages',
    headers:=case when coalesce(md, case when k like 'sk-ant-api%' then 'x' else 'b' end)='x' then jsonb_build_object('x-api-key',k) else jsonb_build_object('Authorization','Bearer '||k) end||jsonb_build_object('anthropic-version','2023-06-01','content-type','application/json'),
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',2500,
      'system','Si dátový asistent. Vyhľadaj na webe aktuálne burzové ceny a odpovedz IBA jedným JSON objektom bez ďalšieho textu a bez ```.',
      'messages',jsonb_build_array(jsonb_build_object('role','user','content',
        'Zisti posledné uzatváracie (alebo aktuálne) ceny najbližšieho obchodovaného kontraktu: MATIF / Euronext Paris – repka (rapeseed, €/t), mlynárska pšenica (milling wheat, €/t), kukurica (corn, €/t); CBOT soja (soybeans, US centy za bušel); kurz EUR/USD. '||
        'NAFTA: ICE Low Sulphur Gasoil futures najbližší kontrakt (USD za metrickú tonu); ropa Brent najbližší kontrakt (USD za barel); priemerná cena motorovej nafty na čerpacích staniciach na Slovensku (€/l s DPH, najnovší dostupný denný alebo týždenný údaj – napr. Slovnaft, ŠÚ SR, EU Weekly Oil Bulletin, fuel-prices.eu – uveď zdroj a dátum). '||
        'Formát: {"repka":{"cena":0,"kontrakt":"","datum":"YYYY-MM-DD","zdroj":""},"psenica":{...},"kukurica":{...},"soja_usc_bu":{...},"gasoil":{...},"brent":{...},"nafta_sk":{...},"eurusd":0}. Ak cenu nenájdeš, daj null.')),
      'tools',jsonb_build_array(jsonb_build_object('type','web_search_20250305','name','web_search','max_uses',6))),
    timeout_milliseconds:=180000);
  insert into ai_state(key,value) values('market_req',jsonb_build_object('req',rq,'at',now())) on conflict(key) do update set value=excluded.value, updated_at=now();
  return rq;
end $$;
revoke all on function public.market_refresh() from public, anon, authenticated;

create or replace function public.market_collect() returns int language plpgsql security definer set search_path=public, net as $$
declare st jsonb; r record; j jsonb; txt text; o jsonb; fx numeric; k int:=0; it record;
begin
  select value into st from ai_state where key='market_req'; if st is null or st ? 'done' then return 0; end if;
  select * into r from net._http_response where id=(st->>'req')::bigint;
  if r.id is null then
    if (st->>'at')::timestamptz<now()-interval '10 minutes' then update ai_state set value=value||jsonb_build_object('done',now(),'err','bez odpovede') where key='market_req'; end if;
    return 0; end if;
  if r.status_code is distinct from 200 then update ai_state set value=value||jsonb_build_object('done',now(),'err',left(coalesce(r.content,r.error_msg,''),200)) where key='market_req'; return 0; end if;
  j:=ai_json(r.content);
  select string_agg(b->>'text','') into txt from jsonb_array_elements(coalesce(j->'content','[]')) b where b->>'type'='text';
  begin o:=substring(txt from '\{.*\}')::jsonb; exception when others then o:=null; end;
  if o is null then update ai_state set value=value||jsonb_build_object('done',now(),'err','neplatná odpoveď') where key='market_req'; return 0; end if;
  fx:=nullif(cmd_num(o->>'eurusd'),0);
  for it in select * from (values ('repka','MATIF repka','€/t'),('psenica','MATIF pšenica','€/t'),('kukurica','MATIF kukurica','€/t'),('soja_usc_bu','CBOT sója','USc/bu'),
                                  ('gasoil','ICE Gasoil','USD/t'),('brent','Brent','USD/bbl'),('nafta_sk','Nafta SK priemer','€/l')) v(sym,nm,un) loop
    if cmd_num(o->it.sym->>'cena') is not null and cmd_num(o->it.sym->>'cena')>0 then
      insert into market_px(sym,name,price,unit,eur_t,contract,quote_date,src,updated_at)
        values(it.sym,it.nm,cmd_num(o->it.sym->>'cena'),it.un,
          case when it.sym='soja_usc_bu' then case when fx is not null then round(cmd_num(o->it.sym->>'cena')/100*36.7437/fx,1) end
               when it.sym='gasoil' then case when fx is not null then round(cmd_num(o->it.sym->>'cena')/fx,1) end
               when it.sym in ('brent','nafta_sk') then null else cmd_num(o->it.sym->>'cena') end,
          o->it.sym->>'kontrakt', case when o->it.sym->>'datum' ~ '^\d{4}-\d{2}-\d{2}$' then (o->it.sym->>'datum')::date end, left(o->it.sym->>'zdroj',200), now())
        on conflict(sym) do update set price=excluded.price, eur_t=coalesce(excluded.eur_t,market_px.eur_t), contract=excluded.contract, quote_date=excluded.quote_date, src=excluded.src, updated_at=now();
      k:=k+1;
    end if;
  end loop;
  if fx is not null then insert into market_px(sym,name,price,unit,updated_at) values('eurusd','EUR/USD',fx,'USD',now()) on conflict(sym) do update set price=excluded.price, updated_at=now(); end if;
  update ai_state set value=value||jsonb_build_object('done',now(),'n',k) where key='market_req';
  return k;
end $$;
revoke all on function public.market_collect() from public, anon, authenticated;

-- tlačidlo „Obnoviť burzu“ v Cenníku (najviac raz za 30 min)
create or replace function public.market_refresh_app() returns text language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() then raise exception 'Iba ERNTE.'; end if;
  if exists(select 1 from ai_state where key='market_req' and updated_at>now()-interval '30 minutes') then return 'čaká'; end if;
  perform market_refresh(); return 'ok';
end $$;
revoke all on function public.market_refresh_app() from public, anon;
grant execute on function public.market_refresh_app() to authenticated;

create or replace function public.ai_tick() returns void language plpgsql security definer set search_path=public as $$
begin
  begin perform ai_collect(); exception when others then insert into check_err as c(fn,msg,at) values('ai_collect',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end;
  begin perform ai_gh_sync(extract(minute from now())::int % 5 = 0); exception when others then insert into check_err as c(fn,msg,at) values('ai_gh_sync',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end;
  begin perform ai_auto_sync(extract(minute from now())::int % 3 = 0); exception when others then insert into check_err as c(fn,msg,at) values('ai_auto_sync',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end;
  begin perform market_collect(); exception when others then insert into check_err as c(fn,msg,at) values('market_collect',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end;
end $$;
revoke all on function public.ai_tick() from public, anon, authenticated;
-- burza (obilie aj nafta) každé 2 hodiny 6:00–20:00, aj cez víkend (ceny nafty na pumpách)
select cron.unschedule(jobname) from cron.job where jobname='burza';
select cron.schedule('burza','41 4,6,8,10,12,14,16,18 * * *','select public.market_refresh()');
