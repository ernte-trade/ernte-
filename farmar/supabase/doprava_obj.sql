-- 7. 11. 2026 (príkaz majiteľa – Master AI Agent Prompt bod 4.1–4.2, 5.1): 📦 Objednávky prepravy (VALKO / ERNTE / DANUBE)
-- Odkiaľ → kam, komodita, tony, cena €/t | €/km | paušál, km (tam + prázdny návrat), náklad €/km, nakládka/vykládka, auto, vodič, stav.
-- Marža a zisk počíta aplikácia a vidí ich iba majiteľ (doprava/dispečing vidí objednávku bez zisku). Doklady: objednávka prepravy a CMR (objdoprava.js).
create table if not exists public.doprava_obj(
  id bigserial primary key,
  created_at timestamptz not null default now(),
  created_by text default (auth.jwt()->>'email'),
  updated_at timestamptz,
  firma text not null default 'valko' check (firma in ('valko','ernte','danube')),
  zakaznik text, zak_adr text, zak_ico text,
  odosielatel text, prijemca text,
  odkial text not null, kam text not null,
  komodita text, tony numeric check (tony is null or tony>=0),
  cena_typ text not null default 't' check (cena_typ in ('t','km','pausal')),
  cena numeric check (cena is null or cena>=0),
  km numeric check (km is null or km>=0), km_spat numeric not null default 0 check (km_spat>=0), km_zdroj text,
  naklad_km numeric not null default 1.60 check (naklad_km>=0),
  nakladka timestamptz, vykladka timestamptz,
  auto text, vodic text,
  stav text not null default 'nova' check (stav in ('nova','potvrdena','na_ceste','dorucena','zrusena')),
  pozn text, cmr_no text
);
create index if not exists doprava_obj_nakl on public.doprava_obj(nakladka desc);
alter table public.doprava_obj enable row level security;
create or replace function public.dob_ok() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.is_owner(),false) or (coalesce(public.is_staff(),false) and (public.has_perm('trans') or public.has_perm('assign')))
$$;
grant execute on function public.dob_ok() to authenticated;
drop policy if exists dob_sel on public.doprava_obj; create policy dob_sel on public.doprava_obj for select to authenticated using (public.dob_ok());
drop policy if exists dob_ins on public.doprava_obj; create policy dob_ins on public.doprava_obj for insert to authenticated with check (public.dob_ok());
drop policy if exists dob_upd on public.doprava_obj; create policy dob_upd on public.doprava_obj for update to authenticated using (public.dob_ok()) with check (public.dob_ok());
drop policy if exists dob_del on public.doprava_obj; create policy dob_del on public.doprava_obj for delete to authenticated using (coalesce(public.is_owner(),false));
grant select, insert, update, delete on public.doprava_obj to authenticated;
grant usage, select on sequence public.doprava_obj_id_seq to authenticated;
create or replace function public.dob_touch() returns trigger language plpgsql as $$ begin new.updated_at:=now(); return new; end $$;
drop trigger if exists dob_touch on public.doprava_obj; create trigger dob_touch before update on public.doprava_obj for each row execute function public.dob_touch();
-- nemenný záznam zmien
do $$ begin
  if to_regprocedure('public.audit_trg()') is not null then
    drop trigger if exists zz_audit on public.doprava_obj;
    create trigger zz_audit after insert or update or delete on public.doprava_obj for each row execute function public.audit_trg('id','{updated_at}','{}');
  end if;
end $$;
