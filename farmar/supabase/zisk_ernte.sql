-- 💰 ZISK ERNTE (5. 11. 2026 príkaz majiteľa): zisk = obchod (zúčtovanie odberateľa − zúčtovanie farmára, po lístkoch)
--   − doprava obilia (GPS jazda × 2 × €/km) + flotila VALKO (fleet_month) + kurací trus + agro služby,
--   podrobný rozpis (komodity, odberatelia, farmári, mesiace, úniky) a odporúčania – iba legálne, transparentné, podľa zmlúv.
-- Iba Martin (price_main). Oprava: buyer_dry_kg je ZRÁŽKA za sušenie u odberateľa (kg), nie váha – váha odberateľa = čistá váha − zrážka.

create or replace function public.zk_fmt(x numeric, d int default 0) returns text language sql immutable set search_path=public as $$
  select case when x is null then '–' else
    (case when round(x,d)<0 then '−' else '' end)||
    regexp_replace(split_part(to_char(abs(round(x,d)),'FM999999999990'||case when d>0 then '.'||repeat('0',d) else '' end),'.',1),'(\d)(?=(\d{3})+$)','\1 ','g')
    ||case when d>0 then ','||split_part(to_char(abs(round(x,d)),'FM999999999990.'||repeat('0',d)),'.',2) else '' end end $$;

create or replace function public.zk_pl(n numeric, a text, b text, c text) returns text language sql immutable set search_path=public as $$
  select case when abs(coalesce(n,0))=1 then a when abs(coalesce(n,0)) between 2 and 4 and abs(n)=trunc(abs(n)) then b else c end $$;

create or replace function public.profit_overview(p_from date default null, p_to date default null) returns jsonb
 language plpgsql stable security definer set search_path to 'public' as $function$
declare d0 date:=coalesce(p_from, make_date(extract(year from (current_date - interval '6 months'))::int,7,1)); d1 date:=coalesce(p_to,current_date);
  cfg jsonb:=coalesce((select value from ai_state where key='profit_cfg'),'{}'::jsonb); ekm numeric; ret numeric; res jsonb;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  ekm:=coalesce((cfg->>'ekm')::numeric,1.60); ret:=coalesce((cfg->>'ret')::numeric,2);
  with s as (select * from settle_lines(null,null,d0,d1)),
  t as (
    select s.ticket, s.day, s.com, v.farmer_id, coalesce(f.name,v.farmer_name,'?') farmer, coalesce(nullif(trim(v.buyer),''),'(bez odberateľa)') buyer,
      s.invoice_kg fkg, s.invoice_eur fe, s.price bp, coalesce(s.dry_loss_kg,0) fdry,
      coalesce(v.net_kg, s.clean_kg) - coalesce(v.buyer_dry_kg,0) bkg, coalesce(v.buyer_dry_kg,0) dkg, nullif(v.sell_price,0) sp,
      v.ride_id is not null own,
      (select r.distance from rides r where r.ride_id=v.ride_id limit 1) km
    from s join deliveries v on v.ticket=s.ticket left join farmers f on f.id=v.farmer_id
    where not is_test_name(coalesce(f.name,v.farmer_name,''))),
  x as (
    select t.*, case when sp is not null and bkg>0 then round(sp*bkg/1000,2) end rev, fe cost,
      case when km>0 then round(km*ret*ekm,2) end trn,
      case when sp is not null and bkg>0 and fe is not null then round(sp*bkg/1000-fe,2) end mg
    from t),
  ok as (select * from x where mg is not null)
  select jsonb_build_object(
    'od',d0,'do',d1,'ekm',ekm,'ret',ret,
    'tot',(select jsonb_build_object('n',count(*),'n_ok',count(mg),'t_farm',round(coalesce(sum(fkg) filter (where mg is not null),0)/1000,1),'t_buyer',round(coalesce(sum(bkg) filter (where mg is not null),0)/1000,1),
        'rev',round(coalesce(sum(rev) filter (where mg is not null),0)),'cost',round(coalesce(sum(cost) filter (where mg is not null),0)),'margin',round(coalesce(sum(mg),0)),
        'per_t',round(sum(mg)/nullif(sum(fkg) filter (where mg is not null)/1000,0),2),
        'trn',round(coalesce(sum(trn) filter (where mg is not null),0)),'trn_n',count(trn) filter (where mg is not null),'trn_km',round(coalesce(sum(km) filter (where mg is not null and trn is not null),0)),
        'dry_t',round(coalesce(sum(dkg) filter (where mg is not null),0)/1000,1),'own_t',round(coalesce(sum(bkg) filter (where mg is not null and own),0)/1000,1),
        'no_sell',count(*) filter (where sp is null),'no_buy',count(*) filter (where fe is null)) from x),
    'com',(select coalesce(jsonb_agg(z order by z.margin desc),'[]'::jsonb) from (
        select com, count(*) n, round(sum(fkg)/1000,1) t, round(sum(rev)) rev, round(sum(cost)) cost, round(sum(mg)) margin,
          round(sum(mg)/nullif(sum(fkg)/1000,0),2) per_t, round(sum(rev)/nullif(sum(bkg)/1000,0),2) avg_sell, round(sum(cost)/nullif(sum(fkg)/1000,0),2) avg_buy,
          count(*) filter (where mg<0) n_loss, round(coalesce(sum(trn),0)) trn
        from ok group by com) z),
    'buyer',(select coalesce(jsonb_agg(z order by z.margin desc),'[]'::jsonb) from (
        select buyer, count(*) n, round(sum(bkg)/1000,1) t, round(sum(mg)) margin, round(sum(mg)/nullif(sum(fkg)/1000,0),2) per_t,
          round(sum(rev)/nullif(sum(bkg)/1000,0),2) avg_sell, round((sum(fkg)-sum(bkg))/1000,1) kg_gap_t, string_agg(distinct com,',') coms,
          count(*) filter (where own) n_own, round(coalesce(sum(bkg) filter (where own),0)/1000,1) t_own
        from ok group by buyer) z),
    'farm_best',(select coalesce(jsonb_agg(z order by z.margin desc),'[]'::jsonb) from (
        select farmer, count(*) n, round(sum(fkg)/1000,1) t, round(sum(mg)) margin, round(sum(mg)/nullif(sum(fkg)/1000,0),2) per_t, string_agg(distinct com,',') coms
        from ok group by farmer order by sum(mg) desc limit 10) z),
    'farm_worst',(select coalesce(jsonb_agg(z order by z.per_t),'[]'::jsonb) from (
        select farmer, count(*) n, round(sum(fkg)/1000,1) t, round(sum(mg)) margin, round(sum(mg)/nullif(sum(fkg)/1000,0),2) per_t, string_agg(distinct com,',') coms
        from ok group by farmer having sum(fkg)>=20000 order by sum(mg)/nullif(sum(fkg),0) limit 10) z),
    'month',(select coalesce(jsonb_agg(z order by z.m),'[]'::jsonb) from (
        select to_char(day,'YYYY-MM') m, round(sum(fkg)/1000,1) t, round(sum(mg)) margin, round(sum(mg)/nullif(sum(fkg)/1000,0),2) per_t from ok group by 1) z),
    'leak',jsonb_build_object(
        'weight',(select jsonb_build_object('t',round(coalesce(sum(fkg-bkg) filter (where fkg>bkg),0)/1000,1),'eur',round(coalesce(sum((fkg-bkg)/1000*sp) filter (where fkg>bkg),0)),'n',count(*) filter (where fkg-bkg>0.02*fkg),
                  'net_t',round(coalesce(sum(fkg-bkg),0)/1000,1))
                  from ok where fkg is not null and bkg is not null),
        'weight_top',(select coalesce(jsonb_agg(z order by z.eur desc),'[]'::jsonb) from (
            select ticket, day, com, farmer, buyer, round(fkg) fkg, round(bkg) bkg, round((fkg-bkg)/nullif(fkg,0)*100,1) pct, round((fkg-bkg)/1000*sp) eur
            from ok where fkg-bkg>0.02*fkg order by (fkg-bkg)*sp desc limit 10) z),
        'dry',(select jsonb_build_object('n',count(*),'t',round(coalesce(sum(dkg),0)/1000,1),'eur',round(coalesce(sum(dkg/1000*sp),0))) from ok where dkg>0 and fdry=0),
        'dry_top',(select coalesce(jsonb_agg(z order by z.eur desc),'[]'::jsonb) from (
            select ticket, day, com, farmer, round(dkg) dkg, round(dkg/1000*sp) eur from ok where dkg>0 and fdry=0 order by dkg*sp desc limit 6) z),
        'loss',(select jsonb_build_object('n',count(*),'eur',round(coalesce(sum(mg),0))) from ok where mg<0),
        'loss_top',(select coalesce(jsonb_agg(z order by z.mg),'[]'::jsonb) from (
            select ticket, day, com, farmer, buyer, bp, sp, round(mg) mg from ok where mg<0 order by mg limit 10) z),
        'no_sell_t',(select round(coalesce(sum(fkg),0)/1000,1) from x where sp is null),
        'no_sell_buyers',(select coalesce(jsonb_agg(z),'[]'::jsonb) from (select buyer, count(*) n, round(sum(fkg)/1000,1) t from x where sp is null group by buyer order by count(*) desc limit 6) z))
  ) into res;
  return res;
end $function$;
revoke all on function public.profit_overview(date,date) from public, anon; grant execute on function public.profit_overview(date,date) to authenticated;

create or replace function public.zisk_ernte(p_from date default null, p_to date default null) returns jsonb
 language plpgsql stable security definer set search_path to 'public' as $function$
declare d0 date:=coalesce(p_from, make_date(extract(year from (current_date - interval '6 months'))::int,7,1)); d1 date:=coalesce(p_to,current_date);
  po jsonb; fm jsonb; m date; g text; fl jsonb:='[]'::jsonb; fz numeric:=0; fo numeric:=0; fn numeric:=0; fkm numeric:=0; fest boolean:=false; fpev numeric:=0;
  tr jsonb:='{}'::jsonb; ag jsonb:='{}'::jsonb; sk jsonb:='[]'::jsonb; rc jsonb:='[]'::jsonb; ob numeric; dop numeric; tz numeric:=0; az numeric:=0; tot numeric;
  x jsonb; k jsonb; dd numeric; L jsonb; T jsonb; best jsonb; n int;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  po:=profit_overview(d0,d1); T:=coalesce(po->'tot','{}'::jsonb); L:=coalesce(po->'leak','{}'::jsonb);
  ob:=coalesce((T->>'margin')::numeric,0); dop:=coalesce((T->>'trn')::numeric,0);

  -- 🚛 flotila VALKO po mesiacoch (iba mesiace s GPS km; obrat = faktúry zadané majiteľom, inak odhad km × sadzba)
  for m in select generate_series(date_trunc('month',d0), date_trunc('month',d1), interval '1 month')::date loop
    foreach g in array array['region','eu'] loop
      begin fm:=fleet_month(least((m + interval '1 month' - interval '1 day')::date, d1), g); exception when others then fm:=jsonb_build_object('chyba',sqlerrm); end;
      continue when fm ? 'chyba' or coalesce((fm->>'km')::numeric,0)<=0;
      fl:=fl||jsonb_build_array(jsonb_build_object('m',to_char(m,'YYYY-MM'),'g',g,'km',fm->'km','obrat',fm->'obrat_eur','odhad',fm->'obrat_je_odhad',
          'nafta',fm->'nafta_eur_bez_dph','myto',fm->'myto_eur','mzdy',fm->'mzdy_eur','pevne',fm->'pevne_naklady_do_dnes_pomerne','naklady',fm->'naklady_spolu_eur',
          'zisk',fm->'zisk_do_dnes_pomerne','dni',fm->'dni','dni_m',fm->'dni_v_mesiaci'));
      fz:=fz+coalesce((fm->>'zisk_do_dnes_pomerne')::numeric,0); fo:=fo+coalesce((fm->>'obrat_eur')::numeric,0); fn:=fn+coalesce((fm->>'naklady_spolu_eur')::numeric,0);
      fkm:=fkm+coalesce((fm->>'km')::numeric,0); fpev:=fpev+coalesce((fm->>'pevne_naklady_do_dnes_pomerne')::numeric,0);
      fest:=fest or coalesce((fm->>'obrat_je_odhad')::boolean,false);
    end loop;
  end loop;

  -- 🐔 kurací trus: doručené vývozy (tovar: odberateľ − dodávateľ; doprava je vo flotile VALKO)
  begin
    select jsonb_build_object('n',count(*),'t',round(coalesce(sum((q.s->>'t_sell')::numeric),0),1),
        'trzby',round(coalesce(sum((q.s->>'trus_sum')::numeric),0)),'nakup',round(coalesce(sum((q.s->>'buy_sum')::numeric),0)),
        'doprava_fakt',round(coalesce(sum((q.s->>'trans_sum')::numeric),0)),
        'zisk',round(coalesce(sum((q.s->>'trus_sum')::numeric-(q.s->>'buy_sum')::numeric),0)),
        'plan_n',(select count(*) from trus_orders o2 where o2.day between d0 and d1 and o2.status in ('nahlasene','schvalene','na_ceste')))
      into tr from (select trus_sum(o) s from trus_orders o where o.day between d0 and d1 and o.status='dorucene') q;
    tz:=coalesce((tr->>'zisk')::numeric,0);
  exception when others then tr:=jsonb_build_object('chyba',sqlerrm); tz:=0; end;

  -- 🚜 agro služby: hotové objednávky (tržby − nafta; stroje a mzdy nie sú v údajoch)
  begin
    select jsonb_build_object('n',count(*),'trzby',round(coalesce(sum(coalesce(done_qty*price,total)),0)),
        'nafta',round(coalesce(sum(coalesce(fuel_l,fuel_est_l,0)*coalesce(fuel_price,0)),0)),
        'zisk',round(coalesce(sum(coalesce(done_qty*price,total)),0)-coalesce(sum(coalesce(fuel_l,fuel_est_l,0)*coalesce(fuel_price,0)),0)),
        'plan_n',(select count(*) from agro_orders a2 where a2.status in ('nova','potvrdena','v_praci')))
      into ag from agro_orders where status='hotova' and coalesce(date_to,planned,date_from,created_at::date) between d0 and d1;
    az:=coalesce((ag->>'zisk')::numeric,0);
  exception when others then ag:=jsonb_build_object('chyba',sqlerrm); az:=0; end;

  -- 📦 zostáva vyviezť: nakúpené a nedodané t × (najlepší predaj po doprave dnes − nákupná cena) – odhad, nie je v zisku
  begin
    with d0x as (select d.*, (select ernte_term_last(d.term)) tl from deals d left join farmers f on f.id=d.farmer_id
         where d.status in ('podpisany','odvoz') and not coalesce(d.archived,false) and not is_test_name(coalesce(f.name,''))
           and d.price>0 and d.tons-coalesce(d.delivered_t,0)>greatest(0.05*d.tons,1)),
    o as (select com, coalesce(tl>current_date+60,false) fw, sum(tons-coalesce(delivered_t,0)) t,
            sum((tons-coalesce(delivered_t,0))*price)/nullif(sum(tons-coalesce(delivered_t,0)),0) p, count(*) n
         from d0x group by 1,2),
    b as (select z->>'com' com, coalesce((z->>'fwd')::boolean,false) fw, max((z->>'net')::numeric) net from jsonb_array_elements(coalesce(odb_list(21),'[]'::jsonb)) z
          where z->>'net' is not null and not coalesce((z->>'stale')::boolean,false) group by 1,2)
    select coalesce(jsonb_agg(jsonb_build_object('com',o.com,'fwd',o.fw,'n',o.n,'t',round(o.t,1),'nakup',round(o.p,2),'predaj',b.net,
        'vysledok',case when b.net is not null then round((b.net-o.p)*o.t) end) order by o.fw, o.t desc),'[]'::jsonb)
      into sk from o left join b on b.com=o.com and b.fw=o.fw;
  exception when others then sk:=jsonb_build_array(jsonb_build_object('chyba',sqlerrm)); end;

  tot:=ob-dop+fz+tz+az;

  -- 💡 odporúčania (pravidlá; iba legálne a v súlade so zmluvami – nič skryté pred farmárom)
  for x in select * from jsonb_array_elements(coalesce(po->'com','[]'::jsonb)) loop
    if (x->>'margin')::numeric<0 then
      rc:=rc||jsonb_build_array(jsonb_build_object('k','strata','i','📉','eur',(x->>'margin')::numeric,'go','price',
        't',cennik_nm(x->>'com')||': strata '||zk_fmt((x->>'margin')::numeric)||' €',
        'd','Nakúpené priemerne za '||zk_fmt((x->>'avg_buy')::numeric,2)||' €/t, predané za '||zk_fmt((x->>'avg_sell')::numeric,2)||' €/t ('||zk_fmt((x->>'per_t')::numeric,2)||' €/t'
           ||case when (x->>'n_loss')::int>0 then ', '||(x->>'n_loss')||' '||zk_pl((x->>'n_loss')::numeric,'lístok','lístky','lístkov')||' so stratou' else '' end||'). Nakupuj najviac za najlepší predaj po doprave − marža (strop v Cenníku) a predaj zaisti predajnou zmluvou ešte pred nákupom.'));
    end if;
  end loop;
  if coalesce((L->'loss'->>'n')::int,0)>0 then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','strata','i','🧾','eur',(L->'loss'->>'eur')::numeric,'go','#zisk-loss',
      't',(L->'loss'->>'n')||' '||zk_pl((L->'loss'->>'n')::numeric,'lístok','lístky','lístkov')||' so stratou: '||zk_fmt((L->'loss'->>'eur')::numeric)||' €',
      'd','Odberateľ zaplatil menej, než sme dali farmárovi. Najväčšie: '||coalesce((select string_agg(z->>'ticket'||' (nákup '||zk_fmt((z->>'bp')::numeric)||' → predaj '||zk_fmt((z->>'sp')::numeric)||' €/t)',', ')
          from (select z from jsonb_array_elements(L->'loss_top') z limit 3) q),'')||'. Pred nákupom over cenu u odberateľa a nekupuj nad ňou.'));
  end if;
  if coalesce((L->'weight'->>'eur')::numeric,0)>=300 then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','strata','i','⚖️','eur',-(L->'weight'->>'eur')::numeric,'go','#zisk-weight',
      't','Váha: farmárom o '||zk_fmt((L->'weight'->>'t')::numeric,1)||' t viac, než prevzal odberateľ',
      'd','Asi '||zk_fmt((L->'weight'->>'eur')::numeric)||' € ('||coalesce(L->'weight'->>'n','0')||' '||zk_pl(coalesce((L->'weight'->>'n')::numeric,0),'lístok','lístky','lístkov')||' s rozdielom nad 2 %)'
        ||case when coalesce((L->'weight'->>'net_t')::numeric,0)<0 then '; na iných lístkoch je to naopak – spolu odberateľ prevzal o '||zk_fmt(-(L->'weight'->>'net_t')::numeric,1)||' t viac, než sme zaplatili farmárom' else '' end||'. Skontroluj, či zúčtovanie farmára má na lístku rovnaké nečistoty a vlhkosť ako zúčtovanie odberateľa (zmluva čl. IV), a pri chybe odberateľa podaj reklamáciu.'));
  end if;
  if coalesce((L->'dry'->>'eur')::numeric,0)>=100 then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','strata','i','💧','eur',-(L->'dry'->>'eur')::numeric,'go','zuct',
      't','Sušenie: '||zk_fmt((L->'dry'->>'t')::numeric,1)||' t strhol odberateľ, farmárovi sa neodpočítalo',
      'd',coalesce(L->'dry'->>'n','0')||' '||zk_pl(coalesce((L->'dry'->>'n')::numeric,0),'lístok','lístky','lístkov')||', asi '||zk_fmt((L->'dry'->>'eur')::numeric)||' €. Podľa zmluvy (čl. IV) sa vlhkosť nad normu odpočíta vo fakturačnej váhe – doplň vlhkosť na lístkoch (Zúčtovanie → lístky odberateľa), aby zúčtovanie farmára sedelo so zmluvou.'));
  end if;
  if fz<0 then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','strata','i','🚛','eur',fz,'go','fleet',
      't','Flotila VALKO: '||zk_fmt(fz)||' €',
      'd','Obrat '||zk_fmt(fo)||' €'||case when fest then ' (odhad z km × sadzba, nie z faktúr)' else '' end||', náklady '||zk_fmt(fn)||' € (z toho pevné '||zk_fmt(fpev)||' €), '||zk_fmt(fkm)||' km. '
        ||'Zadaj skutočný obrat z faktúr, prever pevné náklady a vyťaženosť áut; hľadaj spätné náklady (trus, hnojivá, Danube), aby autá nejazdili prázdne.'));
  end if;
  k:=coalesce((select data->'buyers' from kalk_store where path='pricelist' and id='konk'),'{}'::jsonb);
  for x in select * from jsonb_array_elements(coalesce(po->'buyer','[]'::jsonb)) loop
    dd:=null;
    select (e.value->>'dop')::numeric into dd from jsonb_each(case when jsonb_typeof(k)='object' then k else '{}'::jsonb end) e
     where length(e.key)>=4 and lower(x->>'buyer') like lower(e.key)||'%' and coalesce((e.value->>'dop')::numeric,0)>0 limit 1;
    if dd>0 and coalesce((x->>'t_own')::numeric,0)>0 then
      rc:=rc||jsonb_build_array(jsonb_build_object('k','zisk','i','🚚','eur',round(dd*(x->>'t_own')::numeric),'go','zuct',
        't',(x->>'buyer')||' platí '||zk_fmt(dd,1)||' €/t za dopravu, keď vezieme my',
        'd','Naše autá (GPS) odviezli '||zk_fmt((x->>'t_own')::numeric,1)||' t ('||coalesce(x->>'n_own','0')||' '||zk_pl(coalesce((x->>'n_own')::numeric,0),'lístok','lístky','lístkov')||') → až '||zk_fmt(dd*(x->>'t_own')::numeric)||' €. Over v ich zúčtovaní, že príplatok za dopravu je vyplatený, a chýbajúce vyfakturuj.'));
    end if;
  end loop;
  select z into best from jsonb_array_elements(coalesce(po->'com','[]'::jsonb)) z where (z->>'margin')::numeric>0 order by (z->>'per_t')::numeric desc limit 1;
  if best is not null then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','zisk','i','🏆','eur',(best->>'margin')::numeric,'go','farm',
      't','Najviac zarábame na: '||cennik_nm(best->>'com')||' ('||zk_fmt((best->>'per_t')::numeric,2)||' €/t)',
      'd','Spolu '||zk_fmt((best->>'margin')::numeric)||' € z '||zk_fmt((best->>'t')::numeric)||' t. Získaj viac ton tejto komodity – oslov farmárov z okolia (Farmári, Plán na dnes) a ponúkni im odvoz našou dopravou.'));
  end if;
  select z into best from jsonb_array_elements(coalesce(po->'farm_worst','[]'::jsonb)) z order by (z->>'per_t')::numeric limit 1;
  if best is not null and (best->>'per_t')::numeric < coalesce((T->>'per_t')::numeric,0)/2 then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','zisk','i','👨‍🌾','eur',null,'go','farm',
      't','Najnižšia marža: '||(best->>'farmer')||' ('||zk_fmt((best->>'per_t')::numeric,2)||' €/t)',
      'd',zk_fmt((best->>'t')::numeric)||' t, spolu '||zk_fmt((best->>'margin')::numeric)||' €. Pri ďalšom obchode drž zverejnený cenník a prever, či sa mu oplatia individuálne bonusy (⚙️ Podmienky farmára).'));
  end if;
  for x in select * from jsonb_array_elements(sk) loop
    continue when x ? 'chyba' or x->>'vysledok' is null or abs((x->>'vysledok')::numeric)<500;
    rc:=rc||jsonb_build_array(jsonb_build_object('k',case when (x->>'vysledok')::numeric<0 then 'strata' else 'zisk' end,'i','📦','eur',(x->>'vysledok')::numeric,'go','price',
      't','Zostáva vyviezť: '||zk_fmt((x->>'t')::numeric)||' t '||cennik_nm(x->>'com')||case when (x->>'fwd')::boolean then ' (neskorší odber)' else '' end,
      'd','Nakúpené za '||zk_fmt((x->>'nakup')::numeric,2)||' €/t, '||case when (x->>'fwd')::boolean then 'najlepší predaj na neskorší odber po doprave ' else 'dnes najlepší predaj po doprave ' end||zk_fmt((x->>'predaj')::numeric,2)||' €/t → '||zk_fmt((x->>'vysledok')::numeric)||' € (odhad, nie je v zisku). '
        ||case when (x->>'vysledok')::numeric<0 then 'Zváž predaj skôr, než cena klesne ďalej, alebo zaisti cenu predajnou zmluvou.' else 'Zaisti túto cenu predajnou zmluvou, kým platí.' end));
  end loop;
  n:=coalesce((T->>'n_ok')::int,0);
  if n>0 and coalesce((T->>'trn_n')::int,0)<n*0.5 then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','udaje','i','📍','eur',null,'go','zuct',
      't','Doprava obilia je odhad iba z '||coalesce(T->>'trn_n','0')||' '||zk_pl(coalesce((T->>'trn_n')::numeric,0),'lístka','lístkov','lístkov')||' z '||n,
      'd','Ostatné lístky nemajú priradenú GPS jazdu našich áut – viezol ich niekto iný (FCA), alebo jazda nie je spárovaná. Ak sme ich viezli my, doprava stojí viac – prideľ jazdy k lístkom (Zúčtovanie → lístky odberateľa).'));
  end if;
  if coalesce((L->>'no_sell_t')::numeric,0)>0 then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','udaje','i','❓','eur',null,'go','zuct',
      't',zk_fmt((L->>'no_sell_t')::numeric)||' t bez predajnej ceny',
      'd','Tieto lístky nevieme spočítať – nahraj zúčtovanie odberateľa (Zúčtovanie → lístky odberateľa).'));
  end if;
  if fest then
    rc:=rc||jsonb_build_array(jsonb_build_object('k','udaje','i','🧾','eur',null,'go','fleet',
      't','Obrat flotily VALKO je odhad',
      'd','Rátaný z km × sadzba za km, nie z faktúr. Zadaj skutočný obrat za mesiac, nech je zisk dopravy presný.'));
  end if;
  select coalesce(jsonb_agg(z order by case z->>'k' when 'strata' then 0 when 'zisk' then 1 else 2 end,
      case when z->>'k'='strata' then coalesce((z->>'eur')::numeric,0) else -coalesce((z->>'eur')::numeric,0) end),'[]'::jsonb) into rc from jsonb_array_elements(rc) z;

  return jsonb_build_object('od',d0,'do',d1,
    'spolu',jsonb_build_object('zisk',round(tot),'obchod',round(ob),'doprava',round(-dop),'valko',round(fz),'trus',round(tz),'agro',round(az),
        'valko_odhad',fest,'valko_od',(select min(z->>'m') from jsonb_array_elements(fl) z)),
    'obchod',po,
    'valko',jsonb_build_object('mesiace',fl,'obrat',round(fo),'naklady',round(fn),'zisk',round(fz),'km',round(fkm),'pevne',round(fpev),'odhad',fest),
    'trus',tr,'agro',ag,'sklad',sk,'odporucania',rc);
end $function$;
revoke all on function public.zisk_ernte(date,date) from public, anon;
grant execute on function public.zk_fmt(numeric,int), public.zk_pl(numeric,text,text,text) to authenticated; grant execute on function public.zisk_ernte(date,date) to authenticated;

-- 🤖 rozbor od AI: celý zisk ERNTE (obchod, doprava, VALKO, trus, agro, odporúčania)
create or replace function public.profit_ai_now(p_from date default null, p_to date default null) returns text
 language plpgsql security definer set search_path to 'public' as $function$
declare st jsonb; rq bigint;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select value into st from ai_state where key='profit_ai';
  if st is not null and not (st ? 'done') and (st->>'at')::timestamptz>now()-interval '10 minutes' then return 'beží'; end if;
  rq:=timai_post('Si finančná riaditeľka firmy ERNTE spol. s r.o. (výkup obilia a olejnín od farmárov na východnom Slovensku, predaj odberateľom, vlastná doprava VALKO, kurací trus, agro služby). '||
    'Majiteľ Martin chce zarábať viac a dlhodobo. Dostaneš JSON „Zisk ERNTE“ za obdobie: spolu (obchod − doprava obilia + flotila VALKO + kurací trus + agro služby), '||
    'obchod z vážnych lístkov (zúčtovanie odberateľa − zúčtovanie farmára) po komoditách, odberateľoch, farmároch, mesiacoch, úniky (váha, sušenie, lístky so stratou, bez predajnej ceny), '||
    'flotilu VALKO po mesiacoch (obrat môže byť odhad), zostáva vyviezť (odhad) a odporúčania z pravidiel. '||
    'Napíš po slovensky, stručne a konkrétne (max 2400 znakov, krátke riadky, **tučne** kľúčové slová, bez tabuliek): '||
    '**Zisk ERNTE spolu** (1–2 vety) · **Kde zarábame** · **Kde strácame** (konkrétne komodity, odberatelia, farmári, lístky, flotila a koľko €) · '||
    '**Prečo** · **Čo urobiť tento týždeň** (3–5 krokov s odhadom € prínosu) · **Dlhodobo** (2–3 odporúčania). '||
    'Navrhuj IBA legálne a transparentné kroky v súlade so zmluvami s farmármi (žiadne skryté zrážky ani nič, čo by farmár nemal vidieť). '||
    'Čísla ber iba z údajov, nič si nevymýšľaj; ak údaje chýbajú, povedz čo doplniť. Odpovedz IBA JSON bez ``` : {"text":"…"}',
    'ÚDAJE (JSON):'||chr(10)||left(zisk_ernte(p_from,p_to)::text,60000), 4000, 0);
  if rq is null then return 'chýba kľúč'; end if;
  insert into ai_state(key,value) values('profit_ai',jsonb_build_object('req',rq,'at',now(),'od',p_from,'do',p_to)) on conflict(key) do update set value=excluded.value, updated_at=now();
  return 'ok';
end $function$;
revoke all on function public.profit_ai_now(date,date) from public, anon; grant execute on function public.profit_ai_now(date,date) to authenticated;
