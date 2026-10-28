// ===== 🧪 TEST POHĽADY (iba majiteľ) – aplikácia presne tak, ako ju vidí farmár, obchodník, dopravca =====
// Otvorí nové okno s vlastným prihlásením testovacieho účtu (prihlásenie majiteľa ostane v ostatných oknách).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"");
const K=[["farmar","👨‍🌾","Farmár test","Presne to, čo vidí farmár po prihlásení: cenník, predaj, moje obchody, odvoz, podpis zmluvy, počasie.","🧪 TEST Farmár – vymyslený farmár bez obchodov. Ak chceš vidieť zmluvu na podpis, uzatvor mu skúšobný obchod."],
 ["obchodnik","🤝","Obchodník test (Galajda)","Aplikácia s rovnakými prístupmi, aké má Stano Galajda – začína na Uzatvoriť obchod.","Prístupy sa pri každom otvorení skopírujú od Galajdu."],
 ["doprava","🚚","Dopravca test (Tóth)","Aplikácia s rovnakými prístupmi, aké má Gabriel Tóth – doprava, flotila, vývoz bez cien.","Prístupy sa pri každom otvorení skopírujú od Tótha."]];
window.vTest=function(){if(!(window.MAIN_OK&&MAIN_OK()))return "";
  return `<div class="tv">${vaHTML()}<div class="card"><h2>🧪 Test pohľady</h2><div class="s">Ťukni a v <b>novom okne</b> sa otvorí aplikácia presne tak, ako ju vidí daný človek po prihlásení. Tvoje prihlásenie tu ostane – test zavrieš tlačidlom hore v testovacom okne.</div></div>
   ${K.map(k=>`<button type="button" class="tvb" data-tvk="${k[0]}"><span>${k[1]}</span><b>${e(k[2])}</b><small>${e(k[3])}</small><em>${e(k[4])}</em></button>`).join("")}
   <div class="card tvw">⚠️ <b>Pozor:</b> testovacie okno je skutočná aplikácia so skutočnými údajmi. Čo v ňom odošleš (obchod, správa, objednávka), naozaj odíde. Na skúšky používaj farmára <b>🧪 TEST Farmár</b>.</div></div>`};
/* ---------- 👁 PREPÍNAČ: pozrieť ako konkrétny človek (iba Martin) ---------- */
let VA=null,VAQ="",VAbusy=false;
const norm=x=>String(x||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
async function vaLoad(){if(VAbusy)return;VAbusy=true;try{const r=await sb.rpc("view_as_list");VA=r.error?{err:r.error.message}:(r.data||[])}catch(x){VA={err:String(x.message||x)}}VAbusy=false;if(typeof TAB!=="undefined"&&TAB==="test"&&typeof renderStaff==="function")renderStaff()}
function vaRows(){const q=norm(VAQ).trim();const L=(VA||[]).filter(p=>!q||norm([p.name,p.email,p.info].join(" ")).includes(q));
  const grp=(k,t)=>{const G=L.filter(p=>p.kind===k);return G.length?`<div class="vag"><small>${t} · ${G.length}</small>${G.slice(0,q?60:k==="staff"?40:12).map(p=>`<button type="button" class="vab" data-va="${e(p.email)}" data-van="${e(p.name)}"><span class="vaav">${e((String(p.name||"?").match(/\p{L}/gu)||["?"]).slice(0,2).join("").toUpperCase())}</span><span class="vat"><b>${e(p.name)}</b><small>${e([p.info,p.email].filter(Boolean).join(" · "))}</small></span><i>👁</i></button>`).join("")}${!q&&k==="farmer"&&G.length>12?`<div class="s">… a ďalších ${G.length-12} – napíš meno do hľadania.</div>`:""}</div>`:""};
  return grp("staff","Tím")+grp("farmer","Farmári s prihlásením")||`<div class="s">Nič sa nenašlo.</div>`}
function vaHTML(){if(VA===null){vaLoad();return `<div class="card"><h2>👁 Pozrieť ako konkrétny človek</h2><div class="s">Načítavam zoznam…</div></div>`}
  if(VA.err)return `<div class="card"><h2>👁 Pozrieť ako konkrétny človek</h2><div class="s">${/view_as_list/.test(VA.err)?"Zapne sa po aktualizácii databázy (pár minút).":"⚠️ "+e(VA.err)}</div></div>`;
  return `<div class="card va"><h2>👁 Pozrieť ako konkrétny človek</h2><div class="s">Vyber zamestnanca alebo farmára – v novom okne uvidíš aplikáciu <b>presne tak, ako ju má on vo svojom prihlásení</b> (jeho záložky, prístupy a údaje). Iba na pozeranie – nič sa za neho neuloží ani neodošle. Vidíš to iba ty.</div>
    <label class="ds-search">Hľadať<input id="vaq" value="${e(VAQ)}" placeholder="meno, obec alebo e-mail" autocomplete="off"></label><div class="val">${vaRows()}</div></div>`}
document.addEventListener("input",ev=>{if(ev.target.id!=="vaq")return;VAQ=ev.target.value;const l=document.querySelector(".va .val");if(l)l.innerHTML=vaRows()});
document.addEventListener("click",async ev=>{const b=ev.target.closest&&ev.target.closest("[data-va]");if(!b||!(window.MAIN_OK&&MAIN_OK()))return;
  const w=window.open("about:blank","_blank");if(typeof busy==="function")busy(b,true);
  try{const r=await sb.rpc("view_as",{p_email:b.dataset.va});if(r.error)throw r.error;const c=JSON.stringify(r.data);const url=location.pathname+"?viewas=1";
    if(w){try{w.sessionStorage.setItem("ernte-viewas-cred",c)}catch(x){}w.location.href=url}else{sessionStorage.setItem("ernte-viewas-cred",c);location.href=url}}
  catch(x){if(w)w.close();if(typeof toast==="function")toast("⚠️ "+(x.message||x),7000)}
  finally{if(typeof busy==="function")busy(b,false)}});
window.viewBanner=function(){const v=window.ERNTE_VIEWAS||{};const b=document.createElement("div");b.className="tvbar vabar";
  b.innerHTML=`<span>👁 ${e(v.name||v.email||"používateľ")} <small>· iba pozeranie</small></span><button type="button" id="vaClose">✕ Zavrieť</button>`;document.body.appendChild(b);document.documentElement.classList.add("tvon");
  b.querySelector("#vaClose").onclick=async()=>{try{await sb.auth.signOut({scope:"local"})}catch(y){}try{sessionStorage.clear()}catch(y){}try{window.close()}catch(y){}setTimeout(()=>location.replace(location.pathname),300)}};
window.testBanner=function(k){const x=K.find(y=>y[0]===k);const b=document.createElement("div");b.className="tvbar";
  b.innerHTML=`<span>🧪 TEST · ${e(x?x[2]:k)}</span><button type="button" id="tvClose">✕ Zavrieť test</button>`;document.body.appendChild(b);document.documentElement.classList.add("tvon");
  b.querySelector("#tvClose").onclick=async()=>{try{await sb.auth.signOut({scope:"local"})}catch(y){}try{window.close()}catch(y){}setTimeout(()=>location.replace(location.pathname),300)}};
document.addEventListener("click",async ev=>{const b=ev.target.closest&&ev.target.closest("[data-tvk]");if(!b||!(window.MAIN_OK&&MAIN_OK()))return;
  const w=window.open("about:blank","_blank");if(typeof busy==="function")busy(b,true);
  try{const r=await sb.rpc("test_login",{p_kind:b.dataset.tvk});if(r.error)throw r.error;
    sessionStorage.setItem("ernte-test-cred",JSON.stringify(r.data));
    const url=location.pathname+"?test="+b.dataset.tvk;
    if(w){try{w.sessionStorage.setItem("ernte-test-cred",JSON.stringify(r.data))}catch(x){}w.location.href=url}else location.href=url;
    setTimeout(()=>{try{sessionStorage.removeItem("ernte-test-cred")}catch(x){}},4000)}
  catch(x){if(w)w.close();if(typeof toast==="function")toast(/test_login/.test(x.message||"")?"Test sa zapne po aktualizácii databázy (pár minút).":"⚠️ "+(x.message||x),7000)}
  finally{if(typeof busy==="function")busy(b,false)}});
{const s=document.createElement("style");s.textContent=`.tv{display:grid;gap:12px}.tvb{display:grid;gap:4px;text-align:left;padding:16px 18px;border-radius:22px;min-height:110px;background:linear-gradient(160deg,rgba(52,211,153,.18),rgba(34,211,238,.1));border:1px solid rgba(255,255,255,.18);color:inherit;font:inherit;cursor:pointer}
.tvb span{font-size:2rem}.tvb b{font-size:1.2rem}.tvb small{opacity:.85}.tvb em{font-style:normal;font-size:.8rem;opacity:.65}.tvw{display:block!important;line-height:1.5;border-color:rgba(251,191,36,.5)!important;background:rgba(251,191,36,.08)!important}
.tvbar{position:fixed;top:0;left:0;right:0;z-index:20000;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 14px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:repeating-linear-gradient(45deg,#b91c1c,#b91c1c 14px,#991b1b 14px,#991b1b 28px);color:#fff;font:800 14px Arial;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.vabar{background:repeating-linear-gradient(45deg,#1d4ed8,#1d4ed8 14px,#1e40af 14px,#1e40af 28px)}.vabar small{font-weight:600;opacity:.8;margin-left:6px}.vabar button{color:#1e40af!important}
.va .val{display:grid;gap:12px;margin-top:10px}.vag{display:grid;gap:6px}.vag>small{color:var(--muted);font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:.7rem}
.vab{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;text-align:left;padding:8px 12px;min-height:56px;border-radius:16px;width:100%}
.vaav{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:.85rem;background:linear-gradient(135deg,rgba(34,211,238,.35),rgba(139,92,246,.35))}
.vat{min-width:0}.vat b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vat small{display:block;color:var(--muted);font-size:.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}.vab i{font-style:normal;opacity:.7}
.tvbar>span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tvbar button{flex:none;white-space:nowrap;background:#fff;color:#991b1b;border:0;border-radius:10px;padding:6px 12px;font-weight:800;min-height:34px}html.tvon body{padding-top:48px}`;document.head.appendChild(s)}
})();
