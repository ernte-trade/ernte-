// ===== ERNTE · ELEKTRONICKÝ PODPIS KÚPNEJ ZMLUVY =====
// Farmár sa podpíše prstom v aplikácii; ERNTE ho môže požiadať o podpis (aplikácia ho upozorní + WhatsApp).
// Podpis aj pečiatka sú iba v databáze; do PDF zmluvy ich dá funkcia contract_sigs (iba majiteľ, obchod a farmár sám).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"");
const tm=(t,ms)=>typeof toast==="function"?toast(t,ms):alert(t);
const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
const dd=x=>x?new Date(x).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"}):"";
let SF={},SS=null,SSload=false;
{const st=document.createElement("style");st.textContent=`.sgban{display:flex!important;align-items:center;gap:12px;border-color:rgba(251,191,36,.6)!important;box-shadow:0 0 0 1px rgba(251,191,36,.25),0 0 30px rgba(251,191,36,.18)!important;animation:sgpulse 2.4s ease-in-out infinite}.sgbi{font-size:1.9rem}.sgbt{flex:1;display:grid;gap:2px;min-width:0}.sgbt small{color:var(--muted)}.sgban .pri{flex:none}
@keyframes sgpulse{50%{box-shadow:0 0 0 1px rgba(251,191,36,.45),0 0 40px rgba(251,191,36,.32)}}@media (prefers-reduced-motion:reduce){.sgban{animation:none}}
@media(max-width:520px){.sgban{flex-wrap:wrap}.sgban .pri{width:100%}}
.card.sgneed{border-color:rgba(251,191,36,.55)!important}
.sgmod{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:10px}
@media(min-width:700px){.sgmod{align-items:center}}html.sgopen{overflow:hidden}
.sgbox{width:min(560px,100%);max-height:94vh;overflow:auto;display:grid;gap:12px;padding:18px;border-radius:24px;background:linear-gradient(160deg,rgba(28,34,46,.97),rgba(12,16,24,.98));border:1px solid rgba(255,255,255,.16);color:#eef2f7;box-shadow:0 30px 80px rgba(0,0,0,.5)}
html[data-theme=light] .sgbox{background:#fff;color:#0f172a;border-color:rgba(15,23,42,.14)}
.sghd{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:1.1rem}.sgx{min-height:40px;min-width:40px;padding:0}
.sgsum{display:flex;flex-wrap:wrap;gap:6px}.sgsum span{padding:6px 10px;border-radius:999px;border:1px solid rgba(182,255,59,.4);font-weight:700;font-size:.85rem}
.sgl{display:grid;gap:6px;font-size:.85rem}.sgl input{width:100%}
.sgpadw{position:relative;border-radius:18px;border:2px dashed rgba(124,196,255,.55);background:#fff;height:220px;touch-action:none}.sgpadw canvas{width:100%;height:100%;display:block;border-radius:16px;touch-action:none;cursor:crosshair}
.sghint{position:absolute;inset:auto 0 50% 0;text-align:center;color:#94a3b8;pointer-events:none;font-size:1rem;transform:translateY(50%)}.sgpadw.on .sghint{display:none}
.sgpadw::after{content:"";position:absolute;left:18px;right:18px;bottom:42px;border-bottom:1px solid #cbd5e1;pointer-events:none}
.sgclr{position:absolute;right:8px;top:8px;min-height:34px!important;padding:0 12px!important;font-size:.8rem!important;background:#f1f5f9!important;color:#0f172a!important}
.sgchk{display:flex;gap:10px;align-items:flex-start;font-size:.92rem}.sgchk input{width:24px;height:24px;flex:none;accent-color:#b6ff3b}
.sgnote{font-size:.8rem;opacity:.75}.sgmsg{white-space:pre-wrap;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font-size:.9rem}`;document.head.appendChild(st)}
const telOf=p=>String(p||"").replace(/\D/g,"").replace(/^00/,"").replace(/^0/,"421");
const needSign=d=>{const s=SF[d.id];return d.status!=="zruseny"&&!(s&&s.signed_at)&&(d.status==="navrh"||!!(s&&s.requested_at))};

// ---------- FARMÁR ----------
async function loadSF(){try{const r=await sb.rpc("deal_signs_mine");if(!r.error&&Array.isArray(r.data)){SF={};for(const x of r.data)SF[x.deal_id]=x}}catch(x){}}
if(typeof window.loadFarmer==="function"){const _lf=window.loadFarmer;window.loadFarmer=async function(){const r=await _lf.apply(this,arguments);await loadSF();return r}}
if(typeof window.renderFarmer==="function"){const _rf=window.renderFarmer;window.renderFarmer=function(){const r=_rf.apply(this,arguments);try{decorF()}catch(x){}return r}}
function decorF(){if(typeof FARMER==="undefined"||!FARMER||!STATE.deals)return;const app=document.getElementById("app");if(!app)return;
  const L=STATE.deals.filter(needSign);
  for(const d of STATE.deals){const b=app.querySelector(`[data-cpdf="${CSS.escape(d.id)}"]`);const card=b&&b.closest(".card");if(!card)continue;const bt=card.querySelector(".btns")||b.parentElement,s=SF[d.id];
    if(s&&s.signed_at){const p=document.createElement("span");p.className="pill";p.textContent="✅ Podpísané "+dd(s.signed_at);bt.appendChild(p);const ag=card.querySelector("[data-agree]");if(ag)ag.remove()}
    else if(needSign(d)){card.classList.add("sgneed");const ag=card.querySelector("[data-agree]");const nb=document.createElement("button");nb.type="button";nb.className="pri";nb.dataset.fsign=d.id;nb.textContent="✍️ Podpísať zmluvu";
      if(ag)ag.replaceWith(nb);else bt.appendChild(nb);const w=card.querySelector(".pill.w");if(w&&/súhlas odoslaný/.test(w.textContent))w.textContent="súhlas odoslaný – ešte podpis"}}
  if(L.length){const n=L.length,ban=document.createElement("div");ban.className="card sgban";ban.innerHTML=`<div class="sgbi">✍️</div><div class="sgbt"><b>${n===1?"Máte 1 zmluvu na podpis":`Máte ${n} ${n<5?"zmluvy":"zmlúv"} na podpis`}</b><small>${e(L.map(d=>d.no).join(", "))} · podpis prstom priamo v aplikácii, trvá 30 sekúnd</small></div><button type="button" class="pri" data-fsign="${e(L[0].id)}">Podpísať teraz</button>`;app.prepend(ban)}
  try{if(navigator.setAppBadge){L.length?navigator.setAppBadge(L.length):navigator.clearAppBadge()}}catch(x){}
  if(L.length&&!window._sgNag){window._sgNag=1;setTimeout(()=>tm(`✍️ ${L.length===1?"Zmluva čaká":"Zmluvy čakajú"} na váš podpis.`,6000),900)}}

async function docHash(d){try{const t=JSON.stringify({no:d.no,com:d.com,tons:+d.tons,price:+d.price,term:d.term||"",note:d.note||""});const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("")}catch(x){return null}}
function openPad(id){const d=STATE.deals.find(x=>x.id===id);if(!d)return;closePad();
  const m=document.createElement("div");m.className="sgmod";m.id="sgMod";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");
  m.innerHTML=`<div class="sgbox"><div class="sghd"><b>✍️ Podpis zmluvy ${e(d.no)}</b><button type="button" class="sgx" data-sgclose aria-label="Zavrieť">✕</button></div>
   <div class="sgsum"><span>${e(typeof comName==="function"?comName(d.com):d.com)}</span><span>${typeof fmt==="function"?fmt(d.tons):d.tons} t</span>${d.price!=null?`<span>${typeof fmt==="function"?fmt(d.price):d.price} €/t FCA</span>`:""}</div>
   <button type="button" class="sgread" data-cpdf="${e(d.id)}">📄 Prečítať celú zmluvu</button>
   <label class="sgl">Meno a priezvisko podpisujúceho<input id="sgName" autocomplete="name" value="${e(FARMER.contact||FARMER.name||"")}" placeholder="napr. Ján Novák, konateľ"></label>
   <div class="sgpadw"><canvas id="sgPad" aria-label="Pole na podpis prstom"></canvas><span class="sghint">Podpíšte sa prstom sem</span><button type="button" class="sgclr" data-sgclr>Vymazať</button></div>
   <label class="sgchk"><input type="checkbox" id="sgOk"><span>Prečítal(a) som si zmluvu a súhlasím s jej podmienkami.</span></label>
   <div class="btns"><button type="button" class="pri" data-sgsave="${e(d.id)}">✍️ Podpísať zmluvu</button><button type="button" data-sgclose>Zrušiť</button></div>
   <div class="sgnote">Podpis sa uloží k tejto zmluve s dátumom a časom. ERNTE ju potom potvrdí pečiatkou a uvidíte ju v PDF.</div></div>`;
  document.body.appendChild(m);document.documentElement.classList.add("sgopen");setupPad(document.getElementById("sgPad"))}
function closePad(){const m=document.getElementById("sgMod");if(m)m.remove();document.documentElement.classList.remove("sgopen")}
let PAD=null;
function setupPad(c){const r=c.getBoundingClientRect(),dpr=Math.max(1,window.devicePixelRatio||1);c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);
  const x=c.getContext("2d");x.scale(dpr,dpr);x.lineCap="round";x.lineJoin="round";x.strokeStyle="#1c3aa9";
  PAD={c,x,dpr,len:0,draw:false,last:null,minX:1e9,minY:1e9,maxX:-1,maxY:-1};
  const pt=ev=>{const b=c.getBoundingClientRect();return {x:ev.clientX-b.left,y:ev.clientY-b.top,p:ev.pressure||.5}};
  const grow=p=>{PAD.minX=Math.min(PAD.minX,p.x);PAD.minY=Math.min(PAD.minY,p.y);PAD.maxX=Math.max(PAD.maxX,p.x);PAD.maxY=Math.max(PAD.maxY,p.y)};
  c.addEventListener("pointerdown",ev=>{ev.preventDefault();c.setPointerCapture(ev.pointerId);PAD.draw=true;PAD.last=pt(ev);grow(PAD.last);c.parentElement.classList.add("on")});
  c.addEventListener("pointermove",ev=>{if(!PAD.draw)return;ev.preventDefault();const p=pt(ev),l=PAD.last;x.lineWidth=1.6+2.2*Math.min(1,p.p+.2);x.beginPath();x.moveTo(l.x,l.y);
    const mx=(l.x+p.x)/2,my=(l.y+p.y)/2;x.quadraticCurveTo(l.x,l.y,mx,my);x.lineTo(p.x,p.y);x.stroke();PAD.len+=Math.hypot(p.x-l.x,p.y-l.y);PAD.last=p;grow(p)});
  const up=()=>{PAD.draw=false};c.addEventListener("pointerup",up);c.addEventListener("pointercancel",up);c.addEventListener("pointerleave",up)}
function padPng(){const P=PAD;if(!P||P.len<60||P.maxX-P.minX<40)return null;const pad=10,d=P.dpr,sx=Math.max(0,(P.minX-pad)*d),sy=Math.max(0,(P.minY-pad)*d),
  sw=Math.min(P.c.width-sx,(P.maxX-P.minX+2*pad)*d),sh=Math.min(P.c.height-sy,(P.maxY-P.minY+2*pad)*d),k=Math.min(1,600/sw),o=document.createElement("canvas");
  o.width=Math.round(sw*k);o.height=Math.round(sh*k);o.getContext("2d").drawImage(P.c,sx,sy,sw,sh,0,0,o.width,o.height);return o.toDataURL("image/png")}

document.addEventListener("click",async ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(x=g("[data-fsign]")){ev.preventDefault();openPad(x.dataset.fsign);return}
  if(g("[data-sgclose]")||(ev.target.id==="sgMod")){closePad();return}
  if(g("[data-sgclr]")){const c=document.getElementById("sgPad");if(c){c.getContext("2d").clearRect(0,0,c.width,c.height);c.parentElement.classList.remove("on");setupPad(c)}return}
  if(x=g("[data-sgsave]")){const d=STATE.deals.find(y=>y.id===x.dataset.sgsave),nm=document.getElementById("sgName").value.trim();
    if(nm.length<3){tm("Napíšte meno a priezvisko toho, kto podpisuje.");return}
    const img=padPng();if(!img){tm("Podpíšte sa prstom do poľa (celým podpisom).");return}
    if(!document.getElementById("sgOk").checked){tm("Potvrďte, že ste si zmluvu prečítali.");return}
    if(typeof busy==="function")busy(x,true);const r=await sb.rpc("deal_sign",{p_deal:d.id,p_img:img,p_name:nm,p_ua:navigator.userAgent.slice(0,300),p_hash:await docHash(d)});
    if(typeof busy==="function")busy(x,false);
    if(r.error){tm(/deal_sign/.test(r.error.message)&&/exist|find/i.test(r.error.message)?"Podpis sa zapne po aktualizácii (pár minút).":r.error.message,7000);return}
    closePad();tm("✅ Zmluva podpísaná. ERNTE ju potvrdí pečiatkou.",6000);if(typeof loadFarmer==="function")await loadFarmer();if(typeof renderFarmer==="function")renderFarmer();return}
  // ---------- ZAMESTNANCI ----------
  if(x=g("[data-sgreq]")){const id=x.dataset.sgreq,d=(STATE.deals||[]).find(y=>y.id===id);if(typeof busy==="function")busy(x,true);const r=await sb.rpc("deal_sign_request",{p_deal:id});if(typeof busy==="function")busy(x,false);
    if(r.error){tm(r.error.message,6000);return}SS=null;await loadSS();
    const f=(STATE.farmers||[]).find(y=>y.id===(d&&d.farmer_id))||{},app=typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0];
    const txt=`Dobrý deň, ERNTE vám posiela na podpis kúpnu zmluvu ${d?d.no:""}. Otvorte aplikáciu ERNTE (${app}) – hore uvidíte „Podpísať teraz“. Podpis prstom trvá 30 sekúnd. Ďakujeme, ERNTE Trade & Logistic`;
    const m=document.createElement("div");m.className="sgmod";m.id="sgMod";m.innerHTML=`<div class="sgbox"><div class="sghd"><b>🔔 Požiadané o podpis</b><button type="button" class="sgx" data-sgclose aria-label="Zavrieť">✕</button></div>
      <div class="sgnote">${e(f.name||"Farmár")} uvidí v aplikácii upozornenie „Zmluva na podpis“. Pošlite mu aj správu:</div><div class="sgmsg">${e(txt)}</div>
      <div class="btns">${f.phone?`<a class="btn pri" target="_blank" rel="noopener" href="https://wa.me/${telOf(f.phone)}?text=${encodeURIComponent(txt)}">WhatsApp</a><a class="btn" href="sms:+${telOf(f.phone)}?&body=${encodeURIComponent(txt)}">SMS</a>`:""}<button type="button" data-sgcopy>📋 Kopírovať</button></div></div>`;
    document.body.appendChild(m);window._sgTxt=txt;return}
  if(g("[data-sgcopy]")){try{await navigator.clipboard.writeText(window._sgTxt||"");tm("Skopírované ✓")}catch(y){}return}
});
async function loadSS(){if(SSload)return;SSload=true;try{const r=await sb.rpc("deal_signs_staff");SS={};if(!r.error&&Array.isArray(r.data))for(const x of r.data)SS[x.deal_id]=x}catch(x){SS={}}SSload=false;if(typeof TAB!=="undefined"&&TAB==="deals"&&typeof renderStaff==="function")renderStaff()}
if(typeof window.renderStaff==="function"){const _rs=window.renderStaff;window.renderStaff=function(){const r=_rs.apply(this,arguments);try{decorS()}catch(x){}return r}}
function decorS(){if(typeof TAB==="undefined"||TAB!=="deals"||typeof FARMER!=="undefined"&&FARMER)return;if(SS===null){loadSS();return}
  const app=document.getElementById("app");for(const d of (STATE.deals||[])){const b=app.querySelector(`.card [data-cpdf="${CSS.escape(d.id)}"]`);if(!b)continue;const bt=b.parentElement,s=SS[d.id];
    if(bt.querySelector(".sgst"))continue;const sp=document.createElement("span");sp.className="pill sgst";
    if(s&&s.signed_at){sp.textContent=`✅ Farmár podpísal ${dd(s.signed_at)}${s.name?" · "+s.name:""}`;bt.appendChild(sp)}
    else if(d.status!=="zruseny"){if(s&&s.requested_at){sp.className="pill w sgst";sp.textContent="⏳ čaká na podpis od "+dd(s.requested_at);bt.appendChild(sp)}
      const q=document.createElement("button");q.type="button";q.dataset.sgreq=d.id;q.textContent=s&&s.requested_at?"🔔 Pripomenúť podpis":"✍️ Požiadať o podpis";bt.appendChild(q)}}}
})();
