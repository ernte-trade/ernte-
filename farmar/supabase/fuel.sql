-- ERNTE – ochrana nafty: krádež zo stojaceho auta, nesedí tankovanie, nadmerná spotreba
create table if not exists tank_log(vehicle_id text, at timestamptz, tank numeric, speed int, ign int, lat numeric, lon numeric, primary key(vehicle_id, at));
create index if not exists tank_log_at on tank_log(at);
alter table tank_log enable row level security;
drop policy if exists tlog_read on tank_log; create policy tlog_read on tank_log for select using (is_fleet());
create table if not exists fuel_checked(ride_id text primary key, at timestamptz default now());
alter table fuel_checked enable row level security;
alter table fleet_events add column if not exists liters numeric;
insert into fleet_cfg(key,value) values('fuel','{"drop":20,"win":90,"gap":30,"cool":180}') on conflict(key) do nothing;

create or replace function public.fuel_check() returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare c jsonb; v record; t text; k int:=0; before_max numeric; now_lvl numeric; moved boolean; drv text; r record; exp numeric; gap numeric; msg text;
begin
  select value into c from fleet_cfg where key='fuel'; if c is null then c:='{"drop":20,"win":90,"gap":30,"cool":180}'; end if;
  select value->>'topic' into t from fleet_cfg where key='notify';
  -- 1) záznam hladiny
  insert into tank_log(vehicle_id,at,tank,speed,ign,lat,lon)
    select id,gps_at,tank,speed,ign,lat,lon from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes'
    on conflict do nothing;
  delete from tank_log where at<now()-interval '14 days';
  -- 2) pokles nafty v stojacom aute
  for v in select * from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes' and coalesce(speed,0)<=3 loop
    -- auto sa za okno nepohlo?
    select bool_or(coalesce(speed,0)>5) into moved from tank_log where vehicle_id=v.id and at>v.gps_at-make_interval(mins=>(c->>'win')::int);
    if coalesce(moved,false) then continue; end if;
    select max(tank) into before_max from tank_log where vehicle_id=v.id and at between v.gps_at-make_interval(mins=>(c->>'win')::int) and v.gps_at-interval '15 minutes';
    -- aktuálna hladina = medián posledných 3 meraní (proti výkyvom snímača)
    select percentile_cont(0.5) within group (order by tank) into now_lvl from (select tank from tank_log where vehicle_id=v.id order by at desc limit 3) q;
    if before_max is null or now_lvl is null then continue; end if;
    if before_max-now_lvl >= (c->>'drop')::numeric
       and not exists(select 1 from fleet_events where vehicle_id=v.id and kind='fuel_drop' and at>now()-make_interval(mins=>(c->>'cool')::int)) then
      select driver into drv from rides where vehicle_id=v.id order by start_at desc limit 1;
      insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon)
        values(v.id,v.plate,'fuel_drop',drv,(select name from places p where abs(p.lat-v.lat)<0.01 and abs(p.lon-v.lon)<0.015 order by power(p.lat-v.lat,2)+power(p.lon-v.lon,2) limit 1),'fuel',round(before_max-now_lvl),v.lat,v.lon);
      if t is not null then
        msg:='⚠️ '||coalesce(v.plate,v.name)||': pokles nafty o '||round(before_max-now_lvl)||' l v stojacom aute ('||round(before_max)||' → '||round(now_lvl)||' l)'||
             case when coalesce(v.ign,0)=0 then ' · motor vypnutý' else '' end||' · '||to_char(now() at time zone 'Europe/Bratislava','HH24:MI');
        perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,
          'click','https://maps.google.com/?q='||v.lat||','||v.lon));
      end if; k:=k+1;
    end if;
  end loop;
  -- 3) tankovanie nesedí s nárastom v nádrži (karta vs. sonda)
  for r in select * from rides where refuel_l>0 and fuel_start is not null and fuel_stop is not null and stop_at>now()-interval '3 days'
            and not exists(select 1 from fuel_checked f where f.ride_id=rides.ride_id) loop
    exp:=r.fuel_start+r.refuel_l-coalesce(r.fuel_consumed,0);
    gap:=exp-r.fuel_stop;
    if gap>=greatest((c->>'gap')::numeric, r.refuel_l*0.08) then
      insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,at)
        values(r.vehicle_id,r.plate,'refuel_gap',r.driver,r.stop_addr,'fuel',round(gap),r.stop_at);
      if t is not null then
        perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Tankovanie nesedí','message',
          coalesce(r.plate,'')||': natankovaných '||round(r.refuel_l)||' l, v nádrži pribudlo o ~'||round(gap)||' l menej'||coalesce(' · '||r.driver,'')||' · '||to_char(r.stop_at at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
          'tags',jsonb_build_array('fuelpump','warning'),'priority',4));
      end if; k:=k+1;
    end if;
    insert into fuel_checked(ride_id) values(r.ride_id) on conflict do nothing;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_check() from public, anon, authenticated;

create or replace function public.yard_check() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; begin
  begin perform osm_sync(); exception when others then null; end;
  begin k:=place_check(); exception when others then null; end;
  begin k:=k+stop_check(); exception when others then null; end;
  begin k:=k+fuel_check(); exception when others then null; end;
  return k; end $$;
-- staré jazdy netestovať (iba nové od teraz)
insert into fuel_checked(ride_id) select ride_id from rides where stop_at<now()-interval '1 day' on conflict do nothing;
select public.fuel_check();
