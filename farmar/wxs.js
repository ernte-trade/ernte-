// ===== 🍏 POČASIE AKO V iPHONE – pre všetkých (zamestnanci aj farmári), príkaz majiteľa 1. 11. =====
// Obloha podľa počasia, mesto, veľká teplota, V/N, hodiny (aj východ/západ slnka), 10 dní s farebným pruhom teplôt, mapa zrážok,
// UV, slnko, vietor, zrážky, pocitová teplota, vlhkosť, viditeľnosť, tlak, mesiac, kvalita ovzdušia, peľ. Zdroj: Open-Meteo, bez kľúča.
// Miesto: pri každom otvorení aplikácie podľa polohy (GPS, wxplaces.js); ručne 📍 Zmeniť miesto.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const R=n=>n==null||!isFinite(n)?"–":Math.round(n);
const W={d:null,a:null,at:0,key:"",busy:null};
const loc=()=>{try{return WXLOC}catch(x){return {name:"Michalovce",lat:48.755,lon:21.915}}};
// 🍏 IKONY AKO V iPHONE (príkaz majiteľa 1. 11.: „počasie klasické ako iOS – jasno = slnko, polojasno = mrak so slnkom“)
// Farebné plné symboly bez animácie a bez žiary: žlté slnko, biely mrak, modré kvapky, žltý blesk, biely mesiac.
function wxIcon(c,day=true,big){c=+c;
  const CL=`M18.5 52h27.5a11.5 11.5 0 0 0 1.6-22.9A15.5 15.5 0 0 0 18.4 25.5 13.25 13.25 0 0 0 18.5 52z`;
  const cl=(t,f)=>`<path d="${CL}" fill="${f||"#fff"}"${t?` transform="${t}"`:""}/>`;
  const sun=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><circle cx="32" cy="32" r="11.5" fill="#FFD60A"/><g stroke="#FFD60A" stroke-width="4.4" stroke-linecap="round">${[0,45,90,135,180,225,270,315].map(a=>`<line x1="32" y1="13.5" x2="32" y2="7.5" transform="rotate(${a} 32 32)"/>`).join("")}</g></g>`;
  const moon=(x,y,s,f)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M38 9.5a23 23 0 1 0 17.6 31.2A19 19 0 0 1 38 9.5z" fill="${f||"#fff"}"/></g>`;
  const stars=`<path d="M50 9l1.4 3.6L55 14l-3.6 1.4L50 19l-1.4-3.6L45 14l3.6-1.4z" fill="#fff"/><path d="M57 25l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#fff"/>`;
  const low=`translate(0 -7)`;
  const drops=(n,len,col)=>Array.from({length:n},(_,i)=>`<line x1="${23+i*9}" y1="${50}" x2="${20+i*9}" y2="${50+len}" stroke="${col||"#40C8F4"}" stroke-width="4" stroke-linecap="round"/>`).join("");
  const flakes=n=>Array.from({length:n},(_,i)=>{const x=22+i*10,y=i%2?58:53;return `<g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><line x1="${x-3.4}" y1="${y}" x2="${x+3.4}" y2="${y}"/><line x1="${x-1.7}" y1="${y-3}" x2="${x+1.7}" y2="${y+3}"/><line x1="${x+1.7}" y1="${y-3}" x2="${x-1.7}" y2="${y+3}"/></g>`}).join("");
  let g;
  if(c===0)g=day?sun(0,0,1):moon(2,2,.95)+stars;
  else if(c<=2)g=(day?sun(12,-8,.8):moon(20,-5,.66))+cl("translate(-3 6)");
  else if(c===3)g=cl("translate(9 -6) scale(.78)","#D1D1D6")+cl("translate(-2 3)");
  else if(c<=48)g=cl(low)+`<g stroke="#D1D1D6" stroke-width="4" stroke-linecap="round"><line x1="12" y1="51" x2="50" y2="51"/><line x1="18" y1="59" x2="54" y2="59"/></g>`;
  else if(c<=57)g=cl(low)+drops(3,4);
  else if(c<=67||(c>=80&&c<=82))g=cl(low)+drops(3,9);
  else if(c<=77||c<=86)g=cl(low)+flakes(3);
  else g=cl(low)+`<path d="M35 44l-9 11h7.5l-4 10 12.5-14.5h-7.5l4.5-6.5z" fill="#FFD60A"/>`;
  return `<svg class="wxi-s${big?" big":""}" viewBox="0 0 64 64" aria-hidden="true">${g}</svg>`}
function sunIco(up){return `<svg class="wxi-s" viewBox="0 0 64 64" aria-hidden="true"><g fill="#FFD60A"><path d="M14 44a18 18 0 0 1 36 0z"/></g><g stroke="#FFD60A" stroke-width="4" stroke-linecap="round"><line x1="32" y1="18" x2="32" y2="13"/><line x1="14" y1="27" x2="10.5" y2="23.5"/><line x1="50" y1="27" x2="53.5" y2="23.5"/></g><line x1="8" y1="50" x2="56" y2="50" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="${up?"M26 60l6-6 6 6":"M26 54l6 6 6-6"}" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
const WXK=(c,day=true)=>c===0?(day?"clear":"night"):c<=2?(day?"partly":"nightp"):c===3?"cloudy":c<=48?"fog":c<=67||(c>=80&&c<=82)?"rain":c<=77||c<=86?"snow":"storm";
window.wxIcon=(c,day,big)=>wxIcon(c,day,big);window.wxKey=WXK;window.wxSvg=wxIcon;
const ICO=(c,day=true)=>wxIcon(c,day);
const TXT=c=>c===0?"Jasno":c<=2?"Polojasno":c===3?"Oblačno":c<=48?"Hmla":c<=57?"Mrholenie":c<=67?"Dážď":c<=77?"Sneženie":c<=82?"Prehánky":c<=86?"Snehové prehánky":"Búrka";
async function load(force){const L=loc(),k=L.lat+","+L.lon;if(!force&&W.d&&W.key===k&&Date.now()-W.at<15*60e3)return;if(W.busy)return W.busy;
  W.busy=(async()=>{try{const q=`latitude=${L.lat}&longitude=${L.lon}&timezone=Europe%2FBratislava`;
    const [f,a]=await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,pressure_msl,wind_speed_10m,wind_direction_10m,visibility,uv_index,weather_code,is_day&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,is_day,wind_speed_10m,relative_humidity_2m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max&past_days=1&forecast_days=10`).then(r=>r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=european_aqi,alder_pollen,birch_pollen,grass_pollen,ragweed_pollen,mugwort_pollen&hourly=birch_pollen,grass_pollen,ragweed_pollen&forecast_days=2`).then(r=>r.json()).catch(()=>null)]);
    if(f&&f.current){W.d=f;W.a=a;W.at=Date.now();W.key=k}else{if(!W.d)W.d={err:1};W.at=Date.now()-14*60e3;W.key=k}}catch(x){if(!W.d)W.d={err:1};W.at=Date.now()-14*60e3;W.key=k}finally{W.busy=null}})();return W.busy} // 31. 10.: pri chybe skúsiť znova až o minútu – inak nekonečné prekresľovanie (aplikácia sekala, keď počasie nešlo načítať)
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
// farba teploty ako na iPhone (studená modrá → zelená → žltá → oranžová → červená)
function tcol(t){const S=[[-10,"#5E5CE6"],[0,"#64D2FF"],[8,"#7AE0B8"],[14,"#C9E265"],[20,"#FFD60A"],[26,"#FF9F0A"],[33,"#FF453A"]];
  if(t<=S[0][0])return S[0][1];for(let i=1;i<S.length;i++)if(t<=S[i][0])return S[i][1];return S[S.length-1][1]}
const pr10=p=>Math.round((p||0)/10)*10;
const hh=t=>+String(t).slice(11,13);
function html(){const L=loc(),D=W.d;
  if(!D)return `<div class="wsx ios k-partly"><div class="wscard"><div class="wssum">Načítavam počasie…</div></div></div>`;
  if(D.err)return `<div class="wsx ios k-cloudy"><div class="wsios"><button type="button" class="wscity" data-wxpick>${E(L.name)}</button></div><div class="wscard"><div class="wssum">Počasie sa nepodarilo načítať. Skúste ↻ Obnoviť.</div><button type="button" class="wsplace" data-wxpick>📍 Zmeniť miesto</button></div></div>`;
  const C=D.current,H=D.hourly,Dl=D.daily,day=C.is_day===1;const tnow=String(C.time);
  const iT=Dl.time.indexOf(tnow.slice(0,10));const it=iT<0?1:iT;
  let i0=H.time.findIndex(t=>t>=tnow.slice(0,13));if(i0<0)i0=0;
  const mx=Dl.temperature_2m_max[it],mn=Dl.temperature_2m_min[it],K=WXK(C.weather_code,day);
  // hodiny + východ / západ slnka medzi nimi (ako iPhone)
  const SR=[];for(let d=it;d<=Math.min(it+1,Dl.time.length-1);d++){SR.push([Dl.sunrise[d],1]);SR.push([Dl.sunset[d],0])}
  const hrs=[];const iE=Math.min(H.time.length,i0+25);
  for(let i=i0;i<iE;i++){const dy=H.is_day[i]===1,p=H.precipitation_probability[i]??0;
    hrs.push(`<div class="wsh"><small>${i===i0?"Teraz":hh(H.time[i])}</small><span>${ICO(i===i0?C.weather_code:H.weather_code[i],i===i0?C.is_day===1:dy)}${p>=20?`<em>${pr10(p)} %</em>`:""}</span><b>${R(i===i0?C.temperature_2m:H.temperature_2m[i])}°</b></div>`);
    const nx=H.time[i+1];SR.forEach(([t,up])=>{if(t&&t>H.time[i]&&(!nx||t<nx)&&i+1<iE)hrs.push(`<div class="wsh sr"><small>${hm(t).replace(/^0/,"")}</small><span>${sunIco(up)}</span><b>${up?"Východ":"Západ"}</b></div>`)})}
  // zhrnutie ako iPhone
  const nxt=H.weather_code.slice(i0,i0+12),cnt={};nxt.forEach(c=>{const k=TXT(c);cnt[k]=(cnt[k]||0)+1});const dom=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||TXT(C.weather_code);
  const iR=H.precipitation_probability.slice(i0,i0+24).findIndex(p=>p>=50),wmx=Math.max(...(H.wind_speed_10m||[]).slice(i0,i0+24).filter(v=>v!=null),0);
  let sum=`${dom} počas zvyšku dňa.`;if(iR>0)sum+=` Zrážky sa očakávajú okolo ${hh(H.time[i0+iR])}:00.`;else if(iR===0)sum+=` Práve teraz sú možné zrážky.`;if(wmx>=20)sum+=` Vietor do ${R(wmx)} km/h.`;
  // upozornenia
  const WN=[];Dl.time.forEach((t,i)=>{if(i<it)return;const r=Dl.precipitation_sum[i]||0,pp=Dl.precipitation_probability_max[i]??0,tm=Dl.temperature_2m_min[i],wd=Dl.wind_speed_10m_max[i]||0,nm=dayName(t,i,it);
    if(r>=10||(r>=3&&pp>=80))WN.push(["🌧️",`Dážď · ${nm}`,`${String(r.toFixed(1)).replace(".",",")} mm · ${pp} %`,r>=25?"r":"w"]);
    if(tm<=0)WN.push(["🥶",`Mráz · ${nm}`,`v noci ${R(tm)} °C`,tm<=-5?"r":"w"]);if(wd>=40)WN.push(["💨",`Vietor · ${nm}`,`až ${R(wd)} km/h`,wd>=60?"r":"w"])});
  // 10 dní – pruh teplôt ako iPhone
  const last=Math.min(Dl.time.length,it+10),dmin=Math.min(...Dl.temperature_2m_min.slice(it,last)),dmax=Math.max(...Dl.temperature_2m_max.slice(it,last)),rg=Math.max(1,dmax-dmin);
  const days=[];for(let i=it;i<last;i++){const t=Dl.time[i],lo=Dl.temperature_2m_min[i],hi=Dl.temperature_2m_max[i],pp=Dl.precipitation_probability_max[i]??0,a=(lo-dmin)/rg*100,b=(hi-dmin)/rg*100;
    const dot=i===it?`<u style="left:${Math.max(0,Math.min(100,(C.temperature_2m-dmin)/rg*100))}%"></u>`:"";
    days.push(`<div class="wsd"><b>${E(i===it?"Dnes":new Date(t+"T12:00").toLocaleDateString("sk-SK",{weekday:"short"}).replace(".",""))}</b><span>${ICO(Dl.weather_code[i])}${pp>=20?`<em>${pr10(pp)} %</em>`:""}</span><small>${R(lo)}°</small><i class="wsr"><i style="left:${a}%;right:${100-b}%;background:linear-gradient(90deg,${tcol(lo)},${tcol(hi)})"></i>${dot}</i><strong>${R(hi)}°</strong></div>`)}
  const A=W.a&&W.a.current||{},aqi=A.european_aqi;const uv=C.uv_index??Dl.uv_index_max[it],hum=C.relative_humidity_2m,vis=C.visibility,mo=moon();
  const pres=C.pressure_msl,p3=i0>=3?H.pressure_msl[i0-3]:null,prT=p3==null?"":pres-p3<=-1.5?"Rýchlo klesá.":pres-p3<-0.4?"Klesá.":pres-p3>=1.5?"Rýchlo stúpa.":pres-p3>0.4?"Stúpa.":"Stabilný.";
  const fl=C.apparent_temperature,ft=C.temperature_2m,flT=Math.abs(fl-ft)<1.5?"Podobná ako skutočná teplota.":fl<ft?(C.wind_speed_10m>=10?"Vietor spôsobuje, že je chladnejšie.":"Pocitovo je chladnejšie."):"Vlhkosť spôsobuje, že je teplejšie.";
  const rToday=H.precipitation.slice(Math.max(0,i0-24),i0).reduce((s,v)=>s+(v||0),0),rNext=H.precipitation.slice(i0,i0+24).reduce((s,v)=>s+(v||0),0);
  const mm=v=>(Math.round(v*10)/10).toLocaleString("sk-SK");
  const sunNext=Date.now()<Date.parse(Dl.sunrise[it])?[Dl.sunrise[it],"VÝCHOD SLNKA",`Západ slnka: ${hm(Dl.sunset[it])}`]:Date.now()<Date.parse(Dl.sunset[it])?[Dl.sunset[it],"ZÁPAD SLNKA",`Východ slnka: ${hm(Dl.sunrise[it])}`]:[Dl.sunrise[it+1]||Dl.sunrise[it],"VÝCHOD SLNKA",`Západ slnka: ${hm(Dl.sunset[it+1]||Dl.sunset[it])}`];
  const PL=[["Stromový",Math.max(A.alder_pollen||0,A.birch_pollen||0),[1,10,50]],["Tráva",A.grass_pollen,[1,10,50]],["Ambróziový",Math.max(A.ragweed_pollen||0,A.mugwort_pollen||0),[1,10,50]]];
  const hd=(i,t)=>`<small class="wslbl"><i>${i}</i>${t}</small>`;
  return `<div class="wsx ios k-${K} ${day?"day":"night"}">
  <div class="wsios">${L.gps?`<div class="wsmy">MOJA POLOHA</div>`:""}<button type="button" class="wscity" data-wxpick>${E(L.name)}</button>${L.sub?`<div class="wssub">${E(L.sub)}</div>`:""}
   <div class="wsbig">${R(C.temperature_2m)}°</div><div class="wscond">${E(TXT(C.weather_code))}</div><div class="wshl">V: ${R(mx)}°&nbsp;&nbsp;N: ${R(mn)}°</div></div>
  ${WN.length?`<div class="wscard wsc-w">${hd("⚠️","UPOZORNENIA")}${WN.map(x=>`<div class="wswn ${x[3]}"><span>${x[0]}</span><div><b>${E(x[1])}</b><small>${E(x[2])}</small></div></div>`).join("")}</div>`:""}
  <div class="wscard wsc-h"><div class="wssum">${E(sum)}</div><div class="wshs"><div class="wshrow">${hrs.join("")}</div></div></div>
  <div class="wsgrid">
   <div class="wscard wsc-d">${hd("🗓️","PREDPOVEĎ NA 10 DNÍ")}${days.join("")}</div>
   <div class="wscol">
    ${aqi!=null?`<div class="wscard wsc-aqi">${hd("🌫️","KVALITA OVZDUŠIA")}<b class="wsv">${R(aqi)} – ${E(aqiTxt(aqi))}</b><p>Európsky index kvality ovzdušia (EAQI).</p><i class="wsuv aq"><i style="left:${Math.min(100,aqi)}%"></i></i></div>`:""}
    <div class="wscard wsc-map">${hd("☔","MAPA ZRÁŽOK")}<div class="rdbox" id="radarBox"></div><small class="wsnote">Radar: <a href="https://www.pocasieradar.sk/" target="_blank" rel="noopener">pocasieradar.sk</a></small></div>
   </div>
   <div class="wsmini">
    <div class="wscard">${hd("☀️","UV INDEX")}<b class="wsv">${R(uv)}</b><b class="wsv2">${E(uvTxt(uv||0))}</b><i class="wsuv"><i style="left:${Math.min(100,(uv||0)/11*100)}%"></i></i><p>${(Dl.uv_index_max[it]||0)<3?"Nízky po zvyšok dňa.":"Maximum dnes "+R(Dl.uv_index_max[it])+"."}</p></div>
    <div class="wscard">${hd("🌅",sunNext[1])}<b class="wsv">${hm(sunNext[0])}</b>${sunArc(Dl.sunrise[it],Dl.sunset[it])}<p>${E(sunNext[2])}</p></div>
    <div class="wscard">${hd("💨","VIETOR")}${compass(C.wind_direction_10m,C.wind_speed_10m)}<p>${E(windTxt(C.wind_speed_10m))} · ${E(dir16(C.wind_direction_10m||0))}</p></div>
    <div class="wscard">${hd("💧","ZRÁŽKY")}<b class="wsv">${mm(rToday)} mm</b><b class="wsv2">za 24 h</b><p>${rNext>=0.1?`Očakáva sa ${mm(rNext)} mm počas 24 h.`:"Najbližších 24 h bez zrážok."}</p></div>
    <div class="wscard">${hd("🌡️","POCITOVÁ TEPLOTA")}<b class="wsv">${R(fl)}°</b><p>${E(flT)}</p></div>
    <div class="wscard">${hd("💦","VLHKOSŤ")}<b class="wsv">${R(hum)} %</b><p>Rosný bod je teraz ${R(C.dew_point_2m)}°.</p></div>
    <div class="wscard">${hd("👁️","VIDITEĽNOSŤ")}<b class="wsv">${vis!=null?(Math.round(vis/100)/10).toLocaleString("sk-SK",{maximumFractionDigits:vis<10000?1:0})+" km":"–"}</b><p>${vis>=10000?"Úplne jasný výhľad.":vis>=4000?"Mierne znížená.":"Znížená (hmla)."}</p></div>
    <div class="wscard">${hd("🧭","TLAK")}${gauge(pres)}<p>${E(prT)}</p></div>
    <div class="wscard wsc-moon">${hd("🌙","MESIAC")}<div class="wsmrow">${moonSVG(mo.f)}<div><b class="wsv2">${E(mo.n)}</b><small>Osvetlenie ${mo.ill} %</small></div></div></div>
    ${W.a&&W.a.current?`<div class="wscard wsc-pel">${hd("🌿","PEĽ")}${PL.map(p=>`<div class="wspr"><span>${p[0]}</span><b>${pTxt(p[1],p[2])}</b></div>`).join("")}</div>`:""}
   </div>
  </div>
  <div class="wssrc">Počasie: Open-Meteo · aktualizované ${new Date(W.at).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})} · <button type="button" class="wsplace" data-wxpick>📍 Zmeniť miesto</button></div></div>`}
// ---- napojenie ----
const _card=window.wxCard;
window.wxCard=function(){if(!W.d||(W.key&&W.key!==loc().lat+","+loc().lon)||Date.now()-W.at>15*60e3)load().then(()=>{try{if(typeof rerender==="function")rerender()}catch(x){}});
  const radar="";
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
/* 🍏 POČASIE AKO V iPHONE (1. 11.) – obloha podľa počasia, priesvitné karty, biely text, bez animácií */
.wsx{position:relative;display:grid;gap:10px;min-width:0;padding:14px 12px 16px;border-radius:26px;color:#fff;overflow:hidden;
 font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
 background:linear-gradient(180deg,#3B7BD4 0%,#5C9BE3 55%,#86BBEE 100%)}
.wsx.k-partly{background:linear-gradient(180deg,#4A7DBE 0%,#6E9BD0 55%,#9DBFE2 100%)}
.wsx.k-cloudy,.wsx.k-fog{background:linear-gradient(180deg,#56687C 0%,#738598 55%,#95A3B2 100%)}
.wsx.k-rain,.wsx.k-snow,.wsx.k-storm{background:linear-gradient(180deg,#3E4A58 0%,#56626F 55%,#717C88 100%)}
.wsx.night{background:linear-gradient(180deg,#0B1236 0%,#18245A 60%,#28377A 100%)}
.wsx.night.k-cloudy,.wsx.night.k-fog,.wsx.night.k-rain,.wsx.night.k-snow,.wsx.night.k-storm{background:linear-gradient(180deg,#141B27 0%,#222C3B 60%,#323E50 100%)}
.wsx *{box-sizing:border-box}
.wsios{text-align:center;padding:18px 6px 14px;text-shadow:0 1px 6px rgba(0,0,0,.18)}
.wsmy{font-size:.8rem;font-weight:600;letter-spacing:.06em;opacity:.95}
.wscity{display:inline-block;background:none!important;border:0!important;box-shadow:none!important;color:#fff!important;font-size:2.1rem!important;font-weight:400!important;line-height:1.15!important;font-family:inherit!important;padding:2px 8px!important;min-height:44px;max-width:100%;white-space:normal;overflow-wrap:anywhere;text-shadow:inherit}
.wssub{font-size:.85rem;opacity:.8;margin-top:-2px}
.wsbig{font-weight:200;font-size:6.2rem;line-height:1;letter-spacing:-.02em;margin:2px 0 0 .28em}
.wscond{font-size:1.3rem;font-weight:500;opacity:.95;margin-top:2px}
.wshl{font-size:1.2rem;font-weight:500;margin-top:2px}
.wsgrid{display:grid;gap:10px;grid-template-columns:minmax(0,1fr);min-width:0}
@media (min-width:820px){.wsgrid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.wsmini{grid-column:1/-1}}
.wscol{display:grid;gap:10px;min-width:0}
.wscard{position:relative;border-radius:16px;padding:12px 14px;min-width:0;color:#fff;background:rgba(15,35,75,.20);
 -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:0;box-shadow:none}
.wsx.night .wscard{background:rgba(255,255,255,.08)}
.wsx.k-cloudy .wscard,.wsx.k-fog .wscard,.wsx.k-rain .wscard,.wsx.k-snow .wscard,.wsx.k-storm .wscard{background:rgba(0,0,0,.14)}
.wslbl{display:flex;align-items:center;gap:6px;font-size:.74rem;font-weight:600;letter-spacing:.03em;color:rgba(255,255,255,.62);margin-bottom:8px;padding-bottom:7px;border-bottom:.5px solid rgba(255,255,255,.22)}
.wslbl i{font-style:normal;filter:grayscale(1) brightness(2.2);opacity:.75;font-size:.9rem}
.wsmini .wslbl{border-bottom:0;padding-bottom:0}.wslbl{min-width:0;overflow-wrap:anywhere}.wsh span em,.wsd span em{white-space:nowrap}
.wssum{font-size:.92rem;line-height:1.35;padding-bottom:9px;margin-bottom:6px;border-bottom:.5px solid rgba(255,255,255,.22)}
.wshs{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 -6px}.wshs::-webkit-scrollbar{display:none}
.wshrow{display:flex;width:max-content}
.wsh{flex:0 0 58px;width:58px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px 0;font-size:.92rem}
.wsh small{font-size:.86rem;font-weight:600;white-space:nowrap}
.wsh span{display:flex;flex-direction:column;align-items:center;justify-content:center;height:42px}
.wsh span em,.wsd span em{font-style:normal;font-size:.68rem;font-weight:700;color:#7FD4FF;line-height:1}
.wsh b{font-size:1.05rem;font-weight:500}.wsh.sr b{font-size:.78rem;font-weight:600}
.wsh .wxi-s{width:30px;height:30px}
.wsd{display:grid;grid-template-columns:minmax(46px,1fr) 40px 34px minmax(56px,1.6fr) 34px;align-items:center;gap:8px;padding:8px 0;border-top:.5px solid rgba(255,255,255,.2);font-size:1.05rem}
.wsd:nth-child(2){border-top:0}
.wsd b{font-weight:500;text-transform:capitalize;white-space:nowrap}
.wsd span{display:flex;flex-direction:column;align-items:center;justify-content:center}.wsd .wxi-s{width:28px;height:28px}
.wsd small{text-align:right;opacity:.6;font-weight:500;font-size:1.05rem}.wsd strong{font-weight:500;text-align:right}
.wsr{position:relative;display:block;height:5px;border-radius:9px;background:rgba(0,0,0,.22)}
.wsr>i{position:absolute;top:0;bottom:0;border-radius:9px}
.wsr>u{position:absolute;top:50%;width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 2.5px rgba(30,50,90,.55);transform:translate(-50%,-50%)}
.wsv{display:block;font-size:2rem;font-weight:500;line-height:1.1}
.wsv2{display:block;font-size:1.15rem;font-weight:600;line-height:1.2;margin-top:2px}
.wsmini .wscard p,.wsc-aqi p{margin:8px 0 0;font-size:.85rem;line-height:1.3;opacity:.95}
.wsmini{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}
@media (min-width:820px){.wsmini{grid-template-columns:repeat(4,minmax(0,1fr))}.wsc-pel,.wsc-moon{grid-column:span 2}}
.wsmini .wscard{min-height:150px;display:flex;flex-direction:column}.wsmini .wscard p{margin-top:auto;padding-top:8px}
.wsuv{position:relative;display:block;height:5px;border-radius:9px;margin:10px 0 2px;background:linear-gradient(90deg,#30D158,#FFD60A,#FF9F0A,#FF453A,#BF5AF2)}
.wsuv.aq{background:linear-gradient(90deg,#30D158,#FFD60A,#FF9F0A,#FF453A,#BF5AF2,#8E2C48)}
.wsuv>i{position:absolute;top:50%;width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 2.5px rgba(0,0,0,.35);transform:translate(-50%,-50%)}
.wscomp,.wsgauge{display:block;width:100%;max-width:112px;margin:0 auto}
.wscomp .tk line{stroke:rgba(255,255,255,.4);stroke-width:1}.wscomp text{fill:rgba(255,255,255,.75);font:600 8px system-ui;text-anchor:middle}.wscomp text.n{fill:#fff}.wscomp .in{fill:none;stroke:none}.wscomp .ar{fill:#fff}
.wscomp .dv{font:700 8px system-ui}.wscomp .sp{font:700 14px system-ui;fill:#fff}.wscomp .u{font:500 6px system-ui}
.wsgauge .bg{fill:none;stroke:rgba(255,255,255,.25);stroke-width:7;stroke-linecap:round}.wsgauge .fg{fill:none;stroke:#fff;stroke-width:7;stroke-linecap:round}.wsgauge .v{fill:#fff;font:700 13px system-ui;text-anchor:middle}.wsgauge .u{fill:rgba(255,255,255,.75);font:500 7px system-ui;text-anchor:middle}
.wssun{display:block;width:100%;max-height:64px;margin-top:6px}.wssun .hz{stroke:rgba(255,255,255,.35)}.wssun .arc{fill:none;stroke:rgba(255,255,255,.45);stroke-width:2}.wssun .sun{fill:#fff;stroke:none}
.wsmrow{display:flex;align-items:center;gap:12px;min-width:0}.wsmrow>div{min-width:0;overflow-wrap:anywhere}.wsc-pel,.wsc-moon{grid-column:1/-1}.wsmoon{width:64px;height:64px;flex:0 0 64px}.wsmrow small{display:block;opacity:.75;font-size:.82rem;margin-top:2px}
.wspr{display:flex;justify-content:space-between;gap:8px;font-size:.9rem;padding:3px 0}.wspr span{opacity:.75}
.wswn{display:flex;gap:10px;align-items:center;padding:5px 0}.wswn span{font-size:1.3rem}.wswn b{display:block;font-weight:600}.wswn small{opacity:.8}
.wsc-map .rdbox{margin:0;border-radius:12px;overflow:hidden}.wsnote{display:block;font-size:.7rem;opacity:.7;margin-top:6px}.wsnote a{color:#fff}
.wssrc{text-align:center;font-size:.75rem;opacity:.85;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px}
.wsplace{min-height:40px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.18)!important;border:0!important;color:#fff!important;font-weight:600;box-shadow:none!important}
.wxi-s{display:inline-block;width:1.8em;height:1.8em;vertical-align:middle;overflow:visible;flex:none}.wxi-s.big{width:100%;height:100%}
.whwx .wxi .wxi-s{width:1.6em;height:1.6em}
@media (max-width:380px){.wsbig{font-size:5.2rem}.wscity{font-size:1.8rem!important}.wslbl{font-size:.68rem;letter-spacing:0}.wsmini .wscard{min-height:140px}.wsd{grid-template-columns:minmax(40px,1fr) 34px 30px minmax(40px,1.4fr) 30px;gap:6px;font-size:.98rem}.wsd small{font-size:.98rem}}
`;document.head.appendChild(s)}
})();
