-- 👤 people_lookup 2: keď sa človek nenájde v známych tabuľkách, prehľadá AUTOMATICKY všetky tabuľky našej databázy
-- (riadky, kde je meno, a z nich e-mail / telefón). Iba majiteľ. Bez logov, bez veľkých JSON blokov.
create or replace function public.people_lookup(q text) returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare toks text[]; res jsonb; tb record; rows jsonb; lt text; extra jsonb:='[]'::jsonb; t0 timestamptz:=clock_timestamp();
begin
  if not is_owner() then return '[]'::jsonb; end if;
  select array_agg(w) into toks from unnest(regexp_split_to_array(regexp_replace(ppl_norm(q),'[.+]',' ','g'),'\s+')) w
   where length(w)>=3 and w !~ '@' and w not in ('ing','mgr','bc','phd','judr','mudr','mvdr','rndr','paeddr','doc','prof','dr','csc','kft','zrt','sro');
  if toks is null then return '[]'::jsonb; end if;
  with src as (
    select f.name nm, f.email em, f.phone ph, 'Farmár'::text s, coalesce(f.name,'')||' '||coalesce(f.note,'') hay from farmers f
    union all select st.name, coalesce(nullif(st.mail,''),st.email), st.phone, 'Tím', st.name from staff st
    union all select coalesce(p.contact,p.name), p.email, p.phone, 'Firma '||p.name, coalesce(p.contact,'')||' '||p.name from trus_partners p where coalesce(p.contact,'')<>''
    union all select u.contact, (regexp_match(u.contact,'[^\s,;]+@[^\s,;]+'))[1], (regexp_match(u.contact,'\+?\d[\d /-]{7,}\d'))[1], 'Vykládka '||u.name, u.contact from trus_unload u where coalesce(u.contact,'')<>''
    union all select tu.name, case when tu.login like '%@tel.ernte.sk' then null else tu.login end, case when tu.login like '%@tel.ernte.sk' then '+'||split_part(tu.login,'@',1) end, 'Prístup (trus)', coalesce(tu.name,'') from trus_users tu
    union all select g.name, case when g.email like '%@tel.ernte.sk' then null else g.email end, case when g.email like '%@tel.ernte.sk' then '+'||split_part(g.email,'@',1) end, 'GDPR podpis', g.name from gdpr_sign g
  ), hit as (
    select distinct on (lower(coalesce(em,'')), regexp_replace(coalesce(ph,''),'\D','','g')) nm, nullif(trim(em),'') em, nullif(trim(ph),'') ph, s
    from src where (coalesce(em,'')<>'' or coalesce(ph,'')<>'')
      and (select bool_and(position(t in ppl_norm(hay))>0) from unnest(toks) t)
    order by lower(coalesce(em,'')), regexp_replace(coalesce(ph,''),'\D','','g'), s
  )
  select coalesce(jsonb_agg(jsonb_build_object('name',nm,'email',em,'phone',ph,'src',s)),'[]'::jsonb) into res from (select * from hit limit 8) h;
  if jsonb_array_length(res)>0 then return res; end if;

  -- automaticky celá databáza: každá tabuľka v public (okrem logov, tajomstiev, polôh) do 200 000 riadkov
  lt:=(select t from unnest(toks) t order by length(t) desc limit 1);
  for tb in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' and c.reltuples<200000
       and c.relname !~ '(log|_hist|history|gps|pos|track|secret|vault|smtp|token|push_sub|ai_msg|i18n|qbank|qseen|market|price|cennik|kid_|invest|ui_issues|tab_use|audit)'
       and c.relname not in ('farmers','staff','trus_partners','trus_unload','trus_users','gdpr_sign')
     order by c.relname
  loop
    exit when clock_timestamp()-t0>interval '6 seconds' or jsonb_array_length(extra)>=8;
    begin
      execute format($q$select coalesce(jsonb_agg(j),'[]') from (select to_jsonb(ppl_row__)::text j from %I ppl_row__
                        where length(to_jsonb(ppl_row__)::text)<6000 and ppl_norm(to_jsonb(ppl_row__)::text) like '%%'||$1||'%%' limit 20) z$q$, tb.relname)
        into rows using lt;
    exception when others then rows:='[]'; end;
    if jsonb_array_length(rows)>0 then
      extra:=extra||coalesce((select jsonb_agg(jsonb_build_object('name',q,'email',case when em ~* '(ernte\.sk|valko[a-z.-]*|gmail\.com)$' and em ~* '(ernte|valko)' then null else em end,'phone',ph,'src','Databáza · '||tb.relname))
        from (select distinct
                (regexp_match(r.v,'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}'))[1] em,
                (regexp_match(r.v,'(?:\+|00)(?:421|420|36|43)[ /-]?\d{2,3}[ /-]?\d{3}[ /-]?\d{3,4}|\m0\d{3}[ /-]?\d{3}[ /-]?\d{3}\M'))[1] ph
              from jsonb_array_elements_text(rows) r(v)
              where (select bool_and(position(k in ppl_norm(r.v))>0) from unnest(toks) k)) e
        where (em is not null and em !~* '(ernte|valko)') or ph is not null),'[]'::jsonb);
    end if;
  end loop;
  return coalesce((select jsonb_agg(v) from (select distinct v from jsonb_array_elements(extra) v limit 8) d),'[]'::jsonb);
end $$;
revoke all on function public.people_lookup(text) from public, anon;
grant execute on function public.people_lookup(text) to authenticated;
-- (ppl_norm a novinka: pozri 20261101-0635-kontakt-z-databazy)
