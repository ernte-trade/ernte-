-- PRESNÁ KONTROLA NAFTY: každý pokles v nádrži medzi dvoma meraniami, keď auto nejazdilo (aj cez výpadok signálu)
alter table fleet_events add column if not exists t_from timestamptz;
alter table fleet_events add column if not exists t_to timestamptz;
alter table fleet_events add column if not exists lvl_from numeric;
alter table fleet_events add column if not exists lvl_to numeric;
create table if not exists fuel_gap_seen(vehicle_id text, t_from timestamptz, primary key(vehicle_id,t_from));
alter table fuel_gap_seen enable row level security;
create or replace function public.fuel_gap_check(days int default 1) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare s record; t text; k int:=0; drv text; pl text; moved numeric; ignon boolean; v record; msg text; thr numeric;
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
    -- jazdilo auto medzi meraniami? (jazdy z Commandera alebo rýchlosť)
    select coalesce(sum(case when greatest(start_at,s.p_at)<least(coalesce(stop_at,start_at),s.at) then distance else 0 end),0) into moved
      from rides where vehicle_id=s.vehicle_id and start_at<s.at and coalesce(stop_at,start_at)>s.p_at;
    if moved>2 then continue; end if;   -- pokles počas jazdy = spotreba
    if s.lat is not null and s.p_lat is not null and abs(s.lat-s.p_lat)+abs(s.lon-s.p_lon)>0.02 then continue; end if; -- auto sa presunulo
    -- tankovanie medzi meraniami vylúči (hladina by stúpla) – tu ide o pokles, tak nič
    select bool_or(coalesce(ign,0)=1) into ignon from tank_log where vehicle_id=s.vehicle_id and at between s.p_at and s.at;
    select driver into drv from rides where vehicle_id=s.vehicle_id and start_at<=s.at and driver is not null order by start_at desc limit 1;
    select coalesce(p.name, (select stop_addr from rides where vehicle_id=s.vehicle_id and start_at<=s.at and stop_addr is not null order by start_at desc limit 1)) into pl
      from (select 1) d left join places p on abs(p.lat-s.lat)<0.01 and abs(p.lon-s.lon)<0.015;
    select * into v from cmd_vehicles where id=s.vehicle_id;
    insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,at,t_from,t_to,lvl_from,lvl_to,note)
      values(s.vehicle_id,v.plate,'fuel_drop',drv,pl,'fuel',round(s.p_tank-s.tank),s.lat,s.lon,s.at,s.p_at,s.at,round(s.p_tank),round(s.tank),
        case when s.at-s.p_at>interval '1 hour' then 'pokles počas výpadku signálu ('||round(extract(epoch from s.at-s.p_at)/3600,1)||' h)' else 'pokles medzi meraniami' end
        ||case when coalesce(ignon,false) then ', motor bežal' else ', motor vypnutý' end);
    k:=k+1;
    if t is not null and s.at>now()-interval '3 hours' then
      msg:='⚠️ '||coalesce(v.plate,s.vehicle_id)||': pokles nafty '||round(s.p_tank)||' → '||round(s.tank)||' l (−'||round(s.p_tank-s.tank)||' l) medzi '
        ||to_char(s.p_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' a '||to_char(s.at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||', auto stálo'||coalesce(' · '||pl,'')||coalesce(' · '||drv,'');
      perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,'click','https://maps.google.com/?q='||s.lat||','||s.lon));
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_gap_check(int) from public, anon, authenticated;
create or replace function public.fuel_gap_tick() returns int language sql security definer set search_path=public as $$ select public.fuel_gap_check(1) $$;
revoke all on function public.fuel_gap_tick() from public, anon, authenticated;

-- NAFTOVÁ BILANCIA po autách (pre AI a aplikáciu): začiatok + natankované − spotrebované jazdou − koniec = nevysvetlený úbytok
create or replace function public.fuel_balance(days int default 7) returns jsonb language sql stable security definer set search_path=public as $$
  with v as (select id, coalesce(plate,name,id) auto from cmd_vehicles),
  a as (select v.id, v.auto,
     (select tank from tank_log where vehicle_id=v.id and at>=now()-make_interval(days=>days) order by at asc limit 1) l_zac,
     (select to_char(min(at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from tank_log where vehicle_id=v.id and at>=now()-make_interval(days=>days)) t_zac,
     (select tank from tank_log where vehicle_id=v.id order by at desc limit 1) l_kon,
     (select to_char(max(at) at time zone 'Europe/Bratislava','DD.MM HH24:MI') from tank_log where vehicle_id=v.id) t_kon,
     (select coalesce(sum(refuel_l),0) from rides where vehicle_id=v.id and start_at>=now()-make_interval(days=>days)) nat,
     (select coalesce(sum(fuel_consumed),0) from rides where vehicle_id=v.id and start_at>=now()-make_interval(days=>days)) spotr,
     (select coalesce(sum(distance),0) from rides where vehicle_id=v.id and start_at>=now()-make_interval(days=>days)) km,
     (select count(*) from fleet_events where vehicle_id=v.id and kind in ('fuel_drop','refuel_gap') and at>=now()-make_interval(days=>days)) alarmy
   from v)
  select coalesce(jsonb_agg(jsonb_build_object('auto',auto,'od',t_zac,'do',t_kon,'nadrz_zaciatok_l',round(l_zac),'natankovane_l',round(nat),'spotreba_jazdou_l',round(spotr),'nadrz_koniec_l',round(l_kon),'km',round(km),
     'nevysvetleny_ubytok_l',case when l_zac is not null and l_kon is not null then round(l_zac+nat-spotr-l_kon) end,'alarmy_nafty',alarmy) order by (l_zac+nat-spotr-l_kon) desc nulls last),'[]') from a $$;
revoke all on function public.fuel_balance(int) from public, anon, authenticated;

-- napojenie do pravidelnej kontroly (každé 2 min s Commanderom)
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
-- jednorazovo prejdi históriu 14 dní (bez upozornení na telefón)
select public.fuel_gap_check(14);
