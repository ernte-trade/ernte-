-- ===== 🔔 PUSH UPOZORNENIA PRE CELÚ APLIKÁCIU (majiteľ) =====
-- (1) prihlásenie / odhlásenie každého používateľa · priorita 3
-- (2) nová požiadavka · priorita 5 · (3) nový obchod a zmena stavu / ceny / ton / dodaných t · priorita 5
-- (4) burza: MATIF repka/pšenica/kukurica, CBOT sója ±2 % alebo ±8 €/t od posledného upozornenia, výkupná cena nad burzou · priorita 5
-- (5) aktivita: farmári, Doprava, dokumenty, mzdy, nastavenia (vytvoril / zmenil / zmazal) · priorita 3
-- (6) koniec platnosti cenníka 3 dni a 1 deň vopred · priorita 4 · (7) úloha AI čaká viac ako 2 h · priorita 4
-- Bez upozornení o vlastných akciách príjemcu (Martin). Rovnaký objekt + typ najviac raz za 10 min (opakovania zlúčené „uložené 5×“).
-- Tiché hodiny 22:00–6:00 iba pre prioritu 3 a nižšiu (do ranného súhrnu o 5:00); priorita 4–5 chodí vždy.

-- kto to urobil (prihlásený používateľ): e-mail, meno, majiteľ?, Martin?
create or replace function public.push_actor(out e text, out n text, out own boolean, out main boolean) language plpgsql stable security definer set search_path=public as $$
begin
  e:=lower(nullif(coalesce(auth.jwt()->>'email',''),''));
  own:=false; main:=false;
  if e is null then n:='systém'; return; end if;
  main:=e=any(push_main_emails());
  select s.name, s.role='owner' into n, own from staff s where lower(s.email)=e limit 1;
  if n is null then select f.name into n from farmers f where lower(coalesce(f.login,''))=e or lower(coalesce(f.email,''))=e limit 1; end if;
  if n is null then begin execute 'select p.name from trus_users u join trus_partners p on p.id=u.partner_id where lower(u.login)=$1 limit 1' into n using e; exception when others then null; end; end if;
  n:=coalesce(n,e); own:=coalesce(own,false);
exception when others then n:=coalesce(n,e,'systém');
end $$;
revoke all on function public.push_actor() from public, anon, authenticated;

-- spoločné odoslanie udalosti aplikácie (prepínače, vlastné akcie, tiché hodiny, zlúčenie)
create or replace function public.push_app(p_type text, p_kind text, p_obj text, p_title text, p_msg text, p_prio int, p_url text default null, p_tags text[] default null,
  p_actor text default null, p_watch text default null, p_merge boolean default true) returns text language plpgsql security definer set search_path=public as $$
declare c jsonb:=push_cfg()->'app'; w jsonb; webto text[]; url text:=coalesce(p_url,'https://ernte-trade.github.io/ernte-/farmar/');
begin
  if not coalesce((c->>'on')::boolean,true) or not coalesce((c->>p_type)::boolean,true) then return 'vypnuté'; end if;
  if lower(coalesce(p_actor,''))=any(push_main_emails()) then return 'vlastná akcia'; end if;
  w:=coalesce(c->'watch','[]'::jsonb);
  if p_watch is not null and jsonb_typeof(w)='array' and jsonb_array_length(w)>0 and not (w ? lower(p_watch)) then return 'nesledovaná osoba'; end if;
  if coalesce(p_prio,3)<=3 and push_quiet('app') then
    if exists(select 1 from push_queue q where q.target='morning' and q.sent_at is null and q.src='app' and q.kind=p_kind and q.obj is not distinct from p_obj) then
      update push_queue set n=n+1, title=p_title, body=p_msg where target='morning' and sent_at is null and src='app' and kind=p_kind and obj is not distinct from p_obj;
    else perform push_enqueue('app',p_kind,p_obj,'app',p_prio,p_title,p_msg,url,'owner','morning'); end if;
    return 'ranný súhrn';
  end if;
  -- veľa zmien naraz (napr. hromadný prepočet): jedna súhrnná správa namiesto desiatok
  if (select count(distinct coalesce(kind,'')||'|'||coalesce(obj,'')||'|'||coalesce(title,'')) from push_log where src='app' and channel in ('ntfy','web','none') and at>now()-interval '2 minutes')>=8 then
    update push_queue set n=n+1, body=left(p_title||E'\n'||coalesce(body,''),900) where target='merge' and sent_at is null and src='app' and kind='burst';
    if not found then
      insert into push_queue(src,kind,obj,lvl,prio,title,body,url,topic,target,n,due_at) values('app','burst',to_char(now(),'HH24MI'),'app',greatest(coalesce(p_prio,3),4),'🔔 Viac zmien naraz',p_title,url,'owner','merge',0,now()+interval '3 minutes');
    end if;
    return 'súhrn zmien';
  end if;
  select array_agg(distinct lower(email)) into webto from push_subs where coalesce(email,'')<>'' and email<>'test' and lower(email)<>lower(coalesce(p_actor,''));
  return push_send('app',p_kind,p_obj,p_title,p_msg,p_prio,url,'owner',p_tags,interval '10 minutes',coalesce(webto,array['-']),coalesce(array_length(webto,1),0)>0,
    null,null,null,'app',p_merge);
end $$;
revoke all on function public.push_app(text,text,text,text,text,int,text,text[],text,text,boolean) from public, anon, authenticated;

create or replace function public.push_dev(d text) returns text language sql immutable as $$
  select case when d is null then null when d ~* '^(iPhone|Android)' then 'mobil ('||d||')' else 'počítač ('||d||')' end $$;

-- ---------- (1) prihlásenie / odhlásenie ----------
create or replace function public.papp_login_staff() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.kind not in ('session','end') then return null; end if;
  begin
    if exists(select 1 from staff s where lower(s.email)=lower(new.email) and s.role='owner') then return null; end if;
    perform push_app('login',case when new.kind='session' then 'login' else 'logout' end,lower(new.email),
      case when new.kind='session' then '🔓 Prihlásenie · ' else '🔒 Odhlásenie · ' end||coalesce(new.name,new.email),
      concat_ws(' · ',case new.role when 'admin' then 'kancelária' when 'dispatch' then 'doprava' when 'invoice' then 'fakturácia' else new.role end,
        to_char(new.at at time zone 'Europe/Bratislava','HH24:MI'),push_dev(new.dev)),3,'https://ernte-trade.github.io/ernte-/farmar/#tab/team',
      array[case when new.kind='session' then 'unlock' else 'lock' end],null,lower(new.email),false);
  exception when others then null; end;
  return null;
end $$;
drop trigger if exists papp_login on public.app_activity;
create trigger papp_login after insert on public.app_activity for each row execute function public.papp_login_staff();

create or replace function public.papp_login_ext() returns trigger language plpgsql security definer set search_path=public as $$
declare nm text; who text; lg boolean;
begin
  lg:=new.kind='session' or (new.kind='action' and new.what ilike 'Odhlásenie%');
  if not lg then return null; end if;
  begin
    if new.farmer_id is not null then select name into nm from farmers where id=new.farmer_id; who:='farmár';
    else begin execute 'select name from trus_partners where id=$1' into nm using new.partner_id; exception when others then null; end; who:='partner (kurací trus)'; end if;
    perform push_app('login',case when new.kind='session' then 'login' else 'logout' end,coalesce('f:'||new.farmer_id,'p:'||new.partner_id),
      case when new.kind='session' then '🔓 Prihlásenie · ' else '🔒 Odhlásenie · ' end||coalesce(nm,new.login,'?'),
      concat_ws(' · ',who,to_char(new.at at time zone 'Europe/Bratislava','HH24:MI'),push_dev(new.dev)),3,'https://ernte-trade.github.io/ernte-/farmar/#tab/farm',
      array[case when new.kind='session' then 'unlock' else 'lock' end],null,coalesce('f:'||new.farmer_id,'p:'||new.partner_id),false);
  exception when others then null; end;
  return null;
end $$;
do $$ begin
  if to_regclass('public.ext_activity') is not null then
    execute 'drop trigger if exists papp_login_ext on public.ext_activity; create trigger papp_login_ext after insert on public.ext_activity for each row execute function public.papp_login_ext()';
  end if;
end $$;

-- ---------- (2) nová požiadavka (priorita 5) ----------
create or replace function public.opush_req() returns trigger language plpgsql security definer set search_path=public as $$
declare fn text; t text; m text; a record;
begin
  begin
    select * into a from push_actor();
    select name into fn from farmers where id=new.farmer_id;
    t:=case new.kind when 'transport' then '🚚 Objednávka odvozu' when 'sell' then '💰 Ponuka na predaj' when 'agree' then '✍️ Zmluva podpísaná' when 'message' then '💬 Správa' else '📥 Nová požiadavka' end||' · '||coalesce(fn,'farmár');
    m:=concat_ws(' · ', case when new.com is not null then cennik_nm(new.com) end, case when new.tons is not null then cennik_num(new.tons)||' t' end,
         case when new.price is not null then cennik_num(new.price)||' €/t' end, case when new.pickup_date is not null then 'odvoz '||to_char(new.pickup_date,'DD.MM.') end,
         case when coalesce(new.firma,'ERNTE')<>'ERNTE' then new.firma end, case when a.e is not null and not coalesce(a.n,'')=coalesce(fn,'') then 'zadal '||a.n end);
    perform push_app('req','req',new.id::text,t,m,5,'https://ernte-trade.github.io/ernte-/farmar/#tab/req',
      array[case new.kind when 'transport' then 'truck' when 'sell' then 'moneybag' else 'inbox_tray' end],a.e,null,false);
  exception when others then null; end;
  return new;
end $$;
drop trigger if exists opush_req on public.requests; create trigger opush_req after insert on public.requests for each row execute function public.opush_req();

-- ---------- (3) obchody: nový, zmena stavu, ceny, ton, dodaných t (priorita 5) ----------
create or replace function public.deal_st_nm(s text) returns text language sql immutable as $$
  select coalesce(('{"navrh":"návrh","podpisany":"podpísaný","odvoz":"odvoz","odvezeny":"odvezený","fakturacia":"fakturácia","zaplateny":"zaplatený","zruseny":"zrušený"}'::jsonb)->>s, s) $$;
create or replace function public.papp_deal() returns trigger language plpgsql security definer set search_path=public as $$
declare a record; fn text; t text; m text; ch text[]:='{}';
begin
  begin
    select * into a from push_actor();
    select name into fn from farmers where id=new.farmer_id;
    if TG_OP='INSERT' then t:='🤝 Nový obchod '||new.no||' · '||coalesce(fn,'');
    else
      if new.status is distinct from old.status then ch:=ch||(deal_st_nm(old.status)||' → '||deal_st_nm(new.status)); end if;
      if new.price is distinct from old.price then ch:=ch||('cena '||cennik_num(old.price)||' → '||cennik_num(new.price)||' €/t'); end if;
      if new.tons is distinct from old.tons then ch:=ch||('množstvo '||cennik_num(old.tons)||' → '||cennik_num(new.tons)||' t'); end if;
      if new.delivered_t is distinct from old.delivered_t then ch:=ch||('dodané '||cennik_num(old.delivered_t)||' → '||cennik_num(new.delivered_t)||' t'); end if;
      if cardinality(ch)=0 then return null; end if;
      t:=case when new.status is distinct from old.status then '🤝 Obchod '||new.no||': '||deal_st_nm(new.status) else '✏️ Obchod '||new.no||' zmenený' end||' · '||coalesce(fn,'');
    end if;
    m:=concat_ws(' · ', case when cardinality(ch)>0 then array_to_string(ch,' · ') end, cennik_nm(new.com), cennik_num(new.tons)||' t', cennik_num(new.price)||' €/t',
         'hodnota '||push_num(coalesce(new.tons,0)*coalesce(new.price,0))||' €', coalesce('zmenil(a) '||a.n,'systém'));
    perform push_app('deal','deal',new.id::text,t,m,5,'https://ernte-trade.github.io/ernte-/farmar/#tab/deals',array['handshake'],a.e,null,true);
  exception when others then null; end;
  return null;
end $$;
drop trigger if exists papp_deal on public.deals;
create trigger papp_deal after insert or update on public.deals for each row execute function public.papp_deal();

-- ---------- (5) aktivita: kto vytvoril / zmenil / zmazal ----------
create or replace function public.papp_act() returns trigger language plpgsql security definer set search_path=public as $$
declare a record; j jsonb; nm text; what text; verb text; url text; k text;
begin
  begin
    select * into a from push_actor();
    if a.e is null then return null; end if;                       -- automatické úlohy databázy sa nehlásia
    j:=case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
    if TG_TABLE_NAME='settings' and j->>'key' in ('pricelist') then return null; end if;   -- cenník hlási Cenník (upozornenie na zmenu ceny)
    nm:=left(coalesce(j->>'name',j->>'title',j->>'no',j->>'plate',j->>'key',j->>'driver',''),60);
    verb:=case TG_OP when 'INSERT' then 'vytvoril(a)' when 'UPDATE' then 'zmenil(a)' else 'zmazal(a)' end;
    select x.w, x.u into what, url from (values
      ('farmers','farmára','#tab/farm'),('trips','prepravu v Doprave','#tab/trans'),('ai_docs','dokument','#tab/home'),('ev_pay','mzdy','#tab/home'),
      ('settings','nastavenia','#tab/home'),('fleet_cfg','nastavenia flotily','#flotila/set'),('staff','používateľa v Tíme','#tab/team')) x(t,w,u) where x.t=TG_TABLE_NAME;
    k:=TG_TABLE_NAME||':'||coalesce(j->>'id',j->>'key',j->>'email','?');
    perform push_app('act','act',k,'📝 '||a.n||' '||verb||' '||coalesce(what,TG_TABLE_NAME)||case when nm<>'' then ' · '||nm else '' end,
      to_char(now() at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),3,'https://ernte-trade.github.io/ernte-/farmar/'||coalesce(url,''),array['memo'],a.e,a.e,true);
  exception when others then null; end;
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['farmers','trips','ai_docs','ev_pay','settings','fleet_cfg','staff'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists papp_act on public.%I; create trigger papp_act after insert or update or delete on public.%I for each row execute function public.papp_act()',t,t);
    end if;
  end loop;
end $$;

-- ---------- (4) burza ----------
insert into ai_state(key,value) select 'push_burza', coalesce(jsonb_object_agg(sym,eur_t),'{}'::jsonb) from market_px where sym in ('repka','psenica','kukurica','soja_usc_bu') and eur_t is not null
  on conflict (key) do nothing;
create or replace function public.push_burza_check() returns int language plpgsql security definer set search_path=public as $$
declare st jsonb; r record; o numeric; d numeric; p numeric; k int:=0; com text; pr record;
begin
  select value into st from ai_state where key='push_burza'; st:=coalesce(st,'{}'::jsonb);
  for r in select sym, name, eur_t, contract from market_px where sym in ('repka','psenica','kukurica','soja_usc_bu') and eur_t is not null loop
    o:=nullif(st->>r.sym,'')::numeric;
    if o is null then st:=st||jsonb_build_object(r.sym,r.eur_t); continue; end if;
    d:=r.eur_t-o; p:=case when o<>0 then d/o*100 end;
    if abs(d)>=8 or abs(coalesce(p,0))>=2 then
      perform push_app('burza','burza',r.sym,(case when d>0 then '📈 ' else '📉 ' end)||'Burza · '||coalesce(r.name,r.sym)||' '||cennik_num(round(o,1))||' → '||cennik_num(round(r.eur_t,1))||' €/t',
        (case when d>0 then '+' else '−' end)||cennik_num(round(abs(d),1))||' €/t ('||(case when d>0 then '+' else '−' end)||cennik_num(round(abs(p),1))||' %) od posledného upozornenia'
        ||coalesce(' · '||r.contract,''),5,'https://ernte-trade.github.io/ernte-/farmar/#cennik',array['chart_with_upwards_trend'],null,null,false);
      st:=st||jsonb_build_object(r.sym,r.eur_t); k:=k+1;
    end if;
  end loop;
  -- výkupná cena v Cenníku nad burzou (najviac raz za 12 h pri plodine)
  for pr in select x.com, x.price, m.eur_t, m.name from prices x join market_px m on m.sym=case x.com when 'repka' then 'repka' when 'psenica_p' then 'psenica' when 'psenica_k' then 'psenica'
             when 'kukurica' then 'kukurica' when 'soja' then 'soja_usc_bu' end where x.price is not null and m.eur_t is not null and x.price>m.eur_t loop
    if not exists(select 1 from push_log l where l.src='app' and l.kind='burza_nad' and l.obj=pr.com and l.at>now()-interval '12 hours') then
      perform push_app('burza','burza_nad',pr.com,'⚠️ Výkupná cena nad burzou · '||cennik_nm(pr.com),
        'Cenník '||cennik_num(pr.price)||' €/t > '||coalesce(pr.name,'burza')||' '||cennik_num(round(pr.eur_t,1))||' €/t (o '||cennik_num(round(pr.price-pr.eur_t,1))||' €/t viac)',
        5,'https://ernte-trade.github.io/ernte-/farmar/#cennik',array['warning'],null,null,false);
      k:=k+1;
    end if;
  end loop;
  insert into ai_state(key,value) values('push_burza',st) on conflict(key) do update set value=excluded.value, updated_at=now();
  return k;
end $$;
revoke all on function public.push_burza_check() from public, anon, authenticated;

-- ---------- (6) koniec platnosti cenníka ----------
create or replace function public.push_cennik_exp() returns int language plpgsql security definer set search_path=public as $$
declare v text; d date; left_d int; today date:=(now() at time zone 'Europe/Bratislava')::date;
begin
  if push_hour_local()<7 then return 0; end if;
  select value->>'valid' into v from settings where key='pricelist';
  if coalesce(v,'') !~ '^\d{4}-\d{2}-\d{2}$' then return 0; end if;
  d:=v::date; left_d:=d-today;
  if left_d not in (1,3) then return 0; end if;
  if exists(select 1 from push_log where src='app' and kind='cennik_exp' and obj=v||':'||left_d) then return 0; end if;
  perform push_app('cennik_exp','cennik_exp',v||':'||left_d,'📅 Cenník platí do '||to_char(d,'FMDD. FMMM.')||' – o '||left_d||' '||case when left_d=1 then 'deň' else 'dni' end,
    'Predĺž platnosť alebo zverejni nové ceny v Cenníku, inak farmári uvidia neplatný cenník.',4,'https://ernte-trade.github.io/ernte-/farmar/#cennik',array['calendar'],null,null,false);
  return 1;
end $$;
revoke all on function public.push_cennik_exp() from public, anon, authenticated;

-- ---------- (7) úloha AI čaká viac ako 2 h ----------
create or replace function public.push_ai_wait() returns int language plpgsql security definer set search_path=public as $$
declare t record; k int:=0;
begin
  for t in select * from ai_tasks where status='odoslana' and created_at<now()-interval '2 hours' and created_at>now()-interval '7 days' loop
    if exists(select 1 from push_log where src='app' and kind='aitask' and obj=t.id::text) then continue; end if;
    perform push_app('aitask','aitask',t.id::text,'⏳ Úloha AI čaká viac ako 2 h',left(regexp_replace(t.text,'\s+',' ','g'),120)||' · odoslaná '||to_char(t.created_at at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
      4,'https://ernte-trade.github.io/ernte-/farmar/#flotila/set/diag',array['hourglass'],null,null,false);
    k:=k+1;
  end loop;
  return k;
end $$;
revoke all on function public.push_ai_wait() from public, anon, authenticated;

-- ---------- Cenník: odoslanie cez push centrum (zápis do push_log, ntfy podľa nastavenia) ----------
create or replace function public.cennik_push(p_title text, p_msg text, p_prio int, p_to text[], p_url text) returns uuid language plpgsql security definer set search_path=public as $$
declare t text[]:=(select array_agg(lower(x)) from unnest(p_to) x); w record; rq bigint; c jsonb:=push_cfg();
begin
  if coalesce(array_length(t,1),0)=0 then return null; end if;
  begin
    select * into w from push_web(p_title,p_msg,p_prio,'cennik',p_url,t,null);
    if w.job is not null then insert into push_log(src,kind,obj,prio,title,body,channel,req_id,job_id) values('app','cennik',left(md5(p_title||p_msg),12),p_prio,p_title,p_msg,'web',w.req,w.job); end if;
  exception when others then insert into push_log(src,kind,prio,title,channel,err) values('app','cennik',p_prio,p_title,'web',left(SQLERRM,300)); end;
  -- ntfy: iba zvoniaca verzia (priorita 4–5) do súkromnej témy majiteľa
  if coalesce((c->>'ntfy')::boolean,true) and coalesce(p_prio,0)>=4 then
    begin
      rq:=push_ntfy(c->>'topic_owner',p_title,p_msg,p_prio,array['moneybag'],p_url,null);
      insert into push_log(src,kind,obj,prio,title,body,channel,req_id) values('app','cennik',left(md5(p_title||p_msg),12),p_prio,p_title,p_msg,'ntfy',rq);
    exception when others then null; end;
  end if;
  return w.job;
end $$;
revoke all on function public.cennik_push(text,text,int,text[],text) from public, anon, authenticated;

-- ---------- každú minútu ----------
create or replace function public.push_tick() returns int language plpgsql security definer set search_path=public as $$
declare k int:=0; m int:=extract(minute from now())::int;
begin
  begin perform push_http_sync(); exception when others then null; end;
  begin k:=k+fleet_push_scan(); exception when others then insert into check_err(fn,msg,at) values('fleet_push_scan',left(SQLERRM,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(), n=check_err.n+1; end;
  begin k:=k+push_merge_flush(); exception when others then null; end;
  begin k:=k+push_morning(); exception when others then null; end;
  if m % 5=2 then
    begin k:=k+push_burza_check(); exception when others then null; end;
    begin k:=k+push_ai_wait(); exception when others then null; end;
  end if;
  if m=17 then
    begin k:=k+push_cennik_exp(); exception when others then null; end;
    if push_hour_local()=8 then begin k:=k+card_stmt_tick(); exception when others then insert into check_err(fn,msg,at) values('card_stmt_tick',left(SQLERRM,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(), n=check_err.n+1; end; end if;
  end if;
  delete from push_log where at<now()-interval '120 days';
  return k;
end $$;
revoke all on function public.push_tick() from public, anon, authenticated;

do $$ begin
  begin perform cron.unschedule('push-tick'); exception when others then null; end;
  perform cron.schedule('push-tick','* * * * *','select public.push_tick()');
  begin perform cron.unschedule('push-hodina'); exception when others then null; end;
  perform cron.schedule('push-hodina','5 * * * *','select public.push_hour()');
  -- ranný report flotily + ranný súhrn upozornení (ak ešte neodišiel o 5:00)
  begin perform cron.unschedule('ai-rano'); exception when others then null; end;
  perform cron.schedule('ai-rano','0 5 * * *',$c$select public.fleet_daily_report('rano'); select public.push_morning();$c$);
end $$;
