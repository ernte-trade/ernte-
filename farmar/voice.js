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
const IN=()=>typeof ROLE!=="undefined"&&(!!ROLE||(typeof FARMER!=="undefined"&&!!FARMER));
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
const HU=()=>{try{return localStorage.getItem("ernte-lang")==="hu"||(navigator.language||"").toLowerCase().startsWith("hu")}catch(x){return false}};
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
  // predaj
  if(/predaj|predat|predam|predal|elad/.test(n)&&isF()){
    if(!c){say(hu?"Melyik terményt szeretné eladni? Például: eladok 30 tonna repcét.":"Akú komoditu chcete predať? Napríklad: predaj tridsať ton repky.");return}
    const pc=priceOf(c);if(pc==null){say(hu?"Erre a terményre most nincs ár.":"Na "+CN(c)+" teraz nemáme cenu. Zavolajte ERNTE.");return}
    window.SELL=c;try{SELL=c}catch(x){}if(typeof renderFarmer==="function")renderFarmer();
    setTimeout(()=>{const f=document.getElementById("fSell");if(f){if(q)f.tons.value=q;f.scrollIntoView({behavior:"smooth",block:"center"});const b=f.querySelector("button[type=submit]");if(b)b.classList.add("vaglow")}},250);
    say(hu?`Előkészítettem: ${q?q+" tonna ":""}${CN(c)}, ${fmt0(pc)} euró tonnánként. Koppintson a Küldés gombra.`:`Pripravené: ${q?q+" ton ":""}${CN(c)} za ${fmt0(pc)} eur za tonu. Ťuknite Odoslať ERNTE.`);return}
  // cena
  if(/cen|kolko|za kolko|ar\b|ara|mennyi|arak/.test(n)&&c){const pc=priceOf(c);say(pc==null?(hu?"Erre most nincs ár.":"Na "+CN(c)+" teraz cenu nemáme."):(hu?`${CN(c)}: ${fmt0(pc)} euró tonnánként.`:`${CN(c)} dnes vykupujeme za ${fmt0(pc)} eur za tonu.`));return}
  if(/cen|cennik|arak|mennyi/.test(n)&&!c){const P=((typeof STATE!=="undefined"&&STATE.prices)||[]).filter(p=>p.price!=null).slice(0,6);
    if(!P.length){say(hu?"Az árlista most készül.":"Cenník sa práve pripravuje.");return}say((hu?"Mai áraink: ":"Dnešné ceny: ")+P.map(p=>CN(p.com)+" "+fmt0(p.price)).join(", ")+(hu?" euró tonnánként.":" eur za tonu."));
    if(!isF()&&typeof tabOK==="function"&&tabOK("price")){TAB="price";renderStaff()}return}
  // auto / odvoz
  if(/auto|kamion|odvoz|pride|fuvar|jon|teherauto/.test(n)){const T=((typeof STATE!=="undefined"&&STATE.trips)||[]).filter(t=>!["vylozene","zrusena"].includes(t.status)).sort((a,b)=>String(a.day+(a.time||"")).localeCompare(String(b.day+(b.time||""))));
    if(!T.length){say(hu?"Most nincs tervezett autó. Rendeljen fuvart a szerződésnél.":"Zatiaľ nemáte naplánované auto. Odvoz objednáte pri zmluve – Objednať odvoz.");return}
    const t=T[0],d=new Date(t.day+"T12:00").toLocaleDateString(hu?"hu-HU":"sk-SK",{weekday:"long",day:"numeric",month:"long"});
    say(hu?`A következő autó ${d}${t.time?", "+t.time:""}${t.spz?", rendszám "+t.spz:""}.`:`Najbližšie auto príde ${d}${t.time?" o "+t.time:""}${t.spz?", ŠPZ "+t.spz:""}${t.driver?", vodič "+t.driver:""}.`);return}
  // zavolaj (tím)
  if(/zavolaj|volaj|telefon|hivd/.test(n)&&!isF()){const F=((typeof STATE!=="undefined"&&STATE.farmers)||[]);const w=n.replace(/zavolaj|volaj|telefonuj|hivd|prosim/g,"").trim();
    const f=F.filter(f=>f.phone).map(f=>({f,s:N(f.name).split(/\s+/).filter(x=>x.length>2&&w.includes(x)).length})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s)[0];
    if(!f){say("Nenašla som farmára s týmto menom a telefónom.");return}let d=String(f.f.phone).replace(/[^\d+]/g,"");if(d.startsWith("0")&&!d.startsWith("00"))d="+421"+d.slice(1);
    show("",`📞 <b>${E(f.f.name)}</b> <a class="vacall" href="tel:${E(d)}">Volať ${E(f.f.phone)}</a>`);say("Volám "+f.f.name);setTimeout(()=>{location.href="tel:"+d},900);return}
  // otvor sekciu (tím)
  const TABW=[["price",/cennik|ceny/],["deals",/obchod|zmluv/],["req",/poziadav|ponuk/],["trans",/doprav|jazd/],["fleet",/flotil|vozidl|auta/],["wx",/pocasi|idojaras/],["farm",/farmar/],["calc",/kalkul/],["home",/prehlad|domov/]];
  if(!isF()){for(const [tb,rx] of TABW)if(rx.test(n)){if(typeof tabOK==="function"&&!tabOK(tb)){say("Túto časť nemáte povolenú.");return}TAB=tb;if(typeof renderStaff==="function")renderStaff();try{scrollTo(0,0)}catch(x){}say("Otváram.");return}}
  else if(/pocasi|idojaras/.test(n)){const h=[...document.querySelectorAll("h2")].find(x=>/Počasie/.test(x.textContent));if(h)h.scrollIntoView({behavior:"smooth"});say(hu?"Itt az időjárás.":"Tu je počasie.");return}
  say(hu?"Nem értettem. Mondja például: eladok 30 tonna repcét, vagy: mikor jön az autó.":isF()?"Nerozumela som. Skúste: predaj tridsať ton repky, za koľko je kukurica, alebo kedy príde auto.":"Nerozumela som. Skúste: otvor cenník, cena repky, alebo zavolaj Novák.")}
let rec=null,on=false;
async function listen(){if(on){try{rec.stop()}catch(x){}return}
  try{if(window.micReady&&!(await micReady()))return}catch(x){}
  rec=new SR();rec.lang=HU()?"hu-HU":"sk-SK";rec.interimResults=true;rec.maxAlternatives=3;let fin="";
  rec.onstart=()=>{on=true;btn().classList.add("on");show(HU()?"🎤 Hallgatom…":"🎤 Počúvam… povedzte napr. „predaj 30 ton repky“")};
  rec.onresult=e=>{let t="";for(const r of e.results){t+=r[0].transcript;if(r.isFinal)fin=t}show("„"+t+"“")};
  rec.onerror=e=>{on=false;btn().classList.remove("on");if(e.error!=="aborted"&&e.error!=="no-speech")show(window.srErr?srErr(e):"Mikrofón nefunguje ("+e.error+").")};
  rec.onend=()=>{on=false;btn().classList.remove("on");if(fin)act(fin)};
  try{rec.start()}catch(x){show("Mikrofón sa nepodarilo spustiť.")}}
const btn=()=>document.getElementById("vaBtn");
function mount(){if(!IN()){const b=btn();if(b)b.remove();const o=document.getElementById("vaOut");if(o)o.remove();return}
  if(btn())return;const b=document.createElement("button");b.type="button";b.id="vaBtn";b.className="vabtn";b.setAttribute("aria-label","Hlasový asistent");b.textContent="🎤";document.body.appendChild(b);
  const o=document.createElement("div");o.id="vaOut";o.className="vaout";o.hidden=true;o.setAttribute("role","status");document.body.appendChild(o);
  b.addEventListener("click",listen);place()}
function place(){const b=btn(),o=document.getElementById("vaOut");if(!b)return;let off=16;try{const n=document.querySelector("#app nav.tabs");if(n){const r=n.getBoundingClientRect();if(getComputedStyle(n).position==="fixed"&&r.bottom>=innerHeight-2)off=Math.round(r.height)+12}}catch(x){}
  b.style.bottom=off+"px"}
{const s=document.createElement("style");s.textContent=`.vabtn{position:fixed;left:14px;z-index:8900;width:54px;height:54px;border-radius:50%;border:0;font-size:1.5rem;display:grid;place-items:center;padding:0;
 background:linear-gradient(135deg,#a78bfa,#22d3ee);color:#fff;box-shadow:0 8px 24px -6px rgba(124,92,255,.7)}
.vabtn.on{animation:vapul 1s ease-in-out infinite;background:linear-gradient(135deg,#f43f5e,#f59e0b)}@keyframes vapul{50%{box-shadow:0 0 0 12px rgba(244,63,94,.25)}}
.vaout{position:fixed;left:14px;right:14px;top:calc(10px + env(safe-area-inset-top,0px));margin:0 auto;z-index:8900;max-width:440px;padding:12px 14px;border-radius:16px;background:rgba(12,16,24,.96);border:1px solid rgba(167,139,250,.55);color:#eef2f7;font-size:.98rem;line-height:1.4;box-shadow:0 10px 30px -8px rgba(0,0,0,.7);overflow-wrap:anywhere}
.vaout .vacall{display:inline-block;margin-top:6px;padding:8px 14px;border-radius:12px;background:linear-gradient(135deg,#b6ff3b,#22d3ee);color:#06110a;font-weight:800;text-decoration:none}
button.vaglow{box-shadow:0 0 0 4px rgba(182,255,59,.6)!important}
@media (prefers-reduced-motion:reduce){.vabtn.on{animation:none}}`;document.head.appendChild(s)}
setInterval(()=>{mount();place()},1500);addEventListener("resize",place);
})();
