// ===== 📷 FOTKY NAMIESTO KRESLENÝCH IKON (príkaz majiteľa 1. 11. 2026) =====
// Ikony záložiek (všetci: majiteľ, tím, farmári, Junior), dlaždíc a hlavičiek návodov „Ako to funguje“ sú skutočné fotky
// z Wikimedia Commons (voľné licencie CC0 / CC BY / CC BY-SA) – img/foto/<kľúč>.jpg, autori a licencie v img/foto/zdroje.json
// a na stránke fotky-zdroje.html.
(function(){
const F=new Set(["agro","bio","bulb","cal","calc","chart","coin","corn","danube","deals","evid","factory","farm","fleet","game","globe","grad","home","inv","money","nov","phone","pkg","pred","price","qd","req","scroll","sheaf","star","team","test","trans","trophy","trus","wx","zuct"]);
const img=(k,n)=>`<img class="ffo" src="img/foto/${k}.jpg" alt="" width="${n}" height="${n}" decoding="async" draggable="false">`;
function tabs(){document.querySelectorAll("#app nav.tabs>.uvodb .ti").forEach(ti=>{const i=ti.querySelector("img");if(i&&i.classList.contains("ffo"))return;ti.innerHTML=img("star",34)});document.querySelectorAll("#app nav.tabs>button[data-tab] .ti").forEach(ti=>{const k=({klient:"phone"})[ti.parentElement.dataset.tab]||ti.parentElement.dataset.tab;if(!F.has(k))return;const i=ti.querySelector("img");if(i&&i.classList.contains("ffo"))return;ti.innerHTML=img(k,34)})}
// hlavička návodu „Ako to funguje“
const oh=window.openHelp;if(typeof oh==="function"){window.openHelp=function(k){const r=oh.apply(this,arguments);try{const h=document.querySelector("#helpSheet .hic");if(h&&F.has(k))h.innerHTML=img(k,48);const b=document.querySelector("#helpSheet .hbox");if(b&&!b.querySelector(".fotozdroj"))b.insertAdjacentHTML("beforeend",`<a class="fotozdroj" href="fotky-zdroje.html" target="_blank" rel="noopener">📷 Fotky: Wikimedia Commons – autori a licencie</a>`)}catch(x){}return r}}
let q=0;const sch=()=>{if(q)return;q=1;(window.ernteSoon||requestAnimationFrame)(()=>{q=0;tabs()})};
function boot(){const a=document.getElementById("app");if(!a){setTimeout(boot,400);return}new MutationObserver(sch).observe(a,{childList:true,subtree:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
{const s=document.createElement("style");s.textContent=`
img[src*="img/foto/"]{object-fit:cover!important;border-radius:24%!important;filter:none!important;animation:none!important;box-shadow:0 3px 10px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.15);background:#1b2433}
#app nav.tabs>button .ti img.ffo{width:30px;height:30px;display:block}
#app nav.tabs.otab>button .ti img.ffo{width:34px;height:34px}
#app nav.tabs>button[aria-pressed=true] .ti img.ffo{box-shadow:0 0 0 2px rgba(182,255,59,.85),0 4px 12px rgba(0,0,0,.4)!important}
#helpSheet .hic img.ffo{width:48px;height:48px;display:block}
.fotozdroj{display:block;text-align:center;font-size:.72rem;opacity:.6;margin:10px 0 0}`;document.head.appendChild(s)}
})();
