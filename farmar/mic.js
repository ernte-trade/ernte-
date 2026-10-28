// ===== 🎤 MIKROFÓN – spoločné pre Kalendár (pripomienky) a Uzatvoriť obchod (nadiktovanie zmluvy) =====
// 1) micReady(): pred rozpoznávaním reči si vypýta povolenie mikrofónu (systémové okno) a pri chybe povie presne, čo urobiť.
//    Samsung / Android v aplikácii z plochy často rozpoznávanie reči ticho odmietne, kým stránka nemá povolený mikrofón.
// 2) micRecord(): nahrávanie hlasovky priamo v aplikácii (MediaRecorder) – netreba záznamník v telefóne
//    (Samsung pri <input capture> často neotvorí nič).
(function(){
const T=(m,t)=>{if(typeof toast==="function")toast(m,t||7000)};
const ANDR=/Android/i.test(navigator.userAgent),IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const STD=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
function howTo(){if(IOS)return "Na iPhone: Nastavenia → Safari → Mikrofón → Povoliť (alebo aA v adresnom riadku → Nastavenia webovej stránky → Mikrofón).";
  if(ANDR&&STD())return "Na Samsungu: podrž ikonu ERNTE na ploche → ⓘ Informácie o aplikácii → Povolenia → Mikrofón → Povoliť. Ak tam nie je, otvor Chrome → ⋮ → Nastavenia → Nastavenia lokality → Mikrofón → ernte-trade.github.io → Povoliť.";
  if(ANDR)return "V prehliadači ťukni na 🔒 / ⓘ vedľa adresy → Povolenia → Mikrofón → Povoliť a skús znova.";
  return "V prehliadači klikni na 🔒 vedľa adresy → Mikrofón → Povoliť a skús znova."}
window.micHow=howTo;
const MSG={NotAllowedError:()=>"🎤 Mikrofón je pre ERNTE zakázaný. "+howTo(),SecurityError:()=>"🎤 Mikrofón je zakázaný. "+howTo(),
  NotFoundError:()=>"🎤 Telefón nenašiel mikrofón.",NotReadableError:()=>"🎤 Mikrofón práve používa iná aplikácia (hovor, Spotify, diktafón, Google asistent). Zastav ju a skús znova.",
  AbortError:()=>"🎤 Mikrofón sa nespustil – skús znova.",OverconstrainedError:()=>"🎤 Mikrofón sa nespustil – skús znova."};
window.micErr=x=>(MSG[x&&x.name]||(()=>"🎤 Mikrofón sa nespustil ("+(x&&(x.message||x.name)||x)+")."))();
/* chyby rozpoznávania reči (SpeechRecognition.onerror) → zrozumiteľná veta; null = netreba hlásiť */
window.srErr=e=>({"not-allowed":"🎤 Mikrofón je pre ERNTE zakázaný. "+howTo(),"service-not-allowed":"🎤 Rozpoznávanie reči je v tomto prehliadači vypnuté. Otvor ERNTE v Chrome, alebo nadiktuj cez 🎤 na klávesnici.",
  "audio-capture":"🎤 Mikrofón sa nedá použiť – drží ho iná aplikácia (hovor, Spotify, diktafón). Zastav ju a skús znova.","network":"🎤 Rozpoznávanie reči potrebuje internet (Google). Skontroluj pripojenie alebo nadiktuj cez 🎤 na klávesnici.",
  "language-not-supported":"🎤 Telefón nevie rozpoznávať slovenčinu. V Nastaveniach → Google → Hlas pridaj Slovenčinu, alebo nadiktuj cez klávesnicu."})[e]||null;

async function perm(){try{if(navigator.permissions&&navigator.permissions.query){const p=await navigator.permissions.query({name:"microphone"});return p.state}}catch(x){}return "prompt"}
/* povolenie mikrofónu: ak už je, vráti true hneď; inak ukáže systémové okno. Pri zlyhaní ukáže návod a vráti false. */
window.micReady=async function(){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return true; // starý prehliadač – nech to skúsi rozpoznávanie samo
  if(await perm()==="granted")return true;
  try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop());await new Promise(r=>setTimeout(r,250));return true}
  catch(x){T(micErr(x),12000);return false}};

/* ---- nahrávanie hlasovky v aplikácii ---- */
const pick=()=>{if(!window.MediaRecorder)return null;for(const t of["audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"])try{if(MediaRecorder.isTypeSupported(t))return t}catch(x){}return ""};
window.micCanRecord=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder);
let R=null;
window.micRecord=function(max){max=max||300;return new Promise(async res=>{if(R){res(null);return}
  if(!micCanRecord()){res(null);return}
  let st;try{st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}catch(x){T(micErr(x),12000);res(null);return}
  const type=pick(),rec=new MediaRecorder(st,Object.assign({audioBitsPerSecond:48000},type?{mimeType:type}:{})),ch=[];css();
  const box=document.createElement("div");box.className="mrc";box.setAttribute("role","dialog");box.setAttribute("aria-label","Nahrávanie hlasovky");
  box.innerHTML=`<div class="mrcb"><div class="mrcd"><i></i><b>Nahrávam…</b><span class="mrct">0:00</span></div><canvas class="mrcv" width="300" height="48" aria-hidden="true"></canvas><small>Hovor pokojne, max. ${Math.round(max/60)} min.</small><div class="mrca"><button type="button" class="mrcx">Zrušiť</button><button type="button" class="mrcs pri">⏹ Hotovo</button></div></div>`;
  document.body.appendChild(box);R={rec,st};const t0=Date.now();let cancel=false,raf=0,ac=null;
  try{ac=new (window.AudioContext||window.webkitAudioContext)();const an=ac.createAnalyser();an.fftSize=256;ac.createMediaStreamSource(st).connect(an);const d=new Uint8Array(an.frequencyBinCount),cv=box.querySelector("canvas"),g=cv.getContext("2d");
    const draw=()=>{an.getByteFrequencyData(d);g.clearRect(0,0,300,48);const n=40;for(let i=0;i<n;i++){const v=d[Math.floor(i*d.length/n/1.6)]/255,h=Math.max(3,v*44);g.fillStyle=`rgba(${182-i*2},${255-i},${59+i*4},.9)`;g.fillRect(i*7.5+1,24-h/2,5,h)}raf=requestAnimationFrame(draw)};draw()}catch(x){}
  const tick=setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);const e=box.querySelector(".mrct");if(e)e.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0");if(s>=max)stop()},250);
  function end(){clearInterval(tick);cancelAnimationFrame(raf);try{ac&&ac.close()}catch(x){}st.getTracks().forEach(t=>t.stop());box.remove();R=null}
  function stop(){if(rec.state!=="inactive")try{rec.stop()}catch(x){end();res(null)}}
  rec.ondataavailable=e=>{if(e.data&&e.data.size)ch.push(e.data)};
  rec.onstop=()=>{end();if(cancel||!ch.length){res(null);return}const mt=(rec.mimeType||type||"audio/webm").split(";")[0];const b=new Blob(ch,{type:mt});
    const ext=/mp4/.test(mt)?"m4a":/ogg/.test(mt)?"ogg":"webm";res(new File([b],"hlasovka-"+new Date().toISOString().slice(0,16).replace(/[:T]/g,"-")+"."+ext,{type:mt}))};
  box.querySelector(".mrcs").onclick=stop;box.querySelector(".mrcx").onclick=()=>{cancel=true;stop()};
  try{rec.start(1000)}catch(x){end();T(micErr(x));res(null)}})};

function css(){if(document.getElementById("mrc-css"))return;const s=document.createElement("style");s.id="mrc-css";s.textContent=`
.mrc{position:fixed;inset:0;z-index:31000;display:grid;place-items:end center;padding:16px 16px calc(24px + env(safe-area-inset-bottom,0px));background:rgba(3,6,15,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.mrcb{width:min(420px,100%);display:grid;font:400 .95rem/1.4 var(--f-ui,system-ui);gap:10px;padding:18px;border-radius:24px;color:#f1f5ff;background:linear-gradient(150deg,rgba(30,36,58,.95),rgba(12,16,30,.97));border:1px solid rgba(165,243,252,.35);box-shadow:0 24px 60px rgba(0,0,0,.6)}
.mrcd{display:flex;align-items:center;gap:10px;font-size:1rem}
.mrcd i{width:12px;height:12px;border-radius:50%;background:#ff4d6d;box-shadow:0 0 0 0 rgba(255,77,109,.6);animation:mrcp 1.2s infinite}
.mrct{margin-left:auto;font:700 1.1rem var(--f-num,system-ui);font-variant-numeric:tabular-nums}
.mrcv{width:100%;height:48px}
.mrcb small{color:#a7b1c6}
.mrca{display:grid;grid-template-columns:1fr 2fr;gap:8px}
.mrca button{min-height:48px;border-radius:14px;font:700 .95rem var(--f-ui,system-ui);cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit}
.mrca .mrcs{background:linear-gradient(135deg,#b6ff3b,#5eead4);color:#06110a;border:0}
@keyframes mrcp{70%{box-shadow:0 0 0 10px rgba(255,77,109,0)}100%{box-shadow:0 0 0 0 rgba(255,77,109,0)}}
@media (prefers-reduced-motion:reduce){.mrcd i{animation:none}}`;document.head.appendChild(s)}
})();
