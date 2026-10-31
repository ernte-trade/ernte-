// ===== ERNTE · POKOJNÁ OBRAZOVKA (bez blikania, bez vyhadzovania z formulárov) =====
// Viaceré časti aplikácie si na pozadí obnovujú údaje (návrat do aplikácie, každú minútu…) a prekresľujú obrazovku.
// Tento strážca:
//  1. kým píšeš do políčka alebo máš rozpísaný formulár, obnovenie na pozadí počká (nič sa nezmaže, kurzor zostane),
//     a prekreslí sa až potom, keď formulár odošleš alebo z neho odídeš;
//  2. obnovenie na pozadí ide bez animácií – karty už neblikajú;
//  3. čo urobíš ty (ťuknutie, záložka, uloženie), ide hneď ako doteraz.
(function(){
const H=document.documentElement;let lastU=0,dirtyAt=0,pend=null,inG=false,qt=0;
const st=document.createElement("style");st.textContent=`html.qr *,html.qr *::before,html.qr *::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}`;document.head.appendChild(st);
const user=()=>{lastU=Date.now()};
["pointerdown","keydown","click","change"].forEach(k=>document.addEventListener(k,user,true));
const field=el=>el&&el.closest&&el.closest("#app, .hsheet, #cxMod")&&/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)&&!/^(checkbox|radio|button|submit|reset|file|range|color)$/i.test(el.type||"");
document.addEventListener("input",ev=>{user();const t=ev.target;if(field(t)&&t.closest("form")&&!/^(fq|tq|q)$/i.test(t.id||"")&&t.type!=="search")dirtyAt=Date.now()},true);
document.addEventListener("submit",()=>{user();dirtyAt=0},true);
const focusIn=()=>field(document.activeElement);
const dirty=()=>dirtyAt&&Date.now()-dirtyAt<3*60e3&&!!document.querySelector("#app form");
const isUser=()=>Date.now()-lastU<1500;
function quiet(){H.classList.add("qr");clearTimeout(qt);qt=setTimeout(()=>H.classList.remove("qr"),900)}
// 31. 10. PRÍKAZ MAJITEĽA: „keď sa niečo obnovuje, radšej všade live zastav“ – u každého používateľa.
// Obnovenie na pozadí tej istej obrazovky, keď sa 20 s ničoho nedotkneš, obrazovku NEPREKRESLÍ: údaje sa načítajú potichu
// a dole sa ukáže „🔄 Nové údaje · zobraziť“. Prekreslí sa po ťuknutí naň, pri prepnutí záložky alebo po návrate do aplikácie.
let bgp=null,shownK="",bootT=Date.now();
const scrK=()=>(typeof FARMER!=="undefined"&&FARMER?"f:":"s:")+(typeof TAB!=="undefined"?TAB:"")+":"+(window.FTAB||"");
const idle=()=>Date.now()-lastU>20e3&&Date.now()-bootT>20e3;
const loading=()=>{const a=document.getElementById("app");return !a||!a.children.length||/Načítavam/.test((a.textContent||"").slice(0,4000))};
const wlOpen=()=>{const w=document.querySelector(".wlc");return !!(w&&w.isConnected&&getComputedStyle(w).display!=="none")};
function pill(on){let b=document.getElementById("ernNew");
  if(!on){if(b)b.remove();return}
  if(!b){b=document.createElement("button");b.type="button";b.id="ernNew";b.textContent="🔄 Nové údaje · zobraziť";
    b.style.cssText="position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));z-index:29000;border:0;border-radius:999px;padding:11px 18px;font:600 .92rem/1.1 inherit;color:#fff;background:linear-gradient(135deg,#0f766e,#2563eb);box-shadow:0 8px 24px rgba(2,6,23,.35);max-width:calc(100vw - 32px);white-space:nowrap";
    b.onclick=()=>{user();applyBg()};document.body.appendChild(b)}}
function applyBg(){const p=bgp;bgp=null;pill(false);if(!p)return;quiet();inG=true;try{window[p.n].apply(p.self,p.args)}catch(x){}finally{inG=false}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){bootT=Date.now();if(bgp&&!focusIn()&&!dirty())applyBg()}});
function wrap(n){const o=window[n];if(typeof o!=="function"||o.__gd)return;
  const w=function(){if(inG)return o.apply(this,arguments);
    if(!isUser()){if(focusIn()||dirty()){pend={n,self:this,args:arguments};return}
      if(!window.ERNTE_LIVE_REDRAW&&idle()&&!document.hidden&&scrK()===shownK&&!loading()&&!wlOpen()){bgp={n,self:this,args:arguments};pill(true);return}
      quiet()}
    else dirtyAt=0;
    pend=null;bgp=null;pill(false);inG=true;try{return o.apply(this,arguments)}finally{inG=false;shownK=scrK()}};
  Object.keys(o).forEach(k=>{try{w[k]=o[k]}catch(x){}});w.__gd=1;window[n]=w}
const N=["renderStaff","renderFarmer"];const tk=setInterval(()=>N.forEach(wrap),300);setTimeout(()=>clearInterval(tk),120000);N.forEach(wrap);
// odložené prekreslenie, keď už nepíšeš
setInterval(()=>{if(!pend||focusIn()||dirty()||isUser())return;const p=pend;pend=null;quiet();inG=true;try{window[p.n].apply(p.self,p.args)}catch(x){}finally{inG=false}},1500);
window.screenGuard={pending:()=>!!(pend||bgp),dirty:()=>!!dirty(),apply:applyBg};
})();
