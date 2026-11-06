// ===== ← SPÄŤ NA KAŽDEJ OBRAZOVKE (príkaz majiteľa 30. 10.) =====
// Aplikácia si pamätá, kade si chodil (záložka, sekcia v Cenníku / Obchodoch / Farmároch, časť Flotily a miesto na stránke).
// Pod hornou navigáciou je tlačidlo „← Späť“ – vráti ťa na predchádzajúcu obrazovku presne tam, kde si bol.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ON=()=>typeof ROLE!=="undefined"&&!!ROLE&&ROLE!=="farmer"&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof TAB!=="undefined";
const ss=k=>{try{return sessionStorage.getItem(k)}catch(x){return null}};
function snap(){const s={tab:TAB,sec:ss("ernte-sec-"+TAB),y:window.scrollY||0};
  if(TAB==="fleet"&&typeof STATE!=="undefined"){s.fsec=STATE.fsec||"";s.fsub=STATE.fsub&&STATE.fsec?STATE.fsub[STATE.fsec]||"":""}return s}
const key=s=>s?[s.tab,s.sec||"",s.fsec||"",s.fsub||""].join("|"):"";
const H=[];let cur=null,going=false;
function label(s){let t="";const b=document.querySelector(`nav.tabs [data-tab="${CSS.escape(s.tab)}"]`);if(b){const c=b.cloneNode(true);c.querySelectorAll(".ti,.cnt").forEach(x=>x.remove());t=c.textContent.replace(/\s+/g," ").trim()}
  if(!t)t=s.tab;if(s.sec){const sb=document.querySelector(`[data-secb="${CSS.escape(s.sec)}"]`);if(sb&&s.tab===TAB)t+=" · "+sb.textContent.trim()}
  if(s.fsec){const fb=document.querySelector(`[data-fsec="${CSS.escape(s.fsec)}"]`);if(fb)t+=" · "+fb.textContent.replace(/\s+/g," ").trim().slice(0,24)}
  return t.length>40?t.slice(0,38)+"…":t}
function track(){if(!ON())return;const n=snap();if(!cur){cur=n;return}
  if(key(n)!==key(cur)){if(!going){H.push(cur);if(H.length>30)H.shift()}going=false;cur=n}}
function bar(){const app=document.getElementById("app");if(!app||!ON()){const o=document.getElementById("spatBar");if(o)o.remove();return}
  let b=document.getElementById("spatBar");const prev=H[H.length-1];
  if(!prev){if(b)b.remove();return}
  const html=`<button type="button" data-spat="1" aria-label="Späť na predchádzajúcu obrazovku"><span aria-hidden="true">←</span> Späť<small>${E(label(prev))}</small></button>`;
  if(!b){b=document.createElement("div");b.id="spatBar";b.className="spatbar"}
  if(b.dataset.h!==html){b.innerHTML=html;b.dataset.h=html}
  const nav=app.querySelector(":scope > nav.tabs"),anchor=nav||app.querySelector(":scope > .hero");
  if(anchor){if(b.parentNode!==app)anchor.after(b);if(window.ernteTopOrder)window.ernteTopOrder();else if(anchor.nextElementSibling!==b)anchor.after(b)}else if(app.firstElementChild!==b)app.prepend(b)}
function back(){const p=H.pop();if(!p)return;going=true;
  try{if(p.sec!=null)sessionStorage.setItem("ernte-sec-"+p.tab,p.sec);else sessionStorage.removeItem("ernte-sec-"+p.tab)}catch(x){}
  TAB=p.tab;if(p.tab==="fleet"&&p.fsec&&typeof fsecGo==="function"){try{fsecGo(p.fsec,p.fsub||undefined)}catch(x){}}
  try{renderStaff()}catch(x){}
  cur=snap();cur.y=p.y;going=false;
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,p.y||0)));bar()}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-spat]");if(!b)return;e.preventDefault();e.stopPropagation();back()},true);
// sekcie (secbtn) sa menia bez prekreslenia – skontrolovať aj po ťuknutí
document.addEventListener("click",()=>setTimeout(()=>{track();bar()},60));
window.addEventListener("scroll",()=>{if(cur&&ON()&&typeof TAB!=="undefined"&&cur.tab===TAB)cur.y=window.scrollY||0},{passive:true});
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{track();bar()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
{const s=document.createElement("style");s.textContent=`.spatbar{display:flex;justify-content:center;margin:6px 0 10px}
.spatbar button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:6px 16px 6px 12px;border-radius:999px;font-weight:800;font-size:.95rem;max-width:100%;white-space:nowrap;overflow:hidden}
.spatbar button span{font-size:1.15rem;line-height:1}.spatbar small{font-weight:500;opacity:.75;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;min-width:0}`;document.head.appendChild(s)}
// 7. 11. príkaz majiteľa (Master prompt 2.3 „trvalé tlačidlo ← Späť v hornom rohu“): keď lišta ← Späť odroluje z obrazovky,
// vľavo hore sa ukáže okrúhle ← (rovnaký krok späť); pod pásmi „Bez signálu“ / „Nové údaje“, nikdy cez otvorené okno (z-index nižší ako okná).
let fq=0;function fab(){fq=0;const b=document.getElementById("spatBar");let f=document.getElementById("spatFab");
  if(!b||!ON()){if(f)f.remove();return}
  if(!f){f=document.createElement("button");f.type="button";f.id="spatFab";f.dataset.spat="1";f.setAttribute("aria-label","Späť na predchádzajúcu obrazovku");f.innerHTML='<span aria-hidden="true">←</span>';document.body.appendChild(f)}
  const r=b.getBoundingClientRect(),vis=r.bottom>8&&r.top<innerHeight-8;
  let top=10;for(const id of ["dmStale","ernNew"]){const x=document.getElementById(id);if(x&&x.offsetParent!==null){const q=x.getBoundingClientRect();if(q.left<70)top=Math.max(top,q.bottom+8)}}
  let cov=false;try{const st=document.elementsFromPoint(innerWidth/2,innerHeight/2)||[];for(const el of st){if(el===f||el===document.body||el===document.documentElement)continue;
    for(let x=el;x&&x!==document.body;x=x.parentElement){const cs=getComputedStyle(x);if(cs.position==="fixed"){const z=parseInt(cs.zIndex)||0,q=x.getBoundingClientRect();if(z>=50&&q.width*q.height>=innerWidth*innerHeight*.4)cov=true;break}}break}}catch(x){}
  f.style.top="calc("+top+"px + env(safe-area-inset-top,0px))";f.classList.toggle("on",!vis&&!cov)}
const fsch=()=>{if(!fq)fq=requestAnimationFrame(fab)};
window.addEventListener("scroll",fsch,{passive:true});window.addEventListener("resize",fsch);document.addEventListener("click",()=>setTimeout(fsch,120));setInterval(fsch,1500);
{const s=document.createElement("style");s.textContent=`#spatFab{position:fixed;left:10px;z-index:900;width:48px;height:48px;border-radius:50%;display:none;align-items:center;justify-content:center;padding:0;
 font-size:1.45rem;font-weight:800;line-height:1;background:rgba(11,15,25,.9);color:#b6ff3b;border:2px solid rgba(182,255,59,.75);box-shadow:0 6px 18px rgba(0,0,0,.45)}
#spatFab.on{display:flex}#spatFab span{transform:translateY(-1px)}@media print{#spatFab{display:none!important}}`;document.head.appendChild(s)}
window.ernteSpat={back,stack:H};
})();
