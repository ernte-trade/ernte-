-- ERNTE – štyri skupiny vozidiel z Commandera: Flotila Región (sklápače), Flotila EU (ťahače), Služobné autá (osobné, dodávky), Traktory (traktory a stroje)
-- Zaradenie podľa typu vozidla z Commandera; ručný presun v aplikácii má prednosť a už sa nemení.
-- Služobné autá: alarm rýchlosti až nad 130 km/h (kamióny nad 90).
alter table cmd_vehicles add column if not exists fleet_manual boolean not null default false;

create or replace function public.cmd_fleet_class(acc_in text, plate_in text, id_in text, otype text, nm text) returns text language sql stable security definer set search_path=public as $$
  select case
    when lower(coalesce(otype,'')) in ('personal car','electric car','van','motorcycle','person','bicycle') then 'sluzobne'
    when lower(coalesce(otype,'')) in ('working machine','excavator','bulldozer','roller','loader','harvestor','snow plow','wood export','tractor')
      or coalesce(nm,'') ~* '(claas|axion|arion|xerion|lexion|john deere|fendt|new holland|zetor|valtra|kubota|deutz|massey|case ih|steyr|traktor|tractor|kombajn|manitou|merlo|jcb)' then 'traktory'
    when acc_in='eu' then 'eu'
    when exists(select 1 from trucks t where t.cmd_id=id_in or upper(regexp_replace(coalesce(t.spz,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(coalesce(plate_in,''),'[^A-Za-z0-9]','','g'))) then 'region'
    else 'eu' end $$;

-- automatické zaradenie pri každom zápise z Commandera (okrem ručne presunutých)
create or replace function public.cmd_vehicles_fleet_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not coalesce(new.fleet_manual,false) and (new.object_type is not null or new.name is not null) then
    new.fleet:=cmd_fleet_class(coalesce(new.acc,'main'),new.plate,new.id,new.object_type,concat_ws(' ',new.name,new.model));
  end if;
  return new;
end $$;
drop trigger if exists cmd_vehicles_fleet on cmd_vehicles;
create trigger cmd_vehicles_fleet before insert or update on cmd_vehicles for each row execute function public.cmd_vehicles_fleet_trg();
update cmd_vehicles set fleet=cmd_fleet_class(coalesce(acc,'main'),plate,id,object_type,concat_ws(' ',name,model)) where not fleet_manual and (object_type is not null or name is not null);

create or replace function public.set_vehicle_fleet(vid text, fl text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if fl not in ('region','eu','sluzobne','traktory') then raise exception 'Neznáma skupina.'; end if;
  update cmd_vehicles set fleet=fl, fleet_manual=true where id=vid;
end $$;
revoke all on function public.set_vehicle_fleet(text,text) from public, anon;
grant execute on function public.set_vehicle_fleet(text,text) to authenticated;

-- rýchlosť: služobné autá do 130 km/h nie je porušenie
create or replace function public.fleet_events_speed_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.kind='speed' and coalesce(new.kmh,0)<=130 and exists(select 1 from cmd_vehicles v where v.id=new.vehicle_id and v.fleet='sluzobne') then return null; end if;
  return new;
end $$;
drop trigger if exists fleet_events_speed on fleet_events;
create trigger fleet_events_speed before insert on fleet_events for each row execute function public.fleet_events_speed_trg();
delete from fleet_events e using cmd_vehicles v where e.kind='speed' and v.id=e.vehicle_id and v.fleet='sluzobne' and coalesce(e.kmh,0)<=130;

-- prehľad: počty po skupinách
create or replace function public.cmd_overview() returns jsonb language sql stable security definer set search_path=public as $$
  select case when not is_fleet() then null else jsonb_build_object(
    'konta',(select coalesce(jsonb_agg(x),'[]') from (select acc konto, exists(select 1 from vault.secrets where name=case when acc='eu' then 'commander_basic_eu' else 'commander_basic' end) zadane from unnest(array['main','eu']) acc) x),
    'api',(select coalesce(jsonb_agg(to_jsonb(c) order by c.acc,c.kind),'[]') from cmd_api c),
    'vozidla',(select jsonb_build_object('spolu',count(*) filter (where not coalesce(deleted,false)),
       'region',count(*) filter (where fleet='region' and not coalesce(deleted,false)),'eu',count(*) filter (where fleet='eu' and not coalesce(deleted,false)),
       'sluzobne',count(*) filter (where fleet='sluzobne' and not coalesce(deleted,false)),'traktory',count(*) filter (where fleet='traktory' and not coalesce(deleted,false)),
       'bez_nazvu',count(*) filter (where plate is null and name is null and not coalesce(deleted,false)),
       'archivovane',(select count(*) from cmd_ref where kind='deleted_vehicle'),
       'podla_typu',(select coalesce(jsonb_object_agg(coalesce(t,'nezadaný'),k),'{}') from (select object_type t,count(*) k from cmd_vehicles where not coalesce(deleted,false) group by 1) q)) from cmd_vehicles),
    'vodici',(select count(*) from cmd_drivers),'body',(select count(*) from cmd_waypoints),
    'tankovanie_import_35_dni',(select jsonb_build_object('pocet',count(*),'litre',round(coalesce(sum(liters),0)),'eur_bez_dph',round(coalesce(sum(cost),0)),
       'nesparovane',count(*) filter (where status=2),'nesparovane_l',round(coalesce(sum(liters) filter (where status=2),0))) from cmd_refuel where at>now()-interval '35 days'),
    'jazdy_od',(select to_char(min(start_at) at time zone 'Europe/Bratislava','YYYY-MM-DD') from rides),
    'jazdy_spolu',(select count(*) from rides)) end $$;
revoke all on function public.cmd_overview() from public, anon;
grant execute on function public.cmd_overview() to authenticated;

select fleet skupina, count(*) aut from cmd_vehicles where not coalesce(deleted,false) group by 1 order by 1;

-- ===== 26. 10. 2026: typ vozidla, zlúčenie duplicitných vozidiel =====
-- VALKO flotila: TYP VOZIDLA (ťahač N3 / sklápač N3 / osobné M1 / dodávka N1 / traktor T) a ZLÚČENIE DUPLICITNÝCH VOZIDIEL
-- (číselné ID GPS jednotky z Commandera = auto so ŠPZ). Rýchlosť: N2/N3 nad 90 km/h, M1/N1 nad 130 km/h, N3 nad 100 km/h = obmedzovač.
alter table cmd_vehicles add column if not exists vtype text;
alter table cmd_vehicles add column if not exists vtype_manual boolean not null default false;
alter table cmd_vehicles add column if not exists alias_of text;
alter table cmd_vehicles add column if not exists pair_state text;
alter table cmd_vehicles add column if not exists pair_note text;

create or replace function public.pnorm(x text) returns text language sql immutable as $$
  select nullif(upper(regexp_replace(coalesce(x,''),'[^A-Za-z0-9]','','g')),'') $$;

-- odhad typu z Commandera (typ objektu), skupiny flotily a názvu/modelu
create or replace function public.veh_type_guess(otype text, fl text, nm text) returns text language sql immutable as $$
  select case
    when lower(coalesce(otype,''))='van' then 'dodavka_n1'
    when lower(coalesce(otype,'')) in ('personal car','electric car','motorcycle','person','bicycle') then 'osobne_m1'
    when lower(coalesce(otype,'')) in ('working machine','excavator','bulldozer','roller','loader','harvestor','snow plow','wood export','tractor') then 'traktor_t'
    when fl='traktory' then 'traktor_t'
    when fl='sluzobne' then case when coalesce(nm,'') ~* '(transit|sprinter|crafter|ducato|master|trafic|vivaro|boxer|jumper|daily|movano|vito|transporter|caddy|kangoo|berlingo|partner|doblo|proace|expert|jumpy|dodávk|dodavk|van)' then 'dodavka_n1' else 'osobne_m1' end
    when fl='eu' then 'tahac_n3'
    else 'sklapac_n3' end $$;

create or replace function public.veh_type_name(t text) returns text language sql immutable as $$
  select case t when 'tahac_n3' then 'Ťahač N3' when 'sklapac_n3' then 'Sklápač N3' when 'osobne_m1' then 'Osobné M1' when 'dodavka_n1' then 'Dodávka N1' when 'traktor_t' then 'Traktor / stroj T' else 'nezadaný' end $$;

-- skutočný typ vozidla (pri zlúčenom vozidle typ hlavného auta so ŠPZ)
create or replace function public.veh_vtype(vid text) returns text language sql stable security definer set search_path=public as $$
  select coalesce(c.vtype, veh_type_guess(c.object_type,c.fleet,concat_ws(' ',c.name,c.model)))
    from cmd_vehicles v join cmd_vehicles c on c.id=coalesce(v.alias_of,v.id) where v.id=vid $$;
-- limit rýchlosti pre alarm: osobné M1 a dodávky N1 130 km/h, nákladné N2/N3 (a stroje) 90 km/h
create or replace function public.veh_speed_lim(vid text) returns int language sql stable security definer set search_path=public as $$
  select case when veh_vtype(vid) in ('osobne_m1','dodavka_n1') then 130 else 90 end $$;
revoke all on function public.veh_vtype(text) from public, anon;
revoke all on function public.veh_speed_lim(text) from public, anon;

-- typ sa dopĺňa automaticky (kým ho niekto nezmení ručne); potvrdená ŠPZ zlúčeného vozidla sa neprepíše prázdnou
create or replace function public.cmd_vehicles_vtype_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not coalesce(new.vtype_manual,false) then
    new.vtype:=veh_type_guess(new.object_type,new.fleet,concat_ws(' ',new.name,new.model));
  end if;
  if tg_op='UPDATE' then
    if new.plate is null and old.plate is not null and old.pair_state='potvrdene' then new.plate:=old.plate; end if;
  end if;
  return new;
end $$;
drop trigger if exists cmd_vehicles_vtype on cmd_vehicles;
create trigger cmd_vehicles_vtype before insert or update on cmd_vehicles for each row execute function public.cmd_vehicles_vtype_trg();
update cmd_vehicles set vtype=veh_type_guess(object_type,fleet,concat_ws(' ',name,model)) where not vtype_manual;

-- ručná zmena typu v aplikácii (Flotila → Vozidlá); prázdny typ = automaticky
create or replace function public.set_vehicle_type(vid text, t text) returns text language plpgsql security definer set search_path=public as $$
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if coalesce(t,'')='' then
    update cmd_vehicles set vtype_manual=false where id=vid;
  elsif t in ('tahac_n3','sklapac_n3','osobne_m1','dodavka_n1','traktor_t') then
    update cmd_vehicles set vtype=t, vtype_manual=true where id=vid;
  else raise exception 'Neznámy typ vozidla.'; end if;
  return veh_vtype(vid);
end $$;
revoke all on function public.set_vehicle_type(text,text) from public, anon;
grant execute on function public.set_vehicle_type(text,text) to authenticated;

-- ===== ZLÚČENIE DUPLICÍT =====
-- vozidlo „iba číslo“ = bez ŠPZ a mena s písmenami (zobrazuje sa číselné ID GPS jednotky)
create or replace function public.veh_is_num(plate text, name text) returns boolean language sql immutable as $$
  select (pnorm(plate) is null or pnorm(plate) ~ '^[0-9]+$') and (pnorm(name) is null or pnorm(name) ~ '^[0-9]+$') $$;

-- potvrdené páry od majiteľa (zhodný čas a hladina)
do $$
declare p record; c text;
begin
  for p in select * from (values ('135928','AA907DJ','AA 907DJ'),('143770','AA092GA','AA 092GA'),('146979','AA954HN','AA 954HN'),('154360','AA575OV','AA 575OV'),
                                 ('133592','AA148BM','AA 148BM'),('150458','AA724HJ','AA 724HJ'),('126888','MI377FA','MI 377FA')) x(num,pl,fmt) loop
    select v.id into c from cmd_vehicles v where pnorm(v.plate)=p.pl and v.id<>p.num and v.alias_of is null and not veh_is_num(v.plate,v.name)
      order by (v.name is not null) desc, coalesce(v.deleted,false), v.gps_at desc nulls last limit 1;
    if c is not null then
      update cmd_vehicles set alias_of=c, pair_state='potvrdene', pair_note='zlúčené s '||p.fmt||' (potvrdené: zhodný čas a hladina)' where id=p.num and id<>c;
      update cmd_vehicles set alias_of=null, pair_state=null where id=c and alias_of=p.num;
    else
      -- auto so ŠPZ v zozname nie je → GPS jednotka dostane ŠPZ a je to to isté auto
      update cmd_vehicles set plate=p.fmt, pair_state='potvrdene', pair_note='ŠPZ '||p.fmt||' doplnená (potvrdené: zhodný čas a hladina)'
       where id=p.num and veh_is_num(plate,name);
    end if;
  end loop;
end $$;

-- automatické párovanie ostatných číselných ID: rovnaký čas záznamu a rovnaká hladina (± 1 l) v nádrži, alebo rovnaký začiatok jazdy a hladina
create or replace function public.veh_pair_auto() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; n record; b record; s record;
begin
  for n in select v.* from cmd_vehicles v where not coalesce(v.deleted,false) and veh_is_num(v.plate,v.name) and v.alias_of is null and coalesce(v.pair_state,'')<>'potvrdene' loop
    with t as (
      select c.vehicle_id cid, count(*) sc from tank_log a join tank_log c on c.at=a.at and c.vehicle_id<>a.vehicle_id and abs(c.tank-a.tank)<=1
       where a.vehicle_id=n.id and a.at>now()-interval '14 days' and c.at>now()-interval '14 days' group by c.vehicle_id
      union all
      select r2.vehicle_id, count(*)*3 from rides r1 join rides r2 on r2.vehicle_id<>r1.vehicle_id and abs(extract(epoch from r2.start_at-r1.start_at))<=60
         and r1.fuel_start is not null and abs(coalesce(r2.fuel_start,-999)-r1.fuel_start)<=1
       where r1.vehicle_id=n.id and r1.start_at>now()-interval '60 days' and r2.start_at>now()-interval '60 days' group by r2.vehicle_id
      union all
      select c.id, 2 from cmd_vehicles c where c.id<>n.id and n.gps_at is not null and c.gps_at is not null and abs(extract(epoch from c.gps_at-n.gps_at))<=60
         and n.tank is not null and abs(coalesce(c.tank,-999)-n.tank)<=1 and (n.lat is null or c.lat is null or geo_m(n.lat,n.lon,c.lat,c.lon)<=300)),
    g as (select cid, sum(sc) sc from t join cmd_vehicles c on c.id=t.cid where not veh_is_num(c.plate,c.name) and c.alias_of is null and not coalesce(c.deleted,false) group by cid)
    select (select cid from g order by sc desc limit 1) cid, (select sc from g order by sc desc limit 1) s1, coalesce((select sc from g order by sc desc offset 1 limit 1),0) s2 into s;
    if s.cid is not null and s.s1>=5 and s.s1>=3*s.s2 then
      select coalesce(plate,name,id) pl into b from cmd_vehicles where id=s.cid;
      update cmd_vehicles set alias_of=s.cid, pair_state='auto', pair_note='spárované s '||b.pl||' – zhodný čas a hladina ('||s.s1||' bodov)' where id=n.id;
      k:=k+1;
    else
      update cmd_vehicles set pair_state='nesparovane', pair_note=case when s.cid is null then 'nespárované – žiadny zhodný čas a hladina s autom so ŠPZ' else 'nespárované – nejednoznačná zhoda ('||s.s1||' bodov)' end
       where id=n.id and pair_state is distinct from 'nesparovane';
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.veh_pair_auto() from public, anon, authenticated;
select public.veh_pair_auto();
select cron.unschedule(jobname) from cron.job where jobname='vozidla-parovanie';
select cron.schedule('vozidla-parovanie','23 * * * *','select public.veh_pair_auto()');

-- rýchlosť: alarm až nad limit podľa typu (M1/N1 130 km/h, N2/N3 90 km/h)
create or replace function public.fleet_events_speed_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.kind='speed' and coalesce(new.kmh,0)<=coalesce(veh_speed_lim(new.vehicle_id),90) then return null; end if;
  if new.kind='limiter' and coalesce(veh_vtype(new.vehicle_id),'sklapac_n3') not in ('tahac_n3','sklapac_n3') then return null; end if;
  return new;
end $$;
drop trigger if exists fleet_events_speed on fleet_events;
create trigger fleet_events_speed before insert on fleet_events for each row execute function public.fleet_events_speed_trg();
delete from fleet_events e where e.kind='speed' and coalesce(e.kmh,0)<=coalesce(veh_speed_lim(e.vehicle_id),90);

-- Commander prehľad: typy vozidiel podľa typu (nie „nezadaný“), unikátne / zlúčené / nespárované
create or replace function public.cmd_overview()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when not is_fleet() then null else jsonb_build_object(
    'konta',(select coalesce(jsonb_agg(x),'[]') from (select acc konto, exists(select 1 from vault.secrets where name=case when acc='eu' then 'commander_basic_eu' else 'commander_basic' end) zadane from unnest(array['main','eu']) acc) x),
    'api',(select coalesce(jsonb_agg(to_jsonb(c) order by c.acc,c.kind),'[]') from cmd_api c),
    'vozidla',(select jsonb_build_object('spolu',count(*) filter (where not coalesce(deleted,false)),
       'region',count(*) filter (where fleet='region' and not coalesce(deleted,false)),'eu',count(*) filter (where fleet='eu' and not coalesce(deleted,false)),
       'sluzobne',count(*) filter (where fleet='sluzobne' and not coalesce(deleted,false)),'traktory',count(*) filter (where fleet='traktory' and not coalesce(deleted,false)),
       'bez_nazvu',count(*) filter (where plate is null and name is null and not coalesce(deleted,false)),
       'archivovane',(select count(*) from cmd_ref where kind='deleted_vehicle'),
       'podla_typu',(select coalesce(jsonb_object_agg(veh_type_name(t),k),'{}') from (select veh_vtype(id) t,count(*) k from cmd_vehicles where not coalesce(deleted,false) and alias_of is null group by 1) q),
       'unikatne',count(*) filter (where not coalesce(deleted,false) and alias_of is null and coalesce(pair_state,'')<>'nesparovane'),
       'zlucene',count(*) filter (where not coalesce(deleted,false) and alias_of is not null),
       'nesparovane',count(*) filter (where not coalesce(deleted,false) and alias_of is null and pair_state='nesparovane')) from cmd_vehicles),
    'vodici',(select count(*) from cmd_drivers),'body',(select count(*) from cmd_waypoints),
    'tankovanie_import_35_dni',(select jsonb_build_object('pocet',count(*),'litre',round(coalesce(sum(liters),0)),'eur_bez_dph',round(coalesce(sum(cost),0)),
       'nesparovane',count(*) filter (where status=2),'nesparovane_l',round(coalesce(sum(liters) filter (where status=2),0))) from cmd_refuel where at>now()-interval '35 days'),
    'jazdy_od',(select to_char(min(start_at) at time zone 'Europe/Bratislava','YYYY-MM-DD') from rides),
    'jazdy_spolu',(select count(*) from rides)) end $function$;
revoke all on function public.cmd_overview() from public, anon;
grant execute on function public.cmd_overview() to authenticated;
