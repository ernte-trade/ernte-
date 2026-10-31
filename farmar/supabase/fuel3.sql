-- ERNTE / VALKO – nafta: prečerpanie medzi autami, tankovanie vs. nádrž (|rozdiel| > 20 l a > 5 %),
-- opravená naftová bilancia (prvý a posledný záznam hladiny v okne + výdaj z dvora), aktívne auto bez signálu 12 h,
-- rozpis pevných nákladov po vozidlách (iba majiteľ). Nahrádza krok 5 v ride_events_since (events.sql),
-- časť 3 vo fuel_check (fuel.sql) a fuel_balance (fuel2.sql).

alter table fleet_events add column if not exists minutes int;
alter table fleet_events add column if not exists t_from timestamptz;
alter table fleet_events add column if not exists t_to timestamptz;
alter table fleet_events add column if not exists lvl_from numeric;
alter table fleet_events add column if not exists lvl_to numeric;
create index if not exists fev_kind_at on fleet_events(kind, at desc);

-- rozpis pevných nákladov po vozidlách vidí a mení iba majiteľ
drop policy if exists fcfg_rw on fleet_cfg;
create policy fcfg_rw on fleet_cfg for all using (is_fleet() and (key not in ('pay','revenue','vehcost') or is_owner())) with check (is_fleet() and (key not in ('pay','revenue','vehcost') or is_owner()));

-- ===== 1) TANKOVANIE vs. NÁDRŽ =====
-- nárast v nádrži = hladina po tankovaní (najvyššia z: koniec jazdy, začiatok ďalšej jazdy bez tankovania, sonda do 3 h) − hladina na začiatku jazdy + spotreba jazdou
create or replace function public.refuel_eval(rid text) returns table(refuel numeric, rise numeric, diff numeric, pct numeric, bad boolean, ready boolean)
language sql stable security definer set search_path=public as $$
  with r as (select * from rides where ride_id=rid and refuel_l>0 and fuel_start is not null and fuel_stop is not null),
  n as (select x.fuel_start, x.start_at, coalesce(x.refuel_l,0) rl from rides x, r where x.vehicle_id=r.vehicle_id and x.ride_id<>r.ride_id
          and x.start_at>=coalesce(r.stop_at,r.start_at) and x.start_at<coalesce(r.stop_at,r.start_at)+interval '24 hours' order by x.start_at limit 1),
  t as (select max(tl.tank) mx from tank_log tl, r where tl.vehicle_id=r.vehicle_id and r.stop_at is not null
          and tl.at between r.stop_at and least(coalesce((select start_at from n), r.stop_at+interval '3 hours'), r.stop_at+interval '3 hours')),
  a as (select r.refuel_l,
          greatest(r.fuel_stop, coalesce((select fuel_start from n where rl=0), r.fuel_stop), coalesce((select mx from t), r.fuel_stop)) - r.fuel_start + coalesce(r.fuel_consumed,0) rise,
          (exists(select 1 from n) or coalesce(r.stop_at,r.start_at) < now()-interval '3 hours') ready
        from r)
  select refuel_l, round(rise), round(refuel_l-rise), round(abs(refuel_l-rise)/nullif(refuel_l,0)*100,1),
         abs(refuel_l-rise)>20 and abs(refuel_l-rise)>0.05*refuel_l, ready from a $$;
revoke all on function public.refuel_eval(text) from public, anon, authenticated;

create or replace function public.refuel_gap_sync(since timestamptz) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare k int:=0; n int; t text; e record;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  -- zruš alarmy, ktoré podmienku nesplnia (napr. 265 l natankované = 265 l nárast)
  delete from fleet_events fe where fe.kind='refuel_gap' and fe.at>=since-interval '2 days'
     and fe.src_key like 'gap:%'
     and exists(select 1 from rides r where r.ride_id=substr(fe.src_key,5))
     and not coalesce((select q.bad and q.ready from refuel_eval(substr(fe.src_key,5)) q),false);
  get diagnostics n=row_count;
  for e in
    with x as (
      insert into fleet_events as f(vehicle_id,plate,kind,at,driver,liters,place,place_kind,note,src_key)
      select r.vehicle_id,coalesce(r.plate,(select plate from cmd_vehicles where id=r.vehicle_id)),'refuel_gap',coalesce(r.stop_at,r.start_at),r.driver,abs(q.diff),r.stop_addr,'fuel',
             'natankované '||round(q.refuel)||' l · nárast v nádrži '||q.rise||' l · rozdiel '||case when q.diff>0 then '−' else '+' end||abs(q.diff)||' l ('||replace(q.pct::text,'.',',')||' %)'
             ||case when q.diff>0 then ' – v nádrži pribudlo menej, ako bolo natankované' else ' – v nádrži pribudlo viac, ako je na doklade' end,
             'gap:'||r.ride_id
        from rides r cross join lateral refuel_eval(r.ride_id) q
       where coalesce(r.stop_at,r.start_at)>=since and r.refuel_l>0 and q.bad and q.ready
      on conflict (src_key) do update set liters=excluded.liters, note=excluded.note
      returning f.plate, f.note, f.at, f.driver, (xmax=0) isnew)
    select * from x
  loop
    if e.isnew then k:=k+1;
      if t is not null and e.at>now()-interval '6 hours' then
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Tankovanie nesedí','message',
          coalesce(e.plate,'')||': '||e.note||coalesce(' · '||e.driver,'')||' · '||to_char(e.at at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
          'tags',jsonb_build_array('fuelpump','warning'),'priority',4)); exception when others then null; end;
      end if;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.refuel_gap_sync(timestamptz) from public, anon, authenticated;

-- udalosti z jázd (rovnaké ako doteraz, krok 5 = nová kontrola tankovania)
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
  -- 2) pokles nafty počas státia (medzi dvoma jazdami bez tankovania) a 3) odchod po státí
  create temp table if not exists _rev(ride_id text, vehicle_id text, plate text, driver text, start_at timestamptz, fuel_start numeric, refuel_l numeric,
    p_stop timestamptz, p_fuel numeric, p_drv text, p_lat numeric, p_lon numeric, p_addr text) on commit drop;
  truncate _rev;
  insert into _rev select * from (
    select r.ride_id, r.vehicle_id, r.plate, r.driver, r.start_at, r.fuel_start, r.refuel_l,
           lag(r.stop_at) over w p_stop, lag(r.fuel_stop) over w p_fuel, lag(r.driver) over w p_drv, lag(r.lat_stop) over w p_lat, lag(r.lon_stop) over w p_lon, lag(r.stop_addr) over w p_addr
      from rides r where r.start_at>=since-interval '3 days' window w as (partition by r.vehicle_id order by r.start_at)) x
   where x.start_at>=since and x.p_stop is not null;
  insert into fleet_events(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,note,src_key)
    select s.vehicle_id,s.plate,'fuel_drop',s.start_at,coalesce(nullif(trim(s.p_drv),''),s.driver),round(s.p_fuel-s.fuel_start),
           coalesce((select name from place_near(s.p_lat,s.p_lon)),s.p_addr),'stop',s.p_lat,s.p_lon,
           'státie '||to_char(s.p_stop at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' → '||to_char(s.start_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' · '||round(s.p_fuel)||' → '||round(s.fuel_start)||' l','drp:'||s.ride_id
      from _rev s where s.p_fuel is not null and s.fuel_start is not null and s.p_fuel-s.fuel_start>=25 and coalesce(s.refuel_l,0)=0
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

-- živá kontrola: záznam hladiny + pokles v stojacom aute (tankovanie rieši refuel_gap_sync v ride_events)
create or replace function public.fuel_check() returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare c jsonb; v record; t text; k int:=0; before_max numeric; now_lvl numeric; moved boolean; drv text; msg text;
begin
  select value into c from fleet_cfg where key='fuel'; if c is null then c:='{"drop":20,"win":90,"gap":30,"cool":180}'; end if;
  select value->>'topic' into t from fleet_cfg where key='notify';
  -- 1) záznam hladiny
  insert into tank_log(vehicle_id,at,tank,speed,ign,lat,lon)
    select id,gps_at,tank,speed,ign,lat,lon from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes'
    on conflict do nothing;
  delete from tank_log where at<now()-interval '120 days';
  -- 2) pokles nafty v stojacom aute
  for v in select * from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes' and coalesce(speed,0)<=3 loop
    select bool_or(coalesce(speed,0)>5) into moved from tank_log where vehicle_id=v.id and at>v.gps_at-make_interval(mins=>(c->>'win')::int);
    if coalesce(moved,false) then continue; end if;
    select max(tank) into before_max from tank_log where vehicle_id=v.id and at between v.gps_at-make_interval(mins=>(c->>'win')::int) and v.gps_at-interval '15 minutes';
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
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,
          'click','https://maps.google.com/?q='||v.lat||','||v.lon)); exception when others then null; end;
      end if; k:=k+1;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_check() from public, anon, authenticated;

-- ===== 2) MOŽNÉ PREČERPANIE MEDZI AUTAMI =====
-- jednému autu v státí klesne hladina o 30+ l a inému autu do 3 h na tom istom mieste (do 300 m) stúpne o 30+ l bez tankovania z karty a bez výdaja z dvora
create or replace function public.fuel_transfer_check(since timestamptz default now()-interval '3 days', push boolean default true) returns int
language plpgsql security definer set search_path=public, extensions, net as $$
declare t text; k int:=0; m record; tz text:='Europe/Bratislava'; f text:='DD.MM HH24:MI'; msg text; isnew boolean;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  create temp table if not exists _fseg(vehicle_id text, plate text, key text, t_from timestamptz, t_to timestamptz, l_from numeric, l_to numeric,
    lat numeric, lon numeric, driver text, addr text, card boolean, live boolean) on commit drop;
  truncate _fseg;
  -- ukončené státia medzi dvoma jazdami
  insert into _fseg
  select x.vehicle_id, coalesce(nullif(trim(x.plate),''),(select plate from cmd_vehicles where id=x.vehicle_id),x.vehicle_id), x.p_ride, x.p_stop, x.start_at, x.p_fuel, x.fuel_start,
         coalesce(x.p_lat,x.lat_start), coalesce(x.p_lon,x.lon_start),
         case when not fleet_unknown(x.p_drv) then trim(x.p_drv) when not fleet_unknown(x.driver) then trim(x.driver) end, x.p_addr,
         coalesce(x.refuel_l,0)>0 or (coalesce(x.p_refuel,0)>0 and x.p_fuel-coalesce(x.p_fstart,x.p_fuel)+coalesce(x.p_cons,0) < x.p_refuel-30), false
    from (select r.*, lag(r.ride_id) over w p_ride, lag(r.stop_at) over w p_stop, lag(r.fuel_stop) over w p_fuel, lag(r.driver) over w p_drv,
                 lag(r.lat_stop) over w p_lat, lag(r.lon_stop) over w p_lon, lag(r.stop_addr) over w p_addr,
                 lag(r.refuel_l) over w p_refuel, lag(r.fuel_start) over w p_fstart, lag(r.fuel_consumed) over w p_cons
            from rides r where r.start_at>=since-interval '3 days' window w as (partition by r.vehicle_id order by r.start_at)) x
   where x.p_stop is not null and x.start_at>=since and x.start_at>=x.p_stop and x.p_fuel is not null and x.fuel_start is not null
     and (x.p_lat is null or x.lat_start is null or geo_m(x.p_lat,x.p_lon,x.lat_start,x.lon_start)<=300);
  -- práve prebiehajúce státie (auto stojí na mieste poslednej jazdy)
  insert into _fseg
  select v.id, coalesce(v.plate,v.name,v.id), l.ride_id, l.stop_at, v.gps_at, l.fuel_stop,
         coalesce((select percentile_cont(0.5) within group (order by tank) from (select tank from tank_log where vehicle_id=v.id and at>l.stop_at order by at desc limit 3) q), v.tank),
         coalesce(l.lat_stop,v.lat), coalesce(l.lon_stop,v.lon), case when not fleet_unknown(l.driver) then trim(l.driver) end, l.stop_addr,
         coalesce(l.refuel_l,0)>0 and l.fuel_stop-coalesce(l.fuel_start,l.fuel_stop)+coalesce(l.fuel_consumed,0) < l.refuel_l-30, true
    from cmd_vehicles v cross join lateral (select * from rides where vehicle_id=v.id order by start_at desc limit 1) l
   where l.stop_at is not null and l.fuel_stop is not null and v.tank is not null and v.gps_at>l.stop_at and v.gps_at>now()-interval '1 hour'
     and coalesce(v.speed,0)<=3 and l.stop_at>=since-interval '1 day'
     and (v.lat is null or l.lat_stop is null or geo_m(v.lat,v.lon,l.lat_stop,l.lon_stop)<=300);
  for m in
    select d.vehicle_id d_vid, d.plate d_pl, d.key d_key, d.t_from d_from, d.t_to d_to, d.l_from d_lf, d.l_to d_lt, d.driver d_drv, d.live d_live,
           u.vehicle_id u_vid, u.plate u_pl, u.key u_key, u.t_from u_from, u.t_to u_to, u.l_from u_lf, u.l_to u_lt, u.driver u_drv, u.live u_live,
           d.lat, d.lon, round(geo_m(d.lat,d.lon,u.lat,u.lon)) dist,
           coalesce((select name from place_near(d.lat,d.lon)), d.addr, u.addr) pl
      from _fseg d join _fseg u on u.vehicle_id<>d.vehicle_id
     where d.l_from-d.l_to>=30 and u.l_to-u.l_from>=30 and not u.card
       and d.lat is not null and u.lat is not null and abs(d.lat-u.lat)<0.01 and abs(d.lon-u.lon)<0.015 and geo_m(d.lat,d.lon,u.lat,u.lon)<=300
       and u.t_from<=d.t_to+interval '3 hours' and u.t_to>=d.t_from
       and not exists(select 1 from yard_fuel y where y.kind='vydaj'
             and (y.vehicle_id=u.vehicle_id or upper(replace(coalesce(y.plate,''),' ',''))=upper(replace(u.plate,' ','')))
             and y.day between (u.t_from at time zone tz)::date and (u.t_to at time zone tz)::date)
  loop
    msg:=m.d_pl||': −'||round(m.d_lf-m.d_lt)||' l ('||round(m.d_lf)||' → '||round(m.d_lt)||' l), státie '||to_char(m.d_from at time zone tz,f)||' – '||case when m.d_live then 'teraz' else to_char(m.d_to at time zone tz,f) end
       ||', vodič '||coalesce(m.d_drv,'neznámy')||' ⇒ '||m.u_pl||': +'||round(m.u_lt-m.u_lf)||' l ('||round(m.u_lf)||' → '||round(m.u_lt)||' l), státie '
       ||to_char(m.u_from at time zone tz,f)||' – '||case when m.u_live then 'teraz' else to_char(m.u_to at time zone tz,f) end||', vodič '||coalesce(m.u_drv,'neznámy')
       ||' · autá '||m.dist||' m od seba · bez tankovania z karty a bez výdaja z dvora · stupeň VYSOKÝ';
    insert into fleet_events as e(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,note,src_key)
      values(m.d_vid,m.d_pl||' → '||m.u_pl,'fuel_transfer',least(m.d_to,m.u_to),coalesce(m.d_drv,'?')||' → '||coalesce(m.u_drv,'?'),round(least(m.d_lf-m.d_lt,m.u_lt-m.u_lf)),
             m.pl,'stop',m.lat,m.lon,least(m.d_from,m.u_from),greatest(m.d_to,m.u_to),round(m.d_lf),round(m.d_lt),msg,'xfer:'||m.d_key||':'||m.u_key)
      on conflict (src_key) do update set note=excluded.note, liters=excluded.liters, at=excluded.at, t_to=excluded.t_to, lvl_to=excluded.lvl_to
      returning (xmax=0) into isnew;
    if isnew then k:=k+1; end if;
    if isnew and push and t is not null and least(m.d_to,m.u_to)>now()-interval '6 hours' then
      begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÉ PREČERPANIE NAFTY','message','⚠️ '||msg,
        'tags',jsonb_build_array('rotating_light'),'priority',5,'click','https://maps.google.com/?q='||m.lat||','||m.lon)); exception when others then null; end;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_transfer_check(timestamptz,boolean) from public, anon, authenticated;
create or replace function public.fuel_transfer_tick() returns int language sql security definer set search_path=public as $$ select public.fuel_transfer_check(now()-interval '3 days', true) $$;
revoke all on function public.fuel_transfer_tick() from public, anon, authenticated;

-- ===== 3) AKTÍVNE AUTO BEZ SIGNÁLU =====
-- auto s viac ako 300 km za 7 dní, nie odstavené, bez polohy viac ako 12 h → alarm stupňa STREDNÝ (hodiny sa priebežne aktualizujú)
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

-- ===== 4) NAFTOVÁ BILANCIA po autách =====
-- od/do = prvý a posledný záznam hladiny v okne (sonda aj začiatok/koniec jázd), natankované z karty + výdaj z dvora v tom istom úseku
create or replace function public.fuel_balance(days int default 7) returns jsonb language sql stable security definer set search_path=public as $$
  with p as (select now()-make_interval(days=>days) w0, round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3) cb),
  v as (select id, coalesce(plate,name,id) auto, upper(replace(coalesce(plate,''),' ','')) pn from cmd_vehicles),
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
          (select count(*) from fleet_events e, p where e.vehicle_id=b.id and e.kind in ('fuel_drop','refuel_gap','fuel_transfer') and e.at>=p.w0) alarmy
        from b),
  r as (select a.*, p.cb, a.t0 is not null and a.t1>a.t0 ok,
          a.spotr-(a.nat+a.dvor+a.l0-a.l1) chyba   -- kladné = spotreba je väčšia ako natankované + pokles hladiny
        from a, p)
  select coalesce(jsonb_agg(jsonb_build_object(
     'auto',auto,
     'od',to_char(t0 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'do',to_char(t1 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),
     'nadrz_zaciatok_l',round(l0),'natankovane_l',round(nat),'vydaj_z_dvora_l',round(dvor),'spotreba_jazdou_l',round(spotr),'nadrz_koniec_l',round(l1),'km',round(km),
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

-- ===== napojenie do pravidelnej kontroly (každé 2 min s Commanderom) =====
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
  return k;
end $$;
revoke all on function public.yard_check() from public, anon, authenticated;

-- jednorazovo: prepočítaj alarmy tankovania za október (zruší zhodné 265 vs 265 l), prečerpanie spätne za október (bez upozornení), bez signálu teraz
select public.refuel_gap_sync('2026-10-01 00:00 Europe/Bratislava'::timestamptz);
select public.fuel_transfer_check('2026-10-01 00:00 Europe/Bratislava'::timestamptz, false);
select public.no_signal_check();

-- ===== 26. 10. 2026: výpadok dát, rýchlosť podľa typu, obmedzovač, čas tankovania =====
-- VALKO flotila: VÝPADOK DÁT (medzera > 6 h medzi dvoma hladinami/polohami = nie pokles v státí, bez € straty),
-- rýchlosť podľa typu vozidla (N2/N3 > 90, M1/N1 > 130 km/h), alarm OBMEDZOVAČ (N3 > 100 km/h), čas tankovania pri „Tankovanie nesedí“,
-- naftová bilancia bez zlúčených duplicitných vozidiel.

-- najdlhšia medzera bez záznamu (začiatok/koniec úseku + záznamy hladiny zo sondy) v úseku od–do
create or replace function public.veh_data_gap(vid text, a timestamptz, b timestamptz) returns interval language sql stable security definer set search_path=public as $$
  select max(d) from (select t-lag(t) over (order by t) d from (select a t union all select tl.at from tank_log tl where tl.vehicle_id=vid and tl.at>a and tl.at<b union all select b) q) z $$;
revoke all on function public.veh_data_gap(text,timestamptz,timestamptz) from public, anon, authenticated;

-- udalosti z jázd: 1b obmedzovač, 2) pokles v státí iba pri dátach bez medzery nad 6 h, inak výpadok dát
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
      from _rev s where s.p_fuel is not null and s.fuel_start is not null and s.p_fuel-s.fuel_start>=25 and coalesce(s.refuel_l,0)=0
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

-- pokles medzi dvoma záznamami sondy: medzera nad 6 h = výpadok dát
create or replace function public.fuel_gap_check(days integer DEFAULT 1)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net'
AS $function$
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
    if s.at-s.p_at>interval '6 hours' then
      -- medzera bez dát nad 6 h = výpadok dát, nie pokles v státí (bez € straty a bez upozornenia)
      insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,at,t_from,t_to,lvl_from,lvl_to,minutes,note)
        values(s.vehicle_id,v.plate,'data_gap',drv,pl,'stop',round(s.p_tank-s.tank),s.lat,s.lon,s.at,s.p_at,s.at,round(s.p_tank),round(s.tank),floor(extract(epoch from s.at-s.p_at)/60)::int,
          'výpadok dát '||replace(round(extract(epoch from s.at-s.p_at)/3600,1)::text,'.',',')||' h bez záznamu hladiny · '||round(s.p_tank)||' → '||round(s.tank)||' l (nepočíta sa ako pokles v státí)');
      continue;
    end if;
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
end $function$;
revoke all on function public.fuel_gap_check(int) from public, anon, authenticated;

-- tankovanie nesedí: dátum a čas tankovania (z tankovacej karty Commandera, inak koniec jazdy)
create or replace function public.refuel_gap_sync(since timestamptz) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare k int:=0; n int; t text; e record;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  -- zruš alarmy, ktoré podmienku nesplnia (napr. 265 l natankované = 265 l nárast)
  delete from fleet_events fe where fe.kind='refuel_gap' and fe.at>=since-interval '2 days'
     and fe.src_key like 'gap:%'
     and exists(select 1 from rides r where r.ride_id=substr(fe.src_key,5))
     and not coalesce((select q.bad and q.ready from refuel_eval(substr(fe.src_key,5)) q),false);
  get diagnostics n=row_count;
  for e in
    with x as (
      insert into fleet_events as f(vehicle_id,plate,kind,at,driver,liters,place,place_kind,t_from,note,src_key)
      select r.vehicle_id,coalesce(r.plate,(select plate from cmd_vehicles where id=r.vehicle_id)),'refuel_gap',coalesce(r.stop_at,r.start_at),r.driver,abs(q.diff),r.stop_addr,'fuel',
             tk.t,
             'tankovanie '||to_char(tk.t at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI')||' · natankované '||round(q.refuel)||' l · nárast v nádrži '||q.rise||' l · rozdiel '||case when q.diff>0 then '−' else '+' end||abs(q.diff)||' l ('||replace(q.pct::text,'.',',')||' %)'
             ||case when q.diff>0 then ' – v nádrži pribudlo menej, ako bolo natankované' else ' – v nádrži pribudlo viac, ako je na doklade' end,
             'gap:'||r.ride_id
        from rides r cross join lateral refuel_eval(r.ride_id) q
        cross join lateral (select coalesce((select min(c.at) from cmd_refuel c where c.ride_id=r.ride_id),
                                            (select min(c.at) from cmd_refuel c where c.object_id=r.vehicle_id and c.at between r.start_at-interval '30 minutes' and coalesce(r.stop_at,r.start_at)+interval '30 minutes'),
                                            coalesce(r.stop_at,r.start_at)) t) tk
       where coalesce(r.stop_at,r.start_at)>=since and r.refuel_l>0 and q.bad and q.ready
      on conflict (src_key) do update set liters=excluded.liters, note=excluded.note, t_from=excluded.t_from
      returning f.plate, f.note, f.at, f.driver, (xmax=0) isnew)
    select * from x
  loop
    if e.isnew then k:=k+1;
      if t is not null and e.at>now()-interval '6 hours' then
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Tankovanie nesedí','message',
          coalesce(e.plate,'')||': '||e.note||coalesce(' · '||e.driver,'')||' · '||to_char(e.at at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
          'tags',jsonb_build_array('fuelpump','warning'),'priority',4)); exception when others then null; end;
      end if;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.refuel_gap_sync(timestamptz) from public, anon, authenticated;

-- hodnotenie vodičov: prekročenia rýchlosti podľa typu vozidla
create or replace function public.fleet_drv_eval(a timestamp with time zone, b timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c jsonb; p numeric; t numeric; sh numeric; r jsonb;
begin
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  p:=coalesce((c->>'diesel')::numeric,1.952)/1.23; t:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100);
  with rr as (select r.*, coalesce(nullif(trim(r.driver),''),'neznámy vodič') dn, coalesce(nullif(trim(r.plate),''),r.vehicle_id,'?') car from rides r where r.start_at>=a and r.start_at<b),
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
      count(*) filter (where max_speed>coalesce(veh_speed_lim(vehicle_id),90)) ov, max(max_speed) vmax from rr group by 1,2),
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
      'pocet_prekroceni_90',ov,'max_rychlost',vmax,'pocet_poklesov_paliva',coalesce(dp.n,0),
      'naklad_nafta_myto_eur_km_bez_dph',case when km>0 then round((l*p+km*sh/100*t)/km,3) end,
      'viac_vodicov_na_aute',mul,'poznamka',case when km<100 then 'málo dát' when mul then 'viac vodičov na aute, rozdiel orientačný' end,
      'auta',auta) order by (km<100), fleet_unknown(dr.dn), case when l>0 then (l-rk-ryd)/l end desc nulls last),'[]') into r
  from dr left join dp using (dn);
  return r;
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $function$;
revoke all on function public.fleet_drv_eval(timestamptz,timestamptz) from public, anon, authenticated;

-- naftová bilancia: iba unikátne vozidlá (zlúčené duplicity GPS jednotiek sa nepočítajú dvakrát)
create or replace function public.fuel_balance(days int default 7) returns jsonb language sql stable security definer set search_path=public as $$
  with p as (select now()-make_interval(days=>days) w0, round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3) cb),
  v as (select id, coalesce(plate,name,id) auto, upper(replace(coalesce(plate,''),' ','')) pn from cmd_vehicles where alias_of is null and not coalesce(deleted,false)),
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
          (select count(*) from fleet_events e, p where e.vehicle_id=b.id and e.kind in ('fuel_drop','refuel_gap','fuel_transfer') and e.at>=p.w0) alarmy
        from b),
  r as (select a.*, p.cb, a.t0 is not null and a.t1>a.t0 ok,
          a.spotr-(a.nat+a.dvor+a.l0-a.l1) chyba   -- kladné = spotreba je väčšia ako natankované + pokles hladiny
        from a, p)
  select coalesce(jsonb_agg(jsonb_build_object(
     'auto',auto,
     'od',to_char(t0 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'do',to_char(t1 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),
     'nadrz_zaciatok_l',round(l0),'natankovane_l',round(nat),'vydaj_z_dvora_l',round(dvor),'spotreba_jazdou_l',round(spotr),'nadrz_koniec_l',round(l1),'km',round(km),
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


-- ===== jednorazovo od 1. 7. 2026 =====
-- a) poklesy v státí s medzerou bez dát nad 6 h → výpadok dát (z jázd)
with e as (select f.id, f.src_key, c.ride_id, c.vehicle_id, c.start_at, c.fuel_start,
                  (select p.stop_at from rides p where p.vehicle_id=c.vehicle_id and p.start_at<c.start_at order by p.start_at desc limit 1) p_stop,
                  (select p.fuel_stop from rides p where p.vehicle_id=c.vehicle_id and p.start_at<c.start_at order by p.start_at desc limit 1) p_fuel
             from fleet_events f join rides c on c.ride_id=substr(f.src_key,5)
            where f.kind='fuel_drop' and f.src_key like 'drp:%' and f.at>='2026-07-01'),
     g as (select e.*, veh_data_gap(e.vehicle_id,e.p_stop,e.start_at) gap from e where e.p_stop is not null)
update fleet_events f set kind='data_gap', src_key='dgap:'||g.ride_id, t_from=g.p_stop, t_to=g.start_at, lvl_from=round(g.p_fuel), lvl_to=round(g.fuel_start),
       minutes=floor(extract(epoch from g.gap)/60)::int,
       note='výpadok dát '||replace(round(extract(epoch from g.gap)/3600,1)::text,'.',',')||' h bez záznamu hladiny · '||coalesce(f.note,'')||' (nepočíta sa ako pokles v státí)'
  from g where f.id=g.id and g.gap>interval '6 hours' and not exists(select 1 from fleet_events x where x.src_key='dgap:'||g.ride_id);
-- ostatné poklesy z jázd: doplň čas od–do a hladiny
update fleet_events f set t_from=p.stop_at, t_to=c.start_at, lvl_from=round(p.fuel_stop), lvl_to=round(c.fuel_start)
  from rides c cross join lateral (select stop_at, fuel_stop from rides p where p.vehicle_id=c.vehicle_id and p.start_at<c.start_at order by p.start_at desc limit 1) p
 where f.kind='fuel_drop' and f.src_key='drp:'||c.ride_id and f.t_from is null;
-- b) poklesy medzi dvoma záznamami sondy s medzerou nad 6 h → výpadok dát
update fleet_events set kind='data_gap', minutes=floor(extract(epoch from t_to-t_from)/60)::int,
       note='výpadok dát '||replace(round(extract(epoch from t_to-t_from)/3600,1)::text,'.',',')||' h bez záznamu hladiny · '||coalesce(lvl_from::text,'?')||' → '||coalesce(lvl_to::text,'?')||' l (nepočíta sa ako pokles v státí)'
 where kind='fuel_drop' and src_key is null and t_from is not null and t_to-t_from>interval '6 hours';
-- c) obmedzovač rýchlosti N3 nad 100 km/h spätne (bez upozornení)
insert into fleet_events(vehicle_id,plate,kind,at,driver,kmh,note,lat,lon,src_key)
  select r.vehicle_id,r.plate,'limiter',r.start_at,r.driver,r.max_speed,
         'max '||r.max_speed||' km/h · '||veh_type_name(veh_vtype(r.vehicle_id))||' (obmedzovač 90 km/h) · jazda '||round(coalesce(r.distance,0))||' km · '||coalesce(r.start_addr,'?')||' → '||coalesce(r.stop_addr,'?'),
         r.lat_start,r.lon_start,'lim:'||r.ride_id
    from rides r where r.start_at>='2026-07-01' and r.max_speed>100 and veh_vtype(r.vehicle_id) in ('tahac_n3','sklapac_n3')
  on conflict (src_key) do nothing;
-- d) rýchlosť M1/N1 do 130 km/h nie je porušenie (podľa typu vozidla)
delete from fleet_events e where e.kind='speed' and coalesce(e.kmh,0)<=coalesce(veh_speed_lim(e.vehicle_id),90);
-- e) čas tankovania pri „Tankovanie nesedí“ (prepočet od 1. 7.)
select public.refuel_gap_sync('2026-07-01 00:00 Europe/Bratislava'::timestamptz);

-- ===================== 26. 10. 2026 – AKTUÁLNE DEFINÍCIE (nahrádzajú staršie vyššie aj v iných súboroch) =====================
-- AI úprava 26. 10. 2026 (1/6): stav alarmov (nový / riešim / vyriešené / falošný), servis vozidla, zlúčenie duplicitných ŠPZ, unikátna ŠPZ

-- ===== stav alarmov =====
alter table fleet_events add column if not exists st text not null default 'novy';
alter table fleet_events add column if not exists st_note text;
alter table fleet_events add column if not exists st_at timestamptz;
alter table fleet_events add column if not exists st_by text;
alter table fleet_events add column if not exists flag text;        -- systémové označenie: kalibracia, artefakt, vypadok, servis
alter table fleet_events add column if not exists flag_note text;
do $$ begin
  alter table fleet_events add constraint fleet_events_st_chk check (st in ('novy','riesim','vyriesene','falosny'));
exception when duplicate_object then null; end $$;
create index if not exists fev_st on fleet_events(st) where st in ('novy','riesim');

-- alarmy počítané v aplikácii (bez riadku vo fleet_events) – stav podľa kľúča
create table if not exists alarm_st(
  key text primary key, status text not null default 'novy' check (status in ('novy','riesim','vyriesene','falosny')),
  note text, vehicle_id text, kind text, title text, at timestamptz not null default now(), by text);
alter table alarm_st enable row level security;
drop policy if exists alarm_st_read on alarm_st;
create policy alarm_st_read on alarm_st for select using (is_fleet());

create or replace function public.alarm_set(p_key text, p_status text, p_note text default null, p_vehicle text default null, p_kind text default null, p_title text default null)
returns text language plpgsql security definer set search_path=public as $$
declare who text:=coalesce(auth.jwt()->>'email','systém'); eid bigint;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if p_status not in ('novy','riesim','vyriesene','falosny') then raise exception 'Neznámy stav.'; end if;
  if p_status in ('vyriesene','falosny') and coalesce(trim(p_note),'')='' then
    raise exception '%', case when p_status='vyriesene' then 'Napíš poznámku – ako sa to vyriešilo.' else 'Napíš dôvod, prečo je alarm falošný.' end; end if;
  if p_key like 'ev:%' then
    eid:=substr(p_key,4)::bigint;
    update fleet_events set st=p_status, st_note=nullif(trim(p_note),''), st_at=now(), st_by=who where id=eid;
    if not found then raise exception 'Alarm sa nenašiel.'; end if;
    select vehicle_id, kind into p_vehicle, p_kind from fleet_events where id=eid;
  else
    insert into alarm_st(key,status,note,vehicle_id,kind,title,at,by) values(p_key,p_status,nullif(trim(p_note),''),p_vehicle,p_kind,p_title,now(),who)
      on conflict(key) do update set status=excluded.status, note=excluded.note, at=now(), by=excluded.by,
        vehicle_id=coalesce(excluded.vehicle_id,alarm_st.vehicle_id), kind=coalesce(excluded.kind,alarm_st.kind), title=coalesce(excluded.title,alarm_st.title);
  end if;
  -- falošný alarm sa uloží aj k autu (história falošných alarmov vozidla)
  if p_status='falosny' and p_vehicle is not null then
    insert into fleet_cfg(key,value) values('false_alarms','{}') on conflict(key) do nothing;
    update fleet_cfg set value=jsonb_set(value,array[p_vehicle],
       (coalesce(value->p_vehicle,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('at',now(),'key',p_key,'kind',p_kind,'title',p_title,'note',trim(p_note),'by',who))) ) where key='false_alarms';
  end if;
  return p_status;
end $$;
revoke all on function public.alarm_set(text,text,text,text,text,text) from public, anon;
grant execute on function public.alarm_set(text,text,text,text,text,text) to authenticated;

-- ===== auto odstavené alebo na servise: bez alarmov a mimo priemerov =====
create or replace function public.veh_off(vid text) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select (value->>vid)::boolean from fleet_cfg where key='parked'),false)
      or coalesce((select value ? vid from fleet_cfg where key='service'),false)
      or coalesce((select (value->>v.alias_of)::boolean from fleet_cfg, cmd_vehicles v where key='parked' and v.id=vid and v.alias_of is not null),false)
      or coalesce((select value ? v.alias_of from fleet_cfg, cmd_vehicles v where key='service' and v.id=vid and v.alias_of is not null),false) $$;
revoke all on function public.veh_off(text) from public, anon, authenticated;

-- ===== duplicitné vozidlá: rovnaká ŠPZ pod viacerými ID → jedno auto =====
create or replace function public.veh_canon(vid text) returns text language sql stable security definer set search_path=public as $$
  select coalesce((select v.alias_of from cmd_vehicles v where v.id=vid and v.alias_of is not null and v.pair_state='potvrdene'),vid) $$;
revoke all on function public.veh_canon(text) from public, anon, authenticated;

-- jednorazové zlúčenie jedného ID do druhého (jazdy, polohy, hladiny, tankovania, udalosti)
create or replace function public.veh_merge(dup text, canon text, why text) returns jsonb language plpgsql security definer set search_path=public as $$
declare n_r int; n_e int; n_t int; n_p int; n_pr int; n_fc int; n_cr int; dp record; cp record;
begin
  if dup=canon or dup is null or canon is null then return null; end if;
  select * into dp from cmd_vehicles where id=dup; select * into cp from cmd_vehicles where id=canon;
  if dp.id is null or cp.id is null then return null; end if;
  -- jazdy: duplicitná jazda (rovnaký začiatok do 3 min) sa zahodí, ostatné prejdú na hlavné auto
  delete from rides d where d.vehicle_id=dup and exists(select 1 from rides c where c.vehicle_id=canon and abs(extract(epoch from c.start_at-d.start_at))<=180);
  update rides set vehicle_id=canon, plate=coalesce(cp.plate,plate) where vehicle_id=dup; get diagnostics n_r=row_count;
  update fleet_events set vehicle_id=canon where vehicle_id=dup; get diagnostics n_e=row_count;
  insert into tank_log(vehicle_id,at,tank,speed,ign,lat,lon) select canon,at,tank,speed,ign,lat,lon from tank_log where vehicle_id=dup on conflict do nothing; get diagnostics n_t=row_count;
  delete from tank_log where vehicle_id=dup;
  insert into pos_log(vehicle_id,at,lat,lon,speed,ign,odo) select canon,at,lat,lon,speed,ign,odo from pos_log where vehicle_id=dup on conflict do nothing; get diagnostics n_p=row_count;
  delete from pos_log where vehicle_id=dup;
  update probe_refuel p set vehicle_id=canon where vehicle_id=dup and not exists(select 1 from probe_refuel x where x.vehicle_id=canon and abs(extract(epoch from x.at-p.at))<=600); get diagnostics n_pr=row_count;
  delete from probe_refuel where vehicle_id=dup;
  update fuel_card set vehicle_id=canon where vehicle_id=dup; get diagnostics n_fc=row_count;
  update fuel_card set m_vehicle=canon where m_vehicle=dup;
  update cmd_refuel set object_id=canon where object_id=dup; get diagnostics n_cr=row_count;
  delete from veh_place where vehicle_id=dup; delete from veh_stop where vehicle_id=dup;
  update cmd_vehicles set alias_of=canon, pair_state='potvrdene', pair_note=why where id=dup;
  -- živé údaje: novšie z duplicitného ID
  if dp.gps_at is not null and (cp.gps_at is null or dp.gps_at>cp.gps_at) then
    update cmd_vehicles set lat=dp.lat, lon=dp.lon, gps_at=dp.gps_at, speed=dp.speed, ign=dp.ign, tank=coalesce(dp.tank,tank), odometer=coalesce(dp.odometer,odometer),
      engine_hours=coalesce(dp.engine_hours,engine_hours), voltage=dp.voltage, in_yard=dp.in_yard where id=canon;
  end if;
  return jsonb_build_object('dup',dup,'canon',canon,'jazdy',n_r,'udalosti',n_e,'hladiny',n_t,'polohy',n_p,'sonda',n_pr,'karty',n_fc,'commander_tankovania',n_cr);
end $$;
revoke all on function public.veh_merge(text,text,text) from public, anon, authenticated;

-- potvrdený alias: nové záznamy z duplicitného ID idú rovno pod hlavné auto
create or replace function public.alias_rows_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare c text;
begin
  if new.vehicle_id is null then return new; end if;
  select v.alias_of into c from cmd_vehicles v where v.id=new.vehicle_id and v.alias_of is not null and v.pair_state='potvrdene';
  if c is null then return new; end if;
  if tg_table_name='rides' then
    if exists(select 1 from rides x where x.vehicle_id=c and x.ride_id<>new.ride_id and abs(extract(epoch from x.start_at-new.start_at))<=180) then return null; end if;
  end if;
  new.vehicle_id:=c; return new;
end $$;
drop trigger if exists rides_alias on rides;
create trigger rides_alias before insert on rides for each row execute function alias_rows_trg();
drop trigger if exists fev_alias on fleet_events;
create trigger fev_alias before insert on fleet_events for each row execute function alias_rows_trg();
drop trigger if exists tank_log_alias on tank_log;
create trigger tank_log_alias before insert on tank_log for each row execute function alias_rows_trg();
drop trigger if exists pos_log_alias on pos_log;
create trigger pos_log_alias before insert on pos_log for each row execute function alias_rows_trg();
drop trigger if exists probe_refuel_alias on probe_refuel;
create trigger probe_refuel_alias before insert on probe_refuel for each row execute function alias_rows_trg();

-- živá poloha z duplicitného ID sa prepíše aj do hlavného auta
create or replace function public.alias_live_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.alias_of is not null and new.pair_state='potvrdene' and new.gps_at is not null and new.gps_at is distinct from old.gps_at then
    update cmd_vehicles set lat=coalesce(new.lat,lat), lon=coalesce(new.lon,lon), gps_at=new.gps_at, speed=new.speed, ign=new.ign, tank=coalesce(new.tank,tank),
       odometer=coalesce(new.odometer,odometer), engine_hours=coalesce(new.engine_hours,engine_hours), voltage=coalesce(new.voltage,voltage), updated_at=now()
     where id=new.alias_of and (gps_at is null or gps_at<new.gps_at);
  end if;
  return null;
end $$;
drop trigger if exists cmd_vehicles_alias_live on cmd_vehicles;
create trigger cmd_vehicles_alias_live after update on cmd_vehicles for each row when (new.alias_of is not null) execute function alias_live_trg();

-- nové ID s ŠPZ, ktorú už má iné auto → automaticky alias (sync z Commandera nikdy nespadne na unikátnej ŠPZ)
create or replace function public.cmd_vehicles_plate_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare c text;
begin
  if new.alias_of is null and pnorm(new.plate) is not null and not coalesce(new.deleted,false) then
    select id into c from cmd_vehicles where id<>new.id and alias_of is null and not coalesce(deleted,false) and pnorm(plate)=pnorm(new.plate) limit 1;
    if c is not null then new.alias_of:=c; new.pair_state:='potvrdene'; new.pair_note:='duplicitná ŠPZ '||new.plate||' – zlúčené automaticky'; end if;
  end if;
  return new;
end $$;
drop trigger if exists cmd_vehicles_plate on cmd_vehicles;
create trigger cmd_vehicles_plate before insert or update of plate, alias_of, deleted on cmd_vehicles for each row execute function cmd_vehicles_plate_trg();

-- jednorazovo: všetky ŠPZ evidované viackrát → hlavné = s menom a najviac jazdami za 30 dní, potom najčerstvejšia poloha
do $$ declare g record; c text; d record; res jsonb:='[]';
begin
  for g in select pnorm(plate) pn from cmd_vehicles where alias_of is null and not coalesce(deleted,false) and pnorm(plate) is not null group by 1 having count(*)>1 loop
    select v.id into c from cmd_vehicles v where v.alias_of is null and not coalesce(v.deleted,false) and pnorm(v.plate)=g.pn
      order by (v.name is not null) desc, (select count(*) from rides r where r.vehicle_id=v.id and r.start_at>now()-interval '30 days') desc, v.gps_at desc nulls last, v.id limit 1;
    for d in select id from cmd_vehicles where alias_of is null and not coalesce(deleted,false) and pnorm(plate)=g.pn and id<>c loop
      res:=res||coalesce(jsonb_build_array(veh_merge(d.id,c,'duplicitná ŠPZ – zlúčené do jedného auta 26. 10. 2026')),'[]');
    end loop;
  end loop;
  -- aj aliasy pod duplicitným ID ukážu na hlavné auto
  update cmd_vehicles a set alias_of=b.alias_of from cmd_vehicles b where a.alias_of=b.id and b.alias_of is not null;
  insert into ai_state(key,value) values('veh_merge_2026_10_26',jsonb_build_object('at',now(),'zlucene',res)) on conflict(key) do update set value=excluded.value, updated_at=now();
end $$;

create unique index if not exists cmd_vehicles_plate_uq on cmd_vehicles(pnorm(plate)) where alias_of is null and not coalesce(deleted,false) and pnorm(plate) is not null;

-- AI úprava 26. 10. 2026 (2/6): ustálená hladina po tankovaní, artefakt snímača, kalibrácia sondy, „Zaplatené, ale nie v nádrži“,
-- kontrola kariet (karta na inom aute, mimo pracovného času, 2 tankovania do 4 h, ďaleko od trasy), stav tankovacích dát, výpadok dát

-- ===== poloha a hladina auta v čase =====
create or replace function public.veh_ids(vid text) returns text[] language sql stable security definer set search_path=public as $$
  select array_agg(distinct x) from (select vid x union all select id from cmd_vehicles where alias_of=vid union all select alias_of from cmd_vehicles where id=vid and alias_of is not null) q where x is not null $$;
revoke all on function public.veh_ids(text) from public, anon, authenticated;

create or replace function public.veh_pos_at(vid text, t timestamptz, win interval default interval '20 minutes', out lat numeric, out lon numeric, out at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.lat, p.lon, p.at from (
    select lat, lon, at from pos_log where vehicle_id=any(veh_ids(vid)) and at between t-win and t+win and lat is not null
    union all select lat, lon, at from tank_log where vehicle_id=any(veh_ids(vid)) and at between t-win and t+win and lat is not null
    union all select lat_stop, lon_stop, stop_at from rides where vehicle_id=any(veh_ids(vid)) and stop_at between t-win and t+win and lat_stop is not null
    union all select lat_start, lon_start, start_at from rides where vehicle_id=any(veh_ids(vid)) and start_at between t-win and t+win and lat_start is not null
  ) p order by abs(extract(epoch from p.at-t)) limit 1 $$;
revoke all on function public.veh_pos_at(text,timestamptz,interval) from public, anon, authenticated;

-- posledná hladina pred časom t (do 6 h): sonda alebo koniec/začiatok jazdy
create or replace function public.veh_lvl_before(vid text, t timestamptz, out lvl numeric, out at timestamptz)
language sql stable security definer set search_path=public as $$
  select x.l, x.a from (
    select tank l, tl.at a from tank_log tl where vehicle_id=any(veh_ids(vid)) and tl.at between t-interval '6 hours' and t-interval '2 minutes' and tank is not null
    union all select fuel_stop, stop_at from rides where vehicle_id=any(veh_ids(vid)) and stop_at between t-interval '6 hours' and t-interval '2 minutes' and fuel_stop is not null
    union all select fuel_start, start_at from rides where vehicle_id=any(veh_ids(vid)) and start_at between t-interval '6 hours' and t-interval '2 minutes' and fuel_start is not null
  ) x order by x.a desc limit 1 $$;
revoke all on function public.veh_lvl_before(text,timestamptz) from public, anon, authenticated;

-- ustálená hladina po tankovaní: prvé meranie 60 min po konci tankovania (do 6 h), inak pri najbližšom zapnutí zapaľovania (začiatok ďalšej jazdy do 24 h);
-- vráti aj spotrebu jazdou medzi koncom tankovania a meraním
create or replace function public.veh_lvl_settled(vid text, t_end timestamptz, out lvl numeric, out at timestamptz, out cons numeric, out how text)
language plpgsql stable security definer set search_path=public as $$
declare ids text[]:=veh_ids(vid);
begin
  select tl.tank, tl.at into lvl, at from tank_log tl where tl.vehicle_id=any(ids) and tl.at between t_end+interval '60 minutes' and t_end+interval '6 hours' and tl.tank is not null order by tl.at limit 1;
  if lvl is not null then how:='60 min po tankovaní';
  else
    select r.fuel_start, r.start_at into lvl, at from rides r where r.vehicle_id=any(ids) and r.start_at>t_end+interval '5 minutes' and r.start_at<t_end+interval '24 hours' and r.fuel_start is not null order by r.start_at limit 1;
    if lvl is not null then how:='pri najbližšom zapnutí zapaľovania'; end if;
  end if;
  if lvl is null then return; end if;
  select coalesce(sum(coalesce(r.fuel_consumed,0)*greatest(0,least(1,extract(epoch from least(coalesce(r.stop_at,r.start_at),at)-greatest(r.start_at,t_end))/nullif(extract(epoch from coalesce(r.stop_at,r.start_at)-r.start_at),0)))),0)
    into cons from rides r where r.vehicle_id=any(ids) and r.start_at<at and coalesce(r.stop_at,r.start_at)>t_end and r.fuel_consumed>0;
end $$;
revoke all on function public.veh_lvl_settled(text,timestamptz) from public, anon, authenticated;

-- ===== tankovanie vs. nárast v nádrži: nárast z ustálenej hladiny (60 min po tankovaní alebo pri ďalšom zapnutí zapaľovania) =====
create or replace function public.refuel_eval(rid text)
 returns table(refuel numeric, rise numeric, diff numeric, pct numeric, bad boolean, ready boolean)
 language sql stable security definer set search_path=public as $$
  with r as (select * from rides where ride_id=rid and refuel_l>0 and fuel_start is not null and fuel_stop is not null),
  s as (select q.* from r cross join lateral veh_lvl_settled(r.vehicle_id, coalesce(r.stop_at,r.start_at)) q),
  a as (select r.refuel_l,
          coalesce((select s.lvl+s.cons from s), r.fuel_stop) - r.fuel_start + coalesce(r.fuel_consumed,0) rise,
          (exists(select 1 from s where s.lvl is not null) or coalesce(r.stop_at,r.start_at) < now()-interval '3 hours') ready
        from r)
  select refuel_l, round(rise), round(refuel_l-rise), round(abs(refuel_l-rise)/nullif(refuel_l,0)*100,1),
         abs(refuel_l-rise)>20 and abs(refuel_l-rise)>0.05*refuel_l, ready from a $$;
revoke all on function public.refuel_eval(text) from public, anon, authenticated;

-- „surový“ nárast hneď po tankovaní (prvé meranie / maximum do 3 h) – na rozpoznanie artefaktu snímača
create or replace function public.refuel_raw_rise(rid text) returns numeric language sql stable security definer set search_path=public as $$
  select greatest(r.fuel_stop, coalesce((select max(tl.tank) from tank_log tl where tl.vehicle_id=any(veh_ids(r.vehicle_id)) and tl.at between coalesce(r.stop_at,r.start_at) and coalesce(r.stop_at,r.start_at)+interval '3 hours'),r.fuel_stop))
         - r.fuel_start + coalesce(r.fuel_consumed,0)
    from rides r where r.ride_id=rid and r.fuel_start is not null and r.fuel_stop is not null $$;
revoke all on function public.refuel_raw_rise(text) from public, anon, authenticated;

-- ===== kalibrácia palivového snímača =====
create table if not exists veh_calib(
  vehicle_id text primary key, n int, ratio_avg numeric, ratio_med numeric, q1 numeric, q3 numeric, same_dir boolean, max_dev numeric,
  flagged boolean not null default false, rule text, coef numeric, since timestamptz, tank_real numeric, calib_date date, max90 numeric, over_cap boolean, items jsonb,
  computed_at timestamptz not null default now());
alter table veh_calib enable row level security;
drop policy if exists veh_calib_read on veh_calib;
create policy veh_calib_read on veh_calib for select using (is_fleet());

create or replace function public.veh_calib_on(vid text) returns numeric language sql stable security definer set search_path=public as $$
  select coef from veh_calib where vehicle_id=veh_canon(vid) and flagged $$;
revoke all on function public.veh_calib_on(text) from public, anon, authenticated;

create or replace function public.calib_sync() returns int language plpgsql security definer set search_path=public as $$
declare v record; tc jsonb; s0 timestamptz; k int:=0; x record; cap numeric; cd date;
begin
  select coalesce(value,'{}') into tc from fleet_cfg where key='tankcfg'; tc:=coalesce(tc,'{}');
  for v in select c.* from cmd_vehicles c where c.alias_of is null and not coalesce(c.deleted,false) loop
    cd:=nullif(tc->v.id->>'calib_date','')::date;
    cap:=coalesce(nullif(replace(tc->v.id->>'cap',',','.'),'')::numeric, v.tank_cap);
    s0:=greatest(timestamptz '2026-07-01 00:00+02', coalesce(cd::timestamp at time zone 'Europe/Bratislava', '-infinity'));
    with q as (select r.ride_id, coalesce(r.stop_at,r.start_at) t, e.refuel, e.rise, e.rise/nullif(e.refuel,0) ratio
                 from rides r cross join lateral refuel_eval(r.ride_id) e
                where r.vehicle_id=any(veh_ids(v.id)) and r.refuel_l>=50 and coalesce(r.stop_at,r.start_at)>=s0 and e.ready),
         f as (select * from q where ratio between 0.3 and 1.7),
         a as (select count(*) n, avg(ratio) av, percentile_cont(0.5) within group (order by ratio) md, percentile_cont(0.25) within group (order by ratio) p1,
                      percentile_cont(0.75) within group (order by ratio) p3, bool_and(ratio<1) lo, bool_and(ratio>1) hi from f)
    select a.*, (select max(abs(f.ratio/nullif(a.av,0)-1)) from f) mdv,
           (select jsonb_agg(jsonb_build_object('kedy',to_char(f.t at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI'),'doklad_l',round(f.refuel),'narast_l',round(f.rise),'pomer',round(f.ratio,3)) order by f.t desc) from f) it
      into x from a;
    insert into veh_calib as c(vehicle_id,n,ratio_avg,ratio_med,q1,q3,same_dir,max_dev,flagged,rule,coef,since,tank_real,calib_date,max90,over_cap,items,computed_at)
    values(v.id, x.n, round(x.av::numeric,3), round(x.md::numeric,3), round(x.p1::numeric,3), round(x.p3::numeric,3), coalesce(x.lo or x.hi,false), round(x.mdv::numeric,3),
      x.n>=5 and (((x.md<0.90 or x.md>1.10) and x.p3-x.p1<=0.10) or (coalesce(x.lo or x.hi,false) and x.mdv<=0.10 and abs(x.av-1)>=0.05)),
      case when x.n>=5 and (x.md<0.90 or x.md>1.10) and x.p3-x.p1<=0.10 then 'medián mimo 0,90–1,10, rozptyl medzi kvartilmi do 0,10'
           when x.n>=5 and coalesce(x.lo or x.hi,false) and x.mdv<=0.10 and abs(x.av-1)>=0.05 then 'odchýlka sústavne rovnakým smerom (±10 % od priemeru)' end,
      round(coalesce(x.md,x.av)::numeric,2), s0, cap, cd,
      (select max(tank) from tank_log where vehicle_id=any(veh_ids(v.id)) and at>now()-interval '90 days'), null, x.it, now())
    on conflict(vehicle_id) do update set n=excluded.n, ratio_avg=excluded.ratio_avg, ratio_med=excluded.ratio_med, q1=excluded.q1, q3=excluded.q3, same_dir=excluded.same_dir,
      max_dev=excluded.max_dev, flagged=excluded.flagged, rule=excluded.rule, coef=excluded.coef, since=excluded.since, tank_real=excluded.tank_real, calib_date=excluded.calib_date,
      max90=excluded.max90, items=excluded.items, computed_at=now();
    k:=k+1;
  end loop;
  update veh_calib set over_cap = tank_real>0 and max90>tank_real*1.05;
  -- alarmy auta s nekalibrovaným snímačom: „tankovanie nesedí“ a „pokles v státí“ sú len orientačné (bez alarmu a bez € straty)
  update fleet_events e set flag='kalibracia', flag_note='snímač nekalibrovaný – koeficient '||replace(c.coef::text,'.',',')||'; prepočítané ≈ '||round(coalesce(e.liters,0)/nullif(c.coef,0))||' l (orientačne)'
    from veh_calib c where c.flagged and e.vehicle_id=any(veh_ids(c.vehicle_id)) and e.kind in ('refuel_gap','fuel_drop') and e.at>=c.since and e.flag is null;
  update fleet_events e set flag=null, flag_note=null
    where e.flag='kalibracia' and not exists(select 1 from veh_calib c where c.flagged and e.vehicle_id=any(veh_ids(c.vehicle_id)) and e.at>=c.since);
  return k;
end $$;
revoke all on function public.calib_sync() from public, anon, authenticated;

-- ===== artefakt snímača po tankovaní: prebytok pri tankovaní a pokles do 6 h sa líšia o menej ako 30 l =====
create or replace function public.artifact_sync(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare r record; d record; k int:=0; sur numeric; t0 timestamptz;
begin
  for r in select x.*, refuel_raw_rise(x.ride_id) raw from rides x where x.refuel_l>0 and coalesce(x.stop_at,x.start_at)>=since and x.fuel_start is not null and x.fuel_stop is not null loop
    sur:=r.raw-r.refuel_l; t0:=coalesce(r.stop_at,r.start_at);
    continue when sur is null or sur<=20;
    for d in select * from fleet_events e where e.vehicle_id=any(veh_ids(r.vehicle_id)) and e.kind in ('fuel_drop','data_gap')
               and coalesce(e.t_from,e.at) between t0-interval '10 minutes' and t0+interval '6 hours' and abs(coalesce(e.liters,0)-sur)<30 and coalesce(e.flag,'')<>'artefakt' loop
      update fleet_events set flag='artefakt', flag_note='artefakt snímača po tankovaní – pri tankovaní '||to_char(t0 at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' +'||round(sur)||' l nad doklad, potom −'||round(d.liters)||' l (rozdiel '||round(abs(d.liters-sur))||' l); nepočíta sa do strát' where id=d.id;
      update fleet_events set flag='artefakt', flag_note='artefakt snímača po tankovaní – prebytok +'||round(sur)||' l a pokles −'||round(d.liters)||' l do 6 h; nepočíta sa do strát'
        where src_key='gap:'||r.ride_id;
      k:=k+1;
    end loop;
  end loop;
  return k;
end $$;
revoke all on function public.artifact_sync(timestamptz) from public, anon, authenticated;

-- ===== tankovania z kariet – jeden zoznam: výpis kariet (import), Commander (refueling-import), tankovania v jazdách =====
create or replace function public.card_tx(since timestamptz)
 returns table(key text, src text, vehicle_id text, at timestamptz, liters numeric, eur_bez numeric, station text, card text, ride_id text)
 language sql stable security definer set search_path=public as $$
  with fc as (select 'fc:'||f.id key, 'výpis karty' src, f.vehicle_id, f.at, f.liters, case when f.price>0 then round(f.price/1.23,2) end eur_bez, f.station, f.card, null::text ride_id
                from fuel_card f where f.at>=since and f.liters>0),
       cr as (select 'cr:'||c.acc||':'||extract(epoch from c.at)::bigint||':'||c.ident||':'||c.liters key, 'Commander karta' src,
                     coalesce(veh_canon(c.object_id), fuel_card_vid(c.ident,c.ident)) vehicle_id, c.at, c.liters, c.cost eur_bez, null::text station,
                     case when pnorm(c.ident) ~ '^\d{6,}$' then c.ident end card, c.ride_id
                from cmd_refuel c where c.at>=since and c.liters>0),
       rr as (select 'rr:'||r.ride_id||':'||(x.o-1) key, 'jazda (Commander)' src, veh_canon(r.vehicle_id) vehicle_id,
                     coalesce(to_timestamp(cmd_num(x.e->>'datetime')), coalesce(r.stop_at,r.start_at)) at, cmd_num(x.e->>'volume') liters, cmd_num(x.e->>'priceVatExc') eur_bez,
                     null::text station, null::text card, r.ride_id
                from rides r cross join lateral jsonb_array_elements(case when jsonb_typeof(r.refuels)='array' then r.refuels else '[]'::jsonb end) with ordinality x(e,o)
               where r.start_at>=since-interval '1 day' and cmd_num(x.e->>'volume')>0)
  select * from fc
  union all select * from cr where not exists(select 1 from fc where fc.vehicle_id=cr.vehicle_id and abs(extract(epoch from fc.at-cr.at))<=900 and abs(fc.liters-cr.liters)<=2)
  union all select * from rr where rr.at>=since
    and not exists(select 1 from fc where fc.vehicle_id=rr.vehicle_id and abs(extract(epoch from fc.at-rr.at))<=900 and abs(fc.liters-rr.liters)<=2)
    and not exists(select 1 from cr where cr.vehicle_id=rr.vehicle_id and abs(extract(epoch from cr.at-rr.at))<=900 and abs(cr.liters-rr.liters)<=2) $$;
revoke all on function public.card_tx(timestamptz) from public, anon, authenticated;

-- poloha stanice: z výpisu (spárované), inak najbližšia čerpačka v databáze miest pri aute
create or replace function public.station_loc(st text, vid text, t timestamptz, out lat numeric, out lon numeric, out src text)
language plpgsql stable security definer set search_path=public as $$
declare p record;
begin
  if st is not null then select l.lat, l.lon into lat, lon from fuel_station_loc(st) l; if lat is not null then src:='výpis'; return; end if; end if;
  select * into p from veh_pos_at(vid,t,interval '30 minutes');
  if p.lat is null then return; end if;
  select pl.lat, pl.lon into lat, lon from places pl where pl.kind='fuel' and pl.lat between p.lat-0.01 and p.lat+0.01 and pl.lon between p.lon-0.015 and p.lon+0.015
    order by geo_m(pl.lat,pl.lon,p.lat,p.lon) limit 1;
  if lat is not null then src:='čerpačka pri aute'; end if;
end $$;
revoke all on function public.station_loc(text,text,timestamptz) from public, anon, authenticated;

-- ===== „Zaplatené, ale nie v nádrži“ (stupeň VYSOKÝ) =====
create or replace function public.paid_not_tank_check(since timestamptz, push boolean default true) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare t record; b record; s record; p record; sl record; o record; tp text; k int:=0; isnew boolean; cb numeric; rise numeric; cap numeric; drv text; pl text; msg text; chk text; dist numeric; tz text:='Europe/Bratislava'; other text;
begin
  select value->>'topic' into tp from fleet_cfg where key='notify';
  cb:=round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3);
  for t in select * from card_tx(since) x where x.vehicle_id is not null and x.liters>100 and x.at<now()-interval '90 minutes' loop
    select * into b from veh_lvl_before(t.vehicle_id, t.at);
    select * into s from veh_lvl_settled(t.vehicle_id, t.at+interval '10 minutes');
    continue when b.lvl is null or s.lvl is null;
    rise:=s.lvl+coalesce(s.cons,0)-b.lvl;
    -- jazda medzi poslednou hladinou a tankovaním
    rise:=rise+coalesce((select sum(coalesce(r.fuel_consumed,0)) from rides r where r.vehicle_id=any(veh_ids(t.vehicle_id)) and r.start_at>=b.at and coalesce(r.stop_at,r.start_at)<=t.at),0);
    continue when not (rise<0.2*t.liters and t.liters-rise>100);
    select coalesce(c.plate,c.name,c.id), coalesce(nullif(v2.tank_real,0),c.tank_cap) into pl, cap from cmd_vehicles c left join veh_calib v2 on v2.vehicle_id=c.id where c.id=t.vehicle_id;
    drv:=coalesce(veh_driver_at(t.vehicle_id,t.at),'neznámy');
    -- (a) bolo auto pri stanici?
    select * into sl from station_loc(t.station,t.vehicle_id,t.at);
    select * into p from veh_pos_at(t.vehicle_id,t.at,interval '20 minutes');
    if sl.lat is not null and p.lat is not null then dist:=geo_m(sl.lat,sl.lon,p.lat,p.lon);
      chk:=case when dist<=300 then '(a) auto bolo pri stanici ('||round(dist)||' m)' else '(a) auto NEBOLO pri stanici – '||case when dist>=1000 then replace(round(dist/1000,1)::text,'.',',')||' km' else round(dist)||' m' end end;
    elsif p.lat is null then chk:='(a) poloha auta v čase transakcie chýba';
    else chk:='(a) poloha stanice neznáma'; end if;
    -- (b) litre vs. voľný objem nádrže
    if cap>0 then chk:=chk||' · (b) '||case when t.liters>cap-b.lvl then 'litre PREKRAČUJÚ voľný objem nádrže ('||round(cap)||' − '||round(b.lvl)||' = '||round(cap-b.lvl)||' l)' else 'litre sa zmestia do nádrže (voľných '||round(cap-b.lvl)||' l)' end;
    else chk:=chk||' · (b) objem nádrže nezadaný'; end if;
    -- (c) inému autu VALKO do 2 h na tej istej stanici (do 300 m) stúpla hladina bez dokladu
    other:=null;
    for o in select pr.*, coalesce(c.plate,c.name,c.id) opl from probe_refuel pr join cmd_vehicles c on c.id=pr.vehicle_id
              where veh_canon(pr.vehicle_id)<>t.vehicle_id and pr.at between t.at-interval '2 hours' and t.at+interval '2 hours' and pr.rise>=50 and pr.lat is not null
                and ((sl.lat is not null and geo_m(sl.lat,sl.lon,pr.lat,pr.lon)<=300) or (p.lat is not null and geo_m(p.lat,p.lon,pr.lat,pr.lon)<=300))
                and not exists(select 1 from card_tx(t.at-interval '4 hours') y where y.vehicle_id=veh_canon(pr.vehicle_id) and y.at between pr.at-interval '3 hours' and pr.at+interval '3 hours')
              order by abs(extract(epoch from pr.at-t.at)) limit 1 loop
      other:=o.opl||' +'||round(o.rise)||' l ('||to_char(o.at at time zone tz,'HH24:MI')||', vodič '||coalesce(veh_driver_at(o.vehicle_id,o.at),'neznámy')||')';
    end loop;
    chk:=chk||' · (c) '||coalesce('KARTA PRAVDEPODOBNE PRIRADENÁ K INÉMU AUTU: '||other,'iné auto bez dokladu v okolí nenašlo');
    msg:=pl||' · vodič '||drv||' · '||to_char(t.at at time zone tz,'DD.MM.YYYY HH24:MI')||' · '||coalesce(t.station,'stanica neznáma')||coalesce(' · karta '||t.card,'')
       ||' · na doklade '||round(t.liters)||' l · nárast v nádrži '||round(rise)||' l ('||round(b.lvl)||' → '||round(s.lvl)||' l, '||s.how||') · chýba '||round(t.liters-rise)||' l = '||round((t.liters-rise)*cb)||' € bez DPH · '||chk
       ||' · zdroj: '||t.src||' · stupeň VYSOKÝ';
    insert into fleet_events as e(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,note,src_key)
      values(t.vehicle_id,pl,'paid_not_tank',t.at,drv,round(t.liters-rise),coalesce(t.station,'čerpacia stanica'),'fuel',coalesce(sl.lat,p.lat),coalesce(sl.lon,p.lon),t.at,s.at,round(b.lvl),round(s.lvl),msg,'pnt:'||t.key)
      on conflict (src_key) do update set note=excluded.note, liters=excluded.liters, driver=excluded.driver, lvl_from=excluded.lvl_from, lvl_to=excluded.lvl_to, t_to=excluded.t_to
      returning (xmax=0) into isnew;
    if isnew then k:=k+1;
      if push and tp is not null and t.at>now()-interval '24 hours' and not veh_off(t.vehicle_id) then
        begin perform net.http_post(url:='https://ntfy.sh/'||tp, body:=jsonb_build_object('topic',tp,'title','ZAPLATENÉ, ALE NIE V NÁDRŽI','message','⛽❗ '||msg,
          'tags',jsonb_build_array('rotating_light','fuelpump'),'priority',5)); exception when others then null; end;
      end if;
    end if;
  end loop;
  -- doklad sa medzitým spároval s nárastom (napr. doplnené merania) → alarm zmizne, ak ho nikto neriešil
  delete from fleet_events e where e.kind='paid_not_tank' and e.at>=since and e.st='novy' and e.src_key like 'pnt:%'
     and not exists(select 1 from card_tx(since) x where 'pnt:'||x.key=e.src_key);
  return k;
end $$;
revoke all on function public.paid_not_tank_check(timestamptz,boolean) from public, anon, authenticated;

-- ===== kontroly kariet z praxe: mimo pracovného času, 2 tankovania do 4 h, ďaleko od trasy =====
create or replace function public.card_checks(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare t record; k int:=0; n int; pl text; p record; sl record; d numeric; tz text:='Europe/Bratislava';
begin
  for t in select * from (select x.*, lag(x.at) over w p_at, lag(x.liters) over w p_l, lag(x.station) over w p_st, lag(x.key) over w p_key
                            from card_tx(since-interval '4 hours') x where x.vehicle_id is not null window w as (partition by x.vehicle_id order by x.at)) y
            where y.at>=since and y.at<now()-interval '30 minutes' order by y.vehicle_id, y.at loop
    select coalesce(plate,name,id) into pl from cmd_vehicles where id=t.vehicle_id;
    -- 1) mimo pracovného času vodiča: auto nemalo jazdu ±2 h (tachograf v Commanderi nie je – podľa jázd)
    if not exists(select 1 from rides r where r.vehicle_id=any(veh_ids(t.vehicle_id)) and r.start_at<t.at+interval '2 hours' and coalesce(r.stop_at,r.start_at)>t.at-interval '2 hours') then
      insert into fleet_events(vehicle_id,plate,kind,at,driver,liters,place,place_kind,note,src_key)
        values(t.vehicle_id,pl,'card_offhours',t.at,veh_driver_at(t.vehicle_id,t.at),round(t.liters),t.station,'fuel',
          'tankovanie '||to_char(t.at at time zone tz,'DD.MM.YYYY HH24:MI')||' · '||round(t.liters)||' l'||coalesce(' · '||t.station,'')||' · auto nemalo jazdu 2 h pred ani po tankovaní (mimo pracovného času vodiča) · zdroj '||t.src,
          'coff:'||t.key) on conflict (src_key) do nothing;
      get diagnostics n=row_count; k:=k+n;
    end if;
    -- 2) dve tankovania toho istého auta do 4 h
    if t.p_key is not null and t.p_at>=t.at-interval '4 hours' then
      insert into fleet_events(vehicle_id,plate,kind,at,driver,liters,place,place_kind,note,src_key)
        values(t.vehicle_id,pl,'card_double',t.at,veh_driver_at(t.vehicle_id,t.at),round(t.liters+t.p_l),t.station,'fuel',
          'dve tankovania do 4 h: '||to_char(t.p_at at time zone tz,'DD.MM HH24:MI')||' '||round(t.p_l)||' l'||coalesce(' ('||t.p_st||')','')||' a '||to_char(t.at at time zone tz,'HH24:MI')||' '||round(t.liters)||' l'||coalesce(' ('||t.station||')',''),
          'cdbl:'||t.key) on conflict (src_key) do nothing;
      get diagnostics n=row_count; k:=k+n;
    end if;
    -- 3) tankovanie viac ako 50 km od trasy auta (stanica známa z výpisu)
    if t.station is not null then
      select l.lat, l.lon into sl from fuel_station_loc(t.station) l;
      if sl.lat is not null then
        select * into p from veh_pos_at(t.vehicle_id,t.at,interval '45 minutes');
        if p.lat is not null then d:=geo_m(sl.lat,sl.lon,p.lat,p.lon);
          if d>50000 then
            insert into fleet_events(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,note,src_key)
              values(t.vehicle_id,pl,'card_far',t.at,veh_driver_at(t.vehicle_id,t.at),round(t.liters),t.station,'fuel',sl.lat,sl.lon,
                'tankovanie '||to_char(t.at at time zone tz,'DD.MM.YYYY HH24:MI')||' · '||round(t.liters)||' l · '||t.station||' · auto bolo v tom čase '||round(d/1000)||' km od stanice',
                'cfar:'||t.key) on conflict (src_key) do nothing;
            get diagnostics n=row_count; k:=k+n;
          end if;
        end if;
      end if;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.card_checks(timestamptz) from public, anon, authenticated;

-- ===== kontrola priradenia kariet k vozidlám (od 1. 7.): bolo priradené auto pri stanici? =====
create or replace function public.card_assign_report() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare res jsonb;
begin
  if auth.uid() is not null and not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  with t as (select x.*, l.lat slat, l.lon slon from card_tx(timestamptz '2026-07-01 00:00+02') x cross join lateral fuel_station_loc(x.station) l
              where x.card is not null and x.vehicle_id is not null),
       e as (select t.*, (select geo_m(t.slat,t.slon,p.lat,p.lon) from veh_pos_at(t.vehicle_id,t.at,interval '20 minutes') p where p.lat is not null) dm,
                    exists(select 1 from probe_refuel pr where pr.vehicle_id=any(veh_ids(t.vehicle_id)) and pr.at between t.at-interval '2 hours' and t.at+interval '2 hours') own_rise,
                    (select veh_canon(pr.vehicle_id) from probe_refuel pr where veh_canon(pr.vehicle_id)<>t.vehicle_id and pr.at between t.at-interval '2 hours' and t.at+interval '2 hours'
                        and pr.lat is not null and t.slat is not null and geo_m(t.slat,t.slon,pr.lat,pr.lon)<=300 order by abs(extract(epoch from pr.at-t.at)) limit 1) other
               from t),
       g as (select pnorm(card) cd, min(card) card, vehicle_id, count(*) n,
                    count(*) filter (where (dm is not null and dm<=300) or (dm is null and own_rise)) ok,
                    count(*) filter (where dm is null and not own_rise and slat is null) unk,
                    mode() within group (order by other) other, count(*) filter (where other is not null) n_other
               from e group by pnorm(card), vehicle_id)
  select coalesce(jsonb_agg(jsonb_build_object('karta',g.card,'vehicle_id',g.vehicle_id,'priradena_spz',coalesce(v.plate,v.name,g.vehicle_id),'transakcii',g.n,'pri_stanici',g.ok,
           'podiel_pct',round(100.0*g.ok/nullif(g.n,0)),'auto_na_stanici_id',g.other,'auto_na_stanici_spz',(select coalesce(plate,name,id) from cmd_vehicles where id=g.other),'pripadov_ine_auto',g.n_other,
           'podozrenie',g.n>=3 and 100.0*g.ok/nullif(g.n,0)<80) order by 100.0*g.ok/nullif(g.n,0)),'[]') into res
    from g left join cmd_vehicles v on v.id=g.vehicle_id;
  return res;
end $$;
revoke all on function public.card_assign_report() from public, anon;
grant execute on function public.card_assign_report() to authenticated;

-- oprava priradenia karty: všetky transakcie karty od 1. 7. (aj s ŠPZ na doklade) prejdú na vybrané auto
create or replace function public.fuel_card_reassign(cd text, vid text) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if pnorm(cd) is null or coalesce(vid,'')='' then raise exception 'Chýba karta alebo auto.'; end if;
  insert into fleet_cfg(key,value) values('cards',jsonb_build_object(pnorm(cd),vid)) on conflict(key) do update set value=coalesce(fleet_cfg.value,'{}')||jsonb_build_object(pnorm(cd),vid);
  update fuel_card set vehicle_id=vid, plate=(select plate from cmd_vehicles where id=vid) where pnorm(card)=pnorm(cd) and at>='2026-07-01';
  get diagnostics n=row_count;
  perform fuel_card_match('2026-07-01'::timestamptz);
  perform card_swap_check('2026-07-01'::timestamptz, false);
  perform paid_not_tank_check('2026-07-01'::timestamptz, false);
  return n;
end $$;
revoke all on function public.fuel_card_reassign(text,text) from public, anon;
grant execute on function public.fuel_card_reassign(text,text) to authenticated;

-- ===== stav tankovacích dát (karty) =====
create or replace function public.fuel_data_status() returns jsonb language sql stable security definer set search_path=public as $$
  with s as (select greatest((select max(at) from fuel_card),(select max(at) from cmd_refuel),(select max(coalesce(stop_at,start_at)) from rides where refuel_l>0)) last_at)
  select jsonb_build_object('posledne_tankovanie',to_char(last_at at time zone 'Europe/Bratislava','YYYY-MM-DD"T"HH24:MI'),
    'chybaju_od',case when last_at is null or last_at<now()-interval '48 hours' then to_char(coalesce(last_at,now()-interval '35 days') at time zone 'Europe/Bratislava'+interval '1 day','YYYY-MM-DD') end,
    'neuplne',last_at is null or last_at<now()-interval '48 hours',
    'commander_refuel',(select jsonb_agg(jsonb_build_object('konto',acc,'kod',code,'zaznamov',n,'posledne_ok',to_char(ok_at at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'sprava',left(msg,140))) from cmd_api where kind in ('refuel','refuelbf'))) from s $$;
revoke all on function public.fuel_data_status() from public, anon, authenticated;

-- ===== bilancia nádrže po autách: kalibrácia, chýbajúce tankovacie dáta (neúplné), odstavené/servis =====
create or replace function public.fuel_balance(days integer default 7) returns jsonb language sql stable security definer set search_path=public as $$
  with p as (select now()-make_interval(days=>days) w0, round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3) cb,
                    greatest((select max(at) from fuel_card),(select max(at) from cmd_refuel),(select max(coalesce(stop_at,start_at)) from rides where refuel_l>0)) lastref),
  v as (select id, coalesce(plate,name,id) auto, upper(replace(coalesce(plate,''),' ','')) pn, veh_off(id) off from cmd_vehicles where alias_of is null and not coalesce(deleted,false)),
  -- prvá a posledná hladina v okne (sonda, začiatok/koniec jazdy) – indexom po aute
  b as (select v.id, v.auto, v.pn, v.off, f.at t0, f.tank l0, l.at t1, l.tank l1,
          (select coef from veh_calib c where c.vehicle_id=v.id and c.flagged) coef
        from v cross join p
        left join lateral (select * from (
            (select tl.at, tl.tank from tank_log tl where tl.vehicle_id=v.id and tl.at>=p.w0 and tl.tank is not null order by tl.at limit 1)
            union all (select r.start_at, r.fuel_start from rides r where r.vehicle_id=v.id and r.start_at>=p.w0 and r.fuel_start is not null order by r.start_at limit 1)) q order by 1 limit 1) f on true
        left join lateral (select * from (
            (select tl.at, tl.tank from tank_log tl where tl.vehicle_id=v.id and tl.at>=p.w0 and tl.tank is not null order by tl.at desc limit 1)
            union all (select r.stop_at, r.fuel_stop from rides r where r.vehicle_id=v.id and r.start_at>=p.w0 and r.stop_at<=now() and r.fuel_stop is not null order by r.start_at desc limit 1)) q order by 1 desc limit 1) l on true),
  a as (select b.*,
          (select coalesce(sum(refuel_l),0) from rides r where r.vehicle_id=any(veh_ids(b.id)) and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) nat,
          (select coalesce(sum(fuel_consumed),0) from rides r where r.vehicle_id=any(veh_ids(b.id)) and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) spotr,
          (select coalesce(sum(distance),0) from rides r where r.vehicle_id=any(veh_ids(b.id)) and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) km,
          (select coalesce(sum(liters),0) from yard_fuel y where y.kind='vydaj' and (y.vehicle_id=b.id or (b.pn<>'' and upper(replace(coalesce(y.plate,''),' ',''))=b.pn))
              and y.day between (b.t0 at time zone 'Europe/Bratislava')::date and (b.t1 at time zone 'Europe/Bratislava')::date) dvor,
          (select count(*) from fleet_events e, p where e.vehicle_id=any(veh_ids(b.id)) and e.kind in ('fuel_drop','refuel_gap','fuel_transfer','paid_not_tank') and e.at>=p.w0 and e.flag is null and e.st<>'falosny') alarmy
        from b),
  r as (select a.*, p.cb, a.t0 is not null and a.t1>a.t0 ok, (p.lastref is null or a.t1>p.lastref+interval '24 hours') neupl,
          (a.l0-a.l1)/coalesce(a.coef,1) dl,
          a.spotr-(a.nat+a.dvor+(a.l0-a.l1)/coalesce(a.coef,1)) chyba
        from a, p)
  select coalesce(jsonb_agg(jsonb_build_object(
     'auto',auto,
     'od',to_char(t0 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'do',to_char(t1 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),
     'nadrz_zaciatok_l',round(l0),'natankovane_l',round(nat),'vydaj_z_dvora_l',round(dvor),'spotreba_jazdou_l',round(spotr),'nadrz_koniec_l',round(l1),'km',round(km),
     'kalibracny_koeficient',coef,
     'nevysvetleny_ubytok_l',case when ok then round(dl+nat+dvor-spotr) end,
     'stav',case when not ok then 'málo dát (menej ako dva záznamy hladiny v okne)'
                 when off then 'odstavené / na servise – nepočíta sa'
                 when neupl and chyba>30 then 'tankovania z kariet chýbajú – rozdiel neúplný (nie alarm)'
                 when coef is not null then 'snímač nekalibrovaný (koeficient '||replace(coef::text,'.',',')||') – orientačne'
                 when chyba>30 then 'chýbajú záznamy o tankovaní (nie krádež)'
                 when dl+nat+dvor-spotr>30 then 'nevysvetlený úbytok – skontrolovať'
                 else 'v poriadku' end,
     'neuplne_tankovacie_data',neupl,
     'chybajuce_tankovanie_l',case when ok and chyba>30 and not neupl then round(chyba) end,
     'chybajuce_tankovanie_eur_bez_dph',case when ok and chyba>30 and not neupl then round(chyba*cb) end,
     'nevysvetleny_ubytok_eur_bez_dph',case when ok and not off and coef is null and dl+nat+dvor-spotr>30 then round((dl+nat+dvor-spotr)*cb) end,
     'cena_nafty_bez_dph',cb,'alarmy_nafty',alarmy)
     order by case when ok then abs(dl+nat+dvor-spotr) end desc nulls last),'[]') from r $$;
revoke all on function public.fuel_balance(int) from public, anon, authenticated;

-- dáta pre záložku Nafta v aplikácii
create or replace function public.fleet_fuel_status() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  return jsonb_build_object('stav_dat',fuel_data_status(),'bilancia_7',fuel_balance(7),'bilancia_30',fuel_balance(30),
    'kalibracia',(select coalesce(jsonb_agg(to_jsonb(c)-'items'||jsonb_build_object('auto',coalesce(v.plate,v.name,v.id),'items',c.items)),'[]') from veh_calib c join cmd_vehicles v on v.id=c.vehicle_id where c.n>0 or c.over_cap),
    'karty',coalesce((select value->'rows' from ai_state where key='card_assign'),'[]'::jsonb),
    'karty_kedy',(select to_char(updated_at at time zone 'Europe/Bratislava','DD.MM HH24:MI') from ai_state where key='card_assign'));
end $$;
revoke all on function public.fleet_fuel_status() from public, anon;
grant execute on function public.fleet_fuel_status() to authenticated;

-- ===== pokles medzi dvoma záznamami sondy: výpadok dát (nad 6 h), kalibrácia, odstavené/servis =====
create or replace function public.fuel_gap_check(days integer default 1) returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare s record; t text; k int:=0; drv text; pl text; moved numeric; ignon boolean; v record; msg text; thr numeric; cf numeric;
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
      from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<s.at and coalesce(stop_at,start_at)>s.p_at;
    if moved>2 then continue; end if;
    if s.lat is not null and s.p_lat is not null and abs(s.lat-s.p_lat)+abs(s.lon-s.p_lon)>0.02 then continue; end if;
    select bool_or(coalesce(ign,0)=1) into ignon from tank_log where vehicle_id=s.vehicle_id and at between s.p_at and s.at;
    select driver into drv from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<=s.at and driver is not null order by start_at desc limit 1;
    select coalesce(p.name, (select stop_addr from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<=s.at and stop_addr is not null order by start_at desc limit 1)) into pl
      from (select 1) d left join places p on abs(p.lat-s.lat)<0.01 and abs(p.lon-s.lon)<0.015;
    select * into v from cmd_vehicles where id=s.vehicle_id;
    if s.at-s.p_at>interval '6 hours' then
      insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,at,t_from,t_to,lvl_from,lvl_to,minutes,note)
        values(s.vehicle_id,v.plate,'data_gap',drv,pl,'stop',round(s.p_tank-s.tank),s.lat,s.lon,s.at,s.p_at,s.at,round(s.p_tank),round(s.tank),floor(extract(epoch from s.at-s.p_at)/60)::int,
          'výpadok dát '||replace(round(extract(epoch from s.at-s.p_at)/3600,1)::text,'.',',')||' h bez záznamu hladiny · rozdiel hladiny '||round(s.p_tank)||' → '||round(s.tank)||' l (nepočíta sa ako pokles v státí)');
      continue;
    end if;
    cf:=veh_calib_on(s.vehicle_id);
    insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,at,t_from,t_to,lvl_from,lvl_to,note,flag,flag_note)
      values(s.vehicle_id,v.plate,'fuel_drop',drv,pl,'fuel',round(s.p_tank-s.tank),s.lat,s.lon,s.at,s.p_at,s.at,round(s.p_tank),round(s.tank),
        case when s.at-s.p_at>interval '1 hour' then 'pokles počas výpadku signálu ('||round(extract(epoch from s.at-s.p_at)/3600,1)||' h)' else 'pokles medzi meraniami' end
        ||case when coalesce(ignon,false) then ', motor bežal' else ', motor vypnutý' end,
        case when cf is not null then 'kalibracia' when veh_off(s.vehicle_id) then 'servis' end,
        case when cf is not null then 'snímač nekalibrovaný – koeficient '||replace(cf::text,'.',',')||'; prepočítané ≈ '||round((s.p_tank-s.tank)/cf)||' l (orientačne)' when veh_off(s.vehicle_id) then 'auto odstavené / na servise' end);
    if cf is not null or veh_off(s.vehicle_id) then continue; end if;
    k:=k+1;
    if t is not null and s.at>now()-interval '3 hours' then
      msg:='⚠️ '||coalesce(v.plate,s.vehicle_id)||': pokles nafty '||round(s.p_tank)||' → '||round(s.tank)||' l (−'||round(s.p_tank-s.tank)||' l) medzi '
        ||to_char(s.p_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' a '||to_char(s.at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||', auto stálo'||coalesce(' · '||pl,'')||coalesce(' · '||drv,'');
      begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,'click','https://maps.google.com/?q='||s.lat||','||s.lon)); exception when others then null; end;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_gap_check(int) from public, anon, authenticated;

-- ===== živý pokles v stojacom aute: bez duplicitných ID, odstavených/servisných a nekalibrovaných =====
create or replace function public.fuel_check() returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare c jsonb; v record; t text; k int:=0; before_max numeric; now_lvl numeric; moved boolean; drv text; msg text; gapok boolean;
begin
  select value into c from fleet_cfg where key='fuel'; if c is null then c:='{"drop":20,"win":90,"gap":30,"cool":180}'; end if;
  select value->>'topic' into t from fleet_cfg where key='notify';
  insert into tank_log(vehicle_id,at,tank,speed,ign,lat,lon)
    select id,gps_at,tank,speed,ign,lat,lon from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes'
    on conflict do nothing;
  delete from tank_log where at<now()-interval '120 days';
  for v in select * from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes' and coalesce(speed,0)<=3 and alias_of is null loop
    if veh_off(v.id) or veh_calib_on(v.id) is not null then continue; end if;
    select bool_or(coalesce(speed,0)>5) into moved from tank_log where vehicle_id=v.id and at>v.gps_at-make_interval(mins=>(c->>'win')::int);
    if coalesce(moved,false) then continue; end if;
    select max(tank) into before_max from tank_log where vehicle_id=v.id and at between v.gps_at-make_interval(mins=>(c->>'win')::int) and v.gps_at-interval '15 minutes';
    select percentile_cont(0.5) within group (order by tank) into now_lvl from (select tank from tank_log where vehicle_id=v.id order by at desc limit 3) q;
    if before_max is null or now_lvl is null then continue; end if;
    -- medzi meraniami nesmie byť medzera bez dát nad 6 h (výpadok signálu)
    select coalesce(max(d)<=interval '6 hours',true) into gapok from (select at-lag(at) over (order by at) d from tank_log where vehicle_id=v.id and at>=v.gps_at-make_interval(mins=>(c->>'win')::int)-interval '1 day') z;
    if not gapok then continue; end if;
    if before_max-now_lvl >= (c->>'drop')::numeric
       and not exists(select 1 from fleet_events where vehicle_id=v.id and kind='fuel_drop' and at>now()-make_interval(mins=>(c->>'cool')::int)) then
      select driver into drv from rides where vehicle_id=any(veh_ids(v.id)) order by start_at desc limit 1;
      insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon)
        values(v.id,v.plate,'fuel_drop',drv,(select name from places p where abs(p.lat-v.lat)<0.01 and abs(p.lon-v.lon)<0.015 order by power(p.lat-v.lat,2)+power(p.lon-v.lon,2) limit 1),'fuel',round(before_max-now_lvl),v.lat,v.lon);
      if t is not null then
        msg:='⚠️ '||coalesce(v.plate,v.name)||': pokles nafty o '||round(before_max-now_lvl)||' l v stojacom aute ('||round(before_max)||' → '||round(now_lvl)||' l)'||
             case when coalesce(v.ign,0)=0 then ' · motor vypnutý' else '' end||' · '||to_char(now() at time zone 'Europe/Bratislava','HH24:MI');
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,
          'click','https://maps.google.com/?q='||v.lat||','||v.lon)); exception when others then null; end;
      end if; k:=k+1;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_check() from public, anon, authenticated;

-- ===== aktívne auto bez signálu: bez duplicitných ID a odstavených/servisných =====
create or replace function public.no_signal_check() returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare t text; k int:=0; v record; isnew boolean; tz text:='Europe/Bratislava'; msg text;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  for v in
    select c.*, coalesce(c.plate,c.name,c.id) pl, floor(extract(epoch from now()-c.gps_at)/3600)::int hod,
           (select round(sum(distance)) from rides r where r.vehicle_id=any(veh_ids(c.id)) and r.start_at>=now()-interval '7 days') km7,
           (select trim(driver) from rides r where r.vehicle_id=any(veh_ids(c.id)) and not fleet_unknown(r.driver) order by start_at desc limit 1) drv,
           (select stop_addr from rides r where r.vehicle_id=any(veh_ids(c.id)) order by start_at desc limit 1) addr
      from cmd_vehicles c
     where c.gps_at is not null and c.gps_at<now()-interval '12 hours' and c.alias_of is null and not coalesce(c.deleted,false) and not veh_off(c.id)
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

-- ===== tankovanie nesedí: ustálená hladina, kalibrácia, odstavené/servis, alarm s vlastným stavom sa nemaže =====
create or replace function public.refuel_gap_sync(since timestamptz) returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare k int:=0; n int; t text; e record;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  delete from fleet_events fe where fe.kind='refuel_gap' and fe.at>=since-interval '2 days' and fe.st='novy'
     and fe.src_key like 'gap:%'
     and exists(select 1 from rides r where r.ride_id=substr(fe.src_key,5))
     and not coalesce((select q.bad and q.ready from refuel_eval(substr(fe.src_key,5)) q),false);
  for e in
    with x as (
      insert into fleet_events as f(vehicle_id,plate,kind,at,driver,liters,place,place_kind,t_from,note,src_key,flag,flag_note)
      select r.vehicle_id,coalesce(r.plate,(select plate from cmd_vehicles where id=r.vehicle_id)),'refuel_gap',coalesce(r.stop_at,r.start_at),r.driver,abs(q.diff),r.stop_addr,'fuel',
             tk.t,
             'tankovanie '||to_char(tk.t at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI')||' · natankované '||round(q.refuel)||' l · nárast v nádrži '||q.rise||' l (ustálená hladina) · rozdiel '||case when q.diff>0 then '−' else '+' end||abs(q.diff)||' l ('||replace(q.pct::text,'.',',')||' %)'
             ||case when q.diff>0 then ' – v nádrži pribudlo menej, ako bolo natankované' else ' – v nádrži pribudlo viac, ako je na doklade' end,
             'gap:'||r.ride_id,
             case when veh_calib_on(r.vehicle_id) is not null then 'kalibracia' when veh_off(r.vehicle_id) then 'servis' end,
             case when veh_calib_on(r.vehicle_id) is not null then 'snímač nekalibrovaný – koeficient '||replace(veh_calib_on(r.vehicle_id)::text,'.',',')||'; prepočítaný nárast ≈ '||round(q.rise/veh_calib_on(r.vehicle_id))||' l (orientačne)'
                  when veh_off(r.vehicle_id) then 'auto odstavené / na servise' end
        from rides r cross join lateral refuel_eval(r.ride_id) q
        cross join lateral (select coalesce((select min(c.at) from cmd_refuel c where c.ride_id=r.ride_id),
                                            (select min(c.at) from cmd_refuel c where c.object_id=r.vehicle_id and c.at between r.start_at-interval '30 minutes' and coalesce(r.stop_at,r.start_at)+interval '30 minutes'),
                                            coalesce(r.stop_at,r.start_at)) t) tk
       where coalesce(r.stop_at,r.start_at)>=since and r.refuel_l>0 and q.bad and q.ready
      on conflict (src_key) do update set liters=excluded.liters, note=excluded.note, t_from=excluded.t_from,
         flag=case when f.flag='artefakt' then f.flag else excluded.flag end, flag_note=case when f.flag='artefakt' then f.flag_note else excluded.flag_note end
      returning f.plate, f.note, f.at, f.driver, f.flag, (xmax=0) isnew)
    select * from x
  loop
    if e.isnew then k:=k+1;
      if t is not null and e.at>now()-interval '6 hours' and e.flag is null then
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Tankovanie nesedí','message',
          coalesce(e.plate,'')||': '||e.note||coalesce(' · '||e.driver,'')||' · '||to_char(e.at at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
          'tags',jsonb_build_array('fuelpump','warning'),'priority',4)); exception when others then null; end;
      end if;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.refuel_gap_sync(timestamptz) from public, anon, authenticated;

-- ===== jeden beh nových kontrol (každých 10 min; kalibrácia raz za hodinu) =====
create or replace function public.fuel_extra_tick() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; m int:=extract(minute from now())::int;
begin
  if m % 10 >= 2 then return 0; end if;
  if m < 2 or not exists(select 1 from veh_calib) then
    perform calib_sync();
    insert into ai_state(key,value) values('card_assign',jsonb_build_object('rows',card_assign_report())) on conflict(key) do update set value=excluded.value, updated_at=now();
  end if;
  -- auto odstavené alebo na servise: nové alarmy nafty bez upozornenia a mimo strát
  update fleet_events set flag='servis', flag_note='auto odstavené / na servise – vyradené z alarmov'
   where at>now()-interval '1 day' and flag is null and st='novy' and kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank','card_offhours','card_double','card_far','no_signal','speed','limiter') and veh_off(vehicle_id);
  k:=k+artifact_sync(now()-interval '2 days');
  k:=k+paid_not_tank_check(now()-interval '3 days', true);
  k:=k+card_checks(now()-interval '3 days');
  return k;
end $$;
revoke all on function public.fuel_extra_tick() from public, anon, authenticated;

create or replace function public.yard_check() returns integer language plpgsql security definer set search_path=public as $$
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
  k:=k+check_run('fuel_extra_tick');
  return k;
end $$;
revoke all on function public.yard_check() from public, anon, authenticated;

-- AI úprava 26. 10. 2026 (6/6): jednorazové prepočty od 1. 7. 2026 (každý krok samostatne – chyba jedného nezastaví ostatné)

-- 1) výpadok dát namiesto poklesu v státí: alarmy z 25. 10. pri autách, ktoré stáli od júla/augusta (diera v signáli)
do $$ declare n int; begin
  with L(pl,l) as (values ('AA907DJ',297),('AA724HJ',209),('AA954HN',176),('AA148BM',77),('AA092GA',62),('AA575OV',55),('MI377FA',42)),
  e as (select f.id, f.src_key from fleet_events f join L on abs(coalesce(f.liters,0)-L.l)<=3
          where f.kind='fuel_drop' and (f.at at time zone 'Europe/Bratislava')::date='2026-10-25'
            and (pnorm(f.plate)=L.pl or exists(select 1 from cmd_vehicles v where pnorm(v.plate)=L.pl and f.vehicle_id=any(veh_ids(v.id)))))
  update fleet_events f set kind='data_gap',
     src_key=case when f.src_key like 'drp:%' and not exists(select 1 from fleet_events x where x.src_key='dgap:'||substr(f.src_key,5)) then 'dgap:'||substr(f.src_key,5) when f.src_key like 'drp:%' then 'dgapx:'||f.id else f.src_key end,
     minutes=case when f.t_from is not null then floor(extract(epoch from coalesce(f.t_to,f.at)-f.t_from)/60)::int else f.minutes end,
     note='výpadok dát – státie od '||coalesce(to_char(f.t_from at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI'),'leta')||' (diera v signáli)'
        ||case when f.t_from is not null then ', dĺžka výpadku '||floor(extract(epoch from coalesce(f.t_to,f.at)-f.t_from)/86400)||' dní' else '' end
        ||' · rozdiel hladiny '||coalesce(round(f.lvl_from)::text,'?')||' → '||coalesce(round(f.lvl_to)::text,'?')||' l (−'||round(coalesce(f.liters,0))||' l) · zrušené ako pokles v státí 26. 10. 2026 (nepočíta sa do strát)'
   from e where f.id=e.id;
  get diagnostics n=row_count;
  insert into check_err as c(fn,msg,ok_at,n) values('oprava_25_10',null,now(),n) on conflict on constraint check_err_pkey do update set ok_at=now(), n=excluded.n, msg=null;
exception when others then insert into check_err as c(fn,msg,at) values('oprava_25_10',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;

-- 1b) všeobecne: pokles v státí, počas ktorého sonda nemala ani jeden záznam a státie trvalo viac ako 24 h = výpadok dát
do $$ begin
  update fleet_events f set kind='data_gap', src_key=case when f.src_key like 'drp:%' and not exists(select 1 from fleet_events x where x.src_key='dgap:'||substr(f.src_key,5)) then 'dgap:'||substr(f.src_key,5) when f.src_key like 'drp:%' then 'dgapx:'||f.id else f.src_key end,
     minutes=floor(extract(epoch from f.t_to-f.t_from)/60)::int,
     note='výpadok dát '||replace(round(extract(epoch from f.t_to-f.t_from)/3600,1)::text,'.',',')||' h bez záznamu hladiny · rozdiel hladiny '||coalesce(round(f.lvl_from)::text,'?')||' → '||coalesce(round(f.lvl_to)::text,'?')||' l (nepočíta sa ako pokles v státí)'
   where f.kind='fuel_drop' and f.at>='2026-07-01' and f.t_from is not null and f.t_to-f.t_from>interval '24 hours' and f.st='novy'
     and not exists(select 1 from tank_log t where t.vehicle_id=any(veh_ids(f.vehicle_id)) and t.at>f.t_from+interval '5 minutes' and t.at<f.t_to-interval '5 minutes');
exception when others then insert into check_err as c(fn,msg,at) values('oprava_vypadok',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;

-- 2) tankovanie nesedí – prepočet z ustálenej hladiny od 1. 7.
do $$ begin perform refuel_gap_sync('2026-07-01 00:00+02'::timestamptz);
exception when others then insert into check_err as c(fn,msg,at) values('prepocet_tankovania',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;
-- 3) kalibrácia snímačov
do $$ begin perform calib_sync();
exception when others then insert into check_err as c(fn,msg,at) values('calib_sync',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;
-- 4) artefakty snímača po tankovaní od 1. 7.
do $$ begin perform artifact_sync('2026-07-01 00:00+02'::timestamptz);
exception when others then insert into check_err as c(fn,msg,at) values('artifact_sync',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;
-- 4b) prípady, ktoré majiteľ potvrdil ako artefakt (AA623NU 5. 10., MI 680FU 2. 10., MI441FV 11. 9.)
do $$ begin
  with L(pl,dy,drop_l) as (values ('AA623NU',date '2026-10-05',220),('MI680FU',date '2026-10-02',114),('MI441FV',date '2026-09-11',114))
  update fleet_events f set flag='artefakt', flag_note=coalesce(f.flag_note,'artefakt snímača po tankovaní (prebytok pri tankovaní a následný pokles) – nepočíta sa do strát; overiť skúškou')
    from L where (pnorm(f.plate)=L.pl or exists(select 1 from cmd_vehicles v where pnorm(v.plate)=L.pl and f.vehicle_id=any(veh_ids(v.id))))
     and (coalesce(f.t_from,f.at) at time zone 'Europe/Bratislava')::date between L.dy and L.dy+1
     and ((f.kind in ('fuel_drop','data_gap') and abs(coalesce(f.liters,0)-L.drop_l)<=5) or (f.kind='refuel_gap' and f.note like '%pribudlo viac%'))
     and coalesce(f.flag,'')<>'artefakt';
exception when others then insert into check_err as c(fn,msg,at) values('artefakt_potvrdene',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;
-- 5) „Zaplatené, ale nie v nádrži“ spätne od 1. 7. (bez upozornení do mobilu)
do $$ begin perform paid_not_tank_check('2026-07-01 00:00+02'::timestamptz,false);
exception when others then insert into check_err as c(fn,msg,at) values('paid_not_tank',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;
-- 6) kontroly kariet od 1. 7. a priradenie kariet k vozidlám
do $$ begin perform card_checks('2026-07-01 00:00+02'::timestamptz);
  insert into ai_state(key,value) values('card_assign',jsonb_build_object('rows',card_assign_report())) on conflict(key) do update set value=excluded.value, updated_at=now();
exception when others then insert into check_err as c(fn,msg,at) values('card_checks',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;
-- 7) výzvy Vodič (pokles MI 680FU) a Slivka (pokles AA623NU): poznámka o pravdepodobnom artefakte snímača
do $$ begin
  update ai_docs set content=case when content ~ E'\\n+S pozdravom' then regexp_replace(content, E'(\\n+S pozdravom)', E'\n\n**Poznámka (26. 10. 2026):** pravdepodobný artefakt snímača – overiť skúškou.\\1')
                                  else content||E'\n\n**Poznámka (26. 10. 2026):** pravdepodobný artefakt snímača – overiť skúškou.' end
   where kind in ('vyzva','upozornenie') and content not like '%pravdepodobný artefakt snímača%'
     and ((coalesce(driver,'')||' '||title||' '||content) ilike '%Vodič' and (title||content) ~* 'MI ?680 ?FU'
       or (coalesce(driver,'')||' '||title||' '||content) ilike '%Slivk%' and (title||content) ~* 'AA ?623 ?NU');
exception when others then insert into check_err as c(fn,msg,at) values('vyzvy_poznamka',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;

-- AI úprava 26. 10. 2026: alarm „Možná kabotáž“ (Flotila EU) + yard_check
-- ===== 2) MOŽNÁ KABOTÁŽ (Flotila EU) =====
-- krajina z adresy Commandera
create or replace function public.addr_cc(a text) returns text language sql immutable as $$
  select case when a is null or btrim(a)='' then null
    when a ~* '(Slovakia|Slovensk|Slowakei|Szlovákia)' or a ~ '(\ySK\y|\ySVK\y)' then 'SK'
    when a ~* '(Czech|Česk|Tschech|Csehország)' or a ~ '(\yCZ\y|\yCZE\y)' then 'CZ'
    when a ~* '(Hungary|Maďarsk|Magyarország|Ungarn)' or a ~ '(\yHU\y|\yHUN\y)' then 'HU'
    when a ~* '(Poland|Poľsk|Polska|Polen\y)' or a ~ '(\yPL\y|\yPOL\y)' then 'PL'
    when a ~* '(Austria|Rakúsk|Österreich|Osterreich)' or a ~ '(\yAT\y|\yAUT\y|\yA-\d{4}\y)' then 'AT'
    when a ~* '(Germany|Nemeck|Deutschland|Németország)' or a ~ '(\yDE\y|\yDEU\y|\yD-\d{5}\y)' then 'DE'
    when a ~* '(Netherlands|Holand|Nederland|Niederlande)' or a ~ '(\yNL\y|\yNLD\y)' then 'NL'
    when a ~* '(Belgi)' or a ~ '(\yBE\y|\yBEL\y)' then 'BE'
    when a ~* '(Luxemb)' or a ~ '(\yLU\y|\yLUX\y)' then 'LU'
    when a ~* '(France|Francúzsk|Frankreich)' or a ~ '(\yFR\y|\yFRA\y)' then 'FR'
    when a ~* '(Ital|Talian)' or a ~ '(\yIT\y|\yITA\y)' then 'IT'
    when a ~* '(Sloveni[ja]|Slovinsk|Slowenien)' or a ~ '(\ySI\y|\ySVN\y)' then 'SI'
    when a ~* '(Croatia|Chorvátsk|Hrvatska|Kroatien)' or a ~ '(\yHR\y|\yHRV\y)' then 'HR'
    when a ~* '(Romania|Rumunsk|România|Rumänien)' or a ~ '(\yRO\y|\yROU\y)' then 'RO'
    when a ~* '(Ukrain|Україна)' or a ~ '(\yUA\y|\yUKR\y)' then 'UA'
    when a ~* '(Switzerland|Švajčiar|Schweiz|Suisse)' or a ~ '(\yCH\y|\yCHE\y)' then 'CH'
    when a ~* '(Denmark|Dánsk|Danmark)' or a ~ '(\yDK\y|\yDNK\y)' then 'DK'
    when a ~* '(Spain|Španiel|España)' or a ~ '(\yES\y|\yESP\y)' then 'ES'
    when a ~* '(Bulgaria|Bulharsk)' or a ~ '(\yBG\y|\yBGR\y)' then 'BG'
    when a ~* '(Serbia|Srbsk)' or a ~ '(\yRS\y|\ySRB\y)' then 'RS'
    when a ~* '(Lithuania|Litv)' or a ~ '(\yLT\y|\yLTU\y)' then 'LT'
    when a ~* '(Sweden|Švédsk|Sverige)' or a ~ '(\ySE\y|\ySWE\y)' then 'SE'
  end $$;

-- bod v polygóne ([[lon,lat],…])
create or replace function public.geo_in_poly(lon numeric, lat numeric, p jsonb) returns boolean language plpgsql immutable as $$
declare n int:=jsonb_array_length(p); i int; j int; xi numeric; yi numeric; xj numeric; yj numeric; c boolean:=false;
begin
  j:=n-1;
  for i in 0..n-1 loop
    xi:=(p->i->>0)::numeric; yi:=(p->i->>1)::numeric; xj:=(p->j->>0)::numeric; yj:=(p->j->>1)::numeric;
    if ((yi>lat)<>(yj>lat)) and (lon < (xj-xi)*(lat-yi)/(yj-yi)+xi) then c:=not c; end if;
    j:=i;
  end loop;
  return c;
end $$;

-- krajina zo súradníc (záloha, keď adresa nemá štát): SK, CZ, AT, HU podľa obrysu, ostatné podľa obdĺžnika
create or replace function public.geo_cc(lat numeric, lon numeric) returns text language plpgsql immutable as $$
declare b record;
begin
  if lat is null or lon is null then return null; end if;
  if geo_in_poly(lon,lat,'[[16.84,48.37],[16.95,48.62],[17.2,48.87],[17.55,48.8],[17.88,48.93],[18.1,49.08],[18.4,49.33],[18.85,49.52],[19.25,49.55],[19.47,49.6],[19.8,49.2],[20.1,49.3],[20.7,49.4],[21.3,49.45],[21.8,49.35],[22.2,49.15],[22.56,49.08],[22.15,48.4],[21.7,48.38],[21.4,48.55],[20.8,48.57],[20.45,48.47],[19.9,48.15],[19.5,48.1],[18.85,48.05],[18.65,47.76],[17.8,47.75],[17.3,47.95],[17.05,48.1]]'::jsonb) then return 'SK'; end if;
  if geo_in_poly(lon,lat,'[[12.09,50.25],[12.5,50.4],[13.0,50.5],[14.3,51.05],[14.8,50.85],[15.0,51.0],[16.3,50.65],[16.6,50.15],[17.0,50.4],[17.7,50.3],[18.0,50.0],[18.85,49.52],[18.4,49.33],[17.6,48.85],[17.1,48.85],[16.9,48.6],[16.0,48.75],[15.0,49.0],[14.7,48.6],[14.0,48.6],[13.8,48.75],[13.0,49.3],[12.5,49.7],[12.4,50.0],[12.1,50.2]]'::jsonb) then return 'CZ'; end if;
  if geo_in_poly(lon,lat,'[[9.53,47.27],[9.6,47.55],[10.2,47.3],[10.5,47.55],[11.1,47.4],[12.2,47.6],[12.8,47.55],[13.0,47.8],[12.75,48.1],[13.4,48.35],[13.8,48.55],[14.7,48.6],[15.0,49.0],[16.0,48.75],[16.9,48.6],[17.15,48.0],[16.5,47.5],[16.4,46.9],[15.0,46.65],[14.0,46.45],[12.4,46.7],[12.1,47.0],[11.1,46.95],[10.4,46.85],[10.1,46.85],[9.6,47.05]]'::jsonb) then return 'AT'; end if;
  if geo_in_poly(lon,lat,'[[16.1,46.85],[16.4,46.9],[16.5,47.5],[17.15,48.0],[17.3,47.95],[17.8,47.75],[18.65,47.76],[18.85,48.05],[19.5,48.1],[19.9,48.15],[20.45,48.47],[20.8,48.57],[21.4,48.55],[21.7,48.38],[22.15,48.4],[22.9,47.95],[22.1,47.6],[21.3,46.6],[20.2,46.15],[18.8,45.9],[17.3,45.95],[16.6,46.47]]'::jsonb) then return 'HU'; end if;
  for b in select * from (values ('NL',50.75,53.6,3.3,7.2),('BE',49.5,51.5,2.5,6.4),('CH',45.8,47.8,5.95,10.5),('SI',45.42,46.88,13.38,16.6),('HR',42.39,46.55,13.49,19.45),
      ('PL',49.0,54.9,14.9,24.15),('DE',47.27,55.06,5.87,15.04),('FR',42.3,51.1,-4.8,8.2),('IT',36.6,47.1,6.6,18.5),('RO',43.62,48.27,20.26,29.7),('UA',44.4,52.38,22.13,40.2),('DK',54.5,57.8,8.0,12.7)) x(c,a,b2,c1,d)
  loop
    if lat between b.a and b.b2 and lon between b.c1 and b.d then return b.c; end if;
  end loop;
  return null;
end $$;

create or replace function public.ride_cc(addr text, lat numeric, lon numeric) returns text language sql immutable as $$
  select coalesce(addr_cc(addr), geo_cc(lat,lon)) $$;

create or replace function public.cc_name(c text) returns text language sql immutable as $$
  select coalesce((jsonb_build_object('SK','Slovensko','CZ','Česko','HU','Maďarsko','PL','Poľsko','AT','Rakúsko','DE','Nemecko','NL','Holandsko','BE','Belgicko','LU','Luxembursko',
    'FR','Francúzsko','IT','Taliansko','SI','Slovinsko','HR','Chorvátsko','RO','Rumunsko','UA','Ukrajina','CH','Švajčiarsko','DK','Dánsko','ES','Španielsko','BG','Bulharsko',
    'RS','Srbsko','LT','Litva','SE','Švédsko'))->>c, c) $$;

-- Možná kabotáž: autá skupiny Flotila EU, jazdy so štartom aj cieľom v tom istom štáte mimo Slovenska,
-- v kĺzavom okne 7 dní od posledného vyloženia medzinárodnej prepravy (koniec príjazdu do štátu – prvé státie 90+ min po prechode hranice).
-- Jazdy so státím do 90 min (prestávky, tankovanie) sa spájajú do jednej prepravy; preprava musí mať aspoň 20 km. Pri 3. preprave alarm stupňa VYSOKÝ.
create or replace function public.cabotage_check(since timestamptz default now()-interval '14 days', push boolean default true) returns int
language plpgsql security definer set search_path=public, extensions, net as $$
declare t text; k int:=0; v record; r record; s record; tz text:='Europe/Bratislava'; f text:='DD.MM.YYYY HH24:MI';
  sid int; ck text; cc text; c1 text; c2 text; prev_stop timestamptz; pl text;
  host text; anchor timestamptz; anchor_addr text; cnt int; ops jsonb; msg text; isnew boolean; drvs text; skey text; lst text;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  create temp table if not exists _cab_r(vid text, sid int, kind text, cc text, start_at timestamptz, stop_at timestamptz, a1 text, a2 text,
    la1 numeric, lo1 numeric, la2 numeric, lo2 numeric, km numeric, drv text) on commit drop;
  for v in select c.id, coalesce(nullif(trim(c.plate),''),c.name,c.id) plate from cmd_vehicles c where c.fleet='eu' and c.alias_of is null loop
    truncate _cab_r; sid:=0; ck:=null; cc:=null; prev_stop:=null;
    -- 1) jazdy → úseky: int = prechod hranice + pokračovanie do prvého státia 90+ min (vyloženie), dom = preprava v jednom štáte, sk = Slovensko, x = neznámy štát
    for r in select * from rides where vehicle_id=any(veh_ids(v.id)) and start_at>=since-interval '10 days' and start_at is not null order by start_at, stop_at loop
      if prev_stop is not null and r.start_at<prev_stop-interval '2 minutes' then continue; end if; -- duplicita z druhej GPS jednotky
      c1:=ride_cc(r.start_addr,r.lat_start,r.lon_start); c2:=ride_cc(r.stop_addr,r.lat_stop,r.lon_stop);
      if c1 is null and c2 is null then sid:=sid+1; ck:='x'; cc:=null;
      elsif coalesce(c1,c2)<>coalesce(c2,c1) then sid:=sid+1; ck:='int'; cc:=c2;
      else c1:=coalesce(c1,c2);
        if c1='SK' then sid:=sid+1; ck:='sk'; cc:='SK';
        elsif ck in ('int','dom') and cc=c1 and prev_stop is not null and r.start_at-prev_stop<interval '90 minutes' then null; -- pokračovanie tej istej prepravy
        else sid:=sid+1; ck:='dom'; cc:=c1; end if;
      end if;
      insert into _cab_r values(v.id,sid,ck,cc,r.start_at,coalesce(r.stop_at,r.start_at+make_interval(secs=>coalesce(r.duration,0))),r.start_addr,r.stop_addr,r.lat_start,r.lon_start,r.lat_stop,r.lon_stop,coalesce(r.distance,0),
        case when not fleet_unknown(r.driver) then trim(r.driver) end);
      prev_stop:=greatest(coalesce(prev_stop,r.start_at),coalesce(r.stop_at,r.start_at));
    end loop;
    -- 2) okno 7 dní od vyloženia
    host:=null; anchor:=null; anchor_addr:=null; cnt:=0; ops:='[]';
    for s in select x.sid, x.kind, x.cc, min(x.start_at) t0, max(x.stop_at) t1, sum(x.km) km,
                    (array_agg(x.a1 order by x.start_at))[1] a1, (array_agg(x.a2 order by x.start_at desc))[1] a2,
                    (array_agg(x.la1 order by x.start_at))[1] la1, (array_agg(x.lo1 order by x.start_at))[1] lo1,
                    (array_agg(x.la2 order by x.start_at desc))[1] la2, (array_agg(x.lo2 order by x.start_at desc))[1] lo2,
                    string_agg(distinct x.drv, ', ') drv
               from _cab_r x group by x.sid, x.kind, x.cc order by x.sid loop
      if s.kind='int' then
        if s.cc is not null and s.cc<>'SK' then host:=s.cc; anchor:=s.t1; anchor_addr:=coalesce(s.a2,round(s.la2,4)||', '||round(s.lo2,4)); else host:=null; anchor:=null; end if;
        cnt:=0; ops:='[]';
      elsif s.kind='sk' then host:=null; anchor:=null; cnt:=0; ops:='[]';
      elsif s.kind='dom' then
        if s.cc is distinct from host or anchor is null then host:=s.cc; anchor:=null; cnt:=0; ops:='[]';
        elsif s.km>=20 and s.t0<=anchor+interval '7 days' then
          cnt:=cnt+1;
          ops:=ops||jsonb_build_array(jsonb_build_object('t0',s.t0,'t1',s.t1,'a1',coalesce(s.a1,round(s.la1,4)||', '||round(s.lo1,4)),'a2',coalesce(s.a2,round(s.la2,4)||', '||round(s.lo2,4)),
                                                         'km',round(s.km),'drv',s.drv,'la',s.la1,'lo',s.lo1));
          if cnt>=3 and (s.t0>=greatest(since,'2026-07-01 00:00+02'::timestamptz) or exists(select 1 from fleet_events where src_key='cab:'||v.id||':'||to_char(anchor at time zone 'UTC','YYYYMMDDHH24MI'))) then
            skey:='cab:'||v.id||':'||to_char(anchor at time zone 'UTC','YYYYMMDDHH24MI');
            select string_agg(n||') '||to_char((e->>'t0')::timestamptz at time zone tz,f)||' '||(e->>'a1')||' → '||to_char((e->>'t1')::timestamptz at time zone tz,f)||' '||(e->>'a2')
                              ||' ('||(e->>'km')||' km'||coalesce(', '||(e->>'drv'),'')||')', ' · ' order by n),
                   string_agg(distinct e->>'drv', ', ')
              into lst, drvs from jsonb_array_elements(ops) with ordinality q(e,n);
            msg:='Možná kabotáž – '||cc_name(host)||' ('||host||'): '||cnt||' vnútroštátne prepravy do 7 dní od vyloženia medzinárodnej prepravy (vyloženie '
               ||to_char(anchor at time zone tz,f)||', '||coalesce(anchor_addr,'?')||'). Prepravy: '||lst||' · stupeň VYSOKÝ';
            insert into fleet_events as e(vehicle_id,plate,kind,at,driver,place,place_kind,lat,lon,t_from,t_to,note,src_key)
              values(v.id,v.plate,'cabotage',s.t1,coalesce(s.drv,drvs),cc_name(host)||': '||(ops->-1->>'a1')||' → '||(ops->-1->>'a2'),'country',s.la1,s.lo1,anchor,s.t1,msg,skey)
              on conflict (src_key) do update set note=excluded.note, t_to=excluded.t_to, driver=excluded.driver
              returning (xmax=0) into isnew;
            if isnew then k:=k+1; end if;
            if isnew and push and t is not null and s.t1>now()-interval '6 hours' then
              begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KABOTÁŽ – '||v.plate,'message','⚠️ '||v.plate||' · '||msg,
                'tags',jsonb_build_array('rotating_light'),'priority',5,'click','https://maps.google.com/?q='||s.la1||','||s.lo1)); exception when others then null; end;
            end if;
          end if;
        end if;
      end if;
    end loop;
  end loop;
  return k;
end $$;
revoke all on function public.cabotage_check(timestamptz,boolean) from public, anon, authenticated;

-- beh každých 15 min (v rámci yard_check)
create or replace function public.cabotage_tick() returns int language plpgsql security definer set search_path=public as $$
begin
  if extract(minute from now())::int % 15 >= 3 then return 0; end if;
  return cabotage_check(now()-interval '14 days', true);
end $$;
revoke all on function public.cabotage_tick() from public, anon, authenticated;

create or replace function public.yard_check() returns integer language plpgsql security definer set search_path=public as $$
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
  k:=k+check_run('fuel_extra_tick');
  k:=k+check_run('cabotage_tick');
  return k;
end $$;
revoke all on function public.yard_check() from public, anon, authenticated;

-- spätné vyhodnotenie od 1. 7. 2026 (bez upozornení do mobilu)
do $$ declare n int; begin
  n:=cabotage_check('2026-07-01 00:00+02'::timestamptz, false);
  insert into check_err as c(fn,msg,ok_at,n) values('kabotaz_od_1_7',null,now(),n) on conflict on constraint check_err_pkey do update set ok_at=now(), n=excluded.n, msg=null;
exception when others then insert into check_err as c(fn,msg,at) values('kabotaz_od_1_7',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end $$;
