// ===== Spodný panel sekcií vždy prilepený dole =====
// Keď sa stránka v mobile priblíži (prsty, ťuknutie do políčka), prehliadač nechá pevný panel na pôvodnom mieste a ten „chodí“ po obrazovke.
// Tu sa panel pri priblížení posunie a zmenší presne na spodok viditeľnej časti obrazovky; bez priblíženia sa nič nemení.
(function(){
const vv=window.visualViewport;if(!vv)return;let q=0;
function nav(){return document.querySelector("#app>nav.tabs:not(.trtabs)")}
function fix(){q=0;const n=nav();if(!n)return;const cs=getComputedStyle(n);if(cs.position!=="fixed"){if(n.style.transform)n.style.transform="";return}
  const s=vv.scale||1;if(Math.abs(s-1)<0.02){if(n.style.transform){n.style.transform="";n.style.transformOrigin=""}return}
  const lh=document.documentElement.clientHeight,dy=vv.offsetTop+vv.height-lh,dx=vv.offsetLeft;
  n.style.transformOrigin="0 100%";n.style.transform=`translate(${dx}px,${dy}px) scale(${1/s})`}
const sch=()=>{if(!q)q=requestAnimationFrame(fix)};
vv.addEventListener("resize",sch);vv.addEventListener("scroll",sch);window.addEventListener("scroll",sch,{passive:true});
function boot(){const a=document.getElementById("app");if(!a){setTimeout(boot,500);return}new MutationObserver(sch).observe(a,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
