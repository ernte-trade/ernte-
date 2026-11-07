// ===== 👥 OBCHODNÍCI PODĽA REGIÓNOV · 👔 PREHĽAD TÍMU · 📣 PRÍKAZY =====
// 7. 11. 2026 18:05 PRÍKAZ MAJITEĽA: „ERNTE má len Košický a Prešovský kraj – Ceperko Prešovský, Galajda Košický, Jozsef východné Maďarsko,
//  Ličko všetko ostatné aj medzinárodné; nastav, aby to mali v app, a ja len prehľad čo spravili – stĺpcové grafy aj krivky; ja som majiteľ investor,
//  chcem prehľadávať a dávať rozkazy čo, kde, kto, za čo.“
//  • obchodník (obch_map().me): vo Farmároch, Obchodoch, Požiadavkách a na Prehľade najprv SVOJICH farmárov (👤 Moji · Všetci v lište roka)
//  • ERNTE zoznamy bez maďarských farmárov (firma DANUBE) – tí sú v Danube u Jozsefa; nič sa nemaže
//  • majiteľ: filter po obchodníkoch + 👔 Prehľad tímu (stĺpce, krivky po týždňoch, príkazy, nepridelení farmári)
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fN=n=>Math.round(+n||0).toLocaleString("sk-SK");
const tst=(m,ms)=>{try{if(typeof toast==="function")toast(m,ms||5000)}catch(x){}};
const STAFF=()=>typeof ROLE!=="undefined"&&ROLE&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined"&&sb;
const OWNER=()=>STAFF()&&ROLE==="owner"&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const MAIN=()=>OWNER()&&typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const ORD=["galajda","ceperko","licko","jozsef"];
// farba patrí obchodníkovi (nie poradiu) – overené validátorom pre tmavý povrch #0B0F19 (CVD ΔE ≥ 8,4)
const COL={galajda:"#3987e5",ceperko:"#d95926",licko:"#199e70",jozsef:"#c98500"};
const SHORT={galajda:"Galajda",ceperko:"Ceperko",licko:"Ličko",jozsef:"Jozsef"};
const KRAJ={galajda:"Košický kraj",ceperko:"Prešovský kraj",licko:"ostatné SK a zahraničie",jozsef:"východné Maďarsko"};
const M={map:null,at:0,busy:false};
async function loadMap(force){if(!STAFF()||M.busy)return;if(!force&&M.map&&Date.now()-M.at<600e3)return;M.busy=true;M.at=Date.now();
  try{const r=await sb.rpc("obch_map");if(!r.error&&r.data&&r.data.f){M.map=r.data;try{if(typeof renderStaff==="function"&&["farm","deals","req","home"].includes(TAB))renderStaff()}catch(x){}}}catch(x){}M.busy=false}
const ME=()=>M.map&&M.map.me||null;
const LK="ernte-obz";
const getSel=()=>{try{return localStorage.getItem(LK)}catch(x){return null}};
const setSel=v=>{try{localStorage.setItem(LK,v)}catch(x){}};
// čo sa má ukázať: obchodník predvolene „moji“, majiteľ „vsetci“ (bez Danube)
function sel(){const v=getSel();if(OWNER())return v&&(v==="vsetci"||v==="nepr"||ORD.includes(v)||v==="vsetci+hu")?v:"vsetci";return v==="vsetci"||v==="vsetci+hu"?v:"moji"}
const TABS=["farm","deals","req","home"];
function keepIds(){const S=typeof STATE!=="undefined"?STATE:null;if(!S||!M.map)return null;const F=M.map.f||{},s=sel(),me=ME();const ids=new Set(),loose=new Set(); /* obchodník: požiadavky a obchody aj od nepridelených farmárov (nič sa nestratí) */
  for(const f of S.farmers||[]){const k=F[f.id]||null,hu=String(f.firma||"ERNTE").toUpperCase()==="DANUBE";
    let ok;if(OWNER()){ok=s==="vsetci+hu"?true:s==="vsetci"?!hu:s==="nepr"?!k&&!hu:k===s}
    else if(me==="jozsef"){ok=s==="moji"?k==="jozsef":true}
    else{ok=s==="moji"?k===me:s==="vsetci+hu"?true:!hu}
    if(ok)ids.add(f.id);else if(!OWNER()&&s==="moji"&&!k&&!hu)loose.add(f.id)}
  ids.loose=loose;return ids}
function active(){if(!STAFF()||!M.map||typeof TAB==="undefined"||!TABS.includes(TAB))return false;if(OWNER())return TAB!=="home";return !!ME()} /* bez pridelenia (doprava, sekretárka…) bez filtra ako doteraz */
// pri vykreslení sa zoznamy dočasne zúžia (ako rok.js) – po vykreslení sa vrátia celé
const KEYS=["farmers","deals","dealsTest","dealsArch","reqs"];
function wrap(){const o=window.renderStaff;if(typeof o!=="function"||o.__tim)return false;
  const w=function(){let saved=null;try{if(active()){const ids=keepIds();if(ids){saved={};for(const k of KEYS){if(Array.isArray(STATE[k])){saved[k]=STATE[k];STATE[k]=k==="farmers"?STATE[k].filter(f=>ids.has(f.id)):STATE[k].filter(x=>!x.farmer_id||ids.has(x.farmer_id)||ids.loose.has(x.farmer_id))}}}}}catch(x){saved=null}
    let r;try{r=o.apply(this,arguments)}finally{if(saved)for(const k in saved)STATE[k]=saved[k]}
    (window.ernteSoon||requestAnimationFrame)(()=>{try{bar();place();prk()}catch(x){}});return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__tim=1;window.renderStaff=w;return true}
(function tw(n){if(!wrap()&&n<80)setTimeout(()=>tw(n+1),300)})(0);
// 👤 prepínač v lište roka
function bar(){const rb=document.querySelector("#app>.rokbar");document.querySelectorAll("#app .obz").forEach(x=>{if(x.parentNode!==rb)x.remove()});
  if(!rb||!active())return;let el=rb.querySelector(".obz");const s=sel(),me=ME();
  const b=(v,t)=>`<button type="button" data-obz="${v}" aria-pressed="${s===v}">${t}</button>`;
  const h=OWNER()?b("vsetci","👥 ERNTE")+ORD.map(k=>b(k,SHORT[k])).join("")+b("nepr","❓ Nepridelení")+b("vsetci+hu","🇭🇺 aj Danube")
    :b("moji",`👤 Moji${me?" · "+E(KRAJ[me]||""):""}`)+b("vsetci","Všetci");
  if(!el){el=document.createElement("span");el.className="obz";el.setAttribute("role","group");el.setAttribute("aria-label","Obchodník");rb.appendChild(el)}
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-obz]");if(!t)return;e.preventDefault();setSel(t.dataset.obz);try{renderStaff()}catch(x){}},true);

// ---------- 📣 PRÍKAZY (obchodník) ----------
const P={L:null,at:0,busy:false};
async function prkLoad(force){if(!STAFF()||OWNER()||P.busy)return;if(!force&&P.at&&Date.now()-P.at<120e3)return;P.busy=true;P.at=Date.now();
  try{const r=await sb.rpc("prikaz_my");if(!r.error)P.L=Array.isArray(r.data)?r.data:[]}catch(x){}P.busy=false;prkPaint()}
function prkHTML(){const L=(P.L||[]);if(!L.length)return "";const open=L.filter(x=>x.stav!=="hotovo");
  return `<section class="card prkc" id="prkCard" data-nosec><b class="prkh">📣 Príkazy od Martina${open.length?` <span class="prkn">${open.length}</span>`:""}</b>
   ${L.map(x=>`<div class="prki${x.stav==="hotovo"?" ok":""}"><div>${E(x.text)}</div><small>${x.termin?`📅 do ${E(new Date(x.termin).toLocaleDateString("sk-SK"))} · `:""}${new Date(x.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}</small>
    ${x.stav==="hotovo"?`<span class="prkd">✅ Splnené</span>`:`<div class="prkb"><input type="text" data-prko="${x.id}" placeholder="Krátka odpoveď (nepovinné)" maxlength="300"><button type="button" class="pri" data-prk="${x.id}">✅ Hotovo</button></div>`}</div>`).join("")}</section>`}
function prkPaint(){const app=document.getElementById("app");if(!app)return;let el=document.getElementById("prkCard");
  if(!STAFF()||OWNER()||typeof TAB==="undefined"||TAB!=="home"){if(el)el.remove();return}const h=prkHTML();if(!h){if(el)el.remove();return}
  const d=document.createElement("div");d.innerHTML=h;const n=d.firstElementChild;if(el){const k={};el.querySelectorAll("[data-prko]").forEach(i=>k[i.dataset.prko]=i.value);n.querySelectorAll("[data-prko]").forEach(i=>{if(k[i.dataset.prko])i.value=k[i.dataset.prko]});el.replaceWith(n);return}
  const skip=e=>e.matches("nav.tabs,section.ehb,#rdSub,#spatBar,.rokbar,.secbar,.uvodb,script,style,.spatbar,#dmStale,#ernNew,#hlFoc,.hero");
  const first=[...app.children].find(e=>!skip(e));if(first)app.insertBefore(n,first);else app.appendChild(n)}
function prk(){if(STAFF()&&!OWNER()){if(P.L===null)prkLoad(true);else prkPaint()}}
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-prk]");if(!t)return;e.preventDefault();const id=+t.dataset.prk;
  const inp=document.querySelector(`[data-prko="${id}"]`);t.disabled=true;t.textContent="⏳";
  const r=await sb.rpc("prikaz_done",{p_id:id,p_odp:inp?inp.value:null});if(r.error){tst("⚠️ "+r.error.message,7000);t.disabled=false;t.textContent="✅ Hotovo";return}
  tst("✅ Martin dostal správu, že je to hotové.");P.at=0;prkLoad(true)},true);
if(/^#prikazy$/.test(location.hash)){const go=()=>{try{const b=document.querySelector('#app>nav.tabs [data-tab="home"]');if(b)b.click()}catch(x){}};setTimeout(go,2500)}

// ---------- 👔 PREHĽAD TÍMU (Martin a Jana) ----------
const T={D:null,dni:30,busy:false,at:0,err:"",msg:"",form:{komu:"galajda",text:"",termin:""}};
async function tLoad(force){if(!OWNER()||T.busy)return;if(!force&&T.at&&Date.now()-T.at<120e3)return;T.busy=true;T.at=Date.now();
  try{const r=await sb.rpc("tim_prehlad",{p_dni:T.dni});if(r.error)T.err=/tim_prehlad/.test(r.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message;else{T.err="";T.D=r.data||{}}}
  catch(x){if(!T.D)T.err="📡 Bez signálu – skúsim znova."}T.busy=false;tPaint()}
function bars(L,key,unit){const max=Math.max(1,...L.map(p=>+p[key]||0)),W=100;
  return `<div class="tmvbars" role="img" aria-label="${E(unit)} po obchodníkoch">${L.map(p=>{const v=+p[key]||0,w=Math.max(v?2:0,v/max*W);
    return `<div class="tmvbr" data-tip="${E(SHORT[p.k]||p.n)}: ${fN(v)} ${E(unit)}"><span class="tmvbn"><i style="background:${COL[p.k]}"></i>${E(SHORT[p.k]||p.n)}</span><span class="tmvbt"><span class="tmvbb" style="width:${w}%;background:${COL[p.k]}"></span><b>${fN(v)}</b></span></div>`}).join("")}</div>`}
function lines(L){const W=320,H=150,pl=34,pr=56,pt=10,pb=22;const wk=(L[0]&&L[0].tyzdne||[]).map(x=>x.w);if(!wk.length)return "";
  const max=Math.max(10,...L.flatMap(p=>(p.tyzdne||[]).map(x=>+x.t||0)));const nice=(()=>{const e=Math.pow(10,Math.floor(Math.log10(max)));const m=max/e;return (m<=2?2:m<=5?5:10)*e})();
  const X=i=>pl+(W-pl-pr)*(wk.length<2?0:i/(wk.length-1)),Y=v=>pt+(H-pt-pb)*(1-v/nice);
  const grid=[0,.5,1].map(f=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(nice*f)}" y2="${Y(nice*f)}" class="tmvg"/><text x="${pl-4}" y="${Y(nice*f)+3}" text-anchor="end" class="tmvax">${fN(nice*f)}</text>`).join("");
  const xl=wk.map((w,i)=>i%3===0||i===wk.length-1?`<text x="${X(i)}" y="${H-6}" text-anchor="middle" class="tmvax">${new Date(w).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})}</text>`:"").join("");
  // koncové štítky – roztiahnuť, aby sa neprekrývali
  const ends=L.map(p=>{const s=p.tyzdne||[];const v=+(s[s.length-1]||{}).t||0;return {k:p.k,y:Y(v),v}}).sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<11)ends[i].y=ends[i-1].y+11;
  const paths=L.map(p=>{const s=p.tyzdne||[];const d=s.map((x,i)=>`${i?"L":"M"}${X(i).toFixed(1)},${Y(+x.t||0).toFixed(1)}`).join("");const lx=X(s.length-1),ly=Y(+(s[s.length-1]||{}).t||0);
    return `<path d="${d}" fill="none" stroke="${COL[p.k]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lx}" cy="${ly}" r="4" fill="${COL[p.k]}" stroke="#0B0F19" stroke-width="2"/>`}).join("");
  const lab=ends.map(e=>`<text x="${W-pr+8}" y="${e.y+3}" class="tmvlb">${E(SHORT[e.k])}</text>`).join("");
  return `<div class="tmvln"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="tmvsvg" data-wk='${E(JSON.stringify(wk))}' role="img" aria-label="Tony podľa zmlúv po týždňoch, posledných 12 týždňov">${grid}${xl}${paths}${lab}<line class="tmvx" x1="0" x2="0" y1="${pt}" y2="${H-pb}" style="display:none"/></svg></div>`}
function tHTML(){if(!OWNER())return "";const D=T.D||{},L=(D.ludia||[]).filter(p=>ORD.includes(p.k));
  const chip=n=>`<button type="button" data-tmvd="${n}" aria-pressed="${T.dni===n}">${n===7?"7 dní":n===30?"30 dní":"90 dní"}</button>`;
  const legend=`<div class="tmvleg">${L.map(p=>`<span><i style="background:${COL[p.k]}"></i>${E(SHORT[p.k])} · ${E(KRAJ[p.k])}</span>`).join("")}</div>`;
  const card=p=>`<div class="tmvp"><div class="tmvph"><i style="background:${COL[p.k]}"></i><b>${E(p.n)}</b><small>${E(KRAJ[p.k])}</small></div>
    <div class="tmvk"><span><b>${fN(p.zmluvy)}</b><small>zmlúv</small></span><span><b>${fN(p.tony)} t</b><small>nakúpené</small></span><span><b>${fN(p.eur)} €</b><small>hodnota</small></span><span><b>${fN(p.dodane)} t</b><small>dodané</small></span></div>
    <small class="tmvps">👨‍🌾 ${fN(p.farmari)} farmárov (${fN(p.aktivni)} s novou zmluvou) · 📨 požiadavky ${fN(p.poz_nove)} nové, ${fN(p.poz_otv)} otvorené · 📞 ${fN(p.hovory)} vyjadrení · 📣 ${fN(p.prikazy)} príkazov čaká, ${fN(p.hotove)} splnených</small></div>`;
  const PR=(D.prikazy||[]);const f=T.form;
  return `<section class="card tmvc" id="timCard" data-nosec><div class="tmvh"><b class="tmvt">👔 Prehľad tímu</b><div class="tmvch">${[7,30,90].map(chip).join("")}</div></div>
   <small class="tmvs">Čo urobili obchodníci za ${T.dni} dní – podľa toho, komu farmár patrí (Galajda Košický kraj, Ceperko Prešovský, Jozsef východné Maďarsko, Ličko ostatné a zahraničie).</small>
   ${T.err?`<div class="tmverr">⚠️ ${E(T.err)}</div>`:""}${T.D===null&&!T.err?`<div class="s">⏳ Načítavam…</div>`:""}
   ${L.length?`${legend}<h4 class="tmvsub">Nakúpené tony (${T.dni} dní)</h4>${bars(L,"tony","t")}<h4 class="tmvsub">Hodnota nákupov (${T.dni} dní)</h4>${bars(L,"eur","€")}
   <h4 class="tmvsub">Tony po týždňoch – posledných 12 týždňov</h4>${lines(L)}<div class="tmvps2">${L.map(card).join("")}</div>`:""}
   <h4 class="tmvsub">📣 Príkaz obchodníkovi</h4>
   <form class="tmvf" id="tmvForm" autocomplete="off"><label>Komu<select data-tmvf="komu">${ORD.map(k=>`<option value="${k}"${f.komu===k?" selected":""}>${E(SHORT[k])} – ${E(KRAJ[k])}</option>`).join("")}<option value="vsetci"${f.komu==="vsetci"?" selected":""}>Všetkým obchodníkom</option></select></label>
    <label class="tmvw">Čo, kde, za koľko<textarea data-tmvf="text" rows="3" maxlength="1000" placeholder="napr. Zavolaj Novákovi (Michalovce), kúp 100 t repky do 410 €/t, odvoz do piatku">${E(f.text)}</textarea></label>
    <label>Termín (nepovinný)<input type="date" data-tmvf="termin" value="${E(f.termin)}"></label>
    <button type="submit" class="pri">📣 Poslať príkaz</button>${T.msg?`<div class="tmvok tmvw">${E(T.msg)}</div>`:""}</form>
   ${PR.length?`<details class="tmvd"${PR.some(x=>x.stav!=="hotovo")?" open":""}><summary>📋 Príkazy (${PR.filter(x=>x.stav!=="hotovo").length} čaká · ${PR.filter(x=>x.stav==="hotovo").length} splnených)</summary>
     ${PR.map(x=>`<div class="tmvpr${x.stav==="hotovo"?" ok":""}"><span><i style="background:${COL[x.komu]||"#94A3B8"}"></i><b>${E(SHORT[x.komu]||x.komu)}</b> · ${E(x.text)}<small>${x.stav==="hotovo"?`✅ splnené ${new Date(x.hotovo_at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}${x.odpoved?" · „"+E(x.odpoved)+"“":""}`:x.stav==="videl"?"👁️ videl, ešte nesplnil":"⏳ ešte nevidel"}${x.termin?` · 📅 do ${E(new Date(x.termin).toLocaleDateString("sk-SK"))}`:""}</small></span>${x.stav!=="hotovo"?`<button type="button" data-tmvz="${x.id}" aria-label="Zrušiť príkaz">✕</button>`:""}</div>`).join("")}</details>`:""}
   ${(D.nepridelene||[]).length?`<details class="tmvd"><summary>❓ Farmári bez obchodníka so zmluvami (${D.nepridelene.length}) – prideľ</summary><small class="tmvs">Nemajú v adrese PSČ Košického ani Prešovského kraja. Vyber obchodníka – odteraz ich uvidí medzi svojimi.</small>
     ${D.nepridelene.map(x=>`<div class="tmvnp"><span>${E(x.n)} <small>${fN(x.z)} ${x.z===1?"zmluva":x.z<5?"zmluvy":"zmlúv"}</small></span><select data-tmvo="${E(x.id)}"><option value="">– prideliť –</option>${ORD.map(k=>`<option value="${k}">${E(SHORT[k])}</option>`).join("")}</select></div>`).join("")}</details>`:""}
   <div class="tmvtip" hidden></div></section>`}
function tPlace(){const app=document.getElementById("app");if(!app)return;let el=document.getElementById("timCard");
  if(!OWNER()||typeof TAB==="undefined"||TAB!=="home"){if(el)el.remove();return}if(T.D===null&&!T.busy&&!T.err)tLoad(true);
  if(!el){const d=document.createElement("div");d.innerHTML=tHTML();el=d.firstElementChild;if(!el)return}
  const ck=document.getElementById("ckCard");if(ck&&ck.parentNode===app){if(ck.nextElementSibling!==el)ck.after(el);return}
  const skip=e=>e.matches("nav.tabs,section.ehb,#rdSub,#spatBar,.rokbar,.secbar,.uvodb,script,style,.spatbar,#dmStale,#ernNew,#hlFoc,#timCard");
  const first=[...app.children].find(e=>!skip(e));if(first&&el.nextElementSibling!==first)app.insertBefore(el,first)}
function tPaint(){const el=document.getElementById("timCard");if(!el){tPlace();return}const keep={};el.querySelectorAll("[data-tmvf]").forEach(i=>{keep[i.dataset.tmvf]=i.value});Object.assign(T.form,keep);
  const op=[...el.querySelectorAll("details.tmvd")].map(d=>d.open);const d=document.createElement("div");d.innerHTML=tHTML();const n=d.firstElementChild;if(!n){el.remove();return}
  n.querySelectorAll("details.tmvd").forEach((x,i)=>{if(op[i]!==undefined)x.open=op[i]});el.replaceWith(n)}
function place(){tPlace()}
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-tmvd],[data-tmvz]");if(!t||!OWNER())return;e.preventDefault();
  if(t.dataset.tmvd){T.dni=+t.dataset.tmvd;tLoad(true);return}
  if(t.dataset.tmvz){if(!confirm("Zrušiť tento príkaz?"))return;const r=await sb.rpc("prikaz_zrus",{p_id:+t.dataset.tmvz});if(r.error){tst("⚠️ "+r.error.message,7000);return}tLoad(true)}},true);
document.addEventListener("input",e=>{const x=e.target;if(x&&x.dataset&&x.dataset.tmvf)T.form[x.dataset.tmvf]=x.value},true);
document.addEventListener("change",async e=>{const x=e.target;if(!x||!x.dataset)return;if(x.dataset.tmvf){T.form[x.dataset.tmvf]=x.value;return}
  if(x.dataset.tmvo&&x.value&&OWNER()){x.disabled=true;const r=await sb.rpc("farmer_obch_set",{p_farmer:x.dataset.tmvo,p_obch:x.value});if(r.error){tst("⚠️ "+r.error.message,7000);x.disabled=false;return}
    tst(`✅ Pridelené: ${SHORT[x.value]}`);M.at=0;loadMap(true);tLoad(true)}},true);
document.addEventListener("submit",async e=>{const f=e.target;if(!f||f.id!=="tmvForm"||!OWNER())return;e.preventDefault();e.stopPropagation();
  if(!MAIN()){tst("Príkazy posiela Martin.",5000);return}const F=T.form;if(String(F.text||"").trim().length<3){tst("Napíš, čo treba urobiť.",5000);return}
  const b=f.querySelector("button[type=submit]");b.disabled=true;b.textContent="⏳ Posielam…";
  const r=await sb.rpc("prikaz_new",{p_komu:F.komu,p_text:F.text,p_termin:F.termin||null});b.disabled=false;b.textContent="📣 Poslať príkaz";
  if(r.error){tst("⚠️ "+r.error.message.replace(/^.*?:\s*(?=[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ])/,""),7000);return}
  T.form.text="";T.form.termin="";T.msg=`✅ Poslané (${F.komu==="vsetci"?"všetkým":SHORT[F.komu]}) – príde mu to do mobilu aj do aplikácie.`;tLoad(true);setTimeout(()=>{T.msg="";tPaint()},7000)},true);
// hover: stĺpce a krivka
document.addEventListener("pointermove",e=>{const c=document.getElementById("timCard");if(!c||!c.contains(e.target))return;const tip=c.querySelector(".tmvtip");if(!tip)return;
  const b=e.target.closest&&e.target.closest("[data-tip]");const svg=e.target.closest&&e.target.closest(".tmvsvg");const R=c.getBoundingClientRect();
  if(b){tip.hidden=false;tip.textContent=b.dataset.tip;tip.style.left=Math.min(R.width-160,Math.max(4,e.clientX-R.left+10))+"px";tip.style.top=(e.clientY-R.top+12)+"px";return}
  if(svg&&T.D){const wk=JSON.parse(svg.dataset.wk||"[]"),r=svg.getBoundingClientRect(),W=320,pl=34,pr=56,x=(e.clientX-r.left)/r.width*W,i=Math.max(0,Math.min(wk.length-1,Math.round((x-pl)/((W-pl-pr)/Math.max(1,wk.length-1)))));
    const L=(T.D.ludia||[]).filter(p=>ORD.includes(p.k)),X=pl+(W-pl-pr)*(wk.length<2?0:i/(wk.length-1));const ln=svg.querySelector(".tmvx");ln.style.display="";ln.setAttribute("x1",X);ln.setAttribute("x2",X);
    tip.hidden=false;tip.innerHTML=`<b>týždeň od ${E(new Date(wk[i]).toLocaleDateString("sk-SK"))}</b>`+L.map(p=>`<span><i style="background:${COL[p.k]}"></i>${E(SHORT[p.k])}: ${fN(((p.tyzdne||[])[i]||{}).t)} t</span>`).join("");
    tip.style.left=Math.min(R.width-170,Math.max(4,e.clientX-R.left+10))+"px";tip.style.top=(e.clientY-R.top+12)+"px";return}
  tip.hidden=true;const ln=c.querySelector(".tmvx");if(ln)ln.style.display="none"});

// ---------- štart a obnova ----------
let q=0;const sch=()=>{if(q)return;q=1;(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{if(STAFF()&&!M.map)loadMap(false);bar();place();prk()}catch(x){}})};
(function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()})();
setInterval(()=>{if(document.hidden)return;if(OWNER()&&typeof TAB!=="undefined"&&TAB==="home")tLoad(false);if(STAFF()&&!OWNER())prkLoad(false);loadMap(false)},120e3);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&STAFF()){if(!OWNER())prkLoad(false)}});
window.ernteTim={reload:()=>{tLoad(true);prkLoad(true);loadMap(true)},map:()=>M.map};
{const s=document.createElement("style");s.textContent=`
.obz{display:inline-flex;flex-wrap:wrap;gap:6px;margin-left:4px}.obz button{min-height:40px;padding:4px 12px;border-radius:999px;font-weight:700;font-size:.82rem;white-space:nowrap}
.obz button[aria-pressed="true"]{background:linear-gradient(135deg,#b6ff3b,#5eead4)!important;color:#05210f!important;border-color:transparent!important}
.prkc{display:grid;gap:8px;border:1px solid rgba(255,207,90,.6)!important}.prkh{font-size:1.05rem}.prkn{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#ffcf5a;color:#231a00;font-size:.8rem;font-weight:900}
.prki{display:grid;gap:4px;padding:10px 12px;border-radius:14px;border:1px solid rgba(148,163,184,.3);background:rgba(255,255,255,.03);overflow-wrap:anywhere}.prki.ok{opacity:.7}.prki small{opacity:.75}
.prkb{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.prkb input{min-height:44px;min-width:0}.prkb button{min-height:44px;font-weight:800}.prkd{color:#5eead4;font-weight:800}
.tmvc{display:grid;gap:8px;min-width:0;position:relative;border:1px solid rgba(34,211,238,.5)!important}
.tmvh{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}.tmvt{font-size:1.08rem}.tmvch{display:flex;gap:6px}.tmvch button{min-height:40px;padding:4px 12px;border-radius:999px;font-weight:700}
.tmvch button[aria-pressed="true"]{background:#22d3ee!important;color:#04212a!important;border-color:transparent!important}.tmvs{opacity:.75;line-height:1.4;overflow-wrap:anywhere}
.tmvsub{margin:8px 0 2px;font-size:.82rem;letter-spacing:.04em;text-transform:uppercase;color:#94A3B8}
.tmvleg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.82rem;color:#cbd5e1}.tmvleg span,.tmvph,.tmvpr span,.tmvtip span{display:inline-flex;align-items:center;gap:6px}
.tmvleg i,.tmvph i,.tmvpr i,.tmvbn i,.tmvtip i{width:10px;height:10px;border-radius:3px;flex:none;display:inline-block}
.tmvbars{display:grid;gap:6px}.tmvbr{display:grid;grid-template-columns:88px minmax(0,1fr);align-items:center;gap:8px;min-height:32px}
.tmvbn{display:flex;align-items:center;gap:6px;font-size:.85rem;color:#e2e8f0;min-width:0;overflow-wrap:anywhere}.tmvbt{display:flex;align-items:center;gap:8px;min-width:0}
.tmvbb{display:block;height:20px;border-radius:0 4px 4px 0;flex:none;max-width:calc(100% - 70px)}.tmvbt b{font-size:.85rem;color:#e2e8f0;white-space:nowrap}
.tmvln{width:100%}.tmvsvg{width:100%;height:180px;display:block;overflow:visible}.tmvg{stroke:rgba(148,163,184,.18);stroke-width:1}.tmvax{fill:#94A3B8;font-size:9px}.tmvlb{fill:#e2e8f0;font-size:9.5px;font-weight:700}.tmvx{stroke:rgba(226,232,240,.5);stroke-width:1}
.tmvps2{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.tmvp{display:grid;gap:6px;padding:10px 12px;border-radius:14px;border:1px solid rgba(148,163,184,.25);background:rgba(255,255,255,.03);min-width:0}
.tmvph{flex-wrap:wrap}.tmvph small{color:#94A3B8;width:100%}.tmvk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.tmvk span{display:grid;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.04);min-width:0}
.tmvk b{font-size:1rem;overflow-wrap:anywhere}.tmvk small{color:#94A3B8;font-size:.72rem}.tmvps{font-size:.78rem;color:#94A3B8;line-height:1.45;overflow-wrap:anywhere}
.tmvf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tmvf label{display:grid;gap:4px;font-size:.8rem;font-weight:700;min-width:0}.tmvf .tmvw,.tmvf button{grid-column:1/-1}
.tmvf textarea,.tmvf select,.tmvf input{min-width:0;width:100%;box-sizing:border-box}.tmvf button{min-height:48px;font-weight:800}
@media(max-width:420px){.tmvf{grid-template-columns:1fr}}
.tmvok{color:#5eead4;font-weight:700}.tmverr{color:#ff6b81}
.tmvd summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:700}
.tmvpr{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid rgba(148,163,184,.18)}.tmvpr span{display:block;min-width:0;overflow-wrap:anywhere}.tmvpr span i{margin-right:6px;vertical-align:1px}
.tmvpr small{display:block;color:#94A3B8;margin-top:2px}.tmvpr.ok{opacity:.75}.tmvpr button{flex:none;width:40px;height:40px;border-radius:50%;padding:0}
.tmvnp{display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:8px;align-items:center;padding:6px 0;border-top:1px solid rgba(148,163,184,.18)}.tmvnp span{min-width:0;overflow-wrap:anywhere}.tmvnp small{color:#94A3B8}.tmvnp select{min-height:42px}
.tmvtip{position:absolute;z-index:5;pointer-events:none;display:grid;gap:2px;padding:6px 9px;border-radius:10px;background:#111827;border:1px solid rgba(148,163,184,.4);color:#e2e8f0;font-size:.78rem;max-width:170px}`;document.head.appendChild(s)}
})();
