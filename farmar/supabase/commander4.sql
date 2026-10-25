-- ERNTE – Commander: ŠPZ a názvy pre vozidlá, ktoré posielajú polohu, ale nie sú v hromadnom zozname vozidiel
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
        -- jedno vozidlo (vehicles/{id}) spracuj ako zoznam s jedným vozidlom
        if r.kind='vehicle1' then j:=jsonb_build_object('vehicles',jsonb_build_array(coalesce(j->'vehicle',j))); end if;
        if r.kind in ('vehicles','deleted','vehicle1') then
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
    -- vozidlá, ktoré posielajú polohu, ale nie sú v hromadnom zozname: dopýtaj každé zvlášť (5 na beh, každé raz za 6 h)
    for v in select c.id from cmd_vehicles c where coalesce(c.acc,'main')=ac and c.name is null and not coalesce(c.deleted,false)
              and not exists(select 1 from cmd_log l where l.kind='vehicle1' and l.url=base||'vehicles/'||c.id and l.at>now()-interval '6 hours') limit 5 loop
      perform cmd_get(ac,'vehicle1',base||'vehicles/'||v.id,a);
    end loop;
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
  -- ŠPZ z jázd pre vozidlá, ktoré ju zo zoznamu nemajú
  update cmd_vehicles c set plate=x.plate from (select distinct on (vehicle_id) vehicle_id, plate from rides
     where plate is not null and plate<>'' and vehicle_id in (select id from cmd_vehicles where plate is null) order by vehicle_id, start_at desc) x
   where x.vehicle_id=c.id and c.plate is null;
  if not any_acc then return 'chýbajú prihlasovacie údaje'; end if;
  begin perform yard_check(); exception when others then null; end;
  return 'ok, spracovaných polôh: '||n||', jázd v databáze: '||(select count(*) from rides);
end $$;
revoke all on function public.cmd_sync() from public, anon, authenticated;

select public.cmd_sync();
select count(*) spolu, count(*) filter (where plate is null) bez_spz from cmd_vehicles where not coalesce(deleted,false);
