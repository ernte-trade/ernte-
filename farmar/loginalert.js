// ===== ERNTE · UPOZORNENIE: PRIHLÁSIL SA POUŽÍVATEĽ =====
// Iba majiteľ. Každú minútu (aj počas práce v aplikácii) skontroluje, kto z farmárov, partnerov a tímu práve otvoril aplikáciu.
// Ukáže výrazný pás hore (+ systémové upozornenie, keď je aplikácia na pozadí). Prvé prihlásenie je označené 🎉.
// Nič nové sa neukladá do databázy – číta sa iba existujúca aktivita (ext_activity_report, app_activity).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY="ernte-login-seen-v1",GAP=20*60e3;let seen={},started=false,busy=false,first=true;
try{seen=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(x){seen={}}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(seen))}catch(x){}};
const isOwner=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined";
const T=x=>x?new Date(x).getTime():0;
const hm=t=>new Date(t).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});
// pás hore – zostáva, kým ho nezavrieš (viac prihlásení sa zoradí pod seba)
function css(){if(document.getElementById("laCss"))return;const s=document.createElement("style");s.id="laCss";s.textContent=`
#laWrap{position:fixed;left:0;right:0;top:calc(8px + env(safe-area-inset-top,0px));z-index:10050;display:grid;gap:8px;justify-items:center;padding:0 10px;pointer-events:none}
.la{pointer-events:auto;width:min(560px,100%);display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px 12px 12px 16px;border-radius:20px;
 background:linear-gradient(135deg,rgba(20,40,30,.97),rgba(14,22,30,.97));border:1px solid rgba(182,255,59,.45);color:#F3F1EA;box-shadow:0 18px 44px rgba(0,0,0,.5),0 0 0 4px rgba(182,255,59,.08);
 -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);animation:laIn .45s cubic-bezier(.2,1.2,.4,1)}
.la.first{border-color:#FFC457;box-shadow:0 18px 44px rgba(0,0,0,.5),0 0 0 4px rgba(255,196,87,.15)}
.la .i{font-size:1.7rem;line-height:1}.la b{display:block;font-weight:700;font-size:1rem}.la small{display:block;opacity:.8;font-size:.82rem;margin-top:2px}
.la .x{min-height:40px;min-width:40px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit;font-size:1rem}
.la .go{grid-column:2/4;justify-self:start;min-height:36px;padding:0 14px;border-radius:99px;border:0;background:linear-gradient(135deg,#D2FF6E,#9BE83A);color:#0B1510;font-weight:700;font-size:.85rem}
html[data-theme=light] .la{background:#fff;color:#0f172a;border-color:#7fb800}
@keyframes laIn{from{opacity:0;transform:translateY(-18px) scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.la{animation:none}}`;document.head.appendChild(s)}
function show(list){if(!list.length)return;css();let w=document.getElementById("laWrap");if(!w){w=document.createElement("div");w.id="laWrap";w.setAttribute("aria-live","assertive");document.body.appendChild(w)}
  const many=list.length>3,items=many?[{name:list.length+" ľudí",many:true,first:list.some(x=>x.first),names:list.map(x=>x.name).join(", "),at:Math.max(...list.map(x=>x.at))}]:list;
  for(const p of items){const d=document.createElement("div");d.className="la"+(p.first?" first":"");d.setAttribute("role","alert");
    const ic=p.many?"🔔":p.kind==="partner"?"🐔":p.kind==="team"?"👷":"👨‍🌾";
    const t=p.many?`V aplikácii je práve ${e(p.name)}`:p.first?`🎉 ${e(p.name)} – prvé prihlásenie`:`${e(p.name)} je práve v aplikácii`;
    const sub=p.many?e(p.names):`${p.kind==="team"?"Tím":p.kind==="partner"?"Partner":"Farmár"} · ${hm(p.at)}${p.dev?" · "+e(p.dev):""}`;
    d.innerHTML=`<span class="i" aria-hidden="true">${ic}</span><span><b>${t}</b><small>${sub}</small></span><button type="button" class="x" aria-label="Zavrieť">✕</button>${p.kind!=="team"?`<button type="button" class="go" data-faopen>📊 Pozrieť aktivitu</button>`:""}`;
    d.querySelector(".x").onclick=()=>d.remove();d.addEventListener("click",ev=>{if(ev.target.closest("[data-faopen]"))d.remove()});w.prepend(d);
    while(w.children.length>4)w.lastChild.remove()}
  try{navigator.vibrate&&navigator.vibrate([120,80,120])}catch(x){}
  try{if(document.hidden&&"Notification" in window&&Notification.permission==="granted")for(const p of items)new Notification("ERNTE · prihlásenie",{body:p.many?`Prihlásilo sa ${p.name}: ${p.names}`:(p.first?"🎉 Prvé prihlásenie: ":"Prihlásil sa: ")+p.name,icon:"icon-192.png",tag:"ernte-login-"+(p.name||"")})}catch(x){}}
async function check(){if(busy||!isOwner())return;busy=true;const out=[];const now=Date.now();
  try{// farmári a partneri
    const r=await sb.rpc("ext_activity_report",{p_days:1});
    if(!r.error&&r.data&&r.data.people)for(const p of r.data.people){const k="x:"+(p.id||p.name),la=Math.max(T(p.last_at),T(p.last_login)),prev=seen[k];
      if(!la)continue;
      if(prev===undefined){seen[k]=la;if(first&&now-la>GAP)continue}
      else if(la<=prev)continue;
      // nové otvorenie = prvá aktivita po aspoň 20 min ticha (alebo nové prihlásenie)
      const newLogin=T(p.last_login)>(prev||0);if(prev&&la-prev<GAP&&!newLogin){seen[k]=la;continue}
      out.push({name:p.name,kind:p.kind==="partner"?"partner":"farmer",at:la,dev:p.dev||"",first:!prev&&(+p.sessions||0)<=1});seen[k]=la}
    // tím (zamestnanci)
    const since=new Date(now-6*3600e3).toISOString();
    const t=await sb.from("app_activity").select("at,email,name,dev").eq("kind","session").gte("at",since).order("at",{ascending:true}).limit(300);
    if(!t.error)for(const s of t.data||[]){const k="t:"+String(s.email||"").toLowerCase(),at=T(s.at),prev=seen[k];if(prev!==undefined&&at<=prev)continue;
      seen[k]=at;if(prev===undefined&&first&&now-at>GAP)continue;if(prev&&at-prev<GAP)continue;out.push({name:s.name||s.email,kind:"team",at,dev:s.dev||"",first:false})}
    save();if(!first||out.length)show(out.filter((x,i,a)=>a.findIndex(y=>y.name===x.name)===i))}
  catch(x){}finally{first=false;busy=false}}
function start(){if(started||!isOwner())return;started=true;setTimeout(check,4000);setInterval(check,45000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()})}
const w=setInterval(()=>{if(isOwner()){clearInterval(w);start()}},2000);setTimeout(()=>clearInterval(w),15*60e3);
})();
