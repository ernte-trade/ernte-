-- 👥 OBCHODNÍCI PODĽA REGIÓNOV · 👔 PREHĽAD TÍMU · 📣 PRÍKAZY (7. 11. 2026 18:05 PRÍKAZ MAJITEĽA)
-- „ERNTE má len Košický a Prešovský kraj – Ceperko Prešovský, Galajda Košický, Jozsef východné Maďarsko, Ličko všetko ostatné aj medzinárodné;
--  nastav, aby to mali v aplikácii; ja (majiteľ, investor) chcem iba prehľady – stĺpcové grafy a krivky – a dávať príkazy kto, čo, kde, za čo.“
-- Nič sa nemaže: maďarskí farmári (DANUBE) sa v ERNTE iba nezobrazujú, ostávajú v Danube u Jozsefa.

alter table public.farmers add column if not exists obch text;
do $$ begin
  alter table public.farmers add constraint farmers_obch_chk check (obch is null or obch in ('galajda','ceperko','licko','jozsef'));
exception when duplicate_object then null; end $$;

-- obchodník → e-mail a meno (z tímu)
create or replace function public.obch_staff() returns table(k text, email text, name text) language sql stable security definer set search_path=public as $$
  select x.k, lower(s.email), s.name from (values ('galajda','galajda'),('ceperko','ceperko'),('licko','licko'),('jozsef','karoczkai')) x(k,rx)
  join lateral (select email,name from staff s where ev_norm(s.name) ~ x.rx and ev_norm(s.name) !~ 'test' order by s.created_at nulls last limit 1) s on true $$;
revoke all on function public.obch_staff() from public, anon, authenticated;

-- komu farmár patrí: 1) ručné pridelenie (Martin) 2) DANUBE: východné Maďarsko (PSČ 3–6) Jozsef, západ (1, 2, 7–9) Ličko
-- 3) Košický kraj Galajda, Prešovský Ceperko (NUTS alebo PSČ) 4) zahraničie Ličko 5) kto mu robil zmluvy 6) iný kraj SK Ličko; inak nepridelený (null)
create or replace function public.farmer_obch(f public.farmers) returns text language plpgsql stable security definer set search_path=public as $$
declare hu text; n text; k text;
begin
  if f.obch is not null then return f.obch; end if;
  if coalesce(f.firma,'ERNTE')='DANUBE' then
    hu:=substring(coalesce(f.addr,'') from '(?:^|\D)([1-9])\d{3}(?:\D|$)');
    return case when hu in ('1','2','7','8','9') then 'licko' else 'jozsef' end;
  end if;
  n:=coalesce(nullif(f.nuts,''), iscc_nuts_psc(substring(f.addr from '\d{3}\s?\d{2}')));
  if n='SK042' then return 'galajda'; end if;
  if n='SK041' then return 'ceperko'; end if;
  if coalesce(f.addr,'') ~* '(rakúsko|österreich|austria|wien|linz|graz|bulharsk|bulgaria|česk|czech|polsk|poland|polska|nemeck|deutschland|germany|maďarsk|magyarorsz|hungary|ukrajin|ukraine|rumunsk|romania|srbsk|serbia|chorvát|croatia|slovinsk|slovenia|taliansk|italy|holand|netherlands|belgick)' then return 'licko'; end if;
  select o.k into k from deals d join obch_staff() o on o.email=lower(d.created_by_email) where d.farmer_id=f.id group by o.k order by count(*) desc limit 1;
  if k is not null then return k; end if;
  if n like 'SK0%' then return 'licko'; end if;
  return null;
end $$;
revoke all on function public.farmer_obch(public.farmers) from public, anon, authenticated;

-- mapa pre aplikáciu: komu patrí ktorý farmár + kto som ja
create or replace function public.obch_map() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare me text:=lower(coalesce(auth.jwt()->>'email','')); r jsonb;
begin
  if not is_staff() then return '{}'::jsonb; end if;
  select jsonb_build_object(
    'me',(select k from obch_staff() where email=me),
    't',(select coalesce(jsonb_object_agg(k,jsonb_build_object('n',name,'kraj',case k when 'galajda' then 'Košický kraj' when 'ceperko' then 'Prešovský kraj' when 'jozsef' then 'východné Maďarsko (Danube)' else 'ostatné Slovensko a zahraničie' end)),'{}'::jsonb) from obch_staff()),
    'f',(select coalesce(jsonb_object_agg(f.id,farmer_obch(f)) filter (where farmer_obch(f) is not null),'{}'::jsonb) from farmers f)) into r;
  return r;
end $$;
revoke all on function public.obch_map() from public, anon; grant execute on function public.obch_map() to authenticated;

-- ručné pridelenie farmára obchodníkovi (Martin a Jana); null = podľa pravidla
create or replace function public.farmer_obch_set(p_farmer uuid, p_obch text) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Prideľuje iba majiteľ.'; end if;
  if p_obch is not null and p_obch not in ('galajda','ceperko','licko','jozsef') then raise exception 'Neznámy obchodník.'; end if;
  update farmers set obch=p_obch where id=p_farmer;
  if not found then raise exception 'Farmár neexistuje.'; end if;
  return jsonb_build_object('ok',true,'obch',(select farmer_obch(f) from farmers f where id=p_farmer));
end $$;
revoke all on function public.farmer_obch_set(uuid,text) from public, anon; grant execute on function public.farmer_obch_set(uuid,text) to authenticated;

-- 💰 „Farmár chce predať / žiada odvoz“ → push IBA obchodníkovi, ktorému farmár patrí (nepridelený → všetkým ako doteraz); DANUBE po maďarsky Jozsefovi
create or replace function public.req_team_push() returns trigger language plpgsql security definer set search_path=public as $$
declare fn text; em text[]; hu text[]; t text; m text; th text; mh text; u text:='https://app.ernte.sk/farmar/#tab/req'; f farmers; k text;
begin
  if new.kind not in ('sell','transport') then return null; end if;
  begin
    select * into f from farmers where id=new.farmer_id; fn:=f.name;
    k:=case when f.id is not null then farmer_obch(f) end;
    if k in ('galajda','ceperko','licko') then select coalesce(array_agg(email),'{}') into em from obch_staff() where obch_staff.k=k;
    elsif k='jozsef' then em:='{}';
    else select coalesce(array_agg(lower(email)),'{}') into em from staff where ev_norm(name) ~ '(galajda|ceperko|licko)'; end if;
    t:=case new.kind when 'sell' then '💰 Farmár chce predať' else '🚚 Farmár žiada odvoz' end||' · '||coalesce(fn,'');
    m:=concat_ws(' · ', case when new.com is not null then cennik_nm(new.com) end, case when new.tons is not null then cennik_num(new.tons)||' t' end,
       case when new.price is not null then cennik_num(new.price)||' €/t' end,
       case new.harvest when 'stara' then 'stará úroda – na sklade' when 'nova' then 'nová úroda' end,
       case when new.pickup_date is not null then 'odvoz '||to_char(new.pickup_date,'DD.MM.')||coalesce(' '||new.pickup_time,'') end,
       case when coalesce(new.firma,'ERNTE')='DANUBE' then 'DANUBE' end);
    if cardinality(em)>0 then perform push_web(t,m,5,'req-'||new.id,u,em,null); end if;
    if coalesce(new.firma,'ERNTE')='DANUBE' or k='jozsef' then
      select coalesce(array_agg(lower(email)),'{}') into hu from staff where ev_norm(name) ~ 'karoczkai';
      th:=case new.kind when 'sell' then '💰 Gazda eladni szeretne' else '🚚 Gazda szállítást kér' end||' · '||coalesce(fn,'');
      mh:=concat_ws(' · ', case when new.tons is not null then cennik_num(new.tons)||' t' end, case when new.price is not null then cennik_num(new.price)||' €/t' end,
         case new.harvest when 'stara' then 'régi termés – raktáron' when 'nova' then 'új termés' end,
         case when new.pickup_date is not null then 'elszállítás '||to_char(new.pickup_date,'MM.DD.')||coalesce(' '||new.pickup_time,'') end, 'DANUBE');
      if cardinality(hu)>0 then perform push_web(th,mh,5,'req-hu-'||new.id,u,hu,null); end if;
    end if;
  exception when others then null; end;
  return null;
end $$;

-- ---------- 📣 PRÍKAZY OD MARTINA ----------
create table if not exists public.prikazy(id bigserial primary key, at timestamptz not null default now(), by text default lower(coalesce(auth.jwt()->>'email','')),
  komu text not null, email text, text text not null, termin date, stav text not null default 'novy' check (stav in ('novy','videl','hotovo','zrusene')),
  videl_at timestamptz, hotovo_at timestamptz, odpoved text);
alter table public.prikazy enable row level security;
revoke all on public.prikazy from anon, authenticated;
create index if not exists prikazy_email on public.prikazy(email, stav);

create or replace function public.prikaz_new(p_komu text, p_text text, p_termin date default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare x record; n int:=0; t text:=trim(coalesce(p_text,''));
begin
  if not price_main() then raise exception 'Príkazy dáva iba Martin.'; end if;
  if length(t)<3 then raise exception 'Napíš, čo treba urobiť.'; end if;
  if p_termin is not null and p_termin<current_date then raise exception 'Termín je v minulosti.'; end if;
  for x in select * from obch_staff() where p_komu='vsetci' or k=p_komu loop
    insert into prikazy(komu,email,text,termin) values(x.k,x.email,left(t,1000),p_termin);
    perform push_web('📣 Príkaz od Martina', left(t,180)||coalesce(' · do '||to_char(p_termin,'DD.MM.'),''), 5, 'prikaz-'||x.k||'-'||extract(epoch from now())::bigint, 'https://app.ernte.sk/farmar/#prikazy', array[x.email], null);
    n:=n+1;
  end loop;
  if n=0 then raise exception 'Obchodník sa nenašiel.'; end if;
  return jsonb_build_object('ok',true,'n',n);
end $$;
revoke all on function public.prikaz_new(text,text,date) from public, anon; grant execute on function public.prikaz_new(text,text,date) to authenticated;

create or replace function public.prikaz_my() returns jsonb language plpgsql security definer set search_path=public as $$
declare me text:=lower(coalesce(auth.jwt()->>'email','')); r jsonb;
begin
  if me='' then return '[]'::jsonb; end if;
  update prikazy set stav='videl', videl_at=now() where email=me and stav='novy';
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'at',at,'text',text,'termin',termin,'stav',stav) order by coalesce(termin,'2999-01-01'), at),'[]'::jsonb) into r
    from prikazy where email=me and (stav in ('novy','videl') or (stav='hotovo' and hotovo_at>now()-interval '1 day'));
  return r;
end $$;
revoke all on function public.prikaz_my() from public, anon; grant execute on function public.prikaz_my() to authenticated;

create or replace function public.prikaz_done(p_id bigint, p_odp text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare me text:=lower(coalesce(auth.jwt()->>'email','')); p prikazy;
begin
  update prikazy set stav='hotovo', hotovo_at=now(), odpoved=nullif(left(trim(coalesce(p_odp,'')),1000),'') where id=p_id and email=me and stav in ('novy','videl') returning * into p;
  if p.id is null then raise exception 'Príkaz sa nenašiel alebo je už hotový.'; end if;
  begin perform push_web('✅ Splnené: '||coalesce((select name from obch_staff() where k=p.komu),p.komu), left(p.text,120)||coalesce(' · '||p.odpoved,''), 3, 'prikaz-ok-'||p.id, 'https://app.ernte.sk/farmar/#tim', push_main_emails(), null);
  exception when others then null; end;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.prikaz_done(bigint,text) from public, anon; grant execute on function public.prikaz_done(bigint,text) to authenticated;

create or replace function public.prikaz_zrus(p_id bigint) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  update prikazy set stav='zrusene' where id=p_id and stav<>'hotovo';
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.prikaz_zrus(bigint) from public, anon; grant execute on function public.prikaz_zrus(bigint) to authenticated;

-- ---------- 👔 PREHĽAD TÍMU (iba majitelia) ----------
create or replace function public.tim_prehlad(p_dni int default 30) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare d0 timestamptz:=now()-make_interval(days=>greatest(1,least(coalesce(p_dni,30),400))); r jsonb; w0 date:=date_trunc('week',now())::date-77;
begin
  if not is_owner() then raise exception 'Prehľad tímu vidí iba majiteľ.'; end if;
  with fo as (select f.id, farmer_obch(f) k, f.firma, f.name from farmers f where not is_test_name(f.name)),
  dl as (select d.*, fo.k from deals d join fo on fo.id=d.farmer_id where deal_live(d) and coalesce(d.status,'')<>'zruseny')
  select jsonb_build_object(
    'od',d0,'dni',p_dni,
    'ludia',(select jsonb_agg(jsonb_build_object('k',s.k,'n',s.name,
       'farmari',(select count(*) from fo where fo.k=s.k),
       'aktivni',(select count(distinct farmer_id) from dl where dl.k=s.k and dl.created_at>=d0),
       'zmluvy',(select count(*) from dl where dl.k=s.k and dl.created_at>=d0),
       'tony',(select coalesce(round(sum(tons)),0) from dl where dl.k=s.k and dl.created_at>=d0),
       'eur',(select coalesce(round(sum(tons*price)),0) from dl where dl.k=s.k and dl.created_at>=d0),
       'hovory',(select count(*) from plan_log l where lower(l.by_email)=s.email and l.at>=d0),
       'vybavil',(select count(*) from requests q where (lower(q.handled_by)=s.email or lower(q.accepted_by)=s.email) and coalesce(q.handled_at,q.accepted_at,q.created_at)>=d0),
       'dodane',(select coalesce(round(sum(v.net_kg)/1000),0) from deliveries v join fo on fo.id=v.farmer_id where fo.k=s.k and v.day>=d0::date),
       'poz_nove',(select count(*) from requests q join fo on fo.id=q.farmer_id where fo.k=s.k and q.created_at>=d0),
       'poz_otv',(select count(*) from requests q join fo on fo.id=q.farmer_id where fo.k=s.k and coalesce(q.status,'') not in ('vybavena','zamietnuta','zrusena')),
       'prikazy',(select count(*) from prikazy p where p.komu=s.k and p.stav in ('novy','videl')),
       'hotove',(select count(*) from prikazy p where p.komu=s.k and p.stav='hotovo' and p.hotovo_at>=d0),
       'tyzdne',(select coalesce(jsonb_agg(jsonb_build_object('w',w,'t',coalesce(t,0)) order by w),'[]'::jsonb) from (
           select gs::date w, (select round(sum(tons)) from dl where dl.k=s.k and dl.created_at>=gs and dl.created_at<gs+interval '7 days') t
           from generate_series(w0, date_trunc('week',now())::date, interval '7 days') gs) q)
     ) order by array_position(array['galajda','ceperko','licko','jozsef'],s.k)) from obch_staff() s),
    'nepridelene',(select coalesce(jsonb_agg(jsonb_build_object('id',fo.id,'n',fo.name,'z',(select count(*) from deals d where d.farmer_id=fo.id)) order by (select count(*) from deals d where d.farmer_id=fo.id) desc, fo.name),'[]'::jsonb)
       from fo where fo.k is null and exists(select 1 from deals d where d.farmer_id=fo.id)),
    'nepridelene_n',(select count(*) from fo where fo.k is null),
    'komodity',(select coalesce(jsonb_agg(jsonb_build_object('k',k,'com',com,'t',t)),'[]'::jsonb) from (select dl.k, dl.com, round(sum(dl.tons)) t from dl where dl.created_at>=d0 and dl.k is not null group by 1,2) q),
    'prikazy',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'at',at,'komu',komu,'text',text,'termin',termin,'stav',stav,'odpoved',odpoved,'hotovo_at',hotovo_at) order by (stav in ('novy','videl')) desc, at desc),'[]'::jsonb)
       from (select * from prikazy where stav<>'zrusene' and (stav in ('novy','videl') or at>now()-interval '30 days') order by at desc limit 40) p)
  ) into r;
  return r;
end $$;
revoke all on function public.tim_prehlad(int) from public, anon; grant execute on function public.tim_prehlad(int) to authenticated;
