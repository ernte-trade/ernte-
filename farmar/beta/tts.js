// ===== 🔊 ČÍTANIE NAHLAS – spoľahlivo aj na iPhone (31. 10.) =====
// iOS: speechSynthesis.cancel() hneď pred speak() utterance zahodí, hlasy sa načítajú neskoro a tichý režim stlmí zvuk.
// Preto: zrušiť iba keď niečo hovorí (a hovoriť o chvíľu), vybrať hlas podľa jazyka, „odomknúť“ syntézu pri prvom dotyku, hlásiť chybu.
(function(){
const S=window.speechSynthesis;let VO=[],unlocked=false;
function loadV(){try{VO=S.getVoices()||[]}catch(x){VO=[]}}
if(S){loadV();try{S.addEventListener?S.addEventListener("voiceschanged",loadV):(S.onvoiceschanged=loadV)}catch(x){}}
function pick(lang){const l=String(lang||"sk-SK").toLowerCase().replace("_","-"),b=l.slice(0,2),L=VO.filter(v=>v&&v.lang);
  return L.find(v=>v.lang.toLowerCase().replace("_","-")===l&&/premium|enhanced|laura|tünde|tunde|daniel|kate|serena/i.test(v.name))||L.find(v=>v.lang.toLowerCase().replace("_","-")===l)||L.find(v=>v.lang.toLowerCase().startsWith(b))||null}
const clean=t=>String(t||"").replace(/<[^>]+>/g," ").replace(/[\u{1F000}-\u{1FAFF}☀-➿️‍]/gu,"").replace(/\s+/g," ").trim();
const msg=t=>{if(typeof toast==="function")toast(t,6000)};
// jeden prázdny prehovor pri prvom dotyku – iOS potom dovolí hovoriť aj neskôr
document.addEventListener("touchend",()=>{if(unlocked||!S)return;unlocked=true;try{const u=new SpeechSynthesisUtterance(" ");u.volume=0;S.speak(u)}catch(x){}},{capture:true,passive:true,once:true});
window.ernteSay=function(text,lang,opt){opt=opt||{};if(!S||!window.SpeechSynthesisUtterance){msg("Tento prehliadač nevie čítať nahlas.");return false}
  const t=clean(text);if(!t)return false;if(!VO.length)loadV();
  if(opt.toggle&&(S.speaking||S.pending)){S.cancel();return false}
  // dlhý text po vetách (iOS niekedy dlhý text uprostred zastaví)
  const parts=t.match(/[^.!?]+[.!?]*/g)||[t];const v=pick(lang);let err=false;
  const go=()=>{parts.forEach((p,i)=>{const u=new SpeechSynthesisUtterance(p.trim());u.lang=lang||"sk-SK";if(v)u.voice=v;u.rate=opt.rate||(String(lang).startsWith("en")?.9:.95);u.pitch=1;u.volume=1;
      u.onerror=e=>{const c=e&&e.error;if(err||c==="interrupted"||c==="canceled")return;err=true;msg("🔇 Čítanie nefunguje ("+(c||"chyba")+"). Na iPhone vypni tichý režim (prepínač na boku) a zvýš hlasitosť.")};
      if(i===0&&opt.onstart)u.onstart=opt.onstart;if(i===parts.length-1&&opt.onend)u.onend=opt.onend;S.speak(u)});try{S.resume()}catch(x){}};
  if(S.speaking||S.pending){S.cancel();setTimeout(go,150)}else go();
  if(!v&&!opt.quiet&&!window.__ttsWarn){window.__ttsWarn=1;setTimeout(()=>{if(!S.speaking)msg("🔇 V telefóne chýba hlas pre "+(String(lang).startsWith("en")?"angličtinu":"slovenčinu")+". iPhone: Nastavenia → Prístupnosť → Hovorený obsah → Hlasy. Skontroluj aj tichý režim.")},1500)}
  return true};
window.ernteSayStop=()=>{try{S&&S.cancel()}catch(x){}};
})();
