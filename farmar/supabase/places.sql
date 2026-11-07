-- ERNTE – miesta s upozornením: dvor Medovská 46, Agro-Somotor, všetky čerpacie stanice SLOVNAFT
create table if not exists places(id bigserial primary key, name text not null, kind text not null check (kind in ('yard','buyer','fuel','other')),
  lat numeric not null, lon numeric not null, r int not null default 150, notify boolean not null default true, source text, osm_id text unique);
alter table places enable row level security;
drop policy if exists places_rw on places; create policy places_rw on places for all using (is_fleet()) with check (is_fleet());
create table if not exists osm_log(id bigint primary key, kind text, at timestamptz not null default now(), done boolean not null default false, code int);
alter table osm_log enable row level security;
create table if not exists veh_place(vehicle_id text primary key, place_id bigint, since timestamptz default now());
alter table veh_place enable row level security;
alter table fleet_events add column if not exists place text;
alter table fleet_events add column if not exists place_kind text;

-- dvor z predchádzajúceho nastavenia
insert into places(name,kind,lat,lon,r,source)
  select 'Dvor VALKO · Medovská 46','yard',(value->>'lat')::numeric,(value->>'lon')::numeric,coalesce((value->>'r')::int,150),'nastavenie'
  from fleet_cfg where key='yard' and not exists(select 1 from places where kind='yard');

create or replace function public.place_check() returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare v record; pl record; cur bigint; k int:=0; t text; drv text; msg text; title text;
begin
  select value->>'topic' into t from fleet_cfg where key='notify';
  for v in select * from cmd_vehicles where lat is not null and gps_at>now()-interval '30 minutes' loop
    select p.* into pl from places p
      where p.lat between v.lat-0.03 and v.lat+0.03 and p.lon between v.lon-0.045 and v.lon+0.045
        and 6371000*2*asin(sqrt(power(sin(radians(v.lat-p.lat)/2),2)+cos(radians(p.lat))*cos(radians(v.lat))*power(sin(radians(v.lon-p.lon)/2),2))) <= p.r
        and (p.kind<>'fuel' or coalesce(v.speed,0)<=5)
      order by power(v.lat-p.lat,2)+power(v.lon-p.lon,2) limit 1;
    select place_id into cur from veh_place where vehicle_id=v.id;
    if not found then insert into veh_place(vehicle_id,place_id) values(v.id,pl.id); continue; end if;
    if cur is distinct from pl.id then
      select driver into drv from rides where vehicle_id=v.id order by start_at desc limit 1;
      -- odchod z predchádzajúceho miesta (nie pri čerpačke)
      if cur is not null then
        perform 1 from places where id=cur and kind in ('yard','buyer');
        if found then
          select name,kind into title,msg from places where id=cur;
          insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind) values(v.id,v.plate,'out',drv,title,msg);
          if t is not null and (select notify from places where id=cur) then
            perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title',title,'message',coalesce(v.plate,v.name)||' odišlo'||coalesce(' · '||drv,'')||' · '||to_char(now() at time zone 'Europe/Bratislava','HH24:MI'),'tags',jsonb_build_array('arrow_right'),'priority',3));
          end if; k:=k+1;
        end if;
      end if;
      if pl.id is not null then
        insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind) values(v.id,v.plate,'in',drv,pl.name,pl.kind);
        if t is not null and pl.notify then
          msg := coalesce(v.plate,v.name)||case pl.kind when 'fuel' then ' stojí na čerpačke' else ' prišlo' end||coalesce(' · '||drv,'')||' · '||to_char(now() at time zone 'Europe/Bratislava','HH24:MI')
                 ||case when v.tank is not null then ' · nádrž '||round(v.tank)||' l' else '' end;
          perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title',pl.name,'message',msg,
            'tags',jsonb_build_array(case pl.kind when 'fuel' then 'fuelpump' when 'buyer' then 'ear_of_rice' else 'truck' end),'priority',case pl.kind when 'fuel' then 4 else 4 end));
        end if; k:=k+1;
      end if;
      update veh_place set place_id=pl.id, since=now() where vehicle_id=v.id;
      update cmd_vehicles set in_yard=(pl.kind='yard') where id=v.id;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.place_check() from public, anon, authenticated;

-- načítanie čerpačiek SLOVNAFT (OpenStreetMap) a polohy Somotor – spracuje sa v osm_sync
create or replace function public.osm_sync() returns text language plpgsql security definer set search_path=public, extensions, net as $$
declare r record; j jsonb; e jsonb; n int:=0;
begin
  for r in select l.id,l.kind,h.status_code,h.content from osm_log l join net._http_response h on h.id=l.id where not l.done loop
    if r.status_code=200 then begin
      j:=r.content::jsonb;
      if r.kind='osm_fuel' then
        for e in select * from jsonb_array_elements(coalesce(j->'elements','[]'::jsonb)) loop
          insert into places(name,kind,lat,lon,r,source,osm_id) values(
            'Slovnaft '||coalesce(e->'tags'->>'addr:city',e->'tags'->>'name',''),'fuel',
            coalesce((e->>'lat')::numeric,(e->'center'->>'lat')::numeric),coalesce((e->>'lon')::numeric,(e->'center'->>'lon')::numeric),80,'OpenStreetMap',e->>'type'||'/'||(e->>'id'))
          on conflict(osm_id) do nothing; n:=n+1;
        end loop;
      else
        e:=j->0;
        if e is not null and not exists(select 1 from places where kind='buyer' and name like 'Agro-Somotor%') then
          insert into places(name,kind,lat,lon,r,source) values('Agro-Somotor s.r.o. · Somotor','buyer',(e->>'lat')::numeric,(e->>'lon')::numeric,1500,'obec Somotor – upresniť');
        end if;
      end if;
    exception when others then null; end; end if;
    update osm_log set done=true, code=r.status_code where id=r.id;
  end loop;
  if not exists(select 1 from places where kind='fuel') and not exists(select 1 from osm_log where kind='osm_fuel' and at>now()-interval '1 hour') then
    insert into osm_log(id,kind) values(net.http_get(url:='https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%5Btimeout%3A90%5D%3Barea%5B%22ISO3166-1%22%3D%22SK%22%5D%5Badmin_level%3D2%5D-%3E.a%3Bnwr%5B%22amenity%22%3D%22fuel%22%5D%5B%22brand%22~%22Slovnaft%22%2Ci%5D%28area.a%29%3Bout%20center%3B',headers:=jsonb_build_object('User-Agent','ERNTE-Farmar/1.0'),timeout_milliseconds:=90000),'osm_fuel');
  end if;
  if not exists(select 1 from places where kind='buyer' and name like 'Agro-Somotor%') and not exists(select 1 from osm_log where kind='osm_somotor' and at>now()-interval '1 hour') then
    insert into osm_log(id,kind) values(net.http_get(url:='https://nominatim.openstreetmap.org/search?q=Somotor%2C%20Slovensko&format=json&limit=1',headers:=jsonb_build_object('User-Agent','ERNTE-Farmar/1.0 (ernte@ernte.sk)'),timeout_milliseconds:=20000),'osm_somotor');
  end if;
  return 'miesta: '||(select count(*) from places)||' (Slovnaft: '||(select count(*) from places where kind='fuel')||')';
end $$;
revoke all on function public.osm_sync() from public, anon, authenticated;

-- napojenie do pravidelnej synchronizácie (namiesto yard_check)
create or replace function public.yard_check() returns int language plpgsql security definer set search_path=public as $$
begin perform osm_sync(); return place_check(); end $$;
select public.osm_sync();
