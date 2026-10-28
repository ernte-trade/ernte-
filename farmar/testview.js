// ===== 🧪 TEST POHĽADY (iba majiteľ) – aplikácia presne tak, ako ju vidí farmár, obchodník, dopravca =====
// Otvorí nové okno s vlastným prihlásením testovacieho účtu (prihlásenie majiteľa ostane v ostatných oknách).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"");
const K=[["farmar","👨‍🌾","Farmár test","Presne to, čo vidí farmár po prihlásení: cenník, predaj, moje obchody, odvoz, podpis zmluvy, počasie.","🧪 TEST Farmár – vymyslený farmár bez obchodov. Ak chceš vidieť zmluvu na podpis, uzatvor mu skúšobný obchod."],
 ["obchodnik","🤝","Obchodník test (Galajda)","Aplikácia s rovnakými prístupmi, aké má Stano Galajda – začína na Uzatvoriť obchod.","Prístupy sa pri každom otvorení skopírujú od Galajdu."],
 ["doprava","🚚","Dopravca test (Tóth)","Aplikácia s rovnakými prístupmi, aké má Gabriel Tóth – doprava, flotila, vývoz bez cien.","Prístupy sa pri každom otvorení skopírujú od Tótha."]];
window.vTest=function(){if(typeof ROLE==="undefined"||ROLE!=="owner")return "";
  return `<div class="tv"><div class="card"><h2>🧪 Test pohľady</h2><div class="s">Ťukni a v <b>novom okne</b> sa otvorí aplikácia presne tak, ako ju vidí daný človek po prihlásení. Tvoje prihlásenie tu ostane – test zavrieš tlačidlom hore v testovacom okne.</div></div>
   ${K.map(k=>`<button type="button" class="tvb" data-tvk="${k[0]}"><span>${k[1]}</span><b>${e(k[2])}</b><small>${e(k[3])}</small><em>${e(k[4])}</em></button>`).join("")}
   <div class="card tvw">⚠️ <b>Pozor:</b> testovacie okno je skutočná aplikácia so skutočnými údajmi. Čo v ňom odošleš (obchod, správa, objednávka), naozaj odíde. Na skúšky používaj farmára <b>🧪 TEST Farmár</b>.</div></div>`};
window.testBanner=function(k){const x=K.find(y=>y[0]===k);const b=document.createElement("div");b.className="tvbar";
  b.innerHTML=`<span>🧪 TEST · ${e(x?x[2]:k)}</span><button type="button" id="tvClose">✕ Zavrieť test</button>`;document.body.appendChild(b);document.documentElement.classList.add("tvon");
  b.querySelector("#tvClose").onclick=async()=>{try{await sb.auth.signOut({scope:"local"})}catch(y){}try{window.close()}catch(y){}setTimeout(()=>location.replace(location.pathname),300)}};
document.addEventListener("click",async ev=>{const b=ev.target.closest&&ev.target.closest("[data-tvk]");if(!b||typeof ROLE==="undefined"||ROLE!=="owner")return;
  const w=window.open("about:blank","_blank");if(typeof busy==="function")busy(b,true);
  try{const r=await sb.rpc("test_login",{p_kind:b.dataset.tvk});if(r.error)throw r.error;
    sessionStorage.setItem("ernte-test-cred",JSON.stringify(r.data));
    const url=location.pathname+"?test="+b.dataset.tvk;
    if(w){try{w.sessionStorage.setItem("ernte-test-cred",JSON.stringify(r.data))}catch(x){}w.location.href=url}else location.href=url;
    setTimeout(()=>{try{sessionStorage.removeItem("ernte-test-cred")}catch(x){}},4000)}
  catch(x){if(w)w.close();if(typeof toast==="function")toast(/test_login/.test(x.message||"")?"Test sa zapne po aktualizácii databázy (pár minút).":"⚠️ "+(x.message||x),7000)}
  finally{if(typeof busy==="function")busy(b,false)}});
{const s=document.createElement("style");s.textContent=`.tv{display:grid;gap:12px}.tvb{display:grid;gap:4px;text-align:left;padding:16px 18px;border-radius:22px;min-height:110px;background:linear-gradient(160deg,rgba(52,211,153,.18),rgba(34,211,238,.1));border:1px solid rgba(255,255,255,.18);color:inherit;font:inherit;cursor:pointer}
.tvb span{font-size:2rem}.tvb b{font-size:1.2rem}.tvb small{opacity:.85}.tvb em{font-style:normal;font-size:.8rem;opacity:.65}.tvw{border-color:rgba(251,191,36,.5)!important;background:rgba(251,191,36,.08)!important}
.tvbar{position:fixed;top:0;left:0;right:0;z-index:20000;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 14px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:repeating-linear-gradient(45deg,#b91c1c,#b91c1c 14px,#991b1b 14px,#991b1b 28px);color:#fff;font:800 14px Arial;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.tvbar button{background:#fff;color:#991b1b;border:0;border-radius:10px;padding:6px 12px;font-weight:800;min-height:34px}html.tvon body{padding-top:48px}`;document.head.appendChild(s)}
})();
