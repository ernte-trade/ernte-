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
     <button type="button" class="pri" data-zdsend="dop">📤 Poslať ${esc(D.who)} · ${fmt(tg,2)} t × ${fmt(r,2)} = ${fmt(tg*r,2)} €</button><button type="button" data-zdpdf="dop">🖨️ Tlač / uložiť</button></div>
    <div class="zdbox"><b>🧾 PDF – fakturácia pre odberateľa</b><div class="s">${D.buyer?esc(D.buyer):buyers.length>1?"⚠️ Vyber odberateľa hore – každý dostane vlastný podklad.":esc(buyers[0]||"")}</div>
     <button type="button" class="pri" data-zdsend="odb"${!D.buyer&&buyers.length>1?" disabled":""}>📤 Poslať ${esc(D.who)} · ${fmt(n,2)} t · ${fmt(v,2)} €</button><button type="button" data-zdpdf="odb"${!D.buyer&&buyers.length>1?" disabled":""}>🖨️ Tlač / uložiť</button></div></div>
   <label class="zdto">Podklady k faktúram posielať<input id="zdMailIn" type="email" value="${esc(D.mail)}"></label>
   <div class="s">📤 pripraví PDF a pošle ho ${esc(D.who)} (${esc(D.mail)}) e-mailom alebo cez WhatsApp. </div>${(()=>{const L=(window.sentKind?sentKind("faktura"):[]).slice(0,5);if(!L.length){try{const l=JSON.parse(localStorage.getItem("ernte-zd-last")||"null");if(l)L.push({title:l.n,to_name:l.to||D.mail,how:l.how,at:new Date(l.at).toISOString()})}catch(x){}}
     return L.length?`<div class="duesentok">✅ Odoslané: <b>${esc(L[0].to_name)}</b> · ${esc(L[0].how==="mail"?"e-mail":L[0].how==="share"?"menu telefónu":L[0].how||"")} · ${esc(new Date(L[0].at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}))}<small>${esc(L[0].title||"")}</small>${L.length>1?`<details class="duehist"><summary>Predtým (${L.length-1})</summary>${L.slice(1).map(x=>`<div>📄 ${esc(x.title||"")} → <b>${esc(x.to_name)}</b> · ${esc(new Date(x.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}))}</div>`).join("")}</details>`:""}</div>`:""})()}</div>`;
  return h};
// ---------- PDF ----------
const CSS=`body{font:11.5px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:22px}h1{font-size:18px;margin:0 0 2px}.zhd{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #5a8f1c;padding-bottom:10px;margin-bottom:12px}
 .zhd small,.zpt small{color:#555;display:block}.zpt{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}.zpt div{border:1px solid #ddd;border-radius:8px;padding:8px}
 table{border-collapse:collapse;width:100%;font-size:10.5px}th,td{border:1px solid #ddd;padding:4px 5px;text-align:right}th.zl,td.zl{text-align:left}th{background:#f2f6ec}tr.zsr td{background:#f7f9f3;font-weight:700}tfoot td{font-weight:700;background:#eef3e6}
 .ztt{margin:12px 0 0 auto;width:340px}.ztt td{font-size:12px}.ztt tr:last-child td{font-size:14px;background:#eef3e6;font-weight:800}.zft{margin-top:14px;color:#444;font-size:10.5px}@media print{body{margin:10mm}}`;
const perTxt=()=>`${dSK(D.d0)} – ${dSK(D.d1)}`;
const fn=()=>`${D.d0}_${D.d1}${D.com?"-"+D.com:""}`;
// ---------- posielanie (predvolene Janke Valkovej – fakturácia) ----------
D.mail=ld("ernte-zd-mail","jana.valkova@ernte.sk");D.who=ld("ernte-zd-who","Janke Valkovej");
function lib(){if(window.html2pdf)return Promise.resolve(window.html2pdf);return new Promise((ok,no)=>{const s=document.createElement("script");s.src="vendor/html2pdf-0.10.1.js";s.onload=()=>ok(window.html2pdf);s.onerror=()=>no(new Error("PDF knižnica sa nenačítala"));document.head.appendChild(s)})}
async function toFile(P){const H=await lib();const css=(P.html.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||"",body=(P.html.match(/<body>([\s\S]*)<\/body>/)||[])[1]||"";
  const sx=window.scrollX,sy=window.scrollY;window.scrollTo(0,0);const box=document.createElement("div");box.style.cssText=`position:absolute;left:0;top:0;width:${P.land?"273mm":"186mm"};background:#fff;color:#111;z-index:-5`;
  box.innerHTML=`<style>${css.replace(/body\{/g,".zpb{").replace(/@media print\{[^}]*\{[^}]*\}[^}]*\}/g,"")}</style><div class="zpb" style="margin:0">${body}</div>`;document.body.appendChild(box);
  try{const b=await H().set({margin:[10,10,10,10],image:{type:"jpeg",quality:.95},html2canvas:{scale:2,backgroundColor:"#ffffff",scrollX:0,scrollY:0},jsPDF:{unit:"mm",format:"a4",orientation:P.land?"landscape":"portrait"},pagebreak:{mode:["css"]}}).from(box.querySelector(".zpb")).toPdf().output("blob");
    return new File([b],P.name,{type:"application/pdf"})}finally{box.remove();window.scrollTo(sx,sy)}}
function dlf(f){const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
function sendSheet(P,f){const o=document.createElement("div");o.className="hsheet";o.id="zdSend";const body=`Dobrý deň,\n\nv prílohe posielam podklad k faktúre: ${P.subj}.\n${P.sum}\n\nĎakujem\nMartin Vaľko\n\n👉 ERNTE Trade & Logistic`;
  const mt=`mailto:${encodeURIComponent(D.mail)}?subject=${encodeURIComponent(P.subj)}&body=${encodeURIComponent(body+"\n\n(PDF priložte – je stiahnuté v telefóne: "+f.name+")")}`;
  o.innerHTML=`<div class="hbox" style="max-width:440px;text-align:center"><div style="font-size:2.2rem">📄</div><b style="font:800 1.15rem var(--f-head,system-ui)">PDF pre ${esc(D.who)}</b><p class="hrole" style="margin:6px 0 4px">${esc(f.name)}</p><p class="hrole" style="margin:0 0 12px">${esc(P.sum)}</p>
   ${navigator.canShare&&navigator.canShare({files:[f]})?`<button type="button" class="hai" id="zdGo">📤 Poslať PDF (e-mail, WhatsApp…)</button>`:""}
   <a class="hai" id="zdMail" href="${esc(mt)}" style="display:block;margin-top:8px;text-decoration:none">✉️ E-mail ${esc(D.mail)}</a>
   <button type="button" class="hai" id="zdDl" style="background:rgba(255,255,255,.1);color:#fff;margin-top:8px">⬇️ Uložiť PDF</button><button type="button" class="hx" id="zdX" style="margin:12px auto 0;display:block">×</button>
   <p class="hrole" style="margin-top:10px;font-size:.8em">Pri „Poslať PDF“ vyber Gmail/Mail a adresát je ${esc(D.mail)} (text je predvyplnený). Pri „E-mail“ sa PDF najprv stiahne – priložte ho.</p></div>`;
  document.body.appendChild(o);const close=()=>o.remove();const done=how=>{const nm=/jana\.valkova/i.test(D.mail)?"Jana Valková":D.mail;try{localStorage.setItem("ernte-zd-last",JSON.stringify({n:f.name,at:Date.now(),to:nm,how}))}catch(x){}if(window.sendLog)sendLog({kind:"faktura",ref:f.name,title:P.subj,n:nm,c:D.mail,how});toast(`✅ Odoslané: ${nm} (${D.mail}) · ${how==="mail"?"e-mail":how==="share"?"menu telefónu":how} · ${f.name}`,7000);renderStaff()};
  const g=o.querySelector("#zdGo");if(g)g.onclick=async()=>{try{await navigator.share({files:[f],title:P.subj,text:`Pre: ${D.mail}\n\n`+body});done("share");close()}catch(e){if(e&&e.name!=="AbortError"){dlf(f);close()}}};
  o.querySelector("#zdMail").onclick=()=>{dlf(f);done("mail");setTimeout(close,400)};o.querySelector("#zdDl").onclick=()=>{dlf(f);close()};o.querySelector("#zdX").onclick=close}
async function send(k,b){const P=k==="dop"?pdfDop():pdfOdb();if(!P)return;busy(b,true);try{const f=await toFile(P);sendSheet(P,f)}catch(e){toast("PDF sa nepodarilo pripraviť – otváram tlač.",4000);openPdf(P.html)}finally{busy(b,false)}}
function pdfDop(){const r=rate(),L=rows().filter(x=>!D.vk||x.vk);if(!L.length){toast("Žiadne lístky na fakturáciu dopravy.");return null}
  const by={};for(const x of L)(by[x.k]=by[x.k]||[]).push(x);let body="";
  for(const [k,X] of Object.entries(by)){body+=X.map(x=>`<tr><td class="zl">${esc(dSK(x.d))}</td><td class="zl">${esc(x.t)}</td><td class="zl">${esc(comName(x.k))}</td><td class="zl">${esc(x.p||"")}</td><td>${fmt(x.g/1000,3)}</td><td>${fmt(r,2)}</td><td>${fmt(Math.round(x.g/1000*r*100)/100,2)}</td></tr>`).join("");
    const t=S(X,x=>x.g)/1000;body+=`<tr class="zsr"><td class="zl" colspan="4">Spolu ${esc(comName(k))} · ${lk(X.length)}</td><td>${fmt(t,3)}</td><td></td><td>${fmt(Math.round(t*r*100)/100,2)}</td></tr>`}
  const t=S(L,x=>x.g)/1000,z=Math.round(t*r*100)/100,dph=Math.round(z*0.23*100)/100;
  return {name:`Doprava-${fn()}.pdf`,subj:`Fakturácia dopravy ${perTxt()}${D.com?" – "+comName(D.com):""}`,sum:`${lk(L.length)} · ${fmt(t,3)} t × ${fmt(r,2)} €/t = ${fmt(z,2)} € bez DPH (${fmt(z+dph,2)} € s DPH)`,land:false,html:`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Doprava ${esc(perTxt())}</title><style>${CSS}${window.brandCss?brandCss("valko"):""}</style></head><body>
   ${window.brandHead?brandHead("valko","Podklad k faktúre – preprava",`Obdobie ${esc(perTxt())} · vystavené ${new Date().toLocaleDateString("sk-SK")}`,`<small style="display:block;color:#555;font:10.5px Arial">Odvoz komodít k odberateľovi · ${esc(D.com?comName(D.com):"všetky komodity")}${D.buyer?" · "+esc(D.buyer):""}</small>`):""}
   <div class="zpt"><div><small>Dodávateľ (dopravca)</small><b>${VALKO.n}</b><br>${VALKO.a}<br>${VALKO.i}</div><div><small>Odberateľ služby</small><b>${esc(D.to)}</b></div></div>
   <table><thead><tr><th class="zl">Dátum</th><th class="zl">Vážny lístok</th><th class="zl">Komodita</th><th class="zl">ŠPZ</th><th>Hrubá váha t</th><th>Sadzba €/t</th><th>Suma €</th></tr></thead><tbody>${body}</tbody>
   <tfoot><tr><td class="zl" colspan="4">SPOLU · ${lk(L.length)}</td><td>${fmt(t,3)}</td><td>${fmt(r,2)}</td><td>${fmt(z,2)}</td></tr></tfoot></table>
   <table class="ztt"><tr><td class="zl">Základ dane</td><td>${fmt(z,2)} €</td></tr><tr><td class="zl">DPH 23 %</td><td>${fmt(dph,2)} €</td></tr><tr><td class="zl">Spolu na úhradu</td><td>${fmt(z+dph,2)} €</td></tr></table>
   <div class="zft">Výpočet: hrubá váha z vážnych lístkov odberateľa × ${fmt(r,2)} €/t. ${D.vk?"Iba autá flotily VALKO.":"Všetky autá."} Podklad k faktúre – faktúru vystaví účtovníctvo VALKO s.r.o.</div></body></html>`}}
function pdfOdb(){const L=rows();if(!L.length){toast("Žiadne lístky.");return null}const B=D.buyer||[...new Set(L.map(x=>x.b).filter(Boolean))][0]||"Odberateľ";
  const by={};for(const x of L)(by[x.k]=by[x.k]||[]).push(x);let body="";
  for(const [k,X] of Object.entries(by)){body+=X.map(x=>`<tr><td class="zl">${esc(dSK(x.d))}</td><td class="zl">${esc(x.t)}</td><td class="zl">${esc(x.p||"")}</td><td>${fmt(x.g,0)}</td><td>${x.i!=null?fmt(x.i,2):"–"}</td><td>${fmt(x.n,0)}</td><td>${x.m!=null?fmt(x.m,1):"–"}</td><td>${x.dk?fmt(x.dk,0):"–"}</td><td>${x.s!=null?fmt(x.s,2):"–"}</td><td>${fmt(val(x),2)}</td></tr>`).join("");
    const nn=S(X,x=>x.n),vv=S(X,val);body+=`<tr class="zsr"><td class="zl" colspan="3">Spolu ${esc(comName(k))} · ${lk(X.length)}</td><td>${fmt(S(X,x=>x.g),0)}</td><td></td><td>${fmt(nn,0)}</td><td></td><td>${fmt(S(X,x=>x.dk),0)}</td><td>${nn?fmt(vv/nn*1000,2):""}</td><td>${fmt(vv,2)}</td></tr>`}
  const z=Math.round(S(L,val)*100)/100;
  return {name:`Odberatel-${String(B).replace(/[^A-Za-z0-9]+/g,"-").replace(/-+$/,"")}-${fn()}.pdf`,subj:`Fakturácia ${B} ${perTxt()}${D.com?" – "+comName(D.com):""}`,sum:`${lk(L.length)} · ${fmt(S(L,x=>x.n)/1000,3)} t čistá · ${fmt(z,2)} € (prenesenie DPH)`,land:true,html:`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Odberateľ ${esc(B)} ${esc(perTxt())}</title><style>${CSS}${window.brandCss?brandCss("ernte"):""}</style></head><body>
   ${window.brandHead?brandHead("ernte","Podklad k faktúre – dodávka komodít",`Obdobie ${esc(perTxt())} · vystavené ${new Date().toLocaleDateString("sk-SK")}`,`<small style="display:block;color:#555;font:10.5px Arial">${esc(D.com?comName(D.com):"všetky komodity")}</small>`):""}
   <div class="zpt"><div><small>Dodávateľ</small><b>${ERNTE.n}</b><br>${ERNTE.a}<br>${ERNTE.i}</div><div><small>Odberateľ</small><b>${esc(B)}</b></div></div>
   <table><thead><tr><th class="zl">Dátum</th><th class="zl">Vážny lístok</th><th class="zl">ŠPZ</th><th>Hrubá kg</th><th>Nečist. %</th><th>Čistá kg</th><th>Vlhkosť %</th><th>Sušenie kg</th><th>Cena €/t</th><th>Hodnota €</th></tr></thead><tbody>${body}</tbody>
   <tfoot><tr><td class="zl" colspan="3">SPOLU · ${lk(L.length)}</td><td>${fmt(S(L,x=>x.g),0)}</td><td></td><td>${fmt(S(L,x=>x.n),0)}</td><td></td><td>${fmt(S(L,x=>x.dk),0)}</td><td></td><td>${fmt(z,2)}</td></tr></tfoot></table>
   <table class="ztt"><tr><td class="zl">Základ dane</td><td>${fmt(z,2)} €</td></tr><tr><td class="zl">DPH</td><td>prenesenie</td></tr><tr><td class="zl">Spolu na úhradu</td><td>${fmt(z,2)} €</td></tr></table>
   <div class="zft"><b>Prenesenie daňovej povinnosti</b> – § 69 ods. 12 písm. f) zákona č. 222/2004 Z. z. o DPH (tovary kapitol 10 a 12 Spoločného colného sadzobníka: obilniny, olejniny). DPH odvedie odberateľ.<br>
    Váhy, kvalita a ceny podľa vážnych lístkov a zúčtovania odberateľa. Podklad k faktúre – faktúru vystaví účtovníctvo ERNTE spol. s r.o.</div></body></html>`}}
function openPdf(html){const w=window.open("","_blank");if(!w){toast("Povoľ vyskakovacie okná pre tlač.");return}w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(e){}},500)}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||ROLE!=="owner")return;let x;
  if(x=t.closest("[data-zdp]")){D.p=x.dataset.zdp;sv("ernte-zd-p",D.p);const r=per(D.p);D.d0=r[0];D.d1=r[1];D.L=null;renderStaff();return}
  if(x=t.closest("[data-zdpdf]")){const i=document.getElementById("zdRate");if(i){D.rate=i.value;sv("ernte-zd-rate",D.rate)}const o=document.getElementById("zdTo");if(o){D.to=o.value;sv("ernte-zd-to",D.to)}
    const P=x.dataset.zdpdf==="dop"?pdfDop():pdfOdb();if(P)openPdf(P.html);return}
  if(x=t.closest("[data-zdsend]")){const i=document.getElementById("zdRate");if(i){D.rate=i.value;sv("ernte-zd-rate",D.rate)}const o=document.getElementById("zdTo");if(o){D.to=o.value;sv("ernte-zd-to",D.to)}send(x.dataset.zdsend,x);return}});
document.addEventListener("change",e=>{const t=e.target;if(!t||ROLE!=="owner")return;
  if(t.id==="zdD0"||t.id==="zdD1"){D[t.id==="zdD0"?"d0":"d1"]=t.value;D.p="";D.L=null;renderStaff();return}
  if(t.id==="zdCom"){D.com=t.value;renderStaff();return}if(t.id==="zdBuy"){D.buyer=t.value;renderStaff();return}
  if(t.id==="zdVk"){D.vk=t.checked;sv("ernte-zd-vk",D.vk?"1":"0");renderStaff();return}
  if(t.id==="zdRate"){D.rate=t.value;sv("ernte-zd-rate",D.rate);renderStaff();return}
  if(t.id==="zdTo"){D.to=t.value;sv("ernte-zd-to",D.to)}
  if(t.id==="zdMailIn"){const v=t.value.trim();if(/^\S+@\S+\.\S+$/.test(v)){D.mail=v;sv("ernte-zd-mail",v);D.who=/jana\.valkova/i.test(v)?"Janke Valkovej":v;sv("ernte-zd-who",D.who);renderStaff()}else toast("Zadaj platný e-mail.")}});
window.zdashReload=()=>{D.L=null};
})();
