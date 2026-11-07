-- ERNTE Agro služby: cenník služieb strojmi, objednávky farmárov, kalkulácia strojov (iba majiteľ)
-- farmár: vidí aktívne služby a cenu (nikdy náklady, maržu ani kalkuláciu), objedná, vidí svoje objednávky, môže zrušiť novú
create or replace function public.fperm_def() returns text[] language sql immutable as $$
  select array['f_prices','f_sell','f_deals','f_remain','f_trucks','f_gps','f_transport','f_wx','f_big','f_agro'] $$;

-- nastavenia kalkulácie (náklady, mzdy, marža) – iba majiteľ
create table if not exists agro_cfg(key text primary key, value jsonb not null, updated_at timestamptz not null default now());
alter table agro_cfg enable row level security;
drop policy if exists agro_cfg_owner on agro_cfg;
create policy agro_cfg_owner on agro_cfg for all using (is_owner()) with check (is_owner());
revoke all on agro_cfg from anon;

-- cenník služieb
create table if not exists agro_services(
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name))>0),
  machine text, descr text,
  unit text not null default 'ha' check(unit in ('ha','h','t','km','ks')),
  price numeric(10,2) not null check(price>=0),
  fuel_lha numeric(8,2), min_qty numeric(10,2),
  fuel_by_customer boolean not null default true,
  active boolean not null default true, sort int not null default 100,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table agro_services enable row level security;
drop policy if exists agro_srv_read on agro_services;
create policy agro_srv_read on agro_services for select using (is_owner() or (is_staff() and has_perm('agro')) or (active and my_farmer_id() is not null and fperm('f_agro')));
drop policy if exists agro_srv_owner on agro_services;
create policy agro_srv_owner on agro_services for all using (is_owner()) with check (is_owner());
revoke all on agro_services from anon;
grant select, insert, update, delete on agro_services to authenticated;

-- objednávky
create sequence if not exists agro_order_seq;
create table if not exists agro_orders(
  id uuid primary key default gen_random_uuid(),
  no text unique,
  farmer_id uuid not null references farmers(id) on delete restrict,
  service_id uuid references agro_services(id) on delete set null,
  service_name text, unit text, qty numeric(10,2) not null check(qty>0 and qty<100000),
  price numeric(10,2), total numeric(12,2),
  date_from date, date_to date, place text, note text,
  status text not null default 'nova' check(status in ('nova','potvrdena','v_praci','hotova','zrusena')),
  planned date, done_qty numeric(10,2), reply text,
  created_by text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table agro_orders enable row level security;
drop policy if exists agro_ord_read on agro_orders;
create policy agro_ord_read on agro_orders for select using (is_owner() or (is_staff() and has_perm('agro')) or farmer_id=my_farmer_id());
drop policy if exists agro_ord_ins on agro_orders;
create policy agro_ord_ins on agro_orders for insert with check (is_owner() or (is_staff() and has_perm('agro')) or (farmer_id=my_farmer_id() and fperm('f_agro')));
drop policy if exists agro_ord_upd on agro_orders;
create policy agro_ord_upd on agro_orders for update using (is_owner() or (is_staff() and has_perm('agro')) or farmer_id=my_farmer_id());
drop policy if exists agro_ord_del on agro_orders;
create policy agro_ord_del on agro_orders for delete using (is_owner());
revoke all on agro_orders from anon;
grant select, insert, update, delete on agro_orders to authenticated;

create or replace function public.agro_ord_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare s agro_services; staffer boolean:=is_owner() or (is_staff() and has_perm('agro'));
begin
  if tg_op='INSERT' then
    select * into s from agro_services where id=new.service_id;
    if not found or (not s.active and not staffer) then raise exception 'Služba nie je dostupná.'; end if;
    if not staffer and s.min_qty is not null and new.qty<s.min_qty then raise exception 'Minimálne množstvo je % %.', s.min_qty, s.unit; end if;
    if new.date_to is not null and new.date_from is not null and new.date_to<new.date_from then raise exception 'Dátum do je pred dátumom od.'; end if;
    new.service_name:=s.name; new.unit:=s.unit; new.price:=s.price; new.total:=round(new.qty*s.price,2);
    new.no:='AS-'||to_char(now(),'YYYY')||'-'||lpad(nextval('agro_order_seq')::text,4,'0');
    new.created_by:=coalesce(auth.jwt()->>'email','');
    if not staffer then new.status:='nova'; new.planned:=null; new.done_qty:=null; new.reply:=null; end if;
    new.created_at:=now(); new.updated_at:=now();
    return new;
  end if;
  -- UPDATE
  if not staffer then
    -- farmár môže iba zrušiť svoju novú objednávku
    if old.status<>'nova' or new.status<>'zrusena' then raise exception 'Objednávku už spracúva ERNTE – zavolajte nám.'; end if;
    new:=old; new.status:='zrusena'; new.updated_at:=now(); return new;
  end if;
  new.id:=old.id; new.no:=old.no; new.farmer_id:=old.farmer_id; new.created_by:=old.created_by; new.created_at:=old.created_at;
  if new.price is null then new.price:=old.price; end if;
  new.total:=round(coalesce(new.done_qty,new.qty)*coalesce(new.price,0),2);
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists agro_ord_biu on agro_orders;
create trigger agro_ord_biu before insert or update on agro_orders for each row execute function agro_ord_trg();

create or replace function public.agro_srv_trg() returns trigger language plpgsql as $$ begin new.updated_at:=now(); return new; end $$;
drop trigger if exists agro_srv_bu on agro_services;
create trigger agro_srv_bu before update on agro_services for each row execute function agro_srv_trg();

-- objednávky s menom farmára a telefónom (pre ERNTE)
create or replace function public.agro_orders_staff() returns table(id uuid, no text, farmer_id uuid, farmer text, phone text, addr text, service_name text, unit text, qty numeric, price numeric, total numeric,
  date_from date, date_to date, place text, note text, status text, planned date, done_qty numeric, reply text, created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select o.id,o.no,o.farmer_id,f.name,f.phone,f.addr,o.service_name,o.unit,o.qty,o.price,o.total,o.date_from,o.date_to,o.place,o.note,o.status,o.planned,o.done_qty,o.reply,o.created_at
  from agro_orders o join farmers f on f.id=o.farmer_id
  where is_owner() or (is_staff() and has_perm('agro'))
  order by (o.status='nova') desc, o.created_at desc limit 500 $$;
revoke all on function public.agro_orders_staff() from public, anon; grant execute on function public.agro_orders_staff() to authenticated;

-- úvodný cenník z Excelu Stroje v počte – SKRYTÝ, majiteľ ho skontroluje a zverejní v aplikácii
insert into agro_services(name,machine,descr,unit,price,fuel_lha,min_qty,sort,active)
select * from (values
 ('Ťažká ťažná práca traktorom','CLAAS AXION 850 · záber 5 m','Podmietka, kyprenie, príprava pôdy. Traktor s obsluhou, naftu tankuje zákazník.','ha',46.68::numeric,6.8::numeric,5::numeric,10,false),
 ('Ťažká ťažná práca – silný traktor','CLAAS AXION 930 · záber 5 m','Hlbšie kyprenie a náročnejšie pôdy. Traktor s obsluhou, naftu tankuje zákazník.','ha',46.68,9.1,5,20,false)) v(a,b,c,d,e,f,g,h,i)
where not exists (select 1 from agro_services);
