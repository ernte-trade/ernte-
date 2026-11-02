// ===== 💼 PREDAJ – PREDAJNÉ ZMLUVY (iba Martin – MAIN_OK) =====
// Register predajov odberateľom (sale_contracts), párovanie s nákupmi od farmárov (deal_sale_alloc, mnoho k mnohým s tonami),
// marža €/t a € za každý pár, otvorená pozícia po komoditách ocenená burzou (MATIF / CBOT cez EUR/USD).
// Údaje: sale_book() · zápis: sale_save, sale_alloc_set, sale_archive (databáza kontroluje is_owner, tony a komodity).
// Odberatelia sú tajní – farmár ani obchodník kartu nikdy nedostane. Strážca pozície: sale_pos_tick (pg_cron predaj-pozicie).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const MKL=()=>{try{return typeof MK!=="undefined"?MK:[]}catch(x){return []}};
const nm=c=>{const m=MKL().find(x=>x[0]===c);return m?m[1]:c};
const grp=c=>String(c||"").split("_")[0];
const n0=x=>x==null||!isFinite(+x)?"–":Math.round(+x).toLocaleString("sk-SK");
const n1=x=>x==null||!isFinite(+x)?"–":(+x).toLocaleString("sk-SK",{maximumFractionDigits:2});
const sg=x=>x==null||!isFinite(+x)?"–":(+x>0?"+":+x<0?"−":"")+n1(Math.abs(+x));
const num=v=>{const s=String(v==null?"":v).replace(/\s/g,"").replace(",",".");return s===""?null:+s};
const ST={navrh:"Návrh",podpisana:"Podpísaná",dodava:"Dodáva sa",dodana:"Dodaná",fakturacia:"Fakturácia",zaplatena:"Zaplatená",zrusena:"Zrušená"};
const DST={navrh:"návrh",podpisany:"podpísaný",odvoz:"odvoz",odvezeny:"odvezený",fakturacia:"fakturácia",zaplateny:"zaplatený",zruseny:"zrušený"};
const D={B:null,at:0,busy:false,err:"",edit:null,open:null};
try{D.open=localStorage.getItem("ernte-pz-open")==="1"}catch(x){D.open=false}

async function load(force){if(!OWN()||D.busy)return;if(!force&&D.B&&Date.now()-D.at<60e3)return;D.busy=true;
  try{const r=await sb.rpc("sale_book");if(r.error){D.err=r.error.message||"chyba";D.B=D.B||{sales:[],deals:[],buyers:[],sum:{}}}else{D.err="";D.B=r.data||{sales:[],deals:[],buyers:[],sum:{}}}D.at=Date.now()}
  catch(x){D.err=String(x&&x.message||x);D.B=D.B||{sales:[],deals:[],buyers:[],sum:{}}}finally{D.busy=false}paint()}

function chip(k,v,cls){return `<span class="pzc${cls?" "+cls:""}"><small>${E(k)}</small><b>${v}</b></span>`}
function posHTML(){const P=(D.B&&D.B.sum&&D.B.sum.pozicie)||{},K=Object.keys(P);
  if(!K.length)return `<div class="s">Zatiaľ žiadne nákupy ani predaje na pozíciu.</div>`;
  const S=(D.B.sum&&D.B.sum.spolu)||{};
  return `<div class="pzpos">${K.sort((a,b)=>Math.abs(+P[b].otvorena_t||0)-Math.abs(+P[a].otvorena_t||0)).map(c=>{const x=P[c],o=+x.otvorena_t||0,big=Math.abs(o)>500;
    return `<div class="pzp${big?" big":""}"><div class="pzph"><b>${E(x.komodita||nm(c))}</b><span class="${o>0?"lg":o<0?"sh":"fl"}">${o>0?"nepredané":o<0?"nenakúpené":"vyrovnané"} ${n0(Math.abs(o))} t</span></div>
     <div class="pzcs">${chip("Nakúpené",n0(x.nakupene_t)+" t")}${chip("Predané",n0(x.predane_t)+" t")}${chip("Spárované",n0(x.sparovane_t)+" t")}
      ${chip("Nakúp. nepredané",n0(x.nakupene_nepredane_t)+" t"+(x.nepredane_priemer_nakup_eur_t!=null?` <i>⌀ ${n1(x.nepredane_priemer_nakup_eur_t)} €/t</i>`:""))}
      ${chip("Pred. nenakúpené",n0(x.predane_nenakupene_t)+" t"+(x.nenakupene_priemer_predaj_eur_t!=null?` <i>⌀ ${n1(x.nenakupene_priemer_predaj_eur_t)} €/t</i>`:""))}
      ${chip("Hodnota pozície",x.hodnota_eur!=null?sg(x.hodnota_eur)+" €":"bez ceny",x.hodnota_eur==null?"na":"")}
      ${chip("Marža spárovaných",sg(x.marza_sparovane_eur)+" €"+(x.marza_sparovane_eur_t!=null?` <i>${sg(x.marza_sparovane_eur_t)} €/t</i>`:""),+x.marza_sparovane_eur>0?"pos":+x.marza_sparovane_eur<0?"neg":"")}</div>
     <div class="pzm">Ocenenie: ${E(x.cena_zdroj||"–")}${x.cena_eur_t!=null?` · <b>${n1(x.cena_eur_t)} €/t</b>`:""}${big?` · <b class="neg">nad 500 t</b>`:""}</div></div>`}).join("")}</div>
   <div class="pzm">Spolu otvorená pozícia <b>${sg(S.otvorena_t)} t</b> · hodnota <b>${sg(S.hodnota_eur)} €</b> · marža spárovaných <b>${sg(S.marza_sparovane_eur)} €</b>${D.B.sum&&D.B.sum.eurusd?` · EUR/USD ${n1(D.B.sum.eurusd)}`:""}</div>`}

function formHTML(s){s=s||{parity:"DAP",status:"podpisana",com:"repka"};const B=(D.B&&D.B.buyers)||[];
  return `<form class="f pzf" data-pzform="${E(s.id||"")}"><div class="w t">${s.id?"✏️ Upraviť "+E(s.no||""):"➕ Nová predajná zmluva"}</div>
   <label class="w">Odberateľ<input name="buyer" list="pzBl" required value="${E(s.buyer||"")}" placeholder="názov firmy odberateľa" autocomplete="off"></label>
   <datalist id="pzBl">${B.map(b=>`<option value="${E(b.name)}"></option>`).join("")}</datalist>
   <label>IČO<input name="ico" inputmode="numeric" value="${E(s.ico||"")}"></label>
   <label>Komodita<select name="com">${MKL().map(m=>`<option value="${m[0]}"${s.com===m[0]?" selected":""}>${E(m[1])}</option>`).join("")}</select></label>
   <label>Množstvo t<input name="tons" inputmode="decimal" required value="${E(s.tons!=null?String(s.tons).replace(".",","):"")}"></label>
   <label>Cena €/t<input name="price" inputmode="decimal" required value="${E(s.price!=null?String(s.price).replace(".",","):"")}"></label>
   <label>Parita<select name="parity"><option value="DAP"${s.parity==="DAP"?" selected":""}>DAP – dovezieme my</option><option value="FCA"${s.parity==="FCA"?" selected":""}>FCA – odvezie odberateľ</option></select></label>
   <label>Naša doprava €/t (pri DAP)<input name="dop" inputmode="decimal" value="${E(s.dop!=null&&+s.dop?String(s.dop).replace(".",","):"")}" placeholder="0"></label>
   <label>Termín dodania<input name="term" value="${E(s.term||"")}" placeholder="napr. 1.–15. 12. 2026"></label>
   <label>Dodané t<input name="delivered_t" inputmode="decimal" value="${E(s.delivered_t!=null?String(s.delivered_t).replace(".",","):"0")}"></label>
   <label>Stav<select name="status">${Object.keys(ST).map(k=>`<option value="${k}"${s.status===k?" selected":""}>${E(ST[k])}</option>`).join("")}</select></label>
   <label class="w">Poznámka (iba pre teba)<input name="note" value="${E(s.note||"")}"></label>
   <div class="w btns"><button class="pri" type="submit">Uložiť zmluvu</button><button type="button" data-pzcancel>Zrušiť</button></div></form>`}

function saleHTML(s,ro){const A=s.alloc||[],at=A.reduce((a,x)=>a+(+x.tons||0),0),me=A.reduce((a,x)=>a+(+x.m_eur||0),0),free=Math.max(0,(+s.tons||0)-at);
  const cand=((D.B&&D.B.deals)||[]).filter(d=>grp(d.com)===grp(s.com)&&!A.some(a=>a.deal_id===d.id)&&(+d.tons||0)-(+d.alloc_t||0)>0.001);
  const net=(+s.price||0)-(+s.dop||0);
  return `<div class="pzs${s.archived?" arch":""}"><div class="pzsh"><span class="pzst"><b>${E(s.buyer)}</b><small>${E(s.no||"")}${s.ico?" · IČO "+E(s.ico):""}${s.term?" · termín "+E(s.term):""}</small></span><span class="pzpill st-${E(s.status)}">${E(ST[s.status]||s.status)}</span></div>
   <div class="pzcs">${chip("Komodita",E(nm(s.com)))}${chip("Množstvo",n1(s.tons)+" t")}${chip("Cena",n1(s.price)+" €/t "+E(s.parity))}${s.parity==="DAP"?chip("Po doprave",n1(net)+" €/t"):""}
    ${chip("Dodané",n1(s.delivered_t)+" t")}${chip("Spárované",n1(at)+" t"+(free>0.001?` <i>voľné ${n1(free)} t</i>`:""),free>0.001?"":"pos")}${chip("Marža",A.length?sg(me)+" €":"–",me>0?"pos":me<0?"neg":"")}</div>
   ${A.length?`<div class="pzal">${A.map(a=>`<div class="pza${a.live?"":" off"}"><span class="pzat"><b>${E(a.no)}</b> · ${E(a.farmer||"")}${a.com!==s.com?" · "+E(nm(a.com)):""}<small>nákup ${n1(a.buy)} €/t · ${E(DST[a.status]||a.status)}${a.live?"":" · mimo pozície"}</small></span>
      <span class="pzam"><b class="${+a.m_t>=0?"pos":"neg"}">${sg(a.m_t)} €/t</b><small>${n1(a.tons)} t → ${sg(a.m_eur)} €</small></span>
      ${ro?"":`<span class="pzae"><input inputmode="decimal" value="${E(String(a.tons).replace(".",","))}" aria-label="Tony ${E(a.no)}" data-pzat="${E(s.id)}|${E(a.deal_id)}"><button type="button" data-pzaset="${E(s.id)}|${E(a.deal_id)}" title="Uložiť tony">✓</button><button type="button" data-pzadel="${E(s.id)}|${E(a.deal_id)}" title="Zrušiť spárovanie">✕</button></span>`}</div>`).join("")}</div>`:`<div class="pzm">Zatiaľ nespárované s nákupom.</div>`}
   ${!ro&&free>0.001?(cand.length?`<div class="pzadd"><select data-pzdeal="${E(s.id)}" aria-label="Nákup na spárovanie">${cand.map(d=>{const fr=(+d.tons||0)-(+d.alloc_t||0);return `<option value="${E(d.id)}" data-free="${fr}">${E(d.no)} · ${E(d.farmer||"")} · ${E(nm(d.com))} · voľné ${n1(fr)} t · ${n1(d.price)} €/t</option>`}).join("")}</select>
      <input inputmode="decimal" placeholder="t" aria-label="Tony na spárovanie" data-pzt="${E(s.id)}" value="${E(n1(Math.min(free,Math.max(0,(+cand[0].tons||0)-(+cand[0].alloc_t||0)))).replace(/\s/g,""))}"><button type="button" class="lime" data-pzlink="${E(s.id)}">🔗 Spárovať</button></div>`
      :`<div class="pzm">Žiadny voľný nákup tejto komodity (podpísaný, nearchivovaný) na spárovanie.</div>`):""}
   ${s.note?`<div class="pzm">📝 ${E(s.note)}</div>`:""}
   <div class="btns">${ro?"":`<button type="button" data-pzedit="${E(s.id)}">✏️ Upraviť</button>`}<button type="button" data-pzarch="${E(s.id)}" data-on="${s.archived?0:1}">${s.archived?"♻️ Obnoviť z archívu":"🗄️ Archivovať"}</button></div>
   ${D.edit===s.id?formHTML(s):""}</div>`}

function html(){const B=D.B,S=B?(B.sales||[]):[],act=S.filter(s=>!s.archived),arch=S.filter(s=>s.archived);
  const sum=B&&B.sum&&B.sum.spolu,big=B&&B.sum&&B.sum.pozicie?Object.values(B.sum.pozicie).some(x=>Math.abs(+x.otvorena_t||0)>500):false;
  return `<details class="card pzw${big?" al":""}" id="pzCard"${D.open?" open":""}><summary><span class="pzsum"><b>💼 Predaj – predajné zmluvy</b><small>${B?`${act.length} ${act.length===1?"zmluva":act.length>=2&&act.length<=4?"zmluvy":"zmlúv"}${sum?` · otvorená pozícia ${sg(sum.otvorena_t)} t`:""}`:"Načítavam…"} · iba ty</small></span></summary>
   ${D.err?`<div class="pzm neg">Nepodarilo sa načítať: ${E(D.err)}</div>`:""}
   <h2 class="pzh">📊 Otvorená pozícia</h2>${B?posHTML():`<div class="s">Načítavam…</div>`}
   <h2 class="pzh">📄 Predajné zmluvy</h2>
   ${D.edit==="new"?formHTML():`<div class="btns"><button type="button" class="pri" data-pznew>➕ Nová predajná zmluva</button><button type="button" data-pzre>↻ Obnoviť</button></div>`}
   ${act.map(s=>saleHTML(s)).join("")||(B?`<div class="s">Zatiaľ žiadna predajná zmluva.</div>`:"")}
   ${arch.length?`<details class="pzarch"><summary><b>🗄️ Archív predajných zmlúv</b><small>${arch.length} · mimo pozície</small></summary>${arch.map(s=>saleHTML(s,1)).join("")}</details>`:""}</details>`}

function paint(){if(!OWN()||typeof TAB==="undefined"||TAB!=="deals")return;const app=document.getElementById("app");if(!app)return;
  const old=document.getElementById("pzCard");const d=document.createElement("div");d.innerHTML=html();const el=d.firstElementChild;
  if(old){const fe=old.querySelector("form.pzf"),ae=document.activeElement;if(fe&&ae&&fe.contains(ae))return; // nepreskakovať, kým píše
    old.replaceWith(el);return}
  const anchor=app.querySelector("#dwCard")||app.querySelector("#fDeal");if(anchor)(anchor.id==="dwCard"?anchor.after(el):anchor.before(el));else{const nav=app.querySelector("nav.tabs");(nav||app.firstElementChild).after(el)}}
function inject(){if(!OWN()||typeof TAB==="undefined"||TAB!=="deals")return;if(!D.B||Date.now()-D.at>60e3)load(false);if(!document.getElementById("pzCard"))paint()}

async function call(fn,args,btn,ok){if(btn)btn.disabled=true;try{const r=await sb.rpc(fn,args);if(r.error){toast("Nepodarilo sa: "+r.error.message,7000);return null}if(ok)toast(ok,4000);return r.data||true}
  catch(x){toast("Nepodarilo sa: "+(x&&x.message||x),7000);return null}finally{if(btn)btn.disabled=false}}
document.addEventListener("toggle",e=>{const t=e.target;if(!t||t.id!=="pzCard")return;D.open=t.open;try{localStorage.setItem("ernte-pz-open",t.open?"1":"0")}catch(x){}if(t.open)load(false)},true);
document.addEventListener("submit",async e=>{const f=e.target.closest&&e.target.closest("form.pzf");if(!f||!OWN())return;e.preventDefault();e.stopPropagation();
  const fd=new FormData(f),o={};for(const [k,v] of fd.entries())o[k]=String(v).trim();if(f.dataset.pzform)o.id=f.dataset.pzform;
  const b=((D.B&&D.B.buyers)||[]).find(x=>String(x.name).toLowerCase()===String(o.buyer||"").toLowerCase());o.buyer_id=b?b.id:"";
  if(!(num(o.tons)>0)||!(num(o.price)>0)){toast("Zadaj množstvo aj cenu.",5000);return}
  const r=await call("sale_save",{p:o},f.querySelector("[type=submit]"),"✓ Predajná zmluva uložená");if(!r)return;D.edit=null;f.querySelector("input")&&f.querySelector("input").blur();await load(true)},true);
document.addEventListener("click",async e=>{const g=s=>e.target.closest&&e.target.closest(s);let x;if(!g("#pzCard")||!OWN())return;
  if(x=g("[data-pznew]")){D.edit="new";paint();return}
  if(x=g("[data-pzcancel]")){D.edit=null;document.activeElement&&document.activeElement.blur&&document.activeElement.blur();paint();return}
  if(x=g("[data-pzre]")){await load(true);return}
  if(x=g("[data-pzedit]")){D.edit=D.edit===x.dataset.pzedit?null:x.dataset.pzedit;paint();return}
  if(x=g("[data-pzarch]")){const on=x.dataset.on==="1";if(on&&!confirm("Archivovať predajnú zmluvu? Nezmaže sa, iba sa nebude rátať do pozície."))return;
    if(await call("sale_archive",{p_id:x.dataset.pzarch,p_on:on},x,on?"🗄️ Archivované":"♻️ Obnovené"))await load(true);return}
  if(x=g("[data-pzlink]")){const id=x.dataset.pzlink,sel=document.querySelector(`[data-pzdeal="${CSS.escape(id)}"]`),inp=document.querySelector(`[data-pzt="${CSS.escape(id)}"]`);
    const t=num(inp&&inp.value);if(!sel||!(t>0)){toast("Vyber nákup a zadaj tony.",5000);return}
    const r=await call("sale_alloc_set",{p_sale:id,p_deal:sel.value,p_tons:t},x);if(!r)return;toast(`✓ Spárované · marža ${sg(r.m_t)} €/t, spolu ${sg(r.m_eur)} €`,5000);await load(true);return}
  if(x=g("[data-pzaset]")){const [s,d]=x.dataset.pzaset.split("|"),inp=document.querySelector(`[data-pzat="${CSS.escape(x.dataset.pzaset)}"]`),t=num(inp&&inp.value);
    if(!(t>0)){toast("Zadaj tony (na zrušenie použi ✕).",5000);return}if(await call("sale_alloc_set",{p_sale:s,p_deal:d,p_tons:t},x,"✓ Tony upravené"))await load(true);return}
  if(x=g("[data-pzadel]")){if(!confirm("Zrušiť spárovanie tohto nákupu s predajom?"))return;const [s,d]=x.dataset.pzadel.split("|");
    if(await call("sale_alloc_set",{p_sale:s,p_deal:d,p_tons:0},x,"✓ Spárovanie zrušené"))await load(true);return}},true);
document.addEventListener("change",e=>{const s=e.target.closest&&e.target.closest("[data-pzdeal]");if(!s)return;const o=s.selectedOptions[0],inp=document.querySelector(`[data-pzt="${CSS.escape(s.dataset.pzdeal)}"]`);
  const sale=((D.B&&D.B.sales)||[]).find(x=>x.id===s.dataset.pzdeal);if(!o||!inp||!sale)return;const free=Math.max(0,(+sale.tons||0)-(sale.alloc||[]).reduce((a,x)=>a+(+x.tons||0),0));
  inp.value=String(Math.round(Math.min(free,+o.dataset.free||0)*100)/100).replace(".",",")},true);

{const s=document.createElement("style");s.textContent=`
.pzw>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px}.pzw>summary::-webkit-details-marker{display:none}
.pzw>summary::after{content:"›";margin-left:auto;font-size:1.4rem;transition:transform .2s;opacity:.7}.pzw[open]>summary::after{transform:rotate(90deg)}
.pzsum{display:grid;gap:2px;min-width:0}.pzsum small{opacity:.75;overflow-wrap:anywhere}
.pzw.al{border-color:rgba(251,191,36,.6)!important}
.pzh{font-size:1.02rem;margin:16px 0 8px}
.pzpos{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.pzp{border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px;display:grid;gap:8px;min-width:0;background:rgba(255,255,255,.03)}
.pzp.big{border-color:rgba(248,113,113,.55)}
.pzph{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;justify-content:space-between}.pzph span{font-weight:700}
.pzph .lg{color:#fcd34d}.pzph .sh{color:#93c5fd}.pzph .fl{color:#86efac}
.pzcs{display:flex;flex-wrap:wrap;gap:6px}
.pzc{display:grid;gap:1px;padding:5px 9px;border-radius:10px;background:rgba(255,255,255,.06);min-width:0;max-width:100%}
.pzc small{font-size:.68rem;opacity:.7}.pzc b{font-size:.88rem;overflow-wrap:anywhere}.pzc i{font-style:normal;font-weight:400;opacity:.75;font-size:.76rem}
.pzc.pos b,.pzw .pos{color:#86efac}.pzc.neg b,.pzw .neg{color:#fca5a5}.pzc.na b{opacity:.6}
.pzm{font-size:.84rem;line-height:1.4;opacity:.9;overflow-wrap:anywhere}
.pzs{border-top:1px solid rgba(255,255,255,.08);padding:12px 0;display:grid;gap:8px;min-width:0}.pzs.arch{opacity:.75}
.pzsh{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.pzst{display:grid;gap:2px;min-width:0}.pzst b{overflow-wrap:anywhere}.pzst small{opacity:.7;overflow-wrap:anywhere}
.pzpill{flex:none;font-size:.74rem;padding:3px 9px;border-radius:99px;background:rgba(255,255,255,.1);white-space:nowrap}
.pzpill.st-podpisana,.pzpill.st-dodava{background:rgba(182,255,59,.18);color:#d9f99d}.pzpill.st-zrusena{background:rgba(248,113,113,.2);color:#fecaca}.pzpill.st-zaplatena,.pzpill.st-dodana{background:rgba(52,211,153,.2);color:#a7f3d0}
.pzal{display:grid;gap:6px}
.pza{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.04)}
.pza.off{opacity:.6}.pzat{min-width:0;overflow-wrap:anywhere;font-size:.88rem}.pzat small,.pzam small{display:block;opacity:.7;font-size:.74rem}
.pzam{text-align:right}.pzae{grid-column:1/-1;display:flex;gap:6px;align-items:center;justify-content:flex-end}
.pzae input{width:88px;min-width:0}.pzae button{min-width:40px;padding:6px 10px}
.pzadd{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.pzadd select{flex:1 1 220px;min-width:0;max-width:100%}.pzadd input{width:90px;min-width:0}
.pzarch{margin-top:10px}.pzarch>summary{cursor:pointer;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}.pzarch>summary small{opacity:.7}
.pzf{margin-top:8px;padding:10px;border-radius:14px;background:rgba(255,255,255,.04)}`;document.head.appendChild(s)}

let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&OWN()&&typeof TAB!=="undefined"&&TAB==="deals")load(true)})}
window.ernteSale={load,paint,D};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
