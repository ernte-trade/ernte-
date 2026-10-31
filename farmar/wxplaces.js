// ===== ERNTE · POČASIE: VÝBER MIESTA =====
// Ako v bežnej aplikácii počasia: moja poloha (GPS, s názvom obce), vyhľadanie mesta / dediny / obce, posledné a obľúbené miesta.
// Vyhľadávanie: Open-Meteo Geocoding (bez kľúča). Názov k GPS polohe: BigDataCloud (bez kľúča). Nič sa neukladá na server.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const RK="ernte-wxrecent",FK="ernte-wxfav",AK="ernte-wxauto";
const get=k=>{try{return JSON.parse(localStorage.getItem(k)||"[]")||[]}catch(x){return []}},put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(x){}};
const same=(a,b)=>a&&b&&Math.abs(a.lat-b.lat)<.01&&Math.abs(a.lon-b.lon)<.01;
const FLAG={SK:"🇸🇰",HU:"🇭🇺",CZ:"🇨🇿",PL:"🇵🇱",UA:"🇺🇦",AT:"🇦🇹",DE:"🇩🇪",RO:"🇷🇴"};
const say=t=>{if(typeof toast==="function")toast(t,4000)};
function cur(){try{return WXLOC}catch(x){return null}}
async function apply(p){const L={name:p.name,lat:+(+p.lat).toFixed(3),lon:+(+p.lon).toFixed(3)};if(p.sub)L.sub=p.sub;if(p.gps)L.gps=true;
  try{WXLOC=L}catch(x){}try{localStorage.setItem("ernte-wxloc",JSON.stringify(L))}catch(x){}
  if(!p.gps){const r=get(RK).filter(x=>!same(x,L));r.unshift(L);put(RK,r.slice(0,6))}
  close();if(typeof loadWx==="function"){await loadWx(true)}if(typeof rerender==="function")rerender()}
async function place(lat,lon){try{const r=await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=sk`);const j=await r.json();
  const n=j.locality||j.city||(j.localityInfo&&j.localityInfo.administrative&&(j.localityInfo.administrative.slice(-1)[0]||{}).name);return {name:n||"Moja poloha",sub:[j.principalSubdivision,j.countryName].filter(Boolean).join(", ")}}catch(x){return {name:"Moja poloha",sub:""}}}
function gps(auto){return new Promise(ok=>{if(!navigator.geolocation){if(!auto)say("Poloha nie je v tomto zariadení dostupná.");return ok(false)}
  if(!auto)say("Zisťujem polohu…");
  navigator.geolocation.getCurrentPosition(async p=>{const lat=p.coords.latitude,lon=p.coords.longitude,c=cur();if(auto&&c&&c.gps&&same(c,{lat,lon}))return ok(true);
      const n=await place(lat.toFixed(4),lon.toFixed(4));await apply({name:n.name,sub:n.sub,lat,lon,gps:true});ok(true)},
    ()=>{if(!auto)say("Polohu sa nepodarilo zistiť – povoľte ju v nastaveniach prehliadača.");ok(false)},{timeout:12000,maximumAge:10*60e3,enableHighAccuracy:false})})}
let T=null,Q="",RES=null,BUSY=false,ctl=null;
async function search(q){Q=q;clearTimeout(T);if(q.trim().length<2){RES=null;list();return}
  T=setTimeout(async()=>{try{ctl&&ctl.abort();ctl=new AbortController();BUSY=true;list();
      const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=20&language=sk&format=json`,{signal:ctl.signal});const j=await r.json();
      const rank=c=>c==="SK"?0:c==="HU"||c==="CZ"?1:2;
      RES=(j.results||[]).sort((a,b)=>rank(a.country_code)-rank(b.country_code)||(b.population||0)-(a.population||0)).slice(0,12)}
    catch(x){if(x&&x.name==="AbortError")return;RES={err:1}}BUSY=false;list()},300)}
function row(p,i,kind){const sub=p.sub||[p.admin2,p.admin1,p.country].filter(Boolean).join(", ");const fl=FLAG[p.country_code]||"";const fav=get(FK).some(x=>same(x,p));
  return `<div class="wxp-r"><button type="button" class="wxp-go" data-wxpset="${kind}:${i}"><span class="wxp-i" aria-hidden="true">${kind==="fav"?"⭐":kind==="rec"?"🕘":"📍"}</span><span><b>${e(p.name)} ${fl}</b>${sub?`<small>${e(sub)}</small>`:""}</span></button>
    <button type="button" class="wxp-star${fav?" on":""}" data-wxpfav="${kind}:${i}" aria-label="${fav?"Odobrať z obľúbených":"Pridať do obľúbených"}">${fav?"★":"☆"}</button></div>`}
function list(){const b=document.getElementById("wxpList");if(!b)return;let h="";
  if(Q.trim().length>=2){h+=BUSY&&!RES?`<div class="wxp-s">Hľadám…</div>`:RES&&RES.err?`<div class="wxp-s">Vyhľadávanie sa nepodarilo – skontrolujte internet.</div>`:RES&&!RES.length?`<div class="wxp-s">Nič sme nenašli. Skúste iný názov (napr. bez diakritiky).</div>`:RES?`<div class="wxp-h">Výsledky</div>`+RES.map((p,i)=>row(p,i,"res")).join(""):""}
  else{const F=get(FK),R=get(RK).filter(x=>!F.some(f=>same(f,x)));
    if(F.length)h+=`<div class="wxp-h">Obľúbené miesta</div>`+F.map((p,i)=>row(p,i,"fav")).join("");
    if(R.length)h+=`<div class="wxp-h">Naposledy</div>`+R.map((p,i)=>row(p,i,"rec")).join("");
    if(!F.length&&!R.length)h+=`<div class="wxp-s">Napíšte názov mesta, dediny alebo obce – napr. Zbudza, Michalovce, Trhovište. Hviezdičkou si miesto uložíte medzi obľúbené (napr. vaše polia).</div>`}
  b.innerHTML=h}
const pick=k=>{const [kind,i]=k.split(":");const L=kind==="res"?RES:kind==="fav"?get(FK):get(RK).filter(x=>!get(FK).some(f=>same(f,x)));const p=L&&L[+i];if(!p)return null;
  return {name:p.name,lat:p.lat!=null?p.lat:p.latitude,lon:p.lon!=null?p.lon:p.longitude,sub:p.sub||[p.admin2||p.admin1,p.country_code&&p.country_code!=="SK"?p.country:""].filter(Boolean).join(", ")}};
function css(){if(document.getElementById("wxpCss"))return;const s=document.createElement("style");s.id="wxpCss";s.textContent=`
.wxp{position:fixed;inset:0;z-index:10040;background:rgba(0,0,0,.66);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center}
@media(min-width:700px){.wxp{align-items:center}}
.wxp-b{width:min(560px,100%);max-height:92vh;display:flex;flex-direction:column;gap:10px;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));border-radius:24px 24px 0 0;background:linear-gradient(160deg,rgba(28,34,46,.98),rgba(12,16,24,.99));border:1px solid rgba(255,255,255,.16);color:#eef2f7}
@media(min-width:700px){.wxp-b{border-radius:24px}}
html[data-theme=light] .wxp-b{background:#fff;color:#0f172a}
.wxp-hd{display:flex;justify-content:space-between;align-items:center;gap:10px}.wxp-hd b{font-size:1.1rem}
.wxp-x{min-height:40px;min-width:40px;padding:0;border-radius:50%}
.wxp-q{width:100%;min-height:50px;font-size:16px;border-radius:14px;padding:0 14px}
.wxp-gps{display:flex;gap:10px;align-items:center;justify-content:flex-start;min-height:52px;width:100%;border-radius:14px;font-weight:700}
.wxp-auto{display:flex;gap:10px;align-items:center;font-size:.86rem;opacity:.9}.wxp-auto input{width:20px;height:20px;min-height:0}
#wxpList{overflow:auto;display:grid;gap:4px;padding-bottom:4px}
.wxp-h{font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.65;margin:8px 4px 2px}
.wxp-s{font-size:.88rem;opacity:.75;padding:8px 4px;line-height:1.45}
.wxp-r{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center}
.wxp-go{display:flex;gap:12px;align-items:center;text-align:left;min-height:56px;padding:8px 12px;border-radius:14px;width:100%;justify-content:flex-start;font-weight:500}
.wxp-go b{display:block;font-weight:700}.wxp-go small{display:block;opacity:.7;font-size:.8rem;font-weight:400}
.wxp-i{font-size:1.2rem}.wxp-star{min-height:48px;min-width:48px;padding:0;font-size:1.3rem;border-radius:14px}.wxp-star.on{color:#facc15}
.wxloc-b{display:inline-flex;align-items:center;gap:6px;max-width:100%}.wxloc-b small{opacity:.7;font-weight:500}`;document.head.appendChild(s)}
function open(){css();close();const o=document.createElement("div");o.className="wxp";o.id="wxp";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-label","Miesto pre počasie");
  const c=cur()||{},auto=localStorage.getItem(AK)==="1";Q="";RES=null;
  o.innerHTML=`<div class="wxp-b"><div class="wxp-hd"><b>📍 Miesto pre počasie</b><button type="button" class="wxp-x" data-wxpx aria-label="Zavrieť">✕</button></div>
    <div class="s" style="margin:-4px 2px 0">Teraz: <b>${e(c.name||"")}</b>${c.sub?" · "+e(c.sub):""}</div>
    <button type="button" class="lime wxp-gps" data-wxpgps>🎯 Použiť moju polohu (GPS)</button>
    <label class="wxp-auto"><input type="checkbox" data-wxpauto ${auto?"checked":""}> Pri otvorení aplikácie vždy podľa mojej polohy</label>
    <input class="wxp-q" id="wxpQ" type="search" inputmode="search" autocomplete="off" placeholder="🔎 Hľadať mesto, dedinu, obec…" aria-label="Hľadať mesto alebo obec">
    <div id="wxpList" aria-live="polite"></div></div>`;
  document.body.appendChild(o);list();const q=o.querySelector("#wxpQ");q.addEventListener("input",()=>search(q.value));setTimeout(()=>{try{q.focus()}catch(x){}},120);
  o.addEventListener("click",ev=>{if(ev.target===o)close()})}
function close(){const o=document.getElementById("wxp");if(o)o.remove()}
document.addEventListener("click",async ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(g("[data-wxpick]")){ev.preventDefault();open();return}
  if(g("[data-wxpx]")){close();return}
  if(g("[data-wxpgps]")){await gps(false);return}
  if(x=g("[data-wxpset]")){const p=pick(x.dataset.wxpset);if(p)apply(p);return}
  if(x=g("[data-wxpfav]")){const p=pick(x.dataset.wxpfav);if(!p)return;let F=get(FK);F=F.some(f=>same(f,p))?F.filter(f=>!same(f,p)):[p,...F].slice(0,10);put(FK,F);list();return}},true);
document.addEventListener("change",ev=>{if(ev.target.matches&&ev.target.matches("[data-wxpauto]")){try{localStorage.setItem(AK,ev.target.checked?"1":"0")}catch(x){}if(ev.target.checked)gps(false)}});
// automaticky podľa polohy pri otvorení (iba keď to používateľ zapol)
setTimeout(()=>{try{if(localStorage.getItem(AK)==="1")gps(true)}catch(x){}},2500);
window.wxPlaceOpen=open;
})();
