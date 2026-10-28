// ===== 🔔 PUSH CENTRUM (aplikácia) =====
// • adresy z upozornení: #flotila/alarm/ev<ID> (detail alarmu), #tab/<záložka>, #kalendar(/ack/<kód>) – otvorí priamo správne miesto
// • odznak s počtom nových alarmov na ikone aplikácie (Badging API), inak počet v názve stránky
// • Flotila → ⚙️ Nastavenia → 🔔 Notifikácie: témy ntfy (Kopírovať, QR na odber), prepínače stupňov, typov udalostí, osôb a tichých hodín, testy
// • Flotila → ⚙️ Nastavenia → 🩺 Diagnostika: diagnostika dát, posledných 20 odoslaní (HTTP kód, chyby), Stav úloh AI
// • výpis palivových kariet: obdobie, posledný import, poskytovatelia kariet, pokrytie skupín (Nafta, Prehľad, Nastavenia)
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const FLEET=()=>typeof ROLE!=="undefined"&&(ROLE==="owner"||ROLE==="dispatch")&&!(typeof FARMER!=="undefined"&&FARMER);
const MAIN=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const STAFF=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER);
const T=(m,ms)=>{if(typeof toast==="function")toast(m,ms||5000)};
const RS=()=>{try{if(typeof renderStaff==="function"&&typeof STATE!=="undefined"&&STATE.reqs)renderStaff()}catch(x){}};
const SG=k=>{try{return localStorage.getItem(k)}catch(x){return null}},SS=(k,v)=>{try{localStorage.setItem(k,v)}catch(x){}};
const dt=a=>a?new Date(a).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"";
const dd=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v||"");return m?`${+m[3]}. ${+m[2]}.`:""};
const inSet=()=>typeof TAB!=="undefined"&&TAB==="fleet"&&typeof STATE!=="undefined"&&STATE.fsec==="set";

function css(){if(document.getElementById("pcCss"))return;const s=document.createElement("style");s.id="pcCss";s.textContent=`
.pcw{display:grid;gap:12px;min-width:0}
.pcw .card{min-width:0}
.pct{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}
.pct:first-of-type{border-top:0}
.pct>div>b{display:block;font-size:.95rem}.pct>div>small{display:block;opacity:.72;font-size:.78rem;line-height:1.35;overflow-wrap:anywhere}
.pctop{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;word-break:break-all;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px;margin:6px 0}
.pcqr{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-top:8px}
.pcqr canvas{background:#fff;border-radius:12px;padding:8px;width:156px;height:156px;flex-shrink:0;image-rendering:pixelated}
.pcqr .btns{flex:1 1 180px;min-width:0}
.pcsw{position:relative;width:52px;height:30px;flex-shrink:0;border-radius:99px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);cursor:pointer;padding:0;min-height:30px}
.pcsw::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#cfd6df;transition:transform .18s,background .18s}
.pcsw[aria-checked=true]{background:linear-gradient(135deg,#9BE83A,#5fd38d);border-color:transparent}
.pcsw[aria-checked=true]::after{transform:translateX(22px);background:#0b1510}
.pcq{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px}
.pcq label{display:flex;gap:6px;align-items:center;font-size:.85rem}
.pcq select{min-height:40px}
.pcppl{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px;margin-top:8px;max-height:280px;overflow:auto;padding-right:2px}
.pcppl label{display:flex;gap:8px;align-items:center;min-height:40px;padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:.85rem;min-width:0}
.pcppl label span{min-width:0;overflow-wrap:anywhere}
.pcppl input{width:20px;height:20px;flex-shrink:0}
.pclog{display:grid;gap:6px;margin-top:8px}
.pcl{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:start;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:.82rem}
.pcl b{display:block;overflow-wrap:anywhere;font-weight:600}.pcl small{display:block;opacity:.7;overflow-wrap:anywhere}
.pcl .pch{font-family:ui-monospace,monospace;font-size:.78rem;padding:2px 8px;border-radius:99px;background:rgba(182,255,59,.15);color:#c9ff7a;white-space:nowrap}
.pcl .pch.bad{background:rgba(255,107,129,.18);color:#ffb3c0}.pcl .pch.q{background:rgba(148,163,184,.18);color:#cbd5e1}
.pckpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-top:6px}
.pckpi div{padding:10px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);min-width:0}
.pckpi b{display:block;font-size:1.3rem}.pckpi small{opacity:.7;font-size:.75rem}
.pckpi .bad b{color:#ff8a9a}
.pcflt{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.pcflt button{min-height:40px;padding:0 12px;border-radius:99px}
.pcflt button[aria-pressed=true]{background:linear-gradient(135deg,#D2FF6E,#9BE83A);color:#0B1510;border-color:transparent}
.pctask{display:grid;gap:4px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);font-size:.84rem;min-width:0}
.pctask .h{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pctask p{margin:0;overflow-wrap:anywhere;line-height:1.4}
.pctask small{opacity:.72;overflow-wrap:anywhere}
.pcst{font-size:.74rem;font-weight:700;padding:2px 9px;border-radius:99px;white-space:nowrap}
.pcst.nova{background:rgba(148,163,184,.2);color:#e2e8f0}.pcst.odoslana{background:rgba(250,204,21,.18);color:#fde68a}
.pcst.hotova{background:rgba(182,255,59,.16);color:#c9ff7a}.pcst.chyba{background:rgba(255,107,129,.2);color:#ffb3c0}
.pctask.late{border-color:rgba(250,204,21,.55)}
.pcprov{display:grid;gap:8px;margin-top:8px}
.pcpr{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);min-width:0}
.pcpr label{display:grid;gap:4px;font-size:.78rem;min-width:0}.pcpr input,.pcpr select{min-height:40px;min-width:0;width:100%}
.pcpr .x{align-self:end;min-height:40px}
.pccov{display:grid;gap:6px;margin-top:8px}
.pccov div{display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:space-between;padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:.84rem}
.pccov div.bad{border-color:rgba(255,107,129,.6);background:rgba(239,68,68,.12)}
.cwait{color:#aeb8c4!important;opacity:.95}
.kvban{display:block;margin:8px 0;padding:10px 14px;border-radius:14px;font-size:.88rem;line-height:1.4;overflow-wrap:anywhere}
.kvban.r{background:rgba(239,68,68,.16);border:1px solid rgba(255,107,129,.6);color:#ffd0d7}
.kvban.g{background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.35);color:#cbd5e1}
.kvban.w{background:rgba(250,204,21,.12);border:1px solid rgba(250,204,21,.45);color:#fde68a}
.xai.alhi{outline:3px solid #b6ff3b;outline-offset:3px;animation:alhi 1.2s ease 3}
@keyframes alhi{50%{outline-color:rgba(182,255,59,.15)}}
html[data-theme=light] .pctop,html[data-theme=light] .pcl,html[data-theme=light] .pctask,html[data-theme=light] .pcppl label,html[data-theme=light] .pcpr,html[data-theme=light] .pccov div,html[data-theme=light] .pckpi div{background:rgba(15,23,42,.04);border-color:rgba(15,23,42,.12)}
html[data-theme=light] .kvban.g{color:#334155}html[data-theme=light] .kvban.r{color:#9f1239}html[data-theme=light] .kvban.w{color:#854d0e}html[data-theme=light] .cwait{color:#64748b!important}
@media (prefers-reduced-motion:reduce){.xai.alhi{animation:none}}`;document.head.appendChild(s)}

/* ---------------- 1) adresy z upozornení ---------------- */
function parse(h){h=String(h||"");let m;
  if((m=/^#flotila\/alarm\/ev(\d+)/i.exec(h)))return {tab:"fleet",fsec:"alarm",ev:+m[1]};
  if((m=/^#tab\/([a-z]+)/i.exec(h)))return {tab:m[1].toLowerCase()};
  if((m=/^#kalendar(?:\/ack\/([0-9a-f]{24}))?/i.exec(h)))return {tab:"cal",tok:m[1]||null};
  return null}
let PEND=parse(location.hash);
if(PEND){try{sessionStorage.setItem("ernte-welcome-skip","1");setTimeout(()=>{try{sessionStorage.removeItem("ernte-welcome-skip")}catch(x){}},15000)}catch(x){}}
function ack(tok){if(!tok||typeof sb==="undefined")return;sb.rpc("cal_ack",{p_tok:tok}).then(r=>{const v=r&&r.data;T(v==="ok"?"✓ Beriem na vedomie – zvonenie stíchlo.":v==="už potvrdené"?"✓ Už potvrdené.":"Pripomienku sa nepodarilo potvrdiť.",5000)},()=>{})}
function hiAlarm(id,n){const el=document.getElementById("al-ev_"+id);
  if(el){el.classList.add("alhi");el.scrollIntoView({block:"center",behavior:"smooth"});setTimeout(()=>el.classList.remove("alhi"),6000);return}
  if(n===0&&typeof STATE!=="undefined"){STATE.fsec="fuel";STATE.fsub=STATE.fsub||{};STATE.fsub.fuel="main";RS();setTimeout(()=>hiAlarm(id,1),400);return}
  if(n===1)T("Alarm je v zozname – mohol už byť vyriešený alebo je mimo zvoleného obdobia.",5000)}
function apply(p){if(!p)return true;if(p.tok)ack(p.tok);
  if(!STAFF()||typeof renderStaff!=="function"||typeof STATE==="undefined"||!STATE.reqs)return false;
  const w=document.querySelector(".wlc [data-wlx]");if(w)w.click();
  if(p.tab==="cal"&&!MAIN())return true;
  if(p.tab==="fleet"&&!FLEET())return true;
  try{TAB=p.tab;if(p.fsec){STATE.fsec=p.fsec;if(p.ev)STATE.afl="all"}RS();window.scrollTo(0,0)}catch(x){}
  if(p.ev)setTimeout(()=>hiAlarm(p.ev,0),500);
  try{history.replaceState(null,"",location.pathname+location.search)}catch(x){}
  return true}
function pending(){let n=0;const t=setInterval(()=>{n++;if(!PEND||apply(PEND)||n>80){PEND=null;clearInterval(t)}},500)}
if(PEND)pending();
addEventListener("hashchange",()=>{const p=parse(location.hash);if(p){PEND=p;pending()}});
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener("message",e=>{const d=e.data||{};if(d.type==="ernte-open"&&d.url){try{const p=parse(new URL(d.url).hash);if(p){PEND=p;pending()}}catch(x){}}});

/* ---------------- 2) odznak na ikone ---------------- */
const BK="ernte-badge-seen";let BT0=null,BN=0;
async function badge(){if(!FLEET()||typeof sb==="undefined"||window.ERNTE_VIEWAS)return;
  try{const seen=+(SG(BK)||0);const r=await sb.rpc("push_badge",{p_after:seen});if(r.error)return;const d=r.data||{};
    if(!seen&&d.max){SS(BK,String(d.max));BN=0}else BN=+d.n||0;
    // pri otvorených alarmoch sa počet vynuluje
    if(typeof TAB!=="undefined"&&TAB==="fleet"&&typeof STATE!=="undefined"&&(STATE.fsec==="alarm"||STATE.fsec==="fuel")&&!document.hidden&&d.max){SS(BK,String(d.max));BN=0}
    setBadge(BN)}catch(x){}}
function setBadge(n){try{if(navigator.setAppBadge){n?navigator.setAppBadge(n):navigator.clearAppBadge&&navigator.clearAppBadge()}}catch(x){}
  if(BT0===null)BT0=document.title.replace(/^\(\d+\+?\)\s*/,"");document.title=(n?`(${n>99?"99+":n}) `:"")+BT0}
setInterval(badge,60000);setTimeout(badge,8000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(badge,1500)});
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest('[data-fsec="alarm"],[data-fsec="fuel"]'))setTimeout(badge,1500)});

/* ---------------- 3) Notifikácie ---------------- */
const N={cfg:null,busy:false,err:"",open:{}};
async function nLoad(p){if(N.busy)return;N.busy=true;try{const r=await sb.rpc("push_settings",{p:p||null});if(r.error){N.err=/push_settings|schema cache|function/i.test(r.error.message)?"Notifikácie sa zapnú po aktualizácii databázy (do pár minút).":r.error.message}else{N.cfg=r.data;N.err=""}}catch(x){N.err=String(x.message||x)}N.busy=false;if(inSet())RS()}
let QRL=null;function qrLib(){if(window.ERNTE_QR)return Promise.resolve();if(QRL)return QRL;QRL=new Promise(res=>{const s=document.createElement("script");s.src="vendor/qrcode-0.12.0.js?v=1";s.onload=res;s.onerror=res;document.head.appendChild(s)});return QRL}
function drawQR(){document.querySelectorAll("canvas[data-qr]:not(.ok)").forEach(cv=>{if(!window.ERNTE_QR){qrLib().then(drawQR);return}
  try{const Q=window.ERNTE_QR,q=new Q.QRCode(-1,Q.L.M);q.addData(cv.dataset.qr);q.make();const n=q.getModuleCount(),s=4,b=2;cv.width=cv.height=(n+b*2)*s;const g=cv.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,cv.width,cv.height);g.fillStyle="#0b1510";
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))g.fillRect((c+b)*s,(r+b)*s,s,s);cv.classList.add("ok")}catch(x){}})}
new MutationObserver(()=>{if(document.querySelector("canvas[data-qr]:not(.ok)"))drawQR()}).observe(document.documentElement,{childList:true,subtree:true});
const sw=(path,on,lbl,sub)=>`<div class="pct"><div><b>${lbl}</b>${sub?`<small>${sub}</small>`:""}</div><button type="button" class="pcsw" role="switch" aria-checked="${!!on}" aria-label="${E(lbl)}" data-pcsw="${E(path)}"></button></div>`;
const hours=(sec,c)=>{const o=h=>Array.from({length:24},(_,i)=>`<option value="${i}"${+h===i?" selected":""}>${String(i).padStart(2,"0")}:00</option>`).join("");
  return `<div class="pcq"><label>od<select data-pch="${sec}:q_from">${o(c.q_from??22)}</select></label><label>do<select data-pch="${sec}:q_to">${o(c.q_to??(sec==="fleet"?5:6))}</select></label></div>`};
function topic(lbl,t,who){if(!t)return `<div class="pct"><div><b>${lbl}</b><small>téma nie je nastavená</small></div></div>`;
  const url="https://ntfy.sh/"+t;
  return `<div class="card"><b class="sth">${lbl}</b><small class="s">${who}</small><div class="pctop">${E(t)}</div>
   <div class="pcqr"><canvas data-qr="${E(url)}" aria-label="QR kód na odber ${E(lbl)}"></canvas><div class="btns" style="display:flex;flex-direction:column;gap:8px;align-items:stretch">
    <button type="button" class="pri" data-pccopy="${E(t)}">📋 Kopírovať názov témy</button><a class="btn" href="${E(url)}" target="_blank" rel="noopener">Odoberať v ntfy</a>
    <small class="s">V aplikácii <b>ntfy</b> (App Store / Google Play): ➕ → vlož názov témy, alebo naskenuj QR kód fotoaparátom.</small></div></div></div>`}
window.vNotif=function(){css();if(!OWN())return "";
  if(!N.cfg&&!N.err){nLoad();return `<div class="card"><div class="s">Načítavam nastavenie upozornení…</div></div>`}
  if(N.err&&!N.cfg)return `<div class="card"><div class="s">${E(N.err)}</div></div>`;
  const c=N.cfg,F=c.fleet||{},A=c.app||{},W=Array.isArray(A.watch)?A.watch:[],P=c.people||[];
  let h=`<div class="pcw"><h2>🔔 Notifikácie</h2>
   <div class="card"><b class="sth">Kanály</b>${sw("ntfy",c.ntfy!==false,"Aplikácia ntfy (zvonenie aj pri zatvorenej aplikácii, aj v noci)","Téma = súkromný kanál. Kto ju odoberá, dostáva upozornenia.")}
    <div class="pct"><div><b>Upozornenia aplikácie v tomto zariadení</b><small>${c.subs?`Zariadenia s upozorneniami: <b>${c.subs}</b>`:"Zatiaľ žiadne zariadenie"} · iPhone iba z ikony na ploche</small></div><button type="button" data-pcwp="1">Zapnúť</button></div>
    <div class="btns" style="margin-top:8px"><button type="button" class="pri" data-pctest="fleet">🔔 Poslať testovacie upozornenie</button><button type="button" data-pctest="app">Test aplikácie</button>${MAIN()?`<button type="button" data-pctest="cal">⏰ Test zvonenia</button>`:""}</div></div>`;
  h+=topic("🚨 Flotila – alarmy",c.topic_fleet,"Spoločná téma flotily (alarmy, súhrny). Môžu ju odoberať aj vedúci dopravy.");
  h+=topic("👤 Majiteľ – obchod a aplikácia",c.topic_owner,"Súkromná téma majiteľa: požiadavky, obchody, burza, prihlásenia, aktivita, cenník.");
  if(c.topic_cal)h+=topic("⏰ Kalendár – iba Martin",c.topic_cal,"Pripomienky stretnutí so zvonením (priorita 5) a tlačidlom „Beriem na vedomie“.");
  h+=`<div class="card"><b class="sth">🚨 Alarmy Flotily</b>
    ${sw("fleet.on",F.on!==false,"Upozornenia na alarmy Flotily","Rovnaké auto a typ alarmu najviac raz za 2 h. Vyriešené, falošné, auto na servise / odstavené a spätne prepočítané sa neposielajú.")}
    ${sw("fleet.high",F.high!==false,"VYSOKÝ – hneď, so zvukom, aj v noci","Zaplatené, ale nie v nádrži · pokles v státí ≥ 30 l · prečerpanie medzi autami · N3 nad 100 km/h · auto bez signálu nad 12 h")}
    ${sw("fleet.mid",F.mid!==false,"STREDNÝ – súhrn raz za hodinu","Tankovanie nesedí · rýchlosť N2/N3 nad 90, M1/N1 nad 130 km/h · karta iného auta · kabotáž")}
    ${sw("fleet.low",F.low!==false,"NÍZKY – iba ranný súhrn o 5:00","Výpadok dát a ostatné")}
    ${sw("fleet.quiet",F.quiet!==false,"Tiché hodiny pre STREDNÝ","V tomto čase sa hodinový súhrn nepošle – príde v rannom súhrne.")}${hours("fleet",F)}</div>`;
  const TY=[["req","📥 Nová požiadavka","priorita 5"],["deal","🤝 Obchody – nový, stav, cena, tony, dodané t","priorita 5"],["burza","📈 Burza ±2 % / ±8 €/t, výkupná cena nad burzou","priorita 5"],
    ["cennik_exp","📅 Koniec platnosti cenníka (3 dni a 1 deň vopred)","priorita 4"],["aitask","⏳ Úloha AI čaká viac ako 2 h","priorita 4"],["login","🔓 Prihlásenie a odhlásenie používateľov","priorita 3"],["act","📝 Aktivita – farmári, Doprava, dokumenty, mzdy, nastavenia","priorita 3"]];
  h+=`<div class="card"><b class="sth">👤 Aplikácia</b>${sw("app.on",A.on!==false,"Upozornenia z aplikácie","O tvojich vlastných akciách upozornenia nechodia. Rovnaký objekt a typ najviac raz za 10 min (zlúčené „uložené 5×“).")}
    ${TY.map(x=>sw("app."+x[0],A[x[0]]!==false,x[1],x[2])).join("")}
    ${sw("app.quiet",A.quiet!==false,"Tiché hodiny pre prioritu 3 a nižšiu","Priorita 4–5 chodí vždy; tiché presunie do ranného súhrnu o 5:00.")}${hours("app",A)}
    <details class="sub"${N.open.ppl?" open":""} data-pcdet="ppl"><summary class="s" style="cursor:pointer;min-height:40px;display:flex;align-items:center">👥 Koho prihlásenie a aktivitu sledovať · ${W.length?W.length+" vybraných":"všetkých"}</summary>
     <div class="s">Nič nevybraté = všetci. Zmena sa uloží hneď.</div><div class="pcppl">${P.map(p=>`<label><input type="checkbox" data-pcw="${E(p.k)}"${W.includes(p.k)?" checked":""}><span>${E(p.n)} <small class="s">${E(p.r||"")}</small></span></label>`).join("")||`<div class="s">Žiadni používatelia.</div>`}</div></details></div>`;
  if(c.cal)h+=`<div class="card"><b class="sth">⏰ Kalendár</b>${sw("cal.on",c.cal.on!==false,"Pripomienky stretnutí so zvonením","1 deň vopred o 18:00, 1 h a 15 min pred začiatkom · 15 min pred: opakovanie každé 2 min (najviac 5×), kým neťukneš „Beriem na vedomie“.")}</div>`;
  return h+`</div>`};
function setPath(path,v){const [a,b]=path.split(".");return b?{[a]:{[b]:v}}:{[a]:v}}
document.addEventListener("click",async e=>{const t=e.target;let x;
  if((x=t.closest("[data-pcsw]"))){const on=x.getAttribute("aria-checked")!=="true";x.setAttribute("aria-checked",String(on));const p=setPath(x.dataset.pcsw,on);
    const r=await sb.rpc("push_settings",{p});if(r.error){T("Chyba: "+r.error.message);x.setAttribute("aria-checked",String(!on));return}N.cfg=r.data;T(on?"✓ Zapnuté":"Vypnuté",2500);return}
  if((x=t.closest("[data-pccopy]"))){const v=x.dataset.pccopy;let ok=false;try{await navigator.clipboard.writeText(v);ok=true}catch(y){try{const a=document.createElement("textarea");a.value=v;a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();ok=document.execCommand("copy");a.remove()}catch(z){}}
    T(ok?"✓ Názov témy skopírovaný – vlož ho v aplikácii ntfy (➕).":"Kopírovanie nefunguje – podrž prst na názve a skopíruj ho.",5000);return}
  if((x=t.closest("[data-pctest]"))){x.disabled=true;const r=await sb.rpc("push_test",{p_kind:x.dataset.pctest});x.disabled=false;
    if(r.error){T("Chyba: "+r.error.message,6000);return}T("✓ Testovacie upozornenie odoslané – o chvíľu príde do mobilu. Výsledok (HTTP kód) je v 🩺 Diagnostike.",6000);D.at=0;return}
  if((x=t.closest("[data-pcwp]"))){if(window.opushAuto){await window.opushAuto(true);T("Ak telefón povolil upozornenia, aplikácia ich teraz dostáva.",5000);nLoad()}return}
  if((x=t.closest("[data-pcdet]"))){N.open[x.dataset.pcdet]=!x.open}});
document.addEventListener("change",async e=>{const t=e.target;
  if(t.matches&&t.matches("[data-pch]")){const [sec,k]=t.dataset.pch.split(":");const r=await sb.rpc("push_settings",{p:{[sec]:{[k]:+t.value}}});if(r.error)T("Chyba: "+r.error.message);else{N.cfg=r.data;T("✓ Tiché hodiny uložené",2500)}return}
  if(t.matches&&t.matches("[data-pcw]")){N.open.ppl=true;const L=[...document.querySelectorAll("[data-pcw]")].filter(i=>i.checked).map(i=>i.dataset.pcw);
    const r=await sb.rpc("push_settings",{p:{app:{watch:L}}});if(r.error)T("Chyba: "+r.error.message);else{N.cfg=r.data;T(L.length?`✓ Sledujem ${L.length} ${L.length===1?"osobu":L.length<5?"osoby":"osôb"}`:"✓ Sledujem všetkých",2500)}}});

/* ---------------- 4) Diagnostika: odoslania + stav úloh AI ---------------- */
const D={data:null,busy:false,err:"",tasks:null,terr:"",flt:"all",at:0};
async function dLoad(){if(D.busy)return;D.busy=true;
  try{const [a,b]=await Promise.all([sb.rpc("push_diag"),sb.from("ai_tasks").select("id,text,status,created_at,done_at,report").order("created_at",{ascending:false}).limit(30)]);
    if(a.error)D.err=/push_diag|schema cache|function/i.test(a.error.message)?"Denník upozornení sa zapne po aktualizácii databázy (do pár minút).":a.error.message;else{D.data=a.data;D.err=""}
    if(b.error)D.terr=b.error.message;else{D.tasks=b.data||[];D.terr=""}}catch(x){D.err=String(x.message||x)}
  D.at=Date.now();D.busy=false;if(inSet())RS()}
const SRC={fleet:"🚨",app:"👤",cal:"⏰",test:"🧪"},CH={ntfy:"ntfy",web:"aplikácia",queue:"súhrn",none:"–"};
function logRow(x){const bad=(x.http!=null&&(x.http>=300||x.http===0))||(x.err&&/nedoruč|chyba|error|nie je|vypnut|bez odpovede|nevyzdvihol/i.test(x.err)),q=x.ch==="queue";
  const code=q?"súhrn":x.http!=null?(x.http===0?"bez odp.":"HTTP "+x.http):x.ch==="web"||x.ch==="ntfy"?"čaká":"–";
  return `<div class="pcl"><span>${SRC[x.src]||"🔔"}</span><div><b>${E(x.t||x.kind||"")}${x.n>1?` · ${x.n}×`:""}</b><small>${E(dt(x.at))} · ${E(CH[x.ch]||x.ch)}${x.prio?` · priorita ${x.prio}`:""}${x.err?` · ${E(x.err)}`:""}</small></div><span class="pch${bad?" bad":q?" q":""}">${E(code)}</span></div>`}
const TS={nova:"nová",odoslana:"odoslaná",hotova:"hotová",chyba:"chyba"};
function taskRow(t){const late=t.status==="odoslana"&&Date.now()-new Date(t.created_at)>2*36e5,txt=String(t.text||"").replace(/\s+/g," ");
  return `<div class="pctask${late?" late":""}"><div class="h"><span class="pcst ${E(t.status)}">${E(TS[t.status]||t.status)}</span><small>vytvorená ${E(dt(t.created_at))}${t.done_at?` · nasadená ${E(dt(t.done_at))}`:""}${late?" · ⚠️ čaká viac ako 2 h":""}</small></div>
   <p>${E(txt.length>120?txt.slice(0,120)+"…":txt)}</p>${t.status==="chyba"&&t.report?`<small style="color:#ffb3c0">❌ ${E(String(t.report).slice(0,240))}</small>`:""}</div>`}
window.vDiag=function(){css();if(!OWN())return "";if(!D.at&&!D.busy)dLoad();
  let h=`<div class="pcw"><div class="aidiag"></div><div class="card"><div class="tdh"><b>🔔 Upozornenia do mobilu</b><button type="button" data-pcdr="1">↻ Obnoviť</button></div>`;
  if(D.err)h+=`<div class="s">${E(D.err)}</div>`;
  else if(!D.data)h+=`<div class="s">Načítavam…</div>`;
  else{const d=D.data;h+=`<div class="pckpi"><div><b>${d.n24||0}</b><small>odoslaní za 24 h</small></div><div><b>${d.ntfy24||0}</b><small>ntfy</small></div><div><b>${d.web24||0}</b><small>aplikácia</small></div><div><b>${d.q24||0}</b><small>do súhrnov</small></div><div class="${d.err24?"bad":""}"><b>${d.err24||0}</b><small>chyby za 24 h</small></div></div>
    ${(d.errs||[]).length?`<b class="sth" style="margin-top:10px">❌ Chyby za 24 h</b><div class="pclog">${d.errs.map(x=>logRow(Object.assign({src:"",ch:x.ch},x))).join("")}</div>`:""}
    <b class="sth" style="margin-top:10px">Posledných 20 odoslaní</b><div class="pclog">${(d.last||[]).map(logRow).join("")||`<div class="s">Zatiaľ nič neodišlo.</div>`}</div>`}
  h+=`</div><div class="card"><b class="sth">🤖 Stav úloh AI</b><div class="s">Posledných 30 úloh z Podpory. Ak úloha ostane „odoslaná“ viac ako 2 h, príde upozornenie do mobilu (priorita 4).</div>`;
  if(D.terr)h+=`<div class="s">${E(D.terr)}</div>`;
  else if(!D.tasks)h+=`<div class="s">Načítavam…</div>`;
  else{const L=D.tasks,cnt=k=>k==="all"?L.length:L.filter(t=>t.status===k).length;
    h+=`<div class="pcflt" role="group" aria-label="Filter podľa stavu">${[["all","všetky"],["nova","nové"],["odoslana","odoslané"],["hotova","hotové"],["chyba","chyby"]].map(([k,n])=>`<button type="button" data-pcflt="${k}" aria-pressed="${D.flt===k}">${n} <b>${cnt(k)}</b></button>`).join("")}</div>
     <div class="pclog">${L.filter(t=>D.flt==="all"||t.status===D.flt).map(taskRow).join("")||`<div class="s">Žiadne úlohy v tomto stave.</div>`}</div>`}
  return h+`</div></div>`};
document.addEventListener("click",e=>{let x;if((x=e.target.closest("[data-pcdr]"))){D.at=0;dLoad();return}if((x=e.target.closest("[data-pcflt]"))){D.flt=x.dataset.pcflt;RS()}});

/* ---------------- 5) výpis palivových kariet ---------------- */
const C={d:null,busy:false,err:"",prov:null,res:null};
async function cLoad(){if(C.busy)return;C.busy=true;try{const r=await sb.rpc("card_cfg_get");if(r.error)C.err=/card_cfg_get|schema cache|function/i.test(r.error.message)?"Obdobia výpisu sa zapnú po aktualizácii databázy (do pár minút).":r.error.message;else{C.d=r.data;C.err="";if(C.prov===null)C.prov=JSON.parse(JSON.stringify(r.data.providers||[]))}}catch(x){C.err=String(x.message||x)}C.busy=false;if(inSet())RS()}
window.cardCfgReload=()=>{C.d=null;C.prov=null;cLoad()};
const IV=[["polmesiac","polmesačne (1.–15. a 16.–koniec)"],["14","každých 14 dní"],["7","každý týždeň"],["mesiac","raz za mesiac"]];
const FLN_={region:"Flotila Región",eu:"Flotila EU",sluzobne:"Služobné autá",traktory:"Traktory"};
window.cardCfgHTML=function(){css();if(!FLEET())return "";if(!C.d&&!C.err){cLoad();return `<div class="s">Načítavam obdobie výpisu…</div>`}
  if(C.err&&!C.d)return `<div class="s">${E(C.err)}</div>`;
  const d=C.d,P=C.prov||[];
  let h=`<div class="sub" style="margin-top:10px"><b class="sth">📅 Obdobie výpisu kariet</b>
   <div class="pcq" style="align-items:flex-end"><label style="display:grid;gap:4px;min-width:0;flex:1 1 220px">Interval výpisu<select data-cdiv="1">${IV.map(x=>`<option value="${x[0]}"${(d.interval||"polmesiac")===x[0]?" selected":""}>${x[1]}</option>`).join("")}</select></label>
    <label style="display:grid;gap:4px;min-width:0;flex:1 1 160px">Posledný import kariet do<input type="date" data-cdlt="1" value="${E(d.last_to||"")}" max="${new Date().toISOString().slice(0,10)}"></label></div>
   <div class="s" style="margin-top:6px">${d.last_to?`Rozdiely nafty a € straty sa počítajú do <b>${E(dd(d.last_to))}</b> · ďalšie obdobie končí ${E(dd(d.next_end))} · výpis očakávaný ~<b>${E(dd(d.expected))}</b>${d.late?` · <b style="color:#ff8a9a">mešká</b>`:""} · Po nahraní výpisu sa obdobie posunie samo, rozdiely sa prepočítajú a súhrn príde do mobilu.`:"Zadaj dátum, do ktorého je nahraný posledný výpis."}</div>`;
  if((d.cov||[]).length)h+=`<div class="pccov">${d.cov.map(g=>`<div class="${g.chyba?"bad":""}"><b>${E(g.skupina)}</b><span>spotreba ${Math.round(g.spotreba_l).toLocaleString("sk-SK")} l · z kariet ${Math.round(g.karty_l).toLocaleString("sk-SK")} l${g.chyba?" · <b>chýba výpis kariet (iný poskytovateľ?)</b>":" ✓"}</span></div>`).join("")}</div>`;
  h+=`<details class="sub"><summary class="s" style="cursor:pointer;min-height:40px;display:flex;align-items:center">🏢 Poskytovatelia kariet (${P.length})</summary>
   <div class="s">Ak skupina tankuje cez iného poskytovateľa (napr. Flotila EU), zadaj ho – pri importe vyber, od koho výpis je. Párovanie na ŠPZ je automatické (ŠPZ alebo číslo karty v riadku).</div>
   <div class="pcprov">${P.map((p,i)=>`<div class="pcpr"><label>Názov<input data-cpv="${i}:name" value="${E(p.name||"")}" maxlength="60" placeholder="napr. Slovnaft, DKV, Shell"></label>
     <label>Skupina<select data-cpv="${i}:fleet"><option value="">všetky</option>${Object.entries(FLN_).map(([k,n])=>`<option value="${k}"${p.fleet===k?" selected":""}>${n}</option>`).join("")}</select></label>
     <label>Autá (ŠPZ, čiarkou)<input data-cpv="${i}:plates" value="${E(p.plates||"")}" placeholder="nechaj prázdne = celá skupina"></label>
     <label>Interval<select data-cpv="${i}:interval">${IV.map(x=>`<option value="${x[0]}"${(p.interval||"polmesiac")===x[0]?" selected":""}>${x[1]}</option>`).join("")}</select></label>
     <label>Import<select data-cpv="${i}:method">${[["csv","CSV / XLSX súbor"],["email","e-mail (preposlať)"],["api","API dodávateľa"]].map(x=>`<option value="${x[0]}"${(p.method||"csv")===x[0]?" selected":""}>${x[1]}</option>`).join("")}</select></label>
     <button type="button" class="x dng" data-cpdel="${i}" aria-label="Odstrániť poskytovateľa">✕ Odstrániť</button></div>`).join("")}</div>
   <div class="btns" style="margin-top:8px"><button type="button" data-cpadd="1">➕ Pridať poskytovateľa</button><button type="button" class="pri" data-cpsave="1">💾 Uložiť poskytovateľov</button></div></details>`;
  if(P.length)h+=`<label class="pcq" style="display:grid;gap:4px;margin-top:8px">Výpis, ktorý nahrávaš, je od<select data-cpsel="1"><option value="">– neuvedené –</option>${P.map(p=>`<option value="${E(p.name)}"${window.CARDPROV===p.name?" selected":""}>${E(p.name)}${p.fleet?" · "+E(FLN_[p.fleet]||p.fleet):""}</option>`).join("")}</select></label>`;
  return h+`</div>`};
async function cSave(p,msg){const r=await sb.rpc("card_cfg_set",{p});if(r.error){T("Chyba: "+r.error.message,6000);return false}C.d=r.data;C.prov=JSON.parse(JSON.stringify(r.data.providers||[]));
  const v=r.data.vysledok;T(v&&v.zmena?"✓ Obdobie do "+dd(v.do)+" spracované – rozdiely prepočítané, súhrn odišiel do mobilu.":msg||"✓ Uložené",6000);
  if(typeof loadFleetX==="function"){try{await loadFleetX()}catch(x){}}RS();return true}
document.addEventListener("change",e=>{const t=e.target;if(!t.matches)return;
  if(t.matches("[data-cdiv]"))cSave({interval:t.value},"✓ Interval výpisu uložený");
  else if(t.matches("[data-cdlt]")&&t.value)cSave({last_to:t.value},"✓ Dátum posledného výpisu uložený");
  else if(t.matches("[data-cpv]")){const [i,k]=t.dataset.cpv.split(":");if(C.prov&&C.prov[+i])C.prov[+i][k]=t.value}
  else if(t.matches("[data-cpsel]"))window.CARDPROV=t.value||null});
document.addEventListener("input",e=>{const t=e.target;if(t.matches&&t.matches("[data-cpv]")){const [i,k]=t.dataset.cpv.split(":");if(C.prov&&C.prov[+i])C.prov[+i][k]=t.value}});
document.addEventListener("click",e=>{let x;
  if((x=e.target.closest("[data-cpadd]"))){C.prov=C.prov||[];C.prov.push({name:"",fleet:"eu",plates:"",interval:"polmesiac",method:"csv"});RS();return}
  if((x=e.target.closest("[data-cpdel]"))){C.prov.splice(+x.dataset.cpdel,1);RS();return}
  if((x=e.target.closest("[data-cpsave]"))){cSave({providers:(C.prov||[]).filter(p=>String(p.name||"").trim())},"✓ Poskytovatelia uložení")}});
// pruhy v Nafte a na Prehľade
window.cardBannerHTML=function(FD,flt){css();if(!FD)return "";let h="";const G=(FD.skupiny||[]).filter(g=>g&&g.chyba);
  for(const g of G)h+=`<div class="kvban r" role="alert">⛽ <b>Skupina ${E(g.skupina)}: chýba výpis kariet (iný poskytovateľ?)</b> – spotreba ${Math.round(g.spotreba_l).toLocaleString("sk-SK")} l, z kariet 0 l. Rozdiel sa nepočíta do strát.</div>`;
  if(FD.vypis_mesko)h+=`<div class="kvban w" role="status">⏰ <b>Výpis kariet mešká</b> – obdobie po ${E(dd(FD.vypis_do))} ešte nie je nahrané (očakávaný ~${E(dd(FD.ocakavany_vypis))}). Flotila → ⚙️ Nastavenia → Výpis kariet.</div>`;
  else if(FD.caka_od)h+=`<div class="kvban g" role="status">⏳ Tankovania od ${E(dd(FD.caka_od))}: <b>čaká na výpis kariet</b> (očakávaný ~${E(dd(FD.ocakavany_vypis))}). Rozdiely nafty a straty sa počítajú do ${E(dd(FD.vypis_do))}</div>`;
  return h};
})();
