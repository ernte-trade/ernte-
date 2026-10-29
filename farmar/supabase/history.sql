-- REGISTER PORUŠENÍ: spätne vyhodnoť všetky jazdy od 1. 7. 2026 (po dotiahnutí histórie z Commandera), bez upozornení na telefón
create or replace function public.history_events_tick() returns text language plpgsql security definer set search_path=public as $$
declare k int:=0; pend int; st jsonb;
begin
  select count(*) into pend from generate_series(date '2026-07-01', current_date-61, '1 day') g
   where not exists(select 1 from cmd_log b where b.kind='backfill' and b.url=g::date::text and (b.code=200 or coalesce(b.n,0)>=3));
  begin k:=k+ride_events_since(timestamptz '2026-07-01 00:00+02'); exception when others then insert into check_err as c(fn,msg,at) values('history_events',left(SQLERRM,300),now()) on conflict on constraint check_err_pkey do update set msg=excluded.msg, at=now(); end;
  begin k:=k+fuel_transfer_check(timestamptz '2026-07-01 00:00+02', false); exception when others then null; end;
  insert into check_err as c(fn,msg,ok_at,n) values('history_events',null,now(),k) on conflict on constraint check_err_pkey do update set msg=null, ok_at=now(), n=c.n+excluded.n;
  if pend=0 then
    select value into st from ai_state where key='history_events';
    if st is null then
      insert into ai_state(key,value) values('history_events',jsonb_build_object('done',now()));
      perform cron.unschedule('historia-porusenia');
      perform ai_report('REGISTER PORUŠENÍ OD 1. 7. 2026 – história z Commandera je kompletne načítaná. Vyhodnoť všetky nekalé pohyby nafty (poklesy v státí, tankovanie nesedí, prečerpanie) a porušenia vozidiel (rýchlosť nad 90 km/h, výpadky signálu) od 1. 7. 2026 po vodičoch a autách: počty, litre, € a najhoršie prípady s presnými časmi a miestami. Označ opakované vzorce (rovnaké miesto, čas, vodič). Pre vodičov s vážnymi prípadmi priprav VÝZVY NA VYSVETLENIE ako DOKUMENT (bez duplicít voči dokumenty_archiv). Majiteľ ich nájde v Flotila → Alarmy → Register porušení.');
    end if;
  end if;
  return 'nové záznamy: '||k||', dni na dotiahnutie: '||pend;
end $$;
revoke all on function public.history_events_tick() from public, anon, authenticated;
select cron.unschedule(jobname) from cron.job where jobname='historia-porusenia';
select cron.schedule('historia-porusenia','*/10 * * * *','select public.history_events_tick()');
