// ===== 🌤️ POČASIE ako v Samsung Weather – pre všetkých (zamestnanci aj farmári) =====
// Veľká karta s teplotou, hodinová predpoveď s krivkou, Včera + 10 dní, kvalita ovzdušia, UV, vlhkosť, vietor (kompas),
// rosný bod, tlak, viditeľnosť, východ/západ slnka, fáza mesiaca a peľ. Zdroj: Open-Meteo (predpoveď + kvalita ovzdušia), bez kľúča.
// Miesto: rovnaké ako doteraz (📍 Zmeniť miesto – wxplaces.js), predvolene Michalovce.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const R=n=>n==null||!isFinite(n)?"–":Math.round(n);
const W={d:null,a:null,at:0,key:"",busy:null};
const loc=()=>{try{return WXLOC}catch(x){return {name:"Michalovce",lat:48.755,lon:21.915}}};
// 💎 živé žiariace ikony počasia (SVG s animáciou) namiesto emoji – príkaz majiteľa 30. 10.: všetko sklo, diamant, live
function wxIcon(c,day=true,big){const cl=`<path class="wi-cl" d="M19 47h27a10.5 10.5 0 0 0 1-21 15 15 0 0 0-28.6-3.4A12 12 0 0 0 19 47z"/>`;
  const sun=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><g class="wi-rays">${[0,45,90,135,180,225,270,315].map(a=>`<line x1="32" y1="9" x2="32" y2="3" transform="rotate(${a} 32 32)"/>`).join("")}</g><circle class="wi-sun" cx="32" cy="32" r="12"/></g>`;
  const moon=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path class="wi-moon" d="M40 12a20 20 0 1 0 12 30A16 16 0 0 1 40 12z"/><circle class="wi-st" cx="18" cy="14" r="1.6"/><circle class="wi-st s2" cx="52" cy="20" r="1.2"/></g>`;
  const drops=(n,cls)=>Array.from({length:n},(_,i)=>`<line class="${cls}" style="animation-delay:${(i*.27).toFixed(2)}s" x1="${22+i*9}" y1="50" x2="${19+i*9}" y2="57"/>`).join("");
  const flakes=n=>Array.from({length:n},(_,i)=>`<circle class="wi-sn" style="animation-delay:${(i*.45).toFixed(2)}s" cx="${22+i*9}" cy="52" r="2"/>`).join("");
  let g;if(c===0)g=day?sun(0,0,1):moon(0,0,1);
  else if(c<=2)g=(day?sun(-8,-8,.78):moon(-6,-8,.7))+`<g class="wi-dr">${cl}</g>`;
  else if(c===3)g=`<g class="wi-dr">${cl}</g><g class="wi-dr d2" transform="translate(-9 -9) scale(.7)" opacity=".55">${cl}</g>`;
  else if(c<=48)g=`<g class="wi-dr" transform="translate(0 -6)">${cl}</g><g class="wi-fog"><line x1="12" y1="50" x2="52" y2="50"/><line class="f2" x1="16" y1="56" x2="48" y2="56"/></g>`;
  else if(c<=57)g=`<g class="wi-dr" transform="translate(0 -6)">${cl}</g>${drops(3,"wi-dz")}`;
  else if(c<=67||(c>=80&&c<=82))g=`<g class="wi-dr" transform="translate(0 -6)">${cl}</g>${drops(4,"wi-rn")}`;
  else if(c<=77||c<=86)g=`<g class="wi-dr" transform="translate(0 -6)">${cl}</g>${flakes(4)}`;
  else g=`<g class="wi-dr dk" transform="translate(0 -6)">${cl}</g><path class="wi-bolt" d="M33 40l-7 12h7l-3 10 11-15h-7l4-7z"/>${drops(2,"wi-rn")}`;
  return `<svg class="wxi-s${big?" big":""}" viewBox="0 0 64 64" aria-hidden="true">${g}</svg>`}
// 📸 SKUTOČNÉ FOTKY OBLOHY (príkaz majiteľa 31. 10.: „reálne live foto z oblohy aj ikony reálne“) – Wikimedia Commons, voľné licencie, autor uvedený
const WXK=(c,day=true)=>c===0?(day?"clear":"night"):c<=2?(day?"partly":"night"):c===3?"cloudy":c<=48?"fog":c<=67||(c>=80&&c<=82)?"rain":c<=77||c<=86?"snow":"storm";
const WXP={clear:["Roman Eisele","CC BY-SA 4.0"],night:["Santa Monica Mountains NRA (NPS)","verejná doména"],partly:["Tadeáš Bednarz","CC BY-SA 4.0"],cloudy:["Dietmar Rabich","CC BY-SA 4.0"],
  fog:["Dietmar Rabich","CC BY-SA 4.0"],rain:["Michal Klajban","CC BY-SA 4.0"],snow:["Dietmar Rabich","CC BY-SA 4.0"],storm:["Mathias Krumbholz","CC BY-SA 3.0"],video:["Mihael Grmek","CC BY-SA 3.0"]};
const WXB=document.currentScript&&document.currentScript.src?new URL("img/wx/",document.currentScript.src).href:"img/wx/";
function wxPhoto(c,day=true,big){const k=WXK(c,day);return `<span class="wxi-p${big?" big":""} k-${k}" style="background-image:url('${WXB}${k}-i.jpg')" aria-hidden="true"></span>`}
window.wxIcon=(c,day,big)=>wxPhoto(c,day,big);window.wxKey=WXK;window.wxSvg=wxIcon;
const ICO=(c,day=true)=>wxPhoto(c,day);
const TXT=c=>c===0?"Jasno":c<=2?"Polojasno":c===3?"Oblačno":c<=48?"Hmla":c<=57?"Mrholenie":c<=67?"Dážď":c<=77?"Sneženie":c<=82?"Prehánky":c<=86?"Snehové prehánky":"Búrka";
async function load(force){const L=loc(),k=L.lat+","+L.lon;if(!force&&W.d&&W.key===k&&Date.now()-W.at<15*60e3)return;if(W.busy)return W.busy;
  W.busy=(async()=>{try{const q=`latitude=${L.lat}&longitude=${L.lon}&timezone=Europe%2FBratislava`;
    const [f,a]=await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,pressure_msl,wind_speed_10m,wind_direction_10m,visibility,uv_index,weather_code,is_day&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,is_day,relative_humidity_2m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max&past_days=1&forecast_days=10`).then(r=>r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=european_aqi,alder_pollen,birch_pollen,grass_pollen,ragweed_pollen,mugwort_pollen&hourly=birch_pollen,grass_pollen,ragweed_pollen&forecast_days=2`).then(r=>r.json()).catch(()=>null)]);
    if(f&&f.current){W.d=f;W.a=a;W.at=Date.now();W.key=k}else if(!W.d)W.d={err:1}}catch(x){if(!W.d)W.d={err:1}}finally{W.busy=null}})();return W.busy}
// ---- pomocné výpočty ----
function moon(d=new Date()){const syn=29.530588853,ref=Date.UTC(2000,0,6,18,14)/864e5,age=((d.getTime()/864e5-ref)%syn+syn)%syn,f=age/syn;
  const ill=Math.round((1-Math.cos(2*Math.PI*f))/2*100);
  const n=f<.03||f>.97?"Nov":f<.22?"Dorastajúci kosák":f<.28?"Prvá štvrť":f<.47?"Dorastajúci mesiac":f<.53?"Spln":f<.72?"Ubúdajúci mesiac":f<.78?"Posledná štvrť":"Ubúdajúci kosák";return {f,ill,n,age}}
function moonSVG(f){const r=34,wax=f<.5,k=Math.cos(2*Math.PI*f);// k: 1 nov → -1 spln
  const x=r*Math.abs(k),sweepOuter=wax?1:0,lit=`M50 ${50-r} A${r} ${r} 0 0 ${sweepOuter} 50 ${50+r} A${x} ${r} 0 0 ${(k>0)===wax?0:1} 50 ${50-r}Z`;
  return `<svg viewBox="0 0 100 100" class="wsmoon" aria-hidden="true"><defs><radialGradient id="wsmg" cx="40%" cy="40%"><stop offset="0" stop-color="#f4f4f0"/><stop offset="1" stop-color="#b9bcc4"/></radialGradient></defs><circle cx="50" cy="50" r="${r}" fill="#2a3350"/><path d="${lit}" fill="url(#wsmg)"/></svg>`}
const dir16=d=>["S","SSV","SV","VSV","V","VJV","JV","JJV","J","JJZ","JZ","ZJZ","Z","ZSZ","SZ","SSZ"][Math.round(((d%360)+360)%360/22.5)%16];
const windTxt=v=>v<2?"Bezvetrie":v<12?"Je slabý vánok":v<20?"Mierny vietor":v<29?"Čerstvý vietor":v<39?"Silný vietor":v<50?"Veľmi silný vietor":"Búrlivý vietor";
const uvTxt=v=>v<3?"Nízky":v<6?"Stredný":v<8?"Vysoký":v<11?"Veľmi vysoký":"Extrémny";
const aqiTxt=v=>v<=20?"Veľmi dobrá":v<=40?"Dobrá":v<=60?"Stredná":v<=80?"Mierna":v<=100?"Zlá":"Veľmi zlá";
const pTxt=(v,lim)=>v==null?"–":v<lim[0]?"Žiadny":v<lim[1]?"Nízky":v<lim[2]?"Mierny":"Vysoký";
const dewTxt=d=>d<0?"Vzduch je veľmi suchý":d<10?"Vzduch je suchý":d<16?"Príjemne":d<20?"Trochu dusno":"Dusno";
const hm=t=>t?String(t).slice(11,16):"–";
const dayName=(t,i,iToday)=>i===iToday-1?"Včera":i===iToday?"Dnes":i===iToday+1?"Zajtra":new Date(t+"T12:00").toLocaleDateString("sk-SK",{weekday:"short"});
// ---- kúsky ----
function bar(p,cls){return `<i class="wsbar ${cls||""}"><i style="width:${Math.max(3,Math.min(100,p))}%"></i></i>`}
function curve(T){const n=T.length;if(n<2)return "";const mn=Math.min(...T),mx=Math.max(...T),rg=Math.max(1,mx-mn),w=n*64,h=70;
  const P=T.map((v,i)=>[i*64+32,h-12-(v-mn)/rg*(h-30)]);let d=`M${P[0][0]} ${P[0][1]}`;for(let i=1;i<n;i++){const [x0,y0]=P[i-1],[x1,y1]=P[i],cx=(x0+x1)/2;d+=` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`}
  return `<svg class="wscurve" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="url(#wscg)" stroke-width="2.5"/><defs><linearGradient id="wscg"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#facc15"/></linearGradient></defs>${P.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff"/><text x="${p[0]}" y="${p[1]-9}" text-anchor="middle">${R(T[i])}°</text>`).join("")}</svg>`}
function compass(deg,v){const a=((deg||0)+180)%360;let ticks="";for(let i=0;i<72;i++){const r1=i%18===0?36:40,an=i*5*Math.PI/180;ticks+=`<line x1="${50+Math.sin(an)*r1}" y1="${50-Math.cos(an)*r1}" x2="${50+Math.sin(an)*44}" y2="${50-Math.cos(an)*44}"/>`}
  return `<svg viewBox="0 0 100 100" class="wscomp" aria-hidden="true"><g class="tk">${ticks}</g><text x="50" y="16" class="n">S</text><text x="50" y="92" >J</text><text x="10" y="53">Z</text><text x="90" y="53">V</text>
   <circle cx="50" cy="50" r="27" class="in"/><g transform="rotate(${a} 50 50)"><path d="M50 13 L54 22 L46 22Z" class="ar"/></g><text x="50" y="47" class="dv">${E(dir16(deg||0))}</text><text x="50" y="60" class="sp">${R(v)}</text><text x="50" y="69" class="u">km/h</text></svg>`}
function gauge(p){const mn=960,mx=1060,f=Math.max(0,Math.min(1,(p-mn)/(mx-mn))),a0=-225,a1=45,a=a0+(a1-a0)*f,arc=(aa,r)=>[50+r*Math.cos(aa*Math.PI/180),50+r*Math.sin(aa*Math.PI/180)];
  const [x0,y0]=arc(a0,36),[x1,y1]=arc(a,36),[xe,ye]=arc(a1,36),large=(a-a0)>180?1:0;
  return `<svg viewBox="0 0 100 100" class="wsgauge" aria-hidden="true"><path d="M${x0} ${y0} A36 36 0 1 1 ${xe} ${ye}" class="bg"/><path d="M${x0} ${y0} A36 36 0 ${large} 1 ${x1} ${y1}" class="fg"/><text x="50" y="52" class="v">${(Math.round(p*10)/10).toLocaleString("sk-SK")}</text><text x="50" y="64" class="u">hPa</text></svg>`}
function sunArc(rise,set){const now=Date.now(),r=Date.parse(rise),s=Date.parse(set);let f=(now-r)/(s-r);const up=f>=0&&f<=1;f=Math.max(0,Math.min(1,f));
  const x=10+f*180,y=70-Math.sin(f*Math.PI)*52;
  return `<svg viewBox="0 0 200 90" class="wssun" aria-hidden="true"><line x1="0" y1="70" x2="200" y2="70" class="hz"/><path d="M10 70 Q100 -34 190 70" class="arc"/>${up?`<circle cx="${x}" cy="${y}" r="9" class="sun"/>`:""}</svg>`}
function heroBg(c,day){const k=WXK(c,day),vid=day&&(k==="partly"||k==="cloudy");
  return `<div class="wsbg" style="background-image:url('${WXB}${k}.jpg')"></div>${vid?`<video class="wsvid" autoplay muted loop playsinline preload="auto" poster="${WXB}${k}.jpg" aria-hidden="true"><source src="${WXB}clouds.mp4" type="video/mp4"></video>`:""}<div class="wsfx fx-${k}${day?"":" nt"}"></div><div class="wsdim"></div>`}
function heroCredit(c,day){const k=WXK(c,day),vid=day&&(k==="partly"||k==="cloudy"),a=WXP[vid?"video":k];return `<small class="wscr">${vid?"Video":"Foto"}: ${E(a[0])} · ${E(a[1])} · Wikimedia Commons</small>`}
// 🛰️ satelit NASA GIBS (verejná doména) – snímka dnes po 13:00 UTC, inak včera
function mountSat(){const el=document.getElementById("wsSat");if(!el||el.dataset.ok||typeof needL!=="function")return;el.dataset.ok="1";const L0=loc();
  needL().then(()=>{const now=new Date(),d=new Date(now.getTime()-(now.getUTCHours()>=13?0:864e5)).toISOString().slice(0,10);
    const m=L.map(el,{zoomControl:false,attributionControl:false,scrollWheelZoom:false}).setView([L0.lat,L0.lon],7);
    const lay=day=>L.tileLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,{maxNativeZoom:9,maxZoom:12,minZoom:4});
    let sat=lay(d).addTo(m),fell=false;sat.on("tileerror",()=>{if(fell)return;fell=true;m.removeLayer(sat);sat=lay(new Date(Date.now()-2*864e5).toISOString().slice(0,10)).addTo(m)});
    L.tileLayer("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Reference_Labels_15m/default/default/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png",{maxNativeZoom:9,maxZoom:12,opacity:.9}).addTo(m);
    L.marker([L0.lat,L0.lon],{icon:L.divIcon({className:"",html:`<div class="lpin mv"><i></i><span>${E(L0.name||"")}</span></div>`,iconSize:[0,0]})}).addTo(m);
    const t=el.parentNode.querySelector(".wssatt small");if(t)t.textContent=`Skutočná satelitná snímka ${d.split("-").reverse().join(". ")} (NASA VIIRS) – oblaky a krajina nad tebou. Zdroj: NASA EOSDIS GIBS / Worldview.`;
    setTimeout(()=>m.invalidateSize(),200)}).catch(()=>{})}
function html(){const L=loc(),D=W.d;
  if(!D)return `<div class="wsx"><div class="card"><div class="s">Načítavam počasie…</div></div></div>`;
  if(D.err)return `<div class="wsx"><div class="card"><div class="row"><span class="t">📍 ${E(L.name)}</span><button type="button" class="out" data-wxpick>📍 Zmeniť miesto</button></div><div class="s">Počasie sa nepodarilo načítať. Skús ↻.</div></div></div>`;
  const C=D.current,H=D.hourly,Dl=D.daily,day=C.is_day===1;const tnow=C.time;
  const iT=Dl.time.indexOf(String(tnow).slice(0,10));const it=iT<0?1:iT;
  let i0=H.time.findIndex(t=>t>=String(tnow).slice(0,13));if(i0<0)i0=0;
  const HN=24,hrs=[],TT=[];for(let i=i0;i<Math.min(H.time.length,i0+HN);i++){const hh=+H.time[i].slice(11,13),dy=H.is_day[i]===1;TT.push(H.temperature_2m[i]);
    hrs.push(`<div class="wsh"><small>${i===i0?"Teraz":hh+":00"}</small><span>${ICO(H.weather_code[i],dy)}</span><em>☂ ${H.precipitation_probability[i]??0} %</em></div>`)}
  const mx=Dl.temperature_2m_max[it],mn=Dl.temperature_2m_min[it];
  // upozornenia
  const WN=[];Dl.time.forEach((t,i)=>{if(i<it)return;const r=Dl.precipitation_sum[i]||0,pp=Dl.precipitation_probability_max[i]??0,tm=Dl.temperature_2m_min[i],wd=Dl.wind_speed_10m_max[i]||0,nm=dayName(t,i,it);
    if(r>=10||(r>=3&&pp>=80))WN.push(["🌧️",`Dážď · ${nm}`,`${String(r.toFixed(1)).replace(".",",")} mm · ${pp} %`,r>=25?"r":"w"]);
    if(tm<=0)WN.push(["🥶",`Mráz · ${nm}`,`v noci ${R(tm)} °C`,tm<=-5?"r":"w"]);if(wd>=40)WN.push(["💨",`Vietor · ${nm}`,`až ${R(wd)} km/h`,wd>=60?"r":"w"])});
  const dmin=Math.min(...Dl.temperature_2m_min),dmax=Math.max(...Dl.temperature_2m_max),rg=Math.max(1,dmax-dmin);
  const days=Dl.time.map((t,i)=>{if(i<it-1)return "";const pp=Dl.precipitation_probability_max[i]??0,a=(Dl.temperature_2m_min[i]-dmin)/rg*100,b=(Dl.temperature_2m_max[i]-dmin)/rg*100;
    return `<div class="wsd${i===it?" now":""}${i<it?" past":""}"><b>${E(dayName(t,i,it))}</b>${i<it?"<span></span><span></span>":`<em>${pp>=5?"☂ "+pp+" %":""}</em><span>${ICO(Dl.weather_code[i])}</span>`}<i class="wsr"><i style="left:${a}%;right:${100-b}%"></i></i><strong>${R(Dl.temperature_2m_max[i])}° <small>${R(Dl.temperature_2m_min[i])}°</small></strong></div>`}).join("");
  const A=W.a&&W.a.current||{},aqi=A.european_aqi;const uv=C.uv_index??Dl.uv_index_max[it],hum=C.relative_humidity_2m,vis=C.visibility,mo=moon();
  // vlhkosť oproti včerajšku (rovnaká hodina)
  const iy=i0-24,hy=iy>=0?H.relative_humidity_2m[iy]:null,humT=hy==null?"":Math.abs(hum-hy)<6?"Podobná ako včera":hum>hy?"Vyššia ako včera":"Nižšia ako včera";
  const py=iy>=0?H.pressure_msl[iy]:null,p3=i0>=3?H.pressure_msl[i0-3]:null,prT=p3==null?"":C.pressure_msl-p3<=-1.5?"Momentálne rýchlo klesá":C.pressure_msl-p3<-0.4?"Momentálne klesá":C.pressure_msl-p3>=1.5?"Momentálne rýchlo stúpa":C.pressure_msl-p3>0.4?"Momentálne stúpa":"Momentálne stabilný";
  const PL=[["Stromový",Math.max(A.alder_pollen||0,A.birch_pollen||0),[1,10,50]],["Tráva",A.grass_pollen,[1,10,50]],["Ambróziový",Math.max(A.ragweed_pollen||0,A.mugwort_pollen||0),[1,10,50]]];
  const plv=v=>v==null?0:v<1?0:v<10?1:v<50?2:3;
  return `<div class="wsx ${day?"day":"night"}">
  <div class="wshero k-${WXK(C.weather_code,day)}">${heroBg(C.weather_code,day)}<i class="wsshine"></i><button type="button" class="wsloc" data-wxpick>📍 ${E(L.name)}${L.sub?` <small>${E(L.sub)}</small>`:""}</button>
   <div class="wsbig">${R(C.temperature_2m)}<sup>°</sup></div><div class="wscond">${E(TXT(C.weather_code))}</div>
   <div class="wsmm">↑ ${R(mx)}° / ↓ ${R(mn)}°<br>Pocitová teplota ${R(C.apparent_temperature)}°</div>${heroCredit(C.weather_code,day)}</div>
   <div class="wscard wsc-sat"><small class="wslbl">🛰️ Pohľad z vesmíru · satelit NASA</small><div class="wssat" id="wsSat"></div><div class="wssatt"><small>Skutočná satelitná snímka (VIIRS) – oblaky nad tebou, aktualizácia raz denne. NASA EOSDIS GIBS / Worldview.</small></div></div>
  <div class="wsgrid">
   <div class="wscard wsc-h"><div class="wssum">${E(TXT(Dl.weather_code[it]))}. Max ${R(mx)} °C, min ${R(mn)} °C${(Dl.precipitation_probability_max[it]??0)>=30?` · zrážky ${Dl.precipitation_probability_max[it]} %`:""}</div>
    <div class="wshs"><div class="wshrow">${hrs.join("")}</div>${curve(TT)}</div></div>
   ${WN.length?`<div class="wscard wsc-w">${WN.map(x=>`<div class="wswn ${x[3]}"><span>${x[0]}</span><div><b>${E(x[1])}</b><small>${E(x[2])}</small></div></div>`).join("")}</div>`:""}
   <div class="wscard wsc-d">${days}</div>
   <div class="wscol">
   ${aqi!=null?`<div class="wscard wsc-aqi"><small class="wslbl">🌫️ Kvalita ovzdušia (AQI)</small><b class="wsv">${E(aqiTxt(aqi))} (${R(aqi)})</b>${bar(aqi,"aqi")}</div>`:""}
   <div class="wscard wsc-sun"><small class="wslbl">🌅 Slnko</small>${sunArc(Dl.sunrise[it],Dl.sunset[it])}<div class="wssr"><span>Východ <b>${hm(Dl.sunrise[it])}</b></span><span>Západ <b>${hm(Dl.sunset[it])}</b></span></div></div>
   <div class="wscard wsc-moon">${moonSVG(mo.f)}<div><small class="wslbl">${E(mo.n)}</small><b class="wsv">${mo.ill} %</b><small>osvetlenie · ${Math.round(mo.age)}. deň</small></div></div>
   ${W.a&&W.a.current?`<div class="wscard wsc-pel"><small class="wslbl">🌿 Peľ</small><div class="wspl">${PL.map(p=>`<div class="lv${plv(p[1])}"><span>🍃</span><b>${pTxt(p[1],p[2])}</b><small>${p[0]}</small></div>`).join("")}</div></div>`:""}
   </div>
   <div class="wsmini">
    <div class="wscard"><small class="wslbl">☀️ UV index</small><p>${uv<3?"Počas zvyšku dňa nízky":"Max dnes "+R(Dl.uv_index_max[it])}</p><b class="wsv">${E(uvTxt(uv||0))}</b><i class="wsuv"><i style="left:${Math.min(100,(uv||0)/11*100)}%">${R(uv)}</i></i></div>
    <div class="wscard"><small class="wslbl">💧 Vlhkosť</small><p>${E(humT)}</p><b class="wsv">${R(hum)} %</b>${bar(hum,"hum")}</div>
    <div class="wscard"><small class="wslbl">💨 Vietor</small><p>${E(windTxt(C.wind_speed_10m))}</p>${compass(C.wind_direction_10m,C.wind_speed_10m)}</div>
    <div class="wscard"><small class="wslbl">🌡️ Rosný bod</small><p>${E(dewTxt(C.dew_point_2m))}</p><b class="wsv">${R(C.dew_point_2m)}°</b></div>
    <div class="wscard"><small class="wslbl">🧭 Tlak</small><p>${E(prT)}</p>${gauge(C.pressure_msl)}</div>
    <div class="wscard"><small class="wslbl">👁️ Viditeľnosť</small><p>${vis>=10000?"Momentálne dobrá":vis>=4000?"Mierne znížená":"Znížená (hmla)"}</p><b class="wsv">${vis!=null?(Math.round(vis/100)/10).toLocaleString("sk-SK",{minimumFractionDigits:vis<10000?1:0})+" km":"–"}</b></div>
   </div>
  </div>
  <div class="s wssrc">Predpoveď a kvalita ovzdušia: Open-Meteo · aktualizované ${new Date(W.at).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}</div></div>`}
// ---- napojenie ----
const _card=window.wxCard;
window.wxCard=function(){if(!W.d||(W.key&&W.key!==loc().lat+","+loc().lon)||Date.now()-W.at>15*60e3)load().then(()=>{try{if(typeof rerender==="function")rerender()}catch(x){}});
  const radar=`<div class="card"><div class="t">🛰️ Radar zrážok</div><div class="rdbox" id="radarBox"></div><div class="s" style="font-size:.7rem">Radar: <a class="copy" style="font-size:.7rem" href="https://www.pocasieradar.sk/" target="_blank" rel="noopener">pocasieradar.sk</a></div></div>`;
  setTimeout(mountSat,60);setTimeout(mountSat,600);
  // 31. 10.: pri prekreslení tej istej obrazovky (obnovenie na pozadí) sa počasie NEPREKRESĽUJE – ostane živé (video, fotka, satelit, radar), nič neskáče
  const h=html()+radar,g=h.replace(/(\d+\.\d)\d+/g,"$1"),o=KP.n;
  if(o&&o.isConnected&&KP.h===g&&typeof TAB!=="undefined"&&TAB==="wx"){const hs=[...o.children].map(c=>c.offsetHeight);
    queueMicrotask(()=>{const ph=document.querySelector("[data-wskeep]");if(ph&&!o.isConnected)ph.replaceWith(o)});
    return `<div data-wskeep style="display:contents">${hs.map(x=>`<div style="height:${x}px"></div>`).join("")}</div>`}
  KP.h=g;queueMicrotask(()=>{KP.n=document.querySelector("[data-wsk]")});
  return `<div data-wsk style="display:contents">${h}</div>`};
const KP={n:null,h:""};
try{wxCard=window.wxCard}catch(x){}
const _lw=window.loadWx;if(typeof _lw==="function"){window.loadWx=async function(f){await Promise.all([_lw.apply(this,arguments),load(!!f)])};try{loadWx=window.loadWx}catch(x){}}
setInterval(()=>{if(!document.hidden&&document.querySelector(".wsx")&&Date.now()-W.at>15*60e3)load(true).then(()=>{if(typeof formBusy==="function"&&formBusy())return;try{rerender()}catch(x){}})},60e3);
{const s=document.createElement("style");s.textContent=`
.wsx{display:grid;gap:12px;min-width:0}
.wshero{position:relative;overflow:hidden;border-radius:26px;padding:18px 20px 22px;min-height:230px;color:#fff;display:flex;flex-direction:column;justify-content:flex-end;
 background:linear-gradient(180deg,#0b1f5c 0%,#1d3d8f 55%,#2b5bb5 100%)}
.wsx.day .wshero{background:linear-gradient(180deg,#2f80ed 0%,#56a6f5 55%,#9fd3ff 100%)}
.wsstars{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1.5px 1.5px at 70% 20%,#fff,transparent),radial-gradient(1px 1px at 40% 60%,#fff,transparent),radial-gradient(1px 1px at 85% 45%,#fff,transparent),radial-gradient(1.2px 1.2px at 10% 75%,#fff,transparent),radial-gradient(1px 1px at 60% 85%,#fff,transparent);opacity:.7}
.wsx.day .wsstars{opacity:0}
.wsx.night .wshero::after{content:"";position:absolute;left:-10%;right:-10%;bottom:-40px;height:110px;border-radius:50%;background:radial-gradient(ellipse at 50% 0,#2c5a6b,#132a44 70%);opacity:.9}
.wsx.day .wshero::after{content:"";position:absolute;left:-10%;right:-10%;bottom:-40px;height:110px;border-radius:50%;background:radial-gradient(ellipse at 50% 0,#6fbf73,#3d8b4a 70%);opacity:.85}
.wshero>*{position:relative;z-index:1}
.wsloc{position:absolute!important;top:14px;left:14px;min-height:40px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.18)!important;border:1px solid rgba(255,255,255,.3)!important;color:#fff!important;font-weight:700;max-width:calc(100% - 28px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wsloc small{opacity:.75;font-weight:500}
.wsbig{font:300 5.2rem/1 var(--f-num,system-ui);letter-spacing:-.04em;margin-top:56px}.wsbig sup{font-size:.45em;vertical-align:top;position:relative;top:.25em}
.wscond{font:600 1.35rem var(--f-head,system-ui);margin-top:4px}.wsmm{margin-top:10px;font-size:.95rem;line-height:1.45;opacity:.95}
.wsgrid{display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}
@media (min-width:820px){.wsgrid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.wsc-h,.wsc-w{grid-column:1/-1}}
.wscard{border-radius:22px;padding:14px 16px;background:linear-gradient(180deg,rgba(23,42,96,.92),rgba(14,28,70,.92));color:#eef3ff;border:1px solid rgba(255,255,255,.08);min-width:0;box-sizing:border-box}
.wslbl{display:block;font-size:.8rem;opacity:.8;margin-bottom:4px}.wscard p{margin:2px 0 10px;font-size:.95rem;line-height:1.3;min-height:2.6em}.wsv{display:block;font:700 1.7rem/1.1 var(--f-num,system-ui);margin-bottom:8px}
.wssum{font-size:.95rem;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:8px}
.wshs{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}.wshs::-webkit-scrollbar{display:none}
.wshrow{display:flex;width:max-content}.wsh{width:64px;flex:0 0 64px;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:.82rem}.wsh span{font-size:1.5rem}.wsh em{font-style:normal;font-size:.72rem;opacity:.8;white-space:nowrap}
.wsx .wscurve{display:block;max-width:none!important;height:70px!important;flex:none}.wscurve text{fill:#fff;font:600 12px system-ui}
.wsd{display:grid;grid-template-columns:minmax(64px,1.1fr) 56px 30px minmax(40px,1.4fr) auto;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.wsd:last-child{border-bottom:0}.wsd b{font-weight:700;text-transform:capitalize}.wsd em{font-style:normal;font-size:.75rem;opacity:.8;white-space:nowrap}.wsd>span{font-size:1.3rem;text-align:center}
.wsd strong{font:700 1rem var(--f-num,system-ui);white-space:nowrap;text-align:right}.wsd strong small{opacity:.65;font-weight:600}.wsd.past{opacity:.7}.wsd.now b{color:#fde68a}
.wsr{position:relative;height:5px;border-radius:9px;background:rgba(255,255,255,.12)}.wsr>i{position:absolute;top:0;bottom:0;border-radius:9px;background:linear-gradient(90deg,#60a5fa,#facc15,#fb923c)}
.wsbar{display:block;height:9px;border-radius:9px;background:rgba(255,255,255,.18);overflow:hidden}.wsbar>i{display:block;height:100%;border-radius:9px;background:#facc15}.wsbar.hum>i{background:linear-gradient(90deg,#bae6fd,#38bdf8)}.wsbar.aqi>i{background:#facc15}
.wsuv{position:relative;display:block;height:9px;border-radius:9px;background:linear-gradient(90deg,#22c55e,#facc15,#f97316,#ef4444,#a855f7);margin:10px 4px 6px}.wsuv>i{position:absolute;top:50%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:#fff;color:#14532d;font:800 .7rem/22px system-ui;text-align:center;font-style:normal;box-shadow:0 0 0 3px #22c55e}
.wsmini{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wscol{display:grid;gap:12px;min-width:0}@media (min-width:820px){.wsmini{grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr))}}
.wscomp,.wsgauge{display:block;width:100%;max-width:130px;margin:0 auto}
.wscomp .tk line{stroke:rgba(255,255,255,.35);stroke-width:1}.wscomp text{fill:#e2e8f0;font:600 8px system-ui;text-anchor:middle}.wscomp text.n{fill:#f87171}.wscomp .in{fill:none;stroke:rgba(255,255,255,.7);stroke-width:1.5}.wscomp .ar{fill:#fff}
.wscomp .dv{font:700 8px system-ui}.wscomp .sp{font:800 13px system-ui;fill:#fff}.wscomp .u{font:500 6px system-ui}
.wsgauge .bg{fill:none;stroke:rgba(255,255,255,.18);stroke-width:9;stroke-linecap:round}.wsgauge .fg{fill:none;stroke:#e2e8f0;stroke-width:9;stroke-linecap:round}.wsgauge .v{fill:#fff;font:800 13px system-ui;text-anchor:middle}.wsgauge .u{fill:#cbd5e1;font:500 7px system-ui;text-anchor:middle}
.wssun{display:block;width:100%;max-height:110px}.wssun .hz{stroke:rgba(255,255,255,.25)}.wssun .arc{fill:none;stroke:rgba(255,255,255,.55);stroke-width:2}.wssun .sun{fill:#facc15;stroke:#fde68a;stroke-width:3}
.wssr{display:flex;justify-content:space-around;gap:10px;font-size:.9rem}.wssr b{display:block;font:700 1.35rem var(--f-num,system-ui);text-align:center}.wssr span{text-align:center}
.wsc-moon{display:flex;align-items:center;justify-content:center;gap:16px}.wsmoon{width:96px;height:96px;flex:0 0 96px}.wsc-moon small{display:block;opacity:.8}
.wspl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;text-align:center}.wspl span{font-size:2rem;display:block;filter:grayscale(1) opacity(.5)}.wspl .lv1 span{filter:none}.wspl .lv2 span{filter:hue-rotate(-60deg) saturate(2)}.wspl .lv3 span{filter:hue-rotate(-100deg) saturate(3)}
.wspl b{display:block;font-size:1.05rem}.wspl small{opacity:.75;font-size:.78rem}
.wswn{display:flex;gap:10px;align-items:center;padding:6px 0}.wswn span{font-size:1.4rem}.wswn b{display:block}.wswn small{opacity:.8}.wswn.r b{color:#fca5a5}.wswn.w b{color:#fde68a}
.wssrc{text-align:center;font-size:.72rem;opacity:.7}
html[data-theme=light] .wscard{background:linear-gradient(180deg,#1e3a8a,#172554);color:#eef3ff}

/* 💎 SKLO · DIAMANT · LIVE (príkaz majiteľa 30. 10.) */
@property --wsa{syntax:"<angle>";initial-value:0deg;inherits:false}
@keyframes wsspin{to{--wsa:360deg}}@keyframes wsaur{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes wsshine{0%,55%{transform:translateX(-130%)}85%,100%{transform:translateX(130%)}}
.wsx{position:relative;padding:10px;border-radius:30px;background:radial-gradient(90% 60% at 10% 0%,rgba(56,189,248,.28),transparent 60%),radial-gradient(80% 60% at 100% 30%,rgba(167,139,250,.26),transparent 60%),radial-gradient(90% 70% at 50% 100%,rgba(244,114,182,.16),transparent 60%),#070b18}
.wshero{background:linear-gradient(120deg,#0b1f5c,#4338ca,#0ea5e9,#7c3aed,#0b1f5c)!important;background-size:320% 320%!important;animation:wsaur 18s ease-in-out infinite;
 border:1px solid transparent;box-shadow:0 0 0 1px rgba(255,255,255,.35) inset,0 0 30px rgba(125,211,252,.45),0 0 60px rgba(167,139,250,.28),0 18px 40px rgba(0,0,0,.45)}
.wsx.day .wshero{background:linear-gradient(120deg,#0284c7,#38bdf8,#f59e0b,#22d3ee,#6366f1,#0284c7)!important;background-size:320% 320%!important}
.wsx.night .wshero::after,.wsx.day .wshero::after{content:"";position:absolute;inset:0;left:0;right:0;bottom:0;height:auto;border-radius:inherit;padding:1.5px;opacity:1;
 background:conic-gradient(from var(--wsa,0deg),#7dd3fc,#f0abfc,#fde68a,#a7f3d0,#c4b5fd,#7dd3fc);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:wsspin 7s linear infinite;pointer-events:none;z-index:2}
.wshero::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,255,255,.04) 45%,rgba(255,255,255,.12));-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);pointer-events:none}
.wsshine{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.32) 46%,rgba(255,255,255,.06) 52%,transparent 60%);transform:translateX(-130%);animation:wsshine 6s ease-in-out infinite}
.wsbigi{position:absolute!important;top:52px;right:12px;width:118px;height:118px}.wsbig,.wscond{text-shadow:0 0 18px rgba(255,255,255,.55),0 2px 10px rgba(0,0,0,.35)}
.wscard{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.13),rgba(186,230,253,.05) 40%,rgba(244,114,182,.06) 70%,rgba(255,255,255,.10)),rgba(10,16,38,.72)!important;
 border:1px solid transparent!important;box-shadow:0 0 0 1px rgba(255,255,255,.22) inset,0 0 22px rgba(125,211,252,.22),0 0 36px rgba(167,139,250,.14),0 12px 30px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(12px) saturate(170%);backdrop-filter:blur(12px) saturate(170%);color:#f1f5ff!important}
.wscard::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:conic-gradient(from var(--wsa,0deg),rgba(125,211,252,.9),rgba(240,171,252,.8),rgba(253,230,138,.8),rgba(167,243,208,.8),rgba(196,181,253,.9),rgba(125,211,252,.9));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:wsspin 9s linear infinite;pointer-events:none}
.wscard::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.14) 48%,transparent 60%);transform:translateX(-130%);animation:wsshine 9s ease-in-out infinite}
.wscard>*{position:relative;z-index:1}.wslbl{color:#e0f2fe;text-shadow:0 0 10px rgba(125,211,252,.7)}
html[data-theme=light] .wscard{background:linear-gradient(135deg,rgba(255,255,255,.13),rgba(186,230,253,.05) 40%,rgba(255,255,255,.10)),rgba(10,16,38,.78)!important}
.wxi-s{display:inline-block;width:1.9em;height:1.9em;vertical-align:middle;overflow:visible}.wxi-s.big{width:100%;height:100%}.wsh span,.wsd>span{display:grid;place-items:center}
.wxi-s .wi-sun{fill:#fcd34d;filter:drop-shadow(0 0 5px rgba(253,224,71,.95))}.wxi-s .wi-rays{stroke:#fde68a;stroke-width:3.4;stroke-linecap:round;transform-origin:32px 32px;animation:wispin 14s linear infinite;filter:drop-shadow(0 0 4px rgba(253,224,71,.9))}
.wxi-s .wi-moon{fill:#e0e7ff;filter:drop-shadow(0 0 6px rgba(199,210,254,.95))}.wxi-s .wi-st{fill:#fff;animation:witw 2.6s ease-in-out infinite}.wxi-s .wi-st.s2{animation-delay:1.2s}
.wxi-s .wi-cl{fill:#f1f5f9;filter:drop-shadow(0 0 5px rgba(255,255,255,.75))}.wxi-s .dk .wi-cl{fill:#94a3b8;filter:drop-shadow(0 0 6px rgba(167,139,250,.8))}
.wxi-s .wi-dr{animation:widr 6s ease-in-out infinite}.wxi-s .wi-dr.d2{animation-duration:8s}
.wxi-s .wi-rn,.wxi-s .wi-dz{stroke:#7dd3fc;stroke-width:3;stroke-linecap:round;filter:drop-shadow(0 0 3px #38bdf8);animation:wirain 1.1s linear infinite}.wxi-s .wi-dz{stroke-width:2;animation-duration:1.6s}
.wxi-s .wi-sn{fill:#fff;filter:drop-shadow(0 0 3px #e0f2fe);animation:wisnow 2.4s linear infinite}
.wxi-s .wi-fog line{stroke:#e2e8f0;stroke-width:3;stroke-linecap:round;opacity:.85;animation:wifog 4s ease-in-out infinite}.wxi-s .wi-fog .f2{animation-delay:2s}
.wxi-s .wi-bolt{fill:#fde047;filter:drop-shadow(0 0 6px #facc15);animation:wibolt 3s steps(1) infinite}
@keyframes wispin{to{transform:rotate(360deg)}}@keyframes witw{0%,100%{opacity:.2}50%{opacity:1}}@keyframes widr{0%,100%{transform:translateX(-1.5px)}50%{transform:translateX(1.5px)}}
@keyframes wirain{0%{transform:translateY(-5px);opacity:0}30%{opacity:1}100%{transform:translateY(5px);opacity:0}}@keyframes wisnow{0%{transform:translateY(-4px);opacity:0}30%{opacity:1}100%{transform:translateY(7px);opacity:0}}
@keyframes wifog{0%,100%{transform:translateX(-3px)}50%{transform:translateX(3px)}}@keyframes wibolt{0%,8%,14%,100%{opacity:1}5%,11%{opacity:.15}}
@media (prefers-reduced-motion:reduce){.wxi-s *,.wshero,.wshero::after,.wscard::before,.wscard::after,.wsshine{animation:none!important}}
.whwx .wxi .wxi-s{width:1.6em;height:1.6em}
/* 📸 skutočná obloha: fotka (pomalý pohyb), video oblakov, dážď / sneh / blesk naživo */
.wshero .wsbg{position:absolute;inset:-6%;background-size:cover;background-position:center;animation:wskb 40s ease-in-out infinite alternate;z-index:0}
@keyframes wskb{from{transform:scale(1.02) translate3d(-1.5%,0,0)}to{transform:scale(1.12) translate3d(1.5%,-2%,0)}}
.wshero .wsvid{position:absolute;inset:0;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover;z-index:0}
.wshero .wsdim{position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,.15) 55%,rgba(2,6,23,.72) 100%)}
.wshero .wsfx{position:absolute;inset:0;z-index:0;pointer-events:none}.wshero .wsfx.nt{background:rgba(2,6,23,.35)}
.wshero .fx-rain{background-image:repeating-linear-gradient(105deg,rgba(255,255,255,0) 0 18px,rgba(220,235,255,.35) 18px 19px,rgba(255,255,255,0) 19px 46px),repeating-linear-gradient(100deg,rgba(255,255,255,0) 0 30px,rgba(220,235,255,.25) 30px 31px,rgba(255,255,255,0) 31px 70px);background-size:120px 160px,170px 210px;animation:wsrain .55s linear infinite}
@keyframes wsrain{to{background-position:-30px 160px,-40px 210px}}
.wshero .fx-snow{background-image:radial-gradient(2.5px 2.5px at 20px 30px,#fff,transparent),radial-gradient(2px 2px at 80px 70px,#fff,transparent),radial-gradient(3px 3px at 140px 20px,#fff,transparent),radial-gradient(2px 2px at 50px 120px,#fff,transparent),radial-gradient(2.5px 2.5px at 110px 150px,#fff,transparent);background-size:180px 180px;animation:wssnow 7s linear infinite;opacity:.9}
@keyframes wssnow{to{background-position:40px 180px}}
.wshero .fx-storm{animation:wsflash 7s steps(1) infinite}@keyframes wsflash{0%,88%,92%,96%,100%{background:transparent}89%,95%{background:rgba(233,240,255,.45)}}
.wshero .fx-fog{background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.22),rgba(255,255,255,0));background-size:200% 100%;animation:wsfog 14s ease-in-out infinite alternate}@keyframes wsfog{to{background-position:100% 0}}
.wshero .wsstars{display:none}.wshero.k-night .wsstars{display:block}
.wsx .wshero{background:#0b1020!important;animation:none!important;min-height:300px}
.wscr{display:block;margin-top:10px;font-size:.66rem;opacity:.8;text-shadow:0 1px 4px rgba(0,0,0,.9)}
.wxi-p{display:inline-block;width:2.1em;height:2.1em;border-radius:50%;background-size:cover;background-position:center;vertical-align:middle;box-shadow:0 0 0 1.5px rgba(255,255,255,.75),0 0 10px rgba(125,211,252,.55);flex:none}
.wxi-p.big{width:100%;height:100%}.wsh span,.wsd>span{display:grid;place-items:center}.whwx .wxi .wxi-p{width:1.7em;height:1.7em}
.wxi-p.k-rain,.wxi-p.k-storm{box-shadow:0 0 0 1.5px rgba(186,230,253,.9),0 0 12px rgba(56,189,248,.7)}
.wsx .wshero::before{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,0) 45%)!important;z-index:1}
.wssat{height:260px;border-radius:16px;overflow:hidden;margin-top:6px;background:#020617}.wssat img{max-width:none!important}.wssatt small{display:block;opacity:.75;font-size:.72rem;margin-top:6px}
@media (prefers-reduced-motion:reduce){.wshero .wsbg,.wshero .wsfx{animation:none!important}}
@media (max-width:380px){.wsd{grid-template-columns:minmax(52px,1fr) 46px 26px minmax(30px,1fr) auto;gap:6px}.wsbig{font-size:4.4rem}}`;document.head.appendChild(s)}
})();
