// ===== ERNTE · HUB VZHĽAD (3. 11. príkaz majiteľa, IBA Martin a Jana – ROLE owner) =====
// Usporiadanie podľa VALKO-HUB: číslo sekcie „— 03“, veľký nadpis, KPI dlaždice s ikonou v štvorčeku a veľkým číslom.
// Menu (spodná pohyblivá lišta) ostáva bez zmeny, grafika diamantové sklo. Počíta iba z údajov, ktoré už appka má (STATE).
(function(){
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const S=()=>typeof STATE!=="undefined"&&STATE?STATE:{};
const nf=(n,d=0)=>(+n||0).toLocaleString("sk-SK",{maximumFractionDigits:d,minimumFractionDigits:0});
const eur=n=>{n=+n||0;return Math.abs(n)>=1e6?nf(n/1e6,2)+" mil. €":Math.abs(n)>=1e4?nf(n/1e3,0)+" tis. €":nf(n,0)+" €"};
const today=()=>new Date().toISOString().slice(0,10);
const ACT=["podpisany","odvoz","odvezeny","fakturacia"],LIVE=d=>!d.archived&&d.status!=="zruseny";
// [ikona, číslo, popis, tón (g zelená / b modrá / w oranžová / r červená), cieľ pre ťuk (slovo)]
const K={
 home(){const D=(S().deals||[]).filter(LIVE),R=S().reqs||[],a=D.filter(d=>ACT.includes(d.status)),t=a.reduce((s,d)=>s+(+d.tons||0),0),dv=a.reduce((s,d)=>s+Math.min(+d.delivered_t||0,+d.tons||0),0);
  return [["🤝",nf(a.length),"aktívne zmluvy","b"],["⚖️",nf(t,0)+" t","v zmluvách · dodané "+(t?nf(dv/t*100,0):0)+" %","g"],["📥",nf(R.filter(r=>r.status==="nova").length),"nové požiadavky","w"],["✍️",nf(D.filter(d=>d.status==="navrh").length),"čaká na podpis","r"]]},
 deals(){const D=(S().deals||[]).filter(LIVE),a=D.filter(d=>ACT.includes(d.status)),t=a.reduce((s,d)=>s+(+d.tons||0),0),dv=a.reduce((s,d)=>s+Math.min(+d.delivered_t||0,+d.tons||0),0),val=a.reduce((s,d)=>s+Math.max(0,(+d.tons||0)-(+d.delivered_t||0))*(+d.price||0),0);
  return [["📄",nf(D.length),"zmlúv spolu","b"],["🟢",nf(a.length),"aktívne","g"],["⚖️",(t?nf(dv/t*100,0):0)+" %",nf(dv,0)+" z "+nf(t,0)+" t dodané","g"],["💶",eur(val),"hodnota nedodaného","w"]]},
 farm(){const F=(S().farmers||[]).filter(f=>!/test|🧪/i.test(f.name||""));
  return [["👨‍🌾",nf(F.length),"farmárov","b"],["📲",nf(F.filter(f=>f.active).length),"s prístupom do appky","g"],["📞",nf(F.filter(f=>f.phone||f.email).length),"s kontaktom","g"],["🏷️",nf(F.filter(f=>!f.ico).length),"bez IČO","w"]]},
 req(){const R=S().reqs||[];return [["🆕",nf(R.filter(r=>r.status==="nova").length),"nové","w"],["⏳",nf(R.filter(r=>r.status==="v_spracovani").length),"v spracovaní","b"],["✅",nf(R.filter(r=>!["nova","v_spracovani"].includes(r.status)).length),"vybavené","g"],["🌾",nf(R.filter(r=>r.kind==="sell"&&r.status==="nova").length),"nové ponuky na predaj","g"]]},
 trans(){const R=(S().reqs||[]).filter(r=>r.kind==="transport"),T=S().trips||[];
  return [["🆕",nf(R.filter(r=>r.status==="nova").length),"nové odvozy","w"],["⏳",nf(R.filter(r=>r.status==="v_spracovani").length),"v spracovaní","b"],["🚛",nf(T.filter(t=>t.status==="na_ceste").length),"na ceste","g"],["📦",nf(T.filter(t=>t.status==="vylozene").length),"vyložené","g"]]},
 price(){const P=(S().prices||[]).filter(p=>p.price!=null&&+p.price>0),u=p=>String(p.updated_at||p.valid_from||"").slice(0,10),t=today(),old=P.map(u).filter(Boolean).sort()[0];
  const dn=old?Math.max(0,Math.round((Date.parse(t)-Date.parse(old))/864e5)):0;
  return [["💶",nf(P.length),"komodít v cenníku","b"],["🔄",nf(P.filter(p=>u(p)===t).length),"zmenené dnes","g"],["🕒",dn+" d","najstaršia cena",dn>3?"w":"g"],["📈",P.length?nf(Math.max(...P.map(p=>+p.price)),0)+" €":"–","najvyššia €/t","b"]]}
};
function tabsNow(){return [...document.querySelectorAll("#app nav.tabs [data-tab]")].map(b=>b.dataset.tab)}
function title(t){const b=document.querySelector(`#app nav.tabs [data-tab="${t}"] .tl`);return b?b.textContent.trim():t}
function html(){const t=TAB,L=tabsNow(),i=L.indexOf(t),n=String((i<0?0:i)+1).padStart(2,"0");let k=[];try{k=K[t]?K[t]():[]}catch(x){k=[]}
  const ico=(typeof TICO!=="undefined"&&TICO[t])||"•";
  return `<section class="ehb" data-ehb="${e(t)}"><div class="ehbe"><span>— ${n}</span><i></i><span>${e(new Date().toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"numeric"}))}</span></div>
   <h1 class="ehbt"><span class="ehbi" aria-hidden="true">${ico}</span>${e(title(t))}</h1>
   ${k.length?`<div class="ehbk">${k.map(x=>`<div class="ehbc t-${x[3]}"><div class="ehbs" aria-hidden="true">${x[0]}</div><b${String(x[1]).length>6?' class="ehbl"':""}>${e(x[1])}</b><small>${e(x[2])}</small></div>`).join("")}</div>`:""}</section>`}
function inject(){if(!OK())return;const app=document.getElementById("app");if(!app)return;const nav=app.querySelector("nav.tabs");if(!nav||typeof TAB==="undefined")return;
  const ex=app.querySelector("section.ehb");if(ex&&ex.dataset.ehb===TAB)return;if(ex)ex.remove();
  nav.insertAdjacentHTML("afterend",html());fix();document.body.classList.add("ehbon")}
// iné moduly vkladajú svoje pásy tiež hneď pod lištu → hlavička sa vráti navrch a popis záložky sa presunie do nej (mikroúloha, bez skoku)
function fix(){const app=document.getElementById("app");if(!app)return;const sec=app.querySelector(":scope>section.ehb"),nav=app.querySelector(":scope>nav.tabs");if(!sec||!nav)return;
  if(nav.nextElementSibling!==sec)nav.after(sec);const fd=app.querySelector(":scope>.fdesc.ftab");if(fd){const k=sec.querySelector(".ehbk");sec.insertBefore(fd,k||null)}}
const soon=f=>(window.ernteSoon||requestAnimationFrame)(f);
function wrap(){const o=window.renderStaff;if(typeof o!=="function"||o.__ehb)return;const w=function(){const r=o.apply(this,arguments);soon(()=>{try{inject()}catch(x){}});return r};Object.keys(o).forEach(k=>{if(!(k in w))try{w[k]=o[k]}catch(x){}});w.__ehb=1;window.renderStaff=w;soon(()=>{try{inject()}catch(x){}})}
const tk=setInterval(wrap,500);setTimeout(()=>clearInterval(tk),60000);wrap();
// poistka: niektoré moduly prekresľujú #app samy
try{new MutationObserver(()=>{if(!OK())return;if(!document.querySelector("#app section.ehb"))soon(()=>{try{inject()}catch(x){}});else try{fix()}catch(x){}}).observe(document.getElementById("app")||document.body,{childList:true})}catch(x){}
const st=document.createElement("style");st.textContent=`
#app>section.ehb,#app:has(>.hub.owh)>section.ehb{order:0}
.ehb .fdesc.ftab{margin:8px 0 0;background:none;border:0;padding:0;box-shadow:none;text-align:left}
.ehb .fdesc.ftab p{font-size:14px;opacity:.82;line-height:1.4}
.ehb{position:relative;margin:10px 0 14px;padding:18px 16px 16px;border-radius:22px;overflow:hidden;text-align:left;
 background:linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.03) 45%,rgba(120,200,255,.06));
 border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 10px 30px rgba(0,0,0,.25)}
.ehb:before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;
 background:linear-gradient(120deg,rgba(255,255,255,.55),rgba(120,220,255,.25) 30%,transparent 55%,rgba(180,255,200,.3));
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.ehbe{display:flex;align-items:center;gap:10px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.7;font-weight:600}
.ehbe i{flex:1;height:1px;background:linear-gradient(90deg,currentColor,transparent);opacity:.4}
.ehbe span:last-child{letter-spacing:.04em;text-transform:none;font-weight:500}
.ehbt{margin:8px 0 2px;font-size:clamp(26px,7.4vw,40px);line-height:1.08;font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;gap:10px;overflow-wrap:anywhere}
.ehbi{display:inline-grid;place-items:center;width:1.25em;height:1.25em;font-size:.8em;border-radius:12px;flex:0 0 auto;
 background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.22)}
.ehbk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
@media (min-width:680px){.ehbk{grid-template-columns:repeat(4,minmax(0,1fr))}}
.ehbc{position:relative;min-width:0;padding:14px 12px 12px;border-radius:18px;text-align:left;
 background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.14);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
.ehbc b{display:block;font-size:clamp(22px,6.2vw,30px);font-weight:800;letter-spacing:-.02em;line-height:1.1;margin-top:2px;padding-right:44px;overflow-wrap:anywhere}
.ehbc b.ehbl{font-size:clamp(18px,5vw,26px);white-space:nowrap}
.ehbc small{display:block;margin-top:4px;font-size:12.5px;opacity:.75;line-height:1.3;overflow-wrap:anywhere}
.ehbs{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-size:18px;
 background:var(--ehbc,rgba(120,200,255,.18));border:1px solid rgba(255,255,255,.18)}
.ehbc.t-g{--ehbc:rgba(60,220,140,.22)}.ehbc.t-b{--ehbc:rgba(80,160,255,.24)}.ehbc.t-w{--ehbc:rgba(255,180,60,.24)}.ehbc.t-r{--ehbc:rgba(255,90,90,.24)}
.ehbc.t-g b{color:#5fe3a1}.ehbc.t-w b{color:#ffc163}.ehbc.t-r b{color:#ff8a8a}
[data-theme=light] .ehb{background:linear-gradient(135deg,rgba(255,255,255,.85),rgba(235,245,255,.7));border-color:rgba(20,60,120,.14);box-shadow:inset 0 1px 0 #fff,0 10px 26px rgba(20,40,80,.12)}
[data-theme=light] .ehbc{background:linear-gradient(160deg,#fff,rgba(240,246,255,.85));border-color:rgba(20,60,120,.12)}
[data-theme=light] .ehbc.t-g b{color:#0f9a5a}[data-theme=light] .ehbc.t-w b{color:#c27400}[data-theme=light] .ehbc.t-r b{color:#c62828}
`;document.head.appendChild(st);
})();
