// ===== 🔔 UPOZORNENIA BEZ NASTAVOVANIA (6. 11. príkaz majiteľa „Zero-Configuration Policy“) =====
// Nikto si nič nenastavuje v Nastaveniach ani v telefóne:
//  • povolenie už je udelené → zariadenie sa prihlási na upozornenia samo (bez ťuknutia) a raz denne obnoví odber v databáze;
//  • povolenie ešte nebolo → systém (iOS / Android) dovolí okno „Povoliť upozornenia“ iba po ťuknutí používateľa, preto ho aplikácia
//    ukáže sama pri PRVOM ťuknutí kamkoľvek po prihlásení – stačí raz „Povoliť“. Ak ho človek zatvorí, skúsi znova najskôr o 3 dni;
//  • zakázané v systéme → aplikácia sa už nepýta (systém to nedovolí), dôležité správy ostávajú v aplikácii (karty, zvonček).
// Výnimky: Junior; iPhone mimo aplikácie na ploche (Web Push tam nefunguje); Martin na iPhone (príkaz 2. 11. – iba Galaxy Z Fold);
// Jana (príkaz 5. 11. – do mobilu nič). Poloha z telefónu sa nepýta – kamióny posielajú polohu z jednotiek Commander.
(function(){
const IN=()=>typeof sb!=="undefined"&&sb&&typeof ME!=="undefined"&&!!ME&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST&&((typeof ROLE!=="undefined"&&!!ROLE)||(typeof FARMER!=="undefined"&&!!FARMER));
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const std=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const sup=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const em=()=>String((typeof ME!=="undefined"&&ME&&ME.email)||"").toLowerCase();
const MAINE=["ernte@ernte.sk","report.valko@gmail.com"];
const skip=()=>{const e=em();if(!e||/@junior\.ernte\.sk$/.test(e))return true;if(e==="jana.valkova@ernte.sk")return true;if(ios&&MAINE.includes(e))return true;if(ios&&!std())return true;return false};
const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(x){return null}};
const b64=s=>{const p="=".repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(r,c=>c.charCodeAt(0))};
let PUB=null,busy=false;
async function pub(){if(PUB)return PUB;try{const k=await sb.rpc("push_pub");PUB=k.data&&k.data.pub||null}catch(x){}return PUB}
async function reg(){let r=await navigator.serviceWorker.getRegistration();if(!r)r=await navigator.serviceWorker.register("sw.js");await navigator.serviceWorker.ready;return r}
async function save(s){const j=s.toJSON();const r=await sb.rpc("push_sub_save",{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_ua:navigator.userAgent.slice(0,200)});if(r.error)throw r.error;LS("ernte-ap-saved",em()+"|"+Date.now())}
// povolenie udelené → prihlásiť / obnoviť odber bez ťuknutia
async function silent(){if(busy||!IN()||!sup()||skip()||Notification.permission!=="granted")return;busy=true;
  try{const r=await reg();let s=await r.pushManager.getSubscription();
    if(!s){const k=await pub();if(!k)return;s=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(k)})}
    const last=String(LS("ernte-ap-saved")||"");if(!last.startsWith(em()+"|")||Date.now()-(+last.split("|")[1]||0)>864e5)await save(s)}
  catch(x){}finally{busy=false}}
// povolenie ešte nebolo → systémové okno pri prvom ťuknutí (prehliadač ho bez ťuknutia nedovolí)
async function onTap(){if(!IN()||!sup()||skip()||Notification.permission!=="default")return;
  const last=+LS("ernte-ap-ask")||0;if(Date.now()-last<3*864e5)return;LS("ernte-ap-ask",String(Date.now()));
  try{const p=await Notification.requestPermission();if(p!=="granted")return;const k=await pub();if(!k)return;
    const r=await reg();let s=await r.pushManager.getSubscription();if(!s)s=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(k)});await save(s);
    if(typeof toast==="function")toast("✅ Upozornenia do mobilu sú zapnuté – dôležité správy vám prídu samé.",5000)}catch(x){}}
document.addEventListener("click",e=>{if(e.isTrusted)onTap()},{capture:true,passive:true});
document.addEventListener("keyup",e=>{if(e.isTrusted&&(e.key==="Enter"||e.key===" "))onTap()},{capture:true,passive:true});
setTimeout(silent,8000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(silent,3000)});
})();
