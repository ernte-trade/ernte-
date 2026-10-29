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
