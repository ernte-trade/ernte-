// ===== 🧒 ERNTE JUNIOR – ÚVOD TIMOTEJA + ⚽ FUTBAL (príkaz majiteľa 1. 11. 2026) =====
// Úvod: počasie Michalovce, hodiny, 💶 zarobené od tatina, 📈 moje investície (cvičné portfólio), 🧠 testy (koľko, koľko správne),
// ⚠️ upozornenia „musíš sa učiť“ (slabá úspešnosť alebo dlho nerobené), 🎵 Spotify, ⚽ futbal (MFK Zemplín Michalovce, Barça, Ronaldo, Yamal, El Clásico).
// Číre diamantové sklo. Údaje z kid.js cez window.kidCtx() (K, P, PAY, LESSONS, PRK, go, coins).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const EUR=v=>(+v||0).toLocaleString("sk-SK",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
const D={wx:null,wxAt:0,inv:null,invAt:0,fq:null,fm:null};
const SPK="ernte-kid-sp",SPDEF="playlist/70yWEVCtXXtTay9CMsxnyD"; // FC Barcelona Anthem (tatino môže zmeniť)
// 🎵 Timotejova hudba (1. 11. príkaz majiteľa): futbalové pesničky + playlisty, veľké prepínanie ◀ ▶ a dlaždice
const SPL=[["🏆","Liga majstrov – hymna","UEFA","track/7HJidWHPoAXJhaKeAmqfF5"],["🔵🔴","Cant del Barça","hymna FC Barcelona","track/5xXjygXDO7SQirJo37KBxV"],
 ["🌍","Waka Waka","Shakira · MS 2010","track/6bNB5gxFX6Q87DbQWb8OWZ"],["🥇","We Are the Champions","Queen","track/0saBeiGcu2dECTvAknHPzL"],
 ["🎸","Seven Nation Army","„Po-po-po-po“ zo štadiónov","track/3dPQuX8Gs42Y7b454ybpMR"],["🇫🇷","La Copa de la Vida","Ricky Martin · MS 1998","track/0KnZ3Fgnqjmz4Sl2OA5zwa"],
 ["🇷🇺","Live It Up","Nicky Jam, Will Smith · MS 2018","track/4DnHUy01jEA4b5ydC3HgsT"],["🔴","You'll Never Walk Alone","hymna Liverpoolu","track/6fSNK6QlZskYmKTvJnNH5P"],
 ["🎉","Freed From Desire","Gala · tribúny","track/3u5N55tHf7hXATSQrjBh2q"],["⚡","Song 2","Blur · „Woo-hoo!“","track/3GfOAdcoc3X5GPiiXmpBjK"],
 ["⚽","Futbalové hymny sveta","playlist Spotify","playlist/37i9dQZF1DXaoALgva1Aqr"],["🏟️","Hymny klubov","playlist","playlist/3W72k7KYqQah9sDYh4vZ1S"],["💙","Barça – playlist","playlist","playlist/70yWEVCtXXtTay9CMsxnyD"]];
const spRef=()=>{try{return localStorage.getItem(SPK)||SPDEF}catch(x){return SPDEF}};
const WMO=c=>c==null?["🌡️",""]:c===0?["☀️","jasno"]:c<=2?["🌤️","polojasno"]:c===3?["☁️","zamračené"]:c<=48?["🌫️","hmla"]:c<=57?["🌦️","mrholí"]:c<=67?["🌧️","dážď"]:c<=77?["❄️","sneh"]:c<=82?["🌧️","prehánky"]:c<=86?["🌨️","snehové prehánky"]:["⛈️","búrka"];
function rr(){try{const c=window.kidCtx&&kidCtx();if(c&&(c.V==="home"||c.V==="fut"))c.render()}catch(x){}}
async function loadWx(){if(D.wx&&Date.now()-D.wxAt<15*60e3)return;D.wxAt=Date.now();
  try{const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude=48.7547&longitude=21.9195&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&timezone=Europe%2FBratislava");
    if(r.ok){D.wx=await r.json();rr()}}catch(x){}}
async function loadInv(){if(D.inv&&Date.now()-D.invAt<10*60e3)return;D.invAt=Date.now();
  try{const [a,b]=await Promise.all([sb.rpc("inv_state"),fetch("https://raw.githubusercontent.com/ernte-trade/ernte-/invest-data/invest.json?t="+Math.floor(Date.now()/600e3)).then(r=>r.ok?r.json():null).catch(()=>null)]);
    if(a.error||!a.data)return;const px={};((b&&b.f)||[]).forEach(f=>px[f.s]=f.px);
    const val=p=>{let v=+p.cash||0;for(const [s,x] of Object.entries(p.hold||{}))v+=(+x.q||0)*(px[s]||+x.avg||0);return v};
    const me=(a.data.pf||[]).find(p=>p.who===a.data.me),dad=(a.data.pf||[]).find(p=>p.who==="martin");
    D.inv={v:me?val(me):null,st:me?+me.start:1000,g:me?(val(me)/(+me.start||1)-1)*100:null,dg:dad?(val(dad)/(+dad.start||1)-1)*100:null,n:me?Object.keys(me.hold||{}).length:0,unread:(a.data.notes||[]).filter(n=>!n.read).length};rr()}catch(x){}}
const pc=v=>v==null||!isFinite(v)?"–":(v>=0?"+":"")+v.toLocaleString("sk-SK",{maximumFractionDigits:1,minimumFractionDigits:1})+" %";

// ---------- štatistiky testov + upozornenia ----------
function stats(c){const P=c.P,PRK=c.PRK,sub=Object.keys(PRK).map(k=>{const s=P["pr_"+k]||{};return {k,name:PRK[k][1],n:+s.n||0,ok:+s.ok||0,t:+s.t||0}});
  const q=P.qs||{n:0,ok:0};const n=sub.reduce((a,s)=>a+s.n,0)+(+q.n||0),ok=sub.reduce((a,s)=>a+s.ok,0)+(+q.ok||0);
  const today=new Date().toLocaleDateString("sv-SE"),td=P.qday&&P.qday.d===today?P.qday:{n:0,ok:0};
  const W=[];sub.forEach(s=>{const acc=s.n?s.ok/s.n*100:0,days=s.t?(Date.now()-s.t)/864e5:null;
    if(!s.n)W.push({k:s.k,p:2,t:`${s.name}: ešte si neskúšal – daj si 10 otázok`});
    else if(s.n>=5&&acc<70)W.push({k:s.k,p:0,t:`${s.name}: len ${Math.round(acc)} % správne – musíš sa to doučiť 💪`});
    else if(days!=null&&days>=3)W.push({k:s.k,p:1,t:`${s.name}: ${Math.floor(days)} dní si nerobil – nezabudni!`})});
  W.sort((a,b)=>a.p-b.p);
  const lessons=c.LESSONS.length,ld=c.LESSONS.filter(l=>P["l_"+l.id]&&P["l_"+l.id].ok).length;
  return {sub,n,ok,acc:n?Math.round(ok/n*100):0,td,W:W.slice(0,3),lessons,ld}}

// pre rannú správu v 💬 (feedback.js): štatistiky, počasie, investície
window.kidStats=function(){const c=window.kidCtx&&kidCtx();if(!c)return null;try{loadWx();loadInv()}catch(x){}return {c,s:stats(c),wx:D.wx||null,inv:D.inv||null}};
window.kidDash=function(){const c=window.kidCtx&&kidCtx();if(!c)return "";loadWx();loadInv();
  const s=stats(c),p=c.PAY||{},w=D.wx&&D.wx.current,dw=D.wx&&D.wx.daily,wi=WMO(w&&w.weather_code),inv=D.inv;
  const now=new Date(),hr=now.getHours(),greet=hr<10?"Dobré ráno":hr<18?"Ahoj":"Dobrý večer",nm=String(c.K.name||"").split(" ")[0];
  return `<div class="kd">
  <div class="kdg kdhero"><div class="kdh1"><small>${now.toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"long"})}</small><b>${E(greet)}, ${E(nm)}! ⚽</b><span>${c.lv[0]} ${E(c.lv[1])} · 🪙 ${c.coins}</span></div>
   <div class="kdwx"><span class="kdwi">${wi[0]}</span><b>${w?Math.round(w.temperature_2m)+"°":"–"}</b><small>Michalovce · ${E(wi[1])}${w?` · vietor ${Math.round(w.wind_speed_10m)} km/h`:""}</small>
    ${dw?`<div class="kdwd">${dw.time.slice(0,3).map((d,i)=>`<span><i>${i===0?"dnes":new Date(d).toLocaleDateString("sk-SK",{weekday:"short"})}</i>${WMO(dw.weather_code[i])[0]}<em>${Math.round(dw.temperature_2m_max[i])}° / ${Math.round(dw.temperature_2m_min[i])}°</em></span>`).join("")}</div>`:""}</div></div>
  ${s.W.length?`<div class="kdg kdwarn"><b>📚 Musíš sa učiť</b>${s.W.map(x=>`<button type="button" data-kpr="${x.k}">${E(x.t)} ›</button>`).join("")}</div>`:`<div class="kdg kdgood"><b>🌟 Super, všetky predmety ideš výborne!</b><small>Pokračuj – každá správna odpoveď = peniaze od tatina.</small></div>`}
  <div class="kdgrid">
   <button type="button" class="kdg kdt" data-kpay><small>💶 Zarobené od tatina</small><b>${EUR(p.month)}</b><span>tento mesiac · dnes ${EUR(p.today||0)}</span><div class="kdbar"><i style="width:${Math.min(100,(+p.month||0)/(+p.max||200)*100).toFixed(0)}%"></i></div></button>
   <button type="button" class="kdg kdt" data-kinv><small>📈 Moje investície${inv&&inv.unread?` · ✉️ ${inv.unread}`:""}</small><b>${inv&&inv.v!=null?EUR(inv.v):"…"}</b><span class="${inv&&inv.g>=0?"kup":"kdn"}">${inv?pc(inv.g)+" od štartu":"načítavam"}</span><span>${inv&&inv.dg!=null?(inv.g>=inv.dg?"🏆 vedieš pred tatinom":"tatino vedie – dobehni ho!"):""}</span></button>
   <div class="kdg kdt"><small>🧠 Testy spolu</small><b>${s.n}</b><span>${s.ok} správne · ${s.acc} %</span><span>dnes ${s.td.n} otázok · ${s.td.ok} správne</span></div>
   <div class="kdg kdt"><small>🎓 Lekcie</small><b>${s.ld} / ${s.lessons}</b><div class="kdbar"><i style="width:${(s.ld/(s.lessons||1)*100).toFixed(0)}%"></i></div><span>${s.lessons-s.ld?`ešte ${s.lessons-s.ld} lekcií`:"všetky hotové 🏆"}</span></div>
  </div>
  <div class="kdg kdsub">${s.sub.map(x=>{const a=x.n?Math.round(x.ok/x.n*100):null;return `<button type="button" data-kpr="${x.k}"><b>${E(x.name)}</b><span class="${a==null?"":a>=85?"kup":a>=70?"kmid":"kdn"}">${a==null?"–":a+" %"}</span><small>${x.ok}/${x.n}</small></button>`}).join("")}</div>
  <button type="button" class="kdg kdfut" data-kfut><span>⚽</span><div><b>Futbal</b><small>Zemplín Michalovce · Barça · Ronaldo · Yamal · El Clásico</small></div><em>›</em></button>
  <div class="kdg kdsp">${(()=>{const r=spRef(),ci=SPL.findIndex(x=>x[3]===r),c=SPL[ci]||[ "🎵","Moja pesnička","vlastný odkaz",r];
   return `<div class="kdsph"><b>🎵 Moja hudba</b><button type="button" data-kspc>🔗 Vlastná</button></div>
   <div class="kdnow"><button type="button" class="kdsk" data-ksps="-1" aria-label="Predchádzajúca">◀</button><div class="kdnt"><span>${c[0]}</span><div><small>▶ HRÁ</small><b>${E(c[1])}</b><em>${E(c[2])}</em></div></div><button type="button" class="kdsk" data-ksps="1" aria-label="Ďalšia">▶</button></div>
   <iframe title="Spotify" src="https://open.spotify.com/embed/${E(r)}?utm_source=generator&theme=0" width="100%" height="${r.startsWith("track/")?152:232}" frameborder="0" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
   <small class="kdslb">🎵 Pesničky</small><div class="kdspl">${SPL.filter(x=>x[3].startsWith("track/")).map(x=>`<button type="button" data-kspp="${x[3]}" class="${x[3]===r?"on":""}"><span>${x[0]}</span><b>${E(x[1])}</b><small>${x[3]===r?"▶ hrá":E(x[2])}</small></button>`).join("")}</div>
   <small class="kdslb">📻 Playlisty</small><div class="kdspl">${SPL.filter(x=>x[3].startsWith("playlist/")).map(x=>`<button type="button" data-kspp="${x[3]}" class="${x[3]===r?"on":""}"><span>${x[0]}</span><b>${E(x[1])}</b><small>${x[3]===r?"▶ hrá":E(x[2])}</small></button>`).join("")}</div>`})()}</div>
 </div>`};

// ---------- ⚽ FUTBAL ----------
const FC=[
 ["🟡🔵","MFK Zemplín Michalovce – môj klub","Založený v roku 1912 – má viac ako 110 rokov! Hrá najvyššiu slovenskú ligu (Niké liga) na Mestskom futbalovom štadióne v Michalovciach (asi 4 440 miest). Prezývka: Žltomodrí. Do najvyššej ligy postúpil v roku 2015 výhrou 2:0 v Skalici. Z Michaloviec vyšlo veľa reprezentantov Slovenska – možno raz aj ty, Timotej! ⚽"],
 ["🔵🔴","FC Barcelona","Založil ju Joan Gamper 29. novembra 1899. Heslo: „Més que un club“ – viac ako klub. Farby blaugrana: modrá a granátová. Domov: Camp Nou, najväčší štadión v Európe. Ligu majstrov vyhrala do roku 2025 päťkrát (1992, 2006, 2009, 2011, 2015). Odchovanci z akadémie La Masia: Messi, Xavi, Iniesta – aj Lamine Yamal."],
 ["7️⃣","Cristiano Ronaldo","Narodil sa 5. februára 1985 vo Funchale na portugalskom ostrove Madeira. Hral za Sporting, Manchester United, Real Madrid, Juventus a Al Nassr. 5× získal Zlatú loptu, v Reale je najlepší strelec v histórii klubu (450 gólov). V roku 2016 vyhral s Portugalskom majstrovstvá Európy. Prvý futbalista s 900 oficiálnymi gólmi (2024). Tajomstvo: tréning, spánok, zdravé jedlo a disciplína každý deň."],
 ["🌟","Lamine Yamal","Narodil sa 13. júla 2007 neďaleko Barcelony. Vyrastal v akadémii La Masia a za A-tím Barçy debutoval ako 15-ročný. Na EURO 2024 vyhral so Španielskom zlato a ako 16-ročný strelil najkrajší gól turnaja Francúzsku – najmladší strelec v histórii majstrovstiev Európy. Ľavačka, krásne kľučky a odvaha hrať pred 90-tisíc ľuďmi."],
 ["🏟️","El Clásico – a ty si tam bol!","El Clásico je zápas FC Barcelona proti Realu Madrid – najsledovanejší klubový zápas na svete, pozerajú ho stovky miliónov ľudí. Prvýkrát sa hral v roku 1902. Hráva sa na Camp Nou v Barcelone alebo na Santiago Bernabéu v Madride. Ty si ho videl naživo – to sa podarí málokomu! 🎉"],
 ["💼","Futbal je aj biznis","Klub potrebuje peniaze na platy, štadión a cestovanie: predáva lístky, dresy, televízne práva a reklamu (sponzorov). Hráča môže predať inému klubu – Zemplín predal v roku 2025 Artúra Musáka do Ostravy asi za 700 000 €. Presne ako u tatina vo firme: kúpiť, rozvíjať, predať so ziskom."]];
const FQ=[
 ["V ktorom roku vznikol MFK Zemplín Michalovce?",["1912","1960","2015"],0],
 ["Aká je prezývka Zemplína?",["Žltomodrí","Bieli anjeli","Granátoví"],0],
 ["Kto je najmladší strelec v histórii majstrovstiev Európy?",["Lamine Yamal","Cristiano Ronaldo","Pedri"],0],
 ["Ako sa volá zápas Barcelona – Real Madrid?",["El Clásico","Derby della Madonnina","Superclásico"],0],
 ["Kde sa narodil Cristiano Ronaldo?",["Madeira (Portugalsko)","Madrid","Lisabon"],0],
 ["Koľkokrát vyhrala Barcelona Ligu majstrov do roku 2025?",["5-krát","2-krát","10-krát"],0],
 ["Čo znamená heslo Barçy „Més que un club“?",["Viac ako klub","Vždy vyhrávame","Modro-červení"],0],
 ["Ako sa volá futbalová akadémia Barcelony?",["La Masia","La Fábrica","Clairefontaine"],0],
 ["S ktorou krajinou vyhral Yamal EURO 2024?",["Španielsko","Portugalsko","Francúzsko"],0],
 ["Koľko Zlatých lôpt získal Ronaldo?",["5","1","8"],0],
 ["Koľko hráčov má jeden tím na ihrisku?",["11","10","9"],0],
 ["Ako dlho trvá futbalový zápas bez nadstavenia?",["90 minút","60 minút","120 minút"],0]];
function shuf(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function fqNew(){const L=shuf(FQ).slice(0,6).map(q=>{const o=shuf(q[1].map((t,i)=>({t,ok:i===q[2]})));return {q:q[0],o}});D.fq={L,i:0,ok:0,pick:null}}
function fmNew(){const r=n=>1+Math.floor(Math.random()*n),T=[
  ()=>{const a=r(4)+1,b=r(3);return [`Zemplín dal v prvom polčase ${a} góly a v druhom ${b}. Koľko gólov dal spolu?`,a+b]},
  ()=>{const g=r(20)+10,z=r(10)+10;return [`Yamal dal za sezónu ${g} gólov v ${z} zápasoch. O koľko viac gólov ako zápasov?`,g-z]},
  ()=>{const l=r(8)*1000+20000,c=12;return [`Na zápas prišlo ${l.toLocaleString("sk-SK")} divákov a lístok stál ${c} €. Koľko eur zarobil klub?`,l*c]},
  ()=>{const m=r(5)*5+15;return [`Hráč odohral ${m} minút v každom z 4 zápasov. Koľko minút spolu?`,m*4]},
  ()=>{const d=r(6)+2,p=(r(4)+3)*10;return [`Dres stojí ${p} €. Tréner kúpi ${d} dresov. Koľko zaplatí?`,p*d]},
  ()=>{const s=r(30)+60,b=r(20)+10;return [`Ronaldo mal ${s} gólov, Yamal o ${b} menej. Koľko gólov mal Yamal?`,s-b]}];
  const t=T[Math.floor(Math.random()*T.length)]();D.fm={q:t[0],a:t[1],inp:"",res:null}}
window.kidFutbal=function(){const c=window.kidCtx&&kidCtx();if(!c)return "";if(!D.fq)fqNew();if(!D.fm)fmNew();const q=D.fq;
  const cur=q.i<q.L.length?q.L[q.i]:null;
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>⚽ Futbal</b><span></span></div>
  <div class="kd">
   <div class="kdg kdzem"><b>🟡🔵 Hráč MFK Zemplín Michalovce</b><small>Timotej · trénuj, uč sa a raz budeš hrať na Camp Nou ako Yamal! ⚽</small></div>
   ${FC.map((f,i)=>`<details class="kdg kdfc"${i===0?" open":""}><summary><span>${f[0]}</span><b>${E(f[1])}</b></summary><p>${E(f[2])}</p></details>`).join("")}
   <div class="kdg kdq"><b>🏆 Futbalový kvíz</b>${cur?`<small>Otázka ${q.i+1} z ${q.L.length} · správne ${q.ok}</small><p class="kdqq">${E(cur.q)}</p>
     <div class="kdqo">${cur.o.map((o,j)=>`<button type="button" class="${q.pick==null?"":o.ok?"ok":q.pick===j?"bad":""}" data-kfq="${j}">${E(o.t)}</button>`).join("")}</div>
     ${q.pick!=null?`<button type="button" class="lime" data-kfqn>Ďalšia ›</button>`:""}`:`<p class="kdqq">${q.ok} z ${q.L.length} správne ${q.ok>=5?"🏆 Si futbalový profesor!":q.ok>=3?"👍 Dobre!":"💪 Skús znova!"}</p><button type="button" class="lime" data-kfqr>Hrať znova</button>`}</div>
   <div class="kdg kdq"><b>🧮 Futbalová matematika</b><p class="kdqq">${E(D.fm.q)}</p>
    ${D.fm.res==null?`<div class="kdmi"><input type="text" inputmode="numeric" data-kfmi value="${E(D.fm.inp)}" placeholder="výsledok"><button type="button" class="lime" data-kfmc>Skontrolovať</button></div>`
     :`<p class="${D.fm.res?"kup":"kdn"}">${D.fm.res?"✅ Správne! +3 🪙":"❌ Správne je "+D.fm.a.toLocaleString("sk-SK")}</p><button type="button" class="lime" data-kfmn>Ďalší príklad ›</button>`}</div>
  </div>`};

document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-kfut],[data-kfq],[data-kfqn],[data-kfqr],[data-kfmc],[data-kfmn],[data-kspc],[data-kspp],[data-ksps]");if(!t)return;const c=window.kidCtx&&kidCtx();if(!c)return;e.preventDefault();e.stopPropagation();
  if("kfut" in t.dataset){c.go("fut");return}
  if(t.dataset.kfq!=null){const q=D.fq;if(!q||q.pick!=null)return;q.pick=+t.dataset.kfq;const ok=q.L[q.i].o[q.pick].ok;if(ok){q.ok++;c.addCoins(3,"futbalový kvíz")}c.stat(ok);c.render();return}
  if("kfqn" in t.dataset){D.fq.i++;D.fq.pick=null;c.render();return}
  if("kfqr" in t.dataset){fqNew();c.render();return}
  if("kfmc" in t.dataset){const i=document.querySelector("[data-kfmi]");const v=(i&&i.value||"").replace(/\s/g,"");if(!v)return;D.fm.inp=v;D.fm.res=+v===D.fm.a;if(D.fm.res){c.addCoins(3,"futbalová matematika");c.earn("q","Futbalová matematika")}c.stat(D.fm.res,"mat");c.render();return}
  if("kfmn" in t.dataset){fmNew();c.render();return}
  if(t.dataset.ksps){const i=SPL.findIndex(x=>x[3]===spRef()),n=(i<0?0:i+(+t.dataset.ksps)+SPL.length)%SPL.length;try{localStorage.setItem(SPK,SPL[n][3])}catch(x){}rr();return}
  if(t.dataset.kspp){try{localStorage.setItem(SPK,t.dataset.kspp)}catch(x){}rr();return}
  if("kspc" in t.dataset){const u=prompt("Vlož odkaz na playlist zo Spotify (Zdieľať → Kopírovať odkaz). Prázdne = hymna Barçy.");if(u==null)return;const m=String(u).match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist)\/([A-Za-z0-9]{10,})/);
    try{if(!u.trim())localStorage.removeItem(SPK);else if(m)localStorage.setItem(SPK,m[1]+"/"+m[2]);else{alert("To nie je odkaz na Spotify.");return}}catch(x){}c.render()}},true);

{const s=document.createElement("style");s.textContent=`
.kd{display:grid;gap:12px;margin:10px 0 14px}
.kdg{position:relative;border-radius:24px;padding:14px;color:#fff;text-align:center;overflow:hidden;
 background:linear-gradient(150deg,rgba(255,255,255,.16),rgba(186,230,253,.05) 45%,rgba(244,114,182,.07) 75%,rgba(255,255,255,.10));
 border:1px solid transparent;background-clip:padding-box;box-shadow:0 8px 30px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.35)}
.kdg::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;
 background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(125,211,252,.55) 30%,rgba(244,114,182,.5) 55%,rgba(253,230,138,.6) 80%,rgba(255,255,255,.9));
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.kdhero{display:grid;gap:10px;background:linear-gradient(150deg,rgba(29,78,216,.45),rgba(250,204,21,.18) 60%,rgba(255,255,255,.08))}
.kdh1{display:grid;gap:2px}.kdh1 small{opacity:.8;text-transform:capitalize}.kdh1 b{font-size:1.45rem;letter-spacing:-.01em}.kdh1 span{opacity:.9;font-size:.9rem}
.kdwx{display:grid;justify-items:center;gap:2px}.kdwi{font-size:2.6rem;line-height:1;filter:drop-shadow(0 0 12px rgba(255,255,255,.5))}.kdwx>b{font-size:2.2rem;line-height:1}.kdwx small{opacity:.85}
.kdwd{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;width:100%;margin-top:6px}.kdwd span{display:grid;gap:1px;padding:6px 2px;border-radius:14px;background:rgba(255,255,255,.08);font-size:1.2rem}.kdwd i{font-style:normal;font-size:.72rem;opacity:.8;text-transform:capitalize}.kdwd em{font-style:normal;font-size:.75rem}
.kdwarn{display:grid;gap:6px;background:linear-gradient(150deg,rgba(248,113,113,.28),rgba(251,146,60,.14));}.kdwarn>b{font-size:1.05rem}
.kdwarn button{all:unset;box-sizing:border-box;display:block;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.25);cursor:pointer;font-weight:600;font-size:.92rem;line-height:1.3;overflow-wrap:anywhere}
.kdgood{display:grid;gap:4px;background:linear-gradient(150deg,rgba(134,239,172,.25),rgba(56,189,248,.12))}.kdgood small{opacity:.85}
.kdgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.kdt{all:unset;box-sizing:border-box;position:relative;display:grid;gap:3px;align-content:center;justify-items:center;min-height:132px;padding:12px 8px;border-radius:24px;text-align:center;cursor:pointer;color:#fff;overflow:hidden;
 background:linear-gradient(150deg,rgba(255,255,255,.16),rgba(186,230,253,.05) 45%,rgba(244,114,182,.07) 75%,rgba(255,255,255,.10));box-shadow:0 8px 30px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.35)}
.kdt small{font-size:.74rem;opacity:.85;line-height:1.2}.kdt b{font-size:1.45rem;letter-spacing:-.01em}.kdt span{font-size:.78rem;opacity:.9;line-height:1.25}
.kdbar{width:86%;height:7px;border-radius:9px;background:rgba(255,255,255,.15);overflow:hidden;margin:3px 0}.kdbar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#b6ff3b,#22d3ee)}
.kup{color:#86efac!important}.kdn{color:#fca5a5!important}.kmid{color:#fde68a!important}
.kdsub{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:6px;padding:10px}
.kdsub button{all:unset;box-sizing:border-box;display:grid;gap:1px;justify-items:center;padding:8px 4px;border-radius:14px;background:rgba(255,255,255,.07);cursor:pointer;min-width:0}.kdsub b{font-size:.8rem;overflow-wrap:anywhere}.kdsub span{font-weight:800;font-size:1.05rem}.kdsub small{font-size:.7rem;opacity:.75}
.kdfut{all:unset;box-sizing:border-box;position:relative;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:24px;cursor:pointer;color:#fff;overflow:hidden;
 background:linear-gradient(120deg,rgba(29,78,216,.55),rgba(165,0,68,.45) 55%,rgba(250,204,21,.25));box-shadow:0 8px 30px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.35)}
.kdfut>span{font-size:2.2rem}.kdfut div{display:grid;gap:2px;text-align:left;flex:1;min-width:0}.kdfut b{font-size:1.2rem}.kdfut small{opacity:.85;font-size:.8rem;overflow-wrap:anywhere}.kdfut em{font-style:normal;font-size:1.6rem;opacity:.8}
.kdsp{padding:12px}.kdslb{display:block;font-size:.72rem;font-weight:800;letter-spacing:.08em;opacity:.7;margin:12px 2px 6px;text-transform:uppercase}
.kdnow{display:grid;grid-template-columns:52px minmax(0,1fr) 52px;gap:8px;align-items:center;margin:0 0 10px;padding:10px;border-radius:18px;background:linear-gradient(135deg,rgba(29,185,84,.30),rgba(34,211,238,.14));border:1px solid rgba(29,185,84,.65);box-shadow:0 0 18px rgba(29,185,84,.35)}
.kdsk{width:52px!important;height:52px!important;min-height:52px!important;padding:0!important;border-radius:50%!important;font-size:1.4rem!important;background:#1DB954!important;color:#000!important;border:0!important;font-weight:900;box-shadow:0 6px 16px rgba(29,185,84,.45)!important}
.kdnt{display:flex;align-items:center;gap:10px;min-width:0}.kdnt>span{font-size:2rem;line-height:1}.kdnt>div{min-width:0}.kdnt small{display:block;font-size:.66rem;font-weight:900;letter-spacing:.12em;color:#7CFFA8}.kdnt b{display:block;font-size:1.08rem;line-height:1.2;overflow-wrap:anywhere}.kdnt em{display:block;font-style:normal;font-size:.8rem;opacity:.8;overflow-wrap:anywhere}
.kdspl{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.kdspl button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:96px!important;padding:10px 6px!important;border-radius:16px!important;background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.16)!important;color:#fff!important;text-align:center}
.kdspl button span{font-size:1.7rem;line-height:1.1}.kdspl button b{font-size:.88rem;line-height:1.2;overflow-wrap:anywhere}.kdspl button small{font-size:.7rem;opacity:.75;overflow-wrap:anywhere}
.kdspl button.on{background:linear-gradient(135deg,rgba(29,185,84,.38),rgba(29,185,84,.14))!important;border:2px solid #1DB954!important;box-shadow:0 0 16px rgba(29,185,84,.5)!important}.kdspl button.on small{color:#7CFFA8;opacity:1;font-weight:800}
.kdsph{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px}.kdsph button{min-height:34px;padding:0 12px;border-radius:12px}.kdsp iframe{border-radius:14px;display:block;background:#000}
.kdzem{display:grid;gap:4px;background:linear-gradient(150deg,rgba(250,204,21,.4),rgba(29,78,216,.45))}.kdzem b{font-size:1.15rem}.kdzem small{opacity:.9}
.kdfc{text-align:left}.kdfc summary{display:flex;gap:10px;align-items:center;cursor:pointer;list-style:none}.kdfc summary::-webkit-details-marker{display:none}.kdfc summary span{font-size:1.4rem;white-space:nowrap;flex-shrink:0}.kdfc summary b{font-size:1.02rem}.kdfc p{margin:10px 0 2px;line-height:1.55;font-size:.95rem}
.kdq{display:grid;gap:8px}.kdq>b{font-size:1.1rem}.kdq small{opacity:.8}.kdqq{margin:0;font-size:1.02rem;line-height:1.45;font-weight:600}
.kdqo{display:grid;gap:6px}.kdqo button{min-height:44px;border-radius:14px;white-space:normal}.kdqo button.ok{background:#16a34a!important;color:#fff!important}.kdqo button.bad{background:#dc2626!important;color:#fff!important}
.kdmi{display:flex;gap:8px;flex-wrap:wrap}.kdmi input{flex:1 1 120px;min-height:44px;font-size:1.1rem;text-align:center}.kdmi button{flex:1 1 120px;min-height:44px}
@media(min-width:760px){.kdgrid{grid-template-columns:repeat(4,minmax(0,1fr))}.kdhero{grid-template-columns:1.2fr 1fr;align-items:center}}`;document.head.appendChild(s)}
})();
