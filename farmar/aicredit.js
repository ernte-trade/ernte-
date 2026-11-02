// ===== 💳 KREDIT ERNTE AI + 💬 PREDPLATNÉ CLAUDE (iba Martin – MAIN_OK, Prehľad) – príkaz majiteľa 2. 11. 2026 =====
// Spotreba sa ráta z odpovedí Claude API (ai_usage_scan, pg_cron ai-usage každých 5 min); zostatok = zadaný po dobití − spotreba (odhad).
// Anthropic nemá verejné API na zostatok kreditu ani na limity predplatného claude.ai → tlačidlá vedú priamo na správne stránky.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&typeof MAIN_OK==="function"&&MAIN_OK()&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST&&typeof sb!=="undefined";
const BILL="https://console.anthropic.com/settings/billing",USE="https://console.anthropic.com/usage",CL="https://claude.ai/settings/usage";
const C={d:null,at:0,busy:false};
const $$=v=>v==null?"–":"$"+Number(v).toLocaleString("sk-SK",{minimumFractionDigits:2,maximumFractionDigits:2});
const tm=t=>{if(!t)return "";const d=new Date(t);return isNaN(d)?"":d.toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
async function load(){if(C.busy||Date.now()-C.at<60e3)return;C.busy=true;C.at=Date.now();
  try{const r=await sb.rpc("ai_credit_get");C.d=r.error?{err:r.error.message}:(r.data||{})}catch(x){C.d={err:String(x)}}C.busy=false;paint()}
function card(){const d=C.d;if(!d||d.err)return "";
  const empty=!!d.empty,left=d.left!=null?Number(d.left):null,pd=d.per_day!=null?Number(d.per_day):null;
  const days=left!=null&&pd>0?Math.max(0,Math.floor(left/pd)):null,low=left!=null&&(left<=20||(days!=null&&days<=3));
  const st=empty?`<span class="kcrst bad">🔴 Kredit došiel${d.err_at?" · "+E(tm(d.err_at)):""}</span>`:low?`<span class="kcrst warn">🟠 Kredit dochádza</span>`:`<span class="kcrst ok">🟢 Beží</span>`;
  return `<div class="card kcr${empty?" kcrempty":""}"><div class="kcrh"><b>💳 Kredit ERNTE AI</b>${st}</div>
   <div class="kcrg">
    <div class="kcrk"><small>Zostáva (odhad)</small><b>${empty?"$0":left!=null?$$(left):"?"}</b><em>${empty?"dobiť kredit":left!=null?(days!=null?"vydrží ~"+days+" "+(days===1?"deň":days<5?"dni":"dní"):"po dobití "+E(tm(d.bal_at))):"zadaj zostatok po dobití"}</em></div>
    <div class="kcrk"><small>Dnes minuté</small><b>${$$(d.today)}</b><em>${pd!=null?"priemer "+$$(pd)+" / deň":"zatiaľ bez údajov"}</em></div>
    <div class="kcrk"><small>Za 7 dní</small><b>${$$(d.d7)}</b><em>${Number(d.n7||0)} odpovedí AI</em></div>
   </div>
   <div class="kcrb"><a class="btn lime" href="${BILL}" target="_blank" rel="noopener">💳 Dobiť kredit</a><button type="button" data-aicset>✏️ Zadať zostatok</button><a class="btn" href="${USE}" target="_blank" rel="noopener">📊 Spotreba v Anthropic</a></div>
   <div class="s">Spotrebu ráta aplikácia z odpovedí AI (ceny ${E(d.price||"")}) – presný zostatok je iba v Anthropic Console. Po každom dobití ťukni ✏️ a zadaj zostatok, ktorý ti tam ukáže.</div>
   <div class="kcrl"><div><b>💬 Claude – tvoje predplatné</b><small>Koľko ti ostáva v rozhovoroch so mnou a kedy sa limit obnoví, ukazuje iba claude.ai (aplikácia to nevie načítať).</small></div><a class="btn" href="${CL}" target="_blank" rel="noopener">⏱️ Limity a obnova</a></div>
  </div>`}
function paint(){const app=document.getElementById("app");if(!app||!OK()||typeof TAB==="undefined"||TAB!=="home")return;const old=app.querySelector(".card.kcr"),h=card();
  if(old){if(old.dataset.h===h)return;if(h){old.outerHTML=h;const n=app.querySelector(".card.kcr");if(n)n.dataset.h=h}else old.remove();return}if(!h)return;
  const w=document.createElement("div");w.innerHTML=h;const el=w.firstElementChild;el.dataset.h=h;
  const ref=app.querySelector(".hero")||app.querySelector("nav.tabs");if(ref&&ref.parentNode)ref.parentNode.insertBefore(el,ref.nextSibling);else app.prepend(el)}
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-aicset]");if(!t||!OK())return;e.preventDefault();
  const v=prompt("Koľko $ ti teraz ukazuje Anthropic Console (Billing → Credit balance)?",C.d&&C.d.left!=null?String(C.d.left):"");if(v===null)return;
  const n=parseFloat(String(v).replace(/[^\d,.]/g,"").replace(",","."));if(!(n>=0)){(window.toast||alert)("Zadaj sumu v dolároch, napr. 100");return}
  t.disabled=true;const r=await sb.rpc("ai_credit_set",{p_bal:n});t.disabled=false;if(r.error){(window.toast||alert)(r.error.message);return}
  C.d=r.data||C.d;paint();(window.toast||(()=>{}))("💳 Zostatok uložený",2500)});
{const s=document.createElement("style");s.textContent=`.kcr .kcrh{display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;text-align:center}
.kcr .kcrst{font-size:.82rem;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap}.kcr .kcrst.ok{background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.5)}
.kcr .kcrst.warn{background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.55)}.kcr .kcrst.bad{background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.6)}
.kcr.kcrempty{border-color:rgba(239,68,68,.55)!important;box-shadow:0 0 0 1px rgba(239,68,68,.25),0 8px 30px rgba(239,68,68,.12)}
.kcr .kcrg{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px;margin:10px 0}
.kcr .kcrk{display:grid;gap:2px;text-align:center;padding:10px 8px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04)}
.kcr .kcrk small{opacity:.75;font-size:.8rem}.kcr .kcrk b{font-size:1.35rem}.kcr .kcrk em{font-style:normal;font-size:.8rem;opacity:.8}
.kcr .kcrb{display:flex;flex-wrap:wrap;gap:6px}.kcr .kcrb>*{flex:1 1 140px;min-height:42px;display:flex;align-items:center;justify-content:center;text-align:center;white-space:normal;text-decoration:none}
.kcr .s{margin-top:8px;font-size:.8rem;opacity:.75;text-align:center}
.kcr .kcrl{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12);display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;text-align:center}
.kcr .kcrl>div{flex:1 1 220px;display:grid;gap:2px}.kcr .kcrl small{opacity:.75;font-size:.8rem}.kcr .kcrl .btn{flex:0 1 200px;min-height:42px;display:flex;align-items:center;justify-content:center;text-decoration:none}
html[data-theme=light] .kcr .kcrk{border-color:rgba(0,0,0,.12);background:rgba(0,0,0,.03)}html[data-theme=light] .kcr .kcrl{border-top-color:rgba(0,0,0,.1)}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{if(OK()&&typeof TAB!=="undefined"&&TAB==="home"){if(C.d)paint();load()}}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,600);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
