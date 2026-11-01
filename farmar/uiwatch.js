// ===== 🩺 SAMOKONTROLA VZHĽADU NA KAŽDOM TELEFÓNE (príkaz majiteľa 31. 10. 22:40 „aby som ťa nemusel kontrolovať“) =====
// Po každom prekreslení (keď sa obrazovka 2,5 s nemení) aplikácia sama skontroluje, či niečo nepretŕča doprava, či nie je orezaný obsah
// v karte (tlačidlá, graf, text), či nie je orezaný text v tlačidle, a zachytí chyby skriptov. Nájdené problémy pošle do databázy
// (ui_report → tabuľka ui_issues: obrazovka, rola, šírka displeja, čo je zle – žiadne osobné údaje). Strážca (Claude) ich každé 3 h opraví.
// Používateľ nič nevidí. Neodosiela v automatických testoch (navigator.webdriver).
(function(){
if(navigator.webdriver)return;
const SENT=new Set(),Q=[];let nSent=0,tm=0,qt=0;
const W=()=>document.documentElement.clientWidth||innerWidth;
const cls=e=>{if(!e)return "";const c=(typeof e.className==="string"?e.className:(e.className&&e.className.baseVal)||"").trim().split(/\s+/).slice(0,3).join(".");return (e.id?"#"+e.id:"")+(c?"."+c:"")||e.tagName.toLowerCase()};
const path=e=>{const p=[];for(let x=e,i=0;x&&x!==document.body&&i<3;x=x.parentElement,i++)p.unshift(cls(x));return p.join(" > ")};
const txt=e=>(e&&e.textContent||"").replace(/\s+/g," ").trim().slice(0,50);
function screen(){if(document.querySelector(".wlc"))return "uvod";if(document.querySelector("#emap:not([hidden]) .navmap"))return "navigacia";
  if(typeof FARMER!=="undefined"&&FARMER)return "farmar:"+(document.querySelector("[data-fsec].on,[data-fsec][aria-pressed=true]")?.dataset.fsec||"domov");
  if(window.K_IN_INV!=null&&window.ERNTE_KIND==="junior")return "junior";return typeof TAB!=="undefined"?String(TAB):"?"}
function role(){if(window.ERNTE_KIND==="junior")return "junior";if(typeof FARMER!=="undefined"&&FARMER)return "farmar";return typeof ROLE!=="undefined"&&ROLE?String(ROLE):"?"}
const PEND=new Map();let pass=0;
function add(kind,e,detail){const pk=kind+"|"+(e?path(e):"")+"|"+String(detail||"").replace(/\d+/g,"#").slice(0,60);if(kind!=="chyba"){const seen=PEND.get(pk);if(seen==null||seen===pass){PEND.set(pk,pass);reCheck();return}}addNow(kind,e,detail)}
let rc=0;function reCheck(){if(rc)return;rc=setTimeout(()=>{rc=0;try{check()}catch(x){}},1500)}
function addNow(kind,e,detail){const sc=screen(),k=kind+"|"+sc+"|"+(e?path(e):"")+"|"+(W()<600?"m":W()<1000?"f":"d");if(SENT.has(k)||nSent>=40)return;SENT.add(k);
  Q.push({kind,screen:sc,role:role(),w:W(),h:innerHeight,dpr:devicePixelRatio,el:e?path(e):"",text:e?txt(e):"",detail:String(detail||"").slice(0,300),
    ver:/\/beta\//.test(location.pathname)?"beta":"stable",ua:navigator.userAgent.slice(0,160)});nSent++;flush()}
function flush(){if(qt||!Q.length)return;qt=setTimeout(async()=>{qt=0;const b=Q.splice(0,20);if(!b.length)return;try{if(typeof sb!=="undefined"&&sb.rpc)await sb.rpc("ui_report",{p:b})}catch(x){}},4000)}
const skip=e=>e.closest("svg,.leaflet-container,#emMap,[data-nocut],.wscan,.ernte-ai,iframe,video,canvas,[hidden],details:not([open])")||e.tagName==="DETAILS";
const inflow=c=>{const p=getComputedStyle(c).position;return p!=="absolute"&&p!=="fixed"&&c.offsetParent!==null};
function check(){if(document.hidden)return;pass++;const w=W();
  // 1) stránka širšia ako displej
  if(document.documentElement.scrollWidth>w+1){let worst=null,wr=w;document.querySelectorAll("#app *,.wlc *").forEach(e=>{if(skip(e))return;const r=e.getBoundingClientRect();if(r.width>0&&r.right>wr+1&&inflow(e)){const p=e.parentElement&&e.parentElement.getBoundingClientRect();if(!p||p.right<=w+1){wr=r.right;worst=e}}});
    add("sirka",worst,"stránka "+document.documentElement.scrollWidth+" px > displej "+w+" px")}
  // 2) orezaný obsah v karte / riadku (in-flow dieťa vyčnieva z prvku s overflow:hidden)
  const roots=[document.getElementById("app"),...document.querySelectorAll(".wlc")].filter(Boolean);
  roots.forEach(root=>root.querySelectorAll("*").forEach(e=>{if(!e.children.length||skip(e)||!e.offsetParent)return;const cs=getComputedStyle(e);
    const oy=cs.overflowY==="hidden"||cs.overflowY==="clip",ox=cs.overflowX==="hidden"||cs.overflowX==="clip";if(!oy&&!ox)return;if((cs.maskImage&&cs.maskImage!=="none")||(cs.webkitMaskImage&&cs.webkitMaskImage!=="none")||cs.webkitLineClamp&&cs.webkitLineClamp!=="none")return; // zámerné skrátenie s prechodom / line-clamp
    const r=e.getBoundingClientRect();if(r.height<16||r.width<16||r.bottom<0||r.top>innerHeight*3)return;
    for(const c of e.children){if(!inflow(c)||skip(c))continue;const q=c.getBoundingClientRect();if(!q.width||!q.height)continue;
      if(oy&&q.bottom>r.bottom+4&&q.top<r.bottom-2){add("orezane",e,"obsah "+Math.round(q.bottom-r.top)+" px > výška "+Math.round(r.height)+" px · "+cls(c)+" «"+txt(c)+"»");break}
      if(ox&&q.right>r.right+4&&q.left<r.right-2&&cs.overflowX!=="auto"){add("orezane",e,"obsah doprava o "+Math.round(q.right-r.right)+" px · "+cls(c)+" «"+txt(c)+"»");break}}}));
  // 3) orezaný text v tlačidle (bez zámerných troch bodiek)
  roots.forEach(root=>root.querySelectorAll("button,a.btn,.chip").forEach(e=>{if(e.children.length||skip(e)||!e.offsetParent)return;const cs=getComputedStyle(e);if(cs.textOverflow==="ellipsis"||cs.overflowX==="visible")return;
    if(e.scrollWidth>e.clientWidth+2&&e.clientWidth>0)add("tlacidlo",e,"text "+e.scrollWidth+" px > "+e.clientWidth+" px")}))}
// živé hodiny / ceny menia DOM každú sekundu → nie čakať na úplný pokoj (debounce by nikdy nespustil), ale najviac raz za 4 s
let last=0;const sch=()=>{if(tm)return;tm=setTimeout(()=>{tm=0;last=Date.now();try{check()}catch(x){}},Math.max(2500,4000-(Date.now()-last)))};
addEventListener("error",ev=>{try{const f=String(ev.filename||"").split("/").pop().split("?")[0];if(!f||/extension|chrome-/.test(ev.filename||""))return;add("chyba",null,(ev.message||"")+" @ "+f+":"+(ev.lineno||0))}catch(x){}});
addEventListener("unhandledrejection",ev=>{try{const m=String(ev.reason&&(ev.reason.stack||ev.reason.message)||ev.reason||"");if(!/\.js/.test(m))return;add("chyba",null,"promise: "+m.slice(0,240))}catch(x){}});
function boot(){new MutationObserver(sch).observe(document.body,{childList:true,subtree:true});addEventListener("resize",sch);sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.ernteUiCheck=()=>{SENT.clear();check();return Q.slice()};
})();
