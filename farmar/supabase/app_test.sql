-- 🧪 2. 11.: AUTOMATICKÉ TESTY APLIKÁCIE (workflow .github/workflows/app-test.yml každých 15 min → vetva app-test/result.json)
-- Databáza výsledok prevezme (app_test_tick, pg_cron app-test každých 5 min): záznam do app_test_runs (Diagnostika → 🧪 Automatické testy),
-- pri chybe push majiteľovi priorita 5 + AI úloha na opravu (rovnaká chyba push najviac raz za 6 h, úloha raz za 24 h),
-- automatické vrátenie verzie → push 5, vizuálna zmena > 2 % oproti schválenej verzii → info (priorita 3, raz na verziu).
-- Každý pondelok 6:00 report „Kvalita aplikácie“.
create table if not exists public.app_test_runs(at timestamptz primary key, sha text, ok boolean, fails jsonb, warns jsonb, vis jsonb,
  load_avg int, load_max int, rollback text, shots jsonb, rate jsonb, created_at timestamptz not null default now());
alter table public.app_test_runs enable row level security;
drop policy if exists app_test_runs_own on public.app_test_runs; create policy app_test_runs_own on public.app_test_runs for select using (is_owner());
create table if not exists public.app_test_sig(sig text primary key, push_at timestamptz, task_at timestamptz, n int not null default 0);
alter table public.app_test_sig enable row level security;
drop policy if exists app_test_sig_own on public.app_test_sig; create policy app_test_sig_own on public.app_test_sig for select using (is_owner());

create or replace function public.app_test_tick() returns int language plpgsql security definer set search_path=public, net as $$
declare st jsonb; r record; j jsonb; at0 timestamptz; vsig text; s app_test_sig; tid uuid; fl text; k int:=0;
begin
  select value into st from ai_state where key='app_test';
  if st ? 'req' then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is not null and r.status_code=200 then
      begin j:=r.content::jsonb; exception when others then j:=null; end;
      if j is not null and j ? 'at' then
        at0:=(j->>'at')::timestamptz;
        if not exists(select 1 from app_test_runs where at=at0) then
          insert into app_test_runs(at,sha,ok,fails,warns,vis,load_avg,load_max,rollback,shots,rate)
          values(at0,left(j->>'sha',40),coalesce((j->>'ok')::boolean,false),coalesce(j->'fails','[]'),coalesce(j->'warns','[]'),coalesce(j->'vis','[]'),
            nullif(j->>'load_avg','')::int,nullif(j->>'load_max','')::int,nullif(j->>'rollback',''),coalesce(j->'shots','[]'),j->'rate');
          k:=1;
          if not coalesce((j->>'ok')::boolean,false) then
            select string_agg(x,' | ' order by x) into fl from (select regexp_replace(x,'\s\d{3,4}px','','g') x from jsonb_array_elements_text(coalesce(j->'fails','[]')) x group by 1 limit 8) q;
            vsig:=md5(coalesce(fl,'?'));
            insert into app_test_sig(sig) values(vsig) on conflict do nothing;
            update app_test_sig set n=n+1 where app_test_sig.sig=vsig returning * into s;
            if s.push_at is null or s.push_at<now()-interval '6 hours' then
              begin perform push_app('apptest','apptest',vsig,'🧪 Automatický test aplikácie našiel chybu',left(coalesce(fl,'chyba'),220)||' · Diagnostika → 🧪 Automatické testy',5,
                'https://ernte-trade.github.io/ernte-/farmar/#flotila/set/diag',array['test_tube'],null,null,false); exception when others then null; end;
              update app_test_sig set push_at=now() where app_test_sig.sig=vsig;
            end if;
            if s.task_at is null or s.task_at<now()-interval '24 hours' then
              begin
                insert into ai_tasks(text) values('Oprav chybu, ktorú našiel automatický test aplikácie (app-test, '||to_char(at0 at time zone 'Europe/Bratislava','DD.MM. HH24:MI')||', verzia '||left(coalesce(j->>'sha',''),8)||'): '||left(coalesce(fl,'?'),900)||'. Snímky: vetva app-test/shots. Po oprave over node .github/e2e/smoke.mjs.') returning id into tid;
                perform ai_gh_issue(tid);
              exception when others then null; end;
              update app_test_sig set task_at=now() where app_test_sig.sig=vsig;
            end if;
          end if;
          if nullif(j->>'rollback','') is not null then
            begin perform push_app('apptest','rollback',at0::text,'↩️ Nová verzia automaticky vrátená','Po zverejnení stúpli chyby u používateľov ('||(j->>'rollback')||' za hodinu) – všetci majú znova predošlú verziu. Chyby: Diagnostika → 🐞 Chyby aplikácie.',5,
              'https://ernte-trade.github.io/ernte-/farmar/#flotila/set/diag',array['rewind'],null,null,false); exception when others then null; end;
          end if;
          -- 7. 11. (príkaz majiteľa „ČO TO JE???“): bez upozornenia do mobilu – rozdiel vo vzhľade nie je chyba, je iba v Diagnostike → 🧪
          if false and jsonb_array_length(coalesce(j->'vis','[]'))>0 and not exists(select 1 from push_log where src='app' and kind='app_vis' and obj=left(j->>'sha',12)) then
            begin perform push_app('apptest','app_vis',left(j->>'sha',12),'🎨 Nová verzia vyzerá inak ako schválená',jsonb_array_length(j->'vis')||' obrazoviek sa líši o viac ako 2 % – pozri pred zverejnením (Diagnostika → 🧪 Automatické testy).',3,
              'https://ernte-trade.github.io/ernte-/farmar/#flotila/set/diag',array['art'],null,null,false); exception when others then null; end;
          end if;
        end if;
      end if;
    end if;
  end if;
  insert into ai_state(key,value) values('app_test',jsonb_build_object('req',net.http_get(url:='https://raw.githubusercontent.com/ernte-trade/ernte-/app-test/result.json?t='||extract(epoch from now())::bigint)))
    on conflict(key) do update set value=excluded.value, updated_at=now();
  delete from app_test_runs where at<now()-interval '60 days';
  return k;
end $$;
revoke all on function public.app_test_tick() from public, anon, authenticated;

-- 📊 pondelkový report „Kvalita aplikácie“ (posledných 7 dní)
create or replace function public.app_quality_week() returns jsonb language plpgsql security definer set search_path=public as $$
declare e int; ef int; fx int; rb int; la int; tr int; tf int; b text;
begin
  select count(*), count(*) filter (where grp='farmar') into e, ef from app_chyby where at>=now()-interval '7 days' and kind<>'siet';
  select count(*) into fx from ai_tasks where status='hotova' and done_at>=now()-interval '7 days';
  select count(*) filter (where rollback is not null), round(avg(load_avg)), count(*), count(*) filter (where not ok) into rb, la, tr, tf from app_test_runs where at>=now()-interval '7 days';
  b:='Chyby u používateľov: '||coalesce(e,0)||' (farmári '||coalesce(ef,0)||') · opravy AI: '||coalesce(fx,0)||' · vrátené nasadenia: '||coalesce(rb,0)||' · testy: '||coalesce(tr,0)||' behov, '||coalesce(tf,0)||' s chybou · priem. načítanie '||coalesce(replace(round(la/1000.0,1)::text,'.',','),'–')||' s';
  begin perform push_app('apptest','kvalita',to_char(now(),'IYYY-IW'),'📊 Kvalita aplikácie – týždeň',b,3,'https://ernte-trade.github.io/ernte-/farmar/#flotila/set/diag',array['bar_chart'],null,null,false); exception when others then null; end;
  return jsonb_build_object('text',b);
end $$;
revoke all on function public.app_quality_week() from public, anon, authenticated;

create or replace function public.app_test_get() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  return jsonb_build_object(
    'runs',(select coalesce(jsonb_agg(x order by x.at desc),'[]') from (select at,left(sha,8) sha,ok,fails,warns,vis,load_avg,load_max,rollback,shots from app_test_runs order by at desc limit 12) x),
    'd7',(select jsonb_build_object('n',count(*),'fail',count(*) filter (where not ok),'rollback',count(*) filter (where rollback is not null),'load_avg',round(avg(load_avg))) from app_test_runs where at>=now()-interval '7 days'));
end $$;
revoke all on function public.app_test_get() from public, anon; grant execute on function public.app_test_get() to authenticated;

do $$ begin
  begin perform cron.unschedule('app-test'); exception when others then null; end;
  perform cron.schedule('app-test','*/5 * * * *','select public.app_test_tick()');
  begin perform cron.unschedule('kvalita-tyzden'); exception when others then null; end;
  perform cron.schedule('kvalita-tyzden','0 5 * * 1','select public.app_quality_week()');
end $$;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-02','🧪 Automatické testy aplikácie každých 15 min','Flotila → ⚙️ Nastavenia → 🩺 Diagnostika → 🧪 Automatické testy','majiteľ',array['owner'],
 'Každých 15 min a po každej zmene kódu sa aplikácia sama prejde ako majiteľ, obchodník, doprava a farmár (mobil aj počítač 1440 px, vymyslené údaje): chyby skriptov a konzoly, načítanie nad 3 s, „undefined/null/NaN/nezadané“ u farmára, prázdne tabuľky, šírka stránky a vzhľad oproti schválenej verzii. Chyba = upozornenie + AI úloha na opravu. Ak po zverejnení stúpnu chyby u používateľov, verzia sa sama vráti. V pondelok o 6:00 report Kvalita aplikácie.'
where not exists(select 1 from app_novinky where titul like '🧪 Automatické testy aplikácie%');
