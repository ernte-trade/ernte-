// ===== Pridať ERNTE Trade & Logistic na plochu – po každom prihlásení, kým nie je aplikácia na ploche =====
// Android/Chrome/Edge/Samsung: systémové okno „Inštalovať“ jedným ťuknutím. Kde to prehliadač nedovolí (iPhone, Firefox…),
// tlačidlo otvorí presný návod pre ten prehliadač. „Neskôr“ skryje dlaždicu len do ďalšieho prihlásenia.
(function(){
const std=()=>matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||matchMedia("(display-mode: minimal-ui)").matches||navigator.standalone===true;
const UA=navigator.userAgent;
const ios=/iphone|ipad|ipod/i.test(UA)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const ipad=ios&&!/iphone|ipod/i.test(UA);
const pc=!ios&&!/Android|Mobile/i.test(UA)&&matchMedia("(pointer:fine)").matches;
const BR=ios?(/CriOS/.test(UA)?"ios-chrome":/FxiOS/.test(UA)?"ios-firefox":/EdgiOS/.test(UA)?"ios-edge":"ios-safari"):
  pc?(/Edg\//.test(UA)?"pc-edge":/Firefox/.test(UA)?"pc-firefox":/OPR\//.test(UA)?"pc-opera":/Chrome|Chromium|CrOS/.test(UA)?"pc-chrome":/Safari/.test(UA)?"mac-safari":"pc-chrome"):
  /SamsungBrowser/.test(UA)?"samsung":/EdgA|Edg\//.test(UA)?"edge":/Firefox/.test(UA)?"firefox":/OPR|Opera/.test(UA)?"opera":"chrome";
let ev=null,shown=false;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();ev=e;refresh()});
window.addEventListener("appinstalled",()=>{ev=null;try{localStorage.setItem("ernte-inst","1")}catch(x){}rm();if(typeof toast==="function")toast("✓ ERNTE Trade & Logistic je na ploche. Odteraz ju otvárajte z ikony.",6000)});
const done=()=>{try{return localStorage.getItem("ernte-inst")==="1"}catch(x){return false}};
const later=()=>{try{return sessionStorage.getItem("ernte-inst-later")==="1"}catch(x){return false}};
const rm=()=>{document.querySelectorAll(".instc").forEach(c=>c.remove())};
const STEPS={
 "ios-safari":["Dole v Safari ťuknite na <b>Zdieľať</b> <span class=\"ishr\">⬆️</span> (štvorček so šípkou)","Posuňte nižšie a vyberte <b>Pridať na plochu</b> ➕","Vpravo hore ťuknite <b>Pridať</b>"],
 "ios-chrome":["Vpravo hore ťuknite na <b>Zdieľať</b> <span class=\"ishr\">⬆️</span>","Vyberte <b>Pridať na plochu</b> ➕","Ťuknite <b>Pridať</b>"],
 "ios-edge":["Dole ťuknite na <b>⋯</b> a potom <b>Zdieľať</b> <span class=\"ishr\">⬆️</span>","Vyberte <b>Pridať na plochu</b> ➕","Ťuknite <b>Pridať</b>"],
 "ios-firefox":["Dole ťuknite na <b>☰</b> a potom <b>Zdieľať</b>","Vyberte <b>Pridať na plochu</b> ➕","Ťuknite <b>Pridať</b>"],
 "samsung":["Dole vpravo ťuknite na <b>☰</b> (tri čiarky)","Vyberte <b>Pridať stránku do</b> → <b>Domovská obrazovka</b>","Ťuknite <b>Pridať</b>"],
 "edge":["Dole v strede ťuknite na <b>☰</b> alebo <b>⋯</b>","Vyberte <b>Pridať do telefónu</b> / <b>Inštalovať aplikáciu</b>","Potvrďte <b>Inštalovať</b>"],
 "firefox":["Vpravo hore ťuknite na <b>⋮</b>","Vyberte <b>Inštalovať</b> alebo <b>Pridať na plochu</b>","Potvrďte <b>Pridať</b>"],
 "opera":["Vpravo hore ťuknite na <b>⋮</b>","Vyberte <b>Pridať na… → Domovskú obrazovku</b>","Potvrďte <b>Pridať</b>"],
 "pc-chrome":["V adresnom riadku vpravo kliknite na ikonu <b>Inštalovať</b> (monitor so šípkou ⊕)","Alebo vpravo hore <b>⋮</b> → <b>… uložiť a zdieľať</b> → <b>Inštalovať stránku ako aplikáciu</b>","Potvrďte <b>Inštalovať</b> – ikona sa objaví na ploche a v ponuke Štart"],
 "pc-edge":["V adresnom riadku vpravo kliknite na ikonu <b>Inštalovať</b> (⊕)","Alebo vpravo hore <b>⋯</b> → <b>Aplikácie</b> → <b>Inštalovať túto lokalitu ako aplikáciu</b>","Potvrďte <b>Inštalovať</b> – ikona sa objaví na ploche a v ponuke Štart"],
 "pc-opera":["Vpravo hore otvorte ponuku <b>⋮</b> / <b>O</b>","Vyberte <b>Inštalovať ERNTE…</b>","Potvrďte <b>Inštalovať</b>"],
 "pc-firefox":["Firefox na počítači aplikácie na plochu zatiaľ neinštaluje","Otvorte túto stránku v <b>Chrome</b> alebo <b>Edge</b> a kliknite <b>📲 Pridať na plochu</b>","Alebo si ju pridajte medzi záložky: <b>Ctrl + D</b>"],
 "mac-safari":["Hore v ponuke kliknite <b>Súbor</b> (alebo ikonu <b>Zdieľať</b> ⬆️)","Vyberte <b>Pridať do Docku</b>","Potvrďte <b>Pridať</b> – ERNTE bude v Docku ako aplikácia"],
 "chrome":["Vpravo hore ťuknite na <b>⋮</b> (tri bodky)","Vyberte <b>Pridať na plochu</b> alebo <b>Inštalovať aplikáciu</b>","Potvrďte <b>Inštalovať</b>"]};
function card(){return `<div class="card instc" role="region" aria-label="Pridať aplikáciu na plochu"><div class="instr"><img src="icon-192.png" alt=""><div><b>ERNTE Trade &amp; Logistic</b><small>Pridajte si aplikáciu na plochu – otvára sa jedným ťuknutím ako aplikácia, bez adresy a bez prehliadača.</small></div></div>
  <div class="btns"><button type="button" class="lime" data-inst>📲 Pridať na plochu</button><button type="button" data-instx>Neskôr</button></div><div class="insthelp" hidden></div></div>`}
function help(c){const h=c.querySelector(".insthelp");if(!h)return;h.hidden=false;
  h.innerHTML=`<b>${ios?(ipad?"Na iPade sa aplikácia pridáva takto":"Na iPhone sa aplikácia pridáva takto"):pc?"Na počítači to urobíte takto":"Váš prehliadač to robí cez ponuku"}:</b><ol class="insts">${STEPS[BR].map(s=>`<li>${s}</li>`).join("")}</ol><div class="s">${pc?"Potom bude ikona <b>ERNTE</b> na ploche / v Docku – otvára sa vo vlastnom okne.":"Na ploche potom bude ikona <b>ERNTE</b>. Aplikáciu otvárajte odteraz z nej."}${ios?" Upozornenia do mobilu na iPhone a iPade fungujú až v aplikácii otvorenej z ikony (iOS 16.4 a novší).":""}</div>`;
  h.scrollIntoView({behavior:"smooth",block:"nearest"})}
function loggedIn(){return (typeof FARMER!=="undefined"&&!!FARMER)||(typeof ROLE!=="undefined"&&!!ROLE)||(typeof ME!=="undefined"&&!!ME&&!!ME.email)}
function inject(){if(std()||done()||later()||!loggedIn())return;const app=document.getElementById("app");if(!app||!app.children.length||app.querySelector(".instc"))return;
  const at=app.querySelector(".hero")||app.querySelector("nav.tabs");if(at)at.insertAdjacentHTML("afterend",card());else app.insertAdjacentHTML("afterbegin",card());shown=true}
function refresh(){sched()}
let q=0;function sched(){if(q)return;q=requestAnimationFrame(()=>{q=0;try{inject()}catch(x){}})}
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest)return;
  const b=t.closest("[data-inst]");
  if(b){const c=b.closest(".instc");
    if(ev){const p=ev;ev=null;try{p.prompt();const r=await p.userChoice;if(r&&r.outcome==="accepted"){try{localStorage.setItem("ernte-inst","1")}catch(x){}rm();return}}catch(x){}
      if(c)help(c);return}
    if(c)help(c);return}
  if(t.closest("[data-instx]")){try{sessionStorage.setItem("ernte-inst-later","1")}catch(x){}rm()}});
function start(){const app=document.getElementById("app");if(!app){setTimeout(start,300);return}new MutationObserver(sched).observe(app,{childList:true});sched()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
