-- ERNTE – mzdy vodičov: súradnice jázd (kraj / mimo kraja) + nastavenie
alter table rides add column if not exists lat_start numeric;
alter table rides add column if not exists lon_start numeric;
alter table rides add column if not exists lat_stop numeric;
alter table rides add column if not exists lon_stop numeric;
insert into fleet_cfg(key,value) values('pay','{"base":1031,"inReg":80,"outReg":90,"minKm":10}') on conflict(key) do nothing;
drop policy if exists fcfg_rw on fleet_cfg;
create policy fcfg_rw on fleet_cfg for all using (is_fleet() and (key<>'pay' or is_owner())) with check (is_fleet() and (key<>'pay' or is_owner()));
create or replace function public.cmd_sync() returns text language plpgsql security definer set search_path=public, extensions, net as $$
declare r record; j jsonb; p jsonb; f jsonb; n int:=0; a text; base text:='https://online.commander-systems.com/api/v1/'; d date; e bigint; s bigint;
begin
  a:=cmd_auth(); if a is null then return 'chýbajú prihlasovacie údaje'; end if;
  for r in select l.id,l.kind,l.url,h.status_code,h.content from cmd_log l join net._http_response h on h.id=l.id where not l.done loop
    if r.status_code=200 then
      begin
        j:=r.content::jsonb;
        if r.kind='vehicles' then
          for p in select * from jsonb_array_elements(case when jsonb_typeof(j)='array' then j else coalesce(j->'vehicles',j->'data','[]'::jsonb) end) loop
            insert into cmd_vehicles(id,name,plate,last_comm) values(p->>'vehicleId',p->>'vehicleName',p->>'vehicleRegistrationPlate',null)
              on conflict(id) do update set name=excluded.name,plate=excluded.plate,last_comm=excluded.last_comm;
            update trucks set cmd_id=p->>'vehicleId'
             where upper(regexp_replace(spz,'[^A-Za-z0-9]','','g'))=upper(regexp_replace(coalesce(p->>'vehicleRegistrationPlate',''),'[^A-Za-z0-9]','','g'));
          end loop;
        elsif r.kind='pos' then
          for p in select * from jsonb_array_elements(coalesce(j->'positions','[]'::jsonb)) loop
            insert into cmd_vehicles(id,lat,lon,gps_at,speed,ign,tank,odometer,engine_hours,voltage,updated_at)
              values(p->>'vehicleId',cmd_num(p->>'gpsLat'),cmd_num(p->>'gpsLon'),to_timestamp(cmd_num(p->>'gpsTime')),cmd_num(p->>'gpsSpeed')::int,cmd_num(p->>'carIgnition')::int,
                nullif(cmd_num(p->>'canTankValue'),0),nullif(cmd_num(p->>'canOdometer'),0),nullif(cmd_num(p->>'canEngineHours'),0),cmd_num(p->>'voltage'),now())
              on conflict(id) do update set lat=excluded.lat,lon=excluded.lon,gps_at=excluded.gps_at,speed=excluded.speed,ign=excluded.ign,
                tank=coalesce(excluded.tank,cmd_vehicles.tank),odometer=coalesce(excluded.odometer,cmd_vehicles.odometer),engine_hours=coalesce(excluded.engine_hours,cmd_vehicles.engine_hours),voltage=excluded.voltage,updated_at=now();
            update trucks set gps_lat=cmd_num(p->>'gpsLat'),gps_lon=cmd_num(p->>'gpsLon'),gps_at=to_timestamp(cmd_num(p->>'gpsTime')),gps_speed=cmd_num(p->>'gpsSpeed')::int,
              gps_ign=cmd_num(p->>'carIgnition')::int,tank=coalesce(nullif(cmd_num(p->>'canTankValue'),0),tank),odometer=coalesce(nullif(cmd_num(p->>'canOdometer'),0),odometer)
             where cmd_id=p->>'vehicleId'; n:=n+1;
          end loop;
        elsif r.kind='rides' then
          for p in select * from jsonb_array_elements(coalesce(j->'rides',j->'data','[]'::jsonb)) loop
            insert into rides(ride_id,vehicle_id,plate,driver,ride_type,start_at,stop_at,start_addr,stop_addr,lat_start,lon_start,lat_stop,lon_stop,distance,duration,avg_speed,max_speed,fuel_consumed,avg_cons,fuel_start,fuel_stop,odo_start,odo_stop,refuel_l,refuel_eur,note)
            values(p->>'rideId',p->>'vehicleId',p->>'vehicleRegistrationPlate',p->>'driverName',p->>'rideType',to_timestamp(cmd_num(p->>'startTime')),to_timestamp(cmd_num(p->>'stopTime')),
              p->>'startAddress',p->>'stopAddress',cmd_num(p->>'latStart'),cmd_num(p->>'lonStart'),cmd_num(p->>'latStop'),cmd_num(p->>'lonStop'),cmd_num(p->>'distance'),cmd_num(p->>'duration')::int,cmd_num(p->>'avgSpeed'),cmd_num(p->>'maxSpeed')::int,
              nullif(cmd_num(p->>'fuelConsumed'),0),nullif(cmd_num(p->>'averageConsumption'),0),nullif(cmd_num(p->>'fuelLevelStart'),0),nullif(cmd_num(p->>'fuelLevelStop'),0),
              cmd_num(p->>'odometerStart'),cmd_num(p->>'odometerStop'),
              (select sum(cmd_num(x->>'volume')) from jsonb_array_elements(case when jsonb_typeof(p->'refueling')='array' then p->'refueling' else '[]'::jsonb end) x),
              (select sum(cmd_num(x->>'priceVatExc')) from jsonb_array_elements(case when jsonb_typeof(p->'refueling')='array' then p->'refueling' else '[]'::jsonb end) x),
              p->>'note')
            on conflict(ride_id) do update set lat_start=excluded.lat_start,lon_start=excluded.lon_start,lat_stop=excluded.lat_stop,lon_stop=excluded.lon_stop,start_addr=excluded.start_addr,driver=excluded.driver,ride_type=excluded.ride_type,stop_at=excluded.stop_at,stop_addr=excluded.stop_addr,distance=excluded.distance,duration=excluded.duration,
              avg_speed=excluded.avg_speed,max_speed=excluded.max_speed,fuel_consumed=excluded.fuel_consumed,avg_cons=excluded.avg_cons,fuel_stop=excluded.fuel_stop,odo_stop=excluded.odo_stop,refuel_l=excluded.refuel_l,refuel_eur=excluded.refuel_eur,note=excluded.note;
          end loop;
          if cmd_num(j->>'totalPages')>cmd_num(j->>'page') and r.url is not null then
            insert into cmd_log(id,kind,url) values(net.http_get(url:=regexp_replace(r.url,'page=\d+','page='||(cmd_num(j->>'page')::int+1)),headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'rides',regexp_replace(r.url,'page=\d+','page='||(cmd_num(j->>'page')::int+1)));
          end if;
        end if;
      exception when others then null; end;
    end if;
    update cmd_log set done=true, code=r.status_code where id=r.id;
  end loop;
  delete from cmd_log where at < now()-interval '3 days' and kind<>'backfill';
  if not exists(select 1 from cmd_log where kind='vehicles' and at>now()-interval '6 hours') then
    insert into cmd_log(id,kind) values(net.http_get(url:=base||'vehicles',headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'vehicles');
  end if;
  insert into cmd_log(id,kind) values(net.http_get(url:=base||'last-positions?limit=1000',headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'pos');
  -- jazdy: posledných 26 h každých 10 min
  if not exists(select 1 from cmd_log where kind='rides' and at>now()-interval '10 minutes') then
    e:=extract(epoch from now())::bigint; s:=e-26*3600;
    insert into cmd_log(id,kind,url) select net.http_get(url:=u,headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'rides',u
      from (select base||'all-rides?datetimeStart='||s||'&datetimeEnd='||e||'&limit=1000&page=1' as u) q;
  end if;
  -- jednorazovo história 60 dní (po dňoch, 6 dní na jeden beh)
  for d in select g::date from generate_series(current_date-60,current_date-1,'1 day') g
            where not exists(select 1 from cmd_log b where b.kind='backfill' and b.url=g::date::text) order by g desc limit 6 loop
    s:=extract(epoch from d::timestamp at time zone 'Europe/Bratislava')::bigint; e:=s+86400;
    insert into cmd_log(id,kind,url) select net.http_get(url:=u,headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'rides',u
      from (select base||'all-rides?datetimeStart='||s||'&datetimeEnd='||e||'&limit=1000&page=1' as u) q;
    insert into cmd_log(id,kind,url,done) values(-(extract(epoch from d)::bigint),'backfill',d::text,true) on conflict do nothing;
  end loop;
  begin perform yard_check(); exception when others then null; end;
  return 'ok, spracovaných polôh: '||n||', jázd v databáze: '||(select count(*) from rides);
end $$;
revoke all on function public.cmd_sync() from public, anon, authenticated;
-- jazdy za 60 dní načítať znova so súradnicami
delete from cmd_log where kind='backfill';
select public.cmd_sync();
