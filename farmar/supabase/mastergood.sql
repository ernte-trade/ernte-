-- 7. 11. 2026 (príkaz majiteľa – „AGRO-SOMOTOR OUTPUT ENGINE (MASTERGOOD CONTRACTS)“ + „BENCHMARK 200 KM, FREIGHT CONVERSION & OWNER GATE“)
-- ERNTE predáva Master Good Kft. (Kisvárda): tovar naložený FCA Agro-Somotor, VALKO vezie CPT Kisvárda, faktúra ERNTE → Master Good.
-- 1) BENCHMARK 200 km (mg_bench): najvyššia cena odberateľov a konkurencie v okruhu 200 km od Somotora (vzdušne; ponuky ≤ 21 dní, Konkurenčné ceny ≤ 14 dní,
--    bez neskoršieho odberu, „nad 500 t“, mokrej a západu; plávajúce ceny posunuté s dnešnou burzou ako odb_models), DAP/DDP prepočítané na „loco Somotor“
--    (− naša doprava sell_dop, cesta = vzdušne × 1,25) + prémia GMP+/ISCC/QS (3 €/t) = NAJNIŽŠIA POVOLENÁ CENA tovaru FCA Agro-Somotor.
--    Zmluvu ani faktúru pre Master Good pod ňou NEJDE schváliť (mg_doc_approve).
-- 2) DOPRAVA Z GPS: km zo skutočných jázd (rides, Commander) × 1,60 €/km ÷ netto t = €/t na faktúre (CPT Kisvárda).
-- 3) TÝŽDENNÝ AUDIT VLHKOSTI: vážený priemer vlhkosti za kalendárny týždeň, zrážka iba fyzický úbytok vody M × (V̄ − Vc)/(100 − Vc);
--    vyššia zrážka Master Good alebo manko nad toleranciu → návrh reklamácie (nič neodíde samo).
-- 4) BRÁNA MAJITEĽA: každá zmluva, faktúra, vyúčtovanie dopravy a týždenný audit vznikne ako „ČAKÁ NA SCHVÁLENIE MAJITEĽOM“ + push Martinovi;
--    schvaľuje iba Martin (price_main) tlačidlom „SCHVÁLIŤ A ODOSLAŤ HOTOVÉ PRE MASTERGOOD“ → nemenný záznam zmien (zz_audit). E-mail sa neodosiela (mail_off) –
--    po schválení PDF a zdieľanie z telefónu, adresa sa skopíruje.

-- ---------- nastavenie ----------
insert into ai_state(key,value) values('mg_cfg',jsonb_build_object(
  'prem',3,'r_km',200,'ekm',1.60,'road',1.25,'tol_w',0.3,'tol_ded',20,'email','',
  'origin',jsonb_build_object('n','Agro-Somotor s.r.o. · Somotor','la',48.4039271,'lo',21.8093966),
  'dest',jsonb_build_object('n','Master Good Kft. · Kisvárda','la',48.2161,'lo',22.0789),
  'buyer',jsonb_build_object('n','MASTER GOOD Kft.','a','Ipari u. 9., 4600 Kisvárda, Magyarország','id','Cégjegyzékszám 15-09-066318','vat',''),
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
  k jsonb; res jsonb;
begin
  select data->'items' into k from kalk_store where path='pricelist' and id='konk';
  with mp as (select sym, eur_t px, contract, to_char(mk_term(contract),'YYYY-MM') ym from market_px where eur_t>0),
  b as (select * from sell_buyers),
  so as (select 'odberateľ'::text src, coalesce(b.name,o.buyer) who, o.com, upper(coalesce(nullif(trim(o.del),''),'DAP')) del, nullif(trim(o.site),'') site,
           coalesce(o.period,'') per, o.d, o.price, o.bz_val bz,
           coalesce(b.float_burza,false) and (b.float_coms is null or cardinality(b.float_coms)=0 or o.com=any(b.float_coms)) fl
         from sell_offers o left join b on b.id=o.buyer
         where o.d>=current_date-21 and o.price>0 and coalesce(nullif(o.cur,''),'EUR')='EUR' and o.buyer is distinct from 'mastergood'
           and (o.valid_to is null or o.valid_to>=current_date)),
  ko as (select case when coalesce(i->>'sell','')='true' then 'odberateľ' else 'konkurencia' end src, coalesce(i->>'who','?') who, i->>'com' com,
           upper(coalesce(nullif(trim(i->>'del'),''),'DAP')) del, nullif(trim(i->>'place'),'') site, trim(coalesce(i->>'term','')||' '||coalesce(i->>'per','')) per,
           (i->>'d')::date d, (i->>'price')::numeric price, case when (i->>'bz') ~ '^[0-9]+(\.[0-9]+)?$' then (i->>'bz')::numeric end bz,
           coalesce((select bb.float_burza and (bb.float_coms is null or cardinality(bb.float_coms)=0 or (i->>'com')=any(bb.float_coms))
                     from b bb where coalesce(bb.rx,'')<>'' and coalesce(i->>'who','') ~* odb_rx(bb.rx) limit 1),false) fl
         from jsonb_array_elements(coalesce(k,'[]'::jsonb)) i
         where (i->>'price') ~ '^[0-9]+(\.[0-9]+)?$' and (i->>'d') ~ '^\d{4}-\d\d-\d\d$' and (i->>'d')::date>=current_date-14
           and coalesce(i->>'who','') !~* 'master\s*good'),
  a as (select * from so union all select * from ko),
  f as (select a.*, m.px, m.contract kon,
          case when a.fl and m.px is not null then
            round(m.px+(a.price-coalesce(odb_kontrakt_at(odb_bz(a.com),m.ym,a.d),a.bz,odb_burza_at(odb_bz(a.com),a.d))),2) end shifted
        from a left join mp m on m.sym=odb_bz(a.com)
        where a.com is not null and (p_com is null or a.com=p_com)
          and a.per !~* '(odber\s*[0-9]|nad\s*500|[1-4]\s*q|q\s*/|/\s*2[7-9]\M|202[7-9])'
          and not (a.per ~* 'mokr' and a.per !~* 'such')
          and coalesce(a.site,'')||' '||a.who !~* 'hamburg|z[aá]pad'),
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
        'floor',round(max(z.fca) filter (where z.inr)+prem,2),
        'prem',prem,'n',count(*) filter (where z.inr),
        'best',(select to_jsonb(q) from (select z2.src,z2.who,z2.site,z2.del,z2.price,z2.pnow,z2.air,z2.rkm,z2.dop,z2.fca,z2.d,z2.per
                 from z z2 where z2.com=z.com and z2.inr order by z2.fca desc nulls last limit 1) q),
        'rows',(select jsonb_agg(to_jsonb(q) order by q.inr desc, q.fca desc nulls last) from (
                 select z2.src,z2.who,z2.site,z2.del,z2.price,z2.pnow,z2.shifted is not null fl,z2.kon,z2.air,z2.rkm,z2.dop,z2.fca,z2.d,z2.per,z2.inr,
                   case when not z2.inr then case when z2.air is null then 'chýba poloha miesta' else 'mimo '||rr||' km' end end why
                 from z z2 where z2.com=z.com order by z2.inr desc, z2.fca desc nulls last limit 12) q)) v
    from z group by z.com) t;
  return jsonb_build_object('at',now(),'r_km',rr,'prem',prem,'origin',c->'origin','com',res);
end $function$;

create or replace function public.mg_bench(p_com text default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin if not price_main() then raise exception 'Iba Martin.'; end if; return mg_bench_sys(p_com); end $$;

-- ---------- tabuľky ----------
create table if not exists public.mg_ship(
  id bigserial primary key,
  d date not null default current_date,
  com text not null default 'kukurica',
  spz text, vodic text, cmr text,
  t_load numeric check (t_load is null or (t_load>0 and t_load<60)),
  t_mg numeric check (t_mg is null or (t_mg>0 and t_mg<60)),
  moist numeric check (moist is null or (moist>=0 and moist<50)),
  impur numeric check (impur is null or (impur>=0 and impur<50)),
  ded_kg numeric check (ded_kg is null or ded_kg>=0),
  km numeric check (km is null or (km>=0 and km<3000)),
  km_src text check (km_src is null or km_src in ('gps','rucne')),
  rides text[],
  sc_id uuid,
  price numeric check (price is null or (price>0 and price<5000)),
  fa_id bigint,
  note text,
  created_by text default lower(coalesce(auth.jwt()->>'email','')),
  created_at timestamptz not null default now(),
  updated_at timestamptz);
create index if not exists mg_ship_d on public.mg_ship(d desc);
alter table public.mg_ship enable row level security;
drop policy if exists mg_ship_own on public.mg_ship;
create policy mg_ship_own on public.mg_ship for all to authenticated using (coalesce(public.is_owner(),false)) with check (coalesce(public.is_owner(),false));
grant select, insert, update, delete on public.mg_ship to authenticated;
grant usage, select on sequence public.mg_ship_id_seq to authenticated;

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

-- zmena dodávky, ktorá už je v schválenej faktúre → iba dobropisom
create or replace function public.mg_ship_trg() returns trigger language plpgsql as $$
begin
  if tg_op='DELETE' then
    if old.fa_id is not null then raise exception 'Dodávka je v schválenej faktúre – zmazať sa nedá (iba dobropis).'; end if;
    return old; end if;
  new.updated_at:=now();
  if old.fa_id is not null and (old.d,old.com,old.t_load,old.t_mg,old.moist,old.ded_kg,old.km,old.price,old.sc_id) is distinct from
                               (new.d,new.com,new.t_load,new.t_mg,new.moist,new.ded_kg,new.km,new.price,new.sc_id) then
    raise exception 'Dodávka je v schválenej faktúre – množstvo, cena, km ani vlhkosť sa nedajú zmeniť (iba dobropis).'; end if;
  return new;
end $$;
drop trigger if exists mg_ship_trg on public.mg_ship;
create trigger mg_ship_trg before update or delete on public.mg_ship for each row execute function public.mg_ship_trg();

-- ---------- 2) + 3) podklady dokladov ----------
create or replace function public.mg_floor_sys(p_com text, p_sc uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare rd record; b jsonb;
begin
  if p_sc is not null then
    select * into rd from mg_docs where kind='zmluva' and ref=p_sc::text and stav='schvalene' and floor is not null order by ok_at desc limit 1;
    if found then return jsonb_build_object('floor',rd.floor,'src','zmluva','d',rd.created_at::date); end if;
  end if;
  b:=mg_bench_sys(p_com)->'com'->p_com;
  return jsonb_build_object('floor',b->'floor','src','dnes','best',b->'best','prem',b->'prem','n',b->'n');
end $$;

create or replace function public.mg_doc_build(p_kind text, p_ref text) returns jsonb
 language plpgsql stable security definer set search_path=public as $function$
#variable_conflict use_column
declare c jsonb:=mg_cfg(); ekm numeric:=coalesce((c->>'ekm')::numeric,1.60); tolw numeric:=coalesce((c->>'tol_w')::numeric,0.3); told numeric:=coalesce((c->>'tol_ded')::numeric,20);
  od date; dd date; s jsonb; t jsonb; g jsonb; lines jsonb; cl jsonb; sc record; fl jsonb; miss int:=0; goods numeric; fok boolean; wp numeric; wf numeric; ben jsonb;
begin
  if p_kind='zmluva' then
    begin select * into sc from sale_contracts where id=p_ref::uuid; exception when others then return null; end;
    if not found then return null; end if;
    fl:=mg_bench_sys(sc.com)->'com'->sc.com;
    return jsonb_build_object('title','Kúpna zmluva '||coalesce(sc.no,'')||' · Master Good','suma',round(coalesce(sc.tons,0)*coalesce(sc.price,0),2),'price',sc.price,'floor',fl->'floor',
      'bench',fl,
      'data',jsonb_build_object('sc',to_jsonb(sc)-'created_by','vc',mg_vnorm(sc.com),'tolw',tolw,'ekm',ekm,'cfg',c-'geo',
        'parita_fca',coalesce(sc.parity,'') ~* 'fca|somotor' or coalesce(sc.parity,'')='',
        'floor',fl->'floor','floor_ok',case when fl->>'floor' is null or sc.price is null then null else sc.price>=(fl->>'floor')::numeric end));
  end if;
  if p_kind not in ('faktura','doprava','audit') then raise exception 'Neznámy druh dokladu.'; end if;
  if p_ref !~ '^\d{4}-W\d{2}$' then raise exception 'Týždeň v tvare 2026-W45.'; end if;
  od:=to_date(replace(p_ref,'-W','-'),'IYYY-IW'); dd:=od+6;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'d',m.d,'com',m.com,'spz',m.spz,'vodic',m.vodic,'cmr',m.cmr,'t_load',m.t_load,'t_mg',m.t_mg,
      't',coalesce(m.t_mg,m.t_load),'moist',m.moist,'impur',m.impur,'ded_kg',m.ded_kg,'km',m.km,'km_src',m.km_src,
      'eur',case when m.km is not null then round(m.km*ekm,2) end,
      'eur_t',case when m.km is not null and coalesce(m.t_mg,m.t_load)>0 then round(m.km*ekm/coalesce(m.t_mg,m.t_load),2) end,
      'price',coalesce(m.price,s2.price),'sc',m.sc_id,'sc_no',s2.no,'fa',m.fa_id) order by m.d,m.id),'[]'::jsonb) into s
    from mg_ship m left join sale_contracts s2 on s2.id=m.sc_id
    where m.d between od and dd and coalesce(m.t_mg,m.t_load) is not null and (p_kind<>'faktura' or m.fa_id is null);
  if p_kind='faktura' then
    select count(*) into miss from jsonb_array_elements(s) x where x->>'price' is null;
    select coalesce(jsonb_agg(x),'[]'::jsonb) into s from jsonb_array_elements(s) x where x->>'price' is not null;
  end if;
  if jsonb_array_length(s)=0 then return null; end if;

  if p_kind='doprava' then
    select jsonb_build_object('n',count(*),'km',coalesce(sum((x->>'km')::numeric),0),'eur',round(coalesce(sum((x->>'km')::numeric),0)*ekm,2),
        't',sum((x->>'t')::numeric) filter (where x->>'km' is not null),'bez_km',count(*) filter (where x->>'km' is null),
        'gps',count(*) filter (where x->>'km_src'='gps')) into t from jsonb_array_elements(s) x;
    t:=t||jsonb_build_object('eur_t',case when (t->>'t')::numeric>0 then round((t->>'eur')::numeric/(t->>'t')::numeric,2) end);
    return jsonb_build_object('title','Vyúčtovanie dopravy CPT Kisvárda · '||p_ref,'od',od,'do',dd,'suma',t->'eur',
      'data',jsonb_build_object('ships',s,'tot',t,'ekm',ekm,'cfg',c-'geo'));
  end if;

  if p_kind='audit' then
    with x as (select x->>'com' com, (x->>'t')::numeric t, (x->>'t_load')::numeric tl, (x->>'t_mg')::numeric tm, (x->>'moist')::numeric v,
                 (x->>'ded_kg')::numeric dk, (x->>'price')::numeric p from jsonb_array_elements(s) x),
    a as (select com, count(*) n, sum(t) t, sum(t*v) filter (where v is not null)/nullif(sum(t) filter (where v is not null),0) vw,
            coalesce(sum(t) filter (where v is not null),0) tv, count(*) filter (where v is null) bez_v,
            coalesce(sum(dk),0) dk, count(*) filter (where dk is not null) ndk,
            sum(tl) filter (where tl is not null and tm is not null) tl, sum(tm) filter (where tl is not null and tm is not null) tm,
            sum(p*t) filter (where p is not null)/nullif(sum(t) filter (where p is not null),0) p, mg_vnorm(com) vc
          from x group by com),
    b as (select a.*, case when vw is null then null when vw<=vc then 0 else round(tv*1000*(vw-vc)/(100-vc),0) end loss from a),
    c2 as (select b.*, case when ndk>0 and loss is not null then dk-loss end diff, case when tl>0 then round((tl-tm)/tl*100,3) end mp from b)
    select jsonb_agg(jsonb_build_object('com',com,'n',n,'t',round(t,3),'vw',round(vw,2),'vc',vc,'tv',round(tv,3),'bez_v',bez_v,'loss_kg',loss,'ded_kg',dk,'ndk',ndk,'diff_kg',diff,
        'tl',tl,'tm',tm,'manko_kg',case when tl is not null then round((tl-tm)*1000) end,'manko_pct',mp,'p',round(p,2),
        'claims',(select coalesce(jsonb_agg(q),'[]'::jsonb) from (
            select jsonb_build_object('typ','vlhkost','kg',diff,'eur',case when p is not null then round(diff/1000*p,2) end) q where diff is not null and diff>told
            union all
            select jsonb_build_object('typ','vaha','kg',round((tl-tm)*1000-tl*1000*tolw/100),'eur',case when p is not null then round(((tl-tm)-tl*tolw/100)*p,2) end) where mp is not null and mp>tolw) z)
      ) order by com) into g from c2;
    select coalesce(jsonb_agg(cc),'[]'::jsonb) into cl from jsonb_array_elements(g) gg, jsonb_array_elements(gg->'claims') cc;
    return jsonb_build_object('title','Týždenný audit vlhkosti a váhy · '||p_ref,'od',od,'do',dd,
      'suma',(select coalesce(sum((cc->>'eur')::numeric),0) from jsonb_array_elements(cl) cc),
      'data',jsonb_build_object('ships',s,'g',g,'claims',jsonb_array_length(cl),'tolw',tolw,'told',told,'cfg',c-'geo'));
  end if;

  -- faktúra: fakturačná váha = prevzaté netto − fyzický úbytok vody (týždenný vážený priemer vlhkosti), cena tovaru FCA Agro-Somotor + doprava z GPS
  with x as (select x->>'com' com, (x->>'t')::numeric t, (x->>'moist')::numeric v, (x->>'price')::numeric p, nullif(x->>'sc','')::uuid sc, x->>'sc_no' scno
             from jsonb_array_elements(s) x),
  w as (select com, sum(t*v) filter (where v is not null)/nullif(sum(t) filter (where v is not null),0) vw from x group by com),
  l as (select x.com, x.p, x.sc, max(x.scno) scno, count(*) n, sum(x.t) t, coalesce(sum(x.t) filter (where x.v is not null),0) tv, w.vw, mg_vnorm(x.com) vc
        from x join w using(com) group by x.com, x.p, x.sc, w.vw),
  l2 as (select l.*, case when vw is null or vw<=vc then 0 else round(tv*1000*(vw-vc)/(100-vc),0) end loss from l),
  l3 as (select l2.*, round(t-loss/1000,3) qty, mg_floor_sys(com,sc) fj from l2)
  select jsonb_agg(jsonb_build_object('com',com,'p',p,'sc',sc,'sc_no',scno,'n',n,'t',round(t,3),'vw',round(vw,2),'vc',vc,'loss_kg',loss,'qty',qty,'eur',round(qty*p,2),
      'floor',(fj->>'floor')::numeric,'floor_src',fj->>'src','floor_ok',case when fj->>'floor' is null then null else p>=(fj->>'floor')::numeric end) order by com,p),
    jsonb_object_agg(com||'|'||p||'|'||coalesce(sc::text,''),fj->'best')
    into lines, ben from l3;
  select jsonb_build_object('km',coalesce(sum((x->>'km')::numeric),0),'eur',round(coalesce(sum((x->>'km')::numeric),0)*ekm,2),
      't',sum((x->>'t')::numeric) filter (where x->>'km' is not null),'bez_km',count(*) filter (where x->>'km' is null)) into t from jsonb_array_elements(s) x;
  t:=t||jsonb_build_object('eur_t',case when (t->>'t')::numeric>0 then round((t->>'eur')::numeric/(t->>'t')::numeric,2) end);
  select round(sum((l->>'eur')::numeric),2), bool_and((l->>'floor_ok')::boolean) filter (where l->>'floor_ok' is not null) into goods, fok from jsonb_array_elements(lines) l;
  select (l->>'p')::numeric, (l->>'floor')::numeric into wp, wf from jsonb_array_elements(lines) l
    order by case when l->>'floor' is null then 1e9 else (l->>'p')::numeric-(l->>'floor')::numeric end limit 1;
  return jsonb_build_object('title','Faktúra Master Good · '||p_ref,'od',od,'do',dd,'suma',round(goods+(t->>'eur')::numeric,2),'price',wp,'floor',wf,'bench',ben,
    'data',jsonb_build_object('ships',s,'lines',lines,'frt',t,'goods',goods,'total',round(goods+(t->>'eur')::numeric,2),'ekm',ekm,'miss',miss,'floor_ok',fok,'cfg',c-'geo'));
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
  if id is null then raise exception 'Nie je z čoho pripraviť doklad (žiadne dodávky v týždni%).', case when p_kind='faktura' then ' s cenou, ktoré ešte nie sú vo faktúre' else '' end; end if;
  return id;
end $$;

-- ---------- 4) brána majiteľa ----------
create or replace function public.mg_doc_approve(p_id bigint, p_ok boolean default true, p_why text default null) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare rd mg_docs; em text:=lower(coalesce(auth.jwt()->>'email','')); n int; vno text;
begin
  if not price_main() then raise exception 'Schvaľuje iba Martin.'; end if;
  select * into rd from mg_docs where id=p_id for update;
  if not found then raise exception 'Doklad neexistuje.'; end if;
  if rd.stav<>'caka' then raise exception 'Doklad už nie je na schválenie (%).', rd.stav; end if;
  if p_ok and rd.kind in ('zmluva','faktura') and (rd.data->>'floor_ok')='false' then
    raise exception '⛔ Zákaz fakturácie pod benchmarkom: cena % €/t je nižšia ako % €/t (najvyššia cena v okruhu 200 km + prémia GMP+/ISCC/QS).', rd.price, rd.floor; end if;
  vno:=rd.no;
  if p_ok then
    if rd.kind='faktura' then
      if exists(select 1 from mg_ship m where m.id in (select (x->>'id')::bigint from jsonb_array_elements(rd.data->'ships') x) and m.fa_id is not null) then
        raise exception 'Niektorá dodávka už je v inej faktúre – priprav faktúru znova.'; end if;
      select count(*)+1 into n from mg_docs where kind='faktura' and stav='schvalene' and date_part('year',ok_at)=date_part('year',now());
      vno:='MG-F-'||to_char(now(),'YYYY')||'-'||lpad(n::text,3,'0');
      update mg_ship set fa_id=rd.id where id in (select (x->>'id')::bigint from jsonb_array_elements(rd.data->'ships') x);
    elsif rd.kind='doprava' then vno:='VALKO-MG-'||rd.ref;
    elsif rd.kind='audit' then vno:='MG-A-'||rd.ref;
    else vno:=coalesce(rd.data->'sc'->>'no','MG-Z-'||rd.id); end if;
  end if;
  update mg_docs set stav=case when p_ok then 'schvalene' else 'zamietnute' end, ok_at=now(), ok_by=em, why=nullif(trim(coalesce(p_why,'')),''), no=vno where id=p_id;
  return (select to_jsonb(x)-'bench' from mg_docs x where x.id=p_id);
end $$;

create or replace function public.mg_docs_push() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.stav='caka' then
    begin
      perform push_send('app','mastergood','mg'||new.id,'🐔 Master Good – čaká na schválenie',
        new.title||' · ČAKÁ NA SCHVÁLENIE MAJITEĽOM – ťukni a schváľ.'||case when (new.data->>'floor_ok')='false' then ' ⛔ Cena je pod benchmarkom 200 km.' else '' end
          ||case when new.kind='audit' and coalesce((new.data->>'claims')::int,0)>0 then ' ⚠️ Návrh reklamácie: '||(new.data->>'claims')||'×.' else '' end,
        4,'https://ernte-trade.github.io/ernte-/farmar/#mastergood','owner',array['mastergood'],interval '10 minutes',push_main_emails(),true,null,null,null,'app',true);
    exception when others then null; end;
  end if;
  return new;
end $$;
drop trigger if exists mg_docs_push on public.mg_docs;
create trigger mg_docs_push after insert on public.mg_docs for each row execute function public.mg_docs_push();

-- predajná zmluva pre Master Good → návrh zmluvy na schválenie (nikdy nezastaví uloženie zmluvy)
create or replace function public.mg_sc_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.buyer_id='mastergood' or coalesce(new.buyer,'') ~* 'master\s*good') and not coalesce(new.archived,false) then
    if tg_op='INSERT' or (old.price,old.tons,old.com,old.term,old.parity,old.buyer_id,old.no) is distinct from (new.price,new.tons,new.com,new.term,new.parity,new.buyer_id,new.no) then
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
    'ship',(select coalesce(jsonb_agg(to_jsonb(m) order by m.d desc, m.id desc),'[]'::jsonb) from mg_ship m where m.d>=current_date-p_days or m.fa_id is null),
    'docs',(select coalesce(jsonb_agg(case when main then to_jsonb(d) else to_jsonb(d)-'bench'-'floor' end order by d.created_at desc),'[]'::jsonb)
            from mg_docs d where d.stav<>'nahradene' and (d.created_at>=now()-make_interval(days=>p_days) or d.stav='caka')),
    'sc',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'no',s.no,'com',s.com,'tons',s.tons,'price',s.price,'parity',s.parity,'term',s.term,'status',s.status,
            'delivered_t',s.delivered_t) order by s.created_at desc),'[]'::jsonb)
          from sale_contracts s where (s.buyer_id='mastergood' or coalesce(s.buyer,'') ~* 'master\s*good') and not coalesce(s.archived,false)),
    'bench',case when main then mg_bench_sys(null) end);
end $$;

-- GPS jazdy auta v daný deň (Commander) – návrh jázd Somotor ↔ Kisvárda
create or replace function public.mg_rides(p_d date, p_spz text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb:=mg_cfg(); p text:=upper(regexp_replace(coalesce(p_spz,''),'[\s-]','','g'));
  ola numeric:=(c->'origin'->>'la')::numeric; olo numeric:=(c->'origin'->>'lo')::numeric; dla numeric:=(c->'dest'->>'la')::numeric; dlo numeric:=(c->'dest'->>'lo')::numeric;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if p='' or p_d is null then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',r.ride_id,'plate',r.plate,'start',r.start_at,'stop',r.stop_at,'from',r.start_addr,'to',r.stop_addr,'km',r.distance,
      'sug',(mg_km(r.lat_start,r.lon_start,ola,olo)<=4 and mg_km(r.lat_stop,r.lon_stop,dla,dlo)<=8) or (mg_km(r.lat_start,r.lon_start,dla,dlo)<=8 and mg_km(r.lat_stop,r.lon_stop,ola,olo)<=4)
             or (coalesce(r.start_addr,'')||' '||coalesce(r.stop_addr,'')) ~* 'kisv[aá]rda')
      order by r.start_at),'[]'::jsonb)
    from rides r where upper(regexp_replace(coalesce(r.plate,''),'[\s-]','','g'))=p
      and (r.start_at at time zone 'Europe/Bratislava')::date=p_d and coalesce(r.distance,0)>0);
end $$;

create or replace function public.mg_cfg_set(p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb:=mg_cfg(); k text; v jsonb; x numeric;
begin
  if not price_main() then raise exception 'Nastavuje iba Martin.'; end if;
  foreach k in array array['prem','r_km','ekm','tol_w','tol_ded','splat'] loop
    if p ? k then
      begin x:=(p->>k)::numeric; exception when others then x:=null; end;
      if x is null or x<0 or (k='prem' and x>30) or (k='r_km' and (x<50 or x>400)) or (k='ekm' and (x<0.5 or x>5)) or (k='tol_w' and x>5) or (k='tol_ded' and x>2000) or (k='splat' and x>120) then
        raise exception 'Neplatná hodnota %: %', k, p->>k; end if;
      c:=jsonb_set(c,array[k],to_jsonb(x)); end if;
  end loop;
  if p ? 'email' then
    if coalesce(p->>'email','')<>'' and (p->>'email') !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'Neplatný e-mail.'; end if;
    c:=jsonb_set(c,'{email}',to_jsonb(coalesce(p->>'email',''))); end if;
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

-- odberateľ Master Good (pre predajné zmluvy; doprava z regiónu iba orientačne)
insert into sell_buyers(id,name,rx,coms,sites,float_burza,sort,active,parita,note)
values('mastergood','Master Good','master\s*good|mastergood',array['kukurica','psenica_k','jacmen_k','soja'],
  '[{"n":"Kisvárda","rx":"kisv","ke":[100,65,35,0],"po":[135,100,35,0]}]'::jsonb,false,90,true,'CPT',
  'Master Good Kft., Ipari u. 9., 4600 Kisvárda (HU). Tovar naložený FCA Agro-Somotor, VALKO vezie CPT Kisvárda. Najnižšia cena = benchmark 200 km + 3 €/t (🐔 Master Good v Obchodoch).')
on conflict (id) do nothing;

-- práva
revoke all on function public.mg_cfg() from public, anon, authenticated;
revoke all on function public.mg_bench_sys(text) from public, anon, authenticated;
revoke all on function public.mg_floor_sys(text,uuid) from public, anon, authenticated;
revoke all on function public.mg_doc_build(text,text) from public, anon, authenticated;
revoke all on function public.mg_doc_make_sys(text,text) from public, anon, authenticated;
revoke all on function public.mg_week_tick() from public, anon, authenticated;
revoke all on function public.mg_geo(text) from public, anon, authenticated;
revoke all on function public.mg_vnorm(text) from public, anon, authenticated;
revoke all on function public.mg_bench(text) from public, anon;
revoke all on function public.mg_doc_make(text,text) from public, anon;
revoke all on function public.mg_doc_approve(bigint,boolean,text) from public, anon;
revoke all on function public.mg_list(int) from public, anon;
revoke all on function public.mg_rides(date,text) from public, anon;
revoke all on function public.mg_cfg_set(jsonb) from public, anon;
grant execute on function public.mg_bench(text), public.mg_doc_make(text,text), public.mg_doc_approve(bigint,boolean,text), public.mg_list(int),
  public.mg_rides(date,text), public.mg_cfg_set(jsonb) to authenticated;

-- nemenný záznam zmien
do $$ begin
  if to_regprocedure('public.audit_trg()') is not null then
    drop trigger if exists zz_audit on public.mg_ship;
    create trigger zz_audit after insert or update or delete on public.mg_ship for each row execute function public.audit_trg('id','{updated_at}','{}');
    drop trigger if exists zz_audit on public.mg_docs;
    create trigger zz_audit after insert or update or delete on public.mg_docs for each row execute function public.audit_trg('id','{}','{}');
  end if;
end $$;

do $$ begin
  perform cron.schedule('mastergood-tyzden','23 5 * * 1','select public.mg_week_tick()');
exception when others then null; end $$;
