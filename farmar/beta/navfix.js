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
const sch=()=>{if(!q)q=(window.ernteSoon||requestAnimationFrame)(fix)};
vv.addEventListener("resize",sch);vv.addEventListener("scroll",sch);window.addEventListener("scroll",sch,{passive:true});
function boot(){const a=document.getElementById("app");if(!a){setTimeout(boot,500);return}new MutationObserver(sch).observe(a,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
// 31. 10. (príkaz majiteľa): zvýraznenie vybranej sekcie v spodnej lište vždy presne pod tlačidlom (po vložení „Úvod“ sa posúvalo o jedno tlačidlo)
(function(){let q=0;
function sync(){q=0;document.querySelectorAll("#app>nav.tabs,#app nav.vnav").forEach(n=>{const i=n.querySelector(":scope>.ds-ind"),a=n.querySelector(':scope>button[aria-pressed="true"]');if(!i||!a)return;
  const t=`translate(${a.offsetLeft}px,${a.offsetTop}px)`;if(i.style.transform!==t)i.style.transform=t;const w=a.offsetWidth+"px",h=a.offsetHeight+"px";if(i.style.width!==w)i.style.width=w;if(i.style.height!==h)i.style.height=h})}
const sch=()=>{if(!q)q=(window.ernteSoon||requestAnimationFrame)(sync)};
function boot(){const a=document.getElementById("app");if(!a){setTimeout(boot,500);return}new MutationObserver(sch).observe(a,{childList:true,subtree:true});sch()}
addEventListener("resize",()=>setTimeout(sync,60));if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
