// ===== 📊 ERNTE AGRO INDEX – iba majiteľ (MAIN_OK), v Algomancii za PIN-om (3. 11. príkaz majiteľa „zapracuj pod heslom do mojej app“) =====
// Ukážka produktu na predaj: regionálny index výkupných cien (východné SK, HU, hranica UA) + báza voči burze + index dopravy.
// Iba verejné zdroje, ktoré už zbiera bot (market.json, burza-hist/hist.json, fuel-data/fuel.json). Mená firiem sa nezobrazujú.
// Burza: kontrakt končiaci najskôr o 20 dní (rovnako ako bot / odberatelia) – končiaci kontrakt (napr. MATIF kukurica nov) sa preskočí.
(function(){
const OK=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f=(x,d=0)=>x==null||!isFinite(x)?"–":(+x).toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d});
const D={at:0,busy:false,m:null,h:null,fu:null,err:""};
const rr=()=>{if(typeof TAB!=="undefined"&&TAB==="pred"&&typeof renderStaff==="function")renderStaff()};
async function load(){if(D.busy)return;D.busy=true;const u=Date.now();
  const j=async x=>{try{const r=await fetch(x,{cache:"no-store"});return r.ok?await r.json():null}catch(_){return null}};
  const [m,h,fu]=await Promise.all([j("market.json?t="+u),j("https://raw.githubusercontent.com/ernte-trade/ernte-/burza-hist/hist.json?u="+u),j("https://raw.githubusercontent.com/ernte-trade/ernte-/fuel-data/fuel.json?u="+u)]);
  D.m=m;D.h=h&&h.d||[];D.fu=fu&&fu.c||{};D.err=m?"":"Trhové dáta sa nenačítali.";D.at=Date.now();D.busy=false;rr()}
const MON={jan:0,feb:1,mar:2,apr:3,maj:4,máj:4,may:4,jun:5,jún:5,jul:6,júl:6,aug:7,sep:8,okt:9,oct:9,nov:10,dec:11};
const termEnd=t=>{const x=/([a-zá]{3})\w*\s+(\d{4})/i.exec(t||"");if(!x||MON[x[1].toLowerCase()]==null)return null;return new Date(+x[2],MON[x[1].toLowerCase()],1)};
const COM=[["psenica_p","Pšenica potravinárska","matif_psenica","MATIF",/Euronext.*pšenica/i],["kukurica","Kukurica","matif_kukurica","MATIF",/Euronext.*kukurica/i],
  ["repka","Repka olejná","matif_repka","MATIF",/Euronext.*repka/i],["lo","Slnečnica",null,null,null],["soja","Sója","cbot_soja","CBOT",/CBOT sója/i]];
const REG=["Východné Slovensko","Západné Slovensko","Severné Maďarsko","Maďarsko – Alföld","Maďarsko – priemer","Hranica UA/HU","Viedeň (burza)"];
const CORE=new Set(["Východné Slovensko","Severné Maďarsko","Maďarsko – Alföld","Maďarsko – priemer","Hranica UA/HU"]);
function region(r){const m=(r.market||"")+" "+(r.place||"");
  if(r.src==="vsk")return "Východné Slovensko";if(/Slovensko/.test(m))return "Západné Slovensko";if(/Észak/.test(m))return "Severné Maďarsko";
  if(/Alföld/.test(m))return "Maďarsko – Alföld";if(/Zakarpat|Čop|Záhony|Batyovo|Батьов/.test(m))return "Hranica UA/HU";if(/Dunántúl|Zadunajsko/.test(m))return null;
  if(/Maďarsko/.test(m))return "Maďarsko – priemer";if(/Wien|Viedeň/.test(m))return "Viedeň (burza)";return null}
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
function calc(){const rows=(D.m&&D.m.rows)||[],H=D.h||[],lim=new Date(Date.now()+20*864e5);
  return COM.map(([c,name,hk,bn,rx])=>{const by={};
    rows.filter(r=>r.c===c&&(r.kind==="fyzický"||r.kind==="regburza")&&region(r)&&isFinite(+r.price)).forEach(r=>(by[region(r)]=by[region(r)]||[]).push(+r.price));
    const reg={};for(const k in by)reg[k]=mean(by[k]);const core=Object.keys(reg).filter(k=>CORE.has(k)).map(k=>reg[k]);const idx=mean(core);
    let bz=null,term="",wk=null;
    if(rx){const L=rows.filter(r=>r.kind==="burza"&&rx.test(r.market||"")&&isFinite(+r.price)).map(r=>({p:+r.price,t:r.term,end:termEnd(r.term)})).filter(x=>!x.end||x.end>=lim).sort((a,b)=>(a.end||9e15)-(b.end||9e15));
      if(L.length){bz=L[0].p;term=L[0].t||""}
      const last=H.length?H[H.length-1][hk]:null,old=H.length>5?H[H.length-6][hk]:null;
      if(bz==null&&last)bz=last;if(old&&last&&bz&&Math.abs(last-bz)/bz<.03)wk=(last-old)/old*100}
    return {c,name,reg,idx,n:core.length,bz,bn,term,basis:idx!=null&&bz?idx-bz:null,wk,hk}})}
function chart(keys,H){const W=640,Hh=210,P=34;const v=[];H.forEach(h=>keys.forEach(k=>{if(h[k[1]])v.push(h[k[1]])}));if(v.length<2)return "";
  const lo=Math.min(...v)*.97,hi=Math.max(...v)*1.03,X=i=>P+i*(W-1.5*P)/Math.max(1,H.length-1),Y=x=>Hh-P+4-(x-lo)/(hi-lo)*(Hh-1.8*P);
  let s=`<svg viewBox="0 0 ${W} ${Hh}" class="aix-ch" role="img" aria-label="Burza 90 dní">`;
  for(let t=0;t<5;t++){const x=lo+(hi-lo)*t/4,y=Y(x);s+=`<line x1="${P}" x2="${W-P/2}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="aix-gl"/><text x="${P-5}" y="${(y+4).toFixed(1)}" class="aix-ax" text-anchor="end">${f(x)}</text>`}
  [0,H.length>>1,H.length-1].forEach(i=>{const d=H[i].d;s+=`<text x="${X(i).toFixed(1)}" y="${Hh-6}" class="aix-ax" text-anchor="middle">${+d.slice(8,10)}. ${+d.slice(5,7)}.</text>`});
  keys.forEach(([l,k,col])=>{const p=H.map((h,i)=>h[k]?`${X(i).toFixed(1)},${Y(h[k]).toFixed(1)}`:"").filter(Boolean).join(" ");s+=`<polyline points="${p}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>`});
  return s+"</svg>"}
function css(){if(document.getElementById("aixCss"))return;const st=document.createElement("style");st.id="aixCss";st.textContent=`
.aix{min-width:0;max-width:100%;overflow:hidden}.aix>*{min-width:0}.aix-box{display:block;width:0;min-width:100%;max-width:100%}
.aix summary{cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center;gap:8px}.aix .s{opacity:.8}
.aix-cards{display:grid;width:0;min-width:100%;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0}
.aix-c{border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:12px;background:rgba(255,255,255,.04);min-width:0}
.aix-c b{display:block}.aix-v{font-size:1.6rem;font-weight:800;letter-spacing:-.02em}.aix-v small{font-size:.75rem;opacity:.7;font-weight:500}
.aix-r{display:flex;justify-content:space-between;gap:6px;font-size:.84rem;border-top:1px solid rgba(255,255,255,.1);padding:4px 0}.aix-r span{opacity:.7}.aix-r b{white-space:nowrap}
.aix .pos{color:#4ade80}.aix .neg{color:#f87171}.aix-box{overflow-x:auto;margin:8px 0}
.aix-ch{width:100%;min-width:480px;height:auto}.aix-gl{stroke:rgba(127,127,127,.25)}.aix-ax{fill:currentColor;opacity:.6;font-size:11px}
.aix-leg{display:flex;flex-wrap:wrap;gap:12px;font-size:.82rem;opacity:.85}.aix-leg i{display:inline-block;width:12px;height:3px;border-radius:2px;margin-right:5px;vertical-align:middle}
.aix table{border-collapse:collapse;width:100%;font-size:.85rem}.aix th,.aix td{padding:6px 7px;border-bottom:1px solid rgba(255,255,255,.1);text-align:right;white-space:nowrap}
.aix thead th{opacity:.7;font-weight:600;font-size:.75rem;white-space:normal;vertical-align:bottom}.aix tbody th{text-align:left}
.aix h4{margin:16px 0 4px}.aix ul{margin:4px 0;padding-left:18px}`;document.head.appendChild(st)}
window.aixHTML=function(){if(!OK())return "";css();
  if(!D.at){load();return `<details class="card aix"><summary>📊 ERNTE Agro Index <small class="s">· načítavam…</small></summary></details>`}
  if(D.err)return `<div class="card aix"><b>📊 ERNTE Agro Index</b><div class="s">⚠️ ${e(D.err)}</div></div>`;
  const C=calc(),H=D.h||[],open=sessionStorage.getItem("ernte-aix-open")==="1";
  const cards=C.map(c=>`<div class="aix-c"><b>${e(c.name)}</b><div class="aix-v">${f(c.idx)} <small>€/t</small></div><div class="s" style="font-size:.75rem">regionálny index · ${c.n} ${c.n===1?"zdroj":c.n<5?"zdroje":"zdrojov"}</div>
   <div class="aix-r"><span>${c.bn||"burza"}${c.term?" "+e(c.term):""}</span><b>${f(c.bz)}</b></div>
   <div class="aix-r"><span>báza</span><b class="${(c.basis||0)<0?"neg":"pos"}">${c.basis==null?"–":(c.basis>0?"+":"")+f(c.basis)}</b></div>
   <div class="aix-r"><span>burza za týždeň</span><b class="${(c.wk||0)<0?"neg":"pos"}">${c.wk==null?"–":(c.wk>0?"+":"")+f(c.wk,1)+" %"}</b></div></div>`).join("");
  const S1=[["MATIF pšenica","matif_psenica","#3b82f6"],["MATIF kukurica","matif_kukurica","#f59e0b"],["CBOT sója","cbot_soja","#22c55e"]],S2=[["MATIF repka","matif_repka","#a855f7"]];
  const leg=L=>`<div class="aix-leg">${L.map(([l,,c])=>`<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>`;
  const tb=C.map(c=>`<tr><th>${e(c.name)}</th>${REG.map(r=>`<td>${f(c.reg[r])}</td>`).join("")}</tr>`).join("");
  const FU=D.fu||{},sk=FU.SK&&FU.SK.w?FU.SK.w.p:null;
  const tr=[["SK","Slovensko"],["HU","Maďarsko"],["CZ","Česko"],["AT","Rakúsko"],["PL","Poľsko"]].filter(([k])=>FU[k]&&FU[k].w).map(([k,n])=>{const v=FU[k],o=v.h&&v.h.length>=9?v.h[v.h.length-9][1]:null,ch=o?(v.w.p-o)/o*100:null;
    return `<tr><th>${n}</th><td>${f(v.w.p,3)} €/l</td><td class="${(ch||0)<0?"neg":"pos"}">${ch==null?"–":(ch>0?"+":"")+f(ch,1)+" %"}</td></tr>`}).join("");
  const eurt=km=>sk?(0.32*sk/1.23+0.95)*km*2/25:null;
  const kmt=[50,100,150,250,400].map(k=>`<tr><th>${k} km</th><td>${f(eurt(k),1)} €/t</td></tr>`).join("");
  const last=H.length?H[H.length-1].d:"";
  return `<details class="card aix" ${open?"open":""} data-aix><summary>📊 ERNTE Agro Index <small class="s">· regionálne ceny, báza, doprava${last?` · burza ${+last.slice(8,10)}. ${+last.slice(5,7)}.`:""}</small></summary>
  <div class="s">Ukážka produktu na predaj. Teraz iba verejné zdroje; predávaná verzia by mala oneskorenie 14 dní a naše obchody anonymne (min. 5 zdrojov na komoditu a týždeň). Mená firiem sa nikdy nezobrazujú.</div>
  <div class="aix-cards">${cards}</div>
  <h4>Burza za 90 dní (€/t)</h4><div class="aix-box">${leg(S1)}${chart(S1,H)}</div><div class="aix-box">${leg(S2)}${chart(S2,H)}</div>
  <div class="s" style="font-size:.8rem">Graf = najbližší kontrakt z histórie; karty berú kontrakt končiaci najskôr o 20 dní (pri prechode kontraktu sa týždenná zmena nezobrazí).</div>
  <h4>Ceny podľa regiónu (€/t, farma / FCA)</h4><div class="aix-box"><table><thead><tr><th></th>${REG.map(r=>`<th>${e(r)}</th>`).join("")}</tr></thead><tbody>${tb}</tbody></table></div>
  <h4>Index dopravy</h4><div class="aix-box"><table><thead><tr><th>Nafta (pumpa)</th><th>dnes</th><th>za 2 mesiace</th></tr></thead><tbody>${tr}</tbody></table></div>
  <div class="aix-box"><table><thead><tr><th>Odvoz zrna (orientačne)</th><th>€/t</th></tr></thead><tbody>${kmt}</tbody></table></div>
  <div class="s" style="font-size:.8rem">Súprava 40 t, 25 t nákladu, 32 l/100 km, ostatné náklady 0,95 €/km, prázdny návrat.</div>
  <h4>Čo by sa predávalo</h4><ul><li>✓ regionálne indexy cien a bázy, index dopravy, súhrnná kvalita a objemy</li><li>✕ nikdy: farmári (GDPR), ponuky odberateľov a konkurencie, naše aktuálne ceny a modely, burza AHDB bez súhlasu</li></ul>
  <div class="s" style="font-size:.78rem">Zdroje: AHDB, Poľnoinfo, Európska komisia, AKI PÁIR, Börse Wien, Agrotender, fuel-prices.eu / EK Weekly Oil Bulletin (CC BY 4.0), ECB.</div></details>`};
document.addEventListener("toggle",ev=>{const d=ev.target;if(d&&d.matches&&d.matches("[data-aix]"))try{sessionStorage.setItem("ernte-aix-open",d.open?"1":"0")}catch(_){}},true);
setInterval(()=>{if(OK()&&D.at&&Date.now()-D.at>30*6e4)D.at=0},6e4);
})();
