// ===== 🛡️ GDPR – PREČÍTAŤ A PODPÍSAŤ (príkaz majiteľa 31. 10. 2026) =====
// Každý, kto sa prihlási (tím, farmári, odberatelia, partneri trusu), si pred vstupom do aplikácie prečíta CELÉ poučenie
// o ochrane osobných údajov (sukromie.html – musí ho prejsť až na koniec), zaškrtne súhlas, napíše meno a podpíše sa prstom.
// Podpis sa uloží v databáze (gdpr_sign: meno, podpis, verzia poučenia, odtlačok textu SHA-256, čas, zariadenie).
// Pri novej verzii poučenia (VER) sa opýta znova. Majiteľ: Tím → 🛡️ GDPR súhlasy (kto podpísal, PDF ku každému podpisu).
(function(){
const VER="2026-10-31";
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const skip=()=>!!(window.ERNTE_VIEWAS||window.ERNTE_TEST);
let done=false,busy=null,TXT=null;
const nofn=m=>/could not find the function|schema cache|does not exist|PGRST202/i.test(String(m||""));

// ---- text poučenia (celý dokument Ochrana osobných údajov) ----
async function text(){if(TXT)return TXT;
  try{const r=await fetch("sukromie.html?v="+VER,{cache:"no-store"});if(!r.ok)throw 0;const d=new DOMParser().parseFromString(await r.text(),"text/html");
    const b=d.querySelector("main")||d.body;b.querySelectorAll("script,style,a[href*='index'],.back,nav").forEach(x=>x.remove());
    [...b.querySelectorAll("a")].forEach(a=>{if(/späť do aplikácie/i.test(a.textContent))a.remove()});
    // obrázky komodít nepatria k poučeniu
    const hs=[...b.querySelectorAll("h2")];const img=hs.find(h=>/Obrázky komodít/i.test(h.textContent));if(img){let n=img;while(n){const nx=n.nextSibling;n.remove();n=nx}}
    b.querySelectorAll("a").forEach(a=>{a.target="_blank";a.rel="noopener"});
    TXT=b.innerHTML}catch(x){TXT=`<h1>Ochrana osobných údajov</h1><p>${E(window.GDPR_FALLBACK||"Vaše meno, telefón, e-mail, údaje o obchodoch a doprave spracúva ERNTE spol. s r.o. (doprava VALKO s.r.o.), Zbudza 141, 072 23 Zbudza, iba na účely spolupráce, obchodov, zúčtovania a dopravy podľa nariadenia (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z. Údaje neposkytujeme tretím osobám okrem zákonných povinností a nevyhnutných spracovateľov. Máte právo na prístup, opravu, vymazanie, obmedzenie, prenosnosť a námietku; sťažnosť môžete podať na Úrad na ochranu osobných údajov SR. Kontakt: jana.valkova@ernte.sk, +421 918 449 991.")}</p>`}
  return TXT}
async function sha(s){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(x){return ""}}
const plain=h=>{const d=document.createElement("div");d.innerHTML=h;return (d.textContent||"").replace(/\s+/g," ").trim()};

// ---- okno: prečítať → zaškrtnúť → meno → podpis prstom ----
function modal(user){return new Promise(async res=>{
  const html=await text();const d=document.createElement("div");d.className="gdm";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label","Ochrana osobných údajov – súhlas");
  d.innerHTML=`<div class="gdbox"><div class="gdhd"><span class="gdic">🛡️</span><div><b>Ochrana osobných údajov</b><small>Pred vstupom do aplikácie si prečítajte celé poučenie a podpíšte súhlas · verzia ${E(VER.split("-").reverse().join(". "))}</small></div></div>
   <div class="gdtxt" tabindex="0">${html}<div class="gdend">— koniec poučenia —</div></div>
   <div class="gdprog"><i></i><span>Prečítajte až na koniec ↓</span></div>
   <form class="gdform off" novalidate>
    <label class="gdchk"><input type="checkbox" name="ok"><span class="gdk" aria-hidden="true">✓</span><span>Prečítal(a) som si celé poučenie o ochrane osobných údajov ERNTE spol. s r.o. a VALKO s.r.o., rozumiem mu a <b>súhlasím</b> so spracúvaním mojich osobných údajov v rozsahu a na účely v ňom uvedené. Súhlasím, že tento súhlas aj ďalšie dokumenty v aplikácii (napr. kúpne zmluvy) podpisujem elektronicky – podpisom prstom v aplikácii ERNTE, ktorý má rovnaké účinky ako vlastnoručný podpis. Súhlas môžem kedykoľvek odvolať na jana.valkova@ernte.sk.</span></label>
    <label class="gdname">Meno a priezvisko (štatutár / osoba, ktorá podpisuje)<input name="nm" autocomplete="name" maxlength="120" placeholder="napr. Ján Novák"></label>
    <div class="gdsigw"><div class="gdsigl"><span>✍️ Podpis prstom</span><button type="button" class="gdclr">Vymazať</button></div><canvas class="gdsig" aria-label="Podpisové pole"></canvas></div>
    <div class="gderr" role="alert"></div>
    <button class="pri gdgo" type="submit">✍️ Podpisujem a súhlasím</button>
    <button class="gdno" type="button">Nesúhlasím – odhlásiť sa</button>
    <small class="gdmeta">Prihlásený: ${E(user&&user.email||"")} · uloží sa meno, podpis, čas a zariadenie ako doklad o súhlase.</small>
   </form></div>`;
  document.body.appendChild(d);document.documentElement.classList.add("gdlock");
  const tx=d.querySelector(".gdtxt"),fm=d.querySelector(".gdform"),pr=d.querySelector(".gdprog"),er=d.querySelector(".gderr"),cv=d.querySelector(".gdsig");
  let read=false;const chk=()=>{const p=Math.min(1,(tx.scrollTop+tx.clientHeight)/Math.max(1,tx.scrollHeight));pr.querySelector("i").style.width=Math.round(p*100)+"%";
    if(!read&&tx.scrollTop+tx.clientHeight>=tx.scrollHeight-30){read=true;fm.classList.remove("off");pr.classList.add("ok");pr.querySelector("span").textContent="✓ Prečítané – teraz zaškrtnite, napíšte meno a podpíšte sa";d.classList.add("rd");er.classList.remove("on");requestAnimationFrame(()=>{size();fm.scrollIntoView({block:"start",behavior:"smooth"})})}};
  tx.addEventListener("scroll",chk,{passive:true});setTimeout(chk,300);
  fm.addEventListener("focusin",()=>{if(!read){tx.focus();bad("Najprv si prečítajte celé poučenie – posuňte text až na koniec.")}});
  // podpis
  const cx=cv.getContext("2d");let pts=0,drawing=false,last=null;
  const size=()=>{const r=cv.getBoundingClientRect(),k=Math.min(3,window.devicePixelRatio||1);if(!r.width)return;const img=pts?cv.toDataURL():null;cv.width=Math.round(r.width*k);cv.height=Math.round(r.height*k);
    cx.setTransform(k,0,0,k,0,0);cx.lineWidth=2.4;cx.lineCap="round";cx.lineJoin="round";cx.strokeStyle="#0b1b3a";if(img){const i=new Image();i.onload=()=>{cx.setTransform(1,0,0,1,0,0);cx.drawImage(i,0,0,cv.width,cv.height);cx.setTransform(k,0,0,k,0,0)};i.src=img}};
  requestAnimationFrame(size);window.addEventListener("resize",size);
  const at=e=>{const r=cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
  cv.addEventListener("pointerdown",e=>{if(!read){bad("Najprv si prečítajte celé poučenie – posuňte text až na koniec.");return}e.preventDefault();cv.setPointerCapture(e.pointerId);drawing=true;last=at(e);cx.beginPath();cx.arc(last.x,last.y,1.1,0,7);cx.fillStyle="#0b1b3a";cx.fill();pts++});
  cv.addEventListener("pointermove",e=>{if(!drawing)return;e.preventDefault();const p=at(e);cx.beginPath();cx.moveTo(last.x,last.y);cx.lineTo(p.x,p.y);cx.stroke();last=p;pts++});
  ["pointerup","pointercancel","pointerleave"].forEach(k=>cv.addEventListener(k,()=>{drawing=false}));
  d.querySelector(".gdclr").onclick=()=>{cx.save();cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.restore();pts=0};
  function bad(m){er.textContent="⚠️ "+m;er.classList.add("on")}
  d.querySelector(".gdno").onclick=async()=>{if(!confirm("Bez súhlasu s ochranou osobných údajov nie je možné aplikáciu používať. Odhlásiť sa?"))return;try{await sb.auth.signOut()}catch(x){}location.reload()};
  fm.addEventListener("submit",async e=>{e.preventDefault();e.stopPropagation();er.classList.remove("on");
    if(!read){bad("Prečítajte si poučenie až na koniec.");return}
    if(!fm.ok.checked){bad("Zaškrtnite súhlas – ťuknite na políčko.");return}
    const nm=fm.nm.value.trim();if(nm.length<3||!/\s/.test(nm)){bad("Napíšte meno aj priezvisko.");fm.nm.focus();return}
    if(pts<12){bad("Podpíšte sa prstom do bieleho rámčeka.");return}
    const bt=fm.querySelector(".gdgo");bt.disabled=true;bt.textContent="Ukladám podpis…";
    // podpis zmenšený (max 600 px šírka), aby záznam nebol veľký
    let sig;try{const k=Math.min(1,600/cv.width),c2=document.createElement("canvas");c2.width=Math.round(cv.width*k);c2.height=Math.round(cv.height*k);c2.getContext("2d").drawImage(cv,0,0,c2.width,c2.height);sig=c2.toDataURL("image/png")}catch(x){sig=cv.toDataURL("image/png")}
    const h=await sha(plain(html));
    const r=await sb.rpc("gdpr_sign",{p_name:nm,p_sig:sig,p_ver:VER,p_hash:h,p_ua:navigator.userAgent.slice(0,300)});
    if(r.error){bt.disabled=false;bt.textContent="✍️ Podpisujem a súhlasím";bad(nofn(r.error.message)?"Podpisovanie sa práve zapína – skúste o pár minút.":(r.error.message||"Nepodarilo sa uložiť – skúste znova."));return}
    window.ERNTE_GDPR_OK=1;done=true;d.remove();document.documentElement.classList.remove("gdlock");window.removeEventListener("resize",size);
    if(typeof toast==="function")toast("✓ Súhlas podpísaný – ďakujeme.",3500);res()});
})}

async function gate(user){if(done||skip()||!user)return;if(busy)return busy;
  busy=(async()=>{try{const r=await sb.rpc("gdpr_status");
      if(r.error){if(nofn(r.error.message))return}
      else if(r.data&&r.data.ver===VER){done=true;window.ERNTE_GDPR_OK=1;return}
      await modal(user)}catch(x){}finally{busy=null}})();
  return busy}
window.ernteGdpr={gate,VER,text};

// vstup po prihlásení: najprv súhlas, potom aplikácia
function hook(){const o=window.enter;if(typeof o!=="function"||o.__gdp)return;const w=async function(u){try{await gate(u)}catch(x){}return o.apply(this,arguments)};
  Object.keys(o).forEach(k=>{try{w[k]=o[k]}catch(x){}});w.__gdp=1;window.enter=w;try{enter=w}catch(x){}}
hook();{let n=0;const t=setInterval(()=>{hook();if(++n>40)clearInterval(t)},250)}
// poistka: ak už je niekto vnútri (načítanie pred zachytením), opýta sa hneď
setTimeout(()=>{try{if(!done&&typeof ME!=="undefined"&&ME&&ME.email)gate(ME)}catch(x){}},2500);

// ---- 🛡️ GDPR súhlasy – prehľad pre majiteľa (Tím) ----
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const G={open:false,d:null,busy:false,err:null};
const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
async function load(){if(G.busy)return;G.busy=true;G.err=null;paint();const r=await sb.rpc("gdpr_list");G.busy=false;if(r.error)G.err=nofn(r.error.message)?"Prehľad sa zapína po aktualizácii databázy – o pár minút.":r.error.message;else G.d=r.data||{};paint()}
function card(){if(!G.open)return `<div class="card gdl"><button type="button" class="gdtg" data-gdtg="1"><b>🛡️ GDPR súhlasy</b><span>kto si prečítal a podpísal ochranu osobných údajov ›</span></button></div>`;
  const S=(G.d&&G.d.signed)||[],U=(G.d&&G.d.users)||[],last={};S.forEach(s=>{const k=String(s.email||"").toLowerCase();if(!last[k])last[k]=s});
  const ok=U.filter(u=>last[u.email]&&last[u.email].ver===VER),no=U.filter(u=>!(last[u.email]&&last[u.email].ver===VER));
  const row=u=>{const s=last[u.email];return `<div class="gdr${s&&s.ver===VER?" ok":""}"><div><b>${E(u.name)}</b><small>${u.kind==="tim"?"👥 tím":"🌾 farmár"} · ${E(u.email||"")}</small></div>
    <div class="gdrs">${s&&s.ver===VER?`✅ ${E(dt(s.at))}<small>podpísal: ${E(s.name)}</small><button type="button" data-gdpdf="${E(s.id)}">📄 PDF</button>`:s?`⏳ starší súhlas ${E(dt(s.at))}<small>opýta sa pri ďalšom otvorení</small>`:`⏳ ešte nepodpísal${u.last?"":`<small>zatiaľ sa neprihlásil</small>`}`}</div></div>`};
  const other=S.filter(s=>!U.some(u=>u.email===String(s.email||"").toLowerCase())&&last[String(s.email||"").toLowerCase()]===s);
  return `<div class="card gdl open"><button type="button" class="gdtg" data-gdtg="1"><b>🛡️ GDPR súhlasy</b><span>zbaliť ‹</span></button>
   <div class="s">Každý po prihlásení prečíta celé poučenie (verzia ${E(VER.split("-").reverse().join(". "))}) a podpíše sa prstom. Bez podpisu sa do aplikácie nedostane.</div>
   ${G.err?`<div class="gderr on">${E(G.err)}</div>`:""}${G.busy?`<div class="s">Načítavam…</div>`:""}
   ${G.d?`<div class="gdkpi"><span>✅ podpísané <b>${ok.length}</b></span><span>⏳ chýba <b>${no.length}</b></span></div>
   ${no.length?`<h3>Ešte nepodpísali</h3><div class="gdls">${no.map(row).join("")}</div>`:""}
   ${ok.length?`<h3>Podpísané</h3><div class="gdls">${ok.map(row).join("")}</div>`:""}
   ${other.length?`<h3>Ďalší podpísaní (odberatelia, partneri)</h3><div class="gdls">${other.map(s=>row({name:s.name,email:String(s.email).toLowerCase(),kind:s.kind,last:1})).join("")}</div>`:""}`:""}</div>`}
function paint(){const c=document.querySelector(".card.gdl");if(c)c.outerHTML=card()}
function inject(){if(!OWN()||typeof TAB==="undefined"||TAB!=="team")return;const app=document.getElementById("app");if(!app||app.querySelector(".card.gdl"))return;
  const w=document.createElement("div");w.innerHTML=card();const el=w.firstElementChild,ref=app.querySelector(".hinv,.card.hinv");if(ref&&ref.parentNode)ref.parentNode.insertBefore(el,ref.nextSibling);else app.appendChild(el)}
async function pdf(id){const r=await sb.from("gdpr_sign").select("*").eq("id",id).maybeSingle();if(r.error||!r.data){if(typeof toast==="function")toast("Záznam sa nenašiel.",4000);return}
  const s=r.data,html=await text(),h=typeof brandHead==="function"?brandHead("ernte","Súhlas so spracúvaním osobných údajov",`GDPR · verzia poučenia ${s.ver}`):"<h1>Súhlas so spracúvaním osobných údajov</h1>";
  const css=typeof brandCss==="function"?brandCss("ernte"):"";const w=window.open("");if(!w)return;
  w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>GDPR súhlas ${E(s.name)} ${E(String(s.at).slice(0,10))}</title><style>${css}body{font:13px/1.5 system-ui,sans-serif;color:#111;margin:24px}h1{font-size:18px}h2{font-size:14px;margin:14px 0 4px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{border:1px solid #ccc;padding:4px;vertical-align:top}.box{border:2px solid #0b1b3a;border-radius:8px;padding:12px;margin:16px 0;page-break-inside:avoid}.sig{height:110px;border-bottom:1px solid #333}.meta{font-size:11px;color:#444}.txt{font-size:11.5px}</style></head><body>${h}
   <div class="box"><b>Vyhlásenie dotknutej osoby</b><p>Ja, <b>${E(s.name)}</b> (prihlásenie ${E(s.email)}), potvrdzujem, že som si prečítal(a) celé poučenie o ochrane osobných údajov ERNTE spol. s r.o. a VALKO s.r.o. uvedené nižšie, rozumiem mu a súhlasím so spracúvaním mojich osobných údajov v rozsahu a na účely v ňom uvedené. Súhlasím s elektronickým podpisovaním dokumentov v aplikácii ERNTE (podpis prstom) s rovnakými účinkami ako vlastnoručný podpis. Súhlas môžem kedykoľvek odvolať.</p>
   <img class="sig" src="${E(s.sig||"")}" alt="podpis"><div class="meta">Podpísané elektronicky v aplikácii ERNTE Trade & Logistic: ${E(dt(s.at))} · verzia poučenia ${E(s.ver)} · odtlačok textu SHA-256 ${E(s.txt_hash||"–")}<br>Zariadenie: ${E(s.ua||"–")}</div></div>
   <div class="txt">${html}</div></body></html>`);w.document.close()}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-gdtg],[data-gdpdf]");if(!t||!OWN())return;e.preventDefault();
  if(t.dataset.gdtg){G.open=!G.open;paint();if(G.open)load();return}if(t.dataset.gdpdf)pdf(t.dataset.gdpdf)});
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();

{const st=document.createElement("style");st.textContent=`html.gdlock,html.gdlock body{overflow:hidden!important}
.gdm{position:fixed;inset:0;z-index:40000;background:rgba(2,6,23,.86);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom))}
.gdbox{box-sizing:border-box;width:min(760px,100%);max-height:100%;display:flex;flex-direction:column;gap:10px;background:linear-gradient(160deg,rgba(15,23,42,.97),rgba(2,6,23,.97));border:1px solid rgba(182,255,59,.35);border-radius:22px;padding:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);color:#e5e7eb;min-height:0;overflow:auto}
.gdhd{display:flex;gap:10px;align-items:center}.gdic{font-size:1.8rem}.gdhd b{display:block;font-size:1.1rem}.gdhd small{display:block;opacity:.75;font-size:.8rem}
.gdtxt{flex:1 1 auto;min-height:200px;overflow:auto;-webkit-overflow-scrolling:touch;background:#f8fafc;color:#0f172a;border-radius:14px;padding:12px 14px;font-size:.88rem;line-height:1.5;overflow-wrap:anywhere}
.gdtxt h1{font-size:1.15rem;margin:0 0 6px}.gdtxt h2{font-size:1rem;margin:14px 0 6px}.gdtxt table{width:100%;border-collapse:collapse;font-size:.8rem;display:block;overflow-x:auto}.gdtxt td,.gdtxt th{border:1px solid #cbd5e1;padding:5px;vertical-align:top;min-width:90px}
.gdtxt a{color:#1d4ed8}.gdtxt img{max-width:100%}.gdend{text-align:center;opacity:.6;font-size:.8rem;margin:14px 0 4px}
.gdprog{position:relative;height:26px;border-radius:13px;background:rgba(255,255,255,.08);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:.8rem}
.gdprog i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#0f766e,#22c55e);transition:width .2s}.gdprog span{position:relative}.gdprog.ok i{width:100%!important}
.gdform{display:grid;gap:10px}.gdm:not(.rd) .gdform{display:none}.gdm.rd .gdtxt{flex:none;height:30vh;min-height:150px}.gdm:not(.rd) .gdbox{height:100%}
.gdtxt .top{display:flex;gap:10px;align-items:center}.gdtxt .top img,.gdtxt img[src*="logo"]{width:56px!important;height:auto;flex:none}.gdtxt,.gdtxt *{color:#0f172a!important;opacity:1!important}.gdtxt a{color:#1d4ed8!important}
.gdchk{display:grid!important;grid-template-columns:auto 1fr;gap:12px;align-items:start;text-align:left;cursor:pointer;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);position:relative;font-size:.86rem;line-height:1.45}
.gdchk input{position:absolute!important;opacity:0;width:1px!important;height:1px!important;min-height:0!important;padding:0!important}
.gdk{width:34px;height:34px;border-radius:10px;border:2px solid rgba(255,255,255,.4);display:grid;place-items:center;font:900 1.2rem/1 system-ui;color:transparent;transition:.2s}
.gdchk input:checked+.gdk{background:#22c55e;border-color:#22c55e;color:#fff;box-shadow:0 0 16px rgba(34,197,94,.6)}.gdchk input:focus-visible+.gdk{outline:3px solid #b6ff3b}
.gdname{display:grid;gap:4px;font-size:.84rem}.gdname input{width:100%;box-sizing:border-box}
.gdsigw{display:grid;gap:4px}.gdsigl{display:flex;justify-content:space-between;align-items:center;font-size:.84rem}.gdsigl button{padding:4px 12px;min-height:0;font-size:.8rem}
.gdsig{width:100%;height:150px;background:#fff;border-radius:14px;border:2px dashed #94a3b8;touch-action:none;cursor:crosshair;display:block}
.gderr{display:none}.gderr.on{display:block;background:rgba(239,68,68,.16);border:1px solid rgba(239,68,68,.5);border-radius:14px;padding:10px 12px;color:#fecaca;line-height:1.45;font-size:.88rem}
.gdgo{width:100%;font-size:1.02rem}.gdno{background:transparent!important;border:0!important;color:#94a3b8!important;text-decoration:underline;font-size:.84rem;box-shadow:none!important}.gdmeta{opacity:.6;font-size:.74rem;text-align:center;overflow-wrap:anywhere}
.gdl .gdtg{all:unset;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;justify-content:center;text-align:center;width:100%;cursor:pointer}.gdl .gdtg span{font-size:.84rem;opacity:.75}
.gdkpi{display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:center;margin:8px 0}.gdl h3{margin:12px 0 6px;font-size:1rem}.gdls{display:grid;gap:6px}
.gdr{display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);min-width:0}
.gdr.ok{border-color:rgba(34,197,94,.4)}.gdr>div{min-width:0}.gdr b{overflow-wrap:anywhere}.gdr small{display:block;opacity:.7;font-size:.76rem;overflow-wrap:anywhere}.gdrs{text-align:right;font-size:.84rem}.gdrs button{margin-top:4px;padding:4px 12px;min-height:0;font-size:.8rem}
@media(max-height:640px){.gdsig{height:120px}}`;document.head.appendChild(st)}
})();
