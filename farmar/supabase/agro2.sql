-- Agro služby 2: automatická ponuka z nášho parku (traktor + náradie, kombajn + adaptér + plodina)
-- cena sa počíta skryto u majiteľa (náklady ASABE + prirážka) – do databázy ide iba výsledná cena €/ha
alter table agro_services add column if not exists kind text not null default 'other';
alter table agro_services add column if not exists tool text;
alter table agro_services add column if not exists crop text;
alter table agro_services add column if not exists auto boolean not null default false;
alter table agro_services add column if not exists okey text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='agro_services_okey_key') then alter table agro_services add constraint agro_services_okey_key unique(okey); end if;
  if not exists (select 1 from pg_constraint where conname='agro_services_kind_chk') then alter table agro_services add constraint agro_services_kind_chk check (kind in ('other','tillage','harvest')); end if;
end $$;
alter table agro_orders add column if not exists crop text;
create or replace function public.agro_ord_crop() returns trigger language plpgsql security definer set search_path=public as $$
begin if tg_op='INSERT' then select crop into new.crop from agro_services where id=new.service_id; end if; return new; end $$;
drop trigger if exists agro_ord_crop on agro_orders;
create trigger agro_ord_crop before insert on agro_orders for each row execute function agro_ord_crop();
