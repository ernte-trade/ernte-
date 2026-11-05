// ===== 🏷️ CENY ODBERATEĽOV (Cenník, iba Martin – MAIN_OK) – úloha majiteľa 5. 11. 2026 =====
// Evidencia všetkých cien odberateľov: odberateľ, komodita, cena, parita, miesto, termín (obdobie), platnosť, zdroj (e-mail, PDF, web, ručne), dátum.
// Net-back = cena odberateľa (posunutá s burzou, ak podľa nej ráta) − naša doprava z regiónu farmárov (vzorec Kalkulačky, ako Kde predať);
// porovnanie s naším cenníkom a s priemerným nákupom nepredaných ton. Ceny z e-mailov odberateľov (Gmail erntespol) a z ich webových cenníkov
// vyčíta AI samo (databáza odb_tick); nový odberateľ alebo nezvyčajná cena čaká na ✓ Martina. Údaje: odb_ceny(), odb_navrh_set(), odb_buyer_set().
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof MAIN_OK==="function"&&MAIN_OK()&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const n0=v=>v==null||!isFinite(+v)?"–":Math.round(+v).toLocaleString("sk-SK");
const sg=v=>v==null||!isFinite(+v)?"–":(+v>0?"+":+v<0?"−":"±")+Math.abs(Math.round(+v)).toLocaleString("sk-SK");
const dk=d=>/^\d{4}-\d\d-\d\d/.test(d||"")?(+d.slice(8,10))+". "+(+d.slice(5,7))+".":"–";
const tk=t=>{if(!t)return"–";const d=new Date(t);return isNaN(d)?"–":d.toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
const nm=c=>{try{const m=(typeof MK!=="undefined"?MK:[]).find(x=>x[0]===c);if(m)return m[1]}catch(x){}return c};
const SRC={email:["✉️","e-mail"],pdf:["📄","PDF"],web:["🌐","web"],rucne:["✍️","ručne"],konk:["📊","Konkurenčné ceny"],foto:["📷","fotka"]};
const D={v:null,at:0,busy:false,err:"",cfg:false};
async function load(force){if(!OK()||D.busy||typeof sb==="undefined"||!sb)return;if(!force&&D.v&&Date.now()-D.at<180e3)return;D.busy=true;
  try{const r=await sb.rpc("odb_ceny");if(r.error)D.err=/odb_ceny/.test(r.error.message||"")?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message;else{D.v=r.data||{};D.err=""}D.at=Date.now()}
  catch(x){D.err=String(x&&x.message||x)}finally{D.busy=false}paint()}

function row(x){const s=SRC[x.src]||["✍️",x.src||"ručne"],bad=[];
  if(x.stale)bad.push(`<em class="obst">⏳ neaktuálna – ${E(x.bd)} prac. dni</em>`);
  if(x.expired)bad.push(`<em class="obst">⌛ platila do ${dk(x.valid_to)}</em>`);
  if(x.fwd)bad.push(`<em class="obfw">📅 neskorší odber</em>`);
  const cl=x.m_avg==null?"":x.m_avg>=8?"ps":x.m_avg<0?"ng":"";
  return `<div class="obr ${cl}${x.stale||x.expired?" old":""}">
    <div class="obh"><b>${E(x.b)}${x.site?` · ${E(x.site)}`:""}</b><span>${E(x.del)} <b>${n0(x.price)} €/t</b></span></div>
    <small>${x.shift?`ponuka ${n0(x.price0)} ${x.shift>=0?"+":"−"} ${n0(Math.abs(x.shift))} burza · `:""}${x.dop==null?"doprava ? (chýba miesto)":x.dop?`− doprava ${n0(x.dop)} €/t`:"odvoz platí odberateľ"} → <b>net-back ${x.net==null?"?":n0(x.net)} €/t</b></small>
    <div class="obg"><span><i>vs. náš cenník</i><b class="${x.m_our==null?"":x.m_our>=0?"ps":"ng"}">${x.m_our==null?"–":sg(x.m_our)+" €/t"}</b><small>${x.our!=null?"cenník "+n0(x.our):"bez ceny"}</small></span>
      <span><i>vs. nákup nepredaných</i><b class="${cl}">${x.m_avg==null?"–":sg(x.m_avg)+" €/t"}</b><small>${x.avg!=null?"⌀ "+n0(x.avg)+(x.open_t?" · "+n0(x.open_t)+" t":""):"nič otvorené"}</small></span>
      <span><i>zdroj</i><b>${s[0]} ${E(s[1])}</b><small>${dk(x.d)}${x.period?" · "+E(x.period):""}${x.valid_to?" · platí do "+dk(x.valid_to):""}</small></span></div>
    ${bad.length?`<div class="obb">${bad.join("")}</div>`:""}${x.note?`<small class="obn">${E(x.note)}</small>`:""}</div>`}

// 📐 model nákupnej ceny každého odberateľa: báza voči burze z ich ponúk → ICH nákupná cena dnes = burza dnes + báza
const BZN={repka:"MATIF repka",psenica:"MATIF pšenica",kukurica:"MATIF kukurica",soja_usc_bu:"CBOT sója"};
function modelsHTML(M){const R=M.filter(m=>(m.g||[]).length||(m.chyba||[]).length);if(!R.length)return "";
  const ln=g=>{const old=g.age>45,bz=BZN[g.sym]||"burza";
    return `<div class="obm${old?" old":""}"><div class="obmh"><b>${E(nm(g.com))}</b><small>${E(g.del)}${g.site?" "+E(g.site):""}</small><span>${g.dnes!=null?`<b>${n0(g.dnes)} €/t</b><i>ich cena dnes</i>`:`<b>${n0(g.p_last)} €/t</b><i>posledná cena</i>`}</span></div>
     <small>${g.b!=null&&g.px!=null?`${E(bz)}${g.kontrakt?" "+E(g.kontrakt):""} dnes ${n0(g.px)} ${g.b>=0?"+":"−"} báza ${n0(Math.abs(g.b))} = <b>${n0(g.dnes)} €/t</b>`:`báza voči burze sa nedá spočítať (chýba burza z dňa ponuky) – posledná ponuka ${n0(g.p_last)} €/t`}
      · ${g.n} ${g.n===1?"ponuka":g.n<5?"ponuky":"ponúk"}, posledná ${dk(g.d)}${g.b_prev!=null&&g.b!=null&&Math.abs(g.b-g.b_prev)>=1?` · báza ${g.b-g.b_prev>0?"stúpla":"klesla"} o ${n0(Math.abs(g.b-g.b_prev))}`:""}${old?` · <em class="obst">stará ${g.age} dní – vyžiadaj novú ponuku</em>`:""}</small></div>`};
  return `<details class="obmod" open><summary>📐 Model nákupnej ceny odberateľov – ich cena dnes</summary>
   <div class="s">Z každej ponuky odberateľa sa spočíta báza voči burze (cena − burza v deň ponuky). Ich nákupná cena dnes = burza dnes + posledná báza. Bez ponúk na neskorší odber a nad 500 t.</div>
   ${R.map(m=>`<div class="obmb"><div class="obmn"><b>${E(m.name)}</b><small>${m.fb?"📈 ráta z burzy":m.par==="FCA"?"🚜 FCA u farmára":"📋 pevný cenník – báza len na porovnanie"}</small></div>
     ${(m.g||[]).map(ln).join("")}${(m.chyba||[]).length?`<small class="obmc">Bez ponuky (vykupujú): ${(m.chyba||[]).map(c=>E(nm(c))).join(", ")} – vlož ich ponuku, model sa spočíta sám.</small>`:""}</div>`).join("")}</details>`}

function html(){if(!D.v)return `<div class="card obcard" id="odbCard" data-nosec><h2>🏷️ Ceny odberateľov</h2><div class="s">${D.err?E(D.err):"Načítavam…"}</div></div>`;
  const v=D.v,I=v.items||[],N=v.navrhy||[],B=v.buyers||[],X=v.inbox||[],p=v.ping,live=p&&p.seen&&Date.now()-Date.parse(p.seen)<75*60e3;
  const G={};I.forEach(x=>{(G[x.com]=G[x.com]||[]).push(x)});
  const order=(typeof MK!=="undefined"?MK.map(m=>m[0]):[]);const coms=Object.keys(G).sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  const st=I.filter(x=>x.stale&&!x.fwd).length;
  let h=`<div class="card obcard" id="odbCard" data-nosec><h2>🏷️ Ceny odberateľov</h2>
   <div class="s">Všetky ceny odberateľov na jednom mieste. <b>Net-back</b> = cena odberateľa (posunutá s burzou, ak podľa nej ráta) − naša doprava z regiónu farmárov. Zelená = aspoň o 8 €/t nad priemerným nákupom nepredaných ton (pri otvorených nad 100 t príde 💰 „Predaj teraz“).</div>
   <div class="obk"><span><b>${I.length}</b><small>cien (45 dní)</small></span><span class="${N.length?"w":""}"><b>${N.length}</b><small>čaká na ✓</small></span><span class="${st?"w":""}"><b>${st}</b><small>neaktuálnych</small></span>
    <span class="${live?"":"w"}"><b>${live?"🟢":"🟠"}</b><small>${live?"Gmail číta":"Gmail skript"}</small></span></div>`;
  h+=modelsHTML(v.models||[]);
  if(!live)h+=`<div class="obw">✉️ Ceny z e-mailov odberateľov sa začnú čítať, keď vložíš <b>nový skript do Gmailu</b> erntespol (ten istý ako pre zúčtovanie – pribudlo v ňom čítanie cien a odpovedí). <button type="button" data-obgs>📋 Otvoriť skript a postup</button></div>`;
  if(N.length)h+=`<div class="obnv"><b>🆕 Čaká na tvoje potvrdenie (${N.length})</b><small>Nový odberateľ alebo cena nezvyčajne ďaleko od ostatných – do výpočtov ide až po ✓.</small>
    ${N.map(n=>`<div class="obnr"><div><b>${E(n.buyer_name||n.buyer||"?")}</b>${n.buyer?"":` <em class="obfw">nový odberateľ</em>`}<br>${E(nm(n.com))} · ${E(n.del||"")} <b>${n0(n.price)} €/t</b>${n.site?" · "+E(n.site):""}${n.period?" · "+E(n.period):""} · ${dk(n.d)}${n.cur&&n.cur!=="EUR"?` <small>(z ${E(n.cur)})</small>`:""}<br><small>⚠️ ${E(n.why||"")}${n.note?" · "+E(n.note):""}</small></div>
     <div class="btns"><button type="button" class="lime" data-obok="${E(n.id)}">✓ Potvrdiť</button><button type="button" data-obno="${E(n.id)}">✕ Zamietnuť</button></div></div>`).join("")}</div>`;
  if(!coms.length)h+=`<div class="s">Zatiaľ žiadne ceny odberateľov za posledných 45 dní.</div>`;
  for(const c of coms){const L=G[c],best=L.find(x=>x.net!=null&&!x.stale&&!x.expired&&!x.fwd)||L[0];
    h+=`<details class="obc"${coms.length<=2?" open":""}><summary><span class="obs1"><b>${E(nm(c))}</b><small>${L.length} ${L.length===1?"cena":L.length<5?"ceny":"cien"}${best&&best.our!=null?" · cenník "+n0(best.our):""}</small></span>
      <span class="obs2">${best?`${E(best.b)}<b class="${best.m_avg==null?"":best.m_avg>=8?"ps":best.m_avg<0?"ng":""}">${best.net==null?"?":n0(best.net)} €/t</b>`:""}</span></summary>${L.map(row).join("")}</details>`}
  h+=`<div class="btns"><button type="button" class="lime" data-sform="1">➕ Pridať cenu ručne</button><button type="button" data-obref>↻ Obnoviť</button><button type="button" data-obcfg>${D.cfg?"▲ Skryť":"⚙️ Zdroje cien (web, e-mail)"}</button></div>`;
  if(D.cfg)h+=`<div class="obcfg"><div class="s">🌐 <b>Cenník na webe</b> – ak odberateľ zverejňuje ceny na stránke, vlož adresu: v pracovné dni 6–18 h sa raz za hodinu stiahne a pri zmene AI vyčíta ceny. ✉️ <b>Domény e-mailov</b> – odkiaľ chodia ich ceny (napr. bunge.com), ak to nevie spoznať podľa mena.</div>
    ${B.map(b=>`<form class="obf" data-obb="${E(b.id)}"><b>${E(b.name)}</b>${b.web&&b.web.ok_at?`<small>🌐 naposledy ${tk(b.web.ok_at)}</small>`:""}${b.web&&b.web.err?`<small class="ng">🌐 ${E(b.web.err)}</small>`:""}
      <label>Cenník na webe<input name="url" inputmode="url" placeholder="https://…" value="${E(b.url||"")}"></label>
      <label>Domény e-mailov<input name="dom" placeholder="napr. bunge.com" value="${E((b.dom||[]).join(", "))}"></label>
      <button class="pri" type="submit">Uložiť</button></form>`).join("")}</div>`;
  if(X.length)h+=`<details class="obx"><summary>📥 Posledné prečítané e-maily a cenníky (${X.length})</summary>${X.map(x=>`<div class="obxr"><span>${x.kind==="web"?"🌐":"✉️"} <b>${E(x.b||x.from||"")}</b> <small>${tk(x.rc||x.at)}</small><br><small>${E(x.subj||"")}</small></span>
     <small class="obxs ${x.status==="chyba"?"ng":""}">${x.status==="ok"?`✓ ${x.ok||0} zapísané${x.wait?` · ${x.wait} na ✓`:""}`:x.status==="ziadne"?"bez cien":x.status==="chyba"?"⚠️ "+E(x.err||"chyba"):"⏳ čítam"}</small></div>`).join("")}</details>`;
  return h+`</div>`}

function paint(){if(!OK()||typeof TAB==="undefined"||TAB!=="price")return;const app=document.getElementById("app");if(!app)return;
  const old=document.getElementById("odbCard"),d=document.createElement("div");d.innerHTML=html();const n=d.firstElementChild;
  if(old){if(old.dataset.h===n.innerHTML)return;n.dataset.h=n.innerHTML;const dt=[...old.querySelectorAll("details")].map(x=>x.open);
    n.querySelectorAll("details").forEach((x,i)=>{if(dt[i])x.open=true});old.replaceWith(n);return}
  n.dataset.h=n.innerHTML;const a=app.querySelector("#trhCard")||app.querySelector(":scope > div.card.chcard");if(a)a.before(n);else app.appendChild(n)}
function inject(){if(!OK()||typeof TAB==="undefined"||TAB!=="price")return;if(!D.v||Date.now()-D.at>180e3)load(false);if(!document.getElementById("odbCard"))paint()}

document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-obok],[data-obno],[data-obref],[data-obcfg],[data-obgs]");if(!t||!OK())return;e.preventDefault();
  if(t.dataset.obref!==undefined){load(true);return}
  if(t.dataset.obcfg!==undefined){D.cfg=!D.cfg;paint();return}
  if(t.dataset.obgs!==undefined){if(typeof window.gmailSkript==="function")window.gmailSkript();else location.hash="#gmail-skript";return}
  const ok=t.dataset.obok!==undefined,id=+(ok?t.dataset.obok:t.dataset.obno);if(!ok&&!confirm("Zamietnuť túto cenu? Do výpočtov sa nedostane."))return;
  t.disabled=true;const r=await sb.rpc("odb_navrh_set",{p_id:id,p_ok:ok,p_buyer:null});t.disabled=false;
  if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}toast(ok?"✓ Cena zapísaná – ráta sa v Kde predať a v cenách odberateľov.":"✕ Cena zamietnutá.",4500);load(true)},true);
document.addEventListener("submit",async e=>{const f=e.target;if(!f.dataset||!f.dataset.obb||!OK())return;e.preventDefault();e.stopPropagation();const b=f.querySelector("button[type=submit]");
  if(typeof busy==="function")busy(b,true);const r=await sb.rpc("odb_buyer_set",{p_id:f.dataset.obb,p_url:f.url.value||null,p_dom:f.dom.value||null});if(typeof busy==="function")busy(b,false);
  if(r.error){toast("Neuložené: "+r.error.message,6000);return}toast("✓ Uložené.",3000);load(true)},true);

{const s=document.createElement("style");s.textContent=`.obcard h2{margin-bottom:6px}.obcard .s{line-height:1.45}
.obk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:8px 0}.obk span{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8px 4px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);min-width:0}
.obk b{font-size:1.15rem;line-height:1.1}.obk small{font-size:.7rem;opacity:.75;line-height:1.15}.obk .w{border-color:rgba(251,191,36,.6);background:rgba(251,191,36,.1)}
.obw,.obnv{margin:8px 0;padding:10px 12px;border-radius:14px;display:grid;gap:6px;font-size:.88rem;line-height:1.4;overflow-wrap:anywhere}.obw{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.45)}
.obnv{background:rgba(125,211,252,.08);border:1px solid rgba(125,211,252,.45)}.obnv>small{opacity:.8}.obnr{display:grid;gap:6px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08)}.obnr .btns{margin:0}
.obc{border-top:1px solid rgba(255,255,255,.08);padding:6px 0}.obc>summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none;min-height:40px}.obc>summary::-webkit-details-marker{display:none}
.obs1,.obs2{display:grid;min-width:0}.obs1 small{opacity:.7;font-size:.76rem}.obs2{text-align:right;font-size:.84rem;overflow-wrap:anywhere}.obs2 b{font-size:1.02rem}
.obr{display:grid;gap:4px;padding:9px 11px;margin:6px 0;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);min-width:0}
.obr.ps{border-color:rgba(74,222,128,.6);background:rgba(74,222,128,.08)}.obr.ng{border-color:rgba(248,113,113,.4)}.obr.old{opacity:.72}
.obh{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}.obh>b{min-width:0;overflow-wrap:anywhere}.obr small{line-height:1.4;overflow-wrap:anywhere;opacity:.85}
.obg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.obg span{display:flex;flex-direction:column;min-width:0}.obg i{font-style:normal;font-size:.7rem;opacity:.65;line-height:1.15}.obg b{font-size:.9rem;overflow-wrap:anywhere}
.obb{display:flex;flex-wrap:wrap;gap:4px}.obst,.obfw{font-style:normal;font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(251,191,36,.16);color:#fcd34d}.obfw{background:rgba(125,211,252,.16);color:#7dd3fc}
.obn{opacity:.65!important}.ps{color:#86efac}.ng{color:#fca5a5}.obr .obg b.ps{color:#86efac}.obr .obg b.ng{color:#fca5a5}
.obcfg{display:grid;gap:8px;margin:8px 0}.obf{display:grid;gap:6px;padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)}.obf small{opacity:.75}
.obmod{margin:8px 0;border-top:1px solid rgba(255,255,255,.08);padding-top:6px}.obmod>summary{cursor:pointer;font-weight:800;min-height:40px;display:flex;align-items:center}
.obmb{display:grid;gap:4px;padding:8px 0;border-top:1px solid rgba(255,255,255,.06)}.obmn{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.obmn small{opacity:.7;font-size:.74rem}
.obm{display:grid;gap:2px;padding:7px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);min-width:0}.obm.old{opacity:.75}
.obmh{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:2px 8px;align-items:center}.obmh small{opacity:.75;font-size:.76rem;overflow-wrap:anywhere}.obmh span{display:flex;flex-direction:column;align-items:flex-end;text-align:right}
.obmh span b{font-size:1rem;color:#7dd3fc}.obmh span i{font-style:normal;font-size:.66rem;opacity:.65}.obm>small{line-height:1.4;overflow-wrap:anywhere;opacity:.85}.obmc{opacity:.7}
html[data-theme=light] .obmh span b{color:#0369a1}
.obx{margin-top:8px}.obx>summary{cursor:pointer;font-weight:700;min-height:36px;display:flex;align-items:center}.obxr{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid rgba(255,255,255,.08);font-size:.84rem;line-height:1.35}
.obxr>span{min-width:0;overflow-wrap:anywhere}.obxs{text-align:right;flex:0 0 auto;max-width:45%;overflow-wrap:anywhere}
html[data-theme=light] .ps,html[data-theme=light] .obr .obg b.ps{color:#15803d}html[data-theme=light] .ng,html[data-theme=light] .obr .obg b.ng{color:#b91c1c}html[data-theme=light] .obst{color:#92400e}html[data-theme=light] .obfw{color:#0369a1}
@media(max-width:420px){.obg{grid-template-columns:1fr 1fr}.obg span:last-child{grid-column:1/-1}.obk{grid-template-columns:repeat(2,minmax(0,1fr))}}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  setInterval(()=>{if(!document.hidden&&OK()&&typeof TAB!=="undefined"&&TAB==="price")load(true)},300e3)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
