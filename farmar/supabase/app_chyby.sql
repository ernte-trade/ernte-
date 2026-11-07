-- 🐞 CHYBY APLIKÁCIE + PRIHLÁSENIA (2. 11.): errmon.js zbiera chyby skriptov, nevybavené sľuby, chyby volaní databázy (4xx/5xx)
-- a chyby vykreslenia u všetkých (farmári aj tím) → app_chyby; prihlásenia (úspešné, neúspešné, neodoslaný odkaz) → app_login_log.
-- BEZ osobných a obchodných údajov: texty sa čistia v telefóne aj tu (e-maily, telefóny, čísla dlhšie ako 4 číslice, mená, hodnoty v zátvorkách),
-- používateľ pri prihlásení iba ako odtlačok (hash) a maskovaný e-mail (m***@domena). Uchovanie 30 dní (pg_cron app-chyby-cleanup).
-- Push majiteľovi: chyba farmára priorita 5, tímu 3 (tá istá chyba = hash správy + obrazovky najviac raz za 30 min);
-- viac ako 3 neúspešné prihlásenia toho istého používateľa za 15 min → priorita 4.

create table if not exists public.app_chyby(
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text,          -- js | promise | api | render | siet
  role text,          -- owner / admin / dispatch / farmar / junior / anon …
  grp text,           -- farmar | tim | anon (určí databáza)
  screen text,
  dev text,
  browser text,
  ver text,
  api text,           -- rpc:meno / tab:tabulka / auth:… (bez hodnôt)
  status int,
  msg text,
  stack text,
  h text              -- md5(správa + obrazovka)
);
alter table public.app_chyby enable row level security;
revoke all on public.app_chyby from anon, authenticated;
drop policy if exists app_chyby_owner on public.app_chyby;
create policy app_chyby_owner on public.app_chyby for select to authenticated using (is_owner());
create index if not exists app_chyby_at on public.app_chyby(at desc);
create index if not exists app_chyby_h on public.app_chyby(h, at desc);

create table if not exists public.app_chyby_push(h text primary key, at timestamptz not null default now(), n int not null default 1);
alter table public.app_chyby_push enable row level security;
revoke all on public.app_chyby_push from anon, authenticated;

create table if not exists public.app_login_log(
  id bigserial primary key,
  at timestamptz not null default now(),
  ev text,            -- ok | fail | code_fail | link_sent | link_fail
  method text,        -- heslo | kod | odkaz
  who_h text,         -- odtlačok (SHA-256) prihlasovacieho mena – nie e-mail
  who_m text,         -- maskovaný e-mail m***@domena
  code text,          -- kód chyby (invalid_credentials, 429 …)
  dev text,
  browser text,
  ver text
);
alter table public.app_login_log enable row level security;
revoke all on public.app_login_log from anon, authenticated;
drop policy if exists app_login_log_owner on public.app_login_log;
create policy app_login_log_owner on public.app_login_log for select to authenticated using (is_owner());
create index if not exists app_login_log_at on public.app_login_log(at desc);
create index if not exists app_login_log_who on public.app_login_log(who_h, at desc);

-- čistenie textu (druhá poistka – prvá je v telefóne)
create or replace function public.app_err_scrub(t text, n int default 500) returns text language plpgsql immutable set search_path=public as $$
declare s text:=left(coalesce(t,''),4000);
begin
  s:=regexp_replace(s,'(\.(js|mjs|html|css|json))\?[^\s:"''<>)]*','\1','g');            -- súbor.js?v=… → súbor.js (riadok:stĺpec ostane)
  s:=regexp_replace(s,'(https?://[^\s?#"''<>]*)[?#][^\s"''<>)]*','\1','g');               -- adresy bez ?parametrov a #…
  s:=regexp_replace(s,'(eyJ|sb-|Bearer )[A-Za-z0-9._-]{10,}','[token]','g');
  s:=regexp_replace(s,'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}','[email]','g');
  s:=regexp_replace(s,'(\+|\m0)\d[\d /-]{7,}\d','[tel]','g');
  s:=regexp_replace(s,'(^|[^:\d])\d{5,}','\1#','g');                                   -- čísla > 4 číslice (nie riadok:stĺpec)
  s:=regexp_replace(s,'=\([^)]*\)','=(…)','g');                                        -- Key (meno)=(hodnota) z databázy
  s:=regexp_replace(s,'[[:upper:]][[:lower:]]*[À-ɏ][[:lower:]]*\s+[[:upper:]][[:lower:]]+','[meno]','g');
  s:=regexp_replace(s,'[[:upper:]][[:lower:]]+\s+[[:upper:]][[:lower:]]*[À-ɏ][[:lower:]]*','[meno]','g');
  return left(s,coalesce(n,500));
end $$;

create or replace function public.app_err_dev(t text) returns text language sql immutable set search_path=public as $$
  select left(regexp_replace(coalesce(t,''),'[^A-Za-z0-9 .,:/()+_-]','','g'),40) $$;

create or replace function public.app_err_log(p jsonb) returns int language plpgsql security definer set search_path=public as $$
declare x jsonb; i int:=0; ok int:=0; m text; sc text; hh text; g text; rl text; k text; pr int; lst timestamptz;
begin
  if p is null then return 0; end if;
  if jsonb_typeof(p)='object' then p:=jsonb_build_array(p); end if;
  if jsonb_typeof(p)<>'array' then return 0; end if;
  -- globálna poistka: najviac 600 záznamov za minútu
  if (select count(*) from app_chyby where at>now()-interval '1 minute')>=600 then return 0; end if;
  g:=case when auth.uid() is null then 'anon' when coalesce(is_staff(),false) or coalesce(is_owner(),false) then 'tim' else 'farmar' end;
  for x in select value from jsonb_array_elements(p) loop
    i:=i+1; exit when i>20;
    if jsonb_typeof(x)<>'object' then continue; end if;
    k:=left(regexp_replace(coalesce(x->>'kind','js'),'[^a-z_]','','g'),12);
    m:=app_err_scrub(x->>'msg',500);
    sc:=left(regexp_replace(coalesce(x->>'screen','?'),'[^A-Za-z0-9:_./ -]','','g'),40);
    rl:=left(regexp_replace(lower(coalesce(x->>'role','?')),'[^a-z_:?-]','','g'),20);
    if g='anon' then rl:='anon'; elsif g='farmar' and rl not in ('farmar','junior') then rl:='farmar'; end if;
    if m='' then continue; end if;
    hh:=md5(regexp_replace(m,'\d+','#','g')||'|'||sc);
    -- tá istá chyba (hash) najviac 50× za minútu
    if (select count(*) from app_chyby where h=hh and at>now()-interval '1 minute')>=50 then continue; end if;
    insert into app_chyby(kind,role,grp,screen,dev,browser,ver,api,status,msg,stack,h)
      values(k,rl,g,sc,app_err_dev(x->>'dev'),app_err_dev(x->>'browser'),left(regexp_replace(coalesce(x->>'ver',''),'[^A-Za-z0-9 ._-]','','g'),30),
        left(regexp_replace(coalesce(x->>'api',''),'[^A-Za-z0-9:_./-]','','g'),80),
        case when coalesce(x->>'status','') ~ '^\d{1,3}$' then (x->>'status')::int end,
        m,nullif(app_err_scrub(x->>'stack',1500),''),hh);
    ok:=ok+1;
    -- push majiteľovi: farmár 5, tím 3; sieť bez pushu; tá istá chyba najviac raz za 30 min; spolu najviac 12 za hodinu
    if k<>'siet' then
      begin
        select at into lst from app_chyby_push where h=hh;
        if (lst is null or lst<now()-interval '30 minutes')
           and (select count(*) from app_chyby_push where at>now()-interval '1 hour')<12 then
          insert into app_chyby_push(h,at,n) values(hh,now(),1) on conflict(h) do update set at=now(), n=app_chyby_push.n+1;
          pr:=case when g='farmar' then 5 else 3 end;
          perform push_app('chyby','app_err',hh,
            '🐞 Chyba aplikácie · '||case g when 'farmar' then 'farmár' when 'tim' then 'tím ('||rl||')' else 'pred prihlásením' end,
            left(concat_ws(' · ',sc,m,nullif(x->>'dev','')),300),pr,null,array['bug'],null,null,false);
        end if;
      exception when others then null; end;
    end if;
  end loop;
  return ok;
exception when others then return ok;
end $$;
revoke all on function public.app_err_log(jsonb) from public; grant execute on function public.app_err_log(jsonb) to anon, authenticated;

create or replace function public.app_login_log(p jsonb) returns int language plpgsql security definer set search_path=public as $$
declare e text; w text; nf int; lst timestamptz;
begin
  if p is null or jsonb_typeof(p)<>'object' then return 0; end if;
  if (select count(*) from app_login_log where at>now()-interval '1 minute')>=120 then return 0; end if;
  e:=left(regexp_replace(coalesce(p->>'ev',''),'[^a-z_]','','g'),12);
  if e not in ('ok','fail','code_fail','link_sent','link_fail') then return 0; end if;
  w:=nullif(left(regexp_replace(coalesce(p->>'who_h',''),'[^a-f0-9]','','g'),64),'');
  insert into app_login_log(ev,method,who_h,who_m,code,dev,browser,ver)
    values(e,left(regexp_replace(coalesce(p->>'method',''),'[^a-z_]','','g'),10),w,
      -- maskovaný tvar: 1 znak + *** + @doména
      nullif(left(regexp_replace(coalesce(p->>'who_m',''),'^([^@*]?)[^@]*@','\1***@'),60),''),
      left(app_err_scrub(p->>'code',80),80),app_err_dev(p->>'dev'),app_err_dev(p->>'browser'),left(regexp_replace(coalesce(p->>'ver',''),'[^A-Za-z0-9 ._-]','','g'),30));
  if e in ('fail','code_fail') and w is not null then
    select count(*) into nf from app_login_log where who_h=w and ev in ('fail','code_fail') and at>now()-interval '15 minutes';
    if nf>3 then
      begin
        select at into lst from app_chyby_push where h='login:'||w;
        if lst is null or lst<now()-interval '30 minutes' then
          insert into app_chyby_push(h,at,n) values('login:'||w,now(),1) on conflict(h) do update set at=now(), n=app_chyby_push.n+1;
          perform push_app('chyby','login_fail','login:'||left(w,16),'🔐 Opakované neúspešné prihlásenie',
            concat_ws(' · ',coalesce((select who_m from app_login_log where who_h=w and who_m is not null order by at desc limit 1),'neznámy používateľ'),
              nf||' pokusov za 15 min',nullif(app_err_dev(p->>'dev'),'')),4,null,array['lock'],null,null,false);
        end if;
      exception when others then null; end;
    end if;
  end if;
  return 1;
exception when others then return 0;
end $$;
revoke all on function public.app_login_log(jsonb) from public; grant execute on function public.app_login_log(jsonb) to anon, authenticated;

-- prehľad pre majiteľa: ⚙️ Nastavenia → 🩺 Diagnostika → 🐞 Chyby aplikácie
create or replace function public.app_err_stats(p_days int default 1) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare d int:=least(greatest(coalesce(p_days,1),1),30); f timestamptz; res jsonb;
begin
  if not coalesce(is_owner(),false) then raise exception 'iba majiteľ'; end if;
  f:=now()-make_interval(days=>d);
  select jsonb_build_object(
    'days',d,
    'n',(select count(*) from app_chyby where at>=f),
    'farmar',(select count(*) from app_chyby where at>=f and grp='farmar'),
    'tim',(select count(*) from app_chyby where at>=f and grp='tim'),
    'anon',(select count(*) from app_chyby where at>=f and grp='anon'),
    'h1',(select count(*) from app_chyby where at>=now()-interval '1 hour'),
    'by_screen',coalesce((select jsonb_agg(jsonb_build_object('s',s,'n',n) order by n desc) from (select coalesce(screen,'?') s,count(*) n from app_chyby where at>=f group by 1 order by 2 desc limit 15) q),'[]'),
    'by_role',coalesce((select jsonb_agg(jsonb_build_object('r',r,'n',n) order by n desc) from (select coalesce(role,'?') r,count(*) n from app_chyby where at>=f group by 1 order by 2 desc limit 15) q),'[]'),
    'by_kind',coalesce((select jsonb_agg(jsonb_build_object('k',k,'n',n) order by n desc) from (select coalesce(kind,'?') k,count(*) n from app_chyby where at>=f group by 1) q),'[]'),
    'top',coalesce((select jsonb_agg(jsonb_build_object('m',m,'n',n,'last',l,'roles',rs,'s',sc,'k',k,'api',api,'st',st,'u',u,'ver',ver,'dev',dv) order by n desc, l desc) from (
       select h, (array_agg(msg order by at desc))[1] m, count(*) n, max(at) l, array_agg(distinct role) rs, (array_agg(screen order by at desc))[1] sc,
         (array_agg(kind order by at desc))[1] k, (array_agg(api order by at desc))[1] api, (array_agg(status order by at desc))[1] st,
         count(distinct coalesce(dev,'')||coalesce(browser,'')) u, (array_agg(ver order by at desc))[1] ver, (array_agg(concat_ws(' · ',nullif(dev,''),nullif(browser,'')) order by at desc))[1] dv
       from app_chyby where at>=f group by h order by count(*) desc, max(at) desc limit 10) q),'[]'),
    'login',jsonb_build_object(
       'ok',(select count(*) from app_login_log where at>=f and ev='ok'),
       'fail',(select count(*) from app_login_log where at>=f and ev in ('fail','code_fail')),
       'link_sent',(select count(*) from app_login_log where at>=f and ev='link_sent'),
       'link_fail',(select count(*) from app_login_log where at>=f and ev='link_fail'),
       'last_fail',coalesce((select jsonb_agg(jsonb_build_object('at',at,'ev',ev,'m',method,'w',who_m,'c',code,'dev',dev) order by at desc) from (select * from app_login_log where at>=f and ev in ('fail','code_fail','link_fail') order by at desc limit 8) q),'[]'))
  ) into res;
  return res;
end $$;
revoke all on function public.app_err_stats(int) from public, anon; grant execute on function public.app_err_stats(int) to authenticated;

-- iba súčty (bez textov) – koordinátor podľa nich rozhoduje o automatickom návrate verzie
create or replace function public.app_err_rate() returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'h0',(select count(*) from app_chyby where at>=now()-interval '60 minutes' and kind<>'siet'),
    'h1',(select count(*) from app_chyby where at>=now()-interval '120 minutes' and at<now()-interval '60 minutes' and kind<>'siet'),
    'd1',(select count(*) from app_chyby where at>=now()-interval '24 hours' and kind<>'siet')) $$;
revoke all on function public.app_err_rate() from public; grant execute on function public.app_err_rate() to anon, authenticated;

create or replace function public.app_chyby_cleanup() returns int language plpgsql security definer set search_path=public as $$
declare a int; b int;
begin
  delete from app_chyby where at<now()-interval '30 days'; get diagnostics a=row_count;
  delete from app_login_log where at<now()-interval '30 days'; get diagnostics b=row_count;
  delete from app_chyby_push where at<now()-interval '30 days';
  return a+b;
end $$;
revoke all on function public.app_chyby_cleanup() from public, anon, authenticated;

do $$ begin
  begin perform cron.unschedule('app-chyby-cleanup'); exception when others then null; end;
  perform cron.schedule('app-chyby-cleanup','23 3 * * *','select public.app_chyby_cleanup()');
exception when others then null; end $$;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select current_date,'🐞 Chyby aplikácie a prihlásenia pod dohľadom','Flotila → ⚙️ Nastavenia → 🩺 Diagnostika → 🐞 Chyby aplikácie','majiteľ',array['owner'],
 'Aplikácia u všetkých (farmári aj tím) zachytí chyby skriptov, nevydarené volania databázy a chyby zobrazenia – obrazovka, rola, zariadenie, prehliadač, verzia, bez osobných a obchodných údajov (uchovanie 30 dní). Chyba u farmára = push priorita 5, u tímu 3 (tá istá najviac raz za 30 min). Zapisujú sa aj prihlásenia: úspešné, neúspešné a neodoslaný e-mail s odkazom; viac ako 3 neúspešné pokusy toho istého človeka za 15 min = push priorita 4. V Diagnostike prepínač 24 h / 7 dní, počty podľa obrazovky a roly a 10 najčastejších chýb.'
where not exists(select 1 from app_novinky where titul like '🐞 Chyby aplikácie a prihlásenia%');
select 'app chyby ok';
