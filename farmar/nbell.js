// ===== 🔔 ZVONČEK V KAŽDEJ SEKCII =====
// V riadku nad každou záložkou je 🔔 s počtom. Po ťuknutí vidíš iba to, čo patrí do tejto sekcie:
//  • „Na vybavenie“ – počíta sa zo živých dát (nové požiadavky, ponuky, odvozy, objednávky, termíny…).
//    Keď vec vybavíš (prijmeš, odpovieš, zamietneš…), zmizne sama – nedá sa „zabudnúť“.
//  • „Upozornenia“ – to, čo prišlo do mobilu, priradené k sekcii. Po prečítaní zmizne. Zmizne aj samo,
//    keď v jeho sekcii už nič nečaká na vybavenie (vec si medzitým vybavil).
// Prečítané sa ukladá v databáze (owner_hidden) – platí na všetkých zariadeniach majiteľa; ostatní v tomto zariadení.
// Pri otvorení sekcie sa z telefónu zmažú jej upozornenia z lišty.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STAFF=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER);
const OWN=()=>STAFF()&&ROLE==="owner"&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const cn=k=>typeof can!=="function"||can(k);
const hash=s=>{let h=5381;s=String(s);for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)};
const ago=t=>{const m=(Date.now()-new Date(t))/6e4;return m<60?Math.max(1,Math.round(m))+" min":m<2880?Math.round(m/60)+" h":Math.round(m/1440)+" dní"};
const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"";
const B={push:null,off:null,pend:null,at:0,busy:false,open:null,read:new Set(),readOK:false,shown:new Set()};

// ---------- prečítané (DB pre majiteľa, inak toto zariadenie) ----------
const LK="ernte-nbell-read";
async function loadRead(){if(B.readOK)return;B.readOK=true;
  try{JSON.parse(localStorage.getItem(LK)||"[]").forEach(k=>B.read.add(k))}catch(x){}
  if(OWN())try{const r=await sb.from("owner_hidden").select("k").like("k","nb:%");if(!r.error)(r.data||[]).forEach(x=>B.read.add(x.k))}catch(x){}}
async function markRead(keys){keys=keys.filter(k=>!B.read.has(k));if(!keys.length)return;keys.forEach(k=>B.read.add(k));
  try{const L=[...B.read].slice(-800);localStorage.setItem(LK,JSON.stringify(L))}catch(x){}
  if(OWN())try{await sb.from("owner_hidden").upsert(keys.map(k=>({k})))}catch(x){}}
const pkey=x=>"nb:"+(x.id!=null?"i"+x.id:hash((x.at||"")+"|"+(x.t||"")+"|"+(x.b||"")));

// ---------- kam patrí upozornenie ----------
const MAP=[["trans",/odvoz|doprav|nakládk|vykládk|cmr/i],["trus",/trus|baromfi|kamenic/i],["agro",/služb|stroj|agro služ|postrek|orb[ay]|kombajn/i],
  ["deals",/zmluv|podpís|obchod uzavret|nový obchod/i],["zuct",/zúčtov|vyúčtov|lístok|lístk|váženi/i],["cal",/kalendár|stretnut|pripomienk|termín stretnutia/i],
  ["fleet",/naft|tankov|flotil|alarm|nádrž|kamera|auto\b|vodič/i],["evid",/evidenc|dochádz|výplat|sklad/i],["danube",/danube/i],
  ["req",/ponuk|návrh ceny|predaj|požiadavk|cieľov|farmár/i],["home",/spätn|feedback|novink/i]];
const secOf=x=>{const u=String(x.url||x.tag||"");const m=u.match(/[#?&](?:tab=)?([a-z]+)$/);if(m&&typeof TICO!=="undefined"&&TICO[m[1]])return m[1];
  for(const s of [x.t||"",x.b||""])for(const [k,r] of MAP)if(r.test(s))return k;return "home"};

// ---------- živé „na vybavenie“ (zmizne po vybavení) ----------
const TABOF=x=>x.src==="agro"?"agro":x.src==="trus"?"trus":x.route==="odvoz"?"trans":"req";
const LIVE_SECS=new Set(["req","trans","agro","trus","cal","price"]);
function todo(sec){const L=[],R=(typeof STATE!=="undefined"&&STATE.reqs)||[],F=(typeof STATE!=="undefined"&&STATE.farmers)||[],fn=id=>(F.find(f=>f.id===id)||{}).name||"farmár";
  const CNm=c=>typeof comName==="function"?comName(c):c,RI={sell:"🌾",transport:"🚚",agree:"✍️",message:"💬"},RK={sell:"chce predať",transport:"objednáva odvoz",agree:"súhlas",message:"správa"};
  const pendIds=new Set((B.pend||[]).map(p=>String(p.id)));
  if(sec==="req"&&cn("req"))for(const r of R.filter(r=>r.status==="nova"&&r.kind!=="transport"&&!pendIds.has(String(r.id))))
    L.push({i:RI[r.kind]||"📥",t:`${fn(r.farmer_id)} – ${RK[r.kind]||r.kind}`,s:[r.com?CNm(r.com):"",r.tons?r.tons+" t":"",r.price?r.price+" €/t":""].filter(Boolean).join(" · "),at:r.created_at});
  if(sec==="req"&&cn("req"))for(const o of (B.off||[]))L.push({i:"💰",t:`${fn(o.farmer_id)} – návrh ceny`,s:`${CNm(o.com)} · ${o.tons} t · ${o.price} €/t`,at:o.created_at});
  if(sec==="trans"&&(cn("trans")||cn("req")))for(const r of R.filter(r=>r.kind==="transport"&&r.status==="nova"&&!pendIds.has(String(r.id))))
    L.push({i:"🚚",t:`${fn(r.farmer_id)} – objednáva odvoz`,s:[r.com?CNm(r.com):"",r.tons?r.tons+" t":"",r.pickup_date||""].filter(Boolean).join(" · "),at:r.created_at});
  for(const p of (B.pend||[]))if(TABOF(p)===sec&&(p.mine||OWN()))L.push({i:"⚠️",t:p.titul||"Nevybavená objednávka",s:[p.kto,p.detail].filter(Boolean).join(" · "),at:p.at,acc:p.src!=="trus"?p.src+"|"+p.id:null});
  if(sec==="cal"&&window.calOpenCount){const n=calOpenCount();if(n)L.push({i:"📅",t:`${n} ${n===1?"žiadosť":"žiadosti"} o stretnutie čaká na potvrdenie`,s:""})}
  if(sec==="price"&&typeof STATE!=="undefined"){const v=((STATE.settings||{}).pricelist||{}).valid;if(v){const d=Math.round((new Date(v+"T00:00:00")-new Date(new Date().toDateString()))/864e5);
    if(d<0)L.push({i:"💶",t:"Cenník pre farmárov vypršal",s:"Farmári nemôžu predávať – predĺž platnosť"});else if(d<=2)L.push({i:"💶",t:`Cenník platí ešte ${d} ${d===1?"deň":"dni"}`,s:"Predĺž platnosť"})}}
  if(sec==="trus"&&window.trusNew&&!L.length){const n=trusNew();if(n)L.push({i:"🐔",t:`${n} nové v Kuracom truse`,s:""})}
  return L}
function pushes(sec){if(!B.push)return[];const live=LIVE_SECS.has(sec)?todo(sec).length:null;
  return B.push.filter(x=>secOf(x)===sec).map(x=>({x,k:pkey(x)})).filter(o=>{if(B.read.has(o.k)&&!B.shown.has(o.k))return false;
    // vybavené: v sekcii už nič nečaká a upozornenie je staršie ako posledné načítanie dát
    if(live===0&&Date.parse(o.x.at)<B.at-5000&&!B.shown.has(o.k))return false;return true})}
const count=sec=>todo(sec).length+pushes(sec).filter(o=>!B.read.has(o.k)).length;
window.nbellReadAll=L=>markRead((L||[]).map(pkey));
window.nbellDone=x=>{const k=pkey(x);if(B.read.has(k))return true;const s=secOf(x);return LIVE_SECS.has(s)&&B.at&&todo(s).length===0&&Date.parse(x.at)<B.at-5000};

// ---------- načítanie ----------
async function load(force){if(!STAFF()||B.busy)return;if(!force&&Date.now()-B.at<55000)return;B.busy=true;await loadRead();const q=[];
  if(OWN())q.push(sb.rpc("my_push_list",{p_lim:60}).then(r=>{B.push=r.error?[]:r.data||[]}));else B.push=[];
  if(cn("req"))q.push(sb.from("farmer_offers").select("id,farmer_id,com,price,tons,status,created_at").eq("status","nova").order("created_at",{ascending:false}).limit(50).then(r=>{B.off=r.error?[]:r.data||[]}));
  q.push(sb.rpc("my_pending",{p_open:false}).then(r=>{B.pend=r.error?[]:r.data||[]}));
  await Promise.all(q.map(p=>p.then?p.catch(()=>{}):p));B.at=Date.now();B.busy=false;paint();clearOS(curTab())}
const curTab=()=>typeof TAB!=="undefined"?TAB:null;

// ---------- upozornenia v lište telefónu: zmazať tie, ktoré patria do otvorenej sekcie ----------
async function clearOS(sec){if(!sec||!("serviceWorker" in navigator))return;try{const reg=await navigator.serviceWorker.getRegistration();if(!reg||!reg.getNotifications)return;
  const N=await reg.getNotifications();for(const n of N){const x={t:n.title,b:n.body,url:n.data&&n.data.url,tag:n.tag};const s=secOf(x);
    if(s===sec||(LIVE_SECS.has(s)&&B.at&&todo(s).length===0))n.close()}}catch(x){}}

// ---------- vykreslenie ----------
function btn(sec){const n=count(sec);return `<button type="button" class="nbb${n?" on":""}" data-nbell="${e(sec)}" aria-label="Upozornenia v tejto sekcii${n?": "+n:""}" aria-expanded="${B.open===sec}"><span aria-hidden="true">🔔</span>${n?`<b>${n>99?"99+":n}</b>`:""}</button>`}
function panel(sec){const T=todo(sec),P=pushes(sec),lab=(document.querySelector(`[data-tab="${sec}"] .tl`)||{}).textContent||"";
  let h=`<div class="card nbp" role="region" aria-label="Upozornenia ${e(lab)}"><div class="nbh"><b>🔔 ${e(lab||"Upozornenia")}</b><button type="button" class="nbx" data-nbclose aria-label="Zavrieť">✕</button></div>`;
  if(!T.length&&!P.length)return h+`<div class="s">✅ Nič nečaká. Všetko v tejto sekcii je vybavené.</div></div>`;
  if(T.length)h+=`<div class="nbs">Na vybavenie <span class="cnt">${T.length}</span><small>zmizne samo, keď to vybavíš</small></div>${T.map(t=>`<div class="nbi todo"><span class="nbic">${t.i}</span><div><b>${e(t.t)}</b>${t.s?`<span>${e(t.s)}</span>`:""}${t.at?`<small>čaká ${e(ago(t.at))}</small>`:""}</div>${t.acc?`<button type="button" class="lime" data-pacc="${e(t.acc)}">✓ Prijať</button>`:""}</div>`).join("")}`;
  if(P.length)h+=`<div class="nbs">Upozornenia <span class="cnt">${P.filter(o=>!B.read.has(o.k)).length||""}</span><small>po prečítaní zmiznú</small></div>${P.map(o=>`<div class="nbi${B.read.has(o.k)?" rd":""}"><span class="nbic">🔔</span><div><b>${e(o.x.t||"")}</b>${o.x.b?`<span>${e(o.x.b)}</span>`:""}<small>${e(dt(o.x.at))}</small></div></div>`).join("")}`;
  return h+"</div>"}
function paint(){const app=document.getElementById("app");if(!app||!STAFF())return;const sec=curTab(),row=app.querySelector(":scope > .hrow");if(!sec||!row)return;
  const old=row.querySelector(".nbb");const nb=btn(sec);if(old){if(old.outerHTML!==nb)old.outerHTML=nb}else row.insertAdjacentHTML("afterbegin",nb);
  const op=app.querySelector(":scope > .nbp");if(B.open===sec){const ph=panel(sec);if(op){if(op.dataset.h!==hash(ph)){op.outerHTML=ph;app.querySelector(":scope > .nbp").dataset.h=hash(ph)}}else{row.insertAdjacentHTML("afterend",ph);app.querySelector(":scope > .nbp").dataset.h=hash(ph)}}
  else if(op)op.remove()}
function openP(sec){B.open=sec;const P=pushes(sec);P.forEach(o=>B.shown.add(o.k));markRead(P.map(o=>o.k));paint();clearOS(sec)}
function closeP(){B.open=null;B.shown.clear();paint()}

// napojenie na vykresľovanie aplikácie
let lastTab=null;
function hook(){const o=window.renderStaff;if(typeof o!=="function"){setTimeout(hook,300);return}if(o.__nb)return;
  const w=function(){const r=o.apply(this,arguments);try{const t=curTab();if(t!==lastTab){if(B.open&&B.open!==t)closeP();lastTab=t;clearOS(t)}paint();if(Date.now()-B.at>55000)load()}catch(x){}return r};w.__nb=1;
  Object.keys(o).forEach(k=>{w[k]=o[k]});window.renderStaff=w}
hook();setInterval(()=>{const o=window.renderStaff;if(o&&!o.__nb)hook()},2000);
setInterval(()=>{if(!document.hidden&&STAFF())load()},60000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&STAFF())load(true)});
document.addEventListener("click",ev=>{const t=ev.target;if(!t.closest)return;let x;
  if(x=t.closest("[data-nbell]")){ev.preventDefault();const s=x.dataset.nbell;if(B.open===s)closeP();else{openP(s);if(Date.now()-B.at>15000)load(true)}return}
  if(t.closest("[data-nbclose]")){closeP();return}
  if(t.closest(".nbp [data-pacc]"))setTimeout(()=>load(true),1500)},true);
// po akcii v sekcii (uloženie formulára) prepočítať
document.addEventListener("submit",()=>{if(STAFF())setTimeout(()=>load(true),2500)},true);

{const s=document.createElement("style");s.textContent=`
.nbb{position:relative;min-width:44px;min-height:44px;padding:0 12px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:1.05rem}
.nbb b{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font:700 .7rem/20px system-ui;box-shadow:0 0 0 2px var(--bg,#0b1020)}
.nbb.on{border-color:rgba(239,68,68,.55)!important}
.nbp{display:grid;gap:8px;border-color:rgba(239,68,68,.35)}
.nbh{display:flex;justify-content:space-between;align-items:center;gap:8px}.nbx{min-width:36px;min-height:36px!important;padding:0!important;border-radius:50%!important}
.nbs{display:flex;align-items:center;gap:6px;font-weight:600;font-size:.85rem;margin-top:4px}.nbs small{font-weight:400;opacity:.65;margin-left:auto;font-size:.72rem}
.nbi{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:9px 11px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--line,rgba(255,255,255,.1))}
.nbi>div{display:grid;gap:2px;min-width:0}.nbi>div>*{overflow-wrap:anywhere}.nbi span{font-size:.85rem;opacity:.85}.nbi small{font-size:.72rem;opacity:.6}
.nbi.todo{background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.35)}.nbi.rd{opacity:.55}.nbic{font-size:1.15rem}
.nbi button{min-height:36px}`;document.head.appendChild(s)}
})();
