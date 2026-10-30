-- 📡 Žiadosť podpore Commandera o rozšírenie práv API (VALKO s.r.o.) – odoslanie z e-mailu aplikácie a kontrola po 3 pracovných dňoch
-- Stav v ai_state 'cmd_support': {to, sent_at, by, check_at, checked_at, code, ok}

create or replace function public.add_workdays(p_from timestamptz, p_n int) returns timestamptz language plpgsql immutable as $$
declare d timestamptz:=p_from; i int:=0;
begin
  while i<p_n loop d:=d+interval '1 day'; if extract(isodow from d at time zone 'Europe/Bratislava')<6 then i:=i+1; end if; end loop;
  return d;
end $$;

create or replace function public.cmd_refuel_code() returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('code',code,'at',at) from cmd_log where acc='main' and kind='refuel' and code is not null order by at desc limit 1 $$;
revoke all on function public.cmd_refuel_code() from public, anon, authenticated;

create or replace function public.cmd_support_get() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner() then return null; end if;
  return coalesce((select value from ai_state where key='cmd_support'),'{}'::jsonb)||jsonb_build_object('refuel',cmd_refuel_code(),'valko_mail',coalesce(mail_cfg_get('valko') is not null,false),'ernte_mail',coalesce(mail_cfg_get('ernte') is not null,false));
end $$;
revoke all on function public.cmd_support_get() from public, anon; grant execute on function public.cmd_support_get() to authenticated;

create or replace function public.cmd_support_save(p_to text) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if coalesce(trim(p_to),'')<>'' and lower(trim(p_to)) !~ '^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$' then raise exception 'Neplatná e-mailová adresa.'; end if;
  insert into ai_state(key,value) values('cmd_support',jsonb_build_object('to',lower(trim(coalesce(p_to,'')))))
    on conflict(key) do update set value=ai_state.value||excluded.value, updated_at=now();
  return cmd_support_get();
end $$;
revoke all on function public.cmd_support_save(text) from public, anon; grant execute on function public.cmd_support_save(text) to authenticated;

create or replace function public.cmd_support_send(p_to text, p_subject text, p_body text) returns jsonb language plpgsql security definer set search_path=public as $$
declare pr text; jid uuid; ck timestamptz;
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  pr:=case when mail_cfg_get('valko') is not null then 'valko' else 'ernte' end;
  jid:=mail_send(p_to,p_subject,p_body,null,null,null,pr);
  ck:=add_workdays(now(),3);
  insert into ai_state(key,value) values('cmd_support','{}'::jsonb) on conflict(key) do nothing;
  update ai_state set value=value||jsonb_build_object('to',lower(trim(p_to)),'sent_at',now(),'by',auth.jwt()->>'email','job',jid,'profile',pr,'check_at',ck,'checked_at',null,'ok',null,'code',null), updated_at=now()
   where key='cmd_support';
  return cmd_support_get();
end $$;
revoke all on function public.cmd_support_send(text,text,text) from public, anon; grant execute on function public.cmd_support_send(text,text,text) to authenticated;

create or replace function public.cmd_support_tick() returns int language plpgsql security definer set search_path=public as $$
declare s jsonb; c jsonb; ok boolean;
begin
  select value into s from ai_state where key='cmd_support';
  if s is null or s->>'sent_at' is null or s->>'checked_at' is not null or (s->>'check_at')::timestamptz>now() then return 0; end if;
  c:=cmd_refuel_code();
  ok:=coalesce((c->>'code')::int,0)=200 and (c->>'at')::timestamptz>(s->>'sent_at')::timestamptz;
  update ai_state set value=value||jsonb_build_object('checked_at',now(),'ok',ok,'code',c->>'code'), updated_at=now() where key='cmd_support';
  begin
    if ok then perform owner_push('✅ Commander povolil tankovania','Import tankovaní (refueling imports) vracia 200 – tankovania z kariet sa načítajú samé.',3,'white_check_mark');
    else perform owner_push('📡 Commander ešte nepovolil tankovania','Od žiadosti ('||to_char((s->>'sent_at')::timestamptz at time zone 'Europe/Bratislava','DD. MM. YYYY')||') prešli 3 pracovné dni a refueling imports stále vracia '||coalesce(c->>'code','bez odpovede')||'. Flotila → Nastavenia → 📡 Commander → pošli pripomienku.',4,'warning'); end if;
  exception when others then null; end;
  return 1;
end $$;
revoke all on function public.cmd_support_tick() from public, anon, authenticated;

do $$ begin
  begin perform cron.unschedule('commander-podpora'); exception when others then null; end;
  perform cron.schedule('commander-podpora','17 * * * *','select public.cmd_support_tick()');
end $$;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-10-30','✉️ Žiadosť podpore Commandera o práva API','Flotila → Nastavenia → 📡 Commander','iba majiteľ',array['owner'],
 'Pole „E-mail podpory Commander“ a pripravený e-mail od VALKO s.r.o. (refueling imports spätne od 1. 10. 2026, tacho, contracts, costcenters, deletedVehicles). Tlačidlo Odoslať pošle e-mail z aplikácie, zapíše dátum a o 3 pracovné dni overí tankovania – ak stále nejdú, príde upozornenie.'
where not exists(select 1 from app_novinky where titul like '✉️ Žiadosť podpore Commandera%');
insert into app_dni(d,kratko,podrobne) values('2026-10-30','Stráž obchodov, archív, doména app.ernte.sk, žiadosť Commanderu',
 'Stráž obchodov (nad cenníkom so schválením, nadodávka, vlastná firma, obchádzanie zmluvy), archív obchodov a testovací farmári mimo súčtov, vlastná doména app.ernte.sk s kontrolou DNS/HTTPS a API registrátora, žiadosť podpore Commandera o práva API.')
on conflict(d) do update set podrobne=coalesce(app_dni.podrobne,'')||case when coalesce(app_dni.podrobne,'') like '%Stráž obchodov (nad cenníkom%' then '' else ' · Večer: stráž obchodov (nad cenníkom, nadodávka, vlastná firma, obchádzanie zmluvy), archív obchodov, testovací farmári mimo súčtov, doména app.ernte.sk, žiadosť Commanderu o práva API.' end, updated_at=now();
select 'commander podpora ok';
