// ===== ERNTE · 📥 POŠTA (5. 11. 06:51 PRÍKAZ MAJITEĽA: odosielanie vypnuté, iba príjem; odpoveď na kopírovanie, Martin odošle sám; 🤖 Napíš so mnou) – iba Martin a Jana =====
// Odpovede od firiem, ktoré sme oslovili (erntespol@gmail.com → Gmail skript → lead_replies). Claude im odpíše sám;
// keď nevie presne čo, nastaví „pomoc“ → červená výstražná bublina „🆘 Pomoc pri odpísaní klientovi“. Tu sa odpoveď upraví a odošle vo vlákne klienta.
(function(){
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// 5. 11. 07:37 PRÍKAZ MAJITEĽA: e-maily vidí IBA Martin (MAIN_OK), nie Jana
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST&&typeof window.MAIN_OK==="function"&&window.MAIN_OK()&&typeof sb!=="undefined"&&sb;
const R={items:[],at:0,busy:false,open:false};
const hm=t=>{try{return new Date(t).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}catch(x){return ""}};
const ST={hromadna:["📰","Hromadná pošta"],nova:["📩","Nová"],pomoc:["🆘","Treba tvoju pomoc"],odpovedane:["✅","Odpovedané"],ignor:["↷","Bez odpovede"]};
async function load(force){if(!OK()||R.busy)return;if(!force&&Date.now()-R.at<170e3)return;R.busy=true;
  try{const {data,error}=await sb.rpc("lead_reply_list");if(!error&&data&&!data.err){R.items=data.items||[];R.off=!!data.off;R.script=data.script;R.seen=data.reply_seen}R.at=Date.now()}catch(x){}
  R.busy=false;draw();homeTile()}
function help(){return R.items.filter(x=>x.status==="pomoc")}
function draw(){let b=document.getElementById("lrBub");const H=help();
  if(!OK()||!H.length){if(b)b.remove();return}
  if(!b){b=document.createElement("button");b.type="button";b.id="lrBub";b.addEventListener("click",()=>openSheet());document.body.appendChild(b)}
  const t=`<span class="lri" aria-hidden="true">🆘</span><span class="lrt"><b>Pomoc pri odpísaní klientovi</b><small>${H.length===1?e(H[0].from_name||H[0].from_addr):H.length+" klienti čakajú na odpoveď"}</small></span><span class="lrn">${H.length}</span>`;
  if(b.innerHTML!==t)b.innerHTML=t;
  if(R.open)openSheet(true)}
const COM={repka:"Repka",psenica_p:"Pšenica potrav.",psenica_k:"Pšenica kŕmna",kukurica:"Kukurica",soja:"Sója",lo:"Slnečnica LO",ho:"Slnečnica HO",jacmen_k:"Jačmeň kŕmny",jacmen_s:"Jačmeň sladovnícky"};
function modelHTML(x){const f=x.facts||{},O=f.offers||[];if(!O.length&&!f.model)return "";
  return `<div class="lrmod"><b>📊 Do nášho modelu</b>${f.model?`<div>${e(f.model)}</div>`:""}${O.map((o,i)=>`<div class="lrmo"><span>${e(COM[o.com]||o.com)} · ${e(o.del||"")} ${e(o.site||"")} · <b>${e(o.price)} €/t</b>${o.period?" · "+e(o.period):""}</span>${o.done?`<i class="lrok" title="V Kde predať">✔</i>`:`<button type="button" class="lrmini lrap" data-lrap="${x.id}:${i}" title="Vložiť do Kde predať">➕</button>`}</div>`).join("")}</div>`}
const sj=x=>{const t=String(x.subject||"");return /^\s*(re|aw|sv|vá|fw|wg)\s*:/i.test(t)?t:"Re: "+t};
function card(x){const s=ST[x.status]||["•",x.status],can=x.status==="pomoc"||x.status==="nova",wait=x.status==="pomoc"&&x.ask&&!x.draft;
  return `<div class="lrc lr-${e(x.status)}" data-lrid="${x.id}">
   <div class="lrh"><b>${x.status==="odpovedane"?`<i class="lrok" title="Odpovedané">✔</i>`:""}${e(x.from_name||x.from_addr)}</b><span class="pill ${x.status==="pomoc"?"r":x.status==="nova"?"w":""}">${wait?"✍️ Claude píše návrh":s[0]+" "+s[1]}</span></div>
   <div class="s">${e(x.from_addr)} · ${hm(x.received)} · ${e(x.subject||"")}${x.known===false?" · <i>nový kontakt</i>":""}</div>
   ${x.fwd_by?`<div class="s">↪️ Preposlané z ${e(x.fwd_by)} – odpoveď patrí priamo na ${e(x.from_addr)}.</div>`:""}
   ${x.note?`<div class="lrnote">🤖 ${e(x.note)}</div>`:""}
   ${x.rec?`<div class="lrrec"><b>🧭 Čo robiť</b>${e(x.rec)}</div>`:""}
   ${(x.info||[]).length?`<div class="lrinfo"><b>⭐ Dôležité</b>${x.info.map(i=>`<div>• ${e(i)}</div>`).join("")}</div>`:""}
   ${modelHTML(x)}
   <details${can?" open":""}><summary>📩 Čo napísal</summary><pre class="lrb">${e(String(x.body||"").split(/\n-{3,}\s*(Original|Ursprüngliche|Pôvodná|Eredeti)/i)[0].slice(0,4000))}</pre></details>
   ${can?`<div class="lrto"><span>Komu: <b>${e(x.from_addr)}</b></span><button type="button" class="lrmini" data-lrcp="to:${x.id}">📋</button></div>
    <div class="lrto"><span>Predmet: <b>${e(sj(x))}</b></span><button type="button" class="lrmini" data-lrcp="sj:${x.id}">📋</button></div>
    <label class="lrl">Odpoveď – uprav, skopíruj a pošli zo svojej schránky<textarea rows="9" data-lrtx="${x.id}" placeholder="${wait?"Claude pripravuje návrh – do hodiny je tu…":"Napíš odpoveď alebo nechaj Claude napísať návrh (nižšie)"}">${e(x.draft||"")}</textarea></label>
    <div class="btns"><button type="button" class="pri" data-lrcp="tx:${x.id}">📋 Kopírovať odpoveď</button><button type="button" data-lrdone="${x.id}">✔️ Odoslal som</button><button type="button" data-lrign="${x.id}">↷ Netreba</button></div>
    <details class="lrask"${x.draft?"":" open"}><summary>🤖 Napíš so mnou</summary><label class="lrl">Čo chceš odpísať (pár slov, jazyk sa prispôsobí klientovi)<textarea rows="3" data-lrask="${x.id}" placeholder="napr. poďakuj, cenu pošleme do piatku, spýtaj sa na množstvo">${e(x.ask||"")}</textarea></label>
     <div class="btns"><button type="button" class="lime" data-lrgo="${x.id}">🤖 Pripraviť návrh</button></div></details>`
    :x.draft?`<details><summary>📤 Naša odpoveď</summary><pre class="lrb">${e(x.draft)}</pre></details>`:""}
  </div>`}
function openSheet(re){R.open=true;let o=document.getElementById("lrSheet");
  if(!o){o=document.createElement("div");o.id="lrSheet";o.className="lrov";o.addEventListener("click",ev=>{if(ev.target===o)close()});document.body.appendChild(o)}
  const keep={};o.querySelectorAll("[data-lrtx]").forEach(t=>keep[t.dataset.lrtx]=t.value);
  const I=R.items,A=I.filter(x=>x.status==="pomoc"),B=I.filter(x=>x.status==="nova"),C=I.filter(x=>x.status!=="pomoc"&&x.status!=="nova");
  const live=R.seen&&Date.now()-Date.parse(R.seen)<75*60e3;
  const H=I.filter(x=>x.status==="hromadna");const C2=C.filter(x=>x.status!=="hromadna");
  o.innerHTML=`<div class="lrs" role="dialog" aria-label="Pošta"><div class="lrsh"><b>📥 Pošta</b><button type="button" class="lrx" data-lrclose aria-label="Zavrieť">✕</button></div>
   <div class="s">Prijaté e-maily z erntespol@gmail.com. ${R.off?"<b>📵 Odosielanie z aplikácie je vypnuté</b> – odpoveď skopíruj (📋) a pošli zo svojej schránky, potom ťukni ✔️ Odoslal som.":""}
    ${live?`🟢 Schránka naposledy skontrolovaná ${hm(R.seen)}.`:`<b class="lrw">⚠️ Gmail skript teraz nečíta doručenú poštu.</b>`}</div>
   ${A.length?`<h3 class="lrsub">🆘 Treba odpísať (${A.length})</h3>${A.map(card).join("")}`:""}
   ${B.length?`<h3 class="lrsub">📩 Nové (${B.length})</h3>${B.map(card).join("")}`:""}
   ${!A.length&&!B.length?`<div class="s">✅ Všetko vybavené.</div>`:""}
   ${C2.length?`<details><summary class="lrsub">Vybavené – posledných 60 dní (${C2.length})</summary>${C2.map(card).join("")}</details>`:""}
   ${H.length?`<details><summary class="lrsub">📰 Hromadná pošta (${H.length})</summary>${H.map(card).join("")}</details>`:""}</div>`;
  o.querySelectorAll("[data-lrtx]").forEach(t=>{if(keep[t.dataset.lrtx]!=null)t.value=keep[t.dataset.lrtx]})}
function close(){R.open=false;const o=document.getElementById("lrSheet");if(o)o.remove();if(location.hash==="#odpovede")try{history.replaceState(null,"",location.pathname+location.search)}catch(x){}}
async function copy(t){try{await navigator.clipboard.writeText(t);return true}catch(x){const a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand("copy")}catch(y){}a.remove();return ok}}
const rpc=async(id,body,act)=>{const {error}=await sb.rpc("lead_reply_answer",{p_id:id,p_body:body,p_act:act});if(error)throw error};
document.addEventListener("click",async ev=>{const t=ev.target.closest&&ev.target.closest("[data-lrap]");if(!t||!OK())return;const [id,i]=t.dataset.lrap.split(":");t.disabled=true;
  try{const {data,error}=await sb.rpc("lead_offer_apply",{p_id:+id,p_i:+i});if(error)throw error;window.toast&&toast("✔ Ponuka vložená do Kde predať");await load(true)}catch(x){t.disabled=false;window.toast&&toast("⚠️ "+(x.message||x))}});
document.addEventListener("change",ev=>{const t=ev.target.closest&&ev.target.closest("[data-lrtx]");if(!t||!OK())return;rpc(+t.dataset.lrtx,t.value,"draft").catch(()=>{})});
document.addEventListener("click",async ev=>{const t=ev.target.closest("[data-lrclose],[data-lrcp],[data-lrdone],[data-lrign],[data-lrgo],[data-lrhome]");if(!t)return;
  if(t.dataset.lrclose!=null)return close();
  if(t.dataset.lrhome!=null){load(true);return openSheet()}
  if(t.dataset.lrcp){const [k,id]=t.dataset.lrcp.split(":"),x=R.items.find(y=>y.id==id);if(!x)return;const tx=document.querySelector(`[data-lrtx="${id}"]`);
    const v=k==="to"?x.from_addr:k==="sj"?sj(x):(tx?tx.value.trim():"");if(!v){window.toast&&toast("Odpoveď je prázdna – napíš ju alebo ťukni 🤖 Pripraviť návrh.");return}
    const ok=await copy(v);window.toast&&toast(ok?"📋 Skopírované":"⚠️ Nepodarilo sa skopírovať – označ text a skopíruj ručne");if(k==="tx"&&tx)rpc(+id,v,"draft").catch(()=>{});return}
  const id=+(t.dataset.lrdone||t.dataset.lrign||t.dataset.lrgo);t.disabled=true;
  try{if(t.dataset.lrgo){const a=document.querySelector(`[data-lrask="${id}"]`),v=a?a.value.trim():"";if(v.length<3){t.disabled=false;window.toast&&toast("Napíš pár slov, čo chceš odpísať.");return}
      await rpc(id,v,"ask");window.toast&&toast("🤖 Claude pripraví návrh – ozve sa push, keď bude hotový")}
    else{const tx=document.querySelector(`[data-lrtx="${id}"]`);await rpc(id,tx?tx.value:"",t.dataset.lrdone?"done":"ignor");window.toast&&toast(t.dataset.lrdone?"✔️ Označené ako odoslané":"↷ Označené")}
    await load(true)}
  catch(x){t.disabled=false;window.toast&&toast("⚠️ "+(x.message||x))}});
// 📥 dlaždica Pošta na Prehľade (iba majitelia)
function homeTile(){if(!OK()||typeof TAB==="undefined"||TAB!=="home")return;const app=document.getElementById("app");if(!app)return;
  const n=R.items.filter(x=>x.status==="nova"||x.status==="pomoc").length;let I=[];R.items.filter(x=>Date.now()-Date.parse(x.received)<14*864e5).forEach(x=>(x.info||[]).forEach(t=>{if(I.length<4)I.push([x,t])}));
  const h=`<button type="button" class="lrhome${n?" on":""}" data-lrhome><span>📥</span><b>Pošta</b><small>${n?n+" na vybavenie":"všetko vybavené"}</small></button>${I.length?`<div class="lrhi"><b>⭐ Z pošty – dôležité</b>${I.map(([x,t])=>`<div>• ${e(t)} <small>(${e(x.from_name||x.from_addr)})</small></div>`).join("")}</div>`:""}`;
  let el=document.getElementById("lrHome");if(el){if(el.dataset.k!==h){el.dataset.k=h;el.innerHTML=h}if(app.contains(el))return}
  const at=app.querySelector(".hero")||app.querySelector("nav.tabs");if(!at)return;el=document.createElement("div");el.id="lrHome";el.dataset.k=h;el.innerHTML=h;at.insertAdjacentElement("afterend",el)}
new MutationObserver(()=>(window.ernteSoon||requestAnimationFrame)(homeTile)).observe(document.documentElement,{childList:true,subtree:true});
function hash(){if(/^#(odpovede|posta)$/.test(location.hash)&&OK()){load(true);openSheet()}}
window.addEventListener("hashchange",hash);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)load()});
setInterval(()=>{if(!document.hidden)load()},180e3);
// 5. 11. 07:35 PRÍKAZ MAJITEĽA: pri každom prihlásení / otvorení aplikácie upozorni na nové prijaté e-maily s tlačidlom Odpovedať; odpovedané = zelená fajka
function loginPop(){if(!OK())return;let seen=null;try{seen=sessionStorage.getItem("ernte-posta-pop")}catch(x){}if(seen)return;
  const N=R.items.filter(x=>x.status==="nova"||x.status==="pomoc"),T=R.items.filter(x=>x.status==="odpovedane"&&x.done_at&&Date.now()-Date.parse(x.done_at)<24*3600e3);
  if(!N.length)return;try{sessionStorage.setItem("ernte-posta-pop","1")}catch(x){}
  if((()=>{const w=document.querySelector(".wlc");return w&&w.offsetParent})()){setTimeout(()=>{try{sessionStorage.removeItem("ernte-posta-pop")}catch(x){}loginPop()},4000);return}
  let o=document.getElementById("lrPop");if(o)o.remove();o=document.createElement("div");o.id="lrPop";o.className="lrov";
  o.innerHTML=`<div class="lrs lrpop" role="dialog" aria-label="Nové e-maily"><div class="lrsh"><b>📥 Nové e-maily (${N.length})</b><button type="button" class="lrx" data-lrpx aria-label="Zavrieť">✕</button></div>
   ${N.map(x=>`<div class="lrpi"><span><b>${e(x.from_name||x.from_addr)}</b><small>${hm(x.received)} · ${e(x.subject||"")}</small></span><button type="button" class="pri" data-lrreply="${x.id}">✉️ Odpovedať</button></div>`).join("")}
   ${T.length?`<div class="lrsub">Dnes odpovedané</div>${T.map(x=>`<div class="lrpi"><span><b><i class="lrok">✔</i>${e(x.from_name||x.from_addr)}</b><small>${e(x.subject||"")}</small></span></div>`).join("")}`:""}
   <div class="btns"><button type="button" data-lrhome>📥 Celá pošta</button></div></div>`;
  o.addEventListener("click",ev=>{if(ev.target===o||ev.target.closest("[data-lrpx]"))o.remove()});document.body.appendChild(o)}
document.addEventListener("click",ev=>{const t=ev.target.closest&&ev.target.closest("[data-lrreply],#lrPop [data-lrhome]");if(!t)return;const p=document.getElementById("lrPop");if(p)p.remove();
  if(t.dataset.lrreply){openSheet();setTimeout(()=>{const c=document.querySelector(`#lrSheet [data-lrid="${t.dataset.lrreply}"]`);if(c){c.scrollIntoView({block:"start",behavior:"smooth"});const tx=c.querySelector("textarea");if(tx)tx.focus({preventScroll:true})}},80)}},true);
const tk=setInterval(()=>{if(OK()){clearInterval(tk);load(true).then(()=>{hash();loginPop()})}},1500);setTimeout(()=>clearInterval(tk),120e3);
window.leadReplies=()=>{load(true);openSheet()};
const st=document.createElement("style");st.textContent=`
#lrBub{position:fixed;z-index:9000;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 178px);display:flex;align-items:center;gap:10px;
 max-width:min(92vw,420px);padding:10px 14px 10px 10px;border-radius:999px;border:1px solid rgba(255,140,140,.9);color:#fff;text-align:left;cursor:pointer;
 background:linear-gradient(135deg,#e5383b,#b5179e);box-shadow:0 0 0 4px rgba(229,56,59,.25),0 10px 30px rgba(229,56,59,.45)}
#lrBub .lri{font-size:22px;flex:0 0 auto}#lrBub .lrt{min-width:0;display:flex;flex-direction:column}
#lrBub .lrt b{font-size:14px;line-height:1.2}#lrBub .lrt small{font-size:12px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#lrBub .lrn{flex:0 0 auto;min-width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#c1121f;font-weight:800;font-size:13px}
.lrov{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
.lrs{width:min(100%,720px);max-height:92vh;overflow:auto;padding:16px 14px calc(env(safe-area-inset-bottom,0px) + 18px);border-radius:22px 22px 0 0;
 background:linear-gradient(160deg,rgba(30,36,52,.98),rgba(16,20,30,.98));border:1px solid rgba(255,255,255,.16);color:#fff;text-align:left}
[data-theme=light] .lrs{background:#fff;color:#111}
.lrsh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}.lrsh b{font-size:18px}
.lrx{width:40px;height:40px;border-radius:50%;flex:0 0 auto;padding:0}
.lrc{margin:12px 0;padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05)}
.lrc.lr-pomoc{border-color:rgba(255,110,110,.7);background:rgba(229,56,59,.1)}
.lrh{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.lrnote{margin:8px 0;padding:8px 10px;border-radius:10px;background:rgba(255,193,99,.14);font-size:14px}
.lrb{white-space:pre-wrap;word-break:break-word;font:inherit;font-size:13.5px;margin:6px 0;max-height:300px;overflow:auto}
.lrl{display:block;margin-top:8px;font-size:13px}.lrl textarea{width:100%;box-sizing:border-box;margin-top:4px;font:inherit;font-size:14px}
.lrsub{margin:16px 0 4px;font-size:15px;cursor:pointer}.lrok{display:inline-grid;place-items:center;width:24px;height:24px;margin-right:6px;border-radius:50%;background:#39ff14;color:#04210a;font-style:normal;font-weight:900;font-size:15px;box-shadow:0 0 10px #39ff14,0 0 22px rgba(57,255,20,.7);vertical-align:-5px}.lrpop{border-radius:22px}.lrpi{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid rgba(255,255,255,.1)}.lrpi span{display:grid;min-width:0}.lrpi small{opacity:.75;overflow-wrap:anywhere}.lrpi button{flex:0 0 auto}#lrPop{align-items:center;padding:16px}.lrto{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;font-size:13px;min-width:0}.lrto span{min-width:0;overflow-wrap:anywhere}.lrmini{width:36px;height:36px;padding:0;border-radius:50%;flex:0 0 auto}.lrask{margin-top:8px}.lrask summary{cursor:pointer;font-weight:700}
#lrHome{margin:10px 0}.lrhi{margin-top:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,214,102,.45);background:rgba(255,214,102,.08);font-size:13.5px;line-height:1.45;text-align:left}.lrhi small{opacity:.7}.lrrec,.lrinfo,.lrmod{margin:8px 0;padding:8px 10px;border-radius:10px;font-size:14px;line-height:1.45;display:grid;gap:3px;overflow-wrap:anywhere}.lrrec{background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.5)}.lrinfo{background:rgba(255,214,102,.1);border:1px solid rgba(255,214,102,.45)}.lrmod{background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.45)}.lrmo{display:flex;align-items:center;justify-content:space-between;gap:8px}.lrmo span{min-width:0}.lrhome{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px;border-radius:16px;flex-wrap:wrap}.lrhome span{font-size:22px}.lrhome small{opacity:.8}.lrhome.on{border-color:rgba(255,193,99,.8)!important;background:rgba(255,193,99,.14)!important}.lrw{color:#ffc163}
`;document.head.appendChild(st);
})();
