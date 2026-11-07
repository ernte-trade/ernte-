-- 🌱 NOVÁ ÚRODA – nákupné ceny (5. 11. 2026 PRÍKAZ MAJITEĽA „v cenníku aj pre obchodníkov nákupné ceny na novú úrodu – odberatelia podľa ich
-- burzového modelu ako pri mojich odberateľoch, aby som neprerobil“)
-- Burza novej úrody: krivka kontraktov z vetvy burza-hist (hist.json → krivka, AHDB, € / t) – rozdiel kontraktu novej úrody voči dnešnému kontraktu
-- bota (market_px) v ten istý deň + dnešná cena bota = živá cena novej úrody (repka aug, slnečnica = MATIF repka nov, pšenica a jačmeň = MATIF pšenica sep,
-- kukurica nov, sója CBOT nov). Odberatelia: báza z ich posledných ponúk (odb_models, ≤ 30 dní, bez západu) → ich cena = burza novej úrody + báza;
-- − naša doprava (sell_dop, FCA = 0) → najlepší čistý predaj − marža (sellcap.m, 10) − poistka (5) = naša nákupná cena (celé €/t nadol).
-- Zverejnenie: pokles a zvýšenie ≤ price_auto_raise.max (5 €/t) hneď, väčšie zvýšenie čaká na Martina (nu_ok) + push. Bez prepočtu 3 dni sa cena tímu neukáže.
create or replace function public.nu_y(p_com text, p_d date default current_date) returns int language sql immutable as $$
  select extract(year from p_d)::int + case when extract(month from p_d)::int >= case when p_com in ('kukurica','cirok') then 10 when p_com in ('lo','ho','soja') then 9 else 7 end then 1 else 0 end $$;

create or replace function public.nu_kon(p_com text, p_y int) returns jsonb language sql immutable as $$
  select case
    when p_com='repka' then jsonb_build_object('k','matif_repka','sym','repka','ym',p_y||'-08','n','MATIF repka aug '||p_y,'dod','júl–aug '||p_y)
    when p_com in ('lo','ho') then jsonb_build_object('k','matif_repka','sym','repka','ym',p_y||'-11','n','MATIF repka nov '||p_y,'dod','sep–okt '||p_y)
    when p_com in ('psenica_p','psenica_k') then jsonb_build_object('k','matif_psenica','sym','psenica','ym',p_y||'-09','n','MATIF pšenica sep '||p_y,'dod','júl–aug '||p_y)
    when p_com='jacmen_k' then jsonb_build_object('k','matif_psenica','sym','psenica','ym',p_y||'-09','n','MATIF pšenica sep '||p_y,'dod','jún–júl '||p_y)
    when p_com='kukurica' then jsonb_build_object('k','matif_kukurica','sym','kukurica','ym',p_y||'-11','n','MATIF kukurica nov '||p_y,'dod','okt–nov '||p_y)
    when p_com='soja' then jsonb_build_object('k','cbot_soja','sym','soja_usc_bu','ym',p_y||'-11','n','CBOT sója nov '||p_y,'dod','sep–okt '||p_y)
  end $$;

create or replace function public.nu_tick(p_force boolean default false, p_ok boolean default false) returns text language plpgsql security definer set search_path=public, net as $$
declare st jsonb; kr jsonb; r record; j jsonb; cfg jsonb; m numeric; buf numeric; rmax numeric; mods jsonb; items jsonb:='{}'::jsonb; old jsonb;
  c text; k jsonb; y int; v_px numeric; v_kon text; v_qd date; pok boolean; ref text; e jsonb; spr numeric; ncv numeric; ncd text; best jsonb; opts jsonb; calc numeric; it jsonb; pub numeric; pend jsonb; msg text:='';
begin
  -- 1) krivka kontraktov z vetvy burza-hist (pg_net: požiadavka → odpoveď v ďalšom behu)
  select value into st from ai_state where key='nu_req';
  if st is not null and not (st ? 'done') then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is not null then
      update ai_state set value=value||jsonb_build_object('done',now(),'code',r.status_code), updated_at=now() where key='nu_req';
      if r.status_code=200 then
        begin j:=r.content::jsonb; exception when others then j:=null; end;
        if j is not null and jsonb_typeof(j->'krivka')='object' and j->'krivka'<>'{}'::jsonb then
          insert into ai_state(key,value) values('nu_krivka',jsonb_build_object('at',now(),'src_at',j->>'at','k',j->'krivka'))
          on conflict(key) do update set value=excluded.value, updated_at=now();
        end if;
      end if;
    elsif (st->>'at')::timestamptz<now()-interval '10 minutes' then
      update ai_state set value=value||jsonb_build_object('done',now(),'err','bez odpovede'), updated_at=now() where key='nu_req';
    end if;
  end if;
  select value into st from ai_state where key='nu_req';
  if p_force or st is null or (st ? 'done' and (st->>'at')::timestamptz<now()-interval '55 minutes') then
    begin
      insert into ai_state(key,value) values('nu_req',jsonb_build_object('req',net.http_get(url:='https://raw.githubusercontent.com/ernte-trade/ernte-/burza-hist/hist.json?t='||extract(epoch from now())::bigint,timeout_milliseconds:=30000),'at',now()))
      on conflict(key) do update set value=excluded.value, updated_at=now();
    exception when others then null; end;
  end if;

  -- 2) výpočet
  select value into kr from ai_state where key='nu_krivka';
  cfg:=coalesce((select value from ai_state where key='nu_cfg'),'{}'::jsonb);
  m:=coalesce((cfg->>'m')::numeric,(select (data->>'m')::numeric from kalk_store where path='pricelist' and id='sellcap'),10);
  buf:=coalesce((cfg->>'buf')::numeric,5);
  rmax:=coalesce((select (value->>'max')::numeric from ai_state where key='price_auto_raise'),5);
  begin mods:=coalesce(odb_models(),'[]'::jsonb); exception when others then mods:='[]'::jsonb; end;
  select value into old from ai_state where key='nu_ceny';
  foreach c in array array['repka','lo','ho','psenica_p','psenica_k','jacmen_k','kukurica','soja'] loop
    y:=nu_y(c); k:=nu_kon(c,y); ncv:=null; ncd:=null; spr:=null; ref:=null; e:=null; opts:='[]'::jsonb; best:=null; calc:=null;
    v_px:=null; v_kon:=null; v_qd:=null;
    select eur_t, contract, quote_date into v_px, v_kon, v_qd from market_px where sym=k->>'sym' and eur_t>0 limit 1;
    pok:=v_px is not null and v_qd>=current_date-4;
    if pok then
      begin ref:=to_char(mk_term(v_kon),'YYYY-MM'); exception when others then ref:=null; end;
      if ref is not null then
        select x into e from jsonb_array_elements(coalesce(kr->'k'->(k->>'k'),'[]'::jsonb)) x
          where (x->>'d')::date>=current_date-7 and (x->'c'->>(k->>'ym')) is not null and (x->'c'->>ref) is not null order by x->>'d' desc limit 1;
      end if;
      if e is not null then
        spr:=round((e->'c'->>(k->>'ym'))::numeric-(e->'c'->>ref)::numeric,2); ncv:=round(v_px+spr,2); ncd:=e->>'d';
      else
        select x into e from jsonb_array_elements(coalesce(kr->'k'->(k->>'k'),'[]'::jsonb)) x
          where (x->>'d')::date>=current_date-3 and (x->'c'->>(k->>'ym')) is not null order by x->>'d' desc limit 1;
        if e is not null then ncv:=(e->'c'->>(k->>'ym'))::numeric; ncd:=e->>'d'; end if;
      end if;
    end if;
    if ncv is not null then
      select coalesce(jsonb_agg(z order by (z->>'net')::numeric desc),'[]'::jsonb) into opts from (
        select jsonb_build_object('b',bb->>'name','bid',bb->>'id','del',upper(g->>'del'),'site',nullif(g->>'site',''),'bas',(g->>'b')::numeric,'bas_d',g->>'b_d','age',(g->>'age')::int,
                 'price',round(ncv+(g->>'b')::numeric,2),'dop',dd.dop,'net',round(ncv+(g->>'b')::numeric-dd.dop,2)) z
        from jsonb_array_elements(mods) bb
        cross join lateral jsonb_array_elements(coalesce(bb->'g','[]'::jsonb)) g
        cross join lateral (select case when upper(coalesce(g->>'del','')) in ('FCA','EXW') then 0::numeric
                              else sell_dop(odb_site((select sb.sites from sell_buyers sb where sb.id=bb->>'id'),g->>'site')) end dop) dd
        where g->>'com'=c and (g->>'b') ~ '^-?[0-9.]+$' and coalesce((g->>'age')::int,999)<=30
          and coalesce(g->>'site','') !~* 'hamburg|z[aá]pad' and dd.dop is not null) q;
      best:=opts->0;
      if best is not null then calc:=floor((best->>'net')::numeric-m-buf); end if;
    end if;
    it:=coalesce(old->'items'->c,'{}'::jsonb); pub:=(it->>'pub')::numeric; pend:=it->'pend';
    if calc is not null and calc>0 then
      if pub is null or calc<=pub+rmax or p_ok then
        if pub is distinct from calc then it:=it||jsonb_build_object('pub',calc,'pub_at',now(),'prev',pub); end if;
        it:=it-'pend';
      elsif pend is null or (pend->>'p')::numeric<>calc then
        it:=it||jsonb_build_object('pend',jsonb_build_object('p',calc,'at',now()));
        msg:=msg||chr(10)||'• '||cennik_nm(c)||': '||pub||' → '||calc||' €/t';
      end if;
      it:=it||jsonb_build_object('calc',calc,'calc_at',now());
    end if;
    it:=it||jsonb_build_object('y',y,'kon',k->>'n','ym',k->>'ym','dod',k->>'dod','nc',ncv,'nc_d',ncd,'spr',spr,'ref',ref,
      'px',case when pok then v_px end,'px_k',case when pok then v_kon end,'best',best,
      'opts',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select x from jsonb_array_elements(opts) x limit 6) q),'m',m,'buf',buf,'tick',now());
    items:=items||jsonb_build_object(c,it);
  end loop;
  insert into ai_state(key,value) values('nu_ceny',jsonb_build_object('at',now(),'items',items,'m',m,'buf',buf,'rmax',rmax,'krivka_at',kr->>'src_at'))
  on conflict(key) do update set value=excluded.value, updated_at=now();
  if msg<>'' then
    begin perform push_send('nu','zvysenie',md5(msg),'🌱 Nová úroda – zvýšenie čaká na teba',
      'Nákupné ceny na novú úrodu by stúpli o viac ako '||rmax||' €/t:'||msg||chr(10)||'Zverejníš ich v Cenníku → 🌱 Nová úroda.'||chr(10)||'👉 ERNTE Trade & Logistic: Cenník',
      4,'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['seedling'],interval '1 minute',push_main_emails());
    exception when others then null; end;
  end if;
  return 'ok';
end $$;
revoke all on function public.nu_tick(boolean,boolean) from public, anon, authenticated;

-- tím s prístupom k Cenníku + majiteľ: IBA naše nákupné ceny (bez odberateľov a výpočtu)
create or replace function public.nu_ceny() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v jsonb;
begin
  if not (is_owner() or (is_staff() and (has_perm('price_view') or has_perm('price_edit') or has_perm('market')))) then return null; end if;
  select value into v from ai_state where key='nu_ceny';
  if v is null then return jsonb_build_object('items','[]'::jsonb); end if;
  return jsonb_build_object('at',v->>'at','items',(select coalesce(jsonb_agg(jsonb_build_object('com',e.key,'price',(e.value->>'pub')::numeric,'dod',e.value->>'dod',
      'y',(e.value->>'y')::int,'kon',e.value->>'kon','pub_at',e.value->>'pub_at')
      order by array_position(array['repka','lo','ho','psenica_p','psenica_k','jacmen_k','kukurica','soja'],e.key)),'[]'::jsonb)
    from jsonb_each(coalesce(v->'items','{}'::jsonb)) e where (e.value->>'pub') is not null and coalesce((e.value->>'calc_at')::timestamptz,'-infinity')>now()-interval '3 days'));
end $$;
revoke all on function public.nu_ceny() from public, anon; grant execute on function public.nu_ceny() to authenticated;

-- Martin: celý výpočet (odberatelia, bázy, doprava, čakajúce zvýšenia)
create or replace function public.nu_get() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return coalesce((select value from ai_state where key='nu_ceny'),'{}'::jsonb)||jsonb_build_object('cfg',coalesce((select value from ai_state where key='nu_cfg'),'{}'::jsonb),
    'krivka_at',(select value->>'src_at' from ai_state where key='nu_krivka'));
end $$;
revoke all on function public.nu_get() from public, anon; grant execute on function public.nu_get() to authenticated;

create or replace function public.nu_ok(p_com text) returns jsonb language plpgsql security definer set search_path=public as $$
declare it jsonb;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select value->'items'->p_com into it from ai_state where key='nu_ceny';
  if it is null or not (it ? 'pend') then raise exception 'Nie je čo potvrdiť.'; end if;
  it:=(it-'pend')||jsonb_build_object('pub',(it->'pend'->>'p')::numeric,'pub_at',now(),'prev',it->'pub','ok_by','Martin','ok_at',now());
  update ai_state set value=jsonb_set(value,array['items',p_com],it), updated_at=now() where key='nu_ceny';
  return it;
end $$;
revoke all on function public.nu_ok(text) from public, anon; grant execute on function public.nu_ok(text) to authenticated;

create or replace function public.nu_cfg_set(p_m numeric, p_buf numeric) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  if p_m is null or p_m<0 or p_m>60 or p_buf is null or p_buf<0 or p_buf>60 then raise exception 'Marža a poistka 0–60 €/t.'; end if;
  insert into ai_state(key,value) values('nu_cfg',jsonb_build_object('m',p_m,'buf',p_buf,'at',now())) on conflict(key) do update set value=excluded.value, updated_at=now();
  perform nu_tick(false,true);  -- zmenu urobil Martin → aj zvýšenie sa zverejní hneď
  return nu_get();
end $$;
revoke all on function public.nu_cfg_set(numeric,numeric) from public, anon; grant execute on function public.nu_cfg_set(numeric,numeric) to authenticated;

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='nova-uroda';
  perform cron.schedule('nova-uroda','*/15 * * * *','select public.nu_tick()');
end $$;
