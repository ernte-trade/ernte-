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
  <div class="emm"><div id="emMap"></div><div class="emhud" hidden><div><b class="emspd">0</b><small>km/h</small></div><div><b class="emrem">–</b><small>zostáva</small></div><div><b class="emeta">–</b><small>príchod</small></div></div></div>
  <div class="emnav" hidden><div class="emarrow">⬆️</div><div class="emtxt"><b class="emins">—</b><small class="emsub"></small></div></div>
  <div class="emcats"><button type="button" data-emplan class="emplb">🧭 Trasa · 🚛 cena</button>${CAT.map(c=>`<button type="button" data-emcat="${c[0]}" class="${c[0]==="fuel"?"on":""}">${c[1]} ${c[2]}</button>`).join("")}</div>
  <div class="emp"><div class="emst"></div><div class="emlist"></div>
   <div class="embt"><button type="button" class="emgo" data-emgo hidden>▶ Štart navigácie</button><button type="button" data-emstop hidden>■ Ukončiť</button><button type="button" data-emcenter>◎ Moja poloha</button><a class="emgg" target="_blank" rel="noopener" hidden>Google Maps</a></div>
   <div class="emsrc">Mapa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · trasy OSRM</div></div>`;
  document.body.appendChild(o);return o}
const $=s=>document.querySelector("#emap "+s);
function status(t){const e=$(".emst");if(e)e.innerHTML=t}
function gpsTxt(){const g=$(".emgps");if(!g)return;g.textContent=S.me?`📡 GPS ±${Math.round(S.me.acc)} m`:"📡 hľadám GPS…";g.classList.toggle("ok",!!S.me&&S.me.acc<=50)}
async function open(cat){if(cat&&CAT.some(c=>c[0]===cat))S.cat=cat;const o=ui();o.classList.add("on");if(cat==="plan")setTimeout(()=>showPlan(true),0);document.documentElement.classList.add("emon");status("📡 Zisťujem tvoju presnú polohu…");
  try{await needLeaflet()}catch(x){status("Mapu sa nepodarilo načítať – skontroluj internet.");return}
  if(!S.map){S.map=L.map("emMap",{zoomControl:false,attributionControl:false}).setView([48.75,21.92],13);
    if(typeof baseLayers==="function")baseLayers(S.map);else L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(S.map);
    S.map.on("dragstart",()=>{S.follow=false})}
  setTimeout(()=>S.map.invalidateSize(),60);startGps();acquireWake()}
function close(){const o=document.getElementById("emap");if(o)o.classList.remove("on");document.documentElement.classList.remove("emon");stopNav();if(S.wid!=null){try{navigator.geolocation.clearWatch(S.wid)}catch(x){}S.wid=null}releaseWake()}
function startGps(){if(!navigator.geolocation){status("Telefón nepodporuje GPS polohu.");return}if(S.wid!=null)return;let first=true;
  S.wid=navigator.geolocation.watchPosition(p=>{const c={lat:p.coords.latitude,lng:p.coords.longitude,acc:(p.coords.accuracy??9999),hd:p.coords.heading,sp:p.coords.speed,at:Date.now()};
      if(c.acc>5000&&S.me)return;liveBearing(c);S.me=c;gpsTxt();drawMe();
      if(first&&c.acc<=1000){first=false;if(S.mode!=="plan"){S.map.setView([c.lat,c.lng],14);findStations()}}else if(first){status(`📡 Poloha zatiaľ nepresná (±${fd(c.acc/1000)}) – čakám na GPS… Zapni v telefóne presnú polohu.`)}
      if(S.nav)navTick()},
    e=>{status(e.code===1?"❌ Aplikácia nemá povolenú polohu. Povoľ polohu pre prehliadač / aplikáciu v nastaveniach telefónu a otvor mapu znova.":"📡 GPS signál nie je – skús to vonku alebo zapni polohu.")},
    {enableHighAccuracy:true,maximumAge:0,timeout:30000})}
function drawMe(){const c=S.me;if(!c||!S.map)return;const ll=[c.lat,c.lng];
  if(!S.meM){S.meM=L.marker(ll,{icon:L.divIcon({className:"emme",html:"<i></i>",iconSize:[22,22]}),zIndexOffset:1000}).addTo(S.map);S.acc=L.circle(ll,{radius:c.acc,color:"#38bdf8",weight:1,fillOpacity:.08}).addTo(S.map)}
  else{S.meM.setLatLng(ll);S.acc.setLatLng(ll).setRadius(c.acc)}
  if(S.follow)S.map.panTo(ll,{animate:true})}
// Overpass býva preťažený (502 / bez odpovede) → naraz všetky zrkadlá + Nominatim (OSM vyhľadávanie, spoľahlivé); vyhrá prvý s výsledkom
const NOM={fuel:[["amenity","fuel"]],food:[["amenity","restaurant"],["amenity","fast_food"]],cafe:[["amenity","cafe"]],truck:[["q","truck stop"],["amenity","parking"]],
  hotel:[["q","hotel"],["q","penzión"]],shop:[["q","supermarket"]],repair:[["q","car repair"],["q","pneuservis"]],wash:[["amenity","car_wash"]],atm:[["amenity","atm"]],
  health:[["amenity","pharmacy"]],wc:[["amenity","toilets"]]};
function tmo(ms){const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal}
async function ovpOne(u,q){const r=await fetch(u,{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded"},signal:tmo(15000)});
  if(!r.ok)throw new Error(r.status);const j=await r.json();const L=(j.elements||[]).map(e=>({lat:e.lat??(e.center&&e.center.lat),lng:e.lon??(e.center&&e.center.lon),t:e.tags||{}})).filter(x=>x.lat!=null);
  if(!L.length)throw new Error("0");return L}
async function overpass(c,rad){const C=catOf(),A=`(around:${rad},${c.lat.toFixed(5)},${c.lng.toFixed(5)})`;
  const q=`[out:json][timeout:15];(${C[3].map(f=>`nwr${f}${A};`).join("")});out center 80;`;return Promise.any(OVP.map(u=>ovpOne(u,q)))}
async function nominatim(c,rad){const dl=rad/111320,dg=rad/(111320*Math.cos(c.lat*Math.PI/180)),vb=[c.lng-dg,c.lat+dl,c.lng+dg,c.lat-dl].map(x=>x.toFixed(5)).join(",");
  const out=[],seen=new Set();for(const [k,v] of (NOM[S.cat]||NOM.fuel)){try{
    const r=await fetch(`https://nominatim.openstreetmap.org/search?${k}=${encodeURIComponent(v)}&format=jsonv2&addressdetails=1&extratags=1&limit=40&bounded=1&viewbox=${vb}&accept-language=sk`,{signal:tmo(12000)});
    if(!r.ok)continue;for(const e of await r.json()){if(seen.has(e.osm_id))continue;seen.add(e.osm_id);const ad=e.address||{},x=e.extratags||{};
      out.push({lat:+e.lat,lng:+e.lon,t:{name:e.name||x.brand||"",brand:x.brand,operator:x.operator,"addr:street":[ad.road,ad.house_number].filter(Boolean).join(" "),"addr:city":ad.village||ad.town||ad.city||""}})}}catch(x){}}
  if(!out.length)throw new Error("0");return out}
const catOf=()=>CAT.find(x=>x[0]===S.cat)||CAT[0];
async function findStations(){const c=S.me;if(!c)return;const C=catOf();status(`${C[1]} Hľadám: ${C[2].toLowerCase()} okolo teba…`);let L0=[];
  document.querySelectorAll("#emap [data-emcat]").forEach(b=>b.classList.toggle("on",b.dataset.emcat===S.cat));S.dest=null;S.route=null;S.rL.forEach(l=>l.remove());S.rL=[];stopNav();
  for(const rad of [8000,25000,50000]){try{L0=await Promise.any([overpass(c,rad),nominatim(c,rad)])}catch(x){L0=[]}if(L0.length)break;status(`${C[1]} Hľadám ďalej (${Math.round(rad/1000)} km+)…`)}
  if(!L0.length){status(`${C[1]} Nič sa nenašlo do 50 km alebo mapové služby neodpovedajú. <button type='button' data-emretry>↻ Skúsiť znova</button>`);if(S.stL)S.stL.remove();S.st=[];list();return}
  S.st=L0.map(s=>({...s,n:s.t.name||s.t.brand||s.t.operator||C[2].replace(/e$|y$/,""),a:[s.t["addr:street"],s.t["addr:city"]].filter(Boolean).join(", "),d:km(c,s)})).sort((a,b)=>a.d-b.d).slice(0,12);
  if(S.stL)S.stL.remove();S.stL=L.layerGroup().addTo(S.map);
  S.st.forEach((s,i)=>L.marker([s.lat,s.lng],{icon:L.divIcon({className:"emfuel"+(i===0?" near":""),html:C[1],iconSize:[30,30]})}).on("click",()=>route(i)).addTo(S.stL));
  if(!S.st.length){status(`${C[1]} V okolí sa nič nenašlo.`);list();return}
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
function stepTxt(st){if(st.txt)return st.txt;const m=st.maneuver||{},mod=MOD[m.modifier]||"",n=st.name?` na ${st.name}`:"";
  switch(m.type){case "depart":return `Vyrazte${n}`;case "arrive":return "Ste v cieli"+(S.dest?" – "+S.dest.n:"");case "roundabout":case "rotary":return `Na kruhovom objazde ${m.exit?m.exit+". výjazd":"pokračujte"}${n}`;
    case "merge":return `Pripojte sa ${mod}${n}`;case "on ramp":return `Odbočte na nájazd ${mod}${n}`;case "off ramp":return `Zíďte ${mod}${n}`;case "fork":return `Na rozdvojení ${mod}${n}`;
    case "end of road":return `Na konci cesty ${mod}${n}`;case "continue":case "new name":return `Pokračujte ${mod||"rovno"}${n}`;default:return `Odbočte ${mod}${n}`}}
function say(t){try{if(!("speechSynthesis" in window)||t===S.lastSay)return;S.lastSay=t;const u=new SpeechSynthesisUtterance(t);u.lang="sk-SK";speechSynthesis.cancel();speechSynthesis.speak(u)}catch(x){}}
function distToRoute(c){if(!S.route)return 0;let best=1e9;const P=S.route.geometry.coordinates;for(let i=0;i<P.length;i+=Math.max(1,Math.floor(P.length/400))){const d=km(c,{lat:P[i][1],lng:P[i][0]});if(d<best)best=d}return best}
// 🎥 LIVE navigácia: mapa ide s tebou, otáča sa v smere jazdy (hore = smer) a je naklonená ako v 3D
function liveBearing(c){const p=S.me;let b=null;if(c.hd!=null&&!isNaN(c.hd)&&(c.sp||0)>1.5)b=c.hd;
  else if(p&&km(p,c)>0.008){const y=Math.sin((c.lng-p.lng)*Math.PI/180)*Math.cos(c.lat*Math.PI/180),x=Math.cos(p.lat*Math.PI/180)*Math.sin(c.lat*Math.PI/180)-Math.sin(p.lat*Math.PI/180)*Math.cos(c.lat*Math.PI/180)*Math.cos((c.lng-p.lng)*Math.PI/180);b=(Math.atan2(y,x)*180/Math.PI+360)%360}
  if(b==null)return;let d=b-((S.brg||0)%360+360)%360;if(d>180)d-=360;if(d<-180)d+=360;S.brg=(S.brg||0)+d;S.spd=c.sp}
function liveView(on){const m=document.getElementById("emMap"),h=$(".emhud");if(!m)return;m.classList.toggle("navmap",on);if(h)h.hidden=!on;
  if(!on){m.style.removeProperty("--rot");const i=document.querySelector("#emap .emme i");if(i)i.style.transform=""}
  setTimeout(()=>{try{S.map.invalidateSize(false);if(on&&S.me)S.map.setView([S.me.lat,S.me.lng],17,{animate:false})}catch(x){}},50)}
function liveTick(){const c=S.me,m=document.getElementById("emMap");if(!c||!m||!m.classList.contains("navmap"))return;
  m.style.setProperty("--rot",(-(S.brg||0))+"deg");const i=document.querySelector("#emap .emme i");if(i)i.style.transform=`rotate(${S.brg||0}deg)`;
  const v=(S.spd!=null&&S.spd>=0?S.spd:0)*3.6,z=v>75?15:v>35?16:17;S.map.setView([c.lat,c.lng],z,{animate:true,duration:.8,easeLinearity:1});
  const sp=$(".emspd");if(sp)sp.textContent=Math.round(v)}
function navTick(force){const c=S.me,st=S.steps;if(!S.nav||!c||!st.length)return;
  // posun na ďalší krok, keď je manéver bližšie ako 25 m
  while(S.si<st.length-1){const m=st[S.si].maneuver.location;if(km(c,{lat:m[1],lng:m[0]})<0.025)S.si++;else break}
  const nx=st[Math.min(S.si+ (S.si===0?1:0),st.length-1)],m=nx.maneuver.location,dn=km(c,{lat:m[1],lng:m[0]}),txt=stepTxt(nx);
  const rem=st.slice(S.si).reduce((a,s)=>a+s.distance,0)/1000;
  liveTick();{const R=S.route,tot=(R&&R.distance)||1,left=Math.max(0,rem*1000),sec=R&&R.duration?R.duration*left/tot:0;const re=$(".emrem");if(re)re.textContent=fd(rem);const et=$(".emeta");if(et&&sec)et.textContent=new Date(Date.now()+sec*1000).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}
  $(".emins").textContent=txt;$(".emsub").textContent=`o ${fd(dn)} · zostáva ${fd(rem)}`;$(".emarrow").textContent=nx.maneuver.type==="arrive"?"🏁":(ARR[nx.maneuver.modifier]||"⬆️");
  if(force||dn<0.2)say((dn<0.2?"":"O "+fd(dn)+", ")+txt);
  if(nx.maneuver.type==="arrive"&&dn<0.03){say("Ste v cieli.");stopNav();status("🏁 Ste v cieli.");return}
    if(distToRoute(c)>0.08&&Date.now()-S.rr>15000){S.rr=Date.now();say("Prepočítavam trasu");if(S.mode==="plan"&&S.replan)S.replan();else{const i=S.st.indexOf(S.dest);if(i>=0)route(i)}}}
function startNav(){if(!S.route)return;S.nav=true;S.follow=true;S.si=0;$(".emnav").hidden=false;$("[data-emgo]").hidden=true;$("[data-emstop]").hidden=false;document.getElementById("emap").classList.add("navon");liveView(true);navTick(true)}
function stopNav(){S.nav=false;try{speechSynthesis.cancel()}catch(x){}const n=$(".emnav");if(n)n.hidden=true;const g=$("[data-emgo]");if(g)g.hidden=!S.route;const st=$("[data-emstop]");if(st)st.hidden=true;const o=document.getElementById("emap");if(o&&o.classList.contains("navon")){o.classList.remove("navon");liveView(false)}}
async function acquireWake(){try{if(navigator.wakeLock&&!S.wl)S.wl=await navigator.wakeLock.request("screen")}catch(x){}}
function releaseWake(){try{if(S.wl){S.wl.release();S.wl=null}}catch(x){}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emx],[data-emgo],[data-emstop],[data-emcenter],[data-emi],[data-emretry],[data-emcat]");if(!t)return;e.preventDefault();e.stopPropagation();
  if(t.dataset.emx!==undefined)return close();if(t.dataset.emgo!==undefined)return startNav();if(t.dataset.emstop!==undefined)return stopNav();
  if(t.dataset.emcenter!==undefined){S.follow=true;if(S.me)S.map.setView([S.me.lat,S.me.lng],16);return}
  if(t.dataset.emretry!==undefined)return findStations();if(t.dataset.emcat!==undefined){S.cat=t.dataset.emcat;showPlan(false);P.res=null;return S.me?findStations():null}if(t.dataset.emi!==undefined)return route(+t.dataset.emi)},true);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&document.getElementById("emap")?.classList.contains("on"))acquireWake()});
// ===== 🚛 TRASA A CENA PREPRAVY (príkaz majiteľa 30. 10.) =====
// Odkiaľ → kam, kamiónová trasa (Valhalla, profil truck 40 t / 5 náprav), mýto podľa krajín a tried ciest, nafta podľa skutočnej ceny,
// ostatné pohyblivé náklady ako Kalkulačka (sadzba €/km pri referenčnej nafte), prázdny návrat, marža → návrh ceny prepravy. Navigácia po tejto trase.
const PK="ernte-plan-cfg";
const CL=m=>m==="truck"?"🚛 Vypočítať trasu a cenu prepravy":m==="auto"?"🚗 Vypočítať trasu autom":"🚶 Vypočítať trasu pešo";
const VH="https://valhalla1.openstreetmap.de";
const CN={SK:"Slovensko",HU:"Maďarsko",CZ:"Česko",AT:"Rakúsko",PL:"Poľsko",DE:"Nemecko",RO:"Rumunsko",UA:"Ukrajina",SI:"Slovinsko",HR:"Chorvátsko",RS:"Srbsko",IT:"Taliansko"};
const FLAG={SK:"🇸🇰",HU:"🇭🇺",CZ:"🇨🇿",AT:"🇦🇹",PL:"🇵🇱",DE:"🇩🇪",RO:"🇷🇴",UA:"🇺🇦",SI:"🇸🇮",HR:"🇭🇷",RS:"🇷🇸",IT:"🇮🇹"};
// mýto €/km, kamión nad 12 t, 5 náprav, EURO 6: m = diaľnica + rýchlostná cesta, p = cesta I. triedy. SK, HU, AT ako Kalkulačka; ostatné orientačne – uprav v ⚙️.
const TOLL0=huf=>({SK:{m:0.1942,p:0.09},HU:{m:+(192.38/huf).toFixed(4),p:+(192.38/huf).toFixed(4)},AT:{m:0.5724,p:0},CZ:{m:0.25,p:0.12},PL:{m:0.14,p:0.105},DE:{m:0.348,p:0.348},SI:{m:0.3,p:0},HR:{m:0.2,p:0},RO:{m:0.03,p:0.03},"*":{m:0.2,p:0}});
const P={a:null,b:null,res:null,mk:null,cfg:null};
function mkLoad(){if(P.mk)return Promise.resolve(P.mk);return fetch("market.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>(P.mk=j||{},P.mk))}
function cfg(){if(P.cfg)return P.cfg;const f=(P.mk&&P.mk.fuel)||{},rf=f.ref||{ekm:1.6,cons:0.32,netL:1.5551},huf=(P.mk&&P.mk.fx&&P.mk.fx.huf)||366;
  let c={};try{c=JSON.parse(localStorage.getItem(PK)||"{}")}catch(x){}
  P.cfg=Object.assign({mode:"truck",t:25,ret:true,marza:10,cons:+(rf.cons*100).toFixed(1),other:+(rf.ekm-rf.cons*rf.netL).toFixed(3),skL:f.sk&&f.sk.netL||rf.netL,huL:f.hu&&f.hu.netL||rf.netL,toll:TOLL0(huf)},c);
  P.cfg.toll=Object.assign(TOLL0(huf),c.toll||{});return P.cfg}
function cfgSave(){try{const c=P.cfg,o={mode:c.mode,t:c.t,ret:c.ret,marza:c.marza,cons:c.cons,other:c.other,toll:c.toll};localStorage.setItem(PK,JSON.stringify(o))}catch(x){}}
const n2=(x,d=2)=>Number.isFinite(x)?x.toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d}):"–";
const eur=x=>n2(x,0)+" €";
function dec6(s){const o=[];let i=0,la=0,ln=0;while(i<s.length){for(const k of [0,1]){let b,sh=0,r=0;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<sh;sh+=5}while(b>=32);const d=r&1?~(r>>1):r>>1;if(k)ln+=d;else la+=d}o.push([la/1e6,ln/1e6])}return o}
const VT={1:"depart",2:"depart",3:"depart",4:"arrive",5:"arrive",6:"arrive",26:"roundabout",27:"roundabout"};
const VM={2:"right",3:"left",9:"slight right",10:"right",11:"sharp right",12:"uturn",13:"uturn",14:"sharp left",15:"left",16:"slight left",18:"slight right",19:"slight left",20:"slight right",21:"slight left",23:"slight right",24:"slight left",37:"slight right",38:"slight left"};
async function geo(q){q=String(q||"").trim();const m=q.match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);if(m)return [{n:q,lat:+m[1].replace(",","."),lng:+m[2].replace(",",".")}];
  if(q.length<3)return [];const c=S.me,u=`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7${c?`&lat=${c.lat.toFixed(4)}&lon=${c.lng.toFixed(4)}`:""}`;
  try{const r=await fetch(u,{signal:tmo(8000)});if(r.ok){const j=await r.json();const o=(j.features||[]).map(f=>{const p=f.properties||{},g=f.geometry.coordinates;
      const n=[p.name,[p.street,p.housenumber].filter(Boolean).join(" ")].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(", ")||p.city||"";const w=[p.postcode,p.city&&p.city!==p.name?p.city:"",p.countrycode].filter(Boolean).join(" ");
      return {n:n||w,w,lat:g[1],lng:g[0]}});if(o.length)return o}}catch(x){}
  try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=6&accept-language=sk`,{signal:tmo(8000)});if(r.ok)return (await r.json()).map(e=>({n:e.name||e.display_name.split(",")[0],w:e.display_name.split(",").slice(1,3).join(","),lat:+e.lat,lng:+e.lon}))}catch(x){}
  return []}
let acT=0,acSeq=0;
function sug(which,list){const e=$(".emsug");if(!e)return;e.dataset.w=which;e.innerHTML=list.map((s,i)=>`<button type="button" class="emsg" data-emsg="${i}"><b>${E(s.n)}</b>${s.w?`<small>${E(s.w)}</small>`:""}</button>`).join("");P.sl=list}
function planUI(){const c=cfg(),T=c.toll,rows=Object.keys(T).map(k=>`<div class="emtr"><span>${FLAG[k]||"🌍"} ${k==="*"?"ostatné (spoplatnené úseky)":E(CN[k]||k)}</span><input inputmode="decimal" data-emtl="${k}.m" value="${n2(T[k].m,4)}" aria-label="mýto diaľnica ${k}"><input inputmode="decimal" data-emtl="${k}.p" value="${n2(T[k].p,4)}" aria-label="mýto I. trieda ${k}"></div>`).join("");
  const MD=[["truck","🚛 Kamión"],["auto","🚗 Autom"],["pedestrian","🚶 Pešo"]];
  return `<div class="emmd" role="group" aria-label="Spôsob dopravy">${MD.map(m=>`<button type="button" data-emmd="${m[0]}" class="${c.mode===m[0]?"on":""}">${m[1]}</button>`).join("")}</div>
  <div class="emab"><label><small>Odkiaľ</small><input data-emf="a" autocomplete="off" placeholder="📍 Moja poloha" value="${E(P.a&&!P.a.me?P.a.n:"")}"></label>
  <label><small>Kam</small><input data-emf="b" autocomplete="off" placeholder="Mesto, adresa, firma alebo GPS" value="${E(P.b?P.b.n:"")}"></label></div><div class="emsug"></div>
  <div class="emrw emtk"><label><small>Náklad t</small><input inputmode="decimal" data-emc="t" value="${n2(c.t,0)}"></label><label><small>Marža %</small><input inputmode="decimal" data-emc="marza" value="${n2(c.marza,0)}"></label>
  <label class="emck"><input type="checkbox" data-emc="ret" ${c.ret?"checked":""}><span>prázdny návrat</span></label></div>
  <details class="emcfg emtk"><summary>⚙️ Náklady, nafta a mýto</summary><div class="emrw"><label><small>Spotreba l/100</small><input inputmode="decimal" data-emc="cons" value="${n2(c.cons,1)}"></label>
   <label><small>Ostatné €/km</small><input inputmode="decimal" data-emc="other" value="${n2(c.other,3)}"></label></div>
   <div class="emrw"><label><small>Nafta SK €/l bez DPH</small><input inputmode="decimal" data-emc="skL" value="${n2(c.skL,3)}"></label><label><small>Nafta HU €/l bez DPH</small><input inputmode="decimal" data-emc="huL" value="${n2(c.huL,3)}"></label></div>
   <small class="emnote">Ostatné pohyblivé náklady (vodič, pneu, servis, AdBlue, odpisy) = sadzba Kalkulačky ${n2(1.6)} €/km mínus nafta pri referenčnej cene. Nafta = aktuálny priemer SK / HU bez DPH (market.json), v ostatných krajinách cena SK.</small>
   <div class="emtr emth"><span>Mýto €/km (5 náprav, EURO 6)</span><b>diaľnica</b><b>I. trieda</b></div>${rows}
   <small class="emnote">SK, HU, AT ako Kalkulačka; CZ, PL, DE a ostatné sú orientačné – over a uprav sadzby. Ukladá sa v tomto zariadení.</small></details>
  <button type="button" class="emgo emcalc" data-emcalc>${CL(c.mode)}</button><div class="emres">${P.res?resHTML(P.res):""}</div>`}
function showPlan(on){S.mode=on?"plan":"poi";const o=document.getElementById("emap");if(!o)return;o.classList.toggle("plan",on);
  document.querySelectorAll("#emap [data-emcat]").forEach(b=>b.classList.toggle("on",!on&&b.dataset.emcat===S.cat));const pb=$("[data-emplan]");if(pb)pb.classList.toggle("on",on);
  let pl=$(".empl");if(on){if(!pl){pl=document.createElement("div");pl.className="empl";$(".emp").prepend(pl)}mkLoad().then(()=>{pl.innerHTML=planUI();pl.dataset.md=cfg().mode});
    if(S.stL){S.stL.remove();S.stL=null}if(!P.res){S.route=null;S.rL.forEach(l=>l.remove());S.rL=[];stopNav()}}
  else if(pl)pl.remove()}
function rdNum(v){const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null}
async function calc(){const c=cfg(),btn=$("[data-emcalc]"),out=$(".emres");
  const ia=$("[data-emf=a]"),ib=$("[data-emf=b]");
  if(!P.b||(ib&&ib.value.trim()&&ib.value.trim()!==P.b.n)){const g=ib&&ib.value.trim()?await geo(ib.value):[];if(!g.length){out.innerHTML=`<div class="emerr">Zadaj cieľ „Kam“ (mesto, adresu alebo GPS) a vyber ho zo zoznamu.</div>`;return}P.b=g[0];ib.value=g[0].n}
  if(ia&&ia.value.trim()&&(!P.a||P.a.me||ia.value.trim()!==P.a.n)){const g=await geo(ia.value);if(!g.length){out.innerHTML=`<div class="emerr">Miesto „Odkiaľ“ som nenašiel.</div>`;return}P.a=g[0];ia.value=g[0].n}
  if(!ia||!ia.value.trim()){if(!S.me){out.innerHTML=`<div class="emerr">📡 Čakám na tvoju GPS polohu – alebo napíš „Odkiaľ“.</div>`;return}P.a={n:"Moja poloha",lat:S.me.lat,lng:S.me.lng,me:true}}
  btn.disabled=true;btn.textContent="🛣️ Počítam trasu…";out.innerHTML="";
  try{const R=await truckRoute(P.a,P.b);if(c.mode==="truck"){btn.textContent="💶 Počítam mýto a náklady…";const A=await tollSplit(R).catch(()=>null);P.res=price(R,A)}
    else P.res={simple:true,mode:c.mode,a:P.a.n,b:P.b.n,D:R.distance/1000,dur:R.duration,src:R.src};drawPlan(R);out.innerHTML=resHTML(P.res)}
  catch(x){out.innerHTML=`<div class="emerr">Trasu sa nepodarilo vypočítať (${E(x.message||x)}). Skús znova o chvíľu.</div>`}
  btn.disabled=false;btn.textContent=CL(c.mode)}
async function truckRoute(a,b){const md=cfg().mode,body={locations:[{lat:a.lat,lon:a.lng},{lat:b.lat,lon:b.lng}],costing:md,
    costing_options:md!=="truck"?{}:{truck:{height:4,width:2.55,length:16.5,weight:40,axle_load:11.5,axle_count:5,hazmat:false}},language:"sk-SK",units:"kilometers",directions_options:{language:"sk-SK"}};
  let r;try{r=await fetch(VH+"/route",{method:"POST",body:JSON.stringify(body),headers:{"Content-Type":"application/json"},signal:tmo(30000)})}catch(x){r=null}
  if(r&&r.ok){const j=await r.json(),t=j.trip,lg=t.legs[0],pts=dec6(lg.shape);
    const steps=(lg.maneuvers||[]).map(m=>({distance:(m.length||0)*1000,name:(m.street_names||[])[0]||"",txt:m.instruction,say:m.verbal_pre_transition_instruction||m.instruction,
      maneuver:{type:VT[m.type]||"turn",modifier:VM[m.type]||"straight",location:[pts[m.begin_shape_index][1],pts[m.begin_shape_index][0]]}}));
    return {src:md,shape:lg.shape,pts,distance:t.summary.length*1000,duration:t.summary.time,geometry:{coordinates:pts.map(p=>[p[1],p[0]])},legs:[{steps}]}}
  // záloha: OSRM (osobné auto) – mýto sa odhadne z ciest, ktorými trasa ide, bez tried
  const o=await fetch(`${md==="pedestrian"?"https://routing.openstreetmap.de/routed-foot/route/v1/driving/":"https://router.project-osrm.org/route/v1/driving/"}${a.lng.toFixed(6)},${a.lat.toFixed(6)};${b.lng.toFixed(6)},${b.lat.toFixed(6)}?overview=full&geometries=geojson&steps=true`,{signal:tmo(20000)});
  if(!o.ok)throw new Error("služby trás neodpovedajú");const R=(await o.json()).routes[0];if(!R)throw new Error("trasa neexistuje");R.src=md==="pedestrian"?"pedestrian":"car";R.pts=R.geometry.coordinates.map(p=>[p[1],p[0]]);return R}
async function tollSplit(R){if(R.src!=="truck")return null;
  const r=await fetch(VH+"/trace_attributes",{method:"POST",headers:{"Content-Type":"application/json"},signal:tmo(40000),
    body:JSON.stringify({encoded_polyline:R.shape,costing:"truck",shape_match:"edge_walk",filters:{attributes:["edge.length","edge.road_class","edge.toll","node.admin_index","admin.country_code"],action:"include"}})});
  if(!r.ok)throw new Error("trace");const j=await r.json(),ad=(j.admins||[]).map(a=>a.country_code||"?"),C={};
  for(const e of j.edges||[]){const cc=ad[(e.end_node||{}).admin_index]||ad[0]||"?",x=C[cc]||(C[cc]={km:0,m:0,p:0,t:0});const l=e.length||0;x.km+=l;
    if(e.road_class==="motorway"||e.road_class==="trunk")x.m+=l;else if(e.road_class==="primary")x.p+=l;else if(e.toll)x.t+=l}
  return C}
function price(R,C){const c=cfg(),f=c.ret?2:1,D=R.distance/1000,cons=c.cons/100,T=c.toll;
  if(!C){C={SK:{km:D,m:0,p:0,t:0,est:true}}}
  const rows=Object.entries(C).filter(([k,x])=>x.km>0.05).map(([k,x])=>{const tr=T[k]||T["*"],L=k==="HU"?c.huL:c.skL;
    const toll=(x.m*tr.m+x.p*tr.p+x.t*T["*"].m)*f,fuelL=x.km*cons*f,fuel=fuelL*L,tkm=(tr.m?x.m:0)+(tr.p?x.p:0)+x.t;return {k,km:x.km,tkm,toll,fuelL,fuel,L}}).sort((a,b)=>b.km-a.km);
  const fuel=rows.reduce((a,r)=>a+r.fuel,0),toll=rows.reduce((a,r)=>a+r.toll,0),other=D*c.other*f,tot=fuel+toll+other,offer=tot*(1+c.marza/100);
  return {a:P.a.n,b:P.b.n,D,dur:R.duration,src:R.src,est:!C||Object.values(C).some(x=>x.est),rows,fuel,toll,other,tot,offer,f,t:c.t,marza:c.marza,ret:c.ret,cons:c.cons,oth:c.other}}
function resHTML(X){if(X.simple)return `<div class="emcard emsim"><div class="emhd"><b>${X.mode==="pedestrian"?"🚶":"🚗"} ${E(X.a)} → ${E(X.b)}</b><small>${fd(X.D)} · ${ft(X.dur)} ${X.mode==="pedestrian"?"pešo":"autom"}</small></div>
  <div class="embt"><button type="button" class="emgo" data-emgo>▶ Štart navigácie</button></div></div>`;
  const fl=X.rows.reduce((a,r)=>a+r.fuelL,0);
  return `<div class="emcard"><div class="emhd"><b>🚛 ${E(X.a)} → ${E(X.b)}</b><small>${fd(X.D)} · ${ft(X.dur)} ${X.src==="truck"?"· kamiónová trasa 40 t":"· ⚠️ záloha osobná trasa (kamiónová služba neodpovedá)"}${X.ret?` · s prázdnym návratom ${fd(X.D*2)}`:""}</small></div>
  <div class="emtb">${X.rows.map(r=>`<div><span>${FLAG[r.k]||"🌍"} ${E(CN[r.k]||r.k)}</span><small>${n2(r.km,0)} km · mýtne ${n2(r.tkm,0)} km</small><small>⛽ ${n2(r.fuelL*1,0)} l × ${n2(r.L,3)} = ${eur(r.fuel)}</small><small>🛣️ mýto ${eur(r.toll)}</small></div>`).join("")}</div>
  <div class="emsum"><span>⛽ Nafta ${n2(fl,0)} l</span><b>${eur(X.fuel)}</b><span>🛣️ Mýto${X.est?" (odhad nedostupný)":""}</span><b>${eur(X.toll)}</b><span>🔧 Ostatné pohyblivé (${n2(X.oth,3)} €/km)</span><b>${eur(X.other)}</b>
   <span class="emtot">Náklady spolu</span><b class="emtot">${eur(X.tot)}</b><span>na tonu (${n2(X.t,0)} t) · na km</span><b>${n2(X.tot/X.t)} €/t · ${n2(X.tot/X.D)} €/km</b></div>
  <div class="emoffer"><small>💶 Navrhovaná cena prepravy (marža ${n2(X.marza,0)} %)</small><b>${eur(X.offer)}</b><span>${n2(X.offer/X.t)} €/t · ${n2(X.offer/X.D)} €/km</span></div>
  <div class="embt"><button type="button" class="emgo" data-emgo>▶ Štart navigácie</button><button type="button" data-emcopy>📋 Kopírovať cenu</button></div></div>`}
function drawPlan(R){S.route=R;S.steps=R.legs[0].steps||[];S.si=0;S.dest={n:P.b.n,lat:P.b.lat,lng:P.b.lng};S.replan=replan;
  S.rL.forEach(l=>l.remove());const ll=R.pts;
  const md=cfg().mode,c1=md==="truck"?"#f59e0b":md==="auto"?"#22d3ee":"#a78bfa",c2=md==="truck"?"#fde68a":md==="auto"?"#a7f3d0":"#ddd6fe";
  S.rL=[L.polyline(ll,{color:c1,weight:12,opacity:.25}).addTo(S.map),L.polyline(ll,{color:c2,weight:5,opacity:.95,className:"emglow"}).addTo(S.map),
    L.marker(ll[0],{icon:L.divIcon({className:"emfuel",html:"🅰️",iconSize:[30,30]})}).addTo(S.map),L.marker(ll[ll.length-1],{icon:L.divIcon({className:"emfuel near",html:"🏁",iconSize:[30,30]})}).addTo(S.map)];
  S.follow=false;S.map.fitBounds(L.latLngBounds(ll).pad(.15));const st=$(".emst");if(st)st.innerHTML="";const g=$(".emgg");if(g){g.hidden=false;g.href=`https://www.google.com/maps/dir/?api=1&origin=${P.a.lat},${P.a.lng}&destination=${P.b.lat},${P.b.lng}&travelmode=${cfg().mode==="pedestrian"?"walking":"driving"}`}}
// pri zídení z trasy počas navigácie: nová kamiónová trasa z mojej polohy do cieľa (cena sa nemení)
async function replan(){if(!S.me||!P.b)return;try{const R=await truckRoute({lat:S.me.lat,lng:S.me.lng},P.b);S.route=R;S.steps=R.legs[0].steps||[];S.si=0;
  S.rL.slice(0,2).forEach(l=>l.setLatLngs(R.pts));navTick(true)}catch(x){}}
function copyTxt(){const X=P.res;if(!X)return;const t=`Preprava ${X.a} → ${X.b}: ${n2(X.D,0)} km${X.ret?" (+ prázdny návrat)":""}, ${n2(X.t,0)} t. Náklady ${eur(X.tot)} (nafta ${eur(X.fuel)}, mýto ${eur(X.toll)}, ostatné ${eur(X.other)}). Cena ${eur(X.offer)} = ${n2(X.offer/X.t)} €/t.`;
  try{navigator.clipboard.writeText(t);if(typeof toast==="function")toast("📋 Skopírované",2500)}catch(x){}}
document.addEventListener("input",e=>{const t=e.target;if(!t.closest||!t.closest("#emap .empl"))return;
  if(t.dataset.emf){const w=t.dataset.emf;if(w==="b")P.b=null;else P.a=null;clearTimeout(acT);const q=t.value,sq=++acSeq;acT=setTimeout(async()=>{const g=await geo(q);if(sq===acSeq)sug(w,g)},350);return}
  if(t.dataset.emc){const c=cfg(),k=t.dataset.emc;if(k==="ret")c.ret=t.checked;else{const v=rdNum(t.value);if(v!=null)c[k]=v}cfgSave();return}
  if(t.dataset.emtl){const [k,w]=t.dataset.emtl.split("."),v=rdNum(t.value);if(v!=null){cfg().toll[k][w]=v;cfgSave()}}},true);
document.addEventListener("change",e=>{const t=e.target;if(t.dataset&&t.dataset.emc==="ret"){cfg().ret=t.checked;cfgSave()}},true);
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emplan],[data-emsg],[data-emcalc],[data-emcopy],[data-emmd]");if(!t||!t.closest("#emap"))return;e.preventDefault();e.stopPropagation();
  if(t.dataset.emplan!==undefined)return showPlan(true);if(t.dataset.emmd!==undefined){const c=cfg();c.mode=t.dataset.emmd;cfgSave();const pl=$(".empl");pl.dataset.md=c.mode;pl.querySelectorAll("[data-emmd]").forEach(b=>b.classList.toggle("on",b===t));$("[data-emcalc]").textContent=CL(c.mode);if(P.b)calc();return}if(t.dataset.emcalc!==undefined)return calc();if(t.dataset.emcopy!==undefined)return copyTxt();
  if(t.dataset.emsg!==undefined){const box=$(".emsug"),w=box.dataset.w,s=(P.sl||[])[+t.dataset.emsg];if(!s)return;P[w]=s;const i=$(`[data-emf=${w}]`);if(i)i.value=s.n;box.innerHTML="";
    if(w==="a"&&!P.b){const ib=$("[data-emf=b]");if(ib)ib.focus()}else if(P.b)calc()}},true);
const OK=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK()&&!window.ERNTE_VIEWAS; // príkaz majiteľa 30. 10.: ERNTE Maps iba Martin
window.ernteMaps={open:c=>OK()?open(c):null,close,ok:OK};
// 🗺️ tlačidlo v hornej lište aplikácie (iba Martin)
function hdrBtn(){const app=document.getElementById("app");if(!app)return;const row=app.querySelector(":scope > .hrow");const ok=OK();
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
.emm{position:relative;overflow:hidden;background:radial-gradient(120% 60% at 50% 0%,#1e3a8a 0%,#0b1020 55%,#05070d 100%)}#emMap{position:absolute;inset:0}
#emMap.navmap{left:-50%;top:-50%;width:200%;height:200%;pointer-events:none;transform:translateY(14%) perspective(1100px) rotateX(52deg) rotate(var(--rot,0deg));transform-origin:50% 50%;transition:transform .9s linear}
#emMap.navmap .leaflet-control-container{display:none}
#emap.navon .emme i{width:0;height:0;border-radius:0;background:none;border:none;box-shadow:none;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:30px solid #38bdf8;filter:drop-shadow(0 0 10px rgba(56,189,248,.95)) drop-shadow(0 0 2px #fff);margin:-6px 0 0 -3px;transition:transform .9s linear}
#emap.navon .emme{animation:none}
.emhud{position:absolute;left:10px;right:10px;bottom:10px;z-index:1000;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px;border-radius:18px;background:rgba(5,7,13,.86);border:1px solid rgba(56,189,248,.5);box-shadow:0 0 22px rgba(56,189,248,.35);text-align:center}
.emhud div{display:grid;gap:0}.emhud b{font-size:1.35rem;line-height:1.1}.emhud small{opacity:.7;font-size:.7rem}.emhud[hidden]{display:none}

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

#emap.plan .emp>.emst,#emap.plan .emp>.emlist,#emap.plan .emp>.embt>[data-emgo]{display:none!important}#emap.plan .emp{max-height:62vh}#emap.plan.navon .emp{max-height:22vh}#emap.navon .empl{display:none!important}
.emplb{background:linear-gradient(135deg,#f59e0b,#fde68a)!important;color:#1a1204!important;border:0!important}.emplb.on{box-shadow:0 0 14px rgba(245,158,11,.7)}
.empl{display:grid;gap:8px}.empl:not([data-md=truck]) .emtk{display:none!important}
.emmd{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.emmd button{min-height:44px;border-radius:999px;font-weight:800;padding:4px 6px;white-space:nowrap}.emmd button.on{background:linear-gradient(135deg,#f59e0b,#fde68a)!important;color:#1a1204!important;border-color:transparent!important;box-shadow:0 0 12px rgba(245,158,11,.6)}
.emab{display:grid;gap:6px}.empl label{display:grid;gap:2px;min-width:0}.empl label small{opacity:.7;font-size:.72rem;font-weight:600}
.empl input:not([type=checkbox]){width:100%;min-height:44px;box-sizing:border-box;font-size:16px}.emrw{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;align-items:end}
.emck{display:flex!important;align-items:center;gap:8px;min-height:44px}.emck input{width:22px;height:22px}
.emsug{display:grid;gap:4px}.emsug:empty{display:none}.emsg{display:grid;gap:1px;justify-items:start;text-align:left!important;padding:6px 12px;border-radius:12px;min-height:44px}.emsg small{opacity:.7;font-weight:500}
.emcfg summary{cursor:pointer;font-weight:700;min-height:40px;display:flex;align-items:center}.emcfg>*+*{margin-top:8px}.emnote{display:block;opacity:.65;font-size:.72rem;line-height:1.35}
.emtr{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:6px;align-items:center;font-size:.8rem}.emtr input{min-height:38px!important;padding:4px 8px}.emth b{font-size:.72rem;opacity:.75;text-align:center}
.emcalc{width:100%}.emerr{padding:10px 12px;border-radius:12px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.5)}
.emcard{display:grid;gap:10px;padding:12px;border-radius:16px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.45)}.emhd{display:grid;gap:2px}.emhd small{opacity:.75}
.emtb{display:grid;gap:6px}.emtb>div{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.04);font-size:.82rem}.emtb small{opacity:.8}
.emsum{display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:.88rem}.emsum b{text-align:right}.emtot{font-size:1rem;border-top:1px solid rgba(255,255,255,.2);padding-top:4px}
.emoffer{display:grid;gap:2px;justify-items:center;text-align:center;padding:10px;border-radius:14px;background:linear-gradient(135deg,rgba(34,197,94,.22),rgba(34,211,238,.18));border:1px solid rgba(74,222,128,.6);box-shadow:0 0 18px rgba(74,222,128,.3)}.emoffer b{font-size:1.5rem}.emoffer small,.emoffer span{opacity:.85}
.emhb{width:44px;height:44px;min-width:44px;border-radius:50%!important;padding:0!important;display:inline-grid;place-items:center;font-size:1.2rem;flex:0 0 44px}`;document.head.appendChild(s)}
})();
