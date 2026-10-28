// ===== 🔔 Upozornenia do mobilu MAJITEĽA – priamo z aplikácie (Web Push), bez ďalšej aplikácie =====
(function(){
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const K="ernte-opush-ok",SK="ernte-opush-seen";let C=null,busy=false,open=false,st=null,PL=null,plOpen=false;
const ok=()=>{try{return localStorage.getItem(K)==="1"}catch(x){return false}};
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const std=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const sup=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const b64=s=>{const p="=".repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...r].map(c=>c.charCodeAt(0)))};
const rs=()=>{if(typeof TAB!=="undefined"&&TAB==="home"&&typeof renderStaff==="function")renderStaff()};
async function loadList(){const o=JSON.stringify(PL);try{const r=await sb.rpc("my_push_list",{p_lim:15});PL=r.error?[]:r.data||[]}catch(x){PL=[]}if(JSON.stringify(PL)!==o)rs()}
async function load(test,on){if(busy)return;busy=true;try{const r=await sb.rpc("my_push2",{p_test:!!test,p_on:on==null?null:on});C=r.error?{err:/my_push2/.test(r.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message}:r.data||{}}catch(x){C={err:String(x)}}
  try{const reg=await navigator.serviceWorker.getRegistration();const s=reg&&await reg.pushManager.getSubscription();st=s?"on":(typeof Notification!=="undefined"&&Notification.permission==="denied")?"denied":"off"}catch(x){st="off"}busy=false;rs()}
async function enable(b){if(!sup()){toast(ios&&!std()?"Na iPhone najprv pridaj aplikáciu na plochu a otvor ju z ikony.":"Tento prehliadač upozornenia nepodporuje – skús Chrome.",7000);return}
  if(!C||!C.pub){toast("Chvíľu počkaj – načítavam nastavenie.");return}
  if(typeof busy==="function"&&b)window.busy&&window.busy(b,true);
  try{const p=await Notification.requestPermission();if(p!=="granted"){toast("Upozornenia sú zakázané. Povoľ ich v nastaveniach prehliadača pre túto stránku.",8000);st="denied";rs();return}
    let reg=await navigator.serviceWorker.getRegistration();if(!reg)reg=await navigator.serviceWorker.register("sw.js");await navigator.serviceWorker.ready;
    let s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(C.pub)});
    const j=s.toJSON();const r=await sb.rpc("push_sub_save",{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_ua:navigator.userAgent.slice(0,200)});
    if(r.error)throw r.error;st="on";toast("✓ Upozornenia zapnuté v tomto zariadení. Pošli si skúšobné.",6000);await load(false)}
  catch(x){toast("Nepodarilo sa zapnúť: "+(x&&x.message||x),8000)}finally{if(b&&window.busy)window.busy(b,false)}}
async function disable(){try{const reg=await navigator.serviceWorker.getRegistration();const s=reg&&await reg.pushManager.getSubscription();if(s){await sb.rpc("push_sub_del",{p_endpoint:s.endpoint});await s.unsubscribe()}}catch(x){}st="off";toast("Upozornenia v tomto zariadení vypnuté.");await load(false)}
const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"";
function listHTML(){const e=typeof esc==="function"?esc:(x=>x);if(PL===null){loadList();return ""}const PL0=PL;const PLx=window.nbellDone?PL0.filter(x=>!nbellDone(x)):PL0;if(!PLx.length)return "";let seen=0;try{seen=+localStorage.getItem(SK)||0}catch(x){}
  const nw=PLx.filter(x=>Date.parse(x.at)>seen).length,L=plOpen?PLx:PLx.slice(0,3);
  return `<div class="card oplist"><div class="oplh"><b>🔔 Posledné upozornenia${nw?` <span class="cnt">${nw} nové</span>`:""}</b>${nw?`<button type="button" data-opseen="1">✓ Prečítané</button>`:""}</div>
   ${L.map(x=>`<div class="opli${Date.parse(x.at)>seen?" nw":""}"><b>${e(x.t||"")}</b><span>${e(x.b||"")}</span><small>${e(dt(x.at))}${x.done&&!x.ok?" · ⚠️ nedoručené do mobilu":""}</small></div>`).join("")}
   ${PLx.length>3?`<button type="button" class="oplm" data-opmore="1">${plOpen?"Menej":"Všetky ("+PLx.length+")"}</button>`:""}</div>`}
function card(){const e=typeof esc==="function"?esc:(x=>x);
  if(!C){load(false);return `<div class="card opush"><b>🔔 Upozornenia do mobilu so zvukom</b><div class="s">Načítavam…</div></div>`}
  if(C.err)return `<div class="card opush"><b>🔔 Upozornenia do mobilu so zvukom</b><div class="s">${e(C.err)}</div></div>`;
  if(ok()&&!open&&st==="on")return `<div class="card opush mini"><span>🔔 Upozornenia do mobilu: <b>${C.on===false?"vypnuté":"zapnuté"}</b></span><button type="button" data-opo="1">Nastaviť</button></div>`;
  const L=C.last;
  return `<div class="card opush"><b>🔔 Upozornenia do mobilu so zvukom</b>
   <div class="s">Nová objednávka odvozu, ponuka na predaj, podpísaná zmluva, návrh ceny, objednávka služby a spätná väzba prídu do mobilu priamo od aplikácie <b>ERNTE Trade &amp; Logistic</b> – aj keď je zavretá. Nič ďalšie netreba inštalovať. Vidíš ich iba ty.</div>
   ${ios&&!std()?`<div class="s">📱 Na iPhone: najprv <b>Pridať na plochu</b> (dlaždica hore) a aplikáciu otvor z ikony – potom tu ťukni Zapnúť.</div>`:""}
   <div class="s">V tomto zariadení: <b>${st==="on"?"✅ zapnuté":(+C.subs>0?"nie je potrebné – upozornenia už chodia do iného zariadenia / do ERNTE z ikony na ploche":st==="denied"?"⛔ zakázané v prehliadači – povoľ upozornenia pre túto stránku":"vypnuté")}</b> · zariadení spolu: ${+C.subs||0}${L?` · posledné odoslanie ${e(dt(L.at))}${L.done?(L.sent?" ✓ doručené":" ⚠️ "+e(L.err||"nedoručené")):L.taken?" (posiela sa…)":" (čaká)"}`:""}</div>
   <div class="btns">${st!=="on"?`<button type="button" class="pri" data-ope="1">🔔 Zapnúť upozornenia</button>`:`<button type="button" class="lime" data-opt="1">Poslať skúšobné upozornenie</button><button type="button" data-opd="1">Vypnúť v tomto zariadení</button>`}
    ${st==="on"?`<button type="button" class="pri" data-opok="1">✓ Pípa mi – hotovo</button>`:""}${ok()?`<button type="button" data-opo="0">Zavrieť</button>`:""}</div>
   <div class="s">Ak skúšobné nepípne (príde do 1 minúty): v nastaveniach telefónu → Aplikácie → prehliadač / ERNTE → Upozornenia → zapni zvuk a vypni pre prehliadač úsporu batérie.</div></div>`}
const _vh=window.vHome;if(typeof _vh==="function")window.vHome=function(){const h=_vh.apply(this,arguments);return OWN()?card()+listHTML()+h:h};
setInterval(()=>{if(!document.hidden&&OWN()&&typeof TAB!=="undefined"&&TAB==="home")loadList()},60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden&&OWN())loadList()});
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest||!OWN())return;let x;
  if(t.closest("[data-opseen]")){try{localStorage.setItem(SK,String(Date.now()))}catch(y){}if(window.nbellReadAll)await nbellReadAll(PL||[]);rs();return}
  if(t.closest("[data-opmore]")){plOpen=!plOpen;rs();return}
  if(x=t.closest("[data-ope]")){await enable(x);return}
  if(t.closest("[data-opd]")){await disable();return}
  if(t.closest("[data-opt]")){await load(true);toast("Odoslané – mobil by mal pípnuť do 1 minúty.",6000);setTimeout(()=>load(false),45000);return}
  if(t.closest("[data-opok]")){try{localStorage.setItem(K,"1")}catch(y){}open=false;rs();return}
  if(x=t.closest("[data-opo]")){open=x.dataset.opo==="1";rs();return}});
{const s=document.createElement("style");s.textContent=`.opush{display:grid;gap:8px}.opush.mini{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px}.opush.mini button{min-height:36px}.oplist{display:grid;gap:6px}.oplh{display:flex;justify-content:space-between;align-items:center;gap:8px}.oplh button{min-height:34px}.opli{display:grid;gap:2px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04)}.opli.nw{background:rgba(190,242,100,.1);border:1px solid rgba(190,242,100,.35)}.opli span{font-size:.9em}.opli small{opacity:.7}.oplm{min-height:36px}`;document.head.appendChild(s)}
})();
