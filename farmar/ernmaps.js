// ===== 🗺️ ERNTE Maps – vlastná GPS navigácia v aplikácii (príkaz majiteľa 30. 10.) =====
// Poloha telefónu (GPS, presnosť ≤ 1 km), najbližšie čerpacie stanice (OpenStreetMap / Overpass), trasa (OSRM),
// navigácia krok za krokom po slovensky s hlasom, sledovanie polohy, prepočet trasy pri zídení z cesty.
// Mapa © OpenStreetMap (ODbL), trasy OSRM (router.project-osrm.org). Google Maps ostáva ako záloha jedným ťuknutím.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const km=(a,b)=>{const R=6371,r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lng-a.lng)*r,x=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const fd=d=>d<1?Math.round(d*1000/10)*10+" m":d.toFixed(d<10?1:0).replace(".",",")+" km";
const ft=s=>{const m=Math.round(s/60);return m<60?m+" min":Math.floor(m/60)+" h "+(m%60)+" min"};
const OVP=["https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
// kategórie miest (OpenStreetMap)
const CAT=[["fuel","⛽","Čerpacie stanice",['["amenity"="fuel"]']],["food","🍽️","Reštaurácie",['["amenity"~"^(restaurant|fast_food|pub|food_court)$"]']],
  ["cafe","☕","Kaviarne",['["amenity"="cafe"]']],["truck","🅿️","Parkovanie kamióny",['["amenity"="parking"]["hgv"~"yes|designated"]','["highway"~"^(rest_area|services)$"]']],
  ["hotel","🏨","Ubytovanie",['["tourism"~"^(hotel|motel|guest_house|hostel)$"]']],["shop","🛒","Obchody",['["shop"~"^(supermarket|convenience)$"]']],
  ["repair","🔧","Servis a pneu",['["shop"~"^(car_repair|tyres|truck_repair)$"]','["craft"="mechanic"]']],["wash","🚿","Umyváreň",['["amenity"="car_wash"]']],
  ["atm","🏧","Bankomat",['["amenity"~"^(atm|bank)$"]']],["health","💊","Lekáreň a lekár",['["amenity"~"^(pharmacy|hospital|clinic|doctors)$"]']],["wc","🚻","WC",['["amenity"="toilets"]']]];
const S={cat:"fuel",me:null,wid:null,map:null,meM:null,acc:null,st:[],stL:null,dest:null,route:null,rL:[],steps:[],si:0,nav:false,follow:true,lastSay:"",wl:null,rr:0};
async function needLeaflet(){if(window.L)return;if(typeof needL==="function")return needL();await new Promise((ok,no)=>{const s=document.createElement("script");s.src=window.LEAFLET_SRC||"leaflet.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function ui(){let o=document.getElementById("emap");if(o)return o;o=document.createElement("div");o.id="emap";o.innerHTML=`
  <div class="emh"><b>🗺️ ERNTE Maps</b><span class="emgps">📡 hľadám GPS…</span><button type="button" class="emx" data-emx aria-label="Zavrieť mapu">✕</button></div>
  <div class="emm" id="emMap"></div>
  <div class="emnav" hidden><div class="emarrow">⬆️</div><div class="emtxt"><b class="emins">—</b><small class="emsub"></small></div></div>
  <div class="emcats">${CAT.map(c=>`<button type="button" data-emcat="${c[0]}" class="${c[0]==="fuel"?"on":""}">${c[1]} ${c[2]}</button>`).join("")}</div>
  <div class="emp"><div class="emst"></div><div class="emlist"></div>
   <div class="embt"><button type="button" class="emgo" data-emgo hidden>▶ Štart navigácie</button><button type="button" data-emstop hidden>■ Ukončiť</button><button type="button" data-emcenter>◎ Moja poloha</button><a class="emgg" target="_blank" rel="noopener" hidden>Google Maps</a></div>
   <div class="emsrc">Mapa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · trasy OSRM</div></div>`;
  document.body.appendChild(o);return o}
const $=s=>document.querySelector("#emap "+s);
function status(t){const e=$(".emst");if(e)e.innerHTML=t}
function gpsTxt(){const g=$(".emgps");if(!g)return;g.textContent=S.me?`📡 GPS ±${Math.round(S.me.acc)} m`:"📡 hľadám GPS…";g.classList.toggle("ok",!!S.me&&S.me.acc<=50)}
async function open(cat){if(cat&&CAT.some(c=>c[0]===cat))S.cat=cat;const o=ui();o.classList.add("on");document.documentElement.classList.add("emon");status("📡 Zisťujem tvoju presnú polohu…");
  try{await needLeaflet()}catch(x){status("Mapu sa nepodarilo načítať – skontroluj internet.");return}
  if(!S.map){S.map=L.map("emMap",{zoomControl:false,attributionControl:false}).setView([48.75,21.92],13);
    if(typeof baseLayers==="function")baseLayers(S.map);else L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(S.map);
    S.map.on("dragstart",()=>{S.follow=false})}
  setTimeout(()=>S.map.invalidateSize(),60);startGps();acquireWake()}
function close(){const o=document.getElementById("emap");if(o)o.classList.remove("on");document.documentElement.classList.remove("emon");stopNav();if(S.wid!=null){try{navigator.geolocation.clearWatch(S.wid)}catch(x){}S.wid=null}releaseWake()}
function startGps(){if(!navigator.geolocation){status("Telefón nepodporuje GPS polohu.");return}if(S.wid!=null)return;let first=true;
  S.wid=navigator.geolocation.watchPosition(p=>{const c={lat:p.coords.latitude,lng:p.coords.longitude,acc:(p.coords.accuracy??9999),hd:p.coords.heading,sp:p.coords.speed,at:Date.now()};
      if(c.acc>5000&&S.me)return;S.me=c;gpsTxt();drawMe();
      if(first&&c.acc<=1000){first=false;S.map.setView([c.lat,c.lng],14);findStations()}else if(first){status(`📡 Poloha zatiaľ nepresná (±${fd(c.acc/1000)}) – čakám na GPS… Zapni v telefóne presnú polohu.`)}
      if(S.nav)navTick()},
    e=>{status(e.code===1?"❌ Aplikácia nemá povolenú polohu. Povoľ polohu pre prehliadač / aplikáciu v nastaveniach telefónu a otvor mapu znova.":"📡 GPS signál nie je – skús to vonku alebo zapni polohu.")},
    {enableHighAccuracy:true,maximumAge:0,timeout:30000})}
function drawMe(){const c=S.me;if(!c||!S.map)return;const ll=[c.lat,c.lng];
  if(!S.meM){S.meM=L.marker(ll,{icon:L.divIcon({className:"emme",html:"<i></i>",iconSize:[22,22]}),zIndexOffset:1000}).addTo(S.map);S.acc=L.circle(ll,{radius:c.acc,color:"#38bdf8",weight:1,fillOpacity:.08}).addTo(S.map)}
  else{S.meM.setLatLng(ll);S.acc.setLatLng(ll).setRadius(c.acc)}
  if(S.follow)S.map.panTo(ll,{animate:true})}
async function overpass(c,rad){const C=CAT.find(x=>x[0]===S.cat)||CAT[0],A=`(around:${rad},${c.lat.toFixed(5)},${c.lng.toFixed(5)})`;
  const q=`[out:json][timeout:15];(${C[3].map(f=>`nwr${f}${A};`).join("")});out center 80;`;
  for(const u of OVP){try{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),12000);const r=await fetch(u,{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded"},signal:ctl.signal});clearTimeout(tm);
      if(!r.ok)continue;const j=await r.json();return (j.elements||[]).map(e=>({lat:e.lat??(e.center&&e.center.lat),lng:e.lon??(e.center&&e.center.lon),t:e.tags||{}})).filter(x=>x.lat!=null)}catch(x){}}
  throw new Error("Overpass")}
const catOf=()=>CAT.find(x=>x[0]===S.cat)||CAT[0];
async function findStations(){const c=S.me;if(!c)return;const C=catOf();status(`${C[1]} Hľadám: ${C[2].toLowerCase()} okolo teba…`);let L0=[];
  document.querySelectorAll("#emap [data-emcat]").forEach(b=>b.classList.toggle("on",b.dataset.emcat===S.cat));S.dest=null;S.route=null;S.rL.forEach(l=>l.remove());S.rL=[];stopNav();
  try{for(const rad of [5000,15000,40000]){L0=await overpass(c,rad);if(L0.length)break}}catch(x){status("Zoznam staníc sa teraz nepodarilo načítať. <button type='button' data-emretry>↻ Skúsiť znova</button>");return}
  S.st=L0.map(s=>({...s,n:s.t.name||s.t.brand||s.t.operator||C[2].replace(/e$|y$/,""),a:[s.t["addr:street"],s.t["addr:city"]].filter(Boolean).join(", "),d:km(c,s)})).sort((a,b)=>a.d-b.d).slice(0,12);
  if(S.stL)S.stL.remove();S.stL=L.layerGroup().addTo(S.map);
  S.st.forEach((s,i)=>L.marker([s.lat,s.lng],{icon:L.divIcon({className:"emfuel"+(i===0?" near":""),html:C[1],iconSize:[30,30]})}).on("click",()=>route(i)).addTo(S.stL));
  if(!S.st.length){status(`${C[1]} V okolí 40 km sa nič nenašlo.`);list();return}
  status(`${C[1]} Najbližšie: <b>${E(S.st[0].n)}</b> · ${fd(S.st[0].d)} vzdušne`);list();route(0)}
function list(){const e=$(".emlist");if(!e)return;e.innerHTML=S.st.slice(0,6).map((s,i)=>`<button type="button" class="emli${S.dest===s?" on":""}" data-emi="${i}"><b>${i===0?"🏁 ":""}${E(s.n)}</b><small>${fd(s.d)} vzdušne${s.a?" · "+E(s.a):""}</small></button>`).join("")}
async function route(i){const s=S.st[i],c=S.me;if(!s||!c)return;S.dest=s;list();status(`🛣️ Počítam trasu k <b>${E(s.n)}</b>…`);
  try{const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${c.lng.toFixed(6)},${c.lat.toFixed(6)};${s.lng.toFixed(6)},${s.lat.toFixed(6)}?overview=full&geometries=geojson&steps=true`);
    const j=await r.json();const R=j.routes&&j.routes[0];if(!R)throw new Error("route");S.route=R;S.steps=(R.legs[0].steps||[]);S.si=0;
    S.rL.forEach(l=>l.remove());const ll=R.geometry.coordinates.map(p=>[p[1],p[0]]);
    S.rL=[L.polyline(ll,{color:"#22d3ee",weight:12,opacity:.25}).addTo(S.map),L.polyline(ll,{color:"#a7f3d0",weight:5,opacity:.95,className:"emglow"}).addTo(S.map)];
    if(!S.nav){S.follow=false;S.map.fitBounds(L.latLngBounds(ll).pad(.2))}
    status(`🏁 <b>${E(s.n)}</b> · <b>${fd(R.distance/1000)}</b> · ${ft(R.duration)}${s.a?`<br><small>${E(s.a)}</small>`:""}`);
    const go=$("[data-emgo]");if(go)go.hidden=S.nav;const g=$(".emgg");if(g){g.hidden=false;g.href=`https://www.google.com/maps/dir/?api=1&origin=${c.lat},${c.lng}&destination=${s.lat},${s.lng}&travelmode=driving&dir_action=navigate`}
    if(S.nav)navTick(true)}
  catch(x){status(`Trasu sa nepodarilo vypočítať – stanica <b>${E(s.n)}</b> je ${fd(s.d)} vzdušne.`);const g=$(".emgg");if(g){g.hidden=false;g.href=`https://www.google.com/maps/dir/?api=1&origin=${c.lat},${c.lng}&destination=${s.lat},${s.lng}&travelmode=driving&dir_action=navigate`}}}
const MOD={left:"doľava",right:"doprava","slight left":"mierne doľava","slight right":"mierne doprava","sharp left":"ostro doľava","sharp right":"ostro doprava",straight:"rovno",uturn:"otočte sa"};
const ARR={left:"⬅️",right:"➡️","slight left":"↖️","slight right":"↗️","sharp left":"↩️","sharp right":"↪️",straight:"⬆️",uturn:"🔄"};
function stepTxt(st){const m=st.maneuver||{},mod=MOD[m.modifier]||"",n=st.name?` na ${st.name}`:"";
  switch(m.type){case "depart":return `Vyrazte${n}`;case "arrive":return "Ste v cieli"+(S.dest?" – "+S.dest.n:"");case "roundabout":case "rotary":return `Na kruhovom objazde ${m.exit?m.exit+". výjazd":"pokračujte"}${n}`;
    case "merge":return `Pripojte sa ${mod}${n}`;case "on ramp":return `Odbočte na nájazd ${mod}${n}`;case "off ramp":return `Zíďte ${mod}${n}`;case "fork":return `Na rozdvojení ${mod}${n}`;
    case "end of road":return `Na konci cesty ${mod}${n}`;case "continue":case "new name":return `Pokračujte ${mod||"rovno"}${n}`;default:return `Odbočte ${mod}${n}`}}
function say(t){try{if(!("speechSynthesis" in window)||t===S.lastSay)return;S.lastSay=t;const u=new SpeechSynthesisUtterance(t);u.lang="sk-SK";speechSynthesis.cancel();speechSynthesis.speak(u)}catch(x){}}
function distToRoute(c){if(!S.route)return 0;let best=1e9;const P=S.route.geometry.coordinates;for(let i=0;i<P.length;i+=Math.max(1,Math.floor(P.length/400))){const d=km(c,{lat:P[i][1],lng:P[i][0]});if(d<best)best=d}return best}
function navTick(force){const c=S.me,st=S.steps;if(!S.nav||!c||!st.length)return;
  // posun na ďalší krok, keď je manéver bližšie ako 25 m
  while(S.si<st.length-1){const m=st[S.si].maneuver.location;if(km(c,{lat:m[1],lng:m[0]})<0.025)S.si++;else break}
  const nx=st[Math.min(S.si+ (S.si===0?1:0),st.length-1)],m=nx.maneuver.location,dn=km(c,{lat:m[1],lng:m[0]}),txt=stepTxt(nx);
  const rem=st.slice(S.si).reduce((a,s)=>a+s.distance,0)/1000;
  $(".emins").textContent=txt;$(".emsub").textContent=`o ${fd(dn)} · zostáva ${fd(rem)}`;$(".emarrow").textContent=nx.maneuver.type==="arrive"?"🏁":(ARR[nx.maneuver.modifier]||"⬆️");
  if(force||dn<0.2)say((dn<0.2?"":"O "+fd(dn)+", ")+txt);
  if(nx.maneuver.type==="arrive"&&dn<0.03){say("Ste v cieli.");stopNav();status("🏁 Ste v cieli.");return}
  S.map.setView([c.lat,c.lng],Math.max(S.map.getZoom(),16),{animate:true});
  if(distToRoute(c)>0.08&&Date.now()-S.rr>15000){S.rr=Date.now();say("Prepočítavam trasu");const i=S.st.indexOf(S.dest);if(i>=0)route(i)}}
function startNav(){if(!S.route)return;S.nav=true;S.follow=true;S.si=0;$(".emnav").hidden=false;$("[data-emgo]").hidden=true;$("[data-emstop]").hidden=false;document.getElementById("emap").classList.add("navon");navTick(true)}
function stopNav(){S.nav=false;try{speechSynthesis.cancel()}catch(x){}const n=$(".emnav");if(n)n.hidden=true;const g=$("[data-emgo]");if(g)g.hidden=!S.route;const st=$("[data-emstop]");if(st)st.hidden=true;const o=document.getElementById("emap");if(o)o.classList.remove("navon")}
async function acquireWake(){try{if(navigator.wakeLock&&!S.wl)S.wl=await navigator.wakeLock.request("screen")}catch(x){}}
function releaseWake(){try{if(S.wl){S.wl.release();S.wl=null}}catch(x){}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emx],[data-emgo],[data-emstop],[data-emcenter],[data-emi],[data-emretry],[data-emcat]");if(!t)return;e.preventDefault();e.stopPropagation();
  if(t.dataset.emx!==undefined)return close();if(t.dataset.emgo!==undefined)return startNav();if(t.dataset.emstop!==undefined)return stopNav();
  if(t.dataset.emcenter!==undefined){S.follow=true;if(S.me)S.map.setView([S.me.lat,S.me.lng],16);return}
  if(t.dataset.emretry!==undefined)return findStations();if(t.dataset.emcat!==undefined){S.cat=t.dataset.emcat;return S.me?findStations():null}if(t.dataset.emi!==undefined)return route(+t.dataset.emi)},true);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&document.getElementById("emap")?.classList.contains("on"))acquireWake()});
window.ernteMaps={open,close};
// 🗺️ tlačidlo v hornej lište aplikácie (celý tím, nie farmári)
function hdrBtn(){const app=document.getElementById("app");if(!app)return;const row=app.querySelector(":scope > .hrow");const ok=typeof ROLE!=="undefined"&&ROLE&&!(typeof FARMER!=="undefined"&&FARMER);
  let b=document.querySelector(".emhb");if(!ok||!row){if(b)b.remove();return}if(b&&b.parentNode===row)return;if(b)b.remove();
  b=document.createElement("button");b.type="button";b.className="emhb";b.setAttribute("aria-label","ERNTE Maps – navigácia, čerpacie stanice, reštaurácie");b.title="ERNTE Maps";b.textContent="🗺️";b.onclick=()=>open();
  const bell=row.querySelector(".nbb");if(bell)bell.insertAdjacentElement("beforebegin",b);else row.prepend(b)}
{let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{hdrBtn()}catch(x){}})};const boot=()=>{const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot()}
{const s=document.createElement("style");s.textContent=`#emap{position:fixed;inset:0;z-index:31000;display:none;flex-direction:column;background:#05070d;color:#f1f5ff;font-family:"Geist",system-ui,sans-serif}
#emap.on{display:flex}html.emon{overflow:hidden}
.emh{display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;background:linear-gradient(135deg,rgba(14,165,233,.25),rgba(167,139,250,.2));border-bottom:1px solid rgba(255,255,255,.12)}
.emh b{font-size:1.05rem;text-shadow:0 0 12px rgba(125,211,252,.8)}.emgps{flex:1;font-size:.78rem;opacity:.85}.emgps.ok{color:#86efac}
.emx{width:44px;height:44px;min-width:44px;border-radius:50%!important;padding:0!important;display:grid;place-items:center;font-size:1.1rem}
.emm{flex:1 1 auto;min-height:200px}
.emcats{display:flex;gap:6px;overflow-x:auto;padding:8px 10px;background:#0b1020;scrollbar-width:none}.emcats::-webkit-scrollbar{display:none}
.emcats button{flex:0 0 auto;min-height:38px;padding:4px 12px;border-radius:999px;font-weight:700;font-size:.8rem;white-space:nowrap}.emcats button.on{background:linear-gradient(135deg,#22d3ee,#a3e635)!important;color:#0b1020!important;border-color:transparent!important;box-shadow:0 0 12px rgba(34,211,238,.6)}
#emap.navon .emcats{display:none}
.emnav{position:absolute;left:10px;right:10px;top:calc(66px + env(safe-area-inset-top));z-index:1000;display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:18px;background:rgba(5,46,22,.92);border:1px solid rgba(134,239,172,.6);box-shadow:0 0 24px rgba(74,222,128,.45)}
.emarrow{font-size:2.2rem;line-height:1}.emtxt{display:grid;gap:2px;min-width:0}.emins{font-size:1.1rem;font-weight:800;overflow-wrap:anywhere}.emsub{font-size:.85rem;opacity:.85}
.emp{padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#0b1020;border-top:1px solid rgba(255,255,255,.12);display:grid;gap:8px;max-height:46vh;overflow:auto}
#emap.navon .emp{max-height:22vh}#emap.navon .emlist{display:none}
.emst{font-size:.92rem;line-height:1.4}.emlist{display:grid;gap:6px}.emli{display:grid;gap:2px;text-align:left!important;justify-items:start;padding:8px 12px;border-radius:14px;min-height:48px}.emli small{opacity:.75;font-weight:500}.emli.on{border-color:rgba(34,211,238,.8)!important;box-shadow:0 0 14px rgba(34,211,238,.45)}
.embt{display:flex;gap:8px;flex-wrap:wrap}.embt button,.embt a{flex:1 1 120px;min-height:48px;border-radius:999px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.emgo{background:linear-gradient(135deg,#22c55e,#22d3ee)!important;color:#05210f!important;border:0!important;box-shadow:0 0 18px rgba(34,197,94,.6);flex-basis:100%!important;font-size:1.05rem}
.emgg{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#fff!important}
.emsrc{font-size:.62rem;opacity:.55}.emsrc a{color:inherit}
.emme i{display:block;width:22px;height:22px;border-radius:50%;background:#38bdf8;border:3px solid #fff;box-shadow:0 0 0 6px rgba(56,189,248,.3),0 0 18px rgba(56,189,248,.9)}
.emfuel{display:grid!important;place-items:center;font-size:18px;border-radius:50%;background:#0b1020;border:2px solid #fbbf24;box-shadow:0 0 10px rgba(251,191,36,.7)}.emfuel.near{border-color:#4ade80;box-shadow:0 0 16px rgba(74,222,128,.95)}
#emMap svg,#emMap img{max-width:none!important}.emglow{filter:drop-shadow(0 0 6px #22d3ee)}
.emhb{width:44px;height:44px;min-width:44px;border-radius:50%!important;padding:0!important;display:inline-grid;place-items:center;font-size:1.2rem;flex:0 0 44px}`;document.head.appendChild(s)}
})();
