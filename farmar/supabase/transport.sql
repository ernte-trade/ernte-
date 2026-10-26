-- ERNTE Farmár – doprava VALKO (autá a jazdy)
create table if not exists trucks(
  no int primary key, spz text not null, driver text, phone text, trailer text, note text, active boolean not null default true,
  gps_lat numeric, gps_lon numeric, gps_at timestamptz);
create table if not exists trips(
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references farmers(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  request_id uuid references requests(id) on delete set null,
  truck_no int references trucks(no) on delete set null,
  spz text, driver text, driver_phone text,
  day date not null, time text,
  status text not null default 'naplanovana' check (status in ('naplanovana','na_ceste','nakladka','nalozene','vylozene','zrusena')),
  netto numeric(12,3), note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists trips_farmer on trips(farmer_id, day desc);
create index if not exists trips_day on trips(day);
alter table trucks enable row level security;
alter table trips enable row level security;
drop policy if exists trucks_staff on trucks;
create policy trucks_staff on trucks for all using (is_staff()) with check (is_staff());
drop policy if exists trips_read on trips;
create policy trips_read on trips for select using (is_staff() or farmer_id = my_farmer_id());
drop policy if exists trips_write on trips;
create policy trips_write on trips for all using (is_staff()) with check (is_staff());
do $$ begin alter publication supabase_realtime add table trips; exception when others then null; end $$;
-- súčet odvezeného do obchodu automaticky z vyložených jázd
create or replace function public.trips_sum() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update deals d set delivered_t = coalesce((select sum(netto) from trips t where t.deal_id=d.id and t.status='vylozene'),0)
   where d.id in (coalesce(new.deal_id,old.deal_id), coalesce(old.deal_id,new.deal_id));
  return null;
end $$;
drop trigger if exists trips_sum_t on trips;
create trigger trips_sum_t after insert or update or delete on trips for each row execute function public.trips_sum();
-- Autá a vodiči VALKO sú uložení v databáze (osobné údaje vodičov sa do verejného kódu neukladajú – GDPR).
-- Upravuješ ich v aplikácii: Doprava → Autá VALKO.

-- Doprava a Obchody: trasa/km prepravy (personál), obrat prepravy a predajná cena obchodu (iba majiteľ)
create table if not exists trip_route(
  trip_id uuid primary key references trips(id) on delete cascade,
  km numeric(10,1), dest text,
  updated_at timestamptz not null default now());
create table if not exists trip_fin(
  trip_id uuid primary key references trips(id) on delete cascade,
  revenue numeric(12,2),
  updated_at timestamptz not null default now());
create table if not exists deal_fin(
  deal_id uuid primary key references deals(id) on delete cascade,
  sell_price numeric(10,2),
  updated_at timestamptz not null default now());
alter table trip_route enable row level security;
alter table trip_fin enable row level security;
alter table deal_fin enable row level security;
drop policy if exists trip_route_staff on trip_route;
create policy trip_route_staff on trip_route for all using (is_staff()) with check (is_staff());
drop policy if exists trip_fin_owner on trip_fin;
create policy trip_fin_owner on trip_fin for all using (is_owner()) with check (is_owner());
drop policy if exists deal_fin_owner on deal_fin;
create policy deal_fin_owner on deal_fin for all using (is_owner()) with check (is_owner());
grant select, insert, update, delete on trip_route, trip_fin, deal_fin to authenticated;
