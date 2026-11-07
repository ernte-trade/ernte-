-- 2. 11.: AI úlohy v stave „odoslana“ – uzavretie, oprava čítania reportov z GitHubu, opätovné spustenie po 2 h (max 3×) a push pri neúspechu
alter table ai_tasks add column if not exists sent_at timestamptz;
alter table ai_tasks add column if not exists reruns int not null default 0;

-- (1) reporty, ktoré sú na GitHube, ale databáza ich neprečítala (čítala iba prvých 100 komentárov od najstaršej čakajúcej úlohy)
-- (v zašifrovanej migrácii: 70 riadkov update ai_tasks … report = zhrnutie z GitHubu – text reportov sa do repozitára nepíše)

-- (2) ostatné staré „odoslana“ (diagnostiky diag-k7, diag-ho, diag-mail4, diag-mail5 …) – už nepotrebné
update ai_tasks set status='hotova', done_at=now(), report='Zrušené – nahradené (diagnostika už nie je potrebná alebo bola nahradená novšou úpravou).'
 where status='odoslana' and created_at<'2026-11-01 23:00:00+00' and id not in ('9496112c-a498-45aa-9892-21f3a717bc32','0c96abd7-3a06-4a93-8f6a-c809ca31e6c3','3fac5a3f-0baf-4329-baef-7b0dacdc68cb','345d23fc-b812-4bd6-8d9e-139f43493bc6','25709e01-08d2-4e00-bdb2-137b83febf38','fae7112f-88a6-4688-88c3-aaab6893e2da','afa28122-1acc-4213-922c-02248cf4f994','74d93ead-8d7f-4cd7-8efd-eb5660c5c91d','1745ec11-f340-4de6-82cb-a1f58eda3c64','e9ff5437-bd30-4118-8f80-d6675757b13b','c4be18f9-3c17-41f6-9c24-2eed9e3418c7');

-- (3) čítanie reportov: najnovšie komentáre prvé + stránkovanie (predtým stále tých istých 100 najstarších)
create or replace function public.ai_gh_sync(do_full boolean default true) returns void language plpgsql security definer set search_path=public, extensions, net as $$
declare tk text:=regexp_replace(coalesce(ai_secret('github_token'),''),'\s','','g'); pw text:=ai_secret('ai_pass'); st jsonb; r record; c jsonb; tid uuid; rep text; t record; since timestamptz; msg text; pg int:=1; cnt int:=0;
begin
  for t in select * from ai_tasks where status='nova' loop
    if t.req_id is null then perform ai_gh_issue(t.id); continue; end if;
    select * into r from net._http_response where id=t.req_id;
    if r.id is null then
      if t.created_at<now()-interval '15 minutes' and t.tries<5 then perform ai_gh_issue(t.id); end if;
      continue; end if;
    if r.status_code=201 then update ai_tasks set status='odoslana', report=null, sent_at=now() where id=t.id; continue; end if;
    msg:=coalesce(ai_json(r.content)->>'message', r.error_msg, left(r.content,150), 'bez odpovede');
    if r.status_code in (401,403,404) or t.tries>=5 then
      update ai_tasks set status='chyba', report=case
        when r.status_code=401 then 'GitHub odmietol token (401 '||msg||'). Token je neplatný alebo zle skopírovaný – vytvor nový token (Issues: Read and write pre ernte-trade/ernte-), vlož ho na ai.html, spusti SQL a ťukni Skúsiť znova.'
        when r.status_code=403 then 'GitHub: token nemá právo vytvárať úlohy (403 '||msg||'). Pri tokene nastav Issues: Read and write a ťukni Skúsiť znova.'
        when r.status_code=404 then 'GitHub: repozitár ernte-trade/ernte- nenájdený pre tento token (404). Pri tokene vyber repozitár ernte-trade/ernte- a ťukni Skúsiť znova.'
        else 'GitHub chyba ('||coalesce(r.status_code::text,'sieť')||'): '||msg end where id=t.id;
    else perform ai_gh_issue(t.id); end if;
  end loop;
  if not do_full or tk='' or pw is null then return; end if;
  select value into st from ai_state where key='gh';
  if st is not null and st ? 'req' then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is not null and r.status_code=200 then
      for c in select * from jsonb_array_elements(case when jsonb_typeof(ai_json(r.content))='array' then ai_json(r.content) else '[]'::jsonb end) loop
        cnt:=cnt+1;
        if c->>'body' like 'ernte-ai-report %' then
          begin
            tid:=substring(c->>'body' from 'ernte-ai-report ([0-9a-f-]{36})')::uuid;
            rep:=convert_from(pgp_sym_decrypt_bytea(dearmor(substring(c->>'body' from '(-----BEGIN PGP MESSAGE-----.*-----END PGP MESSAGE-----)')),pw),'UTF8');
            update ai_tasks set status='hotova', report=rep, done_at=now() where id=tid and status<>'hotova';
            if found then insert into ai_msgs(kind,role,content) values('fix','assistant',rep); end if;
          exception when others then null; end;
        end if;
      end loop;
      -- plná strana → nabudúce ďalšia strana (max 5), inak znova od najnovších
      pg:=case when cnt>=100 and coalesce((st->>'page')::int,1)<5 then coalesce((st->>'page')::int,1)+1 else 1 end;
    end if;
  end if;
  select min(created_at) into since from ai_tasks where status='odoslana';
  if since is null then delete from ai_state where key='gh'; return; end if;
  insert into ai_state(key,value) values('gh',jsonb_build_object('page',pg,'req',net.http_get(
    url:='https://api.github.com/repos/ernte-trade/ernte-/issues/comments?sort=created&direction=desc&per_page=100&page='||pg||'&since='||to_char(since at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    headers:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28'))))
  on conflict(key) do update set value=excluded.value, updated_at=now();
end $$;
revoke all on function public.ai_gh_sync(boolean) from public, anon, authenticated;

-- (4) úloha „odoslana“ > 2 h → odoslať znova (nové issue s tým istým id), max 3×; potom push priorita 5
create or replace function public.ai_task_rerun_tick() returns int language plpgsql security definer set search_path=public as $$
declare t record; k int:=0;
begin
  for t in select * from ai_tasks where status='odoslana' and coalesce(sent_at,created_at)<now()-interval '2 hours' order by created_at loop
    if t.reruns<3 then
      update ai_tasks set reruns=reruns+1, tries=0, req_id=null where id=t.id;
      perform ai_gh_issue(t.id);
    else
      update ai_tasks set status='chyba', report='Úloha sa nedokončila ani po 3 opätovných spusteniach (čakala '||round(extract(epoch from now()-t.created_at)/3600)||' h). Posledný stav: '||coalesce(nullif(t.report,''),'bez reportu od programátora (GitHub úloha zostala otvorená)')||'. Ťukni Skúsiť znova alebo úlohu zruš.' where id=t.id;
      begin
        perform push_app('aitask','aitask_fail',t.id::text,'❌ Úloha AI sa nedá dokončiť',
          left(regexp_replace(t.text,'\s+',' ','g'),140)||' · chyba: 3× opätovné spustenie bez výsledku (GitHub úloha bez reportu)',5,'https://ernte-trade.github.io/ernte-/farmar/#flotila/set/diag',array['x'],null,null,false);
      exception when others then null; end;
    end if;
    k:=k+1;
  end loop;
  return k;
end $$;
revoke all on function public.ai_task_rerun_tick() from public, anon, authenticated;

-- staré upozornenie „čaká viac ako 2 h“ (priorita 4) nahradilo opätovné spustenie
create or replace function public.push_ai_wait() returns int language sql security definer set search_path=public as $$ select 0 $$;
revoke all on function public.push_ai_wait() from public, anon, authenticated;

do $$ begin
  begin perform cron.unschedule('ai-ulohy-znova'); exception when others then null; end;
  perform cron.schedule('ai-ulohy-znova','*/10 * * * *','select public.ai_task_rerun_tick()');
end $$;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select date '2026-11-02','🤖 AI úlohy sa nestratia','Flotila → ⚙️ Nastavenia → 🩺 Diagnostika','majiteľ',array['owner'],
 'Staré úlohy „odoslaná“ uzavreté (reporty doplnené). Úloha bez výsledku do 2 h sa spustí znova (max 3×), potom príde upozornenie „Úloha AI sa nedá dokončiť“.'
where not exists(select 1 from app_novinky where titul like '🤖 AI úlohy sa nestratia%');
