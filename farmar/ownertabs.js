// ===== 📊 MOJE SEKCIE (iba Martin, príkaz majiteľa 31. 10.) =====
// Lišta sekcií sa zoradí od najpoužívanejšej (otvorenia + čas, spoločne pre všetky zariadenia – tab_use) a dostane
// nový živý sklenený vzhľad s 3D ikonami (Microsoft Fluent Emoji 3D, licencia MIT, img/ico/).
(function(){
const OK=()=>typeof MAIN_OK==="function"&&MAIN_OK()&&typeof ROLE!=="undefined"&&ROLE==="owner"&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const LK="ernte-tabuse";
// odhad na začiatok (kým sa nenazbiera používanie): podľa toho, s čím Martin najčastejšie pracuje
const SEED=["home","qd","price","deals","req","farm","pred","fleet","cal","danube","trans","zuct","calc","team","wx","agro","evid","trus","nov","test","inv"];
const ICO=["cal","test","qd","pred","danube","nov","evid","trus","agro","zuct","home","req","price","trans","fleet","deals","farm","wx","team","calc"];
let U={},DB={},cur=null,t0=0;
try{U=JSON.parse(localStorage.getItem(LK)||"{}")||{}}catch(e){U={}}
const saveL=()=>{try{localStorage.setItem(LK,JSON.stringify(U))}catch(e){}};
function score(k){const a=U[k]||{},b=DB[k]||{};const n=Math.max(a.n||0,b.n||0),s=Math.max(a.s||0,b.s||0);
  const i=SEED.indexOf(k);return n*1+s/60*.5+(i<0?0:(SEED.length-i)*.05)}
function close(){if(!cur||!t0)return;const s=Math.round(Math.min(1800,(Date.now()-t0)/1000));const k=cur;cur=null;t0=0;if(s<2)return;
  (U[k]||(U[k]={n:0,s:0})).s+=s;saveL();try{sb.rpc("tab_use_add",{p_tab:k,p_s:s}).then(()=>{},()=>{})}catch(e){}}
function open(k){if(k===cur)return;close();cur=k;t0=Date.now();(U[k]||(U[k]={n:0,s:0})).n++;saveL()}
document.addEventListener("visibilitychange",()=>{if(!OK())return;if(document.hidden)close();else if(typeof TAB!=="undefined"){cur=null;open(TAB);(U[TAB].n)--}});
addEventListener("pagehide",close);
let loaded=0;async function load(){if(loaded)return;loaded=1;try{const r=await sb.rpc("tab_use_get");if(!r.error&&r.data){DB=r.data;
  // spojenie: v DB sú všetky zariadenia; miestne počty po nahratí nastav na DB (aby sa nepočítali dvakrát)
  for(const k in DB){U[k]={n:Math.max((U[k]||{}).n||0,DB[k].n),s:Math.max((U[k]||{}).s||0,DB[k].s)}}saveL();arrange()}}catch(e){}}
function arrange(){if(!OK())return;const nav=document.querySelector("#app nav.tabs");if(!nav)return;
  nav.classList.add("otab");
  const B=[...nav.querySelectorAll(":scope>button[data-tab]")];
  const S=B.slice().sort((a,b)=>score(b.dataset.tab)-score(a.dataset.tab));
  const order=S.map(b=>b.dataset.tab).join(",");
  if(nav.dataset.ord!==order){S.forEach((b,i)=>{nav.appendChild(b);b.style.setProperty("--i",i)});nav.dataset.ord=order}
  S.forEach((b,i)=>{const k=b.dataset.tab,ti=b.querySelector(".ti");b.classList.toggle("otop",i<3);
    if(ti&&ICO.includes(k)&&!ti.querySelector("img")){ti.innerHTML=`<img src="img/ico/${k}.png" alt="" width="34" height="34" decoding="async" draggable="false">`}});
  const a=nav.querySelector('[aria-pressed="true"]');if(a&&nav.scrollWidth>nav.clientWidth+2&&!nav._sc){nav._sc=1;nav.scrollLeft=Math.max(0,a.offsetLeft-(nav.clientWidth-a.offsetWidth)/2)}}
function wrap(){const o=window.renderStaff;if(typeof o!=="function"||o.__otab)return false;
  const w=function(){const r=o.apply(this,arguments);try{if(OK()){if(typeof TAB!=="undefined")open(TAB);arrange();load()}}catch(e){}return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__otab=1;window.renderStaff=w;return true}
(function tryWrap(n){if(!wrap()&&n<60)setTimeout(()=>tryWrap(n+1),250)})(0);
{const s=document.createElement("style");s.textContent=`
#app nav.tabs.otab{gap:6px;padding:8px;border-radius:26px;background:linear-gradient(120deg,rgba(124,92,255,.20),rgba(34,211,238,.10) 40%,rgba(182,255,59,.10) 70%,rgba(124,92,255,.20));background-size:300% 100%;animation:otbg 14s ease-in-out infinite;border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 14px 40px rgba(0,0,0,.35);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%)}
#app nav.tabs.otab>button{min-width:74px;min-height:72px!important;padding:6px 8px 5px!important;gap:3px!important;border-radius:20px!important;background:linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.02))!important;border:1px solid rgba(255,255,255,.12)!important;color:#e8eefc!important;overflow:visible}
#app nav.tabs.otab>button .ti{font-size:1.9rem!important;line-height:1;height:36px;display:grid;place-items:center}
#app nav.tabs.otab>button .ti img{width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,.45));animation:otbob 3.6s ease-in-out infinite;animation-delay:calc(var(--i,0)*-.37s)}
#app nav.tabs.otab>button .tl{font-size:max(.7rem,12px)!important;font-weight:700;letter-spacing:.01em;opacity:.92}
#app nav.tabs.otab>button.otop::after{content:"";position:absolute;top:5px;left:7px;width:6px;height:6px;border-radius:50%;background:#b6ff3b;box-shadow:0 0 8px #b6ff3b;animation:otdot 2.2s ease-in-out infinite}
#app nav.tabs.otab>button[aria-pressed=true]{background:linear-gradient(160deg,rgba(182,255,59,.30),rgba(34,211,238,.18))!important;border-color:rgba(182,255,59,.75)!important;box-shadow:0 0 0 1px rgba(182,255,59,.35),0 8px 26px rgba(182,255,59,.30),inset 0 1px 0 rgba(255,255,255,.45)!important;color:#fff!important}
#app nav.tabs.otab>button[aria-pressed=true] .ti img{animation:otpop 2.4s ease-in-out infinite;filter:drop-shadow(0 0 10px rgba(182,255,59,.55)) drop-shadow(0 6px 8px rgba(0,0,0,.4))}
#app nav.tabs.otab>.ds-ind{display:none!important}
@keyframes otbg{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes otbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes otpop{0%,100%{transform:translateY(-1px) scale(1.06)}50%{transform:translateY(-4px) scale(1.14) rotate(-4deg)}}
@keyframes otdot{0%,100%{opacity:.4}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){#app nav.tabs.otab,#app nav.tabs.otab *{animation:none!important}}`;document.head.appendChild(s)}
})();
