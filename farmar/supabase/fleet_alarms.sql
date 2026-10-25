-- ERNTE – udalosti z jázd (rýchlosť nad 90, pokles paliva pri státí, tankovanie vs. nádrž, odchod po státí, príchod/odchod na miesta),
-- výdaj nafty z vlastnej nádrže na dvore, hodnotenie vodičov pre AI, ranný/poobedný súhrn flotily.
-- Spúšťa sa automaticky (farmar/supabase/auto). Idempotentné.

-- ===== 1) udalosti: zdroj (jazda) + rýchlosť + čas zápisu =====
alter table fleet_events add column if not exists src text;
alter table fleet_events add column if not exists speed int;
alter table fleet_events add column if not exists created_at timestamptz;
update fleet_events set created_at=at where created_at is null;
alter table fleet_events alter column created_at set default now();
create unique index if not exists fev_src on fleet_events(kind, src) where src is not null;
create index if not exists fev_veh on fleet_events(vehicle_id, at);
create index if not exists fev_kind_at on fleet_events(kind, at);

create or replace function public.geo_m(la1 numeric, lo1 numeric, la2 numeric, lo2 numeric) returns numeric language sql immutable as $$
  select (6371000*2*asin(least(1,sqrt(power(sin(radians(la2-la1)/2),2)+cos(radians(la1))*cos(radians(la2))*power(sin(radians(lo2-lo1)/2),2)))))::numeric $$;

-- udalosti odvodené z jázd Commandera (dopĺňa živé kontroly; nič nezdvojí)
create or replace function public.ride_events_check(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; n int; st jsonb; mn int; fc jsonb; gp numeric;
begin
  -- a) rýchlosť nad 90 km/h – každá jazda
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,lat,lon,speed,src)
  select vehicle_id,plate,'speed',start_at,nullif(trim(driver),''),left(coalesce(start_addr,'?')||' → '||coalesce(stop_addr,'?'),200),'speed',lat_stop,lon_stop,max_speed,ride_id
    from rides where start_at>=since and max_speed>90
  on conflict (kind,src) where src is not null do update set speed=excluded.speed, driver=excluded.driver, place=excluded.place
    where fleet_events.speed is distinct from excluded.speed or fleet_events.driver is distinct from excluded.driver;
  get diagnostics n=row_count; k:=k+n;

  -- b) pokles paliva počas státia (medzi dvoma jazdami bez tankovania, 25+ l)
  with s as (select r.*, lag(r.fuel_stop) over w pfs, lag(r.stop_at) over w pst, lag(r.driver) over w pdrv,
                    lag(r.lat_stop) over w pla, lag(r.lon_stop) over w plo, lag(r.stop_addr) over w pad
               from rides r where r.start_at>=since-interval '3 days' window w as (partition by r.vehicle_id order by r.start_at))
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,liters,minutes,lat,lon,src)
  select s.vehicle_id,s.plate,'fuel_drop',s.start_at,coalesce(nullif(trim(s.pdrv),''),nullif(trim(s.driver),'')),s.pad,'stop',round(s.pfs-s.fuel_start),
         greatest(0,floor(extract(epoch from s.start_at-s.pst)/60))::int,s.pla,s.plo,s.ride_id
    from s where s.start_at>=since and s.pfs is not null and s.fuel_start is not null and s.pfs-s.fuel_start>=25 and coalesce(s.refuel_l,0)=0
     and not exists(select 1 from fleet_events e where e.vehicle_id=s.vehicle_id and e.kind='fuel_drop' and e.src is null
                      and e.at between coalesce(s.pst,s.start_at)-interval '10 minutes' and s.start_at+interval '15 minutes')
  on conflict do nothing;
  get diagnostics n=row_count; k:=k+n;

  -- c) tankovanie nesedí s nárastom v nádrži (jazdy, ktoré živá kontrola nespracovala)
  select value into fc from fleet_cfg where key='fuel'; gp:=coalesce((fc->>'gap')::numeric,30);
  insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,at,src)
  select r.vehicle_id,r.plate,'refuel_gap',nullif(trim(r.driver),''),r.stop_addr,'fuel',round(r.fuel_start+r.refuel_l-coalesce(r.fuel_consumed,0)-r.fuel_stop),r.stop_at,r.ride_id
    from rides r where r.start_at>=since and r.refuel_l>0 and r.fuel_start is not null and r.fuel_stop is not null and r.stop_at<now()-interval '6 hours'
     and r.fuel_start+r.refuel_l-coalesce(r.fuel_consumed,0)-r.fuel_stop >= greatest(gp, r.refuel_l*0.08)
     and not exists(select 1 from fleet_events e where e.vehicle_id=r.vehicle_id and e.kind='refuel_gap' and e.src is null and e.at between r.stop_at-interval '5 minutes' and r.stop_at+interval '5 minutes')
  on conflict do nothing;
  get diagnostics n=row_count; k:=k+n;

  -- d) odchod po státí (ako stop_check) – medzera medzi jazdami aspoň X min
  select value into st from fleet_cfg where key='stop';
  if st is null or coalesce((st->>'on')::boolean,true) then
    mn:=coalesce((st->>'min')::int,30);
    with s as (select r.*, lag(r.stop_at) over w pst, lag(r.lat_stop) over w pla, lag(r.lon_stop) over w plo, lag(r.stop_addr) over w pad
                 from rides r where r.start_at>=since-interval '3 days' window w as (partition by r.vehicle_id order by r.start_at))
    insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,minutes,lat,lon,src)
    select s.vehicle_id,s.plate,'depart',s.start_at,nullif(trim(s.driver),''),
           coalesce((select p.name from places p where s.pla is not null and p.lat between s.pla-0.03 and s.pla+0.03 and p.lon between s.plo-0.045 and s.plo+0.045
                       and geo_m(s.pla,s.plo,p.lat,p.lon)<=greatest(p.r,300) order by power(p.lat-s.pla,2)+power(p.lon-s.plo,2) limit 1), s.pad),
           'stop',floor(extract(epoch from s.start_at-s.pst)/60)::int,s.pla,s.plo,s.ride_id
      from s where s.start_at>=since and s.pst is not null and s.start_at-s.pst>=make_interval(mins=>mn) and coalesce(s.distance,0)>=0.3
       and not exists(select 1 from fleet_events e where e.vehicle_id=s.vehicle_id and e.kind='depart' and e.src is null and e.at between s.start_at-interval '20 minutes' and s.start_at+interval '20 minutes')
    on conflict do nothing;
    get diagnostics n=row_count; k:=k+n;
  end if;

  -- e) príchod na miesto (dvor, odberateľ, čerpačka) a odchod z dvora/odberateľa (ako place_check)
  with s as (select r.*, lead(r.start_at) over w nst from rides r where r.start_at>=since-interval '1 day' window w as (partition by r.vehicle_id order by r.start_at)),
  m as (select s.vehicle_id,s.plate,s.driver,s.stop_at,s.nst,s.lat_stop,s.lon_stop,s.ride_id,p.name pname,p.kind pkind
          from s join lateral (select p.* from places p where p.lat between s.lat_stop-0.03 and s.lat_stop+0.03 and p.lon between s.lon_stop-0.045 and s.lon_stop+0.045
                                 and geo_m(s.lat_stop,s.lon_stop,p.lat,p.lon)<=greatest(p.r,100) order by power(p.lat-s.lat_stop,2)+power(p.lon-s.lon_stop,2) limit 1) p on true
         where s.stop_at>=since and s.lat_stop is not null and s.stop_at<coalesce(s.nst,now()-interval '15 minutes'))
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,lat,lon,src)
  select m.vehicle_id,m.plate,'in',m.stop_at,nullif(trim(m.driver),''),m.pname,m.pkind,m.lat_stop,m.lon_stop,m.ride_id from m
   where not exists(select 1 from fleet_events e where e.vehicle_id=m.vehicle_id and e.kind in ('in','yard_in') and e.src is null and e.at between m.stop_at-interval '30 minutes' and m.stop_at+interval '30 minutes')
  union all
  select m.vehicle_id,m.plate,'out',m.nst,nullif(trim(m.driver),''),m.pname,m.pkind,m.lat_stop,m.lon_stop,m.ride_id from m
   where m.pkind in ('yard','buyer') and m.nst is not null
     and not exists(select 1 from fleet_events e where e.vehicle_id=m.vehicle_id and e.kind in ('out','yard_out') and e.src is null and e.at between m.nst-interval '30 minutes' and m.nst+interval '30 minutes')
  on conflict do nothing;
  get diagnostics n=row_count; k:=k+n;
  return k;
end $$;
revoke all on function public.ride_events_check(timestamptz) from public, anon, authenticated;
create or replace function public.ride_check() returns int language sql security definer set search_path=public as $$ select public.ride_events_check(now()-interval '2 days') $$;
revoke all on function public.ride_check() from public, anon, authenticated;

-- pravidelná kontrola (každé 2 min s Commanderom) – teraz aj udalosti z jázd
create or replace function public.yard_check() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0;
begin
  perform check_run('osm_sync');
  k:=k+check_run('place_check');
  k:=k+check_run('stop_check');
  k:=k+check_run('fuel_check');
  k:=k+check_run('ride_check');
  return k;
end $$;
revoke all on function public.yard_check() from public, anon, authenticated;

-- ===== 2) vlastná nádrž na dvore: nákup a výdaj nafty =====
create table if not exists yard_fuel(id bigserial primary key, day date not null default current_date,
  kind text not null default 'vydaj' check (kind in ('vydaj','nakup')), plate text, driver text,
  liters numeric not null check (liters>0), tank_after numeric, note text, created_by text, created_at timestamptz not null default now());
create index if not exists yard_fuel_day on yard_fuel(day desc, id desc);
alter table yard_fuel enable row level security;
drop policy if exists yfuel_rw on yard_fuel; create policy yfuel_rw on yard_fuel for all using (is_fleet()) with check (is_fleet());

-- ===== 3) vodiči pre AI poradcu: rozdiel nafty, rýchlosť, poklesy paliva, náklad na km =====
create or replace function public.ai_fleet_drivers() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare m0 timestamptz:=date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava'; r jsonb; c jsonb; dz numeric; t numeric; sh numeric;
begin
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  dz:=coalesce((c->>'diesel')::numeric,1.952); t:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100);
  with p as (select coalesce(nullif(trim(driver),''),'neznámy vodič') vodic, coalesce(nullif(trim(plate),''),vehicle_id,'?') auto,
      coalesce(sum(distance),0) km, coalesce(sum(fuel_consumed),0) l,
      coalesce(sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0),0) lok, coalesce(sum(distance) filter (where distance>0 and fuel_consumed>0),0) kok,
      coalesce(sum(refuel_l),0) ref, count(*) filter (where max_speed>90) sp, max(max_speed) mx
    from rides where start_at>=m0 group by 1,2),
  y as (select lower(trim(driver)) dn, sum(liters) yl from yard_fuel where kind='vydaj' and day>=(m0 at time zone 'Europe/Bratislava')::date and driver is not null group by 1),
  f as (select coalesce(nullif(trim(driver),''),'neznámy vodič') vodic, count(*) n from fleet_events where kind='fuel_drop' and at>=m0 group by 1),
  d as (select p.vodic, sum(km) km, sum(l) l, sum(lok) lok, sum(kok) kok, sum(ref) ref, sum(sp) sp, max(mx) mx,
      jsonb_agg(jsonb_build_object('auto',auto,'km',round(km),'litre',round(l),
        'l_100km',case when km>=100 and kok>20 then to_jsonb(round(lok/kok*100,1)) else '"málo dát"'::jsonb end,'natankovane_l',round(ref),'prekrocenia_90',sp) order by km desc) auta
    from p group by p.vodic),
  z as (select d.*, coalesce(y.yl,0) yl, coalesce(f.n,0) dn, d.l-d.ref-coalesce(y.yl,0) gap from d left join y on y.dn=lower(d.vodic) left join f on f.vodic=d.vodic)
  select coalesce(jsonb_agg(jsonb_build_object('vodic',vodic,'km',round(km),'litre',round(l),
      'l_100km',case when km>=100 and kok>20 then to_jsonb(round(lok/kok*100,1)) else '"málo dát"'::jsonb end,
      'malo_dat',km<100,'natankovane_l',round(ref),'z_nadrze_dvor_l',round(yl),
      'rozdiel_nafty_l',round(gap),'rozdiel_nafty_pct',case when l>0 then round(gap/l*100,1) end,'rozdiel_nafty_eur',round(gap*dz),
      'prekrocenia_90_kmh',sp,'max_rychlost',mx,'poklesy_paliva_pri_stati',dn,
      'naklad_nafta_myto_eur_km',case when km>0 then round((l*dz/1.23+km*sh/100*t)/km,3) end,
      'auta',auta) order by (km<100), gap desc),'[]') into r from z;
  return r;
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_fleet_drivers() from public, anon, authenticated;

-- ===== 4) ranný (5:00) a poobedný (13:00) súhrn flotily =====
create table if not exists fleet_daily(day date primary key, zisk numeric, data jsonb, updated_at timestamptz default now());
alter table fleet_daily enable row level security;
drop policy if exists fdaily_own on fleet_daily; create policy fdaily_own on fleet_daily for select using (is_owner());

create or replace function public.ai_brief() returns jsonb language plpgsql security definer set search_path=public as $$
declare tz text:='Europe/Bratislava'; d0 timestamptz; d1 timestamptz; m0 timestamptz; md date; c jsonb; dz numeric; pk jsonb; kp jsonb; ks jsonb; last timestamptz;
  rev numeric; cost numeric; mz numeric; z numeric; zp record; res jsonb; td date;
begin
  td:=(now() at time zone tz)::date;
  d1:=td::timestamp at time zone tz; d0:=(td-1)::timestamp at time zone tz; m0:=date_trunc('month',now() at time zone tz) at time zone tz; md:=(m0 at time zone tz)::date;
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}'); dz:=coalesce((c->>'diesel')::numeric,1.952);
  select coalesce(value->'ids','[]') into pk from fleet_cfg where key='parked'; pk:=coalesce(pk,'[]');
  select (value->>'at')::timestamptz into last from ai_state where key='brief_last';
  last:=least(coalesce(last,d0),now()-interval '1 hour'); if last<d0-interval '2 days' then last:=d0; end if;
  -- zisk (odhad) a zmena od včera
  kp:=ai_fleet_kpi();
  rev:=case when (c->>'revMon')=to_char(td,'YYYY-MM') and coalesce((c->>'revenue')::numeric,0)>0 then (c->>'revenue')::numeric else (kp->>'obrat_eur')::numeric end;
  select value into ks from ai_state where key='kpi' and updated_at>=m0 and value->>'obdobie'='m';
  mz:=nullif((ks->>'mzdy_eur')::numeric,0);
  cost:=coalesce((kp->>'nafta_eur_bez_dph')::numeric,0)+coalesce((kp->>'myto_eur')::numeric,0)+coalesce((kp->>'pevne_naklady_pomerne_k_dnu')::numeric,0)+coalesce(mz,0);
  z:=round(rev-cost);
  insert into fleet_daily(day,zisk,data,updated_at) values(td,z,jsonb_build_object('obrat',round(rev),'naklady',round(cost),'mzdy',mz),now())
    on conflict(day) do update set zisk=excluded.zisk, data=excluded.data, updated_at=now();
  select * into zp from fleet_daily where day<td order by day desc limit 1;
  res:=jsonb_build_object(
   'vcera', to_char(td-1,'DD.MM.YYYY'), 'nove_od', to_char(last at time zone tz,'DD.MM. HH24:MI'),
   'vodici_najvacsi_rozdiel_nafty_mesiac', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select x->>'vodic' vodic, (x->>'km')::numeric km, (x->>'rozdiel_nafty_l')::numeric l, (x->>'rozdiel_nafty_pct')::numeric pct, (x->>'rozdiel_nafty_eur')::numeric eur from jsonb_array_elements(ai_fleet_drivers()) x where not (x->>'malo_dat')::boolean order by (x->>'rozdiel_nafty_l')::numeric desc nulls last limit 3) x$q$),
   'vodici_najvacsi_rozdiel_nafty_vcera', (select coalesce(jsonb_agg(x),'[]') from (
       select vodic, round(km) km, round(l-ref) l, case when l>0 then round((l-ref)/l*100,1) end pct, round((l-ref)*dz) eur from (
         select q0.vodic, q0.km, q0.l, q0.ref+coalesce((select sum(liters) from yard_fuel y where y.kind='vydaj' and y.day=td-1 and lower(trim(y.driver))=lower(q0.vodic)),0) ref from (
           select coalesce(nullif(trim(driver),''),'neznámy vodič') vodic, coalesce(sum(distance),0) km, coalesce(sum(fuel_consumed),0) l, coalesce(sum(refuel_l),0) ref
             from rides r where start_at>=d0 and start_at<d1 group by 1) q0) q where l>0 order by l-ref desc limit 3) x),
   'nove_prekrocenia_90_po_vodicoch', (select coalesce(jsonb_agg(x),'[]') from (select coalesce(driver,'neznámy vodič') vodic, count(*) pocet, max(speed) max_kmh, string_agg(distinct plate,', ') auta
       from fleet_events where kind='speed' and created_at>last group by 1 order by 2 desc) x),
   'nove_poklesy_paliva_pri_stati', (select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters litre, place miesto, to_char(at at time zone tz,'DD.MM. HH24:MI') kedy
       from fleet_events where kind='fuel_drop' and created_at>last order by at desc limit 15) x),
   'nove_tankovania_nesedia', (select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters litre, to_char(at at time zone tz,'DD.MM. HH24:MI') kedy
       from fleet_events where kind='refuel_gap' and created_at>last order by at desc limit 10) x),
   'auta_bez_signalu_nad_24h', (select coalesce(jsonb_agg(x),'[]') from (select coalesce(plate,name,id) auto, case when gps_at is null then null else floor(extract(epoch from now()-gps_at)/3600) end hodin
       from cmd_vehicles v where (gps_at is null or gps_at<now()-interval '24 hours') and not pk ? v.id order by gps_at nulls first) x),
   'auta_bez_jazdy_vcera', (select coalesce(jsonb_agg(coalesce(plate,name,id)),'[]') from cmd_vehicles v where not pk ? v.id
       and not exists(select 1 from rides r where r.vehicle_id=v.id and r.start_at>=d0 and r.start_at<d1)),
   'auta_bez_jazdy_cely_mesiac', (select coalesce(jsonb_agg(coalesce(plate,name,id)),'[]') from cmd_vehicles v where not pk ? v.id
       and not exists(select 1 from rides r where r.vehicle_id=v.id and r.start_at>=m0)),
   'odstavene_auta', (select coalesce(jsonb_agg(coalesce(plate,name,id)),'[]') from cmd_vehicles v where pk ? v.id),
   'zisk_mesiac_odhad_eur', z, 'zisk_vcera_eur', zp.zisk, 'zmena_zisku_od_vcera_eur', case when zp.zisk is not null then z-zp.zisk end,
   'zisk_poznamka', case when mz is null then 'mzdy nezadané – zisk je bez miezd, skutočná strata je väčšia' else 'vrátane miezd (odhad z aplikácie)' end
     ||case when (c->>'revMon')=to_char(td,'YYYY-MM') and coalesce((c->>'revenue')::numeric,0)>0 then '; obrat zo zadaného skutočného obratu' else '; obrat je odhad zo sadzby €/km, nie z faktúr' end);
  return res;
end $$;
revoke all on function public.ai_brief() from public, anon, authenticated;

create or replace function public.ai_brief_report() returns bigint language plpgsql security definer set search_path=public as $$
declare b jsonb; cv jsonb; aid bigint;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  b:=ai_brief();
  cv:=jsonb_build_array(jsonb_build_object('role','user','content',
    'Napíš STRUČNÝ súhrn flotily pre majiteľa iba z dát v sekcii SÚHRN FLOTILY (JSON) – bez trhov a bez web_search. Obdobie: včerajšok ('||(b->>'vcera')||') a mesiac do dnes; „nové“ = od '||(b->>'nove_od')||'. '||
    'Iba body, kde je nález, v tomto poradí: 1) 3 vodiči s najväčším rozdielom nafty (l, %, €) – mesiac aj včera; 2) nové prekročenia rýchlosti nad 90 km/h po vodičoch (počet, max); 3) nové poklesy paliva pri státí (auto, vodič, litre, kedy); 4) autá bez signálu nad 24 h (hodiny); 5) autá bez jazdy včera; 6) zmena zisku od včera v € (pri zisku uveď zisk_poznamka). '||
    'V norme je: rozdiel nafty do 15 % (alebo vodič pod 100 km), žiadne nové prekročenia, poklesy, autá bez signálu ani bez jazdy. Ak je všetko v norme, napíš iba jednu vetu: „Flotila: bez nálezov.“ '||
    'Max 120 slov, odrážky, ŠPZ a mená **tučne**. Nepripravuj dokumenty.'));
  insert into ai_msgs(kind,role,content) values('report','user','Súhrn flotily · '||to_char(now() at time zone 'Europe/Bratislava','DD.MM. HH24:MI'));
  insert into ai_msgs(kind,role,status,convo,req_id) values('report','assistant','wait',cv,ai_post(cv, E'\n\nSÚHRN FLOTILY (JSON):\n'||b::text)) returning id into aid;
  insert into ai_state(key,value,updated_at) values('brief_last',jsonb_build_object('at',now()),now()) on conflict(key) do update set value=excluded.value, updated_at=now();
  return aid;
end $$;
grant execute on function public.ai_brief_report() to authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('ai-rano','ai-poobede');
select cron.schedule('ai-rano','0 5 * * *','select public.ai_brief_report()');
select cron.schedule('ai-poobede','0 13 * * 1-5','select public.ai_brief_report()');
