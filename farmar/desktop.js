// ===== ERNTE · PC VERZIA (počítač) – „sklo · diamant“ =====
// Aplikácia sama zistí, či je otvorená na počítači (široká obrazovka + myš), a prepne sa na rozloženie pre PC:
// bočný sklenený panel s logom, menu a tlačidlami, široký obsah, žiariace diamantové karty, svetlo pod kurzorom.
// Na mobile a tablete sa nič nemení. Dá sa prepnúť ručne (📱 / 💻) – voľba sa pamätá v tomto prehliadači.
// Iba vzhľad – žiadne dáta, prístupy ani viditeľnosť sa nemenia.
(function(){
const KEY="ernte-view",H=document.documentElement;
const MQ=matchMedia("(min-width:1024px)"),FINE=matchMedia("(hover:hover) and (pointer:fine)");
const pref=()=>{try{return localStorage.getItem(KEY)||""}catch(x){return ""}};
const auto=()=>MQ.matches&&(FINE.matches||innerWidth>=1280);
const isPC=()=>{const p=pref();if(p==="pc")return innerWidth>=900;if(p==="mobile")return false;return auto()};
const inApp=()=>(typeof ROLE!=="undefined"&&!!ROLE)||(typeof FARMER!=="undefined"&&!!FARMER);
const isFarmer=()=>typeof FARMER!=="undefined"&&!!FARMER;
function dev(){const u=navigator.userAgent;const os=/Windows/.test(u)?"Windows":/Mac OS X|Macintosh/.test(u)?"Mac":/CrOS/.test(u)?"Chromebook":/Linux/.test(u)?"Linux":"počítač";
  const br=/Edg\//.test(u)?"Edge":/OPR\//.test(u)?"Opera":/Firefox\//.test(u)?"Firefox":/Chrome\//.test(u)?"Chrome":/Safari\//.test(u)?"Safari":"prehliadač";return {os,br}}

const CSS=`
html.pc{--pc-side:276px;--pc-gap:22px;--pc-prism:linear-gradient(135deg,#a5f3fc 0%,#c4b5fd 30%,#f0abfc 50%,#bef264 72%,#67e8f9 100%)}
html.pc body{min-height:100vh;overflow-x:hidden}
/* --- živé pozadie: polárna žiara + diamantové fazety --- */
html.pc body::after{content:"";position:fixed;inset:-20%;z-index:-1;pointer-events:none;opacity:.9;
 background:radial-gradient(30% 36% at 20% 20%,rgba(34,211,238,.16),transparent 70%),radial-gradient(26% 30% at 80% 30%,rgba(167,139,250,.18),transparent 70%),radial-gradient(30% 34% at 60% 85%,rgba(190,242,100,.08),transparent 70%),radial-gradient(22% 26% at 10% 80%,rgba(240,171,252,.10),transparent 70%);
 filter:blur(10px);animation:pcAur 38s ease-in-out infinite alternate}
@keyframes pcAur{0%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}50%{transform:translate3d(3%,-2%,0) rotate(6deg) scale(1.06)}100%{transform:translate3d(-3%,2%,0) rotate(-5deg) scale(1.02)}}
#pcFacet{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.5;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='.035'%3E%3Cpath d='M80 0L160 80L80 160L0 80Z'/%3E%3Cpath d='M80 0L80 160M0 80H160M40 40L120 120M120 40L40 120'/%3E%3C/g%3E%3C/svg%3E");
 -webkit-mask-image:radial-gradient(70% 60% at 60% 40%,#000,transparent 80%);mask-image:radial-gradient(70% 60% at 60% 40%,#000,transparent 80%)}
#pcGlow{position:fixed;left:0;top:0;width:620px;height:620px;margin:-310px 0 0 -310px;border-radius:50%;pointer-events:none;z-index:0;
 background:radial-gradient(closest-side,rgba(165,243,252,.10),rgba(196,181,253,.06) 45%,transparent 75%);mix-blend-mode:screen;transition:opacity .4s;opacity:0;will-change:transform}
html.pc.pc-mv #pcGlow{opacity:1}
/* --- rozloženie: bočný panel + široký obsah --- */
html.pc.pc-in body>.wrap{max-width:none;margin:0;padding:0 34px 40px calc(var(--pc-side) + var(--pc-gap) + 18px);display:block}
html.pc.pc-in #app{max-width:1260px;margin:22px auto 0;gap:18px}
html.pc.pc-in body.ds-tab-trans #app,html.pc.pc-in body.ds-tab-fleet #app{max-width:1500px}
html.pc.pc-in header.top{position:fixed;z-index:60;left:var(--pc-gap);top:var(--pc-gap);width:var(--pc-side);box-sizing:border-box;padding:18px 18px 14px;margin:0;
 display:flex;flex-wrap:wrap;gap:12px 10px;align-items:center;border-radius:26px 26px 0 0;border:1px solid rgba(255,255,255,.16);border-bottom:0;
 background:linear-gradient(160deg,rgba(255,255,255,.13),rgba(255,255,255,.04) 60%),rgba(12,18,36,.55);-webkit-backdrop-filter:blur(26px) saturate(180%);backdrop-filter:blur(26px) saturate(180%);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
html.pc.pc-in header.top>img{width:52px;height:52px;border-radius:16px;object-fit:contain;background:#fff;padding:5px;box-sizing:border-box;box-shadow:0 0 0 1px rgba(255,255,255,.5),0 8px 26px rgba(34,211,238,.25),0 0 40px rgba(167,139,250,.25)}
html.pc.pc-in header.top .tt{min-width:0;flex:1 1 150px}html.pc.pc-in header.top h1{font-size:1rem;line-height:1.2;margin:0;white-space:normal;overflow:visible;text-overflow:clip;background:linear-gradient(90deg,#fff,#d6f7ff 40%,#e9d5ff);-webkit-background-clip:text;background-clip:text;color:transparent}
html.pc.pc-in header.top small{font-size:.76rem;opacity:.75}
html.pc.pc-in header.top>button:not([hidden]){margin:0;flex:1 1 auto;display:inline-flex;align-items:center;justify-content:center}html.pc.pc-in header.top>button.out .ot{display:inline}
html.pc.pc-in header.top .topref,html.pc.pc-in header.top .aibtn,html.pc.pc-in header.top .out{min-height:40px}
/* menu vľavo */
html.pc.pc-in #app>nav.tabs:not(.trtabs),html.pc.pc-in #pcNav{position:fixed!important;z-index:59;left:var(--pc-gap);width:var(--pc-side);box-sizing:border-box;top:var(--pc-top,150px);bottom:calc(var(--pc-gap) + 64px);
 margin:0;padding:10px;display:flex;flex-direction:column;gap:3px;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;border-radius:0;border:1px solid rgba(255,255,255,.16);border-top:1px solid rgba(255,255,255,.08);border-bottom:0;
 background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025)),rgba(12,18,36,.55);-webkit-backdrop-filter:blur(26px) saturate(180%);backdrop-filter:blur(26px) saturate(180%);box-shadow:none}
html.pc.pc-in #app>nav.tabs:not(.trtabs) button,html.pc.pc-in #pcNav button{flex:none;width:100%;min-width:0;min-height:44px;display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:12px;padding:8px 12px;border-radius:14px;
 font:600 .9rem var(--f-ui);letter-spacing:0;text-align:left;color:#cdd6ea;background:transparent;border:1px solid transparent;position:relative;transition:background .2s,color .2s,transform .2s}
html.pc.pc-in #pcNav button:not(.on){background:transparent!important;border-color:transparent!important;box-shadow:none!important}
html.pc.pc-in #pcNav button::after{display:none!important}
html.pc.pc-in #app>nav.tabs:not(.trtabs) button:hover,html.pc.pc-in #pcNav button:hover{background:rgba(255,255,255,.06);color:#fff;transform:translateX(2px)}
html.pc.pc-in #app>nav.tabs:not(.trtabs) .ti,html.pc.pc-in #pcNav .ti{font-size:1.15rem;width:26px;text-align:center;flex:none;filter:drop-shadow(0 0 8px rgba(165,243,252,.25))}
html.pc.pc-in #app>nav.tabs:not(.trtabs) .tl,html.pc.pc-in #pcNav .tl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html.pc.pc-in #app>nav.tabs:not(.trtabs) .cnt{position:static;margin-left:auto;padding:0 8px;font-size:.7rem;line-height:20px;border-radius:99px}
html.pc.pc-in #app>nav.tabs:not(.trtabs) button[aria-pressed=true],html.pc.pc-in #pcNav button.on{color:#fff;background:linear-gradient(100deg,rgba(34,211,238,.20),rgba(167,139,250,.16));border-color:rgba(165,243,252,.35);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 0 24px rgba(34,211,238,.18)}
html.pc.pc-in #app>nav.tabs:not(.trtabs) button[aria-pressed=true]::before,html.pc.pc-in #pcNav button.on::before{content:"";position:absolute;left:-10px;top:10px;bottom:10px;width:3px;border-radius:3px;background:var(--pc-prism);box-shadow:0 0 12px rgba(165,243,252,.8)}
html.pc.pc-in #app>nav.tabs:not(.trtabs)>.ds-ind{display:none}
#pcFoot{position:fixed;z-index:59;left:var(--pc-gap);bottom:var(--pc-gap);width:var(--pc-side);box-sizing:border-box;height:64px;padding:10px 12px;display:none;align-items:center;gap:10px;
 border-radius:0 0 26px 26px;border:1px solid rgba(255,255,255,.16);border-top:1px solid rgba(255,255,255,.08);background:linear-gradient(0deg,rgba(255,255,255,.08),rgba(255,255,255,.03)),rgba(12,18,36,.6);-webkit-backdrop-filter:blur(26px) saturate(180%);backdrop-filter:blur(26px) saturate(180%);
 box-shadow:0 30px 60px rgba(2,6,23,.45);font:500 .74rem var(--f-ui);color:#aab6cc}
#pcFoot b{display:block;color:#eaf6ff;font-size:.8rem}#pcFoot .d{flex:none;font-size:1.4rem;filter:drop-shadow(0 0 10px rgba(165,243,252,.5))}#pcFoot span:not(.d){flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pcFoot button{min-height:34px;min-width:0;padding:0 10px;border-radius:12px;font-size:.74rem;white-space:nowrap}
html.pc.pc-in #pcFoot{display:flex}
/* prizmatická hrana celého bočného panela */
#pcEdge{position:fixed;z-index:61;left:var(--pc-gap);top:var(--pc-gap);bottom:var(--pc-gap);width:var(--pc-side);border-radius:26px;pointer-events:none;display:none;padding:1px;
 background:conic-gradient(from var(--pc-a,0deg),rgba(165,243,252,.0),rgba(165,243,252,.75),rgba(196,181,253,.6),rgba(240,171,252,.0) 40%,rgba(190,242,100,.5) 70%,rgba(165,243,252,.0));
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:pcSpin 14s linear infinite}
html.pc.pc-in #pcEdge{display:block}
@property --pc-a{syntax:"<angle>";inherits:false;initial-value:0deg}
@keyframes pcSpin{to{--pc-a:360deg}}
/* --- karty: diamantové sklo so svetlom pod kurzorom --- */
html.pc :is(.card,.ds-tile,.ds-kpi,.ds-trow,.vd,.kb,.xd,.xv,.vt,.ds-fc,.ftlb,.acn-r){--mx:50%;--my:0%}
html.pc #app>:is(.card,.vd,.kb,.ds-g){-webkit-backdrop-filter:blur(24px) saturate(170%);backdrop-filter:blur(24px) saturate(170%);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.32),inset 0 0 0 1px rgba(255,255,255,.03),0 24px 60px rgba(2,6,23,.45)}
html.pc :is(.card,.ds-tile,.ds-kpi,.ds-trow,.vd,.kb,.xd,.xv,.vt,.ds-fc)::after{left:0!important;top:0;width:100%;height:100%;transform:none!important;animation:none!important;opacity:0;transition:opacity .35s ease;
 background:radial-gradient(460px circle at var(--mx) var(--my),rgba(200,245,255,.13),rgba(196,181,253,.06) 38%,transparent 62%)}
html.pc :is(.card,.ds-tile,.ds-kpi,.ds-trow,.vd,.kb,.xd,.xv,.vt,.ds-fc):hover::after{opacity:1}
html.pc :is(.card,.ds-tile,.ds-kpi,.vd,.kb,.xv,.vt,.ds-fc):hover{border-color:rgba(165,243,252,.38);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 26px 64px rgba(2,6,23,.55),0 0 0 1px rgba(165,243,252,.10),0 0 46px rgba(34,211,238,.12)}
html.pc :is(.card,.ds-tile,.ds-kpi,.vd,.kb,.xv,.vt,.ds-fc)::before{height:1.5px;background:linear-gradient(90deg,transparent 2%,rgba(165,243,252,.7) 20%,#fff 50%,rgba(240,171,252,.7) 80%,transparent 98%)}
html.pc #app h2{font-size:.8rem;letter-spacing:.2em;margin-top:14px;background:var(--pc-prism);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:pcH 12s linear infinite}
@keyframes pcH{to{background-position:200% 0}}
/* tlačidlá: sklenené s leskom */
html.pc #app button.pri,html.pc #app .btn.pri{background:linear-gradient(135deg,#67e8f9,#a78bfa 55%,#f0abfc);color:#0b1020;border:0;box-shadow:0 10px 28px rgba(103,232,249,.25),inset 0 1px 0 rgba(255,255,255,.6)}
html.pc #app button{transition:transform .18s ease,box-shadow .18s ease,background .18s ease}html.pc #app button:hover{transform:translateY(-1px)}
html.pc #app input:focus,html.pc #app select:focus,html.pc #app textarea:focus{box-shadow:0 0 0 3px rgba(103,232,249,.25),0 0 24px rgba(103,232,249,.15)}
/* farmár: dlaždice v 4 stĺpcoch, väčšie */
html.pc.pc-in .ftl{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}html.pc.pc-in .ftlb{min-height:122px;padding:18px;border-radius:22px}html.pc.pc-in .ftlb .ftli{font-size:2rem}
html.pc.pc-in .ftlb:hover{transform:translateY(-3px);border-color:rgba(165,243,252,.45);box-shadow:0 22px 50px rgba(2,6,23,.5),0 0 40px rgba(34,211,238,.15)}
html.pc.pc-in .hero{padding:28px 30px}
/* ostatné plávajúce prvky mimo bočného panela */
html.pc.pc-in .privl{padding-left:0;text-align:center;margin-top:24px}
html.pc.pc-in .toast{left:calc(var(--pc-side) + var(--pc-gap)*2);right:0;margin:0 auto;width:max-content;max-width:min(560px,60vw)}
/* prihlásenie na PC: veľká diamantová karta v strede */
html.pc.pc-out body>.wrap{max-width:560px;margin:6vh auto 0;padding:0 20px}
html.pc.pc-out header.top{justify-content:center;padding-top:26px}html.pc.pc-out header.top>img{width:64px;height:64px;filter:drop-shadow(0 0 24px rgba(165,243,252,.35))}
html.pc.pc-out #app>.card{padding:30px 32px;border-radius:28px;-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 40px 90px rgba(2,6,23,.6),0 0 80px rgba(34,211,238,.10)}
/* svetlý režim */
html.pc[data-theme=light] header.top,html.pc[data-theme=light] #app>nav.tabs:not(.trtabs),html.pc[data-theme=light] #pcNav,html.pc[data-theme=light] #pcFoot{background:linear-gradient(160deg,rgba(255,255,255,.85),rgba(255,255,255,.6));border-color:rgba(15,23,42,.08);color:#0f172a}
html.pc[data-theme=light] header.top h1{background:linear-gradient(90deg,#0f172a,#0e7490);-webkit-background-clip:text;background-clip:text}
html.pc[data-theme=light] #app>nav.tabs:not(.trtabs) button,html.pc[data-theme=light] #pcNav button{color:#334155}html.pc[data-theme=light] #app>nav.tabs:not(.trtabs) button[aria-pressed=true],html.pc[data-theme=light] #pcNav button.on{color:#0f172a}
html.pc[data-theme=light] #pcFoot b{color:#0f172a}html.pc[data-theme=light] #pcGlow{mix-blend-mode:multiply;opacity:.35}
/* prepínač späť na PC, keď je vynútené mobilné zobrazenie */
#pcBack{position:fixed;z-index:9000;left:16px;bottom:16px;display:none;min-height:40px;padding:0 14px;border-radius:99px;font:700 .8rem var(--f-ui);color:#0b1020;border:0;background:linear-gradient(135deg,#67e8f9,#a78bfa);box-shadow:0 10px 30px rgba(0,0,0,.4);cursor:pointer}
html.pc-forced-m #pcBack{display:block}
@media (prefers-reduced-motion:reduce){html.pc body::after,#pcEdge,html.pc #app h2{animation:none}#pcGlow{display:none}}
`;
function ensure(){if(!document.getElementById("pcCss")){const s=document.createElement("style");s.id="pcCss";s.textContent=CSS;document.head.appendChild(s)}
  const add=(id,tag,html)=>{let x=document.getElementById(id);if(!x){x=document.createElement(tag);x.id=id;if(html)x.innerHTML=html;document.body.appendChild(x)}return x};
  add("pcFacet","div");add("pcGlow","div");add("pcEdge","div");
  const f=add("pcFoot","div");const d=dev();
  f.innerHTML=`<span class="d" aria-hidden="true">💻</span><span><b>PC verzia</b>${d.os} · ${d.br}</span><button type="button" data-pcview="mobile" title="Zobraziť ako v mobile" aria-label="Zobraziť ako v mobile">📱</button>`;
  const b=add("pcBack","button");b.type="button";b.dataset.pcview="auto";b.textContent="💻 PC verzia"}
// menu pre farmára (nemá záložky): skoky na sekcie podľa nadpisov
const FI={"čo chcete":"🏠","výkupné":"💶","navrhnite":"💰","moje obchody":"📄","odvoz":"🚛","moje požiadavky":"📨","doprava":"🚦","počasie":"🌦️","najbližších":"📅","cieľová":"🎯","agro":"🚜","kontakt":"📞","kalkul":"🧮","bonus":"⭐"};
function farmNav(){let n=document.getElementById("pcNav");const app=document.getElementById("app");if(!isFarmer()||!app){if(n)n.remove();return}
  const H=[...app.querySelectorAll("h2")].filter(h=>h.offsetParent!==null&&h.textContent.trim());
  if(!n){n=document.createElement("nav");n.id="pcNav";n.setAttribute("aria-label","Sekcie");document.body.appendChild(n)}
  const ic=t=>{const l=t.toLowerCase();for(const k in FI)if(l.includes(k))return FI[k];return "◆"};
  n.innerHTML=`<button type="button" data-pcgo="top" class="on"><span class="ti">🏠</span><span class="tl">Prehľad</span></button>`+H.filter(h=>!h.classList.contains("ftl-h")).map((h,i)=>{h.dataset.pci=i;const t=h.textContent.replace(/\s+/g," ").trim().split(" · ")[0].replace(/^[^\p{L}]+/u,"");return `<button type="button" data-pcgo="${i}"><span class="ti">${ic(t)}</span><span class="tl">${t.replace(/[<>&]/g,"")}</span></button>`}).join("")}
function spy(){const n=document.getElementById("pcNav");if(!n)return;const H=[...document.querySelectorAll("#app h2[data-pci]")];let cur="top";for(const h of H){if(h.getBoundingClientRect().top<160)cur=h.dataset.pci}
  n.querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.pcgo===cur))}
function topH(){const h=document.querySelector("header.top");if(h&&H.classList.contains("pc-in"))H.style.setProperty("--pc-top",(h.getBoundingClientRect().bottom)+"px")}
function apply(){const pc=isPC();H.classList.toggle("pc",pc);H.classList.toggle("pc-forced-m",pref()==="mobile"&&auto());
  const inn=pc&&inApp();H.classList.toggle("pc-in",inn);H.classList.toggle("pc-out",pc&&!inn);
  if(pc){ensure();if(inn){if(isFarmer())farmNav();else{const n=document.getElementById("pcNav");if(n)n.remove()}requestAnimationFrame(topH)}}
  else{const n=document.getElementById("pcNav");if(n)n.remove()}
  if(!pc&&pref()==="mobile"&&auto())ensure()}
// po každom prekreslení
function wrap(n){const o=window[n];if(typeof o!=="function"||o.__pc)return;const w=function(){const r=o.apply(this,arguments);try{apply()}catch(x){}return r};w.__pc=1;Object.keys(o).forEach(k=>{try{w[k]=o[k]}catch(x){}});window[n]=w}
const tk=setInterval(()=>{wrap("renderStaff");wrap("renderFarmer");wrap("showLogin");apply()},700);setTimeout(()=>clearInterval(tk),60000);
apply();MQ.addEventListener?.("change",apply);FINE.addEventListener?.("change",apply);addEventListener("resize",()=>{clearTimeout(apply.t);apply.t=setTimeout(apply,150)});
// svetlo pod kurzorom + odlesk na karte
let raf=0,mx=0,my=0,tgt=null;
addEventListener("pointermove",e=>{if(!H.classList.contains("pc")||e.pointerType!=="mouse")return;mx=e.clientX;my=e.clientY;tgt=e.target;H.classList.add("pc-mv");if(raf)return;
  raf=requestAnimationFrame(()=>{raf=0;const g=document.getElementById("pcGlow");if(g)g.style.transform=`translate3d(${mx}px,${my}px,0)`;
    const c=tgt&&tgt.closest&&tgt.closest(".card,.ds-tile,.ds-kpi,.ds-trow,.vd,.kb,.xd,.xv,.vt,.ds-fc");if(c){const r=c.getBoundingClientRect();c.style.setProperty("--mx",(mx-r.left)+"px");c.style.setProperty("--my",(my-r.top)+"px")}})},{passive:true});
document.addEventListener("mouseleave",()=>H.classList.remove("pc-mv"));
addEventListener("scroll",()=>{if(H.classList.contains("pc-in")&&isFarmer())spy()},{passive:true});
document.addEventListener("click",e=>{const v=e.target.closest&&e.target.closest("[data-pcview]");if(v){try{if(v.dataset.pcview==="auto")localStorage.removeItem(KEY);else localStorage.setItem(KEY,v.dataset.pcview)}catch(x){}apply();scrollTo(0,0);
    if(typeof toast==="function")toast(v.dataset.pcview==="mobile"?"Mobilné zobrazenie. Späť cez tlačidlo 💻 PC verzia vľavo dole.":"PC verzia zapnutá.");return}
  const g=e.target.closest&&e.target.closest("[data-pcgo]");if(g){if(g.dataset.pcgo==="top"){scrollTo({top:0,behavior:"smooth"});return}const h=document.querySelector(`#app h2[data-pci="${g.dataset.pcgo}"]`);if(h)scrollTo({top:h.getBoundingClientRect().top+scrollY-24,behavior:"smooth"})}});
window.ernteView={isPC,apply,set:v=>{try{v?localStorage.setItem(KEY,v):localStorage.removeItem(KEY)}catch(x){}apply()}};
})();
