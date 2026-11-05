-- 🤝 PORTÁL OBCHODNÍKA (5. 11. 2026 príkaz majiteľa): obchodné firmy, od ktorých kupujeme tovar (napr. ARIMEX, UBM).
-- Prihlásenie ako dodávateľ (farmers), ale vlastný portál vo farbách a s logom firmy:
--   📈 burza, 💬 orientačná predajná cena pre nich (zverejnená cena − doplatok k doprave nad 160 km tam a späť × €/km ÷ nosnosť),
--   🚛 kamióny s ich tovarom – poloha IBA od 30 min pred plánovanou nakládkou, v okolí ich miesta nakládky a do odchodu z nakládky
--   (potom tabuľa „ochrana údajov“ – nesmú vidieť, kam vezieme), 📞 kontakt Martin (cenu nastavujeme telefonicky / správou).
-- NIKDY: odberatelia, kde predávame, modely cien podľa odberateľov, naše nákupné ceny ako „nákupné“.
-- Správa iba Martin (price_main). Firmu vidí iba cez security definer funkcie (žiadny priamy select).

create table if not exists public.trader_portal(
  farmer_id uuid primary key references public.farmers(id) on delete cascade,
  kod text unique not null default substr(md5(random()::text||clock_timestamp()::text),1,10),
  zapnute boolean not null default true,
  c1 text, c2 text, logo text, lang text not null default 'sk',
  km numeric, nosnost numeric not null default 25,
  miesta jsonb not null default '[]'::jsonb,
  pozn text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint tp_logo_len check (logo is null or (length(logo)<=400000 and logo ~ '^data:image/(png|jpeg|webp|svg\+xml);base64,')),
  constraint tp_c1 check (c1 is null or c1 ~ '^#[0-9a-fA-F]{6}$'),
  constraint tp_c2 check (c2 is null or c2 ~ '^#[0-9a-fA-F]{6}$'),
  constraint tp_lang check (lang in ('sk','hu','en')),
  constraint tp_km check (km is null or (km>=0 and km<=2000)),
  constraint tp_nos check (nosnost>=5 and nosnost<=45)
);
alter table public.trader_portal enable row level security;
drop policy if exists tp_owner on public.trader_portal;
create policy tp_owner on public.trader_portal for all using (price_main()) with check (price_main());
revoke all on public.trader_portal from anon;
grant select, insert, update, delete on public.trader_portal to authenticated;

-- kedy kamión bol pri nakládke (aby sa poloha po odchode z nakládky skryla, aj keď vodič nezmení stav)
create table if not exists public.trader_trip_seen(trip_id uuid primary key, at_load timestamptz, left_at timestamptz);
alter table public.trader_trip_seen add column if not exists lat numeric;
alter table public.trader_trip_seen add column if not exists lon numeric;
alter table public.trader_trip_seen enable row level security;
revoke all on public.trader_trip_seen from anon, authenticated;

insert into public.ai_state(key,value) values('trader_cfg',jsonb_build_object('ekm',1.60,'base_km',160,'r_km',10,'meno','Martin Vaľko','tel',null,'skryte','[]'::jsonb))
on conflict(key) do nothing;

-- ⚙️ nastavenia (iba Martin)
create or replace function public.trader_list() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return jsonb_build_object('cfg',coalesce((select value from ai_state where key='trader_cfg'),'{}'::jsonb)
      ||jsonb_build_object('tel_staff',(select phone from staff where lower(email)='ernte@ernte.sk' limit 1)),
    'list',coalesce((select jsonb_agg(jsonb_build_object('farmer_id',t.farmer_id,'name',f.name,'kod',t.kod,'on',t.zapnute,'c1',t.c1,'c2',t.c2,'logo',t.logo,'lang',t.lang,
        'km',t.km,'km_auto',trader_km_auto(t.farmer_id),'nosnost',t.nosnost,'miesta',t.miesta,'pozn',t.pozn,'active',f.active,'login',(f.email is not null or f.phone is not null),
        'spots',(select count(*) from farm_spots s where s.farmer_id=t.farmer_id)) order by f.name)
      from trader_portal t join farmers f on f.id=t.farmer_id),'[]'::jsonb));
end $$;

-- odhad km jedným smerom: miesto nakládky (zadané, naučené, sídlo) → Zbudza, × 1,25 (cesta je dlhšia ako vzdušne)
create or replace function public.trader_km_auto(p_farmer uuid) returns numeric language plpgsql stable security definer set search_path=public as $$
declare la numeric; lo numeric; tp trader_portal;
begin
  select * into tp from trader_portal where farmer_id=p_farmer;
  if tp.miesta is not null and jsonb_array_length(tp.miesta)>0 then
    select (m->>'lat')::numeric,(m->>'lon')::numeric into la,lo from jsonb_array_elements(tp.miesta) m where m->>'lat' is not null limit 1; end if;
  if la is null then select s.lat,s.lon into la,lo from farm_spots s where s.farmer_id=p_farmer order by s.n desc nulls last limit 1; end if;
  if la is null then select f.lat,f.lon into la,lo from farmers f where f.id=p_farmer; end if;
  if la is null or lo is null then return null; end if;
  return round(trus_km(la,lo,48.8164,21.9389)*1.25);
end $$;

create or replace function public.trader_set(p_farmer uuid, p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare r trader_portal;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  if not exists(select 1 from farmers where id=p_farmer) then raise exception 'Firma nie je v zozname dodávateľov.'; end if;
  insert into trader_portal(farmer_id) values(p_farmer) on conflict(farmer_id) do nothing;
  update trader_portal set
    zapnute=case when p ? 'on' then coalesce((p->>'on')::boolean,true) else zapnute end,
    c1=case when p ? 'c1' then nullif(p->>'c1','') else c1 end,
    c2=case when p ? 'c2' then nullif(p->>'c2','') else c2 end,
    logo=case when p ? 'logo' then nullif(p->>'logo','') else logo end,
    lang=case when p ? 'lang' then coalesce(nullif(p->>'lang',''),'sk') else lang end,
    km=case when p ? 'km' then nullif(p->>'km','')::numeric else km end,
    nosnost=case when p ? 'nosnost' then coalesce(nullif(p->>'nosnost','')::numeric,25) else nosnost end,
    miesta=case when p ? 'miesta' and jsonb_typeof(p->'miesta')='array' then p->'miesta' else miesta end,
    pozn=case when p ? 'pozn' then nullif(p->>'pozn','') else pozn end,
    kod=case when coalesce((p->>'novy_kod')::boolean,false) then substr(md5(random()::text||clock_timestamp()::text),1,10) else kod end,
    updated_at=now()
  where farmer_id=p_farmer returning * into r;
  update farmers set perms=case when r.zapnute then coalesce(perms,'{}'::jsonb)||'{"f_prices":false,"f_sell":false,"f_offer":false,"f_burza":false,"f_trucks":false,"f_gps":false,"f_agro":false}'::jsonb
      else coalesce(perms,'{}'::jsonb)-array['f_prices','f_sell','f_offer','f_burza','f_trucks','f_gps','f_agro'] end where id=p_farmer;
  return jsonb_build_object('ok',true,'kod',r.kod);
end $$;

create or replace function public.trader_del(p_farmer uuid) returns text language plpgsql security definer set search_path=public as $$
begin if not price_main() then raise exception 'Iba Martin.'; end if; delete from trader_portal where farmer_id=p_farmer;
  update farmers set perms=coalesce(perms,'{}'::jsonb)-array['f_prices','f_sell','f_offer','f_burza','f_trucks','f_gps','f_agro'] where id=p_farmer; return 'ok'; end $$;

create or replace function public.trader_cfg_set(p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb:=coalesce((select value from ai_state where key='trader_cfg'),'{}'::jsonb);
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  c:=c||jsonb_strip_nulls(jsonb_build_object(
    'ekm',case when p ? 'ekm' then (p->>'ekm')::numeric end,'base_km',case when p ? 'base_km' then (p->>'base_km')::numeric end,
    'r_km',case when p ? 'r_km' then (p->>'r_km')::numeric end,'meno',nullif(p->>'meno',''),'tel',nullif(regexp_replace(coalesce(p->>'tel',''),'[^0-9+ ]','','g'),'')));
  insert into ai_state(key,value) values('trader_cfg',c) on conflict(key) do update set value=excluded.value, updated_at=now();
  return c;
end $$;

-- 🎨 značka pre prihlasovaciu stránku (bez prihlásenia, iba podľa tajného kódu z odkazu)
create or replace function public.portal_brand(p_kod text) returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('name',f.name,'c1',t.c1,'c2',t.c2,'logo',t.logo,'lang',t.lang)
  from trader_portal t join farmers f on f.id=t.farmer_id
  where t.zapnute and length(coalesce(p_kod,''))>=8 and t.kod=p_kod limit 1 $$;

-- doplatok k doprave: (km tam a späť − základ) × €/km ÷ nosnosť → €/t (základ = 160 km sa firme nepopisuje)
create or replace function public.trader_prirazka(p_km numeric, p_nos numeric) returns numeric language sql stable security definer set search_path=public as $$
  select case when p_km is null then 0 else round(greatest(0, 2*p_km - coalesce((c->>'base_km')::numeric,160)) * coalesce((c->>'ekm')::numeric,1.60) / greatest(coalesce(p_nos,25),5), 2) end
  from (select coalesce((select value from ai_state where key='trader_cfg'),'{}'::jsonb) c) q $$;

-- 👤 prihlásená obchodná firma: značka, kontakt, orientačné ceny, burza
create or replace function public.trader_me() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare fid uuid:=my_farmer_id(); t trader_portal; f farmers; c jsonb; km numeric; pr numeric;
begin
  if fid is null then return jsonb_build_object('on',false); end if;
  select * into t from trader_portal where farmer_id=fid and zapnute;
  if t.farmer_id is null then return jsonb_build_object('on',false); end if;
  select * into f from farmers where id=fid;
  c:=coalesce((select value from ai_state where key='trader_cfg'),'{}'::jsonb);
  km:=coalesce(t.km, trader_km_auto(fid)); pr:=trader_prirazka(km, t.nosnost);
  return jsonb_build_object('on',true,'name',f.name,'c1',t.c1,'c2',t.c2,'logo',t.logo,'lang',t.lang,
    'kontakt',jsonb_build_object('meno',coalesce(c->>'meno','Martin Vaľko'),'tel',coalesce(c->>'tel',(select phone from staff where lower(email)='ernte@ernte.sk' limit 1))),
    'km',km,'prirazka',pr,
    'ceny',coalesce((select jsonb_agg(jsonb_build_object('com',p.com,'cena',round(p.price-pr),'at',p.updated_at) order by p.price desc)
       from prices p where p.price is not null and p.price>pr),'[]'::jsonb),
    'burza',coalesce((select jsonb_agg(jsonb_build_object('sym',m.sym,'name',m.name,'eur_t',m.eur_t,'kontrakt',m.contract,'d',m.quote_date) order by m.sym)
       from market_px m where m.eur_t is not null and (m.name ilike 'MATIF%' or m.name ilike 'CBOT%')),'[]'::jsonb),
    'at',now());
end $$;

-- 🚛 kamióny s tovarom firmy: poloha iba v povolenom okne, inak dôvod skrytia
create or replace function public.trader_trucks() returns jsonb language plpgsql security definer set search_path=public as $$
declare fid uuid:=my_farmer_id(); tp trader_portal; c jsonb; rkm numeric; r record; k record; st timestamptz; dl numeric; hide text; od timestamptz; res jsonb:='[]'::jsonb;
  pl jsonb:='[]'::jsonb; sk jsonb; td date:=(now() at time zone 'Europe/Bratislava')::date; seen trader_trip_seen; tm time; nl numeric; nlo numeric; zona boolean;
begin
  if fid is null then raise exception 'Nemáte prístup.'; end if;
  select * into tp from trader_portal where farmer_id=fid and zapnute;
  if tp.farmer_id is null then raise exception 'Nemáte prístup.'; end if;
  c:=coalesce((select value from ai_state where key='trader_cfg'),'{}'::jsonb); rkm:=coalesce((c->>'r_km')::numeric,10);
  -- miesta nakládky: zadané v portáli (výdajné miesta) majú prednosť; inak naučené z lístkov + sídlo
  pl:=coalesce((select jsonb_agg(jsonb_build_object('lat',(m->>'lat')::numeric,'lon',(m->>'lon')::numeric)) from jsonb_array_elements(tp.miesta) m where m->>'lat' is not null and m->>'lon' is not null),'[]'::jsonb);
  if jsonb_array_length(pl)=0 then
    pl:=coalesce((select jsonb_agg(jsonb_build_object('lat',s.lat,'lon',s.lon)) from farm_spots s where s.farmer_id=fid and s.lat is not null),'[]'::jsonb)
      ||coalesce((select jsonb_agg(jsonb_build_object('lat',f.lat,'lon',f.lon)) from farmers f where f.id=fid and f.lat is not null and f.lon is not null),'[]'::jsonb);
  end if;
  -- 🛡️ zóny, kde polohu NIKDY neukážeme: naše miesta vykládky (places kind=buyer) + ručne zadané (trader_cfg.skryte)
  sk:=coalesce((select jsonb_agg(jsonb_build_object('lat',p.lat,'lon',p.lon,'r',greatest(coalesce(p.r,0)/1000.0,8))) from places p where p.kind='buyer' and p.lat is not null and p.lon is not null),'[]'::jsonb)
    ||coalesce(case when jsonb_typeof(c->'skryte')='array' then c->'skryte' end,'[]'::jsonb);
  for r in select t.* from trips t where t.farmer_id=fid and t.status<>'zrusena' and t.day between td-3 and td+14 order by t.day, t.time nulls last loop
    hide:=null; od:=null; dl:=null; st:=null; tm:=null; nl:=null; nlo:=null; zona:=false;
    begin tm:=nullif(substring(coalesce(r.time,'') from '^\s*(\d{1,2}[:.]\d{2})'),'')::time; exception when others then tm:=null; end;
    if tm is not null then st:=((r.day+tm)::timestamp at time zone 'Europe/Bratislava'); end if;
    select kk.gps_lat lat, kk.gps_lon lon, kk.gps_at at, kk.gps_speed spd into k from trucks kk
      where (r.truck_no is not null and kk.no=r.truck_no) or (r.truck_no is null and coalesce(r.spz,'')<>'' and upper(regexp_replace(coalesce(kk.spz,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(coalesce(r.spz,''),'[^A-Za-z0-9]','','g')))
      limit 1;
    select * into seen from trader_trip_seen where trip_id=r.id;
    if k.lat is not null then
      if seen.lat is not null then dl:=trus_km(k.lat,k.lon,seen.lat,seen.lon);
      elsif jsonb_array_length(pl)>0 then
        select trus_km(k.lat,k.lon,(p->>'lat')::numeric,(p->>'lon')::numeric),(p->>'lat')::numeric,(p->>'lon')::numeric into dl,nl,nlo
          from jsonb_array_elements(pl) p order by trus_km(k.lat,k.lon,(p->>'lat')::numeric,(p->>'lon')::numeric) limit 1;
      end if;
      zona:=exists(select 1 from jsonb_array_elements(sk) z where trus_km(k.lat,k.lon,(z->>'lat')::numeric,(z->>'lon')::numeric)<=coalesce((z->>'r')::numeric,8));
    end if;
    if r.status not in ('naplanovana','na_ceste','nakladka') then hide:='po';
    elsif r.day<>td then hide:='den';
    elsif st is not null and now()<st-interval '30 minutes' then hide:='pred'; od:=st-interval '30 minutes';
    elsif st is not null and now()>st+interval '3 hours' then hide:='po';
    elsif seen.left_at is not null then hide:='po';
    elsif k.lat is null or k.at is null or k.at<now()-interval '30 minutes' then hide:='bez_gps';
    elsif zona then hide:='po';
    elsif dl is null then hide:='pred';
    elsif seen.at_load is not null and dl>3 then hide:='po';
    elsif seen.at_load is null and dl>(case when st is null then least(rkm,5) else rkm end) then hide:='daleko';
    end if;
    -- pri nakládke (≤ 1,5 km) si zapamätáme TOTO miesto; po odchode z neho (> 3 km) sa poloha skryje natrvalo
    if hide is null and seen.at_load is null and dl<=1.5 then
      insert into trader_trip_seen(trip_id,at_load,lat,lon) values(r.id,now(),nl,nlo)
        on conflict(trip_id) do update set at_load=coalesce(trader_trip_seen.at_load,now()),lat=coalesce(trader_trip_seen.lat,excluded.lat),lon=coalesce(trader_trip_seen.lon,excluded.lon);
    elsif hide='po' and seen.at_load is not null and seen.left_at is null and r.day=td then
      update trader_trip_seen set left_at=now() where trip_id=r.id;
    end if;
    res:=res||jsonb_build_array(jsonb_build_object('id',r.id,'day',r.day,'time',r.time,'spz',r.spz,'status',r.status,
      'pos',case when hide is null then jsonb_build_object('lat',round(k.lat,5),'lon',round(k.lon,5),'at',k.at,'spd',k.spd,'km',round(dl,1)) end,
      'hide',hide,'od',od));
  end loop;
  return jsonb_build_object('trips',res,'miesta',jsonb_array_length(pl)>0,'at',now());
end $$;

-- staré „GPS farmárovi“ (my_truck_positions) obchodnej firme NIKDY – poloha iba cez trader_trucks
create or replace function public.my_truck_positions() returns table(trip_id uuid, spz text, lat numeric, lon numeric, at timestamptz, speed int)
language sql stable security definer set search_path=public as $f$
  select t.id,t.spz,k.gps_lat,k.gps_lon,k.gps_at,k.gps_speed from trips t join trucks k on k.no=t.truck_no
   where t.farmer_id=my_farmer_id() and fperm('f_gps') and t.gps_farmer and t.status in ('naplanovana','na_ceste','nakladka')
     and t.day between current_date-1 and current_date+1 and k.gps_at>now()-interval '3 hours'
     and not exists(select 1 from trader_portal tp where tp.farmer_id=t.farmer_id and tp.zapnute) $f$;
revoke all on function public.my_truck_positions() from public, anon; grant execute on function public.my_truck_positions() to authenticated;

revoke all on function public.trader_list(), public.trader_km_auto(uuid), public.trader_set(uuid,jsonb), public.trader_del(uuid), public.trader_cfg_set(jsonb),
  public.trader_prirazka(numeric,numeric), public.trader_me(), public.trader_trucks() from public, anon;
grant execute on function public.trader_list(), public.trader_set(uuid,jsonb), public.trader_del(uuid), public.trader_cfg_set(jsonb), public.trader_me(), public.trader_trucks() to authenticated;
revoke all on function public.portal_brand(text) from public;
grant execute on function public.portal_brand(text) to anon, authenticated;
