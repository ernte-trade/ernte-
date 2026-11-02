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
function Q(tab){let rows=(T[tab]||[]).slice(),single=false;const q={
  select(){return q},eq(k,v){rows=rows.filter(r=>r[k]===undefined||r[k]===v);return q},neq(){return q},gte(){return q},lte(){return q},lt(){return q},gt(){return q},in(){return q},is(){return q},ilike(){return q},like(){return q},or(){return q},not(){return q},filter(){return q},contains(){return q},match(){return q},textSearch(){return q},
  order(){return q},limit(){return q},range(){return q},returns(){return q},csv(){return q},
  maybeSingle(){single=true;return q},single(){single=true;return q},
  insert(){return q},update(){return q},upsert(){return q},delete(){return q},
  then(ok,er){return Promise.resolve({data:single?(rows[0]||null):rows,error:null,count:rows.length}).then(ok,er)}};return q}
const ch={on(){return ch},subscribe(cb){try{cb&&cb("SUBSCRIBED")}catch(e){}return ch},unsubscribe(){},send(){}};
const user={id:"u-test",email:R.kind==="farmer"?FARMER.email:((R.staff&&R.staff.email)||"test@example.com")};
const SALE={sales:[{id:"s1",no:"PZ2026/1",buyer:"Veľmi Dlhý Názov Odberateľa Agrokomodity Medzinárodná Obchodná Spoločnosť s.r.o.",ico:"00000000",com:"kukurica",tons:300,price:205.5,parity:"DAP",dop:12,term:"1.–15. 12. 2026",delivered_t:40,status:"dodava",note:"Vymyslená poznámka na test dlhého textu, ktorý sa musí zalomiť a nesmie pretiecť doprava.",archived:false,
   alloc:[{deal_id:"d1",no:"T2026/1",farmer:"Demo Farma s.r.o.",com:"kukurica",tons:100,buy:170,status:"navrh",live:false,m_t:23.5,m_eur:2350}]},
  {id:"s2",no:"PZ2026/2",buyer:"Odberateľ Test",com:"psenica_p",tons:150,price:210,parity:"FCA",dop:0,delivered_t:0,status:"podpisana",archived:false,alloc:[]},
  {id:"s3",no:"PZ2026/0",buyer:"Starý Odberateľ",com:"repka",tons:50,price:450,parity:"FCA",dop:0,delivered_t:50,status:"zaplatena",archived:true,alloc:[]}],
 deals:[{id:"d2",no:"T2026/2",farmer:"Demo Farma s.r.o.",com:"psenica_p",tons:200,price:180,status:"odvoz",alloc_t:0}],buyers:[{id:"b1",name:"Odberateľ Test"}],
 sum:{pozicie:{psenica_p:{komodita:"Pšenica potravinárska",nakupene_t:200,predane_t:150,sparovane_t:0,marza_sparovane_eur:0,nakupene_nepredane_t:200,nepredane_priemer_nakup_eur_t:180,predane_nenakupene_t:150,nenakupene_priemer_predaj_eur_t:210,otvorena_t:50,cena_eur_t:195,cena_zdroj:"MATIF pšenica Mar 2027",hodnota_eur:9750},
   kukurica:{komodita:"Kukurica",nakupene_t:900,predane_t:300,sparovane_t:0,marza_sparovane_eur:0,nakupene_nepredane_t:900,nepredane_priemer_nakup_eur_t:170,predane_nenakupene_t:300,nenakupene_priemer_predaj_eur_t:193.5,otvorena_t:600,cena_eur_t:190,cena_zdroj:"MATIF kukurica Mar 2027",hodnota_eur:114000}},
  spolu:{otvorena_t:650,hodnota_eur:123750,marza_sparovane_eur:0},eurusd:1.08}};
const RPC={sale_book:()=>SALE,gdpr_status:()=>({ver:window.ernteGdpr&&window.ernteGdpr.VER}),sus_rules:()=>({norm:{kukurica:14,psenica_p:14,psenica_k:14,repka:8,soja:12,jacmen_k:14},clean:1.2,dry:1.6}),
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
