// ===== 🏠 Sencor HOME – rýchle otvorenie aplikácie (príkaz majiteľa 1. 11.: „môžem vidieť len ja“) =====
// Iba Martin (MAIN_OK). Sencor nemá verejné prepojenie (API) – tlačidlo otvorí aplikáciu Sencor HOME / jej stránku v obchode.
(function(){
const OK=()=>typeof MAIN_OK==="function"&&MAIN_OK()&&typeof ROLE!=="undefined"&&ROLE==="owner"&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const URL_IOS="https://apps.apple.com/app/id1586323736",URL_AND="https://play.google.com/store/search?q=Sencor%20HOME&c=apps";
function put(){const r=document.getElementById("refBtn"),b=document.getElementById("sencorBtn");
  if(!OK()){if(b)b.remove();return}if(b||!r||!r.parentNode)return;
  const x=document.createElement("button");x.type="button";x.id="sencorBtn";x.className="topref sencb";x.title="Sencor HOME";x.setAttribute("aria-label","Otvoriť Sencor HOME");x.innerHTML="<span>🏠</span>";
  x.onclick=()=>{window.open(IOS?URL_IOS:URL_AND,"_blank","noopener")};r.parentNode.insertBefore(x,r)}
setInterval(put,2000);setTimeout(put,800);

// ---------- 📡 Meteostanice Sencor (Jasenov, Zbudza) – dlaždica na úvode LIVE (iba Martin) ----------
const E=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LB={temp_current_external:["🌡️","Vonku",1],humidity_outdoor:["💧","Vlhkosť vonku",2],humidity_outdoor_1:["💧","Vlhkosť vonku",2],temp_current_external_1:["🌡️","Vonku (senzor 2)",3],
 temp_current:["🏠","Vnútri",4],humidity_value:["💦","Vlhkosť vnútri",5],feellike_temp:["🤔","Pocitová",6],dew_point_temp:["🌫️","Rosný bod",7],
 atmospheric_pressture:["🧭","Tlak",8],pressure_value:["🧭","Tlak",8],windspeed_avg:["💨","Vietor",9],windspeed_gust:["🌬️","Nárazy",10],wind_direct:["🧭","Smer vetra",11],
 rain_1h:["🌧️","Dážď 1 h",12],rain_24h:["🌧️","Dážď 24 h",13],rain_rate:["☔","Intenzita dažďa",14],rain_total:["🌧️","Dážď spolu",15],uv_index:["☀️","UV",16],bright_value:["🔆","Svetlo",17],
 heat_index:["🥵","Tepelný index",18],windchill_index:["🥶","Ochladenie vetrom",19]};
let SD=null,SB=false,SAT=0;
async function sLoad(force){if(!OK()||SB)return;if(!force&&SD&&Date.now()-SAT<60e3)return;SB=true;try{const r=await sb.rpc("sencor_get");SD=r.error?{err:r.error.message,dev:[],cfg:true}:(r.data||null);SAT=Date.now()}catch(x){}SB=false;sPaint()}
function val(d,st){const sp=((d.spec&&d.spec.status)||[]).find(x=>x.code===st.code);let v=st.value,u="";
  if(typeof v==="number"&&sp){let m={};try{m=typeof sp.values==="string"?JSON.parse(sp.values):(sp.values||{})}catch(x){}if(m.scale)v=v/Math.pow(10,m.scale);u=m.unit||""}
  if(typeof v==="boolean")return v?"áno":"nie";if(typeof v==="number")return v.toLocaleString("sk-SK",{maximumFractionDigits:1})+(u?" "+u:"");return String(v)}
function devHTML(d){const S=(d.status||[]).filter(x=>x&&x.code&&(LB[x.code]||typeof x.value==="number"));S.sort((a,b)=>((LB[a.code]||[0,0,99])[2])-((LB[b.code]||[0,0,99])[2]));
  const main=S.find(x=>x.code==="temp_current_external")||S.find(x=>x.code==="temp_current");
  return `<div class="sncd"><div class="snch"><b>📍 ${E(d.name||"Stanica")}</b><i class="${d.online?"on":"off"}">${d.online?"online":"offline"}</i></div>
   ${main?`<div class="sncm">${E(val(d,main))}<small>${E((LB[main.code]||["","Teplota"])[1])}</small></div>`:""}
   <div class="sncg">${S.filter(x=>x!==main).slice(0,10).map(x=>{const l=LB[x.code]||["•",x.code];return `<span><i>${l[0]}</i><small>${E(l[1])}</small><b>${E(val(d,x))}</b></span>`}).join("")||"<small>čakám na prvé údaje…</small>"}</div></div>`}
function tileHTML(){const d=SD;
  if(!d)return `<div class="whc wdia wsenc"><i class="wdsh"></i><div class="wgrh"><small>📡 Moje stanice · Sencor</small></div><div class="sncx">načítavam…</div></div>`;
  if(!d.cfg)return `<div class="whc wdia wsenc"><i class="wdsh"></i><div class="wgrh"><small>📡 Moje stanice · Jasenov a Zbudza</small></div><div class="sncx">Stanice Sencor ešte nie sú pripojené.</div><button type="button" class="sncb" data-sncset>🔗 Pripojiť stanice</button></div>`;
  const L=(d.dev||[]).slice().sort((a,b)=>{const r=n=>/jasenov/i.test(n||"")?0:/zbudz/i.test(n||"")?1:2;return r(a.name)-r(b.name)});
  return `<div class="whc wdia wsenc"><i class="wdsh"></i><div class="wgrh"><small>📡 Moje stanice · Sencor LIVE</small><span class="snct">${d.at?new Date(d.at).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"}):""}</span></div>
   ${L.length?`<div class="sncl">${L.map(devHTML).join("")}</div>`:`<div class="sncx">${d.err?"⚠️ "+E(d.err):"Pripájam sa k Tuya… prvé údaje do 2 minút."}</div>`}
   ${d.err&&L.length?`<div class="sncx">⚠️ ${E(d.err)}</div>`:""}<button type="button" class="sncb sm" data-sncset>⚙️ Pripojenie</button></div>`}
function sPaint(){if(!OK())return;const wx=document.querySelector(".whwx");if(!wx)return;const row=wx.closest(".whrow")||wx;const old=document.querySelector(".wsenc"),h=tileHTML();
  const k=h.length+"|"+h.slice(-120);if(old){if(old.dataset.k!==k){const t=document.createElement("div");t.innerHTML=h;t.firstElementChild.dataset.k=k;old.replaceWith(t.firstElementChild)}return}
  const t=document.createElement("div");t.innerHTML=h;t.firstElementChild.dataset.k=k;row.after(t.firstElementChild);sLoad()}
function setup(){const o=document.createElement("div");o.className="sncmod";o.innerHTML=`<div class="sncbox" role="dialog" aria-modal="true" aria-label="Pripojiť meteostanice"><div class="snchd"><b>📡 Pripojiť stanice Sencor</b><button type="button" class="sncxb" data-sncx aria-label="Zavrieť">✕</button></div>
  <ol class="sncol"><li>Do mobilu nainštaluj <b>Smart Life</b> a pridaj do nej stanice Jasenov a Zbudza (v Sencor HOME ostanú).</li>
   <li>Na <b>iot.tuya.com</b> vytvor bezplatný účet → Cloud → <b>Create Cloud Project</b> (Industry: Smart Home, Data Center: <b>Central Europe</b>).</li>
   <li>V projekte → <b>Devices → Link App Account</b> → naskenuj QR kód v Smart Life (Ja → ikonka skenovania).</li>
   <li>V projekte → <b>Overview</b> skopíruj <b>Access ID</b> a <b>Access Secret</b> a vlož ich sem. Uložia sa iba do trezoru databázy.</li></ol>
  <form id="sncF"><label>Access ID / Client ID<input name="id" autocomplete="off" autocapitalize="off" spellcheck="false" required></label>
   <label>Access Secret / Client Secret<input name="sec" type="password" autocomplete="new-password" required></label>
   <label>Dátové centrum<select name="h"><option value="openapi.tuyaeu.com">Central Europe</option><option value="openapi-weaz.tuyaeu.com">Western Europe</option><option value="openapi.tuyaus.com">Western America</option></select></label>
   <div class="btns"><button type="submit" class="lime">💾 Uložiť a pripojiť</button></div></form></div>`;
  document.body.appendChild(o);o.addEventListener("click",e=>{if(e.target===o||e.target.closest("[data-sncx]"))o.remove()});
  o.querySelector("#sncF").onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector("button[type=submit]");b.disabled=true;
    const r=await sb.rpc("sencor_cfg_set",{p_id:f.id.value.trim(),p_secret:f.sec.value.trim(),p_host:f.h.value});b.disabled=false;
    if(r.error){(typeof toast==="function"?toast:alert)("Nepodarilo sa: "+r.error.message,7000);return}o.remove();(typeof toast==="function"?toast:alert)("✅ Uložené – prvé údaje zo staníc do 2 minút.",6000);SD=null;setTimeout(()=>sLoad(true),70e3);sLoad(true)}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-sncset]");if(!t||!OK())return;e.preventDefault();e.stopPropagation();setup()},true);
new MutationObserver(()=>{if(OK()&&document.querySelector(".whwx")&&!document.querySelector(".wsenc"))(window.ernteSoon||requestAnimationFrame)(sPaint)}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(OK()&&document.querySelector(".wsenc")&&!document.hidden)sLoad()},30e3);
{const s=document.createElement("style");s.textContent=`
.wsenc{grid-column:1/-1}.wsenc .sncx{font-size:.88rem;opacity:.85;margin:6px 0}.snct{font-size:.75rem;opacity:.7}
.sncl{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:6px}
.sncd{border-radius:14px;padding:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);min-width:0}
.snch{display:flex;justify-content:space-between;align-items:center;gap:8px}.snch b{overflow-wrap:anywhere}.snch i{font-style:normal;font-size:.7rem;padding:2px 8px;border-radius:999px}.snch i.on{background:rgba(74,222,128,.2);color:#86efac}.snch i.off{background:rgba(248,113,113,.2);color:#fca5a5}
.sncm{font-size:2.2rem;font-weight:300;line-height:1.1;margin:4px 0}.sncm small{display:block;font-size:.72rem;opacity:.7;font-weight:600}
.sncg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.sncg span{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:6px;align-items:center;padding:5px 6px;border-radius:10px;background:rgba(0,0,0,.18);min-width:0}
.sncg span i{font-style:normal;grid-row:span 2}.sncg span small{font-size:.66rem;opacity:.7;overflow-wrap:anywhere}.sncg span b{font-size:.92rem;overflow-wrap:anywhere}
.sncb{margin-top:8px;min-height:40px}.sncb.sm{min-height:34px;font-size:.8rem;padding:4px 12px;opacity:.85}
.sncmod{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:12px}
.sncbox{width:min(520px,100%);max-height:92vh;overflow:auto;border-radius:20px;padding:16px;background:#121a2b;border:1px solid rgba(255,255,255,.15);color:#e8eefc}
.snchd{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}.sncxb{width:40px;height:40px;min-height:40px;border-radius:50%;padding:0}
.sncol{padding-left:20px;font-size:.88rem;line-height:1.45}.sncol li{margin:4px 0}
#sncF label{display:block;margin:8px 0;font-size:.85rem}#sncF input,#sncF select{width:100%;margin-top:4px}`;document.head.appendChild(s)}

{const s=document.createElement("style");s.textContent=`#sencorBtn span{font-size:1.15rem;line-height:1}`;document.head.appendChild(s)}
})();
