-- ===== ⏰ PRIPOMIENKY Z KALENDÁRA MAJITEĽA SO ZVONENÍM (ntfy priorita 5 + Web Push s požiadavkou na interakciu) =====
-- Ku každej udalosti: 1 deň vopred o 18:00, 1 hodinu a 15 minút pred začiatkom (+ vlastné časy z pripomienky).
-- Pri 15-minútovej pripomienke sa zvonenie opakuje každé 2 min (najviac 5×), kým neťukneš „Beriem na vedomie“
-- (v aplikácii, v upozornení aplikácie alebo tlačidlom v ntfy – HTTP volanie cal_ack s jednorazovým kódom).
-- Text: názov, čas, miesto, s kým, telefón (📞 Zavolať). Nové pozvanie / zrušenie stretnutia od iného používateľa = hneď, priorita 5.

alter table owner_cal add column if not exists who text, add column if not exists phone text;

create table if not exists cal_ring(tok text primary key, cal_id bigint references owner_cal(id) on delete cascade, created_at timestamptz not null default now(),
  tries int not null default 1, next_at timestamptz, acked_at timestamptz, via text, title text, body text);
create index if not exists cal_ring_open on cal_ring(next_at) where acked_at is null;
alter table cal_ring enable row level security;
revoke all on cal_ring from anon;
drop policy if exists cal_ring_main on cal_ring; create policy cal_ring_main on cal_ring for select using ((select main_ok()));
grant select on cal_ring to authenticated;

-- potvrdenie „Beriem na vedomie“: z ntfy (bez prihlásenia, iba s jednorazovým kódom) alebo z aplikácie
create or replace function public.cal_ack(p_tok text) returns text language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if coalesce(p_tok,'') !~ '^[0-9a-f]{24}$' then return 'neplatné'; end if;
  update cal_ring set acked_at=now(), via=case when auth.uid() is null then 'ntfy' else 'aplikácia' end where tok=p_tok and acked_at is null;
  get diagnostics n=row_count;
  if n=0 then return case when exists(select 1 from cal_ring where tok=p_tok) then 'už potvrdené' else 'neplatné' end; end if;
  -- potvrdené = aj ostatné zvonenia tej istej udalosti stíchnu
  update cal_ring set acked_at=now(), via='spolu' where acked_at is null and cal_id=(select cal_id from cal_ring where tok=p_tok);
  return 'ok';
end $$;
revoke all on function public.cal_ack(text) from public; grant execute on function public.cal_ack(text) to anon, authenticated;

create or replace function public.cal_ack_ev(p_id bigint) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if not main_ok() then raise exception 'Iba majiteľ.'; end if;
  update cal_ring set acked_at=now(), via='aplikácia' where cal_id=p_id and acked_at is null; get diagnostics n=row_count; return n;
end $$;
revoke all on function public.cal_ack_ev(bigint) from public, anon; grant execute on function public.cal_ack_ev(bigint) to authenticated;

-- upozornenia kalendára a stretnutí: iba Martin (téma kalendára + jeho zariadenia)
create or replace function public.main_push(p_title text, p_msg text, p_prio int default 4, p_tag text default 'calendar') returns void language plpgsql security definer set search_path=public as $$
begin
  if not coalesce((push_cfg()->'cal'->>'on')::boolean,true) then return; end if;
  perform push_send('cal',coalesce(p_tag,'calendar'),left(md5(coalesce(p_title,'')||coalesce(p_msg,'')),12),p_title,p_msg,coalesce(p_prio,4),
    'https://ernte-trade.github.io/ernte-/farmar/#kalendar','cal',array[coalesce(p_tag,'calendar')],interval '1 minute',push_main_emails(),true,
    case when coalesce(p_prio,4)>=5 then '{"ri":true}'::jsonb end);
exception when others then null;
end $$;
revoke all on function public.main_push(text,text,int,text) from public, anon, authenticated;

-- jedna pripomienka (zvonenie): ntfy priorita 5 s tlačidlami, Web Push s potvrdením
create or replace function public.cal_send(p_id bigint, p_lbl text, p_ring boolean, p_try int default 1) returns text language plpgsql security definer set search_path=public as $$
declare c owner_cal; tok text; ttl text; body text; acts jsonb:='[]'::jsonb; ext jsonb; an text:=push_cfg()->>'anon'; ph text; tz text:='Europe/Bratislava';
  ackurl text:='https://cflliscddsgleyeykzje.supabase.co/rest/v1/rpc/cal_ack'; aud boolean;
begin
  select * into c from owner_cal where id=p_id; if c.id is null then return null; end if;
  ph:=nullif(regexp_replace(coalesce(c.phone,''),'[^0-9+]','','g'),'');
  aud:=exists(select 1 from owner_cal_audio a where a.cal_id=c.id);
  ttl:=case when p_try>1 then '🔔 '||p_try||'/6 · ' else '' end||'⏰ '||c.title;
  body:=concat_ws(' · ',p_lbl,to_char(c.start_at at time zone tz,case when c.all_day then 'DD.MM. "celý deň"' else 'DD.MM. HH24:MI' end),case when c.place is not null then '📍 '||c.place end)
    ||case when c.who is not null or ph is not null then E'\n'||concat_ws(' · ',case when c.who is not null then '👤 '||c.who end,case when ph is not null then '📞 '||ph end) else '' end
    ||case when c.note is not null then E'\n'||left(c.note,160) else '' end||case when aud then E'\n🎙️ Hlasovka – otvor Kalendár' else '' end;
  if p_ring then
    tok:=encode(extensions.gen_random_bytes(12),'hex');
    insert into cal_ring(tok,cal_id,next_at,title,body,tries) values(tok,c.id,now()+interval '2 minutes',c.title,body,p_try);
    if coalesce(an,'')<>'' then
      acts:=acts||jsonb_build_array(jsonb_build_object('action','http','label','✓ Beriem na vedomie','url',ackurl,'method','POST',
        'headers',jsonb_build_object('apikey',an,'Authorization','Bearer '||an,'Content-Type','application/json'),'body',jsonb_build_object('p_tok',tok)::text,'clear',true));
    end if;
  end if;
  if ph is not null then acts:=acts||jsonb_build_array(jsonb_build_object('action','view','label','📞 Zavolať','url','tel:'||ph)); end if;
  acts:=acts||jsonb_build_array(jsonb_build_object('action','view','label','📅 Kalendár','url','https://ernte-trade.github.io/ernte-/farmar/#kalendar'));
  ext:=jsonb_build_object('ri',true)||case when ph is not null then jsonb_build_object('tel',ph) else '{}'::jsonb end
    ||case when tok is not null and coalesce(an,'')<>'' then jsonb_build_object('ack',jsonb_build_object('u',ackurl,'k',an,'b',jsonb_build_object('p_tok',tok))) else '{}'::jsonb end;
  return push_send('cal','remind',c.id::text||':'||coalesce(tok,p_lbl),ttl,body,5,'https://ernte-trade.github.io/ernte-/farmar/#kalendar'||case when tok is not null then '/ack/'||tok else '' end,
    'cal',array['alarm_clock'],null,push_main_emails(),true,ext,acts,'https://ernte-trade.github.io/ernte-/farmar/#kalendar','high');
end $$;
revoke all on function public.cal_send(bigint,text,boolean,int) from public, anon, authenticated;

-- každú minútu (cron ernte-kalendar)
create or replace function public.owner_cal_tick() returns int language plpgsql security definer set search_path=public as $$
declare c owner_cal; due int[]; std int[]; k int:=0; step interval; left_m int; lbl text; tl date; ts date; r cal_ring; tz text:='Europe/Bratislava'; mn int;
begin
  if not coalesce((push_cfg()->'cal'->>'on')::boolean,true) then return 0; end if;
  for c in select * from owner_cal where not done and start_at>now()-interval '1 day' and start_at<now()+interval '8 days' loop
    -- štandard pre každú udalosť: deň vopred o 18:00 (-1), 1 h, 15 min; „som obsadený“ iba vlastné časy; celodenné: deň vopred + vlastné
    std:=case when c.kind='blok' then '{}'::int[] when c.all_day then array[-1] else array[-1,60,15] end;
    select array_agg(distinct m) into due from unnest(std||coalesce(c.remind_min,'{}')) m
      where not (m=any(coalesce(c.reminded,'{}')))
        and case when m=-1 then now()>=((((c.start_at at time zone tz)::date-1)+time '18:00') at time zone tz) and c.start_at>now()
                 else c.start_at-make_interval(mins=>m)<=now() end;
    if due is null then continue; end if;
    update owner_cal set reminded=coalesce(reminded,'{}')||due where id=c.id;
    if c.start_at+interval '30 minutes'<=now() then continue; end if;
    left_m:=ceil(extract(epoch from c.start_at-now())/60.0)::int; tl:=(now() at time zone tz)::date; ts:=(c.start_at at time zone tz)::date;
    lbl:=case when left_m<=1 then 'Teraz' when left_m<60 then 'O '||left_m||' min' when ts=tl then 'Dnes o '||to_char(c.start_at at time zone tz,'HH24:MI')
      when ts=tl+1 then 'Zajtra' else 'O '||(ts-tl)||' dni' end;
    select min(m) into mn from unnest(due) m where m>=0;
    perform cal_send(c.id,lbl,not c.all_day and mn is not null and mn<=15 and left_m>-5,1);
    k:=k+1;
  end loop;
  -- opakované zvonenie každé 2 min, najviac 5×, kým nepotvrdíš
  for r in select * from cal_ring where acked_at is null and next_at<=now() and tries<6 and created_at>now()-interval '40 minutes' order by created_at loop
    update cal_ring set next_at=null where tok=r.tok;   -- toto zvonenie sa vybavilo; ďalšie má vlastný kód
    if exists(select 1 from cal_ring x where x.cal_id=r.cal_id and x.acked_at is not null) then continue; end if;
    if exists(select 1 from owner_cal o where o.id=r.cal_id and (o.done or o.start_at<now()-interval '10 minutes')) then continue; end if;
    select * into c from owner_cal where id=r.cal_id;
    left_m:=ceil(extract(epoch from c.start_at-now())/60.0)::int;
    perform cal_send(r.cal_id,case when left_m<=1 then 'Teraz' else 'O '||left_m||' min' end,true,r.tries+1);
    k:=k+1;
  end loop;
  delete from cal_ring where created_at<now()-interval '30 days';
  -- opakované udalosti: posun na ďalší termín
  for c in select * from owner_cal where not done and rep is not null and start_at<now()-interval '1 hour' loop
    step:=case c.rep when 'den' then interval '1 day' when 'tyzden' then interval '7 days' when 'mesiac' then interval '1 month' else interval '1 year' end;
    while c.start_at<now() loop c.start_at:=c.start_at+step; if c.end_at is not null then c.end_at:=c.end_at+step; end if; end loop;
    update owner_cal set start_at=c.start_at, end_at=c.end_at, reminded='{}' where id=c.id;
  end loop;
  return k;
end $$;
revoke all on function public.owner_cal_tick() from public, anon, authenticated;

-- zrušenie stretnutia používateľom = hneď, priorita 5
create or replace function public.meet_cancel(p_id bigint) returns void language plpgsql security definer set search_path=public as $$
declare m meet_req;
begin
  update meet_req set status='zrusena', decided_at=now() where id=p_id and lower(who_email)=lower(auth.jwt()->>'email') and status in ('nova','potvrdena','presunuta') returning * into m;
  if m.id is null then raise exception 'Termín sa nedá zrušiť.'; end if;
  update owner_cal set done=true, note=coalesce(note||E'\n','')||'❌ Zrušil '||coalesce(m.who_name,'') where meet_id=m.id;
  update cal_ring set acked_at=now(), via='zrušené' where acked_at is null and cal_id in (select id from owner_cal where meet_id=m.id);
  perform main_push('📅 Stretnutie zrušené · '||coalesce(m.who_name,''),to_char(m.start_at at time zone 'Europe/Bratislava','DD.MM. HH24:MI')||coalesce(' · 📍 '||m.place,'')||E'\n'||left(coalesce(m.topic,''),160),5,'calendar');
end $$;
revoke all on function public.meet_cancel(bigint) from public, anon; grant execute on function public.meet_cancel(bigint) to authenticated;

-- telefón človeka zo žiadosti (farmár / Tím)
create or replace function public.meet_phone(p_email text, p_farmer uuid) returns text language sql stable security definer set search_path=public as $$
  select coalesce((select nullif(trim(phone),'') from farmers where id=p_farmer),
                  (select nullif(trim(s.phone),'') from staff s where lower(s.email)=lower(p_email)),
                  (select nullif(trim(phone),'') from farmers where lower(coalesce(login,''))=lower(p_email) or lower(coalesce(email,''))=lower(p_email) limit 1)) $$;
revoke all on function public.meet_phone(text,uuid) from public, anon, authenticated;

create or replace function public.meet_decide(p_id bigint, p_act text, p_reply text default null, p_start timestamptz default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare m meet_req; dur interval; cid bigint; ph text;
begin
  if not main_ok() then raise exception 'Iba majiteľ.'; end if;
  select * into m from meet_req where id=p_id; if m.id is null then raise exception 'Žiadosť neexistuje.'; end if;
  dur:=m.end_at-m.start_at;
  if p_act='move' then
    if p_start is null then raise exception 'Vyber nový termín.'; end if;
    if meet_busy(p_start,p_start+dur,m.id) then raise exception 'Tento čas už máš obsadený.'; end if;
    update meet_req set start_at=p_start, end_at=p_start+dur where id=m.id; m.start_at:=p_start; m.end_at:=p_start+dur;
  end if;
  if p_act in ('ok','move') then
    begin ph:=meet_phone(m.who_email,m.farmer_id); exception when others then ph:=null; end;
    update owner_cal set done=true where meet_id=m.id;
    insert into owner_cal(kind,title,note,place,start_at,end_at,remind_min,meet_id,who,phone) values('stretnutie','🤝 '||coalesce(m.who_name,m.who_email),m.topic||coalesce(E'\n'||nullif(p_reply,''),''),m.place,m.start_at,m.end_at,'{1440,60,15}',m.id,coalesce(m.who_name,m.who_email),ph) returning id into cid;
    update meet_req set status=case when p_act='move' then 'presunuta' else 'potvrdena' end, reply=nullif(p_reply,''), cal_id=cid, decided_at=now() where id=m.id;
  elsif p_act='no' then
    update meet_req set status='zamietnuta', reply=nullif(p_reply,''), decided_at=now() where id=m.id; update owner_cal set done=true where meet_id=m.id;
  else raise exception 'Neznáma akcia.'; end if;
  return (select to_jsonb(x) from meet_req x where id=m.id);
end $$;
revoke all on function public.meet_decide(bigint,text,text,timestamptz) from public, anon; grant execute on function public.meet_decide(bigint,text,text,timestamptz) to authenticated;

-- pri zapnutí: štandardné pripomienky, ktorých čas už uplynul, sa neposielajú dodatočne (žiadne zvonenie v noci po nasadení)
update owner_cal c set reminded=coalesce(c.reminded,'{}')||coalesce((select array_agg(m) from unnest(array[-1,60,15]) m
   where not (m=any(coalesce(c.reminded,'{}'))) and case when m=-1 then now()>=((((c.start_at at time zone 'Europe/Bratislava')::date-1)+time '18:00') at time zone 'Europe/Bratislava')
                                                 else c.start_at-make_interval(mins=>m)<=now() end),'{}')
 where not c.done and c.start_at>now()-interval '1 day';

-- už potvrdené stretnutia: doplniť s kým a telefón
update owner_cal o set who=coalesce(o.who,m.who_name,m.who_email), phone=coalesce(o.phone,meet_phone(m.who_email,m.farmer_id)) from meet_req m where o.meet_id=m.id and (o.who is null or o.phone is null);

do $$ begin
  begin perform cron.unschedule('ernte-kalendar'); exception when others then null; end;
  perform cron.schedule('ernte-kalendar','* * * * *','select public.owner_cal_tick()');
end $$;
