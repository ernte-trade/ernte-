// ===== ☀️ RANNÁ SPRÁVA v 💬 chate (farmár, majiteľ, vodiči) =====
// Podľa recenzií podobných aplikácií (farmári: cena + počasie + vlastné odvozy/platby; vodiči: trasa, zákazy jázd;
// nenávidia opakované a neosobné upozornenia): JEDNA krátka správa denne, iba ich vlastné údaje, bez opakovania.
//  • Farmár: naša nákupná cena ▲▼ oproti včerajšku (nikdy burza ani odberatelia), počasie ako semafor (zber / postrek / odvoz),
//    cieľová cena, dnešné a zajtrajšie autá, zmeny jeho obchodov (napr. zaplatené). Tlačidlá Predať / Objednať odvoz / Cieľová cena.
//  • Majiteľ: včera nakúpené, marža (iba majiteľ), čo čaká, dnešné jazdy, spokojnosť z 💬, zákazy jázd.
//  • Vodiči (nemajú prihlásenie): pripravený text pre každého vodiča s dnešnými jazdami – odošle ho majiteľ / dispečer
//    sám cez SMS alebo WhatsApp (nič neodíde bez ťuknutia).
// Zobrazí sa v 💬 chate; na 💬 svieti bodka, kým si dnešnú správu neprečítaš.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER,isS=()=>typeof ROLE!=="undefined"&&!!ROLE&&!isF();
const OWN=()=>isS()&&ROLE==="owner";
const canT=()=>isS()&&(OWN()||(typeof can==="function"&&(can("trans")||can("fleet")||can("drivers"))));
const CN=c=>typeof comName==="function"?comName(c):c;
const n0=x=>Number.isFinite(+x)?Math.round(+x).toLocaleString("sk-SK"):"–";
const n1=x=>Number.isFinite(+x)?(+x).toLocaleString("sk-SK",{maximumFractionDigits:1}):"–";
const pad=n=>String(n).padStart(2,"0"),dstr=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const TODAY=()=>dstr(new Date()),DAYOFF=k=>{const d=new Date();d.setDate(d.getDate()+k);return dstr(d)};
const dSK=s=>{const [y,m,d]=String(s).split("-");return +d+". "+(+m)+"."};
const WD=["nedeľa","pondelok","utorok","streda","štvrtok","piatok","sobota"];
const ld=(k,def)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?def:v}catch(x){return def}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(x){}};
const R={wx:null,wxAt:0,hol:{},tg:null,fb:null,off:null,busy:false};

// ---------- počasie (Open-Meteo, miesto z Počasia v aplikácii) ----------
function loc(){try{return (typeof WXLOC!=="undefined"&&WXLOC)||{name:"Michalovce",lat:48.755,lon:21.915}}catch(x){return {name:"Michalovce",lat:48.755,lon:21.915}}}
async function loadWx(){if(R.wx&&Date.now()-R.wxAt<30*6e4)return;const L=loc();
  try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&hourly=precipitation&forecast_days=3&timezone=auto&wind_speed_unit=ms`);
    if(r.ok){const j=await r.json();R.wx={name:L.name,d:j.daily,h:j.hourly};R.wxAt=Date.now()}}catch(x){}}
// semafor: zber/odvoz a postrek
function wxDay(i){const D=R.wx&&R.wx.d;if(!D||!D.time||!D.time[i])return null;
  const p=+D.precipitation_sum[i]||0,pp=+D.precipitation_probability_max[i]||0,w=+D.wind_speed_10m_max[i]||0,g=+D.wind_gusts_10m_max[i]||0,tx=D.temperature_2m_max[i],tn=D.temperature_2m_min[i];
  let rainFrom=null;if(i===0&&R.wx.h){const H=R.wx.h;for(let k=0;k<H.time.length;k++){if(!H.time[k].startsWith(D.time[0]))continue;if(+H.precipitation[k]>=0.3&&new Date(H.time[k])>=new Date()){rainFrom=H.time[k].slice(11,16);break}}}
  const field=p<0.5&&pp<35?"g":p<4?"y":"r",spray=p<0.3&&pp<30&&w<5&&g<9?"g":(p<2&&w<7)?"y":"r";
  return {p,pp,w,g,tx,tn,rainFrom,field,spray,date:D.time[i]}}
const DOT={g:"🟢",y:"🟡",r:"🔴"};
function wxLines(){const a=wxDay(0),b=wxDay(1);if(!a)return [];const L=[];
  L.push(`🌤️ ${e(R.wx.name)}: ${n0(a.tn)} až ${n0(a.tx)} °C, zrážky ${n1(a.p)} mm (${n0(a.pp)} %), vietor ${n0(a.w)} m/s${a.rainFrom?` · dážď od ${a.rainFrom}`:""}.`);
  L.push(`${DOT[a.field]} Zber a odvoz: ${a.field==="g"?"dnes v poriadku":a.field==="y"?"skôr dopoludnia, cesty môžu zmoknúť":"dnes radšej nie – mokro"} · ${DOT[a.spray]} Postrek: ${a.spray==="g"?"vhodný":a.spray==="y"?"iba ráno, ak nefúka":"nevhodný (dážď alebo vietor)"}.`);
  if(b&&b.p>=4)L.push(`☔ Zajtra (${WD[new Date(b.date).getDay()]}) ${n1(b.p)} mm – čo sa dá, vyvezte dnes.`);
  return L}

// ---------- sviatky a zákazy jázd (SK, HU) ----------
async function loadHol(y){for(const c of ["SK","HU"]){const k=c+y;if(R.hol[k])continue;const cached=ld("ernte-hol-"+k,null);if(cached){R.hol[k]=cached;continue}
  try{const r=await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${c}`);if(r.ok){const j=await r.json();R.hol[k]=j.filter(h=>!h.types||h.types.includes("Public")).map(h=>({d:h.date,n:h.localName}));sv("ernte-hol-"+k,R.hol[k])}}catch(x){}}}
const hol=(c,d)=>(R.hol[c+d.slice(0,4)]||[]).find(h=>h.d===d);
// SK: > 7,5 t na diaľniciach a cestách I. triedy – nedeľa a sviatok 0–22 h; 1. 7. – 31. 8. sobota 7–19 h.
// HU: > 7,5 t – sobota 22 h – nedeľa 22 h (1. 7. – 31. 8. od soboty 15 h); sviatok od 22 h predchádzajúceho dňa do 22 h.
function bans(d){const dt=new Date(d+"T12:00:00"),w=dt.getDay(),m=dt.getMonth()+1,L=[];const nx=new Date(dt);nx.setDate(nx.getDate()+1);const dn=dstr(nx);
  const hs=hol("SK",d),hh=hol("HU",d),hhn=hol("HU",dn);
  if(w===0||hs)L.push(`🇸🇰 0:00–22:00${hs?" ("+hs.n+")":""}`);else if(w===6&&(m===7||m===8))L.push("🇸🇰 7:00–19:00 (letná sobota)");
  if(w===0||hh)L.push(`🇭🇺 do 22:00${hh?" ("+hh.n+")":""}`);
  if(w===6||hhn)L.push(`🇭🇺 od ${w===6&&(m===7||m===8)?"15:00":"22:00"}${hhn&&w!==6?" (zajtra "+hhn.n+")":""}`);
  return L}
function banLines(){const L=[];for(let k=0;k<4;k++){const d=DAYOFF(k),b=bans(d);if(b.length)L.push(`🚫 ${k===0?"Dnes":k===1?"Zajtra":WD[new Date(d+"T12:00").getDay()]+" "+dSK(d)}: zákaz > 7,5 t ${b.join(" · ")}`)}return L}

// ---------- ceny: zmena oproti včerajšku ----------
function pxDelta(){const P=((typeof STATE!=="undefined"&&STATE.prices)||[]).filter(p=>p.price!=null),t=TODAY();const s=ld("ernte-rs-px",{});
  const cur=Object.fromEntries(P.map(p=>[p.com,+p.price]));
  if(!s.cur||s.cur.d!==t){if(s.cur&&s.cur.d<t)s.prev=s.cur;s.cur={d:t,px:cur};}else s.cur.px=Object.assign({},s.cur.px,cur);sv("ernte-rs-px",s);
  const prev=(s.prev&&s.prev.px)||{};return P.map(p=>({c:p.com,p:+p.price,d:prev[p.com]!=null?+p.price-prev[p.com]:null}))}

// ---------- zmeny obchodov farmára od poslednej návštevy ----------
const ST={navrh:"návrh",podpisany:"podpísaný",odvoz:"odváža sa",odvezeny:"odvezený",fakturacia:"fakturuje sa",zaplateny:"zaplatený ✓",zruseny:"zrušený"};
function dealChanges(){const D=(typeof STATE!=="undefined"&&STATE.deals)||[],s=ld("ernte-rs-deals",null),cur=Object.fromEntries(D.map(d=>[d.id,d.status])),out=[];
  if(s)for(const d of D)if(s[d.id]&&s[d.id]!==d.status)out.push(`${d.status==="zaplateny"?"💰":"📄"} Obchod ${e(d.no||"")} (${e(CN(d.com))}, ${n0(d.tons)} t): <b>${e(ST[d.status]||d.status)}</b>`);
  return {out,save:()=>sv("ernte-rs-deals",cur)}}

// ---------- obsah ----------
function greet(){const h=new Date().getHours();return h<10?"Dobré ráno":h<18?"Dobrý deň":"Dobrý večer"}
function msg(html,btns){return `<div class="fbmsg them rsm"><span class="fbav">ERNTE · ${e(new Date().toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"numeric"}))}</span><div class="rsb">${html}</div>${btns?`<div class="rsbtns">${btns}</div>`:""}</div>`}
function farmer(){const F=FARMER,P=pxDelta(),my=new Set([...((STATE.deals||[]).map(d=>d.com)),...((R.tg||[]).map(t=>t.com))]);
  const P2=P.filter(p=>my.has(p.c)).concat(P.filter(p=>!my.has(p.c))).slice(0,4),L=[];
  L.push(`<p>${greet()}, ${e(String(F.name||"").split(" ")[0])}! ☀️</p>`);
  if(P2.length)L.push(`<p class="rspx"><span>💶 <b>Naša cena dnes</b> <small>(FCA farma, bez DPH)</small></span>${P2.map(p=>`<span>${e(CN(p.c))}: <b>${n0(p.p)} €/t</b>${p.d?` <span class="${p.d>0?"rsup":"rsdn"}">${p.d>0?"▲ +":"▼ −"}${n0(Math.abs(p.d))} od včera</span>`:""}</span>`).join("")}</p>`);
  const A=(R.tg||[]).filter(t=>t.active);for(const t of A.slice(0,2)){const p=P.find(x=>x.c===t.com);if(!p)continue;const g=t.target-p.p;
    L.push(`<p>🎯 ${e(CN(t.com))}: ${g<=0?`<b>vaša cieľová cena ${n0(t.target)} €/t je dosiahnutá!</b>`:`do vašej cieľovej ceny ${n0(t.target)} €/t chýba <b>${n0(g)} €</b>.`}</p>`)}
  const T=(STATE.trips||[]).filter(t=>(t.day===TODAY()||t.day===DAYOFF(1))&&t.status!=="zrusena");
  if(T.length)L.push(`<p>🚚 ${T.map(t=>`${t.day===TODAY()?"Dnes":"Zajtra"}${t.time?" o "+e(t.time):""} príde auto <b class="rsnw">${e(t.spz||"VALKO")}</b>${t.netto?` (naložené ${n1(t.netto/1000)} t)`:""}`).join("<br>")}</p>`);
  const ch=dealChanges();if(ch.out.length)L.push(`<p>${ch.out.join("<br>")}</p>`);R._save=ch.save;
  const left=(STATE.deals||[]).filter(d=>["podpisany","odvoz"].includes(d.status)).map(d=>({d,l:(+d.tons||0)-(+d.delivered_t||0)})).filter(x=>x.l>0.5);
  if(left.length)L.push(`<p>📦 Na zmluvy ešte zostáva odviezť: ${left.map(x=>`${e(CN(x.d.com))} ${n0(x.l)} t`).join(" · ")}</p>`);
  const W=wxLines();if(W.length)L.push(`<p>${W.join("<br>")}</p>`);
  const fc=k=>!window.fcan||fcan(k),c0=(P2[0]||{}).c;
  const B=[c0&&fc("f_sell")?`<button type="button" class="lime" data-rsgo="sell:${e(c0)}">💰 Predať</button>`:"",fc("f_transport")?`<button type="button" data-rsgo="order">🚚 Objednať odvoz</button>`:"",fc("f_sell")?`<button type="button" data-rsgo="target">🎯 Cieľová cena</button>`:""].join("");
  return msg(L.join(""),B)}

function byCom(L){const G={};for(const d of L){const g=G[d.com]=G[d.com]||{t:0,v:0};g.t+=+d.tons||0;g.v+=(+d.tons||0)*(+d.price||0)}return Object.entries(G).map(([c,g])=>`${e(CN(c))} ${n0(g.t)} t za ${n0(g.t?g.v/g.t:0)} €/t`).join(", ")}
function owner(){const D=STATE.deals||[],y=DAYOFF(-1),DY=D.filter(d=>String(d.created_at||"").slice(0,10)===y&&d.status!=="zruseny");
  const t=DY.reduce((s,d)=>s+(+d.tons||0),0),avg=t?DY.reduce((s,d)=>s+(+d.tons||0)*(+d.price||0),0)/t:null;
  const FIN=STATE.dfin||{},MG=DY.filter(d=>FIN[d.id]&&FIN[d.id].sell_price!=null),mt=MG.reduce((s,d)=>s+(+d.tons||0),0),mg=mt?MG.reduce((s,d)=>s+(+d.tons||0)*(+FIN[d.id].sell_price-(+d.price||0)),0)/mt:null;
  const R0=STATE.reqs||[],nReq=R0.filter(r=>r.status==="nova"&&r.kind!=="transport").length,nTr=R0.filter(r=>r.status==="nova"&&r.kind==="transport").length,nOff=(R.off||[]).length;
  const TT=(STATE.trips||[]).filter(x=>x.day===TODAY()&&x.status!=="zrusena"),L=[];
  L.push(`<p>${greet()}, ${e(String((typeof ME!=="undefined"&&ME&&ME.staffName)||"").split(" ")[0]||"šéfe")}! ☀️</p>`);
  L.push(`<p>📊 <b>Včera</b> (${WD[new Date(y+"T12:00").getDay()]}): ${DY.length?`${DY.length} ${DY.length===1?"obchod":DY.length<5?"obchody":"obchodov"}, <b>${n0(t)} t</b> – ${byCom(DY)}${OWN()&&mg!=null?` · priemerná marža <b>${mg>=0?"+":"−"}${n1(Math.abs(mg))} €/t</b>`:""}`:"žiadny nový obchod"}.</p>`);
  const w=[nReq?`${nReq} ${nReq===1?"požiadavka":"požiadavky"}`:"",nOff?`${nOff} ${nOff===1?"návrh ceny":"návrhy cien"}`:"",nTr?`${nTr} ${nTr===1?"odvoz":"odvozy"}`:""].filter(Boolean);
  L.push(`<p>${w.length?`⚠️ <b>Čaká na teba:</b> ${w.join(" · ")}`:"✅ Nič nečaká na vybavenie."}</p>`);
  if(TT.length)L.push(`<p>🚛 <b>Dnes ${TT.length} ${TT.length===1?"jazda":TT.length<5?"jazdy":"jázd"}</b>: ${[...new Set(TT.map(x=>x.spz).filter(Boolean))].map(x=>`<span class="rsnw">${e(x)}</span>`).join(", ")||"bez ŠPZ"}</p>`);
  if(R.fb&&R.fb.n)L.push(`<p>😀 <b>Spokojnosť</b> (30 dní): ${R.fb.f!=null?`farmári ${n1(R.fb.f)}/5`:""}${R.fb.f!=null&&R.fb.s!=null?" · ":""}${R.fb.s!=null?`tím ${n1(R.fb.s)}/5`:""} (${R.fb.n} ${R.fb.n===1?"odpoveď":R.fb.n<5?"odpovede":"odpovedí"})</p>`);
  const BL=banLines();if(BL.length)L.push(`<p>${BL.join("<br>")}</p>`);
  const W=wxLines();if(W.length)L.push(`<p>${W.join("<br>")}</p>`);
  const B=[nReq||nOff?`<button type="button" class="lime" data-rsgo="tab:req">📥 Požiadavky</button>`:"",nTr?`<button type="button" data-rsgo="tab:trans">🚚 Doprava</button>`:""].join("");
  return msg(L.join(""),B)}

// ---------- vodiči: text na SMS / WhatsApp ----------
const tel=p=>{let s=String(p||"").replace(/[^\d+]/g,"");if(s.startsWith("00"))s="+"+s.slice(2);else if(s.startsWith("0"))s="+421"+s.slice(1);else if(!s.startsWith("+")&&s.length>=9)s="+"+s;return s};
function driverText(phone,T){const F=STATE.farmers||[],D=STATE.deals||[],a=wxDay(0),BL=banLines().slice(0,2);
  const lines=T.sort((x,z)=>String(x.time||"").localeCompare(String(z.time||""))).map(t=>{const d=D.find(x=>x.id===t.deal_id)||{},f=F.find(x=>x.id===d.farmer_id)||{};
    return `• ${t.time||"čas podľa dohody"} – ${f.name||"farmár"}${f.addr?", "+f.addr:""}${d.com?" – "+CN(d.com):""}${t.note?" ("+t.note+")":""}`});
  return [`Dobré ráno! VALKO s.r.o. – plán na ${WD[new Date().getDay()]} ${dSK(TODAY())}`,`Auto ${T[0].spz||""}`.trim(),...lines,
    a?`Počasie: ${Math.round(a.tn)}–${Math.round(a.tx)} °C, zrážky ${String(Math.round(a.p*10)/10).replace(".",",")} mm${a.rainFrom?", dážď od "+a.rainFrom:""}${a.field==="r"?" – pozor na mokré polné cesty":""}.`:"",
    ...BL.map(x=>"Zákaz jazdy > 7,5 t – "+x.replace(/^🚫 /,"").replace(": zákaz > 7,5 t",":")),"Šťastnú cestu!"].filter(Boolean).join("\n")}
function drivers(){const TT=(STATE.trips||[]).filter(x=>x.day===TODAY()&&x.status!=="zrusena"&&x.driver_phone);if(!TT.length)return "";
  const G={};for(const t of TT){const k=tel(t.driver_phone);(G[k]=G[k]||[]).push(t)}
  const sent=ld("ernte-rs-drv",{}),td=TODAY();
  return `<div class="fbmsg them rsm"><span class="fbav">VALKO · vodiči</span><div class="rsb"><p>🚛 <b>Ranná správa vodičom</b> – pripravená z dnešných jázd. Pošleš ju sám jedným ťuknutím (zo svojho telefónu).</p>
   ${Object.entries(G).map(([p,T])=>{const tx=driverText(p,T),done=sent[td+p];return `<div class="rsdrv"><div class="row"><b>${e(T[0].spz||"auto")} · ${e(p)}</b>${done?`<span class="pill">✓ odoslané</span>`:""}</div><pre>${e(tx)}</pre>
    <div class="rsbtns"><a class="btn" data-rsdrv="${e(p)}" href="sms:${e(p)}?&body=${encodeURIComponent(tx)}">✉️ SMS</a><a class="btn" data-rsdrv="${e(p)}" target="_blank" rel="noopener" href="https://wa.me/${e(p.replace("+",""))}?text=${encodeURIComponent(tx)}">🟢 WhatsApp</a></div></div>`}).join("")}</div></div>`}

window.rsHTML=function(){if(isF())return farmer();if(isS()&&(OWN()||canT()))return (OWN()?owner():"")+(canT()?drivers():"");return ""};
const has=()=>isF()||OWN()||canT();
const seenKey=()=>"ernte-rs-seen",unseen=()=>has()&&ld(seenKey(),"")!==TODAY();
window.rsSeen=function(){sv(seenKey(),TODAY());if(R._save){R._save();R._save=null}dot()};
window.rsUnseen=unseen;

// ---------- načítanie ----------
async function load(){if(R.busy||!has())return;R.busy=true;const y=new Date().getFullYear(),q=[loadWx(),loadHol(y)];if(new Date().getMonth()===11)q.push(loadHol(y+1));
  if(isF()&&(!window.fcan||fcan("f_sell")))q.push(sb.from("price_targets").select("com,target,active").then(r=>{R.tg=r.error?[]:r.data||[]},()=>{R.tg=[]}));
  if(OWN()){q.push(sb.from("farmer_offers").select("id").eq("status","nova").then(r=>{R.off=r.error?[]:r.data||[]},()=>{R.off=[]}));
    const since=new Date(Date.now()-30*864e5).toISOString();
    q.push(sb.from("app_feedback").select("who,rating").gte("created_at",since).not("rating","is",null).then(r=>{const L=r.error?[]:r.data||[],av=w=>{const x=L.filter(z=>z.who===w);return x.length?x.reduce((s,z)=>s+z.rating,0)/x.length:null};R.fb={n:L.length,f:av("farmer"),s:av("staff")}},()=>{R.fb={n:0}}))}
  await Promise.all(q.map(p=>Promise.resolve(p).catch(()=>{})));R.busy=false;dot();const m=document.getElementById("fbMod");if(m&&window.feedbackRepaint)feedbackRepaint()}
// bodka na 💬 + krátka bublina raz denne
function dot(){const b=document.getElementById("fbBtn");if(!b)return;let d=b.querySelector(".rsdot");const u=unseen();
  if(u&&!d){d=document.createElement("span");d.className="rsdot";d.setAttribute("aria-hidden","true");b.appendChild(d);b.setAttribute("aria-label","Ranná správa je pripravená");
    const t=b.querySelector(".fbtip"),k="ernte-rs-tip";if(t&&ld(k,"")!==TODAY()){sv(k,TODAY());t.textContent=`☀️ ${greet()}! Ranná správa je pripravená – ťuknite na 💬.`;t.hidden=false;setTimeout(()=>{t.hidden=true},9000)}}
  else if(!u&&d){d.remove();b.setAttribute("aria-label","Spätná väzba – čo by ste zmenili?")}}
// akcie z tlačidiel
document.addEventListener("click",ev=>{const t=ev.target;if(!t.closest)return;let x;
  if(x=t.closest("[data-rsdrv]")){const s=ld("ernte-rs-drv",{});s[TODAY()+x.dataset.rsdrv]=1;for(const k of Object.keys(s))if(k.slice(0,10)<DAYOFF(-7))delete s[k];sv("ernte-rs-drv",s);setTimeout(()=>{window.feedbackRepaint&&feedbackRepaint()},400);return}
  if(!(x=t.closest("[data-rsgo]")))return;ev.preventDefault();ev.stopPropagation();const g=x.dataset.rsgo;window.feedbackClose&&feedbackClose();
  const scrollTo=sel=>setTimeout(()=>{const n=document.querySelector(sel);if(n){n.scrollIntoView({behavior:"smooth",block:"center"});const i=n.querySelector("input");if(i)try{i.focus({preventScroll:true})}catch(y){}}},120);
  if(g.startsWith("sell:")){const b=document.querySelector(`[data-sell="${CSS.escape(g.slice(5))}"]`)||document.querySelector("[data-sell]");if(b){b.click();scrollTo("#fSell")}return}
  if(g==="order"){const b=document.querySelector('[data-order="__free"]')||document.querySelector("[data-order]");if(b){b.click();scrollTo("#fOrderFree,#fOrder")}return}
  if(g==="target"){scrollTo("#fFt");return}
  if(g.startsWith("tab:")&&typeof TAB!=="undefined"){TAB=g.slice(4);if(typeof renderStaff==="function")renderStaff();window.scrollTo({top:0})}},true);
let started=false;function boot(){if(started||!has())return;started=true;load();setInterval(()=>{if(!document.hidden)load()},30*6e4)}
setInterval(()=>{boot();dot()},1500);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&has()){dot();if(Date.now()-R.wxAt>30*6e4)load()}});
{const s=document.createElement("style");s.textContent=`
.fbbtn{position:fixed}.fbbtn .rsdot{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 2px #0b1020}
.rsm{max-width:100%!important;width:100%}.rsb{display:grid;gap:6px;line-height:1.5}
.fbmsg .rsb>p{margin:0;max-width:94%;justify-self:start}.fbmsg .rsb .rspx{display:grid;gap:2px}.rsnw{white-space:nowrap}.rsup{color:#4ade80;font-weight:700}.rsdn{color:#f87171;font-weight:700}
.rsbtns{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}.rsbtns>*{flex:1 1 130px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;text-align:center;text-decoration:none}
.rsdrv{display:grid;gap:6px;padding:10px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}
.rsdrv .row{flex-wrap:wrap}.rsdrv pre{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit;font-size:.82rem;opacity:.9}
.fbmore{border-top:1px solid rgba(255,255,255,.1);padding-top:8px}.fbmore>summary{cursor:pointer;font-weight:600;min-height:40px;display:flex;align-items:center}
html[data-theme=light] .rsdrv{background:rgba(15,23,42,.03);border-color:rgba(15,23,42,.12)}
html[data-theme=light] .fbbtn .rsdot{box-shadow:0 0 0 2px #fff}`;document.head.appendChild(s)}
})();
