-- ERNTE – burza nafty: ICE Gasoil, Brent, priemer nafty SK; aktualizácia každé 2 h (6:00–20:00 SEČ)
create or replace function public.market_refresh() returns bigint language plpgsql security definer set search_path=public, net as $$
declare k text:=regexp_replace(coalesce(ai_secret('anthropic_key'),''),'\s','','g'); md text:=(select value->>'mode' from ai_state where key='auth'); rq bigint;
begin
  if k='' then return null; end if;
  rq:=net.http_post(url:='https://api.anthropic.com/v1/messages',
    headers:=case when coalesce(md, case when k like 'sk-ant-api%' then 'x' else 'b' end)='x' then jsonb_build_object('x-api-key',k) else jsonb_build_object('Authorization','Bearer '||k) end||jsonb_build_object('anthropic-version','2023-06-01','content-type','application/json'),
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',2500,
      'system','Si dátový asistent. Vyhľadaj na webe aktuálne burzové ceny a odpovedz IBA jedným JSON objektom bez ďalšieho textu a bez ```.',
      'messages',jsonb_build_array(jsonb_build_object('role','user','content',
        'Zisti posledné uzatváracie (alebo aktuálne) ceny najbližšieho obchodovaného kontraktu: MATIF / Euronext Paris – repka (rapeseed, €/t), mlynárska pšenica (milling wheat, €/t), kukurica (corn, €/t); CBOT soja (soybeans, US centy za bušel); kurz EUR/USD. '||
        'NAFTA: ICE Low Sulphur Gasoil futures najbližší kontrakt (USD za metrickú tonu); ropa Brent najbližší kontrakt (USD za barel); priemerná cena motorovej nafty na čerpacích staniciach na Slovensku (€/l s DPH, najnovší dostupný denný alebo týždenný údaj – napr. Slovnaft, ŠÚ SR, EU Weekly Oil Bulletin, fuel-prices.eu – uveď zdroj a dátum). '||
        'Formát: {"repka":{"cena":0,"kontrakt":"","datum":"YYYY-MM-DD","zdroj":""},"psenica":{...},"kukurica":{...},"soja_usc_bu":{...},"gasoil":{...},"brent":{...},"nafta_sk":{...},"eurusd":0}. Ak cenu nenájdeš, daj null.')),
      'tools',jsonb_build_array(jsonb_build_object('type','web_search_20250305','name','web_search','max_uses',6))),
    timeout_milliseconds:=180000);
  insert into ai_state(key,value) values('market_req',jsonb_build_object('req',rq,'at',now())) on conflict(key) do update set value=excluded.value, updated_at=now();
  return rq;
end $$;
revoke all on function public.market_refresh() from public, anon, authenticated;

create or replace function public.market_collect() returns int language plpgsql security definer set search_path=public, net as $$
declare st jsonb; r record; j jsonb; txt text; o jsonb; fx numeric; k int:=0; it record;
begin
  select value into st from ai_state where key='market_req'; if st is null or st ? 'done' then return 0; end if;
  select * into r from net._http_response where id=(st->>'req')::bigint;
  if r.id is null then
    if (st->>'at')::timestamptz<now()-interval '10 minutes' then update ai_state set value=value||jsonb_build_object('done',now(),'err','bez odpovede') where key='market_req'; end if;
    return 0; end if;
  if r.status_code is distinct from 200 then update ai_state set value=value||jsonb_build_object('done',now(),'err',left(coalesce(r.content,r.error_msg,''),200)) where key='market_req'; return 0; end if;
  j:=ai_json(r.content);
  select string_agg(b->>'text','') into txt from jsonb_array_elements(coalesce(j->'content','[]')) b where b->>'type'='text';
  begin o:=substring(txt from '\{.*\}')::jsonb; exception when others then o:=null; end;
  if o is null then update ai_state set value=value||jsonb_build_object('done',now(),'err','neplatná odpoveď') where key='market_req'; return 0; end if;
  fx:=nullif(cmd_num(o->>'eurusd'),0);
  for it in select * from (values ('repka','MATIF repka','€/t'),('psenica','MATIF pšenica','€/t'),('kukurica','MATIF kukurica','€/t'),('soja_usc_bu','CBOT sója','USc/bu'),
                                  ('gasoil','ICE Gasoil','USD/t'),('brent','Brent','USD/bbl'),('nafta_sk','Nafta SK priemer','€/l')) v(sym,nm,un) loop
    if cmd_num(o->it.sym->>'cena') is not null and cmd_num(o->it.sym->>'cena')>0 then
      insert into market_px(sym,name,price,unit,eur_t,contract,quote_date,src,updated_at)
        values(it.sym,it.nm,cmd_num(o->it.sym->>'cena'),it.un,
          case when it.sym='soja_usc_bu' then case when fx is not null then round(cmd_num(o->it.sym->>'cena')/100*36.7437/fx,1) end
               when it.sym='gasoil' then case when fx is not null then round(cmd_num(o->it.sym->>'cena')/fx,1) end
               when it.sym in ('brent','nafta_sk') then null else cmd_num(o->it.sym->>'cena') end,
          o->it.sym->>'kontrakt', case when o->it.sym->>'datum' ~ '^\d{4}-\d{2}-\d{2}$' then (o->it.sym->>'datum')::date end, left(o->it.sym->>'zdroj',200), now())
        on conflict(sym) do update set price=excluded.price, eur_t=coalesce(excluded.eur_t,market_px.eur_t), contract=excluded.contract, quote_date=excluded.quote_date, src=excluded.src, updated_at=now();
      k:=k+1;
    end if;
  end loop;
  if fx is not null then insert into market_px(sym,name,price,unit,updated_at) values('eurusd','EUR/USD',fx,'USD',now()) on conflict(sym) do update set price=excluded.price, updated_at=now(); end if;
  update ai_state set value=value||jsonb_build_object('done',now(),'n',k) where key='market_req';
  return k;
end $$;
revoke all on function public.market_collect() from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname='burza';
select cron.schedule('burza','41 4,6,8,10,12,14,16,18 * * *','select public.market_refresh()');
select public.market_refresh() as burza_spustena;
