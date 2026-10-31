// ===== 🗑 SKRYŤ AUTOMATICKÉ UPOZORNENIA (iba majitelia) =====
// Potiahni dlaždicu prstom doľava (🗑) alebo ťukni na ✕ → zmizne. Iba pri položkách, ktoré aplikácia
// vytvára sama (alarmy v Prehľade, posledné upozornenia, aktivita tímu). Pevné údaje (obchody, zmluvy…) sa takto nemažú.
// Keď príde nová informácia (zmení sa text), položka sa vráti sama. „↺ Zobraziť skryté“ ich vráti hneď.
// Ukladá sa v databáze pre prihláseného majiteľa – platí na všetkých jeho zariadeniach.
(function(){
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const norm=s=>String(s||"").replace(/\s+/g," ").trim();
const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)};
const SC=[
 {sel:".hali:not(.ok)",sc:"al",key:el=>norm(el.innerText)},
 {sel:".opli",sc:"pu",key:el=>norm(el.innerText)},
 {sel:".avp",sc:"av",key:el=>{const b=el.querySelector(".avh b"),t=el.querySelector(".avt");return norm((b?b.textContent:"")+"|"+(t?t.textContent:""))}}];
let H=new Set(),loaded=false,busy=false;
async function load(){if(busy||loaded)return;busy=true;try{const r=await sb.from("owner_hidden").select("k");if(!r.error){H=new Set((r.data||[]).map(x=>x.k));loaded=true;sched()}}catch(x){}busy=false}
async function hide(k){H.add(k);try{await sb.from("owner_hidden").upsert({k})}catch(x){}}
async function unhide(keys){keys.forEach(k=>H.delete(k));try{await sb.from("owner_hidden").delete().in("k",keys)}catch(x){}}
function wrap(el,k){const w=document.createElement("div");w.className="dsmw";w.dataset.dsmk=k;el.parentNode.insertBefore(w,el);
  w.innerHTML=`<div class="dsmu" aria-hidden="true"><span>🗑 Skryť</span></div>`;w.appendChild(el);
  const x=document.createElement("button");x.type="button";x.className="dsmx";x.setAttribute("aria-label","Skryť");x.title="Skryť (vráti sa pri novej informácii)";x.textContent="✕";w.appendChild(x);
  let sx=0,sy=0,dx=0,on=false,lock=0;
  el.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")return;sx=e.clientX;sy=e.clientY;dx=0;on=true;lock=0;el.style.transition="none"},{passive:true});
  el.addEventListener("pointermove",e=>{if(!on)return;const mx=e.clientX-sx,my=e.clientY-sy;
    if(!lock){if(Math.abs(mx)<8&&Math.abs(my)<8)return;lock=Math.abs(mx)>Math.abs(my)*1.2&&mx<0?1:2}
    if(lock!==1){on=false;el.style.transform="";return}
    dx=Math.min(0,mx);w.classList.add("dsmmv");el.style.transform=`translateX(${dx}px)`;w.classList.toggle("dsmgo",-dx>el.offsetWidth*.35)},{passive:true});
  const end=()=>{if(!on)return;on=false;el.style.transition="transform .22s cubic-bezier(.2,.8,.2,1)";
    if(lock===1&&-dx>el.offsetWidth*.35){w.dataset.dsmblock="1";go(w,k)}else{el.style.transform="";w.classList.remove("dsmgo");setTimeout(()=>w.classList.remove("dsmmv"),230)}
    if(lock===1&&Math.abs(dx)>6){w.dataset.dsmblock="1";setTimeout(()=>{delete w.dataset.dsmblock},350)}};
  el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);
  return w}
function go(w,k){const el=w.querySelector(".dsmu+*")||w.children[1];if(el){el.style.transition="transform .22s ease, opacity .22s ease";el.style.transform="translateX(-110%)";el.style.opacity="0"}
  w.style.height=w.offsetHeight+"px";requestAnimationFrame(()=>{w.classList.add("dsmout")});
  setTimeout(()=>{w.hidden=true;w.classList.remove("dsmout");w.style.height="";if(el){el.style.transform="";el.style.opacity=""}restoreChip(w.parentNode)},260);
  hide(k);if(typeof toast==="function")toast("Skryté. Vráti sa, keď príde nová informácia.",3500)}
function restoreChip(p){if(!p)return;let c=[...p.children].find(x=>x.classList&&x.classList.contains("dsmr"));const hid=[...p.querySelectorAll(":scope > .dsmw[hidden]")];
  if(!hid.length){if(c)c.remove();return}
  if(!c){c=document.createElement("button");c.type="button";c.className="dsmr";p.appendChild(c)}
  c.textContent=`↺ Zobraziť skryté (${hid.length})`}
function tick(){if(!OWN())return;if(!loaded){load();return}const app=document.getElementById("app");if(!app)return;
  const parents=new Set();
  for(const s of SC)app.querySelectorAll(s.sel).forEach(el=>{if(el.closest(".dsmw"))return;const t=s.key(el);if(!t)return;const k=s.sc+":"+hash(t);
    const w=wrap(el,k);if(H.has(k))w.hidden=true;parents.add(w.parentNode)});
  parents.forEach(restoreChip)}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const w=t.closest(".dsmw");if(w&&w.dataset.dsmblock){e.preventDefault();e.stopPropagation();return}
  const x=t.closest(".dsmx");if(x){e.preventDefault();e.stopPropagation();const ww=x.closest(".dsmw");go(ww,ww.dataset.dsmk);return}
  const r=t.closest(".dsmr");if(r){e.preventDefault();e.stopPropagation();const p=r.parentNode;const hid=[...p.querySelectorAll(":scope > .dsmw[hidden]")];unhide(hid.map(h=>h.dataset.dsmk));hid.forEach(h=>h.hidden=false);restoreChip(p);return}},true);
let q=0;const sched=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{tick()}catch(x){}})};
function start(){const app=document.getElementById("app");if(!app){setTimeout(start,300);return}new MutationObserver(sched).observe(app,{childList:true,subtree:true});sched()}
{const s=document.createElement("style");s.textContent=`
.dsmw{position:relative;border-radius:18px;transition:height .25s ease,opacity .25s ease;min-width:0}
.dsmw.dsmout{height:0!important;opacity:0;overflow:hidden}
.dsmw>:nth-child(2){position:relative;z-index:1;touch-action:pan-y}
.dsmu{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,rgba(248,113,113,.15),#dc2626);display:flex;align-items:center;justify-content:flex-end;padding-right:22px;color:#fff;font-weight:700;opacity:0;transition:opacity .15s}
.dsmw.dsmmv .dsmu{opacity:1}.dsmw.dsmmv .dsmx{opacity:0!important;pointer-events:none}
.dsmw.dsmmv>:nth-child(2){box-shadow:inset 0 0 0 3000px #131b31,0 10px 30px rgba(2,6,23,.45)!important}
html[data-theme=light] .dsmw.dsmmv>:nth-child(2){box-shadow:inset 0 0 0 3000px #f3f6fb,0 10px 30px rgba(30,41,59,.15)!important}
.dsmw.dsmgo .dsmu span{transform:scale(1.12)}.dsmu span{transition:transform .15s}
.dsmx{position:absolute;top:6px;right:6px;z-index:2;width:30px;height:30px;min-height:30px!important;padding:0!important;border-radius:50%!important;font-size:.8rem!important;line-height:1;opacity:.55;background:rgba(11,16,32,.55)!important;border:1px solid rgba(255,255,255,.18)!important;box-shadow:none!important}
.dsmx:hover,.dsmx:focus-visible{opacity:1}
@media (pointer:coarse){.dsmx{opacity:.7}}
.dsmw:has(.hali) .dsmx{top:50%;transform:translateY(-50%);right:44px}
.dsmr{justify-self:start;align-self:start;min-height:36px!important;padding:0 14px!important;border-radius:999px!important;font-size:.8rem!important;opacity:.85}
html[data-theme=light] .dsmx{background:rgba(255,255,255,.8)!important;border-color:rgba(15,23,42,.15)!important}`;document.head.appendChild(s)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
