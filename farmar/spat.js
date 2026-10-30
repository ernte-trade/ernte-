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
  if(anchor){if(anchor.nextElementSibling!==b)anchor.insertAdjacentElement("afterend",b)}else if(app.firstElementChild!==b)app.prepend(b)}
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
let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{track();bar()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
{const s=document.createElement("style");s.textContent=`.spatbar{display:flex;justify-content:center;margin:6px 0 10px}
.spatbar button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:6px 16px 6px 12px;border-radius:999px;font-weight:800;font-size:.95rem;max-width:100%;white-space:nowrap;overflow:hidden}
.spatbar button span{font-size:1.15rem;line-height:1}.spatbar small{font-weight:500;opacity:.75;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;min-width:0}`;document.head.appendChild(s)}
window.ernteSpat={back,stack:H};
})();
