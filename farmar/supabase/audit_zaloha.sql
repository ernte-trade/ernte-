-- ===== ERNTE · NEMENNÝ ZÁZNAM ZMIEN · BODY OBNOVY NASTAVENÍ · RIZIKOVÉ SKÓRE FARMÁROV · ŽIADOSŤ O ZMAZANIE ÚČTU =====
-- 6. 11. 2026 príkaz majiteľa (Master Enterprise Prompt + kontrolný zoznam):
--  • audit_log – každá zmena cien, zmlúv, lístkov, podpisov, súhlasov GDPR, prístupov a nastavení: kto, kedy, IP, zariadenie, čo sa zmenilo.
--    Zápis nikdy nezastaví pôvodnú zmenu (výnimky sa zachytia). Riadky sa nedajú meniť ani mazať (trigger), reťaz SHA-256
--    pečatí audit_seal (pg_cron každú minútu), denná kotva (hash) ide mimo databázy – komentár v GitHube (#83, zašifrovaný).
--  • config_snap – body obnovy nastavení (cenník pricelist/*, settings, ai_state nastavenia, modely odberateľov, prístupy tímu);
--    denne automaticky (iba pri zmene), ručne, pred každou obnovou. Obnovuje IBA Martin (price_main), po položkách, s náhľadom.
--  • farmer_risk – rizikové skóre farmára (plnenie zmlúv, meškanie, kvalita, sporné lístky, náhradné nákupy, chýbajúce údaje).
--  • account_delete_* – tlačidlo „Zmazať účet a moje dáta“ (App Store / Google Play, GDPR čl. 17): žiadosť → Martin vykoná / zamietne.
-- Žiadne obchodné údaje v tomto súbore.

-- ---------- 1) kontext požiadavky ----------
create or replace function public.audit_ctx() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare h jsonb; em text; ip text; ua text; q text;
begin
  begin h:=nullif(current_setting('request.headers',true),'')::jsonb; exception when others then h:=null; end;
  begin em:=lower(nullif(auth.jwt()->>'email','')); exception when others then em:=null; end;
  if h is not null then
    ip:=nullif(trim(split_part(coalesce(h->>'x-forwarded-for',h->>'x-real-ip',h->>'cf-connecting-ip',''),',',1)),'');
    ua:=left(h->>'user-agent',200);
  end if;
  if em is null then begin q:=left(regexp_replace(current_query(),'\s+',' ','g'),140); exception when others then q:=null; end; end if;
  return jsonb_strip_nulls(jsonb_build_object('who',coalesce(em,'systém'),'ip',ip,'ua',ua,'q',q));
end $$;
revoke all on function public.audit_ctx() from public, anon, authenticated;

-- ---------- 2) tabuľka záznamu ----------
create table if not exists public.audit_log(
  id bigserial primary key,
  at timestamptz not null default clock_timestamp(),
  tbl text not null, op text not null, rid text,
  who text, ip text, ua text, q text,
  diff jsonb,
  seq bigint unique, prev text, h text);
create index if not exists audit_log_at on public.audit_log(at desc);
create index if not exists audit_log_tbl on public.audit_log(tbl, at desc);
create index if not exists audit_log_rid on public.audit_log(rid);
create index if not exists audit_log_open on public.audit_log(id) where h is null;
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;

-- nemenné: zmazať nejde, meniť iba raz – zapečatenie (seq, prev, h z prázdnych)
create or replace function public.audit_log_lock() returns trigger language plpgsql as $$
begin
  if tg_op='DELETE' or tg_op='TRUNCATE' then raise exception 'Záznam zmien sa nedá mazať.'; end if;
  if old.h is not null or new.id<>old.id or new.at<>old.at or new.tbl<>old.tbl or new.op<>old.op or new.rid is distinct from old.rid
     or new.who is distinct from old.who or new.ip is distinct from old.ip or new.ua is distinct from old.ua or new.q is distinct from old.q
     or new.diff is distinct from old.diff then raise exception 'Záznam zmien sa nedá meniť.'; end if;
  return new;
end $$;
drop trigger if exists audit_log_lock on public.audit_log;
create trigger audit_log_lock before update or delete on public.audit_log for each row execute function public.audit_log_lock();
drop trigger if exists audit_log_trunc on public.audit_log;
create trigger audit_log_trunc before truncate on public.audit_log for each statement execute function public.audit_log_lock();

create or replace function public.audit_hash(p_prev text, p_seq bigint, p_id bigint, p_at timestamptz, p_tbl text, p_op text, p_rid text, p_who text, p_ip text, p_diff jsonb)
returns text language sql immutable as $$
  select encode(extensions.digest(convert_to(coalesce(p_prev,'')||'|'||p_seq||'|'||p_id||'|'||to_char(p_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'|'||p_tbl||'|'||p_op||'|'||
    coalesce(p_rid,'')||'|'||coalesce(p_who,'')||'|'||coalesce(p_ip,'')||'|'||coalesce(p_diff::text,''),'UTF8'),'sha256'),'hex') $$;

-- veľké hodnoty (obrázky podpisov, dlhé zoznamy) → dĺžka + SHA-256 + začiatok
create or replace function public.audit_cap(v jsonb) returns jsonb language sql immutable as $$
  select case when v is null then null when length(v::text)<=4000 then v
    else jsonb_build_object('_dlzka',length(v::text),'_sha256',encode(extensions.digest(convert_to(v::text,'UTF8'),'sha256'),'hex'),'_zaciatok',left(v::text,240)) end $$;

-- rozdiel dvoch hodnôt: objekty po kľúčoch (jedna úroveň), inak [staré, nové]
create or replace function public.audit_jdiff(a jsonb, b jsonb) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(a)='object' and jsonb_typeof(b)='object' then
      jsonb_build_object('_zmeny',coalesce((select jsonb_object_agg(k,case when jsonb_typeof(a->k)='array' and jsonb_typeof(b->k)='array' then
          jsonb_strip_nulls(jsonb_build_object(
            '+',(select jsonb_agg(public.audit_cap(e)) from (select e from jsonb_array_elements(b->k) e except all select e from jsonb_array_elements(a->k) e limit 30) y),
            '-',(select jsonb_agg(public.audit_cap(e)) from (select e from jsonb_array_elements(a->k) e except all select e from jsonb_array_elements(b->k) e limit 30) y)))
          else jsonb_build_array(public.audit_cap(a->k),public.audit_cap(b->k)) end)
        from (select jsonb_object_keys(a) k union select jsonb_object_keys(b)) x where (a->k) is distinct from (b->k)),'{}'::jsonb))
    else jsonb_build_array(public.audit_cap(a),public.audit_cap(b)) end $$;

-- spoločný trigger: tg_argv[0] = kľúč riadku (aj 'path,id'), [1] = ignorované stĺpce, [2] = maskované stĺpce
create or replace function public.audit_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare o jsonb; n jsonb; d jsonb:='{}'::jsonb; k text; pk text:=coalesce(tg_argv[0],'id'); ign text[]; msk text[]; v_rid text; c jsonb;
begin
  begin
    ign:=coalesce(nullif(tg_argv[1],''),'{}')::text[]; msk:=coalesce(nullif(tg_argv[2],''),'{}')::text[];
    if tg_op<>'INSERT' then o:=to_jsonb(old); end if;
    if tg_op<>'DELETE' then n:=to_jsonb(new); end if;
    v_rid:=array_to_string(array(select coalesce(n,o)->>x from unnest(string_to_array(pk,',')) x),'/');
    if tg_op='UPDATE' then
      for k in select jsonb_object_keys(n) loop
        continue when k=any(ign);
        if (o->k) is distinct from (n->k) then
          d:=d||jsonb_build_object(k,case when k=any(msk) then '["***","***"]'::jsonb else public.audit_jdiff(o->k,n->k) end);
        end if;
      end loop;
      if d='{}'::jsonb then return null; end if;
    else
      for k in select jsonb_object_keys(coalesce(n,o)) loop
        continue when k=any(ign);
        d:=d||jsonb_build_object(k,case when k=any(msk) then '"***"'::jsonb else public.audit_cap(coalesce(n,o)->k) end);
      end loop;
    end if;
    c:=audit_ctx();
    insert into audit_log(tbl,op,rid,who,ip,ua,q,diff) values(tg_table_name,left(tg_op,1),left(v_rid,200),c->>'who',c->>'ip',c->>'ua',c->>'q',d);
  exception when others then null; -- záznam nikdy nezastaví pôvodnú zmenu
  end;
  return null;
end $$;
revoke all on function public.audit_trg() from public, anon, authenticated;

-- nastavenia v ai_state, ktoré sa zaznamenávajú a zálohujú (nie stavy, nie tajomstvá)
create or replace function public.config_keys() returns text[] language sql immutable as $$
  select array['deal_watch_cfg','price_auto_raise','profit_cfg','push_cfg','push_filter','region_watch_cfg','trader_cfg','meet_cfg','pred_cfg',
               'nu_cfg','deal_sign_cc','price_alert','team_ai','mail_off','claude_auto_cfg'] $$;

do $$
declare t record;
begin
  for t in select * from (values
    ('prices','com','{updated_at}','{}'),
    ('deals','id','{delivered_t}','{}'),
    ('deliveries','ticket','{updated_at,located_at,auto_farmer,auto_score,auto_why,learned,edit_log,edited_at}','{}'),
    ('staff','email','{}','{}'),
    ('farmers','id','{}','{code}'),
    ('settings','key','{}','{}'),
    ('sell_buyers','id','{updated_at}','{}'),
    ('sale_contracts','id','{updated_at,delivered_t}','{}'),
    ('gdpr_sign','id','{}','{}'),
    ('deal_signs','deal_id','{}','{}'),
    ('trader_portal','farmer_id','{updated_at}','{}'),
    ('deal_replace','id','{}','{}'),
    ('buyer_claims','id','{}','{}')) v(tb,pk,ign,msk)
  loop
    continue when to_regclass('public.'||t.tb) is null;
    if t.tb='deal_signs' and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='deal_signs' and column_name='deal_id') then
      t.pk:=(select column_name from information_schema.columns where table_schema='public' and table_name='deal_signs' order by ordinal_position limit 1);
    end if;
    execute format('drop trigger if exists zz_audit on public.%I',t.tb);
    execute format('create trigger zz_audit after insert or update or delete on public.%I for each row execute function public.audit_trg(%L,%L,%L)',t.tb,t.pk,t.ign,t.msk);
  end loop;
  -- kalk_store iba cenník (bez denníka 'log'); ai_state iba nastavenia
  drop trigger if exists zz_audit_iu on public.kalk_store; drop trigger if exists zz_audit_d on public.kalk_store;
  create trigger zz_audit_iu after insert or update on public.kalk_store for each row when (new.path='pricelist' and new.id<>'log')
    execute function public.audit_trg('path,id','{updated_at,updated_by}','{}');
  create trigger zz_audit_d after delete on public.kalk_store for each row when (old.path='pricelist' and old.id<>'log')
    execute function public.audit_trg('path,id','{updated_at,updated_by}','{}');
  drop trigger if exists zz_audit_iu on public.ai_state; drop trigger if exists zz_audit_d on public.ai_state;
  create trigger zz_audit_iu after insert or update on public.ai_state for each row when (new.key = any(public.config_keys()))
    execute function public.audit_trg('key','{updated_at}','{}');
  create trigger zz_audit_d after delete on public.ai_state for each row when (old.key = any(public.config_keys()))
    execute function public.audit_trg('key','{updated_at}','{}');
end $$;

-- ---------- 3) pečatenie reťaze + denná kotva mimo databázy ----------
create or replace function public.audit_seal() returns int language plpgsql security definer set search_path=public as $$
declare r record; v_prev text; v_seq bigint; n int:=0;
begin
  if not pg_try_advisory_xact_lock(7746001) then return 0; end if;
  select h, seq into v_prev, v_seq from audit_log where seq is not null order by seq desc limit 1;
  v_seq:=coalesce(v_seq,0);
  for r in select * from audit_log where h is null and at < clock_timestamp()-interval '15 seconds' order by id limit 20000 loop
    v_seq:=v_seq+1;
    update audit_log set seq=v_seq, prev=v_prev, h=audit_hash(v_prev,v_seq,r.id,r.at,r.tbl,r.op,r.rid,r.who,r.ip,r.diff) where id=r.id
      returning h into v_prev;
    n:=n+1;
  end loop;
  return n;
end $$;
revoke all on function public.audit_seal() from public, anon, authenticated;

create or replace function public.audit_anchor() returns jsonb language plpgsql security definer set search_path=public as $$
declare a jsonb; o jsonb; v_old jsonb;
begin
  perform audit_seal();
  select jsonb_build_object('t','audit_kotva','seq',seq,'h',h,'at',now(),'n',(select count(*) from audit_log)) into a from audit_log where seq is not null order by seq desc limit 1;
  if a is null then return null; end if;
  select value into v_old from ai_state where key='audit_anchor';
  o:=jsonb_build_object('last',a,'list',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select x from jsonb_array_elements(coalesce(v_old->'list','[]'::jsonb)) x limit 399) z)||'[]'::jsonb);
  o:=jsonb_set(o,'{list}',jsonb_build_array(a)||(o->'list'));
  insert into ai_state(key,value,updated_at) values('audit_anchor',o,now()) on conflict(key) do update set value=excluded.value, updated_at=now();
  begin
    perform net.http_post('https://api.github.com/repos/ernte-trade/ernte-/issues/83/comments',
      jsonb_build_object('body',extensions.armor(extensions.pgp_sym_encrypt(a::text,'ernte-8067b20d83c799287de7ae04'))),'{}'::jsonb,
      jsonb_build_object('Authorization','Bearer '||ai_secret('github_token'),'Accept','application/vnd.github+json','User-Agent','ernte'));
  exception when others then null; end;
  return a;
end $$;
revoke all on function public.audit_anchor() from public, anon, authenticated;

-- ---------- 4) prehľad, overenie, export (iba Martin) ----------
create or replace function public.audit_list(p_tbl text default null, p_q text default null, p_from timestamptz default null, p_to timestamptz default null, p_limit int default 200)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_q text:=nullif(lower(trim(coalesce(p_q,''))),'');
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return jsonb_build_object(
    'rows',coalesce((select jsonb_agg(jsonb_build_object('id',id,'at',at,'tbl',tbl,'op',op,'rid',rid,'who',who,'ip',ip,'ua',ua,'q',z.q,'diff',diff,'seq',seq,'h',h) order by id desc) from (
      select * from audit_log a where (p_tbl is null or p_tbl='' or a.tbl=p_tbl) and (p_from is null or a.at>=p_from) and (p_to is null or a.at<p_to)
        and (v_q is null or lower(coalesce(a.rid,'')||' '||coalesce(a.who,'')||' '||coalesce(a.ip,'')||' '||coalesce(a.diff::text,'')) like '%'||v_q||'%')
      order by a.id desc limit least(greatest(coalesce(p_limit,200),1),5000)) z),'[]'::jsonb),
    'tbls',coalesce((select jsonb_object_agg(tbl,n) from (select tbl,count(*) n from audit_log group by tbl) t),'{}'::jsonb),
    'n',(select count(*) from audit_log),'open',(select count(*) from audit_log where h is null),
    'anchor',(select value->'last' from ai_state where key='audit_anchor'),
    'from',(select min(at) from audit_log));
end $$;

create or replace function public.audit_verify() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r record; v_prev text; n bigint:=0; bad jsonb:='[]'::jsonb; v_exp bigint:=0;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  for r in select * from audit_log where seq is not null order by seq loop
    v_exp:=v_exp+1;
    if r.seq<>v_exp then bad:=bad||jsonb_build_object('seq',v_exp,'why','chýba záznam v poradí'); v_exp:=r.seq; end if;
    if r.prev is distinct from v_prev or r.h<>audit_hash(r.prev,r.seq,r.id,r.at,r.tbl,r.op,r.rid,r.who,r.ip,r.diff) then
      bad:=bad||jsonb_build_object('seq',r.seq,'id',r.id,'why','nesedí odtlačok – záznam bol zmenený');
    end if;
    v_prev:=r.h; n:=n+1;
    exit when jsonb_array_length(bad)>=20;
  end loop;
  return jsonb_build_object('ok',jsonb_array_length(bad)=0,'n',n,'head',v_prev,'bad',bad,'open',(select count(*) from audit_log where h is null),
    'anchor_ok',(select case when value->'last' is null then null else exists(select 1 from audit_log where seq=(value->'last'->>'seq')::bigint and h=value->'last'->>'h') end from ai_state where key='audit_anchor'),
    'at',now());
end $$;
grant execute on function public.audit_list(text,text,timestamptz,timestamptz,int), public.audit_verify() to authenticated;

-- ---------- 5) IP a zariadenie pri súhlase GDPR a pri podpise ----------
alter table public.gdpr_sign add column if not exists ip text;
create or replace function public.ernte_req_ip() returns trigger language plpgsql security definer set search_path=public as $$
declare c jsonb;
begin
  begin c:=audit_ctx(); if new.ip is null then new.ip:=c->>'ip'; end if; exception when others then null; end;
  return new;
end $$;
drop trigger if exists aa_req_ip on public.gdpr_sign;
create trigger aa_req_ip before insert on public.gdpr_sign for each row execute function public.ernte_req_ip();
do $$ begin
  if to_regclass('public.deal_signs') is not null then
    execute 'alter table public.deal_signs add column if not exists ip text';
    execute 'drop trigger if exists aa_req_ip on public.deal_signs';
    execute 'create trigger aa_req_ip before insert or update on public.deal_signs for each row execute function public.ernte_req_ip()';
  end if;
end $$;

create or replace function public.gdpr_list() returns jsonb language plpgsql stable security definer set search_path to 'public','auth' as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  return jsonb_build_object(
   'signed',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'email',g.email,'kind',g.kind,'name',g.name,'ver',g.ver,'at',g.at,'ip',g.ip,'ua',g.ua,'hash',g.txt_hash) order by g.at desc) from gdpr_sign g),'[]'::jsonb),
   'users',coalesce((select jsonb_agg(x order by x->>'name') from (
      select jsonb_build_object('kind','tim','name',s.name,'email',lower(s.email),'last',u.last_sign_in_at) x from staff s left join auth.users u on lower(u.email)=lower(s.email)
      union all
      select jsonb_build_object('kind','farmar','name',f.name,'email',lower(coalesce(f.login,f.email)),'last',u.last_sign_in_at) from farmers f join auth.users u on lower(u.email)=lower(coalesce(f.login,f.email))
        where f.active and not is_test_name(f.name)) q),'[]'::jsonb));
end $$;

-- ---------- 6) body obnovy nastavení ----------
create table if not exists public.config_snap(id bigserial primary key, at timestamptz not null default now(), who text, kind text not null default 'auto',
  why text, data jsonb not null, h text not null);
create index if not exists config_snap_at on public.config_snap(at desc);
alter table public.config_snap enable row level security;
revoke all on public.config_snap from anon, authenticated;

create or replace function public.config_now() returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
   'kalk',coalesce((select jsonb_object_agg(id,data) from kalk_store where path='pricelist' and id<>'log'),'{}'::jsonb),
   'set',coalesce((select jsonb_object_agg(key,value) from settings),'{}'::jsonb),
   'ai',coalesce((select jsonb_object_agg(key,value) from ai_state where key=any(config_keys())),'{}'::jsonb),
   'odb',coalesce((select jsonb_object_agg(id,jsonb_build_object('name',name,'coms',to_jsonb(coms),'sites',sites,'float_burza',float_burza,'float_coms',to_jsonb(float_coms),'model',model,
       'note',note,'active',active,'parita',parita,'basis',basis,'price_url',price_url)) from sell_buyers),'{}'::jsonb),
   'staff',coalesce((select jsonb_object_agg(lower(email),jsonb_build_object('name',name,'perms',perms,'price_adj',price_adj)) from staff),'{}'::jsonb),
   'ceny',coalesce((select jsonb_object_agg(com,price) from prices),'{}'::jsonb)) $$;
revoke all on function public.config_now() from public, anon, authenticated;

create or replace function public.config_snap_take(p_why text default null, p_kind text default 'rucne') returns jsonb
language plpgsql security definer set search_path=public as $$
declare d jsonb; v_h text; v_last text; v_id bigint; em text:=lower(coalesce(auth.jwt()->>'email',''));
begin
  if em<>'' and not price_main() then raise exception 'Iba Martin.'; end if;
  d:=config_now(); v_h:=md5((d-'ceny')::text);
  select h into v_last from config_snap order by id desc limit 1;
  if p_kind='auto' and v_last=v_h then return jsonb_build_object('ok',true,'same',true); end if;
  insert into config_snap(who,kind,why,data,h) values(coalesce(nullif(em,''),'systém'),coalesce(p_kind,'rucne'),left(p_why,200),d,v_h) returning id into v_id;
  if p_kind='auto' then
    delete from config_snap where kind='auto' and at<now()-interval '90 days'
      and id not in (select min(id) from config_snap where kind='auto' group by date_trunc('month',at));
  end if;
  return jsonb_build_object('ok',true,'id',v_id);
end $$;
revoke all on function public.config_snap_take(text,text) from public, anon;
grant execute on function public.config_snap_take(text,text) to authenticated;

create or replace function public.config_name(g text, k text) returns text language sql immutable as $$
  select case g when 'kalk' then case k when 'adj' then '± úprava od modelu' when 'konk' then 'Konkurenčné ceny' when 'auto' then 'Automatický cenník'
      when 'vsk' then 'Výkup VSK' when 'sellcap' then 'Strop nákupu (marža)' else 'Cenník: '||k end
    when 'set' then case k when 'contact' then 'Kontakt v cenníku' when 'prices_fwd' then 'Ceny na neskorší odber' when 'pricelist' then 'Platnosť cenníka'
      when 'price_bonus' then 'Bonusy k cenám' else 'Nastavenie: '||k end
    when 'ai' then case k when 'price_auto_raise' then 'Automatické zvýšenie cien' when 'push_filter' then 'Upozornenia do mobilu'
      when 'push_cfg' then 'Push centrum' when 'deal_watch_cfg' then 'Stráženie nákupov' when 'region_watch_cfg' then 'Kontrola trhu'
      when 'profit_cfg' then 'Nastavenie zisku' when 'trader_cfg' then 'Portál obchodníka' when 'deal_sign_cc' then 'Kópia zmlúv e-mailom'
      when 'price_alert' then 'Upozornenie na pokles ceny' when 'team_ai' then 'Obchodné návrhy AI' when 'mail_off' then 'Odosielanie e-mailov (vypnuté – neobnovuje sa)'
      else 'Nastavenie: '||k end
    when 'odb' then 'Odberateľ – model' when 'staff' then 'Prístupy: ' else g||':'||k end $$;

create or replace function public.config_snap_list() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'at',at,'who',who,'kind',kind,'why',why,'kb',round(length(data::text)/1024.0)) order by id desc)
    from (select * from config_snap order by id desc limit 150) z),'[]'::jsonb);
end $$;

create or replace function public.config_snap_diff(p_id bigint) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s jsonb; c jsonb:=config_now(); g text; k text; it jsonb:='[]'::jsonb; same int:=0; a jsonb; b jsonb; nm text;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select data into s from config_snap where id=p_id; if s is null then raise exception 'Bod obnovy neexistuje.'; end if;
  foreach g in array array['kalk','set','ai','odb','staff','ceny'] loop
    for k in select jsonb_object_keys(coalesce(s->g,'{}'::jsonb)) union select jsonb_object_keys(coalesce(c->g,'{}'::jsonb)) loop
      a:=s->g->k; b:=c->g->k;
      if a is not distinct from b then same:=same+1; continue; end if;
      nm:=config_name(g,k);
      if g='odb' then nm:=nm||': '||coalesce(a->>'name',b->>'name',k); elsif g='staff' then nm:=nm||coalesce(a->>'name',b->>'name',k); end if;
      it:=it||jsonb_build_object('g',g,'k',k,'name',nm,'old',left(coalesce(a::text,'—'),600),'new',left(coalesce(b::text,'—'),600),
        'ok',g<>'ceny' and not (g='ai' and k='mail_off') and a is not null,
        'pozn',case when g='ceny' then 'Ceny riadia modely – iba na porovnanie' when g='ai' and k='mail_off' then 'Odosielanie e-mailov mení iba Martin príkazom'
                    when a is null then 'V bode obnovy ešte nebolo' end);
    end loop;
  end loop;
  return jsonb_build_object('id',p_id,'at',(select at from config_snap where id=p_id),'items',it,'same',same);
end $$;

create or replace function public.config_snap_restore(p_id bigint, p_items text[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare s jsonb; x text; g text; k text; v jsonb; n int:=0; sk jsonb:='[]'::jsonb; pre jsonb;
begin
  if not price_main() then raise exception 'Obnovuje iba Martin.'; end if;
  select data into s from config_snap where id=p_id; if s is null then raise exception 'Bod obnovy neexistuje.'; end if;
  if coalesce(array_length(p_items,1),0)=0 then raise exception 'Vyber, čo obnoviť.'; end if;
  pre:=config_snap_take('Pred obnovou bodu #'||p_id,'pred_obnovou');
  foreach x in array p_items loop
    g:=split_part(x,':',1); k:=substr(x,length(g)+2); v:=s->g->k;
    if v is null or g='ceny' or (g='ai' and k='mail_off') then sk:=sk||to_jsonb(x); continue; end if;
    if g='kalk' then
      update kalk_store set data=v where path='pricelist' and id=k;
      if not found then insert into kalk_store(path,id,data) values('pricelist',k,v); end if;
    elsif g='set' then
      insert into settings(key,value) values(k,v) on conflict(key) do update set value=excluded.value;
    elsif g='ai' then
      if not (k=any(config_keys())) then sk:=sk||to_jsonb(x); continue; end if;
      insert into ai_state(key,value,updated_at) values(k,v,now()) on conflict(key) do update set value=excluded.value, updated_at=now();
    elsif g='odb' then
      update sell_buyers set coms=case when jsonb_typeof(v->'coms')='array' then (select array_agg(e) from jsonb_array_elements_text(v->'coms') e) else coms end, sites=v->'sites',
        float_burza=(v->>'float_burza')::boolean, float_coms=case when jsonb_typeof(v->'float_coms')='array' then (select array_agg(e) from jsonb_array_elements_text(v->'float_coms') e) when v ? 'float_coms' then null else float_coms end, model=v->>'model', note=v->>'note', active=coalesce((v->>'active')::boolean,active),
        parita=v->>'parita', basis=v->'basis', price_url=v->>'price_url' where id=k;
      if not found then sk:=sk||to_jsonb(x); continue; end if;
    elsif g='staff' then
      update staff set perms=v->'perms', price_adj=(v->>'price_adj')::numeric where lower(email)=k;
      if not found then sk:=sk||to_jsonb(x); continue; end if;
    else sk:=sk||to_jsonb(x); continue;
    end if;
    n:=n+1;
  end loop;
  return jsonb_build_object('ok',true,'n',n,'skip',sk,'pre',pre->'id');
end $$;
grant execute on function public.config_snap_list(), public.config_snap_diff(bigint), public.config_snap_restore(bigint,text[]) to authenticated;

-- ---------- 7) rizikové skóre farmárov ----------
create or replace function public.farmer_risk(p_farmer uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  return coalesce((select jsonb_agg(r order by (r->>'score')::int desc, r->>'name') from (
    with f as (select id,name,ico,iban,gdpr_at,active from farmers where (p_farmer is null or id=p_farmer) and not is_test_name(name)),
    d as (select x.farmer_id, x.tons, coalesce(x.delivered_t,0) dt, x.status, ernte_term_last(x.term) tl, x.no
            from deals x join f on f.id=x.farmer_id
           where not coalesce(x.archived,false) and x.status not in ('zruseny','navrh') and coalesce(x.tons,0)>0
             and coalesce(x.signed_at,x.created_at)>now()-interval '18 months'),
    dz as (select farmer_id, count(*) n, sum(tons) t, sum(dt) dtt,
             count(*) filter (where status='odvezeny' and dt<tons*0.95) pod,
             sum(greatest(tons*0.95-dt,0)) filter (where status='odvezeny') pod_t,
             count(*) filter (where tl<current_date-7 and status in ('podpisany','odvoz') and dt<tons*0.95) mes,
             count(*) filter (where dt>tons*1.05) nad,
             string_agg(no,', ') filter (where (status='odvezeny' or (tl<current_date-7 and status in ('podpisany','odvoz'))) and dt<tons*0.95) pod_no
           from d group by farmer_id),
    l as (select x.farmer_id, count(*) n, sum(x.net_kg)/1000 t,
             sum(greatest(coalesce(x.moisture_pct,0)-ernte_vnorm(x.com),0)*x.net_kg) filter (where x.com<>'kukurica')/nullif(sum(x.net_kg) filter (where x.moisture_pct is not null and x.com<>'kukurica'),0) vl,
             sum(greatest(coalesce(x.impurity_pct,0)-2,0)*x.net_kg)/nullif(sum(x.net_kg) filter (where x.impurity_pct is not null),0) ne
           from deliveries x join f on f.id=x.farmer_id where x.day>current_date-365 and coalesce(x.net_kg,0)>0 group by x.farmer_id),
    rk as (select x.farmer_id, count(*) n, count(*) filter (where c.ok) ok, count(*) filter (where not coalesce(c.ok,false)) nok
           from buyer_claims c join deliveries x on x.ticket=c.ticket join f on f.id=x.farmer_id where c.at>now()-interval '365 days' group by x.farmer_id),
    rp as (select x.farmer_id, count(*) n, sum(coalesce(x.undelivered_t,0)) t from deal_replace x join f on f.id=x.farmer_id
           where x.at>now()-interval '365 days' group by x.farmer_id),
    s as (select f.*, dz.n zn, dz.t zt, dz.dtt, coalesce(dz.pod,0) pod, coalesce(dz.pod_t,0) pod_t, coalesce(dz.mes,0) mes, coalesce(dz.nad,0) nad, dz.pod_no,
            l.n ln, l.t lt, coalesce(l.vl,0) vl, coalesce(l.ne,0) ne, coalesce(rk.n,0) rkn, coalesce(rk.ok,0) rkok, coalesce(rk.nok,0) rknok,
            coalesce(rp.n,0) rpn, coalesce(rp.t,0) rpt
          from f left join dz on dz.farmer_id=f.id left join l on l.farmer_id=f.id left join rk on rk.farmer_id=f.id left join rp on rp.farmer_id=f.id
          where dz.n is not null or l.n is not null),
    p as (select s.*,
            least(35, round(case when coalesce(zt,0)>0 then pod_t/zt*150 else 0 end) + pod*5)::int p_pln,
            least(16, mes*8)::int p_mes,
            least(6, nad*3)::int p_nad,
            least(20, round(vl*3+ne*3))::int p_kv,
            least(8, rknok*2)::int p_rk,
            least(15, rpn*8)::int p_rp,
            ((case when coalesce(ico,'')='' then 4 else 0 end)+(case when coalesce(iban,'')='' then 2 else 0 end)+(case when gdpr_at is null and active then 2 else 0 end))::int p_ud
          from s)
    select jsonb_build_object('id',id,'name',name,
      'score',least(100,p_pln+p_mes+p_nad+p_kv+p_rk+p_rp+p_ud),
      'lvl',case when least(100,p_pln+p_mes+p_nad+p_kv+p_rk+p_rp+p_ud)>=50 then 'vysoke' when least(100,p_pln+p_mes+p_nad+p_kv+p_rk+p_rp+p_ud)>=25 then 'stredne' else 'nizke' end,
      'parts',jsonb_build_object('plnenie',p_pln,'meskanie',p_mes,'nadodavky',p_nad,'kvalita',p_kv,'sporne',p_rk,'nahrady',p_rp,'udaje',p_ud),
      'zml',jsonb_build_object('n',coalesce(zn,0),'t',round(coalesce(zt,0),1),'dod',round(coalesce(dtt,0),1),'pod',pod,'pod_t',round(pod_t,1),'pod_no',pod_no,'mes',mes,'nad',nad),
      'kval',jsonb_build_object('n',coalesce(ln,0),'t',round(coalesce(lt,0),1),'vl',round(vl,2),'ne',round(ne,2)),
      'rekl',jsonb_build_object('n',rkn,'uznane',rkok,'neuznane',rknok),
      'nahr',jsonb_build_object('n',rpn,'t',round(rpt,1)),
      'why',to_jsonb(array_remove(array[
        case when p_pln>0 then 'uzavreté zmluvy s nedodávkou: '||pod||'× (chýba '||round(pod_t,1)||' t nad toleranciu 5 %)' end,
        case when p_mes>0 then 'po termíne a nedodané: '||mes||'× zmluva' end,
        case when p_nad>0 then 'nadodávky nad 5 %: '||nad||'×' end,
        case when p_kv>0 then 'kvalita: '||concat_ws(', ',case when vl>0 then 'vlhkosť nad normu priemerne '||round(vl,1)||' % (bez kukurice)' end,case when ne>0 then 'nečistoty nad 2 % priemerne '||round(ne,1)||' %' end) end,
        case when p_rk>0 then 'sporné lístky (reklamácia neuznaná): '||rknok end,
        case when p_rp>0 then 'náhradný nákup za nedodané: '||rpn||'× ('||round(rpt,1)||' t)' end,
        case when p_ud>0 then 'chýba '||concat_ws(', ',case when coalesce(ico,'')='' then 'IČO' end,case when coalesce(iban,'')='' then 'IBAN' end,case when gdpr_at is null and active then 'súhlas GDPR' end) end],null))) r
    from p) z),'[]'::jsonb);
end $$;
grant execute on function public.farmer_risk(uuid) to authenticated;

-- ---------- 8) žiadosť o zmazanie účtu ----------
create table if not exists public.account_del_req(id bigserial primary key, at timestamptz not null default now(), email text not null, kind text, ref_id text, name text,
  reason text, ip text, ua text, status text not null default 'nova', done_at timestamptz, done_by text, note text, result jsonb);
alter table public.account_del_req enable row level security;
revoke all on public.account_del_req from anon, authenticated;

create or replace function public.account_delete_request(p_reason text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare em text:=lower(coalesce(auth.jwt()->>'email','')); k text; rid text; nm text; c jsonb:=audit_ctx(); x account_del_req;
begin
  if em='' then raise exception 'Najprv sa prihláste.'; end if;
  if em=any(push_main_emails()) or exists(select 1 from staff where lower(email)=em and role='owner') then
    raise exception 'Majiteľský účet sa v aplikácii nezmaže – kontaktuj správcu.'; end if;
  select * into x from account_del_req where email=em and status='nova' order by id desc limit 1;
  if x.id is not null then return jsonb_build_object('ok',true,'at',x.at,'uz',true); end if;
  select 'tim', lower(email), name into k, rid, nm from staff where lower(email)=em limit 1;
  if k is null then begin rid:=my_farmer_id()::text; exception when others then rid:=null; end;
    if rid is not null then k:='farmar'; select name into nm from farmers where id::text=rid; end if; end if;
  insert into account_del_req(email,kind,ref_id,name,reason,ip,ua) values(em,coalesce(k,'iny'),rid,left(coalesce(nm,em),120),left(p_reason,500),c->>'ip',c->>'ua') returning * into x;
  begin
    perform push_send('app','zmazanie',x.id::text,'🗑️ Žiadosť o zmazanie účtu',coalesce(nm,em)||' ('||em||') žiada zmazať účet a údaje. Vybaviť do 30 dní: Tím → 🗑️ Žiadosti o zmazanie.',
      4,'https://ernte-trade.github.io/ernte-/farmar/#tab/team','owner',array['wastebasket'],interval '1 minute',push_main_emails());
  exception when others then null; end;
  return jsonb_build_object('ok',true,'at',x.at);
end $$;

create or replace function public.account_delete_status() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((select jsonb_build_object('id',id,'at',at,'status',status,'done_at',done_at) from account_del_req
    where email=lower(coalesce(auth.jwt()->>'email','')) order by id desc limit 1),'{}'::jsonb) $$;

create or replace function public.account_delete_list() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'at',r.at,'email',r.email,'kind',r.kind,'name',r.name,'reason',r.reason,'ip',r.ip,'status',r.status,
     'done_at',r.done_at,'done_by',r.done_by,'note',r.note,'result',r.result,
     'zml',(select count(*) from deals where r.kind='farmar' and farmer_id::text=r.ref_id),
     'lis',(select count(*) from deliveries where r.kind='farmar' and farmer_id::text=r.ref_id)) order by (r.status='nova') desc, r.id desc)
   from (select * from account_del_req order by id desc limit 100) r),'[]'::jsonb);
end $$;

create or replace function public.account_delete_resolve(p_id bigint, p_act text, p_note text default null) returns jsonb
language plpgsql security definer set search_path=public, auth as $$
declare x account_del_req; res jsonb:='{}'::jsonb; em text:=lower(coalesce(auth.jwt()->>'email','')); n int; has_rec boolean:=false;
begin
  if not price_main() then raise exception 'Vybavuje iba Martin.'; end if;
  select * into x from account_del_req where id=p_id for update;
  if x.id is null then raise exception 'Žiadosť neexistuje.'; end if;
  if x.status<>'nova' then raise exception 'Žiadosť je už vybavená.'; end if;
  if p_act='zamietnut' then
    update account_del_req set status='zamietnuta', done_at=now(), done_by=em, note=left(p_note,500) where id=p_id;
    return jsonb_build_object('ok',true,'status','zamietnuta');
  end if;
  if p_act<>'vykonat' then raise exception 'Neznámy pokyn.'; end if;
  if x.email=any(push_main_emails()) or exists(select 1 from staff where lower(email)=x.email and role='owner') then raise exception 'Majiteľský účet sa nemaže.'; end if;
  delete from push_subs where lower(email)=x.email; get diagnostics n=row_count; res:=res||jsonb_build_object('odbery_upozorneni',n);
  if x.kind='tim' then
    delete from staff where lower(email)=x.email; get diagnostics n=row_count; res:=res||jsonb_build_object('tim',n);
  elsif x.kind='farmar' and x.ref_id is not null then
    has_rec:=exists(select 1 from deals where farmer_id::text=x.ref_id) or exists(select 1 from deliveries where farmer_id::text=x.ref_id)
          or exists(select 1 from requests where farmer_id::text=x.ref_id);
    update farmers set active=false, login=null, notify_topic=null, must_change=false, pin_at=null where id::text=x.ref_id;
    if not has_rec then
      update farmers set name='Zmazaný používateľ', email=null, phone=null, addr=null, iban=null, note=null, lat=null, lon=null where id::text=x.ref_id;
      res:=res||jsonb_build_object('farmar','prístup zrušený, osobné údaje zmazané');
    else
      res:=res||jsonb_build_object('farmar','prístup zrušený; zmluvy, lístky a zúčtovania ostávajú (zákonná archivácia 10 rokov)');
    end if;
  end if;
  begin
    delete from auth.users where lower(email)=x.email; get diagnostics n=row_count; res:=res||jsonb_build_object('prihlasenie',case when n>0 then 'zmazané' else 'nebolo' end);
  exception when others then
    begin update auth.users set banned_until='2999-01-01' where lower(email)=x.email; res:=res||jsonb_build_object('prihlasenie','zablokované');
    exception when others then res:=res||jsonb_build_object('prihlasenie','nepodarilo sa: '||left(sqlerrm,120)); end;
  end;
  update account_del_req set status='vykonana', done_at=now(), done_by=em, note=left(p_note,500), result=res where id=p_id;
  return jsonb_build_object('ok',true,'status','vykonana','result',res);
end $$;
grant execute on function public.account_delete_request(text), public.account_delete_status(), public.account_delete_list(), public.account_delete_resolve(bigint,text,text) to authenticated;
revoke all on function public.account_delete_request(text) from anon;

-- ---------- 9) plánovač ----------
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('audit-pecat','audit-kotva','nastavenia-zaloha');
  perform cron.schedule('audit-pecat','* * * * *','select public.audit_seal()');
  perform cron.schedule('audit-kotva','55 22 * * *','select public.audit_anchor()');
  perform cron.schedule('nastavenia-zaloha','17 1 * * *','select public.config_snap_take(''Denná záloha'',''auto'')');
end $$;
select public.config_snap_take('Prvý bod obnovy (zapnutie)','auto');
