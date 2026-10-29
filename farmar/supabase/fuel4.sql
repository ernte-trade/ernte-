-- ERNTE / VALKO – flotila, AI úprava 26. 10. 2026:
--  1) výpadok dát (viac ako 6 h bez polohy/hladiny) = samostatná kategória „data_gap“, nie pokles v státí (bez € straty, bez alarmu fuel_drop)
--  2) kategória vozidla (ťahač N3 / sklápač N3 / N2 / dodávka N1 / osobné M1 / traktor), limit rýchlosti 90 km/h pre N2/N3, 130 km/h pre M1/N1,
--     alarm „Skontrolovať obmedzovač rýchlosti“ pri N3 nad 100 km/h
--  3) import výpisu tankovacích kariet + párovanie so sondou (±2 h, ±300 m), alarm „Karta jedného auta, nafta v inom“
--  4) zlúčenie duplicitných vozidiel (číselné ID z Commandera vs. ŠPZ), nespárované jednotky
--  5) čas tankovania pri „Tankovanie nesedí s nádržou“, register porušení od 1. 7. 2026 pre ERNTE AI
-- Nahrádza: ride_events_since, refuel_gap_sync, fuel_balance, no_signal_check, yard_check (fuel3.sql), fuel_gap_check (fuel2.sql),
--           fleet_drv_eval, fleet_findings (events.sql), fleet_events_speed_trg, cmd_overview (commander3.sql).

-- ===== stĺpce (aj keď niektorý starší skript ešte nebežal) =====
alter table fleet_events add column if not exists src_key text;
alter table fleet_events add column if not exists kmh int;
alter table fleet_events add column if not exists minutes int;
alter table fleet_events add column if not exists t_from timestamptz;
alter table fleet_events add column if not exists t_to timestamptz;
alter table fleet_events add column if not exists lvl_from numeric;
alter table fleet_events add column if not exists lvl_to numeric;
create unique index if not exists fev_src on fleet_events(src_key);
alter table rides add column if not exists refuels jsonb;
alter table cmd_vehicles add column if not exists fleet text;
alter table cmd_vehicles add column if not exists fleet_manual boolean not null default false;
alter table cmd_vehicles add column if not exists model text;
alter table cmd_vehicles add column if not exists object_type text;
alter table cmd_vehicles add column if not exists deleted boolean;
alter table cmd_vehicles add column if not exists vclass text;
alter table cmd_vehicles add column if not exists vclass_manual boolean not null default false;
alter table cmd_vehicles add column if not exists dup_of text;
alter table cmd_vehicles add column if not exists unpaired boolean not null default false;
alter table cmd_vehicles add column if not exists pair_note text;

-- vodič na aute v danom čase (najbližšia jazda so známym vodičom do 12 h)
create or replace function public.veh_driver_at(vid text, t timestamptz) returns text language sql stable security definer set search_path=public as $$
  select trim(driver) from rides where vehicle_id=vid and not fleet_unknown(driver) and start_at between t-interval '12 hours' and t+interval '12 hours'
   order by abs(extract(epoch from start_at-t)) limit 1 $$;
revoke all on function public.veh_driver_at(text,timestamptz) from public, anon, authenticated;

-- =====================================================================================
-- 1) ZLÚČENIE DUPLICITNÝCH VOZIDIEL
-- =====================================================================================
create table if not exists rides_dup (like rides including defaults);
alter table rides_dup add column if not exists moved_at timestamptz default now();
alter table rides_dup add column if not exists dup_vehicle text;
create unique index if not exists rides_dup_id on rides_dup(ride_id);
alter table rides_dup enable row level security;
drop policy if exists rides_dup_read on rides_dup; create policy rides_dup_read on rides_dup for select using (is_fleet());

create or replace function public.veh_norm(t text) returns text language sql immutable as $$ select upper(regexp_replace(coalesce(t,''),'[^A-Za-z0-9]','','g')) $$;

-- zlúč jednotku „alias“ do vozidla „canon“: jazdy (duplicitné sa presunú do rides_dup), udalosti, výdaj z dvora, nastavenia
create or replace function public.veh_merge(alias text, canon text, how text) returns void language plpgsql security definer set search_path=public as $$
declare cp text;
begin
  if alias is null or canon is null or alias=canon then return; end if;
  select plate into cp from cmd_vehicles where id=canon;
  update cmd_vehicles set dup_of=canon, unpaired=false, pair_note=how where id=alias;
  update cmd_vehicles set dup_of=null where id=canon and dup_of=alias;
  insert into rides_dup select (jsonb_populate_record(null::rides_dup, to_jsonb(a)||jsonb_build_object('moved_at',now(),'dup_vehicle',canon))).*
    from rides a where a.vehicle_id=alias and exists(select 1 from rides x where x.vehicle_id=canon and x.ride_id<>a.ride_id
      and x.start_at between a.start_at-interval '10 minutes' and a.start_at+interval '10 minutes')
  on conflict (ride_id) do nothing;
  delete from rides a where a.vehicle_id=alias and exists(select 1 from rides_dup d where d.ride_id=a.ride_id and d.dup_vehicle=canon);
  update rides set vehicle_id=canon, plate=coalesce(cp,plate) where vehicle_id=alias;
  delete from fleet_events e where e.vehicle_id=alias and exists(select 1 from fleet_events x where x.vehicle_id=canon and x.kind=e.kind
      and x.at between e.at-interval '15 minutes' and e.at+interval '15 minutes');
  update fleet_events set vehicle_id=canon, plate=case when coalesce(plate,'') like '%→%' then plate else coalesce(cp,plate) end where vehicle_id=alias;
  update yard_fuel set vehicle_id=canon, plate=coalesce(cp,plate) where vehicle_id=alias;
  update fleet_cfg set value=jsonb_set(value,array[canon],value->alias) where key in ('vehcost','parked') and value ? alias and not value ? canon;
end $$;
revoke all on function public.veh_merge(text,text,text) from public, anon, authenticated;

-- potvrdený pár (číselné ID / označenie jednotky → ŠPZ)
create or replace function public.veh_pair_apply(a_in text, pl text) returns text language plpgsql security definer set search_path=public as $$
declare a record; c record;
begin
  select * into a from cmd_vehicles where id=a_in or (plate=a_in and plate ~ '^\d+$') or (name=a_in and name ~ '^\d+$') order by (id=a_in) desc limit 1;
  if a.id is null then return 'nenájdené'; end if;
  if a.dup_of is not null then return 'už zlúčené'; end if;
  select * into c from cmd_vehicles where id<>a.id and dup_of is null and veh_norm(pl)<>'' and (veh_norm(plate)=veh_norm(pl) or veh_norm(name)=veh_norm(pl))
   order by coalesce(deleted,false), gps_at desc nulls last limit 1;
  if c.id is null then
    update cmd_vehicles set plate=pl, name=coalesce(name,pl), unpaired=false, pair_note='ŠPZ potvrdená majiteľom' where id=a.id;
    return 'pomenované';
  end if;
  if coalesce(c.deleted,false) and not coalesce(a.deleted,false) then
    perform veh_merge(c.id, a.id, 'archivované vozidlo zlúčené do živej jednotky');
    update cmd_vehicles set plate=pl, unpaired=false, pair_note='potvrdené majiteľom (zhodný čas a hladina)' where id=a.id;
    return 'zlúčené (živá jednotka)';
  end if;
  perform veh_merge(a.id, c.id, 'potvrdené majiteľom (zhodný čas a hladina)');
  return 'zlúčené';
end $$;
revoke all on function public.veh_pair_apply(text,text) from public, anon, authenticated;

-- automatické párovanie: jednotky s číselným označením / bez ŠPZ podľa zhodného času a hladiny (sonda), alebo zhodných jázd
create or replace function public.veh_pair_auto() returns int language plpgsql security definer set search_path=public as $$
declare c record; pr jsonb; bid text; bn int; k int:=0; na int;
begin
  select value into pr from fleet_cfg where key='veh_pairs';
  for c in select key a, value #>> '{}' pl from jsonb_each(coalesce(pr,'{}'::jsonb)) loop perform veh_pair_apply(c.a, c.pl); end loop;
  for c in select v.* from cmd_vehicles v where v.dup_of is null and not coalesce(v.deleted,false)
            and coalesce(nullif(trim(v.plate),''),nullif(trim(v.name),''),v.id) ~ '^\d+$' loop
    bid:=null; bn:=null;
    select count(*) into na from tank_log where vehicle_id=c.id and at>now()-interval '21 days';
    if na>0 then
      select x.id, x.n into bid, bn from (
        select t2.vehicle_id id, count(*) n, count(*) filter (where coalesce(t1.speed,0)>5) nm
          from tank_log t1 join tank_log t2 on t2.at between t1.at-interval '90 seconds' and t1.at+interval '90 seconds' and t2.vehicle_id<>t1.vehicle_id and abs(t2.tank-t1.tank)<=1
          join cmd_vehicles w on w.id=t2.vehicle_id and w.dup_of is null and coalesce(nullif(trim(w.plate),''),nullif(trim(w.name),''),w.id) !~ '^\d+$'
         where t1.vehicle_id=c.id and t1.at>now()-interval '21 days'
           and (t1.lat is null or t2.lat is null or (abs(t1.lat-t2.lat)<0.0006 and abs(t1.lon-t2.lon)<0.0009))
         group by 1 order by 3 desc, 2 desc limit 1) x
       where x.nm>=3 or (x.n>=30 and x.n>=0.8*na);
    end if;
    if bid is null then
      select x.id, x.n into bid, bn from (
        select r2.vehicle_id id, count(*) n from rides r1 join rides r2 on r2.vehicle_id<>r1.vehicle_id and r2.start_at between r1.start_at-interval '2 minutes' and r1.start_at+interval '2 minutes'
            and abs(coalesce(r2.distance,0)-coalesce(r1.distance,0))<=greatest(0.5,coalesce(r1.distance,0)*0.02)
          join cmd_vehicles w on w.id=r2.vehicle_id and w.dup_of is null and coalesce(nullif(trim(w.plate),''),nullif(trim(w.name),''),w.id) !~ '^\d+$'
         where r1.vehicle_id=c.id and coalesce(r1.distance,0)>1 group by 1 order by 2 desc limit 1) x where x.n>=3;
    end if;
    if bid is not null then
      perform veh_merge(c.id, bid, 'automaticky – zhodný čas a hladina ('||bn||' zhôd)'); k:=k+1;
    else
      update cmd_vehicles set unpaired=true, pair_note='nespárované – bez zhody času a hladiny s iným vozidlom' where id=c.id;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.veh_pair_auto() from public, anon, authenticated;

-- nové jazdy a udalosti zlúčenej jednotky patria vozidlu (duplicitná jazda sa odloží do rides_dup)
create or replace function public.rides_alias_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare cn text; cp text;
begin
  select v.dup_of, c.plate into cn, cp from cmd_vehicles v left join cmd_vehicles c on c.id=v.dup_of where v.id=new.vehicle_id and v.dup_of is not null;
  if cn is null then return new; end if;
  if exists(select 1 from rides x where x.vehicle_id=cn and x.ride_id<>new.ride_id and x.start_at between new.start_at-interval '10 minutes' and new.start_at+interval '10 minutes') then
    insert into rides_dup select (jsonb_populate_record(null::rides_dup, to_jsonb(new)||jsonb_build_object('moved_at',now(),'dup_vehicle',cn))).* on conflict (ride_id) do nothing;
    return null;
  end if;
  new.vehicle_id:=cn; new.plate:=coalesce(cp,new.plate);
  return new;
end $$;
drop trigger if exists rides_alias on rides;
create trigger rides_alias before insert on rides for each row execute function public.rides_alias_trg();

create or replace function public.fleet_events_alias_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare cn text; cp text;
begin
  if new.vehicle_id is null then return new; end if;
  select v.dup_of, c.plate into cn, cp from cmd_vehicles v left join cmd_vehicles c on c.id=v.dup_of where v.id=new.vehicle_id and v.dup_of is not null;
  if cn is null then return new; end if;
  if exists(select 1 from fleet_events x where x.vehicle_id=cn and x.kind=new.kind and x.at between new.at-interval '15 minutes' and new.at+interval '15 minutes') then return null; end if;
  new.vehicle_id:=cn; if coalesce(new.plate,'') not like '%→%' then new.plate:=coalesce(cp,new.plate); end if;
  return new;
end $$;
drop trigger if exists fleet_events_alias on fleet_events;
create trigger fleet_events_alias before insert on fleet_events for each row execute function public.fleet_events_alias_trg();

-- =====================================================================================
-- 2) KATEGÓRIA VOZIDLA A LIMITY RÝCHLOSTI
-- =====================================================================================
-- N3T ťahač N3 · N3S sklápač N3 · N2 nákladné do 12 t · N1 dodávka · M1 osobné · T traktor / stroj
create or replace function public.veh_class_default(fl text, nm text, otype text) returns text language sql immutable as $$
  select case
    when fl='traktory' then 'T'
    when fl='sluzobne' then case when lower(coalesce(otype,''))='van'
         or coalesce(nm,'') ~* '(transit|sprinter|crafter|ducato|master|trafic|vivaro|jumper|boxer|daily|vito|movano|proace|expert|transporter|caddy|berlingo|partner|kangoo|dokker|doblo|dodávka|dodavka|\mvan\M)' then 'N1' else 'M1' end
    when fl='eu' then 'N3T'
    else 'N3S' end $$;
create or replace function public.cmd_vehicles_vclass_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not coalesce(new.vclass_manual,false) or new.vclass is null then
    new.vclass:=veh_class_default(coalesce(new.fleet,'region'),concat_ws(' ',new.name,new.model),new.object_type);
  end if;
  return new;
end $$;
drop trigger if exists cmd_vehicles_vclass on cmd_vehicles;
create trigger cmd_vehicles_vclass before insert or update on cmd_vehicles for each row execute function public.cmd_vehicles_vclass_trg();
update cmd_vehicles set vclass=veh_class_default(coalesce(fleet,'region'),concat_ws(' ',name,model),object_type) where not vclass_manual or vclass is null;

create or replace function public.veh_speed_lim(vid text) returns int language sql stable security definer set search_path=public as $$
  select coalesce((select case when vclass in ('M1','N1') then 130 else 90 end from cmd_vehicles where id=vid),90) $$;
revoke all on function public.veh_speed_lim(text) from public, anon, authenticated;

-- rýchlosť: N2/N3 nad 90 km/h, M1/N1 nad 130 km/h; N3 nad 100 km/h = „Skontrolovať obmedzovač rýchlosti“
create or replace function public.fleet_events_speed_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare c text; lim int;
begin
  if new.kind<>'speed' then return new; end if;
  select vclass into c from cmd_vehicles where id=new.vehicle_id;
  lim:=case when c in ('M1','N1') then 130 else 90 end;
  if coalesce(new.kmh,0)<=lim then return null; end if;
  if c in ('N3T','N3S') and coalesce(new.kmh,0)>100 then
    insert into fleet_events(vehicle_id,plate,kind,at,driver,kmh,note,lat,lon,src_key)
      values(new.vehicle_id,new.plate,'limiter',new.at,new.driver,new.kmh,
        'N3 '||new.kmh||' km/h (nad 100 km/h) – obmedzovač rýchlosti má auto držať na max. 90 km/h (smernica 92/6/EHS, STK)'||coalesce(' · '||new.note,''),
        new.lat,new.lon,'lim:'||coalesce(new.src_key,new.vehicle_id||':'||extract(epoch from new.at)::bigint))
      on conflict (src_key) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists fleet_events_speed on fleet_events;
create trigger fleet_events_speed before insert on fleet_events for each row execute function public.fleet_events_speed_trg();

create or replace function public.set_vehicle_class(vid text, cls text) returns text language plpgsql security definer set search_path=public as $$
declare v text;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if coalesce(cls,'') not in ('','N3T','N3S','N2','N1','M1','T') then raise exception 'Neznámy typ vozidla.'; end if;
  if coalesce(cls,'')='' then update cmd_vehicles set vclass_manual=false, vclass=null where id=vid;
  else update cmd_vehicles set vclass=cls, vclass_manual=true where id=vid; end if;
  select vclass into v from cmd_vehicles where id=vid;
  -- prepočet porušení rýchlosti od 1. 7. 2026 podľa nového limitu
  delete from fleet_events where vehicle_id=vid and kind='speed' and coalesce(kmh,0)<=veh_speed_lim(vid);
  delete from fleet_events where vehicle_id=vid and kind='limiter' and v not in ('N3T','N3S');
  insert into fleet_events(vehicle_id,plate,kind,at,driver,kmh,note,lat,lon,src_key)
    select r.vehicle_id,r.plate,'speed',r.start_at,r.driver,r.max_speed,'max '||r.max_speed||' km/h · jazda '||round(coalesce(r.distance,0))||' km',r.lat_start,r.lon_start,'spd:'||r.ride_id
      from rides r where r.vehicle_id=vid and r.start_at>=timestamptz '2026-07-01 00:00+02' and r.max_speed>90
    on conflict (src_key) do nothing;
  insert into fleet_events(vehicle_id,plate,kind,at,driver,kmh,note,lat,lon,src_key)
    select e.vehicle_id,e.plate,'limiter',e.at,e.driver,e.kmh,'N3 '||e.kmh||' km/h (nad 100 km/h) – obmedzovač rýchlosti má auto držať na max. 90 km/h (smernica 92/6/EHS, STK)'||coalesce(' · '||e.note,''),e.lat,e.lon,'lim:'||coalesce(e.src_key,e.id::text)
      from fleet_events e where e.vehicle_id=vid and e.kind='speed' and e.kmh>100 and v in ('N3T','N3S')
    on conflict (src_key) do nothing;
  return v;
end $$;
revoke all on function public.set_vehicle_class(text,text) from public, anon;
grant execute on function public.set_vehicle_class(text,text) to authenticated;

-- =====================================================================================
-- 3) VÝPADOK DÁT vs. POKLES V STÁTÍ
-- =====================================================================================
-- najdlhšia medzera bez polohy/hladiny medzi a a b (záznamy sondy)
create or replace function public.fuel_max_gap(vid text, a timestamptz, b timestamptz) returns interval language sql stable security definer set search_path=public as $$
  select max(d) from (select t-lag(t) over (order by t) d from (select a t union all select at from tank_log where vehicle_id=vid and at>a and at<b union all select b) q) z $$;
revoke all on function public.fuel_max_gap(text,timestamptz,timestamptz) from public, anon, authenticated;

-- =====================================================================================
-- 4) TANKOVANIA ZO SONDY (nárast hladiny v nádrži)
-- =====================================================================================
create table if not exists fuel_rises(vehicle_id text not null, at timestamptz not null, t_from timestamptz, l_from numeric, l_to numeric, rise numeric, lat numeric, lon numeric,
  primary key(vehicle_id, at));
create index if not exists fuel_rises_at on fuel_rises(at);
alter table fuel_rises enable row level security;
drop policy if exists fuel_rises_read on fuel_rises; create policy fuel_rises_read on fuel_rises for select using (is_fleet());

-- nárast = súvislá séria stúpajúcich meraní (zlúčené do 30 min), spolu aspoň 30 l
create or replace function public.fuel_rise_scan(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  delete from fuel_rises where at>=since;
  insert into fuel_rises(vehicle_id,at,t_from,l_from,l_to,rise,lat,lon)
  with a as (select vehicle_id, at, tank, lat, lon, lag(tank) over w ptank, lag(at) over w pat
               from tank_log where at>=since-interval '6 hours' window w as (partition by vehicle_id order by at)),
  b as (select *, tank-ptank d from a where ptank is not null and tank-ptank>2 and at-pat<=interval '3 hours'),
  c as (select *, sum(case when pat-plag>interval '30 minutes' or plag is null then 1 else 0 end) over (partition by vehicle_id order by at) grp
          from (select b.*, lag(b.at) over (partition by b.vehicle_id order by b.at) plag from b) q),
  r as (select vehicle_id, grp, min(pat) t_from, max(at) t_to, sum(d) rise,
               (array_agg(ptank order by at))[1] l_from, (array_agg(tank order by at desc))[1] l_to,
               (array_agg(lat order by at desc))[1] lat, (array_agg(lon order by at desc))[1] lon
          from c group by vehicle_id, grp)
  select vehicle_id, t_to, t_from, round(l_from), round(l_to), round(l_to-l_from), lat, lon from r where l_to-l_from>=30 and t_to>=since
  on conflict (vehicle_id, at) do update set t_from=excluded.t_from, l_from=excluded.l_from, l_to=excluded.l_to, rise=excluded.rise, lat=excluded.lat, lon=excluded.lon;
  get diagnostics n=row_count;
  return n;
end $$;
revoke all on function public.fuel_rise_scan(timestamptz) from public, anon, authenticated;

create or replace function public.ts_try(t text) returns timestamptz language plpgsql immutable as $$
begin
  if t is null or t='' then return null; end if;
  if t ~ '^\d{9,11}(\.\d+)?$' then return to_timestamp(t::numeric); end if;
  if t ~ '^\d{12,14}$' then return to_timestamp(t::numeric/1000); end if;
  return t::timestamptz;
exception when others then return null; end $$;

-- čas tankovania k jazde: nárast zo sondy, inak čas z karty (Commander), inak jazda od–do
create or replace function public.refuel_time(rid text) returns table(t_from timestamptz, t_to timestamptz, src text) language sql stable security definer set search_path=public as $$
  with r as (select * from rides where ride_id=rid),
  s as (select f.t_from, f.at from fuel_rises f, r where f.vehicle_id=r.vehicle_id and f.at between r.start_at-interval '30 minutes' and coalesce(r.stop_at,r.start_at)+interval '3 hours'
         order by abs(extract(epoch from f.at-coalesce(r.stop_at,r.start_at))) limit 1),
  j as (select min(ts_try(x->>k)) t from r, jsonb_array_elements(case when jsonb_typeof(r.refuels)='array' then r.refuels else '[]'::jsonb end) x,
          unnest(array['time','datetime','dateTime','refuelingTime','refuelTime','refuelingDate','date','timestamp']) k)
  select coalesce((select t_from from s),(select t from j),(select start_at from r)),
         coalesce((select at from s),(select t from j),(select stop_at from r)),
         case when exists(select 1 from s) then 'sonda' when (select t from j) is not null then 'karta' else 'jazda' end $$;
revoke all on function public.refuel_time(text) from public, anon, authenticated;

create or replace function public.refuel_gap_sync(since timestamptz) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare k int:=0; n int; t text; e record; tz text:='Europe/Bratislava';
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  delete from fleet_events fe where fe.kind='refuel_gap' and fe.at>=since-interval '2 days'
     and fe.src_key like 'gap:%'
     and exists(select 1 from rides r where r.ride_id=substr(fe.src_key,5))
     and not coalesce((select q.bad and q.ready from refuel_eval(substr(fe.src_key,5)) q),false);
  get diagnostics n=row_count;
  for e in
    with x as (
      insert into fleet_events as f(vehicle_id,plate,kind,at,driver,liters,place,place_kind,t_from,t_to,note,src_key)
      select r.vehicle_id,coalesce(r.plate,(select plate from cmd_vehicles where id=r.vehicle_id)),'refuel_gap',coalesce(r.stop_at,r.start_at),r.driver,abs(q.diff),r.stop_addr,'fuel',tm.t_from,tm.t_to,
             'tankovanie '||to_char(tm.t_from at time zone tz,'DD.MM.YYYY HH24:MI')||case when tm.src='jazda' then '–'||to_char(tm.t_to at time zone tz,'HH24:MI')||' (počas jazdy)' else '' end
             ||' · natankované '||round(q.refuel)||' l · nárast v nádrži '||q.rise||' l · rozdiel '||case when q.diff>0 then '−' else '+' end||abs(q.diff)||' l ('||replace(q.pct::text,'.',',')||' %)'
             ||case when q.diff>0 then ' – v nádrži pribudlo menej, ako bolo natankované' else ' – v nádrži pribudlo viac, ako je na doklade' end,
             'gap:'||r.ride_id
        from rides r cross join lateral refuel_eval(r.ride_id) q cross join lateral refuel_time(r.ride_id) tm
       where coalesce(r.stop_at,r.start_at)>=since and r.refuel_l>0 and q.bad and q.ready
      on conflict (src_key) do update set liters=excluded.liters, note=excluded.note, t_from=excluded.t_from, t_to=excluded.t_to
      returning f.plate, f.note, f.at, f.driver, (xmax=0) isnew)
    select * from x
  loop
    if e.isnew then k:=k+1;
      if t is not null and e.at>now()-interval '6 hours' then
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Tankovanie nesedí','message',
          coalesce(e.plate,'')||': '||e.note||coalesce(' · '||e.driver,''),'tags',jsonb_build_array('fuelpump','warning'),'priority',4)); exception when others then null; end;
      end if;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.refuel_gap_sync(timestamptz) from public, anon, authenticated;

-- udalosti z jázd; krok 2: státie s medzerou nad 6 h bez dát = výpadok dát (data_gap), inak pokles v státí
create or replace function public.ride_events_since(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; n int; c jsonb; son boolean; mn int; tz text:='Europe/Bratislava';
begin
  select value into c from fleet_cfg where key='stop'; son:=coalesce((c->>'on')::boolean,true); mn:=coalesce((c->>'min')::int,30);
  -- 1) rýchlosť nad 90 km/h (limit podľa kategórie vozidla rieši fleet_events_speed_trg)
  insert into fleet_events(vehicle_id,plate,kind,at,driver,kmh,note,lat,lon,src_key)
    select r.vehicle_id,r.plate,'speed',r.start_at,r.driver,r.max_speed,'max '||r.max_speed||' km/h · jazda '||round(coalesce(r.distance,0))||' km',r.lat_start,r.lon_start,'spd:'||r.ride_id
      from rides r where r.start_at>=since and r.max_speed>90
    on conflict (src_key) do nothing;
  get diagnostics n=row_count; k:=k+n;
  -- 2) pokles nafty počas státia / výpadok dát a 3) odchod po státí
  create temp table if not exists _rev(ride_id text, vehicle_id text, plate text, driver text, start_at timestamptz, fuel_start numeric, refuel_l numeric,
    p_stop timestamptz, p_fuel numeric, p_drv text, p_lat numeric, p_lon numeric, p_addr text) on commit drop;
  truncate _rev;
  insert into _rev select * from (
    select r.ride_id, r.vehicle_id, r.plate, r.driver, r.start_at, r.fuel_start, r.refuel_l,
           lag(r.stop_at) over w p_stop, lag(r.fuel_stop) over w p_fuel, lag(r.driver) over w p_drv, lag(r.lat_stop) over w p_lat, lag(r.lon_stop) over w p_lon, lag(r.stop_addr) over w p_addr
      from rides r where r.start_at>=since-interval '3 days' window w as (partition by r.vehicle_id order by r.start_at)) x
   where x.start_at>=since and x.p_stop is not null;
  insert into fleet_events(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,note,src_key)
    select s.vehicle_id,s.plate,case when g.gap>interval '6 hours' then 'data_gap' else 'fuel_drop' end,s.start_at,coalesce(nullif(trim(s.p_drv),''),s.driver),round(s.p_fuel-s.fuel_start),
           coalesce((select name from place_near(s.p_lat,s.p_lon)),s.p_addr),'stop',s.p_lat,s.p_lon,s.p_stop,s.start_at,round(s.p_fuel),round(s.fuel_start),
           case when g.gap>interval '6 hours' then 'výpadok dát '||replace(round(extract(epoch from g.gap)/3600,1)::text,'.',',')||' h bez polohy a hladiny – nie je to pokles v státí, strata sa nepočíta · ' else '' end
           ||'státie '||to_char(s.p_stop at time zone tz,'DD.MM HH24:MI')||' → '||to_char(s.start_at at time zone tz,'DD.MM HH24:MI')||' · '||round(s.p_fuel)||' → '||round(s.fuel_start)||' l',
           case when g.gap>interval '6 hours' then 'dgap:' else 'drp:' end||s.ride_id
      from _rev s cross join lateral (select fuel_max_gap(s.vehicle_id,s.p_stop,s.start_at) gap) g
     where s.p_fuel is not null and s.fuel_start is not null and s.p_fuel-s.fuel_start>=25 and coalesce(s.refuel_l,0)=0
       and not exists(select 1 from fleet_events e where e.vehicle_id=s.vehicle_id and e.kind in ('fuel_drop','data_gap') and e.src_key is null and e.at between s.p_stop-interval '10 minutes' and s.start_at+interval '10 minutes')
       and not exists(select 1 from fleet_events e where e.src_key in ('drp:'||s.ride_id,'dgap:'||s.ride_id))
    on conflict (src_key) do nothing;
  get diagnostics n=row_count; k:=k+n;
  if son then
    insert into fleet_events(vehicle_id,plate,kind,at,driver,minutes,place,place_kind,lat,lon,src_key)
      select s.vehicle_id,s.plate,'depart',s.start_at,s.driver,floor(extract(epoch from s.start_at-s.p_stop)/60)::int,(select name from place_near(s.p_lat,s.p_lon)),'stop',s.p_lat,s.p_lon,'dep:'||s.ride_id
        from _rev s where s.start_at-s.p_stop>=make_interval(mins=>mn)
         and not exists(select 1 from fleet_events e where e.vehicle_id=s.vehicle_id and e.kind='depart' and e.src_key is null and e.at between s.start_at-interval '20 minutes' and s.start_at+interval '20 minutes')
      on conflict (src_key) do nothing;
    get diagnostics n=row_count; k:=k+n;
  end if;
  -- 4) príchod na miesto (koniec jazdy) a odchod z dvora / od odberateľa (začiatok jazdy)
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,lat,lon,src_key)
    select r.vehicle_id,r.plate,'in',r.stop_at,r.driver,pl.name,pl.kind,r.lat_stop,r.lon_stop,'in:'||r.ride_id
      from rides r cross join lateral place_near(r.lat_stop,r.lon_stop) pl
     where r.stop_at>=since and r.stop_at is not null
       and not exists(select 1 from fleet_events e where e.vehicle_id=r.vehicle_id and e.kind in ('in','yard_in') and e.src_key is null and e.at between r.stop_at-interval '20 minutes' and r.stop_at+interval '20 minutes')
    on conflict (src_key) do nothing;
  get diagnostics n=row_count; k:=k+n;
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,lat,lon,src_key)
    select r.vehicle_id,r.plate,'out',r.start_at,r.driver,pl.name,pl.kind,r.lat_start,r.lon_start,'out:'||r.ride_id
      from rides r cross join lateral place_near(r.lat_start,r.lon_start,array['yard','buyer']) pl
     where r.start_at>=since
       and not exists(select 1 from fleet_events e where e.vehicle_id=r.vehicle_id and e.kind in ('out','yard_out') and e.src_key is null and e.at between r.start_at-interval '20 minutes' and r.start_at+interval '20 minutes')
    on conflict (src_key) do nothing;
  get diagnostics n=row_count; k:=k+n;
  -- 5) tankovanie nesedí s nárastom v nádrži: |nárast − natankované| > 20 l a zároveň > 5 %
  k:=k+refuel_gap_sync(since);
  return k;
end $$;
revoke all on function public.ride_events_since(timestamptz) from public, anon, authenticated;

-- pokles medzi dvoma meraniami sondy; medzera nad 6 h bez dát = výpadok dát (bez upozornenia, bez straty)
create or replace function public.fuel_gap_check(days int default 1) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare s record; t text; k int:=0; drv text; pl text; moved numeric; ignon boolean; v record; msg text; thr numeric; dg boolean; tz text:='Europe/Bratislava';
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  thr:=coalesce((select (value->>'drop')::numeric from fleet_cfg where key='fuel'),20);
  for s in
    with x as (select vehicle_id, at, tank, speed, ign, lat, lon,
                 lag(at) over w p_at, lag(tank) over w p_tank, lag(lat) over w p_lat, lag(lon) over w p_lon
               from tank_log where at>now()-make_interval(days=>days) - interval '2 days' window w as (partition by vehicle_id order by at))
    select * from x where p_at is not null and at>now()-make_interval(days=>days) and p_tank-tank>=thr
  loop
    if exists(select 1 from fuel_gap_seen where vehicle_id=s.vehicle_id and t_from=s.p_at) then continue; end if;
    insert into fuel_gap_seen values(s.vehicle_id,s.p_at) on conflict do nothing;
    select coalesce(sum(case when greatest(start_at,s.p_at)<least(coalesce(stop_at,start_at),s.at) then distance else 0 end),0) into moved
      from rides where vehicle_id=s.vehicle_id and start_at<s.at and coalesce(stop_at,start_at)>s.p_at;
    if moved>2 then continue; end if;
    if s.lat is not null and s.p_lat is not null and abs(s.lat-s.p_lat)+abs(s.lon-s.p_lon)>0.02 then continue; end if;
    dg:=s.at-s.p_at>interval '6 hours';
    select bool_or(coalesce(ign,0)=1) into ignon from tank_log where vehicle_id=s.vehicle_id and at between s.p_at and s.at;
    select driver into drv from rides where vehicle_id=s.vehicle_id and start_at<=s.at and driver is not null order by start_at desc limit 1;
    select coalesce(p.name, (select stop_addr from rides where vehicle_id=s.vehicle_id and start_at<=s.at and stop_addr is not null order by start_at desc limit 1)) into pl
      from (select 1) d left join places p on abs(p.lat-s.lat)<0.01 and abs(p.lon-s.lon)<0.015;
    select * into v from cmd_vehicles where id=s.vehicle_id;
    insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,at,t_from,t_to,lvl_from,lvl_to,note)
      values(s.vehicle_id,v.plate,case when dg then 'data_gap' else 'fuel_drop' end,drv,pl,'fuel',round(s.p_tank-s.tank),s.lat,s.lon,s.at,s.p_at,s.at,round(s.p_tank),round(s.tank),
        case when dg then 'výpadok dát '||replace(round(extract(epoch from s.at-s.p_at)/3600,1)::text,'.',',')||' h bez polohy a hladiny – nie je to pokles v státí, strata sa nepočíta'
             when s.at-s.p_at>interval '1 hour' then 'pokles počas výpadku signálu ('||replace(round(extract(epoch from s.at-s.p_at)/3600,1)::text,'.',',')||' h)' else 'pokles medzi meraniami' end
        ||case when coalesce(ignon,false) then ', motor bežal' else ', motor vypnutý' end);
    if dg then continue; end if;
    k:=k+1;
    if t is not null and s.at>now()-interval '3 hours' then
      msg:='⚠️ '||coalesce(v.plate,s.vehicle_id)||': pokles nafty '||round(s.p_tank)||' → '||round(s.tank)||' l (−'||round(s.p_tank-s.tank)||' l) medzi '
        ||to_char(s.p_at at time zone tz,'DD.MM HH24:MI')||' a '||to_char(s.at at time zone tz,'DD.MM HH24:MI')||', auto stálo'||coalesce(' · '||pl,'')||coalesce(' · '||drv,'');
      begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,'click','https://maps.google.com/?q='||s.lat||','||s.lon)); exception when others then null; end;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_gap_check(int) from public, anon, authenticated;

-- =====================================================================================
-- 5) VÝPIS TANKOVACÍCH KARIET: import, párovanie so sondou, alarm „Karta jedného auta, nafta v inom“
-- =====================================================================================
create table if not exists fuel_card_tx(id bigserial primary key, at timestamptz not null, plate text, card text, station text,
  liters numeric not null check (liters>0), price numeric, vehicle_id text, match text, rise_at timestamptz, rise_l numeric, dist_m numeric,
  batch text, created_by text default (auth.jwt()->>'email'), created_at timestamptz not null default now());
create unique index if not exists fuel_card_tx_u on fuel_card_tx(at, coalesce(card,''), coalesce(plate,''), liters);
create index if not exists fuel_card_tx_at on fuel_card_tx(at desc);
alter table fuel_card_tx enable row level security;
drop policy if exists fct_read on fuel_card_tx; create policy fct_read on fuel_card_tx for select using (is_fleet());
drop policy if exists fct_del on fuel_card_tx; create policy fct_del on fuel_card_tx for delete using (is_owner());
create table if not exists fuel_stations(key text primary key, name text, lat numeric, lon numeric, n int not null default 1, updated_at timestamptz default now());
alter table fuel_stations enable row level security;
drop policy if exists fst_read on fuel_stations; create policy fst_read on fuel_stations for select using (is_fleet());

create or replace function public.st_key(t text) returns text language sql immutable as $$ select nullif(lower(regexp_replace(trim(coalesce(t,'')),'\s+',' ','g')),'') $$;

-- auto k riadku výpisu: ŠPZ → vozidlo; číslo karty → priradenie v aplikácii, alebo z tankovacích kariet v Commanderi
create or replace function public.card_vehicle(pl text, cd text) returns text language plpgsql stable security definer set search_path=public as $$
declare v text; c text:=regexp_replace(coalesce(cd,''),'\s','','g');
begin
  if veh_norm(pl)<>'' then
    select id into v from cmd_vehicles where veh_norm(plate)=veh_norm(pl) and dup_of is null order by coalesce(deleted,false), gps_at desc nulls last limit 1;
    if v is null then select coalesce(c2.dup_of,c2.id) into v from trucks t join cmd_vehicles c2 on c2.id=t.cmd_id where veh_norm(t.spz)=veh_norm(pl) limit 1; end if;
    if v is not null then return v; end if;
  end if;
  if veh_norm(pl)<>'' then
    select value->>veh_norm(pl) into v from fleet_cfg where key='cards';
    if v is not null then return v; end if;
  end if;
  if c<>'' then
    select value->>c into v from fleet_cfg where key='cards';
    if v is not null then return v; end if;
    begin
      execute 'select object_id from cmd_refuel where regexp_replace(coalesce(ident,''''),''\s'','''',''g'')=$1 and object_id is not null order by at desc limit 1' into v using c;
    exception when others then v:=null; end;
    if v is not null then return coalesce((select dup_of from cmd_vehicles where id=v),v); end if;
  end if;
  return null;
end $$;
revoke all on function public.card_vehicle(text,text) from public, anon, authenticated;

-- párovanie riadkov výpisu so sondou (nárast v nádrži ±2 h, stanica ±300 m); poloha stanice sa učí zo spárovaných tankovaní
create or replace function public.fuel_card_match(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare x record; s record; f record; k int:=0; m text; d numeric;
begin
  for x in select * from fuel_card_tx where at>=since order by at loop
    if x.vehicle_id is null then
      x.vehicle_id:=card_vehicle(x.plate,x.card);
      if x.vehicle_id is not null then update fuel_card_tx set vehicle_id=x.vehicle_id where id=x.id; end if;
    end if;
    if x.vehicle_id is null then update fuel_card_tx set match='bez_auta', rise_at=null, rise_l=null, dist_m=null where id=x.id; continue; end if;
    select * into s from fuel_stations where key=st_key(x.station);
    select r.*, case when s.lat is not null and r.lat is not null then round(geo_m(s.lat,s.lon,r.lat,r.lon)) end dm into f
      from fuel_rises r where r.vehicle_id=x.vehicle_id and r.at between x.at-interval '2 hours' and x.at+interval '2 hours'
       and (s.lat is null or r.lat is null or geo_m(s.lat,s.lon,r.lat,r.lon)<=300)
     order by abs(extract(epoch from r.at-x.at)) limit 1;
    if f.vehicle_id is not null then
      m:='sonda'; k:=k+1;
      if st_key(x.station) is not null and f.lat is not null then
        insert into fuel_stations as fs(key,name,lat,lon,n) values(st_key(x.station),x.station,f.lat,f.lon,1)
          on conflict (key) do update set lat=case when fs.n<20 then (fs.lat*fs.n+excluded.lat)/(fs.n+1) else fs.lat end,
                                         lon=case when fs.n<20 then (fs.lon*fs.n+excluded.lon)/(fs.n+1) else fs.lon end, n=least(fs.n+1,20), updated_at=now();
      end if;
      update fuel_card_tx set match=m, rise_at=f.at, rise_l=f.rise, dist_m=f.dm where id=x.id;
    elsif exists(select 1 from rides r where r.vehicle_id=x.vehicle_id and r.refuel_l>0 and r.start_at<=x.at+interval '2 hours' and coalesce(r.stop_at,r.start_at)>=x.at-interval '2 hours') then
      update fuel_card_tx set match='jazda', rise_at=null, rise_l=null, dist_m=null where id=x.id;
    elsif not exists(select 1 from tank_log t where t.vehicle_id=x.vehicle_id and t.at between x.at-interval '3 hours' and x.at+interval '3 hours') then
      update fuel_card_tx set match='bez_dat', rise_at=null, rise_l=null, dist_m=null where id=x.id;
    else
      update fuel_card_tx set match='nesedi', rise_at=null, rise_l=null, dist_m=null where id=x.id;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_card_match(timestamptz) from public, anon, authenticated;

-- „Karta jedného auta, nafta v inom“: na tej istej stanici do 3 h má jedno auto v nádrži o 100+ l menej ako na doklade a iné auto o 100+ l viac
create or replace function public.card_swap_check(since timestamptz, push boolean default true) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare x record; b record; t text; k int:=0; np int:=0; tz text:='Europe/Bratislava'; f text:='DD.MM.YYYY HH24:MI'; ra numeric; sa record; pa record;
  slat numeric; slon numeric; short numeric; msg text; isnew boolean; pla text; plb text; da text; db text;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  for x in select * from fuel_card_tx where at>=since and vehicle_id is not null order by at loop
    if not exists(select 1 from tank_log where vehicle_id=x.vehicle_id and at between x.at-interval '3 hours' and x.at+interval '3 hours') then continue; end if;
    select coalesce(sum(rise),0) into ra from fuel_rises where vehicle_id=x.vehicle_id and at between x.at-interval '3 hours' and x.at+interval '3 hours';
    short:=x.liters-ra;
    if short<=100 then continue; end if;
    select * into sa from fuel_stations where key=st_key(x.station);
    slat:=sa.lat; slon:=sa.lon;
    if slat is null then
      select lat, lon into pa from tank_log where vehicle_id=x.vehicle_id and lat is not null and at between x.at-interval '1 hour' and x.at+interval '1 hour' order by abs(extract(epoch from at-x.at)) limit 1;
      slat:=pa.lat; slon:=pa.lon;
    end if;
    for b in
      select r.*, r.rise-greatest(coalesce((select sum(liters) from fuel_card_tx c where c.vehicle_id=r.vehicle_id and c.at between r.at-interval '3 hours' and r.at+interval '3 hours'),0),
                       coalesce((select sum(refuel_l) from rides d where d.vehicle_id=r.vehicle_id and d.refuel_l>0 and d.start_at<=r.at+interval '3 hours' and coalesce(d.stop_at,d.start_at)>=r.at-interval '3 hours'),0))
                -coalesce((select sum(liters) from yard_fuel y where y.kind='vydaj' and y.vehicle_id=r.vehicle_id and y.day=(r.at at time zone tz)::date),0) excess
        from fuel_rises r
       where r.vehicle_id<>x.vehicle_id and r.at between x.at-interval '3 hours' and x.at+interval '3 hours'
         and (slat is null or r.lat is null or geo_m(slat,slon,r.lat,r.lon)<=300)
         and not exists(select 1 from cmd_vehicles w where w.id=r.vehicle_id and w.dup_of is not null)
       order by abs(extract(epoch from r.at-x.at))
    loop
      if b.excess<=100 then continue; end if;
      select coalesce(plate,name,id) into pla from cmd_vehicles where id=x.vehicle_id;
      select coalesce(plate,name,id) into plb from cmd_vehicles where id=b.vehicle_id;
      da:=veh_driver_at(x.vehicle_id,x.at); db:=veh_driver_at(b.vehicle_id,b.at);
      msg:='Karta '||coalesce(nullif(x.card,''),x.plate,pla)||' ('||pla||', vodič '||coalesce(da,'neznámy')||'): na doklade '||round(x.liters)||' l · '||to_char(x.at at time zone tz,f)
        ||coalesce(' · '||x.station,'')||' · v nádrži '||pla||' pribudlo len '||round(ra)||' l (−'||round(short)||' l) ⇒ '
        ||plb||' (vodič '||coalesce(db,'neznámy')||'): v nádrži +'||round(b.rise)||' l ('||round(b.l_from)||' → '||round(b.l_to)||' l) '||to_char(b.t_from at time zone tz,'HH24:MI')||'–'||to_char(b.at at time zone tz,'HH24:MI')
        ||' bez vlastného dokladu (+'||round(b.excess)||' l)'||case when slat is null or b.lat is null then ' · poloha stanice neistá' else '' end||' · stupeň VYSOKÝ';
      insert into fleet_events as e(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,note,src_key)
        values(x.vehicle_id,pla||' → '||plb,'card_swap',x.at,coalesce(da,'?')||' → '||coalesce(db,'?'),round(least(short,b.excess)),x.station,'fuel',b.lat,b.lon,
               least(x.at,b.t_from),greatest(x.at,b.at),round(b.l_from),round(b.l_to),msg,'cswap:'||x.id||':'||b.vehicle_id||':'||extract(epoch from b.at)::bigint)
        on conflict (src_key) do update set note=excluded.note, liters=excluded.liters
        returning (xmax=0) into isnew;
      if isnew then k:=k+1;
        if push and t is not null and np<5 and x.at>now()-interval '7 days' then np:=np+1;
          begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','KARTA JEDNÉHO AUTA, NAFTA V INOM','message','💳 '||msg,
            'tags',jsonb_build_array('rotating_light'),'priority',5)); exception when others then null; end;
        end if;
      end if;
    end loop;
  end loop;
  return k;
end $$;
revoke all on function public.card_swap_check(timestamptz,boolean) from public, anon, authenticated;

create or replace function public.fuel_card_tick() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0;
begin
  perform fuel_rise_scan(now()-interval '1 day');
  if exists(select 1 from fuel_card_tx where at>=now()-interval '10 days') then
    perform fuel_card_match(now()-interval '10 days');
    k:=card_swap_check(now()-interval '10 days', true);
  end if;
  return k;
end $$;
revoke all on function public.fuel_card_tick() from public, anon, authenticated;

-- import z aplikácie (CSV/XLSX rozparsuje aplikácia): [{at, plate, card, station, liters, price}]
create or replace function public.fuel_card_import(rows_in jsonb, fname text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare n_in int:=0; n_ok int:=0; mn timestamptz; mx timestamptz; r jsonb; t timestamptz; l numeric; sw int:=0; a int;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if jsonb_typeof(rows_in)<>'array' then raise exception 'Chýbajú riadky výpisu.'; end if;
  for r in select * from jsonb_array_elements(rows_in) loop
    n_in:=n_in+1;
    t:=ts_try(r->>'at'); l:=cmd_num(r->>'liters');
    if t is null or l is null or l<=0 then continue; end if;
    insert into fuel_card_tx(at,plate,card,station,liters,price,vehicle_id,batch)
      values(t,nullif(trim(r->>'plate'),''),nullif(regexp_replace(coalesce(r->>'card',''),'\s','','g'),''),nullif(trim(r->>'station'),''),l,cmd_num(r->>'price'),
             card_vehicle(r->>'plate',r->>'card'),left(fname,120))
      on conflict do nothing;
    get diagnostics a=row_count; n_ok:=n_ok+a;
    mn:=least(mn,t); mx:=greatest(mx,t);
  end loop;
  if mn is not null then
    perform fuel_rise_scan(greatest(mn-interval '6 hours', now()-interval '125 days'));
    perform fuel_card_match(mn-interval '1 hour');
    sw:=card_swap_check(mn-interval '1 hour', true);
  end if;
  return jsonb_build_object('riadkov',n_in,'nove',n_ok,'duplicitne',n_in-n_ok,
    'od',to_char(mn at time zone 'Europe/Bratislava','DD.MM.YYYY'),'do',to_char(mx at time zone 'Europe/Bratislava','DD.MM.YYYY'),
    'sparovane_sonda',(select count(*) from fuel_card_tx where at between mn and mx and match='sonda'),
    'bez_auta',(select count(*) from fuel_card_tx where at between mn and mx and match='bez_auta'),
    'nesedi',(select count(*) from fuel_card_tx where at between mn and mx and match='nesedi'),
    'alarmy_karta_ine_auto',sw);
end $$;
revoke all on function public.fuel_card_import(jsonb,text) from public, anon;
grant execute on function public.fuel_card_import(jsonb,text) to authenticated;

-- priradenie čísla karty k autu
create or replace function public.set_card_vehicle(card_in text, vid text) returns int language plpgsql security definer set search_path=public as $$
declare c text:=regexp_replace(coalesce(card_in,''),'\s','','g'); n int;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if c='' then raise exception 'Chýba číslo karty.'; end if;
  insert into fleet_cfg(key,value) values('cards','{}') on conflict(key) do nothing;
  if coalesce(vid,'')='' then update fleet_cfg set value=value-c where key='cards';
  else update fleet_cfg set value=value||jsonb_build_object(c,vid) where key='cards'; end if;
  update fuel_card_tx set vehicle_id=nullif(vid,''), match=null where card=c or (card is null and veh_norm(plate)=veh_norm(c));
  get diagnostics n=row_count;
  perform fuel_card_match(coalesce((select min(at) from fuel_card_tx where card=c or (card is null and veh_norm(plate)=veh_norm(c))),now())-interval '1 hour');
  perform card_swap_check(coalesce((select min(at) from fuel_card_tx where card=c or (card is null and veh_norm(plate)=veh_norm(c))),now())-interval '1 hour', true);
  return n;
end $$;
revoke all on function public.set_card_vehicle(text,text) from public, anon;
grant execute on function public.set_card_vehicle(text,text) to authenticated;

-- =====================================================================================
-- 6) ZOZNAMY BEZ DUPLICÍT (bilancia nafty, bez signálu, nálezy, hodnotenie vodičov, Commander)
-- =====================================================================================
create or replace function public.fuel_balance(days int default 7) returns jsonb language sql stable security definer set search_path=public as $$
  with p as (select now()-make_interval(days=>days) w0, round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3) cb),
  v as (select id, coalesce(plate,name,id) auto, upper(replace(coalesce(plate,''),' ','')) pn from cmd_vehicles where dup_of is null and not coalesce(unpaired,false)),
  s as (select vehicle_id, at, tank from tank_log, p where at>=p.w0 and tank is not null
        union all select vehicle_id, start_at, fuel_start from rides, p where start_at>=p.w0 and fuel_start is not null
        union all select vehicle_id, stop_at, fuel_stop from rides, p where start_at>=p.w0 and stop_at is not null and fuel_stop is not null and stop_at<=now()),
  b as (select v.id, v.auto, v.pn,
          (select at from s where s.vehicle_id=v.id order by at asc limit 1) t0,
          (select tank from s where s.vehicle_id=v.id order by at asc limit 1) l0,
          (select at from s where s.vehicle_id=v.id order by at desc limit 1) t1,
          (select tank from s where s.vehicle_id=v.id order by at desc limit 1) l1
        from v),
  a as (select b.*,
          (select coalesce(sum(refuel_l),0) from rides r where r.vehicle_id=b.id and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) nat,
          (select coalesce(sum(fuel_consumed),0) from rides r where r.vehicle_id=b.id and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) spotr,
          (select coalesce(sum(distance),0) from rides r where r.vehicle_id=b.id and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) km,
          (select coalesce(sum(liters),0) from yard_fuel y where y.kind='vydaj' and (y.vehicle_id=b.id or (b.pn<>'' and upper(replace(coalesce(y.plate,''),' ',''))=b.pn))
              and y.day between (b.t0 at time zone 'Europe/Bratislava')::date and (b.t1 at time zone 'Europe/Bratislava')::date) dvor,
          (select coalesce(sum(rise),0) from fuel_rises f where f.vehicle_id=b.id and f.at>=b.t0 and f.at<=b.t1) sonda,
          (select count(*) from fleet_events e, p where e.vehicle_id=b.id and e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap') and e.at>=p.w0) alarmy
        from b),
  r as (select a.*, p.cb, a.t0 is not null and a.t1>a.t0 ok, a.spotr-(a.nat+a.dvor+a.l0-a.l1) chyba from a, p)
  select coalesce(jsonb_agg(jsonb_build_object(
     'auto',auto,
     'od',to_char(t0 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'do',to_char(t1 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),
     'nadrz_zaciatok_l',round(l0),'natankovane_l',round(nat),'natankovane_zdroj','karta (Commander)','vydaj_z_dvora_l',round(dvor),'narast_sonda_l',round(sonda),
     'spotreba_jazdou_l',round(spotr),'nadrz_koniec_l',round(l1),'km',round(km),
     'nevysvetleny_ubytok_l',case when ok then round(l0+nat+dvor-spotr-l1) end,
     'stav',case when not ok then 'málo dát (menej ako dva záznamy hladiny v okne)'
                 when chyba>30 then 'chýbajú záznamy o tankovaní (nie krádež)'
                 when l0+nat+dvor-spotr-l1>30 then 'nevysvetlený úbytok – skontrolovať'
                 else 'v poriadku' end,
     'chybajuce_tankovanie_l',case when ok and chyba>30 then round(chyba) end,
     'chybajuce_tankovanie_eur_bez_dph',case when ok and chyba>30 then round(chyba*cb) end,
     'nevysvetleny_ubytok_eur_bez_dph',case when ok and l0+nat+dvor-spotr-l1>30 then round((l0+nat+dvor-spotr-l1)*cb) end,
     'cena_nafty_bez_dph',cb,'alarmy_nafty',alarmy)
     order by case when ok then abs(l0+nat+dvor-spotr-l1) end desc nulls last),'[]') from r $$;
revoke all on function public.fuel_balance(int) from public, anon, authenticated;

create or replace function public.no_signal_check() returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare t text; k int:=0; v record; isnew boolean; pk jsonb; tz text:='Europe/Bratislava'; msg text;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  select coalesce(value,'{}') into pk from fleet_cfg where key='parked'; pk:=coalesce(pk,'{}');
  for v in
    select c.*, coalesce(c.plate,c.name,c.id) pl, floor(extract(epoch from now()-c.gps_at)/3600)::int hod,
           (select round(sum(distance)) from rides r where r.vehicle_id=c.id and r.start_at>=now()-interval '7 days') km7,
           (select trim(driver) from rides r where r.vehicle_id=c.id and not fleet_unknown(r.driver) order by start_at desc limit 1) drv,
           (select stop_addr from rides r where r.vehicle_id=c.id order by start_at desc limit 1) addr
      from cmd_vehicles c
     where c.gps_at is not null and c.gps_at<now()-interval '12 hours' and not coalesce((pk->>c.id)::boolean,false)
       and c.dup_of is null and not coalesce(c.unpaired,false) and not coalesce(c.deleted,false)
  loop
    if coalesce(v.km7,0)<=300 then continue; end if;
    msg:=v.pl||' nemá polohu '||v.hod||' h · posledná poloha '||to_char(v.gps_at at time zone tz,'DD.MM HH24:MI')
      ||coalesce(' · '||coalesce((select name from place_near(v.lat,v.lon)),v.addr),'')||' · posledný vodič '||coalesce(v.drv,'neznámy')
      ||' · za 7 dní '||v.km7||' km · stupeň STREDNÝ';
    insert into fleet_events as e(vehicle_id,plate,kind,at,driver,minutes,place,place_kind,lat,lon,t_from,note,src_key)
      values(v.id,v.pl,'no_signal',now(),v.drv,v.hod*60,coalesce((select name from place_near(v.lat,v.lon)),v.addr),'stop',v.lat,v.lon,v.gps_at,msg,
             'nosig:'||v.id||':'||floor(extract(epoch from v.gps_at))::bigint)
      on conflict (src_key) do update set minutes=excluded.minutes, note=excluded.note, driver=excluded.driver
      returning (xmax=0) into isnew;
    if isnew then k:=k+1;
      if t is not null then
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Aktívne auto bez signálu','message','📡 '||msg,'tags',jsonb_build_array('satellite'),'priority',4,
          'click','https://maps.google.com/?q='||v.lat||','||v.lon)); exception when others then null; end;
      end if;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.no_signal_check() from public, anon, authenticated;

create or replace function public.fleet_drv_eval(a timestamptz, b timestamptz) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb; p numeric; t numeric; sh numeric; r jsonb;
begin
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  p:=coalesce((c->>'diesel')::numeric,1.952)/1.23; t:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100);
  with rr as (select r.*, coalesce(nullif(trim(r.driver),''),'neznámy vodič') dn, coalesce(nullif(trim(r.plate),''),r.vehicle_id,'?') car, veh_speed_lim(r.vehicle_id) lim from rides r where r.start_at>=a and r.start_at<b),
  near as (select x.vehicle_id, x.start_at, x.dn, x.car, x.refuel_l,
      case when fleet_unknown(x.driver) then coalesce((select trim(y.driver) from rides y where y.vehicle_id=x.vehicle_id and not fleet_unknown(y.driver)
        and y.start_at between x.start_at-interval '12 hours' and x.start_at+interval '12 hours' order by abs(extract(epoch from y.start_at-x.start_at)) limit 1),x.dn) else x.dn end dto
    from rr x where x.refuel_l>0),
  yd as (select coalesce(nullif(trim(f.driver),''),(select trim(y.driver) from rides y where (y.vehicle_id=f.vehicle_id or upper(replace(y.plate,' ',''))=upper(replace(f.plate,' ','')))
        and not fleet_unknown(y.driver) order by abs(extract(epoch from y.start_at-(f.day::timestamp+interval '12 hours') at time zone 'Europe/Bratislava')) limit 1),'neznámy vodič') dn,
      coalesce(nullif(trim(f.plate),''),f.vehicle_id,'?') car, f.liters
    from yard_fuel f where f.kind='vydaj' and f.day>=(a at time zone 'Europe/Bratislava')::date and f.day<(b at time zone 'Europe/Bratislava')::date),
  multi as (select car from rr where coalesce(distance,0)>0 group by car having count(distinct dn)>1),
  dc as (select dn, car, sum(coalesce(distance,0)) km, sum(coalesce(fuel_consumed,0)) l,
      sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0) lok, sum(distance) filter (where distance>0 and fuel_consumed>0) kok,
      count(*) filter (where max_speed>lim) ov, max(max_speed) vmax from rr group by 1,2),
  rc as (select dto dn, car, sum(refuel_l) l from near group by 1,2),
  ry as (select dn, car, sum(liters) l from yd group by 1,2),
  allc as (select dn, car from dc union select dn, car from rc union select dn, car from ry),
  cc as (select x.dn, x.car, coalesce(dc.km,0) km, coalesce(dc.l,0) l, coalesce(dc.lok,0) lok, coalesce(dc.kok,0) kok, coalesce(dc.ov,0) ov, dc.vmax,
      coalesce(rc.l,0) rk, coalesce(ry.l,0) ryd, x.car in (select car from multi) mul
    from allc x left join dc using (dn,car) left join rc using (dn,car) left join ry using (dn,car)),
  dr as (select dn, sum(km) km, sum(l) l, sum(lok) lok, sum(kok) kok, sum(ov) ov, max(vmax) vmax, sum(rk) rk, sum(ryd) ryd, bool_or(mul) mul,
      jsonb_agg(jsonb_build_object('auto',car,'km',round(km),'litre',round(l),'l_100km',case when km>=100 and kok>20 then to_jsonb(round(lok/kok*100,1)) else '"málo dát"'::jsonb end,
        'natankovane_l',round(rk+ryd),'natankovane_karta_l',round(rk),'natankovane_dvor_l',round(ryd),'viac_vodicov',mul) order by km desc) auta
    from cc group by dn),
  dp as (select coalesce(nullif(trim(driver),''),'neznámy vodič') dn, count(*) n from fleet_events where kind='fuel_drop' and at>=a and at<b group by 1)
  select coalesce(jsonb_agg(jsonb_build_object('vodic',dr.dn,'km',round(km),'litre',round(l),
      'l_100km',case when km>=100 and kok>20 then to_jsonb(round(lok/kok*100,1)) else '"málo dát"'::jsonb end,'malo_dat',km<100,
      'natankovane_l',round(rk+ryd),'natankovane_karta_l',round(rk),'natankovane_dvor_l',round(ryd),
      'rozdiel_l',round(l-rk-ryd),'rozdiel_pct',case when l>0 then round((l-rk-ryd)/l*100,1) end,'rozdiel_eur_bez_dph',round((l-rk-ryd)*p),
      'pocet_prekroceni_rychlosti',ov,'limit_rychlosti','N2/N3 90 km/h, M1/N1 130 km/h','max_rychlost',vmax,'pocet_poklesov_paliva',coalesce(dp.n,0),
      'naklad_nafta_myto_eur_km_bez_dph',case when km>0 then round((l*p+km*sh/100*t)/km,3) end,
      'viac_vodicov_na_aute',mul,'poznamka',case when km<100 then 'málo dát' when mul then 'viac vodičov na aute, rozdiel orientačný' end,
      'auta',auta) order by (km<100), fleet_unknown(dr.dn), case when l>0 then (l-rk-ryd)/l end desc nulls last),'[]') into r
  from dr left join dp using (dn);
  return r;
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.fleet_drv_eval(timestamptz,timestamptz) from public, anon, authenticated;

create or replace function public.fleet_findings() returns jsonb language plpgsql stable security definer set search_path=public as $$
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
    from fleet_events where kind='fuel_drop' and at>=y0;
  select coalesce(jsonb_agg(jsonb_build_object('auto',coalesce(plate,name,id),'hodin',case when gps_at is null then null else floor(extract(epoch from now()-gps_at)/3600)::int end) order by gps_at nulls first),'[]') into ns
    from cmd_vehicles v where (gps_at is null or gps_at<now()-interval '24 hours') and not coalesce((pk->>v.id)::boolean,false)
      and v.dup_of is null and not coalesce(v.unpaired,false) and not coalesce(v.deleted,false);
  select coalesce(jsonb_agg(coalesce(plate,name,id) order by plate),'[]') into nr
    from cmd_vehicles v where not coalesce((pk->>v.id)::boolean,false) and v.dup_of is null and not coalesce(v.unpaired,false) and not coalesce(v.deleted,false)
      and not exists(select 1 from rides r where r.vehicle_id=v.id and r.start_at>=now()-interval '48 hours');
  z1:=fleet_month(today);
  if date_trunc('month',today-1)=date_trunc('month',today) then z0:=fleet_month(today-1); ch:=(z1->>'zisk_do_dnes_pomerne')::numeric-(z0->>'zisk_do_dnes_pomerne')::numeric; end if;
  ok:=coalesce((select bool_and(coalesce((x->>'rozdiel_pct')::numeric,0)<=15) from jsonb_array_elements(top) x),true) and jsonb_array_length(sp)=0 and jsonb_array_length(fd)=0 and jsonb_array_length(ns)=0 and jsonb_array_length(nr)=0;
  return jsonb_build_object('bez_nalezov',ok,'cena_nafty_bez_dph',round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3),
    'top3_rozdiel_nafty_mesiac',top,'rychlost_nad_90_od_vcera',sp,'poklesy_paliva_pri_stati_od_vcera',fd,'bez_signalu_nad_24h',ns,'bez_jazdy_48h',nr,
    'zisk_do_dnes',z1->'zisk_do_dnes_pomerne','zisk_cely_mesiac',z1->'zisk_cely_mesiac_plne_pevne','zmena_zisku_od_vcera',round(ch),'obrat_je_odhad',z1->'obrat_je_odhad',
    'nadrz_dvor',yard_fuel_balance());
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.fleet_findings() from public, anon, authenticated;

-- (v bloku: ak ešte nebežal commander2.sql, prehľad Commandera sa vynechá a nič iné nezlyhá)
do $do$ begin
execute $f$
create or replace function public.cmd_overview() returns jsonb language sql stable security definer set search_path=public as $$
  select case when not is_fleet() then null else jsonb_build_object(
    'konta',(select coalesce(jsonb_agg(x),'[]') from (select acc konto, exists(select 1 from vault.secrets where name=case when acc='eu' then 'commander_basic_eu' else 'commander_basic' end) zadane from unnest(array['main','eu']) acc) x),
    'api',(select coalesce(jsonb_agg(to_jsonb(c) order by c.acc,c.kind),'[]') from cmd_api c),
    'vozidla',(select jsonb_build_object('spolu',count(*) filter (where u),
       'region',count(*) filter (where fleet='region' and u),'eu',count(*) filter (where fleet='eu' and u),
       'sluzobne',count(*) filter (where fleet='sluzobne' and u),'traktory',count(*) filter (where fleet='traktory' and u),
       'unikatne',count(*) filter (where u),'zlucene_duplicity',count(*) filter (where dup_of is not null and not coalesce(deleted,false)),
       'nesparovane',count(*) filter (where unpaired and dup_of is null and not coalesce(deleted,false)),
       'bez_nazvu',count(*) filter (where plate is null and name is null and u),
       'archivovane',(select count(*) from cmd_ref where kind='deleted_vehicle'),
       'podla_typu',(select coalesce(jsonb_object_agg(t,k),'{}') from (select coalesce(object_type, case vclass when 'N3T' then 'ťahač N3' when 'N3S' then 'sklápač N3' when 'N2' then 'nákladné N2' when 'N1' then 'dodávka N1' when 'M1' then 'osobné M1' when 'T' then 'traktor / stroj' end,'nezadaný') t,count(*) k
           from cmd_vehicles where not coalesce(deleted,false) and dup_of is null and not unpaired group by 1) q),
       'podla_kategorie',(select coalesce(jsonb_object_agg(t,k),'{}') from (select case vclass when 'N3T' then 'ťahač N3' when 'N3S' then 'sklápač N3' when 'N2' then 'nákladné N2' when 'N1' then 'dodávka N1' when 'M1' then 'osobné M1' when 'T' then 'traktor / stroj' else 'nezadaný' end t,count(*) k
           from cmd_vehicles where not coalesce(deleted,false) and dup_of is null and not unpaired group by 1) q))
       from (select *, not coalesce(deleted,false) and dup_of is null and not unpaired u from cmd_vehicles) cv),
    'vodici',(select count(*) from cmd_drivers),'body',(select count(*) from cmd_waypoints),
    'tankovanie_import_35_dni',(select jsonb_build_object('pocet',count(*),'litre',round(coalesce(sum(liters),0)),'eur_bez_dph',round(coalesce(sum(cost),0)),
       'nesparovane',count(*) filter (where status=2),'nesparovane_l',round(coalesce(sum(liters) filter (where status=2),0))) from cmd_refuel where at>now()-interval '35 days'),
    'jazdy_od',(select to_char(min(start_at) at time zone 'Europe/Bratislava','YYYY-MM-DD') from rides),
    'jazdy_spolu',(select count(*) from rides)) end $$
$f$;
execute 'revoke all on function public.cmd_overview() from public, anon';
execute 'grant execute on function public.cmd_overview() to authenticated';
exception when others then raise notice 'cmd_overview: %', SQLERRM;
end $do$;
-- =====================================================================================
-- 7) REGISTER PORUŠENÍ PRE ERNTE AI (od 1. 7. 2026)
-- =====================================================================================
create or replace function public.ai_register(since timestamptz default timestamptz '2026-07-01 00:00+02') returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare tz text:='Europe/Bratislava'; cb numeric; ev jsonb; n int; sd jsonb; sa jsonb; lim int:=2500;
begin
  cb:=round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3);
  create temp table if not exists _reg(id bigint, kind text, typ text, spz text, vodic text, at timestamptz, t_from timestamptz, t_to timestamptz, miesto text,
    lvl_from numeric, lvl_to numeric, litre numeric, eur numeric, kmh int, note text, fuel boolean) on commit drop;
  truncate _reg;
  insert into _reg
  select e.id, e.kind,
         case e.kind when 'fuel_drop' then 'pokles v státí' when 'refuel_gap' then 'tankovanie nesedí' when 'fuel_transfer' then 'prečerpanie'
                     when 'speed' then 'rýchlosť nad limit' when 'no_signal' then 'výpadok signálu' when 'data_gap' then 'výpadok dát (nie pokles)'
                     when 'limiter' then 'skontrolovať obmedzovač rýchlosti' when 'card_swap' then 'karta jedného auta, nafta v inom' else e.kind end,
         coalesce(e.plate,(select plate from cmd_vehicles where id=e.vehicle_id),e.vehicle_id), nullif(trim(e.driver),''), e.at,
         coalesce(e.t_from, case when e.kind='speed' then r.start_at else e.at end),
         coalesce(e.t_to, case when e.kind='speed' then r.stop_at when e.kind='no_signal' then e.at end),
         e.place, e.lvl_from, e.lvl_to, e.liters,
         case when e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap') then round(coalesce(e.liters,0)*cb) end,
         coalesce(e.kmh, case when e.kind='speed' then r.max_speed end), left(e.note,220),
         e.kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap')
    from fleet_events e
    left join rides r on e.src_key like 'spd:%' and r.ride_id=substr(e.src_key,5)
   where e.at>=since and e.kind in ('fuel_drop','refuel_gap','fuel_transfer','speed','no_signal','data_gap','limiter','card_swap');
  update _reg g set t_from=r.start_at, t_to=r.stop_at, kmh=coalesce(g.kmh,r.max_speed)
    from fleet_events e join rides r on r.ride_id=substr(e.src_key,9) where e.id=g.id and e.src_key like 'lim:spd:%' and g.kind='limiter';
  select count(*) into n from _reg;
  select coalesce(jsonb_agg(jsonb_build_array(typ,spz,vodic,to_char(at at time zone tz,'DD.MM.YYYY'),to_char(t_from at time zone tz,'DD.MM HH24:MI'),to_char(t_to at time zone tz,'DD.MM HH24:MI'),
           miesto,lvl_from,lvl_to,litre,eur,kmh,note) order by fuel desc, at desc),'[]') into ev
    from (select * from _reg order by fuel desc, (kind in ('limiter','card_swap','no_signal')) desc, at desc limit lim) q;
  select coalesce(jsonb_agg(x order by x->>'mesiac', x->>'vodic'),'[]') into sd from (
    select jsonb_build_object('mesiac',to_char(at at time zone tz,'YYYY-MM'),'vodic',coalesce(vodic,'bez vodiča'),
      'poklesy_v_stati',count(*) filter (where kind='fuel_drop'),'tankovanie_nesedi',count(*) filter (where kind='refuel_gap'),'precerpanie',count(*) filter (where kind='fuel_transfer'),
      'karta_ine_auto',count(*) filter (where kind='card_swap'),'nafta_l',round(coalesce(sum(litre) filter (where fuel),0)),'nafta_eur_bez_dph',round(coalesce(sum(eur),0)),
      'rychlost',count(*) filter (where kind='speed'),'obmedzovac',count(*) filter (where kind='limiter'),'max_kmh',max(kmh),
      'vypadok_signalu',count(*) filter (where kind='no_signal'),'vypadok_dat',count(*) filter (where kind='data_gap'),
      'auta',string_agg(distinct spz,', ')) x
    from _reg group by to_char(at at time zone tz,'YYYY-MM'), coalesce(vodic,'bez vodiča')) q;
  select coalesce(jsonb_agg(x order by x->>'mesiac', x->>'auto'),'[]') into sa from (
    select jsonb_build_object('mesiac',to_char(at at time zone tz,'YYYY-MM'),'auto',spz,
      'poklesy_v_stati',count(*) filter (where kind='fuel_drop'),'tankovanie_nesedi',count(*) filter (where kind='refuel_gap'),'precerpanie',count(*) filter (where kind='fuel_transfer'),
      'karta_ine_auto',count(*) filter (where kind='card_swap'),'nafta_l',round(coalesce(sum(litre) filter (where fuel),0)),'nafta_eur_bez_dph',round(coalesce(sum(eur),0)),
      'rychlost',count(*) filter (where kind='speed'),'obmedzovac',count(*) filter (where kind='limiter'),'max_kmh',max(kmh),
      'vypadok_signalu',count(*) filter (where kind='no_signal'),'vypadok_dat',count(*) filter (where kind='data_gap'),
      'vodici',string_agg(distinct vodic,', ')) x
    from _reg group by to_char(at at time zone tz,'YYYY-MM'), spz) q;
  return jsonb_build_object('od',to_char(since at time zone tz,'DD.MM.YYYY'),'cena_nafty_bez_dph',cb,'pocet_udalosti',n,
    'poznamka','€ bez DPH = litre × cena nafty bez DPH; výpadok dát (nad 6 h bez polohy a hladiny) nie je pokles v státí a nemá € stratu; rýchlosť: N2/N3 nad 90 km/h, M1/N1 nad 130 km/h'
      ||case when n>lim then '; zobrazených '||lim||' najdôležitejších udalostí (všetky nafta), súhrny sú zo všetkých '||n else '' end,
    'stlpce',jsonb_build_array('typ','spz','vodic','datum','od','do','miesto','hladina_pred_l','hladina_po_l','litre','eur_bez_dph','max_kmh','popis'),
    'udalosti',ev,'suhrn_vodici_mesiace',sd,'suhrn_auta_mesiace',sa);
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.ai_register(timestamptz) from public, anon, authenticated;

-- =====================================================================================
-- 8) PRAVIDELNÁ KONTROLA (každé 2 min s Commanderom) + párovanie vozidiel raz denne
-- =====================================================================================
create or replace function public.yard_check() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0;
begin
  perform check_run('osm_sync');
  k:=k+check_run('place_check');
  k:=k+check_run('stop_check');
  k:=k+check_run('fuel_check');
  k:=k+check_run('ride_events');
  k:=k+check_run('fuel_gap_tick');
  k:=k+check_run('fuel_transfer_tick');
  k:=k+check_run('no_signal_check');
  k:=k+check_run('fuel_card_tick');
  return k;
end $$;
revoke all on function public.yard_check() from public, anon, authenticated;
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='veh-pair';
  perform cron.schedule('veh-pair','23 3 * * *','select public.veh_pair_auto()');
exception when others then null; end $$;

-- =====================================================================================
-- 9) JEDNORAZOVO
-- =====================================================================================
-- a) potvrdené páry od majiteľa (číselné ID z Commandera = ŠPZ) a automatické párovanie ostatných
insert into fleet_cfg(key,value) values('veh_pairs','{}') on conflict(key) do nothing;
update fleet_cfg set value=value||'{"135928":"AA 907DJ","143770":"AA092GA","146979":"AA954HN","154360":"AA575OV","133592":"AA 148BM","150458":"AA 724HJ","126888":"MI 377FA"}'::jsonb where key='veh_pairs';
select public.veh_pair_auto();
-- b) rýchlosť podľa kategórie: osobné/dodávky do 130 km/h nie sú porušenie; N3 nad 100 km/h = obmedzovač
delete from fleet_events e using cmd_vehicles v where e.kind='speed' and v.id=e.vehicle_id and v.vclass in ('M1','N1') and coalesce(e.kmh,0)<=130;
insert into fleet_events(vehicle_id,plate,kind,at,driver,kmh,note,lat,lon,src_key)
  select e.vehicle_id,e.plate,'limiter',e.at,e.driver,e.kmh,'N3 '||e.kmh||' km/h (nad 100 km/h) – obmedzovač rýchlosti má auto držať na max. 90 km/h (smernica 92/6/EHS, STK)'||coalesce(' · '||e.note,''),e.lat,e.lon,'lim:'||coalesce(e.src_key,e.id::text)
    from fleet_events e join cmd_vehicles v on v.id=e.vehicle_id where e.kind='speed' and e.kmh>100 and v.vclass in ('N3T','N3S')
  on conflict (src_key) do nothing;
-- c) výpadok dát: poklesy, kde medzi dvoma meraniami bolo viac ako 6 h bez polohy/hladiny, sa preradia do „data_gap“
update fleet_events set kind='data_gap', note='výpadok dát '||replace(round(extract(epoch from t_to-t_from)/3600,1)::text,'.',',')||' h bez polohy a hladiny – nie je to pokles v státí, strata sa nepočíta · '||coalesce(note,'')
 where kind='fuel_drop' and src_key is null and t_from is not null and t_to-t_from>interval '6 hours';
with d as (select e.id, p.stop_at p_stop, r.start_at, p.fuel_stop, r.fuel_start from fleet_events e join rides r on r.ride_id=substr(e.src_key,5)
             cross join lateral (select x.stop_at, x.fuel_stop from rides x where x.vehicle_id=r.vehicle_id and x.start_at<r.start_at order by x.start_at desc limit 1) p
            where e.kind='fuel_drop' and e.src_key like 'drp:%')
update fleet_events e set t_from=coalesce(e.t_from,d.p_stop), t_to=coalesce(e.t_to,d.start_at), lvl_from=coalesce(e.lvl_from,round(d.fuel_stop)), lvl_to=coalesce(e.lvl_to,round(d.fuel_start))
  from d where e.id=d.id;
update fleet_events set kind='data_gap', src_key='dgap:'||substr(src_key,5),
       note='výpadok dát '||replace(round(extract(epoch from fuel_max_gap(vehicle_id,t_from,t_to))/3600,1)::text,'.',',')||' h bez polohy a hladiny – nie je to pokles v státí, strata sa nepočíta · '||coalesce(note,'')
 where kind='fuel_drop' and src_key like 'drp:%' and t_from is not null and t_to is not null and fuel_max_gap(vehicle_id,t_from,t_to)>interval '6 hours'
   and not exists(select 1 from fleet_events x where x.src_key='dgap:'||substr(fleet_events.src_key,5));
-- d) tankovania zo sondy od 1. 7. 2026 a čas tankovania pri „Tankovanie nesedí“
select public.fuel_rise_scan(greatest(timestamptz '2026-07-01 00:00+02', now()-interval '125 days'));
update fleet_events e set t_from=tm.t_from, t_to=tm.t_to,
       note='tankovanie '||to_char(tm.t_from at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI')||case when tm.src='jazda' then '–'||to_char(tm.t_to at time zone 'Europe/Bratislava','HH24:MI')||' (počas jazdy)' else '' end
            ||' · '||regexp_replace(coalesce(e.note,''),'^tankovanie [^·]*· ','')
  from rides r cross join lateral refuel_time(r.ride_id) tm
 where e.kind='refuel_gap' and e.src_key like 'gap:%' and r.ride_id=substr(e.src_key,5);
