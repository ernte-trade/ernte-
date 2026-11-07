// ===== 📈 TRH A PREDPOVEĎ (Cenník, iba Martin – MAIN_OK) =====
// Údaje: trh_view() – história burzy (trh_data), predpoveď 10/50/90 % na týždeň, mesiac, 3 mesiace (trh_predpovede),
// úspešnosť modelu voči „cena ostane rovnaká“, kalendár správ, WASDE, otvorené pozície, stav zdrojov, spätný test.
// Odporúčanie sa ukáže iba keď model za 6 mesiacov porazil naivnú predpoveď; inak „model neporáža trh – len informácia“.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof MAIN_OK==="function"&&MAIN_OK();
const K=[["repka","Repka","MATIF"],["psenica","Pšenica","MATIF"],["kukurica","Kukurica","MATIF"],["soja","Sója","CBOT"]];
const HZ={"1t":"1 týždeň","1m":"1 mesiac","3m":"3 mesiace"};
const n2=(v,d=0)=>v==null||!isFinite(+v)?"–":(+v).toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d});
const sg=v=>v==null||!isFinite(+v)?"–":(+v>0?"+":+v<0?"−":"")+n2(Math.abs(+v),2);
const dk=d=>/^\d{4}-\d\d-\d\d/.test(d||"")?(+d.slice(8,10))+". "+(+d.slice(5,7))+".":"–";
const tk=t=>{if(!t)return"–";const d=new Date(t);return isNaN(d)?"–":d.toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
const D={v:null,at:0,busy:false,err:"",k:(()=>{try{return localStorage.getItem("ernte-trh-k")||"repka"}catch(x){return"repka"}})()};
async function load(force){if(!OK()||D.busy)return;if(!force&&D.v&&Date.now()-D.at<300e3)return;D.busy=true;
  try{const r=await sb.rpc("trh_view");if(r.error){D.err=r.error.message||"chyba";}else{D.v=r.data||{};D.err=""}D.at=Date.now()}catch(x){D.err=String(x&&x.message||x)}finally{D.busy=false}paint()}

function chart(k){const v=D.v||{},R=((v.rady||{})[k]||[]).map(x=>[new Date(x[0]+"T12:00:00").getTime(),+x[1]]).filter(x=>isFinite(x[1]));
  const P=(v.pred||[]).filter(p=>p.komodita===k).sort((a,b)=>a.dni-b.dni);
  if(!R.length&&!P.length)return `<div class="s">Zatiaľ bez histórie burzy – záver sa zapisuje každý deň.</div>`;
  const W=480,H=230,L=44,Rm=10,T=12,B=24;
  const pts=[...R];const p0=P[0];const t0=p0?new Date(p0.k_dnu+"T12:00:00").getTime():(R.length?R[R.length-1][0]:Date.now());
  const fan=P.map(p=>({t:new Date(p.cielovy_den+"T12:00:00").getTime(),lo:+p.p10,mid:+p.p50,hi:+p.p90}));
  const c0=p0?+p0.cena0:(R.length?R[R.length-1][1]:0);
  const xs=[...pts.map(x=>x[0]),t0,...fan.map(f=>f.t)],ys=[...pts.map(x=>x[1]),c0,...fan.flatMap(f=>[f.lo,f.hi])].filter(isFinite);
  let x0=Math.min(...xs),x1=Math.max(...xs);if(x1-x0<864e5*10)x0=x1-864e5*10;
  let y0=Math.min(...ys),y1=Math.max(...ys);const pad=(y1-y0)*0.08||5;y0-=pad;y1+=pad;
  const X=t=>L+(t-x0)/(x1-x0)*(W-L-Rm),Y=y=>T+(y1-y)/(y1-y0)*(H-T-B);
  const line=pts.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+","+Y(p[1]).toFixed(1)).join("");
  let g="";for(let i=0;i<=4;i++){const yv=y0+(y1-y0)*i/4;g+=`<line x1="${L}" x2="${W-Rm}" y1="${Y(yv).toFixed(1)}" y2="${Y(yv).toFixed(1)}" class="trg"/><text x="${L-6}" y="${(Y(yv)+4).toFixed(1)}" text-anchor="end" class="trt">${n2(yv)}</text>`}
  let fanP="",mid="",lab="";
  if(fan.length){const up=[[t0,c0],...fan.map(f=>[f.t,f.hi])],dn=[[t0,c0],...fan.map(f=>[f.t,f.lo])].reverse();
    fanP=`<path class="trf" d="${[...up,...dn].map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+","+Y(p[1]).toFixed(1)).join("")}Z"/>`;
    mid=`<path class="trm" d="${[[t0,c0],...fan.map(f=>[f.t,f.mid])].map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+","+Y(p[1]).toFixed(1)).join("")}"/>`;
    lab=fan.map((f,i)=>`<circle cx="${X(f.t).toFixed(1)}" cy="${Y(f.mid).toFixed(1)}" r="3.5" class="trd"/>`).join("")}
  const xl=[x0,(x0+x1)/2,x1].map((t,i)=>`<text x="${X(t).toFixed(1)}" y="${H-6}" text-anchor="${i===0?"start":i===2?"end":"middle"}" class="trt">${dk(new Date(t).toISOString().slice(0,10))}</text>`).join("");
  return `<div class="trch"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Burza ${E(k)} a pásmo predpovede">${g}${fanP}<path class="trl" d="${line}"/>${mid}${lab}
    <line x1="${X(t0).toFixed(1)}" x2="${X(t0).toFixed(1)}" y1="${T}" y2="${H-B}" class="trn"/>${xl}</svg>
    <div class="trlg"><span><i class="l1"></i>burza (záver, € / t)</span><span><i class="l2"></i>pásmo 10–90 %</span><span><i class="l3"></i>stred (50 %)</span></div></div>`}

function predTab(k){const P=(D.v.pred||[]).filter(p=>p.komodita===k).sort((a,b)=>a.dni-b.dni);if(!P.length)return `<div class="s">Predpoveď sa vypočíta po prvom zázname burzy (ráno o 5:00 a po uzávierke CBOT).</div>`;
  const p0=P[0];
  return `<div class="trinfo">Burza ${dk(p0.k_dnu)}: <b>${n2(p0.cena0,2)} € / t</b>${p0.kontrakt?` · kontrakt ${E(p0.kontrakt)}`:""}</div>
   <div class="trtab">${P.map(p=>{const up=+p.p_hore,sm=p.smer==="hore"?["▲","hore","up"]:p.smer==="dole"?["▼","dole","dn"]:["▬","bokom","fl"];
     return `<div class="trrow"><div class="trh">${E(HZ[p.horizont]||p.horizont)}<small>do ${dk(p.cielovy_den)}</small></div>
      <div class="trv"><span class="trlab">pásmo 10–90%</span><b>${n2(p.p10)} – ${n2(p.p90)}</b></div>
      <div class="trv"><span class="trlab">stred</span><b>${n2(p.p50)}</b></div>
      <div class="trv"><span class="trlab">smer</span><b class="${sm[2]}">${sm[0]} ${sm[1]}</b><small>${n2(up*100)} % rast</small></div></div>`}).join("")}</div>`}

function skore(k){const S=D.v.skore||{},s=S[k]||{},a=S.spolu||{};
  const blk=(t,x)=>!x||!x.n?`<div class="trsk"><b>${E(t)}</b><span>zatiaľ nič vyhodnotené – prvé výsledky o týždeň</span></div>`:
   `<div class="trsk"><b>${E(t)}</b><span>${x.n} vyhodnotení · smer ${n2(x.zasah_pct)} % · v pásme ${n2(x.pasmo_pct)} %</span>
    <span>chyba ${n2(x.mae,2)} € / t <small>(naivne ${n2(x.mae_naiv,2)})</small> · Brier ${n2(x.brier,3)} <small>(naivne ${n2(x.brier_naiv,3)})</small></span>
    <span class="${x.porazi?"ok":"no"}">${x.porazi?"✅ porazil naivnú predpoveď":"⏸️ neporáža naivnú predpoveď"+(x.n<30?` (treba ≥ 30, má ${x.n})`:"")}</span></div>`;
  return blk("Úspešnosť – "+(K.find(x=>x[0]===k)||[k,k])[1]+" (6 mesiacov)",s)+blk("Spolu všetky komodity",a)}

function signals(k){const p=(D.v.pred||[]).filter(p=>p.komodita===k).sort((a,b)=>a.dni-b.dni)[1]||(D.v.pred||[]).find(p=>p.komodita===k);if(!p||!p.signaly)return"";const s=p.signaly;
  return `<details class="trdet"><summary>🔎 Z čoho model vychádza (1 mesiac)</summary><ul class="trul">
   <li>Metóda: ${E(p.metoda||"–")}</li>
   <li>Krivka kontraktov (carry): ${sg(s.carry_pct)} %</li>
   <li>Pozície fondov COT: ${sg(s.cot_pct)} %${s.cot_mm_net_oi!=null?` · managed money netto ${n2(s.cot_mm_net_oi,1)} % OI`:" · bez údajov"}</li>
   <li>Sezónnosť: ${s.sezona_rokov>=2?sg(s.sezona_pct)+" % ("+s.sezona_rokov+" roky)":"nepočíta sa – v databáze je menej ako 2 roky histórie"}</li>
   <li>Počasie: ${sg(s.pocasie_pct)} % (${n2(s.pocasie_rizika)} oblastí so suchom / mrazom)</li>
   <li>EUR/USD: ${s.eurusd!=null?n2(s.eurusd,4):"–"}${s.eurusd_1m_pct!=null?` (${sg(s.eurusd_1m_pct)} % za mesiac)`:""} – iba informácia</li>
   <li>Posun spolu: <b>${sg(s.posun_pct)} %</b> (najviac ± 3 %)</li></ul></details>`}

function kal(){const L=D.v.kal||[];return `<div class="trbox"><b>📅 Správy na 14 dní</b>${L.length?`<ul class="trul">${L.map(e=>`<li><span class="trtm">${E(dk(e.at))} ${E(String(e.at||"").slice(11,16))}</span> ${E(e.nazov)}</li>`).join("")}</ul>`:`<div class="s">Žiadne.</div>`}
  ${D.v.wasde&&D.v.wasde.txt?`<div class="s trw">${E(D.v.wasde.txt)}</div>`:""}</div>`}

function pos(){const o=D.v.otvorene||{},ks=K.filter(x=>o[x[0]]&&o[x[0]].t>0);
  return `<div class="trbox"><b>📦 Otvorené pozície</b><div class="s">Nakúpené od farmárov, ešte bez predajnej ceny.</div>
   ${ks.length?`<ul class="trul">${ks.map(x=>`<li>${x[1]}: <b>${n2(o[x[0]].t)} t</b> · ${n2(o[x[0]].n)} obch.</li>`).join("")}</ul>`:`<div class="s">Žiadne naviazané na burzu.</div>`}
   ${o.ine&&o.ine.t>0?`<div class="s">Iné komodity (bez burzy): ${n2(o.ine.t)} t</div>`:""}</div>`}

const ST={"ok":["ok","🟢"],"iba odkaz":["n","🔗"],"čaká":["n","⏳"],"čaká na kľúč":["w","🔑"],"nedostupné":["w","🟠"],"chyba":["r","🔴"]};
function zdroje(){const Z=D.v.zdroje||[];if(!Z.length)return"";
  return `<details class="trdet"><summary>🗂️ Zdroje údajov (${Z.filter(z=>z.stav==="ok").length} / ${Z.length} v poriadku)</summary>
   <div class="trzl">${Z.map(z=>{const s=ST[z.stav]||["n","•"];return `<div class="trz ${z.vypadok?"r":s[0]}"><div class="trzh"><span>${s[1]}</span><b>${E(z.nazov)}</b></div>
    <div class="s">${E(z.frek||"")} · ${E(z.stav)}${z.vypadok?" · ⚠️ výpadok":""}${z.posledne?` · načítané ${E(tk(z.posledne))}`:""}${z.data?` · údaje k ${E(dk(z.data))}`:""}</div>
    ${z.msg?`<div class="s">${E(z.msg)}</div>`:""}<div class="s">${E(z.lic||"")}${z.url?` · <a href="${E(z.url)}" target="_blank" rel="noopener">zdroj ›</a>`:""}</div></div>`}).join("")}</div></details>`}

function bt(){const b=D.v.backtest,q=D.v.backtest_req,run=q&&!q.done;const r=b&&b.vysledok||{};
  return `<details class="trdet"><summary>🧪 Spätný test modelu</summary>
   ${b?`<div class="s">${E(b.poznamka||"")}</div><div class="trbt">${K.map(x=>{const o=r[x[0]]||{};return `<div class="trbtr"><b>${x[1]}</b>${["1t","1m","3m"].map(h=>{const v=o[h]||{};
     return `<span>${HZ[h]}: ${v.n?`${v.n}× · chyba ${n2(v.mae,1)} vs ${n2(v.mae_naiv,1)} · smer ${n2(v.zasah_pct)} %${v.porazi?" ✅":""}`:"málo dát"}</span>`}).join("")}</div>`}).join("")}</div>`:`<div class="s">Ešte nebežal (spúšťa sa každý pondelok ráno).</div>`}
   <div class="btns"><button type="button" data-trbt ${run?"disabled":""}>${run?"⏳ Spustí sa do 5 min":"▶ Spustiť spätný test"}</button></div></details>`}

function html(){const v=D.v;
  if(!v)return `<div class="card trhcard" id="trhCard"><h2>📈 Trh a predpoveď</h2><div class="s">${D.err?"⚠️ "+E(D.err):"Načítavam…"}</div></div>`;
  const k=K.some(x=>x[0]===D.k)?D.k:"repka",kk=K.find(x=>x[0]===k);const od=(v.odpor||{})[k]||"model neporáža trh – len informácia";const info=/^model neporáža/.test(od);
  return `<div class="card trhcard" id="trhCard"><h2>📈 Trh a predpoveď</h2>
   <div class="trk" role="tablist">${K.map(x=>`<button type="button" data-trk="${x[0]}" aria-pressed="${x[0]===k}">${x[1]}<small>${x[2]}</small></button>`).join("")}</div>
   ${chart(k)}${predTab(k)}
   <div class="trod ${info?"i":"a"}"><b>🎯 ${info?"Model neporáža trh – len informácia":"Odporúčanie"}</b>${info?`<span>Odporúčanie kúpiť / predať / zaistiť sa ukáže, až keď model za posledných 6 mesiacov porazí predpoveď „cena ostane rovnaká“ (≥ 30 vyhodnotení, menšia chyba aj Brier).</span>`:`<span>${E(od)}</span>`}</div>
   ${skore(k)}${signals(k)}
   <div class="trgrid">${kal()}${pos()}</div>
   ${zdroje()}${bt()}
   <div class="s trnote">Burza nie je naša výkupná cena. ${kk[2]} v € / t, záver kontraktu, z ktorého rátajú odberatelia. Predpoveď je pravdepodobnosť, nie istota.${v.rano&&v.rano.at?` Ranný súhrn odišiel ${E(tk(v.rano.at))}.`:""}</div></div>`}

function paint(){if(!OK()||typeof TAB==="undefined"||TAB!=="price")return;const app=document.getElementById("app");if(!app)return;
  const old=document.getElementById("trhCard"),d=document.createElement("div");d.innerHTML=html();const n=d.firstElementChild;
  if(old){if(old.dataset.h===n.innerHTML)return;n.dataset.h=n.innerHTML;const dt=[...old.querySelectorAll("details")].map(x=>x.open);if(old.classList.contains("sbh"))n.classList.add("sbh");
    n.querySelectorAll("details").forEach((x,i)=>{if(dt[i])x.open=true});old.replaceWith(n);return}
  n.dataset.h=n.innerHTML;const a=app.querySelector(":scope > div.card.chcard");if(a)a.before(n);else app.appendChild(n)}
function inject(){if(!OK()||typeof TAB==="undefined"||TAB!=="price")return;if(!D.v||Date.now()-D.at>300e3)load(false);if(!document.getElementById("trhCard"))paint()}
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-trk],[data-trbt]");if(!t||!OK())return;e.preventDefault();
  if(t.dataset.trk){D.k=t.dataset.trk;try{localStorage.setItem("ernte-trh-k",D.k)}catch(x){}paint();return}
  t.disabled=true;const r=await sb.rpc("trh_backtest_run");if(r.error){t.disabled=false;toast("Nepodarilo sa: "+r.error.message,6000);return}
  toast("🧪 Spätný test sa spustí do 5 minút – výsledok uvidíš tu.",5000);load(true)},true);
{const s=document.createElement("style");s.textContent=`.trhcard h2{margin-bottom:8px}
.trk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:4px 0 10px}
.trk button{min-height:46px;border-radius:14px;font-weight:700;font-size:.88rem;padding:4px 2px;line-height:1.15;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;white-space:normal}
.trk button small{font-weight:500;opacity:.7;font-size:.7rem}
.trk button[aria-pressed="true"]{background:linear-gradient(135deg,#34d399,#22d3ee)!important;color:#05210f!important;border-color:transparent!important}
.trch svg{width:100%;height:auto;display:block;max-height:340px}.trch .trg{stroke:rgba(255,255,255,.08)}.trch .trt{fill:rgba(255,255,255,.65);font-size:13px}
.trch .trl{fill:none;stroke:#7dd3fc;stroke-width:2}.trch .trf{fill:rgba(52,211,153,.22);stroke:rgba(52,211,153,.5);stroke-width:1}
.trch .trm{fill:none;stroke:#34d399;stroke-width:2;stroke-dasharray:5 4}.trch .trd{fill:#34d399}.trch .trn{stroke:rgba(255,255,255,.25);stroke-dasharray:3 3}
.trlg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.78rem;opacity:.8;margin:4px 0 8px}.trlg i{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:5px;vertical-align:middle}
.trlg .l1{background:#7dd3fc}.trlg .l2{background:rgba(52,211,153,.45);height:9px}.trlg .l3{background:#34d399}
.trinfo{font-size:.9rem;margin:2px 0 6px;overflow-wrap:anywhere}
.trtab{display:grid;gap:6px}.trrow{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.3fr) minmax(0,.8fr) minmax(0,1fr);gap:6px;align-items:center;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.trrow .trh{font-weight:700;font-size:.9rem;line-height:1.2}.trrow small{display:block;font-weight:400;opacity:.7;font-size:.74rem}
.trv{display:flex;flex-direction:column;min-width:0;font-size:.9rem}.trlab{font-size:.7rem;opacity:.65;line-height:1.1}.trv b{overflow-wrap:anywhere}
.trv .up{color:#86efac}.trv .dn{color:#fca5a5}.trv .fl{color:#fde68a}
.trod{margin:10px 0;padding:10px 12px;border-radius:14px;display:grid;gap:4px;font-size:.9rem;line-height:1.4;overflow-wrap:anywhere}.trod.i{background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.3)}
.trod.a{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.45)}
.trsk{display:grid;gap:2px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);font-size:.86rem;line-height:1.4;overflow-wrap:anywhere}.trsk small{opacity:.7}.trsk .ok{color:#86efac}.trsk .no{color:#fde68a}
.trdet{margin:8px 0;border-top:1px solid rgba(255,255,255,.08);padding-top:6px}.trdet summary{cursor:pointer;font-weight:700;padding:6px 0;min-height:32px}
.trul{margin:4px 0;padding-left:18px;display:grid;gap:3px;font-size:.88rem;line-height:1.4;overflow-wrap:anywhere}.trtm{font-variant-numeric:tabular-nums;opacity:.8;margin-right:4px}
.trgrid{display:grid;gap:8px;margin:8px 0}.trbox{padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);min-width:0;overflow-wrap:anywhere}
.trw{margin-top:6px}.trzl{display:grid;gap:6px}.trz{padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border-left:3px solid rgba(148,163,184,.5);min-width:0;overflow-wrap:anywhere}
.trz.ok{border-left-color:#34d399}.trz.w{border-left-color:#fbbf24}.trz.r{border-left-color:#f87171}.trzh{display:flex;gap:6px;align-items:flex-start}.trzh b{font-size:.88rem;line-height:1.3}
.trbt{display:grid;gap:6px;margin:6px 0}.trbtr{display:grid;gap:2px;font-size:.84rem;line-height:1.35;overflow-wrap:anywhere}.trnote{margin-top:8px;opacity:.75}
@media(min-width:700px){.trgrid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.trrow{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:4px}.trrow .trh{grid-column:1/-1}.trrow .trh small{display:inline;margin-left:6px}}
.trv b{white-space:nowrap}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  setInterval(()=>{if(!document.hidden&&OK()&&typeof TAB!=="undefined"&&TAB==="price")load(true)},600e3)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
