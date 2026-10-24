-- ERNTE – upozornenie, keď auto opustí miesto, kde stálo aspoň X minút (predvolené 30)
create table if not exists veh_stop(vehicle_id text primary key, lat numeric, lon numeric, since timestamptz);
alter table veh_stop enable row level security;
alter table fleet_events add column if not exists minutes int;
alter table fleet_events add column if not exists lat numeric;
alter table fleet_events add column if not exists lon numeric;
insert into fleet_cfg(key,value) values('stop','{"min":30,"on":true}') on conflict(key) do nothing;

create or replace function public.stop_check() returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare v record; s record; cfg jsonb; mn int; t text; d numeric; dur int; pl text; drv text; k int:=0; msg text;
begin
  select value into cfg from fleet_cfg where key='stop';
  if cfg is null or not coalesce((cfg->>'on')::boolean,true) then return 0; end if;
  mn:=coalesce((cfg->>'min')::int,30);
  select value->>'topic' into t from fleet_cfg where key='notify';
  for v in select * from cmd_vehicles where lat is not null and gps_at>now()-interval '30 minutes' loop
    select * into s from veh_stop where vehicle_id=v.id;
    if not found then insert into veh_stop values(v.id,v.lat,v.lon,v.gps_at); continue; end if;
    d:=6371000*2*asin(sqrt(power(sin(radians(v.lat-s.lat)/2),2)+cos(radians(s.lat))*cos(radians(v.lat))*power(sin(radians(v.lon-s.lon)/2),2)));
    if d>300 then
      dur:=floor(extract(epoch from (v.gps_at-s.since))/60);
      if dur>=mn then
        select name into pl from places p where 6371000*2*asin(sqrt(power(sin(radians(s.lat-p.lat)/2),2)+cos(radians(p.lat))*cos(radians(s.lat))*power(sin(radians(s.lon-p.lon)/2),2)))<=greatest(p.r,300)
          order by power(s.lat-p.lat,2)+power(s.lon-p.lon,2) limit 1;
        select driver into drv from rides where vehicle_id=v.id order by start_at desc limit 1;
        insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,minutes,lat,lon) values(v.id,v.plate,'depart',drv,pl,'stop',dur,s.lat,s.lon);
        if t is not null then
          msg:=coalesce(v.plate,v.name)||' sa pohlo po '||case when dur>=60 then (dur/60)||' h '||(dur%60)||' min' else dur||' min' end||' státia'
               ||coalesce(' · '||pl,'')||coalesce(' · '||drv,'')||' · '||to_char(now() at time zone 'Europe/Bratislava','HH24:MI');
          perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Auto sa pohlo','message',msg,'tags',jsonb_build_array('arrow_forward'),'priority',3,
            'click','https://maps.google.com/?q='||s.lat||','||s.lon));
        end if;
        k:=k+1;
      end if;
      update veh_stop set lat=v.lat,lon=v.lon,since=v.gps_at where vehicle_id=v.id;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.stop_check() from public, anon, authenticated;

create or replace function public.yard_check() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; begin
  begin perform osm_sync(); exception when others then null; end;
  begin k:=place_check(); exception when others then null; end;
  begin k:=k+stop_check(); exception when others then null; end;
  return k; end $$;
select public.stop_check();
