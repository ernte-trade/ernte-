-- 2. 11.: ai_snapshot = obchody_predaj_pozicie (20261102-0120) + trh (20261102-0140) – obe migrácie definovali funkciu samostatne, tu sa spoja
create or replace function public.ai_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m0 text:=quote_literal((date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava')::text); kp jsonb; fm jsonb; mz numeric; old numeric; nk numeric;
begin
  -- KPI z aplikácie: mzdy vždy z jedného výpočtu (Vodiči a mzdy, pomerne k dnešku) – rovnako ako flotila_zisk_mesiac, zisk sa prepočíta
  begin
    select value||jsonb_build_object('aktualizovane',to_char(updated_at at time zone 'Europe/Bratislava','DD.MM HH24:MI')) into kp from ai_state where key='kpi';
    fm:=fleet_month(); mz:=(fm->>'mzdy_eur')::numeric;
    if kp is not null and kp->>'obdobie'='m' and mz is not null then
      old:=coalesce((kp->>'mzdy_eur')::numeric,0); nk:=coalesce((kp->>'naklady_spolu_eur')::numeric,0)-old+mz;
      kp:=kp||jsonb_build_object('mzdy_eur',mz,'mzdy_zdroj','Flotila → Vodiči a mzdy (rovnako ako flotila_zisk_mesiac)','mzdy_z_aplikacie_eur',old,'mzdy_poznamka',fm->>'mzdy_poznamka','naklady_spolu_eur',round(nk),
        'zisk_eur',round((kp->>'obrat_eur')::numeric-nk),'zisk_do_dnes_pomerne_eur',round((kp->>'obrat_eur')::numeric-nk),
        'zisk_cely_mesiac_plne_pevne_eur',round((kp->>'obrat_eur')::numeric-nk+coalesce((kp->>'pevne_eur')::numeric,0)-coalesce((kp->>'pevne_eur_cely_mesiac')::numeric,0)),
        'zisk_poznamka','');
    end if;
  exception when others then null;
  end;
  return jsonb_build_object(
   'teraz', to_char(now() at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI'),
   'cennik_eur_t', ai_part($q$select coalesce(jsonb_object_agg(com,coalesce(price::text,'nezadané')),'{}') from prices$q$),
   'cennik_bez_ceny', ai_part($q$select coalesce(jsonb_agg(c),'[]') from unnest(array['repka','lo','ho','soja','psenica_p','psenica_k','jacmen_k','jacmen_s','kukurica','cirok']) c where not exists(select 1 from prices p where p.com=c and p.price is not null)$q$),
   'cennik_platny_do', ai_part($q$select coalesce((select value->>'valid' from settings where key='pricelist'),'nezadané')$q$),
   'obchody_podla_stavu', ai_part($q$select coalesce(jsonb_object_agg(status, x),'{}') from (select status, jsonb_build_object('pocet',count(*),'ton',sum(tons),'dodane_t',sum(delivered_t),'hodnota_eur',round(sum(tons*price))) x from deals where deal_live(deals) group by status) s$q$),
   'otvorene_obchody', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select d.no, f.name farmar, d.com komodita, d.tons ton, d.delivered_t dodane_t, d.price cena, d.status stav, d.term termin, d.created_at::date vytvorene from deals d join farmers f on f.id=d.farmer_id where deal_live(d) and d.status not in ('zaplateny','zruseny') order by d.created_at desc limit 25) x$q$),
   'obchody_predaj_pozicie', ai_part($q$select public.sale_summary()$q$),
   'nove_poziadavky', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select r.kind typ, f.name farmar, r.com, r.tons, r.price, r.pickup_date, r.note, r.created_at::date from requests r join farmers f on f.id=r.farmer_id where r.status='nova' order by r.created_at desc limit 15) x$q$),
   'flotila_kpi_mesiac_z_databazy', ai_fleet_kpi(),
   'flotila_po_autach_mesiac', ai_part('select coalesce(jsonb_agg(x),''[]'') from (select coalesce(plate,vehicle_id) auto, round(sum(distance)) km, round(sum(fuel_consumed)) l, case when sum(distance)>=100 then round(100*sum(fuel_consumed)/nullif(sum(distance),0),1)::text else ''málo dát'' end l_100km, round(sum(refuel_l)) natankovane_l from rides where start_at>='||m0||'::timestamptz group by 1 order by 2 desc nulls last) x'),
   'flotila_po_vodicoch', ai_fleet_drivers(),
   'flotila_zisk_mesiac', fleet_month(),
   'flotila_zisk_mesiac_skupiny', ai_part($q$select jsonb_build_object('region',fleet_month((now() at time zone 'Europe/Bratislava')::date,'region'),'eu',fleet_month((now() at time zone 'Europe/Bratislava')::date,'eu'),'sluzobne',fleet_month((now() at time zone 'Europe/Bratislava')::date,'sluzobne'),'traktory',fleet_month((now() at time zone 'Europe/Bratislava')::date,'traktory'))$q$),
   'zaplatene_nie_v_nadrzi', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters chyba_l, to_char(at at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') kedy, place stanica, st stav, left(note,400) popis from fleet_events where kind='paid_not_tank' and at>='2026-07-01' order by at desc limit 40) x$q$),
   'kalibracia_snimacov', ai_part($q$select coalesce(jsonb_agg(jsonb_build_object('auto',coalesce(v.plate,v.name,v.id),'tankovani',c.n,'median_pomer',c.ratio_med,'priemer_pomer',c.ratio_avg,'koeficient',c.coef,'podozrenie',c.flagged,'pravidlo',c.rule,'objem_nadrze_l',c.tank_real,'max_hladina_90_dni',c.max90,'hladina_nad_objem',c.over_cap,'kalibracia_datum',c.calib_date)),'[]') from veh_calib c join cmd_vehicles v on v.id=c.vehicle_id where c.flagged or c.over_cap or c.n>=5$q$),
   'karty_priradenie', ai_part($q$select coalesce(value->'rows','[]') from ai_state where key='card_assign'$q$),
   'kontroly_kariet_30_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where kind in ('card_offhours','card_double','card_far','paid_not_tank') and at>now()-interval '30 days' group by kind) x$q$),
   'tankovacie_data', ai_part('select fuel_data_status()'),
   'alarmy_stav', ai_part($q$select jsonb_build_object('udalosti',(select coalesce(jsonb_object_agg(st,n),'{}') from (select st,count(*) n from fleet_events where at>now()-interval '30 days' and kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank','limiter','no_signal') group by st) a),
      'artefakty_a_kalibracia',(select coalesce(jsonb_object_agg(flag,n),'{}') from (select flag,count(*) n from fleet_events where flag is not null and at>='2026-07-01' group by flag) b),
      'auta_na_servise',(select value from fleet_cfg where key='service'))$q$),
   'nalezy_flotila', fleet_findings(),
   'nadrz_dvor', ai_part('select yard_fuel_balance()'),
   'odstavene_auta', ai_part($q$select coalesce((select jsonb_agg(coalesce(v.plate,v.id)) from cmd_vehicles v where coalesce((select (value->>v.id)::boolean from fleet_cfg where key='parked'),false)),'[]')$q$),
   'auta_teraz', ai_part($q$select jsonb_build_object('spolu',count(*),'ide',count(*) filter (where speed>3 and gps_at>now()-interval '20 min')) from cmd_vehicles$q$),
   'nafta_bilancia_7_dni', ai_part('select public.fuel_balance(7)'),
   'nafta_bilancia_30_dni', ai_part('select public.fuel_balance(30)'),
   'nafta_poklesy_v_stati_bez_vypadkov_dat', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auto, driver vodic, liters l, lvl_from, lvl_to, to_char(t_from at time zone 'Europe/Bratislava','DD.MM HH24:MI') od, to_char(t_to at time zone 'Europe/Bratislava','DD.MM HH24:MI') do_, place miesto, note from fleet_events where kind='fuel_drop' and flag is null and st<>'falosny' and at>now()-interval '30 days' order by at desc limit 40) x$q$),
   'udalosti_7_dni', ai_part($q$select coalesce(jsonb_object_agg(kind,n),'{}') from (select kind,count(*) n from fleet_events where at>now()-interval '7 days' group by kind) x$q$),
   'posledne_alarmy_nafta', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind, plate, driver, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where at>now()-interval '7 days' and kind in ('fuel_drop','refuel_gap','fuel_transfer','card_swap','paid_not_tank','limiter','no_signal') and flag is null and st in ('novy','riesim') order by at desc limit 10) x$q$),
   'nafta_precerpanie_medzi_autami', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select plate auta, driver vodici, liters l, place miesto, note popis, to_char(at at time zone 'Europe/Bratislava','DD.MM HH24:MI') kedy from fleet_events where kind='fuel_transfer' and at>now()-interval '40 days' order by at desc limit 20) x$q$),
   'aktivne_auta_bez_signalu', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select e.plate auto, e.driver posledny_vodic, e.place posledna_poloha, floor(extract(epoch from now()-v.gps_at)/3600)::int hodin from fleet_events e join cmd_vehicles v on v.id=e.vehicle_id where e.kind='no_signal' and v.gps_at=e.t_from and v.gps_at<now()-interval '12 hours') x$q$),
   'alarmy_z_aplikacie', ai_part($q$select value->'alarmy' from ai_state where key='kpi'$q$),
   'nastavenia_nakladov', ai_part($q$select value from fleet_cfg where key='costs'$q$),
   'kpi_z_aplikacie', coalesce(kp,'"majiteľ ešte neotvoril Flotilu"'::jsonb),
   'register_poruseni', ai_register(),
   'tankovacie_karty_vypis', ai_part($q$select jsonb_build_object('dokladov_40_dni',count(*),'litre',round(coalesce(sum(liters),0)),'sparovane_so_sondou',count(*) filter (where m_state='sparovane'),
       'sonda_nezaznamenala',count(*) filter (where m_state='bez_sondy'),'nezname_auto',count(*) filter (where m_state='nezname_auto'),
       'najvacsie_rozdiely',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(plate,card) auto, to_char(at at time zone 'Europe/Bratislava','DD.MM.YYYY HH24:MI') kedy, station stanica, round(liters) doklad_l, round(m_rise) sonda_l, round(liters-coalesce(m_rise,0)) rozdiel_l from fuel_card where at>now()-interval '40 days' and m_state in ('sparovane','bez_sondy') order by abs(liters-coalesce(m_rise,0)) desc limit 10) x))
       from fuel_card where at>now()-interval '40 days'$q$),
   'diagnostika', ai_diag(),
   'dokumenty_archiv', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select kind typ, driver vodic, title nazov, status stav, to_char(created_at at time zone 'Europe/Bratislava','DD.MM.YYYY') datum from ai_docs order by created_at desc limit 40) x$q$),
   'posledne_upravy_ai', ai_part($q$select coalesce(jsonb_agg(x),'[]') from (select text uloha, status, report, created_at::date from ai_tasks order by created_at desc limit 8) x$q$),
   'trh', ai_part('select public.trh_ai()'));
exception when others then return jsonb_build_object('chyba_prehladu',SQLERRM);
end $function$;
revoke all on function public.ai_snapshot() from public, anon, authenticated;
