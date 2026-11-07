-- Majiteľ upravuje údaje zamestnanca: meno, funkcia, kraj, telefón, kontaktný e-mail
alter table staff add column if not exists mail text;
create or replace function public.set_staff_info(em text, nm text, t text, r text, ph text, ml text) returns text language plpgsql security definer set search_path=public as $$
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if length(trim(coalesce(nm,'')))<2 then raise exception 'Zadaj meno.'; end if;
  if coalesce(trim(ml),'')<>'' and trim(ml) !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'E-mail nemá správny tvar.'; end if;
  update staff set name=trim(nm), title=nullif(trim(t),''), region=nullif(trim(r),''), phone=nullif(trim(ph),''), mail=nullif(lower(trim(ml)),'')
   where lower(email)=lower(em);
  if not found then raise exception 'Zamestnanec neexistuje.'; end if;
  return 'ok';
end $$;
revoke all on function public.set_staff_info(text,text,text,text,text,text) from public, anon;
grant execute on function public.set_staff_info(text,text,text,text,text,text) to authenticated;
select 'ok';
