-- 6. 11. 2026 15:10 (diagnostika od Martina „oprav všetko poškodené“):
-- 1) ntfy.sh – 429 „daily message quota reached“: rozpočet správ za 24 h (ai_state ntfy_budget {max,low}); nad `low` iba priorita ≥ 4,
--    nad `max` nič; po 429 pauza 1 h. Web Push do aplikácie (Martin – Fold) ide ďalej bez obmedzenia.
-- 2) gh_diag: chyby všetkých služieb zoskupené podľa služby (GitHub / ntfy / počasie), test tokenu sa uloží a obnoví raz za 24 h (predtým „?“).
create or replace function public.push_ntfy_ok(p_prio int) returns boolean language plpgsql stable security definer set search_path=public, net as $$
declare cfg jsonb:=coalesce((select value from ai_state where key='ntfy_budget'),'{}'::jsonb);
  mx int:=coalesce((cfg->>'max')::int,220); lo int:=coalesce((cfg->>'low')::int,150); n int; blk timestamptz;
begin
  begin
    select max(created) into blk from net._http_response where created>now()-interval '1 hour' and status_code=429 and coalesce(content,'') ilike '%ntfy%';
  exception when others then blk:=null; end;
  if blk is null then select max(at) into blk from push_log where channel='ntfy' and http=429 and at>now()-interval '1 hour'; end if;
  if blk is not null then return false; end if;
  select count(*) into n from push_log where channel='ntfy' and req_id is not null and coalesce(http,200)<400 and at>now()-interval '24 hours';
  if n>=mx then return false; end if;
  if n>=lo and coalesce(p_prio,3)<4 then return false; end if;
  return true;
end $$;
revoke all on function public.push_ntfy_ok(int) from public, anon, authenticated;

create or replace function public.push_ntfy(p_topic text, p_title text, p_msg text, p_prio int default 3, p_tags text[] default null, p_click text default null, p_actions jsonb default null)
returns bigint language plpgsql security definer set search_path=public, extensions, net as $$
declare b jsonb;
begin
  if coalesce(p_topic,'')='' then return null; end if;
  if not push_ntfy_ok(p_prio) then return null; end if; -- denný limit ntfy.sh (6. 11.)
  b:=jsonb_build_object('topic',p_topic,'title',left(coalesce(p_title,'ERNTE'),120),'message',left(coalesce(p_msg,''),900),'priority',greatest(1,least(5,coalesce(p_prio,3))));
  if p_tags is not null then b:=b||jsonb_build_object('tags',to_jsonb(p_tags)); end if;
  if p_click is not null then b:=b||jsonb_build_object('click',p_click); end if;
  if p_actions is not null and jsonb_array_length(p_actions)>0 then b:=b||jsonb_build_object('actions',p_actions); end if;
  return net.http_post(url:='https://ntfy.sh/', body:=b, headers:=jsonb_build_object('Content-Type','application/json'));
end $$;
revoke all on function public.push_ntfy(text,text,text,int,text[],text,jsonb) from public, anon, authenticated;
insert into ai_state(key,value) values('ntfy_budget',jsonb_build_object('max',220,'low',150,'kto','Claude 6. 11. – limit ntfy.sh 250/deň')) on conflict(key) do nothing;

drop function if exists public.gh_diag();
create or replace function public.gh_diag() returns jsonb language plpgsql volatile security definer set search_path=public, net as $$
declare r jsonb; p jsonb; t jsonb; st jsonb; ru net._http_response; rr net._http_response; tk text; h jsonb; nw boolean:=false;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  begin
    select coalesce(jsonb_agg(x order by x->>'at' desc),'[]') into r from (
      select jsonb_build_object('s',s,'code',code,'n',count(*),'at',max(created),'first',min(created),'e',left(max(e),70),'b',left(max(b),140)) x from (
        select created, status_code code, coalesce(error_msg,'') e, regexp_replace(coalesce(content,''),'\s+',' ','g') b,
          case when coalesce(content,'') ilike '%ntfy%' then 'ntfy (upozornenia do mobilu)'
               when coalesce(content,'') ilike '%overloaded%' or coalesce(content,'') ilike '%"reason"%' then 'Počasie (Open-Meteo)'
               when coalesce(content,'') ilike '%github%' or coalesce(content,'') ilike '%documentation_url%' then 'GitHub'
               when timed_out then 'časový limit spojenia'
               else 'iná služba' end s
        from net._http_response where created>now()-interval '24 hours' and (status_code>=300 or error_msg is not null or timed_out)
          and coalesce(content,'') !~ '"status":"error"') q
      group by s, code order by max(created) desc limit 8) y;
  exception when others then r:=jsonb_build_array(jsonb_build_object('at',now(),'e','net: '||left(SQLERRM,80)));
  end;
  begin
    select jsonb_build_object('n',count(*),'taken',count(taken_at),'last',max(created_at),'last_taken',max(taken_at)) into p from push_jobs where created_at>now()-interval '24 hours';
    p:=p||jsonb_build_object('ntfy24',(select count(*) from push_log where channel='ntfy' and req_id is not null and at>now()-interval '24 hours'),
      'ntfy_ok24',(select count(*) from push_log where channel='ntfy' and req_id is not null and coalesce(http,200)<400 and at>now()-interval '24 hours'),
      'ntfy_max',coalesce((select (value->>'max')::int from ai_state where key='ntfy_budget'),220),'ntfy_teraz',push_ntfy_ok(3),'ntfy_teraz5',push_ntfy_ok(5));
  exception when others then null; end;
  begin
    select value into st from ai_state where key='ghtest';
    if st ? 'res' and (st->>'at')::timestamptz>now()-interval '24 hours' then
      t:=(st->'res')||jsonb_build_object('at',st->>'at');
    else
      if st is not null then
        select * into ru from net._http_response where id=(st->>'u')::bigint;
        select * into rr from net._http_response where id=(st->>'r')::bigint;
      end if;
      if ru.id is not null and rr.id is not null and (st->>'at')::timestamptz>now()-interval '24 hours' then
        t:=jsonb_build_object('user_code',ru.status_code,'login',case when ru.status_code=200 then (ru.content::jsonb)->>'login' end,'user_err',coalesce(ru.error_msg,case when ru.status_code<>200 then left(ru.content,120) end),
          'expires',ru.headers->>'github-authentication-token-expiration','scopes',ru.headers->>'x-oauth-scopes',
          'repo_code',rr.status_code,'push',case when rr.status_code=200 then ((rr.content::jsonb)->'permissions'->>'push') end,
          'repo_err',coalesce(rr.error_msg,case when rr.status_code<>200 then left(rr.content,120) end));
        update ai_state set value=st||jsonb_build_object('res',t), updated_at=now() where key='ghtest';
        t:=t||jsonb_build_object('at',st->>'at');
      elsif st is null or (st->>'at')::timestamptz<now()-interval '3 minutes' then nw:=true;
      else t:=jsonb_build_object('running',true,'at',st->>'at'); end if;
    end if;
    if nw then
      tk:=regexp_replace(coalesce(ai_secret('github_token'),''),'\s','','g');
      h:=jsonb_build_object('Authorization','Bearer '||tk,'Accept','application/vnd.github+json','User-Agent','ernte-ai','X-GitHub-Api-Version','2022-11-28');
      insert into ai_state(key,value) values('ghtest',jsonb_build_object('at',now(),
        'u',net.http_get(url:='https://api.github.com/user',headers:=h,timeout_milliseconds:=20000),
        'r',net.http_get(url:='https://api.github.com/repos/ernte-trade/ernte-',headers:=h,timeout_milliseconds:=20000)))
      on conflict(key) do update set value=excluded.value, updated_at=now();
      t:=jsonb_build_object('running',true,'at',now());
    end if;
  exception when others then t:=jsonb_build_object('e',left(SQLERRM,100)); end;
  return jsonb_build_object('err',r,'push',p,'test',t,'v',2);
end $$;
revoke all on function public.gh_diag() from public, anon; grant execute on function public.gh_diag() to authenticated;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-06','🩺 Diagnostika: upozornenia ntfy v limite, jasnejšie chyby služieb','Flotila → ⚙️ → 🩺 Diagnostika','Martin, Jana',array['owner'],
 'Bezplatná služba ntfy.sh má limit asi 250 správ za deň – dnes sa prekročil (chyba 429). Aplikácia si teraz stráži rozpočet: nad 150 správ za 24 h idú cez ntfy iba dôležité, nad 220 nič a po chybe 429 počká hodinu. Upozornenia v aplikácii (Web Push) chodia ďalej. V diagnostike sú chyby zoskupené podľa služby (GitHub, ntfy, počasie) a test GitHub tokenu sa obnoví sám. Commander „No item found“ (zmluvy, strediská) sa už neukazuje ako chyba – znamená iba, že tam nič nie je.'
where not exists(select 1 from app_novinky where titul like '🩺 Diagnostika: upozornenia ntfy%');

