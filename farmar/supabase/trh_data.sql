-- 📚 ZNALOSTNÁ BÁZA TRHU (#93): zdroje (trh_zdroje) + údaje (trh_data) + kalendár udalostí (trh_udalosti)
-- Zber: workflow .github/workflows/trh.yml (.github/trh/collect.py) → vetva trh-data / trh.json (iba verejné údaje)
-- Databáza: trh_tick() každých 15 min stiahne trh.json (pg_net), uloží údaje, MATIF/CBOT skopíruje z market_px (bot Trhové ceny),
-- výpadok zdroja > 2 obdobia → Diagnostika (check_err) + push majiteľovi priorita 3 (raz za výpadok).
-- Iba majiteľ (RLS is_owner). Pre AI poradcu: ai_snapshot() → kľúč „trh“ (trh_ai()).

create table if not exists public.trh_zdroje(
  kod text primary key, nazov text not null, url text, frekvencia text, perioda interval, licencia text,
  posledne timestamptz, posl_pokus timestamptz, posl_data date, stav text not null default 'čaká', sprava text,
  vypadok_od timestamptz, vypadok_push timestamptz, od timestamptz not null default now(), upd timestamptz not null default now());
create table if not exists public.trh_data(
  id bigserial primary key, zdroj text not null, komodita text not null, indikator text not null, hodnota numeric not null,
  jednotka text, platne date not null, nacitane timestamptz not null default now(),
  constraint trh_data_uq unique(zdroj,komodita,indikator,platne));
create index if not exists trh_data_kip on public.trh_data(komodita,indikator,platne desc);
create index if not exists trh_data_zp on public.trh_data(zdroj,platne desc);
create table if not exists public.trh_udalosti(
  id bigserial primary key, kod text not null, nazov text not null, at timestamptz not null, zdroj text, poznamka text,
  pre_at timestamptz, post_at timestamptz, pre_px jsonb, constraint trh_udalosti_uq unique(kod,at));

alter table public.trh_zdroje enable row level security;
alter table public.trh_data enable row level security;
alter table public.trh_udalosti enable row level security;
drop policy if exists trh_zdroje_own on public.trh_zdroje;
create policy trh_zdroje_own on public.trh_zdroje for select using (is_owner());
drop policy if exists trh_data_own on public.trh_data;
create policy trh_data_own on public.trh_data for select using (is_owner());
drop policy if exists trh_udalosti_own on public.trh_udalosti;
create policy trh_udalosti_own on public.trh_udalosti for select using (is_owner());
revoke all on public.trh_zdroje, public.trh_data, public.trh_udalosti from anon;
grant select on public.trh_zdroje, public.trh_data, public.trh_udalosti to authenticated;

-- zdroje (iba popis; stav, posledné načítanie a výpadok plní trh_tick)
insert into public.trh_zdroje(kod,nazov,url,frekvencia,perioda,licencia) values
 ('matif','Euronext MATIF – repka, pšenica, kukurica (závery + krivka kontraktov)','https://live.euronext.com/en/markets/commodities','denne 18:45 (prac. dni)','1 day','z bota Trhové ceny (market_px / market.json) – Euronext sa nesťahuje'),
 ('cbot','CBOT – sója, kukurica, pšenica (oneskorené)','https://www.cmegroup.com/markets/agriculture.html','denne 22:30 (prac. dni)','1 day','z bota Trhové ceny (market_px / market.json) – CME sa nesťahuje'),
 ('ecb','ECB – EUR/USD, EUR/HUF referenčné kurzy','https://data-api.ecb.europa.eu','denne 16:30 (prac. dni)','1 day','ECB – bezplatné, s uvedením zdroja'),
 ('gasoil','ICE gasoil (bot Trhové ceny)','https://www.ice.com/products/34361119/Low-Sulphur-Gasoil-Futures','denne','1 day','z bota Trhové ceny (market.json)'),
 ('brent','Brent – EIA Europe Brent Spot FOB','https://www.eia.gov/dnav/pet/hist/RBRTEd.htm','denné hodnoty, EIA aktualizuje týždenne','7 days','EIA – verejná doména'),
 ('wasde','USDA WASDE – svetová bilancia (CSV)','https://www.usda.gov/oce/commodity/wasde','mesačne v deň zverejnenia 18:05','35 days','USDA – verejná doména'),
 ('fas_es','USDA FAS Export Sales – týždenný prehľad','https://apps.fas.usda.gov/export-sales/highlite.htm','štvrtok 14:45','7 days','USDA – verejná doména'),
 ('cot','CFTC Commitments of Traders – managed money','https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm','piatok 21:45','7 days','CFTC – verejná doména'),
 ('ec_agri','EK Agri-food data portal – ceny obilnín a olejnín (SK, HU, FR, DE, AT, PL)','https://agridata.ec.europa.eu','týždenne','7 days','CC BY 4.0 (Európska komisia)'),
 ('jrc_mars','JRC MARS Bulletin – stav porastov v EÚ','https://joint-research-centre.ec.europa.eu/monitoring-agricultural-resources-mars/jrc-mars-bulletin_en','mesačne',null,'iba odkaz (PDF)'),
 ('amis','FAO / AMIS Market Monitor','https://www.amis-outlook.org/amis-monitoring','mesačne',null,'iba odkaz (PDF)'),
 ('igc','IGC Grain Market Report','https://www.igc.int/en/gmr_summary.aspx','mesačne',null,'iba odkaz – plný report je predplatné'),
 ('vuepp','MPRV SR / VÚEPP – týždenné nákupné ceny','https://www.vuepp.sk','týždenne',null,'iba odkaz (PDF)'),
 ('aki','AKI PÁIR (HU) – týždenné ceny','https://pair.aki.gov.hu','týždenne',null,'iba odkaz'),
 ('meteo','Open-Meteo – počasie SK, HU, UA, FR, US Midwest, BR','https://open-meteo.com','každú hodinu','1 hour','údaje CC BY 4.0; bezplatné API iba nekomerčne – pre firmu predplatné (tajomstvo OPENMETEO_APIKEY)')
on conflict (kod) do update set nazov=excluded.nazov, url=excluded.url, frekvencia=excluded.frekvencia, perioda=excluded.perioda, licencia=excluded.licencia, upd=now();
update public.trh_zdroje set stav='iba odkaz' where perioda is null and stav='čaká';

-- udalosti s pevným dátumom (WASDE, MARS …); týždenné COT a Export Sales generuje trh_kalendar()
insert into public.trh_udalosti(kod,nazov,at,zdroj,poznamka) values
 ('wasde','USDA WASDE',('2026-11-10 18:00'::timestamp at time zone 'Europe/Bratislava'),'wasde','12:00 ET'),
 ('wasde','USDA WASDE',('2026-12-10 18:00'::timestamp at time zone 'Europe/Bratislava'),'wasde','12:00 ET – predbežný termín, overiť na usda.gov')
on conflict (kod,at) do nothing;

-- číslo z JSON
create or replace function public.trh_num(t text) returns numeric language plpgsql immutable as $$
begin
  if t is null or t !~ '^\s*-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?\s*$' then return null; end if;
  return t::numeric;
exception when others then return null; end $$;

-- kalendár trhových udalostí na N dní (čas Bratislava)
create or replace function public.trh_kalendar(p_dni int default 14) returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('at',to_char(x.at at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),'kod',x.kod,'nazov',x.nazov,'pozn',x.pozn) order by x.at),'[]')
  from (
    select at, kod, nazov, poznamka pozn from trh_udalosti where at>=now()-interval '2 hours' and at<now()+make_interval(days=>p_dni)
    union all
    select (d::date+time '21:30') at time zone 'Europe/Bratislava', 'cot', 'CFTC COT (pozície fondov)', '15:30 ET; pri sviatku v USA posun'
      from generate_series(current_date, current_date+p_dni, interval '1 day') d where extract(isodow from d)=5
    union all
    select (d::date+time '14:30') at time zone 'Europe/Bratislava', 'export_sales', 'USDA Export Sales', '8:30 ET; pri sviatku v USA posun'
      from generate_series(current_date, current_date+p_dni, interval '1 day') d where extract(isodow from d)=4
  ) x where x.at>=now()-interval '2 hours' and x.at<now()+make_interval(days=>p_dni) $$;
revoke all on function public.trh_kalendar(int) from public, anon, authenticated;

-- hlavná úloha (pg_cron každých 15 min)
create or replace function public.trh_tick() returns text language plpgsql security definer set search_path=public, net as $$
declare st jsonb; r record; j jsonb; n int:=0; k text; v jsonb; zr record; ref timestamptz; lim interval; msg text:=''; res text:='';
begin
  -- 1) burza z bota (market_px) – história sa tvorí odteraz každý deň
  insert into trh_data(zdroj,komodita,indikator,hodnota,jednotka,platne)
    select case when sym='soja_usc_bu' then 'cbot' else 'matif' end, case when sym='soja_usc_bu' then 'soja' else sym end, 'close', eur_t, '€/t', quote_date
    from market_px where sym in ('repka','psenica','kukurica','soja_usc_bu') and eur_t>0 and quote_date is not null and quote_date<=current_date
  on conflict on constraint trh_data_uq do update set hodnota=excluded.hodnota, nacitane=now() where trh_data.hodnota is distinct from excluded.hodnota;
  -- kontrakt, z ktorého je záver (pri prechode na ďalší kontrakt predpoveď nepočíta skok ako zmenu ceny) + bod krivky
  begin
    insert into trh_data(zdroj,komodita,indikator,hodnota,jednotka,platne)
      select q.z, q.k, i.ind, i.val, i.un, q.quote_date
      from (select case when sym='soja_usc_bu' then 'cbot' else 'matif' end z, case when sym='soja_usc_bu' then 'soja' else sym end k, eur_t, quote_date, mk_term(contract) t
            from market_px where sym in ('repka','psenica','kukurica','soja_usc_bu') and eur_t>0 and quote_date is not null and quote_date<=current_date) q
      cross join lateral (values ('close_kontrakt',to_char(q.t,'YYYYMM')::numeric,'RRRRMM'),('kontrakt '||to_char(q.t,'YYYY-MM'),q.eur_t,'€/t')) i(ind,val,un)
      where q.t is not null
    on conflict on constraint trh_data_uq do update set hodnota=excluded.hodnota, nacitane=now() where trh_data.hodnota is distinct from excluded.hodnota;
  exception when others then null; end;

  -- 2) odpoveď na poslednú požiadavku (trh.json)
  select value into st from ai_state where key='trh_req';
  if st is not null and not (st ? 'done') then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is null then
      if (st->>'at')::timestamptz<now()-interval '10 minutes' then update ai_state set value=value||jsonb_build_object('done',now(),'err','bez odpovede') where key='trh_req'; end if;
      res:='čaká';
    else
      update ai_state set value=value||jsonb_build_object('done',now(),'code',r.status_code) where key='trh_req';
      if r.status_code=200 then
        begin j:=r.content::jsonb; exception when others then j:=null; end;
        if j is not null and j ? 'd' and (j->>'at') is distinct from (select value->>'json_at' from ai_state where key='trh_last') then
          insert into trh_data(zdroj,komodita,indikator,hodnota,jednotka,platne)
            select left(x->>'s',40), left(x->>'c',40), left(x->>'i',60), trh_num(x->>'v'), left(x->>'u',20), (x->>'d')::date
            from jsonb_array_elements(j->'d') x
            where coalesce(x->>'s','')<>'' and coalesce(x->>'c','')<>'' and coalesce(x->>'i','')<>'' and trh_num(x->>'v') is not null
              and (x->>'d') ~ '^\d{4}-\d\d-\d\d$' and (x->>'d')::date<=current_date+1
          on conflict on constraint trh_data_uq do update set hodnota=excluded.hodnota, jednotka=excluded.jednotka, nacitane=now()
            where trh_data.hodnota is distinct from excluded.hodnota;
          get diagnostics n=row_count;
          for k, v in select * from jsonb_each(coalesce(j->'src','{}')) loop
            insert into trh_zdroje(kod,nazov) values(left(k,40),k) on conflict(kod) do nothing;
            update trh_zdroje set stav=coalesce(left(v->>'st',30),stav), sprava=left(v->>'msg',300),
              posl_pokus=case when (v->>'try_at') ~ '^\d{4}-' then (v->>'try_at')::timestamptz else posl_pokus end,
              posledne=greatest(posledne, case when (v->>'ok_at') ~ '^\d{4}-' then (v->>'ok_at')::timestamptz end), upd=now()
            where kod=left(k,40);
          end loop;
          if jsonb_typeof(j->'wasde')='object' then
            insert into ai_state(key,value) values('trh_wasde',j->'wasde') on conflict(key) do update set value=excluded.value, updated_at=now();
          end if;
          insert into ai_state(key,value) values('trh_last',jsonb_build_object('at',now(),'json_at',j->>'at','n',n))
            on conflict(key) do update set value=excluded.value, updated_at=now();
          res:='ok '||n;
        else res:='bez zmeny'; end if;
      else res:='chyba '||coalesce(r.status_code::text,'?'); end if;
    end if;
  end if;
  update trh_zdroje t set posl_data=(select max(platne) from trh_data d where d.zdroj=t.kod) where perioda is not null;

  -- 3) nová požiadavka (najviac raz za 14 min)
  select value into st from ai_state where key='trh_req';
  if st is null or (st ? 'done' and (st->>'at')::timestamptz<now()-interval '14 minutes') or (st->>'at')::timestamptz<now()-interval '30 minutes' then
    insert into ai_state(key,value) values('trh_req',jsonb_build_object('req',net.http_get(url:='https://raw.githubusercontent.com/ernte-trade/ernte-/trh-data/trh.json?t='||extract(epoch from now())::bigint,timeout_milliseconds:=30000),'at',now()))
      on conflict(key) do update set value=excluded.value, updated_at=now();
  end if;

  -- 4) výpadky: viac ako 2 obdobia bez nových údajov → Diagnostika + push (raz za výpadok)
  for zr in select * from trh_zdroje where perioda is not null and stav not in ('iba odkaz','čaká na kľúč') loop
    ref:=case when zr.kod in ('matif','cbot','gasoil') then (select max(platne) from trh_data where zdroj=zr.kod and indikator='close')+interval '22 hours' else zr.posledne end;
    ref:=coalesce(ref,zr.od);
    lim:=greatest(2*zr.perioda, interval '3 hours')
      + case when zr.perioda<=interval '1 day' and extract(isodow from now() at time zone 'Europe/Bratislava') in (6,7,1) then interval '2 days' else interval '0' end;
    if now()-ref>lim then
      if zr.vypadok_push is null then
        msg:=msg||case when msg='' then '' else chr(10) end||'• '||zr.nazov||': posledné údaje '||coalesce(to_char(ref at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),'nikdy')
          ||coalesce(' ('||nullif(zr.sprava,'')||')','');
        begin insert into check_err(fn,msg,at) values('trh_'||zr.kod,left('Zdroj trhu '||zr.nazov||' bez údajov od '||coalesce(to_char(ref at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),'začiatku')||'. '||coalesce(zr.sprava,''),300),now())
          on conflict (fn) do update set msg=excluded.msg, at=now(); exception when others then null; end;
        update trh_zdroje set vypadok_od=coalesce(vypadok_od,now()), vypadok_push=now() where kod=zr.kod;
      end if;
    elsif zr.vypadok_od is not null then
      update trh_zdroje set vypadok_od=null, vypadok_push=null where kod=zr.kod;
      begin delete from check_err where fn='trh_'||zr.kod; exception when others then null; end;
    end if;
  end loop;
  if msg<>'' then
    begin perform push_send('trh','vypadok',left(md5(msg),12),'📚 Trh: zdroj údajov nedodáva',
      msg||chr(10)||'Ostatné zdroje bežia ďalej. Zapísané v Diagnostike.'||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → Trh a predpoveď',3,
      'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['books'],interval '6 hours');
    exception when others then null; end;
  end if;
  return coalesce(nullif(res,''),'nič');
exception when others then
  begin insert into check_err(fn,msg,at) values('trh_tick',left(SQLERRM,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(); exception when others then null; end;
  return 'chyba: '||SQLERRM;
end $$;
revoke all on function public.trh_tick() from public, anon, authenticated;

-- posledné hodnoty so zmenou za 1 deň / 1 týždeň / 1 mesiac
create or replace function public.trh_posledne(p_zdroje text[] default null) returns jsonb language sql stable security definer set search_path=public as $$
  with l as (select distinct on (zdroj,komodita,indikator) zdroj,komodita,indikator,hodnota,jednotka,platne from trh_data
             where indikator not like 'kontrakt %' and indikator<>'close_kontrakt' and (p_zdroje is null or zdroj=any(p_zdroje)) and platne>=current_date-60
             order by zdroj,komodita,indikator,platne desc)
  select coalesce(jsonb_agg(jsonb_build_object('z',l.zdroj,'k',l.komodita,'i',l.indikator,'v',l.hodnota,'u',l.jednotka,'d',l.platne,
     'z1d',round(l.hodnota-p1.hodnota,3),'z1t',round(l.hodnota-p7.hodnota,3),'z1m',round(l.hodnota-p30.hodnota,3),
     'z1m_pct',case when p30.hodnota<>0 then round(100*(l.hodnota/p30.hodnota-1),2) end) order by l.zdroj,l.komodita,l.indikator),'[]')
  from l
  left join lateral (select hodnota from trh_data d where (d.zdroj,d.komodita,d.indikator)=(l.zdroj,l.komodita,l.indikator) and d.platne<l.platne order by platne desc limit 1) p1 on true
  left join lateral (select hodnota from trh_data d where (d.zdroj,d.komodita,d.indikator)=(l.zdroj,l.komodita,l.indikator) and d.platne<=l.platne-7 order by platne desc limit 1) p7 on true
  left join lateral (select hodnota from trh_data d where (d.zdroj,d.komodita,d.indikator)=(l.zdroj,l.komodita,l.indikator) and d.platne<=l.platne-30 order by platne desc limit 1) p30 on true $$;
revoke all on function public.trh_posledne(text[]) from public, anon, authenticated;

-- časť „trh“ pre AI poradcu (predpovede dopĺňa trh_pred.sql)
create or replace function public.trh_ai() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  return jsonb_build_object(
    'posledne_hodnoty',trh_posledne(array['matif','cbot','ecb','gasoil','brent','cot','wasde','fas_es','ec_agri']),
    'pocasie_regiony',trh_posledne(array['meteo']),
    'krivka_kontraktov',(select coalesce(jsonb_object_agg(zdroj||' '||komodita,k),'{}') from (select zdroj,komodita,jsonb_object_agg(substr(indikator,10),hodnota order by indikator) k
        from (select distinct on (zdroj,komodita,indikator) * from trh_data where indikator like 'kontrakt %' and platne>=current_date-10 order by zdroj,komodita,indikator,platne desc) q group by 1,2) c),
    'kalendar_14_dni',trh_kalendar(14),
    'wasde_posledny',(select value from ai_state where key='trh_wasde'),
    'zdroje',(select coalesce(jsonb_agg(jsonb_build_object('kod',kod,'stav',stav,'posledne',to_char(posledne at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),'vypadok',vypadok_od is not null) order by kod),'[]') from trh_zdroje),
    'poznamka','Burza nie je naša výkupná cena. Zdroje: bot Trhové ceny (MATIF/CBOT), ECB, CFTC, USDA, EK, EIA, Open-Meteo.');
end $$;
revoke all on function public.trh_ai() from public, anon, authenticated;

-- prehľad pre AI: celá posledná definícia (20261030-1700-obchody-straz) + kľúč „trh“
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
   'posledne_upravy_ai', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x$q$),
   'trh', ai_part('select public.trh_ai()'));
exception when others then return jsonb_build_object('chyba_prehladu',SQLERRM);
end $function$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;

do $$ begin
  begin perform cron.unschedule('trh'); exception when others then null; end;
  perform cron.schedule('trh','*/15 * * * *','select public.trh_tick()');
end $$;
select public.trh_tick();

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-02','📚 Znalostná báza trhu','Cenník → Trh a predpoveď · ERNTE AI','majiteľ',array['owner'],
 'Aplikácia sama zbiera verejné trhové údaje: MATIF a CBOT (závery + krivka kontraktov z bota Trhové ceny), kurz EUR/USD (ECB), Brent (EIA), pozície fondov COT (CFTC), WASDE a týždenný vývoz USA (USDA), týždenné ceny obilnín a olejnín v EÚ (EK) a počasie v SK, HU, UA, FR, USA a Brazílii (zrážky, mráz, sucho). Každý zdroj má frekvenciu a stav; keď zdroj vypadne na viac ako 2 obdobia, príde upozornenie a zápis v Diagnostike. JRC MARS, AMIS, IGC, VÚEPP a AKI sú zatiaľ iba odkazy (bez verejného súboru). ERNTE AI má v prehľade novú časť „trh“: posledné hodnoty so zmenou za deň, týždeň a mesiac, kalendár udalostí na 14 dní a zhrnutie posledného WASDE.'
where not exists(select 1 from app_novinky where titul like '📚 Znalostná báza trhu%');
