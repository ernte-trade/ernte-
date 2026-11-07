-- 7. 11. 2026 06:29 PRÍKAZ MAJITEĽA: „Obchodné návrhy AI – mail máš zakázaný odosielať, priprav mi ho na odoslanie, odosielateľ ernte@ernte.sk,
-- príjemca automaticky podľa toho komu ide, ja si ho prečítam a stlačím odoslať … sprav mi to do app prijaté a odoslané a ukladaj všetky čo posielame,
-- jedno či VALKO, DANUBE, ERNTE – všetko daj priečinky: toto išlo z VALKO, prišlo z VALKO atď.“
-- mail_box = archív e-mailov, ktoré Martin odoslal zo svojej schránky (pripravené v aplikácii, ✔️ Odoslal som) + zdieľané dokumenty.
-- mail_box_list = priečinky Prijaté / Odoslané × ERNTE / VALKO / DANUBE: mail_box + staršie e-maily odoslané aplikáciou (mail_jobs)
--   + prijatá pošta erntespol (lead_replies) + odpovede označené ✔️ Odoslal som. Vidí IBA Martin (price_main) – ako Pošta.
create table if not exists public.mail_box(
  id bigserial primary key,
  firma text not null check (firma in ('ernte','valko','danube')),
  smer text not null check (smer in ('prijate','odoslane')),
  od text, komu text, kopia text, predmet text, text text,
  at timestamptz not null default now(),
  zdroj text, ref text, prilohy jsonb,
  stav text not null default 'odoslane' check (stav in ('odoslane','zdielane','otvorene')),
  created_by text default lower(coalesce(auth.jwt()->>'email','')));
create index if not exists mail_box_at on public.mail_box(at desc);
create unique index if not exists mail_box_ref on public.mail_box(zdroj,ref,smer) where ref is not null;
alter table public.mail_box enable row level security;   -- bez pravidiel: čítanie a zápis iba cez funkcie nižšie

create or replace function public.mail_box_add(p jsonb) returns bigint language plpgsql security definer set search_path=public as $$
declare nid bigint; f text:=lower(coalesce(p->>'firma','ernte')); s text:=lower(coalesce(p->>'smer','odoslane')); st text:=lower(coalesce(p->>'stav','odoslane'));
begin
  if not coalesce(price_main(),false) then raise exception 'Iba Martin.'; end if;
  if f not in ('ernte','valko','danube') then f:='ernte'; end if;
  if s not in ('prijate','odoslane') then raise exception 'Smer: prijate alebo odoslane.'; end if;
  if st not in ('odoslane','zdielane','otvorene') then st:='odoslane'; end if;
  insert into mail_box(firma,smer,od,komu,kopia,predmet,text,zdroj,ref,prilohy,stav)
  values(f,s,left(p->>'od',300),left(p->>'komu',500),left(p->>'kopia',500),left(p->>'predmet',400),left(p->>'text',20000),left(p->>'zdroj',40),nullif(left(p->>'ref',120),''),
         case when jsonb_typeof(p->'prilohy')='array' then p->'prilohy' end,st)
  on conflict (zdroj,ref,smer) where ref is not null do update set od=excluded.od, komu=excluded.komu, predmet=excluded.predmet, text=excluded.text,
     prilohy=coalesce(excluded.prilohy,mail_box.prilohy), stav=excluded.stav, at=now()
  returning id into nid;
  return nid;
end $$;

create or replace function public.mail_box_list(p_smer text default null, p_firma text default null, p_days int default 180) returns jsonb
 language plpgsql stable security definer set search_path=public as $$
declare d int:=greatest(1,least(coalesce(p_days,180),730)); res jsonb;
begin
  if not coalesce(price_main(),false) then raise exception 'Iba Martin.'; end if;
  with z as (
    select 'mb'||m.id k, m.firma, m.smer, m.od, m.komu, m.predmet, left(m.text,8000) text, m.at, m.zdroj, m.stav, m.prilohy from mail_box m where m.at>now()-make_interval(days=>d)
    union all
    select 'mj'||j.id, case j.profile when 'valko' then 'valko' when 'danube' then 'danube' else 'ernte' end, 'odoslane',
      coalesce(nullif(j.from_name,''),'aplikácia')||case j.profile when 'ponuky' then ' · erntespol@gmail.com' when 'ernte' then ' · erntevykup@gmail.com'
        when 'danube' then ' · danube.commodities.kft@gmail.com' when 'valko' then ' · valko-logistics.sk' else '' end,
      j.to_addr, j.subject, left(j.body,8000), coalesce(j.sent_at,j.created_at), 'aplikacia', 'odoslane', case when j.att_name is not null then jsonb_build_array(j.att_name) end
    from mail_jobs j where j.status='odoslany' and coalesce(j.sent_at,j.created_at)>now()-make_interval(days=>d)
    union all
    select 'lr'||r.id, 'ernte', 'prijate', coalesce(nullif(r.from_name,'')||' <'||r.from_addr||'>',r.from_addr), coalesce(nullif(r.acct,''),'erntespol@gmail.com'),
      r.subject, left(r.body,8000), coalesce(r.received,r.at), 'gmail', r.status, null
    from lead_replies r where coalesce(r.received,r.at)>now()-make_interval(days=>d) and coalesce(r.status,'')<>'hromadna'
    union all
    select 'la'||r.id, 'ernte', 'odoslane', 'odpoveď (ERNTE)', r.from_addr, 'Re: '||coalesce(r.subject,''), left(r.draft,8000), coalesce(r.done_at,r.at), 'odpoved', 'odoslane', null
    from lead_replies r where r.status='odpovedane' and coalesce(trim(r.draft),'')<>'' and coalesce(r.done_at,r.at)>now()-make_interval(days=>d)
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(q) order by q.at desc) from (select * from z where (p_smer is null or smer=p_smer) and (p_firma is null or firma=p_firma) order by at desc limit 400) q),'[]'::jsonb),
    'counts',coalesce((select jsonb_object_agg(firma||':'||smer,n) from (select firma,smer,count(*) n from z group by 1,2) c),'{}'::jsonb),
    'gmail',(select value->>'at' from ai_state where key in ('lead_reply_seen','zuct_inbox_ping') order by key limit 1))
  into res;
  return res;
end $$;

-- 🤝 obchodný návrh AI: e-mail pripravený na odoslanie zo schránky Martina (odosielateľ ernte@ernte.sk, príjemca z návrhu, text v jazyku krajiny + pätička GDPR)
create or replace function public.sales_lead_draft(p_id bigint) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare l sales_leads;
begin
  if not coalesce(price_main(),false) then raise exception 'Ponuku odosiela iba Martin.'; end if;
  select * into l from sales_leads where id=p_id;
  if l.id is null or l.status not in ('navrh','chyba','schvalit') then raise exception 'Tento návrh sa už odoslal alebo zamietol.'; end if;
  if coalesce(l.email,'') !~ '^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$' then raise exception 'Chýba e-mail firmy – doplň ho v úprave.'; end if;
  if exists(select 1 from mail_optout where email=lower(trim(l.email))) then raise exception 'Táto firma sa odhlásila z obchodných e-mailov – neposielať (GDPR).'; end if;
  if coalesce(trim(l.body_loc),'')='' then raise exception 'Chýba preložený text – počkaj na preklad.'; end if;
  return jsonb_build_object('id',l.id,'od','ernte@ernte.sk','komu',lower(trim(l.email)),'predmet',left(coalesce(nullif(l.subj_loc,''),l.subj_sk,'ERNTE spol. s r.o.'),200),
    'text',left(l.body_loc,7000)||mail_gdpr_footer(coalesce(l.lang,l.country)),'firma',l.company,'lang',l.lang);
end $$;

-- ✔️ Odoslal som (zo svojej schránky) → návrh odoslaný + uložené v Odoslaných (ERNTE)
create or replace function public.sales_lead_sent_manual(p_id bigint, p_od text default 'ernte@ernte.sk', p_komu text default null, p_predmet text default null, p_text text default null)
 returns text language plpgsql security definer set search_path=public as $$
declare l sales_leads; me text:=lower(coalesce(auth.jwt()->>'email',''));
begin
  if not coalesce(price_main(),false) then raise exception 'Ponuku odosiela iba Martin.'; end if;
  select * into l from sales_leads where id=p_id for update;
  if l.id is null or l.status not in ('navrh','chyba','schvalit') then raise exception 'Tento návrh sa už odoslal alebo zamietol.'; end if;
  update sales_leads set status='odoslany', by_email=me, decided_at=now(), err=null where id=p_id;
  perform mail_box_add(jsonb_build_object('firma','ernte','smer','odoslane','od',coalesce(nullif(p_od,''),'ernte@ernte.sk'),'komu',coalesce(nullif(p_komu,''),l.email),
    'predmet',coalesce(nullif(p_predmet,''),l.subj_loc,l.subj_sk),'text',coalesce(nullif(p_text,''),l.body_loc),'zdroj','navrh_ai','ref',l.id::text,'stav','odoslane'));
  return 'ok';
end $$;

revoke all on function public.mail_box_add(jsonb), public.mail_box_list(text,text,int), public.sales_lead_draft(bigint), public.sales_lead_sent_manual(bigint,text,text,text,text) from public, anon;
grant execute on function public.mail_box_add(jsonb), public.mail_box_list(text,text,int), public.sales_lead_draft(bigint), public.sales_lead_sent_manual(bigint,text,text,text,text) to authenticated;
