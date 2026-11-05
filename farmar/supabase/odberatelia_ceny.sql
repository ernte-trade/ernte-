-- 🏷️ CENY ODBERATEĽOV – EVIDENCIA, NET-BACK, AUTOMATICKY Z E-MAILOV A WEBU (úloha majiteľa 5. 11. 2026, b47b54f4)
-- Nadväzuje na sell_offers / sell_buyers (Kde predať, 🛒 Nákup pre odberateľa, HO model) – nič sa neduplikuje, iba sa dopĺňa:
--  • sell_offers: src (rucne / email / web / konk …), valid_to (platí do), src_ref (odb_inbox.id)
--  • sell_buyers: price_url (verejný cenník na webe), mail_dom (domény e-mailov odberateľa)
--  • odb_inbox: e-maily od odberateľov (Gmail skript erntespol, kľúč ako zúčtovanie) a zmenené webové cenníky → AI vyčíta ceny
--  • odb_navrhy: ceny na potvrdenie Martinom (nový odberateľ alebo cena o > 15 % mimo jeho poslednej ponuky) – do výpočtov idú až po ✓
--  • net-back = cena odberateľa (posunutá s burzou, ak podľa nej ráta) − naša doprava (vzorec Kalkulačky sell_dop, rovnako ako Kde predať)
--    porovnanie s naším cenníkom a s priemerným nákupom nepredaných t (sale_summary)
--  • push priorita 5 „Predaj teraz“ (net-back ≥ priemerný nákup + 8 €/t pri otvorenej pozícii > 100 t), priorita 3 keď cena zostarne (> 3 prac. dni)
--  • AI poradca: ai_snapshot → ceny_odberatelov (najlepšia cena každej komodity s dátumom)
-- Mená odberateľov a ceny iba v databáze; vidí IBA Martin (price_main).

alter table public.sell_offers add column if not exists src text;
alter table public.sell_offers add column if not exists valid_to date;
alter table public.sell_offers add column if not exists src_ref bigint;
alter table public.sell_buyers add column if not exists price_url text;
alter table public.sell_buyers add column if not exists mail_dom text[];

create table if not exists public.odb_inbox(
  id bigint generated always as identity primary key, kind text not null default 'email', msgid text not null unique, buyer text, from_addr text, subject text, received timestamptz,
  body text, att_name text, att_mime text, att_data text, status text not null default 'nova', req_id bigint, tries int not null default 0,
  result jsonb, n_ok int, n_wait int, err text, at timestamptz not null default now(), done_at timestamptz);
create table if not exists public.odb_navrhy(
  id bigint generated always as identity primary key, inbox_id bigint, buyer text, buyer_name text, com text not null, site text, del text, price numeric not null, cur text,
  period text, d date, valid_to date, note text, why text, status text not null default 'caka', offer_id bigint, at timestamptz not null default now(), done_at timestamptz);
create table if not exists public.odb_web(buyer text primary key, url text, req_id bigint, at timestamptz, md5 text, ok_at timestamptz, err text);
alter table public.odb_inbox enable row level security; alter table public.odb_navrhy enable row level security; alter table public.odb_web enable row level security;
revoke all on public.odb_inbox, public.odb_navrhy, public.odb_web from anon, authenticated;

-- komodita → burza v market_px (ako predaj.js BZ: olejniny → repka, obilniny → pšenica)
create or replace function public.odb_bz(p_c text) returns text language sql immutable as $$
  select case when p_c in ('repka','lo','ho') then 'repka' when p_c in ('psenica','psenica_p','psenica_k','jacmen_k','jacmen_s','cirok') then 'psenica'
    when p_c='kukurica' then 'kukurica' when p_c in ('soja','soja_usc_bu') then 'soja_usc_bu' end $$;
create or replace function public.odb_bdays(p_d date) returns int language sql stable as $$
  select case when p_d is null then 999 else (select count(*)::int from generate_series(p_d+1,(now() at time zone 'Europe/Bratislava')::date,interval '1 day') g where extract(isodow from g)<6) end $$;
create or replace function public.odb_site(p_sites jsonb, p_site text) returns jsonb language sql stable as $$
  select coalesce((select x from jsonb_array_elements(coalesce(p_sites,'[]'::jsonb)) x where x->>'n'=p_site or (x->>'rx' is not null and coalesce(p_site,'') ~* (x->>'rx')) limit 1),
    case when jsonb_array_length(coalesce(p_sites,'[]'::jsonb))=1 then p_sites->0 end) $$;
-- regex odberateľa z aplikácie (JavaScript) → PostgreSQL (\b = hranica slova)
create or replace function public.odb_rx(p text) returns text language sql immutable as $$ select replace(coalesce(p,''),'\b','\y') $$;

-- 📋 všetky platné ceny odberateľov (posledná na odberateľa | komoditu | miesto | paritu | obdobie, max p_dni) s net-backom
create or replace function public.odb_list(p_dni int default 45) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare ss jsonb; res jsonb;
begin
  begin ss:=coalesce(sale_summary()->'pozicie','{}'::jsonb); exception when others then ss:='{}'::jsonb; end;
  with o as (select distinct on (o.buyer,o.com,coalesce(o.site,''),o.del,coalesce(o.period,'')) o.*, b.name bname, b.sites bsites, b.float_burza fb, upper(coalesce(b.parita,'')) bpar
             from sell_offers o join sell_buyers b on b.id=o.buyer and b.active
             where o.d>=current_date-p_dni order by o.buyer,o.com,coalesce(o.site,''),o.del,coalesce(o.period,''),o.d desc,o.id desc),
       x as (select o.*, m.eur_t px_now,
               case when o.fb and o.bz_val is not null and m.eur_t is not null then round(m.eur_t-o.bz_val,2) end sh,
               odb_site(o.bsites,o.site) st
             from o left join market_px m on m.sym=odb_bz(coalesce(o.bz_sym,o.com)) and m.eur_t>0),
       y as (select x.*, x.price+coalesce(x.sh,0) p,
               case when x.del in ('FCA','EXW') or x.bpar='FCA' then 0 else sell_dop(x.st) end dop from x)
  select coalesce(jsonb_agg(jsonb_build_object('id',y.id,'buyer',y.buyer,'b',y.bname,'com',y.com,'site',coalesce(y.site,y.st->>'n',''),'del',y.del,'price0',y.price,'shift',y.sh,
      'price',round(y.p,2),'dop',y.dop,'net',case when y.dop is not null then round(y.p-y.dop,2) end,'d',y.d,'period',y.period,'valid_to',y.valid_to,'src',coalesce(y.src,case when y.created_by='konk' then 'konk' else 'rucne' end),
      'note',y.note,'bd',odb_bdays(y.d),'stale',odb_bdays(y.d)>3,'expired',y.valid_to<current_date,'fwd',coalesce(y.period,'') ~* '^\s*odber',
      'our',(select price from prices where com=y.com),'avg',(ss->y.com->>'nepredane_priemer_nakup_eur_t')::numeric,'open_t',(ss->y.com->>'otvorena_t')::numeric,
      'm_avg',case when y.dop is not null and (ss->y.com->>'nepredane_priemer_nakup_eur_t') is not null then round(y.p-y.dop-(ss->y.com->>'nepredane_priemer_nakup_eur_t')::numeric,2) end,
      'm_our',case when y.dop is not null and (select price from prices where com=y.com) is not null then round(y.p-y.dop-(select price from prices where com=y.com),2) end)
    order by y.com, (y.p-coalesce(y.dop,0)) desc),'[]'::jsonb) into res from y;
  return res;
end $$;
revoke all on function public.odb_list(int) from public, anon, authenticated;

-- 📱 Cenník → 🏷️ Ceny odberateľov (iba Martin)
create or replace function public.odb_ceny() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return jsonb_build_object('items',odb_list(45),
    'navrhy',(select coalesce(jsonb_agg(to_jsonb(n) order by n.at desc),'[]'::jsonb) from odb_navrhy n where n.status='caka'),
    'inbox',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'kind',i.kind,'b',(select name from sell_buyers where id=i.buyer),'from',i.from_addr,'subj',i.subject,'at',i.at,'rc',i.received,
        'status',i.status,'ok',i.n_ok,'wait',i.n_wait,'err',i.err) order by i.at desc),'[]'::jsonb) from (select * from odb_inbox order by at desc limit 12) i),
    'buyers',(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'url',b.price_url,'dom',b.mail_dom,'web',(select jsonb_build_object('ok_at',w.ok_at,'err',w.err) from odb_web w where w.buyer=b.id)) order by b.sort,b.name),'[]'::jsonb)
      from sell_buyers b where b.active),
    'ping',(select value from ai_state where key='odb_mail_ping'),
    'has_key',exists(select 1 from ai_state where key='zuct_inbox_key'));
end $$;
revoke all on function public.odb_ceny() from public, anon; grant execute on function public.odb_ceny() to authenticated;

-- ✉️ Gmail skript: komu patria e-maily s cenami (regexy odberateľov + domény + firmy, ktorým sme písali ponuku)
create or replace function public.odb_mail_cfg(p_key text) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not zuct_key_ok(p_key) then return jsonb_build_object('on',false); end if;
  return jsonb_build_object('on',true,
    'rx',(select coalesce(jsonb_agg(b.rx),'[]'::jsonb) from sell_buyers b where b.active and coalesce(b.rx,'')<>''),
    'dom',(select coalesce(jsonb_agg(distinct d),'[]'::jsonb) from (
        select lower(unnest(b.mail_dom)) d from sell_buyers b where b.active
        union select split_part(lower(m.to_addr),'@',2) from mail_jobs m where m.created_at>now()-interval '180 days' and m.to_addr like '%@%'
          and split_part(lower(m.to_addr),'@',2) !~ '^(gmail|googlemail|yahoo|outlook|hotmail|azet|centrum|post|zoznam|seznam|freemail|citromail|t-online|gmx|icloud|me|ernte|valko)\.') q where coalesce(d,'')<>''));
end $$;
revoke all on function public.odb_mail_cfg(text) from public; grant execute on function public.odb_mail_cfg(text) to anon, authenticated;

-- ✉️ Gmail skript → e-mail od odberateľa (text + prvá príloha PDF / obrázok); bez prílohy a bez 3-miestneho čísla sa AI nevolá
create or replace function public.odb_inbox_put(p_key text, p_msgid text, p_from text, p_subject text, p_date text, p_body text,
  p_att_name text default null, p_att_mime text default null, p_att_b64 text default null) returns text language plpgsql security definer set search_path=public as $$
declare a text:=lower(coalesce(substring(coalesce(p_from,'') from '<([^>]+)>'),trim(coalesce(p_from,'')))); b text; n int; id bigint;
begin
  if not zuct_key_ok(p_key) then return 'zly kluc'; end if;
  select count(*) into n from odb_inbox where at>now()-interval '1 hour'; if n>60 then return 'limit'; end if;
  select x.id into b from sell_buyers x where x.active and ((coalesce(x.rx,'')<>'' and coalesce(p_from,'') ~* odb_rx(x.rx))
      or exists(select 1 from unnest(coalesce(x.mail_dom,array[]::text[])) d where split_part(a,'@',2)=lower(d) or split_part(a,'@',2) like '%.'||lower(d))) order by x.sort limit 1;
  if b is null and not lead_known(a) then return 'nie odberatel'; end if;
  if p_att_b64 is not null and (length(p_att_b64)>7000000 or coalesce(p_att_mime,'') !~* '(pdf|png|jpe?g|webp|gif)') then p_att_b64:=null; p_att_name:=null; p_att_mime:=null; end if;
  insert into odb_inbox(kind,msgid,buyer,from_addr,subject,received,body,att_name,att_mime,att_data,status,err)
    values('email',left(p_msgid,200),b,left(p_from,300),left(p_subject,300),case when p_date ~ '^\d{4}-\d\d-\d\d' then p_date::timestamptz else now() end,left(p_body,20000),
      left(p_att_name,200),left(p_att_mime,80),p_att_b64,
      case when p_att_b64 is null and coalesce(p_subject,'')||' '||coalesce(p_body,'') !~ '\d{3}' then 'ziadne' else 'nova' end,
      case when p_att_b64 is null and coalesce(p_subject,'')||' '||coalesce(p_body,'') !~ '\d{3}' then 'bez čísel – nečítané AI' end)
    on conflict(msgid) do nothing returning odb_inbox.id into id;
  return case when id is null then 'uz je' else 'ok' end;
end $$;
revoke all on function public.odb_inbox_put(text,text,text,text,text,text,text,text,text) from public; grant execute on function public.odb_inbox_put(text,text,text,text,text,text,text,text,text) to anon, authenticated;

create or replace function public.odb_mail_ping(p_key text, p_n int default 0) returns text language plpgsql security definer set search_path=public as $$
begin
  if not zuct_key_ok(p_key) then return 'zly kluc'; end if;
  insert into ai_state(key,value) values('odb_mail_ping',jsonb_build_object('seen',now(),'n',p_n)) on conflict(key) do update set value=excluded.value, updated_at=now();
  return 'ok';
end $$;
revoke all on function public.odb_mail_ping(text,int) from public; grant execute on function public.odb_mail_ping(text,int) to anon, authenticated;

-- 🤖 AI vyčíta ceny (rovnaká výzva ako 📷 Ponuka z fotky – sell_scan), najviac 40 čítaní denne
create or replace function public.odb_ai_req(p_id bigint) returns void language plpgsql security definer set search_path=public, net as $$
declare r odb_inbox; k text:=regexp_replace(coalesce(ai_secret('anthropic_key'),''),'\s','','g'); md text:=(select value->>'mode' from ai_state where key='auth'); blk jsonb:='[]'::jsonb; t text;
begin
  select * into r from odb_inbox where id=p_id; if r.id is null then return; end if;
  if k='' then update odb_inbox set status='chyba', err='Chýba kľúč pre Claude (ai.html).' where id=p_id; return; end if;
  if r.att_data is not null then
    blk:=blk||case when r.att_mime ~* 'pdf' then jsonb_build_object('type','document','source',jsonb_build_object('type','base64','media_type','application/pdf','data',r.att_data))
      else jsonb_build_object('type','image','source',jsonb_build_object('type','base64','media_type',case when r.att_mime ~* 'png' then 'image/png' when r.att_mime ~* 'webp' then 'image/webp' when r.att_mime ~* 'gif' then 'image/gif' else 'image/jpeg' end,'data',r.att_data)) end;
  end if;
  t:='Toto je '||case when r.kind='web' then 'verejný cenník odberateľa na webe ('||coalesce(r.from_addr,'')||')' else 'e-mail od '||coalesce(r.from_addr,'')||', predmet „'||coalesce(r.subject,'')||'“, prijatý '||to_char(r.received at time zone 'Europe/Bratislava','YYYY-MM-DD HH24:MI') end
    ||coalesce(', odberateľ v našej evidencii: '||(select name from sell_buyers where id=r.buyer),'')||'.'||chr(10)
    ||'Ak obsahuje výkupné / nákupné ceny poľnohospodárskych komodít (za koľko odberateľ KÚPI tovar), vypíš VŠETKY. Ak neobsahuje žiadnu takú cenu (napr. iba otázka, potvrdenie, reklama), vráť "ponuky":[]. Nepočítaj ceny, ktoré navrhujeme MY (citácia našej ponuky v odpovedi).'||chr(10)
    ||'Vráť JSON: {"odberatel":"názov firmy, ktorá cenu dáva","datum":"YYYY-MM-DD dátum cien","platnost":"YYYY-MM-DD do kedy ceny platia, ak je uvedené, inak null","burza":"napr. MATIF 550 ak je uvedená",'
    ||'"ponuky":[{"komodita":"repka|psenica_p|psenica_k|soja|jacmen_k|jacmen_s|kukurica|lo|ho|cirok","miesto":"mesto/závod dodania","parita":"DDP|DAP|FCA|EXW","cena":0,"mena":"EUR|HUF|USD","obdobie":"napr. 2026-11 alebo odber 1.–3. 2027","pozn":"kvalita, úroda, podmienky"}]}. '
    ||'Skratky: SFS / sunflower / napraforgó / Sonnenblumen = lo; HO / high oleic = ho; RPS / rapeseed / repce / Raps = repka; SBS / soybean / szója / Soja = soja; corn / maize / kukorica / Mais = kukurica; feed wheat / takarmánybúza / Futterweizen = psenica_k; milling wheat / étkezési búza / Mahlweizen = psenica_p; feed barley / takarmányárpa / Futtergerste = jacmen_k. '
    ||'Ak parita nie je jasná a je uvedené miesto dodania, použi DAP. Iba čísla, bez textu navyše.'||chr(10)||chr(10)||left(coalesce(r.body,''),14000);
  blk:=blk||jsonb_build_object('type','text','text',t);
  update odb_inbox set status='scan', tries=tries+1, err=null, req_id=net.http_post(url:='https://api.anthropic.com/v1/messages',
    headers:=case when coalesce(md, case when k like 'sk-ant-api%' then 'x' else 'b' end)='x' then jsonb_build_object('x-api-key',k) else jsonb_build_object('Authorization','Bearer '||k) end||jsonb_build_object('anthropic-version','2023-06-01','content-type','application/json'),
    body:=jsonb_build_object('model',coalesce((select value->>'model' from ai_state where key='model'),'claude-sonnet-5-5'),'max_tokens',3000,
      'system','Si obchodník s obilím a olejninami (Slovensko, Maďarsko). Čítaš cenové ponuky odberateľov z e-mailov a webu. Odpovedz IBA jedným platným JSON objektom bez ďalšieho textu a bez ```.',
      'messages',jsonb_build_array(jsonb_build_object('role','user','content',blk))),timeout_milliseconds:=120000)
  where id=p_id;
end $$;
revoke all on function public.odb_ai_req(bigint) from public, anon, authenticated;

-- výsledok AI → sell_offers (známy odberateľ, cena v norme) alebo odb_navrhy (nový odberateľ / odchýlka > 15 %)
create or replace function public.odb_apply(p_id bigint, j jsonb) returns void language plpgsql security definer set search_path=public as $$
declare r odb_inbox; p jsonb; bid text; bname text; c text; v numeric; cur text; dl text; dd date; vt date; prev numeric; med numeric; why text; huf numeric; usd numeric; nok int:=0; nw int:=0; fb boolean; bz text; bzv numeric;
  txt text:=''; oid bigint; st text;
begin
  select * into r from odb_inbox where id=p_id; if r.id is null then return; end if;
  bid:=r.buyer;
  if bid is null and coalesce(j->>'odberatel','')<>'' then
    select id into bid from sell_buyers where active and (lower(name)=lower(j->>'odberatel') or (coalesce(rx,'')<>'' and (j->>'odberatel') ~* odb_rx(rx))) order by sort limit 1;
  end if;
  select name, float_burza into bname, fb from sell_buyers where id=bid;
  select nullif(data->'fx'->>'huf','')::numeric, nullif(data->'fx'->>'usd','')::numeric into huf, usd from kalk_store where path='market' and id='latest';
  dd:=case when j->>'datum' ~ '^\d{4}-\d\d-\d\d$' then (j->>'datum')::date else coalesce(r.received,now())::date end;
  if dd>current_date then dd:=current_date; end if;
  vt:=case when j->>'platnost' ~ '^\d{4}-\d\d-\d\d$' then (j->>'platnost')::date end;
  for p in select * from jsonb_array_elements(case when jsonb_typeof(j->'ponuky')='array' then j->'ponuky' else '[]'::jsonb end) loop
    c:=p->>'komodita'; v:=nullif(regexp_replace(coalesce(p->>'cena',''),'[^0-9.]','','g'),'')::numeric; cur:=upper(coalesce(p->>'mena','EUR'));
    if c is null or c not in ('repka','psenica_p','psenica_k','soja','jacmen_k','jacmen_s','kukurica','lo','ho','cirok') or v is null or v<=0 then continue; end if;
    if cur='HUF' then if huf is null then continue; end if; v:=round(v/huf,2); elsif cur='USD' then if usd is null then continue; end if; v:=round(v/usd,2); end if;
    dl:=upper(coalesce(p->>'parita','DAP')); if dl not in ('DDP','DAP','FCA','EXW') then dl:='DAP'; end if;
    st:=nullif(trim(coalesce(p->>'miesto','')),'');
    why:=null;
    if bid is null then why:='nový odberateľ – potvrď, či ho chceme sledovať';
    elsif v<80 or v>1500 then why:='cena mimo bežného rozsahu';
    else
      select o.price into prev from sell_offers o where o.buyer=bid and o.com=c and o.del=dl and o.d>=current_date-30 and (st is null or coalesce(o.site,'')=st) order by o.d desc, o.id desc limit 1;
      select percentile_cont(0.5) within group (order by o.price) into med from sell_offers o where o.com=c and o.d>=current_date-21 and o.buyer is distinct from bid;
      if prev is not null and abs(v-prev)>prev*0.15 then why:='o '||round(100*(v-prev)/prev)||' % mimo poslednej ponuky ('||round(prev)||' €/t)';
      elsif prev is null and med is not null and abs(v-med)>med*0.2 then why:='o '||round(100*(v-med)/med)||' % mimo ostatných odberateľov (medián '||round(med)||' €/t)'; end if;
    end if;
    if why is not null then
      insert into odb_navrhy(inbox_id,buyer,buyer_name,com,site,del,price,cur,period,d,valid_to,note,why)
        values(r.id,bid,coalesce(bname,j->>'odberatel'),c,st,dl,v,cur,nullif(p->>'obdobie',''),dd,vt,left(concat_ws(' · ',nullif(p->>'pozn',''),nullif(j->>'burza','')),300),why);
      nw:=nw+1;
    elsif not exists(select 1 from sell_offers o where o.buyer=bid and o.com=c and o.del=dl and coalesce(o.site,'')=coalesce(st,'') and o.price=v and o.d=dd) then
      bz:=case when fb then case odb_bz(c) when 'psenica' then 'psenica_p' when 'soja_usc_bu' then 'soja' else odb_bz(c) end end;
      bzv:=case when fb then (select eur_t from market_px where sym=odb_bz(c) and eur_t>0) end;
      insert into sell_offers(buyer,com,site,del,price,cur,period,d,bz_sym,bz_val,note,created_by,src,valid_to,src_ref)
        values(bid,c,st,dl,v,cur,nullif(p->>'obdobie',''),dd,case when bzv is not null then bz end,bzv,
          left(concat_ws(' · ',nullif(p->>'pozn',''),nullif(j->>'burza',''),case when r.kind='web' then 'web' else 'e-mail '||coalesce(r.subject,'') end),300),
          case when r.kind='web' then 'web' else 'gmail' end,case when r.kind='web' then 'web' when r.att_mime ~* 'pdf' then 'pdf' else 'email' end,vt,r.id) returning id into oid;
      nok:=nok+1; txt:=txt||case when txt='' then '' else ', ' end||cennik_nm(c)||' '||round(v)||' '||dl||coalesce(' '||st,'');
    end if;
  end loop;
  update odb_inbox set status=case when nok+nw>0 then 'ok' else 'ziadne' end, result=j, n_ok=nok, n_wait=nw, done_at=now(), att_data=null where id=p_id;
  if nok>0 or nw>0 then
    begin perform push_send('odb','nove',p_id::text,'🏷️ Ceny odberateľa: '||coalesce(bname,j->>'odberatel','?'),
      case when nok>0 then 'Zapísané: '||left(txt,300) else '' end||case when nw>0 then case when nok>0 then chr(10) else '' end||nw||' '||case when nw=1 then 'cena čaká' else 'ceny čakajú' end||' na tvoje potvrdenie.' else '' end
      ||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → 🏷️ Ceny odberateľov',case when nw>0 then 4 else 3 end,'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['label'],interval '1 hour',push_main_emails());
    exception when others then null; end;
  end if;
end $$;
revoke all on function public.odb_apply(bigint,jsonb) from public, anon, authenticated;

-- 🌐 verejné cenníky odberateľov (pracovné dni 6–18 h, každý najviac raz za hodinu) → pri zmene textu AI
create or replace function public.odb_web_tick() returns int language plpgsql security definer set search_path=public, net as $$
declare b record; w odb_web; r record; t text; h text; n int:=0; loc timestamp:=now() at time zone 'Europe/Bratislava';
begin
  -- odpovede
  for w in select * from odb_web where req_id is not null loop
    select * into r from net._http_response where id=w.req_id;
    if r.id is null then
      if w.at<now()-interval '10 minutes' then update odb_web set req_id=null, err='bez odpovede' where buyer=w.buyer; end if;
      continue;
    end if;
    if r.status_code=200 and coalesce(r.content,'')<>'' then
      t:=regexp_replace(regexp_replace(regexp_replace(r.content,'<(script|style)[^>]*>.*?</\1>',' ','gis'),'<[^>]+>',' ','g'),'&nbsp;|&#160;',' ','g');
      t:=regexp_replace(replace(replace(replace(t,'&amp;','&'),'&lt;','<'),'&gt;','>'),'\s+',' ','g');
      h:=md5(t);
      if h is distinct from w.md5 and length(t)>50 then
        insert into odb_inbox(kind,msgid,buyer,from_addr,subject,received,body) values('web','web:'||w.buyer||':'||h,w.buyer,w.url,'Cenník na webe',now(),left(t,20000)) on conflict(msgid) do nothing;
        n:=n+1;
      end if;
      update odb_web set req_id=null, md5=h, ok_at=now(), err=null where buyer=w.buyer;
    else
      update odb_web set req_id=null, err='HTTP '||coalesce(r.status_code::text,'?')||' '||left(coalesce(r.error_msg,''),120) where buyer=w.buyer;
    end if;
  end loop;
  -- nové požiadavky
  if extract(isodow from loc)<6 and extract(hour from loc) between 6 and 18 then
    for b in select x.id, x.price_url from sell_buyers x where x.active and coalesce(x.price_url,'') ~* '^https?://' loop
      select * into w from odb_web where buyer=b.id;
      if w.buyer is null or (w.req_id is null and (w.at is null or w.at<now()-interval '55 minutes' or w.url is distinct from b.price_url)) then
        insert into odb_web(buyer,url,req_id,at) values(b.id,b.price_url,net.http_get(url:=b.price_url,timeout_milliseconds:=20000),now())
          on conflict(buyer) do update set url=excluded.url, req_id=excluded.req_id, at=excluded.at;
      end if;
    end loop;
  end if;
  return n;
end $$;
revoke all on function public.odb_web_tick() from public, anon, authenticated;

-- 🔔 upozornenia: „Predaj teraz“ (priorita 5) a cena zostarla (priorita 3)
create or replace function public.odb_alerts() returns int language plpgsql security definer set search_path=public as $$
declare ss jsonb; L jsonb; c text; b jsonb; t numeric; a numeric; told jsonb; k text; n int:=0; loc timestamp:=now() at time zone 'Europe/Bratislava'; old text:=''; xx jsonb; nm text;
begin
  begin ss:=coalesce(sale_summary()->'pozicie','{}'::jsonb); exception when others then return 0; end;
  L:=odb_list(21);
  select value into told from ai_state where key='odb_told'; told:=coalesce(told,'{}'::jsonb);
  -- 💰 predaj teraz: otvorená pozícia > 100 t a najlepší net-back ≥ priemerný nákup nepredaných + 8 €/t
  for c in select distinct q.v->>'com' from jsonb_array_elements(L) q(v) loop
    t:=(ss->c->>'otvorena_t')::numeric; a:=(ss->c->>'nepredane_priemer_nakup_eur_t')::numeric;
    if t is null or t<=100 or a is null then continue; end if;
    select q.v into b from jsonb_array_elements(L) q(v) where q.v->>'com'=c and q.v->>'net' is not null and not (q.v->>'stale')::boolean and not coalesce((q.v->>'expired')::boolean,false) and not (q.v->>'fwd')::boolean
      order by (q.v->>'net')::numeric desc limit 1;
    if b is null or (b->>'net')::numeric-a<8 then continue; end if;
    -- raz za deň na komoditu; znova skôr iba keď je predaj o ≥ 5 €/t lepší ako pri poslednom upozornení
    k:='p:'||c;
    if told ? k and (told->k->>'at')::timestamptz>now()-interval '20 hours' and (b->>'net')::numeric<coalesce((told->k->>'net')::numeric,0)+5 then continue; end if;
    begin perform push_send('odb','predaj',k,'💰 Predaj teraz: '||cennik_nm(c)||' – '||(b->>'b'),
      'Predaj teraz: '||cennik_nm(c)||' '||(b->>'b')||coalesce(' '||nullif(b->>'site',''),'')||' '||round((b->>'price')::numeric)||' €/t '||(b->>'del')
      ||', marža '||round((b->>'net')::numeric-a)||' €/t, '||replace(to_char(round(((b->>'net')::numeric-a)*t),'FM999G999G990'),',',' ')||' € spolu'||chr(10)
      ||'Otvorené '||round(t)||' t · priemerný nákup '||round(a)||' €/t · naša doprava '||coalesce(round((b->>'dop')::numeric)::text,'?')||' €/t · cena z '||to_char((b->>'d')::date,'FMDD. FMMM.')
      ||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → 🏷️ Ceny odberateľov',5,'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['moneybag'],interval '1 minute',push_main_emails());
      told:=told||jsonb_build_object(k,jsonb_build_object('at',now(),'net',(b->>'net')::numeric,'b',b->>'buyer')); n:=n+1;
    exception when others then null; end;
  end loop;
  -- ⏳ cena zostarla (> 3 pracovné dni) – raz za cenu, v pracovný deň od 9:00, jedna správa
  if extract(isodow from loc)<6 and extract(hour from loc) between 9 and 18 then
    for xx in select y from jsonb_array_elements(L) y where (y->>'stale')::boolean and not (y->>'fwd')::boolean order by y->>'b', y->>'com' loop
      k:='s:'||(xx->>'id'); if told ? k then continue; end if;
      old:=old||chr(10)||'• '||(xx->>'b')||' – '||cennik_nm(xx->>'com')||coalesce(' '||nullif(xx->>'site',''),'')||' '||round((xx->>'price0')::numeric)||' €/t z '||to_char((xx->>'d')::date,'FMDD. FMMM.')||' ('||(xx->>'bd')||' prac. dni)';
      told:=told||jsonb_build_object(k,now());
    end loop;
    if old<>'' then
      begin perform push_send('odb','stare',md5(old),'⏳ Ceny odberateľov sú neaktuálne',
        'Staršie ako 3 pracovné dni – vyžiadaj nové ceny:'||left(old,700)||chr(10)||'👉 ERNTE Trade & Logistic: Cenník → 🏷️ Ceny odberateľov',3,'https://ernte-trade.github.io/ernte-/farmar/#cennik','owner',array['hourglass'],interval '20 hours',push_main_emails());
        n:=n+1;
      exception when others then null; end;
    end if;
  end if;
  -- staré značky (> 40 dní) preč
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into told from jsonb_each(told) where coalesce(value->>'at',value#>>'{}')::timestamptz>now()-interval '40 days';
  insert into ai_state(key,value) values('odb_told',told) on conflict(key) do update set value=excluded.value, updated_at=now();
  return n;
end $$;
revoke all on function public.odb_alerts() from public, anon, authenticated;

-- ⏱️ každých 5 min: web, AI čítanie (najviac 3 naraz, 40 za deň), výsledky, upozornenia (každých 15 min)
create or replace function public.odb_tick() returns text language plpgsql security definer set search_path=public, net as $$
declare i record; r record; j jsonb; txt text; a int; b int; n int:=0; m int:=0;
begin
  begin perform odb_web_tick(); exception when others then
    insert into check_err(fn,msg,at) values('odb_web_tick',left(SQLERRM,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(); end;
  for i in select * from odb_inbox where status='scan' loop
    select * into r from net._http_response where id=i.req_id;
    if r.id is null then
      if i.at<now()-interval '15 minutes' and coalesce(i.done_at,i.at)<now()-interval '5 minutes' then update odb_inbox set status=case when i.tries<3 then 'nova' else 'chyba' end, err='Claude neodpovedal', done_at=now() where id=i.id; end if;
      continue;
    end if;
    if r.status_code is distinct from 200 then
      update odb_inbox set status=case when i.tries<3 and coalesce(r.status_code,0) in (0,429,500,502,503,529) then 'nova' else 'chyba' end,
        err='Claude ('||coalesce(r.status_code::text,'sieť')||'): '||left(coalesce(ai_json(r.content)#>>'{error,message}',r.error_msg,''),200), done_at=now() where id=i.id;
      continue;
    end if;
    j:=ai_json(r.content); select string_agg(x->>'text','') into txt from jsonb_array_elements(coalesce(j->'content','[]'::jsonb)) x where x->>'type'='text';
    a:=strpos(coalesce(txt,''),'{'); b:=length(coalesce(txt,''))-strpos(reverse(coalesce(txt,'')),'}')+1;
    j:=case when a>0 and b>a then ai_json(substr(txt,a,b-a+1)) end;
    if j is null then update odb_inbox set status='chyba', err='odpoveď nie je JSON', done_at=now() where id=i.id; continue; end if;
    begin perform odb_apply(i.id,j); n:=n+1;
    exception when others then update odb_inbox set status='chyba', err=left(SQLERRM,250), done_at=now() where id=i.id; end;
  end loop;
  if (select count(*) from odb_inbox where status in ('scan','ok','ziadne','chyba') and tries>0 and at>now()-interval '24 hours')<40 then
    for i in select id from odb_inbox where status='nova' order by at limit 3 loop perform odb_ai_req(i.id); m:=m+1; end loop;
  end if;
  if extract(minute from now())::int % 15 < 5 then begin perform odb_alerts(); exception when others then
    insert into check_err(fn,msg,at) values('odb_alerts',left(SQLERRM,300),now()) on conflict (fn) do update set msg=excluded.msg, at=now(); end; end if;
  return 'vysledky '||n||', ai '||m;
end $$;
revoke all on function public.odb_tick() from public, anon, authenticated;

-- ✓ / ✕ cena na potvrdenie (nový odberateľ sa založí sám)
create or replace function public.odb_navrh_set(p_id bigint, p_ok boolean, p_buyer text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare n odb_navrhy; bid text; nm text; oid bigint; fb boolean; bz text; bzv numeric; k text;
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  select * into n from odb_navrhy where id=p_id and status='caka' for update; if n.id is null then raise exception 'Cena už bola vybavená.'; end if;
  if not p_ok then update odb_navrhy set status='zamietnute', done_at=now() where id=p_id; return jsonb_build_object('ok',true,'status','zamietnute'); end if;
  bid:=coalesce(nullif(p_buyer,''),n.buyer);
  if bid is null or not exists(select 1 from sell_buyers where id=bid) then
    nm:=coalesce(nullif(trim(n.buyer_name),''),'Odberateľ');
    select id into bid from sell_buyers where lower(name)=lower(nm) limit 1;
    if bid is null then
      k:=trim(both '-' from left(regexp_replace(lower(translate(nm,'áäčďéíĺľňóôŕšťúýžőöűüÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽŐÖŰÜ','aacdeillnoorstuyzoouuAACDEILLNOORSTUYZOOUU')),'[^a-z0-9]+','-','g'),30));
      bid:=coalesce(nullif(k,''),'odb')||'-'||substr(md5(random()::text),1,4);
      insert into sell_buyers(id,name,rx,coms,sites,float_burza,model,sort,active)
        values(bid,nm,nullif(array_to_string((select array_agg(w) from (select w from regexp_split_to_table(lower(translate(nm,'áäčďéíĺľňóôŕšťúýžőöűüÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽŐÖŰÜ','aacdeillnoorstuyzoouuAACDEILLNOORSTUYZOOUU')),'[^a-z0-9]+') w where length(w)>=4 and w not in ('kft','zrt','gmbh','spol','s-r-o','sro','group') limit 2) q),'.*'),''),
          array[n.com],'[]'::jsonb,false,'Ceny z ich e-mailov / cenníka (potvrdené Martinom).',200,true);
    end if;
  end if;
  select float_burza into fb from sell_buyers where id=bid;
  bz:=case when fb then case odb_bz(n.com) when 'psenica' then 'psenica_p' when 'soja_usc_bu' then 'soja' else odb_bz(n.com) end end;
  bzv:=case when fb then (select eur_t from market_px where sym=odb_bz(n.com) and eur_t>0) end;
  insert into sell_offers(buyer,com,site,del,price,cur,period,d,bz_sym,bz_val,note,created_by,src,valid_to,src_ref)
    values(bid,n.com,n.site,n.del,n.price,n.cur,n.period,coalesce(n.d,current_date),case when bzv is not null then bz end,bzv,left(concat_ws(' · ',n.note,'potvrdené Martinom'),300),
      'martin',coalesce((select case when kind='web' then 'web' when att_mime ~* 'pdf' then 'pdf' else 'email' end from odb_inbox where id=n.inbox_id),'email'),n.valid_to,n.inbox_id)
    returning id into oid;
  update sell_buyers set coms=case when n.com=any(coalesce(coms,array[]::text[])) then coms else array_append(coalesce(coms,array[]::text[]),n.com) end where id=bid;
  update odb_navrhy set status='ok', offer_id=oid, buyer=bid, done_at=now() where id=p_id;
  return jsonb_build_object('ok',true,'status','ok','buyer',bid,'offer',oid);
end $$;
revoke all on function public.odb_navrh_set(bigint,boolean,text) from public, anon; grant execute on function public.odb_navrh_set(bigint,boolean,text) to authenticated;

-- 🌐 / ✉️ nastavenie odberateľa: verejný cenník (URL) a domény e-mailov
create or replace function public.odb_buyer_set(p_id text, p_url text, p_dom text) returns jsonb language plpgsql security definer set search_path=public as $$
declare u text:=nullif(trim(coalesce(p_url,'')),''); d text[];
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  if u is not null and u !~* '^https?://[^ ]+\.[^ ]+' then raise exception 'Adresa cenníka musí začínať https://'; end if;
  select array_agg(distinct x) into d from (select lower(trim(both ' @' from y)) x from regexp_split_to_table(coalesce(p_dom,''),'[,; ]+') y) q where x ~ '^[a-z0-9.-]+\.[a-z]{2,}$';
  update sell_buyers set price_url=u, mail_dom=d, updated_at=now() where id=p_id;
  if not found then raise exception 'Odberateľ neexistuje.'; end if;
  if u is null then delete from odb_web where buyer=p_id; end if;
  return jsonb_build_object('ok',true,'url',u,'dom',d);
end $$;
revoke all on function public.odb_buyer_set(text,text,text) from public, anon; grant execute on function public.odb_buyer_set(text,text,text) to authenticated;

-- 🤖 pre AI poradcu: najlepšia cena každej komodity (s dátumom, net-backom a porovnaním s nákupom)
create or replace function public.odb_ceny_ai() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare L jsonb:=odb_list(21);
begin
  return (select coalesce(jsonb_object_agg(c, (select jsonb_build_object('odberatel',x->>'b','cena_eur_t',x->'price','parita',x->>'del','miesto',x->>'site','datum',x->>'d','obdobie',x->>'period',
      'net_back_eur_t',x->'net','nasa_doprava_eur_t',x->'dop','nas_cennik_eur_t',x->'our','priemerny_nakup_nepredanych_eur_t',x->'avg','otvorene_t',x->'open_t',
      'marza_voci_nakupu_eur_t',x->'m_avg','neaktualna',(x->>'stale')::boolean,'pracovnych_dni',x->'bd')
      from jsonb_array_elements(L) x where x->>'com'=c and x->>'net' is not null and not (x->>'fwd')::boolean order by (x->>'stale')::boolean, (x->>'net')::numeric desc limit 1)),'{}'::jsonb)
    from (select distinct x->>'com' c from jsonb_array_elements(L) x) q)
    ||jsonb_build_object('poznamka','net_back = cena odberateľa (posunutá s burzou) − naša doprava z regiónu farmárov (vzorec Kalkulačky); neaktualna = cena staršia ako 3 pracovné dni. Mená odberateľov sú dôverné.');
end $$;
revoke all on function public.odb_ceny_ai() from public, anon, authenticated;

-- AI poradca: ai_snapshot dostane časť ceny_odberatelov (doplnenie do aktuálnej definície – nič iné sa nemení)
do $$ declare d text; begin
  d:=pg_get_functiondef('public.ai_snapshot()'::regprocedure);
  if position('ceny_odberatelov' in d)=0 and position($k$'teraz', to_char(now()$k$ in d)>0 then
    d:=replace(d,$k$'teraz', to_char(now()$k$,$k$'ceny_odberatelov', ai_part($q$select public.odb_ceny_ai()$q$),
   'teraz', to_char(now()$k$);
    execute d;
  end if;
end $$;

do $$ begin
  begin perform cron.unschedule('odberatelia'); exception when others then null; end;
  perform cron.schedule('odberatelia','*/5 * * * *','select public.odb_tick()');
end $$;

-- doterajšie ponuky: zdroj
update sell_offers set src=case when created_by='konk' then 'konk' else 'rucne' end where src is null;

insert into app_novinky(d,titul,kde,kto,aud,popis)
select '2026-11-05','🏷️ Ceny odberateľov – evidencia, net-back, automaticky z e-mailov a webu','Cenník → 🏷️ Ceny odberateľov','Martin',array['owner'],
 'Všetky ceny odberateľov na jednom mieste: odberateľ, komodita, cena, parita, miesto, termín, platnosť, zdroj (e-mail, PDF, web, ručne) a dátum. Pri každej cene net-back (cena − naša doprava), porovnanie s naším cenníkom a s priemerným nákupom nepredaných ton. Ceny z e-mailov odberateľov (Gmail erntespol) a z ich webových cenníkov (pracovné dni 6–18 h) vyčíta AI samo; cenu od nového odberateľa alebo nezvyčajnú cenu najprv potvrdíš ✓. Keď net-back prevýši priemerný nákup o 8 €/t a viac pri otvorenej pozícii nad 100 t, príde 💰 „Predaj teraz“; cena staršia ako 3 pracovné dni sa označí ⏳ a príde upozornenie.'
where not exists(select 1 from app_novinky where titul like '🏷️ Ceny odberateľov%');

-- 📐 MODEL NÁKUPNEJ CENY KAŽDÉHO ODBERATEĽA (príkaz majiteľa 5. 11. 07:11): z ich ponúk (sell_offers + Konkurenčné ceny) báza voči burze
-- (MATIF / CBOT) a ICH NÁKUPNÁ CENA DNES = burza dnes + posledná báza; ADM sója DDP Sečovce = CBOT + báza ADM. Bez ponúk na neskorší odber a nad 500 t.
create or replace function public.odb_burza_at(p_sym text, p_d date) returns numeric language sql stable security definer set search_path=public as $$
  select hodnota from trh_data where zdroj=case when p_sym='soja_usc_bu' then 'cbot' else 'matif' end and komodita=case when p_sym='soja_usc_bu' then 'soja' else p_sym end
    and indikator='close' and platne<=p_d and platne>=p_d-5 order by platne desc limit 1 $$;
revoke all on function public.odb_burza_at(text,date) from public, anon, authenticated;

-- hodnota kontraktu RRRR-MM (napr. dnešného kontraktu market_px) v deň ponuky (± dni) – báza sa počíta voči tomu istému kontraktu ako dnes
create or replace function public.odb_kontrakt_at(p_sym text, p_ym text, p_d date) returns numeric language sql stable security definer set search_path=public as $$
  select hodnota from trh_data where zdroj=case when p_sym='soja_usc_bu' then 'cbot' else 'matif' end and komodita=case when p_sym='soja_usc_bu' then 'soja' else p_sym end
    and indikator='kontrakt '||p_ym and platne between p_d-5 and p_d+1 order by abs(platne-p_d), platne desc limit 1 $$;
revoke all on function public.odb_kontrakt_at(text,text,date) from public, anon, authenticated;

create or replace function public.odb_models() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare k jsonb; res jsonb;
begin
  select data->'items' into k from kalk_store where path='pricelist' and id='konk';
  with b as (select * from sell_buyers where active),
  mp as (select sym, to_char(mk_term(contract),'YYYY-MM') ym from market_px where eur_t>0 and mk_term(contract) is not null),
  so as (select o.buyer bid, o.com, upper(o.del) del, coalesce(nullif(o.site,''),'') site, coalesce(o.period,'') per, o.d, o.price,
           coalesce(o.price-odb_kontrakt_at(odb_bz(o.com),(select ym from mp where mp.sym=odb_bz(o.com)),o.d),
             case when o.bz_val is not null then o.price-o.bz_val else o.price-odb_burza_at(odb_bz(o.com),o.d) end) bas, coalesce(o.src,'rucne') src
         from sell_offers o join b on b.id=o.buyer where o.d>=current_date-180 and o.price>0),
  ko as (select b.id bid, i->>'com' com, upper(coalesce(nullif(i->>'del',''),'DAP')) del,
           coalesce(nullif(i->>'place',''),case when coalesce(i->>'who','') ~* 'hamburg|z[aá]pad' then 'Hamburg (západ)' else '' end) site,
           coalesce(i->>'term','') per, (i->>'d')::date d, (i->>'price')::numeric price,
           coalesce((i->>'price')::numeric-odb_kontrakt_at(odb_bz(i->>'com'),(select ym from mp where mp.sym=odb_bz(i->>'com')),(i->>'d')::date),
             case when (i->>'b') ~ '^-?[0-9.]+$' then (i->>'b')::numeric end,
             case when (i->>'bz') ~ '^[0-9.]+$' and (i->>'bz')::numeric>0 then (i->>'price')::numeric-(i->>'bz')::numeric end,
             (i->>'price')::numeric-odb_burza_at(odb_bz(i->>'com'),(i->>'d')::date)) bas,
           'konk' src
         from jsonb_array_elements(coalesce(k,'[]'::jsonb)) i join b on coalesce(b.rx,'')<>'' and coalesce(i->>'who','') ~* odb_rx(b.rx)
         where (i->>'price') ~ '^[0-9.]+$' and (i->>'d') ~ '^\d{4}-\d\d-\d\d$' and (i->>'d')::date>=current_date-180),
  a0 as (select * from so union all select * from ko),
  -- iba dnešný odber: bez „odber …“, „nad 500 t“ a dodávok v ďalšom roku / štvrťroku
  a as (select distinct on (bid,com,del,site,d,price) * from a0
        where com is not null and per !~* '(odber\s*[0-9]|nad\s*500|[1-4]\s*q|q\s*/|/\s*2[7-9]\M|202[7-9])'
        order by bid,com,del,site,d,price,src),
  g as (select a.bid, a.com, a.del, a.site, count(*) n, max(a.d) d_last,
          (array_agg(a.price order by a.d desc))[1] p_last,
          (array_agg(a.bas order by a.d desc) filter (where a.bas is not null))[1] b_last,
          (array_agg(a.d order by a.d desc) filter (where a.bas is not null))[1] b_d,
          (array_agg(a.bas order by a.d desc) filter (where a.bas is not null))[2] b_prev,
          round(avg(a.bas) filter (where a.bas is not null and a.d>=current_date-45),2) b_avg45,
          (array_agg(a.src order by a.d desc))[1] src
        from a group by 1,2,3,4)
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'fb',b.float_burza,'par',b.parita,'model',b.model,'basis',to_jsonb(b)->'basis',
      'g',(select coalesce(jsonb_agg(jsonb_build_object('com',g.com,'del',g.del,'site',g.site,'n',g.n,'d',g.d_last,'age',current_date-g.d_last,'p_last',g.p_last,
            'b',round(g.b_last,2),'b_d',g.b_d,'b_prev',round(g.b_prev,2),'b_avg45',g.b_avg45,'src',g.src,
            'sym',odb_bz(g.com),'kontrakt',m.contract,'px',m.eur_t,'px_d',m.quote_date,
            'dnes',case when g.b_last is not null and m.eur_t is not null then round(m.eur_t+g.b_last,2) end) order by g.com,g.del,g.site),'[]'::jsonb)
         from g left join market_px m on m.sym=odb_bz(g.com) and m.eur_t>0 where g.bid=b.id),
      'chyba',(select coalesce(jsonb_agg(c order by c),'[]'::jsonb) from unnest(coalesce(b.coms,array[]::text[])) c where not exists(select 1 from g where g.bid=b.id and g.com=c)))
    order by b.sort, b.name),'[]'::jsonb) into res from b;
  return res;
end $$;
revoke all on function public.odb_models() from public, anon, authenticated;

-- odb_ceny (Cenník → 🏷️ Ceny odberateľov) + modely
create or replace function public.odb_ceny() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not price_main() then raise exception 'Iba Martin.'; end if;
  return jsonb_build_object('items',odb_list(45),'models',odb_models(),
    'navrhy',(select coalesce(jsonb_agg(to_jsonb(n) order by n.at desc),'[]'::jsonb) from odb_navrhy n where n.status='caka'),
    'inbox',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'kind',i.kind,'b',(select name from sell_buyers where id=i.buyer),'from',i.from_addr,'subj',i.subject,'at',i.at,'rc',i.received,
        'status',i.status,'ok',i.n_ok,'wait',i.n_wait,'err',i.err) order by i.at desc),'[]'::jsonb) from (select * from odb_inbox order by at desc limit 12) i),
    'buyers',(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'url',b.price_url,'dom',b.mail_dom,'web',(select jsonb_build_object('ok_at',w.ok_at,'err',w.err) from odb_web w where w.buyer=b.id)) order by b.sort,b.name),'[]'::jsonb)
      from sell_buyers b where b.active),
    'ping',(select value from ai_state where key='odb_mail_ping'),
    'has_key',exists(select 1 from ai_state where key='zuct_inbox_key'));
end $$;
revoke all on function public.odb_ceny() from public, anon; grant execute on function public.odb_ceny() to authenticated;

-- AI poradca: aj modely odberateľov (ich nákupná cena dnes)
create or replace function public.odb_ceny_ai() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare L jsonb:=odb_list(21);
begin
  return (select coalesce(jsonb_object_agg(c, (select jsonb_build_object('odberatel',x->>'b','cena_eur_t',x->'price','parita',x->>'del','miesto',x->>'site','datum',x->>'d','obdobie',x->>'period',
      'net_back_eur_t',x->'net','nasa_doprava_eur_t',x->'dop','nas_cennik_eur_t',x->'our','priemerny_nakup_nepredanych_eur_t',x->'avg','otvorene_t',x->'open_t',
      'marza_voci_nakupu_eur_t',x->'m_avg','neaktualna',(x->>'stale')::boolean,'pracovnych_dni',x->'bd')
      from jsonb_array_elements(L) x where x->>'com'=c and x->>'net' is not null and not (x->>'fwd')::boolean order by (x->>'stale')::boolean, (x->>'net')::numeric desc limit 1)),'{}'::jsonb)
    from (select distinct x->>'com' c from jsonb_array_elements(L) x) q)
    ||jsonb_build_object('modely_odberatelov',(select coalesce(jsonb_agg(jsonb_build_object('odberatel',m->>'name','posuva_sa_s_burzou',m->'fb',
          'komodity',(select jsonb_agg(jsonb_build_object('komodita',g->>'com','parita',g->>'del','miesto',g->>'site','baza_voci_burze',g->'b','burza_dnes',g->'px','ich_cena_dnes',g->'dnes','posledna_ponuka',g->>'d','ponuk',g->'n')) from jsonb_array_elements(m->'g') g))),'[]'::jsonb)
        from jsonb_array_elements(odb_models()) m where jsonb_array_length(m->'g')>0),
      'poznamka','net_back = cena odberateľa (posunutá s burzou) − naša doprava z regiónu farmárov (vzorec Kalkulačky); neaktualna = cena staršia ako 3 pracovné dni; ich_cena_dnes = burza dnes + báza z ich poslednej ponuky. Mená odberateľov sú dôverné.');
end $$;
revoke all on function public.odb_ceny_ai() from public, anon, authenticated;
