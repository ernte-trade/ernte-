-- ERNTE Farmár – databáza a prístupové pravidlá
-- Spustiť raz v Supabase: SQL Editor → New query → vložiť celé → Run.
-- Farmár vidí iba svoje údaje (podľa e-mailu, ktorým sa prihlási).
-- ERNTE (tabuľka staff) vidí a mení všetko.

create extension if not exists pgcrypto;

-- ---------- tabuľky ----------
create table if not exists staff(
  email text primary key,
  name  text not null,
  role  text not null default 'admin' check (role in ('owner','admin','dispatch','invoice'))
);

create table if not exists farmers(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  phone text, addr text, ico text, dic text, icdph text, iban text,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists prices(
  com text primary key,
  price numeric(10,2),
  updated_at timestamptz not null default now()
);

create table if not exists settings(
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

create table if not exists deals(
  id uuid primary key default gen_random_uuid(),
  no text unique not null,
  farmer_id uuid not null references farmers(id) on delete restrict,
  com text not null,
  tons numeric(12,2) not null,
  price numeric(10,2) not null,
  term text, note text,
  status text not null default 'navrh' check (status in ('navrh','podpisany','odvoz','odvezeny','fakturacia','zaplateny','zruseny')),
  delivered_t numeric(12,2) not null default 0,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists requests(
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references farmers(id) on delete cascade,
  kind text not null check (kind in ('sell','transport','agree','message')),
  com text, tons numeric(12,2), price numeric(10,2),
  deal_id uuid references deals(id) on delete set null,
  pickup_date date, pickup_time text, trucks int, place text,
  note text,
  status text not null default 'nova' check (status in ('nova','vybavena','zamietnuta')),
  reply text,
  handled_by text, handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists requests_farmer on requests(farmer_id, created_at desc);
create index if not exists deals_farmer on deals(farmer_id, created_at desc);

-- ---------- kto je kto ----------
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from staff where lower(email) = lower(coalesce(auth.jwt()->>'email','')));
$$;

create or replace function public.my_farmer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from farmers where active and lower(email) = lower(coalesce(auth.jwt()->>'email','')) limit 1;
$$;

-- farmár môže meniť iba poznámku/status? nie – iba vkladať požiadavky; obchody mení len ERNTE
alter table staff    enable row level security;
alter table farmers  enable row level security;
alter table prices   enable row level security;
alter table settings enable row level security;
alter table deals    enable row level security;
alter table requests enable row level security;

drop policy if exists staff_read on staff;
create policy staff_read on staff for select using (is_staff());

drop policy if exists farmers_read on farmers;
create policy farmers_read on farmers for select using (is_staff() or id = my_farmer_id());
drop policy if exists farmers_write on farmers;
create policy farmers_write on farmers for all using (is_staff()) with check (is_staff());

drop policy if exists prices_read on prices;
create policy prices_read on prices for select using (is_staff() or my_farmer_id() is not null);
drop policy if exists prices_write on prices;
create policy prices_write on prices for all using (is_staff()) with check (is_staff());

drop policy if exists settings_read on settings;
create policy settings_read on settings for select using (is_staff() or my_farmer_id() is not null);
drop policy if exists settings_write on settings;
create policy settings_write on settings for all using (is_staff()) with check (is_staff());

drop policy if exists deals_read on deals;
create policy deals_read on deals for select using (is_staff() or farmer_id = my_farmer_id());
drop policy if exists deals_write on deals;
create policy deals_write on deals for all using (is_staff()) with check (is_staff());

drop policy if exists requests_read on requests;
create policy requests_read on requests for select using (is_staff() or farmer_id = my_farmer_id());
drop policy if exists requests_farmer_insert on requests;
create policy requests_farmer_insert on requests for insert
  with check (is_staff() or (farmer_id = my_farmer_id() and status = 'nova' and handled_by is null and reply is null));
drop policy if exists requests_staff_update on requests;
create policy requests_staff_update on requests for update using (is_staff()) with check (is_staff());
drop policy if exists requests_staff_delete on requests;
create policy requests_staff_delete on requests for delete using (is_staff());

-- živé upozornenia pre ERNTE na nové požiadavky
do $$ begin
  alter publication supabase_realtime add table requests;
exception when others then null; end $$;

-- ---------- ERNTE ľudia ----------
insert into staff(email,name,role) values
  ('ernte@ernte.sk','Vaľko','owner'),
  ('meno@example.sk','Ján Novák','admin'),
  ('meno@example.sk','ERNTE spol','admin'),
  ('jana.valkova@ernte.sk','Jana Valková','invoice')
on conflict (email) do nothing;

insert into settings(key,value) values
  ('pricelist','{"valid":""}'),
  ('contact','{"name":"Ernte spol. s r. o.","phone":"+421 918 449 991","email":"jana.valkova@ernte.sk","addr":"Zbudza 141, 072 23"}')
on conflict (key) do nothing;
