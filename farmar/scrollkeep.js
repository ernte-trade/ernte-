// ===== ERNTE · obrazovka neskáče =====
// Pri prekreslení tej istej záložky (obnovenie na pozadí, ťuknutie vo formulári, dočítané údaje, vložené dlaždice)
// ostane na obrazovke presne to, na čo sa práve pozeráš – aplikácia si zapamätá prvok v strede pohľadu
// a po prekreslení ho vráti na to isté miesto. Pri prepnutí záložky sa nič nemení.
(function(){
let lastKey=null,lock=0;
const key=()=>(typeof FARMER!=="undefined"&&FARMER?"f:":"s:")+(typeof TAB!=="undefined"?TAB:"")+":"+(window.FTAB||"");
const SEL=".card,section,h2,h3,.row,.btns,details,table,.wxh,.hub,.qd,.zt,.dnhero,form,li,.pend,.instc";
function sig(el){return el.tagName+"|"+(el.className||"")+"|"+String(el.textContent||"").replace(/\s+/g," ").trim().slice(0,60)}
function pick(){const app=document.getElementById("app");if(!app||window.scrollY<5)return null;
  const y=Math.min(innerHeight*0.35,220);let e=document.elementFromPoint(innerWidth/2,y);
  while(e&&e!==app&&!(e.matches&&e.matches(SEL)))e=e.parentElement;if(!e||e===app||!app.contains(e))return null;
  const S=sig(e),L=[...app.querySelectorAll(e.tagName)].filter(x=>sig(x)===S);return {S,tag:e.tagName,i:L.indexOf(e),top:e.getBoundingClientRect().top}}
function find(a){const app=document.getElementById("app");if(!app)return null;const L=[...app.querySelectorAll(a.tag)].filter(x=>sig(x)===a.S);return L[Math.min(Math.max(a.i,0),L.length-1)]||null}
function fix(a){const e=find(a);if(!e)return;const d=e.getBoundingClientRect().top-a.top;if(Math.abs(d)>1)window.scrollBy({top:d,left:0,behavior:"instant"})}
function wrap(n){const o=window[n];if(typeof o!=="function"||o.__sk)return;
  const w=function(){const k=key(),same=k===lastKey,a=same?pick():null,app=document.getElementById("app");
    if(a&&app){app.style.minHeight=app.offsetHeight+"px";document.body.style.overflowAnchor="none"}
    let r;try{r=o.apply(this,arguments)}finally{lastKey=key();
      if(a&&lastKey===k){const my=++lock;fix(a);requestAnimationFrame(()=>{if(my===lock)fix(a)});
        [80,250,600,1200].forEach(ms=>setTimeout(()=>{if(my===lock)fix(a)},ms));
        setTimeout(()=>{if(my===lock){if(app)app.style.minHeight="";document.body.style.overflowAnchor=""}},1300)}
      else if(app){app.style.minHeight="";document.body.style.overflowAnchor=""}}
    return r};
  Object.keys(o).forEach(x=>{try{w[x]=o[x]}catch(e){}});w.__sk=1;if(o.__gd)w.__gd=1;window[n]=w}
const N=["renderStaff","renderFarmer"];N.forEach(wrap);const t=setInterval(()=>N.forEach(wrap),400);setTimeout(()=>clearInterval(t),120000);
// keď sa používateľ sám posúva, nič neopravovať
["wheel","touchstart","keydown"].forEach(k=>addEventListener(k,()=>{lock++},{passive:true}));
})();
