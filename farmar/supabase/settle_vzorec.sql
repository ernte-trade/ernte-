-- 2. 11. PRÍKAZ MAJITEĽA – nový vzorec zúčtovania (nahrádza „zrážky iba z váhy“ z 1. 11.):
--   M_fyz = M × (1 − N/100) × (100 − V)/(100 − Vc)   (V ≤ Vc → faktor sušenia 1)
--   M_fakt = M_fyz − (C + S)/P × 1000
--   Z = M_fyz/1000 × P − C − S   (bez priebežného zaokrúhľovania, Z na 2 des. miesta; náklady iba raz)
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
  c as (select b.*, coalesce(b.protein_pct, note_protein(b.note)) pr, coalesce(b.gross_kg,b.net_kg) j, greatest(0,coalesce(b.impurity_pct,0)) p, greatest(0,coalesce(b.broken_pct,0)-coalesce((cfg->>'broken_limit')::numeric,5)) q, coalesce((cfg->'imp_limit'->>b.com)::numeric,0) il from b),
  s as (select c.*, c.p r, case when c.impurity_pct is null and c.net_kg is not null then c.net_kg else c.j*(1-c.p/100) end sk from c),
  u as (select s.*, case when s.moisture_pct is null or s.moisture_pct<=s.nm then s.sk else s.sk*(100-s.moisture_pct)/(100-s.nm) end uk,
      case when s.com like 'psenica%' and s.pr is not null then
        (select (e->>'price')::numeric from wheat_prices w, jsonb_array_elements(w.bands) e where w.contract_no=s.dno and (e->>'min')::numeric<=s.pr order by (e->>'min')::numeric desc limit 1)
      end wp from s),
  a as (select u.*, coalesce(u.wp, nullif(u.dprice,0),
        (select x2.price from deals x2 where x2.farmer_id=u.farmer_id and x2.com=u.com and x2.price>0 order by contract_ord(x2.no) limit 1)) aa from u),
  k as (select a.*,
      case when a.p>a.il then (a.j/1000)*coalesce((cfg->>'clean')::numeric,2.5) else 0 end xe,
      case when a.moisture_pct is null or a.moisture_pct<=a.nm then 0 else (a.sk/1000)*(a.moisture_pct-a.nm)*coalesce((cfg->>'dry')::numeric,3.5) end ye from a)
  select k.ticket,k.day,k.plate,k.com,k.deal_id,k.dno,round(k.j,0),round(k.p,2),k.broken_pct,round(k.r,2),round(k.sk,0),round(k.j-k.sk,0),k.moisture_pct,k.nm,round(k.uk,0),round(k.sk-k.uk,0),
    round(case when k.kgm then case when k.aa>0 then k.xe/k.aa*1000 else 0 end else k.xe end,2),
    round(case when k.kgm then case when k.aa>0 then k.ye/k.aa*1000 else 0 end else k.ye end,2),
    round(case when k.kgm then case when k.aa>0 then (k.xe+k.ye)/k.aa*1000 else 0 end else k.xe+k.ye end,2),
    k.pr, round(k.aa,2),
    round(case when coalesce(k.aa,0)>0 then k.uk-(k.xe+k.ye)/k.aa*1000 else k.uk end,0),
    round(case when coalesce(k.aa,0)=0 then null else k.uk/1000*k.aa-k.xe-k.ye end,2),
    0::numeric, k.kgm,
    nullif(regexp_replace(coalesce(k.note,''),'[{}]','','g'),'')
  from k order by k.day, k.ticket;
end $$;
revoke all on function public.settle_lines(uuid,uuid,date,date) from public, anon; grant execute on function public.settle_lines(uuid,uuid,date,date) to authenticated;


-- dodané do zmluvy = fyzická hmotnosť po čistení a sušení (nie znížená o prepočet nákladov)
create or replace function public.settle_contracts(p_farmer uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare fid uuid:=p_farmer; cfg jsonb; res jsonb; pct numeric;
begin
  if not is_owner() then fid:=my_farmer_id(); if fid is null then raise exception 'Bez prístupu.'; end if; end if;
  select value into cfg from settle_rules where key='main';
  pct:=case when exists(select 1 from farmers f where f.id=fid and xl_norm(f.name)=any(select xl_norm(x) from jsonb_array_elements_text(coalesce(cfg->'tol0','[]')) x)) then 0 else coalesce((cfg->>'tol_pct')::numeric,5) end;
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'no',d.no,'com',d.com,'tons',d.tons,'price',d.price,'status',d.status,'tol_pct',pct,'tol_t',round(d.tons*pct/100,2),
     'scale_t',round(coalesce(l.kg,0)/1000,3),'delivered_t',round(coalesce(l.ik,0)/1000,2),'remain_t',round(d.tons-coalesce(l.ik,0)/1000,2),'fill',case when d.tons>0 then round(coalesce(l.ik,0)/1000/d.tons*100,1) end,
     'tickets',coalesce(l.n,0),'kg_mode',(select xl_norm(f2.name)=any(select xl_norm(z) from jsonb_array_elements_text(coalesce(cfg->'kg_mode','[]')) z) from farmers f2 where f2.id=d.farmer_id),'clean_kg',l.ck,'invoice_kg',l.fk,'invoice_eur',l.ie,'clean_cost',l.cc,'dry_cost',l.dc,'tech_t',l.tt,'last_day',l.ld,
     'last',(select max(contract_ord(x.no)) from deals x where x.farmer_id=d.farmer_id and x.com=d.com and x.status<>'zruseny')=contract_ord(d.no),
     'wheat_bands',(select bands from wheat_prices w where w.contract_no=d.no))
     order by d.com, contract_ord(d.no)),'[]') into res
  from deals d left join lateral (select sum(gross_kg) kg, count(*) n, sum(clean_kg) ck, sum(dry_kg) ik, sum(invoice_kg) fk, sum(invoice_eur) ie, sum(clean_cost) cc, sum(dry_cost) dc, sum(tech_t) tt, max(day) ld
      from settle_lines(d.farmer_id,d.id,null,null)) l on true
  where d.farmer_id=fid and d.status<>'zruseny';
  return jsonb_build_object('farmer',(select jsonb_build_object('id',f.id,'name',f.name,'code',f.code,'addr',f.addr,'phone',f.phone,'email',f.email) from farmers f where f.id=fid),'contracts',res,
    'rules',case when is_owner() then cfg else jsonb_build_object('norm',cfg->'norm','clean',cfg->'clean','dry',cfg->'dry','tol_pct',pct) end);
end $$;
revoke all on function public.settle_contracts(uuid) from public, anon; grant execute on function public.settle_contracts(uuid) to authenticated;

update app_novinky set popis='Zúčtovanie: fyzická hmotnosť M_fyz = netto × (1 − nečistoty %) × (100 − vlhkosť)/(100 − norma); fakturačná hmotnosť = M_fyz − (čistenie + sušenie) ÷ cena × 1000; na úhradu = M_fyz × cena − čistenie − sušenie (náklady sa odpočítajú iba raz).'
 where titul='🧮 Zúčtovanie presne podľa zmluvy';
insert into app_novinky(d,titul,kde,kto,aud,popis)
select current_date,'🧮 Zúčtovanie – nový vzorec (čistenie a sušenie)','Zúčtovanie farmára','majiteľ',array['owner'],
 'Na úhradu = hmotnosť po čistení a sušení × cena − náklad na čistenie − náklad na sušenie. Pri vlhkosti pod normou sa hmotnosť nepridáva.'
where not exists(select 1 from app_novinky where titul='🧮 Zúčtovanie – nový vzorec (čistenie a sušenie)');
