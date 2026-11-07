// ===== ERNTE · TEXT SA VŽDY ZMESTÍ DO DLAŽDICE (7. 11. 07:26 PRÍKAZ MAJITEĽA) =====
// „Kde presahuje text dlaždicu, zalom text, prípadne zväčši automaticky dlaždicu, ale aby v každej verzii bol na čitateľnej obrazovke a nie skrytý mimo.“
// Pre všetky prihlásenia a všetky obrazovky: veľké čísla a nápisy (písmo ≥ 15 px), ktoré vytŕčajú z dlaždice / karty / tlačidla,
// 1) sa zmenšia presne tak, aby sa zmestili (najviac na 60 % – stále čitateľné), 2) ak ani to nestačí, zalomia sa na viac riadkov
// a dlaždica sa zväčší (výška je automatická). Pri zmene šírky (Fold otvorený / zatvorený, otočenie, väčšie písmo) sa prepočíta od pôvodnej veľkosti.
// Nemení: vodorovne posúvateľné pásy (lišty, tabuľky), mapy, grafy (svg/canvas), polia formulárov, [data-nocut].
(function(){
const MIN=0.6,SKIP="input,textarea,select,svg,canvas,video,.leaflet-container,[data-nocut],.wtick,marquee";
const CAND="b,strong,span,em,i,small,h1,h2,h3,h4,p,div,button,a,label,summary,td,th";
let q=0,last=0,busy=false;
function hscroll(el){for(let p=el,n=0;p&&n<8;p=p.parentElement,n++){const s=getComputedStyle(p);if(/(auto|scroll)/.test(s.overflowX)&&p.scrollWidth>p.clientWidth+2)return true;if(p.id==="app")break}return false}
// najbližší blokový obal (inline prvky majú clientWidth 0)
function blk(el){for(let p=el.parentElement,n=0;p&&n<6;p=p.parentElement,n++){if(p.clientWidth>0)return p}return null}
// o koľko px text vytŕča z obalu (rýchlo podľa okrajov; presne s paddingom až pri podozrení)
function over(el,exact){const p=blk(el);if(!p)return 0;const r=el.getBoundingClientRect(),pr=p.getBoundingClientRect();
  let pl=0,prr=0;if(exact){const s=getComputedStyle(p);pl=(parseFloat(s.paddingLeft)||0)+(parseFloat(s.borderLeftWidth)||0);prr=(parseFloat(s.paddingRight)||0)+(parseFloat(s.borderRightWidth)||0)}
  const own=el.clientWidth>0&&el.scrollWidth>el.clientWidth+1?el.scrollWidth-el.clientWidth:0;
  return Math.max(0,r.right-(pr.right-prr)-1,(pr.left+pl)-r.left-1,own)}
function fit(el){const w=el.parentElement?Math.round(el.parentElement.clientWidth):0;
  if(el.dataset.tf0&&el.dataset.tfw!==String(w)){el.style.fontSize=el.dataset.tfs||"";el.style.whiteSpace=el.dataset.tfws||"";el.style.overflowWrap=el.dataset.tfow||"";delete el.dataset.tf0}
  if(over(el,false)<=1)return 0;   // rýchla kontrola bez štýlov
  const cs=getComputedStyle(el);if(cs.position==="fixed"||cs.position==="absolute"||cs.visibility==="hidden")return 0;
  const fs=parseFloat(cs.fontSize);if(!(fs>=15))return 0;if(hscroll(el))return 0;
  let o=over(el,true);if(o<=1)return 0;
  if(!el.dataset.tf0){el.dataset.tf0=String(fs);el.dataset.tfs=el.style.fontSize||"";el.dataset.tfws=el.style.whiteSpace||"";el.dataset.tfow=el.style.overflowWrap||""}
  el.dataset.tfw=String(w);const base=+el.dataset.tf0,wid=el.getBoundingClientRect().width||1;
  let k=Math.max(MIN,Math.min(1,(wid-o)/wid)*0.98),i=0;
  do{el.style.fontSize=(base*k).toFixed(1)+"px";o=over(el,true);k-=0.04;i++}while(o>1&&k>=MIN&&i<12);
  if(o>1){el.style.whiteSpace="normal";el.style.overflowWrap="anywhere";el.style.fontSize=(base*Math.max(MIN,0.8)).toFixed(1)+"px"}
  return 1}
function scan(root){root=root||document.getElementById("app");if(!root||busy)return 0;busy=true;let n=0;const t0=performance.now();
  try{const L=root.querySelectorAll(CAND);for(const el of L){if(!el.offsetWidth&&!el.offsetHeight)continue;
      const t=el.childElementCount;if(t>3)continue;const tx=el.textContent;if(!tx||tx.length>80||!tx.trim())continue;
      if(el.dataset.tf0===undefined&&over(el,false)<=1)continue;
      if(el.closest(SKIP))continue;
      if(t&&[...el.children].some(c=>c.clientWidth>0&&c.tagName!=="BR"&&getComputedStyle(c).display!=="inline-block"))continue;   // iba „list“ textu, nie celé karty
      n+=fit(el)}}catch(x){}
  busy=false;last=Date.now();window.__tfMs=Math.round(performance.now()-t0);return n}
function sch(){if(q)return;const wait=Math.max(120,900-(Date.now()-last));q=setTimeout(()=>{q=0;const go=()=>scan();(window.requestIdleCallback?requestIdleCallback(go,{timeout:800}):go())},wait)}
window.ernteTextFit={scan,over};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,400);return}
  new MutationObserver(sch).observe(app,{childList:true,subtree:true,characterData:true});
  addEventListener("resize",sch);try{document.fonts&&document.fonts.ready.then(sch)}catch(x){}sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
// CSS poistka: veľké čísla v dlaždiciach sa smú zalomiť medzi slovami („1,98 mil.“ / „€“), nikdy nevytŕčajú mimo
{const s=document.createElement("style");s.textContent=`html.rd .ehbc b{white-space:normal!important;overflow-wrap:break-word}.ehbc b.ehbl{white-space:normal}
.owt .owv,.owp .owpv,.ehbc b,.owl,.owps b{max-width:100%;overflow-wrap:break-word}
#rdSub>div{flex-wrap:wrap!important;overflow-x:visible!important}
#rdBar button span{overflow-wrap:normal!important;word-break:keep-all!important;hyphens:none!important;font-size:clamp(9px,2.9vw,12px)!important}`;document.head.appendChild(s)}
})();
