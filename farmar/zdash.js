// ===== ZÚČTOVANIE – DASHBOARD + PDF (iba majiteľ) =====
// Prehľad lístkov za obdobie a komoditu; PDF podklad k faktúre za dopravu (hrubá váha × sadzba €/t) a PDF podklad k faktúre pre odberateľa.
(function(){
const ERNTE={n:"ERNTE spol. s r.o.",a:"Zbudza 141, 072 23",i:"IČO 52 341 356"},VALKO={n:"VALKO s.r.o.",a:"Zbudza 141, 072 23",i:"IČO 53 365 241"};
const ld=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(x){return d}},sv=(k,v)=>{try{localStorage.setItem(k,v)}catch(x){}};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function per(k){const t=new Date(),d=new Date(t);if(k==="tw"){const w=(t.getDay()+6)%7;d.setDate(t.getDate()-w);return [iso(d),iso(t)]}
  if(k==="lw"){const w=(t.getDay()+6)%7;d.setDate(t.getDate()-w-7);const e=new Date(d);e.setDate(d.getDate()+6);return [iso(d),iso(e)]}
  if(k==="m"){return [iso(new Date(t.getFullYear(),t.getMonth(),1)),iso(t)]}if(k==="lm"){return [iso(new Date(t.getFullYear(),t.getMonth()-1,1)),iso(new Date(t.getFullYear(),t.getMonth(),0))]}
  if(k==="s")return [`${t.getMonth()>=6?t.getFullYear():t.getFullYear()-1}-07-01`,iso(t)];return null}
const D={L:null,busy:false,p:ld("ernte-zd-p","lw"),d0:"",d1:"",com:"",buyer:"",rate:ld("ernte-zd-rate","9,40"),vk:ld("ernte-zd-vk","1")==="1",to:ld("ernte-zd-to",ERNTE.n+", "+ERNTE.a+" · "+ERNTE.i)};
{const r=per(D.p)||per("lw");D.d0=r[0];D.d1=r[1]}
function load(){if(D.busy)return;D.busy=true;sb.rpc("buyer_tickets",{d0:D.d0||null,d1:D.d1||null}).then(r=>{D.busy=false;D.L=r.error?{err:/does not exist|could not find/i.test(r.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message}:r.data||[];renderStaff()})}
const val=x=>x.v!=null?+x.v:(x.n!=null&&x.s!=null?Math.round(x.n*x.s/10)/100:0);
const rate=()=>{const r=num(String(D.rate));return isFinite(r)&&r>0?r:9.4};
function rows(){const L=Array.isArray(D.L)?D.L:[];return L.filter(x=>(!D.com||x.k===D.com)&&(!D.buyer||x.b===D.buyer)).sort((a,b)=>String(a.d).localeCompare(String(b.d))||String(a.t).localeCompare(String(b.t)))}
const lk=n=>n+" "+(n===1?"lístok":n>=2&&n<=4?"lístky":"lístkov");
const S=(L,f)=>L.reduce((s,x)=>s+(+f(x)||0),0);
window.zdashHTML=function(){if(ROLE!=="owner")return "";
  let h=`<div class="card zd"><h2 class="odh">📊 Dashboard zúčtovania</h2>
   <div class="zdp btns seg2">${[["tw","Tento týždeň"],["lw","Minulý týždeň"],["m","Tento mesiac"],["lm","Minulý mesiac"],["s","Sezóna"]].map(k=>`<button type="button" data-zdp="${k[0]}" aria-pressed="${D.p===k[0]}">${k[1]}</button>`).join("")}</div>
   <div class="zdf"><label>Od<input type="date" id="zdD0" value="${esc(D.d0)}"></label><label>Do<input type="date" id="zdD1" value="${esc(D.d1)}"></label>`;
  if(D.L===null){load();return h+`</div><div class="s">Načítavam…</div></div>`}
  if(D.L.err)return h+`</div><div class="s">${esc(D.L.err)}</div></div>`;
  const A=D.L,coms=[...new Set(A.map(x=>x.k).filter(Boolean))],buyers=[...new Set(A.map(x=>x.b).filter(Boolean))];
  h+=`<label>Komodita<select id="zdCom"><option value="">všetky</option>${coms.map(k=>`<option value="${esc(k)}"${D.com===k?" selected":""}>${esc(comName(k))}</option>`).join("")}</select></label>
   <label>Odberateľ<select id="zdBuy"><option value="">všetci</option>${buyers.map(k=>`<option value="${esc(k)}"${D.buyer===k?" selected":""}>${esc(k)}</option>`).join("")}</select></label></div>`;
  const L=rows(),T=L.filter(x=>!D.vk||x.vk),r=rate();
  if(!L.length)return h+`<div class="s">V tomto období nie sú žiadne vážne lístky${D.com?" pre "+esc(comName(D.com)):""}.</div></div>`;
  const g=S(L,x=>x.g)/1000,n=S(L,x=>x.n)/1000,v=S(L,val),nr=L.filter(x=>!x.f).length,tg=S(T,x=>x.g)/1000;
  h+=`<div class="zdk"><div><small>Lístky</small><b>${L.length}</b></div><div><small>Hrubá váha</small><b>${fmt(g,2)} t</b></div><div><small>Čistá váha</small><b>${fmt(n,2)} t</b></div>
   <div><small>Hodnota u odberateľa</small><b>${fmt(v,2)} €</b></div><div><small>Doprava VALKO (${fmt(r,2)} €/t)</small><b>${fmt(tg*r,2)} €</b></div><div class="${nr?"w":""}"><small>Nerozdelené farmárom</small><b>${nr}</b></div></div>`;
  const by={};for(const x of L)(by[x.k]=by[x.k]||[]).push(x);
  h+=`<div class="hrt"><table><thead><tr><th>Komodita</th><th>Lístky</th><th>Hrubá t</th><th>Čistá t</th><th>Ø €/t</th><th>Hodnota €</th><th>Doprava €</th></tr></thead><tbody>${Object.entries(by).map(([k,X])=>{const nn=S(X,x=>x.n)/1000,vv=S(X,val);return `<tr><td><b>${esc(comName(k))}</b></td><td>${X.length}</td><td>${fmt(S(X,x=>x.g)/1000,2)}</td><td>${fmt(nn,2)}</td><td>${nn?fmt(vv/nn,2):"–"}</td><td>${fmt(vv,2)}</td><td>${fmt(S(X.filter(x=>!D.vk||x.vk),x=>x.g)/1000*r,2)}</td></tr>`}).join("")}</tbody></table></div>`;
  // po dňoch
  const days={};for(const x of L)days[x.d]=(days[x.d]||0)+(+x.g||0)/1000;const mx=Math.max(...Object.values(days),1);
  h+=`<div class="zdd" aria-label="Hrubá váha po dňoch">${Object.entries(days).sort().map(([d,t])=>`<div class="zddi" title="${esc(dSK(d))}: ${fmt(t,2)} t"><i style="height:${Math.max(4,t/mx*100)}%"></i><small>${+d.slice(8,10)}.${+d.slice(5,7)}.</small></div>`).join("")}</div>`;
  h+=`<div class="zdpdf"><div class="zdbox"><b>🚚 PDF – fakturácia dopravy</b><label>Sadzba €/t (hrubá váha)<input id="zdRate" inputmode="decimal" value="${esc(D.rate)}"></label>
     <label class="zdck"><input type="checkbox" id="zdVk"${D.vk?" checked":""}> iba autá VALKO <small>(${T.length} z ${L.length} lístkov)</small></label>
     <label>Fakturovať komu<input id="zdTo" value="${esc(D.to)}"></label>
     <button type="button" class="pri" data-zdpdf="dop">🚚 PDF doprava · ${fmt(tg,2)} t × ${fmt(r,2)} = ${fmt(tg*r,2)} €</button></div>
    <div class="zdbox"><b>🧾 PDF – fakturácia pre odberateľa</b><div class="s">${D.buyer?esc(D.buyer):buyers.length>1?"⚠️ Vyber odberateľa hore – každý dostane vlastný podklad.":esc(buyers[0]||"")}</div>
     <button type="button" class="pri" data-zdpdf="odb"${!D.buyer&&buyers.length>1?" disabled":""}>🧾 PDF odberateľ · ${fmt(n,2)} t · ${fmt(v,2)} €</button></div></div>
   <div class="s">PDF sa otvorí na tlač – v tlači zvoľ <b>Uložiť ako PDF</b> alebo zdieľaj.</div></div>`;
  return h};
// ---------- PDF ----------
const CSS=`body{font:11.5px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:22px}h1{font-size:18px;margin:0 0 2px}.hd{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #5a8f1c;padding-bottom:10px;margin-bottom:12px}
 .hd small,.pt small{color:#555;display:block}.pt{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}.pt div{border:1px solid #ddd;border-radius:8px;padding:8px}
 table{border-collapse:collapse;width:100%;font-size:10.5px}th,td{border:1px solid #ddd;padding:4px 5px;text-align:right}th.l,td.l{text-align:left}th{background:#f2f6ec}tr.sub td{background:#f7f9f3;font-weight:700}tfoot td{font-weight:700;background:#eef3e6}
 .tot{margin:12px 0 0 auto;width:340px}.tot td{font-size:12px}.tot tr:last-child td{font-size:14px;background:#eef3e6;font-weight:800}.ft{margin-top:14px;color:#444;font-size:10.5px}@media print{body{margin:10mm}}`;
const perTxt=()=>`${dSK(D.d0)} – ${dSK(D.d1)}`;
function pdfDop(){const r=rate(),L=rows().filter(x=>!D.vk||x.vk);if(!L.length){toast("Žiadne lístky na fakturáciu dopravy.");return}
  const by={};for(const x of L)(by[x.k]=by[x.k]||[]).push(x);let body="";
  for(const [k,X] of Object.entries(by)){body+=X.map(x=>`<tr><td class="l">${esc(dSK(x.d))}</td><td class="l">${esc(x.t)}</td><td class="l">${esc(comName(x.k))}</td><td class="l">${esc(x.p||"")}</td><td>${fmt(x.g/1000,3)}</td><td>${fmt(r,2)}</td><td>${fmt(Math.round(x.g/1000*r*100)/100,2)}</td></tr>`).join("");
    const t=S(X,x=>x.g)/1000;body+=`<tr class="sub"><td class="l" colspan="4">Spolu ${esc(comName(k))} · ${lk(X.length)}</td><td>${fmt(t,3)}</td><td></td><td>${fmt(Math.round(t*r*100)/100,2)}</td></tr>`}
  const t=S(L,x=>x.g)/1000,z=Math.round(t*r*100)/100,dph=Math.round(z*0.23*100)/100;
  openPdf(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Doprava ${esc(perTxt())}</title><style>${CSS}</style></head><body>
   <div class="hd"><div><h1>Podklad k faktúre – preprava</h1><small>Odvoz komodít k odberateľovi · ${esc(D.com?comName(D.com):"všetky komodity")}${D.buyer?" · "+esc(D.buyer):""}</small></div><div style="text-align:right"><b>Obdobie ${esc(perTxt())}</b><small>Vystavené ${new Date().toLocaleDateString("sk-SK")}</small></div></div>
   <div class="pt"><div><small>Dodávateľ (dopravca)</small><b>${VALKO.n}</b><br>${VALKO.a}<br>${VALKO.i}</div><div><small>Odberateľ služby</small><b>${esc(D.to)}</b></div></div>
   <table><thead><tr><th class="l">Dátum</th><th class="l">Vážny lístok</th><th class="l">Komodita</th><th class="l">ŠPZ</th><th>Hrubá váha t</th><th>Sadzba €/t</th><th>Suma €</th></tr></thead><tbody>${body}</tbody>
   <tfoot><tr><td class="l" colspan="4">SPOLU · ${lk(L.length)}</td><td>${fmt(t,3)}</td><td>${fmt(r,2)}</td><td>${fmt(z,2)}</td></tr></tfoot></table>
   <table class="tot"><tr><td class="l">Základ dane</td><td>${fmt(z,2)} €</td></tr><tr><td class="l">DPH 23 %</td><td>${fmt(dph,2)} €</td></tr><tr><td class="l">Spolu na úhradu</td><td>${fmt(z+dph,2)} €</td></tr></table>
   <div class="ft">Výpočet: hrubá váha z vážnych lístkov odberateľa × ${fmt(r,2)} €/t. ${D.vk?"Iba autá flotily VALKO.":"Všetky autá."} Podklad k faktúre – faktúru vystaví účtovníctvo VALKO s.r.o.</div></body></html>`)}
function pdfOdb(){const L=rows();if(!L.length){toast("Žiadne lístky.");return}const B=D.buyer||[...new Set(L.map(x=>x.b).filter(Boolean))][0]||"Odberateľ";
  const by={};for(const x of L)(by[x.k]=by[x.k]||[]).push(x);let body="";
  for(const [k,X] of Object.entries(by)){body+=X.map(x=>`<tr><td class="l">${esc(dSK(x.d))}</td><td class="l">${esc(x.t)}</td><td class="l">${esc(x.p||"")}</td><td>${fmt(x.g,0)}</td><td>${x.i!=null?fmt(x.i,2):"–"}</td><td>${fmt(x.n,0)}</td><td>${x.m!=null?fmt(x.m,1):"–"}</td><td>${x.dk?fmt(x.dk,0):"–"}</td><td>${x.s!=null?fmt(x.s,2):"–"}</td><td>${fmt(val(x),2)}</td></tr>`).join("");
    const nn=S(X,x=>x.n),vv=S(X,val);body+=`<tr class="sub"><td class="l" colspan="3">Spolu ${esc(comName(k))} · ${lk(X.length)}</td><td>${fmt(S(X,x=>x.g),0)}</td><td></td><td>${fmt(nn,0)}</td><td></td><td>${fmt(S(X,x=>x.dk),0)}</td><td>${nn?fmt(vv/nn*1000,2):""}</td><td>${fmt(vv,2)}</td></tr>`}
  const z=Math.round(S(L,val)*100)/100;
  openPdf(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Odberateľ ${esc(B)} ${esc(perTxt())}</title><style>${CSS}</style></head><body>
   <div class="hd"><div><h1>Podklad k faktúre – dodávka komodít</h1><small>${esc(D.com?comName(D.com):"všetky komodity")}</small></div><div style="text-align:right"><b>Obdobie ${esc(perTxt())}</b><small>Vystavené ${new Date().toLocaleDateString("sk-SK")}</small></div></div>
   <div class="pt"><div><small>Dodávateľ</small><b>${ERNTE.n}</b><br>${ERNTE.a}<br>${ERNTE.i}</div><div><small>Odberateľ</small><b>${esc(B)}</b></div></div>
   <table><thead><tr><th class="l">Dátum</th><th class="l">Vážny lístok</th><th class="l">ŠPZ</th><th>Hrubá kg</th><th>Nečist. %</th><th>Čistá kg</th><th>Vlhkosť %</th><th>Sušenie kg</th><th>Cena €/t</th><th>Hodnota €</th></tr></thead><tbody>${body}</tbody>
   <tfoot><tr><td class="l" colspan="3">SPOLU · ${lk(L.length)}</td><td>${fmt(S(L,x=>x.g),0)}</td><td></td><td>${fmt(S(L,x=>x.n),0)}</td><td></td><td>${fmt(S(L,x=>x.dk),0)}</td><td></td><td>${fmt(z,2)}</td></tr></tfoot></table>
   <table class="tot"><tr><td class="l">Základ dane</td><td>${fmt(z,2)} €</td></tr><tr><td class="l">DPH</td><td>prenesenie</td></tr><tr><td class="l">Spolu na úhradu</td><td>${fmt(z,2)} €</td></tr></table>
   <div class="ft"><b>Prenesenie daňovej povinnosti</b> – § 69 ods. 12 písm. f) zákona č. 222/2004 Z. z. o DPH (tovary kapitol 10 a 12 Spoločného colného sadzobníka: obilniny, olejniny). DPH odvedie odberateľ.<br>
    Váhy, kvalita a ceny podľa vážnych lístkov a zúčtovania odberateľa. Podklad k faktúre – faktúru vystaví účtovníctvo ERNTE spol. s r.o.</div></body></html>`)}
function openPdf(html){const w=window.open("","_blank");if(!w){toast("Povoľ vyskakovacie okná pre tlač.");return}w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(e){}},500)}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||ROLE!=="owner")return;let x;
  if(x=t.closest("[data-zdp]")){D.p=x.dataset.zdp;sv("ernte-zd-p",D.p);const r=per(D.p);D.d0=r[0];D.d1=r[1];D.L=null;renderStaff();return}
  if(x=t.closest("[data-zdpdf]")){const i=document.getElementById("zdRate");if(i){D.rate=i.value;sv("ernte-zd-rate",D.rate)}const o=document.getElementById("zdTo");if(o){D.to=o.value;sv("ernte-zd-to",D.to)}
    if(x.dataset.zdpdf==="dop")pdfDop();else pdfOdb()}});
document.addEventListener("change",e=>{const t=e.target;if(!t||ROLE!=="owner")return;
  if(t.id==="zdD0"||t.id==="zdD1"){D[t.id==="zdD0"?"d0":"d1"]=t.value;D.p="";D.L=null;renderStaff();return}
  if(t.id==="zdCom"){D.com=t.value;renderStaff();return}if(t.id==="zdBuy"){D.buyer=t.value;renderStaff();return}
  if(t.id==="zdVk"){D.vk=t.checked;sv("ernte-zd-vk",D.vk?"1":"0");renderStaff();return}
  if(t.id==="zdRate"){D.rate=t.value;sv("ernte-zd-rate",D.rate);renderStaff();return}
  if(t.id==="zdTo"){D.to=t.value;sv("ernte-zd-to",D.to)}});
window.zdashReload=()=>{D.L=null};
})();
