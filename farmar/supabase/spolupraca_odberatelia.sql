-- ===== 🤝 SPOLUPRÁCA S ODBERATEĽMI + VZORY DODÁVATEĽSKÝCH ZMLÚV PRE FARMÁROV (7. 11. 07:15 PRÍKAZ MAJITEĽA) =====
-- „Pridaj mi návrhy a podmienky spolupráce s odberateľmi, tlačidlo nový návrh spolupráce u odberateľa; po mojom odsúhlasení dohodnutej
--  spolupráce u konkrétneho odberateľa generuj dodávateľskú zmluvu farmárov, daj mi ju prečítať a upraviť; po schválení ju používaj pri zmluve
--  pre farmára s možnosťou skrytou (vidím len ja a obchodník) vybrať odberateľa, kam to pôjde, a automaticky prispôsob zmluvu farmárovi,
--  podmienky môžem ešte ručne upraviť.“
-- odb_spolupraca = podmienky s odberateľom (IBA Martin – price_main). odb_vzor = vzor zmluvy pre farmára odvodený zo schválenej spolupráce
-- (bez mena odberateľa; čítať schválené smie aj obchodník s prístupom „deals“). deal_vzor = ktorý odberateľ / vzor ide k zmluve farmára
-- (iba tím); farmár dostane cez deal_zmluva_t() IBA podmienky svojej zmluvy – nikdy meno odberateľa.
-- Vlhkosť, nečistoty a zrážky za sušenie / čistenie ostávajú podľa zúčtovania ERNTE (settle_rules) – zmluva a zúčtovanie musia rátať rovnako.

create table if not exists public.odb_spolupraca(
  id bigint generated always as identity primary key,
  buyer text not null references sell_buyers(id) on delete cascade,
  status text not null default 'navrh' check (status in ('navrh','schvalena','zamietnuta','ukoncena')),
  nazov text, p jsonb not null default '{}'::jsonb, text text, src text not null default 'rucne',
  created_at timestamptz not null default now(), created_by text default lower(coalesce(auth.jwt()->>'email','')),
  updated_at timestamptz not null default now(), ok_at timestamptz, ok_by text);
create table if not exists public.odb_vzor(
  id bigint generated always as identity primary key,
  spol_id bigint references odb_spolupraca(id) on delete cascade,
  buyer text not null references sell_buyers(id) on delete cascade,
  verzia int not null default 1,
  status text not null default 'navrh' check (status in ('navrh','schvaleny','archiv')),
  t jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), created_by text default lower(coalesce(auth.jwt()->>'email','')),
  updated_at timestamptz not null default now(), ok_at timestamptz, ok_by text);
create table if not exists public.deal_vzor(
  deal_id uuid primary key references deals(id) on delete cascade,
  vzor_id bigint references odb_vzor(id) on delete set null, buyer text,
  t jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(), by text default lower(coalesce(auth.jwt()->>'email','')));

alter table public.odb_spolupraca enable row level security; alter table public.odb_vzor enable row level security; alter table public.deal_vzor enable row level security;
revoke all on public.odb_spolupraca, public.odb_vzor, public.deal_vzor from anon;
drop policy if exists odb_spol_main on public.odb_spolupraca; create policy odb_spol_main on public.odb_spolupraca for all using (price_main()) with check (price_main());
drop policy if exists odb_vzor_main on public.odb_vzor; create policy odb_vzor_main on public.odb_vzor for all using (price_main()) with check (price_main());
drop policy if exists deal_vzor_staff on public.deal_vzor; create policy deal_vzor_staff on public.deal_vzor for all using (is_staff() and has_perm('deals')) with check (is_staff() and has_perm('deals'));
grant select, insert, update, delete on public.odb_spolupraca, public.odb_vzor, public.deal_vzor to authenticated;

do $$ begin
  if to_regprocedure('public.audit_trg()') is not null or exists(select 1 from pg_proc where proname='audit_trg') then
    execute 'drop trigger if exists zz_audit on public.odb_spolupraca';
    execute $q$create trigger zz_audit after insert or update or delete on public.odb_spolupraca for each row execute function public.audit_trg('id','{updated_at}','{}')$q$;
    execute 'drop trigger if exists zz_audit on public.odb_vzor';
    execute $q$create trigger zz_audit after insert or update or delete on public.odb_vzor for each row execute function public.audit_trg('id','{updated_at}','{}')$q$;
    execute 'drop trigger if exists zz_audit on public.deal_vzor';
    execute $q$create trigger zz_audit after insert or update or delete on public.deal_vzor for each row execute function public.audit_trg('deal_id','{at}','{}')$q$;
  end if;
end $$;

-- normy vlhkosti zo zúčtovania (settle_rules main.norm), inak Príloha 1
create or replace function public.ospl_norm(p_com text) returns numeric language sql stable security definer set search_path=public as $$
  select coalesce((select (value->'norm'->>p_com)::numeric from settle_rules where key='main'),
    case when p_com in ('repka','lo','ho') then 8 when p_com='soja' then 13 else 14 end) $$;

-- predvolené podmienky spolupráce pre odberateľa (návrh Claude): z jeho modelu v Kde predať
create or replace function public.ospl_default(p_buyer text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare b sell_buyers; fca boolean; k jsonb:='{}'::jsonb; c text; koms text[];
begin
  select * into b from sell_buyers where id=p_buyer; if not found then return '{}'::jsonb; end if;
  fca:=upper(coalesce(b.parita,''))='FCA';
  koms:=coalesce(b.coms,array[]::text[]);
  foreach c in array koms loop
    k:=k||jsonb_build_object(c,jsonb_build_object('vlh',ospl_norm(c),'nec',2,'ine',
      case c when 'soja' then 'bielkoviny v sušine min. 38 %; olej v sušine min. 22 %; Non-GMO'
             when 'kukurica' then 'Non-GMO; zlomky max. 3 %; aflatoxín B1 max. 0,02 mg/kg; fumonizíny max. 20 mg/kg'
             when 'repka' then 'olejnatosť min. 40 % (základ 40 %); kyselina eruková max. 2 %; glukozinoláty max. 25 µmol/g'
             when 'lo' then 'olejnatosť min. 44 %; Non-GMO'
             when 'ho' then 'olejnatosť min. 44 %; kyselina olejová min. 82 %'
             when 'psenica_p' then 'bielkoviny min. 12,5 %; objemová hmotnosť min. 76 kg/hl; číslo poklesu min. 220 s'
             when 'psenica_k' then 'objemová hmotnosť min. 72 kg/hl'
             when 'jacmen_k' then 'objemová hmotnosť min. 62 kg/hl'
             else '' end));
  end loop;
  return jsonb_build_object(
    'koms',to_jsonb(koms),
    'parita',case when fca then 'FCA' else 'DAP' end,
    'miesto',case when fca then 'FCA u farmára (odvoz zabezpečí odberateľ)' else coalesce(b.sites->0->>'n','') end,
    'doprava',case when fca then 'zabezpečí odberateľ' else 'zabezpečí ERNTE (VALKO)' end,
    'cena',case when b.float_burza then 'burza' else 'cennik' end,
    'cena_txt',case when b.float_burza then 'burza (MATIF / CBOT, najbližší kontrakt končiaci najskôr o 20 dní) + báza podľa ponuky odberateľa; cena sa fixuje pri uzavretí kontraktu'
                    else 'cena podľa aktuálneho cenníka / ponuky odberateľa; pevná pri uzavretí kontraktu' end,
    'platba',14,'tol',5,
    'vazenie','Váha a laboratórium odberateľa sú záväzné; ERNTE dostane vážny lístok a rozbor ku každému autu do 24 h (e-mail / Excel).',
    'reklam',3,'lab','SGS Slovakia spol. s r. o. Košice',
    'kvalita',k,
    'zrazky','Vlhkosť nad normu: váhová zrážka Ú = H × (V1 − V2) / (100 − V1) + sušenie podľa cenníka odberateľa; nečistoty nad 2 %: váhová zrážka + čistenie. Bez iných zrážok.',
    'cert','GMP+ FRA, ISCC EU (udržateľný tovar na požiadanie)','iscc',false,
    'mnozstvo','','platnost','30. 6. 2027','pozn','');
end $$;
revoke all on function public.ospl_default(text) from public, anon, authenticated;

-- vzor zmluvy pre farmára zo spolupráce (BEZ mena odberateľa)
create or replace function public.ospl_vzor_t(p jsonb) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare x jsonb:='{}'::jsonb; c text; v jsonb; r jsonb; s text; m text[]; os jsonb:='[]'::jsonb; tol numeric;
begin
  for c, v in select key, value from jsonb_each(coalesce(p->'kvalita','{}'::jsonb)) loop
    r:='[]'::jsonb;
    for s in select btrim(z) from regexp_split_to_table(coalesce(v->>'ine',''),'\s*;\s*') z where btrim(z)<>'' loop
      m:=regexp_match(s,'^(.+?)\s+((min|max)\.\s*.+)$');
      r:=r||jsonb_build_array(case when m is not null then jsonb_build_array(upper(left(m[1],1))||substr(m[1],2),m[2]) else jsonb_build_array('Požiadavka',s) end);
    end loop;
    if jsonb_array_length(r)>0 then x:=x||jsonb_build_object(c,r); end if;
  end loop;
  tol:=least(5,greatest(1,coalesce(nullif(p->>'tol','')::numeric,5)));
  if coalesce((p->>'iscc')::boolean,false) then
    os:=os||to_jsonb('Dodávateľ dodá predmet zmluvy ako udržateľný podľa ISCC EU a pred prvou dodávkou podpíše čestné vyhlásenie / samohodnotenie (príloha č. 3); bez neho nie je Odberateľ povinný dodávku prevziať.'::text);
  end if;
  os:=os||to_jsonb('Vážny lístok a výsledky rozboru z miesta vykládky sprístupní Odberateľ Dodávateľovi v aplikácii ERNTE spravidla do 2 pracovných dní od dodávky.'::text);
  os:=os||to_jsonb(('Ak Dodávateľ nesúhlasí s výsledkom merania, oznámi to Odberateľovi do '||coalesce(nullif(p->>'reklam',''),'3')||' pracovných dní od sprístupnenia vážneho lístka; ďalej sa postupuje podľa bodu III.7 (rozhodcovská vzorka). Po uplynutí lehoty platia namerané hodnoty.')::text);
  return jsonb_build_object(
    'miesto','FCA sklady Dodávateľa',
    'vazenie','Odovzdanie a prevzatie predmetu zmluvy, vrátane určenia množstva a kvality, sa uskutoční v mieste vykládky určenom Odberateľom (sklad Odberateľa alebo jeho zmluvného spracovateľa). Rozhodujúce sú merania a kontrola vykonané v mieste vykládky.',
    'preprava','Dodávateľ zabezpečí odovzdanie predmetu zmluvy do nákladných vozidiel zabezpečených Odberateľom alebo ním povereným dopravcom, pričom preprava do miesta vykládky je zabezpečená Odberateľom.',
    'lab',coalesce(nullif(p->>'lab',''),'SGS Slovakia spol. s r. o. Košice'),
    'platba',14,'tol',tol,'vyzva',10,'pokuta',20,
    'x',x,'gmp',true,'iscc',true,
    'osobitne',os);
end $$;
revoke all on function public.ospl_vzor_t(jsonb) from public, anon, authenticated;

-- zoznam pre Martina: odberatelia + spolupráca + vzory
create or replace function public.ospl_list() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return jsonb_build_object(
    'buyers',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'coms',b.coms,'parita',b.parita,'sites',b.sites,'fb',b.float_burza) order by b.sort,b.name) from sell_buyers b where b.active),'[]'::jsonb),
    'spol',coalesce((select jsonb_agg(to_jsonb(s) order by s.buyer,s.id desc) from odb_spolupraca s),'[]'::jsonb),
    'vzory',coalesce((select jsonb_agg(to_jsonb(v) order by v.buyer,v.verzia desc) from odb_vzor v where v.status<>'archiv'),'[]'::jsonb),
    'pouzite',coalesce((select jsonb_object_agg(q.vzor_id::text,q.n) from (select vzor_id,count(*) n from deal_vzor where vzor_id is not null group by vzor_id) q),'{}'::jsonb));
end $$;
revoke all on function public.ospl_list() from public, anon; grant execute on function public.ospl_list() to authenticated;

create or replace function public.ospl_new(p_buyer text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id bigint; v_nm text;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select name into v_nm from sell_buyers where id=p_buyer; if v_nm is null then raise exception 'Odberateľ sa nenašiel.'; end if;
  insert into odb_spolupraca(buyer,nazov,p,src) values(p_buyer,'Spolupráca '||v_nm||' '||extract(year from now())::int||'/'||(extract(year from now())::int+1-2000),ospl_default(p_buyer),'claude') returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end $$;
revoke all on function public.ospl_new(text) from public, anon; grant execute on function public.ospl_new(text) to authenticated;

create or replace function public.ospl_save(p_id bigint, p_nazov text, p jsonb, p_text text) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  update odb_spolupraca set nazov=coalesce(nullif(btrim(p_nazov),''),nazov), p=coalesce(ospl_save.p,odb_spolupraca.p), text=p_text, updated_at=now() where id=p_id;
  if not found then raise exception 'Návrh sa nenašiel – obnov zoznam.'; end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.ospl_save(bigint,text,jsonb,text) from public, anon; grant execute on function public.ospl_save(bigint,text,jsonb,text) to authenticated;

-- ✅ schváliť / ✕ zamietnuť / ⏹ ukončiť; pri schválení vznikne návrh vzoru zmluvy pre farmárov
create or replace function public.ospl_set(p_id bigint, p_status text) returns jsonb language plpgsql security definer set search_path=public as $$
declare s odb_spolupraca; v_vz bigint; v_ver int;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  if p_status not in ('schvalena','zamietnuta','ukoncena','navrh') then raise exception 'Neplatný stav.'; end if;
  update odb_spolupraca set status=p_status, updated_at=now(), ok_at=case when p_status='schvalena' then now() else ok_at end,
    ok_by=case when p_status='schvalena' then lower(coalesce(auth.jwt()->>'email','')) else ok_by end where id=p_id returning * into s;
  if not found then raise exception 'Návrh sa nenašiel.'; end if;
  if p_status='schvalena' then
    select id into v_vz from odb_vzor where spol_id=p_id and status='navrh' order by id desc limit 1;
    if v_vz is null then
      select coalesce(max(verzia),0)+1 into v_ver from odb_vzor where buyer=s.buyer;
      insert into odb_vzor(spol_id,buyer,verzia,t) values(p_id,s.buyer,v_ver,ospl_vzor_t(s.p)) returning id into v_vz;
    else update odb_vzor set t=ospl_vzor_t(s.p), updated_at=now() where id=v_vz; end if;
  elsif p_status in ('zamietnuta','ukoncena') then
    update odb_vzor set status='archiv', updated_at=now() where spol_id=p_id and status<>'archiv';
  end if;
  return jsonb_build_object('ok',true,'vzor',v_vz);
end $$;
revoke all on function public.ospl_set(bigint,text) from public, anon; grant execute on function public.ospl_set(bigint,text) to authenticated;

create or replace function public.ospl_del(p_id bigint) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  if exists(select 1 from deal_vzor d join odb_vzor v on v.id=d.vzor_id where v.spol_id=p_id) then raise exception 'Vzor z tejto spolupráce už je pri zmluvách farmárov – daj ⏹ Ukončiť, nie zmazať.'; end if;
  delete from odb_spolupraca where id=p_id and status in ('navrh','zamietnuta');
  if not found then raise exception 'Zmazať sa dá iba návrh alebo zamietnutá spolupráca.'; end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.ospl_del(bigint) from public, anon; grant execute on function public.ospl_del(bigint) to authenticated;

create or replace function public.ospl_vzor_save(p_id bigint, p_t jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v odb_vzor; v_ver int; v_new bigint;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select * into v from odb_vzor where id=p_id; if not found then raise exception 'Vzor sa nenašiel.'; end if;
  if v.status='schvaleny' then   -- úprava schváleného = nová verzia na schválenie (zmluvy, ktoré ho už používajú, sa nemenia)
    select coalesce(max(verzia),0)+1 into v_ver from odb_vzor where buyer=v.buyer;
    insert into odb_vzor(spol_id,buyer,verzia,t) values(v.spol_id,v.buyer,v_ver,p_t) returning id into v_new;
    return jsonb_build_object('ok',true,'id',v_new,'nova_verzia',v_ver);
  end if;
  update odb_vzor set t=p_t, updated_at=now() where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id);
end $$;
revoke all on function public.ospl_vzor_save(bigint,jsonb) from public, anon; grant execute on function public.ospl_vzor_save(bigint,jsonb) to authenticated;

create or replace function public.ospl_vzor_ok(p_id bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare v odb_vzor;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select * into v from odb_vzor where id=p_id; if not found then raise exception 'Vzor sa nenašiel.'; end if;
  if not exists(select 1 from odb_spolupraca where id=v.spol_id and status='schvalena') then raise exception 'Najprv schváľ spoluprácu s odberateľom.'; end if;
  update odb_vzor set status='archiv', updated_at=now() where buyer=v.buyer and status='schvaleny' and id<>p_id;
  update odb_vzor set status='schvaleny', ok_at=now(), ok_by=lower(coalesce(auth.jwt()->>'email','')), updated_at=now() where id=p_id;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.ospl_vzor_ok(bigint) from public, anon; grant execute on function public.ospl_vzor_ok(bigint) to authenticated;

-- 🏭 schválené vzory pre výber pri zmluve farmára (Martin + obchodník s prístupom deals)
create or replace function public.ospl_vzory() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not (is_staff() and has_perm('deals')) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'buyer',v.buyer,'name',b.name,'coms',coalesce(s.p->'koms',to_jsonb(b.coms)),'verzia',v.verzia,'t',v.t) order by b.sort,b.name)
    from odb_vzor v join sell_buyers b on b.id=v.buyer left join odb_spolupraca s on s.id=v.spol_id where v.status='schvaleny'),'[]'::jsonb);
end $$;
revoke all on function public.ospl_vzory() from public, anon; grant execute on function public.ospl_vzory() to authenticated;

create or replace function public.deal_vzor_set(p_deal uuid, p_vzor bigint, p_t jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v odb_vzor;
begin
  if not (is_staff() and has_perm('deals')) then raise exception 'Bez prístupu.'; end if;
  if not exists(select 1 from deals where id=p_deal) then raise exception 'Zmluva sa nenašla.'; end if;
  if p_vzor is null then delete from deal_vzor where deal_id=p_deal; return jsonb_build_object('ok',true,'zrusene',true); end if;
  select * into v from odb_vzor where id=p_vzor and status='schvaleny'; if not found then raise exception 'Vzor nie je schválený.'; end if;
  insert into deal_vzor(deal_id,vzor_id,buyer,t) values(p_deal,v.id,v.buyer,coalesce(p_t,v.t))
    on conflict(deal_id) do update set vzor_id=excluded.vzor_id, buyer=excluded.buyer, t=excluded.t, at=now(), by=lower(coalesce(auth.jwt()->>'email',''));
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.deal_vzor_set(uuid,bigint,jsonb) from public, anon; grant execute on function public.deal_vzor_set(uuid,bigint,jsonb) to authenticated;

create or replace function public.deal_vzor_map() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not (is_staff() and has_perm('deals')) then return '{}'::jsonb; end if;
  return coalesce((select jsonb_object_agg(d.deal_id::text,jsonb_build_object('vzor',d.vzor_id,'buyer',d.buyer,'name',b.name,'t',d.t,'at',d.at)) from deal_vzor d left join sell_buyers b on b.id=d.buyer),'{}'::jsonb);
end $$;
revoke all on function public.deal_vzor_map() from public, anon; grant execute on function public.deal_vzor_map() to authenticated;

-- podmienky zmluvy pre PDF: tím alebo farmár, ktorého je zmluva – IBA podmienky, nikdy odberateľ
create or replace function public.deal_zmluva_t(p_deal uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_t jsonb;
begin
  if not ((is_staff() and has_perm('deals')) or exists(select 1 from deals d where d.id=p_deal and d.farmer_id=my_farmer_id())) then return null; end if;
  select t into v_t from deal_vzor where deal_id=p_deal;
  return v_t;
end $$;
revoke all on function public.deal_zmluva_t(uuid) from public, anon; grant execute on function public.deal_zmluva_t(uuid) to authenticated;

-- návrhy Claude pre aktívnych odberateľov (raz)
insert into odb_spolupraca(buyer,nazov,p,src)
select b.id,'Spolupráca '||b.name||' 2026/27',ospl_default(b.id),'claude' from sell_buyers b
where b.active and coalesce(array_length(b.coms,1),0)>0 and not exists(select 1 from odb_spolupraca s where s.buyer=b.id);
