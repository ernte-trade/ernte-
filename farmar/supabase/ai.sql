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
-- nafta v nákladoch a zisku = spotrebované litre × cena bez DPH (cena s DPH / 1,23); pevné náklady pomerne k dnešnému dňu aj za celý mesiac
create or replace function public.ai_fleet_kpi() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare m0 timestamptz:=date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava'; c jsonb; km numeric; l numeric; lok numeric; kok numeric; rl numeric; re numeric; n int; d numeric; dz numeric; t numeric; sh numeric; fx numeric; rt numeric; dim int; dd int; rv numeric; rvz numeric; mz numeric; la numeric;
begin
  select coalesce(value,'{}') into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  d:=coalesce((c->>'diesel')::numeric,1.952); dz:=d/1.23; t:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100); fx:=coalesce((c->>'fixed')::numeric,80000); rt:=coalesce((c->>'rate')::numeric,1.5);
  select nullif(value->>to_char(now() at time zone 'Europe/Bratislava','YYYY-MM'),'')::numeric into rvz from fleet_cfg where key='rev';
  select count(*), coalesce(sum(distance),0), coalesce(sum(fuel_consumed) filter (where distance>0),0), coalesce(sum(fuel_consumed),0), coalesce(sum(refuel_l),0), coalesce(sum(refuel_eur),0) into n,km,l,la,rl,re from rides where start_at>=m0;
  rl:=rl+coalesce((select sum(liters) from yard_fuel where kind='vydaj' and day>=(m0 at time zone 'Europe/Bratislava')::date),0);
  select coalesce(sum(vl),0), coalesce(sum(vk),0) into lok,kok from (select sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0) vl, sum(distance) filter (where distance>0 and fuel_consumed>0) vk, sum(distance) vtot from rides where start_at>=m0 group by vehicle_id) v where vtot>=100;
  dim:=extract(day from (date_trunc('month',now() at time zone 'Europe/Bratislava')+interval '1 month - 1 day'))::int; dd:=extract(day from now() at time zone 'Europe/Bratislava')::int;
  rv:=coalesce(rvz,km*rt);
  select nullif(value->>'mzdy_eur','')::numeric into mz from ai_state where key='kpi';
  return jsonb_build_object('obdobie','tento mesiac do dnes','jazd',n,'km',round(km),'nafta_l',round(l),'l_100km_flotila_bez_aut_pod_100km',case when kok>20 then round(lok/kok*100,1) end,
    'natankovane_l',round(rl),'natankovane_karta_eur',round(re),
    'natankovane_poznamka','karta + výdaj z nádrže na dvore','spotreba_vsetkych_jazd_l',round(la),'rozdiel_spotreba_minus_natankovane_l',round(la-rl),'rozdiel_pct',case when la>0 then round((la-rl)/la*100,1) end,'rozdiel_eur_bez_dph',round((la-rl)*dz),
    'cena_nafty_s_dph',d,'cena_nafty_bez_dph',round(dz,3),'nafta_eur_bez_dph',round(l*dz),'nafta_eur_s_dph_len_info',round(l*d),
    'myto_eur_km',t,'myto_podiel_km_pct',sh,'myto_eur',round(km*sh/100*t),
    'nafta_plus_myto_eur_bez_dph',round(l*dz+km*sh/100*t),'eur_na_km_bez_dph',case when km>0 then round((l*dz+km*sh/100*t)/km,3) end,
    'obrat_eur',round(rv),'obrat_zdroj',case when rvz is not null then 'zadaný skutočný obrat (faktúry)' else 'odhad z nastavenej sadzby '||rt||' €/km, nie z faktúr' end,
    'pevne_naklady_mesiac',fx,'pevne_naklady_pomerne_k_dnu',round(fx*dd/dim),'dni',dd||'/'||dim,
    'mzdy_eur',mz,
    'zisk_do_dnes_pomerne_eur',case when mz is not null then round(rv-l*dz-km*sh/100*t-fx*dd/dim-mz) end,
    'zisk_cely_mesiac_plne_pevne_eur',case when mz is not null then round(rv-l*dz-km*sh/100*t-fx-mz) end,
    'zisk_poznamka',case when mz is null then 'mzdy nezadané – zisk sa nedá spočítať' else 'nafta bez DPH; do dnes = pevné náklady pomerne k dnešnému dňu' end);
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_fleet_kpi() from public, anon, authenticated;

-- rozpis tohto mesiaca po vodičoch: km, l/100, natankované (karta podľa vodiča v čase tankovania + výdaj z dvora), rozdiel nafty, rýchlosť, poklesy paliva
create or replace function public.ai_fleet_drivers() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  return fleet_drv_stats(date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava', now()+interval '1 minute')->'vodici';
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_fleet_drivers() from public, anon, authenticated;

-- denný súhrn pre ranný a poobedný prehľad (včera + mesiac do dnes)
create or replace function public.ai_digest() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare tz text:='Europe/Bratislava'; td date:=(now() at time zone 'Europe/Bratislava')::date; t0 timestamptz; y0 timestamptz; m0 timestamptz; c jsonb; dz numeric; tl numeric; sh numeric; fx numeric; rt numeric; dim int;
  pk text[]:=fleet_parked(); top jsonb; sp jsonb; dr jsonb; ns jsonb; nr jsonb; zy numeric; zp numeric; kmy numeric; ly numeric; kmp numeric; lp numeric; nal int;
begin
  t0:=td::timestamp at time zone tz; y0:=(td-1)::timestamp at time zone tz; m0:=date_trunc('month', td)::timestamp at time zone tz;
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}'::jsonb);
  dz:=coalesce((c->>'diesel')::numeric,1.952)/1.23; tl:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100); fx:=coalesce((c->>'fixed')::numeric,80000); rt:=coalesce((c->>'rate')::numeric,1.5);
  dim:=extract(day from (date_trunc('month',td-1)+interval '1 month - 1 day'))::int;
  select coalesce(jsonb_agg(x),'[]') into top from (select jsonb_build_object('vodic',v->>'vodic','rozdiel_l',(v->>'rozdiel_l')::numeric,'rozdiel_pct',v->'rozdiel_pct','rozdiel_eur_bez_dph',v->'rozdiel_eur_bez_dph','km',v->'km','poznamka',v->'poznamka') x
      from jsonb_array_elements(fleet_drv_stats(least(m0,y0), now())->'vodici') v where not (v->>'malo_dat')::boolean and (v->>'rozdiel_l')::numeric>0
      order by (v->>'rozdiel_l')::numeric desc limit 3) q;
  select coalesce(jsonb_agg(jsonb_build_object('vodic',drv,'pocet',n,'max_kmh',mx,'auta',au) order by n desc),'[]') into sp from
    (select coalesce(nullif(trim(driver),''),'neznámy vodič') drv, count(*) n, max(max_speed) mx, string_agg(distinct coalesce(plate,vehicle_id),', ') au from rides where start_at>=y0 and start_at<t0 and max_speed>90 group by 1) q;
  select coalesce(jsonb_agg(jsonb_build_object('auto',plate,'vodic',driver,'litre',liters,'kedy',to_char(at at time zone tz,'DD.MM. HH24:MI'),'miesto',place) order by at),'[]') into dr
    from fleet_events where kind='fuel_drop' and at>=y0 and at<t0;
  select coalesce(jsonb_agg(jsonb_build_object('auto',coalesce(plate,name,id),'hodin',case when gps_at is null then null else floor(extract(epoch from now()-gps_at)/3600) end) order by gps_at nulls first),'[]') into ns
    from cmd_vehicles where (gps_at is null or gps_at<now()-interval '24 hours') and not (id = any(pk));
  select coalesce(jsonb_agg(coalesce(plate,name,id) order by plate),'[]') into nr
    from cmd_vehicles v where not (id = any(pk)) and not exists(select 1 from rides r where r.vehicle_id=v.id and r.start_at>=y0 and r.start_at<t0 and coalesce(r.distance,0)>0);
  select coalesce(sum(distance),0), coalesce(sum(fuel_consumed),0) into kmy, ly from rides where start_at>=y0 and start_at<t0;
  select coalesce(sum(distance),0), coalesce(sum(fuel_consumed),0) into kmp, lp from rides where start_at>=y0-interval '1 day' and start_at<y0;
  zy:=kmy*rt-ly*dz-kmy*sh/100*tl-fx/dim; zp:=kmp*rt-lp*dz-kmp*sh/100*tl-fx/dim;
  nal:=(select count(*) from jsonb_array_elements(top) x where (x->>'rozdiel_pct')::numeric>15)+jsonb_array_length(sp)+jsonb_array_length(dr)+jsonb_array_length(ns)+jsonb_array_length(nr);
  return jsonb_build_object('vcera',to_char(td-1,'DD.MM.YYYY'),'nalezov',nal,
    'top3_rozdiel_nafty_mesiac_do_dnes',top,'prekrocenia_90_vcera_po_vodicoch',sp,'poklesy_paliva_pri_stati_vcera',dr,
    'auta_bez_signalu_nad_24h',ns,'auta_bez_jazdy_vcera',nr,'odstavene_auta',to_jsonb(pk),
    'zisk_vcera_bez_miezd_eur',round(zy),'zisk_predvcerom_bez_miezd_eur',round(zp),'zmena_zisku_od_vcera_eur',round(zy-zp),
    'zisk_poznamka','obrat = km × '||rt||' €/km (odhad), nafta bez DPH, mýto, pevné náklady 1/'||dim||' mesiaca na deň, bez miezd',
    'kpi_mesiac',ai_fleet_kpi());
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_digest() from public, anon, authenticated;

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
   'miesta_ntfy', ai_part('select count(*) from places where notify'),
   'miesta_problemy', ai_part($q$select jsonb_build_object('spolu',count(*),'bez_problemu',count(*) filter (where pr=''),'s_problemom',count(*) filter (where pr<>''),
       'bez_suradnic',count(*) filter (where pr like '%S%'),'mimo_oblasti',count(*) filter (where pr like '%O%'),'bez_nazvu',count(*) filter (where pr like '%N%'),
       'nazov_bez_mesta',count(*) filter (where pr like '%M%'),'neplatny_typ',count(*) filter (where pr like '%T%'),'duplicitne',count(*) filter (where pr like '%D%'))
     from (select p.*, concat(case when p.lat is null or p.lon is null or (p.lat=0 and p.lon=0) then 'S' end,
        case when p.lat is not null and p.lon is not null and not (p.lat=0 and p.lon=0) and (p.lat not between 45.5 and 51 or p.lon not between 15 and 24.5) then 'O' end,
        case when nullif(trim(p.name),'') is null then 'N' end, case when p.name ~* '^\s*slovnaft\s*$' then 'M' end,
        case when p.kind is null or p.kind not in ('yard','buyer','fuel','other') then 'T' end,
        case when exists(select 1 from places b where b.id<p.id and b.kind=p.kind and abs(b.lat-p.lat)<0.0005 and abs(b.lon-p.lon)<0.0007) then 'D' end) pr from places p) x$q$),
   'ntfy_tema_nastavena', ai_part($q$select coalesce((select value->>'topic' from fleet_cfg where key='notify'),'') <> ''$q$),
   'funkcie', ai_part($q$select jsonb_build_object('yard_check',to_regprocedure('public.yard_check()') is not null,'place_check',to_regprocedure('public.place_check()') is not null,'stop_check',to_regprocedure('public.stop_check()') is not null,'fuel_check',to_regprocedure('public.fuel_check()') is not null,'osm_sync',to_regprocedure('public.osm_sync()') is not null)$q$),
   'cron_ulohy', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('uloha',jobname,'zapnuta',active,'rozvrh',schedule)),'[]') from cron.job$q$),
   'cron_posledne_behy', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select j.jobname uloha, d.status, left(d.return_message,120) sprava, to_char(d.start_time at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from cron.job_run_details d join cron.job j on j.jobid=d.jobid where d.start_time>now()-interval '15 minutes' order by d.start_time desc limit 12) x$q$),
   'cron_chyby_24h', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select j.jobname uloha, count(*) chyb, max(left(d.return_message,160)) posledna from cron.job_run_details d join cron.job j on j.jobid=d.jobid where d.status<>'succeeded' and d.start_time>now()-interval '24 hours' group by j.jobname) x$q$),
   'commander_posledne', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, to_char(max(at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') posledne, (array_agg(code order by at desc) filter (where done))[1] kod from cmd_log where kind<>'backfill' group by kind) x$q$),
   'backfill', ai_part($q$select jsonb_build_object('dni_ok',count(*) filter (where code=200),'caka',count(*) filter (where code=-1),'bez_kodu_stare',count(*) filter (where code is null),'chyby',count(*) filter (where code not in (200,-1)),
       'posledny_den',max(url) filter (where code=200),'chyba_teraz',(select msg from check_err where fn in ('cmd_rides_bf','cmd_rides') and msg is not null order by at desc limit 1)) from cmd_log where kind='backfill'$q$),
   'sync_polohy', ai_part($q$select jsonb_build_object('zapis_posledny',to_char(max(updated_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'min_od_zapisu',floor(extract(epoch from now()-max(updated_at))/60),
       'najnovsia_gps',to_char(max(gps_at) at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'min_od_gps',floor(extract(epoch from now()-max(gps_at))/60),
       'auta_v_jazde_alebo_mimo_dvora',count(*) filter (where not (id = any(fleet_parked())) and (coalesce(speed,0)>3 or coalesce(ign,0)=1 or not coalesce(in_yard,false))),
       'posledna_davka',(select n||' polôh'||coalesce(' · '||msg,'')||' · '||to_char(ok_at at time zone 'Europe/Bratislava','HH24:MI') from check_err where fn='cmd_pos'),
       'vysvetlenie',case when max(updated_at)<now()-interval '30 minutes' then 'sync nezapisuje – chyba synchronizácie' when max(gps_at)<now()-interval '30 minutes' then 'sync zapisuje, ale Commander nemá novšiu GPS polohu (autá stoja / jednotky spia)' else 'v poriadku' end) from cmd_vehicles$q$),
   'odstavene_auta', ai_part($q$select coalesce(jsonb_agg(coalesce(plate,name,id)),'[]') from cmd_vehicles where id = any(fleet_parked())$q$),
   'nadrz_dvor', ai_part('select yard_balance()'),
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
   'nadrz_na_dvore', ai_part('select yard_balance()'),
   'denny_suhrn', ai_digest(),
   'auta_teraz', ai_part($q$select jsonb_build_object('spolu',count(*),'ide',count(*) filter (where speed>3 and gps_at>now()-interval '20 min')) from cmd_vehicles$q$),
   'udalosti_7_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '7 days' group by kind) x$q$),
   'posledne_alarmy_nafta', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, plate, driver, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where at>now()-interval '7 days' and kind in ('fuel_drop','refuel_gap') order by at desc limit 10) x$q$),
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
Úlohy: 1) kontroluj obchody, náklady, zisky a straty, flotilu (spotreba, krádeže nafty, prestoje) a upozorni čo je zlé a čo dobré; 2) sleduj trhy (MATIF repka/pšenica/kukurica, CBOT sója, slovenské a maďarské výkupné ceny, nafta) – na aktuálne ceny VŽDY použi web_search a uveď zdroj a dátum; 3) raď konkrétne čo má robiť (kúpiť/predať/držať, za akú cenu, komu volať, čo skontrolovať).
Nikdy si nevymýšľaj čísla – ak údaj chýba, napíš „nezadané“ alebo „málo dát“, nikdy nie 0. Zisk = obrat − (nafta + mýto + pevné náklady + mzdy); ak chýbajú mzdy (kpi_z_aplikacie.mzdy_eur je null), napíš že zisk sa nedá presne spočítať. Autá s menej ako 100 km za mesiac majú „málo dát“ – nerátaj ich do priemernej spotreby ani alarmov. Spotrebu konkrétneho vodiča ber z flotila_po_vodicoch (vodič → autá, km, litre, l/100 km, natankované litre = karta priradená vodičovi, ktorý bol na aute v čase tankovania + výdaj z nádrže na dvore, rozdiel nafty l/%/€ bez DPH, prekrocenia_90, max_rychlost, poklesy_paliva); vodič s menej ako 100 km za mesiac má „málo dát“ – jeho spotrebu nehodnoť; pri poznámke „viac vodičov na aute“ je rozdiel orientačný. Nafta v nákladoch a zisku = spotrebované litre × cena BEZ DPH (cena s DPH / 1,23) – pri sume vždy napíš „bez DPH“. Pevné náklady nedokončeného mesiaca sú pomerne k dnešnému dňu (zisk „do dnes“), za celý mesiac plné. Obrat je odhad z nastavenej sadzby €/km, nie z faktúr, kým nie je zadaný skutočný obrat (obrat_zdroj). Pri technických problémoch (chýbajúce udalosti, alarmy, jazdy) použi sekciu diagnostika a povedz presne, čo je vypnuté alebo nenastavené.
PLNÉ OPRÁVNENIE: majiteľ ti dal plný prístup ku všetkému v tejto aplikácii (kód aj databáza). Úpravy aj zmeny databázy sa robia a nasadzujú automaticky – nikdy nežiadaj majiteľa, aby spúšťal SQL alebo niečo kopíroval. Ak vidíš chybu alebo chýbajúce dáta (aj v diagnostike), sám navrhni opravu ako ÚLOHU.
ÚPRAVY APLIKÁCIE: ak majiteľ chce niečo v aplikácii opraviť, pridať alebo zmeniť, NEROB to v texte – na koniec odpovede pridaj samostatný riadok presne v tvare
ÚLOHA: <presný a úplný popis zmeny po slovensky, aby ju programátor vedel spraviť bez ďalších otázok>
(jeden riadok na jednu zmenu). Povedz mu, že úprava bude hotová spravidla do hodiny a zhrnutie uvidí v Dashboarde. Aplikácia: ERNTE Trade & Logistic (záložky Požiadavky, Cenník, Doprava, Flotila, Obchody, Farmári, Počasie, Tím; Flotila má Dashboard, Prevádzka a náklady, Alarmy, Mapa, Pohyby, Vozidlá, Vodiči a mzdy, Miesta, Nastavenia).
Formát (Markdown): krátke odseky, nadpisy „## “, odrážky „- “, číslované zoznamy, tučné **takto**, tabuľky | stĺpec | stĺpec |.
DOKUMENTY A VÝSTUPY: vieš pripraviť čokoľvek – zmluvy, kúpne a prepravné zmluvy, cenové ponuky, objednávky, listy, e-maily, upomienky, reporty, tabuľky, plány, preklady. Píš ich ako hotový dokument s nadpisom (prvý riadok „## Názov“), dátumom a údajmi firmy z prehľadu. Aplikácia pod každou tvojou odpoveďou automaticky ukáže tlačidlá Kopírovať, Uložiť PDF, Tlačiť, Word, Excel (keď sú v odpovedi tabuľky), E-mail a Zdieľať – preto nikdy nehovor, že PDF alebo súbor nevieš urobiť. Pri dokumente napíš do odpovede iba samotný dokument; pokyny typu „ťukni Uložiť PDF“ daj najviac ako jednu krátku vetu úplne na koniec za oddeľovač ---, nikdy dovnútra dokumentu.
ARCHÍV DOKUMENTOV: každý hotový dokument (upozornenie vodičovi, výzva na vysvetlenie, zmluva, ponuka, list, upomienka) zabaľ presne takto, aby sa sám uložil do archívu Dokumenty s PDF:
[[DOKUMENT|typ|meno vodiča alebo partnera|Názov dokumentu]]
## Názov dokumentu
…celý text…
[[KONIEC]]
typ je jedno z: upozornenie, vyzva, zmluva, ponuka, list, iny. Ak nejde o vodiča, nechaj meno prázdne (napr. [[DOKUMENT|zmluva||Kúpna zmluva repka]]). Pred blokom napíš max 1 vetu. Upozornenia vodičom píš vecne a slušne: fakty z dát (km, litre, %, dátumy), žiadosť o vysvetlenie a doklady s termínom, ďalší postup – nikoho priamo neobviňuj z krádeže, kým to nepotvrdia doklady (dáta o tankovaní môžu byť neúplné). Na konci: Prevzal dňa ____ Podpis vodiča ____. Pozri dokumenty_archiv, nevytváraj duplicitu k tomu istému problému v tom istom mesiaci.
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
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',8000,
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
    'Sprav prehľad pre majiteľa na Dashboard: 1) TRHY dnes – MATIF repka, pšenica, kukurica, CBOT sója (vyhľadaj aktuálne ceny a trend) a porovnaj s naším cenníkom; 2) OBCHODY – čo je otvorené, riziká, marža; 3) FLOTILA – km, spotreba, náklady, zisk/strata, alarmy, podozrivé veci; 4) ČO ROBIŤ DNES – max 5 konkrétnych krokov; 5) UPOZORNENIA VODIČOM – ak niektorý vodič má nový závažný problém (rozdiel nafty nad 15 %, pokles paliva pri státí, opakovaná rýchlosť nad 90 km/h, spotreba výrazne nad priemerom) a v dokumenty_archiv ešte nemá upozornenie k tomu istému problému za tento mesiac, priprav mu písomné upozornenie ako DOKUMENT. Začni jednou vetou s najdôležitejšou vecou. Max ~250 slov.')));
  insert into ai_msgs(kind,role,content) values('report','user',coalesce(what,'Prehľad'));
  insert into ai_msgs(kind,role,status,convo,req_id) values('report','assistant','wait',cv,ai_post(cv)) returning id into aid;
  return aid;
end $$;
grant execute on function public.ai_report(text) to authenticated;

-- ranný (5:00) a poobedný (13:00, po–pi) súhrn flotily: ak nie sú nálezy, jedna veta „bez nálezov“
create or replace function public.ai_report_daily() returns bigint language plpgsql security definer set search_path=public as $$
declare dg jsonb:=ai_digest(); cv jsonb; aid bigint;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if dg ? 'chyba' then return ai_report(); end if;
  if coalesce((dg->>'nalezov')::int,0)=0 then
    insert into ai_msgs(kind,role,content) values('report','user','Súhrn flotily');
    insert into ai_msgs(kind,role,content) values('report','assistant','✅ **Flotila '||(dg->>'vcera')||': bez nálezov.** Zmena zisku od včera (bez miezd): '||
      case when (dg->>'zmena_zisku_od_vcera_eur')::numeric>=0 then '+' else '' end||(dg->>'zmena_zisku_od_vcera_eur')||' €.') returning id into aid;
    return aid;
  end if;
  cv:=jsonb_build_array(jsonb_build_object('role','user','content',
    'Napíš STRUČNÝ SÚHRN FLOTILY pre majiteľa na Dashboard (max ~170 slov) iba z dát DENNY_SUHRN nižšie, nič nevymýšľaj, trhy nehľadaj. Prvá veta = najdôležitejší nález. Potom krátke odrážky v tomto poradí (sekciu bez nálezu vynechaj): '||
    '1) 3 vodiči s najväčším rozdielom nafty za mesiac do dnes – l, %, € bez DPH (pri poznámke „viac vodičov na aute“ dopíš „orientačne“); 2) nové prekročenia 90 km/h včera po vodičoch (počet, max); 3) nové poklesy paliva pri státí včera (auto, vodič, l, kedy); '||
    '4) autá bez signálu nad 24 h (hodiny); 5) autá bez jazdy včera; 6) zmena zisku od včera (bez miezd, €). Na koniec max 2 konkrétne kroky na dnes. '||
    'Ak niektorý vodič má rozdiel nafty nad 15 % alebo pokles paliva pri státí a v dokumenty_archiv ešte nemá upozornenie k tomu istému problému za tento mesiac, priprav mu upozornenie ako DOKUMENT.'||E'\n\nDENNY_SUHRN:\n'||dg::text));
  insert into ai_msgs(kind,role,content) values('report','user','Súhrn flotily');
  insert into ai_msgs(kind,role,status,convo,req_id) values('report','assistant','wait',cv,ai_post(cv)) returning id into aid;
  return aid;
end $$;
revoke all on function public.ai_report_daily() from public, anon, authenticated;

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

-- automaticky: každú minútu spracovanie, súhrn flotily ráno 5:00 a poobede 13:00 po–pi (čas servera UTC)
select cron.unschedule(jobname) from cron.job where jobname in ('ai-tick','ai-rano','ai-poobede');
select cron.schedule('ai-tick','* * * * *','select public.ai_tick()');
select cron.schedule('ai-rano','0 5 * * *','select public.ai_report_daily()');
select cron.schedule('ai-poobede','0 13 * * 1-5','select public.ai_report_daily()');
