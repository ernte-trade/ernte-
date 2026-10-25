-- ERNTE – Flotila 2 (26. 10. 2026): udalosti z jázd (rýchlosť, pokles paliva, tankovanie), spätné doplnenie októbra,
-- vlastná nádrž na dvore (nákup / výdaj / stav), odstavené autá, odolnejší sync polôh a backfill, hodnotenie vodičov,
-- denný súhrn pre ranný a poobedný prehľad. Spúšťa sa automaticky (farmar/supabase/auto), majiteľ nič nespúšťa.

-- ===== udalosti: nové stĺpce a ochrana proti duplicitám =====
alter table fleet_events add column if not exists speed int;
alter table fleet_events add column if not exists ride_id text;
alter table fleet_events add column if not exists src text;
create unique index if not exists fev_kind_ride on fleet_events(kind, ride_id) where ride_id is not null;
create index if not exists fev_kind_at on fleet_events(kind, at desc);
create index if not exists rides_drv on rides(driver, start_at);

-- ===== vlastná nádrž na dvore =====
create table if not exists yard_fuel(
  id bigserial primary key,
  day date not null default (now() at time zone 'Europe/Bratislava')::date,
  kind text not null check (kind in ('nakup','vydaj','stav')),
  plate text, driver text,
  liters numeric not null default 0 check (liters>=0),
  tank_after numeric check (tank_after is null or tank_after>=0),
  price numeric, note text,
  created_at timestamptz not null default now(),
  created_by text default lower(coalesce(auth.jwt()->>'email','')));
create index if not exists yard_fuel_day on yard_fuel(day desc, id desc);
alter table yard_fuel enable row level security;
drop policy if exists yard_fuel_rw on yard_fuel;
create policy yard_fuel_rw on yard_fuel for all using (is_fleet()) with check (is_fleet());
grant select, insert, update, delete on yard_fuel to authenticated;
grant usage, select on sequence yard_fuel_id_seq to authenticated;

-- skutočný obrat z faktúr (fleet_cfg key 'rev' = {"YYYY-MM": €}) a mzdy vidí a mení iba majiteľ
drop policy if exists fcfg_rw on fleet_cfg;
create policy fcfg_rw on fleet_cfg for all using (is_fleet() and (key not in ('pay','rev') or is_owner())) with check (is_fleet() and (key not in ('pay','rev') or is_owner()));

-- ===== pomocné =====
create or replace function public.fleet_parked() returns text[] language sql stable security definer set search_path=public as $$
  select coalesce(array(select jsonb_array_elements_text(case when jsonb_typeof(value->'ids')='array' then value->'ids' else '[]'::jsonb end) from fleet_cfg where key='parked'),'{}'::text[]) $$;
create or replace function public.fleet_real_drv(d text) returns boolean language sql immutable as $$
  select nullif(trim(coalesce(d,'')),'') is not null and d !~* '^\s*tacho' and lower(trim(d))<>'neznámy vodič' $$;
create or replace function public.fleet_plate(p text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p,''),'[^A-Za-z0-9]','','g')) $$;
-- čas z Commandera: sekundy, milisekundy aj text
create or replace function public.cmd_ts(t text) returns timestamptz language plpgsql stable as $$
declare n numeric;
begin
  if t is null or btrim(t)='' then return null; end if;
  n:=cmd_num(t);
  if n is not null then
    if n>100000000000 then n:=n/1000; end if;
    if n<946684800 or n>4102444800 then return null; end if;
    return to_timestamp(n);
  end if;
  return t::timestamptz;
exception when others then return null; end $$;
create or replace function public.check_note(f text, m text, cnt int) returns void language sql security definer set search_path=public as $$
  insert into check_err as c(fn,msg,at,ok_at,n) values(f,m,now(),now(),coalesce(cnt,0))
  on conflict on constraint check_err_pkey do update set ok_at=now(), n=excluded.n, msg=excluded.msg, at=case when excluded.msg is not null then now() else c.at end $$;
revoke all on function public.check_note(text,text,int) from public, anon, authenticated;

-- ===== sync Commandera: každá poloha zvlášť (jedna chybná nezhodí ostatné), dlhší časový limit, backfill s kódom a opakovaním =====
create or replace function public.cmd_sync() returns text language plpgsql security definer set search_path=public, extensions, net as $$
declare r record; j jsonb; p jsonb; n int:=0; bad int; nr int; a text; base text:='https://online.commander-systems.com/api/v1/'; d date; e bigint; s bigint; bd text; lasterr text; ts timestamptz; hd jsonb;
begin
  a:=cmd_auth(); if a is null then return 'chýbajú prihlasovacie údaje'; end if;
  hd:=jsonb_build_object('Authorization',a,'Accept','application/json');
  for r in select l.id,l.kind,l.url,h.status_code,h.content,h.error_msg from cmd_log l join net._http_response h on h.id=l.id where not l.done order by l.at loop
    bd:=null;
    if r.kind='rides_bf' then
      begin bd:=to_char(to_timestamp(substring(r.url from 'datetimeStart=(\d+)')::bigint) at time zone 'Europe/Bratislava','YYYY-MM-DD'); exception when others then bd:=null; end;
    end if;
    if r.status_code=200 then
      begin
        j:=r.content::jsonb;
        if r.kind='vehicles' then
          for p in select * from jsonb_array_elements(case when jsonb_typeof(j)='array' then j else coalesce(j->'vehicles',j->'data','[]'::jsonb) end) loop
            continue when p->>'vehicleId' is null;
            insert into cmd_vehicles(id,name,plate,last_comm) values(p->>'vehicleId',p->>'vehicleName',p->>'vehicleRegistrationPlate',null)
              on conflict(id) do update set name=excluded.name,plate=excluded.plate;
            update trucks set cmd_id=p->>'vehicleId' where fleet_plate(spz)=fleet_plate(p->>'vehicleRegistrationPlate') and fleet_plate(spz)<>'';
          end loop;
        elsif r.kind='pos' then
          bad:=0; nr:=0;
          for p in select * from jsonb_array_elements(case when jsonb_typeof(j)='array' then j else coalesce(j->'positions',j->'data','[]'::jsonb) end) loop
            begin
              if p->>'vehicleId' is null then bad:=bad+1; lasterr:='poloha bez vehicleId'; continue; end if;
              ts:=cmd_ts(p->>'gpsTime');
              insert into cmd_vehicles(id,lat,lon,gps_at,speed,ign,tank,odometer,engine_hours,voltage,updated_at)
                values(p->>'vehicleId',cmd_num(p->>'gpsLat'),cmd_num(p->>'gpsLon'),ts,round(cmd_num(p->>'gpsSpeed'))::int,round(cmd_num(p->>'carIgnition'))::int,
                  nullif(cmd_num(p->>'canTankValue'),0),nullif(cmd_num(p->>'canOdometer'),0),nullif(cmd_num(p->>'canEngineHours'),0),cmd_num(p->>'voltage'),now())
                on conflict(id) do update set lat=coalesce(excluded.lat,cmd_vehicles.lat),lon=coalesce(excluded.lon,cmd_vehicles.lon),gps_at=coalesce(excluded.gps_at,cmd_vehicles.gps_at),
                  speed=excluded.speed,ign=excluded.ign,tank=coalesce(excluded.tank,cmd_vehicles.tank),odometer=coalesce(excluded.odometer,cmd_vehicles.odometer),
                  engine_hours=coalesce(excluded.engine_hours,cmd_vehicles.engine_hours),voltage=excluded.voltage,updated_at=now();
              update trucks set gps_lat=coalesce(cmd_num(p->>'gpsLat'),gps_lat),gps_lon=coalesce(cmd_num(p->>'gpsLon'),gps_lon),gps_at=coalesce(ts,gps_at),gps_speed=round(cmd_num(p->>'gpsSpeed'))::int,
                gps_ign=round(cmd_num(p->>'carIgnition'))::int,tank=coalesce(nullif(cmd_num(p->>'canTankValue'),0),tank),odometer=coalesce(nullif(cmd_num(p->>'canOdometer'),0),odometer)
               where cmd_id=p->>'vehicleId';
              if ts is null then bad:=bad+1; lasterr:='neplatný čas polohy: '||left(coalesce(p->>'gpsTime','prázdny'),40); else nr:=nr+1; end if;
              n:=n+1;
            exception when others then bad:=bad+1; lasterr:=left(SQLERRM,200); end;
          end loop;
          perform check_note('cmd_pos', case when bad>0 then bad||' polôh s chybou: '||lasterr end, nr);
        elsif r.kind in ('rides','rides_bf') then
          bad:=0; nr:=0;
          for p in select * from jsonb_array_elements(case when jsonb_typeof(j)='array' then j else coalesce(j->'rides',j->'data','[]'::jsonb) end) loop
            begin
              continue when p->>'rideId' is null;
              insert into rides(ride_id,vehicle_id,plate,driver,ride_type,start_at,stop_at,start_addr,stop_addr,lat_start,lon_start,lat_stop,lon_stop,distance,duration,avg_speed,max_speed,fuel_consumed,avg_cons,fuel_start,fuel_stop,odo_start,odo_stop,refuel_l,refuel_eur,note)
              values(p->>'rideId',p->>'vehicleId',p->>'vehicleRegistrationPlate',p->>'driverName',p->>'rideType',cmd_ts(p->>'startTime'),cmd_ts(p->>'stopTime'),
                p->>'startAddress',p->>'stopAddress',cmd_num(p->>'latStart'),cmd_num(p->>'lonStart'),cmd_num(p->>'latStop'),cmd_num(p->>'lonStop'),cmd_num(p->>'distance'),round(cmd_num(p->>'duration'))::int,cmd_num(p->>'avgSpeed'),round(cmd_num(p->>'maxSpeed'))::int,
                nullif(cmd_num(p->>'fuelConsumed'),0),nullif(cmd_num(p->>'averageConsumption'),0),nullif(cmd_num(p->>'fuelLevelStart'),0),nullif(cmd_num(p->>'fuelLevelStop'),0),
                cmd_num(p->>'odometerStart'),cmd_num(p->>'odometerStop'),
                (select sum(cmd_num(x->>'volume')) from jsonb_array_elements(case when jsonb_typeof(p->'refueling')='array' then p->'refueling' else '[]'::jsonb end) x),
                (select sum(cmd_num(x->>'priceVatExc')) from jsonb_array_elements(case when jsonb_typeof(p->'refueling')='array' then p->'refueling' else '[]'::jsonb end) x),
                p->>'note')
              on conflict(ride_id) do update set lat_start=excluded.lat_start,lon_start=excluded.lon_start,lat_stop=excluded.lat_stop,lon_stop=excluded.lon_stop,start_addr=excluded.start_addr,driver=excluded.driver,ride_type=excluded.ride_type,stop_at=excluded.stop_at,stop_addr=excluded.stop_addr,distance=excluded.distance,duration=excluded.duration,
                avg_speed=excluded.avg_speed,max_speed=excluded.max_speed,fuel_consumed=excluded.fuel_consumed,avg_cons=excluded.avg_cons,fuel_stop=excluded.fuel_stop,odo_stop=excluded.odo_stop,refuel_l=excluded.refuel_l,refuel_eur=excluded.refuel_eur,note=excluded.note;
              nr:=nr+1;
            exception when others then bad:=bad+1; lasterr:=left(SQLERRM,200); end;
          end loop;
          if bad>0 then perform check_note('cmd_rides', bad||' jázd s chybou: '||lasterr, nr); end if;
          if cmd_num(j->>'totalPages')>cmd_num(j->>'page') and r.url is not null then
            insert into cmd_log(id,kind,url) values(net.http_get(url:=regexp_replace(r.url,'page=\d+','page='||(cmd_num(j->>'page')::int+1)),headers:=hd,timeout_milliseconds:=60000),r.kind,regexp_replace(r.url,'page=\d+','page='||(cmd_num(j->>'page')::int+1)));
          end if;
        end if;
      exception when others then perform check_note('cmd_'||r.kind, left(SQLERRM,200), 0); end;
    elsif r.kind='pos' then
      perform check_note('cmd_pos', 'Commander vrátil '||coalesce(r.status_code::text,'bez kódu')||coalesce(': '||left(r.error_msg,120),''), 0);
    end if;
    update cmd_log set done=true, code=r.status_code where id=r.id;
    -- backfill: kód dňa = kód odpovede; pri chybe sa deň zopakuje
    if bd is not null then
      if r.status_code=200 then update cmd_log set code=200, at=now() where kind='backfill' and url=bd;
      else delete from cmd_log where kind='backfill' and url=bd; end if;
    end if;
  end loop;
  -- požiadavky bez odpovede (časový limit) – backfill dňa zopakovať
  delete from cmd_log where kind='backfill' and code=-1 and at<now()-interval '30 minutes';
  delete from cmd_log where at < now()-interval '3 days' and kind<>'backfill';
  if not exists(select 1 from cmd_log where kind='vehicles' and at>now()-interval '6 hours') then
    insert into cmd_log(id,kind) values(net.http_get(url:=base||'vehicles',headers:=hd,timeout_milliseconds:=30000),'vehicles');
  end if;
  insert into cmd_log(id,kind) values(net.http_get(url:=base||'last-positions?limit=1000',headers:=hd,timeout_milliseconds:=30000),'pos');
  -- jazdy: posledných 26 h každých 10 min
  if not exists(select 1 from cmd_log where kind='rides' and at>now()-interval '10 minutes') then
    e:=extract(epoch from now())::bigint; s:=e-26*3600;
    insert into cmd_log(id,kind,url) select net.http_get(url:=u,headers:=hd,timeout_milliseconds:=60000),'rides',u
      from (select base||'all-rides?datetimeStart='||s||'&datetimeEnd='||e||'&limit=1000&page=1' as u) q;
  end if;
  -- história 60 dní po dňoch (6 dní na jeden beh); deň bez kódu 200 sa zopakuje
  for d in select g::date from generate_series(current_date-60,current_date-1,'1 day') g
            where not exists(select 1 from cmd_log b where b.kind='backfill' and b.url=g::date::text) order by g desc limit 6 loop
    s:=extract(epoch from d::timestamp at time zone 'Europe/Bratislava')::bigint; e:=extract(epoch from (d+1)::timestamp at time zone 'Europe/Bratislava')::bigint;
    insert into cmd_log(id,kind,url) select net.http_get(url:=u,headers:=hd,timeout_milliseconds:=60000),'rides_bf',u
      from (select base||'all-rides?datetimeStart='||s||'&datetimeEnd='||e||'&limit=1000&page=1' as u) q;
    insert into cmd_log(id,kind,url,done,code) values(-(extract(epoch from d)::bigint),'backfill',d::text,true,-1) on conflict(id) do update set code=-1, at=now();
  end loop;
  begin perform yard_check(); exception when others then perform check_note('yard_check', left(SQLERRM,200), 0); end;
  return 'ok, spracovaných polôh: '||n||', jázd v databáze: '||(select count(*) from rides);
end $$;
revoke all on function public.cmd_sync() from public, anon, authenticated;

-- ===== udalosti z jázd: rýchlosť nad 90 km/h, pokles paliva počas státia, tankovanie nesedí s nádržou =====
create or replace function public.ride_scan(p_since timestamptz, p_notify boolean default false) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare c jsonb; t text; r record; k int:=0; gapmin numeric;
begin
  select value into c from fleet_cfg where key='fuel'; c:=coalesce(c,'{}'::jsonb); gapmin:=coalesce((c->>'gap')::numeric,30);
  select value->>'topic' into t from fleet_cfg where key='notify';
  -- 1) rýchlosť
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,speed,lat,lon,ride_id,src,minutes)
    select vehicle_id,plate,'speed',start_at,nullif(trim(driver),''),left(coalesce(start_addr,'?')||' → '||coalesce(stop_addr,'?'),200),'ride',max_speed,lat_start,lon_start,ride_id,'jazdy',round(coalesce(duration,0)/60.0)
      from rides where start_at>=p_since and start_at is not null and max_speed>90
    on conflict (kind, ride_id) where ride_id is not null do nothing;
  get diagnostics k = row_count;
  -- 2) pokles paliva počas státia (medzi dvoma jazdami bez tankovania)
  for r in with ins as (
    insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,liters,lat,lon,ride_id,src,minutes)
      select vehicle_id,plate,'fuel_drop',start_at,coalesce(nullif(trim(pdrv),''),nullif(trim(driver),'')),pstop,'stop',round(pfs-fuel_start),plat,plon,ride_id,'jazdy',floor(extract(epoch from start_at-pstop_at)/60)
        from (select x.*, lag(fuel_stop) over w pfs, lag(stop_at) over w pstop_at, lag(stop_addr) over w pstop, lag(lat_stop) over w plat, lag(lon_stop) over w plon, lag(driver) over w pdrv
                from rides x where x.start_at>=p_since-interval '3 days' and x.start_at is not null window w as (partition by vehicle_id order by start_at)) q
       where q.start_at>=p_since and q.pfs is not null and q.fuel_start is not null and q.pfs-q.fuel_start>=25 and coalesce(q.refuel_l,0)=0
         and not exists(select 1 from fleet_events e where e.vehicle_id=q.vehicle_id and e.kind='fuel_drop' and e.ride_id is null and e.at between q.pstop_at-interval '1 hour' and q.start_at+interval '1 hour')
      on conflict (kind, ride_id) where ride_id is not null do nothing
      returning plate, liters, driver, at, place, lat, lon) select * from ins loop
    k:=k+1;
    if p_notify and t is not null and r.at>now()-interval '6 hours' then
      perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',
        coalesce(r.plate,'')||': pokles nafty o '||round(r.liters)||' l počas státia'||coalesce(' · '||r.place,'')||coalesce(' · '||r.driver,'')||' · '||to_char(r.at at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
        'tags',jsonb_build_array('rotating_light'),'priority',5)||case when r.lat is not null then jsonb_build_object('click','https://maps.google.com/?q='||r.lat||','||r.lon) else '{}'::jsonb end);
    end if;
  end loop;
  -- 3) tankovanie (karta) nesedí s nárastom v nádrži
  for r in with ins as (
    insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,at,ride_id,src)
      select vehicle_id,plate,'refuel_gap',nullif(trim(driver),''),stop_addr,'fuel',round(fuel_start+refuel_l-coalesce(fuel_consumed,0)-fuel_stop),coalesce(stop_at,start_at),ride_id,'jazdy'
        from rides where start_at>=p_since and refuel_l>0 and fuel_start is not null and fuel_stop is not null
         and fuel_start+refuel_l-coalesce(fuel_consumed,0)-fuel_stop>=greatest(gapmin, refuel_l*0.08)
      on conflict (kind, ride_id) where ride_id is not null do nothing
      returning plate, liters, driver, at) select * from ins loop
    k:=k+1;
    if p_notify and t is not null and r.at>now()-interval '1 day' then
      perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Tankovanie nesedí','message',
        coalesce(r.plate,'')||': v nádrži pribudlo o ~'||round(r.liters)||' l menej, než sa natankovalo'||coalesce(' · '||r.driver,'')||' · '||to_char(r.at at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
        'tags',jsonb_build_array('fuelpump','warning'),'priority',4));
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.ride_scan(timestamptz,boolean) from public, anon, authenticated;
create or replace function public.ride_check() returns int language sql security definer set search_path=public as $$
  select ride_scan(least(date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava', now()-interval '3 days'), true) $$;
revoke all on function public.ride_check() from public, anon, authenticated;

-- ochrana nafty: pokles v stojacom aute podľa polohy (každé 2 min); tankovanie vs. nádrž rieši ride_scan
create or replace function public.fuel_check() returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare c jsonb; v record; t text; k int:=0; before_max numeric; now_lvl numeric; moved boolean; drv text; msg text;
begin
  select value into c from fleet_cfg where key='fuel'; if c is null then c:='{"drop":20,"win":90,"gap":30,"cool":180}'; end if;
  select value->>'topic' into t from fleet_cfg where key='notify';
  insert into tank_log(vehicle_id,at,tank,speed,ign,lat,lon)
    select id,gps_at,tank,speed,ign,lat,lon from cmd_vehicles where tank is not null and gps_at is not null and gps_at>now()-interval '30 minutes'
    on conflict do nothing;
  delete from tank_log where at<now()-interval '14 days';
  for v in select * from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes' and coalesce(speed,0)<=3 loop
    select bool_or(coalesce(speed,0)>5) into moved from tank_log where vehicle_id=v.id and at>v.gps_at-make_interval(mins=>coalesce((c->>'win')::int,90));
    if coalesce(moved,false) then continue; end if;
    select max(tank) into before_max from tank_log where vehicle_id=v.id and at between v.gps_at-make_interval(mins=>coalesce((c->>'win')::int,90)) and v.gps_at-interval '15 minutes';
    select percentile_cont(0.5) within group (order by tank) into now_lvl from (select tank from tank_log where vehicle_id=v.id order by at desc limit 3) q;
    if before_max is null or now_lvl is null then continue; end if;
    if before_max-now_lvl >= coalesce((c->>'drop')::numeric,20)
       and not exists(select 1 from fleet_events where vehicle_id=v.id and kind='fuel_drop' and at>now()-make_interval(mins=>coalesce((c->>'cool')::int,180))) then
      select driver into drv from rides where vehicle_id=v.id order by start_at desc limit 1;
      insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,src)
        values(v.id,v.plate,'fuel_drop',drv,(select name from places p where abs(p.lat-v.lat)<0.01 and abs(p.lon-v.lon)<0.015 order by power(p.lat-v.lat,2)+power(p.lon-v.lon,2) limit 1),'stop',round(before_max-now_lvl),v.lat,v.lon,'nadrz');
      if t is not null then
        msg:='⚠️ '||coalesce(v.plate,v.name)||': pokles nafty o '||round(before_max-now_lvl)||' l v stojacom aute ('||round(before_max)||' → '||round(now_lvl)||' l)'||
             case when coalesce(v.ign,0)=0 then ' · motor vypnutý' else '' end||' · '||to_char(now() at time zone 'Europe/Bratislava','HH24:MI');
        perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,
          'click','https://maps.google.com/?q='||v.lat||','||v.lon));
      end if; k:=k+1;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_check() from public, anon, authenticated;

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

-- ===== spätné doplnenie príchodov / odchodov / odchodov po státí z jázd (iba minulosť, bez upozornení) =====
create or replace function public.fleet_backfill_moves(p_since timestamptz, p_until timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; x int; mn int;
begin
  select coalesce((value->>'min')::int,30) into mn from fleet_cfg where key='stop'; mn:=coalesce(mn,30);
  drop table if exists _bfr;
  create temp table _bfr on commit drop as
    select q.*, (select p.id from places p where q.lat_stop is not null and p.lat between q.lat_stop-0.03 and q.lat_stop+0.03 and p.lon between q.lon_stop-0.045 and q.lon_stop+0.045
                   and 6371000*2*asin(sqrt(power(sin(radians(q.lat_stop-p.lat)/2),2)+cos(radians(p.lat))*cos(radians(q.lat_stop))*power(sin(radians(q.lon_stop-p.lon)/2),2)))<=case when p.kind='fuel' then greatest(p.r,150) else p.r end
                 order by power(q.lat_stop-p.lat,2)+power(q.lon_stop-p.lon,2) limit 1) pid
    from (select r.*, lead(ride_id) over w nid, lead(start_at) over w nstart, lead(driver) over w ndrv
            from rides r where r.start_at>=p_since-interval '1 day' and r.start_at<p_until and r.start_at is not null window w as (partition by vehicle_id order by start_at)) q
    where q.stop_at>=p_since and q.stop_at<p_until;
  -- príchod na miesto
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,lat,lon,ride_id,src)
    select b.vehicle_id,b.plate,'in',b.stop_at,nullif(trim(b.driver),''),p.name,p.kind,b.lat_stop,b.lon_stop,b.ride_id,'jazdy'
      from _bfr b join places p on p.id=b.pid
     where not exists(select 1 from fleet_events e where e.vehicle_id=b.vehicle_id and e.kind in ('in','yard_in') and e.ride_id is null and e.at between b.stop_at-interval '30 minutes' and b.stop_at+interval '30 minutes')
    on conflict (kind, ride_id) where ride_id is not null do nothing;
  get diagnostics x = row_count; k:=k+x;
  -- odchod z dvora / od odberateľa
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,lat,lon,ride_id,src)
    select b.vehicle_id,b.plate,'out',b.nstart,nullif(trim(coalesce(b.ndrv,b.driver)),''),p.name,p.kind,b.lat_stop,b.lon_stop,b.nid,'jazdy'
      from _bfr b join places p on p.id=b.pid
     where p.kind in ('yard','buyer') and b.nid is not null and b.nstart<p_until
       and not exists(select 1 from fleet_events e where e.vehicle_id=b.vehicle_id and e.kind in ('out','yard_out') and e.ride_id is null and e.at between b.nstart-interval '30 minutes' and b.nstart+interval '30 minutes')
    on conflict (kind, ride_id) where ride_id is not null do nothing;
  get diagnostics x = row_count; k:=k+x;
  -- pohlo sa po státí (aspoň nastavený čas)
  insert into fleet_events(vehicle_id,plate,kind,at,driver,place,place_kind,minutes,lat,lon,ride_id,src)
    select b.vehicle_id,b.plate,'depart',b.nstart,nullif(trim(coalesce(b.ndrv,b.driver)),''),(select name from places p where p.id=b.pid),'stop',floor(extract(epoch from b.nstart-b.stop_at)/60),b.lat_stop,b.lon_stop,b.nid,'jazdy'
      from _bfr b
     where b.nid is not null and b.nstart<p_until and b.nstart-b.stop_at>=make_interval(mins=>mn)
       and not exists(select 1 from fleet_events e where e.vehicle_id=b.vehicle_id and e.kind='depart' and e.ride_id is null and e.at between b.nstart-interval '30 minutes' and b.nstart+interval '30 minutes')
    on conflict (kind, ride_id) where ride_id is not null do nothing;
  get diagnostics x = row_count; k:=k+x;
  return k;
end $$;
revoke all on function public.fleet_backfill_moves(timestamptz,timestamptz) from public, anon, authenticated;

-- ===== štatistika vodičov za obdobie (nafta, natankované podľa vodiča v čase tankovania, výdaj z dvora, rýchlosť, poklesy) =====
create or replace function public.fleet_drv_stats(p_from timestamptz, p_to timestamptz) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb; dz numeric; dd numeric; tl numeric; sh numeric; res jsonb;
begin
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}'::jsonb);
  dd:=coalesce((c->>'diesel')::numeric,1.952); dz:=dd/1.23; tl:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100);
  with r as (
    select x.*, coalesce(nullif(trim(x.plate),''),x.vehicle_id,'?') auto,
      case when nullif(trim(coalesce(x.driver,'')),'') is null then 'neznámy vodič' else trim(x.driver) end drv
      from rides x where x.start_at>=p_from and x.start_at<p_to),
  rf as (  -- tankovanie (karta) patrí vodičovi, ktorý bol v tom čase na aute
    select coalesce(case when fleet_real_drv(r.driver) then r.drv end,
             (select trim(y.driver) from rides y where y.vehicle_id=r.vehicle_id and fleet_real_drv(y.driver) and y.start_at between r.start_at-interval '24 hours' and r.start_at+interval '24 hours'
               order by abs(extract(epoch from y.start_at-r.start_at)) limit 1), r.drv) drv, r.auto, r.refuel_l l
      from r where r.refuel_l>0),
  yd as (  -- výdaj z nádrže na dvore
    select coalesce(nullif(trim(f.driver),''),
             (select trim(y.driver) from rides y where fleet_plate(y.plate)=fleet_plate(f.plate) and fleet_real_drv(y.driver)
                and y.start_at between (f.day::timestamp at time zone 'Europe/Bratislava')-interval '1 day' and (f.day::timestamp at time zone 'Europe/Bratislava')+interval '2 days'
               order by abs(extract(epoch from y.start_at-((f.day::timestamp+time '12:00') at time zone 'Europe/Bratislava'))) limit 1),'neznámy vodič') drv,
           coalesce(nullif(trim(f.plate),''),'?') auto, f.liters l
      from yard_fuel f where f.kind='vydaj' and (f.day::timestamp at time zone 'Europe/Bratislava')>=date_trunc('day',p_from at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava'
        and (f.day::timestamp at time zone 'Europe/Bratislava')<p_to),
  ev as (select coalesce(nullif(trim(driver),''),'neznámy vodič') drv, count(*) n from fleet_events where kind='fuel_drop' and at>=p_from and at<p_to group by 1),
  multi as (select auto from r group by auto having count(distinct drv)>1),
  pc as (select drv, auto, sum(coalesce(distance,0)) km, sum(coalesce(fuel_consumed,0)) l,
           sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0) lok, sum(distance) filter (where distance>0 and fuel_consumed>0) kok
           from r group by drv, auto),
  pcr as (select drv, auto, sum(l) l from rf group by drv, auto),
  names as (select drv from r union select drv from rf union select drv from yd),
  d as (
    select n.drv,
      coalesce((select sum(coalesce(distance,0)) from r where r.drv=n.drv),0) km,
      coalesce((select sum(coalesce(fuel_consumed,0)) from r where r.drv=n.drv),0) l,
      coalesce((select sum(fuel_consumed) filter (where distance>0 and fuel_consumed>0) from r where r.drv=n.drv),0) lok,
      coalesce((select sum(distance) filter (where distance>0 and fuel_consumed>0) from r where r.drv=n.drv),0) kok,
      coalesce((select sum(l) from rf where rf.drv=n.drv),0) karta,
      coalesce((select sum(l) from yd where yd.drv=n.drv),0) dvor,
      (select count(*) from r where r.drv=n.drv and r.max_speed>90) over90,
      (select max(max_speed) from r where r.drv=n.drv) mx,
      coalesce((select ev.n from ev where ev.drv=n.drv),0) drops,
      exists(select 1 from r join multi m on m.auto=r.auto where r.drv=n.drv) mult,
      (select coalesce(jsonb_agg(jsonb_build_object('auto',pc.auto,'km',round(pc.km),'litre',round(pc.l),
          'l_100km',case when pc.km>=100 and pc.kok>20 then to_jsonb(round(pc.lok/pc.kok*100,1)) else '"málo dát"'::jsonb end,
          'natankovane_l',round(coalesce((select pcr.l from pcr where pcr.drv=pc.drv and pcr.auto=pc.auto),0)),
          'viac_vodicov',exists(select 1 from multi m where m.auto=pc.auto)) order by pc.km desc),'[]'::jsonb) from pc where pc.drv=n.drv) auta
    from names n)
  select coalesce(jsonb_agg(jsonb_build_object(
      'vodic',drv,'km',round(km),'litre',round(l),
      'l_100km',case when km>=100 and kok>20 then to_jsonb(round(lok/kok*100,1)) else '"málo dát"'::jsonb end,
      'malo_dat',km<100,
      'natankovane_l',round(karta+dvor),'natankovane_karta_l',round(karta),'vydaj_z_dvora_l',round(dvor),
      'rozdiel_l',round(l-karta-dvor),'rozdiel_pct',case when l>0 then round((l-karta-dvor)/l*100,1) end,
      'rozdiel_eur_bez_dph',round((l-karta-dvor)*dz),
      'prekrocenia_90',over90,'max_rychlost',mx,'poklesy_paliva',drops,
      'naklad_nafta_myto_eur_km_bez_dph',case when km>0 then round((l*dz+km*sh/100*tl)/km,3) end,
      'poznamka',case when mult then 'viac vodičov na aute, rozdiel orientačný' end,
      'auta',auta) order by (l-karta-dvor) desc),'[]'::jsonb) into res
  from d where km>0 or karta>0 or dvor>0;
  return jsonb_build_object('cena_nafty_bez_dph',round(dz,3),'cena_nafty_s_dph',dd,'vodici',res);
end $$;
revoke all on function public.fleet_drv_stats(timestamptz,timestamptz) from public, anon, authenticated;

-- ===== bilancia nádrže na dvore (nakúpené − vydané − stav) =====
create or replace function public.yard_balance() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare nk numeric; vy numeric; st numeric; sd date; nst numeric; res jsonb;
begin
  -- počíta sa od posledného zadaného stavu „stav“ (inventúra); bez neho od začiatku
  select day, tank_after into sd, nst from yard_fuel where kind='stav' order by day desc, id desc limit 1;
  select coalesce(sum(liters) filter (where kind='nakup'),0), coalesce(sum(liters) filter (where kind='vydaj'),0) into nk, vy from yard_fuel
    where sd is null or (day, id) > (sd, (select max(id) from yard_fuel where kind='stav' and day=sd));
  select tank_after into st from yard_fuel where tank_after is not null order by day desc, id desc limit 1;
  if nk=0 and vy=0 and st is null then return jsonb_build_object('stav','nezadané'); end if;
  res:=jsonb_build_object('pociatocny_stav_l',nst,'od',sd,'nakupene_l',round(nk),'vydane_l',round(vy),'stav_nadrze_l',st,
    'rozdiel_l',case when st is not null then round(coalesce(nst,0)+nk-vy-st) end,
    'rozdiel_pct',case when st is not null and coalesce(nst,0)+nk>0 then round((coalesce(nst,0)+nk-vy-st)/(coalesce(nst,0)+nk)*100,1) end);
  return res;
end $$;
revoke all on function public.yard_balance() from public, anon, authenticated;
