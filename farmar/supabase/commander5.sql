-- ERNTE – km z GPS pre autá, ktorým Commander nedáva knihu jázd s km (EU ťahače)
-- 1) poloha všetkých áut každé 2 min (pos_log)  2) denné km z tachometra alebo zo súčtu GPS úsekov
-- 3) za deň bez jazdy s km z Commandera sa vytvorí „jazda z GPS“ (ride_type POS_DAY) – počíta sa do km, obratu, zisku, miezd aj AI
-- Keď Commander neskôr pošle skutočné jazdy s km, jazda z GPS sa zmaže. Dá sa spustiť znova.
create table if not exists pos_log(vehicle_id text not null, at timestamptz not null, lat numeric, lon numeric, speed int, ign int, odo numeric, primary key(vehicle_id, at));
alter table pos_log enable row level security;
drop policy if exists pos_log_read on pos_log; create policy pos_log_read on pos_log for select using (is_fleet());
create index if not exists pos_log_at on pos_log(at);

create or replace function public.pos_log_tick() returns int language plpgsql security definer set search_path=public as $$
declare k int; begin
  insert into pos_log(vehicle_id,at,lat,lon,speed,ign,odo)
    select id,gps_at,lat,lon,speed,ign,odometer from cmd_vehicles where lat is not null and gps_at>now()-interval '30 minutes' and not coalesce(deleted,false)
    on conflict do nothing;
  get diagnostics k=row_count;
  if extract(minute from now())::int % 60 < 2 then delete from pos_log where at<now()-interval '400 days'; end if;
  return k;
end $$;
revoke all on function public.pos_log_tick() from public, anon, authenticated;

create or replace function public.pos_day_rides(d0 date default null) returns int language plpgsql security definer set search_path=public as $$
declare v record; d date; k int:=0; a timestamptz; b timestamptz; x record; drv text; pl text;
begin
  for d in select g::date from generate_series(coalesce(d0,(now() at time zone 'Europe/Bratislava')::date-2),(now() at time zone 'Europe/Bratislava')::date,'1 day') g loop
    a:=d::timestamp at time zone 'Europe/Bratislava'; b:=a+interval '1 day';
    -- jedno auto = jeden záznam: pri dvoch GPS jednotkách s rovnakou ŠPZ (alebo zlúčených) sa berie tá s najviac polohami
    for v in select distinct on (kk) q.id from (select vehicle_id id, count(*) n from pos_log where at>=a and at<b group by 1) q
               cross join lateral (select coalesce((select coalesce(nullif(upper(regexp_replace(coalesce(t.plate,''),'\s','','g')),''),t.id)
                                                    from cmd_vehicles c join cmd_vehicles t on t.id=coalesce(to_jsonb(c)->>'alias_of',c.id) where c.id=q.id), q.id) kk) z
             order by kk, n desc loop
      -- skutočná jazda s km z Commandera v ten deň → jazda z GPS netreba
      if exists(select 1 from rides r where r.vehicle_id=v.id and r.start_at>=a and r.start_at<b and coalesce(r.distance,0)>0 and coalesce(r.ride_type,'')<>'POS_DAY') then
        delete from rides where ride_id='pos:'||v.id||':'||d; continue;
      end if;
      with p as (select at,lat,lon,speed,odo,lag(lat) over w plat,lag(lon) over w plon,lag(at) over w pat from pos_log where vehicle_id=v.id and at>=a and at<b window w as (order by at)),
      s as (select *,2*6371*asin(least(1,sqrt(power(sin(radians(lat-plat)/2),2)+cos(radians(plat))*cos(radians(lat))*power(sin(radians(lon-plon)/2),2)))) dkm,
                   extract(epoch from at-pat) dt from p where plat is not null)
      select (select sum(dkm) from s where dt>0 and dkm/(dt/3600.0)<140) gkm,
             (select max(odo)-min(odo) from p where odo>0) okm,
             (select sum(dt) from s where dt>0 and dt<900 and (coalesce(speed,0)>3 or dkm>0.3)) mv,
             (select max(speed) from p) vmax,
             (select min(at) from s where coalesce(speed,0)>3 or dkm>0.3) t0, (select max(at) from s where coalesce(speed,0)>3 or dkm>0.3) t1,
             (select lat from p order by at limit 1) la0,(select lon from p order by at limit 1) lo0,(select lat from p order by at desc limit 1) la1,(select lon from p order by at desc limit 1) lo1,
             (select min(odo) from p where odo>0) o0,(select max(odo) from p where odo>0) o1
        into x;
      if coalesce(case when x.okm>0 and x.okm<1600 then x.okm end, x.gkm*1.04,0) < 2 then delete from rides where ride_id='pos:'||v.id||':'||d; continue; end if;
      select coalesce(nullif(trim(c.plate),''),c.name) into pl from cmd_vehicles c where c.id=v.id;
      select r.driver into drv from rides r where r.vehicle_id=v.id and nullif(trim(r.driver),'') is not null order by r.start_at desc limit 1;
      if drv is null then select t.driver into drv from trucks t where upper(regexp_replace(coalesce(t.spz,''),'\s','','g'))=upper(regexp_replace(coalesce(pl,''),'\s','','g')) limit 1; end if;
      insert into rides(ride_id,vehicle_id,plate,driver,ride_type,start_at,stop_at,start_addr,stop_addr,lat_start,lon_start,lat_stop,lon_stop,distance,duration,max_speed,odo_start,odo_stop,note)
        values('pos:'||v.id||':'||d,v.id,pl,drv,'POS_DAY',coalesce(x.t0,a),coalesce(x.t1,x.t0,a),null,null,x.la0,x.lo0,x.la1,x.lo1,
               round(coalesce(case when x.okm>0 and x.okm<1600 then x.okm end, x.gkm*1.04)::numeric,1),coalesce(x.mv,0)::int,x.vmax,x.o0,x.o1,
               case when x.okm>0 and x.okm<1600 then 'km z tachometra (GPS jednotka)' else 'km zo súčtu GPS polôh' end)
        on conflict(ride_id) do update set distance=excluded.distance,duration=excluded.duration,start_at=excluded.start_at,stop_at=excluded.stop_at,
          lat_stop=excluded.lat_stop,lon_stop=excluded.lon_stop,max_speed=excluded.max_speed,odo_stop=excluded.odo_stop,driver=coalesce(rides.driver,excluded.driver),plate=excluded.plate,note=excluded.note;
      k:=k+1;
    end loop;
  end loop;
  return k;
end $$;
revoke all on function public.pos_day_rides(date) from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('pos-log','pos-day');
select cron.schedule('pos-log','*/2 * * * *','select public.pos_log_tick()');
select cron.schedule('pos-day','*/10 * * * *','select public.pos_day_rides()');
select public.pos_log_tick() as ulozene_polohy;
