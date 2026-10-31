-- ===== KAMERY DVOR (Tapo) =====
-- Zariadenie na dvore (Raspberry Pi / PC) sa pripája IBA VON cez HTTPS (funguje aj za SIM routerom bez verejnej IP).
-- Heslá kamier zostávajú len na zariadení. Do databázy ide iba token (uložený ako SHA-256) a zábery.
create table if not exists cams(id int primary key check (id between 1 and 16), name text not null, active boolean not null default true,
  ok boolean, err text, seen_at timestamptz);
create table if not exists cam_live(cam int primary key references cams(id) on delete cascade, at timestamptz not null, img text not null);
create table if not exists cam_req(id bigserial primary key, at timestamptz not null, kind text not null default 'manual',
  event_id bigint, yard_fuel_id bigint, note text, done_at timestamptz, created_at timestamptz not null default now());
create index if not exists cam_req_open on cam_req(created_at) where done_at is null;
create table if not exists cam_snaps(id bigserial primary key, cam int not null, at timestamptz not null, kind text not null default 'manual',
  req_id bigint references cam_req(id) on delete set null, event_id bigint, img text not null, created_at timestamptz not null default now());
create index if not exists cam_snaps_ev on cam_snaps(event_id) where event_id is not null;
create index if not exists cam_snaps_at on cam_snaps(at desc);

alter table cams enable row level security; alter table cam_live enable row level security;
alter table cam_req enable row level security; alter table cam_snaps enable row level security;
drop policy if exists cams_r on cams; create policy cams_r on cams for select using (is_fleet());
drop policy if exists cams_u on cams; create policy cams_u on cams for update using (is_owner()) with check (is_owner());
drop policy if exists caml_r on cam_live; create policy caml_r on cam_live for select using (is_fleet());
drop policy if exists camr_r on cam_req; create policy camr_r on cam_req for select using (is_fleet());
drop policy if exists cams_sr on cam_snaps; create policy cams_sr on cam_snaps for select using (is_fleet());
insert into cams(id,name) select g,'Kamera '||g from generate_series(1,6) g on conflict do nothing;

create or replace function public.cam_tok_ok(tok text) returns boolean language sql stable security definer set search_path=public,extensions as $$
  select coalesce(length(tok)>=20 and encode(extensions.digest(tok,'sha256'),'hex')=(select value->>'h' from ai_state where key='cam_token'),false) $$;
revoke all on function public.cam_tok_ok(text) from public, anon, authenticated;

-- Majiteľ: vytvor nový token pre zariadenie (starý prestane platiť). Plný token sa ukáže len raz.
create or replace function public.cam_setup() returns text language plpgsql security definer set search_path=public,extensions as $$
declare t text;
begin
  if not is_owner() then raise exception 'len majiteľ'; end if;
  t:='cam-'||encode(extensions.gen_random_bytes(18),'hex');
  insert into ai_state(key,value) values('cam_token',jsonb_build_object('h',encode(extensions.digest(t,'sha256'),'hex'),'at',now()))
   on conflict(key) do update set value=excluded.value;
  return t;
end $$;
revoke all on function public.cam_setup() from public, anon; grant execute on function public.cam_setup() to authenticated;

-- Zariadenie: hlásenie stavu + čo má urobiť (živý náhľad, zábery k udalostiam)
create or replace function public.cam_poll(tok text, info jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare w timestamptz; r jsonb; c jsonb;
begin
  if not cam_tok_ok(tok) then raise exception 'zlý token'; end if;
  insert into ai_state(key,value) values('cam_device',coalesce(info,'{}')||jsonb_build_object('seen',now()))
   on conflict(key) do update set value=excluded.value;
  for c in select * from jsonb_array_elements(coalesce(info->'cams','[]')) loop
    insert into cams(id,name) values((c->>'id')::int,coalesce(nullif(c->>'name',''),'Kamera '||(c->>'id'))) on conflict(id) do update
      set name=case when cams.name ~ '^Kamera [0-9]+$' then coalesce(nullif(excluded.name,''),cams.name) else cams.name end;
    update cams set ok=(c->>'ok')::boolean, err=left(c->>'err',200), seen_at=now() where id=(c->>'id')::int;
  end loop;
  select (value->>'until')::timestamptz into w from ai_state where key='cam_watch';
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'at',at,'kind',kind) order by id),'[]') into r
    from (select * from cam_req where done_at is null and created_at>now()-interval '3 days' order by id limit 20) q;
  update cam_req set done_at=now() where done_at is null and created_at<now()-interval '3 days';
  return jsonb_build_object('watch',coalesce(w>now(),false),'req',r,'cams',(select coalesce(jsonb_agg(id order by id),'[]') from cams where active));
end $$;
revoke all on function public.cam_poll(text,jsonb) from public; grant execute on function public.cam_poll(text,jsonb) to anon, authenticated;

-- Zariadenie: nahraj záber (base64 JPEG). req_id null = živý náhľad.
create or replace function public.cam_put(tok text, cam int, at timestamptz, img text, req_id bigint default null) returns text language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare q cam_req;
begin
  if not cam_tok_ok(tok) then raise exception 'zlý token'; end if;
  if length(img)>700000 or img !~ '^/9j/' then raise exception 'záber musí byť JPEG do 500 kB'; end if;
  if not exists(select 1 from cams c where c.id=cam_put.cam) then insert into cams(id,name) values(cam_put.cam,'Kamera '||cam_put.cam); end if;
  if req_id is null then
    insert into cam_live(cam,at,img) values(cam_put.cam,cam_put.at,cam_put.img) on conflict(cam) do update set at=excluded.at, img=excluded.img;
  else
    select * into q from cam_req r where r.id=cam_put.req_id; if q.id is null then return 'nie je požiadavka'; end if;
    insert into cam_snaps(cam,at,kind,req_id,event_id,img) values(cam_put.cam,cam_put.at,q.kind,q.id,q.event_id,cam_put.img);
  end if;
  return 'ok';
end $$;
revoke all on function public.cam_put(text,int,timestamptz,text,bigint) from public; grant execute on function public.cam_put(text,int,timestamptz,text,bigint) to anon, authenticated;

create or replace function public.cam_done(tok text, req_id bigint, note text default null) returns text language plpgsql security definer set search_path=public as $$
begin
  if not cam_tok_ok(tok) then raise exception 'zlý token'; end if;
  update cam_req set done_at=now(), note=coalesce(cam_done.note,cam_req.note) where id=req_id; return 'ok';
end $$;
revoke all on function public.cam_done(text,bigint,text) from public; grant execute on function public.cam_done(text,bigint,text) to anon, authenticated;

-- Aplikácia: zapni živý náhľad na 2 min / urob záber teraz
create or replace function public.cam_watch() returns text language plpgsql security definer set search_path=public as $$
begin
  if not is_fleet() then raise exception 'bez prístupu'; end if;
  insert into ai_state(key,value) values('cam_watch',jsonb_build_object('until',now()+interval '2 min'))
   on conflict(key) do update set value=excluded.value; return 'ok';
end $$;
revoke all on function public.cam_watch() from public, anon; grant execute on function public.cam_watch() to authenticated;
create or replace function public.cam_shot(note text default null) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint;
begin
  if not is_fleet() then raise exception 'bez prístupu'; end if;
  insert into cam_req(at,kind,note) values(now(),'manual',note) returning id into i; return i;
end $$;
revoke all on function public.cam_shot(text) from public, anon; grant execute on function public.cam_shot(text) to authenticated;
create or replace function public.cam_status() returns jsonb language sql stable security definer set search_path=public as $$
  select case when is_fleet() then jsonb_build_object('token',exists(select 1 from ai_state where key='cam_token'),
    'device',(select value from ai_state where key='cam_device'),
    'open',(select count(*) from cam_req where done_at is null),
    'snaps7',(select count(*) from cam_snaps where at>now()-interval '7 days')) end $$;
revoke all on function public.cam_status() from public, anon; grant execute on function public.cam_status() to authenticated;

-- Automatické zábery: príjazd/odjazd na dvor, udalosti nafty na dvore, výdaj nafty z nádrže na dvore
create or replace function public.cam_ev_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.at>now()-interval '47 hours' and exists(select 1 from ai_state where key='cam_token')
     and (new.kind in ('yard_in','yard_out') or (new.kind in ('in','out','fuel_drop','refuel_gap','fuel_transfer') and coalesce(new.place_kind,'')='yard')) then
    insert into cam_req(at,kind,event_id,note) values(new.at,new.kind,new.id,trim(coalesce(new.plate,'')||' '||coalesce(new.driver,'')));
  end if;
  return new;
end $$;
drop trigger if exists cam_ev on fleet_events;
create trigger cam_ev after insert on fleet_events for each row execute function cam_ev_trg();
create or replace function public.cam_yf_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.kind='vydaj' and new.day>=current_date-1 and exists(select 1 from ai_state where key='cam_token') then
    insert into cam_req(at,kind,yard_fuel_id,note) values(now(),'vydaj',new.id,trim(coalesce(new.plate,'')||' '||coalesce(new.driver,'')||' '||new.liters||' l'));
  end if;
  return new;
end $$;
drop trigger if exists cam_yf on yard_fuel;
create trigger cam_yf after insert on yard_fuel for each row execute function cam_yf_trg();

-- Udržiavanie: zábery 90 dní (dôkazy k porušeniam s udalosťou 1 rok), živé náhľady 1 deň
create or replace function public.cam_clean() returns text language plpgsql security definer set search_path=public as $$
declare a int; b int;
begin
  delete from cam_snaps where (event_id is null and at<now()-interval '90 days') or at<now()-interval '365 days'; get diagnostics a=row_count;
  delete from cam_req where created_at<now()-interval '365 days' and not exists(select 1 from cam_snaps s where s.req_id=cam_req.id); get diagnostics b=row_count;
  delete from cam_live where at<now()-interval '1 day';
  return a||' záberov, '||b||' požiadaviek zmazaných';
end $$;
revoke all on function public.cam_clean() from public, anon, authenticated;
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='kamery-udrzba';
  perform cron.schedule('kamery-udrzba','17 3 * * *','select public.cam_clean()');
exception when others then null; end $$;
