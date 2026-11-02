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
const RPC={gdpr_status:()=>({ver:window.ernteGdpr&&window.ernteGdpr.VER}),sus_rules:()=>({norm:{kukurica:14,psenica_p:14,psenica_k:14,repka:8,soja:12,jacmen_k:14},clean:1.2,dry:1.6})};
const session={user,access_token:"test",expires_at:Math.floor(Date.now()/1000)+3600};
window.supabase={createClient:()=>({
  from:Q,rpc:async n=>({data:RPC[n]?RPC[n]():[],error:null}),channel:()=>ch,removeChannel(){},removeAllChannels(){},getChannels:()=>[],
  auth:{onAuthStateChange(cb){setTimeout(()=>{try{cb("SIGNED_IN",session)}catch(e){}},0);return {data:{subscription:{unsubscribe(){}}}}},
    getSession:async()=>({data:{session}}),getUser:async()=>({data:{user}}),signOut:async()=>({}),updateUser:async()=>({error:null}),refreshSession:async()=>({data:{session}})},
  storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:""}}),createSignedUrl:async()=>({data:null}),upload:async()=>({data:null}),list:async()=>({data:[]})})},
  functions:{invoke:async()=>({data:null,error:null})}})};
})();
