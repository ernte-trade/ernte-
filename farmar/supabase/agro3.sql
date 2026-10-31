-- Agro služby 3: pevná cena žatvy s dvoma pásmami (do limitu ha / nad limit) + nafta fakturovaná podľa skutočnej spotreby
alter table agro_services add column if not exists price_small numeric(10,2);
alter table agro_services add column if not exists small_limit numeric(10,2);
alter table agro_services add column if not exists fuel_billed boolean not null default false;
alter table agro_services add column if not exists fuel_price numeric(6,3);
alter table agro_orders add column if not exists fuel_l numeric(10,1);
alter table agro_orders add column if not exists fuel_price numeric(6,3);
alter table agro_orders add column if not exists fuel_est_l numeric(10,1);

create or replace function public.agro_tier(s agro_services, q numeric) returns numeric language sql immutable as $$
  select case when s.price_small is not null and s.small_limit is not null and q<=s.small_limit then s.price_small else s.price end $$;

create or replace function public.agro_ord_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare s agro_services; staffer boolean:=is_owner() or (is_staff() and has_perm('agro'));
begin
  if tg_op='INSERT' then
    select * into s from agro_services where id=new.service_id;
    if not found or (not s.active and not staffer) then raise exception 'Služba nie je dostupná.'; end if;
    if not staffer and s.min_qty is not null and new.qty<s.min_qty then raise exception 'Minimálne množstvo je % %.', s.min_qty, s.unit; end if;
    if new.date_to is not null and new.date_from is not null and new.date_to<new.date_from then raise exception 'Dátum do je pred dátumom od.'; end if;
    new.service_name:=s.name; new.unit:=s.unit; new.price:=agro_tier(s,new.qty);
    new.fuel_price:=case when s.fuel_billed then s.fuel_price end; new.fuel_est_l:=case when s.fuel_billed and s.fuel_lha is not null then round(new.qty*s.fuel_lha,1) end; new.fuel_l:=null;
    new.total:=round(new.qty*new.price,2);
    new.no:='AS-'||to_char(now(),'YYYY')||'-'||lpad(nextval('agro_order_seq')::text,4,'0');
    new.created_by:=coalesce(auth.jwt()->>'email','');
    if not staffer then new.status:='nova'; new.planned:=null; new.done_qty:=null; new.reply:=null; end if;
    new.created_at:=now(); new.updated_at:=now();
    return new;
  end if;
  if not staffer then
    if old.status<>'nova' or new.status<>'zrusena' then raise exception 'Objednávku už spracúva ERNTE – zavolajte nám.'; end if;
    new:=old; new.status:='zrusena'; new.updated_at:=now(); return new;
  end if;
  new.id:=old.id; new.no:=old.no; new.farmer_id:=old.farmer_id; new.created_by:=old.created_by; new.created_at:=old.created_at;
  -- pásmo ceny podľa skutočnej výmery (ak sa zmenila a cenu nikto ručne neprepísal)
  if new.done_qty is distinct from old.done_qty and new.price is not distinct from old.price then
    select * into s from agro_services where id=new.service_id; if found then new.price:=agro_tier(s,coalesce(new.done_qty,new.qty)); end if;
  end if;
  if new.price is null then new.price:=old.price; end if;
  new.total:=round(coalesce(new.done_qty,new.qty)*coalesce(new.price,0)+coalesce(new.fuel_l,0)*coalesce(new.fuel_price,0),2);
  new.updated_at:=now();
  return new;
end $$;

drop function if exists public.agro_orders_staff();
create or replace function public.agro_orders_staff() returns table(id uuid, no text, farmer_id uuid, farmer text, phone text, addr text, service_name text, unit text, qty numeric, price numeric, total numeric,
  date_from date, date_to date, place text, note text, status text, planned date, done_qty numeric, reply text, created_at timestamptz, fuel_l numeric, fuel_price numeric, fuel_est_l numeric)
language sql stable security definer set search_path=public as $$
  select o.id,o.no,o.farmer_id,f.name,f.phone,f.addr,o.service_name,o.unit,o.qty,o.price,o.total,o.date_from,o.date_to,o.place,o.note,o.status,o.planned,o.done_qty,o.reply,o.created_at,o.fuel_l,o.fuel_price,o.fuel_est_l
  from agro_orders o join farmers f on f.id=o.farmer_id
  where is_owner() or (is_staff() and has_perm('agro'))
  order by (o.status='nova') desc, o.created_at desc limit 500 $$;
revoke all on function public.agro_orders_staff() from public, anon; grant execute on function public.agro_orders_staff() to authenticated;
