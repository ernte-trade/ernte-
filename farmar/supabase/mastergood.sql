-- 7. 11. 2026 – AGRO-SOMOTOR · SKUPINA MASTER GOOD (príkaz majiteľa „AGRO-SOMOTOR OUTPUT ENGINE (MASTERGOOD CONTRACTS)“ + „BENCHMARK 200 KM,
-- FREIGHT CONVERSION & OWNER GATE“; 05:59 spresnenie majiteľa: „ja som obchodník, dodávam do Somotora – tam je spracovňa, Somotor patrí pod skupinu Master Good“).
-- ERNTE (obchodník) dodáva komoditu do spracovne Agro-Somotor s.r.o. (skupina Master Good); dodávky = vážne lístky Agro-Somotora v `deliveries`
-- (prichádzajú samé z Gmailu, buyer ~ 'somotor'), doprava VALKO = jazdy GPS pri lístku (`ride_id` → rides.distance × 2 tam aj späť).
-- 1) BENCHMARK 200 km (mg_bench): najvyššia cena INÝCH odberateľov a konkurencie v okruhu 200 km od Somotora (bez skupiny Master Good – Agro-Somotor,
--    Master Good, Baromfi; ponuky ≤ 21 dní, Konkurenčné ceny ≤ 14 dní; iba posledná ponuka odberateľa | miesta | parity; bez „odber …“, nad 500 t, mokrej, západu;
--    plávajúce posunuté s burzou), DAP/DDP − naša doprava zo Somotora = loco Somotor; + prémia GMP+/ISCC/QS (3 €/t) = NAJNIŽŠIA CENA DAP Somotor;
--    FCA u farmára = − paušál dopravy Agro-Somotora (fr_std 9,40 €/t). Denné snímky `mg_bench_day` (faktúra porovnáva cenu s benchmarkom v deň dodávky).
-- 2) DOPRAVA Z GPS: km jázd pri lístkoch × 1,60 €/km ÷ netto t = €/t (porovnanie s paušálom 9,40 €/t; na faktúre podľa `fr_mode` gps | pausal | nie).
-- 3) TÝŽDENNÝ AUDIT VLHKOSTI: vážený priemer vlhkosti všetkých lístkov týždňa (váha po čistení = netto + zrážka), zrážka iba fyzický úbytok vody
--    M × (V̄ − Vc)/(100 − Vc) (`metoda` tyzden | listky); zrážka Agro-Somotora nad úbytok + tolerancia → návrh reklamácie SK | HU (nič neodíde samo).
-- 4) BRÁNA MAJITEĽA: zmluva, faktúra, vyúčtovanie dopravy, audit = „ČAKÁ NA SCHVÁLENIE MAJITEĽOM“ + push Martinovi; schvaľuje iba Martin
--    („SCHVÁLIŤ A ODOSLAŤ HOTOVÉ PRE MASTERGOOD“) → záznam zmien (zz_audit), PDF a zdieľanie z telefónu (mail_off). Pod benchmarkom sa schváliť nedá.

-- ---------- nastavenie ----------
insert into ai_state(key,value) values('mg_cfg',jsonb_build_object(
  'prem',3,'r_km',200,'ekm',1.60,'road',1.25,'tol_ded',20,'email','','fr_std',9.4,'ret',2,'fr_mode','gps','metoda','tyzden',
  'buyer_rx','somotor','grp','somotor|master\s*good|baromfi',
  'origin',jsonb_build_object('n','Agro-Somotor s.r.o. · Somotor','la',48.4039271,'lo',21.8093966),
  'buyer',jsonb_build_object('n','Agro-Somotor s.r.o.','a','','id','','vat','','grp','skupina Master Good'),
  'vnorm','{}'::jsonb,
  'geo',jsonb_build_object(
    'somotor',jsonb_build_array(48.4039,21.8094,'SK'),'b[aá]novce',jsonb_build_array(48.6936,21.8306,'SK'),'se[čc]ovce',jsonb_build_array(48.7019,21.6539,'SK'),
    'parchovany',jsonb_build_array(48.7408,21.5917,'SK'),'kendice',jsonb_build_array(48.9203,21.3264,'SK'),'tajba',jsonb_build_array(48.3953,21.7867,'SK'),
    'michalovce',jsonb_build_array(48.7543,21.9195,'SK'),'trebi[šs]ov',jsonb_build_array(48.6286,21.7194,'SK'),'ko[šs]ice',jsonb_build_array(48.7164,21.2611,'SK'),
    'pre[šs]ov',jsonb_build_array(48.9984,21.2339,'SK'),'kr[aá][lľ]ovsk[yý] chlmec',jsonb_build_array(48.4231,21.9811,'SK'),'zbudza',jsonb_build_array(48.8072,21.9792,'SK'),
    't[aá]llya',jsonb_build_array(48.2361,21.2264,'HU'),'tuzs[eé]r',jsonb_build_array(48.3439,22.1186,'HU'),'kisv[aá]rda',jsonb_build_array(48.2161,22.0789,'HU'),
    'z[aá]hony',jsonb_build_array(48.4106,22.1758,'HU'),'s[aá]toralja',jsonb_build_array(48.3953,21.6553,'HU'),'ny[ií]regyh[aá]za',jsonb_build_array(47.9558,21.7167,'HU'),
    'miskolc',jsonb_build_array(48.1035,20.7784,'HU'),'debrecen',jsonb_build_array(47.5316,21.6273,'HU'),'martf',jsonb_build_array(47.0181,20.2828,'HU'),
    'bruck',jsonb_build_array(48.0255,16.7792,'AT'),'pischelsdorf',jsonb_build_array(48.3500,15.9200,'AT'))
)) on conflict (key) do nothing;
-- verzia z noci (odberateľ Master Good Kisvárda) → Agro-Somotor; ostatné nastavenia ostávajú
update ai_state set value=(value-'dest'-'tol_w')||jsonb_build_object(
  'buyer_rx',coalesce(nullif(value->>'buyer_rx',''),'somotor'),'grp',coalesce(nullif(value->>'grp',''),'somotor|master\s*good|baromfi'),
  'fr_std',coalesce(value->'fr_std','9.4'::jsonb),'ret',coalesce(value->'ret','2'::jsonb),'fr_mode',coalesce(nullif(value->>'fr_mode',''),'gps'),
  'metoda',coalesce(nullif(value->>'metoda',''),'tyzden'),
  'origin',jsonb_build_object('n','Agro-Somotor s.r.o. · Somotor','la',48.4039271,'lo',21.8093966),
  'buyer',case when coalesce(value->'buyer'->>'n','') ~* 'somotor' then value->'buyer' else jsonb_build_object('n','Agro-Somotor s.r.o.','a','','id','','vat','','grp','skupina Master Good') end)
where key='mg_cfg';

create or replace function public.mg_cfg() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((select value from ai_state where key='mg_cfg'),'{}'::jsonb) $$;

-- vzdušná vzdialenosť (km)
create or replace function public.mg_km(la1 numeric, lo1 numeric, la2 numeric, lo2 numeric) returns numeric language sql immutable as $$
  select case when la1 is null or lo1 is null or la2 is null or lo2 is null then null else
    round((2*6371*asin(least(1,sqrt(power(sin(radians((la2-la1)::float8)/2),2)+cos(radians(la1::float8))*cos(radians(la2::float8))*power(sin(radians((lo2-lo1)::float8)/2),2)))))::numeric,1) end $$;

-- poloha miesta podľa názvu (kľúče v mg_cfg.geo sú vzory, najdlhšia zhoda vyhráva)
create or replace function public.mg_geo(p text) returns table(la numeric, lo numeric, cc text, k text) language sql stable security definer set search_path=public as $$
  select (e.value->>0)::numeric, (e.value->>1)::numeric, upper(coalesce(e.value->>2,'SK')), e.key
  from jsonb_each(coalesce(public.mg_cfg()->'geo','{}'::jsonb)) e
  where coalesce(p,'')<>'' and p ~* e.key order by length(e.key) desc limit 1 $$;

create or replace function public.mg_vnorm(p_com text) returns numeric language sql stable security definer set search_path=public as $$
  select coalesce((public.mg_cfg()->'vnorm'->>p_com)::numeric, public.ernte_vnorm(p_com), 14) $$;

-- ---------- 1) BENCHMARK 200 km ----------
create or replace function public.mg_bench_sys(p_com text default null) returns jsonb
 language plpgsql stable security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare c jsonb:=mg_cfg(); ola numeric:=(c->'origin'->>'la')::numeric; olo numeric:=(c->'origin'->>'lo')::numeric;
  rr numeric:=coalesce((c->>'r_km')::numeric,200); prem numeric:=coalesce((c->>'prem')::numeric,3); road numeric:=coalesce((c->>'road')::numeric,1.25);
  grp text:=coalesce(nullif(c->>'grp',''),'somotor|master\s*good|baromfi'); frs numeric:=coalesce((c->>'fr_std')::numeric,9.4);
  k jsonb; res jsonb;
begin
  select data->'items' into k from kalk_store where path='pricelist' and id='konk';
  with mp as (select sym, eur_t px, contract, to_char(mk_term(contract),'YYYY-MM') ym from market_px where eur_t>0),
  b as (select * from sell_buyers),
  so as (select 'odberateľ'::text src, coalesce(b.name,o.buyer) who, o.com, upper(coalesce(nullif(trim(o.del),''),'DAP')) del, nullif(trim(o.site),'') site,
           coalesce(o.period,'') per, o.d, o.price, o.bz_val bz,
           coalesce(b.float_burza,false) and (b.float_coms is null or cardinality(b.float_coms)=0 or o.com=any(b.float_coms)) fl
         from sell_offers o left join b on b.id=o.buyer
         where o.d>=current_date-21 and o.price>0 and coalesce(nullif(o.cur,''),'EUR')='EUR' and coalesce(o.buyer,'') not in ('somotor','mastergood') and coalesce(b.name,o.buyer,'') !~* grp
           and (o.valid_to is null or o.valid_to>=current_date)),
  ko as (select case when coalesce(i->>'sell','')='true' then 'odberateľ' else 'konkurencia' end src,
           coalesce((select bb.name from b bb where coalesce(bb.rx,'')<>'' and coalesce(i->>'who','') ~* odb_rx(bb.rx) limit 1),i->>'who','?') who, i->>'com' com,
           upper(coalesce(nullif(trim(i->>'del'),''),'DAP')) del, nullif(trim(i->>'place'),'') site, trim(coalesce(i->>'term','')||' '||coalesce(i->>'per','')) per,
           (i->>'d')::date d, (i->>'price')::numeric price, case when (i->>'bz') ~ '^[0-9]+(\.[0-9]+)?$' then (i->>'bz')::numeric end bz,
           coalesce((select bb.float_burza and (bb.float_coms is null or cardinality(bb.float_coms)=0 or (i->>'com')=any(bb.float_coms))
                     from b bb where coalesce(bb.rx,'')<>'' and coalesce(i->>'who','') ~* odb_rx(bb.rx) limit 1),false) fl
         from jsonb_array_elements(coalesce(k,'[]'::jsonb)) i
         where (i->>'price') ~ '^[0-9]+(\.[0-9]+)?$' and (i->>'d') ~ '^\d{4}-\d\d-\d\d$' and (i->>'d')::date>=current_date-14
           and coalesce(i->>'who','') !~* grp),
  a as (select * from so union all select * from ko),
  -- iba dnešný odber, suchá, bez západu; z každého odberateľa | komodity | parity | miesta iba POSLEDNÁ ponuka (staršia je nahradená)
  a1 as (select a.*, odb_site_key(a.del,coalesce(a.site,'')) sk from a
         where a.com is not null and (p_com is null or a.com=p_com)
           and a.per !~* '(odber\s*[0-9]|nad\s*500|[1-4]\s*q|q\s*/|/\s*2[7-9]\M|202[7-9])'
           and not (a.per ~* 'mokr' and a.per !~* 'such')
           and coalesce(a.site,'')||' '||a.who !~* 'hamburg|z[aá]pad'),
  a2 as (select distinct on (lower(a1.who),a1.com,a1.del,a1.sk) a1.* from a1 order by lower(a1.who),a1.com,a1.del,a1.sk,a1.d desc,a1.price desc),
  f as (select a.*, m.px, m.contract kon,
          case when a.fl and m.px is not null then
            round(m.px+(a.price-coalesce(odb_kontrakt_at(odb_bz(a.com),m.ym,a.d),a.bz,odb_burza_at(odb_bz(a.com),a.d))),2) end shifted
        from a2 a left join mp m on m.sym=odb_bz(a.com)),
  g as (select f.*, coalesce(f.shifted,f.price) pnow, gg.la, gg.lo, gg.cc from f left join lateral mg_geo(f.site) gg on true),
  h as (select g.*, (g.del in ('FCA','EXW') or g.del like 'FCA %' or coalesce(g.site,'') ~* '^\s*fca|farm') loco from g),
  x as (select h.*, case when loco then 0 when la is null then null else mg_km(ola,olo,la,lo) end air from h),
  y as (select x.*, case when air is null then null else round(air*road) end rkm,
          case when loco then 0 when air is null then null else
            sell_dop(jsonb_build_object('ke',jsonb_build_array(round(air*road),case when cc='SK' then round(air*road) else 0 end,
              case when cc='HU' then round(air*road) else 0 end,case when cc='AT' then round(air*road) else 0 end))) end dop
        from x),
  z as (select y.*, case when dop is not null then round(pnow-dop,2) end fca, coalesce(air is not null and air<=rr,false) inr from y)
  select coalesce(jsonb_object_agg(t.com,t.v),'{}'::jsonb) into res from (
    select z.com, jsonb_build_object('com',z.com,
        'max',max(z.fca) filter (where z.inr),
        'floor',round(max(z.fca) filter (where z.inr)+prem,2),'floor_fca',round(max(z.fca) filter (where z.inr)+prem-frs,2),
        'prem',prem,'n',count(*) filter (where z.inr),
        'best',(select to_jsonb(q) from (select z2.src,z2.who,z2.site,z2.del,z2.price,z2.pnow,z2.air,z2.rkm,z2.dop,z2.fca,z2.d,z2.per
                 from z z2 where z2.com=z.com and z2.inr order by z2.fca desc nulls last limit 1) q),
        'rows',(select jsonb_agg(to_jsonb(q) order by q.inr desc, q.fca desc nulls last) from (
                 select z2.src,z2.who,z2.site,z2.del,z2.price,z2.pnow,z2.shifted is not null fl,z2.kon,z2.air,z2.rkm,z2.dop,z2.fca,z2.d,z2.per,z2.inr,
                   case when not z2.inr then case when z2.air is null then 'chýba poloha miesta' else 'mimo '||rr||' km' end end why
                 from z z2 where z2.com=z.com order by z2.inr desc, z2.fca desc nulls last limit 12) q)) v
    from z group by z.com) t;
  return jsonb_build_object('at',now(),'r_km',rr,'prem',prem,'fr_std',frs,'grp',grp,'origin',c->'origin','com',res);
end $function$;

create or replace function public.mg_bench(p_com text default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin if not price_main() then raise exception 'Iba Martin.'; end if; return mg_bench_sys(p_com); end $$;

-- denné snímky benchmarku (faktúra porovnáva cenu lístka s benchmarkom v deň dodávky; staršie dni bez snímky sa neblokujú)
create table if not exists public.mg_bench_day(d date not null, com text not null, floor numeric, floor_fca numeric, best jsonb, n int, at timestamptz default now(), primary key(d,com));
alter table public.mg_bench_day enable row level security;
create or replace function public.mg_bench_snap() returns int language plpgsql security definer set search_path=public as $$
declare b jsonb:=mg_bench_sys(null); n int:=0; k text; v jsonb;
begin
  for k, v in select e.key, e.value from jsonb_each(coalesce(b->'com','{}'::jsonb)) e loop
    if v->>'floor' is not null then
      insert into mg_bench_day(d,com,floor,floor_fca,best,n) values(current_date,k,(v->>'floor')::numeric,(v->>'floor_fca')::numeric,v->'best',(v->>'n')::int)
      on conflict (d,com) do update set floor=excluded.floor, floor_fca=excluded.floor_fca, best=excluded.best, n=excluded.n, at=now();
      n:=n+1; end if;
  end loop;
  return n;
end $$;

-- ---------- tabuľky ----------
create table if not exists public.mg_docs(
  id bigserial primary key,
  kind text not null check (kind in ('zmluva','faktura','doprava','audit')),
  ref text not null, no text, title text not null,
  od date, do_ date,
  data jsonb not null default '{}'::jsonb,
  bench jsonb,
  suma numeric, price numeric, floor numeric,
  stav text not null default 'caka' check (stav in ('caka','schvalene','zamietnute','nahradene')),
  created_at timestamptz not null default now(), created_by text,
  ok_at timestamptz, ok_by text, why text);
create unique index if not exists mg_docs_caka on public.mg_docs(kind,ref) where stav='caka';
create index if not exists mg_docs_at on public.mg_docs(created_at desc);
alter table public.mg_docs enable row level security;
drop policy if exists mg_docs_main on public.mg_docs;
create policy mg_docs_main on public.mg_docs for select to authenticated using (coalesce(public.price_main(),false));
grant select on public.mg_docs to authenticated;

-- lístky, ktoré sú už v schválenej faktúre (druhýkrát sa nefakturujú)
create table if not exists public.mg_inv(ticket text primary key, doc_id bigint not null, at timestamptz not null default now());
alter table public.mg_inv enable row level security;

-- ručné dodávky z noci už netreba (dodávky = vážne lístky Agro-Somotora) – zmaže sa iba prázdna tabuľka
do $$ declare e boolean; begin
  if to_regclass('public.mg_ship') is not null then
    execute 'select not exists(select 1 from public.mg_ship)' into e;
    if e then execute 'drop table public.mg_ship cascade'; execute 'drop function if exists public.mg_ship_trg()'; end if;
  end if;
end $$;

-- ---------- lístky Agro-Somotora ----------
create or replace function public.mg_tix(od date, dd date, p_open boolean default false) returns jsonb
 language plpgsql stable security definer set search_path=public as $function$
#variable_conflict use_column
declare c jsonb:=mg_cfg(); brx text:=coalesce(nullif(c->>'buyer_rx',''),'somotor'); ekm numeric:=coalesce((c->>'ekm')::numeric,1.60);
  ret numeric:=coalesce((c->>'ret')::numeric,2); res jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id',q.ticket,'d',q.day,'com',q.com,'spz',q.plate,'t',round(q.net_kg/1000,3),'tc',round(q.tc/1000,3),
      'imp',q.impurity_pct,'moist',q.v,'vc',q.vc,'ded_kg',q.buyer_dry_kg,
      'phys_kg',case when q.v>q.vc then round(q.tc*(q.v-q.vc)/(100-q.vc)) else 0 end,
      'km',case when q.dist>0 then round(q.dist*ret) end,'km_src',case when q.dist>0 then 'gps' end,
      'eur',case when q.dist>0 then round(q.dist*ret*ekm,2) end,
      'eur_t',case when q.dist>0 and q.net_kg>0 then round(q.dist*ret*ekm/(q.net_kg/1000),2) end,
      'price',nullif(q.sell_price,0),'bv',nullif(q.buyer_value,0),'fa',q.doc_id) order by q.day, q.ticket),'[]'::jsonb) into res
  from (select v.*, v.net_kg+coalesce(v.buyer_dry_kg,0) tc, coalesce(v.buyer_dry_pct,v.moisture_pct) v, mg_vnorm(v.com) vc, r.distance dist, i.doc_id
        from deliveries v left join rides r on r.ride_id=v.ride_id left join mg_inv i on i.ticket=v.ticket
        where coalesce(v.buyer,'') ~* brx and v.day between od and dd and v.net_kg>0 and (not p_open or i.ticket is null)) q;
  return res;
end $function$;

-- najnižšia cena: schválená zmluva → jej benchmark, inak snímka v deň dodávky (± 3 dni), inak dnešný benchmark
create or replace function public.mg_floor_sys(p_com text, p_sc uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare rd record; b jsonb;
begin
  if p_sc is not null then
    select * into rd from mg_docs where kind='zmluva' and ref=p_sc::text and stav='schvalene' and floor is not null order by ok_at desc limit 1;
    if found then return jsonb_build_object('floor',rd.floor,'src','zmluva','d',rd.created_at::date); end if;
  end if;
  b:=mg_bench_sys(p_com)->'com'->p_com;
  return jsonb_build_object('floor',b->'floor','floor_fca',b->'floor_fca','src','dnes','best',b->'best','prem',b->'prem','n',b->'n');
end $$;

create or replace function public.mg_doc_build(p_kind text, p_ref text) returns jsonb
 language plpgsql stable security definer set search_path=public as $function$
#variable_conflict use_column
declare c jsonb:=mg_cfg(); ekm numeric:=coalesce((c->>'ekm')::numeric,1.60); told numeric:=coalesce((c->>'tol_ded')::numeric,20);
  frs numeric:=coalesce((c->>'fr_std')::numeric,9.4); frm text:=coalesce(nullif(c->>'fr_mode',''),'gps'); met text:=coalesce(nullif(c->>'metoda',''),'tyzden');
  od date; dd date; s jsonb; t jsonb; g jsonb; lines jsonb; cl jsonb; sc record; fl jsonb; miss int:=0; goods numeric; fok boolean; wp numeric; wf numeric;
  fe numeric; bvs numeric;
begin
  if p_kind='zmluva' then
    begin select * into sc from sale_contracts where id=p_ref::uuid; exception when others then return null; end;
    if not found then return null; end if;
    fl:=mg_bench_sys(sc.com)->'com'->sc.com;
    wp:=sc.price+case when sc.parity='DAP' then 0 else frs end;   -- porovnanie na úrovni DAP Somotor (FCA + paušál dopravy)
    return jsonb_build_object('title','Kúpna zmluva '||coalesce(sc.no,'')||' · Agro-Somotor','suma',round(coalesce(sc.tons,0)*coalesce(sc.price,0),2),'price',wp,'floor',fl->'floor',
      'bench',fl,
      'data',jsonb_build_object('sc',to_jsonb(sc)-'created_by','vc',mg_vnorm(sc.com),'ekm',ekm,'frs',frs,'fr_mode',frm,'metoda',met,'cfg',c-'geo',
        'dap',sc.parity='DAP','pf',wp,'floor',fl->'floor','floor_fca',fl->'floor_fca',
        'floor_ok',case when fl->>'floor' is null or sc.price is null then null else wp>=(fl->>'floor')::numeric end));
  end if;
  if p_kind not in ('faktura','doprava','audit') then raise exception 'Neznámy druh dokladu.'; end if;
  if p_ref !~ '^\d{4}-W\d{2}$' then raise exception 'Týždeň v tvare 2026-W45.'; end if;
  od:=to_date(replace(p_ref,'-W','-'),'IYYY-IW'); dd:=od+6;
  s:=mg_tix(od,dd,p_kind='faktura');
  if p_kind='faktura' then
    select count(*) into miss from jsonb_array_elements(s) x where x->>'price' is null;
    select coalesce(jsonb_agg(x),'[]'::jsonb) into s from jsonb_array_elements(s) x where x->>'price' is not null;
  end if;
  if jsonb_array_length(s)=0 then return null; end if;

  if p_kind='doprava' then
    select jsonb_agg(x) into g from jsonb_array_elements(s) x where x->>'km' is not null;
    if g is null then return null; end if;
    select jsonb_build_object('n',count(*),'km',sum((x->>'km')::numeric),'eur',round(sum((x->>'eur')::numeric),2),'t',round(sum((x->>'t')::numeric),3),
        'pausal',round(frs*sum((x->>'t')::numeric),2),'vsetky',jsonb_array_length(s)) into t from jsonb_array_elements(g) x;
    t:=t||jsonb_build_object('eur_t',case when (t->>'t')::numeric>0 then round((t->>'eur')::numeric/(t->>'t')::numeric,2) end);
    return jsonb_build_object('title','Vyúčtovanie dopravy do Agro-Somotor · '||p_ref,'od',od,'do',dd,'suma',t->'eur',
      'data',jsonb_build_object('ships',g,'tot',t,'ekm',ekm,'frs',frs,'ret',coalesce((c->>'ret')::numeric,2),'cfg',c-'geo'));
  end if;

  if p_kind='audit' then
    with x as (select x->>'com' com, (x->>'t')::numeric t, (x->>'tc')::numeric tc, (x->>'moist')::numeric v, coalesce((x->>'ded_kg')::numeric,0) dk,
                 coalesce((x->>'phys_kg')::numeric,0) pk, (x->>'price')::numeric p from jsonb_array_elements(s) x),
    a as (select com, count(*) n, sum(t) t, sum(tc) tc, sum(tc*v) filter (where v is not null)/nullif(sum(tc) filter (where v is not null),0) vw,
            coalesce(sum(tc) filter (where v is not null),0) tv, count(*) filter (where v is null) bez_v, sum(dk) dk, count(*) filter (where dk>0) ndk,
            sum(pk) loss_l, sum(p*t) filter (where p is not null)/nullif(sum(t) filter (where p is not null),0) p, mg_vnorm(com) vc
          from x group by com),
    b as (select a.*, case when vw is null or vw<=vc then 0 else round(tv*1000*(vw-vc)/(100-vc)) end loss_w from a),
    b2 as (select b.*, case when met='listky' then loss_l else loss_w end loss from b),
    b3 as (select b2.*, dk-loss diff from b2)
    select jsonb_agg(jsonb_build_object('com',com,'n',n,'t',round(t,3),'tc',round(tc,3),'vw',round(vw,2),'vc',vc,'tv',round(tv,3),'bez_v',bez_v,
        'loss_w',loss_w,'loss_l',loss_l,'loss_kg',loss,'met',met,'ded_kg',dk,'ndk',ndk,'diff_kg',diff,'p',round(p,2),
        'claims',case when diff>told then jsonb_build_array(jsonb_build_object('typ','vlhkost','kg',diff,'eur',case when p is not null then round(diff/1000*p,2) end)) else '[]'::jsonb end
      ) order by com) into g from b3;
    select coalesce(jsonb_agg(cc),'[]'::jsonb) into cl from jsonb_array_elements(g) gg, jsonb_array_elements(gg->'claims') cc;
    return jsonb_build_object('title','Týždenný audit vlhkosti Agro-Somotor · '||p_ref,'od',od,'do',dd,
      'suma',(select coalesce(sum((cc->>'eur')::numeric),0) from jsonb_array_elements(cl) cc),
      'data',jsonb_build_object('ships',s,'g',g,'claims',jsonb_array_length(cl),'told',told,'metoda',met,'cfg',c-'geo'));
  end if;

  -- faktúra: fakturačná váha = váha po čistení − fyzický úbytok vody; cena lístka (FCA) porovnaná s benchmarkom v deň dodávky (FCA + paušál = DAP Somotor)
  with x as (select x->>'id' tk, x->>'com' com, (x->>'d')::date d, (x->>'t')::numeric t, (x->>'tc')::numeric tc, (x->>'moist')::numeric v,
               coalesce((x->>'phys_kg')::numeric,0) pk, (x->>'price')::numeric p from jsonb_array_elements(s) x),
  w as (select com, sum(tc*v) filter (where v is not null)/nullif(sum(tc) filter (where v is not null),0) vw, mg_vnorm(com) vc from x group by com),
  x2 as (select x.*, w.vw, w.vc, (select bd.floor from mg_bench_day bd where bd.com=x.com and bd.d<=x.d and bd.d>=x.d-3 order by bd.d desc limit 1) fl
         from x join w using(com)),
  l as (select com, p, count(*) n, sum(t) t, sum(tc) tc, coalesce(sum(tc) filter (where v is not null),0) tv, sum(pk) loss_l, max(vw) vw, max(vc) vc,
          max(fl) fl, bool_and(p+frs>=fl) filter (where fl is not null) fok, min(d) d0, max(d) d1 from x2 group by com, p),
  l2 as (select l.*, case when met='listky' then loss_l when vw is null or vw<=vc then 0 else round(tv*1000*(vw-vc)/(100-vc)) end loss from l),
  l3 as (select l2.*, round(tc-loss/1000,3) qty from l2)
  select jsonb_agg(jsonb_build_object('com',com,'p',p,'pf',p+frs,'n',n,'t',round(t,3),'tc',round(tc,3),'vw',round(vw,2),'vc',vc,'loss_kg',loss,'qty',qty,
      'eur',round(qty*p,2),'floor',fl,'floor_fca',fl-frs,'floor_ok',fok,'d0',d0,'d1',d1) order by com,p) into lines from l3;
  select jsonb_build_object('km',coalesce(sum((x->>'km')::numeric),0),'eur',round(coalesce(sum((x->>'eur')::numeric),0),2),
      't',round(sum((x->>'t')::numeric) filter (where x->>'km' is not null),3),'n',count(*) filter (where x->>'km' is not null),
      'pausal',round(frs*coalesce(sum((x->>'t')::numeric) filter (where x->>'km' is not null),0),2)) into t from jsonb_array_elements(s) x;
  t:=t||jsonb_build_object('eur_t',case when (t->>'t')::numeric>0 then round((t->>'eur')::numeric/(t->>'t')::numeric,2) end,'mode',frm);
  fe:=case frm when 'gps' then (t->>'eur')::numeric when 'pausal' then (t->>'pausal')::numeric else 0 end;
  select round(sum((l->>'eur')::numeric),2), bool_and((l->>'floor_ok')::boolean) filter (where l->>'floor_ok' is not null) into goods, fok from jsonb_array_elements(lines) l;
  select (l->>'pf')::numeric, (l->>'floor')::numeric into wp, wf from jsonb_array_elements(lines) l
    order by case when l->>'floor' is null then 1e9 else (l->>'pf')::numeric-(l->>'floor')::numeric end limit 1;
  select round(sum((x->>'bv')::numeric),2) into bvs from jsonb_array_elements(s) x;
  return jsonb_build_object('title','Faktúra Agro-Somotor · '||p_ref,'od',od,'do',dd,'suma',round(goods+fe,2),'price',wp,'floor',wf,
    'data',jsonb_build_object('ships',s,'lines',lines,'frt',t,'fe',fe,'goods',goods,'total',round(goods+fe,2),'odb',bvs,'ekm',ekm,'frs',frs,'metoda',met,
      'miss',miss,'floor_ok',fok,'cfg',c-'geo'));
end $function$;

create or replace function public.mg_doc_make_sys(p_kind text, p_ref text) returns bigint language plpgsql security definer set search_path=public as $$
declare b jsonb; nid bigint;
begin
  b:=mg_doc_build(p_kind,p_ref);
  if b is null then return null; end if;
  update mg_docs set stav='nahradene' where kind=p_kind and ref=p_ref and stav='caka';
  insert into mg_docs(kind,ref,title,od,do_,data,bench,suma,price,floor,created_by)
    values(p_kind,p_ref,b->>'title',(b->>'od')::date,(b->>'do')::date,coalesce(b->'data','{}'::jsonb),b->'bench',(b->>'suma')::numeric,(b->>'price')::numeric,(b->>'floor')::numeric,
           coalesce(nullif(lower(auth.jwt()->>'email'),''),'systém'))
    returning id into nid;
  return nid;
end $$;

create or replace function public.mg_doc_make(p_kind text, p_ref text) returns bigint language plpgsql security definer set search_path=public as $$
declare id bigint;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  id:=mg_doc_make_sys(p_kind,p_ref);
  if id is null then raise exception 'Nie je z čoho pripraviť doklad – v týždni nie sú lístky Agro-Somotora%.',
    case when p_kind='faktura' then ' s cenou, ktoré ešte nie sú vo faktúre' when p_kind='doprava' then ' s jazdou GPS' else '' end; end if;
  return id;
end $$;

-- ---------- brána majiteľa ----------
create or replace function public.mg_doc_approve(p_id bigint, p_ok boolean default true, p_why text default null) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare rd mg_docs; em text:=lower(coalesce(auth.jwt()->>'email','')); n int; vno text;
begin
  if not price_main() then raise exception 'Schvaľuje iba Martin.'; end if;
  select * into rd from mg_docs where id=p_id for update;
  if not found then raise exception 'Doklad neexistuje.'; end if;
  if rd.stav<>'caka' then raise exception 'Doklad už nie je na schválenie (%).', rd.stav; end if;
  if p_ok and rd.kind in ('zmluva','faktura') and (rd.data->>'floor_ok')='false' then
    raise exception '⛔ Zákaz fakturácie pod benchmarkom: cena % €/t (DAP Somotor) je nižšia ako % €/t (najvyššia cena v okruhu 200 km + prémia GMP+/ISCC/QS).', rd.price, rd.floor; end if;
  vno:=rd.no;
  if p_ok then
    if rd.kind='faktura' then
      if exists(select 1 from mg_inv i where i.ticket in (select x->>'id' from jsonb_array_elements(rd.data->'ships') x)) then
        raise exception 'Niektorý lístok už je v inej schválenej faktúre – priprav faktúru znova.'; end if;
      select count(*)+1 into n from mg_docs where kind='faktura' and stav='schvalene' and date_part('year',ok_at)=date_part('year',now());
      vno:='AS-F-'||to_char(now(),'YYYY')||'-'||lpad(n::text,3,'0');
      insert into mg_inv(ticket,doc_id) select x->>'id', rd.id from jsonb_array_elements(rd.data->'ships') x on conflict do nothing;
    elsif rd.kind='doprava' then vno:='VALKO-AS-'||rd.ref;
    elsif rd.kind='audit' then vno:='AS-A-'||rd.ref;
    else vno:=coalesce(rd.data->'sc'->>'no','AS-Z-'||rd.id); end if;
  end if;
  update mg_docs set stav=case when p_ok then 'schvalene' else 'zamietnute' end, ok_at=now(), ok_by=em, why=nullif(trim(coalesce(p_why,'')),''), no=vno where id=p_id;
  return (select to_jsonb(x)-'bench' from mg_docs x where x.id=p_id);
end $$;

create or replace function public.mg_docs_push() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.stav='caka' then
    begin
      perform push_send('app','mastergood','mg'||new.id,'🐔 Agro-Somotor – čaká na schválenie',
        new.title||' · ČAKÁ NA SCHVÁLENIE MAJITEĽOM – ťukni a schváľ.'||case when (new.data->>'floor_ok')='false' then ' ⛔ Cena je pod benchmarkom 200 km.' else '' end
          ||case when new.kind='audit' and coalesce((new.data->>'claims')::int,0)>0 then ' ⚠️ Návrh reklamácie vlhkosti.' else '' end,
        4,'https://ernte-trade.github.io/ernte-/farmar/#mastergood','owner',array['mastergood'],interval '10 minutes',push_main_emails(),true,null,null,null,'app',true);
    exception when others then null; end;
  end if;
  return new;
end $$;
drop trigger if exists mg_docs_push on public.mg_docs;
create trigger mg_docs_push after insert on public.mg_docs for each row execute function public.mg_docs_push();

-- predajná zmluva s Agro-Somotor (skupina Master Good) → návrh zmluvy na schválenie (nikdy nezastaví uloženie zmluvy)
create or replace function public.mg_sc_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (coalesce(new.buyer_id,'') in ('somotor','mastergood') or coalesce(new.buyer,'') ~* 'somotor|master\s*good') and not coalesce(new.archived,false) then
    if tg_op='INSERT' or (old.price,old.tons,old.com,old.term,old.parity,old.buyer_id,old.no,old.dop) is distinct from (new.price,new.tons,new.com,new.term,new.parity,new.buyer_id,new.no,new.dop) then
      begin perform mg_doc_make_sys('zmluva',new.id::text); exception when others then null; end;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists zz_mg on public.sale_contracts;
create trigger zz_mg after insert or update on public.sale_contracts for each row execute function public.mg_sc_trg();

-- ---------- pre aplikáciu ----------
create or replace function public.mg_list(p_days int default 120) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare main boolean:=coalesce(price_main(),false);
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  return jsonb_build_object('main',main,
    'cfg',case when main then mg_cfg() else mg_cfg()-'geo'-'prem' end,
    'docs',(select coalesce(jsonb_agg(case when main then to_jsonb(d) else to_jsonb(d)-'bench'-'floor' end order by d.created_at desc),'[]'::jsonb)
            from mg_docs d where d.stav<>'nahradene' and (d.created_at>=now()-make_interval(days=>p_days) or d.stav='caka')),
    'sc',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'no',s.no,'com',s.com,'tons',s.tons,'price',s.price,'parity',s.parity,'dop',s.dop,'term',s.term,'status',s.status,
            'delivered_t',s.delivered_t) order by s.created_at desc),'[]'::jsonb)
          from sale_contracts s where (coalesce(s.buyer_id,'') in ('somotor','mastergood') or coalesce(s.buyer,'') ~* 'somotor|master\s*good') and not coalesce(s.archived,false)),
    'weeks',(select coalesce(jsonb_agg(jsonb_build_object('w',ws.w,'g',a->'data'->'g','tot',d->'data'->'tot') order by ws.w desc),'[]'::jsonb)
             from (select distinct to_char(current_date-7*i,'IYYY-"W"IW') w from generate_series(0,5) i) ws,
                  lateral (select mg_doc_build('audit',ws.w) a, mg_doc_build('doprava',ws.w) d) z where a is not null),
    'tix',(select coalesce(jsonb_agg(z order by z->>'d' desc, z->>'id' desc),'[]'::jsonb) from (select z from jsonb_array_elements(mg_tix(current_date-13,current_date,false)) z
             order by z->>'d' desc, z->>'id' desc limit 120) q),
    'bench',case when main then mg_bench_sys(null) end);
end $$;

-- GPS jazdy auta v daný deň (Commander) – ponechané pre ručnú kontrolu
create or replace function public.mg_rides(p_d date, p_spz text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare p text:=upper(regexp_replace(coalesce(p_spz,''),'[\s-]','','g'));
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if p='' or p_d is null then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',r.ride_id,'plate',r.plate,'start',r.start_at,'stop',r.stop_at,'from',r.start_addr,'to',r.stop_addr,'km',r.distance) order by r.start_at),'[]'::jsonb)
    from rides r where upper(regexp_replace(coalesce(r.plate,''),'[\s-]','','g'))=p and (r.start_at at time zone 'Europe/Bratislava')::date=p_d and coalesce(r.distance,0)>0);
end $$;

create or replace function public.mg_cfg_set(p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb:=mg_cfg(); k text; v jsonb; x numeric;
begin
  if not price_main() then raise exception 'Nastavuje iba Martin.'; end if;
  foreach k in array array['prem','r_km','ekm','tol_ded','splat','fr_std','ret'] loop
    if p ? k then
      begin x:=(p->>k)::numeric; exception when others then x:=null; end;
      if x is null or x<0 or (k='prem' and x>30) or (k='r_km' and (x<50 or x>400)) or (k='ekm' and (x<0.5 or x>5)) or (k='tol_ded' and x>2000)
         or (k='splat' and x>120) or (k='fr_std' and x>50) or (k='ret' and (x<1 or x>3)) then
        raise exception 'Neplatná hodnota %: %', k, p->>k; end if;
      c:=jsonb_set(c,array[k],to_jsonb(x)); end if;
  end loop;
  if p ? 'fr_mode' then if p->>'fr_mode' not in ('gps','pausal','nie') then raise exception 'Doprava: gps, pausal alebo nie.'; end if; c:=jsonb_set(c,'{fr_mode}',p->'fr_mode'); end if;
  if p ? 'metoda' then if p->>'metoda' not in ('tyzden','listky') then raise exception 'Metóda: tyzden alebo listky.'; end if; c:=jsonb_set(c,'{metoda}',p->'metoda'); end if;
  if p ? 'email' then
    if coalesce(p->>'email','')<>'' and (p->>'email') !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'Neplatný e-mail.'; end if;
    c:=jsonb_set(c,'{email}',to_jsonb(coalesce(p->>'email',''))); end if;
  foreach k in array array['n','a','id','vat'] loop
    if p ? ('b_'||k) then c:=jsonb_set(c,array['buyer',k],to_jsonb(left(trim(coalesce(p->>('b_'||k),'')),160))); end if;
  end loop;
  if p ? 'vat' then c:=jsonb_set(c,'{buyer,vat}',to_jsonb(left(coalesce(p->>'vat',''),40))); end if;
  if p ? 'iban' then
    if coalesce(p->>'iban','')<>'' and upper(regexp_replace(p->>'iban','\s','','g')) !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' then raise exception 'Neplatný IBAN.'; end if;
    c:=jsonb_set(c,'{iban}',to_jsonb(upper(trim(coalesce(p->>'iban',''))))); end if;
  if jsonb_typeof(p->'geo_add')='object' then
    for k, v in select e.key, e.value from jsonb_each(p->'geo_add') e loop
      begin perform ''~*k; exception when others then raise exception 'Neplatný názov miesta: %', k; end;
      if jsonb_typeof(v)<>'array' or (v->>0)::numeric not between 40 and 56 or (v->>1)::numeric not between 5 and 30 then raise exception 'Neplatná poloha pre %', k; end if;
      c:=jsonb_set(c,array['geo',lower(k)],jsonb_build_array((v->>0)::numeric,(v->>1)::numeric,upper(coalesce(nullif(v->>2,''),'SK'))));
    end loop; end if;
  if jsonb_typeof(p->'geo_del')='array' then
    for k in select jsonb_array_elements_text(p->'geo_del') loop c:=c #- array['geo',k]; end loop; end if;
  update ai_state set value=c where key='mg_cfg';
  return c;
end $$;

-- týždenne (pondelok ráno): audit, vyúčtovanie dopravy a faktúra za minulý týždeň → na schválenie
create or replace function public.mg_week_tick() returns jsonb language plpgsql security definer set search_path=public as $$
declare w text:=to_char(current_date-7,'IYYY-"W"IW'); k text; n int:=0; nid bigint; e text:='';
begin
  foreach k in array array['audit','doprava','faktura'] loop
    if not exists(select 1 from mg_docs where kind=k and ref=w and stav in ('caka','schvalene')) then
      begin nid:=mg_doc_make_sys(k,w); if nid is not null then n:=n+1; end if; exception when others then e:=e||k||': '||sqlerrm||'; '; end;
    end if;
  end loop;
  return jsonb_build_object('w',w,'n',n,'err',nullif(e,''));
end $$;

-- odberateľ = Agro-Somotor (už je v sell_buyers); samostatný „Master Good“ z noci sa vypne
update sell_buyers set active=false, note='Skupina Master Good – dodávame do spracovne Agro-Somotor (odberateľ somotor). Samostatne sa nepoužíva.' where id='mastergood' and active;

-- práva
do $$ declare f text; begin
  foreach f in array array['public.mg_cfg()','public.mg_bench_sys(text)','public.mg_floor_sys(text,uuid)','public.mg_doc_build(text,text)','public.mg_doc_make_sys(text,text)',
    'public.mg_week_tick()','public.mg_geo(text)','public.mg_vnorm(text)','public.mg_tix(date,date,boolean)','public.mg_bench_snap()'] loop
    execute 'revoke all on function '||f||' from public, anon, authenticated';
  end loop;
  foreach f in array array['public.mg_bench(text)','public.mg_doc_make(text,text)','public.mg_doc_approve(bigint,boolean,text)','public.mg_list(int)','public.mg_rides(date,text)','public.mg_cfg_set(jsonb)'] loop
    execute 'revoke all on function '||f||' from public, anon'; execute 'grant execute on function '||f||' to authenticated';
  end loop;
end $$;

-- nemenný záznam zmien
do $$ begin
  if to_regprocedure('public.audit_trg()') is not null then
    drop trigger if exists zz_audit on public.mg_docs;
    create trigger zz_audit after insert or update or delete on public.mg_docs for each row execute function public.audit_trg('id','{}','{}');
  end if;
end $$;

do $$ begin
  perform cron.schedule('mastergood-tyzden','23 5 * * 1','select public.mg_week_tick()');
  perform cron.schedule('mastergood-benchmark','47 5,15 * * *','select public.mg_bench_snap()');
exception when others then null; end $$;
