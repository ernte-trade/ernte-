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
