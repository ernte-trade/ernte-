// ===== 🎵 Spotify prehrávač, ktorý hrá v kuse – aj počas práce v aplikácii =====
// Prehrávač (iframe) žije mimo #app priamo v <body>, takže ho prekresľovanie záložiek ani zatvorenie úvodu nezastaví.
// Na úvode sa vizuálne „prilepí“ do panelu Rádio · Spotify (iframe sa nepresúva – presun by hudbu zastavil),
// po zatvorení úvodu sa zbalí do malej pilulky nad spodnou lištou. Ťuknutie = rozbaliť / zbaliť, ✕ = vypnúť hudbu.
(function(){
let D=null,slot=null,raf=0;
const K="ernte-spd-min";
const ld=()=>{try{return localStorage.getItem(K)}catch(x){return null}},sv=v=>{try{localStorage.setItem(K,v)}catch(x){}};
function make(){if(D&&D.isConnected)return D;css();
  D=document.createElement("div");D.id="spdock";D.className="spd min";D.setAttribute("role","region");D.setAttribute("aria-label","Hudba Spotify");
  D.innerHTML=`<div class="spdb"><button type="button" class="spdt" data-spdt aria-expanded="false"><i aria-hidden="true">🎵</i><span>Rádio</span><em aria-hidden="true">▲</em></button><a class="spdo" target="_blank" rel="noopener" href="https://open.spotify.com/">Spotify ↗</a><button type="button" class="spdx" data-spdx aria-label="Vypnúť hudbu">✕</button></div><div class="spdw"><iframe title="Spotify" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>`;
  document.body.appendChild(D);return D}
function setMin(m){if(!D)return;D.classList.toggle("min",m);const t=D.querySelector("[data-spdt]");if(t)t.setAttribute("aria-expanded",String(!m));sv(m?"1":"0")}
function loop(){cancelAnimationFrame(raf);const st=()=>{if(!D)return;if(!slot||!slot.isConnected||slot.closest(".out")){api.detach();return}
    const r=slot.getBoundingClientRect();D.style.left=r.left+"px";D.style.top=r.top+"px";D.style.width=r.width+"px";raf=requestAnimationFrame(st)};st()}
const api={
  /* spustí / prepne playlist – rovnaký playlist sa nenačítava znova, hudba teda nepreruší */
  play(ref,name){const d=make(),f=d.querySelector("iframe");if(f.dataset.ref!==ref){f.src="https://open.spotify.com/embed/"+ref+"?utm_source=generator";f.dataset.ref=ref}
    d.querySelector(".spdt span").textContent=name||"Môj playlist";d.querySelector(".spdo").href="https://open.spotify.com/"+ref;d.hidden=false},
  /* úvod: prehrávač sa zobrazí presne na mieste panelu */
  attach(s){slot=s;const d=make();d.classList.add("att");d.classList.remove("min");loop()},
  /* úvod sa zavrel: prehrávač ostane hrať, zbalí sa nad spodnú lištu */
  detach(){slot=null;cancelAnimationFrame(raf);if(!D)return;const was=D.classList.contains("att");D.classList.remove("att");D.style.left=D.style.top=D.style.width="";if(was)setMin(true)},
  on:()=>!!(D&&D.isConnected&&!D.hidden),
  ref:()=>D&&D.querySelector("iframe").dataset.ref||""};
window.spDock=api;
document.addEventListener("click",e=>{if(!D||!e.target.closest)return;
  if(e.target.closest("[data-spdt]")){setMin(!D.classList.contains("min"));return}
  if(e.target.closest("[data-spdx]")){cancelAnimationFrame(raf);slot=null;D.remove();D=null;document.querySelectorAll(".whsp").forEach(w=>w.classList.add("spoff"))}});
function css(){if(document.getElementById("spd-css"))return;const s=document.createElement("style");s.id="spd-css";s.textContent=`
.spd{position:fixed;z-index:1600;right:12px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(360px,calc(100vw - 24px));display:grid;gap:6px;padding:8px;border-radius:20px;
  background:linear-gradient(150deg,rgba(30,36,58,.86),rgba(12,16,30,.9));border:1px solid rgba(165,243,252,.35);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 18px 40px rgba(0,0,0,.5),0 0 24px rgba(94,234,212,.18);color:#f1f5ff;font:600 .8rem var(--f-ui,system-ui);transition:width .25s ease,padding .25s ease}
@media (max-width:760px){.spd{bottom:calc(86px + env(safe-area-inset-bottom,0px))}}
html.pc.pc-in .spd{bottom:16px}
.spdb{display:flex;align-items:center;gap:6px;min-width:0}
.spdt{flex:1;min-width:0;display:flex;align-items:center;gap:7px;min-height:36px!important;padding:0 10px!important;border-radius:999px!important;border:0!important;background:rgba(255,255,255,.08)!important;color:inherit!important;font:inherit!important;cursor:pointer;box-shadow:none!important}
.spdt span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.spdt em{margin-left:auto;font-style:normal;opacity:.6;transform:rotate(180deg);transition:transform .2s}
.spdt i{font-style:normal}
.spdo{flex:none;font-size:.7rem;color:#d9f99d;text-decoration:none;padding:0 4px}
.spdx{flex:none;width:36px;height:36px;min-height:36px!important;padding:0!important;border-radius:50%!important;border:1px solid rgba(255,255,255,.18)!important;background:rgba(255,255,255,.06)!important;color:inherit!important;cursor:pointer;box-shadow:none!important}
.spdw{border-radius:16px;padding:1.5px;background:linear-gradient(135deg,rgba(182,255,59,.75),rgba(94,234,212,.55) 45%,rgba(255,255,255,.18))}
.spdw iframe{display:block;width:100%;height:80px;border:0;border-radius:14px;background:transparent}
/* zbalené: malá pilulka, hudba hrá ďalej (iframe ostáva vykreslený, iba neviditeľný) */
.spd.min{width:auto;max-width:min(240px,calc(100vw - 24px));padding:5px;border-radius:999px;gap:0}
.spd.min .spdo{display:none}
.spd.min .spdt em{transform:none}
.spd.min .spdw{position:fixed;left:0;bottom:0;width:300px;height:80px;opacity:0;pointer-events:none;overflow:hidden}
.spd.min .spdt i{animation:spdb 1.6s ease-in-out infinite}
@keyframes spdb{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
/* na úvode: prehrávač sedí presne v paneli Rádio · Spotify */
.spd.att{z-index:30001;right:auto;bottom:auto;padding:0;border:0;background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;border-radius:16px}
.spd.att .spdb{display:none}
.spd.att .spdw{box-shadow:0 12px 30px rgba(0,0,0,.35),0 0 26px rgba(94,234,212,.18)}
html[data-theme=light] .spd:not(.att){background:linear-gradient(150deg,rgba(255,255,255,.94),rgba(238,243,251,.92));color:#0f172a;border-color:rgba(15,23,42,.14)}
html[data-theme=light] .spd .spdo{color:#3f6212}
@media (prefers-reduced-motion:reduce){.spd.min .spdt i{animation:none}}
@media print{.spd{display:none!important}}
`;document.head.appendChild(s)}
})();
