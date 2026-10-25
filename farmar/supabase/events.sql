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
