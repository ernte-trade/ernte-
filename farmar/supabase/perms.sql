-- ===== PRÍSTUPY (oprávnenia) zamestnancov a farmárov · nastavuje iba majiteľ =====
alter table staff add column if not exists title text, add column if not exists region text, add column if not exists phone text,
  add column if not exists perms jsonb not null default '{}'::jsonb, add column if not exists must_change boolean not null default false, add column if not exists pin_at timestamptz;
alter table farmers add column if not exists perms jsonb not null default '{}'::jsonb, add column if not exists must_change boolean not null default false, add column if not exists pin_at timestamptz;
alter table trips add column if not exists gps_farmer boolean not null default false;
do $$ begin if not exists(select 1 from ai_state where key='perms_gps_init') then
  update trips set gps_farmer=true where status in ('naplanovana','na_ceste','nakladka');
  insert into ai_state(key,value) values('perms_gps_init',jsonb_build_object('at',now())); end if; end $$;

-- predvolené prístupy podľa roly (keď majiteľ nič nezaškrtol)
create or replace function public.perm_def(r text) returns text[] language sql immutable as $$
  select case r
    when 'admin' then array['req','price_view','price_edit','deals','farm','farm_login','calc','market','trans','remain','notes','wx','big']
    when 'dispatch' then array['req','trans','deals_qty','farm','assign','farmer_gps','remain','notes','fleet','drivers','alarms','cams','yard','diesel','fleet_set','wx','big']
    when 'invoice' then array['req','price_view','deals','farm','trans','remain','wx']
    else array[]::text[] end $$;
-- len majiteľ: marža, zisk, predajné ceny, mzdy, pevné náklady, ERNTE AI, tím a prístupy
create or replace function public.perm_locked(k text) returns boolean language sql immutable as $$ select k in ('margin','payroll','ai','team','costs') $$;
create or replace function public.has_perm(k text) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select case when s.role='owner' then true when perm_locked(k) then false
      else coalesce((s.perms->>k)::boolean, k=any(perm_def(s.role))) end
    from staff s where lower(s.email)=lower(coalesce(auth.jwt()->>'email','')) limit 1),false) $$;
create or replace function public.fperm_def() returns text[] language sql immutable as $$
  select array['f_prices','f_sell','f_deals','f_remain','f_trucks','f_gps','f_transport','f_wx','f_big'] $$;
create or replace function public.fperm(k text) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select coalesce((f.perms->>k)::boolean,(select (value->>k)::boolean from settings where key='farmer_perms'),k=any(fperm_def()))
    from farmers f where f.id=my_farmer_id()),false) $$;
grant execute on function public.has_perm(text), public.fperm(text), public.perm_def(text), public.fperm_def(), public.perm_locked(text) to authenticated;

-- flotila podľa prístupu (doteraz len majiteľ a doprava)
create or replace function public.is_fleet() returns boolean language sql stable security definer set search_path=public as $$
  select is_staff() and has_perm('fleet') $$;

-- ceny, obchody, jazdy – ochrana údajov aj v databáze
drop policy if exists prices_read on prices;
create policy prices_read on prices for select using ((is_staff() and (has_perm('price_view') or has_perm('price_edit') or has_perm('deals') or has_perm('calc'))) or (my_farmer_id() is not null and fperm('f_prices')));
drop policy if exists prices_write on prices;
create policy prices_write on prices for all using (has_perm('price_edit')) with check (has_perm('price_edit'));
drop policy if exists settings_write on settings;
create policy settings_write on settings for all using (has_perm('price_edit')) with check (has_perm('price_edit'));
drop policy if exists deals_read on deals;
create policy deals_read on deals for select using ((is_staff() and has_perm('deals')) or (farmer_id=my_farmer_id() and (fperm('f_deals') or fperm('f_remain'))));
drop policy if exists deals_write on deals;
create policy deals_write on deals for all using (is_staff() and has_perm('deals')) with check (is_staff() and has_perm('deals'));
drop policy if exists trips_read on trips;
create policy trips_read on trips for select using (is_staff() or (farmer_id=my_farmer_id() and fperm('f_trucks')));
drop policy if exists trips_write on trips;
create policy trips_write on trips for all using (is_staff() and (has_perm('trans') or has_perm('assign'))) with check (is_staff() and (has_perm('trans') or has_perm('assign')));

-- obchody pre dopravu BEZ CIEN: množstvá, vyvezené, zostatok, nakládka, vykládka
create or replace function public.ops_deals() returns table(id uuid, no text, farmer_id uuid, farmer text, phone text, addr text, com text, tons numeric, delivered_t numeric, left_t numeric,
  status text, term text, note text, created_at timestamptz, load_place text, dests text, trips_n int, last_trip date)
language sql stable security definer set search_path=public as $$
  select d.id,d.no,d.farmer_id,f.name,f.phone,f.addr,d.com,d.tons,d.delivered_t,greatest(0,d.tons-d.delivered_t),d.status,d.term,d.note,d.created_at,
    coalesce((select r.place from requests r where r.deal_id=d.id and r.kind='transport' and coalesce(r.place,'')<>'' order by r.created_at desc limit 1),f.addr),
    (select string_agg(distinct tr.dest,', ') from trips t join trip_route tr on tr.trip_id=t.id where t.deal_id=d.id and coalesce(tr.dest,'')<>''),
    (select count(*)::int from trips t where t.deal_id=d.id and t.status<>'zrusena'),(select max(t.day) from trips t where t.deal_id=d.id and t.status<>'zrusena')
  from deals d join farmers f on f.id=d.farmer_id
  where is_staff() and (has_perm('deals_qty') or has_perm('deals') or has_perm('remain')) and d.status<>'zruseny'
  order by (d.status in ('podpisany','odvoz')) desc, d.created_at desc $$;
revoke all on function public.ops_deals() from public, anon; grant execute on function public.ops_deals() to authenticated;

-- poznámky k vývozu a nedodanému tovaru (od dopravy, obchodníka aj farmára)
create table if not exists deal_notes(id bigserial primary key, deal_id uuid references deals(id) on delete cascade, farmer_id uuid references farmers(id) on delete cascade,
  kind text not null default 'vyvoz' check (kind in ('vyvoz','nedodane','farmar','obchodnik')), body text not null check (length(body) between 1 and 2000), tons numeric,
  for_farmer boolean not null default false, author text default (auth.jwt()->>'email'), author_name text, created_at timestamptz not null default now());
create index if not exists deal_notes_deal on deal_notes(deal_id, created_at desc);
alter table deal_notes enable row level security;
drop policy if exists dn_read on deal_notes; create policy dn_read on deal_notes for select using ((is_staff() and has_perm('notes')) or (farmer_id=my_farmer_id() and (for_farmer or kind='farmar') and fperm('f_notes')));
drop policy if exists dn_ins on deal_notes; create policy dn_ins on deal_notes for insert with check ((is_staff() and has_perm('notes') and kind<>'farmar') or (farmer_id=my_farmer_id() and kind='farmar' and fperm('f_notes')));
drop policy if exists dn_del on deal_notes; create policy dn_del on deal_notes for delete using (is_owner() or lower(author)=lower(coalesce(auth.jwt()->>'email','')));
grant select, insert, delete on deal_notes to authenticated; grant usage on sequence deal_notes_id_seq to authenticated;

-- GPS auta pre farmára len keď ho doprava zapne pri jazde a farmár má prístup
create or replace function public.my_truck_positions() returns table(trip_id uuid, spz text, lat numeric, lon numeric, at timestamptz, speed int)
language sql stable security definer set search_path=public as $$
  select t.id,t.spz,k.gps_lat,k.gps_lon,k.gps_at,k.gps_speed from trips t join trucks k on k.no=t.truck_no
   where t.farmer_id=my_farmer_id() and fperm('f_gps') and t.gps_farmer and t.status in ('naplanovana','na_ceste','nakladka')
     and t.day between current_date-1 and current_date+1 and k.gps_at>now()-interval '3 hours' $$;
revoke all on function public.my_truck_positions() from public, anon; grant execute on function public.my_truck_positions() to authenticated;
create or replace function public.trip_gps(tid uuid, val boolean) returns boolean language plpgsql security definer set search_path=public as $$
begin if not (is_staff() and (has_perm('farmer_gps') or has_perm('assign'))) then raise exception 'Nemáte prístup.'; end if;
  update trips set gps_farmer=val, updated_at=now() where id=tid; return val; end $$;
revoke all on function public.trip_gps(uuid,boolean) from public, anon; grant execute on function public.trip_gps(uuid,boolean) to authenticated;

-- majiteľ: profil a prístupy zamestnanca / farmára
create or replace function public.set_staff_profile(em text, p jsonb, t text, r text, ph text) returns text language plpgsql security definer set search_path=public as $$
begin if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  update staff set perms=coalesce(p,perms), title=nullif(trim(t),''), region=nullif(trim(r),''), phone=coalesce(nullif(trim(ph),''),phone) where lower(email)=lower(em) and role<>'owner';
  return 'ok'; end $$;
create or replace function public.set_farmer_perms(fid uuid, p jsonb) returns text language plpgsql security definer set search_path=public as $$
begin if not is_owner() then raise exception 'Iba majiteľ.'; end if; update farmers set perms=coalesce(p,'{}'::jsonb) where id=fid; return 'ok'; end $$;
create or replace function public.set_farmer_perm_def(p jsonb) returns text language plpgsql security definer set search_path=public as $$
begin if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  insert into settings(key,value) values('farmer_perms',coalesce(p,'{}'::jsonb)) on conflict(key) do update set value=excluded.value; return 'ok'; end $$;
revoke all on function public.set_staff_profile(text,jsonb,text,text,text), public.set_farmer_perms(uuid,jsonb), public.set_farmer_perm_def(jsonb) from public, anon;
grant execute on function public.set_staff_profile(text,jsonb,text,text,text), public.set_farmer_perms(uuid,jsonb), public.set_farmer_perm_def(jsonb) to authenticated;

-- po prihlásení s kódom od ERNTE si každý nastaví vlastný PIN
create or replace function public.pin_done() returns text language plpgsql security definer set search_path=public as $$
begin
  update staff set must_change=false, pin_at=now() where lower(email)=lower(coalesce(auth.jwt()->>'email',''));
  update farmers set must_change=false, pin_at=now() where id=my_farmer_id();
  return 'ok'; end $$;
revoke all on function public.pin_done() from public, anon; grant execute on function public.pin_done() to authenticated;
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
  update staff set must_change=true where lower(email)=lg;
  return lg;
end $$;

create or replace function public.set_farmer_password(fid uuid, pw text, use_phone boolean default false) returns text
language plpgsql security definer set search_path=public, auth, extensions as $$
declare f farmers; lg text; d text; uid uuid;
begin
  if not (is_staff() and has_perm('farm_login')) then raise exception 'Nemáte oprávnenie.'; end if;
  if length(coalesce(pw,''))<8 then raise exception 'Heslo musí mať aspoň 8 znakov.'; end if;
  select * into f from farmers where id=fid;
  if not found then raise exception 'Farmár neexistuje.'; end if;
  if use_phone or f.email is null then
    if f.phone is null then raise exception 'Farmár nemá e-mail ani telefón.'; end if;
    d := regexp_replace(f.phone,'\D','','g');
    if d like '00%' then d := substr(d,3); elsif d like '0%' then d := '421'||substr(d,2); end if;
    lg := d||'@tel.ernte.sk';
  else
    lg := lower(trim(f.email));
  end if;
  select id into uid from auth.users where lower(email)=lg limit 1;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
    values('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',lg,extensions.crypt(pw,extensions.gen_salt('bf')),now(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),'','','','');
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values(gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',lg,'email_verified',true),'email',now(),now(),now());
  else
    update auth.users set encrypted_password=extensions.crypt(pw,extensions.gen_salt('bf')),email_confirmed_at=coalesce(email_confirmed_at,now()),updated_at=now() where id=uid;
  end if;
  update farmers set login=lg, active=true, must_change=true where id=fid;
  return lg;
end $$;

revoke all on function public.set_staff_login(text,text,text,text) from public, anon; grant execute on function public.set_staff_login(text,text,text,text) to authenticated;
revoke all on function public.set_farmer_password(uuid,text,boolean) from public, anon; grant execute on function public.set_farmer_password(uuid,text,boolean) to authenticated;

-- tím podľa majiteľa (26. 10. 2026)
update staff set role='dispatch', title='vedúci dopravy', region='flotila Región',
  perms='{"req":true,"trans":true,"deals_qty":true,"farm":true,"assign":true,"farmer_gps":true,"remain":true,"notes":true,"fleet":true,"drivers":true,"alarms":true,"cams":true,"yard":true,"diesel":true,"fleet_set":true,"wx":true,"big":true,"price_view":false,"price_edit":false,"deals":false,"calc":false,"market":false,"fleet_all":false,"fleet_cost":false,"farm_login":false}'::jsonb
 where role<>'owner' and name ilike '%gabriel%' and (name ilike '%Dispečer' or name ilike '%Dispečer');
update staff set role='admin', title='manažér obchodu · šéf krmovín', region='Košický a Prešovský kraj',
  perms='{"req":true,"price_view":true,"price_edit":true,"deals":true,"farm":true,"farm_login":true,"calc":true,"market":true,"trans":true,"remain":true,"notes":true,"wx":true,"big":true}'::jsonb
 where role<>'owner' and name ilike '%Manažér';
update staff set title='obchodník', region='Prešovský kraj' where role<>'owner' and name ilike '%Obchodník';
update staff set title='obchodník', region='Košický kraj' where role<>'owner' and (name ilike '%Obchodník' or name ilike '%Obchodník');
