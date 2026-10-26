-- Obchodníci vidia odporúčané ceny v Kalkulačke (interné nastavenia čítajú, meniť ich môže len majiteľ);
-- ceny pre farmárov (cenník + bonus) mení len majiteľ alebo ten, komu to majiteľ zaškrtne (Manažér)
create or replace function public.perm_def(r text) returns text[] language sql immutable as $$
  select case r
    when 'admin' then array['req','price_view','deals','farm','farm_login','calc','market','trans','remain','notes','wx','big']
    when 'dispatch' then array['req','trans','deals_qty','farm','assign','farmer_gps','remain','notes','fleet','drivers','alarms','cams','yard','diesel','fleet_set','wx','big']
    when 'invoice' then array['req','price_view','deals','farm','trans','remain','wx']
    else array[]::text[] end $$;
drop policy if exists kalk_store_select on public.kalk_store;
create policy kalk_store_select on public.kalk_store for select to authenticated using (public.has_perm('calc'));
update staff set perms=coalesce(perms,'{}'::jsonb)||'{"price_edit":false,"calc":true}'::jsonb where role='admin' and (name ilike '%Obchodník' or name ilike '%Obchodník' or name ilike '%Obchodník');
update staff set perms=coalesce(perms,'{}'::jsonb)||'{"price_edit":true,"calc":true}'::jsonb where role<>'owner' and name ilike '%Manažér';
select 'ok';
