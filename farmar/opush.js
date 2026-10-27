// ===== 🔔 Upozornenia do mobilu MAJITEĽA (ntfy, so zvukom) – karta v Prehľade =====
(function(){
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const K="ernte-opush-ok";let C=null,busy=false,open=false;
const ok=()=>{try{return localStorage.getItem(K)==="1"}catch(x){return false}};
async function load(test,on){if(busy)return;busy=true;try{const r=await sb.rpc("my_push",{p_test:!!test,p_on:on==null?null:on});C=r.error?{err:/my_push/.test(r.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message}:r.data||{}}catch(x){C={err:String(x)}}busy=false;if(typeof TAB!=="undefined"&&TAB==="home"&&typeof renderStaff==="function")renderStaff()}
function card(){const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),tp=C&&C.topic,e=typeof esc==="function"?esc:(x=>x);
  if(ok()&&!open)return `<div class="card opush mini"><span>🔔 Upozornenia do mobilu: <b>${C&&C.on===false?"vypnuté":"zapnuté"}</b></span><button type="button" data-opo="1">Nastaviť</button></div>`;
  if(!C){load(false);return `<div class="card opush"><b>🔔 Upozornenia do mobilu so zvukom</b><div class="s">Načítavam…</div></div>`}
  if(C.err)return `<div class="card opush"><b>🔔 Upozornenia do mobilu so zvukom</b><div class="s">${e(C.err)}</div></div>`;
  return `<div class="card opush"><b>🔔 Upozornenia do mobilu so zvukom</b>
   <div class="s">Nová objednávka odvozu, ponuka na predaj, podpísaná zmluva, návrh ceny, objednávka služby a spätná väzba prídu hneď do tvojho mobilu – aj keď je aplikácia zavretá. Odber je iba tvoj, kolegovia ho nevidia.</div>
   <ol class="opsteps"><li>Nainštaluj bezplatnú aplikáciu <b>ntfy</b>: <a href="${ios?"https://apps.apple.com/app/ntfy/id1625396347":"https://play.google.com/store/apps/details?id=io.heckel.ntfy"}" target="_blank" rel="noopener">${ios?"App Store":"Google Play"}</a></li>
    <li><a class="btn lime" href="ntfy://ntfy.sh/${e(tp)}">🔔 Prihlásiť odber</a><br><small>Ak sa nič neotvorí: v ntfy ťukni <b>+</b>, napíš <b class="num">${e(tp)}</b> a ťukni Prihlásiť. <button type="button" data-copy="${e(tp)}">Kopírovať</button></small></li>
    <li><button type="button" data-opt="1">Poslať skúšobné upozornenie</button> – musí pípnuť. Ak nepípne: v ntfy podrž odber → <b>Nastavenia upozornení</b> → zapni zvuk; v Androide povoľ ntfy upozornenia a vypni pre ntfy úsporu batérie.</li></ol>
   <div class="btns"><button type="button" class="pri" data-opok="1">✓ Pípa mi – hotovo</button><button type="button" data-opon="${C.on===false?"1":"0"}">${C.on===false?"Zapnúť upozornenia":"Vypnúť upozornenia"}</button>${ok()?`<button type="button" data-opo="0">Zavrieť</button>`:""}</div>
   <div class="s">🔒 Názov odberu nikomu nedávaj – kto ho pozná, videl by tvoje upozornenia.</div></div>`}
const _vh=window.vHome;if(typeof _vh==="function")window.vHome=function(){const h=_vh.apply(this,arguments);return OWN()?card()+h:h};
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest)return;const cp=t.closest("[data-copy]");if(cp){try{await navigator.clipboard.writeText(cp.dataset.copy);if(typeof toast==="function")toast("Skopírované ✓")}catch(y){}return}if(!OWN())return;let x;
  if(t.closest("[data-opt]")){await load(true);if(typeof toast==="function")toast("Odoslané – o pár sekúnd by mal mobil pípnuť.",5000);return}
  if(t.closest("[data-opok]")){try{localStorage.setItem(K,"1")}catch(y){}open=false;renderStaff();return}
  if(x=t.closest("[data-opon]")){await load(false,x.dataset.opon==="1");return}
  if(x=t.closest("[data-opo]")){open=x.dataset.opo==="1";if(open&&!C)load(false);renderStaff();return}});
{const s=document.createElement("style");s.textContent=`.opush{display:grid;gap:8px}.opush.mini{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px}.opush.mini button{min-height:36px}.opsteps{margin:0;padding-left:20px;display:grid;gap:8px}.opsteps .btn{display:inline-flex;margin:4px 0}`;document.head.appendChild(s)}
})();
