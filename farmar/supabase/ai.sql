-- ERNTE AI Podpora – chat s AI (Claude), prehľady do Dashboardu, úlohy na úpravu aplikácie.
-- Vidí iba majiteľ (role owner). Kľúče sú v trezore Supabase (Vault), nie v kóde.
create extension if not exists pg_net;
create extension if not exists pgcrypto with schema extensions;

create table if not exists ai_msgs(
  id bigserial primary key,
  kind text not null default 'chat' check (kind in ('chat','report','fix')),
  role text not null check (role in ('user','assistant')),
  content text,
  status text not null default 'ok' check (status in ('ok','wait','err')),
  req_id bigint, tries int not null default 0, convo jsonb,
  created_at timestamptz not null default now());
create index if not exists ai_msgs_at on ai_msgs(created_at desc);
create table if not exists ai_tasks(
  id uuid primary key default gen_random_uuid(),
  text text not null,
  status text not null default 'nova' check (status in ('nova','odoslana','hotova','chyba')),
  req_id bigint, tries int not null default 0, msg_id bigint,
  report text, created_at timestamptz not null default now(), done_at timestamptz);
create table if not exists ai_state(key text primary key, value jsonb, updated_at timestamptz default now());

alter table ai_msgs enable row level security;
alter table ai_tasks enable row level security;
alter table ai_state enable row level security;
drop policy if exists ai_msgs_own on ai_msgs;  create policy ai_msgs_own  on ai_msgs  for select using (is_owner());
drop policy if exists ai_tasks_own on ai_tasks; create policy ai_tasks_own on ai_tasks for select using (is_owner());
drop policy if exists ai_state_own on ai_state; create policy ai_state_own on ai_state for all using (is_owner()) with check (is_owner());

create or replace function public.ai_secret(n text) returns text language sql stable security definer set search_path=public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name=n limit 1 $$;
revoke all on function public.ai_secret(text) from public, anon, authenticated;

-- prehľad firmy, ktorý AI dostane ku každej otázke
create or replace function public.ai_snapshot() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare j jsonb; m0 timestamptz:=date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava';
begin
  j:=jsonb_build_object(
   'teraz', to_char(now() at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),
   'cennik_eur_t', (select jsonb_object_agg(com,price) from prices),
   'cennik_platny_do', (select value->>'valid' from settings where key='pricelist'),
   'obchody_podla_stavu', (select jsonb_object_agg(status, x) from (select status, jsonb_build_object('pocet',count(*),'ton',sum(tons),'dodane_t',sum(delivered_t),'hodnota_eur',round(sum(tons*price))) x from deals group by status) s),
   'otvorene_obchody', (select coalesce(jsonb_agg(x),'[]') from (select d.no, f.name farmar, d.com komodita, d.tons ton, d.delivered_t dodane_t, d.price cena, d.status stav, d.term termin, d.created_at::date vytvorene
       from deals d join farmers f on f.id=d.farmer_id where d.status not in ('zaplateny','zruseny') order by d.created_at desc limit 25) x),
   'nove_poziadavky', (select coalesce(jsonb_agg(x),'[]') from (select r.kind typ, f.name farmar, r.com, r.tons, r.price, r.pickup_date, r.note, r.created_at::date from requests r join farmers f on f.id=r.farmer_id where r.status='nova' order by r.created_at desc limit 15) x),
   'farmarov_aktivnych', (select count(*) from farmers where active),
   'flotila_tento_mesiac', (select jsonb_build_object('jazd',count(*),'km',round(sum(distance)),'nafta_l',round(sum(fuel_consumed)),'natankovane_l',round(sum(refuel_l)),'natankovane_eur',round(sum(refuel_eur)),'vodicov',count(distinct driver),'aut',count(distinct vehicle_id)) from rides where start_at>=m0),
   'flotila_po_autach_mesiac', (select coalesce(jsonb_agg(x),'[]') from (select coalesce(plate,vehicle_id) auto, round(sum(distance)) km, round(sum(fuel_consumed)) l, round(100*sum(fuel_consumed)/nullif(sum(distance),0),1) l_100km from rides where start_at>=m0 group by 1 order by 2 desc nulls last) x),
   'auta_teraz', (select jsonb_build_object('spolu',count(*),'ide',count(*) filter (where speed>3 and gps_at>now()-interval '20 min')) from cmd_vehicles),
   'udalosti_7_dni', (select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '7 days' group by kind) x),
   'posledne_alarmy', (select coalesce(jsonb_agg(x),'[]') from (select kind, plate, driver, note, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where at>now()-interval '3 days' and kind ~* 'fuel|nafta|kradz|theft' order by at desc limit 10) x),
   'nastavenia_nakladov', (select value from fleet_cfg where key='costs'),
   'kpi_z_aplikacie', (select value from ai_state where key='kpi'),
   'posledne_upravy_ai', (select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x));
  return j;
exception when others then return coalesce(j,'{}'::jsonb)||jsonb_build_object('chyba_prehladu',SQLERRM);
end $$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;

create or replace function public.ai_system() returns text language sql stable as $$ select
'Si ERNTE AI – osobný poradca a kontrolór majiteľa (Martin Vaľko) firiem ERNTE spol. s r.o. (výkup obilia a olejnín od farmárov, predaj odberateľom/na burzu) a VALKO s.r.o. (kamiónová doprava, Scania ťahače, Michalovce, dvor Medovská 46). Píš po slovensky, stručne, priamo, bez omáčok, ako skúsený obchodný riaditeľ. Používaj čísla.
Úlohy: 1) kontroluj obchody, náklady, zisky a straty, flotilu (spotreba, krádeže nafty, prestoje) a upozorni čo je zlé a čo dobré; 2) sleduj trhy (MATIF repka/pšenica/kukurica, CBOT sója, slovenské a maďarské výkupné ceny, nafta) – na aktuálne ceny VŽDY použi web_search a uveď zdroj a dátum; 3) raď konkrétne čo má robiť (kúpiť/predať/držať, za akú cenu, komu volať, čo skontrolovať).
Nikdy si nevymýšľaj čísla – ak údaj chýba, povedz to. Zisk = obrat − (nafta + mýto + pevné náklady + mzdy).
ÚPRAVY APLIKÁCIE: ak majiteľ chce niečo v aplikácii opraviť, pridať alebo zmeniť, NEROB to v texte – na koniec odpovede pridaj samostatný riadok presne v tvare
ÚLOHA: <presný a úplný popis zmeny po slovensky, aby ju programátor vedel spraviť bez ďalších otázok>
(jeden riadok na jednu zmenu). Povedz mu, že úprava bude hotová spravidla do hodiny a zhrnutie uvidí v Dashboarde. Aplikácia: ERNTE Trade & Logistic (záložky Požiadavky, Cenník, Doprava, Flotila, Obchody, Farmári, Počasie, Tím; Flotila má Dashboard, Prevádzka a náklady, Alarmy, Mapa, Pohyby, Vozidlá, Vodiči a mzdy, Miesta, Nastavenia).
Formát: krátke odseky, odrážky „- “, tučné **takto**. Nepíš tabuľky.' $$;

create or replace function public.ai_json(t text) returns jsonb language plpgsql immutable as $$ begin return t::jsonb; exception when others then return null; end $$;

-- interné: pošli požiadavku na Claude API
create or replace function public.ai_post(convo jsonb, sys_extra text default '') returns bigint language plpgsql security definer set search_path=public, net as $$
declare k text:=regexp_replace(coalesce(ai_secret('anthropic_key'),''),'\s','','g'); md text:=(select value->>'mode' from ai_state where key='auth');
begin
  if k='' then k:=null; end if;
  if k is null then raise exception 'Chýba API kľúč – spusti nastavenie na stránke ai.html.'; end if;
  return net.http_post(url:='https://api.anthropic.com/v1/messages',
    headers:=case when coalesce(md, case when k like 'sk-ant-api%' then 'x' else 'b' end)='x' then jsonb_build_object('x-api-key',k) else jsonb_build_object('Authorization','Bearer '||k) end||jsonb_build_object('anthropic-version','2023-06-01','content-type','application/json'),
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',3000,
      'system', ai_system()||E'\n\nAKTUÁLNE ÚDAJE FIRMY (JSON):\n'||ai_snapshot()::text||sys_extra,
      'messages',convo,
      'tools',jsonb_build_array(jsonb_build_object('type','web_search_20250305','name','web_search','max_uses',5))),
    timeout_milliseconds:=180000);
end $$;
revoke all on function public.ai_post(jsonb,text) from public, anon, authenticated;

-- majiteľ pošle správu
create or replace function public.ai_ask(q text, kpi jsonb default null) returns bigint language plpgsql security definer set search_path=public as $$
declare cv jsonb:='[]'; r record; last text:=''; aid bigint;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if coalesce(trim(q),'')='' then raise exception 'Prázdna správa.'; end if;
  if kpi is not null then insert into ai_state(key,value,updated_at) values('kpi',kpi,now()) on conflict(key) do update set value=excluded.value, updated_at=now(); end if;
  insert into ai_msgs(kind,role,content) values('chat','user',left(q,8000));
  for r in select * from (select role, content, id from ai_msgs where kind='chat' and status='ok' order by id desc limit 16) t order by id loop
    if jsonb_array_length(cv)=0 and r.role<>'user' then continue; end if;
    if r.role=last then cv:=jsonb_set(cv, array[(jsonb_array_length(cv)-1)::text,'content'], to_jsonb((cv->-1->>'content')||E'\n\n'||r.content));
    else cv:=cv||jsonb_build_array(jsonb_build_object('role',r.role,'content',r.content)); end if;
    last:=r.role;
  end loop;
  insert into ai_msgs(kind,role,status,convo,req_id) values('chat','assistant','wait',cv,ai_post(cv)) returning id into aid;
  return aid;
end $$;
grant execute on function public.ai_ask(text,jsonb) to authenticated;

-- prehľad (ráno/poobede alebo na požiadanie)
create or replace function public.ai_report(what text default null) returns bigint language plpgsql security definer set search_path=public as $$
declare cv jsonb; aid bigint;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  cv:=jsonb_build_array(jsonb_build_object('role','user','content',coalesce(what,
    'Sprav prehľad pre majiteľa na Dashboard: 1) TRHY dnes – MATIF repka, pšenica, kukurica, CBOT sója (vyhľadaj aktuálne ceny a trend) a porovnaj s naším cenníkom; 2) OBCHODY – čo je otvorené, riziká, marža; 3) FLOTILA – km, spotreba, náklady, zisk/strata, alarmy, podozrivé veci; 4) ČO ROBIŤ DNES – max 5 konkrétnych krokov. Začni jednou vetou s najdôležitejšou vecou. Max ~250 slov.')));
  insert into ai_msgs(kind,role,content) values('report','user',coalesce(what,'Prehľad'));
  insert into ai_msgs(kind,role,status,convo,req_id) values('report','assistant','wait',cv,ai_post(cv)) returning id into aid;
  return aid;
end $$;
grant execute on function public.ai_report(text) to authenticated;

-- interné: vytvor GitHub úlohu (zašifrovanú) pre programátora-AI
create or replace function public.ai_gh_issue(t uuid) returns void language plpgsql security definer set search_path=public, extensions, net as $$
declare tk text:=ai_secret('github_token'); pw text:=ai_secret('ai_pass'); x record;
begin
  select * into x from ai_tasks where id=t; if x is null or tk is null or pw is null then return; end if;
  update ai_tasks set status='odoslana', tries=tries+1, req_id=net.http_post(
    url:='https://api.github.com/repos/ernte-trade/ernte-/issues',
    headers:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28','Content-Type','application/json'),
    body:=jsonb_build_object('title','AI úloha '||left(t::text,8),'body','ernte-ai-task '||t::text||E'\n\n'||armor(pgp_sym_encrypt(x.text,pw,'cipher-algo=aes256')))) where id=t;
end $$;
revoke all on function public.ai_gh_issue(uuid) from public, anon, authenticated;

-- spracuj odpovede (volá aplikácia aj cron)
create or replace function public.ai_collect() returns int language plpgsql security definer set search_path=public, net as $$
declare m record; r record; j jsonb; txt text; n int:=0; ln text; tid uuid;
begin
  for m in select * from ai_msgs where status='wait' and req_id is not null order by id for update skip locked loop
    select * into r from net._http_response where id=m.req_id;
    if r.id is null then
      if m.created_at<now()-interval '6 minutes' then update ai_msgs set status='err', content='AI neodpovedala včas. Skús znova.' where id=m.id; end if;
      continue; end if;
    n:=n+1;
    if r.status_code=401 and m.tries<2 then
      insert into ai_state(key,value) values('auth',jsonb_build_object('mode',case when coalesce((select value->>'mode' from ai_state where key='auth'),case when ai_secret('anthropic_key') like 'sk-ant-api%' then 'x' else 'b' end)='x' then 'b' else 'x' end))
        on conflict(key) do update set value=excluded.value, updated_at=now();
      update ai_msgs set tries=tries+1, req_id=ai_post(convo) where id=m.id; continue; end if;
    if r.status_code=401 then
      update ai_msgs set status='err', content='Kľúč Claude nefunguje (uložený kľúč začína „'||left(coalesce(ai_secret('anthropic_key'),'?'),12)||'…“, dĺžka '||length(coalesce(ai_secret('anthropic_key'),''))||' znakov). Vytvor v Console nový kľúč a vlož ho na stránke ai.html.' where id=m.id; continue; end if;
    if r.status_code is distinct from 200 then
      update ai_msgs set status='err', content='Chyba AI ('||coalesce(r.status_code::text,'sieť')||'): '||left(coalesce(ai_json(r.content)#>>'{error,message}', r.error_msg, r.content),400) where id=m.id; continue; end if;
    j:=ai_json(r.content);
    if j is null then update ai_msgs set status='err', content='AI vrátila neplatnú odpoveď.' where id=m.id; continue; end if;
    if j->>'stop_reason'='pause_turn' and m.tries<4 then
      update ai_msgs set tries=tries+1, convo=convo||jsonb_build_array(jsonb_build_object('role','assistant','content',j->'content')),
        req_id=ai_post(convo||jsonb_build_array(jsonb_build_object('role','assistant','content',j->'content'))) where id=m.id;
      continue; end if;
    select string_agg(b->>'text','') into txt from jsonb_array_elements(j->'content') b where b->>'type'='text';
    txt:=coalesce(nullif(trim(txt),''),'(bez odpovede)');
    for ln in select (regexp_matches(txt, '^\s*\**ÚLOHA:\**\s*(.+)$', 'gm'))[1] loop
      insert into ai_tasks(text,msg_id) values(trim(ln),m.id) returning id into tid;
      perform ai_gh_issue(tid);
    end loop;
    update ai_msgs set status='ok', content=txt, convo=null where id=m.id;
  end loop;
  return n;
end $$;
grant execute on function public.ai_collect() to authenticated;

-- interné: načítaj hotové úlohy z GitHubu (zašifrované zhrnutia)
create or replace function public.ai_gh_sync() returns void language plpgsql security definer set search_path=public, extensions, net as $$
declare tk text:=ai_secret('github_token'); pw text:=ai_secret('ai_pass'); st jsonb; r record; c jsonb; tid uuid; rep text; t record; since timestamptz;
begin
  if tk is null or pw is null then return; end if;
  -- odoslanie úloh: kontrola, opakovanie
  for t in select * from ai_tasks where status in ('nova','odoslana') loop
    if t.status='nova' then perform ai_gh_issue(t.id); continue; end if;
    select * into r from net._http_response where id=t.req_id;
    if r.id is not null and r.status_code is distinct from 201 then
      if t.tries<5 then perform ai_gh_issue(t.id); else update ai_tasks set status='chyba', report='GitHub: '||left(coalesce(r.content,r.error_msg,''),200) where id=t.id; end if;
    end if;
  end loop;
  -- prečítaj odpoveď na poslednú kontrolu komentárov
  select value into st from ai_state where key='gh';
  if st is not null and st ? 'req' then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is not null and r.status_code=200 then
      for c in select * from jsonb_array_elements(coalesce(ai_json(r.content),'[]')) loop
        if c->>'body' like 'ernte-ai-report %' then
          begin
            tid:=substring(c->>'body' from 'ernte-ai-report ([0-9a-f-]{36})')::uuid;
            rep:=convert_from(pgp_sym_decrypt_bytea(dearmor(substring(c->>'body' from '(-----BEGIN PGP MESSAGE-----.*-----END PGP MESSAGE-----)')),pw),'UTF8');
            update ai_tasks set status='hotova', report=rep, done_at=now() where id=tid and status<>'hotova';
            if found then insert into ai_msgs(kind,role,content) values('fix','assistant',rep); end if;
          exception when others then null; end;
        end if;
      end loop;
    end if;
  end if;
  select min(created_at) into since from ai_tasks where status='odoslana';
  if since is null then delete from ai_state where key='gh'; return; end if;
  insert into ai_state(key,value) values('gh',jsonb_build_object('req',net.http_get(
    url:='https://api.github.com/repos/ernte-trade/ernte-/issues/comments?per_page=100&since='||to_char(since at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    headers:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28'))))
  on conflict(key) do update set value=excluded.value, updated_at=now();
end $$;
revoke all on function public.ai_gh_sync() from public, anon, authenticated;

create or replace function public.ai_tick() returns void language plpgsql security definer set search_path=public as $$
begin
  perform ai_collect();
  if extract(minute from now())::int % 5 = 0 then perform ai_gh_sync(); end if;
end $$;

-- automaticky: každú minútu spracovanie, prehľad ráno 6:00 a poobede 14:00 (Bratislava)
select cron.unschedule(jobname) from cron.job where jobname in ('ai-tick','ai-rano','ai-poobede');
select cron.schedule('ai-tick','* * * * *','select public.ai_tick()');
select cron.schedule('ai-rano','0 5 * * *','select public.ai_report()');
select cron.schedule('ai-poobede','0 13 * * 1-5','select public.ai_report()');
