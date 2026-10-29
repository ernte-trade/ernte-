// ===== ERNTE · AUTOMATICKÝ CENNÍK (Agro-Somotor · Bunge) =====
// Výkupné ceny pre farmárov (FCA farma) sa počítajú samy rovnako ako v Kalkulačke (sekcia „Ceny odberateľov · DAP sklad“):
//   DAP odberateľa (burza MATIF/CBOT dodaná do sila, alebo cena farmárov v regióne + doprava) − doprava − odpočet ERNTE.
// Pre každú komoditu sa vyberie lepší odberateľ (Somotor alebo niektorý sklad Bunge) a cena sa zverejní do tabuľky prices.
// Viditeľnosť sa nemení: farmári vidia cenu ako doteraz (iba výslednú cenu FCA, nikdy odberateľa ani burzu),
// tím ako doteraz (price_view / price_edit). Odpočet (marža) a ceny odberateľov vidí iba majiteľ.
// Moje ceny: čo majiteľ (alebo cenník) prepíše v tabuľke cien, platí ako „moja cena“ do dátumu, potom sa vráti automatická.
// Každá zmena zverejnenej ceny sa zapíše do histórie a majiteľovi sa ukáže upozornenie. Raz za čas pripomenie zapísať vlastné ceny.
// Údaje: kalk_store pricelist/auto (nastavenie), pricelist/log (história), config/margins (odpočet – iba majiteľ zapisuje).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const R2=x=>Math.round(x*100)/100,f0=x=>x==null||!isFinite(x)?"–":Math.round(+x).toLocaleString("sk-SK"),f2=x=>x==null||!isFinite(x)?"–":(+x).toLocaleString("sk-SK",{maximumFractionDigits:2});
const T=()=>typeof today==="function"?today():new Date().toISOString().slice(0,10);
const addD=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const dk=d=>{const m=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${+m[3]}. ${+m[2]}.`:""};
const hm=t=>{const d=new Date(t);return d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})};
const staff=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined";
const OWN=()=>staff()&&ROLE==="owner";
const CAN=k=>OWN()||(typeof can==="function"&&can(k));
const ED=()=>staff()&&(OWN()||(CAN("price_edit")&&CAN("calc")));
const MKL=()=>typeof MK!=="undefined"?MK:[];
const nm=c=>(MKL().find(m=>m[0]===c)||[c,c])[1];

// ---- rovnaké údaje ako Kalkulačka (kalkulacka.html) ----
const PLANTS=[
  {id:"martfu",buyer:"bunge",name:"Bunge · Martfű",cs:["lo","ho","repka"],reg:null},
  {id:"tallya",buyer:"bunge",name:"Bunge · Tállya",cs:["lo","ho","repka"],reg:null},
  {id:"somotor",buyer:"somotor",name:"Agro-Somotor",cs:["repka","soja","psenica","jacmen","kukurica"]}];
const ROUTES={martfu:{ke:[243,25,218],po:[283,65,218],chop:[250,0,245]},tallya:{ke:[74,25,49],po:[114,65,49],chop:[109,0,104]},gyor:{ke:[381,25,356],po:[421,65,356],chop:[423,0,415]},bruck:{ke:[438,400,0,38,0.2677],po:[443,405,0,38,0.2677],chop:[504,0,470,34]},somotor:{ke:[65,65,0],po:[100,100,0],chop:[63,8,50]}};
const ROUTE_T=25,ROUTE_EKM0=1.60,HU_TOLL_FT=192.38,SK_TOLL=0.1942,AT_TOLL=0.5724;
const C2M={lo:"lo",ho:"ho",repka:"repka",soja:"soja",psenica:"psenica_p",jacmen:"jacmen_k",kukurica:"kukurica"};
const PXS={repka:"repka",psenica_p:"psenica",kukurica:"kukurica",soja:"soja_usc_bu"}; // market_px – čerstvejšia burza (2× denne)
const AUTO_COMS=[...new Set(Object.values(C2M).concat(["psenica_k"]))];

const A={mk:null,px:null,mg:null,cfg:null,log:null,calc:{},pend:{},allow:{},lastRun:0,loadedAt:0,err:"",expired:[]};
// logika spracovateľov podľa burzy: DAP na sklade = burza + báza (prémia/zrážka) €/t
// sója: CBOT + prémia non-GMO (Čop 8/2026: non-GM 470 USD/t vs. CBOT nov 1192,5 c/bu ≈ 438 USD/t → +≈28 €/t)
// repka, pšenica, kukurica: MATIF − báza (nemecká/maďarská prax 10–20 €/t pod MATIF); slnečnica a jačmeň burzu nemajú
const BAS0={soja:64,repka:-15,psenica_p:-15,kukurica:-15};
// SÓJA podľa ADM: cena = CBOT sója (najbližší kontrakt, €/t) + báza ADM (kalibrovaná z ponúk ADM majiteľa,
// spresňuje sa z ponúk vložených v „Konkurenčné ceny“ – posledné 3 ponuky ADM na sóju).
const ADM0={soja:64}; // východné Slovensko, FCA farma (kalibrované z ponuky ADM Sečovce, DDP mínus doprava)
const ADMDOP0=10;      // DDP Sečovce → FCA farma (€/t), dá sa zmeniť v nastavení
const admOn=c=>c==="soja"&&!(A.cfg&&A.cfg.adm&&A.cfg.adm[c]===false);
const IA_COMS=["repka","kukurica","lo"];
const iaOn=c=>IA_COMS.includes(c)&&!(A.cfg&&A.cfg.ia===false);
const iaMinus=()=>{const v=A.cfg&&A.cfg.iaMinus;return Number.isFinite(+v)&&v!==""&&v!=null?+v:10};
// Interagros − 10 €: posledná ponuka Interagros (FCA prednostne, inak DAP; bez „nad 500 t“, neskoršieho odberu a Parchovian)
function iaCalc(c){const I=((A.konk&&A.konk.items)||[]).filter(x=>x.com===c&&/interagros/i.test(x.who||"")&&+x.price>0);if(!I.length)return null;
  const d=I.reduce((m,x)=>x.d>m?x.d:m,"");const L=I.filter(x=>x.d===d&&!/nad\s*500|odber\s*1|parchovany/i.test(x.term||""));if(!L.length)return null;
  const it=L.find(x=>String(x.del).toUpperCase()==="FCA")||L[0],m=iaMinus(),p=Math.floor(+it.price-m);
  return {p,fca:p,pl:"Interagros − "+m+" €",src:"Interagros "+(it.del||"")+" "+it.price+" − "+m,date:d,ok:true,dap:+it.price,dop:0,ia:{price:+it.price,del:it.del||"",term:it.term||"",d,m,age:Math.floor((Date.now()-Date.parse(d))/864e5)}}}
const admDop=()=>{const v=A.cfg&&A.cfg.admDop;return Number.isFinite(+v)&&v!==""&&v!=null?+v:ADMDOP0};
const EAST=/se[cč]ovce|parchovany|v[yý]chod|east|ko[sš]ice|trebi[sš]ov|michalovce/i;
// báza ADM pre VÝCHODNÉ SLOVENSKO (FCA farma): iba ponuky ADM z východu (Sečovce/Parchovany), DDP → mínus doprava. Západ (Hamburg) sa nepočíta.
function admB(c){const v=A.cfg&&A.cfg.admB&&A.cfg.admB[c];if(Number.isFinite(+v)&&v!==""&&v!=null)return {b:+v,src:"nastavená ručne"};
  const seen=new Set(),K=((A.konk&&A.konk.items)||[]).filter(x=>x.com===c&&/adm/i.test(x.who||"")&&EAST.test((x.who||"")+" "+(x.place||""))&&x.b!=null).filter(x=>{const k=x.oid||x.id;if(seen.has(k))return false;seen.add(k);return true}).sort((x,y)=>String(y.d).localeCompare(String(x.d))).slice(0,3);
  const fb=x=>+x.b-(String(x.del||"").toUpperCase()==="DDP"?admDop():0);
  if(K.length)return {b:R2(K.reduce((s,x)=>s+fb(x),0)/K.length),src:"ADM Sečovce – "+K.length+(K.length===1?" ponuka":" ponuky")+(K.some(x=>String(x.del).toUpperCase()==="DDP")?", DDP − doprava "+admDop()+" €/t":"")};
  return {b:ADM0[c],src:"ADM Sečovce (východ), FCA farma"}}
const BLBL={soja:"báza ADM nad CBOT",repka:"báza pod MATIF",psenica_p:"báza pod MATIF",kukurica:"báza pod MATIF"};
const basis=c=>{const b=A.cfg&&A.cfg.basis&&A.cfg.basis[c];return Number.isFinite(+b)&&b!==""&&b!=null?+b:BAS0[c]};
const meth=c=>(admOn(c)||arxRow(c))?"ref":((A.cfg&&A.cfg.method&&A.cfg.method[c]==="burza")?"burza":"region"); // referenčný výkup VSK vždy, keď má cenu
// Referenčný výkup VSK (FCA východné Slovensko, zdroj iba v internom súbore). Ich logika = burza + báza.
// Pri každej ich novej cene sa uloží báza = ich cena − burza v ten deň (história báz). Cena pre farmára = burza dnes + báza.
// Keď 30 dní nezmenia cenu, počíta sa ich logikou: burza dnes + ich priemerná báza z posledných cien.
const HK={repka:"matif_repka",psenica_p:"matif_psenica",psenica_k:"matif_psenica",kukurica:"matif_kukurica",soja:"cbot_soja"};
const isRef=r=>r&&(r.src==="vsk"||/\(VSK výkup\)/.test(r.market||""));
function arxRow(c){return ((A.mk&&A.mk.rows)||[]).filter(r=>r.c===c&&isRef(r)&&+r.price>0).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null}
function histAt(k,d){const H=((A.mk&&A.mk.hist)||[]).filter(h=>h[k]!=null).sort((a,b)=>a.d.localeCompare(b.d));if(!H.length)return null;let x=H.filter(h=>h.d<=d).pop();if(!x)x=H[0];return {v:+x[k],d:x.d}}
function bzNowOf(c){const bz=burza({reg:null},c==="psenica_k"?"psenica_p":c);return bz&&Number.isFinite(+bz.price)?{v:+bz.price,n:bzName(bz)+(bz.term?" "+bz.term:""),d:bz.date}:null}
// história báz (kalk_store pricelist/vsk) – doplní sa pri každej novej cene
async function trackRef(){if(!ED()||!A.mk)return;const H=A.vsk||{};let ch=false;const today=T();
  for(const [c] of MKL()){const r=arxRow(c);if(!r)continue;const L=H[c]||(H[c]=[]);if(L.some(x=>x.d===r.date&&+x.p===+r.price))continue;
    const k=HK[c],now=k?bzNowOf(c):null;let bz=null;
    if(k){const ageD=(Date.parse(today)-Date.parse(r.date))/864e5;bz=now&&ageD<=1?{v:now.v,d:today}:histAt(k,r.date)}
    L.push({d:r.date,p:+r.price,bz:bz?bz.v:null,bzd:bz?bz.d:null,b:bz?R2(+r.price-bz.v):null,at:new Date().toISOString()});L.sort((a,b)=>a.d.localeCompare(b.d));if(L.length>60)L.splice(0,L.length-60);ch=true}
  A.vsk=H;if(ch)await kset("pricelist","vsk",H)}
function refPct(){return 0} // pravidlo +0,777 % zrušené majiteľom 29. 10. 2026 – pri žiadnej komodite sa nepripočítava
// sója: presne ADM, bez pravidla +0,777 %
function admOnly(c){const P=0,now=bzNowOf(c);if(!now)return null;const ab=admB(c),mkt=R2(now.v+ab.b),add=R2(mkt*P/100),fca=R2(mkt+add);
  return {fca,p:Math.floor(fca),arx:{price:null,date:now.d,bzThen:null,bzNow:now.v,bzN:now.n,basis:ab.b,mkt,mode:"adm",age:0,n:0,M:-add,adm:{b:ab.b,src:ab.src,vskB:null}},pl:"ADM logika · CBOT + báza",src:"ADM: burza + báza",date:now.d,ok:true,dap:mkt,dop:0}}
function arx(c){const r=arxRow(c);if(!r)return admOn(c)?admOnly(c):null;const P=refPct(),k=HK[c],now=k?bzNowOf(c):null,age=(Date.now()-Date.parse(r.date))/864e5;
  const L=((A.vsk||{})[c]||[]).filter(x=>x.b!=null);const last=L.find(x=>x.d===r.date&&+x.p===+r.price)||null;
  let b=null,then=null,mode="cena";
  if(k&&now){if(age<=30){if(last){b=last.b;then={v:last.bz,d:last.bzd}}else{then=histAt(k,r.date);b=then?R2(+r.price-then.v):null}mode="burza"}
    else{const T5=L.slice(-5);if(T5.length){b=R2(T5.reduce((s,x)=>s+x.b,0)/T5.length);mode="logika"}else{then=histAt(k,r.date);b=then?R2(+r.price-then.v):null;mode="burza"}}}
  let adm=null;if(admOn(c)&&now){const ab=admB(c);adm={b:ab.b,src:ab.src,vskB:b};b=ab.b;mode="adm"}
  const mkt=(mode==="logika"||mode==="adm")&&b!=null&&now?R2(now.v+b):+r.price,add=mode==="adm"?0:R2(mkt*P/100),fca=R2(mkt+add),M=-add;
  return {fca,p:Math.floor(fca),arx:{price:+r.price,date:r.date,bzThen:then,bzNow:now?now.v:null,bzN:now?now.n:"",basis:b,mkt,mode,age:Math.floor(age),n:L.length,M,adm},pl:mode==="adm"?"ADM logika · CBOT + báza":"Výkup VSK · FCA vých. Slovensko",src:"výkup VSK + burza",date:r.date,ok:true,dap:mkt,dop:0}}
const DEF={on:true,auto:null,mine:{},mineDays:7,remindDays:7,step:1,maxJump:0,lastMineAt:null,since:null};

async function kget(path,id){try{const r=await sb.from("kalk_store").select("data,updated_at").eq("path",path).eq("id",id).maybeSingle();return r.error?undefined:(r.data?r.data.data:null)}catch(x){return undefined}}
async function kset(path,id,data){try{const r=await sb.from("kalk_store").upsert({path,id,data},{onConflict:"path,id"});return !r.error}catch(x){return false}}
async function loadAll(force){if(!force&&Date.now()-A.loadedAt<4*60e3&&A.cfg)return;
  const [mf,ml,px,mg,cfg,log,vsk,konk]=await Promise.all([
    fetch("market.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
    kget("market","latest"),
    sb.from("market_px").select("*").then(r=>r.error?null:r.data).catch(()=>null),
    kget("config","margins"),kget("pricelist","auto"),kget("pricelist","log"),kget("pricelist","vsk"),kget("pricelist","konk")]);
  const t=v=>v&&v.updatedAt?Date.parse(v.updatedAt):0;A.mk=t(ml)>t(mf)?ml:(mf||ml||null);
  A.px=px?Object.fromEntries(px.map(x=>[x.sym,x])):null;A.mg=mg||null;
  A.cfg=Object.assign({},DEF,cfg||{});A.cfg.mine=A.cfg.mine||{};
  if(!A.cfg.auto){// prvé zapnutie: automaticky iba komodity, ktoré majú odberateľa a sú dnes v cenníku
    A.cfg.auto={};for(const c of AUTO_COMS){const p=(STATE.prices||[]).find(x=>x.com===c);A.cfg.auto[c]=!!(p&&p.price!=null)}}
  A.vsk=vsk||{};A.konk=konk||{items:[]};A.cfg.maxJump=0;for(const [c] of MKL()){if(admOn(c)){A.cfg.auto[c]=true;if(A.cfg.mine&&A.cfg.mine[c])delete A.cfg.mine[c];continue}if(arxRow(c)&&!A.cfg.auto[c]&&!A.cfg.mine[c])A.cfg.auto[c]=true} // výkup VSK vždy automaticky, bez percentového potvrdzovania
  A.cfgSaved=!!cfg;A.log=(log&&log.items)||[];A.loadedAt=Date.now()}

// ---- výpočet (kópia logiky z Kalkulačky) ----
function origin(){let o=null;try{o=localStorage.getItem("ernte-dap-origin")}catch(x){}return o==="ke"||o==="po"?o:"avg"} // výjazd od farmárov (KE/PO), nie Čop
function ekm(){const f=A.mk&&A.mk.fuel;if(!f||!f.ref)return ROUTE_EKM0;const xs=[f.sk&&f.sk.netL,f.hu&&f.hu.netL].filter(Number.isFinite);if(!xs.length)return ROUTE_EKM0;const n=xs.reduce((a,b)=>a+b,0)/xs.length;return R2(f.ref.ekm+f.ref.cons*(n-f.ref.netL))}
function route(pid){const o=origin(),E=ekm(),huf=(A.mk&&A.mk.fx&&A.mk.fx.huf)||366.43,huR=HU_TOLL_FT/huf;
  let km,sk,hu,at,skR;if(o!=="avg"&&ROUTES[pid][o]){[km,sk,hu,at=0,skR=SK_TOLL]=ROUTES[pid][o]}
  else{const a=ROUTES[pid].ke,b=ROUTES[pid].po;km=(a[0]+b[0])/2;sk=(a[1]+b[1])/2;hu=(a[2]+b[2])/2;at=((a[3]||0)+(b[3]||0))/2;skR=a[4]||SK_TOLL}
  const toll=R2(2*(sk*skR+hu*huR+at*AT_TOLL)),run=R2(km*E*2);return {km,dop:R2((run+toll)/ROUTE_T)}}
function burza(pl,mc){const rows=(A.mk&&A.mk.rows)||[],lim=Date.now()-21*864e5;
  if(pl.reg){const rg=rows.find(r=>r.kind==="regburza"&&r.reg===pl.reg&&r.c===mc&&(!r.date||Date.parse(r.date)>=lim));if(rg)return rg}
  let r=rows.find(x=>x.kind==="burza"&&x.c===mc&&!/náhrada/.test(x.market))||null;
  const p=A.px&&PXS[mc]&&A.px[PXS[mc]];// čerstvejšia burza z market_px (najbližší kontrakt)
  if(p&&p.eur_t!=null&&p.updated_at){const d=String(p.quote_date||p.updated_at).slice(0,10);if(!r||!r.date||d>=r.date)r={kind:"burza",c:mc,market:p.name||(mc==="soja"?"CBOT sója":"MATIF"),term:p.contract||"",price:+p.eur_t,date:d}}
  return r}
const bzName=r=>r?(r.kind==="regburza"?"Börse Wien":/cbo?t|soja_usc/i.test(r.market)?"CBOT":"MATIF"):"";
function dap(pl,c,dop){if(!A.mk)return null;const mc=C2M[c],lim=Date.now()-60*864e5;
  const rows=(A.mk.rows||[]).filter(r=>r.c===mc&&r.kind!=="burza"&&r.kind!=="regburza"&&!/porovnanie/.test(r.market)&&(!r.date||Date.parse(r.date)>=lim));
  const hu=rows.filter(r=>!r.chop&&/^Maďarsko/.test(r.market)),sk=rows.filter(r=>!r.chop&&/^Slovensko/.test(r.market));
  const RR=pl.buyer==="bunge"?hu:sk.concat(hu),U=RR.map(r=>({v:R2(r.price+dop),d:r.date}));
  const bz=burza(pl,mc);
  // cena DAP = za koľko farmári z regiónu vozia na sklad odberateľa (cena farmárov v regióne + doprava); burza iba keď región chýba
  if(!U.length)return bz?{dap:R2(bz.price),src:"burza "+bzName(bz)+(bz.term?" "+bz.term:"")+" (región chýba)",date:bz.date,bz,reg:false}:null;
  const m=R2(U.reduce((s,a)=>s+a.v,0)/U.length),dmax=U.map(a=>a.d).sort().pop(),farm=R2(RR.reduce((s,r)=>s+r.price,0)/RR.length);
  return {dap:m,farm,src:"farmári v regióne "+(pl.buyer==="bunge"?"(HU)":"(SK+HU)")+" + doprava",mk:RR.map(r=>r.market.replace(/^(Maďarsko|Slovensko) – /,"$1 ")).join(", "),date:dmax,bz,reg:true}}
function margin(){const c=A.cfg&&A.cfg.marginOwn;if(Number.isFinite(+c)&&c!==""&&c!=null)return +c;const r=A.mg&&+A.mg.rec;return Number.isFinite(r)?r:20}
function calc(){const out={},M=margin();
  for(const pl of PLANTS){const {dop}=route(pl.id);
    for(const c of pl.cs){const com=C2M[c];let E=dap(pl,c,dop);const bzr=burza(pl,com),bzp=bzr&&Number.isFinite(+bzr.price)?+bzr.price:null;
      const bzDap=bzp!=null&&BAS0[com]!=null?R2(bzp+basis(com)):null;
      const bzAge=bzr&&bzr.date?(Date.now()-Date.parse(bzr.date))/864e5:99;
      if(meth(com)==="burza"&&bzDap!=null)E={dap:bzDap,farm:null,src:`${bzName(bzr)}${bzr.term?" "+bzr.term:""} ${f0(bzp)} ${basis(com)>=0?"+":"−"} ${f0(Math.abs(basis(com)))} (${BLBL[com]})`,date:bzr.date,reg:false,byBz:true};
      if(!E||!Number.isFinite(E.dap))continue;const fca=R2(E.dap-dop-M);
      const age=E.date?(Date.now()-Date.parse(E.date))/864e5:99,ok=age<=(E.reg?60:12);
      const it={fca,p:Math.floor(fca),dap:E.dap,farm:E.farm,dop,pl:pl.name,buyer:pl.buyer,src:E.src,mk:E.mk||"",date:E.date,ok,bz:bzp,over:!E.byBz&&bzp!=null&&E.dap>bzp,
        bzDap,bzFca:bzDap!=null?R2(bzDap-dop-M):null,bzName:bzr?bzName(bzr)+(bzr.term?" "+bzr.term:""):"",bzOk:bzAge<=12,byBz:!!E.byBz};
      const all=(out[com]&&out[com].all)||[];all.push(it);
      if(!out[com]||(ok&&!out[com].ok)||(ok===out[com].ok&&fca>out[com].fca))out[com]=Object.assign({},it,{all});else out[com].all=all}}
  for(const [c] of MKL()){if(meth(c)!=="ref")continue;const x=arx(c);if(!x)continue;out[c]=Object.assign({},out[c]||{},x,{all:(out[c]&&out[c].all)||[],over:false,byBz:false,rg:out[c]&&out[c].dop?out[c]:null})}
  for(const c of IA_COMS){if(!iaOn(c))continue;const x=iaCalc(c);if(x)out[c]=Object.assign({},x,{all:(out[c]&&out[c].all)||[],arx:null,over:false,byBz:false,rg:out[c]&&out[c].dop!=null&&!out[c].arx?out[c]:(out[c]&&out[c].rg)||null})}
  return out}

// ---- zverejnenie ----
let running=false;
async function logAdd(items){if(!items.length)return;await loadAll();const L=(A.log||[]).concat(items).slice(-300);A.log=L;await kset("pricelist","log",{items:L})}
async function saveCfg(){A.cfg.since=A.cfg.since||new Date().toISOString();const ok=await kset("pricelist","auto",A.cfg);if(ok)A.cfgSaved=true;return ok}
async function run(force){if(!ED()||running)return;if(!force&&Date.now()-A.lastRun<5*60e3)return;running=true;A.err="";
  try{await loadAll(force);await trackRef();if(!A.cfgSaved&&OWN())await saveCfg();if(!A.cfg.on){A.lastRun=Date.now();return}
    if(!A.mk&&!A.px){A.err="Trhové ceny sa nenačítali – cenník zostal bez zmeny.";return}
    const C=calc();A.calc=C;const cur=Object.fromEntries((STATE.prices||[]).map(p=>[p.com,p.price==null?null:+p.price]));
    const t=T(),ch=[],pend={},exp=[];let dirty=false;
    for(const [com] of MKL()){if(admOn(com)||iaOn(com))continue; // sóju (ADM) a repku, kukuricu, LO (Interagros) zverejňuje databáza (soja_adm_tick) – jeden zdroj, žiadne preskakovanie
      const mine=A.cfg.mine[com];let tgt,src,pl="";
      if(mine&&(!mine.till||mine.till>=t)){tgt=+mine.price;src="mine"}
      else{if(mine){exp.push({com,price:mine.price,till:mine.till});delete A.cfg.mine[com];dirty=true}
        if(!A.cfg.auto[com])continue;const a=C[com];if(!a||!a.ok||!(a.p>0))continue;tgt=a.p;src="auto";pl=a.pl}
      const old=cur[com]??null;if(tgt==null||!isFinite(tgt))continue;
      if(old!=null&&Math.abs(tgt-old)<(+A.cfg.step||1))continue;
      if(false&&src==="auto"){pend[com]={old,tgt,pl};continue}
      ch.push({com,old,new:tgt,src,pl})}
    A.pend=pend;A.expired=exp;
    if(dirty&&!(await saveCfg()))A.cfg.mine=Object.assign({},A.cfg.mine);
    if(ch.length){const now=new Date().toISOString();
      const r=await sb.from("prices").upsert(ch.map(c=>({com:c.com,price:c.new,updated_at:now})));
      if(r.error){A.err="Zverejnenie zlyhalo: "+r.error.message;return}
      ch.forEach(c=>{const p=(STATE.prices||[]).find(x=>x.com===c.com);if(p){p.price=c.new;p.updated_at=now}else STATE.prices.push({com:c.com,price:c.new,updated_at:now});delete A.allow[c.com]});
      try{const ac=ch.filter(c=>c.src==="auto").map(c=>c.com);if(ac.length)sb.rpc("cennik_hist_auto",{p_coms:ac}).then(()=>{},()=>{})}catch(x){}
      const by=(typeof ME!=="undefined"&&ME&&ME.staffName)||"";
      await logAdd(ch.map(c=>({at:now,com:c.com,old:c.old,new:c.new,src:c.src,pl:c.pl,by:c.src==="auto"?"automaticky":by})))}
    // cenník je pri automatike stále platný (farmári nevidia „cenník vypršal“)
    const pv=((STATE.settings||{}).pricelist)||{};if(!pv.valid||pv.valid<addD(t,3)){const v={...pv,valid:addD(t,7),by:"ERNTE",at:new Date().toISOString()};
      const s=await sb.from("settings").upsert({key:"pricelist",value:v});if(!s.error){STATE.settings=STATE.settings||{};STATE.settings.pricelist=v}}
    A.lastRun=Date.now();A.lastCh=ch.length;
    if(ch.length||exp.length){notifyNew();if(typeof toast==="function"&&ch.length)toast(`🤖 Cenník aktualizovaný: ${ch.map(c=>nm(c.com)+" "+f0(c.new)).join(", ")} €/t`,6000)}
  }catch(x){A.err=String(x&&x.message||x)}finally{running=false;rerender()}}
function rerender(){if(typeof renderStaff!=="function"||typeof TAB==="undefined")return;if(window.formBusy&&formBusy())return;if(TAB==="price"&&(A.lastCh||!document.querySelector(".acn-card")))renderStaff();else inject()}

// ---- moje ceny: čo sa prepíše v tabuľke cien (Uložiť a zverejniť), platí ako moja cena ----
document.addEventListener("submit",async ev=>{const f=ev.target;if(!f||f.id!=="fPrice"||!ED()||!A.cfg||!A.cfg.on)return;
  const fd=new FormData(f),cur=Object.fromEntries((STATE.prices||[]).map(p=>[p.com,p.price==null?null:+p.price])),t=T(),now=new Date().toISOString(),by=(typeof ME!=="undefined"&&ME&&ME.staffName)||"";
  const till=(f.querySelector("[name=ac_till]")||{}).value||addD(t,+A.cfg.mineDays||7);const L=[];
  for(const [com] of MKL()){const raw=fd.get("p_"+com);const v=typeof num==="function"?num(raw):parseFloat(String(raw).replace(",","."));const nv=Number.isFinite(v)?Math.round(v*100)/100:null,old=cur[com]??null;
    if(nv===old||(nv!=null&&old!=null&&Math.abs(nv-old)<0.005))continue;
    if(admOn(com)){if(typeof toast==="function")toast("Sója sa počíta vždy automaticky podľa ADM (CBOT + báza ADM) – ručná cena sa o chvíľu prepíše. Bázu zmeníš v Automatickom cenníku.",8000);continue}
    if(iaOn(com)){if(typeof toast==="function")toast(nm(com)+" sa počíta vždy automaticky: posledná ponuka Interagros − "+iaMinus()+" €/t – ručná cena sa o chvíľu prepíše.",8000);continue}
    if(nv==null){A.cfg.auto[com]=false;delete A.cfg.mine[com]}else A.cfg.mine[com]={price:nv,till,at:now,by};
    L.push({at:now,com,old,new:nv,src:"mine",by,till:nv==null?"":till})}
  if(!L.length)return;A.cfg.lastMineAt=now;const ok=await saveCfg();
  if(!ok&&typeof toast==="function")toast("Ceny sú zverejnené, ale automatika ich môže prepísať – nemáš prístup k nastaveniu automatického cenníka.",7000);
  await logAdd(L);notifyNew()},true);

// ---- upozornenia majiteľovi: každá zmena zverejnenej ceny + pripomienka mojich cien ----
const SEEN="ernte-acn-seen",SNZ="ernte-acn-remind";
const gs=k=>{try{return localStorage.getItem(k)||""}catch(x){return ""}},ss=(k,v)=>{try{localStorage.setItem(k,v)}catch(x){}};
function unseen(){const s=gs(SEEN);return (A.log||[]).filter(x=>x.at>s)}
function notifyNew(){if(!OWN())return;const U=unseen();if(!U.length)return;
  try{if(document.hidden&&"Notification" in window&&Notification.permission==="granted")new Notification("ERNTE · cenník sa zmenil",{body:U.slice(-6).map(x=>`${nm(x.com)}: ${x.old==null?"–":f0(x.old)} → ${x.new==null?"skryté":f0(x.new)} €/t`).join("\n"),icon:"icon-192.png",tag:"ernte-cennik"})}catch(x){}
  try{navigator.vibrate&&navigator.vibrate([90,60,90])}catch(x){}inject()}
const srcL=x=>x.src==="auto"?`🤖 automaticky${x.pl?" · "+e(x.pl):""}`:x.src==="mine"?`✍️ ${e(x.by||"ručne")}${x.till?" · platí do "+dk(x.till):""}`:e(x.by||"");
function bannerHTML(){if(!OWN()||!A.cfg)return "";let h="";const U=unseen();
  if(U.length){const last={};U.forEach(x=>last[x.com]=Object.assign({},x,{old:last[x.com]?last[x.com].old:x.old}));const L=Object.values(last);
    h+=`<div class="acn-b" role="alert"><div class="acn-bh"><span aria-hidden="true">💶</span><b>Zmena v zverejnenom cenníku${L.length>1?" ("+L.length+")":""}</b></div><ul>${L.map(x=>`<li><b>${e(nm(x.com))}</b> ${x.old==null?"–":f0(x.old)} → <b>${x.new==null?"skryté":f0(x.new)+" €/t"}</b> <small>${x.new!=null&&x.old!=null?(x.new>x.old?"▲ +":"▼ −")+f0(Math.abs(x.new-x.old))+" · ":""}${srcL(x)} · ${hm(x.at)}</small></li>`).join("")}</ul>
    <div class="btns"><button type="button" class="pri" data-acn="seen">✓ Videl som</button>${typeof TAB!=="undefined"&&TAB!=="price"?`<button type="button" data-acn="open">Otvoriť cenník</button>`:""}</div></div>`}
  const P=Object.entries(A.pend||{});if(P.length)h+=`<div class="acn-b warn" role="alert"><div class="acn-bh"><span aria-hidden="true">⚠️</span><b>Veľká zmena ceny čaká na tvoje potvrdenie</b></div><ul>${P.map(([c,x])=>`<li><b>${e(nm(c))}</b> ${f0(x.old)} → <b>${f0(x.tgt)} €/t</b> <small>${x.tgt>x.old?"▲":"▼"} ${f0(Math.abs(x.tgt-x.old))} €/t (${f0(Math.abs(x.tgt-x.old)/x.old*100)} %) · ${e(x.pl)}</small> <button type="button" data-acn="allow:${e(c)}">Zverejniť</button></li>`).join("")}</ul><div class="btns"><button type="button" class="pri" data-acn="allowall">✓ Zverejniť všetky</button></div><div class="s">Automatika zmenu nad ${f0(A.cfg.maxJump)} % sama nezverejní. Ak ju nechceš, prepíš cenu v cenníku (platí ako tvoja).</div></div>`;
  if((A.expired||[]).length)h+=`<div class="acn-b"><div class="acn-bh"><span aria-hidden="true">⏰</span><b>Tvoja cena vypršala – späť na automatickú</b></div><ul>${A.expired.map(x=>`<li><b>${e(nm(x.com))}</b> ${f0(x.price)} €/t platila do ${dk(x.till)}${A.cfg.auto[x.com]?"":" · komodita nemá automatickú cenu, cena zostala"}</li>`).join("")}</ul><div class="btns"><button type="button" data-acn="expok">OK</button></div></div>`;
  // pripomienka: zapíš svoje ceny (raz za X dní)
  const rd=+A.cfg.remindDays||0,lm=Date.parse(A.cfg.lastMineAt||A.cfg.since||"")||0,snz=+gs(SNZ)||0;
  if(A.cfg.on&&rd>0&&A.cfgSaved&&Date.now()-lm>rd*864e5&&Date.now()>snz)h+=`<div class="acn-b rem" role="status"><div class="acn-bh"><span aria-hidden="true">📝</span><b>Máš nové ceny od Somotora alebo Bunge?</b></div><div class="s">${lm?"Svoje ceny si naposledy zapísal "+dk(new Date(lm).toISOString())+". ":""}Zapíš ich do cenníka – zverejnia sa hneď a platia ${f0(A.cfg.mineDays)} dní, potom sa cena vráti na automatickú.</div>
    <div class="btns"><button type="button" class="pri" data-acn="write">✍️ Zapísať moje ceny</button><button type="button" data-acn="snooze">Pripomenúť zajtra</button><button type="button" data-acn="none">Nemám nové</button></div></div>`;
  return h?`<div class="acn-wrap">${h}</div>`:""}

// ---- karta v záložke Cenník ----
function cardHTML(){if(!OWN())return ""; // zdroj cien vidí iba majiteľ
if(!A.cfg)return `<div class="card acn-card"><div class="tdh"><b>🤖 Automatický cenník · Somotor a Bunge</b><small>načítavam…</small></div></div>`;
  const C=A.calc||{},own=OWN(),cur=Object.fromEntries((STATE.prices||[]).map(p=>[p.com,p.price==null?null:+p.price])),t=T();
  const rows=MKL().map(([c,n])=>{const a=C[c],mine=A.cfg.mine[c],mv=mine&&(!mine.till||mine.till>=t),au=!!A.cfg.auto[c],has=AUTO_COMS.includes(c);
    const st=mv?`<span class="acn-m">✍️ moja do <input type="date" data-acntill="${e(c)}" value="${e(mine.till||"")}" aria-label="Moja cena ${e(n)} platí do"></span><button type="button" class="acn-x" data-acn="back:${e(c)}">↩ auto</button>`
      :iaOn(c)?`<span class="acn-sw">🏷️ Interagros − ${f0(iaMinus())} € · vždy automaticky</span>`:admOn(c)?`<span class="acn-sw">🏷️ ADM · vždy automaticky</span>`:arxRow(c)?`<span class="acn-sw">🏷️ výkup VSK · vždy automaticky</span>`:has?`<label class="acn-sw"><input type="checkbox" data-acnauto="${e(c)}"${au?" checked":""}> 🤖 automaticky</label>`:`<span class="acn-n">bez odberateľa – iba tvoja cena</span>`;
    const av=a?`<b>${f0(a.p)}</b>${a.ok?"":` <em class="acn-old" title="Trhová cena je stará – nezverejňuje sa">staré dáta</em>`}`:"<b>–</b>";
    const pd=A.pend&&A.pend[c];
    const dt=a?`<div class="acn-dap">${a.all.slice().sort((x,y)=>y.dap-x.dap).map(x=>`<span class="${x.pl===a.pl?"best":""}"><b>DAP ${e(x.pl.replace("Bunge · ","Bunge "))}</b> ${f0(x.dap)} €/t<small>${x.farm!=null?`farmári v regióne ${f0(x.farm)} + doprava ${f0(x.dop)}`:e(x.src)}${x.date?" · "+dk(x.date):""}</small></span>`).join("")}</div>
      ${a.ia?`<div class="acn-arx">🏷️ <b>Interagros ${e(a.ia.del)} ${f0(a.ia.price)} €/t</b> · ponuka ${dk(a.ia.d)}${a.ia.term?" · "+e(a.ia.term):""}${a.ia.age>21?` · <b>${a.ia.age} dní stará ponuka – vlož novú</b>`:""}<br>→ naša cena = ${f0(a.ia.price)} − ${f0(a.ia.m)} = <b>${f0(a.p)} €/t</b> · zverejňuje automaticky databáza${own?`<label class="acn-rm2">Menej ako Interagros o €/t <input data-acncfg="iaMinus" inputmode="decimal" value="${e(String(iaMinus()).replace(".",","))}"></label>`:""}</div>`:""}${a.arx?`<div class="acn-arx">${a.arx.price==null?`🏷️ <b>Sója podľa ADM – automaticky každý deň</b> · burza ${dk(a.arx.date)}`:`🏷️ <b>Výkup VSK (FCA vých. SK) ${f0(a.arx.price)} €/t</b> · ${dk(a.arx.date)}`}${a.arx.age>30?` · <b>${a.arx.age} dní bez zmeny</b>`:""}<br>${a.arx.basis==null?"burzu nemá – platí ich posledná cena":a.arx.mode==="adm"?`<b>sója podľa ADM:</b> ${e(a.arx.bzN)} dnes ${f2(a.arx.bzNow)} + báza ADM ${f2(a.arx.adm.b)} (${e(a.arx.adm.src)})${a.arx.adm.vskB!=null?` · báza VSK teraz ${a.arx.adm.vskB>=0?"+":"−"}${f2(Math.abs(a.arx.adm.vskB))}`:""} = <b>${f2(a.arx.mkt)}</b>${own?`<label class="acn-rm2">Báza ADM €/t (prázdne = z ponúk) <input data-acnadmb="soja" inputmode="decimal" value="${e(A.cfg&&A.cfg.admB&&A.cfg.admB.soja!=null?String(A.cfg.admB.soja).replace(".",","):"")}"></label><label class="acn-rm2">Doprava DDP Sečovce → farma €/t <input data-acncfg="admDop" inputmode="decimal" value="${e(String(admDop()).replace(".",","))}"></label>`:""}`:a.arx.mode==="logika"?`ich logika: priemerná báza z ${Math.min(5,a.arx.n)} posledných cien ${a.arx.basis>=0?"+":"−"}${f2(Math.abs(a.arx.basis))}`:`báza = ${f0(a.arx.price)} − ${e(a.arx.bzN.split(" ")[0])} v ten deň ${f2(a.arx.bzThen&&a.arx.bzThen.v)} = ${a.arx.basis>=0?"+":"−"}${f2(Math.abs(a.arx.basis))}`}${a.arx.mode==="logika"?`<br>→ dnes ${e(a.arx.bzN)} ${f2(a.arx.bzNow)} ${a.arx.basis>=0?"+":"−"} ${f2(Math.abs(a.arx.basis))} = <b>${f2(a.arx.mkt)}</b>`:a.arx.mode==="adm"?`<br>→ sóju zverejňuje automaticky databáza každých 30 min (aj keď je aplikácia zavretá), pri zmene aspoň o 1 €/t`:`<br>→ platí ich cena <b>${f0(a.arx.mkt)}</b> (do 30 dní bez prepočtu burzou)`}${a.arx.M?` + ${String(refPct()).replace(".",",")} % (pravidlo ERNTE) = +${f2(Math.abs(a.arx.M))} → ${f2(a.fca)}`:""} → <b>${f0(a.p)} €/t</b></div>`:""}
      ${(()=>{const b=a.arx||a.ia?a.rg:a;return b?`<div${a.arx||a.ia?' class="acn-cmp"':""}>${a.arx||a.ia?"Pre porovnanie región: ":""}→ FCA pre farmára = DAP ${e(b.pl)} ${f2(b.dap)} − doprava ${f2(b.dop)}${own?` − odpočet ${f2(margin())}`:""} = <b>${f2(b.fca)}</b> → <b>${f0(b.p)} €/t</b>${b.over?` · <em class="acn-old">nad burzou ${f0(b.bz)}</em>`:""}${b.mk?`<br><small>Zdroj: ${e(b.mk)}</small>`:""}</div>`:""})()}${BAS0[c]!=null&&a.bzDap!=null?`<div class="acn-bl"><b>📈 Logika spracovateľa podľa burzy:</b> ${e(a.bzName)} ${f0(a.bz)} ${basis(c)>=0?"+":"−"} ${f0(Math.abs(basis(c)))} ${e(BLBL[c])} = DAP ${f0(a.bzDap)} → FCA <b>${f0(Math.floor(a.bzFca))} €/t</b>${a.bzOk?"":" (burza je stará)"}${a.byBz?" · <b>používa sa</b>":` · oproti regiónu ${Math.floor(a.bzFca)-a.p>=0?"+":"−"}${f0(Math.abs(Math.floor(a.bzFca)-a.p))} €/t`}
        ${own&&!arxRow(c)?`<div class="acn-blc"><label>Cenu počítať<select data-acnmeth="${e(c)}"><option value="region"${meth(c)==="region"?" selected":""}>z regiónu (DAP farmárov)</option><option value="burza"${meth(c)==="burza"?" selected":""}>podľa burzy (logika spracovateľa)</option></select></label><label>${e(BLBL[c])} €/t<input data-acnbas="${e(c)}" inputmode="decimal" value="${e(String(basis(c)).replace(".",","))}"></label></div>`:""}</div>`:""}${pd?`<div class="acn-pd">⏳ čaká na tvoje potvrdenie (${f0(pd.old)} → ${f0(pd.tgt)}) <button type="button" data-acn="allow:${e(c)}">Zverejniť</button></div>`:""}`:(has?"bez trhových dát":"");
    return `<div class="acn-r${mv?" mine":au&&has?" on":""}"><div class="acn-rh"><b class="n">${e(n)}</b><span class="v"><small>zverejnené</small>${cur[c]==null?"<b class='no'>–</b>":"<b>"+f0(cur[c])+"</b>"}</span><span class="v a"><small>automatická</small>${av}</span></div>${dt?`<div class="acn-rd">${dt}</div>`:""}<div class="acn-rm">${st}</div></div>`}).join("");
  const L=(A.log||[]).slice(-40).reverse();
  return `<div class="card acn-card"><div class="tdh"><b>🤖 Automatický cenník · Somotor a Bunge</b><label class="acn-sw big"><input type="checkbox" data-acnon${A.cfg.on?" checked":""}${own?"":" disabled"}> ${A.cfg.on?"zapnutý":"vypnutý"}</label></div>
   <div class="s">👥 <b>Zverejnené pre všetkých ${(STATE.farmers||[]).length} farmárov</b> v aplikácii (každý vidí iba výslednú cenu). Ceny pre farmárov (FCA farma, bez DPH) sa počítajú samy z cien odberateľov <b>Agro-Somotor</b> a <b>Bunge</b> – <b>DAP Somotor, DAP Bunge Tállya a DAP Bunge Martfű</b> = za koľko farmári z regiónu vozia na sklad (cena farmárov v regióne + doprava). Od najlepšej DAP sa odpočíta doprava${own?" a tvoj odpočet":""} a výsledok sa zverejní. Zaokrúhľuje sa nadol na celé €. Burza sa použije iba vtedy, keď regionálna cena chýba.
   Kto čo vidí, sa nemení: farmári vidia iba výslednú cenu ako doteraz, nikdy odberateľa ani burzu. <b>Tvoje ceny</b> zapíš v tabuľke nižšie – majú prednosť do dátumu, potom sa vráti automatická.</div>
   <div class="acn-rows">${rows}</div>
   ${own?`<div class="acn-cfg"><label>Odpočet ERNTE €/t<input data-acncfg="marginOwn" inputmode="decimal" value="${e(A.cfg.marginOwn??"")}" placeholder="${e(f2(A.mg&&A.mg.rec!=null?A.mg.rec:20))}"><small>${A.mg&&A.mg.rec!=null?"prázdne = z Kalkulačky ("+f2(A.mg.rec)+")":"prázdne = 20 €/t"}</small></label>
     <label>Moja cena platí dní<input data-acncfg="mineDays" inputmode="numeric" value="${e(A.cfg.mineDays)}"></label>
     <label>Pripomenúť moje ceny každých dní<input data-acncfg="remindDays" inputmode="numeric" value="${e(A.cfg.remindDays)}"><small>0 = nepripomínať</small></label>
</div>`:""}
   <div class="acn-st">${A.err?`<b class="bad">${e(A.err)}</b> · `:""}${A.lastRun?"Skontrolované "+hm(A.lastRun)+(A.lastCh?" · zmenené "+A.lastCh:" · bez zmeny"):"Ešte neprebehlo"} · automaticky každých 20 min, keď je aplikácia otvorená${A.mk&&A.mk.updatedAt?" · trh "+hm(A.mk.updatedAt):""}</div>
   <div class="btns"><button type="button" class="pri" data-acn="run">↻ Prepočítať a zverejniť teraz</button></div>
   ${L.length?`<details class="acn-h"><summary>📜 História zmien cien (${(A.log||[]).length})</summary><ul>${L.map(x=>`<li><span>${hm(x.at)}</span> <b>${e(nm(x.com))}</b> ${x.old==null?"–":f0(x.old)} → <b>${x.new==null?"skryté":f0(x.new)}</b> <small>${srcL(x)}</small></li>`).join("")}</ul></details>`:""}</div>`}
function css(){if(document.getElementById("acnCss"))return;const s=document.createElement("style");s.id="acnCss";s.textContent=`
.acn-wrap{display:grid;gap:10px;margin:8px 0 12px}.acn-b{border-radius:20px;padding:12px 14px;border:1px solid rgba(182,255,59,.5);background:linear-gradient(135deg,rgba(28,48,30,.95),rgba(14,22,30,.95));color:#F3F1EA;box-shadow:0 10px 30px rgba(0,0,0,.3);animation:acnIn .4s ease}
.acn-b.warn{border-color:#FFC457;background:linear-gradient(135deg,rgba(60,44,12,.95),rgba(20,18,14,.95))}.acn-b.rem{border-color:rgba(130,190,255,.6);background:linear-gradient(135deg,rgba(16,34,58,.95),rgba(14,22,30,.95))}
.acn-bh{display:flex;gap:10px;align-items:center;font-size:1.02rem}.acn-bh span{font-size:1.5rem}.acn-b ul{margin:8px 0 4px;padding-left:18px;display:grid;gap:4px}.acn-b li small{opacity:.78}.acn-b li button{min-height:32px;padding:0 12px;margin-left:6px}
.acn-b .s{opacity:.85;font-size:.86rem;margin:6px 0}html[data-theme=light] .acn-b{background:#fff;color:#0f172a}
.acn-rows{display:grid;gap:8px;margin:12px 0}.acn-r{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.03)}
.acn-r.on{border-color:rgba(182,255,59,.35)}.acn-r.mine{border-color:rgba(255,196,87,.55)}.acn-rh{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:end}
.acn-rh .n{font-size:.95rem}.acn-r.on .n{color:#B6FF3B}.acn-r.mine .n{color:#FFC457}.acn-rh .v{display:grid;justify-items:end;line-height:1.1}.acn-rh .v small{font-size:.66rem;opacity:.6}.acn-rh .v b{font-size:1.15rem}.acn-rh .v b.no{opacity:.4}.acn-rh .v.a b{opacity:.85}
.acn-rd{font-size:.76rem;opacity:.85;margin-top:6px;line-height:1.4}.acn-dap{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}.acn-dap span{display:grid;padding:6px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04)}.acn-dap span.best{border-color:rgba(182,255,59,.6);background:rgba(182,255,59,.08)}.acn-dap small{opacity:.7;font-size:.7rem}.acn-pd{margin-top:6px;color:#FFC457}.acn-arx{margin:2px 0 8px;padding:8px 10px;border-radius:12px;background:rgba(182,255,59,.08);border:1px solid rgba(182,255,59,.45);line-height:1.45}.acn-cmp{opacity:.6}.acn-rm2{display:flex;gap:8px;align-items:center;margin-top:6px;font-size:.76rem;opacity:.85}.acn-rm2 input{width:90px;min-height:32px;padding:2px 8px}.acn-bl{margin-top:8px;padding:8px 10px;border-radius:12px;background:rgba(130,190,255,.07);border:1px solid rgba(130,190,255,.25)}.acn-blc{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:6px}.acn-blc label{font-size:.74rem}.acn-pd button{min-height:30px;padding:0 12px;margin-left:6px}.acn-rm{margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}html[data-theme=light] .acn-r.on .n{color:#4d7c00}html[data-theme=light] .acn-r.mine .n{color:#b26b00}.acn-old{color:#FFC457;font-style:normal;font-size:.72rem}.acn-sw{display:inline-flex;gap:6px;align-items:center;white-space:nowrap;font-size:.82rem}.acn-sw input{width:auto;min-height:0}
.acn-sw.big{font-size:.86rem;font-weight:600}.acn-m{display:inline-flex;gap:4px;align-items:center;white-space:nowrap;font-size:.8rem}.acn-m input{width:auto;min-height:32px;padding:2px 6px;font-size:.8rem}.acn-x{min-height:30px;padding:0 10px;font-size:.78rem;margin-top:4px}.acn-n{font-size:.76rem;opacity:.65}
.acn-cfg{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:6px 0 10px}.acn-cfg small{display:block;opacity:.65;font-size:.72rem}
.acn-st{font-size:.78rem;opacity:.75;margin:6px 0}.acn-st .bad{color:#ff7b7b}.acn-h ul{list-style:none;padding:0;margin:8px 0;display:grid;gap:4px;font-size:.82rem}.acn-h li span{opacity:.6;font-size:.76rem}.acn-h li small{opacity:.7}
@keyframes acnIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.acn-b{animation:none}}`;document.head.appendChild(s)}
function inject(){const app=document.getElementById("app");if(!app||!staff())return;css();
  app.querySelectorAll(".acn-wrap,.acn-card").forEach(x=>x.remove());
  if(typeof TAB==="undefined")return;
  if(OWN()&&(TAB==="home"||TAB==="price")){const b=bannerHTML();if(b){const d=document.createElement("div");d.innerHTML=b;const a=app.querySelector("nav.tabs:not(.trtabs)")||app.querySelector(".hero");if(a)a.after(d.firstChild);else app.prepend(d.firstChild)}}
  if(TAB==="price"&&OWN()){const f=app.querySelector("#fPrice");if(f){const d=document.createElement("div");d.innerHTML=cardHTML();f.before(d.firstChild);
    if(A.cfg&&A.cfg.on&&!f.querySelector("[name=ac_till]")){const btn=f.querySelector(".btns");const l=document.createElement("label");l.className="w acn-tl";
      l.innerHTML=`Zmenené ceny platia ako tvoje do<input name="ac_till" type="date" value="${e(addD(T(),+A.cfg.mineDays||7))}"><small>Potom sa komodity s 🤖 vrátia na automatickú cenu. Vymazaná cena = komodita sa nezverejní a automatika sa pre ňu vypne.</small>`;if(btn)btn.before(l)}}}}
function wrap(){const o=window.renderStaff;if(typeof o!=="function"||o.__acn)return;const w=function(){const r=o.apply(this,arguments);try{inject()}catch(x){}return r};w.__acn=1;Object.keys(o).forEach(k=>{try{w[k]=o[k]}catch(x){}});window.renderStaff=w;try{inject()}catch(x){}}
const tk=setInterval(wrap,500);setTimeout(()=>clearInterval(tk),60000);wrap();

// ---- ovládanie ----
document.addEventListener("click",async ev=>{const b=ev.target.closest&&ev.target.closest("[data-acn]");if(!b)return;ev.preventDefault();const k=b.dataset.acn;
  if(k==="seen"){const L=A.log||[];ss(SEEN,L.length?L[L.length-1].at:new Date().toISOString());inject();return}
  if(k==="open"){try{TAB="price"}catch(x){}renderStaff();scrollTo(0,0);return}
  if(k==="expok"){A.expired=[];inject();return}
  if(k==="snooze"){const d=new Date();d.setDate(d.getDate()+1);d.setHours(7,0,0,0);ss(SNZ,String(d.getTime()));inject();return}
  if(k==="none"){A.cfg.lastMineAt=new Date().toISOString();await saveCfg();inject();return}
  if(k==="write"){try{TAB="price"}catch(x){}renderStaff();setTimeout(()=>{const f=document.getElementById("fPrice");if(f){f.scrollIntoView({behavior:"smooth",block:"start"});const i=f.querySelector("input");i&&i.focus({preventScroll:true})}},120);return}
  if(k==="run"){if(typeof busy==="function")busy(b,true);await run(true);if(typeof toast==="function"&&!A.err&&!A.lastCh)toast("Cenník je aktuálny – nič sa nezmenilo.");return}
  if(k==="allowall"){Object.keys(A.pend||{}).forEach(c=>A.allow[c]=1);await run(true);return}
  if(k.startsWith("allow:")){A.allow[k.slice(6)]=1;await run(true);return}
  if(k.startsWith("back:")){const c=k.slice(5);delete A.cfg.mine[c];A.cfg.auto[c]=true;await saveCfg();await run(true);return}},true);
document.addEventListener("change",async ev=>{const t=ev.target;if(!t||!A.cfg)return;
  if(t.matches("[data-acnon]")){if(!OWN())return;A.cfg.on=t.checked;await saveCfg();if(t.checked)await run(true);else rerender();return}
  if(t.matches("[data-acnauto]")){const c=t.dataset.acnauto;A.cfg.auto[c]=t.checked;await saveCfg();if(t.checked)await run(true);else rerender();return}
  if(t.matches("[data-acnmeth]")&&OWN()){A.cfg.method=A.cfg.method||{};A.cfg.method[t.dataset.acnmeth]=t.value;await saveCfg();await run(true);return}
  if(t.matches("[data-acnbas]")&&OWN()){const v=typeof num==="function"?num(t.value):parseFloat(t.value);A.cfg.basis=A.cfg.basis||{};A.cfg.basis[t.dataset.acnbas]=Number.isFinite(v)?v:null;await saveCfg();await run(true);return}
  if(t.matches("[data-acnadmb]")&&OWN()){const v=typeof num==="function"?num(t.value):parseFloat(String(t.value).replace(",","."));A.cfg.admB=A.cfg.admB||{};A.cfg.admB[t.dataset.acnadmb]=t.value.trim()!==""&&Number.isFinite(v)?v:null;await saveCfg();try{await sb.rpc("soja_adm_run")}catch(x){}if(typeof toast==="function")toast("Báza ADM uložená.");await run(true);return}
  if(t.matches("[data-acntill]")){const c=t.dataset.acntill;if(A.cfg.mine[c]){A.cfg.mine[c].till=t.value||addD(T(),+A.cfg.mineDays||7);await saveCfg();await run(true)}return}
  if(t.matches("[data-acncfg]")&&OWN()){const k=t.dataset.acncfg,v=typeof num==="function"?num(t.value):parseFloat(t.value);
    if(k==="refPct")A.cfg.refPct=0;else if(k==="marginOwn")A.cfg.marginOwn=t.value.trim()===""||!Number.isFinite(v)?null:v;else if(Number.isFinite(v)&&v>=0)A.cfg[k]=v;
    await saveCfg();if(k==="admDop"){try{await sb.rpc("soja_adm_run")}catch(x){}}if(k==="iaMinus"){try{await sb.rpc("ia_run")}catch(x){}}if(typeof toast==="function")toast("Uložené.");await run(true)}},true);

// ---- štart: majiteľ a ľudia s cenníkom + kalkulačkou; kontrola každých 20 min a pri návrate do aplikácie ----
// cenník vidí každý farmár (partner) v aplikácii – majiteľ pri otvorení zapne prístup „Výkupné ceny“ všetkým, kto ho má vypnutý
let pubDone=false;
async function pubAll(){if(pubDone||!OWN()||typeof STATE==="undefined"||!STATE.farmers||!STATE.settings)return;pubDone=true;let n=0;
  try{const G=STATE.settings.farmer_perms||{};if(G.f_prices===false){const r=await sb.rpc("set_farmer_perm_def",{p:{...G,f_prices:true}});if(!r.error){STATE.settings.farmer_perms={...G,f_prices:true};n++}}
    for(const f of STATE.farmers){const P=f.perms||{};if(P.f_prices===false){const r=await sb.rpc("set_farmer_perms",{fid:f.id,p:{...P,f_prices:true}});if(!r.error){f.perms={...P,f_prices:true};n++}}}
    if(n&&typeof toast==="function")toast(`Cenník je zverejnený všetkým farmárom (zapnuté u ${n}).`,5000)}catch(x){pubDone=false}}
let started=false;
function start(){if(started||!ED())return;started=true;setTimeout(pubAll,2500);setTimeout(()=>run(true),3500);setInterval(()=>{if(!document.hidden)run()},20*60e3);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)run()});
  if(OWN())setInterval(async()=>{if(document.hidden&&!("Notification" in window&&Notification.permission==="granted"))return;
    const n=(A.log||[]).length,l=await kget("pricelist","log");if(l&&l.items&&l.items.length!==n){A.log=l.items;notifyNew()}},2*60e3)}
const sw=setInterval(()=>{if(ED()&&typeof STATE!=="undefined"&&STATE.prices){clearInterval(sw);start()}},1500);setTimeout(()=>clearInterval(sw),20*60e3);
window.autoCennik={run,calc:()=>{return calc()},state:A};
})();
