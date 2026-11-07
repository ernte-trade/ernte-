-- ERNTE – živá poloha áut VALKO z Commander API (každé 2 minúty, beží v databáze)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
alter table trucks add column if not exists cmd_id text;
alter table trucks add column if not exists gps_speed int;
alter table trucks add column if not exists gps_ign int;
create table if not exists cmd_log(id bigint primary key, kind text, at timestamptz not null default now(), done boolean not null default false, code int);
alter table cmd_log enable row level security;

create or replace function public.cmd_auth() returns text language sql security definer set search_path=public, vault as $$
  select 'Basic '||replace(encode(convert_to(decrypted_secret,'UTF8'),'base64'),E'\n','') from vault.decrypted_secrets where name='commander_basic' limit 1 $$;
revoke all on function public.cmd_auth() from public, anon, authenticated;

create or replace function public.cmd_sync() returns text language plpgsql security definer set search_path=public, extensions, net as $$
declare r record; j jsonb; p jsonb; n int:=0; a text; base text:='https://online.commander-systems.com/api/v1/';
begin
  a:=cmd_auth(); if a is null then return 'chýbajú prihlasovacie údaje'; end if;
  for r in select l.id,l.kind,h.status_code,h.content from cmd_log l join net._http_response h on h.id=l.id where not l.done loop
    if r.status_code=200 then
      begin
        j:=r.content::jsonb;
        if r.kind='vehicles' then
          for p in select * from jsonb_array_elements(coalesce(j->'vehicles','[]'::jsonb)) loop
            update trucks set cmd_id=p->>'vehicleId'
             where upper(regexp_replace(spz,'[^A-Za-z0-9]','','g'))=upper(regexp_replace(coalesce(p->>'vehicleRegistrationPlate',''),'[^A-Za-z0-9]','','g'));
          end loop;
        else
          for p in select * from jsonb_array_elements(coalesce(j->'positions','[]'::jsonb)) loop
            update trucks set gps_lat=nullif(replace(p->>'gpsLat',',','.'),'')::numeric, gps_lon=nullif(replace(p->>'gpsLon',',','.'),'')::numeric,
              gps_at=to_timestamp(nullif(p->>'gpsTime','')::bigint), gps_speed=nullif(p->>'gpsSpeed','')::numeric::int, gps_ign=nullif(p->>'carIgnition','')::numeric::int
             where cmd_id=p->>'vehicleId'; n:=n+1;
          end loop;
        end if;
      exception when others then null; end;
    end if;
    update cmd_log set done=true, code=r.status_code where id=r.id;
  end loop;
  delete from cmd_log where at < now()-interval '1 day';
  if exists(select 1 from trucks where cmd_id is null) and not exists(select 1 from cmd_log where kind='vehicles' and at>now()-interval '6 hours') then
    insert into cmd_log(id,kind) values(net.http_get(url:=base||'vehicles',headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'vehicles');
  end if;
  insert into cmd_log(id,kind) values(net.http_get(url:=base||'last-positions?limit=1000',headers:=jsonb_build_object('Authorization',a,'Accept','application/json')),'pos');
  return 'ok, spracovaných polôh: '||n;
end $$;
revoke all on function public.cmd_sync() from public, anon, authenticated;

-- farmár vidí polohu iba svojho auta, kým ide k nemu / nakladá (potom už nie – nevidí, kam sa vezie)
create or replace function public.my_truck_positions() returns table(trip_id uuid, spz text, lat numeric, lon numeric, at timestamptz, speed int)
language sql stable security definer set search_path=public as $$
  select t.id,t.spz,k.gps_lat,k.gps_lon,k.gps_at,k.gps_speed from trips t join trucks k on k.no=t.truck_no
   where t.farmer_id=my_farmer_id() and t.status in ('naplanovana','na_ceste','nakladka')
     and t.day between current_date-1 and current_date+1 and k.gps_at>now()-interval '3 hours' $$;
revoke all on function public.my_truck_positions() from public, anon;
grant execute on function public.my_truck_positions() to authenticated;

select cron.unschedule(jobid) from cron.job where jobname='commander-sync';
select cron.schedule('commander-sync','*/2 * * * *','select public.cmd_sync()');
select public.cmd_sync();
