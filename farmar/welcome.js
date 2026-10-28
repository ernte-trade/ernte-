// ===== 🌾 ÚVODNÁ OBRAZOVKA PO PRIHLÁSENÍ – animovaná scéna podľa toho, kto sa prihlásil =====
// Majiteľ (Martin): osobný pozdrav, dnešné čísla, najbližšie stretnutie z kalendára, vtip dňa.
// CEO, farmár, doprava, obchod, kurací trus, evidencia: vlastná scéna (kombajn, traktor, kamióny VALKO, silá, hydina, šanóny).
// Ukáže sa raz pri každom otvorení aplikácie. Ťuknutím sa zavrie; „Dnes už neukazovať“ ju skryje do zajtra.
// Iba vzhľad – nič neukladá, žiadne údaje navyše (čísla sú tie, ktoré používateľ aj tak vidí).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>new Date().toLocaleDateString("sv-SE");
const SKEY="ernte-welcome-shown",DKEY="ernte-welcome-off";
const sGet=k=>{try{return sessionStorage.getItem(k)}catch(x){return null}},sSet=(k,v)=>{try{sessionStorage.setItem(k,v)}catch(x){}};
const lGet=k=>{try{return localStorage.getItem(k)}catch(x){return null}},lSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(x){}};
const can_=k=>typeof can==="function"&&can(k);
function kind(){if(typeof FARMER!=="undefined"&&FARMER)return "farmar";if(window.ERNTE_KIND==="trus")return "trus";
  if(typeof ROLE==="undefined"||!ROLE)return null;
  if(ROLE==="owner")return (window.MAIN_OK&&MAIN_OK())?"ja":"ceo";
  if(ROLE==="dispatch"||can_("fleet")||can_("assign"))return "doprava";
  if(can_("trus")&&!can_("price_edit")&&!can_("price_view"))return "trus";
  if(can_("deals")||can_("price_edit"))return "obchod";
  if(can_("trus"))return "trus";if(can_("ev"))return "evid";return "tim"}
function phase(){const h=window.__wlh!=null?window.__wlh:new Date().getHours();return h<5||h>=21?"noc":h<8?"rano":h<18?"den":"vecer"}
const GREET={noc:(window.__wlh!=null?window.__wlh:new Date().getHours())<5?"Pekná noc":"Dobrý večer",rano:"Dobré ráno",den:"Dobrý deň",vecer:"Dobrý večer"};
const firstName=n=>{const p=String(n||"").replace(/^(Ing\.|Bc\.|Mgr\.|Shr\.|🧪)\s*/g,"").trim().split(/\s+/);return p[0]||""};
const JOKES=["Kombajny sú natankované, burza nespí – a ty už tiež nie. 💪","Šéf, dnes to zase pôjde rýchlo. Ako vždy.","Repka nečaká, VALKO nestojí, ERNTE beží.","Kto skoro ráno vstáva, tomu sa tony ukladajú.","Káva hotová? Lebo aplikácia už áno. ☕","Dnešný plán: kúpiť lacno, odviezť rýchlo, zaplatiť načas.","Traktor má 300 koní. Ty máš celú firmu.","Počasie sa mení, ceny sa menia – šéf ostáva. 😎","Každá tona sa počíta. Aj tá, čo ešte rastie.","Obilie do sila, peniaze na účet, šéf na kávu."];
const FUN={
 ja:JOKES,
 ceo:["Šéfka, káva je pripravená, čísla tiež. ☕📊","Faktúry odídu samy – skoro. 😉","Kto riadi firmu, ten riadi aj ráno.","Dnes žiadne prekvapenia. Iba tie príjemné.","Usmievaj sa – zúčtovanie sedí. 😄"],
 farmar:["Prečo je kombajn vždy v dobrej nálade? Lebo má všetko pokosené. 😄","Dážď na poli, slnko v duši, cena v aplikácii. ☀️","Najlepšie hnojivo je farmárov krok – a dobrá cena od ERNTE.","Traktor nepotrebuje kávu. Farmár áno. ☕","Repka kvitne, peniaze klíčia. 🌱"],
 doprava:["Kamión VALKO – jediné, čo ide rýchlejšie, sú klebety v dedine. 🚛😄","Vodiči, dnes zelená vlna od Michaloviec až po prístav! 🟢","GPS hovorí „odbočte vpravo“. Gabo hovorí „ja viem lepšie“. 😎","Plná nádrž, prázdna cesta, šťastný dispečer.","Kto má najviac koní? VALKO – 450 pod každou kapotou. 🐎"],
 obchod:["Najlepší obchod? Ten, čo sa uzavrie pred obedom. 🤝","Burza hore, burza dole – obchodník vždy na nohách.","Farmár volá? Usmej sa, cez telefón to počuť. 📞😊","Dnes predáme aj zrno, ktoré ešte nerastie. 😄","Káva, cenník, telefón – svätá trojica obchodníka. ☕"],
 trus:["Sliepky robia svoju prácu. My robíme tú našu. 🐔","Čo je zlato farmára? Tento trus – a dobrá doprava. 💛","Kikiríkí! Auto je na ceste. 🚛","Aj sliepka by vedela, že VALKO príde načas. 🐓","Dobrý vývoz začína ranným kikiríkí. 🌅"],
 evid:["Šanón v poriadku, šéf v pohode. 📒","Papier znesie všetko – aplikácia aj viac. 😄","Každý doklad na svojom mieste – ako v lekárni. 💊","Dnes ani jedna chýbajúca pečiatka! 🔖","Poriadok je polovica úspechu. Druhá polovica je káva. ☕"],
 tim:["Tímová práca: ty klikneš, aplikácia urobí zvyšok. 😄","Dnes to dáme! 💪","Úsmev je zadarmo – aj v ERNTE. 😊"]};
const ROLE_TXT={
 ceo:["manažérka · CEO","Celá firma pod kontrolou – obchody, doprava, zúčtovanie aj tím."],
 farmar:["dodávateľ ERNTE","Pozrite si dnešné výkupné ceny – predaj je na jedno ťuknutie."],
 doprava:["doprava VALKO","Autá, jazdy a odvozy na jednom mieste. Šťastnú cestu všetkým vodičom!"],
 obchod:["obchod ERNTE","Nový obchod uzavrieš za minútu – odfotíš, povieš alebo vyplníš."],
 trus:["kurací trus","Vývozy, autá a váženie – každý krok na jednom mieste."],
 evid:["evidencia","Doklady, zmluvy a zúčtovanie – všetko pekne v poriadku."],
 tim:["tím ERNTE","Všetko, čo potrebuješ, je na pár ťuknutí."]};

/* ---------- SVG scéna ---------- */
function sky(ph){const g={noc:["#050816","#1e2a71"],rano:["#fb923c","#7dd3fc"],den:["#38bdf8","#e0f2fe"],vecer:["#f97316","#4c1d95"]}[ph];
  let s=`<defs><linearGradient id="wsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[0]}"/></linearGradient>
  <linearGradient id="wfd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#facc15"/><stop offset="1" stop-color="#ca8a04"/></linearGradient>
  <linearGradient id="wst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9c27a"/><stop offset="1" stop-color="#a78b3c"/></linearGradient></defs>
  <rect width="400" height="220" fill="url(#wsk)"/>`;
  if(ph==="noc"){s+=`<g class="wstars">${Array.from({length:34},(_,i)=>`<circle cx="${(i*53)%400}" cy="${(i*37)%110}" r="${i%4?0.8:1.4}" fill="#fff" style="animation-delay:${(i%7)*.4}s"/>`).join("")}</g><circle cx="330" cy="40" r="16" fill="#f8fafc"/><circle cx="337" cy="35" r="14" fill="#1e2a71"/>`}
  else s+=`<circle class="wsun" cx="${ph==="rano"?70:ph==="vecer"?330:300}" cy="${ph==="den"?40:78}" r="20" fill="${ph==="den"?"#fde047":"#fdba74"}"/>`;
  s+=`<g class="wcl" opacity="${ph==="noc"?.25:.85}"><ellipse cx="60" cy="40" rx="26" ry="8" fill="#fff"/><ellipse cx="78" cy="36" rx="16" ry="8" fill="#fff"/><ellipse cx="230" cy="58" rx="30" ry="8" fill="#fff"/><ellipse cx="250" cy="54" rx="16" ry="7" fill="#fff"/></g>
  <path d="M0 130 Q60 100 130 118 T260 112 T400 120 V220 H0Z" fill="${ph==="noc"?"#14301a":"#4d7c0f"}"/>
  <path d="M0 145 Q90 125 200 140 T400 138 V220 H0Z" fill="${ph==="noc"?"#1c3a12":"#65a30d"}"/>`;
  return s}
const wheel=(x,y,r)=>`<g transform="translate(${x} ${y})"><g class="wsp"><circle r="${r}" fill="#1f2937"/><circle r="${r*.45}" fill="#9ca3af"/><rect x="${-r*.1}" y="${-r*.9}" width="${r*.2}" height="${r*1.8}" fill="#4b5563"/><rect y="${-r*.1}" x="${-r*.9}" height="${r*.2}" width="${r*1.8}" fill="#4b5563"/></g></g>`;
function combine(){return `<g class="wcomb"><g class="wdust"><circle cx="-8" cy="28" r="6" fill="#e7d39a"/><circle cx="-18" cy="22" r="8" fill="#e7d39a"/><circle cx="-30" cy="26" r="7" fill="#e7d39a"/></g>
  <rect x="0" y="0" width="56" height="24" rx="4" fill="#3f8a2b"/><rect x="34" y="-14" width="20" height="16" rx="3" fill="#3f8a2b"/><rect x="37" y="-11" width="14" height="10" rx="2" fill="#bae6fd"/>
  <rect x="4" y="-10" width="26" height="12" rx="2" fill="#2f6b20"/><rect x="-14" y="-16" width="26" height="4" rx="2" fill="#2f6b20" transform="rotate(-12)"/>
  <rect x="56" y="14" width="22" height="10" fill="#facc15"/><g transform="translate(70 12)"><g class="wsp"><circle r="9" fill="none" stroke="#b91c1c" stroke-width="2"/><line x1="-9" y1="0" x2="9" y2="0" stroke="#b91c1c" stroke-width="2"/><line x1="0" y1="-9" x2="0" y2="9" stroke="#b91c1c" stroke-width="2"/></g></g>
  ${wheel(14,26,9)}${wheel(44,28,7)}<text x="8" y="14" font-size="7" font-weight="700" fill="#fff" font-family="sans-serif">ERNTE</text></g>`}
function tractor(){return `<g class="wtrac"><rect x="-46" y="4" width="40" height="18" rx="3" fill="#e5e7eb"/><rect x="-44" y="0" width="36" height="6" fill="#facc15"/>${wheel(-36,24,5)}${wheel(-16,24,5)}
  <rect x="0" y="6" width="26" height="14" rx="3" fill="#b91c1c"/><rect x="14" y="-6" width="12" height="14" rx="2" fill="#b91c1c"/><rect x="16" y="-4" width="8" height="8" fill="#bae6fd"/><rect x="4" y="0" width="3" height="8" fill="#374151"/>${wheel(20,20,8)}${wheel(4,22,5)}</g>`}
function truck(cls,lbl){return `<g class="${cls}"><rect x="0" y="0" width="70" height="26" rx="3" fill="#f8fafc"/><text x="8" y="17" font-size="10" font-weight="800" fill="#1e2a71" font-family="sans-serif">${lbl}</text>
  <rect x="72" y="6" width="22" height="20" rx="4" fill="#1e2a71"/><rect x="82" y="9" width="10" height="8" rx="1" fill="#bae6fd"/>${wheel(12,28,5)}${wheel(26,28,5)}${wheel(56,28,5)}${wheel(84,28,5)}</g>`}
const PHOTO={trus:"img/trus-uvod.jpg"};
function scene(k,ph,por){if(PHOTO[k])return `<div class="wimg" style="background-image:url(${PHOTO[k]})" role="img" aria-label="Kurací trus – Bio-Fer NATUR"></div>`;let s=`<svg class="wsvg" viewBox="${por?"105 20 190 200":"0 0 400 220"}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">`+sky(ph);
  const field=`<rect x="0" y="150" width="400" height="70" fill="url(#wfd)"/><rect class="wcut" x="0" y="150" width="400" height="70" fill="url(#wst)"/>${Array.from({length:12},(_,i)=>`<line x1="0" y1="${156+i*5.5}" x2="400" y2="${156+i*5.5}" stroke="#a16207" stroke-width=".5" opacity=".35"/>`).join("")}`;
  const road=`<rect x="0" y="182" width="400" height="38" fill="#374151"/><g class="wlane">${Array.from({length:14},(_,i)=>`<rect x="${i*32}" y="199" width="16" height="3" fill="#f8fafc"/>`).join("")}</g>`;
  if(k==="doprava"){s+=`<rect x="0" y="150" width="400" height="32" fill="url(#wfd)"/>`+road+`<g transform="translate(0 150)">${truck("wtk1","VALKO")}</g><g transform="translate(0 186)">${truck("wtk2","VALKO")}</g>`}
  else if(k==="obchod"||k==="ceo"&&false){s+=field+`<g transform="translate(300 92)"><rect x="0" y="10" width="22" height="58" fill="#cbd5e1"/><ellipse cx="11" cy="10" rx="11" ry="6" fill="#94a3b8"/><rect x="26" y="0" width="26" height="68" fill="#e2e8f0"/><ellipse cx="39" cy="0" rx="13" ry="7" fill="#94a3b8"/><text x="4" y="45" font-size="7" font-weight="800" fill="#3f6212" font-family="sans-serif">ERNTE</text></g><g transform="translate(0 156)">${combine()}</g>`}
  else if(k==="trus"){s+=`<rect x="0" y="150" width="400" height="32" fill="#65a30d"/>`+road+`<g transform="translate(250 100)"><path d="M0 30 L40 6 L80 30 V58 H0Z" fill="#b91c1c"/><rect x="30" y="34" width="20" height="24" fill="#7f1d1d"/><path d="M-4 31 L40 4 L84 31" stroke="#f8fafc" stroke-width="3" fill="none"/></g>
    ${[0,1,2,3,4].map(i=>`<g class="when" style="animation-delay:${i*.3}s" transform="translate(${150+i*18} 166)"><ellipse rx="6" ry="5" fill="#f8fafc"/><circle cx="5" cy="-5" r="3" fill="#f8fafc"/><path d="M6 -8 l2 -2 l1 2z" fill="#dc2626"/><path d="M8 -5 l3 1 l-3 1z" fill="#f59e0b"/></g>`).join("")}
    <g transform="translate(0 186)">${truck("wtk1","VALKO")}</g>`}
  else if(k==="evid"){s+=field+`<g transform="translate(250 100)"><rect x="0" y="0" width="90" height="56" rx="6" fill="#f8fafc" opacity=".92"/>${[0,1,2,3].map(i=>`<rect x="${10+i*20}" y="12" width="14" height="38" rx="2" fill="${["#3f6212","#1e2a71","#b45309","#7c3aed"][i]}"/>`).join("")}</g>
    ${[0,1,2].map(i=>`<g class="wdoc" style="animation-delay:${i*1.2}s"><rect x="60" y="40" width="18" height="24" rx="2" fill="#fff" stroke="#cbd5e1"/><line x1="64" y1="48" x2="74" y2="48" stroke="#94a3b8"/><line x1="64" y1="53" x2="74" y2="53" stroke="#94a3b8"/></g>`).join("")}<g transform="translate(0 156)">${combine()}</g>`}
  else{s+=field+`<g transform="translate(0 154)">${combine()}</g>`+(k==="farmar"||k==="ja"||k==="ceo"?`<g transform="translate(0 112)">${tractor()}</g>`:"")+(k==="ja"||k==="ceo"?`<rect x="0" y="198" width="400" height="22" fill="#374151"/><g transform="translate(0 194) scale(.7)">${truck("wtk2","VALKO")}</g>`:"")}
  return s+`</svg>`}

/* ---------- údaje do pozdravu ---------- */
async function facts(k){const L=[];try{const S=typeof STATE!=="undefined"?STATE:{};const t=today();
  if(k==="ja"||k==="ceo"||k==="obchod"){const n=(S.requests||[]).filter(r=>r.status==="nova").length;if(n)L.push(`📥 <b>${n}</b> ${n===1?"nová požiadavka":n<5?"nové požiadavky":"nových požiadaviek"}`)}
  if(k==="ja"||k==="ceo"||k==="obchod"||k==="doprava"){const rem=(S.deals||[]).filter(d=>!["zrusena","zruseny","uzavrety","hotovo"].includes(d.status)).reduce((a,d)=>a+Math.max(0,(+d.tons||0)-(+d.delivered_t||0)),0);if(rem>0)L.push(`🚚 <b>${Math.round(rem).toLocaleString("sk-SK")} t</b> zostáva vyviezť`)}
  if(k==="ja"||k==="ceo"||k==="doprava"){const tr=(S.trips||[]).filter(x=>x.day===t);if(tr.length)L.push(`🛣️ <b>${tr.length}</b> ${tr.length===1?"jazda":tr.length<5?"jazdy":"jázd"} dnes`)}
  if(k==="farmar"){const P=(S.prices||[]).filter(p=>p.price!=null).sort((a,b)=>b.price-a.price)[0];if(P)L.push(`🌾 Najvyššia výkupná cena: <b>${E(typeof comName==="function"?comName(P.com):P.com)} ${(+P.price).toLocaleString("sk-SK")} €/t</b>`);
    const my=(S.deals||[]).filter(d=>!["zrusena","zruseny"].includes(d.status));if(my.length)L.push(`📄 ${my.length} ${my.length===1?"obchod":my.length<5?"obchody":"obchodov"} s ERNTE`)}
  if(k==="ja"){const r=await sb.from("owner_cal").select("title,start_at,place").eq("done",false).gte("start_at",new Date().toISOString()).order("start_at",{ascending:true}).limit(1);
    const e=r.data&&r.data[0];if(e){const d=new Date(e.start_at);const dd=d.toLocaleDateString("sv-SE")===t?"dnes":d.toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"numeric"});L.push(`📅 ${E(dd)} ${d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})} · <b>${E(e.title)}</b>${e.place?" · "+E(e.place):""}`)}
    const m=await sb.from("meet_req").select("id").eq("status","nova").gte("start_at",new Date().toISOString());if(m.data&&m.data.length)L.push(`📩 <b>${m.data.length}</b> ${m.data.length===1?"žiadosť":"žiadosti"} o stretnutie čaká na teba`)}
 }catch(x){}return L}

/* ---------- zobrazenie ---------- */
async function show(force){const k=kind();if(!k)return;if(!force&&(sGet(SKEY)||lGet(DKEY)===today()||window.ERNTE_TEST||window.ERNTE_VIEWAS))return;sSet(SKEY,"1");
  const ph=phase();const nm=k==="farmar"?(FARMER.name||""):k==="trus"?"":firstName((typeof ME!=="undefined"&&ME&&ME.staffName)||"");
  const who=k==="ja"?"Martin":nm;const g=`${GREET[ph]}${who?", "+E(who):""}!`;
  const FL=FUN[k]||FUN.tim;let ji=Math.floor(Date.now()/864e5)%FL.length;
  const sub=k==="ja"?FL[ji]:(ROLE_TXT[k]||ROLE_TXT.tim)[1];const joke=k==="ja"?"":FL[ji];
  const tag=k==="ja"?"majiteľ · ERNTE · VALKO":(ROLE_TXT[k]||ROLE_TXT.tim)[0];
  const el=document.createElement("div");el.className="wlc "+ph;el.setAttribute("role","dialog");el.setAttribute("aria-label","Úvod");
  const por=innerHeight>innerWidth*1.1;if(por)el.classList.add("por");
  el.innerHTML=`${scene(k,ph,por)}<div class="wlb"><img src="icon-192.png" alt=""><div class="wlt"><small>${E(tag)}</small><b>${g}</b><p>${E(sub)}</p>${joke?`<p class="wjk">😄 <span>${E(joke)}</span></p>`:""}<ul class="wlf"></ul>
   <div class="wla"><button type="button" class="lime" data-wlgo>Poďme na to →</button><button type="button" class="wmore" data-wljoke>😂 Ďalší vtip</button><button type="button" class="wloff" data-wloff>Dnes už neukazovať</button></div></div></div>
   <div class="wltap">${new Date().toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"long"})}</div>`;
  document.body.appendChild(el);document.documentElement.classList.add("wlon");requestAnimationFrame(()=>el.classList.add("in"));
  const f=await facts(k);const ul=el.querySelector(".wlf");if(ul&&f.length)ul.innerHTML=f.map(x=>`<li>${x}</li>`).join("");
  el.addEventListener("click",ev=>{if(ev.target.closest("[data-wloff]")){lSet(DKEY,today());close(el);return}
    if(ev.target.closest("[data-wljoke]")){ji=(ji+1)%FL.length;let p=el.querySelector(".wjk span");if(!p){el.querySelector(".wlt p").insertAdjacentHTML("afterend",`<p class="wjk">😄 <span></span></p>`);p=el.querySelector(".wjk span")}p.textContent=FL[ji];p.parentNode.classList.remove("pop");void p.parentNode.offsetWidth;p.parentNode.classList.add("pop");return}
    if(ev.target.closest(".wcomb,.wtrac,.wtk1,.wtk2,.when")){const g=ev.target.closest(".wcomb,.wtrac,.wtk1,.wtk2,.when");g.classList.add("wboost");setTimeout(()=>g.classList.remove("wboost"),1500);honk(g.classList.contains("when"));confetti(el,ev.clientX,ev.clientY);if(navigator.vibrate)try{navigator.vibrate(30)}catch(x){}return}
    if(ev.target.closest("[data-wlgo]")||!ev.target.closest(".wlb"))close(el)})}
let AC=null;function honk(chick){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime;
  const tone=(f,a,b,type)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type||"square";o.frequency.setValueAtTime(f,t+a);if(chick)o.frequency.exponentialRampToValueAtTime(f*1.8,t+b);g.gain.setValueAtTime(0,t+a);g.gain.linearRampToValueAtTime(.08,t+a+.02);g.gain.linearRampToValueAtTime(0,t+b);o.connect(g);g.connect(AC.destination);o.start(t+a);o.stop(t+b+.02)};
  if(chick){tone(700,0,.12,"triangle");tone(900,.16,.3,"triangle")}else{tone(392,0,.22);tone(330,.26,.5)}}catch(x){}}
function confetti(el,x,y){const em=["🌾","🌾","🌻","✨","🟡"];for(let i=0;i<12;i++){const d=document.createElement("span");d.className="wcf";d.textContent=em[i%em.length];d.style.left=x+"px";d.style.top=y+"px";
  d.style.setProperty("--dx",(Math.random()*240-120)+"px");d.style.setProperty("--dy",(-80-Math.random()*160)+"px");el.appendChild(d);setTimeout(()=>d.remove(),1100)}}
function close(el){el.classList.remove("in");el.classList.add("out");document.documentElement.classList.remove("wlon");setTimeout(()=>el.remove(),380)}
window.ernteWelcome=()=>show(true);
document.addEventListener("click",e=>{const i=e.target.closest&&e.target.closest("header.top img");if(i&&kind()){e.preventDefault();show(true)}});
function css(){const s=document.createElement("style");s.textContent=`
.wlc{position:fixed;inset:0;z-index:30000;display:flex;flex-direction:column;justify-content:flex-end;background:#0b1020;opacity:0;transition:opacity .35s ease;overflow:hidden}
.wlc.in{opacity:1}.wlc.out{opacity:0}
html.wlon,html.wlon body{overflow:hidden}
.wsvg{position:absolute;inset:0;width:100%;height:100%}
.wimg{position:absolute;inset:0;background:#668921 center top/cover no-repeat;animation:wkb 18s ease-in-out infinite alternate}
@keyframes wkb{from{transform:scale(1)}to{transform:scale(1.08)}}
.wlc.por .wimg{position:relative;inset:auto;flex:1 1 auto;min-height:44vh}
.wlc.por{--x0:20px;--x1:330px;background:#14210a}.wlc.por .wsvg{position:relative;inset:auto;flex:1 1 auto;min-height:34vh;height:auto}
.wlc.por .wlb{margin-top:-46px}
.wlc.por .wcomb{animation-duration:11s}.wlc.por .wcut{animation-duration:11s}.wlc.por .wtrac{animation-duration:9s}.wlc.por .wtk1{animation-duration:6s}.wlc.por .wtk2{animation-duration:7.5s}.wlc.por .wlane{--x0:-40px;--x1:0px;animation-duration:1.2s}
.wlb{position:relative;margin:0 auto calc(18px + env(safe-area-inset-bottom,0px));width:min(560px,calc(100% - 28px));display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:start;padding:16px;max-height:62vh;overflow:auto;border-radius:26px;
  background:rgba(11,16,32,.72);-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);border:1px solid rgba(255,255,255,.18);box-shadow:0 24px 60px rgba(0,0,0,.45);color:#f1f5ff;transform:translateY(30px);transition:transform .5s cubic-bezier(.2,.8,.2,1) .1s}
.wlc.in .wlb{transform:none}
.wlb img{width:48px;height:48px;border-radius:16px;background:#fff}
.wlt small{display:block;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#b6ff3b;font-weight:700}
.wlt>b{display:block;font-size:1.6rem;letter-spacing:-.03em;line-height:1.15;margin:2px 0 4px}
.wlt p{margin:0;color:#c9d1e3;font-size:.95rem;line-height:1.45}
.wlf{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:5px}.wlf li{font-size:.86rem;line-height:1.35;padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)}
.wla{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}.wla .lime{min-height:46px;padding:0 16px;font-size:.98rem}.wjk{margin-top:8px!important;padding:8px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(182,255,59,.14),rgba(94,234,212,.08));border:1px solid rgba(182,255,59,.3);color:#f1f5ff!important}
.wjk.pop{animation:wpop .35s cubic-bezier(.2,.8,.2,1)}@keyframes wpop{0%{transform:scale(.94);opacity:.4}100%{transform:none;opacity:1}}
.wmore{min-height:46px;padding:0 10px;font-size:.86rem}
.wcf{position:fixed;z-index:30001;pointer-events:none;font-size:22px;animation:wcfa 1.1s ease-out forwards}
@keyframes wcfa{0%{transform:translate(-50%,-50%) scale(.6);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy) + 160px)) rotate(240deg) scale(1);opacity:0}}
.wcomb,.wtrac,.wtk1,.wtk2,.when{cursor:pointer}
.wloff{background:none!important;border:0!important;box-shadow:none!important;color:#a7b1c6;font-weight:500;font-size:.8rem;min-height:40px}
.wltap{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:0;right:0;text-align:center;color:rgba(255,255,255,.85);font-weight:600;font-size:.85rem;text-transform:capitalize;text-shadow:0 1px 6px rgba(0,0,0,.4)}
@keyframes wdrive{from{transform:translateX(var(--x0,-140px))}to{transform:translateX(var(--x1,470px))}}
@keyframes wback{from{transform:translateX(var(--x1,460px))}to{transform:translateX(var(--x0,-140px))}}
@keyframes wcut{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes wspin{to{transform:rotate(360deg)}}
@keyframes wpuff{0%{opacity:.8;transform:translate(0,0) scale(.6)}100%{opacity:0;transform:translate(-26px,-14px) scale(1.4)}}
@keyframes wcloud{from{transform:translateX(-60px)}to{transform:translateX(60px)}}
@keyframes wtw{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes wpeck{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes wdocf{0%{transform:translate(0,0);opacity:0}15%{opacity:1}100%{transform:translate(230px,70px) scale(.5);opacity:0}}
@keyframes wbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}
.wcomb{animation:wdrive 16s linear infinite}.wcomb>rect,.wcomb>text{animation:wbob .5s ease-in-out infinite}
.wcut{transform-origin:0 0;animation:wcut 16s linear infinite}
.wtrac{animation:wback 13s linear infinite}
.wtk1{animation:wdrive 9s linear infinite}.wtk2{animation:wback 11s linear infinite}
.wsp{animation:wspin 1s linear infinite;transform-box:fill-box;transform-origin:center}
.wdust circle{animation:wpuff 1.2s ease-out infinite}.wdust circle:nth-child(2){animation-delay:.4s}.wdust circle:nth-child(3){animation-delay:.8s}
.wcl{animation:wcloud 30s ease-in-out infinite alternate}
.wstars circle{animation:wtw 3s ease-in-out infinite}
.when{animation:wpeck .8s ease-in-out infinite}
.wdoc{animation:wdocf 3.6s ease-in infinite}
.wlane{animation:wback 6s linear infinite}
.wboost{animation-duration:3s!important}
@media (prefers-reduced-motion:reduce){.wlc *{animation:none!important}}
@media (min-width:900px){.wlb{margin-bottom:48px}}`;document.head.appendChild(s)}
css();
let tries=0;const t=setInterval(()=>{tries++;const app=document.getElementById("app");
  if(kind()&&app&&app.children.length&&!document.querySelector(".pinmod")){clearInterval(t);setTimeout(()=>show(false),600)}
  if(tries>120)clearInterval(t)},500);
})();
