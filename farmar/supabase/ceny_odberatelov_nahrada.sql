-- ===== 🏷️ CENY ODBERATEĽOV – NOVÁ CENA NAHRÁDZA STARÚ (7. 11. 06:57 PRÍKAZ MAJITEĽA) =====
-- „Prečo tu ukazuje v kukurici predaj Agro-Somotor 230, keď už má novú cenu 215 DDP … daj pevnú sekciu viditeľnú pridať odberateľské ceny“
-- Príčina: Kde predať / Naše ceny brali NAJVYŠŠIU cenu zo všetkých záznamov odberateľa (staré ponuky 21 dní + skutočný predaj z lístkov),
-- takže nová nižšia cena nikdy „nevyhrala“.
-- Odteraz: nová cena odberateľa NAHRADÍ jeho staršie ceny tej istej komodity (pri odberateľovi s viacerými miestami iba toho istého miesta;
-- ceny na neskorší odber „odber …“ iba toho istého obdobia). Staré idú do archívu sell_offers_old (nič sa nestratí, dá sa vrátiť).
-- Oprava: Agro-Somotor kukurica 215 €/t = DDP Somotor (6. 11. zapísané ako FCA + DAP 224,4 – chyba).

create table if not exists public.sell_offers_old(id bigint primary key, buyer text, com text, d date, price numeric, del text, site text, period text,
  r jsonb not null, off_at timestamptz not null default now(), off_by bigint, off_why text, off_who text default lower(coalesce(auth.jwt()->>'email','')));
alter table public.sell_offers_old enable row level security;
revoke all on public.sell_offers_old from anon;
drop policy if exists sell_offers_old_own on public.sell_offers_old;
create policy sell_offers_old_own on public.sell_offers_old for select using (is_owner());
grant select on public.sell_offers_old to authenticated;

-- skupina ceny: odberateľ s ≥ 2 miestami + DAP/DDP/CPT na miesto → to miesto (odb_site_key); inak jedna skupina „*“ (FCA, jedno miesto)
create or replace function public.sell_grp(p_buyer text, p_del text, p_site text) returns text language sql stable security definer set search_path=public as $$
  select case when upper(coalesce(p_del,'')) not in ('FCA','EXW') and nullif(btrim(coalesce(p_site,'')),'') is not null
      and coalesce((select jsonb_array_length(coalesce(b.sites,'[]'::jsonb)) from sell_buyers b where b.id=p_buyer),0)>=2
    then 's:'||odb_site_key(p_del,p_site) else '*' end $$;
-- obdobie: dnešný odber = '' ; neskorší odber „odber …“ = vlastná skupina podľa textu obdobia
create or replace function public.sell_fw(p_period text) returns text language sql immutable as $$
  select case when coalesce(p_period,'') ~* '^\s*odber' then 'F:'||lower(regexp_replace(p_period,'\s+','','g')) else '' end $$;

create or replace function public.sell_offers_supersede(p_id bigint) returns int language plpgsql security definer set search_path=public as $$
declare v_n sell_offers; k int:=0;
begin
  select * into v_n from sell_offers where id=p_id; if not found then return 0; end if;
  with z as (delete from sell_offers o where o.id<>v_n.id and o.buyer=v_n.buyer and o.com=v_n.com
        and sell_fw(o.period)=sell_fw(v_n.period) and sell_grp(o.buyer,o.del,o.site)=sell_grp(v_n.buyer,v_n.del,v_n.site)
        and (o.d<v_n.d or (o.d=v_n.d and o.created_at<v_n.created_at)) returning o.*)
  insert into sell_offers_old(id,buyer,com,d,price,del,site,period,r,off_by,off_why)
    select z.id,z.buyer,z.com,z.d,z.price,z.del,z.site,z.period,to_jsonb(z),v_n.id,
      'nahradená novšou cenou: '||v_n.del||coalesce(' '||nullif(v_n.site,''),'')||' '||trim(to_char(v_n.price,'FM999990.##'))||' €/t ('||to_char(v_n.d,'FMDD. FMMM.')||')' from z
    on conflict (id) do nothing;
  get diagnostics k=row_count; return k;
end $$;
revoke all on function public.sell_offers_supersede(bigint) from public, anon, authenticated;

create or replace function public.sell_offers_sup_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
  begin perform sell_offers_supersede(new.id); exception when others then null; end;  -- nikdy nezastaví uloženie novej ceny
  return null;
end $$;
drop trigger if exists zz_sell_sup on public.sell_offers;
create trigger zz_sell_sup after insert on public.sell_offers for each row execute function public.sell_offers_sup_trg();

-- 🗑️ zmazať cenu (Martin) → archív; ↩️ vrátiť späť z archívu; ✏️ oprava = nová cena (stará do archívu)
create or replace function public.sell_offer_off(p_id bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare z sell_offers;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  delete from sell_offers where id=p_id returning * into z;
  if not found then return jsonb_build_object('ok',false,'err','Cena sa nenašla – obnov zoznam.'); end if;
  insert into sell_offers_old(id,buyer,com,d,price,del,site,period,r,off_why)
    values(z.id,z.buyer,z.com,z.d,z.price,z.del,z.site,z.period,to_jsonb(z),'zmazal Martin') on conflict(id) do nothing;
  return jsonb_build_object('ok',true,'id',z.id);
end $$;
revoke all on function public.sell_offer_off(bigint) from public, anon; grant execute on function public.sell_offer_off(bigint) to authenticated;

create or replace function public.sell_offer_back(p_id bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare o sell_offers_old; z sell_offers;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select * into o from sell_offers_old where id=p_id; if not found then return jsonb_build_object('ok',false,'err','V archíve nie je.'); end if;
  z:=jsonb_populate_record(null::sell_offers,o.r);
  insert into sell_offers overriding system value select (z).*;
  delete from sell_offers_old where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id);
end $$;
revoke all on function public.sell_offer_back(bigint) from public, anon; grant execute on function public.sell_offer_back(bigint) to authenticated;

-- archív (posledných 60 dní) pre sekciu 🏷️ Ceny odberateľov
create or replace function public.sell_offers_old_list(p_dni int default 30) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'buyer',o.buyer,'b',b.name,'com',o.com,'d',o.d,'price',o.price,'del',o.del,'site',o.site,'period',o.period,
      'off_at',o.off_at,'why',o.off_why) order by o.off_at desc) from (select * from sell_offers_old where off_at>now()-make_interval(days=>least(greatest(p_dni,1),60)) order by off_at desc limit 80) o
    left join sell_buyers b on b.id=o.buyer),'[]'::jsonb);
end $$;
revoke all on function public.sell_offers_old_list(int) from public, anon; grant execute on function public.sell_offers_old_list(int) to authenticated;

-- upratanie existujúcich cien: staršie ceny tej istej skupiny → archív
do $$ begin
  with z as (delete from sell_offers o where exists(select 1 from sell_offers n where n.id<>o.id and n.buyer=o.buyer and n.com=o.com
        and sell_fw(n.period)=sell_fw(o.period) and sell_grp(n.buyer,n.del,n.site)=sell_grp(o.buyer,o.del,o.site)
        and (n.d>o.d or (n.d=o.d and n.created_at>o.created_at))) returning o.*)
  insert into sell_offers_old(id,buyer,com,d,price,del,site,period,r,off_why,off_who)
    select z.id,z.buyer,z.com,z.d,z.price,z.del,z.site,z.period,to_jsonb(z),'nahradená novšou cenou (upratanie 7. 11.)','systém' from z on conflict (id) do nothing;
end $$;

-- oprava Konkurenčných cien: Agro-Somotor kukurica 215 zo 6. 11. = DDP Somotor (nie FCA)
do $$ declare k jsonb; begin
  select data into k from kalk_store where path='pricelist' and id='konk';
  if k is null or jsonb_typeof(k->'items')<>'array' then return; end if;
  k:=jsonb_set(k,'{items}',(select jsonb_agg(case when (i->>'who') ~* 'somotor' and i->>'com'='kukurica' and i->>'d'='2026-11-06' and (i->>'price')::numeric=215
        then i||jsonb_build_object('del','DDP','place','Somotor','term','kupuje od nás · DDP Somotor (oprava 7. 11.)') else i end order by n)
      from jsonb_array_elements(k->'items') with ordinality q(i,n)));
  update kalk_store set data=k where path='pricelist' and id='konk';
end $$;
