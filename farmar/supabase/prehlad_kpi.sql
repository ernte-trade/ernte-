-- 📊 PREHĽAD MAJITEĽA – jednotné čísla flotily (2. 11. 2026)
-- 1) KPI pre AI (ai_state 'kpi') prepočíta databáza každých 10 min (fleet_kpi_tick) a vyhodí alarmy, ktoré už neplatia
--    (napr. „Sync polôh nezapísal novú polohu“, keď najnovšia poloha v pos_log / tank_log / cmd_vehicles je čerstvá).
-- 2) ZISK = jeden výpočet: fleet_month() v databáze; pevné náklady (aj základ mzdy) pomerne podľa SKUTOČNE UPLYNULÝCH dní mesiaca
--    vrátane časti dneška – fleet_elapsed_days(); aplikácia (fxElapsed v index.html) ráta rovnako.
-- 3) Počet áut Flotily Región = spárované autá (skupina Región + autá spárované so zoznamom áut Doprava) – fleet_cars().
-- 4) Duplicitné miesta (places): place_norm, places_dupes, places_merge, places_merge_auto; záloha places_merged.

-- ===== 2) uplynulé dni mesiaca (vrátane časti dneška) =====
create or replace function public.fleet_elapsed_days(dday date default (now() at time zone 'Europe/Bratislava')::date)
returns numeric language sql stable security definer set search_path=public as $$
  select case when dday=(now() at time zone 'Europe/Bratislava')::date
              then (extract(day from dday)::numeric-1)
                   + extract(epoch from ((now() at time zone 'Europe/Bratislava') - dday::timestamp))::numeric/86400.0
              else extract(day from dday)::numeric end $$;
revoke all on function public.fleet_elapsed_days(date) from public, anon;
grant execute on function public.fleet_elapsed_days(date) to authenticated;

-- mzdy: základ pomerne rovnakým podielom ako pevné náklady (inak bez zmeny – posledná definícia 20261026-0600)
create or replace function public.fleet_pay(dday date default (now() at time zone 'Europe/Bratislava')::date, grp text default 'region')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pc jsonb; m0 timestamptz; m1 timestamptz; dim int; dd int; f numeric; cur boolean; res jsonb; bs numeric;
begin
  select coalesce(value,'{}') into pc from fleet_cfg where key='pay'; pc:=coalesce(pc,'{}');
  m0:=date_trunc('month',dday)::timestamp at time zone 'Europe/Bratislava'; m1:=(dday+1)::timestamp at time zone 'Europe/Bratislava';
  dim:=extract(day from date_trunc('month',dday)+interval '1 month - 1 day')::int; dd:=extract(day from dday)::int;
  f:=case when date_trunc('month',dday)=date_trunc('month',(now() at time zone 'Europe/Bratislava')::date) then least(1,fleet_elapsed_days(dday)/dim) else 1 end;
  cur:=f<1;
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

-- zisk mesiaca – JEDINÝ výpočet (posledná definícia 20261026-0234 + pomer uplynulých dní a náklady spolu)
create or replace function public.fleet_month(dday date default (now() at time zone 'Europe/Bratislava')::date, grp text default 'region')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb; pc jsonb; m0 timestamptz; m1 timestamptz; dim int; dd int; vkm numeric; vl numeric; d numeric; t numeric; sh numeric; fx numeric; rt numeric; rv numeric; est boolean;
  mz numeric; mzb numeric; nb numeric; my numeric; fxp numeric; py jsonb; emp numeric; wemp boolean; wdiet boolean; dt numeric; note text; ed numeric; edt text;
begin
  select value into c from fleet_cfg where key='costs'; c:=coalesce(c,'{}');
  select coalesce(value,'{}') into pc from fleet_cfg where key='pay'; pc:=coalesce(pc,'{}');
  d:=coalesce((c->>'diesel')::numeric,1.952); t:=coalesce((c->>'toll')::numeric,0.2677); sh:=case when grp in ('sluzobne','traktory') then 0 else coalesce((c->>'share')::numeric,100) end;
  fx:=case grp when 'eu' then coalesce((c->>'fixed_eu')::numeric,0) when 'sluzobne' then coalesce((c->>'fixed_sl')::numeric,0) when 'traktory' then coalesce((c->>'fixed_tr')::numeric,0) else coalesce((c->>'fixed')::numeric,140000) end;
  rt:=case grp when 'eu' then coalesce(nullif((c->>'rate_eu')::numeric,0),(c->>'rate')::numeric,1.5) when 'region' then coalesce((c->>'rate')::numeric,1.5) else 0 end;
  m0:=date_trunc('month',dday)::timestamp at time zone 'Europe/Bratislava'; m1:=(dday+1)::timestamp at time zone 'Europe/Bratislava';
  dim:=extract(day from date_trunc('month',dday)+interval '1 month - 1 day')::int; dd:=extract(day from dday)::int;
  ed:=least(dim,fleet_elapsed_days(dday)); edt:=replace(trim(to_char(round(ed,2),'FM990.99')),'.',',');
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
        ||case when (py->>'pomerne')::boolean then ' · základ pomerne '||edt||'/'||dim||' dní' else '' end;
  rv:=case when grp='region' then (select (value->>to_char(dday,'YYYY-MM'))::numeric from fleet_cfg where key='revenue') end; est:=rv is null; rv:=coalesce(rv,vkm*rt);
  nb:=vl*d/1.23; my:=vkm*sh/100*t; fxp:=fx*ed/dim;
  return jsonb_build_object('skupina',grp,'mesiac',to_char(dday,'YYYY-MM'),'do_dna',to_char(dday,'DD.MM.YYYY'),'dni',round(ed,2),'dni_v_mesiaci',dim,
    'pevne_pomer',edt||'/'||dim||' dní (uplynulé dni mesiaca vrátane časti dneška)','km',round(vkm),'nafta_l',round(vl),
    'cena_nafty_s_dph',d,'cena_nafty_bez_dph',round(d/1.23,3),'nafta_eur_bez_dph',round(nb),'nafta_eur_s_dph',round(vl*d),'myto_eur',round(my),
    'pevne_naklady_do_dnes_pomerne',round(fxp),'pevne_naklady_cely_mesiac',round(fx),
    'mzdy_eur',round(mz),'mzdy_hrube_eur',round(mzb),'mzdy_poznamka',note,'mzdy_zdroj','Flotila → Vodiči a mzdy (jeden výpočet pre KPI, zisk, Kde strácame peniaze aj AI)',
    'mzdy_s_odvodmi',wemp,'mzdy_s_dietami',wdiet,'vodici_s_mzdou',py->'vodici',
    'naklady_spolu_eur',round(nb+my+fxp+mz),'naklady_spolu_cely_mesiac_eur',round(nb+my+fx+mz),
    'obrat_eur',round(rv),'obrat_je_odhad',est,'obrat_poznamka',case when grp in ('sluzobne','traktory') then 'bez obratu' when est then 'Obrat je odhad z nastavenej sadzby €/km, nie z faktúr' else 'Obrat zadaný majiteľom (z faktúr)' end,
    'zisk_do_dnes_pomerne',round(rv-nb-my-fxp-mz),'zisk_cely_mesiac_plne_pevne',round(rv-nb-my-fx-mz),
    'zdroj','fleet_month – jediný výpočet zisku (databáza aj aplikácia rátajú pevné náklady rovnako)');
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.fleet_month(date,text) from public, anon, authenticated;

-- ===== 3) počet áut skupiny = spárované vozidlá =====
-- Región: autá zo skupiny Región (bez nespárovaných GPS jednotiek) + autá spárované so zoznamom áut Doprava (trucks.cmd_id alebo ŠPZ);
-- duplicitné GPS jednotky jedného auta (alias_of) sa počítajú raz
create or replace function public.fleet_cars(grp text default 'region') returns jsonb language sql stable security definer set search_path=public as $$
  with cv as (select v.*, coalesce(v.alias_of,v.id) cid from cmd_vehicles v where not coalesce(v.deleted,false)),
  g as (select c.id from cv c where c.alias_of is null and coalesce(c.pair_state,'')<>'nesparovane' and (c.plate is not null or c.name is not null) and veh_group(c.id)=grp),
  tr as (select distinct c.cid id from trucks t join cv c on c.id=t.cmd_id or (pnorm(t.spz) is not null and pnorm(c.plate)=pnorm(t.spz))
          where grp='region' and coalesce(c.pair_state,'')<>'nesparovane'),
  u as (select id from g union select id from tr)
  select jsonb_build_object('skupina',grp,'n',(select count(*) from u),'v_skupine',(select count(*) from g),
    'sparovane_s_dopravou',(select count(*) from tr),'navyse_z_dopravy',(select count(*) from tr where id not in (select id from g)),
    'nesparovane_jednotky',(select count(*) from cv where alias_of is null and pair_state='nesparovane' and veh_group(id)=grp),
    'zlucene_duplicity',(select count(*) from cv where alias_of is not null and veh_group(alias_of)=grp),
    'commander',(select coalesce(jsonb_object_agg(acc,n),'{}') from cmd_api where kind='vehicles' and code=200),
    'ids',(select coalesce(jsonb_agg(id order by id),'[]') from u)) $$;
revoke all on function public.fleet_cars(text) from public, anon, authenticated;

-- ===== 1) KPI pre AI každých 10 min z databázy + vyčistenie neplatných alarmov =====
create or replace function public.fleet_kpi_tick() returns jsonb language plpgsql security definer set search_path=public as $$
declare fm jsonb; old jsonb; oat timestamptz; k jsonb; newest timestamptz; a text; keep jsonb:='[]'; drop_n int:=0; pl text; cars jsonb; tz text:='Europe/Bratislava'; n int;
begin
  select value, updated_at into old, oat from ai_state where key='kpi';
  old:=coalesce(old,'{}');
  fm:=fleet_month((now() at time zone tz)::date,'region');
  if fm ? 'chyba' then return fm; end if;
  newest:=greatest((select max(gps_at) from cmd_vehicles where not coalesce(deleted,false)),
                   (select max(at) from pos_log where at>now()-interval '2 days'),
                   (select max(at) from tank_log where at>now()-interval '2 days'));
  -- alarmy z aplikácie: stavy, ktoré už neplatia, vyhodiť
  for a in select jsonb_array_elements_text(case when jsonb_typeof(old->'alarmy')='array' then old->'alarmy' else '[]'::jsonb end) loop
    if a ~ '^Sync polôh nezapísal' and newest>now()-interval '30 minutes' then drop_n:=drop_n+1; continue; end if;
    if a ~ '^Auto bez signálu viac ako 24 h: ' then
      pl:=trim(substring(a from '^Auto bez signálu viac ako 24 h: (.*?) · '));
      if pl is not null and exists(select 1 from cmd_vehicles v where (pnorm(v.plate)=pnorm(pl) or v.name=pl or v.id=pl) and v.gps_at>now()-interval '24 hours') then drop_n:=drop_n+1; continue; end if;
    end if;
    -- pokles medzi dvoma jazdami počítala aplikácia – nahradené detekciou celého státia v databáze (fuel_stop_scan)
    if a ~ 'pokles paliva o .* počas státia' then drop_n:=drop_n+1; continue; end if;
    keep:=keep||to_jsonb(a);
  end loop;
  cars:=fleet_cars('region'); n:=nullif((cars->>'n')::int,0);
  k:=(old-'alarmy')||jsonb_build_object(
    'pohlad',coalesce(old->>'pohlad','hlavné čísla = Flotila Región (sklápače); ostatné skupiny v poli flotily'),'obdobie','m',
    'km',fm->'km','nafta_l',fm->'nafta_l','nafta_eur',fm->'nafta_eur_bez_dph','nafta_eur_bez_dph',fm->'nafta_eur_bez_dph','nafta_eur_s_dph',fm->'nafta_eur_s_dph',
    'cena_nafty_bez_dph',fm->'cena_nafty_bez_dph','myto_eur',fm->'myto_eur',
    'pevne_eur',fm->'pevne_naklady_do_dnes_pomerne','pevne_eur_poznamka','pomerne '||(fm->>'pevne_pomer'),'pevne_eur_cely_mesiac',fm->'pevne_naklady_cely_mesiac',
    'mzdy_eur',fm->'mzdy_eur','mzdy_poznamka',fm->'mzdy_poznamka','naklady_spolu_eur',fm->'naklady_spolu_eur',
    'obrat_eur',fm->'obrat_eur','obrat_je_odhad',fm->'obrat_je_odhad','obrat_poznamka',fm->'obrat_poznamka',
    'zisk_eur',fm->'zisk_do_dnes_pomerne','zisk_do_dnes_pomerne_eur',fm->'zisk_do_dnes_pomerne','zisk_cely_mesiac_plne_pevne_eur',fm->'zisk_cely_mesiac_plne_pevne','zisk_poznamka','',
    'auta_region',cars-'ids','pevne_na_auto_eur_mes',case when n is not null then round((fm->>'pevne_naklady_cely_mesiac')::numeric/n) end,
    'alarmy',keep,'alarmy_vyradene_neplatne',drop_n,
    'najnovsia_poloha',to_char(newest at time zone tz,'DD.MM HH24:MI'),
    'cisla_zdroj','databáza fleet_month (jeden výpočet zisku), prepočet každých 10 min',
    'prepocitane',to_char(now() at time zone tz,'DD.MM HH24:MI'),
    'aplikacia_ulozila',to_char(oat at time zone tz,'DD.MM HH24:MI'));
  if jsonb_typeof(k->'kde_stracame_peniaze')='object' and n is not null then
    k:=jsonb_set(k,'{kde_stracame_peniaze}',(k->'kde_stracame_peniaze')||jsonb_build_object('unikatne_auta',n,'pevne_na_auto_eur_mes',round((fm->>'pevne_naklady_cely_mesiac')::numeric/n)));
  end if;
  insert into ai_state(key,value,updated_at) values('kpi',k,now()) on conflict(key) do update set value=excluded.value, updated_at=now();
  return k;
exception when others then
  insert into check_err as c(fn,msg,at) values('fleet_kpi_tick',left(SQLERRM,500),now()) on conflict(fn) do update set msg=excluded.msg, at=now(), n=coalesce(c.n,0)+1;
  return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.fleet_kpi_tick() from public, anon, authenticated;

-- aplikácia majiteľa uloží svoje doplnky (vodiči, Kde strácame, alarmy) a čísla hneď prepočíta databáza
create or replace function public.fleet_kpi_save(p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if p is null or jsonb_typeof(p)<>'object' then return null; end if;
  insert into ai_state(key,value,updated_at) values('kpi',p,now()) on conflict(key) do update set value=excluded.value, updated_at=now();
  return fleet_kpi_tick();
end $$;
revoke all on function public.fleet_kpi_save(jsonb) from public, anon;
grant execute on function public.fleet_kpi_save(jsonb) to authenticated;

-- počet áut pre aplikáciu (iba majiteľ)
create or replace function public.fleet_cars_app(grp text default 'region') returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  return fleet_cars(grp);
end $$;
revoke all on function public.fleet_cars_app(text) from public, anon;
grant execute on function public.fleet_cars_app(text) to authenticated;

do $$ begin
  begin perform cron.unschedule('kpi-prehlad'); exception when others then null; end;
  perform cron.schedule('kpi-prehlad','*/10 * * * *','select public.fleet_kpi_tick()');
end $$;
select left(public.fleet_kpi_tick()::text,120);

-- ===== 4) duplicitné miesta =====
create table if not exists public.places_merged(id bigint primary key, keep_id bigint not null, row jsonb not null, why text, merged_at timestamptz not null default now());
alter table public.places_merged enable row level security;
drop policy if exists places_merged_own on public.places_merged;
create policy places_merged_own on public.places_merged for select using (is_owner());

create or replace function public.place_norm(n text) returns text language sql immutable as $$
  select regexp_replace(
           regexp_replace(lower(translate(coalesce(n,''),'áäčďéěíĺľňóôŕřšťúůýžÁÄČĎÉĚÍĹĽŇÓÔŔŘŠŤÚŮÝŽöőüűÖŐÜŰ','aacdeeillnoorrstuuyzAACDEEILLNOORRSTUUYZoouuOOUU')),
             '(^|[^a-z0-9])(s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|kft\.?|zrt\.?|spol\.?)(?=[^a-z0-9]|$)','\1','g'),
           '[^a-z0-9]','','g') $$;

create or replace function public.place_dist_m(la1 numeric, lo1 numeric, la2 numeric, lo2 numeric) returns numeric language sql immutable as $$
  select (6371000*2*asin(least(1,sqrt(power(sin(radians(la2-la1)/2),2)+cos(radians(la1))*cos(radians(la2))*power(sin(radians(lo2-lo1)/2),2)))))::numeric $$;

-- jasné duplicity: rovnaký typ a (rovnaký názov po normalizácii – čerpačky do 150 m, ostatné do 2 km
--   | do 150 m a jeden názov obsahuje druhý | do 50 m pri dvore / odberateľovi / inom mieste); ponechá sa staršie (menšie) id
create or replace function public.places_dupes() returns table(keep_id bigint, drop_id bigint, keep_name text, drop_name text, kind text, dist_m int, why text)
language sql stable security definer set search_path=public as $$
  select a.id, b.id, a.name, b.name, a.kind, round(x.d)::int,
         case when x.na<>'' and x.na=x.nb then 'rovnaký názov' when x.d<=150 and x.na<>'' and x.nb<>'' and (strpos(x.na,x.nb)>0 or strpos(x.nb,x.na)>0) then 'podobný názov do 150 m' else 'rovnaké miesto (do 50 m)' end
    from places a join places b on b.kind=a.kind and b.id>a.id and abs(b.lat-a.lat)<0.02 and abs(b.lon-a.lon)<0.03
    cross join lateral (select place_dist_m(a.lat,a.lon,b.lat,b.lon) d, place_norm(a.name) na, place_norm(b.name) nb) x
   where (x.na<>'' and x.na=x.nb and x.d<=case when a.kind='fuel' then 150 else 2000 end)
      or (x.d<=150 and length(x.na)>=4 and length(x.nb)>=4 and (strpos(x.na,x.nb)>0 or strpos(x.nb,x.na)>0))
      or (x.d<=50 and a.kind<>'fuel')
   order by a.id, b.id $$;
revoke all on function public.places_dupes() from public, anon, authenticated;

create or replace function public.places_merge(p_keep bigint, p_drop bigint, p_why text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare k places%rowtype; d places%rowtype; nv int; ne int:=0;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if p_keep is null or p_drop is null or p_keep=p_drop then return null; end if;
  select * into k from places where id=p_keep; select * into d from places where id=p_drop;
  if k.id is null or d.id is null then return null; end if;
  insert into places_merged(id,keep_id,row,why) values(d.id,k.id,to_jsonb(d),p_why) on conflict (id) do nothing;
  update veh_place set place_id=k.id where place_id=d.id; get diagnostics nv=row_count;
  delete from places where id=d.id;
  update places set notify=k.notify or d.notify, r=greatest(k.r,d.r), osm_id=coalesce(k.osm_id,d.osm_id), source=coalesce(k.source,d.source) where id=k.id;
  if d.name is distinct from k.name and not exists(select 1 from places where name=d.name) then
    update fleet_events set place=k.name where place=d.name; get diagnostics ne=row_count;
  end if;
  return jsonb_build_object('ponechane',k.id,'zlucene',d.id,'nazov',k.name,'zlucene_meno',d.name,'auta_na_mieste',nv,'udalosti',ne,'dovod',p_why);
end $$;
revoke all on function public.places_merge(bigint,bigint,text) from public, anon;
grant execute on function public.places_merge(bigint,bigint,text) to authenticated;

create or replace function public.places_merge_auto() returns jsonb language plpgsql security definer set search_path=public as $$
declare p record; res jsonb:='[]'; r jsonb;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  for p in select * from places_dupes() loop
    if not exists(select 1 from places where id=p.keep_id) or not exists(select 1 from places where id=p.drop_id) then continue; end if;
    r:=places_merge(p.keep_id,p.drop_id,p.why||' · '||p.dist_m||' m'); if r is not null then res:=res||r; end if;
  end loop;
  return jsonb_build_object('zlucene',jsonb_array_length(res),'polozky',res);
end $$;
revoke all on function public.places_merge_auto() from public, anon;
grant execute on function public.places_merge_auto() to authenticated;

-- jednorazovo: zlúčiť jasné duplicity (zálohy v places_merged)
select public.places_merge_auto();

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-02','📊 Prehľad flotily: jeden výpočet zisku, čerstvé KPI, počet áut Región, zlúčené duplicitné miesta','Flotila → Prehľad / Kde strácame peniaze · AI prehľad','iba majiteľ',array['owner'],
 'Zisk flotily ráta jedna funkcia (databáza aj aplikácia rovnako): pevné náklady aj základ mzdy pomerne podľa skutočne uplynulých dní mesiaca vrátane časti dneška (napr. 2. 11. o 00:15 = 1,01/30, nie 2/30). KPI pre AI prehľad sa prepočítajú každých 10 min a falošné alarmy (napr. „Sync polôh nezapísal novú polohu“, keď je posledná poloha čerstvá) sa vyradia. Počet áut Flotily Región = spárované autá (skupina Región + autá spárované so zoznamom áut Doprava), pevné náklady na auto sa prepočítali. Duplicitné miesta (rovnaký názov alebo do 150 m) sú zlúčené, záloha ostala.'
where not exists(select 1 from app_novinky where titul like '📊 Prehľad flotily: jeden výpočet zisku%');
