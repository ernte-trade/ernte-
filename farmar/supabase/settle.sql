-- ===== ZÚČTOVANIE FARMÁROV (prenesené pravidlá z Excelu ZÚČTOVANIE 2026, hárok Dodávateľ) =====
-- Predaj, marža a prehľady: iba majiteľ. Farmár: iba svoje lístky, zúčtovanie, cena a zmluva.

-- pravidlá (iba majiteľ): normy vlhkosti, sadzby, tolerancia, výnimky dodávateľov
create table if not exists settle_rules(key text primary key, value jsonb not null, updated_at timestamptz not null default now());
alter table settle_rules enable row level security;
drop policy if exists sr_owner on settle_rules; create policy sr_owner on settle_rules for all using (is_owner()) with check (is_owner());
insert into settle_rules(key,value) values('main','{"norm":{"jacmen_k":14,"jacmen_s":14,"psenica_p":14,"psenica_k":14,"kukurica":14,"repka":8,"soja":13,"lo":8,"ho":8,"cirok":14},"clean":2.5,"dry":3.5,"impurity_contract":2,"broken_limit":5,"tol_t":10,"tol0":[],"kg_mode":[]}')
  on conflict(key) do nothing;
-- ceny pšenice podľa dusíka (bielkovín) na zmluvu: bands = [{min:%, price:€/t}]
create table if not exists wheat_prices(contract_no text primary key, farmer_name text, bands jsonb not null, updated_at timestamptz not null default now());
alter table wheat_prices enable row level security;
drop policy if exists wp_owner on wheat_prices; create policy wp_owner on wheat_prices for all using (is_owner()) with check (is_owner());

-- kvalita z poznámky váhy (HU/SK): vlhkosť, bielkoviny/dusík, olej, zlomky
alter table deliveries add column if not exists moisture_pct numeric, add column if not exists protein_pct numeric, add column if not exists oil_pct numeric, add column if not exists broken_pct numeric;
create or replace function public.q_num(t text, pat text) returns numeric language sql immutable as $$
  select nullif(replace(substring(lower(coalesce(t,'')) from pat),',','.'),'')::numeric $$;
create or replace function public.deliv_quality() returns trigger language plpgsql set search_path=public as $$
begin
  new.moisture_pct:=coalesce(new.moisture_pct,q_num(new.note,'(?:nedvességtartalom|nedvesség|vlhkosť|vlhkost)\s*:\s*([0-9]+(?:[.,][0-9]+)?)'));
  new.protein_pct:=coalesce(new.protein_pct,q_num(new.note,'(?:fehérje|bielkoviny|bielkovina|bielkov)\s*:\s*([0-9]+(?:[.,][0-9]+)?)'));
  new.oil_pct:=coalesce(new.oil_pct,q_num(new.note,'(?:olajtartalom|olej)\s*:\s*([0-9]+(?:[.,][0-9]+)?)'));
  return new;
end $$;
drop trigger if exists deliv_quality on deliveries;
create trigger deliv_quality before insert or update of note on deliveries for each row execute function deliv_quality();
update deliveries set note=note where moisture_pct is null and protein_pct is null and oil_pct is null and note is not null;

-- rozdelenie lístkov do zmlúv farmára (vodopád podľa poradia zmlúv, tolerancia 10 t na zmluvu, posledná berie prebytok)
create or replace function public.contract_ord(no text) returns int language sql immutable as $$ select coalesce(nullif(substring(no from '/(\d+)'),'')::int,99999) $$;
create or replace function public.deliveries_allocate(p_farmer uuid, p_com text) returns int language plpgsql security definer set search_path=public as $$
declare cfg jsonb; tol numeric; d record; c record; cum numeric:=0; cap numeric; did uuid; k int:=0; ids uuid[]; caps numeric[]; i int; n int;
begin
  select value into cfg from settle_rules where key='main';
  tol:=case when exists(select 1 from farmers f where f.id=p_farmer and xl_norm(f.name)=any(select xl_norm(x) from jsonb_array_elements_text(coalesce(cfg->'tol0','[]')) x)) then 0 else coalesce((cfg->>'tol_t')::numeric,10) end*1000;
  select array_agg(id order by contract_ord(no),no), array_agg(tons order by contract_ord(no),no) into ids,caps
    from deals where farmer_id=p_farmer and com=p_com and status<>'zruseny';
  n:=coalesce(array_length(ids,1),0);
  if n=0 then update deliveries set deal_id=null where farmer_id=p_farmer and com=p_com and deal_id is not null; return 0; end if;
  for d in select ticket, coalesce(gross_kg,net_kg,0) kg from deliveries where farmer_id=p_farmer and com=p_com order by day, ticket loop
    cum:=cum+d.kg; cap:=0; did:=ids[n];
    for i in 1..n loop cap:=cap+caps[i]*1000; if cum<=cap+(case when i<n then tol else 0 end) then did:=ids[i]; exit; end if; end loop;
    update deliveries set deal_id=did where ticket=d.ticket and deal_id is distinct from did; k:=k+1;
  end loop;
  return k;
end $$;
revoke all on function public.deliveries_allocate(uuid,text) from public, anon, authenticated;

-- riadky zúčtovania (vzorce z Excelu: S, U, V, X, Y, Z, AA, W, AB, AC)
create or replace function public.settle_lines(p_farmer uuid default null, p_deal uuid default null, d0 date default null, d1 date default null)
returns table(ticket text, day date, plate text, com text, deal_id uuid, deal_no text, gross_kg numeric, impurity_pct numeric, broken_pct numeric, deduct_pct numeric,
  clean_kg numeric, clean_loss_kg numeric, moisture_pct numeric, norm numeric, dry_kg numeric, dry_loss_kg numeric, clean_cost numeric, dry_cost numeric, tech_cost numeric,
  protein_pct numeric, price numeric, invoice_kg numeric, invoice_eur numeric, tech_t numeric, kg_mode boolean, quality text)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
declare cfg jsonb; fid uuid:=p_farmer;
begin
  if not is_owner() then fid:=my_farmer_id(); if fid is null then raise exception 'Bez prístupu.'; end if; end if;
  select value into cfg from settle_rules where key='main';
  return query
  with b as (
    select v.*, x.no dno, x.price dprice, f.name fname,
      coalesce((cfg->'norm'->>v.com)::numeric,14) nm,
      xl_norm(f.name)=any(select xl_norm(z) from jsonb_array_elements_text(coalesce(cfg->'kg_mode','[]')) z) kgm
    from deliveries v left join deals x on x.id=v.deal_id left join farmers f on f.id=v.farmer_id
    where (fid is null or v.farmer_id=fid) and (p_deal is null or v.deal_id=p_deal) and (d0 is null or v.day>=d0) and (d1 is null or v.day<=d1)),
  c as (select b.*, coalesce(b.gross_kg,b.net_kg) j, greatest(0,coalesce(b.impurity_pct,0)) p, greatest(0,coalesce(b.broken_pct,0)-coalesce((cfg->>'broken_limit')::numeric,5)) q from b),
  s as (select c.*, c.p+c.q r, coalesce(c.net_kg, c.j*(1-(c.p+c.q)/100)) sk from c),
  u as (select s.*, case when s.moisture_pct is null or s.moisture_pct<=s.nm then s.sk else s.sk-(s.sk*(s.moisture_pct-s.nm)/(100-s.moisture_pct)) end uk,
      case when s.com='psenica_p' and s.protein_pct is not null then
        (select (e->>'price')::numeric from wheat_prices w, jsonb_array_elements(w.bands) e where w.contract_no=s.dno and (e->>'min')::numeric<=s.protein_pct order by (e->>'min')::numeric desc limit 1)
      end wp from s),
  a as (select u.*, coalesce(u.wp, nullif(u.dprice,0),
        (select x2.price from deals x2 where x2.farmer_id=u.farmer_id and x2.com=u.com and x2.price>0 order by contract_ord(x2.no) limit 1)) aa from u),
  k as (select a.*,
      case when a.p>0 then (a.j/1000)*coalesce((cfg->>'clean')::numeric,2.5) else 0 end xe,
      case when a.moisture_pct is null or a.moisture_pct<=a.nm then 0 else (a.sk/1000)*(a.moisture_pct-a.nm)*coalesce((cfg->>'dry')::numeric,3.5) end ye from a)
  select k.ticket,k.day,k.plate,k.com,k.deal_id,k.dno,round(k.j,0),round(k.p,2),k.broken_pct,round(k.r,2),round(k.sk,0),round(k.j-k.sk,0),k.moisture_pct,k.nm,round(k.uk,0),round(k.sk-k.uk,0),
    round(case when k.kgm then case when k.aa>0 then k.xe/k.aa*1000 else 0 end else k.xe end,2),
    round(case when k.kgm then case when k.aa>0 then k.ye/k.aa*1000 else 0 end else k.ye end,2),
    round(case when k.kgm then case when k.aa>0 then (k.xe+k.ye)/k.aa*1000 else 0 end else k.xe+k.ye end,2),
    k.protein_pct, round(k.aa,2),
    round(case when coalesce(k.aa,0)=0 then k.uk when k.kgm then k.uk-(k.xe+k.ye)/k.aa*1000 else k.uk-((k.xe+k.ye)/k.aa)*1000 end,0),
    round(case when coalesce(k.aa,0)=0 then null else (case when k.kgm then k.uk-(k.xe+k.ye)/k.aa*1000 else k.uk-((k.xe+k.ye)/k.aa)*1000 end)/1000*k.aa end,2),
    round(case when coalesce(k.aa,0)=0 then null else (k.xe+k.ye)/k.aa end,3), k.kgm,
    nullif(regexp_replace(coalesce(k.note,''),'[{}]','','g'),'')
  from k order by k.day, k.ticket;
end $$;
revoke all on function public.settle_lines(uuid,uuid,date,date) from public, anon; grant execute on function public.settle_lines(uuid,uuid,date,date) to authenticated;

-- súhrn zmlúv farmára (ako hlavička hárku Dodávateľ)
create or replace function public.settle_contracts(p_farmer uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare fid uuid:=p_farmer; cfg jsonb; res jsonb;
begin
  if not is_owner() then fid:=my_farmer_id(); if fid is null then raise exception 'Bez prístupu.'; end if; end if;
  select value into cfg from settle_rules where key='main';
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'no',d.no,'com',d.com,'tons',d.tons,'price',d.price,'status',d.status,
     'scale_t',round(coalesce(l.kg,0)/1000,3),'delivered_t',round(coalesce(l.ik,0)/1000,2),'remain_t',round(d.tons-coalesce(l.ik,0)/1000,2),'fill',case when d.tons>0 then round(coalesce(l.ik,0)/1000/d.tons*100,1) end,
     'tickets',coalesce(l.n,0),'kg_mode',(select xl_norm(f2.name)=any(select xl_norm(z) from jsonb_array_elements_text(coalesce(cfg->'kg_mode','[]')) z) from farmers f2 where f2.id=d.farmer_id),'clean_kg',l.ck,'invoice_kg',l.ik,'invoice_eur',l.ie,'clean_cost',l.cc,'dry_cost',l.dc,'tech_t',l.tt,'last_day',l.ld,
     'last',(select max(contract_ord(x.no)) from deals x where x.farmer_id=d.farmer_id and x.com=d.com and x.status<>'zruseny')=contract_ord(d.no),
     'wheat_bands',(select bands from wheat_prices w where w.contract_no=d.no))
     order by d.com, contract_ord(d.no)),'[]') into res
  from deals d left join lateral (select sum(gross_kg) kg, count(*) n, sum(clean_kg) ck, sum(invoice_kg) ik, sum(invoice_eur) ie, sum(clean_cost) cc, sum(dry_cost) dc, sum(tech_t) tt, max(day) ld
      from settle_lines(d.farmer_id,d.id,null,null)) l on true
  where d.farmer_id=fid and d.status<>'zruseny';
  return jsonb_build_object('farmer',(select jsonb_build_object('id',f.id,'name',f.name,'code',f.code,'addr',f.addr,'phone',f.phone,'email',f.email) from farmers f where f.id=fid),'contracts',res,
    'rules',case when is_owner() then cfg else jsonb_build_object('norm',cfg->'norm','clean',cfg->'clean','dry',cfg->'dry') end);
end $$;
revoke all on function public.settle_contracts(uuid) from public, anon; grant execute on function public.settle_contracts(uuid) to authenticated;

-- vloženie lístkov skopírovaných z Excelu (iba majiteľ). rows = [{d,f,t,k,p,g,i,n,s,b,o}]
create or replace function public.deliveries_paste(rows jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; fid uuid; n_new int:=0; n_upd int:=0; miss jsonb:='[]'; pairs jsonb:='[]'; p jsonb; ex boolean;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  for c in select * from jsonb_array_elements(rows) loop
    if coalesce(c->>'t','')='' then continue; end if;
    select id into fid from farmers where (c->>'code' is not null and code=c->>'code') or xl_norm(name)=xl_norm(c->>'f') order by (code=c->>'code') desc nulls last limit 1;
    if fid is null then insert into farmers(name,active,src) values(c->>'f',true,'excel') returning id into fid; miss:=miss||to_jsonb(c->>'f'); end if;
    select exists(select 1 from deliveries where ticket=c->>'t') into ex;
    insert into deliveries(ticket,day,farmer_id,farmer_name,com,plate,gross_kg,impurity_pct,net_kg,sell_price,buy_price,buyer,note,broken_pct,src,updated_at)
    values(c->>'t',(c->>'d')::date,fid,c->>'f',c->>'k',nullif(replace(c->>'p',' ',''),''),(c->>'g')::numeric,(c->>'i')::numeric,(c->>'n')::numeric,(c->>'s')::numeric,(c->>'b')::numeric,
      coalesce(nullif(c->>'buyer',''),'Agro-Somotor s.r.o.'),c->>'o',(c->>'z')::numeric,'paste',now())
    on conflict(ticket) do update set day=excluded.day,farmer_id=excluded.farmer_id,farmer_name=excluded.farmer_name,com=excluded.com,plate=excluded.plate,gross_kg=excluded.gross_kg,
      impurity_pct=excluded.impurity_pct,net_kg=excluded.net_kg,sell_price=coalesce(excluded.sell_price,deliveries.sell_price),buy_price=coalesce(excluded.buy_price,deliveries.buy_price),
      note=excluded.note,broken_pct=coalesce(excluded.broken_pct,deliveries.broken_pct),moisture_pct=null,protein_pct=null,oil_pct=null,updated_at=now();
    if ex then n_upd:=n_upd+1; else n_new:=n_new+1; end if;
    pairs:=pairs||jsonb_build_object('f',fid,'k',c->>'k');
  end loop;
  for p in select distinct value from jsonb_array_elements(pairs) loop perform deliveries_allocate((p->>'f')::uuid,p->>'k'); end loop;
  update deals d set delivered_t=coalesce((select sum(netto) from trips t where t.deal_id=d.id and t.status='vylozene'),0)+coalesce((select sum(coalesce(gross_kg,net_kg))/1000 from deliveries v where v.deal_id=d.id),0)
   where d.farmer_id in (select (value->>'f')::uuid from jsonb_array_elements(pairs));
  return jsonb_build_object('nove',n_new,'aktualizovane',n_upd,'novi_farmari',miss);
end $$;
revoke all on function public.deliveries_paste(jsonb) from public, anon; grant execute on function public.deliveries_paste(jsonb) to authenticated;

-- nákupné zmluvy z Excelu (iba majiteľ). rows=[{code,no,firm,com,tons,price}]
create or replace function public.contracts_paste(rows jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; fid uuid; k int:=0;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  for c in select * from jsonb_array_elements(rows) loop
    if coalesce(c->>'no','')='' or coalesce((c->>'tons')::numeric,0)<=0 then continue; end if;
    select id into fid from farmers where (coalesce(c->>'code','')<>'' and code=c->>'code') or xl_norm(name)=xl_norm(c->>'firm') order by (code=c->>'code') desc nulls last limit 1;
    if fid is null then insert into farmers(name,code,active,src) values(c->>'firm',nullif(c->>'code',''),true,'excel') returning id into fid; end if;
    insert into deals(no,farmer_id,com,tons,price,status,src) values(c->>'no',fid,c->>'com',(c->>'tons')::numeric,coalesce((c->>'price')::numeric,0),'podpisany','excel')
      on conflict(no) do update set farmer_id=excluded.farmer_id,com=excluded.com,tons=excluded.tons,price=case when excluded.price>0 then excluded.price else deals.price end,src='excel';
    perform deliveries_allocate(fid,c->>'com'); k:=k+1;
  end loop;
  return jsonb_build_object('zmluvy',k);
end $$;
revoke all on function public.contracts_paste(jsonb) from public, anon; grant execute on function public.contracts_paste(jsonb) to authenticated;

-- prehľady (iba majiteľ): týždenný súhrn, odberateľ, ŠPZ, mesačne
create or replace function public.settle_reports(d0 date default null, d1 date default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  return jsonb_build_object(
   'week',(select coalesce(jsonb_agg(w order by w.wk desc, w.com),'[]') from (select date_trunc('week',day)::date wk, com, round(sum(net_kg)/1000,3) t,
      round(sum(sell_price*net_kg)/nullif(sum(net_kg) filter (where sell_price is not null),0),2) ps, round(sum(buy_price*net_kg)/nullif(sum(net_kg) filter (where buy_price is not null),0),2) pb,
      round(sum((sell_price-buy_price)*net_kg/1000),2) zisk from deliveries where (d0 is null or day>=d0) and (d1 is null or day<=d1) group by 1,2) w),
   'buyer',(select coalesce(jsonb_agg(b order by b.t desc),'[]') from (select buyer, com, round(sum(net_kg)/1000,3) t, round(sum(sell_price*net_kg/1000),2) trzby, round(sum(buy_price*net_kg/1000),2) naklady,
      round(sum((sell_price-buy_price)*net_kg/1000),2) zisk from deliveries where (d0 is null or day>=d0) and (d1 is null or day<=d1) group by 1,2) b),
   'plate',(select coalesce(jsonb_agg(p order by p.t desc),'[]') from (select plate, round(sum(net_kg)/1000,3) t, count(*) jazdy, round(sum(net_kg)/1000/count(*),2) avg_t,
      count(distinct day) dni, round(avg(impurity_pct),2) necist, min(day) od, max(day) do_ from deliveries where plate is not null and (d0 is null or day>=d0) and (d1 is null or day<=d1) group by 1) p),
   'plate_month',(select coalesce(jsonb_agg(m),'[]') from (select plate, to_char(day,'YYYY-MM') mes, round(sum(net_kg)/1000,3) t from deliveries where plate is not null and (d0 is null or day>=d0) and (d1 is null or day<=d1) group by 1,2) m),
   'nocontract',(select count(*) from deliveries where deal_id is null and (d0 is null or day>=d0) and (d1 is null or day<=d1)),
   'noprice',(select count(*) from deliveries where (buy_price is null or sell_price is null) and (d0 is null or day>=d0) and (d1 is null or day<=d1)));
end $$;
revoke all on function public.settle_reports(date,date) from public, anon; grant execute on function public.settle_reports(date,date) to authenticated;

-- farmár: vlastné obchody (aj z Excelu) a vlastné lístky; zamestnanci obchody z Excelu nevidia
drop policy if exists deals_read on deals;
create policy deals_read on deals for select using ((is_staff() and has_perm('deals') and (src is distinct from 'excel' or is_owner())) or (farmer_id=my_farmer_id() and (fperm('f_deals') or fperm('f_remain'))));
create or replace function public.my_deliveries() returns table(ticket text, day date, com text, plate text, gross_kg numeric, impurity_pct numeric, net_kg numeric, buy_price numeric, deal_no text, quality text)
language sql stable security definer set search_path=public as $$
  select d.ticket,d.day,d.com,d.plate,d.gross_kg,d.impurity_pct,d.net_kg,case when fperm('f_deals') then d.buy_price end,x.no,nullif(regexp_replace(coalesce(d.note,''),'[{}]','','g'),'')
  from deliveries d left join deals x on x.id=d.deal_id where my_farmer_id() is not null and d.farmer_id=my_farmer_id() order by d.day desc, d.ticket desc limit 1000 $$;
revoke all on function public.my_deliveries() from public, anon; grant execute on function public.my_deliveries() to authenticated;
-- dodané = váha z váhy (ako v Exceli „Dodané“), + vyložené jazdy
create or replace function public.trips_sum() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update deals d set delivered_t = coalesce((select sum(netto) from trips t where t.deal_id=d.id and t.status='vylozene'),0)
                                 + coalesce((select sum(coalesce(gross_kg,net_kg))/1000 from deliveries v where v.deal_id=d.id),0)
   where d.id in (coalesce(new.deal_id,old.deal_id), coalesce(old.deal_id,new.deal_id));
  return null;
end $$;
select 'zuctovanie ok';
