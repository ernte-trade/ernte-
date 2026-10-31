// ===== 📞 RANNÝ PLÁN OBCHODNÍKA – komu dnes zavolať (príkaz majiteľa 31. 10.) =====
// Pre majiteľa a obchodníkov (prístup „req“ alebo „deals“). Počíta sa v aplikácii z údajov, ktoré človek aj tak vidí:
//  • nevybavené požiadavky farmárov, • cieľové ceny farmárov dosiahnuté / blízko našej ceny (price_targets, RLS req/deals),
//  • podpísané obchody so zostatkom bez naplánovaného auta, • farmári, ktorí dlho nepredali (60+ dní).
// Každý riadok: 📞 Volať / 💬 WhatsApp (s pripravenou vetou a našou dnešnou cenou – u Ceperka už s jeho úpravou v STATE.prices).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IN=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof STATE!=="undefined"&&STATE&&Array.isArray(STATE.farmers);
const OK=()=>IN()&&(ROLE==="owner"||(typeof can==="function"&&(can("req")||can("deals")||can("price_view")))||/galajda|ceperko|li[cč]ko|karoczkai/i.test(String((STATE.me&&STATE.me.name)||"")));
// tím: plán vidia všetci obchodníci (príkaz majiteľa 31. 10.)
const TABS=["home","req","deals","qd"];
const CN=c=>typeof comName==="function"?comName(c):c;
const f0=n=>n==null||!isFinite(n)?"–":(+n).toLocaleString("sk-SK",{maximumFractionDigits:0});
const tel=p=>{let d=String(p||"").replace(/[^\d+]/g,"");if(!d)return "";if(d.startsWith("+"))return d.slice(1);if(d.startsWith("00"))return d.slice(2);if(d.startsWith("0"))return "421"+d.slice(1);return d};
const days=a=>a?Math.floor((Date.now()-new Date(a).getTime())/864e5):null;
const D={tg:null,tgAt:0,open:null,st:null,stAt:0,ex:null};
async function loadSt(){if(D.busySt)return;D.busySt=true;try{const r=await sb.rpc("plan_state");D.st=r.error?{ack:{},rep:[]}:(r.data||{ack:{},rep:[]})}catch(x){D.st={ack:{},rep:[]}}D.stAt=Date.now();D.busySt=false;paint(true)}
const acked=k=>{const a=D.st&&D.st.ack&&D.st.ack[k];return !!(a&&a.until&&new Date(a.until)>new Date())};
function myName(){try{return (STATE.me&&STATE.me.name)||"ERNTE"}catch(x){return "ERNTE"}}
function price(c){const p=(STATE.prices||[]).find(x=>x.com===c&&x.price!=null);return p?+p.price:null}
async function loadTg(){if(D.busyTg)return;D.busyTg=true;try{const r=await sb.from("price_targets").select("farmer_id,com,target,active,hit_at,created_at").eq("active",true).limit(400);D.tg=r.error?[]:(r.data||[])}catch(x){D.tg=[]}D.tgAt=Date.now();D.busyTg=false;paint(true)}
function rows(){const F=STATE.farmers||[],byId=Object.fromEntries(F.map(f=>[f.id,f])),R=STATE.requests||STATE.reqs||[],DL=STATE.deals||[],T=STATE.trips||[],out=[];
  // 1) nevybavené požiadavky
  for(const r of R.filter(r=>r.status==="nova").slice(0,25)){const f=byId[r.farmer_id];if(!f)continue;const h=Math.max(0,Math.round((Date.now()-new Date(r.created_at))/36e5));
    const k=r.kind==="sell"?"chce predať":r.kind==="transport"?"objednal odvoz":r.kind==="agree"?"súhlasí so zmluvou":"poslal správu";
    out.push({k:"req:"+r.id,kind:"req",p:h>24?1:2,i:"📥",f,t:`${k}${r.com?" · "+CN(r.com):""}${r.tons?" · "+f0(r.tons)+" t":""}`,s:h<1?"práve teraz":h<24?`čaká ${h} h`:`čaká ${Math.round(h/24)} d`,
      msg:`Dobrý deň, tu ${myName()} z ERNTE. Ďakujem za Vašu požiadavku${r.com?" – "+CN(r.com):""}${r.tons?" "+f0(r.tons)+" t":""}. Ozývam sa kvôli dohode.`,go:"req"})}
  // 2) cieľové ceny
  for(const g of (D.tg||[])){const f=byId[g.farmer_id];if(!f)continue;const pc=price(g.com);if(pc==null||!(+g.target>0))continue;const diff=pc-(+g.target);if(diff<-5)continue;
    out.push({k:"tg:"+g.farmer_id+":"+g.com,kind:"tg",p:diff>=0?0:2,i:"🎯",f,t:`${CN(g.com)}: chce ${f0(g.target)} €/t, dnes ponúkame ${f0(pc)} €/t`,s:diff>=0?"CENA DOSIAHNUTÁ – volaj hneď":`chýba ${f0(-diff)} €/t`,
      msg:`Dobrý deň, tu ${myName()} z ERNTE. ${CN(g.com)} dnes vykupujeme za ${f0(pc)} €/t${diff>=0?" – to je Vaša cieľová cena":""}. Chcete predať?`})}
  // 3) podpísané obchody so zostatkom bez auta
  for(const d of DL.filter(d=>["podpisany","odvoz"].includes(d.status))){const left=(+d.tons||0)-(+d.delivered_t||0);if(left<=0.5)continue;const f=byId[d.farmer_id];if(!f)continue;
    const planned=T.some(t=>t.deal_id===d.id&&!["vylozene","zrusena"].includes(t.status));if(planned)continue;
    out.push({k:"deal:"+d.id,kind:"deal",deal:d,left,p:2,i:"🚛",f,t:`${CN(d.com)} · zmluva ${d.no||""}: zostáva ${f0(left)} t`,s:"bez naplánovaného auta",msg:`Dobrý deň, tu ${myName()} z ERNTE. Kedy Vám môžeme poslať autá na ${CN(d.com)} (zostáva ${f0(left)} t)?`,go:"deals"})}
  // 4) dlho nepredali
  const last={},vol={};for(const d of DL){if(d.status==="zruseny")continue;const t=new Date(d.created_at).getTime();if(!last[d.farmer_id]||t>last[d.farmer_id])last[d.farmer_id]=t;vol[d.farmer_id]=(vol[d.farmer_id]||0)+(+d.tons||0)}
  const sleep=F.filter(f=>f.active!==false&&last[f.id]&&days(last[f.id])>=60&&(f.phone||f.email)).sort((a,b)=>(vol[b.id]||0)-(vol[a.id]||0)).slice(0,8);
  for(const f of sleep){const best=(STATE.prices||[]).filter(p=>p.price!=null).sort((a,b)=>b.price-a.price)[0];
    out.push({k:"sleep:"+f.id,kind:"sleep",p:3,i:"😴",f,t:`nepredal ${days(last[f.id])} dní · spolu ${f0(vol[f.id])} t`,s:"pripomeň sa",msg:`Dobrý deň, tu ${myName()} z ERNTE. Dlho sme sa nepočuli – ${best?CN(best.com)+" dnes vykupujeme za "+f0(best.price)+" €/t. ":""}Máte niečo na predaj?`})}
  // 5) ⚠️ nadodávka – dodané viac ako zmluva → dodatková zmluva
  for(const d of DL.filter(d=>d.status!=="zruseny")){const ex=(+d.delivered_t||0)-(+d.tons||0);if(ex<=0.5)continue;const f=byId[d.farmer_id];if(!f)continue;
    const fix=DL.some(x=>x.id!==d.id&&x.farmer_id===d.farmer_id&&x.com===d.com&&x.status!=="zruseny"&&new Date(x.created_at)>new Date(d.created_at)&&(+x.tons||0)>=ex-0.5);if(fix)continue;
    out.push({k:"over:"+d.id,kind:"over",p:0,i:"⚠️",f,t:`NADODÁVKA ${CN(d.com)} · zmluva ${d.no||""}: ${f0(d.tons)} t, dodané ${(+d.delivered_t).toLocaleString("sk-SK",{maximumFractionDigits:2})} t → nad zmluvu ${ex.toLocaleString("sk-SK",{maximumFractionDigits:2})} t (≈ ${f0(ex*(+d.price||0))} €)`,s:"urobte dodatkovú zmluvu",
      msg:`Dobrý deň, tu ${myName()} z ERNTE. Dodali ste nám o ${ex.toLocaleString("sk-SK",{maximumFractionDigits:2})} t ${CN(d.com)} viac, ako je v zmluve ${d.no||""}. Pripravím Vám dodatkovú zmluvu na toto množstvo.`,go:"deals"})}
  // 6) 🔁 náhradný nákup čaká na zmluvu
  for(const r of ((D.st&&D.st.rep)||[])){const f=byId[r.farmer_id];if(!f)continue;const it=(r.items||[]).map(x=>CN(x.com)+" "+f0(x.tons)+" t").join(", ");
    out.push({k:"rep:"+r.id,kind:"rep",rep:r,p:1,i:"🔁",f,t:`Náhradný nákup: ${it} = ${f0(r.total)} € (nedodané ${f0(r.und)} €)${r.ok?" ✅":" ⚠️ rozdiel"}`,s:`urobte zmluvu · zadal ${r.by||""}`,
      msg:`Dobrý deň, tu ${myName()} z ERNTE. Ako sme sa dohodli, namiesto nedodaného tovaru pripravujem zmluvu na ${it}.`,go:"qd"})}
  const seen=new Set();return out.filter(x=>!(x.k&&acked(x.k))).sort((a,b)=>a.p-b.p).filter(x=>{const k=x.i+x.f.id+x.t;if(seen.has(k))return false;seen.add(k);return true})}
function html(){const L=rows();if(!L.length)return `<div class="card pln" id="plnCard"><h2>📞 Môj plán na dnes</h2><div class="s">Dnes nikto nečaká – všetko vybavené. 👍</div></div>`;
  const open=D.open===true||(D.open===null&&L.length<=6),show=open?L:L.slice(0,4),hot=L.filter(x=>x.p<=1).length;
  return `<div class="card pln" id="plnCard"><h2>📞 Môj plán na dnes · ${L.length}${hot?` <span class="plh">${hot} hneď</span>`:""}</h2>
   ${show.map(x=>{const t=tel(x.f.phone);return `<div class="plr${x.p===0?" hot":""}"><div class="pli">${x.i}</div><div class="plt"><b>${E(x.f.name)}</b><span>${E(x.t)}</span><small>${E(x.s)}</small></div>
     <div class="plb"><button type="button" class="plsay" data-plk="${E(x.k||"")}" aria-expanded="${D.ex===x.k}">✔️ Vyjadriť</button>${t?`<a class="plc" href="tel:+${E(t)}" aria-label="Volať ${E(x.f.name)}">📞</a><a class="plw" href="https://wa.me/${E(t)}?text=${encodeURIComponent(x.msg)}" target="_blank" rel="noopener" aria-label="WhatsApp ${E(x.f.name)}">💬</a>`:x.f.email?`<a class="plw" href="mailto:${E(x.f.email)}?subject=${encodeURIComponent("ERNTE")}&body=${encodeURIComponent(x.msg)}" aria-label="E-mail">✉️</a>`:`<small class="plno">bez kontaktu</small>`}</div>${D.ex===x.k?sayHTML(x):""}</div>`}).join("")}
   ${L.length>4?`<div class="btns"><button type="button" class="ghost" data-plnt>${open?"Menej":"Zobraziť všetko ("+L.length+")"}</button></div>`:""}</div>`}
function paint(force){const app=document.getElementById("app");if(!app||typeof TAB==="undefined")return;const old=document.getElementById("plnCard");if(old&&document.activeElement&&old.contains(document.activeElement)&&document.activeElement.tagName==="INPUT")return;
  if(!OK()||!TABS.includes(TAB)){if(old)old.remove();return}
  if(!D.tgAt&&!D.busyTg)loadTg();if(!D.stAt&&!D.busySt)loadSt();
  const h=html();if(old&&!force&&old.dataset.h===String(h.length)+h.slice(-40))return;
  const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.dataset.h=String(h.length)+h.slice(-40);
  if(old){old.replaceWith(el);return}const a=app.querySelector("nav.tabs")||app.querySelector(".hero");if(a){let b=a;while(b.nextElementSibling&&/^(dropCard|ldCard|taCard)$/.test(b.nextElementSibling.id||"")||b.nextElementSibling&&b.nextElementSibling.classList.contains("instc"))b=b.nextElementSibling;b.after(el)}else app.prepend(el)}
// ---------- ✔️ vyjadrenie (príkaz majiteľa 31. 10.): položka zmizne iba po vyjadrení alebo keď je zmluva dodaná do nuly ----------
const RS={req:[["✅ Vybavené – dohodnuté",3],["📅 Ozve sa neskôr",2],["❌ Nemá záujem",14]],
  tg:[["📞 Volal som – predá",7],["💬 Čaká na vyššiu cenu",5],["❌ Nemá záujem",30]],
  deal:[["🌾 Ešte nemá nakosené",7],["🏠 Má na sklade – dodá neskôr",7],["🚛 Auto dohodnuté",3],["📵 Nedvíha – zavolám znova",1],["❌ Nedodá – slabá úroda","repl"],["❌ Nedodá – iný dôvod","repl"]],
  sleep:[["📞 Volal som – nemá tovar",30],["🌾 Predá po žatve",45],["❌ Predáva inde",60]],
  over:[["✍️ Dodatková zmluva urobená",365],["🔁 Započítané do inej zmluvy",365]],
  rep:[["✍️ Zmluva na náhradný tovar urobená","zmluva"],["❌ Farmár náhradu odmietol","zrusene"]]};
function sayHTML(x){const L=RS[x.kind]||[];return `<div class="plsays" role="group" aria-label="Vyjadrenie">${L.map((r,i)=>`<button type="button" data-plr="${i}" data-plk="${E(x.k)}">${E(r[0])}</button>`).join("")}<input class="plnote" data-plnote="${E(x.k)}" placeholder="Poznámka (nepovinné)" autocomplete="off"></div>`}
function findItem(k){return rows().find(x=>x.k===k)}
async function doSay(x,i){const r=(RS[x.kind]||[])[i];if(!r)return;const note=(document.querySelector(`[data-plnote="${CSS.escape(x.k)}"]`)||{}).value||null;
  if(r[1]==="repl"){replModal(x,r[0],note);return}
  try{if(x.kind==="rep"){const q=await sb.rpc("replace_done",{p_id:x.rep.id,p_status:r[1]});if(q.error)throw q.error}
    const q=await sb.rpc("plan_say",{p_key:x.k,p_reason:r[0],p_note:note,p_days:typeof r[1]==="number"?r[1]:365,p_meta:x.deal?{deal:x.deal.id,left:x.left}:null});if(q.error)throw q.error;
    D.ex=null;(D.st.ack||(D.st.ack={}))[x.k]={r:r[0],until:new Date(Date.now()+(typeof r[1]==="number"?r[1]:365)*864e5).toISOString()};if(x.kind==="rep")D.st.rep=(D.st.rep||[]).filter(y=>y.id!==x.rep.id);paint(true);toast("✓ Zapísané: "+r[0],3500)}
  catch(e){toast("Nepodarilo sa: "+(e&&e.message||e),5000)}}
// ---------- 🔁 náhradný nákup v hodnote nedodaného tovaru ----------
function replModal(x,why,note){const d=x.deal,left=x.left,V=Math.round(left*(+d.price||0)*100)/100;const P=(STATE.prices||[]).filter(p=>p.price!=null&&p.price>0);
  const m=document.createElement("div");m.className="pinmod plrm";m.setAttribute("role","dialog");m.setAttribute("aria-label","Náhradný nákup");
  const R=[{com:(P.find(p=>p.com!==d.com)||P[0]||{}).com||"",tons:""}];
  const val=r=>{const p=P.find(x=>x.com===r.com);const t=parseFloat(String(r.tons).replace(",","."));return p&&t>0?Math.round(t*p.price*100)/100:0};
  const draw=()=>{const tot=R.reduce((a,r)=>a+val(r),0),df=Math.round((tot-V)*100)/100,ok=Math.abs(df)<=Math.max(50,V*0.01);
    m.innerHTML=`<form class="pinbox" novalidate><div class="pinic">🔁</div><h2>Náhradný nákup</h2>
     <p><b>${E(x.f.name)}</b> · zmluva ${E(d.no||"")}<br>Nedodá <b>${f0(left)} t ${E(CN(d.com))}</b> × ${f0(d.price)} €/t = <b>${V.toLocaleString("sk-SK",{maximumFractionDigits:2})} €</b><br><small>${E(why)}${note?" · "+E(note):""}</small></p>
     ${R.map((r,i)=>{const p=P.find(x=>x.com===r.com);return `<div class="plrr"><select data-rc="${i}">${P.map(p=>`<option value="${E(p.com)}"${p.com===r.com?" selected":""}>${E(CN(p.com))} · ${f0(p.price)} €/t</option>`).join("")}</select>
       <label>Tony<input data-rt="${i}" inputmode="decimal" value="${E(r.tons)}" placeholder="${p?(V/p.price).toLocaleString("sk-SK",{maximumFractionDigits:2}):""}"></label><button type="button" data-rfill="${i}" title="Dopočítať zvyšok hodnoty">= zvyšok</button>${R.length>1?`<button type="button" data-rdel="${i}" aria-label="Odobrať">✕</button>`:""}<small>${val(r)?val(r).toLocaleString("sk-SK",{maximumFractionDigits:2})+" €":""}</small></div>`}).join("")}
     ${R.length<5?`<button type="button" class="ghost" data-radd>＋ Pridať ďalšiu plodinu</button>`:""}
     <div class="plrs ${ok?"ok":"bad"}">Náhrada spolu <b>${tot.toLocaleString("sk-SK",{maximumFractionDigits:2})} €</b> · nedodané <b>${V.toLocaleString("sk-SK",{maximumFractionDigits:2})} €</b><br>${tot?ok?"✅ Hodnota sedí":`⚠️ Rozdiel ${df>0?"+":""}${df.toLocaleString("sk-SK",{maximumFractionDigits:2})} € – upravte tony (ťuknite „= zvyšok“)`:"Zadajte tony"}</div>
     <div class="pinerr" role="alert"></div><button class="pri" type="submit">💾 Uložiť náhradný nákup</button><button type="button" class="ghost" data-rx>Zrušiť</button></form>`};
  draw();document.body.appendChild(m);
  m.addEventListener("change",e=>{const i=e.target.dataset.rc;if(i!=null){R[+i].com=e.target.value;draw()}});
  m.addEventListener("input",e=>{const i=e.target.dataset.rt;if(i!=null){R[+i].tons=e.target.value;const pos=e.target.selectionStart;draw();const n=m.querySelector(`[data-rt="${i}"]`);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}}});
  m.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;
    if("rx" in b.dataset){m.remove();return}
    if("radd" in b.dataset){R.push({com:(P.find(p=>!R.some(r=>r.com===p.com))||P[0]).com,tons:""});draw();return}
    if(b.dataset.rdel!=null){R.splice(+b.dataset.rdel,1);draw();return}
    if(b.dataset.rfill!=null){const i=+b.dataset.rfill,p=P.find(x=>x.com===R[i].com);const rest=V-R.reduce((a,r,j)=>a+(j===i?0:val(r)),0);if(p&&rest>0){R[i].tons=String(Math.round(rest/p.price*100)/100).replace(".",",")}draw();return}});
  m.addEventListener("submit",async e=>{e.preventDefault();const it=R.map(r=>({com:r.com,tons:parseFloat(String(r.tons).replace(",","."))})).filter(r=>r.com&&r.tons>0);const er=m.querySelector(".pinerr");
    if(!it.length){er.textContent="⚠️ Zadajte tony náhradného tovaru.";er.classList.add("on");return}
    const bt=m.querySelector("button[type=submit]");bt.disabled=true;bt.textContent="Ukladám…";
    try{const q=await sb.rpc("replace_save",{p_deal:d.id,p_items:it,p_reason:[why,note].filter(Boolean).join(" · ")});if(q.error)throw q.error;
      await sb.rpc("plan_say",{p_key:x.k,p_reason:why+" – náhradný nákup",p_note:note,p_days:365,p_meta:{deal:d.id,replace:q.data&&q.data.id}});
      m.remove();D.ex=null;toast(q.data&&q.data.ok?"✓ Náhradný nákup uložený – hodnota sedí. Majitelia a obchodníci dostali správu, urobte zmluvu.":"✓ Uložené, ale hodnota nesedí (rozdiel "+f0(q.data&&q.data.diff)+" €). Majitelia to vidia.",7000);loadSt()}
    catch(x2){bt.disabled=false;bt.textContent="💾 Uložiť náhradný nákup";er.textContent="⚠️ "+(x2&&x2.message||x2);er.classList.add("on")}})}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-plk]");if(!b||!b.closest("#plnCard"))return;e.preventDefault();const k=b.dataset.plk;
  if(b.dataset.plr!=null){const x=findItem(k);if(x)doSay(x,+b.dataset.plr);return}
  D.ex=D.ex===k?null:k;paint(true)},true);
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-plnt]");if(!b)return;e.preventDefault();const L=rows();D.open=!(D.open===true||(D.open===null&&L.length<=6));paint(true)},true);
{const s=document.createElement("style");s.textContent=`.pln h2{text-align:center}.plh{font-size:.75rem;padding:2px 8px;border-radius:10px;background:rgba(248,113,113,.2);color:#fca5a5;vertical-align:middle}
.plr{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}
.plr.hot{background:linear-gradient(90deg,rgba(182,255,59,.12),transparent);border-radius:12px;padding-left:6px}
.pli{font-size:1.4rem}.plt{display:grid;gap:1px;min-width:0}.plt b,.plt span{overflow-wrap:anywhere}.plt span{font-size:.9rem}.plt small{opacity:.65;font-size:.78rem}.plr.hot .plt small{color:#d9ff9e;opacity:1;font-weight:700}
.plb{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.plsay{min-height:44px;padding:0 12px!important;border-radius:12px!important;font-size:.85rem!important;white-space:nowrap}.plsays{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;padding:8px 0 2px}.plsays button{min-height:46px;font-size:.88rem;text-align:left;justify-content:flex-start;border-radius:12px}.plnote{grid-column:1/-1;min-height:44px}
.plrm .pinbox p{text-align:left}.plrr{display:grid;grid-template-columns:1fr 110px auto auto;gap:6px;align-items:end}.plrr select{min-height:48px}.plrr label{display:grid;font-size:.78rem}.plrr input{min-height:48px;font:700 1.05rem system-ui!important;letter-spacing:0!important}.plrr small{grid-column:1/-1;text-align:right;opacity:.8}.plrr button{min-height:48px;padding:0 10px}
.plrs{padding:10px;border-radius:12px;text-align:center;line-height:1.5}.plrs.ok{background:rgba(34,197,94,.16);border:1px solid rgba(34,197,94,.5)}.plrs.bad{background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.5)}
@media(max-width:420px){.plrr{grid-template-columns:1fr 1fr}.plrr select{grid-column:1/-1}}.plb a{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;text-decoration:none;font-size:1.15rem;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
.plb .plc{background:linear-gradient(135deg,#b6ff3b,#22d3ee);border:0}.plno{opacity:.5;font-size:.72rem;max-width:60px;text-align:right}.pln .btns{justify-content:center}
@media(max-width:460px){.plr{grid-template-columns:auto minmax(0,1fr)}.plb{grid-column:2;justify-content:flex-start}.plb a{width:auto;min-width:96px;border-radius:12px;padding:0 12px;font-size:.95rem;gap:6px;display:flex;align-items:center;justify-content:center}.plb .plc::after{content:"Volať";font-weight:800;color:#06110a;font-size:.9rem}.plb .plw::after{content:"Napísať";font-weight:700;font-size:.9rem;color:#eef2f7}}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;paint()})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();setInterval(()=>{if(!document.hidden&&OK()){D.tgAt=0;loadTg()}},300000);setInterval(()=>{if(!document.hidden&&OK())loadSt()},120000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
