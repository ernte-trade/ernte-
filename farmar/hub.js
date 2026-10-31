// ===== ERNTE · PREHĽAD (veliteľské centrum) + CIEĽOVÉ CENY FARMÁROV =====
// Jedna obrazovka, kde sa stretne obchod, vývoz, riziko, flotila, legislatíva a farmári.
(function(){
const H={risk:undefined,mob:undefined,co2:undefined,tg:undefined,busy:false,at:0};
const DAY=864e5,todayD=()=>new Date(today()+"T00:00:00");
// termíny a povinnosti (overené k 26. 10. 2026)
const DUE=[
 ["2026-12-30","🌱","EUDR – sója: due diligence pri vývoze / prvom uvedení na trh (veľké a stredné firmy)","ERNTE · Nariadenie (EÚ) 2025/2650"],
 ["2027-01-01","🧾","Povinná e-faktúra B2B na Slovensku (Peppol) – ERNTE aj VALKO","§76a zákona 222/2004 Z. z."],
 ["2027-01-01","🛣️","Nový štátny mýtny systém SK – výmena palubných jednotiek","VALKO"],
 ["2027-06-30","🌱","EUDR pre mikro a malé podniky","Nariadenie (EÚ) 2025/2650"],
 ["2027-07-09","📲","eFTI – úrady musia prijímať elektronické prepravné doklady (eCMR)","Nariadenie (EÚ) 2020/1056"]];
window.ERNTE_DUE=DUE;
const MOB=[42,56]; // dni: upozornenie / porušenie (8 týždňov)
async function load(){if(H.busy)return;H.busy=true;const q=[];
  if(ROLE==="owner")q.push(sb.rpc("risk_position").then(r=>{H.risk=r.error?{err:r.error.message}:r.data}));
  if(can("fleet"))q.push(sb.rpc("fleet_mobility").then(r=>{H.mob=r.error?{err:r.error.message}:r.data||[]}),sb.rpc("fleet_co2").then(r=>{H.co2=r.error?null:r.data}));
  if(canAny("price_view","deals"))q.push(sb.from("price_targets").select("*").order("created_at",{ascending:false}).limit(300).then(r=>{H.tg=r.error?{err:r.error.message}:r.data||[]}));
  if(canAny("deals_qty","deals","remain")&&!window.OPSDATA)q.push(sb.rpc("ops_deals").then(r=>{window.OPSDATA=r.error?[]:r.data||[]}));
  await Promise.all(q.map(p=>p.catch(()=>{})));H.busy=false;H.at=Date.now();if(TAB==="home")renderStaff()}
window.hubReload=()=>{H.at=0;window.OPSDATA=null;load()};
const tile=(ic,lab,val,sub,cls,go)=>`<button type="button" class="hbt ${cls||""}"${go?` data-hgo="${go}"`:""}><span class="hbi">${ic}</span><span class="hbl">${lab}</span><b class="hbv">${val}</b>${sub?`<small>${sub}</small>`:""}</button>`;
window.vHome=function(){if(!H.at&&!H.busy)setTimeout(load,0);
  if(window.owHomeOn&&window.owHome&&owHomeOn())return owHome();
  const R=STATE.reqs||[],nNew=R.filter(r=>r.status==="nova").length,auto=R.filter(r=>r.status==="nova"&&/^🎯 Automaticky/.test(r.note||"")).length;
  const T=(STATE.trips||[]).filter(t=>t.day===today()&&t.status!=="zrusena"),O=window.OPSDATA||[],left=O.filter(d=>["podpisany","odvoz"].includes(d.status)).reduce((s,d)=>s+(+d.left_t||0),0);
  const TG=Array.isArray(H.tg)?H.tg:[],tgA=TG.filter(t=>t.active),tgH=TG.filter(t=>t.hit_at&&Date.now()-new Date(t.hit_at)<7*DAY);
  let h=`<div class="hub"><div class="hubh"><div><small>${esc(new Date().toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"long"}))}</small><h2 class="hubt">Prehľad ERNTE · VALKO</h2></div><button type="button" class="hubr" data-hubre="1" aria-label="Obnoviť prehľad">↻</button></div>`;
  // ---- ALARMY NAVRCHU ----
  const AL=[];
  if(nNew)AL.push(["w","📥",`${nNew} ${nNew===1?"nová požiadavka":"nové požiadavky"} od farmárov${auto?` · ${auto}× 🎯 cieľová cena dosiahnutá`:""}`,can("req")?"req":"trans"]);
  if(Array.isArray(H.mob)){const bad=H.mob.filter(v=>v.active&&v.days!=null&&v.days>=MOB[1]),warn=H.mob.filter(v=>v.active&&v.days!=null&&v.days>=MOB[0]&&v.days<MOB[1]);
    if(bad.length)AL.push(["r","🚛",`Balík mobility: ${bad.length} ${bad.length===1?"auto":"áut"} nebolo na dvore 8+ týždňov (${bad.slice(0,3).map(v=>esc(v.plate)).join(", ")})`,"mob"]);
    else if(warn.length)AL.push(["w","🚛",`Balík mobility: ${warn.length} ${warn.length===1?"auto":"áut"} sa musí do ${MOB[1]-Math.max(...warn.map(v=>v.days))} dní vrátiť na dvor`,"mob"])}
  if(ROLE==="owner"){const DD=DUE.map(d=>[d,Math.round((new Date(d[0]+"T00:00:00")-todayD())/DAY)]).filter(x=>x[1]>=0&&x[1]<=90);for(const [d,dd] of DD.filter(x=>x[1]<=30))AL.push(["r",d[1],`O ${dd} dní: ${esc(d[2])}`,"due"]);const later=DD.filter(x=>x[1]>30);if(later.length)AL.push(["w","📅",`${later.length} zákonné ${later.length===1?"termín":"termíny"} do 90 dní – najbližší o ${later[0][1]} dní (${esc(later[0][0][2].split(" – ")[0])})`,"due"])}
  const valid=((STATE.settings||{}).pricelist||{}).valid;if(canAny("price_edit","price_view")&&valid){const dd=Math.round((new Date(valid+"T00:00:00")-todayD())/DAY);if(dd<0)AL.push(["r","💶","Cenník pre farmárov vypršal – farmári nemôžu predávať","price"]);else if(dd<=2)AL.push(["w","💶",`Cenník platí ešte ${dd} ${dd===1?"deň":"dni"} – predĺž platnosť`,"price"])}
  if(AL.length)h+=`<div class="hal">${AL.map(a=>`<button type="button" class="hali ${a[0]}" data-hgo="${a[3]}"><span>${a[1]}</span><b>${a[2]}</b><i>›</i></button>`).join("")}</div>`;
  else h+=`<div class="hal"><div class="hali ok"><span>✅</span><b>Všetko v poriadku – žiadne upozornenia</b></div></div>`;
  // ---- DLAŽDICE ----
  const tl=[];
  if(can("req"))tl.push(tile("📥","Nové požiadavky",String(nNew),auto?`🎯 ${auto} automaticky`:"od farmárov",nNew?"w":"","req"));
  if(canAny("deals_qty","deals","remain"))tl.push(tile("🚚","Zostáva vyviezť",fmt(left,0)+" t",`${O.filter(d=>+d.left_t>0).length} obchodov`,"","deals"));
  if(canAny("trans","assign"))tl.push(tile("🗓️","Jazdy dnes",String(T.length),T.length?T.slice(0,2).map(t=>esc(t.spz||"")).join(", "):"nič naplánované","","trans"));
  if(canAny("price_view","deals"))tl.push(tile("🎯","Cieľové ceny farmárov",String(tgA.length),tgH.length?`${tgH.length} dosiahnutých za 7 dní`:"čakajú na vašu cenu","",""+"tg"));
  if(can("fleet")&&H.co2)tl.push(tile("🌍","CO₂ flotily · mesiac",fmt(H.co2.co2_t_wtw,1)+" t",`${fmt(H.co2.g_km,0)} g/km · ${fmt(H.co2.km,0)} km`,"","co2"));
  if(tl.length)h+=`<div class="hbg">${tl.join("")}</div>`;
  if(ROLE==="owner")h+=riskHTML();
  if(canAny("price_view","deals"))h+=tgHTML(TG);
  if(can("fleet"))h+=mobHTML();
  if(ROLE==="owner")h+=dueHTML();
  return h+`</div>`};
// ---- POZÍCIA A RIZIKO ----
function riskHTML(){const R=H.risk;let h=`<details class="card hsec" id="hs-risk" open><summary><span>📊</span><b>Pozícia a riziko</b><small>nákupné vs. predajné zmluvy · vážne lístky · ocenenie voči burze · iba ty</small></summary>`;
  if(R===undefined)return h+`<div class="s">Načítavam…</div></details>`;if(!R||typeof R!=="object")return h+`<div class="s">Zapne sa po aktualizácii databázy (pár minút).</div></details>`;if(R.err)return h+`<div class="s">${/risk_position/.test(R.err)?"Zapne sa po aktualizácii databázy (pár minút).":esc(R.err)}</div></details>`;
  const M=R.market||{},rows=R.rows||[];if(!rows.length)return h+`<div class="s">Žiadne otvorené obchody.</div></details>`;
  const T={bt:0,st:0,pos:0,real:0,lock:0,mtm:0,tk:0};
  const tr=rows.map(x=>{const sym=MKB[x.com],bz=sym&&M[sym]?+M[sym].eur_t:null,pos=x.pos_t!=null?+x.pos_t:(+x.unsold_t||0),mtm=bz!=null&&x.avg_buy!=null&&pos>0?(bz-x.avg_buy)*pos:null;
    T.bt+=+x.tons||0;T.st+=+x.sold_t||0;T.pos+=pos;T.real+=+x.margin_real||0;T.lock+=+x.margin_locked||0;T.tk+=+x.tickets_t||0;if(mtm!=null)T.mtm+=mtm;
    return `<tr><td><b>${esc(comName(x.com))}</b><small>${x.n||0} zmlúv</small></td><td>${fmt(x.tons,0)} t<small>Ø ${x.avg_buy!=null?fmt(x.avg_buy):"–"} €</small></td><td>${x.sold_t?fmt(x.sold_t,0)+" t":"–"}<small>${x.avg_sell?"Ø "+fmt(x.avg_sell)+" €":""}</small></td><td class="${pos>0?"wn":pos<0?"ng":""}">${pos>0?"+":""}${fmt(pos,0)} t<small>${pos>0?"nepredané":pos<0?"predané naviac":"kryté"}</small></td><td>${fmt(x.tickets_t||0,0)} t<small>${x.tk_buy?fmt(x.tk_buy)+" → "+fmt(x.tk_sell):""}</small></td><td class="${(+x.margin_real||0)>=0?"ps":"ng"}">${x.margin_real!=null?fmt(x.margin_real,0)+" €":"–"}<small>${x.tickets_t>0&&x.margin_real!=null?fmt(x.margin_real/x.tickets_t,2)+" €/t":""}</small></td><td>${bz!=null?fmt(bz,2)+" €":"–"}</td><td class="${mtm==null?"":mtm>=0?"ps":"ng"}">${mtm!=null?(mtm>=0?"+":"")+fmt(mtm,0)+" €":"–"}</td></tr>`}).join("");
  const imp=R.import;
  h+=`<div class="hrk"><div class="ps"><small>Realizovaná marža (vážne lístky)</small><b>${fmt(T.real,0)} €</b></div><div class="${T.pos>0?"wn":T.pos<0?"ng":""}"><small>Otvorená pozícia (nákup − predaj)</small><b>${T.pos>0?"+":""}${fmt(T.pos,0)} t</b></div><div class="ps"><small>Zamknutá marža zo zmlúv</small><b>${fmt(T.lock,0)} €</b></div><div class="wn"><small>Ak burza klesne o 10 €/t</small><b>−${fmt(Math.max(0,rows.reduce((s,x)=>s+Math.max(0,+x.pos_t||0),0))*10,0)} €</b></div></div>
   <div class="hrt"><table><thead><tr><th>Plodina</th><th>Nakúpené</th><th>Predané</th><th>Pozícia</th><th>Dodané (lístky)</th><th>Marža</th><th>Burza</th><th>Pozícia vs. burza</th></tr></thead><tbody>${tr}</tbody></table></div>
   <div class="s">Nakúpené = nákupné zmluvy s farmármi · Predané = predajné zmluvy (Agro-Somotor) · Pozícia + = nakúpené, ešte nepredané (riziko poklesu ceny), − = predané viac, než je nakúpené (treba dokúpiť) · Marža = (predaj − nákup) × čistá váha z vážnych lístkov, bez dopravy a réžie.${imp?` · Excel nahraný ${esc(new Date(imp.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}))} (${imp.listky} lístkov, ${imp.zmluvy} zmlúv)`:""}</div></details>`;
  return h}
// ---- CIEĽOVÉ CENY ----
function tgHTML(TG){if(!Array.isArray(TG))return "";const A=TG.filter(t=>t.active).sort((a,b)=>{const fa=fpOf(a.com),fb=fpOf(b.com);return (a.target-(fa||0))-(b.target-(fb||0))});
  return `<details class="card hsec" id="hs-tg"${A.length?"":""}><summary><span>🎯</span><b>Cieľové ceny farmárov (${A.length})</b><small>čo chcú farmári za svoju úrodu · pri dosiahnutí vznikne požiadavka sama</small></summary>
   ${A.length?`<div class="htg">${A.slice(0,40).map(t=>{const fp=fpOf(t.com),gap=fp!=null?t.target-fp:null;return `<div class="htgi"><b>${esc(fName(t.farmer_id))}</b><span>${esc(comName(t.com))}${t.tons?" · "+fmt(t.tons,0)+" t":""}</span><span>chce <b class="num">${fmt(t.target)} €/t</b></span><span class="${gap!=null&&gap<=5?"ps":""}">${gap==null?"–":gap<=0?"dosiahnuté":"chýba "+fmt(gap)+" €/t"}</span></div>`}).join("")}</div>
     <div class="s">Súčet ton, ktoré farmári predajú, ak zdvihneš cenu: ${tgSum(A)}</div>`:`<div class="s">Zatiaľ žiadny farmár nenastavil cieľovú cenu. Farmár ju nastaví v aplikácii pri cenníku.</div>`}</details>`}
function fpOf(com){const p=(STATE.prices||[]).find(x=>x.com===com);if(!p||p.price==null)return null;const d=window.farmDisc?farmDisc(com):5;return Math.round(p.price*(1-d/100)*100)/100}
function tgSum(A){const by={};for(const t of A){const fp=fpOf(t.com);if(fp==null)continue;const k=t.com;(by[k]=by[k]||[]).push({gap:t.target-fp,t:+t.tons||0})}
  return Object.entries(by).map(([k,L])=>{const s5=L.filter(x=>x.gap<=5).reduce((s,x)=>s+x.t,0),s10=L.filter(x=>x.gap<=10).reduce((s,x)=>s+x.t,0);return `<b>${esc(comName(k))}</b> +5 €: ${fmt(s5,0)} t, +10 €: ${fmt(s10,0)} t`}).join(" · ")||"–"}
// ---- BALÍK MOBILITY ----
function mobHTML(){const M=H.mob;let h=`<details class="card hsec" id="hs-mob"><summary><span>🚛</span><b>Balík mobility · návrat áut na dvor</b><small>každé auto aspoň raz za 8 týždňov na prevádzke (Michalovce)</small></summary>`;
  if(M===undefined)return h+`<div class="s">Načítavam…</div></details>`;if(M.err||!Array.isArray(M))return h+`<div class="s">Zapne sa po aktualizácii databázy (pár minút).</div></details>`;
  const L=M.filter(v=>v.active).sort((a,b)=>(b.days??999)-(a.days??999));
  return h+`<div class="hmob">${L.map(v=>{const d=v.days,c=d==null?"g":d>=MOB[1]?"r":d>=MOB[0]?"w":"ok";return `<div class="hmi ${c}"><b class="klp">${esc(v.plate)}</b><span>${d==null?"na dvore nebolo od 1. 7.":d===0?"dnes na dvore":"pred "+d+" d"}</span><i style="--p:${Math.min(100,(d??60)/56*100)}%"></i></div>`}).join("")||`<div class="s">Žiadne aktívne autá.</div>`}</div>
   <div class="s">Zelená do 6 týždňov · oranžová 6–8 týždňov · červená nad 8 týždňov = riziko pokuty pri kontrole (smart tachograf v2 zaznamenáva hranice). Počíta sa z príjazdov na dvor podľa Commandera.</div></details>`}
// ---- TERMÍNY ----
function dueHTML(){return `<details class="card hsec" id="hs-due"><summary><span>📅</span><b>Termíny a povinnosti</b><small>legislatíva, ktorá sa týka ERNTE a VALKO</small></summary><div class="hdue">${DUE.map((d,i)=>{const dd=Math.round((new Date(d[0]+"T00:00:00")-todayD())/DAY);return `<div class="hdi ${dd<0?"g":dd<=30?"r":dd<=90?"w":""}"><b>${d[1]} ${esc(dSK(d[0]))}</b><span>${esc(d[2])}</span><small>${esc(d[3])} · ${dd<0?"platí":"o "+dd+" dní"}</small>${window.dueBtns?dueBtns(i):""}</div>`}).join("")}</div>
  <div class="s">ERNTE AI sleduje legislatívu priebežne – pri zmene termínu ti napíše.</div></details>`}
window.HUBX={H,load,riskHTML,tgHTML,dueHTML,DUE};
document.addEventListener("click",e=>{let x=e.target.closest("[data-hgo]");if(x){const g=x.dataset.hgo;if(["req","deals","trans","price"].includes(g)){TAB=g;renderStaff();scrollTo(0,0);return}
    const id={mob:"hs-mob",due:"hs-due",tg:"hs-tg",co2:"hs-mob"}[g];if(g==="co2"&&typeof fsecGo==="function"){TAB="fleet";fsecGo("dash");renderStaff();return}
    const el=id&&document.getElementById(id);if(el){el.open=true;el.scrollIntoView({behavior:"smooth",block:"start"})}return}
  if(e.target.closest("[data-hubre]")){hubReload();toast("Obnovujem prehľad…")}});

// ===== FARMÁR: CIEĽOVÁ CENA =====
let FT;function ftLoad(){FT=null;sb.from("price_targets").select("*").order("created_at",{ascending:false}).limit(50).then(r=>{FT=r.error?{err:1}:r.data||[];renderFarmer()})}
function farmTargetsHTML(){if(typeof FARMER==="undefined"||!FARMER||(window.fcan&&!fcan("f_sell")))return "";if(FT===undefined){ftLoad();return ""}if(FT===null||FT.err)return "";
  const P=(STATE.prices||[]).filter(p=>p.price!=null);if(!P.length)return "";const A=FT.filter(t=>t.active),D=FT.filter(t=>!t.active&&t.hit_at).slice(0,3);
  return `<h2>🎯 Moja cieľová cena</h2><div class="card ftc"><div class="s">Napíšte, za koľko chcete predať. Keď ERNTE zvýši cenu na vašu cieľovú, <b>automaticky vám pošleme ponuku na predaj</b> – nemusíte sledovať ceny.</div>
   ${A.map(t=>{const p=P.find(x=>x.com===t.com),gap=p?t.target-p.price:null;return `<div class="fti"><div><b>${esc(comName(t.com))}</b><span>chcem <b class="num">${fmt(t.target)} €/t</b>${t.tons?" · "+fmt(t.tons,0)+" t":""}</span><small>${gap==null?"":gap<=0?"✓ cena dosiahnutá":"teraz "+fmt(p.price)+" €/t · chýba "+fmt(gap)+" €/t"}</small></div><button type="button" class="dng" data-ftdel="${t.id}" aria-label="Zrušiť cieľ">✕</button></div>`}).join("")}
   ${D.map(t=>`<div class="fti ok"><div><b>✓ ${esc(comName(t.com))} – cieľ dosiahnutý</b><small>${esc(new Date(t.hit_at).toLocaleDateString("sk-SK"))} · ${fmt(t.hit_price)} €/t · ERNTE vás kontaktuje</small></div></div>`).join("")}
   <form class="f" id="fFt"><label>Komodita<select name="com">${P.map(p=>`<option value="${esc(p.com)}">${esc(comName(p.com))} (teraz ${fmt(p.price)} €/t)</option>`).join("")}</select></label>
    <label>Cieľová cena €/t<input name="target" inputmode="decimal" required placeholder="napr. ${fmt(Math.ceil((P[0].price+10)/5)*5,0)}"></label><label>Koľko ton (nepovinné)<input name="tons" inputmode="decimal" placeholder="napr. 100"></label>
    <div class="w btns"><button class="pri" type="submit">🎯 Nastaviť cieľovú cenu</button></div></form></div>`}
const _fn=window.farmNotesHTML;window.farmNotesHTML=function(){return farmTargetsHTML()+(_fn?_fn.apply(this,arguments):"")};
document.addEventListener("submit",async e=>{if(e.target.id!=="fFt")return;e.preventDefault();e.stopPropagation();const d=new FormData(e.target),t=num(d.get("target")),tn=d.get("tons")?num(d.get("tons")):null;
  if(!(t>0&&t<5000)){toast("Napíšte cenu v €/t.");return}if(tn!=null&&!(tn>0)){toast("Tony napíšte číslom.");return}const b=e.target.querySelector("button");busy(b,true);
  const r=await sb.from("price_targets").insert({farmer_id:FARMER.id,com:d.get("com"),target:t,tons:tn});busy(b,false);
  if(r.error){toast(/price_targets/.test(r.error.message)?"Funkcia sa zapína – skúste o pár minút.":"Nepodarilo sa: "+r.error.message,6000);return}ftLoad();toast("✓ Cieľová cena nastavená – ozveme sa, keď ju dosiahneme.",5000)},true);
document.addEventListener("click",async e=>{const x=e.target.closest("[data-ftdel]");if(!x)return;if(!confirm("Zrušiť túto cieľovú cenu?"))return;await sb.from("price_targets").delete().eq("id",+x.dataset.ftdel);ftLoad()});
// Prehľad ako úvodná záložka
const _ss=window.startStaff;window.startStaff=async function(){if(typeof TAB!=="undefined"&&TAB==="req")TAB="home";return _ss.apply(this,arguments)};
try{Object.assign(HELP,{home:{t:"Prehľad",i:"🏠",r:"Všetko dôležité na jednej obrazovke v dlaždiciach. Ťuknutím na dlaždicu prejdeš rovno do sekcie.",s:[
 ["Naše ceny · nákup a predaj (iba Martin a Jana)","Pre každú komoditu naša výkupná cena FCA, za koľko ju predáme (DAP odberateľa – lepší z Bunge a Agro-Somotor), doprava, marža na tonu a burza MATIF / CBOT."],
 ["Obchody a zisky ERNTE","Nové požiadavky, bežiace obchody, čo zostáva vyviezť, odvozy dnes; realizovaná a zamknutá marža, otvorená pozícia a riziko poklesu burzy."],
 ["Komodity · služby · evidencia","Burza, cenník, kalkulačka, Danube Trade, Agro služby, kurací trus, evidencia, farmári, kalendár a novinky – každá dlaždica otvorí svoju sekciu."],
 ["Alarmy navrchu","Nové požiadavky, dosiahnuté cieľové ceny farmárov, autá, ktoré musia ísť na dvor (Balík mobility), vypršaný cenník a blížiace sa zákonné termíny. Ťuknutím prejdeš priamo na vec."],
 ["Pozícia a riziko (iba majiteľ)","Koľko ton je nakúpených a ešte nepredaných, za koľko, zamknutá marža z predaných obchodov a koľko by si stratil, keby burza klesla o 10 €/t."],
 ["Cieľové ceny farmárov","Farmár si nastaví cenu, za ktorú chce predať. Vidíš, koľko ton by si získal, keby si cenu zdvihol o 5 alebo 10 €/t. Keď ju dosiahneš, požiadavka na predaj vznikne sama."],
 ["Balík mobility","Každé auto sa musí aspoň raz za 8 týždňov vrátiť na prevádzku. Aplikácia počíta dni od posledného príjazdu na dvor."],
 ["CO₂","Uhlíková stopa flotily za mesiac podľa skutočne spotrebovanej nafty (3,24 kg CO₂e/l, well-to-wheel) – argument pre Bunge a odberateľov."]]}})}catch(e){}

// ===== VÁŽNE LÍSTKY (z Excelu / váhy) =====
let DV=null,DVQ="",DVN=60;
function dvLoad(){DV=undefined;sb.rpc("deliveries_staff").then(r=>{DV=r.error?{err:r.error.message}:r.data||[];if(TAB==="deals")renderStaff()})}
function dvCard(){if(ROLE!=="owner")return "";if(DV===null)setTimeout(dvLoad,0);
  let h=`<details class="card hsec" id="hs-dv"${DVQ?" open":""}><summary><span>⚖️</span><b>Vážne lístky</b><small>🔒 iba ty · každá dodávka od farmára – čistá váha, nečistoty, ŠPZ, zmluva</small></summary>`;
  if(!Array.isArray(DV))return h+`<div class="s">${DV&&DV.err?"Zapne sa po aktualizácii databázy (pár minút).":"Načítavam…"}</div></details>`;
  const q=String(DVQ).toLowerCase(),L=DV.filter(d=>!q||[d.ticket,d.farmer_name,d.plate,d.deal_no,comName(d.com)].join(" ").toLowerCase().includes(q));
  const sum=L.reduce((s,d)=>s+(+d.net_kg||0),0)/1000;
  h+=`<div class="f"><label class="w">Hľadať (farmár, lístok, ŠPZ, zmluva)<input id="dvQ" value="${esc(DVQ)}" placeholder="napr. Hronec alebo MI680FU"></label></div>
   <div class="s"><b>${L.length}</b> lístkov · spolu <b>${fmt(sum,1)} t</b> čistej váhy</div>
   <div class="hrt"><table><thead><tr><th>Dátum</th><th>Farmár</th><th>Komodita</th><th>Čistá váha</th><th>Nečist.</th><th>ŠPZ</th><th>Zmluva</th>${can("deals")?"<th>Nákup €/t</th>":""}</tr></thead><tbody>${L.slice(0,DVN).map(d=>`<tr><td>${esc(dSK(d.day))}<small>${esc(d.ticket)}</small></td><td>${esc(d.farmer_name||"")}</td><td>${esc(comName(d.com))}</td><td>${fmt((+d.net_kg||0)/1000,3)} t</td><td>${d.impurity_pct!=null?fmt(d.impurity_pct,2)+" %":"–"}</td><td>${esc(d.plate||"")}</td><td class="${d.deal_no?"":"wn"}">${esc(d.deal_no||"bez zmluvy")}</td>${can("deals")?`<td>${d.buy_price!=null?fmt(d.buy_price):"<span class=wn>chýba</span>"}</td>`:""}</tr>`).join("")}</tbody></table></div>
   ${L.length>DVN?`<div class="btns"><button type="button" data-dvmore="1">Zobraziť ďalších ${Math.min(200,L.length-DVN)}</button></div>`:""}
   ${L.some(d=>!d.deal_no)?`<div class="s">⚠️ ${L.filter(d=>!d.deal_no).length} lístkov nemá nákupnú zmluvu – doplň zmluvu farmárovi v Exceli alebo tu v Obchodoch.</div>`:""}</details>`;
  return h}
const _vd2=window.vDeals;window.vDeals=function(){return _vd2.apply(this,arguments)+dvCard()};
document.addEventListener("input",e=>{if(e.target.id!=="dvQ")return;DVQ=e.target.value;DVN=60;clearTimeout(e.target._t);e.target._t=setTimeout(()=>{renderStaff();const i=document.getElementById("dvQ");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},350)});
document.addEventListener("click",e=>{if(e.target.closest("[data-dvmore]")){DVN+=200;renderStaff()}});
// farmár: moje dodávky (digitálne vážne lístky)
let FD;function fdLoad(){FD=null;sb.rpc("my_deliveries").then(r=>{FD=r.error?[]:r.data||[];renderFarmer()})}
function farmDelivHTML(){if(typeof FARMER==="undefined"||!FARMER||(window.fcan&&!fcan("f_deals")&&!fcan("f_remain")))return "";if(FD===undefined){fdLoad();return ""}if(!FD||!FD.length)return "";
  const by={};for(const d of FD){const k=d.com;by[k]=(by[k]||0)+(+d.net_kg||0)/1000}
  return `<h2>⚖️ Moje dodávky – vážne lístky</h2><div class="card fdc"><div class="ops-k">${Object.entries(by).slice(0,3).map(([k,t])=>`<div><small>${esc(comName(k))}</small><b>${fmt(t,1)} t</b></div>`).join("")}</div>
   ${FD.slice(0,40).map(d=>`<details class="fdi"><summary><b>${esc(dSK(d.day))}</b><span>${esc(comName(d.com))} · <b class="num">${fmt((+d.net_kg||0)/1000,3)} t</b></span><small>${esc(d.plate||"")}</small></summary><div class="s">Lístok ${esc(d.ticket)} · hrubá ${fmt((+d.gross_kg||0)/1000,3)} t · nečistoty ${d.impurity_pct!=null?fmt(d.impurity_pct,2)+" %":"–"}${d.buy_price!=null?" · cena "+fmt(d.buy_price)+" €/t":""}${d.deal_no?" · zmluva "+esc(d.deal_no):""}${d.quality?"<br>Rozbor: "+esc(d.quality):""}</div></details>`).join("")}
   ${FD.length>40?`<div class="s">…a ďalších ${FD.length-40} lístkov.</div>`:""}</div>`}
// vážne lístky farmárom nezobrazujeme – údaje z Excelu sú prísne tajné (iba majiteľ)
})();
