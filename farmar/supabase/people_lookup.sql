-- 👤 Vyhľadanie človeka v našej databáze podľa mena (Pridať človeka z firmy – automatické vyplnenie e-mailu / telefónu). Iba majiteľ.
create or replace function public.ppl_norm(t text) returns text language sql immutable set search_path=public as $$
  select regexp_replace(lower(translate(coalesce(t,''),
    'áäčďéěíĺľňóôöőŕřšťúůüűýžÁÄČĎÉĚÍĹĽŇÓÔÖŐŔŘŠŤÚŮÜŰÝŽ','aacdeeillnoooorrstuuuuyzAACDEEILLNOOOORRSTUUUUYZ')),'[^a-z0-9@.+ ]',' ','g') $$;

create or replace function public.people_lookup(q text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare toks text[]; res jsonb;
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
  return res;
end $$;
revoke all on function public.people_lookup(text) from public, anon;
grant execute on function public.people_lookup(text) to authenticated;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select current_date,'👤 Pridať človeka z firmy – kontakt z našej databázy','Kurací trus → Prístupy → Pridať človeka z firmy','majiteľ',array['owner'],
 'Po napísaní mena aplikácia nájde človeka v našej databáze (farmári, tím, firmy, kontakty na vykládke, prístupy, GDPR podpisy) a sama vyplní telefón alebo e-mail. Pri viacerých nájdených ťukneš na správny kontakt.'
where not exists(select 1 from app_novinky where titul='👤 Pridať človeka z firmy – kontakt z našej databázy');
