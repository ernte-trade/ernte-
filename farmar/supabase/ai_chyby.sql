-- 🤖 CHYBY ERNTE AI PO SLOVENSKY + OPAKOVANIE + KREDIT AI V DIAGNOSTIKE (2. 11. AI úloha 361aa31b)
-- • typ chyby Claude API → zrozumiteľná správa (kredit / príliš veľa dát / limit workspace / preťaženie) + pôvodný text pod ňou
-- • kredit (400 credit balance): chat aj Prehľad sa automaticky skúšajú znova každé 2 min počas 30 min
-- • preťaženie (429/529): znova o 2 min, najviac 10 min
-- • „prompt is too long“: ai_post na 24 h posiela zmenšený JSON (ai_snapshot_slim) a žiadosť sa hneď zopakuje; plné dáta ostávajú v DB
-- • každá chyba Claude API (všetky volania cez pg_net) → app_chyby (Diagnostika → Chyby aplikácie) + push priorita 4 (ten istý typ raz za 30 min)
-- • ai_state ai_health: posledné úspešné volanie, posledná chyba, posledných 5 volaní; 5× za sebou chyba → push priorita 4
-- • ai_credit_get: + health, slim_until (Nastavenia → Diagnostika → 🤖 Kredit AI)

create or replace function public.ai_err_kind(p_code int, p_txt text) returns text language sql immutable as $$
  select case
    when coalesce(p_txt,'') ~* '(credit balance|credit_balance_too_low)' then 'kredit'
    when coalesce(p_txt,'') ~* '(prompt is too long|too many total text bytes|request_too_large|request size exceeds)' or p_code=413 then 'dlhy'
    when coalesce(p_txt,'') ~* '(spend limit|spending limit|usage limit|workspace[^.]{0,60}limit)' then 'limit'
    when p_code in (429,529) or coalesce(p_txt,'') ~* '(overloaded|rate_limit)' then 'pretazenie'
    when p_code=401 or coalesce(p_txt,'') ~* 'authentication_error|invalid x-api-key' then 'kluc'
    when p_code is null then 'siet'
    else 'ine' end $$;

create or replace function public.ai_err_label(p_kind text) returns text language sql immutable as $$
  select case p_kind
    when 'kredit' then 'Nízky kredit – dobi na console.anthropic.com/settings/billing'
    when 'dlhy' then 'Príliš veľa dát v žiadosti'
    when 'limit' then 'Limit míňania workspace'
    when 'pretazenie' then 'Preťaženie, skúšam znova'
    when 'kluc' then 'Kľúč Claude API nefunguje'
    when 'siet' then 'AI neodpovedala (sieť / časový limit)'
    else 'Chyba AI' end $$;

-- pôvodný text chyby z odpovede Claude API
create or replace function public.ai_err_raw(p_code int, p_content text, p_err text default null) returns text language plpgsql immutable as $$
declare j jsonb;
begin
  begin j:=p_content::jsonb; exception when others then j:=null; end;
  return left(coalesce(j#>>'{error,message}', p_err, p_content, ''),400);
end $$;

-- obyčajný text (pre tím, push)
create or replace function public.ai_err_text(p_code int, p_content text, p_err text default null) returns text language sql immutable as $$
  select ai_err_label(ai_err_kind(p_code, coalesce(p_content,'')||' '||coalesce(p_err,'')))
    ||' · Pôvodná chyba ('||coalesce(p_code::text,'sieť')||'): '||ai_err_raw(p_code,p_content,p_err) $$;

-- Markdown pre chat / Prehľad
create or replace function public.ai_err_md(p_kind text, p_code int, p_raw text, p_note text default null) returns text language sql immutable as $$
  select case p_kind
      when 'kredit' then '💳 **Nízky kredit – dobi na [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing)**'
      when 'dlhy' then '📦 **Príliš veľa dát v žiadosti**'
      when 'limit' then '🧾 **Limit míňania workspace** – zvýš limit v [console.anthropic.com/settings/limits](https://console.anthropic.com/settings/limits)'
      when 'pretazenie' then '⏳ **Preťaženie, skúšam znova**'
      when 'kluc' then '🔑 **Kľúč Claude API nefunguje** – vlož nový na stránke ai.html'
      else '⚠️ **Chyba AI**' end
    ||case when coalesce(p_note,'')<>'' then E'\n\n'||p_note else '' end
    ||E'\n\nPôvodná chyba ('||coalesce(p_code::text,'sieť')||'): `'||replace(coalesce(p_raw,''),'`','''')||'`' $$;

-- zmenšený JSON pre AI (pri „prompt is too long“); plné dáta ostávajú v databáze
create or replace function public.ai_snapshot_slim(s jsonb) returns jsonb language plpgsql stable set search_path=public as $$
declare tz text:='Europe/Bratislava'; d0 date:=((now() at time zone 'Europe/Bratislava')::date-14);
  m1 text:=to_char(now() at time zone 'Europe/Bratislava','YYYY-MM'); m2 text:=to_char((now() at time zone 'Europe/Bratislava')-interval '1 month','YYYY-MM');
  rg jsonb; ev jsonb; sp jsonb; k text;
begin
  if s is null or jsonb_typeof(s)<>'object' then return s; end if;
  rg:=s->'register_poruseni';
  if rg is not null and jsonb_typeof(rg)='object' then
    -- udalosti: iba posledných 14 dní; rýchlosti najviac 50 (zoznam je zoradený od najvyššej)
    select coalesce(jsonb_agg(e order by o),'[]') into ev from jsonb_array_elements(coalesce(rg->'udalosti','[]')) with ordinality q(e,o)
      where coalesce(e->>0,'') !~* '^rýchlosť' and ai_slim_d(e->>3)>=d0;
    select coalesce(jsonb_agg(e order by o),'[]') into sp from (select e,o from jsonb_array_elements(coalesce(rg->'udalosti','[]')) with ordinality q(e,o)
      where coalesce(e->>0,'') ~* '^rýchlosť' and ai_slim_d(e->>3)>=d0 order by o limit 50) x;
    rg:=rg||jsonb_build_object('udalosti',ev||sp,'pocet_v_zozname',jsonb_array_length(ev||sp),
      'suhrn_po_vodicoch_mesiace',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(rg->'suhrn_po_vodicoch_mesiace','[]')) x where x->>'mesiac' in (m1,m2)),
      'suhrn_po_autach_mesiace',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(rg->'suhrn_po_autach_mesiace','[]')) x where x->>'mesiac' in (m1,m2)),
      'skratene','ZMENŠENÉ pre AI (žiadosť bola príliš veľká): udalosti iba za posledných 14 dní, najviac 50 rýchlostí, súhrny iba za aktuálny a predošlý mesiac. Plné dáta sú v aplikácii (Flotila → Alarmy).');
    s:=s||jsonb_build_object('register_poruseni',rg);
  end if;
  foreach k in array array['nafta_bilancia_7_dni','nafta_bilancia_30_dni','nafta_bilancia'] loop
    if jsonb_typeof(s->k)='array' then
      s:=s||jsonb_build_object(k,(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(s->k) x where coalesce(x->>'stav','') !~* '^málo dát'));
    end if;
  end loop;
  return s||jsonb_build_object('poznamka_zmensene','Údaje sú zmenšené, lebo celá žiadosť bola pre AI príliš veľká (autá „málo dát“ v bilancii nafty vynechané).');
end $$;

create or replace function public.ai_slim_d(t text) returns date language plpgsql immutable as $$
begin
  if t ~ '^\d{2}\.\d{2}\.\d{4}' then return to_date(left(t,10),'DD.MM.YYYY'); end if;
  return null;
exception when others then return null;
end $$;

-- ai_post (pôvodne 20261025-2010-ai-opus-standard) + zmenšený JSON, keď je zapnutý ai_state ai_slim
create or replace function public.ai_post(convo jsonb, sys_extra text default '') returns bigint language plpgsql security definer set search_path=public, net as $$
declare k text:=regexp_replace(coalesce(ai_secret('anthropic_key'),''),'\s','','g'); md text:=(select value->>'mode' from ai_state where key='auth'); snap jsonb;
begin
  if k='' then k:=null; end if;
  if k is null then raise exception 'Chýba API kľúč – spusti nastavenie na stránke ai.html.'; end if;
  snap:=ai_snapshot();
  if exists(select 1 from ai_state where key='ai_slim' and (value->>'until')::timestamptz>now()) then
    begin snap:=ai_snapshot_slim(snap); exception when others then null; end;
  end if;
  return net.http_post(url:='https://api.anthropic.com/v1/messages',
    headers:=case when coalesce(md, case when k like 'sk-ant-api%' then 'x' else 'b' end)='x' then jsonb_build_object('x-api-key',k) else jsonb_build_object('Authorization','Bearer '||k) end||jsonb_build_object('anthropic-version','2023-06-01','content-type','application/json'),
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',16000,
      'system', ai_system()||E'\n\nAKTUÁLNE ÚDAJE FIRMY (JSON):\n'||snap::text||sys_extra,
      'messages',convo,
      'tools',jsonb_build_array(jsonb_build_object('type','web_search_20250305','name','web_search','max_uses',5))),
    timeout_milliseconds:=300000);
end $$;
revoke all on function public.ai_post(jsonb,text) from public, anon, authenticated;

alter table public.ai_msgs add column if not exists err_kind text;
alter table public.ai_msgs add column if not exists retry_until timestamptz;
alter table public.ai_msgs add column if not exists retry_next timestamptz;
alter table public.ai_msgs add column if not exists sent_at timestamptz;
alter table public.ai_msgs add column if not exists slim boolean;

-- ai_collect (pôvodne 20261025-1700-dokumenty-archiv) + opakovanie pri kredite / preťažení, zmenšenie pri príliš veľkej žiadosti, správy po slovensky
create or replace function public.ai_collect() returns int language plpgsql security definer set search_path=public, net as $$
declare m record; r record; j jsonb; txt text; n int:=0; ln text; tid uuid; ek text; raw text; ru timestamptz; tz text:='Europe/Bratislava';
begin
  -- opakovanie: kredit (každé 2 min počas 30 min), preťaženie (každé 2 min počas 10 min)
  for m in select * from ai_msgs where status='err' and role='assistant' and err_kind in ('kredit','pretazenie') and convo is not null
             and retry_next<=now() and retry_until>now() order by id for update skip locked loop
    begin
      update ai_msgs set status='wait', req_id=ai_post(m.convo), sent_at=now(), retry_next=null where id=m.id;
    exception when others then
      update ai_msgs set retry_next=now()+interval '2 minutes' where id=m.id;
    end;
  end loop;
  for m in select * from ai_msgs where status='wait' and req_id is not null order by id for update skip locked loop
    select * into r from net._http_response where id=m.req_id;
    if r.id is null then
      if coalesce(m.sent_at,m.created_at)<now()-interval '6 minutes' then update ai_msgs set status='err', err_kind='siet', content='AI neodpovedala včas. Skús znova.' where id=m.id; end if;
      continue; end if;
    n:=n+1;
    if r.status_code=401 and m.tries<2 then
      insert into ai_state(key,value) values('auth',jsonb_build_object('mode',case when coalesce((select value->>'mode' from ai_state where key='auth'),case when ai_secret('anthropic_key') like 'sk-ant-api%' then 'x' else 'b' end)='x' then 'b' else 'x' end))
        on conflict(key) do update set value=excluded.value, updated_at=now();
      update ai_msgs set tries=tries+1, req_id=ai_post(convo), sent_at=now() where id=m.id; continue; end if;
    if r.status_code=401 then
      update ai_msgs set status='err', err_kind='kluc', content='Kľúč Claude nefunguje (uložený kľúč začína „'||left(coalesce(ai_secret('anthropic_key'),'?'),12)||'…“, dĺžka '||length(coalesce(ai_secret('anthropic_key'),''))||' znakov). Vytvor v Console nový kľúč a vlož ho na stránke ai.html.' where id=m.id; continue; end if;
    if r.status_code is distinct from 200 then
      raw:=ai_err_raw(r.status_code, r.content, r.error_msg);
      ek:=ai_err_kind(r.status_code, coalesce(r.content,'')||' '||coalesce(r.error_msg,''));
      -- príliš veľa dát → zapni zmenšený JSON na 24 h a skús hneď znova (raz)
      if ek='dlhy' and coalesce(m.slim,false)=false and m.convo is not null then
        insert into ai_state(key,value) values('ai_slim',jsonb_build_object('until',now()+interval '24 hours','at',now(),'msg',m.id))
          on conflict(key) do update set value=excluded.value, updated_at=now();
        begin
          update ai_msgs set slim=true, tries=tries+1, req_id=ai_post(m.convo), sent_at=now(), err_kind='dlhy' where id=m.id;
          continue;
        exception when others then null; end;
      end if;
      if ek in ('kredit','pretazenie') and m.convo is not null then
        ru:=coalesce(m.retry_until, now()+case when ek='kredit' then interval '30 minutes' else interval '10 minutes' end);
        if ru>now()+interval '1 minute' then
          update ai_msgs set status='err', err_kind=ek, retry_until=ru, retry_next=now()+interval '2 minutes',
            content=ai_err_md(ek, r.status_code, raw, 'Skúšam znova automaticky každé 2 min do '||to_char(ru at time zone tz,'HH24:MI')||case when ek='kredit' then ' (kredit po dobití nabieha s oneskorením).' else '.' end)
            where id=m.id;
          continue;
        end if;
      end if;
      update ai_msgs set status='err', err_kind=ek, retry_next=null,
        content=ai_err_md(ek, r.status_code, raw, case when ek in ('kredit','pretazenie') then 'Automatické opakovanie skončilo – pošli otázku / ťukni Urobiť prehľad znova.'
                                                       when ek='dlhy' then 'Ani zmenšené údaje sa nezmestili – skráť otázku alebo začni nový rozhovor.' end)
        where id=m.id; continue; end if;
    j:=ai_json(r.content);
    if j is null then update ai_msgs set status='err', err_kind='ine', content='AI vrátila neplatnú odpoveď.' where id=m.id; continue; end if;
    if (j->>'stop_reason'='pause_turn' or (j->>'stop_reason'='max_tokens' and not exists(select 1 from jsonb_array_elements(j->'content') b where b->>'type'='text' and length(b->>'text')>200))) and m.tries<6 then
      update ai_msgs set tries=tries+1, convo=convo||jsonb_build_array(jsonb_build_object('role','assistant','content',j->'content')),
        req_id=ai_post(convo||jsonb_build_array(jsonb_build_object('role','assistant','content',j->'content'))), sent_at=now() where id=m.id;
      continue; end if;
    select string_agg(b->>'text','') into txt from jsonb_array_elements(j->'content') b where b->>'type'='text';
    if nullif(trim(txt),'') is null then
      update ai_msgs set status='err', err_kind='ine', content='AI nedokončila odpoveď ('||coalesce(j->>'stop_reason','?')||'). Skús to znova – ťukni Urobiť prehľad / pošli otázku ešte raz.' where id=m.id; continue; end if;
    if j->>'stop_reason'='max_tokens' then txt:=txt||E'\n\n_(odpoveď bola dlhá a skrátila sa – napíš „pokračuj“)_'; end if;
    if coalesce(m.slim,false) then txt:=txt||E'\n\n_(AI dostala zmenšené údaje – udalosti za 14 dní, súhrny za 2 mesiace; celá žiadosť bola príliš veľká)_'; end if;
    begin txt:=ai_doc_extract(txt,m.id); exception when others then null; end;
    for ln in select (regexp_matches(txt, '^\s*\**ÚLOHA:\**\s*(.+)$', 'gm'))[1] loop
      insert into ai_tasks(text,msg_id) values(trim(ln),m.id) returning id into tid;
      perform ai_gh_issue(tid);
    end loop;
    update ai_msgs set status='ok', content=txt, convo=null, err_kind=null, retry_next=null where id=m.id;
  end loop;
  return n;
end $$;
revoke all on function public.ai_collect() from public, anon;
grant execute on function public.ai_collect() to authenticated;

-- tím (timai_resp, pôvodne 20261030-1615) – chyba po slovensky
create or replace function public.timai_resp(p_req bigint) returns jsonb language plpgsql security definer set search_path=public, net as $$
declare r record; j jsonb; txt text; o jsonb;
begin
  if p_req is null then return jsonb_build_object('err','bez požiadavky'); end if;
  select * into r from net._http_response where id=p_req;
  if r.id is null then return null; end if;
  if r.status_code is distinct from 200 then return jsonb_build_object('err',left(ai_err_text(r.status_code,r.content,r.error_msg),300),'kind',ai_err_kind(r.status_code,coalesce(r.content,'')||' '||coalesce(r.error_msg,''))); end if;
  j:=ai_json(r.content);
  select string_agg(b->>'text','') into txt from jsonb_array_elements(coalesce(j->'content','[]')) b where b->>'type'='text';
  begin o:=substring(coalesce(txt,'') from '\{.*\}')::jsonb; exception when others then o:=null; end;
  if o is null or jsonb_typeof(o)<>'object' then return jsonb_build_object('err','neplatná odpoveď AI'); end if;
  return o;
end $$;
revoke all on function public.timai_resp(bigint) from public, anon, authenticated;

-- ---------- sledovanie všetkých volaní Claude API (pg_net) ----------
create or replace function public.ai_err_scan() returns int language plpgsql security definer set search_path=public, net as $$
declare st jsonb; hj jsonb; last timestamptz; mx timestamptz; r record; ok boolean; ek text; raw text; n int:=0; l5 jsonb; hh text; lst timestamptz; tz text:='Europe/Bratislava'; f5 int;
begin
  select value into st from ai_state where key='ai_err_scan';
  last:=coalesce((st->>'last')::timestamptz, now()-interval '6 hours'); mx:=last;
  select coalesce(value,'{}'::jsonb) into hj from ai_state where key='ai_health'; hj:=coalesce(hj,'{}'::jsonb);
  l5:=coalesce(hj->'last5','[]'::jsonb);
  for r in select id,status_code,content,error_msg,created from net._http_response where created>last order by created, id loop
    mx:=greatest(mx,r.created);
    -- iba odpovede Claude API: úspech {"type":"message"…"model"…}, chyba {"type":"error","error":{…}}
    if r.content is null then continue; end if;
    if r.status_code=200 and position('"type":"message"' in r.content)>0 and position('"model"' in r.content)>0 and position('"usage"' in r.content)>0 then ok:=true;
    elsif r.status_code is distinct from 200 and r.content ~ '^\s*\{\s*"type"\s*:\s*"error"\s*,\s*"error"\s*:' then ok:=false;
    else continue; end if;
    n:=n+1;
    if ok then
      hj:=hj||jsonb_build_object('ok_at',r.created,'p5',false);
      l5:=l5||jsonb_build_array(jsonb_build_object('at',r.created,'ok',true));
    else
      raw:=ai_err_raw(r.status_code,r.content,r.error_msg); ek:=ai_err_kind(r.status_code,r.content);
      hj:=hj||jsonb_build_object('err_at',r.created,'err_kind',ek,'err_label',ai_err_label(ek),'err_code',r.status_code,'err_msg',raw);
      l5:=l5||jsonb_build_array(jsonb_build_object('at',r.created,'ok',false,'k',ek));
      hh:='ai:'||ek;
      -- Diagnostika → Chyby aplikácie
      begin
        insert into app_chyby(at,kind,role,grp,screen,dev,browser,ver,api,status,msg,stack,h)
          values(r.created,'ai','system','tim','AI',null,null,null,'anthropic',r.status_code,left(ai_err_label(ek)||' · '||app_err_scrub(raw,400),500),null,md5(hh));
      exception when others then null; end;
      -- push priorita 4 – ten istý typ chyby najviac raz za 30 min (iba čerstvé chyby)
      if r.created>now()-interval '30 minutes' then
        begin
          select at into lst from app_chyby_push where h=hh;
          if lst is null or lst<now()-interval '30 minutes' then
            insert into app_chyby_push(h,at,n) values(hh,now(),1) on conflict(h) do update set at=now(), n=app_chyby_push.n+1;
            perform push_app('chyby','ai_err',ek,'🤖 Chyba ERNTE AI · '||ai_err_label(ek),
              left('Pôvodná chyba ('||coalesce(r.status_code::text,'sieť')||'): '||raw,300)||chr(10)||'👉 ERNTE Trade & Logistic: Nastavenia → Diagnostika',4,null,array['robot'],null,null,false);
          end if;
        exception when others then null; end;
      end if;
    end if;
  end loop;
  -- posledných 5 volaní
  select coalesce(jsonb_agg(e order by o),'[]') into l5 from (select e,o from jsonb_array_elements(l5) with ordinality q(e,o) order by o desc limit 5) x;
  hj:=hj||jsonb_build_object('last5',l5,'scan_at',now());
  select count(*) into f5 from jsonb_array_elements(l5) e where not (e->>'ok')::boolean;
  if jsonb_array_length(l5)=5 and f5=5 and (not coalesce((hj->>'p5')::boolean,false) or coalesce((hj->>'p5_at')::timestamptz,'-infinity')<now()-interval '6 hours')
     and (l5->4->>'at')::timestamptz>now()-interval '30 minutes' then
    begin
      perform push_app('chyby','ai_5fail','ai','🤖 ERNTE AI nefunguje – posledných 5 volaní zlyhalo',
        coalesce(hj->>'err_label','Chyba AI')||' · posledné úspešné volanie: '||coalesce(to_char((hj->>'ok_at')::timestamptz at time zone tz,'DD.MM. HH24:MI'),'–')
        ||chr(10)||'👉 ERNTE Trade & Logistic: Nastavenia → Diagnostika → Kredit AI',4,null,array['robot','warning'],null,null,false);
    exception when others then null; end;
    hj:=hj||jsonb_build_object('p5',true,'p5_at',now());
  end if;
  insert into ai_state(key,value) values('ai_health',hj) on conflict(key) do update set value=excluded.value, updated_at=now();
  insert into ai_state(key,value) values('ai_err_scan',jsonb_build_object('last',mx,'at',now(),'n',n)) on conflict(key) do update set value=excluded.value, updated_at=now();
  return n;
end $$;
revoke all on function public.ai_err_scan() from public, anon, authenticated;

-- ai_credit_get (pôvodne 20261102-1015-kredit-ai) + health, slim
create or replace function public.ai_credit_get() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb; s jsonb; hl jsonb; spent numeric; d7 numeric; td numeric; ok timestamptz; days numeric; sl timestamptz;
begin
  if not price_main() then raise exception 'iba majiteľ'; end if;
  select value into c from ai_state where key='ai_credit';
  select value into s from ai_state where key='ai_usage_scan';
  select value into hl from ai_state where key='ai_health';
  select (value->>'until')::timestamptz into sl from ai_state where key='ai_slim';
  select coalesce(sum(usd),0) into td from ai_usage where at>=date_trunc('day',now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava';
  select coalesce(sum(usd),0), max(at) into d7, ok from ai_usage where at>now()-interval '7 days';
  select greatest(1,least(7,extract(epoch from now()-min(at))/86400)) into days from ai_usage where at>now()-interval '7 days';
  if c ? 'at' then select coalesce(sum(usd),0) into spent from ai_usage where at>(c->>'at')::timestamptz; end if;
  return jsonb_build_object('bal',c->'bal','bal_at',c->'at','spent',spent,
    'left',case when c ? 'bal' then round((c->>'bal')::numeric-coalesce(spent,0),2) end,
    'today',round(td,2),'d7',round(d7,2),'per_day',case when d7>0 then round(d7/coalesce(days,7),2) end,
    'ok_at',coalesce(hl->'ok_at',to_jsonb(ok)),'err_at',coalesce(s->'err_at',hl->'err_at'),'scan_at',s->'at',
    'empty',(s ? 'err_at' and (s->>'err_at')::timestamptz>coalesce(ok,'-infinity'::timestamptz)),
    'n7',(select count(*) from ai_usage where at>now()-interval '7 days'),
    'price',(select value->>'src' from ai_state where key='ai_price'),
    'health',coalesce(hl,'{}'::jsonb)-'p5'-'p5_at',
    'slim_until',case when sl>now() then sl end);
end $$;
revoke all on function public.ai_credit_get() from public, anon; grant execute on function public.ai_credit_get() to authenticated;

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='ai-chyby';
  perform cron.schedule('ai-chyby','* * * * *','select public.ai_err_scan()');
end $$;
select public.ai_err_scan();

insert into app_novinky(d,titul,kde,kto,aud,popis)
select current_date,'🤖 ERNTE AI – presné chyby, opakovanie a Kredit AI v Diagnostike','ERNTE AI (chat, Prehľad) · Nastavenia → Diagnostika → 🤖 Kredit AI','Martin',array['owner'],
 'Pri chybe AI vidíš typ po slovensky (nízky kredit, príliš veľa dát, limit míňania workspace, preťaženie) a pod tým pôvodný text. Pri nízkom kredite sa chat aj Prehľad skúšajú znova každé 2 min počas 30 min, pri preťažení 10 min. Keď je žiadosť príliš veľká, AI dostane na 24 h zmenšené údaje (udalosti 14 dní, max. 50 rýchlostí, súhrny za 2 mesiace, bez áut „málo dát“) – plné dáta ostávajú v databáze. Každá chyba AI = push priorita 4 (ten istý typ raz za 30 min) a záznam v Chybách aplikácie; 5 neúspešných volaní za sebou = push. V Diagnostike nový riadok Kredit AI: posledné úspešné volanie, posledná chyba, spotreba za deň a posledných 5 volaní.'
where not exists(select 1 from app_novinky where titul like '🤖 ERNTE AI – presné chyby%');
