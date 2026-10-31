// ===== 🧭 ERNTE AI – DOHĽAD NAD TÍMOM · 💬 BUBLINA PRE ZAMESTNANCOV · 🤝 OBCHODNÉ NÁVRHY AI =====
// Databáza (timai.sql): team_ai_run každé ráno → bubliny (team_nudge) + report pre Martina (team_report);
// sales_ai_run Po/St/Pi → firmy v CZ/AT/HU/PL/UA s e-mailom po slovensky (kontrola) a v jazyku krajiny (odošle sa po ✅).
//  • Zamestnanec: bublina dole, zavrie ju ✕ (team_nudge_close).
//  • Martin: v Tíme karta „🧭 Report tímu od ERNTE AI“ + tlačidlo Skontrolovať teraz.
//  • Ličko (kľúč „leads“) a majiteľ: v Obchodoch karta „🤝 Obchodné návrhy AI“ – čítať, upraviť (AI preloží), odoslať, zamietnuť.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>typeof toast==="function"?toast(t,ms||4000):alert(t);
const IN=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined";
const RO=()=>!!(window.ERNTE_VIEWAS||window.ERNTE_TEST);
const STF=()=>IN()&&ROLE!=="owner"&&!RO();
const MAIN=()=>IN()&&typeof MAIN_OK==="function"&&MAIN_OK();
const LEADS=()=>IN()&&!RO()&&(ROLE==="owner"||(typeof can==="function"&&can("leads")));
const md=t=>E(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>");
const dt=a=>{try{const d=new Date(a);return d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}catch(x){return ""}};
const FL={CZ:"🇨🇿",AT:"🇦🇹",HU:"🇭🇺",PL:"🇵🇱",UA:"🇺🇦",SK:"🇸🇰",DE:"🇩🇪",RO:"🇷🇴"};
const LN={cs:"po česky",de:"po nemecky",hu:"po maďarsky",pl:"po poľsky",uk:"po ukrajinsky",sk:"po slovensky",en:"po anglicky",ro:"po rumunsky"};
const KD={pochvala:["👏","Pochvala"],motiv:["💪","Povzbudenie"],upozornenie:["🔔","Pripomienka"]};
const D={nud:null,nAt:0,rep:null,rAt:0,ld:null,lAt:0,ed:{},sure:0,busy:{}};

// ---------- 💬 bublina pre zamestnanca ----------
async function loadNud(){if(!STF()||D.busy.n)return;D.busy.n=1;try{const r=await sb.rpc("team_nudge_my");D.nud=r.error?[]:(r.data||[]);D.nAt=Date.now()}catch(x){D.nud=D.nud||[]}finally{D.busy.n=0}paintNud()}
function paintNud(){let el=document.getElementById("tnBub");const x=STF()&&D.nud&&D.nud[0];
  if(!x){if(el)el.remove();return}
  const k=KD[x.kind]||KD.motiv,h=`<div class="tnin"><div class="tnh"><span>${k[0]} ERNTE AI · ${E(k[1])}</span><button type="button" class="tnx" data-tnx="${E(x.id)}" aria-label="Zavrieť">✕</button></div><div class="tnt">${E(x.text)}</div></div>`;
  if(!el){el=document.createElement("div");el.id="tnBub";el.className="tnbub "+E(x.kind);el.setAttribute("role","status");document.body.appendChild(el)}
  if(el.dataset.id!==String(x.id)){el.dataset.id=String(x.id);el.className="tnbub "+E(x.kind);el.innerHTML=h}
  // nad spodnou lištou záložiek (na mobile je pripnutá dole)
  let off=0;try{const n=document.querySelector("#app nav.tabs");if(n){const r=n.getBoundingClientRect();if(getComputedStyle(n).position==="fixed"&&r.bottom>=innerHeight-2)off=Math.round(r.height)}}catch(e){}
  el.style.bottom=off?(off+12)+"px":"calc(16px + env(safe-area-inset-bottom,0px))"}

// ---------- 🧭 report pre Martina (záložka Tím) ----------
async function loadRep(){if(!MAIN()||D.busy.r)return;D.busy.r=1;try{const r=await sb.rpc("team_report_list");D.rep=r.error?{L:[],nudges:[],err:r.error.message}:(r.data||{L:[],nudges:[]});D.rAt=Date.now()}catch(x){D.rep=D.rep||{L:[],nudges:[]}}finally{D.busy.r=0}paint()}
function repHtml(){const R=D.rep;if(!R)return `<div class="card tacard" id="taCard"><h2>🧭 Report tímu od ERNTE AI</h2><div class="s">Načítavam…</div></div>`;
  const L=R.L||[],a=L[0],st=R.state||{},run=st.at&&!st.done;
  const nd=(R.nudges||[]).map(n=>{const k=KD[n.kind]||KD.motiv;return `<div class="tanr ${E(n.kind)}"><div class="tanh"><b>${E(n.name)}</b>${n.score!=null?`<span class="tasc">${E(n.score)}/100</span>`:""}<small>${k[0]} ${E(k[1])}${n.closed?" · ✓ prečítal":""}</small></div><div class="tant">${E(n.text)}</div></div>`}).join("");
  return `<div class="card tacard" id="taCard"><h2>🧭 Report tímu od ERNTE AI</h2>
   ${a?`<div class="tadt">${E(dt(a.at))}</div><div class="tabody">${md(a.body)}</div>`:`<div class="s">Prvý report príde v najbližších minútach, potom každý pracovný deň ráno o 6:35.</div>`}
   ${nd?`<details class="tadet"${a&&!a.read?" open":""}><summary>💬 Bubliny, ktoré dostal tím (${(R.nudges||[]).length})</summary>${nd}</details>`:""}
   ${L.length>1?`<details class="tadet"><summary>🗂 Staršie reporty (${L.length-1})</summary>${L.slice(1).map(x=>`<div class="taold"><div class="tadt">${E(dt(x.at))}</div><div class="tabody">${md(x.body)}</div></div>`).join("")}</details>`:""}
   ${st.err&&st.done?`<div class="s taerr">Posledná kontrola sa nepodarila: ${E(String(st.err).slice(0,140))}</div>`:""}
   <div class="btns"><button type="button" class="lime" data-tanow ${run?"disabled":""}>${run?"⏳ AI práve kontroluje tím…":"↻ Skontrolovať tím teraz"}</button></div></div>`}

// ---------- 🤝 obchodné návrhy (záložka Obchody) ----------
async function loadLd(){if(!LEADS()||D.busy.l)return;D.busy.l=1;try{const r=await sb.rpc("sales_leads_list");D.ld=r.error?{L:[],err:r.error.message}:(r.data||{L:[]});D.lAt=Date.now()}catch(x){D.ld=D.ld||{L:[]}}finally{D.busy.l=0}paint()}
const OPEN=x=>["navrh","preklad","posiela","chyba"].includes(x.status);
function lead(x){const ed=D.ed[x.id],ln=LN[x.lang]||("v jazyku "+(x.lang||"krajiny"));
  const badge=x.kind==="dopyt"?`<span class="ldk dop">🛒 Dopyt – nakúpiť</span>`:`<span class="ldk pon">📦 Ponuka – predať</span>`;
  const st=x.status==="preklad"?`<div class="ldst">⏳ AI prekladá upravený text ${E(ln)}…</div>`:x.status==="posiela"?`<div class="ldst">📤 Odosiela sa…</div>`:x.status==="chyba"?`<div class="ldst er">⚠️ ${E(x.err||"Neodoslané")}</div>`:x.err?`<div class="ldst er">⚠️ ${E(x.err)}</div>`:"";
  const head=`<div class="ldh"><span class="ldf">${FL[x.country]||"🌍"}</span><div class="ldn"><b>${E(x.company)}</b><small>${E([x.city,x.com].filter(Boolean).join(" · "))}</small></div></div>
   <div class="ldm">${badge}${x.web?`<a href="${E(/^https?:/i.test(x.web)?x.web:"https://"+x.web)}" target="_blank" rel="noopener">🌐 web</a>`:""}${x.phone?`<span>📞 ${E(x.phone)}</span>`:""}</div>
   ${x.why?`<div class="ldw">💡 ${E(x.why)}</div>`:""}`;
  if(ed)return `<div class="ldr" data-lid="${E(x.id)}">${head}
    <label class="ldl">E-mail firmy<input type="email" inputmode="email" autocomplete="off" data-lde="email" value="${E(ed.email)}"></label>
    <label class="ldl">Predmet (po slovensky)<input type="text" data-lde="subj" value="${E(ed.subj)}"></label>
    <label class="ldl">Text (po slovensky)<textarea rows="10" data-lde="body">${E(ed.body)}</textarea></label>
    <div class="s">Po uložení AI text znova preloží ${E(ln)}. Potom ho odošleš.</div>
    <div class="btns"><button type="button" class="lime" data-ldsave="${E(x.id)}">💾 Uložiť a preložiť</button><button type="button" class="ghost" data-ldcancel="${E(x.id)}">Zrušiť úpravu</button></div></div>`;
  const can=x.status==="navrh"||x.status==="chyba",sure=D.sure===x.id;
  return `<div class="ldr" data-lid="${E(x.id)}">${head}
   <div class="ldto">✉️ Komu: <b>${x.email?E(x.email):"— chýba e-mail, doplň v úprave"}</b><small>odpovede prídu na ${E((D.ld&&D.ld.reply_to)||"ernte@ernte.sk")}</small></div>
   <div class="ldsub">📝 ${E(x.subj_sk||"")}</div><div class="ldb">${E(x.body_sk||"")}</div>
   <details class="ldloc"><summary>${FL[x.country]||"🌍"} Text, ktorý odíde ${E(ln)}</summary><div class="ldsub">${E(x.subj_loc||"")}</div><div class="ldb">${E(x.body_loc||"")}</div></details>
   ${st}
   ${can?`<div class="btns"><button type="button" class="${sure?"warn":"lime"}" data-ldsend="${E(x.id)}" ${x.email?"":"disabled"}>${sure?"Naozaj odoslať? Ťukni znova":"✅ Skontrolované – odoslať "+E(ln)}</button>
     <button type="button" class="ghost" data-lded="${E(x.id)}">✏️ Upraviť</button><button type="button" class="ghost" data-ldrej="${E(x.id)}">🚫 Zamietnuť</button></div>`:""}</div>`}
function ldHtml(){const R=D.ld;if(!R)return `<div class="card ldcard" id="ldCard"><h2>🤝 Obchodné návrhy AI</h2><div class="s">Načítavam…</div></div>`;
  const L=R.L||[],O=L.filter(OPEN),H=L.filter(x=>!OPEN(x)),st=R.state||{},run=st.at&&!st.done;
  const hist=H.map(x=>`<div class="ldhi"><span>${FL[x.country]||"🌍"}</span><b>${E(x.company)}</b><small>${x.status==="odoslany"?"✅ odoslané":"🚫 zamietnuté"} ${E(dt(x.decided_at||x.created_at))}</small></div>`).join("");
  return `<div class="card ldcard" id="ldCard"><h2>🤝 Obchodné návrhy AI${O.length?` · <span class="cnt">${O.length} čaká</span>`:""}</h2>
   ${O.length?O.map(lead).join(""):`<div class="s">${run?"⏳ AI práve hľadá firmy a píše e-maily (pár minút)…":"Žiadny návrh nečaká. Nové pripraví AI v pondelok, stredu a piatok ráno."}</div>`}
   ${st.err&&st.done&&!O.length?`<div class="s taerr">Posledné hľadanie sa nepodarilo: ${E(String(st.err).slice(0,140))}</div>`:""}
   ${hist?`<details class="tadet"><summary>🗂 Odoslané a zamietnuté (${H.length})</summary>${hist}</details>`:""}
   <div class="btns"><button type="button" class="ghost" data-ldnow ${run?"disabled":""}>🔎 Nájsť nové firmy teraz</button></div></div>`}

// ---------- vloženie kariet ----------
function put(id,h){const app=document.getElementById("app");if(!app)return;const old=document.getElementById(id);
  if(!h){if(old)old.remove();return}
  if(old&&old.contains(document.activeElement)&&/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName))return; // nepíš cez rozpísaný text
  let hs=0;for(let i=0;i<h.length;i++)hs=(hs*31+h.charCodeAt(i))|0;hs=String(hs);
  if(old&&old.dataset.h===hs)return; // bez zmeny (popis z fndesc.js vnútri karty nevadí)
  const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.dataset.h=hs;
  if(old){old.replaceWith(el);return}
  const a=app.querySelector("nav.tabs")||app.querySelector(".hero");
  if(a){let b=a;const n=a.nextElementSibling;if(n&&(n.id==="dropCard"||n.classList.contains("iapp")))b=n;b.after(el)}else app.prepend(el)}
function paint(){if(typeof TAB==="undefined")return;
  put("taCard",MAIN()&&TAB==="team"?repHtml():"");
  put("ldCard",LEADS()&&TAB==="deals"?ldHtml():"")}

// ---------- tlačidlá ----------
function edOf(el){const r=el.closest("[data-lid]");return r?D.ed[r.dataset.lid]:null}
document.addEventListener("input",e=>{const t=e.target;if(!t.dataset||!t.dataset.lde)return;const ed=edOf(t);if(ed)ed[t.dataset.lde]=t.value},true);
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-tnx],[data-tanow],[data-ldsend],[data-lded],[data-ldcancel],[data-ldsave],[data-ldrej],[data-ldnow]");if(!b)return;
  e.preventDefault();e.stopPropagation();const ds=b.dataset;
  if(ds.tnx){const el=document.getElementById("tnBub");if(el){el.classList.add("out");setTimeout(()=>el.remove(),220)}D.nud=(D.nud||[]).filter(x=>String(x.id)!==ds.tnx);
    try{await sb.rpc("team_nudge_close",{p_id:+ds.tnx})}catch(x){}setTimeout(paintNud,260);return}
  if(RO()){tst("Iba na čítanie.");return}
  if("tanow" in ds){b.disabled=true;const r=await sb.rpc("team_ai_now");if(r.error){b.disabled=false;tst("Nepodarilo sa: "+r.error.message,6000);return}
    tst(r.data==="čerstvé"?"Tím bol skontrolovaný pred chvíľou – report je hore.":r.data==="chýba kľúč"?"Chýba kľúč ERNTE AI (Podpora → nastavenie).":"⏳ AI kontroluje tím – report príde o pár minút.",5000);D.rAt=0;loadRep();return}
  if("ldnow" in ds){b.disabled=true;const r=await sb.rpc("sales_ai_now");if(r.error){b.disabled=false;tst("Nepodarilo sa: "+r.error.message,6000);return}
    tst(r.data==="čerstvé"?"AI hľadala firmy pred menej ako 2 hodinami – skús neskôr.":r.data==="chýba kľúč"?"Chýba kľúč ERNTE AI.":"🔎 AI hľadá firmy a píše e-maily – o pár minút sú tu.",5000);D.lAt=0;loadLd();return}
  const L=(D.ld&&D.ld.L)||[],x=L.find(z=>String(z.id)===String(ds.ldsend||ds.lded||ds.ldcancel||ds.ldsave||ds.ldrej));if(!x)return;
  if(ds.lded){D.ed[x.id]={email:x.email||"",subj:x.subj_sk||"",body:x.body_sk||""};paint();return}
  if(ds.ldcancel){delete D.ed[x.id];paint();return}
  if(ds.ldsave){const ed=D.ed[x.id];b.disabled=true;const r=await sb.rpc("sales_lead_save",{p_id:x.id,p_subj:ed.subj,p_body:ed.body,p_email:ed.email});
    if(r.error){b.disabled=false;tst("Nepodarilo sa: "+r.error.message,6000);return}delete D.ed[x.id];tst(r.data==="preklad"?"💾 Uložené – AI prekladá (do minúty).":"💾 Uložené.",4000);loadLd();return}
  if(ds.ldrej){b.disabled=true;const r=await sb.rpc("sales_lead_reject",{p_id:x.id});if(r.error){b.disabled=false;tst("Nepodarilo sa: "+r.error.message,6000);return}tst("🚫 Zamietnuté.",3000);loadLd();return}
  if(ds.ldsend){if(D.sure!==x.id){D.sure=x.id;paint();setTimeout(()=>{if(D.sure===x.id){D.sure=0;paint()}},5000);return}
    D.sure=0;b.disabled=true;const r=await sb.rpc("sales_lead_send",{p_id:x.id});if(r.error){b.disabled=false;paint();tst("Neodoslané: "+r.error.message,7000);return}
    tst("📤 E-mail odchádza "+(LN[x.lang]||"")+" na "+x.email+".",5000);loadLd()}
},true);

// ---------- štýl ----------
{const s=document.createElement("style");s.textContent=`
.tnbub{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9000;width:min(440px,calc(100vw - 20px));box-sizing:border-box;
 border-radius:20px;padding:12px 12px 14px 16px;background:linear-gradient(160deg,rgba(30,38,52,.97),rgba(12,16,24,.98));color:#eef2f7;border:1px solid rgba(182,255,59,.45);
 box-shadow:0 14px 40px -10px rgba(0,0,0,.7),0 0 0 1px rgba(182,255,59,.15);animation:tnin .35s ease-out}
.tnbub.motiv{border-color:rgba(34,211,238,.5)}.tnbub.upozornenie{border-color:rgba(245,158,11,.6)}
.tnbub.out{opacity:0;transform:translateX(-50%) translateY(14px);transition:.2s}
@keyframes tnin{from{opacity:0;transform:translateX(-50%) translateY(18px)}}@media (prefers-reduced-motion:reduce){.tnbub{animation:none}}
.tnh{display:flex;align-items:center;justify-content:space-between;gap:10px;font:700 .78rem/1.2 system-ui;letter-spacing:.02em;color:#b6ff3b;text-transform:uppercase}
.tnbub.motiv .tnh{color:#67e8f9}.tnbub.upozornenie .tnh{color:#fbbf24}
.tnh span{min-width:0;overflow-wrap:anywhere}
.tnx{flex:0 0 auto;width:40px;height:40px;min-height:40px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font:700 1rem/1 system-ui;display:flex;align-items:center;justify-content:center}
.tnt{margin-top:4px;font-size:1rem;line-height:1.45;overflow-wrap:anywhere}
.tacard,.ldcard{text-align:left}.tacard h2,.ldcard h2{text-align:center}
.tadt{font-size:.78rem;opacity:.6;margin:2px 0 6px;text-align:center}
.tabody{line-height:1.55;overflow-wrap:anywhere;font-size:.95rem}.tabody b{color:#b6ff3b}
.tadet{margin-top:10px;border-top:1px solid rgba(255,255,255,.1);padding-top:8px}.tadet summary{cursor:pointer;font-weight:700;min-height:40px;display:flex;align-items:center}
.tanr{padding:8px 0;border-top:1px solid rgba(255,255,255,.07)}.tanh{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}.tanh small{opacity:.65;flex-basis:100%}
.tasc{font:800 .8rem system-ui;padding:2px 8px;border-radius:10px;background:rgba(182,255,59,.15);color:#b6ff3b}.tanr.motiv .tasc{background:rgba(34,211,238,.15);color:#67e8f9}.tanr.upozornenie .tasc{background:rgba(245,158,11,.18);color:#fbbf24}
.tant{opacity:.9;overflow-wrap:anywhere;margin-top:2px}.taold{padding:8px 0;border-top:1px solid rgba(255,255,255,.07)}.taerr{color:#fca5a5}
.tacard .btns,.ldcard .btns{justify-content:center;flex-wrap:wrap}
.ldcard h2 .cnt{color:#fbbf24}
.ldr{border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:12px;margin:10px 0;background:rgba(255,255,255,.03);min-width:0}
.ldh{display:flex;gap:10px;align-items:center;min-width:0}.ldf{font-size:1.7rem;flex:0 0 auto}.ldn{display:grid;min-width:0}.ldn b{font-size:1.05rem;overflow-wrap:anywhere}.ldn small{opacity:.7;overflow-wrap:anywhere}
.ldm{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin:8px 0 4px;font-size:.88rem}.ldm a{color:#b6ff3b}
.ldk{padding:3px 9px;border-radius:10px;font-weight:700;font-size:.8rem}.ldk.pon{background:rgba(182,255,59,.14);color:#b6ff3b}.ldk.dop{background:rgba(34,211,238,.14);color:#67e8f9}
.ldw{font-size:.9rem;opacity:.9;margin:4px 0 8px;overflow-wrap:anywhere}
.ldto{display:grid;gap:2px;font-size:.9rem;margin:6px 0;overflow-wrap:anywhere}.ldto small{opacity:.6}
.ldsub{font-weight:700;margin:8px 0 4px;overflow-wrap:anywhere}
.ldb{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.92rem;line-height:1.5;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.07)}
.ldloc{margin-top:8px}.ldloc summary{cursor:pointer;font-weight:700;min-height:40px;display:flex;align-items:center}
.ldst{margin-top:8px;font-weight:600;color:#67e8f9}.ldst.er{color:#fca5a5}
.ldl{display:grid;gap:4px;margin:8px 0;font-size:.85rem;opacity:.95}.ldl input,.ldl textarea{width:100%;box-sizing:border-box;font:500 .95rem/1.45 system-ui;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:10px}
.ldl input{min-height:46px}
.ldr .btns button{min-height:44px;white-space:normal}
.ldhi{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;padding:6px 0;border-top:1px solid rgba(255,255,255,.07)}.ldhi b{overflow-wrap:anywhere;min-width:0}.ldhi small{opacity:.65}
button.warn{background:linear-gradient(135deg,#f59e0b,#ef4444)!important;color:#fff!important}`;document.head.appendChild(s)}

// ---------- spúšťanie ----------
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;if(!IN())return;
  if(STF()&&(!D.nAt||Date.now()-D.nAt>300e3))loadNud();
  if(MAIN()&&TAB==="team"&&(!D.rAt||Date.now()-D.rAt>120e3))loadRep();
  if(LEADS()&&TAB==="deals"&&(!D.lAt||Date.now()-D.lAt>120e3))loadLd();
  paint();if(STF()&&D.nud)paintNud()})};
function hashGo(){const h=(location.hash||"").replace("#","");if(!IN()||!/^(timai|leads)$/.test(h)||typeof renderStaff!=="function")return false;
  const t=h==="timai"?"team":"deals";if((t==="team"&&!MAIN())||(t==="deals"&&!LEADS()))return false;
  try{TAB=t;renderStaff();history.replaceState(null,"",location.pathname+location.search)}catch(x){}return true}
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}
  new MutationObserver(sch).observe(app,{childList:true});sch();
  let hg=0;const hgT=setInterval(()=>{if(hashGo()||++hg>40)clearInterval(hgT)},500);
  window.addEventListener("hashchange",hashGo);
  setInterval(()=>{if(document.hidden||!IN())return;
    const busy=D.ld&&(D.ld.L||[]).some(x=>x.status==="preklad"||x.status==="posiela")||(D.ld&&D.ld.state&&D.ld.state.at&&!D.ld.state.done);
    const rbusy=D.rep&&D.rep.state&&D.rep.state.at&&!D.rep.state.done;
    if(STF()&&Date.now()-D.nAt>300e3)loadNud();
    if(MAIN()&&TAB==="team"&&(rbusy||Date.now()-D.rAt>120e3))loadRep();
    if(LEADS()&&TAB==="deals"&&(busy||Date.now()-D.lAt>120e3))loadLd()},20e3);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&STF())loadNud()})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
