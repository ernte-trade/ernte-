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
function chart(keys,H){const W=760,Hh=260,P=36;const v=[];H.forEach(h=>keys.forEach(k=>{if(h[k[1]])v.push(h[k[1]])}));if(v.length<2)return "";
  const lo=Math.min(...v)*.97,hi=Math.max(...v)*1.03,X=i=>P+i*(W-2*P)/Math.max(1,H.length-1),Y=x=>Hh-P+6-(x-lo)/(hi-lo)*(Hh-2*P);
  let s=`<svg viewBox="0 0 ${W} ${Hh}" class="ch" role="img" aria-label="Burza 90 dní">`;
  for(let t=0;t<5;t++){const x=lo+(hi-lo)*t/4,y=Y(x);s+=`<line x1="${P}" x2="${W-P/2}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="gl"/><text x="${P-6}" y="${(y+4).toFixed(1)}" class="ax" text-anchor="end">${f(x)}</text>`}
  [0,H.length>>1,H.length-1].forEach(i=>{const d=H[i].d;s+=`<text x="${X(i).toFixed(1)}" y="${Hh-8}" class="ax" text-anchor="middle">${+d.slice(8,10)}. ${+d.slice(5,7)}.</text>`});
  keys.forEach(([l,k,col])=>{const pts=H.map((h,i)=>h[k]?[X(i),Y(h[k])]:null).filter(Boolean);if(!pts.length)return;
    s+=`<polyline points="${pts.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ")}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${pts[pts.length-1][0].toFixed(1)}" cy="${pts[pts.length-1][1].toFixed(1)}" r="3.5" fill="${col}"/>`});
  return s+"</svg>"}
// celá stránka – rovnaký vzhľad ako ukážka „ERNTE Agro Index“ (svetlá / tmavá podľa telefónu), cez celú obrazovku v rámčeku (vlastné štýly, appku neovplyvní)
function page(){const C=calc(),H=(D.h||[]).map(h=>Object.assign({},h)),last=H.length?H[H.length-1].d:"";
  const kk=C.find(c=>c.c==="kukurica");if(kk&&kk.bz&&H.length){const lv=H[H.length-1].matif_kukurica;if(lv&&Math.abs(lv-kk.bz)/kk.bz>.03)H[H.length-1].matif_kukurica=kk.bz}
  const S1=[["MATIF pšenica","matif_psenica","#2563eb"],["MATIF kukurica","matif_kukurica","#d97706"],["CBOT sója","cbot_soja","#16a34a"]],S2=[["MATIF repka","matif_repka","#9333ea"]];
  const leg=L=>`<div class="leg">${L.map(([l,,c])=>`<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>`;
  const cards=C.map(c=>`<div class="card"><div class="cn">${e(c.name)}</div><div class="cv">${f(c.idx)} <small>€/t</small></div>
<div class="cs">regionálny index · ${c.n} ${c.n===1?"zdroj":c.n<5?"zdroje":"zdrojov"}</div>
<div class="cr"><span>${c.bn||"burza"}${c.term?" "+e(c.term):""}</span><b>${f(c.bz)}</b></div>
<div class="cr"><span>báza voči burze</span><b class="${(c.basis||0)<0?"neg":"pos"}">${c.basis==null?"–":(c.basis>0?"+":"")+f(c.basis)}</b></div>
<div class="cr"><span>burza za týždeň</span><b class="${(c.wk||0)<0?"neg":"pos"}">${c.wk==null?"–":(c.wk>0?"+":"")+f(c.wk,1)+" %"}</b></div></div>`).join("");
  const tb=C.map(c=>`<tr><th>${e(c.name)}</th>${REG.map(r=>`<td>${f(c.reg[r])}</td>`).join("")}</tr>`).join("");
  const FU=D.fu||{},sk=FU.SK&&FU.SK.w?FU.SK.w.p:null;
  const tr=[["SK","Slovensko"],["HU","Maďarsko"],["CZ","Česko"],["AT","Rakúsko"],["PL","Poľsko"]].filter(([k])=>FU[k]&&FU[k].w).map(([k,n])=>{const v=FU[k],o=v.h&&v.h.length>=9?v.h[v.h.length-9][1]:null,ch=o?(v.w.p-o)/o*100:null;
    return `<tr><th>${n}</th><td>${f(v.w.p,3)} €/l</td><td class="${(ch||0)<0?"neg":"pos"}">${ch==null?"–":(ch>0?"+":"")+f(ch,1)+" %"}</td></tr>`}).join("");
  const eurt=km=>sk?(0.32*sk/1.23+0.95)*km*2/25:null;
  const kmt=[50,100,150,250,400].map(k=>`<tr><th>${k} km</th><td>${f(eurt(k),1)} €/t</td></tr>`).join("");
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ERNTE Agro Index</title><style>
:root{--bg:#f6f7f4;--card:#fff;--ink:#14201a;--mut:#5b6b62;--line:#e3e7e1;--acc:#0f766e;--pos:#15803d;--neg:#b91c1c}
@media (prefers-color-scheme:dark){:root{--bg:#0d1411;--card:#16201b;--ink:#e8efe9;--mut:#9aaba1;--line:#26332c;--acc:#2dd4bf;--pos:#4ade80;--neg:#f87171}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:1040px;margin:0 auto;padding:20px 16px 48px}
.tag{display:inline-block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--acc);border:1px solid var(--acc);border-radius:999px;padding:2px 10px}
h1{font-size:clamp(24px,5vw,34px);margin:10px 0 4px;letter-spacing:-.02em}h2{font-size:19px;margin:34px 0 10px}
.lead{color:var(--mut);margin:0 0 6px;max-width:70ch}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:12px;margin-top:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
.cn{font-weight:600}.cv{font-size:28px;font-weight:700;letter-spacing:-.02em;margin:4px 0 0}.cv small{font-size:13px;color:var(--mut);font-weight:500}
.cs{font-size:12px;color:var(--mut);margin-bottom:8px}.cr{display:flex;justify-content:space-between;gap:6px;font-size:13px;border-top:1px solid var(--line);padding:5px 0}.cr span{color:var(--mut)}.cr b{white-space:nowrap}
.pos{color:var(--pos)}.neg{color:var(--neg)}
.box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;overflow-x:auto}
.ch{width:100%;min-width:520px;height:auto}.gl{stroke:var(--line)}.ax{fill:var(--mut);font-size:11px}
.leg{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--mut);margin:0 0 6px}.leg i{display:inline-block;width:12px;height:3px;border-radius:2px;margin-right:6px;vertical-align:middle}
table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}thead th{color:var(--mut);font-weight:600;font-size:12px;white-space:normal;vertical-align:bottom}tbody th{text-align:left;font-weight:600}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.note{font-size:13px;color:var(--mut)}ul{margin:6px 0;padding-left:20px}li{margin:3px 0}
.ok li::marker{content:"✓  ";color:var(--pos)}.no li::marker{content:"✕  ";color:var(--neg)}
</style></head><body><main>
<span class="tag">Ukážka produktu · iba pre majiteľa</span>
<h1>ERNTE Agro Index</h1>
<p class="lead">Výkupné ceny na farme a náklady dopravy – východné Slovensko, Maďarsko a hranica s Ukrajinou.${last?` Stav burzy k ${+last.slice(8,10)}. ${+last.slice(5,7)}. ${last.slice(0,4)}.`:""}</p>
<p class="note">Takto by vyzeral produkt na predaj. Predávaná verzia by mala oneskorenie 14 dní a navyše naše vlastné obchody (anonymne, min. 5 zdrojov na komoditu a týždeň). Teraz sú v ňom iba verejné zdroje, ktoré už zbiera náš bot – obnovuje sa samo.</p>
<div class="cards">${cards}</div>
<h2>Burza za 90 dní (€/t)</h2>
<div class="box">${leg(S1)}${chart(S1,H)}<p class="note">Karty berú kontrakt končiaci najskôr o 20 dní (pravidlo odberateľov) – pri kukurici je to už marec 2027, novembrový končí a jeho cena je skreslená.</p></div>
<div class="box" style="margin-top:12px">${leg(S2)}${chart(S2,H)}</div>
<h2>Ceny podľa regiónu (€/t, farma / FCA)</h2>
<div class="box"><table><thead><tr><th></th>${REG.map(r=>`<th>${e(r)}</th>`).join("")}</tr></thead><tbody>${tb}</tbody></table></div>
<p class="note">Regionálny index = priemer regiónov východné Slovensko, Maďarsko (sever, Alföld, priemer) a hranica UA/HU. Mená firiem sa v indexe nikdy neuvádzajú.</p>
<h2>Index dopravy</h2>
<div class="two"><div class="box"><table><thead><tr><th>Nafta (pumpa)</th><th>dnes</th><th>za 2 mesiace</th></tr></thead><tbody>${tr}</tbody></table></div>
<div class="box"><table><thead><tr><th>Odvoz zrna (orientačne)</th><th>€/t</th></tr></thead><tbody>${kmt}</tbody></table>
<p class="note">Súprava 40 t, 25 t nákladu, 32 l/100 km, ostatné náklady 0,95 €/km, prázdny návrat.</p></div></div>
<h2>Čo by sa predávalo a čo nie</h2>
<div class="two"><div class="box"><b>Predať sa dá</b><ul class="ok"><li>regionálne indexy cien a bázy voči burze</li><li>index nákladov na dopravu</li><li>kvalita a objemy úrody v regióne (súhrnne)</li><li>týždenný prehľad, dashboard, jednorazové analýzy</li></ul></div>
<div class="box"><b>Nikdy</b><ul class="no"><li>mená, kontakty a obchody farmárov (GDPR)</li><li>ponuky konkrétnych odberateľov a konkurencie</li><li>naše aktuálne výkupné ceny a modely</li><li>burza AHDB bez súhlasu poskytovateľa</li></ul></div></div>
<h2>Zdroje</h2>
<p class="note">Burza: AHDB (Euronext/CME) a Poľnoinfo – ďalšie zverejnenie AHDB vyžaduje súhlas. Fyzické ceny: Európska komisia, AKI PÁIR (HU), Börse Wien, Agrotender (UA). Nafta: fuel-prices.eu, EK Weekly Oil Bulletin (CC BY 4.0). Kurzy: ECB.</p>
</main></body></html>`}
function openFull(){if(!OK()||!D.at||D.err)return;closeFull();
  const o=document.createElement("div");o.id="aixFull";o.setAttribute("data-nocut","");
  o.style.cssText="position:fixed;inset:0;z-index:30000;display:flex;flex-direction:column;background:#0d1411";
  o.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top,0px)) 12px 8px;background:#0f766e;color:#fff"><button type="button" data-aixclose style="min-height:44px;border:0;border-radius:12px;padding:0 16px;font:700 1rem inherit;background:rgba(255,255,255,.18);color:#fff">← Späť</button><b style="flex:1;text-align:center">📊 ERNTE Agro Index</b><span style="width:80px"></span></div><iframe title="ERNTE Agro Index" style="flex:1;width:100%;border:0;background:#f6f7f4"></iframe>`;
  document.body.appendChild(o);o.querySelector("iframe").srcdoc=page();
  try{history.pushState({aix:1},"")}catch(_){}}
function closeFull(){const o=document.getElementById("aixFull");if(o)o.remove()}
window.addEventListener("popstate",()=>closeFull());
function css(){if(document.getElementById("aixCss"))return;const st=document.createElement("style");st.id="aixCss";st.textContent=`.aix-mm{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;margin-top:8px;font-size:.9rem}.aix-m{white-space:nowrap}`;document.head.appendChild(st)}
document.addEventListener("click",ev=>{const t=ev.target;if(!t.closest)return;
  if(t.closest("[data-aixclose]")){ev.preventDefault();closeFull();try{if(history.state&&history.state.aix)history.back()}catch(_){}return}
  if(t.closest("[data-aixopen]")){ev.preventDefault();openFull();return}
  const g=t.closest('[data-owgo="pred"]');if(g&&/Agro Index/.test(g.textContent||""))try{sessionStorage.setItem("ernte-aix-open","1")}catch(_){}},true);
window.aixHTML=function(){if(!OK())return "";css();
  if(!D.at){load();return `<div class="card aix"><b>📊 ERNTE Agro Index</b><div class="s">Načítavam…</div></div>`}
  if(D.err)return `<div class="card aix"><b>📊 ERNTE Agro Index</b><div class="s">⚠️ ${e(D.err)}</div></div>`;
  if(sessionStorage.getItem("ernte-aix-open")==="1"){try{sessionStorage.removeItem("ernte-aix-open")}catch(_){}setTimeout(openFull,50)}
  const C=calc(),last=(D.h||[]).length?D.h[D.h.length-1].d:"";
  const mini=C.filter(c=>c.idx!=null).map(c=>`<span class="aix-m"><b>${e(c.name.split(" ")[0])}</b> ${f(c.idx)} €/t</span>`).join("");
  return `<div class="card aix"><b>📊 ERNTE Agro Index</b><div class="s">Regionálne výkupné ceny, báza voči burze, burza 90 dní a index dopravy${last?` · burza ${+last.slice(8,10)}. ${+last.slice(5,7)}.`:""}</div>
  <div class="aix-mm">${mini}</div><div class="btns" style="justify-content:center;margin-top:10px"><button type="button" class="pri" data-aixopen style="min-height:52px;font-size:1.05rem">📊 Otvoriť Agro Index</button></div></div>`};
window.aixOpen=openFull;
setInterval(()=>{if(OK()&&D.at&&Date.now()-D.at>30*6e4)D.at=0},6e4);
})();
