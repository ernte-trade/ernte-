-- 📅 TERMÍN OBCHODU V MINULOSTI (úloha majiteľa 5. 11. 2026, ac3a13c6)
-- 1) oprava chybného roka v jednom obchode – iba v zašifrovanej migrácii (údaje obchodu nepatria do verejného repozitára)
-- 2) ernte_term_last(text) = najneskorší dátum vo voľnom texte termínu („30. 11. 2026“, „1.–15. 12. 2026“, „11/2026“, „november 2026“, ISO)
-- 3) trigger deals_term_guard: nový obchod alebo zmena termínu otvoreného obchodu (návrh, podpísaný, odvoz) s termínom v minulosti → chyba
--    „Termín je v minulosti – skontroluj rok“. Odvezené / fakturované / zaplatené / zrušené / archivované obchody (história) sa nekontrolujú;
--    staré obchody s uplynutým termínom sa dajú upravovať, kým sa termín nemení.
create or replace function public.ernte_term_last(p text) returns date language plpgsql immutable set search_path=public as $$
declare t text; t2 text; m text[]; best date; d date; mo int;
begin
  t:=lower(translate(coalesce(p,''),'áäčďéíĺľňóôŕšťúýžőöűüÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽŐÖŰÜ','aacdeillnoorstuyzoouuAACDEILLNOORSTUYZOOUU'));
  if t='' then return null; end if;
  for m in select regexp_matches(t,'(\d{4})-(\d{1,2})-(\d{1,2})','g') loop
    begin d:=make_date(m[1]::int,m[2]::int,m[3]::int); if best is null or d>best then best:=d; end if; exception when others then null; end;
  end loop;
  for m in select regexp_matches(t,'(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})','g') loop
    begin d:=make_date(m[3]::int,m[2]::int,m[1]::int); if best is null or d>best then best:=d; end if; exception when others then null; end;
  end loop;
  -- úplné dátumy sú zarátané – zvyšok: mesiac/rok a názov mesiaca + rok (posledný deň mesiaca)
  t2:=regexp_replace(regexp_replace(t,'(\d{4})-(\d{1,2})-(\d{1,2})',' ','g'),'(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})',' ','g');
  for m in select regexp_matches(t2,'(?:^|[^0-9.])(\d{1,2})\s*[./]\s*(\d{4})(?![0-9])','g') loop
    mo:=m[1]::int;
    if mo between 1 and 12 then d:=(make_date(m[2]::int,mo,1)+interval '1 month - 1 day')::date; if best is null or d>best then best:=d; end if; end if;
  end loop;
  for m in select regexp_matches(t2,'(?:^|[^a-z])([a-z]{3,})\.?\s+(\d{4})(?![0-9])','g') loop
    mo:=case when m[1] in ('jan','januar','januara','january','janner','januari') then 1 when m[1] in ('feb','februar','februara','february','februari') then 2
      when m[1] in ('mar','marec','marca','march','marz','marcius') then 3 when m[1] in ('apr','april','aprila','aprilis') then 4
      when m[1] in ('maj','maja','may','mai','majus') then 5 when m[1] in ('jun','juna','june','juni','junius') then 6
      when m[1] in ('jul','jula','july','juli','julius') then 7 when m[1] in ('aug','august','augusta','augusztus') then 8
      when m[1] in ('sep','sept','september','septembra','szeptember') then 9 when m[1] in ('okt','oct','oktober','oktobra','october') then 10
      when m[1] in ('nov','november','novembra') then 11 when m[1] in ('dec','december','decembra','dezember') then 12 end;
    if mo is not null then d:=(make_date(m[2]::int,mo,1)+interval '1 month - 1 day')::date; if best is null or d>best then best:=d; end if; end if;
  end loop;
  return best;
exception when others then return best;
end $$;
grant execute on function public.ernte_term_last(text) to authenticated;

create or replace function public.deals_term_guard() returns trigger language plpgsql set search_path=public as $$
declare d date;
begin
  if coalesce(current_setting('ernte.allow_past_term',true),'')='1' then return new; end if;
  if tg_op='UPDATE' and new.term is not distinct from old.term then return new; end if;
  if coalesce(new.status,'navrh') in ('odvezeny','fakturacia','zaplateny','zruseny') or coalesce(new.archived,false) then return new; end if;
  d:=ernte_term_last(new.term);
  if d is not null and d<(now() at time zone 'Europe/Bratislava')::date then
    raise exception 'Termín je v minulosti – skontroluj rok (%).', to_char(d,'FMDD. FMMM. YYYY');
  end if;
  return new;
end $$;
drop trigger if exists deals_term_guard on public.deals;
create trigger deals_term_guard before insert or update of term on public.deals for each row execute function public.deals_term_guard();

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-05','📅 Termín obchodu v minulosti sa neuloží','Obchody → Nový obchod, ✏️ Upraviť obchod, 🤝 Uzatvoriť obchod, predajné zmluvy','majiteľ a obchodníci',array['owner','staff'],
 'Keď termín plnenia (aj v texte, napr. „30.11.2025“ alebo „1.–15. 12. 2026“) vychádza do minulosti, aplikácia hneď pod políčkom ukáže „⚠️ Termín je v minulosti – skontroluj rok“ a obchod neuloží. Pri úprave starého obchodu sa kontroluje iba zmenený termín.'
where not exists(select 1 from app_novinky where titul='📅 Termín obchodu v minulosti sa neuloží');
