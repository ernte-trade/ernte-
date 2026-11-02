-- 📧 2. 11.: odosielanie e-mailov cez Microsoft Graph (OAuth 2.0 client credentials) namiesto SMTP Basic Auth
-- (Microsoft 365 tenant ERNTE má SMTP AUTH vypnuté: 535 5.7.139). Konfigurácia profilu v trezore (vault ernte_smtp / ernte_smtp_<profil>):
--   SMTP: {host,port,user,pass,from,name}   ·   Graph: {kind:'graph',tenant,client_id,secret,from,name}
-- Front neodoslaných e-mailov: chybné od 31. 10. sa po úspešnom teste / úspešnom odoslaní z rovnakej schránky pošlú znova
-- (upozornenia bez prílohy staršie ako 48 h sa iba zaznamenajú ako neaktuálne). Každé zlyhanie = push majiteľovi priorita 4.
alter table mail_jobs add column if not exists kind text not null default 'mail';
alter table mail_jobs add column if not exists retries int not null default 0;
alter table mail_jobs add column if not exists orig_at timestamptz;

create or replace function public.mail_cfg_set(p jsonb, p_prof text default 'ernte') returns jsonb language plpgsql security definer set search_path=public, vault as $$
declare c jsonb; id uuid; s text; pr text:=case when p_prof in ('danube','valko','ponuky') then p_prof else 'ernte' end; nm text:=case when pr='ernte' then 'ernte_smtp' else 'ernte_smtp_'||pr end; old jsonb:=mail_cfg_get(pr);
  dn text:=case pr when 'danube' then 'Danube Commodities Kft.' when 'valko' then 'VALKO s.r.o.' else 'ERNTE spol. s r.o.' end;
begin
  if not (price_main() or is_owner()) then raise exception 'Nastaviť e-mail môže iba majiteľ (Martin, Jana).'; end if;
  if coalesce(p->>'kind','')='graph' then
    c:=jsonb_build_object('kind','graph','tenant',lower(trim(coalesce(p->>'tenant',''))),'client_id',lower(trim(coalesce(p->>'client_id',''))),'secret',coalesce(p->>'secret',''),
       'from',lower(trim(coalesce(p->>'from',''))),'name',coalesce(nullif(trim(p->>'name'),''),dn));
    if c->>'tenant' !~ '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9.-]+\.[a-z]{2,})$' then raise exception 'Tenant ID: zadaj ID adresára (GUID) alebo doménu, napr. ernte.sk.'; end if;
    if c->>'client_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Client ID (ID aplikácie) musí byť GUID z registrácie aplikácie v Microsoft Entra.'; end if;
    if c->>'from' !~ '^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$' then raise exception 'Zadaj odosielaciu schránku (e-mail).'; end if;
    if (c->>'secret')='' then
      if coalesce(old->>'kind','')='graph' and old->>'client_id'=c->>'client_id' then c:=jsonb_set(c,'{secret}',to_jsonb(coalesce(old->>'secret',''))); else raise exception 'Zadaj Client secret (hodnotu tajomstva aplikácie).'; end if;
    end if;
  else
    c:=jsonb_build_object('host',trim(coalesce(p->>'host','')),'port',coalesce(nullif(p->>'port','')::int,465),'user',trim(coalesce(p->>'user','')),
       'pass',coalesce(p->>'pass',''),'from',trim(coalesce(nullif(p->>'from',''),p->>'user','')),'name',coalesce(nullif(trim(p->>'name'),''),dn));
    if c->>'host' !~ '^[a-z0-9.-]+\.[a-z]{2,}$' or (c->>'user')='' then raise exception 'Vyplň server a prihlasovacie meno.'; end if;
    if (c->>'pass')='' then c:=jsonb_set(c,'{pass}',to_jsonb(coalesce(old->>'pass',''))); end if;
  end if;
  s:=c::text;
  begin
    select v.id into id from vault.secrets v where v.name=nm limit 1;
    if id is null then perform vault.create_secret(s,nm,'E-mail '||pr||' – odosielanie z aplikácie'); else perform vault.update_secret(id,s,nm,null); end if;
  exception when others then
    insert into ai_state(key,value) values(case when pr='ernte' then 'smtp_cfg' else 'smtp_cfg_'||pr end,c) on conflict(key) do update set value=excluded.value;
  end;
  return jsonb_build_object('ok',true,'profile',pr,'kind',coalesce(c->>'kind','smtp'),'host',c->>'host','user',coalesce(c->>'user',c->>'from'));
end $$;
revoke all on function public.mail_cfg_set(jsonb,text) from public, anon; grant execute on function public.mail_cfg_set(jsonb,text) to authenticated;

create or replace function public.mail_ready(p_prof text default 'ernte') returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb; g boolean;
begin
  if not (is_owner() or is_staff()) then return jsonb_build_object('ok',false); end if;
  c:=mail_cfg_get(p_prof); g:=coalesce(c->>'kind','')='graph';
  return jsonb_build_object('ok',c is not null and (case when g then coalesce(c->>'secret','')<>'' else coalesce(c->>'pass','')<>'' end),'kind',case when c is null then null when g then 'graph' else 'smtp' end,
    'from',c->>'from','host',case when (price_main() or is_owner()) and not g then c->>'host' end,'user',case when price_main() or is_owner() then coalesce(c->>'user',c->>'from') end,'main',price_main(),'profile',coalesce(p_prof,'ernte'));
end $$;
revoke all on function public.mail_ready(text) from public, anon; grant execute on function public.mail_ready(text) to authenticated;

-- neodoslané e-maily znova: upozornenia (bez prílohy, bez obchodu, nie ponuka) staršie ako 48 h → iba záznam „neaktuálne“
create or replace function public.mail_requeue_do(p_prof text) returns jsonb language plpgsql security definer set search_path=public as $$
declare j record; n_re int:=0; n_old int:=0; n_lost int:=0; lead boolean;
begin
  for j in select * from mail_jobs where status='chyba' and coalesce(profile,'ernte')=coalesce(p_prof,'ernte') and coalesce(orig_at,created_at)>='2026-10-31' and kind<>'test' and retries<3 order by created_at loop
    lead:=false; begin execute 'select exists(select 1 from sales_leads where mail_job=$1)' into lead using j.id; exception when others then lead:=false; end;
    if j.att_name is null and j.deal_id is null and not lead and coalesce(j.orig_at,j.created_at)<now()-interval '48 hours' then
      update mail_jobs set status='neaktualne', err=left(coalesce(err,'')||' · neaktuálne upozornenie (> 48 h) – iba zaznamenané, neposiela sa',300) where id=j.id; n_old:=n_old+1; continue; end if;
    if j.att_name is not null and j.att_b64 is null then
      update mail_jobs set retries=3, err=left(coalesce(err,'')||' · príloha sa nezachovala – pošli znova z dokumentu (📧 Odoslať)',300) where id=j.id; n_lost:=n_lost+1; continue; end if;
    update mail_jobs set status='caka', taken_at=null, kicked=false, nonces='[]'::jsonb, vreq=null, vcid=null, orig_at=coalesce(orig_at,created_at), created_at=now(), retries=retries+1 where id=j.id;
    begin execute 'update sales_leads set status=''posiela'', err=null where mail_job=$1 and status in (''posiela'',''chyba'')' using j.id; exception when others then null; end;
    perform mail_kick(j.id); n_re:=n_re+1;
  end loop;
  return jsonb_build_object('znova',n_re,'neaktualne',n_old,'bez_prilohy',n_lost);
end $$;
revoke all on function public.mail_requeue_do(text) from public, anon, authenticated;

create or replace function public.mail_requeue(p_prof text default 'ernte') returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not (price_main() or is_owner()) then raise exception 'Iba majiteľ.'; end if;
  return mail_requeue_do(p_prof);
end $$;
revoke all on function public.mail_requeue(text) from public, anon; grant execute on function public.mail_requeue(text) to authenticated;

-- výsledok odoslania: príloha sa pri chybe ponechá (kvôli opätovnému odoslaniu), zlyhanie = push majiteľovi (priorita 4), úspech → front schránky znova
create or replace function public.mail_job_done(p_id uuid, p_ok boolean, p_err text default null) returns void language plpgsql security definer set search_path=public as $$
declare j mail_jobs;
begin
  update mail_jobs set status=case when p_ok then 'odoslany' else 'chyba' end, err=left(p_err,300), sent_at=case when p_ok then now() end,
    att_b64=case when p_ok then null else att_b64 end where id=p_id and status='posiela' returning * into j;
  if j.id is null then return; end if;
  if p_ok then
    if exists(select 1 from mail_jobs where status='chyba' and coalesce(profile,'ernte')=coalesce(j.profile,'ernte') and coalesce(orig_at,created_at)>='2026-10-31' and kind<>'test' and retries<3) then
      begin perform mail_requeue_do(j.profile); exception when others then null; end;
    end if;
  else
    begin
      perform push_app('mail','mail_err',j.id::text,'📧 E-mail sa neodoslal'||case when j.kind='test' then ' (test)' else '' end,
        'Schránka '||coalesce(j.profile,'ernte')||' · '||left(regexp_replace(coalesce(p_err,'chyba'),'[\w.+-]+@[\w.-]+','…','g'),180)||' · predmet: '||left(coalesce(j.subject,''),60),
        4,'https://ernte-trade.github.io/ernte-/farmar/#flotila/set/mail',array['email'],null,null,false);
    exception when others then null; end;
  end if;
end $$;
revoke all on function public.mail_job_done(uuid,boolean,text) from public; grant execute on function public.mail_job_done(uuid,boolean,text) to anon, authenticated;

-- 📧 testovací e-mail na adresu prihláseného majiteľa
create or replace function public.mail_test(p_prof text default 'ernte') returns uuid language plpgsql security definer set search_path=public as $$
declare jid uuid; pr text:=case when p_prof in ('danube','valko','ponuky') then p_prof else 'ernte' end; me text:=lower(coalesce(auth.jwt()->>'email',''));
begin
  if not (price_main() or is_owner()) then raise exception 'Iba majiteľ.'; end if;
  if mail_cfg_get(pr) is null then raise exception 'Schránka ešte nie je nastavená.'; end if;
  if me !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'Chýba tvoj e-mail.'; end if;
  if (select count(*) from mail_jobs where kind='test' and created_at>now()-interval '10 minutes')>=5 then raise exception 'Počkaj chvíľu – veľa testov za sebou.'; end if;
  insert into mail_jobs(by_email,to_addr,subject,body,profile,kind) values(me,me,'ERNTE – testovací e-mail ('||pr||')',
    'Toto je testovací e-mail z aplikácie ERNTE Trade & Logistic.'||E'\n'||'Schránka: '||pr||' · '||to_char(now() at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI')||E'\n\n'||'Ak ste ho dostali, odosielanie funguje.'||E'\n\n'||'👉 ERNTE Trade & Logistic: https://ernte-trade.github.io/ernte-/farmar/',pr,'test')
    returning id into jid;
  return jid;
end $$;
revoke all on function public.mail_test(text) from public, anon; grant execute on function public.mail_test(text) to authenticated;

-- stav schránok pre ⚙️ Nastavenia → 📧 E-mail (bez hesiel)
create or replace function public.mail_state() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb:='{}'::jsonb; p text; c jsonb;
begin
  if not (price_main() or is_owner()) then raise exception 'Iba majiteľ.'; end if;
  foreach p in array array['ernte','ponuky','danube','valko'] loop
    c:=mail_cfg_get(p);
    r:=r||jsonb_build_object(p,jsonb_build_object(
      'kind',case when c is null then null when c->>'kind'='graph' then 'graph' else 'smtp' end,
      'from',c->>'from','user',coalesce(c->>'user',c->>'from'),'tenant',c->>'tenant','client_id',c->>'client_id','host',c->>'host',
      'ok',c is not null and (coalesce(c->>'secret','')<>'' or coalesce(c->>'pass','')<>''),
      'last_ok',(select max(sent_at) from mail_jobs where coalesce(profile,'ernte')=p and status='odoslany'),
      'last_err',(select jsonb_build_object('at',created_at,'err',left(err,200)) from mail_jobs where coalesce(profile,'ernte')=p and status='chyba' order by created_at desc limit 1),
      'fronta',(select count(*) from mail_jobs where coalesce(profile,'ernte')=p and status='chyba' and coalesce(orig_at,created_at)>='2026-10-31' and kind<>'test' and retries<3),
      'neaktualne',(select count(*) from mail_jobs where coalesce(profile,'ernte')=p and status='neaktualne'),
      'caka',(select count(*) from mail_jobs where coalesce(profile,'ernte')=p and status in ('caka','posiela') and created_at>now()-interval '30 minutes')));
  end loop;
  return r;
end $$;
revoke all on function public.mail_state() from public, anon; grant execute on function public.mail_state() to authenticated;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-02','📧 E-maily cez Microsoft Graph + front neodoslaných','Flotila → ⚙️ Nastavenia → 📧 E-mail','majiteľ',array['owner'],
 'Microsoft 365 má vypnuté SMTP prihlásenie (535 5.7.139), preto aplikácia vie posielať cez Microsoft Graph (OAuth 2.0, oprávnenie Mail.Send obmedzené na odosielaciu schránku). V Nastaveniach je odkaz na súhlas správcu, stav každej schránky a tlačidlo Poslať testovací e-mail. Neodoslané e-maily od 31. 10. sa po prvom úspešnom odoslaní pošlú znova (staré upozornenia > 48 h sa iba zaznamenajú). Každé zlyhanie e-mailu = upozornenie do mobilu.'
where not exists(select 1 from app_novinky where titul like '📧 E-maily cez Microsoft Graph%');
