// ===== ← SPÄŤ / 🏠 DOMOV – NIKDY SA NEZASEKNÚŤ · 📡 BEZ SPOJENIA (6. 11. príkaz majiteľa) =====
// 1) Systémové Späť (Android tlačidlo / gesto) v aplikácii NEZATVORÍ aplikáciu: najprv zavrie otvorené okno, potom sa vráti
//    na predchádzajúcu obrazovku (← Späť zo spat.js), potom na Prehľad. Až na Prehľade: „Ťukni Späť ešte raz a aplikácia sa zavrie“.
//    (Chrome ignoruje kroky histórie vložené bez ťuknutia, preto sa zarážka vkladá pri ťuknutí.)
// 2) Okno cez celú obrazovku bez viditeľného ✕ / Späť → po 1,5 s sa ukáže núdzové „🏠 Domov“, ktoré ho zavrie.
//    Úvod LIVE (.wlc) sa podľa príkazu majiteľa 30. 10. nezatvára – pokračuje sa „Poďme na to“.
// 3) Pri výpadku signálu sa údaje nezmažú (loadStaff / loadFarmer – NETERR, staleMark) a hore je „📡 Bez spojenia · údaje z hh:mm · ↻ Skúsiť znova“.
(function(){
const IN=()=>typeof sb!=="undefined"&&sb&&typeof ME!=="undefined"&&!!ME;
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||3000)};
const STAFF=()=>typeof ROLE!=="undefined"&&!!ROLE&&ROLE!=="farmer"&&!(typeof FARMER!=="undefined"&&FARMER);
const vis=el=>{if(!el||el.hidden)return false;const c=getComputedStyle(el);if(c.display==="none"||c.visibility==="hidden"||+c.opacity===0)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
const SKIP=el=>el.matches("#rdBar,#rdSide,#rdHead,#spatBar,#ernNew,#dmStale,#dmHome,.toast,header,nav,.wlc,script,style,link")||!!el.closest(".wlc");
// najvrchnejšie okno cez väčšinu obrazovky
function top(){const vw=innerWidth,vh=innerHeight;let best=null,bz=-1;
  for(const el of document.body.children){if(SKIP(el)||!vis(el))continue;const c=getComputedStyle(el);if(c.position!=="fixed"||c.pointerEvents==="none")continue;
    if((parseInt(c.zIndex,10)||0)<50)continue;
    const r=el.getBoundingClientRect(),a=Math.max(0,Math.min(r.right,vw)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,vh)-Math.max(r.top,0));if(a<vw*vh*.4)continue;
    const z=parseInt(c.zIndex,10)||0;if(z>=bz){bz=z;best=el}}
  return best}
const CL='[data-adx],[data-rdclose],[data-close],[data-x],.sgx,.adx,.wxdx,[aria-label*="Zavrieť" i],[aria-label*="Zatvoriť" i],[aria-label*="Späť" i],[title*="Zavrieť" i]';
const TX=/^(✕|×|x|zavrieť|zatvoriť|zavrieť okno|zrušiť|hotovo|neskôr|teraz nie|nie teraz|← ?späť.*|späť.*|bezárás|később|vissza.*)$/i;
function closer(o){const L=[...o.querySelectorAll(CL)].filter(vis);if(L.length)return L[0];
  return [...o.querySelectorAll("button,a,[role=button]")].filter(vis).find(x=>TX.test(String(x.innerText||x.textContent||"").replace(/\s+/g," ").trim()))||null}
const welcome=()=>{const w=document.querySelector(".wlc");return !!(w&&vis(w))};
function closeTop(){const o=top();if(!o)return false;const b=closer(o);
  if(b){b.click();return true}
  document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  if(!document.body.contains(o)||!vis(o))return true;
  o.style.display="none";o.setAttribute("data-dmhid","1");document.documentElement.style.overflow="";document.body.style.overflow="";
  document.documentElement.classList.forEach(c=>{if(/open$/.test(c))document.documentElement.classList.remove(c)});return true}
function goHome(){if(STAFF()&&typeof TAB!=="undefined"&&TAB!=="home"){const h=document.querySelector('#app nav.tabs [data-tab="home"]');if(h){h.click();scrollTo(0,0);return true}}
  if(!STAFF()&&typeof FARMER!=="undefined"&&FARMER){const t=document.querySelector("[data-fhome],[data-fback]");if(t){t.click();return true}}return false}
function back(){if(welcome())return true;if(closeTop())return true;
  const s=document.querySelector("#spatBar [data-spat]");if(s&&vis(s)){s.click();return true}
  return goHome()}
// ---------- 1) systémové Späť ----------
let armed=false,exitAsk=0;
const H=history.replaceState.bind(history);
history.replaceState=function(st,t,u){try{const c=history.state;if(c&&c.__ern&&(st==null||typeof st!=="object"))st={__ern:c.__ern};else if(c&&c.__ern&&st&&typeof st==="object"&&!st.__ern&&Object.keys(st).length===0)st={__ern:c.__ern}}catch(x){}return H(st,t,u)};
function arm(){if(armed||!IN())return;try{history.pushState({__ern:"g"},"",location.href);armed=true}catch(x){}}
document.addEventListener("click",e=>{if(e.isTrusted)arm()},true);
document.addEventListener("keydown",e=>{if(e.isTrusted&&e.key!=="Escape")arm()},true);
addEventListener("popstate",()=>{const st=history.state;if(st&&st.__ern==="g")return; /* zatvorilo sa okno iného modulu (pdfview, počasie, farmár) – to si rieši sám */
  if(!armed||!IN())return;armed=false;
  if(back()){exitAsk=0;return}
  if(Date.now()-exitAsk<3000)return;exitAsk=Date.now();say("Ťukni Späť ešte raz a aplikácia sa zavrie.",2800)});
// ---------- 2) núdzové 🏠 Domov nad oknom bez zatvárania ----------
let seenAt=0,seenEl=null;
function emergency(){const o=IN()?top():null;let b=document.getElementById("dmHome");
  if(!o||closer(o)||welcome()){seenEl=null;if(b)b.remove();return}
  if(seenEl!==o){seenEl=o;seenAt=Date.now();return}if(Date.now()-seenAt<1500)return;
  if(!b){b=document.createElement("button");b.type="button";b.id="dmHome";b.innerHTML="🏠 Domov";b.setAttribute("aria-label","Zavrieť okno a ísť domov");document.body.appendChild(b)}}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#dmHome");if(!b)return;e.preventDefault();closeTop();b.remove();goHome()},true);
// ---------- 3) 📡 bez spojenia ----------
const hm=t=>new Date(t).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});
function stale(){let b=document.getElementById("dmStale");const off=navigator.onLine===false,st=window.ERNTE_STALE;
  if(!IN()||(!off&&!st)){if(b)b.remove();return}
  const at=window.ERNTE_LOADED_AT;const h=`<span>📡 ${off?"Bez signálu":"Údaje sa nepodarilo načítať"}${at?` – zobrazujem údaje z ${hm(at)}`:""}</span><button type="button" data-dmretry>↻ Skúsiť znova</button>`;
  if(!b){b=document.createElement("div");b.id="dmStale";b.setAttribute("role","status");document.body.appendChild(b)}if(b.dataset.h!==h){b.innerHTML=h;b.dataset.h=h}}
async function retry(btn){if(btn)btn.disabled=true;try{if(STAFF()&&typeof refreshAll==="function")await refreshAll();else if(typeof loadFarmer==="function"){await loadFarmer();if(typeof renderFarmer==="function")renderFarmer()}}catch(x){}
  if(btn)btn.disabled=false;stale();if(window.ERNTE_STALE)say("Stále bez spojenia – skúsim znova sám, keď sa signál vráti.",4000)}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-dmretry]");if(b){e.preventDefault();retry(b)}},true);
addEventListener("offline",stale);addEventListener("online",()=>{stale();if(window.ERNTE_STALE&&IN())setTimeout(()=>retry(null),1500)});
document.addEventListener("erntestale",stale);
setInterval(()=>{try{emergency();stale()}catch(x){}},700);
{const s=document.createElement("style");s.textContent=`#dmHome{position:fixed;left:12px;top:max(12px,env(safe-area-inset-top));z-index:2147483000;min-height:48px;padding:0 18px;border-radius:999px;font-weight:800;font-size:1rem;
  background:linear-gradient(135deg,#b6ff3b,#5eead4);color:#05210f;border:2px solid rgba(255,255,255,.85);box-shadow:0 8px 28px rgba(0,0,0,.55)}
#dmStale{position:fixed;left:50%;transform:translateX(-50%);top:max(8px,env(safe-area-inset-top));z-index:2147482000;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;
  width:min(560px,calc(100vw - 16px));padding:8px 12px;border-radius:14px;background:#ffcf5a;color:#111827;font-weight:700;font-size:.9rem;box-shadow:0 8px 24px rgba(0,0,0,.45);text-align:center}
#dmStale span{flex:1 1 200px;min-width:0}#dmStale button{min-height:40px;padding:0 14px;border-radius:10px;background:#111827;color:#fff;border:0;font-weight:800;white-space:nowrap}`;document.head.appendChild(s)}
})();
