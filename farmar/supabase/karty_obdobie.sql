-- ===== ⛽ VÝPIS PALIVOVÝCH KARIET PO OBDOBIACH (1.–15. a 16.–koniec mesiaca) + POSKYTOVATELIA KARIET + POKRYTIE SKUPÍN =====
-- Rozdiel spotreba vs. karta, bilancia nádrže (7/30 dní) a alarmy „tankovanie nesedí“ sa počítajú LEN do dátumu posledného importu.
-- Obdobie po ňom = „čaká na výpis kariet“ (sivé, bez € strát). Po novom výpise: spätný prepočet + súhrn do mobilu (priorita 4).
-- Skupina (Flotila EU / Región) so spotrebou nad 500 l a 0 l z kariet = chýba výpis (iný poskytovateľ?) – nepočíta sa do strát.

insert into fleet_cfg(key,value) values('cardcfg','{"interval":"polmesiac","last_to":"2026-10-15","providers":[]}'::jsonb) on conflict (key) do nothing;

create or replace function public.card_cfg_raw() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((select value from fleet_cfg where key='cardcfg'),'{}'::jsonb) $$;
revoke all on function public.card_cfg_raw() from public, anon, authenticated;

-- posledný deň zahrnutý vo výpise kariet
create or replace function public.card_last_to() returns date language sql stable security definer set search_path=public as $$
  select case when coalesce(card_cfg_raw()->>'last_to','') ~ '^\d{4}-\d{2}-\d{2}$' then (card_cfg_raw()->>'last_to')::date end $$;
-- hranica: koniec dňa posledného výpisu (miestny čas); bez nastavenia = bez obmedzenia
create or replace function public.card_cut() returns timestamptz language sql stable security definer set search_path=public as $$
  select coalesce(((card_last_to()+1)::timestamp at time zone 'Europe/Bratislava'), 'infinity'::timestamptz) $$;
revoke all on function public.card_last_to() from public, anon, authenticated;
revoke all on function public.card_cut() from public, anon, authenticated;

-- koniec nasledujúceho obdobia výpisu po dátume d
create or replace function public.card_next_end(d date, iv text default null) returns date language sql stable security definer set search_path=public as $$
  select case coalesce(iv, card_cfg_raw()->>'interval','polmesiac')
    when 'polmesiac' then case when extract(day from d)<15 then date_trunc('month',d)::date+14
                               when d<(date_trunc('month',d)+interval '1 month -1 day')::date then (date_trunc('month',d)+interval '1 month -1 day')::date
                               else date_trunc('month',d+1)::date+14 end
    when 'mesiac' then (date_trunc('month',d+1)+interval '1 month -1 day')::date
    else d+greatest(1,coalesce(nullif(regexp_replace(coalesce(iv, card_cfg_raw()->>'interval'),'\D','','g'),'')::int,14)) end $$;
-- začiatok obdobia, ktoré končí dňom t
create or replace function public.card_period_from(t date, iv text default null) returns date language sql stable security definer set search_path=public as $$
  select case coalesce(iv, card_cfg_raw()->>'interval','polmesiac')
    when 'polmesiac' then case when extract(day from t)<=15 then date_trunc('month',t)::date else date_trunc('month',t)::date+15 end
    when 'mesiac' then date_trunc('month',t)::date
    else t-greatest(1,coalesce(nullif(regexp_replace(coalesce(iv, card_cfg_raw()->>'interval'),'\D','','g'),'')::int,14))+1 end $$;
-- posledný koniec obdobia, ktorý je ≤ d
create or replace function public.card_period_end_le(d date, iv text default null) returns date language sql stable security definer set search_path=public as $$
  select case coalesce(iv, card_cfg_raw()->>'interval','polmesiac')
    when 'polmesiac' then case when d=(date_trunc('month',d)+interval '1 month -1 day')::date then d
                               when extract(day from d)>=15 then date_trunc('month',d)::date+14
                               else (date_trunc('month',d)-interval '1 day')::date end
    when 'mesiac' then case when d=(date_trunc('month',d)+interval '1 month -1 day')::date then d else (date_trunc('month',d)-interval '1 day')::date end
    else d end $$;
revoke all on function public.card_next_end(date,text) from public, anon, authenticated;
revoke all on function public.card_period_from(date,text) from public, anon, authenticated;
revoke all on function public.card_period_end_le(date,text) from public, anon, authenticated;

-- skupina vozidla (rovnako ako v aplikácii: iná/nezadaná = Flotila Región)
create or replace function public.veh_group(vid text) returns text language sql stable security definer set search_path=public as $$
  select case when c.fleet in ('region','eu','sluzobne','traktory') then c.fleet else 'region' end
    from cmd_vehicles v join cmd_vehicles c on c.id=coalesce(v.alias_of,v.id) where v.id=vid $$;
revoke all on function public.veh_group(text) from public, anon, authenticated;

-- pokrytie skupín kartami za obdobie: spotreba vs. litre z kariet (výpis, Commander, jazdy)
create or replace function public.card_cov(p_from date, p_to date) returns jsonb language sql stable security definer set search_path=public as $$
  with w as (select (p_from::timestamp at time zone 'Europe/Bratislava') a, ((p_to+1)::timestamp at time zone 'Europe/Bratislava') b),
  g as (select k, n from (values('region','Flotila Región'),('eu','Flotila EU')) x(k,n)),
  sp as (select coalesce(veh_group(r.vehicle_id),'region') k, sum(coalesce(r.fuel_consumed,0)) l, sum(coalesce(r.refuel_l,0)) rf
           from rides r, w where r.start_at>=w.a and r.start_at<w.b group by 1),
  fc as (select coalesce(veh_group(f.vehicle_id),'region') k, sum(f.liters) l from fuel_card f, w where f.at>=w.a and f.at<w.b and f.vehicle_id is not null group by 1),
  cr as (select coalesce(veh_group(veh_canon(c.object_id)),'region') k, sum(c.liters) l from cmd_refuel c, w where c.at>=w.a and c.at<w.b and c.liters>0 group by 1)
  select coalesce(jsonb_agg(jsonb_build_object('k',g.k,'skupina',g.n,'spotreba_l',round(coalesce(sp.l,0)),
     'karty_l',round(coalesce(sp.rf,0)+coalesce(fc.l,0)+coalesce(cr.l,0)),
     'chyba',coalesce(sp.l,0)>500 and coalesce(sp.rf,0)+coalesce(fc.l,0)+coalesce(cr.l,0)=0) order by g.k desc),'[]')
  from g left join sp on sp.k=g.k left join fc on fc.k=g.k left join cr on cr.k=g.k $$;
revoke all on function public.card_cov(date,date) from public, anon, authenticated;

-- skupiny bez kariet za posledné obdobie výpisu
create or replace function public.card_nocover() returns text[] language sql stable security definer set search_path=public as $$
  select coalesce(array_agg(x->>'k'),'{}') from jsonb_array_elements(case when card_last_to() is null then '[]'::jsonb
    else card_cov(card_period_from(card_last_to()), card_last_to()) end) x where (x->>'chyba')::boolean $$;
revoke all on function public.card_nocover() from public, anon, authenticated;

-- stav pre aplikáciu
create or replace function public.card_cfg_get() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb:=card_cfg_raw(); lt date:=card_last_to(); ne date;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  ne:=case when lt is not null then card_next_end(lt) end;
  return c||jsonb_build_object('interval',coalesce(c->>'interval','polmesiac'),'last_to',lt,'period_from',case when lt is not null then card_period_from(lt) end,
    'next_end',ne,'expected',ne+3,'late',ne is not null and (now() at time zone 'Europe/Bratislava')::date>ne+5,
    'cov',case when lt is not null then card_cov(card_period_from(lt),lt) else '[]'::jsonb end,
    'providers',coalesce(c->'providers','[]'::jsonb));
end $$;
revoke all on function public.card_cfg_get() from public, anon; grant execute on function public.card_cfg_get() to authenticated;

-- ===== nový výpis: posun dátumu, spätný prepočet, alarmy, súhrn do mobilu =====
create or replace function public.card_stmt_done(p_to date, p_src text default 'výpis') returns jsonb language plpgsql security definer set search_path=public as $$
declare old date:=card_last_to(); fr date; a timestamptz; b timestamptz; cb numeric; tot numeric; sp numeric; yd numeric; top text; al int; msg text; nc text[]; res jsonb;
begin
  if p_to is null or (old is not null and p_to<=old) then return jsonb_build_object('zmena',false); end if;
  fr:=coalesce(old+1, card_period_from(p_to));
  update fleet_cfg set value=value||jsonb_build_object('last_to',to_char(p_to,'YYYY-MM-DD'),'late',null,'last_import',now()) where key='cardcfg';
  a:=fr::timestamp at time zone 'Europe/Bratislava'; b:=(p_to+1)::timestamp at time zone 'Europe/Bratislava';
  -- spätný prepočet: tankovanie nesedí, zaplatené ale nie v nádrži, karta iného auta, kontroly kariet (bez okamžitých upozornení)
  begin perform refuel_gap_sync(a-interval '1 day'); exception when others then null; end;
  begin perform paid_not_tank_check(a, false); exception when others then null; end;
  begin perform card_swap_check(a, false); exception when others then null; end;
  begin perform card_checks(a); exception when others then null; end;
  cb:=round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3);
  nc:=card_nocover();
  -- litre z výpisu (karty, Commander, jazdy – bez duplicít) a spotreba za obdobie (bez skupín bez kariet a odstavených áut)
  select coalesce(sum(liters),0) into tot from card_tx(a) x where x.at<b;
  with v as (select r.vehicle_id vid, sum(coalesce(r.fuel_consumed,0)) l from rides r where r.start_at>=a and r.start_at<b group by veh_canon(r.vehicle_id), r.vehicle_id),
       vv as (select veh_canon(vid) vid, sum(l) l from v group by 1),
       k as (select x.vehicle_id vid, sum(x.liters) l from card_tx(a) x where x.at<b and x.vehicle_id is not null group by 1),
       y as (select c.id vid, sum(f.liters) l from yard_fuel f join cmd_vehicles c on (f.vehicle_id=c.id or (coalesce(f.plate,'')<>'' and pnorm(f.plate)=pnorm(c.plate)))
              where f.kind='vydaj' and f.day between fr and p_to and c.alias_of is null group by 1),
       d as (select vv.vid, vv.l-coalesce(k.l,0)-coalesce(y.l,0) dl from vv left join k on k.vid=vv.vid left join y on y.vid=vv.vid
              where not veh_off(vv.vid) and not (coalesce(veh_group(vv.vid),'region')=any(nc)) and coalesce(veh_group(vv.vid),'region') in ('region','eu'))
  select (select sum(l) from vv where not (coalesce(veh_group(vid),'region')=any(nc))), (select sum(l) from y),
         (select string_agg(coalesce((select coalesce(plate,name,id) from cmd_vehicles where id=d.vid),d.vid)||' '||push_num(d.dl*cb)||' €', ' · ' order by d.dl desc)
            from (select * from d where d.dl>30 order by d.dl desc limit 3) d)
    into sp, yd, top;
  select count(*) into al from fleet_events where kind='paid_not_tank' and at>=a and at<b and flag is null and coalesce(st,'novy')<>'falosny';
  msg:='Výpis '||to_char(fr,'FMDD.FMMM.')||'–'||to_char(p_to,'FMDD.FMMM.')||': '||push_num(tot)||' l z kariet · spotreba '||push_num(coalesce(sp,0))||' l · rozdiel '
     ||push_num(coalesce(sp,0)-tot-coalesce(yd,0))||' l ≈ '||push_num((coalesce(sp,0)-tot-coalesce(yd,0))*cb)||' € bez DPH'
     ||E'\n'||coalesce('Najväčšie rozdiely: '||top,'Žiadne auto s rozdielom nad 30 l')||case when al>0 then ' · ⛽❗ '||al||'× zaplatené, ale nie v nádrži' else '' end
     ||case when cardinality(nc)>0 then ' · bez kariet: '||array_to_string(nc,', ') else '' end;
  res:=jsonb_build_object('zmena',true,'od',fr,'do',p_to,'karty_l',round(tot),'spotreba_l',round(coalesce(sp,0)),'alarmy',al,'sprava',msg);
  begin
    perform push_send('fleet','card_stmt',to_char(p_to,'YYYY-MM-DD'),'⛽ Výpis kariet spracovaný · '||to_char(fr,'FMDD.')||'–'||to_char(p_to,'FMDD. FMMM.'),msg,4,
      'https://ernte-trade.github.io/ernte-/farmar/#flotila/fuel','owner',array['fuelpump'],interval '6 hours');
  exception when others then null; end;
  return res;
end $$;
revoke all on function public.card_stmt_done(date,text) from public, anon, authenticated;

-- denne: automatický posun podľa dát z Commandera (výpis nahraný tam) + „Výpis kariet mešká“ (5 dní po konci obdobia)
create or replace function public.card_stmt_tick() returns int language plpgsql security definer set search_path=public as $$
declare lt date:=card_last_to(); ne date; mx date; today date:=(now() at time zone 'Europe/Bratislava')::date; c jsonb:=card_cfg_raw();
begin
  if lt is null then return 0; end if;
  ne:=card_next_end(lt);
  select (greatest((select max(at) from cmd_refuel where at<now()+interval '1 day'),(select max(coalesce(stop_at,start_at)) from rides where refuel_l>0 and start_at<now()+interval '1 day'),
                   (select max(at) from fuel_card)) at time zone 'Europe/Bratislava')::date into mx;
  if mx is not null and today>ne and mx>=ne then
    perform card_stmt_done(card_period_end_le(least(mx,today-1)),'Commander');
    return 1;
  end if;
  if today>ne+5 and coalesce(c->>'late','')<>to_char(ne,'YYYY-MM-DD') then
    update fleet_cfg set value=value||jsonb_build_object('late',to_char(ne,'YYYY-MM-DD')) where key='cardcfg';
    perform push_send('fleet','card_late',to_char(ne,'YYYY-MM-DD'),'⏰ Výpis kariet mešká',
      'Obdobie '||to_char(card_period_from(ne),'FMDD.FMMM.')||'–'||to_char(ne,'FMDD.FMMM.')||' skončilo pred '||(today-ne)||' dňami a výpis ešte nie je nahraný. Flotila → ⚙️ Nastavenia → Výpis kariet.',
      4,'https://ernte-trade.github.io/ernte-/farmar/#flotila/set','owner',array['hourglass'],interval '20 hours');
    return 1;
  end if;
  return 0;
end $$;
revoke all on function public.card_stmt_tick() from public, anon, authenticated;

-- nastavenie z aplikácie: interval, posledný výpis (ručne), poskytovatelia kariet
create or replace function public.card_cfg_set(p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare iv text; lt date; pv jsonb; r jsonb:=null;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  iv:=nullif(p->>'interval','');
  if iv is not null and iv not in ('polmesiac','mesiac','7','10','14','30') then raise exception 'Neznámy interval.'; end if;
  if iv is not null then update fleet_cfg set value=value||jsonb_build_object('interval',iv) where key='cardcfg'; end if;
  if jsonb_typeof(p->'providers')='array' then
    select coalesce(jsonb_agg(jsonb_build_object('name',left(trim(x->>'name'),60),'fleet',nullif(x->>'fleet',''),'plates',left(coalesce(x->>'plates',''),400),
        'interval',coalesce(nullif(x->>'interval',''),'polmesiac'),'method',case when x->>'method' in ('csv','email','api') then x->>'method' else 'csv' end)),'[]')
      into pv from jsonb_array_elements(p->'providers') x where coalesce(trim(x->>'name'),'')<>'';
    if jsonb_array_length(pv)>10 then raise exception 'Najviac 10 poskytovateľov.'; end if;
    update fleet_cfg set value=value||jsonb_build_object('providers',pv) where key='cardcfg';
  end if;
  if coalesce(p->>'last_to','') ~ '^\d{4}-\d{2}-\d{2}$' then
    lt:=(p->>'last_to')::date;
    if lt>(now() at time zone 'Europe/Bratislava')::date then raise exception 'Dátum výpisu nemôže byť v budúcnosti.'; end if;
    if card_last_to() is null or lt>card_last_to() then r:=card_stmt_done(lt,'ručne');
    else update fleet_cfg set value=value||jsonb_build_object('last_to',to_char(lt,'YYYY-MM-DD')) where key='cardcfg'; end if;
  end if;
  return card_cfg_get()||jsonb_build_object('vysledok',r);
end $$;
revoke all on function public.card_cfg_set(jsonb) from public, anon; grant execute on function public.card_cfg_set(jsonb) to authenticated;

-- ===== import výpisu: poskytovateľ + po importe posun obdobia a súhrn =====
drop function if exists public.fuel_card_import(jsonb,text);
create or replace function public.fuel_card_import(rows jsonb, fname text default null, p_provider text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; n int:=0; d int:=0; a timestamptz; t0 timestamptz; t1 timestamptz; li numeric; pr numeric; pl text; cd text; m int; al int; bez int; nez int; st jsonb;
begin
  if not is_fleet() then raise exception 'Iba doprava a flotila.'; end if;
  if jsonb_typeof(rows)<>'array' then raise exception 'Chybný formát.'; end if;
  for r in select * from jsonb_array_elements(rows) loop
    begin a:=(r->>'at')::timestamptz; exception when others then a:=null; end;
    li:=nullif(replace(coalesce(r->>'liters',''),',','.'),'')::numeric;
    pr:=nullif(replace(coalesce(r->>'price',''),',','.'),'')::numeric;
    pl:=nullif(trim(coalesce(r->>'plate','')),''); cd:=nullif(trim(coalesce(r->>'card','')),'');
    if a is null or li is null or li<=0 or (pl is null and cd is null) then continue; end if;
    if pr is not null and pr>0 and pr<5 then pr:=round(pr*li,2); end if;  -- cena za liter → spolu
    insert into fuel_card(at,plate,card,station,liters,price,ppl,src,imported_by,vehicle_id,uq)
      values(a,pl,cd,nullif(trim(coalesce(r->>'station','')),''),li,pr,case when pr>0 then round(pr/li,3) end,left(coalesce(nullif(trim(p_provider),'')||' · ','')||coalesce(fname,''),120),auth.jwt()->>'email',fuel_card_vid(pl,cd),
             to_char(a at time zone 'UTC','YYYYMMDDHH24MI')||'|'||coalesce(pnorm(pl),pnorm(cd))||'|'||round(li,2))
      on conflict (uq) do nothing;
    get diagnostics m=row_count;
    if m>0 then n:=n+1; t0:=least(coalesce(t0,a),a); t1:=greatest(coalesce(t1,a),a); else d:=d+1; end if;
  end loop;
  if t0 is not null then
    perform probe_refuel_sync(t0-interval '1 day');
    perform fuel_card_match(t0-interval '1 day');
    al:=card_swap_check(t0-interval '1 day', false);
  end if;
  select count(*) filter (where m_state='sparovane'), count(*) filter (where m_state='bez_sondy'), count(*) filter (where m_state='nezname_auto') into m,bez,nez
    from fuel_card where t0 is not null and at>=t0;
  -- nové obdobie výpisu (posledný úplný koniec obdobia, ktorý výpis pokrýva)
  if t1 is not null then
    begin st:=card_stmt_done(card_period_end_le((t1 at time zone 'Europe/Bratislava')::date), coalesce(nullif(trim(p_provider),''),'výpis'));
    exception when others then st:=jsonb_build_object('chyba',left(SQLERRM,200)); end;
  end if;
  return jsonb_build_object('nove',n,'duplicitne',d,'sparovane',coalesce(m,0),'bez_sondy',coalesce(bez,0),'nezname_auto',coalesce(nez,0),'alarmy',coalesce(al,0),'obdobie',st);
end $$;
revoke all on function public.fuel_card_import(jsonb,text,text) from public, anon;
grant execute on function public.fuel_card_import(jsonb,text,text) to authenticated;

-- ===== stav tankovacích dát: obdobie výpisu, čakanie na výpis, skupiny bez kariet =====
create or replace function public.fuel_data_status() returns jsonb language sql stable security definer set search_path=public as $$
  with s as (select greatest((select max(at) from fuel_card),(select max(at) from cmd_refuel),(select max(coalesce(stop_at,start_at)) from rides where refuel_l>0)) last_at,
                    card_last_to() lt, card_cut() cut)
  select jsonb_build_object('posledne_tankovanie',to_char(last_at at time zone 'Europe/Bratislava','YYYY-MM-DD"T"HH24:MI'),
    'chybaju_od',case when (last_at is null or last_at<now()-interval '48 hours') and not (lt is not null and last_at>=cut-interval '3 days')
                      then to_char(coalesce(last_at,now()-interval '35 days') at time zone 'Europe/Bratislava'+interval '1 day','YYYY-MM-DD') end,
    'neuplne',(last_at is null or last_at<now()-interval '48 hours') and not (lt is not null and last_at>=cut-interval '3 days'),
    'vypis_do',lt, 'caka_od', case when lt is not null and cut<now() then lt+1 end,
    'ocakavany_vypis', case when lt is not null then card_next_end(lt)+3 end,
    'vypis_mesko', lt is not null and (now() at time zone 'Europe/Bratislava')::date>card_next_end(lt)+5,
    'interval', coalesce(card_cfg_raw()->>'interval','polmesiac'),
    'skupiny', case when lt is not null then card_cov(card_period_from(lt),lt) else '[]'::jsonb end,
    'commander_refuel',(select jsonb_agg(jsonb_build_object('konto',acc,'kod',code,'zaznamov',n,'posledne_ok',to_char(ok_at at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'sprava',left(msg,140))) from cmd_api where kind in ('refuel','refuelbf'))) from s $$;
revoke all on function public.fuel_data_status() from public, anon, authenticated;

-- ===== bilancia nádrže po autách: iba do dátumu posledného výpisu kariet; skupiny bez kariet bez € strát =====
create or replace function public.fuel_balance(days integer default 7) returns jsonb language sql stable security definer set search_path=public as $$
  with p as (select now()-make_interval(days=>days) w0, least(now(),card_cut()) te, card_cut() cut, card_last_to() lt, card_nocover() nc,
                    round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3) cb,
                    greatest((select max(at) from fuel_card),(select max(at) from cmd_refuel),(select max(coalesce(stop_at,start_at)) from rides where refuel_l>0)) lastref),
  v as (select id, coalesce(plate,name,id) auto, upper(replace(coalesce(plate,''),' ','')) pn, veh_off(id) off,
               (case when fleet in ('region','eu','sluzobne','traktory') then fleet else 'region' end) fl from cmd_vehicles where alias_of is null and not coalesce(deleted,false)),
  -- prvá a posledná hladina v okne (sonda, začiatok/koniec jazdy) – okno končí dátumom posledného výpisu kariet
  b as (select v.id, v.auto, v.pn, v.off, v.fl, f.at t0, f.tank l0, l.at t1, l.tank l1,
          (select coef from veh_calib c where c.vehicle_id=v.id and c.flagged) coef
        from v cross join p
        left join lateral (select * from (
            (select tl.at, tl.tank from tank_log tl where tl.vehicle_id=v.id and tl.at>=p.w0 and tl.at<=p.te and tl.tank is not null order by tl.at limit 1)
            union all (select r.start_at, r.fuel_start from rides r where r.vehicle_id=v.id and r.start_at>=p.w0 and r.start_at<=p.te and r.fuel_start is not null order by r.start_at limit 1)) q order by 1 limit 1) f on true
        left join lateral (select * from (
            (select tl.at, tl.tank from tank_log tl where tl.vehicle_id=v.id and tl.at>=p.w0 and tl.at<=p.te and tl.tank is not null order by tl.at desc limit 1)
            union all (select r.stop_at, r.fuel_stop from rides r where r.vehicle_id=v.id and r.start_at>=p.w0 and r.stop_at<=p.te and r.fuel_stop is not null order by r.start_at desc limit 1)) q order by 1 desc limit 1) l on true),
  a as (select b.*,
          (select coalesce(sum(refuel_l),0) from rides r where r.vehicle_id=any(veh_ids(b.id)) and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) nat,
          (select coalesce(sum(fuel_consumed),0) from rides r where r.vehicle_id=any(veh_ids(b.id)) and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) spotr,
          (select coalesce(sum(distance),0) from rides r where r.vehicle_id=any(veh_ids(b.id)) and r.start_at>=b.t0 and coalesce(r.stop_at,r.start_at)<=b.t1) km,
          (select coalesce(sum(liters),0) from yard_fuel y where y.kind='vydaj' and (y.vehicle_id=b.id or (b.pn<>'' and upper(replace(coalesce(y.plate,''),' ',''))=b.pn))
              and y.day between (b.t0 at time zone 'Europe/Bratislava')::date and (b.t1 at time zone 'Europe/Bratislava')::date) dvor,
          (select count(*) from fleet_events e, p where e.vehicle_id=any(veh_ids(b.id)) and e.kind in ('fuel_drop','refuel_gap','fuel_transfer','paid_not_tank') and e.at>=p.w0 and e.flag is null and e.st<>'falosny') alarmy
        from b),
  r as (select a.*, p.cb, p.w0>=p.cut caka, p.lt, (a.fl=any(p.nc)) nocard, a.t0 is not null and a.t1>a.t0 ok, (p.lastref is null or a.t1>p.lastref+interval '24 hours') neupl,
          (a.l0-a.l1)/coalesce(a.coef,1) dl,
          a.spotr-(a.nat+a.dvor+(a.l0-a.l1)/coalesce(a.coef,1)) chyba
        from a, p)
  select coalesce(jsonb_agg(jsonb_build_object(
     'auto',auto,
     'od',to_char(t0 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),'do',to_char(t1 at time zone 'Europe/Bratislava','DD.MM HH24:MI'),
     'nadrz_zaciatok_l',round(l0),'natankovane_l',round(nat),'vydaj_z_dvora_l',round(dvor),'spotreba_jazdou_l',round(spotr),'nadrz_koniec_l',round(l1),'km',round(km),
     'kalibracny_koeficient',coef,'vypis_kariet_do',lt,
     'nevysvetleny_ubytok_l',case when ok and not caka and not nocard then round(dl+nat+dvor-spotr) end,
     'stav',case when caka then 'čaká na výpis kariet (očakávaný ~'||to_char(card_next_end(lt)+3,'FMDD.FMMM.')||') – nepočíta sa'
                 when nocard then 'chýba výpis kariet skupiny (iný poskytovateľ?) – nepočíta sa do strát'
                 when not ok then 'málo dát (menej ako dva záznamy hladiny v okne)'
                 when off then 'odstavené / na servise – nepočíta sa'
                 when neupl and chyba>30 then 'tankovania z kariet chýbajú – rozdiel neúplný (nie alarm)'
                 when coef is not null then 'snímač nekalibrovaný (koeficient '||replace(coef::text,'.',',')||') – orientačne'
                 when chyba>30 then 'chýbajú záznamy o tankovaní (nie krádež)'
                 when dl+nat+dvor-spotr>30 then 'nevysvetlený úbytok – skontrolovať'
                 else 'v poriadku' end,
     'neuplne_tankovacie_data',neupl or caka or nocard,
     'chybajuce_tankovanie_l',case when ok and chyba>30 and not neupl and not caka and not nocard then round(chyba) end,
     'chybajuce_tankovanie_eur_bez_dph',case when ok and chyba>30 and not neupl and not caka and not nocard then round(chyba*cb) end,
     'nevysvetleny_ubytok_eur_bez_dph',case when ok and not off and not caka and not nocard and coef is null and dl+nat+dvor-spotr>30 then round((dl+nat+dvor-spotr)*cb) end,
     'cena_nafty_bez_dph',cb,'alarmy_nafty',alarmy)
     order by case when ok and not caka then abs(dl+nat+dvor-spotr) end desc nulls last),'[]') from r $$;
revoke all on function public.fuel_balance(int) from public, anon, authenticated;
