-- ERNTE – ceny môžu meniť len majiteľ a obchod (admin), nie fakturácia ani doprava
create or replace function public.can_price() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from staff where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and role in ('owner','admin')) $$;
drop policy if exists prices_write on prices;
create policy prices_write on prices for all using (can_price()) with check (can_price());
drop policy if exists settings_write on settings;
create policy settings_write on settings for all using (can_price()) with check (can_price());
select email, name, role from staff order by role;
