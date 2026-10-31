-- VALKO flotila: IMPORT VÝPISU TANKOVACÍCH KARIET (CSV/XLSX) + párovanie na tankovania zo sondy (±2 h, ±300 m)
-- + alarm „Karta jedného auta, nafta v inom“ (stupeň VYSOKÝ).

-- tankovania zo sondy = nárast hladiny o 30+ l (v státí medzi jazdami alebo počas jazdy)
create table if not exists probe_refuel(key text primary key, vehicle_id text not null, at timestamptz not null, t_from timestamptz, t_to timestamptz,
  lvl_from numeric, lvl_to numeric, rise numeric not null, lat numeric, lon numeric, ride_id text, updated_at timestamptz default now());
create index if not exists probe_refuel_veh on probe_refuel(vehicle_id, at);
create index if not exists probe_refuel_at on probe_refuel(at);
alter table probe_refuel enable row level security;
drop policy if exists probe_refuel_read on probe_refuel;
create policy probe_refuel_read on probe_refuel for select using (is_fleet());

-- riadky z výpisu tankovacích kariet
create table if not exists fuel_card(id bigserial primary key, at timestamptz not null, plate text, card text, vehicle_id text, station text,
  liters numeric not null, price numeric, ppl numeric, src text, imported_at timestamptz default now(), imported_by text,
  m_state text, m_key text, m_vehicle text, m_at timestamptz, m_rise numeric, m_lat numeric, m_lon numeric, m_note text, uq text unique);
create index if not exists fuel_card_at on fuel_card(at);
create index if not exists fuel_card_veh on fuel_card(vehicle_id, at);
alter table fuel_card enable row level security;
drop policy if exists fuel_card_read on fuel_card;
create policy fuel_card_read on fuel_card for select using (is_fleet());

-- vodič auta okolo daného času (najbližšia jazda so známym vodičom do 12 h)
create or replace function public.veh_driver_at(vid text, t timestamptz) returns text language sql stable security definer set search_path=public as $$
  select trim(driver) from rides where vehicle_id in (select id from cmd_vehicles where id=vid or alias_of=vid union select vid) and not fleet_unknown(driver)
     and start_at between t-interval '12 hours' and t+interval '12 hours'
   order by case when t between start_at and coalesce(stop_at,start_at) then 0 else 1 end, least(abs(extract(epoch from start_at-t)),abs(extract(epoch from coalesce(stop_at,start_at)-t))) limit 1 $$;
revoke all on function public.veh_driver_at(text,timestamptz) from public, anon, authenticated;

create or replace function public.probe_refuel_sync(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare n int; k int:=0;
begin
  -- a) v státí medzi dvoma jazdami
  insert into probe_refuel as p(key,vehicle_id,at,t_from,t_to,lvl_from,lvl_to,rise,lat,lon,ride_id)
  select 'st:'||x.ride_id, x.vehicle_id,
         coalesce((select min(tl.at) from tank_log tl where tl.vehicle_id=x.vehicle_id and tl.at>x.p_stop and tl.at<x.start_at and tl.tank>=x.p_fuel+0.6*(x.fuel_start-x.p_fuel)), x.start_at),
         x.p_stop, x.start_at, round(x.p_fuel), round(x.fuel_start), round(x.fuel_start-x.p_fuel), coalesce(x.p_lat,x.lat_start), coalesce(x.p_lon,x.lon_start), x.ride_id
    from (select r.*, lag(r.stop_at) over w p_stop, lag(r.fuel_stop) over w p_fuel, lag(r.lat_stop) over w p_lat, lag(r.lon_stop) over w p_lon
            from rides r where r.start_at>=since-interval '3 days' window w as (partition by r.vehicle_id order by r.start_at)) x
   where x.start_at>=since and x.p_stop is not null and x.p_fuel is not null and x.fuel_start is not null and x.fuel_start-x.p_fuel>=30
     and (x.p_lat is null or x.lat_start is null or geo_m(x.p_lat,x.p_lon,x.lat_start,x.lon_start)<=500)
  on conflict (key) do update set at=excluded.at, t_from=excluded.t_from, t_to=excluded.t_to, lvl_from=excluded.lvl_from, lvl_to=excluded.lvl_to, rise=excluded.rise, lat=excluded.lat, lon=excluded.lon, updated_at=now();
  get diagnostics n=row_count; k:=k+n;
  -- b) počas jazdy (motor bežal pri stojane): koniec − začiatok + spotreba jazdou
  insert into probe_refuel as p(key,vehicle_id,at,t_from,t_to,lvl_from,lvl_to,rise,lat,lon,ride_id)
  select 'rd:'||r.ride_id, r.vehicle_id, coalesce(j.at, r.stop_at), r.start_at, r.stop_at, round(r.fuel_start), round(r.fuel_stop),
         round(r.fuel_stop-r.fuel_start+coalesce(r.fuel_consumed,0)), coalesce(j.lat,r.lat_stop), coalesce(j.lon,r.lon_stop), r.ride_id
    from rides r left join lateral (select y.at, y.lat, y.lon from (select tl.at, tl.lat, tl.lon, tl.tank-lag(tl.tank) over (order by tl.at) d from tank_log tl
              where tl.vehicle_id=r.vehicle_id and tl.at between r.start_at and r.stop_at) y where y.d>=10 order by y.d desc limit 1) j on true
   where r.start_at>=since and r.stop_at is not null and r.fuel_start is not null and r.fuel_stop is not null
     and r.fuel_stop-r.fuel_start+coalesce(r.fuel_consumed,0)>=30
  on conflict (key) do update set at=excluded.at, t_from=excluded.t_from, t_to=excluded.t_to, lvl_from=excluded.lvl_from, lvl_to=excluded.lvl_to, rise=excluded.rise, lat=excluded.lat, lon=excluded.lon, updated_at=now();
  get diagnostics n=row_count; k:=k+n;
  return k;
end $$;
revoke all on function public.probe_refuel_sync(timestamptz) from public, anon, authenticated;

-- poloha stanice: naučená z predchádzajúcich spárovaných dokladov tej istej stanice (rozdiel do 30 l)
create or replace function public.fuel_station_loc(st text, out lat numeric, out lon numeric) language sql stable security definer set search_path=public as $$
  select avg(m_lat), avg(m_lon) from fuel_card where pnorm(station)=pnorm(st) and m_state='sparovane' and m_lat is not null and abs(liters-coalesce(m_rise,0))<=30 $$;
revoke all on function public.fuel_station_loc(text) from public, anon, authenticated;

-- auto podľa ŠPZ alebo čísla karty (priradenie kariet v Nastaveniach)
create or replace function public.fuel_card_vid(pl text, cd text) returns text language sql stable security definer set search_path=public as $$
  select coalesce(
    (select coalesce(v.alias_of,v.id) from cmd_vehicles v where pnorm(pl) is not null and pnorm(v.plate)=pnorm(pl) order by (v.alias_of is null) desc, (v.name is not null) desc, coalesce(v.deleted,false) limit 1),
    (select value->>pnorm(cd) from fleet_cfg where key='cards' and pnorm(cd) is not null)) $$;
revoke all on function public.fuel_card_vid(text,text) from public, anon, authenticated;

-- párovanie dokladov na tankovania zo sondy (±2 h, ±300 m od stanice, ak je poloha stanice známa)
create or replace function public.fuel_card_match(since timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare t record; p record; l record; k int:=0;
begin
  update fuel_card set vehicle_id=fuel_card_vid(plate,card) where at>=since and vehicle_id is null and fuel_card_vid(plate,card) is not null;
  for t in select * from fuel_card where at>=since order by at loop
    if t.vehicle_id is null then
      update fuel_card set m_state='nezname_auto', m_key=null, m_rise=null, m_note='auto neznáme – priraď kartu '||coalesce(card,plate,'?')||' v Nastaveniach' where id=t.id;
      continue;
    end if;
    select * into l from fuel_station_loc(t.station);
    select pr.* into p from probe_refuel pr
     where pr.vehicle_id in (select id from cmd_vehicles where id=t.vehicle_id or alias_of=t.vehicle_id union select t.vehicle_id)
       and t.at between coalesce(pr.t_from,pr.at)-interval '2 hours' and coalesce(pr.t_to,pr.at)+interval '2 hours'
       and (l.lat is null or pr.lat is null or geo_m(l.lat,l.lon,pr.lat,pr.lon)<=300)
     order by abs(extract(epoch from pr.at-t.at)) limit 1;
    if p.key is not null then
      update fuel_card set m_state='sparovane', m_key=p.key, m_vehicle=p.vehicle_id, m_at=p.at, m_rise=p.rise, m_lat=p.lat, m_lon=p.lon,
             m_note='sonda +'||round(p.rise)||' l ('||to_char(p.at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||') · rozdiel '||case when t.liters-p.rise>=0 then '−' else '+' end||abs(round(t.liters-p.rise))||' l'
       where id=t.id;
      k:=k+1;
    else
      update fuel_card set m_state='bez_sondy', m_key=null, m_vehicle=null, m_at=null, m_rise=0, m_lat=null, m_lon=null,
             m_note='sonda nárast nezaznamenala (±2 h'||case when l.lat is not null then ', ±300 m' else '' end||')' where id=t.id;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_card_match(timestamptz) from public, anon, authenticated;

-- ALARM „Karta jedného auta, nafta v inom“: na tej istej stanici do 3 h jedno auto má v nádrži o 100+ l menej ako na doklade
-- a iné auto o 100+ l viac (bez dokladu a bez výdaja z dvora) → stupeň VYSOKÝ
create or replace function public.card_swap_check(since timestamptz, push boolean default true) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare t record; b record; l record; tz text:='Europe/Bratislava'; f text:='DD.MM.YYYY HH24:MI'; tp text; k int:=0; isnew boolean; ap text; bp text; da text; db text; shortl numeric; msg text; la numeric; lo numeric;
begin
  select value->>'topic' into tp from fleet_cfg where key='notify';
  for t in select * from fuel_card where at>=since and vehicle_id is not null and m_state in ('sparovane','bez_sondy') loop
    shortl:=t.liters-coalesce(t.m_rise,0);
    if shortl<=100 then continue; end if;
    -- auto s dokladom musí mať okolo tankovania údaje o hladine (inak sa nedá povedať, že mu nafta chýba)
    if not exists(select 1 from rides r where r.vehicle_id in (select id from cmd_vehicles where id=t.vehicle_id or alias_of=t.vehicle_id union select t.vehicle_id)
                    and r.fuel_start is not null and r.start_at between t.at-interval '12 hours' and t.at+interval '12 hours')
       and not exists(select 1 from tank_log tl where tl.vehicle_id in (select id from cmd_vehicles where id=t.vehicle_id or alias_of=t.vehicle_id union select t.vehicle_id)
                    and tl.at between t.at-interval '6 hours' and t.at+interval '6 hours') then continue; end if;
    select * into l from fuel_station_loc(t.station);
    la:=coalesce(t.m_lat,l.lat); lo:=coalesce(t.m_lon,l.lon);
    if la is null then continue; end if;
    for b in
      select pr.*, pr.rise-coalesce((select sum(c.liters) from fuel_card c where c.vehicle_id=coalesce(v.alias_of,v.id) and c.at between pr.at-interval '3 hours' and pr.at+interval '3 hours'),0)
                    -coalesce((select sum(y.liters) from yard_fuel y where y.kind='vydaj' and (y.vehicle_id=pr.vehicle_id or pnorm(y.plate)=pnorm(v.plate)) and y.day=(pr.at at time zone tz)::date),0) surplus
        from probe_refuel pr join cmd_vehicles v on v.id=pr.vehicle_id
       where coalesce(v.alias_of,v.id)<>t.vehicle_id and pr.lat is not null and geo_m(la,lo,pr.lat,pr.lon)<=300
         and coalesce(pr.t_to,pr.at)>=t.at-interval '3 hours' and coalesce(pr.t_from,pr.at)<=t.at+interval '3 hours'
    loop
      if b.surplus<=100 then continue; end if;
      select coalesce(plate,name,id) into ap from cmd_vehicles where id=t.vehicle_id;
      select coalesce(c.plate,c.name,c.id) into bp from cmd_vehicles v join cmd_vehicles c on c.id=coalesce(v.alias_of,v.id) where v.id=b.vehicle_id;
      da:=coalesce(veh_driver_at(t.vehicle_id,t.at),'neznámy'); db:=coalesce(veh_driver_at(b.vehicle_id,b.at),'neznámy');
      msg:='doklad '||coalesce(ap,t.plate)||coalesce(' (karta '||t.card||')','')||': '||round(t.liters)||' l · '||to_char(t.at at time zone tz,f)||' · '||coalesce(t.station,'stanica ?')
         ||' · v nádrži '||coalesce(ap,t.plate)||' +'||round(coalesce(t.m_rise,0))||' l (o '||round(shortl)||' l menej ako na doklade), vodič '||da
         ||' ⇒ '||bp||': v nádrži +'||round(b.rise)||' l · '||to_char(b.at at time zone tz,f)||' ('||round(b.lvl_from)||' → '||round(b.lvl_to)||' l) bez dokladu (o '||round(b.surplus)||' l viac), vodič '||db
         ||' · stanica do 300 m, do 3 h · stupeň VYSOKÝ';
      insert into fleet_events as e(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,note,src_key)
        values(t.vehicle_id,coalesce(ap,t.plate)||' → '||bp,'card_swap',t.at,da||' → '||db,round(least(shortl,b.surplus)),t.station,'fuel',la,lo,t.at,b.at,round(b.lvl_from),round(b.lvl_to),msg,'swap:'||t.id||':'||b.key)
        on conflict (src_key) do update set note=excluded.note, liters=excluded.liters, driver=excluded.driver
        returning (xmax=0) into isnew;
      if isnew then k:=k+1;
        if push and tp is not null and t.at>now()-interval '24 hours' then
          begin perform net.http_post(url:='https://ntfy.sh/'||tp, body:=jsonb_build_object('topic',tp,'title','KARTA JEDNÉHO AUTA, NAFTA V INOM','message','⚠️ '||msg,
            'tags',jsonb_build_array('rotating_light','credit_card'),'priority',5,'click','https://maps.google.com/?q='||la||','||lo)); exception when others then null; end;
        end if;
      end if;
    end loop;
  end loop;
  return k;
end $$;
revoke all on function public.card_swap_check(timestamptz,boolean) from public, anon, authenticated;

-- import z aplikácie (Flotila → Nastavenia → Výpis tankovacích kariet)
create or replace function public.fuel_card_import(rows jsonb, fname text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; n int:=0; d int:=0; a timestamptz; t0 timestamptz; li numeric; pr numeric; pl text; cd text; ok boolean; m int; al int; bez int; nez int;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if jsonb_typeof(rows)<>'array' then raise exception 'Chybný formát.'; end if;
  for r in select * from jsonb_array_elements(rows) loop
    begin a:=(r->>'at')::timestamptz; exception when others then a:=null; end;
    li:=nullif(replace(coalesce(r->>'liters',''),',','.'),'')::numeric;
    pr:=nullif(replace(coalesce(r->>'price',''),',','.'),'')::numeric;
    pl:=nullif(trim(coalesce(r->>'plate','')),''); cd:=nullif(trim(coalesce(r->>'card','')),'');
    if a is null or li is null or li<=0 or (pl is null and cd is null) then continue; end if;
    if pr is not null and pr>0 and pr<5 then pr:=round(pr*li,2); end if;  -- cena za liter → spolu
    insert into fuel_card(at,plate,card,station,liters,price,ppl,src,imported_by,vehicle_id,uq)
      values(a,pl,cd,nullif(trim(coalesce(r->>'station','')),''),li,pr,case when pr>0 then round(pr/li,3) end,left(fname,120),auth.jwt()->>'email',fuel_card_vid(pl,cd),
             to_char(a at time zone 'UTC','YYYYMMDDHH24MI')||'|'||coalesce(pnorm(pl),pnorm(cd))||'|'||round(li,2))
      on conflict (uq) do nothing;
    get diagnostics m=row_count;
    if m>0 then n:=n+1; t0:=least(coalesce(t0,a),a); else d:=d+1; end if;
  end loop;
  if t0 is not null then
    perform probe_refuel_sync(t0-interval '1 day');
    perform fuel_card_match(t0-interval '1 day');
    al:=card_swap_check(t0-interval '1 day', true);
  end if;
  select count(*) filter (where m_state='sparovane'), count(*) filter (where m_state='bez_sondy'), count(*) filter (where m_state='nezname_auto') into m,bez,nez
    from fuel_card where t0 is not null and at>=t0;
  return jsonb_build_object('nove',n,'duplicitne',d,'sparovane',coalesce(m,0),'bez_sondy',coalesce(bez,0),'nezname_auto',coalesce(nez,0),'alarmy',coalesce(al,0));
end $$;
revoke all on function public.fuel_card_import(jsonb,text) from public, anon;
grant execute on function public.fuel_card_import(jsonb,text) to authenticated;

-- priradenie čísla karty k autu (pre výpisy bez ŠPZ)
create or replace function public.fuel_card_assign(cd text, vid text) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if pnorm(cd) is null then raise exception 'Chýba číslo karty.'; end if;
  insert into fleet_cfg(key,value) values('cards',jsonb_build_object(pnorm(cd),vid))
    on conflict(key) do update set value=case when coalesce(vid,'')='' then fleet_cfg.value-pnorm(cd) else coalesce(fleet_cfg.value,'{}')||jsonb_build_object(pnorm(cd),vid) end;
  update fuel_card set vehicle_id=nullif(vid,'') where pnorm(card)=pnorm(cd) and pnorm(plate) is null;
  get diagnostics n=row_count;
  perform fuel_card_match((select coalesce(min(at),now()) from fuel_card where pnorm(card)=pnorm(cd))-interval '1 day');
  perform card_swap_check((select coalesce(min(at),now()) from fuel_card where pnorm(card)=pnorm(cd))-interval '1 day', false);
  return n;
end $$;
revoke all on function public.fuel_card_assign(text,text) from public, anon;
grant execute on function public.fuel_card_assign(text,text) to authenticated;

-- pravidelne každých 10 min: nové tankovania zo sondy, párovanie, alarm
create or replace function public.fuel_card_tick() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0;
begin
  k:=probe_refuel_sync(now()-interval '3 days');
  if exists(select 1 from fuel_card where at>now()-interval '20 days') then
    perform fuel_card_match(now()-interval '20 days');
    k:=k+card_swap_check(now()-interval '20 days', true);
  end if;
  return k;
end $$;
revoke all on function public.fuel_card_tick() from public, anon, authenticated;
select cron.unschedule(jobname) from cron.job where jobname='karty-sonda';
select cron.schedule('karty-sonda','*/10 * * * *','select public.check_run(''fuel_card_tick'')');
-- tankovania zo sondy spätne od 1. 7. 2026
select public.probe_refuel_sync('2026-07-01 00:00 Europe/Bratislava'::timestamptz);
