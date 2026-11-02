-- 📈 PREDPOVEĎ TRHU (#94): repka, pšenica, kukurica (MATIF) a sója (CBOT, €/t) – smer a pásmo 10 / 50 / 90 % na 1 týždeň, 1 mesiac, 3 mesiace.
-- Model je zámerne jednoduchý a poctivý: empirické kvantily historických zmien za horizont (pri krátkej histórii normálne rozdelenie
-- z denných zmien, inak predpoklad ~20 %/rok) + malý posun (najviac ± 3 %) zo signálov: krivka kontraktov (carry), pozície fondov (COT),
-- sezónnosť (iba ak sú ≥ 2 roky dát), počasie v hlavných oblastiach. Každá predpoveď sa uloží (trh_predpovede) a po horizonte vyhodnotí
-- voči naivnej predpovedi „cena ostane rovnaká“ (zásah smeru, Brierovo skóre, chyba €/t). Odporúčanie kúpiť / predať / zaistiť sa ukáže
-- IBA keď model za posledných 6 mesiacov preukázateľne porazil naivnú predpoveď (≥ 30 vyhodnotení, menšia priemerná chyba aj Brier),
-- inak „model neporáža trh – len informácia“. História burzy je v databáze iba odteraz (AHDB od 2015 bez súhlasu poskytovateľa nepoužívame).
-- Ranný súhrn 5:00 (push priorita 3), pred / po WASDE a MARS push priorita 4 s dopadom na otvorené pozície. Iba majiteľ.

create table if not exists public.trh_predpovede(
  id bigserial primary key, vytvorene timestamptz not null default now(), k_dnu date not null, komodita text not null, horizont text not null,
  dni int not null, cielovy_den date not null, cena0 numeric not null, p10 numeric, p50 numeric, p90 numeric, p_hore numeric, smer text,
  metoda text, signaly jsonb, n_hist int, vyhodnotene_at timestamptz, cena_skut numeric, hit boolean, v_pasme boolean,
  brier numeric, brier_naiv numeric, chyba numeric, chyba_naiv numeric,
  constraint trh_predpovede_uq unique(komodita,horizont,k_dnu));
alter table public.trh_predpovede add column if not exists kontrakt text;
create index if not exists trh_predpovede_eval on public.trh_predpovede(vyhodnotene_at, k_dnu);
alter table public.trh_predpovede enable row level security;
drop policy if exists trh_predpovede_own on public.trh_predpovede;
create policy trh_predpovede_own on public.trh_predpovede for select using (is_owner());
revoke all on public.trh_predpovede from anon;
grant select on public.trh_predpovede to authenticated;

-- komodita → (zdroj, komodita) v trh_data
create or replace function public.trh_zk(k text) returns text[] language sql immutable as $$
  select case when k='soja' then array['cbot','soja'] else array['matif',k] end $$;
create or replace function public.trh_kom_nm(k text) returns text language sql immutable as $$
  select case k when 'repka' then 'Repka' when 'psenica' then 'Pšenica' when 'kukurica' then 'Kukurica' when 'soja' then 'Sója' else k end $$;
create or replace function public.trh_clip(x float8, a float8) returns float8 language sql immutable as $$ select greatest(-a, least(a, coalesce(x,0))) $$;

-- rad záverov (najbližší kontrakt ako odberatelia) s kódom kontraktu – zmeny cez prechod kontraktu sa nerátajú
create or replace function public.trh_rad(p_kom text, p_asof date) returns table(d date, v numeric, c numeric, rn bigint) language sql stable security definer set search_path=public as $$
  select x.platne, x.hodnota, k.hodnota, row_number() over (order by x.platne)
  from trh_data x left join trh_data k on k.zdroj=x.zdroj and k.komodita=x.komodita and k.indikator='close_kontrakt' and k.platne=x.platne
  where x.zdroj=(trh_zk(p_kom))[1] and x.komodita=(trh_zk(p_kom))[2] and x.indikator='close' and x.platne<=p_asof and x.hodnota>0 $$;
revoke all on function public.trh_rad(text,date) from public, anon, authenticated;

-- jedna predpoveď z údajov do dňa p_asof (bez pohľadu do budúcnosti – rovnaká funkcia slúži aj na spätný test)
create or replace function public.trh_pred_calc(p_kom text, p_h int, p_asof date) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare zk text[]:=trh_zk(p_kom); c0 numeric; d0 date; nh int; nr int:=0; n1 int:=0; q float8[]; sig float8; med float8:=0; drift float8;
  carry float8:=0; cotv float8:=0; seas float8:=0; wx float8:=0; pup float8; metoda text; emp boolean:=false;
  p1 numeric; p2 numeric; m1 date; m2 date; cotpct numeric; yrs int; savg float8; nrisk int:=0; fx0 numeric; fx1 numeric; mo int:=extract(month from p_asof);
begin
  select platne, hodnota into d0, c0 from trh_data where zdroj=zk[1] and komodita=zk[2] and indikator='close' and platne<=p_asof and hodnota>0 order by platne desc limit 1;
  if c0 is null then return null; end if;
  select count(*) into nh from trh_data where zdroj=zk[1] and komodita=zk[2] and indikator='close' and platne<=p_asof and hodnota>0;
  -- zmeny za horizont (prekrývajúce sa okná, obchodné dni)
  with s as (select * from trh_rad(p_kom,p_asof)),
       r as (select a.d, ln(b.v/a.v) x from s a join s b on b.rn=a.rn+p_h and a.c is not distinct from b.c)
  select count(*), percentile_cont(array[0.1,0.5,0.9]) within group (order by x),
         count(distinct extract(year from d)) filter (where extract(month from d)=mo and d<date_trunc('year',p_asof)), avg(x) filter (where extract(month from d)=mo and d<date_trunc('year',p_asof))
    into nr, q, yrs, savg from r;
  if nr>=30 then
    emp:=true; med:=q[2]; q:=array[q[1]-med, 0, q[3]-med];
    metoda:='empirické kvantily z '||nr||' historických '||p_h||'-dňových zmien';
  else
    with s as (select * from trh_rad(p_kom,p_asof)),
         r as (select ln(b.v/a.v) x from s a join s b on b.rn=a.rn+1 and a.c is not distinct from b.c)
    select stddev_samp(x), count(*) into sig, n1 from r;
    if n1<10 or sig is null or sig<=0 then sig:=0.013; metoda:='krátka história ('||nh||' dní) – predpokladaná volatilita 1,3 %/deň (~20 %/rok)';
    else sig:=greatest(sig,0.005); metoda:='normálne rozdelenie z '||n1||' denných zmien (σ '||round((sig*100)::numeric,2)||' %/deň)'; end if;
    q:=array[-1.2816*sig*sqrt(p_h), 0, 1.2816*sig*sqrt(p_h)];
  end if;
  -- krivka kontraktov: sklon medzi dvoma najbližšími kontraktmi (končiacimi najskôr o 20 dní)
  select hodnota, to_date(substr(indikator,10)||'-15','YYYY-MM-DD') into p1, m1 from (select distinct on (indikator) indikator, hodnota from trh_data
    where zdroj=zk[1] and komodita=zk[2] and indikator ~ '^kontrakt \d{4}-\d\d$' and platne between p_asof-7 and p_asof order by indikator, platne desc) c
    where to_date(substr(indikator,10)||'-15','YYYY-MM-DD')>=p_asof+20 order by indikator limit 1;
  if p1 is not null then
    select hodnota, to_date(substr(indikator,10)||'-15','YYYY-MM-DD') into p2, m2 from (select distinct on (indikator) indikator, hodnota from trh_data
      where zdroj=zk[1] and komodita=zk[2] and indikator ~ '^kontrakt \d{4}-\d\d$' and platne between p_asof-7 and p_asof order by indikator, platne desc) c
      where to_date(substr(indikator,10)||'-15','YYYY-MM-DD')>m1 order by indikator limit 1;
    if p2 is not null and p1>0 and m2>m1 then carry:=trh_clip(0.5*ln(p2/p1)/greatest(1,(m2-m1)/30.4)*(p_h/21.0), 0.02); end if;
  end if;
  -- pozície fondov (COT, managed money netto v % otvorených pozícií) – extrém = mierne proti smeru
  if p_kom in ('soja','kukurica','psenica') then
    select hodnota into cotpct from trh_data where zdroj='cot' and komodita=p_kom and indikator='mm_net_pct_oi' and platne between p_asof-21 and p_asof order by platne desc limit 1;
    if cotpct is not null then
      cotv:=trh_clip(case when cotpct>=20 then -0.005 when cotpct<=-15 then 0.005 else 0 end*(p_h/21.0)*case when zk[1]='matif' then 0.5 else 1 end, 0.015);
    end if;
  end if;
  -- sezónnosť: iba ak sú aspoň 2 predchádzajúce roky
  if coalesce(yrs,0)>=2 then seas:=trh_clip(0.5*savg, 0.02); end if;
  -- počasie: sucho alebo jarný mráz v hlavných oblastiach
  select count(*) into nrisk from (select komodita, max(hodnota) filter (where indikator='sucho') su, max(hodnota) filter (where indikator='mraz_dni_7d') mr
      from trh_data where zdroj='meteo' and platne between p_asof-2 and p_asof
        and komodita=any(case p_kom when 'soja' then array['US','BR'] when 'kukurica' then array['US','UA','FR','HU'] when 'psenica' then array['FR','UA','US'] else array['FR','UA','HU'] end)
      group by komodita) w where su>=1 or (mr>=3 and mo in (4,5));
  wx:=least(0.01, 0.003*nrisk);
  -- EUR/USD (iba informácia)
  select hodnota into fx1 from trh_data where zdroj='ecb' and indikator='eurusd' and platne<=p_asof order by platne desc limit 1;
  select hodnota into fx0 from trh_data where zdroj='ecb' and indikator='eurusd' and platne<=p_asof-30 order by platne desc limit 1;
  drift:=trh_clip(carry+cotv+seas+wx, 0.03);
  if emp then
    with s as (select * from trh_rad(p_kom,p_asof)),
         r as (select ln(b.v/a.v) x from s a join s b on b.rn=a.rn+p_h and a.c is not distinct from b.c)
    select avg(((x-med+drift)>0)::int) into pup from r;
  else
    pup:=1/(1+exp(-1.702*drift/greatest(1e-6,sig*sqrt(p_h))));
  end if;
  return jsonb_build_object('d0',d0,'cena0',c0,'kontrakt',(select to_char(to_date(hodnota::int::text,'YYYYMM'),'YYYY-MM') from trh_data where zdroj=zk[1] and komodita=zk[2] and indikator='close_kontrakt' and platne=d0),'p10',round(c0*exp(q[1]+drift)::numeric,2),'p50',round(c0*exp(drift)::numeric,2),'p90',round(c0*exp(q[3]+drift)::numeric,2),
    'p_hore',round(pup::numeric,3),'smer',case when pup>=0.55 then 'hore' when pup<=0.45 then 'dole' else 'bokom' end,'metoda',metoda,'n_hist',nh,
    'signaly',jsonb_build_object('carry_pct',round((carry*100)::numeric,2),'cot_pct',round((cotv*100)::numeric,2),'cot_mm_net_oi',cotpct,
      'sezona_pct',round((seas*100)::numeric,2),'sezona_rokov',coalesce(yrs,0),'pocasie_pct',round((wx*100)::numeric,2),'pocasie_rizika',nrisk,
      'eurusd',fx1,'eurusd_1m_pct',case when fx0>0 then round(100*(fx1/fx0-1),2) end,'posun_pct',round((drift*100)::numeric,2)));
end $$;
revoke all on function public.trh_pred_calc(text,int,date) from public, anon, authenticated;

-- vyhodnotenie predpovedí po horizonte
create or replace function public.trh_pred_eval() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  with a as (select p.id, x.v from trh_predpovede p
      cross join lateral (select hodnota v from trh_data d where d.zdroj=(trh_zk(p.komodita))[1] and d.komodita=(trh_zk(p.komodita))[2]
        and (d.indikator='close' or d.indikator='kontrakt '||p.kontrakt)
        and d.platne<=p.cielovy_den and d.platne>=p.cielovy_den-5 and d.hodnota>0 order by (d.indikator<>'close') desc, d.platne desc limit 1) x
      where p.vyhodnotene_at is null and p.cielovy_den<=current_date)
  update trh_predpovede p set cena_skut=a.v, vyhodnotene_at=now(),
    hit=case p.smer when 'hore' then a.v>p.cena0 when 'dole' then a.v<p.cena0 else abs(a.v/p.cena0-1)<0.01 end,
    v_pasme=a.v between p.p10 and p.p90, brier=round(power(p.p_hore-(a.v>p.cena0)::int,2),4), brier_naiv=0.25,
    chyba=round(abs(p.p50-a.v),2), chyba_naiv=round(abs(p.cena0-a.v),2)
  from a where p.id=a.id;
  get diagnostics n=row_count;
  return n;
end $$;
revoke all on function public.trh_pred_eval() from public, anon, authenticated;

-- denný výpočet (jedna predpoveď na komoditu × horizont × obchodný deň)
create or replace function public.trh_pred_run() returns int language plpgsql security definer set search_path=public as $$
declare k text; hz record; x jsonb; n int:=0;
begin
  foreach k in array array['repka','psenica','kukurica','soja'] loop
    for hz in select * from (values ('1t',5,7),('1m',21,30),('3m',63,91)) v(h,dni,kal) loop
      x:=trh_pred_calc(k,hz.dni,current_date);
      if x is null then continue; end if;
      insert into trh_predpovede(k_dnu,komodita,horizont,dni,cielovy_den,cena0,p10,p50,p90,p_hore,smer,metoda,signaly,n_hist,kontrakt)
        values((x->>'d0')::date,k,hz.h,hz.dni,(x->>'d0')::date+hz.kal,(x->>'cena0')::numeric,(x->>'p10')::numeric,(x->>'p50')::numeric,(x->>'p90')::numeric,
          (x->>'p_hore')::numeric,x->>'smer',x->>'metoda',x->'signaly',(x->>'n_hist')::int,x->>'kontrakt')
      on conflict on constraint trh_predpovede_uq do update set p10=excluded.p10,p50=excluded.p50,p90=excluded.p90,p_hore=excluded.p_hore,smer=excluded.smer,
        metoda=excluded.metoda,signaly=excluded.signaly,n_hist=excluded.n_hist,cena0=excluded.cena0,kontrakt=excluded.kontrakt,vytvorene=now()
        where trh_predpovede.vyhodnotene_at is null;
      n:=n+1;
    end loop;
  end loop;
  perform trh_pred_eval();
  return n;
exception when others then
  begin insert into check_err(fn,msg,at) values('trh_pred_run',left(SQLERRM,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(); exception when others then null; end;
  return -1;
end $$;
revoke all on function public.trh_pred_run() from public, anon, authenticated;

-- úspešnosť za obdobie (predvolene posledných 6 mesiacov)
create or replace function public.trh_pred_skore(p_od date default null) returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(k,x),'{}') from (
    select coalesce(komodita,'spolu') k, jsonb_build_object('n',count(*),'zasah_pct',round(100*avg(hit::int),1),'mae',round(avg(chyba),2),'mae_naiv',round(avg(chyba_naiv),2),
      'brier',round(avg(brier),4),'brier_naiv',round(avg(brier_naiv),4),'pasmo_pct',round(100*avg(v_pasme::int),1),
      'porazi',count(*)>=30 and avg(chyba)<avg(chyba_naiv) and avg(brier)<avg(brier_naiv)) x
    from trh_predpovede where vyhodnotene_at is not null and k_dnu>=coalesce(p_od,current_date-182) group by rollup(komodita)) s $$;
revoke all on function public.trh_pred_skore(date) from public, anon, authenticated;

-- odporúčanie iba keď model porazil trh
create or replace function public.trh_odporucanie(p_kom text) returns text language plpgsql stable security definer set search_path=public as $$
declare s jsonb:=trh_pred_skore(null)->p_kom; p record;
begin
  if s is null or not coalesce((s->>'porazi')::boolean,false) then return 'model neporáža trh – len informácia'; end if;
  select * into p from trh_predpovede where komodita=p_kom and horizont='1m' order by k_dnu desc limit 1;
  if p.id is null then return 'model neporáža trh – len informácia'; end if;
  if p.smer='hore' and p.p_hore>=0.6 then return '📈 DRŽ – s predajom počkaj; nákup za zverejnené ceny teraz (pravdepodobnosť rastu '||round(p.p_hore*100)||' %)'; end if;
  if p.smer='dole' and p.p_hore<=0.4 then return '📉 PREDAJ alebo zaisti (hedge) otvorené pozície; pri nákupe opatrne (pravdepodobnosť poklesu '||round((1-p.p_hore)*100)||' %)'; end if;
  return '⏸️ bez jasného signálu – drž plán';
end $$;
revoke all on function public.trh_odporucanie(text) from public, anon, authenticated;

-- otvorené pozície = nakúpené obchody bez predajnej ceny (bez závislosti od iných rozpracovaných tabuliek)
create or replace function public.trh_otvorene() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare q text; res jsonb;
begin
  if to_regclass('public.deals') is null then return '{}'; end if;
  q:='select case when com in (''psenica_p'',''psenica_k'') then ''psenica'' when com in (''repka'',''kukurica'',''soja'') then com else ''ine'' end k, sum(tons) t, sum(tons*price) h, count(*) n
      from deals d where status in (''podpisany'',''odvoz'',''odvezeny'',''fakturacia'',''zaplateny'') and tons>0'
    ||case when to_regprocedure('public.deal_live(public.deals)') is not null then ' and deal_live(d)' else '' end
    ||case when to_regclass('public.deal_fin') is not null then ' and not exists(select 1 from deal_fin f where f.deal_id=d.id and f.sell_price is not null)' else '' end
    ||' group by 1';
  execute 'select coalesce(jsonb_object_agg(k, jsonb_build_object(''t'',round(t,1),''hodnota'',round(h),''n'',n)),''{}'') from ('||q||') x' into res;
  return coalesce(res,'{}');
exception when others then return jsonb_build_object('chyba',SQLERRM);
end $$;
revoke all on function public.trh_otvorene() from public, anon, authenticated;

-- spätný test nad históriou, ktorú databáza má (od 2015 iba ak by tam bola legálne získaná história)
create or replace function public.trh_pred_backtest(p_od date default '2015-01-01', p_krok int default 5) returns jsonb language plpgsql security definer set search_path=public as $$
declare k text; hz record; d date; x jsonb; a numeric; res jsonb:='{}'; o jsonb; n int; se numeric; sn numeric; sb numeric; sh int; sp int; c0 numeric; d1 date; nd int; sbn numeric; kr int;
begin
  -- krok: najviac ~120 bodov na komoditu a horizont (výpočet do pár sekúnd)
  select count(distinct platne) into nd from trh_data where zdroj in ('matif','cbot') and indikator='close' and platne>=p_od;
  kr:=greatest(coalesce(p_krok,5), ceil(coalesce(nd,0)/120.0)::int);
  foreach k in array array['repka','psenica','kukurica','soja'] loop
    o:='{}';
    for hz in select * from (values ('1t',5,7),('1m',21,30),('3m',63,91)) v(h,dni,kal) loop
      n:=0; se:=0; sn:=0; sb:=0; sh:=0; sp:=0; sbn:=0;
      for d in select platne from (select platne, row_number() over (order by platne) rn from trh_data where zdroj=(trh_zk(k))[1] and komodita=(trh_zk(k))[2] and indikator='close' and hodnota>0) s
               where platne>=p_od and platne<=current_date-hz.kal and rn>=10 and rn % greatest(1,kr)=0 order by platne loop
        x:=trh_pred_calc(k,hz.dni,d); if x is null then continue; end if;
        select hodnota into a from trh_data where zdroj=(trh_zk(k))[1] and komodita=(trh_zk(k))[2] and indikator='close' and platne<=d+hz.kal and platne>=d+hz.kal-5 order by platne desc limit 1;
        if a is null then continue; end if;
        c0:=(x->>'cena0')::numeric; n:=n+1;
        se:=se+abs((x->>'p50')::numeric-a); sn:=sn+abs(c0-a); sb:=sb+power((x->>'p_hore')::numeric-(a>c0)::int,2); sbn:=sbn+0.25;
        sh:=sh+case x->>'smer' when 'hore' then (a>c0)::int when 'dole' then (a<c0)::int else (abs(a/c0-1)<0.01)::int end;
        sp:=sp+(a between (x->>'p10')::numeric and (x->>'p90')::numeric)::int;
      end loop;
      o:=o||jsonb_build_object(hz.h,case when n=0 then jsonb_build_object('n',0) else jsonb_build_object('n',n,'mae',round(se/n,2),'mae_naiv',round(sn/n,2),'brier',round(sb/n,4),
        'brier_naiv',round(sbn/n,4),'zasah_pct',round(100.0*sh/n,1),'pasmo_pct',round(100.0*sp/n,1),'porazi',n>=30 and se<sn and sb<sbn) end);
    end loop;
    res:=res||jsonb_build_object(k,o);
  end loop;
  select min(platne), count(distinct platne) into d1, nd from trh_data where zdroj in ('matif','cbot') and indikator='close';
  res:=jsonb_build_object('at',now(),'od',d1,'dni',nd,'vysledok',res,
    'krok_dni',kr,'poznamka','Spätný test beží iba nad históriou v databáze'||coalesce(' (od '||to_char(d1,'DD. MM. YYYY')||', '||nd||' obchodných dní)','')
      ||'. Dlhšia história od 2015 (AHDB) sa bez súhlasu poskytovateľa nepoužíva – výsledok je preto zatiaľ málo spoľahlivý.');
  insert into ai_state(key,value) values('trh_backtest',res) on conflict(key) do update set value=excluded.value, updated_at=now();
  return res;
end $$;
revoke all on function public.trh_pred_backtest(date,int) from public, anon, authenticated;

-- posledné závery 4 komodít (pre ranný súhrn)
create or replace function public.trh_zavery() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(k, jsonb_build_object('v',l.hodnota,'d',l.platne,'pv',p.hodnota,'pd',p.platne)),'{}')
  from unnest(array['repka','psenica','kukurica','soja']) k
  cross join lateral (select hodnota, platne from trh_data where zdroj=(trh_zk(k))[1] and komodita=(trh_zk(k))[2] and indikator='close' order by platne desc limit 1) l
  left join lateral (select hodnota, platne from trh_data where zdroj=(trh_zk(k))[1] and komodita=(trh_zk(k))[2] and indikator='close' and platne<l.platne order by platne desc limit 1) p on true $$;
revoke all on function public.trh_zavery() from public, anon, authenticated;

create or replace function public.trh_eur(x numeric, p_dec int default 0) returns text language sql immutable as $$
  select case when x is null then '–' else case when round(x,p_dec)<0 then '−' else '' end||replace(replace(to_char(abs(round(x,p_dec)),'FM999,999,990'||case when p_dec>0 then '.'||repeat('0',p_dec) else '' end),',',' '),'.',',') end $$;

-- ☀️ ranný súhrn trhu o 5:00 (Bratislava) → push majiteľovi priorita 3
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

-- 🕒 pred a po WASDE / MARS: dopad na otvorené pozície (push priorita 4)
create or replace function public.trh_px_now() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(case sym when 'soja_usc_bu' then 'soja' else sym end, eur_t),'{}') from market_px where sym in ('repka','psenica','kukurica','soja_usc_bu') and eur_t>0 $$;

create or replace function public.trh_udalost_tick() returns text language plpgsql security definer set search_path=public as $$
declare e record; op jsonb:=trh_otvorene(); px jsonb; k text; b text; t numeric; d numeric; s numeric; w jsonb; res text:='';
begin
  -- spätný test na žiadosť z aplikácie
  if exists(select 1 from ai_state where key='trh_backtest_req' and not (value ? 'done')) then
    update ai_state set value=value||jsonb_build_object('done',now()) where key='trh_backtest_req';
    begin perform trh_pred_backtest(); res:='backtest '; exception when others then
      insert into check_err(fn,msg,at) values('trh_pred_backtest',left(SQLERRM,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(); end;
  end if;
  for e in select * from trh_udalosti where kod in ('wasde','mars') and at between now()-interval '70 minutes' and now()+interval '40 minutes' loop
    if e.pre_at is null and now() between e.at-interval '35 minutes' and e.at-interval '5 minutes' then
      px:=trh_px_now(); b:='Otvorené pozície (nakúpené, ešte nepredané):'; s:=0;
      foreach k in array array['repka','psenica','kukurica','soja'] loop
        t:=(op->k->>'t')::numeric;
        if coalesce(t,0)>0 then b:=b||chr(10)||trh_kom_nm(k)||' '||trh_eur(t)||' t'||case when px ? k then ' · burza '||trh_eur((px->>k)::numeric,2)||' €/t' else '' end;
          s:=s+t*coalesce((px->>k)::numeric,0)*0.01; end if;
      end loop;
      if s=0 then b:='Otvorené pozície naviazané na burzu: žiadne.'; else b:=b||chr(10)||'Pohyb burzy o 1 % = ± '||trh_eur(s)||' €'; end if;
      perform push_send('trh','udalost_pre',e.id::text,'⏰ O 30 min '||e.nazov||' ('||to_char(e.at at time zone 'Europe/Bratislava','HH24:MI')||')',
        b||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → Trh a predpoveď',4,'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['alarm_clock'],interval '6 hours');
      update trh_udalosti set pre_at=now(), pre_px=px where id=e.id; res:=res||'pre '||e.kod||' ';
    elsif e.post_at is null and now() between e.at+interval '15 minutes' and e.at+interval '60 minutes' then
      px:=trh_px_now(); b:=''; s:=0;
      foreach k in array array['repka','psenica','kukurica','soja'] loop
        t:=coalesce((op->k->>'t')::numeric,0);
        d:=case when e.pre_px ? k and px ? k then (px->>k)::numeric-(e.pre_px->>k)::numeric end;
        if d is not null then
          b:=b||chr(10)||trh_kom_nm(k)||' '||case when d>=0 then '+' else '' end||trh_eur(d,2)||' €/t'||case when t>0 then ' → '||trh_eur(t)||' t = '||case when d*t>=0 then '+' else '' end||trh_eur(d*t)||' €' else '' end;
          s:=s+d*t;
        end if;
      end loop;
      b:=case when b='' then 'Burza pred zverejnením nebola zaznamenaná – dopad sa nedá porovnať.' else 'Burza od '||coalesce(to_char(e.pre_at at time zone 'Europe/Bratislava','HH24:MI'),'?')||':'||b||chr(10)||'Otvorené pozície spolu: '||case when s>=0 then '+' else '' end||trh_eur(s)||' €' end;
      select value into w from ai_state where key='trh_wasde' and updated_at>e.at-interval '1 hour';
      if e.kod='wasde' then b:=b||chr(10)||coalesce(w->>'txt','Zhrnutie WASDE príde po stiahnutí CSV (workflow trh o 18:05).'); end if;
      b:=b||chr(10)||'Burza z bota sa obnovuje priebežne – plná reakcia trhu sa môže ukázať neskôr.'||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → Trh a predpoveď';
      perform push_send('trh','udalost_post',e.id::text,'📊 '||e.nazov||' zverejnené – dopad na naše pozície',b,4,'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['bar_chart'],interval '6 hours');
      update trh_udalosti set post_at=now() where id=e.id; res:=res||'post '||e.kod||' ';
    end if;
  end loop;
  return coalesce(nullif(res,''),'nič');
exception when others then
  begin insert into check_err(fn,msg,at) values('trh_udalost_tick',left(SQLERRM,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(); exception when others then null; end;
  return 'chyba: '||SQLERRM;
end $$;
revoke all on function public.trh_udalost_tick() from public, anon, authenticated;

-- AI poradca: kľúč „trh“ s predpoveďou a úspešnosťou modelu
create or replace function public.trh_ai() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  return jsonb_build_object(
    'posledne_hodnoty',trh_posledne(array['matif','cbot','ecb','gasoil','brent','cot','wasde','fas_es','ec_agri']),
    'pocasie_regiony',trh_posledne(array['meteo']),
    'krivka_kontraktov',(select coalesce(jsonb_object_agg(zdroj||' '||komodita,k),'{}') from (select zdroj,komodita,jsonb_object_agg(substr(indikator,10),hodnota order by indikator) k
        from (select distinct on (zdroj,komodita,indikator) * from trh_data where indikator like 'kontrakt %' and platne>=current_date-10 order by zdroj,komodita,indikator,platne desc) q group by 1,2) c),
    'kalendar_14_dni',trh_kalendar(14),
    'wasde_posledny',(select value from ai_state where key='trh_wasde'),
    'predpoved',(select coalesce(jsonb_agg(jsonb_build_object('komodita',komodita,'horizont',horizont,'k_dnu',k_dnu,'cena',cena0,'p10',p10,'p50',p50,'p90',p90,'p_hore',p_hore,'smer',smer) order by komodita,dni),'[]')
        from (select distinct on (komodita,horizont) * from trh_predpovede order by komodita,horizont,k_dnu desc) p),
    'uspesnost_modelu_6m',trh_pred_skore(null),
    'odporucanie',(select jsonb_object_agg(k,trh_odporucanie(k)) from unnest(array['repka','psenica','kukurica','soja']) k),
    'otvorene_pozicie',trh_otvorene(),
    'zdroje',(select coalesce(jsonb_agg(jsonb_build_object('kod',kod,'stav',stav,'posledne',to_char(posledne at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),'vypadok',vypadok_od is not null) order by kod),'[]') from trh_zdroje),
    'poznamka','Burza nie je naša výkupná cena. Odporúčanie platí iba ak model za 6 mesiacov porazil naivnú predpoveď (≥ 30 vyhodnotení); inak len informácia.');
end $$;
revoke all on function public.trh_ai() from public, anon, authenticated;

-- 📈 Cenník → Trh a predpoveď (iba Martin)
create or replace function public.trh_view() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba majiteľ.'; end if;
  return jsonb_build_object(
    'rady',(select coalesce(jsonb_object_agg(k,r),'{}') from (select k,(select coalesce(jsonb_agg(jsonb_build_array(platne,hodnota) order by platne),'[]') from
        (select platne,hodnota from trh_data where zdroj=(trh_zk(k))[1] and komodita=(trh_zk(k))[2] and indikator='close' order by platne desc limit 180) q) r
        from unnest(array['repka','psenica','kukurica','soja']) k) s),
    'pred',(select coalesce(jsonb_agg(to_jsonb(p)-'signaly'||jsonb_build_object('signaly',p.signaly) order by komodita,dni),'[]') from (select distinct on (komodita,horizont) * from trh_predpovede order by komodita,horizont,k_dnu desc) p),
    'skore',trh_pred_skore(null),
    'odpor',(select jsonb_object_agg(k,trh_odporucanie(k)) from unnest(array['repka','psenica','kukurica','soja']) k),
    'kal',trh_kalendar(14),
    'wasde',(select value from ai_state where key='trh_wasde'),
    'zdroje',(select coalesce(jsonb_agg(jsonb_build_object('kod',kod,'nazov',nazov,'url',url,'frek',frekvencia,'lic',licencia,'stav',stav,'posledne',posledne,'data',posl_data,'msg',sprava,'vypadok',vypadok_od) order by perioda is null, kod),'[]') from trh_zdroje),
    'posledne',trh_posledne(array['ecb','brent','gasoil','cot','wasde','fas_es','ec_agri']),
    'pocasie',trh_posledne(array['meteo']),
    'backtest',(select value from ai_state where key='trh_backtest'),
    'backtest_req',(select value from ai_state where key='trh_backtest_req'),
    'otvorene',trh_otvorene(),
    'rano',(select value from ai_state where key='trh_rano'),
    'cennik',(select coalesce(jsonb_object_agg(com,price),'{}') from prices where com in ('repka','psenica_p','kukurica','soja')));
end $$;
revoke all on function public.trh_view() from public, anon;
grant execute on function public.trh_view() to authenticated;

create or replace function public.trh_backtest_run() returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba majiteľ.'; end if;
  -- výpočet môže trvať dlhšie ako limit požiadavky z aplikácie → spustí ho úloha trh-udalosti do 5 min
  insert into ai_state(key,value) values('trh_backtest_req',jsonb_build_object('at',now())) on conflict(key) do update set value=excluded.value, updated_at=now();
  return jsonb_build_object('ok',true,'msg','Spätný test sa spustí do 5 minút.');
end $$;
revoke all on function public.trh_backtest_run() from public, anon;
grant execute on function public.trh_backtest_run() to authenticated;

-- termín správy (napr. JRC MARS, ďalší WASDE) – iba Martin
create or replace function public.trh_udalost_set(p_kod text, p_nazov text, p_at timestamptz) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint;
begin
  if not price_main() then raise exception 'Iba majiteľ.'; end if;
  if p_kod not in ('wasde','mars','amis','igc','ine') or p_at is null then raise exception 'Neplatná udalosť.'; end if;
  insert into trh_udalosti(kod,nazov,at,zdroj) values(p_kod,left(coalesce(nullif(p_nazov,''),upper(p_kod)),80),p_at,p_kod)
    on conflict on constraint trh_udalosti_uq do update set nazov=excluded.nazov returning id into i;
  return i;
end $$;
revoke all on function public.trh_udalost_set(text,text,timestamptz) from public, anon;
grant execute on function public.trh_udalost_set(text,text,timestamptz) to authenticated;

do $$ begin
  begin perform cron.unschedule('trh-rano'); exception when others then null; end;
  perform cron.schedule('trh-rano','0 3,4 * * *','select public.trh_rano_tick()');
  begin perform cron.unschedule('trh-predpoved'); exception when others then null; end;
  perform cron.schedule('trh-predpoved','50 21 * * 1-5','select public.trh_pred_run()');
  begin perform cron.unschedule('trh-udalosti'); exception when others then null; end;
  perform cron.schedule('trh-udalosti','*/5 * * * *','select public.trh_udalost_tick()');
end $$;
select public.trh_pred_run();

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-02','📈 Trh a predpoveď','Cenník → Trh a predpoveď · ranný push 5:00','majiteľ',array['owner'],
 'Každý deň predpoveď smeru a pásma (10 / 50 / 90 %) pre repku, pšenicu, kukuricu a sóju na týždeň, mesiac a 3 mesiace – z histórie burzy, krivky kontraktov, pozícií fondov (COT), sezónnosti a počasia. Každá predpoveď sa po čase vyhodnotí voči „cena ostane rovnaká“ (zásah smeru, Brierovo skóre, chyba v €/t). Odporúčanie držať / predať / zaistiť sa ukáže, iba keď model za posledných 6 mesiacov preukázateľne porazil trh; inak „model neporáža trh – len informácia“. O 5:00 príde ranný súhrn (burza, dnešné správy, náš cenník oproti burze), 30 min pred WASDE a 15 min po ňom dopad na otvorené pozície.'
where not exists(select 1 from app_novinky where titul like '📈 Trh a predpoveď%');
