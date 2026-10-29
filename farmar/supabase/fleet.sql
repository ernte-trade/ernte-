-- ERNTE – Flotila VALKO: jazdy, spotreba, nádrže, km, vodiči (Commander API) + tím ERNTE (prihlásenia)
alter table cmd_log add column if not exists url text;
alter table cmd_log add column if not exists n int;
alter table cmd_log add column if not exists gps_max timestamptz;
alter table cmd_log add column if not exists ref bigint;
create table if not exists check_err(fn text primary key, msg text, at timestamptz default now(), ok_at timestamptz, n int default 0);
alter table check_err enable row level security;
alter table trucks add column if not exists tank numeric;
alter table trucks add column if not exists odometer numeric;

create table if not exists cmd_vehicles(
  id text primary key, name text, plate text, last_comm timestamptz,
  lat numeric, lon numeric, gps_at timestamptz, speed int, ign int, tank numeric, odometer numeric, engine_hours numeric, voltage numeric, updated_at timestamptz default now());
create table if not exists rides(
  ride_id text primary key, vehicle_id text, plate text, driver text, ride_type text,
  start_at timestamptz, stop_at timestamptz, start_addr text, stop_addr text,
  distance numeric, duration int, avg_speed numeric, max_speed int,
  fuel_consumed numeric, avg_cons numeric, fuel_start numeric, fuel_stop numeric, odo_start numeric, odo_stop numeric,
  refuel_l numeric, refuel_eur numeric, note text, lat_start numeric, lon_start numeric, lat_stop numeric, lon_stop numeric);
create index if not exists rides_start on rides(start_at);
create index if not exists rides_veh on rides(vehicle_id, start_at);

create or replace function public.is_fleet() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from staff where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and role in ('owner','dispatch')) $$;
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from staff where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and role='owner') $$;
alter table cmd_vehicles enable row level security;
alter table rides enable row level security;
drop policy if exists cmdv_read on cmd_vehicles; create policy cmdv_read on cmd_vehicles for select using (is_fleet());
drop policy if exists rides_read on rides; create policy rides_read on rides for select using (is_fleet());
drop policy if exists staff_read on staff; create policy staff_read on staff for select using (is_staff());

create or replace function public.cmd_num(t text) returns numeric language plpgsql immutable as $$
begin if t is null or t='' then return null; end if; return replace(t,',','.')::numeric; exception when others then return null; end $$;

create or replace function public.cmd_sync() returns text language plpgsql security definer set search_path=public, extensions, net as $$
declare r record; j jsonb; p jsonb; f jsonb; n int:=0; a text; base text:='https://online.commander-systems.com/api/v1/'; d date; e bigint; s bigint; pn int; gmax timestamptz; perr text; bu text; rq bigint;
begin
  a:=cmd_auth(); if a is null then return 'chýbajú prihlasovacie údaje'; end if;
  for r in select l.id,l.kind,l.url,h.status_code,h.content from cmd_log l join net._http_response h on h.id=l.id where not l.done loop
    if r.status_code=200 then
      begin
        j:=r.content::jsonb;
        if r.kind='vehicles' then
          for p in select * from jsonb_array_elements(case when jsonb_typeof(j)='array' then j else coalesce(j->'vehicles',j->'data','[]'::jsonb) end) loop
            insert into cmd_vehicles(id,name,plate,last_comm) values(p->>'vehicleId',p->>'vehicleName',p->>'vehicleRegistrationPlate',null)
              on conflict(id) do update set name=excluded.name,plate=excluded.plate,last_comm=excluded.last_comm;
            update trucks set cmd_id=p->>'vehicleId'
             where upper(regexp_replace(spz,'[^A-Za-z0-9]','','g'))=upper(regexp_replace(coalesce(p->>'vehicleRegistrationPlate',''),'[^A-Za-z0-9]','','g'));
          end loop;
        elsif r.kind='pos' then
          -- každá poloha zvlášť: chyba jedného záznamu nezahodí ostatné; počet a najnovší GPS čas sa zapíšu do cmd_log
          pn:=0; gmax:=null; perr:=null;
          for p in select * from jsonb_array_elements(case when jsonb_typeof(j)='array' then j else coalesce(j->'positions',j->'data','[]'::jsonb) end) loop
            begin
              if coalesce(p->>'vehicleId','')<>'' then
                insert into cmd_vehicles(id,lat,lon,gps_at,speed,ign,tank,odometer,engine_hours,voltage,updated_at)
                  values(p->>'vehicleId',cmd_num(p->>'gpsLat'),cmd_num(p->>'gpsLon'),to_timestamp(cmd_num(p->>'gpsTime')),cmd_num(p->>'gpsSpeed')::int,cmd_num(p->>'carIgnition')::int,
                    nullif(cmd_num(p->>'canTankValue'),0),nullif(cmd_num(p->>'canOdometer'),0),nullif(cmd_num(p->>'canEngineHours'),0),cmd_num(p->>'voltage'),now())
                  on conflict(id) do update set lat=coalesce(excluded.lat,cmd_vehicles.lat),lon=coalesce(excluded.lon,cmd_vehicles.lon),gps_at=coalesce(excluded.gps_at,cmd_vehicles.gps_at),speed=excluded.speed,ign=excluded.ign,
                    tank=coalesce(excluded.tank,cmd_vehicles.tank),odometer=coalesce(excluded.odometer,cmd_vehicles.odometer),engine_hours=coalesce(excluded.engine_hours,cmd_vehicles.engine_hours),voltage=excluded.voltage,updated_at=now();
                update trucks set gps_lat=cmd_num(p->>'gpsLat'),gps_lon=cmd_num(p->>'gpsLon'),gps_at=to_timestamp(cmd_num(p->>'gpsTime')),gps_speed=cmd_num(p->>'gpsSpeed')::int,
                  gps_ign=cmd_num(p->>'carIgnition')::int,tank=coalesce(nullif(cmd_num(p->>'canTankValue'),0),tank),odometer=coalesce(nullif(cmd_num(p->>'canOdometer'),0),odometer)
                 where cmd_id=p->>'vehicleId';
                n:=n+1; pn:=pn+1; gmax:=greatest(gmax,to_timestamp(cmd_num(p->>'gpsTime')));
              end if;
            exception when others then perr:=left(SQLERRM,250);
            end;
          end loop;
          update cmd_log set n=pn, gps_max=gmax where id=r.id;
          if perr is not null then
            insert into check_err as c(fn,msg,at,n) values('cmd_sync_pos',perr,now(),pn) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(), n=excluded.n;
          else
            insert into check_err as c(fn,msg,ok_at,n) values('cmd_sync_pos',null,now(),pn) on conflict on constraint check_err_pkey do update set msg=null, ok_at=now(), n=excluded.n;
          end if;
        elsif r.kind='rides' then
          for p in select * from jsonb_array_elements(coalesce(j->'rides',j->'data','[]'::jsonb)) loop
            insert into rides(ride_id,vehicle_id,plate,driver,ride_type,start_at,stop_at,start_addr,stop_addr,lat_start,lon_start,lat_stop,lon_stop,distance,duration,avg_speed,max_speed,fuel_consumed,avg_cons,fuel_start,fuel_stop,odo_start,odo_stop,refuel_l,refuel_eur,note)
            values(p->>'rideId',p->>'vehicleId',p->>'vehicleRegistrationPlate',p->>'driverName',p->>'rideType',to_timestamp(cmd_num(p->>'startTime')),to_timestamp(cmd_num(p->>'stopTime')),
              p->>'startAddress',p->>'stopAddress',cmd_num(p->>'latStart'),cmd_num(p->>'lonStart'),cmd_num(p->>'latStop'),cmd_num(p->>'lonStop'),cmd_num(p->>'distance'),cmd_num(p->>'duration')::int,cmd_num(p->>'avgSpeed'),cmd_num(p->>'maxSpeed')::int,
              nullif(cmd_num(p->>'fuelConsumed'),0),nullif(cmd_num(p->>'averageConsumption'),0),nullif(cmd_num(p->>'fuelLevelStart'),0),nullif(cmd_num(p->>'fuelLevelStop'),0),
              cmd_num(p->>'odometerStart'),cmd_num(p->>'odometerStop'),
              (select sum(cmd_num(x->>'volume')) from jsonb_array_elements(case when jsonb_typeof(p->'refueling')='array' then p->'refueling' else '[]'::jsonb end) x),
              (select sum(cmd_num(x->>'priceVatExc')) from jsonb_array_elements(case when jsonb_typeof(p->'refueling')='array' then p->'refueling' else '[]'::jsonb end) x),
              p->>'note')
            on conflict(ride_id) do update set lat_start=excluded.lat_start,lon_start=excluded.lon_start,lat_stop=excluded.lat_stop,lon_stop=excluded.lon_stop,start_addr=excluded.start_addr,driver=excluded.driver,ride_type=excluded.ride_type,stop_at=excluded.stop_at,stop_addr=excluded.stop_addr,distance=excluded.distance,duration=excluded.duration,
              avg_speed=excluded.avg_speed,max_speed=excluded.max_speed,fuel_consumed=excluded.fuel_consumed,avg_cons=excluded.avg_cons,fuel_stop=excluded.fuel_stop,odo_stop=excluded.odo_stop,refuel_l=excluded.refuel_l,refuel_eur=excluded.refuel_eur,note=excluded.note;
          end loop;
          if cmd_num(j->>'totalPages')>cmd_num(j->>'page') and r.url is not null then
            insert into cmd_log(id,kind,url) values(net.http_get(url:=regexp_replace(r.url,'page=\d+','page='||(cmd_num(j->>'page')::int+1)),headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'rides',regexp_replace(r.url,'page=\d+','page='||(cmd_num(j->>'page')::int+1)));
          end if;
        end if;
      exception when others then
        insert into check_err as c(fn,msg,at) values('cmd_sync_'||r.kind,left(SQLERRM,250),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now();
      end;
    end if;
    update cmd_log set done=true, code=r.status_code where id=r.id;
    -- nočné načítanie histórie (backfill): kód odpovede k dňu; pri chybe sa deň zopakuje (max 3×)
    if r.kind='rides' then update cmd_log set code=coalesce(r.status_code,-1) where kind='backfill' and ref=r.id; end if;
  end loop;
  delete from cmd_log where at < now()-interval '3 days' and kind<>'backfill';
  if not exists(select 1 from cmd_log where kind='vehicles' and at>now()-interval '6 hours') then
    insert into cmd_log(id,kind) values(net.http_get(url:=base||'vehicles',headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'vehicles');
  end if;
  insert into cmd_log(id,kind) values(net.http_get(url:=base||'last-positions?limit=1000',headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'pos');
  -- jazdy: posledných 26 h každých 10 min
  if not exists(select 1 from cmd_log where kind='rides' and at>now()-interval '10 minutes') then
    e:=extract(epoch from now())::bigint; s:=e-26*3600;
    insert into cmd_log(id,kind,url) select net.http_get(url:=u,headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'rides',u
      from (select base||'all-rides?datetimeStart='||s||'&datetimeEnd='||e||'&limit=1000&page=1' as u) q;
  end if;
  -- história od 1. 7. 2026 (min. 60 dní) po dňoch (6 dní na jeden beh); deň bez kódu alebo s chybou sa po 20 min zopakuje (max 3×)
  for d in select g::date from generate_series(least(current_date-60,date '2026-07-01'),current_date-1,'1 day') g
            where not exists(select 1 from cmd_log b where b.kind='backfill' and b.url=g::date::text
                             and (b.ref is null or b.code=200 or coalesce(b.n,0)>=3 or b.at>now()-interval '20 minutes')) order by g desc limit 6 loop
    s:=extract(epoch from d::timestamp at time zone 'Europe/Bratislava')::bigint; e:=s+86400;
    bu:=base||'all-rides?datetimeStart='||s||'&datetimeEnd='||e||'&limit=1000&page=1';
    rq:=net.http_get(url:=bu,headers:=jsonb_build_object('Authorization',a,'Accept','application/json'));
    insert into cmd_log(id,kind,url) values(rq,'rides',bu);
    insert into cmd_log(id,kind,url,done,ref,n,at) values(-(extract(epoch from d)::bigint),'backfill',d::text,true,rq,1,now())
      on conflict(id) do update set ref=excluded.ref, n=coalesce(cmd_log.n,0)+1, at=now(), code=null;
  end loop;
  begin perform yard_check(); exception when others then null; end;
  return 'ok, spracovaných polôh: '||n||', jázd v databáze: '||(select count(*) from rides);
end $$;
revoke all on function public.cmd_sync() from public, anon, authenticated;


-- ===== Dvor VALKO (Medovská 46, Michalovce) – príchod / odchod áut + upozornenia =====
create table if not exists fleet_cfg(key text primary key, value jsonb not null default '{}'::jsonb);
alter table fleet_cfg enable row level security;
drop policy if exists fcfg_rw on fleet_cfg; create policy fcfg_rw on fleet_cfg for all using (is_fleet()) with check (is_fleet());
create table if not exists fleet_events(id bigserial primary key, vehicle_id text, plate text, kind text, at timestamptz not null default now(), driver text, note text);
create index if not exists fev_at on fleet_events(at desc);
alter table fleet_events enable row level security;
drop policy if exists fev_read on fleet_events; create policy fev_read on fleet_events for select using (is_fleet());
alter table cmd_vehicles add column if not exists in_yard boolean;
do $$ begin alter publication supabase_realtime add table fleet_events; exception when others then null; end $$;
insert into fleet_cfg(key,value) values('notify',jsonb_build_object('topic','ernte-valko-__TOPIC__')) on conflict(key) do nothing;

create or replace function public.yard_check() returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare y jsonb; v record; inside boolean; k int:=0; t text; drv text; msg text;
begin
  select value into y from fleet_cfg where key='yard'; if y is null or y->>'lat' is null then return 0; end if;
  select value->>'topic' into t from fleet_cfg where key='notify';
  for v in select * from cmd_vehicles where lat is not null and gps_at>now()-interval '30 minutes' loop
    inside := 6371000*2*asin(sqrt(power(sin(radians(v.lat-(y->>'lat')::numeric)/2),2)+cos(radians((y->>'lat')::numeric))*cos(radians(v.lat))*power(sin(radians(v.lon-(y->>'lon')::numeric)/2),2))) <= coalesce((y->>'r')::numeric,150);
    if v.in_yard is distinct from inside then
      if v.in_yard is not null then
        select driver into drv from rides where vehicle_id=v.id order by start_at desc limit 1;
        insert into fleet_events(vehicle_id,plate,kind,driver) values(v.id,v.plate,case when inside then 'yard_in' else 'yard_out' end,drv);
        if t is not null then
          msg := coalesce(v.plate,v.name,v.id)||case when inside then ' prišlo na dvor' else ' odišlo z dvora' end||coalesce(' · '||drv,'')||' · '||to_char(now() at time zone 'Europe/Bratislava','HH24:MI')
                 ||case when v.tank is not null then ' · nádrž '||round(v.tank)||' l' else '' end;
          perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','VALKO dvor Medovská','message',msg,'tags',jsonb_build_array(case when inside then 'truck' else 'arrow_right' end),'priority',4));
        end if;
        k:=k+1;
      end if;
      update cmd_vehicles set in_yard=inside where id=v.id;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.yard_check() from public, anon, authenticated;

-- ===== tím ERNTE: prihlásenie pre zamestnancov (iba majiteľ) =====
create or replace function public.set_staff_login(login_in text, name_in text, role_in text, pw text) returns text
language plpgsql security definer set search_path=public, auth, extensions as $$
declare lg text:=lower(trim(login_in)); d text; uid uuid;
begin
  if not is_owner() then raise exception 'Iba majiteľ môže pridávať ľudí do tímu.'; end if;
  if role_in not in ('owner','admin','dispatch','invoice') then raise exception 'Neznáma rola.'; end if;
  if length(coalesce(pw,''))<8 then raise exception 'Heslo musí mať aspoň 8 znakov.'; end if;
  if position('@' in lg)=0 then d:=regexp_replace(lg,'\D','','g'); if d like '00%' then d:=substr(d,3); elsif d like '0%' then d:='421'||substr(d,2); end if; lg:=d||'@tel.ernte.sk'; end if;
  insert into staff(email,name,role) values(lg,name_in,role_in) on conflict(email) do update set name=excluded.name, role=excluded.role;
  select id into uid from auth.users where lower(email)=lg limit 1;
  if uid is null then
    uid:=gen_random_uuid();
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
    values('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',lg,extensions.crypt(pw,extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),'','','','');
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values(gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',lg,'email_verified',true),'email',now(),now(),now());
  else
    update auth.users set encrypted_password=extensions.crypt(pw,extensions.gen_salt('bf')),email_confirmed_at=coalesce(email_confirmed_at,now()),updated_at=now() where id=uid;
  end if;
  return lg;
end $$;
revoke all on function public.set_staff_login(text,text,text,text) from public, anon;
grant execute on function public.set_staff_login(text,text,text,text) to authenticated;
create or replace function public.remove_staff(login_in text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_owner() then raise exception 'Iba majiteľ.'; end if; delete from staff where lower(email)=lower(login_in) and role<>'owner'; end $$;
grant execute on function public.remove_staff(text) to authenticated;

select public.cmd_sync();
