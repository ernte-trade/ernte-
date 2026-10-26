-- ERNTE Kalkulačka (farmar/kalkulacka.html) – úložisko dát prenesené z Claude artefaktu.
-- Jednoduchý dokumentový sklad: "kolekcia" = path, "dokument" = id, obsah = data (jsonb).
-- Prístup: len prihlásení s právom 'calc' (public.has_perm('calc'); majiteľ vždy). Interné odpočty (config/*) iba majiteľ.
-- Skript je idempotentný – dá sa spustiť opakovane.

create table if not exists public.kalk_store(
  path       text not null,
  id         text not null,
  data       jsonb not null,
  updated_by text default (auth.jwt()->>'email'),
  updated_at timestamptz default now(),
  primary key(path, id)
);

create index if not exists kalk_store_path_updated on public.kalk_store(path, updated_at desc);

-- updated_at / updated_by sa nastavia na serveri pri každom zápise (shim podľa nich zisťuje zmeny)
create or replace function public.kalk_store_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt()->>'email', new.updated_by);
  return new;
end $$;

drop trigger if exists kalk_store_touch on public.kalk_store;
create trigger kalk_store_touch before insert or update on public.kalk_store
  for each row execute function public.kalk_store_touch();

alter table public.kalk_store enable row level security;

drop policy if exists kalk_store_select on public.kalk_store;
create policy kalk_store_select on public.kalk_store for select to authenticated
  using (public.has_perm('calc') and (path not in ('config','market_private') or public.is_owner()));

drop policy if exists kalk_store_insert on public.kalk_store;
create policy kalk_store_insert on public.kalk_store for insert to authenticated
  with check (public.has_perm('calc') and (path<>'config' or public.is_owner()));

drop policy if exists kalk_store_update on public.kalk_store;
create policy kalk_store_update on public.kalk_store for update to authenticated
  using (public.has_perm('calc') and (path<>'config' or public.is_owner())) with check (public.has_perm('calc') and (path<>'config' or public.is_owner()));

drop policy if exists kalk_store_delete on public.kalk_store;
create policy kalk_store_delete on public.kalk_store for delete to authenticated
  using (public.has_perm('calc') and (path<>'config' or public.is_owner()));

grant select, insert, update, delete on public.kalk_store to authenticated;
revoke all on public.kalk_store from anon;
