// ===== ERNTE · AKTIVITA FARMÁROV A PARTNEROV TRUSU =====
// Zaznamenáva sa: otvorenie aplikácie, čas v jednotlivých častiach a použité tlačidlá (napr. „Otvoril zmluvu PDF“) – nikdy nie obsah, ktorý píšu.
// Majiteľ: Farmári → 📊 Aktivita farmárov (dnes / 7 / 30 dní).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const Q=[];let on=false,ctx=null,since=0,fT=null;
const dev=()=>{const u=navigator.userAgent;const os=/iPhone|iPad/.test(u)?"iPhone":/Android/.test(u)?"Android":/Windows/.test(u)?"Windows":/Mac/.test(u)?"Mac":"iné";
  const b=/SamsungBrowser/.test(u)?"Samsung Internet":/EdgA?\//.test(u)?"Edge":/CriOS|Chrome\//.test(u)?"Chrome":/Firefox/.test(u)?"Firefox":/Safari/.test(u)?"Safari":"prehliadač";
  return os+" · "+b+(matchMedia("(display-mode: standalone)").matches?" · ikona":"")};
const who=()=>typeof FARMER!=="undefined"&&FARMER?"farmer":document.querySelector(".trtabs")?"partner":null;
function push(r){if(!on)return;Q.push(Object.assign({at:new Date().toISOString()},r));clearTimeout(fT);fT=setTimeout(flush,Q.length>=20?500:15000)}
async function flush(){if(!Q.length)return;const b=Q.splice(0,60);try{const r=await sb.rpc("ext_log",{p:b});if(r.error&&!/ext_log|schema cache/i.test(r.error.message))Q.unshift(...b.slice(-40))}catch(x){Q.unshift(...b.slice(-40))}}
const TL={dod:"Dodávky",acc:"Cena a fakturácia",cen:"Cenník",new:"Nahlásiť vývoz",list:"Moje vývozy"};
function cur(){const w=who();if(w==="farmer")return "Prehľad farmára";if(w==="partner"){const t=document.querySelector(".trtabs [aria-pressed=true]");return "Trus: "+(t&&TL[t.dataset.trtab]||"portál")}return null}
function close(){if(ctx&&since){const s=Math.round((Date.now()-since)/1000);if(s>=3)push({kind:"view",what:ctx,dur_s:Math.min(s,43200)})}since=0}
function mark(){if(!on||document.hidden)return;const c=cur();if(c===ctx&&since)return;close();ctx=c;since=Date.now()}
function start(){if(on||!who())return;on=true;push({kind:"session",what:"otvorenie aplikácie",dev:dev()});mark();
  setInterval(()=>{if(!document.hidden){close();ctx=cur();since=Date.now()}flush()},60000);
  new MutationObserver(()=>{if(on)mark()}).observe(document.getElementById("app"),{childList:true})}
const waitT=setInterval(()=>{if(who()){clearInterval(waitT);start()}},1500);setTimeout(()=>clearInterval(waitT),10*60e3);
document.addEventListener("visibilitychange",()=>{if(!on)return;if(document.hidden){close();flush()}else{since=Date.now();ctx=cur()}});
addEventListener("pagehide",()=>{if(on){close();flush()}});
// tlačidlá → zrozumiteľný názov akcie (bez zadaných údajov)
const dealNo=id=>{try{const d=(STATE.deals||[]).find(x=>x.id===id);return d?" "+d.no:""}catch(x){return ""}};
const A=[["[data-cpdf]",x=>"Otvoril zmluvu PDF"+dealNo(x.dataset.cpdf)],["[data-fsign]",x=>"Otvoril podpis zmluvy"+dealNo(x.dataset.fsign)],["[data-sgsave]",x=>"Podpísal zmluvu"+dealNo(x.dataset.sgsave)],
  ["[data-inread]",()=>"Prečítal správu od ERNTE"],["[data-sell]",x=>x.dataset.sell?"Otvoril predaj: "+((typeof comName==="function"&&comName(x.dataset.sell))||x.dataset.sell):""],["[data-order]",x=>x.dataset.order?"Otvoril objednávku odvozu"+dealNo(x.dataset.order):""],
  ["[data-agree]",x=>"Súhlas so zmluvou"+dealNo(x.dataset.agree)],["[data-zpdf]",()=>"Otvoril zúčtovanie PDF"],["[data-trpdoc]",()=>"Trus: podklad k faktúre PDF"],["[data-trtab]",x=>"Trus: "+(TL[x.dataset.trtab]||x.dataset.trtab)],
  ["[data-trlang]",x=>"Jazyk "+x.dataset.trlang.toUpperCase()],["[data-tredit]",x=>x.dataset.tredit?"Trus: úprava vývozu":""],["[data-trcancel]",()=>"Trus: zrušenie vývozu"],["[data-trpw]",()=>"Zmena hesla"],["#outBtn",()=>"Odhlásenie"]];
document.addEventListener("click",ev=>{if(!on)return;for(const [s,f] of A){const x=ev.target.closest&&ev.target.closest(s);if(x){const w=f(x);if(w)push({kind:"action",what:w});break}}},true);
const FA={fSell:"Odoslal ponuku na predaj",fOrder:"Objednal odvoz",trNew:"Trus: nahlásil vývoz"};
document.addEventListener("submit",ev=>{if(!on)return;const f=ev.target;let w=FA[f.id];if(!w&&f.dataset){if(f.dataset.trw!=null)w="Trus: zadal váženie";else if(f.dataset.trun!=null)w="Trus: miesto vykládky"}if(w)push({kind:"action",what:w})},true);

// ---------- MAJITEĽ: prehľad ----------
let R=null,DAYS=7,FLT="all";
const ago=t=>{if(!t)return "nikdy";const m=Math.round((Date.now()-new Date(t))/6e4);return m<2?"práve teraz":m<60?`pred ${m} min`:m<1440?`pred ${Math.round(m/60)} h`:`pred ${Math.round(m/1440)} d`};
const dt=x=>new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"});
async function load(){R=null;paint();const r=await sb.rpc("ext_activity_report",{p_days:DAYS});R=r.error?{err:r.error.message}:r.data;paint()}
function html(){let h=`<div class="fabox"><div class="fahd"><b>📊 Aktivita farmárov a partnerov</b><button type="button" class="fax" data-faclose aria-label="Zavrieť">✕</button></div>
  <div class="btns seg2">${[[1,"Dnes"],[7,"7 dní"],[30,"30 dní"]].map(x=>`<button type="button" data-fad="${x[0]}" aria-pressed="${DAYS===x[0]}">${x[1]}</button>`).join("")}</div>
  <div class="btns seg2">${[["all","Všetci"],["on","Aktívni"],["off","Neaktívni"]].map(x=>`<button type="button" data-faf="${x[0]}" aria-pressed="${FLT===x[0]}">${x[1]}</button>`).join("")}</div>`;
  if(!R)return h+`<div class="s">Načítavam…</div></div>`;if(R.err)return h+`<div class="s">${/ext_activity/.test(R.err)?"Zapne sa po aktualizácii databázy (pár minút).":e(R.err)}</div></div>`;
  const P=(R.people||[]).filter(p=>FLT==="all"||(FLT==="on"?+p.sessions>0:+p.sessions===0)),act=(R.people||[]).filter(p=>+p.sessions>0).length;
  h+=`<div class="hrk"><div class="ps"><small>Aktívni v období</small><b>${act}</b></div><div><small>Neotvorili aplikáciu</small><b>${(R.people||[]).length-act}</b></div><div><small>Spolu času</small><b>${(R.people||[]).reduce((s,p)=>s+(+p.minutes||0),0)} min</b></div></div>`;
  if(!P.length)return h+`<div class="s">Nikto v tomto zozname.</div></div>`;
  return h+P.map(p=>`<details class="fap${+p.sessions?"":" off"}"><summary><span class="fai">${p.kind==="partner"?"🐔":"👨‍🌾"}</span><span class="fan"><b>${e(p.name)}</b><small>${p.last_at?"naposledy "+ago(p.last_at):p.has_login?"prihlásenie má, ešte neotvoril":"bez prihlásenia"}${+p.sessions?` · ${p.sessions}× · ${p.minutes} min`:""}</small></span></summary>
    ${p.dev?`<div class="s">📱 ${e(p.dev)}</div>`:""}${(p.views||[]).length?`<div class="s">👀 ${p.views.map(v=>`${e(v.what)} ${v.min} min`).join(" · ")}</div>`:""}
    ${(p.actions||[]).length?`<ul class="faa">${p.actions.map(a=>`<li><b>${e(dt(a.at))}</b> ${e(a.what)}${p.kind==="partner"&&a.who?` <small>${e(String(a.who).replace("@tel.ernte.sk",""))}</small>`:""}</li>`).join("")}</ul>`:`<div class="s">Žiadne akcie v období.</div>`}</details>`).join("")+`<div class="s">🔒 Zaznamenáva sa iba čas a použité tlačidlá, nie zadané údaje. Záznamy sa mažú po 180 dňoch.</div></div>`}
function paint(){let m=document.getElementById("faMod");if(!m){m=document.createElement("div");m.id="faMod";m.className="famod";document.body.appendChild(m)}m.innerHTML=html()}
{const st=document.createElement("style");st.textContent=`.famod{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:10px}@media(min-width:700px){.famod{align-items:center}}
.fabox{width:min(760px,100%);max-height:92vh;overflow:auto;display:grid;gap:10px;padding:18px;border-radius:24px;background:linear-gradient(160deg,rgba(28,34,46,.97),rgba(12,16,24,.98));border:1px solid rgba(255,255,255,.16);color:#eef2f7}
html[data-theme=light] .fabox{background:#fff;color:#0f172a}.fahd{display:flex;justify-content:space-between;align-items:center;font-size:1.1rem}.fax{min-height:40px;min-width:40px;padding:0}
.fap{border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:8px 12px}html[data-theme=light] .fap{border-color:rgba(15,23,42,.14)}.fap.off{opacity:.65}.fap summary{display:flex;gap:10px;align-items:center;cursor:pointer;list-style:none;min-height:44px}.fap summary::-webkit-details-marker{display:none}
.fai{font-size:1.4rem}.fan{display:grid}.fan small{opacity:.75}.faa{margin:6px 0;padding-left:18px;font-size:.88rem}.faa li{margin:3px 0}.faa small{opacity:.6}.farow{margin:0 0 10px}`;document.head.appendChild(st)}
if(typeof window.renderStaff==="function"){const _rs=window.renderStaff;window.renderStaff=function(){const r=_rs.apply(this,arguments);try{if(typeof TAB!=="undefined"&&TAB==="farm"&&typeof ROLE!=="undefined"&&ROLE==="owner"){const app=document.getElementById("app"),hr=app&&app.querySelector(".hrow");
  if(hr&&!app.querySelector(".farow")){const b=document.createElement("div");b.className="btns farow";b.innerHTML=`<button type="button" class="lime" data-faopen>📊 Aktivita farmárov a partnerov v aplikácii</button>`;hr.after(b)}}}catch(x){}return r}}
document.addEventListener("click",ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(g("[data-faopen]")){load();return}if(g("[data-faclose]")||ev.target.id==="faMod"){const m=document.getElementById("faMod");if(m)m.remove();return}
  if(x=g("[data-fad]")){DAYS=+x.dataset.fad;load();return}if(x=g("[data-faf]")){FLT=x.dataset.faf;paint();return}});
})();
