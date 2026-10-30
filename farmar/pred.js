// ===== 🔮 ALGOMANCIA · AI VEŠTENIE OBCHODU (predtým Predikcia) – iba majiteľ, zamknuté PIN-om =====
// 🤖 AI veštba: algo_ai_now(p_ctx) → Claude prečíta čísla + oblohu + karty a vynesie verdikt na každú komoditu (algo_ai_get).
// Vyhodnocuje nákup a predaj komodít z čísel: ponuky farmárov, výkupný cenník, fyzické trhy (market.json),
// burza (market_px + termíny v market.json), ponuky odberateľov a zmluvy s odberateľmi, doprava podľa vzdialenosti.
// Odporúčania sa ukladajú a neskôr porovnávajú s vývojom burzy (prehodnotenie).
// Vesmír (karty, Mesiac, planéty, osobný horoskop) vstupuje do odporúčania s nastaviteľnou váhou; zisk/strata obchodu ostáva z čísel.
// Úspešnosť každej zložky sa meria voči burze (sekcia „Funguje vesmír?“).
// Dáta sú v ai_state (RLS: iba is_owner()), PIN je uložený len ako PBKDF2 hash.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>(typeof toast==="function"?toast:alert)(t,ms);
const OWN=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const rr=()=>{if(typeof renderStaff==="function"&&OWN()&&typeof TAB!=="undefined"&&TAB==="pred")renderStaff()};
const CN=c=>typeof comName==="function"?comName(c):c;
const f0=x=>Number.isFinite(+x)&&x!==null&&x!==""?Math.round(+x).toLocaleString("sk-SK"):"–";
const f1=x=>Number.isFinite(+x)&&x!==null?(+x).toLocaleString("sk-SK",{maximumFractionDigits:1}):"–";
const sg=x=>(x>0?"+":x<0?"−":"±")+f0(Math.abs(x));
const N_=v=>N(v);const N=v=>{const x=parseFloat(String(v??"").replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null};
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const dAgo=s=>Math.round((new Date(today())-new Date(String(s).slice(0,10)))/864e5);

// ---------- nastavenia (predvolené) ----------
const DEF={ua:30,w:20,rate:1.5,payload:25,ret:true,store:2.5,handle:0,tmin:4,defKm:120,basis:45};
const MKB2={repka:"repka",psenica_p:"psenica",psenica_k:"psenica",kukurica:"kukurica",soja:"soja_usc_bu"};
// približné polohy miest, ktoré sa objavujú v market.json (na odhad dopravy)
const GEO=[[/batyovo|батьово|батьево/i,48.29,22.40],[/záhony/i,48.41,22.18],[/čop|chop/i,48.43,22.21],[/odesa|odessa/i,46.48,30.73],[/kyjev|kyiv/i,50.45,30.52],
  [/bratislava/i,48.15,17.11],[/sofia/i,42.70,23.32],[/rouen/i,49.44,1.10],[/bordeaux/i,44.84,-0.58],[/dunkerque/i,51.03,2.38],[/hazai|maďarsko/i,47.50,19.04],[/ukrajinský prístav/i,46.48,30.73]];
const geoOf=t=>{for(const g of GEO)if(g[0].test(t||""))return{lat:g[1],lon:g[2]};return null};
const UA=t=>/ukrajin|batyovo|батьово|батьево|čop|odesa|kyjev/i.test(t||"");

let S={busy:false,at:0,mkt:null,off:[],pl:[],bc:[],df:[],cfg:null,pin:null,hist:[],log:[],flt:null,nov:null,err:"",open:{},sel:"all",pinErr:"",pinMode:null};

// ---------- PIN ----------
const LK="ernte-pred-unlock",FK="ernte-pred-fail",IDLE=15*6e4;
const unlocked=()=>{try{const t=+sessionStorage.getItem(LK)||0;return t&&Date.now()-t<IDLE}catch(x){return false}};
const touch=()=>{try{if(unlocked())sessionStorage.setItem(LK,String(Date.now()))}catch(x){}};
const lock=()=>{try{sessionStorage.removeItem(LK)}catch(x){}};
const fails=()=>{try{return JSON.parse(localStorage.getItem(FK)||'{"n":0,"t":0}')}catch(x){return{n:0,t:0}}};
const setFails=v=>{try{localStorage.setItem(FK,JSON.stringify(v))}catch(x){}};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function pbk(pin,salt){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode(salt),iterations:150000},k,256))}
async function stSet(key,value){const r=await sb.from("ai_state").upsert({key,value,updated_at:new Date().toISOString()});if(r.error)throw r.error}
async function stGet(keys){const r=await sb.from("ai_state").select("key,value").in("key",keys);if(r.error)throw r.error;return Object.fromEntries((r.data||[]).map(x=>[x.key,x.value]))}

// ---------- načítanie ----------
async function load(force){if(!OWN()||S.busy)return;if(!force&&S.at&&Date.now()-S.at<5*6e4)return;S.busy=true;S.err="";
  try{
    const st=await stGet(["pred_cfg","pred_pin","pred_hist","pred_log","pred_nov","pred_natal"]);S.natal=st.pred_natal||null;
    S.cfg=Object.assign({},DEF,{quotes:[]},st.pred_cfg||{});S.pin=st.pred_pin||null;S.hist=st.pred_hist||[];S.log=st.pred_log||[];S.nov=st.pred_nov||null;
    if(!unlocked()){S.at=0;S.busy=false;rr();return}
    try{const w=await sb.rpc("deal_watch_list");S.dw=w.error?[]:(w.data||[])}catch(x){S.dw=[]}
    const q=await Promise.all([
      fetch("market.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
      sb.from("market_px").select("*"),
      sb.from("farmer_offers").select("id,farmer_id,com,price,tons,status,place,dev_lat,dev_lon,geo,pickup_date,created_at").in("status",["nova","protinavrh"]).order("created_at",{ascending:false}).limit(200),
      sb.from("places").select("id,name,kind,lat,lon"),
      sb.from("buy_contracts").select("*"),
      sb.from("deal_fin").select("*"),
      sb.from("fleet_cfg").select("key,value").eq("key","costs"),
      sb.rpc("buyer_tickets",{d0:new Date(Date.now()-45*864e5).toISOString().slice(0,10),d1:null})]);
    S.mj=q[0];S.mkt=q[1].error?{}:Object.fromEntries((q[1].data||[]).map(x=>[x.sym,x]));
    S.off=q[2].error?[]:(q[2].data||[]);S.pl=q[3].error?[]:(q[3].data||[]);S.bc=q[4].error?[]:(q[4].data||[]);
    S.df=q[5].error?[]:(q[5].data||[]);const fc=!q[6].error&&q[6].data&&q[6].data[0]&&q[6].data[0].value;S.flt=fc&&+fc.rate||null;
    // posledné skutočné predajné ceny odberateľov z vážnych lístkov (Zúčtovanie odberateľa)
    S.last={};if(!q[7].error)for(const x of (q[7].data||[])){if(!(+x.s>0)||!x.k)continue;const k=x.k+"|"+(x.b||"Odberateľ");if(!S.last[k]||String(x.d)>String(S.last[k].d))S.last[k]={c:x.k,b:x.b||"Odberateľ",p:+x.s,d:x.d}}
    await snapHist();await logRecs();await novinka();
  }catch(x){S.err=x&&x.message||String(x)}
  S.at=Date.now();S.busy=false;rr()}

// denný záznam burzy – z neho sa počíta trend a prehodnotenie
async function snapHist(){const d=today(),M=S.mkt||{};if(S.hist.some(h=>h.d===d))return;const px={};
  for(const k in M)if(M[k].eur_t!=null)px[k]=+M[k].eur_t;if(!Object.keys(px).length)return;
  S.hist=[...S.hist,{d,px}].slice(-400);try{await stSet("pred_hist",S.hist)}catch(x){}}
const bzNow=c=>{const s=MKB2[c],x=s&&S.mkt&&S.mkt[s];return x&&x.eur_t!=null?+x.eur_t:null};
const bzAt=(c,days)=>{const s=MKB2[c];if(!s)return null;const lim=new Date(Date.now()-days*864e5).toISOString().slice(0,10);
  const H=S.hist.filter(h=>h.d<=lim&&h.px[s]!=null);return H.length?H[H.length-1].px[s]:null};

// ---------- doprava ----------
function yard(){const y=S.pl.find(p=>p.kind==="yard");return y?{lat:+y.lat,lon:+y.lon,name:y.name}:{lat:48.755,lon:21.915,name:"dvor Michalovce"}}
function km(a,b){if(!a||!b)return null;const R=6371,r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lon-a.lon)*r,
  h=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))*1.25}
function tcost(k){const C=S.cfg;if(k==null)k=+C.defKm;const v=k*(C.ret?2:1)*(+C.rate||DEF.rate)/(+C.payload||25);return Math.max(+C.tmin||0,v)}

// ---------- zdroje nákupu ----------
function sources(c){const out=[],y=yard(),F=(typeof STATE!=="undefined"&&STATE.farmers)||[];
  for(const o of S.off.filter(o=>o.com===c&&+o.price>0)){const g=(o.geo&&o.geo[0])||(o.dev_lat!=null?{lat:+o.dev_lat,lon:+o.dev_lon}:null);
    const fm=F.find(f=>f.id===o.farmer_id);out.push({k:"offer",id:o.id,name:(fm&&fm.name)||"farmár",price:+o.price,tons:+o.tons||null,pos:g?{lat:+g.lat,lon:+g.lon}:null,note:o.place||"",age:dAgo(o.created_at),st:o.status})}
  const P=((typeof STATE!=="undefined"&&STATE.prices)||[]).find(p=>p.com===c&&p.price!=null);
  if(P){const dc=typeof window.farmDisc==="function"?+window.farmDisc(c)||0:0;out.push({k:"list",name:"farmári za tvoj cenník"+(dc?` (−${f1(dc)} %)`:""),price:Math.round(+P.price*(1-dc/100)*100)/100,tons:null,pos:y})}
  for(const r of ((S.mj&&S.mj.rows)||[]).filter(r=>r.c===c&&r.kind==="fyzický"&&/FCA|DAP|CPT|batyovo|čop|záhony/i.test(r.place+" "+r.market))){
    const g=geoOf(r.place)||geoOf(r.market);if(!g)continue;const d=km(y,g);if(d>400)continue;
    out.push({k:"mkt",name:r.market,price:+r.price,tons:null,pos:g,note:r.place+" · "+r.date,ua:UA(r.place+" "+r.market),age:dAgo(r.date)})}
  return out}
// ---------- kam predať ----------
function sinks(c){const out=[],y=yard(),T=today();
  const plc=n=>{const p=S.pl.find(p=>p.name&&n&&(p.name.toLowerCase().includes(n.toLowerCase())||n.toLowerCase().includes(p.name.toLowerCase())));return p?{lat:+p.lat,lon:+p.lon}:null};
  for(const q of (S.cfg.quotes||[]).filter(q=>q.com===c&&+q.price>0)){if(q.till&&q.till<T)continue;
    const p=q.place?S.pl.find(x=>String(x.id)===String(q.place)):null;out.push({k:"quote",id:q.id,name:q.buyer,price:+q.price,pos:p?{lat:+p.lat,lon:+p.lon}:plc(q.buyer),km:N(q.km),note:q.till?"platí do "+q.till.split("-").reverse().join(". "):"",age:dAgo(q.at||T)})}
  for(const b of S.bc.filter(b=>b.com===c&&+b.price>0&&(!b.d1||b.d1>=T)))out.push({k:"contract",name:b.buyer+(b.no?" · zml. "+b.no:""),price:+b.price,tons:+b.tons||null,pos:plc(b.buyer),note:"zmluva s odberateľom"});
  for(const L of Object.values(S.last||{}).filter(x=>x.c===c))out.push({k:"last",name:L.b+" · posledný predaj",price:L.p,pos:plc(L.b),note:"podľa vážneho lístka z "+String(L.d).split("-").reverse().join(". ")+" – over aktuálnu cenu",age:dAgo(L.d)});
  // ponuky odberateľov, konkurencie a skutočné predaje z „🏆 Kde predať“ (cena posunutá s burzou, doprava z regiónu farmárov)
  for(const x of (window.sellOpts?sellOpts(c):[]))out.push({k:"sell",name:x.b.name+(x.siteName?" "+x.siteName:"")+" · "+x.del,price:x.price,tfix:x.dop||0,pos:null,note:x.src+" "+String(x.d||"").split("-").reverse().join(". ")+(x.bz?" · posunuté s burzou":"")+(x.term?" · "+x.term:""),age:x.age});
  const dom=((S.mj&&S.mj.rows)||[]).filter(r=>r.c===c&&r.kind==="fyzický"&&/hazai|miesto produkcie/i.test(r.place)).sort((a,b)=>b.price-a.price)[0];
  if(dom)out.push({k:"burza",name:"orientačne: "+dom.market,price:+dom.price,pos:null,km:+S.cfg.defKm||0,note:"cena farmárom "+dom.date.split("-").reverse().join(". ")+" · doprava odhad "+f0(S.cfg.defKm)+" km – zapíš skutočnú ponuku",ind:true});
  else{const bz=bzNow(c);if(bz!=null)out.push({k:"burza",name:"orientačne: burza − báza",price:bz-(+S.cfg.basis||0),pos:null,km:+S.cfg.defKm||0,note:"burza "+f0(bz)+" €/t − báza "+f0(S.cfg.basis)+" €/t",ind:true})}
  return out}

// ---------- vyhodnotenie komodity ----------
function evalCom(c){const src=sources(c),snk=sinks(c),y=yard(),C=S.cfg,H=+C.handle||0;
  const leg=(a,b)=>{if(b.km!=null)return b.km+(a.pos?km(a.pos,y)||0:0);if(a.pos&&b.pos)return km(a.pos,b.pos);if(b.pos)return km(y,b.pos)+(a.pos?0:0);return null};
  const pairs=[];for(const a of src)for(const b of snk){const k=b.tfix!=null?null:leg(a,b),t=b.tfix!=null?b.tfix:tcost(k);
    const X=a.ua?(+C.ua||0):0;pairs.push({a,b,km:k,t,ux:X,net:b.price-a.price-t-H-X,tot:a.tons?(b.price-a.price-t-H-X)*a.tons:null})}
  pairs.sort((x,z)=>(z.b.ind?0:1)-(x.b.ind?0:1)||z.net-x.net);
  const real=pairs.filter(p=>!p.b.ind),best=real[0]||null,ind=pairs.filter(p=>p.b.ind).sort((x,z)=>z.net-x.net)[0]||null;
  // časovanie podľa termínov burzy (forward krivka) vs. náklad skladovania
  const fut=((S.mj&&S.mj.rows)||[]).filter(r=>r.c===c&&r.kind==="burza").map(r=>({t:r.term,p:+r.price,m:mIdx(r.term)})).filter(r=>r.m!=null).sort((a,b)=>a.m-b.m);
  let timing=null;if(fut.length>=2){const a=fut[0],b=fut[fut.length-1],mo=Math.max(1,b.m-a.m),cost=mo*(+C.store||0),gain=b.p-a.p-cost;
    timing={a,b,mo,cost,gain,hold:gain>3}}
  const now=bzNow(c),w1=bzAt(c,7),m1=bzAt(c,30);
  const trend={now,d7:now!=null&&w1!=null?now-w1:null,d30:now!=null&&m1!=null?now-m1:null};
  const P=((typeof STATE!=="undefined"&&STATE.prices)||[]).find(p=>p.com===c&&p.price!=null);
  const dom=((S.mj&&S.mj.rows)||[]).filter(r=>r.c===c&&r.kind==="fyzický"&&/hazai|miesto produkcie/i.test(r.place)).map(r=>({n:r.market,p:+r.price,d:r.date}));
  // skutočné výsledky z obchodov (nákup vs. dosiahnutý predaj)
  const D=((typeof STATE!=="undefined"&&STATE.deals)||[]).filter(d=>d.com===c&&d.status!=="zruseny"),FM=Object.fromEntries(S.df.map(x=>[x.deal_id,x]));
  const dr=D.filter(d=>FM[d.id]&&FM[d.id].sell_price!=null).map(d=>({t:+d.tons||0,m:+FM[d.id].sell_price-+d.price}));
  const tt=dr.reduce((s,x)=>s+x.t,0),hist=tt?{t:tt,m:dr.reduce((s,x)=>s+x.m*x.t,0)/tt,n:dr.length}:null;
  const warn=[];if(P&&now!=null&&+P.price>now)warn.push(`Výkupná cena ${f0(P.price)} €/t je nad burzou ${f0(now)} €/t.`);
  if(best&&best.net<0)warn.push("Ani najlepšia kombinácia nevychádza v zisku – nekupuj, kým nemáš lepšieho odberateľa.");
  if(pairs.slice(0,3).some(p=>p.a.ua))warn.push("Nákup z Ukrajiny: pred obchodom over aktuálne dovozné obmedzenia SK/HU, fytosanitu a clo.");
  if(best&&best.a.k==="mkt")warn.push("Cena zdroja je z prehľadu trhu ("+best.a.note+") – pred nákupom si ju potvrď u predávajúceho.");
  const OP=(S.dw||[]).filter(x=>x.com===c&&+x.tons>0&&+x.buy>0),sale=snk.filter(b=>!b.ind).map(b=>({b,n:b.price-(b.tfix!=null?b.tfix:tcost(b.km!=null?b.km:(b.pos?km(y,b.pos):+C.defKm)))-H})).sort((a,z)=>z.n-a.n)[0]||null;
  let pos=null;if(OP.length){const t=OP.reduce((s,x)=>s+(+x.tons),0),avg=OP.reduce((s,x)=>s+(+x.tons)*(+x.buy),0)/t;pos={t,avg,n:OP.length,sale,pl:sale?sale.n-avg:null,hold:OP.filter(x=>x.state==="rise").length,sell:OP.filter(x=>["fall","sell","termin"].includes(x.state)).length,until:OP.map(x=>x.hold).filter(Boolean).sort()[0]||null}
    if(pos.sell)warn.unshift(`Stráženie nákupov: ${pos.sell}× PREDAJ / KLESÁ – rozhodni dnes.`)}
  return {c,src,snk,pairs,best,ind,timing,trend,P,dom,hist,warn,pos}}
function mIdx(t){const m={jan:0,feb:1,mar:2,apr:3,máj:4,maj:4,may:4,jún:5,jun:5,júl:6,jul:6,aug:7,sep:8,okt:9,oct:9,nov:10,dec:11},x=String(t||"").toLowerCase().match(/([a-záéíóúýčďľňŕšťž]+)\s*(\d{4})/);
  if(!x||m[x[1]]==null)return null;return +x[2]*12+m[x[1]]}
const coms=()=>{const M=typeof MK!=="undefined"?MK.map(m=>m[0]):["repka","lo","ho","soja","psenica_p","psenica_k","jacmen_k","jacmen_s","kukurica","cirok"];return M};

// ---------- uloženie odporúčaní (na neskoršie prehodnotenie) ----------
async function logRecs(){const d=today();if(S.log.some(l=>l.d===d))return;const add=[];
  for(const c of coms()){const R=evalCom(c),b=R.best;if(!b&&R.trend.now==null)continue;
    add.push({d,c,buy:b?b.a.price:null,sell:b?b.b.price:null,net:b?Math.round(b.net):null,from:b?b.a.name:null,to:b?b.b.name:null,bz:R.trend.now,hold:R.timing?R.timing.hold:null,dir:(()=>{try{const M=mix(R);return{num:+M.nd.toFixed(2),cards:+M.cz.cards.toFixed(2),moon:M.cz.moon,tr:+M.cz.tr.toFixed(2),cos:+M.cz.cos.toFixed(2),k:+M.k.toFixed(2),w:M.w}}catch(x){return null}})()})}
  if(!add.length)return;S.log=[...S.log,...add].slice(-600);try{await stSet("pred_log",S.log)}catch(x){}}
async function novinka(){if(S.nov)return;try{const r=await sb.from("app_novinky").insert({d:today(),titul:"🔮 Predikcia obchodu",kde:"záložka Algomancia (iba majiteľ, PIN)",kto:"majiteľ",aud:["owner"],
  popis:"Kde kúpiť a kam predať komodity, marža po doprave, časovanie podľa burzy, prehodnotenie minulých odporúčaní. Zamknuté PIN-om."});
  if(!r.error||/duplicate|unique/i.test(r.error.message||"")){S.nov={at:new Date().toISOString()};await stSet("pred_nov",S.nov)}}catch(x){}}

// ---------- 🔮 VESMÍR: karty + Mesiac + planéty + osobný horoskop ----------
// Každá zložka dáva smer ceny v rozsahu −1…+1 (+ = rast → kúp/drž, − = pokles → predaj hneď).
// Spojenie: (1 − váha) × čísla + váha × vesmír. Úspešnosť každej zložky sa meria voči burze po 7 a 30 dňoch.
const TMAJ=[["Blázon",1],["Mág",2],["Veľkňažka",0],["Cisárovná",2],["Cisár",1],["Veľkňaz",0],["Milenci",1],["Voz",2],["Sila",1],["Pustovník",-1],["Koleso šťastia",2],["Spravodlivosť",0],["Obesenec",-1],["Smrť",-1],["Miernosť",0],["Diabol",-1],["Veža",-2],["Hviezda",1],["Mesiac",-1],["Slnko",2],["Súd",1],["Svet",2]];
const TR=["Eso","Dvojka","Trojka","Štvorka","Päťka","Šestka","Sedmička","Osmička","Deviatka","Desiatka","Páža","Rytier","Kráľovná","Kráľ"];
const TSU=[["palíc",[2,1,1,1,-1,2,0,1,0,-1,0,1,1,1]],["pohárov",[1,1,1,-1,-1,0,-1,-1,2,2,0,1,1,1]],["mečov",[1,-1,-2,-1,-1,0,-1,-1,-2,-2,0,0,0,0]],["mincí",[2,0,1,1,-2,1,0,1,2,2,1,0,1,2]]];
const TAROT=[...TMAJ,...TSU.flatMap(s=>TR.map((r,i)=>[r+" "+s[0],s[1][i]]))];
const LEN=[["Jazdec",1],["Ďatelina",1],["Loď",1],["Dom",1],["Strom",1],["Oblaky",-1],["Had",-1],["Rakva",-2],["Kytica",2],["Kosa",-1],["Metla",-1],["Vtáky",0],["Dieťa",1],["Líška",-1],["Medveď",2],["Hviezdy",2],["Bocian",1],["Pes",1],["Veža",0],["Záhrada",1],["Hora",-2],["Cesta",0],["Myši",-2],["Srdce",1],["Prsteň",1],["Kniha",0],["List",0],["Muž",0],["Žena",0],["Ľalie",1],["Slnko",2],["Mesiac",1],["Kľúč",2],["Ryby",2],["Kotva",1],["Kríž",-1]];
const CIG=[["Láska",1],["Svadba",1],["Stretnutie",1],["Dobrá správa",2],["Falošnosť",-2],["Zmena",0],["Cesta",0],["Veľa peňazí",2],["Smútok",-1],["Myšlienky",0],["Dar",1],["Dieťa",1],["Dom",1],["Súd",-1],["Krádež",-2],["Nádej",1],["Samota",-1],["Nečakané šťastie",2],["Vernosť",1],["Zisk",2],["Strata",-2],["Choroba",-1],["Hádka",-1],["Priateľ",1],["Úradník",0],["Rozlúčka",-1],["Návšteva",0],["Bohatý pán",2],["Dobrá pani",1],["Nepriateľ",-2],["Smrť (koniec)",-1],["Úspech",2]];
const PN={sun:"Slnko",moon:"Mesiac",mercury:"Merkúr",venus:"Venuša",mars:"Mars",jupiter:"Jupiter",saturn:"Saturn",asc:"ASC",mc:"MC"};
const ASP=[[0,"konjunkcia"],[60,"sextil"],[90,"kvadratúra"],[120,"trigon"],[180,"opozícia"]];
const clamp=x=>Math.max(-1,Math.min(1,x));
function rng(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}
  return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return(h>>>0)/4294967296}}
// SEČ/SELČ podľa pravidiel platných v SR/ČSSR od 1979 (koniec letného času: do 1995 posledná nedeľa septembra, potom októbra)
function lastSun(y,m){const d=new Date(Date.UTC(y,m+1,0));d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d}
function toUTC(date,time){const [y,m,d]=date.split("-").map(Number),[hh,mm]=(time||"12:00").split(":").map(Number);
  let off=1;if(y>=1979){const s=lastSun(y,2),en=lastSun(y,y<1996?8:9),loc=Date.UTC(y,m-1,d,hh,mm);if(loc>=s.getTime()+2*36e5&&loc<en.getTime()+3*36e5)off=2}
  return new Date(Date.UTC(y,m-1,d,hh-off,mm))}
function natal(){const N=S.natal;if(!N||!N.date||!window.ASTRO)return null;if(S._nat&&S._nat.k===JSON.stringify(N))return S._nat.v;
  const t=toUTC(N.date,N.time),P=ASTRO.positions(t),am=ASTRO.ascmc(t,+N.lat,+N.lon);const v={t,P:Object.assign({},P,{asc:am.asc,mc:am.mc})};S._nat={k:JSON.stringify(N),v};return v}
function sky(){const k=today();if(S._sky&&S._sky.k===k)return S._sky.v;const t=new Date(),P=ASTRO.positions(t),mp=ASTRO.moonPhase(t),nt=ASTRO.nextTurn(t);
  const R={};for(const p of ["mercury","venus","mars","jupiter","saturn"])R[p]=ASTRO.retro(p,t);const v={t,P,mp,nt,R};S._sky={k,v};return v}
function transits(){const n=natal(),s=sky();if(!n)return{score:0,list:[]};const L=[];let sc=0;
  const good=["jupiter","venus"],bad=["saturn","mars"],tgt=["sun","moon","venus","jupiter","mc","asc"];
  for(const tp of [...good,...bad,"sun"])for(const np of tgt){const sp=ASTRO.sep(s.P[tp],n.P[np]);for(const [ang,nm] of ASP){const orb=Math.abs(sp-ang),lim=tp==="sun"?1.5:2;if(orb>lim)continue;
    const soft=ang===60||ang===120,v=good.includes(tp)?(soft||ang===0?1:0.4):bad.includes(tp)?(soft?0.3:-1):(soft||ang===0?0.4:-0.3);
    sc+=v;L.push({t:`${PN[tp]} – ${nm} – natál ${PN[np]}`,v,orb})}}
  const ms=ASTRO.sep(s.P.moon,n.P.sun),mj=ASTRO.sep(s.P.moon,n.P.jupiter);if(ms<6){sc+=0.3;L.push({t:"Mesiac na tvojom Slnku",v:0.3})}if(mj<6){sc+=0.3;L.push({t:"Mesiac na tvojom Jupiteri",v:0.3})}
  const h=Math.floor(ASTRO.rev(s.P.moon-Math.floor(n.P.asc/30)*30)/30)+1;
  return{score:clamp(sc/2),list:L,moonHouse:h}}
function cosmo(c){const s=sky(),n=natal(),r=rng(today()+"|"+c+"|"+(n?n.t.toISOString():"x"));
  const ti=Math.floor(r()*TAROT.length),rv=r()<0.3,li=Math.floor(r()*LEN.length),ci=Math.floor(r()*CIG.length),T=TAROT[ti],L=LEN[li],C=CIG[ci];
  const cards=clamp(((rv?-T[1]:T[1])+L[1]+C[1])/6);
  const hrs=s.nt?(s.nt-Date.now())/36e5:99,moon=hrs<18?0:s.mp.waxing?0.6:-0.6;
  const tr=transits(),risk=[];if(s.R.mercury)risk.push("Merkúr je spätný – nové zmluvy a dohody over dvakrát");if(s.R.venus)risk.push("Venuša je spätná – pozor na precenenie");
  const cos=clamp(0.5*cards+0.25*moon+0.25*tr.score);
  return{cards,moon,tr:tr.score,cos,draw:{t:T[0]+(rv?" (obrátená)":""),tv:rv?-T[1]:T[1],l:L[0],lv:L[1],c:C[0],cv:C[1]},risk,hrs}}
// smer podľa čísel: termíny burzy, inak 7-dňový trend
function numDir(R){if(R.timing)return clamp(R.timing.gain/30);if(R.trend.d7!=null)return clamp(R.trend.d7/20);return 0}
function verdict(R,dir){const b=R.best;if(b&&b.net>0)return dir>0.15?"kúp a drž (skladuj)":dir<-0.15?"kúp a predaj hneď":"kúp a predávaj priebežne";
  if(b)return dir>0.3?"zatiaľ nekupuj – počkaj na rast ceny":"nekupuj";return dir>0.15?"cena skôr porastie – drž, čo máš":dir<-0.15?"cena skôr klesne – predaj, čo máš":"bez jasného smeru"}
function mix(R){const w=Math.max(0,Math.min(100,+S.cfg.w||0))/100,cz=cosmo(R.c),nd=numDir(R),k=clamp((1-w)*nd+w*cz.cos);
  return{w,cz,nd,k,vn:verdict(R,nd),vk:verdict(R,k)}}
function cosmoBox(R){const M=mix(R),z=M.cz,d=z.draw,s=sky();
  return `<div class="prd-cos"><div class="row"><b>🔮 Vesmír</b><span class="pill ${z.cos>0.1?"":z.cos<-0.1?"r":"g"}">${z.cos>0?"+":""}${f1(z.cos*100)} %</span></div>
   <div class="s">🃏 ${e(d.t)} (${d.tv>0?"+":""}${d.tv}) · ${e(d.l)} (${d.lv>0?"+":""}${d.lv}) · ${e(d.c)} (${d.cv>0?"+":""}${d.cv}) → karty ${sg(z.cards*100)} %</div>
   <div class="s">🌙 ${e(s.mp.name)}${z.hrs<18?" – blízko obratu, neutrálne":s.mp.waxing?" – rast":" – pokles"} · 🪐 tranzity ${sg(z.tr*100)} %</div>
   ${z.risk.map(x=>`<div class="s">⚠️ ${e(x)}</div>`).join("")}
   <div class="prd-vs"><div><small>🔢 len čísla</small><b>${e(M.vn)}</b></div><div><small>🔮 s vesmírom (${Math.round(M.w*100)} %)</small><b>${e(M.vk)}</b></div></div>
   ${M.vn!==M.vk?`<div class="prd-w">⚖️ Vesmír mení odporúčanie oproti číslam.</div>`:""}</div>`}
function natalCard(){const n=natal(),N=S.natal||{},o=S.open.__nat||!n,s=window.ASTRO?sky():null,tr=n?transits():null;
  let h=`<div class="card"><button type="button" class="prd-hd" data-prdo="__nat" aria-expanded="${!!o}"><b>🌌 Vesmír a tvoj horoskop</b><small>váha ${Math.round(+S.cfg.w||0)} %</small><span aria-hidden="true">${o?"▴":"▾"}</span></button>`;
  if(s)h+=`<div class="s">Dnes: Slnko ${e(ASTRO.sign(s.P.sun))} · Mesiac ${e(ASTRO.sign(s.P.moon))} (${e(s.mp.name)}, ${Math.round(s.mp.illum*100)} %)${s.nt?` · ${s.mp.waxing?"spln":"nov"} ${e(s.nt.toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}))}`:""}${Object.entries(s.R).filter(x=>x[1]).map(x=>" · "+PN[x[0]]+" ℞").join("")}</div>`;
  if(n)h+=`<div class="s">${e(N.name||"Ty")}: Slnko ${e(ASTRO.sign(n.P.sun))} · Mesiac ${e(ASTRO.sign(n.P.moon))} · ASC ${e(ASTRO.sign(n.P.asc))} · MC ${e(ASTRO.sign(n.P.mc))} · Jupiter ${e(ASTRO.sign(n.P.jupiter))}</div>
    ${tr.list.length?`<div class="s">Tvoje tranzity dnes: ${tr.list.map(x=>`${x.v>0?"✅":"⛔"} ${e(x.t)}`).join(" · ")}</div>`:`<div class="s">Dnes žiadne silné osobné tranzity.</div>`}
    ${tr.moonHouse===2||tr.moonHouse===8?`<div class="s">💰 Mesiac prechádza tvojím ${tr.moonHouse}. domom (peniaze).</div>`:""}`;
  if(o)h+=`<form class="f" id="fPrdN"><label class="w">Váha vesmíru v odporúčaní: <b id="prdWv">${Math.round(+S.cfg.w||0)} %</b><input type="range" name="w" min="0" max="100" step="5" value="${Math.round(+S.cfg.w||0)}" data-prdw></label>
    <label>Meno<input name="name" value="${e(N.name||"")}"></label><label>Dátum narodenia<input name="date" inputmode="numeric" autocomplete="bday" placeholder="DD.MM.RRRR" maxlength="10" data-prddate value="${e(N.date?N.date.split("-").reverse().join("."):"")}" required></label>
    <label>Čas narodenia<input name="time" inputmode="numeric" placeholder="HH:MM (ak nevieš, nechaj prázdne)" maxlength="5" data-prdtime value="${e(N.time||"")}"></label><label>Miesto<input name="place" value="${e(N.place||"")}" placeholder="napr. Sobrance"></label>
    <label>Zem. šírka <small>(nepovinné)</small><input name="lat" inputmode="decimal" value="${e(N.lat??"")}" placeholder="doplní sa podľa miesta"></label><label>Zem. dĺžka <small>(nepovinné)</small><input name="lon" inputmode="decimal" value="${e(N.lon??"")}" placeholder="doplní sa podľa miesta"></label>
    <div class="w s">Údaje sú uložené len v tvojom súkromnom úložisku (vidí ich iba majiteľ). Čas sa prepočíta podľa letného/zimného času v deň narodenia.</div>
    <div class="w btns"><button class="pri" type="submit">Uložiť</button></div></form>`;
  return h+"</div>"}
// úspešnosť zložiek: smer odporúčania vs. skutočný pohyb burzy
function accCard(){const comp=[["num","🔢 Čísla"],["cards","🃏 Karty"],["moon","🌙 Mesiac"],["tr","🪐 Tranzity"],["cos","🔮 Vesmír spolu"],["k","⚖️ Kombinácia"]];
  const ev=days=>{const o={};for(const [k] of comp)o[k]={n:0,h:0};for(const l of S.log){if(!l.dir||l.bz==null||dAgo(l.d)<days)continue;
    const lim=new Date(new Date(l.d).getTime()+days*864e5).toISOString().slice(0,10),s=MKB2[l.c],H=s&&S.hist.find(h=>h.d>=lim&&h.px[s]!=null);if(!H)continue;
    const ch=H.px[s]-l.bz;if(Math.abs(ch)<1)continue;for(const [k] of comp){const v=l.dir[k];if(!v||Math.abs(v)<0.1)continue;o[k].n++;if(Math.sign(v)===Math.sign(ch))o[k].h++}}return o};
  const a7=ev(7),a30=ev(30),cell=x=>x.n?`<b>${Math.round(100*x.h/x.n)} %</b><small>${x.h}/${x.n}</small>`:`<small>–</small>`,tot=a7.num.n+a7.cards.n;
  return `<div class="card"><b>📊 Funguje vesmír? Úspešnosť smeru</b><div class="s">Koľkokrát zložka správne odhadla, či burza o 7 / 30 dní stúpne alebo klesne. 50 % = ako hod mincou. Spoľahlivé až po desiatkach záznamov.</div>
   <div class="prd-tb"><div class="prd-r hd prd-a"><span>Zložka</span><span>7 dní</span><span>30 dní</span></div>${comp.map(([k,n])=>`<div class="prd-r prd-a"><span>${n}</span><span>${cell(a7[k])}</span><span>${cell(a30[k])}</span></div>`).join("")}</div>
   ${tot<20?`<div class="s">Zatiaľ málo dát – prvé výsledky o týždeň, zmysluplné asi po 1–2 mesiacoch.</div>`:""}</div>`}

// ---------- zobrazenie ----------
const KN={sell:"odberateľ (Kde predať)",offer:"ponuka farmára",list:"cenník",mkt:"trh",quote:"ponuka odberateľa",contract:"zmluva",last:"posledný predaj",burza:"odhad"};
function msg(all){const ok=all.filter(r=>r.best&&r.best.net>0).sort((a,b)=>(b.best.tot??b.best.net)-(a.best.tot??a.best.net));
  const L=[];for(const r of ok.slice(0,4)){const b=r.best;L.push(`<li><b>${e(CN(r.c))}:</b> kúp – <b>${e(b.a.name)}</b> za ${f0(b.a.price)} €/t${b.a.tons?` (${f1(b.a.tons)} t)`:""}, predaj – <b>${e(b.b.name)}</b> za ${f0(b.b.price)} €/t. Doprava ~${f0(b.t)} €/t${b.km!=null?` (${f0(b.km)} km)`:""} ${b.ux?`+ dovoz UA ~${f0(b.ux)} €/t `:""}→ marža <b>${sg(b.net)} €/t</b>${b.tot!=null?` ≈ <b>${f0(b.tot)} €</b>`:""}.${(()=>{const M=mix(r);return ` 🔢 ${e(M.vn)}${M.vk!==M.vn?` · 🔮 s vesmírom: <b>${e(M.vk)}</b>`:""}.`})()}${r.timing?(r.timing.hold?` Ak môžeš skladovať, burza ${e(r.timing.b.t)} platí po skladovaní o ${f0(r.timing.gain)} €/t viac.`:" Predávať priebežne, držanie sa podľa burzy neoplatí."):""}</li>`)}
  const neg=all.filter(r=>r.best&&r.best.net<=0).map(r=>CN(r.c)),miss=all.filter(r=>!r.best&&(r.src.length||r.trend.now!=null)).map(r=>CN(r.c));
  return `<div class="card prd-msg"><div class="row"><b>📩 Správa na dnes</b><small>${new Date().toLocaleDateString("sk-SK")}</small></div>
   ${L.length?`<ol class="prd-ol">${L.join("")}</ol>`:`<div class="s">Dnes nie je žiadna overená zisková kombinácia nákup → predaj. Doplň ponuky odberateľov nižšie, potom ti vypočítam, kam predať.</div>`}
   ${neg.length?`<div class="s">⛔ Neoplatí sa teraz: ${e(neg.join(", "))}.</div>`:""}
   ${miss.length?`<div class="s">❔ Chýba cena odberateľa: ${e(miss.join(", "))} – pridaj ponuku odberateľa, inak vidíš len orientačný výpočet voči burze.</div>`:""}
   <div class="s">Výpočet z čísel, nie záruka. Ceny trhov si pred obchodom potvrď.</div></div>`}

function comCard(R){const o=S.open[R.c],b=R.best,t=R.trend;
  let h=`<div class="card prd-c"><button type="button" class="prd-hd" data-prdo="${e(R.c)}" aria-expanded="${!!o}"><b>${e(CN(R.c))}</b>
   ${b?`<span class="pill ${b.net>0?"":"r"}">${sg(b.net)} €/t</span>`:R.ind?`<span class="pill g">orient. ${sg(R.ind.net)} €/t</span>`:`<span class="pill g">bez dát</span>`}
   ${t.now!=null?`<small>burza ${f0(t.now)}${t.d7!=null?` · 7d ${sg(t.d7)}`:""}</small>`:""}<span aria-hidden="true">${o?"▴":"▾"}</span></button>`;
  if(!o)return h+"</div>";
  if(b)h+=`<div class="box"><div><b>Najlepšie teraz:</b> kúp: <b>${e(b.a.name)}</b> (${e(KN[b.a.k])}) ${f0(b.a.price)} €/t → predaj: <b>${e(b.b.name)}</b> (${e(KN[b.b.k])}) ${f0(b.b.price)} €/t</div>
    <div class="s">Doprava ${f0(b.t)} €/t${b.b.tfix!=null?" · z regiónu farmárov (Kalkulačka)":b.km!=null?` · ${f0(b.km)} km`:" · vzdialenosť neznáma, použitých "+f0(S.cfg.defKm)+" km"}${+S.cfg.handle?` · manipulácia ${f0(S.cfg.handle)} €/t`:""} · marža <b>${sg(b.net)} €/t</b>${b.tot!=null?` · spolu ≈ ${f0(b.tot)} €`:""}</div></div>`;
  h+=cosmoBox(R);
  if(R.warn.length)h+=`<div class="prd-w">${R.warn.map(w=>`<div>⚠️ ${e(w)}</div>`).join("")}</div>`;
  // trend a časovanie
  const tl=[];if(t.now!=null)tl.push(`Burza teraz ${f0(t.now)} €/t${t.d7!=null?`, za 7 dní ${sg(t.d7)}`:""}${t.d30!=null?`, za 30 dní ${sg(t.d30)}`:""}.`);
  if(t.now!=null&&t.d7==null)tl.push("Trend sa začne ukazovať po pár dňoch – každý deň sa uloží záznam burzy.");
  if(R.timing){const T=R.timing;tl.push(`Termíny: ${e(T.a.t)} ${f0(T.a.p)} → ${e(T.b.t)} ${f0(T.b.p)} €/t (${sg(T.b.p-T.a.p)}). Skladovanie ${T.mo} mes. ≈ ${f0(T.cost)} €/t. ${T.hold?`<b>Držanie sa oplatí</b> (+${f0(T.gain)} €/t po nákladoch).`:"<b>Držanie sa neoplatí</b> – predávať priebežne."}`)}
  if(R.dom.length)tl.push("Trh platí farmárom: "+R.dom.map(d=>`${e(d.n)} ${f0(d.p)} €/t`).join(" · ")+(R.P?` · tvoj výkup ${f0(R.P.price)} €/t`:""));
  if(R.pos){const q=R.pos;tl.push(`📦 Otvorené nákupy: <b>${f0(q.t)} t</b> (${q.n}×) za priemerne ${f0(q.avg)} €/t${q.sale?` → najlepší predaj teraz <b>${e(q.sale.b.name)}</b> ${f0(q.sale.n)} €/t po doprave = <b>${sg(q.pl)} €/t</b>, spolu ≈ ${sg(q.pl*q.t)} €`:" – zatiaľ bez ponuky odberateľa"}.${q.hold?` 📈 Drž ${q.hold}×${q.until?" najneskôr do "+e(String(q.until).split("-").reverse().join(". ")):""}.`:""}${q.sell?` ⚠️ ${q.sell}× predaj / klesá.`:""}`)}
  if(R.hist)tl.push(`Tvoje obchody: ${R.hist.n}× · ${f0(R.hist.t)} t · priemerná marža ${sg(R.hist.m)} €/t.`);
  if(tl.length)h+=`<div class="s prd-tl">${tl.map(x=>`<div>${x}</div>`).join("")}</div>`;
  // ďalšie kombinácie
  const P=R.pairs.slice(0,8);if(P.length)h+=`<div class="prd-tb"><div class="prd-r hd"><span>Kde kúpiť</span><span>Kam predať</span><span>Doprava</span><span>Marža</span></div>${P.map(p=>`<div class="prd-r${p.b.ind?" ind":""}"><span>${e(p.a.name)}<small>${f0(p.a.price)} €/t · ${e(KN[p.a.k])}${p.a.age!=null&&p.a.age>14?` · ${p.a.age} dní staré`:""}</small></span><span>${e(p.b.name)}<small>${f0(p.b.price)} €/t${p.b.note?" · "+e(p.b.note):""}</small></span><span>${f0(p.t)} €/t<small>${p.km!=null?f0(p.km)+" km":"km ?"}</small></span><span><b class="${p.net>0?"pos":"neg"}">${sg(p.net)}</b>${p.tot!=null?`<small>≈ ${f0(p.tot)} €</small>`:""}</span></div>`).join("")}</div>`;
  else h+=`<div class="s">Zatiaľ žiadny zdroj ani odberateľ pre túto komoditu.</div>`;
  return h+"</div>"}

function quotes(){const Q=(S.cfg.quotes||[]).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))),T=today(),PL=S.pl.filter(p=>p.kind!=="fuel");
  const opts=typeof MK!=="undefined"?MK:coms().map(c=>[c,c]);
  return `<div class="card"><b>🏷️ Ponuky odberateľov (kam predať)</b><div class="s">Zapíš, koľko ti odberateľ ponúka. Čím viac ponúk, tým presnejšie „kam predať“. Zmluvy s odberateľmi zo Zúčtovania sa berú automaticky.</div>
   ${Q.length?`<div class="prd-q">${Q.map(q=>`<div class="row${q.till&&q.till<T?" old":""}"><span><b>${e(q.buyer)}</b> · ${e(CN(q.com))} · <b>${f0(q.price)} €/t</b>${q.km?` · ${f0(q.km)} km`:""}${q.till?` · do ${e(q.till.split("-").reverse().join(". "))}${q.till<T?" (neplatí)":""}`:""}</span><button type="button" class="copy" data-prdqdel="${e(q.id)}" aria-label="Zmazať">✕</button></div>`).join("")}</div>`:""}
   <form class="f" id="fPrdQ"><label>Odberateľ<input name="buyer" required placeholder="napr. Bunge, mlyn…"></label>
    <label>Komodita<select name="com">${opts.map(m=>`<option value="${e(m[0])}">${e(m[1])}</option>`).join("")}</select></label>
    <label>Cena €/t<input name="price" inputmode="decimal" required placeholder="0"></label>
    <label>Miesto<select name="place"><option value="">– podľa km –</option>${PL.map(p=>`<option value="${p.id}">${e(p.name)}</option>`).join("")}</select></label>
    <label>Km od dvora<input name="km" inputmode="decimal" placeholder="ak miesto nie je"></label>
    <label>Platí do<input name="till" type="date"></label>
    <div class="w btns"><button class="pri" type="submit">Pridať ponuku</button></div></form></div>`}

function cfgCard(){const C=S.cfg,o=S.open.__cfg;
  return `<div class="card"><button type="button" class="prd-hd" data-prdo="__cfg" aria-expanded="${!!o}"><b>⚙️ Doprava a náklady</b><small>${f1(C.rate)} €/km · ${f0(C.payload)} t${C.ret?" · s prázdnou cestou späť":""}</small><span aria-hidden="true">${o?"▴":"▾"}</span></button>
   ${o?`<form class="f" id="fPrdC"><label>Sadzba €/km<input name="rate" inputmode="decimal" value="${e(String(C.rate).replace(".",","))}"></label>
    <label>Náklad na auto (t)<input name="payload" inputmode="decimal" value="${e(C.payload)}"></label>
    <label>Skladovanie €/t/mesiac<input name="store" inputmode="decimal" value="${e(String(C.store).replace(".",","))}"></label>
    <label>Manipulácia €/t<input name="handle" inputmode="decimal" value="${e(String(C.handle).replace(".",","))}"></label>
    <label>Min. doprava €/t<input name="tmin" inputmode="decimal" value="${e(String(C.tmin).replace(".",","))}"></label>
    <label>Km, keď poloha chýba<input name="defKm" inputmode="decimal" value="${e(C.defKm)}"></label>
    <label>Báza burza → tu (keď chýba trh) €/t<input name="basis" inputmode="decimal" value="${e(C.basis)}"></label><label>Dovoz z Ukrajiny (clo, colník, fytosanita) €/t<input name="ua" inputmode="decimal" value="${e(C.ua??30)}"></label>
    <label class="w"><span><input type="checkbox" name="ret"${C.ret?" checked":""}> Počítať prázdnu cestu späť</span></label>
    ${S.flt?`<div class="w s">Sadzba flotily VALKO z nastavení: ${f1(S.flt)} €/km.</div>`:""}
    <div class="w btns"><button class="pri" type="submit">Uložiť</button></div></form>`:""}</div>`}

function review(){const T=today(),old=S.log.filter(l=>dAgo(l.d)>=7&&l.bz!=null);if(!old.length)return `<div class="card"><b>🔁 Prehodnotenie</b><div class="s">Každý deň sa uloží, čo som odporučil. Po týždni tu uvidíš, ako sa burza odvtedy pohla a či odporúčanie sedelo.</div></div>`;
  const last={};for(const l of old)last[l.c]=l;const L=Object.values(last).map(l=>{const now=bzNow(l.c);if(now==null)return "";const d=now-l.bz,ok=l.hold==null?null:(l.hold?d>0:d<=0);
    return `<div class="row"><span><b>${e(CN(l.c))}</b> · ${e(l.d.split("-").reverse().join(". "))}: burza ${f0(l.bz)} → ${f0(now)} (${sg(d)})${l.hold!=null?` · odporúčanie: ${l.hold?"držať":"predať"}`:""}</span>${ok==null?"":`<span class="pill ${ok?"":"w"}">${ok?"sedelo":"nesedelo"}</span>`}</div>`}).join("");
  return `<div class="card"><b>🔁 Prehodnotenie minulých odporúčaní</b><div class="s">Porovnanie s burzou o 7 a viac dní neskôr. Pomáha upraviť skladovanie a bázu v nastaveniach.</div>${L}</div>`}

function pinView(){const f=fails(),wait=f.n>=5&&Date.now()-f.t<5*6e4?Math.ceil((5*6e4-(Date.now()-f.t))/6e4):0,setup=!S.pin||S.pinMode==="new";
  return `<div class="card prd-pin"><b>🔒 Algomancia · AI veštenie obchodu</b><div class="s">${setup?"Nastav si PIN (4–8 číslic). Sekciu vidíš iba ty ako majiteľ a otvoríš ju len s PIN-om.":"Zadaj PIN. Po 15 minútach nečinnosti sa sekcia znova zamkne."}</div>
   ${wait?`<div class="prd-w">Priveľa nesprávnych pokusov. Skús o ${wait} min.</div>`:`<form class="f" id="fPrdPin"><label class="w">PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8" required autofocus></label>
   ${setup?`<label class="w">PIN znova<input name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8" required></label>`:""}
   ${S.pinErr?`<div class="w prd-w">${e(S.pinErr)}</div>`:""}<div class="w btns"><button class="pri" type="submit">${setup?"Uložiť PIN":"Odomknúť"}</button>${!setup?`<button type="button" data-prdforgot>Zabudol som PIN</button>`:""}</div></form>`}</div>`}

// ---------- 🤖 AI VEŠTBA (algomancia) – Claude prečíta čísla + oblohu + karty a vynesie verdikt ----------
const AI={d:null,at:0,busy:false};
const nmC=c=>typeof comName==="function"?comName(c):c;
const r0=n=>n==null||!isFinite(n)?null:Math.round(n*100)/100;
function aiCtx(all){const s=window.ASTRO?sky():null;
  const K=all.filter(R=>R.best||R.trend.now!=null||R.pos).map(R=>{const M=mix(R),z=M.cz,b=R.best;
    return {komodita:nmC(R.c),nasa_cena:R.P?r0(+R.P.price):null,burza_teraz:r0(R.trend.now),zmena_7d:r0(R.trend.d7),zmena_30d:r0(R.trend.d30),
      terminy:R.timing?{od:R.timing.a.t+" "+r0(R.timing.a.p),do:R.timing.b.t+" "+r0(R.timing.b.p),mesiacov:R.timing.mo,sklad_eur_t:r0(R.timing.cost),zisk_drzania_eur_t:r0(R.timing.gain)}:null,
      najlepsi_obchod:b?{kupit_od:b.a.name,za:r0(b.a.price),ton:b.a.tons,predat:b.b.name,za_predaj:r0(b.b.price),doprava:r0(b.t),cisty_eur_t:r0(b.net),spolu_eur:r0(b.tot)}:null,
      dalsie:R.pairs.filter(p=>!p.b.ind).slice(1,4).map(p=>({od:p.a.name,komu:p.b.name,cisty_eur_t:r0(p.net)})),
      historia:R.hist?{ton:r0(R.hist.t),marza_eur_t:r0(R.hist.m)}:null,
      otvorene_nakupy:R.pos?{ton:r0(R.pos.t),priemer_nakup:r0(R.pos.avg),najlepsi_predaj_po_doprave:R.pos.sale?r0(R.pos.sale.n):null,drz:R.pos.hold,predaj:R.pos.sell}:null,
      upozornenia:R.warn,verdikt_cisla:M.vn,verdikt_s_vesmirom:M.vk,
      karty:{tarot:z.draw.t,lenormand:z.draw.l,cigan:z.draw.c,smer_kariet:r0(z.cards)}}});
  return {dnes:today(),vaha_vesmiru_pct:+S.cfg.w||0,
    obloha:s?{mesiac:s.mp?(s.mp.waxing?"dorastá":"cúva")+" "+Math.round((s.mp.illum||s.mp.f||0)*100)+" %":null,
      spatne:Object.keys(s.R||{}).filter(k=>s.R[k]).map(k=>PN[k]||k),tranzity_skore:r0(transits().score)}:null,komodity:K}}
async function aiLoad(){if(AI.busy)return;AI.busy=true;try{const r=await sb.rpc("algo_ai_get");AI.d=r.error?{err:r.error.message}:r.data;AI.at=Date.now()}catch(x){}AI.busy=false;
  rr();if(AI.d&&AI.d.at&&!AI.d.done)setTimeout(()=>{AI.at=0;aiLoad()},8000)}
function aiCard(all){if(!AI.at&&!AI.busy)aiLoad();const A=AI.d||{},run=A.at&&!A.done,o=S.open.__ai!==false;
  const md=t=>e(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>");
  return `<div class="card prd-ai"><div class="row"><b>🤖 AI veštba dňa</b>${A.text?`<button type="button" class="copy" data-prdaitog>${o?"Skryť":"Zobraziť"}</button>`:""}</div>
   ${A.text&&o?`<div class="prd-ait"><small>${e(String(A.done||A.at||"").slice(0,10).split("-").reverse().join(". "))}</small>${md(A.text)}</div>`:""}
   ${A.err&&!A.text?`<div class="prd-w">⚠️ ${e(String(A.err).slice(0,160))}</div>`:""}
   ${!A.text&&!run?`<div class="s">AI prečíta všetky čísla (ponuky, cenník, burzu, odberateľov, dopravu, otvorené nákupy) aj dnešnú oblohu a karty a vynesie veštbu na každú komoditu.</div>`:""}
   <div class="btns"><button type="button" class="lime" data-prdai ${run?"disabled":""}>${run?"🔮 Veštím… (do minúty)":A.text?"🔮 Nová veštba":"🔮 Vyveštiť obchod"}</button></div></div>`}
document.addEventListener("click",async ev=>{const b=ev.target.closest&&ev.target.closest("[data-prdai],[data-prdaitog]");if(!b||!OWN()||typeof TAB==="undefined"||TAB!=="pred")return;ev.preventDefault();ev.stopPropagation();touch();
  if(b.dataset.prdaitog!==undefined){S.open.__ai=S.open.__ai===false;rr();return}
  b.disabled=true;let ctx;try{ctx=aiCtx(coms().map(evalCom))}catch(x){ctx={chyba:String(x.message||x)}}
  const r=await sb.rpc("algo_ai_now",{p_ctx:ctx});if(r.error){b.disabled=false;tst("Nepodarilo sa: "+r.error.message,6000);return}
  if(r.data==="chýba kľúč"){tst("Chýba kľúč ERNTE AI.",5000);b.disabled=false;return}
  AI.d={at:new Date().toISOString()};rr();setTimeout(()=>{AI.at=0;aiLoad()},7000)},true);
{const st=document.createElement("style");st.textContent=`.prd-ai{border-color:rgba(167,139,250,.55)!important;box-shadow:0 0 0 1px rgba(167,139,250,.25),0 12px 34px -14px rgba(167,139,250,.6)}
.prd-ai .row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.prd-ait{line-height:1.55;margin-top:8px;padding:12px;border-radius:16px;background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.25);overflow-wrap:anywhere}
.prd-ait b{color:#c4b5fd}.prd-ait small{display:block;opacity:.6;margin-bottom:4px}.prd-ai .btns{justify-content:center;margin-top:10px}`;document.head.appendChild(st)}
// ---------- 🃏 VÝKLAD KARIET PRE MARTINA – otázka na blízku budúcnosť, nové virtuálne zamiešanie pri každej otázke ----------
const TK={deck:"tarot",sp:"3",hz:"dni",q:"",cards:null,anim:false,d:null,at:0,busy:false};
const DECKS={tarot:["🃏 Tarot (78)",()=>TAROT.map(x=>x[0]),true],len:["🍀 Lenormand (36)",()=>LEN.map(x=>x[0]),false],cig:["🔮 Cigánske (32)",()=>CIG.map(x=>x[0]),false]};
const SPREADS={"1":["1 karta – rýchla odpoveď",["Odpoveď"]],"3":["3 karty – blízka budúcnosť",["Teraz","Čo príde","Výsledok"]],
  "5":["5 kariet – celý výklad",["Situácia","Prekážka","Rada","Čo príde","Výsledok"]]};
const HZ={dni:"najbližšie dni",tyz:"najbližšie 2 týždne",mes:"do konca mesiaca"};
const rnd=n=>{const a=new Uint32Array(1),lim=Math.floor(0x100000000/n)*n;let x;do{crypto.getRandomValues(a);x=a[0]}while(x>=lim);return x%n};
function shuffle(arr){const a=arr.slice();for(let pass=0;pass<7;pass++){for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}
  const cut=rnd(a.length);a.push(...a.splice(0,cut))}return a} // 7× premiešanie + sňatie, ako pri skutočných kartách
function draw(){const D=DECKS[TK.deck],pos=SPREADS[TK.sp][1],deck=shuffle(D[1]());
  return pos.map((p,i)=>({pos:p,n:deck[i],rv:D[2]?rnd(100)<30:false}))}
async function tkLoad(){if(TK.busy)return;TK.busy=true;try{const r=await sb.rpc("tarot_ai_get");TK.d=r.error?{err:r.error.message}:r.data;TK.at=Date.now()}catch(x){}TK.busy=false;rr();
  const c=TK.d&&TK.d.cur;if(c&&c.at&&!c.done)setTimeout(()=>{TK.at=0;tkLoad()},5000)}
const cardFace=(c,i)=>`<div class="tk-c${c.rv?" rv":""}${Date.now()-(TK.fresh||0)<2500?" fl":""}" style="--d:${i*0.18}s"><i class="tk-back"></i><div class="tk-face"><small>${e(c.pos)}</small><b>${e(c.n)}</b>${c.rv?`<em>obrátená</em>`:""}</div></div>`;
function tarotCard(){if(!TK.at&&!TK.busy)tkLoad();const cur=(TK.d&&TK.d.cur)||{},run=cur.at&&!cur.done,LG=(TK.d&&TK.d.log)||[],o=S.open.__tk!==false;
  const md=t=>e(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>");
  const cards=TK.cards||(cur.p&&cur.p.karty?cur.p.karty.map(k=>({pos:k.pozicia,n:k.karta,rv:!!k.obratena})):null);
  const opt=(o2,v)=>Object.entries(o2).map(([k,x])=>`<option value="${k}"${k===v?" selected":""}>${e(Array.isArray(x)?x[0]:x)}</option>`).join("");
  return `<div class="card tk"><div class="row"><b>🃏 Výklad kariet – moja blízka budúcnosť</b><button type="button" class="copy" data-tktog>${o?"Skryť":"Zobraziť"}</button></div>
   ${o?`<label class="tk-l">Tvoja otázka<textarea rows="2" maxlength="400" data-tkq placeholder="Napr. Vyjde obchod s repkou tento týždeň? · Čo ma čaká v najbližších dňoch?">${e(TK.q)}</textarea></label>
   <div class="tk-sel"><label>Karty<select data-tkset="deck">${opt(DECKS,TK.deck)}</select></label><label>Rozklad<select data-tkset="sp">${opt(SPREADS,TK.sp)}</select></label><label>Na kedy<select data-tkset="hz">${opt(HZ,TK.hz)}</select></label></div>
   <div class="btns"><button type="button" class="lime" data-tkgo ${run||TK.anim?"disabled":""}>${TK.anim?"🔀 Miešam karty…":run?"🔮 Vykladám…":"🔀 Zamiešať a vytiahnuť"}</button></div>
   ${TK.anim?`<div class="tk-shuf" aria-label="Miešam karty">${"<i></i>".repeat(7)}</div>`:cards?`<div class="tk-row">${cards.map(cardFace).join("")}</div>`:""}
   ${!TK.anim&&cur.p&&cur.p.otazka?`<div class="tk-qq">„${e(cur.p.otazka)}“ · ${e(cur.p.horizont||"")}</div>`:""}
   ${!TK.anim&&cur.text&&!run?`<div class="tk-ait">${md(cur.text)}</div>`:""}${!TK.anim&&run?`<div class="s tk-wait">🔮 Karty hovoria… výklad príde do pár sekúnd.</div>`:""}
   ${cur.err&&!run?`<div class="prd-w">⚠️ ${e(String(cur.err).slice(0,140))}</div>`:""}
   ${LG.length>1?`<details class="tk-h"><summary>🗂 Predchádzajúce výklady (${LG.length-1})</summary>${LG.slice(1,15).map(x=>`<div class="tk-hi"><small>${e(new Date(x.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}))} · ${e(((x.p&&x.p.karty)||[]).map(k=>k.karta+(k.obratena?" (obr.)":"")).join(", "))}</small><b>${e((x.p&&x.p.otazka)||"všeobecne")}</b><div>${md(x.text||"")}</div></div>`).join("")}</details>`:""}`:""}</div>`}
document.addEventListener("input",ev=>{if(ev.target.matches&&ev.target.matches("[data-tkq]"))TK.q=ev.target.value},true);
document.addEventListener("change",ev=>{const t=ev.target;if(t.dataset&&t.dataset.tkset){TK[t.dataset.tkset]=t.value;TK.cards=null}},true);
document.addEventListener("click",async ev=>{const b=ev.target.closest&&ev.target.closest("[data-tkgo],[data-tktog]");if(!b||!OWN()||typeof TAB==="undefined"||TAB!=="pred")return;ev.preventDefault();ev.stopPropagation();touch();
  if(b.dataset.tktog!==undefined){S.open.__tk=S.open.__tk===false;rr();return}
  const q=(TK.q||"").trim();TK.anim=true;TK.cards=null;rr();
  const C=draw();await new Promise(r=>setTimeout(r,1500));TK.anim=false;TK.cards=C;TK.fresh=Date.now();rr();
  let mp=null;try{if(window.ASTRO){const m=ASTRO.moonPhase(new Date());mp=(m.waxing?"dorastajúci":"cúvajúci")+" Mesiac, "+Math.round(m.illum*100)+" %"}}catch(x){}
  const p={otazka:q||"Čo ma čaká?",balicek:DECKS[TK.deck][0],rozklad:SPREADS[TK.sp][0],horizont:HZ[TK.hz],mesiac:mp,narodeny:(S.natal&&S.natal.date)||null,
    karty:C.map(c=>({pozicia:c.pos,karta:c.n,obratena:c.rv}))};
  const r=await sb.rpc("tarot_ai_now",{p});
  if(r.error){tst("Výklad sa nepodaril: "+r.error.message,6000);return}
  if(r.data==="chýba kľúč"){tst("Chýba kľúč ERNTE AI.",5000);return}
  if(r.data==="beží"){tst("Predchádzajúci výklad ešte beží – chvíľu počkaj.",4000);return}
  TK.d=Object.assign({},TK.d||{},{cur:{at:new Date().toISOString(),p}});rr();setTimeout(()=>{TK.at=0;tkLoad()},4000)},true);
{const st=document.createElement("style");st.textContent=`.tk{border-color:rgba(251,191,36,.5)!important;box-shadow:0 0 0 1px rgba(251,191,36,.2),0 12px 34px -14px rgba(251,191,36,.5)}
.tk .row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.tk-l{display:grid;gap:4px;margin-top:10px;font-size:.85rem}.tk-l textarea{width:100%;box-sizing:border-box;font:500 1rem/1.4 system-ui;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:10px}
.tk-sel{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px}.tk-sel label{display:grid;gap:4px;font-size:.8rem;min-width:0}
.tk-sel select{width:100%;min-height:44px;font:600 .9rem system-ui;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:0 8px}
.tk .btns{justify-content:center;margin-top:10px}
.tk-row{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:14px;perspective:900px}
.tk-c{position:relative;width:96px;height:150px;flex:0 0 auto;transform-style:preserve-3d}.tk-c.fl{animation:tkflip .7s ease-out both;animation-delay:var(--d)}
.tk-back,.tk-face{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.tk-back{background:repeating-linear-gradient(45deg,#3b2a6b 0 6px,#2a1d52 6px 12px);border:2px solid #fbbf24;transform:rotateY(180deg)}
.tk-face{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;text-align:center;background:radial-gradient(120% 90% at 50% 0%,rgba(251,191,36,.28),transparent 60%),linear-gradient(170deg,#241c3d,#120e22);border:2px solid rgba(251,191,36,.75);box-shadow:0 0 18px rgba(251,191,36,.35)}
.tk-face small{font-size:.66rem;opacity:.7;text-transform:uppercase;letter-spacing:.05em}.tk-face b{font-size:.92rem;line-height:1.2;color:#fde68a;overflow-wrap:anywhere}.tk-face em{font-style:normal;font-size:.68rem;color:#fca5a5}
.tk-c.rv .tk-face b{transform:rotate(180deg)}
@keyframes tkflip{from{transform:rotateY(180deg) translateY(-16px);opacity:0}to{transform:rotateY(0) translateY(0);opacity:1}}
.tk-shuf{position:relative;height:150px;margin-top:14px}.tk-shuf i{position:absolute;left:50%;top:0;width:96px;height:150px;margin-left:-48px;border-radius:12px;background:repeating-linear-gradient(45deg,#3b2a6b 0 6px,#2a1d52 6px 12px);border:2px solid #fbbf24;box-shadow:0 6px 18px rgba(0,0,0,.5);animation:tkshuf .5s ease-in-out infinite alternate}
.tk-shuf i:nth-child(2n){animation-direction:alternate-reverse}.tk-shuf i:nth-child(1){animation-delay:0s}.tk-shuf i:nth-child(2){animation-delay:.07s}.tk-shuf i:nth-child(3){animation-delay:.14s}.tk-shuf i:nth-child(4){animation-delay:.21s}.tk-shuf i:nth-child(5){animation-delay:.28s}.tk-shuf i:nth-child(6){animation-delay:.35s}.tk-shuf i:nth-child(7){animation-delay:.42s}
@keyframes tkshuf{0%{transform:translateX(-60px) rotate(-12deg)}100%{transform:translateX(60px) rotate(12deg)}}
@media (prefers-reduced-motion:reduce){.tk-c,.tk-shuf i{animation:none}}
.tk-qq{text-align:center;font-style:italic;opacity:.8;margin-top:10px;overflow-wrap:anywhere}
.tk-ait{line-height:1.55;margin-top:10px;padding:12px;border-radius:16px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.25);overflow-wrap:anywhere}.tk-ait b{color:#fde68a}
.tk-wait{text-align:center;margin-top:8px}
.tk-h{margin-top:12px;border-top:1px solid rgba(255,255,255,.1);padding-top:8px}.tk-h summary{cursor:pointer;font-weight:700;min-height:40px;display:flex;align-items:center}
.tk-hi{padding:8px 0;border-top:1px solid rgba(255,255,255,.07);display:grid;gap:3px;overflow-wrap:anywhere}.tk-hi small{opacity:.6}.tk-hi div{font-size:.9rem;opacity:.9}`;document.head.appendChild(st)}
window.vPred=function(){if(!OWN())return "";
  if(!S.cfg){load(true);return `<div class="card"><div class="s">Načítavam…</div></div>`}
  if(!unlocked()||S.pinMode==="new")return pinView();
  touch();if(!S.at&&!S.busy){load(true);return `<div class="card"><div class="s">Počítam…</div></div>`}
  const all=coms().map(evalCom),sel=S.sel;
  let h=`<div class="card prd-top"><div class="row"><b>🔮 Algomancia · AI veštenie obchodu</b><span class="btns"><button type="button" class="copy" data-prdref>↻</button><button type="button" class="copy" data-prdpin>Zmeniť PIN</button><button type="button" class="copy" data-prdlock>🔒 Zamknúť</button></span></div>
   <div class="s">Kde kúpiť, kam predať a kedy – z ponúk farmárov, tvojho cenníka, trhov (HU, SK, UA hranica), burzy, ponúk a zmlúv odberateľov a nákladov dopravy.${S.mj&&S.mj.updatedAt?` Trhy: ${e(new Date(S.mj.updatedAt).toLocaleDateString("sk-SK"))}.`:""}</div>${S.err?`<div class="prd-w">⚠️ ${e(S.err)}</div>`:""}</div>`;
  h+=aiCard(all)+tarotCard();
  h+=msg(all);
  h+=all.filter(r=>r.src.length||r.snk.some(s=>!s.ind)||r.trend.now!=null).map(comCard).join("")||`<div class="card"><div class="s">Zatiaľ chýbajú ceny.</div></div>`;
  h+=natalCard()+accCard()+quotes()+cfgCard()+review();
  return h};

// ---------- udalosti ----------
document.addEventListener("click",async ev=>{if(!OWN())return;const t=ev.target;let x;
  if(x=t.closest("[data-prdo]")){const k=x.dataset.prdo;S.open[k]=!S.open[k];touch();rr();return}
  if(t.closest("[data-prdlock]")){lock();S.at=0;rr();return}
  if(t.closest("[data-prdref]")){touch();await load(true);tst("Prepočítané.");return}
  if(t.closest("[data-prdpin]")){S.pinMode="new";S.pinErr="";rr();return}
  if(x=t.closest("[data-prdqdel]")){if(!x.dataset.arm){x.dataset.arm=1;x.textContent="Zmazať?";setTimeout(()=>{x.dataset.arm="";x.textContent="✕"},3000);return}
    const C=Object.assign({},S.cfg,{quotes:(S.cfg.quotes||[]).filter(q=>q.id!==x.dataset.prdqdel)});try{await stSet("pred_cfg",C);S.cfg=C;rr()}catch(er){tst("Chyba: "+er.message,6000)}return}
  if(t.closest("[data-prdforgot]")){const u=(await sb.auth.getUser()).data.user;if(!u||!u.email){tst("Nepodarilo sa overiť účet.");return}
    const pw=prompt("Na zrušenie PIN-u zadaj heslo k svojmu účtu ERNTE:");if(!pw)return;const r=await sb.auth.signInWithPassword({email:u.email,password:pw});
    if(r.error){tst("Nesprávne heslo.");return}try{await sb.from("ai_state").delete().eq("key","pred_pin");S.pin=null;setFails({n:0,t:0});S.pinErr="";rr();tst("PIN zrušený, nastav nový.")}catch(er){tst("Chyba: "+er.message)}return}});
document.addEventListener("submit",async ev=>{const f=ev.target;if(!OWN()||!["fPrdPin","fPrdQ","fPrdC","fPrdN"].includes(f.id))return;ev.preventDefault();ev.stopPropagation();
  const d=new FormData(f),b=f.querySelector("button[type=submit]");
  if(f.id==="fPrdPin"){const pin=String(d.get("pin")||"");if(!/^\d{4,8}$/.test(pin)){S.pinErr="PIN musí mať 4 až 8 číslic.";rr();return}
    if(!crypto||!crypto.subtle){S.pinErr="Prehliadač nepodporuje bezpečné overenie PIN.";rr();return}
    if(!S.pin||S.pinMode==="new"){if(pin!==String(d.get("pin2")||"")){S.pinErr="PIN-y sa nezhodujú.";rr();return}
      const salt=hex(crypto.getRandomValues(new Uint8Array(16)));const v={salt,h:await pbk(pin,salt),at:new Date().toISOString()};
      try{await stSet("pred_pin",v);S.pin=v;S.pinMode=null;S.pinErr="";sessionStorage.setItem(LK,String(Date.now()));S.at=0;rr();tst("PIN uložený.")}catch(er){S.pinErr="Neuložené: "+er.message;rr()}return}
    const fl=fails();if(fl.n>=5&&Date.now()-fl.t<5*6e4){rr();return}if(b)b.disabled=true;
    const ok=(await pbk(pin,S.pin.salt))===S.pin.h;if(b)b.disabled=false;
    if(!ok){const n=(Date.now()-fl.t>5*6e4?0:fl.n)+1;setFails({n,t:Date.now()});S.pinErr=n>=5?"Priveľa pokusov.":`Nesprávny PIN (${n}/5).`;rr();return}
    setFails({n:0,t:0});S.pinErr="";try{sessionStorage.setItem(LK,String(Date.now()))}catch(x){}S.at=0;load(true);rr();return}
  touch();
  if(f.id==="fPrdQ"){const price=N(d.get("price"));if(!(price>0)){tst("Zadaj cenu.");return}
    const q={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),buyer:String(d.get("buyer")).trim().slice(0,80),com:d.get("com"),price,place:d.get("place")||null,km:N(d.get("km")),till:d.get("till")||null,at:today()};
    const C=Object.assign({},S.cfg,{quotes:[...(S.cfg.quotes||[]),q].slice(-300)});if(typeof busy==="function")busy(b,true);
    try{await stSet("pred_cfg",C);S.cfg=C;tst("Ponuka pridaná.");rr()}catch(er){tst("Chyba: "+er.message,6000)}if(typeof busy==="function")busy(b,false);return}
  if(f.id==="fPrdN"){const ds=String(d.get("date")||"").trim(),m=ds.match(/^(\d{1,2})[.\/\- ]\s*(\d{1,2})[.\/\- ]\s*(\d{4})$/)||ds.match(/^(\d{2})(\d{2})(\d{4})$/);
    if(!m){tst("Dátum napíš ako DD.MM.RRRR, napr. 05.03.1980.",5000);return}const dd=+m[1],mm=+m[2],yy=+m[3],dt=new Date(Date.UTC(yy,mm-1,dd));
    if(dt.getUTCDate()!==dd||dt.getUTCMonth()!==mm-1||yy<1900||dt>new Date()){tst("Taký dátum neexistuje – skontroluj deň, mesiac a rok.",5000);return}
    let tm=String(d.get("time")||"").trim().replace(/[.,h ]/g,":");const tmm=tm.match(/^(\d{1,2}):?(\d{2})$/);tm=tmm&&+tmm[1]<24&&+tmm[2]<60?String(tmm[1]).padStart(2,"0")+":"+tmm[2]:"12:00";
    const N={name:String(d.get("name")||"").trim().slice(0,60),date:`${yy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`,time:tm,timeUnknown:!tmm,place:String(d.get("place")||"").trim().slice(0,80),lat:N_(d.get("lat")),lon:N_(d.get("lon"))};
    if((N.lat==null||N.lon==null)&&N.place){try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=sk&q="+encodeURIComponent(N.place));const j=await r.json();if(j&&j[0]){N.lat=Math.round(+j[0].lat*1000)/1000;N.lon=Math.round(+j[0].lon*1000)/1000}}catch(x){}}
    if(N.lat==null||N.lon==null){tst("Napíš miesto narodenia (obec/mesto) – súradnice sa doplnia samé.",5000);return}
    if(N.timeUnknown)tst("Čas neznámy – počítam s 12:00 (ascendent nebude presný).",4000);const C=Object.assign({},S.cfg,{w:Math.max(0,Math.min(100,+d.get("w")||0))});
    try{await stSet("pred_natal",N);await stSet("pred_cfg",C);S.natal=N;S.cfg=C;S.open.__nat=false;tst("Uložené.");rr()}catch(er){tst("Chyba: "+er.message,6000)}return}
  if(f.id==="fPrdC"){const C=Object.assign({},S.cfg);for(const k of ["rate","payload","store","handle","tmin","defKm","basis","ua"]){const v=N(d.get(k));if(v!=null&&v>=0)C[k]=v}C.ret=!!d.get("ret");if(!(C.payload>0))C.payload=25;
    try{await stSet("pred_cfg",C);S.cfg=C;S.open.__cfg=false;tst("Uložené.");rr()}catch(er){tst("Chyba: "+er.message,6000)}}},true);
document.addEventListener("input",ev=>{const t=ev.target;if(t&&t.matches&&t.matches("[data-prddate]")&&!(ev.inputType||"").startsWith("delete")){let v=t.value.replace(/[^\d]/g,"").slice(0,8);t.value=v.length>4?v.slice(0,2)+"."+v.slice(2,4)+"."+v.slice(4):v.length>2?v.slice(0,2)+"."+v.slice(2):v;return}
  if(t&&t.matches&&t.matches("[data-prdtime]")&&!(ev.inputType||"").startsWith("delete")){let v=t.value.replace(/[^\d]/g,"").slice(0,4);t.value=v.length>2?v.slice(0,2)+":"+v.slice(2):v;return}
  const r=ev.target.closest&&ev.target.closest("[data-prdw]");if(r){const o=document.getElementById("prdWv");if(o)o.textContent=r.value+" %"}});
// zamknutie po nečinnosti a pri odchode zo záložky
setInterval(()=>{if(OWN()&&typeof TAB!=="undefined"&&TAB==="pred"&&S.cfg&&!unlocked()&&!document.querySelector("#fPrdPin"))rr()},30000);
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-tab]");if(b&&b.dataset.tab!=="pred")lock()},true);
document.addEventListener("visibilitychange",()=>{if(document.hidden)try{sessionStorage.setItem(LK+"-h",String(Date.now()))}catch(x){}else{try{const h=+sessionStorage.getItem(LK+"-h")||0;if(h&&Date.now()-h>IDLE)lock()}catch(x){}rr()}});

// štýly
const st=document.createElement("style");st.textContent=`
.prd-hd{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%}.prd-hd>b{flex:1 1 auto}.prd-hd small{color:var(--muted);font-size:.75rem}
.prd-ol{margin:0;padding-left:20px;display:grid;gap:8px;font-size:.88rem;line-height:1.45}
.prd-w{background:rgba(255,207,90,.10);border:1px solid rgba(255,207,90,.35);border-radius:14px;padding:8px 12px;font-size:.82rem;display:grid;gap:4px}
.prd-tl{display:grid;gap:4px}
.prd-tb{display:grid;font-size:.8rem}.prd-r{display:grid;grid-template-columns:1.3fr 1.3fr .8fr .8fr;gap:8px;padding:7px 0;border-top:1px solid var(--line);min-width:0}
.prd-r span{min-width:0;overflow-wrap:anywhere}.prd-r small{display:block;color:var(--muted);font-size:.72rem}.prd-r.hd{color:var(--muted);font-size:.72rem;border-top:0}
.prd-r.ind{opacity:.75}.prd-r .pos{color:var(--lime)}.prd-r .neg{color:var(--bad)}
.prd-q .row{padding:6px 0;border-top:1px solid var(--line)}.prd-q .row.old{opacity:.5}
.prd-msg{border-color:rgba(182,255,59,.4)}
.prd-cos{border:1px solid rgba(124,196,255,.35);background:rgba(124,196,255,.06);border-radius:16px;padding:10px 12px;display:grid;gap:5px}
.prd-vs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.prd-vs>div{display:grid;gap:2px;font-size:.84rem}.prd-vs small{color:var(--muted);font-size:.72rem}
.prd-r.prd-a{grid-template-columns:1.4fr 1fr 1fr}.prd-r.prd-a small{display:inline;margin-left:6px}
input[type=range][data-prdw]{width:100%}
@media(max-width:520px){.prd-r{grid-template-columns:1fr 1fr}.prd-r.hd{display:none}}`;
document.head.appendChild(st);
})();
