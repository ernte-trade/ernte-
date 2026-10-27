// ===== 🔮 PREDIKCIA OBCHODU – iba majiteľ, zamknuté PIN-om =====
// Vyhodnocuje nákup a predaj komodít z čísel: ponuky farmárov, výkupný cenník, fyzické trhy (market.json),
// burza (market_px + termíny v market.json), ponuky odberateľov a zmluvy s odberateľmi, doprava podľa vzdialenosti.
// Odporúčania sa ukladajú a neskôr porovnávajú s vývojom burzy (prehodnotenie).
// „Karta dňa“ je iba pre zábavu – do výpočtov ani odporúčaní NEVSTUPUJE.
// Dáta sú v ai_state (RLS: iba is_owner()), PIN je uložený len ako PBKDF2 hash.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>(typeof toast==="function"?toast:alert)(t,ms);
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const rr=()=>{if(typeof renderStaff==="function"&&OWN()&&typeof TAB!=="undefined"&&TAB==="pred")renderStaff()};
const CN=c=>typeof comName==="function"?comName(c):c;
const f0=x=>Number.isFinite(+x)&&x!==null&&x!==""?Math.round(+x).toLocaleString("sk-SK"):"–";
const f1=x=>Number.isFinite(+x)&&x!==null?(+x).toLocaleString("sk-SK",{maximumFractionDigits:1}):"–";
const sg=x=>(x>0?"+":x<0?"−":"±")+f0(Math.abs(x));
const N=v=>{const x=parseFloat(String(v??"").replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null};
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const dAgo=s=>Math.round((new Date(today())-new Date(String(s).slice(0,10)))/864e5);

// ---------- nastavenia (predvolené) ----------
const DEF={rate:1.5,payload:25,ret:true,store:2.5,handle:0,tmin:4,defKm:120,basis:45};
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
    const st=await stGet(["pred_cfg","pred_pin","pred_hist","pred_log","pred_nov"]);
    S.cfg=Object.assign({},DEF,{quotes:[]},st.pred_cfg||{});S.pin=st.pred_pin||null;S.hist=st.pred_hist||[];S.log=st.pred_log||[];S.nov=st.pred_nov||null;
    if(!unlocked()){S.at=0;S.busy=false;rr();return}
    const q=await Promise.all([
      fetch("market.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
      sb.from("market_px").select("*"),
      sb.from("farmer_offers").select("id,farmer_id,com,price,tons,status,place,dev_lat,dev_lon,geo,pickup_date,created_at").in("status",["nova","protinavrh"]).order("created_at",{ascending:false}).limit(200),
      sb.from("places").select("id,name,kind,lat,lon"),
      sb.from("buy_contracts").select("*"),
      sb.from("deal_fin").select("*"),
      sb.from("fleet_cfg").select("key,value").eq("key","costs")]);
    S.mj=q[0];S.mkt=q[1].error?{}:Object.fromEntries((q[1].data||[]).map(x=>[x.sym,x]));
    S.off=q[2].error?[]:(q[2].data||[]);S.pl=q[3].error?[]:(q[3].data||[]);S.bc=q[4].error?[]:(q[4].data||[]);
    S.df=q[5].error?[]:(q[5].data||[]);const fc=!q[6].error&&q[6].data&&q[6].data[0]&&q[6].data[0].value;S.flt=fc&&+fc.rate||null;
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
  if(P)out.push({k:"list",name:"farmári za tvoj cenník",price:+P.price,tons:null,pos:y});
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
  const dom=((S.mj&&S.mj.rows)||[]).filter(r=>r.c===c&&r.kind==="fyzický"&&/hazai|miesto produkcie/i.test(r.place)).sort((a,b)=>b.price-a.price)[0];
  if(dom)out.push({k:"burza",name:"orientačne: "+dom.market,price:+dom.price,pos:null,km:+S.cfg.defKm||0,note:"cena farmárom "+dom.date.split("-").reverse().join(". ")+" · doprava odhad "+f0(S.cfg.defKm)+" km – zapíš skutočnú ponuku",ind:true});
  else{const bz=bzNow(c);if(bz!=null)out.push({k:"burza",name:"orientačne: burza − báza",price:bz-(+S.cfg.basis||0),pos:null,km:+S.cfg.defKm||0,note:"burza "+f0(bz)+" €/t − báza "+f0(S.cfg.basis)+" €/t",ind:true})}
  return out}

// ---------- vyhodnotenie komodity ----------
function evalCom(c){const src=sources(c),snk=sinks(c),y=yard(),C=S.cfg,H=+C.handle||0;
  const leg=(a,b)=>{if(b.km!=null)return b.km+(a.pos?km(a.pos,y)||0:0);if(a.pos&&b.pos)return km(a.pos,b.pos);if(b.pos)return km(y,b.pos)+(a.pos?0:0);return null};
  const pairs=[];for(const a of src)for(const b of snk){const k=leg(a,b),t=tcost(k);
    pairs.push({a,b,km:k,t,net:b.price-a.price-t-H,tot:a.tons?(b.price-a.price-t-H)*a.tons:null})}
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
  return {c,src,snk,pairs,best,ind,timing,trend,P,dom,hist,warn}}
function mIdx(t){const m={jan:0,feb:1,mar:2,apr:3,máj:4,maj:4,may:4,jún:5,jun:5,júl:6,jul:6,aug:7,sep:8,okt:9,oct:9,nov:10,dec:11},x=String(t||"").toLowerCase().match(/([a-záéíóúýčďľňŕšťž]+)\s*(\d{4})/);
  if(!x||m[x[1]]==null)return null;return +x[2]*12+m[x[1]]}
const coms=()=>{const M=typeof MK!=="undefined"?MK.map(m=>m[0]):["repka","lo","ho","soja","psenica_p","psenica_k","jacmen_k","jacmen_s","kukurica","cirok"];return M};

// ---------- uloženie odporúčaní (na neskoršie prehodnotenie) ----------
async function logRecs(){const d=today();if(S.log.some(l=>l.d===d))return;const add=[];
  for(const c of coms()){const R=evalCom(c),b=R.best;if(!b&&R.trend.now==null)continue;
    add.push({d,c,buy:b?b.a.price:null,sell:b?b.b.price:null,net:b?Math.round(b.net):null,from:b?b.a.name:null,to:b?b.b.name:null,bz:R.trend.now,hold:R.timing?R.timing.hold:null})}
  if(!add.length)return;S.log=[...S.log,...add].slice(-600);try{await stSet("pred_log",S.log)}catch(x){}}
async function novinka(){if(S.nov)return;try{const r=await sb.from("app_novinky").insert({titul:"🔮 Predikcia obchodu",kde:"záložka Predikcia (iba majiteľ, PIN)",kto:"majiteľ",aud:"owner",
  popis:"Kde kúpiť a kam predať komodity, marža po doprave, časovanie podľa burzy, prehodnotenie minulých odporúčaní. Zamknuté PIN-om.",zdroj:"majiteľ"});
  if(!r.error){S.nov={at:new Date().toISOString()};await stSet("pred_nov",S.nov)}}catch(x){}}

// ---------- karta dňa (iba pre zábavu) ----------
const CARDS=[["Jazdec","rýchla správa"],["Ďatelina","malé šťastie"],["Loď","cesta, obchod do diaľky"],["Dom","stabilita"],["Strom","pomalý rast"],["Oblaky","neistota"],["Had","opatrne s partnermi"],["Kytica","príjemné prekvapenie"],["Kosa","rýchle rozhodnutie"],["Vtáky","veľa rozhovorov"],["Líška","pozor na lesť"],["Medveď","sila, kapitál"],["Hviezdy","jasný smer"],["Bocian","zmena"],["Pes","verný partner"],["Veža","úrady, formality"],["Hora","prekážka"],["Cesta","voľba"],["Myši","drobné straty"],["Srdce","dobrý vzťah"],["Prsteň","zmluva"],["Kniha","niečo skryté"],["List","dokument"],["Ľalie","trpezlivosť"],["Slnko","úspech"],["Mesiac","uznanie"],["Kľúč","riešenie"],["Ryby","peniaze, obchod"],["Kotva","istota"],["Kríž","povinnosť"]];
function card(){const d=today();let h=0;for(const ch of d+"ernte")h=(h*31+ch.charCodeAt(0))>>>0;const c=CARDS[h%CARDS.length];
  return `<div class="card prd-card"><div class="row"><b>🃏 Karta dňa: ${e(c[0])}</b><span class="pill g">len pre zábavu</span></div><div class="s">${e(c[1])}. Karta nemá žiadny vplyv na výpočty ani odporúčania vyššie – tie stoja iba na cenách, doprave a burze.</div></div>`}

// ---------- zobrazenie ----------
const KN={offer:"ponuka farmára",list:"cenník",mkt:"trh",quote:"ponuka odberateľa",contract:"zmluva",burza:"odhad"};
function msg(all){const ok=all.filter(r=>r.best&&r.best.net>0).sort((a,b)=>(b.best.tot??b.best.net)-(a.best.tot??a.best.net));
  const L=[];for(const r of ok.slice(0,4)){const b=r.best;L.push(`<li><b>${e(CN(r.c))}:</b> kúp – <b>${e(b.a.name)}</b> za ${f0(b.a.price)} €/t${b.a.tons?` (${f1(b.a.tons)} t)`:""}, predaj – <b>${e(b.b.name)}</b> za ${f0(b.b.price)} €/t. Doprava ~${f0(b.t)} €/t${b.km!=null?` (${f0(b.km)} km)`:""} → marža <b>${sg(b.net)} €/t</b>${b.tot!=null?` ≈ <b>${f0(b.tot)} €</b>`:""}.${r.timing?(r.timing.hold?` Ak môžeš skladovať, burza ${e(r.timing.b.t)} platí po skladovaní o ${f0(r.timing.gain)} €/t viac.`:" Predávať priebežne, držanie sa podľa burzy neoplatí."):""}</li>`)}
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
    <div class="s">Doprava ${f0(b.t)} €/t${b.km!=null?` · ${f0(b.km)} km`:" · vzdialenosť neznáma, použitých "+f0(S.cfg.defKm)+" km"}${+S.cfg.handle?` · manipulácia ${f0(S.cfg.handle)} €/t`:""} · marža <b>${sg(b.net)} €/t</b>${b.tot!=null?` · spolu ≈ ${f0(b.tot)} €`:""}</div></div>`;
  if(R.warn.length)h+=`<div class="prd-w">${R.warn.map(w=>`<div>⚠️ ${e(w)}</div>`).join("")}</div>`;
  // trend a časovanie
  const tl=[];if(t.now!=null)tl.push(`Burza teraz ${f0(t.now)} €/t${t.d7!=null?`, za 7 dní ${sg(t.d7)}`:""}${t.d30!=null?`, za 30 dní ${sg(t.d30)}`:""}.`);
  if(t.now!=null&&t.d7==null)tl.push("Trend sa začne ukazovať po pár dňoch – každý deň sa uloží záznam burzy.");
  if(R.timing){const T=R.timing;tl.push(`Termíny: ${e(T.a.t)} ${f0(T.a.p)} → ${e(T.b.t)} ${f0(T.b.p)} €/t (${sg(T.b.p-T.a.p)}). Skladovanie ${T.mo} mes. ≈ ${f0(T.cost)} €/t. ${T.hold?`<b>Držanie sa oplatí</b> (+${f0(T.gain)} €/t po nákladoch).`:"<b>Držanie sa neoplatí</b> – predávať priebežne."}`)}
  if(R.dom.length)tl.push("Trh platí farmárom: "+R.dom.map(d=>`${e(d.n)} ${f0(d.p)} €/t`).join(" · ")+(R.P?` · tvoj výkup ${f0(R.P.price)} €/t`:""));
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
    <label>Báza burza → tu (keď chýba trh) €/t<input name="basis" inputmode="decimal" value="${e(C.basis)}"></label>
    <label class="w"><span><input type="checkbox" name="ret"${C.ret?" checked":""}> Počítať prázdnu cestu späť</span></label>
    ${S.flt?`<div class="w s">Sadzba flotily VALKO z nastavení: ${f1(S.flt)} €/km.</div>`:""}
    <div class="w btns"><button class="pri" type="submit">Uložiť</button></div></form>`:""}</div>`}

function review(){const T=today(),old=S.log.filter(l=>dAgo(l.d)>=7&&l.bz!=null);if(!old.length)return `<div class="card"><b>🔁 Prehodnotenie</b><div class="s">Každý deň sa uloží, čo som odporučil. Po týždni tu uvidíš, ako sa burza odvtedy pohla a či odporúčanie sedelo.</div></div>`;
  const last={};for(const l of old)last[l.c]=l;const L=Object.values(last).map(l=>{const now=bzNow(l.c);if(now==null)return "";const d=now-l.bz,ok=l.hold==null?null:(l.hold?d>0:d<=0);
    return `<div class="row"><span><b>${e(CN(l.c))}</b> · ${e(l.d.split("-").reverse().join(". "))}: burza ${f0(l.bz)} → ${f0(now)} (${sg(d)})${l.hold!=null?` · odporúčanie: ${l.hold?"držať":"predať"}`:""}</span>${ok==null?"":`<span class="pill ${ok?"":"w"}">${ok?"sedelo":"nesedelo"}</span>`}</div>`}).join("");
  return `<div class="card"><b>🔁 Prehodnotenie minulých odporúčaní</b><div class="s">Porovnanie s burzou o 7 a viac dní neskôr. Pomáha upraviť skladovanie a bázu v nastaveniach.</div>${L}</div>`}

function pinView(){const f=fails(),wait=f.n>=5&&Date.now()-f.t<5*6e4?Math.ceil((5*6e4-(Date.now()-f.t))/6e4):0,setup=!S.pin||S.pinMode==="new";
  return `<div class="card prd-pin"><b>🔒 Predikcia obchodu</b><div class="s">${setup?"Nastav si PIN (4–8 číslic). Sekciu vidíš iba ty ako majiteľ a otvoríš ju len s PIN-om.":"Zadaj PIN. Po 15 minútach nečinnosti sa sekcia znova zamkne."}</div>
   ${wait?`<div class="prd-w">Priveľa nesprávnych pokusov. Skús o ${wait} min.</div>`:`<form class="f" id="fPrdPin"><label class="w">PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8" required autofocus></label>
   ${setup?`<label class="w">PIN znova<input name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8" required></label>`:""}
   ${S.pinErr?`<div class="w prd-w">${e(S.pinErr)}</div>`:""}<div class="w btns"><button class="pri" type="submit">${setup?"Uložiť PIN":"Odomknúť"}</button>${!setup?`<button type="button" data-prdforgot>Zabudol som PIN</button>`:""}</div></form>`}</div>`}

window.vPred=function(){if(!OWN())return "";
  if(!S.cfg){load(true);return `<div class="card"><div class="s">Načítavam…</div></div>`}
  if(!unlocked()||S.pinMode==="new")return pinView();
  touch();if(!S.at&&!S.busy){load(true);return `<div class="card"><div class="s">Počítam…</div></div>`}
  const all=coms().map(evalCom),sel=S.sel;
  let h=`<div class="card prd-top"><div class="row"><b>🔮 Predikcia obchodu</b><span class="btns"><button type="button" class="copy" data-prdref>↻</button><button type="button" class="copy" data-prdpin>Zmeniť PIN</button><button type="button" class="copy" data-prdlock>🔒 Zamknúť</button></span></div>
   <div class="s">Kde kúpiť, kam predať a kedy – z ponúk farmárov, tvojho cenníka, trhov (HU, SK, UA hranica), burzy, ponúk a zmlúv odberateľov a nákladov dopravy.${S.mj&&S.mj.updatedAt?` Trhy: ${e(new Date(S.mj.updatedAt).toLocaleDateString("sk-SK"))}.`:""}</div>${S.err?`<div class="prd-w">⚠️ ${e(S.err)}</div>`:""}</div>`;
  h+=msg(all);
  h+=all.filter(r=>r.src.length||r.snk.some(s=>!s.ind)||r.trend.now!=null).map(comCard).join("")||`<div class="card"><div class="s">Zatiaľ chýbajú ceny.</div></div>`;
  h+=quotes()+cfgCard()+review()+card();
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
document.addEventListener("submit",async ev=>{const f=ev.target;if(!OWN()||!["fPrdPin","fPrdQ","fPrdC"].includes(f.id))return;ev.preventDefault();ev.stopPropagation();
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
  if(f.id==="fPrdC"){const C=Object.assign({},S.cfg);for(const k of ["rate","payload","store","handle","tmin","defKm","basis"]){const v=N(d.get(k));if(v!=null&&v>=0)C[k]=v}C.ret=!!d.get("ret");if(!(C.payload>0))C.payload=25;
    try{await stSet("pred_cfg",C);S.cfg=C;S.open.__cfg=false;tst("Uložené.");rr()}catch(er){tst("Chyba: "+er.message,6000)}}},true);
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
@media(max-width:520px){.prd-r{grid-template-columns:1fr 1fr}.prd-r.hd{display:none}}`;
document.head.appendChild(st);
})();
