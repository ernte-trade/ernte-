-- ===== ERNTE · nové prepojené funkcie (audit 26. 10. 2026) =====

-- 1) Cena, ktorú farmár vidí (zadaná cena − zľava zo vzorca bonusu, predvolene 5 %)
create or replace function public.farmer_price(c text) returns numeric language sql stable security definer set search_path=public as $$
  select round(p.price*(1-coalesce((b.value->c->>'max')::numeric,(b.value->'_def'->>'max')::numeric,5)/100),2)
  from prices p left join settings b on b.key='price_bonus' where p.com=c and p.price is not null $$;
revoke all on function public.farmer_price(text) from public, anon; grant execute on function public.farmer_price(text) to authenticated;

-- 2) Predaj od farmára: cenu určí databáza (nie telefón), predaj/odvoz len s povolením
create or replace function public.req_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if my_farmer_id() is not null and not is_staff() then
    if new.kind='sell' then
      if not fperm('f_sell') then raise exception 'Predaj cez aplikáciu nie je povolený – zavolajte ERNTE.'; end if;
      new.price:=farmer_price(new.com);
    elsif new.kind='transport' and not fperm('f_transport') then raise exception 'Objednanie odvozu nie je povolené – zavolajte ERNTE.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists req_guard on requests;
create trigger req_guard before insert on requests for each row execute function req_guard();

-- 3) Čísla obchodov bez kolízií (ERN-RRRR-NNNN)
create or replace function public.deals_no() returns trigger language plpgsql security definer set search_path=public as $$
declare y text:=to_char(now() at time zone 'Europe/Bratislava','YYYY'); n int;
begin
  if new.no is null or new.no='' or exists(select 1 from deals where no=new.no) then
    perform pg_advisory_xact_lock(hashtext('deals_no'));
    select coalesce(max(nullif(regexp_replace(no,'^ERN-'||y||'-',''),no)::int),0)+1 into n from deals where no ~ ('^ERN-'||y||'-[0-9]+$');
    new.no:='ERN-'||y||'-'||lpad(n::text,4,'0');
  end if;
  return new;
end $$;
drop trigger if exists deals_no on deals;
create trigger deals_no before insert on deals for each row execute function deals_no();

-- 4) CIEĽOVÁ CENA FARMÁRA: farmár si nastaví cenu, pri ktorej chce predať. Keď ERNTE zvýši cenník
--    a farmárska cena dosiahne cieľ, automaticky vznikne požiadavka na predaj (ERNTE ju potvrdí).
create table if not exists price_targets(id bigserial primary key, farmer_id uuid not null references farmers(id) on delete cascade default my_farmer_id(),
  com text not null, target numeric not null check (target>0 and target<5000), tons numeric check (tons is null or tons>0),
  active boolean not null default true, hit_at timestamptz, hit_price numeric, request_id uuid, created_at timestamptz not null default now());
create index if not exists price_targets_act on price_targets(com) where active;
alter table price_targets enable row level security;
drop policy if exists pt_read on price_targets; create policy pt_read on price_targets for select using (farmer_id=my_farmer_id() or (is_staff() and (has_perm('req') or has_perm('deals'))));
drop policy if exists pt_ins on price_targets; create policy pt_ins on price_targets for insert with check (farmer_id=my_farmer_id() and fperm('f_sell') and active and hit_at is null);
drop policy if exists pt_upd on price_targets; create policy pt_upd on price_targets for update using (farmer_id=my_farmer_id()) with check (farmer_id=my_farmer_id() and hit_at is null);
drop policy if exists pt_del on price_targets; create policy pt_del on price_targets for delete using (farmer_id=my_farmer_id() or is_owner());
grant select, insert, update, delete on price_targets to authenticated; grant usage on sequence price_targets_id_seq to authenticated;
create or replace function public.price_targets_check(c text default null) returns int language plpgsql security definer set search_path=public as $$
declare t record; fp numeric; rid uuid; k int:=0;
begin
  for t in select * from price_targets where active and (c is null or com=c) order by created_at loop
    fp:=farmer_price(t.com);
    if fp is not null and fp>=t.target then
      insert into requests(farmer_id,kind,com,tons,price,note,status)
        values(t.farmer_id,'sell',t.com,t.tons,fp,'🎯 Automaticky: dosiahnutá cieľová cena farmára '||replace(t.target::text,'.',',')||' €/t (aktuálne '||replace(fp::text,'.',',')||' €/t). Potvrď obchod.','nova')
        returning id into rid;
      update price_targets set active=false, hit_at=now(), hit_price=fp, request_id=rid where id=t.id; k:=k+1;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.price_targets_check(text) from public, anon, authenticated;
create or replace function public.prices_targets_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin perform price_targets_check(new.com); return null; end $$;
drop trigger if exists prices_targets on prices;
create trigger prices_targets after insert or update of price on prices for each row execute function prices_targets_trg();
create or replace function public.settings_targets_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.key='price_bonus' then perform price_targets_check(null); end if; return null; end $$;
drop trigger if exists settings_targets on settings;
create trigger settings_targets after insert or update on settings for each row execute function settings_targets_trg();
-- cieľ, ktorý je už teraz splnený, sa potvrdí hneď
create or replace function public.pt_new_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin perform price_targets_check(new.com); return null; end $$;
drop trigger if exists pt_new on price_targets;
create trigger pt_new after insert on price_targets for each row execute function pt_new_trg();

-- 5) POZÍCIA A RIZIKO (iba majiteľ): nakúpené vs. predané, otvorené tony, ocenenie voči burze
create or replace function public.risk_position() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  select coalesce(jsonb_agg(x order by x.open_t desc),'[]') into r from (
    select d.com, sum(d.tons) tons, sum(d.delivered_t) delivered, sum(greatest(0,d.tons-d.delivered_t)) open_t,
      round(sum(d.tons*d.price)/nullif(sum(d.tons),0),2) avg_buy,
      sum(d.tons) filter (where f.sell_price is not null) sold_t,
      round(sum(d.tons*f.sell_price) filter (where f.sell_price is not null)/nullif(sum(d.tons) filter (where f.sell_price is not null),0),2) avg_sell,
      round(sum(d.tons*(f.sell_price-d.price)) filter (where f.sell_price is not null),0) margin_locked,
      sum(d.tons) filter (where f.sell_price is null) unsold_t,
      round(sum(d.tons*d.price) filter (where f.sell_price is null)/nullif(sum(d.tons) filter (where f.sell_price is null),0),2) avg_buy_unsold,
      count(*) n
    from deals d left join deal_fin f on f.deal_id=d.id
    where d.status in ('navrh','podpisany','odvoz','odvezeny','fakturacia') group by d.com) x;
  return jsonb_build_object('rows',r,'market',(select coalesce(jsonb_object_agg(sym,jsonb_build_object('eur_t',eur_t,'name',name,'contract',contract,'at',updated_at)),'{}') from market_px));
end $$;
revoke all on function public.risk_position() from public, anon; grant execute on function public.risk_position() to authenticated;

-- 6) BALÍK MOBILITY: návrat vozidla na prevádzku aspoň raz za 8 týždňov (Nariadenie 1071/2009 v znení 2020/1055)
create or replace function public.fleet_mobility() returns table(vehicle_id text, plate text, last_yard timestamptz, days int, active boolean)
language sql stable security definer set search_path=public as $$
  select v.id, coalesce(v.plate,v.name,v.id),
    greatest((select max(e.at) from fleet_events e where e.vehicle_id=v.id and (e.kind in ('yard_in','yard_out') or coalesce(e.place_kind,'')='yard')),case when v.in_yard then now() end) ly,
    (current_date-(greatest((select max(e.at) from fleet_events e where e.vehicle_id=v.id and (e.kind in ('yard_in','yard_out') or coalesce(e.place_kind,'')='yard')),case when v.in_yard then now() end) at time zone 'Europe/Bratislava')::date)::int,
    exists(select 1 from rides r where r.vehicle_id=v.id and r.start_at>now()-interval '14 days' and r.distance>20)
  from cmd_vehicles v where is_fleet() and v.alias_of is null and not coalesce(v.deleted,false) $$;
revoke all on function public.fleet_mobility() from public, anon; grant execute on function public.fleet_mobility() to authenticated;

-- 7) CO₂ flotily za mesiac (EN 16258 / ISO 14083: nafta 3,24 kg CO₂e/l well-to-wheel, 2,67 tank-to-wheel)
create or replace function public.fleet_co2(m date default date_trunc('month',now())::date) returns jsonb language sql stable security definer set search_path=public as $$
  select case when is_fleet() then jsonb_build_object('mesiac',to_char(m,'YYYY-MM'),'km',round(coalesce(sum(distance),0)),'litre',round(coalesce(sum(fuel_consumed) filter (where fuel_consumed>0),0)),
    'co2_t_wtw',round(coalesce(sum(fuel_consumed) filter (where fuel_consumed>0),0)*3.24/1000,1),'co2_t_ttw',round(coalesce(sum(fuel_consumed) filter (where fuel_consumed>0),0)*2.67/1000,1),
    'g_km',round(coalesce(sum(fuel_consumed) filter (where fuel_consumed>0),0)*3240/nullif(sum(distance) filter (where fuel_consumed>0),0))) end
  from rides where start_at>=m and start_at<(m+interval '1 month') $$;
revoke all on function public.fleet_co2(date) from public, anon; grant execute on function public.fleet_co2(date) to authenticated;
select 'ok';
