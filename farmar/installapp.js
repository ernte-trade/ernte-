// ===== Pridať ERNTE Trade & Logistic na plochu – po pridaní sa adresa (github) už nikde nezobrazuje =====
(function(){
const std=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
let ev=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();ev=e;sched()});
window.addEventListener("appinstalled",()=>{ev=null;try{localStorage.setItem("ernte-inst","1")}catch(x){}const c=document.querySelector(".instc");if(c)c.remove()});
const off=()=>{try{const t=+localStorage.getItem("ernte-inst-off")||0;return localStorage.getItem("ernte-inst")==="1"||Date.now()-t<3*864e5}catch(x){return false}};
function card(){return `<div class="card instc" role="region" aria-label="Pridať aplikáciu na plochu"><div class="instr"><img src="icon-192.png" alt=""><div><b>ERNTE Trade &amp; Logistic</b><small>Pridajte si aplikáciu na plochu – otvára sa jedným ťuknutím ako aplikácia, bez adresy a bez prehliadača.</small></div></div>
  ${ev?`<div class="btns"><button type="button" class="lime" data-inst>📲 Pridať na plochu</button><button type="button" data-instx>Neskôr</button></div>`:
   ios?`<ol class="insts"><li>Dole ťuknite na <b>Zdieľať</b> <span class="ishr">⬆️</span></li><li>Vyberte <b>Pridať na plochu</b> ➕</li><li>Ťuknite <b>Pridať</b> – na ploche bude ikona ERNTE</li></ol><div class="btns"><button type="button" data-instx>Rozumiem</button></div>`:
   `<ol class="insts"><li>Vpravo hore ťuknite na <b>⋮</b></li><li>Vyberte <b>Pridať na plochu</b> alebo <b>Inštalovať aplikáciu</b></li><li>Potvrďte – na ploche bude ikona ERNTE</li></ol><div class="btns"><button type="button" data-instx>Rozumiem</button></div>`}</div>`}
function inject(){if(std()||off())return;const app=document.getElementById("app");if(!app||app.querySelector(".instc"))return;
  const isF=typeof FARMER!=="undefined"&&!!FARMER,isS=typeof ROLE!=="undefined"&&!!ROLE;if(!isF&&!isS)return;
  const at=app.querySelector(".hero")||app.querySelector("nav.tabs");if(at)at.insertAdjacentHTML("afterend",card());else app.insertAdjacentHTML("afterbegin",card())}
let q=0;function sched(){if(q)return;q=requestAnimationFrame(()=>{q=0;try{inject()}catch(x){}})}
document.addEventListener("click",async e=>{const t=e.target;
  if(t.closest&&t.closest("[data-inst]")&&ev){ev.prompt();const r=await ev.userChoice.catch(()=>null);if(r&&r.outcome==="accepted"){try{localStorage.setItem("ernte-inst","1")}catch(x){}}ev=null;const c=document.querySelector(".instc");if(c)c.remove();return}
  if(t.closest&&t.closest("[data-instx]")){try{localStorage.setItem("ernte-inst-off",String(Date.now()))}catch(x){}const c=document.querySelector(".instc");if(c)c.remove()}});
function start(){const app=document.getElementById("app");if(!app){setTimeout(start,300);return}new MutationObserver(sched).observe(app,{childList:true});sched()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
