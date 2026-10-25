// ERNTE AI Podpora – chat s AI, prehľady, úpravy aplikácie. Iba pre majiteľa.
(function(){
const CSS=`
.aibtn{position:relative;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 14px 0 10px;border-radius:999px;border:1px solid rgba(182,255,59,.55);
  background:linear-gradient(135deg,rgba(124,92,255,.35),rgba(34,211,238,.18) 55%,rgba(182,255,59,.22));color:#fff;font:700 .8rem var(--f-head,system-ui);letter-spacing:.01em;cursor:pointer;
  box-shadow:0 0 22px rgba(124,92,255,.45),inset 0 1px 0 rgba(255,255,255,.3);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.aibtn i{width:20px;height:20px;border-radius:50%;background:conic-gradient(from 0deg,#b6ff3b,#22d3ee,#7c5cff,#ff5ea8,#b6ff3b);animation:aispin 4s linear infinite;box-shadow:0 0 12px #7c5cff}
.aibtn em{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#b6ff3b;color:#06110a;font:800 .65rem/18px system-ui;text-align:center;font-style:normal;padding:0 4px}
@keyframes aispin{to{transform:rotate(360deg)}}
.aibtn[hidden]{display:none}
.aish{position:fixed;inset:0;z-index:3000;display:flex;flex-direction:column;color:#f4f6ff;
  background:radial-gradient(90% 55% at 100% 0%,rgba(124,92,255,.42),transparent 60%),radial-gradient(80% 50% at 0% 100%,rgba(182,255,59,.20),transparent 60%),radial-gradient(60% 40% at 0% 30%,rgba(34,211,238,.16),transparent 60%),#04060b;
  animation:aiin .28s cubic-bezier(.2,.8,.2,1)}
@keyframes aiin{from{opacity:0;transform:translateY(24px) scale(.985)}}
.aish::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 0 40%,rgba(255,255,255,.035) 40.3%,transparent 41%),linear-gradient(65deg,transparent 0 70%,rgba(180,220,255,.03) 70.3%,transparent 71%)}
.aihd{position:relative;display:flex;align-items:center;gap:12px;padding:calc(14px + env(safe-area-inset-top)) 16px 10px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box}
.aiorb{width:46px;height:46px;border-radius:50%;flex:none;position:relative;background:conic-gradient(from 0deg,#b6ff3b,#22d3ee,#7c5cff,#ff5ea8,#b6ff3b);animation:aispin 6s linear infinite;box-shadow:0 0 30px rgba(124,92,255,.7),0 0 60px rgba(182,255,59,.25)}
.aiorb::after{content:"";position:absolute;inset:4px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.55),rgba(10,12,22,.9) 45%,#05070d 75%)}
.aish.busy .aiorb{animation-duration:1.1s}
.aihd h2{margin:0;font:800 1.35rem/1 var(--f-head,system-ui);letter-spacing:-.03em;background:linear-gradient(90deg,#fff,#d9ffb0 60%,#5eead4);-webkit-background-clip:text;background-clip:text;color:transparent}
.aihd small{display:block;color:rgba(255,255,255,.6);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;margin-top:4px}
.aihd .x{margin-left:auto;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:1.3rem;cursor:pointer}
.aitabs{display:flex;gap:6px;padding:0 16px 10px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box}
.aitabs button{flex:1;min-height:40px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:rgba(255,255,255,.75);font:700 .82rem var(--f-head,system-ui);cursor:pointer}
.aitabs button[aria-pressed=true]{background:linear-gradient(135deg,rgba(182,255,59,.9),rgba(94,234,212,.9));color:#06110a;border-color:transparent;box-shadow:0 0 22px rgba(182,255,59,.35)}
.aibody{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 16px 18px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box;display:flex;flex-direction:column;gap:12px}
.aimsg{max-width:88%;padding:12px 15px;border-radius:20px;font-size:.95rem;line-height:1.5;word-wrap:break-word;position:relative}
.aimsg.u{align-self:flex-end;background:linear-gradient(135deg,rgba(124,92,255,.55),rgba(34,211,238,.35));border:1px solid rgba(255,255,255,.22);border-bottom-right-radius:6px;box-shadow:0 8px 30px rgba(124,92,255,.25)}
.aimsg.a{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-bottom-left-radius:6px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.aimsg.err{border-color:rgba(255,107,129,.6);background:rgba(239,68,68,.12)}
.aimsg p{margin:0 0 8px}.aimsg p:last-child{margin:0}.aimsg ul{margin:4px 0 8px;padding-left:18px}.aimsg li{margin:2px 0}.aimsg b{color:#fff}.aimsg a{color:#b6ff3b;word-break:break-all}
.aimsg time{display:block;font-size:.66rem;color:rgba(255,255,255,.45);margin-top:6px}
.aitask{display:flex;gap:8px;align-items:flex-start;margin-top:8px;padding:9px 11px;border-radius:14px;background:linear-gradient(135deg,rgba(182,255,59,.16),rgba(94,234,212,.08));border:1px solid rgba(182,255,59,.4);font-size:.85rem}
.aitype{display:inline-flex;gap:5px;align-items:center;color:rgba(255,255,255,.7);font-size:.85rem}.aitype i{width:7px;height:7px;border-radius:50%;background:#b6ff3b;animation:aidot 1.2s infinite}.aitype i:nth-child(2){animation-delay:.2s;background:#5eead4}.aitype i:nth-child(3){animation-delay:.4s;background:#a78bfa}
@keyframes aidot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}
.aichips{display:flex;gap:8px;overflow-x:auto;padding:0 16px 8px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box;scrollbar-width:none}
.aichips button{flex:none;min-height:36px;padding:0 13px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e9ecff;font:600 .78rem system-ui;cursor:pointer;white-space:nowrap}
.aiin{display:flex;gap:8px;align-items:flex-end;padding:10px 16px calc(12px + env(safe-area-inset-bottom));max-width:860px;width:100%;margin:0 auto;box-sizing:border-box}
.aiin textarea{flex:1;resize:none;max-height:140px;min-height:50px;padding:13px 15px;border-radius:20px;border:1px solid rgba(255,255,255,.22);background:rgba(10,13,22,.75);color:#fff;font:500 1rem/1.35 system-ui;outline:none;backdrop-filter:blur(14px)}
.aiin textarea:focus{border-color:rgba(182,255,59,.7);box-shadow:0 0 0 3px rgba(182,255,59,.15)}
.aiin button{width:52px;height:52px;flex:none;border-radius:50%;border:0;cursor:pointer;font-size:1.25rem;color:#06110a;background:linear-gradient(135deg,#b6ff3b,#5eead4);box-shadow:0 0 24px rgba(182,255,59,.5)}
.aiin button:disabled{opacity:.4;box-shadow:none}
.aicard{padding:14px 15px;border-radius:20px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);display:grid;gap:8px}
.aicard h3{margin:0;font:700 .95rem var(--f-head,system-ui)}.aicard .s{color:rgba(255,255,255,.6);font-size:.8rem}
.aist{display:inline-block;padding:2px 9px;border-radius:999px;font:700 .68rem system-ui;letter-spacing:.04em;text-transform:uppercase}
.aist.nova,.aist.odoslana{background:rgba(124,92,255,.3);color:#d8ccff}.aist.hotova{background:rgba(182,255,59,.22);color:#d9ffb0}.aist.chyba{background:rgba(239,68,68,.25);color:#ffc2cb}
.aibig{min-height:52px;border-radius:16px;border:0;font:700 .95rem var(--f-head,system-ui);cursor:pointer;color:#06110a;background:linear-gradient(135deg,#b6ff3b,#5eead4)}
.aiempty{margin:auto;text-align:center;color:rgba(255,255,255,.65);max-width:420px;display:grid;gap:10px;justify-items:center;padding:20px}
.aiempty b{font:800 1.4rem var(--f-head,system-ui);color:#fff;letter-spacing:-.02em}
/* Dashboard karta */
.aidash{position:relative;overflow:hidden;border-radius:26px;padding:16px 16px 14px;margin:12px 0;border:1px solid rgba(167,139,250,.45);
  background:linear-gradient(150deg,rgba(124,92,255,.28),rgba(34,211,238,.10) 55%,rgba(182,255,59,.10));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 20px 60px rgba(124,92,255,.22)}
.aidash .h{display:flex;align-items:center;gap:10px}.aidash .h .aiorb{width:32px;height:32px}.aidash .h b{font:800 1.02rem var(--f-head,system-ui)}.aidash .h small{margin-left:auto;color:rgba(255,255,255,.55);font-size:.7rem}
.aidash .txt{margin-top:10px;font-size:.9rem;line-height:1.5;max-height:9.5em;overflow:hidden;mask-image:linear-gradient(180deg,#000 70%,transparent);-webkit-mask-image:linear-gradient(180deg,#000 70%,transparent)}
.aidash .txt p{margin:0 0 6px}.aidash .txt ul{margin:0 0 6px;padding-left:18px}
.aidash .fx{display:grid;gap:6px;margin-top:10px}.aidash .fx div{display:flex;gap:8px;font-size:.82rem;padding:8px 10px;border-radius:12px;background:rgba(182,255,59,.10);border:1px solid rgba(182,255,59,.3)}
.aidash .row{display:flex;gap:8px;margin-top:12px}.aidash .row button{flex:1;min-height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:700 .8rem system-ui;cursor:pointer}
.aidash .row button.p{background:linear-gradient(135deg,#b6ff3b,#5eead4);color:#06110a;border:0}
@media (max-width:460px){.aibtn{padding:0 11px 0 8px;font-size:.74rem;gap:6px}.aibtn i{width:16px;height:16px}}`;
const st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);

const A={open:false,tab:"chat",msgs:[],tasks:[],busy:null,ready:null};
const tm=d=>new Date(d).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"});
function md(t){const L=String(t||"").split("\n");let h="",ul=false,tasks=[];
  const il=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  for(const raw of L){const l=raw.trim();const tk=l.match(/^\**ÚLOHA:\**\s*(.+)$/);if(tk){tasks.push(tk[1]);continue}
    if(/^[-•*]\s+/.test(l)){if(!ul){h+="<ul>";ul=true}h+="<li>"+il(l.replace(/^[-•*]\s+/,""))+"</li>";continue}
    if(ul){h+="</ul>";ul=false}if(!l)continue;h+="<p>"+il(l.replace(/^#+\s*/,""))+"</p>"}
  if(ul)h+="</ul>";for(const x of tasks)h+=`<div class="aitask"><span>🛠</span><div><b>Úloha pre úpravu aplikácie</b><br>${esc(x)}</div></div>`;return h}

async function load(){const [m,t]=await Promise.all([sb.from("ai_msgs").select("id,kind,role,content,status,created_at").order("id",{ascending:false}).limit(80),sb.from("ai_tasks").select("*").order("created_at",{ascending:false}).limit(40)]);
  if(m.error){A.ready=/ai_msgs|relation|does not exist|schema cache/i.test(m.error.message)?"setup":"err:"+m.error.message;return}
  A.ready="ok";A.msgs=(m.data||[]).reverse();A.tasks=t.data||[];badge()}
function badge(){const b=$("aiBtn");if(!b)return;let seen=0;try{seen=+localStorage.getItem("aiSeen")||0}catch(e){}
  const n=A.msgs.filter(x=>x.role==="assistant"&&x.kind!=="chat"&&x.status==="ok"&&x.id>seen).length;let e=b.querySelector("em");if(n){if(!e){e=document.createElement("em");b.appendChild(e)}e.textContent=n}else if(e)e.remove()}
function markSeen(){const mx=Math.max(0,...A.msgs.map(x=>x.id));try{localStorage.setItem("aiSeen",mx)}catch(e){}badge()}

function view(){const el=$("aiSheet");if(!el)return;el.classList.toggle("busy",!!A.busy);
  const tabs=[["chat","💬 Chat"],["rep","📊 Prehľady"],["fix","🛠 Úpravy"]];
  let body="";
  if(A.ready==="setup")body=`<div class="aiempty"><div class="aiorb" style="width:72px;height:72px"></div><b>AI Podpora ešte nie je zapnutá</b><span>Raz spusti nastavenie – vložíš kľúč a SQL ako pri Commanderi.</span><a class="aibig" style="display:flex;align-items:center;justify-content:center;padding:0 24px;text-decoration:none" href="ai.html">Zapnúť AI Podporu</a></div>`;
  else if(A.ready&&A.ready.startsWith("err:"))body=`<div class="aiempty"><b>Chyba</b><span>${esc(A.ready.slice(4))}</span></div>`;
  else if(!A.ready)body=`<div class="aiempty"><span class="aitype"><i></i><i></i><i></i></span></div>`;
  else if(A.tab==="chat"){const C=A.msgs.filter(x=>x.kind==="chat");
    body=C.length?C.map(x=>x.status==="wait"?`<div class="aimsg a"><span class="aitype"><i></i><i></i><i></i>&nbsp;Premýšľam, kontrolujem údaje a trhy…</span></div>`:
      `<div class="aimsg ${x.role==="user"?"u":"a"}${x.status==="err"?" err":""}">${x.role==="user"?"<p>"+esc(x.content).replace(/\n/g,"<br>")+"</p>":md(x.content)}${x.status==="err"&&/kľúč|ai\.html|401/.test(x.content||"")?`<p><a href="ai.html">Otvoriť nastavenie AI</a></p>`:""}<time>${tm(x.created_at)}</time></div>`).join(""):
      `<div class="aiempty"><div class="aiorb" style="width:84px;height:84px"></div><b>Ahoj, som ERNTE AI.</b><span>Kontrolujem obchody, flotilu, náklady a zisk, sledujem trhy a radím, čo robiť. Napíš aj „oprav…“ alebo „pridaj…“ a aplikáciu upravím – zhrnutie nájdeš v Dashboarde.</span></div>`}
  else if(A.tab==="rep"){const R=A.msgs.filter(x=>x.kind==="report"&&x.role==="assistant").reverse();
    body=`<button type="button" class="aibig" data-ai="rep">${A.busy?"Pripravujem prehľad…":"✦ Urobiť prehľad teraz"}</button>`+(R.length?R.map(x=>`<div class="aicard"><div class="s">${tm(x.created_at)} · prehľad</div>${x.status==="wait"?`<span class="aitype"><i></i><i></i><i></i>&nbsp;Pripravujem…</span>`:`<div class="aimsg a" style="max-width:100%;background:none;border:0;padding:0;backdrop-filter:none">${md(x.content)}</div>`}</div>`).join(""):`<div class="aiempty"><span>Prehľad príde automaticky každé ráno o 6:00 a v pracovné dni o 14:00.</span></div>`)}
  else{const T=A.tasks,SN={nova:"čaká na odoslanie",odoslana:"odoslaná · robí sa",hotova:"hotové",chyba:"chyba – neodoslané"};
    body=T.length?T.map(t=>`<div class="aicard"><div style="display:flex;gap:8px;align-items:center"><span class="aist ${t.status}">${SN[t.status]||t.status}</span><span class="s">${tm(t.created_at)}${t.done_at?" → "+tm(t.done_at):""}</span></div><h3>${esc(t.text)}</h3>${t.status==="chyba"?`<button type="button" class="aibig" data-airetry="${esc(t.id)}" style="min-height:44px">↻ Skúsiť znova</button>`:""}${t.report?`<div class="aimsg a" style="max-width:100%;background:none;border:0;padding:0;backdrop-filter:none">${md(t.report)}</div>`:""}</div>`).join(""):
      `<div class="aiempty"><span>Zatiaľ žiadne úpravy. V chate napíš napr. „pridaj do Obchodov export do Excelu“.</span></div>`}
  el.querySelector(".aitabs").innerHTML=tabs.map(t=>`<button type="button" data-aitab="${t[0]}" aria-pressed="${A.tab===t[0]}">${t[1]}</button>`).join("");
  const b=el.querySelector(".aibody");const atBottom=b.scrollHeight-b.scrollTop-b.clientHeight<80;b.innerHTML=body;if(A.tab==="chat"&&(atBottom||A.jump)){b.scrollTop=b.scrollHeight;A.jump=false}
  el.querySelector(".aichips").hidden=A.tab!=="chat"||A.ready!=="ok";el.querySelector(".aiin").hidden=A.tab!=="chat"||A.ready!=="ok";
  const s=el.querySelector(".aiin button");if(s)s.disabled=!!A.busy}

async function openAI(){if($("aiSheet"))return;const d=document.createElement("div");d.id="aiSheet";d.className="aish";d.setAttribute("role","dialog");d.setAttribute("aria-label","ERNTE AI Podpora");
  d.innerHTML=`<div class="aihd"><div class="aiorb"></div><div><h2>ERNTE AI</h2><small>Podpora · kontrola · trhy</small></div><button type="button" class="x" data-ai="close" aria-label="Zavrieť">×</button></div>
  <div class="aitabs"></div><div class="aibody"></div>
  <div class="aichips">${["Ako sme na tom dnes?","Trhy – predať alebo držať?","Kde strácame peniaze?","Skontroluj flotilu a naftu","Čo mám dnes urobiť?"].map(q=>`<button type="button" data-aiq="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <form class="aiin"><textarea rows="1" placeholder="Napíš otázku alebo úlohu…" aria-label="Správa pre AI"></textarea><button type="submit" aria-label="Odoslať">➤</button></form>`;
  document.body.appendChild(d);document.documentElement.style.overflow="hidden";A.jump=true;view();await load();A.jump=true;view();markSeen();
  if(A.msgs.some(x=>x.status==="wait"))poll()}
function closeAI(){const d=$("aiSheet");if(d)d.remove();document.documentElement.style.overflow="";markSeen();refreshDash()}

let pollT=null;
async function poll(){clearTimeout(pollT);const t0=Date.now();
  const step=async()=>{try{await sb.rpc("ai_collect")}catch(e){}await load();view();
    if(A.msgs.some(x=>x.status==="wait")&&Date.now()-t0<7*60e3)pollT=setTimeout(step,2500);else{A.busy=null;view();markSeen();refreshDash()}};
  pollT=setTimeout(step,2000)}
async function ask(q){q=String(q||"").trim();if(!q||A.busy)return;A.busy="chat";A.tab="chat";
  A.msgs.push({id:1e15,kind:"chat",role:"user",content:q,status:"ok",created_at:new Date()},{id:1e15+1,kind:"chat",role:"assistant",status:"wait",created_at:new Date()});A.jump=true;view();
  const r=await sb.rpc("ai_ask",{q,kpi:(typeof STATE!=="undefined"&&STATE.aiKpi)||null});
  if(r.error){A.busy=null;await load();A.msgs.push({id:1e15+2,kind:"chat",role:"assistant",status:"err",content:r.error.message,created_at:new Date()});view();return}
  poll()}
async function report(){if(A.busy)return;A.busy="rep";view();const r=await sb.rpc("ai_report",{what:null});if(r.error){A.busy=null;toast("Chyba: "+r.error.message);view();return}await load();view();poll()}

document.addEventListener("click",e=>{const t=e.target;let x;
  if(t.closest("#aiBtn")){openAI();return}
  if(!t.closest("#aiSheet")&&!t.closest(".aidash"))return;
  if((x=t.closest("[data-ai]"))){const a=x.dataset.ai;if(a==="close")closeAI();else if(a==="rep"){if(!$("aiSheet"))openAI().then(()=>{A.tab="rep";view();report()});else report()}else if(a==="open")openAI();else if(a==="openrep"){openAI().then(()=>{A.tab="rep";view()})}else if(a==="openfix"){openAI().then(()=>{A.tab="fix";view()})}return}
  if((x=t.closest("[data-aitab]"))){A.tab=x.dataset.aitab;A.jump=true;view();return}
  if((x=t.closest("[data-aiq]"))){ask(x.dataset.aiq);return}
  if((x=t.closest("[data-airetry]"))){x.disabled=true;x.textContent="Odosielam…";sb.rpc("ai_task_retry",{t:x.dataset.airetry}).then(async r=>{if(r.error)toast("Chyba: "+r.error.message);setTimeout(async()=>{try{await sb.rpc("ai_collect")}catch(e){}await load();view()},4000);await load();view()})}});
document.addEventListener("submit",e=>{if(!e.target.closest(".aiin"))return;e.preventDefault();const ta=e.target.querySelector("textarea");const v=ta.value;ta.value="";ta.style.height="";ask(v)});
document.addEventListener("input",e=>{if(e.target.matches(".aiin textarea")){e.target.style.height="auto";e.target.style.height=Math.min(140,e.target.scrollHeight)+"px"}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("aiSheet"))closeAI();if(e.key==="Enter"&&!e.shiftKey&&e.target.matches(".aiin textarea")&&window.innerWidth>700){e.preventDefault();e.target.form.requestSubmit()}});

// Dashboard karta
async function fillDash(el){el.classList.add("ok");if(A.ready!=="ok")await load();
  if(A.ready==="setup"){el.innerHTML=`<div class="h"><div class="aiorb"></div><b>ERNTE AI</b></div><div class="txt"><p>AI kontrola obchodov, flotily a trhov ešte nie je zapnutá.</p></div><div class="row"><button type="button" class="p" onclick="location.href='ai.html'">Zapnúť AI Podporu</button></div>`;return}
  if(A.ready!=="ok"){el.remove();return}
  const R=A.msgs.filter(x=>x.kind==="report"&&x.role==="assistant"&&x.status==="ok").pop();
  const F=A.msgs.filter(x=>x.kind==="fix").slice(-3).reverse();const W=A.tasks.filter(t=>t.status==="odoslana"||t.status==="nova").length;const ER=A.tasks.filter(t=>t.status==="chyba").length;
  el.innerHTML=`<div class="h"><div class="aiorb"></div><b>AI prehľad</b><small>${R?tm(R.created_at):"zatiaľ žiadny"}</small></div>
   <div class="txt">${R?md(R.content):"<p>Prvý prehľad (trhy, obchody, flotila, čo robiť) si vytvor tlačidlom nižšie – potom príde sám každé ráno.</p>"}</div>
   ${F.length||W||ER?`<div class="fx">${ER?`<div style="background:rgba(239,68,68,.14);border-color:rgba(255,107,129,.5)" data-ai="openfix">❌ <span>${ER} ${ER===1?"úprava sa nepodarila odoslať":"úpravy sa nepodarilo odoslať"} – ťukni pre detail</span></div>`:""}${W?`<div>⏳ <span>${W} ${W===1?"úprava sa práve robí":"úpravy sa práve robia"}</span></div>`:""}${F.map(f=>`<div>✅ <span>${esc(String(f.content||"").replace(/\*\*/g,"").split("\n")[0].slice(0,140))}</span></div>`).join("")}</div>`:""}
   <div class="row">${R?`<button type="button" data-ai="openrep">Celý prehľad</button>`:`<button type="button" class="p" data-ai="rep">✦ Urobiť prehľad</button>`}<button type="button" class="p" data-ai="open">✦ Opýtať sa AI</button></div>`}
function refreshDash(){document.querySelectorAll(".aidash.ok").forEach(e=>{e.classList.remove("ok");fillDash(e)})}
new MutationObserver(()=>{document.querySelectorAll(".aidash:not(.ok)").forEach(fillDash)}).observe(document.body,{childList:true,subtree:true});

let kpiAt=0,kpiFull=false;window.aiSaveKpi=function(){if(typeof ROLE==="undefined"||ROLE!=="owner"||typeof STATE==="undefined"||!STATE.aiKpi||FPER!=="m")return;const full=STATE.aiKpi.mzdy_eur!=null;if(!full&&kpiAt)return;if(full&&kpiFull&&Date.now()-kpiAt<5*60e3)return;kpiAt=Date.now();kpiFull=full;
  sb.from("ai_state").upsert({key:"kpi",value:STATE.aiKpi,updated_at:new Date().toISOString()}).then(()=>{},()=>{})};
// Diagnostika dát (Nastavenia flotily)
const DL={udalosti_spolu:"Udalosti flotily spolu",udalosti_posledna:"Posledná udalosť",udalosti_podla_typu_30_dni:"Udalosti za 30 dní",dvor_nastaveny:"Dvor Medovská nastavený",miesta:"Miesta",miesta_s_upozornenim:"Miesta s upozornením",ntfy_tema_nastavena:"Upozornenia ntfy",funkcie:"Zapnuté kontroly",cron_ulohy:"Automatické úlohy",cron_posledne_behy:"Behy za 15 min",cron_chyby_24h:"Chyby úloh za 24 h",commander_posledne:"Commander – posledné načítanie",aut_spolu:"Áut v Commanderi",auta_s_polohou_do_30_min:"Autá s čerstvou polohou (30 min)",najnovsia_poloha:"Najnovšia poloha",najstarsia_poloha:"Najstaršia poloha",auta_na_mieste_teraz:"Autá teraz na mieste (dvor, čerpačka…)",kontroly_stav:"Kontroly – stav a chyby",auta_bez_jazd_tento_mesiac:"Autá bez jázd tento mesiac",auta_malo_dat_pod_100km:"Autá s málo dátami (< 100 km)",jazdy_mesiac:"Jazdy tento mesiac",jazdy_s_tankovanim_mesiac:"Jazdy s tankovaním",tankovanie_bez_ceny_mesiac:"Tankovania bez ceny",farmari:"Farmári",obchodov_spolu:"Obchodov spolu",poziadaviek_spolu:"Požiadaviek spolu",poziadaviek_novych:"Nových požiadaviek",ai_ulohy:"AI úpravy",github_token_ulozeny:"GitHub token uložený"};
const FN={yard_check:"dvor",place_check:"miesta",stop_check:"odchod po státí",fuel_check:"ochrana nafty",osm_sync:"čerpačky OSM"};
function dv(k,v){if(v&&typeof v==="object"&&v.chyba)return `<span style="color:#ffc2cb">chyba: ${esc(v.chyba)}</span>`;
  if(v===true)return `<b style="color:#b6ff3b">áno</b>`;if(v===false)return `<b style="color:#ff8a9a">nie</b>`;if(v==null||v==="")return `<span style="color:#fde68a">nezadané</span>`;
  if(k==="funkcie")return Object.entries(v).map(([a,b])=>`${FN[a]||a}: ${b?"✅":"❌"}`).join(" · ");
  if(k==="cron_ulohy")return v.length?v.map(j=>`${esc(j.uloha)} ${j.zapnuta?"✅":"⏸"}`).join(" · "):`<span style="color:#ff8a9a">žiadne</span>`;
  if(k==="cron_posledne_behy")return v.length?v.slice(0,6).map(j=>`${esc(j.uloha)} ${j.status==="succeeded"?"✅":"❌ "+esc(j.sprava||"")} ${esc(j.kedy)}`).join("<br>"):`<span style="color:#ff8a9a">žiadne behy</span>`;
  if(k==="cron_chyby_24h")return v.length?v.map(j=>`❌ ${esc(j.uloha)}: ${j.chyb}× – ${esc(j.posledna||"")}`).join("<br>"):`<b style="color:#b6ff3b">žiadne</b>`;
  if(k==="commander_posledne")return v.length?v.map(j=>`${esc(j.kind)}: ${esc(j.posledne)}${j.kod&&j.kod!==200?" (kód "+j.kod+")":""}`).join(" · "):`<span style="color:#ff8a9a">nič</span>`;
  if(k==="kontroly_stav")return v.length?v.map(j=>`${FN[j.kontrola]||esc(j.kontrola)}: ${j.chyba?`<span style="color:#ff8a9a">❌ ${esc(j.chyba)} (${esc(j.chyba_kedy||"")})</span>`:`✅ ${esc(j.posledny_ok||"")} · udalostí ${j.udalosti}`}`).join("<br>"):`<span style="color:#fde68a">ešte nebežali – skús o 3 min</span>`;
  if(k==="auta_malo_dat_pod_100km")return v.length?v.map(j=>`${esc(j.auto)} (${j.km??0} km, ${j.l??0} l)`).join(", "):"žiadne";
  if(Array.isArray(v))return v.length?v.map(x=>esc(typeof x==="object"?JSON.stringify(x):x)).join(", "):"žiadne";
  if(typeof v==="object"){const e=Object.entries(v);return e.length?e.map(([a,b])=>`${esc(a)}: ${esc(b)}`).join(" · "):`<span style="color:#fde68a">žiadne</span>`}
  return esc(v)}
async function fillDiag(el,run){el.classList.add("ok");
  if(!run){el.innerHTML=`<div class="aicard" style="margin:12px 0"><h3>🩺 Diagnostika dát</h3><div class="s">Skontroluje, či bežia automatické úlohy, či sa zapisujú udalosti a alarmy, ktoré autá nemajú dáta, a koľko je farmárov a obchodov.</div><button type="button" class="aibig" data-aidiag="1">Spustiť diagnostiku</button></div>`;return}
  el.innerHTML=`<div class="aicard" style="margin:12px 0"><h3>🩺 Diagnostika dát</h3><span class="aitype"><i></i><i></i><i></i>&nbsp;kontrolujem…</span></div>`;
  const r=await sb.rpc("ai_diag");
  if(r.error){el.innerHTML=`<div class="aicard" style="margin:12px 0"><h3>🩺 Diagnostika dát</h3><div class="s">${/ai_diag|function/i.test(r.error.message)?'Najprv spusti aktualizáciu SQL na stránke <a href="ai.html">ai.html</a> (polia nechaj prázdne).':esc(r.error.message)}</div></div>`;return}
  const d=r.data||{};el.innerHTML=`<div class="aicard" style="margin:12px 0"><h3>🩺 Diagnostika dát · ${new Date().toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}</h3>${Object.keys(DL).filter(k=>k in d).map(k=>`<div style="display:grid;grid-template-columns:minmax(0,42%) 1fr;gap:8px;font-size:.8rem;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)"><span style="color:rgba(255,255,255,.6)">${DL[k]}</span><span>${dv(k,d[k])}</span></div>`).join("")}<button type="button" class="aibig" data-aidiag="1">Znova</button></div>`}
document.addEventListener("click",e=>{const b=e.target.closest("[data-aidiag]");if(b){const el=b.closest(".aidiag");if(el)fillDiag(el,true)}});
new MutationObserver(()=>{document.querySelectorAll(".aidiag:not(.ok)").forEach(el=>fillDiag(el,false))}).observe(document.body,{childList:true,subtree:true});

window.aiInit=function(){const b=$("aiBtn");if(!b)return;b.hidden=ROLE!=="owner";if(ROLE==="owner")load()};
try{if(typeof ROLE!=="undefined"&&ROLE)window.aiInit()}catch(e){}
})();
