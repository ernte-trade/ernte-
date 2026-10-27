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
function wrap(n){const o=window[n];if(typeof o!=="function"||o.__gd)return;
  const w=function(){if(inG)return o.apply(this,arguments);
    if(!isUser()){if(focusIn()||dirty()){pend={n,self:this,args:arguments};return}quiet()}
    else dirtyAt=0;
    pend=null;inG=true;try{return o.apply(this,arguments)}finally{inG=false}};
  Object.keys(o).forEach(k=>{try{w[k]=o[k]}catch(x){}});w.__gd=1;window[n]=w}
const N=["renderStaff","renderFarmer"];const tk=setInterval(()=>N.forEach(wrap),300);setTimeout(()=>clearInterval(tk),120000);N.forEach(wrap);
// odložené prekreslenie, keď už nepíšeš
setInterval(()=>{if(!pend||focusIn()||dirty()||isUser())return;const p=pend;pend=null;quiet();inG=true;try{window[p.n].apply(p.self,p.args)}catch(x){}finally{inG=false}},1500);
window.screenGuard={pending:()=>!!pend,dirty:()=>!!dirty()};
})();
