// ===== 🚨 ERNTE Maps ako Waze (príkaz majiteľa 2. 11.: „moja GPS navigácia plnohodnotná Waze so všetkými funkciami, v mojej app“) =====
// Dopĺňa ERNTE Maps (ernmaps.js, iba Martin – ernteMaps.ok()) o to, čo z Waze chýbalo:
//  ⚠️ Nahlásiť (polícia, nehoda, zápcha, nebezpečenstvo, radar, uzávierka, práce, počasie, predmet) – na mape, hlasové varovanie vpredu, synchronizácia medzi telefónmi (kalk_store maps/reports)
//  🚦 rýchlostný limit cesty (OpenStreetMap maxspeed) + upozornenie na prekročenie (tolerancia 5 km/h)
//  🏠 Domov · 💼 Práca · ⭐ Obľúbené · 🕘 Posledné ciele (v tomto telefóne) – jedným ťuknutím trasa
//  📤 Zdieľať príchod (čas príchodu + cieľ), 🌙 nočná mapa (automaticky 18–6 h alebo ručne)
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rad=d=>d*Math.PI/180;
const dist=(a,b)=>{const R=6371000,dl=rad(b.lat-a.lat),dn=rad(b.lng-a.lng),x=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const brg=(a,b)=>{const y=Math.sin(rad(b.lng-a.lng))*Math.cos(rad(b.lat)),x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lng-a.lng));return (Math.atan2(y,x)*180/Math.PI+360)%360};
const fm=m=>m<1000?Math.round(m/10)*10+" m":(m/1000).toFixed(1).replace(".",",")+" km";
const sayD=m=>m<1000?(Math.round(m/50)*50||Math.round(m/10)*10)+" metrov":(m/1000).toFixed(1).replace(".0","").replace(".",",")+" kilometra";
const LS={get(k,d){try{const v=localStorage.getItem("ernte-wz-"+k);return v==null?d:JSON.parse(v)}catch(x){return d}},set(k,v){try{localStorage.setItem("ernte-wz-"+k,JSON.stringify(v))}catch(x){}}};
const X=()=>window.ernteMaps&&window.ernteMaps._x;
const OK=()=>window.ernteMaps&&window.ernteMaps.ok&&window.ernteMaps.ok();
const q=s=>document.querySelector("#emap "+s);
// typ: ikona, názov, platnosť v hodinách
const REP={police:["🚓","Polícia",2],accident:["💥","Nehoda",3],jam:["🚗","Zápcha",1.5],hazard:["⚠️","Nebezpečenstvo",3],camera:["📷","Radar",24*365],
  closure:["⛔","Uzávierka",24],works:["🚧","Práce na ceste",24*14],weather:["🌧️","Poľadovica / počasie",6],object:["🪨","Predmet na ceste",3]};
const W={reps:LS.get("reps",[]),repL:null,lim:null,limAt:null,limBusy:false,limT:0,overT:0,warned:{},night:null,nightL:null,last:null,lastSeen:0,syncT:0};
const fresh=r=>REP[r.k]&&Date.now()-r.t<REP[r.k][2]*3600e3;

/* ---------- synchronizácia hlásení medzi telefónmi (kalk_store maps/reports) ---------- */
async function pull(){if(typeof sb==="undefined")return;try{const r=await sb.from("kalk_store").select("data").eq("path","maps").eq("id","reports").maybeSingle();
  const d=r&&!r.error&&r.data&&r.data.data;if(!d||!Array.isArray(d.reps))return;merge(d.reps)}catch(x){}}
function merge(list){const m=new Map(W.reps.map(r=>[r.id,r]));list.forEach(r=>{if(r&&r.id&&!m.has(r.id))m.set(r.id,r)});
  const del=new Set([...(LS.get("del",[]))]);W.reps=[...m.values()].filter(r=>fresh(r)&&!del.has(r.id));LS.set("reps",W.reps);draw()}
async function push(){LS.set("reps",W.reps);if(typeof sb==="undefined")return;clearTimeout(W.syncT);W.syncT=setTimeout(async()=>{try{
  const r=await sb.from("kalk_store").select("data").eq("path","maps").eq("id","reports").maybeSingle();const cur=(r&&r.data&&r.data.data&&r.data.data.reps)||[];
  const del=new Set(LS.get("del",[])),m=new Map();[...cur,...W.reps].forEach(x=>{if(x&&x.id&&fresh(x)&&!del.has(x.id))m.set(x.id,x)});
  await sb.from("kalk_store").upsert({path:"maps",id:"reports",data:{reps:[...m.values()].slice(-400),at:new Date().toISOString()}},{onConflict:"path,id"})}catch(x){}},800)}

/* ---------- hlásenia na mape ---------- */
function draw(){const x=X();if(!x||!x.S.map||!window.L)return;if(W.repL)W.repL.remove();W.repL=L.layerGroup().addTo(x.S.map);
  W.reps.filter(fresh).forEach(r=>{const mk=L.marker([r.lat,r.lng],{icon:L.divIcon({className:"",iconSize:[38,38],iconAnchor:[19,19],html:`<div class="ewmk">${REP[r.k][0]}</div>`}),zIndexOffset:500}).addTo(W.repL);
    const age=Math.round((Date.now()-r.t)/60000);
    mk.bindPopup(`<b>${E(REP[r.k][1])}</b><br><small>nahlásené pred ${age<60?age+" min":Math.round(age/60)+" h"}</small><br><button type="button" class="ewdel" data-ewdel="${E(r.id)}">✓ Už tam nie je</button>`)})}
function addRep(k){const x=X(),c=x&&x.S.me;if(!c){toast("📡 Čakám na GPS polohu…");return}
  // hlásenie kúsok pred autom v smere jazdy (ako Waze), pri státí presne na mieste
  let p={lat:c.lat,lng:c.lng};const sp=c.sp||0,h=x.S.brg!=null?x.S.brg:c.hd;
  if(sp>3&&h!=null&&!isNaN(h)){const d=Math.min(150,sp*4)/6371000,b=rad(h),la=rad(c.lat),lo=rad(c.lng);
    const la2=Math.asin(Math.sin(la)*Math.cos(d)+Math.cos(la)*Math.sin(d)*Math.cos(b)),lo2=lo+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(la),Math.cos(d)-Math.sin(la)*Math.sin(la2));p={lat:la2*180/Math.PI,lng:lo2*180/Math.PI}}
  const id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);W.warned[id]=1;W.reps.push({id,k,lat:+p.lat.toFixed(6),lng:+p.lng.toFixed(6),t:Date.now()});
  draw();push();sheet(false);toast(`Ďakujem! ${REP[k][0]} ${REP[k][1]} nahlásené`)}
function delRep(id){W.reps=W.reps.filter(r=>r.id!==id);const d=LS.get("del",[]);d.push(id);LS.set("del",d.slice(-300));draw();push();try{X().S.map.closePopup()}catch(x){}toast("Odstránené")}

/* ---------- varovania vpredu (hlásenia) ---------- */
function alerts(){const x=X();if(!x)return;const c=x.S.me;if(!c)return;const sp=(c.sp||0)*3.6,h=x.S.brg!=null?x.S.brg:c.hd;let best=null;
  W.reps.filter(fresh).forEach(r=>{const d=dist(c,r);if(d>(sp>80?1500:700))return;
    const ahead=sp<8||h==null||isNaN(h)||Math.abs(((brg(c,r)-h+540)%360)-180)<60;if(!ahead)return;if(!best||d<best.d)best={r,d}});
  const el=q(".ewal");if(!el)return;
  if(!best){el.hidden=true;return}
  const r=best.r;el.innerHTML=`<span>${REP[r.k][0]}</span><div><b>${E(REP[r.k][1])}</b><small>o ${fm(best.d)}</small></div>`;el.hidden=false;
  if(!W.warned[r.id]){W.warned[r.id]=1;beep();x.say(`Pozor, ${REP[r.k][1].toLowerCase()} o ${sayD(best.d)}`)}}
let ac;function beep(){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;g.gain.value=.12;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.22)}catch(x){}}

/* ---------- rýchlostný limit (OpenStreetMap maxspeed) ---------- */
const OVP=["https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
function parseLim(t){if(!t)return null;const v=String(t.maxspeed||"");let m=v.match(/\d+/);if(m){let n=+m[0];if(/mph/.test(v))n=Math.round(n*1.609);return n}
  if(/urban/.test(v))return 50;if(/rural/.test(v))return 90;if(/motorway/.test(v))return 130;
  if(t.highway==="motorway")return 130;if(t.highway==="living_street")return 20;return null}
async function limit(){const x=X();if(!x)return;const c=x.S.me;if(!c||W.limBusy)return;if(W.limAt&&dist(W.limAt,c)<120&&Date.now()-W.limT<60000)return;
  W.limBusy=true;W.limAt={lat:c.lat,lng:c.lng};W.limT=Date.now();
  const body="data="+encodeURIComponent(`[out:json][timeout:8];way(around:18,${c.lat.toFixed(6)},${c.lng.toFixed(6)})[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|motorway_link|trunk_link|primary_link|secondary_link|living_street|service)$"];out tags 4;`);
  try{const j=await Promise.any(OVP.map(u=>fetch(u,{method:"POST",body,headers:{"Content-Type":"application/x-www-form-urlencoded"},signal:AbortSignal.timeout?AbortSignal.timeout(9000):undefined}).then(r=>{if(!r.ok)throw 0;return r.json()})));
    let v=null;for(const w of (j.elements||[])){v=parseLim(w.tags||{});if(v)break}W.lim=v}catch(x){}finally{W.limBusy=false;paintLim()}}
function paintLim(){const el=q(".ewlim");if(!el)return;const x=X(),c=x&&x.S.me,sp=c&&c.sp?Math.round(c.sp*3.6):0;
  el.hidden=!W.lim;if(W.lim)el.textContent=W.lim;
  const over=W.lim&&sp>W.lim+5;el.classList.toggle("over",!!over);const s=q(".emspd");if(s)s.classList.toggle("ewover",!!over);
  if(over&&Date.now()-W.overT>45000){W.overT=Date.now();beep();x.say(`Prekračujete rýchlosť, limit ${W.lim}`)}}

/* ---------- nočná mapa ---------- */
function night(){const x=X();if(!x||!x.S.map||!window.L)return;const md=LS.get("night","auto"),h=new Date().getHours();
  const on=md==="night"||(md==="auto"&&(h>=18||h<6));const b=q("[data-ewnight]");if(b){b.textContent=md==="auto"?"🌓":on?"🌙":"☀️";b.title=md==="auto"?"Nočná mapa: automaticky":on?"Nočná mapa":"Denná mapa"}
  if(on===W.night&&(!on||W.nightL))return;W.night=on;
  if(on){if(!W.nightL)W.nightL=L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:20,subdomains:"abcd",zIndex:5});W.nightL.addTo(x.S.map)}
  else if(W.nightL)W.nightL.remove()}

/* ---------- Domov / Práca / Obľúbené / Posledné ---------- */
const favs=()=>LS.get("favs",{home:null,work:null,star:[]});
function favHTML(){const f=favs(),rec=LS.get("recent",[]),b=(x,ic,lbl,k)=>`<button type="button" class="ewch${x?"":" off"}" data-ewgo="${k}">${ic} ${E(lbl)}</button>`;
  return `<div class="ewfav">${b(f.home,"🏠","Domov","home")}${b(f.work,"💼","Práca","work")}${(f.star||[]).map((s,i)=>b(s,"⭐",s.n,"s"+i)).join("")}${rec.map((s,i)=>b(s,"🕘",s.n,"r"+i)).join("")}</div>
  <div class="ewsave"><small>Uložiť cieľ „Kam“ ako:</small><button type="button" data-ewsave="home">🏠</button><button type="button" data-ewsave="work">💼</button><button type="button" data-ewsave="star">⭐</button>${(f.star||[]).length?`<button type="button" data-ewclr>🗑️ ⭐</button>`:""}</div>`}
function favInject(){const pl=q(".empl");if(!pl||pl.querySelector(".ewfavw"))return;const d=document.createElement("div");d.className="ewfavw";d.innerHTML=favHTML();pl.prepend(d)}
function favRefresh(){const d=q(".ewfavw");if(d)d.innerHTML=favHTML()}
function pickFav(k){const f=favs(),rec=LS.get("recent",[]);const x=k==="home"?f.home:k==="work"?f.work:k[0]==="s"?(f.star||[])[+k.slice(1)]:rec[+k.slice(1)];
  if(!x){toast(`Najprv zadaj cieľ do „Kam“ a ulož ho tlačidlom ${k==="home"?"🏠":"💼"}`);return}go(x)}
async function go(x){const m=X();if(!m)return;const ib=q("[data-emf=b]");if(!ib){m.showPlan(true);let n=0;await new Promise(ok=>{const t=setInterval(()=>{if(q("[data-emf=b]")||++n>40){clearInterval(t);ok()}},100)})}
  m.P.b={n:x.n,w:x.w||"",lat:x.lat,lng:x.lng};const i2=q("[data-emf=b]");if(i2)i2.value=x.n;try{await m.calc()}catch(e){}}
function saveFav(k){const m=X(),b=m&&m.P.b;if(!b||b.me||b.lat==null){toast("Najprv vyber cieľ „Kam“ zo zoznamu");return}const f=favs(),v={n:b.n,w:b.w||"",lat:b.lat,lng:b.lng};
  if(k==="star"){f.star=[v,...(f.star||[]).filter(s=>dist(s,v)>30)].slice(0,8)}else f[k]=v;LS.set("favs",f);favRefresh();toast(k==="home"?"🏠 Domov uložený":k==="work"?"💼 Práca uložená":"⭐ Uložené do obľúbených")}
function addRecent(){const m=X(),b=m&&m.P.b;if(!b||b.me||b.lat==null)return;const v={n:b.n,w:b.w||"",lat:b.lat,lng:b.lng};LS.set("recent",[v,...LS.get("recent",[]).filter(s=>dist(s,v)>30)].slice(0,5))}

/* ---------- zdieľať príchod ---------- */
async function share(){const m=X(),b=m&&(m.P.b||m.S.dest),eta=(q(".emeta")||{}).textContent||"",rem=(q(".emrem")||{}).textContent||"";
  const t=`Som na ceste${b&&b.n?" do: "+b.n:""}.${eta&&eta!=="–"?" Príchod približne o "+eta:""}${rem&&rem!=="–"?" (zostáva "+rem+")":""}.`+(b&&b.lat!=null?`\nCieľ na mape: https://www.google.com/maps/search/?api=1&query=${(+b.lat).toFixed(5)},${(+b.lng).toFixed(5)}`:"");
  try{if(navigator.share){await navigator.share({text:t});return}}catch(e){if(e&&e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(t);toast("📋 Skopírované – vlož do správy")}catch(e){toast(t)}}

/* ---------- UI ---------- */
function toast(t){let e=document.getElementById("ewtoast");if(!e){e=document.createElement("div");e.id="ewtoast";(document.getElementById("emap")||document.body).appendChild(e)}e.textContent=t;e.hidden=false;clearTimeout(e._t);e._t=setTimeout(()=>e.hidden=true,2800)}
function sheet(on){let s=q(".ewsheet");if(!on){if(s)s.hidden=true;return}
  if(!s){s=document.createElement("div");s.className="ewsheet";s.innerHTML=`<b>Čo vidíš na ceste?</b><div class="ewgrid">${Object.entries(REP).map(([k,v])=>`<button type="button" data-ewrep="${k}"><span>${v[0]}</span>${E(v[1])}</button>`).join("")}</div><button type="button" class="ewcl" data-ewsh="0">Zavrieť</button>`;q(".emm").appendChild(s)}
  s.hidden=false}
function inject(){const o=document.getElementById("emap");if(!o||!OK())return;
  const mm=q(".emm"),zm=q(".emzm"),hd=q(".emh");if(!mm)return;
  if(!q(".ewfab")){const b=document.createElement("button");b.type="button";b.className="ewfab";b.dataset.ewsh="1";b.setAttribute("aria-label","Nahlásiť na ceste");b.textContent="⚠️";mm.appendChild(b)}
  if(!q(".ewal")){const a=document.createElement("div");a.className="ewal";a.hidden=true;mm.appendChild(a)}
  if(zm&&!zm.querySelector(".ewlim")){const l=document.createElement("div");l.className="ewlim";l.hidden=true;zm.prepend(l);
    const r=document.createElement("button");r.type="button";r.className="emnb ewrep";r.dataset.ewsh="1";r.setAttribute("aria-label","Nahlásiť");r.textContent="⚠️";zm.appendChild(r);
    const s=document.createElement("button");s.type="button";s.className="emnb";s.dataset.ewshare="1";s.setAttribute("aria-label","Zdieľať príchod");s.textContent="📤";zm.appendChild(s)}
  if(hd&&!hd.querySelector("[data-ewnight]")){const n=document.createElement("button");n.type="button";n.className="ewnt";n.dataset.ewnight="1";n.setAttribute("aria-label","Nočná mapa");const x=hd.querySelector(".emx");hd.insertBefore(n,x||null)}
  favInject();night();if(!W.repL||!(X().S.map&&X().S.map.hasLayer(W.repL)))draw()}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-ewsh],[data-ewrep],[data-ewdel],[data-ewgo],[data-ewsave],[data-ewclr],[data-ewshare],[data-ewnight]");if(!t||!t.closest("#emap"))return;
  e.preventDefault();e.stopPropagation();const d=t.dataset;
  if(d.ewsh!=null)sheet(d.ewsh==="1");else if(d.ewrep)addRep(d.ewrep);else if(d.ewdel)delRep(d.ewdel);else if(d.ewgo)pickFav(d.ewgo);else if(d.ewsave)saveFav(d.ewsave);
  else if(d.ewclr!=null){const f=favs();f.star=[];LS.set("favs",f);favRefresh()}else if(d.ewshare!=null)share();
  else if(d.ewnight!=null){const md=LS.get("night","auto");LS.set("night",md==="auto"?"night":md==="night"?"day":"auto");W.night=null;night()}},true);

/* ---------- slučka ---------- */
let wasNav=false;
function tick(){const o=document.getElementById("emap");if(!o||!o.classList.contains("on")||document.hidden)return;if(!q(".ewfab")||!q("[data-ewnight]")||(q(".emzm")&&!q(".emzm .ewlim"))||(q(".empl")&&!q(".ewfavw")))inject();
  const nav=o.classList.contains("navon");if(nav&&!wasNav)addRecent();wasNav=nav;
  const x=X();if(x&&x.S.me&&x.S.me.at!==W.lastSeen){W.lastSeen=x.S.me.at;alerts();if(nav)limit();paintLim()}
  if(!nav){const l=q(".ewlim");if(l)l.hidden=true}}
function boot(){setInterval(()=>{tick();if(Date.now()%60000<1000)night()},1000);
  const watch=()=>{const o=document.getElementById("emap");if(!o){setTimeout(watch,1000);return}
    pull();setInterval(pull,5*60000)};watch();
  document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#emap [data-emplan],#emap [data-emq]"))[60,250,600].forEach(t=>setTimeout(favInject,t))},true)}
{const s=document.createElement("style");s.textContent=`
#emap .ewfab{position:absolute;right:12px;bottom:12px;z-index:1001;width:56px;height:56px;min-width:56px;border-radius:50%!important;padding:0!important;display:grid;place-items:center;font-size:1.6rem;background:#facc15!important;color:#111!important;border:2px solid #fff!important;box-shadow:0 0 18px rgba(250,204,21,.6)}
#emap.navon .ewfab{display:none}
#emap .ewrep{background:#facc15!important;color:#111!important}
#emap .ewlim{width:56px;height:56px;border-radius:50%;background:#fff;border:6px solid #dc2626;color:#111;display:grid;place-items:center;font-weight:900;font-size:1.25rem;box-sizing:border-box;box-shadow:0 0 12px rgba(0,0,0,.5)}
#emap .ewlim.over{animation:ewpl .8s infinite alternate}@keyframes ewpl{to{transform:scale(1.12);box-shadow:0 0 22px #dc2626}}
#emap .ewlim[hidden],#emap .ewal[hidden],#emap .ewsheet[hidden],#ewtoast[hidden]{display:none!important}
#emap .emspd.ewover{color:#f87171!important}
#emap .ewal{position:absolute;left:50%;transform:translateX(-50%);top:calc(190px + env(safe-area-inset-top));z-index:1002;display:flex;gap:10px;align-items:center;max-width:calc(100% - 150px);padding:8px 14px;border-radius:16px;background:rgba(17,24,39,.94);border:1px solid #facc15;box-shadow:0 0 20px rgba(250,204,21,.45);color:#fff}
#emap:not(.navon) .ewal{top:76px}
#emap .ewal span{font-size:1.8rem}#emap .ewal b{display:block;font-size:.95rem}#emap .ewal small{opacity:.8}
#emap .ewmk{width:38px;height:38px;border-radius:50%;background:#fff;border:3px solid #facc15;display:grid;place-items:center;font-size:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,.5)}
#emap .ewdel{margin-top:6px;padding:6px 10px;border-radius:10px;border:1px solid #94a3b8;background:#f1f5f9;color:#111;font-weight:700}
#emap .ewsheet{position:absolute;left:0;right:0;bottom:0;z-index:1003;padding:14px 14px calc(14px + env(safe-area-inset-bottom));background:rgba(5,7,13,.97);border-top:1px solid rgba(250,204,21,.6);border-radius:20px 20px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.6)}
#emap .ewsheet>b{display:block;font-size:1.1rem;margin-bottom:10px;text-align:center}
#emap .ewgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#emap .ewgrid button{display:grid;justify-items:center;gap:4px;padding:10px 4px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;font-weight:700;font-size:.78rem;line-height:1.15;min-width:0;overflow-wrap:anywhere}
#emap .ewgrid span{font-size:1.9rem}
#emap .ewcl{width:100%;margin-top:10px;padding:12px;border-radius:14px;background:rgba(255,255,255,.12);border:0;color:#fff;font-weight:800}
#emap .ewnt{width:40px;height:40px;min-width:40px;border-radius:50%!important;padding:0!important;display:grid;place-items:center;font-size:1.2rem;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff}
#emap .ewfav{display:flex;gap:8px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}
#emap .ewch{flex:none;padding:8px 12px;border-radius:999px;background:rgba(56,189,248,.15);border:1px solid rgba(56,189,248,.55);color:#fff;font-weight:700;font-size:.85rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#emap .ewch.off{opacity:.55}
#emap .ewsave{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:8px}#emap .ewsave small{opacity:.75;flex:1 1 140px}
#emap .ewsave button{padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff}
#ewtoast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(170px + env(safe-area-inset-bottom));z-index:31010;max-width:90vw;padding:10px 16px;border-radius:14px;background:#111827;color:#fff;font-weight:700;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.5);white-space:pre-line}`;document.head.appendChild(s)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
