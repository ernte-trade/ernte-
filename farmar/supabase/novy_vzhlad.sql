-- 🎨 NOVÝ VZHĽAD (6. 11. 2026 príkaz majiteľa): veľké čísla na Prehľade – iba majitelia
-- nedodané tony a ich hodnota (zmluvy podpísaný / odvoz so zostatkom nad toleranciou 5 %, ako 📦 v Zisku ERNTE), aktívne zmluvy,
-- alarmy flotily za 24 h (nevyriešené, bez príznaku; kritické = úroveň high z push centra), reklamácie od odberateľa za 30 dní.
create or replace function public.rd_kpi() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb; a jsonb; c jsonb;
begin
  if not is_owner() then return null; end if;
  select jsonb_build_object('zmluvy',count(*),
      'nedod_t',round(coalesce(sum(d.tons-coalesce(d.delivered_t,0)) filter (where d.tons-coalesce(d.delivered_t,0)>greatest(0.05*d.tons,1)),0),1),
      'nedod_eur',round(coalesce(sum((d.tons-coalesce(d.delivered_t,0))*coalesce(d.price,0)) filter (where d.tons-coalesce(d.delivered_t,0)>greatest(0.05*d.tons,1)),0)),
      'nedod_n',count(*) filter (where d.tons-coalesce(d.delivered_t,0)>greatest(0.05*d.tons,1)))
    into r from deals d where deal_live(d) and d.status in ('podpisany','odvoz');
  begin
    select jsonb_build_object('krit',count(*) filter (where p.lvl='high'),'vsetky',count(*)) into a
      from fleet_events f left join push_fev p on p.id=f.id
      where f.at>now()-interval '24 hours' and f.kind=any(fleet_alarm_kinds()) and coalesce(f.st,'novy') not in ('vyriesene','falosny') and f.flag is null;
  exception when others then a:=null; end;
  begin
    select jsonb_build_object('n',count(*),'uznane',count(*) filter (where coalesce(ok::text,'') in ('true','t')),'neuznane',count(*) filter (where coalesce(ok::text,'') in ('false','f'))) into c
      from buyer_claims where at>now()-interval '30 days';
  exception when others then c:=null; end;
  return coalesce(r,'{}'::jsonb)||jsonb_strip_nulls(jsonb_build_object('alarmy',a,'reklam',c))||jsonb_build_object('at',now());
end $$;
revoke all on function public.rd_kpi() from public, anon; grant execute on function public.rd_kpi() to authenticated;

