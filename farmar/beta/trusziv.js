/* 7. 11. 2026 (príkaz majiteľa – Master AI Agent Prompt, body 4.3 a 5): Kurací trus
   🧪 Živiny a dávka na hektár (sušina, N, P2O5, K2O, limit 170 kg N/ha v zraniteľnej oblasti)
   🇭🇺→🇸🇰 Doklady a zákaz jazdy (TRACES / povolenie odoslania, EKÁER, kamionstop HU a SK) + odznak pri každom vývoze.
   Hodnoty živín sú orientačné (tabuľka ČR, vyhl. 274/1998 Sb. príl. 2 v znení 91/2007 Sb.) – presné čísla dá rozbor z laboratória.
   Zákazy jazdy: HU – Korm. rendelet 190/2008 (So 22:00 – Ne 22:00, júl–aug So 15:00, sviatky od 22:00 predchádzajúceho dňa,
   zimná výnimka 4. 11. – 1. 3. pre medzinárodnú dopravu Euro 3+); SK – zákon 131/2026 od 1. 9. 2026 (Ne a posledný deň pracovného pokoja 6–22,
   v lete prvý sviatok a sobota 9–19; diaľnice, rýchlostné a cesty I. triedy; > 7,5 t alebo > 3,5 t s prívesom). */
(function(){
const e=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=v=>{const x=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(x)?x:0};
const f=(v,d=1)=>Number(v||0).toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d});
// ---------- 🧪 živiny ----------
const PRE={ulez:["Hydinový trus uležaný",33,16.8,17.1,10.2],s50:["Suchý hydinový trus",50,19.2,24.3,14.9],s73:["Suchý hydinový trus",73,28.0,35.5,21.8],roz:["Vlastný rozbor z laboratória",null]};
const LS="ernte-ziv";let S={};try{S=JSON.parse(localStorage.getItem(LS)||"{}")||{}}catch(x){}
S=Object.assign({p:"ulez",ds:33,N:16.8,P:17.1,K:10.2,ha:50,ciel:170,zo:true},S);
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(S))}catch(x){}};
function calc(load){const N=num(S.N),lim=S.zo?170:Infinity,ciel=num(S.ciel)||0,tgt=Math.min(ciel,lim),dav=N>0?tgt/N:0,ha=num(S.ha),spolu=dav*ha,ld=num(load)||24;
  return {N,tgt,dav,P:dav*num(S.P),K:dav*num(S.K),spolu,kam:spolu>0?Math.ceil(spolu/ld):0,ld,cut:S.zo&&ciel>170}}
function out(load){const r=calc(load);
  return `<div class="zivg zivr"><div class="hl"><small>Dávka trusu</small><b>${r.N>0?f(r.dav,1)+" t/ha":"–"}</b></div><div><small>Dusík N</small><b>${f(r.tgt,0)} kg/ha</b></div><div><small>Fosfor P₂O₅</small><b>${f(r.P,0)} kg/ha</b></div><div><small>Draslík K₂O</small><b>${f(r.K,0)} kg/ha</b></div>
  <div><small>Spolu na ${f(num(S.ha),1)} ha</small><b>${f(r.spolu,0)} t</b></div><div><small>Kamióny po ${f(r.ld,0)} t</small><b>${r.kam}</b></div></div>
  ${r.cut?`<div class="s zivw">⚠️ V zraniteľnej oblasti najviac <b>170 kg N/ha za rok</b> z hospodárskych hnojív (priemer za podnik, rátajú sa aj ostatné hnojivá a pasenie) – dávka je obmedzená na 170.</div>`:""}
  ${r.P>120?`<div class="s zivw">ℹ️ Vysoký prísun fosforu (${f(r.P,0)} kg P₂O₅/ha) – pri dobrej zásobe P v pôde (AZP) zvážiť nižšiu dávku a doplniť dusík inak.</div>`:""}`}
window.trusZivHTML=function(D){const C=(D&&D.cfg)||{},load=C.load_t||24;
  const opt=Object.keys(PRE).map(k=>`<option value="${k}"${S.p===k?" selected":""}>${e(PRE[k][0])}${PRE[k][1]?` (${PRE[k][1]} % sušiny)`:""}</option>`).join("");
  return `<div class="card zivc" data-zivload="${e(load)}"><div class="t">🧪 Živiny a dávka na hektár</div>
  <div class="s">Koľko trusu dať na hektár, aby sa neprekročil dusík. Vyber typ trusu alebo zadaj rozbor z laboratória (kg živín na 1 t trusu).</div>
  <form class="f" data-ziv onsubmit="return false">
   <label class="w">Typ trusu<select name="p">${opt}</select></label>
   <label>Sušina %<input name="ds" inputmode="decimal" value="${e(S.ds)}"></label>
   <label>N kg/t<input name="N" inputmode="decimal" value="${e(S.N)}"></label>
   <label>P₂O₅ kg/t<input name="P" inputmode="decimal" value="${e(S.P)}"></label>
   <label>K₂O kg/t<input name="K" inputmode="decimal" value="${e(S.K)}"></label>
   <label>Plocha ha<input name="ha" inputmode="decimal" value="${e(S.ha)}"></label>
   <label>Chcem dusíka kg N/ha<input name="ciel" inputmode="decimal" value="${e(S.ciel)}"></label>
   <label class="w zivck"><input type="checkbox" name="zo"${S.zo?" checked":""}> Pole je v zraniteľnej oblasti (limit 170 kg N/ha za rok)</label>
  </form>
  <div data-zivout>${out(load)}</div>
  <details class="zivd"><summary>Ako sa to ráta a čo dodržať</summary><div class="s">
   Dávka (t/ha) = dusík, ktorý chceš dať (kg/ha) ÷ dusík v 1 t trusu (kg/t). V zraniteľnej oblasti spolu z hospodárskych hnojív najviac 170 kg N/ha za rok (priemer podniku).<br>
   Rozbor z laboratória: ak máš živiny v % sušiny, kg/t = % × sušina % ÷ 10 (napr. N 4 % pri 88 % sušiny = 35,2 kg/t).<br>
   Dodrž obdobie zákazu hnojenia a zapravenie do pôdy podľa stupňa obmedzenia pozemku (zákon 136/2000 Z. z., vyhl. 215/2016 Z. z.) a plán hnojenia. Orientačné hodnoty typov trusu: tabuľka ČR (vyhl. 274/1998 Sb.) – presné čísla dá rozbor.</div></details></div>`};
document.addEventListener("input",ev=>{const fm=ev.target&&ev.target.closest&&ev.target.closest("form[data-ziv]");if(!fm)return;
  const t=ev.target,n=t.name;if(n==="p"){const p=PRE[t.value];S.p=t.value;if(p&&p[1]!=null){S.ds=p[1];S.N=p[2];S.P=p[3];S.K=p[4];["ds","N","P","K"].forEach(k=>{const i=fm.querySelector(`[name="${k}"]`);if(i)i.value=S[k]})}}
  else if(n==="zo")S.zo=t.checked;else if(n)S[n]=t.value;
  if(["ds","N","P","K"].includes(n)&&S.p!=="roz"){S.p="roz";const sel=fm.querySelector('[name="p"]');if(sel)sel.value="roz"}
  save();const c=fm.closest(".zivc"),o=c&&c.querySelector("[data-zivout]");if(o)o.innerHTML=out(c.dataset.zivload)},true);
document.addEventListener("change",ev=>{if(ev.target&&ev.target.closest&&ev.target.closest("form[data-ziv]"))ev.target.dispatchEvent(new Event("input",{bubbles:true}))},true);
// ---------- 🇭🇺→🇸🇰 zákazy jazdy ----------
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),g=b%4,f_=Math.floor((b+8)/25),h0=Math.floor((b-f_+1)/3),h=(19*a+b-d-h0+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*g+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da)}
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const HC={},SC={};
function huHol(y){if(HC[y])return HC[y];const E=easter(y),s=new Set([`${y}-01-01`,`${y}-03-15`,`${y}-05-01`,`${y}-08-20`,`${y}-10-23`,`${y}-11-01`,`${y}-12-25`,`${y}-12-26`].concat([-2,0,1,49,50].map(n=>iso(add(E,n)))));return HC[y]=s}
// SK dni pracovného pokoja (zákon 241/1993): 1. 9. a 17. 11. nie sú (od 2024 / 2025), 8. 5. a 15. 9. nie sú iba v roku 2026
function skHol(y){if(SC[y])return SC[y];const E=easter(y),L=[`${y}-01-01`,`${y}-01-06`,`${y}-05-01`,`${y}-07-05`,`${y}-08-29`,`${y}-11-01`,`${y}-12-24`,`${y}-12-25`,`${y}-12-26`].concat([-2,1].map(n=>iso(add(E,n))));if(y!==2026)L.push(`${y}-05-08`,`${y}-09-15`);return SC[y]=new Set(L)}
const isHu=d=>huHol(d.getFullYear()).has(iso(d)),isSkRest=d=>d.getDay()===0||skHol(d.getFullYear()).has(iso(d));
// HU: vráti {ban, od, do, pozn}
window.ernteBanHU=function(dt,o){o=o||{};const d=new Date(dt),h=d.getHours()+d.getMinutes()/60,m=d.getMonth()+1,day=d.getDay(),tom=add(d,1),yes=add(d,-1);
  const md=(d.getMonth()+1)*100+d.getDate(),winter=md>=1104||md<=301;
  let ban=null;
  if(day===6&&h>=((m===7||m===8)?15:22))ban="sobota "+((m===7||m===8)?"od 15:00 (júl–august)":"od 22:00")+" do nedele 22:00";
  else if(day===0&&h<22)ban="nedeľa do 22:00";
  else if(isHu(d)&&h<22)ban="maďarský sviatok do 22:00";
  else if(isHu(tom)&&h>=22)ban="deň pred maďarským sviatkom od 22:00";
  if(!ban)return {ban:false};
  if(winter&&o.intl!==false&&(o.euro==null||o.euro>=3))return {ban:false,exempt:"zimná výnimka 4. 11. – 1. 3. pre medzinárodnú dopravu Euro 3+ (doklad o Euro triede a prepravné doklady vo vozidle)",would:ban};
  return {ban:true,why:ban}};
// SK (od 1. 9. 2026): diaľnice, rýchlostné cesty, cesty I. triedy
window.ernteBanSK=function(dt){const d=new Date(dt),h=d.getHours()+d.getMinutes()/60,m=d.getMonth()+1,summer=m===7||m===8,prev=add(d,-1),next=add(d,1);
  const rest=isSkRest(d),hol=skHol(d.getFullYear()).has(iso(d));
  if(rest&&(d.getDay()===0||!isSkRest(next))&&h>=6&&h<22)return {ban:true,why:(d.getDay()===0?"nedeľa":"posledný deň pracovného pokoja")+" 6:00–22:00"};
  if(summer&&h>=9&&h<19&&!isSkRest(prev)&&(d.getDay()===6||hol))return {ban:true,why:"letná "+(d.getDay()===6?"sobota":"prvý sviatok")+" 9:00–19:00"};
  return {ban:false}};
function dtOf(day,time){if(!day)return null;const t=String(time||"").match(/(\d{1,2})[:.](\d{2})/);return new Date(day+"T"+(t?t[1].padStart(2,"0")+":"+t[2]:"07:00")+":00")}
// odznak pri vývoze (nakládka v HU, cesta do SK – v ten istý deň)
window.trusBanBadge=function(o){const dt=dtOf(o.day,o.time);if(!dt||isNaN(dt))return "";const H=ernteBanHU(dt,{intl:true}),K=ernteBanSK(dt),L=[];
  if(H.ban)L.push(`⛔ HU zákaz jazdy: ${e(H.why)}`);else if(H.exempt)L.push(`✅ HU: ${e(H.would)} – platí ${e(H.exempt)}`);
  if(K.ban)L.push(`⛔ SK zákaz na D/R/I. triede: ${e(K.why)} – výnimka pre poľnohospodárske produkty (overiť, či sa vzťahuje na trus)`);
  return L.length?`<div class="s trban${H.ban||K.ban?" wn":""}">${L.join("<br>")}</div>`:""};
// ---------- 🇭🇺→🇸🇰 doklady ----------
window.trusHuSkHTML=function(D){const O=((D&&D.orders)||[]).filter(o=>["nahlasene","schvalene","na_ceste"].includes(o.status)).sort((a,b)=>String(a.day).localeCompare(String(b.day)));
  const now=new Date(),wk=[];for(let i=0;i<14;i++){const d=add(now,i);d.setHours(10,0,0,0);const s=new Date(d);s.setHours(16);const H1=ernteBanHU(s,{intl:true}),H2=ernteBanHU(d,{intl:false}),K=ernteBanSK(d);if(H2.ban||K.ban||H1.ban)wk.push({d,H1,H2,K})}
  const dd=d=>d.toLocaleDateString("sk-SK",{weekday:"short",day:"numeric",month:"numeric"});
  return `<div class="card"><div class="t">🇭🇺 → 🇸🇰 Doklady pri kuracom truse</div>
  <div class="s">Surový hydinový trus je vedľajší živočíšny produkt kategórie 2. Pri preprave z Maďarska na Slovensko platí:</div>
  <ol class="hulist">
   <li><b>Povolenie odoslania</b> – raz vopred ho na žiadosť vydá slovenská veterinárna správa (ŠVPS SR) pre farmu / prevádzku určenia (čl. 48 ods. 1 nariadenia (ES) 1069/2009, žiadosť v TRACES).</li>
   <li><b>Obchodný doklad v TRACES (DOCOM)</b> ku každej zásielke, naviazaný na povolenie; pri surovom hydinovom truse s <b>veterinárnym potvrdením</b>, že pochádza z oblasti bez obmedzení pre pseudomor hydiny a vtáčiu chrípku (príl. XI kap. I nariadenia (EÚ) 142/2011).</li>
   <li>Maďarský úrad (NÉBIH) oznámi každú zásielku cez TRACES, slovenský úrad potvrdí príchod do 15 pracovných dní.</li>
   <li>Spracovaný trus (hygienizovaný aspoň 70 °C / 60 min, napr. granulované hnojivo) má iný režim – nie je surový trus.</li>
   <li><b>EKÁER</b>: kurací trus (colná položka 3101) nie je v zozname rizikových tovarov NAV – EKÁER číslo netreba. Pri obilí a olejninách do Maďarska (pšenica, raž, jačmeň, kukurica, repka, slnečnica) ho NAV vyžaduje – ohlasuje príjemca v HU, číslo platí 15 dní.</li>
   <li><b>Tranzitné trasy HU</b> (od 1. 1. 2026, nad 20 t): povinné iba pre kamióny bez nakládky/vykládky v Maďarsku – vývozy trusu nakladajú v HU, takže sa ich to netýka.</li>
  </ol></div>
  <div class="card"><div class="t">⛔ Zákaz jazdy – najbližších 14 dní</div>
  <div class="s">Kamióny nad 7,5 t. HU: so 22:00 – ne 22:00 (júl–august od so 15:00), sviatky od 22:00 predchádzajúceho dňa; od 4. 11. do 1. 3. výnimka pre medzinárodnú dopravu Euro 3+. SK (od 1. 9. 2026): diaľnice, rýchlostné a cesty I. triedy – nedeľa a posledný deň pracovného pokoja 6:00–22:00, v lete aj sobota a prvý sviatok 9:00–19:00; výnimka pre poľnohospodárske produkty.</div>
  ${wk.length?`<div class="hulist2">${wk.map(x=>`<div><b>${e(dd(x.d))}</b> · ${x.H2.ban?`HU domáca doprava ⛔ ${e(x.H2.why)}`:""}${x.H1.exempt?` · HU medzinárodná ✅ zimná výnimka`:x.H1.ban?` · HU medzinárodná ⛔`:""}${x.K.ban?` · SK ⛔ ${e(x.K.why)}`:""}</div>`).join("")}</div>`:`<div class="s">✅ Žiadny zákaz v najbližších 14 dňoch.</div>`}
  ${O.length?`<div class="t" style="margin-top:10px">🚛 Otvorené vývozy</div>${O.map(o=>`<div class="s"><b>${e(o.no)}</b> · ${e(o.site)} · ${e(o.day)}${o.time?" "+e(o.time):""}${trusBanBadge(o)||" · ✅ bez zákazu"}</div>`).join("")}`:""}
  <div class="s">Mimoriadne zmeny (napr. pri horúčavách) vyhlasuje ministerstvo – pred cestou cez sviatky over na utinform.hu. Euro trieda áut VALKO nie je v aplikácii – výnimka platí len pre Euro 3 a vyššie.</div></div>`};
const st=document.createElement("style");st.textContent=`.zivc form.f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.zivc form.f .w{grid-column:1/-1}
.zivck{display:flex!important;align-items:center;gap:8px;flex-direction:row!important}.zivck input{width:22px;height:22px;flex:none}
.zivg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.zivg>div{border:1px solid rgba(34,211,238,.35);border-radius:14px;padding:9px 8px;text-align:center;min-width:0}.zivg small{display:block;color:#94A3B8;font-size:.78rem}.zivg b{font-size:1.12rem;overflow-wrap:anywhere}.zivg .hl{border-color:#b6ff3b;box-shadow:0 0 0 1px rgba(182,255,59,.35) inset}.zivg .hl b{color:#b6ff3b}
.zivr{margin-top:10px}.zivw{margin-top:6px}.zivd{margin-top:8px}.zivd summary{cursor:pointer;font-weight:700}
.hulist{margin:6px 0 0 18px;padding:0;display:grid;gap:6px}.hulist li{line-height:1.4}.hulist2{display:grid;gap:4px;margin-top:6px}
.trban{margin-top:4px}.trban.wn{color:#ffcf5a}`;document.head.appendChild(st);
})();
