// ===== ERNTE · AGRO SLUŽBY (Excel „Stroje v počte“) =====
// Majiteľ: kalkulácia strojov (náklady, bod nula, marža, porovnanie, reálne tankovanie), cenník služieb, objednávky.
// Zamestnanec s prístupom „agro“: objednávky a cenník bez nákladov. Farmár: cenník služieb, objednávka, moje objednávky.
(function(){
const AGM=[["CLAAS","T","AXION 830",235,null,36.1,25.2,48.6],["CLAAS","T","AXION 850",264,null,40.6,28.3,54.6],["CLAAS","T","AXION 870",295,null,45.3,31.6,61],["CLAAS","T","AXION 920",325,null,49.9,34.9,67.2],["CLAAS","T","AXION 930",355,null,54.6,38.1,73.4],["CLAAS","T","AXION 940",385,null,59.2,41.3,79.6],["CLAAS","T","AXION 950",410,null,63,44,84.7],["CLAAS","T","AXION 960",445,null,68.4,47.7,92],["CLAAS","T","XERION 4200",462,null,71,49.6,95.5],["CLAAS","T","XERION 4500",490,null,75.3,52.6,101.3],["CLAAS","T","XERION 5000",530,null,81.4,56.8,109.5],["CLAAS","T","XERION 12.590",585,null,89.9,62.7,120.9],["CLAAS","T","XERION 12.650",653,null,100.3,70,134.9],["CLAAS","K","TRION 530",258,null,29.2,21.9,36.5],["CLAAS","K","TRION 540",306,null,34.6,26,43.3],["CLAAS","K","TRION 550",354,null,40,30,50],["CLAAS","K","TRION 650",354,null,40,30,50],["CLAAS","K","TRION 660",408,null,46.1,34.6,57.6],["CLAAS","K","TRION 730",408,null,46.1,34.6,57.6],["CLAAS","K","TRION 740",435,null,49.2,36.9,61.5],["CLAAS","K","TRION 750",466,null,52.7,39.5,65.9],["CLAAS","K","LEXION 5500",408,null,46.1,34.6,57.6],["CLAAS","K","LEXION 6600",408,null,46.1,34.6,57.6],["CLAAS","K","LEXION 6700",408,null,46.1,34.6,57.6],["CLAAS","K","LEXION 6900",507,null,57.3,43,71.6],["CLAAS","K","LEXION 7400",408,null,46.1,34.6,57.6],["CLAAS","K","LEXION 7500",435,null,49.2,36.9,61.5],["CLAAS","K","LEXION 7600",507,null,57.3,43,71.6],["CLAAS","K","LEXION 7700",585,null,66.1,49.6,82.6],["CLAAS","K","LEXION 7800",625,null,70.6,53,88.3],["CLAAS","K","LEXION 8600",549,null,62.1,46.6,77.6],["CLAAS","K","LEXION 8700 TERRA TRAC",585,null,66.1,49.6,82.6],["CLAAS","K","LEXION 8800 TERRA TRAC",700,65,79.1,59.3,98.9],["CLAAS","K","LEXION 8900 TERRA TRAC",790,66,89.3,67,111.6],["Case IH","T","Puma 240",240,null,36.9,25.7,49.6],["Case IH","T","Optum 270",288,null,44.3,30.9,59.5],["Case IH","T","Optum 300",313,null,48.1,33.6,64.7],["Case IH","T","Optum 340",340,null,52.2,36.5,70.3],["Case IH","T","Optum 360",360,null,55.3,38.6,74.4],["Case IH","T","Optum 390",390,null,59.9,41.8,80.6],["Case IH","T","Optum 440",440,null,67.6,47.2,90.9],["Case IH","T","Magnum 355",355,null,54.6,38.1,73.4],["Case IH","T","Magnum 385",385,null,59.2,41.3,79.6],["Case IH","T","Magnum 405",405,null,62.2,43.4,83.7],["Case IH","T","Steiger 425",425,null,65.3,45.6,87.8],["Case IH","T","Steiger 475",475,null,73,50.9,98.2],["Case IH","T","Steiger 525",525,null,80.7,56.3,108.5],["Case IH","T","Steiger 555",555,null,85.3,59.5,114.7],["Case IH","T","Steiger 595",595,null,91.4,63.8,123],["Case IH","T","Steiger 645",645,null,99.1,69.2,133.3],["Case IH","T","Steiger 715",715,null,109.9,76.7,147.7],["Case IH","T","Steiger 785",785,null,120.6,84.2,162.2],["Case IH","K","Axial-Flow 6160",400,null,45.2,33.9,56.5],["Case IH","K","Axial-Flow 7160",460,null,52,39,65],["Case IH","K","Axial-Flow 7250",498,null,56.3,42.2,70.4],["Case IH","K","Axial-Flow 8250",571,null,64.5,48.4,80.6],["Case IH","K","Axial-Flow 9250",634,null,71.7,53.8,89.6],["Case IH","K","Axial-Flow AF9",635,null,71.8,53.9,89.8],["Case IH","K","Axial-Flow AF10",775,null,87.6,65.7,109.5],["Fendt","T","722 Vario Gen7.1",223,null,34.3,23.9,46.1],["Fendt","T","724 Vario Gen7.1",243,null,37.3,26.1,50.2],["Fendt","T","726 Vario Gen7.1",262,null,40.3,28.1,54.1],["Fendt","T","728 Vario Gen7.1",283,null,43.5,30.4,58.5],["Fendt","T","826 Vario",260,null,40,27.9,53.7],["Fendt","T","829 Vario",290,null,44.6,31.1,59.9],["Fendt","T","832 Vario",320,null,49.2,34.3,66.1],["Fendt","T","930 Vario",296,null,45.5,31.7,61.2],["Fendt","T","933 Vario",326,null,50.1,35,67.4],["Fendt","T","936 Vario",355,null,54.6,38.1,73.4],["Fendt","T","939 Vario",385,null,59.2,41.3,79.6],["Fendt","T","942 Vario",415,null,63.8,44.5,85.8],["Fendt","T","1040 Vario",426,null,65.5,45.7,88],["Fendt","T","1044 Vario",466,null,71.6,50,96.3],["Fendt","T","1048 Vario",517,null,79.4,55.5,106.8],["Fendt","T","1052 Vario",550,null,84.5,59,113.7],["Fendt","K","C 5255",260,null,29.4,22.1,36.8],["Fendt","K","C 5275",306,null,34.6,26,43.3],["Fendt","K","IDEAL 7",451,null,51,38.3,63.8],["Fendt","K","IDEAL 8",538,null,60.8,45.6,76],["Fendt","K","IDEAL 9",647,null,73.1,54.8,91.4],["Fendt","K","IDEAL 10",790,null,89.3,67,111.6],["Fendt","P","1167 Vario MT",680,112,112,90,125]];
const TYP={T:"Traktor",K:"Kombajn",P:"Pásový traktor"};
const mId=m=>m[0]+" | "+m[2];
const mFind=id=>AGM.find(m=>mId(m)===id)||AGM[0];
// --- ZÁVESNÉ / ŤAHANÉ NÁRADIE (orientačné nové ceny bez DPH, záber, odporúčaný výkon traktora, rýchlosť, nafta podľa KTBL) ---
// [značka, model, trieda, záber m, cena €, hp od, hp do, km/h, nafta l/ha (stredná pôda), poznámka]
const IMP=[
 ["Väderstad","TopDown 700","C",7,105000,310,450,12,12,"diskový kypič: tanierová sekcia + radličky + valec, 5–25 cm"],
 ["Väderstad","TopDown 500","C",5,82000,220,320,12,12,"diskový kypič 5–25 cm"],
 ["Väderstad","TopDown 400","C",4,70000,180,260,12,12,"diskový kypič 5–25 cm"],
 ["Väderstad","Opus 700","C",7,85000,280,400,12,10,"radličkový kypič 5–30 cm"],
 ["Väderstad","Carrier 625","D",6.25,55000,160,260,15,7,"krátka tanierová brána 3–15 cm"],
 ["Väderstad","Carrier XL 625","D",6.25,72000,200,320,15,8,"tanierová brána s veľkými diskami, do 15 cm"],
 ["Väderstad","NZ Aggressive 800","S",8,48000,150,250,12,5,"predsejbový kompaktor, 3–15 cm"],
 ["Väderstad","NZ Aggressive 600","S",6,40000,120,200,12,5,"predsejbový kompaktor"],
 ["Väderstad","Spirit 600 C","V",6,145000,180,300,14,7,"pneumatická sejačka s diskovou prípravou"],
 ["Väderstad","Spirit 400 C","V",4,110000,140,220,14,7,"pneumatická sejačka"],
 ["Väderstad","Rapid A 600S","V",6,120000,160,240,13,6.5,"sejačka s prípravou pôdy"],
 ["Väderstad","Tempo V 8","R",6,120000,150,220,15,4,"presná sejačka 8 riadkov"],
 ["Väderstad","Rexius Twin 830","W",8.3,45000,120,200,13,3,"valec"],
 ["Lemken","Diamant 11 V 8 L100","P",3.6,72000,280,400,7,22,"návesný otočný pluh 8 radlíc (do 45 cm/radlica), orba 25 cm"],
 ["Lemken","Diamant 11 V 6+1 L100","P",3.15,58000,220,330,7,22,"návesný otočný pluh 7 radlíc"],
 ["Lemken","Juwel 8 M V 5+1","P",2.7,38000,160,230,7,22,"nesený otočný pluh 6 radlíc"],
 ["Lemken","Rubin 12/400 KUA","D",4,48000,180,260,12,9,"kompaktná tanierová brána do 20 cm"],
 ["Lemken","Rubin 12/600 KUA","D",6,68000,260,380,12,9,"kompaktná tanierová brána do 20 cm"],
 ["Lemken","Rubin 10/600 KUA","D",6,62000,220,330,14,8,"kompaktná tanierová brána"],
 ["Lemken","Heliodor 9/600 KA","D",6,45000,160,240,15,6,"plytká tanierová brána"],
 ["Lemken","Karat 12/600 KUA","C",6,75000,300,450,11,12,"radličkový kypič do 35 cm"],
 ["Lemken","Karat 10/500 KUA","C",5,58000,230,340,11,12,"radličkový kypič"],
 ["Lemken","Koralin 9/840 K","S",8.4,45000,150,250,12,5,"predsejbový kypič"],
 ["Lemken","Solitair 25/600","V",6,120000,200,300,13,8,"pneumatická sejačka s kombináciou"],
 ["Lemken","Azurit 9 8 riadkov","R",6,110000,150,220,12,4.5,"presná sejačka"],
 ["Horsch","Joker 6 RT","D",6,60000,170,300,15,7,"krátka tanierová brána"],
 ["Horsch","Joker 8 RT","D",8,80000,230,400,15,7,"krátka tanierová brána"],
 ["Horsch","Terrano 6 FX","C",6,75000,300,450,11,12,"radličkový kypič"],
 ["Horsch","Tiger 6 MT","C",6,110000,350,500,11,14,"diskový kypič, hlboké kyprenie"],
 ["Horsch","Pronto 6 DC","V",6,150000,180,300,15,8,"sejačka s tanierovou prípravou"],
 ["Horsch","Maestro 12 SW","R",9,190000,200,300,13,4.5,"presná sejačka 12 riadkov"],
 ["Amazone","Catros+ 6003-2","D",6,55000,160,280,15,6.5,"krátka tanierová brána"],
 ["Amazone","Cenius 6003-2TX","C",6,70000,260,420,11,11,"radličkový kypič"],
 ["Amazone","Cirrus 6003-2","V",6,140000,160,300,14,7.5,"pneumatická sejačka"],
 ["Kuhn","Performer 5000","C",5,90000,300,450,11,13,"diskový kypič"]];
// triedy podľa ASABE D497.7 (efektivita poľa, životnosť, opravy RF1/RF2, zostatková hodnota) + KTBL referenčná hĺbka
const CLS={P:{n:"Pluh",svc:"Orba",fe:85,life:2000,rf1:.29,rf2:1.8,rv:"T",d:25},D:{n:"Tanierová brána",svc:"Podmietka tanierovou bránou",fe:80,life:2000,rf1:.18,rf2:1.7,rv:"T",d:10},
 C:{n:"Kypič (disk + radlica)",svc:"Hlboké kyprenie",fe:85,life:2000,rf1:.28,rf2:1.4,rv:"T",d:18},S:{n:"Predsejbový kompaktor",svc:"Predsejbová príprava pôdy",fe:85,life:2000,rf1:.27,rf2:1.4,rv:"T",d:0},
 V:{n:"Sejačka",svc:"Sejba obilnín a repky",fe:70,life:1500,rf1:.32,rf2:2.1,rv:"S",d:0},R:{n:"Presná sejačka",svc:"Presná sejba (kukurica, slnečnica)",fe:65,life:1500,rf1:.32,rf2:2.1,rv:"S",d:0},
 W:{n:"Valec",svc:"Valcovanie",fe:85,life:2000,rf1:.16,rf2:1.3,rv:"T",d:0}};
// zostatková hodnota ASABE: RV% = (C1 − C2·√roky − C3·√ročných hodín)²
const RVC={T:[.756,.067,0],S:[.883,.078,0],TR:[.976,.119,.0019],TRs:[.981,.093,.0058],K:[1.132,.165,.0079]};
const rvPct=(k,yrs,ah)=>{const c=RVC[k];return Math.max(.05,Math.min(1,Math.pow(Math.max(0,c[0]-c[1]*Math.sqrt(yrs)-c[2]*Math.sqrt(ah)),2)))};
const SOIL={l:["ľahká",.75],m:["stredná",1],h:["ťažká",1.3]};
const iId=x=>x[0]+" | "+x[1];
const iFind=id=>id?IMP.find(x=>iId(x)===id)||null:null;
// --- predvolené vstupy = hodnoty z Excelu ---
const DEF_M=(model,price)=>({model,impl:"",iprice:"",ihaYr:1500,iyrs:8,soil:"m",depth:"",speed:12,width:5,eff:85,unit:"l/ha",own:"",price,life:5000,net:1800,hours:174,svc:4,ins:1.5,annual:1000,ovh:0,sell:46.68,tankL:"",tankHa:""});
const DEF={m:[DEF_M("CLAAS | AXION 850",154000),DEF_M("CLAAS | AXION 930",230000)],fuel:1.92,fuelDate:"2026-09-17",area:50,model:"asabe",rate:5,lube:5,labor:10};
DEF.m[0].tankL=450;DEF.m[0].tankHa=50;DEF.m[1].tankL=600;DEF.m[1].tankHa=50;
const STS={nova:["nová","w"],potvrdena:["potvrdená","b"],v_praci:["v práci","b"],hotova:["hotová",""],zrusena:["zrušená","g"]};
const UN={ha:"ha",h:"mth",t:"t",km:"km",ks:"ks"};
let A={sec:"",cfg:null,orders:null,srv:null,flt:"open",edit:null,saveT:null};
const n=v=>{const x=typeof num==="function"?num(v):+v;return Number.isFinite(x)?x:NaN};
const f2=(x,d=2)=>fmt(x,d);
// zamestnanec: celková cena práce z čistej mzdy (SR 2026: odvody zamestnanca 14,4 %, daň 19 %, NČZD 497,23 €/mes., odvody zamestnávateľa 36,2 %)
const empCost=net=>Math.round(((net-497.23*0.19)/((1-0.144)*(1-0.19)))*1.362*100)/100;
// vlastnícke + prevádzkové náklady stroja na motohodinu podľa ASABE D497 (odpis zo zostatkovej hodnoty, úrok z priemerného kapitálu, poistenie a garáž, opravy RF1·(h/1000)^RF2)
function own(P,yrs,ah,rvk,rf1,rf2,insPct,rate,svcPct){const rv=rvPct(rvk,yrs,ah)*P,H=yrs*ah,dep=(P-rv)/yrs/ah,int=(P+rv)/2*rate/100/ah,ins=P*insPct/100/ah,
  rep=svcPct!=null?P*svcPct/100/ah:P*rf1*Math.pow(H/1000,rf2)/H;return {rv,dep,int,ins,rep,tot:dep+int+ins+rep}}
// --- výpočet jednej súpravy (traktor/kombajn + náradie) ---
function calc(m,c){const M=mFind(m.model),pub=M[4],est=M[5],cat=pub!=null?pub:est,I=iFind(m.impl),K=I?CLS[I[2]]:null,asabe=c.model!=="excel";
  const theo=n(m.speed)*n(m.width)/10,eff=Math.min(100,Math.max(30,n(m.eff)||100))/100,cap=theo*eff,soil=SOIL[m.soil]||SOIL.m;
  // potrebný výkon: odporúčaný stred výrobcu prepočítaný na záber, pôdu, hĺbku a rýchlosť
  const dep0=K&&K.d?K.d:0,depth=n(m.depth),dF=dep0&&depth>0?.4+.6*depth/dep0:1,sF=I?Math.pow(n(m.speed)/I[7],1.2):1;
  const tKw=M[3]*.7355,needKw=I?((I[5]+I[6])/2*.7355*.8)*(n(m.width)/I[3])*soil[1]*dF*sF:NaN,usable=tKw*.8,load=I?needKw/usable:NaN,maxSpd=I?n(m.speed)*Math.pow(1/load,1/1.2):NaN;
  // nafta: vlastná > náradie (KTBL × pôda × hĺbka) > katalóg traktora
  const ow=m.own===""||m.own==null?NaN:n(m.own),hasOwn=Number.isFinite(ow);
  let lph,lha,src;if(hasOwn){lph=m.unit==="l/h"?ow:ow*cap;src="vlastný údaj"}else if(I){lha=I[8]*soil[1]*dF;lph=lha*cap;src="KTBL podľa náradia, pôdy a hĺbky"}else{lph=cat;src=pub!=null?"publikovaný údaj / test":"modelový odhad z verejných testov"}
  if(lha==null)lha=cap>0?lph/cap:NaN;
  const fp=n(c.fuel),emp=empCost(n(m.net)),laborF=asabe?1+(n(c.labor)||0)/100:1,empH=emp/n(m.hours)*laborF,rate=n(c.rate)||0;
  const P=n(m.price),ah=n(m.annual),yrs=n(m.life)/ah,ip=I?(m.iprice===""||m.iprice==null?I[4]:n(m.iprice)):0;
  let T,Im,lube=0;
  if(asabe){const trk=M[1]==="K"?"K":M[3]*.7355>=150?"TR":"TRs",rf=M[1]==="K"?[.04,2.1]:M[1]==="P"?[.003,2]:[.007,2];
    T=own(P,yrs,ah,trk,rf[0],rf[1],n(m.ins),rate,null);
    if(I){const iah=Math.max(20,n(m.ihaYr)/cap),iy=Math.min(n(m.iyrs)||8,K.life/iah);Im=own(ip,Math.max(1,iy),iah,K.rv,K.rf1,K.rf2,n(m.ins),rate,null);Im.ah=iah;Im.yrs=iy}
    lube=lph*fp*(n(c.lube)||0)/100}
  else{const PP=P+ip;T={dep:PP/n(m.life),int:0,ins:PP*n(m.ins)/100/ah,rep:PP*n(m.svc)/100/ah,rv:0};T.tot=T.dep+T.ins+T.rep;Im=null}
  const ovh=n(m.ovh)||0,costH=T.tot+(Im?Im.tot:0)+empH+lube+ovh,costHa=costH/cap,sell=n(m.sell),margin=sell-costHa,area=n(c.area);
  const realL=n(m.tankL),realHa=n(m.tankHa),real=realL>0&&realHa>0?realL/realHa:NaN,depH=T.dep+(Im?Im.dep:0),capital=P+ip;
  return {M,I,K,asabe,cat,pub,est,src,theo,eff,cap,lph,lha,emp,empH,T,Im,lube,ovh,costH,costHa,sell,margin,needKw,tKw,usable,load,maxSpd,soil,depth:dep0?(depth>0?depth:dep0):0,
    pct:sell>0?margin/sell*100:NaN,profit:margin*area,mthPrice:sell*cap,mthProfit:sell*cap-costH,hrs:area/cap,capital,
    payback:margin+depH/cap>0?capital/((margin+depH/cap)*5):NaN,fuelHa:lha*fp,custHa:sell+lha*fp,real,realFuelHa:real*fp,realCustHa:sell+real*fp,area,
    depHa:(T.dep+T.int+(Im?Im.dep+Im.int:0))/cap,empHa:empH/cap,svcHa:(T.ins+T.rep+(Im?Im.ins+Im.rep:0)+lube+ovh)/cap}}
const nm=m=>esc(m.model)+(m.impl?" + "+esc(String(m.impl).split(" | ")[1]):"");
// ===== MAJITEĽ / TÍM =====
window.vAgro=function(){const OWN=ROLE==="owner",SEC=[["ord","📋","Objednávky","od farmárov · stav · termíny"],["srv","💶","Cenník služieb","čo vidia a objednávajú farmári"]];
  if(OWN)SEC.push(["fleet","🛠️","Náš park a ponuka","kombajny · traktory · náradie · ceny pre farmárov"],["calc","🧮","Kalkulácia strojov","náklady · bod nula · marža · porovnanie"],["cat","📚","Katalóg strojov a náradia","82 strojov · "+IMP.length+" náradí · nafta · výkon"]);
  let h=`<div class="zt"><h2>🚜 Agro služby ${A.sec?`<button type="button" class="ztb" data-asec="">← späť</button>`:""}</h2>`;
  if(!A.sec){if(!A.orders)loadOrders();const nw=(A.orders||[]).filter(o=>o.status==="nova").length;
    return h+`<div class="zgrid">${SEC.map(s=>`<button type="button" class="zbtn" data-asec="${s[0]}"><span>${s[1]}</span><b>${s[2]}${s[0]==="ord"&&nw?` <em class="acnt">${nw} nové</em>`:""}</b><small>${s[3]}</small></button>`).join("")}</div>
      <div class="s">🔒 Náklady, marža a kalkulácia sú iba pre teba. Farmár vidí len cenník služieb, ktorý zverejníš, a svoje objednávky.</div></div>`}
  if(A.sec==="ord")h+=ordHTML();else if(A.sec==="srv")h+=srvHTML();else if(A.sec==="fleet"&&OWN)h+=fleetHTML();else if(A.sec==="calc"&&OWN)h+=calcHTML();else if(A.sec==="cat"&&OWN)h+=catHTML();
  return h+`</div>`};
// --- objednávky ---
async function loadOrders(){const r=await sb.rpc("agro_orders_staff");A.orders=r.error?{err:r.error.message}:r.data||[];if(typeof TAB!=="undefined"&&TAB==="agro")renderStaff()}
function ordHTML(){const O=A.orders;if(!O){loadOrders();return `<div class="card"><div class="s">Načítavam objednávky…</div></div>`}
  if(O.err)return `<div class="card"><div class="s">${/agro_orders/.test(O.err)?"Agro služby sa zapnú po aktualizácii databázy (pár minút).":esc(O.err)}</div></div>`;
  const F={open:o=>["nova","potvrdena","v_praci"].includes(o.status),nova:o=>o.status==="nova",hotova:o=>o.status==="hotova",all:()=>true},L=O.filter(F[A.flt]||F.open);
  const op=O.filter(F.open),qty=op.reduce((s,o)=>s+(o.unit==="ha"?+o.qty:0),0),done=O.filter(o=>o.status==="hotova").reduce((s,o)=>s+(+o.total||0),0);
  let h=`<div class="hrk"><div class="${O.some(F.nova)?"wn":""}"><small>Nové objednávky</small><b>${O.filter(F.nova).length}</b></div><div><small>Otvorené</small><b>${op.length} · ${f2(qty,1)} ha</b></div><div><small>Otvorené v cene</small><b>${f2(op.reduce((s,o)=>s+(+o.total||0),0),0)} €</b></div><div class="ps"><small>Hotové spolu</small><b>${f2(done,0)} €</b></div></div>
   <div class="btns seg2">${[["open","Otvorené"],["nova","Nové"],["hotova","Hotové"],["all","Všetky"]].map(x=>`<button type="button" data-aflt="${x[0]}" aria-pressed="${A.flt===x[0]}">${x[1]}</button>`).join("")}</div>`;
  if(!L.length)return h+`<div class="card"><div class="s">Žiadne objednávky v tomto zozname.</div></div>`;
  return h+`<div class="agl">${L.map(o=>{const tel=String(o.phone||"").replace(/\D/g,"").replace(/^00/,"").replace(/^0/,"421");
    return `<div class="card agc ${o.status}"><div class="row"><span class="t">${esc(o.service_name||"Služba")}</span>${pill(STS[o.status]||[o.status])}</div>
    <div class="s"><b>${esc(o.farmer)}</b>${o.addr?" · "+esc(o.addr):""} · ${esc(o.no||"")} · ${esc(dtSK(o.created_at))}</div>
    <div class="zsg"><div><small>Množstvo</small><b>${f2(o.qty,1)} ${UN[o.unit]||o.unit}</b></div><div><small>Cena</small><b>${f2(o.price)} €/${UN[o.unit]||o.unit}</b></div><div class="hl"><small>Spolu bez DPH</small><b>${f2(o.total)} €</b></div><div><small>Termín</small><b>${o.planned?"📅 "+esc(dSK(o.planned)):o.date_from||o.date_to?esc((o.date_from?dSK(o.date_from):"…")+" – "+(o.date_to?dSK(o.date_to):"…")):"dohodou"}</b></div></div>
    ${o.place?`<div class="s">📍 ${esc(o.place)}</div>`:""}${o.note?`<div class="s">💬 ${esc(o.note)}</div>`:""}${o.reply?`<div class="s">↩️ ERNTE: ${esc(o.reply)}</div>`:""}
    ${o.status!=="zrusena"&&o.status!=="hotova"?`<form class="f agf" data-aord="${esc(o.id)}"><label>Termín práce<input type="date" name="planned" value="${esc(o.planned||"")}"></label><label>Skutočne ${UN[o.unit]||o.unit}<input name="done_qty" inputmode="decimal" value="${o.done_qty!=null?String(o.done_qty).replace(".",","):""}" placeholder="${f2(o.qty,1)}"></label>
      <label class="w">Odpoveď farmárovi<input name="reply" value="${esc(o.reply||"")}" placeholder="napr. prídeme v utorok ráno"></label>
      <div class="w btns">${o.status==="nova"?`<button class="pri" name="st" value="potvrdena">✓ Potvrdiť</button>`:""}${o.status!=="v_praci"?`<button name="st" value="v_praci">🚜 V práci</button>`:""}<button class="lime" name="st" value="hotova">✅ Hotovo</button><button name="st" value="">💾 Uložiť</button><button class="ghost" name="st" value="zrusena">✕ Zrušiť</button></div></form>`:""}
    <div class="btns">${o.phone?`<a class="btn" href="tel:${esc(String(o.phone).replace(/\s/g,""))}">📞 Zavolať</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent(`Dobrý deň, ERNTE Agro služby – objednávka ${o.no}: ${o.service_name}, ${f2(o.qty,1)} ${UN[o.unit]||o.unit}.${o.planned?" Termín: "+dSK(o.planned)+".":""}${o.reply?" "+o.reply:""}`)}">WhatsApp</a>`:""}</div></div>`}).join("")}</div>`}
// --- cenník služieb ---
async function loadSrv(){const r=await sb.from("agro_services").select("*").order("sort").order("name");A.srv=r.error?{err:r.error.message}:r.data||[];rerender()}
function srvForm(s){s=s||{unit:"ha",active:false,fuel_by_customer:true,sort:100};
  return `<form class="card f" id="fASrv" data-id="${esc(s.id||"")}"><div class="w t">${s.id?"Upraviť službu":"Nová služba"}</div>
   <label class="w">Názov služby<input name="name" required value="${esc(s.name||"")}" placeholder="napr. Podmietka tanierovým náradím"></label>
   <label>Stroj<input name="machine" value="${esc(s.machine||"")}" placeholder="napr. CLAAS AXION 850 · 5 m"></label>
   <label>Jednotka<select name="unit">${Object.entries({ha:"€ / ha",h:"€ / motohodina",t:"€ / t",km:"€ / km",ks:"€ / kus"}).map(([k,v])=>`<option value="${k}"${s.unit===k?" selected":""}>${v}</option>`).join("")}</select></label>
   <label>Cena bez DPH<input name="price" inputmode="decimal" required value="${s.price!=null?String(s.price).replace(".",","):""}"></label>
   <label>Nafta – odhad l/ha<input name="fuel_lha" inputmode="decimal" value="${s.fuel_lha!=null?String(s.fuel_lha).replace(".",","):""}"></label>
   <label>Minimálne množstvo<input name="min_qty" inputmode="decimal" value="${s.min_qty!=null?String(s.min_qty).replace(".",","):""}"></label>
   <label>Poradie<input name="sort" inputmode="numeric" value="${esc(s.sort??100)}"></label>
   <label class="w">Popis pre farmára<textarea name="descr" rows="2">${esc(s.descr||"")}</textarea></label>
   <label class="pck w"><input type="checkbox" name="fuel_by_customer"${s.fuel_by_customer!==false?" checked":""}><span>Naftu tankuje zákazník</span></label>
   <label class="pck w"><input type="checkbox" name="active"${s.active?" checked":""}><span><b>Zverejniť farmárom</b> – uvidia cenu a môžu objednať</span></label>
   <div class="w btns"><button class="pri">💾 Uložiť</button><button type="button" class="ghost" data-asedit="">Zavrieť</button>${s.id?`<button type="button" class="ghost" data-asdel="${esc(s.id)}">🗑️ Zmazať</button>`:""}</div></form>`}
function srvCard(s,own){return `<div class="card agsv ${s.active?"on":"off"}"><div class="row"><span class="t">${esc(s.name)}</span>${pill(s.active?["zverejnená",""]:["skrytá","g"])}</div>
  ${s.machine?`<div class="s">🚜 ${esc(s.machine)}</div>`:""}${s.descr?`<div class="s">${esc(s.descr)}</div>`:""}
  <div class="zsg"><div class="hl"><small>Cena bez DPH</small><b>${f2(s.price)} €/${UN[s.unit]||s.unit}</b></div><div><small>Nafta</small><b>${s.fuel_by_customer!==false?"tankuje zákazník":"v cene"}${s.fuel_lha?` · ~${f2(s.fuel_lha,1)} l/ha`:""}</b></div>${s.min_qty?`<div><small>Minimum</small><b>${f2(s.min_qty,0)} ${UN[s.unit]||s.unit}</b></div>`:""}</div>
  ${own?`<div class="btns"><button type="button" data-asedit="${esc(s.id)}">✏️ Upraviť</button><button type="button" data-astog="${esc(s.id)}">${s.active?"🙈 Skryť farmárom":"👁️ Zverejniť farmárom"}</button></div>`:""}</div>`}
function srvHTML(){const S=A.srv,OWN=ROLE==="owner";if(!S){loadSrv();return `<div class="card"><div class="s">Načítavam cenník…</div></div>`}
  if(S.err)return `<div class="card"><div class="s">${/agro_services/.test(S.err)?"Agro služby sa zapnú po aktualizácii databázy (pár minút).":esc(S.err)}</div></div>`;
  let h=`<div class="s">${OWN?"Zverejnené služby vidia farmári s cenou a môžu si ich objednať. Skryté vidíš iba ty. Cenu vieš prevziať z Kalkulácie strojov.":"Cenník služieb, ktorý vidia farmári."}</div>`;
  if(OWN&&A.edit==="new")h+=srvForm();else if(OWN)h+=`<div class="btns"><button type="button" class="pri" data-asedit="new">➕ Nová služba</button></div>`;
  return h+(S.length?S.map(s=>OWN&&A.edit===s.id?srvForm(s):srvCard(s,OWN)).join(""):`<div class="card"><div class="s">Zatiaľ žiadna služba.</div></div>`)}
// --- kalkulácia ---
async function loadCfg(){const r=await sb.from("agro_cfg").select("value").eq("key","calc").maybeSingle();
  if(r.error){A.cfg={err:r.error.message};renderStaff();return}const v=r.data&&r.data.value&&r.data.value.m?r.data.value:null,D=JSON.parse(JSON.stringify(DEF));
  A.cfg=v?{...D,...v,m:v.m.map((m,i)=>({...D.m[i],...m}))}:D;renderStaff()}
function saveCfg(){clearTimeout(A.saveT);A.saveT=setTimeout(async()=>{const r=await sb.from("agro_cfg").upsert({key:"calc",value:A.cfg,updated_at:new Date().toISOString()});const el=document.getElementById("agSave");if(el)el.textContent=r.error?"⚠️ Neuložené":"✓ Uložené"},900)}
const inp=(i,k,lab,unit,attr="")=>`<label><span>${lab}${unit?` <small>· ${unit}</small>`:""}</span><input data-ak="${i}.${k}" inputmode="decimal" value="${esc(String(i==="c"?A.cfg[k]??"":A.cfg.m[i][k]??"").replace(".",","))}" ${attr}></label>`;
function mInputs(i){const m=A.cfg.m[i],M=mFind(m.model);const groups=[...new Set(AGM.map(x=>x[0]+" · "+TYP[x[1]]))];
  return `<details class="card hsec agin"${i===0?" open":""}><summary><span>${i?"2️⃣":"1️⃣"}</span><b>Stroj ${i+1}: ${nm(m)}</b><small>${esc(TYP[M[1]])} · ${M[3]} hp · katalóg ${f2(M[5],1)} l/h</small></summary><div class="f agf">
   <label class="w">Model<select data-ak="${i}.model">${groups.map(g=>`<optgroup label="${esc(g)}">${AGM.filter(x=>x[0]+" · "+TYP[x[1]]===g).map(x=>`<option value="${esc(mId(x))}"${mId(x)===m.model?" selected":""}>${esc(x[2])} · ${x[3]} hp</option>`).join("")}</optgroup>`).join("")}</select></label>
   <label class="w">Závesné / ťahané náradie<select data-ak="${i}.impl"><option value="">bez náradia (len traktor / kombajn)</option>${[...new Set(IMP.map(x=>x[0]))].map(b=>`<optgroup label="${esc(b)}">${IMP.filter(x=>x[0]===b).map(x=>`<option value="${esc(iId(x))}"${iId(x)===m.impl?" selected":""}>${esc(x[1])} · ${CLS[x[2]].n} · ${String(x[3]).replace(".",",")} m</option>`).join("")}</optgroup>`).join("")}</select></label>
   ${m.impl?`${inp(i,"iprice","Cena náradia","€",`placeholder="${iFind(m.impl)?iFind(m.impl)[4]:""} (katalóg)"`)}${inp(i,"ihaYr","Ročne ha s náradím","ha")}${inp(i,"iyrs","Roky držania náradia","r.")}
   <label>Pôda<select data-ak="${i}.soil">${Object.entries(SOIL).map(([k,v])=>`<option value="${k}"${(m.soil||"m")===k?" selected":""}>${v[0]}</option>`).join("")}</select></label>${iFind(m.impl)&&CLS[iFind(m.impl)[2]].d?inp(i,"depth","Hĺbka práce","cm",`placeholder="${CLS[iFind(m.impl)[2]].d} (bežne)"`):""}`:""}
   <div class="w s agh">Práca</div>${inp(i,"speed","Rýchlosť","km/h")}${inp(i,"width","Pracovný záber","m")}${inp(i,"eff","Efektivita poľa","%")}
   <label>Jednotka vlastnej spotreby<select data-ak="${i}.unit"><option value="l/ha"${m.unit==="l/ha"?" selected":""}>l/ha</option><option value="l/h"${m.unit==="l/h"?" selected":""}>l/h</option></select></label>${inp(i,"own","Vlastná spotreba",m.unit,'placeholder="prázdne = odhad z katalógu"')}
   <div class="w s agh">Náklady</div>${inp(i,"price",A.cfg.model==="excel"&&!m.impl?"Obstarávacia cena súpravy":"Cena "+(mFind(m.model)[1]==="K"?"kombajnu":"traktora"),"€")}${inp(i,"life",A.cfg.model==="excel"?"Odpisovaná životnosť":"Doba držania","mth")}${inp(i,"net","Čistá mzda obsluhy","€/mes.")}${inp(i,"hours","Pracovné hodiny mesačne","h")}
   ${A.cfg.model==="excel"?inp(i,"svc","Servis a opravy","% z ceny/rok"):""}${inp(i,"ins","Poistenie","% z ceny/rok")}${inp(i,"annual","Ročné využitie","mth/rok")}${inp(i,"ovh","Dodatočná réžia","€/h")}
   <div class="w s agh">Predaj a reálne tankovanie</div>${inp(i,"sell","Cena služby","€/ha")}${inp(i,"tankL","Natankované","l")}${inp(i,"tankHa","Odpracovaná plocha","ha")}</div></details>`}
function resHTML(){const C=A.cfg,R=C.m.map(m=>calc(m,C)),[a,b]=R,na=nm(C.m[0]),nb=nm(C.m[1]),same=C.m[0].model===C.m[1].model;
  const tile=(l,v,c="")=>`<div class="${c}"><small>${l}</small><b>${v}</b></div>`;
  const mach=(r,i)=>`<div class="card agr ${r.margin>=0?"gain":"loss"}"><div class="row"><span class="t">${i+1}. ${nm(C.m[i])}</span>${pill(r.margin>0.005?["ZISK",""]:r.margin<-0.005?["STRATA","r"]:["NULA","w"])}</div>
    <div class="zsg agbig">${tile("Bod nula (náklad)",f2(r.costHa)+" €/ha")}${tile("Cena služby",f2(r.sell)+" €/ha")}${tile(r.margin>=0?"Zisk na hektár":"Strata na hektár",f2(r.margin)+" €/ha",r.margin>=0?"hl":"wn")}${tile("Zisk zákazky "+f2(r.area,0)+" ha",f2(r.profit,0)+" €",r.profit>=0?"hl":"wn")}</div>
    <div class="zsg">${tile("Výkon",f2(r.cap,2)+" ha/h")}${tile("Náklad na hodinu",f2(r.costH)+" €/h")}${tile("Cena za motohodinu",f2(r.mthPrice)+" €/mth")}${tile("Zisk na motohodinu",f2(r.mthProfit)+" €/mth",r.mthProfit>=0?"":"wn")}${tile("Marža",f2(r.pct,1)+" %")}${tile("Na splatenie stroja za 5 rokov",Number.isFinite(r.payback)?f2(r.payback,0)+" ha/rok":"–")}${tile("Spotreba",f2(r.lha,2)+" l/ha · "+f2(r.lph,1)+" l/h")}${tile("Čas na zákazku",f2(r.hrs,1)+" h")}${r.I?tile("Potrebný traktor",f2(r.needKw/.7355/.8,0)+" hp · využitie "+f2(r.load*100,0)+" %",r.load>1?"wn":r.load<.45?"wn":"hl")+tile("Kapitál v súprave",f2(r.capital,0)+" €"):""}</div>
    ${r.I?`<div class="s ${r.load>1?"wn":""}">${r.load>1?`⚠️ Traktor (${r.M[3]} hp) je na ${esc(r.I[1])} pri ${String(C.m[i].speed).replace(".",",")} km/h slabý – potrebuje ~${f2(r.needKw/.7355/.8,0)} hp. Reálne zvládne ~${f2(r.maxSpd,1)} km/h, výkon klesne.`:r.load<.45?`ℹ️ Traktor je na toto náradie silný (využitie ${f2(r.load*100,0)} %) – zvýš rýchlosť alebo daj väčší záber, inak platíš za nevyužitý výkon.`:`✓ Traktor sedí na náradie (využitie ${f2(r.load*100,0)} % výkonu). Výrobca odporúča ${r.I[5]}–${r.I[6]} hp.`}</div>`:""}
    <div class="agbar" title="Skladba nákladu na hektár"><i style="flex:${r.depHa}" class="d"></i><i style="flex:${r.empHa}" class="e"></i><i style="flex:${r.svcHa}" class="s"></i></div>
    <div class="s">Náklad ${f2(r.costHa)} €/ha = ${r.asabe?"odpis a úrok":"odpis"} ${f2(r.depHa)} + obsluha ${f2(r.empHa)} + opravy, poistenie${r.asabe?", mazivá":""} a réžia ${f2(r.svcHa)}. ${r.asabe?`Traktor ${f2(r.T.tot)} €/h (odpis ${f2(r.T.dep)}, úrok ${f2(r.T.int)}, poistenie ${f2(r.T.ins)}, opravy ${f2(r.T.rep)}; zostatková hodnota ${f2(r.T.rv,0)} €)${r.Im?` · náradie ${f2(r.Im.tot)} €/h (odpis ${f2(r.Im.dep)}, úrok ${f2(r.Im.int)}, opravy ${f2(r.Im.rep)}; ${f2(r.Im.ah,0)} h/rok, zostatok ${f2(r.Im.rv,0)} €)`:""} · mazivá ${f2(r.lube)} €/h · obsluha ${f2(r.empH)} €/h. `:""}Celková cena obsluhy ${f2(r.emp)} €/mes. Spotreba: ${esc(r.src)}. Efektivita poľa ${f2(r.eff*100,0)} % (teoreticky ${f2(r.theo,1)} ha/h)${r.I?` · pôda ${r.soil[0]}${r.depth?` · hĺbka ${f2(r.depth,0)} cm`:""}`:""}.</div>
    <div class="btns"><button type="button" class="pri" data-apub="${i}">💶 Dať ${f2(r.sell)} €/ha do cenníka služieb</button></div></div>`;
  // porovnanie – vždy pomenuje lacnejší stroj (oprava: Excel mal napevno „CLAAS − Fendt“ a ABS bez smeru)
    const est=b.custHa-a.custHa,real=Number.isFinite(a.real)&&Number.isFinite(b.real)?(b.realCustHa-a.realCustHa):NaN;
  const cmp=same?"":`<div class="card agcmp"><b class="sth">Porovnanie pre zákazníka · služba + nafta (naftu platí zákazník)</b>
   <div class="agct"><div class="agch"><span></span><b>1. ${na}</b><b>2. ${nb}</b></div>${[["Spotreba – odhad","l/ha",a.lha,b.lha,2],["Nafta zákazníka – odhad","€/ha",a.fuelHa,b.fuelHa],["Konečná cena – odhad","€/ha",a.custHa,b.custHa],["Spotreba – reálne tankovanie","l/ha",a.real,b.real,2],["Nafta – reálne","€/ha",a.realFuelHa,b.realFuelHa],["Konečná cena – reálne","€/ha",a.realCustHa,b.realCustHa],["Náš náklad","€/ha",a.costHa,b.costHa],["Náš zisk","€/ha",a.margin,b.margin,2,1]].filter(r=>Number.isFinite(r[2])||Number.isFinite(r[3])).map(r=>{const ok=Number.isFinite(r[2])&&Number.isFinite(r[3])&&Math.abs(r[2]-r[3])>=0.005,w=ok?((r[5]?r[2]>r[3]:r[2]<r[3])?0:1):-1;
     return `<div class="agcr"><span>${r[0]} <small>${r[1]}</small></span><b class="${w===0?"win":""}">${f2(r[2],r[4]??2)}</b><b class="${w===1?"win":""}">${f2(r[3],r[4]??2)}</b></div>`}).join("")}</div>
   <div class="zsg">${tile("Úspora zákazníka – odhad",Math.abs(est)<0.005?"0 €":f2(Math.abs(est)*a.area,0)+" € · "+(est>0?na:nb),"hl")}${Number.isFinite(real)?tile("Úspora zákazníka – reálne",Math.abs(real)<0.005?"0 €":f2(Math.abs(real)*a.area,0)+" € · "+(real>0?na:nb),"hl"):""}${Number.isFinite(a.real)?tile("Reál vs. odhad · S1",(a.real-a.lha>=0?"+":"")+f2(a.real-a.lha,2)+" l/ha",Math.abs(a.real-a.lha)>1?"wn":""):""}${Number.isFinite(b.real)?tile("Reál vs. odhad · S2",(b.real-b.lha>=0?"+":"")+f2(b.real-b.lha,2)+" l/ha",Math.abs(b.real-b.lha)>1?"wn":""):""}</div></div>`;
  const VAR=[30,40,50,60,70,80,90,100],MK2=[0,10,15,20,25,30,40,50];
  const vt=`<details class="card hsec"><summary><span>📈</span><b>Varianty ceny · ${na}</b><small>€/ha aj prirážka na motohodinu</small></summary><div class="hrt"><table><thead><tr><th>Cena €/ha</th><th>Tržba €/h</th><th>Zisk €/ha</th><th>Zisk ${f2(a.area,0)} ha</th><th>Splatenie ha/rok</th></tr></thead><tbody>${VAR.map(p=>{const mg=p-a.costHa;return `<tr><td>${p}</td><td>${f2(p*a.cap,0)}</td><td class="${mg>=0?"ps":"ng"}">${f2(mg)}</td><td class="${mg>=0?"ps":"ng"}">${f2(mg*a.area,0)}</td><td>${mg+a.depHa>0?f2(n(C.m[0].price)/((mg+a.depHa)*5),0):"–"}</td></tr>`}).join("")}</tbody></table></div>
   <div class="hrt"><table><thead><tr><th>Prirážka</th><th>€/mth</th><th>€/ha</th><th>Zisk €/mth</th><th>Zisk ${f2(a.area,0)} ha</th></tr></thead><tbody>${MK2.map(p=>{const c=a.costH*(1+p/100);return `<tr><td>${p?"+"+p+" %":"bod nula"}</td><td>${f2(c)}</td><td>${f2(c/a.cap)}</td><td>${f2(c-a.costH)}</td><td>${f2((c-a.costH)*a.hrs,0)}</td></tr>`}).join("")}</tbody></table></div></details>`;
  return `<div class="agres">${R.map(mach).join("")}</div>${cmp}${vt}`}
function calcHTML(){if(!A.cfg){loadCfg();return `<div class="card"><div class="s">Načítavam kalkuláciu…</div></div>`}
  if(A.cfg.err)return `<div class="card"><div class="s">${/agro_cfg/.test(A.cfg.err)?"Kalkulácia sa zapne po aktualizácii databázy (pár minút).":esc(A.cfg.err)}</div></div>`;
  return `<div class="s">Zmena čísla sa hneď prepočíta a uloží. <span id="agSave"></span> Nafta nie je v cene služby – tankuje zákazník.</div>
   <div id="agRes">${resHTML()}</div>
   <details class="card hsec agin" open><summary><span>⛽</span><b>Spoločné vstupy</b><small>cena nafty ${f2(A.cfg.fuel)} €/l · plocha ${f2(A.cfg.area,0)} ha</small></summary><div class="f agf"><label class="w">Model nákladov<select data-ak="c.model"><option value="asabe"${A.cfg.model!=="excel"?" selected":""}>Svetový štandard ASABE D497 + KTBL (odporúčané)</option><option value="excel"${A.cfg.model==="excel"?" selected":""}>Jednoduchý ako Excel (odpis bez zostatkovej hodnoty, servis %)</option></select></label>${inp("c","fuel","Cena nafty SR","€/l")}${inp("c","area","Plocha zákazky","ha")}${A.cfg.model!=="excel"?inp("c","rate","Úrok z kapitálu","% ročne")+inp("c","lube","Mazivá a AdBlue","% z ceny nafty")+inp("c","labor","Prirážka času obsluhy","% (príprava, presuny)"):""}<div class="w s">Priemerná cena nafty SR podľa Európskej komisie (Weekly Oil Bulletin) k ${esc(dSK(A.cfg.fuelDate||"2026-09-17"))} – uprav podľa aktuálnej.</div></div></details>
   ${mInputs(0)}${mInputs(1)}
   <div class="btns"><button type="button" class="ghost" data-areset="1">↺ Hodnoty z Excelu</button></div>
   <details class="card hsec"><summary><span>🔎</span><b>Kontrola Excelu · opravené chyby</b><small>čo sme v tabuľke Stroje v počte opravili</small></summary><div class="s agfix">
   <p><b>1. Jednotka spotreby stroja 2</b> bola v Exceli napevno „l/ha“ (1 VSTUPY!C22). Keď si pri stroji 2 zvolil l/h, spotreba za hodinu sa násobila výkonom a vychádzala zle. Tu má každý stroj vlastnú jednotku.</p>
   <p><b>2. Názvy strojov v PREHĽADE</b> boli napevno „CLAAS − Fendt“, aj keď si porovnával dva CLAAS. Tu sa vždy píše skutočný model a kto je lacnejší.</p>
   <p><b>3. Úspora bez smeru</b> – Excel bral absolútnu hodnotu (ABS) a pripisoval úsporu stroju 1 aj vtedy, keď bol drahší. Tu sa úspora pripíše lacnejšiemu stroju.</p>
   <p><b>4. Teoretický výkon</b> – Excel rátal výkon ako rýchlosť × záber bez otáčok na úvratiach, prestojov a plnenia. Pridal som <b>efektivitu poľa</b> (predvolene 85 %, bežne 75–90 %). Pri 100 % dostaneš presne čísla z Excelu.</p>
   <p><b>Skontrolované a správne:</b> cena práce 2026 (14,4 % / 19 % / NČZD 497,23 € / 36,2 %), odpis, servis a poistenie z ceny stroja a ročného využitia, bod nula, marža, zisk zákazky, varianty, splatenie, reálne tankovanie.</p>
   <p><b>5. Svetová logika nákladov (ASABE D497 + KTBL)</b> – Excel odpisoval celú cenu bez zostatkovej hodnoty, nepočítal úrok z kapitálu ani mazivá a servis bral ako pevné % ročne. Teraz: odpis = cena − zostatková hodnota podľa veku a hodín (ASABE), úrok z priemerného kapitálu, poistenie a garáž, opravy podľa krivky ASABE (RF1·(h/1000)^RF2 – s vekom rastú), mazivá a AdBlue, obsluha +10 % na prípravu a presuny. Traktor a náradie sa rátajú zvlášť, každé so svojím ročným využitím. Starý výpočet si zapneš v „Model nákladov“.</p>
   <p><b>6. Náradie</b> – záber, rýchlosť a efektivita sa predvyplnia z náradia, nafta sa ráta podľa náradia, pôdy a hĺbky (KTBL) a aplikácia skontroluje, či traktor náradie utiahne.</p>
   <p><b>Na zváženie:</b> obsluha sa počíta 174 h mesačne. Ak vodič robí len na tomto stroji (1000 mth/rok), skutočná cena obsluhy na motohodinu je vyššia – vtedy zníž „Pracovné hodiny mesačne“ na ~83.</p></div></details>`}
function catHTML(){const T=A.catT||"",q=String(A.catQ||"").toLowerCase(),L=AGM.filter(m=>(!T||m[1]===T)&&(!q||(m[0]+" "+m[2]).toLowerCase().includes(q)));
  return `<div class="card f"><label>Hľadať<input id="agCatQ" value="${esc(A.catQ||"")}" placeholder="napr. Fendt 936"></label><label>Typ<select id="agCatT"><option value="">všetky</option>${Object.entries(TYP).map(([k,v])=>`<option value="${k}"${T===k?" selected":""}>${v}</option>`).join("")}</select></label></div>
   <div class="hrt"><table><thead><tr><th>Značka</th><th>Model</th><th>Typ</th><th>hp</th><th>Test l/h</th><th>Odhad l/h</th><th>Min–max l/h</th></tr></thead><tbody>${L.map(m=>`<tr><td>${esc(m[0])}</td><td><b>${esc(m[2])}</b></td><td>${TYP[m[1]]}</td><td>${m[3]}</td><td>${m[4]!=null?f2(m[4],0):"–"}</td><td>${f2(m[5],1)}</td><td>${f2(m[6],1)}–${f2(m[7],1)}</td></tr>`).join("")}</tbody></table></div>
   <b class="sth">Závesné a ťahané náradie (${IMP.length})</b>
   <div class="hrt"><table><thead><tr><th>Značka</th><th>Model</th><th>Druh</th><th>Záber m</th><th>Cena € (orient.)</th><th>Traktor hp</th><th>km/h</th><th>Nafta l/ha</th><th>Efektivita</th></tr></thead><tbody>${IMP.filter(x=>!q||(x[0]+" "+x[1]).toLowerCase().includes(q)).map(x=>`<tr><td>${esc(x[0])}</td><td><b>${esc(x[1])}</b></td><td>${CLS[x[2]].n}</td><td>${f2(x[3],2)}</td><td>${f2(x[4],0)}</td><td>${x[5]}–${x[6]}</td><td>${x[7]}</td><td>${f2(x[8],1)}</td><td>${CLS[x[2]].fe} %</td></tr>`).join("")}</tbody></table></div>
   <div class="s">Náradie: ceny sú orientačné nové cenníkové ceny bez DPH – v kalkulácii ich prepíš podľa ponuky. Nafta podľa KTBL pre strednú pôdu a bežnú hĺbku, výkon podľa odporúčania výrobcu, efektivita a opravy podľa ASABE D497.</div>
   <div class="s">Traktory: DLG PowerMix 245–295 g/kWh pri 65 % zaťažení. Kombajny: CLAAS TELEMATICS / žatevný test LEXION 8900 škálovaný výkonom. Fendt 1167 MT: nezávislý test NTTL/Profi.</div>`}
// ===== NÁŠ PARK → AUTOMATICKÁ PONUKA PRE FARMÁROV (cena sa ráta skryto, farmár vidí iba výslednú cenu) =====
// adaptéry kombajnov: [značka, model, typ G=obilie/repka/sója (flex) M=kukurica, záber m, cena € orient., popis]
const HDR=[["CLAAS","CONVIO FLEX 1230","G",12.3,115000,"flexibilný pásový adaptér 12,3 m"],["CLAAS","CONVIO FLEX 930","G",9.3,85000,"flexibilný pásový adaptér 9,3 m"],
 ["CLAAS","CORIO 675","M",4.5,70000,"kukuričný adaptér 6 riadkov × 75 cm"],["CLAAS","CORIO 875","M",6,90000,"kukuričný adaptér 8 riadkov × 75 cm"],["CLAAS","CORIO 1275","M",9,140000,"kukuričný adaptér 12 riadkov × 75 cm"]];
const hId=x=>x[0]+" | "+x[1],hFind=id=>HDR.find(x=>hId(x)===id);
// plodiny (bez slnečnice): rýchlosť km/h, efektivita ASABE, úroda t/ha (pre priechodnosť), nafta l/ha KTBL, adaptér
const CROP={psenica:{n:"Pšenica",spd:5,fe:70,y:7,fuel:17,h:"G"},jacmen:{n:"Jačmeň",spd:5.5,fe:70,y:6.5,fuel:16,h:"G"},obilniny:{n:"Tritikale, raž, ovos",spd:5,fe:70,y:5.5,fuel:16,h:"G"},
 repka:{n:"Repka",spd:5,fe:70,y:3.5,fuel:14,h:"G"},soja:{n:"Sója",spd:4.5,fe:70,y:3,fuel:15,h:"G"},hrach:{n:"Hrach",spd:4.5,fe:70,y:3.5,fuel:14,h:"G"},kukurica:{n:"Kukurica na zrno",spd:7,fe:70,y:10,fuel:25,h:"M",tf:1.4}};
const FLEET_DEF={mkT:30,mkH:20,minT:5,minH:10,net:1800,hours:174,
 tractors:[{model:"CLAAS | AXION 850",n:1,price:154000,annual:1000,hold:5},{model:"CLAAS | AXION 930",n:1,price:230000,annual:1000,hold:5}],
 impl:[{id:"Väderstad | TopDown 700",price:"",ha:1500,yrs:8},{id:"Väderstad | Spirit 600 C",price:"",ha:1500,yrs:8},{id:"Lemken | Diamant 11 V 8 L100",price:"",ha:800,yrs:8},{id:"Väderstad | NZ Aggressive 800",price:"",ha:2000,yrs:8},{id:"Lemken | Rubin 12/400 KUA",price:"",ha:1500,yrs:8}],
 combines:[{model:"CLAAS | LEXION 8700 TERRA TRAC",n:2,price:780000,annual:600,hold:7,hdr:["CLAAS | CONVIO FLEX 1230","CLAAS | CORIO 675","CLAAS | CORIO 875","CLAAS | CORIO 1275"]},
  {model:"CLAAS | LEXION 6700",n:1,price:480000,annual:600,hold:7,hdr:["CLAAS | CONVIO FLEX 930","CLAAS | CORIO 675","CLAAS | CORIO 875","CLAAS | CORIO 1275"]}],
 hprice:{},over:{},off:{}};
const mName=id=>String(id||"").replace(" | "," ").replace("TERRA TRAC","TT");
// náklad súpravy €/h podľa ASABE (rovnaké vzorce ako kalkulácia)
function offerCost(F,mach,M,toolPrice,toolAh,toolYrs,toolRv,toolRf,cap,lha){const c=A.cfg&&!A.cfg.err?A.cfg:DEF,rate=n(c.rate)||5,insP=1.5,lubeP=n(c.lube)||5,fp=n(c.fuel)||1.92;
  const isK=M[1]==="K",ah=n(mach.annual)||(isK?450:1000),yrs=Math.max(1,n(mach.hold)||(isK?7:5)),rf=isK?[.04,2.1]:M[1]==="P"?[.003,2]:[.007,2],rvk=isK?"K":M[3]*.7355>=150?"TR":"TRs";
  const T=own(n(mach.price),yrs,ah,rvk,rf[0],rf[1],insP,rate,null),I=toolPrice>0?own(toolPrice,Math.max(1,toolYrs),Math.max(20,toolAh),toolRv,toolRf[0],toolRf[1],insP,rate,null):{tot:0};
  const empH=empCost(n(F.net)||1800)/(n(F.hours)||174)*(1+(n(c.labor)||10)/100),lube=lha*cap*fp*lubeP/100;return (T.tot+I.tot+empH+lube)/cap}
function buildOffers(F){const L=[];
  for(const t of F.tractors||[]){const M=mFind(t.model);if(!M||M[1]==="K")continue;const usable=M[3]*.7355*.8;
    for(const it of F.impl||[]){const I=iFind(it.id);if(!I)continue;const K=CLS[I[2]],need=(I[5]+I[6])/2*.7355*.8,load=need/usable;if(load<.4)continue;
      let spd=I[7];if(load>1){spd=I[7]*Math.pow(1/load,1/1.2);if(spd<I[7]*.7)continue}const cap=I[3]*spd/10*K.fe/100,ip=it.price===""||it.price==null?I[4]:n(it.price),iah=n(it.ha)/cap;
      const cost=offerCost(F,t,M,ip,iah,Math.min(n(it.yrs)||8,K.life/Math.max(20,iah)),K.rv,[K.rf1,K.rf2],cap,I[8]);const okey=`tillage|${t.model}|${it.id}|`;
      L.push({okey,kind:"tillage",machine:mName(t.model)+(t.n>1?` (${t.n}×)`:""),tool:I[0]+" "+I[1]+" · "+String(I[3]).replace(".",",")+" m",crop:null,name:`${K.svc} – ${I[0]} ${I[1]}`,cap,cost,mk:n(F.mkT)||0,min:n(F.minT)||0,fuel:I[8],descr:I[9].charAt(0).toUpperCase()+I[9].slice(1)+`. Traktor ${mName(t.model)} s obsluhou.`+(load>1?` Pri ${f2(spd,1)} km/h.`:""),slow:load>1}) }}
  for(const cb of F.combines||[]){const M=mFind(cb.model);if(!M)continue;const tph=M[3]*.11*.6;
    for(const hid of cb.hdr||[]){const H=hFind(hid);if(!H)continue;const hp=n((F.hprice||{})[hid])||H[4];
      for(const [ck,C] of Object.entries(CROP)){if(C.h!==H[2])continue;const cap=Math.min(H[3]*C.spd/10*C.fe/100,tph*(C.tf||1)/C.y);
        const cost=offerCost(F,cb,M,hp,n(cb.annual)||450,n(cb.hold)||7,"S",[.14,1.6],cap,C.fuel);const okey=`harvest|${cb.model}|${hid}|${ck}`;
        L.push({okey,kind:"harvest",machine:mName(cb.model)+(cb.n>1?` (${cb.n}×)`:""),tool:H[0]+" "+H[1]+" · "+String(H[3]).replace(".",",")+" m",crop:ck,name:`Žatva – ${C.n} – ${mName(cb.model)} + ${H[1]}`,cap,cost,mk:n(F.mkH)||0,min:n(F.minH)||0,fuel:C.fuel,descr:`${H[5].charAt(0).toUpperCase()+H[5].slice(1)}. Kombajn s obsluhou, nový stroj.`})}}}
  for(const o of L){const ov=n((F.over||{})[o.okey]);o.auto=Math.round(o.cost*(1+o.mk/100));o.price=Number.isFinite(ov)&&ov>0?ov:o.auto;o.on=!(F.off||{})[o.okey]}
  return L}
async function loadFleet(){const r=await sb.from("agro_cfg").select("key,value").in("key",["fleet","calc"]);if(r.error){A.fleet={err:r.error.message};renderStaff();return}
  const g=k=>(r.data||[]).find(x=>x.key===k),f=g("fleet"),c=g("calc"),D=JSON.parse(JSON.stringify(FLEET_DEF));A.fleet=f&&f.value&&f.value.combines?{...D,...f.value}:D;
  if(!A.cfg){const D2=JSON.parse(JSON.stringify(DEF)),v=c&&c.value&&c.value.m?c.value:null;A.cfg=v?{...D2,...v,m:v.m.map((m,i)=>({...D2.m[i],...m}))}:D2}renderStaff()}
function saveFleet(){clearTimeout(A.fT);A.fT=setTimeout(async()=>{const r=await sb.from("agro_cfg").upsert({key:"fleet",value:A.fleet,updated_at:new Date().toISOString()});const el=document.getElementById("agFSave");if(el)el.textContent=r.error?"⚠️ Neuložené":"✓ Uložené"},900)}
const fin=(path,lab,unit,val,attr="")=>`<label><span>${lab}${unit?` <small>· ${unit}</small>`:""}</span><input data-af="${path}" inputmode="decimal" value="${esc(String(val??"").replace(".",","))}" ${attr}></label>`;
function fleetHTML(){const F=A.fleet;if(!F){loadFleet();return `<div class="card"><div class="s">Načítavam park…</div></div>`}if(F.err)return `<div class="card"><div class="s">${esc(F.err)}</div></div>`;
  let h=`<div class="s">Farmár si v aplikácii vyberie stroj, náradie alebo adaptér a plodinu, zadá hektáre a hneď vidí orientačnú cenu <b>bez nafty</b>. Cena sa ráta skryto: náklad podľa ASABE (odpis, úrok, opravy, poistenie, obsluha, mazivá) + tvoja prirážka. Farmár nikdy nevidí náklad ani prirážku. <span id="agFSave"></span></div>
   <div class="card f agf"><div class="w t">Ceny pre farmárov</div>${fin("mkT","Prirážka – práca s traktorom","% nad náklad",F.mkT)}${fin("mkH","Prirážka – žatva","% nad náklad",F.mkH)}${fin("minT","Minimum – traktor","ha",F.minT)}${fin("minH","Minimum – žatva","ha",F.minH)}${fin("net","Čistá mzda obsluhy","€/mes.",F.net)}${fin("hours","Hodiny obsluhy mesačne","h",F.hours)}</div>
   <details class="card hsec agin"><summary><span>🌾</span><b>Kombajny a adaptéry</b><small>${(F.combines||[]).map(c=>(c.n>1?c.n+"× ":"")+mName(c.model)).join(" · ")}</small></summary><div class="f agf">
   ${(F.combines||[]).map((c,i)=>`<div class="w s agh">${esc(mName(c.model))}${c.n>1?" · "+c.n+" ks":""}</div>${fin(`combines.${i}.price`,"Cena kombajnu","€",c.price)}${fin(`combines.${i}.annual`,"Ročne motohodín","mth",c.annual)}${fin(`combines.${i}.hold`,"Roky držania","r.",c.hold)}${fin(`combines.${i}.n`,"Počet kusov","ks",c.n)}
     <div class="w agchk">${HDR.map(H=>`<label class="pck"><input type="checkbox" data-afh="${i}" value="${esc(hId(H))}"${(c.hdr||[]).includes(hId(H))?" checked":""}><span>${esc(H[1])} <small>${String(H[3]).replace(".",",")} m</small></span></label>`).join("")}</div>`).join("")}
   <div class="w s agh">Ceny adaptérov</div>${HDR.map(H=>fin(`hprice.${hId(H)}`,H[1],"€",(F.hprice||{})[hId(H)]??"",`placeholder="${H[4]} (orient.)"`)).join("")}</div></details>
   <details class="card hsec agin"><summary><span>🚜</span><b>Traktory a náradie</b><small>${(F.tractors||[]).map(t=>mName(t.model)).join(" · ")} · ${(F.impl||[]).length} náradí</small></summary><div class="f agf">
   ${(F.tractors||[]).map((t,i)=>`<div class="w s agh">${esc(mName(t.model))}</div>${fin(`tractors.${i}.price`,"Cena traktora","€",t.price)}${fin(`tractors.${i}.annual`,"Ročne motohodín","mth",t.annual)}${fin(`tractors.${i}.hold`,"Roky držania","r.",t.hold)}`).join("")}
   <div class="w s agh">Naše náradie</div><div class="w agchk">${IMP.map(I=>`<label class="pck"><input type="checkbox" data-afi="${esc(iId(I))}"${(F.impl||[]).some(x=>x.id===iId(I))?" checked":""}><span>${esc(I[0])} ${esc(I[1])} <small>${CLS[I[2]].n} · ${String(I[3]).replace(".",",")} m</small></span></label>`).join("")}</div>
   ${(F.impl||[]).map((x,i)=>{const I=iFind(x.id);return I?`<div class="w s agh">${esc(I[1])}</div>${fin(`impl.${i}.price`,"Cena","€",x.price,`placeholder="${I[4]} (orient.)"`)}${fin(`impl.${i}.ha`,"Ročne ha","ha",x.ha)}${fin(`impl.${i}.yrs`,"Roky držania","r.",x.yrs)}`:""}).join("")}</div></details>
   <div id="agOffers">${offersHTML(F)}</div>`;
  return h}
function offersHTML(F){const O=buildOffers(F),on=O.filter(o=>o.on);
  return `<div class="card"><div class="row"><b class="sth">Ponuka pre farmárov · ${on.length} z ${O.length}</b></div>
   <div class="agol">${O.map(o=>`<div class="agoi ${o.on?"":"off"}"><label class="pck"><input type="checkbox" data-afo="${esc(o.okey)}"${o.on?" checked":""}><span><b>${esc(o.kind==="harvest"?CROP[o.crop].n+" · "+o.machine:o.name.split(" – ")[0]+" · "+o.machine)}</b><small>${esc(o.tool)} · ${f2(o.cap,1)} ha/h${o.slow?" · traktor slabší, nižšia rýchlosť":""}</small></span></label>
     <div class="agop"><small>náklad ${f2(o.cost,0)} € · auto ${f2(o.auto,0)} €</small><input data-afp="${esc(o.okey)}" inputmode="decimal" value="${esc(String((F.over||{})[o.okey]??"").replace(".",","))}" placeholder="${o.auto}" aria-label="Cena €/ha"><b>€/ha</b></div></div>`).join("")}</div>
   <div class="s">Prázdne pole ceny = automatická cena (náklad + prirážka). Vlastnú cenu napíš do poľa. Odškrtnutú kombináciu farmár nevidí.</div>
   <div class="btns"><button type="button" class="lime" data-afpub="1">🚀 Zverejniť ponuku farmárom</button></div></div>`}
async function publishOffers(b){const F=A.fleet,O=buildOffers(F);busy(b,true);
  const rows=O.map((o,i)=>({okey:o.okey,kind:o.kind,auto:true,name:o.name,machine:o.machine,tool:o.tool,crop:o.crop,unit:"ha",price:o.price,fuel_lha:o.fuel,min_qty:o.min,fuel_by_customer:true,descr:o.descr,active:o.on,sort:(o.kind==="harvest"?200:300)+i}));
  let r=await sb.from("agro_services").upsert(rows,{onConflict:"okey"});
  if(!r.error){const keep=new Set(O.map(o=>o.okey)),ex=await sb.from("agro_services").select("id,okey").eq("auto",true);const gone=(ex.data||[]).filter(x=>!keep.has(x.okey)).map(x=>x.id);if(gone.length)r=await sb.from("agro_services").update({active:false}).in("id",gone)}
  busy(b,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}A.srv=null;toast(`✓ Zverejnené ${O.filter(o=>o.on).length} ponúk – farmári si už vyberajú stroj a vidia cenu.`,7000)}

// udalosti – park
const setPath=(o,path,v)=>{const k=path.split(".");let x=o;for(let i=0;i<k.length-1;i++){const kk=/^\d+$/.test(k[i])?+k[i]:k[i];x=x[kk]=x[kk]||{}}x[k[k.length-1]]=v};
document.addEventListener("input",e=>{if(!A.fleet||A.fleet.err||ROLE!=="owner")return;const t=e.target;
  if(t.dataset.af){const p=t.dataset.af,v=String(t.value).replace(",",".");if(p.startsWith("hprice.")){A.fleet.hprice=A.fleet.hprice||{};A.fleet.hprice[p.slice(7)]=v}else setPath(A.fleet,p,v)}
  else if(t.dataset.afp){A.fleet.over=A.fleet.over||{};const v=String(t.value).replace(",",".");if(v)A.fleet.over[t.dataset.afp]=v;else delete A.fleet.over[t.dataset.afp];saveFleet();return}
  else return;saveFleet();const O=document.getElementById("agOffers");if(O)O.innerHTML=offersHTML(A.fleet)});
document.addEventListener("change",e=>{if(!A.fleet||A.fleet.err||ROLE!=="owner")return;const t=e.target;
  if(t.dataset.afo!=null){A.fleet.off=A.fleet.off||{};if(t.checked)delete A.fleet.off[t.dataset.afo];else A.fleet.off[t.dataset.afo]=true;saveFleet();const O=document.getElementById("agOffers");if(O)O.innerHTML=offersHTML(A.fleet);return}
  if(t.dataset.afh!=null){const c=A.fleet.combines[+t.dataset.afh];c.hdr=c.hdr||[];if(t.checked){if(!c.hdr.includes(t.value))c.hdr.push(t.value)}else c.hdr=c.hdr.filter(x=>x!==t.value);saveFleet();renderStaff();return}
  if(t.dataset.afi!=null){const id=t.dataset.afi;A.fleet.impl=A.fleet.impl||[];if(t.checked){if(!A.fleet.impl.some(x=>x.id===id))A.fleet.impl.push({id,price:"",ha:1500,yrs:8})}else A.fleet.impl=A.fleet.impl.filter(x=>x.id!==id);saveFleet();renderStaff()}});
document.addEventListener("click",e=>{const b=e.target.closest("[data-afpub]");if(b&&ROLE==="owner")publishOffers(b)});
// --- udalosti (tím) ---
document.addEventListener("click",async e=>{if(typeof ROLE==="undefined"||!ROLE||(typeof FARMER!=="undefined"&&FARMER))return;const t=e.target;let x;
  if(x=t.closest("[data-asec]")){A.sec=x.dataset.asec;A.edit=null;if(A.sec==="ord")A.orders=null;renderStaff();scrollTo(0,0);return}
  if(x=t.closest("[data-aflt]")){A.flt=x.dataset.aflt;renderStaff();return}
  if(ROLE!=="owner")return;
  if(x=t.closest("[data-asedit]")){A.edit=x.dataset.asedit||null;renderStaff();return}
  if(x=t.closest("[data-astog]")){const s=(A.srv||[]).find(y=>y.id===x.dataset.astog);if(!s)return;const r=await sb.from("agro_services").update({active:!s.active}).eq("id",s.id);if(r.error){toast("Chyba: "+r.error.message);return}toast(s.active?"Služba je skrytá farmárom.":"✓ Služba je zverejnená farmárom.");loadSrv();return}
  if(x=t.closest("[data-asdel]")){if(!x.dataset.arm){x.dataset.arm=1;x.textContent="Naozaj zmazať?";setTimeout(()=>{x.dataset.arm="";x.textContent="🗑️ Zmazať"},3000);return}const r=await sb.from("agro_services").delete().eq("id",x.dataset.asdel);if(r.error){toast(/foreign|violates/.test(r.error.message)?"Služba má objednávky – radšej ju skry.":"Chyba: "+r.error.message);return}A.edit=null;loadSrv();return}
  if(x=t.closest("[data-areset]")){if(!x.dataset.arm){x.dataset.arm=1;x.textContent="Naozaj prepísať?";setTimeout(()=>{x.dataset.arm="";x.textContent="↺ Hodnoty z Excelu"},3000);return}A.cfg=JSON.parse(JSON.stringify(DEF));saveCfg();renderStaff();return}
  if(x=t.closest("[data-apub]")){const i=+x.dataset.apub,m=A.cfg.m[i],r=calc(m,A.cfg),M=mFind(m.model),I=iFind(m.impl),nmM=M[0]+" "+M[2]+(I?" + "+I[0]+" "+I[1]:"")+" · záber "+String(m.width).replace(".",",")+" m";
    const S=A.srv&&!A.srv.err?A.srv:((await sb.from("agro_services").select("*")).data||[]),ex=S.find(s=>s.machine===nmM);
    const row={name:ex?ex.name:I?CLS[I[2]].svc+" – "+I[0]+" "+I[1]:"Práca strojom "+M[0]+" "+M[2],machine:nmM,unit:"ha",price:Math.round(r.sell*100)/100,fuel_lha:Math.round(r.lha*10)/10,fuel_by_customer:true};
    const q=ex?await sb.from("agro_services").update(row).eq("id",ex.id):await sb.from("agro_services").insert({...row,active:false,descr:(I?I[9].charAt(0).toUpperCase()+I[9].slice(1)+". ":"")+"Práca strojom s obsluhou. Naftu tankuje zákazník."});
    if(q.error){toast("Chyba: "+q.error.message);return}A.srv=null;toast(ex?"✓ Cena služby aktualizovaná v cenníku.":"✓ Služba pridaná do cenníka ako skrytá – zverejni ju v Cenníku služieb.",6000);return}});
document.addEventListener("submit",async e=>{const f=e.target;if(typeof FARMER!=="undefined"&&FARMER)return;
  if(f.id==="fASrv"){e.preventDefault();e.stopPropagation();const d=new FormData(f),pr=n(d.get("price"));if(!(pr>=0)){toast("Zadaj cenu.");return}
    const nn=k=>{const v=n(d.get(k));return Number.isFinite(v)?v:null};
    const row={name:String(d.get("name")||"").trim(),machine:String(d.get("machine")||"").trim()||null,descr:String(d.get("descr")||"").trim()||null,unit:d.get("unit"),price:pr,fuel_lha:nn("fuel_lha"),min_qty:nn("min_qty"),sort:Math.round(nn("sort")??100),active:d.get("active")==="on",fuel_by_customer:d.get("fuel_by_customer")==="on"};
    const id=f.dataset.id,r=id?await sb.from("agro_services").update(row).eq("id",id):await sb.from("agro_services").insert(row);
    if(r.error){toast("Chyba: "+r.error.message);return}A.edit=null;toast(row.active?"✓ Uložené a zverejnené farmárom.":"✓ Uložené (skryté farmárom).");loadSrv();return}
  if(f.dataset.aord){e.preventDefault();e.stopPropagation();const d=new FormData(f),st=e.submitter&&e.submitter.name==="st"?e.submitter.value:"";const dq=n(d.get("done_qty"));
    const row={planned:d.get("planned")||null,reply:String(d.get("reply")||"").trim()||null,done_qty:Number.isFinite(dq)&&dq>0?dq:null};if(st)row.status=st;
    if(st==="potvrdena"&&!row.planned){toast("Zadaj termín práce, nech farmár vie, kedy prídete.");return}
    const r=await sb.from("agro_orders").update(row).eq("id",f.dataset.aord);if(r.error){toast("Chyba: "+r.error.message);return}
    toast(st==="hotova"?"✅ Hotovo – suma prepočítaná podľa skutočnej výmery.":st==="zrusena"?"Objednávka zrušená.":"✓ Uložené – farmár to vidí v aplikácii.");loadOrders();return}},true);
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.ak;if(k&&A.cfg&&!A.cfg.err){const [i,key]=k.split(".");const v=e.target.value;
    if(i==="c")A.cfg[key]=["fuelDate","model"].includes(key)?v:v.replace(",",".");else A.cfg.m[+i][key]=["model","unit","impl","soil"].includes(key)?v:v.replace(",",".");
    const R=document.getElementById("agRes");if(R)R.innerHTML=resHTML();saveCfg();return}
  if(e.target.id==="agCatQ"){A.catQ=e.target.value;clearTimeout(e.target._t);e.target._t=setTimeout(()=>{renderStaff();const i=document.getElementById("agCatQ");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)}});
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.ak;if(k&&/\.impl$/.test(k)&&A.cfg){const m=A.cfg.m[+k.split(".")[0]],I=iFind(m.impl);if(I){m.width=I[3];m.speed=I[7];m.eff=CLS[I[2]].fe;m.iprice="";m.depth="";m.own=""}else{m.width=5;m.speed=12;m.eff=85}saveCfg();renderStaff();return}if(k&&/\.(model|unit|soil)$/.test(k)||k==="c.model"){renderStaff();return}if(e.target.id==="agCatT"){A.catT=e.target.value;renderStaff()}});

// ===== FARMÁR =====
let FA={srv:undefined,ord:null,open:null};
async function faLoad(){FA.srv=null;const [s,o]=await Promise.all([sb.from("agro_services").select("id,name,machine,tool,crop,kind,descr,unit,price,fuel_lha,min_qty,fuel_by_customer,sort").eq("active",true).order("sort").order("name").then(r=>r.error?sb.from("agro_services").select("id,name,machine,descr,unit,price,fuel_lha,min_qty,fuel_by_customer,sort").eq("active",true).order("sort").order("name"):r),
  sb.from("agro_orders").select("id,no,service_name,unit,qty,price,total,date_from,date_to,place,note,status,planned,done_qty,reply,created_at").order("created_at",{ascending:false}).limit(30)]);
  FA.srv=s.error?[]:s.data||[];FA.ord=o.error?[]:o.data||[];renderFarmer()}
window.farmAgroHTML=function(){if(typeof FARMER==="undefined"||!FARMER||(window.fcan&&!fcan("f_agro")))return "";if(FA.srv===undefined){faLoad();return ""}if(!FA.srv)return "";
  const S=FA.srv,O=FA.ord||[];if(!S.length&&!O.length)return "";
  const K={harvest:S.filter(s=>s.kind==="harvest"),tillage:S.filter(s=>s.kind==="tillage"),other:S.filter(s=>!s.kind||s.kind==="other")},kinds=[["harvest","🌾 Žatva kombajnom"],["tillage","🚜 Pôda a sejba"],["other","📋 Ďalšie služby"]].filter(k=>K[k[0]].length);
  let h=`<h2>🚜 Agro služby ERNTE · vyberte stroj a hneď vidíte cenu</h2>`;
  if(kinds.length){if(!kinds.some(k=>k[0]===FA.kind))FA.kind=kinds[0][0];const L=K[FA.kind];let sel=null,picks="";
    const opt=(arr,cur,lab)=>arr.map(v=>`<option value="${esc(v)}"${v===cur?" selected":""}>${esc(lab?lab(v):v)}</option>`).join("");
    if(FA.kind==="harvest"){const crops=[...new Set(L.map(s=>s.crop))];if(!crops.includes(FA.crop))FA.crop=crops[0];const L1=L.filter(s=>s.crop===FA.crop),ms=[...new Set(L1.map(s=>s.machine))];if(!ms.includes(FA.mach))FA.mach=ms[0];
      const L2=L1.filter(s=>s.machine===FA.mach);if(!L2.some(s=>s.id===FA.sid))FA.sid=(L2.slice().sort((a,b)=>a.price-b.price)[0]||{}).id;sel=L2.find(s=>s.id===FA.sid);
      picks=`<label>Plodina<select data-fapk="crop">${opt(crops,FA.crop,c=>(CROP[c]||{n:c}).n)}</select></label><label>Kombajn<select data-fapk="mach">${opt(ms,FA.mach)}</select></label>
       <label class="w">Adaptér · záber<select data-fapk="sid">${L2.map(s=>`<option value="${esc(s.id)}"${s.id===FA.sid?" selected":""}>${esc(s.tool||s.name)}</option>`).join("")}</select></label>`}
    else if(FA.kind==="tillage"){const ms=[...new Set(L.map(s=>s.machine))];if(!ms.includes(FA.mach))FA.mach=ms[0];const L2=L.filter(s=>s.machine===FA.mach);if(!L2.some(s=>s.id===FA.sid))FA.sid=(L2[0]||{}).id;sel=L2.find(s=>s.id===FA.sid);
      picks=`<label>Traktor<select data-fapk="mach">${opt(ms,FA.mach)}</select></label><label>Náradie · práca<select data-fapk="sid">${L2.map(s=>`<option value="${esc(s.id)}"${s.id===FA.sid?" selected":""}>${esc(s.name.split(" – ")[0]+" · "+(s.tool||""))}</option>`).join("")}</select></label>`}
    else{if(!L.some(s=>s.id===FA.sid))FA.sid=L[0].id;sel=L.find(s=>s.id===FA.sid);picks=`<label class="w">Služba<select data-fapk="sid">${L.map(s=>`<option value="${esc(s.id)}"${s.id===FA.sid?" selected":""}>${esc(s.name)}</option>`).join("")}</select></label>`}
    const s=sel,u=s?UN[s.unit]||s.unit:"ha",q=n(FA.q);
    h+=`<div class="card agcfg"><div class="btns seg2">${kinds.map(k=>`<button type="button" data-fakind="${k[0]}" aria-pressed="${FA.kind===k[0]}">${k[1]}</button>`).join("")}</div>
     <form class="f agf" id="fAOrd" data-sid="${esc(s?s.id:"")}">${picks}
     ${s?`<div class="w s">${s.descr?esc(s.descr)+" ":""}${s.fuel_by_customer!==false?"⛽ Naftu tankujete vy"+(s.fuel_lha?` (odhad ${f2(s.fuel_lha,0)} l/ha)`:""):"⛽ Nafta v cene"}${s.min_qty?` · minimum ${f2(s.min_qty,0)} ${u}`:""}.</div>`:""}
     <label class="w agha"><span>Koľko ${u} chcete urobiť?</span><input name="qty" inputmode="decimal" required value="${esc(FA.q||"")}" placeholder="${s&&s.min_qty?"min. "+f2(s.min_qty,0):"napr. 50"}"></label>
     <div class="w agquote" id="agEst">${s?quoteHTML(s,q):""}</div>
     <label>Termín od<input type="date" name="date_from" min="${today()}" value="${esc(FA.d0||"")}"></label><label>Termín do<input type="date" name="date_to" min="${today()}" value="${esc(FA.d1||"")}"></label>
     <label class="w">Kde (obec, parcela, honov)<input name="place" value="${esc(FA.place||"")}" placeholder="napr. Zbudza – honov pri ceste"></label><label class="w">Poznámka<input name="note" value="${esc(FA.note||"")}" placeholder="napr. vlhkosť, prístup, hĺbka"></label>
     <div class="w btns"><button class="lime">✅ Záväzne objednať</button></div></form>
     <div class="s">Cena je orientačná, bez DPH a bez nafty. Konečnú sumu vypočítame podľa skutočne odpracovanej výmery.</div></div>`}
  if(O.length)h+=`<h2>Moje objednávky služieb</h2><div class="card">${O.map(o=>`<div class="row"><span><b>${esc(o.service_name)}</b> · ${f2(o.done_qty??o.qty,1)} ${UN[o.unit]||o.unit} · ${f2(o.total)} €</span>${pill(STS[o.status]||[o.status])}</div>
    <div class="s" style="margin-top:-6px">${esc(o.no||"")} · ${esc(dtSK(o.created_at))}${o.planned?` · 📅 termín ${esc(dSK(o.planned))}`:""}${o.reply?` · ERNTE: ${esc(o.reply)}`:""}${o.status==="nova"?` · <button type="button" class="linkb" data-facancel="${esc(o.id)}">zrušiť objednávku</button>`:""}</div>`).join("")}</div>`;
  return h};
function quoteHTML(s,q){const u=UN[s.unit]||s.unit;if(!(q>0))return `<span class="agqp">${f2(s.price)} €<small>/${u} bez DPH</small></span><span class="agqs">Zadajte výmeru – ukážeme celkovú cenu.</span>`;
  return `<span class="agqp">${f2(q*s.price,0)} €<small>bez DPH · bez nafty</small></span><span class="agqs">${f2(q,1)} ${u} × ${f2(s.price)} €/${u}${s.fuel_by_customer!==false&&s.fuel_lha&&s.unit==="ha"?` · nafta ~${f2(q*s.fuel_lha,0)} l tankujete vy`:""}</span>${s.min_qty&&q<s.min_qty?`<span class="agqs wn">Minimum je ${f2(s.min_qty,0)} ${u}.</span>`:""}`}
document.addEventListener("click",async e=>{if(typeof FARMER==="undefined"||!FARMER)return;let x=e.target.closest("[data-faopen]");
  if(x){FA.open=x.dataset.faopen||null;renderFarmer();if(FA.open)setTimeout(()=>{const i=document.querySelector("#fAOrd [name=qty]");if(i)i.focus()},50);return}
  x=e.target.closest("[data-facancel]");if(x){if(!x.dataset.arm){x.dataset.arm=1;x.textContent="naozaj zrušiť?";setTimeout(()=>{x.dataset.arm="";x.textContent="zrušiť objednávku"},3000);return}
    const r=await sb.from("agro_orders").update({status:"zrusena"}).eq("id",x.dataset.facancel);if(r.error){toast(r.error.message);return}toast("Objednávka zrušená.");faLoad()}});
document.addEventListener("input",e=>{if(typeof FARMER==="undefined"||!FARMER||!e.target.closest("#fAOrd"))return;const t=e.target,map={qty:"q",date_from:"d0",date_to:"d1",place:"place",note:"note"};if(map[t.name])FA[map[t.name]]=t.value;
  if(t.name!=="qty")return;const s=(FA.srv||[]).find(y=>y.id===t.closest("#fAOrd").dataset.sid),el=document.getElementById("agEst");if(s&&el)el.innerHTML=quoteHTML(s,n(t.value))});
document.addEventListener("change",e=>{if(typeof FARMER==="undefined"||!FARMER)return;const k=e.target.dataset&&e.target.dataset.fapk;if(!k)return;FA[k]=e.target.value;if(k!=="sid")FA.sid=null;if(k==="crop")FA.mach=null;renderFarmer()});
document.addEventListener("click",e=>{if(typeof FARMER==="undefined"||!FARMER)return;const b=e.target.closest("[data-fakind]");if(b){FA.kind=b.dataset.fakind;FA.mach=null;FA.sid=null;renderFarmer()}});
document.addEventListener("submit",async e=>{const f=e.target;if(f.id!=="fAOrd")return;e.preventDefault();e.stopPropagation();if(f._b)return;const d=new FormData(f),q=n(d.get("qty")),s=(FA.srv||[]).find(y=>y.id===f.dataset.sid);
  if(!(q>0)){toast("Zadajte množstvo.");return}if(s&&s.min_qty&&q<s.min_qty){toast(`Minimum je ${f2(s.min_qty,0)} ${UN[s.unit]}.`);return}
  if(d.get("date_from")&&d.get("date_to")&&d.get("date_to")<d.get("date_from")){toast("Termín do je pred termínom od.");return}
  f._b=1;const b=f.querySelector("button.lime");if(b)busy(b,true);
  const r=await sb.from("agro_orders").insert({farmer_id:FARMER.id,service_id:f.dataset.sid,qty:q,date_from:d.get("date_from")||null,date_to:d.get("date_to")||null,place:String(d.get("place")||"").trim()||null,note:String(d.get("note")||"").trim()||null});
  f._b=0;if(b)busy(b,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}FA.open=null;FA.q="";FA.place="";FA.note="";FA.d0="";FA.d1="";toast("✅ Objednávka odoslaná. ERNTE vás bude kontaktovať a potvrdí termín.",7000);faLoad()},true);
// pomocník
try{Object.assign(HELP,{agro:{t:"Agro služby",i:"🚜",r:"Práce strojmi pre farmárov – cenník, objednávky a kalkulácia.",s:[
 ["Objednávky","Farmár si v aplikácii objedná službu (výmera, termín, miesto). Ty ju potvrdíš s termínom, označíš V práci a Hotovo so skutočnou výmerou – suma sa prepočíta sama."],
 ["Cenník služieb","Služby so zaškrtnutým Zverejniť vidia farmári s cenou a môžu ich objednať. Skryté vidíš iba ty."],
 ["Kalkulácia strojov","Ako Excel Stroje v počte: odpis, obsluha, servis, poistenie → bod nula €/ha, marža, zisk zákazky, porovnanie dvoch strojov, reálne tankovanie. Každá zmena sa hneď prepočíta."],
 ["Čo vidí farmár","Iba zverejnené služby s cenou a svoje objednávky. Nikdy náklady, maržu ani kalkuláciu."]]}})}catch(e){}
})();
