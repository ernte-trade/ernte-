-- Aktivita tímu v aplikácii: kto, kedy, v ktorej časti, ako dlho, aké akcie (bez obsahu zadaných údajov)
-- zapisuje iba zamestnanec sám za seba, čítať a súhrny vidí iba majiteľ; hodinový súhrn ide do ERNTE AI Podpory
create table if not exists app_activity(
  id bigserial primary key, at timestamptz not null default now(),
  email text not null, name text, role text,
  kind text not null check (kind in ('session','tab','action','end')),
  what text, detail text, dur_s int check (dur_s is null or (dur_s>=0 and dur_s<=43200)), dev text);
create index if not exists app_activity_at on app_activity(at desc);
create index if not exists app_activity_em on app_activity(email, at desc);
alter table app_activity enable row level security;
drop policy if exists aa_ins on app_activity;
create policy aa_ins on app_activity for insert with check (is_staff() and lower(email)=lower(coalesce(auth.jwt()->>'email','')) and at>now()-interval '1 day' and at<now()+interval '5 minutes');
drop policy if exists aa_read on app_activity;
create policy aa_read on app_activity for select using (is_owner());
drop policy if exists aa_del on app_activity;
create policy aa_del on app_activity for delete using (is_owner());
revoke all on app_activity from anon; grant select, insert, delete on app_activity to authenticated; grant usage on sequence app_activity_id_seq to authenticated;
-- meno a rola sa doplnia zo staff (nedá sa podvrhnúť)
create or replace function public.aa_fill() returns trigger language plpgsql security definer set search_path=public as $$
begin select s.name, s.role into new.name, new.role from staff s where lower(s.email)=lower(new.email) limit 1;
  new.what:=left(new.what,80); new.detail:=left(new.detail,160); new.dev:=left(new.dev,60); return new; end $$;
drop trigger if exists aa_fill on app_activity;
create trigger aa_fill before insert on app_activity for each row execute function aa_fill();

create or replace function public.aa_label(w text) returns text language sql immutable as $$
  select case split_part(w,':',1)
    when 'home' then 'Prehľad' when 'req' then 'Požiadavky' when 'price' then 'Cenník' when 'trans' then 'Doprava' when 'fleet' then 'Flotila'
    when 'deals' then 'Obchody / vývoz' when 'farm' then 'Farmári' when 'wx' then 'Počasie' when 'team' then 'Tím' when 'calc' then 'Kalkulačka'
    when 'zuct' then 'Zúčtovanie' when 'agro' then 'Agro služby' else w end
  ||case when position(':' in w)>0 then ' › '||case split_part(w,':',2)
    when 'dash' then 'Prehľad' when 'fuel' then 'Nafta' when 'alarm' then 'Alarmy' when 'drv' then 'Vodiči' when 'veh' then 'Vozidlá' when 'map' then 'Mapa'
    when 'set' then 'Nastavenia' when 'perf' then 'Prevádzka' when 'money' then 'Peniaze' when 'yard' then 'Dvor' when 'moves' then 'Pohyby' else split_part(w,':',2) end else '' end $$;

-- textový súhrn za obdobie (majiteľ alebo plánovač)
create or replace function public.activity_summary(p_from timestamptz default now()-interval '1 hour', p_to timestamptz default now()) returns text
language plpgsql stable security definer set search_path=public as $$
declare r record; t text:=''; x record; n int:=0; tot int;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  for r in select email, max(name) nm, max(role) rl, min(at) od, max(at) do_,
      count(*) filter (where kind='session') ses, count(*) filter (where kind='action') act,
      coalesce(sum(dur_s) filter (where kind='tab'),0) sec, string_agg(distinct dev, ', ') filter (where dev is not null) dv
    from app_activity where at>=p_from and at<=p_to group by email order by sum(dur_s) filter (where kind='tab') desc nulls last loop
    n:=n+1;
    t:=t||E'\n### '||coalesce(r.nm,r.email)||coalesce(' ('||r.rl||')','')||E'\n'
      ||'- v aplikácii: **'||case when r.sec>=3600 then (r.sec/3600)||' h '||((r.sec%3600)/60)||' min' else greatest(1,r.sec/60)||' min' end||'**'
      ||' · prihlásení: '||r.ses||' · akcií: '||r.act||' · od '||to_char(r.od at time zone 'Europe/Bratislava','HH24:MI')||' do '||to_char(r.do_ at time zone 'Europe/Bratislava','HH24:MI')
      ||coalesce(' · zariadenie: '||r.dv,'')||E'\n';
    select string_agg(aa_label(what)||' '||case when s>=60 then (s/60)||' min' else s||' s' end, ' · ' order by s desc) into x
      from (select what, sum(dur_s)::int s from app_activity where email=r.email and kind='tab' and at>=p_from and at<=p_to and dur_s>0 group by what order by 2 desc limit 8) z;
    if x.string_agg is not null then t:=t||'- kde: '||x.string_agg||E'\n'; end if;
    select string_agg(to_char(at at time zone 'Europe/Bratislava','HH24:MI')||' '||aa_label(coalesce(split_part(detail,'@',2),''))||' – '||what, E'\n  - ' order by at desc) into x
      from (select at, what, detail from app_activity where email=r.email and kind='action' and at>=p_from and at<=p_to order by at desc limit 12) z;
    if x.string_agg is not null then t:=t||E'- posledné akcie:\n  - '||x.string_agg||E'\n'; end if;
  end loop;
  if n=0 then return null; end if;
  select coalesce(sum(dur_s),0) into tot from app_activity where kind='tab' and at>=p_from and at<=p_to;
  return '## 👥 Aktivita tímu v aplikácii · '||to_char(p_from at time zone 'Europe/Bratislava','DD.MM. HH24:MI')||' – '||to_char(p_to at time zone 'Europe/Bratislava','HH24:MI')
    ||E'\n'||n||' '||case when n=1 then 'človek' when n<5 then 'ľudia' else 'ľudí' end||' · spolu '||greatest(1,tot/60)||' min'||E'\n'||t;
end $$;
revoke all on function public.activity_summary(timestamptz,timestamptz) from public, anon; grant execute on function public.activity_summary(timestamptz,timestamptz) to authenticated;

-- súhrn do AI Podpory (na požiadanie z aplikácie alebo každú hodinu, ak niekto pracoval)
create or replace function public.activity_report(p_hours int default 1) returns bigint language plpgsql security definer set search_path=public as $$
declare s text; id bigint;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Iba majiteľ.'; end if;
  s:=activity_summary(now()-make_interval(hours=>greatest(1,least(coalesce(p_hours,1),168))), now());
  if s is null then if auth.uid() is null then return null; end if; s:='## 👥 Aktivita tímu'||E'\n'||'Za posledných '||coalesce(p_hours,1)||' h nikto z tímu aplikáciu nepoužíval.'; end if;
  insert into ai_msgs(kind,role,content,status) values('report','assistant',s,'ok') returning ai_msgs.id into id;
  return id;
end $$;
revoke all on function public.activity_report(int) from public, anon; grant execute on function public.activity_report(int) to authenticated;
do $$ begin
  begin perform cron.unschedule('aktivita-hodina'); exception when others then null; end;
  perform cron.schedule('aktivita-hodina','3 * * * *','select public.activity_report(1)');
  begin perform cron.unschedule('aktivita-cistenie'); exception when others then null; end;
  perform cron.schedule('aktivita-cistenie','40 3 * * *',$c$delete from public.app_activity where at<now()-interval '180 days'$c$);
end $$;
