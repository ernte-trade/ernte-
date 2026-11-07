-- ===== 💱 KURZ ECB (6. 11. 2026 príkaz majiteľa: „prepočíta meny EUR / HUF podľa aktuálneho denného kurzu ECB“) =====
-- Referenčné kurzy ECB (eurofxref-daily.xml, zverejňuje ECB v pracovné dni okolo 16:00 SEČ) → tabuľka fx_rates (d, cur, rate = koľko jednotiek meny za 1 €).
-- pg_net: požiadavka → odpoveď v ďalšom behu (ai_state fx_req). pg_cron `kurz-ecb` každých 20 min; sťahuje iba keď chýba dnešný kurz (po 15:10 UTC) alebo
-- keď nie je žiadny. Verejné referenčné údaje – číta každý prihlásený (fx_get). Prepočet v SQL: fx_conv(suma, z, do, deň).

create table if not exists public.fx_rates(d date not null, cur text not null, rate numeric not null, src text not null default 'ECB', at timestamptz not null default now(), primary key(d,cur));
alter table public.fx_rates enable row level security;
drop policy if exists fx_read on public.fx_rates;
create policy fx_read on public.fx_rates for select to authenticated using (true);
revoke insert, update, delete on public.fx_rates from anon, authenticated;

create or replace function public.fx_tick(p_force boolean default false) returns text language plpgsql security definer set search_path=public, net as $$
declare st jsonb; r record; x text; v_d date; m text[]; n int:=0; last date; need boolean;
begin
  select value into st from ai_state where key='fx_req';
  if st is not null and not (st ? 'done') then
    select * into r from net._http_response where id=(st->>'req')::bigint;
    if r.id is not null then
      update ai_state set value=value||jsonb_build_object('done',now(),'code',r.status_code), updated_at=now() where key='fx_req';
      if r.status_code=200 and r.content is not null then
        x:=r.content;
        v_d:=(regexp_match(x,'time=.(\d{4}-\d{2}-\d{2}).'))[1]::date;
        if v_d is not null then
          for m in select regexp_matches(x,'currency=.([A-Z]{3}). rate=.([0-9.]+).','g') loop
            insert into fx_rates(d,cur,rate) values(v_d,m[1],m[2]::numeric) on conflict(d,cur) do update set rate=excluded.rate, at=now();
            n:=n+1;
          end loop;
          update ai_state set value=value||jsonb_build_object('d',v_d,'n',n), updated_at=now() where key='fx_req';
        end if;
      end if;
    elsif (st->>'at')::timestamptz<now()-interval '10 minutes' then
      update ai_state set value=value||jsonb_build_object('done',now(),'err','bez odpovede'), updated_at=now() where key='fx_req';
    end if;
    if n>0 then return 'uložené '||n||' kurzov za '||v_d; end if;
  end if;
  select max(d) into last from fx_rates where cur='HUF';
  need:= p_force or last is null
    or (last<current_date and extract(isodow from current_date)<=5 and (now() at time zone 'UTC')::time>='15:10')
    or (last<current_date-3);
  select value into st from ai_state where key='fx_req';
  if need and (p_force or st is null or (st ? 'done' and (st->>'at')::timestamptz<now()-interval '18 minutes')) then
    insert into ai_state(key,value) values('fx_req',jsonb_build_object('req',net.http_get(url:='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',timeout_milliseconds:=20000),'at',now()))
    on conflict(key) do update set value=excluded.value, updated_at=now();
    return 'požiadavka odoslaná';
  end if;
  return 'netreba (posledný kurz '||coalesce(last::text,'—')||')';
end $$;
revoke all on function public.fx_tick(boolean) from public, anon, authenticated;

create or replace function public.fx_get() returns jsonb language sql stable security definer set search_path=public as $$
  with l as (select max(d) d from fx_rates), p as (select max(d) d from fx_rates where d<(select d from l))
  select jsonb_build_object('d',(select d from l),'prev_d',(select d from p),'src','ECB',
    'rates',coalesce((select jsonb_object_agg(cur,rate) from fx_rates where d=(select d from l)),'{}'::jsonb),
    'prev',coalesce((select jsonb_object_agg(cur,rate) from fx_rates where d=(select d from p) and cur in ('HUF','CZK','PLN','USD','RON','GBP','CHF')),'{}'::jsonb)) $$;
grant execute on function public.fx_get() to authenticated;

-- suma v mene p_from → p_to podľa kurzu ECB k dňu p_d (posledný známy deň ≤ p_d); EUR = 1
create or replace function public.fx_conv(p_amount numeric, p_from text, p_to text, p_d date default current_date) returns numeric language sql stable security definer set search_path=public as $$
  select case when p_amount is null then null else p_amount
    / nullif(case when upper(p_from)='EUR' then 1 else (select rate from fx_rates where cur=upper(p_from) and d<=coalesce(p_d,current_date) order by d desc limit 1) end,0)
    * case when upper(p_to)='EUR' then 1 else (select rate from fx_rates where cur=upper(p_to) and d<=coalesce(p_d,current_date) order by d desc limit 1) end end $$;
grant execute on function public.fx_conv(numeric,text,text,date) to authenticated;

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname='kurz-ecb';
  perform cron.schedule('kurz-ecb','*/20 * * * *','select public.fx_tick()');
end $$;
select public.fx_tick(true);
