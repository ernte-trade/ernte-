// ===== ERNTE · NA ODOSLANIE (schvaľuje majiteľ) + SCHRÁNKA PRÍJEMCU =====
// Aplikácia sama pripraví správy (žiadosť o podpis, schválený vývoz trusu, upozornenia a výzvy pre vodičov).
// Nič neodíde bez ťuknutia majiteľa „Odoslať“. Príjemca ju uvidí v aplikácii a – ak si zapol upozornenia – aj v mobile.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tm=(t,ms)=>typeof toast==="function"?toast(t,ms):alert(t);
const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"";
const telOf=p=>String(p||"").replace(/\D/g,"").replace(/^00/,"").replace(/^0/,"421");
const KI={farmer:["👨‍🌾","Farmár"],driver:["🚛","Vodič"],partner:["🐔","Partner trusu"]};
const st=document.createElement("style");st.textContent=`
.obbtn{position:relative}.obbtn .obn{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:10px;background:#f59e0b;color:#111;font:800 .72rem/20px system-ui;text-align:center;padding:0 5px}
.obbtn.on{animation:obp 2s ease-in-out infinite}@keyframes obp{50%{box-shadow:0 0 0 4px rgba(245,158,11,.35)}}@media (prefers-reduced-motion:reduce){.obbtn.on{animation:none}}
.obmod{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:10px}
@media(min-width:700px){.obmod{align-items:center}}
.obbox{width:min(640px,100%);max-height:92vh;overflow:auto;display:grid;gap:12px;padding:18px;border-radius:24px;background:linear-gradient(160deg,rgba(28,34,46,.97),rgba(12,16,24,.98));border:1px solid rgba(255,255,255,.16);color:#eef2f7}
html[data-theme=light] .obbox{background:#fff;color:#0f172a}
.obhd{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:1.1rem}.obx{min-height:40px;min-width:40px;padding:0}
.obit{display:grid;gap:8px;padding:12px;border-radius:18px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04)}
html[data-theme=light] .obit{border-color:rgba(15,23,42,.14);background:rgba(15,23,42,.03)}
.obto{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.obto small{opacity:.7}.obit input,.obit textarea{width:100%;box-sizing:border-box}.obit textarea{min-height:90px;font:inherit}
.obres{display:grid;gap:8px;padding:12px;border-radius:16px;border:1px solid rgba(52,211,153,.5);background:rgba(52,211,153,.08)}
.inbx{border-color:rgba(124,196,255,.55)!important}.inbx .inm{display:grid;gap:4px;padding:10px 0;border-top:1px solid var(--line,rgba(255,255,255,.12))}.inbx .inm:first-of-type{border-top:0}
.inbx .inm p{margin:0;white-space:pre-wrap}.npush ol{margin:6px 0;padding-left:20px}.npush li{margin:4px 0}`;document.head.appendChild(st);

// ---------- MAJITEĽ ----------
let OB={n:0,list:null,sent:null,tab:"wait",res:{}},obTimer=null;
const isOwner=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
async function obCount(){if(!isOwner())return;try{const r=await sb.from("notify_outbox").select("id",{count:"exact",head:true}).eq("status","caka");if(r.error)return;const n=r.count||0;
  if(n>OB.n&&OB.n>=0&&obTimer)tm(`📤 Máš ${n} ${n===1?"správu":n<5?"správy":"správ"} na odoslanie – ťukni na 📤 hore.`,6000);OB.n=n;paintBtn()}catch(x){}}
function paintBtn(){const hr=document.querySelector("#app .hrow");if(!hr||!isOwner())return;let b=hr.querySelector(".obbtn");
  if(!b){b=document.createElement("button");b.type="button";b.className="ds-theme obbtn";b.dataset.obopen="1";b.setAttribute("aria-label","Na odoslanie");b.title="Na odoslanie – správy čakajú na tvoje schválenie";hr.prepend(b)}
  b.innerHTML=`📤${OB.n?`<span class="obn">${OB.n}</span>`:""}`;b.classList.toggle("on",OB.n>0)}
if(typeof window.renderStaff==="function"){const _rs=window.renderStaff;window.renderStaff=function(){const r=_rs.apply(this,arguments);try{paintBtn();if(!obTimer&&isOwner()){obCount();obTimer=setInterval(()=>{if(!document.hidden)obCount()},60e3)}}catch(x){}return r}}
async function obLoad(){const [a,b]=await Promise.all([sb.from("notify_outbox").select("*").eq("status","caka").order("created_at",{ascending:false}).limit(100),
  sb.from("notify_outbox").select("id,to_kind,to_name,title,status,sent_at,read_at,pushed").neq("status","caka").order("sent_at",{ascending:false}).limit(60)]);
  OB.list=a.error?{err:a.error.message}:a.data||[];OB.sent=b.data||[];OB.n=Array.isArray(OB.list)?OB.list.length:OB.n;paintBtn()}
function obHTML(){const L=OB.list;let h=`<div class="obbox"><div class="obhd"><b>📤 Na odoslanie</b><button type="button" class="obx" data-obclose aria-label="Zavrieť">✕</button></div>
  <div class="btns seg2"><button type="button" data-obtab="wait" aria-pressed="${OB.tab==="wait"}">Čaká (${Array.isArray(L)?L.length:0})</button><button type="button" data-obtab="sent" aria-pressed="${OB.tab==="sent"}">Odoslané</button></div>`;
  if(!L)return h+`<div class="s">Načítavam…</div></div>`;
  if(L.err)return h+`<div class="s">${/notify_outbox/.test(L.err)?"Zapne sa po aktualizácii databázy (pár minút).":e(L.err)}</div></div>`;
  if(OB.tab==="sent")return h+(OB.sent.length?OB.sent.map(o=>`<div class="obit"><div class="obto"><span>${KI[o.to_kind][0]}</span><b>${e(o.to_name||KI[o.to_kind][1])}</b><small>${e(o.title)}</small></div>
    <small>${o.status==="zamietnute"?"✕ neodoslané":"✓ odoslané "+e(dt(o.sent_at))}${o.status==="odoslane"?(o.read_at?" · 👁️ prečítané "+e(dt(o.read_at)):" · zatiaľ neprečítané"):""}${o.pushed?" · 📲 do mobilu":""}</small></div>`).join(""):`<div class="s">Zatiaľ nič.</div>`)+`</div>`;
  if(!L.length)return h+`<div class="s">✅ Nič nečaká. Keď aplikácia pripraví správu (žiadosť o podpis, schválený vývoz trusu, upozornenie alebo výzvu pre vodiča), zobrazí sa tu a príde ti upozornenie.</div></div>`;
  return h+`<div class="s">Skontroluj text, prípadne uprav, a ťukni <b>Odoslať</b>. Bez tvojho ťuknutia neodíde nič.</div>`+L.map(o=>{const R=OB.res[o.id];if(R)return resHTML(o,R);
    return `<form class="obit" data-obf="${e(o.id)}"><div class="obto"><span>${KI[o.to_kind][0]}</span><b>${e(o.to_name||KI[o.to_kind][1])}</b><small>${e(KI[o.to_kind][1])}${o.phone?" · "+e(o.phone):" · bez telefónu"} · ${e(dt(o.created_at))}</small></div>
    <input name="title" value="${e(o.title)}" aria-label="Nadpis"><textarea name="body" aria-label="Text">${e(o.body)}</textarea>
    <div class="btns"><button class="pri" name="a" value="send">✓ Odoslať</button><button class="ghost" name="a" value="no">✕ Neodoslať</button></div></form>`}).join("")+`</div>`}
function resHTML(o,R){const txt=R.kind==="driver"?`VALKO s.r.o.: ${R.title}. Prečítajte si a potvrďte prevzatie: ${R.link}`:`ERNTE: ${R.title}. ${String(R.body||"").slice(0,400)} ${R.link}`;window._obTxt=txt;
  return `<div class="obres"><b>✓ Odoslané – ${e(R.name||"")}</b><small>${R.kind==="driver"?"Vodič dostane odkaz na správu; keď ju otvorí a potvrdí, uvidíš „prečítané“.":R.pushed?"Príjemca to vidí v aplikácii a prišlo mu upozornenie do mobilu.":"Príjemca to uvidí po otvorení aplikácie. Upozornenia do mobilu si zatiaľ nezapol – pošli mu aj správu:"}</small>
   <div class="btns">${R.phone?`<a class="btn pri" target="_blank" rel="noopener" href="https://wa.me/${telOf(R.phone)}?text=${encodeURIComponent(txt)}">WhatsApp</a><a class="btn" href="sms:+${telOf(R.phone)}?&body=${encodeURIComponent(txt)}">SMS</a>`:""}<button type="button" data-obcopy="${e(o.id)}">📋 Kopírovať text</button></div></div>`}
function obRender(){let m=document.getElementById("obMod");if(!m){m=document.createElement("div");m.className="obmod";m.id="obMod";document.body.appendChild(m)}m.innerHTML=obHTML()}

// ---------- PRÍJEMCA (farmár, partner trusu) ----------
let IN=null,inBusy=false;
async function inLoad(){if(inBusy)return;inBusy=true;try{const r=await sb.rpc("my_inbox");IN=r.error?null:r.data}catch(x){IN=null}inBusy=false;inDecor()}
function inDecor(){const app=document.getElementById("app");if(!app||!IN)return;app.querySelectorAll(".inbx,.npush").forEach(x=>x.remove());
  const U=(IN.items||[]).filter(x=>!x.read_at);let h="";
  if(U.length)h+=`<div class="card inbx"><div class="t">🔔 ${U.length===1?"Nová správa od ERNTE":"Nové správy od ERNTE ("+U.length+")"}</div>${U.map(x=>`<div class="inm"><b>${e(x.title)}</b><p>${e(x.body)}</p><small>${e(dt(x.sent_at))}</small><div class="btns"><button type="button" data-inread="${e(x.id)}">✓ Rozumiem</button></div></div>`).join("")}</div>`;
  let skip=false;try{skip=localStorage.getItem("ernte-npush-skip")==="1"}catch(x){}
  if(!IN.push&&!skip)h+=`<div class="card npush"><div class="t">🔔 Upozornenia do mobilu</div><div class="s">Chcete vedieť o zmluve na podpis, autách a správach od ERNTE hneď – aj keď máte aplikáciu zatvorenú?</div><div class="btns"><button type="button" class="pri" data-npush>Zapnúť upozornenia</button><button type="button" data-npskip>Nie, ďakujem</button></div></div>`;
  if(h){const d=document.createElement("div");d.innerHTML=h;const first=app.querySelector(".sgban");[...d.children].reverse().forEach(c=>first?first.after(c):app.prepend(c))}}
window.inboxDecor=()=>{if(IN)inDecor();inLoad()};
if(typeof window.renderFarmer==="function"){const _rf=window.renderFarmer;window.renderFarmer=function(){const r=_rf.apply(this,arguments);try{IN?inDecor():inLoad()}catch(x){}return r}}
setInterval(()=>{if(document.hidden)return;if((typeof FARMER!=="undefined"&&FARMER)||document.querySelector(".trtabs"))inLoad()},90e3);
async function pushSetup(test){const r=await sb.rpc("my_notify_on",{p_test:!!test});if(r.error){tm(/my_notify_on/.test(r.error.message)?"Upozornenia sa zapnú po aktualizácii (pár minút).":r.error.message,6000);return}
  const tp=r.data,ios=/iPhone|iPad|iPod/.test(navigator.userAgent);const m=document.createElement("div");m.className="obmod";m.id="obMod";
  m.innerHTML=`<div class="obbox npush"><div class="obhd"><b>🔔 Zapnúť upozornenia</b><button type="button" class="obx" data-obclose aria-label="Zavrieť">✕</button></div>
   <ol><li>Nainštalujte si bezplatnú aplikáciu <b>ntfy</b>: <a href="${ios?"https://apps.apple.com/app/ntfy/id1625396347":"https://play.google.com/store/apps/details?id=io.heckel.ntfy"}" target="_blank" rel="noopener">${ios?"App Store":"Google Play"}</a>.</li>
   <li>Ťuknite sem: <a class="btn lime" href="ntfy://ntfy.sh/${e(tp)}">Prihlásiť odber ERNTE</a><br><small>Ak sa nič neotvorí: v ntfy ťuknite <b>+</b> a napíšte tento názov: <b class="num">${e(tp)}</b></small></li>
   <li>Ťuknite <button type="button" data-nptest>Poslať skúšobné upozornenie</button> – malo by vám prísť do mobilu.</li></ol>
   <div class="s">Upozornenie obsahuje iba „Máte novú správu od ERNTE“ – podrobnosti vidíte až v aplikácii.</div></div>`;document.body.appendChild(m);IN&&(IN.push=true)}

// ---------- udalosti ----------
document.addEventListener("click",async ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(g("[data-obopen]")){OB.tab="wait";OB.list=null;OB.res={};obRender();await obLoad();obRender();return}
  if(g("[data-obclose]")||ev.target.id==="obMod"){const m=document.getElementById("obMod");if(m)m.remove();if(Object.keys(OB.res).length){OB.res={};obCount()}return}
  if(x=g("[data-obtab]")){OB.tab=x.dataset.obtab;obRender();return}
  if(x=g("[data-obcopy]")){try{await navigator.clipboard.writeText(window._obTxt||"");tm("Skopírované ✓")}catch(y){}return}
  if(x=g("[data-inread]")){await sb.rpc("inbox_read",{p_id:x.dataset.inread});await inLoad();return}
  if(g("[data-npush]")){await pushSetup(false);return}
  if(g("[data-nptest]")){const r=await sb.rpc("my_notify_on",{p_test:true});tm(r.error?r.error.message:"Odoslané – pozrite sa do mobilu.",5000);return}
  if(g("[data-npskip]")){try{localStorage.setItem("ernte-npush-skip","1")}catch(y){}inDecor();return}
});
document.addEventListener("submit",async ev=>{const f=ev.target;if(!f.dataset||!f.dataset.obf)return;ev.preventDefault();const b=ev.submitter,id=f.dataset.obf,F=new FormData(f);if(typeof busy==="function")busy(b,true);
  try{if(b&&b.value==="no"){const r=await sb.rpc("outbox_reject",{p_id:id});if(r.error){tm(r.error.message,6000);return}OB.list=OB.list.filter(o=>o.id!==id);OB.n=OB.list.length;paintBtn();obRender();return}
    const r=await sb.rpc("outbox_send",{p_id:id,p_title:F.get("title"),p_body:F.get("body")});if(r.error){tm(r.error.message,6000);return}
    OB.res[id]=r.data;OB.n=Math.max(0,OB.n-1);paintBtn();obRender()}finally{if(typeof busy==="function")busy(b,false)}},true);
})();
