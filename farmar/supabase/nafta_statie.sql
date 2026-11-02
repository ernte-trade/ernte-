-- ⛽ POKLES NAFTY V STÁTÍ – nová detekcia za CELÉ státie (2. 11. 2026)
-- Krok snímača (~11 l), ktorý sa opakuje pri bežiacom motore v státí, NIE je samostatný alarm.
-- Alarm iba keď ČISTÝ pokles za celé státie (hladina ustálená 10 min pred a 10 min po státí) > 30 l
-- A ZÁROVEŇ > odhad voľnobehu (3 l/h × čas s bežiacim motorom). Kroky v jednom státí = jedna udalosť (src_key 'stp:').
-- Rovnaký pokles v rovnakom čase na 3+ autách = flag 'chyba_dat' („podozrenie na chybu dát“) – bez € a bez upozornenia.
-- Státie sa určuje z polôh (pos_log + tank_log): rýchlosť > 3 km/h alebo posun ≥ 300 m = jazda (aj keď Commander nemá jazdy – Flotila EU).
-- Staré poklesy od 25. 10. sa prepočítajú: nezmažú sa, iba dostanú flag 'zlucene' / 'prepocet' (záloha fleet_events_statie_bak).

create table if not exists public.fleet_events_statie_bak(id bigint primary key, row jsonb not null, saved_at timestamptz not null default now());
alter table public.fleet_events_statie_bak enable row level security;
drop policy if exists fleet_events_statie_bak_own on public.fleet_events_statie_bak;
create policy fleet_events_statie_bak_own on public.fleet_events_statie_bak for select using (is_owner());

insert into fleet_cfg(key,value) values('fuel_stop',jsonb_build_object('min_l',30,'idle_lph',3,'settle_min',10,'multi_n',3,'multi_min',20,'move_kmh',3,'move_m',300,'gap_h',6))
  on conflict (key) do nothing;

create or replace function public.fuel_stop_scan(since timestamptz default now()-interval '30 hours') returns int language plpgsql security definer set search_path=public as $$
declare c jsonb; minl numeric; idle numeric; stm int; mn int; mm int; mkmh numeric; mvm numeric; gh numeric;
  s record; k int:=0; lf numeric; lt numeric; eh numeric; net numeric; td timestamptz; rng numeric; nlast int; ongoing boolean;
  v record; drv text; pl text; cf numeric; sk text; nst int; fl text; fn text; txt text; tz text:='Europe/Bratislava';
begin
  select value into c from fleet_cfg where key='fuel_stop'; c:=coalesce(c,'{}');
  minl:=coalesce((c->>'min_l')::numeric,30); idle:=coalesce((c->>'idle_lph')::numeric,3); stm:=coalesce((c->>'settle_min')::int,10);
  mn:=coalesce((c->>'multi_n')::int,3); mm:=coalesce((c->>'multi_min')::int,20); mkmh:=coalesce((c->>'move_kmh')::numeric,3); mvm:=coalesce((c->>'move_m')::numeric,300);
  gh:=coalesce((c->>'gap_h')::numeric,6);
  create temp table if not exists _fss(vid text, t_drop timestamptz, net numeric) on commit drop;
  truncate _fss;
  for s in
    with vs as (select distinct t.vehicle_id vid from tank_log t where t.at>=since-interval '1 hour'),
    -- duplicitná GPS jednotka (alias) sa počíta iba keď hlavné auto nemá vlastné hladiny
    vv as (select vs.vid from vs left join cmd_vehicles cv on cv.id=vs.vid where cv.alias_of is null or not exists(select 1 from vs y where y.vid=cv.alias_of)),
    src as (select t.vehicle_id vid, t.at, t.tank, t.speed, t.lat, t.lon from tank_log t join vv on vv.vid=t.vehicle_id where t.at>=since-interval '1 hour'
            union all
            select p.vehicle_id, p.at, null::numeric, p.speed, p.lat, p.lon from pos_log p join vv on vv.vid=p.vehicle_id where p.at>=since-interval '1 hour'),
    a as (select src.*, lag(at) over w pat, lag(lat) over w plat, lag(lon) over w plon from src window w as (partition by vid order by at)),
    b as (select a.*, (coalesce(speed,0)>mkmh or (plat is not null and lat is not null and place_dist_m(plat,plon,lat,lon)>=mvm)) mv,
                 (pat is not null and at-pat>make_interval(hours=>gh::int)) gp from a),
    g as (select b.*, sum(case when mv or gp then 1 else 0 end) over (partition by vid order by at rows unbounded preceding) gi,
                 max(at) over (partition by vid) last_at from b),
    stp as (select vid, gi, min(at) t_from, max(at) t_to, count(tank) nt, max(last_at) last_at,
                   percentile_cont(0.5) within group (order by lat) la, percentile_cont(0.5) within group (order by lon) lo
              from g where not mv group by vid, gi)
    select * from stp where nt>=2 and t_to>=since and t_to>t_from
  loop
    -- ustálená hladina: medián ±10 min okolo začiatku a konca státia
    select percentile_cont(0.5) within group (order by tank) into lf from tank_log
     where vehicle_id=s.vid and tank is not null and at between s.t_from-make_interval(mins=>stm) and s.t_from+make_interval(mins=>stm);
    ongoing:=s.t_to>=s.last_at;
    if ongoing then
      -- státie ešte trvá: vyhodnotiť iba keď je hladina posledných 10 min ustálená
      select percentile_cont(0.5) within group (order by tank), max(tank)-min(tank), count(*) into lt, rng, nlast from tank_log
       where vehicle_id=s.vid and tank is not null and at between s.t_to-make_interval(mins=>stm) and s.t_to;
      if coalesce(nlast,0)<2 or rng>12 then continue; end if;
    else
      select percentile_cont(0.5) within group (order by tank) into lt from tank_log
       where vehicle_id=s.vid and tank is not null and at between s.t_to-make_interval(mins=>stm) and s.t_to+make_interval(mins=>stm);
    end if;
    if lf is null or lt is null then continue; end if;
    net:=lf-lt;
    -- čas s bežiacim motorom v státí (medzi dvoma záznamami max. 15 min)
    select coalesce(sum(least(extract(epoch from nx-at),900)),0)/3600.0 into eh from (
      select at, ign, lead(at) over (order by at) nx from (
        select at, ign from tank_log where vehicle_id=s.vid and at between s.t_from and s.t_to
        union all select at, ign from pos_log where vehicle_id=s.vid and at between s.t_from and s.t_to) q) z
     where coalesce(ign,0)=1 and nx is not null;
    sk:='stp:'||s.vid||':'||floor(extract(epoch from s.t_from))::bigint;
    if net>=10 then
      select min(at) into td from tank_log where vehicle_id=s.vid and tank<=lf-net/2 and at between s.t_from and s.t_to+make_interval(mins=>stm);
      td:=coalesce(td,s.t_to);
      insert into _fss values(s.vid,td,net);
    end if;
    if not (net>minl and net>idle*eh) then
      -- ďalšie merania ukázali, že nejde o pokles → existujúci alarm tohto státia vyradiť (nemaže sa)
      update fleet_events set flag='prepocet', flag_note='po prepočte celého státia: čistý pokles '||round(net)||' l, voľnobeh ≈ '||round(idle*eh)||' l – nie je alarm'
       where src_key=sk and flag is null;
      continue;
    end if;
    select count(*) into nst from (select tank-lag(tank) over (order by at) dlt from tank_log where vehicle_id=s.vid and tank is not null and at between s.t_from and s.t_to) z where dlt<=-5;
    select * into v from cmd_vehicles where id=s.vid;
    select r.driver into drv from rides r where r.vehicle_id=any(veh_ids(s.vid)) and r.start_at<=s.t_to and nullif(trim(r.driver),'') is not null order by r.start_at desc limit 1;
    select coalesce((select name from place_near(s.la::numeric,s.lo::numeric)),
                    (select stop_addr from rides r where r.vehicle_id=any(veh_ids(s.vid)) and r.start_at<=s.t_to and r.stop_addr is not null order by r.start_at desc limit 1)) into pl;
    cf:=veh_calib_on(s.vid);
    fl:=case when cf is not null then 'kalibracia' when veh_off(s.vid) then 'servis' end;
    fn:=case when cf is not null then 'snímač nekalibrovaný – koeficient '||replace(cf::text,'.',',')||'; prepočítané ≈ '||round(net/cf)||' l (orientačne)' when veh_off(s.vid) then 'auto odstavené / na servise' end;
    txt:='státie '||to_char(s.t_from at time zone tz,'DD.MM HH24:MI')||' → '||to_char(s.t_to at time zone tz,'DD.MM HH24:MI')||case when ongoing then ' (ešte stojí)' else '' end
        ||' · hladina ustálená '||round(lf)||' → '||round(lt)||' l · čistý pokles '||round(net)||' l'
        ||' · motor bežal '||replace(round(eh,1)::text,'.',',')||' h → voľnobeh ≈ '||round(idle*eh)||' l'
        ||case when nst>1 then ' · '||nst||' krokov snímača zlúčených do jednej udalosti' else '' end;
    insert into fleet_events as e(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,minutes,note,src_key,flag,flag_note)
      values(s.vid,coalesce(v.plate,v.name),'fuel_drop',td,drv,round(net),pl,'stop',s.la,s.lo,s.t_from,s.t_to,round(lf),round(lt),floor(extract(epoch from s.t_to-s.t_from)/60)::int,txt,sk,fl,fn)
    on conflict (src_key) do update set at=excluded.at, liters=excluded.liters, t_to=excluded.t_to, lvl_from=excluded.lvl_from, lvl_to=excluded.lvl_to,
       minutes=excluded.minutes, note=excluded.note,
       flag=case when e.flag='prepocet' or e.flag is null then excluded.flag else e.flag end,
       flag_note=case when e.flag='prepocet' or e.flag is null then excluded.flag_note else e.flag_note end;
    k:=k+1;
  end loop;
  -- rovnaký pokles v rovnakom čase na 3+ autách = podozrenie na chybu dát (bez € a bez upozornenia)
  update fleet_events e set flag='chyba_dat',
         flag_note='podozrenie na chybu dát – rovnaký pokles v rovnakom čase (±'||mm||' min) na '||q.n||' autách; bez € a bez upozornenia'
    from (select e2.id, (select count(distinct coalesce(cv.alias_of,f.vid)) from _fss f left join cmd_vehicles cv on cv.id=f.vid
                          where abs(extract(epoch from f.t_drop-e2.at))<=mm*60) n
            from fleet_events e2 where e2.kind='fuel_drop' and e2.src_key like 'stp:%' and e2.at>=since-interval '1 hour' and e2.flag is null) q
   where e.id=q.id and q.n>=mn;
  return k;
end $$;
revoke all on function public.fuel_stop_scan(timestamptz) from public, anon, authenticated;

-- ochrana nafty každú minútu: iba zápis hladín (alarm „pokles v stojacom aute“ robí fuel_stop_scan za celé státie)
create or replace function public.fuel_check() returns integer language plpgsql security definer set search_path=public, extensions, net as $$
begin
  insert into tank_log(vehicle_id,at,tank,speed,ign,lat,lon)
    select id,gps_at,tank,speed,ign,lat,lon from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes'
    on conflict do nothing;
  delete from tank_log where at<now()-interval '120 days';
  return 0;
end $$;
revoke all on function public.fuel_check() from public, anon, authenticated;

-- medzi dvoma záznamami sondy: iba výpadok dát (> 6 h); pokles v státí rieši fuel_stop_scan
create or replace function public.fuel_gap_check(days integer default 1) returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare s record; k int:=0; drv text; pl text; moved numeric; v record; thr numeric;
begin
  thr:=coalesce((select (value->>'drop')::numeric from fleet_cfg where key='fuel'),20);
  for s in
    with x as (select vehicle_id, at, tank, speed, ign, lat, lon,
                 lag(at) over w p_at, lag(tank) over w p_tank, lag(lat) over w p_lat, lag(lon) over w p_lon
               from tank_log where at>now()-make_interval(days=>days) - interval '2 days' window w as (partition by vehicle_id order by at))
    select * from x where p_at is not null and at>now()-make_interval(days=>days) and p_tank-tank>=thr and at-p_at>interval '6 hours'
  loop
    if exists(select 1 from fuel_gap_seen where vehicle_id=s.vehicle_id and t_from=s.p_at) then continue; end if;
    insert into fuel_gap_seen values(s.vehicle_id,s.p_at) on conflict do nothing;
    select coalesce(sum(case when greatest(start_at,s.p_at)<least(coalesce(stop_at,start_at),s.at) then distance else 0 end),0) into moved
      from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<s.at and coalesce(stop_at,start_at)>s.p_at;
    if moved>2 then continue; end if;
    if s.lat is not null and s.p_lat is not null and abs(s.lat-s.p_lat)+abs(s.lon-s.p_lon)>0.02 then continue; end if;
    select driver into drv from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<=s.at and driver is not null order by start_at desc limit 1;
    select coalesce(p.name, (select stop_addr from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<=s.at and stop_addr is not null order by start_at desc limit 1)) into pl
      from (select 1) d left join places p on abs(p.lat-s.lat)<0.01 and abs(p.lon-s.lon)<0.015 limit 1;
    select * into v from cmd_vehicles where id=s.vehicle_id;
    insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,at,t_from,t_to,lvl_from,lvl_to,minutes,note)
      values(s.vehicle_id,v.plate,'data_gap',drv,pl,'stop',round(s.p_tank-s.tank),s.lat,s.lon,s.at,s.p_at,s.at,round(s.p_tank),round(s.tank),floor(extract(epoch from s.at-s.p_at)/60)::int,
        'výpadok dát '||replace(round(extract(epoch from s.at-s.p_at)/3600,1)::text,'.',',')||' h bez záznamu hladiny · rozdiel hladiny '||round(s.p_tank)||' → '||round(s.tank)||' l (nepočíta sa ako pokles v státí)');
    k:=k+1;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_gap_check(int) from public, anon, authenticated;

-- udalosti z jázd (posledná definícia 20261026-0105): pokles v státí medzi jazdami sa už nezapisuje (nahradené fuel_stop_scan), ostáva výpadok dát
create or replace function public.ride_events_since(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; n int; c jsonb; son boolean; mn int;
begin
  select value into c from fleet_cfg where key='stop'; son:=coalesce((c->>'on')::boolean,true); mn:=coalesce((c->>'min')::int,30);
  -- 1) rýchlosť nad 90 km/h
  insert into fleet_events(vehicle_id,plate,kind,at,driver,kmh,note,lat,lon,src_key)
    select r.vehicle_id,r.plate,'speed',r.start_at,r.driver,r.max_speed,'max '||r.max_speed||' km/h · jazda '||round(coalesce(r.distance,0))||' km',r.lat_start,r.lon_start,'spd:'||r.ride_id
      from rides r where r.start_at>=since and r.max_speed>90
    on conflict (src_key) do nothing;
  get diagnostics n=row_count; k:=k+n;
  -- 1b) nákladné N3 nad 100 km/h = skontrolovať obmedzovač rýchlosti
  insert into fleet_events(vehicle_id,plate,kind,at,driver,kmh,note,lat,lon,src_key)
    select r.vehicle_id,r.plate,'limiter',r.start_at,r.driver,r.max_speed,
           'max '||r.max_speed||' km/h · '||veh_type_name(veh_vtype(r.vehicle_id))||' (obmedzovač 90 km/h) · jazda '||round(coalesce(r.distance,0))||' km · '||coalesce(r.start_addr,'?')||' → '||coalesce(r.stop_addr,'?'),
           r.lat_start,r.lon_start,'lim:'||r.ride_id
      from rides r where r.start_at>=since and r.max_speed>100 and veh_vtype(r.vehicle_id) in ('tahac_n3','sklapac_n3')
    on conflict (src_key) do nothing;
  get diagnostics n=row_count; k:=k+n;
  -- 2) pokles nafty počas státia (medzi dvoma jazdami bez tankovania) a 3) odchod po státí
  create temp table if not exists _rev(ride_id text, vehicle_id text, plate text, driver text, start_at timestamptz, fuel_start numeric, refuel_l numeric,
    p_stop timestamptz, p_fuel numeric, p_drv text, p_lat numeric, p_lon numeric, p_addr text, gap interval) on commit drop;
  truncate _rev;
  insert into _rev select * from (
    select r.ride_id, r.vehicle_id, r.plate, r.driver, r.start_at, r.fuel_start, r.refuel_l,
           lag(r.stop_at) over w p_stop, lag(r.fuel_stop) over w p_fuel, lag(r.driver) over w p_drv, lag(r.lat_stop) over w p_lat, lag(r.lon_stop) over w p_lon, lag(r.stop_addr) over w p_addr
      from rides r where r.start_at>=since-interval '3 days' window w as (partition by r.vehicle_id order by r.start_at)) x
   where x.start_at>=since and x.p_stop is not null;
  -- najdlhšia medzera bez dát medzi dvoma hladinami (koniec jazdy, záznamy sondy, začiatok ďalšej jazdy)
  update _rev s set gap=veh_data_gap(s.vehicle_id,s.p_stop,s.start_at);
  insert into fleet_events(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,minutes,note,src_key)
    select s.vehicle_id,s.plate,case when s.gap>interval '6 hours' then 'data_gap' else 'fuel_drop' end,s.start_at,coalesce(nullif(trim(s.p_drv),''),s.driver),round(s.p_fuel-s.fuel_start),
           coalesce((select name from place_near(s.p_lat,s.p_lon)),s.p_addr),'stop',s.p_lat,s.p_lon,s.p_stop,s.start_at,round(s.p_fuel),round(s.fuel_start),floor(extract(epoch from s.gap)/60)::int,
           case when s.gap>interval '6 hours' then 'výpadok dát '||replace(round(extract(epoch from s.gap)/3600,1)::text,'.',',')||' h bez záznamu hladiny · ' else '' end||
           'státie '||to_char(s.p_stop at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' → '||to_char(s.start_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' · '||round(s.p_fuel)||' → '||round(s.fuel_start)||' l'
           ||case when s.gap>interval '6 hours' then ' (nepočíta sa ako pokles v státí)' else '' end,
           case when s.gap>interval '6 hours' then 'dgap:' else 'drp:' end||s.ride_id
      from _rev s where s.p_fuel is not null and s.fuel_start is not null and s.p_fuel-s.fuel_start>=25 and coalesce(s.refuel_l,0)=0 and s.gap>interval '6 hours'  -- pokles v státí rieši fuel_stop_scan (celé státie), tu iba výpadok dát
       and not exists(select 1 from fleet_events e where e.src_key in ('drp:'||s.ride_id,'dgap:'||s.ride_id))
       and not exists(select 1 from fleet_events e where e.vehicle_id=s.vehicle_id and e.kind='fuel_drop' and e.src_key is null and e.at between s.p_stop-interval '10 minutes' and s.start_at+interval '10 minutes')
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

-- každých 5 min (alarm pokles nafty sa posiela až po 12 min – príznak „chyba dát“ stihne pred upozornením)
do $$ begin
  begin perform cron.unschedule('nafta-statie'); exception when others then null; end;
  perform cron.schedule('nafta-statie','*/5 * * * *','select public.fuel_stop_scan(now()-interval ''30 hours'')');
end $$;

-- ===== Flotila EU: jazdy z polôh, keď Commander nemá km (existujúca pos_day_rides, iba dni bez jazdy s km) =====
do $$ begin
  if to_regprocedure('public.pos_day_rides(date)') is not null then
    begin perform public.pos_day_rides(date '2026-10-25');
    exception when others then
      insert into check_err as c(fn,msg,at) values('pos_day_rides',left(SQLERRM,500),now()) on conflict(fn) do update set msg=excluded.msg, at=now(), n=coalesce(c.n,0)+1;
    end;
    if not exists(select 1 from cron.job where jobname='pos-day') then
      perform cron.schedule('pos-day','*/10 * * * *','select public.pos_day_rides()');
    end if;
  end if;
end $$;

-- ===== prepočet od 25. 10.: záloha → nová detekcia → staré poklesy označiť (nič sa nemaže) =====
insert into public.fleet_events_statie_bak(id,row)
  select e.id, to_jsonb(e) from fleet_events e where e.kind='fuel_drop' and e.at>=timestamptz '2026-10-25 00:00+02'
  on conflict (id) do nothing;

select public.fuel_stop_scan(timestamptz '2026-10-25 00:00+02') as nove_statia;

-- prepočítané udalosti sa neposielajú do mobilu
insert into push_fev(id,done_at,res)
  select e.id, now(), 'prepočet 2. 11.' from fleet_events e where e.kind='fuel_drop' and e.src_key like 'stp:%' and e.at<now()-interval '15 minutes'
  on conflict (id) do nothing;

update fleet_events o set flag='zlucene',
       flag_note='prepočet 2. 11.: zlúčené do udalosti celého státia #'||n.id||' (čistý pokles '||n.liters||' l)'
  from fleet_events n
 where o.kind='fuel_drop' and o.at>=timestamptz '2026-10-25 00:00+02' and coalesce(o.src_key,'') not like 'stp:%' and o.flag is null
   and n.kind='fuel_drop' and n.src_key like 'stp:%' and n.flag is null
   and (n.vehicle_id=o.vehicle_id or n.vehicle_id=veh_canon(o.vehicle_id) or veh_canon(n.vehicle_id)=veh_canon(o.vehicle_id))
   and coalesce(o.t_from,o.at)-interval '10 minutes'<=n.t_to and coalesce(o.t_to,o.at)+interval '10 minutes'>=n.t_from;

update fleet_events o set flag='prepocet',
       flag_note='prepočet 2. 11.: za celé státie čistý pokles do 30 l alebo v rámci voľnobehu (3 l/h pri bežiacom motore), prípadne auto podľa polôh išlo – nie je alarm'
 where o.kind='fuel_drop' and o.at>=timestamptz '2026-10-25 00:00+02' and coalesce(o.src_key,'') not like 'stp:%' and o.flag is null;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-02','⛽ Pokles nafty v státí: za celé státie, bez falošných krokov snímača','Flotila → Alarmy / Ochrana nafty','iba majiteľ',array['owner'],
 'Pokles sa ráta za celé státie: hladina ustálená 10 min pred a 10 min po státí. Alarm je iba pri čistom poklese nad 30 l a zároveň nad odhadom voľnobehu (3 l/h × čas s bežiacim motorom). Opakované kroky snímača (~11 l) v jednom státí sú jedna udalosť. Ten istý pokles v rovnakom čase na 3 a viac autách = „podozrenie na chybu dát“ – bez € a bez upozornenia. Státie sa určuje z polôh (aj keď Commander nemá jazdy – Flotila EU), jazda podľa GPS sa nepočíta ako státie. Staré poklesy od 25. 10. sú prepočítané (nezmazané, záloha ostala).'
where not exists(select 1 from app_novinky where titul like '⛽ Pokles nafty v státí: za celé státie%');
