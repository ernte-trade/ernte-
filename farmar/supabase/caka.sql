-- 📋 ČAKÁ NA TEBA · 🧠 UČENIE Z ROZHODNUTÍ · 📥 VHOĎ SEM · 📊 POUŽÍVANIE SEKCIÍ
-- 7. 11. 2026 17:49 PRÍKAZ MAJITEĽA „Všetko sprav“ (zjednodušenie aplikácie, body 1 – 6)
--  1) caka_na_teba(): všetko, čo čaká na Martina, na jednom mieste (zvýšenia cien, obchody nad cenníkom, nové ceny odberateľov,
--     stretnutia, stráženie nákupov, spolupráca, doklady Agro-Somotor, ponuky, pošta, správy na odoslanie, stráž obchodov, zmazanie účtu)
--     caka_act(): ✅ / ✕ priamo z Prehľadu – volá tie isté funkcie ako tlačidlá v sekciách (rovnaké kontroly a záznam zmien) + zápis do rozhodnutia
--  6) pravidla_navrhy() / pravidlo_set(): z histórie schválení navrhne „toto vždy schvaľuješ – mám to robiť sám?“; zapne IBA Martin
--  3) vhod_scan(): 📥 Vhoď sem – Claude rozpozná, čo je na fotke / v PDF (cenník odberateľa, obchod na papieri, pečiatka, …)
--  4) tab_use_get(): aj posledné otvorenie sekcie (nepoužívané sekcie → „Menej používané“)

create table if not exists public.rozhodnutia(id bigserial primary key, at timestamptz not null default now(), kind text not null, ref text, ok boolean not null,
  data jsonb, by text default lower(coalesce(auth.jwt()->>'email','')), src text default 'caka');
alter table public.rozhodnutia enable row level security;
revoke all on public.rozhodnutia from anon, authenticated;
create index if not exists rozhodnutia_k on public.rozhodnutia(kind, at desc);

create or replace function public.ck_com(c text) returns text language sql immutable as $$
  select case c when 'repka' then 'Repka' when 'lo' then 'Slnečnica' when 'ho' then 'Slnečnica HO' when 'soja' then 'Sója' when 'psenica_p' then 'Pšenica potravinárska'
    when 'psenica_k' then 'Pšenica kŕmna' when 'jacmen_k' then 'Jačmeň kŕmny' when 'jacmen_s' then 'Jačmeň sladovnícky' when 'kukurica' then 'Kukurica' when 'cirok' then 'Cirok'
    else initcap(replace(coalesce(c,''),'_',' ')) end $$;

create or replace function public.ck_n(x numeric) returns text language sql immutable as $$
  select case when x is null then '?' else replace(replace(case when x=round(x) then to_char(x,'FM999,999,990') else to_char(round(x,2),'FM999,999,990.00') end,',',' '),'.',',') end $$;

-- ---------- 📋 zoznam ----------
create or replace function public.caka_na_teba() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb:='[]'::jsonb; x record; n int; it jsonb;
  add jsonb;
begin
  if not price_main() then return '[]'::jsonb; end if;
  -- 💶 zvýšenia našich nákupných cien (nad 5 €/t čakajú na Martina)
  begin
    for x in select t.k, t.e from ai_state, jsonb_each(value) t(k,e) where key='price_pending' and jsonb_typeof(t.e)='object' and not coalesce((t.e->>'rejected')::boolean,false) loop
      r:=r||jsonb_build_array(jsonb_build_object('k','cena','id',x.k,'p',95,'at',x.e->>'at',
        't','💶 Zvýšenie ceny: '||ck_com(x.k)||' '||ck_n((x.e->>'old')::numeric)||' → '||ck_n((x.e->>'new')::numeric)||' €/t ('||case when (x.e->>'new')::numeric>=(x.e->>'old')::numeric then '+' else '' end||ck_n((x.e->>'new')::numeric-(x.e->>'old')::numeric)||')',
        's',coalesce('Podľa modelu: '||nullif(x.e->>'src',''),'Model navrhuje vyššiu cenu.')||' Po zverejnení ju hneď uvidia farmári.',
        'ok','✅ Zverejniť','no','✕ Zamietnuť','go',jsonb_build_object('tab','price','sel','#kkGuard','lab','🛡️ Kontrola cien')));
    end loop;
  exception when others then null; end;
  -- 🌱 Výkup 2027 – zvýšenie čaká
  begin
    for x in select t.k, t.e from ai_state, jsonb_each(value->'items') t(k,e) where key='nu_ceny' and t.e ? 'pend' loop
      r:=r||jsonb_build_array(jsonb_build_object('k','nu','id',x.k,'p',80,
        't','🌱 Výkup 2027 – '||ck_com(x.k)||': '||ck_n((x.e->>'pub')::numeric)||' → '||ck_n((x.e->'pend'->>'p')::numeric)||' €/t',
        's','Nová úroda podľa burzy a odberateľov. Zverejní sa obchodníkom.','ok','✅ Zverejniť','go',jsonb_build_object('tab','nu','lab','🌱 Výkup 2027')));
    end loop;
  exception when others then null; end;
  -- 🤝 obchody nad cenníkom (farmár ich podpíše až po schválení)
  begin
    for x in select a.deal_id, a.info, a.at, d.no, d.com, d.tons, d.price, d.status, f.name fname from deal_alerts a join deals d on d.id=a.deal_id left join farmers f on f.id=d.farmer_id
      where a.kind='nad_cennikom' and a.acked_at is null and d.price_ok_at is null and d.status in ('navrh','podpisany') and deal_live(d) order by a.at desc limit 30 loop
      r:=r||jsonb_build_array(jsonb_build_object('k','nad','id',x.deal_id,'p',85,'at',x.at,'eur',(x.info->>'spolu')::numeric,
        't','🤝 Nad cenníkom: '||coalesce(x.no,'obchod')||' · '||coalesce(x.fname,'farmár')||' · '||ck_com(x.com)||' '||ck_n(x.tons)||' t za '||ck_n(x.price)||' €/t',
        's','O '||ck_n((x.info->>'rozdiel')::numeric)||' €/t viac ako cenník ('||ck_n((x.info->>'cennik')::numeric)||' €/t) – spolu '||ck_n((x.info->>'spolu')::numeric)||' €. '||case when x.status='navrh' then 'Farmár ho podpíše až po tvojom schválení.' else 'Zmluva je už podpísaná – schválenie iba potvrdí cenu.' end,
        'ok','✅ Schváliť cenu','go',jsonb_build_object('tab','deals','sel','[data-cpdf="'||x.deal_id||'"]','lab',coalesce(x.no,'obchod'))));
    end loop;
  exception when others then null; end;
  -- 🏷️ prvá cena NOVÉHO odberateľa z e-mailu / webu
  begin
    for x in select * from odb_navrhy where status='caka' order by at desc limit 20 loop
      r:=r||jsonb_build_array(jsonb_build_object('k','odb','id',x.id,'p',70,'at',x.at,
        't','🏷️ Nová cena odberateľa: '||coalesce(x.buyer_name,x.buyer,'?')||' · '||ck_com(x.com)||' '||ck_n(x.price)||' '||case when coalesce(x.cur,'EUR')='HUF' then 'Ft/t' else '€/t' end||' '||coalesce(x.del,'')||coalesce(' '||x.site,''),
        's',coalesce(nullif(x.why,''),nullif(x.note,''),'Prvá cena tohto odberateľa – prijmi, ak je správna.'),'ok','✅ Prijať','no','✕ Zahodiť','go',jsonb_build_object('tab','price','sel','#odbCard','lab','🏷️ Ceny odberateľov')));
    end loop;
  exception when others then null; end;
  -- 📅 žiadosti o stretnutie
  begin
    for x in select * from meet_req where status='nova' and start_at>now() order by start_at limit 10 loop
      r:=r||jsonb_build_array(jsonb_build_object('k','meet','id',x.id,'p',75,'due',(x.start_at at time zone 'Europe/Bratislava')::date,
        't','📅 Stretnutie: '||coalesce(x.who_name,x.who_email)||' – '||left(x.topic,80),
        's',to_char(x.start_at at time zone 'Europe/Bratislava','DD. MM. HH24:MI')||coalesce(' · '||nullif(x.place,''),''),'ok','✅ Potvrdiť','no','✕ Odmietnuť','go',jsonb_build_object('tab','cal','lab','📅 Kalendár')));
    end loop;
  exception when others then null; end;
  -- 📉 stráženie nákupov – výstraha, ktorú si ešte nepotvrdil
  begin
    for x in select w.*, d.no from deal_watch w join deals d on d.id=w.deal_id where w.closed_at is null and w.state<>'ok' and w.notified_at is not null and (w.acked_at is null or w.acked_at<w.notified_at) order by w.notified_at desc limit 15 loop
      r:=r||jsonb_build_array(jsonb_build_object('k','watch','id',x.deal_id,'p',88,'at',x.notified_at,
        't',case x.state when 'fall' then '📉 Trh klesá' when 'sell' then '💰 Predaj' when 'hold' then '📈 Drž, nepredávaj' else '📊 Stráženie' end||': '||coalesce(x.no,'obchod')||' · '||ck_com(x.com)||' '||ck_n(x.tons)||' t',
        's','Nákup '||ck_n(x.buy)||' €/t · trh teraz '||ck_n(x.last_ref)||' €/t (pri nákupe '||ck_n(x.ref0)||').','ok','✔️ Prečítal som','go',jsonb_build_object('tab','deals','sel','#dwCard','lab','📊 Stráženie nákupov')));
    end loop;
  exception when others then null; end;
  -- 💡 návrhy Claude (zmeny aplikácie pre tím / farmárov)
  begin
    for x in select * from claude_navrhy where status='navrh' order by at limit 10 loop
      r:=r||jsonb_build_array(jsonb_build_object('k','claude','id',x.id,'p',40,'at',x.at,'t','💡 Návrh Claude: '||x.title,'s',left(coalesce(x.body,''),220),'ok','✅ Áno, sprav to','no','✕ Nie'));
    end loop;
  exception when others then null; end;
  -- 🐔 doklady Agro-Somotor na schválenie (otvoriť – treba si ich prečítať)
  begin
    for x in select * from mg_docs where stav='caka' order by created_at limit 10 loop
      r:=r||jsonb_build_array(jsonb_build_object('k','mg','id',x.id,'p',78,'at',x.created_at,'eur',x.suma,'t','🐔 Agro-Somotor: '||x.title,
        's',case x.kind when 'faktura' then 'Faktúra' when 'zmluva' then 'Zmluva' when 'doprava' then 'Doprava' else 'Kontrola' end||coalesce(' · '||ck_n(x.suma)||' €','')||' – prečítaj a schváľ v karte.','go',jsonb_build_object('hash','#mastergood')));
    end loop;
  exception when others then null; end;
  -- 🤝 spolupráca s odberateľmi a vzory zmlúv
  begin
    select count(*) into n from odb_spolupraca where status='navrh';
    if n>0 then r:=r||jsonb_build_array(jsonb_build_object('k','spol','id','spol','p',50,'n',n,'t','🤝 '||n||' '||case when n=1 then 'návrh' when n<5 then 'návrhy' else 'návrhov' end||' spolupráce s odberateľmi',
      's','Prečítaj podmienky, uprav a ✅ schváľ – vznikne vzor zmluvy pre farmárov.','go',jsonb_build_object('hash','#spolupraca'))); end if;
    select count(*) into n from odb_vzor where status='navrh';
    if n>0 then r:=r||jsonb_build_array(jsonb_build_object('k','vzor','id','vzor','p',55,'n',n,'t','📄 '||n||' '||case when n=1 then 'vzor zmluvy' else 'vzory zmlúv' end||' pre farmárov na schválenie',
      's','Prečítaj, uprav a ✅ schváľ – potom ho obchodníci môžu použiť.','go',jsonb_build_object('hash','#spolupraca'))); end if;
  exception when others then null; end;
  -- 📨 ponuky firmám od Lička – odosiela iba Martin
  begin
    select count(*) into n from sales_leads where status='schvalit';
    if n>0 then r:=r||jsonb_build_array(jsonb_build_object('k','leads','id','leads','p',60,'n',n,'t','📨 '||n||' '||case when n=1 then 'ponuka čaká' when n<5 then 'ponuky čakajú' else 'ponúk čaká' end||' na tvoje schválenie',
      's','Ličko ich skontroloval – priprav na odoslanie alebo vráť.','go',jsonb_build_object('tab','deals','sel','#ldCard','lab','🤝 Obchodné návrhy AI'))); end if;
  exception when others then null; end;
  -- 📥 pošta
  begin
    select count(*) into n from lead_replies where status in ('nova','pomoc');
    if n>0 then r:=r||jsonb_build_array(jsonb_build_object('k','posta','id','posta','p',65,'n',n,'t','📥 '||n||' '||case when n=1 then 'e-mail čaká' when n<5 then 'e-maily čakajú' else 'e-mailov čaká' end||' na odpoveď',
      's','Návrh odpovede je pripravený – skopíruj a pošli.','go',jsonb_build_object('hash','#posta'))); end if;
  exception when others then null; end;
  -- 📤 správy farmárom / vodičom na odoslanie
  begin
    for x in select * from notify_outbox where status='caka' order by created_at limit 10 loop
      r:=r||jsonb_build_array(jsonb_build_object('k','ob','id',x.id,'p',58,'t','📤 Správa pre '||coalesce(x.to_name,'príjemcu')||': '||x.title,'s',left(x.body,180),'go',jsonb_build_object('obopen',true)));
    end loop;
  exception when others then null; end;
  -- ⚠️ stráž obchodov (posledných 14 dní)
  begin
    for x in select a.kind, count(*) c from deal_alerts a join deals d on d.id=a.deal_id where a.kind in ('nadodavka','vlastna_firma','obchadza') and a.acked_at is null and a.at>now()-interval '14 days' and deal_live(d) group by a.kind loop
      r:=r||jsonb_build_array(jsonb_build_object('k','straz','id',x.kind,'p',45,'n',x.c,
        't',case x.kind when 'nadodavka' then '⚠️ Nadodávka nad zmluvu: '||x.c||' '||case when x.c=1 then 'zmluva' when x.c<5 then 'zmluvy' else 'zmlúv' end
                        when 'vlastna_firma' then '⚠️ Obchod s vlastnou firmou (ERNTE / VALKO): '||x.c
                        else '⚠️ Možné obchádzanie zmluvy: '||x.c end,
        's',case x.kind when 'nadodavka' then 'Dodané viac ako zmluva – treba dodatok alebo vysvetlenie.' when 'vlastna_firma' then 'Skontroluj, či je to správne.' else 'Farmár dodal mimo zmluvy – pozri lístky.' end,
        'go',jsonb_build_object('tab','deals','sel','#plnCard','lab','📞 Môj plán na dnes')));
    end loop;
  exception when others then null; end;
  -- 🗑️ žiadosti o zmazanie účtu
  begin
    select count(*) into n from account_del_req where status='nova';
    if n>0 then r:=r||jsonb_build_array(jsonb_build_object('k','ucet','id','ucet','p',70,'n',n,'t','🗑️ Žiadosť o zmazanie účtu: '||n,'s','GDPR – vybav do 30 dní (Tím → 🗑️).','go',jsonb_build_object('tab','team','lab','🗑️ Zmazanie účtu'))); end if;
  exception when others then null; end;
  -- 🧠 návrhy pravidiel z tvojich rozhodnutí
  begin r:=r||pravidla_navrhy(); exception when others then null; end;
  return r;
end $$;
revoke all on function public.caka_na_teba() from public, anon; grant execute on function public.caka_na_teba() to authenticated;

-- ---------- ✅ / ✕ z Prehľadu ----------
create or replace function public.caka_act(p_k text, p_id text, p_ok boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare snap jsonb;
begin
  if not price_main() then raise exception 'Schvaľuje iba Martin.'; end if;
  if p_k='pravidlo' then return pravidlo_set(p_id,p_ok); end if;
  if p_k='cena' then
    select value->p_id into snap from ai_state where key='price_pending';
    if snap is null or coalesce((snap->>'rejected')::boolean,false) then raise exception 'Táto cena už bola vybavená.'; end if;
    perform price_pending(p_id,p_ok);
    snap:=snap||jsonb_build_object('d',(snap->>'new')::numeric-(snap->>'old')::numeric);
  elsif p_k='nu' then
    if not p_ok then raise exception 'Zamietnuť sa dá v záložke 🌱 Výkup 2027.'; end if;
    select value->'items'->p_id->'pend' into snap from ai_state where key='nu_ceny';
    perform nu_ok(p_id);
  elsif p_k='nad' then
    if not p_ok then raise exception 'Obchod uprav alebo zruš v Obchodoch.'; end if;
    select a.info||jsonb_build_object('no',d.no,'com',d.com,'tons',d.tons,'price',d.price) into snap from deal_alerts a join deals d on d.id=a.deal_id where a.deal_id=p_id::uuid and a.kind='nad_cennikom';
    perform deal_price_approve(p_id::uuid);
  elsif p_k='odb' then
    select jsonb_build_object('buyer',coalesce(buyer_name,buyer),'com',com,'price',price,'del',del) into snap from odb_navrhy where id=p_id::bigint;
    perform odb_navrh_set(p_id::bigint,p_ok);
  elsif p_k='claude' then
    perform claude_navrh_set(p_id::bigint, case when p_ok then 'ano' else 'nie' end);
  elsif p_k='meet' then
    perform meet_decide(p_id::bigint, case when p_ok then 'ok' else 'no' end);
  elsif p_k='watch' then
    if not p_ok then raise exception 'Iba potvrdenie.'; end if;
    perform deal_watch_ack(p_id::uuid);
  else raise exception 'Túto položku vybav v jej sekcii (Otvoriť).'; end if;
  insert into rozhodnutia(kind,ref,ok,data) values(p_k,p_id,p_ok,snap);
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.caka_act(text,text,boolean) from public, anon; grant execute on function public.caka_act(text,text,boolean) to authenticated;

-- ---------- 🧠 učenie z rozhodnutí ----------
-- Zatiaľ dve pravidlá, ktoré sa dajú bezpečne vykonať samé:
--  cena: zvýšenia našich nákupných cien do X €/t zverejňovať samé (price_auto_raise.max; dnes 5) – navrhne sa, keď si za 60 dní ≥ 8× schválil väčšie zvýšenie a ani raz nezamietol
--  nad:  obchody nad cenníkom do Y €/t schvaľovať samé – navrhne sa, keď si za 60 dní ≥ 8× schválil a všetky boli do Y €/t
-- Každé pravidlo zapne IBA Martin (✅), dá sa kedykoľvek vypnúť; ✕ = nenavrhovať 30 dní. Faktúry, e-maily, zmluvy a nové odberatele sa samé neschvaľujú nikdy.
create or replace function public.pravidla_navrhy() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb:='[]'::jsonb; cfg jsonb; m numeric; n int; mx numeric; rej int; sn jsonb;
begin
  select coalesce(value,'{}'::jsonb) into cfg from ai_state where key='pravidla'; cfg:=coalesce(cfg,'{}'::jsonb); sn:=coalesce(cfg->'snooze','{}'::jsonb);
  -- cena
  select coalesce((value->>'max')::numeric,5) into m from ai_state where key='price_auto_raise'; m:=coalesce(m,5);
  select count(*), max(d) into n, mx from (
    select (i->>'new')::numeric-(i->>'old')::numeric d from kalk_store, jsonb_array_elements(data->'items') i
    where path='pricelist' and id='log' and i->>'by' like 'potvrdil%' and (i->>'at')::timestamptz>now()-interval '60 days'
      and (i->>'new') ~ '^[0-9.]+$' and (i->>'old') ~ '^[0-9.]+$') q where d>m;
  mx:=least(15,ceil(mx));
  select count(*) into rej from rozhodnutia where kind='cena' and not ok and at>now()-interval '60 days' and coalesce((data->>'d')::numeric,0)<=mx;
  if n>=8 and rej=0 and mx>m and coalesce((sn->>'cena')::timestamptz,'-infinity')<now() then
    r:=r||jsonb_build_array(jsonb_build_object('k','pravidlo','id','cena:'||mx,'p',30,'t','🧠 Zvýšenia ceny do '||ck_n(mx)||' €/t zverejňovať samé?',
      's','Za 60 dní si '||n||'× schválil zvýšenie nad '||ck_n(m)||' €/t (najviac +'||ck_n(mx)||') a ani raz si nezamietol. Teraz sa samé zverejnia zvýšenia do '||ck_n(m)||' €/t; väčšie by išli k tebe až nad '||ck_n(mx)||' €/t. Kedykoľvek vypneš.',
      'ok','✅ Áno, rob to sám','no','✕ Nie'));
  end if;
  -- obchody nad cenníkom
  select count(*), max((a.info->>'rozdiel')::numeric) into n, mx from deals d join deal_alerts a on a.deal_id=d.id and a.kind='nad_cennikom'
    where d.price_ok_at>now()-interval '60 days' and coalesce(d.price_ok_by,'') not like 'pravidlo%';
  mx:=least(10,ceil(mx));
  if n>=8 and mx>0 and not (coalesce((cfg->'nad'->>'on')::boolean,false) and (cfg->'nad'->>'max')::numeric>=mx) and coalesce((sn->>'nad')::timestamptz,'-infinity')<now() then
    r:=r||jsonb_build_array(jsonb_build_object('k','pravidlo','id','nad:'||mx,'p',30,'t','🧠 Obchody nad cenníkom do '||ck_n(mx)||' €/t schvaľovať samé?',
      's','Za 60 dní si schválil '||n||' obchodov nad cenníkom, všetky do '||ck_n(mx)||' €/t. Väčšie rozdiely pôjdu k tebe ako doteraz. Kedykoľvek vypneš.',
      'ok','✅ Áno, rob to sám','no','✕ Nie'));
  end if;
  return r;
end $$;
revoke all on function public.pravidla_navrhy() from public, anon, authenticated;

create or replace function public.pravidlo_set(p_id text, p_ok boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare k text:=split_part(p_id,':',1); v numeric; cur jsonb; m numeric;
begin
  if not price_main() then raise exception 'Pravidlá zapína iba Martin.'; end if;
  if k not in ('cena','nad') then raise exception 'Neznáme pravidlo.'; end if;
  insert into ai_state(key,value) values('pravidla','{}'::jsonb) on conflict(key) do nothing;
  if not p_ok then
    update ai_state set value=jsonb_set(value,'{snooze}',coalesce(value->'snooze','{}'::jsonb)||jsonb_build_object(k,now()+interval '30 days')), updated_at=now() where key='pravidla';
    insert into rozhodnutia(kind,ref,ok,data) values('pravidlo',p_id,false,null);
    return jsonb_build_object('ok',true,'msg','Dobre – 30 dní to nebudem navrhovať.');
  end if;
  v:=nullif(split_part(p_id,':',2),'')::numeric;
  if v is null or v<=0 or (k='cena' and v>15) or (k='nad' and v>10) then raise exception 'Neplatná hodnota pravidla.'; end if;
  if k='cena' then
    select coalesce((value->>'max')::numeric,5) into m from ai_state where key='price_auto_raise';
    insert into ai_state(key,value) values('price_auto_raise',jsonb_build_object('max',v)) on conflict(key) do update
      set value=coalesce(ai_state.value,'{}'::jsonb)||jsonb_build_object('max',v,'prev',coalesce(ai_state.value->'prev',to_jsonb(coalesce(m,5))),'by','pravidlo Martina','at',now()), updated_at=now();
    update ai_state set value=value||jsonb_build_object('cena',jsonb_build_object('on',true,'max',v,'prev',coalesce(m,5),'at',now())), updated_at=now() where key='pravidla';
  else
    update ai_state set value=value||jsonb_build_object('nad',jsonb_build_object('on',true,'max',v,'at',now())), updated_at=now() where key='pravidla';
    update deal_alerts set sig=sig where kind='nad_cennikom' and acked_at is null;  -- čakajúce v rozsahu sa schvália hneď (trigger zz_rule_nad)
  end if;
  insert into rozhodnutia(kind,ref,ok,data) values('pravidlo',p_id,true,jsonb_build_object('max',v));
  return jsonb_build_object('ok',true,'msg','Zapnuté. Vypneš ho v Čaká na teba → 🧠 Pravidlá.');
end $$;
revoke all on function public.pravidlo_set(text,boolean) from public, anon; grant execute on function public.pravidlo_set(text,boolean) to authenticated;

create or replace function public.pravidla_list() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb; r jsonb:='[]'::jsonb;
begin
  if not price_main() then return '[]'::jsonb; end if;
  select value into c from ai_state where key='pravidla';
  if coalesce((c->'cena'->>'on')::boolean,false) then r:=r||jsonb_build_array(jsonb_build_object('k','cena','t','Zvýšenia ceny do '||ck_n((c->'cena'->>'max')::numeric)||' €/t sa zverejnia samé','at',c->'cena'->>'at')); end if;
  if coalesce((c->'nad'->>'on')::boolean,false) then r:=r||jsonb_build_array(jsonb_build_object('k','nad','t','Obchody nad cenníkom do '||ck_n((c->'nad'->>'max')::numeric)||' €/t sa schvália samé','at',c->'nad'->>'at',
    'n',(select count(*) from rozhodnutia where kind='nad' and src='pravidlo' and at>(c->'nad'->>'at')::timestamptz))); end if;
  return r;
end $$;
revoke all on function public.pravidla_list() from public, anon; grant execute on function public.pravidla_list() to authenticated;

create or replace function public.pravidlo_off(p_k text) returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select value into c from ai_state where key='pravidla';
  if p_k='cena' and c ? 'cena' then
    update ai_state set value=((value||jsonb_build_object('max',coalesce((c->'cena'->>'prev')::numeric,5)))-'prev')-'by', updated_at=now() where key='price_auto_raise';
  elsif p_k<>'nad' then raise exception 'Neznáme pravidlo.'; end if;
  update ai_state set value=(value-p_k)||jsonb_build_object('snooze',coalesce(value->'snooze','{}'::jsonb)||jsonb_build_object(p_k,now()+interval '30 days')), updated_at=now() where key='pravidla';
  insert into rozhodnutia(kind,ref,ok,data) values('pravidlo',p_k||':off',false,c->p_k);
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.pravidlo_off(text) from public, anon; grant execute on function public.pravidlo_off(text) to authenticated;

-- pravidlo „obchody nad cenníkom do Y €/t“ – vykoná sa hneď pri vzniku upozornenia (nikdy nezastaví pôvodný zápis)
create or replace function public.ernte_rule_nad() returns trigger language plpgsql security definer set search_path=public as $$
declare c jsonb; mx numeric; n int;
begin
  if new.kind<>'nad_cennikom' or new.acked_at is not null then return new; end if;
  begin
    select value->'nad' into c from ai_state where key='pravidla';
    if c is null or not coalesce((c->>'on')::boolean,false) then return new; end if;
    mx:=(c->>'max')::numeric;
    if mx is null or coalesce((new.info->>'rozdiel')::numeric,1e9)>mx then return new; end if;
    perform set_config('ernte.deal_ok','1',true);
    update deals set price_ok_at=now(), price_ok_price=price, price_ok_by='pravidlo Martina (do '||ck_n(mx)||' €/t)' where id=new.deal_id and price_ok_at is null;
    get diagnostics n=row_count;
    if n>0 then new.acked_at:=now(); insert into rozhodnutia(kind,ref,ok,data,by,src) values('nad',new.deal_id::text,true,new.info,'pravidlo','pravidlo'); end if;
  exception when others then null; end;
  return new;
end $$;
drop trigger if exists zz_rule_nad on public.deal_alerts;
create trigger zz_rule_nad before insert or update on public.deal_alerts for each row execute function public.ernte_rule_nad();

-- pravidlá sú nastavenie → záznam zmien a body obnovy
create or replace function public.config_keys() returns text[] language sql immutable as $$
  select array['deal_watch_cfg','price_auto_raise','profit_cfg','push_cfg','push_filter','region_watch_cfg','trader_cfg','meet_cfg','pred_cfg',
               'nu_cfg','deal_sign_cc','price_alert','team_ai','mail_off','claude_auto_cfg','pravidla'] $$;

-- ---------- 📥 Vhoď sem: čo je na fotke / v PDF ----------
create or replace function public.vhod_scan(p_data text, p_mime text, p_name text default null) returns bigint language plpgsql security definer set search_path=public, net as $$
declare k text:=regexp_replace(coalesce(ai_secret('anthropic_key'),''),'\s','','g'); md text:=(select value->>'mode' from ai_state where key='auth'); sid bigint; blk jsonb; n int;
  p text:='Čo je na tejto prílohe? Je to dokument pre firmu, ktorá vykupuje obilie a olejniny od farmárov a predáva ich odberateľom (Slovensko, Maďarsko). '||
   'Vráť JSON: {"druh":"cennik_odberatela|obchod_papier|peciatka|vazny_listok|faktura|zmluva|doprava|ine","istota":"vysoka|stredna|nizka","popis":"jedna veta po slovensky, čo to je a od koho","firma":"názov firmy, ak je"}. '||
   'cennik_odberatela = cenník, cenová ponuka alebo SMS/e-mail s cenami od odberateľa / spracovateľa (Bunge, ADM, Agro-Somotor, Interagros…); obchod_papier = papier / formulár o nákupe od farmára (farmár, komodita, tony, cena); '||
   'peciatka = pečiatka alebo hlavička firmy farmára (IČO, adresa); vazny_listok = vážny lístok / váženie; faktura = faktúra; zmluva = podpísaná zmluva; doprava = CMR, objednávka prepravy, tankovanie; ine = niečo iné.';
begin
  if not is_owner() then raise exception 'Iba majiteľ.'; end if;
  if k='' then raise exception 'Chýba kľúč pre Claude.'; end if;
  if length(coalesce(p_data,''))<500 or length(p_data)>7000000 then raise exception 'Súbor je prázdny alebo príliš veľký (max. ~5 MB).'; end if;
  select count(*) into n from sell_scans where created_at>now()-interval '1 day'; if n>=120 then raise exception 'Dnes už bolo veľa načítaní.'; end if;
  blk:=case when p_mime='application/pdf' then jsonb_build_object('type','document','source',jsonb_build_object('type','base64','media_type','application/pdf','data',p_data))
    else jsonb_build_object('type','image','source',jsonb_build_object('type','base64','media_type',case when p_mime in ('image/png','image/webp','image/gif') then p_mime else 'image/jpeg' end,'data',p_data)) end;
  insert into sell_scans(status) values('wait') returning id into sid;
  update sell_scans set req_id=net.http_post(url:='https://api.anthropic.com/v1/messages',
    headers:=case when coalesce(md, case when k like 'sk-ant-api%' then 'x' else 'b' end)='x' then jsonb_build_object('x-api-key',k) else jsonb_build_object('Authorization','Bearer '||k) end||jsonb_build_object('anthropic-version','2023-06-01','content-type','application/json'),
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',300,
      'system','Triediš dokumenty. Odpovedz IBA jedným platným JSON objektom bez ďalšieho textu a bez ```.',
      'messages',jsonb_build_array(jsonb_build_object('role','user','content',jsonb_build_array(blk,jsonb_build_object('type','text','text',p||coalesce(' Názov súboru: '||left(p_name,120),'')))))),
    timeout_milliseconds:=60000) where id=sid;
  return sid;
end $$;
revoke all on function public.vhod_scan(text,text,text) from public, anon; grant execute on function public.vhod_scan(text,text,text) to authenticated;

-- ---------- 📊 používanie sekcií aj s posledným otvorením ----------
create or replace function public.tab_use_get() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(tab,jsonb_build_object('n',n,'s',s,'l',last_at)),'{}'::jsonb) from tab_use where email=lower(coalesce(auth.jwt()->>'email','')) $$;
