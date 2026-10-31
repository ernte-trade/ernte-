// ===== 🌦️ UPOZORNENIA NA POČASIE PRE KAŽDÉHO (31. 10.) =====
// Databáza (wx_alert_run / wx_alert_collect každú hodinu, Open-Meteo): dážď mm, sneh cm, poľadovica, vietor, búrka na 12 h + „kde je lepšie“.
// Tu: 1) pošle polohu z Počasia (WXLOC) – wx_loc_set, 2) karta hore v aplikácii, kým je upozornenie (✕ ju skryje do zmeny),
// 3) 🔔 zapnutie upozornení do mobilu pre KAŽDÉHO (Web Push, push_pub + push_sub_save) – farmári, tím aj majitelia.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IN=()=>typeof sb!=="undefined"&&typeof ME!=="undefined"&&!!ME&&((typeof ROLE!=="undefined"&&!!ROLE)||(typeof FARMER!=="undefined"&&!!FARMER))&&!window.ERNTE_VIEWAS;
const tst=(t,ms)=>typeof toast==="function"?toast(t,ms||5000):alert(t);
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const std=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const sup=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const D={d:null,at:0,locAt:0,sub:null,busy:false};
const key=a=>(a||[]).map(x=>x.k+x.h).join("|");
const hidden=()=>{try{return localStorage.getItem("ernte-wxa-x")||""}catch(x){return ""}};
async function sendLoc(){try{const L=typeof WXLOC!=="undefined"&&WXLOC?WXLOC:null;if(!L||L.lat==null)return;const k=L.lat+","+L.lon,last=localStorage.getItem("ernte-wxloc-sent")||"";
  if(last.startsWith(k+"|")&&Date.now()-(+last.split("|")[1]||0)<864e5)return;await sb.rpc("wx_loc_set",{p_lat:+L.lat,p_lon:+L.lon,p_name:L.name||null});localStorage.setItem("ernte-wxloc-sent",k+"|"+Date.now())}catch(x){}}
async function subState(){if(!sup()){D.sub="no";return}try{const reg=await navigator.serviceWorker.getRegistration();const s=reg&&await reg.pushManager.getSubscription();D.sub=s?"on":(Notification.permission==="denied"?"denied":"off")}catch(x){D.sub="off"}}
async function load(){if(!IN()||D.busy)return;D.busy=true;try{await sendLoc();const r=await sb.rpc("wx_alert_my");D.d=r.error?{al:[]}:(r.data||{al:[]});await subState()}catch(x){D.d=D.d||{al:[]}}D.at=Date.now();D.busy=false;paint()}
const b64=s=>{const p="=".repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(r,c=>c.charCodeAt(0))};
async function enable(btn){if(!sup()){tst(ios&&!std()?"Na iPhone najprv pridajte ERNTE na plochu (Zdieľať → Pridať na plochu) a otvorte ju z ikony – potom zapnite upozornenia.":"Tento prehliadač upozornenia nepodporuje – skúste Chrome.",9000);return}
  if(btn)btn.disabled=true;
  try{const k=await sb.rpc("push_pub");const pub=k.data&&k.data.pub;if(!pub)throw new Error("Upozornenia sa ešte nastavujú – skúste o pár minút.");
    const p=await Notification.requestPermission();if(p!=="granted"){tst("Upozornenia sú zakázané. Povoľte ich v nastaveniach telefónu pre ERNTE.",8000);D.sub="denied";paint();return}
    let reg=await navigator.serviceWorker.getRegistration();if(!reg)reg=await navigator.serviceWorker.register("sw.js");await navigator.serviceWorker.ready;
    let s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(pub)});
    const j=s.toJSON();const r=await sb.rpc("push_sub_save",{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_ua:navigator.userAgent.slice(0,200)});if(r.error)throw r.error;
    D.sub="on";paint();tst("✅ Upozornenia zapnuté – dáme vám vedieť pred dažďom, snehom, poľadovicou aj vetrom.",6000)}
  catch(x){tst("Nepodarilo sa zapnúť: "+(x&&x.message||x),8000)}finally{if(btn)btn.disabled=false}}
function html(){const d=D.d||{},A=d.al||[],k=key(A),off=D.sub==="off"||D.sub==="no";
  if(!A.length){return off&&!sessionStorage.getItem("ernte-wxa-push-later")?`<div class="card wxa calm" id="wxaCard"><div class="wxah"><b>🌦️ Upozornenia na počasie</b><button type="button" class="wxax" data-wxax aria-label="Zavrieť">✕</button></div>
    <div class="s">Dáme vám vedieť do mobilu pred dažďom (koľko mm), snehom, poľadovicou, silným vetrom a búrkou – a kde je v okolí lepšie.</div>
    <div class="btns"><button type="button" class="lime" data-wxapush>🔔 Upozorňovať ma do mobilu</button></div></div>`:""}
  if(hidden()===k)return "";const sev=A.some(a=>+a.sev>=5);
  return `<div class="card wxa${sev?" sev":""}" id="wxaCard"><div class="wxah"><b>⚠️ Počasie · ${E(d.place||"")} · najbližších 12 h</b><button type="button" class="wxax" data-wxax aria-label="Zavrieť">✕</button></div>
   ${A.map(a=>`<div class="wxar"><span>${E(a.i)}</span><b>${E(a.t)}</b></div>`).join("")}
   ${d.better?`<div class="wxab">☀️ Lepšie v okolí: <b>${E(d.better.n)}</b> (${E(d.better.km)} km, ${+d.better.mm<0.5?"sucho":E(String(d.better.mm).replace(".",","))+" mm"})</div>`:""}
   ${off?`<div class="btns"><button type="button" class="lime" data-wxapush>🔔 Upozorňovať ma do mobilu</button></div>`:D.sub==="denied"?`<div class="s">Upozornenia do mobilu sú v telefóne zakázané – povoľte ich v nastaveniach pre ERNTE.</div>`:""}</div>`}
function paint(){const app=document.getElementById("app");if(!app)return;const old=document.getElementById("wxaCard"),h=IN()?html():"";
  if(!h){if(old)old.remove();return}const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;  el.dataset.h=String(h.length)+h.slice(0,60)+h.slice(-60);if(old){if(old.dataset.h!==el.dataset.h)old.replaceWith(el);return}const a=app.querySelector("nav.tabs")||app.querySelector(".hero");if(a)a.after(el);else app.prepend(el)}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("[data-wxapush]")){e.preventDefault();enable(t.closest("[data-wxapush]"));return}
  if(t.closest("[data-wxax]")){e.preventDefault();const A=(D.d&&D.d.al)||[];if(A.length){try{localStorage.setItem("ernte-wxa-x",key(A))}catch(x){}}else{try{sessionStorage.setItem("ernte-wxa-push-later","1")}catch(x){}}paint()}},true);
{const s=document.createElement("style");s.textContent=`.wxa{border-color:rgba(56,189,248,.55)!important;box-shadow:0 0 0 1px rgba(56,189,248,.2),0 10px 30px -14px rgba(56,189,248,.6)}
.wxa.sev{border-color:rgba(248,113,113,.7)!important;box-shadow:0 0 0 1px rgba(248,113,113,.3),0 10px 30px -12px rgba(248,113,113,.6)}
.wxah{display:flex;align-items:center;justify-content:space-between;gap:10px}.wxah b{min-width:0;overflow-wrap:anywhere}
.wxax{flex:0 0 auto;width:40px;height:40px;min-height:40px;border-radius:50%;padding:0}
.wxar{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;padding:8px 0;border-top:1px solid rgba(255,255,255,.08)}.wxar span{font-size:1.5rem}.wxar b{overflow-wrap:anywhere}
.wxab{margin-top:6px;padding:10px 12px;border-radius:14px;background:rgba(253,224,71,.1);border:1px solid rgba(253,224,71,.35);overflow-wrap:anywhere}
.wxa .btns{justify-content:center;margin-top:8px}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;if(!IN())return;if(!D.at||Date.now()-D.at>15*60e3)load();else paint()})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&IN()&&Date.now()-D.at>5*60e3)load()})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
