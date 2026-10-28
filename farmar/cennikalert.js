// ===== 💶 CENNÍK: História cien + upozornenie pri zmene zverejnenej výkupnej ceny =====
// Databáza (cennik_historia, trigger na prices a settings.pricelist) zapíše každú zmenu a pošle upozornenie (cron cennik-upozornenie).
// Tu: ťuknutie na upozornenie otvorí Cenník (#cennik, potvrdenie veľkej zmeny #cennik/ack/<id>),
// v Cenníku karta „História cien“ (posledných 50, filter podľa plodiny) a pre majiteľa nastavenie upozornení.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const STAFF=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER);
const CANH=()=>STAFF()&&(OWN()||(typeof can==="function"&&(can("price_view")||can("price_edit"))));
const NM={repka:"Repka",lo:"LO slnečnica",ho:"HO slnečnica",soja:"Sója",psenica_p:"Pšenica potravinárska",psenica_k:"Pšenica kŕmna",jacmen_k:"Jačmeň kŕmny",jacmen_s:"Jačmeň sladovnícky",kukurica:"Kukurica",cirok:"Cirok"};
const nm=c=>{try{if(typeof MK!=="undefined"){const m=MK.find(x=>x[0]===c);if(m)return m[1]}}catch(x){}return NM[c]||c||""};
const f2=n=>n==null||n===""?"–":(+n).toLocaleString("sk-SK",{maximumFractionDigits:2});
const dt=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||"")?(+v.slice(8,10))+". "+(+v.slice(5,7))+".":(v||"nezadané");
const when=a=>{const d=new Date(a);return d.toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
const H={rows:null,com:"",busy:false,at:0,cfg:null,err:""};

// ---- ťuknutie na upozornenie → Cenník (+ potvrdenie veľkej zmeny) ----
let ACK=null;
function fromHash(h){const m=/^#cennik(?:\/ack\/([0-9a-f-]{36}))?/i.exec(h||"");if(!m)return false;if(m[1])ACK=m[1];
  try{history.replaceState(null,"",location.pathname+location.search)}catch(x){}return true}
function openPrice(){if(!STAFF()||typeof renderStaff!=="function")return false;TAB="price";try{renderStaff();window.scrollTo(0,0)}catch(x){}
  // úvodná obrazovka sa pri otvorení z upozornenia preskočí (len teraz)
  const w=document.querySelector(".wlc");if(w){const x=w.querySelector("[data-wlx]");if(x)x.click()}
  if(ACK){const id=ACK;ACK=null;sb.rpc("cennik_alert_ack",{p_id:id}).then(r=>{if(!r.error&&typeof toast==="function")toast(r.data?"✓ Zmena ceny potvrdená – pripomienky sa už neopakujú.":"✓ Zmena ceny už bola potvrdená.",5000)})}
  return true}
function pending(){let n=0;const t=setInterval(()=>{n++;if(openPrice()||n>60)clearInterval(t)},500)}
if(fromHash(location.hash)){try{sessionStorage.setItem("ernte-tab","price");sessionStorage.setItem("ernte-welcome-skip","1");setTimeout(()=>{try{sessionStorage.removeItem("ernte-welcome-skip")}catch(x){}},15000)}catch(x){}pending()}
addEventListener("hashchange",()=>{if(fromHash(location.hash))pending()});
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener("message",e=>{const d=e.data||{};if(d.type==="ernte-open"&&d.url){try{const u=new URL(d.url);if(fromHash(u.hash))pending()}catch(x){}}});

// ---- História cien ----
async function load(force){if(!CANH()||H.busy)return;if(!force&&H.rows&&Date.now()-H.at<60e3)return;H.busy=true;
  try{const r=await sb.rpc("cennik_hist",{p_com:H.com||null,p_lim:50});if(r.error){H.err=/cennik_hist/.test(r.error.message)?"História sa pripravuje – databáza sa aktualizuje do pár minút.":r.error.message;H.rows=H.rows||[]}else{H.rows=r.data||[];H.err=""}H.at=Date.now()}
  catch(x){H.err="Históriu sa nepodarilo načítať.";H.rows=H.rows||[]}finally{H.busy=false}
  if(OWN()&&!H.cfg){try{const c=await sb.rpc("cennik_alert_cfg",{});if(!c.error)H.cfg=c.data}catch(x){}}
  paint()}
function row(h){const k=h.kind;let what,chg="",cls="";
  if(k==="platnost"){what="📅 Platnosť cenníka";chg=`${E(dt(h.valid_old))} → <b>${E(dt(h.valid))}</b>`}
  else{what=E(nm(h.com));
    if(k==="nova")chg=`nová <b>${f2(h.new_price)} €/t</b>`;
    else if(k==="zmazana"){chg=`<s>${f2(h.old_price)}</s> → zrušená`;cls="dn"}
    else{const d=+h.diff;cls=d>0?"up":d<0?"dn":"";chg=`${f2(h.old_price)} → <b>${f2(h.new_price)}</b> €/t <span class="chd">${d>0?"▲ +":d<0?"▼ −":""}${f2(Math.abs(d))} €${h.pct!=null?` · ${d>0?"+":d<0?"−":""}${f2(Math.abs(Math.round(h.pct*10)/10))} %`:""}</span>`}}
  return `<div class="chr ${cls}"><div class="chw"><b>${what}</b><small>${E(when(h.at))} · ${E(h.by_name||"?")}${h.src==="auto"?" 🤖":""}</small></div><div class="chv">${chg}</div></div>`}
function html(){const L=H.rows,coms=(typeof MK!=="undefined"?MK.map(m=>m[0]):Object.keys(NM));
  let h=`<div class="card chcard" id="chHist"><h2>📜 História cien</h2>
   <label class="chf">Plodina<select id="chCom"><option value="">všetky plodiny a platnosť</option>${coms.map(c=>`<option value="${E(c)}"${H.com===c?" selected":""}>${E(nm(c))}</option>`).join("")}</select></label>`;
  if(H.err)h+=`<div class="s">${E(H.err)}</div>`;
  else if(L===null)h+=`<div class="s">Načítavam…</div>`;
  else if(!L.length)h+=`<div class="s">Zatiaľ žiadna zmena${H.com?" pri tejto plodine":""}. Každá ďalšia zmena ceny sa sem zapíše – kto, kedy, stará a nová cena a rozdiel.</div>`;
  else h+=`<div class="chl">${L.map(row).join("")}</div><div class="s">Posledných ${L.length} zmien · 🤖 = automatický cenník</div>`;
  h+=`</div>`;
  if(OWN()){const c=H.cfg||{on:true,pct:5,eur:15};
    h+=`<form class="card chcard" id="chCfg"><h2>🔔 Upozornenie na zmenu ceny</h2>
     <label class="chsw"><input type="checkbox" name="on"${c.on===false?"":" checked"}> Zmena výkupnej ceny – zvoniť hneď (aj v noci)</label>
     <div class="chg"><label>Veľká zmena nad %<input name="pct" inputmode="decimal" value="${E(String(c.pct??5).replace(".",","))}"></label><label>alebo nad €/t<input name="eur" inputmode="decimal" value="${E(String(c.eur??15).replace(".",","))}"></label></div>
     <div class="s">Viac zmien naraz príde ako jedna správa. Veľká zmena má ⚠️ a porovnanie s burzou – ťukni na ňu (potvrdenie), inak sa o 10 min zopakuje, najviac 3×. Tvoju vlastnú zmenu dostaneš iba ticho. Farmárom sa nič neposiela.${c.subs!=null?` Telefóny s upozorneniami: <b>${c.subs}</b>.`:""}</div>
     <div class="btns"><button type="submit" class="pri">Uložiť</button><button type="button" data-chtest="1">🔔 Poslať test</button></div></form>`}
  return h}
function paint(){const app=document.getElementById("app");if(!app||typeof TAB==="undefined"||TAB!=="price"||!CANH())return;
  const old=document.getElementById("chHist");const cf=document.getElementById("chCfg");
  if(old){if(cf&&cf.contains(document.activeElement))return;if(cf)cf.remove();const d=document.createElement("div");d.innerHTML=html();old.replaceWith(...d.children);return}
  const anchor=document.getElementById("fPrice")||app.querySelector(".acn-card")||app.querySelector("nav.tabs");if(!anchor)return;
  const d=document.createElement("div");d.innerHTML=html();
  let at=anchor;for(const el of [...d.children]){at.after(el);at=el}}
function inject(){if(typeof TAB==="undefined"||TAB!=="price"||!CANH())return;if(!document.getElementById("chHist")){paint();load(false)}}
document.addEventListener("submit",e=>{if(e.target&&e.target.id==="fPrice"){H.at=0;setTimeout(()=>load(true),2500)}});
document.addEventListener("change",e=>{if(e.target&&e.target.id==="chCom"){H.com=e.target.value;H.rows=null;paint();load(true)}});
document.addEventListener("submit",async e=>{const f=e.target;if(!f||f.id!=="chCfg")return;e.preventDefault();if(!OWN())return;
  const fd=new FormData(f),n=v=>{const x=parseFloat(String(v||"").replace(/\s/g,"").replace(",","."));return isFinite(x)&&x>0?x:null};
  const b=f.querySelector("button[type=submit]");b.disabled=true;
  const r=await sb.rpc("cennik_alert_cfg",{p_on:fd.get("on")==="on",p_pct:n(fd.get("pct")),p_eur:n(fd.get("eur"))});b.disabled=false;
  if(r.error){toast("Uloženie zlyhalo: "+r.error.message,6000);return}H.cfg=r.data;toast(r.data.on?`✓ Upozornenia zapnuté · veľká zmena nad ${f2(r.data.pct)} % alebo ${f2(r.data.eur)} €/t`:"Upozornenia na zmenu ceny sú vypnuté.",6000);document.activeElement&&document.activeElement.blur&&document.activeElement.blur();paint()});
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-chtest]");if(!b||!OWN())return;e.preventDefault();b.disabled=true;
  const r=await sb.rpc("cennik_alert_cfg",{p_test:true});b.disabled=false;
  if(r.error){toast("Test sa nepodaril: "+r.error.message,6000);return}H.cfg=r.data;toast(r.data.subs?"🔔 Test odoslaný – o chvíľu zazvoní na telefónoch s upozorneniami ("+r.data.subs+").":"Žiadny telefón nemá zapnuté upozornenia – zapni ich v aplikácii (🔔).",7000)});
{const s=document.createElement("style");s.textContent=`.chcard h2{margin:0 0 8px;font-size:1.05rem}.chf{display:flex;flex-direction:column;gap:4px;margin-bottom:8px;max-width:420px}
.chl{display:flex;flex-direction:column;gap:6px;max-height:520px;overflow:auto;-webkit-overflow-scrolling:touch}
.chr{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:4px 12px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-left:3px solid rgba(148,163,184,.5)}
.chr.up{border-left-color:#4ade80}.chr.dn{border-left-color:#f87171}.chw{min-width:0;flex:1 1 180px}.chw b{display:block;overflow-wrap:anywhere}.chw small{display:block;opacity:.7;font-size:.78rem;overflow-wrap:anywhere}
.chv{flex:0 1 auto;text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.chd{display:block;font-size:.8rem;opacity:.85}.chr.up .chd{color:#4ade80}.chr.dn .chd{color:#f87171}
.chsw{display:flex;align-items:center;gap:10px;margin:4px 0 10px;flex-direction:row}.chsw input{width:22px;min-height:22px;flex-shrink:0}
.chg{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:8px}.chg label{display:flex;flex-direction:column;gap:4px;min-width:0}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.cennikHist={load,paint};
})();
