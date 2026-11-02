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
const RPC={trh_view:()=>TRH,trh_backtest_run:()=>({ok:true}),sale_book:()=>SALE,gdpr_status:()=>({ver:window.ernteGdpr&&window.ernteGdpr.VER}),sus_rules:()=>({norm:{kukurica:14,psenica_p:14,psenica_k:14,repka:8,soja:12,jacmen_k:14},clean:1.2,dry:1.6}),
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
