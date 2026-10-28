// ===== ERNTE · ROZPÍSANÉ FORMULÁRE SA NESTRATIA =====
// Obrazovka sa obnovuje aj sama (návrat do aplikácie, nové údaje z databázy). Predtým sa tým zmazalo, čo človek práve písal,
// a zavreli sa rozbalené časti. Teraz sa pred každým prekreslením zapamätá obsah formulárov a otvorené časti a hneď sa vráti.
// Po úspešnom odoslaní formulára sa nevracia (formulár má byť prázdny).
(function(){
const SENT={};let lastFocus=null;
const keyOf=f=>f.id?"#"+f.id:([...f.attributes].find(a=>a.name.startsWith("data-")&&a.name!=="data-busy")||{}).name?(()=>{const a=[...f.attributes].find(a=>a.name.startsWith("data-"));return "["+a.name+"="+JSON.stringify(a.value)+"]"})():null;
const dKey=(d,i)=>d.id?"#"+d.id:(d.className||"det")+":"+((d.querySelector("summary")||{}).textContent||"").trim().slice(0,40)+":"+i;
function snap(){const app=document.getElementById("app");if(!app)return null;const F={},D={};let dirty=false;
  app.querySelectorAll("form").forEach(f=>{const k=keyOf(f);if(!k||SENT[k]&&Date.now()-SENT[k]<15000)return;const v={};let any=false;
    f.querySelectorAll("input,select,textarea").forEach(el=>{if(!el.name||el.type==="file"||el.type==="password"||el.type==="hidden")return;
      if(el.type==="checkbox"||el.type==="radio"){if(el.checked!==el.defaultChecked){v[el.name+(el.type==="radio"?"="+el.value:"")]=el.checked;any=true}}
      else if(el.tagName==="SELECT"){const di=[...el.options].findIndex(o=>o.defaultSelected);if(el.selectedIndex!==di&&!(di<0&&el.selectedIndex===0)){v[el.name]=el.value;any=true}}
      else if(el.value!==el.defaultValue){v[el.name]=el.value;any=true}});
    if(any){F[k]=v;dirty=true}});
  app.querySelectorAll("details").forEach((d,i)=>{D[dKey(d,i)]=d.open});
  const a=document.activeElement,fo=a&&a.closest&&a.closest("#app form")&&a.name?{f:keyOf(a.closest("form")),n:a.name,s:a.selectionStart,e:a.selectionEnd}:null;
  return {F,D,dirty,fo,y:scrollY}}
function restore(S){if(!S)return;const app=document.getElementById("app");if(!app)return;
  app.querySelectorAll("details").forEach((d,i)=>{const k=dKey(d,i);if(k in S.D&&S.D[k]&&!d.open)d.open=true});
  for(const [k,v] of Object.entries(S.F)){let f=null;try{f=app.querySelector("form"+k)}catch(x){}if(!f)continue;
    for(const [n,val] of Object.entries(v)){if(n.includes("=")){const [nm,vl]=n.split("=");const el=f.querySelector(`[name="${CSS.escape(nm)}"][value="${CSS.escape(vl)}"]`);if(el)el.checked=val;continue}
      const el=f.querySelector(`[name="${CSS.escape(n)}"]`);if(!el)continue;if(el.type==="checkbox")el.checked=val;else el.value=val}
    const det=f.closest("details");if(det)det.open=true}
  if(S.fo){let f=null;try{f=app.querySelector("form"+S.fo.f)}catch(x){}const el=f&&f.querySelector(`[name="${CSS.escape(S.fo.n)}"]`);
    if(el&&document.activeElement!==el){try{el.focus({preventScroll:true});if(S.fo.s!=null&&el.setSelectionRange)el.setSelectionRange(S.fo.s,S.fo.e)}catch(x){}}}
  if(S.dirty&&Math.abs(scrollY-S.y)>40)scrollTo(0,S.y)}
// ===== kým človek píše do formulára, obrazovka sa NEPREKRESLÍ na pozadí (nevyhodí z políčka, nezavrie klávesnicu) =====
// Prekreslenie vyvolané ťuknutím / uložením / výberom prebehne hneď; obnova z pozadia (nové údaje, časovače) počká,
// kým človek políčko opustí – potom sa urobí raz.
let ACT=0,ACTF=0;const PEND={};
const txt=a=>!!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&!/^(checkbox|radio|button|submit|reset|file|range|color)$/.test(a.type||"")&&a.closest&&a.closest("#app"));
const typing=()=>{const a=document.activeElement;return txt(a)||!!(a&&a.isContentEditable&&a.closest&&a.closest("#app"))};
addEventListener("click",e=>{const t=e.target;if(!e.isTrusted||txt(t)||(t&&t.closest&&t.closest("label")&&!t.closest("button,a,[data-tab]")))return;ACT=Date.now()+6000},true);
addEventListener("change",e=>{if(e.isTrusted&&e.target&&(e.target.tagName==="SELECT"||/^(checkbox|radio|date|time|file)$/.test(e.target.type||"")))ACT=Math.max(ACT,Date.now()+4000)},true);
addEventListener("submit",e=>{ACT=Math.max(ACT,Date.now()+12000)},true);
// vyhľadávacie polia mimo formulárov sa prekresľujú pri písaní zámerne
addEventListener("input",e=>{if(e.isTrusted&&e.target&&e.target.closest&&!e.target.closest("form"))ACTF=Date.now()+2500},true);
const userNow=()=>{const ev=window.event;if(ev&&ev.isTrusted&&ev.type!=="message"&&ev.type!=="visibilitychange")return true;return Date.now()<ACT||Date.now()<ACTF};
function flush(){if(typing())return;for(const n of Object.keys(PEND)){const args=PEND[n];delete PEND[n];try{window[n].apply(window,args)}catch(x){}}}
document.addEventListener("focusout",()=>setTimeout(flush,450),true);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(flush,600)});
function wrap(name){const o=window[name];if(typeof o!=="function"||o.__fk)return false;
  const w=function(){if(typing()&&!userNow()){PEND[name]=[...arguments];return}const S=snap();const r=o.apply(this,arguments);try{restore(S)}catch(x){}return r};w.__fk=1;window[name]=w;return true}
window.formFlush=flush;
// odoslaný formulár sa nevracia
document.addEventListener("submit",e=>{const f=e.target,k=f&&keyOf(f);if(!k)return;SENT[k]=Date.now();
  // keď sa formulár neprekreslil (chyba, zlý údaj), rozpísané údaje sa ďalej chránia
  const chk=()=>{if(document.body.contains(f)&&!(f.querySelector("[aria-busy=true],button[disabled]")))delete SENT[k];else if(document.body.contains(f))setTimeout(chk,1500)};setTimeout(chk,2500)},true);
// obalí renderStaff/renderFarmer, aj keď ich iný modul neskôr znova obalí
const tick=setInterval(()=>{wrap("renderStaff");wrap("renderFarmer")},500);setTimeout(()=>clearInterval(tick),60000);wrap("renderStaff");wrap("renderFarmer");
// pri písaní (otvorená klávesnica) sa spodná lišta skryje, aby neprekrývala políčka a tlačidlo Uložiť
{const st=document.createElement("style");st.textContent=`html.kbd nav.tabs:not(.trtabs){display:none!important}html.kbd #app{padding-bottom:40vh!important}#app input,#app select,#app textarea{scroll-margin-bottom:140px;scroll-margin-top:90px}
.tmmore>summary{padding:4px 0}form[data-tsave]>.btns:last-child{position:sticky;bottom:calc(92px + env(safe-area-inset-bottom,0px));z-index:6;padding:10px;margin:8px -10px 0;border-radius:18px;background:rgba(12,18,28,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 -6px 24px rgba(0,0,0,.35)}html.kbd form[data-tsave]>.btns:last-child{bottom:8px}html[data-theme=light] form[data-tsave]>.btns:last-child{background:rgba(255,255,255,.94)}.tmmore>form{overflow:visible!important;padding:4px 2px 0!important}.tmmore>form::before,.tmmore>form::after{display:none!important}`;document.head.appendChild(st)}
const kb=()=>{const a=document.activeElement,on=!!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&!/checkbox|radio|button|submit|file/.test(a.type||"")&&a.closest&&a.closest("#app"));document.documentElement.classList.toggle("kbd",on)};
document.addEventListener("focusin",kb);document.addEventListener("focusout",()=>setTimeout(kb,120));
// kým človek píše, automatické obnovenie po návrate do aplikácie počká
window.formBusy=()=>{const a=document.activeElement;if(typing())return true;if(document.querySelector("dialog[open],.modal:not([hidden]),.ovl:not([hidden])")&&a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return true;return !!(a&&a.closest&&a.closest("#app form")&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))};
})();
