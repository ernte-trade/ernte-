-- 💼 PREDAJNÉ ZMLUVY (iba majiteľ) – register predajov odberateľom, párovanie s nákupmi od farmárov, otvorená pozícia a jej ocenenie burzou
-- Odberatelia sú tajní: tabuľky aj funkcie iba is_owner() (farmár ani obchodník ich nevidí).
-- sale_contracts = predajná zmluva (odberateľ, IČO, komodita, t, €/t, parita FCA/DAP, naša doprava €/t pri DAP, termín, dodané t, stav)
-- deal_sale_alloc = väzba nákup (deals) ↔ predaj (sale_contracts), mnoho k mnohým s pridelenými tonami
--   (názov deal_* → pri vymazaní obchodu cez deal_delete sa väzba zmaže sama)
-- Pozícia na komoditu: nakúpené a nepredané t, predané a nenakúpené t, otvorená = rozdiel; ocenenie burzou (market_px: MATIF €/t,
--   CBOT sója prepočítaná kurzom EUR/USD z bota „Trhové ceny“), komodity bez burzy naším výkupným cenníkom.
-- Strážca (pg_cron predaj-pozicie každých 30 min): otvorená pozícia > 500 t alebo zmena hodnoty > 10 000 € za deň → push majiteľovi priorita 5
--   (najviac raz denne na komoditu a dôvod). Nákupy: bez testovacích farmárov a archívu (deal_live), bez návrhov a zrušených.

create table if not exists public.sale_contracts(
  id uuid primary key default gen_random_uuid(),
  no text unique,
  buyer_id text references public.sell_buyers(id) on delete set null,
  buyer text not null check (length(btrim(buyer))>0),
  ico text,
  com text not null,
  tons numeric(12,2) not null check (tons>0 and tons<1000000),
  price numeric(10,2) not null check (price>0 and price<5000),
  parity text not null default 'DAP' check (parity in ('FCA','DAP')),
  dop numeric(10,2) not null default 0 check (dop>=0 and dop<1000),
  term text,
  delivered_t numeric(12,2) not null default 0 check (delivered_t>=0),
  status text not null default 'podpisana' check (status in ('navrh','podpisana','dodava','dodana','fakturacia','zaplatena','zrusena')),
  note text,
  archived boolean not null default false,
  created_by text default lower(coalesce(auth.jwt()->>'email','')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
create index if not exists sale_contracts_com on public.sale_contracts(com) where not archived;

create table if not exists public.deal_sale_alloc(
  sale_id uuid not null references public.sale_contracts(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  tons numeric(12,2) not null check (tons>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(sale_id,deal_id));
create index if not exists deal_sale_alloc_deal on public.deal_sale_alloc(deal_id);

alter table public.sale_contracts enable row level security;
alter table public.deal_sale_alloc enable row level security;
revoke all on public.sale_contracts, public.deal_sale_alloc from anon;
drop policy if exists sale_contracts_own on public.sale_contracts;
create policy sale_contracts_own on public.sale_contracts for select using (is_owner());
drop policy if exists deal_sale_alloc_own on public.deal_sale_alloc;
create policy deal_sale_alloc_own on public.deal_sale_alloc for select using (is_owner());
-- zápis iba cez funkcie nižšie (kontrola ton a komodít)
revoke insert, update, delete on public.sale_contracts, public.deal_sale_alloc from authenticated;
grant select on public.sale_contracts, public.deal_sale_alloc to authenticated;

-- burzová (alebo náhradná) cena komodity v €/t na ocenenie pozície
create or replace function public.sale_px(p_com text) returns jsonb language sql stable security definer set search_path=public as $$
  with m as (select case when p_com='repka' then 'repka' when p_com in ('psenica_p','psenica_k') then 'psenica' when p_com='kukurica' then 'kukurica' when p_com='soja' then 'soja_usc_bu' end sym),
  x as (select mp.name, mp.contract, mp.updated_at,
          coalesce(mp.eur_t, case when mp.unit='USc/bu' and fx.price>0 then mp.price/100*36.7437/fx.price end) eur
        from market_px mp join m on mp.sym=m.sym left join market_px fx on fx.sym='eurusd')
  select coalesce(
    (select jsonb_build_object('px',round(eur,2),'src',coalesce(name,'burza')||coalesce(' '||contract,''),'kind','burza','at',updated_at) from x where eur is not null and eur>0),
    (select jsonb_build_object('px',price,'src','náš výkupný cenník (komodita bez burzy)','kind','cennik','at',updated_at) from prices where com=p_com and price is not null),
    jsonb_build_object('px',null,'src','bez ceny','kind','none')) $$;
revoke all on function public.sale_px(text) from public, anon, authenticated;

-- súhrn bez mien odberateľov a farmárov (pre strážcu a AI poradcu)
create or replace function public.sale_summary() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pos jsonb; zml jsonb; tot jsonb;
begin
  with s as (select * from sale_contracts where not archived and status not in ('navrh','zrusena')),
  d as (select x.* from deals x where deal_live(x) and x.status not in ('navrh','zruseny')),
  a as (select a.sale_id, a.deal_id, a.tons, s.com scom, d.com dcom, s.price sp, s.dop, d.price bp from deal_sale_alloc a join s on s.id=a.sale_id join d on d.id=a.deal_id),
  da as (select deal_id, sum(tons) t from a group by 1),
  sa as (select sale_id, sum(tons) t from a group by 1),
  dl as (select d.com, d.tons, d.price, greatest(d.tons-coalesce(da.t,0),0) rest from d left join da on da.deal_id=d.id),
  sl as (select s.com, s.tons, s.price-s.dop net, greatest(s.tons-coalesce(sa.t,0),0) rest from s left join sa on sa.sale_id=s.id),
  c as (select com from dl union select com from sl),
  p as (select c.com,
     coalesce((select sum(tons) from dl where dl.com=c.com),0) nakup_t,
     coalesce((select sum(tons) from sl where sl.com=c.com),0) predaj_t,
     coalesce((select sum(rest) from dl where dl.com=c.com),0) long_t,
     (select round(sum(rest*price)/nullif(sum(rest),0),2) from dl where dl.com=c.com) long_px,
     coalesce((select sum(rest) from sl where sl.com=c.com),0) short_t,
     (select round(sum(rest*net)/nullif(sum(rest),0),2) from sl where sl.com=c.com) short_px,
     coalesce((select sum(tons) from a where a.scom=c.com),0) par_t,
     coalesce((select sum(tons*(sp-dop-bp)) from a where a.scom=c.com),0) par_eur
   from c)
  select coalesce(jsonb_object_agg(p.com, jsonb_build_object(
     'komodita',cennik_nm(p.com),'nakupene_t',p.nakup_t,'predane_t',p.predaj_t,'sparovane_t',p.par_t,
     'marza_sparovane_eur',round(p.par_eur),'marza_sparovane_eur_t',case when p.par_t>0 then round(p.par_eur/p.par_t,2) end,
     'nakupene_nepredane_t',p.long_t,'nepredane_priemer_nakup_eur_t',p.long_px,
     'predane_nenakupene_t',p.short_t,'nenakupene_priemer_predaj_eur_t',p.short_px,
     'otvorena_t',p.long_t-p.short_t,
     'cena_eur_t',(sale_px(p.com)->>'px')::numeric,'cena_zdroj',sale_px(p.com)->>'src',
     'hodnota_eur',round((p.long_t-p.short_t)*(sale_px(p.com)->>'px')::numeric))),'{}'::jsonb)
  into pos from p where p.nakup_t>0 or p.predaj_t>0;

  select coalesce(jsonb_agg(x order by x->>'vytvorene' desc),'[]'::jsonb) into zml from (
    select jsonb_build_object('cislo',s.no,'komodita',s.com,'ton',s.tons,'cena_eur_t',s.price,'parita',s.parity,'doprava_eur_t',s.dop,'termin',s.term,
      'dodane_t',s.delivered_t,'stav',s.status,'vytvorene',s.created_at::date,
      'sparovane_t',coalesce((select sum(a.tons) from deal_sale_alloc a join deals d on d.id=a.deal_id where a.sale_id=s.id and deal_live(d) and d.status not in ('navrh','zruseny')),0),
      'marza_eur',(select round(sum(a.tons*(s.price-s.dop-d.price))) from deal_sale_alloc a join deals d on d.id=a.deal_id where a.sale_id=s.id and deal_live(d) and d.status not in ('navrh','zruseny'))) x
    from sale_contracts s where not s.archived and s.status not in ('zaplatena','zrusena') order by s.created_at desc limit 25) q;

  select jsonb_build_object('otvorena_t',coalesce(sum((v->>'otvorena_t')::numeric),0),'hodnota_eur',coalesce(sum((v->>'hodnota_eur')::numeric),0),
     'marza_sparovane_eur',coalesce(sum((v->>'marza_sparovane_eur')::numeric),0)) into tot from jsonb_each(pos) e(k,v);

  return jsonb_build_object('pozicie',pos,'spolu',tot,'predajne_zmluvy_otvorene',zml,
    'eurusd',(select price from market_px where sym='eurusd'),
    'poznamka','Otvorená pozícia = nakúpené a nepredané − predané a nenakúpené (t). Hodnota = otvorená t × burza (MATIF €/t, CBOT sója cez EUR/USD), komodity bez burzy náš výkupný cenník. Marža páru = predajná cena − naša doprava pri DAP − nákupná cena. Nákupy bez návrhov, zrušených, archívu a testovacích farmárov.');
end $$;
revoke all on function public.sale_summary() from public, anon, authenticated;

-- všetko pre obrazovku Obchody → 💼 Predaj (iba majiteľ)
create or replace function public.sale_book() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare sales jsonb; dl jsonb; buyers jsonb;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'no',s.no,'buyer_id',s.buyer_id,'buyer',s.buyer,'ico',s.ico,'com',s.com,'tons',s.tons,'price',s.price,
      'parity',s.parity,'dop',s.dop,'term',s.term,'delivered_t',s.delivered_t,'status',s.status,'note',s.note,'archived',s.archived,'created_at',s.created_at,
      'alloc',(select coalesce(jsonb_agg(jsonb_build_object('deal_id',d.id,'no',d.no,'farmer',f.name,'com',d.com,'tons',a.tons,'buy',d.price,'status',d.status,
                 'live',deal_live(d) and d.status not in ('navrh','zruseny'),
                 'm_t',round(s.price-s.dop-d.price,2),'m_eur',round(a.tons*(s.price-s.dop-d.price),2)) order by d.no),'[]'::jsonb)
               from deal_sale_alloc a join deals d on d.id=a.deal_id left join farmers f on f.id=d.farmer_id where a.sale_id=s.id))
      order by s.archived, s.created_at desc),'[]'::jsonb) into sales from sale_contracts s;
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'no',d.no,'farmer',f.name,'com',d.com,'tons',d.tons,'price',d.price,'status',d.status,'term',d.term,
      'alloc_t',coalesce((select sum(a.tons) from deal_sale_alloc a join sale_contracts s on s.id=a.sale_id where a.deal_id=d.id and not s.archived and s.status<>'zrusena'),0))
      order by d.created_at desc),'[]'::jsonb) into dl
    from deals d left join farmers f on f.id=d.farmer_id where deal_live(d) and d.status not in ('navrh','zruseny');
  begin
    select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'coms',b.coms) order by b.sort, b.name),'[]'::jsonb) into buyers from sell_buyers b where b.active;
  exception when others then buyers:='[]'::jsonb; end;
  return jsonb_build_object('sales',sales,'deals',dl,'buyers',buyers,'sum',sale_summary(),'at',now());
end $$;
revoke all on function public.sale_book() from public, anon; grant execute on function public.sale_book() to authenticated;

create or replace function public.sale_save(p jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid:=nullif(p->>'id','')::uuid; v_no text; y text:=to_char(now() at time zone 'Europe/Bratislava','YYYY'); al numeric; t numeric; pr numeric; dp numeric; dv numeric;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if coalesce(p->>'com','') not in ('repka','lo','ho','soja','psenica_p','psenica_k','jacmen_k','jacmen_s','kukurica','cirok') then raise exception 'Neznáma komodita.'; end if;
  if length(btrim(coalesce(p->>'buyer','')))=0 then raise exception 'Zadaj odberateľa.'; end if;
  t:=nullif(replace(p->>'tons',',','.'),'')::numeric; pr:=nullif(replace(p->>'price',',','.'),'')::numeric;
  dp:=coalesce(nullif(replace(p->>'dop',',','.'),'')::numeric,0); dv:=coalesce(nullif(replace(p->>'delivered_t',',','.'),'')::numeric,0);
  if t is null or t<=0 then raise exception 'Zadaj množstvo v t.'; end if;
  if pr is null or pr<=0 then raise exception 'Zadaj cenu €/t.'; end if;
  if coalesce(p->>'parity','DAP') not in ('FCA','DAP') then raise exception 'Parita FCA alebo DAP.'; end if;
  if coalesce(p->>'parity','DAP')='FCA' then dp:=0; end if;
  if v_id is null then
    select 'PZ'||y||'/'||(coalesce(max(nullif(substring(no from '^PZ'||y||'/(\d+)$'),'')::int),0)+1) into v_no from sale_contracts;
    insert into sale_contracts(no,buyer_id,buyer,ico,com,tons,price,parity,dop,term,delivered_t,status,note)
      values(v_no,nullif(p->>'buyer_id',''),btrim(p->>'buyer'),nullif(btrim(coalesce(p->>'ico','')),''),p->>'com',t,pr,coalesce(p->>'parity','DAP'),dp,
             nullif(btrim(coalesce(p->>'term','')),''),dv,coalesce(nullif(p->>'status',''),'podpisana'),nullif(btrim(coalesce(p->>'note','')),''))
      returning id into v_id;
  else
    select coalesce(sum(tons),0) into al from deal_sale_alloc where sale_id=v_id;
    if t<al-0.001 then raise exception 'Zmluva má spárované nákupy % t – najprv zníž spárovanie.', al; end if;
    if exists(select 1 from deal_sale_alloc a join deals d on d.id=a.deal_id where a.sale_id=v_id and split_part(d.com,'_',1)<>split_part(p->>'com','_',1)) then
      raise exception 'Spárované nákupy sú inej komodity.'; end if;
    update sale_contracts set buyer_id=nullif(p->>'buyer_id',''), buyer=btrim(p->>'buyer'), ico=nullif(btrim(coalesce(p->>'ico','')),''), com=p->>'com', tons=t, price=pr,
      parity=coalesce(p->>'parity','DAP'), dop=dp, term=nullif(btrim(coalesce(p->>'term','')),''), delivered_t=dv, status=coalesce(nullif(p->>'status',''),status),
      note=nullif(btrim(coalesce(p->>'note','')),''), updated_at=now() where id=v_id;
    if not found then raise exception 'Zmluva neexistuje.'; end if;
  end if;
  return v_id;
end $$;
revoke all on function public.sale_save(jsonb) from public, anon; grant execute on function public.sale_save(jsonb) to authenticated;

create or replace function public.sale_archive(p_id uuid, p_on boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  update sale_contracts set archived=coalesce(p_on,true), updated_at=now() where id=p_id;
end $$;
revoke all on function public.sale_archive(uuid,boolean) from public, anon; grant execute on function public.sale_archive(uuid,boolean) to authenticated;

-- spárovanie nákup ↔ predaj (0 t = zrušiť väzbu)
create or replace function public.sale_alloc_set(p_sale uuid, p_deal uuid, p_tons numeric) returns jsonb language plpgsql security definer set search_path=public as $$
declare s sale_contracts; d deals; os numeric; od numeric;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if coalesce(p_tons,0)<=0 then delete from deal_sale_alloc where sale_id=p_sale and deal_id=p_deal; return jsonb_build_object('ok',true,'deleted',true); end if;
  select * into s from sale_contracts where id=p_sale; if s.id is null then raise exception 'Predajná zmluva neexistuje.'; end if;
  select * into d from deals where id=p_deal; if d.id is null then raise exception 'Nákup neexistuje.'; end if;
  if split_part(d.com,'_',1)<>split_part(s.com,'_',1) then raise exception 'Nákup (%) a predaj (%) sú rôzne komodity.', cennik_nm(d.com), cennik_nm(s.com); end if;
  select coalesce(sum(tons),0) into os from deal_sale_alloc where sale_id=p_sale and deal_id<>p_deal;
  if os+p_tons>s.tons+0.001 then raise exception 'Predajná zmluva má iba % t, už spárované % t.', s.tons, os; end if;
  select coalesce(sum(a.tons),0) into od from deal_sale_alloc a join sale_contracts x on x.id=a.sale_id where a.deal_id=p_deal and a.sale_id<>p_sale and not x.archived and x.status<>'zrusena';
  if od+p_tons>d.tons+0.001 then raise exception 'Nákup % má iba % t, už predané % t.', d.no, d.tons, od; end if;
  insert into deal_sale_alloc(sale_id,deal_id,tons) values(p_sale,p_deal,p_tons)
    on conflict(sale_id,deal_id) do update set tons=excluded.tons, updated_at=now();
  return jsonb_build_object('ok',true,'m_t',round(s.price-s.dop-d.price,2),'m_eur',round(p_tons*(s.price-s.dop-d.price),2));
end $$;
revoke all on function public.sale_alloc_set(uuid,uuid,numeric) from public, anon; grant execute on function public.sale_alloc_set(uuid,uuid,numeric) to authenticated;

-- číslo s medzerami po tisícoch (258 500)
create or replace function public.sale_fmt(x numeric) returns text language sql immutable as $$
  select case when x is null then '–' else regexp_replace(round(x)::text,'(\d)(?=(\d{3})+$)','\1 ','g') end $$;

-- strážca otvorenej pozície: > 500 t alebo zmena hodnoty > 10 000 € za deň → push majiteľovi priorita 5, raz denne na komoditu a dôvod
create or replace function public.sale_pos_tick() returns text language plpgsql security definer set search_path=public as $$
declare st jsonb; today text:=to_char(now() at time zone 'Europe/Bratislava','YYYY-MM-DD'); pos jsonb; r record; val numeric; net numeric; v0 numeric; n int:=0;
  lim_t numeric; lim_v numeric; cfg jsonb; L text:=chr(10)||'👉 ERNTE Trade & Logistic: Obchody → 💼 Predaj';
begin
  select value into cfg from ai_state where key='sale_pos_cfg';
  lim_t:=coalesce((cfg->>'t')::numeric,500); lim_v:=coalesce((cfg->>'eur')::numeric,10000);
  select value into st from ai_state where key='sale_pos';
  pos:=coalesce(sale_summary()->'pozicie','{}'::jsonb);
  if st is null or st->>'d' is distinct from today then
    st:=jsonb_build_object('d',today,'v0',(select coalesce(jsonb_object_agg(key,(value->>'hodnota_eur')::numeric),'{}'::jsonb) from jsonb_each(pos) where value->>'hodnota_eur' is not null),'sent','{}'::jsonb);
  end if;
  for r in select key com, value x from jsonb_each(pos) loop
    net:=coalesce((r.x->>'otvorena_t')::numeric,0); val:=(r.x->>'hodnota_eur')::numeric;
    if val is not null and not (st->'v0' ? r.com) then st:=jsonb_set(st,array['v0',r.com],'0'::jsonb); end if;
    if abs(net)>lim_t and not (st->'sent' ? (r.com||'|t')) then
      perform owner_push('💼 Otvorená pozícia · '||cennik_nm(r.com)||': '||case when net>0 then 'nepredané ' else 'nenakúpené ' end||round(abs(net))||' t',
        case when net>0 then 'Nakúpené od farmárov a nepredané: ' else 'Predané odberateľom a nenakúpené: ' end||round(abs(net))||' t (limit '||round(lim_t)||' t)'||
        coalesce(', hodnota pri '||(r.x->>'cena_zdroj')||' '||round((r.x->>'cena_eur_t')::numeric)||' €/t ≈ '||sale_fmt(abs(val))||' €','')||'.'||L,5,'chart_with_upwards_trend');
      st:=jsonb_set(st,array['sent',r.com||'|t'],to_jsonb(now())); n:=n+1;
    end if;
    v0:=(st->'v0'->>r.com)::numeric;
    if val is not null and v0 is not null and abs(val-v0)>lim_v and not (st->'sent' ? (r.com||'|v')) then
      perform owner_push('💼 Pozícia '||cennik_nm(r.com)||': hodnota '||case when val>v0 then '+' else '−' end||sale_fmt(abs(val-v0))||' € za deň',
        'Hodnota otvorenej pozície ('||round(net)||' t) sa dnes zmenila z '||sale_fmt(v0)||' € na '||sale_fmt(val)||' € (limit '||sale_fmt(lim_v)||' €)'||
        coalesce(' · '||(r.x->>'cena_zdroj')||' '||round((r.x->>'cena_eur_t')::numeric)||' €/t','')||'.'||L,5,'chart_with_upwards_trend');
      st:=jsonb_set(st,array['sent',r.com||'|v'],to_jsonb(now())); n:=n+1;
    end if;
  end loop;
  st:=st||jsonb_build_object('at',now(),'pos',pos);
  insert into ai_state(key,value) values('sale_pos',st) on conflict(key) do update set value=excluded.value, updated_at=now();
  return 'ok '||n;
end $$;
revoke all on function public.sale_pos_tick() from public, anon, authenticated;

do $$ begin
  begin perform cron.unschedule('predaj-pozicie'); exception when others then null; end;
  perform cron.schedule('predaj-pozicie','11,41 * * * *','select public.sale_pos_tick()');
end $$;

-- prehľad pre AI: + predajné zmluvy a otvorená pozícia (obchody_predaj_pozicie); ostatné bez zmeny
create or replace function public.ai_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m0 text:=quote_literal((date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava')::text); kp jsonb; fm jsonb; mz numeric; old numeric; nk numeric;
begin
  -- KPI z aplikácie: mzdy vždy z jedného výpočtu (Vodiči a mzdy, pomerne k dnešku) – rovnako ako flotila_zisk_mesiac, zisk sa prepočíta
  begin
    select value||jsonb_build_object('aktualizovane',to_char(updated_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')) into kp from ai_state where key='kpi';
    fm:=fleet_month(); mz:=(fm->>'mzdy_eur')::numeric;
    if kp is not null and kp->>'obdobie'='m' and mz is not null then
      old:=coalesce((kp->>'mzdy_eur')::numeric,0); nk:=coalesce((kp->>'naklady_spolu_eur')::numeric,0)-old+mz;
      kp:=kp||jsonb_build_object('mzdy_eur',mz,'mzdy_zdroj','Flotila → Vodiči a mzdy (rovnako ako flotila_zisk_mesiac)','mzdy_z_aplikacie_eur',old,'mzdy_poznamka',fm->>'mzdy_poznamka','naklady_spolu_eur',round(nk),
        'zisk_eur',round((kp->>'obrat_eur')::numeric-nk),'zisk_do_dnes_pomerne_eur',round((kp->>'obrat_eur')::numeric-nk),
        'zisk_cely_mesiac_plne_pevne_eur',round((kp->>'obrat_eur')::numeric-nk+coalesce((kp->>'pevne_eur')::numeric,0)-coalesce((kp->>'pevne_eur_cely_mesiac')::numeric,0)),
        'zisk_poznamka','');
    end if;
  exception when others then null;
  end;
  return jsonb_build_object(
   'teraz', to_char(now() at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),
   'cennik_eur_t', ai_part($q$select coalesce(jsonb_object_agg(com,coalesce(price::text,'nezadané')),'{}') from prices$q$),
   'cennik_bez_ceny', ai_part($q$select coalesce(jsonb_agg(c),'[]') from unnest(array['repka','lo','ho','soja','psenica_p','psenica_k','jacmen_k','jacmen_s','kukurica','cirok']) c where not exists(select 1 from prices p where p.com=c and p.price is not null)$q$),
   'cennik_platny_do', ai_part($q$select coalesce((select value->>'valid' from settings where key='pricelist'),'nezadané')$q$),
   'obchody_podla_stavu', ai_part($q$select coalesce(jsonb_object_agg(status, x),'{}') from (select status, jsonb_build_object('pocet',count(*),'ton',sum(tons),'dodane_t',sum(delivered_t),'hodnota_eur',round(sum(tons*price))) x from deals where deal_live(deals) group by status) s$q$),
   'otvorene_obchody', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select d.no, f.name farmar, d.com komodita, d.tons ton, d.delivered_t dodane_t, d.price cena, d.status stav, d.term termin, d.created_at::date vytvorene from deals d join farmers f on f.id=d.farmer_id where deal_live(d) and d.status not in ('zaplateny','zruseny') order by d.created_at desc limit 25) x$q$),
   'obchody_predaj_pozicie', ai_part($q$select public.sale_summary()$q$),
   'nove_poziadavky', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select r.kind typ, f.name farmar, r.com, r.tons, r.price, r.pickup_date, r.note, r.created_at::date from requests r join farmers f on f.id=r.farmer_id where r.status='nova' order by r.created_at desc limit 15) x$q$),
   'flotila_kpi_mesiac_z_databazy', ai_fleet_kpi(),
   'flotila_po_autach_mesiac', ai_part('select coalesce(jsonb_agg(x),''[]'') from (select coalesce(plate,vehicle_id) auto, round(sum(distance)) km, round(sum(fuel_consumed)) l, case when sum(distance)>=100 then round(100*sum(fuel_consumed)/nullif(sum(distance),0),1)::text else ''málo dát'' end l_100km, round(sum(refuel_l)) natankovane_l from rides where start_at>='||m0||'::timestamptz group by 1 order by 2 desc nulls last) x'),
   'flotila_po_vodicoch', ai_fleet_drivers(),
   'flotila_zisk_mesiac', fleet_month(),
   'flotila_zisk_mesiac_skupiny', ai_part($q$select jsonb_build_object('region',fleet_month((now() at time zone 'Europe/Bratislava')::date,'region'),'eu',fleet_month((now() at time zone 'Europe/Bratislava')::date,'eu'),'sluzobne',fleet_month((now() at time zone 'Europe/Bratislava')::date,'sluzobne'),'traktory',fleet_month((now() at time zone 'Europe/Bratislava')::date,'traktory'))$q$),
   'zaplatene_nie_v_nadrzi', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters chyba_l, to_char(at at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') kedy, place stanica, st stav, left(note,400) popis from fleet_events where kind='paid_not_tank' and at>='2026-07-01' order by at desc limit 40) x$q$),
   'kalibracia_snimacov', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('auto',coalesce(v.plate,v.name,v.id),'tankovani',c.n,'median_pomer',c.ratio_med,'priemer_pomer',c.ratio_avg,'koeficient',c.coef,'podozrenie',c.flagged,'pravidlo',c.rule,'objem_nadrze_l',c.tank_real,'max_hladina_90_dni',c.max90,'hladina_nad_objem',c.over_cap,'kalibracia_datum',c.calib_date)),'[]') from veh_calib c join cmd_vehicles v on v.id=c.vehicle_id where c.flagged or c.over_cap or c.n>=5$q$),
   'karty_priradenie', ai_part($q$select coalesce(value->'rows','[]') from ai_state where key='card_assign'$q$),
   'kontroly_kariet_30_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where kind in ('card_offhours','card_double','card_far','paid_not_tank') and at>now()-interval '30 days' group by kind) x$q$),
   'tankovacie_data', ai_part('select fuel_data_status()'),
   'alarmy_stav', ai_part($q$select jsonb_build_object('udalosti',(select coalesce(jsonb_object_agg(st,n),'{}') from (select st,count(*) n from fleet_events where at>now()-interval '30 days' and kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank','limiter','no_signal') group by st) a),
      'artefakty_a_kalibracia',(select coalesce(jsonb_object_agg(flag,n),'{}') from (select flag,count(*) n from fleet_events where flag is not null and at>='2026-07-01' group by flag) b),
      'auta_na_servise',(select value from fleet_cfg where key='service'))$q$),
   'nalezy_flotila', fleet_findings(),
   'nadrz_dvor', ai_part('select yard_fuel_balance()'),
   'odstavene_auta', ai_part($q$select coalesce((select jsonb_agg(coalesce(v.plate,v.id)) from cmd_vehicles v where coalesce((select (value->>v.id)::boolean from fleet_cfg where key='parked'),false)),'[]')$q$),
   'auta_teraz', ai_part($q$select jsonb_build_object('spolu',count(*),'ide',count(*) filter (where speed>3 and gps_at>now()-interval '20 min')) from cmd_vehicles$q$),
   'nafta_bilancia_7_dni', ai_part('select public.fuel_balance(7)'),
   'nafta_bilancia_30_dni', ai_part('select public.fuel_balance(30)'),
   'nafta_poklesy_v_stati_bez_vypadkov_dat', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters l, lvl_from, lvl_to, to_char(t_from at time zone 'Europe/Bratislava','DD.MM HH24:MI') od, to_char(t_to at time zone 'Europe/Bratislava','DD.MM HH24:MI') do_, place miesto, note from fleet_events where kind='fuel_drop' and flag is null and st<>'falosny' and at>now()-interval '30 days' order by at desc limit 40) x$q$),
   'udalosti_7_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '7 days' group by kind) x$q$),
   'posledne_alarmy_nafta', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, plate, driver, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where at>now()-interval '7 days' and kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank','limiter','no_signal') and flag is null and st in ('novy','riesim') order by at desc limit 10) x$q$),
   'nafta_precerpanie_medzi_autami', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auta, driver vodici, liters l, place miesto, note popis, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where kind='fuel_transfer' and at>now()-interval '40 days' order by at desc limit 20) x$q$),
   'aktivne_auta_bez_signalu', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select e.plate auto, e.driver posledny_vodic, e.place posledna_poloha, floor(extract(epoch from now()-v.gps_at)/3600)::int hodin from fleet_events e join cmd_vehicles v on v.id=e.vehicle_id where e.kind='no_signal' and v.gps_at=e.t_from and v.gps_at<now()-interval '12 hours') x$q$),
   'alarmy_z_aplikacie', ai_part($q$select value->'alarmy' from ai_state where key='kpi'$q$),
   'nastavenia_nakladov', ai_part($q$select value from fleet_cfg where key='costs'$q$),
   'kpi_z_aplikacie', coalesce(kp,'"majiteľ ešte neotvoril Flotilu"'::jsonb),
   'register_poruseni', ai_register(),
   'tankovacie_karty_vypis', ai_part($q$select jsonb_build_object('dokladov_40_dni',count(*),'litre',round(coalesce(sum(liters),0)),'sparovane_so_sondou',count(*) filter (where m_state='sparovane'),
       'sonda_nezaznamenala',count(*) filter (where m_state='bez_sondy'),'nezname_auto',count(*) filter (where m_state='nezname_auto'),
       'najvacsie_rozdiely',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(plate,card) auto, to_char(at at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') kedy, station stanica, round(liters) doklad_l, round(m_rise) sonda_l, round(liters-coalesce(m_rise,0)) rozdiel_l from fuel_card where at>now()-interval '40 days' and m_state in ('sparovane','bez_sondy') order by abs(liters-coalesce(m_rise,0)) desc limit 10) x))
       from fuel_card where at>now()-interval '40 days'$q$),
   'diagnostika', ai_diag(),
   'dokumenty_archiv', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind typ, driver vodic, title nazov, status stav, to_char(created_at at time zone 'Europe/Bratislava','DD.MM.YYYY') datum from ai_docs order by created_at desc limit 40) x$q$),
   'posledne_upravy_ai', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x$q$));
exception when others then return jsonb_build_object('chyba_prehladu',SQLERRM);
end $function$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-02','💼 Predajné zmluvy, párovanie s nákupmi a otvorená pozícia','Obchody → 💼 Predaj – predajné zmluvy','iba majiteľ',array['owner'],
 'Register predajných zmlúv (odberateľ, IČO, komodita, t, €/t, parita FCA/DAP, termín, dodané t, stav). Ku každej zmluve sa pripárujú nákupy od farmárov (aj čiastočne, viac nákupov na jeden predaj) – marža €/t a € za každý pár. Otvorená pozícia po komoditách (nakúpené a nepredané, predané a nenakúpené) ocenená burzou MATIF/CBOT. Pozícia nad 500 t alebo zmena hodnoty o viac ako 10 000 € za deň = upozornenie do mobilu (raz denne). Údaje vidí aj AI poradca.'
where not exists(select 1 from app_novinky where titul like '💼 Predajné zmluvy%');

select 'predajne zmluvy ok';
