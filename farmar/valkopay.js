// ===== 💶 VALKO-HUB: VÝPLATY VODIČOV + KPI A BONUSY TÍMU (príkaz majiteľa 31. 10. 2026 – „použi všetko čo potrebujeme“ zo súborov VALKO-HUB) =====
// Vodiči (Flotila → 👤 Vodiči, iba majiteľ): cieľ na účet = súčet denných sadzieb z jázd (Región 80/90 €, EU 105 € – rovnako ako Mzdy vodičov),
//   diéty = MAX(minimum Commander; cieľ − skutočná čistá mzda z pásky), zrážka sa stiahne len z diét nad minimom (zvyšok sa prenesie),
//   vrátenie výdavkov sa pripočíta, výkonnostný bonus podľa skóre Valko-Hub (98→150, 95→120, 90→80, 85→50, 80→25 €) ide do mzdy cez MRP.
// Tím (Flotila → ⚙️ → 🏢 Firma VALKO): 5 KPI s váhami, pásma 95 / 85 / 75 → 100 / 70 / 40 % max. bonusu, kritický gate = 0,
//   krátenie iba bonusu (fixná mzda sa nekráti), stavy Navrhnuté → Skontrolované → Schválené → Uzamknuté s audit logom; flotila: autá bez vodiča 0–2 / 3–4 / 5+.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N0=x=>Number.isFinite(+x)&&x!==null&&x!==""?Math.round(+x).toLocaleString("sk-SK"):"–";
const N2=x=>Number.isFinite(+x)&&x!==null&&x!==""?(+x).toLocaleString("sk-SK",{minimumFractionDigits:2,maximumFractionDigits:2}):"–";
const num=v=>{if(v==null||v==="")return null;const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null};
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!window.ERNTE_VIEWAS;
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||3500)};
const key=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z ]/g," ").split(/\s+/).filter(Boolean).sort().join(" ");
const V={cfg:null,drv:null,pay:{},kpi:{},fleet:{},busy:{},kmon:null};
const re=()=>{try{if(typeof renderStaff==="function")renderStaff()}catch(x){}};
async function loadBase(){if(V.cfg||V.busy.base)return;V.busy.base=1;try{
  const [c,d]=await Promise.all([sb.from("valko_cfg").select("key,value"),sb.from("valko_drv").select("*").order("os")]);
  V.cfg=Object.fromEntries(((c&&c.data)||[]).map(r=>[r.key,r.value]));V.drv=(d&&d.data)||[];if(c&&c.error)V.err=c.error.message}catch(x){V.err=String(x)}V.busy.base=0;re()}
async function loadPay(mon){if(V.pay[mon]||V.busy["p"+mon])return;V.busy["p"+mon]=1;const pm=prevMon(mon);
  const r=await sb.from("valko_pay").select("*").in("mon",[mon,pm]);const L=(r&&r.data)||[];V.pay[mon]=Object.fromEntries(L.filter(x=>x.mon===mon).map(x=>[x.name,x]));
  if(!V.pay[pm])V.pay[pm]=Object.fromEntries(L.filter(x=>x.mon===pm).map(x=>[x.name,x]));V.busy["p"+mon]=0;re()}
const prevMon=m=>{const [y,mm]=m.split("-").map(Number),d=new Date(y,mm-2,15);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
const mName=m=>new Date(m+"-15").toLocaleDateString("sk-SK",{month:"long",year:"numeric"});
function bonusOf(sc){const T=(V.cfg&&V.cfg.drv&&V.cfg.drv.bonus)||[[98,150],[95,120],[90,80],[85,50],[80,25]];if(sc==null)return 0;for(const [s,b] of T)if(+sc>=s)return b;return 0}
// cieľ z jázd: Región podľa Mzdy vodičov (80 € v kraji, 90 € mimo), EU 105 €/deň
function targets(){const out={};const P=STATE.pay;if(!P||!P.rides||typeof payRows!=="function")return out;const F=STATE.fleet;const FM=typeof flMap==="function"?flMap(F):{};
  const C=Object.assign({base:1031,inReg:80,outReg:90,minKm:10,euDay:105},(F&&F.cfg&&F.cfg.pay)||{});
  const grp={region:[],eu:[]};for(const r of P.rides){const g=FM[r.vehicle_id]||"region";if(g==="eu")grp.eu.push(r);else if(g==="region")grp.region.push(r)}
  const add=(rows,eu)=>{for(const r of rows){const k=key(r.n),o=out[k]=out[k]||{n:r.n,de:0,dr:0,sum:0};if(eu){o.de+=r.W.length}else o.dr+=r.W.length;o.sum+=r.sum}};
  add(payRows(grp.region,C),false);add(payRows(grp.eu,Object.assign({},C,{inReg:+C.euDay||105,outReg:+C.euDay||105})),true);return out}
function calc(d,p,t,carry){const cfg=(V.cfg&&V.cfg.drv)||{eu:105,reg:80};const manual=p&&(p.de!=null||p.dr!=null);
  const de=manual?(+p.de||0):(t?t.de:0),dr=manual?(+p.dr||0):(t?t.dr:0),target=manual?de*cfg.eu+dr*cfg.reg:(t?t.sum:0);
  const net=p&&p.net!=null?+p.net:null,mind=p&&p.mind!=null?+p.mind:0,zr=p&&p.zr!=null?+p.zr:0,vr=p&&p.vr!=null?+p.vr:0;
  const diet=net==null?null:Math.max(mind,target-net),avail=diet==null?0:Math.max(0,diet-mind),due=zr+(carry||0),pulled=Math.min(due,avail),next=due-pulled;
  return {de,dr,target,net,mind,zr,vr,diet,pulled,next,carry:carry||0,pay:net==null?null:net+diet-pulled+vr,bonus:bonusOf(p&&p.score),score:p&&p.score,manual}}
function carryOf(name,mon){const p=(V.pay[prevMon(mon)]||{})[name];return p&&p.nx!=null?Math.max(0,+p.nx):0}
window.vValkoPay=function(F){if(!OWN())return "";if(!V.cfg){loadBase();return `<h2>💶 Výplaty na účet · VALKO-HUB</h2><div class="card"><div class="s">Načítavam…</div></div>`}
  if(V.err&&!V.drv.length)return `<h2>💶 Výplaty na účet · VALKO-HUB</h2><div class="card"><div class="s">Údaje sa pripravujú v databáze (${E(V.err)}). Skús o pár minút.</div></div>`;
  const mon=typeof PMON!=="undefined"?PMON:new Date().toISOString().slice(0,7);if(!V.pay[mon]){loadPay(mon);return `<h2>💶 Výplaty na účet · VALKO-HUB · ${E(mName(mon))}</h2><div class="card"><div class="s">Načítavam…</div></div>`}
  const T=targets(),P=V.pay[mon],used=new Set();const cfg=V.cfg.drv||{};
  const rows=V.drv.map(d=>{const ks=[d.name,...(d.alias||[])].map(key);let t=null;for(const k of ks)if(T[k]){t=T[k];used.add(k);break}
    const p=P[d.name]||null;return {d,p,t,c:calc(d,p,t,carryOf(d.name,mon))}});
  const extra=Object.entries(T).filter(([k])=>!used.has(k)&&!/neznam/.test(k)).map(([k,t])=>t);
  const S=rows.reduce((a,r)=>{const c=r.c;a.t+=c.target;if(c.net!=null){a.n+=c.net;a.d+=c.diet;a.p+=c.pay;a.s+=c.pulled;a.v+=c.vr;a.k++}a.b+=c.bonus;a.nx+=c.next;return a},{t:0,n:0,d:0,p:0,s:0,v:0,b:0,nx:0,k:0});
  const inp=(nm,f,v,ph,lab)=>`<label><small>${lab}</small><input inputmode="decimal" data-vkp="${E(nm)}" data-f="${f}" value="${v==null?"":String(v).replace(".",",")}" placeholder="${ph}"></label>`;
  return `<h2>💶 Výplaty na účet · VALKO-HUB · ${E(mName(mon))}</h2><details class="card vklaw"><summary>⚖️ Zákon – diéty a vysielanie vodičov (prečítaj pred výplatou)</summary><div class="s">
 <p><b>Diéty (stravné)</b> sú náhrada za skutočné pracovné cesty podľa zákona č. 283/2002 Z. z. o cestovných náhradách (v zahraničí podľa sadzieb MF SR pre danú krajinu). Nie sú súčasťou mzdy: nesmú sa používať na „dorovnanie“ dohodnutej sumy. Výpočet „diéty = cieľ − čistá mzda“ je iba pomôcka; vyplatené diéty nesmú presiahnuť nárok podľa skutočných ciest (dátum, čas odchodu a príchodu, krajina). Rozdiel by bol mzdou – podlieha dani a odvodom (riziko dorubenia pri kontrole). Odporúčanie: časť nad nárokom vyplácať ako mzdu / prémiu cez MRP.</p>
 <p><b>Vysielanie vodičov (Mobility Package, smernica (EÚ) 2020/1057):</b> pri kabotáži a jazdách medzi dvoma cudzími krajinami (cross-trade) je vodič vyslaný – pred jazdou treba vyhlásenie v systéme IMI a za tieto dni aspoň minimálnu mzdu danej krajiny. Bilaterálne jazdy SK ↔ HU/AT a tranzit sú výnimka.</p>
 <p><b>Maďarsko:</b> preprava tovaru do / v HU – overiť povinnosť EKÁER (rizikové tovary); faktúry maďarskej firmy idú do NAV Online Számla (účtovníctvo).</p>
 <p>Toto je upozornenie, nie právne poradenstvo – sadzby a postup potvrdí účtovníčka / daňový poradca.</p></div></details>
  <div class="card vkp"><div class="s">Cieľ na účet = súčet denných sadzieb z jázd (EU ${N0(cfg.eu||105)} €/deň, Región ako Mzdy vodičov). <b>Diéty = MAX(minimum z Commandera; cieľ − skutočná čistá mzda z pásky)</b>. Nová zrážka sa stiahne len z diét nad minimum, zvyšok sa prenesie do ďalšieho mesiaca. Vrátenie výdavkov sa pripočíta. Bonus za skóre Valko-Hub je samostatná zdaniteľná položka mzdy (MRP).</div>
   <div class="vkps"><div><small>Cieľ spolu</small><b>${N0(S.t)} €</b></div><div><small>Čisté mzdy</small><b>${N0(S.n)} €</b></div><div><small>Diéty</small><b>${N0(S.d)} €</b></div><div><small>Na účty</small><b class="good">${N0(S.p)} €</b></div><div><small>Stiahnuté zrážky</small><b>${N0(S.s)} €</b></div><div><small>Prenos zrážok</small><b>${N0(S.nx)} €</b></div><div><small>Bonusy (MRP)</small><b>${N0(S.b)} €</b></div><div><small>Vyplnené pásky</small><b>${S.k} / ${rows.length}</b></div></div>
   <div class="vkpl">${rows.map(({d,p,t,c})=>{const pk=p&&p.pask;return `<details class="vkd${c.net==null?" miss":""}"><summary><b>${E(d.name)}</b><small>${d.os!=null?"os. č. "+E(d.os)+" · ":""}${c.de?c.de+" d EU":""}${c.de&&c.dr?" + ":""}${c.dr?c.dr+" d Región":""}${!c.de&&!c.dr?"bez jázd v mesiaci":""}${c.manual?" (ručne)":""} · cieľ ${N0(c.target)} €</small><span>${c.pay!=null?`na účet <b>${N0(c.pay)} €</b>`:`<i>zadaj čistú mzdu z pásky</i>`}${c.bonus?` · 🏆 ${N0(c.bonus)} €`:""}</span></summary>
     <div class="vkf">${inp(d.name,"net",p&&p.net,"napr. 809,33","Čistá mzda z pásky €")}${inp(d.name,"mind",p&&p.mind,"0","Min. diéty Commander €")}${inp(d.name,"zr",p&&p.zr,"0","Nová zrážka €")}${inp(d.name,"vr",p&&p.vr,"0","Vrátenie výdavkov €")}${inp(d.name,"score",p&&p.score,"napr. 96,1","Skóre Valko-Hub")}${inp(d.name,"de",p&&p.de,t?String(t.de):"auto","Dni EU (ručne)")}${inp(d.name,"dr",p&&p.dr,t?String(t.dr):"auto","Dni Región (ručne)")}</div>
     <div class="vkr"><span>Diéty pred zrážkou</span><b>${c.diet==null?"–":N2(c.diet)+" €"}</b><span>Zrážka (nová ${N2(c.zr)} + prenos ${N2(c.carry)})</span><b>− ${N2(c.pulled)} €</b><span>Prenos do ďalšieho mesiaca</span><b>${N2(c.next)} €</b><span>Vrátenie výdavkov</span><b>+ ${N2(c.vr)} €</b><span class="t">Vyplatiť na účet</span><b class="t">${c.pay==null?"–":N2(c.pay)+" €"}</b><span>Bonus Valko-Hub ${c.score!=null?"(skóre "+N2(c.score).replace(",00","")+")":""}</span><b>${N0(c.bonus)} € do mzdy</b></div>
     ${pk?`<div class="vkpk">📄 Páska ${E(p.mon||mon)}: hrubá ${N2(pk.gross)} € · čistá ${N2(pk.net)} € · cestovné ${N2(pk.cest)} € · osobný účet ${N2(pk.ucet)} € · ${E(pk.days)} dní${pk.pozn?" · "+E(pk.pozn):""}</div>`:""}</details>`}).join("")}</div>
   ${extra.length?`<div class="box w"><div>🚛 V jazdách sú aj vodiči, ktorí nie sú v zozname VALKO-HUB: ${extra.slice(0,12).map(x=>`<b>${E(x.n)}</b> (${x.de+x.dr} d)`).join(", ")}. Mená sa párujú bez diakritiky a poradia slov.</div></div>`:""}
   <div class="btns"><button type="button" data-vkcsv="${E(mon)}">⬇️ Export pre MRP (CSV)</button></div></div>`};
let svT={};
document.addEventListener("input",e=>{const i=e.target.closest&&e.target.closest("[data-vkp]");if(!i||!OWN())return;const nm=i.dataset.vkp,f=i.dataset.f,mon=PMON;const P=V.pay[mon]=V.pay[mon]||{};const p=P[nm]=P[nm]||{mon,name:nm};p[f]=num(i.value);
  clearTimeout(svT[nm]);svT[nm]=setTimeout(async()=>{const d=(V.drv||[]).find(x=>x.name===nm)||{name:nm,alias:[]},T=targets();let t=null;for(const k of [d.name,...(d.alias||[])].map(key))if(T[k]){t=T[k];break}const c=calc(d,p,t,carryOf(nm,mon));
    const row={mon,name:nm,net:p.net??null,mind:p.mind??null,zr:p.zr??null,vr:p.vr??null,score:p.score??null,de:p.de??null,dr:p.dr??null,nx:c.next||0,updated_at:new Date().toISOString()};
    const r=await sb.from("valko_pay").upsert(row,{onConflict:"mon,name"});if(r.error)say("Chyba uloženia: "+r.error.message,6000);else{if(typeof formBusy==="function"&&formBusy())return;re()}},900)});
document.addEventListener("focusout",e=>{if(e.target.closest&&e.target.closest("[data-vkp]"))setTimeout(re,950)});
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-vkcsv]");if(!b||!OWN())return;const mon=b.dataset.vkcsv,T=targets(),P=V.pay[mon]||{};
  const L=[["Rok","Mesiac","Osobné číslo","Meno","Položka","Hodnota","Jednotka"]];const [y,m]=mon.split("-");
  for(const d of V.drv){const ks=[d.name,...(d.alias||[])].map(key);let t=null;for(const k of ks)if(T[k]){t=T[k];break}const p=P[d.name];if(!p)continue;const c=calc(d,p,t,carryOf(d.name,mon));
    const add=(n,v,u)=>{if(v!=null&&+v)L.push([y,+m,d.os??"",d.name,n,(+v).toFixed(2).replace(".",","),u])};
    add("Čistá mzda (kontrola)",c.net,"€");add("Cestovné náhrady / diéty",c.diet!=null?c.diet-c.pulled:null,"€");add("Zrážka",c.pulled,"€");add("Vrátenie vodičovi",c.vr,"€");add("Výkonnostný bonus Valko-Hub",c.bonus,"€");add("Dni EU",c.de,"dni");add("Dni Región",c.dr,"dni")}
  const csv="﻿"+L.map(r=>r.map(x=>/[;"\n]/.test(String(x))?'"'+String(x).replace(/"/g,'""')+'"':x).join(";")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`MRP export vodici ${mon}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);say("📄 Export pre MRP stiahnutý.")});

// ---------- 🧑‍💼 KPI a bonusy tímu VALKO ----------
const ST=[["navrh","📝 Navrhnuté"],["kontrola","🔍 Skontrolované"],["ok","✅ Schválené"],["lock","🔒 Uzamknuté"]];
const kmonDef=()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
async function loadKpi(mon){if(V.kpi[mon]||V.busy["k"+mon])return;V.busy["k"+mon]=1;const [k,f]=await Promise.all([sb.from("valko_kpi").select("*").eq("mon",mon),sb.from("valko_fleet").select("*").eq("mon",mon)]);
  V.kpi[mon]=Object.fromEntries(((k&&k.data)||[]).map(r=>[r.person,r]));V.fleet[mon]=((f&&f.data)||[])[0]||{mon};V.busy["k"+mon]=0;re()}
function score(s,r){const K=(r&&r.k)||[];let tot=0,ws=0,fill=0;s.k.forEach(([n,w],i)=>{const v=K[i];if(v!=null&&v!==""){tot+=Math.min(100,Math.max(0,+v))*w;ws+=w;fill++}});
  const sc=fill===s.k.length?tot:null,B=(V.cfg&&V.cfg.drv&&V.cfg.drv.bands)||[[95,1],[85,.7],[75,.4]];let pct=0;if(sc!=null)for(const [lim,p] of B)if(sc>=lim){pct=p;break}
  if(r&&r.gate)pct=0;const bon=s.b*pct,cut=Math.min(bon,bon*Math.min(100,Math.max(0,+(r&&r.cut)||0))/100);return {sc,pct,bon,cut,fin:bon-cut,pay:s.g+bon-cut,fill}}
window.vValkoKpi=function(){if(!OWN())return "";if(!V.cfg){loadBase();return ""}const S=V.cfg.staff||[];if(!S.length)return "";
  const mon=V.kmon||kmonDef();if(!V.kpi[mon]){loadKpi(mon);return `<h2>📊 KPI a bonusy tímu VALKO</h2><div class="card"><div class="s">Načítavam…</div></div>`}
  const K=V.kpi[mon],Fl=V.fleet[mon]||{},fc=V.cfg.fleet||{cars:28};const months=[...Array(6)].map((_,i)=>{const d=new Date();d.setDate(15);d.setMonth(d.getMonth()-i);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")});
  const nd=Fl.nodrv,ut=Fl.util,cND=nd==null?"":nd<=2?"ok":nd<=4?"warn":"bad",cUT=ut==null?"":ut>=90?"ok":ut>=80?"warn":"bad";
  const sum=S.reduce((a,s)=>{const x=score(s,K[s.n]);a.g+=s.g;a.b+=x.fin;a.m+=s.b;return a},{g:0,b:0,m:0});
  return `<h2>📊 KPI a bonusy tímu VALKO</h2><div class="card vkk">
   <div class="pymon">${months.map(m=>`<button type="button" data-vkmon="${m}" aria-pressed="${m===mon}">${E(new Date(m+"-15").toLocaleDateString("sk-SK",{month:"short"}))}</button>`).join("")}</div>
   <div class="s">Bonus vzniká za výsledok, nie za kliky ani čas v aplikácii. Skóre = vážený súčet 5 KPI (0–100 %). Pásma: ≥ 95 → 100 % max. bonusu, 85–94,99 → 70 %, 75–84,99 → 40 %, pod 75 → 0. Kritický gate = bonus 0 do preskúmania. Fixná hrubá mzda sa nikdy nekráti – krátiť sa dá iba bonus a len so zdokumentovaným dôvodom.</div>
   <div class="vkfl"><b>🚛 Flotila ${E(mName(mon))} · ${N0(fc.cars||28)} ťahačov</b>
    <label><small>Autá bez vodiča (priemer)</small><input inputmode="decimal" data-vkfl="nodrv" value="${nd==null?"":String(nd).replace(".",",")}" placeholder="napr. 2"></label><span class="vkl ${cND}">${nd==null?"–":nd<=2?"🟢 0–2 v norme":nd<=4?"🟠 3–4 varovanie":"🔴 5+ kritické"}</span>
    <label><small>Využitie flotily %</small><input inputmode="decimal" data-vkfl="util" value="${ut==null?"":String(ut).replace(".",",")}" placeholder="napr. 90"></label><span class="vkl ${cUT}">${ut==null?"–":ut>=90?"🟢 ≥ 90 %":ut>=80?"🟠 80–89,9 %":"🔴 pod 80 %"}</span>
    ${nd!=null&&nd>2?`<small class="vkw">⚠️ ${E(fc.rule||"Pri viac ako 2 autách bez vodiča: povinný vlastník náboru + termín + aktívny inzerát.")}</small>`:""}</div>
   <div class="vkps"><div><small>Hrubé mzdy</small><b>${N0(sum.g)} €</b></div><div><small>Bonusy priznané</small><b class="good">${N0(sum.b)} €</b></div><div><small>Max. bonusy</small><b>${N0(sum.m)} €</b></div></div>
   ${S.map(s=>{const r=K[s.n]||{},x=score(s,r),st=r.status||"navrh",lk=st==="lock",si=ST.findIndex(q=>q[0]===st);
    return `<details class="vkd vkp2 st-${st}"${x.fill?"":" "}><summary><b>${E(s.n)}</b><small>${E(s.r)} · hrubá ${N0(s.g)} € · max. bonus ${N0(s.b)} € · schvaľuje ${E(s.ap)}</small><span>${x.sc==null?`<i>doplň ${s.k.length-x.fill} KPI</i>`:`skóre <b>${N2(x.sc)}</b> → ${Math.round(x.pct*100)} %`} · bonus <b>${N0(x.fin)} €</b> · ${E((ST[si]||ST[0])[1])}</span></summary>
     <div class="vkf">${s.k.map(([n,w],i)=>`<label><small>${E(n)} · ${Math.round(w*100)} %</small><input inputmode="decimal" data-vkk="${E(s.n)}" data-i="${i}" value="${(r.k||[])[i]==null?"":String(r.k[i]).replace(".",",")}" placeholder="0–100" ${lk?"disabled":""}></label>`).join("")}
      <label><small>Krátenie bonusu % (zdokumentované)</small><input inputmode="decimal" data-vkk="${E(s.n)}" data-i="cut" value="${r.cut?String(r.cut).replace(".",","):""}" placeholder="0" ${lk?"disabled":""}></label>
      <label class="vkg"><input type="checkbox" data-vkk="${E(s.n)}" data-i="gate" ${r.gate?"checked":""} ${lk?"disabled":""}><span>⛔ Kritický gate: ${E(s.gate)}</span></label></div>
     <div class="vkr"><span>Skóre</span><b>${x.sc==null?"–":N2(x.sc)}</b><span>Pásmo</span><b>${x.sc==null?"–":Math.round(x.pct*100)+" % z "+N0(s.b)+" €"}</b><span>Krátenie bonusu</span><b>− ${N0(x.cut)} €</b><span class="t">Hrubá výplata</span><b class="t">${N0(x.pay)} €</b></div>
     <div class="vkst">${ST.map(([k,l],i)=>`<i class="${i<=si?"on":""}">${l}</i>`).join("")}</div>
     <div class="btns">${si<3?`<button type="button" class="pri" data-vkst="${E(s.n)}" data-to="${ST[si+1][0]}">${E(ST[si+1][1])}</button>`:`<button type="button" data-vkst="${E(s.n)}" data-to="ok">🔓 Odomknúť (s dôvodom)</button>`}</div>
     ${(r.log||[]).length?`<details class="vklog"><summary>🧾 Audit log (${r.log.length})</summary>${r.log.slice().reverse().map(l=>`<div><small>${E(new Date(l.at).toLocaleString("sk-SK"))} · ${E(l.who||"")}</small> ${E(l.t||"")}</div>`).join("")}</details>`:""}</details>`}).join("")}</div>`};
const me=()=>{try{return (typeof ME!=="undefined"&&ME&&(ME.name||ME.email))||""}catch(x){return ""}};
let kT={};
document.addEventListener("input",e=>{const i=e.target.closest&&e.target.closest("[data-vkk],[data-vkfl]");if(!i||!OWN())return;const mon=V.kmon||kmonDef();
  if(i.dataset.vkfl){const F=V.fleet[mon]=V.fleet[mon]||{mon};F[i.dataset.vkfl]=num(i.value);clearTimeout(kT.f);kT.f=setTimeout(async()=>{const r=await sb.from("valko_fleet").upsert({mon,nodrv:F.nodrv??null,util:F.util??null,updated_at:new Date().toISOString()},{onConflict:"mon"});if(r.error)say("Chyba: "+r.error.message,6000);else re()},900);return}
  const nm=i.dataset.vkk,ix=i.dataset.i,K=V.kpi[mon]=V.kpi[mon]||{},r=K[nm]=K[nm]||{mon,person:nm,k:[],status:"navrh",log:[]};
  if(ix==="gate")r.gate=i.checked;else if(ix==="cut")r.cut=num(i.value)||0;else{r.k=(r.k||[]).slice();r.k[+ix]=num(i.value)}
  clearTimeout(kT[nm]);kT[nm]=setTimeout(async()=>{const q=await sb.from("valko_kpi").upsert({mon,person:nm,k:r.k||[],gate:!!r.gate,cut:r.cut||0,status:r.status||"navrh",log:r.log||[]},{onConflict:"mon,person"});if(q.error)say("Chyba: "+q.error.message,6000);else re()},800)});
document.addEventListener("change",e=>{const i=e.target.closest&&e.target.closest("[data-vkk][data-i=gate]");if(i)i.dispatchEvent(new Event("input",{bubbles:true}))});
document.addEventListener("click",async e=>{const m=e.target.closest&&e.target.closest("[data-vkmon]");if(m&&OWN()){V.kmon=m.dataset.vkmon;re();return}
  const b=e.target.closest&&e.target.closest("[data-vkst]");if(!b||!OWN())return;const mon=V.kmon||kmonDef(),nm=b.dataset.vkst,to=b.dataset.to,K=V.kpi[mon]=V.kpi[mon]||{},r=K[nm]=K[nm]||{mon,person:nm,k:[],status:"navrh",log:[]};
  const S=(V.cfg.staff||[]).find(s=>s.n===nm);const x=S?score(S,r):{};let why="";
  if(r.status==="lock"){why=prompt("Dôvod odomknutia (zapíše sa do audit logu):","");if(!why)return}
  if(to==="ok"&&r.cut>0&&r.status!=="lock"){why=prompt("Krátenie bonusu "+r.cut+" % – dôvod a dôkaz (povinné):",r.cut_why||"");if(!why)return}
  if(to==="lock"&&x.sc==null){say("Najprv doplň všetky KPI.");return}
  const from=r.status||"navrh",log=(r.log||[]).concat([{at:new Date().toISOString(),who:me(),t:`${(ST.find(q=>q[0]===from)||ST[0])[1]} → ${(ST.find(q=>q[0]===to)||ST[0])[1]}${x.sc!=null?` · skóre ${N2(x.sc)}, bonus ${N0(x.fin)} €`:""}${why?" · "+why:""}`}]);
  const q=await sb.from("valko_kpi").upsert({mon,person:nm,k:r.k||[],gate:!!r.gate,cut:r.cut||0,cut_why:why||r.cut_why||null,status:to,log},{onConflict:"mon,person"});
  if(q.error){say("Chyba: "+q.error.message,6000);return}r.status=to;r.log=log;say("Uložené: "+(ST.find(z=>z[0]===to)||[])[1]);re()});
{const s=document.createElement("style");s.textContent=`.vkps{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:10px 0}.vkps>div{display:grid;gap:2px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);text-align:center}.vkps small{opacity:.7;font-size:.72rem}.vkps b{font-size:1.05rem}
.vkpl{display:grid;gap:8px}.vkd{border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);padding:0 12px}.vkd.miss{border-color:rgba(251,191,36,.45)}
.vkd>summary{display:grid;gap:2px;padding:10px 0;cursor:pointer;list-style:none}.vkd>summary::-webkit-details-marker{display:none}.vkd>summary small{opacity:.75;font-size:.78rem}.vkd>summary span{font-size:.88rem}.vkd>summary i{color:#fbbf24;font-style:normal}
.vkf{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;padding:4px 0 10px}.vkf label{display:grid;gap:2px;min-width:0}.vkf small{opacity:.75;font-size:.72rem}.vkf input{width:100%;min-height:42px;box-sizing:border-box;font-size:16px}
.vkg{grid-column:1/-1;display:flex!important;align-items:center;gap:8px}.vkg input{width:22px!important;min-height:22px!important}
.vkr{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.1);font-size:.88rem}.vkr b{text-align:right}.vkr .t{font-size:1rem;font-weight:800}
.vkpk{font-size:.78rem;opacity:.8;padding:0 0 10px}.vkfl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end;padding:10px;border-radius:14px;background:rgba(255,255,255,.04);margin:8px 0}.vkfl>b{grid-column:1/-1}.vkfl label{display:grid;gap:2px}.vkfl small{opacity:.75;font-size:.72rem}.vkfl input{min-height:42px;font-size:16px}
.vkl{font-weight:800;align-self:center}.vkw{grid-column:1/-1;color:#fbbf24}.vkst{display:flex;flex-wrap:wrap;gap:4px;padding:6px 0}.vkst i{font-style:normal;font-size:.72rem;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.06);opacity:.6}.vkst i.on{opacity:1;background:rgba(34,197,94,.2)}
.vkd.st-lock{border-color:rgba(34,197,94,.5)}.vklog{font-size:.78rem;padding:4px 0 10px}.vklog>div{padding:3px 0;border-top:1px solid rgba(255,255,255,.06)}`;document.head.appendChild(s)}
})();
