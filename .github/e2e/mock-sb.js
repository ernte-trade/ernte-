// Náhradná databáza pre automatickú kontrolu pred zverejnením (nič sa neposiela do ozajstnej databázy).
// Všetky údaje sú VYMYSLENÉ – žiadne skutočné mená, ceny ani obchody.
// Rola sa nastaví cez window.__ROLE = {kind:"staff"|"farmer", staff:{…}}.
(()=>{
const R=window.__ROLE||{kind:"staff"},d0=new Date(),iso=o=>{const d=new Date(d0);d.setDate(d.getDate()+o);return d.toISOString().slice(0,10)};
const FARMER={id:"f-demo",name:"Demo Farma s.r.o.",email:"demo.farmar@example.com",phone:"+421 900 000 000",addr:"Hlavná 1, 040 01 Košice",active:true};
const T={
 staff:R.kind==="staff"&&R.staff?[R.staff]:[],staff_cfg:[],
 farmers:[FARMER,{id:"f2",name:"Test Agro 2"},{id:"f3",name:"Test Agro 3"}],
 prices:[["repka",400],["soja",380],["psenica_p",180],["psenica_k",170],["jacmen_k",160],["kukurica",170],["lo",380]].map(([com,price])=>({com,price,updated_at:d0.toISOString()})),
 settings:[{key:"pricelist",value:{valid:iso(5)}},{key:"contact",value:{phone:"+421 900 000 001",email:"demo@example.com"}}],
 deals:[{id:"d1",no:"T2026/1",farmer_id:"f-demo",com:"kukurica",tons:100,price:170,delivered_t:0,status:"navrh",term:"30. 11. 2026",created_at:d0.toISOString()},
  {id:"d2",no:"T2026/2",farmer_id:"f-demo",com:"psenica_p",tons:200,price:180,delivered_t:50,status:"odvoz",term:"15. 11. 2026",created_at:new Date(d0-6*864e5).toISOString()}],
 requests:[{id:"r1",farmer_id:"f-demo",kind:"sell",com:"soja",tons:50,price:380,status:"v_spracovani",created_at:new Date(d0-3600e3).toISOString()}],
 trips:[{id:"t1",deal_id:"d2",spz:"XX 000 AA",driver:"Vodič Test",day:iso(1),time:"07:00",status:"naplanovana",netto:null}]
};
// flotila (vymyslené): 2 autá Región, 1 ťahač EU spárovaný so zoznamom áut Doprava, 1 nespárovaná GPS jednotka
{const ts=m=>new Date(d0-m*6e4).toISOString(),m0=new Date(d0.getFullYear(),d0.getMonth(),1,8).toISOString();
 T.cmd_vehicles=[{id:"v1",fleet:"region",plate:"XX111AA",name:"Sklápač Test 1",lat:48.75,lon:21.9,gps_at:ts(5),speed:0,ign:0,tank:300},
  {id:"v2",fleet:"region",plate:"XX222BB",name:"Sklápač Test 2",lat:48.7,lon:21.8,gps_at:ts(3),speed:45,ign:1,tank:250},
  {id:"v3",fleet:"eu",plate:"XX333CC",name:"Ťahač Test 3",lat:48.2,lon:20.5,gps_at:ts(2),speed:82,ign:1,tank:600},
  {id:"9000001",fleet:"region",name:"9000001",pair_state:"nesparovane",lat:48.7,lon:21.8,gps_at:ts(600)}];
 T.trucks=[{no:"1",spz:"XX 111AA",cmd_id:"v1",driver:"Vodič Test"},{no:"3",spz:"XX333CC",cmd_id:"v3",driver:"Vodič Test 3"}];
 T.fleet_cfg=[{key:"costs",value:{fixed:140000,rate:1.5,diesel:1.952,toll:0.2677,share:100}}];
 T.rides=[{ride_id:"rt1",vehicle_id:"v1",plate:"XX111AA",driver:"Vodič Test",start_at:m0,stop_at:m0,distance:180,fuel_consumed:60,fuel_start:300,fuel_stop:240,max_speed:85,start_addr:"Košice",stop_addr:"Michalovce"},
  {ride_id:"rt2",vehicle_id:"v2",plate:"XX222BB",driver:"Vodič Test 2",start_at:ts(90),stop_at:ts(30),distance:95,fuel_consumed:33,fuel_start:283,fuel_stop:250,max_speed:80,start_addr:"Trebišov",stop_addr:"Zbudza"}];
 T.doprava_obj=[{id:1,created_at:ts(3000),firma:"valko",zakaznik:"Firma Test s.r.o.",odkial:"Obec Test A",kam:"Falu Test B, Magyarország",komodita:"kukurica",tony:25,cena_typ:"t",cena:18,km:120,km_spat:120,naklad_km:1.6,nakladka:new Date(Date.now()+864e5).toISOString(),vykladka:null,auto:"XX 000 AA",vodic:"Vodič Test",stav:"nova",pozn:"vymyslená objednávka"},{id:2,created_at:ts(9000),firma:"danube",zakaznik:"Teszt Kft.",odkial:"Falu Test C",kam:"Obec Test D",komodita:"trus",tony:24,cena_typ:"km",cena:1.5,km:90,km_spat:0,naklad_km:1.6,nakladka:ts(2000),stav:"dorucena"}];
 T.fleet_events=[{id:901,vehicle_id:"v1",plate:"XX111AA",kind:"fuel_drop",at:ts(200),t_from:ts(400),t_to:ts(100),liters:48,lvl_from:300,lvl_to:252,place:"Dvor Test",note:"státie · hladina ustálená 300 → 252 l · čistý pokles 48 l · motor bežal 0,5 h → voľnobeh ≈ 2 l · 4 krokov snímača zlúčených do jednej udalosti",src_key:"stp:v1:1",st:"novy"},
  {id:902,vehicle_id:"v2",plate:"XX222BB",kind:"fuel_drop",at:ts(210),liters:40,flag:"chyba_dat",flag_note:"podozrenie na chybu dát – rovnaký pokles v rovnakom čase (±20 min) na 3 autách; bez € a bez upozornenia",src_key:"stp:v2:1"}];
 T.pos_log=[{vehicle_id:"v3",at:ts(1),lat:48.2,lon:20.5,speed:82}];}
function Q(tab){let rows=(T[tab]||[]).slice(),single=false;const q={
  select(){return q},eq(k,v){rows=rows.filter(r=>r[k]===undefined||r[k]===v);return q},neq(){return q},gte(){return q},lte(){return q},lt(){return q},gt(){return q},in(){return q},is(){return q},ilike(){return q},like(){return q},or(){return q},not(){return q},filter(){return q},contains(){return q},match(){return q},textSearch(){return q},
  order(){return q},limit(){return q},range(){return q},returns(){return q},csv(){return q},
  maybeSingle(){single=true;return q},single(){single=true;return q},
  insert(){return q},update(){return q},upsert(){return q},delete(){return q},
  then(ok,er){return Promise.resolve({data:single?(rows[0]||null):rows,error:null,count:rows.length}).then(ok,er)}};return q}
const ch={on(){return ch},subscribe(cb){try{cb&&cb("SUBSCRIBED")}catch(e){}return ch},unsubscribe(){},send(){}};
const user={id:"u-test",email:R.kind==="farmer"?FARMER.email:((R.staff&&R.staff.email)||"test@example.com")};
// 📈 Trh a predpoveď (vymyslené čísla)
const TRH=(()=>{const rady={},pred=[],B={repka:520,psenica:225,kukurica:200,soja:400};
 for(const k in B){let v=B[k];rady[k]=[];for(let i=120;i>=1;i--){const d=new Date(d0);d.setDate(d.getDate()-i);if(d.getDay()%6===0)continue;v=v*(1+Math.sin(i*1.7+v)*0.008);rady[k].push([d.toISOString().slice(0,10),Math.round(v*100)/100])}
  const c0=rady[k][rady[k].length-1][1],kd=rady[k][rady[k].length-1][0];
  [["1t",5,7,.03],["1m",21,30,.07],["3m",63,91,.12]].forEach(([h,dn,kal,w],j)=>{const t=new Date(kd);t.setDate(t.getDate()+kal);
   pred.push({komodita:k,horizont:h,dni:dn,k_dnu:kd,cielovy_den:t.toISOString().slice(0,10),cena0:c0,p10:c0*(1-w),p50:c0*(1+.004*j),p90:c0*(1+w),p_hore:.52+.03*j,smer:j?"hore":"bokom",kontrakt:"2027-02",
    metoda:"krátka história (5 dní) – predpokladaná volatilita 1,3 %/deň (~20 %/rok)",signaly:{carry_pct:.4,cot_pct:-.25,cot_mm_net_oi:22.4,sezona_pct:0,sezona_rokov:0,pocasie_pct:.3,pocasie_rizika:1,eurusd:1.1131,eurusd_1m_pct:-.8,posun_pct:.45}})})}
 return {rady,pred,skore:{repka:{n:12,zasah_pct:50,mae:9.4,mae_naiv:9.1,brier:.251,brier_naiv:.25,pasmo_pct:83.3,porazi:false},spolu:{n:40,zasah_pct:47.5,mae:7.2,mae_naiv:7.0,brier:.252,brier_naiv:.25,pasmo_pct:80,porazi:false}},
  odpor:{repka:"model neporáža trh – len informácia",psenica:"model neporáža trh – len informácia",kukurica:"model neporáža trh – len informácia",soja:"model neporáža trh – len informácia"},
  kal:[{at:iso(3)+" 14:30",kod:"export_sales",nazov:"USDA Export Sales"},{at:iso(4)+" 21:30",kod:"cot",nazov:"CFTC COT (pozície fondov)"},{at:iso(8)+" 18:00",kod:"wasde",nazov:"USDA WASDE – mesačná svetová bilancia ponuky a dopytu po obilninách a olejninách"}],
  wasde:{d:iso(-24),txt:"WASDE 9. 10. 2026: pšenica 2026/27: svetové konečné zásoby 271,4 mil. t (−1,2 oproti min. mesiacu); kukurica 2026/27: svetové konečné zásoby 290,1 mil. t (+0,8 oproti min. mesiacu); sója 2026/27: svetové konečné zásoby 123,0 mil. t (+0,0 oproti min. mesiacu)"},
  zdroje:[{kod:"matif",nazov:"Euronext MATIF – repka, pšenica, kukurica (závery + krivka kontraktov)",frek:"denne 18:45 (prac. dni)",stav:"ok",posledne:d0.toISOString(),data:iso(-1),lic:"z bota Trhové ceny",url:"https://example.com"},
   {kod:"wasde",nazov:"USDA WASDE – svetová bilancia (CSV)",frek:"mesačne",stav:"nedostupné",msg:"CSV WASDE sa nepodarilo stiahnuť ani rozpoznať (adresa sa mohla zmeniť) – žiadne údaje sa nevymýšľajú",lic:"USDA – verejná doména",url:"https://example.com"},
   {kod:"ecb",nazov:"ECB – EUR/USD, EUR/HUF referenčné kurzy",frek:"denne",stav:"chyba",vypadok:d0.toISOString(),msg:"URLError: timed out",lic:"ECB",url:"https://example.com"},
   {kod:"igc",nazov:"IGC Grain Market Report",frek:"mesačne",stav:"iba odkaz",msg:"iba odkaz – plný report je predplatné",lic:"iba odkaz",url:"https://example.com"}],
  otvorene:{repka:{t:500,hodnota:215000,n:2},psenica:{t:1250.5,hodnota:237000,n:4},ine:{t:80,n:1}},
  backtest:{at:d0.toISOString(),poznamka:"Spätný test beží iba nad históriou v databáze (od 29. 10. 2026, 3 obchodné dni). Dlhšia história od 2015 (AHDB) sa bez súhlasu poskytovateľa nepoužíva.",vysledok:{repka:{"1t":{n:0},"1m":{n:0},"3m":{n:0}}}},
  rano:{at:d0.toISOString()}}})();
const SALE={sales:[{id:"s1",no:"PZ2026/1",buyer:"Veľmi Dlhý Názov Odberateľa Agrokomodity Medzinárodná Obchodná Spoločnosť s.r.o.",ico:"00000000",com:"kukurica",tons:300,price:205.5,parity:"DAP",dop:12,term:"1.–15. 12. 2026",delivered_t:40,status:"dodava",note:"Vymyslená poznámka na test dlhého textu, ktorý sa musí zalomiť a nesmie pretiecť doprava.",archived:false,
   alloc:[{deal_id:"d1",no:"T2026/1",farmer:"Demo Farma s.r.o.",com:"kukurica",tons:100,buy:170,status:"navrh",live:false,m_t:23.5,m_eur:2350}]},
  {id:"s2",no:"PZ2026/2",buyer:"Odberateľ Test",com:"psenica_p",tons:150,price:210,parity:"FCA",dop:0,delivered_t:0,status:"podpisana",archived:false,alloc:[]},
  {id:"s3",no:"PZ2026/0",buyer:"Starý Odberateľ",com:"repka",tons:50,price:450,parity:"FCA",dop:0,delivered_t:50,status:"zaplatena",archived:true,alloc:[]}],
 deals:[{id:"d2",no:"T2026/2",farmer:"Demo Farma s.r.o.",com:"psenica_p",tons:200,price:180,status:"odvoz",alloc_t:0}],buyers:[{id:"b1",name:"Odberateľ Test"}],
 sum:{pozicie:{psenica_p:{komodita:"Pšenica potravinárska",nakupene_t:200,predane_t:150,sparovane_t:0,marza_sparovane_eur:0,nakupene_nepredane_t:200,nepredane_priemer_nakup_eur_t:180,predane_nenakupene_t:150,nenakupene_priemer_predaj_eur_t:210,otvorena_t:50,cena_eur_t:195,cena_zdroj:"MATIF pšenica Mar 2027",hodnota_eur:9750},
   kukurica:{komodita:"Kukurica",nakupene_t:900,predane_t:300,sparovane_t:0,marza_sparovane_eur:0,nakupene_nepredane_t:900,nepredane_priemer_nakup_eur_t:170,predane_nenakupene_t:300,nenakupene_priemer_predaj_eur_t:193.5,otvorena_t:600,cena_eur_t:190,cena_zdroj:"MATIF kukurica Mar 2027",hodnota_eur:114000}},
  spolu:{otvorena_t:650,hodnota_eur:123750,marza_sparovane_eur:0},eurusd:1.08}};
const TRD={on:true,name:"Demo Obchod s.r.o. – obchodná firma s veľmi dlhým názvom",c1:"#0b4ea2",c2:"#f5b301",logo:null,lang:"sk",kontakt:{meno:"Martin Test",tel:"+421 900 000 000"},km:140,prirazka:7.68,
  ceny:[{com:"repka",cena:516},{com:"soja",cena:455},{com:"kukurica",cena:222},{com:"psenica_p",cena:182}],burza:[{sym:"repka",name:"MATIF repka",eur_t:546.25,kontrakt:"feb 2027",d:iso(-1)},{sym:"soja_usc_bu",name:"CBOT sója",eur_t:399.59,kontrakt:"jan 2027",d:iso(-1)}]};
const NUB={b:"Odberateľ Test s veľmi dlhým názvom firmy",del:"DAP",site:"Miesto dodania s dlhým názvom",bas:-12,bas_d:iso(0),age:0,price:504,dop:12.4,net:491.6};
const NU={at:d0.toISOString(),items:[{com:"repka",price:466,dod:"júl–aug 2027",y:2027,kon:"MATIF repka aug 2027"},{com:"ho",price:489,dod:"sep–okt 2027",y:2027,kon:"MATIF repka nov 2027"},{com:"psenica_p",price:181,dod:"júl–aug 2027",y:2027,kon:"MATIF pšenica sep 2027"},{com:"kukurica",price:193,dod:"okt–nov 2027",y:2027,kon:"MATIF kukurica nov 2027"},{com:"soja",price:457,dod:"sep–okt 2027",y:2027,kon:"CBOT sója nov 2027"}]};
const NUG={at:d0.toISOString(),m:10,buf:5,rmax:5,cfg:{},items:{repka:{y:2027,kon:"MATIF repka aug 2027",dod:"júl–aug 2027",nc:516,nc_d:iso(-1),spr:-13,px:529,px_k:"feb 2027",calc:476,pub:466,m:10,buf:5,best:NUB,opts:[NUB,{b:"Druhý odberateľ",del:"DDP",site:"Vzdialené miesto",bas:-18,bas_d:iso(-2),age:2,price:498,dop:55,net:443},{b:"Tretí",del:"FCA",site:null,bas:-21,bas_d:iso(-3),age:3,price:495,dop:0,net:495}]},
 soja:{y:2027,kon:"CBOT sója nov 2027",dod:"sep–okt 2027",nc:391.2,nc_d:iso(-1),spr:-3.1,px:394.3,px_k:"jan 2027",calc:466,pub:457,pend:{p:466,at:d0.toISOString()},m:10,buf:5,best:{b:"Tretí",del:"FCA",site:null,bas:90,bas_d:iso(-6),age:6,price:481.2,dop:0,net:481.2},opts:[]},
 kukurica:{y:2027,kon:"MATIF kukurica nov 2027",dod:"okt–nov 2027",nc:null,nc_d:null,spr:null,px:248.25,px_k:"mar 2027",calc:193,pub:193,m:10,buf:5,best:null,opts:[]}}};
const RPC={sales_leads_list:()=>({L:[{id:501,company:"Test Futter GmbH",country:"DE",lang:"de",city:"Testdorf",email:"einkauf@test-futter.example",kind:"ponuka",com:"kukurica",why:"Testovací návrh",subj_sk:"Ponuka kukurice",body_sk:"Dobrý deň,\n\nponúkame kukuricu (test).",subj_loc:"Angebot Mais",body_loc:"Guten Tag,\n\nwir bieten Mais an (Test).",status:"navrh",created_at:d0.toISOString()}],state:{},reply_to:"ernte@ernte.sk"}),
 sales_lead_draft:()=>({id:501,od:"ernte@ernte.sk",komu:"einkauf@test-futter.example",predmet:"Angebot Mais",text:"Guten Tag,\n\nwir bieten Mais an (Test).\n\n--\nAbmelden: STOP",lang:"de"}),
 sales_lead_sent_manual:()=>"ok",mail_box_add:()=>1,
 sell_data:()=>({buyers:[{id:"ta",name:"Odberateľ Test A",rx:"test a",coms:["kukurica","repka"],sites:[{n:"Miesto A",ke:[60,60,0,0],po:[90,90,0,0],rx:"miesto a"}],parita:"FCA",float_burza:false,sort:1,active:true},
   {id:"tb",name:"Odberateľ Test B s veľmi dlhým názvom obchodnej spoločnosti",rx:"test b",coms:["kukurica","psenica_p"],sites:[{n:"Sklad B1",ke:[80,80,0,0],rx:"b1"},{n:"Sklad B2 nad Ondavou",ke:[120,120,0,0],rx:"b2"}],float_burza:true,sort:2,active:true}],
  offers:[{id:11,buyer:"ta",com:"kukurica",del:"DDP",site:"Miesto A",price:215,d:iso(0)},{id:12,buyer:"tb",com:"kukurica",del:"DAP",site:"Sklad B1",price:230,d:iso(-1),bz_sym:"kukurica",bz_val:246},
   {id:13,buyer:"tb",com:"kukurica",del:"FCA",site:null,price:220,period:"odber 1.–3. 2027",d:iso(-1)},{id:14,buyer:"ta",com:"repka",del:"DDP",site:"Miesto A",price:505,d:iso(-30),note:"veľmi dlhá poznámka k cene, ktorá sa musí zalomiť a nesmie pretŕčať doprava"}]}),
 sell_offer_off:()=>({ok:true}),sell_offer_back:()=>({ok:true}),
 ospl_list:()=>({buyers:[{id:"ta",name:"Odberateľ Test A",coms:["kukurica","repka"],parita:"FCA"},{id:"tb",name:"Odberateľ Test B s veľmi dlhým názvom obchodnej spoločnosti",coms:["kukurica","psenica_p"],parita:"DAP"},{id:"tc",name:"Odberateľ Test C",coms:[]}],
  spol:[{id:1,buyer:"ta",status:"schvalena",nazov:"Spolupráca Odberateľ Test A 2026/27",src:"claude",ok_at:d0.toISOString(),p:{koms:["kukurica"],parita:"FCA",miesto:"FCA u farmára",doprava:"zabezpečí odberateľ",cena:"cennik",cena_txt:"podľa cenníka",platba:14,tol:5,vazenie:"Váha odberateľa je záväzná.",reklam:3,lab:"Laboratórium Test",kvalita:{kukurica:{vlh:14,nec:2,ine:"Non-GMO; zlomky max. 3 %"}},zrazky:"Váhová zrážka.",cert:"GMP+",iscc:false,platnost:"30. 6. 2027"},text:""},
   {id:2,buyer:"tb",status:"navrh",nazov:"Spolupráca Odberateľ Test B 2026/27",src:"claude",p:{koms:["kukurica","psenica_p"],parita:"DAP",miesto:"Sklad B1",cena:"burza",platba:30,tol:3,kvalita:{kukurica:{vlh:14,nec:2,ine:""},psenica_p:{vlh:14,nec:2,ine:"bielkoviny min. 12,5 %"}},iscc:true},text:"Dobrý deň, posielame návrh (test)."}],
  vzory:[{id:5,spol_id:1,buyer:"ta",verzia:1,status:"schvaleny",t:{miesto:"FCA sklady Dodávateľa",platba:14,tol:5,vyzva:10,pokuta:20,gmp:true,iscc:true,x:{kukurica:[["Požiadavka","Non-GMO"],["Zlomky","max. 3 %"]]},osobitne:["Vážny lístok do 2 dní (test)."]}},
   {id:6,spol_id:1,buyer:"ta",verzia:2,status:"navrh",t:{miesto:"FCA sklady Dodávateľa",platba:14,tol:4,vyzva:10,pokuta:20,x:{},osobitne:[]}}],pouzite:{"5":1}}),
 hladaj:()=>[{g:"Zmluvy s farmármi",k:"deal",id:"d1",tab:"deals",t:"T2026/1 · Demo Farma s.r.o.",s:"kukurica · 100 t"},{g:"Odberatelia",k:"buyer",id:"ta",tab:"home",t:"Odberateľ Test A",s:"kukurica"},{g:"Funkcie – kde to nájdeš",k:"fn",id:1,t:"🤝 Spolupráca s odberateľmi a vzory zmlúv pre farmárov",s:"Zmluvy → Obchody → 🤝 Spolupráca s odberateľmi"}],
 ospl_new:()=>({ok:true,id:2}),ospl_save:()=>({ok:true}),ospl_set:()=>({ok:true,vzor:6}),ospl_del:()=>({ok:true}),ospl_vzor_save:()=>({ok:true,id:6}),ospl_vzor_ok:()=>({ok:true}),
 ospl_vzory:()=>[{id:5,buyer:"ta",name:"Odberateľ Test A",coms:["kukurica"],verzia:1,t:{miesto:"FCA sklady Dodávateľa",platba:14,tol:5,vyzva:10,pokuta:20,gmp:true,iscc:true,x:{kukurica:[["Zlomky","max. 3 %"]]},osobitne:["Bod test."]}}],
 deal_vzor_map:()=>({d1:{vzor:5,buyer:"ta",name:"Odberateľ Test A",t:{platba:14,tol:5,vyzva:10,pokuta:20,osobitne:["Bod test."]}}}),deal_vzor_set:()=>({ok:true}),deal_zmluva_t:()=>null,
 sell_offers_old_list:()=>[{id:9,buyer:"ta",b:"Odberateľ Test A",com:"kukurica",d:iso(-1),price:230,del:"FCA",site:null,off_at:d0.toISOString(),why:"nahradená novšou cenou: DDP Miesto A 215 €/t"}],
 mail_box_list:()=>({items:[{k:"mb1",firma:"ernte",smer:"odoslane",od:"ernte@ernte.sk",komu:"einkauf@test-futter.example",predmet:"Angebot Mais",text:"Guten Tag (Test)",at:d0.toISOString(),zdroj:"navrh_ai",stav:"odoslane"},
   {k:"mj1",firma:"valko",smer:"odoslane",od:"aplikácia · valko-logistics.sk",komu:"test@valko.example",predmet:"Týždenný súhrn – Doprava (test)",text:"PDF",at:d0.toISOString(),zdroj:"tyzden",stav:"zdielane",prilohy:["Súhrn.pdf"]},
   {k:"lr1",firma:"ernte",smer:"prijate",od:"Test Klaus <k@test.example>",komu:"erntespol@gmail.com",predmet:"Re: Angebot",text:"Danke (Test)",at:d0.toISOString(),zdroj:"gmail",stav:"nova"}],counts:{"ernte:odoslane":1,"valko:odoslane":1,"ernte:prijate":1}}),
mg_list:()=>{const tx=[{id:"TEST/0001",d:iso(-3),com:"kukurica",spz:"TT 000AA",t:24.9,tc:25.2,imp:2,moist:15.1,vc:14,ded_kg:300,phys_kg:322,km:120,km_src:"gps",eur:192,eur_t:7.71,price:150,bv:3735,fa:null},
   {id:"TEST/0002",d:iso(-2),com:"kukurica",spz:"TT 001AA",t:24.4,tc:24.4,imp:1,moist:13.2,vc:14,ded_kg:null,phys_kg:0,km:null,km_src:null,eur:null,eur_t:null,price:150,bv:3660,fa:null}];
  const g=[{com:"kukurica",n:2,t:49.3,tc:49.6,vw:14.17,vc:14,tv:49.6,bez_v:0,loss_w:98,loss_l:322,loss_kg:98,met:"tyzden",ded_kg:300,ndk:1,diff_kg:202,p:150,claims:[{typ:"vlhkost",kg:202,eur:30.3}]}];
  const tot={n:1,km:120,eur:192,t:24.9,eur_t:7.71,pausal:234.06,vsetky:2};
  return {main:true,cfg:{prem:3,r_km:200,ekm:1.6,tol_ded:20,fr_std:9.4,ret:2,fr_mode:"gps",metoda:"tyzden",email:"",buyer:{n:"Test Odberateľ s.r.o.",a:"",id:"",vat:"",grp:"skupina Test"},geo:{"testfalu":[48.4,21.8,"SK"]}},
   tix:tx,weeks:[{w:"2026-W45",g,tot}],sc:[{id:"s-test",no:"PT2026/1",com:"kukurica",tons:100,price:150,parity:"FCA",term:"12/2026",delivered_t:49.3}],
   docs:[{id:11,kind:"faktura",ref:"2026-W45",title:"Faktúra Test · 2026-W45",stav:"caka",suma:7500.5,price:159.4,floor:165,created_at:d0.toISOString(),created_by:"systém",data:{floor_ok:false,ships:tx,lines:[{com:"kukurica",p:150,pf:159.4,n:2,t:49.3,tc:49.6,qty:49.502,loss_kg:98,vw:14.17,vc:14,eur:7425.3,floor:165,floor_ok:false,d0:iso(-3),d1:iso(-2)}],frt:{km:120,eur:192,t:24.9,n:1,pausal:234.06,eur_t:7.71,mode:"gps"},fe:192,goods:7425.3,total:7617.3,odb:7395,ekm:1.6,frs:9.4,metoda:"tyzden",miss:0}},
    {id:12,kind:"audit",ref:"2026-W45",title:"Týždenný audit vlhkosti Test · 2026-W45",stav:"caka",suma:30.3,created_at:d0.toISOString(),created_by:"systém",data:{claims:1,g,ships:tx,metoda:"tyzden",told:20}},
    {id:13,kind:"doprava",ref:"2026-W44",no:"VALKO-AS-2026-W44",title:"Vyúčtovanie dopravy Test · 2026-W44",stav:"schvalene",ok_at:d0.toISOString(),suma:192,created_at:d0.toISOString(),created_by:"ernte@ernte.sk",data:{ships:[tx[0]],tot,ekm:1.6,frs:9.4,ret:2}}],
   bench:{r_km:200,prem:3,fr_std:9.4,com:{kukurica:{com:"kukurica",floor:165,floor_fca:155.6,max:162,prem:3,n:2,best:{who:"Odberateľ Test A",site:"Testfalu",del:"DAP",price:168,pnow:168,fca:162,rkm:30,dop:6},
     rows:[{src:"odberateľ",who:"Odberateľ Test A",site:"Testfalu",del:"DAP",price:168,pnow:168,fl:false,rkm:30,dop:6,fca:162,d:iso(-1),per:"",inr:true},{src:"konkurencia",who:"Konkurent Test B s veľmi dlhým menom firmy",site:null,del:"FCA",price:149,pnow:149,fl:false,rkm:0,dop:0,fca:149,d:iso(-2),per:"",inr:true},{src:"odberateľ",who:"Odberateľ Test C",site:"Ďaleko",del:"DDP",price:190,pnow:190,fl:true,rkm:null,dop:null,fca:null,d:iso(-3),per:"",inr:false,why:"chýba poloha miesta"}]}}}}},
 mg_rides:()=>[{id:"r1",plate:"TT 000AA",start:d0.toISOString(),stop:d0.toISOString(),from:"Obec Test A",to:"Falu Test B",km:29.5,sug:true}],
fx_get:()=>({d:iso(-1),prev_d:iso(-2),src:"ECB",rates:{HUF:385.12,CZK:24.31,USD:1.15},prev:{HUF:384.3}}),audit_list:()=>({n:1234,open:0,from:iso(-30),tbls:{deals:40,prices:12,deliveries:300},rows:[
  {id:3,at:d0.toISOString(),tbl:"prices",op:"U",rid:"repka",who:"systém",q:"select ia_tick()",diff:{price:[480,476]},seq:3,h:"ab12"},
  {id:2,at:d0.toISOString(),tbl:"deals",op:"U",rid:"d2",who:"obchodnik.test@ernte.sk",ip:"203.0.113.77",ua:"Mozilla/5.0 (Linux; Android 14; SM-F946B) Chrome/130",diff:{price:[180,182],note:["krátka poznámka","veľmi dlhá poznámka k zmluve, ktorá sa nesmie vyliať zo stránky ani na úzkom displeji telefónu"]},seq:2,h:"cd34"},
  {id:1,at:d0.toISOString(),tbl:"kalk_store",op:"U",rid:"pricelist/konk",who:"ernte@ernte.sk",ip:"198.51.100.4",ua:"Mozilla/5.0 (iPhone) Safari",diff:{data:{_zmeny:{items:{"+":[{a:1}],"-":[]}}}},seq:1,h:"ef56"}]}),
config_snap_list:()=>[{id:3,at:d0.toISOString(),who:"systém",kind:"auto",why:"Denná záloha",kb:31},{id:2,at:iso(-2),who:"ernte@ernte.sk",kind:"rucne",why:"Ručne – Martin",kb:30}],
config_snap_diff:()=>({id:3,at:iso(-2),same:20,items:[{g:"kalk",k:"adj",name:"± úprava od modelu",old:'{"psenica_p":-5}',new:'{"psenica_p":-9,"repka":2}',ok:true},{g:"ceny",k:"repka",name:"ceny:repka",old:"480",new:"476",ok:false,pozn:"Ceny riadia modely – iba na porovnanie"}]}),
account_delete_list:()=>[{id:1,at:d0.toISOString(),email:"farmar.test@example.com",kind:"farmar",name:"Demo Farma s dlhým názvom s.r.o.",reason:"Už nepredávam",ip:"203.0.113.9",status:"nova",zml:2,lis:5}],
account_delete_status:()=>({}),
farmer_risk:()=>[{id:"f1",name:"Demo Farma s.r.o.",score:62,lvl:"vysoke",zml:{n:3,t:450,dod:300,pod:1,pod_t:80,pod_no:"T2026/2",mes:1,nad:0},kval:{n:12,t:310,vl:1.2,ne:0.8},rekl:{n:2,uznane:1,neuznane:1},nahr:{n:1,t:40},
  why:["uzavreté zmluvy s nedodávkou: 1× (chýba 80 t nad toleranciu 5 %)","po termíne a nedodané: 1× zmluva","kvalita: vlhkosť nad normu priemerne 1.2 %, nečistoty nad 2 % priemerne 0.8 %"]},
  {id:"f2",name:"Druhá Demo Farma",score:28,lvl:"stredne",zml:{n:1,t:100,dod:100,pod:0,pod_t:0,mes:0,nad:1},kval:{n:4,t:100,vl:0,ne:0},rekl:{n:0,uznane:0,neuznane:0},nahr:{n:0,t:0},why:["nadodávky nad 5 %: 1×","chýba IBAN"]}],
rd_kpi:()=>({zmluvy:12,nedod_t:1840.5,nedod_eur:392000,nedod_n:9,alarmy:{krit:2,vsetky:7,druhy:{limiter:1,no_signal:1}},reklam:{n:3,uznane:1,neuznane:2},at:d0.toISOString()}),nu_ceny:()=>NU,nu_get:()=>NUG,trader_me:()=>R.trader?TRD:{on:false},portal_brand:()=>null,trader_list:()=>({cfg:{ekm:1.6,base_km:160,r_km:10,meno:"Martin Test"},list:[]}),
 trader_trucks:()=>({trips:[{id:"tt1",day:iso(0),time:"08:00",spz:"TT-001AA",status:"na_ceste",pos:{lat:48.7,lon:21.25,at:d0.toISOString(),spd:40,km:2.1},hide:null,od:null},{id:"tt2",day:iso(0),time:"06:00",spz:"TT-002BB",status:"nalozene",pos:null,hide:"po",od:null},{id:"tt3",day:iso(1),time:"07:30",spz:"TT-003CC",status:"naplanovana",pos:null,hide:"den",od:null}],miesta:true}),
 mail_state:()=>({ernte:{kind:"smtp",from:"jana.valkova@ernte.sk",user:"jana.valkova@ernte.sk",ok:true,last_ok:null,last_err:{at:d0.toISOString(),err:"Invalid login: 535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant. Visit https://aka.ms/smtp_auth_disabled for more information."},fronta:4,neaktualne:1,caka:0},
  ponuky:{kind:"graph",from:"ernte@ernte.sk",tenant:"ernte.sk",client_id:"11111111-2222-3333-4444-555555555555",ok:true,last_ok:d0.toISOString(),last_err:null,fronta:0,neaktualne:0,caka:1},danube:{kind:null},valko:{kind:null}}),
 app_test_get:()=>({runs:[{at:d0.toISOString(),sha:"abcdef12",ok:false,fails:["farmar 390px: viditeľný text „NaN“ (záložka start)","majitel 1440px: chyba skriptu – TypeError: Cannot read properties of undefined (reading 'veryLongPropertyNameThatMustWrapSomewhere')"],warns:["obchodnik 390px: načítanie 3,4 s (nad 3 s)"],vis:[{shot:"farmar-390.png",pct:4.2}],load_avg:1800,shots:["farmar-390-1.jpg"]},{at:d0.toISOString(),sha:"1234abcd",ok:true,fails:[],warns:[],vis:[],load_avg:1500,rollback:"3→25"}],d7:{n:600,fail:4,rollback:1,load_avg:1700}}),
 trh_view:()=>TRH,trh_backtest_run:()=>({ok:true}),sale_book:()=>SALE,gdpr_status:()=>({ver:window.ernteGdpr&&window.ernteGdpr.VER}),sus_rules:()=>({norm:{kukurica:14,psenica_p:14,psenica_k:14,repka:8,soja:12,jacmen_k:14},clean:1.2,dry:1.6}),
 // 🐞 Chyby aplikácie (errmon.js) – vymyslené súčty a dlhé texty na kontrolu rozloženia
 app_err_stats:()=>({days:1,n:57,farmar:12,tim:41,anon:4,h1:3,by_screen:[{s:"farmar:domov",n:12},{s:"fleet/set",n:20},{s:"deals",n:9},{s:"prihlasenie",n:4},{s:"velmi_dlhy_nazov_obrazovky_ktory_sa_musi_zalomit_bez_pretrcania",n:2}],
  by_role:[{r:"owner",n:30},{r:"farmar",n:12},{r:"dispatch",n:11},{r:"anon",n:4}],by_kind:[{k:"api",n:30},{k:"js",n:27}],
  top:[{m:"HTTP 500 POST rpc:deal_update [P0001]: neplatný stav obchodu – veľmi dlhá správa z databázy, ktorá sa musí zalomiť do viacerých riadkov a nesmie pretŕčať doprava ani byť orezaná",n:23,last:d0.toISOString(),roles:["owner","staff"],s:"deals",k:"api",u:3,dev:"Android 14 mobil 412px · Chrome 130 app",ver:"20261102-0110"},
   {m:"TypeError: Cannot read properties of undefined (reading 'tons')",n:9,last:d0.toISOString(),roles:["farmar"],s:"farmar:domov",k:"render",u:2,dev:"iPhone iOS 18 390px · Safari 18 app",ver:"beta 20261102-0110"},
   {m:"Uncaught_ReferenceError_veryLongIdentifierWithoutSpacesThatMustBreakAnywhere_abcdefghijklmnopqrstuvwxyz is not defined",n:2,last:d0.toISOString(),roles:["dispatch"],s:"fleet/set",k:"js",u:1,dev:"Windows 1920px · Edge 130",ver:"20261102-0110"}],
  login:{ok:14,fail:5,link_sent:3,link_fail:1,last_fail:[{at:d0.toISOString(),ev:"fail",m:"heslo",w:"m***@example.com",c:"invalid_credentials",dev:"iPhone iOS 18 390px"},{at:d0.toISOString(),ev:"link_fail",m:"odkaz",w:"j***@example.com",c:"over_email_send_rate_limit",dev:"Android 14 mobil 412px"}]}})};
const session={user,access_token:"test",expires_at:Math.floor(Date.now()/1000)+3600};
window.supabase={createClient:()=>({
  from:Q,rpc:async n=>({data:RPC[n]?RPC[n]():[],error:null}),channel:()=>ch,removeChannel(){},removeAllChannels(){},getChannels:()=>[],
  auth:{onAuthStateChange(cb){setTimeout(()=>{try{cb("SIGNED_IN",session)}catch(e){}},0);return {data:{subscription:{unsubscribe(){}}}}},
    getSession:async()=>({data:{session}}),getUser:async()=>({data:{user}}),signOut:async()=>({}),updateUser:async()=>({error:null}),refreshSession:async()=>({data:{session}})},
  storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:""}}),createSignedUrl:async()=>({data:null}),upload:async()=>({data:null}),list:async()=>({data:[]})})},
  functions:{invoke:async()=>({data:null,error:null})}})};
})();
