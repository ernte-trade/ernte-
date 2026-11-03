// ===== ERNTE · ODPOVEDE KLIENTOM (3. 11. 21:36 PRÍKAZ MAJITEĽA) – iba Martin a Jana =====
// Odpovede od firiem, ktoré sme oslovili (erntespol@gmail.com → Gmail skript → lead_replies). Claude im odpíše sám;
// keď nevie presne čo, nastaví „pomoc“ → červená výstražná bublina „🆘 Pomoc pri odpísaní klientovi“. Tu sa odpoveď upraví a odošle vo vlákne klienta.
(function(){
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST&&typeof sb!=="undefined"&&sb;
const R={items:[],at:0,busy:false,open:false};
const hm=t=>{try{return new Date(t).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}catch(x){return ""}};
const ST={nova:["⏳","Claude pripravuje odpoveď"],pomoc:["🆘","Treba tvoju pomoc"],odpovedane:["✅","Odpovedané"],ignor:["↷","Bez odpovede"]};
async function load(force){if(!OK()||R.busy)return;if(!force&&Date.now()-R.at<170e3)return;R.busy=true;
  try{const {data,error}=await sb.rpc("lead_reply_list");if(!error&&data&&!data.err){R.items=data.items||[];R.script=data.script;R.seen=data.reply_seen}R.at=Date.now()}catch(x){}
  R.busy=false;draw()}
function help(){return R.items.filter(x=>x.status==="pomoc")}
function draw(){let b=document.getElementById("lrBub");const H=help();
  if(!OK()||!H.length){if(b)b.remove();return}
  if(!b){b=document.createElement("button");b.type="button";b.id="lrBub";b.addEventListener("click",()=>openSheet());document.body.appendChild(b)}
  const t=`<span class="lri" aria-hidden="true">🆘</span><span class="lrt"><b>Pomoc pri odpísaní klientovi</b><small>${H.length===1?e(H[0].from_name||H[0].from_addr):H.length+" klienti čakajú na odpoveď"}</small></span><span class="lrn">${H.length}</span>`;
  if(b.innerHTML!==t)b.innerHTML=t;
  if(R.open)openSheet(true)}
function card(x){const s=ST[x.status]||["•",x.status],can=x.status==="pomoc"||x.status==="nova";
  return `<div class="lrc lr-${e(x.status)}" data-lrid="${x.id}">
   <div class="lrh"><b>${e(x.from_name||x.from_addr)}</b><span class="pill ${x.status==="pomoc"?"r":x.status==="nova"?"w":""}">${s[0]} ${s[1]}</span></div>
   <div class="s">${e(x.from_addr)} · ${hm(x.received)} · ${e(x.subject||"")}</div>
   ${x.note?`<div class="lrnote">🤖 ${e(x.note)}</div>`:""}
   <details${x.status==="pomoc"?" open":""}><summary>📩 Čo napísal klient</summary><pre class="lrb">${e(String(x.body||"").split(/\n-{3,}\s*(Original|Ursprüngliche|Pôvodná|Eredeti)/i)[0].slice(0,4000))}</pre></details>
   ${can?`<label class="lrl">Odpoveď (odíde z erntespol@gmail.com priamo do jeho vlákna)<textarea rows="8" data-lrtx="${x.id}">${e(x.draft||"")}</textarea></label>
    <div class="btns"><button type="button" class="pri" data-lrsend="${x.id}">📤 Odoslať odpoveď</button><button type="button" data-lrign="${x.id}">↷ Netreba odpovedať</button></div>`
    :x.draft?`<details><summary>📤 Naša odpoveď${x.job_st?` · ${x.job_st==="odoslany"?"odoslaná":e(x.job_st)}`:""}</summary><pre class="lrb">${e(x.draft)}</pre></details>`:""}
  </div>`}
function openSheet(re){R.open=true;let o=document.getElementById("lrSheet");
  if(!o){o=document.createElement("div");o.id="lrSheet";o.className="lrov";o.addEventListener("click",ev=>{if(ev.target===o)close()});document.body.appendChild(o)}
  const keep={};o.querySelectorAll("[data-lrtx]").forEach(t=>keep[t.dataset.lrtx]=t.value);
  const I=R.items,A=I.filter(x=>x.status==="pomoc"),B=I.filter(x=>x.status==="nova"),C=I.filter(x=>x.status!=="pomoc"&&x.status!=="nova");
  const live=R.seen&&Date.now()-Date.parse(R.seen)<75*60e3;
  o.innerHTML=`<div class="lrs" role="dialog" aria-label="Odpovede klientom"><div class="lrsh"><b>📨 Odpovede klientom</b><button type="button" class="lrx" data-lrclose aria-label="Zavrieť">✕</button></div>
   <div class="s">Sledujem erntespol@gmail.com – kto z oslovených firiem odpíše, Claude mu odpovie priamo v jeho vlákne. Keď si nie je istý, je to tu so 🆘.
    ${live?`🟢 Schránka naposledy skontrolovaná ${hm(R.seen)}.`:`<b class="lrw">⚠️ Gmail skript ešte nečíta doručenú poštu – vlož nový skript: Zúčtovanie → 📥 → ⚙️ Nastavenie Gmailu → 📋 Skript pre erntespol (hore funkcia setup → ▶).</b>`}</div>
   ${A.length?A.map(card).join(""):`<div class="s">🆘 Teraz netreba nič – všetkým je odpísané.</div>`}
   ${B.length?`<h3 class="lrsub">⏳ Claude pripravuje</h3>${B.map(card).join("")}`:""}
   ${C.length?`<h3 class="lrsub">Posledných 7 dní</h3>${C.map(card).join("")}`:""}</div>`;
  o.querySelectorAll("[data-lrtx]").forEach(t=>{if(keep[t.dataset.lrtx]!=null)t.value=keep[t.dataset.lrtx]})}
function close(){R.open=false;const o=document.getElementById("lrSheet");if(o)o.remove();if(location.hash==="#odpovede")try{history.replaceState(null,"",location.pathname+location.search)}catch(x){}}
document.addEventListener("click",async ev=>{const t=ev.target.closest("[data-lrclose],[data-lrsend],[data-lrign]");if(!t)return;
  if(t.dataset.lrclose!=null)return close();
  const id=+(t.dataset.lrsend||t.dataset.lrign),send=!!t.dataset.lrsend,tx=document.querySelector(`[data-lrtx="${id}"]`),body=tx?tx.value.trim():"";
  if(send&&body.length<5){window.toast&&toast("Napíš odpoveď.");return}
  if(send&&!confirm("Odoslať odpoveď klientovi?"))return;
  t.disabled=true;try{const {error}=await sb.rpc("lead_reply_answer",{p_id:id,p_body:body,p_act:send?"send":"ignor"});
    if(error)throw error;window.toast&&toast(send?"📤 Odpoveď odíde do pár minút":"↷ Označené");await load(true)}
  catch(x){t.disabled=false;window.toast&&toast("⚠️ "+(x.message||x))}});
function hash(){if(location.hash==="#odpovede"&&OK()){load(true);openSheet()}}
window.addEventListener("hashchange",hash);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)load()});
setInterval(()=>{if(!document.hidden)load()},180e3);
const tk=setInterval(()=>{if(OK()){clearInterval(tk);load(true).then(hash)}},1500);setTimeout(()=>clearInterval(tk),120e3);
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
.lrsub{margin:16px 0 4px;font-size:15px}.lrw{color:#ffc163}
`;document.head.appendChild(st);
})();
