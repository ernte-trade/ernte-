-- 🌐 VLASTNÁ DOMÉNA app.ernte.sk (GitHub Pages) + DNS cez API registrátora (WebSupport / Active24)
-- Stav v ai_state 'domain_app'. Kontrola každých 15 min (pg_cron 'domena'): DNS cez DoH (dns.google), HTTPS certifikát (GET https://app.ernte.sk/farmar/manifest.webmanifest).
-- Doménu na GitHub Pages zapína workflow pages.yml (súbor CNAME, iba keď DNS ukazuje na GitHub) → GitHub sám presmeruje starú adresu 301 so zachovaním cesty a parametrov.
-- Kľúč registrátora iba vo vault ('ernte_dns_reg'), do prehliadača sa nikdy nevracia.

insert into ai_state(key,value) values('domain_app',jsonb_build_object('host','app.ernte.sk','target','ernte-trade.github.io','type','CNAME','name','app','ttl',3600))
  on conflict(key) do nothing;

create or replace function public.domain_st() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((select value from ai_state where key='domain_app'),'{}'::jsonb) $$;
revoke all on function public.domain_st() from public, anon, authenticated;
create or replace function public.domain_put(p jsonb) returns void language sql security definer set search_path=public as $$
  insert into ai_state(key,value,updated_at) values('domain_app',p,now()) on conflict(key) do update set value=ai_state.value||excluded.value, updated_at=now() $$;
revoke all on function public.domain_put(jsonb) from public, anon, authenticated;

create or replace function public.domain_reg_cfg() returns jsonb language plpgsql stable security definer set search_path=public, vault as $$
declare t text;
begin
  begin select decrypted_secret into t from vault.decrypted_secrets where name='ernte_dns_reg' limit 1; exception when others then t:=null; end;
  if t is null then select value::text into t from ai_state where key='dns_reg_cfg'; end if;
  return case when t is null then null else t::jsonb end;
end $$;
revoke all on function public.domain_reg_cfg() from public, anon, authenticated;

-- podpísaná požiadavka na REST API WebSupport / Active24 (HMAC-SHA1 „METÓDA CESTA ČAS“)
create or replace function public.domain_reg_req(p_method text, p_path text, p_body jsonb default null) returns bigint language plpgsql security definer set search_path=public, extensions as $$
declare c jsonb:=domain_reg_cfg(); base text; ts bigint:=extract(epoch from now())::bigint; sig text; h jsonb;
begin
  if c is null then return null; end if;
  base:=case c->>'prov' when 'active24' then 'https://rest.active24.cz' else 'https://rest.websupport.sk' end;
  sig:=encode(hmac(p_method||' '||p_path||' '||ts, c->>'secret', 'sha1'),'hex');
  h:=jsonb_build_object('Authorization','Basic '||replace(encode(convert_to((c->>'key')||':'||sig,'utf8'),'base64'),chr(10),''),
     'Date',to_char(to_timestamp(ts) at time zone 'UTC','YYYYMMDD"T"HH24MISS"Z"'),'Accept','application/json','Content-Type','application/json');
  if p_method='POST' then return net.http_post(url:=base||p_path, body:=coalesce(p_body,'{}'::jsonb), headers:=h, timeout_milliseconds:=15000); end if;
  return net.http_get(url:=base||p_path, headers:=h, timeout_milliseconds:=15000);
end $$;
revoke all on function public.domain_reg_req(text,text,jsonb) from public, anon, authenticated;

create or replace function public.domain_resp(p_id bigint, out code int, out body text, out err text, out ready boolean) language plpgsql stable security definer set search_path=public as $$
begin
  ready:=false; if p_id is null then return; end if;
  begin
    select r.status_code, r.content, r.error_msg into code, body, err from net._http_response r where r.id=p_id;
    ready:=found;
  exception when others then ready:=false; end;
end $$;
revoke all on function public.domain_resp(bigint) from public, anon, authenticated;

create or replace function public.domain_tick() returns jsonb language plpgsql security definer set search_path=public as $$
declare s jsonb:=domain_st(); r record; j jsonb; ok boolean; a jsonb; v text; rg jsonb; c jsonb; sid text; tk text; n int;
begin
  if coalesce(s->>'host','')='' then return s; end if;
  -- 1) DNS (DoH)
  select * into r from domain_resp((s->>'dns_req')::bigint);
  if r.ready then
    ok:=false; v:=null;
    begin
      j:=r.body::jsonb;
      for a in select * from jsonb_array_elements(coalesce(j->'Answer','[]'::jsonb)) loop
        if (a->>'type')='5' and lower(a->>'data') ~ ('^'||replace(s->>'target','.','\.')||'\.?$') then ok:=true; v:=a->>'data'; end if;
        if (a->>'type')='1' and (a->>'data') ~ '^185\.199\.(108|109|110|111)\.153$' then ok:=true; v:=coalesce(v,a->>'data'); end if;
        if v is null then v:=a->>'data'; end if;
      end loop;
    exception when others then ok:=false; end;
    s:=s||jsonb_build_object('dns_req',null,'dns_ok',ok,'dns_seen',v,'last_check',now());
    if ok and s->>'dns_at' is null then
      s:=s||jsonb_build_object('dns_at',now());
      -- zapnúť doménu na GitHub Pages hneď (workflow pages.yml zapíše CNAME)
      tk:=regexp_replace(coalesce(ai_secret('github_token'),''),'\s','','g');
      if tk<>'' then
        perform net.http_post(url:='https://api.github.com/repos/ernte-trade/ernte-/dispatches',
          headers:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28','Content-Type','application/json'),
          body:=jsonb_build_object('event_type','ernte-pages','client_payload',jsonb_build_object('why','domena')));
        s:=s||jsonb_build_object('pages_at',now());
      end if;
    end if;
  end if;
  -- CAA (ernte.sk): ak existuje a nepovoľuje Let's Encrypt, certifikát GitHub nevydá
  select * into r from domain_resp((s->>'caa_req')::bigint);
  if r.ready then
    begin j:=r.body::jsonb;
      s:=s||jsonb_build_object('caa_req',null,'caa_need',exists(select 1 from jsonb_array_elements(coalesce(j->'Answer','[]'::jsonb)) x where (x->>'type')='257')
        and not exists(select 1 from jsonb_array_elements(coalesce(j->'Answer','[]'::jsonb)) x where (x->>'type')='257' and (x->>'data') ~* 'letsencrypt'));
    exception when others then s:=s||jsonb_build_object('caa_req',null); end;
  end if;
  -- 2) HTTPS certifikát
  select * into r from domain_resp((s->>'https_req')::bigint);
  if r.ready then
    ok:=coalesce(r.code,0) between 200 and 399;
    s:=s||jsonb_build_object('https_req',null,'https_ok',ok,'https_code',r.code,'https_err',left(r.err,200));
    if ok and s->>'https_at' is null then s:=s||jsonb_build_object('https_at',now()); end if;
  end if;
  -- 3) registrátor: služba → záznamy → vytvoriť CNAME
  rg:=coalesce(s->'reg','{}'::jsonb);
  if rg->>'req' is not null then
    select * into r from domain_resp((rg->>'req')::bigint);
    if r.ready then
      rg:=rg||jsonb_build_object('req',null,'code',r.code,'resp',left(coalesce(r.body,r.err,''),500),'at',now());
      begin j:=r.body::jsonb; exception when others then j:=null; end;
      if rg->>'step'='svc' then
        sid:=null;
        if j is not null then
          select x->>'id' into sid from jsonb_array_elements(case when jsonb_typeof(j->'data')='array' then j->'data' when jsonb_typeof(j->'items')='array' then j->'items' when jsonb_typeof(j)='array' then j else '[]'::jsonb end) x
            where lower(coalesce(x->>'name',x->>'domain',x->>'serviceName','')) like '%ernte.sk%' limit 1;
        end if;
        if sid is null then rg:=rg||jsonb_build_object('step','chyba','ok',false,'msg','Doménu ernte.sk sa v účte registrátora nepodarilo nájsť (HTTP '||coalesce(r.code::text,'?')||').');
        else rg:=rg||jsonb_build_object('step','list','sid',sid); end if;
      elsif rg->>'step'='list' then
        n:=0;
        if j is not null then
          select count(*) into n from jsonb_array_elements(case when jsonb_typeof(j->'data')='array' then j->'data' when jsonb_typeof(j)='array' then j else '[]'::jsonb end) x
            where lower(coalesce(x->>'name',''))in('app','app.ernte.sk') and upper(coalesce(x->>'type',''))='CNAME';
        end if;
        if coalesce(r.code,0)>=400 then rg:=rg||jsonb_build_object('step','chyba','ok',false,'msg','Registrátor odmietol čítanie DNS (HTTP '||r.code||').');
        elsif n>0 then rg:=rg||jsonb_build_object('step','hotovo','ok',true,'msg','Záznam CNAME app už u registrátora existuje.');
        else rg:=rg||jsonb_build_object('step','add'); end if;
      elsif rg->>'step'='add_wait' then
        if coalesce(r.code,0) between 200 and 299 then rg:=rg||jsonb_build_object('step','hotovo','ok',true,'msg','Záznam CNAME app → '||(s->>'target')||' vytvorený.');
        else rg:=rg||jsonb_build_object('step','chyba','ok',false,'msg','Vytvorenie záznamu zlyhalo (HTTP '||coalesce(r.code::text,'?')||').'); end if;
      end if;
      if rg->>'step' in ('hotovo','chyba') and coalesce((rg->>'pushed')::boolean,false)=false then
        begin perform owner_push(case when rg->>'step'='hotovo' then '🌐 DNS app.ernte.sk nastavené cez API' else '🌐 DNS app.ernte.sk – chyba API registrátora' end,
          coalesce(rg->>'msg','')||chr(10)||'Diagnostika → Doména app.ernte.sk.',4,'globe_with_meridians'); exception when others then null; end;
        rg:=rg||jsonb_build_object('pushed',true);
      end if;
    elsif (rg->>'sent')::timestamptz<now()-interval '10 minutes' then
      rg:=rg||jsonb_build_object('req',null,'step','chyba','ok',false,'msg','Registrátor neodpovedal.');
    end if;
  end if;
  if rg->>'req' is null and rg->>'step' in ('svc','list','add') and domain_reg_cfg() is not null then
    if rg->>'step'='svc' then rg:=rg||jsonb_build_object('req',domain_reg_req('GET','/v2/service'),'sent',now());
    elsif rg->>'step'='list' then rg:=rg||jsonb_build_object('req',domain_reg_req('GET','/v2/service/'||(rg->>'sid')||'/dns/record'),'sent',now());
    else rg:=rg||jsonb_build_object('step','add_wait','sent',now(),'req',domain_reg_req('POST','/v2/service/'||(rg->>'sid')||'/dns/record',
           jsonb_build_object('type','CNAME','name',s->>'name','content',s->>'target','ttl',coalesce((s->>'ttl')::int,3600)))); end if;
  end if;
  s:=s||jsonb_build_object('reg',rg);
  -- zaseknuté požiadavky (bez odpovede > 20 min) zahodiť
  if coalesce((s->>'req_sent')::timestamptz,now())<now()-interval '20 minutes' then s:=s||jsonb_build_object('dns_req',null,'https_req',null,'caa_req',null); end if;
  -- 4) nové kontroly (DNS, kým nie je overené; HTTPS po overení DNS; pri hotovom stave raz za hodinu)
  if s->>'dns_req' is null and (not coalesce((s->>'dns_ok')::boolean,false) or coalesce((s->>'last_check')::timestamptz,'2000-01-01')<now()-interval '55 minutes') then
    s:=s||jsonb_build_object('dns_req',net.http_get(url:='https://dns.google/resolve?name='||(s->>'host')||'&type=A',timeout_milliseconds:=10000),'checks',coalesce((s->>'checks')::int,0)+1,'req_sent',now());
    if s->>'caa_need' is null then s:=s||jsonb_build_object('caa_req',net.http_get(url:='https://dns.google/resolve?name='||regexp_replace(s->>'host','^[^.]+\.','')||'&type=CAA',timeout_milliseconds:=10000)); end if;
  end if;
  if coalesce((s->>'dns_ok')::boolean,false) and s->>'https_req' is null and not coalesce((s->>'https_ok')::boolean,false) then
    s:=s||jsonb_build_object('https_req',net.http_get(url:='https://'||(s->>'host')||'/farmar/manifest.webmanifest',timeout_milliseconds:=15000),'req_sent',now());
  end if;
  -- 5) upozornenia
  if coalesce((s->>'https_ok')::boolean,false) and s->>'notified_ok' is null then
    begin perform owner_push('✅ app.ernte.sk funguje','Doména overená (DNS) a HTTPS certifikát je platný. Stará adresa sa presmeruje na https://app.ernte.sk so zachovaním cesty.'||chr(10)||'👉 ERNTE Trade & Logistic: https://app.ernte.sk/farmar/',4,'white_check_mark'); exception when others then null; end;
    s:=s||jsonb_build_object('notified_ok',now());
  end if;
  if s->>'shown_at' is not null and not coalesce((s->>'dns_ok')::boolean,false) and s->>'notified_48' is null and (s->>'shown_at')::timestamptz<now()-interval '48 hours' then
    begin perform owner_push('🌐 DNS pre app.ernte.sk ešte nie je nastavené','U registrátora domény ernte.sk pridaj záznam: CNAME  app  →  '||(s->>'target')||'  (TTL 3600). Návod a hotový e-mail pre správcu: Flotila → Nastavenia → 🌐 Doména.',4,'globe_with_meridians'); exception when others then null; end;
    s:=s||jsonb_build_object('notified_48',now());
  end if;
  perform domain_put(s);
  return s;
end $$;
revoke all on function public.domain_tick() from public, anon, authenticated;

-- stav pre majiteľa (bez kľúčov); prvé zobrazenie = začiatok 48 h
create or replace function public.domain_status(p_seen boolean default true) returns jsonb language plpgsql security definer set search_path=public as $$
declare s jsonb; c jsonb;
begin
  if not is_owner() then return null; end if;
  s:=domain_st();
  if coalesce(p_seen,true) and s->>'shown_at' is null then s:=s||jsonb_build_object('shown_at',now()); perform domain_put(jsonb_build_object('shown_at',now())); end if;
  c:=domain_reg_cfg();
  return (s-'dns_req'-'https_req'-'caa_req')||jsonb_build_object('reg',coalesce(s->'reg','{}'::jsonb)-'req'-'sid','reg_prov',c->>'prov','reg_key',c is not null and coalesce(c->>'key','')<>'','reg_at',c->>'at');
end $$;
revoke all on function public.domain_status(boolean) from public, anon; grant execute on function public.domain_status(boolean) to authenticated;

create or replace function public.domain_check_now() returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  perform domain_put(jsonb_build_object('last_check','2000-01-01'::timestamptz,'https_req',null,'dns_req',null));
  perform domain_tick();
  return domain_status(false);
end $$;
revoke all on function public.domain_check_now() from public, anon; grant execute on function public.domain_check_now() to authenticated;

-- uloženie registrátora a kľúča (iba Martin / majiteľ); kľúč sa nikdy nevracia
create or replace function public.domain_reg_set(p_prov text, p_key text default null, p_secret text default null) returns jsonb language plpgsql security definer set search_path=public, vault as $$
declare pr text:=lower(coalesce(p_prov,'')); old jsonb:=domain_reg_cfg(); c jsonb; id uuid; api boolean;
begin
  if not (price_main() or is_owner()) then raise exception 'Registrátora nastavuje iba majiteľ.'; end if;
  if pr not in ('websupport','forpsi','active24','iny') then raise exception 'Neznámy registrátor.'; end if;
  api:=pr in ('websupport','active24');
  c:=jsonb_build_object('prov',pr,'at',now(),'key',coalesce(nullif(trim(p_key),''),case when old->>'prov'=pr then old->>'key' end,''),
     'secret',coalesce(nullif(trim(p_secret),''),case when old->>'prov'=pr then old->>'secret' end,''));
  if api and ((c->>'key')='' or (c->>'secret')='') then raise exception 'Zadaj API kľúč aj secret.'; end if;
  begin
    select v.id into id from vault.secrets v where v.name='ernte_dns_reg' limit 1;
    if id is null then perform vault.create_secret(c::text,'ernte_dns_reg','DNS registrátor ernte.sk'); else perform vault.update_secret(id,c::text,'ernte_dns_reg',null); end if;
  exception when others then
    insert into ai_state(key,value) values('dns_reg_cfg',c) on conflict(key) do update set value=excluded.value;
  end;
  perform domain_put(jsonb_build_object('reg',case when api then jsonb_build_object('prov',pr,'step','svc','started',now()) else jsonb_build_object('prov',pr,'step','rucne','msg','Registrátor nemá API – záznam treba pridať ručne (hotový e-mail v aplikácii).') end));
  if api then perform domain_tick(); end if;
  return jsonb_build_object('ok',true,'prov',pr,'api',api);
end $$;
revoke all on function public.domain_reg_set(text,text,text) from public, anon; grant execute on function public.domain_reg_set(text,text,text) to authenticated;

do $$ begin
  begin perform cron.unschedule('domena'); exception when others then null; end;
  perform cron.schedule('domena','*/15 * * * *','select public.domain_tick()');
end $$;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-10-30','🌐 Vlastná doména app.ernte.sk','Prehľad (karta) · Flotila → Nastavenia → 🩺 Diagnostika a 🌐 Doména','iba majiteľ',array['owner'],
 'Presný DNS záznam (CNAME app → ernte-trade.github.io, TTL 3600) s tlačidlom Kopírovať, stav overenia DNS a HTTPS certifikátu. Kontrola každých 15 min; po overení sa doména zapne sama, stará adresa sa presmeruje (301, cesta aj parametre ostávajú). Registrátor WebSupport / Active24: po uložení API kľúča (iba na serveri) aplikácia vytvorí záznam sama; Forpsi / iný: hotový e-mail pre správcu domény. Push „app.ernte.sk funguje“ po overení, pripomienka po 48 h.'
where not exists(select 1 from app_novinky where titul like '🌐 Vlastná doména app.ernte.sk%');
select public.domain_tick() is not null;
select 'domena ok';
