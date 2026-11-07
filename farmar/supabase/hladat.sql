-- ===== 🔎 HĽADAŤ VŠETKO (7. 11. 07:44 PRÍKAZ MAJITEĽA „nač je tam možnosť hľadať, keď nič nevie nájsť – musí nájsť všetko, čo je v app aj u používateľov“) =====
-- hladaj(q): SECURITY INVOKER – každý nájde iba to, na čo má prístup (RLS tabuliek platí ako v aplikácii).
-- Slová sa hľadajú bez diakritiky a so skrátenou koncovkou (zmluva → zmluv…, odberateľa → odberate…), všetky slová musia sedieť.
create or replace function public.hl_n(p text) returns text language sql immutable as $$
  select lower(translate(coalesce(p,''),'áäčďéěíĺľňóôöőŕřšťúůüűýžÁÄČĎÉĚÍĹĽŇÓÔÖŐŔŘŠŤÚŮÜŰÝŽ','aacdeeillnoooorrstuuuuyzAACDEEILLNOOOORRSTUUUUYZ')) $$;
-- koreň slova bez slovenskej koncovky (ako hladat.js STEM): odberateľské → odberatel, zmluvy → zmluv
create or replace function public.hl_stem(w text) returns text language plpgsql immutable as $$
declare x text;
begin
  if length(w)<=4 or w ~ '[0-9]' then return w; end if;
  foreach x in array array['ovskeho','ovskych','skeho','skych','skymi','skom','ovia','ami','ach','ych','ymi','ich','imi','ove','ova','ovi','sky','ska','ske','ski','eho','emu','ej','om','ov','mi','ia','ie','ou','ym','y','a','e','i','u','o'] loop
    if right(w,length(x))=x and length(w)-length(x)>=4 then return left(w,length(w)-length(x)); end if;
  end loop;
  return w;
end $$;
create or replace function public.hl_tok(p text) returns text[] language sql immutable as $$
  select coalesce(array_agg(hl_stem(w)),'{}')
  from regexp_split_to_table(regexp_replace(hl_n(p),'[^a-z0-9@.+/-]+',' ','g'),'\s+') w where length(w)>=2 $$;
-- rovnaký význam, iné slovo (ako hladat.js SYN)
create or replace function public.hl_alt(p_t text) returns text[] language sql immutable as $$
  select array(select distinct x from (select p_t x union all
    select unnest(g) from (values (array['cenn','ceny','vykup']),(array['zuct','vyuct']),(array['vazn','vaze']),(array['listk','listok']),(array['zmlu','obchod','kontrakt','dohod']),
      (array['auto','vozid','kamion','spz','flotil']),(array['farm','dodavat','pestovat','klient']),(array['odberat','predajn','kupuj']),(array['ponuk','predaj']),(array['dopr','prevoz','odvoz','jazd']),
      (array['tim','zamestn','ludi','pouzivat','pristup']),(array['fakt','doklad']),(array['mzd','vyplat'])) v(g)
    where exists(select 1 from unnest(g) y where p_t like y||'%' or y like p_t||'%')) q) $$;
create or replace function public.hl_ok(p_hay text, p_t text[]) returns boolean language sql immutable as $$
  select not exists(select 1 from unnest(p_t) t where not exists(select 1 from unnest(hl_alt(t)) a where position(a in p_hay)>0)) $$;

create or replace function public.hladaj(p_q text) returns jsonb language plpgsql stable set search_path=public as $$
declare t text[]:=hl_tok(p_q); r jsonb:='[]'::jsonb; x jsonb; nd text:=regexp_replace(hl_n(p_q),'[\s-]','','g');
begin
  if coalesce(array_length(t,1),0)=0 then return r; end if;
  -- zmluvy s farmármi (kúpne)
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Zmluvy s farmármi','k','deal','id',d.id,'tab','deals',
      't',coalesce(d.no,'bez čísla')||' · '||coalesce(f.name,''),'s',concat_ws(' · ',d.com,d.tons||' t',d.price||' €/t',d.term,d.status)) z
    from deals d left join farmers f on f.id=d.farmer_id
    where hl_ok(hl_n(concat_ws(' ','kupna zmluva nakup obchod farmar',d.no,f.name,f.ico,d.com,d.term,d.note,d.status)),t) or (length(nd)>=3 and replace(hl_n(d.no),' ','') like '%'||nd||'%')
    order by d.created_at desc limit 10) q; r:=r||x; exception when others then null; end;
  -- farmári / dodávatelia
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Farmári a dodávatelia','k','farmer','id',f.id,'tab','farm','t',f.name,
      's',concat_ws(' · ',case when f.ico is not null then 'IČO '||f.ico end,f.addr,f.phone,f.email)) z
    from farmers f where hl_ok(hl_n(concat_ws(' ','farmar dodavatel klient',f.name,f.ico,f.addr,f.email,f.phone)),t) or (length(nd)>=4 and replace(coalesce(f.ico,''),' ','') like '%'||nd||'%')
    order by f.name limit 10) q; r:=r||x; exception when others then null; end;
  -- odberatelia (iba Martin – RLS)
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Odberatelia','k','buyer','id',b.id,'tab','home','t',b.name,
      's',concat_ws(' · ',array_to_string(b.coms,', '),(select string_agg(s->>'n',', ') from jsonb_array_elements(coalesce(b.sites,'[]'::jsonb)) s))) z
    from sell_buyers b where b.active and hl_ok(hl_n(concat_ws(' ','odberatel kupujuci predaj ceny odberatela',b.name,b.model,b.note,array_to_string(b.coms,' '),b.sites::text)),t) order by b.sort limit 8) q; r:=r||x; exception when others then null; end;
  -- predajné zmluvy (odberatelia)
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Predajné zmluvy s odberateľmi','k','sale','id',c.id,'tab','deals','t',coalesce(c.no,'')||' · '||c.buyer,
      's',concat_ws(' · ',c.com,c.tons||' t',c.price||' €/t',c.status)) z
    from sale_contracts c where hl_ok(hl_n(concat_ws(' ','predajna zmluva odberatel predaj kontrakt',c.no,c.buyer,c.ico,c.com,c.status)),t) order by c.created_at desc limit 8) q; r:=r||x; exception when others then null; end;
  -- spolupráca s odberateľmi (iba Martin – RLS)
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Spolupráca s odberateľmi','k','spol','id',s.id,'tab','deals','t',coalesce(s.nazov,b.name),'s',s.status) z
    from odb_spolupraca s join sell_buyers b on b.id=s.buyer where hl_ok(hl_n(concat_ws(' ','spolupraca odberatel navrh podmienky zmluva vzor zmluvy',s.nazov,b.name,s.status)),t) order by s.id limit 8) q; r:=r||x; exception when others then null; end;
  -- tím a používatelia s prístupom
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Tím a používatelia','k','staff','id',s.email,'tab','team','t',s.name,'s',concat_ws(' · ',s.role,s.phone,s.email)) z
    from staff s where hl_ok(hl_n(concat_ws(' ','tim zamestnanec pouzivatel pristup',s.name,s.email,s.phone,s.role)),t) order by s.name limit 8) q; r:=r||x; exception when others then null; end;
  -- vážne lístky
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Vážne lístky','k','ticket','id',v.ticket,'tab','zuct','t',v.ticket||' · '||coalesce(f.name,v.buyer,''),
      's',concat_ws(' · ',to_char(v.day,'DD.MM.YYYY'),v.com,round(v.net_kg/1000.0,2)||' t',v.plate,v.buyer)) z
    from deliveries v left join farmers f on f.id=v.farmer_id
    where hl_ok(hl_n(concat_ws(' ','vazny listok dodavka',v.ticket,v.plate,v.com,v.buyer,f.name)),t) or (length(nd)>=4 and replace(hl_n(coalesce(v.ticket,'')||' '||coalesce(v.plate,'')),' ','') like '%'||nd||'%')
    order by v.day desc limit 8) q; r:=r||x; exception when others then null; end;
  -- požiadavky farmárov
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Požiadavky','k','req','id',q0.id,'tab','req','t',coalesce(f.name,'')||' · '||q0.kind,
      's',concat_ws(' · ',q0.com,q0.tons||' t',q0.status,to_char(q0.created_at,'DD.MM.'))) z
    from requests q0 left join farmers f on f.id=q0.farmer_id where hl_ok(hl_n(concat_ws(' ','poziadavka dopyt ponuka predaj odvoz',f.name,q0.kind,q0.com,q0.note,q0.status)),t) order by q0.created_at desc limit 8) q; r:=r||x; exception when others then null; end;
  -- vozidlá
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Vozidlá','k','veh','id',v.id,'tab','fleet','t',coalesce(v.plate,v.name),'s',concat_ws(' · ',v.name,v.fleet)) z
    from cmd_vehicles v where hl_ok(hl_n(concat_ws(' ','auto vozidlo kamion spz',v.plate,v.name,v.fleet)),t) or (length(nd)>=3 and replace(hl_n(coalesce(v.plate,'')),' ','') like '%'||nd||'%') limit 8) q; r:=r||x; exception when others then null; end;
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Vozidlá','k','truck','id',k.no,'tab','trans','t',k.spz,'s',concat_ws(' · ','auto č. '||k.no,k.driver,k.phone)) z
    from trucks k where hl_ok(hl_n(concat_ws(' ','auto vozidlo kamion vodic spz',k.spz,k.driver,k.phone,k.trailer)),t) or (length(nd)>=3 and replace(hl_n(k.spz),' ','') like '%'||nd||'%') limit 6) q; r:=r||x; exception when others then null; end;
  -- funkcie aplikácie (novinky – kde to nájsť)
  begin select coalesce(jsonb_agg(z),'[]') into x from (select jsonb_build_object('g','Funkcie – kde to nájdeš','k','fn','id',n.id,'tab',null,'t',n.titul,'s',n.kde) z
    from app_novinky n where hl_ok(hl_n(concat_ws(' ',n.titul,n.kde,n.popis)),t) order by n.d desc, n.id desc limit 12) q; r:=r||x; exception when others then null; end;
  return r;
end $$;
revoke all on function public.hladaj(text) from public, anon; grant execute on function public.hladaj(text) to authenticated;
