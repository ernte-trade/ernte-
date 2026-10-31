// ===== 🎤 HLASOVÝ ASISTENT ERNTE – pre farmárov aj tím (SK / HU) =====
// Tlačidlo 🎤 dole vľavo. Rozpoznávanie reči priamo v telefóne (Web Speech API), odpoveď nahlas.
// Farmár: „predaj 30 ton repky“ → pripraví predaj (potvrdí sa ťuknutím) · „za koľko je kukurica“ → povie našu cenu ·
//         „kedy príde auto“ → povie najbližšie auto (deň, čas, ŠPZ). Maďarsky: „eladok 30 tonna repcét“, „mennyi a kukorica ára“, „mikor jön az autó“.
// Tím: „otvor cenník / obchody / požiadavky / dopravu / flotilu / počasie“, „cena repky“, „zavolaj Novák“.
// Nič neodosiela samo – predaj vždy potvrdí človek tlačidlom.
(function(){
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const IN=()=>(typeof ME!=="undefined"&&!!ME)||(typeof ROLE!=="undefined"&&!!ROLE)||(typeof FARMER!=="undefined"&&!!FARMER)||window.ERNTE_KIND==="trus";
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
const STF=()=>typeof ROLE!=="undefined"&&!!ROLE&&!isF();
const HU=()=>{try{return localStorage.getItem("ernte-lang")==="hu"||(navigator.language||"").toLowerCase().startsWith("hu")}catch(x){return false}};
const LG=()=>{const l=window.ernteLang?ernteLang():"sk";return l==="hu"?"hu-HU":l==="en"?"en-GB":l==="de"?"de-DE":"sk-SK"};
// ✍️ diktovanie do políčka: posledné políčko, do ktorého človek ťukol (do 20 s), dostane vyslovený text
let FLD=null,FLDT=0;
document.addEventListener("focusin",e=>{const t=e.target;if(t&&t.matches&&t.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not([type=password]),textarea,[contenteditable="true"]')&&!t.closest("#vaOut")){FLD=t;FLDT=Date.now();const b=document.getElementById("vaBtn");if(b)b.classList.add("vafld")}},true);
document.addEventListener("focusout",()=>{setTimeout(()=>{const b=document.getElementById("vaBtn");if(b&&!(FLD&&document.activeElement===FLD))b.classList.remove("vafld")},200)},true);
const fldOK=()=>FLD&&FLD.isConnected&&Date.now()-FLDT<20000&&!FLD.disabled&&!FLD.readOnly;
const WN={nula:0,jeden:1,jedna:1,jedno:1,dva:2,dve:2,tri:3,styri:4,pat:5,sest:6,sedem:7,osem:8,devat:9,desat:10,dvadsat:20,tridsat:30,styridsat:40,patdesiat:50,sto:100,dvesto:200,tristo:300,patsto:500,tisic:1000};
function fillFld(txt){const el=FLD;let v=String(txt).trim();const ty=(el.getAttribute("type")||"text").toLowerCase(),im=el.getAttribute("inputmode")||"";
  if(ty==="number"||/decimal|numeric/.test(im)){let n=numOf(v);if(n==null){const w=N(v).split(/\s+/).map(x=>WN[x]).filter(x=>x!=null);if(w.length)n=w.reduce((a,b)=>a+b,0)}if(n==null){say(HU()?"Nem értettem a számot.":"Nerozumela som číslo.");return}v=String(n).replace(".",",")}
  else if(ty==="date"){const m=N(v).match(/(\d{1,2})[. ]+(\d{1,2})/);const d=new Date();if(/zajtra|holnap/.test(N(v)))d.setDate(d.getDate()+1);else if(/pozajtra|holnaputan/.test(N(v)))d.setDate(d.getDate()+2);else if(m){d.setMonth(+m[2]-1,+m[1]);if(d<new Date(Date.now()-864e5))d.setFullYear(d.getFullYear()+1)}else if(!/dnes|ma\b/.test(N(v))){say("Povedzte napr. „piateho novembra“ alebo „zajtra“.");return}v=d.toLocaleDateString("sv-SE")}
  else if(ty==="time"){const m=N(v).match(/(\d{1,2})(?:[: .h]+(\d{2}))?/);if(!m){say("Povedzte čas, napr. osem tridsať.");return}v=String(+m[1]).padStart(2,"0")+":"+(m[2]||"00")}
  else if(ty==="email"){v=v.replace(/\s*(zavináč|zavinac|kukac|at)\s*/gi,"@").replace(/\s*(bodka|pont|dot)\s*/gi,".").replace(/\s+/g,"").toLowerCase()}
  else if(ty==="tel"){v=v.replace(/plus/gi,"+").replace(/[^\d+]/g,"")}
  else if(el.value&&el.tagName==="TEXTAREA")v=el.value.replace(/\s*$/,"")+" "+v;
  if(el.isContentEditable)el.textContent=v;else{const pr=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value");if(pr&&pr.set)pr.set.call(el,v);else el.value=v}
  el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));try{el.focus()}catch(x){}
  show("✍️ Vyplnené: „"+v+"“")}
// 🔎 hľadanie: políčko na hľadanie na obrazovke, inak nájde text na stránke
function search(q){q=q.trim();if(!q){say("Čo mám hľadať?");return}
  const sf=[...document.querySelectorAll('#app input[type=search],#app input[placeholder]')].find(i=>i.offsetParent&&(i.type==="search"||/hľad|hlad|keres|search|such|nájd/i.test(i.placeholder)));
  if(sf){FLD=sf;FLDT=Date.now();fillFld(q);say((HU()?"Keresem: ":"Hľadám: ")+q);return}
  if(STF()&&typeof tabOK==="function"&&tabOK("farm")&&((STATE.farmers||[]).some(f=>N(f.name).includes(N(q).split(" ")[0])))){try{FQ=q;TAB="farm";renderStaff();scrollTo(0,0)}catch(x){}say("Hľadám farmára "+q);return}
  const nq=N(q);const w=document.createTreeWalker(document.getElementById("app")||document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){if(N(n.nodeValue).includes(nq)&&n.parentElement&&n.parentElement.offsetParent){const el=n.parentElement;el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("vahit");setTimeout(()=>el.classList.remove("vahit"),3500);say((HU()?"Megtaláltam: ":"Našla som: ")+q);return}}
  say((HU()?"Nem találtam: ":"Nenašla som: ")+q)}
// komodity: slovenské aj maďarské tvary
const COM=[["repka",["repk","repce","repc"]],["kukurica",["kukuric","kukoric"]],["soja",["soj","szoja","szój"]],["lo",["slnecnic","napraforg"]],["psenica_p",["potravinar","pekar","malmi","mlyn"]],
  ["psenica_k",["krmn","takarmany"]],["psenica_k",["psenic","buza"]],["jacmen_s",["sladov","sorarpa","sor arpa"]],["jacmen_k",["jacmen","arpa"]],["cirok",["cirok","cirok","cirok","cirok"]]];
function comOf(t){const n=N(t);for(const [c,ks] of COM)if(ks.some(k=>n.includes(N(k)))){if(c==="lo"&&/\bho\b|high oleic|vysokoolej/.test(n))return "ho";return c}return null}
const numOf=t=>{const n=N(t).replace(/(\d)[ .](\d{3})/g,"$1$2");const m=n.match(/(\d+(?:[.,]\d+)?)/);if(m)return parseFloat(m[1].replace(",","."));
  const W={jeden:1,jedna:1,dva:2,dve:2,tri:3,styri:4,pat:5,sest:6,sedem:7,osem:8,devat:9,desat:10,dvadsat:20,tridsat:30,styridsat:40,patdesiat:50,sto:100,egy:1,ket:2,harom:3,negy:4,ot:5,tiz:10,husz:20,harminc:30,otven:50,szaz:100};
  for(const w of n.split(/\s+/))if(W[w]!=null)return W[w];return null};
const CN=c=>typeof comName==="function"?comName(c):c;
const fmt0=n=>(+n).toLocaleString("sk-SK",{maximumFractionDigits:2});
function say(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=(HU()||HUNOW)?"hu-HU":"sk-SK";u.rate=1.02;speechSynthesis.speak(u)}catch(x){}show(t)}
function show(t,h){const b=document.getElementById("vaOut");if(!b)return;b.innerHTML=h||E(t);b.hidden=false;clearTimeout(show.t);show.t=setTimeout(()=>{b.hidden=true},12000)}
function priceOf(c){const p=((typeof STATE!=="undefined"&&STATE.prices)||[]).find(x=>x.com===c&&x.price!=null);return p?+p.price:null}
let HUNOW=false;
function act(txt){const n=N(txt),c=comOf(txt),q=numOf(txt),hu=HU()||/elad|tonna|mikor|mennyi|\barat\b|\bara\b|kerem|auto jon/.test(n);HUNOW=hu;
  {const m=n.match(/^(hladaj|najdi|vyhladaj|keresd|keres|search|find|such[e]?)\s+(.+)$/);if(m){search(txt.replace(/^\S+\s+/,""));return}}
  if(fldOK()&&!/^(otvor|predaj|zavolaj|spat|hore|dole|nyisd|elad)\b/.test(n)){fillFld(txt.replace(/^(napis|vypln|zadaj|irjad)\s+/i,""));return}
  if(/^(spat|vrat|naspat|vissza|back|zuruck)\b/.test(n)){if(history.state&&history.state.fv)history.back();else if(isF()&&window.farmGo)farmGo("home");else if(typeof renderStaff==="function"){try{TAB="home";renderStaff()}catch(x){}}say(hu?"Vissza.":"Späť.");return}
  if(/^(hore|nahor|fel)\b/.test(n)){scrollTo({top:0,behavior:"smooth"});return}
  if(/^(dole|nadol|nizsie|le)\b/.test(n)){scrollBy({top:innerHeight*.8,behavior:"smooth"});return}
  if(isF()&&window.farmGo){const FW=[["hist",/obchod|zmluv|histor|uzlet|szerzod/],["odvoz",/odvoz|kamion|auto|szallit|fuvar/],["ceny",/cennik|ceny|arak/],["wx",/pocasi|idojaras/],["kontakt",/kontakt|obchodnik|telefon|zavolaj obchodnik|uzletkoto/]];
    if(/^(otvor|ukaz|nyisd|mutasd)/.test(n))for(const [v,rx] of FW)if(rx.test(n)){farmGo(v);say(hu?"Megnyitom.":"Otváram.");return}}
  // predaj
  if(/predaj|predat|predam|predal|elad/.test(n)&&isF()){
    if(!c){say(hu?"Melyik terményt szeretné eladni? Például: eladok 30 tonna repcét.":"Akú komoditu chcete predať? Napríklad: predaj tridsať ton repky.");return}
    const pc=priceOf(c);if(pc==null){say(hu?"Erre a terményre most nincs ár.":"Na "+CN(c)+" teraz nemáme cenu. Zavolajte ERNTE.");return}
    if(window.farmSell){farmSell(c,q);say(hu?`Előkészítettem: ${q?q+" tonna ":""}${CN(c)}. Válassza ki, mikor és hogyan szállítjuk.`:`Pripravené: ${q?q+" ton ":""}${CN(c)} za ${fmt0(pc)} eur za tonu. Vyberte úrodu a odvoz a ťuknite Odoslať.`);return}
    window.SELL=c;try{SELL=c}catch(x){}if(typeof renderFarmer==="function")renderFarmer();
    setTimeout(()=>{const f=document.getElementById("fSell");if(f){if(q)f.tons.value=q;f.scrollIntoView({behavior:"smooth",block:"center"});const b=f.querySelector("button[type=submit]");if(b)b.classList.add("vaglow")}},250);
    say(hu?`Előkészítettem: ${q?q+" tonna ":""}${CN(c)}, ${fmt0(pc)} euró tonnánként. Koppintson a Küldés gombra.`:`Pripravené: ${q?q+" ton ":""}${CN(c)} za ${fmt0(pc)} eur za tonu. Ťuknite Odoslať ERNTE.`);return}
  // cena
  if(/cen|kolko|za kolko|ar\b|ara|mennyi|arak/.test(n)&&c){const pc=priceOf(c);say(pc==null?(hu?"Erre most nincs ár.":"Na "+CN(c)+" teraz cenu nemáme."):(hu?`${CN(c)}: ${fmt0(pc)} euró tonnánként.`:`${CN(c)} dnes vykupujeme za ${fmt0(pc)} eur za tonu.`));return}
  if(/cen|cennik|arak|mennyi/.test(n)&&!c){const P=((typeof STATE!=="undefined"&&STATE.prices)||[]).filter(p=>p.price!=null).slice(0,6);
    if(!P.length){say(hu?"Az árlista most készül.":"Cenník sa práve pripravuje.");return}say((hu?"Mai áraink: ":"Dnešné ceny: ")+P.map(p=>CN(p.com)+" "+fmt0(p.price)).join(", ")+(hu?" euró tonnánként.":" eur za tonu."));
    if(STF()&&typeof tabOK==="function"&&tabOK("price")){TAB="price";renderStaff()}return}
  // auto / odvoz
  if(/auto|kamion|odvoz|pride|fuvar|jon|teherauto/.test(n)){const T=((typeof STATE!=="undefined"&&STATE.trips)||[]).filter(t=>!["vylozene","zrusena"].includes(t.status)).sort((a,b)=>String(a.day+(a.time||"")).localeCompare(String(b.day+(b.time||""))));
    if(!T.length){say(hu?"Most nincs tervezett autó. Rendeljen fuvart a szerződésnél.":"Zatiaľ nemáte naplánované auto. Odvoz objednáte pri zmluve – Objednať odvoz.");return}
    const t=T[0],d=new Date(t.day+"T12:00").toLocaleDateString(hu?"hu-HU":"sk-SK",{weekday:"long",day:"numeric",month:"long"});
    say(hu?`A következő autó ${d}${t.time?", "+t.time:""}${t.spz?", rendszám "+t.spz:""}.`:`Najbližšie auto príde ${d}${t.time?" o "+t.time:""}${t.spz?", ŠPZ "+t.spz:""}${t.driver?", vodič "+t.driver:""}.`);return}
  // zavolaj (tím)
  if(/zavolaj|volaj|telefon|hivd/.test(n)&&STF()){const F=((typeof STATE!=="undefined"&&STATE.farmers)||[]);const w=n.replace(/zavolaj|volaj|telefonuj|hivd|prosim/g,"").trim();
    const f=F.filter(f=>f.phone).map(f=>({f,s:N(f.name).split(/\s+/).filter(x=>x.length>2&&w.includes(x)).length})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s)[0];
    if(!f){say("Nenašla som farmára s týmto menom a telefónom.");return}let d=String(f.f.phone).replace(/[^\d+]/g,"");if(d.startsWith("0")&&!d.startsWith("00"))d="+421"+d.slice(1);
    show("",`📞 <b>${E(f.f.name)}</b> <a class="vacall" href="tel:${E(d)}">Volať ${E(f.f.phone)}</a>`);say("Volám "+f.f.name);setTimeout(()=>{location.href="tel:"+d},900);return}
  // otvor sekciu (tím)
  const TABW=[["price",/cennik|ceny/],["deals",/obchod|zmluv/],["req",/poziadav|ponuk/],["trans",/doprav|jazd/],["fleet",/flotil|vozidl|auta/],["wx",/pocasi|idojaras/],["farm",/farmar/],["calc",/kalkul/],["home",/prehlad|domov/]];
  if(STF()){for(const [tb,rx] of TABW)if(rx.test(n)){if(typeof tabOK==="function"&&!tabOK(tb)){say("Túto časť nemáte povolenú.");return}TAB=tb;if(typeof renderStaff==="function")renderStaff();try{scrollTo(0,0)}catch(x){}say("Otváram.");return}}
  else if(/pocasi|idojaras/.test(n)){const h=[...document.querySelectorAll("h2")].find(x=>/Počasie/.test(x.textContent));if(h)h.scrollIntoView({behavior:"smooth"});say(hu?"Itt az időjárás.":"Tu je počasie.");return}
  say(hu?"Nem értettem. Mondja például: eladok 30 tonna repcét, vagy: mikor jön az autó.":isF()?"Nerozumela som. Skúste: predaj tridsať ton repky, za koľko je kukurica, alebo kedy príde auto.":"Nerozumela som. Skúste: otvor cenník, cena repky, alebo zavolaj Novák.")}
let rec=null,on=false;
async function listen(){if(on){try{rec.stop()}catch(x){}return}
  try{if(window.micReady&&!(await micReady()))return}catch(x){}
  rec=new SR();rec.lang=LG();rec.interimResults=true;rec.maxAlternatives=3;let fin="";
  rec.onstart=()=>{on=true;btn().classList.add("on");show(fldOK()?(HU()?"✍️ Diktáljon – beírom a mezőbe…":"✍️ Diktujte – zapíšem to do políčka…"):(HU()?"🎤 Hallgatom…":"🎤 Počúvam… napr. „otvor obchody“, „hľadaj Novák“, „predaj 30 ton repky“ · ťuknite do políčka a diktujte"))};
  rec.onresult=e=>{let t="";for(const r of e.results){t+=r[0].transcript;if(r.isFinal)fin=t}show("„"+t+"“")};
  rec.onerror=e=>{on=false;btn().classList.remove("on");if(e.error!=="aborted"&&e.error!=="no-speech")show(window.srErr?srErr(e):"Mikrofón nefunguje ("+e.error+").")};
  rec.onend=()=>{on=false;btn().classList.remove("on");if(fin)act(fin)};
  try{rec.start()}catch(x){show("Mikrofón sa nepodarilo spustiť.")}}
const btn=()=>document.getElementById("vaBtn");
function mount(){if(!IN()){const b=btn();if(b)b.remove();const o=document.getElementById("vaOut");if(o)o.remove();return}
  if(btn())return;const b=document.createElement("button");b.type="button";b.id="vaBtn";b.className="vabtn";b.setAttribute("aria-label","Hlasový asistent");b.textContent="🎤";document.body.appendChild(b);
  const o=document.createElement("div");o.id="vaOut";o.className="vaout";o.hidden=true;o.setAttribute("role","status");document.body.appendChild(o);
  b.addEventListener("pointerdown",e=>{if(fldOK())e.preventDefault()});b.addEventListener("mousedown",e=>{if(fldOK())e.preventDefault()});b.addEventListener("click",listen);place()}
function place(){const b=btn(),o=document.getElementById("vaOut");if(!b)return;let off=16;try{const n=document.querySelector("#app nav.tabs");if(n){const r=n.getBoundingClientRect();if(getComputedStyle(n).position==="fixed"&&r.bottom>=innerHeight-2)off=Math.round(r.height)+12}}catch(x){}
  b.style.bottom=off+"px"}
{const s=document.createElement("style");s.textContent=`.vabtn{position:fixed;left:14px;z-index:8900;width:54px;height:54px;border-radius:50%;border:0;font-size:1.5rem;display:grid;place-items:center;padding:0;
 background:linear-gradient(135deg,#a78bfa,#22d3ee);color:#fff;box-shadow:0 8px 24px -6px rgba(124,92,255,.7)}
.vabtn.on{animation:vapul 1s ease-in-out infinite;background:linear-gradient(135deg,#f43f5e,#f59e0b)}@keyframes vapul{50%{box-shadow:0 0 0 12px rgba(244,63,94,.25)}}
.vaout{position:fixed;left:14px;right:14px;top:calc(10px + env(safe-area-inset-top,0px));margin:0 auto;z-index:8900;max-width:440px;padding:12px 14px;border-radius:16px;background:rgba(12,16,24,.96);border:1px solid rgba(167,139,250,.55);color:#eef2f7;font-size:.98rem;line-height:1.4;box-shadow:0 10px 30px -8px rgba(0,0,0,.7);overflow-wrap:anywhere}
.vaout .vacall{display:inline-block;margin-top:6px;padding:8px 14px;border-radius:12px;background:linear-gradient(135deg,#b6ff3b,#22d3ee);color:#06110a;font-weight:800;text-decoration:none}
.vabtn.vafld{background:linear-gradient(135deg,#b6ff3b,#22d3ee);box-shadow:0 0 0 4px rgba(182,255,59,.35),0 8px 24px -6px rgba(34,211,238,.7)}.vabtn.vafld::after{content:"✍️";position:absolute;right:-4px;top:-6px;font-size:.95rem}.vahit{outline:3px solid #b6ff3b;outline-offset:3px;border-radius:8px;transition:outline-color .3s}
button.vaglow{box-shadow:0 0 0 4px rgba(182,255,59,.6)!important}
@media (prefers-reduced-motion:reduce){.vabtn.on{animation:none}}`;document.head.appendChild(s)}
setInterval(()=>{mount();place()},1500);addEventListener("resize",place);
})();
