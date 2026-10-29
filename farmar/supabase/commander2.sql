-- ERNTE – Commander naplno: všetko, čo dáva Commander API v1, a dve flotily VALKO
--   Región · sklápače (autá, ktoré už v aplikácii sú)  |  Flotila EU (ťahače)
-- Ťahá: vozidlá (VIN, model, rok, nádrž, teoretická spotreba, región, stredisko, typ), archivované vozidlá,
--   polohy (+ výška, smer, CAN rýchlosť, otáčky, plyn, celková spotreba, teploty, adresa), jazdy (+ ID vodiča,
--   motohodiny, prejazdy bodmi, poznámky, tankovania), vodiči (osobné číslo, čipy/karty), body a skupiny bodov,
--   strediská, zákazky, import tankovacích kariet, stav tachografu.
-- Druhé konto Commandera (ak sú ťahače EU pod iným prihlásením) = trezor 'commander_basic_eu'.
-- Spúšťa sa zo stránky commander-eu.html. Dá sa spustiť znova – nič nezmaže.

alter table cmd_log add column if not exists acc text not null default 'main';
alter table cmd_vehicles
  add column if not exists acc text default 'main', add column if not exists fleet text,
  add column if not exists vin text, add column if not exists deleted boolean, add column if not exists serial text,
  add column if not exists region text, add column if not exists cost_center text, add column if not exists model text,
  add column if not exists year text, add column if not exists commissioning text, add column if not exists fuel_type text,
  add column if not exists tank_cap numeric, add column if not exists object_type text, add column if not exists odo_type int,
  add column if not exists theo_cons numeric, add column if not exists cons_km numeric, add column if not exists default_driver text,
  add column if not exists info jsonb, add column if not exists alt numeric, add column if not exists azimut numeric,
  add column if not exists can_speed numeric, add column if not exists rpm numeric, add column if not exists throttle numeric,
  add column if not exists can_consumed numeric, add column if not exists temps jsonb, add column if not exists address text,
  add column if not exists tacho_km numeric, add column if not exists tacho_eh numeric, add column if not exists tacho_at timestamptz;
alter table rides
  add column if not exists acc text default 'main', add column if not exists driver_id text, add column if not exists eh_start numeric,
  add column if not exists waypoints jsonb, add column if not exists notes jsonb, add column if not exists refuels jsonb;

create table if not exists cmd_api(acc text not null, kind text not null, code int, n int, at timestamptz default now(), ok_at timestamptz, msg text, rl_limit int, rl_left int, primary key(acc,kind));
create table if not exists cmd_drivers(acc text not null, id text not null, name text, surname text, personal_number text, keys jsonb, cost_center text, updated_at timestamptz default now(), primary key(acc,id));
create table if not exists cmd_waypoints(acc text not null, id text not null, name text, polygon jsonb, updated_at timestamptz default now(), primary key(acc,id));
create table if not exists cmd_ref(acc text not null, kind text not null, id text not null, name text, data jsonb, updated_at timestamptz default now(), primary key(acc,kind,id));
create table if not exists cmd_refuel(acc text not null, at timestamptz not null, liters numeric not null, cost numeric, cost_vat numeric, ppl numeric, ppl_vat numeric, vat numeric,
  ident text not null default '', status int, object_id text, ride_id text, updated_at timestamptz default now(), primary key(acc,at,ident,liters));
do $$ declare t text; begin
  foreach t in array array['cmd_api','cmd_drivers','cmd_waypoints','cmd_ref','cmd_refuel'] loop
    execute format('alter table %I enable row level security',t);
    execute format('drop policy if exists %I on %I',t||'_read',t);
    execute format('create policy %I on %I for select using (is_fleet())',t||'_read',t);
  end loop; end $$;

-- flotila: auto zo zoznamu áut VALKO (Doprava) = Región · sklápače; druhé konto alebo nové auto = Flotila EU
create or replace function public.cmd_fleet_default(acc_in text, plate_in text, id_in text) returns text language sql stable security definer set search_path=public as $$
  select case when acc_in='eu' then 'eu'
    when exists(select 1 from trucks t where t.cmd_id=id_in or upper(regexp_replace(coalesce(t.spz,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(coalesce(plate_in,''),'[^A-Za-z0-9]','','g'))) then 'region'
    else 'eu' end $$;
-- prvé spustenie: autá, ktoré už v aplikácii sú, = Región · sklápače (ak ich je menej ako 28, sú to všetko sklápače)
do $$ declare nv int; begin
  if not exists(select 1 from fleet_cfg where key='fleet_init') then
    select count(*) into nv from cmd_vehicles;
    update cmd_vehicles v set fleet=case when nv<28 or cmd_fleet_default('main',v.plate,v.id)='region' then 'region' else 'eu' end where fleet is null;
    insert into fleet_cfg(key,value) values('fleet_init',jsonb_build_object('at',now(),'aut_pri_zapnuti',nv));
  end if; end $$;

create or replace function public.set_vehicle_fleet(vid text, fl text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if fl not in ('region','eu') then raise exception 'Neznáma flotila.'; end if;
  update cmd_vehicles set fleet=fl where id=vid;
end $$;
revoke all on function public.set_vehicle_fleet(text,text) from public, anon;
grant execute on function public.set_vehicle_fleet(text,text) to authenticated;

create or replace function public.cmd_auth_acc(acc_in text) returns text language sql security definer set search_path=public, vault as $$
  select 'Basic '||replace(encode(convert_to(decrypted_secret,'UTF8'),'base64'),E'\n','') from vault.decrypted_secrets
   where name=case when acc_in='eu' then 'commander_basic_eu' else 'commander_basic' end limit 1 $$;
revoke all on function public.cmd_auth_acc(text) from public, anon, authenticated;

create or replace function public.cmd_get(acc_in text, kind_in text, u text, a text) returns bigint language plpgsql security definer set search_path=public, extensions, net as $$
declare rq bigint; begin
  rq:=net.http_get(url:=u,headers:=jsonb_build_object('Authorization',a,'Accept','application/json'));
  insert into cmd_log(id,kind,url,acc) values(rq,kind_in,u,acc_in); return rq; end $$;
revoke all on function public.cmd_get(text,text,text,text) from public, anon, authenticated;

-- čo Commander vrátil: kód, počet záznamov, limit požiadaviek
create or replace function public.cmd_note(acc_in text, kind_in text, code_in int, n_in int, msg_in text, hdr jsonb) returns void language plpgsql security definer set search_path=public as $$
declare lim int; lft int; begin
  begin
    lim:=cmd_num(coalesce(hdr->>'X-RateLimit-Limit',hdr->>'x-ratelimit-limit'))::int; lft:=cmd_num(coalesce(hdr->>'X-RateLimit-Remaining',hdr->>'x-ratelimit-remaining'))::int;
  exception when others then null; end;
  insert into cmd_api as c(acc,kind,code,n,at,ok_at,msg,rl_limit,rl_left) values(acc_in,kind_in,code_in,n_in,now(),case when code_in=200 then now() end,msg_in,lim,lft)
   on conflict(acc,kind) do update set code=excluded.code, n=case when excluded.code=200 then excluded.n else c.n end, at=now(),
     ok_at=coalesce(excluded.ok_at,c.ok_at), msg=excluded.msg, rl_limit=coalesce(excluded.rl_limit,c.rl_limit), rl_left=coalesce(excluded.rl_left,c.rl_left);
end $$;
revoke all on function public.cmd_note(text,text,int,int,text,jsonb) from public, anon, authenticated;

create or replace function public.cmd_arr(j jsonb, k text) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(j)='array' then j when jsonb_typeof(j->k)='array' then j->k when jsonb_typeof(j->'data')='array' then j->'data' else '[]'::jsonb end $$;

create or replace function public.cmd_sync() returns text language plpgsql security definer set search_path=public, extensions, net as $$
declare r record; j jsonb; p jsonb; n int:=0; a text; ac text; base text:='https://online.commander-systems.com/api/v1/'; d date; e bigint; s bigint;
  pn int; gmax timestamptz; perr text; bu text; rq bigint; cnt int; tot int; pfx text; hot boolean; deny boolean; vid text; v record; any_acc boolean:=false;
begin
  -- 1) spracovanie odpovedí
  for r in select l.id,l.kind,l.url,l.acc,h.status_code,h.content,h.headers from cmd_log l join net._http_response h on h.id=l.id where not l.done loop
    a:=cmd_auth_acc(r.acc);
    if r.status_code=200 then
      begin
        j:=r.content::jsonb; cnt:=0;
        if r.kind in ('vehicles','deleted') then
          for p in select * from jsonb_array_elements(cmd_arr(j,'vehicles')) loop
            cnt:=cnt+1;
            if r.kind='deleted' or coalesce(p->>'deleted','0')='1' then
              insert into cmd_ref(acc,kind,id,name,data) values(r.acc,'deleted_vehicle',p->>'vehicleId',coalesce(p->>'vehicleRegistrationPlate',p->>'vehicleName'),p)
                on conflict(acc,kind,id) do update set name=excluded.name,data=excluded.data,updated_at=now();
              update cmd_vehicles set deleted=true where id=p->>'vehicleId';
              continue;
            end if;
            insert into cmd_vehicles(id,acc,fleet,name,plate,last_comm,vin,deleted,serial,region,cost_center,model,year,commissioning,fuel_type,tank_cap,object_type,odo_type,theo_cons,cons_km,default_driver,info)
            values(p->>'vehicleId',r.acc,cmd_fleet_default(r.acc,p->>'vehicleRegistrationPlate',p->>'vehicleId'),p->>'vehicleName',p->>'vehicleRegistrationPlate',
              to_timestamp(nullif(cmd_num(p->>'lastCommunication'),0)),nullif(p->>'vin',''),false,nullif(p->>'serial_number',''),nullif(p->>'region',''),nullif(p->>'costCenter',''),
              nullif(p->>'model',''),nullif(p->>'manufactureYear',''),nullif(p->>'commissioningDate',''),nullif(p->>'mainFuelType',''),nullif(cmd_num(p->>'fuelTankCapacity'),0),
              nullif(p->>'objectType',''),cmd_num(p->>'odometerType')::int,nullif(cmd_num(p->>'theoreticalConsumption'),0),nullif(cmd_num(p->>'combinedKmConsumption'),0),
              nullif(nullif(p->>'vehicleDefaultDriver',''),'0'),p)
            on conflict(id) do update set acc=excluded.acc,name=excluded.name,plate=excluded.plate,last_comm=coalesce(excluded.last_comm,cmd_vehicles.last_comm),vin=excluded.vin,deleted=false,
              serial=excluded.serial,region=excluded.region,cost_center=excluded.cost_center,model=excluded.model,year=excluded.year,commissioning=excluded.commissioning,fuel_type=excluded.fuel_type,
              tank_cap=excluded.tank_cap,object_type=excluded.object_type,odo_type=excluded.odo_type,theo_cons=excluded.theo_cons,cons_km=excluded.cons_km,default_driver=excluded.default_driver,
              info=excluded.info,fleet=coalesce(cmd_vehicles.fleet,excluded.fleet);
            update trucks set cmd_id=p->>'vehicleId'
             where upper(regexp_replace(spz,'[^A-Za-z0-9]','','g'))=upper(regexp_replace(coalesce(p->>'vehicleRegistrationPlate',''),'[^A-Za-z0-9]','','g'));
          end loop;
        elsif r.kind='pos' then
          -- každá poloha zvlášť: chyba jedného záznamu nezahodí ostatné
          pn:=0; gmax:=null; perr:=null;
          for p in select * from jsonb_array_elements(cmd_arr(j,'positions')) loop
            begin
              if coalesce(p->>'vehicleId','')<>'' then
                insert into cmd_vehicles(id,acc,fleet,lat,lon,gps_at,speed,ign,tank,odometer,engine_hours,voltage,alt,azimut,can_speed,rpm,throttle,can_consumed,temps,address,updated_at)
                  values(p->>'vehicleId',r.acc,cmd_fleet_default(r.acc,null,p->>'vehicleId'),cmd_num(p->>'gpsLat'),cmd_num(p->>'gpsLon'),to_timestamp(cmd_num(p->>'gpsTime')),cmd_num(p->>'gpsSpeed')::int,cmd_num(p->>'carIgnition')::int,
                    nullif(cmd_num(p->>'canTankValue'),0),nullif(cmd_num(p->>'canOdometer'),0),nullif(cmd_num(p->>'canEngineHours'),0),cmd_num(p->>'voltage'),
                    cmd_num(p->>'gpsLAlt'),cmd_num(p->>'gpsAzimut'),cmd_num(p->>'canSpeed'),cmd_num(p->>'canRpm'),cmd_num(p->>'canThrottle'),nullif(cmd_num(p->>'canConsumed'),0),
                    case when jsonb_typeof(p->'temperatures') in ('object','array') then p->'temperatures' end,nullif(p->>'address',''),now())
                  on conflict(id) do update set lat=coalesce(excluded.lat,cmd_vehicles.lat),lon=coalesce(excluded.lon,cmd_vehicles.lon),gps_at=coalesce(excluded.gps_at,cmd_vehicles.gps_at),speed=excluded.speed,ign=excluded.ign,
                    tank=coalesce(excluded.tank,cmd_vehicles.tank),odometer=coalesce(excluded.odometer,cmd_vehicles.odometer),engine_hours=coalesce(excluded.engine_hours,cmd_vehicles.engine_hours),voltage=excluded.voltage,
                    alt=excluded.alt,azimut=excluded.azimut,can_speed=excluded.can_speed,rpm=excluded.rpm,throttle=excluded.throttle,can_consumed=coalesce(excluded.can_consumed,cmd_vehicles.can_consumed),
                    temps=excluded.temps,address=coalesce(excluded.address,cmd_vehicles.address),acc=coalesce(cmd_vehicles.acc,excluded.acc),fleet=coalesce(cmd_vehicles.fleet,excluded.fleet),updated_at=now();
                update trucks set gps_lat=cmd_num(p->>'gpsLat'),gps_lon=cmd_num(p->>'gpsLon'),gps_at=to_timestamp(cmd_num(p->>'gpsTime')),gps_speed=cmd_num(p->>'gpsSpeed')::int,
                  gps_ign=cmd_num(p->>'carIgnition')::int,tank=coalesce(nullif(cmd_num(p->>'canTankValue'),0),tank),odometer=coalesce(nullif(cmd_num(p->>'canOdometer'),0),odometer)
                 where cmd_id=p->>'vehicleId';
                n:=n+1; pn:=pn+1; cnt:=cnt+1; gmax:=greatest(gmax,to_timestamp(cmd_num(p->>'gpsTime')));
              end if;
            exception when others then perr:=left(SQLERRM,250);
            end;
          end loop;
          update cmd_log set n=pn, gps_max=gmax where id=r.id;
          if r.acc='main' then
            if perr is not null then
              insert into check_err as c(fn,msg,at,n) values('cmd_sync_pos',perr,now(),pn) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(), n=excluded.n;
            else
              insert into check_err as c(fn,msg,ok_at,n) values('cmd_sync_pos',null,now(),pn) on conflict on constraint check_err_pkey do update set msg=null, ok_at=now(), n=excluded.n;
            end if;
          end if;
        elsif r.kind='rides' then
          for p in select * from jsonb_array_elements(cmd_arr(j,'rides')) loop
            cnt:=cnt+1;
            insert into rides(ride_id,vehicle_id,plate,driver,ride_type,start_at,stop_at,start_addr,stop_addr,lat_start,lon_start,lat_stop,lon_stop,distance,duration,avg_speed,max_speed,fuel_consumed,avg_cons,fuel_start,fuel_stop,odo_start,odo_stop,refuel_l,refuel_eur,note,
              acc,driver_id,eh_start,waypoints,notes,refuels)
            values(p->>'rideId',p->>'vehicleId',p->>'vehicleRegistrationPlate',p->>'driverName',p->>'rideType',to_timestamp(cmd_num(p->>'startTime')),to_timestamp(cmd_num(p->>'stopTime')),
              p->>'startAddress',p->>'stopAddress',cmd_num(p->>'latStart'),cmd_num(p->>'lonStart'),cmd_num(p->>'latStop'),cmd_num(p->>'lonStop'),cmd_num(p->>'distance'),cmd_num(p->>'duration')::int,cmd_num(p->>'avgSpeed'),cmd_num(p->>'maxSpeed')::int,
              nullif(cmd_num(p->>'fuelConsumed'),0),nullif(cmd_num(p->>'averageConsumption'),0),nullif(cmd_num(p->>'fuelLevelStart'),0),nullif(cmd_num(p->>'fuelLevelStop'),0),
              cmd_num(p->>'odometerStart'),cmd_num(p->>'odometerStop'),
              (select sum(cmd_num(x->>'volume')) from jsonb_array_elements(case when jsonb_typeof(p->'refueling')='array' then p->'refueling' else '[]'::jsonb end) x),
              (select sum(cmd_num(x->>'priceVatExc')) from jsonb_array_elements(case when jsonb_typeof(p->'refueling')='array' then p->'refueling' else '[]'::jsonb end) x),
              p->>'note',r.acc,nullif(nullif(p->>'driverId',''),'0'),nullif(cmd_num(p->>'engineHoursStart'),0),
              case when jsonb_typeof(p->'waypoints')='array' and jsonb_array_length(p->'waypoints')>0 then p->'waypoints' end,
              case when jsonb_typeof(p->'notes')='array' and jsonb_array_length(p->'notes')>0 then p->'notes' end,
              case when jsonb_typeof(p->'refueling')='array' and jsonb_array_length(p->'refueling')>0 then p->'refueling' end)
            on conflict(ride_id) do update set lat_start=excluded.lat_start,lon_start=excluded.lon_start,lat_stop=excluded.lat_stop,lon_stop=excluded.lon_stop,start_addr=excluded.start_addr,driver=excluded.driver,ride_type=excluded.ride_type,stop_at=excluded.stop_at,stop_addr=excluded.stop_addr,distance=excluded.distance,duration=excluded.duration,
              avg_speed=excluded.avg_speed,max_speed=excluded.max_speed,fuel_consumed=excluded.fuel_consumed,avg_cons=excluded.avg_cons,fuel_stop=excluded.fuel_stop,odo_stop=excluded.odo_stop,refuel_l=excluded.refuel_l,refuel_eur=excluded.refuel_eur,note=excluded.note,
              acc=excluded.acc,driver_id=excluded.driver_id,eh_start=excluded.eh_start,waypoints=excluded.waypoints,notes=excluded.notes,refuels=excluded.refuels;
          end loop;
        elsif r.kind='drivers' then
          for p in select * from jsonb_array_elements(cmd_arr(j,'drivers')) loop
            cnt:=cnt+1;
            insert into cmd_drivers(acc,id,name,surname,personal_number,keys,cost_center) values(r.acc,p->>'id',nullif(p->>'name',''),nullif(p->>'surname',''),nullif(p->>'personal_number',''),
              case when jsonb_typeof(p->'identification_keys')='array' then p->'identification_keys' end,nullif(p->>'cost_center_text',''))
              on conflict(acc,id) do update set name=excluded.name,surname=excluded.surname,personal_number=excluded.personal_number,keys=excluded.keys,cost_center=excluded.cost_center,updated_at=now();
          end loop;
        elsif r.kind='waypoints' then
          for p in select * from jsonb_array_elements(cmd_arr(j,'waypoints')) loop
            cnt:=cnt+1;
            insert into cmd_waypoints(acc,id,name,polygon) values(r.acc,p->>'waypointId',p->>'waypointName',p->'waypointPolygon')
              on conflict(acc,id) do update set name=excluded.name,polygon=excluded.polygon,updated_at=now();
          end loop;
        elsif r.kind in ('wgroups','costcenters','contracts') then
          for p in select * from jsonb_array_elements(cmd_arr(j,case r.kind when 'costcenters' then 'costCenters' when 'contracts' then 'contracts' else 'waypointGroups' end)) loop
            cnt:=cnt+1;
            insert into cmd_ref(acc,kind,id,name,data) values(r.acc,r.kind,coalesce(p->>'waypointGroupID',p->>'costCenterId',p->>'contractId',md5(p::text)),
              coalesce(p->>'waypointGroupName',p->>'costCenterName',p->>'contractName'),p)
              on conflict(acc,kind,id) do update set name=excluded.name,data=excluded.data,updated_at=now();
          end loop;
        elsif r.kind='refuel' then
          for p in select * from jsonb_array_elements(cmd_arr(j,'imports')) loop
            cnt:=cnt+1;
            insert into cmd_refuel(acc,at,liters,cost,cost_vat,ppl,ppl_vat,vat,ident,status,object_id,ride_id)
              values(r.acc,to_timestamp(cmd_num(p->>'importTime')),coalesce(cmd_num(p->>'importValue'),0),cmd_num(p->>'importCost'),cmd_num(p->>'importCostVat'),cmd_num(p->>'importCostPerLiter'),
                cmd_num(p->>'importCostPerLiterVat'),cmd_num(p->>'importVat'),coalesce(p->>'importObjectIdentifier',''),cmd_num(p->>'importStatus')::int,nullif(p->>'importObjectId',''),nullif(p->>'importRideId',''))
              on conflict(acc,at,ident,liters) do update set status=excluded.status,object_id=excluded.object_id,ride_id=excluded.ride_id,cost=excluded.cost,cost_vat=excluded.cost_vat,updated_at=now();
          end loop;
        elsif r.kind='tacho' then
          vid:=substring(r.url from 'currenttacho/([^/?]+)'); cnt:=1;
          update cmd_vehicles set tacho_km=nullif(cmd_num(j->'currentTacho'->>'km'),0),tacho_eh=nullif(cmd_num(j->'currentTacho'->>'engine_hours'),0),tacho_at=now() where id=vid;
        end if;
        tot:=coalesce(cmd_num(j->>'totalCount')::int,cnt);
        if r.kind<>'tacho' and (r.url is null or r.url !~ 'page=([2-9]|\d\d)') then perform cmd_note(r.acc,r.kind,200,tot,null,r.headers);
        elsif r.kind='tacho' then perform cmd_note(r.acc,'tacho',200,(select count(*) from cmd_vehicles where tacho_at is not null and acc=r.acc)::int,null,r.headers); end if;
        -- ďalšia strana (jazdy, polohy, vodiči, tankovania, strediská, zákazky)
        if cmd_num(j->>'totalPages')>cmd_num(j->>'page') and r.url ~ 'page=\d+' and a is not null then
          perform cmd_get(r.acc,r.kind,regexp_replace(r.url,'page=\d+','page='||(cmd_num(j->>'page')::int+1)),a);
        end if;
      exception when others then
        insert into check_err as c(fn,msg,at) values('cmd_sync_'||r.kind,left(SQLERRM,250),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now();
        perform cmd_note(r.acc,r.kind,-2,null,'spracovanie: '||left(SQLERRM,200),r.headers);
      end;
    else
      perform cmd_note(r.acc,r.kind,coalesce(r.status_code,-1),null,left(coalesce(r.content,''),200),r.headers);
    end if;
    update cmd_log set done=true, code=r.status_code where id=r.id;
    if r.kind='rides' then update cmd_log set code=coalesce(r.status_code,-1) where kind='backfill' and ref=r.id; end if;
  end loop;
  delete from cmd_log where at < now()-interval '3 days' and kind<>'backfill';

  -- 2) nové požiadavky – pre každé konto (hlavné + EU, ak je zadané)
  foreach ac in array array['main','eu'] loop
    a:=cmd_auth_acc(ac); continue when a is null; any_acc:=true;
    pfx:=case when ac='main' then '' else ac||':' end;
    hot:=exists(select 1 from cmd_api where acc=ac and code=429 and at>now()-interval '5 minutes');
    perform cmd_get(ac,'pos',base||'last-positions?limit=1000&page=1',a);
    -- jazdy: posledných 26 h každých 10 min (značka rides26, aby ju nezablokovalo načítavanie histórie)
    if not exists(select 1 from cmd_log where acc=ac and kind='rides26' and at>now()-interval '10 minutes') then
      e:=extract(epoch from now())::bigint; s:=e-26*3600;
      rq:=cmd_get(ac,'rides',base||'all-rides?datetimeStart='||s||'&datetimeEnd='||e||'&limit=1000&page=1',a);
      insert into cmd_log(id,kind,url,acc,done) values(-rq,'rides26',null,ac,true) on conflict(id) do nothing;
    end if;
    continue when hot;
    if not exists(select 1 from cmd_log where acc=ac and kind='vehicles' and at>now()-interval '6 hours') then perform cmd_get(ac,'vehicles',base||'vehicles',a); end if;
    if not exists(select 1 from cmd_log where acc=ac and kind='deleted' and at>now()-interval '24 hours') then perform cmd_get(ac,'deleted',base||'deletedVehicles',a); end if;
    if not exists(select 1 from cmd_log where acc=ac and kind='drivers' and at>now()-interval '12 hours') then perform cmd_get(ac,'drivers',base||'drivers?limit=200&page=1',a); end if;
    if not exists(select 1 from cmd_log where acc=ac and kind='waypoints' and at>now()-interval '24 hours') then perform cmd_get(ac,'waypoints',base||'waypoints',a); end if;
    if not exists(select 1 from cmd_log where acc=ac and kind='wgroups' and at>now()-interval '24 hours') then perform cmd_get(ac,'wgroups',base||'waypoint-groups',a); end if;
    if not exists(select 1 from cmd_log where acc=ac and kind='costcenters' and at>now()-interval '24 hours') then perform cmd_get(ac,'costcenters',base||'cost-centers?limit=100&page=1',a); end if;
    if not exists(select 1 from cmd_log where acc=ac and kind='contracts' and at>now()-interval '24 hours') then perform cmd_get(ac,'contracts',base||'contracts?limit=100&page=1',a); end if;
    if not exists(select 1 from cmd_log where acc=ac and kind='refuel' and at>now()-interval '6 hours') then
      perform cmd_get(ac,'refuel',base||'refueling-import?dateStart='||to_char(current_date-35,'YYYY-MM-DD')||'&dateEnd='||to_char(current_date,'YYYY-MM-DD')||'&filter=0&limit=100&page=1',a); end if;
    -- tachograf: 2 autá na beh, každé raz za ~20 h (ak Commander nepovolil, skúsi znova o deň)
    deny:=exists(select 1 from cmd_api where acc=ac and kind='tacho' and code in (401,403,404) and ok_at is null and at>now()-interval '24 hours'); -- bez práva u Commandera
    if not deny then
      for v in select id from cmd_vehicles c where coalesce(c.acc,'main')=ac and not coalesce(c.deleted,false) and (c.tacho_at is null or c.tacho_at<now()-interval '20 hours')
                and not exists(select 1 from cmd_log l where l.kind='tacho' and l.url=base||'currenttacho/'||c.id and l.at>now()-interval '20 hours') order by c.tacho_at nulls first limit 2 loop
        perform cmd_get(ac,'tacho',base||'currenttacho/'||v.id,a);
      end loop;
    end if;
    -- história jázd od 1. 7. 2026 (min. 60 dní) po dňoch; hlavné konto 6 dní na beh, EU 3; chyba → po 20 min znova (max 3×)
    for d in select g::date from generate_series(least(current_date-60,date '2026-07-01'),current_date-1,'1 day') g
              where not exists(select 1 from cmd_log b where b.kind='backfill' and b.url=pfx||g::date::text
                               and (b.ref is null or b.code=200 or coalesce(b.n,0)>=3 or b.at>now()-interval '20 minutes')) order by g desc limit case when ac='main' then 6 else 3 end loop
      s:=extract(epoch from d::timestamp at time zone 'Europe/Bratislava')::bigint; e:=s+86400;
      bu:=base||'all-rides?datetimeStart='||s||'&datetimeEnd='||e||'&limit=1000&page=1';
      rq:=cmd_get(ac,'rides',bu,a);
      insert into cmd_log(id,kind,url,done,ref,n,at,acc) values(-(extract(epoch from d)::bigint)-case when ac='main' then 0 else 100000000000 end,'backfill',pfx||d::text,true,rq,1,now(),ac)
        on conflict(id) do update set ref=excluded.ref, n=coalesce(cmd_log.n,0)+1, at=now(), code=null;
    end loop;
  end loop;
  if not any_acc then return 'chýbajú prihlasovacie údaje'; end if;
  begin perform yard_check(); exception when others then null; end;
  return 'ok, spracovaných polôh: '||n||', jázd v databáze: '||(select count(*) from rides);
end $$;
revoke all on function public.cmd_sync() from public, anon, authenticated;

-- prehľad pre aplikáciu a AI: čo všetko z Commandera ťaháme
create or replace function public.cmd_overview() returns jsonb language sql stable security definer set search_path=public as $$
  select case when not is_fleet() then null else jsonb_build_object(
    'konta',(select coalesce(jsonb_agg(x),'[]') from (select acc konto, exists(select 1 from vault.secrets where name=case when acc='eu' then 'commander_basic_eu' else 'commander_basic' end) zadane from unnest(array['main','eu']) acc) x),
    'api',(select coalesce(jsonb_agg(to_jsonb(c) order by c.acc,c.kind),'[]') from cmd_api c),
    'vozidla',(select jsonb_build_object('spolu',count(*) filter (where not coalesce(deleted,false)),'region',count(*) filter (where fleet='region' and not coalesce(deleted,false)),
       'eu',count(*) filter (where fleet='eu' and not coalesce(deleted,false)),'archivovane',(select count(*) from cmd_ref where kind='deleted_vehicle'),
       'podla_typu',(select coalesce(jsonb_object_agg(coalesce(t,'nezadaný'),k),'{}') from (select object_type t,count(*) k from cmd_vehicles where not coalesce(deleted,false) group by 1) q)) from cmd_vehicles),
    'vodici',(select count(*) from cmd_drivers),'body',(select count(*) from cmd_waypoints),
    'tankovanie_import_35_dni',(select jsonb_build_object('pocet',count(*),'litre',round(coalesce(sum(liters),0)),'eur_bez_dph',round(coalesce(sum(cost),0)),
       'nesparovane',count(*) filter (where status=2),'nesparovane_l',round(coalesce(sum(liters) filter (where status=2),0))) from cmd_refuel where at>now()-interval '35 days'),
    'jazdy_od',(select to_char(min(start_at) at time zone 'Europe/Bratislava','YYYY-MM-DD') from rides),
    'jazdy_spolu',(select count(*) from rides)) end $$;
revoke all on function public.cmd_overview() from public, anon;
grant execute on function public.cmd_overview() to authenticated;

select public.cmd_sync();
select 'ok' as hotovo;
