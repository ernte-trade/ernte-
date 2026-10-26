// ===== ERNTE · KÚPNA ZMLUVA (PDF) – vyplní sa z obchodu; majiteľ / obchod aj farmár (iba svoju) =====
(function(){
const KUP={n:"ERNTE spol. s r.o.",a:"Zbudza 141, 072 23 Zbudza",ico:"52 341 356",tel:"+421 918 449 991",mail:"jana.valkova@ernte.sk"};
const COMF={kukurica:"Kukurica na zrno",soja:"Sója (Non-GMO)",psenica_p:"Pšenica potravinárska",psenica_k:"Pšenica kŕmna",jacmen_s:"Jačmeň sladovnícky",jacmen_k:"Jačmeň kŕmny",repka:"Repka olejná",lo:"Slnečnica",ho:"Slnečnica HO",cirok:"Cirok"};
const DEF_R={clean:2.5,dry:3.5,tol_pct:5};
let RUL=null;
async function rules(){if(RUL)return RUL;try{if(typeof FARMER!=="undefined"&&FARMER){const r=await sb.rpc("settle_contracts");RUL=Object.assign({},DEF_R,(r.data&&r.data.rules)||{})}
  else{const r=await sb.from("settle_rules").select("value").eq("key","main").maybeSingle();RUL=Object.assign({},DEF_R,(r.data&&r.data.value)||{})}}catch(e){RUL=Object.assign({},DEF_R)}return RUL}
const n2=x=>typeof fmt==="function"?fmt(x):String(x);
const e=x=>typeof esc==="function"?esc(x):String(x??"");
function html(d,F,R){const S=(typeof SPEC!=="undefined"&&SPEC[d.com])||[14,2],tol=+(R.tol_pct??5),norm=(R.norm&&R.norm[d.com])!=null?R.norm[d.com]:S[0],today=new Date().toLocaleDateString("sk-SK");
  const total=(+d.tons||0)*(+d.price||0),wheat=d.com==="psenica_p";
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Kúpna zmluva ${e(d.no)} – ${e(F.name)}</title><style>
  @page{size:A4;margin:16mm 16mm 18mm}body{font:11.5px/1.5 "Inter",-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:24px auto;max-width:820px}
  .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #5a8f1c;padding-bottom:10px;margin-bottom:14px}.hd b{font-size:20px;letter-spacing:.01em}.hd small{display:block;color:#555}
  h1{font-size:18px;text-align:center;margin:10px 0 2px;letter-spacing:.06em}.sub{text-align:center;color:#555;margin-bottom:14px}
  .pt{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0 14px}.pt div{border:1px solid #d6dccd;border-radius:8px;padding:10px 12px;background:#fafcf7}.pt h3{margin:0 0 4px;font-size:11px;letter-spacing:.08em;color:#5a8f1c;text-transform:uppercase}
  h2{font-size:12.5px;margin:14px 0 4px}p,li{margin:3px 0}ol{margin:0;padding-left:18px}
  table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #d6dccd;padding:6px 8px;text-align:left}th{background:#f2f6ec;width:38%}
  .sg{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px;page-break-inside:avoid}.sg>div{text-align:center}.sg .ln{margin-top:48px;border-top:1px solid #333;padding-top:6px}.sg small{display:block;color:#555}
  .ft{margin-top:18px;color:#666;font-size:10px}.pb{margin:16px 0}@media print{.pb{display:none}body{margin:0;max-width:none}}</style></head><body>
  <div class="hd"><div><b>ERNTE</b><small>Trade &amp; Logistic</small></div><div style="text-align:right"><small>${e(KUP.a)} · IČO ${e(KUP.ico)}</small><small>${e(KUP.tel)} · ${e(KUP.mail)}</small></div></div>
  <h1>KÚPNA ZMLUVA č. ${e(d.no)}</h1><div class="sub">uzavretá podľa § 409 a nasl. zákona č. 513/1991 Zb. Obchodný zákonník v platnom znení</div>
  <div class="pt"><div><h3>Predávajúci</h3><b>${e(F.name)}</b><br>${e(F.addr||"adresa: ..................................")}<br>IČO: ${e(F.ico||"................")} · DIČ: ${e(F.dic||"................")}${F.icdph?`<br>IČ DPH: ${e(F.icdph)}`:""}<br>IBAN: ${e(F.iban||"..........................................")}${F.phone?`<br>tel.: ${e(F.phone)}`:""}</div>
   <div><h3>Kupujúci</h3><b>${e(KUP.n)}</b><br>${e(KUP.a)}<br>IČO: ${e(KUP.ico)}<br>tel.: ${e(KUP.tel)}<br>e-mail: ${e(KUP.mail)}</div></div>
  <h2>Čl. I – Predmet zmluvy</h2><p>Predávajúci sa zaväzuje dodať kupujúcemu tovar v dohodnutom množstve a kvalite a previesť na neho vlastnícke právo; kupujúci sa zaväzuje tovar prevziať a zaplatiť kúpnu cenu.</p>
  <table><tr><th>Tovar</th><td><b>${e(COMF[d.com]||(typeof comName==="function"?comName(d.com):d.com))}</b>, úroda ${new Date().getFullYear()}</td></tr>
   <tr><th>Množstvo</th><td><b>${n2(d.tons)} t</b> (tolerancia ±${String(tol).replace(".",",")} %)</td></tr>
   <tr><th>Kúpna cena</th><td>${wheat&&!(+d.price)?"podľa obsahu dusíkatých látok – cenová tabuľka v prílohe":`<b>${n2(d.price)} €/t</b> bez DPH`}, parita FCA farma predávajúceho (nakládka na dopravný prostriedok kupujúceho)</td></tr>
   ${!(wheat&&!(+d.price))?`<tr><th>Predpokladaná hodnota</th><td>${n2(total)} € bez DPH (pri dohodnutom množstve)</td></tr>`:""}
   <tr><th>Termín plnenia</th><td>${e(d.term||"podľa dohody – odvoz objedná predávajúci v aplikácii ERNTE")}</td></tr>
   <tr><th>Doprava</th><td>zabezpečuje kupujúci (VALKO s.r.o.) na vlastné náklady</td></tr></table>
  <h2>Čl. II – Kvalita</h2><ol><li>Vlhkosť max. ${String(S[0]).replace(".",",")} %, nečistoty max. ${S[1]} %${S[2]?", Non-GMO":""}; tovar zdravý, bez zápachu, bez živých škodcov, s obsahom mykotoxínov a reziduí v súlade s platnými predpismi EÚ.</li>
   <li>Pri prekročení vlhkosti nad ${String(norm).replace(".",",")} % sa hmotnosť znižuje o úbytok sušením a účtuje sa sušenie ${String(R.dry).replace(".",",")} €/t za každé 1 % nad normu; pri nečistotách sa účtuje čistenie ${String(R.clean).replace(".",",")} €/t a hmotnosť sa znižuje o podiel nečistôt.</li>
   <li>Rozhodujúce sú vážny lístok a laboratórny rozbor na mieste prevzatia. Predávajúci má právo byť pri vážení a odbere vzorky prítomný a vidí svoje lístky v aplikácii ERNTE.</li></ol>
  <h2>Čl. III – Prevzatie a vlastnícke právo</h2><ol><li>Tovar sa považuje za prevzatý naložením na dopravný prostriedok kupujúceho; nebezpečenstvo škody a vlastnícke právo prechádzajú na kupujúceho prevzatím.</li>
   <li>Ak predávajúci nedodá viac ako ${String(tol).replace(".",",")} % dohodnutého množstva, je kupujúci oprávnený požadovať náhradu preukázanej škody. Dodávky nad množstvo kupujúci nie je povinný prevziať.</li></ol>
  <h2>Čl. IV – Platobné podmienky</h2><ol><li>Kúpna cena sa platí na základe faktúry predávajúceho vystavenej podľa zúčtovania kupujúceho (fakturačná váha × cena) bezhotovostne na účet predávajúceho.</li>
   <li>Splatnosť faktúry je 30 dní od jej doručenia, ak sa strany písomne nedohodnú inak. K cene sa pripočíta DPH podľa platných predpisov.</li></ol>
  <h2>Čl. V – Záverečné ustanovenia</h2><ol><li>Zmluva nadobúda platnosť a účinnosť podpisom oboch strán alebo potvrdením súhlasu predávajúceho v aplikácii ERNTE.</li>
   <li>Práva a povinnosti neupravené touto zmluvou sa riadia Obchodným zákonníkom. Osobné údaje sa spracúvajú podľa GDPR a zákona č. 18/2018 Z. z. len na účely plnenia zmluvy.</li>
   <li>Zmluva je vyhotovená v dvoch rovnopisoch, každá strana dostane jeden.</li></ol>
  <div class="sg"><div>V ........................ dňa ............<div class="ln">Predávajúci<small>${e(F.name)}</small></div></div><div>V Zbudzi dňa ${e(today)}<div class="ln">Kupujúci<small>${e(KUP.n)}</small></div></div></div>
  <div class="ft">Zmluva č. ${e(d.no)} · vygenerované v aplikácii ERNTE Trade &amp; Logistic ${e(today)}.${d.status&&d.status!=="navrh"?" Stav: súhlas predávajúceho potvrdený v aplikácii.":""}</div>
  <div class="pb"><button onclick="print()" style="font-size:15px;padding:10px 18px">🖨️ Tlačiť / uložiť ako PDF</button></div></body></html>`}
async function open(id){const d=(STATE.deals||[]).find(x=>x.id===id);if(!d){toast("Zmluva sa nenašla.");return}
  const F=(typeof FARMER!=="undefined"&&FARMER)?FARMER:((STATE.farmers||[]).find(f=>f.id===d.farmer_id)||{name:""});
  const w=window.open("","_blank");if(!w){toast("Povoľ vyskakovacie okná pre zmluvu.");return}w.document.write("<p style='font:16px sans-serif;padding:20px'>Pripravujem zmluvu…</p>");
  const R=await rules();w.document.open();w.document.write(html(d,F,R));w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(x){}},600)}
window.contractPdf=open;window.contractHTML=html;
document.addEventListener("click",e=>{const b=e.target.closest("[data-cpdf]");if(!b)return;e.preventDefault();open(b.dataset.cpdf)});
})();
