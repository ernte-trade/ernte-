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
  <div class="emm"><div id="emMap"></div><button type="button" class="emq" data-emq>🔎 <span>Kam ideš? <small>odkiaľ → kam · 🚛 🚗 🚶</small></span></button><div class="emnbt" hidden><button type="button" class="emnb stop" data-emstop2 aria-label="Ukončiť navigáciu">■</button><button type="button" class="emnb" data-emcar aria-label="Do auta – Apple CarPlay / Android Auto">🚗</button><button type="button" class="emnb" data-emmute aria-label="Hlas zap/vyp">🔊</button><button type="button" class="emnb" data-emov aria-label="Celá trasa">🗺️</button><button type="button" class="emnb" data-emalb aria-label="Čerpacie stanice a reštaurácie po trase">⛽</button></div><div class="emcar" hidden></div><div class="emalp" hidden><b>Po trase – ťukni a pridá sa ako zastávka</b><div class="emalong"><button type="button" data-emp="fuel">⛽ ČS</button><button type="button" data-emp="food">🍽️ Reštaurácie</button><button type="button" data-emp="park">🅿️ Parkovanie</button></div><div class="empoi"></div></div><div class="emwarn" hidden></div><div class="emovt" hidden></div><div class="emhud" hidden><div><b class="emspd">0</b><small>km/h</small></div><div><b class="emrem">–</b><small>zostáva</small></div><div><b class="emeta">–</b><small>príchod</small></div><div><b class="emrt">–</b><small>jazdy ešte</small></div><div><b class="emalt">–</b><small>nad morom</small></div><div><b class="emcost">–</b><small>náklady zvyšok</small></div></div><div class="emfix" hidden></div></div>
  <div class="emnav" hidden><div class="emarrow">⬆️</div><div class="emtxt"><b class="emdist">—</b><b class="emins">—</b><small class="emsub"></small></div><i class="emprog"><i></i></i></div>
  <div class="emcats"><button type="button" data-emplan class="emplb">🧭 Trasa · 🚛 cena</button>${CAT.map(c=>`<button type="button" data-emcat="${c[0]}" class="${c[0]==="fuel"?"on":""}">${c[1]} ${c[2]}</button>`).join("")}</div>
  <div class="emp"><button type="button" class="empmin" data-empmin aria-label="Zmenšiť / zväčšiť panel">⇕</button><div class="emst"></div><div class="emlist"></div>
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
  S.wid=navigator.geolocation.watchPosition(p=>{const c={lat:p.coords.latitude,lng:p.coords.longitude,acc:(p.coords.accuracy??9999),hd:p.coords.heading,sp:p.coords.speed,alt:p.coords.altitude,at:Date.now()};
      if(c.acc>5000&&S.me)return;liveBearing(c);S.me=c;gpsTxt();drawMe();
      if(first&&c.acc<=1000){first=false;if(S.mode!=="plan"){S.map.setView([c.lat,c.lng],14);findStations()}}else if(first){status(`📡 Poloha zatiaľ nepresná (±${fd(c.acc/1000)}) – čakám na GPS… Zapni v telefóne presnú polohu.`)}
      if(S.nav)navTick()},
    e=>{status(e.code===1?"❌ Aplikácia nemá povolenú polohu. Povoľ polohu pre prehliadač / aplikáciu v nastaveniach telefónu a otvor mapu znova.":"📡 GPS signál nie je – skús to vonku alebo zapni polohu.")},
    {enableHighAccuracy:true,maximumAge:0,timeout:30000})}
function drawMe(){const c=S.me;if(!c||!S.map)return;const ll=[c.lat,c.lng];
  if(!S.meM){S.meM=L.marker(ll,{icon:L.divIcon({className:"emme",html:"<i></i>",iconSize:[22,22]}),zIndexOffset:1000}).addTo(S.map);S.acc=L.circle(ll,{radius:c.acc,color:"#38bdf8",weight:1,fillOpacity:.08}).addTo(S.map)}
  else{if(!S.nav)S.meM.setLatLng(ll);S.acc.setLatLng(ll).setRadius(c.acc)}
  if(S.follow&&!S.nav)S.map.panTo(ll,{animate:true})}
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
function say(t){try{if(S.mute||!("speechSynthesis" in window)||t===S.lastSay)return;S.lastSay=t;const u=new SpeechSynthesisUtterance(t);u.lang="sk-SK";speechSynthesis.cancel();speechSynthesis.speak(u)}catch(x){}}
function distToRoute(c){if(!S.route)return 0;let best=1e9;const P=S.route.geometry.coordinates;for(let i=0;i<P.length;i+=Math.max(1,Math.floor(P.length/400))){const d=km(c,{lat:P[i][1],lng:P[i][0]});if(d<best)best=d}return best}
// 🎥 LIVE navigácia: mapa ide s tebou, otáča sa v smere jazdy (hore = smer) a je naklonená ako v 3D
const brgOf=(a,b)=>{const y=Math.sin((b[1]-a[1])*Math.PI/180)*Math.cos(b[0]*Math.PI/180),x=Math.cos(a[0]*Math.PI/180)*Math.sin(b[0]*Math.PI/180)-Math.sin(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.cos((b[1]-a[1])*Math.PI/180);return (Math.atan2(y,x)*180/Math.PI+360)%360};
// smer z GPS iba pri skutočnom pohybe (nie šum na mieste) – inak sa mapa „krútila ako opica“
function liveBearing(c){S.spd=c.sp;const p=S.lastB;if(c.hd!=null&&!isNaN(c.hd)&&(c.sp||0)>3){S.gpsB=c.hd;S.lastB=c;return}
  if(!p){S.lastB=c;return}if(km(p,c)>0.025&&(c.acc||99)<=40){S.gpsB=brgOf([p.lat,p.lng],[c.lat,c.lng]);S.lastB=c}}
// poloha prichytená na trasu (kolmý priemet na úsek) a smer trasy dopredu – stabilné ako v aute
function onRoute(c){const R=S.route;if(!R||!R.pts||R.pts.length<2)return null;const n=nearIx(R,c);if(n.d>0.04)return null;const P0=R.pts,cl=Math.cos(c.lat*Math.PI/180);
  let best=null;for(const k of [n.i-1,n.i]){if(k<0||k+1>=P0.length)continue;const A=P0[k],B=P0[k+1],ax=(B[1]-A[1])*cl,ay=B[0]-A[0],px=(c.lng-A[1])*cl,py=c.lat-A[0],L2=ax*ax+ay*ay;
    let t=L2?(px*ax+py*ay)/L2:0;t=Math.max(0,Math.min(1,t));const q=[A[0]+ay*t,A[1]+(B[1]-A[1])*t],d=km(c,{lat:q[0],lng:q[1]});if(!best||d<best.d)best={d,q,k}}
  if(!best)return null;const C=cum(R);let j=best.k+1;while(j<P0.length-1&&C[j]-C[best.k]<0.05)j++;return {p:best.q,b:brgOf(best.q,P0[j])}}
function sizeNav(){/* 31. 10.: mapa sa už neotáča – veľká otočená vrstva sa v telefóne (Fold) nevykreslila, trasa nebola vidno */}
function unsizeNav(){const m=document.getElementById("emMap");if(m)["width","height","left","top","right","bottom"].forEach(k=>m.style.removeProperty(k))}
function liveView(on){const m=document.getElementById("emMap"),h=$(".emhud"),nb=$(".emnbt");if(!m)return;m.classList.toggle("navmap",on);if(h)h.hidden=!on;if(nb)nb.hidden=!on;
  if(on)sizeNav();else{unsizeNav();m.style.removeProperty("--rot");const i=document.querySelector("#emap .emme i");if(i)i.style.transform="";S.zl=null}
  if(S.acc)S.acc.setStyle({opacity:on?0:1,fillOpacity:on?0:.08});
  setTimeout(()=>{try{S.map.invalidateSize(false);if(on&&S.me){S.zl=17;S.map.setView([S.me.lat,S.me.lng],17,{animate:false})}}catch(x){}},60)}
window.addEventListener("resize",()=>{if(S.nav&&!S.ov){sizeNav();setTimeout(()=>{try{S.map.invalidateSize(false)}catch(x){}},80)}});
function liveTick(){const c=S.me,m=document.getElementById("emMap");if(!c||!m||!m.classList.contains("navmap")||S.ov)return;
  const r=onRoute(c),pos=r?r.p:[c.lat,c.lng],tgt=r?r.b:S.gpsB;
  if(tgt!=null){if(S.brg==null)S.brg=tgt;else{const d=((tgt-S.brg)%360+540)%360-180;if(Math.abs(d)>4)S.brg+=d*0.6}}
  const i=document.querySelector("#emap .emme i");if(i)i.style.transform=`rotate(${S.brg||0}deg)`;if(S.meM)S.meM.setLatLng(pos);
  const v=(S.spd!=null&&S.spd>=0?S.spd:0)*3.6,dn=S.dn==null?9:S.dn,want=dn<0.2?18:v>80?16:17;
  if(want!==S.zl){S.zc=(S.zc||0)+1;if(S.zc>=2||S.zl==null){S.zl=want;S.zc=0}}else S.zc=0;
  const lc=S.lastC;if(!lc||km({lat:lc[0],lng:lc[1]},{lat:pos[0],lng:pos[1]})>0.004||S.map.getZoom()!==S.zl){S.lastC=pos;const h=(m.clientHeight||600),cp=S.map.unproject(S.map.project(pos,S.zl).subtract(L.point(0,h*0.17)),S.zl);S.map.setView(cp,S.zl,{animate:true,duration:.9,easeLinearity:1})}
  const sp=$(".emspd");if(sp)sp.textContent=Math.round(v)}
// 🔷 manéver ako v aute: zvýraznený úsek križovatky so šípkou a bežiacimi šípkami (štýl Mercedes MBUX)
function mvDraw(nx){const R=S.route;if(!R||!R.pts||!S.map)return;const key=S.si+":"+(nx&&nx.maneuver.location.join());if(S.mvFor===key)return;S.mvFor=key;if(S.mvL){S.mvL.forEach(l=>l.remove());S.mvL=null}
  if(!nx||nx.maneuver.type==="arrive")return;const C=cum(R);let i=nx.idx!=null?nx.idx:nearIx(R,{lat:nx.maneuver.location[1],lng:nx.maneuver.location[0]}).i;
  let a=i,b=i;while(a>0&&C[i]-C[a]<0.06)a--;while(b<R.pts.length-1&&C[b]-C[i]<0.05)b++;const seg=R.pts.slice(a,b+1);if(seg.length<2)return;
  const p1=seg[seg.length-2],p2=seg[seg.length-1],y=Math.sin((p2[1]-p1[1])*Math.PI/180)*Math.cos(p2[0]*Math.PI/180),x=Math.cos(p1[0]*Math.PI/180)*Math.sin(p2[0]*Math.PI/180)-Math.sin(p1[0]*Math.PI/180)*Math.cos(p2[0]*Math.PI/180)*Math.cos((p2[1]-p1[1])*Math.PI/180),br=(Math.atan2(y,x)*180/Math.PI+360)%360;
  S.mvL=[L.polyline(seg,{color:"#0ea5e9",weight:22,opacity:.35,lineCap:"round"}).addTo(S.map),L.polyline(seg,{color:"#e0f2fe",weight:10,opacity:1,lineCap:"round",className:"emmv"}).addTo(S.map),
    L.polyline(seg,{color:"#0284c7",weight:4,opacity:1,dashArray:"6 14",className:"emchev"}).addTo(S.map)]}
// ⚠️ upozornenia vpredu: radary, práce na ceste, zápchy, uzávery (vizuálne + hlas)
function warnTick(R,myAt){const w=$(".emwarn");if(!w)return;const A=[...P.haz.map(h=>Object.assign({src:"o"},h)),...P.inc.filter(x=>x.onR)];let best=null;
  for(const h of A){if(h.at==null)continue;const d=h.at-myAt;if(d<-0.03||d>0.8)continue;if(!best||d<best.d)best={h,d}}
  if(!best){w.hidden=true;return}const h=best.h,d=Math.max(0,best.d),ic=h.k==="cam"?"📷":h.src==="o"?"🚧":(INCI[h.k]||"⚠️");
  const t=h.k==="cam"?`Radar${h.sp?" · "+h.sp+" km/h":""}`:h.k==="jam"?`Zápcha${h.delay>60?" · +"+Math.round(h.delay/60)+" min":""}`:h.k==="closed"?"Uzávera cesty":h.k==="acc"?"Nehoda":h.k==="work"?"Práce na ceste":"Pozor na ceste";
  w.className="emwarn "+h.k;w.innerHTML=`<span>${ic}</span><div><b>${E(t)}</b><small>o ${fd(d)}${h.d?" · "+E(h.d):""}</small></div>`;w.hidden=false;
  const id=h.lat.toFixed(5)+h.lng.toFixed(5);S.wd=S.wd||{};if(!S.wd[id]&&d<0.6){S.wd[id]=1;say(`Pozor, ${t.replace(" · "," ")} o ${fd(d)}`)}}
function navTick(force){const c=S.me,st=S.steps;if(!S.nav||!c||!st.length)return;
  // posun na ďalší krok, keď je manéver bližšie ako 25 m
  while(S.si<st.length-1){const m=st[S.si].maneuver.location;if(km(c,{lat:m[1],lng:m[0]})<0.025)S.si++;else break}
  // posun aj podľa polohy na trase (manéver už je za mnou)
  if(S.route&&S.route.pts){const ni=nearIx(S.route,c);if(ni.d<0.1)while(S.si<st.length-1&&st[S.si].idx!=null&&ni.i>st[S.si].idx+1)S.si++}
  const nx=st[Math.min(S.si+ (S.si===0?1:0),st.length-1)],m=nx.maneuver.location,dn=km(c,{lat:m[1],lng:m[0]}),txt=stepTxt(nx);
  let rem=st.slice(S.si).reduce((a,s)=>a+s.distance,0)/1000;if(S.route&&S.route.pts){const R=S.route,C=cum(R),ni=nearIx(R,c),T=C[C.length-1]||1;rem=(R.distance/1000)*Math.max(0,1-C[ni.i]/T)}
  liveTick();{const R=S.route,tot=(R&&R.distance)||1,left=Math.max(0,rem*1000),sec=R&&R.duration?R.duration*left/tot:0;const re=$(".emrem");if(re)re.textContent=fd(rem);const et=$(".emeta");if(et&&sec)et.textContent=new Date(Date.now()+sec*1000).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});hudX(rem,sec)}
  S.dn=dn;$(".emdist").textContent=fd(dn);$(".emins").textContent=txt;$(".emsub").textContent=`zostáva ${fd(rem)}`;{const nv=$(".emnav");nv.classList.toggle("near",dn<0.12);nv.querySelector(".emprog>i").style.width=Math.max(0,Math.min(100,(1-dn/0.5)*100))+"%"}
  mvDraw(nx);if(S.route&&S.route.pts){const R=S.route,n=nearIx(R,c);warnTick(R,cum(R)[n.i])}
  if(nx.maneuver.type==="via"&&dn<0.05){const v=navStops().find(v=>!v.done&&km(c,v)<0.3);if(v){v.done=true;say("Ste na zastávke "+v.n)}}$(".emarrow").textContent=nx.maneuver.type==="arrive"?"🏁":(ARR[nx.maneuver.modifier]||"⬆️");
  {const sv=nx.say||txt;if(force||(dn<0.2&&S.lastStep!==S.si+"n")||(dn<0.8&&dn>0.5&&S.lastStep!==S.si+"f")){if(dn<0.2)S.lastStep=S.si+"n";else if(dn<0.8&&dn>0.5)S.lastStep=S.si+"f";say((dn<0.2?"":"O "+fd(dn)+", ")+sv)}}
  if(nx.maneuver.type==="arrive"&&dn<0.03){say("Ste v cieli.");navClear();stopNav();status("🏁 Ste v cieli.");return}
    if(distToRoute(c)>0.08&&Date.now()-S.rr>15000){S.rr=Date.now();say("Prepočítavam trasu");if(S.mode==="plan"&&S.replan)S.replan();else{const i=S.st.indexOf(S.dest);if(i>=0)route(i)}}}
// 📺 navigácia na celú obrazovku (Android / PC – Fullscreen API; iPhone: v nainštalovanej aplikácii je celá obrazovka sama)
function fsOn(){try{const d=document.documentElement;if(!document.fullscreenElement&&d.requestFullscreen){d.requestFullscreen({navigationUI:"hide"}).then(()=>{S.fs=true;try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock("any").catch(()=>{})}catch(x){}}).catch(()=>{})}
  else if(d.webkitRequestFullscreen&&!document.webkitFullscreenElement){d.webkitRequestFullscreen();S.fs=true}}catch(x){}setTimeout(()=>{try{S.map.invalidateSize(false)}catch(x){}},400)}
function fsOff(){try{if(S.fs){S.fs=false;if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen()}}catch(x){}setTimeout(()=>{try{S.map.invalidateSize(false)}catch(x){}},400)}
// 🚗 Do auta: Apple CarPlay a Android Auto zobrazia iba schválené navigačné aplikácie (Google Maps, Apple Mapy, Waze).
// Našu trasu (aj kamiónovú) pošleme do Google Máp cez body na trase, aby išli presne po nej; Apple Mapy a Waze dostanú cieľ.
function carLinks(){const R=S.route,d=S.dest;if(!R||!d)return null;const me=S.me,pts=(R.geometry&&R.geometry.coordinates)||[];
  const wp=[];if(pts.length>4){const n=Math.min(8,Math.floor(pts.length/20));for(let i=1;i<=n;i++){const p=pts[Math.floor(pts.length*i/(n+1))];wp.push(p[1].toFixed(5)+","+p[0].toFixed(5))}}
  const md=(typeof cfg==="function"&&S.mode==="plan")?cfg().mode:"auto",tm=md==="pedestrian"?"walking":"driving",o=me?`&origin=${me.lat.toFixed(6)},${me.lng.toFixed(6)}`:"";
  return {g:`https://www.google.com/maps/dir/?api=1${o}&destination=${d.lat.toFixed(6)},${d.lng.toFixed(6)}${wp.length&&md!=="pedestrian"?"&waypoints="+encodeURIComponent(wp.join("|")):""}&travelmode=${tm}&dir_action=navigate`,
    a:`https://maps.apple.com/?${me?`saddr=${me.lat.toFixed(6)},${me.lng.toFixed(6)}&`:""}daddr=${d.lat.toFixed(6)},${d.lng.toFixed(6)}&dirflg=${md==="pedestrian"?"w":"d"}`,
    w:`https://waze.com/ul?ll=${d.lat.toFixed(6)},${d.lng.toFixed(6)}&navigate=yes`,wp:wp.length,truck:md==="truck"}}
function carPanel(){const c=$(".emcar");if(!c)return;if(!c.hidden){c.hidden=true;return}const L0=carLinks();if(!L0){c.hidden=true;return}
  c.innerHTML=`<b>🚗 Do auta · Apple CarPlay / Android Auto</b><small>Pripoj telefón k autu (kábel / bezdrôtovo) a vyber mapu – trasa sa ukáže na displeji auta.</small>
   <a class="emca g" href="${L0.g}" target="_blank" rel="noopener">🗺️ Google Mapy${L0.wp?` · po našej ${L0.truck?"kamiónovej ":""}trase`:""}</a>
   <a class="emca a" href="${L0.a}" target="_blank" rel="noopener">🍎 Apple Mapy · iba cieľ</a><a class="emca w" href="${L0.w}" target="_blank" rel="noopener">🚙 Waze · iba cieľ</a>
   <small>${L0.truck?"Kamión: Google Mapy idú cez body našej kamiónovej trasy (mýto a obmedzenia ostávajú podľa ERNTE Maps). Apple Mapy a Waze kamiónovú trasu nepoznajú.":"Mapy v aute prepočítavajú trasu samy aj s dopravou."}</small>`;c.hidden=false}
function overview(on){S.ov=on;const m=document.getElementById("emMap"),t=$(".emovt"),b=$("[data-emov]");if(!m)return;if(b)b.classList.toggle("on",on);
  if(on){m.classList.remove("navmap");unsizeNav();S.follow=false;setTimeout(()=>{try{S.map.invalidateSize(false);const nv=$(".emnav"),hd=$(".emhud");S.map.fitBounds(L.latLngBounds(S.route.pts),{paddingTopLeft:[20,(nv?nv.offsetHeight:80)+40+(t?90:0)],paddingBottomRight:[80,(hd?hd.offsetHeight:70)+30]})}catch(x){}},60);
    if(t){const R=S.route,X=P.res,C=cum(R),me=S.me?C[nearIx(R,S.me).i]:0,left=(R.distance/1000)*Math.max(0,1-me/(C[C.length-1]||1));
      t.innerHTML=`<b>🗺️ Celá trasa${P.b?" → "+E(P.b.n):""}</b><small>${fd(R.distance/1000)} · ${ft(R.duration)} · zostáva ${fd(left)}${X&&!X.simple?` · náklady ${eur(X.tot)} · cena ${eur(X.offer)}`:""}${P.haz.length?` · 📷 ${P.haz.filter(h=>h.k==="cam").length} · 🚧 ${P.haz.filter(h=>h.k==="work").length}`:""}${P.inc.length?` · 🚦 ${P.inc.filter(x=>x.onR).length}`:""}</small>`;t.hidden=false}}
  else{if(t)t.hidden=true;m.classList.add("navmap");sizeNav();S.lastC=null;S.follow=true;setTimeout(()=>{try{S.map.invalidateSize(false);liveTick()}catch(x){}},60)}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emq]");if(!t||!t.closest("#emap"))return;e.preventDefault();e.stopPropagation();showPlan(true);setTimeout(()=>{const i=$("[data-emf=b]");if(i)i.focus()},400)},true);
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emov],[data-emalb]");if(!t||!t.closest("#emap"))return;e.preventDefault();e.stopPropagation();
  if(t.dataset.emov!==undefined)return overview(!S.ov);const pp=$(".emalp");if(pp){pp.hidden=!pp.hidden;const c=$(".emcar");if(c)c.hidden=true}},true);
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emstop2],[data-emcar],[data-emmute]");if(!t||!t.closest("#emap"))return;e.preventDefault();e.stopPropagation();
  if(t.dataset.emstop2!==undefined){navClear();return stopNav()}if(t.dataset.emcar!==undefined)return carPanel();
  if(t.dataset.emmute!==undefined){S.mute=!S.mute;t.textContent=S.mute?"🔇":"🔊";try{if(S.mute)speechSynthesis.cancel()}catch(x){}}},true);
document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement)S.fs=false;setTimeout(()=>{try{S.map&&S.map.invalidateSize(false)}catch(x){}},300)});
function startNav(){if(!S.route)return;fsOn();S.nav=true;S.follow=true;S.si=0;$(".emnav").hidden=false;$("[data-emgo]").hidden=true;$("[data-emstop]").hidden=false;document.getElementById("emap").classList.add("navon");liveView(true);navTick(true);navSave();fixStart()}
function stopNav(){S.nav=false;fsOff();S.ov=false;S.brg=null;S.lastC=null;S.dn=null;S.wd={};if(S.mvL){S.mvL.forEach(l=>l.remove());S.mvL=null;S.mvFor=null}["emcar","emalp","emwarn","emovt"].forEach(k=>{const c=$("."+k);if(c)c.hidden=true});{const b=$("[data-emov]");if(b)b.classList.remove("on")}try{speechSynthesis.cancel()}catch(x){}const n=$(".emnav");if(n)n.hidden=true;const g=$("[data-emgo]");if(g)g.hidden=!S.route;const st=$("[data-emstop]");if(st)st.hidden=true;const o=document.getElementById("emap");if(o&&o.classList.contains("navon")){o.classList.remove("navon");liveView(false)}}
async function acquireWake(){try{if(navigator.wakeLock&&!S.wl)S.wl=await navigator.wakeLock.request("screen")}catch(x){}}
function releaseWake(){try{if(S.wl){S.wl.release();S.wl=null}}catch(x){}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emx],[data-emgo],[data-emstop],[data-emcenter],[data-emi],[data-emretry],[data-emcat]");if(!t)return;e.preventDefault();e.stopPropagation();
  if(t.dataset.emx!==undefined)return close();if(t.dataset.emgo!==undefined)return startNav();if(t.dataset.emstop!==undefined){navClear();return stopNav()}
  if(t.dataset.emcenter!==undefined){S.follow=true;if(S.me)S.map.setView([S.me.lat,S.me.lng],16);return}
  if(t.dataset.emretry!==undefined)return findStations();if(t.dataset.emcat!==undefined){S.cat=t.dataset.emcat;showPlan(false);P.res=null;return S.me?findStations():null}if(t.dataset.emi!==undefined)return route(+t.dataset.emi)},true);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&document.getElementById("emap")?.classList.contains("on"))acquireWake()});
// ===== 🧭 TRASA · 🚛 CENA PREPRAVY (príkaz majiteľa 30. 10.) =====
// Odkiaľ → (zastávky) → kam; 🚛 kamión 40 t / 🚗 auto / 🚶 pešo (Valhalla, pokyny sk-SK, záloha OSRM). Najrýchlejšia, alternatívy a najkratšia trasa,
// spoplatnené úseky a diaľnice zap/vyp, radary (📷) a práce na ceste (🚧) z OpenStreetMap, živá doprava (zápchy, uzávery) z TomTom – ak je zadaný kľúč.
// Kamión: mýto podľa krajín a tried ciest, nafta podľa skutočnej ceny, ostatné pohyblivé náklady ako Kalkulačka, prázdny návrat, marža → návrh ceny.
const PK="ernte-plan-cfg";
const CL=m=>m==="truck"?"🚛 Vypočítať trasu a cenu prepravy":m==="auto"?"🚗 Vypočítať trasu autom":"🚶 Vypočítať trasu pešo";
const VH="https://valhalla1.openstreetmap.de";
const CN={SK:"Slovensko",HU:"Maďarsko",CZ:"Česko",AT:"Rakúsko",PL:"Poľsko",DE:"Nemecko",RO:"Rumunsko",UA:"Ukrajina",SI:"Slovinsko",HR:"Chorvátsko",RS:"Srbsko",IT:"Taliansko"};
const FLAG={SK:"🇸🇰",HU:"🇭🇺",CZ:"🇨🇿",AT:"🇦🇹",PL:"🇵🇱",DE:"🇩🇪",RO:"🇷🇴",UA:"🇺🇦",SI:"🇸🇮",HR:"🇭🇷",RS:"🇷🇸",IT:"🇮🇹"};
// mýto €/km, kamión nad 12 t, 5 náprav, EURO 6: m = diaľnica + rýchlostná cesta, p = cesta I. triedy. SK, HU, AT ako Kalkulačka; ostatné orientačne – uprav v ⚙️.
const TOLL0=huf=>({SK:{m:0.1942,p:0.09},HU:{m:+(192.38/huf).toFixed(4),p:+(192.38/huf).toFixed(4)},AT:{m:0.5724,p:0},CZ:{m:0.25,p:0.12},PL:{m:0.14,p:0.105},DE:{m:0.348,p:0.348},SI:{m:0.3,p:0},HR:{m:0.2,p:0},RO:{m:0.03,p:0.03},"*":{m:0.2,p:0}});
const P={a:null,b:null,via:[],res:null,mk:null,cfg:null,routes:[],ri:0,haz:[],inc:[],hazL:null,poiL:null,altL:[],min:false};
function mkLoad(){if(P.mk)return Promise.resolve(P.mk);return fetch("market.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>(P.mk=j||{},P.mk))}
function cfg(){if(P.cfg)return P.cfg;const f=(P.mk&&P.mk.fuel)||{},rf=f.ref||{ekm:1.6,cons:0.32,netL:1.5551},huf=(P.mk&&P.mk.fx&&P.mk.fx.huf)||366;
  let c={};try{c=JSON.parse(localStorage.getItem(PK)||"{}")}catch(x){}
  P.cfg=Object.assign({mode:"truck",trip:"one",t2:null,t:25,ret:true,marza:10,tolls:true,hwy:true,pref:"fast",ttKey:"",cons:+(rf.cons*100).toFixed(1),other:+(rf.ekm-rf.cons*rf.netL).toFixed(3),skL:f.sk&&f.sk.netL||rf.netL,huL:f.hu&&f.hu.netL||rf.netL,toll:TOLL0(huf)},c);
  P.cfg.toll=Object.assign(TOLL0(huf),c.toll||{});return P.cfg}
function cfgSave(){try{const c=P.cfg,o={mode:c.mode,trip:c.trip,t2:c.t2,t:c.t,ret:c.ret,marza:c.marza,tolls:c.tolls,hwy:c.hwy,pref:c.pref,ttKey:c.ttKey,cons:c.cons,other:c.other,toll:c.toll};localStorage.setItem(PK,JSON.stringify(o))}catch(x){}}
const n2=(x,d=2)=>Number.isFinite(x)?x.toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d}):"–";
const eur=x=>n2(x,0)+" €";
function dec6(s){const o=[];let i=0,la=0,ln=0;while(i<s.length){for(const k of [0,1]){let b,sh=0,r=0;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<sh;sh+=5}while(b>=32);const d=r&1?~(r>>1):r>>1;if(k)ln+=d;else la+=d}o.push([la/1e6,ln/1e6])}return o}
function enc6(pts){let o="",pl=0,pn=0;const e=v=>{v=v<0?~(v<<1):v<<1;while(v>=32){o+=String.fromCharCode((32|(v&31))+63);v>>=5}o+=String.fromCharCode(v+63)};
  for(const [la,ln] of pts){const a=Math.round(la*1e6),b=Math.round(ln*1e6);e(a-pl);e(b-pn);pl=a;pn=b}return o}
const VT={1:"depart",2:"depart",3:"depart",4:"arrive",5:"arrive",6:"arrive",26:"roundabout",27:"roundabout"};
const VM={2:"right",3:"left",9:"slight right",10:"right",11:"sharp right",12:"uturn",13:"uturn",14:"sharp left",15:"left",16:"slight left",18:"slight right",19:"slight left",20:"slight right",21:"slight left",23:"slight right",24:"slight left",37:"slight right",38:"slight left"};
const kp=p=>({lat:p[0],lng:p[1]});
// kumulatívne km po trase + najbližší bod trasy k polohe
function cum(R){if(R.cum)return R.cum;const c=[0];for(let i=1;i<R.pts.length;i++)c.push(c[i-1]+km(kp(R.pts[i-1]),kp(R.pts[i])));return R.cum=c}
function nearIx(R,p,from){const P0=R.pts;let best=1e9,bi=0;const st=Math.max(1,Math.floor(P0.length/600));for(let i=0;i<P0.length;i+=st){const d=km(p,kp(P0[i]));if(d<best){best=d;bi=i}}
  for(let i=Math.max(0,bi-st);i<Math.min(P0.length,bi+st+1);i++){const d=km(p,kp(P0[i]));if(d<best){best=d;bi=i}}return {i:bi,d:best}}
function thin(pts,n){if(pts.length<=n)return pts;const o=[],s=(pts.length-1)/(n-1);for(let i=0;i<n;i++)o.push(pts[Math.round(i*s)]);return o}
async function geo(q){q=String(q||"").trim();const m=q.match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);if(m)return [{n:q,lat:+m[1].replace(",","."),lng:+m[2].replace(",",".")}];
  if(q.length<3)return [];const c=S.me,u=`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7${c?`&lat=${c.lat.toFixed(4)}&lon=${c.lng.toFixed(4)}`:""}`;
  try{const r=await fetch(u,{signal:tmo(8000)});if(r.ok){const j=await r.json();const o=(j.features||[]).map(f=>{const p=f.properties||{},g=f.geometry.coordinates;
      const n=[p.name,[p.street,p.housenumber].filter(Boolean).join(" ")].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(", ")||p.city||"";const w=[p.postcode,p.city&&p.city!==p.name?p.city:"",p.countrycode].filter(Boolean).join(" ");
      return {n:n||w,w,lat:g[1],lng:g[0]}});if(o.length)return o}}catch(x){}
  try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=6&accept-language=sk`,{signal:tmo(8000)});if(r.ok)return (await r.json()).map(e=>({n:e.name||e.display_name.split(",")[0],w:e.display_name.split(",").slice(1,3).join(","),lat:+e.lat,lng:+e.lon}))}catch(x){}
  return []}
let acT=0,acSeq=0;
function sug(which,list){const e=$(".emsug");if(!e)return;e.dataset.w=which;e.innerHTML=list.map((s,i)=>`<button type="button" class="emsg" data-emsg="${i}"><b>${E(s.n)}</b>${s.w?`<small>${E(s.w)}</small>`:""}</button>`).join("");P.sl=list}
const getW=w=>w==="a"?P.a:w==="b"?P.b:w==="c"?P.c:w==="d"?P.d:P.via[+w.slice(1)];
function setW(w,v){if(w==="a")P.a=v;else if(w==="b")P.b=v;else if(w==="c")P.c=v;else if(w==="d")P.d=v;else P.via[+w.slice(1)]=v}
const navStops=()=>P.tripStops||P.via||[];
function planUI(){const c=cfg(),T=c.toll,rows=Object.keys(T).map(k=>`<div class="emtr"><span>${FLAG[k]||"🌍"} ${k==="*"?"ostatné (spoplatnené úseky)":E(CN[k]||k)}</span><input inputmode="decimal" data-emtl="${k}.m" value="${n2(T[k].m,4)}" aria-label="mýto diaľnica ${k}"><input inputmode="decimal" data-emtl="${k}.p" value="${n2(T[k].p,4)}" aria-label="mýto I. trieda ${k}"></div>`).join("");
  const MD=[["truck","🚛 Kamión"],["auto","🚗 Autom"],["pedestrian","🚶 Pešo"]];
  const via=P.via.map((v,i)=>`<label class="emvia"><small>Zastávka ${i+1}</small><span><input data-emf="v${i}" autocomplete="off" placeholder="Zastávka – mesto, adresa" value="${E(v&&v.n||"")}"><button type="button" class="emvx" data-emvx="${i}" aria-label="Odstrániť zastávku">✕</button></span></label>`).join("");
  return `<div class="emmd" role="group" aria-label="Spôsob dopravy">${MD.map(m=>`<button type="button" data-emmd="${m[0]}" class="${c.mode===m[0]?"on":""}">${m[1]}</button>`).join("")}</div>
  <div class="emab"><label><small>Odkiaľ</small><input data-emf="a" autocomplete="off" placeholder="📍 Moja poloha" value="${E(P.a&&!P.a.me?P.a.n:"")}"></label>${via}
  <button type="button" class="emaddv" data-emaddv>＋ Pridať zastávku</button>
  <label><small>Kam</small><input data-emf="b" autocomplete="off" placeholder="Mesto, adresa, firma alebo GPS" value="${E(P.b?P.b.n:"")}"></label></div><div class="emsug"></div>
  <div class="emopt emnp"><button type="button" data-emo="pref" data-v="fast" class="${c.pref!=="short"?"on":""}">⚡ Najrýchlejšia</button><button type="button" data-emo="pref" data-v="short" class="${c.pref==="short"?"on":""}">📏 Najkratšia</button>
   <button type="button" data-emo="tolls" class="${c.tolls?"on":""}">💶 Spoplatnené úseky</button><button type="button" data-emo="hwy" class="${c.hwy?"on":""}">🛣️ Diaľnice</button></div>
  <small class="emnote emnp">Bez poplatkov: vypni 💶 (mýto) a pri aute aj 🛣️ (diaľničná známka SK / CZ / HU / AT).</small>
  <div class="emrw emtk"><label><small>Náklad t</small><input inputmode="decimal" data-emc="t" value="${n2(c.t,0)}"></label><label><small>Marža %</small><input inputmode="decimal" data-emc="marza" value="${n2(c.marza,0)}"></label>
  <label class="emck emone"><input type="checkbox" data-emc="ret" ${c.ret?"checked":""}><span>prázdny návrat</span></label></div>
  <div class="emtrip emtk"><button type="button" data-emtrip="one" class="${c.trip!=="back"?"on":""}">↗️ Jedným smerom</button><button type="button" data-emtrip="back" class="${c.trip==="back"?"on":""}">🔁 Tam a späť so spätným nákladom</button></div>
  <div class="emback emtk"><label><small>📦 Nakládka spätného nákladu <i>(prázdne = hneď vo vykládke)</i></small><input data-emf="c" autocomplete="off" placeholder="napr. Sečovce, Martfű…" value="${E(P.c?P.c.n:"")}"></label>
   <label><small>🏠 Návrat do <i>(prázdne = späť na štart)</i></small><input data-emf="d" autocomplete="off" placeholder="napr. Zbudza" value="${E(P.d?P.d.n:"")}"></label>
   <div class="emrw"><label><small>Spätný náklad t</small><input inputmode="decimal" data-emc="t2" value="${n2(c.t2!=null?c.t2:c.t,0)}"></label></div>
   <small class="emnote">Trasa: štart → vykládka (naložený) → nakládka spätného nákladu (prázdny prejazd) → návrat (naložený). Náklady a cena zvlášť pre cestu tam aj späť; prázdny prejazd sa rozdelí napoly.</small></div>
  <details class="emcfg emtk"><summary>⚙️ Náklady, nafta a mýto</summary><div class="emrw"><label><small>Spotreba l/100</small><input inputmode="decimal" data-emc="cons" value="${n2(c.cons,1)}"></label>
   <label><small>Ostatné €/km</small><input inputmode="decimal" data-emc="other" value="${n2(c.other,3)}"></label></div>
   <div class="emrw"><label><small>Nafta SK €/l bez DPH</small><input inputmode="decimal" data-emc="skL" value="${n2(c.skL,3)}"></label><label><small>Nafta HU €/l bez DPH</small><input inputmode="decimal" data-emc="huL" value="${n2(c.huL,3)}"></label></div>
   <small class="emnote">Ostatné pohyblivé náklady (vodič, pneu, servis, AdBlue, odpisy) = sadzba Kalkulačky ${n2(1.6)} €/km mínus nafta pri referenčnej cene. Nafta = aktuálny priemer SK / HU bez DPH (market.json), v ostatných krajinách cena SK.</small>
   <div class="emtr emth"><span>Mýto €/km (5 náprav, EURO 6)</span><b>diaľnica</b><b>I. trieda</b></div>${rows}
   <small class="emnote">SK, HU, AT ako Kalkulačka; CZ, PL, DE a ostatné sú orientačné – over a uprav sadzby. Ukladá sa v tomto zariadení.</small></details>
  <details class="emcfg emnp"><summary>🚦 Živá doprava – zápchy, nehody, uzávery ${c.ttKey?"✅":"(vypnutá)"}</summary>
   <small class="emnote">Radary 📷 a dlhodobé práce na ceste 🚧 sú z OpenStreetMap vždy. Živé zápchy, nehody a uzávery potrebujú dopravné dáta: bezplatný kľúč TomTom (developer.tomtom.com → Register → My Dashboard → API key, zadarmo 2 500 dopytov denne). Kľúč vlož sem – ostane iba v tomto telefóne.</small>
   <label><small>TomTom API kľúč</small><input data-emc="ttKey" autocomplete="off" spellcheck="false" placeholder="vlož kľúč" value="${E(c.ttKey||"")}"></label></details>
  <button type="button" class="emgo emcalc" data-emcalc>${CL(c.mode)}</button><div class="emres">${resAll()}</div>`}
function showPlan(on){S.mode=on?"plan":"poi";const o=document.getElementById("emap");if(!o)return;o.classList.toggle("plan",on);
  document.querySelectorAll("#emap [data-emcat]").forEach(b=>b.classList.toggle("on",!on&&b.dataset.emcat===S.cat));const pb=$("[data-emplan]");if(pb)pb.classList.toggle("on",on);
  let pl=$(".empl");if(on){if(!pl){pl=document.createElement("div");pl.className="empl";$(".emp").prepend(pl)}mkLoad().then(()=>{pl.innerHTML=planUI();pl.dataset.md=cfg().mode;pl.dataset.trip=cfg().trip||"one"});
    if(S.stL){S.stL.remove();S.stL=null}if(!P.res){S.route=null;S.rL.forEach(l=>l.remove());S.rL=[];stopNav()}}
  else{if(pl)pl.remove();clearLayers();panelMin(false);P.haz=[];P.inc=[];P.res=null;P.routes=[]}}
function rdNum(v){const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null}
function panelMin(on){P.min=on;const p=$(".emp");if(p)p.classList.toggle("min",on);setTimeout(()=>{try{S.map.invalidateSize(false);if(S.route&&!S.nav)fitRoute()}catch(x){}},80)}
function fitRoute(){const R=S.route;if(!R||!S.map)return;S.map.fitBounds(L.latLngBounds(R.pts),{paddingTopLeft:[24,24],paddingBottomRight:[24,24]})}
// ---------- trasy (Valhalla) ----------
function vbody(locs,c,short){const md=c.mode,o={};
  if(md==="truck")o.truck={height:4,width:2.55,length:16.5,weight:40,axle_load:11.5,axle_count:5,hazmat:false,use_tolls:c.tolls?1:0,use_highways:c.hwy?1:0.1,shortest:!!short};
  else if(md==="auto")o.auto={use_tolls:c.tolls?1:0,use_highways:c.hwy?1:0,shortest:!!short};
  return {locations:locs.map((l,i)=>({lat:l.lat,lon:l.lng,type:i===0||i===locs.length-1?"break":"break_through",name:l.n||""})),costing:md,costing_options:o,language:"sk-SK",units:"kilometers",directions_options:{language:"sk-SK"}}}
async function vh(body){const r=await fetch(VH+"/route",{method:"POST",body:JSON.stringify(body),headers:{"Content-Type":"application/json"},signal:tmo(30000)});if(!r.ok)throw new Error("route "+r.status);return r.json()}
function parseTrip(t,md,locs){let pts=[];const steps=[];const nl=t.legs.length;
  const legR=[];t.legs.forEach((lg,li)=>{const p=dec6(lg.shape),off=pts.length;legR.push({s:off,e:off+p.length-1,km:(lg.summary||{}).length||0,t:(lg.summary||{}).time||0});(lg.maneuvers||[]).forEach(m=>{let ty=VT[m.type]||"turn";if(ty==="depart"&&li>0)return;const via=ty==="arrive"&&li<nl-1;
      const q=p[m.begin_shape_index]||p[p.length-1];const nm=locs&&locs[li+1]&&locs[li+1].n||"";
      steps.push({distance:(m.length||0)*1000,name:(m.street_names||[])[0]||"",txt:via?`📍 Zastávka${nm?": "+nm:""}`:m.instruction,say:via?`Zastávka ${nm}`:(m.verbal_pre_transition_instruction||m.instruction),idx:off+m.begin_shape_index,
        maneuver:{type:via?"via":ty,modifier:VM[m.type]||"straight",location:[q[1],q[0]]}})});pts=pts.concat(p)});
  return {src:md,pts,distance:t.summary.length*1000,duration:t.summary.time,geometry:{coordinates:pts.map(p=>[p[1],p[0]])},legs:[{steps}],legR,hasToll:t.summary.has_toll,hasHwy:t.summary.has_highway}}
async function routesFor(locs){const c=cfg(),md=c.mode;let out=[];
  try{const two=locs.length===2&&md!=="pedestrian";const fb=vbody(locs,c,false);if(two)fb.alternates=2;
    const [f,s]=await Promise.all([vh(fb),md==="pedestrian"?Promise.resolve(null):vh(vbody(locs,c,true)).catch(()=>null)]);
    const R0=parseTrip(f.trip,md,locs);R0.lbl="⚡ Najrýchlejšia";out.push(R0);
    (f.alternates||[]).forEach((a,i)=>{const R=parseTrip(a.trip,md,locs);R.lbl="↔️ Alternatíva "+(i+1);out.push(R)});
    if(s&&s.trip){const R=parseTrip(s.trip,md,locs);R.lbl="📏 Najkratšia";if(!out.some(x=>Math.abs(x.distance-R.distance)<Math.max(300,R.distance*.005)))out.push(R);else{const m=out.reduce((a,b)=>b.distance<a.distance?b:a);m.lbl+=" · 📏 najkratšia"}}}
  catch(x){// záloha: OSRM
    const base=md==="pedestrian"?"https://routing.openstreetmap.de/routed-foot/route/v1/driving/":"https://router.project-osrm.org/route/v1/driving/";
    const o=await fetch(`${base}${locs.map(l=>l.lng.toFixed(6)+","+l.lat.toFixed(6)).join(";")}?overview=full&geometries=geojson&steps=true&alternatives=${locs.length===2?"true":"false"}`,{signal:tmo(20000)});
    if(!o.ok)throw new Error("služby trás neodpovedajú");const j=await o.json();(j.routes||[]).forEach((R,i)=>{R.src=md==="pedestrian"?"pedestrian":"car";R.pts=R.geometry.coordinates.map(p=>[p[1],p[0]]);
      R.legKm=R.legs.map(l=>(l.distance||0)/1000);R.legs=[{steps:[].concat(...R.legs.map(l=>l.steps||[]))}];R.lbl=i?"↔️ Alternatíva "+i:"⚡ Najrýchlejšia";out.push(R)})}
  if(!out.length)throw new Error("trasa neexistuje");return out}
async function tollSplit(R){if(R.src!=="truck")return null;if(R.tolls)return R.tolls;
  const r=await fetch(VH+"/trace_attributes",{method:"POST",headers:{"Content-Type":"application/json"},signal:tmo(40000),
    body:JSON.stringify({encoded_polyline:enc6(R.pts),costing:"truck",shape_match:"edge_walk",filters:{attributes:["edge.length","edge.road_class","edge.toll","node.admin_index","admin.country_code"],action:"include"}})});
  if(!r.ok)throw new Error("trace");const j=await r.json(),ad=(j.admins||[]).map(a=>a.country_code||"?"),C={};
  for(const e of j.edges||[]){const cc=ad[(e.end_node||{}).admin_index]||ad[0]||"?",x=C[cc]||(C[cc]={km:0,m:0,p:0,t:0});const l=e.length||0;x.km+=l;
    if(e.road_class==="motorway"||e.road_class==="trunk")x.m+=l;else if(e.road_class==="primary")x.p+=l;else if(e.toll)x.t+=l}
  return R.tolls=C}
function price(R,C){const c=cfg(),f=c.ret?2:1,D=R.distance/1000,cons=c.cons/100,T=c.toll;let est=false;
  if(!C){C={SK:{km:D,m:0,p:0,t:0}};est=true}
  const rows=Object.entries(C).filter(([k,x])=>x.km>0.05).map(([k,x])=>{const tr=T[k]||T["*"],L=k==="HU"?c.huL:c.skL;
    const toll=(x.m*tr.m+x.p*tr.p+x.t*T["*"].m)*f,fuelL=x.km*cons*f,fuel=fuelL*L,tkm=(tr.m?x.m:0)+(tr.p?x.p:0)+x.t;return {k,km:x.km,tkm,toll,fuelL,fuel,L}}).sort((a,b)=>b.km-a.km);
  const fuel=rows.reduce((a,r)=>a+r.fuel,0),toll=rows.reduce((a,r)=>a+r.toll,0),other=D*c.other*f,tot=fuel+toll+other,offer=tot*(1+c.marza/100);
  return {a:P.a.n,b:P.b.n,via:P.via.filter(Boolean).map(v=>v.n),D,dur:R.duration,src:R.src,est,rows,fuel,toll,other,tot,offer,f,t:c.t,marza:c.marza,ret:c.ret,cons:c.cons,oth:c.other}}
// 🔁 tam a späť so spätným nákladom: úseky naložený tam / prázdny prejazd / naložený späť
function costOf(C,D){const c=cfg(),cons=c.cons/100,T=c.toll;let est=false;if(!C){C={SK:{km:D,m:0,p:0,t:0}};est=true}
  const rows=Object.entries(C).filter(([k,x])=>x.km>0.05).map(([k,x])=>{const tr=T[k]||T["*"],L=k==="HU"?c.huL:c.skL;const toll=x.m*tr.m+x.p*tr.p+x.t*T["*"].m,fuelL=x.km*cons,fuel=fuelL*L;return {k,km:x.km,toll,fuelL,fuel}});
  const fuel=rows.reduce((a,r)=>a+r.fuel,0),toll=rows.reduce((a,r)=>a+r.toll,0),fuelL=rows.reduce((a,r)=>a+r.fuelL,0),other=D*c.other;return {D,fuel,fuelL,toll,other,tot:fuel+toll+other,est,rows}}
async function priceBack(R,locs){const c=cfg(),nv=P.via.length,hasC=!!P.c,t2=c.t2!=null?c.t2:c.t;
  const legs=R.legR||(R.legKm||[]).map(k=>({km:k})),seg={out:[],empty:[],back:[]};legs.forEach((l,i)=>{(i<=nv?seg.out:hasC&&i===nv+1?seg.empty:seg.back).push(l)});
  const one=async L0=>{if(!L0.length)return null;const km=L0.reduce((a,l)=>a+l.km,0),t=L0.reduce((a,l)=>a+(l.t||0),0);let C=null;
    if(R.src==="truck"&&L0[0].s!=null){try{C=await tollSplit({src:"truck",pts:R.pts.slice(L0[0].s,L0[L0.length-1].e+1)})}catch(x){}}return Object.assign(costOf(C,km),{t})};
  const [o,e,b]=await Promise.all([one(seg.out),one(seg.empty),one(seg.back)]);const half=e?e.tot/2:0,m=1+c.marza/100;
  const pOut=(o.tot+half)*m,pBack=b?(b.tot+half)*m:0,tot=o.tot+(e?e.tot:0)+(b?b.tot:0);
  const solo=2*o.tot+(b?2*b.tot:0); // dve samostatné jazdy s prázdnym návratom
  return {back:true,a:P.a.n,b:P.b.n,c:P.c?P.c.n:P.b.n,d:(P.d||P.a).n,via:P.via.map(v=>v.n),D:R.distance/1000,dur:R.duration,src:R.src,o,e,bk:b,tot,pOut,pBack,t:c.t,t2,marza:c.marza,solo,save:solo-tot,
    fuel:o.fuel+(e?e.fuel:0)+(b?b.fuel:0),toll:o.toll+(e?e.toll:0)+(b?b.toll:0),other:o.other+(e?e.other:0)+(b?b.other:0),offer:pOut+pBack}}
// ---------- výpočet ----------
async function resolveW(w,inp,need){const cur=getW(w),v=inp?inp.value.trim():"";if(!v)return need?null:undefined;if(cur&&!cur.me&&cur.n===v)return cur;const g=await geo(v);if(!g.length)return null;setW(w,g[0]);inp.value=g[0].n;return g[0]}
async function calc(){const c=cfg(),btn=$("[data-emcalc]"),out=$(".emres");if(!btn)return;
  const ib=$("[data-emf=b]"),ia=$("[data-emf=a]");
  const b=await resolveW("b",ib,true);if(!b){out.innerHTML=`<div class="emerr">Zadaj cieľ „Kam“ (mesto, adresu alebo GPS) a vyber ho zo zoznamu.</div>`;return}
  for(let i=0;i<P.via.length;i++){const inp=$(`[data-emf=v${i}]`);if(inp&&inp.value.trim()){const r=await resolveW("v"+i,inp,true);if(!r){out.innerHTML=`<div class="emerr">Zastávku ${i+1} som nenašiel.</div>`;return}}else P.via[i]=null}
  P.via=P.via.filter(Boolean);const back=c.mode==="truck"&&c.trip==="back";P.tripStops=null;
  if(back){for(const w of ["c","d"]){const inp=$(`[data-emf=${w}]`);if(inp&&inp.value.trim()){const r=await resolveW(w,inp,true);if(!r){out.innerHTML=`<div class="emerr">Miesto ${w==="c"?"nakládky spätného nákladu":"návratu"} som nenašiel.</div>`;return}}else setW(w,null)}}
  if(ia&&ia.value.trim()){const r=await resolveW("a",ia,true);if(!r){out.innerHTML=`<div class="emerr">Miesto „Odkiaľ“ som nenašiel.</div>`;return}}
  else{if(!S.me){out.innerHTML=`<div class="emerr">📡 Čakám na tvoju GPS polohu – alebo napíš „Odkiaľ“.</div>`;return}P.a={n:"Moja poloha",lat:S.me.lat,lng:S.me.lng,me:true}}
  btn.disabled=true;btn.textContent="🛣️ Počítam trasy…";out.innerHTML="";
  if(back){btn.disabled=true;btn.textContent="🛣️ Počítam trasu tam a späť…";out.innerHTML="";
    try{const D=P.d||Object.assign({},P.a,{n:P.a.me?"Štart":P.a.n}),B=Object.assign({},P.b,{n:"📦 Vykládka – "+P.b.n,role:"B"}),Cc=P.c?Object.assign({},P.c,{n:"📦 Nakládka – "+P.c.n,role:"C"}):null;
      P.tripStops=[...P.via,B,...(Cc?[Cc]:[])];P.d2=Object.assign({},D,{n:"🏠 "+D.n});const locs=[P.a,...P.tripStops,P.d2];
      const Rs=await routesFor(locs);P.routes=[Rs[0]];P.ri=0;btn.textContent="💶 Počítam mýto a náklady tam aj späť…";P.res=await priceBack(Rs[0],locs);drawPlan(Rs[0]);const o=$(".emres");if(o)o.innerHTML=resAll();panelMin(true);hazards();incidents()}
    catch(x){out.innerHTML=`<div class="emerr">Trasu sa nepodarilo vypočítať (${E(x.message||x)}). Skús znova o chvíľu.</div>`}
    btn.disabled=false;btn.textContent=CL(c.mode);return}
  try{P.routes=await routesFor([P.a,...P.via,P.b]);P.ri=Math.max(0,c.pref==="short"?P.routes.findIndex(r=>/najkratšia/i.test(r.lbl)):0);
    await pick(P.ri,btn);panelMin(true);hazards();incidents()}
  catch(x){out.innerHTML=`<div class="emerr">Trasu sa nepodarilo vypočítať (${E(x.message||x)}). Skús znova o chvíľu.</div>`}
  btn.disabled=false;btn.textContent=CL(c.mode)}
async function pick(i,btn){const R=P.routes[i];if(!R)return;P.ri=i;const c=cfg();
  if(c.mode==="truck"){if(btn)btn.textContent="💶 Počítam mýto a náklady…";const A=await tollSplit(R).catch(()=>null);P.res=price(R,A)}
  else P.res={simple:true,mode:c.mode,a:P.a.n,b:P.b.n,via:P.via.map(v=>v.n),D:R.distance/1000,dur:R.duration,src:R.src};
  drawPlan(R);const o=$(".emres");if(o)o.innerHTML=resAll()}
function delayOf(R){if(!P.inc.length)return 0;let s=0;for(const x of P.inc){if(nearIx(R,x,0).d<0.06)s+=x.delay||0}return s}
function altHTML(){if(P.routes.length<2&&!P.inc.length)return "";const best=P.routes.reduce((a,R,i)=>{const t=R.duration+delayOf(R);return t<a.t?{i,t}:a},{i:0,t:1e12}).i;
  return `<div class="emalts">${P.routes.map((R,i)=>{const d=delayOf(R);return `<button type="button" class="emalt${i===P.ri?" on":""}" data-emalt="${i}"><b>${E(R.lbl)}${i===best&&P.routes.length>1?" 🏆":""}</b><small>${fd(R.distance/1000)} · ${ft(R.duration+d)}${d>60?` <i>🚦 +${Math.round(d/60)} min</i>`:""}${R.hasToll?" · 💶":""}</small></button>`}).join("")}</div>`}
function hazHTML(){const H=P.haz,I=P.inc;if(P.hazBusy)return `<div class="emhz"><small>📷 Hľadám radary a práce na ceste po trase…</small></div>`;
  const cam=H.filter(h=>h.k==="cam").length,wk=H.filter(h=>h.k==="work").length;
  const jam=I.filter(x=>x.k==="jam").length,cl=I.filter(x=>x.k==="closed").length,acc=I.filter(x=>x.k==="acc").length,iw=I.filter(x=>x.k==="work").length,dl=I.reduce((a,x)=>a+(x.onR&&x.delay||0),0);
  return `<div class="emhz"><span>📷 <b>${cam}</b> radarov</span><span>🚧 <b>${wk+iw}</b> prác na ceste</span>${cfg().ttKey?`<span>🚗 <b>${jam}</b> zápch</span><span>💥 <b>${acc}</b> nehôd</span><span>⛔ <b>${cl}</b> uzáver</span>${dl>60?`<span>⏱️ zdržanie <b>+${Math.round(dl/60)} min</b></span>`:""}`:`<small>🚦 Živá doprava je vypnutá – zapni ju v „🚦 Živá doprava“ (kľúč TomTom).</small>`}${P.hazErr?`<small>${E(P.hazErr)}</small>`:""}</div>`}
function poiBtns(){const t=cfg().mode==="truck";return `<div class="emalong"><button type="button" data-emp="fuel">⛽ ČS po trase</button><button type="button" data-emp="food">🍽️ Reštaurácie po trase</button>${t?`<button type="button" data-emp="park">🅿️ Parkovanie kamióny</button>`:""}</div><div class="empoi"></div>`}
function resAll(){return P.res?altHTML()+resHTML(P.res)+hazHTML()+poiBtns():""}
function viaTxt(X){return X.via&&X.via.length?` → ${X.via.map(E).join(" → ")}`:""}
function backHTML(X){const sg=(ic,t,s)=>s?`<div class="emseg"><b>${ic} ${t}</b><small>${fd(s.D)} · ${ft(s.t||0)} · ⛽ ${n2(s.fuelL,0)} l = ${eur(s.fuel)} · 🛣️ mýto ${eur(s.toll)} · 🔧 ${eur(s.other)}${s.est?" · mýto odhad nedostupný":""}</small><span>${eur(s.tot)}</span></div>`:"";
  return `<div class="emcard"><div class="emhd"><b>🔁 ${E(X.a)}${viaTxt(X)} → ${E(X.b)}${X.c!==X.b?" → "+E(X.c):""} → ${E(X.d)}</b><small>${fd(X.D)} spolu · ${ft(X.dur)} jazdy ${X.src==="truck"?"· kamiónová trasa 40 t":"· ⚠️ záloha osobná trasa"}</small></div>
  ${sg("🚛","Tam naložený ("+n2(X.t,0)+" t)",X.o)}${sg("↩️","Prázdny prejazd na nakládku",X.e)}${sg("🔁","Späť naložený ("+n2(X.t2,0)+" t)",X.bk)}
  <div class="emsum"><span class="emtot">Náklady celej jazdy</span><b class="emtot">${eur(X.tot)}</b><span>Dve jazdy s prázdnym návratom by stáli</span><b>${eur(X.solo)}</b><span>💚 Spätný náklad ušetrí</span><b>${eur(X.save)}</b></div>
  <div class="emoffer"><small>💶 Cena tam (marža ${n2(X.marza,0)} %, ½ prázdneho prejazdu)</small><b>${eur(X.pOut)}</b><span>${n2(X.pOut/X.t)} €/t</span></div>
  ${X.bk?`<div class="emoffer"><small>💶 Cena spätného nákladu</small><b>${eur(X.pBack)}</b><span>${n2(X.pBack/X.t2)} €/t</span></div>`:""}
  <div class="embt"><button type="button" class="emgo" data-emgo>▶ Štart navigácie (celá trasa)</button><button type="button" data-emcopy>📋 Kopírovať ceny</button></div></div>`}
function resHTML(X){if(X.back)return backHTML(X);if(X.simple)return `<div class="emcard emsim"><div class="emhd"><b>${X.mode==="pedestrian"?"🚶":"🚗"} ${E(X.a)}${viaTxt(X)} → ${E(X.b)}</b><small>${fd(X.D)} · ${ft(X.dur)} ${X.mode==="pedestrian"?"pešo":"autom"}</small></div>
  <div class="embt"><button type="button" class="emgo" data-emgo>▶ Štart navigácie</button></div></div>`;
  const fl=X.rows.reduce((a,r)=>a+r.fuelL,0);
  return `<div class="emcard"><div class="emhd"><b>🚛 ${E(X.a)}${viaTxt(X)} → ${E(X.b)}</b><small>${fd(X.D)} · ${ft(X.dur)} ${X.src==="truck"?"· kamiónová trasa 40 t":"· ⚠️ záloha osobná trasa (kamiónová služba neodpovedá)"}${X.ret?` · s prázdnym návratom ${fd(X.D*2)}`:""}</small></div>
  <div class="emoffer"><small>💶 Navrhovaná cena prepravy (marža ${n2(X.marza,0)} %)</small><b>${eur(X.offer)}</b><span>${n2(X.offer/X.t)} €/t · ${n2(X.offer/X.D)} €/km · náklady ${eur(X.tot)}</span></div>
  <div class="embt"><button type="button" class="emgo" data-emgo>▶ Štart navigácie</button><button type="button" data-emcopy>📋 Kopírovať cenu</button></div>
  <details class="emdet"><summary>Rozpis nákladov a mýta</summary>
  <div class="emtb">${X.rows.map(r=>`<div><span>${FLAG[r.k]||"🌍"} ${E(CN[r.k]||r.k)}</span><small>${n2(r.km,0)} km · mýtne ${n2(r.tkm,0)} km</small><small>⛽ ${n2(r.fuelL*1,0)} l × ${n2(r.L,3)} = ${eur(r.fuel)}</small><small>🛣️ mýto ${eur(r.toll)}</small></div>`).join("")}</div>
  <div class="emsum"><span>⛽ Nafta ${n2(fl,0)} l</span><b>${eur(X.fuel)}</b><span>🛣️ Mýto${X.est?" (odhad nedostupný)":""}</span><b>${eur(X.toll)}</b><span>🔧 Ostatné pohyblivé (${n2(X.oth,3)} €/km)</span><b>${eur(X.other)}</b>
   <span class="emtot">Náklady spolu</span><b class="emtot">${eur(X.tot)}</b><span>na tonu (${n2(X.t,0)} t) · na km</span><b>${n2(X.tot/X.t)} €/t · ${n2(X.tot/X.D)} €/km</b></div></details></div>`}
const RC=()=>{const md=cfg().mode;return md==="truck"?["#f59e0b","#fde68a"]:md==="auto"?["#22d3ee","#a7f3d0"]:["#a78bfa","#ddd6fe"]};
function clearLayers(){S.rL.forEach(l=>l.remove());S.rL=[];P.altL.forEach(l=>l.remove());P.altL=[];if(P.hazL){P.hazL.remove();P.hazL=null}if(P.poiL){P.poiL.remove();P.poiL=null}if(S.mvL){S.mvL.forEach(l=>l.remove());S.mvL=null}}
function drawRouteLines(R){const [c1,c2]=RC();S.rL.slice(0,2).forEach(l=>l.remove());const a=L.polyline(R.pts,{color:c1,weight:12,opacity:.25}).addTo(S.map),b=L.polyline(R.pts,{color:c2,weight:5,opacity:.95,className:"emglow"}).addTo(S.map);S.rL.splice(0,2,a,b)}
function drawPlan(R){S.route=R;S.steps=R.legs[0].steps||[];S.si=0;{const fin=P.tripStops&&P.d2?P.d2:P.b;S.dest={n:fin.n,lat:fin.lat,lng:fin.lng}}S.replan=replan;S.ix=0;
  S.rL.forEach(l=>l.remove());S.rL=[];P.altL.forEach(l=>l.remove());P.altL=[];
  P.routes.forEach((A,i)=>{if(i===P.ri)return;const l=L.polyline(A.pts,{color:"#94a3b8",weight:6,opacity:.55,dashArray:"2 8"}).addTo(S.map);l.on("click",()=>pick(i));P.altL.push(l)});
  const [c1,c2]=RC();S.rL=[L.polyline(R.pts,{color:c1,weight:12,opacity:.25}).addTo(S.map),L.polyline(R.pts,{color:c2,weight:5,opacity:.95,className:"emglow"}).addTo(S.map),
    L.marker(R.pts[0],{icon:L.divIcon({className:"emfuel",html:"🅰️",iconSize:[30,30]})}).addTo(S.map),L.marker(R.pts[R.pts.length-1],{icon:L.divIcon({className:"emfuel near",html:"🏁",iconSize:[30,30]})}).addTo(S.map)];
  navStops().forEach((v,i)=>S.rL.push(L.marker([v.lat,v.lng],{icon:L.divIcon({className:"emfuel",html:v.role==="B"?"📦":v.role==="C"?"🔁":String(i+1),iconSize:[30,30]})}).addTo(S.map)));
  S.follow=false;fitRoute();const st=$(".emst");if(st)st.innerHTML="";const g=$(".emgg");if(g){g.hidden=false;g.href=`https://www.google.com/maps/dir/?api=1&origin=${P.a.lat},${P.a.lng}&destination=${P.b.lat},${P.b.lng}${P.via.length?"&waypoints="+encodeURIComponent(P.via.map(v=>v.lat+","+v.lng).join("|")):""}&travelmode=${cfg().mode==="pedestrian"?"walking":"driving"}`}
  if(P.haz.length)drawHaz()}
// pri zídení z trasy počas navigácie: nová trasa z mojej polohy cez zostávajúce zastávky do cieľa (cena sa nemení)
async function replan(){if(!S.me||!P.b)return;try{const left=navStops().filter(v=>!v.done);const Rs=await routesFor([{lat:S.me.lat,lng:S.me.lng,n:"Moja poloha"},...left,S.dest||P.b]);const R=Rs[0];
  S.route=R;S.steps=R.legs[0].steps||[];S.si=0;S.ix=0;drawRouteLines(R);if(S.mvL){S.mvL.forEach(l=>l.remove());S.mvL=null;S.mvFor=null}navTick(true)}catch(x){}}
function copyTxt(){const X=P.res;if(!X||X.simple)return;if(X.back){const t=`Preprava tam a späť: ${X.a} → ${X.b}${X.c!==X.b?" → "+X.c:""} → ${X.d}, spolu ${n2(X.D,0)} km. Tam ${n2(X.t,0)} t: ${eur(X.pOut)} (${n2(X.pOut/X.t)} €/t). ${X.bk?`Spätný náklad ${n2(X.t2,0)} t: ${eur(X.pBack)} (${n2(X.pBack/X.t2)} €/t). `:""}Náklady celej jazdy ${eur(X.tot)}.`;try{navigator.clipboard.writeText(t);if(typeof toast==="function")toast("📋 Skopírované",2500)}catch(x){}return}const t=`Preprava ${X.a}${X.via&&X.via.length?" → "+X.via.join(" → "):""} → ${X.b}: ${n2(X.D,0)} km${X.ret?" (+ prázdny návrat)":""}, ${n2(X.t,0)} t. Náklady ${eur(X.tot)} (nafta ${eur(X.fuel)}, mýto ${eur(X.toll)}, ostatné ${eur(X.other)}). Cena ${eur(X.offer)} = ${n2(X.offer/X.t)} €/t.`;
  try{navigator.clipboard.writeText(t);if(typeof toast==="function")toast("📋 Skopírované",2500)}catch(x){}}
// ---------- 📷 radary a 🚧 práce na ceste (OpenStreetMap) ----------
async function ovpAny(q){return Promise.any(OVP.map(u=>fetch(u,{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded"},signal:tmo(35000)}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()})))}
const lineOf=pts=>thin(pts,Math.min(220,Math.max(30,Math.round(pts.length/8)))).map(p=>p[0].toFixed(5)+","+p[1].toFixed(5)).join(",");
async function hazards(){const R=S.route;if(!R||cfg().mode==="pedestrian"){P.haz=[];drawHaz();return}P.hazBusy=true;P.hazErr="";paintRes();
  const ln=lineOf(R.pts),q=`[out:json][timeout:30];(node["highway"="speed_camera"](around:70,${ln});node["enforcement"="maxspeed"](around:70,${ln});way["highway"="construction"](around:30,${ln});node["highway"="construction"](around:30,${ln}););out center 400;`;
  try{const j=await ovpAny(q);const C=cum(R);P.haz=(j.elements||[]).map(e=>{const t=e.tags||{},lat=e.lat??(e.center&&e.center.lat),lng=e.lon??(e.center&&e.center.lon);if(lat==null)return null;
      const n=nearIx(R,{lat,lng});return {k:t.highway==="construction"?"work":"cam",lat,lng,sp:t.maxspeed||"",at:C[n.i],off:n.d,nm:t.name||t.construction||""}}).filter(h=>h&&h.off<0.12).sort((a,b)=>a.at-b.at)}
  catch(x){P.haz=[];P.hazErr="Radary a práce na ceste sa teraz nepodarilo načítať (OpenStreetMap neodpovedá) – skús „Vypočítať“ znova."}
  P.hazBusy=false;drawHaz();paintRes()}
function drawHaz(){if(!S.map)return;if(P.hazL)P.hazL.remove();P.hazL=L.layerGroup().addTo(S.map);
  for(const h of P.haz)L.marker([h.lat,h.lng],{icon:L.divIcon({className:"emhzi "+h.k,html:h.k==="cam"?"📷":"🚧",iconSize:[26,26]}),title:h.k==="cam"?`Radar${h.sp?" "+h.sp+" km/h":""}`:"Práce na ceste"}).addTo(P.hazL);
  for(const x of P.inc)L.marker([x.lat,x.lng],{icon:L.divIcon({className:"emhzi inc "+x.k,html:INCI[x.k]||"⚠️",iconSize:[28,28]}),title:x.d||""}).addTo(P.hazL)}
function paintRes(){const o=$(".emres");if(o&&P.res){const p=o.querySelector(".empoi"),keep=p?p.innerHTML:"";o.innerHTML=resAll();const p2=o.querySelector(".empoi");if(p2)p2.innerHTML=keep}}
// ---------- 🚦 živá doprava (TomTom Traffic Incidents v5, kľúč iba v tomto zariadení) ----------
const INCI={jam:"🚗",acc:"💥",closed:"⛔",work:"🚧",lane:"↔️",haz:"⚠️",weather:"🌧️"};
const TTK=c=>c===6?"jam":c===1?"acc":c===8?"closed":c===9?"work":c===7?"lane":c===2||c===3||c===4||c===5?"weather":"haz";
async function incidents(){const k=cfg().ttKey,md=cfg().mode;P.inc=[];if(!k||md==="pedestrian"||!P.routes.length)return;
  const tiles=new Map();for(const R of P.routes)for(const p of thin(R.pts,500)){const key=Math.floor(p[0]/0.5)+":"+Math.floor(p[1]/0.5);if(!tiles.has(key))tiles.set(key,[Math.floor(p[1]/0.5)*0.5,Math.floor(p[0]/0.5)*0.5])}
  const fields=encodeURIComponent("{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description},from,to,delay,length}}}");const seen=new Set();
  for(const [key,[lo,la]] of [...tiles].slice(0,30)){try{const bb=[lo,la,lo+0.5,la+0.5].map(x=>x.toFixed(2)).join(",");
      let r=await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?key=${encodeURIComponent(k)}&bbox=${bb}&fields=${fields}&language=sk-SK&timeValidityFilter=present`,{signal:tmo(12000)});
      if(r.status===400)r=await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?key=${encodeURIComponent(k)}&bbox=${bb}&fields=${fields}&language=en-GB&timeValidityFilter=present`,{signal:tmo(12000)});
      if(r.status===401||r.status===403){P.hazErr="🚦 Kľúč TomTom nie je platný – skontroluj ho v „🚦 Živá doprava“.";break}if(!r.ok)continue;
      for(const it of (await r.json()).incidents||[]){const g=it.geometry||{},co=g.type==="Point"?[g.coordinates]:g.coordinates||[];if(!co.length)continue;const pr=it.properties||{},id=JSON.stringify(co[0]);if(seen.has(id))continue;seen.add(id);
        const c0=co[Math.floor(co.length/2)]||co[0];P.inc.push({k:TTK(pr.iconCategory),lat:c0[1],lng:c0[0],delay:pr.delay||0,d:[(pr.events||[]).map(e=>e.description).join(", "),pr.from&&pr.to?pr.from+" → "+pr.to:""].filter(Boolean).join(" · ")})}}catch(x){}}
  const R=S.route,C=R?cum(R):null;P.inc=P.inc.filter(x=>P.routes.some(A=>nearIx(A,x).d<0.08));if(R)P.inc.forEach(x=>{const n=nearIx(R,x);x.onR=n.d<0.06;x.at=C[n.i]});
  drawHaz();paintRes()}
// ---------- ⛽ / 🍽️ / 🅿️ po trase ----------
const POIQ={fuel:['["amenity"="fuel"]'],food:['["amenity"~"^(restaurant|fast_food)$"]'],park:['["amenity"="parking"]["hgv"~"yes|designated"]','["highway"~"^(rest_area|services)$"]']};
const POIN={fuel:[["amenity","fuel"]],food:[["amenity","restaurant"],["amenity","fast_food"]],park:[["q","truck stop"],["q","rest area"]]};
const POII={fuel:"⛽",food:"🍽️",park:"🅿️"};
async function alongPOI(kind,box){const R=S.route;if(!R||!box)return;box.innerHTML=`<small class="emnote">${POII[kind]} Hľadám po trase…</small>`;
  const C=cum(R),start=S.nav&&S.me?nearIx(R,S.me).i:0,a0=C[start];let end=start;while(end<R.pts.length-1&&C[end]-a0<160)end++;
  const seg=R.pts.slice(start,end+1);let L0=[];
  try{const ln=lineOf(seg),q=`[out:json][timeout:25];(${POIQ[kind].map(f=>`nwr${f}(around:1500,${ln});`).join("")});out center 150;`;
    const j=await ovpAny(q);L0=(j.elements||[]).map(e=>({lat:e.lat??(e.center&&e.center.lat),lng:e.lon??(e.center&&e.center.lon),t:e.tags||{}})).filter(x=>x.lat!=null)}
  catch(x){// záloha Nominatim: body každých ~20 km
    const sm=[];for(let i=start;i<=end;i++){if(!sm.length||C[i]-C[sm[sm.length-1]]>20)sm.push(i)}
    for(const i of sm.slice(0,7)){const p=R.pts[i],vb=[p[1]-0.03,p[0]+0.02,p[1]+0.03,p[0]-0.02].map(x=>x.toFixed(4)).join(",");
      for(const [k,v] of POIN[kind]){try{const r=await fetch(`https://nominatim.openstreetmap.org/search?${k}=${encodeURIComponent(v)}&format=jsonv2&extratags=1&limit=10&bounded=1&viewbox=${vb}&accept-language=sk`,{signal:tmo(9000)});
        if(r.ok)for(const e of await r.json())L0.push({lat:+e.lat,lng:+e.lon,t:{name:e.name||(e.extratags||{}).brand||"",brand:(e.extratags||{}).brand}})}catch(x){}}}}
  const seen=new Set(),out=[];for(const s of L0){const n=nearIx(R,s);if(n.d>1.6||n.i<start)continue;const id=s.lat.toFixed(4)+s.lng.toFixed(4);if(seen.has(id))continue;seen.add(id);
    out.push({lat:s.lat,lng:s.lng,n:s.t.name||s.t.brand||s.t.operator||({fuel:"Čerpacia stanica",food:"Reštaurácia",park:"Parkovisko"})[kind],at:C[n.i]-a0,off:n.d})}
  out.sort((a,b)=>a.at-b.at);P.pois=out.slice(0,15);
  if(P.poiL)P.poiL.remove();P.poiL=L.layerGroup().addTo(S.map);P.pois.forEach((s,i)=>L.marker([s.lat,s.lng],{icon:L.divIcon({className:"emfuel",html:POII[kind],iconSize:[28,28]})}).on("click",()=>addVia(i)).addTo(P.poiL));
  box.innerHTML=P.pois.length?P.pois.map((s,i)=>`<button type="button" class="emli" data-empa="${i}"><b>${POII[kind]} ${E(s.n)}</b><small>o ${fd(s.at)} po trase · ${fd(s.off)} od trasy · ＋ pridať ako zastávku</small></button>`).join("")
    :`<small class="emnote">${POII[kind]} Do 160 km po trase som nič nenašiel (alebo mapové služby neodpovedajú).</small>`}
async function addVia(i){const s=(P.pois||[])[i];if(!s)return;const v={n:s.n,lat:s.lat,lng:s.lng};
  if(S.nav){P.via.unshift(v);say("Pridávam zastávku "+s.n);const pp=$(".emalp");if(pp)pp.hidden=true;await replan();return}
  // v plánovaní: zastávku vlož podľa poradia po trase a prepočítaj
  const R=S.route,at=nearIx(R,v).i;let k=0;for(;k<P.via.length;k++){if(nearIx(R,P.via[k]).i>at)break}P.via.splice(k,0,v);const pl=$(".empl");if(pl){pl.innerHTML=planUI()}await calc()}
document.addEventListener("input",e=>{const t=e.target;if(!t.closest||!t.closest("#emap .empl"))return;
  if(t.dataset.emf){const w=t.dataset.emf;setW(w,null);clearTimeout(acT);const q=t.value,sq=++acSeq;acT=setTimeout(async()=>{const g=await geo(q);if(sq===acSeq)sug(w,g)},350);return}
  if(t.dataset.emc){const c=cfg(),k=t.dataset.emc;if(k==="ret")c.ret=t.checked;else if(k==="ttKey")c.ttKey=t.value.trim();else{const v=rdNum(t.value);if(v!=null)c[k]=v}cfgSave();return}
  if(t.dataset.emtl){const [k,w]=t.dataset.emtl.split("."),v=rdNum(t.value);if(v!=null){cfg().toll[k][w]=v;cfgSave()}}},true);
document.addEventListener("change",e=>{const t=e.target;if(t.dataset&&t.dataset.emc==="ret"){cfg().ret=t.checked;cfgSave()}},true);
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-emplan],[data-emsg],[data-emcalc],[data-emcopy],[data-emmd],[data-emo],[data-emtrip],[data-emaddv],[data-emvx],[data-emalt],[data-emp],[data-empa],[data-empmin]");if(!t||!t.closest("#emap"))return;e.preventDefault();e.stopPropagation();
  const D=t.dataset;if(D.emplan!==undefined)return showPlan(true);
  if(D.emmd!==undefined){const c=cfg();c.mode=D.emmd;cfgSave();const pl=$(".empl");pl.dataset.md=c.mode;pl.querySelectorAll("[data-emmd]").forEach(b=>b.classList.toggle("on",b===t));$("[data-emcalc]").textContent=CL(c.mode);if(P.b)calc();return}
  if(D.emo!==undefined){const c=cfg();if(D.emo==="pref"){c.pref=D.v;t.parentNode.querySelectorAll("[data-emo=pref]").forEach(b=>b.classList.toggle("on",b===t));if(P.routes.length){const i=c.pref==="short"?P.routes.findIndex(r=>/najkratšia/i.test(r.lbl)):0;if(i>=0)pick(i)}}
    else{c[D.emo]=!c[D.emo];t.classList.toggle("on",c[D.emo]);if(P.b)calc()}cfgSave();return}
  if(D.emtrip!==undefined){const c=cfg();c.trip=D.emtrip;cfgSave();const pl=$(".empl");pl.dataset.trip=c.trip;pl.querySelectorAll("[data-emtrip]").forEach(b=>b.classList.toggle("on",b===t));if(P.b)calc();return}
  if(D.emaddv!==undefined){P.via.push(null);const pl=$(".empl");pl.innerHTML=planUI();const i=$(`[data-emf=v${P.via.length-1}]`);if(i)i.focus();return}
  if(D.emvx!==undefined){P.via.splice(+D.emvx,1);const pl=$(".empl");pl.innerHTML=planUI();if(P.b&&P.res)calc();return}
  if(D.emalt!==undefined)return pick(+D.emalt);if(D.emcalc!==undefined)return calc();if(D.emcopy!==undefined)return copyTxt();
  if(D.emp!==undefined){t.parentNode.querySelectorAll("[data-emp]").forEach(b=>b.classList.toggle("on",b===t));return alongPOI(D.emp,t.closest(".emres,.emalp").querySelector(".empoi"))}
  if(D.empa!==undefined)return addVia(+D.empa);
  if(D.empmin!==undefined)return panelMin(!P.min);
  if(D.emsg!==undefined){const box=$(".emsug"),w=box.dataset.w,s=(P.sl||[])[+D.emsg];if(!s)return;setW(w,s);const i=$(`[data-emf=${w}]`);if(i)i.value=s.n;box.innerHTML="";
    if(w==="a"&&!P.b){const ib=$("[data-emf=b]");if(ib)ib.focus()}else if(P.b&&w!=="a"||P.b)calc()}},true);
const OK=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK()&&!window.ERNTE_VIEWAS; // príkaz majiteľa 30. 10.: ERNTE Maps iba Martin
// ===== 31. 10. (príkaz majiteľa): navigácia vždy pokračuje, dojazd km a čas, nadmorská výška, náklady, strážca trasy =====
const NK="ernte-nav-live";
function navSave(){try{if(!S.nav||!S.dest)return;localStorage.setItem(NK,JSON.stringify({dest:{n:S.dest.n,lat:+S.dest.lat,lng:+S.dest.lng},
  via:navStops().filter(v=>!v.done).map(v=>({n:v.n,lat:+v.lat,lng:+v.lng})),rate:P.res&&P.res.D>0?P.res.tot/P.res.D:((navSaved()||{}).rate||null),at:Date.now()}))}catch(x){}}
function navClear(){try{localStorage.removeItem(NK)}catch(x){}fixHide();if(S.fixT){clearInterval(S.fixT);S.fixT=null}}
function navSaved(){try{const o=JSON.parse(localStorage.getItem(NK)||"null");if(o&&o.dest&&Date.now()-o.at<12*36e5)return o}catch(x){}return null}
const fdur=s=>{const m=Math.max(0,Math.round(s/60));return m<60?m+" min":Math.floor(m/60)+" h "+String(m%60).padStart(2,"0")};
// výška: GPS telefónu, inak Open-Meteo podľa polohy (najviac raz za minútu alebo po 300 m)
function altOf(c){if(c&&c.alt!=null&&isFinite(c.alt))return Math.round(c.alt);const A=S.altE;if(A&&Date.now()-A.at<6e4&&km(c,A)<0.3)return A.v;
  if(!S.altBusy&&c){S.altBusy=true;fetch(`https://api.open-meteo.com/v1/elevation?latitude=${c.lat.toFixed(5)}&longitude=${c.lng.toFixed(5)}`,{signal:tmo(8000)}).then(r=>r.json()).then(j=>{const v=j&&j.elevation&&j.elevation[0];if(v!=null){S.altE={lat:c.lat,lng:c.lng,v:Math.round(v),at:Date.now()};const al=$(".emalt");if(al)al.textContent=Math.round(v)+" m"}}).catch(()=>{}).finally(()=>{S.altBusy=false})}
  return A?A.v:null}
function hudX(rem,sec){{const hd=$(".emhud"),o=document.getElementById("emap");if(hd&&o&&!hd.hidden)o.style.setProperty("--hudh",hd.offsetHeight+"px")}const rt=$(".emrt");if(rt)rt.textContent=sec?fdur(sec):"–";const al=$(".emalt");if(al){const v=altOf(S.me);al.textContent=v!=null?v+" m":"–"}
  const co=$(".emcost");if(co){const sv=navSaved(),r=(P.res&&P.res.D>0)?P.res.tot/P.res.D:sv&&sv.rate;co.textContent=r?Math.round(rem*r).toLocaleString("sk-SK")+" €":"–"}
  if(S.nav&&(!S.lastSave||Date.now()-S.lastSave>30000)){S.lastSave=Date.now();navSave()}}
// 🛡️ strážca trasy: každé 3 min prepočíta trasu z mojej polohy (aj s dopravnými udalosťami), nájde problém a ponúkne riešenie
function fixHide(){const f=$(".emfix");if(f){f.hidden=true;f.innerHTML=""}S.fixR=null}
function fixStart(){if(S.fixT)clearInterval(S.fixT);S.fixT=setInterval(()=>{if(S.nav&&!document.hidden)fixCheck()},180000);setTimeout(()=>{if(S.nav)fixCheck()},45000)}
async function fixCheck(){if(S.fixBusy||!S.nav||!S.me||!S.dest||!S.route||cfg().mode==="pedestrian")return;S.fixBusy=true;
  try{const left=navStops().filter(v=>!v.done);const Rs=await routesFor([{lat:S.me.lat,lng:S.me.lng,n:"Moja poloha"},...left,S.dest]);if(!Rs.length||!S.nav)return;
    const keep=P.routes,keepRi=P.ri;P.routes=Rs.concat([S.route]);try{await incidents()}catch(x){}P.routes=keep;P.ri=keepRi;
    const R=S.route,C=cum(R),T=C[C.length-1]||1,ni=nearIx(R,S.me),frac=Math.max(0,1-C[ni.i]/T),dCur=delayOf(R),cur=R.duration*frac+dCur;
    let best=null;for(const A of Rs){const t=A.duration+delayOf(A);if(!best||t<best.t)best={A,t}}
    if(!best)return;const gain=cur-best.t,same=Math.abs(best.A.distance-R.distance*frac)<Math.max(500,R.distance*frac*0.02);
    if(gain<300||same){if(!S.fixR)fixHide();return}
    const prob=dCur>120?`🚦 Na tvojej trase je zdržanie +${Math.round(dCur/60)} min (zápcha, nehoda alebo uzávera)`:`🐢 Premávka na tvojej trase je pomalšia, než sa čakalo`;
    const sol=`Obchádzka ${fd(best.A.distance/1000)} · príchod ${new Date(Date.now()+best.t*1000).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})} · ušetríš ${fdur(gain)}`;
    S.fixR=best.A;const f=$(".emfix");if(f){const hd=$(".emhud");f.style.bottom=((hd&&!hd.hidden?hd.offsetHeight:0)+20)+"px";f.innerHTML=`<b>${E(prob)}</b><span>✅ Riešenie: ${E(sol)}</span><div><button type="button" data-emfixok>Použiť obchádzku</button><button type="button" data-emfixno>Ostať</button></div>`;f.hidden=false}
    if(!S.fixSaid||Date.now()-S.fixSaid>600000){S.fixSaid=Date.now();say("Pozor, na trase je problém. Našla som obchádzku, ušetríš "+fdur(gain)+".")}}
  catch(x){}finally{S.fixBusy=false}}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-emfixok],[data-emfixno]");if(!b||!b.closest("#emap"))return;e.preventDefault();e.stopPropagation();
  if(b.dataset.emfixno!==undefined){fixHide();return}const R=S.fixR;if(!R)return fixHide();
  S.route=R;S.steps=R.legs[0].steps||[];S.si=0;S.ix=0;drawRouteLines(R);if(S.mvL){S.mvL.forEach(l=>l.remove());S.mvL=null;S.mvFor=null}fixHide();say("Idem po obchádzke.");navTick(true);navSave()},true);
// po znovuotvorení aplikácie (aj po zatvorení z plochy) navigácia pokračuje presne odtiaľ, kde si
async function navResume(){const sv=navSaved();if(!sv||S.nav||!OK())return;open();status(`🧭 Pokračujem v navigácii do <b>${E(sv.dest.n||"cieľa")}</b> – čakám na GPS…`);
  const t0=Date.now();while(!(S.me&&S.me.acc<=1000)&&Date.now()-t0<120000)await new Promise(r=>setTimeout(r,1000));
  if(!S.me||!document.getElementById("emap")||!document.getElementById("emap").classList.contains("on"))return;
  try{P.a={lat:S.me.lat,lng:S.me.lng,n:"Moja poloha"};P.b=sv.dest;P.via=sv.via||[];S.mode="plan";const Rs=await routesFor([P.a,...P.via,P.b]);if(!Rs.length)throw 0;
    P.routes=Rs;P.ri=0;drawPlan(Rs[0]);startNav();say("Pokračujem v navigácii do "+(sv.dest.n||"cieľa"))}
  catch(x){status("Trasu sa nepodarilo obnoviť – skús znova alebo zadaj cieľ.")}}
{let n=0;const t=setInterval(()=>{n++;if(n>60){clearInterval(t);return}if(typeof ME==="undefined"||!ME||typeof ROLE==="undefined"||!ROLE)return;clearInterval(t);if(navSaved()&&OK())setTimeout(navResume,800)},1000)}
{const s=document.createElement("style");s.textContent=`.emhud{grid-template-columns:repeat(3,minmax(0,1fr))!important;row-gap:4px!important;padding:6px 8px!important}.emhud>div{min-width:0;align-content:start}.emhud b{overflow-wrap:anywhere;font-size:1.15rem!important;white-space:nowrap}.emhud small{font-size:.66rem!important;white-space:nowrap}
#emap.navon .emnbt{bottom:calc(var(--hudh,92px) + 12px + env(safe-area-inset-bottom))!important}
.emfix{position:absolute;left:10px;right:10px;bottom:150px;z-index:1001;display:grid;gap:6px;padding:10px 12px;border-radius:16px;background:rgba(40,20,5,.94);border:1px solid rgba(251,191,36,.75);box-shadow:0 0 22px rgba(251,191,36,.4);color:#fff;text-align:left}
.emfix b{color:#fde68a;overflow-wrap:anywhere}.emfix span{font-size:.9rem;overflow-wrap:anywhere}.emfix div{display:flex;gap:8px;flex-wrap:wrap}
.emfix button{flex:1 1 140px;min-height:44px;border-radius:12px;border:0;font:800 .9rem system-ui;background:linear-gradient(135deg,#fde68a,#f59e0b);color:#1a1205}.emfix button[data-emfixno]{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25)}`;document.head.appendChild(s)}
window.ernteMaps={open:c=>OK()?open(c):null,close,ok:OK,resume:navResume};
// 🗺️ tlačidlo v hornej lište aplikácie (iba Martin)
function hdrBtn(){const app=document.getElementById("app");if(!app)return;const row=app.querySelector(":scope > .hrow");const ok=OK();
  let b=document.querySelector(".emhb");if(!ok||!row){if(b)b.remove();return}if(b&&b.parentNode===row)return;if(b)b.remove();
  b=document.createElement("button");b.type="button";b.className="emhb";b.setAttribute("aria-label","ERNTE Maps – navigácia, čerpacie stanice, reštaurácie");b.title="ERNTE Maps";b.textContent="🗺️";b.onclick=()=>open();
  const bell=row.querySelector(".nbb");if(bell)bell.insertAdjacentElement("beforebegin",b);else row.prepend(b)}
{let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{hdrBtn()}catch(x){}})};const boot=()=>{const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot()}
{const s=document.createElement("style");s.textContent=`#emap{position:fixed;inset:0;z-index:31000;display:none;flex-direction:column;background:#05070d;color:#f1f5ff;font-family:"Geist",system-ui,sans-serif}
#emap.on{display:flex}html.emon{overflow:hidden}
.emh{display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;background:linear-gradient(135deg,rgba(14,165,233,.25),rgba(167,139,250,.2));border-bottom:1px solid rgba(255,255,255,.12)}
.emh b{font-size:1.05rem;text-shadow:0 0 12px rgba(125,211,252,.8)}.emgps{flex:1;font-size:.78rem;opacity:.85}.emgps.ok{color:#86efac}
.emx{width:44px;height:44px;min-width:44px;border-radius:50%!important;padding:0!important;display:grid;place-items:center;font-size:1.1rem}
.emm{flex:1 1 auto;min-height:200px}
.emm{position:relative;overflow:hidden;background:radial-gradient(120% 60% at 50% 0%,#1e3a8a 0%,#0b1020 55%,#05070d 100%)}#emMap{position:absolute;inset:0}
#emMap.navmap{pointer-events:none}
#emap>.emnav{left:10px!important;right:10px!important;width:auto!important;max-width:none!important;transform:none!important;margin:0!important}
#emMap.navmap .leaflet-control-container,#emap.navon .leaflet-control-container{display:none}
#emap.navon .emme i{width:0;height:0;border-radius:0;background:none;border:none;box-shadow:none;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:30px solid #38bdf8;filter:drop-shadow(0 0 10px rgba(56,189,248,.95)) drop-shadow(0 0 2px #fff);margin:-6px 0 0 -3px;transition:transform .9s linear}
#emap.navon .emme{animation:none}
.emhud{position:absolute;left:10px;right:10px;bottom:10px;z-index:1000;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px;border-radius:18px;background:rgba(5,7,13,.86);border:1px solid rgba(56,189,248,.5);box-shadow:0 0 22px rgba(56,189,248,.35);text-align:center}
#emap.navon .emh,#emap.navon .emp,#emap.navon .emcats{display:none!important}
#emap.navon .emnav{top:calc(10px + env(safe-area-inset-top))}
.emnbt{position:absolute;right:10px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:1001;display:grid;gap:10px}.emnbt[hidden]{display:none}
.emnb{width:56px;height:56px;min-width:56px;border-radius:50%!important;padding:0!important;display:grid;place-items:center;font-size:1.4rem;background:rgba(5,7,13,.86)!important;border:1px solid rgba(56,189,248,.6)!important;color:#fff!important;box-shadow:0 0 16px rgba(56,189,248,.45)}
.emnb.stop{border-color:rgba(248,113,113,.8)!important;box-shadow:0 0 16px rgba(248,113,113,.5);color:#fca5a5!important}
.emcar{position:absolute;left:10px;right:76px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:1001;display:grid;gap:8px;padding:12px;border-radius:18px;background:rgba(5,7,13,.94);border:1px solid rgba(56,189,248,.55);box-shadow:0 0 22px rgba(56,189,248,.35)}.emcar[hidden]{display:none}
.emcar small{opacity:.75;font-size:.74rem;line-height:1.35}.emca{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:999px;font-weight:800;text-decoration:none;color:#fff!important;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);text-align:center;padding:4px 10px}
.emca.g{background:linear-gradient(135deg,#22c55e,#22d3ee)!important;color:#05210f!important;border:0}
#emap.navon .emhud{bottom:calc(10px + env(safe-area-inset-bottom))}

.emdist{font-size:1.6rem;line-height:1;font-weight:900;letter-spacing:-.02em}.emarrow{font-size:2.8rem!important}
.emprog{position:absolute;left:14px;right:14px;bottom:6px;height:4px;border-radius:9px;background:rgba(255,255,255,.15);overflow:hidden}.emprog>i{display:block;height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,#22d3ee,#a3e635);transition:width .8s linear}
.emnav{padding-bottom:16px!important}.emnav.near{background:rgba(2,44,88,.95)!important;border-color:#38bdf8!important;box-shadow:0 0 30px rgba(56,189,248,.8)!important;animation:emnear 1s ease-in-out infinite alternate}
@keyframes emnear{to{box-shadow:0 0 12px rgba(56,189,248,.4)}}
.emmv{filter:drop-shadow(0 0 8px #38bdf8)}.emchev{animation:emchev .9s linear infinite}@keyframes emchev{to{stroke-dashoffset:-20}}
.emmvh i{display:block;width:0;height:0;margin:2px auto 0;border-left:15px solid transparent;border-right:15px solid transparent;border-bottom:28px solid #e0f2fe;filter:drop-shadow(0 0 8px #38bdf8)}
.emfuel,.emhzi,.emme,.emmvh{min-height:0!important;min-width:0!important;padding:0!important;box-sizing:border-box!important;line-height:1!important}
.emhzi{display:grid!important;place-items:center;font-size:15px;border-radius:50%;background:rgba(5,7,13,.9);border:2px solid #f87171;box-shadow:0 0 10px rgba(248,113,113,.8)}.emhzi.work{border-color:#fb923c;box-shadow:0 0 10px rgba(251,146,60,.8)}.emhzi.inc{border-color:#facc15}
.emwarn{position:absolute;left:10px;right:76px;top:calc(122px + env(safe-area-inset-top));z-index:1001;display:flex;gap:10px;align-items:center;padding:8px 12px;border-radius:16px;background:rgba(69,10,10,.92);border:1px solid rgba(248,113,113,.8);box-shadow:0 0 20px rgba(248,113,113,.55)}
.emwarn[hidden]{display:none}.emwarn span{font-size:1.8rem}.emwarn b{display:block;font-size:1.05rem}.emwarn small{opacity:.85}.emwarn.work{background:rgba(67,30,4,.92);border-color:#fb923c}.emwarn.jam{background:rgba(66,32,6,.92);border-color:#facc15}
.emovt{position:absolute;left:10px;right:10px;top:calc(122px + env(safe-area-inset-top));z-index:1001;display:grid;gap:2px;padding:10px 12px;border-radius:16px;background:rgba(5,7,13,.9);border:1px solid rgba(56,189,248,.55)}.emovt[hidden]{display:none}.emovt small{opacity:.85}
.emnb.on{background:linear-gradient(135deg,#22d3ee,#a3e635)!important;color:#05210f!important}
.emalp{position:absolute;left:10px;right:76px;bottom:calc(92px + env(safe-area-inset-bottom));max-height:52%;overflow:auto;z-index:1001;display:grid;gap:8px;padding:12px;border-radius:18px;background:rgba(5,7,13,.94);border:1px solid rgba(56,189,248,.55)}.emalp[hidden]{display:none}
.emalong{display:flex;gap:6px;flex-wrap:wrap}.emalong button{min-height:40px;border-radius:999px;padding:4px 12px;font-weight:700}.emalong button.on{background:linear-gradient(135deg,#22d3ee,#a3e635)!important;color:#05210f!important}
.empoi{display:grid;gap:6px}
.emopt{display:flex;flex-wrap:wrap;gap:6px}.emopt button{min-height:40px;border-radius:999px;padding:4px 12px;font-weight:700;font-size:.85rem}.emopt button.on{background:rgba(34,211,238,.25)!important;border-color:#22d3ee!important;box-shadow:0 0 10px rgba(34,211,238,.4)}
.empl[data-md=pedestrian] .emnp{display:none!important}
.emvia span{display:flex;gap:6px}.emvia input{flex:1}.emvx{width:44px;height:44px;min-width:44px;border-radius:50%!important;padding:0!important}
.emaddv{min-height:40px;border-radius:999px;border-style:dashed!important;font-weight:700}
.emalts{display:grid;gap:6px}.emalt{display:grid;gap:1px;justify-items:start;text-align:left!important;padding:8px 12px;border-radius:14px;min-height:48px}.emalt.on{border-color:#f59e0b!important;box-shadow:0 0 14px rgba(245,158,11,.5)}.emalt small{opacity:.8}.emalt i{font-style:normal;color:#facc15}
.emhz{display:flex;flex-wrap:wrap;gap:6px 12px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);font-size:.85rem}.emhz small{opacity:.75;flex-basis:100%}
.emdet summary{cursor:pointer;font-weight:700;min-height:36px;display:flex;align-items:center}.emdet>*+*{margin-top:8px}
.empmin{display:none;justify-self:center;width:64px;min-height:22px!important;height:22px;padding:0!important;border-radius:999px;font-size:.8rem;line-height:1}#emap.plan .empmin{display:block;position:sticky;top:0;z-index:3}
#emap.plan .emp.min{max-height:38vh}
.emq{position:absolute;left:12px;right:12px;top:10px;z-index:1000;display:flex!important;align-items:center;gap:10px;min-height:52px;padding:6px 16px!important;border-radius:999px!important;text-align:left!important;justify-content:flex-start!important;font-weight:800;font-size:1.05rem;background:rgba(5,7,13,.9)!important;border:1px solid rgba(56,189,248,.6)!important;color:#fff!important;box-shadow:0 0 18px rgba(56,189,248,.4)}.emq span{display:grid;gap:0}.emq small{font-weight:500;opacity:.7;font-size:.75rem}
#emap.plan .emq,#emap.navon .emq{display:none!important}#emap:not(.plan):not(.navon) .leaflet-top{top:62px}
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
.empl{display:grid;gap:8px}.emtrip{display:grid;grid-template-columns:1fr 1fr;gap:6px}.emtrip button{min-height:44px;border-radius:14px;font-weight:800;font-size:.85rem;padding:4px 8px}.emtrip button.on{background:linear-gradient(135deg,#f59e0b,#fde68a)!important;color:#1a1204!important;border-color:transparent!important}
.empl:not([data-trip=back]) .emback,.empl[data-trip=back] .emone{display:none!important}.emback{display:grid;gap:8px;padding:10px;border-radius:14px;border:1px dashed rgba(245,158,11,.6)}.emback small i{opacity:.7;font-style:normal}
.emseg{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05)}.emseg small{grid-column:1/-1;opacity:.8;font-size:.78rem}.emseg span{grid-row:1;grid-column:2;font-weight:800}.empl:not([data-md=truck]) .emtk{display:none!important}
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
