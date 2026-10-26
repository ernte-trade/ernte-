-- ERNTE – udalosti flotily z jázd (rýchlosť, pokles nafty pri státí, tankovanie, príchod/odchod, odchod po státí),
-- POZOR: krok 5 (tankovanie nesedí) je od 25. 10. 2026 nahradený vo fuel3.sql (refuel_gap_sync).
-- výdaj nafty z vlastnej nádrže na dvore, hodnotenie vodičov, zisk mesiaca, nálezy a denný report flotily.
alter table fleet_events add column if not exists src_key text;
alter table fleet_events add column if not exists kmh int;
create unique index if not exists fev_src on fleet_events(src_key);
create index if not exists fev_veh_at on fleet_events(vehicle_id, at);
create index if not exists rides_drv on rides(driver, start_at);

-- vodič „TACHO-…“, prázdny alebo „neznámy vodič“
create or replace function public.fleet_unknown(d text) returns boolean language sql immutable as $$
  select d is null or trim(d)='' or trim(d) ilike 'TACHO%' or lower(trim(d)) in ('neznámy vodič','neznamy vodic') $$;
create or replace function public.geo_m(a_lat numeric, a_lon numeric, b_lat numeric, b_lon numeric) returns numeric language sql immutable as $$
  select (6371000*2*asin(least(1,sqrt(power(sin(radians(b_lat-a_lat)/2),2)+cos(radians(a_lat))*cos(radians(b_lat))*power(sin(radians(b_lon-a_lon)/2),2)))))::numeric $$;
-- najbližšie známe miesto (dvor, odberateľ, čerpačka…) v jeho okruhu
create or replace function public.place_near(la numeric, lo numeric, kinds text[] default null) returns table(id bigint, name text, kind text) language sql stable security definer set search_path=public as $$
  select p.id, p.name, p.kind from places p
   where la is not null and lo is not null and p.lat between la-0.03 and la+0.03 and p.lon between lo-0.045 and lo+0.045
     and (kinds is null or p.kind=any(kinds)) and geo_m(la,lo,p.lat,p.lon) <= greatest(p.r,100)
   order by geo_m(la,lo,p.lat,p.lon) limit 1 $$;
revoke all on function public.place_near(numeric,numeric,text[]) from public, anon, authenticated;

-- ===== udalosti z jázd: každá nájdená udalosť sa uloží s dátumom, ŠPZ a vodičom (aj spätne) =====
create or replace function public.ride_events_since(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; n int; c jsonb; son boolean; mn int; gp numeric;
begin
  select value into c from fleet_cfg where key='stop'; son:=coalesce((c->>'on')::boolean,true); mn:=coalesce((c->>'min')::int,30);
  select value into c from fleet_cfg where key='fuel'; gp:=coalesce((c->>'gap')::numeric,30);
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
  -- 5) tankovanie nesedí s nárastom v nádrži
  insert into fleet_events(vehicle_id,plate,kind,at,driver,liters,place,place_kind,note,src_key)
    select r.vehicle_id,r.plate,'refuel_gap',r.stop_at,r.driver,round(r.fuel_start+r.refuel_l-coalesce(r.fuel_consumed,0)-r.fuel_stop),r.stop_addr,'fuel',
           'natankované '||round(r.refuel_l)||' l','gap:'||r.ride_id
      from rides r where r.start_at>=since and r.refuel_l>0 and r.fuel_start is not null and r.fuel_stop is not null
       and r.fuel_start+r.refuel_l-coalesce(r.fuel_consumed,0)-r.fuel_stop>=greatest(gp,r.refuel_l*0.08)
       and not exists(select 1 from fleet_events e where e.vehicle_id=r.vehicle_id and e.kind='refuel_gap' and e.src_key is null and e.at=r.stop_at)
    on conflict (src_key) do nothing;
  get diagnostics n=row_count; k:=k+n;
  return k;
end $$;
revoke all on function public.ride_events_since(timestamptz) from public, anon, authenticated;
create or replace function public.ride_events() returns int language sql security definer set search_path=public as $$ select public.ride_events_since(now()-interval '3 days') $$;
revoke all on function public.ride_events() from public, anon, authenticated;

-- ===== výdaj nafty z vlastnej nádrže na dvore =====
create table if not exists yard_fuel(id bigserial primary key, kind text not null default 'vydaj' check (kind in ('vydaj','nakup','stav')),
  day date not null default current_date, vehicle_id text, plate text, driver text, liters numeric not null default 0 check (liters>=0),
  tank_after numeric check (tank_after is null or tank_after>=0), price numeric, note text,
  created_by text default (auth.jwt()->>'email'), created_at timestamptz not null default now());
create index if not exists yard_fuel_day on yard_fuel(day desc);
alter table yard_fuel enable row level security;
drop policy if exists yf_read on yard_fuel; create policy yf_read on yard_fuel for select using (is_fleet());
drop policy if exists yf_ins on yard_fuel; create policy yf_ins on yard_fuel for insert with check (is_fleet());
drop policy if exists yf_upd on yard_fuel; create policy yf_upd on yard_fuel for update using (is_fleet()) with check (is_fleet());
drop policy if exists yf_del on yard_fuel; create policy yf_del on yard_fuel for delete using (is_owner());
create or replace function public.yard_fuel_balance() returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('nakupene_l',round(coalesce(sum(liters) filter (where kind='nakup'),0)),'vydane_l',round(coalesce(sum(liters) filter (where kind='vydaj'),0)),
    'stav_nadrze_l',(select round(tank_after) from yard_fuel where tank_after is not null order by day desc, created_at desc limit 1),
    'rozdiel_l',round(coalesce(sum(liters) filter (where kind='nakup'),0)-coalesce(sum(liters) filter (where kind='vydaj'),0)-coalesce((select tank_after from yard_fuel where tank_after is not null order by day desc, created_at desc limit 1),0)),
    'rozdiel_pct',case when sum(liters) filter (where kind='nakup')>0 then round((sum(liters) filter (where kind='nakup')-coalesce(sum(liters) filter (where kind='vydaj'),0)-coalesce((select tank_after from yard_fuel where tank_after is not null order by day desc, created_at desc limit 1),0))/sum(liters) filter (where kind='nakup')*100,1) end,
    'vydaj_tento_mesiac_l',round(coalesce(sum(liters) filter (where kind='vydaj' and day>=date_trunc('month',now() at time zone 'Europe/Bratislava')::date),0)),
    'zaznamov',count(*))
  from yard_fuel $$;
revoke all on function public.yard_fuel_balance() from public, anon, authenticated;

-- ===== hodnotenie vodičov za obdobie: km, l/100, spotrebované/natankované (karta + dvor), rozdiel l, %, € bez DPH,
-- prekročenia 90 km/h, max rýchlosť, poklesy paliva pri státí, nafta + mýto na km.
-- Tankovanie patrí vodičovi jazdy; ak je jazda „TACHO-“/neznámy vodič, najbližšiemu známemu vodičovi na tom istom aute (do 12 h).
create or replace function public.fleet_drv_eval(a timestamptz, b timestamptz) returns jsonb language plpgsql stable security definer set search_path=public as $$
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
      count(*) filter (where max_speed>90) ov, max(max_speed) vmax from rr group by 1,2),
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
end $$;
revoke all on function public.fleet_drv_eval(timestamptz,timestamptz) from public, anon, authenticated;

-- ===== zisk flotily za mesiac do zvoleného dňa (pevné náklady pomerne aj celé, mzdy rovnako ako v aplikácii) =====
create or replace function public.fleet_month(dday date default (now() at time zone 'Europe/Bratislava')::date) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb; pc jsonb; m0 timestamptz; m1 timestamptz; dim int; dd int; vkm numeric; vl numeric; d numeric; t numeric; sh numeric; fx numeric; rt numeric; rv numeric; est boolean; mz numeric; nb numeric; my numeric; fxp numeric;
begin
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  select value into pc from fleet_cfg where key='pay'; pc:=coalesce(pc,'{}');
  d:=coalesce((c->>'diesel')::numeric,1.952); t:=coalesce((c->>'toll')::numeric,0.2677); sh:=coalesce((c->>'share')::numeric,100); fx:=coalesce((c->>'fixed')::numeric,140000); rt:=coalesce((c->>'rate')::numeric,1.5);
  m0:=date_trunc('month',dday)::timestamp at time zone 'Europe/Bratislava'; m1:=(dday+1)::timestamp at time zone 'Europe/Bratislava';
  dim:=extract(day from date_trunc('month',dday)+interval '1 month - 1 day')::int; dd:=extract(day from dday)::int;
  select coalesce(sum(distance),0), coalesce(sum(fuel_consumed) filter (where distance>0),0) into vkm,vl from rides where start_at>=m0 and start_at<m1;
  with r as (select coalesce(nullif(driver,''),'neznámy vodič') dn, (start_at at time zone 'Europe/Bratislava')::date dy, coalesce(distance,0) km,
       ((lat_start is not null and (lat_start<48.38 or lat_start>49.05 or coalesce(lon_start,0)<20.25 or coalesce(lon_start,0)>22.57))
        or (lat_stop is not null and (lat_stop<48.38 or lat_stop>49.05 or coalesce(lon_stop,0)<20.25 or coalesce(lon_stop,0)>22.57))
        or (coalesce(start_addr,'')||' '||coalesce(stop_addr,'')) ~* '(Hungary|Maďarsko|Magyar|Ukrajin|Ukraine|Poľsko|Poland|Česk|Czech|Austria|Rakúsk|\yHU\y|\yUA\y|\yPL\y|\yCZ\y|\yAT\y)') o
      from rides where start_at>=m0 and start_at<m1 and coalesce(ride_type,'') !~ 'PRIVAT'),
    dy as (select dn, dy, sum(km) km, bool_or(o) o from r group by 1,2),
    w as (select dn, count(*) filter (where km>=coalesce((pc->>'minKm')::numeric,10) and not o) i, count(*) filter (where km>=coalesce((pc->>'minKm')::numeric,10) and o) x from dy group by dn)
  select coalesce(sum(greatest(coalesce((pc->>'base')::numeric,1031), i*coalesce((pc->>'inReg')::numeric,80)+x*coalesce((pc->>'outReg')::numeric,90))),0) into mz from w;
  rv:=(select (value->>to_char(dday,'YYYY-MM'))::numeric from fleet_cfg where key='revenue'); est:=rv is null; rv:=coalesce(rv,vkm*rt);
  nb:=vl*d/1.23; my:=vkm*sh/100*t; fxp:=fx*dd/dim;
  return jsonb_build_object('mesiac',to_char(dday,'YYYY-MM'),'do_dna',to_char(dday,'DD.MM.YYYY'),'dni',dd,'dni_v_mesiaci',dim,'km',round(vkm),'nafta_l',round(vl),
    'cena_nafty_s_dph',d,'cena_nafty_bez_dph',round(d/1.23,3),'nafta_eur_bez_dph',round(nb),'nafta_eur_s_dph',round(vl*d),'myto_eur',round(my),
    'pevne_naklady_do_dnes_pomerne',round(fxp),'pevne_naklady_cely_mesiac',round(fx),'mzdy_eur',round(mz),
    'obrat_eur',round(rv),'obrat_je_odhad',est,'obrat_poznamka',case when est then 'Obrat je odhad z nastavenej sadzby €/km, nie z faktúr' else 'Obrat zadaný majiteľom (z faktúr)' end,
    'zisk_do_dnes_pomerne',round(rv-nb-my-fxp-mz),'zisk_cely_mesiac_plne_pevne',round(rv-nb-my-fx-mz));
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.fleet_month(date) from public, anon, authenticated;

-- ===== nálezy flotily (pre ranný/poobedný report a AI) =====
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
    from cmd_vehicles v where (gps_at is null or gps_at<now()-interval '24 hours') and not coalesce((pk->>v.id)::boolean,false);
  select coalesce(jsonb_agg(coalesce(plate,name,id) order by plate),'[]') into nr
    from cmd_vehicles v where not coalesce((pk->>v.id)::boolean,false) and not exists(select 1 from rides r where r.vehicle_id=v.id and r.start_at>=now()-interval '48 hours');
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

-- číslo po slovensky (medzera ako oddeľovač tisícov)
create or replace function public.sk_num(x numeric) returns text language sql immutable as $$
  select case when x is null then null when x<0 then '−' else '' end||replace(to_char(abs(round(x)),'FM999,999,999,990'),',',' ') $$;

-- ===== ranný (5:00) a poobedný (13:00, po–pi) stručný report flotily na Dashboard majiteľa =====
create or replace function public.fleet_daily_report(which text default 'rano') returns bigint language plpgsql security definer set search_path=public as $$
declare f jsonb; t text; x jsonb; s text:=''; aid bigint; eur text;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  f:=fleet_findings();
  eur:=' €';
  t:='## '||case when which='poobede' then 'Poobedný' else 'Ranný' end||' report flotily · '||to_char(now() at time zone 'Europe/Bratislava','DD.MM. HH24:MI')||E'\n\n';
  if f ? 'chyba' then
    t:=t||'⚠️ Report sa nepodarilo spočítať: '||(f->>'chyba');
  elsif (f->>'bez_nalezov')::boolean then
    t:=t||'**Bez nálezov** – včera ani tento mesiac nie je vo flotile nič mimo normy'||coalesce(' (zisk do dnes '||sk_num((f->>'zisk_do_dnes')::numeric)||eur||coalesce(', zmena od včera '||case when (f->>'zmena_zisku_od_vcera')::numeric>=0 then '+' else '−' end||sk_num(abs((f->>'zmena_zisku_od_vcera')::numeric))||eur,'')||')','')||'.';
  else
    if jsonb_array_length(f->'top3_rozdiel_nafty_mesiac')>0 then
      s:=s||E'**Nafta – najväčší rozdiel (mesiac, cena '||replace((f->>'cena_nafty_bez_dph'),'.',',')||E' €/l bez DPH):**\n';
      for x in select * from jsonb_array_elements(f->'top3_rozdiel_nafty_mesiac') loop
        s:=s||'- '||(x->>'vodic')||': '||sk_num((x->>'rozdiel_l')::numeric)||' l ('||replace(coalesce(x->>'rozdiel_pct','?'),'.',',')||' %) ≈ '||sk_num((x->>'rozdiel_eur_bez_dph')::numeric)||' € bez DPH'||coalesce(' · '||(x->>'poznamka'),'')||E'\n';
      end loop; s:=s||E'\n';
    end if;
    if jsonb_array_length(f->'rychlost_nad_90_od_vcera')>0 then
      s:=s||E'**Rýchlosť nad 90 km/h (nové od včera):**\n';
      for x in select * from jsonb_array_elements(f->'rychlost_nad_90_od_vcera') loop s:=s||'- '||(x->>'vodic')||': '||(x->>'pocet')||'× (max '||(x->>'max_kmh')||' km/h) · '||coalesce(x->>'auta','')||E'\n'; end loop; s:=s||E'\n';
    end if;
    if jsonb_array_length(f->'poklesy_paliva_pri_stati_od_vcera')>0 then
      s:=s||E'**Poklesy paliva pri státí (nové):**\n';
      for x in select * from jsonb_array_elements(f->'poklesy_paliva_pri_stati_od_vcera') loop s:=s||'- '||coalesce(x->>'auto','?')||' · '||coalesce(x->>'vodic','vodič neznámy')||' · −'||(x->>'litre')||' l · '||(x->>'kedy')||coalesce(' · '||(x->>'miesto'),'')||E'\n'; end loop; s:=s||E'\n';
    end if;
    if jsonb_array_length(f->'bez_signalu_nad_24h')>0 then
      s:=s||'**Bez signálu nad 24 h:** '||(select string_agg((q.x->>'auto')||coalesce(' ('||(q.x->>'hodin')||' h)',' (bez polohy)'),', ') from jsonb_array_elements(f->'bez_signalu_nad_24h') q(x))||E'\n\n';
    end if;
    if jsonb_array_length(f->'bez_jazdy_48h')>0 then
      s:=s||'**Bez jazdy 48 h:** '||(select string_agg(q.x #>> '{}',', ') from jsonb_array_elements(f->'bez_jazdy_48h') q(x))||E'\n\n';
    end if;
    s:=s||'**Zisk do dnes:** '||coalesce(sk_num((f->>'zisk_do_dnes')::numeric)||eur,'–')||coalesce(' · zmena od včera '||case when (f->>'zmena_zisku_od_vcera')::numeric>=0 then '+' else '−' end||sk_num(abs((f->>'zmena_zisku_od_vcera')::numeric))||eur,'')
      ||case when (f->>'obrat_je_odhad')::boolean then ' _(obrat je odhad z €/km)_' else '' end;
    t:=t||s;
  end if;
  insert into ai_msgs(kind,role,content) values('report','assistant',t) returning id into aid;
  return aid;
end $$;
revoke all on function public.fleet_daily_report(text) from public, anon, authenticated;

-- ===================== 26. 10. 2026 – AKTUÁLNE DEFINÍCIE (nahrádzajú staršie vyššie aj v iných súboroch) =====================
-- AI úprava 26. 10. 2026 (4/6): mzdy jedným výpočtom (Vodiči a mzdy = KPI = zisk = AI), pomerne k dnešku, odvody a diéty podľa nastavenia;
-- pevné náklady a zisk po skupinách flotily

-- skupina vozidla ako v aplikácii (služobné auto zo zoznamu kamiónov Doprava patrí do Regiónu)
create or replace function public.veh_group(vid text) returns text language sql stable security definer set search_path=public as $$
  select case when v.fleet='sluzobne' and exists(select 1 from trucks t where pnorm(t.spz)=pnorm(v.plate)) then 'region'
              when v.fleet in ('region','eu','sluzobne','traktory') then v.fleet else 'region' end
    from cmd_vehicles v where v.id=coalesce((select alias_of from cmd_vehicles where id=vid),vid) $$;
revoke all on function public.veh_group(text) from public, anon, authenticated;

-- mzdy za mesiac (do dňa dday): rovnaký výpočet ako Flotila → Vodiči a mzdy
-- deň = aspoň minKm km; Región: v Košickom kraji inReg, mimo kraja outReg; Flotila EU: euDay za každý deň; vodič dostane vyššie z: základ (pomerne k dnešku v nedokončenom mesiaci) alebo súčet dní
create or replace function public.fleet_pay(dday date default (now() at time zone 'Europe/Bratislava')::date, grp text default 'region')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pc jsonb; m0 timestamptz; m1 timestamptz; dim int; dd int; f numeric; cur boolean; res jsonb;
begin
  select coalesce(value,'{}') into pc from fleet_cfg where key='pay'; pc:=coalesce(pc,'{}');
  m0:=date_trunc('month',dday)::timestamp at time zone 'Europe/Bratislava'; m1:=(dday+1)::timestamp at time zone 'Europe/Bratislava';
  dim:=extract(day from date_trunc('month',dday)+interval '1 month - 1 day')::int; dd:=extract(day from dday)::int;
  cur:=date_trunc('month',dday)=date_trunc('month',(now() at time zone 'Europe/Bratislava')::date) and dd<dim;
  f:=case when cur then dd::numeric/dim else 1 end;
  if grp in ('sluzobne','traktory') then
    return jsonb_build_object('skupina',grp,'mzdy_eur',0,'vodici',0,'poznamka','služobné autá a traktory – mzdy sa nepočítajú');
  end if;
  with gm as (select v.id, case when c.fleet='sluzobne' and exists(select 1 from trucks t where pnorm(t.spz)=pnorm(c.plate)) then 'region'
                               when c.fleet in ('region','eu','sluzobne','traktory') then c.fleet else 'region' end gg, v.alias_of
                 from cmd_vehicles v join cmd_vehicles c on c.id=coalesce(v.alias_of,v.id)),
    r0 as (select r.*, gm.alias_of al, coalesce(gm.gg,'region') g from rides r left join gm on gm.id=r.vehicle_id
               where r.start_at>=m0 and r.start_at<m1 and coalesce(r.ride_type,'') !~ 'PRIVAT'),
    -- duplicitná jazda z druhej GPS jednotky toho istého auta (do 3 min) sa nepočíta
    r1 as (select * from r0 where not (r0.al is not null and exists(select 1 from r0 x where x.vehicle_id=r0.al and abs(extract(epoch from x.start_at-r0.start_at))<=180))),
    r as (select coalesce(nullif(trim(driver),''),'neznámy vodič') dn, (start_at at time zone 'Europe/Bratislava')::date dy, coalesce(distance,0) km,
       ((lat_start is not null and (lat_start<48.38 or lat_start>49.05 or coalesce(lon_start,0)<20.25 or coalesce(lon_start,0)>22.57))
        or (lat_stop is not null and (lat_stop<48.38 or lat_stop>49.05 or coalesce(lon_stop,0)<20.25 or coalesce(lon_stop,0)>22.57))
        or (coalesce(start_addr,'')||' '||coalesce(stop_addr,'')) ~* '(Hungary|Maďarsko|Magyar|Ukrajin|Ukraine|Poľsko|Poland|Česk|Czech|Austria|Rakúsk|\yHU\y|\yUA\y|\yPL\y|\yCZ\y|\yAT\y)') o
      from r1 where r1.g=grp),
    dy as (select dn, dy, sum(km) km, bool_or(o) o from r group by 1,2),
    w as (select dn, count(*) filter (where km>=coalesce((pc->>'minKm')::numeric,10) and not o) i, count(*) filter (where km>=coalesce((pc->>'minKm')::numeric,10) and o) x from dy group by dn),
    p as (select dn, i, x,
            case when grp='eu' then (i+x)*coalesce((pc->>'euDay')::numeric,105) else i*coalesce((pc->>'inReg')::numeric,80)+x*coalesce((pc->>'outReg')::numeric,90) end s
            from w)
  select jsonb_build_object('skupina',grp,'mesiac',to_char(dday,'YYYY-MM'),'do_dna',to_char(dday,'DD.MM.YYYY'),'pomerne',cur,'dni',dd,'dni_v_mesiaci',dim,
     'zaklad',coalesce((pc->>'base')::numeric,1031),'zaklad_pomerne',round(coalesce((pc->>'base')::numeric,1031)*f,2),
     'mzdy_eur',round(coalesce(sum(greatest(coalesce((pc->>'base')::numeric,1031)*f, s)),0)),
     'mzdy_cely_mesiac_zaklad_eur',round(coalesce(sum(greatest(coalesce((pc->>'base')::numeric,1031), s)),0)),
     'vodici',count(*),'dni_v_kraji',coalesce(sum(i),0),'dni_mimo_kraja',coalesce(sum(x),0),
     'diety_eur',round(coalesce(sum(case when grp='eu' then (i+x)*coalesce((pc->>'diet_eu')::numeric,55) else i*coalesce((pc->>'diet_in')::numeric,9.30)+x*coalesce((pc->>'diet_out')::numeric,13.80) end),0)),
     'po_vodicoch',coalesce(jsonb_agg(jsonb_build_object('vodic',dn,'dni_v_kraji',i,'dni_mimo',x,'sucet_dni',s,'mzda',round(greatest(coalesce((pc->>'base')::numeric,1031)*f, s))) order by greatest(coalesce((pc->>'base')::numeric,1031)*f, s) desc),'[]'))
    into res from p;
  return res;
end $$;
revoke all on function public.fleet_pay(date,text) from public, anon, authenticated;

drop function if exists public.fleet_month(date);
create or replace function public.fleet_month(dday date default (now() at time zone 'Europe/Bratislava')::date, grp text default 'region')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb; pc jsonb; m0 timestamptz; m1 timestamptz; dim int; dd int; vkm numeric; vl numeric; d numeric; t numeric; sh numeric; fx numeric; rt numeric; rv numeric; est boolean;
  mz numeric; mzb numeric; nb numeric; my numeric; fxp numeric; py jsonb; emp numeric; wemp boolean; wdiet boolean; dt numeric; note text;
begin
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  select coalesce(value,'{}') into pc from fleet_cfg where key='pay'; pc:=coalesce(pc,'{}');
  d:=coalesce((c->>'diesel')::numeric,1.952); t:=coalesce((c->>'toll')::numeric,0.2677); sh:=case when grp in ('sluzobne','traktory') then 0 else coalesce((c->>'share')::numeric,100) end;
  fx:=case grp when 'eu' then coalesce((c->>'fixed_eu')::numeric,0) when 'sluzobne' then coalesce((c->>'fixed_sl')::numeric,0) when 'traktory' then coalesce((c->>'fixed_tr')::numeric,0) else coalesce((c->>'fixed')::numeric,140000) end;
  rt:=case grp when 'eu' then coalesce(nullif((c->>'rate_eu')::numeric,0),(c->>'rate')::numeric,1.5) when 'region' then coalesce((c->>'rate')::numeric,1.5) else 0 end;
  m0:=date_trunc('month',dday)::timestamp at time zone 'Europe/Bratislava'; m1:=(dday+1)::timestamp at time zone 'Europe/Bratislava';
  dim:=extract(day from date_trunc('month',dday)+interval '1 month - 1 day')::int; dd:=extract(day from dday)::int;
  with gm as (select v.id, case when c.fleet='sluzobne' and exists(select 1 from trucks t where pnorm(t.spz)=pnorm(c.plate)) then 'region'
                               when c.fleet in ('region','eu','sluzobne','traktory') then c.fleet else 'region' end gg, v.alias_of
                 from cmd_vehicles v join cmd_vehicles c on c.id=coalesce(v.alias_of,v.id))
  select coalesce(sum(distance),0), coalesce(sum(fuel_consumed) filter (where distance>0),0) into vkm,vl
    from rides r left join gm on gm.id=r.vehicle_id
   where r.start_at>=m0 and r.start_at<m1 and coalesce(gm.gg,'region')=grp
     and not (gm.alias_of is not null and exists(select 1 from rides x where x.vehicle_id=gm.alias_of and abs(extract(epoch from x.start_at-r.start_at))<=180));
  py:=fleet_pay(dday,grp); mzb:=coalesce((py->>'mzdy_eur')::numeric,0);
  wemp:=coalesce((pc->>'with_emp')::boolean,false); wdiet:=coalesce((pc->>'with_diet')::boolean,false);
  emp:=coalesce((select (value->>'emp')::numeric from fleet_cfg where key='pay2'),37.2);
  dt:=case when wdiet then coalesce((py->>'diety_eur')::numeric,0) else 0 end;
  mz:=mzb*case when wemp then 1+emp/100 else 1 end+dt;
  note:='mzdy hrubé'||case when wemp then ' + odvody zamestnávateľa '||replace(emp::text,'.',',')||' %' else ' bez odvodov zamestnávateľa' end||case when wdiet then ' + diéty' else ' bez diét' end
        ||case when (py->>'pomerne')::boolean then ' · základ pomerne '||dd||'/'||dim||' dní' else '' end;
  rv:=case when grp='region' then (select (value->>to_char(dday,'YYYY-MM'))::numeric from fleet_cfg where key='revenue') end; est:=rv is null; rv:=coalesce(rv,vkm*rt);
  nb:=vl*d/1.23; my:=vkm*sh/100*t; fxp:=fx*dd/dim;
  return jsonb_build_object('skupina',grp,'mesiac',to_char(dday,'YYYY-MM'),'do_dna',to_char(dday,'DD.MM.YYYY'),'dni',dd,'dni_v_mesiaci',dim,'km',round(vkm),'nafta_l',round(vl),
    'cena_nafty_s_dph',d,'cena_nafty_bez_dph',round(d/1.23,3),'nafta_eur_bez_dph',round(nb),'nafta_eur_s_dph',round(vl*d),'myto_eur',round(my),
    'pevne_naklady_do_dnes_pomerne',round(fxp),'pevne_naklady_cely_mesiac',round(fx),
    'mzdy_eur',round(mz),'mzdy_hrube_eur',round(mzb),'mzdy_poznamka',note,'mzdy_zdroj','Flotila → Vodiči a mzdy (jeden výpočet pre KPI, zisk, Kde strácame peniaze aj AI)',
    'mzdy_s_odvodmi',wemp,'mzdy_s_dietami',wdiet,'vodici_s_mzdou',py->'vodici',
    'obrat_eur',round(rv),'obrat_je_odhad',est,'obrat_poznamka',case when grp in ('sluzobne','traktory') then 'bez obratu' when est then 'Obrat je odhad z nastavenej sadzby €/km, nie z faktúr' else 'Obrat zadaný majiteľom (z faktúr)' end,
    'zisk_do_dnes_pomerne',round(rv-nb-my-fxp-mz),'zisk_cely_mesiac_plne_pevne',round(rv-nb-my-fx-mz));
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.fleet_month(date,text) from public, anon, authenticated;

-- mzdy pre aplikáciu (iba majiteľ)
create or replace function public.fleet_pay_app(mon text, grp text default 'region') returns jsonb language plpgsql stable security definer set search_path=public as $$
declare dday date;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  dday:=least((mon||'-01')::date+interval '1 month - 1 day',(now() at time zone 'Europe/Bratislava')::date)::date;
  return fleet_pay(dday,grp);
end $$;
revoke all on function public.fleet_pay_app(text,text) from public, anon;
grant execute on function public.fleet_pay_app(text,text) to authenticated;

-- prehľad pre AI: mzdy z jedného výpočtu, zisk po skupinách, nové kontroly nafty a kariet
create or replace function public.ai_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m0 text:=quote_literal((date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava')::text); kp jsonb; fm jsonb; mz numeric; old numeric; nk numeric;
begin
  -- KPI z aplikácie: mzdy vždy z jedného výpočtu (Vodiči a mzdy, pomerne k dnešku) – rovnako ako flotila_zisk_mesiac, zisk sa prepočíta
  begin
    select value||jsonb_build_object('aktualizovane',to_char(updated_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')) into kp from ai_state where key='kpi';
    fm:=fleet_month(); mz:=(fm->>'mzdy_eur')::numeric;
    if kp is not null and kp->>'obdobie'='m' and mz is not null then
      old:=coalesce((kp->>'mzdy_eur')::numeric,0); nk:=coalesce((kp->>'naklady_spolu_eur')::numeric,0)-old+mz;
      kp:=kp||jsonb_build_object('mzdy_eur',mz,'mzdy_zdroj','Flotila → Vodiči a mzdy (rovnako ako flotila_zisk_mesiac)','mzdy_z_aplikacie_eur',old,'mzdy_poznamka',fm->>'mzdy_poznamka','naklady_spolu_eur',round(nk),
        'zisk_eur',round((kp->>'obrat_eur')::numeric-nk),'zisk_do_dnes_pomerne_eur',round((kp->>'obrat_eur')::numeric-nk),
        'zisk_cely_mesiac_plne_pevne_eur',round((kp->>'obrat_eur')::numeric-nk+coalesce((kp->>'pevne_eur')::numeric,0)-coalesce((kp->>'pevne_eur_cely_mesiac')::numeric,0)),
        'zisk_poznamka','');
    end if;
  exception when others then null;
  end;
  return jsonb_build_object(
   'teraz', to_char(now() at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),
   'cennik_eur_t', ai_part($q$select coalesce(jsonb_object_agg(com,coalesce(price::text,'nezadané')),'{}') from prices$q$),
   'cennik_bez_ceny', ai_part($q$select coalesce(jsonb_agg(c),'[]') from unnest(array['repka','lo','ho','soja','psenica_p','psenica_k','jacmen_k','jacmen_s','kukurica','cirok']) c where not exists(select 1 from prices p where p.com=c and p.price is not null)$q$),
   'cennik_platny_do', ai_part($q$select coalesce((select value->>'valid' from settings where key='pricelist'),'nezadané')$q$),
   'obchody_podla_stavu', ai_part($q$select coalesce(jsonb_object_agg(status, x),'{}') from (select status, jsonb_build_object('pocet',count(*),'ton',sum(tons),'dodane_t',sum(delivered_t),'hodnota_eur',round(sum(tons*price))) x from deals group by status) s$q$),
   'otvorene_obchody', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select d.no, f.name farmar, d.com komodita, d.tons ton, d.delivered_t dodane_t, d.price cena, d.status stav, d.term termin, d.created_at::date vytvorene from deals d join farmers f on f.id=d.farmer_id where d.status not in ('zaplateny','zruseny') order by d.created_at desc limit 25) x$q$),
   'nove_poziadavky', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select r.kind typ, f.name farmar, r.com, r.tons, r.price, r.pickup_date, r.note, r.created_at::date from requests r join farmers f on f.id=r.farmer_id where r.status='nova' order by r.created_at desc limit 15) x$q$),
   'flotila_kpi_mesiac_z_databazy', ai_fleet_kpi(),
   'flotila_po_autach_mesiac', ai_part('select coalesce(jsonb_agg(x),''[]'') from (select coalesce(plate,vehicle_id) auto, round(sum(distance)) km, round(sum(fuel_consumed)) l, case when sum(distance)>=100 then round(100*sum(fuel_consumed)/nullif(sum(distance),0),1)::text else ''málo dát'' end l_100km, round(sum(refuel_l)) natankovane_l from rides where start_at>='||m0||'::timestamptz group by 1 order by 2 desc nulls last) x'),
   'flotila_po_vodicoch', ai_fleet_drivers(),
   'flotila_zisk_mesiac', fleet_month(),
   'flotila_zisk_mesiac_skupiny', ai_part($q$select jsonb_build_object('region',fleet_month((now() at time zone 'Europe/Bratislava')::date,'region'),'eu',fleet_month((now() at time zone 'Europe/Bratislava')::date,'eu'),'sluzobne',fleet_month((now() at time zone 'Europe/Bratislava')::date,'sluzobne'),'traktory',fleet_month((now() at time zone 'Europe/Bratislava')::date,'traktory'))$q$),
   'zaplatene_nie_v_nadrzi', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters chyba_l, to_char(at at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') kedy, place stanica, st stav, left(note,400) popis from fleet_events where kind='paid_not_tank' and at>='2026-07-01' order by at desc limit 40) x$q$),
   'kalibracia_snimacov', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('auto',coalesce(v.plate,v.name,v.id),'tankovani',c.n,'median_pomer',c.ratio_med,'priemer_pomer',c.ratio_avg,'koeficient',c.coef,'podozrenie',c.flagged,'pravidlo',c.rule,'objem_nadrze_l',c.tank_real,'max_hladina_90_dni',c.max90,'hladina_nad_objem',c.over_cap,'kalibracia_datum',c.calib_date)),'[]') from veh_calib c join cmd_vehicles v on v.id=c.vehicle_id where c.flagged or c.over_cap or c.n>=5$q$),
   'karty_priradenie', ai_part($q$select coalesce(value->'rows','[]') from ai_state where key='card_assign'$q$),
   'kontroly_kariet_30_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where kind in ('card_offhours','card_double','card_far','paid_not_tank') and at>now()-interval '30 days' group by kind) x$q$),
   'tankovacie_data', ai_part('select fuel_data_status()'),
   'alarmy_stav', ai_part($q$select jsonb_build_object('udalosti',(select coalesce(jsonb_object_agg(st,n),'{}') from (select st,count(*) n from fleet_events where at>now()-interval '30 days' and kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank','limiter','no_signal') group by st) a),
      'artefakty_a_kalibracia',(select coalesce(jsonb_object_agg(flag,n),'{}') from (select flag,count(*) n from fleet_events where flag is not null and at>='2026-07-01' group by flag) b),
      'auta_na_servise',(select value from fleet_cfg where key='service'))$q$),
   'nalezy_flotila', fleet_findings(),
   'nadrz_dvor', ai_part('select yard_fuel_balance()'),
   'odstavene_auta', ai_part($q$select coalesce((select jsonb_agg(coalesce(v.plate,v.id)) from cmd_vehicles v where coalesce((select (value->>v.id)::boolean from fleet_cfg where key='parked'),false)),'[]')$q$),
   'auta_teraz', ai_part($q$select jsonb_build_object('spolu',count(*),'ide',count(*) filter (where speed>3 and gps_at>now()-interval '20 min')) from cmd_vehicles$q$),
   'nafta_bilancia_7_dni', ai_part('select public.fuel_balance(7)'),
   'nafta_bilancia_30_dni', ai_part('select public.fuel_balance(30)'),
   'nafta_poklesy_v_stati_bez_vypadkov_dat', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters l, lvl_from, lvl_to, to_char(t_from at time zone 'Europe/Bratislava','DD.MM HH24:MI') od, to_char(t_to at time zone 'Europe/Bratislava','DD.MM HH24:MI') do_, place miesto, note from fleet_events where kind='fuel_drop' and flag is null and st<>'falosny' and at>now()-interval '30 days' order by at desc limit 40) x$q$),
   'udalosti_7_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '7 days' group by kind) x$q$),
   'posledne_alarmy_nafta', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, plate, driver, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where at>now()-interval '7 days' and kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank','limiter','no_signal') and flag is null and st in ('novy','riesim') order by at desc limit 10) x$q$),
   'nafta_precerpanie_medzi_autami', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auta, driver vodici, liters l, place miesto, note popis, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where kind='fuel_transfer' and at>now()-interval '40 days' order by at desc limit 20) x$q$),
   'aktivne_auta_bez_signalu', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select e.plate auto, e.driver posledny_vodic, e.place posledna_poloha, floor(extract(epoch from now()-v.gps_at)/3600)::int hodin from fleet_events e join cmd_vehicles v on v.id=e.vehicle_id where e.kind='no_signal' and v.gps_at=e.t_from and v.gps_at<now()-interval '12 hours') x$q$),
   'alarmy_z_aplikacie', ai_part($q$select value->'alarmy' from ai_state where key='kpi'$q$),
   'nastavenia_nakladov', ai_part($q$select value from fleet_cfg where key='costs'$q$),
   'kpi_z_aplikacie', coalesce(kp,'"majiteľ ešte neotvoril Flotilu"'::jsonb),
   'register_poruseni', ai_register(),
   'tankovacie_karty_vypis', ai_part($q$select jsonb_build_object('dokladov_40_dni',count(*),'litre',round(coalesce(sum(liters),0)),'sparovane_so_sondou',count(*) filter (where m_state='sparovane'),
       'sonda_nezaznamenala',count(*) filter (where m_state='bez_sondy'),'nezname_auto',count(*) filter (where m_state='nezname_auto'),
       'najvacsie_rozdiely',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(plate,card) auto, to_char(at at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') kedy, station stanica, round(liters) doklad_l, round(m_rise) sonda_l, round(liters-coalesce(m_rise,0)) rozdiel_l from fuel_card where at>now()-interval '40 days' and m_state in ('sparovane','bez_sondy') order by abs(liters-coalesce(m_rise,0)) desc limit 10) x))
       from fuel_card where at>now()-interval '40 days'$q$),
   'diagnostika', ai_diag(),
   'dokumenty_archiv', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind typ, driver vodic, title nazov, status stav, to_char(created_at at time zone 'Europe/Bratislava','DD.MM.YYYY') datum from ai_docs order by created_at desc limit 40) x$q$),
   'posledne_upravy_ai', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x$q$));
exception when others then return jsonb_build_object('chyba_prehladu',SQLERRM);
end $function$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;

-- AI úprava 26. 10. 2026: sadzby od dátumu (stravné, minimálna mzda SR/DE), mzdy a diéty podľa sadzby platnej v daný deň
-- ===== 1) SADZBY OD DÁTUMU (fleet_cfg 'rates') =====
-- k: d1 = tuzemské stravné 5–12 h, d2 = 12–18 h, d3 = nad 18 h, mw_sk = minimálna mzda SR (€/mesiac), mw_de = minimálna mzda DE (€/h)
insert into fleet_cfg(key,value) values('rates',jsonb_build_object('rows',jsonb_build_array(
  jsonb_build_object('k','d1','from','2025-12-01','v',9.30),
  jsonb_build_object('k','d2','from','2025-12-01','v',13.80),
  jsonb_build_object('k','d3','from','2025-12-01','v',20.60),
  jsonb_build_object('k','mw_sk','from','2026-01-01','v',915),
  jsonb_build_object('k','mw_sk','from','2027-01-01','v',972),
  jsonb_build_object('k','mw_de','from','2026-01-01','v',13.90),
  jsonb_build_object('k','mw_de','from','2027-01-01','v',14.60))))
on conflict(key) do nothing;

-- sadzba platná v daný deň (najnovšia s dátumom od ≤ deň)
create or replace function public.pay_rate(k text, d date) returns numeric language sql stable security definer set search_path=public as $$
  select (x->>'v')::numeric from fleet_cfg c, jsonb_array_elements(case when jsonb_typeof(c.value->'rows')='array' then c.value->'rows' else '[]'::jsonb end) x
   where c.key='rates' and x->>'k'=k and x->>'from' ~ '^\d{4}-\d{2}-\d{2}$' and (x->>'from')::date<=d and x->>'v' ~ '^[0-9]+(\.[0-9]+)?$'
   order by (x->>'from')::date desc limit 1 $$;
revoke all on function public.pay_rate(text,date) from public, anon, authenticated;

-- mzdy za mesiac: rovnaký výpočet ako Flotila → Vodiči a mzdy; diéty podľa sadzby platnej v daný deň, základ aspoň minimálna mzda SR platná v mesiaci
create or replace function public.fleet_pay(dday date default (now() at time zone 'Europe/Bratislava')::date, grp text default 'region')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pc jsonb; m0 timestamptz; m1 timestamptz; dim int; dd int; f numeric; cur boolean; res jsonb; bs numeric;
begin
  select coalesce(value,'{}') into pc from fleet_cfg where key='pay'; pc:=coalesce(pc,'{}');
  m0:=date_trunc('month',dday)::timestamp at time zone 'Europe/Bratislava'; m1:=(dday+1)::timestamp at time zone 'Europe/Bratislava';
  dim:=extract(day from date_trunc('month',dday)+interval '1 month - 1 day')::int; dd:=extract(day from dday)::int;
  cur:=date_trunc('month',dday)=date_trunc('month',(now() at time zone 'Europe/Bratislava')::date) and dd<dim;
  f:=case when cur then dd::numeric/dim else 1 end;
  bs:=greatest(coalesce((pc->>'base')::numeric,1031),coalesce(pay_rate('mw_sk',date_trunc('month',dday)::date),0));
  if grp in ('sluzobne','traktory') then
    return jsonb_build_object('skupina',grp,'mzdy_eur',0,'vodici',0,'poznamka','služobné autá a traktory – mzdy sa nepočítajú');
  end if;
  with gm as (select v.id, case when c.fleet='sluzobne' and exists(select 1 from trucks t where pnorm(t.spz)=pnorm(c.plate)) then 'region'
                               when c.fleet in ('region','eu','sluzobne','traktory') then c.fleet else 'region' end gg, v.alias_of
                 from cmd_vehicles v join cmd_vehicles c on c.id=coalesce(v.alias_of,v.id)),
    r0 as (select r.*, gm.alias_of al, coalesce(gm.gg,'region') g from rides r left join gm on gm.id=r.vehicle_id
               where r.start_at>=m0 and r.start_at<m1 and coalesce(r.ride_type,'') !~ 'PRIVAT'),
    -- duplicitná jazda z druhej GPS jednotky toho istého auta (do 3 min) sa nepočíta
    r1 as (select * from r0 where not (r0.al is not null and exists(select 1 from r0 x where x.vehicle_id=r0.al and abs(extract(epoch from x.start_at-r0.start_at))<=180))),
    r as (select coalesce(nullif(trim(driver),''),'neznámy vodič') dn, (start_at at time zone 'Europe/Bratislava')::date dy, coalesce(distance,0) km,
       ((lat_start is not null and (lat_start<48.38 or lat_start>49.05 or coalesce(lon_start,0)<20.25 or coalesce(lon_start,0)>22.57))
        or (lat_stop is not null and (lat_stop<48.38 or lat_stop>49.05 or coalesce(lon_stop,0)<20.25 or coalesce(lon_stop,0)>22.57))
        or (coalesce(start_addr,'')||' '||coalesce(stop_addr,'')) ~* '(Hungary|Maďarsko|Magyar|Ukrajin|Ukraine|Poľsko|Poland|Česk|Czech|Austria|Rakúsk|\yHU\y|\yUA\y|\yPL\y|\yCZ\y|\yAT\y)') o
      from r1 where r1.g=grp),
    dy as (select dn, dy, sum(km) km, bool_or(o) o from r group by 1,2),
    w as (select dn, count(*) filter (where km>=coalesce((pc->>'minKm')::numeric,10) and not o) i, count(*) filter (where km>=coalesce((pc->>'minKm')::numeric,10) and o) x,
            coalesce(sum(case when km<coalesce((pc->>'minKm')::numeric,10) then 0
                              when grp='eu' then coalesce((pc->>'diet_eu')::numeric,55)
                              when o then coalesce(pay_rate('d2',dy),(pc->>'diet_out')::numeric,13.80)
                              else coalesce(pay_rate('d1',dy),(pc->>'diet_in')::numeric,9.30) end),0) dt
            from dy group by dn),
    p as (select dn, i, x, dt,
            case when grp='eu' then (i+x)*coalesce((pc->>'euDay')::numeric,105) else i*coalesce((pc->>'inReg')::numeric,80)+x*coalesce((pc->>'outReg')::numeric,90) end s
            from w)
  select jsonb_build_object('skupina',grp,'mesiac',to_char(dday,'YYYY-MM'),'do_dna',to_char(dday,'DD.MM.YYYY'),'pomerne',cur,'dni',dd,'dni_v_mesiaci',dim,
     'zaklad',bs,'zaklad_pomerne',round(bs*f,2),'minimalna_mzda_sr',pay_rate('mw_sk',date_trunc('month',dday)::date),
     'mzdy_eur',round(coalesce(sum(greatest(bs*f, s)),0)),
     'mzdy_cely_mesiac_zaklad_eur',round(coalesce(sum(greatest(bs, s)),0)),
     'vodici',count(*),'dni_v_kraji',coalesce(sum(i),0),'dni_mimo_kraja',coalesce(sum(x),0),
     'diety_eur',round(coalesce(sum(dt),0)),'diety_poznamka','tuzemské stravné podľa sadzby platnej v daný deň (Flotila → Vodiči a mzdy → Sadzby od dátumu)',
     'po_vodicoch',coalesce(jsonb_agg(jsonb_build_object('vodic',dn,'dni_v_kraji',i,'dni_mimo',x,'sucet_dni',s,'diety',round(dt,2),'mzda',round(greatest(bs*f, s))) order by greatest(bs*f, s) desc),'[]'))
    into res from p;
  return res;
end $$;
revoke all on function public.fleet_pay(date,text) from public, anon, authenticated;

