/* ===== 📬 POŠTA – PRIEČINKY + ✉️ PRIPRAVENÝ E-MAIL (7. 11. 06:29 PRÍKAZ MAJITEĽA, iba Martin – MAIN_OK) =====
   „Obchodné návrhy AI – mail máš zakázaný odosielať, priprav mi ho na odoslanie, odosielateľ ernte@ernte.sk, príjemca automaticky podľa toho komu ide,
   ja si ho prečítam a stlačím odoslať … sprav mi to do app prijaté a odoslané a ukladaj všetky, čo posielame – VALKO, DANUBE, ERNTE – priečinky.“
   • window.ernteCompose(o) – okno „✉️ Pripravené na odoslanie“: Od / Komu / Predmet / Text (dá sa upraviť), 📋 pri každom poli, ✉️ Otvoriť v pošte
     (mailto – v pošte vyber účet ernte@ernte.sk), ✔️ Odoslal som → o.onSent(text) alebo zápis do Odoslaných (mail_box_add). Aplikácia sama nič neodošle.
   • window.ernteMailbox() / #schranka – priečinky 📥 Prijaté · 📤 Odoslané × ERNTE / VALKO / DANUBE (mail_box_list).
   • window.ernteMailLog(o) – uloží odoslaný / zdieľaný e-mail do Odoslaných (pdfview, týždenné súhrny …). Prefix tried mbx. */
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MAIN=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK()&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST&&typeof sb!=="undefined";
const say=(m,ms)=>{if(window.toast)toast(m,ms||4000)};
const FIRMA={ernte:"ERNTE",valko:"VALKO",danube:"DANUBE"};
const PROF={ernte:"ernte",ponuky:"ernte",valko:"valko",danube:"danube"};
const dT=v=>{try{return new Date(v).toLocaleString("sk-SK",{day:"numeric",month:"numeric",year:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(x){return ""}};
async function copy(t){try{await navigator.clipboard.writeText(t);return true}catch(x){const a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand("copy")}catch(y){}a.remove();return ok}}

// ---------- uloženie do Odoslaných ----------
window.ernteMailLog=async function(o){if(!MAIN()||!o)return null;try{const p=Object.assign({smer:"odoslane"},o);if(p.prof&&!p.firma)p.firma=PROF[p.prof]||"ernte";delete p.prof;
  const r=await sb.rpc("mail_box_add",{p});return r.error?null:r.data}catch(x){return null}};

// ---------- ✉️ pripravený e-mail ----------
let C=null;
function shut(){const o=document.getElementById("mbxSheet");if(o)o.remove();C=null}
window.ernteCompose=function(o){if(!o)return;C=Object.assign({od:"ernte@ernte.sk",firma:"ernte"},o);shut();C=Object.assign({od:"ernte@ernte.sk",firma:"ernte"},o);
  const el=document.createElement("div");el.id="mbxSheet";el.className="mbxov";el.addEventListener("click",ev=>{if(ev.target===el)shut()});
  el.innerHTML=`<div class="mbxs" role="dialog" aria-label="Pripravený e-mail"><div class="mbxh"><b>✉️ Pripravené na odoslanie</b><button type="button" class="mbxx" data-mbxx aria-label="Zavrieť">✕</button></div>
   <div class="mbxn">📵 Aplikácia sama nič neodošle. Prečítaj, prípadne uprav, ťukni <b>✉️ Otvoriť v pošte</b> (vyber účet <b>${E(C.od)}</b>) a odošli. Potom ťukni <b>✔️ Odoslal som</b> – e-mail sa uloží do 📤 Odoslaných (${E(FIRMA[C.firma]||"ERNTE")}).</div>
   ${row("Od","od",C.od,true)}${row("Komu","komu",C.komu)}${row("Predmet","predmet",C.predmet)}
   <label class="mbxl"><span>Text <button type="button" class="mbxc" data-mbxcp="text">📋</button></span><textarea id="mbxText" rows="12">${E(C.text||"")}</textarea></label>
   ${C.prilohy&&C.prilohy.length?`<div class="mbxn">📎 ${E(C.prilohy.join(", "))}</div>`:""}
   <div class="mbxb"><button type="button" class="pri" data-mbxmail>✉️ Otvoriť v pošte</button><button type="button" data-mbxcp="all">📋 Kopírovať všetko</button>
    <button type="button" class="mbxok" data-mbxsent>✔️ Odoslal som</button><button type="button" data-mbxx>Zrušiť</button></div></div>`;
  document.body.appendChild(el);
  function row(l,k,v,ro){return `<label class="mbxl"><span>${l} <button type="button" class="mbxc" data-mbxcp="${k}">📋</button></span><input id="mbx_${k}" value="${E(v||"")}"${ro?" readonly":""} autocapitalize="off"></label>`}};
const val=k=>{const e=document.getElementById(k==="text"?"mbxText":"mbx_"+k);return e?e.value:""};

// ---------- 📬 priečinky ----------
const B={smer:"odoslane",firma:"",D:null,busy:false,open:-1};
async function loadBox(){if(B.busy)return;B.busy=true;paintBox();try{const r=await sb.rpc("mail_box_list",{p_smer:null,p_firma:null,p_days:365});B.D=r.error?{err:r.error.message}:(r.data||{})}catch(x){B.D={err:String(x&&x.message||x)}}B.busy=false;paintBox()}
function paintBox(){const o=document.getElementById("mbxBox");if(!o)return;const D=B.D||{},I=(D.items||[]),cnt=D.counts||{};
  const n=(f,s)=>Object.keys(cnt).filter(k=>(!f||k.startsWith(f+":"))&&k.endsWith(":"+s)).reduce((a,k)=>a+cnt[k],0);
  const L=I.filter(x=>x.smer===B.smer&&(!B.firma||x.firma===B.firma));
  const chip=(k,v,t,on)=>`<button type="button" class="mbxch" data-${k}="${v}" aria-pressed="${on}">${t}</button>`;
  const none=B.smer==="prijate"&&(B.firma==="valko"||B.firma==="danube")?`<div class="mbxn">📭 Schránka ${FIRMA[B.firma]} ešte nie je pripojená do aplikácie – prijaté e-maily ${FIRMA[B.firma]} sa sem zatiaľ nedostávajú. Pripojí sa rovnako ako erntespol (Gmail skript) alebo cez Microsoft 365 – stačí povedať.</div>`:"";
  o.querySelector(".mbxin").innerHTML=`<div class="mbxchips">${chip("mbxsm","prijate",`📥 Prijaté (${n(B.firma,"prijate")})`,B.smer==="prijate")}${chip("mbxsm","odoslane",`📤 Odoslané (${n(B.firma,"odoslane")})`,B.smer==="odoslane")}</div>
   <div class="mbxchips">${chip("mbxfi","","Všetko",!B.firma)}${["ernte","valko","danube"].map(f=>chip("mbxfi",f,`${FIRMA[f]} · ${n(f,B.smer)}`,B.firma===f)).join("")}</div>
   ${D.err?`<div class="mbxn">⚠️ ${E(D.err)}</div>`:""}${B.busy&&!B.D?`<div class="mbxn">Načítavam…</div>`:""}${none}
   ${L.length?L.map((x,i)=>`<div class="mbxm${B.open===x.k?" on":""}"><button type="button" class="mbxmh" data-mbxop="${E(x.k)}"><span class="mbxf">${E(FIRMA[x.firma]||x.firma)}</span><b>${E(x.predmet||"(bez predmetu)")}</b><small>${x.smer==="prijate"?"od "+E(x.od||""):"pre "+E(x.komu||"")} · ${E(dT(x.at))}${x.stav==="zdielane"?" · 📤 zdieľané z telefónu":x.stav==="otvorene"?" · otvorené v pošte":""}${x.prilohy&&x.prilohy.length?" · 📎 "+E(x.prilohy.join(", ")):""}</small></button>
     ${B.open===x.k?`<div class="mbxmb"><div class="mbxmeta">Od: ${E(x.od||"")}<br>Komu: ${E(x.komu||"")}</div><pre>${E(x.text||"")}</pre><div class="mbxb"><button type="button" data-mbxcpm="${E(x.k)}">📋 Kopírovať text</button></div></div>`:""}</div>`).join("")
     :(none||B.busy?"":`<div class="mbxn">Prázdne.</div>`)}`}
/* 7. 11.: priečinky sú v tej istej Pošte (záložka 📂) – žiadne druhé okno */
window.ernteMailboxLoad=function(fresh){paintBox();if(fresh||!B.D)loadBox()};
window.ernteMailbox=function(){if(!MAIN())return;if(window.leadReplies){window.leadReplies("a");return}let o=document.getElementById("mbxBox");if(o)o.remove();o=document.createElement("div");o.id="mbxBox";o.className="mbxov";
  o.addEventListener("click",ev=>{if(ev.target===o)o.remove()});
  o.innerHTML=`<div class="mbxs" role="dialog" aria-label="Pošta – priečinky"><div class="mbxh"><b>📬 Pošta – prijaté a odoslané</b><button type="button" class="mbxx" data-mbxbx aria-label="Zavrieť">✕</button></div>
   <div class="mbxn">Všetko, čo sme poslali alebo prijali – podľa firmy ERNTE, VALKO, DANUBE. Odoslané = e-maily pripravené v aplikácii (✔️ Odoslal som), zdieľané dokumenty a staršie e-maily z aplikácie.</div><div class="mbxin"></div></div>`;
  document.body.appendChild(o);paintBox();loadBox()};

document.addEventListener("click",async ev=>{const t=ev.target.closest&&ev.target.closest("[data-mbxx],[data-mbxcp],[data-mbxmail],[data-mbxsent],[data-mbxbx],[data-mbxsm],[data-mbxfi],[data-mbxop],[data-mbxcpm],[data-mbxopen]");if(!t)return;
  if(t.dataset.mbxopen!=null){ev.preventDefault();window.ernteMailbox();return}
  if(t.dataset.mbxx!=null){shut();return}
  if(t.dataset.mbxbx!=null){const o=document.getElementById("mbxBox");if(o)o.remove();return}
  if(t.dataset.mbxsm!=null){B.smer=t.dataset.mbxsm;B.open=-1;paintBox();return}
  if(t.dataset.mbxfi!=null){B.firma=t.dataset.mbxfi;B.open=-1;paintBox();return}
  if(t.dataset.mbxop!=null){B.open=B.open===t.dataset.mbxop?-1:t.dataset.mbxop;paintBox();return}
  if(t.dataset.mbxcpm!=null){const x=((B.D&&B.D.items)||[]).find(y=>y.k===t.dataset.mbxcpm);if(x)say(await copy(x.text||"")?"📋 Skopírované":"⚠️ Nepodarilo sa skopírovať");return}
  if(!C)return;
  if(t.dataset.mbxcp!=null){const k=t.dataset.mbxcp,v=k==="all"?`Komu: ${val("komu")}\nPredmet: ${val("predmet")}\n\n${val("text")}`:val(k);say(await copy(v)?"📋 Skopírované":"⚠️ Nepodarilo sa skopírovať – označ text ručne");return}
  if(t.dataset.mbxmail!=null){const to=val("komu").trim();if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(to)){say("Skontroluj adresu príjemcu.");return}
    copy(val("text"));location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(val("predmet"))+"&body="+encodeURIComponent(val("text"));
    say(`✉️ Otvára sa pošta – vyber účet ${C.od} a ťukni Odoslať. Text je aj skopírovaný. Potom ťukni ✔️ Odoslal som.`,9000);return}
  if(t.dataset.mbxsent!=null){t.disabled=true;const m={od:val("od"),komu:val("komu").trim(),predmet:val("predmet"),text:val("text")};
    try{if(typeof C.onSent==="function")await C.onSent(m);else await window.ernteMailLog(Object.assign({firma:C.firma,zdroj:C.zdroj||"manual",ref:C.ref||null,prilohy:C.prilohy||null},m));
      say(`✔️ Uložené v 📤 Odoslaných (${FIRMA[C.firma]||"ERNTE"}).`,5000);shut()}
    catch(x){t.disabled=false;say("Nepodarilo sa: "+(x&&x.message||x),7000)}}
});
function hash(){if(/^#schranka$/i.test(location.hash)){let n=0;const go=()=>{if(MAIN())window.ernteMailbox();else if(n++<40)setTimeout(go,500)};go()}}
window.addEventListener("hashchange",hash);hash();

const st=document.createElement("style");st.textContent=`.mbxov{position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}
.mbxs{width:min(680px,100vw);max-height:92vh;overflow:auto;box-sizing:border-box;background:#0B0F19;color:#eef2f7;border:1px solid rgba(34,211,238,.45);border-radius:22px 22px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom,0px))}
.mbxh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}.mbxh b{font-size:1.05rem;min-width:0}
.mbxx{width:44px;height:44px;min-width:44px;border-radius:50%;padding:0;display:grid;place-items:center;flex:none}
.mbxn{font-size:.84rem;color:#94A3B8;margin:6px 0;overflow-wrap:anywhere}.mbxn b{color:#eef2f7}
.mbxl{display:flex;flex-direction:column;gap:4px;margin:8px 0;min-width:0}.mbxl span{display:flex;justify-content:space-between;align-items:center;font-size:.8rem;color:#94A3B8}
.mbxl input,.mbxl textarea{width:100%;box-sizing:border-box;min-height:46px;font:inherit}.mbxl textarea{min-height:220px;line-height:1.4}
.mbxc{min-height:36px;min-width:44px;padding:2px 10px}.mbxb{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.mbxb button{min-height:46px;max-width:100%;white-space:normal}
.mbxok{border-color:#5eead4!important;color:#5eead4}
.mbxchips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.mbxch{min-height:40px;padding:4px 12px;border-radius:999px}.mbxch[aria-pressed="true"]{background:#5eead4!important;color:#05210f!important;border-color:#5eead4!important;font-weight:800}
.mbxm{border-bottom:1px solid rgba(148,163,184,.18)}.mbxmh{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;width:100%;text-align:left;background:none;border:0;padding:10px 2px;color:inherit;min-height:48px}
.mbxmh b{grid-column:2;overflow-wrap:anywhere}.mbxmh small{grid-column:2;color:#94A3B8;font-size:.76rem;overflow-wrap:anywhere}.mbxf{grid-row:1/3;align-self:center;font-size:.7rem;font-weight:800;border:1px solid rgba(34,211,238,.5);border-radius:8px;padding:2px 6px;color:#22d3ee}
.mbxmb{padding:0 2px 12px}.mbxmb pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:.86rem;background:rgba(255,255,255,.04);border-radius:12px;padding:10px;margin:6px 0}.mbxmeta{font-size:.78rem;color:#94A3B8;overflow-wrap:anywhere}`;
document.head.appendChild(st);
})();
