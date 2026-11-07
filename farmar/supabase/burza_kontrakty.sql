-- 📈 BURZA: KONČIACI KONTRAKT, ROVNAKÝ OBCHODNÝ DEŇ, OBRÁTENÁ KRIVKA (úloha majiteľa 5. 11. 2026, cb781ec4)
-- 1) mk_expiry: posledný obchodný deň kontraktu podľa pravidiel burzy (MATIF kukurica 5. deň, pšenica 10. deň mesiaca dodania,
--    repka posledný pracovný deň predchádzajúceho mesiaca; CBOT pracovný deň pred 15.) – sviatky burzy sa neberú do úvahy (± 1 deň).
-- 2) market_bot_tick: kontrakt pre ocenenie (market_px) = najbližší, ktorý končí najskôr o 20 dní (ako odberatelia) A ZÁROVEŇ
--    nie je končiaci (≥ 10 dní do expirácie, otvorené pozície ≥ 1 000 lotov, ak ich zdroj uvádza).
--    Kontrola rovnakého obchodného dňa: komodita so starším záverom ako ostatné (a starším ako posledný obchodný deň burzy, bez víkendov a sviatkov)
--    → market.json sa sťahuje znova každých 5 min; po 13:30 a 2 h výpadku push priorita 3 (raz za výpadok), zápis do Diagnostiky (burza_den).
-- 3) trh_krivka(): dva najbližšie kontrakty; rozdiel > 15 €/t = obrátená krivka → ranný súhrn 5:00 („trh platí za dodanie hneď – nepredlžuj skladovanie“) a AI poradca.
-- 4) oprava histórie trh_data: close_nearby z končiaceho kontraktu (10 dní pred expiráciou) nahradený nasledujúcim kontraktom, kópie z 4. 11. zmazané.

create or replace function public.mk_bday_next(d date) returns date language sql immutable as $$
  select case extract(isodow from d)::int when 6 then d+2 when 7 then d+1 else d end $$;
create or replace function public.mk_bday_prev(d date) returns date language sql immutable as $$
  select case extract(isodow from d)::int when 6 then d-1 when 7 then d-2 else d end $$;
-- sviatky burzy (Euronext: 1. 1., Veľký piatok, Veľkonočný pondelok, 1. 5., 25.–26. 12.; CBOT: americké sviatky) – iba na kontrolu „chýba záver“
create or replace function public.mk_easter(y int) returns date language plpgsql immutable as $$
declare a int:=y%19; b int:=y/100; c int:=y%100; d int:=b/4; e int:=b%4; f int:=(b+8)/25; g int:=(b-f+1)/3; h int:=(19*a+b-d-g+15)%30; i int:=c/4; k int:=c%4; l int:=(32+2*e+2*i-h-k)%7; m int:=(a+11*h+22*l)/451;
begin return make_date(y,(h+l-7*m+114)/31,((h+l-7*m+114)%31)+1); end $$;
create or replace function public.mk_holiday(p_mkt text, d date) returns boolean language plpgsql immutable as $$
declare e date:=mk_easter(extract(year from d)::int); dow int:=extract(isodow from d); md text:=to_char(d,'MM-DD'); mo int:=extract(month from d); dy int:=extract(day from d);
begin
  if dow in (6,7) then return true; end if;
  if lower(coalesce(p_mkt,'')) ~ 'cbo?t' then
    if md in ('01-01','06-19','07-04','12-25') or d=e-2 then return true; end if;
    if (md in ('06-18','07-03','12-24') and dow=5) or (md in ('01-02','06-20','07-05','12-26') and dow=1) then return true; end if;
    return (mo in (1,2) and dow=1 and dy between 15 and 21) or (mo=5 and dow=1 and dy>=25) or (mo=9 and dow=1 and dy<=7) or (mo=11 and dow=4 and dy between 22 and 28);
  end if;
  return md in ('01-01','05-01','12-25','12-26') or d in (e-2,e+1);
end $$;
create or replace function public.mk_trading_prev(p_mkt text, d date) returns date language plpgsql immutable as $$
declare x date:=d-1; begin while mk_holiday(p_mkt,x) loop x:=x-1; end loop; return x; end $$;
create or replace function public.mk_expiry_m(p_mkt text, p_kom text, p_month date) returns date language plpgsql immutable as $$
declare m date:=date_trunc('month',p_month)::date;
begin
  if p_month is null then return null; end if;
  if lower(coalesce(p_mkt,'')) ~ 'cbo?t' then return mk_bday_prev(m+13); end if;            -- CBOT: pracovný deň pred 15. dňom mesiaca kontraktu
  if p_kom in ('repka','lo','ho') then return mk_bday_prev(m-1); end if;                      -- MATIF repka: posledný pracovný deň mesiaca pred dodaním
  if p_kom like 'psenica%' or p_kom like 'jacmen%' then return mk_bday_next(m+9); end if;      -- MATIF pšenica: 10. deň mesiaca dodania
  if p_kom='kukurica' then return mk_bday_next(m+4); end if;                                    -- MATIF kukurica: 5. deň mesiaca dodania
  return m;
end $$;
create or replace function public.mk_expiry(p_mkt text, p_kom text, p_term text) returns date language sql immutable as $$
  select mk_expiry_m(p_mkt, p_kom, date_trunc('month', mk_term(p_term))::date) $$;

create or replace function public.market_bot_tick() returns text language plpgsql security definer set search_path=public, net as $$
declare st jsonb; r record; j jsonb; it record; row jsonb; px jsonb:='{}'; fx numeric; n int:=0; old numeric; dif text:=''; ver text;
  dts jsonb:='{}'; loc timestamp:=now() at time zone 'Europe/Bratislava'; exp_d date; lag jsonb; ls jsonb; nm text; maxd date; gap interval:=interval '20 minutes';
begin
  select value into st from ai_state where key='market_bot_req';
  if st is not null and not (st ? 'done') then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is null then
      if (st->>'at')::timestamptz<now()-interval '10 minutes' then update ai_state set value=value||jsonb_build_object('done',now(),'err','bez odpovede') where key='market_bot_req'; end if;
      return 'čaká';
    end if;
    update ai_state set value=value||jsonb_build_object('done',now(),'code',r.status_code) where key='market_bot_req';
    if r.status_code is distinct from 200 then return 'chyba '||coalesce(r.status_code::text,'?'); end if;
    begin j:=r.content::jsonb; exception when others then return 'neplatný json'; end;
    ver:=j->>'updatedAt'; fx:=nullif(cmd_num(j->'fx'->>'usd'),0);
    for it in select * from (values ('repka','repka','MATIF repka','€/t'),('psenica','psenica_p','MATIF pšenica','€/t'),('kukurica','kukurica','MATIF kukurica','€/t'),('soja_usc_bu','soja','CBOT sója','USc/bu')) v(sym,c,nm,un) loop
      -- kontrakt ako odberatelia (končí najskôr o 20 dní) a nie končiaci (≥ 10 dní do posledného obchodného dňa, otvorené pozície ≥ 1 000 lotov, ak sú známe)
      select q.x into row from (
          select x, mk_term(x->>'term') tm, mk_expiry(case when it.c='soja' then 'cbot' else 'matif' end, it.c, x->>'term') ex
          from jsonb_array_elements(coalesce(j->'rows','[]'::jsonb)) x
          where x->>'kind'='burza' and x->>'c'=it.c and (x->>'price') ~ '^[0-9.]+$'
            and (case when it.c='soja' then coalesce(x->>'market','') ~* 'cbo?t' else coalesce(x->>'market','') ~* '(euronext|matif)' and coalesce(x->>'market','') !~* 'náhrada' end)) q
        order by (q.tm is not null and q.tm>=current_date+20 and coalesce(q.ex,q.tm)>=current_date+10
                  and not (coalesce(q.x->>'oi','') ~ '^[0-9]+(\.[0-9]+)?$' and (q.x->>'oi')::numeric<1000)) desc,
                 case when q.tm>=current_date+20 then q.tm end asc nulls last, q.x->>'date' desc
        limit 1;
      if row is null then continue; end if;
      select eur_t into old from market_px where sym=it.sym;
      if old is not null and old>0 and abs((row->>'price')::numeric-old)>old*0.03 then
        dif:=dif||case when dif='' then '' else ', ' end||it.nm||' '||round(old,1)||' → '||round((row->>'price')::numeric,1); end if;
      insert into market_px(sym,name,price,unit,eur_t,contract,quote_date,src,updated_at)
        values(it.sym,it.nm,case when it.sym='soja_usc_bu' and fx is not null then round((row->>'price')::numeric*fx/36.7437*100,2) else (row->>'price')::numeric end,it.un,
          (row->>'price')::numeric,row->>'term',case when row->>'date' ~ '^\d{4}-\d\d-\d\d$' then (row->>'date')::date end,'bot (market.json) '||coalesce(row->>'src',''),now())
        on conflict(sym) do update set name=excluded.name, price=excluded.price, unit=excluded.unit, eur_t=excluded.eur_t, contract=excluded.contract, quote_date=excluded.quote_date, src=excluded.src, updated_at=now();
      if row->>'date' ~ '^\d{4}-\d\d-\d\d$' then dts:=dts||jsonb_build_object(it.sym,row->>'date'); end if;
      -- stráženie nákupov: jednorazovo posunúť porovnanie „pri nákupe“ o skok z prechodu zdroja/kontraktu (inak falošné upozornenie)
      if old is not null and old>0 then
        begin update deal_watch set ref0=ref0+((row->>'price')::numeric-old), peak=peak+((row->>'price')::numeric-old), ref_fix=null
          where closed_at is null and ref_fix is not null and coalesce(ref_src,'') like 'burza%'
            and com=any(case it.sym when 'repka' then array['repka'] when 'psenica' then array['psenica_p','psenica_k'] when 'kukurica' then array['kukurica'] else array['soja'] end);
        exception when others then null; end;
      end if;
      px:=px||jsonb_build_object(it.sym,(row->>'price')::numeric); n:=n+1;
    end loop;
    if fx is not null then insert into market_px(sym,name,price,unit,updated_at) values('eurusd','EUR/USD',fx,'USD',now()) on conflict(sym) do update set price=excluded.price, updated_at=now(); end if;
    insert into ai_state(key,value) values('market_bot',jsonb_build_object('at',now(),'ver',ver,'px',px,'n',n,'dif',dif,'d',dts)) on conflict(key) do update set value=excluded.value, updated_at=now();
    if dif<>'' then
      begin perform push_send('burza','zdroj','rozdiel','⚠️ Burza: zdroje sa rozchádzali o viac ako 3 %','Opravené podľa overených kurzov: '||dif||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → Burza',4,
        'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['chart_with_downwards_trend'],interval '6 hours'); exception when others then null; end;
    end if;
    -- 📅 rovnaký obchodný deň: komodita, ktorej záver je starší ako ostatných A starší ako posledný obchodný deň burzy (po 9:00; pred 9:00 o deň skôr –
    --    AHDB sa obnovuje ~8:10) → sťahovať znova každých 5 min; po 13:30 a 2 h výpadku push priorita 3 (raz za výpadok) + Diagnostika (burza_den)
    begin
      select max(v::date) into maxd from jsonb_each_text(dts) e(k,v);
      select jsonb_object_agg(k,jsonb_build_object('d',v,'exp',x.ex)) into lag from jsonb_each_text(dts) e(k,v)
        cross join lateral (select case when loc::time<time '09:00' then mk_trading_prev(case when k='soja_usc_bu' then 'cbot' else 'matif' end, mk_trading_prev(case when k='soja_usc_bu' then 'cbot' else 'matif' end, loc::date))
                                        else mk_trading_prev(case when k='soja_usc_bu' then 'cbot' else 'matif' end, loc::date) end ex) x
        where v::date<maxd and v::date<x.ex;
      select value into ls from ai_state where key='market_lag';
      if lag is not null then
        exp_d:=(select max((v->>'exp')::date) from jsonb_each(lag) e(k,v));
        if ls is null or ls->>'exp' is distinct from exp_d::text then ls:=jsonb_build_object('since',now(),'exp',exp_d,'n',0); end if;
        ls:=ls||jsonb_build_object('lag',lag,'maxd',maxd,'n',coalesce((ls->>'n')::int,0)+1,'at',now());
        if (ls->>'since')::timestamptz<now()-interval '2 hours' and loc::time>=time '13:30' and not (ls ? 'pushed') then
          select string_agg(case k when 'repka' then 'repka' when 'psenica' then 'pšenica' when 'kukurica' then 'kukurica' else 'sója' end||' (posledný '||to_char((v->>'d')::date,'FMDD. FMMM.')||')',', ') into nm from jsonb_each(lag) e(k,v);
          begin perform push_send('burza','den',exp_d::text,'📉 Burza: chýba záver z '||to_char(exp_d,'FMDD. FMMM.'),
            'Bez záveru: '||nm||'; ostatné komodity už majú '||coalesce(to_char(maxd,'FMDD. FMMM.'),'?')||' Zdroj kurzov nedodal novší kontrakt – sťahujem znova každých 5 min, dovtedy sa pri tejto komodite ráta so starším kurzom.'
            ||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → Burza',3,'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['chart_with_downwards_trend'],interval '12 hours');
          exception when others then null; end;
          begin insert into check_err(fn,msg,at) values('burza_den',left('Burza: bez záveru z '||to_char(exp_d,'DD.MM.')||' – '||nm,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(); exception when others then null; end;
          ls:=ls||jsonb_build_object('pushed',now());
        end if;
        insert into ai_state(key,value) values('market_lag',ls) on conflict(key) do update set value=excluded.value, updated_at=now();
      elsif ls is not null then
        delete from ai_state where key='market_lag';
        begin delete from check_err where fn='burza_den'; exception when others then null; end;
      end if;
    exception when others then null; end;
    begin perform soja_adm_tick(); exception when others then null; end;
    return 'ok '||n;
  end if;
  -- nová požiadavka najviac raz za 20 min (pri chýbajúcom závere každých 5 min)
  if exists(select 1 from ai_state where key='market_lag') then gap:=interval '5 minutes'; end if;
  if st is null or (st->>'at')::timestamptz<now()-gap then
    insert into ai_state(key,value) values('market_bot_req',jsonb_build_object('req',net.http_get(url:='https://raw.githubusercontent.com/ernte-trade/ernte-/main/farmar/market.json?t='||extract(epoch from now())::bigint,timeout_milliseconds:=30000),'at',now()))
      on conflict(key) do update set value=excluded.value, updated_at=now();
    return 'stiahnuť';
  end if;
  return 'nič';
end $$;
revoke all on function public.market_bot_tick() from public, anon, authenticated;

-- 🔁 krivka kontraktov: dva najbližšie neexpirované kontrakty (posledné ceny ≤ 7 dní, dátumy ≤ 3 dni od seba); rozdiel > 15 €/t = obrátená krivka
create or replace function public.trh_krivka(p_dni int default 7) returns jsonb language sql stable security definer set search_path=public as $$
  with k as (select distinct on (zdroj,komodita,indikator) zdroj, komodita, substr(indikator,10) ym, hodnota v, platne d
             from trh_data where indikator like 'kontrakt %' and zdroj in ('matif','cbot') and platne>=current_date-p_dni and hodnota>0
             order by zdroj,komodita,indikator,platne desc),
       e as (select k.*, mk_expiry_m(k.zdroj,k.komodita,to_date(k.ym,'YYYY-MM')) ex from k where k.ym ~ '^\d{4}-\d\d$'),
       r as (select e.*, row_number() over (partition by zdroj,komodita order by ym) rn from e where ex>=current_date)
  select coalesce(jsonb_agg(jsonb_build_object('z',a.zdroj,'k',a.komodita,'k1',a.ym,'v1',a.v,'d1',a.d,'exp1',a.ex,'k2',b.ym,'v2',b.v,'d2',b.d,
           'rozdiel',round(a.v-b.v,2),'obratena',(a.v-b.v)>15) order by a.zdroj,a.komodita),'[]'::jsonb)
  from r a join r b on b.zdroj=a.zdroj and b.komodita=a.komodita and b.rn=2
  where a.rn=1 and abs(a.d-b.d)<=3 $$;
revoke all on function public.trh_krivka(int) from public, anon, authenticated;
create or replace function public.trh_mes(ym text) returns text language sql immutable as $$
  select (array['jan','feb','mar','apr','máj','jún','júl','aug','sep','okt','nov','dec'])[substr(ym,6,2)::int]||' '||substr(ym,3,2) $$;

-- ☀️ ranný súhrn trhu o 5:00 – doplnená obrátená krivka
create or replace function public.trh_rano_tick(p_force boolean default false) returns text language plpgsql security definer set search_path=public as $$
declare loc timestamp:=now() at time zone 'Europe/Bratislava'; z jsonb; k text; b text:=''; e jsonb; od text; cp numeric; mx numeric; ln text; allno boolean:=true; x jsonb;
begin
  if not p_force and extract(hour from loc)<>5 then return 'nie je 5:00'; end if;
  if not p_force and exists(select 1 from ai_state where key='trh_rano' and value->>'d'=loc::date::text) then return 'už odoslané'; end if;
  perform trh_pred_run();
  if extract(isodow from loc)=1 then begin perform trh_pred_backtest(); exception when others then null; end; end if;
  z:=trh_zavery();
  b:='🌙 Burza (posledný záver):';
  foreach k in array array['repka','psenica','kukurica','soja'] loop
    x:=z->k; if x is null then continue; end if;
    b:=b||chr(10)||trh_kom_nm(k)||' '||trh_eur((x->>'v')::numeric,2)||' €/t'||case when x->>'pv' is not null then ' ('||case when (x->>'v')::numeric>=(x->>'pv')::numeric then '+' else '' end||trh_eur((x->>'v')::numeric-(x->>'pv')::numeric,2)||')' else '' end;
  end loop;
  -- 🔁 obrátená krivka (najbližší kontrakt drahší ako nasledujúci o viac ako 15 €/t)
  ln:='';
  begin
    for x in select * from jsonb_array_elements(trh_krivka(7)) loop
      if coalesce((x->>'obratena')::boolean,false) then
        ln:=ln||chr(10)||'🔁 '||trh_kom_nm(x->>'k')||': obrátená krivka '||trh_mes(x->>'k1')||' '||trh_eur((x->>'v1')::numeric,2)||' > '||trh_mes(x->>'k2')||' '||trh_eur((x->>'v2')::numeric,2)
          ||' (+'||trh_eur((x->>'rozdiel')::numeric,2)||' €/t) → trh platí za dodanie hneď – nepredlžuj skladovanie';
      end if;
    end loop;
  exception when others then null; end;
  if ln<>'' then b:=b||ln; end if;
  b:=b||chr(10)||'📅 Dnes:';
  ln:='';
  for e in select * from jsonb_array_elements(trh_kalendar(1)) loop
    if left(e->>'at',10)=loc::date::text then ln:=ln||chr(10)||substr(e->>'at',12)||' '||(e->>'nazov'); end if;
  end loop;
  b:=b||coalesce(nullif(ln,''),' žiadna veľká správa');
  ln:='';
  for k, od in select * from (values ('repka','repka'),('psenica_p','psenica'),('kukurica','kukurica'),('soja','soja')) v(c,m) loop
    cp:=null; select price into cp from prices where com=k;
    mx:=(z->od->>'v')::numeric;
    if cp is not null and mx is not null then ln:=ln||chr(10)||trh_kom_nm(od)||': '||trh_eur(cp)||' − '||trh_eur(mx)||' = '||trh_eur(cp-mx)||' €/t'; end if;
  end loop;
  if ln<>'' then b:=b||chr(10)||'💶 Náš cenník − burza:'||ln; end if;
  ln:='';
  foreach k in array array['repka','psenica','kukurica','soja'] loop
    od:=trh_odporucanie(k);
    if od not like 'model neporáža%' then allno:=false; end if;
    ln:=ln||chr(10)||trh_kom_nm(k)||': '||od;
  end loop;
  b:=b||chr(10)||'🎯 '||case when allno then 'Odporúčanie: model neporáža trh – len informácia.' else 'Odporúčanie:'||ln end;
  b:=b||chr(10)||'Burza nie je naša výkupná cena.'||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → Trh a predpoveď';
  begin perform push_send('trh','rano',loc::date::text,'📈 Trh ráno · '||to_char(loc,'DD. MM.'),b,3,'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['chart_with_upwards_trend'],interval '20 hours');
  exception when others then null; end;
  insert into ai_state(key,value) values('trh_rano',jsonb_build_object('d',loc::date,'at',now(),'text',b)) on conflict(key) do update set value=excluded.value, updated_at=now();
  return b;
end $$;
revoke all on function public.trh_rano_tick(boolean) from public, anon, authenticated;

-- AI poradca: + krivka kontraktov so signálom, koniec kontraktov, chýbajúci záver
create or replace function public.trh_ai() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  return jsonb_build_object(
    'posledne_hodnoty',trh_posledne(array['matif','cbot','ecb','gasoil','brent','cot','wasde','fas_es','ec_agri']),
    'pocasie_regiony',trh_posledne(array['meteo']),
    'krivka_kontraktov',(select coalesce(jsonb_object_agg(zdroj||' '||komodita,k),'{}') from (select zdroj,komodita,jsonb_object_agg(substr(indikator,10),hodnota order by indikator) k
        from (select distinct on (zdroj,komodita,indikator) * from trh_data where indikator like 'kontrakt %' and platne>=current_date-10 order by zdroj,komodita,indikator,platne desc) q group by 1,2) c),
    'krivka_signal',(select coalesce(jsonb_agg(x||jsonb_build_object('signal',case when (x->>'obratena')::boolean then 'obrátená krivka – trh platí za dodanie hneď, nepredlžuj skladovanie' else 'normálna krivka' end)),'[]') from jsonb_array_elements(trh_krivka(7)) x),
    'kontrakt_ocenenie',(select coalesce(jsonb_object_agg(sym,jsonb_build_object('kontrakt',contract,'zaver_z',quote_date,'posledny_obchodny_den',mk_expiry(case when sym='soja_usc_bu' then 'cbot' else 'matif' end,case when sym='psenica' then 'psenica_p' when sym='soja_usc_bu' then 'soja' else sym end,contract))),'{}')
        from market_px where sym in ('repka','psenica','kukurica','soja_usc_bu')),
    'chyba_zaver',(select value from ai_state where key='market_lag'),
    'kalendar_14_dni',trh_kalendar(14),
    'wasde_posledny',(select value from ai_state where key='trh_wasde'),
    'predpoved',(select coalesce(jsonb_agg(jsonb_build_object('komodita',komodita,'horizont',horizont,'k_dnu',k_dnu,'cena',cena0,'p10',p10,'p50',p50,'p90',p90,'p_hore',p_hore,'smer',smer) order by komodita,dni),'[]')
        from (select distinct on (komodita,horizont) * from trh_predpovede order by komodita,horizont,k_dnu desc) p),
    'uspesnost_modelu_6m',trh_pred_skore(null),
    'odporucanie',(select jsonb_object_agg(k,trh_odporucanie(k)) from unnest(array['repka','psenica','kukurica','soja']) k),
    'otvorene_pozicie',trh_otvorene(),
    'zdroje',(select coalesce(jsonb_agg(jsonb_build_object('kod',kod,'stav',stav,'posledne',to_char(posledne at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),'vypadok',vypadok_od is not null) order by kod),'[]') from trh_zdroje),
    'poznamka','Burza nie je naša výkupná cena. close = kontrakt ako odberatelia (končí najskôr o 20 dní, nie končiaci); close_nearby = najbližší nekončiaci kontrakt (≥ 10 dní do expirácie). Odporúčanie platí iba ak model za 6 mesiacov porazil naivnú predpoveď (≥ 30 vyhodnotení); inak len informácia.');
end $$;
revoke all on function public.trh_ai() from public, anon, authenticated;

-- 🧹 história: close_nearby, keď do konca kontraktu ostáva menej ako 10 dní (9 … 0), kontraktu = nasledujúci kontrakt v ten istý deň, inak zmazať
do $$ declare w record; begin
  for w in select * from (values ('matif','kukurica',date '2026-11-05','2027-03'),('matif','repka',date '2026-10-30','2027-02'),('cbot','soja',date '2026-11-13','2027-01')) v(z,k,ex,nx) loop
    update trh_data d set hodnota=n.hodnota, nacitane=now()
      from trh_data n where d.zdroj=w.z and d.komodita=w.k and d.indikator='close_nearby' and d.platne between w.ex-9 and w.ex
        and n.zdroj=d.zdroj and n.komodita=d.komodita and n.platne=d.platne and n.indikator='kontrakt '||w.nx;
    delete from trh_data d where d.zdroj=w.z and d.komodita=w.k and d.indikator='close_nearby' and d.platne between w.ex-9 and w.ex
      and not exists(select 1 from trh_data n where n.zdroj=d.zdroj and n.komodita=d.komodita and n.platne=d.platne and n.indikator='kontrakt '||w.nx);
  end loop;
  -- 4. 11.: bot zapísal ráno kópiu záverov z 3. 11. (neskoršie behy nebežali) → nie je to záver 4. 11.
  delete from trh_data d where d.zdroj in ('matif','cbot') and d.indikator='close_nearby' and d.platne='2026-11-04'
    and exists(select 1 from trh_data p where p.zdroj=d.zdroj and p.komodita=d.komodita and p.indikator=d.indikator and p.platne='2026-11-03' and p.hodnota=d.hodnota);
end $$;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-05','📈 Burza bez končiaceho kontraktu + obrátená krivka','Cenník → Burza, Trh a predpoveď, ranný súhrn 5:00','majiteľ',array['owner'],
 'Kontrakt, ktorému ostáva menej ako 10 dní do konca obchodovania (alebo má pod 1 000 otvorených lotov), sa už nepoužíva na ocenenie ani ako „najbližší kontrakt“ – berie sa nasledujúci (kukurica: november končí 5. 11., ráta sa marec 2027). Ak niektorá komodita nemá záver z posledného obchodného dňa, burza sa sťahuje znova každých 5 minút a po 2 hodinách príde upozornenie. Keď je najbližší kontrakt drahší ako nasledujúci o viac ako 15 €/t, ranný súhrn napíše „trh platí za dodanie hneď – nepredlžuj skladovanie“.'
where not exists(select 1 from app_novinky where titul='📈 Burza bez končiaceho kontraktu + obrátená krivka');
