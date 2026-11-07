-- ===== 🚨 PUSH UPOZORNENIA PRE ALARMY FLOTILY (tabuľka fleet_events) =====
-- VYSOKÝ (hneď, priorita 5, aj v noci): Zaplatené, ale nie v nádrži · pokles v státí ≥ 30 l (mimo výpadku dát a artefaktu snímača)
--   · Možné prečerpanie medzi autami · N3 nad 100 km/h (obmedzovač) · aktívne auto bez signálu nad 12 h
-- STREDNÝ (hodinový súhrn push-hodina, 22:00–5:00 nie – do ranného súhrnu): tankovanie nesedí · rýchlosť N2/N3 nad 90, M1/N1 nad 130
--   · karta jedného auta, nafta v inom · možná kabotáž
-- NÍZKY (iba ranný súhrn o 5:00): výpadok dát, tankovanie mimo pracovného času, 2 tankovania do 4 h, ďaleko od trasy, malé poklesy
-- Neposiela sa: vyriešené / falošné, auto na servise alebo odstavené, artefakt / nekalibrovaný snímač, spätne prepočítané (staršie ako 24 h).
-- Rovnaké auto + rovnaký typ alarmu najviac raz za 2 h. Pôvodné okamžité ntfy správy z jednotlivých kontrol sú vypnuté (posiela push centrum).

create or replace function public.fleet_inline_topic() returns text language sql stable security definer set search_path=public as $$
  select case when coalesce((push_cfg()->'fleet'->>'on')::boolean,true) then null else (select value->>'topic' from fleet_cfg where key='notify') end $$;
revoke all on function public.fleet_inline_topic() from public, anon, authenticated;

create table if not exists push_fev(id bigint primary key, seen_at timestamptz not null default now(), done_at timestamptz, lvl text, res text);
alter table push_fev enable row level security;
revoke all on push_fev from anon;
drop policy if exists push_fev_own on push_fev; create policy push_fev_own on push_fev for select using ((select is_owner()));
-- všetko, čo už v tabuľke je, sa neposiela (história)
insert into push_fev(id,done_at,res) select id, now(), 'pred zapnutím' from fleet_events on conflict (id) do nothing;

create or replace function public.fleet_alarm_kinds() returns text[] language sql immutable as $$
  select array['paid_not_tank','fuel_drop','fuel_transfer','limiter','no_signal','refuel_gap','speed','card_swap','cabotage','data_gap','card_offhours','card_double','card_far'] $$;

-- počet otvorených alarmov (odznak na ikone aplikácie)
create or replace function public.push_badge(p_after bigint default 0) returns jsonb language sql stable security definer set search_path=public as $$
  select case when is_fleet() then (select jsonb_build_object('n',count(*) filter (where e.id>coalesce(p_after,0)),'all',count(*),'max',coalesce(max(e.id),0))
    from fleet_events e join push_fev p on p.id=e.id
   where e.kind=any(fleet_alarm_kinds()) and coalesce(e.st,'novy')='novy' and e.flag is null and e.at>now()-interval '3 days' and p.res in ('odoslané','súhrn'))
  else '{"n":0,"all":0,"max":0}'::jsonb end $$;
revoke all on function public.push_badge(bigint) from public, anon; grant execute on function public.push_badge(bigint) to authenticated;

create or replace function public.fleet_push_scan() returns int language plpgsql security definer set search_path=public as $$
declare c jsonb:=push_cfg()->'fleet'; e record; lv text; vt text; lim int; ttl text; body text; ico text; lab text; cb numeric; eur numeric; k int:=0; tz text:='Europe/Bratislava';
  url text; plc text; drv text; badge int; rs text; gap numeric;
begin
  if not coalesce((c->>'on')::boolean,true) then
    update push_fev set done_at=now(), res='vypnuté' where done_at is null;
    insert into push_fev(id,done_at,res) select id, now(), 'vypnuté' from fleet_events f where f.kind=any(fleet_alarm_kinds()) and f.id>(select coalesce(max(id),0)-20000 from push_fev)
      on conflict (id) do nothing;
    return 0;
  end if;
  -- nové alarmy: zaznamenať prvé videnie (spracujú sa o 2 min, pokles nafty o 12 min – kým kontroly doplnia príznaky artefakt/kalibrácia/servis)
  insert into push_fev(id) select f.id from fleet_events f
    where f.id>(select coalesce(max(id),0)-20000 from push_fev) and f.kind=any(fleet_alarm_kinds()) on conflict (id) do nothing;
  cb:=round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3);
  for e in select f.*, p.seen_at from push_fev p join fleet_events f on f.id=p.id
            where p.done_at is null and p.seen_at<=now()-case when f.kind='fuel_drop' then interval '12 minutes' else interval '2 minutes' end
            order by f.id limit 200 loop
    rs:=null; lv:=null;
    vt:=coalesce(veh_vtype(e.vehicle_id),'');
    gap:=extract(epoch from coalesce(e.t_to,e.at)-coalesce(e.t_from,e.at))/3600.0;
    if e.at<now()-interval '24 hours' then rs:='historický (spätný prepočet)';
    elsif coalesce(e.st,'novy') in ('vyriesene','falosny') then rs:='vyriešený / falošný';
    elsif e.flag is not null then rs:='príznak '||e.flag;
    elsif e.vehicle_id is not null and veh_off(e.vehicle_id) then rs:='auto na servise / odstavené';
    end if;
    if rs is null then
      lv:=case
        when e.kind in ('paid_not_tank','fuel_transfer','limiter','no_signal') then 'high'
        when e.kind='fuel_drop' and coalesce(e.liters,0)>=30 and coalesce(gap,0)<=1 then 'high'
        when e.kind='fuel_drop' and coalesce(e.liters,0)>=30 then 'mid'
        when e.kind='fuel_drop' then 'low'
        when e.kind='speed' and vt in ('osobne_m1','dodavka_n1') then case when coalesce(e.kmh,0)>130 then 'mid' end
        when e.kind='speed' and vt in ('tahac_n3','sklapac_n3') and coalesce(e.kmh,0)>100 then null   -- pokryje alarm obmedzovača (N3 nad 100)
        when e.kind='speed' then case when coalesce(e.kmh,0)>90 then 'mid' end
        when e.kind in ('refuel_gap','card_swap','cabotage') then 'mid'
        else 'low' end;
      if lv is null then rs:='nie je nad limit';
      elsif not coalesce((c->>lv)::boolean,true) then rs:='stupeň vypnutý';
      elsif exists(select 1 from push_log l where l.src='fleet' and l.kind=e.kind and l.obj=coalesce(veh_canon(e.vehicle_id),e.plate) and l.at>now()-interval '2 hours' and l.channel in ('ntfy','web','queue','none')) then
        rs:='duplicita (2 h)';
      end if;
    end if;
    if rs is not null then update push_fev set done_at=now(), lvl=lv, res=rs where id=e.id; continue; end if;
    select ic, lb into ico, lab from (values
      ('paid_not_tank','⛽❗','Zaplatené, ale nie v nádrži'),('fuel_drop','⛽','Pokles nafty v státí'),('fuel_transfer','🔁','Možné prečerpanie medzi autami'),
      ('limiter','🛑','N3 nad 100 km/h – obmedzovač'),('no_signal','📡','Aktívne auto bez signálu'),('refuel_gap','🧾','Tankovanie nesedí'),('speed','🏁','Rýchlosť nad limit'),
      ('card_swap','💳','Karta jedného auta, nafta v inom'),('cabotage','🇪🇺','Možná kabotáž'),('data_gap','⏸️','Výpadok dát'),('card_offhours','🌙','Tankovanie mimo pracovného času'),
      ('card_double','⏱️','Dve tankovania do 4 h'),('card_far','📏','Tankovanie ďaleko od trasy')) x(k,ic,lb) where x.k=e.kind;
    eur:=case when e.kind in ('paid_not_tank','fuel_drop','fuel_transfer','refuel_gap','card_swap') and e.liters is not null then round(abs(e.liters)*cb) end;
    plc:=nullif(trim(coalesce(e.place,'')),''); drv:=case when fleet_unknown(e.driver) then null else trim(e.driver) end;
    ttl:=coalesce(ico,'🚨')||' '||coalesce(e.plate,e.vehicle_id,'auto')||' · '||coalesce(lab,e.kind)||case when lv='high' then ' · VYSOKÝ' else '' end;
    body:=concat_ws(' · ', case when drv is not null then 'vodič '||drv end, to_char(e.at at time zone tz,'DD.MM. HH24:MI'), left(plc,60),
      case when e.kind in ('speed','limiter') and e.kmh is not null then e.kmh||' km/h'
           when e.kind='no_signal' and e.minutes is not null then 'bez signálu '||round(e.minutes/60.0)||' h'
           when e.liters is not null then round(abs(e.liters))||' l'||case when eur is not null then ' ≈ '||eur||' € bez DPH' else '' end end);
    url:='https://ernte-trade.github.io/ernte-/farmar/#flotila/alarm/ev'||e.id;
    if lv='high' then
      select count(*)::int into badge from fleet_events f where f.kind=any(fleet_alarm_kinds()) and coalesce(f.st,'novy')='novy' and f.flag is null and f.at>now()-interval '3 days';
      perform push_send('fleet',e.kind,coalesce(veh_canon(e.vehicle_id),e.plate),ttl,body,5,url,'fleet',array['rotating_light'],null,null,true,
        jsonb_build_object('badge',badge,'ri',true),null,url,'high');
      update push_fev set done_at=now(), lvl=lv, res='odoslané' where id=e.id;
    else
      perform push_enqueue('fleet',e.kind,coalesce(veh_canon(e.vehicle_id),e.plate),lv,case when lv='mid' then 4 else 3 end,ttl,body,url,'fleet',
        case when lv='mid' and not push_quiet('fleet') then 'hour' else 'morning' end);
      update push_fev set done_at=now(), lvl=lv, res='súhrn' where id=e.id;
    end if;
    k:=k+1;
  end loop;
  delete from push_fev where done_at<now()-interval '120 days' and id<(select max(id)-50000 from push_fev);
  return k;
end $$;
revoke all on function public.fleet_push_scan() from public, anon, authenticated;
create or replace function public.cabotage_check(since timestamptz default now()-interval '14 days', push boolean default true) returns int
language plpgsql security definer set search_path=public, extensions, net as $$
declare t text; k int:=0; v record; r record; s record; tz text:='Europe/Bratislava'; f text:='DD.MM.YYYY HH24:MI';
  sid int; ck text; cc text; c1 text; c2 text; prev_stop timestamptz; pl text;
  host text; anchor timestamptz; anchor_addr text; cnt int; ops jsonb; msg text; isnew boolean; drvs text; skey text; lst text;
begin
  t:=fleet_inline_topic();  -- alarmy posiela push centrum (fleet_push_scan)
  create temp table if not exists _cab_r(vid text, sid int, kind text, cc text, start_at timestamptz, stop_at timestamptz, a1 text, a2 text,
    la1 numeric, lo1 numeric, la2 numeric, lo2 numeric, km numeric, drv text) on commit drop;
  for v in select c.id, coalesce(nullif(trim(c.plate),''),c.name,c.id) plate from cmd_vehicles c where c.fleet='eu' and c.alias_of is null loop
    truncate _cab_r; sid:=0; ck:=null; cc:=null; prev_stop:=null;
    -- 1) jazdy → úseky: int = prechod hranice + pokračovanie do prvého státia 90+ min (vyloženie), dom = preprava v jednom štáte, sk = Slovensko, x = neznámy štát
    for r in select * from rides where vehicle_id=any(veh_ids(v.id)) and start_at>=since-interval '10 days' and start_at is not null order by start_at, stop_at loop
      if prev_stop is not null and r.start_at<prev_stop-interval '2 minutes' then continue; end if; -- duplicita z druhej GPS jednotky
      c1:=ride_cc(r.start_addr,r.lat_start,r.lon_start); c2:=ride_cc(r.stop_addr,r.lat_stop,r.lon_stop);
      if c1 is null and c2 is null then sid:=sid+1; ck:='x'; cc:=null;
      elsif coalesce(c1,c2)<>coalesce(c2,c1) then sid:=sid+1; ck:='int'; cc:=c2;
      else c1:=coalesce(c1,c2);
        if c1='SK' then sid:=sid+1; ck:='sk'; cc:='SK';
        elsif ck in ('int','dom') and cc=c1 and prev_stop is not null and r.start_at-prev_stop<interval '90 minutes' then null; -- pokračovanie tej istej prepravy
        else sid:=sid+1; ck:='dom'; cc:=c1; end if;
      end if;
      insert into _cab_r values(v.id,sid,ck,cc,r.start_at,coalesce(r.stop_at,r.start_at+make_interval(secs=>coalesce(r.duration,0))),r.start_addr,r.stop_addr,r.lat_start,r.lon_start,r.lat_stop,r.lon_stop,coalesce(r.distance,0),
        case when not fleet_unknown(r.driver) then trim(r.driver) end);
      prev_stop:=greatest(coalesce(prev_stop,r.start_at),coalesce(r.stop_at,r.start_at));
    end loop;
    -- 2) okno 7 dní od vyloženia
    host:=null; anchor:=null; anchor_addr:=null; cnt:=0; ops:='[]';
    for s in select x.sid, x.kind, x.cc, min(x.start_at) t0, max(x.stop_at) t1, sum(x.km) km,
                    (array_agg(x.a1 order by x.start_at))[1] a1, (array_agg(x.a2 order by x.start_at desc))[1] a2,
                    (array_agg(x.la1 order by x.start_at))[1] la1, (array_agg(x.lo1 order by x.start_at))[1] lo1,
                    (array_agg(x.la2 order by x.start_at desc))[1] la2, (array_agg(x.lo2 order by x.start_at desc))[1] lo2,
                    string_agg(distinct x.drv, ', ') drv
               from _cab_r x group by x.sid, x.kind, x.cc order by x.sid loop
      if s.kind='int' then
        if s.cc is not null and s.cc<>'SK' then host:=s.cc; anchor:=s.t1; anchor_addr:=coalesce(s.a2,round(s.la2,4)||', '||round(s.lo2,4)); else host:=null; anchor:=null; end if;
        cnt:=0; ops:='[]';
      elsif s.kind='sk' then host:=null; anchor:=null; cnt:=0; ops:='[]';
      elsif s.kind='dom' then
        if s.cc is distinct from host or anchor is null then host:=s.cc; anchor:=null; cnt:=0; ops:='[]';
        elsif s.km>=20 and s.t0<=anchor+interval '7 days' then
          cnt:=cnt+1;
          ops:=ops||jsonb_build_array(jsonb_build_object('t0',s.t0,'t1',s.t1,'a1',coalesce(s.a1,round(s.la1,4)||', '||round(s.lo1,4)),'a2',coalesce(s.a2,round(s.la2,4)||', '||round(s.lo2,4)),
                                                         'km',round(s.km),'drv',s.drv,'la',s.la1,'lo',s.lo1));
          if cnt>=3 and (s.t0>=greatest(since,'2026-07-01 00:00+02'::timestamptz) or exists(select 1 from fleet_events where src_key='cab:'||v.id||':'||to_char(anchor at time zone 'UTC','YYYYMMDDHH24MI'))) then
            skey:='cab:'||v.id||':'||to_char(anchor at time zone 'UTC','YYYYMMDDHH24MI');
            select string_agg(n||') '||to_char((e->>'t0')::timestamptz at time zone tz,f)||' '||(e->>'a1')||' → '||to_char((e->>'t1')::timestamptz at time zone tz,f)||' '||(e->>'a2')
                              ||' ('||(e->>'km')||' km'||coalesce(', '||(e->>'drv'),'')||')', ' · ' order by n),
                   string_agg(distinct e->>'drv', ', ')
              into lst, drvs from jsonb_array_elements(ops) with ordinality q(e,n);
            msg:='Možná kabotáž – '||cc_name(host)||' ('||host||'): '||cnt||' vnútroštátne prepravy do 7 dní od vyloženia medzinárodnej prepravy (vyloženie '
               ||to_char(anchor at time zone tz,f)||', '||coalesce(anchor_addr,'?')||'). Prepravy: '||lst||' · stupeň VYSOKÝ';
            insert into fleet_events as e(vehicle_id,plate,kind,at,driver,place,place_kind,lat,lon,t_from,t_to,note,src_key)
              values(v.id,v.plate,'cabotage',s.t1,coalesce(s.drv,drvs),cc_name(host)||': '||(ops->-1->>'a1')||' → '||(ops->-1->>'a2'),'country',s.la1,s.lo1,anchor,s.t1,msg,skey)
              on conflict (src_key) do update set note=excluded.note, t_to=excluded.t_to, driver=excluded.driver
              returning (xmax=0) into isnew;
            if isnew then k:=k+1; end if;
            if isnew and push and t is not null and s.t1>now()-interval '6 hours' then
              begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KABOTÁŽ – '||v.plate,'message','⚠️ '||v.plate||' · '||msg,
                'tags',jsonb_build_array('rotating_light'),'priority',5,'click','https://maps.google.com/?q='||s.la1||','||s.lo1)); exception when others then null; end;
            end if;
          end if;
        end if;
      end if;
    end loop;
  end loop;
  return k;
end $$;
revoke all on function public.cabotage_check(timestamptz,boolean) from public, anon, authenticated;

create or replace function public.card_swap_check(since timestamptz, push boolean default true) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare t record; b record; l record; tz text:='Europe/Bratislava'; f text:='DD.MM.YYYY HH24:MI'; tp text; k int:=0; isnew boolean; ap text; bp text; da text; db text; shortl numeric; msg text; la numeric; lo numeric;
begin
  tp:=fleet_inline_topic();  -- alarmy posiela push centrum (fleet_push_scan)
  for t in select * from fuel_card where at>=since and vehicle_id is not null and m_state in ('sparovane','bez_sondy') loop
    shortl:=t.liters-coalesce(t.m_rise,0);
    if shortl<=100 then continue; end if;
    -- auto s dokladom musí mať okolo tankovania údaje o hladine (inak sa nedá povedať, že mu nafta chýba)
    if not exists(select 1 from rides r where r.vehicle_id in (select id from cmd_vehicles where id=t.vehicle_id or alias_of=t.vehicle_id union select t.vehicle_id)
                    and r.fuel_start is not null and r.start_at between t.at-interval '12 hours' and t.at+interval '12 hours')
       and not exists(select 1 from tank_log tl where tl.vehicle_id in (select id from cmd_vehicles where id=t.vehicle_id or alias_of=t.vehicle_id union select t.vehicle_id)
                    and tl.at between t.at-interval '6 hours' and t.at+interval '6 hours') then continue; end if;
    select * into l from fuel_station_loc(t.station);
    la:=coalesce(t.m_lat,l.lat); lo:=coalesce(t.m_lon,l.lon);
    if la is null then continue; end if;
    for b in
      select pr.*, pr.rise-coalesce((select sum(c.liters) from fuel_card c where c.vehicle_id=coalesce(v.alias_of,v.id) and c.at between pr.at-interval '3 hours' and pr.at+interval '3 hours'),0)
                    -coalesce((select sum(y.liters) from yard_fuel y where y.kind='vydaj' and (y.vehicle_id=pr.vehicle_id or pnorm(y.plate)=pnorm(v.plate)) and y.day=(pr.at at time zone tz)::date),0) surplus
        from probe_refuel pr join cmd_vehicles v on v.id=pr.vehicle_id
       where coalesce(v.alias_of,v.id)<>t.vehicle_id and pr.lat is not null and geo_m(la,lo,pr.lat,pr.lon)<=300
         and coalesce(pr.t_to,pr.at)>=t.at-interval '3 hours' and coalesce(pr.t_from,pr.at)<=t.at+interval '3 hours'
    loop
      if b.surplus<=100 then continue; end if;
      select coalesce(plate,name,id) into ap from cmd_vehicles where id=t.vehicle_id;
      select coalesce(c.plate,c.name,c.id) into bp from cmd_vehicles v join cmd_vehicles c on c.id=coalesce(v.alias_of,v.id) where v.id=b.vehicle_id;
      da:=coalesce(veh_driver_at(t.vehicle_id,t.at),'neznámy'); db:=coalesce(veh_driver_at(b.vehicle_id,b.at),'neznámy');
      msg:='doklad '||coalesce(ap,t.plate)||coalesce(' (karta '||t.card||')','')||': '||round(t.liters)||' l · '||to_char(t.at at time zone tz,f)||' · '||coalesce(t.station,'stanica ?')
         ||' · v nádrži '||coalesce(ap,t.plate)||' +'||round(coalesce(t.m_rise,0))||' l (o '||round(shortl)||' l menej ako na doklade), vodič '||da
         ||' ⇒ '||bp||': v nádrži +'||round(b.rise)||' l · '||to_char(b.at at time zone tz,f)||' ('||round(b.lvl_from)||' → '||round(b.lvl_to)||' l) bez dokladu (o '||round(b.surplus)||' l viac), vodič '||db
         ||' · stanica do 300 m, do 3 h · stupeň VYSOKÝ';
      insert into fleet_events as e(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,note,src_key)
        values(t.vehicle_id,coalesce(ap,t.plate)||' → '||bp,'card_swap',t.at,da||' → '||db,round(least(shortl,b.surplus)),t.station,'fuel',la,lo,t.at,b.at,round(b.lvl_from),round(b.lvl_to),msg,'swap:'||t.id||':'||b.key)
        on conflict (src_key) do update set note=excluded.note, liters=excluded.liters, driver=excluded.driver
        returning (xmax=0) into isnew;
      if isnew then k:=k+1;
        if push and tp is not null and t.at>now()-interval '24 hours' then
          begin perform net.http_post(url:='https://ntfy.sh/'||tp, body:=jsonb_build_object('topic',tp,'title','KARTA JEDNÉHO AUTA, NAFTA V INOM','message','⚠️ '||msg,
            'tags',jsonb_build_array('rotating_light','credit_card'),'priority',5,'click','https://maps.google.com/?q='||la||','||lo)); exception when others then null; end;
        end if;
      end if;
    end loop;
  end loop;
  return k;
end $$;
revoke all on function public.card_swap_check(timestamptz,boolean) from public, anon, authenticated;

create or replace function public.fuel_check() returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare c jsonb; v record; t text; k int:=0; before_max numeric; now_lvl numeric; moved boolean; drv text; msg text; gapok boolean;
begin
  select value into c from fleet_cfg where key='fuel'; if c is null then c:='{"drop":20,"win":90,"gap":30,"cool":180}'; end if;
  t:=fleet_inline_topic();  -- alarmy posiela push centrum (fleet_push_scan)
  insert into tank_log(vehicle_id,at,tank,speed,ign,lat,lon)
    select id,gps_at,tank,speed,ign,lat,lon from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes'
    on conflict do nothing;
  delete from tank_log where at<now()-interval '120 days';
  for v in select * from cmd_vehicles where tank is not null and gps_at>now()-interval '30 minutes' and coalesce(speed,0)<=3 and alias_of is null loop
    if veh_off(v.id) or veh_calib_on(v.id) is not null then continue; end if;
    select bool_or(coalesce(speed,0)>5) into moved from tank_log where vehicle_id=v.id and at>v.gps_at-make_interval(mins=>(c->>'win')::int);
    if coalesce(moved,false) then continue; end if;
    select max(tank) into before_max from tank_log where vehicle_id=v.id and at between v.gps_at-make_interval(mins=>(c->>'win')::int) and v.gps_at-interval '15 minutes';
    select percentile_cont(0.5) within group (order by tank) into now_lvl from (select tank from tank_log where vehicle_id=v.id order by at desc limit 3) q;
    if before_max is null or now_lvl is null then continue; end if;
    -- medzi meraniami nesmie byť medzera bez dát nad 6 h (výpadok signálu)
    select coalesce(max(d)<=interval '6 hours',true) into gapok from (select at-lag(at) over (order by at) d from tank_log where vehicle_id=v.id and at>=v.gps_at-make_interval(mins=>(c->>'win')::int)-interval '1 day') z;
    if not gapok then continue; end if;
    if before_max-now_lvl >= (c->>'drop')::numeric
       and not exists(select 1 from fleet_events where vehicle_id=v.id and kind='fuel_drop' and at>now()-make_interval(mins=>(c->>'cool')::int)) then
      select driver into drv from rides where vehicle_id=any(veh_ids(v.id)) order by start_at desc limit 1;
      insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon)
        values(v.id,v.plate,'fuel_drop',drv,(select name from places p where abs(p.lat-v.lat)<0.01 and abs(p.lon-v.lon)<0.015 order by power(p.lat-v.lat,2)+power(p.lon-v.lon,2) limit 1),'fuel',round(before_max-now_lvl),v.lat,v.lon);
      if t is not null then
        msg:='⚠️ '||coalesce(v.plate,v.name)||': pokles nafty o '||round(before_max-now_lvl)||' l v stojacom aute ('||round(before_max)||' → '||round(now_lvl)||' l)'||
             case when coalesce(v.ign,0)=0 then ' · motor vypnutý' else '' end||' · '||to_char(now() at time zone 'Europe/Bratislava','HH24:MI');
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,
          'click','https://maps.google.com/?q='||v.lat||','||v.lon)); exception when others then null; end;
      end if; k:=k+1;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_check() from public, anon, authenticated;

create or replace function public.fuel_gap_check(days integer default 1) returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare s record; t text; k int:=0; drv text; pl text; moved numeric; ignon boolean; v record; msg text; thr numeric; cf numeric;
begin
  t:=fleet_inline_topic();  -- alarmy posiela push centrum (fleet_push_scan)
  thr:=coalesce((select (value->>'drop')::numeric from fleet_cfg where key='fuel'),20);
  for s in
    with x as (select vehicle_id, at, tank, speed, ign, lat, lon,
                 lag(at) over w p_at, lag(tank) over w p_tank, lag(lat) over w p_lat, lag(lon) over w p_lon
               from tank_log where at>now()-make_interval(days=>days) - interval '2 days' window w as (partition by vehicle_id order by at))
    select * from x where p_at is not null and at>now()-make_interval(days=>days) and p_tank-tank>=thr
  loop
    if exists(select 1 from fuel_gap_seen where vehicle_id=s.vehicle_id and t_from=s.p_at) then continue; end if;
    insert into fuel_gap_seen values(s.vehicle_id,s.p_at) on conflict do nothing;
    select coalesce(sum(case when greatest(start_at,s.p_at)<least(coalesce(stop_at,start_at),s.at) then distance else 0 end),0) into moved
      from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<s.at and coalesce(stop_at,start_at)>s.p_at;
    if moved>2 then continue; end if;
    if s.lat is not null and s.p_lat is not null and abs(s.lat-s.p_lat)+abs(s.lon-s.p_lon)>0.02 then continue; end if;
    select bool_or(coalesce(ign,0)=1) into ignon from tank_log where vehicle_id=s.vehicle_id and at between s.p_at and s.at;
    select driver into drv from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<=s.at and driver is not null order by start_at desc limit 1;
    select coalesce(p.name, (select stop_addr from rides where vehicle_id=any(veh_ids(s.vehicle_id)) and start_at<=s.at and stop_addr is not null order by start_at desc limit 1)) into pl
      from (select 1) d left join places p on abs(p.lat-s.lat)<0.01 and abs(p.lon-s.lon)<0.015;
    select * into v from cmd_vehicles where id=s.vehicle_id;
    if s.at-s.p_at>interval '6 hours' then
      insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,at,t_from,t_to,lvl_from,lvl_to,minutes,note)
        values(s.vehicle_id,v.plate,'data_gap',drv,pl,'stop',round(s.p_tank-s.tank),s.lat,s.lon,s.at,s.p_at,s.at,round(s.p_tank),round(s.tank),floor(extract(epoch from s.at-s.p_at)/60)::int,
          'výpadok dát '||replace(round(extract(epoch from s.at-s.p_at)/3600,1)::text,'.',',')||' h bez záznamu hladiny · rozdiel hladiny '||round(s.p_tank)||' → '||round(s.tank)||' l (nepočíta sa ako pokles v státí)');
      continue;
    end if;
    cf:=veh_calib_on(s.vehicle_id);
    insert into fleet_events(vehicle_id,plate,kind,driver,place,place_kind,liters,lat,lon,at,t_from,t_to,lvl_from,lvl_to,note,flag,flag_note)
      values(s.vehicle_id,v.plate,'fuel_drop',drv,pl,'fuel',round(s.p_tank-s.tank),s.lat,s.lon,s.at,s.p_at,s.at,round(s.p_tank),round(s.tank),
        case when s.at-s.p_at>interval '1 hour' then 'pokles počas výpadku signálu ('||round(extract(epoch from s.at-s.p_at)/3600,1)||' h)' else 'pokles medzi meraniami' end
        ||case when coalesce(ignon,false) then ', motor bežal' else ', motor vypnutý' end,
        case when cf is not null then 'kalibracia' when veh_off(s.vehicle_id) then 'servis' end,
        case when cf is not null then 'snímač nekalibrovaný – koeficient '||replace(cf::text,'.',',')||'; prepočítané ≈ '||round((s.p_tank-s.tank)/cf)||' l (orientačne)' when veh_off(s.vehicle_id) then 'auto odstavené / na servise' end);
    if cf is not null or veh_off(s.vehicle_id) then continue; end if;
    k:=k+1;
    if t is not null and s.at>now()-interval '3 hours' then
      msg:='⚠️ '||coalesce(v.plate,s.vehicle_id)||': pokles nafty '||round(s.p_tank)||' → '||round(s.tank)||' l (−'||round(s.p_tank-s.tank)||' l) medzi '
        ||to_char(s.p_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||' a '||to_char(s.at at time zone 'Europe/Bratislava','DD.MM HH24:MI')||', auto stálo'||coalesce(' · '||pl,'')||coalesce(' · '||drv,'');
      begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÁ KRÁDEŽ NAFTY','message',msg,'tags',jsonb_build_array('rotating_light'),'priority',5,'click','https://maps.google.com/?q='||s.lat||','||s.lon)); exception when others then null; end;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_gap_check(int) from public, anon, authenticated;

create or replace function public.fuel_transfer_check(since timestamptz default now()-interval '3 days', push boolean default true) returns int
language plpgsql security definer set search_path=public, extensions, net as $$
declare t text; k int:=0; m record; tz text:='Europe/Bratislava'; f text:='DD.MM HH24:MI'; msg text; isnew boolean;
begin
  t:=fleet_inline_topic();  -- alarmy posiela push centrum (fleet_push_scan)
  create temp table if not exists _fseg(vehicle_id text, plate text, key text, t_from timestamptz, t_to timestamptz, l_from numeric, l_to numeric,
    lat numeric, lon numeric, driver text, addr text, card boolean, live boolean) on commit drop;
  truncate _fseg;
  -- ukončené státia medzi dvoma jazdami
  insert into _fseg
  select x.vehicle_id, coalesce(nullif(trim(x.plate),''),(select plate from cmd_vehicles where id=x.vehicle_id),x.vehicle_id), x.p_ride, x.p_stop, x.start_at, x.p_fuel, x.fuel_start,
         coalesce(x.p_lat,x.lat_start), coalesce(x.p_lon,x.lon_start),
         case when not fleet_unknown(x.p_drv) then trim(x.p_drv) when not fleet_unknown(x.driver) then trim(x.driver) end, x.p_addr,
         coalesce(x.refuel_l,0)>0 or (coalesce(x.p_refuel,0)>0 and x.p_fuel-coalesce(x.p_fstart,x.p_fuel)+coalesce(x.p_cons,0) < x.p_refuel-30), false
    from (select r.*, lag(r.ride_id) over w p_ride, lag(r.stop_at) over w p_stop, lag(r.fuel_stop) over w p_fuel, lag(r.driver) over w p_drv,
                 lag(r.lat_stop) over w p_lat, lag(r.lon_stop) over w p_lon, lag(r.stop_addr) over w p_addr,
                 lag(r.refuel_l) over w p_refuel, lag(r.fuel_start) over w p_fstart, lag(r.fuel_consumed) over w p_cons
            from rides r where r.start_at>=since-interval '3 days' window w as (partition by r.vehicle_id order by r.start_at)) x
   where x.p_stop is not null and x.start_at>=since and x.start_at>=x.p_stop and x.p_fuel is not null and x.fuel_start is not null
     and (x.p_lat is null or x.lat_start is null or geo_m(x.p_lat,x.p_lon,x.lat_start,x.lon_start)<=300);
  -- práve prebiehajúce státie (auto stojí na mieste poslednej jazdy)
  insert into _fseg
  select v.id, coalesce(v.plate,v.name,v.id), l.ride_id, l.stop_at, v.gps_at, l.fuel_stop,
         coalesce((select percentile_cont(0.5) within group (order by tank) from (select tank from tank_log where vehicle_id=v.id and at>l.stop_at order by at desc limit 3) q), v.tank),
         coalesce(l.lat_stop,v.lat), coalesce(l.lon_stop,v.lon), case when not fleet_unknown(l.driver) then trim(l.driver) end, l.stop_addr,
         coalesce(l.refuel_l,0)>0 and l.fuel_stop-coalesce(l.fuel_start,l.fuel_stop)+coalesce(l.fuel_consumed,0) < l.refuel_l-30, true
    from cmd_vehicles v cross join lateral (select * from rides where vehicle_id=v.id order by start_at desc limit 1) l
   where l.stop_at is not null and l.fuel_stop is not null and v.tank is not null and v.gps_at>l.stop_at and v.gps_at>now()-interval '1 hour'
     and coalesce(v.speed,0)<=3 and l.stop_at>=since-interval '1 day'
     and (v.lat is null or l.lat_stop is null or geo_m(v.lat,v.lon,l.lat_stop,l.lon_stop)<=300);
  for m in
    select d.vehicle_id d_vid, d.plate d_pl, d.key d_key, d.t_from d_from, d.t_to d_to, d.l_from d_lf, d.l_to d_lt, d.driver d_drv, d.live d_live,
           u.vehicle_id u_vid, u.plate u_pl, u.key u_key, u.t_from u_from, u.t_to u_to, u.l_from u_lf, u.l_to u_lt, u.driver u_drv, u.live u_live,
           d.lat, d.lon, round(geo_m(d.lat,d.lon,u.lat,u.lon)) dist,
           coalesce((select name from place_near(d.lat,d.lon)), d.addr, u.addr) pl
      from _fseg d join _fseg u on u.vehicle_id<>d.vehicle_id
     where d.l_from-d.l_to>=30 and u.l_to-u.l_from>=30 and not u.card
       and d.lat is not null and u.lat is not null and abs(d.lat-u.lat)<0.01 and abs(d.lon-u.lon)<0.015 and geo_m(d.lat,d.lon,u.lat,u.lon)<=300
       and u.t_from<=d.t_to+interval '3 hours' and u.t_to>=d.t_from
       and not exists(select 1 from yard_fuel y where y.kind='vydaj'
             and (y.vehicle_id=u.vehicle_id or upper(replace(coalesce(y.plate,''),' ',''))=upper(replace(u.plate,' ','')))
             and y.day between (u.t_from at time zone tz)::date and (u.t_to at time zone tz)::date)
  loop
    msg:=m.d_pl||': −'||round(m.d_lf-m.d_lt)||' l ('||round(m.d_lf)||' → '||round(m.d_lt)||' l), státie '||to_char(m.d_from at time zone tz,f)||' – '||case when m.d_live then 'teraz' else to_char(m.d_to at time zone tz,f) end
       ||', vodič '||coalesce(m.d_drv,'neznámy')||' ⇒ '||m.u_pl||': +'||round(m.u_lt-m.u_lf)||' l ('||round(m.u_lf)||' → '||round(m.u_lt)||' l), státie '
       ||to_char(m.u_from at time zone tz,f)||' – '||case when m.u_live then 'teraz' else to_char(m.u_to at time zone tz,f) end||', vodič '||coalesce(m.u_drv,'neznámy')
       ||' · autá '||m.dist||' m od seba · bez tankovania z karty a bez výdaja z dvora · stupeň VYSOKÝ';
    insert into fleet_events as e(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,note,src_key)
      values(m.d_vid,m.d_pl||' → '||m.u_pl,'fuel_transfer',least(m.d_to,m.u_to),coalesce(m.d_drv,'?')||' → '||coalesce(m.u_drv,'?'),round(least(m.d_lf-m.d_lt,m.u_lt-m.u_lf)),
             m.pl,'stop',m.lat,m.lon,least(m.d_from,m.u_from),greatest(m.d_to,m.u_to),round(m.d_lf),round(m.d_lt),msg,'xfer:'||m.d_key||':'||m.u_key)
      on conflict (src_key) do update set note=excluded.note, liters=excluded.liters, at=excluded.at, t_to=excluded.t_to, lvl_to=excluded.lvl_to
      returning (xmax=0) into isnew;
    if isnew then k:=k+1; end if;
    if isnew and push and t is not null and least(m.d_to,m.u_to)>now()-interval '6 hours' then
      begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','MOŽNÉ PREČERPANIE NAFTY','message','⚠️ '||msg,
        'tags',jsonb_build_array('rotating_light'),'priority',5,'click','https://maps.google.com/?q='||m.lat||','||m.lon)); exception when others then null; end;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.fuel_transfer_check(timestamptz,boolean) from public, anon, authenticated;

create or replace function public.no_signal_check() returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare t text; k int:=0; v record; isnew boolean; tz text:='Europe/Bratislava'; msg text;
begin
  t:=fleet_inline_topic();  -- alarmy posiela push centrum (fleet_push_scan)
  for v in
    select c.*, coalesce(c.plate,c.name,c.id) pl, floor(extract(epoch from now()-c.gps_at)/3600)::int hod,
           (select round(sum(distance)) from rides r where r.vehicle_id=any(veh_ids(c.id)) and r.start_at>=now()-interval '7 days') km7,
           (select trim(driver) from rides r where r.vehicle_id=any(veh_ids(c.id)) and not fleet_unknown(r.driver) order by start_at desc limit 1) drv,
           (select stop_addr from rides r where r.vehicle_id=any(veh_ids(c.id)) order by start_at desc limit 1) addr
      from cmd_vehicles c
     where c.gps_at is not null and c.gps_at<now()-interval '12 hours' and c.alias_of is null and not coalesce(c.deleted,false) and not veh_off(c.id)
  loop
    if coalesce(v.km7,0)<=300 then continue; end if;
    msg:=v.pl||' nemá polohu '||v.hod||' h · posledná poloha '||to_char(v.gps_at at time zone tz,'DD.MM HH24:MI')
      ||coalesce(' · '||coalesce((select name from place_near(v.lat,v.lon)),v.addr),'')||' · posledný vodič '||coalesce(v.drv,'neznámy')
      ||' · za 7 dní '||v.km7||' km · stupeň STREDNÝ';
    insert into fleet_events as e(vehicle_id,plate,kind,at,driver,minutes,place,place_kind,lat,lon,t_from,note,src_key)
      values(v.id,v.pl,'no_signal',now(),v.drv,v.hod*60,coalesce((select name from place_near(v.lat,v.lon)),v.addr),'stop',v.lat,v.lon,v.gps_at,msg,
             'nosig:'||v.id||':'||floor(extract(epoch from v.gps_at))::bigint)
      on conflict (src_key) do update set minutes=excluded.minutes, note=excluded.note, driver=excluded.driver
      returning (xmax=0) into isnew;
    if isnew then k:=k+1;
      if t is not null then
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Aktívne auto bez signálu','message','📡 '||msg,'tags',jsonb_build_array('satellite'),'priority',4,
          'click','https://maps.google.com/?q='||v.lat||','||v.lon)); exception when others then null; end;
      end if;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.no_signal_check() from public, anon, authenticated;

create or replace function public.paid_not_tank_check(since timestamptz, push boolean default true) returns int language plpgsql security definer set search_path=public, extensions, net as $$
declare t record; b record; s record; p record; sl record; o record; tp text; k int:=0; isnew boolean; cb numeric; rise numeric; cap numeric; drv text; pl text; msg text; chk text; dist numeric; tz text:='Europe/Bratislava'; other text;
begin
  tp:=fleet_inline_topic();  -- alarmy posiela push centrum (fleet_push_scan)
  cb:=round(coalesce((select (value->>'diesel')::numeric from fleet_cfg where key='costs'),1.952)/1.23,3);
  for t in select * from card_tx(since) x where x.vehicle_id is not null and x.liters>100 and x.at<now()-interval '90 minutes' loop
    select * into b from veh_lvl_before(t.vehicle_id, t.at);
    select * into s from veh_lvl_settled(t.vehicle_id, t.at+interval '10 minutes');
    continue when b.lvl is null or s.lvl is null;
    rise:=s.lvl+coalesce(s.cons,0)-b.lvl;
    -- jazda medzi poslednou hladinou a tankovaním
    rise:=rise+coalesce((select sum(coalesce(r.fuel_consumed,0)) from rides r where r.vehicle_id=any(veh_ids(t.vehicle_id)) and r.start_at>=b.at and coalesce(r.stop_at,r.start_at)<=t.at),0);
    continue when not (rise<0.2*t.liters and t.liters-rise>100);
    select coalesce(c.plate,c.name,c.id), coalesce(nullif(v2.tank_real,0),c.tank_cap) into pl, cap from cmd_vehicles c left join veh_calib v2 on v2.vehicle_id=c.id where c.id=t.vehicle_id;
    drv:=coalesce(veh_driver_at(t.vehicle_id,t.at),'neznámy');
    -- (a) bolo auto pri stanici?
    select * into sl from station_loc(t.station,t.vehicle_id,t.at);
    select * into p from veh_pos_at(t.vehicle_id,t.at,interval '20 minutes');
    if sl.lat is not null and p.lat is not null then dist:=geo_m(sl.lat,sl.lon,p.lat,p.lon);
      chk:=case when dist<=300 then '(a) auto bolo pri stanici ('||round(dist)||' m)' else '(a) auto NEBOLO pri stanici – '||case when dist>=1000 then replace(round(dist/1000,1)::text,'.',',')||' km' else round(dist)||' m' end end;
    elsif p.lat is null then chk:='(a) poloha auta v čase transakcie chýba';
    else chk:='(a) poloha stanice neznáma'; end if;
    -- (b) litre vs. voľný objem nádrže
    if cap>0 then chk:=chk||' · (b) '||case when t.liters>cap-b.lvl then 'litre PREKRAČUJÚ voľný objem nádrže ('||round(cap)||' − '||round(b.lvl)||' = '||round(cap-b.lvl)||' l)' else 'litre sa zmestia do nádrže (voľných '||round(cap-b.lvl)||' l)' end;
    else chk:=chk||' · (b) objem nádrže nezadaný'; end if;
    -- (c) inému autu VALKO do 2 h na tej istej stanici (do 300 m) stúpla hladina bez dokladu
    other:=null;
    for o in select pr.*, coalesce(c.plate,c.name,c.id) opl from probe_refuel pr join cmd_vehicles c on c.id=pr.vehicle_id
              where veh_canon(pr.vehicle_id)<>t.vehicle_id and pr.at between t.at-interval '2 hours' and t.at+interval '2 hours' and pr.rise>=50 and pr.lat is not null
                and ((sl.lat is not null and geo_m(sl.lat,sl.lon,pr.lat,pr.lon)<=300) or (p.lat is not null and geo_m(p.lat,p.lon,pr.lat,pr.lon)<=300))
                and not exists(select 1 from card_tx(t.at-interval '4 hours') y where y.vehicle_id=veh_canon(pr.vehicle_id) and y.at between pr.at-interval '3 hours' and pr.at+interval '3 hours')
              order by abs(extract(epoch from pr.at-t.at)) limit 1 loop
      other:=o.opl||' +'||round(o.rise)||' l ('||to_char(o.at at time zone tz,'HH24:MI')||', vodič '||coalesce(veh_driver_at(o.vehicle_id,o.at),'neznámy')||')';
    end loop;
    chk:=chk||' · (c) '||coalesce('KARTA PRAVDEPODOBNE PRIRADENÁ K INÉMU AUTU: '||other,'iné auto bez dokladu v okolí nenašlo');
    msg:=pl||' · vodič '||drv||' · '||to_char(t.at at time zone tz,'DD.MM.YYYY HH24:MI')||' · '||coalesce(t.station,'stanica neznáma')||coalesce(' · karta '||t.card,'')
       ||' · na doklade '||round(t.liters)||' l · nárast v nádrži '||round(rise)||' l ('||round(b.lvl)||' → '||round(s.lvl)||' l, '||s.how||') · chýba '||round(t.liters-rise)||' l = '||round((t.liters-rise)*cb)||' € bez DPH · '||chk
       ||' · zdroj: '||t.src||' · stupeň VYSOKÝ';
    insert into fleet_events as e(vehicle_id,plate,kind,at,driver,liters,place,place_kind,lat,lon,t_from,t_to,lvl_from,lvl_to,note,src_key)
      values(t.vehicle_id,pl,'paid_not_tank',t.at,drv,round(t.liters-rise),coalesce(t.station,'čerpacia stanica'),'fuel',coalesce(sl.lat,p.lat),coalesce(sl.lon,p.lon),t.at,s.at,round(b.lvl),round(s.lvl),msg,'pnt:'||t.key)
      on conflict (src_key) do update set note=excluded.note, liters=excluded.liters, driver=excluded.driver, lvl_from=excluded.lvl_from, lvl_to=excluded.lvl_to, t_to=excluded.t_to
      returning (xmax=0) into isnew;
    if isnew then k:=k+1;
      if push and tp is not null and t.at>now()-interval '24 hours' and not veh_off(t.vehicle_id) then
        begin perform net.http_post(url:='https://ntfy.sh/'||tp, body:=jsonb_build_object('topic',tp,'title','ZAPLATENÉ, ALE NIE V NÁDRŽI','message','⛽❗ '||msg,
          'tags',jsonb_build_array('rotating_light','fuelpump'),'priority',5)); exception when others then null; end;
      end if;
    end if;
  end loop;
  -- doklad sa medzitým spároval s nárastom (napr. doplnené merania) → alarm zmizne, ak ho nikto neriešil
  delete from fleet_events e where e.kind='paid_not_tank' and e.at>=since and e.st='novy' and e.src_key like 'pnt:%'
     and not exists(select 1 from card_tx(since) x where 'pnt:'||x.key=e.src_key);
  return k;
end $$;
revoke all on function public.paid_not_tank_check(timestamptz,boolean) from public, anon, authenticated;

create or replace function public.refuel_gap_sync(since timestamptz) returns integer language plpgsql security definer set search_path=public, extensions, net as $$
declare k int:=0; n int; t text; e record;
begin
  t:=fleet_inline_topic();  -- alarmy posiela push centrum (fleet_push_scan)
  delete from fleet_events fe where fe.kind='refuel_gap' and fe.at>=since-interval '2 days' and fe.st='novy'
     and fe.src_key like 'gap:%'
     and exists(select 1 from rides r where r.ride_id=substr(fe.src_key,5))
     and (fe.at>=card_cut() or not coalesce((select q.bad and q.ready from refuel_eval(substr(fe.src_key,5)) q),false));
  for e in
    with x as (
      insert into fleet_events as f(vehicle_id,plate,kind,at,driver,liters,place,place_kind,t_from,note,src_key,flag,flag_note)
      select r.vehicle_id,coalesce(r.plate,(select plate from cmd_vehicles where id=r.vehicle_id)),'refuel_gap',coalesce(r.stop_at,r.start_at),r.driver,abs(q.diff),r.stop_addr,'fuel',
             tk.t,
             'tankovanie '||to_char(tk.t at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI')||' · natankované '||round(q.refuel)||' l · nárast v nádrži '||q.rise||' l (ustálená hladina) · rozdiel '||case when q.diff>0 then '−' else '+' end||abs(q.diff)||' l ('||replace(q.pct::text,'.',',')||' %)'
             ||case when q.diff>0 then ' – v nádrži pribudlo menej, ako bolo natankované' else ' – v nádrži pribudlo viac, ako je na doklade' end,
             'gap:'||r.ride_id,
             case when veh_calib_on(r.vehicle_id) is not null then 'kalibracia' when veh_off(r.vehicle_id) then 'servis' end,
             case when veh_calib_on(r.vehicle_id) is not null then 'snímač nekalibrovaný – koeficient '||replace(veh_calib_on(r.vehicle_id)::text,'.',',')||'; prepočítaný nárast ≈ '||round(q.rise/veh_calib_on(r.vehicle_id))||' l (orientačne)'
                  when veh_off(r.vehicle_id) then 'auto odstavené / na servise' end
        from rides r cross join lateral refuel_eval(r.ride_id) q
        cross join lateral (select coalesce((select min(c.at) from cmd_refuel c where c.ride_id=r.ride_id),
                                            (select min(c.at) from cmd_refuel c where c.object_id=r.vehicle_id and c.at between r.start_at-interval '30 minutes' and coalesce(r.stop_at,r.start_at)+interval '30 minutes'),
                                            coalesce(r.stop_at,r.start_at)) t) tk
       where coalesce(r.stop_at,r.start_at)>=since and coalesce(r.stop_at,r.start_at)<card_cut() and r.refuel_l>0 and q.bad and q.ready
      on conflict (src_key) do update set liters=excluded.liters, note=excluded.note, t_from=excluded.t_from,
         flag=case when f.flag='artefakt' then f.flag else excluded.flag end, flag_note=case when f.flag='artefakt' then f.flag_note else excluded.flag_note end
      returning f.plate, f.note, f.at, f.driver, f.flag, (xmax=0) isnew)
    select * from x
  loop
    if e.isnew then k:=k+1;
      if t is not null and e.at>now()-interval '6 hours' and e.flag is null then
        begin perform net.http_post(url:='https://ntfy.sh/'||t, body:=jsonb_build_object('topic',t,'title','Tankovanie nesedí','message',
          coalesce(e.plate,'')||': '||e.note||coalesce(' · '||e.driver,'')||' · '||to_char(e.at at time zone 'Europe/Bratislava','DD.MM. HH24:MI'),
          'tags',jsonb_build_array('fuelpump','warning'),'priority',4)); exception when others then null; end;
      end if;
    end if;
  end loop;
  return k;
end $$;
revoke all on function public.refuel_gap_sync(timestamptz) from public, anon, authenticated;