-- tolerancia v % (farmár aj odberateľ) + odberateľské zmluvy + automatický prepočet
update settle_rules set value=value||'{"tol_pct":5,"tol_buy_pct":5}'::jsonb where key='main' and not value ? 'tol_pct';

create or replace function public.deliveries_allocate(p_farmer uuid, p_com text) returns int language plpgsql security definer set search_path=public as $$
declare cfg jsonb; pct numeric; d record; cum numeric:=0; cap numeric; did uuid; k int:=0; ids uuid[]; caps numeric[]; i int; n int;
begin
  select value into cfg from settle_rules where key='main';
  pct:=case when exists(select 1 from farmers f where f.id=p_farmer and xl_norm(f.name)=any(select xl_norm(x) from jsonb_array_elements_text(coalesce(cfg->'tol0','[]')) x)) then 0 else coalesce((cfg->>'tol_pct')::numeric,5) end;
  select array_agg(id order by contract_ord(no),no), array_agg(tons order by contract_ord(no),no) into ids,caps
    from deals where farmer_id=p_farmer and com=p_com and status<>'zruseny';
  n:=coalesce(array_length(ids,1),0);
  if n=0 then update deliveries set deal_id=null where farmer_id=p_farmer and com=p_com and deal_id is not null; return 0; end if;
  for d in select ticket, coalesce(gross_kg,net_kg,0) kg from deliveries where farmer_id=p_farmer and com=p_com order by day, ticket loop
    cum:=cum+d.kg; cap:=0; did:=ids[n];
    for i in 1..n loop cap:=cap+caps[i]*1000; if cum<=cap+(case when i<n then caps[i]*1000*pct/100 else 0 end) then did:=ids[i]; exit; end if; end loop;
    update deliveries set deal_id=did where ticket=d.ticket and deal_id is distinct from did; k:=k+1;
  end loop;
  return k;
end $$;
revoke all on function public.deliveries_allocate(uuid,text) from public, anon, authenticated;

-- prepočet všetkých farmárov (po zmene pravidiel automaticky)
create or replace function public.settle_reallocate() returns int language plpgsql security definer set search_path=public as $$
declare p record; k int:=0;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  for p in select distinct farmer_id, com from deliveries where farmer_id is not null loop perform deliveries_allocate(p.farmer_id,p.com); k:=k+1; end loop;
  update deals d set delivered_t=coalesce((select sum(netto) from trips t where t.deal_id=d.id and t.status='vylozene'),0)+coalesce((select sum(coalesce(gross_kg,net_kg))/1000 from deliveries v where v.deal_id=d.id),0)
   where exists(select 1 from deliveries v where v.farmer_id=d.farmer_id);
  return k;
end $$;
revoke all on function public.settle_reallocate() from public, anon; grant execute on function public.settle_reallocate() to authenticated;

create or replace function public.settle_rules_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.key='main' and (tg_op='INSERT' or new.value->'tol_pct' is distinct from old.value->'tol_pct' or new.value->'tol0' is distinct from old.value->'tol0') then
    perform deliveries_allocate(x.farmer_id,x.com) from (select distinct farmer_id, com from deliveries where farmer_id is not null) x;
  end if;
  return new;
end $$;
drop trigger if exists settle_rules_re on settle_rules;
create trigger settle_rules_re after insert or update on settle_rules for each row execute function settle_rules_trg();

-- súhrn zmlúv farmára + tolerancia
create or replace function public.settle_contracts(p_farmer uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare fid uuid:=p_farmer; cfg jsonb; res jsonb; pct numeric;
begin
  if not is_owner() then fid:=my_farmer_id(); if fid is null then raise exception 'Bez prístupu.'; end if; end if;
  select value into cfg from settle_rules where key='main';
  pct:=case when exists(select 1 from farmers f where f.id=fid and xl_norm(f.name)=any(select xl_norm(x) from jsonb_array_elements_text(coalesce(cfg->'tol0','[]')) x)) then 0 else coalesce((cfg->>'tol_pct')::numeric,5) end;
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'no',d.no,'com',d.com,'tons',d.tons,'price',d.price,'status',d.status,'tol_pct',pct,'tol_t',round(d.tons*pct/100,2),
     'scale_t',round(coalesce(l.kg,0)/1000,3),'delivered_t',round(coalesce(l.ik,0)/1000,2),'remain_t',round(d.tons-coalesce(l.ik,0)/1000,2),'fill',case when d.tons>0 then round(coalesce(l.ik,0)/1000/d.tons*100,1) end,
     'tickets',coalesce(l.n,0),'kg_mode',(select xl_norm(f2.name)=any(select xl_norm(z) from jsonb_array_elements_text(coalesce(cfg->'kg_mode','[]')) z) from farmers f2 where f2.id=d.farmer_id),'clean_kg',l.ck,'invoice_kg',l.ik,'invoice_eur',l.ie,'clean_cost',l.cc,'dry_cost',l.dc,'tech_t',l.tt,'last_day',l.ld,
     'last',(select max(contract_ord(x.no)) from deals x where x.farmer_id=d.farmer_id and x.com=d.com and x.status<>'zruseny')=contract_ord(d.no),
     'wheat_bands',(select bands from wheat_prices w where w.contract_no=d.no))
     order by d.com, contract_ord(d.no)),'[]') into res
  from deals d left join lateral (select sum(gross_kg) kg, count(*) n, sum(clean_kg) ck, sum(invoice_kg) ik, sum(invoice_eur) ie, sum(clean_cost) cc, sum(dry_cost) dc, sum(tech_t) tt, max(day) ld
      from settle_lines(d.farmer_id,d.id,null,null)) l on true
  where d.farmer_id=fid and d.status<>'zruseny';
  return jsonb_build_object('farmer',(select jsonb_build_object('id',f.id,'name',f.name,'code',f.code,'addr',f.addr,'phone',f.phone,'email',f.email) from farmers f where f.id=fid),'contracts',res,
    'rules',case when is_owner() then cfg else jsonb_build_object('norm',cfg->'norm','clean',cfg->'clean','dry',cfg->'dry','tol_pct',pct) end);
end $$;
revoke all on function public.settle_contracts(uuid) from public, anon; grant execute on function public.settle_contracts(uuid) to authenticated;

-- odberateľské zmluvy (iba majiteľ)
create table if not exists buy_contracts(id uuid primary key default gen_random_uuid(), buyer text not null, com text not null, no text, tons numeric not null check(tons>0), price numeric, d0 date, d1 date, note text, created_at timestamptz not null default now());
alter table buy_contracts enable row level security;
drop policy if exists bc_owner on buy_contracts; create policy bc_owner on buy_contracts for all using (is_owner()) with check (is_owner());
revoke all on buy_contracts from anon;

create or replace function public.buy_contracts_status() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare cfg jsonb; pct numeric;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  select value into cfg from settle_rules where key='main'; pct:=coalesce((cfg->>'tol_buy_pct')::numeric,5);
  return (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'buyer',c.buyer,'com',c.com,'no',c.no,'tons',c.tons,'price',c.price,'d0',c.d0,'d1',c.d1,'note',c.note,
     'tol_pct',pct,'min_t',round(c.tons*(1-pct/100),2),'max_t',round(c.tons*(1+pct/100),2),'delivered_t',round(coalesce(v.kg,0)/1000,3),'tickets',coalesce(v.n,0),'last_day',v.ld,
     'state',case when coalesce(v.kg,0)/1000<c.tons*(1-pct/100) then 'short' when coalesce(v.kg,0)/1000>c.tons*(1+pct/100) then 'over' else 'ok' end)
     order by c.buyer, c.com, c.no),'[]')
   from buy_contracts c left join lateral (select sum(net_kg) kg, count(*) n, max(day) ld from deliveries d
     where xl_norm(d.buyer)=xl_norm(c.buyer) and d.com=c.com and (c.d0 is null or d.day>=c.d0) and (c.d1 is null or d.day<=c.d1)) v on true);
end $$;
revoke all on function public.buy_contracts_status() from public, anon; grant execute on function public.buy_contracts_status() to authenticated;
select settle_reallocate();
