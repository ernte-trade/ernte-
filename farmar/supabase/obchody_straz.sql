-- 🛡️ STRÁŽ OBCHODOV (pg_cron obchody-straz, každých 15 min) + archív obchodov + testovací farmári mimo súčtov
-- Pravidlá: obchod nad cenníkom (navrh/podpisany, priorita 5; návrh sa nedá podpísať bez schválenia majiteľa),
-- nadodávka > 10 % (4), obchod s vlastnou firmou ERNTE/VALKO (4), farmár obchádza zmluvu (podpísaná 0 t + nový drahší návrh, 5).
-- Testovací farmári (názov obsahuje slovo TEST alebo 🧪) a archivované obchody sa nerátajú do súčtov ani upozornení.

alter table public.deals add column if not exists archived boolean not null default false;
alter table public.deals add column if not exists archived_at timestamptz;
alter table public.deals add column if not exists price_ok_by text;
alter table public.deals add column if not exists price_ok_at timestamptz;
alter table public.deals add column if not exists price_ok_price numeric;

-- testovací farmár: slovo „test“ (bez ohľadu na veľkosť písmen) alebo 🧪 v názve
create or replace function public.is_test_name(p text) returns boolean language sql immutable as $$
  select coalesce(p,'') ~* '(^|[^[:alpha:]])test([^[:alpha:]]|$)' or position('🧪' in coalesce(p,''))>0 $$;
create or replace function public.deal_live(d public.deals) returns boolean language sql stable security definer set search_path=public as $$
  select not coalesce(d.archived,false) and not exists(select 1 from farmers f where f.id=d.farmer_id and is_test_name(f.name)) $$;
revoke all on function public.deal_live(public.deals) from public, anon;
grant execute on function public.is_test_name(text) to authenticated;

-- cena v cenníku v čase vytvorenia obchodu (z histórie cenníka), inak aktuálna
create or replace function public.cennik_at(p_com text, p_at timestamptz) returns numeric language sql stable security definer set search_path=public as $$
  select coalesce((select new_price from cennik_historia where com=p_com and at<=p_at and new_price is not null and coalesce(kind,'cena')='cena' order by at desc limit 1),
                  (select price from prices where com=p_com)) $$;
revoke all on function public.cennik_at(text,timestamptz) from public, anon, authenticated;

-- 🔒 podpis obchodu nad cenníkom iba po schválení majiteľom
create or replace function public.deal_price_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare c numeric; ok boolean;
begin
  -- schválenie môže zapísať iba majiteľ (cez deal_price_approve)
  if TG_OP='UPDATE' and (NEW.price_ok_at is distinct from OLD.price_ok_at or NEW.price_ok_price is distinct from OLD.price_ok_price or NEW.price_ok_by is distinct from OLD.price_ok_by)
     and coalesce(current_setting('ernte.deal_ok',true),'')<>'1' then
    NEW.price_ok_at:=OLD.price_ok_at; NEW.price_ok_price:=OLD.price_ok_price; NEW.price_ok_by:=OLD.price_ok_by;
  elsif TG_OP='INSERT' and coalesce(current_setting('ernte.deal_ok',true),'')<>'1' then
    NEW.price_ok_at:=null; NEW.price_ok_price:=null; NEW.price_ok_by:=null;
  end if;
  if NEW.status<>'podpisany' or coalesce(NEW.archived,false) then return NEW; end if;
  if TG_OP='UPDATE' and OLD.status<>'navrh' and NEW.price=OLD.price then return NEW; end if;
  if auth.uid() is null or is_owner() or not deal_live(NEW) then return NEW; end if;  -- databáza / majiteľ / test
  select price into c from prices where com=NEW.com;
  ok:= c is null or NEW.price<=c+0.004 or (NEW.price_ok_at is not null and coalesce(NEW.price_ok_price,0)>=NEW.price);
  if ok then return NEW; end if;
  if TG_OP='INSERT' then NEW.status:='navrh'; NEW.signed_at:=null; return NEW; end if;  -- nový obchod nad cenníkom ostane návrhom
  if is_staff() then
    raise exception 'Cena % €/t je nad cenníkom (% €/t). Pred podpisom ju musí schváliť majiteľ (Obchody → „Schváliť cenu nad cenníkom“).', NEW.price, c using errcode='P0001';
  end if;
  raise exception 'Zmluvu zatiaľ nie je možné podpísať – cenu musí najprv potvrdiť ERNTE. Ozveme sa vám.' using errcode='P0001';
end $$;
drop trigger if exists deal_price_guard on public.deals;
create trigger deal_price_guard before insert or update on public.deals for each row execute function public.deal_price_guard();

create or replace function public.deal_price_approve(p_deal uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare d deals;
begin
  if not is_owner() then raise exception 'Cenu nad cenníkom schvaľuje iba majiteľ.'; end if;
  perform set_config('ernte.deal_ok','1',true);
  update deals set price_ok_at=now(), price_ok_price=price, price_ok_by=coalesce(auth.jwt()->>'email','majiteľ') where id=p_deal returning * into d;
  if d.id is null then raise exception 'Obchod neexistuje.'; end if;
  update deal_alerts set acked_at=now() where deal_id=p_deal and kind='nad_cennikom';
  return jsonb_build_object('ok',true,'no',d.no,'price',d.price);
end $$;
revoke all on function public.deal_price_approve(uuid) from public, anon; grant execute on function public.deal_price_approve(uuid) to authenticated;

-- 🗄️ archív obchodu (nemaže sa) – iba majiteľ
create or replace function public.deal_archive(p_deal uuid, p_on boolean default true) returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Archivovať obchod môže iba majiteľ.'; end if;
  update deals set archived=coalesce(p_on,true), archived_at=case when coalesce(p_on,true) then now() end where id=p_deal;
  if coalesce(p_on,true) then update deal_watch set closed_at=now(), state='uzavrete' where deal_id=p_deal and closed_at is null; end if;
  return found;
end $$;
revoke all on function public.deal_archive(uuid,boolean) from public, anon; grant execute on function public.deal_archive(uuid,boolean) to authenticated;

create table if not exists public.deal_alerts(
  deal_id uuid not null references public.deals(id) on delete cascade, kind text not null, sig text, info jsonb,
  at timestamptz not null default now(), acked_at timestamptz, primary key(deal_id,kind));
alter table public.deal_alerts enable row level security;
revoke all on public.deal_alerts from anon;
drop policy if exists deal_alerts_own on public.deal_alerts;
create policy deal_alerts_own on public.deal_alerts for select using ((select is_owner()));

create or replace function public.deal_guard_tick() returns int language plpgsql security definer set search_path=public as $$
declare r record; c numeric; c0 numeric; thr numeric; cnt int:=0; L jsonb:='{}'::jsonb; k text; ln text; ttl text; pr int; arr jsonb; i int;
begin
  for r in select d.*, f.name fname from deals d join farmers f on f.id=d.farmer_id where d.status<>'zruseny' and deal_live(d) loop
    -- 1) nad cenníkom (návrh: aktuálny cenník; podpísaný: vyšší z aktuálneho a cenníka pri uzavretí)
    if r.status in ('navrh','podpisany') then
      select price into c from prices where com=r.com;
      c0:=case when r.status='podpisany' then greatest(coalesce(c,0),coalesce(cennik_at(r.com,coalesce(r.signed_at,r.created_at)),0)) else c end;
      if c is not null and c0>0 and r.price>c0+0.004 and not (r.price_ok_at is not null and coalesce(r.price_ok_price,0)>=r.price) then
        thr:=r.price-c0;
        if not exists(select 1 from deal_alerts a where a.deal_id=r.id and a.kind='nad_cennikom' and a.sig=r.price::text) then
          ln:=coalesce(r.no,'')||' · '||coalesce(r.fname,'?')||' · '||cennik_nm(r.com)||': zmluva '||cennik_num(r.price)||' €/t vs. cenník '||cennik_num(c0)||' €/t → +'||cennik_num(round(thr,2))||' €/t × '||cennik_num(r.tons)||' t = +'||cennik_num(round(thr*r.tons))||' €'||case when r.status='navrh' then ' (návrh – pred podpisom schváľ cenu)' else '' end;
          L:=jsonb_set(L,'{nad_cennikom}',coalesce(L->'nad_cennikom','[]')||to_jsonb(ln));
          insert into deal_alerts(deal_id,kind,sig,info,at,acked_at) values(r.id,'nad_cennikom',r.price::text,jsonb_build_object('cennik',c0,'rozdiel',thr,'spolu',round(thr*r.tons)),now(),null)
            on conflict(deal_id,kind) do update set sig=excluded.sig, info=excluded.info, at=now(), acked_at=null;
        end if;
      end if;
    end if;
    -- 2) nadodávka > 10 %
    if r.tons>0 and coalesce(r.delivered_t,0)>r.tons*1.1 and not exists(select 1 from deal_alerts a where a.deal_id=r.id and a.kind='nadodavka') then
      ln:=coalesce(r.no,'')||' · '||coalesce(r.fname,'?')||' · '||cennik_nm(r.com)||': dodané '||cennik_num(r.delivered_t)||' t / zmluva '||cennik_num(r.tons)||' t (+'||cennik_num(round(100*(r.delivered_t-r.tons)/r.tons))||' %)';
      L:=jsonb_set(L,'{nadodavka}',coalesce(L->'nadodavka','[]')||to_jsonb(ln));
      insert into deal_alerts(deal_id,kind,sig,info) values(r.id,'nadodavka',r.delivered_t::text,jsonb_build_object('dodane',r.delivered_t,'zmluva',r.tons)) on conflict do nothing;
    end if;
    -- 3) obchod s vlastnou firmou
    if r.fname ~* '(^|[^[:alpha:]])(ernte|valko)([^[:alpha:]]|$)' and not exists(select 1 from deal_alerts a where a.deal_id=r.id and a.kind='vlastna_firma') then
      ln:=coalesce(r.no,'')||' · farmár „'||r.fname||'“ · '||cennik_nm(r.com)||' · '||cennik_num(r.tons)||' t za '||cennik_num(r.price)||' €/t';
      L:=jsonb_set(L,'{vlastna_firma}',coalesce(L->'vlastna_firma','[]')||to_jsonb(ln));
      insert into deal_alerts(deal_id,kind,sig) values(r.id,'vlastna_firma',r.fname) on conflict do nothing;
    end if;
  end loop;
  -- 4) farmár obchádza zmluvu: podpísaná zmluva s 0 t a nový drahší návrh s tým istým farmárom a komoditou
  for r in select n.id, n.no nno, n.price np, n.tons nt, s.no sno, s.price sp, s.tons st, f.name fname, n.com
      from deals n join deals s on s.farmer_id=n.farmer_id and s.com=n.com and s.id<>n.id and s.status='podpisany' and coalesce(s.delivered_t,0)=0 and n.price>s.price
      join farmers f on f.id=n.farmer_id
      where n.status='navrh' and deal_live(n) and deal_live(s) loop
    if not exists(select 1 from deal_alerts a where a.deal_id=r.id and a.kind='obchadza') then
      ln:=r.nno||' (návrh '||cennik_num(r.np)||' €/t, '||cennik_num(r.nt)||' t) vs. podpísaná '||r.sno||' ('||cennik_num(r.sp)||' €/t, '||cennik_num(r.st)||' t, dodané 0 t) · '||coalesce(r.fname,'?')||' · '||cennik_nm(r.com)||' · +'||cennik_num(r.np-r.sp)||' €/t';
      L:=jsonb_set(L,'{obchadza}',coalesce(L->'obchadza','[]')||to_jsonb(ln));
      insert into deal_alerts(deal_id,kind,sig,info) values(r.id,'obchadza',r.sno,jsonb_build_object('zmluva',r.sno)) on conflict do nothing;
    end if;
  end loop;
  for k in select jsonb_object_keys(L) loop
    arr:=L->k; i:=jsonb_array_length(arr); cnt:=cnt+i;
    ttl:=case k when 'nad_cennikom' then '⚠️ Obchod nad cenníkom' when 'nadodavka' then '📦 Nadodávka' when 'vlastna_firma' then '🏢 Overiť obchod s vlastnou firmou' else '🚩 Farmár obchádza zmluvu' end||case when i>1 then ' ('||i||')' else '' end;
    pr:=case when k in ('nad_cennikom','obchadza') then 5 else 4 end;
    ln:=(select string_agg(x,chr(10)) from (select jsonb_array_elements_text(arr) x limit 12) z)||case when i>12 then chr(10)||'… a ďalšie '||(i-12) else '' end||chr(10)||'Obchody v aplikácii.';
    begin perform owner_push(ttl,ln,pr,case when pr=5 then 'rotating_light' else 'warning' end); exception when others then null; end;
  end loop;
  return cnt;
end $$;
revoke all on function public.deal_guard_tick() from public, anon, authenticated;

-- stav pre aplikáciu majiteľa (karty pri obchodoch)
create or replace function public.deal_alerts_list() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin if not is_owner() then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('deal_id',a.deal_id,'kind',a.kind,'info',a.info,'at',a.at,'acked',a.acked_at is not null)),'[]'::jsonb) from deal_alerts a join deals d on d.id=a.deal_id where d.status<>'zruseny' and deal_live(d));
end $$;
revoke all on function public.deal_alerts_list() from public, anon; grant execute on function public.deal_alerts_list() to authenticated;

create or replace function public.obchody_straz_tick() returns int language plpgsql security definer set search_path=public as $$
declare n int:=0;
begin
  begin n:=n+coalesce(deal_watch_tick(),0); exception when others then null; end;
  begin n:=n+coalesce(deal_guard_tick(),0); exception when others then null; end;
  return n;
end $$;
revoke all on function public.obchody_straz_tick() from public, anon, authenticated;

-- stráženie nákupov: bez testovacích farmárov a archívu
create or replace function public.deal_watch_add() returns trigger language plpgsql security definer set search_path=public as $$
declare cfg jsonb; r record;
begin
  begin
    select value into cfg from ai_state where key='deal_watch_cfg';
    if NEW.created_at < coalesce((cfg->>'from')::timestamptz,now()) or NEW.status='zruseny' or not deal_live(NEW) then return NEW; end if;
    select * into r from ref_px(NEW.com);
    insert into deal_watch(deal_id,com,tons,buy,ref0,ref_src,at0,hold_until,peak,last_ref,last_at)
      values(NEW.id,NEW.com,NEW.tons,NEW.price,r.v,r.src,now(),hold_date(now(),r.contract,coalesce((cfg->>'hold_days')::int,60)),r.v,r.v,now())
      on conflict(deal_id) do update set tons=excluded.tons, buy=excluded.buy;
  exception when others then null; end;
  return NEW;
end $$;
drop trigger if exists deal_watch_add on public.deals;
create trigger deal_watch_add after insert or update of tons, price on public.deals for each row execute function public.deal_watch_add();

create or replace function public.deal_watch_tick() returns int language plpgsql security definer set search_path=public as $$
declare cfg jsonb; w record; r record; thr numeric; diff numeric; ns text; fname text; dno text; msg text; ttl text; rep int; cnt int:=0; gain numeric; due boolean;
begin
  select value into cfg from ai_state where key='deal_watch_cfg'; rep:=coalesce((cfg->>'repeat_min')::int,30);
  for w in select dw.*, d.status, d.no, d.farmer_id, d.price dprice, d.tons dtons, f.sell_price from deal_watch dw join deals d on d.id=dw.deal_id left join deal_fin f on f.deal_id=dw.deal_id where dw.closed_at is null loop
    if not deal_live((select x from deals x where x.id=w.deal_id)) then update deal_watch set closed_at=now(), state='test_archiv' where deal_id=w.deal_id; continue; end if;
    if w.status='zruseny' or w.sell_price is not null then update deal_watch set closed_at=now(), state='uzavrete' where deal_id=w.deal_id; continue; end if;
    select * into r from ref_px(w.com); if r.v is null or w.ref0 is null then continue; end if;
    thr:=greatest(coalesce((cfg->>'eur')::numeric,5), w.ref0*coalesce((cfg->>'pct')::numeric,1.5)/100);
    diff:=r.v-w.ref0; gain:=coalesce(w.peak,w.ref0)-w.ref0;
    ns:=case
      when (now() at time zone 'Europe/Bratislava')::date>=w.hold_until and diff>=0 then 'termin'
      when w.state in ('rise','sell') and gain>=thr and r.v < w.peak-gain*0.5 then 'sell'
      when diff<=-thr then 'fall'
      when diff>=thr then 'rise' else 'ok' end;
    update deal_watch set last_ref=r.v, last_at=now(), peak=greatest(coalesce(peak,ref0),r.v) where deal_id=w.deal_id;
    select name into fname from farmers where id=w.farmer_id; dno:=coalesce(w.no,'');
    due:=false;
    if ns in ('fall','sell','termin') then
      -- nový stav → hneď; ten istý stav → opakovať každých 30 min, kým majiteľ nepotvrdí (acked_at po poslednom upozornení)
      if ns<>w.state or w.notified_at is null then due:=true;
      elsif not (w.acked_at is not null and w.acked_at>=w.notified_at) and w.notified_at<now()-make_interval(mins=>rep) then due:=true; end if;
    elsif ns='rise' then
      if w.state<>'rise' or floor(diff/thr)>w.step then due:=true; end if;
    end if;
    if ns<>w.state then update deal_watch set state=ns, n=0, step=case when ns='rise' then floor(diff/thr)::int else 0 end where deal_id=w.deal_id;
    elsif ns='rise' and floor(diff/thr)>w.step then update deal_watch set step=floor(diff/thr)::int where deal_id=w.deal_id; end if;
    if due then
      ttl:=case ns
        when 'fall' then '📉 KLESÁ · '||cennik_nm(w.com)||' – nakúpené drahšie'
        when 'rise' then '📈 DRŽ, NEPREDÁVAJ · '||cennik_nm(w.com)
        when 'sell' then '⚠️ PREDAJ · '||cennik_nm(w.com)||' – rast sa obracia'
        else '⏰ PREDAJ · '||cennik_nm(w.com)||' – termín držania uplynul' end;
      msg:=coalesce(fname,'farmár')||' · '||dno||' · '||cennik_num(w.dtons)||' t za '||cennik_num(w.dprice)||' €/t'||chr(10)||
        'Trh ('||coalesce(r.src,w.ref_src,'')||'): pri nákupe '||cennik_num(w.ref0)||' → teraz '||cennik_num(r.v)||' €/t ('||case when diff>=0 then '+' else '−' end||cennik_num(abs(round(diff,1)))||' €/t, spolu '||case when diff>=0 then '+' else '−' end||cennik_num(abs(round(diff*w.dtons)))||' €)'||chr(10)||
        case ns when 'fall' then 'Zváž predaj / zaistenie hneď. Upozornenie sa opakuje, kým v aplikácii nepotvrdíš „Prečítal som“.'
          when 'rise' then 'Máme lacnejšie nakúpené – DRŽ. Najneskôr predaj do '||to_char(w.hold_until,'DD. MM. YYYY')||' alebo keď trh klesne pod '||cennik_num(round(greatest(r.v,coalesce(w.peak,r.v))-(greatest(r.v,coalesce(w.peak,r.v))-w.ref0)*0.5))||' €/t.'
          when 'sell' then 'Trh spadol z vrcholu '||cennik_num(w.peak)||' o viac ako polovicu zisku – predaj teraz. Opakuje sa do potvrdenia.'
          else 'Termín držania ('||to_char(w.hold_until,'DD. MM.')||') uplynul – predaj. Opakuje sa do potvrdenia.' end;
      if ns=w.state and w.n>0 and ns<>'rise' then ttl:=ttl||' (pripomienka '||(w.n+1)||')'; end if;
      begin perform owner_push(ttl,msg,5,case when ns='rise' then 'chart_with_upwards_trend' else 'rotating_light' end); exception when others then null; end;
      update deal_watch set notified_at=now(), n=case when ns=w.state then w.n+1 else 1 end where deal_id=w.deal_id; cnt:=cnt+1;
    end if;
  end loop;
  return cnt;
end $$;
revoke all on function public.deal_watch_tick() from public, anon, authenticated;


-- prehľad pre AI: bez archívu a testovacích farmárov
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
   'posledne_upravy_ai', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x$q$));
exception when others then return jsonb_build_object('chyba_prehladu',SQLERRM);
end $function$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;

-- P2026/118 (🧪 TEST Farmár) → archív (nemaže sa)
update public.deals set archived=true, archived_at=coalesce(archived_at,now()) where no='P2026/118' and not archived;
update public.deal_watch w set closed_at=now(), state='test_archiv' from public.deals d where d.id=w.deal_id and w.closed_at is null and not public.deal_live(d);

do $$ begin
  begin perform cron.unschedule('obchody-straz'); exception when others then null; end;
  perform cron.schedule('obchody-straz','*/15 * * * *','select public.obchody_straz_tick()');
end $$;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-10-30','🛡️ Stráž obchodov: nad cenníkom, nadodávka, vlastná firma, obchádzanie zmluvy','Obchody (karty pri obchode) + upozornenia do mobilu','iba majiteľ',array['owner'],
 'Každých 15 min sa kontrolujú obchody: cena zmluvy nad cenníkom (priorita 5; návrh sa nedá podpísať, kým ho neschváliš tlačidlom „Schváliť cenu nad cenníkom“), nadodávka o viac ako 10 % (4), obchod s vlastnou firmou ERNTE/VALKO (4), podpísaná zmluva s 0 t a nový drahší návrh toho istého farmára (5).'
where not exists(select 1 from app_novinky where titul like '🛡️ Stráž obchodov%');
insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-10-30','🗄️ Archív obchodov a testovací farmári mimo súčtov','Obchody → 🗄️ Archív / 🧪 Testovacie obchody (dole)','majiteľ',array['owner'],
 'Obchod P2026/118 (🧪 TEST Farmár) je archivovaný – nezmazaný. Obchody farmárov s „TEST“ alebo 🧪 v názve sa nerátajú do súčtov, štatistík ani upozornení.'
where not exists(select 1 from app_novinky where titul like '🗄️ Archív obchodov%');

-- hneď na existujúce obchody
select public.deal_guard_tick();
select 'obchody straz ok';
