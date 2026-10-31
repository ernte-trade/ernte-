// ===== ERNTE · SPÄTNÁ VÄZBA (všetci používatelia) =====
// Plávajúce tlačidlo 💬 → chat: aplikácia sa občas opýta bežnú otázku (čo by ste zmenili, čo chýba…), človek odpovie,
// môže dať hodnotenie 1–5 a napísať vlastný nápad. Ukladá do tabuľky app_feedback; kým v databáze nie je, uloží farmárovi
// ako „Správa“ v Požiadavkách a zamestnancovi do aktivity (kind = feedback). Majiteľ vidí všetko v Prehľade → 💬 Spätná väzba.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||4000)};
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER,isS=()=>typeof ROLE!=="undefined"&&!!ROLE&&!isF(),isOwn=()=>isS()&&ROLE==="owner";
const who=()=>isF()?"farmer":isS()?"staff":document.querySelector(".trtabs")?"partner":null;
const Q={farmer:["Čo vám v aplikácii ERNTE najviac pomáha?","Čo by ste v aplikácii zmenili alebo pridali?","Bolo niečo, čo ste v aplikácii nevedeli nájsť?","Chýba vám nejaká informácia o odvoze, vážení alebo platbe?","Ako ste spokojný s výkupnými cenami a komunikáciou s ERNTE?","Odporučili by ste ERNTE inému farmárovi? Prečo áno / nie?"],
 staff:["Čo ti v aplikácii zaberá najviac času?","Čo by si v aplikácii zmenil/a alebo pridal/a?","Robíš ešte niečo mimo aplikácie (Excel, papier, telefón)? Čo?","Ktorá časť aplikácie je neprehľadná?","Nefungovalo ti dnes niečo? Napíš čo a kde.","Čo by ti ušetrilo najviac práce?"],
 partner:["Čo vám v aplikácii pomáha?","Čo by ste zmenili alebo pridali?","Chýba vám nejaká informácia?"]};
const LK="ernte-fb",ld=()=>{try{return JSON.parse(localStorage.getItem(LK)||"{}")}catch(x){return {}}},sv=v=>{try{localStorage.setItem(LK,JSON.stringify(v))}catch(x){}};
let S={open:false,qi:0,rate:0,busy:false,list:null,tbl:null};
function nextQ(){const w=who()||"staff",L=Q[w]||Q.staff,st=ld(),done=st.done||[];const left=L.map((q,i)=>i).filter(i=>!done.includes(w+":"+i));return left.length?left[0]:Math.floor(Math.random()*L.length)}
function btn(){if(!who()||document.getElementById("fbBtn"))return;css();const b=document.createElement("button");b.type="button";b.id="fbBtn";b.className="fbbtn";b.setAttribute("aria-label","Spätná väzba – čo by ste zmenili?");b.innerHTML=`💬<span class="fbtip" hidden></span>`;document.body.appendChild(b);b.onclick=()=>open()}
function tip(){const st=ld(),b=document.getElementById("fbBtn");if(!b)return;if(st.last&&Date.now()-st.last<3*864e5)return;if(st.snooze&&Date.now()<st.snooze)return;
  const t=b.querySelector(".fbtip");const L=Q[who()]||Q.staff;t.textContent="Máte minútku? "+L[nextQ()];t.hidden=false;setTimeout(()=>{t.hidden=true},14000)}
function open(qOnly){S.open=true;S.qOnly=qOnly===true;S.fbOpen=false;S.qi=nextQ();S.rate=0;paint();if(!S.qOnly&&window.rsSeen)try{rsSeen()}catch(x){}}
function close(){S.open=false;const m=document.getElementById("fbMod");if(m)m.remove()}
function paint(){let m=document.getElementById("fbMod");if(!S.open){if(m)m.remove();return}if(!m){m=document.createElement("div");m.id="fbMod";m.className="fbmod";document.body.appendChild(m);m.addEventListener("click",ev=>{if(ev.target===m)close()})}
  const L=Q[who()]||Q.staff,q=L[S.qi],nm=isF()?FARMER.name:(typeof ME!=="undefined"&&ME&&(ME.staffName||ME.email))||"";
  const rs=!S.qOnly&&window.rsHTML?rsHTML():"";
  m.innerHTML=`<div class="fbbox" role="dialog" aria-modal="true" aria-label="${rs?"Ranná správa a spätná väzba":"Spätná väzba"}"><div class="fbhd"><b>${rs?"💬 ERNTE":"💬 Pomôžte nám zlepšiť aplikáciu"}</b><button type="button" class="fbx" data-fbx aria-label="Zavrieť">✕</button></div>
   ${rs?`<div class="fbchat">${rs}</div><details class="fbmore"${S.fbOpen?" open":""}><summary>💬 Máte nápad alebo pripomienku?</summary>`:""}
   <div class="fbchat"><div class="fbmsg them"><span class="fbav">ERNTE</span><p>Dobrý deň${nm?", "+e(String(nm).split(" ")[0]):""}! ${e(q)}</p></div></div>
   <form id="fbF" class="fbf"><textarea name="a" rows="3" required placeholder="Napíšte odpoveď alebo nápad…"></textarea>
    <div class="fbrate" role="radiogroup" aria-label="Celkové hodnotenie aplikácie">${[1,2,3,4,5].map(i=>`<button type="button" data-fbr="${i}" aria-pressed="${S.rate===i}" title="${i}/5">${["😞","🙁","😐","🙂","😍"][i-1]}</button>`).join("")}<small>celkovo aplikácia</small></div>
    <div class="btns"><button type="submit" class="lime"${S.busy?" disabled":""}>📤 Odoslať</button><button type="button" data-fbq>Iná otázka</button><button type="button" data-fbl>Neskôr</button></div></form>
   <div class="s fbnote">Odpovede číta majiteľ ERNTE. Ďakujeme – každý nápad zvažujeme.</div>${rs?"</details>":""}</div>`;
  if(rs){const d=m.querySelector(".fbmore");if(d)d.addEventListener("toggle",()=>{S.fbOpen=d.open})}
  if(!rs||S.fbOpen)setTimeout(()=>{const t=m.querySelector("textarea");try{t&&t.focus({preventScroll:!!rs})}catch(x){}},80)}
async function send(a){const w=who(),L=Q[w]||Q.staff,q=L[S.qi];S.busy=true;paint();
  const row={who:w,farmer_id:isF()?FARMER.id:null,email:typeof ME!=="undefined"&&ME?String(ME.email||"").toLowerCase():null,name:isF()?FARMER.name:(typeof ME!=="undefined"&&ME&&ME.staffName)||null,question:q,answer:a.slice(0,2000),rating:S.rate||null,screen:typeof TAB!=="undefined"&&isS()?TAB:w,dev:navigator.userAgent.slice(0,180)};
  let r=await sb.from("app_feedback").insert(row);
  if(r.error&&/app_feedback|relation|schema cache|does not exist|could not find/i.test(r.error.message)){
    if(isF())r=await sb.from("requests").insert({farmer_id:FARMER.id,kind:"message",note:(`💬 SPÄTNÁ VÄZBA${S.rate?" · "+S.rate+"/5":""} · ${q} → ${a}`).slice(0,500)});
    else if(isS())r=await sb.from("app_activity").insert({email:row.email,at:new Date().toISOString(),kind:"feedback",what:q.slice(0,120),detail:((S.rate?S.rate+"/5 · ":"")+a).slice(0,1000)});
    else r={error:{message:"Spätná väzba sa zapne po aktualizácii databázy."}}}
  S.busy=false;if(r.error){say("Nepodarilo sa odoslať: "+r.error.message,6000);paint();return}
  const st=ld();st.last=Date.now();st.done=[...new Set([...(st.done||[]),w+":"+S.qi])];sv(st);close();say("✓ Ďakujeme! Vaša odpoveď prišla ERNTE.",4500);S.list=null}
// ---------- majiteľ: Prehľad → Spätná väzba ----------
async function load(){S.list=[];let r=await sb.from("app_feedback").select("*").order("created_at",{ascending:false}).limit(100);
  if(!r.error){S.tbl=true;S.list=(r.data||[]).map(x=>({n:x.name||x.email||"?",w:x.who,q:x.question,a:x.answer,r:x.rating,at:x.created_at}))}
  else{S.tbl=false;const [a,b]=await Promise.all([sb.from("requests").select("farmer_id,note,created_at").eq("kind","message").order("created_at",{ascending:false}).limit(200),sb.from("app_activity").select("name,email,what,detail,at").eq("kind","feedback").order("at",{ascending:false}).limit(200)]);
    const F=(a.data||[]).filter(x=>/^💬 SPÄTNÁ VÄZBA/.test(x.note||"")).map(x=>{const m=String(x.note).replace(/^💬 SPÄTNÁ VÄZBA/,"").match(/^(?: · (\d)\/5)? · (.*?) → ([\s\S]*)$/)||[];const fr=(STATE.farmers||[]).find(f=>f.id===x.farmer_id)||{};return {n:fr.name||"farmár",w:"farmer",q:m[2]||"",a:m[3]||x.note,r:m[1]?+m[1]:null,at:x.created_at}});
    const T=(b.data||[]).map(x=>{const m=String(x.detail||"").match(/^(\d)\/5 · ([\s\S]*)$/);return {n:x.name||x.email,w:"staff",q:x.what,a:m?m[2]:x.detail,r:m?+m[1]:null,at:x.at}});
    S.list=[...F,...T].sort((p,q)=>String(q.at).localeCompare(String(p.at)))}
  if(typeof TAB!=="undefined"&&TAB==="home")renderStaff()}
function ownHTML(){if(S.list===null){load();return ""}const L=S.list;const avg=L.filter(x=>x.r).length?(L.filter(x=>x.r).reduce((s,x)=>s+x.r,0)/L.filter(x=>x.r).length):null;
  const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"";
  return `<details class="card hsec fbown"${L.length?"":""}><summary><span>💬</span><b>Spätná väzba od používateľov</b><small>${L.length?`${L.length} odpovedí${avg?` · priemer ${avg.toFixed(1).replace(".",",")}/5`:""}`:"zatiaľ nikto neodpovedal"}</small></summary>
   ${L.length?L.slice(0,40).map(x=>`<div class="fbrow"><div class="row"><b>${x.w==="farmer"?"👨‍🌾":x.w==="partner"?"🐔":"👷"} ${e(x.n)}</b><small>${e(dt(x.at))}${x.r?" · "+["😞","🙁","😐","🙂","😍"][x.r-1]+" "+x.r+"/5":""}</small></div>${x.q?`<div class="s">❓ ${e(x.q)}</div>`:""}<div>${e(x.a)}</div></div>`).join(""):`<div class="s">Ľudia dostávajú otázky v aplikácii (tlačidlo 💬 vpravo dole). Odpovede sa zobrazia tu.</div>`}
   ${S.tbl===false?`<div class="s" style="opacity:.7">Dočasne uložené v Požiadavkách (farmári) a v aktivite (tím) – po úprave databázy pôjdu do vlastnej tabuľky.</div>`:""}</details>`}
function injectHome(){if(!isOwn()||typeof TAB==="undefined"||TAB!=="home")return;const app=document.getElementById("app");if(!app||app.querySelector(".fbown"))return;const h=ownHTML();if(!h)return;
  const due=app.querySelector("#hs-due"),box=document.createElement("div");box.innerHTML=h;if(due)due.before(...box.childNodes);else app.append(...box.childNodes)}
function css(){if(document.getElementById("fbCss"))return;const s=document.createElement("style");s.id="fbCss";s.textContent=`
.fbbtn{position:fixed;right:14px;bottom:calc(104px + env(safe-area-inset-bottom,0px));z-index:9000;width:54px;height:54px;min-height:54px;padding:0;border-radius:50%;font-size:1.5rem;border:0;background:linear-gradient(135deg,#D2FF6E,#5EEAD4);box-shadow:0 10px 26px rgba(0,0,0,.4);display:grid;place-items:center}
html.kbd .fbbtn{display:none}.fbtip{position:absolute;right:62px;bottom:4px;width:min(260px,70vw);padding:10px 12px;border-radius:16px 16px 4px 16px;background:#13241B;color:#F3F1EA;border:1px solid rgba(182,255,59,.4);font-size:.82rem;line-height:1.35;text-align:left;box-shadow:0 10px 26px rgba(0,0,0,.45)}
.fbmod{position:fixed;inset:0;z-index:10070;background:rgba(0,0,0,.66);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center}@media(min-width:700px){.fbmod{align-items:center}}
.fbbox{width:min(520px,100%);max-height:92vh;overflow:auto;display:grid;gap:12px;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));border-radius:24px 24px 0 0;background:linear-gradient(160deg,rgba(28,34,46,.98),rgba(12,16,24,.99));border:1px solid rgba(255,255,255,.16);color:#eef2f7}@media(min-width:700px){.fbbox{border-radius:24px}}
html[data-theme=light] .fbbox{background:#fff;color:#0f172a}.fbhd{display:flex;justify-content:space-between;align-items:center}.fbx{min-height:40px;min-width:40px;padding:0;border-radius:50%}
.fbchat{display:grid;gap:8px}.fbmsg{display:grid;gap:4px;max-width:92%}.fbmsg p{margin:0;padding:12px 14px;border-radius:4px 18px 18px 18px;background:rgba(94,234,212,.12);border:1px solid rgba(94,234,212,.3);line-height:1.45}.fbav{font-size:.7rem;font-weight:700;letter-spacing:.1em;opacity:.7}
.fbf{display:grid;gap:10px}.fbf textarea{width:100%;font-size:16px;border-radius:14px;padding:12px;min-height:92px}.fbrate{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.fbrate button{min-height:44px;min-width:44px;padding:0;font-size:1.4rem;border-radius:12px}.fbrate button[aria-pressed=true]{outline:3px solid #B6FF3B}.fbrate small{opacity:.7;font-size:.75rem}
.fbrow{display:grid;gap:3px;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}.fbnote{opacity:.75}`;document.head.appendChild(s)}
document.addEventListener("click",ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;if(!S.open)return;
  if(g("[data-fbx]")){close();return}if(g("[data-fbl]")){const st=ld();st.snooze=Date.now()+2*864e5;sv(st);close();return}
  if(g("[data-fbq]")){const L=Q[who()]||Q.staff,t=document.querySelector("#fbF textarea")?.value||"";S.qi=(S.qi+1)%L.length;paint();const n=document.querySelector("#fbF textarea");if(n)n.value=t;return}
  if(x=g("[data-fbr]")){S.rate=+x.dataset.fbr;document.querySelectorAll("[data-fbr]").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.fbr===S.rate)));return}},true);
document.addEventListener("submit",ev=>{if(ev.target.id!=="fbF")return;ev.preventDefault();ev.stopPropagation();const a=String(new FormData(ev.target).get("a")||"").trim();if(a)send(a)},true);
function wrap(n,fn){const o=window[n];if(typeof o!=="function"||o["__fb"+n])return;const w=function(){const r=o.apply(this,arguments);try{fn()}catch(x){}return r};w["__fb"+n]=1;Object.keys(o).forEach(k=>{try{if(!(k in w))w[k]=o[k]}catch(x){}});window[n]=w}
const t=setInterval(()=>{wrap("renderStaff",injectHome);if(who())btn()},500);setTimeout(()=>clearInterval(t),120000);
// občasná otázka: po 90 s používania, najviac raz za 3 dni
setTimeout(()=>{if(who()){btn();tip()}},90000);
window.feedbackOpen=open;window.feedbackClose=close;window.feedbackRepaint=()=>{if(S.open){const t=document.querySelector("#fbF textarea"),v=t?t.value:"";paint();const n=document.querySelector("#fbF textarea");if(n&&v)n.value=v}};
})();
