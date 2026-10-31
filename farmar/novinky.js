// ===== ERNTE · NOVINKY – čo sa v aplikácii zmenilo, kde to je a kto to vidí =====
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>(typeof toast==="function"?toast:alert)(t,ms);
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
const dL=d=>new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
let N={L:null,D:{},busy:false,add:false,seen:0,at:0,err:"",day:null,wk:null};
try{N.seen=+localStorage.getItem("ernte-nov-seen")||0}catch(x){}
const rr=()=>{if(isF()&&typeof renderFarmer==="function")renderFarmer();else if(typeof renderStaff==="function")renderStaff()};
async function load(){if(N.busy)return;N.busy=true;N.at=Date.now();const r=await sb.from("app_novinky").select("*").order("d",{ascending:false}).order("id",{ascending:false}).limit(1000);
  N.err=r.error?(/does not exist|could not find|relation/i.test(r.error.message)?"Novinky sa zapínajú – databáza sa práve aktualizuje (pár minút). Skús o chvíľu ↻.":r.error.message):"";
  N.L=r.error?[]:(r.data||[]);if(OWN()){const d=await sb.from("app_dni").select("*");N.D={};for(const x of (d.data||[]))N.D[String(x.d).slice(0,10)]=x}N.busy=false;rr()}
window.novCnt=()=>{if(N.L===null){load();return 0}return N.L.filter(x=>x.id>N.seen).length};
function seenAll(){const m=Math.max(0,...(N.L||[]).map(x=>x.id));if(m>N.seen){N.seen=m;try{localStorage.setItem("ernte-nov-seen",String(m))}catch(x){}}}
const item=(x,isNew)=>`<div class="card nvi${isNew?" nvnew":""}"><div class="row"><b>${e(x.titul)}</b>${isNew?`<span class="pill w">nové</span>`:""}${OWN()?`<small class="nvz">${e(x.zdroj||"")}</small><button type="button" class="evmini" data-nvdel="${x.id}" aria-label="Zmazať">🗑️</button>`:""}</div>
  ${x.popis?`<p>${e(x.popis)}</p>`:""}<div class="nvm">${x.kde?`<span>📍 <b>Kde:</b> ${e(x.kde)}</span>`:""}${x.kto?`<span>👀 <b>Kto vidí:</b> ${e(x.kto)}</span>`:""}</div></div>`;
const DN=["Po","Ut","St","Št","Pi","So","Ne"];
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const monday=ds=>{const d=new Date(ds+"T12:00:00"),k=(d.getDay()+6)%7;d.setDate(d.getDate()-k);return iso(d)};
const addD=(ds,n)=>{const d=new Date(ds+"T12:00:00");d.setDate(d.getDate()+n);return iso(d)};
window.vNovinky=function(){if(N.L===null||(!N.busy&&Date.now()-N.at>60000)){load();if(N.L===null)return `<div class="card"><div class="s">Načítavam novinky…</div></div>`}
  const seen=N.seen;setTimeout(seenAll,1500);const today=iso(new Date());
  const byD=new Map;for(const x of N.L){const k=String(x.d).slice(0,10);if(!byD.has(k))byD.set(k,[]);byD.get(k).push(x)}
  const last=[...byD.keys(),...Object.keys(N.D)].sort().pop()||today;
  if(!N.day)N.day=byD.has(today)||N.D[today]?today:last;if(!N.wk)N.wk=monday(N.day);
  const days=[...Array(7)].map((_,i)=>addD(N.wk,i)),first=[...byD.keys(),...Object.keys(N.D)].sort()[0];
  let h=`<div class="zt"><h2>🆕 Novinky v aplikácii</h2>`;
  if(N.err)h+=`<div class="card evwarn">${e(N.err)}</div>`;
  h+=`<div class="btns evmon nvwk"><button type="button" data-nvwk="-7" aria-label="Predchádzajúci týždeň"${first&&N.wk<=first?" disabled":""}>◀</button><b>${e(new Date(days[0]+"T12:00:00").toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"}))} – ${e(new Date(days[6]+"T12:00:00").toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"}))}</b><button type="button" data-nvwk="7" aria-label="Ďalší týždeň"${N.wk>=monday(today)?" disabled":""}>▶</button></div>
   <div class="nvdays">${days.map((d,i)=>{const A=byD.get(d)||[],S=N.D[d],nw=A.filter(x=>x.id>seen).length,fut=d>today;
     return `<button type="button" class="nvday${d===N.day?" on":""}${A.length||S?"":" empty"}${d===today?" today":""}" data-nvday="${d}"${fut?" disabled":""} aria-pressed="${d===N.day}">
       <span class="nvdn">${DN[i]}</span><span class="nvdd">${e(new Date(d+"T12:00:00").toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"}))}</span>
       <span class="nvdc">${A.length?A.length+(A.length===1?" zmena":A.length<5?" zmeny":" zmien"):S?"zhrnutie":"–"}${nw?` <i>${nw} nové</i>`:""}</span>${S||A.length?`<small>${e(S?S.kratko:A.slice(0,2).map(x=>x.titul).join(" · "))}</small>`:""}</button>`}).join("")}</div>`;
  const d=N.day,A=byD.get(d)||[],S=N.D[d];
  h+=`<div class="card nvsum"><div class="t">📅 ${e(new Date(d+"T12:00:00").toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"long",year:"numeric"}))}</div>
    ${S?`<p class="nvk"><b>${e(S.kratko)}</b></p>${S.podrobne?`<p>${e(S.podrobne)}</p>`:""}`:A.length?"":`<p class="s">V tento deň sa nič nemenilo.</p>`}</div>`;
  if(A.length){const C=A.filter(x=>!/^ERNTE AI/.test(x.zdroj||"")),I=A.filter(x=>/^ERNTE AI/.test(x.zdroj||""));
    if(C.length)h+=`<h3 class="skh">🛠️ Zmeny (Claude) <small>${C.length}</small></h3><div class="agl">${C.map(x=>item(x,x.id>seen)).join("")}</div>`;
    if(I.length)h+=`<h3 class="skh">✦ ERNTE AI <small>${I.length}</small></h3><div class="agl">${I.map(x=>item(x,x.id>seen)).join("")}</div>`}
  if(OWN())h+=N.add?`<form class="card f nvf" id="nvF"><div class="w t">➕ Pridať novinku</div><label class="w">Názov<input name="titul" required></label><label>Kde to nájdu<input name="kde" placeholder="záložka → sekcia"></label>
    <label>Kto to vidí<input name="kto" placeholder="všetci / zamestnanci / vedúci / strojníci / farmári / majiteľ"></label><label class="w">Čo sa zmenilo<textarea name="popis" rows="3"></textarea></label>
    <div class="w btns"><button class="lime">💾 Uložiť</button><button type="button" data-nvadd>Zrušiť</button></div></form>`:`<div class="btns"><button type="button" data-nvadd>➕ Pridať novinku</button></div>`;
  return h+`</div>`};
// farmár – karta na hlavnej obrazovke (posledných 30 dní)
window.novFarmHTML=function(){if(N.L===null){load();return ""}const d0=new Date(Date.now()-30*864e5).toISOString().slice(0,10),L=N.L.filter(x=>String(x.d)>=d0).slice(0,6);if(!L.length)return "";
  const nw=L.filter(x=>x.id>N.seen).length;
  return `<details class="card nvfarm"${nw?" open":""}><summary>🆕 Novinky v aplikácii${nw?` <span class="cnt">${nw}</span>`:""}</summary>${L.map(x=>item(x,x.id>N.seen)).join("")}<div class="btns"><button type="button" data-nvseen>✓ Prečítané</button></div></details>`};
document.addEventListener("click",async ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(g("[data-nvadd]")){N.add=!N.add;rr();return}
  if(x=g("[data-nvday]")){N.day=x.dataset.nvday;rr();return}
  if(x=g("[data-nvwk]")){N.wk=addD(N.wk,+x.dataset.nvwk);const d=[...Array(7)].map((_,i)=>addD(N.wk,i)).filter(z=>(N.L||[]).some(y=>String(y.d).slice(0,10)===z)||N.D[z]);N.day=d.length?d[d.length-1]:N.wk;rr();return}
  if(g("[data-nvseen]")){seenAll();rr();return}
  if(x=g("[data-nvdel]")){if(!confirm("Zmazať novinku?"))return;const r=await sb.from("app_novinky").delete().eq("id",+x.dataset.nvdel);if(r.error){tst("⚠️ "+r.error.message);return}N.L=N.L.filter(y=>y.id!==+x.dataset.nvdel);rr();return}});
document.addEventListener("submit",async ev=>{const f=ev.target;if(f.id!=="nvF")return;ev.preventDefault();const d=new FormData(f),kto=String(d.get("kto")||"").trim(),n=kto.toLowerCase();
  const aud=/všetci|vsetci/.test(n)?["all"]:["owner"].concat(/farm/.test(n)?["farmer"]:[],/zamest|tím|tim/.test(n)?["staff"]:[],/vedúc|veduc/.test(n)?["ev"]:[],/strojn|roľn|roln/.test(n)?["sklad","praca"]:[]);
  const r=await sb.from("app_novinky").insert({titul:String(d.get("titul")).trim(),kde:String(d.get("kde")||"").trim()||null,kto:kto||"majiteľ",aud,popis:String(d.get("popis")||"").trim()||null,zdroj:"majiteľ"}).select().single();
  if(r.error){tst("⚠️ "+r.error.message);return}N.L.unshift(r.data);N.add=false;N.day=String(r.data.d).slice(0,10);N.wk=monday(N.day);tst("✓ Novinka pridaná.");rr()});
})();
