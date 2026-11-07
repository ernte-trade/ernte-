// ===== 👆 KLIKATEĽNÉ DLAŽDICE S ČÍSLOM (príkaz majiteľa 1. 11. 16:59: „po ťuknutí na dlaždicu ukáž obsah – farmári → farmárov, a to všade“) =====
// Platí pre všetky prihlásenia a všetky obrazovky: .hrk, .zsg, .opk, .fdk, .kpis dlaždice.
// Ťuk → nájde na tej istej obrazovke sekciu / zoznam, o ktorom dlaždica hovorí (nadpis, rozbaľovací zoznam, prepínač filtra),
// otvorí ho a posunie sa naň; ak na obrazovke nie je, prepne na záložku s rovnakým názvom (napr. „Farmári“).
// Dlaždica, ku ktorej sa nič nenašlo, ostane bez šípky a ťuk nič nerobí. Vlastné ciele: atribút data-kgo="selektor" alebo window.kpiGo.push([/regex/, fn]).
(function(){
const TILES=".hrk>div,.zsg>div,.opk>div,.fdk>div,.kpis>.kpi";
const nz=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const STOP=new Set(["nove","nova","novy","spolu","celkom","dnes","obdobi","obdobie","mesiaci","pocet","aktivne","aktivni","otvorene","stav","este","vsetky","ktore","bude","bolo","danube","ernte"]);
// slová dlaždice → kmene (prvých 5 písmen); „danube“ a pod. sa berú iba ako doplnok
function stems(lbl){const w=nz(lbl).replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(x=>x.length>=4);const main=w.filter(x=>!STOP.has(x)).map(x=>x.slice(0,5)),extra=w.filter(x=>STOP.has(x)).map(x=>x.slice(0,5));return {main,extra}}
window.kpiGo=window.kpiGo||[];
function label(t){const s=t.querySelector("small");return (s?s.textContent:t.innerText.split("\n")[0]||"").trim()}
const vis=el=>{if(!el)return false;if(el.closest("details:not([open])")&&el.tagName!=="SUMMARY")return true;const r=el.getBoundingClientRect();return r.width>0||r.height>0||!!el.closest("details")};
function score(txt,S){const n=nz(txt);let m=0,x=0;for(const s of S.main)if(n.includes(s))m++;for(const s of S.extra)if(n.includes(s))x++;return m?m*10+x:0}
function target(t){if(t.dataset.kgo){const el=document.querySelector(t.dataset.kgo);return el?{el,kind:"el"}:null}
  const L=label(t);if(!L)return null;for(const [rx,fn] of window.kpiGo){try{if(rx.test(L))return {fn,kind:"fn"}}catch(x){}}
  const S=stems(L);if(!S.main.length)return null;
  const app=document.getElementById("app")||document.body,grp=t.parentElement;
  const C=[...app.querySelectorAll("h2,h3,h4,summary,legend,.t,.skh,.srt,.dh b,.tdh b,.seg2 button,[data-dnf],[aria-pressed]")].filter(el=>!grp.contains(el)&&!el.closest(".hrk,.zsg,.opk,.fdk,.kpis,nav.tabs,.dock,header")&&vis(el));
  let best=null,bs=0,after=false;const pos=el=>grp.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING;
  for(const el of C){const txt=el.tagName==="SUMMARY"?el.textContent:el.textContent.slice(0,80);const s=score(txt,S);if(!s)continue;const a=!!pos(el);
    if(s>bs||(s===bs&&a&&!after)){best=el;bs=s;after=a}}
  // nájde zhodu všetkých hlavných slov, inak aspoň prvého (hlavného) slova
  if(best&&(bs>=S.main.length*10||nz(best.textContent).includes(S.main[0])))return {el:best,kind:best.matches("button,[aria-pressed]")&&best.tagName!=="SUMMARY"?"btn":"el"};
  // iná záložka s rovnakým názvom (Farmári, Obchody, Požiadavky…)
  const tabs=[...document.querySelectorAll("nav.tabs button,nav.tabs a,.ds-bar button,[data-tab]")].filter(b=>!b.closest(".hrk"));
  for(const b of tabs){const n=nz(b.textContent);if(S.main.some(s=>n.includes(s))&&!b.matches("[aria-current=page],.on,[aria-selected=true]"))return {el:b,kind:"btn"}}
  return null}
function go(t){const g=target(t);if(!g)return false;
  if(g.kind==="fn"){g.fn(t);return true}
  if(g.kind==="btn"){g.el.click();return true}
  let el=g.el;const d=el.tagName==="SUMMARY"?el.parentElement:el.closest("details");if(d&&d.tagName==="DETAILS")d.open=true;
  for(let p=el.parentElement;p;p=p.parentElement){if(p.tagName==="DETAILS")p.open=true}
  const box=el.closest(".card")||el;const y=box.getBoundingClientRect().top+scrollY-80;scrollTo({top:Math.max(0,y),behavior:"smooth"});
  box.classList.remove("kpflash");void box.offsetWidth;box.classList.add("kpflash");setTimeout(()=>box.classList.remove("kpflash"),1800);return true}
// označí dlaždice, ktoré niekam vedú (šípka ›)
function mark(all){document.querySelectorAll(all?TILES:TILES.split(",").map(x=>x+":not([data-kpm])").join(",")).forEach(t=>{t.dataset.kpm="1";if(t.querySelector("button,a,input,select,textarea"))return;const ok=!!target(t);t.classList.toggle("kpk",ok);
  let a=t.querySelector(":scope>.kparr");if(ok){t.setAttribute("role","button");t.tabIndex=0;if(!a){a=document.createElement("i");a.className="kparr";a.setAttribute("aria-hidden","true");a.textContent="›";t.appendChild(a)}}else{t.removeAttribute("role");if(a)a.remove()}})}
let q=0;function soon(){if(q)return;q=1;(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{mark(true)}catch(x){}})}
let ot=0;function lazy(){if(ot)return;ot=setTimeout(()=>{ot=0;try{if(document.querySelector(TILES.split(",").map(x=>x+":not([data-kpm])").join(",")))mark(false)}catch(x){}},400)}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest(TILES);if(!t||e.target.closest("button,a,input,select,textarea,label"))return;if(go(t))e.preventDefault()},true);
document.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const t=e.target.closest&&e.target.closest(".kpk");if(t&&go(t))e.preventDefault()});
for(const fn of ["renderStaff","renderFarmer"]){const tk=setInterval(()=>{const o=window[fn];if(typeof o!=="function"||o.__kpi)return;const w=function(){const r=o.apply(this,arguments);soon();return r};Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__kpi=1;window[fn]=w},700);setTimeout(()=>clearInterval(tk),60000)}
window.kpiTarget=t=>{const g=target(t);return g?(g.kind+": "+(g.el?g.el.textContent.trim().slice(0,50):"fn")):null};
new MutationObserver(lazy).observe(document.documentElement,{childList:true,subtree:true});
{const s=document.createElement("style");s.textContent=`.kpk{cursor:pointer;-webkit-tap-highlight-color:transparent}.kpk .kparr{position:absolute;right:10px;bottom:6px;font:700 1.2rem/1 system-ui;font-style:normal;opacity:.5;pointer-events:none;z-index:2}
.kpk:active{transform:scale(.97)}.kpflash{animation:kpfl 1.6s ease}@keyframes kpfl{0%,60%{box-shadow:0 0 0 3px rgba(182,255,59,.85),0 0 24px rgba(182,255,59,.5)}100%{box-shadow:none}}`;document.head.appendChild(s)}
})();
