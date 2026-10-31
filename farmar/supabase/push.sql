-- ===== 🔔 PUSH CENTRUM: jedno miesto pre všetky upozornenia do mobilu (ntfy téma + Web Push aplikácie) =====
-- Každé odoslanie sa zapíše do push_log (čas, zdroj, typ, objekt, kanál, HTTP kód, chyba).
-- Deduplikácia a tiché hodiny podľa nastavenia (ai_state.push_cfg), súhrny: hodinový (push-hodina) a ranný o 5:00.
-- Odosiela iba databáza (security definer); aplikácia vidí iba majiteľ (RLS + kontrola is_owner()).
create extension if not exists pgcrypto;

-- ---------- nastavenie ----------
insert into ai_state(key,value) values('push_cfg', jsonb_build_object(
  'ntfy', true,
  'topic_owner', coalesce((select value->>'topic' from ai_state where key='owner_push'), 'ernte-majitel-'||encode(extensions.gen_random_bytes(10),'hex')),
  'topic_cal', 'ernte-kalendar-'||encode(extensions.gen_random_bytes(10),'hex'),
  'anon', 'sb_publishable_AOel6p4QZFP_-t4sSoziAA_ESUooutQ',
  'fleet', jsonb_build_object('on',true,'high',true,'mid',true,'low',true,'quiet',true,'q_from',22,'q_to',5),
  'app', jsonb_build_object('on',true,'login',true,'req',true,'deal',true,'burza',true,'act',true,'cennik_exp',true,'aitask',true,'quiet',true,'q_from',22,'q_to',6,'watch','[]'::jsonb),
  'cal', jsonb_build_object('on',true)
)) on conflict (key) do nothing;
-- verejný (publishable) kľúč z farmar/config.js – potrebný pre tlačidlo „Beriem na vedomie“ v ntfy
update ai_state set value=value||jsonb_build_object('anon','sb_publishable_AOel6p4QZFP_-t4sSoziAA_ESUooutQ') where key='push_cfg' and coalesce(value->>'anon','')='';

create or replace function public.push_cfg() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((select value from ai_state where key='push_cfg'),'{}'::jsonb) $$;
revoke all on function public.push_cfg() from public, anon, authenticated;

-- číslo s medzerami po tisícoch (61 440)
create or replace function public.push_num(x numeric) returns text language sql immutable as $$
  select case when x is null then '–' else regexp_replace(round(x)::bigint::text,'(\d)(?=(\d{3})+$)','\1 ','g') end $$;

-- miestny čas (Bratislava)
create or replace function public.push_hour_local(t timestamptz default now()) returns int language sql stable as $$
  select extract(hour from t at time zone 'Europe/Bratislava')::int $$;
create or replace function public.push_quiet(sec text, t timestamptz default now()) returns boolean language sql stable security definer set search_path=public as $$
  with c as (select push_cfg()->sec q)
  select coalesce((q->>'quiet')::boolean,true) and case
    when coalesce((q->>'q_from')::int,22) > coalesce((q->>'q_to')::int,5) then push_hour_local(t)>=coalesce((q->>'q_from')::int,22) or push_hour_local(t)<coalesce((q->>'q_to')::int,5)
    else push_hour_local(t)>=coalesce((q->>'q_from')::int,22) and push_hour_local(t)<coalesce((q->>'q_to')::int,5) end from c $$;
revoke all on function public.push_quiet(text,timestamptz) from public, anon, authenticated;

-- ---------- denník odoslaní ----------
create table if not exists push_log(
  id bigserial primary key, at timestamptz not null default now(),
  src text not null, kind text, obj text, lvl text, prio int, title text, body text,
  channel text not null, req_id bigint, job_id uuid, http int, err text, n int not null default 1);
create index if not exists push_log_at on push_log(at desc);
create index if not exists push_log_dd on push_log(src, kind, obj, at desc);
create index if not exists push_log_req on push_log(req_id) where http is null;
alter table push_log enable row level security;
revoke all on push_log from anon;
drop policy if exists push_log_own on push_log; create policy push_log_own on push_log for select using ((select is_owner()));

-- čakajúce správy: hodinový súhrn, ranný súhrn, zlúčenie opakovaných zmien (10 min)
create table if not exists push_queue(
  id bigserial primary key, at timestamptz not null default now(), src text not null, kind text, obj text, lvl text, prio int,
  title text, body text, url text, topic text, target text not null check (target in ('hour','morning','merge')),
  n int not null default 1, due_at timestamptz, sent_at timestamptz);
create index if not exists push_queue_open on push_queue(target, at) where sent_at is null;
alter table push_queue enable row level security;
revoke all on push_queue from anon;
drop policy if exists push_queue_own on push_queue; create policy push_queue_own on push_queue for select using ((select is_owner()));

-- ---------- kanály ----------
-- ntfy: JSON na https://ntfy.sh/ (téma v tele). Vráti ID požiadavky (HTTP kód sa doplní do push_log neskôr).
create or replace function public.push_ntfy(p_topic text, p_title text, p_msg text, p_prio int default 3, p_tags text[] default null, p_click text default null, p_actions jsonb default null)
returns bigint language plpgsql security definer set search_path=public, extensions, net as $$
declare b jsonb;
begin
  if coalesce(p_topic,'')='' then return null; end if;
  b:=jsonb_build_object('topic',p_topic,'title',left(coalesce(p_title,'ERNTE'),120),'message',left(coalesce(p_msg,''),900),'priority',greatest(1,least(5,coalesce(p_prio,3))));
  if p_tags is not null then b:=b||jsonb_build_object('tags',to_jsonb(p_tags)); end if;
  if p_click is not null then b:=b||jsonb_build_object('click',p_click); end if;
  if p_actions is not null and jsonb_array_length(p_actions)>0 then b:=b||jsonb_build_object('actions',p_actions); end if;
  return net.http_post(url:='https://ntfy.sh/', body:=b, headers:=jsonb_build_object('Content-Type','application/json'));
end $$;
revoke all on function public.push_ntfy(text,text,text,int,text[],text,jsonb) from public, anon, authenticated;

-- Web Push aplikácie (iba zariadenia majiteľov v push_subs): úloha push_jobs → komentár v technickom vlákne #51 → GitHub (push.yml)
create or replace function public.push_web(p_title text, p_msg text, p_prio int, p_tag text, p_url text, p_to text[] default null, p_extra jsonb default null, out job uuid, out req bigint)
language plpgsql security definer set search_path=public, extensions, net as $$
declare tk text:=regexp_replace(coalesce(ai_secret('github_token'),''),'\s','','g'); t text[];
begin
  t:=case when p_to is null then null else (select array_agg(distinct lower(x)) from unnest(p_to) x where coalesce(x,'')<>'') end;
  if tk='' then return; end if;
  if not exists(select 1 from push_subs s where coalesce(s.email,'')<>'' and s.email<>'test' and (t is null or lower(s.email)=any(t))) then return; end if;
  insert into push_jobs(payload) values(jsonb_build_object('title',left(coalesce(p_title,''),120),'body',left(coalesce(p_msg,''),400),'prio',coalesce(p_prio,4),
    'tag',coalesce(p_tag,'ernte'),'url',coalesce(p_url,'https://ernte-trade.github.io/ernte-/farmar/'))
    ||case when t is not null then jsonb_build_object('to',to_jsonb(t)) else '{}'::jsonb end||coalesce(p_extra,'{}'::jsonb)) returning id into job;
  req:=net.http_post(url:='https://api.github.com/repos/ernte-trade/ernte-/issues/51/comments',
    headers:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28','Content-Type','application/json'),
    body:=jsonb_build_object('body','ernte-push '||job));
end $$;
revoke all on function public.push_web(text,text,int,text,text,text[],jsonb) from public, anon, authenticated;

-- príjemcovia Web Push: majitelia (aj Jana) / iba Martin (kalendár)
create or replace function public.push_main_emails() returns text[] language sql immutable as $$ select array['ernte@ernte.sk','report.valko@gmail.com'] $$;

-- ---------- odoslanie jednej správy (deduplikácia, zápis do push_log) ----------
-- p_topic: 'fleet' = téma flotily (fleet_cfg.notify), 'owner' = súkromná téma majiteľa, 'cal' = kalendár Martina, alebo priamo názov témy
-- p_dedup: rovnaký src+kind+obj v tomto čase sa nepošle znova (vráti 'dup'); p_merge: opakovanie sa zlúči do jednej správy „… 5×“
create or replace function public.push_send(p_src text, p_kind text, p_obj text, p_title text, p_msg text, p_prio int, p_url text default null,
  p_topic text default 'owner', p_tags text[] default null, p_dedup interval default null, p_web_to text[] default null, p_web boolean default true,
  p_extra jsonb default null, p_actions jsonb default null, p_click text default null, p_lvl text default null, p_merge boolean default false)
returns text language plpgsql security definer set search_path=public as $$
declare c jsonb:=push_cfg(); tp text; rq bigint; w record; last push_log; v_url text:=coalesce(p_url,'https://ernte-trade.github.io/ernte-/farmar/');
begin
  if p_dedup is not null then
    select * into last from push_log where src=p_src and kind is not distinct from p_kind and obj is not distinct from p_obj and at>now()-p_dedup
      and channel in ('ntfy','web','queue','none') order by at desc limit 1;
    if last.id is not null then
      update push_log set n=n+1 where id=last.id;
      if p_merge then
        update push_queue set n=n+1, body=left(p_msg||case when push_queue.title is distinct from p_title then E'\n↳ '||push_queue.title else '' end||coalesce(E'\n'||nullif(split_part(push_queue.body,E'\n↳ ',2),''),''),700), title=p_title, url=v_url where target='merge' and sent_at is null and src=p_src and kind is not distinct from p_kind and obj is not distinct from p_obj;
        if not found then
          insert into push_queue(src,kind,obj,lvl,prio,title,body,url,topic,target,n,due_at) values(p_src,p_kind,p_obj,p_lvl,p_prio,p_title,p_msg,v_url,p_topic,'merge',1,last.at+p_dedup);
        end if;
      end if;
      return 'dup';
    end if;
  end if;
  tp:=case p_topic when 'fleet' then (select value->>'topic' from fleet_cfg where key='notify') when 'owner' then c->>'topic_owner' when 'cal' then c->>'topic_cal' else p_topic end;
  if coalesce((c->>'ntfy')::boolean,true) and coalesce(tp,'')<>'' then
    begin
      rq:=push_ntfy(tp,p_title,p_msg,p_prio,p_tags,coalesce(p_click,v_url),p_actions);
      insert into push_log(src,kind,obj,lvl,prio,title,body,channel,req_id) values(p_src,p_kind,p_obj,p_lvl,p_prio,p_title,p_msg,'ntfy',rq);
    exception when others then
      insert into push_log(src,kind,obj,lvl,prio,title,body,channel,err) values(p_src,p_kind,p_obj,p_lvl,p_prio,p_title,p_msg,'ntfy',left(SQLERRM,300));
    end;
  end if;
  if p_web then
    begin
      select * into w from push_web(p_title,p_msg,p_prio,coalesce(p_tags[1],p_src),v_url,p_web_to,p_extra);
      if w.job is not null then
        insert into push_log(src,kind,obj,lvl,prio,title,body,channel,req_id,job_id) values(p_src,p_kind,p_obj,p_lvl,p_prio,p_title,p_msg,'web',w.req,w.job);
      end if;
    exception when others then
      insert into push_log(src,kind,obj,lvl,prio,title,body,channel,err) values(p_src,p_kind,p_obj,p_lvl,p_prio,p_title,p_msg,'web',left(SQLERRM,300));
    end;
  end if;
  if rq is null and w.job is null then
    insert into push_log(src,kind,obj,lvl,prio,title,body,channel,err) values(p_src,p_kind,p_obj,p_lvl,p_prio,p_title,p_msg,'none',
      case when coalesce(tp,'')='' then 'téma ntfy nie je nastavená' else 'ntfy vypnuté' end||' · žiadne zariadenie s upozorneniami aplikácie');
  end if;
  return 'ok';
exception when others then
  begin insert into push_log(src,kind,obj,prio,title,channel,err) values(p_src,p_kind,p_obj,p_prio,p_title,'none',left(SQLERRM,300)); exception when others then null; end;
  return 'err';
end $$;
revoke all on function public.push_send(text,text,text,text,text,int,text,text,text[],interval,text[],boolean,jsonb,jsonb,text,text,boolean) from public, anon, authenticated;

-- do súhrnu (hodinový / ranný)
create or replace function public.push_enqueue(p_src text, p_kind text, p_obj text, p_lvl text, p_prio int, p_title text, p_msg text, p_url text, p_topic text, p_target text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into push_queue(src,kind,obj,lvl,prio,title,body,url,topic,target) values(p_src,p_kind,p_obj,p_lvl,p_prio,p_title,p_msg,p_url,p_topic,p_target);
  insert into push_log(src,kind,obj,lvl,prio,title,body,channel,err) values(p_src,p_kind,p_obj,p_lvl,p_prio,p_title,p_msg,'queue',case p_target when 'hour' then 'do hodinového súhrnu' else 'do ranného súhrnu 5:00' end);
end $$;
revoke all on function public.push_enqueue(text,text,text,text,int,text,text,text,text,text) from public, anon, authenticated;

-- HTTP kódy ntfy / GitHub z odpovedí pg_net + výsledok doručenia Web Push
create or replace function public.push_http_sync() returns int language plpgsql security definer set search_path=public, net as $$
declare n int:=0;
begin
  begin
    update push_log l set http=r.status_code,
      err=case when r.error_msg is not null then left(r.error_msg,300) when coalesce(r.timed_out,false) then 'časový limit' when r.status_code>=300 then left(regexp_replace(coalesce(r.content,''),'\s+',' ','g'),300) else l.err end
      from net._http_response r where l.http is null and l.req_id is not null and r.id=l.req_id and l.at>now()-interval '2 days';
    get diagnostics n=row_count;
    update push_log l set http=0, err=coalesce(l.err,'bez odpovede servera') where l.http is null and l.req_id is not null and l.at<now()-interval '30 minutes';
  exception when others then null; end;
  -- Web Push: doručenie z push_jobs (GitHub vyzdvihol a odoslal)
  update push_log l set err=case when j.done_at is null then case when j.taken_at is null and l.at<now()-interval '10 minutes' then 'GitHub úlohu nevyzdvihol' else l.err end
      when coalesce(j.sent,0)>0 then case when j.err is not null then 'doručené '||j.sent||' · '||left(j.err,200) else 'doručené '||j.sent||' zar.' end
      else coalesce('nedoručené: '||left(j.err,250),'nedoručené (žiadne platné zariadenie)') end
    from push_jobs j where l.channel='web' and l.job_id=j.id and l.at>now()-interval '1 day' and (l.err is null or l.err like 'GitHub%');
  return n;
end $$;
revoke all on function public.push_http_sync() from public, anon, authenticated;

-- ---------- súhrny ----------
create or replace function public.push_digest(p_target text) returns int language plpgsql security definer set search_path=public as $$
declare r record; L text; cnt int; k int:=0; ids bigint[]; tp text; pr int; ttl text;
begin
  for r in select src, coalesce(topic,'owner') topic from push_queue where sent_at is null and (target=p_target or (p_target='morning' and target='hour'))
             group by src, coalesce(topic,'owner') loop
    select array_agg(id order by at), count(*), max(prio) into ids, cnt, pr from push_queue
     where sent_at is null and (target=p_target or (p_target='morning' and target='hour')) and src=r.src and coalesce(topic,'owner')=r.topic;
    select string_agg('• '||title||case when coalesce(body,'')<>'' then ' – '||split_part(body,E'\n',1) else '' end||case when n2>1 then ' ('||n2||'×)' else '' end, E'\n' order by at)
      into L from (select q0.title, q0.body, q0.at, q0.n n2 from push_queue q0 where q0.id=any(ids) order by q0.at limit 25) q;
    if cnt>25 then L:=L||E'\n… a ďalších '||(cnt-25); end if;
    ttl:=case when p_target='morning' then '🌅 Ranný súhrn' else '🕐 Hodinový súhrn' end||' · '||case r.src when 'fleet' then 'Flotila' when 'app' then 'aplikácia' else r.src end||' · '||cnt||' '
      ||case when cnt=1 then 'upozornenie' when cnt<5 then 'upozornenia' else 'upozornení' end;
    perform push_send(r.src,'digest_'||p_target,to_char(now(),'YYYYMMDDHH24'),ttl,L,case when p_target='morning' then 3 else greatest(3,least(4,coalesce(pr,3))) end,
      case when r.src='fleet' then 'https://ernte-trade.github.io/ernte-/farmar/#flotila/alarm' else null end, r.topic, array['clipboard'], null, null, true, null, null, null, 'digest');
    update push_queue set sent_at=now() where id=any(ids);
    k:=k+cnt;
  end loop;
  delete from push_queue where sent_at<now()-interval '30 days';
  return k;
end $$;
revoke all on function public.push_digest(text) from public, anon, authenticated;

-- ranný súhrn: raz denne od 5:00 miestneho času (volá ho push_tick aj ai-rano – druhé volanie nič nepošle)
create or replace function public.push_morning() returns int language plpgsql security definer set search_path=public as $$
declare d text:=to_char(now() at time zone 'Europe/Bratislava','YYYY-MM-DD');
begin
  if push_hour_local()<5 then return 0; end if;
  if coalesce((select value->>'d' from ai_state where key='push_morning'),'')=d then return 0; end if;
  insert into ai_state(key,value) values('push_morning',jsonb_build_object('d',d)) on conflict(key) do update set value=excluded.value, updated_at=now();
  return push_digest('morning');
end $$;
revoke all on function public.push_morning() from public, anon, authenticated;

-- hodinový súhrn (cron push-hodina 5 * * * *): v tichých hodinách flotily (22–5) nič – ostane na ranný súhrn
create or replace function public.push_hour() returns int language plpgsql security definer set search_path=public as $$
begin
  if push_quiet('fleet') then return 0; end if;
  return push_digest('hour');
end $$;
revoke all on function public.push_hour() from public, anon, authenticated;

-- zlúčené opakovania (10 min): pošle jednu správu „… (uložené 5×)“
create or replace function public.push_merge_flush() returns int language plpgsql security definer set search_path=public as $$
declare r push_queue; k int:=0;
begin
  for r in select * from push_queue where target='merge' and sent_at is null and due_at<=now() order by at loop
    update push_queue set sent_at=now() where id=r.id;
    perform push_send(r.src,r.kind,r.obj,r.title||case when r.kind='burst' then ' · '||(r.n+1)||' zmien' else ' · uložené '||(r.n+1)||'×' end,r.body,r.prio,r.url,coalesce(r.topic,'owner'),null,null,null,coalesce(r.prio,3)>=4,null,null,null,r.lvl,false);
    k:=k+1;
  end loop;
  return k;
end $$;
revoke all on function public.push_merge_flush() from public, anon, authenticated;

-- ---------- aplikácia: nastavenie, test, diagnostika (iba majiteľ) ----------
create or replace function public.push_settings(p jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; k text;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  c:=push_cfg();
  if p is not null then
    if p ? 'ntfy' then c:=c||jsonb_build_object('ntfy',(p->>'ntfy')::boolean); end if;
    foreach k in array array['fleet','app','cal'] loop
      if jsonb_typeof(p->k)='object' then c:=jsonb_set(c,array[k],coalesce(c->k,'{}'::jsonb)||(p->k)); end if;
    end loop;
    update ai_state set value=c, updated_at=now() where key='push_cfg';
  end if;
  return jsonb_build_object('ntfy',coalesce((c->>'ntfy')::boolean,true),'fleet',c->'fleet','app',c->'app','cal',case when main_ok() then c->'cal' end,
    'topic_fleet',(select value->>'topic' from fleet_cfg where key='notify'),'topic_owner',c->>'topic_owner','topic_cal',case when main_ok() then c->>'topic_cal' end,
    'subs',(select count(*) from push_subs where coalesce(email,'')<>'' and email<>'test'),
    'people',(select coalesce(jsonb_agg(jsonb_build_object('k',lower(email),'n',name,'r',role) order by name),'[]') from staff where role<>'owner')
      ||(select coalesce(jsonb_agg(jsonb_build_object('k','f:'||id,'n',name,'r','farmár') order by name),'[]') from farmers where coalesce(login,'')<>'' and coalesce(active,true)));
end $$;
revoke all on function public.push_settings(jsonb) from public, anon; grant execute on function public.push_settings(jsonb) to authenticated;

create or replace function public.push_test(p_kind text default 'fleet') returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if p_kind='cal' and not main_ok() then raise exception 'Kalendár iba Martin Vaľko.'; end if;
  perform push_send('test',p_kind,to_char(clock_timestamp(),'HH24MISSMS'),
    case p_kind when 'fleet' then '🔔 ERNTE/VALKO – test upozornenia flotily' when 'cal' then '⏰ ERNTE/VALKO – test zvonenia (stretnutie)' else '🔔 ERNTE/VALKO – test upozornenia' end,
    'Takto prídu upozornenia do mobilu · '||to_char(now() at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
    case p_kind when 'cal' then 5 when 'fleet' then 5 else 4 end, 'https://ernte-trade.github.io/ernte-/farmar/',
    case p_kind when 'fleet' then 'fleet' when 'cal' then 'cal' else 'owner' end, array['bell'], null,
    case when p_kind='cal' then push_main_emails() end);
  return push_diag();
end $$;
revoke all on function public.push_test(text) from public, anon; grant execute on function public.push_test(text) to authenticated;

create or replace function public.push_diag() returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  perform push_http_sync();
  return jsonb_build_object(
    'n24',(select count(*) from push_log where at>now()-interval '24 hours' and channel in ('ntfy','web')),
    'ntfy24',(select count(*) from push_log where at>now()-interval '24 hours' and channel='ntfy'),
    'web24',(select count(*) from push_log where at>now()-interval '24 hours' and channel='web'),
    'q24',(select count(*) from push_log where at>now()-interval '24 hours' and channel='queue'),
    'err24',(select count(*) from push_log where at>now()-interval '24 hours' and (http>=300 or http=0 or (err is not null and channel in ('ntfy','none')) or (channel='web' and err like 'nedoručené%'))),
    'waiting',(select count(*) from push_queue where sent_at is null),
    'last',(select coalesce(jsonb_agg(jsonb_build_object('at',at,'src',src,'kind',kind,'lvl',lvl,'prio',prio,'t',title,'ch',channel,'http',http,'err',err,'n',n) order by at desc),'[]')
      from (select * from push_log where channel<>'none' or err is not null order by at desc limit 20) x),
    'errs',(select coalesce(jsonb_agg(jsonb_build_object('at',at,'t',title,'ch',channel,'http',http,'err',err) order by at desc),'[]')
      from (select * from push_log where at>now()-interval '24 hours' and (http>=300 or http=0 or (err is not null and channel in ('ntfy','none')) or (channel='web' and err like 'nedoručené%')) order by at desc limit 10) y));
end $$;
revoke all on function public.push_diag() from public, anon; grant execute on function public.push_diag() to authenticated;

-- ---------- owner_push (všetky staršie upozornenia majiteľa) ide cez push centrum ----------
create or replace function public.owner_push(p_title text, p_msg text, p_prio int default 4, p_tags text default 'bell') returns void language plpgsql security definer set search_path=public as $$
declare c jsonb;
begin
  select value into c from ai_state where key='owner_push';
  if c is not null and coalesce((c->>'on')::boolean,true)=false then return; end if;
  perform push_send('app','owner',left(md5(coalesce(p_title,'')||coalesce(p_msg,'')),12),p_title,p_msg,coalesce(p_prio,4),null,'owner',array[coalesce(p_tags,'bell')],interval '2 minutes');
exception when others then null;
end $$;
revoke all on function public.owner_push(text,text,int,text) from public, anon, authenticated;
