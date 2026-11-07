-- 🐔 KURACÍ TRUS KOMPLET PRE MERIČKA A TÓTHA (7. 11. 2026 18:24 PRÍKAZ MAJITEĽA „kurací trus komplet musí vidieť Meričko a Tóth okrem marží a nákupnej ceny“)
-- nový prístup trus_full: vývozy, autá, váženie, predajná cena BPS, doprava VALKO, cenník pre odberateľa, fakturácia BPS a VALKO –
-- BEZ výkupnej (nákupnej) ceny od Baromfi, podkladu Baromfi → ERNTE, nákladov súpravy, zisku a marže (tie vidí iba majiteľ / trus_price).
create or replace function public.trus_staff_ok() returns boolean language sql stable security definer set search_path=public as $$
  select is_staff() and (has_perm('trus') or has_perm('trus_price') or has_perm('trus_full')) $$;

create or replace function public.trus_staff() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pr boolean; own boolean; fu boolean; c trus_cfg;
begin
  if not trus_staff_ok() and not is_owner() then raise exception 'Nemáte prístup k trusu.'; end if;
  own:=is_owner(); pr:=trus_price_ok() or own; fu:=not pr and is_staff() and has_perm('trus_full'); select * into c from trus_cfg where id=1;
  return jsonb_build_object('price',pr or fu,'nobuy',fu,'own',own,
    'cfg',case when own then to_jsonb(c)
      when pr then jsonb_build_object('buy_eur_t',c.buy_eur_t,'sell_eur_t',c.sell_eur_t,'trans_eur_km',c.trans_eur_km,'load_t',c.load_t,'vat_pct',c.vat_pct,'trans_invoicer',c.trans_invoicer,'ernte_icdph',c.ernte_icdph,'ernte_dic',c.ernte_dic)
      when fu then jsonb_build_object('sell_eur_t',c.sell_eur_t,'trans_eur_km',c.trans_eur_km,'load_t',c.load_t,'vat_pct',c.vat_pct,'trans_invoicer',c.trans_invoicer,'ernte_icdph',c.ernte_icdph,'ernte_dic',c.ernte_dic)
      else jsonb_build_object('load_t',c.load_t) end,
    'partners',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'kind',p.kind,'name',p.name,'addr',p.addr,'ico',p.ico,'dic',p.dic,'ic_dph',p.ic_dph,'country',p.country,'contact',p.contact,'phone',p.phone,'email',p.email,'login',case when own then p.login end,'active',p.active) order by p.kind,p.name) from trus_partners p),'[]'::jsonb),
    'sites',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'partner_id',s.partner_id,'name',s.name,'addr',s.addr,'km_one_way',s.km_one_way,'km_verified',s.km_verified,'active',s.active,
        'sk_km',case when own then s.sk_km end,'toll_eur',case when own then s.toll_eur end,'price_km',case when pr or fu then s.price_km end,
        'calc',case when own then k when pr or fu then jsonb_build_object('km',k->'km','price_km',k->'price_km','trans',k->'trans','trans_t',k->'trans_t','total_t',k->'total_t','route',k->'route','mode',k->'mode') else jsonb_build_object('km',k->'km') end) order by s.name)
        from trus_sites s cross join lateral trus_calc(s) k),'[]'::jsonb),
    'unload',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'partner_id',u.partner_id,'name',u.name,'addr',u.addr,'contact',u.contact,'note',u.note)) from trus_unload u where u.active),'[]'::jsonb),
    'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'no',o.no,'supplier',sp.name,'supplier_id',o.supplier_id,'buyer',bp.name,'buyer_id',o.buyer_id,'site',s.name,'site_id',o.site_id,'site_addr',s.addr,
        'day',o.day,'time',o.time,'trucks_n',o.trucks_n,'tons_plan',o.tons_plan,'note',o.note,'status',o.status,'reply',o.reply,
        'unload',(select jsonb_build_object('name',u.name,'addr',u.addr,'contact',u.contact) from trus_unload u where u.id=o.unload_id),'unload_note',o.unload_note,
        'created_at',o.created_at,'approved_at',o.approved_at,'approved_by',o.approved_by,'loads',trus_loads_json(o.id),
        'sum',case when own then x when pr then x-'cost_sum' when fu then x-'cost_sum'-'buy'-'buy_sum'
          else jsonb_build_object('tons_plan',x->'tons_plan','tons_load',x->'tons_load','tons_unload',x->'tons_unload','trips',x->'trips','km_turn',x->'km_turn','loss_t',x->'loss_t') end)
        order by o.day desc, o.created_at desc)
      from trus_orders o cross join lateral trus_sum(o) x join trus_sites s on s.id=o.site_id
        join trus_partners sp on sp.id=o.supplier_id left join trus_partners bp on bp.id=o.buyer_id where o.day>=current_date-400),'[]'::jsonb),
    'trucks',coalesce((select jsonb_agg(jsonb_build_object('no',t.no,'spz',t.spz,'driver',t.driver) order by t.no) from trucks t where t.active),'[]'::jsonb));
end $$;
revoke all on function public.trus_staff() from public, anon; grant execute on function public.trus_staff() to authenticated;

-- Meričko a Tóth: trus (vývozy, schvaľovanie, váženie) + trus_full; trus_price (nákupná cena) NIE
create table if not exists public.trus_komplet_log(at timestamptz default now(), email text, name text, perms_pred jsonb);
insert into trus_komplet_log(email,name,perms_pred)
  select email,name,perms from staff where role<>'owner' and (ev_norm(name) ~ '(^|[^a-z])mericko' or ev_norm(name) ~ '(^|[^a-z])toth([^a-z]|$)') and ev_norm(name) !~ 'test';
update staff set perms=coalesce(perms,'{}'::jsonb)||'{"trus":true,"trus_full":true}'::jsonb
  where role<>'owner' and (ev_norm(name) ~ '(^|[^a-z])mericko' or ev_norm(name) ~ '(^|[^a-z])toth([^a-z]|$)') and ev_norm(name) !~ 'test';

insert into app_novinky(d,titul,kde,kto,aud,popis)
select v.d::date,v.t,v.k,v.w,v.a,v.p from (values
 ('2026-11-07','🐔 Kurací trus komplet – Meričko a Tóth','Služby → 🐔 Kurací trus','Meričko, Tóth',array['trus_full'],
  'Vidíte celý kurací trus: vývozy, autá, váženie, predajnú cenu pre BPS, dopravu VALKO, cenník pre odberateľa a podklady k faktúram BPS a VALKO. Nákupná cena od Baromfi a marže ostávajú iba majiteľovi.')
) v(d,t,k,w,a,p) where not exists(select 1 from app_novinky n where n.titul=v.t);
